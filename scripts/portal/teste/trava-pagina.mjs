// Confere, com a ponte no ar, que a rota /pagina reconhece as linhas do Controle cliente. Não grava nada:
// manda só uma coluna que não existe, então a ponte responde "nenhuma coluna permitida" (linha aceita) antes de gravar.
// Não mostra nome, telefone nem id de cliente, porque o log do GitHub é público.
//   PONTE=... PORTAL_SENHA=... NOTION_TOKEN=... NOTION_DB=... node scripts/portal/teste/trava-pagina.mjs
const PONTE = (process.env.PONTE || "https://medeasy-ponte.medeasy.workers.dev").replace(/\/$/, "");
const api = async (c, corpo) => { const r = await fetch("https://api.notion.com/v1/" + c, { method: corpo ? "POST" : "GET", headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined }); const j = await r.json(); if (!r.ok) throw new Error(`Notion ${r.status}`); return j; };
if (!process.env.NOTION_TOKEN || !process.env.PORTAL_SENHA) { console.log("Sem os secrets do Notion ou da senha. Nada a conferir."); process.exit(0); }
let db = (String(process.env.NOTION_DB || "").match(/[0-9a-f]{32}/i) || [""])[0];
try { await api("databases/" + db); } catch { const b = ((await api("search", { filter: { property: "object", value: "database" }, page_size: 100 })).results || []).find(d => /controle cliente/i.test((d.title || []).map(t => t.plain_text).join(""))); db = b.id.replace(/-/g, ""); }
const linha = ((await api(`databases/${db}/query`, { page_size: 1 })).results || [])[0];
if (!linha) { console.log("Base vazia. Nada a conferir."); process.exit(0); }
const pede = async (s, id) => { const r = await fetch(PONTE + "/pagina", { method: "POST", headers: { Authorization: "Bearer " + s, "Content-Type": "application/json", "X-Quem": "Teste" }, body: JSON.stringify({ id, props: { "Coluna que não existe": 1 }, sincronizar: false }) }); return [r.status, (await r.json().catch(() => ({}))).erro || ""]; };
const senhas = [process.env.PORTAL_SENHA, process.env.PORTAL_SENHA.toLowerCase()];
for (const s of senhas) {
  const [st, erro] = await pede(s, linha.id.replace(/-/g, ""));
  if (st === 401) continue;
  console.log(`Linha do Controle cliente: ${st} ${erro}`);
  if (/nenhuma coluna permitida/.test(erro)) { console.log("Trava do /pagina certa: aceita as linhas do Controle cliente."); process.exit(0); }
  if (/não é do Controle cliente/.test(erro)) { console.log("::error::A ponte recusou uma linha do Controle cliente. Confira CLIENTES_DB no worker/wrangler.toml."); process.exit(1); }
  console.log("::warning::Resposta inesperada da ponte (talvez a versão antiga ainda esteja no ar)."); process.exit(0);
}
console.log("::warning::Não consegui entrar na ponte com a senha da equipe do GitHub.");
