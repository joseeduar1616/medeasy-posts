/* ---------- triagem: cliente novo, orçamento e PDFs ---------- */
/* PROVAS vem de editais.json na montagem do site (só nome e chave, nada de cliente) */
const PROVAS = __PROVAS__;
const TRI_KEY = "medeasy-triagem";
const SERVICOS_TRI = { vitae:"Currículo Vitae/currículo com certificados comprovados + análise curricular", analise:"Só a análise curricular", lattes:"Currículo Vitae/currículo com certificados comprovados + análise + Lattes", lattesb:"Lattes com documento de comprovação", naosei:"Ainda não sei" };
const ANO = "2027";
/* Formulário do Notion que recebe os PDFs dos certificados (base "Triagem MedEasy"). Vazio enquanto não for compartilhado */
const FORM_CERT = "__FORM_CERT__";

function lerTri(){ try { return JSON.parse(localStorage.getItem(TRI_KEY) || "[]"); } catch { return []; } }
function gravarTri(lista){ try { localStorage.setItem(TRI_KEY, JSON.stringify(lista)); } catch { toast("Não consegui gravar neste navegador"); } }
const triDe = id => lerTri().find(t => t.id === id);
function salvarTri(t, semNotion){ if (!semNotion) t.salvoEm = Date.now(); const l = lerTri(); const i = l.findIndex(x => x.id === t.id); if (i >= 0) l[i] = t; else l.unshift(t); gravarTri(l); if (!semNotion) agendarTriNotion(t); }

/* ---------- triagem no Notion (base "Triagem MedEasy"), pela ponte ---------- */
/* Cada mudança vai para o Notion uns segundos depois. Os dados do site inteiros vão na coluna "Dados do site",
   e o build devolve para os outros aparelhos. Sem a ponte, fica só neste navegador. */
const idDeUrl = u => { const m = String(u || "").split("?")[0].replace(/-/g, "").match(/[0-9a-f]{32}$/i); return m ? m[0].toLowerCase() : ""; };
const _triTimer = {}; const _triFila = {};
const triNoNotion = () => typeof temPonte === "function" && temPonte();
function agendarTriNotion(t){
  if (!triNoNotion() || !String(t.nome || "").trim()) return;
  clearTimeout(_triTimer[t.id]); (S.triSync ||= {})[t.id] = "pendente"; mostrarSyncTri(t.id);
  _triTimer[t.id] = setTimeout(() => { _triFila[t.id] = (_triFila[t.id] || Promise.resolve()).then(() => enviarTriNotion(t.id)); }, 2500);
}
function propsTriagemNotion(t){
  const ops = opcoesTri(t); const todas = provasTri(t);
  const daLista = todas.filter(k => PROVAS.some(p => p.k === k)).map(nomeProva); const fora = todas.filter(k => !PROVAS.some(p => p.k === k));
  const drive = (String(t.links || "").match(/https?:\/\/\S+/) || [""])[0];
  return { "Nome":t.nome || "Sem nome", "WhatsApp":t.whats || "", "Especialidade":t.area || "", "Pedido":t.pedido || "", "Observações":t.obs || "", "Outras provas":fora.join(", "), "Drive":drive,
    "Mentor":t.mentor || S.mentor?.nome || "", "Provas":daLista, "Certificados":t.nCert === "" || t.nCert == null ? null : num(t.nCert), "Situação":(ETAPAS_TRI[t.etapa] || ETAPAS_TRI.novo)[0],
    "Serviço":[SERVICOS_TRI[t.servico] || "", t.mentoria ? "Mentoria mensal" : "", t.mentoriaInd ? "Mentoria individual" : ""].filter(Boolean).join(" + "), "Valor do orçamento":ops[0] ? ops[0].total : null, "Dados do site":JSON.stringify(t) };
}
async function enviarTriNotion(id){
  const t = triDe(id); if (!t || !triNoNotion()) return;
  if (!t.mentor && S.mentor) t.mentor = S.mentor.nome;
  S.triSync[id] = "gravando"; mostrarSyncTri(id);
  try {
    const j = await pontePedido("/triagem", { id:t.notionId || idDeUrl(t.notion), props:propsTriagemNotion(t) });
    const t2 = triDe(id); if (t2){ t2.notionId = String(j.id || "").replace(/-/g, ""); t2.notion = j.url || t2.notion; t2.mentor = t2.mentor || t.mentor; t2.noNotionEm = Date.now(); salvarTri(t2, true); }
    S.triSync[id] = "ok";
  } catch (e) { S.triSync[id] = "erro:" + e.message; }
  mostrarSyncTri(id);
  // O valor do cliente vai mesmo se a gravação da triagem falhar
  const t3 = triDe(id); if (t3) await valorClienteAutomatico(t3);
}
function syncTriTexto(id){
  const t = triDe(id); const s = (S.triSync || {})[id];
  if (!triNoNotion()) return `<span class="pill">Só neste navegador</span>`;
  if (s === "pendente" || s === "gravando") return `<span class="pill gold">Gravando no Notion</span>`;
  if (s && s.startsWith("erro:")) return `<span class="pill" title="${esc(s.slice(5))}" style="color:var(--bad,#ff6b6b)">Não gravou no Notion</span>`;
  if (t && (t.notionId || t.notion)) return `<a class="pill ok" href="${esc(t.notion || "#")}" target="_blank" rel="noopener">Salvo no Notion</a>`;
  return `<span class="pill">Ainda não está no Notion</span>`;
}
function mostrarSyncTri(id){ const el = document.getElementById("triSync"); if (el && S.sel === id) el.innerHTML = syncTriTexto(id); }
/* Depois do login: traz as triagens gravadas no Notion por outros aparelhos. Fica a versão mais nova. */
function juntarTriagemNotion(){
  const locais = lerTri(); let mudou = false;
  for (const n of S.eq?.triagem || []){ if (!n.dados || !n.dados.id) continue;
    const dono = n.dados.mentor || n.mentor || "";
    if (!S.admin && dono && semAcento(dono).split(" ")[0] !== semAcento(S.mentor?.nome || "").split(" ")[0]) continue;
    const i = locais.findIndex(t => t.id === n.dados.id || (t.notionId && t.notionId === n.id));
    const vindo = { ...n.dados, notionId:n.id, notion:n.url };
    if (i < 0){ locais.push(vindo); mudou = true; }
    else if ((n.dados.salvoEm || 0) > (locais[i].salvoEm || 0)){ locais[i] = vindo; mudou = true; } }
  if (mudou) gravarTri(locais);
  // O que ficou só neste navegador (feito antes da ponte) sobe agora
  if (triNoNotion()) for (const t of lerTri()) if (!t.notionId && String(t.nome || "").trim()) agendarTriNotion(t);
}
/* Cliente fechou: cria a linha no "Controle cliente" */
const SERVICO_NOTION = { vitae:"Vitae", analise:"ANALISE", lattes:"Lattes", certificados:"Certificados", mentoria:"Mentoria", mentoriaInd:"Mentoria individual" };
async function criarClienteNotion(){
  const t = triDe(S.sel); if (!t) return; const ops = opcoesTri(t);
  const letra = document.getElementById("triOpFechar")?.value || "A"; const o = ops.find(x => x.letra === letra) || ops[0];
  if (!String(t.nome || "").trim() || !t.whats){ toast("Preencha o nome e o WhatsApp antes"); return; }
  if (t.clienteNotion && !confirm("Esse cliente já foi criado no Notion. Criar outra linha?")) return;
  const c = clienteDaTriagem(t); const ct = ctrlDe(c);
  const tipos = (o?.tipos || tiposDe(t.servico)).map(x => SERVICO_NOTION[x]).filter(Boolean);
  const props = { "Cliente":t.nome.trim(), "Telefone":t.whats, "Tipo de serviço":[...tipos, ...c.provas.map(p => p.nome)], "Mentor":S.mentor?.nome || "", "Status":"Não iniciada", "Pagamento":"Não pago",
    "Valor total":o ? o.total : null, "Data de início ":isoLocal(), "Certificados por item":textoCont(c, carregarCont(c).provas) || "", "Controle de certificados":temCtrl(ct) ? textoCtrl(ct) : "" };
  toast("Criando o cliente no Notion");
  try { const j = await pontePedido("/cliente", { props }); t.clienteNotion = j.url; t.clienteNotionId = String(j.id || "").replace(/-/g, ""); t.valorNotion = o ? o.total : null; t.opcaoNotion = o ? o.letra : ""; t.etapa = "fechado"; salvarTri(t); render(); toast("Cliente criado no Notion. Entra no painel com o código de acesso em 1 ou 2 minutos"); }
  catch (e) { toast("Não criou: " + e.message); }
}
const novoIdTri = () => "t:" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
function editalJS(nome){ const E = S.eq?.editais || {}; const k = kP(nome); const e = Object.entries(E).find(([kk]) => k.startsWith(kk) || (kk.startsWith(k) && k.length >= 3)); return e ? e[1] : null; }
const nomeProva = k => (PROVAS.find(p => p.k === k) || {}).nome || k;
/* Provas digitadas fora da lista. Se o nome bate com uma da lista, vira ela. Senão fica com o nome digitado. */
const outrasDe = s => String(s || "").split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(x => { const k = kP(x); const p = PROVAS.find(p => p.k === k || kP(p.nome) === k); return p ? p.k : x; });
const provasTri = t => [...new Set([...(t.provas || []), ...outrasDe(t.outras)])];
const campoOutras = (v, ajuda) => `<label class="f"><span>Outras provas, fora da lista${ajuda ? " (separe por vírgula)" : ""}</span><input class="in" data-tri="outras" value="${esc(v || "")}" placeholder="Ex.: HC Ribeirão, SUS-BA"></label>`;
const tiposDe = s => ({ vitae:["vitae"], analise:["analise"], lattes:["vitae","lattes"], lattesb:["lattes","certificados"] })[s] || ["vitae"];
/* Cliente "de mentira" para reaproveitar a contagem por item e o cálculo do valor */
function clienteDaTriagem(t){
  const provas = provasTri(t).map((k, i) => { const e = editalJS(nomeProva(k)); return { id:"p" + i, nome:nomeProva(k), edital:e, prazoEnvio:e?.prazoEnvio || "", dataProva:e?.dataProva || "", link:e?.link || "" }; });
  const c = aplicarAnalises({ id:t.id, nome:t.nome || "Cliente novo", whatsapp:t.whats || "", provas, tipos:tiposDe(t.servico), nCert:t.nCert == null || t.nCert === "" ? null : num(t.nCert), nArtigos:0, servicos:[], contagem:{}, triagem:t });
  return typeof aplicarFichas === "function" ? aplicarFichas(c) : c;
}
const clienteSel = () => S.sel && String(S.sel).startsWith("t:") ? (triDe(S.sel) ? clienteDaTriagem(triDe(S.sel)) : null) : (typeof aplicarFichas === "function" ? aplicarFichas : x => x)((S.eq?.clientes || []).find(x => x.id === S.sel));

/* Mensagem que o cliente novo manda pelo WhatsApp. O código no fim serve para importar no painel. */
/* Código da triagem em base64 sem + / =, para caber num link */
function codigoTri(d){ return btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function lerCodigoTri(texto){ const m = String(texto || "").match(/(?:#triagem:|[?&]i=)([A-Za-z0-9+/=_-]+)/); if (!m) return null; try { const b = m[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch { return null; } }
const linkImportar = d => `${location.href.split("#")[0].split("?")[0]}?i=${codigoTri(d)}`;
function mensagemTri(d){
  return `Oi! Preenchi a triagem do portal da MedEasy\n\nNome: ${d.nome}\nWhatsApp: ${d.whats}\nProvas: ${provasTri(d).map(nomeProva).join(", ") || "ainda não sei"}\nEspecialidade: ${d.area || "não informada"}\nPedido: ${d.pedido || "não escreveu"}\nCertificados: ${d.nCert ? "uns " + d.nCert : "não contei"}\nDrive: ${d.links || "vou mandar os PDFs aqui"}\n${d.obs ? "Obs: " + d.obs + "\n" : ""}\nAbrir no painel: ${linkImportar(d)}`;
}
/* O site interpreta o pedido escrito pelo cliente: serviço e provas citadas. O mentor pode corrigir. */
const ALIAS_PROVA = { psu:"psugo", psugo:"psugo", sesgo:"sesgo", psumg:"psumg", usp:"uspsp", usprp:"usprp", ribeirao:"usprp", santacasa:"santacasasp", scmsp:"santacasasp", sirio:"siriolibanes", dante:"dante", puc:"puccamp", cet:"cet", fubog:"fubog", olhos:"fubog" };
function interpretarPedido(texto){
  const t = semAcento(texto); const k = kP(texto); const motivos = [];
  let servico = "vitae";
  const temLattes = /lattes/.test(t), temVitae = /vitae|curriculo|documento|montar|organiza/.test(t), soAnalise = /\b(so|apenas|somente)\b[^.]*analise|analise[^.]*\b(so|apenas|somente)\b|so quero saber|projecao|quanto (eu )?(faria|faco|pontuo)|quantos pontos/.test(t);
  if (temLattes && /comprova|documento/.test(t) && !temVitae) { servico = "lattesb"; motivos.push("citou Lattes com documento de comprovação"); }
  else if (temLattes) { servico = "lattes"; motivos.push("citou o Lattes"); }
  else if (soAnalise && !temVitae) { servico = "analise"; motivos.push("pediu só a análise ou a projeção da nota"); }
  else if (temVitae) motivos.push("citou currículo ou documento");
  else motivos.push("não citou o serviço, ficou o padrão Vitae + análise");
  const mentoria = /mentoria/.test(t) ? (/individual|avuls|uma (so )?vez|pontual/.test(t) ? "individual" : "mensal") : "";
  if (mentoria) motivos.push("citou mentoria" + (mentoria === "individual" ? " individual" : ""));
  const provas = new Set();
  for (const p of PROVAS){ if (k.includes(p.k) || k.includes(kP(p.nome))) provas.add(p.k); }
  const palavras = t.split(/[^a-z]+/);
  for (const [a, pk] of Object.entries(ALIAS_PROVA)){ if (palavras.includes(a) || (a.length > 4 && k.includes(a))) provas.add(pk); }
  // "psu mg" sozinho não é PSU-GO
  if (provas.has("psugo") && /psu\s?-?\s?mg/.test(t) && !/psu\s?-?\s?go|psugo/.test(t)) provas.delete("psugo");
  // "USP" sozinho é a USP-SP. Só vira USP-RP quando cita Ribeirão ou RP
  if (provas.has("usprp") && !/usp\s?-?\s?sp|uspsp|sao paulo/.test(t)) provas.delete("uspsp");
  if (/urgen|essa semana|amanha|hoje/.test(t)) motivos.push("parece ter pressa");
  return { servico, mentoria, provas:[...provas].filter(x => PROVAS.some(p => p.k === x)), motivos };
}
function triagemFormView(){
  const d = S.triForm || (S.triForm = { provas:[], servico:"vitae" });
  const chk = (k, nome) => `<label class="chk"><input type="checkbox" data-tri="prova" value="${k}" ${d.provas.includes(k) ? "checked" : ""}><span>${esc(nome)}</span></label>`;
  return `<header class="top"><div class="wrap top-in"><img class="logo" src="${LOGO}" alt=""><div class="brand"><b>MED<i>EASY</i></b><span>Triagem do currículo</span></div></div></header>
  <main class="wrap portal stack" style="gap:16px;max-width:720px">
    <section class="hero"><div><div class="label gold">Cliente novo</div><h1>Vamos ver o seu currículo</h1><p>Responda abaixo e envie. A mensagem abre no WhatsApp do mentor já com tudo preenchido. Depois é só mandar os PDFs dos certificados na mesma conversa.</p></div></section>
    <form id="fTri" class="card stack">
      <div class="grid2" style="gap:10px"><label class="f"><span>Seu nome completo</span><input class="in" data-tri="nome" value="${esc(d.nome || "")}" required autocomplete="name"></label>
      <label class="f"><span>Seu WhatsApp</span><input class="in" data-tri="whats" value="${esc(d.whats || "")}" required inputmode="tel" autocomplete="tel" placeholder="(62) 99999-9999"></label></div>
      <div class="f"><span>Para quais provas você vai enviar o currículo?</span><div class="chks">${PROVAS.map(p => chk(p.k, p.nome)).join("")}</div></div>
      ${campoOutras(d.outras, true)}
      <label class="f"><span>Especialidade pretendida</span><input class="in" data-tri="area" value="${esc(d.area || "")}" placeholder="Ex.: Clínica Médica"></label>
      <label class="f"><span>O que você precisa? Escreva com as suas palavras</span><textarea class="in" data-tri="pedido" rows="3" placeholder="Ex.: Quero o currículo pronto para a PSU-GO e saber quantos pontos eu faço. Também preciso atualizar o Lattes">${esc(d.pedido || "")}</textarea></label>
      <div class="grid2" style="gap:10px"><label class="f"><span>Quantos certificados você tem, mais ou menos?</span><input class="in" data-tri="nCert" type="number" min="0" inputmode="numeric" value="${esc(d.nCert || "")}" placeholder="Pode ser um chute"></label>
      <label class="f"><span>Link do Drive com os certificados (se tiver)</span><input class="in" data-tri="links" value="${esc(d.links || "")}" placeholder="https://drive.google.com/..."></label></div>
      <label class="f"><span>Alguma observação? Prazo apertado, certificado que ainda vai chegar, dúvida</span><textarea class="in" data-tri="obs" rows="2">${esc(d.obs || "")}</textarea></label>
      <p class="small muted" style="margin:0">O seu mentor olha os certificados e manda o orçamento pelo WhatsApp.</p>
      ${FORM_CERT ? `<div class="svc"><div class="label" style="margin-bottom:6px">Seus certificados</div><p class="small" style="margin:0 0 8px">Depois de enviar aqui, mande os PDFs dos certificados pelo formulário abaixo. Eles chegam direto para a equipe.</p><a class="btn sm" href="${FORM_CERT}" target="_blank" rel="noopener">Enviar certificados em PDF</a></div>` : `<p class="xs muted" style="margin:0">Os certificados em PDF você manda direto na conversa do WhatsApp, depois de enviar este formulário. Se estiverem no Drive, deixe o link com acesso para quem tem o link.</p>`}
      <button class="btn pri" type="submit">Enviar pelo WhatsApp</button>
    </form>
    <p class="xs faint" style="text-align:center">MedEasy · @med_easyy · Goiânia, Goiás</p>
  </main>`;
}
function enviarTriagem(){
  const d = S.triForm; if (!d.nome || !d.whats){ toast("Preencha o nome e o WhatsApp"); return; }
  if (!provasTri(d).length && !confirm("Você não marcou nenhuma prova. Enviar assim mesmo?")) return;
  const dest = S.triDestino || CONTATO.whats; d.em = Date.now(); delete d.servico;
  window.open(waLink(dest, mensagemTri(d)), "_blank");
}

/* ---------- aba Triagem do mentor ---------- */
const linkTriagem = () => { const m = (S.eq.mentores || []).find(x => x.nome === S.mentor.nome); const tel = soDigitos(m?.telefone || "") || CONTATO.whats; return `${location.href.split("#")[0].split("?")[0]}?triagem=${tel}`; };
function importarTri(texto){
  const d = lerCodigoTri(texto); if (!d){ toast("Não achei o código #triagem na mensagem"); return; }
  const it = interpretarPedido(d.pedido || "");
  const t = { id:novoIdTri(), em:d.em || Date.now(), nome:(d.nome || "").trim(), whats:d.whats || "", area:(d.area || "").trim(), provas:[...new Set([...(d.provas || []), ...it.provas])].filter(k => PROVAS.some(p => p.k === k)), outras:d.outras || "", servico:SERVICOS_TRI[d.servico] && d.servico !== "naosei" ? d.servico : it.servico, pedido:d.pedido || "", motivos:it.motivos, mentoria:it.mentoria === "mensal", mentoriaInd:it.mentoria === "individual", nCert:d.nCert || "", links:d.links || "", obs:d.obs || "", cont:{}, etapa:"novo" };
  // Mesmo link aberto duas vezes não duplica o cliente
  const igual = lerTri().find(x => x.nome === t.nome && x.whats === t.whats && x.em === t.em); if (igual) t.id = igual.id, t.cont = igual.cont, t.etapa = igual.etapa;
  salvarTri(t); S.sel = t.id; S.view = "triagemItem"; render(); toast(igual ? "Esse cliente já estava na triagem" : "Cliente importado");
}
function novaTri(){ const t = { id:novoIdTri(), em:Date.now(), nome:"", whats:"", area:"", provas:[], servico:"vitae", nCert:"", links:"", obs:"", cont:{}, etapa:"novo" }; salvarTri(t); S.sel = t.id; S.view = "triagemItem"; render(); }
const ETAPAS_TRI = { novo:["Chegou", "info"], orcado:["Orçamento enviado", "gold"], fechado:["Fechou", "ok"], perdido:["Não fechou", ""] };
/* Clientes que chegaram pelo formulário do Notion (base "Triagem MedEasy", lida pelo build) */
function importarTriNotion(url){
  const n = (S.eq.triagem || []).find(x => x.url === url); if (!n) return;
  const it = interpretarPedido(n.pedido || "");
  const daLista = nome => (PROVAS.find(p => p.nome === nome || kP(p.nome) === kP(nome)) || {}).k;
  const provas = [...new Set([...(n.provas || []).map(daLista).filter(Boolean), ...it.provas])];
  const outras = (n.provas || []).filter(nome => !daLista(nome)).join(", ");
  const t = { id:novoIdTri(), em:n.em || Date.now(), nome:n.nome || "", whats:n.whats || "", area:n.area || "", provas, outras, servico:it.servico, pedido:n.pedido || "", motivos:it.motivos, mentoria:it.mentoria === "mensal", mentoriaInd:it.mentoria === "individual", nCert:n.nCert || "", links:n.drive || "", obs:n.obs || "", cont:{}, etapa:"novo", notion:n.url, notionId:n.id || idDeUrl(n.url), mentor:n.mentor || S.mentor?.nome || "", arquivos:n.arquivos || 0 };
  salvarTri(t); S.sel = t.id; S.view = "triagemItem"; render(); toast("Cliente importado do Notion");
}
function triagemView(){
  const lista = lerTri().sort((a, b) => (b.em || 0) - (a.em || 0));
  const doNotion = (S.eq.triagem || []).filter(n => !n.dados && !lista.some(t => t.notion === n.url || (t.notionId && t.notionId === n.id)) && (!alvo() || !n.mentor || semAcento(n.mentor).split(" ")[0] === semAcento(alvo()).split(" ")[0]));
  return `<div class="pagehead"><div><h1>Triagem</h1><p>${triNoNotion() ? "Clientes novos. Cada triagem fica salva no Notion, na base Triagem MedEasy, e aparece em qualquer aparelho" : "Clientes novos antes de entrar no Notion. Fica guardado só neste navegador"}</p></div><div class="row"><button class="btn sm" data-a="copiarLinkTri">Copiar link de triagem</button><button class="btn sm pri" data-a="novaTri">Novo cliente</button></div></div>
   ${doNotion.length ? `<section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Chegaram pelo formulário</h2><span class="pill info">${doNotion.length}</span></div><div class="list">${doNotion.map(n => `<div class="li"><div class="grow"><div class="t">${esc(n.nome)}</div><div class="small muted">${esc((n.provas || []).join(", ") || "sem prova")}${n.mentor ? " · mentor " + esc(n.mentor) : ""}${n.arquivos ? ` · ${n.arquivos} ${n.arquivos === 1 ? "arquivo" : "arquivos"}` : ""} · ${dBR(n.em ? new Date(n.em).toISOString() : "")}</div></div><a class="btn sm ghost" href="${esc(n.url)}" target="_blank" rel="noopener">Notion</a><button class="btn sm pri" data-a="importarTriNotion" data-v="${esc(n.url)}">Importar</button></div>`).join("")}</div></section>` : ""}
   <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Importar da mensagem</h2></div><p class="xs muted" style="margin:0 0 8px">A mensagem do cliente traz o link "Abrir no painel". Tocar nele já importa. Se preferir, cole a mensagem ou o link aqui.</p><div class="row"><textarea class="in" id="triImport" rows="2" placeholder="Cole a mensagem inteira" style="flex:1"></textarea><button class="btn" data-a="importarTri">Importar</button></div></section>
   <section class="card" style="padding:4px">${lista.length ? lista.map(t => { const [et, k] = ETAPAS_TRI[t.etapa] || ETAPAS_TRI.novo; const c = clienteDaTriagem(t); const e = estimarJS(c); return `<div class="crow" data-a="abrirTri" data-id="${t.id}"><div style="min-width:0"><div class="t">${esc(t.nome || "Sem nome")}</div><div class="small muted">${esc(provasTri(t).map(nomeProva).join(", ") || "Sem prova")} · ${esc(SERVICOS_TRI[t.servico] || "")}</div></div><div class="hide-m"><span class="pill ${k}">${et}</span></div><div class="hide-m small num">${e && e.completo ? brl(e.total) : `<span class="faint">sem valor</span>`}</div><div class="xs muted">${dBR(new Date(t.em || 0).toISOString())}</div></div>`; }).join("") : `<div class="empty" style="margin:12px">Nenhum cliente em triagem. Mande o link de triagem ou importe uma mensagem.</div>`}</section>`;
}
/* Opções de orçamento, do mais simples ao mais completo */
function opcoesTri(t){
  const c = clienteDaTriagem(t); const ops = [];
  const extra = []; if (t.drive) extra.push({ desc:"Organização dos certificados no drive", conta:"1", valor:75 });
  const montar = (letra, titulo, tipos) => { const e = estimarJS({ ...c, tipos }); if (!e) return; const linhas = [...e.linhas, ...extra]; const bruto = r2(linhas.reduce((s, l) => s + (l.valor || 0), 0)); const desc = Math.min(10, Math.max(0, num(t.desconto))); ops.push({ letra, titulo, tipos, linhas, bruto, desconto:desc, total:r2(bruto * (1 - desc / 100)), completo:e.completo }); };
  const pedeLattes = c.provas.some(p => /unifesp/i.test(p.nome)); const quem = c.provas.filter(p => /unifesp/i.test(p.nome)).map(p => p.nome).join(", ");
  const VITAE = "CURRÍCULO VITAE/CURRÍCULO COM CERTIFICADOS COMPROVADOS";
  if (t.servico === "analise"){ montar("A", "ANÁLISE CURRICULAR", ["analise"]); montar("B", `${VITAE} + ANÁLISE CURRICULAR`, ["vitae"]); }
  else if (t.servico === "lattesb"){ montar("A", "LATTES COM DOCUMENTO DE COMPROVAÇÃO", ["lattes","certificados"]); }
  else { montar("A", `${VITAE} + ANÁLISE CURRICULAR`, ["vitae"]); if (t.servico === "lattes" || pedeLattes) montar("B", `${VITAE} + ANÁLISE CURRICULAR + LATTES${quem ? ` (${quem})` : ""}`, ["vitae","lattes"]); }
  // Mentoria mensal: 250 por mês até 2 provas e mais 150 por prova a mais. Mentoria individual: valor único que o mentor digita.
  const letra = () => String.fromCharCode(65 + ops.length), nP = c.provas.length;
  if (t.mentoria){ const extra = Math.max(0, nP - 2), v = PRECO.mentoria.ate2 + extra * PRECO.mentoria.extra;
    ops.push({ letra:letra(), titulo:"MENTORIA MENSAL", tipos:["mentoria"], mensal:true, linhas:[{ desc:`Mentoria mensal (${extra ? nP + " provas" : "até 2 provas"})`, conta:extra ? `${br2(PRECO.mentoria.ate2)} + ${extra} X ${br2(PRECO.mentoria.extra)}` : "1 mês", valor:v }], bruto:v, desconto:0, total:v, completo:true }); }
  if (t.mentoriaInd){ const v = t.valorMentoriaInd === "" || t.valorMentoriaInd == null ? null : num(t.valorMentoriaInd);
    ops.push({ letra:letra(), titulo:"MENTORIA INDIVIDUAL", tipos:["mentoriaInd"], linhas:[{ desc:"Mentoria individual", conta:"1", valor:v }], bruto:v || 0, desconto:0, total:v || 0, completo:v != null }); }
  return ops.map(o => ajustarOpcao(o, (t.ajuste || {})[o.letra]));
}
/* Ajustes feitos à mão no orçamento: título, cada linha (pela descrição automática), linhas a mais e valor final */
function ajustarOpcao(o, a){
  if (!a) return { ...o, linhas:o.linhas.map(l => ({ ...l, orig:l.desc })) };
  const linhas = o.linhas.map(l => { const x = (a.linhas || {})[l.desc]; if (!x) return { ...l, orig:l.desc };
    return { ...l, orig:l.desc, desc:x.desc != null && x.desc !== "" ? x.desc : l.desc, conta:x.conta != null && x.conta !== "" ? x.conta : l.conta, valor:x.valor != null && x.valor !== "" ? num(x.valor) : l.valor, manual:true }; }).filter(l => !(a.linhas || {})[l.orig]?.fora);
  (a.extras || []).forEach((x, i) => linhas.push({ desc:x.desc || "", conta:x.conta || "1", valor:x.valor === "" || x.valor == null ? null : num(x.valor), extra:i, manual:true }));
  const bruto = r2(linhas.reduce((s, l) => s + (l.valor || 0), 0)); const total = a.total != null && a.total !== "" ? num(a.total) : r2(bruto * (1 - o.desconto / 100));
  return { ...o, titulo:a.titulo || o.titulo, linhas, bruto, total, totalManual:a.total != null && a.total !== "", manual:true, completo:linhas.every(l => l.valor != null) };
}
const NOTA_ORC = "Valor estimado com os certificados recebidos. Pode variar em até 3 certificados para mais ou para menos após a conferência completa de cada edital. Pagamento de 50% na contratação e o restante após a versão para conferência.";
const NOTA_MENTORIA = "Mentoria mensal, paga todo mês. Não tem prazo de entrega: o acompanhamento do currículo segue mês a mês com o mentor, até a prova.";
const msgOrc = (t, ops) => t.msgOrc || mensagemOrcamento(t, ops);
/* Editor do orçamento. Os campos gravam quando o mentor sai deles. */
function orcEditor(t, ops){
  const a = t.ajuste || {}; const inp = (attrs, v, ph, w) => `<input class="in" ${attrs} value="${esc(v ?? "")}" placeholder="${esc(ph ?? "")}" style="padding:5px 8px;font-size:13px;${w ? "width:" + w : ""}">`;
  return ops.map(o => `<div class="svc" style="margin-bottom:10px"><div class="row between" style="gap:8px"><b>Opção ${o.letra}</b>${inp(`data-orc="titulo" data-l="${o.letra}"`, (a[o.letra] || {}).titulo, o.titulo, "auto;flex:1")}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Descrição</th><th>Quantidade</th><th class="r">Valor</th><th></th></tr></thead><tbody>${o.linhas.map(l => { const k = l.extra != null ? `data-x="${l.extra}"` : `data-k="${esc(l.orig)}"`; const x = l.extra != null ? (a[o.letra].extras[l.extra]) : ((a[o.letra] || {}).linhas || {})[l.orig] || {};
      return `<tr><td>${inp(`data-orc="desc" data-l="${o.letra}" ${k}`, x.desc, l.extra != null ? "Descrição" : l.orig, "100%")}</td><td>${inp(`data-orc="conta" data-l="${o.letra}" ${k}`, x.conta, l.extra != null ? "1" : l.conta, "120px")}</td><td class="r">${inp(`data-orc="valor" data-l="${o.letra}" ${k} type="number" step="0.01" inputmode="decimal"`, x.valor, l.extra != null ? "0,00" : l.valor == null ? "a definir" : br2(l.valor), "100px")}</td><td><button class="btn sm ghost" data-a="orcTirar" data-l="${o.letra}" ${k} title="Tirar esta linha">×</button></td></tr>`; }).join("")}</tbody></table></div>
    <div class="row between" style="margin-top:8px;gap:8px"><button class="btn sm" data-a="orcLinha" data-l="${o.letra}">+ Linha</button><label class="row small" style="gap:6px">Valor final ${inp(`data-orc="total" data-l="${o.letra}" type="number" step="0.01" inputmode="decimal"`, (a[o.letra] || {}).total, br2(r2(o.bruto * (1 - o.desconto / 100))), "120px")}</label></div></div>`).join("")
  + `<label class="f"><span>Nota no fim do PDF</span><textarea class="in" data-orc="nota" rows="3" style="font-size:13px">${esc(t.notaOrc || NOTA_ORC)}</textarea></label>
    <label class="f" style="margin-top:8px"><span>Mensagem do WhatsApp${t.msgOrc ? " (editada à mão)" : ""}</span><textarea class="in" data-orc="msg" rows="9" style="font-size:13px">${esc(msgOrc(t, ops))}</textarea></label>
    <div class="row" style="margin-top:8px">${t.msgOrc ? `<button class="btn sm" data-a="orcRefazerMsg">Refazer texto com os valores</button>` : ""}<button class="btn sm ghost" data-a="orcAutomatico">Voltar tudo ao automático</button></div>`;
}
function orcInput(el){
  const t = triDe(S.sel); if (!t) return; const campo = el.dataset.orc; const v = el.value;
  if (campo === "msg"){ t.msgOrc = v.trim() && v !== mensagemOrcamento(t, opcoesTri({ ...t, msgOrc:"" })) ? v : ""; }
  else if (campo === "nota"){ t.notaOrc = v.trim() && v.trim() !== NOTA_ORC ? v : ""; }
  else { const a = ((t.ajuste ||= {})[el.dataset.l] ||= {});
    if (campo === "titulo" || campo === "total") a[campo] = v;
    else if (el.dataset.x != null) (a.extras ||= [])[+el.dataset.x][campo] = v;
    else ((a.linhas ||= {})[el.dataset.k] ||= {})[campo] = v; }
  salvarTri(t);
  // Redesenha depois que o foco passou para o próximo campo, e devolve o foco a ele
  setTimeout(() => { const Q = "input, textarea, select, button"; const i = [...document.querySelectorAll(Q)].indexOf(document.activeElement); render(); if (i >= 0){ const novo = document.querySelectorAll(Q)[i]; if (novo){ novo.focus(); if (novo.select && novo.tagName === "INPUT") try { novo.select(); } catch {} } } }, 0);
}
const A_ORC = {
  orcEditar: () => { S.orcEdit = !S.orcEdit; render(); },
  orcLinha: el => { const t = triDe(S.sel); const a = ((t.ajuste ||= {})[el.dataset.l] ||= {}); (a.extras ||= []).push({ desc:"", conta:"1", valor:"" }); salvarTri(t); render(); },
  orcTirar: el => { const t = triDe(S.sel); const a = ((t.ajuste ||= {})[el.dataset.l] ||= {}); if (el.dataset.x != null) a.extras.splice(+el.dataset.x, 1); else ((a.linhas ||= {})[el.dataset.k] ||= {}).fora = true; salvarTri(t); render(); },
  orcRefazerMsg: () => { const t = triDe(S.sel); t.msgOrc = ""; salvarTri(t); render(); },
  orcAutomatico: () => { if (!confirm("Voltar o orçamento todo ao cálculo automático?")) return; const t = triDe(S.sel); delete t.ajuste; t.msgOrc = ""; t.notaOrc = ""; salvarTri(t); render(); },
};
function mensagemOrcamento(t, ops){
  const c = clienteDaTriagem(t); const provas = c.provas.map(p => p.nome);
  const porProva = o => o.linhas.filter(l => l.valor != null && /:/.test(l.desc)).map(l => `${l.desc.split(":")[0]} ${brl(l.valor)}`).join(", ");
  const desc = (o, i) => o.mensal ? `Mentoria mensal: acompanhamento mês a mês do seu currículo para ${provas.length > 2 ? `as ${provas.length} provas` : "até 2 provas"}, sem prazo de entrega` : (o.tipos || []).includes("mentoriaInd") ? "Mentoria individual com o seu mentor" : null;
  const curr = ops.filter(o => !o.mensal && !(o.tipos || []).includes("mentoriaInd"));
  const blocos = ops.map(o => { const d = desc(o); const i = curr.indexOf(o); return `OPÇÃO ${o.letra}: ${brl(o.total)}${o.mensal ? " por mês" : ""}\n${d ? d : i === 0 ? `${/ANÁLISE CURRICULAR$/.test(o.titulo) && !/VITAE/.test(o.titulo) ? "Análise curricular" : "Currículo Vitae/currículo com certificados comprovados e análise curricular"} ${provas.length === 1 ? "da prova" : `das ${provas.length} provas`} (${porProva(o)})` : `Tudo da opção ${curr[i - 1].letra} + ${/LATTES/.test(o.titulo) ? "a atualização do seu Currículo Lattes" : "o documento pronto para envio"}`}${o.desconto ? `\nJá com ${o.desconto}% de desconto` : ""}`; }).join("\n\n");
  const prox = c.provas.filter(p => p.prazoEnvio && dias(p.prazoEnvio) >= 0).sort((a, b) => a.prazoEnvio.localeCompare(b.prazoEnvio))[0];
  return `Oi, ${primeiro(t.nome)}! Tudo bem? Segue o seu orçamento para ${provas.join(", ") || "a sua prova"} ${ANO}\n\nEm cada prova fazemos a análise curricular com projeção de nota e a seleção dos certificados que pontuam no edital, e deixamos o documento pronto para envio\n\n${blocos}${prox ? `\n\nAtenção ao ${prox.nome}: o envio do currículo termina em ${dBR(prox.prazoEnvio)}` : ""}\n\n${curr.length ? "O pagamento é 50% na contratação e o restante depois da versão para conferência" : ""}${ops.some(o => o.mensal) ? `${curr.length ? "\n" : ""}A mentoria mensal é paga todo mês` : ""}`.replace(/\n+$/, "");
}
function textoNotionTri(t){ const c = clienteDaTriagem(t); const cont = textoCont(c, (carregarCont(c).provas) || {}); return `${t.nome}\nTelefone: ${t.whats}\nTipo de serviço: ${tiposDe(t.servico).join(", ")}, ${c.provas.map(p => p.nome).join(", ")}\n${t.area ? "Especialidade: " + t.area + "\n" : ""}${t.links ? "Drive: " + t.links + "\n" : ""}${cont ? "\nCertificados por item:\n" + cont : ""}`; }
function triagemItemView(){
  const t = triDe(S.sel); if (!t) return triagemView();
  const c = clienteDaTriagem(t); const ops = opcoesTri(t); const [et, k] = ETAPAS_TRI[t.etapa] || ETAPAS_TRI.novo;
  const chk = (kk, nome) => `<label class="chk"><input type="checkbox" data-tri="prova" value="${kk}" ${(t.provas || []).includes(kk) ? "checked" : ""}><span>${esc(nome)}</span></label>`;
  return `<div class="pagehead"><div><button class="btn ghost sm" data-a="nav" data-v="triagem" style="margin-left:-10px">‹ Triagem</button><h1>${esc(t.nome || "Cliente novo")}</h1><div class="row" style="margin-top:6px"><span class="pill ${k}">${et}</span>${t.area ? `<span class="pill ok">${esc(t.area)}</span>` : ""}<span id="triSync">${syncTriTexto(t.id)}</span></div></div>
    <div class="row">${t.whats ? `<a class="btn" href="${waLink(t.whats, "Oi, " + primeiro(t.nome) + "!")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${t.notion ? `<a class="btn" href="${esc(t.notion)}" target="_blank" rel="noopener">Arquivos no Notion${t.arquivos ? ` (${t.arquivos})` : ""}</a>` : ""}<select class="in" id="triEtapa" style="width:auto">${Object.entries(ETAPAS_TRI).map(([kk, [tt]]) => `<option value="${kk}" ${t.etapa === kk ? "selected" : ""}>${tt}</option>`).join("")}</select><button class="btn sm danger" data-a="apagarTri">Apagar</button></div></div>
   <div class="grid2"><div class="stack">
    ${t.pedido || t.obs ? `<section class="card"><div class="card-h"><h2>Pedido do cliente</h2></div>${t.pedido ? `<p class="small" style="margin:0 0 8px;white-space:pre-wrap">${esc(t.pedido)}</p>` : ""}${t.obs ? `<p class="small muted" style="margin:0 0 8px;white-space:pre-wrap">Obs: ${esc(t.obs)}</p>` : ""}<div class="xs muted">Entendido como <b>${esc(SERVICOS_TRI[t.servico] || "")}</b>${(t.motivos || []).length ? " (" + esc(t.motivos.join(", ")) + ")" : ""}. Se não for isso, troque o serviço e as provas abaixo.</div></section>` : ""}
    <section class="card"><div class="card-h"><h2>Dados</h2></div><div class="stack" style="gap:10px">
      <div class="grid2" style="gap:10px"><label class="f"><span>Nome</span><input class="in" data-tri="nome" value="${esc(t.nome || "")}"></label><label class="f"><span>WhatsApp</span><input class="in" data-tri="whats" value="${esc(t.whats || "")}" inputmode="tel"></label></div>
      <div class="grid2" style="gap:10px"><label class="f"><span>Especialidade</span><input class="in" data-tri="area" value="${esc(t.area || "")}"></label><label class="f"><span>Serviço</span><select class="in" data-tri="servico">${Object.entries(SERVICOS_TRI).filter(([kk]) => kk !== "naosei").map(([kk, tt]) => `<option value="${kk}" ${t.servico === kk ? "selected" : ""}>${tt}</option>`).join("")}</select></label></div>
      <div class="f"><span>Provas</span><div class="chks">${PROVAS.map(p => chk(p.k, p.nome)).join("")}</div></div>
      ${campoOutras(t.outras, true)}
      <div class="grid2" style="gap:10px"><label class="f"><span>Certificados (quando não contou por item)</span><input class="in" data-tri="nCert" type="number" min="0" value="${esc(t.nCert || "")}"></label><label class="f"><span>Desconto (%)</span><input class="in" data-tri="desconto" type="number" min="0" max="10" value="${esc(t.desconto || "")}" placeholder="0"></label></div>
      <label class="chk"><input type="checkbox" data-tri="drive" ${t.drive ? "checked" : ""}><span>Cobrar organização do drive (R$ 75,00)</span></label>
      <label class="chk"><input type="checkbox" data-tri="mentoria" ${t.mentoria ? "checked" : ""}><span>Oferecer mentoria mensal (${brl(PRECO.mentoria.ate2)} por mês até 2 provas, mais ${brl(PRECO.mentoria.extra)} por prova a mais)</span></label>
      <div class="row" style="gap:8px"><label class="chk"><input type="checkbox" data-tri="mentoriaInd" ${t.mentoriaInd ? "checked" : ""}><span>Oferecer mentoria individual</span></label>${t.mentoriaInd ? `<input class="in" data-tri="valorMentoriaInd" type="number" min="0" step="0.01" value="${esc(t.valorMentoriaInd ?? "")}" placeholder="Valor" style="width:120px">` : ""}</div>
      <label class="f"><span>Links do Drive</span><input class="in" data-tri="links" value="${esc(t.links || "")}"></label>
      <label class="f"><span>Observações</span><textarea class="in" data-tri="obs" rows="2">${esc(t.obs || "")}</textarea></label></div></section>
    <section class="card" id="triProvas"><div class="card-h"><h2>Provas</h2></div>${c.provas.length ? `<div class="list">${c.provas.map(p => { const cp = calcDe(c, p); return `<div class="li"><div class="grow"><div class="t">${esc(p.nome)} ${ANO}</div><div class="small muted">${p.prazoEnvio ? "Envio até " + dBR(p.prazoEnvio) + " (" + quando(p.prazoEnvio) + ")" : "Sem prazo cadastrado"}${p.dataProva ? " · prova " + dBR(p.dataProva) : ""}</div></div>${cp.tem ? `<b class="num">${d1(cp.total)} / ${d1(cp.max)}</b>` : ""}</div>`; }).join("")}</div>` : `<div class="empty">Marque as provas acima</div>`}</section>
   </div><div class="stack">
    <section class="card" id="triOrc"><div class="card-h"><h2>Orçamento</h2><div class="row" style="gap:6px">${ops.some(o => o.manual) || t.msgOrc || t.notaOrc ? `<span class="pill gold">Editado à mão</span>` : ""}${ops.length && ops.every(o => o.completo) ? `<span class="pill ok">Pronto</span>` : `<span class="pill">Falta contagem</span>`}${ops.length ? `<button class="btn sm ${S.orcEdit ? "pri" : ""}" data-a="orcEditar">${S.orcEdit ? "Fechar edição" : "Editar à mão"}</button>` : ""}</div></div>
      ${ops.length && S.orcEdit ? orcEditor(t, ops) : ops.length ? ops.map(o => `<div class="svc" style="margin-bottom:10px"><div class="row between"><b>Opção ${o.letra}</b><b class="num gold">${brl(o.total)}${o.mensal ? " por mês" : ""}</b></div><div class="xs muted">${esc(o.titulo)}${o.desconto ? ` · ${o.desconto}% de desconto` : ""}</div><div class="tbl-wrap"><table class="tbl"><tbody>${o.linhas.map(l => `<tr><td class="small">${esc(l.desc)}<div class="xs muted">${esc(l.conta)}${esc(foraTxt(l))}</div></td><td class="r num" style="white-space:nowrap">${l.valor == null ? "–" : brl(l.valor)}</td></tr>`).join("")}</tbody></table></div></div>`).join("") : `<div class="empty">Marque as provas e conte os certificados</div>`}
      <div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="pdfOrc" ${ops.length ? "" : "disabled"}>PDF do orçamento</button><button class="btn sm" data-a="copiarMsgOrc" ${ops.length ? "" : "disabled"}>Copiar mensagem</button>${t.whats && ops.length ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(t.whats, msgOrc(t, ops))}">Mandar no WhatsApp</a>` : ""}</div></section>
    ${analiseCard(c)}
    <section class="card"><div class="card-h"><h2>PDF da análise</h2></div><p class="xs muted" style="margin:0 0 10px">Sai da análise importada ou da contagem por item lá embaixo, com os comentários de cada item. Uma prova por vez.</p><div class="row">${c.provas.map(p => `<button class="btn sm ${calcDe(c, p).tem ? "pri" : ""}" data-a="pdfAnalise" data-v="${kP(p.nome)}">PDF ${esc(p.nome)}</button>`).join("") || `<span class="xs muted">Sem prova</span>`}</div></section>
    <section class="card" id="triFechar"><div class="card-h"><h2>Quando fechar</h2>${t.clienteNotion ? `<a class="pill ok" href="${esc(t.clienteNotion)}" target="_blank" rel="noopener">Cliente no Notion</a>` : ""}</div>
      ${valorNotionTri(t, ops)}
      ${triNoNotion() ? `<p class="xs muted" style="margin:0 0 10px">Cria a linha do cliente no Controle cliente, com serviço, provas, valor, contagem por item e controle de certificados. Ele entra no painel com o código de acesso em 1 ou 2 minutos.</p>
      <div class="row">${ops.length > 1 ? `<select class="in" id="triOpFechar" style="width:auto">${ops.map(o => `<option value="${o.letra}">Opção ${o.letra}: ${brl(o.total)}${o.mensal ? " por mês" : ""}</option>`).join("")}</select>` : ""}<button class="btn sm pri" data-a="criarClienteNotion" ${t.nome && t.whats ? "" : "disabled"}>Criar cliente no Notion</button><button class="btn sm ghost" data-a="copiarNotionTri">Copiar texto</button></div>`
      : `<p class="xs muted" style="margin:0 0 10px">Crie o cliente no Notion e cole o texto abaixo. Na próxima sincronização ele entra no painel com a contagem e o código de acesso.</p><button class="btn sm" data-a="copiarNotionTri">Copiar dados para o Notion</button>`}</section>
   </div></div>
   <div style="margin-top:16px">${controleView(c)}</div>
   <div style="margin-top:16px">${certItensView(c)}</div>`;
}
function atualizarTriParcial(){
  const tmp = document.createElement("div"); tmp.innerHTML = triagemItemView();
  for (const id of ["triProvas", "triOrc", "triFechar"]){ const novo = tmp.querySelector("#" + id), velho = document.getElementById(id); if (novo && velho) velho.replaceWith(novo); }
}
/* Cliente já criado no Notion: o valor gravado lá não muda sozinho quando o orçamento muda depois. Mostra a diferença e deixa atualizar. */
/* Linha do cliente no Notion: a criada pelo botão do site ou, se ele foi criado direto no Notion, a do mesmo telefone (8 últimos dígitos) */
function servicoNotionTri(t){
  const todos = S.eq?.clientes || []; let id = t.clienteNotionId || idDeUrl(t.clienteNotion);
  let svc = id ? todos.flatMap(c => c.servicos || []).find(x => x.id === id) : null; let varias = false;
  if (!svc){ const tel = String(t.whats || "").replace(/\D/g, "").slice(-8);
    const cli = tel.length === 8 ? todos.find(c => String(c.whatsapp || "").replace(/\D/g, "").slice(-8) === tel) : null;
    const linhas = cli ? (cli.servicos || []).filter(x => !x.mensal && x.id) : [];
    if (linhas.length){ const abertas = linhas.filter(x => (x.etapa || 0) < 6); varias = (abertas.length || linhas.length) > 1; svc = (abertas[0] || linhas[0]); id = svc.id; } }
  return { id, svc, varias };
}
function valorNotionTri(t, ops){
  const { svc, varias } = servicoNotionTri(t);
  // O valor de verdade vem da última sincronização. Sem ela, o que foi gravado na criação.
  const noNotion = svc && svc.total != null ? svc.total : t.valorNotion; if (noNotion == null) return "";
  const o = ops.find(x => x.letra === t.opcaoNotion) || ops[0]; const agora = o ? o.total : null;
  const dif = agora != null && Math.abs(agora - noNotion) >= 0.01;
  const pagou = !!(svc && svc.pagamento && !semAcento(svc.pagamento).startsWith("nao pago"));
  return `<div class="svc" style="margin-bottom:10px"><div class="row between small"><span>Valor no Notion${o ? ` (opção ${esc(o.letra)})` : ""}${!t.clienteNotion ? " · achado pelo telefone" : ""}</span><b class="num">${brl(noNotion)}</b></div>
    ${dif ? `<div class="row between small" style="margin-top:4px"><span class="gold">O orçamento de agora é outro</span><b class="num gold">${brl(agora)}</b></div>
    ${varias ? `<p class="xs muted" style="margin:6px 0 0">Esse cliente tem mais de uma linha aberta no Notion. Ajuste o valor de cada uma lá.</p>` : pagou && !S.admin ? `<p class="xs muted" style="margin:6px 0 0">O cliente já começou a pagar, então só o José ou o Eduardo mudam o valor.</p>` : `<div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="atualizarValorTri">Atualizar o valor no Notion</button></div>`}` : `<p class="xs muted" style="margin:4px 0 0">Igual ao orçamento de agora.${t.clienteNotion ? " Enquanto o cliente estiver como \"Não pago\", o valor do Notion acompanha o orçamento sozinho." : ""}</p>`}</div>`;
}
/* Cliente criado pelo botão do site e ainda "Não pago": quando o orçamento muda, o Valor total do Notion muda junto.
   Cliente achado só pelo telefone não muda sozinho (pode ser outro serviço do mesmo cliente): fica o botão. */
async function valorClienteAutomatico(t){
  if (!t.clienteNotion && !t.clienteNotionId) return;
  const { id, svc, varias } = servicoNotionTri(t); if (!id || varias) return;
  if (svc && svc.pagamento && !semAcento(svc.pagamento).startsWith("nao pago")) return;
  // Sem saber qual opção o cliente fechou (triagem antiga com mais de uma opção), não muda sozinho: fica o botão
  const ops = opcoesTri(t); if (!t.opcaoNotion && ops.length > 1) return;
  const o = ops.find(x => x.letra === t.opcaoNotion) || ops[0]; if (!o || !o.completo) return;
  const atual = svc && svc.total != null ? svc.total : t.valorNotion; if (atual != null && Math.abs(atual - o.total) < 0.01) return;
  try {
    await pontePedido("/pagina", { id, props:{ "Valor total":o.total }, quem:S.mentor?.nome });
    t.valorNotion = o.total; t.opcaoNotion = o.letra; t.clienteNotionId = t.clienteNotionId || id; if (svc) svc.total = o.total; salvarTri(t, true);
    toast(`Valor do cliente atualizado no Notion: ${brl(o.total)}`); if (S.sel === t.id && document.getElementById("triFechar")) atualizarTriParcial();
  } catch {}
}
async function atualizarValorTri(){
  const t = triDe(S.sel); if (!t) return; const ops = opcoesTri(t); const o = ops.find(x => x.letra === t.opcaoNotion) || ops[0]; const { id, svc } = servicoNotionTri(t);
  if (!o || !id) return;
  try { await salvarNotion(id, { "Valor total":o.total }, "Valor atualizado no Notion. O site mostra o novo em 1 ou 2 minutos"); t.valorNotion = o.total; t.opcaoNotion = o.letra; if (!t.clienteNotionId) t.clienteNotionId = id; if (svc) svc.total = o.total; salvarTri(t); render(); }
  catch (e) { toast("Não gravou: " + e.message); }
}
function triInput(el){
  const campo = el.dataset.tri; const t = S.modo === "triagem" ? S.triForm : triDe(S.sel); if (!t) return;
  if (campo === "prova"){ const set = new Set(t.provas || []); el.checked ? set.add(el.value) : set.delete(el.value); t.provas = PROVAS.map(p => p.k).filter(k => set.has(k)); }
  else if (el.type === "checkbox") t[campo] = el.checked; else t[campo] = el.value;
  if (S.modo === "triagem") return;
  salvarTri(t); delete S.cont[t.id];
  if (campo === "prova" || campo === "servico" || campo === "drive" || campo === "mentoria" || campo === "mentoriaInd") render();
  // Campos digitados (desconto, certificados, valor da mentoria): redesenhar a tela inteira tirava o foco do campo a cada número,
  // e "10" virava "1". Agora só os cartões de provas, orçamento e fechamento são refeitos.
  else if (campo === "nCert" || campo === "desconto" || campo === "valorMentoriaInd") atualizarTriParcial();
}

/* ---------- PDFs no navegador ---------- */
function abrirDoc(html){ const u = URL.createObjectURL(new Blob([html], { type:"text/html" })); const w = window.open(u, "_blank"); if (!w) toast("O navegador bloqueou a janela. Libere pop-ups para este site"); setTimeout(() => URL.revokeObjectURL(u), 60000); }
const LOGO_URL = () => new URL(LOGO, location.href).href;
const FONTES = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Great+Vibes&family=Poppins:wght@400;500;600;700&display=swap">`;
const BOTAO_PDF = `<div class="noprint" style="position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9"><button onclick="window.print()" style="font:600 14px Poppins,sans-serif;background:#39ff14;border:0;border-radius:999px;padding:10px 16px;cursor:pointer">Salvar em PDF</button></div><script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),400))<\/script>`;
const hoje_br = () => dBR(isoLocal());
function pdfOrcamento(t){
  const ops = opcoesTri(t); if (!ops.length) return; const c = clienteDaTriagem(t);
  const pag = o => `<section class="pg"><div class="cab"><div><h1>ORÇAMENTO - OPÇÃO ${o.letra}</h1><div class="sub">${esc(o.titulo)}</div></div><div class="data">DATA: <u>${hoje_br()}</u></div></div>
    <div class="linhas"><div><b>CLIENTE:</b> ${esc((t.nome || "").toUpperCase())}</div><div><b>CPF:</b> </div><div><b>MENTOR:</b> ${esc((S.mentor?.nome || "JOSÉ EDUARDO").toUpperCase())}</div></div>
    <div class="tabela"><img class="marca" src="${LOGO_URL()}" alt=""><table><thead><tr><th>DESCRIÇÃO</th><th>QUANTIDADE</th><th>VALOR</th></tr></thead><tbody>${o.linhas.map(l => `<tr><td>${esc(l.desc.replace(/^([^:]+):/, `$1 ${ANO}:`))}</td><td>${esc(l.conta)}</td><td>${l.valor == null ? "a definir" : "R$" + br2(l.valor)}</td></tr>`).join("")}${o.bruto - o.total > 0.004 ? `<tr><td>${o.desconto && !o.totalManual ? `Desconto de ${o.desconto}%` : "Desconto"}</td><td></td><td>- R$${br2(o.bruto - o.total)}</td></tr>` : ""}</tbody></table></div>
    <div class="total">VALOR TOTAL: R$ ${br2(o.total)}${o.mensal ? " POR MÊS" : ""}</div>
    <p class="nota">${esc(o.mensal ? NOTA_MENTORIA : t.notaOrc || NOTA_ORC).replace(/\n/g, "<br>")}</p>
    <div class="rod">(62) 99515-5830 / medeasyy0@gmail.com / Goiânia, Goiás- Brasil</div></section>`;
  abrirDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento ${esc(t.nome)}</title>${FONTES}<style>
    @page{size:A4;margin:0} *{box-sizing:border-box} body{margin:0;background:#888;font-family:Poppins,sans-serif;color:#1b1b1b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pg{width:210mm;min-height:297mm;background:#FFF9F5;margin:12px auto;padding:22mm 18mm;position:relative;page-break-after:always;display:flex;flex-direction:column}
    .cab{display:flex;justify-content:space-between;align-items:flex-start} h1{font-size:22px;margin:0;font-weight:700} .sub{color:#004172;font-weight:600;font-size:13px;margin-top:4px} .data{font-size:13px;font-weight:600}
    .linhas{margin:22px 0 18px;color:#004172;font-size:14px;line-height:2} .linhas div{border-bottom:1px solid #004172}
    .tabela{position:relative} .marca{position:absolute;left:50%;top:50%;width:60%;transform:translate(-50%,-50%);opacity:.12} table{width:100%;border-collapse:collapse;font-size:12.5px;position:relative} th{background:#004172;color:#fff;padding:8px;text-align:left;font-size:11px;letter-spacing:.06em} td{padding:9px 8px;border-bottom:1px solid #d8d2cc;vertical-align:top} td:nth-child(2){white-space:nowrap} td:last-child{white-space:nowrap;text-align:right}
    .total{margin-top:18px;font-weight:700;font-size:16px;text-align:right} .nota{font-size:11px;color:#444;margin-top:14px;text-align:justify} .rod{margin-top:auto;text-align:center;font-size:11px;color:#004172;padding-top:20px}
    @media print{body{background:none}.pg{margin:0}.noprint{display:none!important}}</style></head><body>${BOTAO_PDF}${ops.map(pag).join("")}</body></html>`);
}
function pdfAnalise(t, pk){
  const c = clienteDaTriagem(t); const p = c.provas.find(x => kP(x.nome) === pk); if (!p) return;
  const cp = calcDe(c, p); const e = p.edital || {}; const itens = cp.rows;
  const ganho = x => Math.max(0, r2((x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN) - x.pts));
  // Sem marcação do mentor: só o que já pontuou recebe selo. Item zerado fica "A avaliar" e não entra na nota possível.
  const sit = x => x.sit || (x.pts >= x.maxN ? "Completo" : x.pts > 0 ? "Parcial" : "A avaliar");
  const SELO = { "Completo":"ok", "Parcial":"gold", "Aumentar agora":"gold", "Médio prazo":"info", "Não se aplica agora":"", "A avaliar":"" };
  const possivel = r2(Math.min(cp.max, cp.total + itens.filter(x => /aumentar|parcial/i.test(sit(x))).reduce((s, x) => s + ganho(x), 0)));
  const completos = itens.filter(x => x.pts >= x.maxN).length, crescer = itens.filter(x => ganho(x) > 0 && !/n[aã]o se aplica/i.test(sit(x))).length;
  const pil = (n, r) => `<span class="pil"><i>${n}</i><b>${r}</b></span>`;
  // O texto do card segue a ordem que o leitor de PDF do site e do build entendem: "ITEM n  Situação", título, regra, "Análise curricular | COMPROVANTES NO CURRÍCULO", pílulas à esquerda e comprovantes à direita, "Comentário:"
  const lista = x => x.lista.length ? x.lista : Array.from({ length:x.n }, (_, j) => `Certificado ${j + 1}`);
  const card = (x, i) => `<article class="item"><div class="cab"><span class="itm">ITEM ${i + 1}</span><span class="selo ${SELO[sit(x)] || ""}">${esc(sit(x))}</span></div><h3>${esc(x.item.replace(/^\d+[a-z]?\.\s*/, ""))}</h3><p class="regra">${esc(x.pontos || "")}</p>
    <div class="duas"><div class="lbl">Análise curricular</div><div class="lbl">COMPROVANTES NO CURRÍCULO</div>
      <div class="pils">${pil(d1(x.maxN), "PONTUAÇÃO MÁXIMA")}${x.unit != null ? pil(d1(x.unit), "POR ATIVIDADE") : ""}${pil(d1(x.pts), "PONTUAÇÃO PESSOAL")}${ganho(x) > 0 && !/n[aã]o se aplica/i.test(sit(x)) ? pil("+" + d1(ganho(x)), "GANHO POSSÍVEL") : ""}</div>
      <div>${lista(x).length ? `<ol>${lista(x).map((l, j) => `<li>${esc(l)}${x.unit != null && (j + 1) * x.unit > x.maxN ? " <em>(reserva)</em>" : ""}</li>`).join("")}</ol>` : `<p class="regra">Nenhum comprovante neste item</p>`}</div></div>
    <p class="com"><b>Comentário:</b> ${esc(x.com || (ganho(x) > 0 ? "Você ainda pode pontuar aqui até o fim das inscrições." : x.pts >= x.maxN ? "Item completo." : "Sem pontuação neste item."))}</p></article>`;
  const paginasItens = []; for (let i = 0; i < itens.length; i += 2) paginasItens.push(`<section class="pg"><div class="topo">MEDEASY ANÁLISE CURRICULAR ${esc(p.nome)} ${ANO} · itens ${i + 1}${itens[i + 1] ? " e " + (i + 2) : ""} de ${itens.length}</div>${card(itens[i], i)}${itens[i + 1] ? card(itens[i + 1], i + 1) : ""}</section>`);
  const prioridades = itens.filter(x => ganho(x) > 0 && /aumentar|parcial/i.test(sit(x))).sort((a, b) => ganho(b) - ganho(a));
  const longo = itens.filter(x => /m[eé]dio/i.test(sit(x)));
  abrirDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Análise curricular ${esc(t.nome)} ${esc(p.nome)}</title>${FONTES}<style>
    @page{size:A4;margin:0} *{box-sizing:border-box} body{margin:0;background:#333;font-family:Poppins,sans-serif;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12px}
    .pg{width:210mm;min-height:297mm;background:#0d0f0e;margin:12px auto;padding:16mm 14mm;position:relative;page-break-after:always;display:flex;flex-direction:column;gap:10px}
    h1,h2,h3{font-family:Anton,sans-serif;font-weight:400;letter-spacing:.01em;margin:0} h1{font-size:40px;color:#39ff14;line-height:1.05} h2{font-size:22px;color:#39ff14} h3{font-size:16px;color:#fff}
    .vibes{font-family:"Great Vibes",cursive;color:#d9a93b;font-size:54px;line-height:1} .topo{font-size:10px;letter-spacing:0;text-transform:uppercase;color:#8a948e}
    .capa{justify-content:center;align-items:center;text-align:center;gap:18px} .capa .sigla{font-family:Anton,sans-serif;font-size:72px;color:#fff} .capa .nome{font-size:20px;font-weight:600} .capa img{width:120px}
    .card{background:#161a18;border-radius:16px;padding:14px 16px} p{margin:0;text-align:justify;line-height:1.5}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px} .kpi{background:#161a18;border-radius:14px;padding:12px;text-align:center} .kpi b{display:block;font-family:Anton,sans-serif;font-size:30px;color:#39ff14} .kpi.g b{color:#d9a93b} .kpi span{font-size:10px;color:#8a948e;text-transform:uppercase;letter-spacing:0}
    .graf{display:flex;flex-direction:column;gap:5px} .gr{display:grid;grid-template-columns:150px 1fr 60px;gap:8px;align-items:center;font-size:10px} .gr .bar{height:9px;background:#243028;border-radius:999px;position:relative;overflow:hidden} .gr .bar i{position:absolute;left:0;top:0;bottom:0;background:#39ff14;border-radius:999px} .gr .bar em{position:absolute;top:0;bottom:0;background:#d9a93b;opacity:.75} .gr .n{text-align:right;font-weight:600}
    .item{background:#161a18;border-radius:16px;padding:16px 18px;flex:1;position:relative;display:flex;flex-direction:column;gap:7px;min-height:0} .item .cab{display:flex;justify-content:space-between;align-items:baseline} .itm{font-family:Anton,sans-serif;font-size:22px;color:#39ff14} .item .cab .selo{font-family:Anton,sans-serif;font-size:22px;font-weight:400;border:0;padding:0;letter-spacing:.01em} .regra{color:#c9d1cc;font-size:11px}
    .duas{display:grid;grid-template-columns:185px 1fr;gap:4px 14px;align-items:start} .pils{display:flex;flex-direction:column;gap:6px;align-items:flex-start} .pil{display:inline-flex;align-items:center;gap:0;font-size:9.5px;white-space:nowrap} .pil i{font-style:normal;background:#39ff14;color:#0d0f0e;font-weight:700;border-radius:999px;padding:4px 9px;min-width:30px;text-align:center} .pil b{background:#fff;color:#0d0f0e;border-radius:0 999px 999px 0;padding:4px 9px;font-weight:600}
    .lbl{font-size:9px;letter-spacing:0;text-transform:uppercase;color:#8a948e;margin-top:2px} ol{margin:0;padding-left:18px;font-size:11px;line-height:1.5} em{color:#d9a93b;font-style:normal}
    .selo{align-self:flex-start;border:1px solid #39ff14;color:#39ff14;border-radius:999px;padding:3px 10px;font-size:10px;font-weight:600} .selo.gold{border-color:#d9a93b;color:#d9a93b} .selo.info{border-color:#8ab4f8;color:#8ab4f8} .selo.{border-color:#8a948e;color:#8a948e} .com{font-size:11.5px}
    table{width:100%;border-collapse:collapse;font-size:11px} th{text-align:left;color:#8a948e;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:6px;border-bottom:1px solid #2a332d} td{padding:6px;border-bottom:1px solid #1e2521} td.r{text-align:right}
    .rod{margin-top:auto;font-size:9px;color:#8a948e;text-align:center} ul{margin:0;padding-left:18px;line-height:1.5}
    @media print{body{background:none}.pg{margin:0}.noprint{display:none!important}}</style></head><body>${BOTAO_PDF}
   <section class="pg capa"><img src="${LOGO_URL()}" alt=""><div class="sigla">${esc(p.nome)} ${ANO}</div>${t.area ? `<div class="regra" style="font-size:14px">${esc(t.area)}</div>` : ""}<div class="vibes">Análise curricular</div><div class="nome">${esc(t.nome)}</div>
    <div class="kpis" style="grid-template-columns:1fr;min-width:260px"><div class="kpi"><b>${d1(cp.total)} <span style="font-size:18px;color:#8a948e">/ ${d1(cp.max)}</span></b><span>PONTUAÇÃO ESTIMADA</span></div><div class="kpi g"><b>${d1(possivel)}</b><span>POSSÍVEL ATÉ ${p.prazoEnvio ? dBR(p.prazoEnvio) : hoje_br()}</span></div></div>
    <div class="rod">Estimativa feita pela MedEasy com os certificados enviados. A nota final é dada pela banca.</div></section>
   <section class="pg"><div class="topo">MEDEASY ANÁLISE CURRICULAR ${esc(p.nome)} ${ANO} · visão geral</div><h2>Onde você está</h2>
    <div class="kpis"><div class="kpi"><b>${d1(cp.total)}</b><span>nota atual</span></div><div class="kpi g"><b>${d1(possivel)}</b><span>possível até o prazo</span></div><div class="kpi"><b>${completos}</b><span>itens completos</span></div><div class="kpi g"><b>${crescer}</b><span>itens com espaço</span></div></div>
    <div class="card"><div class="lbl" style="margin-bottom:8px">Nota por item (verde é o que você tem, dourado é o que ainda dá para ganhar)</div><div class="graf">${itens.map(x => { const m = x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN; const w = m ? x.pts / m * 100 : 0, g = m ? ganho(x) / m * 100 : 0; return `<div class="gr"><span>${esc(x.item)}</span><div class="bar"><i style="width:${w}%"></i>${/aumentar|parcial/i.test(sit(x)) ? `<em style="left:${w}%;width:${g}%"></em>` : ""}</div><span class="n">${d1(x.pts)} / ${d1(m)}</span></div>`; }).join("")}</div></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Regras do edital que você precisa saber</div><p><b>Peso:</b> ${esc(e.peso || "")}</p><p><b>Envio:</b> ${esc(e.envio || "")}</p><p><b>Formato:</b> ${esc(e.formato || "")}</p>${e.obs ? `<p><b>Atenção:</b> ${esc(e.obs)}</p>` : ""}${p.prazoEnvio ? `<p><b>Prazo de envio:</b> ${dBR(p.prazoEnvio)}</p>` : ""}</div>
    <div class="rod">${esc(e.fichaFonte || "")}</div></section>
   ${paginasItens.join("")}
   <section class="pg"><div class="topo">MEDEASY ANÁLISE CURRICULAR ${esc(p.nome)} ${ANO} · plano</div><h2>Como aumentar a sua nota</h2>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Prioridades até o fim das inscrições</div>${prioridades.length ? `<ul>${prioridades.map(x => `<li><b>${esc(x.item)}</b>: até +${d1(ganho(x))}. ${esc(x.com || x.pontos || "")}</li>`).join("")}</ul>` : "<p>Você já completou tudo o que dá para completar até o prazo.</p>"}</div>
    ${longo.length ? `<div class="card"><div class="lbl" style="margin-bottom:6px">Médio prazo</div><ul>${longo.map(x => `<li><b>${esc(x.item)}</b>: ${esc(x.com || x.pontos || "")}</li>`).join("")}</ul></div>` : ""}
   </section>
   <section class="pg"><div class="topo">MEDEASY ANÁLISE CURRICULAR ${esc(p.nome)} ${ANO} · resumo</div><h2>Análise resumida</h2>
    <div class="card"><table><thead><tr><th>Item</th><th class="r">Nota</th><th class="r">Máximo</th><th>Situação</th></tr></thead><tbody>${itens.map(x => `<tr><td>${esc(x.item)}</td><td class="r">${d1(x.pts)}</td><td class="r">${d1(x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN)}</td><td>${esc(sit(x))}</td></tr>`).join("")}</tbody><tfoot><tr><td><b>Total</b></td><td class="r"><b>${d1(cp.total)}</b></td><td class="r"><b>${d1(cp.max)}</b></td><td></td></tr></tfoot></table></div></section>
   <section class="pg"><div class="topo">MEDEASY ANÁLISE CURRICULAR ${esc(p.nome)} ${ANO} · fechamento</div><h2>Considerações finais</h2>
    <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><b>${d1(cp.total)}</b><span>nota atual</span></div><div class="kpi g"><b>${d1(possivel)}</b><span>nota possível</span></div></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Checklist da inscrição</div><ul><li>Conferir se cada certificado tem nome, período, função e carga horária</li><li>Enviar no formato do edital: ${esc(e.formato || "ver edital")}</li><li>${esc(e.envio || "Conferir a data de envio no edital")}</li>${p.link ? `<li>Edital: ${esc(p.link)}</li>` : ""}</ul></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Datas importantes</div><ul>${p.prazoEnvio ? `<li>Fim do envio do currículo: ${dBR(p.prazoEnvio)}</li>` : ""}${p.dataProva ? `<li>Prova: ${dBR(p.dataProva)}</li>` : ""}${e.inscricao ? `<li>Inscrição: ${esc(e.inscricao)}</li>` : ""}${e.resultado ? `<li>Resultado: ${esc(e.resultado)}</li>` : ""}</ul></div>
    <p>A nota é uma estimativa feita a partir dos certificados que você enviou e das regras do edital. Quem decide a pontuação final é a banca. Qualquer dúvida, fale com o seu mentor.</p>
    <div class="rod">MedEasy · (62) 99515-5830 · medeasyy0@gmail.com · Goiânia, Goiás</div></section></body></html>`);
}
