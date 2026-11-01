// Testes da leitura pelo Gemini na ponte, com o Google de mentira. Nada sai da máquina e nada é cobrado.
//   node --test scripts/portal/teste/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../worker/src/index.js";

const env = { PORTAL_SENHA: "s", GEMINI_API_KEY: "chave-falsa" };
const MODELOS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.8-pro", "gemini-3.8-flash-lite"];
let caso = "", chamadas = [], configs = [];
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st });
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.includes("/v1beta/models?")) return json({ models: MODELOS.map(n => ({ name: "models/" + n })) });
  const m = u.match(/models\/([^:]+):generateContent/);
  if (!m) return json({}, 404);
  chamadas.push(m[1]); const b = JSON.parse(opt.body); configs.push(b.generationConfig);
  if (caso === "sobrecarga" && m[1] === "gemini-3.8-flash") return json({ error: { code: 503, message: "This model is currently experiencing high demand." } }, 503);
  if (caso === "chave") return json({ error: { code: 400, message: "API key not valid." } }, 400);
  if (caso === "fora" && m[1] !== "gemini-3.8-pro") return json({ error: { code: 400, message: `models/${m[1]} is no longer available to new users.` } }, 400);
  if (caso === "524" && m[1] === "gemini-3.8-flash") return new Response("<html>timeout</html>", { status: 524 });
  if (caso === "think" && b.generationConfig.thinkingConfig) return json({ error: { code: 400, message: "Thinking level is not supported for this model." } }, 400);
  return json({ candidates: [{ content: { parts: [{ text: "pensando", thought: true }, { text: "funcionando" }] } }] });
};
const pede = async (corpo, senha = "s") => {
  const r = await worker.fetch(new Request("https://ponte.teste/gemini/gerar", { method: "POST", headers: { Authorization: "Bearer " + senha, "Content-Type": "application/json" }, body: JSON.stringify(corpo) }), env);
  return [r.status, await r.json()];
};
const novo = c => { caso = c; chamadas = []; configs = []; };

test("leitura normal: Flash mais novo, pouco pensamento e sem o texto de pensamento", async () => {
  novo(""); const [st, j] = await pede({ texto: "oi", rapido: true });
  assert.equal(st, 200); assert.equal(j.texto, "funcionando"); assert.equal(j.modelo, "gemini-3.8-flash");
  assert.equal(configs[0].thinkingConfig.thinkingLevel, "low");
});
test("sem senha não chega no Google", async () => {
  novo(""); const [st] = await pede({ texto: "oi" }, "errada");
  assert.equal(st, 401); assert.equal(chamadas.length, 0);
});
test("pedido vazio: 400", async () => { novo(""); assert.equal((await pede({ texto: "" }))[0], 400); });
test("sobrecarga: tenta de novo e passa para o próximo modelo", async () => {
  novo("sobrecarga"); const [st, j] = await pede({ texto: "oi", rapido: true });
  assert.equal(st, 200); assert.equal(j.modelo, "gemini-3.5-flash"); assert.ok(chamadas.filter(c => c === "gemini-3.8-flash").length >= 2);
});
test("chave inválida: para na hora, sem tentar outros modelos", async () => {
  novo("chave"); const [st, j] = await pede({ texto: "oi" });
  assert.equal(st, 502); assert.match(j.erro, /API key/); assert.equal(chamadas.length, 1);
});
test("modelo indisponível: passa para o próximo", async () => {
  novo("fora"); const [st, j] = await pede({ texto: "oi", rapido: true });
  assert.equal(st, 200); assert.equal(j.modelo, "gemini-3.8-pro");
});
test("524 (demorou): passa para o próximo modelo", async () => {
  novo("524"); const [st, j] = await pede({ texto: "oi", rapido: true });
  assert.equal(st, 200); assert.deepEqual(chamadas, ["gemini-3.8-flash", "gemini-3.5-flash"]); assert.equal(j.log[0].st, 524);
});
test("modelo que não aceita o ajuste de pensar: tenta sem", async () => {
  novo("think"); const [st] = await pede({ texto: "oi", rapido: true });
  assert.equal(st, 200); assert.equal(chamadas.length, 2); assert.ok(!configs[1].thinkingConfig);
});
test("arquivo de fora do Google não entra no pedido", async () => {
  novo(""); let corpo = null; const f = globalThis.fetch;
  globalThis.fetch = async (u, o = {}) => { if (String(u).includes(":generateContent")) corpo = JSON.parse(o.body); return f(u, o); };
  await pede({ texto: "oi", arquivos: [{ uri: "https://malicioso.site/x.pdf" }, { uri: "https://generativelanguage.googleapis.com/v1beta/files/abc", tipo: "application/pdf" }] });
  globalThis.fetch = f;
  assert.equal(corpo.contents[0].parts.length, 2);
  assert.match(corpo.contents[0].parts[1].file_data.file_uri, /^https:\/\/generativelanguage/);
});
