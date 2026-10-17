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
const ROTULO_A = /^\s*([+-]?\d+(?:,\d+)?)\s+(PONTUAÇÃO MÁXIMA|POR ATIVIDADE|PONTUAÇÃO PESSOAL|GANHO POSSÍVEL)\b/;
function lerTextoAnalise(texto){
  const linhas = texto.replace(/\f/g, "\n").split("\n").filter(l => !/^\s*MEDEASY ANÁLISE CURRICULAR/i.test(l));
  const corpo = linhas.join("\n"); const naoVazias = linhas.map(l => l.trim()).filter(Boolean);
  const sigla = naoVazias[0] || "", subtitulo = naoVazias[1] || "";
  const iNome = naoVazias.findIndex(l => /^análise curricular$/i.test(l)); const cliente = iNome >= 0 ? naoVazias[iNome + 1] || "" : "";
  const nota = corpo.match(/(\d+(?:,\d+)?)\s*\/\s*(\d+(?:,\d+)?)\s*\n\s*PONTUAÇÃO ESTIMADA/i);
  let possivel = null; { const iP = linhas.findIndex(l => /POSSÍVEL ATÉ\s*\d{2}\/\d{2}\/\d{4}/i.test(l)); if (iP >= 0){ const data = linhas[iP].match(/POSSÍVEL ATÉ\s*(\d{2}\/\d{2}\/\d{4})/i)[1]; for (let i = iP - 1; i >= Math.max(0, iP - 6); i--){ const m = linhas[i].trim().match(/^(\d+(?:,\d+)?)$/); if (m){ possivel = [null, m[1], data]; break; } } if (!possivel) possivel = [null, "", data]; } }
  const regras = (corpo.match(/Regras do edital que você precisa saber\s*\n([\s\S]*?)(?=\n\s*ITEM \d+\s|\n{3,})/i) || [])[1];
  const anoM = (sigla + " " + subtitulo).match(/20\d\d/) || corpo.match(/ANÁLISE CURRICULAR\s+\S+\s+(20\d\d)/i);
  const itens = []; const partes = corpo.split(/\n(?=\s*ITEM \d+\s)/).slice(1);
  for (const parte of partes){
    const cab = parte.match(/^\s*ITEM (\d+)\s+(.*)$/m); if (!cab) continue;
    const [antes, depois = ""] = parte.split(/\n\s*Análise curricular\s+COMPROVANTES NO CURRÍCULO/i);
    const topo = antes.split("\n").slice(1).map(l => l.trim()).filter(Boolean);
    let t = 1; const tit = [topo[0] || ""]; while (t < topo.length && /^[a-zà-ú(]/.test(topo[t])){ tit.push(topo[t]); t++; }
    const regra = limpaA(topo.slice(t).join(" "));
    let [lista, coment = ""] = depois.split(/\n\s*Comentário:\s*/i); coment = coment.split(/\n\s*\n/)[0];
    const v = { max:0, porAtividade:0, pontos:0, ganho:0 }; const comprovantes = []; let atual = null;
    for (const l of (lista || "").split("\n").slice(1)){
      let resto = l; const r = l.match(ROTULO_A);
      if (r){ v[{ "PONTUAÇÃO MÁXIMA":"max", "POR ATIVIDADE":"porAtividade", "PONTUAÇÃO PESSOAL":"pontos", "GANHO POSSÍVEL":"ganho" }[r[2]]] = numA(r[1]); resto = l.slice(r[0].length); }
      const s = resto.trim(); if (!s) continue; const m = s.match(/^(\d+)\.\s+(.*)$/);
      if (m){ atual = m[2]; comprovantes.push(atual); } else if (atual !== null) comprovantes[comprovantes.length - 1] += " " + s;
    }
    itens.push({ n:+cab[1], nome:`${cab[1]}. ${limpaA(tit.join(" "))}`, situacao:limpaA(cab[2]), regra, max:v.max, porAtividade:v.porAtividade, pontos:v.pontos, ganho:v.ganho, comprovantes:comprovantes.map(limpaA), comentario:limpaA(coment) });
  }
  return { nome:sigla.replace(/\s*20\d\d\s*$/, ""), ano:anoM ? (anoM[1] || anoM[0]) : "", area:subtitulo, cliente, notaEstimada:nota ? numA(nota[1]) : itens.reduce((a, i) => a + i.pontos, 0), notaMax:nota ? numA(nota[2]) : itens.reduce((a, i) => a + i.max, 0), notaPossivel:possivel && possivel[1] ? numA(possivel[1]) : "", prazoEnvio:possivel ? isoDeA(possivel[2]) : "", regras:regras ? limpaA(regras) : "", itens, fonte:"analise" };
}
function lerTriagemJson(j){
  return { nome:j.sigla || j.prova || "Prova", ano:(String(j.prova || j.edital || "").match(/20\d\d/) || [""])[0], area:j.area || "", cliente:j.cliente || "", notaEstimada:numA(j.nota_total), notaPossivel:j.nota_possivel ? numA(j.nota_possivel) : "", notaMax:(j.itens || []).reduce((a, i) => a + numA(i.maximo), 0), prazoEnvio:isoDeA(j.envio && j.envio.prazo) || (j.envio && j.envio.prazo) || "",
    regras:[j.envio?.formato, j.envio?.tamanho_max ? "até " + j.envio.tamanho_max : "", j.envio?.ordem].filter(Boolean).join(". "),
    itens:(j.itens || []).map(i => ({ n:i.n, nome:`${i.n ? i.n + ". " : ""}${i.titulo || "Item"}`, situacao:i.situacao || "", regra:i.regra || "", max:numA(i.maximo), porAtividade:numA(i.por_atividade), pontos:numA(i.nota), ganho:numA(i.ganho_possivel), comprovantes:(i.certificados || []).filter(c => !c.reserva).map(c => [c.evento, [c.data, c.ch].filter(Boolean).join(", ")].filter(Boolean).join(" (") + (c.data || c.ch ? ")" : "")), comentario:i.risco || "" })), fonte:"triagem" };
}
async function lerArquivoAnaliseSite(arquivo){
  if (/\.json$/i.test(arquivo.name)) return lerTriagemJson(JSON.parse(await arquivo.text()));
  const pr = lerTextoAnalise(await textoDoPdf(arquivo));
  if (!pr.itens.length) throw new Error("Não achei os itens nesse PDF. Ele precisa ser a análise curricular MedEasy, com ITEM 1, ITEM 2 e assim por diante");
  return pr;
}
/* Guardar: cliente do Notion fica neste navegador, triagem fica no registro dela */
const anKey = id => "medeasy-analise-" + id;
function analisesDe(c){ if (c.triagem) return c.triagem.analises || {}; try { return JSON.parse(localStorage.getItem(anKey(c.id)) || "{}"); } catch { return {}; } }
function guardarAnalise(c, pr){
  const k = kP(pr.nome); const tudo = analisesDe(c); tudo[k] = { ...pr, em:Date.now() };
  if (c.triagem){ const t = triDe(c.id); t.analises = tudo; if (!(t.provas || []).some(x => kP(nomeProva(x)).startsWith(k) || k.startsWith(kP(nomeProva(x))))){ const p = PROVAS.find(p => k.startsWith(p.k) || kP(p.nome).startsWith(k)); if (p) t.provas = [...(t.provas || []), p.k]; } salvarTri(t); }
  else { try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch { toast("Não consegui guardar neste navegador"); } }
}
function apagarAnalise(c, k){ const tudo = analisesDe(c); delete tudo[k]; if (c.triagem){ const t = triDe(c.id); t.analises = tudo; salvarTri(t); } else try { localStorage.setItem(anKey(c.id), JSON.stringify(tudo)); } catch {} }
/* Junta as análises guardadas nas provas do cliente (mesma regra do build: casa pelo começo da sigla) */
function aplicarAnalises(c){
  const tudo = analisesDe(c); if (!Object.keys(tudo).length) return c;
  c.provas = c.provas || [];
  for (const [k, pr] of Object.entries(tudo)){
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
  try { const pr = await lerArquivoAnaliseSite(f); guardarAnalise(c, pr); delete S.cont[c.id]; if (!c.triagem) aplicarAnalises(c); render(); toast(`Análise ${pr.nome} lida: ${d1(pr.notaEstimada)} pontos em ${pr.itens.length} itens`); }
  catch (e) { toast(e.message || "Não consegui ler o arquivo"); }
}
function analiseCard(c){
  const tudo = analisesDe(c); const ks = Object.keys(tudo);
  return `<section class="card"><div class="card-h"><div><h2>Análise curricular em arquivo</h2><div class="sub">PDF da análise MedEasy ou triagem.json. O site lê a nota, os itens, o que falta e como conseguir</div></div><label class="btn sm pri" style="cursor:pointer">Importar arquivo<input type="file" accept=".pdf,.json,application/pdf,application/json" hidden data-an="1"></label></div>
   ${ks.length ? `<div class="list">${ks.map(k => { const pr = tudo[k]; const falta = (pr.itens || []).filter(i => i.ganho > 0).length; return `<div class="li"><div class="grow"><div class="t">${esc(pr.nome)} ${esc(pr.ano || "")}</div><div class="small muted">${d1(pr.notaEstimada)} / ${d1(pr.notaMax)}${pr.notaPossivel !== "" && pr.notaPossivel != null ? ` · possível ${d1(pr.notaPossivel)}` : ""} · ${pr.itens.length} itens · ${falta} com espaço para crescer${pr.em ? " · lida em " + dBR(new Date(pr.em).toISOString()) : ""}</div></div><button class="btn sm ghost" data-a="apagarAnalise" data-v="${k}">Tirar</button></div>`; }).join("")}</div>
   <p class="xs muted" style="margin:10px 0 0">${c.triagem ? "Fica guardada junto com a triagem neste navegador." : "Fica só neste navegador. Para o cliente ver no portal dele e a equipe toda ver, anexe o mesmo PDF na coluna Análise do cliente no Notion. Na próxima sincronização entra para todos."}</p>` : `<div class="empty">Nenhuma análise importada${c.provas.some(p => p.fonte === "analise" && !ks.length) ? ". As provas abaixo já vieram com análise do Notion" : ""}</div>`}</section>`;
}
