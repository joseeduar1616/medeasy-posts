// Acha linhas repetidas por engano no Controle cliente (mesmo cliente, telefone, mentor, serviço, valor, pagamento e status,
// criadas com menos de 30 minutos de diferença) e, com --apagar, manda as de sobra para a lixeira do Notion.
// Fica a linha ligada à triagem do site. Se nenhuma estiver ligada, fica a mais antiga.
// O registro não mostra nome nem telefone, porque o log do GitHub é público.
//   NOTION_TOKEN=... NOTION_DB=... node scripts/portal/duplicadas.mjs [--apagar]
const APAGAR = process.argv.includes("--apagar");
async function api(caminho, corpo, metodo) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, { method: metodo || (corpo ? "POST" : "GET"), headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(`Notion ${r.status}: ${j.message}`); return j;
}
async function todas(db) { const out = []; let cursor; do { const j = await api(`databases/${db}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); out.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor); return out.filter(l => !l.archived && !l.in_trash); }
const bases = (await api("search", { filter: { property: "object", value: "database" }, page_size: 100 })).results || [];
const titulo = d => (d.title || []).map(t => t.plain_text).join("");
let db = (String(process.env.NOTION_DB || "").match(/[0-9a-f]{32}/i) || [""])[0];
try { await api("databases/" + db); } catch { const b = bases.find(d => /controle cliente/i.test(titulo(d))); if (!b) throw new Error("Não achei a base Controle cliente"); db = b.id.replace(/-/g, ""); }
const sem = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const txt = p => !p ? "" : p.type === "title" ? p.title.map(t => t.plain_text).join("") : p.type === "rich_text" ? p.rich_text.map(t => t.plain_text).join("") : p.type === "select" ? p.select?.name || "" : p.type === "status" ? p.status?.name || "" : p.type === "multi_select" ? p.multi_select.map(o => o.name).sort().join(",") : p.type === "number" ? String(p.number ?? "") : p.type === "phone_number" ? String(p.phone_number || "").replace(/\D/g, "").slice(-8) : "";
const chave = l => { const p = l.properties; return ["Cliente", "Telefone", "Mentor", "Tipo de serviço", "Valor total", "Pagamento", "Status"].map(k => sem(txt(p[k]))).join("|"); };
// Linhas ligadas a uma triagem do site (botão "Criar cliente no Notion")
const ligadas = new Set();
const bt = bases.find(d => /triagem medeasy/i.test(titulo(d)));
if (bt) for (const l of await todas(bt.id.replace(/-/g, ""))) { try { const d = JSON.parse(txt(l.properties["Dados do site"]) || "{}"); for (const s of [d.clienteNotionId, (String(d.clienteNotion || "").match(/[0-9a-f]{32}/i) || [])[0]]) if (s) ligadas.add(String(s).replace(/-/g, "")); } catch {} }
const linhas = await todas(db); const grupos = new Map();
for (const l of linhas) { const k = chave(l); if (!sem(txt(l.properties.Cliente))) continue; (grupos.get(k) || grupos.set(k, []).get(k)).push(l); }
let n = 0;
for (const g of grupos.values()) {
  if (g.length < 2) continue;
  g.sort((a, b) => Date.parse(a.created_time) - Date.parse(b.created_time));
  if (Date.parse(g.at(-1).created_time) - Date.parse(g[0].created_time) > 30 * 60 * 1000) continue;
  const fica = g.find(l => ligadas.has(l.id.replace(/-/g, ""))) || g[0]; const sai = g.filter(l => l !== fica); n++;
  console.log(`Grupo ${n}: ${g.length} linhas iguais criadas em ${g.map(l => l.created_time).join(", ")}. Fica ...${fica.id.slice(-6)} (${ligadas.has(fica.id.replace(/-/g, "")) ? "ligada à triagem" : "a mais antiga"}). Sobra: ${sai.map(l => "..." + l.id.slice(-6)).join(", ")}`);
  if (APAGAR) for (const l of sai) { await api(`pages/${l.id}`, { archived: true }, "PATCH"); console.log(`  ...${l.id.slice(-6)} foi para a lixeira do Notion`); }
}
console.log(n ? (APAGAR ? "Pronto." : "Nada apagado. Rode com apagar marcado para mandar as de sobra para a lixeira.") : `Nenhuma linha repetida (${linhas.length} linhas conferidas).`);
