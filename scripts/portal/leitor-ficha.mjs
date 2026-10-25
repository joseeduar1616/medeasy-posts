// Leitor da ficha de pontuação do currículo, a partir do texto de um PDF ou Word.
// Usado pelo site (montar-site.mjs injeta este arquivo sem os "export"). Testes em Node com pdftotext.
//   lerFichaDoEdital(texto): acha a tabela de critérios do edital e devolve { ficha, maximo }
//   lerNotasDoCurriculo(texto, ficha): acha a ficha preenchida no currículo pronto e devolve a nota de cada item

const NUM_F = "\\d+(?:,\\d+)?";
const numF = s => { const n = parseFloat(String(s ?? "").replace(/\s/g, "").replace("+", "").replace(",", ".")); return isFinite(n) ? n : 0; };
const limpaF = s => String(s || "").replace(/\s+/g, " ").trim();
const semAcF = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Valor na coluna da direita: número no fim da linha, separado do texto por 3 ou mais espaços, ou sozinho na linha
function colunaF(l) {
  const s = String(l); const m = s.match(new RegExp("(?:^|\\s{3,})(" + NUM_F + ")\\s*(pontos?|pts?)?\\.?\\s*$", "i"));
  if (!m) return null; const v = numF(m[1]);
  // sozinho na linha só vale com vírgula ou "ponto", para não pegar número de página
  const sozinho = !s.slice(0, m.index).trim();
  if (sozinho && !m[1].includes(",") && !m[2]) return null;
  return v > 0 && v <= 200 && !/^\d{4}$/.test(m[1]) ? m[1] : null;
}
// Cabeçalhos de item: "1. Título", "2) Título", "3 - Título", "1.1 Título"
function cabecalhosF(linhas) {
  const c = [];
  linhas.forEach((l, i) => {
    let m = l.match(/^\s*(\d{1,2})\s*[.)\-–]\s+(\S.*)$/); if (m && !/^\d/.test(m[2])) { c.push({ i, a: +m[1], b: 0, cod: m[1], txt: m[2] }); return; }
    m = l.match(/^\s*(\d{1,2})\.(\d{1,2})\.?\s+([A-ZÀ-Ú].*)$/); if (m) c.push({ i, a: +m[1], b: +m[2], cod: m[1] + "." + m[2], txt: m[3] });
  });
  return c;
}
// Sequências 1, 2, 3... (com subitens 1.1, 1.2). O edital tem várias listas numeradas, a da ficha é a que tem pontuação.
function sequenciasF(cands, linhas) {
  const seqs = [];
  for (let s = 0; s < cands.length; s++) {
    if (cands[s].a !== 1 || cands[s].b > 1) continue;
    const seq = [cands[s]];
    // a ficha termina na linha TOTAL: nada depois dela entra
    let total = linhas ? linhas.findIndex((l, k) => k > cands[s].i && FIM_F.test(l)) : -1; if (total < 0) total = Infinity;
    for (let j = s + 1; j < cands.length; j++) {
      const u = seq[seq.length - 1], c = cands[j]; if (c.i > total) break;
      if ((c.a === u.a && c.b === u.b + 1) || (c.a === u.a + 1 && c.b <= 1)) seq.push(c);
      else if (c.a === 1 && c.b <= 1) break;
    }
    seqs.push(seq);
  }
  return seqs;
}
const FIM_F = /^\s*(TOTAL|PONTUA[CÇ][AÃ]O TOTAL|NOTA FINAL)\b/i;
function blocosF(linhas, seq) {
  return seq.map((c, j) => {
    let fim = j + 1 < seq.length ? seq[j + 1].i : Math.min(linhas.length, c.i + 40);
    for (let k = c.i + 1; k < fim; k++) if (FIM_F.test(linhas[k])) { fim = k; break; }
    return { ...c, linhas: linhas.slice(c.i, fim) };
  });
}
const UNIDADE_F = [
  new RegExp("(" + NUM_F + ")\\s*pontos?\\s*(?:\\/|por|a cada|para cada)\\s*([a-zà-ú]+)", "i"),
  new RegExp("(" + NUM_F + ")\\s*(?:\\/|por|a cada|para cada)\\s*(evento|ano|trabalho|curso|publica\\S*|pesquisa|monitoria|semestre|atividade|liga|participa\\S*|est[aá]gio|artigo|cap[ií]tulo|certificado|projeto|bolsa|cargo|apresenta\\S*)", "i"),
  new RegExp("corresponder[aá]\\s+a\\s+(" + NUM_F + ")", "i"),
  new RegExp("[–-]\\s*(" + NUM_F + ")\\s*(?:pontos?)?\\s*$", "i"),
];
function unidadeF(texto, titulo, max) {
  for (const re of UNIDADE_F) {
    const alvo = re === UNIDADE_F[3] ? titulo : titulo + ". " + texto; const m = alvo.match(re); if (!m) continue;
    const v = numF(m[1]); if (v > 0 && (!max || v <= max)) {
      const ini = Math.max(0, alvo.lastIndexOf(".", m.index) + 1); const frase = limpaF(alvo.slice(ini, Math.min(alvo.length, m.index + m[0].length + 60)).split(/(?<=\.)\s/)[0]);
      return { unit: v, regra: frase.slice(0, 160) };
    }
  }
  return { unit: null, regra: "" };
}

export function lerFichaDoEdital(texto) {
  const linhas = String(texto || "").replace(/\r/g, "").replace(/\f/g, "\n").split("\n");
  const cands = cabecalhosF(linhas);
  let melhor = null;
  for (const seq of sequenciasF(cands, linhas)) {
    const bl = blocosF(linhas, seq); const vals = bl.map(b => b.linhas.map(colunaF).find(Boolean)).filter(Boolean); const comValor = vals.length;
    // Valor de verdade tem vírgula ou "ponto". Só números inteiros soltos costumam ser número de página.
    const comVirgula = bl.filter(b => b.linhas.some(l => { const v = colunaF(l); return v && (v.includes(",") || /pontos?\.?\s*$/i.test(l)); })).length;
    const totalL = linhas.find((l, k) => k > seq[0].i && FIM_F.test(l) && colunaF(l)); const soma = vals.reduce((a, v) => a + numF(v), 0);
    const plausivel = comVirgula * 2 >= comValor || (totalL && Math.abs(soma - numF(colunaF(totalL))) < 0.01 * numF(colunaF(totalL)) + 0.001);
    if (comValor >= 2 && plausivel && (!melhor || comValor > melhor.n || (comValor === melhor.n && bl.length > melhor.bl.length))) melhor = { n: comValor, bl };
  }
  if (!melhor) return { ficha: [], maximo: null };
  const ficha = [];
  for (const b of melhor.bl) {
    const colIdx = b.linhas.findIndex(colunaF); if (colIdx < 0) continue;
    const max = numF(colunaF(b.linhas[colIdx]));
    // título: a linha do cabeçalho sem o valor da coluna, mais a linha seguinte se o título continua
    let titulo = b.txt.replace(new RegExp("\\s{3,}" + NUM_F + "\\s*(?:pontos?|pts?)?\\.?\\s*$", "i"), "");
    const prox = (b.linhas[1] || "").trim();
    if (prox && !colunaF(b.linhas[1]) && (/[,(–-]$/.test(titulo.trim()) || (titulo === titulo.toUpperCase() && prox === prox.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(prox)))) titulo += " " + prox;
    titulo = limpaF(titulo).replace(/\s*\*?\(atividades.*$/i, "").replace(/\s*[–-]\s*$/, "").slice(0, 140);
    const corpo = limpaF(b.linhas.slice(1).map(l => l.replace(new RegExp("\\s{3,}" + NUM_F + "\\s*(?:pontos?|pts?)?\\.?\\s*$", "i"), "")).join(" "));
    const u = unidadeF(corpo, titulo, max);
    titulo = titulo.replace(new RegExp("\\s*[–-]\\s*" + NUM_F + "\\s*(?:pontos?)?\\s*(?:por\\s+\\S+)?\\s*$", "i"), "").replace(/\s*[–-]\s*$/, "");
    const nome = /^[A-ZÀ-Ú\s,/()–-]+$/.test(titulo) && titulo.length > 8 ? titulo.charAt(0) + titulo.slice(1).toLowerCase() : titulo;
    ficha.push({ item: `${b.cod}. ${nome}`, pontos: u.regra || (corpo.slice(0, 140) + (corpo.length > 140 ? "..." : "")), maxN: max, unit: u.unit, artigo: /artigo|cap[ií]tulo|publica[cç]/i.test(titulo) });
  }
  // Teto geral: linha TOTAL com o valor na coluna
  const tot = linhas.find(l => FIM_F.test(l) && colunaF(l));
  return { ficha, maximo: tot ? numF(colunaF(tot)) : null };
}

// Código do item ("1", "1.1", "3a", "E1") e palavras do título, para casar com as linhas do currículo
const codigoF = item => (String(item).match(/^\s*([0-9]{1,2}(?:\.[0-9]{1,2})?[a-z]?|[A-Z][0-9]?)[.)]?\s/) || [])[1] || "";
const palavrasF = s => semAcF(s).replace(/^\s*\S+\s+/, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 4);
// Número do item no currículo em ordinal ("6º", "6°", "6ª"), como no Vitae MedEasy. No site, o número no começo do nome ("6 Liga", "4a Estágios").
const ordinalF = l => (String(l).match(/^\s*(\d{1,2})\s*[º°ª](?![0-9])/) || [])[1] || "";
const numeroItemF = item => (String(item).match(/^\s*(\d{1,2})[a-z]?\b/i) || [])[1] || "";
// Primeiro item da ficha com aquele número (item dividido em subitens, como 4a e 4b, recebe no primeiro)
const itemDoOrdinalF = (ficha, n) => n ? (ficha || []).findIndex(it => numeroItemF(it.item) === String(+n)) : -1;
function numerosFinaisF(l) {
  const m = String(l).match(new RegExp("((?:\\s{2,}[+-]?" + NUM_F + "(?:\\s*(?:pontos?|pts?))?)+)\\s*$", "i"));
  return m ? (m[1].match(new RegExp(NUM_F, "g")) || []).map(numF) : [];
}
// Lê a ficha preenchida no currículo pronto: a última coluna é a nota do candidato.
// Análises escritas à mão separam a nota com pontinhos, dois pontos, traço ou seta ("Monitoria ........ 0,5", "Monitoria: 0,5 ponto"),
// ou trazem "nota/máximo" ("0,5/1" e "0,5 de 1"). Tudo vira coluna separada por espaços, com a nota por último.
function normalizarNotaF(l) {
  let t = String(l).replace(/[.…_·]{3,}/g, "   ");
  t = t.replace(new RegExp("(" + NUM_F + ")\\s*(?:\\/|de)\\s*" + NUM_F + "\\s*(?:pontos?|pts?)?\\s*$", "i"), "   $1");
  t = t.replace(new RegExp("\\s*(?::|=|→|->|–|—|\\s-)\\s*(" + NUM_F + "\\s*(?:pontos?|pts?)?)\\s*$", "i"), "   $1");
  return t;
}
export function lerNotasDoCurriculo(texto, ficha) {
  const linhas = String(texto || "").replace(/\r/g, "").replace(/\f/g, "\n").split("\n").map(normalizarNotaF);
  const notas = []; let usadas = new Set(); const feitos = new Set();
  // Ficha do Vitae com "1º", "2º"...: a linha do ordinal dá a nota do item (ou do primeiro subitem do grupo)
  for (let i = 0; i < linhas.length; i++) {
    const n = ordinalF(linhas[i]); if (!n) continue; const idx = itemDoOrdinalF(ficha, n); if (idx < 0 || feitos.has(idx)) continue;
    let nums = [];
    for (let k = i; k < Math.min(linhas.length, i + 4); k++) { if (k > i && ordinalF(linhas[k])) break; nums = numerosFinaisF(linhas[k]); if (nums.length) { usadas.add(k); break; } }
    if (!nums.length) continue; usadas.add(i); feitos.add(idx);
    // o número do grupo vale pelos subitens juntos: usa o maior teto do grupo para conferir
    const mesmos = (ficha || []).filter(x => numeroItemF(x.item) === String(+n)); const max = mesmos.reduce((a, x) => a + (numF(x.maxN) || 0), 0); const nota = nums[nums.length - 1];
    if (!max || nota <= max + 0.001) notas.push({ idx, pts: nota, conferir: nums.length === 1 && Math.abs(nota - max) < 0.001 });
  }
  (ficha || []).forEach((it, idx) => {
    if (feitos.has(idx)) return;
    // subitem de um grupo que já recebeu a nota pelo ordinal
    if (numeroItemF(it.item) && [...feitos].some(j => numeroItemF(ficha[j].item) === numeroItemF(it.item))) return;
    const cod = codigoF(it.item); const pal = palavrasF(it.item).slice(0, 6);
    let achou = -1;
    for (let i = 0; i < linhas.length; i++) {
      if (usadas.has(i)) continue; const l = linhas[i]; const t = semAcF(l);
      const porCodigo = cod && new RegExp("^\\s*" + cod.replace(".", "\\.") + "[.)]?\\s", "i").test(l);
      const comuns = pal.filter(w => t.includes(w)).length;
      // item de uma palavra só ("Monitoria"): a linha precisa começar com ela
      const umaSo = pal.length === 1 && new RegExp("^[^a-z0-9]*(?:[0-9]{1,2}[a-z]?[.)]?\\s+)?" + pal[0]).test(t.trim());
      if ((porCodigo && (comuns >= 1 || !pal.length)) || (pal.length >= 2 && comuns >= Math.ceil(pal.length * 0.6)) || umaSo) { achou = i; break; }
    }
    if (achou < 0) return;
    // os números podem estar na mesma linha ou nas duas seguintes (título quebrado)
    let nums = [];
    for (let k = achou; k < Math.min(linhas.length, achou + 3); k++) { if (k > achou && cabecalhosF([linhas[k]]).length) break; nums = numerosFinaisF(linhas[k]); if (nums.length) { usadas.add(k); break; } }
    usadas.add(achou);
    if (!nums.length) return;
    const max = numF(it.maxN); let nota = nums[nums.length - 1];
    if (nums.length === 1 && max && Math.abs(nota - max) < 0.001) notas.push({ idx, pts: nota, conferir: true });
    else if (!max || nota <= max + 0.001) notas.push({ idx, pts: nota, conferir: false });
  });
  const tot = linhas.map(l => FIM_F.test(l) ? numerosFinaisF(l) : []).find(n => n.length);
  return { notas, total: tot ? tot[tot.length - 1] : null };
}
// Currículo de prova sem ficha no site: monta a ficha pela própria tabela (máximo e nota nas duas últimas colunas)
export function fichaDoCurriculo(texto) {
  const linhas = String(texto || "").replace(/\r/g, "").replace(/\f/g, "\n").split("\n");
  const ficha = [], notas = [];
  for (const l of linhas) {
    const m = l.match(/^\s*([0-9]{1,2}(?:\.[0-9]{1,2})?[a-z]?|[A-Z][0-9]?)[.)]?\s+(.+)$/); if (!m || FIM_F.test(l)) continue;
    const nums = numerosFinaisF(l); if (nums.length < 2) continue;
    const titulo = limpaF(m[2].replace(new RegExp("((?:\\s{2,}[+-]?" + NUM_F + "(?:\\s*(?:pontos?|pts?))?)+)\\s*$", "i"), ""));
    if (titulo.length < 3) continue;
    const max = nums[nums.length - 2], nota = nums[nums.length - 1]; if (nota > max + 0.001) continue;
    notas.push({ idx: ficha.length, pts: nota, conferir: false });
    ficha.push({ item: `${m[1]}. ${titulo}`, pontos: "", maxN: max, unit: null, artigo: /artigo|cap[ií]tulo|publica[cç]/i.test(titulo) });
  }
  return { ficha, notas };
}

// Certificados do currículo pronto (Vitae MedEasy): título do item e, depois, os certificados, um por página (imagem).
// blocos: na ordem do documento, { texto, certs, certsTexto, ref }. certs = imagens grandes. certsTexto = 1 quando a página não tem imagem mas o texto parece certificado.
// O que vem antes do primeiro título (capa, Lattes, documentos) fica de fora. Bloco que cita 3 ou mais itens e não tem certificado é a ficha de pontuação: pula.
export function certificadosDoCurriculo(blocos, ficha) {
  const chaves = (ficha || []).map(it => palavrasF(it.item).slice(0, 6));
  const casa = l => {
    const t = semAcF(l).trim(); if (!t || t.length > 220) return -1;
    let melhor = -1, nota = 0;
    chaves.forEach((pal, idx) => {
      if (!pal.length) return; const comuns = pal.filter(w => t.includes(w)).length;
      const ok = pal.length === 1 ? new RegExp("^[^a-z0-9]*(?:[0-9]{1,2}(?:\\.[0-9]{1,2})?[a-z]?[.)]?\\s+)?" + pal[0]).test(t) : comuns >= Math.ceil(pal.length * 0.6);
      const n = comuns / pal.length; if (ok && n > nota) { melhor = idx; nota = n; }
    });
    return melhor;
  };
  const porItem = {}; let atual = -1, total = 0, fora = 0;
  for (const b of blocos || []) {
    const ls = String(b.texto || "").split("\n");
    // Título com ordinal ("6º - LIGA CIENTÍFICA") vale mais que as palavras: as linhas dos comprovantes podem citar outros itens
    const ords = ls.map(l => itemDoOrdinalF(ficha, ordinalF(l))).filter(i => i >= 0);
    const achados = ords.length ? ords : ls.map(casa).filter(i => i >= 0); const distintos = new Set(achados);
    if (distintos.size >= 3 && !b.certs) continue;
    if (distintos.size && distintos.size < 3) atual = achados[achados.length - 1];
    // certsTexto: página sem imagem que parece certificado. Se ela tem título de item, é a página do título (lista dos comprovantes), não conta.
    const n = b.certs || (distintos.size ? 0 : (b.certsTexto || 0));
    if (n > 0) {
      if (atual < 0) { fora += n; continue; }
      for (let k = 0; k < n; k++) (porItem[atual] ||= []).push({ ref: b.ref || "", texto: distintos.size ? "" : String(b.texto || "") });
      total += n;
    }
  }
  return { porItem, total, fora };
}
