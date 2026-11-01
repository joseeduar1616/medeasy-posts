// Testes da ponte (worker/src/index.js) com Notion, GitHub e Gemini de mentira. Nada sai da máquina.
//   node --test scripts/portal/teste/
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../worker/src/index.js";

const SENHA = "senha-de-teste";
const CLIENTES = "c".repeat(32), TRIAGEM = "d".repeat(32), OUTRA = "e".repeat(32);
const env = { FEEDBACK_DB: "f".repeat(32), PORTAL_SENHA: SENHA, NOTION_TOKEN: "x", CLIENTES_DB: CLIENTES, TRIAGEM_DB: TRIAGEM, SITE: "https://site.teste", ORIGEM: "https://site.teste" };

// Notion de mentira: páginas com a base mãe e o Pagamento
const paginas = {
  ["1".repeat(32)]: { parent: { database_id: CLIENTES }, pagamento: "Não pago" },
  ["2".repeat(32)]: { parent: { database_id: CLIENTES }, pagamento: "1° parcela" },
  ["3".repeat(32)]: { parent: { database_id: OUTRA }, pagamento: "" },
};
let chamadas = [], criadas = [];
const arq = async c => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("medeasy-c:" + c)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st });
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url); chamadas.push({ u, m: opt.method || "GET", corpo: opt.body ? JSON.parse(opt.body) : null });
  if (u.startsWith("https://api.notion.com/v1/")) {
    const c = u.slice("https://api.notion.com/v1/".length);
    const pg = c.match(/^pages\/([0-9a-f]{32})$/);
    if (pg && (opt.method || "GET") === "GET") { const p = paginas[pg[1]]; return p ? json({ id: pg[1], parent: p.parent, properties: { Pagamento: { select: p.pagamento ? { name: p.pagamento } : null } } }) : json({ message: "não achei" }, 404); }
    if (pg && opt.method === "PATCH") return json({ id: pg[1] });
    if (c === `databases/${OUTRA}`) return json({ title: [{ plain_text: "Outra base" }], properties: {} });
    if (c.startsWith("databases/") && c.endsWith("/query")) return json({ results: criadas });
    if (c.startsWith("databases/")) return json({ properties: {} });
    if (c === "pages" && opt.method === "POST") { const id = String(criadas.length + 1).padStart(32, "a"); const corpo = JSON.parse(opt.body); if (corpo.properties.Cliente) criadas.push({ id, url: "https://notion.so/" + id, properties: { Cliente: { title: [{ plain_text: corpo.properties.Cliente.title[0].text.content }] }, Telefone: { phone_number: corpo.properties.Telefone?.phone_number }, "Tipo de serviço": corpo.properties["Tipo de serviço"] } }); return json({ id, url: "https://notion.so/" + id }); }
    return json({});
  }
  // Só o código ABCD-EFGH-JK existe no site
  if (u.startsWith("https://site.teste/data/c/")) return u.includes(await arq("ABCDEFGHJK")) ? new Response("{}") : new Response("", { status: 404 });
  return json({ erro: "fora do teste" }, 500);
};
// Cache do Cloudflare de mentira (limite de envios do feedback)
const cache = new Map();
globalThis.caches = { default: { match: async r => cache.get(r.url), put: async (r, v) => { cache.set(r.url, v); } } };

const pede = (rota, { corpo, senha = SENHA, quem = "Lucas", metodo = "POST", origem = "https://site.teste", cab = {} } = {}) =>
  worker.fetch(new Request("https://ponte.teste" + rota, { method: metodo, headers: { "Content-Type": "application/json", Origin: origem, ...(senha != null ? { Authorization: "Bearer " + senha } : {}), "X-Quem": encodeURIComponent(quem), ...cab }, body: metodo === "GET" ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo ?? {}) }), env);
const ler = async r => [r.status, await r.json()];

test("sem senha ou com senha errada: 401", async () => {
  assert.equal((await pede("/pagina", { senha: null, corpo: {} })).status, 401);
  assert.equal((await pede("/pagina", { senha: "errada", corpo: {} })).status, 401);
});
test("saúde responde sem senha e sem mostrar segredo", async () => {
  const [st, j] = await ler(await pede("/saude", { metodo: "GET", senha: null }));
  assert.equal(st, 200); assert.equal(j.ok, true); assert.ok(!JSON.stringify(j).includes(SENHA));
});
test("CORS: origem de fora não é liberada", async () => {
  const r = await pede("/saude", { metodo: "GET", origem: "https://outro.site" });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "null");
  assert.equal((await pede("/saude", { metodo: "GET" })).headers.get("Access-Control-Allow-Origin"), "https://site.teste");
});
test("método e corpo inválidos", async () => {
  assert.equal((await pede("/pagina", { metodo: "GET" })).status, 405);
  assert.equal((await pede("/pagina", { corpo: "{quebrado" })).status, 400);
  assert.equal((await pede("/pagina", { corpo: "[1,2]" })).status, 400);
  assert.equal((await pede("/nada", { corpo: {} })).status, 404);
});
test("/pagina: id inválido e página de outra base são recusados", async () => {
  assert.equal((await pede("/pagina", { corpo: { id: "abc", props: { Status: "Concluído" } } })).status, 400);
  chamadas = [];
  const [st, j] = await ler(await pede("/pagina", { corpo: { id: "3".repeat(32), props: { Status: "Concluído" } } }));
  assert.equal(st, 403); assert.match(j.erro, /Controle cliente/);
  assert.ok(!chamadas.some(c => c.m === "PATCH"), "não pode gravar na outra base");
});
test("/pagina: mentor comum não marca Mentor pago, administrador marca", async () => {
  let [st, j] = await ler(await pede("/pagina", { corpo: { id: "1".repeat(32), props: { "Mentor pago": true, Status: "Concluído" }, sincronizar: false } }));
  assert.equal(st, 200); assert.deepEqual(j.recusadas, ["Mentor pago"]); assert.deepEqual(j.gravadas, ["Status"]);
  [st, j] = await ler(await pede("/pagina", { quem: "José", corpo: { id: "1".repeat(32), props: { "Mentor pago": true }, sincronizar: false } }));
  assert.equal(st, 200); assert.deepEqual(j.gravadas, ["Mentor pago"]);
});
test("/pagina: mentor muda o Valor total só com o cliente Não pago", async () => {
  let [st, j] = await ler(await pede("/pagina", { corpo: { id: "1".repeat(32), props: { "Valor total": "1.542,92" }, sincronizar: false } }));
  assert.equal(st, 200); assert.deepEqual(j.gravadas, ["Valor total"]);
  assert.equal(chamadas.filter(c => c.m === "PATCH").at(-1).corpo.properties["Valor total"].number, 1542.92);
  [st, j] = await ler(await pede("/pagina", { corpo: { id: "2".repeat(32), props: { "Valor total": 999 }, sincronizar: false } }));
  assert.equal(st, 403); assert.deepEqual(j.recusadas, ["Valor total"]);
});
test("/pagina: número inválido não vira null no Notion", async () => {
  const [st, j] = await ler(await pede("/pagina", { quem: "José", corpo: { id: "1".repeat(32), props: { "Valor total": "abc" }, sincronizar: false } }));
  assert.equal(st, 403); assert.deepEqual(j.recusadas, ["Valor total"]);
});
test("/cliente: o mesmo cliente nos últimos 2 dias não é criado de novo", async () => {
  criadas = [];
  const props = { Cliente: "Fulano Teste", Telefone: "(62) 99999-1234", "Tipo de serviço": ["Vitae", "PSU-GO"], Status: "Não iniciada" };
  let [st, j] = await ler(await pede("/cliente", { corpo: { props } }));
  assert.equal(st, 200); assert.ok(!j.jaExistia);
  [st, j] = await ler(await pede("/cliente", { corpo: { props } }));
  assert.equal(st, 200); assert.equal(j.jaExistia, true); assert.equal(criadas.length, 1);
  [st, j] = await ler(await pede("/cliente", { corpo: { props, outraLinha: true } }));
  assert.equal(criadas.length, 2);
  assert.equal((await pede("/cliente", { corpo: { props: { Telefone: "1" } } })).status, 400);
});
test("feedback: sem senha, mas com código que existe, tamanho e limite de envios", async () => {
  assert.equal((await pede("/feedback/enviar", { senha: null, corpo: { codigo: "AB" } })).status, 400);
  assert.equal((await pede("/feedback/enviar", { senha: null, corpo: { codigo: "ZZZZZZZZZZ", publico: { texto: "oi" } } })).status, 403);
  assert.equal((await pede("/feedback/enviar", { senha: null, corpo: "x".repeat(25000), cab: { "Content-Length": "" } })).status, 413);
  assert.equal((await pede("/feedback/enviar", { senha: null, corpo: { codigo: "ABCD-EFGH-JK" } })).status, 400, "vazio");
  chamadas = [];
  const [st, j] = await ler(await pede("/feedback/enviar", { senha: null, corpo: { codigo: "ABCD-EFGH-JK", publico: { nota: 5, texto: "Gostei", assinatura: "M." }, particular: { notaMentor: 9, texto: "ok" } } }));
  assert.equal(st, 200); assert.equal(j.gravados, 2);
  const part = chamadas.filter(c => c.u.endsWith("/v1/pages") && c.m === "POST")[1].corpo.properties;
  assert.equal(part.Nome.title[0].text.content, "Anônimo"); assert.equal(part["Nota do mentor"].number, null, "nota fora de 1 a 5 não entra");
  assert.equal((await pede("/feedback/enviar", { senha: null, corpo: { codigo: "ABCD-EFGH-JK", publico: { texto: "de novo" } } })).status, 429);
});
test("Gemini sem a chave: 503 sem chamar o Google", async () => {
  chamadas = [];
  assert.equal((await pede("/gemini/gerar", { corpo: { texto: "oi" } })).status, 503);
  assert.ok(!chamadas.some(c => c.u.includes("googleapis")));
});
