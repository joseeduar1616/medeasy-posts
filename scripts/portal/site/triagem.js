/* ---------- triagem: cliente novo, orçamento e PDFs ---------- */
/* PROVAS vem de editais.json na montagem do site (só nome e chave, nada de cliente) */
const PROVAS = __PROVAS__;
const TRI_KEY = "medeasy-triagem";
const SERVICOS_TRI = { vitae:"Currículo Vitae + análise curricular", analise:"Só a análise curricular", lattes:"Vitae + análise + Lattes", lattesb:"Lattes com documento de comprovação", naosei:"Ainda não sei" };
const ANO = "2027";

function lerTri(){ try { return JSON.parse(localStorage.getItem(TRI_KEY) || "[]"); } catch { return []; } }
function gravarTri(lista){ try { localStorage.setItem(TRI_KEY, JSON.stringify(lista)); } catch { toast("Não consegui gravar neste navegador"); } }
const triDe = id => lerTri().find(t => t.id === id);
function salvarTri(t){ const l = lerTri(); const i = l.findIndex(x => x.id === t.id); if (i >= 0) l[i] = t; else l.unshift(t); gravarTri(l); }
const novoIdTri = () => "t:" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
function editalJS(nome){ const E = S.eq?.editais || {}; const k = kP(nome); const e = Object.entries(E).find(([kk]) => k.startsWith(kk) || (kk.startsWith(k) && k.length >= 3)); return e ? e[1] : null; }
const nomeProva = k => (PROVAS.find(p => p.k === k) || {}).nome || k;
const tiposDe = s => ({ vitae:["vitae"], analise:["analise"], lattes:["vitae","lattes"], lattesb:["lattes","certificados"] })[s] || ["vitae"];
/* Cliente "de mentira" para reaproveitar a contagem por item e o cálculo do valor */
function clienteDaTriagem(t){
  const provas = (t.provas || []).map((k, i) => { const e = editalJS(nomeProva(k)); return { id:"p" + i, nome:nomeProva(k), edital:e, prazoEnvio:e?.prazoEnvio || "", dataProva:e?.dataProva || "", link:e?.link || "" }; });
  return { id:t.id, nome:t.nome || "Cliente novo", whatsapp:t.whats || "", provas, tipos:tiposDe(t.servico), nCert:t.nCert == null || t.nCert === "" ? null : num(t.nCert), nArtigos:0, servicos:[], contagem:{}, triagem:t };
}
const clienteSel = () => S.sel && String(S.sel).startsWith("t:") ? (triDe(S.sel) ? clienteDaTriagem(triDe(S.sel)) : null) : (S.eq?.clientes || []).find(x => x.id === S.sel);

/* Mensagem que o cliente novo manda pelo WhatsApp. O código no fim serve para importar no painel. */
function codigoTri(d){ return "#triagem:" + btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
function lerCodigoTri(texto){ const m = String(texto || "").match(/#triagem:([A-Za-z0-9+/=]+)/); if (!m) return null; try { return JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch { return null; } }
function mensagemTri(d){
  return `Oi! Preenchi a triagem do portal da MedEasy\n\nNome: ${d.nome}\nWhatsApp: ${d.whats}\nProvas: ${(d.provas || []).map(nomeProva).join(", ") || "ainda não sei"}\nEspecialidade: ${d.area || "não informada"}\nServiço: ${SERVICOS_TRI[d.servico] || "ainda não sei"}\nCertificados: ${d.nCert ? "uns " + d.nCert : "não contei"}\nDrive: ${d.links || "vou mandar os PDFs aqui"}\n${d.obs ? "Obs: " + d.obs + "\n" : ""}\n${codigoTri(d)}`;
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
      <div class="grid2" style="gap:10px"><label class="f"><span>Especialidade pretendida</span><input class="in" data-tri="area" value="${esc(d.area || "")}" placeholder="Ex.: Clínica Médica"></label>
      <label class="f"><span>O que você procura</span><select class="in" data-tri="servico">${Object.entries(SERVICOS_TRI).map(([k, t]) => `<option value="${k}" ${d.servico === k ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
      <div class="grid2" style="gap:10px"><label class="f"><span>Quantos certificados você tem, mais ou menos?</span><input class="in" data-tri="nCert" type="number" min="0" inputmode="numeric" value="${esc(d.nCert || "")}" placeholder="Pode ser um chute"></label>
      <label class="f"><span>Link do Drive com os certificados (se tiver)</span><input class="in" data-tri="links" value="${esc(d.links || "")}" placeholder="https://drive.google.com/..."></label></div>
      <label class="f"><span>Alguma observação? Prazo apertado, certificado que ainda vai chegar, dúvida</span><textarea class="in" data-tri="obs" rows="3">${esc(d.obs || "")}</textarea></label>
      <p class="xs muted" style="margin:0">Os certificados em PDF você manda direto na conversa do WhatsApp, depois de enviar este formulário. Se estiverem no Drive, deixe o link com acesso para quem tem o link.</p>
      <button class="btn pri" type="submit">Enviar pelo WhatsApp</button>
    </form>
    <p class="xs faint" style="text-align:center">MedEasy · @med_easyy · Goiânia, Goiás</p>
  </main>`;
}
function enviarTriagem(){
  const d = S.triForm; if (!d.nome || !d.whats){ toast("Preencha o nome e o WhatsApp"); return; }
  if (!d.provas.length && !confirm("Você não marcou nenhuma prova. Enviar assim mesmo?")) return;
  const dest = S.triDestino || CONTATO.whats; d.em = Date.now();
  window.open(waLink(dest, mensagemTri(d)), "_blank");
}

/* ---------- aba Triagem do mentor ---------- */
const linkTriagem = () => { const m = (S.eq.mentores || []).find(x => x.nome === S.mentor.nome); const tel = soDigitos(m?.telefone || "") || CONTATO.whats; return `${location.href.split("#")[0].split("?")[0]}?triagem=${tel}`; };
function importarTri(texto){
  const d = lerCodigoTri(texto); if (!d){ toast("Não achei o código #triagem na mensagem"); return; }
  const t = { id:novoIdTri(), em:Date.now(), nome:d.nome || "", whats:d.whats || "", area:d.area || "", provas:(d.provas || []).filter(k => PROVAS.some(p => p.k === k)), servico:SERVICOS_TRI[d.servico] && d.servico !== "naosei" ? d.servico : "vitae", nCert:d.nCert || "", links:d.links || "", obs:d.obs || "", cont:{}, etapa:"novo" };
  salvarTri(t); S.sel = t.id; S.view = "triagemItem"; render(); toast("Cliente importado");
}
function novaTri(){ const t = { id:novoIdTri(), em:Date.now(), nome:"", whats:"", area:"", provas:[], servico:"vitae", nCert:"", links:"", obs:"", cont:{}, etapa:"novo" }; salvarTri(t); S.sel = t.id; S.view = "triagemItem"; render(); }
const ETAPAS_TRI = { novo:["Chegou", "info"], orcado:["Orçamento enviado", "gold"], fechado:["Fechou", "ok"], perdido:["Não fechou", ""] };
function triagemView(){
  const lista = lerTri().sort((a, b) => (b.em || 0) - (a.em || 0));
  return `<div class="pagehead"><div><h1>Triagem</h1><p>Clientes novos antes de entrar no Notion. Fica guardado só neste navegador</p></div><div class="row"><button class="btn sm" data-a="copiarLinkTri">Copiar link de triagem</button><button class="btn sm pri" data-a="novaTri">Novo cliente</button></div></div>
   <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Importar da mensagem</h2></div><p class="xs muted" style="margin:0 0 8px">Cole aqui a mensagem que o cliente mandou pelo WhatsApp. O código no fim dela preenche tudo.</p><div class="row"><textarea class="in" id="triImport" rows="2" placeholder="Cole a mensagem inteira" style="flex:1"></textarea><button class="btn" data-a="importarTri">Importar</button></div></section>
   <section class="card" style="padding:4px">${lista.length ? lista.map(t => { const [et, k] = ETAPAS_TRI[t.etapa] || ETAPAS_TRI.novo; const c = clienteDaTriagem(t); const e = estimarJS(c); return `<div class="crow" data-a="abrirTri" data-id="${t.id}"><div style="min-width:0"><div class="t">${esc(t.nome || "Sem nome")}</div><div class="small muted">${esc((t.provas || []).map(nomeProva).join(", ") || "Sem prova")} · ${esc(SERVICOS_TRI[t.servico] || "")}</div></div><div class="hide-m"><span class="pill ${k}">${et}</span></div><div class="hide-m small num">${e && e.completo ? brl(e.total) : `<span class="faint">sem valor</span>`}</div><div class="xs muted">${dBR(new Date(t.em || 0).toISOString())}</div></div>`; }).join("") : `<div class="empty" style="margin:12px">Nenhum cliente em triagem. Mande o link de triagem ou importe uma mensagem.</div>`}</section>`;
}
/* Opções de orçamento, do mais simples ao mais completo */
function opcoesTri(t){
  const c = clienteDaTriagem(t); const ops = [];
  const extra = []; if (t.drive) extra.push({ desc:"Organização dos certificados no drive", conta:"1", valor:75 });
  const montar = (letra, titulo, tipos) => { const e = estimarJS({ ...c, tipos }); if (!e) return; const linhas = [...e.linhas, ...extra]; const bruto = r2(linhas.reduce((s, l) => s + (l.valor || 0), 0)); const desc = Math.min(10, Math.max(0, num(t.desconto))); ops.push({ letra, titulo, linhas, bruto, desconto:desc, total:r2(bruto * (1 - desc / 100)), completo:e.completo }); };
  const pedeLattes = c.provas.some(p => /unifesp/i.test(p.nome)); const quem = c.provas.filter(p => /unifesp/i.test(p.nome)).map(p => p.nome).join(", ");
  if (t.servico === "analise"){ montar("A", "ANÁLISE CURRICULAR", ["analise"]); montar("B", "CURRÍCULO VITAE + ANÁLISE CURRICULAR", ["vitae"]); }
  else if (t.servico === "lattesb"){ montar("A", "LATTES COM DOCUMENTO DE COMPROVAÇÃO", ["lattes","certificados"]); }
  else { montar("A", "CURRÍCULO VITAE + ANÁLISE CURRICULAR", ["vitae"]); if (t.servico === "lattes" || pedeLattes) montar("B", `VITAE + ANÁLISE CURRICULAR + LATTES${quem ? ` (${quem})` : ""}`, ["vitae","lattes"]); }
  return ops;
}
function mensagemOrcamento(t, ops){
  const c = clienteDaTriagem(t); const provas = c.provas.map(p => p.nome);
  const porProva = o => o.linhas.filter(l => l.valor != null && /:/.test(l.desc)).map(l => `${l.desc.split(":")[0]} ${brl(l.valor)}`).join(", ");
  const blocos = ops.map((o, i) => `OPÇÃO ${o.letra}: ${brl(o.total)}\n${i === 0 ? `${/ANÁLISE CURRICULAR$/.test(o.titulo) && !/VITAE/.test(o.titulo) ? "Análise curricular" : "Currículo e análise curricular"} ${provas.length === 1 ? "da prova" : `das ${provas.length} provas`} (${porProva(o)})` : `Tudo da opção ${ops[i - 1].letra} + ${/LATTES/.test(o.titulo) ? "a atualização do seu Currículo Lattes" : "o documento pronto para envio"}`}${o.desconto ? `\nJá com ${o.desconto}% de desconto` : ""}`).join("\n\n");
  const prox = c.provas.filter(p => p.prazoEnvio && dias(p.prazoEnvio) >= 0).sort((a, b) => a.prazoEnvio.localeCompare(b.prazoEnvio))[0];
  return `Oi, ${primeiro(t.nome)}! Tudo bem? Segue o seu orçamento para ${provas.join(", ") || "a sua prova"} ${ANO}\n\nEm cada prova fazemos a análise curricular com projeção de nota e a seleção dos certificados que pontuam no edital, e deixamos o documento pronto para envio\n\n${blocos}${prox ? `\n\nAtenção ao ${prox.nome}: o envio do currículo termina em ${dBR(prox.prazoEnvio)}` : ""}\n\nO pagamento é 50% na contratação e o restante depois da versão para conferência`;
}
function textoNotionTri(t){ const c = clienteDaTriagem(t); const cont = textoCont(c, (carregarCont(c).provas) || {}); return `${t.nome}\nTelefone: ${t.whats}\nTipo de serviço: ${tiposDe(t.servico).join(", ")}, ${c.provas.map(p => p.nome).join(", ")}\n${t.area ? "Especialidade: " + t.area + "\n" : ""}${t.links ? "Drive: " + t.links + "\n" : ""}${cont ? "\nCertificados por item:\n" + cont : ""}`; }
function triagemItemView(){
  const t = triDe(S.sel); if (!t) return triagemView();
  const c = clienteDaTriagem(t); const ops = opcoesTri(t); const [et, k] = ETAPAS_TRI[t.etapa] || ETAPAS_TRI.novo;
  const chk = (kk, nome) => `<label class="chk"><input type="checkbox" data-tri="prova" value="${kk}" ${(t.provas || []).includes(kk) ? "checked" : ""}><span>${esc(nome)}</span></label>`;
  return `<div class="pagehead"><div><button class="btn ghost sm" data-a="nav" data-v="triagem" style="margin-left:-10px">‹ Triagem</button><h1>${esc(t.nome || "Cliente novo")}</h1><div class="row" style="margin-top:6px"><span class="pill ${k}">${et}</span>${t.area ? `<span class="pill ok">${esc(t.area)}</span>` : ""}</div></div>
    <div class="row">${t.whats ? `<a class="btn" href="${waLink(t.whats, "Oi, " + primeiro(t.nome) + "!")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}<select class="in" id="triEtapa" style="width:auto">${Object.entries(ETAPAS_TRI).map(([kk, [tt]]) => `<option value="${kk}" ${t.etapa === kk ? "selected" : ""}>${tt}</option>`).join("")}</select><button class="btn sm danger" data-a="apagarTri">Apagar</button></div></div>
   <div class="grid2"><div class="stack">
    <section class="card"><div class="card-h"><h2>Dados</h2></div><div class="stack" style="gap:10px">
      <div class="grid2" style="gap:10px"><label class="f"><span>Nome</span><input class="in" data-tri="nome" value="${esc(t.nome || "")}"></label><label class="f"><span>WhatsApp</span><input class="in" data-tri="whats" value="${esc(t.whats || "")}" inputmode="tel"></label></div>
      <div class="grid2" style="gap:10px"><label class="f"><span>Especialidade</span><input class="in" data-tri="area" value="${esc(t.area || "")}"></label><label class="f"><span>Serviço</span><select class="in" data-tri="servico">${Object.entries(SERVICOS_TRI).filter(([kk]) => kk !== "naosei").map(([kk, tt]) => `<option value="${kk}" ${t.servico === kk ? "selected" : ""}>${tt}</option>`).join("")}</select></label></div>
      <div class="f"><span>Provas</span><div class="chks">${PROVAS.map(p => chk(p.k, p.nome)).join("")}</div></div>
      <div class="grid2" style="gap:10px"><label class="f"><span>Certificados (quando não contou por item)</span><input class="in" data-tri="nCert" type="number" min="0" value="${esc(t.nCert || "")}"></label><label class="f"><span>Desconto (%)</span><input class="in" data-tri="desconto" type="number" min="0" max="10" value="${esc(t.desconto || "")}" placeholder="0"></label></div>
      <label class="chk"><input type="checkbox" data-tri="drive" ${t.drive ? "checked" : ""}><span>Cobrar organização do drive (R$ 75,00)</span></label>
      <label class="f"><span>Links do Drive</span><input class="in" data-tri="links" value="${esc(t.links || "")}"></label>
      <label class="f"><span>Observações</span><textarea class="in" data-tri="obs" rows="2">${esc(t.obs || "")}</textarea></label></div></section>
    <section class="card"><div class="card-h"><h2>Provas</h2></div>${c.provas.length ? `<div class="list">${c.provas.map(p => { const cp = calcDe(c, p); return `<div class="li"><div class="grow"><div class="t">${esc(p.nome)} ${ANO}</div><div class="small muted">${p.prazoEnvio ? "Envio até " + dBR(p.prazoEnvio) + " (" + quando(p.prazoEnvio) + ")" : "Sem prazo cadastrado"}${p.dataProva ? " · prova " + dBR(p.dataProva) : ""}</div></div>${cp.tem ? `<b class="num">${d1(cp.total)} / ${d1(cp.max)}</b>` : ""}</div>`; }).join("")}</div>` : `<div class="empty">Marque as provas acima</div>`}</section>
   </div><div class="stack">
    <section class="card"><div class="card-h"><h2>Orçamento</h2>${ops.length && ops.every(o => o.completo) ? `<span class="pill ok">Pronto</span>` : `<span class="pill">Falta contagem</span>`}</div>
      ${ops.length ? ops.map(o => `<div class="svc" style="margin-bottom:10px"><div class="row between"><b>Opção ${o.letra}</b><b class="num gold">${brl(o.total)}</b></div><div class="xs muted">${esc(o.titulo)}${o.desconto ? ` · ${o.desconto}% de desconto` : ""}</div><div class="tbl-wrap"><table class="tbl"><tbody>${o.linhas.map(l => `<tr><td class="small">${esc(l.desc)}<div class="xs muted">${esc(l.conta)}</div></td><td class="r num" style="white-space:nowrap">${l.valor == null ? "–" : brl(l.valor)}</td></tr>`).join("")}</tbody></table></div></div>`).join("") : `<div class="empty">Marque as provas e conte os certificados</div>`}
      <div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="pdfOrc" ${ops.length ? "" : "disabled"}>PDF do orçamento</button><button class="btn sm" data-a="copiarMsgOrc" ${ops.length ? "" : "disabled"}>Copiar mensagem</button>${t.whats && ops.length ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(t.whats, mensagemOrcamento(t, ops))}">Mandar no WhatsApp</a>` : ""}</div></section>
    <section class="card"><div class="card-h"><h2>Análise curricular</h2></div><p class="xs muted" style="margin:0 0 10px">Conte os certificados por item lá embaixo e escreva o comentário de cada item. O PDF sai no estilo MedEasy, uma prova por vez.</p><div class="row">${c.provas.map(p => `<button class="btn sm ${calcDe(c, p).tem ? "pri" : ""}" data-a="pdfAnalise" data-v="${kP(p.nome)}">PDF ${esc(p.nome)}</button>`).join("") || `<span class="xs muted">Sem prova</span>`}</div></section>
    <section class="card"><div class="card-h"><h2>Quando fechar</h2></div><p class="xs muted" style="margin:0 0 10px">Crie o cliente no Notion e cole o texto abaixo. Na próxima sincronização ele entra no painel com a contagem e o código de acesso.</p><button class="btn sm" data-a="copiarNotionTri">Copiar dados para o Notion</button></section>
   </div></div>
   <div style="margin-top:16px">${certItensView(c)}</div>`;
}
function triInput(el){
  const campo = el.dataset.tri; const t = S.modo === "triagem" ? S.triForm : triDe(S.sel); if (!t) return;
  if (campo === "prova"){ const set = new Set(t.provas || []); el.checked ? set.add(el.value) : set.delete(el.value); t.provas = PROVAS.map(p => p.k).filter(k => set.has(k)); }
  else if (el.type === "checkbox") t[campo] = el.checked; else t[campo] = el.value;
  if (S.modo === "triagem") return;
  salvarTri(t); delete S.cont[t.id];
  if (campo === "prova" || campo === "servico" || campo === "nCert" || campo === "desconto" || campo === "drive") render();
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
    <div class="tabela"><img class="marca" src="${LOGO_URL()}" alt=""><table><thead><tr><th>DESCRIÇÃO</th><th>QUANTIDADE</th><th>VALOR</th></tr></thead><tbody>${o.linhas.map(l => `<tr><td>${esc(l.desc.replace(/^([^:]+):/, `$1 ${ANO}:`))}</td><td>${esc(l.conta)}</td><td>${l.valor == null ? "a definir" : "R$" + br2(l.valor)}</td></tr>`).join("")}${o.desconto ? `<tr><td>Desconto de ${o.desconto}%</td><td></td><td>- R$${br2(o.bruto - o.total)}</td></tr>` : ""}</tbody></table></div>
    <div class="total">VALOR TOTAL: R$ ${br2(o.total)}</div>
    <p class="nota">Valor estimado com os certificados recebidos. Pode variar em até 3 certificados para mais ou para menos após a conferência completa de cada edital. Pagamento de 50% na contratação e o restante após a versão para conferência.</p>
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
  const card = (x, i) => `<article class="item"><div class="n">${i + 1}</div><h3>${esc(x.item)}</h3><p class="regra">${esc(x.pontos || "")}</p>
    <div class="pils">${pil(d1(x.maxN), "máximo")}${x.unit != null ? pil(d1(x.unit), "por atividade") : ""}${pil(d1(x.pts), "sua nota")}${ganho(x) > 0 && !/n[aã]o se aplica/i.test(sit(x)) ? pil("+" + d1(ganho(x)), "possível") : ""}</div>
    ${x.lista.length ? `<div class="lbl">Comprovantes</div><ol>${x.lista.map((l, j) => `<li>${esc(l)}${x.unit != null && (j + 1) * x.unit > x.maxN ? " <em>(reserva)</em>" : ""}</li>`).join("")}</ol>` : x.n ? `<div class="lbl">Comprovantes</div><p class="regra">${x.n} ${x.n === 1 ? "certificado" : "certificados"}</p>` : ""}
    <div class="selo ${SELO[sit(x)] || ""}">${esc(sit(x))}</div>${x.com ? `<p class="com">${esc(x.com)}</p>` : ""}</article>`;
  const paginasItens = []; for (let i = 0; i < itens.length; i += 2) paginasItens.push(`<section class="pg"><div class="topo">${esc(p.nome)} ${ANO} · itens ${i + 1}${itens[i + 1] ? " e " + (i + 2) : ""} de ${itens.length}</div>${card(itens[i], i)}${itens[i + 1] ? card(itens[i + 1], i + 1) : ""}</section>`);
  const prioridades = itens.filter(x => ganho(x) > 0 && /aumentar|parcial/i.test(sit(x))).sort((a, b) => ganho(b) - ganho(a));
  const longo = itens.filter(x => /m[eé]dio/i.test(sit(x)));
  abrirDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Análise curricular ${esc(t.nome)} ${esc(p.nome)}</title>${FONTES}<style>
    @page{size:A4;margin:0} *{box-sizing:border-box} body{margin:0;background:#333;font-family:Poppins,sans-serif;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12px}
    .pg{width:210mm;min-height:297mm;background:#0d0f0e;margin:12px auto;padding:16mm 14mm;position:relative;page-break-after:always;display:flex;flex-direction:column;gap:10px}
    h1,h2,h3{font-family:Anton,sans-serif;font-weight:400;letter-spacing:.01em;margin:0} h1{font-size:40px;color:#39ff14;line-height:1.05} h2{font-size:22px;color:#39ff14} h3{font-size:16px;color:#fff}
    .vibes{font-family:"Great Vibes",cursive;color:#d9a93b;font-size:54px;line-height:1} .topo{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a948e}
    .capa{justify-content:center;align-items:center;text-align:center;gap:18px} .capa .sigla{font-family:Anton,sans-serif;font-size:72px;color:#fff} .capa .nome{font-size:20px;font-weight:600} .capa img{width:120px}
    .card{background:#161a18;border-radius:16px;padding:14px 16px} p{margin:0;text-align:justify;line-height:1.5}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px} .kpi{background:#161a18;border-radius:14px;padding:12px;text-align:center} .kpi b{display:block;font-family:Anton,sans-serif;font-size:30px;color:#39ff14} .kpi.g b{color:#d9a93b} .kpi span{font-size:10px;color:#8a948e;text-transform:uppercase;letter-spacing:.08em}
    .graf{display:flex;flex-direction:column;gap:5px} .gr{display:grid;grid-template-columns:150px 1fr 60px;gap:8px;align-items:center;font-size:10px} .gr .bar{height:9px;background:#243028;border-radius:999px;position:relative;overflow:hidden} .gr .bar i{position:absolute;left:0;top:0;bottom:0;background:#39ff14;border-radius:999px} .gr .bar em{position:absolute;top:0;bottom:0;background:#d9a93b;opacity:.75} .gr .n{text-align:right;font-weight:600}
    .item{background:#161a18;border-radius:16px;padding:16px 18px;flex:1;position:relative;display:flex;flex-direction:column;gap:7px;min-height:0} .item .n{position:absolute;right:16px;top:14px;font-family:Anton,sans-serif;font-size:34px;color:#243028} .regra{color:#c9d1cc;font-size:11px}
    .pils{display:flex;gap:8px;flex-wrap:wrap} .pil{display:inline-flex;align-items:center;gap:0;font-size:11px} .pil i{font-style:normal;background:#39ff14;color:#0d0f0e;font-weight:700;border-radius:999px;padding:4px 9px;min-width:30px;text-align:center} .pil b{background:#fff;color:#0d0f0e;border-radius:0 999px 999px 0;padding:4px 9px;font-weight:600}
    .lbl{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#8a948e;margin-top:2px} ol{margin:0;padding-left:18px;font-size:11px;line-height:1.5} em{color:#d9a93b;font-style:normal}
    .selo{align-self:flex-start;border:1px solid #39ff14;color:#39ff14;border-radius:999px;padding:3px 10px;font-size:10px;font-weight:600} .selo.gold{border-color:#d9a93b;color:#d9a93b} .selo.info{border-color:#8ab4f8;color:#8ab4f8} .selo.{border-color:#8a948e;color:#8a948e} .com{font-size:11.5px}
    table{width:100%;border-collapse:collapse;font-size:11px} th{text-align:left;color:#8a948e;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:6px;border-bottom:1px solid #2a332d} td{padding:6px;border-bottom:1px solid #1e2521} td.r{text-align:right}
    .rod{margin-top:auto;font-size:9px;color:#8a948e;text-align:center} ul{margin:0;padding-left:18px;line-height:1.5}
    @media print{body{background:none}.pg{margin:0}.noprint{display:none!important}}</style></head><body>${BOTAO_PDF}
   <section class="pg capa"><img src="${LOGO_URL()}" alt=""><div class="sigla">${esc(p.nome)}</div><div class="vibes">Análise curricular</div><div class="nome">${esc(t.nome)}</div><div class="card" style="min-width:220px"><span class="lbl">Pontuação estimada</span><div style="font-family:Anton,sans-serif;font-size:44px;color:#39ff14">${d1(cp.total)} <span style="font-size:20px;color:#8a948e">/ ${d1(cp.max)}</span></div></div><div class="rod">Estimativa feita pela MedEasy com os certificados enviados. A nota final é dada pela banca.</div></section>
   <section class="pg"><div class="topo">Visão geral</div><h2>Onde você está</h2>
    <div class="kpis"><div class="kpi"><b>${d1(cp.total)}</b><span>nota atual</span></div><div class="kpi g"><b>${d1(possivel)}</b><span>possível até o prazo</span></div><div class="kpi"><b>${completos}</b><span>itens completos</span></div><div class="kpi g"><b>${crescer}</b><span>itens com espaço</span></div></div>
    <div class="card"><div class="lbl" style="margin-bottom:8px">Nota por item (verde é o que você tem, dourado é o que ainda dá para ganhar)</div><div class="graf">${itens.map(x => { const m = x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN; const w = m ? x.pts / m * 100 : 0, g = m ? ganho(x) / m * 100 : 0; return `<div class="gr"><span>${esc(x.item)}</span><div class="bar"><i style="width:${w}%"></i>${/aumentar|parcial/i.test(sit(x)) ? `<em style="left:${w}%;width:${g}%"></em>` : ""}</div><span class="n">${d1(x.pts)} / ${d1(m)}</span></div>`; }).join("")}</div></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Regras principais do edital</div><p><b>Peso:</b> ${esc(e.peso || "")}</p><p><b>Envio:</b> ${esc(e.envio || "")}</p><p><b>Formato:</b> ${esc(e.formato || "")}</p>${e.obs ? `<p><b>Atenção:</b> ${esc(e.obs)}</p>` : ""}${p.prazoEnvio ? `<p><b>Prazo de envio:</b> ${dBR(p.prazoEnvio)}</p>` : ""}</div>
    <div class="rod">${esc(e.fichaFonte || "")}</div></section>
   ${paginasItens.join("")}
   <section class="pg"><div class="topo">Plano</div><h2>Como aumentar a sua nota</h2>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Prioridades até o fim das inscrições</div>${prioridades.length ? `<ul>${prioridades.map(x => `<li><b>${esc(x.item)}</b>: até +${d1(ganho(x))}. ${esc(x.com || x.pontos || "")}</li>`).join("")}</ul>` : "<p>Você já completou tudo o que dá para completar até o prazo.</p>"}</div>
    ${longo.length ? `<div class="card"><div class="lbl" style="margin-bottom:6px">Médio prazo</div><ul>${longo.map(x => `<li><b>${esc(x.item)}</b>: ${esc(x.com || x.pontos || "")}</li>`).join("")}</ul></div>` : ""}
   </section>
   <section class="pg"><div class="topo">Resumo</div><h2>Análise resumida</h2>
    <div class="card"><table><thead><tr><th>Item</th><th class="r">Nota</th><th class="r">Máximo</th><th>Situação</th></tr></thead><tbody>${itens.map(x => `<tr><td>${esc(x.item)}</td><td class="r">${d1(x.pts)}</td><td class="r">${d1(x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN)}</td><td>${esc(sit(x))}</td></tr>`).join("")}</tbody><tfoot><tr><td><b>Total</b></td><td class="r"><b>${d1(cp.total)}</b></td><td class="r"><b>${d1(cp.max)}</b></td><td></td></tr></tfoot></table></div></section>
   <section class="pg"><div class="topo">Fechamento</div><h2>Considerações finais</h2>
    <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><b>${d1(cp.total)}</b><span>nota atual</span></div><div class="kpi g"><b>${d1(possivel)}</b><span>nota possível</span></div></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Checklist da inscrição</div><ul><li>Conferir se cada certificado tem nome, período, função e carga horária</li><li>Enviar no formato do edital: ${esc(e.formato || "ver edital")}</li><li>${esc(e.envio || "Conferir a data de envio no edital")}</li>${p.link ? `<li>Edital: ${esc(p.link)}</li>` : ""}</ul></div>
    <div class="card"><div class="lbl" style="margin-bottom:6px">Datas importantes</div><ul>${p.prazoEnvio ? `<li>Fim do envio do currículo: ${dBR(p.prazoEnvio)}</li>` : ""}${p.dataProva ? `<li>Prova: ${dBR(p.dataProva)}</li>` : ""}${e.inscricao ? `<li>Inscrição: ${esc(e.inscricao)}</li>` : ""}${e.resultado ? `<li>Resultado: ${esc(e.resultado)}</li>` : ""}</ul></div>
    <p>A nota é uma estimativa feita a partir dos certificados que você enviou e das regras do edital. Quem decide a pontuação final é a banca. Qualquer dúvida, fale com o seu mentor.</p>
    <div class="rod">MedEasy · (62) 99515-5830 · medeasyy0@gmail.com · Goiânia, Goiás</div></section></body></html>`);
}
