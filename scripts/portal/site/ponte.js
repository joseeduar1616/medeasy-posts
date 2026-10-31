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
  const j = await pontePedido("/gemini/gerar", { texto, arquivos:sub.map(a => ({ uri:a.uri, tipo:a.tipo })), esquema, rapido });
  if (!esquema) return j.texto;
  try { return JSON.parse(String(j.texto).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")); } catch { throw new Error("o Gemini respondeu fora do formato"); }
}
