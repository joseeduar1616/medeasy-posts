/* ---------- controle de certificados: inventário, alocação por item, pendências e resumo ---------- */
/* Fica no navegador do mentor e vai para a coluna "Controle de certificados" do Notion pelo botão Copiar. O build traz de volta em c.controle. */
const TIPOS_CERT = ["Congresso", "Curso", "Extensão", "Estágio", "Liga", "Monitoria", "Iniciação científica", "Trabalho apresentado", "Artigo ou capítulo", "Representação", "Idioma", "Suporte à vida", "Histórico ou diploma", "Outro"];
const ESTADOS_CERT = { pontua:["Pontuando", "ok"], risco:["Com risco", "warn"], tentativa:["Tentativa", "gold"], reserva:["Reserva", ""] };
const QUEM_PEND = ["Cliente", "Mentor", "Claude", "Outro"];
const SIT_PEND = ["Aberta", "Aguardando cliente", "Resolvida"];
const ctrlKey = id => "medeasy-ctrl-" + id;
const ctrlVazio = () => ({ certs:[], aloc:{}, pend:[], v:1 });
const novoIdC = () => Math.random().toString(36).slice(2, 7);
function ctrlDe(c){
  if (S.ctrl?.[c.id]) return S.ctrl[c.id];
  S.ctrl = S.ctrl || {};
  let ct = null;
  if (c.triagem) ct = c.triagem.controle;
  else { try { ct = JSON.parse(localStorage.getItem(ctrlKey(c.id)) || "null"); } catch {} if (ct && ct.notion && c.controle && JSON.stringify(c.controle) !== ct.notion) ct = null; // o Notion mudou depois do rascunho: usa o Notion
    if (!ct && c.controle) ct = { ...JSON.parse(JSON.stringify(c.controle)), notion:JSON.stringify(c.controle) }; }
  return S.ctrl[c.id] = { ...ctrlVazio(), ...(ct || {}) };
}
function salvarCtrl(c){
  const ct = ctrlDe(c); ct.em = Date.now();
  if (c.triagem){ const t = triDe(c.id); t.controle = ct; salvarTri(t); return; }
  try { localStorage.setItem(ctrlKey(c.id), JSON.stringify(ct)); } catch { toast("Não consegui guardar neste navegador"); }
}
const temCtrl = ct => ct.certs.length || ct.pend.length || Object.keys(ct.notas || {}).length || !!ct.orcamento;
/* Texto que vai para o Notion: JSON compacto sem o rascunho local */
function textoCtrl(ct){ const { notion, em, ...resto } = ct; return JSON.stringify(resto); }
/* Alocação de um item: lista de {id, estado} */
const alocDe = (ct, pk, key) => ((ct.aloc[pk] ||= {})[key] ||= []);
const certDe = (ct, id) => ct.certs.find(x => x.id === id);
/* Conta de um item a partir da alocação: real só com "pontua", ideal com risco e tentativa */
function contaItem(it, lista, ct){
  const certs = lista.map(a => ({ ...a, c:certDe(ct, a.id) })).filter(a => a.c);
  const n = e => certs.filter(a => a.estado === e).length;
  // Item que não é por certificado (histórico, ENADE, proficiência): com um comprovante, vale a nota da análise ou o máximo
  const cheio = num(it.base && it.base.pts) || it.maxN;
  const real = it.unit != null ? Math.min(it.maxN, n("pontua") * it.unit) : n("pontua") ? cheio : 0;
  const ideal = it.unit != null ? Math.min(it.maxN, (n("pontua") + n("risco") + n("tentativa")) * it.unit) : n("pontua") + n("risco") + n("tentativa") ? cheio : 0;
  return { certs, nPontua:n("pontua"), nRisco:n("risco"), nTent:n("tentativa"), nRes:n("reserva"), real:r2(real), ideal:r2(ideal), risco:r2(ideal - real) };
}
function resumoProva(c, p, ct){
  const itens = itensDaProva(p); const pk = kP(p.nome); let real = 0, ideal = 0, max = 0, risco = 0, tent = 0, res = 0; const faltam = [];
  for (const it of itens){ const a = contaItem(it, alocDe(ct, pk, it.key), ct); const m = it.grupo && it.grupoMax != null ? Math.min(it.maxN, it.grupoMax) : it.maxN;
    real += a.real; ideal += a.ideal; max += m; risco += a.nRisco; tent += a.nTent; res += a.nRes; if (a.ideal > a.real || a.real < m) faltam.push({ it, a, falta:r2(m - a.real) }); }
  const teto = tetoDe(p); if (teto > 0 && max > teto){ real = Math.min(real, teto); ideal = Math.min(ideal, teto); max = teto; }
  return { real:r2(real), ideal:r2(ideal), max:r2(max), risco, tent, res, faltam, pendAbertas:ct.pend.filter(x => x.situacao !== "Resolvida" && (!x.edital || x.edital === pk)).length };
}
/* A alocação alimenta a contagem por item (nota e valor) quando o mentor ainda não digitou nada à mão */
function regDoControle(c, p){
  const ct = ctrlDe(c); const pk = kP(p.nome); if (!ct.aloc[pk]) return null; const itens = itensDaProva(p); const r = {};
  for (const it of itens){ const lista = alocDe(ct, pk, it.key); if (!lista.length) continue; const a = contaItem(it, lista, ct);
    r[it.key] = { ...(it.base || {}), n:a.nPontua, lista:a.certs.filter(x => x.estado === "pontua").map(x => x.c.desc), pts:"" }; }
  return Object.keys(r).length ? r : null;
}
/* Tela */
function controleView(c){
  const ct = ctrlDe(c); const provas = (c.provas || []).filter(p => p.nome && itensDaProva(p).length);
  const abas = [["resumo", "Resumo"], ["pend", `Pendências${ct.pend.filter(x => x.situacao !== "Resolvida").length ? " · " + ct.pend.filter(x => x.situacao !== "Resolvida").length : ""}`], ["certs", `Certificados · ${ct.certs.length}`], ...provas.map(p => ["p:" + kP(p.nome), p.nome])];
  const aba = S.ctAba?.[c.id] && abas.some(a => a[0] === S.ctAba[c.id]) ? S.ctAba[c.id] : "resumo";
  let corpo = "";
  if (aba === "resumo") corpo = ctResumo(c, ct, provas);
  else if (aba === "pend") corpo = ctPend(c, ct, provas);
  else if (aba === "certs") corpo = ctCerts(c, ct, provas);
  else { const p = provas.find(p => "p:" + kP(p.nome) === aba); corpo = p ? ctProva(c, ct, p) : ""; }
  return `<section class="card" id="ctrlCard"><div class="card-h"><div><h2>Controle de certificados</h2><div class="sub">Todos os certificados do cliente, o que entra em cada item do edital, pendências e projeção</div></div>
    <div class="row"><span class="xs muted">${ct.em ? "Guardado " + dataHora(ct.em) : ""}</span><button class="btn sm pri" data-a="copiarCtrl" ${temCtrl(ct) ? "" : "disabled"}>${!c.triagem && typeof temPonte === "function" && temPonte() ? "Salvar no Notion" : "Copiar controle para o Notion"}</button><label class="btn sm" style="cursor:pointer" title="PDFs ou fotos dos certificados, ou o arquivo .json de um controle baixado">Adicionar arquivos<input type="file" accept=".pdf,application/pdf,image/*,.json,application/json" multiple hidden data-ctimp="1"></label><button class="btn sm ghost" data-a="baixarCtrl" ${temCtrl(ct) ? "" : "disabled"}>Baixar</button></div></div>
   ${S.ctCopiado === c.id ? `<div class="wait small" style="margin-bottom:12px"><b>Copiado.</b> Abra o cliente no Notion e cole na coluna "Controle de certificados". Na próxima sincronização a equipe toda vê.${notionDe(c) ? ` <a class="btn sm pri" style="margin-left:8px" href="${esc(notionDe(c))}" target="_blank" rel="noopener">Abrir no Notion</a>` : ""}</div>` : ""}
   <div class="row" style="gap:6px;margin-bottom:12px">${abas.map(([k, t]) => `<button class="btn sm ${aba === k ? "pri" : ""}" data-a="ctAba" data-v="${k}">${esc(t)}</button>`).join("")}</div>
   ${corpo}</section>`;
}
function ctResumo(c, ct, provas){
  if (!provas.length) return `<div class="empty">Marque a prova do cliente no Notion para ver a projeção por edital</div>`;
  const linhas = provas.map(p => ({ p, r:resumoProva(c, p, ct) }));
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prova</th><th class="r">Pontuando</th><th class="r">Com risco</th><th class="r">Tentativas</th><th class="r">Reserva</th><th class="r">Pendências</th><th class="r">Projeção real</th><th class="r">Projeção ideal</th><th class="r">Máximo</th></tr></thead><tbody>
   ${linhas.map(({ p, r }) => `<tr class="clickable" data-a="ctAba" data-v="p:${kP(p.nome)}"><td><b>${esc(p.nome)}</b></td><td class="r num">${d1(r.real)}</td><td class="r num ${r.risco ? "gold" : "muted"}">${r.risco}</td><td class="r num muted">${r.tent}</td><td class="r num muted">${r.res}</td><td class="r num ${r.pendAbertas ? "gold" : "muted"}">${r.pendAbertas}</td><td class="r num neon">${d1(r.real)}</td><td class="r num gold">${d1(r.ideal)}</td><td class="r num">${d1(r.max)}</td></tr>`).join("")}</tbody></table></div>
   <p class="xs muted" style="margin:10px 0 0">Projeção real conta só o que está como Pontuando. A ideal soma o que está com risco e as tentativas, sem passar do máximo de cada item.</p>
   ${linhas.map(({ p, r }) => r.faltam.length ? `<div style="margin-top:12px"><div class="label" style="margin-bottom:6px">O que falta na ${esc(p.nome)}</div><div class="list">${r.faltam.slice(0, 8).map(({ it, a, falta }) => `<div class="li"><div class="grow"><div class="t">${esc(it.item)}</div><div class="small muted">${d1(a.real)} de ${d1(it.grupo && it.grupoMax != null ? Math.min(it.maxN, it.grupoMax) : it.maxN)}${a.nRisco ? ` · ${a.nRisco} com risco` : ""}${a.nTent ? ` · ${a.nTent} ${a.nTent === 1 ? "tentativa" : "tentativas"}` : ""}${it.unit != null && falta > 0 ? ` · faltam ${Math.ceil(falta / it.unit - 1e-9)} ${Math.ceil(falta / it.unit - 1e-9) === 1 ? "certificado" : "certificados"}` : ""}</div></div><b class="num gold">+${d1(falta)}</b></div>`).join("")}</div></div>` : "").join("")}`;
}
function ctPend(c, ct, provas){
  const sel = (v, ops) => ops.map(o => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("");
  const lista = [...ct.pend].sort((a, b) => (a.situacao === "Resolvida") - (b.situacao === "Resolvida") || (b.data || "").localeCompare(a.data || ""));
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm pri" data-a="ctNovaPend">Nova pendência</button><span class="xs muted">Pendência de "Cliente" aparece no portal dele como "O que falta você enviar"</span></div>
   ${lista.length ? `<div class="tbl-wrap"><table class="tbl ct"><thead><tr><th>Data</th><th>Prova</th><th>Item</th><th>Pendência</th><th>Quem resolve</th><th>Situação</th><th>Resposta</th><th></th></tr></thead><tbody>
   ${lista.map(x => `<tr class="${x.situacao === "Resolvida" ? "muted" : ""}"><td><input class="in" type="date" data-ct="pend" data-id="${x.id}" data-k="data" value="${esc(x.data || "")}" style="width:140px"></td>
     <td><select class="in" data-ct="pend" data-id="${x.id}" data-k="edital"><option value="">Geral</option>${provas.map(p => `<option value="${kP(p.nome)}" ${x.edital === kP(p.nome) ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></td>
     <td><input class="in" data-ct="pend" data-id="${x.id}" data-k="item" value="${esc(x.item || "")}" placeholder="Item" style="min-width:120px"></td>
     <td><textarea class="in" data-ct="pend" data-id="${x.id}" data-k="texto" rows="2" style="min-width:220px">${esc(x.texto || "")}</textarea></td>
     <td><select class="in" data-ct="pend" data-id="${x.id}" data-k="quem">${sel(x.quem, QUEM_PEND)}</select></td>
     <td><select class="in" data-ct="pend" data-id="${x.id}" data-k="situacao">${sel(x.situacao, SIT_PEND)}</select></td>
     <td><textarea class="in" data-ct="pend" data-id="${x.id}" data-k="resposta" rows="2" style="min-width:180px">${esc(x.resposta || "")}</textarea></td>
     <td><button class="btn sm ghost" data-a="ctApagarPend" data-id="${x.id}" title="Apagar">×</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Nenhuma pendência</div>`}`;
}
function ctCerts(c, ct, provas){
  const usado = id => provas.flatMap(p => Object.entries(ct.aloc[kP(p.nome)] || {}).filter(([, l]) => l.some(a => a.id === id)).map(([key]) => `${p.nome}: ${key.replace(/\s.*$/, "")}`));
  const f = S.ctFiltro?.[c.id] || ""; const lista = ct.certs.filter(x => !f || x.tipo === f);
  const grupos = {}; for (const x of lista) (grupos[x.tipo || "Outro"] ||= []).push(x);
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm pri" data-a="ctNovoCert">Novo certificado</button><select class="in" id="ctFiltro" style="width:auto"><option value="">Todos os tipos</option>${TIPOS_CERT.map(t => `<option ${f === t ? "selected" : ""}>${t}</option>`).join("")}</select><details style="flex:1"><summary class="xs muted" style="cursor:pointer">Colar vários de uma vez</summary><div class="row" style="margin-top:6px"><textarea class="in" id="ctLote" rows="3" placeholder="Um por linha: descrição | tipo | ano | carga horária" style="flex:1"></textarea><button class="btn sm" data-a="ctLote">Adicionar</button></div></details></div>
   ${ct.certs.length ? Object.entries(grupos).sort().map(([tipo, xs]) => `<div class="label" style="margin:10px 0 4px">${esc(tipo)} · ${xs.length}</div><div class="tbl-wrap"><table class="tbl ct"><thead><tr><th>Descrição</th><th>Tipo</th><th>Ano</th><th>CH</th><th>Usado em</th><th>Observação</th><th>Arquivo</th><th></th></tr></thead><tbody>
    ${xs.map(x => { const u = usado(x.id); return `<tr><td><input class="in" data-ct="cert" data-id="${x.id}" data-k="desc" value="${esc(x.desc || "")}" style="min-width:240px"></td>
      <td><select class="in" data-ct="cert" data-id="${x.id}" data-k="tipo">${TIPOS_CERT.map(t => `<option ${x.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></td>
      <td><input class="in num" data-ct="cert" data-id="${x.id}" data-k="ano" value="${esc(x.ano || "")}" style="width:70px" inputmode="numeric"></td>
      <td><input class="in num" data-ct="cert" data-id="${x.id}" data-k="ch" value="${esc(x.ch || "")}" style="width:64px" placeholder="h"></td>
      <td class="small">${u.length ? u.map(esc).join("<br>") : `<span class="faint">Não usado</span>`}</td>
      <td><input class="in" data-ct="cert" data-id="${x.id}" data-k="obs" value="${esc(x.obs || "")}" placeholder="Ex.: não pontua neste edital" style="min-width:160px"></td>
      <td><input class="in" data-ct="cert" data-id="${x.id}" data-k="arquivo" value="${esc(x.arquivo || "")}" placeholder="nome do PDF ou link" style="min-width:140px"></td>
      <td><button class="btn sm ghost" data-a="ctApagarCert" data-id="${x.id}" title="Apagar">×</button></td></tr>`; }).join("")}</tbody></table></div>`).join("") : `<div class="empty">Nenhum certificado cadastrado. Use "Adicionar arquivos" para escolher os PDFs ou fotos, adicione um por um ou cole vários de uma vez.</div>`}`;
}
function ctProva(c, ct, p){
  const pk = kP(p.nome); const itens = itensDaProva(p); const r = resumoProva(c, p, ct);
  const usadosAqui = new Set(Object.values(ct.aloc[pk] || {}).flat().map(a => a.id));
  return `<div class="kpis" style="margin-bottom:12px"><div class="kpi hl"><div class="label">Projeção real</div><div class="v">${d1(r.real)}<small class="muted" style="font-size:16px"> / ${d1(r.max)}</small></div><div class="d">${!usadosAqui.size && calcDe(c, p).total > 0 ? `nenhum certificado ligado aos itens ainda · na análise: ${d1(calcDe(c, p).total)}` : "só o que está pontuando"}</div></div><div class="kpi"><div class="label">Projeção ideal</div><div class="v gold">${d1(r.ideal)}</div><div class="d">${r.risco} com risco · ${r.tent} tentativas</div></div><div class="kpi"><div class="label">Certificados usados</div><div class="v">${usadosAqui.size}</div><div class="d">de ${ct.certs.length} cadastrados · ${r.res} em reserva</div></div></div>
   ${ct.certs.length ? "" : `<div class="wait small" style="margin-bottom:12px">Cadastre os certificados na aba Certificados para poder alocar aqui.</div>`}
   <div class="stack" style="gap:10px">${itens.map(it => { const lista = alocDe(ct, pk, it.key); const a = contaItem(it, lista, ct); const m = it.grupo && it.grupoMax != null ? Math.min(it.maxN, it.grupoMax) : it.maxN;
     const livres = ct.certs.filter(x => !lista.some(l => l.id === x.id));
     return `<div class="svc"><div class="row between"><div><b>${esc(it.item)}</b>${it.grupo ? ` <span class="pill" style="font-size:10px">${esc(it.grupo)}</span>` : ""}<div class="xs muted">${esc(it.pontos || "")}${it.unit != null ? ` · ${d1(it.unit)} por certificado` : " · pontos digitados na contagem"}</div></div><div style="text-align:right"><b class="num ${a.real >= m ? "neon" : ""}">${d1(a.real)}</b><span class="muted"> / ${d1(m)}</span>${a.ideal > a.real ? `<div class="xs gold">ideal ${d1(a.ideal)}</div>` : ""}</div></div>
       ${a.certs.length ? `<div class="list" style="margin-top:8px">${a.certs.map((x, i) => `<div class="li" style="padding:6px 0"><div class="grow"><div class="small"><b>${i + 1}.</b> ${esc(x.c.desc)}</div><div class="xs muted">${[x.c.tipo, x.c.ano, x.c.ch ? x.c.ch + "h" : ""].filter(Boolean).map(esc).join(" · ")}${x.c.obs ? " · " + esc(x.c.obs) : ""}</div></div><select class="in" data-ct="estado" data-pk="${pk}" data-key="${esc(it.key)}" data-id="${x.id}" style="width:auto;padding:4px 8px">${Object.entries(ESTADOS_CERT).map(([k, [t]]) => `<option value="${k}" ${x.estado === k ? "selected" : ""}>${t}</option>`).join("")}</select><button class="btn sm danger" data-a="ctRemover" data-pk="${pk}" data-key="${esc(it.key)}" data-id="${x.id}">Remover</button></div>`).join("")}</div>` : ""}
       ${livres.length ? `<div class="row" style="margin-top:8px"><select class="in" data-ct="add" data-pk="${pk}" data-key="${esc(it.key)}" style="flex:1;min-width:200px"><option value="">Adicionar certificado</option>${livres.map(x => `<option value="${x.id}">${esc(x.desc)}${x.ano ? " (" + esc(x.ano) + ")" : ""}${usadosAqui.has(x.id) ? " · já usado em outro item" : ""}</option>`).join("")}</select></div>` : ""}</div>`; }).join("")}</div>`;
}
/* Entradas */
function ctInput(el){
  const c = clienteSel(); if (!c) return; const ct = ctrlDe(c); const t = el.dataset.ct;
  if (t === "cert"){ const x = certDe(ct, el.dataset.id); if (x) x[el.dataset.k] = el.value; }
  else if (t === "pend"){ const x = ct.pend.find(p => p.id === el.dataset.id); if (x) x[el.dataset.k] = el.value; }
  else if (t === "estado"){ const a = alocDe(ct, el.dataset.pk, el.dataset.key).find(a => a.id === el.dataset.id); if (a) a.estado = el.value; }
  else if (t === "add"){ if (!el.value) return; alocDe(ct, el.dataset.pk, el.dataset.key).push({ id:el.value, estado:"pontua" }); }
  salvarCtrl(c); delete S.cont[c.id]; S.ctCopiado = null;
  if (t === "estado" || t === "add" || (t === "pend" && (el.dataset.k === "situacao" || el.dataset.k === "edital")) || (t === "cert" && el.dataset.k === "tipo")) render();
  else { const el2 = document.getElementById("valorCard"); if (el2) el2.outerHTML = valorCard(c); }
}
/* Lê PDFs e fotos de certificados. Cada PDF vira um certificado, ou um por página quando o PDF junta vários. */
const TIPO_POR_TEXTO = [
  [/suporte (avan[cç]ado|b[aá]sico) de vida|\b(acls|bls|atls|pals|phtls|aphls)\b/i, "Suporte à vida"],
  [/monitor/i, "Monitoria"],
  [/inicia[cç][aã]o cient/i, "Iniciação científica"],
  [/liga acad|liga de /i, "Liga"],
  [/apresent(ou|a[cç][aã]o d[eo] trabalho)|p[oô]ster|tema livre|e-?p[oô]ster|comunica[cç][aã]o oral/i, "Trabalho apresentado"],
  [/\bartigo\b|cap[ií]tulo|publica[cç][aã]o|\bdoi\b/i, "Artigo ou capítulo"],
  [/est[aá]gio|internato/i, "Estágio"],
  [/extens[aã]o/i, "Extensão"],
  [/representa|diret[oó]rio acad|centro acad|atl[eé]tica|colegiado/i, "Representação"],
  [/ingl[eê]s|espanhol|toefl|ielts|cambridge|profici[eê]ncia/i, "Idioma"],
  [/diploma|hist[oó]rico escolar/i, "Histórico ou diploma"],
  [/congresso|simp[oó]sio|jornada|semin[aá]rio|encontro|f[oó]rum|confer[eê]ncia/i, "Congresso"],
  [/curso|workshop|minicurso|capacita|treinamento|webin/i, "Curso"],
];
const nomeGenerico = n => /^(img|wa\d|whatsapp|scan|doc(ument)?o?|arquivo|cert(ificado)?s?|pdf|image|foto|captura|screenshot)?[\s_-]*[\d\s_()-]*$/i.test(n) || /^(img|wa|whatsapp)[\s_-]/i.test(n);
function certDoTexto(texto, arquivo){
  const nome = arquivo.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const txt = String(texto || "").replace(/\s+/g, " ").trim(); const base = (txt + " " + nome);
  const tipo = (TIPO_POR_TEXTO.find(([re]) => re.test(base)) || [0, "Outro"])[1];
  const anoMax = new Date().getFullYear() + 1; const anos = (base.match(/\b(19[89]\d|20\d\d)\b/g) || []).map(Number).filter(a => a <= anoMax);
  const ch = (txt.match(/carga hor[aá]ria(?: total)?(?: de)?\s*:?\s*(\d{1,4})/i) || txt.match(/\b(\d{1,4})\s*(?:h\b|hs\b|horas)/i) || [])[1] || "";
  let desc = "";
  const m = txt.match(/(?:participou|concluiu|apresentou|realizou|atuou|cursou|frequentou)\s+(?:como\s+\S+\s+)?(?:(?:d[oa]s?|n[oa]s?|o|a|em)\s+)?(.{6,140}?)(?=,|\.|;|\s+(?:realizad|promovid|ocorrid|com carga|no per[ií]odo|nos dias|no dia|de \d|em \d|entre))/i);
  if (m) desc = m[1];
  if (!desc && !nomeGenerico(nome)) desc = nome;
  if (!desc && txt) desc = (String(texto).split("\n").map(l => l.trim()).find(l => /[a-zà-ú]{3}/i.test(l) && l.length >= 12 && !/^certifica/i.test(l)) || "");
  if (!desc) desc = nome;
  return { id:novoIdC(), desc:desc.replace(/\s+/g, " ").trim().slice(0, 140), tipo, ano:anos.length ? String(Math.max(...anos)) : "", ch, obs:txt ? "" : "Sem texto no arquivo, conferir", arquivo };
}
async function certsDoArquivo(f){
  if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) return [certDoTexto("", f.name)];
  let texto = ""; try { texto = await textoDoPdf(f); } catch { return [certDoTexto("", f.name)]; }
  const paginas = texto.split("\f").map(s => s.trim()); const comCert = paginas.filter(p => /certific|declara|atesta/i.test(p));
  if (paginas.length > 1 && paginas.length <= 60 && comCert.length >= Math.max(2, paginas.length * 0.6)) return paginas.map((p, i) => certDoTexto(p, `${f.name} p.${i + 1}`)).filter(x => x.desc);
  return [certDoTexto(texto, f.name)];
}
/* Certificados pelo Gemini: um por arquivo, ou um por página quando o arquivo junta vários. Só descreve, não decide o item do edital. */
const esqCert = () => ({ type:"OBJECT", required:["certificados"], properties:{ certificados:{ type:"ARRAY", items:{ type:"OBJECT", required:["arquivo", "desc", "tipo"], properties:{ arquivo:{ type:"INTEGER" }, pagina:{ type:"INTEGER" }, desc:ESQ_TXT, tipo:{ type:"STRING", enum:TIPOS_CERT }, ano:ESQ_TXT, ch:ESQ_TXT, obs:ESQ_TXT } } } } });
async function certsComGemini(docs){
  const out = [];
  for (let i = 0; i < docs.length; i += 8){ const lote = docs.slice(i, i + 8);
    const j = await geminiLer(lote, `Cada arquivo anexado traz um ou mais certificados ou declarações de um estudante de medicina, às vezes um por página. Para cada certificado devolva: o número do arquivo na lista, a página (quando o arquivo tiver mais de um certificado), uma descrição curta da atividade e do papel (por exemplo "Monitoria de Anatomia" ou "Ouvinte no Congresso Brasileiro de Cardiologia"), o tipo (um da lista), o ano (o mais recente que aparece) e a carga horária em horas (só o número, vazio se não tiver). Use obs só quando algo estiver ilegível ou faltando. Não invente: o que não der para ler fica vazio. Página que não é certificado (capa, verso, QR code) não entra.`, esqCert(), { rapido:true, aviso:"Lendo os certificados com o Gemini" });
    const lista = (j.certificados || []).filter(x => x && lote[x.arquivo - 1]);
    lote.forEach((f, k) => { const deste = lista.filter(x => x.arquivo === k + 1); const varios = deste.length > 1;
      if (!deste.length) out.push({ ...certDoTexto("", f.name), obs:"O Gemini não achou certificado neste arquivo, conferir" });
      deste.forEach((x, n) => out.push({ id:novoIdC(), desc:String(x.desc || "").trim().slice(0, 140) || f.name, tipo:TIPOS_CERT.includes(x.tipo) ? x.tipo : "Outro", ano:String(x.ano || "").replace(/\D/g, "").slice(0, 4), ch:String(x.ch || "").replace(/[^\d]/g, "").slice(0, 4), obs:String(x.obs || "").trim(), arquivo:varios ? `${f.name} p.${x.pagina || n + 1}` : f.name })); });
  }
  return out;
}
async function importarCtrl(input){
  const c = clienteSel(); const fs = [...(input.files || [])]; input.value = ""; if (!c || !fs.length) return;
  const jsons = fs.filter(f => /json$/i.test(f.type) || /\.json$/i.test(f.name)); const docs = fs.filter(f => !jsons.includes(f));
  for (const f of jsons){
    try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.certs)) throw new Error(); S.ctrl[c.id] = { ...ctrlVazio(), ...j }; salvarCtrl(c); delete S.cont[c.id]; toast(`Controle importado: ${j.certs.length} certificados`); }
    catch { toast("Esse arquivo não é um controle do portal"); }
  }
  if (docs.length){
    const ct = ctrlDe(c); const ja = new Set(ct.certs.map(x => x.arquivo).filter(Boolean)); let n = 0, rep = 0;
    toast(`Lendo ${docs.length} ${docs.length === 1 ? "arquivo" : "arquivos"}`);
    let lidos = null;
    if (await temGemini()){ try { lidos = await certsComGemini(docs); } catch (e) { toast("O Gemini não leu os certificados (" + e.message + "). Usando a leitura do site"); } }
    if (!lidos){ lidos = []; for (const f of docs) lidos.push(...await certsDoArquivo(f)); }
    for (const x of lidos){ if (ja.has(x.arquivo)){ rep++; continue; } ja.add(x.arquivo); ct.certs.push(x); n++; }
    salvarCtrl(c); delete S.cont[c.id]; (S.ctAba ||= {})[c.id] = "certs";
    toast(n ? `${n} ${n === 1 ? "certificado adicionado" : "certificados adicionados"}${rep ? `, ${rep} já ${rep === 1 ? "estava" : "estavam"}` : ""}. Confira o tipo e a carga horária` : `Nenhum certificado novo. ${rep === 1 ? "Esse arquivo já estava" : "Esses arquivos já estavam"} na lista`);
  }
  render();
}
function baixarCtrl(c){ const ct = ctrlDe(c); const u = URL.createObjectURL(new Blob([JSON.stringify(ct, null, 1)], { type:"application/json" })); const a = document.createElement("a"); a.href = u; a.download = `controle-${semAcento(c.nome).replace(/[^a-z0-9]+/g, "-")}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
const A_CTRL = {
  ctAba: el => { const c = clienteSel(); (S.ctAba ||= {})[c.id] = el.dataset.v; render(); },
  ctNovoCert: () => { const c = clienteSel(); const ct = ctrlDe(c); ct.certs.unshift({ id:novoIdC(), desc:"", tipo:S.ctFiltro?.[c.id] || "Curso", ano:"", ch:"", obs:"", arquivo:"" }); salvarCtrl(c); render(); setTimeout(() => document.querySelector('[data-ct="cert"][data-k="desc"]')?.focus(), 0); },
  ctApagarCert: el => { const c = clienteSel(); const ct = ctrlDe(c); const x = certDe(ct, el.dataset.id); if (x && x.desc && !confirm(`Apagar "${x.desc}"?`)) return; ct.certs = ct.certs.filter(x => x.id !== el.dataset.id); for (const pv of Object.values(ct.aloc)) for (const k in pv) pv[k] = pv[k].filter(a => a.id !== el.dataset.id); salvarCtrl(c); delete S.cont[c.id]; render(); },
  ctLote: () => { const c = clienteSel(); const ct = ctrlDe(c); const t = document.getElementById("ctLote")?.value || ""; let n = 0;
    for (const ln of t.split("\n")){ const [desc, tipo, ano, ch] = ln.split("|").map(s => (s || "").trim()); if (!desc) continue; ct.certs.push({ id:novoIdC(), desc, tipo:TIPOS_CERT.find(x => semAcento(x) === semAcento(tipo)) || TIPOS_CERT.find(x => semAcento(x).startsWith(semAcento(tipo).slice(0, 4))) || "Outro", ano:ano || "", ch:(ch || "").replace(/\D/g, ""), obs:"", arquivo:"" }); n++; }
    if (!n){ toast("Nada para adicionar"); return; } salvarCtrl(c); render(); toast(`${n} ${n === 1 ? "certificado adicionado" : "certificados adicionados"}`); },
  ctNovaPend: () => { const c = clienteSel(); const ct = ctrlDe(c); ct.pend.unshift({ id:novoIdC(), data:hoje(), edital:"", item:"", texto:"", quem:"Cliente", situacao:"Aberta", resposta:"" }); salvarCtrl(c); (S.ctAba ||= {})[c.id] = "pend"; render(); setTimeout(() => document.querySelector('[data-ct="pend"][data-k="texto"]')?.focus(), 0); },
  ctApagarPend: el => { const c = clienteSel(); const ct = ctrlDe(c); ct.pend = ct.pend.filter(x => x.id !== el.dataset.id); salvarCtrl(c); render(); },
  ctRemover: el => { const c = clienteSel(); const ct = ctrlDe(c); const l = alocDe(ct, el.dataset.pk, el.dataset.key); const i = l.findIndex(a => a.id === el.dataset.id); if (i >= 0) l.splice(i, 1); salvarCtrl(c); delete S.cont[c.id]; render(); },
  copiarCtrl: async () => { const c = clienteSel(); const ct = ctrlDe(c);
    if (!c.triagem && typeof temPonte === "function" && temPonte() && paginaDoCliente(c)){ try { await salvarNotion(paginaDoCliente(c), { "Controle de certificados": textoCtrl(ct) }, "Controle gravado no Notion"); ct.notion = textoCtrl(ct); c.controle = JSON.parse(textoCtrl(ct)); salvarCtrl(c); render(); } catch (e) { toast("Não gravou: " + e.message); } return; }
    await copiar(textoCtrl(ct)); ct.notion = textoCtrl(ct); salvarCtrl(c); S.ctCopiado = c.id; render(); },
  baixarCtrl: () => baixarCtrl(clienteSel()),
};
/* Pendências do controle que o cliente vê no portal dele */
function pendenciasDoControle(c){ const ct = ctrlDe(c); return ct.pend.filter(x => x.quem === "Cliente" && x.situacao !== "Resolvida").map(x => ({ id:"c" + x.id, texto:[x.item, x.texto].filter(Boolean).join(": "), feita:false, prazo:"" })); }
