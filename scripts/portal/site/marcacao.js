/* ---------- marcação do cliente: o que ele já tem em cada item do edital ---------- */
/* Fica no navegador do cliente. O botão Enviar para o mentor manda pelo WhatsApp um link que importa no painel. */
const MARC_ST = { nao:"Não tenho", andamento:"Em andamento", tenho:"Já tenho", na:"Não se aplica" };
const marcKey = () => "medeasy-marc-" + (S.portal?.id || "x");
function lerMarc(){ try { return JSON.parse(localStorage.getItem(marcKey()) || "{}"); } catch { return {}; } }
function gravarMarc(m){ try { localStorage.setItem(marcKey(), JSON.stringify(m)); } catch {} }
/* Conta a partir da marcação: atual só com "Já tenho", meta também com "Em andamento" */
function calcMarc(p, m){
  const itens = itensDaProva(p); const reg = {}, regMeta = {};
  for (const it of itens){ const x = (m || {})[it.key]; if (!x) continue;
    const n = it.unit != null ? Math.max(0, Math.floor(num(x.n))) : 0; const pts = it.unit == null && x.st === "tenho" ? (x.pts === "" || x.pts == null ? it.maxN : num(x.pts)) : "";
    if (x.st === "tenho"){ reg[it.key] = { n, pts }; regMeta[it.key] = { n, pts }; }
    else if (x.st === "andamento"){ regMeta[it.key] = { n:Math.max(1, n), pts:it.unit == null ? it.maxN : "" }; } }
  const atual = calcProva(itens, reg, tetoDe(p)), meta = calcProva(itens, regMeta, tetoDe(p));
  const faltam = atual.rows.map((x, i) => { const st = ((m || {})[x.key] || {}).st || "nao"; const mx = x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN; return { x, st, falta:r2(mx - x.pts) }; }).filter(f => f.falta > 0.001 && f.st !== "na").sort((a, b) => b.falta - a.falta);
  return { itens, atual, meta, faltam };
}
function marcacaoView(pv){
  const p = pv; if (!p.edital || !(p.edital.ficha || []).length || p.fonte === "analise") return "";
  const m = lerMarc()[kP(p.nome)] || {}; const r = calcMarc(p, m); const pk = kP(p.nome);
  const marcou = Object.keys(m).length;
  return `<div class="hr"></div>
   <div class="row between"><div><div class="label gold">Marque o que você já tem</div><div class="small muted">A nota se atualiza na hora. Isso fica só no seu celular até você enviar para o mentor.</div></div>
    ${marcou ? `<div style="text-align:right"><div class="score" style="font-size:28px">${d1(r.atual.total)}<small> / ${d1(r.atual.max)}</small></div><div class="xs gold">meta ${d1(r.meta.total)} com o que está em andamento</div></div>` : ""}</div>
   <div class="bar" style="margin-top:10px;height:8px;position:relative"><i style="width:${r.atual.max ? r.atual.total / r.atual.max * 100 : 0}%"></i><i style="position:absolute;left:${r.atual.max ? r.atual.total / r.atual.max * 100 : 0}%;width:${r.atual.max ? (r.meta.total - r.atual.total) / r.atual.max * 100 : 0}%;background:var(--gold);opacity:.6"></i></div>
   <div class="stack" style="gap:8px;margin-top:12px">${r.itens.map((it, i) => { const x = m[it.key] || {}; const st = x.st || "nao"; const row = r.atual.rows[i];
     return `<div class="svc" style="padding:10px 12px"><div class="row between" style="gap:8px"><div style="min-width:0"><div class="small" style="font-weight:600">${esc(it.item)}</div><div class="xs muted">${esc(it.pontos || "")}</div></div><b class="num ${row.pts >= it.maxN ? "neon" : "muted"}" style="white-space:nowrap">${d1(row.pts)} / ${d1(it.maxN)}</b></div>
       <div class="row" style="margin-top:8px;gap:6px"><select class="in" data-marc="st" data-pk="${pk}" data-key="${esc(it.key)}" style="width:auto;flex:1;min-width:140px">${Object.entries(MARC_ST).map(([k, t]) => `<option value="${k}" ${st === k ? "selected" : ""}>${t}</option>`).join("")}</select>
       ${it.unit != null && (st === "tenho" || st === "andamento") ? `<input class="in num" type="number" min="0" step="1" inputmode="numeric" data-marc="n" data-pk="${pk}" data-key="${esc(it.key)}" value="${x.n || ""}" placeholder="quantos" style="width:92px">` : ""}
       ${it.unit == null && st === "tenho" ? `<input class="in num" type="number" min="0" step="0.01" inputmode="decimal" data-marc="pts" data-pk="${pk}" data-key="${esc(it.key)}" value="${x.pts ?? ""}" placeholder="pontos" title="Se não souber, deixe em branco que conta o máximo" style="width:92px">` : ""}</div></div>`; }).join("")}</div>
   ${r.faltam.length && marcou ? `<div class="label" style="margin:14px 0 6px">O que falta, do que vale mais</div><div class="stack" style="gap:6px">${r.faltam.slice(0, 6).map(f => `<div class="pend" style="padding:8px 12px"><div class="grow small"><b>${esc(f.x.item)}</b>${f.st === "andamento" ? ` <span class="pill gold">em andamento</span>` : ""}<div class="xs muted">${esc(f.x.pontos || "")}</div></div><b class="num gold">+${d1(f.falta)}</b></div>`).join("")}</div>` : ""}
   <div class="row" style="margin-top:12px"><button class="btn sm pri" data-a="enviarMarc" data-pk="${pk}" ${marcou ? "" : "disabled"}>Enviar para o mentor</button><button class="btn sm ghost" data-a="limparMarc" data-pk="${pk}" ${marcou ? "" : "disabled"}>Limpar</button></div>`;
}
function marcInput(el){
  const all = lerMarc(); const m = (all[el.dataset.pk] ||= {}); const x = (m[el.dataset.key] ||= { st:"nao" });
  if (el.dataset.marc === "st") x.st = el.value; else if (el.dataset.marc === "n") x.n = el.value; else x.pts = el.value;
  if (x.st === "nao" && !x.n && (x.pts === undefined || x.pts === "")) delete m[el.dataset.key];
  gravarMarc(all); render();
}
const codigoMarc = d => btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function enviarMarc(pk){
  const p = (S.portal.provas || []).find(x => kP(x.nome) === pk); if (!p) return; const m = lerMarc()[pk] || {}; const r = calcMarc(p, m); const ct = S.portal.contato || CONTATO;
  const link = `${location.href.split("#")[0].split("?")[0]}?m=${codigoMarc({ id:S.portal.id, nome:S.portal.nome, prova:p.nome, m, em:Date.now() })}`;
  const txt = `Oi, ${ct.mentor.split(" ")[0]}! Marquei no portal o que já tenho para ${p.nome}\n\nNota atual: ${d1(r.atual.total)} de ${d1(r.atual.max)}\nMeta com o que está em andamento: ${d1(r.meta.total)}\n${Object.values(m).filter(x => x.st === "tenho").length} itens já tenho, ${Object.values(m).filter(x => x.st === "andamento").length} em andamento\n\nAbrir no painel: ${link}`;
  window.open(waLink(ct.whats, txt), "_blank");
}
/* No painel do mentor: o link ?m= vira a contagem por item do cliente (rascunho) */
function importarMarc(codigo){
  let d; try { d = JSON.parse(decodeURIComponent(escape(atob(codigo.replace(/-/g, "+").replace(/_/g, "/"))))); } catch { toast("Link de marcação inválido"); return; }
  const c = (S.eq.clientes || []).find(x => x.id === d.id); if (!c){ toast(`Não achei o cliente ${d.nome || ""} no painel`); return; }
  const p = (c.provas || []).find(x => kP(x.nome) === kP(d.prova)); if (!p){ toast(`${c.nome} não tem a prova ${d.prova} no Notion`); return; }
  const reg = carregarCont(c); const pk = kP(p.nome); const itens = itensDaProva(p); const pr = (reg.provas[pk] ||= {});
  for (const it of itens){ const x = (d.m || {})[it.key]; if (!x) continue; const r = (pr[it.key] ||= { ...(it.base || {}) });
    if (x.st === "tenho"){ r.n = it.unit != null ? Math.max(0, Math.floor(num(x.n))) : 0; r.pts = it.unit == null ? (x.pts === "" || x.pts == null ? it.maxN : num(x.pts)) : ""; r.sit = ""; }
    else if (x.st === "andamento"){ r.sit = "Aumentar agora"; r.com = r.com || `Cliente marcou em andamento${x.n ? ` (${x.n})` : ""}`; }
    else if (x.st === "na"){ r.sit = "Não se aplica agora"; } }
  reg.rascunho = true; reg.copiado = false; gravarRasc(c.id);
  S.sel = c.id; S.view = "cliente"; (S.ciProva ||= {})[c.id] = pk; render(); window.scrollTo(0, 0); toast(`Marcação de ${primeiro(c.nome)} para ${p.nome} importada como rascunho. Confira e copie para o Notion`);
}

/* ---------- certificados do cliente: ele escolhe os PDFs no celular e manda a lista ao mentor ---------- */
/* Os arquivos são lidos no aparelho dele e não sobem. Vai só a lista, num link ?k= que entra no controle do mentor. */
const certsCliKey = () => "medeasy-certs-" + (S.portal?.id || "x");
const lerCertsCli = () => { try { return JSON.parse(localStorage.getItem(certsCliKey()) || "[]"); } catch { return []; } };
const gravarCertsCli = l => { try { localStorage.setItem(certsCliKey(), JSON.stringify(l)); } catch {} };
function certsClienteView(){
  const l = lerCertsCli();
  return `<section class="card"><div class="card-h"><h2>Seus certificados</h2>${l.length ? `<span class="pill info">${l.length}</span>` : ""}</div>
   <p class="small muted" style="margin:0 0 10px">Escolha os PDFs ou as fotos dos seus certificados. O site lê aqui no seu aparelho e monta a lista para o seu mentor. Os arquivos não saem do seu celular.</p>
   <div class="row"><label class="btn sm pri" style="cursor:pointer">Escolher arquivos<input type="file" accept=".pdf,application/pdf,image/*" multiple hidden data-cliarq="1"></label>${l.length ? `<button class="btn sm" data-a="enviarCertsCli">Enviar lista para o mentor</button><button class="btn sm ghost" data-a="limparCertsCli">Limpar</button>` : ""}</div>
   ${l.length ? `<div class="list" style="margin-top:12px">${l.map((x, i) => `<div class="li"><div class="grow" style="min-width:0"><div class="t">${esc(x.desc)}</div><div class="xs muted">${esc([x.tipo, x.ano, x.ch ? x.ch + "h" : "", x.arquivo].filter(Boolean).join(" · "))}</div></div><button class="btn sm ghost" data-a="apagarCertCli" data-i="${i}" title="Tirar da lista">×</button></div>`).join("")}</div>
   <p class="xs muted" style="margin:10px 0 0">A lista vai pelo WhatsApp. Os PDFs você ${FORM_CERT ? "manda pelo botão abaixo" : "manda na mesma conversa"}, para o mentor conferir.</p>${FORM_CERT ? `<a class="btn sm" style="margin-top:8px" href="${FORM_CERT}" target="_blank" rel="noopener">Enviar os PDFs</a>` : ""}` : ""}
  </section>`;
}
async function importarCertsCli(input){
  const fs = [...(input.files || [])]; input.value = ""; if (!fs.length) return;
  const l = lerCertsCli(); const ja = new Set(l.map(x => x.arquivo)); let n = 0, rep = 0;
  toast(`Lendo ${fs.length} ${fs.length === 1 ? "arquivo" : "arquivos"}`);
  for (const f of fs){ for (const x of await certsDoArquivo(f)){ if (ja.has(x.arquivo)){ rep++; continue; } ja.add(x.arquivo); l.push({ desc:x.desc, tipo:x.tipo, ano:x.ano, ch:x.ch, arquivo:x.arquivo }); n++; } }
  gravarCertsCli(l); render();
  toast(n ? `${n} ${n === 1 ? "certificado na lista" : "certificados na lista"}${rep ? `, ${rep} já ${rep === 1 ? "estava" : "estavam"}` : ""}` : "Esses arquivos já estavam na lista");
}
function enviarCertsCli(){
  const l = lerCertsCli(); if (!l.length) return; const ct = S.portal.contato || CONTATO;
  const link = `${location.href.split("#")[0].split("?")[0]}?k=${codigoMarc({ id:S.portal.id, nome:S.portal.nome, em:Date.now(), l:l.map(x => [x.desc, x.tipo, x.ano, x.ch, x.arquivo]) })}`;
  const porTipo = {}; l.forEach(x => porTipo[x.tipo] = (porTipo[x.tipo] || 0) + 1);
  const txt = `Oi, ${ct.mentor.split(" ")[0]}! Montei no portal a lista dos meus certificados\n\nTotal: ${l.length}\n${Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}: ${n}`).join("\n")}\n\nAbrir no painel: ${link}`;
  window.open(waLink(ct.whats, txt), "_blank");
}
/* No painel do mentor: o link ?k= entra no controle de certificados do cliente */
function importarCertsDoLink(codigo){
  let d; try { d = JSON.parse(decodeURIComponent(escape(atob(codigo.replace(/-/g, "+").replace(/_/g, "/"))))); } catch { toast("Link de certificados inválido"); return; }
  const c = (S.eq.clientes || []).find(x => x.id === d.id); if (!c){ toast(`Não achei o cliente ${d.nome || ""} no painel`); return; }
  const ct = ctrlDe(c); const ja = new Set(ct.certs.map(x => semAcento(x.arquivo || "") + "|" + semAcento(x.desc))); let n = 0;
  for (const [desc, tipo, ano, ch, arquivo] of d.l || []){ const k = semAcento(arquivo || "") + "|" + semAcento(desc); if (ja.has(k)) continue; ja.add(k); ct.certs.push({ id:novoIdC(), desc:desc || "", tipo:TIPOS_CERT.includes(tipo) ? tipo : "Outro", ano:ano || "", ch:ch || "", obs:"Enviado pelo cliente", arquivo:arquivo || "" }); n++; }
  salvarCtrl(c); delete S.cont[c.id]; S.sel = c.id; S.view = "cliente"; (S.ctAba ||= {})[c.id] = "certs"; render(); window.scrollTo(0, 0);
  toast(n ? `${n} ${n === 1 ? "certificado" : "certificados"} de ${primeiro(c.nome)} no controle. Confira e salve no Notion` : `A lista de ${primeiro(c.nome)} já estava no controle`);
}
const A_CERTCLI = {
  enviarCertsCli: () => enviarCertsCli(),
  apagarCertCli: el => { const l = lerCertsCli(); l.splice(+el.dataset.i, 1); gravarCertsCli(l); render(); },
  limparCertsCli: () => { if (!confirm("Limpar a lista de certificados?")) return; gravarCertsCli([]); render(); },
};
