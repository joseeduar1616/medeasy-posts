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
function lerTriagemJson(j){
  return { nome:j.sigla || j.prova || "Prova", ano:(String(j.prova || j.edital || "").match(/20\d\d/) || [""])[0], area:j.area || "", cliente:j.cliente || "", notaEstimada:numA(j.nota_total), notaPossivel:j.nota_possivel ? numA(j.nota_possivel) : "", notaMax:(j.itens || []).reduce((a, i) => a + numA(i.maximo), 0), prazoEnvio:isoDeA(j.envio && j.envio.prazo) || (j.envio && j.envio.prazo) || "",
    regras:[j.envio?.formato, j.envio?.tamanho_max ? "até " + j.envio.tamanho_max : "", j.envio?.ordem].filter(Boolean).join(". "),
    itens:(j.itens || []).map(i => ({ n:i.n, nome:`${i.n ? i.n + ". " : ""}${i.titulo || "Item"}`, situacao:i.situacao || "", regra:i.regra || "", max:numA(i.maximo), porAtividade:numA(i.por_atividade), pontos:numA(i.nota), ganho:numA(i.ganho_possivel), comprovantes:(i.certificados || []).filter(c => !c.reserva).map(c => [c.evento, [c.data, c.ch].filter(Boolean).join(", ")].filter(Boolean).join(" (") + (c.data || c.ch ? ")" : "")), comentario:i.risco || "" })), fonte:"triagem" };
}
async function lerArquivoAnaliseSite(arquivo){
  if (/\.json$/i.test(arquivo.name)) return lerTriagemJson(JSON.parse(await arquivo.text()));
  const pr = lerTextoAnalise(await textoDoPdf(arquivo));
  if (!pr.itens.length) throw new Error("Não achei os itens nesse PDF. Ele precisa ser a análise curricular MedEasy, com um card por item e a pontuação de cada um");
  return pr;
}
/* Guardar: cliente do Notion fica neste navegador, triagem fica no registro dela */
const anKey = id => "medeasy-analise-" + id;
function analisesDe(c){ if (c.triagem) return c.triagem.analises || {}; try { return JSON.parse(localStorage.getItem(anKey(c.id)) || "{}"); } catch { return {}; } }
/* Nome da prova da análise: reconhece pelo título, mesmo nas análises guardadas antes dessa correção */
const nomeDaAnalise = pr => pr.provaEscolhida || provaDoTitulo([pr.titulo, pr.nome].filter(Boolean).join(" ")) || pr.nome;
const provaConhecida = nome => PROVAS.some(p => kP(p.nome) === kP(nome));
/* O mentor diz de qual prova é a análise quando o PDF não deixa claro */
function escolherProvaAnalise(el){
  const c = clienteSel(); const tudo = analisesDe(c); const pr = tudo[el.dataset.k]; if (!pr || !el.value) return;
  delete tudo[el.dataset.k]; pr.provaEscolhida = el.value; pr.titulo = pr.titulo || pr.nome; pr.nome = el.value; tudo[kP(el.value)] = pr;
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; if (!(t.provas || []).includes(PROVAS.find(p => p.nome === el.value)?.k)) t.provas = [...(t.provas || []), PROVAS.find(p => p.nome === el.value).k]; salvarTri(t); }
  else { try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch {} c.provas = (c.provas || []).filter(p => !(p.fonte === "analise" && String(p.id).startsWith("a"))); aplicarAnalises(c); }
  delete S.cont[c.id]; render(); toast(`Análise ligada à prova ${el.value}`);
}
function guardarAnalise(c, pr){
  pr = { ...pr, nome:nomeDaAnalise(pr) }; const k = kP(pr.nome); const tudo = analisesDe(c); tudo[k] = { ...pr, em:Date.now() };
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; if (!(t.provas || []).some(x => kP(nomeProva(x)).startsWith(k) || k.startsWith(kP(nomeProva(x))))){ const p = PROVAS.find(p => k.startsWith(p.k) || kP(p.nome).startsWith(k)); if (p){ t.provas = [...(t.provas || []), p.k]; t.provasDaAnalise = [...(t.provasDaAnalise || []), p.k]; } } salvarTri(t); }
  else { try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch { toast("Não consegui guardar neste navegador"); } }
}
/* Remove a análise (o PDF lançado). Na triagem, tira também a prova que a análise tinha marcado sozinha. */
function apagarAnalise(c, k){
  const tudo = analisesDe(c); const pr = tudo[k]; if (!pr) return; const nome = nomeDaAnalise(pr); delete tudo[k];
  const aindaUsa = Object.values(tudo).some(x => kP(nomeDaAnalise(x)) === kP(nome));
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; const pk = (PROVAS.find(p => kP(p.nome) === kP(nome)) || {}).k;
    if (pk && !aindaUsa && (t.provasDaAnalise || []).includes(pk)){ t.provas = (t.provas || []).filter(x => x !== pk); t.provasDaAnalise = t.provasDaAnalise.filter(x => x !== pk); }
    salvarTri(t); }
  else { try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch {}
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
  return `<section class="card"><div class="card-h"><div><h2>Análise curricular em arquivo</h2><div class="sub">PDF da análise MedEasy ou triagem.json. Análise em outro formato (PDF ou Word) também entra: o site procura a nota de cada item da ficha</div></div><label class="btn sm pri" style="cursor:pointer">Importar arquivo<input type="file" accept=".pdf,.docx,.json,application/pdf,application/json" hidden data-an="1"></label></div>
   ${ks.length ? `<div class="list">${ks.map(k => { const pr = tudo[k]; const falta = (pr.itens || []).filter(i => i.ganho > 0).length; const nomeP = nomeDaAnalise(pr); return `<div class="li" style="flex-wrap:wrap"><div class="grow"><div class="t">${esc(nomeP)} ${esc(pr.ano || "")}${pr.area ? ` <span class="pill">${esc(pr.area)}</span>` : ""}</div>${pr.titulo && kP(pr.titulo) !== kP(nomeP) ? `<div class="xs muted">${esc(pr.titulo)}</div>` : ""}${!provaConhecida(nomeP) ? `<label class="row xs gold" style="gap:6px;margin:4px 0">Não reconheci a prova. É de qual? <select class="in" data-anprova="1" data-k="${k}" style="width:auto;padding:4px 8px;font-size:12px"><option value="">Escolher</option>${PROVAS.map(p => `<option>${esc(p.nome)}</option>`).join("")}</select></label>` : ""}<div class="small muted">${d1(pr.notaEstimada)} / ${d1(pr.notaMax)}${pr.notaPossivel !== "" && pr.notaPossivel != null ? ` · possível ${d1(pr.notaPossivel)}` : ""} · ${pr.itens.length} itens · ${falta} com espaço para crescer${pr.em ? " · lida em " + dBR(new Date(pr.em).toISOString()) : ""}${pr.arquivo ? ` · ${esc(pr.arquivo)}` : ""}</div></div><button class="btn sm danger" data-a="apagarAnalise" data-v="${k}" title="Tira esta análise do site">Remover PDF</button>
     <details style="width:100%;margin-top:6px"><summary class="small" style="cursor:pointer;font-weight:600">Ver o que foi analisado</summary><div class="stack" style="gap:8px;margin-top:8px">${(pr.itens || []).map(i => `<div class="svc" style="padding:10px 12px"><div class="row between" style="gap:8px"><b class="small">${esc(i.nome)}</b><span class="row" style="gap:6px">${i.situacao ? `<span class="pill ${/complet/i.test(i.situacao) ? "ok" : /parcial/i.test(i.situacao) ? "info" : /aumentar/i.test(i.situacao) ? "gold" : ""}">${esc(i.situacao)}</span>` : ""}<b class="num">${d1(i.pontos)} / ${d1(i.max)}</b></span></div>${i.regra ? `<div class="xs muted">${esc(i.regra)}</div>` : ""}${i.ganho > 0 ? `<div class="xs gold">Pode ganhar mais ${d1(i.ganho)}</div>` : ""}${(i.comprovantes || []).length ? `<ul class="xs" style="margin:6px 0 0;padding-left:18px">${i.comprovantes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${i.comentario ? `<p class="xs" style="margin:6px 0 0">${esc(i.comentario)}</p>` : ""}</div>`).join("")}</div></details></div>`; }).join("")}</div>
   ${ks.length > 1 ? `<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-a="apagarAnalises">Remover todas as ${ks.length} análises</button></div>` : ""}
   <p class="xs muted" style="margin:10px 0 0">${c.triagem ? (typeof triNoNotion === "function" && triNoNotion() ? "Fica guardada junto com a triagem, também no Notion." : "Fica guardada junto com a triagem neste navegador.") : "Fica só neste navegador. Para o cliente ver no portal dele e a equipe toda ver, anexe o mesmo PDF na coluna Análise do cliente no Notion. Na próxima sincronização entra para todos."}</p>` : `<div class="empty">Nenhuma análise importada${c.provas.some(p => p.fonte === "analise" && !ks.length) ? ". As provas abaixo já vieram com análise do Notion" : ""}</div>`}</section>`;
}
