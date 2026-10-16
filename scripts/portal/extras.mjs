// Cifra ou decifra portal/data/extras.json (detalhes que não estão no Notion).
//   PORTAL_SENHA=... node scripts/portal/extras.mjs cifrar extras.json
//   PORTAL_SENHA=... node scripts/portal/extras.mjs abrir  > extras.json
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const ARQ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../portal/data/extras.json");
const SENHA = (process.env.PORTAL_SENHA || "").trim(); if (!SENHA) { console.error("Defina PORTAL_SENHA"); process.exit(1); }
const enc = new TextEncoder(), ITER = 310000;
const chave = async (salt, uso) => crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, await crypto.subtle.importKey("raw", enc.encode(SENHA), "PBKDF2", false, ["deriveKey"]), { name: "AES-GCM", length: 256 }, false, [uso]);
const [acao, entrada] = process.argv.slice(2);
if (acao === "cifrar") {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(salt, "encrypt"), enc.encode(fs.readFileSync(entrada, "utf8"))));
  fs.writeFileSync(ARQ, JSON.stringify({ v: 1, it: ITER, salt: Buffer.from(salt).toString("base64"), iv: Buffer.from(iv).toString("base64"), ct: Buffer.from(ct).toString("base64") }));
  console.log("extras.json cifrado");
} else {
  const e = JSON.parse(fs.readFileSync(ARQ, "utf8")); const u = s => Uint8Array.from(Buffer.from(s, "base64"));
  process.stdout.write(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u(e.iv) }, await chave(u(e.salt), "decrypt"), u(e.ct))));
}
