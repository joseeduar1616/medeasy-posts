// Gera os arquivos criptografados do Portal MedEasy em portal/data/.
// Nenhum dado legível vai para o repositório: tudo sai cifrado com AES-GCM.
//
// Uso local:   PORTAL_SENHA=... node scripts/portal/build.mjs --entrada caminho/dados.json
// Uso Notion:  PORTAL_SENHA=... NOTION_TOKEN=... NOTION_DB=... node scripts/portal/build.mjs
//
// A senha da equipe abre portal/data/equipe.json. Cada cliente tem um código
// próprio que abre só o arquivo dele em portal/data/c/.
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SAIDA = path.join(RAIZ, "portal", "data");
const ITER = 310000;
const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const enc = new TextEncoder();
const b64 = u8 => Buffer.from(u8).toString("base64");

const SENHA = (process.env.PORTAL_SENHA || "").trim();
if (!SENHA) { console.error("Defina PORTAL_SENHA"); process.exit(1); }

async function cifrar(obj, senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveKey"]);
  const chave = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, enc.encode(JSON.stringify(obj))));
  return { v: 1, it: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
async function sha256hex(s) { return Buffer.from(await crypto.subtle.digest("SHA-256", enc.encode(s))).toString("hex"); }
async function codigoPadrao(id) {
  const k = await crypto.subtle.importKey("raw", enc.encode(SENHA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode("cliente:" + id)));
  let s = ""; for (let i = 0; i < 10; i++) s += ALFA[mac[i] % ALFA.length];
  return s;
}
const normCodigo = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const arquivoCliente = async codigo => (await sha256hex("medeasy-c:" + normCodigo(codigo))).slice(0, 32);

/* ---------- Notion ---------- */
const ETAPAS = ["certificado", "triagem|orçamento|orcamento", "entrada|pagamento", "produção|producao|andamento|fazendo", "conferência|conferencia|revisão|revisao", "ajuste", "entregue|finalizado|concluído|concluido|pronto"];
function etapaDe(txt) { const t = String(txt || "").toLowerCase(); let e = 0; ETAPAS.forEach((re, i) => { if (new RegExp(re).test(t)) e = i; }); return e; }
function valorProp(p) {
  if (!p) return null;
  switch (p.type) {
    case "title": case "rich_text": return p[p.type].map(x => x.plain_text).join("").trim();
    case "number": return p.number;
    case "select": return p.select ? p.select.name : "";
    case "status": return p.status ? p.status.name : "";
    case "multi_select": return p.multi_select.map(x => x.name);
    case "date": return p.date ? p.date.start : "";
    case "checkbox": return p.checkbox;
    case "email": return p.email || "";
    case "phone_number": return p.phone_number || "";
    case "url": return p.url || "";
    case "people": return p.people.map(x => x.name || "").filter(Boolean).join(", ");
    case "formula": return p.formula[p.formula.type];
    case "rollup": return p.rollup.type === "number" ? p.rollup.number : null;
    default: return null;
  }
}
function pegar(props, re, tipo) {
  for (const [nome, p] of Object.entries(props)) if (re.test(nome) && (!tipo || p.type === tipo)) return valorProp(p);
  return null;
}
async function lerNotion() {
  const token = process.env.NOTION_TOKEN, db = process.env.NOTION_DB;
  const linhas = []; let cursor;
  do {
    const r = await fetch(`https://api.notion.com/v1/databases/${db}/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: JSON.stringify(cursor ? { start_cursor: cursor } : {}) });
    if (!r.ok) throw new Error("Notion respondeu " + r.status + ": " + await r.text());
    const j = await r.json(); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  const clientes = linhas.filter(l => !l.archived).map(l => {
    const P = l.properties;
    const titulo = Object.values(P).find(p => p.type === "title");
    let provas = pegar(P, /prova|edital/i); if (typeof provas === "string") provas = provas.split(/[,/;]+/).map(s => s.trim()).filter(Boolean);
    const etapa = etapaDe(pegar(P, /status|etapa|situa/i));
    const servico = pegar(P, /servi[cç]o|produto|tipo/i);
    const valor = Number(pegar(P, /^valor|total|pre[cç]o/i)) || 0;
    const pagoRaw = pegar(P, /^pago|recebido|valor pago/i);
    const pago = typeof pagoRaw === "number" ? pagoRaw : pagoRaw === true ? valor : 0;
    const repasse = Number(pegar(P, /repasse|mentor recebe|comiss|receber/i)) || 0;
    const repassePago = !!pegar(P, /repasse pago|pago ao mentor/i, "checkbox");
    return {
      id: l.id.replace(/-/g, ""), notion: l.url,
      nome: valorProp(titulo) || "Sem nome",
      mentor: pegar(P, /mentor|respons/i) || "",
      whatsapp: pegar(P, /whats|telefone|celular/i) || "",
      email: pegar(P, /e-?mail/i) || "",
      codigo: pegar(P, /c[oó]digo/i) || "",
      provas: (provas || []).map((n, i) => ({ id: "p" + i, nome: n, prazoEnvio: "" })),
      servicos: servico || etapa ? [{ id: "s0", tipo: /lattes/i.test(servico) ? "lattes" : /an[aá]lise/i.test(servico) ? "analise" : "vitae", nome: (Array.isArray(servico) ? servico.join(", ") : servico) || "Currículo", etapa, prazo: pegar(P, /prazo|entrega/i, "date") || "" }] : [],
      pendencias: String(pegar(P, /pend[eê]ncia|falta/i) || "").split(/\n+/).filter(Boolean).map((t, i) => ({ id: "q" + i, texto: t, feita: false })),
      financeiro: { total: valor, pago, pagamentos: [] },
      repasse: { valor: repasse, pago: repassePago },
      notas: pegar(P, /obs|nota/i) || "",
      atualizacoes: [], documentos: [],
    };
  });
  const nomes = [...new Set(clientes.map(c => c.mentor).filter(Boolean))];
  return { mentores: nomes.map(n => ({ nome: n, admin: /jos[eé]/i.test(n) })), clientes };
}

/* ---------- espelho do cliente ---------- */
function nomeServico(c, s) {
  const T = { vitae: "Currículo Vitae", analise: "Análise curricular", lattes: "Currículo Lattes", emprego: "Vitae emprego" };
  const p = (c.provas || []).find(p => p.id === s.provaId);
  return (T[s.tipo] || "Serviço") + (s.detalhe ? " " + s.detalhe.replace(/Modelo |Categoria /, "") : "") + (p ? " · " + p.nome + (p.ano ? " " + p.ano : "") : "");
}
function espelho(c, contato) {
  const total = Number(c.financeiro?.total) || 0;
  const pago = (c.financeiro?.pagamentos || []).reduce((a, p) => a + (Number(p.valor) || 0), 0) || Number(c.financeiro?.pago) || 0;
  return {
    nome: c.nome, mentor: c.mentor || "",
    servicos: (c.servicos || []).map(s => ({ nome: s.nome || nomeServico(c, s), etapa: s.etapa || 0, prazo: s.prazo || "" })),
    provas: (c.provas || []).map(p => ({ nome: p.nome, ano: p.ano || "", area: p.area || "", prazoEnvio: p.prazoEnvio || "", dataProva: p.dataProva || "", notaEstimada: p.notaEstimada ?? "", notaPossivel: p.notaPossivel ?? "", notaMax: p.notaMax ?? "", link: p.link || "", regras: p.regras || "", itens: p.itens || [] })),
    pendencias: (c.pendencias || []).filter(p => !p.interna).map(p => ({ texto: p.texto, feita: !!p.feita, prazo: p.prazo || "" })),
    atualizacoes: (c.atualizacoes || []).filter(a => !a.interna).slice(-40),
    documentos: (c.documentos || []).filter(d => d.link),
    financeiro: { total, pago, saldo: Math.max(0, total - pago), entradaOk: total > 0 && pago >= total / 2 - 0.009 },
    contato, progresso: (c.servicos || []).length ? Math.round((c.servicos || []).reduce((a, x) => a + (x.etapa || 0) / 6, 0) / c.servicos.length * 100) : 0,
  };
}

/* ---------- principal ---------- */
const args = process.argv.slice(2);
const iEnt = args.indexOf("--entrada");
let dados;
if (iEnt >= 0) dados = JSON.parse(fs.readFileSync(args[iEnt + 1], "utf8"));
else if (process.env.NOTION_TOKEN && process.env.NOTION_DB) dados = await lerNotion();
else { console.error("Informe --entrada dados.json ou NOTION_TOKEN e NOTION_DB"); process.exit(1); }

// Só regrava quando os dados mudam, para não gerar commit a cada hora.
const marca = Buffer.from(new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", enc.encode(SENHA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), enc.encode(JSON.stringify(dados))))).toString("hex");
const arqMarca = path.join(SAIDA, "versao.txt");
if (!process.argv.includes("--forcar") && fs.existsSync(arqMarca) && fs.readFileSync(arqMarca, "utf8").trim() === marca) { console.log("Sem mudanças"); process.exit(0); }

const contato = dados.contato || { mentor: "José Eduardo", whats: "5562991373642", texto: "(62) 99137-3642", email: "medeasyy0@gmail.com" };
fs.rmSync(path.join(SAIDA, "c"), { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, "c"), { recursive: true });
for (const c of dados.clientes) {
  c.codigo = normCodigo(c.codigo) || await codigoPadrao(c.id);
  const arq = await arquivoCliente(c.codigo);
  const mentorContato = { ...contato };
  fs.writeFileSync(path.join(SAIDA, "c", arq + ".json"), JSON.stringify(await cifrar({ ...espelho(c, mentorContato), atualizadoEm: Date.now() }, c.codigo)));
}
const equipe = { geradoEm: new Date().toISOString(), contato, mentores: dados.mentores || [], clientes: dados.clientes };
fs.writeFileSync(path.join(SAIDA, "equipe.json"), JSON.stringify(await cifrar(equipe, SENHA)));
fs.writeFileSync(arqMarca, marca + "\n");
console.log(`OK: ${dados.clientes.length} clientes, ${equipe.mentores.length} mentores`);
