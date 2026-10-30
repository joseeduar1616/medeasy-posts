/* ---------- análise curricular: lê o PDF (ou triagem.json) no navegador ---------- */
/* Mesmas regras de scripts/portal/analise.mjs. O texto do PDF é remontado linha a linha com o pdf.js. */
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
let _pdfjs = null;
async function pdfjs(){ if (_pdfjs) return _pdfjs; const m = await import(PDFJS_URL); m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return _pdfjs = m; }
/* Junta os pedaços de texto por linha (mesma altura) e separa colunas com espaços, parecido com pdftotext -layout */
async function textoDoPdf(arquivo){
  const lib = await pdfjs(); const doc = await lib.getDocument({ data:await arquivo.arrayBuffer() }).promise; const paginas = [];
  for (let n = 1; n <= doc.numPages; n++){
    const pg = await doc.getPage(n); const tc = await pg.getTextContent(); const its = tc.items.filter(i => i.str && i.str.trim());
    const linhas = []; // [{y, partes:[{x, s, w}]}]
    for (const i of its){ const x = i.transform[4], y = Math.round(i.transform[5]), fs = Math.abs(i.transform[0]) || 10; let l = linhas.find(l => Math.abs(l.y - y) <= 2); if (!l){ l = { y, partes:[] }; linhas.push(l); } l.partes.push({ x, s:i.str, w:i.width || 0, fs }); }
    linhas.sort((a, b) => b.y - a.y);
    let yAnt = null;
    const txt = linhas.map(l => { l.partes.sort((a, b) => a.x - b.x); let s = "", fim = null; for (const p of l.partes){ if (fim != null){ const gap = p.x - fim; s += gap > p.fs * 1.2 ? "   " : gap > p.fs * 0.22 ? " " : ""; } s += p.s; fim = p.x + p.w; } const pulo = yAnt != null && yAnt - l.y > 26; yAnt = l.y; return (pulo ? "\n" : "") + s; }).join("\n");
    paginas.push(txt);
  }
  return paginas.join("\n\f\n");
}
const numA = s => { const n = parseFloat(String(s || "").replace(/\s/g, "").replace("+", "").replace(",", ".")); return isFinite(n) ? n : 0; };
const isoDeA = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
const limpaA = s => String(s || "").replace(/\s+/g, " ").trim();
/* Leitor do texto da análise: vem de scripts/portal/leitor-analise.mjs na montagem (o mesmo do build) */
__LEITOR_ANALISE__
/* triagem.json da skill, ou um JSON parecido feito à mão ou por outro Claude: aceita outros nomes de campo */
function lerTriagemJson(j){
  const de = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== "") return o[k]; return undefined; };
  const lista = de(j, "itens", "items", "criterios") || [];
  const comps = i => { const c = de(i, "certificados", "comprovantes", "documentos") || [];
    return (Array.isArray(c) ? c : String(c).split(";")).filter(x => x && !(typeof x === "object" && x.reserva))
      .map(x => typeof x === "object" ? [de(x, "evento", "nome", "titulo", "descricao") || "", [x.data, x.ch].filter(Boolean).join(", ")].filter(Boolean).join(" (") + (x.data || x.ch ? ")" : "") : String(x).trim()).filter(Boolean); };
  const itens = lista.map(i => { const n = de(i, "n", "numero", "codigo", "cod"); const t = de(i, "titulo", "item", "nome", "descricao", "criterio") || "";
    return { n, nome:`${n != null && !String(t).startsWith(String(n)) ? n + ". " : ""}${t || "Item"}`, situacao:i.situacao || "", regra:de(i, "regra", "pontuacao_regra") || "",
      max:numA(de(i, "maximo", "max", "pontuacao_maxima", "maximo_item")), porAtividade:numA(de(i, "por_atividade", "porAtividade", "por_certificado", "unidade")),
      pontos:numA(de(i, "nota", "pontos", "pontuacao", "nota_atual", "pontuacao_pessoal")), ganho:numA(de(i, "ganho_possivel", "ganho")), comprovantes:comps(i), comentario:de(i, "risco", "comentario", "como_aumentar") || "" }; });
  return { nome:j.sigla || j.prova || "Prova", ano:(String(j.prova || j.edital || "").match(/20\d\d/) || [""])[0], area:j.area || "", cliente:j.cliente || "",
    notaEstimada:numA(de(j, "nota_total", "nota", "pontuacao_total")) || Math.round(itens.reduce((a, i) => a + i.pontos, 0) * 100) / 100, notaPossivel:j.nota_possivel ? numA(j.nota_possivel) : "", notaMax:itens.reduce((a, i) => a + i.max, 0), prazoEnvio:isoDeA(j.envio && j.envio.prazo) || (j.envio && j.envio.prazo) || "",
    regras:[j.envio?.formato, j.envio?.tamanho_max ? "até " + j.envio.tamanho_max : "", j.envio?.ordem].filter(Boolean).join(". "), itens, fonte:"triagem" };
}
async function lerArquivoAnaliseSite(arquivo, provaPadrao){
  if (/\.json$/i.test(arquivo.name)) return lerTriagemJson(JSON.parse(await arquivo.text()));
  // A resposta do Claude ("ANÁLISE MEDEASY") salva em .txt, Word ou PDF entra igual a colada
  const txt = /\.txt$/i.test(arquivo.name) ? await arquivo.text() : /\.docx$/i.test(arquivo.name) ? await textoDoDocx(arquivo) : await textoDoPdf(arquivo);
  const prs = lerAnaliseTexto(txt, provaPadrao); if (prs.length) return prs[0];
  if (!/pdf$/i.test(arquivo.type) && !/\.pdf$/i.test(arquivo.name)) throw new Error("Esse texto não está no formato ANÁLISE MEDEASY");
  const pr = lerTextoAnalise(txt);
  if (!pr.itens.length) throw new Error("Não achei os itens nesse PDF. Ele precisa ser a análise curricular MedEasy, com um card por item e a pontuação de cada um");
  return pr;
}
/* Guardar: cliente do Notion fica neste navegador, triagem fica no registro dela */
const anKey = id => "medeasy-analise-" + id;
function analisesDe(c){
  if (c.triagem) return c.triagem.analises || {};
  let local = {}; try { local = JSON.parse(localStorage.getItem(anKey(c.id)) || "{}"); } catch {}
  // As do Notion (controle do cliente) valem para toda a equipe. Fica a mais nova de cada prova.
  const doCtrl = (typeof ctrlDe === "function" ? ctrlDe(c).analises : null) || {}; const tudo = { ...doCtrl };
  for (const [k, pr] of Object.entries(local)) if (!tudo[k] || (pr.em || 0) > (tudo[k].em || 0)) tudo[k] = pr;
  for (const k of Object.keys(tudo)) if (tudo[k] && tudo[k].removida) delete tudo[k];
  return tudo;
}
/* Cliente do Notion: grava neste navegador e no controle do cliente, que vai para o Notion pela ponte. Assim o cliente vê no portal. */
async function gravarAnalisesCliente(c, tudo, removidas){
  try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch {}
  if (typeof ctrlDe !== "function") return; const ct = ctrlDe(c);
  ct.analises = {}; for (const [k, pr] of Object.entries(tudo)){ const { texto, ...resto } = pr; ct.analises[k] = resto; }
  salvarCtrl(c);
  if (typeof temPonte === "function" && temPonte() && paginaDoCliente(c)){
    try { await salvarNotion(paginaDoCliente(c), { "Controle de certificados":textoCtrl(ct) }, removidas ? "Análise removida do Notion" : "Análise salva no Notion. O cliente vê no portal na próxima sincronização"); ct.notion = textoCtrl(ct); c.controle = JSON.parse(ct.notion); salvarCtrl(c); }
    catch (e) { toast("A análise ficou neste navegador, mas não gravou no Notion: " + e.message); }
  }
}
/* Nome da prova da análise: reconhece pelo título, mesmo nas análises guardadas antes dessa correção */
const nomeDaAnalise = pr => pr.provaEscolhida || provaDoTitulo([pr.titulo, pr.nome].filter(Boolean).join(" ")) || pr.nome;
const provaConhecida = nome => PROVAS.some(p => kP(p.nome) === kP(nome));
/* O mentor diz de qual prova é a análise quando o PDF não deixa claro */
function escolherProvaAnalise(el){
  const c = clienteSel(); const tudo = analisesDe(c); const pr = tudo[el.dataset.k]; if (!pr || !el.value) return;
  delete tudo[el.dataset.k]; pr.provaEscolhida = el.value; pr.titulo = pr.titulo || pr.nome; pr.nome = el.value; tudo[kP(el.value)] = pr;
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; if (!(t.provas || []).includes(PROVAS.find(p => p.nome === el.value)?.k)) t.provas = [...(t.provas || []), PROVAS.find(p => p.nome === el.value).k]; salvarTri(t); }
  else { gravarAnalisesCliente(c, tudo); c.provas = (c.provas || []).filter(p => !(p.fonte === "analise" && String(p.id).startsWith("a"))); aplicarAnalises(c); }
  delete S.cont[c.id]; render(); toast(`Análise ligada à prova ${el.value}`);
}
function guardarAnalise(c, pr){
  pr = { ...pr, nome:nomeDaAnalise(pr) }; const k = kP(pr.nome); const tudo = analisesDe(c); tudo[k] = { ...pr, em:Date.now() };
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; if (!(t.provas || []).some(x => kP(nomeProva(x)).startsWith(k) || k.startsWith(kP(nomeProva(x))))){ const p = PROVAS.find(p => k.startsWith(p.k) || kP(p.nome).startsWith(k)); if (p){ t.provas = [...(t.provas || []), p.k]; t.provasDaAnalise = [...(t.provasDaAnalise || []), p.k]; } } salvarTri(t); }
  else gravarAnalisesCliente(c, tudo);
}
/* Remove a análise (o PDF lançado). Na triagem, tira também a prova que a análise tinha marcado sozinha. */
function apagarAnalise(c, k){
  const tudo = analisesDe(c); const pr = tudo[k]; if (!pr) return; const nome = nomeDaAnalise(pr); delete tudo[k];
  const aindaUsa = Object.values(tudo).some(x => kP(nomeDaAnalise(x)) === kP(nome));
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; const pk = (PROVAS.find(p => kP(p.nome) === kP(nome)) || {}).k;
    if (pk && !aindaUsa && (t.provasDaAnalise || []).includes(pk)){ t.provas = (t.provas || []).filter(x => x !== pk); t.provasDaAnalise = t.provasDaAnalise.filter(x => x !== pk); }
    salvarTri(t); }
  else { gravarAnalisesCliente(c, tudo, true);
    if (!aindaUsa){ c.provas = (c.provas || []).filter(p => !(p.fonte === "analise" && kP(p.nome) === kP(nome) && String(p.id).startsWith("a")));
      for (const p of c.provas) if (p.fonte === "analise" && p.analiseEm && kP(p.nome) === kP(nome)){ delete p.itens; delete p.fonte; delete p.notaEstimada; delete p.notaPossivel; delete p.analiseEm; } }
    aplicarAnalises(c); }
  delete S.cont[c.id];
}
/* Junta as análises guardadas nas provas do cliente (mesma regra do build: casa pelo começo da sigla) */
function aplicarAnalises(c){
  const tudo = analisesDe(c); if (!Object.keys(tudo).length) return c;
  c.provas = c.provas || [];
  for (const [k0, pr0] of Object.entries(tudo)){ const pr = { ...pr0, nome:nomeDaAnalise(pr0) }; const k = kP(pr.nome);
    const p = c.provas.find(x => { const kx = kP(x.nome); return k.startsWith(kx) || kx.startsWith(k); });
    const dados = { area:pr.area, notaEstimada:pr.notaEstimada, notaMax:pr.notaMax, notaPossivel:pr.notaPossivel, regras:pr.regras, itens:pr.itens, fonte:"analise", analiseEm:pr.em, ano:pr.ano || "" };
    if (pr.prazoEnvio) dados.prazoEnvio = pr.prazoEnvio;
    if (p) Object.assign(p, dados, { nome:p.nome, id:p.id }); else c.provas.push({ id:"a" + c.provas.length, nome:pr.nome, edital:editalJS(pr.nome), ...dados });
  }
  return c;
}
async function importarAnalise(input){
  const c = clienteSel(); const f = input.files && input.files[0]; if (!c || !f) return;
  toast("Lendo o arquivo");
  const so = (c.provas || []).filter(p => p.nome); try { const pr = await lerArquivoAnaliseSite(f, so.length === 1 ? so[0].nome : ""); pr.arquivo = f.name; guardarAnalise(c, pr); delete S.cont[c.id]; if (!c.triagem) aplicarAnalises(c); render(); toast(`Análise ${pr.nome} lida: ${d1(pr.notaEstimada)} pontos em ${pr.itens.length} itens`); }
  catch (e) { if (!(await analiseLivre(c, f))) toast("Esse arquivo não está no formato da análise MedEasy e não achei as notas dos itens da ficha nele. Lance em Certificados por item (Completo, − e +)"); }
}
/* ---------- análise padrão em texto ----------
   O mentor copia o pedido pronto ("Copiar pedido para o Claude"), cola no Claude junto com os certificados e cola a resposta de volta.
   Formato, um bloco por prova:
     ANÁLISE MEDEASY
     Cliente: Fulana
     Prova: PSU-GO 2027
     Especialidade: Clínica Médica
     Item | Nome | Pontos | Máximo | Comprovantes | Como aumentar
     2 | Monitoria | 0,25 | 0,5 | Monitoria de Anatomia 2023 | Fazer mais uma monitoria
     Nota: 2,2 */
// Código do item: número ("1", "3a", "7a1") ou letra do edital ("A", "E1", como no HCPA)
const codItemA = s => (String(s || "").match(/^\s*(\d{1,2}[a-z]?\d?|[A-Z]\d{0,2})(?=[\s.)\-–:]|$)/) || [])[1] || "";
const semCodA = s => String(s || "").replace(/^\s*(\d{1,2}[a-z]?\d?|[A-Z]\d{0,2})(?:[.)\-–:]\s*|\s+)/, "").trim();
function lerAnaliseTexto(txt, provaPadrao){
  const limpo = String(txt || "").replace(/\r/g, "").replace(/\*\*/g, "").replace(/\f/g, "\n");
  let blocos = limpo.split(/^\s*#*\s*AN[AÁ]LISE MEDEASY\s*$/im).slice(1);
  // Só a tabela, sem o título: vale se tiver o cabeçalho (Item, Pontos, Máximo) e a prova for conhecida
  if (!blocos.length && /^\s*\|?\s*item\b.*pontos.*m[aá]ximo/im.test(semAcento(limpo).replace(/maximo/g, "máximo")) && (provaPadrao || /^\s*prova\s*:/im.test(limpo))) blocos = [limpo];
  const out = [];
  for (const b of blocos){
    const ls = b.split("\n").map(l => l.trim()).filter(Boolean);
    const campo = rot => { const l = ls.find(l => new RegExp("^" + rot + "\\s*:", "i").test(semAcento(l))); return l ? l.slice(l.indexOf(":") + 1).trim() : ""; };
    const provaTxt = campo("prova") || provaPadrao || ""; if (!provaTxt) continue;
    const noCab = ls.findIndex(l => /^\|?\s*item\b/i.test(l) && /pontos/i.test(l));
    const nome = (typeof provaDoTitulo === "function" && provaDoTitulo(provaTxt)) || provaTxt.replace(/\s*20\d\d.*$/, "").trim();
    const ed = typeof editalJS === "function" ? editalJS(nome) : null; const ficha = ((ed && ed.ficha) || []).filter(x => x.maxN != null);
    const itens = [];
    for (const [li, l] of ls.entries()){
      // PDF e Word perdem o "|": as colunas viram 3 ou mais espaços ou tab. Só depois do cabeçalho da tabela.
      if ((l.match(/\|/g) || []).length < 3){ if (noCab < 0 || li <= noCab || /^(nota|cliente|prova|especialidade)\s*:/i.test(semAcento(l))) continue;
        const it = linhaSemBarras(l); if (!it) continue; const [cod, titulo, pts, max, comp, como] = it; const f = (cod && ficha.find(x => codItemA(x.item) && codItemA(x.item).toLowerCase() === cod.toLowerCase())) || ficha.find(x => kP(semCodA(x.item)) === kP(titulo));
        const mx = numA(max) || (f ? numA(f.maxN) : 0), pt = Math.min(numA(pts), mx || Infinity);
        itens.push({ n:cod, nome:f ? f.item : `${cod ? cod + ". " : ""}${titulo}`, regra:f ? f.pontos || "" : "", max:mx, porAtividade:f && f.unit != null ? numA(f.unit) : 0, pontos:pt,
          ganho:Math.max(0, Math.round((mx - pt) * 100) / 100), comprovantes:String(comp || "").split(";").map(x => x.trim()).filter(Boolean), comentario:como || "",
          situacao:mx && pt >= mx - 0.001 ? "Completo" : pt > 0 ? "Parcial" : como ? "Aumentar agora" : "" });
        continue; }
      // Tabela markdown tem "|" nas pontas. Sem isso, a primeira célula vazia é o número do item em branco e não pode sumir.
      const cel = l.split("|").map(x => x.trim()); if (cel.length > 6 && cel[0] === "") cel.shift(); while (cel.length > 6 && cel[cel.length - 1] === "") cel.pop();
      if (/^item$/i.test(cel[0]) || /^nome$/i.test(cel[1]) || /^[-:\s]+$/.test(cel.join(""))) continue;
      let [cod, titulo, pts, max, comp, como] = cel; if (!titulo && !cod) continue;
      // Número do item escrito junto do nome ("A Histórico escolar")
      if (!cod && codItemA(titulo)) { cod = codItemA(titulo); titulo = semCodA(titulo); }
      const f = (cod && ficha.find(x => codItemA(x.item) && codItemA(x.item).toLowerCase() === String(cod).toLowerCase()))
        || ficha.find(x => titulo && kP(semCodA(x.item)) === kP(titulo));
      const mx = numA(max) || (f ? numA(f.maxN) : 0), pt = Math.min(numA(pts), mx || Infinity);
      itens.push({ n:cod, nome:f ? f.item : `${cod ? cod + ". " : ""}${titulo}`, regra:f ? f.pontos || "" : "", max:mx, porAtividade:f && f.unit != null ? numA(f.unit) : 0, pontos:pt,
        ganho:Math.max(0, Math.round((mx - pt) * 100) / 100), comprovantes:String(comp || "").split(";").map(x => x.trim()).filter(Boolean), comentario:como || "",
        situacao:mx && pt >= mx - 0.001 ? "Completo" : pt > 0 ? "Parcial" : como ? "Aumentar agora" : "" });
    }
    if (!itens.length) continue;
    const soma = Math.round(itens.reduce((a, i) => a + i.pontos, 0) * 100) / 100;
    out.push({ nome, titulo:provaTxt, ano:(provaTxt.match(/20\d\d/) || [ANO_AN()])[0], area:campo("especialidade"), cliente:campo("cliente"), notaEstimada:numA(campo("nota")) || soma,
      notaMax:numA(ed && ed.maximo) || Math.round(itens.reduce((a, i) => a + i.max, 0) * 100) / 100, notaPossivel:"", itens, fonte:"texto" });
  }
  return out;
}
/* Linha da tabela sem "|" (PDF ou Word): código opcional, nome, pontos, máximo, comprovantes e como aumentar. Os dois primeiros números são pontos e máximo. */
function linhaSemBarras(l){
  const cel = l.split(/\t|\s{3,}/).map(x => x.trim()).filter(Boolean); if (cel.length < 3) return null;
  const ehNum = x => /^\d{1,2}(?:[.,]\d{1,2})?$/.test(x); const i = cel.findIndex(ehNum); if (i < 1 || !ehNum(cel[i + 1] || "")) return null;
  let cod = "", titulo = cel.slice(0, i).join(" ");
  if (i > 1 && codItemA(cel[0]) === cel[0]) { cod = cel[0]; titulo = cel.slice(1, i).join(" "); } else if (codItemA(titulo)) { cod = codItemA(titulo); titulo = semCodA(titulo); }
  return [cod, titulo, cel[i], cel[i + 1], cel[i + 2] || "", cel.slice(i + 3).join(" ")];
}
const ANO_AN = () => (typeof ANO !== "undefined" ? ANO : "2027");
/* Pedido pronto para colar no Claude: já vai com a ficha de cada prova do cliente, com o número e o máximo de cada item */
function pedidoClaude(c){
  const provas = (c.provas || []).filter(p => p.nome);
  const bloco = p => { const it = itensDaProva(p);
    return `ANÁLISE MEDEASY\nCliente: ${c.nome || ""}\nProva: ${p.nome} ${ANO_AN()}\nEspecialidade: ${c.area || ""}\nItem | Nome | Pontos | Máximo | Comprovantes | Como aumentar\n` +
      (it.length ? it.map(i => `${codItemA(i.item) || ""} | ${codItemA(i.item) ? semCodA(i.item) : i.item} |  | ${String(i.maxN).replace(".", ",")} |  | `).join("\n") : "(a ficha desta prova não está no site: use os itens do edital, um por linha)") + "\nNota: "; };
  const regras = p => { const it = itensDaProva(p); return it.length ? `Como pontua cada item da ${p.nome}:\n` + it.map(i => `${i.item}: ${i.pontos || "ver edital"} (máximo ${String(i.maxN).replace(".", ",")})`).join("\n") : ""; };
  return `Preciso da análise curricular de um cliente da MedEasy no formato padrão do Portal MedEasy. Vou mandar junto os certificados e o currículo dele${provas.some(p => !itensDaProva(p).length) ? " e o edital" : ""}.

Para cada item, diga quantos pontos ele faz hoje (sem passar do máximo), quais comprovantes contam e o que ele pode fazer para aumentar a nota.

Quem decide o que vale é o mentor da MedEasy, que conhece a banca. Conte como válido todo comprovante que eu mandar, no item em que ele se encaixa. Não tire ponto por detalhe de formato, como falta de assinatura, carimbo, QR code, papel timbrado, carga horária ou data. Se algum detalhe puder ser cobrado, conte o ponto mesmo assim e deixe só uma dica curta em "Como aumentar" (por exemplo, "se der, peça a versão assinada"), sem dizer que o comprovante não conta. Só deixe de contar um comprovante se ele não tiver nada a ver com o item ou se eu disser que não vale. Se eu escrever o que considero válido, isso manda mais que a sua leitura do edital.

Esse texto aparece para o cliente no portal. Escreva simples e em tom positivo.

Responda só com ${provas.length > 1 ? "os blocos abaixo, um por prova" : "o bloco abaixo"}, preenchido, sem nada antes nem depois. Não use negrito nem tabela formatada. Não mude a primeira coluna (número do item) nem a ordem. Use vírgula decimal. Separe as colunas com " | " e os comprovantes com ";". Deixe vazio o que não tiver. Na linha "Nota", coloque a soma dos pontos.

${provas.map(bloco).join("\n\n")}

${provas.map(regras).filter(Boolean).join("\n\n")}`.trim();
}
function lerAnaliseColada(){
  const c = clienteSel(); const el = document.getElementById("anColar"); if (!c || !el) return;
  const prs = lerAnaliseTexto(el.value);
  if (!prs.length){ toast('Não achei o bloco "ANÁLISE MEDEASY" com os itens. Cole a resposta inteira do Claude'); return; }
  for (const pr of prs) guardarAnalise(c, pr);
  delete S.cont[c.id]; if (!c.triagem) aplicarAnalises(c); S.colarAn = false; render();
  toast(`${prs.length === 1 ? "Análise" : prs.length + " análises"} lida${prs.length === 1 ? "" : "s"}: ${prs.map(p => `${p.nome} ${d1(p.notaEstimada)} pontos`).join(", ")}`);
}
/* Análise fora do padrão MedEasy (cada mentor faz de um jeito): procura cada item da ficha da prova no texto e pega a nota,
   como no "Ler currículo pronto". Vira rascunho da contagem por item para o mentor conferir. */
async function analiseLivre(c, f){
  if (/\.json$/i.test(f.name) || typeof textoDoArquivo !== "function") return false;
  let txt; try { txt = await textoDoArquivo(f); } catch { return false; }
  const provas = (c.provas || []).filter(p => p.nome && itensDaProva(p).length); if (!provas.length) return false;
  const nomeNoTexto = p => kP(txt).includes(kP(p.nome));
  let melhor = null;
  for (const p of provas){ const itens = itensDaProva(p); const r = lerNotasDoCurriculo(txt, itens.map(i => ({ item:i.item, maxN:i.maxN })));
    const pontos = r.notas.length + (nomeNoTexto(p) ? 0.5 : 0); if (r.notas.length && (!melhor || pontos > melhor.pontos)) melhor = { p, itens, notas:r.notas, pontos }; }
  if (!melhor) return false;
  const { p, itens, notas } = melhor; const pk = kP(p.nome); const reg = carregarCont(c); const pr = (reg.provas[pk] ||= {});
  for (const n of notas){ const it = itens[n.idx]; if (!it) continue; const r = (pr[it.key] ||= { ...(it.base || {}) });
    if (it.unit){ const q = Math.round(n.pts / it.unit); r.n = q; r.pts = Math.abs(Math.min(it.maxN, q * it.unit) - n.pts) < 0.001 ? "" : n.pts; } else r.pts = n.pts;
    if (n.conferir) r.com = r.com || "Conferir: a análise só trazia um número neste item"; }
  if (!c.triagem) reg.rascunho = true; reg.copiado = false; gravarRasc(c.id); S.ciProva[c.id] = pk; render();
  toast(`Análise fora do padrão: li a nota de ${notas.length} de ${itens.length} itens de ${p.nome} (nota ${d1(calcDe(c, p).total)}). Confira em Certificados por item e salve. Para ler tudo (comprovantes e como aumentar), use "Copiar pedido para o Claude" e cole a resposta em "Colar análise"`);
  return true;
}
function analiseCard(c){
  const tudo = analisesDe(c); const ks = Object.keys(tudo);
  return `<section class="card"><div class="card-h"><div><h2>Análise curricular em arquivo</h2><div class="sub">O jeito mais fácil: "Copiar pedido para o Claude", e depois "Colar análise" com a resposta. Também entram o PDF da análise MedEasy, triagem.json e análise em outro formato (PDF ou Word)</div></div><div class="row" style="gap:6px"><button class="btn sm" data-a="anPedido" title="Copia o pedido com a ficha das provas do cliente para colar no Claude">Copiar pedido para o Claude</button><button class="btn sm ${S.colarAn ? "pri" : ""}" data-a="anColarAbrir">Colar análise</button><label class="btn sm pri" style="cursor:pointer">Importar arquivo<input type="file" accept=".pdf,.docx,.json,.txt,application/pdf,application/json,text/plain" hidden data-an="1"></label></div></div>
   ${S.colarAn ? `<div class="svc" style="margin-bottom:12px"><p class="small" style="margin:0 0 8px">1. Clique em "Copiar pedido para o Claude", cole no Claude e mande junto os certificados do cliente.<br>2. Copie a resposta inteira do Claude e cole aqui.</p><textarea class="in" id="anColar" rows="8" placeholder="ANÁLISE MEDEASY&#10;Cliente: ...&#10;Prova: ...&#10;Item | Nome | Pontos | Máximo | Comprovantes | Como aumentar&#10;..." style="font-family:var(--f-mono);font-size:12.5px"></textarea><div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="anColarLer">Ler análise</button><button class="btn sm ghost" data-a="anColarAbrir">Cancelar</button></div></div>` : ""}
   ${ks.length ? `<div class="list">${ks.map(k => { const pr = tudo[k]; const falta = (pr.itens || []).filter(i => i.ganho > 0).length; const nomeP = nomeDaAnalise(pr); return `<div class="li" style="flex-wrap:wrap"><div class="grow"><div class="t">${esc(nomeP)} ${esc(pr.ano || "")}${pr.area ? ` <span class="pill">${esc(pr.area)}</span>` : ""}</div>${pr.titulo && kP(pr.titulo) !== kP(nomeP) ? `<div class="xs muted">${esc(pr.titulo)}</div>` : ""}${!provaConhecida(nomeP) ? `<label class="row xs gold" style="gap:6px;margin:4px 0">Não reconheci a prova. É de qual? <select class="in" data-anprova="1" data-k="${k}" style="width:auto;padding:4px 8px;font-size:12px"><option value="">Escolher</option>${PROVAS.map(p => `<option>${esc(p.nome)}</option>`).join("")}</select></label>` : ""}<div class="small muted">${d1(pr.notaEstimada)} / ${d1(pr.notaMax)}${pr.notaPossivel !== "" && pr.notaPossivel != null ? ` · possível ${d1(pr.notaPossivel)}` : ""} · ${pr.itens.length} itens · ${falta} com espaço para crescer${pr.em ? " · lida em " + dBR(new Date(pr.em).toISOString()) : ""}${pr.arquivo ? ` · ${esc(pr.arquivo)}` : ""}</div></div><button class="btn sm danger" data-a="apagarAnalise" data-v="${k}" title="Tira esta análise do site">Remover PDF</button>
     <details style="width:100%;margin-top:6px"><summary class="small" style="cursor:pointer;font-weight:600">Ver o que foi analisado</summary><div class="stack" style="gap:8px;margin-top:8px">${(pr.itens || []).map(i => `<div class="svc" style="padding:10px 12px"><div class="row between" style="gap:8px"><b class="small">${esc(i.nome)}</b><span class="row" style="gap:6px">${i.situacao ? `<span class="pill ${/complet/i.test(i.situacao) ? "ok" : /parcial/i.test(i.situacao) ? "info" : /aumentar/i.test(i.situacao) ? "gold" : ""}">${esc(i.situacao)}</span>` : ""}<b class="num">${d1(i.pontos)} / ${d1(i.max)}</b></span></div>${i.regra ? `<div class="xs muted">${esc(i.regra)}</div>` : ""}${i.ganho > 0 ? `<div class="xs gold">Pode ganhar mais ${d1(i.ganho)}</div>` : ""}${(i.comprovantes || []).length ? `<ul class="xs" style="margin:6px 0 0;padding-left:18px">${i.comprovantes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${i.comentario ? `<p class="xs" style="margin:6px 0 0">${esc(i.comentario)}</p>` : ""}</div>`).join("")}</div></details></div>`; }).join("")}</div>
   ${ks.length > 1 ? `<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-a="apagarAnalises">Remover todas as ${ks.length} análises</button></div>` : ""}
   <p class="xs muted" style="margin:10px 0 0">${c.triagem ? (typeof triNoNotion === "function" && triNoNotion() ? "Fica guardada junto com a triagem, também no Notion." : "Fica guardada junto com a triagem neste navegador.") : "Fica só neste navegador. Para o cliente ver no portal dele e a equipe toda ver, anexe o mesmo PDF na coluna Análise do cliente no Notion. Na próxima sincronização entra para todos."}</p>` : `<div class="empty">Nenhuma análise importada${c.provas.some(p => p.fonte === "analise" && !ks.length) ? ". As provas abaixo já vieram com análise do Notion" : ""}</div>`}</section>`;
}

/* ---------- Nota e pendências: o mentor digita, o Claude só ajuda a escrever ----------
   Fica no controle do cliente (ct.notas[prova]) e vai para o Notion junto com ele. As pendências viram pendências do cliente.
   O orçamento usa os certificados válidos digitados aqui. O site não calcula nem interpreta a nota. */
function notasDe(c){ const ct = ctrlDe(c); return ct.notas || (ct.notas = {}); }
const maxPadrao = (c, p) => num(p.edital && p.edital.maximo) || calcDe(c, p).max || "";
const numTxt = v => v === "" || v == null ? "" : String(v).replace(".", ",");
function notaRasc(c, p){
  const pk = kP(p.nome); const r = ((S.notaRasc ||= {})[c.id] ||= {});
  if (!r[pk]){ const n = notasDe(c)[pk];
    r[pk] = n ? { nota:numTxt(n.nota), max:numTxt(n.max), possivel:numTxt(n.possivel), recado:n.recado || "", pend:(n.pend || []).join("\n") }
      : { nota:"", max:numTxt(maxPadrao(c, p)), possivel:"", recado:"", pend:"" }; }
  return r[pk];
}
function notaInput(el){ const c = clienteSel(); if (!c) return; const p = (c.provas || []).find(x => kP(x.nome) === el.dataset.nota); if (p) notaRasc(c, p)[el.dataset.k] = el.value; }
function notaCard(c){
  const provas = (c.provas || []).filter(p => p.nome); const salvo = notasDe(c);
  const cab = `<div class="card-h"><div><h2>Nota e pendências</h2><div class="sub">Você preenche a nota. O Claude só ajuda a escrever o recado e as pendências.</div></div>${provas.length ? `<div class="row" style="gap:6px"><button class="btn sm" data-a="notaPedido" title="Copia um pedido curto para colar no Claude junto com os certificados">Copiar pedido para o Claude</button><button class="btn sm ${S.colarNota ? "pri" : ""}" data-a="notaColarAbrir">Colar resposta</button></div>` : ""}</div>`;
  if (!provas.length) return `<section class="card" id="notaCard">${cab}<div class="empty">Marque as provas do cliente primeiro</div></section>`;
  return `<section class="card" id="notaCard">${cab}
   ${S.colarNota ? `<div class="svc" style="margin-bottom:12px"><p class="small" style="margin:0 0 8px">Cole a resposta inteira do Claude. O site preenche os campos abaixo e você confere antes de salvar. O que ele não entender fica vazio para você digitar.</p><textarea class="in" id="notaColar" rows="6" placeholder="NOTA MEDEASY&#10;Prova: ...&#10;Nota: 8 de 10&#10;..."></textarea><div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="notaColarLer">Preencher os campos</button><button class="btn sm ghost" data-a="notaColarAbrir">Fechar</button></div></div>` : ""}
   <div class="stack" style="gap:12px">${provas.map(p => { const pk = kP(p.nome); const r = notaRasc(c, p); const s = salvo[pk];
     const campo = (k, rot, w, ph) => `<label class="f" style="width:${w};margin:0"><span>${rot}</span><input class="in" data-nota="${pk}" data-k="${k}" value="${esc(r[k] ?? "")}" inputmode="decimal" placeholder="${ph || ""}"></label>`;
     return `<div class="svc"><div class="row between"><b>${esc(p.nome)} ${esc(p.ano || "")}</b>${s ? `<span class="pill ok">Salvo${s.em ? " em " + dBR(new Date(s.em).toISOString()) : ""}</span>` : `<span class="pill">Ainda sem nota</span>`}</div>
       <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:flex-end">${campo("nota", "Nota", "80px", "8")}${campo("max", "de", "80px", "10")}${campo("possivel", "Possível", "90px", "8,5")}</div>
       <label class="f" style="margin:8px 0 0"><span>Pendências do cliente (uma por linha)</span><textarea class="in" rows="3" data-nota="${pk}" data-k="pend" placeholder="Declaração de conclusão da liga de cardiologia">${esc(r.pend || "")}</textarea></label>
       <label class="f" style="margin:8px 0 0"><span>Recado para o cliente</span><textarea class="in" rows="2" data-nota="${pk}" data-k="recado" placeholder="Sua nota hoje é 8 de 10. Se aceitarem a monitoria de 2021, vai para 8,5.">${esc(r.recado || "")}</textarea></label></div>`; }).join("")}</div>
   <div class="row" style="margin-top:12px;align-items:center"><button class="btn sm pri" data-a="notaSalvar">${!c.triagem && typeof temPonte === "function" && temPonte() ? "Salvar no Notion" : "Salvar"}</button><span class="xs muted">O cliente vê a nota, o recado e as pendências no portal.</span></div></section>`;
}
/* Pendências da nota: cada linha vira uma pendência do cliente. As resolvidas ficam no histórico. */
function sincPendNota(ct, p, linhas){
  const pk = kP(p.nome), orig = "nota:" + pk; const ja = ct.pend.filter(x => x.origem === orig);
  const novas = linhas.filter(l => !ja.some(x => x.texto === l)).map(l => ({ id:novoIdC(), data:hoje(), edital:pk, item:p.nome, texto:l, quem:"Cliente", situacao:"Aberta", resposta:"", origem:orig }));
  ct.pend = [...novas, ...ct.pend.filter(x => x.origem !== orig || linhas.includes(x.texto) || x.situacao === "Resolvida")];
}
async function salvarNotas(){
  const c = clienteSel(); if (!c) return; const ct = ctrlDe(c); const notas = notasDe(c); const erros = []; const prontas = [];
  for (const p of (c.provas || []).filter(p => p.nome)){
    const pk = kP(p.nome); const r = ((S.notaRasc || {})[c.id] || {})[pk]; if (!r) continue;
    const vz = k => r[k] == null || String(r[k]).trim() === ""; const n = k => vz(k) ? "" : num(r[k]);
    const nm = { nota:n("nota"), max:n("max"), possivel:n("possivel"), recado:String(r.recado || "").trim(),
      pend:String(r.pend || "").split("\n").map(l => l.replace(/^\s*(?:[-•*▪◦]|\d{1,2}[.)])\s*/, "").trim()).filter(l => l && !/^nenhuma\.?$/i.test(l)) };
    if (nm.nota !== "" && nm.max === "") erros.push(`${p.nome}: falta o máximo da nota`);
    if (nm.max !== "" && nm.nota !== "" && nm.nota > nm.max) erros.push(`${p.nome}: a nota passa do máximo`);
    if (nm.max !== "" && nm.possivel !== "" && nm.possivel > nm.max) erros.push(`${p.nome}: a nota possível passa do máximo`);
    if (nm.nota !== "" && nm.possivel !== "" && nm.possivel < nm.nota) erros.push(`${p.nome}: a nota possível é menor que a nota`);
    prontas.push({ p, pk, nm, vazio:nm.nota === "" && nm.possivel === "" && !nm.recado && !nm.pend.length });
  }
  if (erros.length){ toast(erros.join(". ")); return; }
  if (!prontas.length){ toast("Nada para salvar"); return; }
  for (const x of prontas){ if (x.vazio) delete notas[x.pk]; else notas[x.pk] = { ...x.nm, em:Date.now() }; sincPendNota(ct, x.p, x.vazio ? [] : x.nm.pend); }
  delete S.notaRasc[c.id]; salvarCtrl(c); render();
  if (!c.triagem && typeof temPonte === "function" && temPonte() && paginaDoCliente(c)){
    try { await salvarNotion(paginaDoCliente(c), { "Controle de certificados":textoCtrl(ct) }, "Nota salva no Notion. O cliente vê no portal na próxima sincronização"); ct.notion = textoCtrl(ct); c.controle = JSON.parse(ct.notion); salvarCtrl(c); }
    catch (e) { toast("A nota ficou neste navegador, mas não gravou no Notion: " + e.message); }
  } else toast(c.triagem ? "Nota salva na triagem" : "Nota salva neste navegador. Sem a ponte, use Copiar controle para o Notion");
}
/* Pedido curto para o Claude: só a nota, o recado e as pendências. O orçamento não passa pelo Claude: vem do orçamento enviado ao cliente. */
function pedidoNota(c){
  const provas = (c.provas || []).filter(p => p.nome);
  const regras = p => { const it = itensDaProva(p); return it.length ? `Como pontua cada item da ${p.nome}:\n` + it.map(i => `${i.item}: ${i.pontos || "ver edital"} (máximo ${String(i.maxN).replace(".", ",")})`).join("\n") : `A ficha da ${p.nome} não está no site: use o edital que vou mandar.`; };
  return `Preciso da nota curricular de um cliente da MedEasy. Vou mandar os certificados dele${provas.some(p => !itensDaProva(p).length) ? " e o edital" : ""}.

Quem decide o que vale é o mentor da MedEasy. Conte como válido todo comprovante que eu mandar, no item em que ele se encaixa. Não tire ponto por detalhe de formato, como falta de assinatura, carimbo, QR code, papel timbrado, carga horária ou data. O que estiver em dúvida entra na nota possível, não some. Se eu escrever o que considero válido, isso manda mais que a sua leitura do edital.

O recado e as pendências aparecem para o cliente. Escreva simples e em tom positivo.

Responda só com ${provas.length > 1 ? "um bloco por prova" : "o bloco abaixo"}, preenchido, sem nada antes nem depois. Use vírgula decimal.

${provas.map(p => { const mx = maxPadrao(c, p); return `NOTA MEDEASY
Prova: ${p.nome}
Nota: (pontos que ele faz hoje) de ${mx ? numTxt(mx) : "(máximo do edital)"}
Possível: (nota se aceitarem os comprovantes em dúvida, ou igual à nota)
Recado: (2 ou 3 frases para o cliente com a nota e o que pode fazer ela subir)
Pendências:
- (uma por linha: o que o cliente precisa mandar ou resolver. Se não tiver, escreva Nenhuma)`; }).join("\n\n")}

${provas.map(regras).join("\n\n")}`.trim();
}
/* Lê a resposta do Claude. Só preenche os campos que achar. Aceita negrito, títulos e "8/10" ou "8 de 10". */
function lerNotaTexto(txt, c){
  const limpo = String(txt || "").replace(/\r/g, "").replace(/\*\*|__|`/g, "").replace(/^\s*#+\s*/gm, "");
  let blocos = limpo.split(/^\s*NOTA MEDEASY\s*:?\s*$/im).slice(1); if (!blocos.length) blocos = [limpo];
  const provas = (c.provas || []).filter(p => p.nome); const out = [];
  const ROT = /^(prova|nota|nota atual|possivel|nota possivel|maximo|nota maxima|certificados|certificados validos|artigos?|recado|pendencias)\s*:/;
  const numDe = s => (String(s || "").match(/\d+(?:[.,]\d+)?/) || [])[0];
  for (const b of blocos){
    const ls = b.split("\n"); const rot = l => (semAcento(l).trim().match(ROT) || [])[1] || "";
    const campo = (...nomes) => { const l = ls.find(l => nomes.includes(rot(l))); return l == null ? null : l.slice(l.indexOf(":") + 1).trim(); };
    const provaTxt = campo("prova"); const kp = provaTxt ? kP(provaTxt.replace(/\s*20\d\d.*$/, "")) : "";
    const p = kp ? provas.find(x => kp.startsWith(kP(x.nome)) || kP(x.nome).startsWith(kp)) : provas.length === 1 ? provas[0] : null;
    if (!p) continue;
    const r = {}; const nota = campo("nota", "nota atual");
    if (nota != null){ const m = nota.match(/(\d+(?:[.,]\d+)?)\s*(?:de|\/|em)\s*(\d+(?:[.,]\d+)?)/i); if (m){ r.nota = m[1]; r.max = m[2]; } else if (numDe(nota)) r.nota = numDe(nota); }
    const mx = campo("maximo", "nota maxima"); if (numDe(mx)) r.max = numDe(mx);
    const pos = campo("possivel", "nota possivel"); if (numDe(pos)) r.possivel = numDe(pos);
    // Recado: da linha "Recado:" até o próximo rótulo. Pendências: as linhas depois de "Pendências:".
    const iR = ls.findIndex(l => rot(l) === "recado");
    if (iR >= 0){ const partes = [ls[iR].slice(ls[iR].indexOf(":") + 1)]; for (const l of ls.slice(iR + 1)){ if (rot(l)) break; partes.push(l); } const t = partes.join(" ").replace(/\s+/g, " ").trim(); if (t) r.recado = t; }
    const iP = ls.findIndex(l => rot(l) === "pendencias");
    if (iP >= 0){ const linhas = [ls[iP].slice(ls[iP].indexOf(":") + 1), ...ls.slice(iP + 1)]; const pend = [];
      for (const l of linhas){ if (rot(l) && rot(l) !== "pendencias") break; const t = l.replace(/^\s*(?:[-•*▪◦]|\d{1,2}[.)])\s*/, "").trim(); if (t && !/^nenhuma\.?$/i.test(t)) pend.push(t); }
      r.pend = pend.join("\n"); }
    if (Object.keys(r).length) out.push({ p, r });
  }
  return out;
}
function lerNotaColada(){
  const c = clienteSel(); const el = document.getElementById("notaColar"); if (!c || !el) return;
  const res = lerNotaTexto(el.value, c);
  if (!res.length){ toast("Não achei a nota na resposta. Preencha os campos à mão"); return; }
  for (const { p, r } of res) Object.assign(notaRasc(c, p), r);
  S.colarNota = false; render();
  toast(`Preenchi ${res.map(x => x.p.nome).join(", ")}. Confira os campos e clique em Salvar`);
}
