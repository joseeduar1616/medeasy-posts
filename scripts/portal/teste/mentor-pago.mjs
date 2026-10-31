// Diagnóstico do "Mentor pago": mostra as colunas de pagamento do Controle cliente (nome e tipo) e quantas linhas têm cada valor,
// e compara com os repasses pagos que estão no site (portal/data/equipe.json). Não mostra nome nem telefone, porque o log do GitHub é público.
//   NOTION_TOKEN=... NOTION_DB=... PORTAL_SENHA=... node scripts/portal/teste/mentor-pago.mjs
import fs from "node:fs";
async function api(caminho, corpo) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, { method: corpo ? "POST" : "GET", headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(`Notion ${r.status}: ${j.message}`); return j;
}
const titulo = d => (d.title || []).map(t => t.plain_text).join("");
let db = (String(process.env.NOTION_DB || "").match(/[0-9a-f]{32}/i) || [""])[0];
try { await api("databases/" + db); } catch { const bases = (await api("search", { filter: { property: "object", value: "database" }, page_size: 100 })).results || []; const b = bases.find(d => /controle cliente/i.test(titulo(d))); db = b.id.replace(/-/g, ""); }
const base = await api("databases/" + db);
console.log("Colunas ligadas a pagamento e mentor (nome entre aspas, para ver espaços):");
const interessa = Object.entries(base.properties).filter(([k]) => /pag|mentor|corretor|repasse/i.test(k));
for (const [k, p] of interessa) console.log(`  ${JSON.stringify(k)}: ${p.type}${p.type === "formula" ? " = " + (p.formula.expression || "").slice(0, 120) : ""}${p.select ? " opções: " + p.select.options.map(o => o.name).join(", ") : ""}${p.status ? " opções: " + p.status.options.map(o => o.name).join(", ") : ""}`);
const linhas = []; let cursor; do { const j = await api(`databases/${db}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor);
const vivas = linhas.filter(l => !l.archived && !l.in_trash);
const val = p => !p ? null : p.type === "checkbox" ? p.checkbox : p.type === "select" ? p.select?.name ?? null : p.type === "status" ? p.status?.name ?? null : p.type === "date" ? (p.date ? "com data" : null) : p.type === "number" ? (p.number == null ? null : "número") : p.type === "formula" ? (p.formula[p.formula.type] == null ? null : typeof p.formula[p.formula.type]) : p.type === "people" ? (p.people.length ? "pessoa" : null) : p.type === "rich_text" ? (p.rich_text.length ? "texto" : null) : p.type === "multi_select" ? (p.multi_select.length ? "marcado" : null) : "?";
console.log(`\n${vivas.length} linhas. Valores por coluna:`);
for (const [k] of interessa) { const c = {}; for (const l of vivas) { const v = String(val(l.properties[k])); c[v] = (c[v] || 0) + 1; } console.log(`  ${JSON.stringify(k)}: ${JSON.stringify(c)}`); }
// Linhas com Mentor pago marcado: como estão as outras colunas
const mp = Object.keys(base.properties).find(k => /^mentor\s*pago\s*$/i.test(k));
if (mp) {
  const marc = vivas.filter(l => { const v = val(l.properties[mp]); return v === true || /sim|pago/i.test(String(v)); });
  const cont = f => { const c = {}; for (const l of marc) { const v = String(f(l)); c[v] = (c[v] || 0) + 1; } return JSON.stringify(c); };
  console.log(`\n${marc.length} linhas com ${JSON.stringify(mp)} marcado.`);
  console.log("  Mentor preenchido:", cont(l => !!val(l.properties["Mentor"])));
  console.log("  Cliente preenchido:", cont(l => !!(l.properties["Cliente"]?.title || []).length));
  console.log("  Valor total:", cont(l => l.properties["Valor total"]?.number != null));
  console.log("  Editadas nos últimos 3 dias:", cont(l => Date.now() - Date.parse(l.last_edited_time) < 3 * 864e5));
}
// O que o site tem hoje
const SENHA = process.env.PORTAL_SENHA || ""; const enc = new TextEncoder(); const u = s => Uint8Array.from(Buffer.from(s, "base64"));
const e = JSON.parse(fs.readFileSync("portal/data/equipe.json", "utf8"));
for (const s of [SENHA, SENHA.toLowerCase()]) {
  try {
    const k = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: u(e.salt), iterations: e.it || 310000, hash: "SHA-256" }, await crypto.subtle.importKey("raw", enc.encode(s), "PBKDF2", false, ["deriveKey"]), { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const d = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u(e.iv) }, k, u(e.ct))));
    const reps = (d.clientes || []).flatMap(c => c.repasses || []).filter(r => r.papel === "Mentor");
    console.log(`\nNo site (equipe.json, gerado em ${d.geradoEm || d.atualizadoEm || "?"}): ${reps.length} repasses de mentor, ${reps.filter(r => r.pago).length} pagos, ${reps.filter(r => r.liberado && !r.pago).length} a receber.`);
    break;
  } catch {}
}
