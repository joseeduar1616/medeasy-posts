// Teste do site no navegador sem interface (Playwright), com dois clientes inventados e dados numa pasta temporária.
// Não mexe em portal/data, não fala com a ponte de verdade nem com o Notion. Sem o Playwright instalado, o teste é pulado.
//   node --test scripts/portal/teste/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import http from "node:http";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
let chromium = null;
for (const base of [RAIZ + "/", "/opt/node-tools/node_modules/"]) { try { chromium = createRequire(base)("playwright").chromium; break; } catch {} }

const SENHA = "senha-do-teste";
const linha = (n, cliente, tel, extra = {}) => ({ url: `https://www.notion.so/${String(n).repeat(32).slice(0, 32)}`, Cliente: cliente, Telefone: tel, "Tipo de serviço": JSON.stringify(["Vitae", "PSUGO"]), Mentor: "Lucas", Status: "Em andamento", Pagamento: "1° parcela", "Valor total": 500, "Mentor pago": "__NO__", "date:Data de início :start": "2026-10-01", ...extra });

test("site: login, portal do cliente e tela de celular", { skip: !chromium && "Playwright não está instalado", timeout: 240000 }, async t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "medeasy-site-"));
  fs.mkdirSync(path.join(tmp, "data"));
  fs.writeFileSync(path.join(tmp, "linhas.json"), JSON.stringify([linha(1, "Ana Teste Inventada", "(62) 90000-0001"), linha(2, "Bruno Teste Inventado", "(62) 90000-0002", { Status: "Concluído", Pagamento: "Pagamento finalizado" })]));
  execFileSync(process.execPath, [path.join(RAIZ, "scripts/portal/build.mjs"), "--linhas", path.join(tmp, "linhas.json")], { env: { ...process.env, PORTAL_SENHA: SENHA, PORTAL_SAIDA: path.join(tmp, "data"), NOTION_TOKEN: "", NOTION_DB: "" }, stdio: "pipe" });
  for (const f of ["index.html", "site.txt"]) fs.copyFileSync(path.join(RAIZ, "portal", f), path.join(tmp, f));
  for (const f of fs.readdirSync(path.join(RAIZ, "portal"))) if (/\.(png|webp|svg|ico)$/.test(f)) fs.copyFileSync(path.join(RAIZ, "portal", f), path.join(tmp, f));
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); });
  await new Promise(ok => srv.listen(0, ok)); const URL0 = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch();
  t.after(async () => { await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
  const nova = async (opts = {}) => { const ctx = await b.newContext(opts); const pg = await ctx.newPage(); const erros = [];
    pg.on("pageerror", e => erros.push(e.message));
    // Nada sai para a internet: fontes, ponte e CDNs ficam de fora
    await pg.route(/^https?:\/\/(?!localhost)/, r => r.abort()); return { pg, erros }; };

  // Mentor: senha errada mantém o nome e mostra o erro. Senha certa entra.
  const { pg, erros } = await nova();
  await pg.goto(URL0); await pg.click("text=Sou mentor");
  await pg.fill("#lNome", "Lucas"); await pg.fill("#lSenha", "errada"); await pg.click("button[type=submit]");
  await pg.waitForFunction(() => /Senha incorreta/.test(document.body.innerText), null, { timeout: 60000 });
  assert.equal(await pg.inputValue("#lNome"), "Lucas", "o nome digitado continua no campo");
  await pg.fill("#lSenha", SENHA); await pg.click("button[type=submit]"); await pg.waitForSelector("header.top", { timeout: 60000 });
  const cods = await pg.evaluate(() => Object.fromEntries(S.eq.clientes.map(c => [c.nome, c.codigo])));
  assert.equal(Object.keys(cods).length, 2);
  assert.deepEqual(erros, []);

  // Cliente: link de outro código na mesma aba abre o cliente do link, não o anterior
  const c = await nova({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await c.pg.goto(URL0 + "?c=" + cods["Ana Teste Inventada"]); await c.pg.waitForFunction(() => S.modo === "cliente", null, { timeout: 60000 });
  assert.match(await c.pg.evaluate(() => S.portal.nome), /Ana/);
  assert.ok(await c.pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "portal sem rolagem lateral no celular");
  await c.pg.goto(URL0 + "?c=" + cods["Bruno Teste Inventado"]); await c.pg.waitForFunction(() => S.modo === "cliente" && S.portal && /Bruno/.test(S.portal.nome), null, { timeout: 60000 });
  // Código errado: mostra o erro e não mostra o cliente anterior
  await c.pg.goto(URL0 + "?c=ZZZZZZZZZZ"); await c.pg.waitForFunction(() => /Código não encontrado/.test(document.body.innerText), null, { timeout: 60000 });
  assert.ok(!/Bruno|Ana/.test(await c.pg.evaluate(() => document.body.innerText)), "não aparece dado de outro cliente");
  assert.equal(await c.pg.inputValue("#lCodigo"), "ZZZZZZZZZZ");
  assert.deepEqual(c.erros, []);
});
