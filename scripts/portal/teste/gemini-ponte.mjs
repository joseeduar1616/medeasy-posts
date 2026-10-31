// Teste da leitura pelo Gemini, do mesmo jeito que o site faz: sobe o orçamento de exemplo (cliente inventado) pela ponte e pede a leitura.
//   PONTE=https://... PORTAL_SENHA=... node scripts/portal/teste/gemini-ponte.mjs
import fs from "node:fs"; import path from "node:path";
const PONTE = (process.env.PONTE || "https://medeasy-ponte.medeasy.workers.dev").replace(/\/$/, "");
const arq = path.join(path.dirname(new URL(import.meta.url).pathname), "orcamento-exemplo.pdf");
let senha = process.env.PORTAL_SENHA || "";
const h = s => ({ Authorization: "Bearer " + s, "X-Quem": "Teste" });
const t0 = Date.now(); const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + "s";
console.log("saude:", await (await fetch(PONTE + "/saude")).text());
// a senha pode estar com maiúscula no secret
for (const s of [senha, senha.toLowerCase()]) { const r = await fetch(PONTE + "/gemini/estado", { method: "POST", headers: { ...h(s), "Content-Type": "application/json" }, body: JSON.stringify({ nome: "x" }) }); if (r.status !== 401) { senha = s; break; } }
const dados = fs.readFileSync(arq);
let r = await fetch(PONTE + "/gemini/arquivo", { method: "POST", headers: { ...h(senha), "Content-Type": "application/pdf", "X-Nome": encodeURIComponent("Orçamento exemplo.pdf") }, body: dados });
const sub = await r.json().catch(async () => ({ bruto: await r.text() }));
console.log(seg(), "arquivo:", r.status, JSON.stringify(sub).slice(0, 300));
if (!r.ok) process.exit(1);
let estado = sub.estado; for (let i = 0; estado === "PROCESSING" && i < 30; i++) { await new Promise(ok => setTimeout(ok, 2000)); estado = (await (await fetch(PONTE + "/gemini/estado", { method: "POST", headers: { ...h(senha), "Content-Type": "application/json" }, body: JSON.stringify({ nome: sub.nome }) })).json()).estado; }
console.log(seg(), "estado:", estado);
const esquema = { type: "OBJECT", required: ["opcoes"], properties: { opcoes: { type: "ARRAY", items: { type: "OBJECT", required: ["letra", "total", "linhas"], properties: { letra: { type: "STRING" }, titulo: { type: "STRING" }, total: { type: "NUMBER" }, mensal: { type: "BOOLEAN" }, linhas: { type: "ARRAY", items: { type: "OBJECT", required: ["desc", "valor"], properties: { desc: { type: "STRING" }, conta: { type: "STRING" }, valor: { type: "NUMBER" } } } } } } } } };
r = await fetch(PONTE + "/gemini/gerar", { method: "POST", headers: { ...h(senha), "Content-Type": "application/json" }, body: JSON.stringify({ texto: "Este arquivo é um orçamento da MedEasy. Leia todas as opções com letra, título, linhas (descrição, conta e valor) e o total de cada uma. Use ponto como separador decimal.", arquivos: [{ uri: sub.uri, tipo: sub.tipo }], esquema, rapido: true }) });
const g = await r.json().catch(async () => ({ bruto: await r.text() }));
console.log(seg(), "leitura:", r.status, JSON.stringify(g).slice(0, 900));
process.exit(r.ok ? 0 : 1);
