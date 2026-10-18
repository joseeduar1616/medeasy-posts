// Gera os arquivos criptografados do Portal MedEasy em portal/data/.
// Nenhum dado legível vai para o repositório: tudo sai cifrado com AES-GCM.
//
// Uso pelo Notion (GitHub Action):
//   PORTAL_SENHA=... NOTION_TOKEN=... NOTION_DB=<link ou id da página Clientes> node scripts/portal/build.mjs
// Uso local com linhas exportadas:
//   PORTAL_SENHA=... node scripts/portal/build.mjs --linhas linhas.json
//
// A senha da equipe abre portal/data/equipe.json. Cada cliente tem um código
// próprio que abre só o arquivo dele em portal/data/c/.
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { lerAnaliseDaUrl, lerArquivoAnalise } from "./analise.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SAIDA = path.join(RAIZ, "portal", "data");
const ITER = 310000;
const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const enc = new TextEncoder();
const b64 = u8 => Buffer.from(u8).toString("base64");
const unb64 = s => Uint8Array.from(Buffer.from(s, "base64"));

let SENHA = (process.env.PORTAL_SENHA || "").trim();
if (!SENHA) { console.error("Defina PORTAL_SENHA"); process.exit(1); }

/* ---------- cripto ---------- */
async function chave(senha, salt, uso) {
  const base = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [uso]);
}
async function cifrar(obj, senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(senha, salt, "encrypt"), enc.encode(JSON.stringify(obj))));
  return { v: 1, it: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
async function abrir(env, senha) {
  const k = await chave(senha, unb64(env.salt), "decrypt");
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, k, unb64(env.ct))));
}
async function hmac(txt) {
  const k = await crypto.subtle.importKey("raw", enc.encode(SENHA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(txt)));
}
async function codigoDe(chaveCliente) { const m = await hmac("cliente:" + chaveCliente); let s = ""; for (let i = 0; i < 10; i++) s += ALFA[m[i] % ALFA.length]; return s; }
const normCodigo = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function arquivoCliente(codigo) { return Buffer.from(await crypto.subtle.digest("SHA-256", enc.encode("medeasy-c:" + normCodigo(codigo)))).toString("hex").slice(0, 32); }

/* ---------- pessoas ---------- */
const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const APELIDOS = { eder: "Éder", leo: "Leonardo", leonardo: "Leonardo", lucas: "Lucas", erick: "Erick", jose: "José", cadu: "Cadu", matheus: "Matheus", eduardo: "Eduardo", caroline: "Caroline", pedro: "Pedro", "joao gabriel": "João Gabriel", "ana eluiza": "Ana Eluiza" };
const pessoa = n => { if (!n) return ""; const k = semAcento(n); return APELIDOS[k] || String(n).trim().replace(/\b\w/g, c => c.toUpperCase()); };
const PCT_MENTOR = Number(process.env.PORTAL_PCT_MENTOR || 0.6);
const ADMINS = ["José"]; // todos os mentores têm o mesmo acesso; mantido só para a lista de nomes
// Quem saiu da equipe: não entra no login nem no filtro de mentores. Os clientes antigos continuam com o nome no histórico.
const EX_EQUIPE = ["Ana Eluiza"].map(semAcento);

/* ---------- serviços e provas ---------- */
const SERVICOS = { "vitae": "Currículo Vitae", "lattes": "Currículo Lattes", "analise": "Análise curricular", "certificados": "Organização de certificados", "trabalho escrito": "Trabalho escrito", "slide": "Slides", "emprego": "Vitae emprego", "formatacao de trabalho": "Formatação de trabalho" };
const PROVA_NOME = { "USP SP": "USP-SP", "AMIRGS": "AMRIGS", "PSUGO": "PSU-GO", "PSUMG": "PSU-MG", "SESGO": "SES-GO", "SANTA CASA DE SP": "Santa Casa SP", "SIRIO LIBANES": "Sírio-Libanês", "EINSTEIN": "Einstein", "DANTE": "Dante Pazzanese" };
// Prova escrita no fim do nome do cliente no Notion ("Jose Nicolas PSU", "Jose Nicolas fubog")
const PROVA_NO_NOME = { psu: "PSUGO", psugo: "PSUGO", psumg: "PSUMG", sesgo: "SESGO", fubog: "FUBOG", hpp: "HPP", uel: "UEL", amrigs: "AMIRGS", amirgs: "AMIRGS" };
function etapaDe(status, pagamento) {
  const s = semAcento(status);
  if (s.startsWith("concluido")) return 6;
  if (s.startsWith("em andamento")) return 3;
  if (s.startsWith("aguardando")) return 0;
  return !pagamento || semAcento(pagamento).startsWith("nao pago") ? 2 : 1;
}
function pagoDe(total, pagamento) { const p = semAcento(pagamento); if (p.startsWith("pagamento finalizado")) return total; if (p.startsWith("1")) return Math.round(total * 50) / 100; return 0; }
const n = v => (v === null || v === undefined || v === "" || isNaN(Number(v))) ? null : Number(v);
const sim = v => v === true || v === "__YES__";
const arr = v => Array.isArray(v) ? v : (typeof v === "string" && v.startsWith("[") ? JSON.parse(v) : v ? [v] : []);

/* Linha no formato comum, vinda da API do Notion ou do export local. */
function linhaDeExport(r) {
  return {
    id: String(r.url || "").split("/").pop().replace(/-/g, ""), url: r.url, cliente: r["Cliente"], telefone: r["Telefone"], tipos: arr(r["Tipo de serviço"]),
    mentor: r["Mentor"], corretor: r["Corretor"], trainee: r["Trainee"], status: r["Status"], pagamento: r["Pagamento"], total: n(r["Valor total"]),
    mentorPago: sim(r["Mentor pago"]), corretorPago: sim(r["corretor  pago "]), desconto: arr(r["DESCONTO APLICADO "]), forma: r["FORMA DE PAGAMENTO "], origem: r["ORIGEM DO CLIENTE "],
    inicio: r["date:Data de início :start"], entrega: r["date:Data da entrega:start"], dataPagMentor: r["date:DATA DE PAGAMENTO  MENTOR:start"] || r["date:Data do Pagamento do Mentor/Corretor:start"], dataPagCorretor: r["date:Data do Pagamento do Mentor/Corretor:start"],
    nCert: n(Object.entries(r).find(([k, v]) => /certificad/i.test(k) && typeof v === "number")?.[1]),
    contTexto: String(r["Certificados por item"] || ""),
    controleTexto: String(r["Controle de certificados"] || ""),
    nArtigos: n(Object.entries(r).find(([k, v]) => /artigo/i.test(k) && typeof v === "number")?.[1]),
    analises: Object.entries(r).filter(([k, v]) => /an[aá]lise/i.test(k) && Array.isArray(v) && v.length && typeof v[0] === "object").flatMap(([, v]) => v),
    valorMentor: n(r["Valor para mentor"] ?? r["Valor para o mentor"]), valorCorretor: n(r["Valor para corretor"]), valorMedeasy: n(r["Valor para Medeasy"]),
  };
}

/* ---------- Notion API ---------- */
function valorProp(p) {
  if (!p) return null;
  switch (p.type) {
    case "title": case "rich_text": return p[p.type].map(x => x.plain_text).join("").trim();
    case "number": return p.number;
    case "select": return p.select ? p.select.name : null;
    case "status": return p.status ? p.status.name : null;
    case "multi_select": return p.multi_select.map(x => x.name);
    case "date": return p.date ? p.date.start : null;
    case "checkbox": return p.checkbox;
    case "phone_number": return p.phone_number;
    case "formula": return p.formula[p.formula.type] ?? null;
    case "files": return p.files.map(f => ({ nome: f.name, url: f.file ? f.file.url : f.external ? f.external.url : "" })).filter(f => f.url);
    default: return null;
  }
}
async function api(caminho, corpo) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, { method: corpo ? "POST" : "GET", headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json(); if (!r.ok) { const e = new Error(`Notion ${r.status}: ${j.message}`); e.status = r.status; throw e; } return j;
}
async function idDaBase(entrada) {
  const id = (String(entrada).match(/[0-9a-f]{32}/i) || [String(entrada).replace(/-/g, "")])[0];
  try { await api("databases/" + id); return id; } catch {}
  try { const filhos = await api(`blocks/${id}/children?page_size=100`); const db = filhos.results.find(b => b.type === "child_database"); if (db) return db.id.replace(/-/g, ""); } catch {}
  // A conexão pode ter sido liberada direto na base, e não na página. Procura a base pelo nome entre o que a conexão enxerga.
  const busca = await api("search", { filter: { property: "object", value: "database" }, page_size: 100 });
  const bases = busca.results || [];
  const db = bases.find(d => /controle cliente/i.test((d.title || []).map(t => t.plain_text).join(""))) || bases[0];
  if (!db) throw new Error("A conexão do Notion não enxerga nenhuma base. Abra a página Clientes no Notion, vá em Conexões e adicione a conexão.");
  console.log("Base encontrada pela busca: " + (db.title || []).map(t => t.plain_text).join(""));
  return db.id.replace(/-/g, "");
}
async function lerNotion() {
  const db = await idDaBase(process.env.NOTION_DB); const linhas = []; let cursor;
  do { const j = await api(`databases/${db}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor);
  return linhas.filter(l => !l.archived && !l.in_trash).map(l => {
    const r = { url: l.url }; for (const [k, p] of Object.entries(l.properties)) {
      const v = valorProp(p);
      if (p.type === "date") r[`date:${k}:start`] = v; else if (p.type === "checkbox") r[k] = v ? "__YES__" : "__NO__"; else r[k] = v;
    }
    return linhaDeExport(r);
  });
}

/* Base "Triagem MedEasy": clientes novos que chegaram pelo formulário do Notion. Vai para o painel do mentor. */
async function lerTriagemNotion() {
  if (!process.env.NOTION_TOKEN) return [];
  try {
    const busca = await api("search", { filter: { property: "object", value: "database" }, page_size: 100 });
    const db = (busca.results || []).find(d => /triagem medeasy/i.test((d.title || []).map(t => t.plain_text).join(""))); if (!db) return [];
    const linhas = []; let cursor;
    do { const j = await api(`databases/${db.id}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor);
    return linhas.filter(l => !l.archived && !l.in_trash).map(l => { const v = k => valorProp(l.properties[k]); return {
      url: l.url, em: Date.parse(l.created_time) || 0, nome: v("Nome") || "", whats: v("WhatsApp") || "", mentor: v("Mentor") || "", provas: v("Provas") || [], area: v("Especialidade") || "", pedido: v("Pedido") || "",
      nCert: v("Certificados"), drive: v("Drive") || "", arquivos: (v("Arquivos") || []).length, obs: v("Observações") || "", situacao: v("Situação") || "" }; });
  } catch (e) { console.warn("Não li a base Triagem MedEasy: " + e.message); return []; }
}

/* ---------- montar clientes ---------- */
const kProva = s => semAcento(s).replace(/[^a-z0-9]/g, "");
function juntarProva(provas, pr) {
  if (!pr || !pr.nome) return;
  const atual = [...provas.values()].find(x => kProva(pr.nome).startsWith(kProva(x.nome)) || kProva(x.nome).startsWith(kProva(pr.nome)));
  if (atual) { const id = atual.id; provas.delete(atual.nome); provas.set(pr.nome, { ...atual, ...pr, id }); }
  else provas.set(pr.nome, { id: "p" + provas.size, ...pr });
}
/* Coluna "Controle de certificados": JSON colado do site (certificados, alocação por item e pendências) */
function lerControle(t) {
  if (!t) return null;
  try { const j = JSON.parse(t); if (!j || !Array.isArray(j.certs)) return null; return { certs: j.certs, aloc: j.aloc || {}, pend: j.pend || [], v: j.v || 1 }; }
  catch { console.warn("Controle de certificados com JSON inválido, ignorado"); return null; }
}
/* Coluna "Certificados por item": uma linha por prova, "PSU-GO: 2=2; 4=3; 9=/0,5" (item=certificados, /pontos digitados) */
function lerTextoCont(t) {
  const out = {};
  for (const ln of String(t || "").split(/\n|\|/)) {
    const m = ln.match(/^\s*([^:]+):(.*)$/); if (!m) continue; const pr = (out[kProva(m[1])] ||= {});
    for (const par of m[2].split(";")) { const x = par.trim().match(/^(\d+)\s*=\s*(\d+)?\s*(?:\/\s*([\d.,]+))?/); if (x) pr[+x[1]] = { n: x[2] ? +x[2] : 0, pts: x[3] != null ? Number(x[3].replace(",", ".")) : "" }; }
  }
  return out;
}
async function montar(linhas) {
  const grupos = new Map();
  for (const l of linhas) {
    if (!l.cliente || !String(l.cliente).trim()) continue;
    let nome = String(l.cliente).replace(/\(\d+\)\s*$/, "").replace(/\s+/g, " ").trim();
    for (let m; (m = nome.match(/\s+(\S+)$/)) && PROVA_NO_NOME[kProva(m[1])];) { const t = PROVA_NO_NOME[kProva(m[1])]; if (!l.tipos.includes(t)) l.tipos.push(t); nome = nome.slice(0, m.index).trim(); }
    const tel = String(l.telefone || "").replace(/\D/g, "").slice(-8);
    const k = semAcento(nome) + "|" + tel;
    if (!grupos.has(k)) grupos.set(k, { chave: k, nome, telefone: l.telefone || "", linhas: [] });
    grupos.get(k).linhas.push(l);
  }
  const clientes = [];
  for (const g of grupos.values()) {
    const servicos = [], provas = new Map(), repasses = [], mentores = new Set(), corretores = new Set(), trainees = new Set();
    let total = 0, pago = 0; const pagamentos = [];
    for (const l of g.linhas) {
      const tipos = l.tipos.map(t => [t, semAcento(t)]);
      const sv = tipos.filter(([, k]) => SERVICOS[k]).map(([, k]) => SERVICOS[k]);
      const pv = tipos.filter(([, k]) => !SERVICOS[k]).map(([t]) => PROVA_NOME[t] || t);
      pv.forEach(p => provas.has(p) || provas.set(p, { id: "p" + provas.size, nome: p, prazoEnvio: "", itens: [] }));
      for (const a of l.analises || []) {
        try { const pr = a.url ? await lerAnaliseDaUrl(a.url, a.nome || "") : lerArquivoAnalise(a.arquivo); juntarProva(provas, pr); }
        catch (e) { console.warn(`Não consegui ler a análise "${a.nome || a.arquivo}" de ${l.cliente}: ${e.message}`); }
      }
      const etapa = etapaDe(l.status, l.pagamento);
      const m = pessoa(l.mentor), c = pessoa(l.corretor), t = pessoa(l.trainee);
      if (m) mentores.add(m); if (c) corretores.add(c); if (t) trainees.add(t);
      servicos.push({ id: l.id, nome: (sv.length ? sv.join(" + ") : "Serviço") + (pv.length ? " · " + pv.join(", ") : ""), etapa, prazo: etapa < 6 ? (l.entrega || "") : "", entregueEm: etapa === 6 ? (l.entrega || "") : "", inicio: l.inicio || "", notion: l.url, mentor: m, corretor: c, trainee: t, status: l.status || "" });
      const tt = l.total || 0, pg = pagoDe(tt, l.pagamento); total += tt; pago += pg;
      if (pg) pagamentos.push({ valor: pg, forma: l.forma || "" });
      // Mentor recebe 60% do valor total do serviço (PORTAL_PCT_MENTOR muda a regra). Hoje o corretor é o próprio mentor, então a fórmula
      // "Valor para mentor" do Notion, que separa mentor e corretor, não é usada. PORTAL_USAR_FORMULA=1 volta a usar a fórmula.
      const vm = process.env.PORTAL_USAR_FORMULA === "1" && l.valorMentor != null ? l.valorMentor : (l.total != null ? Math.round(l.total * PCT_MENTOR * 100) / 100 : null);
      if (m) repasses.push({ pessoa: m, papel: "Mentor", servico: l.id, valor: vm, pago: l.mentorPago, data: l.dataPagMentor || "" });
      // Hoje o corretor é o próprio mentor: o repasse é um só, os 60% do mentor. Para voltar a pagar corretor à parte, use PORTAL_CORRETOR_SEPARADO=1.
      if (c && process.env.PORTAL_CORRETOR_SEPARADO === "1") repasses.push({ pessoa: c, papel: "Corretor", servico: l.id, valor: l.valorCorretor, pago: l.corretorPago, data: l.dataPagCorretor || "" });
      if (l.valorMedeasy != null) repasses.push({ pessoa: "MedEasy", papel: "Empresa", servico: l.id, valor: l.valorMedeasy, pago: true, data: "" });
    }
    const id = (await hmac("id:" + g.chave)).slice(0, 8).reduce((a, b) => a + b.toString(16).padStart(2, "0"), "");
    clientes.push({
      id, chave: g.chave, nome: g.nome, whatsapp: g.telefone, codigo: await codigoDe(g.chave),
      mentores: [...mentores], corretores: [...corretores], trainees: [...trainees], mentor: [...mentores][0] || "",
      servicos, provas: [...provas.values()], pendencias: [], atualizacoes: [], documentos: [], notas: "",
      origem: g.linhas.map(l => l.origem).find(Boolean) || "", desconto: [...new Set(g.linhas.flatMap(l => l.desconto).filter(d => d && d !== "NENHUM"))],
      financeiro: { total, pago, pagamentos }, repasses,
      contagem: lerTextoCont(g.linhas.map(l => l.contTexto).filter(Boolean).join("\n")),
      controle: lerControle(g.linhas.map(l => l.controleTexto).find(t => t && t.trim())),
      nCert: Math.max(...g.linhas.map(l => l.nCert ?? -1)) >= 0 ? Math.max(...g.linhas.map(l => l.nCert ?? -1)) : null,
      nArtigos: Math.max(...g.linhas.map(l => l.nArtigos ?? -1)) >= 0 ? Math.max(...g.linhas.map(l => l.nArtigos ?? -1)) : null,
      tipos: [...new Set(g.linhas.flatMap(l => l.tipos.map(t => semAcento(t))))],
    });
  }
  const nomes = new Set(ADMINS);
  for (const c of clientes) [...c.mentores, ...c.corretores, ...c.trainees].forEach(p => nomes.add(p));
  return { mentores: [...nomes].filter(n => !EX_EQUIPE.includes(semAcento(n))).sort().map(nome => ({ nome, admin: true })), clientes };
}

/* Extras: detalhes que não existem no Notion (nota da análise, itens da ficha, pendências).
   Ficam cifrados em portal/data/extras.json e são juntados pelo nome do cliente. */
let EQUIPE = {};
async function juntarExtras(dados) {
  const arq = path.join(SAIDA, "extras.json"); if (!fs.existsSync(arq)) return;
  const extras = await abrir(JSON.parse(fs.readFileSync(arq, "utf8")), SENHA);
  EQUIPE = Object.fromEntries(Object.entries(extras.equipe || {}).map(([k, v]) => [pessoa(k), v]));
  for (const c of dados.clientes) {
    const e = extras.clientes.find(x => semAcento(c.nome).includes(semAcento(x.casar)) || semAcento(x.casar).includes(semAcento(c.nome))); if (!e) continue;
    const k = s => semAcento(s).replace(/[^a-z]/g, "");
    for (const p of e.provas || []) { const q = c.provas.find(x => k(p.nome).startsWith(k(x.nome)) || k(x.nome).startsWith(k(p.nome))); if (q) Object.assign(q, { ...p, id: q.id, nome: q.nome }); else c.provas.push(p); }
    if (e.area) c.area = e.area;
    c.pendencias.push(...(e.pendencias || []).map((p, i) => ({ id: "x" + i, ...p }))); c.atualizacoes.push(...(e.atualizacoes || [])); c.documentos.push(...(e.documentos || []));
    if (e.notas) c.notas = [c.notas, e.notas].filter(Boolean).join("\n");
  }
}

/* ---------- valor pelos certificados ---------- */
// Tabela de preços MedEasy (Vitae por prova, Lattes por certificado único, artigo na íntegra à parte).
const PRECO = { taxa: 100, taxaMaisDeDuas: 90, artigo: 12.5, analise1: 100, analise2: 90,
  vitae: { A: [9, 8.5, 8], B: [9.5, 9, 8.5], C: [8, 7.5, 7], D: [9, 8.5, 8], E: [9, 8.5, 8] }, lattes: { A: [7, 6.5, 6], B: [12, 11.5, 11] } };
// Modelo do Vitae que cada prova costuma pedir (skill de orçamento). Prova fora da lista usa o Modelo A.
const MODELO = { psugo: "D", psumg: "D", hpp: "C", santacasasp: "C", scmsp: "C", fmabc: "C", unitau: "C", idor: "C", puccamp: "C", hcpa: "C", enare: "C", sesdf: "C", cet: "E", cetcentromedicodecampinas: "E" };
const faixa = q => q >= 50 ? 2 : q >= 31 ? 1 : 0;
const br2 = v => v.toFixed(2).replace(".", ",");
const ehArtigo = t => /artigo|cap[ií]tulo|publica/i.test(t || "");
function estimar(c) {
  const linhas = []; let faltaContagem = false;
  const temLattes = c.tipos.includes("lattes"), temCert = c.tipos.includes("certificados");
  // Lattes + Certificados = plano B do Lattes: o documento de comprovação já está incluso, a prova cobra só a análise.
  const lattesB = temLattes && temCert && !c.tipos.includes("vitae");
  const temVitae = c.tipos.includes("vitae") || (temCert && !lattesB), temAnalise = c.tipos.includes("analise") || lattesB;
  const provas = c.provas.filter(p => p.nome);
  const taxa = provas.length > 2 ? PRECO.taxaMaisDeDuas : PRECO.taxa;
  let maxCert = c.nCert ?? null;
  for (const p of provas) {
    const itens = p.itens || [];
    const comp = itens.flatMap(i => (i.comprovantes || []).map(t => ({ t, item: i.nome })));
    let n = comp.length ? comp.filter(x => !ehArtigo(x.item) || !/na íntegra|completo/i.test(x.t)).length : c.nCert;
    let a = comp.length ? comp.filter(x => ehArtigo(x.item) && /artigo completo|cap[ií]tulo/i.test(x.item)).length : (c.nArtigos || 0);
    if (comp.length) maxCert = Math.max(maxCert ?? 0, n);
    const k = kProva(p.nome), m = MODELO[k] || (Object.entries(MODELO).find(([kk]) => k.startsWith(kk)) || [, "A"])[1];
    if (temVitae || (!temAnalise && !lattesB)) {
      if (n == null) { faltaContagem = true; linhas.push({ desc: `${p.nome}: análise curricular + seleção dos certificados (Modelo ${m} Vitae)`, conta: "falta o número de certificados", valor: null }); continue; }
      const u = PRECO.vitae[m][faixa(n)];
      linhas.push({ desc: `${p.nome}: análise curricular + seleção dos certificados (Modelo ${m} Vitae)`, conta: `${br2(taxa)} + ${n} X ${br2(u)}${a ? ` + ${a} X ${br2(PRECO.artigo)}` : ""}`, valor: taxa + n * u + a * PRECO.artigo, fonte: comp.length ? "análise" : "Notion" });
    } else {
      const v = provas.length >= 2 ? PRECO.analise2 : PRECO.analise1;
      linhas.push({ desc: `${p.nome}: análise curricular`, conta: "1", valor: v });
    }
  }
  if (!provas.length && temVitae) {
    if (c.nCert == null) { faltaContagem = true; linhas.push({ desc: "Currículo Vitae", conta: "falta o número de certificados", valor: null }); }
    else { const u = PRECO.vitae.A[faixa(c.nCert)]; const a = c.nArtigos || 0; linhas.push({ desc: "Currículo Vitae (Modelo A)", conta: `${br2(PRECO.taxa)} + ${c.nCert} X ${br2(u)}${a ? ` + ${a} X ${br2(PRECO.artigo)}` : ""}`, valor: PRECO.taxa + c.nCert * u + a * PRECO.artigo, fonte: "Notion" }); }
  }
  if (temLattes) {
    const cat = lattesB ? "B" : "A", nome = `Atualização do Currículo Lattes (Categoria ${cat}${lattesB ? ", com o documento de comprovação" : ""})`;
    if (maxCert == null) { faltaContagem = true; linhas.push({ desc: nome, conta: "falta o número de certificados", valor: null }); }
    else { const u = PRECO.lattes[cat][faixa(maxCert)]; linhas.push({ desc: nome, conta: `${maxCert} X ${br2(u)}`, valor: maxCert * u }); }
  }
  if (!linhas.length) return null;
  const total = Math.round(linhas.reduce((s, l) => s + (l.valor || 0), 0) * 100) / 100;
  return { linhas, total, completo: !faltaContagem };
}

/* ---------- espelho do cliente ---------- */
function espelho(c, contato) {
  const pago = c.financeiro.pago, total = c.financeiro.total;
  return {
    nome: c.nome,
    servicos: c.servicos.map(s => ({ nome: s.nome, etapa: s.etapa, prazo: s.prazo })),
    provas: c.provas.map(p => ({ nome: p.nome, ano: p.ano || "", area: p.area || "", prazoEnvio: p.prazoEnvio || "", dataProva: p.dataProva || "", notaEstimada: p.notaEstimada ?? "", notaPossivel: p.notaPossivel ?? "", notaMax: p.notaMax ?? "", link: p.link || "", regras: p.regras || "", itens: p.itens || [], edital: p.edital || null })),
    pendencias: [...c.pendencias.filter(p => !p.interna).map(p => ({ texto: p.texto, feita: !!p.feita, prazo: p.prazo || "" })),
      ...((c.controle && c.controle.pend) || []).filter(x => x.quem === "Cliente" && x.situacao !== "Resolvida").map(x => ({ texto: [x.item, x.texto].filter(Boolean).join(": "), feita: false, prazo: "" }))],
    atualizacoes: c.atualizacoes.filter(a => !a.interna).slice(-40),
    documentos: c.documentos.filter(d => d.link),
    financeiro: { total, pago, saldo: Math.max(0, total - pago), entradaOk: total > 0 && pago >= total / 2 - 0.009 },
    contato: (() => { const m = c.mentores.find(x => EQUIPE[x]) || c.mentores[0]; const tel = m && EQUIPE[m]; return tel ? { ...contato, mentor: `${m} (MedEasy)`, whats: tel.replace(/\D/g, ""), texto: tel.replace(/^\+55\s*/, "") } : { ...contato, mentor: m ? `${m} (MedEasy)` : "Equipe MedEasy" }; })(),
    contagem: c.contagem || {},
    progresso: c.servicos.length ? Math.round(c.servicos.reduce((a, s) => a + s.etapa / 6, 0) / c.servicos.length * 100) : 0,
  };
}

/* ---------- principal ---------- */
// A senha precisa ser a mesma que cifrou os extras, porque ela também gera os códigos dos clientes.
// O site aceita a senha em minúsculas, então o secret pode vir com maiúscula: usa a forma que abre os dados.
{
  const arq = path.join(SAIDA, "extras.json");
  if (fs.existsSync(arq)) {
    const env = JSON.parse(fs.readFileSync(arq, "utf8"));
    const abre = async s => { try { await abrir(env, s); return true; } catch { return false; } };
    if (!(await abre(SENHA))) {
      if (await abre(SENHA.toLowerCase())) SENHA = SENHA.toLowerCase();
      else { console.error("PORTAL_SENHA não abre portal/data/extras.json. Confira se o secret é a mesma senha da equipe que os mentores usam no site, sem espaço no fim."); process.exit(1); }
    }
  }
}
const args = process.argv.slice(2);
const iLin = args.indexOf("--linhas");
const linhas = iLin >= 0 ? JSON.parse(fs.readFileSync(args[iLin + 1], "utf8")).map(linhaDeExport)
  : process.env.NOTION_TOKEN && process.env.NOTION_DB ? await lerNotion()
  : (console.error("Informe --linhas arquivo.json ou NOTION_TOKEN e NOTION_DB"), process.exit(1));

// Teste local: --analise "NOME DO CLIENTE=arquivo.pdf" (pode repetir)
args.forEach((a, i) => { if (a !== "--analise") return; const [nome, arq] = args[i + 1].split("="); const l = linhas.find(x => semAcento(x.cliente) === semAcento(nome)); if (l) (l.analises ||= []).push({ arquivo: arq, nome: path.basename(arq) }); else console.warn("Cliente não encontrado: " + nome); });
const dados = await montar(linhas);
dados.triagem = await lerTriagemNotion();
await juntarExtras(dados);
// Ficha de cada edital (parte do currículo), com datas e regras. Completa o que a prova do cliente ainda não tem.
const EDITAIS = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "editais.json"), "utf8")); delete EDITAIS._fonte;
const editalDe = nome => { const k = kProva(nome); const e = Object.entries(EDITAIS).find(([kk]) => k.startsWith(kk) || (kk.startsWith(k) && k.length >= 3)); return e ? e[1] : null; };
for (const c of dados.clientes) for (const p of c.provas) {
  const e = editalDe(p.nome); if (!e) continue;
  p.edital = e;
  if (!p.prazoEnvio && e.prazoEnvio) p.prazoEnvio = e.prazoEnvio;
  if (!p.dataProva && e.dataProva) p.dataProva = e.dataProva;
  if (!p.link && e.link) p.link = e.link;
  if (!p.regras) p.regras = [e.formato, e.envio].filter(Boolean).join(". ");
}
for (const c of dados.clientes) c.estimativa = estimar(c);
const contato = { mentor: "Equipe MedEasy", whats: "5562995155830", texto: "(62) 99515-5830", email: "medeasyy0@gmail.com" };

// Só regrava quando os dados mudam, para não gerar commit a cada hora.
const marca = Buffer.from(await hmac(JSON.stringify(dados))).toString("hex");
const arqMarca = path.join(SAIDA, "versao.txt");
if (!args.includes("--forcar") && fs.existsSync(arqMarca) && fs.readFileSync(arqMarca, "utf8").trim() === marca) { console.log("Sem mudanças"); process.exit(0); }

fs.rmSync(path.join(SAIDA, "c"), { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, "c"), { recursive: true });
const agora = Date.now();
for (const c of dados.clientes) fs.writeFileSync(path.join(SAIDA, "c", await arquivoCliente(c.codigo) + ".json"), JSON.stringify(await cifrar({ ...espelho(c, contato), atualizadoEm: agora }, c.codigo)));
const semValor = dados.clientes.flatMap(c => c.repasses).filter(r => r.valor == null).length;
fs.writeFileSync(path.join(SAIDA, "equipe.json"), JSON.stringify(await cifrar({ geradoEm: new Date(agora).toISOString(), contato, editais: EDITAIS, mentores: dados.mentores.map(m => ({ ...m, telefone: EQUIPE[m.nome] || "" })), clientes: dados.clientes, triagem: dados.triagem || [], valoresPendentes: semValor > 0 }, SENHA)));
fs.writeFileSync(arqMarca, marca + "\n");
console.log(`OK: ${dados.clientes.length} clientes de ${linhas.length} linhas, ${dados.mentores.length} pessoas na equipe${semValor ? `, ${semValor} repasses sem valor` : ""}`);
