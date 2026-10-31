/* ---------- ficha do edital pelo PDF e leitura do currículo pronto ---------- */
/* Leitor das tabelas: vem de scripts/portal/leitor-ficha.mjs na montagem */
__LEITOR_FICHA__
const JSZIP_URL = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
let _jszip = null;
async function jszip(){
  if (_jszip) return _jszip;
  await new Promise((ok, erro) => { const s = document.createElement("script"); s.src = JSZIP_URL; s.onload = ok; s.onerror = () => erro(new Error("Não consegui carregar o leitor de Word. Tente o PDF")); document.head.appendChild(s); });
  return _jszip = window.JSZip;
}
/* Word: parágrafos viram linhas e cada linha de tabela vira uma linha com as células separadas por espaços */
async function textoDoDocx(arquivo){
  const Z = await jszip(); const zip = await Z.loadAsync(await arquivo.arrayBuffer()); const doc = zip.file("word/document.xml"); if (!doc) throw new Error("Esse arquivo não parece um Word (.docx)");
  const x = new DOMParser().parseFromString(await doc.async("string"), "application/xml"); const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const txt = el => [...el.getElementsByTagNameNS(W, "t")].map(t => t.textContent).join("");
  const linhas = []; const body = x.getElementsByTagNameNS(W, "body")[0];
  const andar = el => { for (const f of el.children){ if (f.localName === "p") linhas.push(txt(f)); else if (f.localName === "tbl"){ for (const tr of f.children) if (tr.localName === "tr") linhas.push([...tr.children].filter(c => c.localName === "tc").map(c => [...c.children].filter(p => p.localName === "p").map(txt).join(" ").trim()).join("     ")); } else if (f.localName === "sdt") andar(f.getElementsByTagNameNS(W, "sdtContent")[0] || f); } };
  if (body) andar(body);
  return linhas.join("\n");
}
/* Currículo pronto em blocos, na ordem do documento: { texto, certs, ref }. certs = imagens grandes (o certificado).
   O logo do cabeçalho e o QR code do verso são pequenos e não contam. Página só de texto que parece certificado conta como 1. */
const PARECE_CERT = /certific|declara|atesta|participou|concluiu|apresentou/i;
async function blocosDoPdf(arquivo){
  const lib = await pdfjs(); const doc = await lib.getDocument({ data:await arquivo.arrayBuffer() }).promise; const O = lib.OPS;
  const textos = (await textoDoPdf(arquivo)).split("\f").map(t => t.trim());
  const mult = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const IMG = new Set([O.paintImageXObject, O.paintJpegXObject, O.paintInlineImageXObject, O.paintImageXObjectRepeat].filter(x => x != null));
  const blocos = [];
  for (let n = 1; n <= doc.numPages; n++){
    const pg = await doc.getPage(n); const vp = pg.getViewport({ scale:1 }); const area = vp.width * vp.height; const ops = await pg.getOperatorList();
    let m = [1, 0, 0, 1, 0, 0], grandes = 0; const pilha = [];
    for (let i = 0; i < ops.fnArray.length; i++){ const f = ops.fnArray[i];
      if (f === O.save) pilha.push(m); else if (f === O.restore) m = pilha.pop() || [1, 0, 0, 1, 0, 0]; else if (f === O.transform) m = mult(m, ops.argsArray[i]);
      else if (IMG.has(f) && Math.hypot(m[0], m[1]) * Math.hypot(m[2], m[3]) > area * 0.12) grandes++; }
    const texto = textos[n - 1] || "";
    blocos.push({ texto, certs:grandes, certsTexto:!grandes && texto.length > 80 && PARECE_CERT.test(texto) ? 1 : 0, ref:"página " + n });
  }
  return blocos;
}
async function blocosDoDocx(arquivo){
  const Z = await jszip(); const zip = await Z.loadAsync(await arquivo.arrayBuffer()); const doc = zip.file("word/document.xml"); if (!doc) throw new Error("Esse arquivo não parece um Word (.docx)");
  const x = new DOMParser().parseFromString(await doc.async("string"), "application/xml"); const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const txt = el => [...el.getElementsByTagNameNS(W, "t")].map(t => t.textContent).join("");
  // Imagem grande: mais de 12% de uma folha A4 (em EMU)
  const grandes = el => [...el.getElementsByTagName("*")].filter(e => e.localName === "extent" && e.parentNode && /inline|anchor/.test(e.parentNode.localName)).filter(e => Number(e.getAttribute("cx")) * Number(e.getAttribute("cy")) > 7560000 * 10692000 * 0.12).length;
  const blocos = []; const body = x.getElementsByTagNameNS(W, "body")[0]; let k = 0;
  for (const f of body ? body.children : []){ k++;
    if (f.localName === "p") blocos.push({ texto:txt(f), certs:grandes(f), ref:"parágrafo " + k });
    else if (f.localName === "tbl") blocos.push({ texto:[...f.getElementsByTagNameNS(W, "tr")].map(tr => txt(tr)).join("\n"), certs:grandes(f), ref:"tabela " + k }); }
  return blocos;
}
async function textoDoArquivo(f){
  if (/\.docx$/i.test(f.name)) return textoDoDocx(f);
  if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) return textoDoPdf(f);
  throw new Error("Use um PDF ou um Word (.docx)");
}

/* Fichas montadas pelo mentor: ficam no controle do cliente (vai para o Notion) ou na triagem. O build espalha para os outros clientes da prova. */
function fichasDe(c){ if (c.triagem) return c.triagem.fichas || {}; return ctrlDe(c).fichas || {}; }
function aplicarFichas(c){
  if (!c) return c; const fs = fichasDe(c);
  for (const p of c.provas || []){ const f = p.nome && fs[kP(p.nome)]; if (f && (f.ficha || []).length && !(p.edital && p.edital.fichaPropria && p.edital.fichaEm === f.em)) p.edital = { ...(p.edital || { nome:p.nome }), ficha:f.ficha, maximo:f.maximo || (p.edital && p.edital.maximo) || null, fichaFonte:f.fonte || "Ficha montada pelo mentor", fichaPropria:true, fichaEm:f.em }; }
  return c;
}
async function guardarFicha(c, pk, nome, ficha, fonte, maximo){
  const f = { prova:nome, ficha, fonte, maximo:maximo || null, em:Date.now() };
  if (c.triagem){ const t = triDe(c.id); (t.fichas ||= {})[pk] = f; salvarTri(t); (c.triagem.fichas ||= {})[pk] = f; }
  else {
    const ct = ctrlDe(c); (ct.fichas ||= {})[pk] = f; salvarCtrl(c);
    if (typeof temPonte === "function" && temPonte() && paginaDoCliente(c)){
      try { await salvarNotion(paginaDoCliente(c), { "Controle de certificados":textoCtrl(ct) }, "Ficha salva no Notion. O cliente vê a nota na próxima sincronização"); ct.notion = textoCtrl(ct); c.controle = JSON.parse(ct.notion); salvarCtrl(c); }
      catch (e) { toast("A ficha ficou neste navegador, mas não gravou no Notion: " + e.message); }
    } else toast("Ficha guardada neste navegador. Use Copiar controle para o Notion para a equipe e o cliente verem");
  }
  delete S.cont[c.id]; aplicarFichas(c);
}
/* Prova aberta no cartão Certificados por item */
function provaSelCI(c){ const provas = (c.provas || []).filter(p => p.nome); if (!provas.length) return null; const pk = S.ciProva[c.id] && provas.some(p => kP(p.nome) === S.ciProva[c.id]) ? S.ciProva[c.id] : kP(provas[0].nome); return provas.find(p => kP(p.nome) === pk); }

/* Editor da ficha */
function fichaEditorView(c, p){
  const ed = S.fichaEd; if (!ed || ed.cid !== c.id || ed.pk !== kP(p.nome)) return "";
  const inp = (attrs, v, ph, w) => `<input class="in" ${attrs} value="${esc(v ?? "")}" placeholder="${esc(ph || "")}" style="padding:5px 8px;font-size:13px;width:${w}">`;
  const soma = ed.rows.reduce((a, r) => a + num(r.maxN), 0);
  return `<div class="svc" style="margin-bottom:12px"><div class="row between"><b>Ficha de ${esc(p.nome)}</b><span class="xs muted">${ed.rows.length} itens · soma ${d1(soma)}${ed.maximo ? ` · teto ${d1(ed.maximo)}` : ""}</span></div>
   <p class="xs muted" style="margin:4px 0 8px">${esc(ed.fonte || "")} Confira cada linha com o edital antes de salvar. Item que conta por certificado: preencha "por certificado". Item por faixa ou nota (histórico, ENADE): deixe vazio e o mentor digita os pontos.</p>
   <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Como pontua</th><th class="r">Por certificado</th><th class="r">Máximo</th><th></th></tr></thead><tbody>
   ${ed.rows.map((r, i) => `<tr><td style="min-width:180px">${inp(`data-fe="item" data-i="${i}"`, r.item, "1. Monitoria", "100%")}</td><td style="min-width:160px">${inp(`data-fe="pontos" data-i="${i}"`, r.pontos, "0,25 por semestre", "100%")}</td><td class="r">${inp(`data-fe="unit" data-i="${i}" type="number" step="0.01" min="0" inputmode="decimal"`, r.unit ?? "", "–", "84px")}</td><td class="r">${inp(`data-fe="maxN" data-i="${i}" type="number" step="0.01" min="0" inputmode="decimal"`, r.maxN ?? "", "0", "84px")}</td><td><button class="btn sm ghost" data-a="feTirar" data-i="${i}" title="Tirar o item">×</button></td></tr>`).join("")}
   </tbody></table></div>
   <div class="row between" style="margin-top:8px;gap:8px"><button class="btn sm" data-a="feLinha">+ Item</button><label class="row small" style="gap:6px">Teto da prova ${inp(`data-fe="maximo"`, ed.maximo ?? "", "sem teto", "90px")}</label></div>
   <div class="row" style="margin-top:10px"><button class="btn sm pri" data-a="feSalvar">Salvar ficha</button><button class="btn sm ghost" data-a="feCancelar">Cancelar</button></div></div>`;
}
function feInput(el){
  const ed = S.fichaEd; if (!ed) return; const k = el.dataset.fe;
  if (k === "maximo"){ ed.maximo = el.value === "" ? null : num(el.value); return; }
  const r = ed.rows[+el.dataset.i]; if (!r) return;
  if (k === "unit" || k === "maxN") r[k] = el.value === "" ? null : num(el.value); else r[k] = el.value;
  if (k === "item") r.artigo = /artigo|cap[ií]tulo|publica[cç]/i.test(el.value);
}
/* Botões da ficha no cartão Certificados por item */
function fichaAcoesView(c, p, itens){
  const doc = `<label class="btn sm" style="cursor:pointer" title="PDF ou Word do currículo pronto, com a ficha de pontuação preenchida">Ler currículo pronto<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden data-curr="1"></label>`;
  if (!itens.length) return `<div class="wait small" style="margin-bottom:12px"><b>${esc(p.nome)} ainda não tem a ficha de pontos no site.</b> Mande o PDF do edital que o site monta a ficha. Depois disso a nota aparece para você e para o cliente.
    <div class="row" style="margin-top:8px"><label class="btn sm pri" style="cursor:pointer">Ler PDF do edital<input type="file" accept=".pdf,.docx,application/pdf" hidden data-edital="1"></label><button class="btn sm" data-a="feNova">Montar à mão</button>${doc}</div></div>`;
  if (p.fonte === "analise") return `<div class="row" style="margin-bottom:10px">${doc}</div>`;
  return `<div class="row" style="margin-bottom:10px;gap:6px"><span class="xs muted">${p.edital && p.edital.fichaPropria ? "Ficha montada pelo mentor" : "Ficha do edital no site"}</span><button class="btn sm ghost" data-a="feEditar">Editar ficha</button><label class="btn sm ghost" style="cursor:pointer">Trocar pelo PDF do edital<input type="file" accept=".pdf,.docx,application/pdf" hidden data-edital="1"></label>${doc}</div>`;
}
const ESQ_FICHA = { type:"OBJECT", required:["itens"], properties:{ maximo:ESQ_NUM, itens:{ type:"ARRAY", items:{ type:"OBJECT", required:["item", "maxN"], properties:{ item:ESQ_TXT, pontos:ESQ_TXT, maxN:ESQ_NUM, unit:ESQ_NUM } } } } };
async function fichaGemini(f){
  const j = await geminiLer([f], `Este é o edital de uma prova de residência médica. Ache a tabela de pontuação da análise curricular (currículo) e devolva cada item: em "item", o número ou a letra do edital e um nome curto (por exemplo "3 Monitoria" ou "E1 Artigo indexado com JCR"), em "pontos" a regra em texto curto, em "maxN" a pontuação máxima do item e em "unit" quanto vale cada certificado ou atividade (0 quando o item não é por contagem). Em "maximo", a nota máxima do currículo. Use ponto como separador decimal. Copie os números do edital, não invente.`, ESQ_FICHA, { aviso:"Lendo o edital com o Gemini" });
  const ficha = (j.itens || []).filter(x => x && x.item && num(x.maxN) > 0).map(x => ({ item:String(x.item).trim(), pontos:String(x.pontos || "").trim(), maxN:num(x.maxN), unit:num(x.unit) > 0 ? num(x.unit) : null }));
  return { ficha, maximo:num(j.maximo) || null, gemini:true };
}
async function lerEditalArquivo(input){
  const c = clienteSel(); const f = input.files && input.files[0]; input.value = ""; if (!c || !f) return; const p = provaSelCI(c); if (!p) return;
  toast("Lendo o edital");
  try {
    let r = null;
    if (await temGemini()){ try { r = await fichaGemini(f); if (!r.ficha.length) r = null; } catch (e) { toast("O Gemini não leu o edital (" + e.message + "). Tentando a leitura do site"); } }
    if (!r) r = lerFichaDoEdital(await textoDoArquivo(f));
    S.fichaEd = { cid:c.id, pk:kP(p.nome), nome:p.nome, rows:r.ficha.length ? r.ficha : [{ item:"", pontos:"", unit:null, maxN:null }], maximo:r.maximo, arquivo:f.name,
      fonte:r.ficha.length ? `Lida${r.gemini ? " pelo Gemini" : ""} do arquivo ${f.name}: ${r.ficha.length} itens${r.maximo ? `, teto ${d1(r.maximo)}` : ""}.` : `Não achei a tabela de pontos em ${f.name}. Monte à mão olhando o edital.` };
    render(); toast(r.ficha.length ? `${r.ficha.length} itens lidos. Confira e salve a ficha` : "Não achei a tabela de pontos nesse arquivo. Monte à mão");
  } catch (e) { toast(e.message || "Não consegui ler o arquivo"); }
}
/* Currículo pronto pelo Gemini: a nota de cada item da ficha e os certificados anexados nele */
const esqCv = () => ({ type:"OBJECT", required:["itens"], properties:{ notaTotal:ESQ_NUM, itens:{ type:"ARRAY", items:{ type:"OBJECT", required:["indice"], properties:{ indice:{ type:"INTEGER" }, nota:ESQ_NUM,
  certificados:{ type:"ARRAY", items:{ type:"OBJECT", required:["desc"], properties:{ desc:ESQ_TXT, tipo:{ type:"STRING", enum:TIPOS_CERT }, ano:ESQ_TXT, ch:ESQ_TXT, pagina:{ type:"INTEGER" } } } } } } } } });
async function curriculoGemini(f, p, itens){
  const j = await geminiLer([f], `Este é um currículo pronto (Vitae) de um candidato a residência médica, com a ficha de pontuação preenchida e os certificados anexados depois do título de cada item. A ficha da prova ${p.nome} tem estes itens:\n${itens.map((i, k) => `${k + 1}) ${i.item} (máximo ${String(i.maxN).replace(".", ",")})`).join("\n")}\n\nPara cada item da lista, devolva o índice (o número da lista acima), a nota que o currículo dá ao item na ficha preenchida (deixe vazio se não tiver) e os certificados anexados nesse item, cada um com uma descrição curta, o tipo, o ano, a carga horária em horas e a página. Ignore a capa, o Lattes, os documentos pessoais e a página da ficha. Em notaTotal, a nota total da ficha. Use ponto como separador decimal. Não invente.`, esqCv(), { aviso:"Lendo o currículo com o Gemini" });
  const notas = [], porItem = {}; let total = 0;
  for (const x of j.itens || []){ const idx = (x.indice | 0) - 1; if (!itens[idx]) continue;
    if (x.nota != null && x.nota !== "") notas.push({ idx, pts:Math.min(itens[idx].maxN, num(x.nota)) });
    const cs = (x.certificados || []).filter(c => c && c.desc); if (cs.length){ porItem[idx] = cs.map((c, k) => ({ cert:c, ref:c.pagina ? "p." + c.pagina : "certificado " + (k + 1) })); total += cs.length; } }
  return { notas, cv:{ porItem, total, fora:0 }, total:j.notaTotal != null ? num(j.notaTotal) : null };
}
/* Currículo pronto: lê a ficha preenchida (última coluna é a nota do candidato) e vira a contagem por item, como rascunho */
async function lerCurriculoArquivo(input){
  let c = clienteSel(); const f = input.files && input.files[0]; input.value = ""; if (!c || !f) return; let p = provaSelCI(c); if (!p) return; const pk = kP(p.nome);
  toast("Lendo o currículo");
  try {
    let itens = itensDaProva(p); let notas, total = null; let cvGemini = null;
    if (itens.length && await temGemini()){ try { const g = await curriculoGemini(f, p, itens); if (g.notas.length || g.cv.total){ notas = g.notas; total = g.total; cvGemini = g.cv; } } catch (e) { toast("O Gemini não leu o currículo (" + e.message + "). Tentando a leitura do site"); } }
    const txt = cvGemini ? "" : await textoDoArquivo(f);
    if (!itens.length){
      const r = fichaDoCurriculo(txt); if (!r.ficha.length) throw new Error("Não achei a ficha de pontuação preenchida nesse currículo");
      await guardarFicha(c, pk, p.nome, r.ficha, `Tirada da ficha do currículo ${f.name}`, null);
      c = clienteSel(); p = (c.provas || []).find(x => kP(x.nome) === pk); itens = itensDaProva(p); notas = r.notas;
    } else if (!cvGemini){ const r = lerNotasDoCurriculo(txt, itens.map(i => ({ item:i.item, maxN:i.maxN }))); notas = r.notas; total = r.total; }
    // Certificados do currículo: quantos vêm depois do título de cada item
    let cv = cvGemini || { porItem:{}, total:0, fora:0 };
    if (!cvGemini) try { const blocos = /\.docx$/i.test(f.name) ? await blocosDoDocx(f) : await blocosDoPdf(f); cv = certificadosDoCurriculo(blocos, itens.map(i => ({ item:i.item }))); } catch (e) { console.warn(e); }
    if (!notas.length && !cv.total) throw new Error("Não achei as notas nem os certificados dos itens nesse currículo");
    const reg = carregarCont(c); const pr = (reg.provas[pk] ||= {});
    for (const n of notas){ const it = itens[n.idx]; if (!it) continue; const r = (pr[it.key] ||= { ...(it.base || {}) });
      if (it.unit){ const q = Math.round(n.pts / it.unit); r.n = q; r.pts = Math.abs(Math.min(it.maxN, q * it.unit) - n.pts) < 0.001 ? "" : n.pts; } else r.pts = n.pts;
      if (n.conferir) r.com = r.com || "Conferir: o currículo só trazia um número neste item"; }
    if (cv.total){
      // Controle: troca os certificados lidos antes do currículo desta prova pelos de agora, cada um ligado ao seu item
      const ct = ctrlDe(c); const origem = "curriculo:" + pk; const velhos = new Set(ct.certs.filter(x => x.origem === origem).map(x => x.id));
      ct.certs = ct.certs.filter(x => !velhos.has(x.id)); for (const key of Object.keys(ct.aloc[pk] || {})) ct.aloc[pk][key] = ct.aloc[pk][key].filter(a => !velhos.has(a.id));
      for (const [idx, lista] of Object.entries(cv.porItem)){ const it = itens[idx]; if (!it) continue; const titulo = it.item.replace(/^\s*\d{1,2}[a-z]?[.)]?\s*/i, "");
        lista.forEach((x, k) => { const base = x.cert ? { id:novoIdC(), desc:String(x.cert.desc).trim().slice(0, 140), tipo:TIPOS_CERT.includes(x.cert.tipo) ? x.cert.tipo : "Outro", ano:String(x.cert.ano || "").replace(/\D/g, "").slice(0, 4), ch:String(x.cert.ch || "").replace(/\D/g, "").slice(0, 4), obs:"", arquivo:`${f.name} (${x.ref})` } : x.texto ? certDoTexto(x.texto, `${f.name} (${x.ref})`) : { id:novoIdC(), desc:`${titulo}: certificado ${k + 1}`, tipo:(TIPO_POR_TEXTO.find(([re]) => re.test(titulo)) || [0, "Outro"])[1], ano:"", ch:"", obs:"Lido do currículo pronto, conferir", arquivo:`${f.name} (${x.ref})` };
          base.origem = origem; ct.certs.push(base); alocDe(ct, pk, it.key).push({ id:base.id, estado:"pontua" }); });
        // Contagem: o número de certificados do item. Se a nota da ficha for outra (algum não vale), ela fica como pontos.
        const r = (pr[it.key] ||= { ...(it.base || {}) }); const nota = notas.find(n => n.idx === +idx);
        if (it.unit){ r.n = lista.length; r.pts = nota && Math.abs(Math.min(it.maxN, lista.length * it.unit) - nota.pts) > 0.001 ? nota.pts : ""; }
        else r.n = lista.length; } // item sem valor por certificado: os pontos vêm da ficha, e o número entra no orçamento
      salvarCtrl(c);
    }
    if (!c.triagem) reg.rascunho = true; reg.copiado = false; gravarRasc(c.id); S.ciProva[c.id] = pk; render();
    const cp = calcDe(c, p);
    if (cv.total) toast(`Currículo lido: ${cv.total} certificados em ${Object.keys(cv.porItem).length} itens, nota ${d1(cp.total)}. Eles entraram no Controle de certificados e na contagem por item. Confira e salve no Notion`); else
    toast(`Currículo lido: ${notas.length} de ${itens.length} itens, nota ${d1(cp.total)}${total != null && Math.abs(total - cp.total) > 0.01 ? ` (o currículo diz ${d1(total)}, confira os tetos)` : ""}. Nos itens por certificado entrou o mínimo de certificados para chegar na nota. Ajuste a quantidade e salve`);
  } catch (e) { toast(e.message || "Não consegui ler o currículo"); }
}
const A_FICHA = {
  feNova: () => { const c = clienteSel(); const p = provaSelCI(c); S.fichaEd = { cid:c.id, pk:kP(p.nome), nome:p.nome, rows:[{ item:"1. ", pontos:"", unit:null, maxN:null }], maximo:null, fonte:"Ficha montada à mão." }; render(); },
  feEditar: () => { const c = clienteSel(); const p = provaSelCI(c); const fic = (p.edital && p.edital.ficha) || []; S.fichaEd = { cid:c.id, pk:kP(p.nome), nome:p.nome, rows:fic.map(x => ({ ...x })), maximo:(p.edital && p.edital.maximo) || null, fonte:p.edital && p.edital.fichaFonte ? `Hoje: ${p.edital.fichaFonte}.` : "" }; render(); },
  feLinha: () => { const ed = S.fichaEd; if (!ed) return; ed.rows.push({ item:`${ed.rows.length + 1}. `, pontos:"", unit:null, maxN:null }); render(); },
  feTirar: el => { const ed = S.fichaEd; if (!ed) return; ed.rows.splice(+el.dataset.i, 1); render(); },
  feCancelar: () => { S.fichaEd = null; render(); },
  feSalvar: async () => {
    const ed = S.fichaEd; const c = clienteSel(); if (!ed || !c) return;
    const rows = ed.rows.map(r => ({ item:String(r.item || "").trim(), pontos:String(r.pontos || "").trim(), maxN:num(r.maxN), unit:r.unit == null || r.unit === "" || !num(r.unit) ? null : num(r.unit), artigo:/artigo|cap[ií]tulo|publica[cç]/i.test(r.item || "") })).filter(r => r.item && r.item.replace(/^[\w.]+\.?\s*/, "") && r.maxN > 0);
    if (!rows.length){ toast("Preencha pelo menos um item com o máximo"); return; }
    const fonte = ed.arquivo ? `PDF do edital (${ed.arquivo}), conferido no portal em ${dBR(isoLocal())}` : `Montada no portal em ${dBR(isoLocal())}`;
    await guardarFicha(c, ed.pk, ed.nome, rows, fonte, ed.maximo); S.fichaEd = null; render();
    if (c.triagem) toast("Ficha salva. A nota já aparece aqui");
  },
};
