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
async function lerArquivoAnaliseSite(arquivo){
  if (/\.json$/i.test(arquivo.name)) return lerTriagemJson(JSON.parse(await arquivo.text()));
  if (/\.txt$/i.test(arquivo.name)){ const prs = lerAnaliseTexto(await arquivo.text()); if (!prs.length) throw new Error("Esse texto não está no formato ANÁLISE MEDEASY"); return prs[0]; }
  const pr = lerTextoAnalise(await textoDoPdf(arquivo));
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
  try { const pr = await lerArquivoAnaliseSite(f); pr.arquivo = f.name; guardarAnalise(c, pr); delete S.cont[c.id]; if (!c.triagem) aplicarAnalises(c); render(); toast(`Análise ${pr.nome} lida: ${d1(pr.notaEstimada)} pontos em ${pr.itens.length} itens`); }
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
function lerAnaliseTexto(txt){
  const blocos = String(txt || "").replace(/\r/g, "").replace(/\*\*/g, "").split(/^\s*#*\s*AN[AÁ]LISE MEDEASY\s*$/im).slice(1);
  const out = [];
  for (const b of blocos){
    const ls = b.split("\n").map(l => l.trim()).filter(Boolean);
    const campo = rot => { const l = ls.find(l => new RegExp("^" + rot + "\\s*:", "i").test(semAcento(l))); return l ? l.slice(l.indexOf(":") + 1).trim() : ""; };
    const provaTxt = campo("prova"); if (!provaTxt) continue;
    const nome = (typeof provaDoTitulo === "function" && provaDoTitulo(provaTxt)) || provaTxt.replace(/\s*20\d\d.*$/, "").trim();
    const ed = typeof editalJS === "function" ? editalJS(nome) : null; const ficha = ((ed && ed.ficha) || []).filter(x => x.maxN != null);
    const itens = [];
    for (const l of ls){
      if ((l.match(/\|/g) || []).length < 3) continue;
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
  toast(`Análise fora do padrão: li a nota de ${notas.length} de ${itens.length} itens de ${p.nome} (nota ${d1(calcDe(c, p).total)}). Confira em Certificados por item e salve`);
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
