/* ---------- certificados por item (contagem do mentor) ---------- */
const kP = s => semAcento(s).replace(/[^a-z0-9]/g, "");
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const PRECO = { taxa:100, taxaMaisDeDuas:90, artigo:12.5, analise1:100, analise2:90,
  mentoria:{ mensal:250, reuniao:150 },
  vitae:{ A:[9, 8.5, 8], B:[9.5, 9, 8.5], C:[8, 7.5, 7], D:[9, 8.5, 8], E:[9, 8.5, 8] }, lattes:{ A:[7, 6.5, 6], B:[12, 11.5, 11] } };
const MODELO = { psugo:"D", psumg:"D", hpp:"C", santacasasp:"C", scmsp:"C", fmabc:"C", unitau:"C", idor:"C", puccamp:"C", hcpa:"C", enare:"C", sesdf:"C", cet:"E" };
const faixaQ = q => q >= 50 ? 2 : q >= 31 ? 1 : 0;
const br2 = v => (Number(v) || 0).toFixed(2).replace(".", ",");
const modeloDe = nome => { const k = kP(nome); return MODELO[k] || (Object.entries(MODELO).find(([kk]) => k.startsWith(kk)) || [, "A"])[1]; };

/* Itens de uma prova: da análise curricular lida (se houver) ou da ficha do edital */
/* Item da análise sem a lista de comprovantes (o leitor não achou no PDF): conta o mínimo de certificados para chegar na nota, como no "Ler currículo pronto" */
const nPelaNota = (pts, unit) => pts > 0 ? (unit > 0 ? Math.max(1, Math.round(pts / unit)) : 1) : 0;
const codItemC = s => (String(s || "").match(/^\s*(\d{1,2}[a-z]?\d?)\b/i) || [])[1]?.toLowerCase() || "";
function itensDaProva(p){
  const an = (p.itens || []).filter(i => i.max != null && p.fonte !== "contagem");
  // Valor por certificado do edital, quando a análise não trouxe "por atividade"
  const ficha = (p.edital && p.edital.ficha) || []; const unitEd = nome => { const k = codItemC(nome); const x = k && ficha.find(x => codItemC(x.item) === k); return x && x.unit != null ? num(x.unit) : null; };
  if (an.length) return an.map(i => { const unit = num(i.porAtividade) || unitEd(i.nome) || null, n = (i.comprovantes || []).length || nPelaNota(num(i.pontos), unit);
    return { key:i.nome, item:i.nome, pontos:i.regra || "", maxN:num(i.max), unit, artigo:/artigo completo|cap[ií]tulo/i.test(i.nome), com:i.comentario || "", sit:i.situacao || "", ganhoBase:num(i.ganho),
      base:{ n, lista:i.comprovantes || [], pts: unit && Math.abs(Math.min(num(i.max), n * unit) - num(i.pontos)) < 0.01 ? "" : num(i.pontos) } }; });
  return ((p.edital && p.edital.ficha) || []).filter(x => x.maxN != null).map(x => ({ key:x.item, item:x.item, pontos:x.pontos || "", maxN:num(x.maxN), unit:x.unit == null ? null : num(x.unit), artigo:!!x.artigo, grupo:x.grupo || "", grupoMax:x.grupoMax == null ? null : num(x.grupoMax) }));
}
function calcProva(itens, reg, teto){
  reg = reg || {}; let nCert = 0, nArt = 0, nCertVal = 0, nArtVal = 0, total = 0, max = 0; const g = {}, gm = {};
  const rows = itens.map(it => {
    const r = reg[it.key] || it.base || {}; const lista = (r.lista || []).filter(Boolean);
    const n = Math.max(0, Math.floor(num(r.n)));
    const auto = it.unit != null ? Math.min(it.maxN, n * it.unit) : 0;
    const manual = r.pts !== undefined && r.pts !== null && r.pts !== "";
    const pts = r2(Math.max(0, Math.min(it.maxN, manual ? num(r.pts) : auto)));
    // Válidos para a prova: no item por certificado, só até o número que ainda soma ponto (o resto passa do máximo do item)
    const val = !manual && it.unit > 0 ? Math.min(n, Math.ceil(it.maxN / it.unit - 1e-9)) : n;
    if (it.artigo){ nArt += n; nArtVal += val; } else { nCert += n; nCertVal += val; }
    return { ...it, n, val, auto:r2(auto), manual, pts, lista, com:r.com || it.com || "", sit:r.sit || it.sit || "" };
  });
  for (const x of rows){ if (x.grupo){ g[x.grupo] = (g[x.grupo] || 0) + x.pts; gm[x.grupo] = x.grupoMax ?? Infinity; } else { total += x.pts; max += x.maxN; } }
  for (const k in g){ total += Math.min(g[k], gm[k]); max += isFinite(gm[k]) ? gm[k] : 0; }
  // Teto geral do edital (campo "maximo"), quando a soma dos itens passa dele
  if (teto > 0 && max > teto){ total = Math.min(total, teto); max = teto; }
  return { rows, total:r2(total), max:r2(max), nCert, nArt, nCertVal, nArtVal, tem:rows.some(x => x.n || x.manual) };
}
const regDe = (c, p) => (carregarCont(c).provas || {})[kP(p.nome)];
const tetoDe = p => num(p.edital && p.edital.maximo);
const calcDe = (c, p) => calcProva(itensDaProva(p), regDe(c, p), tetoDe(p));

/* Orçamento pela contagem (mesmas regras do build e da skill de orçamento) */
function estimarJS(c){
  const tipos = c.tipos || []; const linhas = []; let falta = false;
  // Só mentoria: não tem cobrança por certificado (o valor da mentoria fica na triagem)
  if (tipos.some(t => /^mentoria/.test(t)) && !tipos.some(t => ["vitae", "lattes", "analise", "certificados"].includes(t))) return null;
  const temLattes = tipos.includes("lattes"), temCert = tipos.includes("certificados");
  const lattesB = temLattes && temCert && !tipos.includes("vitae");
  const temVitae = tipos.includes("vitae") || (temCert && !lattesB), temAnalise = tipos.includes("analise") || lattesB;
  const provas = (c.provas || []).filter(p => p.nome); const taxa = provas.length > 2 ? PRECO.taxaMaisDeDuas : PRECO.taxa;
  let maxCert = c.nCert ?? null;
  for (const p of provas){
    const cp = calcDe(c, p); let n = c.nCert, a = c.nArtigos || 0, fonte = c.nCert != null ? "Notion" : "";
    // Pela contagem, entram só os certificados válidos para esta prova (os que passam do máximo do item ficam de fora)
    let fora = 0;
    if (cp.tem){ n = cp.nCertVal; a = cp.nArtVal; fora = cp.nCert + cp.nArt - n - a; fonte = "contagem"; maxCert = Math.max(maxCert ?? 0, n + a); }
    const m = modeloDe(p.nome);
    if (temVitae || (!temAnalise && !lattesB)){
      const desc = `${p.nome}: análise curricular + seleção dos certificados (Modelo ${m} Vitae)`;
      if (n == null){ falta = true; linhas.push({ desc, conta:"falta o número de certificados", valor:null }); continue; }
      const u = PRECO.vitae[m][faixaQ(n)];
      linhas.push({ desc, conta:`${br2(taxa)} + ${n} X ${br2(u)}${a ? ` + ${a} X ${br2(PRECO.artigo)}` : ""}`, valor:taxa + n * u + a * PRECO.artigo, fonte, fora });
    } else linhas.push({ desc:`${p.nome}: análise curricular`, conta:"1", valor:provas.length >= 2 ? PRECO.analise2 : PRECO.analise1 });
  }
  if (!provas.length && temVitae){
    if (c.nCert == null){ falta = true; linhas.push({ desc:"Currículo Vitae/currículo com certificados comprovados", conta:"falta o número de certificados", valor:null }); }
    else { const u = PRECO.vitae.A[faixaQ(c.nCert)], a = c.nArtigos || 0; linhas.push({ desc:"Currículo Vitae/currículo com certificados comprovados (Modelo A)", conta:`${br2(PRECO.taxa)} + ${c.nCert} X ${br2(u)}${a ? ` + ${a} X ${br2(PRECO.artigo)}` : ""}`, valor:PRECO.taxa + c.nCert * u + a * PRECO.artigo, fonte:"Notion" }); }
  }
  if (temLattes){
    const cat = lattesB ? "B" : "A", desc = `Atualização do Currículo Lattes (Categoria ${cat}${lattesB ? ", com o documento de comprovação" : ""})`;
    if (maxCert == null){ falta = true; linhas.push({ desc, conta:"falta o número de certificados", valor:null }); }
    else { const u = PRECO.lattes[cat][faixaQ(maxCert)]; linhas.push({ desc, conta:`${maxCert} X ${br2(u)}`, valor:maxCert * u }); }
  }
  if (!linhas.length) return null;
  return { linhas, total:r2(linhas.reduce((s, l) => s + (l.valor || 0), 0)), completo:!falta };
}

/* Certificados que passam do máximo do item não somam ponto, então não entram no orçamento daquela prova */
const foraTxt = l => l.fora > 0 ? ` · ${l.fora} ${l.fora === 1 ? "certificado passa do máximo do item e não entra" : "certificados passam do máximo do item e não entram"}` : "";

/* Contagem: vem do Notion (coluna "Certificados por item") e o rascunho fica no navegador */
const rascKey = id => "medeasy-rasc-" + id;
function lerRasc(id){ try { return JSON.parse(localStorage.getItem(rascKey(id)) || "null"); } catch { return null; } }
function gravarRasc(id){ if (String(id).startsWith("t:")){ const t = triDe(id); if (t){ t.cont = S.cont[id].provas; salvarTri(t); } return; } try { localStorage.setItem(rascKey(id), JSON.stringify({ provas:S.cont[id].provas, em:Date.now() })); } catch {} }
function apagarRasc(id){ if (String(id).startsWith("t:")) return; try { localStorage.removeItem(rascKey(id)); } catch {} }
/* Texto da coluna: uma linha por prova. "PSU-GO: 2=2; 4=3; 9=/0,5" (item=certificados, /pontos quando digitados) */
function lerTextoCont(t){ const out = {}; for (const ln of String(t || "").split(/\n|\|/)){ const m = ln.match(/^\s*([^:]+):(.*)$/); if (!m) continue; const pr = (out[kP(m[1])] ||= {});
  for (const par of m[2].split(";")){ const x = par.trim().match(/^(\d+)\s*=\s*(\d+)?\s*(?:\/\s*([\d.,]+))?/); if (x) pr[+x[1]] = { n:x[2] ? +x[2] : 0, pts:x[3] != null ? num(x[3]) : "" }; } } return out; }
function regDoNotion(c, p){ const t = (c.contagem || {})[kP(p.nome)]; if (!t) return null; const itens = itensDaProva(p); const r = {}; for (const [i, v] of Object.entries(t)){ const it = itens[+i - 1]; if (it) r[it.key] = { ...(it.base || {}), n:v.n, pts:v.pts }; } return r; }
function carregarCont(c){
  if (S.cont[c.id]) return S.cont[c.id];
  const reg = S.cont[c.id] = { provas:{} };
  if (c.triagem){ reg.provas = JSON.parse(JSON.stringify(c.triagem.cont || {})); for (const p of c.provas || []) if (!reg.provas[kP(p.nome)]){ const r = regDoControle(c, p); if (r) reg.provas[kP(p.nome)] = r; } return reg; }
  // Ordem: contagem digitada (Notion), depois a alocação do controle de certificados
  for (const p of c.provas || []){ const r = regDoNotion(c, p) || regDoControle(c, p); if (r) reg.provas[kP(p.nome)] = r; }
  const ras = c.id === "cli" ? null : lerRasc(c.id); if (ras && ras.provas && Object.keys(ras.provas).length && ras.texto !== textoCont(c, reg.provas)){ reg.provas = ras.provas; reg.rascunho = true; reg.copiado = !!ras.texto; }
  return reg;
}
function textoCont(c, provasReg){ return (c.provas || []).filter(p => p.nome).map(p => { const itens = itensDaProva(p), reg = (provasReg || {})[kP(p.nome)]; if (!reg) return "";
  const cp = calcProva(itens, reg); const pares = cp.rows.map((x, i) => (x.n || x.manual) ? `${i + 1}=${x.n || ""}${x.manual ? "/" + String(x.pts).replace(".", ",") : ""}` : "").filter(Boolean);
  return pares.length ? `${p.nome}: ${pares.join("; ")}` : ""; }).filter(Boolean).join("\n"); }
function itensParaCliente(cp){ return cp.rows.map(x => ({ nome:x.item, regra:x.pontos, max:x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN, pontos:x.pts, ganho:x.ganhoBase || r2(Math.max(0, (x.grupo && x.grupoMax != null ? Math.min(x.maxN, x.grupoMax) : x.maxN) - x.pts)),
  situacao:x.sit || (x.maxN && x.pts >= x.maxN ? "Completo" : x.pts > 0 ? "Parcial" : ""), comprovantes:x.lista.length ? x.lista : Array.from({ length:x.n }, (_, i) => `Certificado ${i + 1}`), comentario:x.com || "" })); }
function provasComContagem(c){ carregarCont(c); return (c.provas || []).map(p => { const cp = calcDe(c, p); if (!cp.tem || (p.fonte === "analise" && !regDe(c, p))) return p; return { ...p, itens:itensParaCliente(cp), notaEstimada:cp.total, notaMax:cp.max || num(p.notaMax) || 100, fonte:"contagem" }; }); }
/* No portal do cliente: monta os itens a partir da contagem que veio do Notion */
function juntarContagemCliente(portal){ const temCont = portal.contagem && Object.keys(portal.contagem).length, temCtrl = portal.controle && (portal.controle.certs || []).length;
  if (!temCont && !temCtrl) return; delete S.cont.cli; if (S.ctrl) delete S.ctrl.cli;
  portal.provas = provasComContagem({ id:"cli", provas:portal.provas || [], contagem:portal.contagem || {}, controle:portal.controle || null }); }
/* Cliente "de mentira" a partir dos dados do portal, para calcular o orçamento com as mesmas regras do mentor */
const clienteDoPortal = p => ({ id:"cli", provas:p.provas || [], contagem:p.contagem || {}, controle:p.controle || null, tipos:p.tipos || [], nCert:p.nCert ?? null, nArtigos:p.nArtigos ?? null });
async function copiarParaNotion(c){ const reg = carregarCont(c); const t = textoCont(c, reg.provas);
  if (!t){ toast("Nada para copiar ainda"); return; }
  if (!c.triagem && typeof temPonte === "function" && temPonte() && paginaDoCliente(c)){
    try { await salvarNotion(paginaDoCliente(c), { "Certificados por item": t }, "Contagem gravada no Notion"); c.contagem = lerTextoCont(t); apagarRasc(c.id); delete S.cont[c.id]; S.ciCopiado = null; render(); } catch (e) { toast("Não gravou: " + e.message); } return; }
  await copiar(t); if (!c.triagem) try { localStorage.setItem(rascKey(c.id), JSON.stringify({ provas:reg.provas, em:Date.now(), texto:t })); } catch {}
  reg.copiado = true; S.ciCopiado = c.id; render(); }

/* Tela */
function statusTxt(reg, c){ if (!reg) return ""; if (c && c.triagem) return "Guardado neste navegador"; if (reg.copiado) return "Copiado. Falta colar no Notion"; return reg.rascunho ? "Rascunho neste navegador. Copie para o Notion para a equipe ver" : textoCont(c, reg.provas) ? "Igual ao que está no Notion" : "Ainda não está no Notion"; }
function pintarStatus(c){ const el = document.getElementById("ciStatus"); if (el) el.textContent = statusTxt(S.cont[c.id], c); }
function valorCard(c){
  const e = estimarJS(c); if (!e) return `<section class="card" id="valorCard" hidden></section>`; const f = fin(c); const dif = r2(f.total - e.total);
  return `<section class="card" id="valorCard"><div class="card-h"><h2>Valor pelos certificados</h2>${e.completo ? (Math.abs(dif) < 1 ? `<span class="pill ok">Bate com o Notion</span>` : `<span class="pill warn">Diferente do Notion</span>`) : `<span class="pill">Falta contagem</span>`}</div>
   <div class="tbl-wrap"><table class="tbl"><tbody>${e.linhas.map(l => `<tr><td class="small">${esc(l.desc)}<div class="xs muted">${esc(l.conta)}${l.fonte ? " · certificados da " + esc(l.fonte) : ""}${esc(foraTxt(l))}</div></td><td class="r num" style="white-space:nowrap">${l.valor == null ? "–" : brl(l.valor)}</td></tr>`).join("")}</tbody><tfoot><tr><td>Total calculado</td><td class="r num" style="white-space:nowrap">${brl(e.total)}</td></tr></tfoot></table></div>
   <p class="xs muted" style="margin:8px 0 0">No Notion: ${brl(f.total)}${e.completo && Math.abs(dif) >= 1 ? ` (diferença de ${brl(Math.abs(dif))} ${dif > 0 ? "a mais no Notion" : "a menos no Notion"})` : ""}. Descontos e cortesias não entram nesta conta.</p>${e.completo && S.admin && !c.triagem && typeof temPonte === "function" && temPonte() && paginaDoCliente(c) && Math.abs(dif) >= 1 ? `<button class="btn sm" style="margin-top:8px" data-a="usarValorNotion">Usar ${brl(e.total)} como Valor total no Notion</button>` : ""}</section>`;
}
function certItensView(c){
  const provas = (c.provas || []).filter(p => p.nome); if (!provas.length) return "";
  const reg = carregarCont(c);
  const pk = S.ciProva[c.id] && provas.some(p => kP(p.nome) === S.ciProva[c.id]) ? S.ciProva[c.id] : kP(provas[0].nome);
  const p = provas.find(p => kP(p.nome) === pk); const itens = itensDaProva(p); const cp = calcDe(c, p);
  const tabs = provas.map(x => { const k = kP(x.nome), cx = calcDe(c, x); return `<button class="btn sm ${k === pk ? "pri" : ""}" data-a="ciProva" data-v="${k}">${esc(x.nome)}${cx.tem ? ` · ${d1(cx.total)}` : ""}</button>`; }).join("");
  const grupos = [...new Set(itens.filter(i => i.grupo).map(i => i.grupo))];
  return `<section class="card" id="certItens"><div class="card-h"><div><h2>Certificados por item</h2><div class="sub">Marque "Completo" nos itens em que o cliente já tem a nota máxima e use − e + nos parciais. A nota e o valor se atualizam na hora</div></div>
    <div class="row"><span class="xs muted" id="ciStatus">${esc(statusTxt(reg, c))}</span><button class="btn sm pri" data-a="copiarCont">${!c.triagem && typeof temPonte === "function" && temPonte() ? "Salvar no Notion" : "Copiar para o Notion"}</button></div></div>
   ${S.ciCopiado === c.id ? `<div class="wait small" style="margin-bottom:12px"><b>Copiado.</b> Abra o cliente no Notion e cole na coluna "Certificados por item". Na próxima sincronização a nota e o valor aparecem para toda a equipe e no portal do cliente.${notionDe(c) ? `<div style="margin-top:8px"><a class="btn sm pri" href="${esc(notionDe(c))}" target="_blank" rel="noopener">Abrir no Notion</a></div>` : ""}</div>` : ""}
   <div class="row" style="gap:6px;margin-bottom:12px">${tabs}</div>
   ${typeof fichaAcoesView === "function" ? fichaEditorView(c, p) + (S.fichaEd && S.fichaEd.cid === c.id && S.fichaEd.pk === kP(p.nome) ? "" : fichaAcoesView(c, p, itens)) : ""}
   ${itens.length ? `<div class="kpis" style="margin-bottom:12px"><div class="kpi hl"><div class="label">Nota ${esc(p.nome)}</div><div class="v"><span id="ciNota">${d1(cp.total)}</span><small class="muted" style="font-size:16px"> / ${d1(cp.max)}</small></div><div class="d">${esc((p.edital && p.edital.peso) || "")}</div></div>
     <div class="kpi"><div class="label">Certificados</div><div class="v" id="ciCert">${cp.nCert}</div><div class="d" id="ciArt">${cp.nArt ? cp.nArt + " artigos ou capítulos" : "sem artigo"}</div></div>
     <div class="kpi"><div class="label">Valor desta prova</div><div class="v gold" id="ciValor">${(() => { const l = (estimarJS(c) || { linhas:[] }).linhas.find(l => l.desc.startsWith(p.nome + ":")); return l && l.valor != null ? brl(l.valor) : "–"; })()}</div><div class="d">Modelo ${modeloDe(p.nome)} Vitae</div></div></div>
   <div class="tbl-wrap"><table class="tbl ci"><thead><tr><th>Item</th><th class="r" style="width:132px">Certificados</th><th class="r" style="width:92px">Pontos</th><th class="r" style="width:64px">Máx</th></tr></thead><tbody>
   ${cp.rows.map((x, i) => `<tr><td class="small"><label class="chk ci-cheio" style="float:right;margin-left:8px"><input type="checkbox" data-ci="cheio" data-i="${i}" ${x.pts >= x.maxN && x.maxN > 0 ? "checked" : ""}><span class="xs">Completo</span></label><b>${esc(x.item)}</b>${x.grupo ? ` <span class="pill" style="font-size:10px">${esc(x.grupo)}${x.grupoMax != null ? " até " + d1(x.grupoMax) : ""}</span>` : ""}<div class="xs muted">${esc(x.pontos)}</div>
       <details style="margin-top:4px"><summary class="xs" style="cursor:pointer">${x.lista.length ? `${x.lista.length} certificados listados` : "Listar certificados"}</summary><textarea class="in" data-ci="lista" data-i="${i}" rows="3" placeholder="Um certificado por linha" style="margin-top:6px;font-size:13px">${esc(x.lista.join("\n"))}</textarea>${c.triagem ? `<select class="in" data-ci="sit" data-i="${i}" style="margin-top:6px;font-size:13px"><option value="">Situação automática</option>${["Completo","Parcial","Aumentar agora","Médio prazo","Não se aplica agora"].map(o => `<option ${x.sit === o ? "selected" : ""}>${o}</option>`).join("")}</select><textarea class="in" data-ci="com" data-i="${i}" rows="2" placeholder="Comentário para a análise curricular" style="margin-top:6px;font-size:13px">${esc(x.com)}</textarea>` : ""}</details></td>
     <td class="r"><div class="ci-passo">${x.unit != null ? `<button class="btn sm ghost" data-a="ciPasso" data-i="${i}" data-v="-1" aria-label="Menos um">−</button>` : ""}<input class="in num" data-ci="n" data-i="${i}" type="number" min="0" step="1" inputmode="numeric" value="${x.n || ""}" placeholder="0" style="width:56px;text-align:right">${x.unit != null ? `<button class="btn sm ghost" data-a="ciPasso" data-i="${i}" data-v="1" aria-label="Mais um">+</button>` : ""}</div></td>
     <td class="r"><input class="in num" data-ci="pts" data-i="${i}" type="number" min="0" step="0.01" inputmode="decimal" value="${x.manual ? x.pts : ""}" placeholder="${x.unit != null ? String(x.auto).replace(".", ",") : "–"}" title="${x.unit != null ? "Calculado pelos certificados. Digite só para corrigir" : "Este item não é por certificado. Digite os pontos"}" style="width:76px;text-align:right"><div class="xs ${x.pts >= x.maxN ? "neon" : "muted"}" id="ciP${i}">${d1(x.pts)}</div></td>
     <td class="r num small">${d1(x.maxN)}</td></tr>`).join("")}</tbody></table></div>
   <p class="xs muted" style="margin:10px 0 0">Itens marcados com grupo dividem o mesmo teto.${grupos.length ? "" : ""} Quando o item não é por certificado (histórico, ENADE, faixa), digite os pontos direto. Ficha: ${esc((p.edital && p.edital.fichaFonte) || (p.itens && p.itens.length ? "análise curricular do cliente" : ""))}</p>`
   : S.fichaEd && S.fichaEd.cid === c.id ? "" : `<div class="empty">Sem a ficha, a nota desta prova não aparece${p.edital && p.edital.fichaFonte ? ". " + esc(p.edital.fichaFonte) : ""}</div>`}</section>`;
}
function ciInput(el){
  const c = clienteSel(); if (!c) return;
  const provas = (c.provas || []).filter(p => p.nome); const pk = S.ciProva[c.id] && provas.some(p => kP(p.nome) === S.ciProva[c.id]) ? S.ciProva[c.id] : kP(provas[0].nome);
  const p = provas.find(p => kP(p.nome) === pk); const itens = itensDaProva(p); const it = itens[+el.dataset.i]; if (!it) return;
  const reg = S.cont[c.id]; const pr = (reg.provas[pk] ||= {}); const r = (pr[it.key] ||= { ...(it.base || {}) });
  if (el.dataset.ci === "n") r.n = el.value === "" ? 0 : Math.max(0, Math.floor(num(el.value)));
  else if (el.dataset.ci === "cheio"){
    // Completo: o número de certificados que dá a nota máxima do item (ou os pontos máximos, se não é por certificado)
    if (el.checked){ if (it.unit > 0){ r.n = Math.ceil(it.maxN / it.unit - 1e-9); r.pts = ""; } else r.pts = it.maxN; } else { r.n = 0; r.pts = ""; }
    const ni = document.querySelector(`[data-ci="n"][data-i="${el.dataset.i}"]`); if (ni) ni.value = r.n || "";
    const pi = document.querySelector(`[data-ci="pts"][data-i="${el.dataset.i}"]`); if (pi) pi.value = r.pts === "" || r.pts == null ? "" : r.pts; }
  else if (el.dataset.ci === "pts") r.pts = el.value === "" ? "" : num(el.value);
  else if (el.dataset.ci === "com"){ r.com = el.value; gravarRasc(c.id); return; }
  else if (el.dataset.ci === "sit"){ r.sit = el.value; gravarRasc(c.id); return; }
  else { r.lista = el.value.split("\n").map(s => s.trim()).filter(Boolean); r.n = r.lista.length; const inp = document.querySelector(`[data-ci="n"][data-i="${el.dataset.i}"]`); if (inp) inp.value = r.n || ""; }
  // Voltou a ficar igual ao Notion: não é mais rascunho
  if (c.triagem){ gravarRasc(c.id); } else { const noNotion = {}; for (const q of provas){ const r = regDoNotion(c, q); if (r) noNotion[kP(q.nome)] = r; }
  if (textoCont(c, reg.provas) === textoCont(c, noNotion)){ reg.rascunho = false; apagarRasc(c.id); } else { reg.rascunho = true; gravarRasc(c.id); } }
  reg.copiado = false; S.ciCopiado = null;
  const cp = calcProva(itens, pr, tetoDe(p)); const x = cp.rows[+el.dataset.i];
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
  set("ciP" + el.dataset.i, d1(x.pts)); const ck = document.querySelector(`[data-ci="cheio"][data-i="${el.dataset.i}"]`); if (ck) ck.checked = x.maxN > 0 && x.pts >= x.maxN; const pe = document.querySelector(`[data-ci="pts"][data-i="${el.dataset.i}"]`); if (pe && x.unit != null) pe.placeholder = String(x.auto).replace(".", ",");
  set("ciNota", d1(cp.total)); set("ciCert", cp.nCert); set("ciArt", cp.nArt ? cp.nArt + " artigos ou capítulos" : "sem artigo");
  const l = (estimarJS(c) || { linhas:[] }).linhas.find(l => l.desc.startsWith(p.nome + ":")); set("ciValor", l && l.valor != null ? brl(l.valor) : "–");
  const vc = document.getElementById("valorCard"); if (vc) vc.outerHTML = valorCard(c);
  pintarStatus(c);
}
/* − e + do número de certificados do item */
function ciPasso(el){ const inp = document.querySelector(`[data-ci="n"][data-i="${el.dataset.i}"]`); if (!inp) return; inp.value = Math.max(0, (Math.floor(num(inp.value)) || 0) + Number(el.dataset.v)) || ""; ciInput(inp); }
