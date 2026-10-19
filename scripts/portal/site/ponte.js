/* ---------- ponte: grava no Notion pelo site (Cloudflare Worker em worker/) ---------- */
/* PONTE vem de scripts/portal/ponte.txt na montagem. Vazio: o site volta a só copiar o texto para colar no Notion. */
const PONTE = "__PONTE__";
const temPonte = () => !!PONTE && S.modo === "mentor" && !!S.senha;
async function pontePedido(rota, corpo){
  const h = { "Content-Type":"application/json", Authorization:"Bearer " + S.senha }; if (S.admin && S.senhaAdmin) h["X-Admin"] = S.senhaAdmin;
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
