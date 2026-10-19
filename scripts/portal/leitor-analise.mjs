// Leitor da análise curricular MedEasy em texto (PDF já convertido).
// Usado pelo build (analise.mjs importa) e pelo site (montar-site.mjs injeta este arquivo sem os "export").
// Aceita variações do PDF: "ITEM 1" ou "01" ou "Item 1 -", número antes ou depois do rótulo,
// comprovantes numerados ou com marcador e, como reserva, a tabela "Análise resumida".

const NUM_L = "[+-]?\\d+(?:,\\d+)?";
const numL = s => { const n = parseFloat(String(s || "").replace(/\s/g, "").replace("+", "").replace(",", ".")); return isFinite(n) ? n : 0; };
const isoL = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
const limpaL = s => String(s || "").replace(/\s+/g, " ").trim();
const semAcL = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SELOS_L = ["Não se aplica agora", "Aumentar agora", "Médio prazo", "Longo prazo", "Completo", "Parcial", "A avaliar", "Não se aplica", "Não pontua", "Zerado"];
const ROT_L = [
  ["max", "PONTUA[CÇ][AÃ]O\\s+M[AÁ]XIMA|M[AÁ]XIMO\\s+DO\\s+ITEM"],
  ["porAtividade", "POR\\s+ATIVIDADE"],
  ["pontos", "PONTUA[CÇ][AÃ]O\\s+PESSOAL|SUA\\s+PONTUA[CÇ][AÃ]O"],
  ["ganho", "GANHO\\s+POSS[IÍ]VEL"],
];
const QUALQUER_ROT_L = new RegExp(ROT_L.map(r => r[1]).join("|"), "i");
const SECAO_L = /^\s*(COMO AUMENTAR|AN[AÁ]LISE RESUMIDA|CONSIDERA[CÇ][OÕ]ES FINAIS|PRIORIDADES|CHECKLIST|DATAS IMPORTANTES|VIS[AÃ]O GERAL|OBSERVA[CÇ][OÕ]ES GERAIS)\b/i;

function seloL(texto) {
  const t = semAcL(texto);
  for (const s of SELOS_L) if (new RegExp("(^|[^a-z])" + semAcL(s) + "($|[^a-z])").test(t)) return s;
  return "";
}
function cabItemL(l) {
  let m = l.match(/^\s*ITEM\s*0?(\d{1,2}[a-z]?)\b\s*[-–:.]?\s*(.*)$/i); if (m) return { n: m[1], resto: m[2], forte: true };
  m = l.match(/^\s*0?(\d{1,2}[a-z]?)(?:\s*[.)\-–:]\s*|\s{2,}|\s*$)(.*)$/); if (m && !/^\d/.test(m[2])) return { n: m[1], resto: m[2], forte: false };
  return null;
}
// Acha o número de cada rótulo. Se a linha começa pelo número, cada rótulo pega o número de antes. Se começa pelo rótulo, pega o de depois.
function rotulosDaLinha(l) {
  const achados = [];
  for (const [k, re] of ROT_L) { const g = new RegExp(re, "gi"); let m; while ((m = g.exec(l))) achados.push({ k, i: m.index, fim: m.index + m[0].length }); }
  if (!achados.length) return achados;
  achados.sort((a, b) => a.i - b.i);
  const nums = []; { const g = new RegExp("(^|\\s)(" + NUM_L + ")(?=\\s|$)", "g"); let m; while ((m = g.exec(l))) nums.push({ v: m[2], i: m.index + m[1].length }); }
  const numPrimeiro = nums.length && nums[0].i < achados[0].i;
  achados.forEach((r, j) => {
    if (numPrimeiro) { const lim = j ? achados[j - 1].fim : -1; const n = nums.filter(x => x.i > lim && x.i < r.i).pop(); r.n = n ? n.v : null; }
    else { const lim = j + 1 < achados.length ? achados[j + 1].i : Infinity; const n = nums.find(x => x.i > r.fim && x.i < lim); r.n = n ? n.v : null; }
    r.depois = !numPrimeiro;
  });
  return achados;
}
function tiraRotulosL(l) {
  let s = l;
  for (const [, re] of ROT_L) s = s.replace(new RegExp("(" + NUM_L + ")\\s+(?:" + re + ")", "gi"), " ").replace(new RegExp("(?:" + re + ")\\s*:?\\s*(" + NUM_L + ")?", "gi"), " ");
  return s;
}

export function lerTextoAnalise(texto) {
  const linhas = String(texto || "").replace(/\r/g, "").replace(/\f/g, "\n").split("\n").map(l => l.replace(/\s+$/, "")).filter(l => !/^\s*MEDEASY\s+AN[AÁ]LISE CURRICULAR\b/i.test(l));
  const corpo = linhas.join("\n"); const naoVazias = linhas.map(l => l.trim()).filter(Boolean);

  // Capa
  let sigla = (naoVazias[0] || "").replace(/\s*AN[AÁ]LISE CURRICULAR\s*/i, " ").trim();
  const iTit = naoVazias.findIndex(l => /^an[aá]lise curricular$/i.test(l));
  const area = naoVazias[1] && !/^an[aá]lise curricular$/i.test(naoVazias[1]) ? naoVazias[1] : "";
  const cliente = iTit >= 0 ? naoVazias[iTit + 1] || "" : "";
  const nota = corpo.match(new RegExp("(" + NUM_L + ")\\s*(?:\\/|de)\\s*(" + NUM_L + ")\\s*\\n?\\s*PONTUA[CÇ][AÃ]O\\s+ESTIMADA", "i"))
    || corpo.match(new RegExp("PONTUA[CÇ][AÃ]O\\s+ESTIMADA\\s*:?\\s*\\n?\\s*(" + NUM_L + ")\\s*(?:\\/|de)\\s*(" + NUM_L + ")", "i"))
    || corpo.match(new RegExp("NOTA\\s+ATUAL\\s*:?[ \\t]*(" + NUM_L + ")(?:\\s*(?:\\/|de)\\s*(" + NUM_L + "))?", "i"));
  let possivel = "", prazo = "";
  { const iP = linhas.findIndex(l => /POSS[IÍ]VEL AT[EÉ]\s*\d{2}\/\d{2}\/\d{4}/i.test(l) && !/GANHO/i.test(l));
    if (iP >= 0) { prazo = linhas[iP].match(/AT[EÉ]\s*(\d{2}\/\d{2}\/\d{4})/i)[1]; const mesma = linhas[iP].match(new RegExp("\\d{4}\\s*:?\\s*(" + NUM_L + ")\\s*$")); if (mesma) possivel = mesma[1]; else for (let i = iP - 1; i >= Math.max(0, iP - 6); i--) { const m = linhas[i].trim().match(new RegExp("^(" + NUM_L + ")$")); if (m) { possivel = m[1]; break; } } }
    if (!possivel) { const m = corpo.match(new RegExp("(?<!GANHO\\s{0,5})(?:NOTA\\s+)?POSS[IÍ]VEL(?:\\s+AT[EÉ]\\s+(?:O\\s+PRAZO|\\d{2}\\/\\d{2}\\/\\d{4}))?[ \\t]*:?[ \\t]*(" + NUM_L + ")", "i")); if (m) possivel = m[1]; } }
  const regras = (corpo.match(/Regras (?:principais )?do edital(?: que você precisa saber)?\s*\n([\s\S]*?)(?=\n\s*ITEM \d+\s|\n\s*0?1\s|\n{3,})/i) || [])[1];
  const anoM = (sigla + " " + area).match(/20\d\d/) || corpo.match(/AN[AÁ]LISE CURRICULAR\s+\S+\s+(20\d\d)/i);

  // Cabeçalhos dos itens. Com "ITEM n" no documento, só eles contam. Sem isso, um número sozinho só vira item se tiver rótulo de pontuação antes do próximo número.
  const cands = []; linhas.forEach((l, i) => { const c = cabItemL(l); if (c) cands.push({ ...c, i }); });
  let cabs = cands.filter(c => c.forte);
  if (!cabs.length) {
    cabs = cands.filter((c, j) => { const fim = j + 1 < cands.length ? cands[j + 1].i : Math.min(linhas.length, c.i + 25); return linhas.slice(c.i, fim).some(l => QUALQUER_ROT_L.test(l)); });
    // tira os números de comprovantes numerados que caíram entre o rótulo e o comentário
    const ok = []; for (const c of cabs) { const ant = ok[ok.length - 1]; if (ant) { const entre = linhas.slice(ant.i, c.i); const iComp = entre.findIndex(l => /COMPROVANTES/i.test(l)); const iCom = entre.findIndex(l => /COMENT[AÁ]RIO/i.test(l)); if (iComp >= 0 && (iCom < 0 || iCom < iComp) && entre.slice(iComp).every(l => !QUALQUER_ROT_L.test(l)) && !linhas.slice(c.i, c.i + 12).some(l => QUALQUER_ROT_L.test(l))) continue; } ok.push(c); }
    cabs = ok;
  }

  const temGanho = ROT_L[3] && new RegExp(ROT_L[3][1], "i").test(corpo);

  const itens = [];
  cabs.forEach((c, j) => {
    let fim = j + 1 < cabs.length ? cabs[j + 1].i : linhas.length;
    for (let i = c.i + 1; i < fim; i++) if (SECAO_L.test(linhas[i])) { fim = i; break; }
    const bloco = linhas.slice(c.i, fim);
    const situacao = seloL(c.resto) || seloL(bloco.slice(0, 4).join(" ")) || "";
    // título
    let resto = c.resto; if (situacao) resto = resto.replace(new RegExp(situacao.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "");
    resto = limpaL(resto.replace(/^[-–:.]\s*/, ""));
    let k = 1; const tit = []; if (resto) tit.push(resto); else { while (k < bloco.length && !bloco[k].trim()) k++; if (k < bloco.length && !QUALQUER_ROT_L.test(bloco[k])) { tit.push(limpaL(bloco[k].replace(new RegExp(situacao, "i"), ""))); k++; } }
    const abertos = s => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
    while (k < bloco.length && bloco[k].trim() && !QUALQUER_ROT_L.test(bloco[k]) && (/^\s*[a-zà-ú(]/.test(bloco[k]) || /[,(]$/.test(tit.join(" ")) || abertos(tit.join(" ")) > 0)) { tit.push(limpaL(bloco[k])); k++; }
    // regra: linhas até o primeiro rótulo ou o título dos comprovantes
    const regraL = []; for (; k < bloco.length; k++) { const l = bloco[k]; if (!l.trim()) { if (regraL.length) break; continue; } if (QUALQUER_ROT_L.test(l) || /COMPROVANTES|AN[AÁ]LISE CURRICULAR|COMENT[AÁ]RIO/i.test(l)) break; if (seloL(l) && limpaL(l).length < 25) continue; regraL.push(limpaL(l)); }
    // valores
    const v = { max: 0, porAtividade: 0, pontos: 0, ganho: null };
    bloco.forEach((l, i) => { for (const r of rotulosDaLinha(l)) {
      let n = r.n;
      if (n == null) { const ant = (bloco[i - 1] || "").trim(), prox = (bloco[i + 1] || "").trim(); const so = s => (s.match(new RegExp("^(" + NUM_L + ")$")) || [])[1]; n = r.depois ? (so(prox) ?? so(ant)) : (so(ant) ?? so(prox)); }
      if (n != null) v[r.k] = numL(n); } });
    if (v.ganho == null) v.ganho = temGanho ? 0 : Math.max(0, Math.round((v.max - v.pontos) * 100) / 100);
    // comprovantes
    const comprovantes = []; const iComp = bloco.findIndex(l => /COMPROVANTES/i.test(l));
    if (iComp >= 0) { let atual = false;
      for (const l of bloco.slice(iComp + 1)) { if (/COMENT[AÁ]RIO/i.test(l)) break; const s = limpaL(tiraRotulosL(l)); if (!s) continue;
        const m = s.match(/^(?:\d{1,3}[.)]|[•●▪◦‣\-–])\s*(.+)$/);
        if (m) { comprovantes.push(m[1]); atual = true; } else if (/^nenhum/i.test(s) || (seloL(s) && s.length < 25)) { atual = false; } else if (atual) comprovantes[comprovantes.length - 1] += " " + s; } }
    // comentário
    let comentario = ""; const iCom = bloco.findIndex(l => /COMENT[AÁ]RIO\s*:?/i.test(l));
    if (iCom >= 0) { const partes = [bloco[iCom].replace(/^[\s\S]*?COMENT[AÁ]RIO\s*:?\s*/i, "")]; for (const l of bloco.slice(iCom + 1)) { if (!l.trim()) { if (limpaL(partes.join(" "))) break; continue; } partes.push(l); } comentario = limpaL(partes.join(" ")).slice(0, 1500); }
    const nome = limpaL(tit.join(" "));
    itens.push({ n: /^\d+$/.test(c.n) ? +c.n : c.n, nome: `${c.n}. ${nome}`, situacao, regra: limpaL(regraL.join(" ")), max: v.max, porAtividade: v.porAtividade, pontos: v.pontos, ganho: v.ganho, comprovantes: comprovantes.map(limpaL), comentario });
  });

  // Reserva: tabela "Análise resumida" (número, item, nota / máximo, situação)
  const iRes = linhas.findIndex(l => /AN[AÁ]LISE RESUMIDA/i.test(l));
  if (iRes >= 0) {
    const reTab = new RegExp("^\\s*0?(\\d{1,2}[a-z]?)[.)]?\\s+(.+?)\\s{2,}(" + NUM_L + ")\\s*(?:\\/|de)\\s*(" + NUM_L + ")(?:\\s{2,}(.+))?$");
    for (const l of linhas.slice(iRes + 1)) { const m = l.match(reTab); if (!m) continue;
      const ja = itens.find(x => String(x.n) === m[1]);
      if (ja) { if (!ja.max && !ja.pontos) { ja.pontos = numL(m[3]); ja.max = numL(m[4]); ja.ganho = ja.ganho || Math.max(0, ja.max - ja.pontos); } if (!ja.situacao) ja.situacao = seloL(m[5] || ""); }
      else itens.push({ n: /^\d+$/.test(m[1]) ? +m[1] : m[1], nome: `${m[1]}. ${limpaL(m[2])}`, situacao: seloL(m[5] || ""), regra: "", max: numL(m[4]), porAtividade: 0, pontos: numL(m[3]), ganho: Math.max(0, Math.round((numL(m[4]) - numL(m[3])) * 100) / 100), comprovantes: [], comentario: "" }); }
  }

  const soma = k => Math.round(itens.reduce((a, i) => a + (i[k] || 0), 0) * 100) / 100;
  return {
    nome: sigla.replace(/\s*20\d\d\s*$/, "").trim(), ano: anoM ? (anoM[1] || anoM[0]) : "", area, cliente,
    notaEstimada: nota ? numL(nota[1]) : soma("pontos"), notaMax: nota && nota[2] ? numL(nota[2]) : soma("max"),
    notaPossivel: possivel ? numL(possivel) : "", prazoEnvio: isoL(prazo), regras: regras ? limpaL(regras) : "", itens, fonte: "analise",
  };
}
