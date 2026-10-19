// Junta os moldes de scripts/portal/site em portal/index.html
// Uso: node scripts/portal/montar-site.mjs
import fs from "node:fs"; import path from "node:path";
const d = path.join(path.dirname(new URL(import.meta.url).pathname), "site");
const ler = f => fs.readFileSync(path.join(d, f), "utf8");
let t = ler("index.tpl.html");
const editais = JSON.parse(fs.readFileSync(path.join(d, "..", "editais.json"), "utf8")); delete editais._fonte;
// Lista pública de provas para a triagem: só nome e chave
// Link público do formulário do Notion que recebe os certificados (scripts/portal/form-cert.txt). Opcional.
const formCert = fs.existsSync(path.join(d, "..", "form-cert.txt")) ? fs.readFileSync(path.join(d, "..", "form-cert.txt"), "utf8").trim() : "";
// Endereço da ponte (Cloudflare Worker em worker/), em scripts/portal/ponte.txt. Opcional.
const ponte = fs.existsSync(path.join(d, "..", "ponte.txt")) ? fs.readFileSync(path.join(d, "..", "ponte.txt"), "utf8").trim() : "";
const provas = JSON.stringify(Object.entries(editais).map(([k, e]) => ({ k, nome: e.nome })));
t = t.split("__CSS__").join(ler("base.css")).split("__CERTITENS__").join(ler("certitens.js")).split("__PORTALVIEW__").join(ler("portalview.js")).split("__TRIAGEM__").join(ler("triagem.js").replace("__PROVAS__", provas).replace("__FORM_CERT__", formCert)).split("__ANALISE__").join(ler("analise.js").replace("__LEITOR_ANALISE__", () => fs.readFileSync(path.join(d, "..", "leitor-analise.mjs"), "utf8").replace(/^export\s+(?=function|const)/gm, "").replace(/^export\s*\{[^}]*\};?\s*$/gm, ""))).split("__CONTROLE__").join(ler("controle.js")).split("__MARCACAO__").join(ler("marcacao.js")).split("__PONTE__").join(ler("ponte.js").replace("__PONTE__", ponte));
fs.writeFileSync(path.resolve(d, "../../../portal/index.html"), t);
console.log("portal/index.html montado");
