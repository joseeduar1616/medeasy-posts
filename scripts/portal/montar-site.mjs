// Junta os moldes de scripts/portal/site em portal/index.html
// Uso: node scripts/portal/montar-site.mjs
import fs from "node:fs"; import path from "node:path";
const d = path.join(path.dirname(new URL(import.meta.url).pathname), "site");
const ler = f => fs.readFileSync(path.join(d, f), "utf8");
let t = ler("index.tpl.html");
t = t.split("__CSS__").join(ler("base.css")).split("__CERTITENS__").join(ler("certitens.js")).split("__PORTALVIEW__").join(ler("portalview.js"));
fs.writeFileSync(path.resolve(d, "../../../portal/index.html"), t);
console.log("portal/index.html montado");
