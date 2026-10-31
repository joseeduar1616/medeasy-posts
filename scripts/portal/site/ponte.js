/* ---------- ponte: grava no Notion pelo site (Cloudflare Worker em worker/) ---------- */
/* PONTE vem de scripts/portal/ponte.txt na montagem. Vazio: o site volta a só copiar o texto para colar no Notion. */
const PONTE = "__PONTE__";
const temPonte = () => !!PONTE && S.modo === "mentor" && !!S.senha;
async function pontePedido(rota, corpo){
  // X-Quem: quem está usando (a ponte reconhece José e Eduardo como administradores). Codificado porque cabeçalho não aceita acento.
  const h = { "Content-Type":"application/json", Authorization:"Bearer " + S.senha, "X-Quem":encodeURIComponent(S.mentor?.nome || "") };
  const r = await fetch(PONTE.replace(/\/$/, "") + rota, { method:"POST", headers:h, body:JSON.stringify(corpo || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erro || ("erro " + r.status)); return j;
}
/* Grava colunas numa linha do Notion. pageId é o id do serviço (linha). Atualiza o site local na hora e pede a sincronização. */
async function salvarNotion(pageId, props, mensagem){
  if (!temPonte()) throw new Error("Ponte desligada");
  toast("Gravando no Notion");
  const j = await pontePedido("/pagina", { id:pageId, props, quem:S.mentor?.nome });
  S.ultimaGravacao = Date.now(); S.sincronizando = j.sincronizar && j.sincronizar.ok;
  toast(mensagem || (j.sincronizar && j.sincronizar.ok ? "Gravado no Notion. O site atualiza em 1 ou 2 minutos" : "Gravado no Notion"));
  if (j.recusadas && j.recusadas.length) setTimeout(() => toast("Sem permissão para: " + j.recusadas.join(", ")), 2800);
  return j;
}
/* Ao entrar, pede ao GitHub para ler o Notion de novo. No máximo uma vez a cada 10 minutos por aparelho. */
function pedirSincronizacao(){
  if (!temPonte()) return;
  let ult = 0; try { ult = Number(localStorage.getItem("medeasy-sync")) || 0; } catch {}
  if (Date.now() - ult < 10 * 60 * 1000) return;
  try { localStorage.setItem("medeasy-sync", String(Date.now())); } catch {}
  pontePedido("/sincronizar").catch(() => {});
}
/* Qual linha do Notion recebe os textos do cliente (contagem e controle): o serviço em andamento, ou o primeiro */
const paginaDoCliente = c => { const s = (c.servicos || []).find(s => s.notion && (s.etapa || 0) < 6) || (c.servicos || []).find(s => s.notion); return s ? s.id : ""; };
/* Edição rápida do serviço na tela do cliente */
const STATUS_NOTION = ["Não iniciada", "Aguardando certificado do cliente", "Em andamento", "Concluído"];
const PAGAMENTO_NOTION = ["Não pago", "1° parcela", "Pagamento finalizado"];
function servicoEditor(c, s){
  if (!temPonte() || !s.id) return "";
  const pago = (c.repasses || []).find(r => r.servico === s.id && r.papel === "Mentor");
  return `<div class="row" style="margin-top:8px;gap:6px" data-svc="${s.id}">
    <select class="in" data-se="Status" style="width:auto;padding:5px 8px;font-size:13px">${STATUS_NOTION.map(o => `<option ${semAcento(s.status) === semAcento(o) ? "selected" : ""}>${o}</option>`).join("")}</select>
    <select class="in" data-se="Pagamento" style="width:auto;padding:5px 8px;font-size:13px">${PAGAMENTO_NOTION.map(o => `<option ${semAcento(s.pagamento || "") === semAcento(o) ? "selected" : ""}>${o}</option>`).join("")}${s.pagamento == null || !PAGAMENTO_NOTION.some(o => semAcento(o) === semAcento(s.pagamento || "")) ? `<option value="" selected>Pagamento: em branco</option>` : ""}</select>
    ${S.admin ? `<label class="chk"><input type="checkbox" data-se="Mentor pago" ${pago && pago.pago ? "checked" : ""}><span>Mentor pago</span></label>` : ""}
    <button class="btn sm pri" data-a="salvarServico" data-id="${s.id}">Salvar no Notion</button></div>`;
}
async function salvarServico(id){
  const c = clienteSel(); const s = (c.servicos || []).find(x => x.id === id); if (!s) return;
  const box = document.querySelector(`[data-svc="${id}"]`); const props = {};
  box.querySelectorAll("[data-se]").forEach(el => { props[el.dataset.se] = el.type === "checkbox" ? el.checked : el.value; });
  if (props["Pagamento"] === "") delete props["Pagamento"];
  try {
    await salvarNotion(id, props);
    // Atualiza a tela na hora, sem esperar a sincronização
    s.status = props["Status"]; s.etapa = etapaDeJS(props["Status"], props["Pagamento"] ?? s.pagamento); if (props["Pagamento"] !== undefined) s.pagamento = props["Pagamento"];
    const r = (c.repasses || []).find(r => r.servico === id && r.papel === "Mentor"); if (r){ if (props["Mentor pago"] !== undefined) r.pago = props["Mentor pago"]; r.liberado = s.etapa === 6 && semAcento(s.pagamento || "").startsWith("pagamento finalizado"); }
    const f = c.financeiro || {}; if (props["Pagamento"] !== undefined){ const t = s.total || 0; const antes = s.pago || 0; const dep = pagoDeJS(t, props["Pagamento"]); f.pago = Math.max(0, (f.pago || 0) - antes + dep); s.pago = dep; }
    render();
  } catch (e) { toast("Não gravou: " + e.message); }
}
function etapaDeJS(status, pagamento){ const s = semAcento(status); if (s.startsWith("concluido")) return 6; if (s.startsWith("em andamento")) return 3; if (s.startsWith("aguardando")) return 0; return !pagamento || semAcento(pagamento).startsWith("nao pago") ? 2 : 1; }
function pagoDeJS(total, pagamento){ const p = semAcento(pagamento); if (p.startsWith("pagamento finalizado")) return total; if (p.startsWith("1")) return Math.round(total * 50) / 100; return 0; }
/* ---------- Pagamentos do cliente: o que ele já pagou, parcela por parcela ----------
   Ficam no controle do cliente (campo pagamentos, vai para o Notion em "Controle de certificados"). O build usa esses valores
   no lugar da conta pelo status do Pagamento. Ao lançar, o Pagamento da linha muda sozinho: 1° parcela ou Pagamento finalizado. */
const FORMAS_PAG = ["Pix", "Cartão", "Boleto", "Dinheiro", "Transferência"];
const svcsPagaveis = c => (c.servicos || []).filter(s => !s.mensal && s.id);
const pagsDe = c => { const ct = S.ctrl?.[c.id] || c.controle; return ct && Array.isArray(ct.pagamentos) ? ct.pagamentos.filter(x => x && num(x.valor) > 0) : []; };
const somaPags = l => r2(l.reduce((a, x) => a + num(x.valor), 0));
/* Divide os pagamentos entre os serviços: o que tem serviço marcado vai para ele, o do cliente todo preenche os serviços em ordem */
function dividirPags(svs, pags){
  const m = {}; svs.forEach(s => { m[s.id] = 0; });
  for (const p of pags) if (p.servico && p.servico in m) m[p.servico] += num(p.valor);
  let solto = pags.filter(p => !(p.servico && p.servico in m)).reduce((a, p) => a + num(p.valor), 0);
  for (const s of svs){ if (solto <= 0.009) break; const v = Math.min(Math.max(0, num(s.total) - m[s.id]), solto); m[s.id] += v; solto -= v; }
  if (solto > 0.009 && svs.length) m[svs[svs.length - 1].id] += solto;
  for (const k in m) m[k] = r2(m[k]); return m;
}
/* Total pago: com algum pagamento lançado, é só a soma do que foi lançado (null quando não há nenhum, e aí vale a conta pelo status) */
function pagoLancado(c){ const p = pagsDe(c); return p.length ? somaPags(p) : null; }
function pagamentoCard(c){
  const f = fin(c); const lst = pagsDe(c).slice().sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))); const svs = svcsPagaveis(c);
  const nomeSvc = id => (svs.find(s => s.id === id) || {}).nome || "";
  return `<section class="card"><div class="card-h"><h2>Pagamento do cliente</h2></div><div class="row between small"><span>Total</span><b class="num">${brl(f.total)}</b></div><div class="row between small"><span>Pago${lst.length ? "" : ` <span class="xs muted">(conta pelo status do Notion)</span>`}</span><b class="num neon">${brl(f.pago)}</b></div><div class="row between small"><span>Saldo</span><b class="num gold">${brl(f.saldo)}</b></div>
   ${lst.length ? `<div class="list" style="margin-top:10px">${lst.map(p => `<div class="li"><div class="grow"><div class="t">${brl(p.valor)}${p.forma ? " · " + esc(p.forma) : ""}</div><div class="xs muted">${p.data ? dBR(p.data) : "sem data"}${svs.length > 1 && nomeSvc(p.servico) ? " · " + esc(nomeSvc(p.servico)) : ""}</div></div><button class="btn sm ghost" data-a="pagTirar" data-id="${esc(p.id)}">Tirar</button></div>`).join("")}</div>` : ""}
   ${svs.length ? `<div class="stack" style="margin-top:10px;gap:6px"><div class="row" style="gap:6px"><input class="in" id="pagValor" inputmode="decimal" placeholder="Valor pago" style="flex:1;min-width:120px"><input class="in" id="pagData" type="date" value="${isoLocal()}" style="width:auto"></div>
    <div class="row" style="gap:6px">${svs.length > 1 ? `<select class="in" id="pagSvc" style="flex:1;min-width:120px"><option value="">Cliente todo</option>${svs.map(s => `<option value="${esc(s.id)}">Só ${esc(s.nome)}${s.total ? " · " + brl(s.total) : ""}</option>`).join("")}</select>` : ""}<select class="in" id="pagForma" style="width:auto">${["", ...FORMAS_PAG].map(x => `<option value="${x}">${x || "Forma"}</option>`).join("")}</select><button class="btn sm pri" data-a="pagLancar">Lançar pagamento</button></div>
    <p class="xs muted" style="margin:0">${lst.length ? "O Pago é a soma dos valores lançados." : "Depois do primeiro lançamento, o Pago passa a ser só a soma do que for lançado. Lance também o que o cliente já tinha pago antes."} O Pagamento no Notion muda sozinho: 1° parcela quando entra o primeiro valor e Pagamento finalizado quando chega no total.</p></div>` : ""}</section>`;
}
async function lancarPagamento(){
  const c = clienteSel(); if (!c) return; const svs = svcsPagaveis(c); if (!svs.length) return;
  const v = r2(num(document.getElementById("pagValor")?.value)); if (!(v > 0)){ toast("Digite o valor que o cliente pagou"); return; }
  const sid = svs.length > 1 ? document.getElementById("pagSvc")?.value || "" : svs[0].id;
  const ct = ctrlDe(c); (ct.pagamentos ||= []).push({ id:"pg" + Date.now().toString(36), valor:v, data:document.getElementById("pagData")?.value || isoLocal(), servico:sid, forma:document.getElementById("pagForma")?.value || "" });
  await gravarPagamentos(c, `Pagamento de ${brl(v)} lançado`);
}
async function tirarPagamento(id){
  const c = clienteSel(); if (!c) return; const ct = ctrlDe(c); const p = (ct.pagamentos || []).find(x => x.id === id); if (!p) return;
  if (!confirm(`Tirar o pagamento de ${brl(p.valor)}${p.data ? " de " + dBR(p.data) : ""}?`)) return;
  ct.pagamentos = ct.pagamentos.filter(x => x.id !== id); await gravarPagamentos(c, "Pagamento tirado");
}
async function gravarPagamentos(c, msg){
  const ct = ctrlDe(c); salvarCtrl(c); const svs = svcsPagaveis(c);
  // Novo status do Pagamento de cada linha, pelo que foi lançado nela
  const div = dividirPags(svs, (ct.pagamentos || []).filter(x => x && num(x.valor) > 0));
  let mud = svs.map(s => { const soma = div[s.id] || 0, tot = num(s.total);
    return { s, soma, tot, st:soma <= 0 ? "Não pago" : tot > 0 && soma >= tot - 0.009 ? "Pagamento finalizado" : "1° parcela" }; }).filter(x => semAcento(x.st) !== semAcento(x.s.pagamento || ""));
  const baixa = mud.filter(x => semAcento(x.s.pagamento || "").startsWith("pagamento finalizado"));
  if (baixa.length && !confirm(`No Notion ${baixa.length === 1 ? "esse serviço está" : "esses serviços estão"} como Pagamento finalizado, mas o que foi lançado soma ${baixa.map(x => `${brl(x.soma)} de ${brl(x.tot)}`).join(" e ")}. Mudar para ${baixa[0].st}?`)) mud = mud.filter(x => !baixa.includes(x));
  for (const s of svs) s.pago = div[s.id] || 0;
  for (const { s, st } of mud){ s.pagamento = st; s.etapa = etapaDeJS(s.status, st); const r = (c.repasses || []).find(r => r.servico === s.id && r.papel === "Mentor"); if (r) r.liberado = s.etapa === 6 && st === "Pagamento finalizado"; }
  render();
  const pag = typeof temPonte === "function" && temPonte() ? paginaDoCliente(c) : "";
  if (!pag){ toast("Salvo neste navegador. Sem a ponte, use Copiar controle para o Notion"); return; }
  const txt = textoCtrl(ct); const daPag = mud.find(x => x.s.id === pag);
  try {
    for (const x of mud) if (x !== daPag) await salvarNotion(x.s.id, { "Pagamento":x.st }, "Pagamento atualizado no Notion");
    await salvarNotion(pag, { "Controle de certificados":txt, ...(daPag ? { "Pagamento":daPag.st } : {}) }, msg + (mud.length === 1 ? ". Pagamento no Notion: " + mud[0].st : mud.length ? ". Pagamento atualizado no Notion" : ""));
    ct.notion = txt; c.controle = JSON.parse(txt); salvarCtrl(c);
  } catch (e) { toast("Ficou neste navegador, mas não gravou no Notion: " + e.message); }
}
/* ---------- Novo serviço para um cliente que já existe (mentoria depois do Vitae, mês novo da mentoria, outra prova) ----------
   Cria uma linha no Controle cliente com o mesmo nome e telefone, então o cliente volta para Em andamento e o portal mostra o serviço. */
const NOVOS_SVC = [["mentoria", "Mentoria mensal"], ["mentoriaInd", "Mentoria individual"], ["vitae", "Currículo Vitae"], ["analise", "Análise curricular"], ["lattes", "Currículo Lattes"], ["certificados", "Certificados"]];
function valorNovoSvc(tipo, reunioes){ return tipo === "mentoria" ? PRECO.mentoria.mensal : tipo === "mentoriaInd" ? PRECO.mentoria.reuniao * Math.max(1, reunioes || 1) : ""; }
function novoServicoForm(c){
  if (!S.novoSvc || S.novoSvc.id !== c.id) return "";
  const n = S.novoSvc; const provas = (c.provas || []).map(p => p.nome);
  return `<div class="svc" id="novoSvc" style="margin-top:8px"><div class="stack" style="gap:8px">
    <div class="row" style="gap:6px"><select class="in" data-ns="tipo" style="flex:1">${NOVOS_SVC.map(([k, t]) => `<option value="${k}" ${n.tipo === k ? "selected" : ""}>${t}</option>`).join("")}</select>${n.tipo === "mentoriaInd" ? `<input class="in" data-ns="reunioes" type="number" min="1" value="${n.reunioes || 1}" style="width:80px" title="Reuniões">` : ""}</div>
    ${provas.length ? `<div class="row" style="gap:10px;flex-wrap:wrap">${provas.map(p => `<label class="chk"><input type="checkbox" data-nsp="${esc(p)}" ${!n.fora?.includes(p) ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}</div>` : ""}
    <div class="row" style="gap:6px"><input class="in" data-ns="valor" inputmode="decimal" placeholder="Valor total" value="${n.valor ?? ""}" style="flex:1;min-width:110px"><select class="in" data-ns="status" style="width:auto">${STATUS_NOTION.map(o => `<option ${(n.status || "Em andamento") === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
    ${n.tipo === "mentoria" && provas.length - (n.fora || []).length > 2 ? `<p class="xs gold" style="margin:0">Com mais de 2 provas a mentoria mensal não tem valor definido. Combine com o cliente e ajuste o valor.</p>` : ""}
    <div class="row" style="gap:6px"><button class="btn sm pri" data-a="novoSvcCriar">Criar no Notion</button><button class="btn sm ghost" data-a="novoSvcFechar">Cancelar</button></div>
    <p class="xs muted" style="margin:0">Cria uma linha nova no Notion com o mesmo nome e telefone, Pagamento Não pago. O cliente volta para Em andamento e o portal dele mostra o serviço.</p></div></div>`;
}
function novoSvcLer(){
  const n = S.novoSvc; if (!n) return; const box = document.getElementById("novoSvc"); if (!box) return;
  box.querySelectorAll("[data-ns]").forEach(el => { n[el.dataset.ns] = el.value; });
  n.fora = [...box.querySelectorAll("[data-nsp]")].filter(el => !el.checked).map(el => el.dataset.nsp);
}
function novoSvcMudou(el){
  const n = S.novoSvc; if (!n) return; const tipoAntes = n.tipo, reuAntes = n.reunioes; novoSvcLer();
  if (n.tipo !== tipoAntes || n.reunioes !== reuAntes) n.valor = valorNovoSvc(n.tipo, +n.reunioes);
  if (el.dataset.ns === "tipo" || el.dataset.ns === "reunioes" || el.dataset.nsp) render();
}
async function criarNovoServico(){
  const c = clienteSel(); const n = S.novoSvc; if (!c || !n) return; novoSvcLer();
  if (S.criandoSvc) return;
  const provas = (c.provas || []).map(p => p.nome).filter(p => !(n.fora || []).includes(p));
  const valor = String(n.valor ?? "").trim() === "" ? null : r2(num(n.valor));
  const mentor = (S.mentor && !S.admin ? S.mentor.nome : "") || c.mentor || S.mentor?.nome || "";
  const props = { "Cliente":c.nome, "Telefone":c.whatsapp || "", "Tipo de serviço":[SERVICO_NOTION[n.tipo], ...provas].filter(Boolean), "Mentor":mentor, "Status":n.status || "Em andamento", "Pagamento":"Não pago", "Valor total":valor, "Data de início ":isoLocal() };
  S.criandoSvc = true; const bt = document.querySelector("[data-a=novoSvcCriar]"); if (bt){ bt.disabled = true; bt.textContent = "Criando..."; }
  try {
    let j = await pontePedido("/cliente", { props });
    if (j.jaExistia){
      if (!confirm("Esse serviço já foi criado para esse cliente nos últimos 2 dias. Criar outra linha mesmo assim?")){ toast("Nada foi criado. A linha que já existe aparece aqui na próxima sincronização"); S.novoSvc = null; return; }
      j = await pontePedido("/cliente", { props, outraLinha:true });
    }
    const nome = NOVOS_SVC.find(x => x[0] === n.tipo)[1];
    // Aparece na hora, sem esperar a sincronização
    (c.servicos ||= []).push({ id:String(j.id || "").replace(/-/g, ""), notion:j.url || "", nome:nome + (provas.length ? " · " + provas.join(", ") : ""), status:props.Status, pagamento:"Não pago", total:valor || 0, pago:0, mensal:n.tipo === "mentoria", etapa:etapaDeJS(props.Status, "Não pago"), inicio:isoLocal(), mentor });
    if (c.financeiro && n.tipo !== "mentoria") c.financeiro.total = num(c.financeiro.total) + (valor || 0);
    S.novoSvc = null; toast("Serviço criado no Notion. O site atualiza em 1 ou 2 minutos");
  } catch (e) { toast("Não criou: " + e.message); }
  finally { S.criandoSvc = false; render(); }
}
/* ---------- Gemini pela ponte: lê orçamento, certificados, currículo e edital, e faz a nota ----------
   O site sobe os arquivos para a ponte, e ela fala com o Gemini. A chave fica só na ponte. Sem a chave, cada leitura volta para o leitor do site. */
let geminiOk = null;
async function temGemini(){
  if (!temPonte()) return false; if (geminiOk !== null) return geminiOk;
  try { const r = await fetch(PONTE.replace(/\/$/, "") + "/saude"); geminiOk = !!(await r.json()).gemini; } catch { geminiOk = false; }
  return geminiOk;
}
const tipoArquivo = f => f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.png$/i.test(f.name) ? "image/png" : /\.webp$/i.test(f.name) ? "image/webp" : /\.hei[cf]$/i.test(f.name) ? "image/heic" : "image/jpeg");
async function geminiSobe(f){
  const h = { "Content-Type":tipoArquivo(f), Authorization:"Bearer " + S.senha, "X-Quem":encodeURIComponent(S.mentor?.nome || ""), "X-Nome":encodeURIComponent(f.name) };
  const r = await fetch(PONTE.replace(/\/$/, "") + "/gemini/arquivo", { method:"POST", headers:h, body:f });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erro || ("erro " + r.status)); return j;
}
/* Manda os arquivos e o pedido. Word vira texto dentro do pedido (o Gemini não abre .docx). Com esquema, devolve o JSON. */
async function geminiLer(arquivos, pedido, esquema, { rapido = false, aviso = "Lendo com o Gemini" } = {}){
  const docs = arquivos.filter(f => /\.docx$/i.test(f.name)); const outros = arquivos.filter(f => !docs.includes(f));
  let texto = pedido;
  if (outros.length) texto += `\n\nArquivos anexados, nesta ordem: ${outros.map((f, i) => `${i + 1}. ${f.name}`).join("; ")}.`;
  for (const d of docs) texto += `\n\nConteúdo do arquivo ${d.name}:\n` + (await textoDoDocx(d)).slice(0, 150000);
  if (outros.length) toast(`${aviso}: enviando ${outros.length} ${outros.length === 1 ? "arquivo" : "arquivos"}`);
  const sub = []; for (let i = 0; i < outros.length; i += 4) sub.push(...await Promise.all(outros.slice(i, i + 4).map(geminiSobe)));
  for (const a of sub){ let n = 0; while (a.estado === "PROCESSING" && n++ < 45){ await new Promise(r => setTimeout(r, 2000)); a.estado = (await pontePedido("/gemini/estado", { nome:a.nome })).estado; }
    if (a.estado === "FAILED") throw new Error("o Gemini não conseguiu abrir um dos arquivos"); }
  toast(`${aviso}. Pode levar até 1 minuto`);
  // Aviso a cada 10 segundos enquanto espera, para ninguém achar que travou
  const t0 = Date.now(); const tick = setInterval(() => toast(`${aviso}: ${Math.round((Date.now() - t0) / 1000)} segundos`), 10000);
  let j; try { j = await pontePedido("/gemini/gerar", { texto, arquivos:sub.map(a => ({ uri:a.uri, tipo:a.tipo })), esquema, rapido }); } finally { clearInterval(tick); }
  if (!esquema) return j.texto;
  try { return JSON.parse(String(j.texto).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")); } catch { throw new Error("o Gemini respondeu fora do formato"); }
}
