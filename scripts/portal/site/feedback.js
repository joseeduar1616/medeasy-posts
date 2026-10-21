/* ---------- feedback dos clientes ---------- */
/* Página ?feedback (ou o botão no portal do cliente). Duas partes, as duas opcionais:
   1. Depoimento público: nota, texto e a assinatura que o cliente escolhe. Só vai para o site depois que a administração aprova.
   2. Particular e anônimo: vai sem o nome do cliente, só com o mentor. Só a administração vê. O mentor não vê.
   O envio passa pela ponte (/feedback/enviar), que confere o código do cliente e grava na base "Feedback MedEasy". */
const fbEstado = () => S.fb || (S.fb = { pub:{ nota:0, texto:"", assin:"inicial", provas:true, autoriza:true }, par:{ notaMentor:0, notaMedEasy:0, indicaria:"", texto:"" } });
const capWord = s => String(s || "").toLowerCase().replace(/^./, c => c.toUpperCase());
function assinaturas(nome){
  const ps = String(nome || "").trim().split(/\s+/).filter(Boolean); const p = capWord(ps[0]); const u = ps.length > 1 ? ps[ps.length - 1][0].toUpperCase() + "." : "";
  return [["inicial", u ? `${p} ${u}` : p], ["primeiro", p], ["anonimo", "Anônimo"]].filter(([k, t], i, a) => t && a.findIndex(x => x[1] === t) === i);
}
const mentoresDoPortal = p => (p.mentores || []).length ? p.mentores : [String((p.contato || {}).mentor || "").replace(/\s*\(MedEasy\)\s*$/, "")].filter(x => x && x !== "Equipe MedEasy");
const provasDoPortal = p => (p.provas || []).map(x => x.nome).filter(Boolean).join(", ");
function estrelas(campo, v, rotulo){
  return `<div class="stars" role="radiogroup" aria-label="${esc(rotulo)}">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= v ? "on" : ""}" data-a="fbNota" data-k="${campo}" data-v="${i}" role="radio" aria-checked="${i === v}" aria-label="${i} de 5">★</button>`).join("")}</div>`;
}
function feedbackCardView(p, preview){
  if (!(p.servicos || []).length) return "";
  const entregue = p.servicos.some(s => s.etapa === ULT);
  return `<section class="card"><div class="row between" style="gap:12px"><div style="flex:1;min-width:220px"><h2 style="margin:0 0 4px">${entregue ? "Como foi com a gente?" : "Como está sendo com a gente?"}</h2><p class="small muted" style="margin:0">Deixe um depoimento, se quiser, e um feedback anônimo que só a direção da MedEasy lê. O seu mentor não vê a parte anônima.</p></div>
    <button class="btn ${entregue ? "pri" : ""}" data-a="abrirFeedback" ${preview ? "disabled title=\"Na prévia não envia\"" : ""}>Deixar feedback</button></div></section>`;
}
function feedbackView(){
  const p = S.portal; const f = fbEstado();
  const topo = `<header class="top"><div class="wrap top-in"><img class="logo" src="${LOGO}" alt=""><div class="brand"><b>MED<i>EASY</i></b><span>Seu feedback</span></div><span style="flex:1"></span>${p ? `<button class="btn sm" data-a="fbVoltar">Voltar ao portal</button>` : ""}</div></header>`;
  const pe = `<p class="xs faint" style="text-align:center">MedEasy · @med_easyy · Goiânia, Goiás</p>`;
  if (!p) return `${topo}<main class="wrap portal stack" style="gap:16px;max-width:620px">
    <section class="hero"><div><div class="label gold">Seu feedback</div><h1>Como foi com a MedEasy?</h1><p>Para começar, digite o código de acesso que você recebeu no WhatsApp. Ele serve só para saber que você é cliente.</p></div></section>
    <form id="fFbCod" class="card stack"><label class="f"><span>Seu código de acesso</span><input class="in mono" id="fbCodigo" placeholder="XXXXX-XXXXX" autocapitalize="characters" required></label>
      <div class="err">${esc(S.erro)}</div><button class="btn pri" type="submit" ${S.carregando ? "disabled" : ""}>${S.carregando ? "Abrindo" : "Continuar"}</button></form>${pe}</main>`;
  if (f.enviado) return `${topo}<main class="wrap portal stack" style="gap:16px;max-width:620px">
    <section class="hero"><div><div class="label gold">Recebido</div><h1>Obrigado, ${esc(primeiro(p.nome))}</h1><p>${f.enviado.pub ? "O seu depoimento passa por uma conferência rápida e depois aparece no site. " : ""}${f.enviado.par ? "A parte anônima vai só para a direção da MedEasy. " : ""}Isso ajuda muito a gente a melhorar.</p></div></section>
    <button class="btn pri" data-a="fbVoltar">Voltar ao portal</button>${pe}</main>`;
  const ms = mentoresDoPortal(p); const quem = ms.length ? ms.join(" e ") : "seu mentor"; const provas = provasDoPortal(p);
  const ind = ["Sim", "Talvez", "Não"].map(o => `<button type="button" class="btn sm ${f.par.indicaria === o ? "pri" : ""}" data-a="fbIndica" data-v="${o}" aria-pressed="${f.par.indicaria === o}">${o}</button>`).join("");
  return `${topo}<main class="wrap portal stack" style="gap:16px;max-width:720px">
    <section class="hero"><div><div class="label gold">Seu feedback</div><h1>Como foi com a MedEasy?</h1><p>São duas partes e as duas são opcionais. Responda só o que quiser.</p></div></section>
    <section class="card stack"><div><h2 style="margin:0 0 4px">1. Depoimento público</h2><p class="small muted" style="margin:0">Pode aparecer no site da MedEasy para quem está pensando em fazer o currículo com a gente. Antes, a equipe confere.</p></div>
      <div class="f"><span>Sua nota para a MedEasy</span>${estrelas("pub.nota", f.pub.nota, "Nota do depoimento")}</div>
      <label class="f"><span>Seu depoimento</span><textarea class="in" data-fb="pub.texto" rows="4" maxlength="3000" placeholder="Conte como foi a sua experiência">${esc(f.pub.texto)}</textarea></label>
      <label class="f"><span>Como assinar</span><select class="in" data-fb="pub.assin">${assinaturas(p.nome).map(([k, t]) => `<option value="${k}" ${f.pub.assin === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
      ${provas ? `<label class="chk"><input type="checkbox" data-fb="pub.provas" ${f.pub.provas ? "checked" : ""}><span>Mostrar as minhas provas (${esc(provas)})</span></label>` : ""}
      <label class="chk"><input type="checkbox" data-fb="pub.autoriza" ${f.pub.autoriza ? "checked" : ""}><span>Autorizo a MedEasy a publicar este depoimento</span></label></section>
    <section class="card stack"><div><h2 style="margin:0 0 4px">2. Feedback particular e anônimo</h2><p class="small muted" style="margin:0">Só a direção da MedEasy lê. ${esc(quem)} não vê esta parte, e o seu nome não vai junto. Vai só o nome do mentor, para a gente saber de qual atendimento você está falando. Pode falar com toda a sinceridade, é assim que a gente melhora.</p></div>
      <div class="f"><span>Nota para o atendimento de ${esc(quem)}</span>${estrelas("par.notaMentor", f.par.notaMentor, "Nota do mentor")}</div>
      <div class="f"><span>Nota para a MedEasy em geral</span>${estrelas("par.notaMedEasy", f.par.notaMedEasy, "Nota da MedEasy")}</div>
      <div class="f"><span>Você indicaria a MedEasy para um amigo?</span><div class="row" style="gap:6px">${ind}</div></div>
      <label class="f"><span>O que foi bom e o que podemos melhorar?</span><textarea class="in" data-fb="par.texto" rows="4" maxlength="4000" placeholder="Prazo, atendimento, valor, o que achou do currículo">${esc(f.par.texto)}</textarea></label></section>
    <button class="btn pri" data-a="fbEnviar" ${S.fbEnviando ? "disabled" : ""}>${S.fbEnviando ? "Enviando" : "Enviar"}</button>
    <p class="xs muted" style="text-align:center;margin:0">Pode mandar só uma das partes.</p>${pe}</main>`;
}
function fbInput(el){
  const f = fbEstado(); const [a, k] = el.dataset.fb.split(".");
  f[a][k] = el.type === "checkbox" ? el.checked : el.value;
}
async function enviarFeedback(){
  const f = fbEstado(); const p = S.portal; if (!p || !S.codigo) return;
  const pubOk = !!(f.pub.texto.trim() || f.pub.nota); const parOk = !!(f.par.texto.trim() || f.par.notaMentor || f.par.notaMedEasy || f.par.indicaria);
  if (!pubOk && !parOk){ toast("Preencha pelo menos uma das partes"); return; }
  if (pubOk && !f.pub.autoriza){ toast("Marque a autorização para mandar o depoimento, ou apague o texto e a nota dele"); return; }
  if (!PONTE){ toast("O envio está fora do ar agora. Mande pelo WhatsApp do seu mentor"); return; }
  const assin = (assinaturas(p.nome).find(([k]) => k === f.pub.assin) || ["", "Anônimo"])[1];
  const corpo = { codigo:S.codigo, mentor:mentoresDoPortal(p),
    publico: pubOk ? { nota:f.pub.nota || null, texto:f.pub.texto.trim(), assinatura:assin, provas:f.pub.provas ? provasDoPortal(p) : "" } : null,
    particular: parOk ? { notaMentor:f.par.notaMentor || null, notaMedEasy:f.par.notaMedEasy || null, indicaria:f.par.indicaria, texto:f.par.texto.trim() } : null };
  S.fbEnviando = true; render();
  try {
    const r = await fetch(PONTE.replace(/\/$/, "") + "/feedback/enviar", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erro || ("erro " + r.status));
    f.enviado = { pub:pubOk, par:parOk }; window.scrollTo(0, 0);
  } catch (e) { toast("Não enviou: " + e.message); }
  S.fbEnviando = false; render();
}
/* Mensagem do mentor pedindo o feedback. Sem pressão: deixa claro que a parte anônima ele não vê. */
const linkFeedback = c => linkCliente(c) + "&feedback";
const pedidoFeedback = c => `Oi, ${primeiro(c.nome)}. Tudo bem? Queria te pedir um favor rápido. Conta pra gente como foi o seu currículo com a MedEasy. Leva uns 2 minutos.\n\nTem uma parte pública, se você quiser deixar um depoimento, e uma parte anônima que só a direção da MedEasy lê. Eu não vejo essa parte, então pode falar com toda a sinceridade.\n\nLink: ${linkFeedback(c)}`;

/* Depoimentos aprovados: página pública ?depoimentos */
async function carregarDepoimentos(){ try { const r = await fetch("data/depoimentos.json", { cache:"no-store" }); S.depo = r.ok ? await r.json() : []; } catch { S.depo = []; } render(); }
const mesAno = s => { const m = /^(\d{4})-(\d{2})/.exec(s || ""); return m ? `${MESES[+m[2] - 1]} de ${m[1]}` : ""; };
const estrelasFixas = n => n ? `<span class="gold" aria-label="${n} de 5" style="letter-spacing:2px">${"★".repeat(n)}<span style="color:var(--line)">${"★".repeat(5 - n)}</span></span>` : "";
function depoimentosView(){
  const ds = S.depo;
  return `<header class="top"><div class="wrap top-in"><img class="logo" src="${LOGO}" alt=""><div class="brand"><b>MED<i>EASY</i></b><span>Seu currículo para a residência</span></div><span style="flex:1"></span><a class="btn sm" href="./">Entrar</a></div></header>
  <main class="wrap portal stack" style="gap:16px">
    <section class="hero"><div><div class="label gold">Depoimentos</div><h1>O que dizem os nossos clientes</h1><p>Médicos que montaram o currículo da residência com a MedEasy.</p></div></section>
    ${ds == null ? `<div class="wait small">Carregando</div>` : !ds.length ? `<div class="empty">Os primeiros depoimentos aparecem aqui em breve.</div>`
      : `<div class="grid2">${ds.map(d => `<section class="card"><div class="row between">${estrelasFixas(d.nota)}<span class="xs muted">${esc(mesAno(d.mes))}</span></div>
        <p style="margin:10px 0 12px;white-space:pre-wrap">${esc(d.texto)}</p><div><b>${esc(d.nome)}</b>${d.provas ? `<div class="xs muted">${esc(d.provas)}</div>` : ""}${d.mentor ? `<div class="xs muted">Mentor: ${esc(d.mentor)}</div>` : ""}</div></section>`).join("")}</div>`}
    <section class="card"><div class="row between" style="gap:12px"><div><h2 style="margin:0 0 4px">Quer o seu currículo pronto para a residência?</h2><p class="small muted" style="margin:0">Fale com a equipe e receba o orçamento.</p></div><a class="btn pri" target="_blank" rel="noopener" href="${waLink(CONTATO.whats, "Oi! Vi os depoimentos no site e quero saber mais sobre o currículo para a residência.")}">Falar no WhatsApp</a></div></section>
    <p class="xs faint" style="text-align:center">MedEasy · @med_easyy · Goiânia, Goiás</p></main>`;
}

/* Aba Feedbacks da administração. Vem do admin.json, que só abre com a senha de administrador. */
function feedbacksView(){
  const alvoM = S.verMentor; const todos = (S.adminDados && S.adminDados.feedbacks) || [];
  const fs = todos.filter(f => !alvoM || semAcento(f.mentor).includes(semAcento(alvoM)));
  const pubs = fs.filter(f => f.tipo === "publico"), pars = fs.filter(f => f.tipo === "particular");
  const media = xs => { const v = xs.filter(x => x != null && x !== ""); return v.length ? (v.reduce((a, b) => a + num(b), 0) / v.length) : null; };
  const mMentor = media(pars.map(f => f.notaMentor)), mMed = media([...pars.map(f => f.notaMedEasy), ...pubs.map(f => f.nota)]);
  const comInd = pars.filter(f => f.indicaria); const pctSim = comInd.length ? Math.round(comInd.filter(f => f.indicaria === "Sim").length / comInd.length * 100) : null;
  const aprovar = pubs.filter(f => !f.publicar), publicados = pubs.filter(f => f.publicar);
  const quando = f => f.em ? mesAno(new Date(f.em).toISOString()) : "";
  const pubItem = f => `<div class="svc"><div class="row between" style="gap:8px">${estrelasFixas(f.nota)}<span class="xs muted">${esc(quando(f))}</span></div>
     ${f.texto ? `<p class="small" style="margin:8px 0;white-space:pre-wrap">${esc(f.texto)}</p>` : `<p class="small faint" style="margin:8px 0">Só a nota, sem texto</p>`}
     <div class="row between" style="gap:8px"><div class="xs muted"><b>${esc(f.nome)}</b>${f.provas ? " · " + esc(f.provas) : ""}${f.mentor ? " · mentor " + esc(f.mentor) : ""}</div>
     ${typeof temPonte === "function" && temPonte() && f.texto ? `<button class="btn sm ${f.publicar ? "ghost" : "pri"}" data-a="fbPublicar" data-id="${f.id}" data-v="${f.publicar ? "" : "1"}">${f.publicar ? "Tirar do site" : "Publicar no site"}</button>` : ""}</div></div>`;
  return `<div class="pagehead"><div><h1>Feedbacks</h1><p>O que os clientes mandam pela página de feedback${alvoM ? ` · ${esc(alvoM)}` : ""}. Só a administração vê esta aba.</p></div><div class="row"><button class="btn sm" data-a="copiarLinkDepo">Copiar link dos depoimentos</button></div></div>
   <div class="kpis"><div class="kpi"><div class="label">Nota dos mentores</div><div class="v gold">${mMentor == null ? "–" : d1(mMentor)}</div><div class="d">média no feedback anônimo</div></div>
    <div class="kpi"><div class="label">Nota da MedEasy</div><div class="v gold">${mMed == null ? "–" : d1(mMed)}</div><div class="d">média de tudo</div></div>
    <div class="kpi"><div class="label">Indicariam</div><div class="v">${pctSim == null ? "–" : pctSim + "%"}</div><div class="d">${comInd.length} ${comInd.length === 1 ? "resposta" : "respostas"}</div></div>
    <div class="kpi"><div class="label">Depoimentos</div><div class="v">${publicados.length}</div><div class="d">no site · ${aprovar.length} para conferir</div></div></div>
   <div class="grid2" style="margin-top:16px"><div class="stack">
    <section class="card"><div class="card-h"><h2>Depoimentos para conferir</h2>${aprovar.length ? `<span class="pill gold">${aprovar.length}</span>` : ""}</div>${aprovar.length ? `<div class="stack" style="gap:10px">${aprovar.map(pubItem).join("")}</div>` : `<div class="empty">Nada para conferir.</div>`}</section>
    <section class="card"><div class="card-h"><h2>No site</h2></div>${publicados.length ? `<div class="stack" style="gap:10px">${publicados.map(pubItem).join("")}</div>` : `<div class="empty">Nenhum depoimento publicado ainda.</div>`}</section>
   </div><div class="stack">
    <section class="card"><div class="card-h"><h2>Feedback anônimo</h2>${pars.length ? `<span class="pill">${pars.length}</span>` : ""}</div><p class="xs muted" style="margin:0 0 10px">Sem o nome do cliente. O mentor não vê esta parte.</p>
     ${pars.length ? `<div class="stack" style="gap:10px">${pars.map(f => `<div class="svc"><div class="row between" style="gap:8px"><span class="xs muted">${esc(quando(f))}${f.mentor ? " · mentor " + esc(f.mentor) : ""}</span>${f.indicaria ? `<span class="pill ${f.indicaria === "Sim" ? "ok" : f.indicaria === "Não" ? "" : "gold"}">Indicaria: ${esc(f.indicaria)}</span>` : ""}</div>
       <div class="row small" style="gap:16px;margin-top:6px">${f.notaMentor ? `<span>Mentor ${estrelasFixas(f.notaMentor)}</span>` : ""}${f.notaMedEasy ? `<span>MedEasy ${estrelasFixas(f.notaMedEasy)}</span>` : ""}</div>
       ${f.texto ? `<p class="small" style="margin:8px 0 0;white-space:pre-wrap">${esc(f.texto)}</p>` : ""}</div>`).join("")}</div>` : `<div class="empty">Nenhum feedback anônimo ainda.</div>`}</section>
   </div></div>
   <p class="xs muted" style="margin-top:12px">Para pedir feedback, abra o cliente e use "Pedir feedback". Os feedbacks novos aparecem aqui na próxima sincronização, em até 10 minutos. Tudo fica também na base "Feedback MedEasy" do Notion.</p>`;
}
const A_FB = {
  abrirFeedback: () => { S.modo = "feedback"; render(); window.scrollTo(0, 0); },
  fbVoltar: () => { S.modo = "cliente"; S.fb = null; history.replaceState(null, "", location.pathname); render(); window.scrollTo(0, 0); },
  fbNota: el => { const [a, k] = el.dataset.k.split("."); const f = fbEstado(); const v = +el.dataset.v; f[a][k] = f[a][k] === v ? 0 : v; render(); },
  fbIndica: el => { const f = fbEstado(); f.par.indicaria = f.par.indicaria === el.dataset.v ? "" : el.dataset.v; render(); },
  fbEnviar: () => enviarFeedback(),
  copiarPedidoFb: () => copiar(pedidoFeedback(S.eq.clientes.find(c => c.id === S.sel))),
  copiarLinkDepo: () => copiar(location.href.split("#")[0].split("?")[0] + "?depoimentos"),
  fbPublicar: async el => {
    const f = ((S.adminDados && S.adminDados.feedbacks) || []).find(x => x.id === el.dataset.id); if (!f) return; const pub = !!el.dataset.v;
    if (!pub && !confirm("Tirar este depoimento do site?")) return;
    try { await pontePedido("/feedback/publicar", { id:f.id, publicar:pub }); f.publicar = pub; render(); toast(pub ? "Publicado. Entra no site em 1 ou 2 minutos" : "Tirado do site. Some em 1 ou 2 minutos"); }
    catch (e) { toast("Não gravou: " + e.message); }
  },
};
