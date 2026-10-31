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
// Administradores: veem toda a equipe, o filtro por mentor, os repasses de todos e os feedbacks. Entram só com o nome e a senha da equipe.
const ADMINS = ["José", "Eduardo"];
const SENHA_ADMIN = (process.env.PORTAL_SENHA_ADMIN || "").trim();
// Quem saiu da equipe: não entra no login nem no filtro de mentores. Os clientes antigos continuam com o nome no histórico.
const EX_EQUIPE = ["Ana Eluiza"].map(semAcento);

/* ---------- serviços e provas ---------- */
const SERVICOS = { "vitae": "Currículo Vitae/currículo com certificados comprovados", "mentoria": "Mentoria mensal", "mentoria mensal": "Mentoria mensal", "mentoria individual": "Mentoria individual", "lattes": "Currículo Lattes", "analise": "Análise curricular", "certificados": "Organização de certificados", "trabalho escrito": "Trabalho escrito", "slide": "Slides", "emprego": "Vitae emprego", "formatacao de trabalho": "Formatação de trabalho" };
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

/* Id da página no Notion: os 32 caracteres do fim do link, sem o nome que vem antes ("MARIA-CLARA-...-28d0..."). */
const idNotion = v => { const t = String(v || "").split("?")[0].split("#")[0].replace(/-/g, ""); const m = t.match(/[0-9a-f]{32}$/i); return m ? m[0].toLowerCase() : ""; };
/* Linha no formato comum, vinda da API do Notion ou do export local. */
function linhaDeExport(r) {
  return {
    id: idNotion(r.id || r.url), url: r.url, cliente: r["Cliente"], telefone: r["Telefone"], tipos: arr(r["Tipo de serviço"]),
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
/* Texto longo: a lista de páginas pode cortar a coluna em 25 pedaços. Nesse caso busca a coluna inteira. */
async function completarTextos(pagina) {
  for (const [k, p] of Object.entries(pagina.properties || {})) {
    if (p.type !== "rich_text" || (p.rich_text || []).length < 25) continue;
    try { const partes = []; let cursor; do { const j = await api(`pages/${pagina.id}/properties/${encodeURIComponent(p.id)}?page_size=100${cursor ? "&start_cursor=" + cursor : ""}`); partes.push(...(j.results || []).map(x => x.rich_text).filter(Boolean)); cursor = j.has_more ? j.next_cursor : null; } while (cursor); if (partes.length) p.rich_text = partes; }
    catch (e) { console.warn(`Não li a coluna ${k} inteira: ${e.message}`); }
  }
  return pagina;
}
async function lerNotion() {
  const db = await idDaBase(process.env.NOTION_DB); const linhas = []; let cursor;
  do { const j = await api(`databases/${db}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor);
  const vivas = linhas.filter(l => !l.archived && !l.in_trash); for (const l of vivas) await completarTextos(l);
  return vivas.map(l => {
    const r = { id: l.id, url: l.url }; for (const [k, p] of Object.entries(l.properties)) {
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
    const vivas = linhas.filter(l => !l.archived && !l.in_trash); for (const l of vivas) await completarTextos(l);
    const dadosDe = s => { if (!s) return null; try { const j = JSON.parse(s); return j && typeof j === "object" && j.id ? j : null; } catch { console.warn("Dados do site com JSON inválido na triagem"); return null; } };
    return vivas.map(l => { const v = k => valorProp(l.properties[k]); return {
      id: l.id.replace(/-/g, ""), url: l.url, dados: dadosDe(v("Dados do site")), outras: v("Outras provas") || "", servico: v("Serviço") || "", valor: v("Valor do orçamento"), em: Date.parse(l.created_time) || 0, nome: v("Nome") || "", whats: v("WhatsApp") || "", mentor: v("Mentor") || "", provas: v("Provas") || [], area: v("Especialidade") || "", pedido: v("Pedido") || "",
      nCert: v("Certificados"), drive: v("Drive") || "", arquivos: (v("Arquivos") || []).length, obs: v("Observações") || "", situacao: v("Situação") || "" }; });
  } catch (e) { console.warn("Não li a base Triagem MedEasy: " + e.message); return []; }
}

/* Base "Feedback MedEasy": o que os clientes mandam pela página de feedback (a ponte grava).
   Público e com Publicar marcado vira depoimento no site. O resto só a administração vê. null = não li. */
async function lerFeedbackNotion() {
  if (!process.env.NOTION_TOKEN) return null;
  try {
    const busca = await api("search", { query: "Feedback MedEasy", filter: { property: "object", value: "database" }, page_size: 20 });
    const db = (busca.results || []).find(d => /feedback medeasy/i.test((d.title || []).map(t => t.plain_text).join("")) && !d.archived && !d.in_trash); if (!db) return [];
    const linhas = []; let cursor;
    do { const j = await api(`databases/${db.id}/query`, cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }); linhas.push(...j.results); cursor = j.has_more ? j.next_cursor : null; } while (cursor);
    return linhas.filter(l => !l.archived && !l.in_trash).map(l => { const v = k => l.properties[k] ? valorProp(l.properties[k]) : null; return {
      id: l.id.replace(/-/g, ""), tipo: /part/i.test(v("Tipo") || "") ? "particular" : "publico", nome: v("Nome") || "", nota: v("Nota"), notaMentor: v("Nota do mentor"), notaMedEasy: v("Nota da MedEasy"),
      indicaria: v("Indicaria") || "", texto: v("Texto") || "", mentor: v("Mentor") || "", provas: v("Provas") || "", publicar: !!v("Publicar"), em: Date.parse(l.created_time) || 0 }; })
      .sort((a, b) => b.em - a.em);
  } catch (e) { console.warn("Não li a base Feedback MedEasy: " + e.message); return null; }
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
  try { const j = JSON.parse(t); if (!j || !Array.isArray(j.certs)) return null; return { certs: j.certs, aloc: j.aloc || {}, pend: j.pend || [], fichas: j.fichas || {}, analises: j.analises || {}, notas: j.notas || {}, orcamento: j.orcamento || null, pagamentos: Array.isArray(j.pagamentos) ? j.pagamentos : [], v: j.v || 1 }; }
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
    let total = 0, pago = 0, mensalidade = 0, temMensal = false; const pagamentos = [];
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
      // Mentoria mensal: paga por mês, sem prazo de entrega e fora do pagamento em 2 parcelas dos outros serviços
      const mensal = sv.length > 0 && sv.every(x => x === "Mentoria mensal");
      if (mensal) { temMensal = true; mensalidade += l.total || 0; }
      servicos.push({ id: l.id, pagamento: l.pagamento || "", total: l.total || 0, pago: mensal ? 0 : pagoDe(l.total || 0, l.pagamento), nome: (sv.length ? sv.join(" + ") : "Serviço") + (pv.length ? " · " + pv.join(", ") : ""), etapa, prazo: etapa < 6 && !mensal ? (l.entrega || "") : "", mensal, entregueEm: etapa === 6 ? (l.entrega || "") : "", inicio: l.inicio || "", notion: l.url, mentor: m, corretor: c, trainee: t, status: l.status || "" });
      const tt = mensal ? 0 : l.total || 0, pg = pagoDe(tt, l.pagamento); total += tt; pago += pg;
      if (pg) pagamentos.push({ valor: pg, forma: l.forma || "" });
      // Mentor recebe 60% do valor total do serviço (PORTAL_PCT_MENTOR muda a regra). Hoje o corretor é o próprio mentor, então a fórmula
      // "Valor para mentor" do Notion, que separa mentor e corretor, não é usada. PORTAL_USAR_FORMULA=1 volta a usar a fórmula.
      const vm = process.env.PORTAL_USAR_FORMULA === "1" && l.valorMentor != null ? l.valorMentor : (l.total != null ? Math.round(l.total * PCT_MENTOR * 100) / 100 : null);
      // O repasse só fica "a receber" com o serviço concluído e o cliente com pagamento finalizado. Antes disso é valor futuro.
      const quitado = semAcento(l.pagamento).startsWith("pagamento finalizado");
      // Na mentoria mensal não há conclusão: o repasse do mês libera quando o cliente paga o mês
      const liberado = mensal ? quitado : etapa === 6 && quitado, motivo = liberado ? "" : mensal ? "falta o cliente pagar o mês" : etapa < 6 && !quitado ? "falta concluir e o cliente quitar" : etapa < 6 ? "falta concluir o serviço" : "falta o cliente quitar";
      if (m) repasses.push({ pessoa: m, papel: "Mentor", servico: l.id, valor: vm, pago: l.mentorPago, data: l.dataPagMentor || "", liberado, motivo });
      // Hoje o corretor é o próprio mentor: o repasse é um só, os 60% do mentor. Para voltar a pagar corretor à parte, use PORTAL_CORRETOR_SEPARADO=1.
      if (c && process.env.PORTAL_CORRETOR_SEPARADO === "1") repasses.push({ pessoa: c, papel: "Corretor", servico: l.id, valor: l.valorCorretor, pago: l.corretorPago, data: l.dataPagCorretor || "" });
      if (l.valorMedeasy != null) repasses.push({ pessoa: "MedEasy", papel: "Empresa", servico: l.id, valor: l.valorMedeasy, pago: true, data: "" });
    }
    // Análises gravadas pelo site no controle do cliente (análise padrão colada ou PDF importado pelo mentor): entram nas provas e no portal
    const controle = lerControle(g.linhas.map(l => l.controleTexto).find(t => t && t.trim()));
    for (const pr of Object.values((controle && controle.analises) || {})) if (pr && pr.nome && Array.isArray(pr.itens) && pr.itens.length) juntarProva(provas, { ...pr, nome: pr.provaEscolhida || pr.nome });
    // Pagamentos lançados pelo site (o que o cliente já pagou, parcela por parcela): valem mais que a conta pelo status do Pagamento
    const pgs = ((controle && controle.pagamentos) || []).filter(x => x && Number(x.valor) > 0);
    if (pgs.length) {
      pago = 0; pagamentos.length = 0;
      for (const s of servicos) {
        if (s.mensal) continue;
        const meus = pgs.filter(x => x.servico === s.id);
        if (meus.length) s.pago = Math.round(meus.reduce((a, x) => a + Number(x.valor), 0) * 100) / 100;
        pago += s.pago;
      }
      // Pagamento sem serviço (ou de uma linha que saiu do Notion) entra no total pago do cliente
      pago += pgs.filter(x => !servicos.some(s => s.id === x.servico && !s.mensal)).reduce((a, x) => a + Number(x.valor), 0);
      pago = Math.round(pago * 100) / 100;
      for (const x of pgs) pagamentos.push({ valor: Number(x.valor), forma: x.forma || "", data: x.data || "" });
    }
    const id = (await hmac("id:" + g.chave)).slice(0, 8).reduce((a, b) => a + b.toString(16).padStart(2, "0"), "");
    clientes.push({
      id, chave: g.chave, nome: g.nome, whatsapp: g.telefone, codigo: await codigoDe(g.chave),
      mentores: [...mentores], corretores: [...corretores], trainees: [...trainees], mentor: [...mentores][0] || "",
      servicos, provas: [...provas.values()], pendencias: [], atualizacoes: [], documentos: [], notas: "",
      origem: g.linhas.map(l => l.origem).find(Boolean) || "", desconto: [...new Set(g.linhas.flatMap(l => l.desconto).filter(d => d && d !== "NENHUM"))],
      financeiro: { total, pago, pagamentos }, repasses, mentoria: temMensal ? { mensal: true, valor: mensalidade } : null,
      contagem: lerTextoCont(g.linhas.map(l => l.contTexto).filter(Boolean).join("\n")),
      controle,
      nCert: Math.max(...g.linhas.map(l => l.nCert ?? -1)) >= 0 ? Math.max(...g.linhas.map(l => l.nCert ?? -1)) : null,
      nArtigos: Math.max(...g.linhas.map(l => l.nArtigos ?? -1)) >= 0 ? Math.max(...g.linhas.map(l => l.nArtigos ?? -1)) : null,
      tipos: [...new Set(g.linhas.flatMap(l => l.tipos.map(t => semAcento(t))))],
    });
  }
  const nomes = new Set(ADMINS);
  for (const c of clientes) [...c.mentores, ...c.corretores, ...c.trainees].forEach(p => nomes.add(p));
  return { mentores: [...nomes].filter(n => !EX_EQUIPE.includes(semAcento(n))).sort().map(nome => ({ nome, admin: ADMINS.some(a => semAcento(a) === semAcento(nome)) })), clientes };
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
const MODELO = { psugo: "D", psumg: "D", ipsemg: "B", hpp: "C", santacasasp: "C", scmsp: "C", fmabc: "C", unitau: "C", idor: "C", puccamp: "C", hcpa: "C", enare: "C", sesdf: "C", cet: "E", cetcentromedicodecampinas: "E" };
const faixa = q => q >= 50 ? 2 : q >= 31 ? 1 : 0;
const br2 = v => v.toFixed(2).replace(".", ",");
const ehArtigo = t => /artigo|cap[ií]tulo|publica/i.test(t || "");
function estimar(c) {
  const linhas = []; let faltaContagem = false;
  // Só mentoria: não tem cobrança por certificado
  if (c.tipos.some(t => /^mentoria/.test(t)) && !c.tipos.some(t => ["vitae", "lattes", "analise", "certificados"].includes(t))) return null;
  const temLattes = c.tipos.includes("lattes"), temCert = c.tipos.includes("certificados");
  // Lattes + Certificados = plano B do Lattes: o documento de comprovação já está incluso, a prova cobra só a análise.
  const lattesB = temLattes && temCert && !c.tipos.includes("vitae");
  const temVitae = c.tipos.includes("vitae") || (temCert && !lattesB), temAnalise = c.tipos.includes("analise") || lattesB;
  const provas = c.provas.filter(p => p.nome);
  const taxa = provas.length > 2 ? PRECO.taxaMaisDeDuas : PRECO.taxa;
  let maxCert = c.nCert ?? null;
  for (const p of provas) {
    const itens = p.itens || [];
    // Só os certificados válidos para esta prova: no item por atividade, até o número que ainda soma ponto
    const comp = itens.flatMap(i => { const u = Number(i.porAtividade) || 0, mx = Number(i.max) || 0; let l = (i.comprovantes || []).map(t => ({ t, item: i.nome }));
      // Item com nota e sem a lista de comprovantes (o leitor não achou no PDF): o mínimo de certificados para chegar na nota
      const pt = Number(i.pontos) || 0; if (!l.length && pt > 0) l = Array.from({ length: u > 0 ? Math.max(1, Math.round(pt / u)) : 1 }, () => ({ t: "", item: i.nome }));
      return u > 0 && mx > 0 ? l.slice(0, Math.ceil(mx / u - 1e-9)) : l; });
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
    if (c.nCert == null) { faltaContagem = true; linhas.push({ desc: "Currículo Vitae/currículo com certificados comprovados", conta: "falta o número de certificados", valor: null }); }
    else { const u = PRECO.vitae.A[faixa(c.nCert)]; const a = c.nArtigos || 0; linhas.push({ desc: "Currículo Vitae/currículo com certificados comprovados (Modelo A)", conta: `${br2(PRECO.taxa)} + ${c.nCert} X ${br2(u)}${a ? ` + ${a} X ${br2(PRECO.artigo)}` : ""}`, valor: PRECO.taxa + c.nCert * u + a * PRECO.artigo, fonte: "Notion" }); }
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
// Nota digitada pelo mentor no site (controle.notas): vale mais que a análise por item, e o recado vai junto
function notaMentorBuild(c, p, pv) {
  const n = ((c.controle && c.controle.notas) || {})[kProva(p.nome)];
  if (!n || ((n.nota === "" || n.nota == null) && !n.recado)) return pv;
  return { ...pv, notaEstimada: n.nota ?? "", notaMax: n.max || pv.notaMax || 10, notaPossivel: n.possivel ?? "", recado: n.recado || "", itens: [] };
}
function espelho(c, contato) {
  const pago = c.financeiro.pago, total = c.financeiro.total;
  return {
    id: c.id, nome: c.nome, mentores: c.mentores || [],
    servicos: c.servicos.map(s => ({ nome: s.nome, etapa: s.etapa, prazo: s.prazo, mensal: !!s.mensal })), mentoria: c.mentoria || null,
    provas: c.provas.map(p => notaMentorBuild(c, p, { nome: p.nome, ano: p.ano || "", area: p.area || "", prazoEnvio: p.prazoEnvio || "", dataProva: p.dataProva || "", notaEstimada: p.notaEstimada ?? "", notaPossivel: p.notaPossivel ?? "", notaMax: p.notaMax ?? "", link: p.link || "", regras: p.regras || "", itens: p.itens || [], edital: p.edital || null })),
    pendencias: [...c.pendencias.filter(p => !p.interna).map(p => ({ texto: p.texto, feita: !!p.feita, prazo: p.prazo || "" })),
      ...((c.controle && c.controle.pend) || []).filter(x => x.quem === "Cliente" && x.situacao !== "Resolvida").map(x => ({ texto: [x.item, x.texto].filter(Boolean).join(": "), feita: false, prazo: "" }))],
    atualizacoes: c.atualizacoes.filter(a => !a.interna).slice(-40),
    documentos: c.documentos.filter(d => d.link),
    financeiro: { total, pago, saldo: Math.max(0, total - pago), entradaOk: total > 0 && pago >= total / 2 - 0.009 },
    contato: (() => { const m = c.mentores.find(x => EQUIPE[x]) || c.mentores[0]; const tel = m && EQUIPE[m]; return tel ? { ...contato, mentor: `${m} (MedEasy)`, whats: tel.replace(/\D/g, ""), texto: tel.replace(/^\+55\s*/, "") } : { ...contato, mentor: m ? `${m} (MedEasy)` : "Equipe MedEasy" }; })(),
    contagem: c.contagem || {},
    // Para o orçamento do cliente se atualizar no portal: plano (tipos), contagem e certificados do controle (sem as observações internas)
    tipos: c.tipos || [], nCert: c.nCert ?? null, nArtigos: c.nArtigos ?? null,
    controle: c.controle ? { certs: (c.controle.certs || []).map(({ obs, ...x }) => x), aloc: c.controle.aloc || {}, pend: [], notas: c.controle.notas || {} } : null,
    // Orçamento que o cliente recebeu (PDF ou foto lido no site): o portal mostra este em vez da conta automática
    orcamentoEnviado: (c.controle && c.controle.orcamento) || null,
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
dados.feedbacks = await lerFeedbackNotion();
// Sem ler o Notion agora, mantém os feedbacks que já estavam no admin.json
if (dados.feedbacks === null) { for (const s of [SENHA, SENHA_ADMIN].filter(Boolean)) { try { dados.feedbacks = (await abrir(JSON.parse(fs.readFileSync(path.join(SAIDA, "admin.json"), "utf8")), s)).feedbacks || null; break; } catch {} } }
await juntarExtras(dados);
// Ficha de cada edital (parte do currículo), com datas e regras. Completa o que a prova do cliente ainda não tem.
const EDITAIS = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "editais.json"), "utf8")); delete EDITAIS._fonte;
const editalDe = nome => { const k = kProva(nome); const e = Object.entries(EDITAIS).find(([kk]) => k.startsWith(kk) || (kk.startsWith(k) && k.length >= 3)); return e ? e[1] : null; };
// Fichas montadas pelo mentor no site (PDF do edital ou à mão). Ficam no controle do cliente ou na triagem.
// A mais nova de cada prova vale para todos os clientes daquela prova quando o editais.json não tem ficha.
const fichasGerais = {};
const somaFicha = (k, f) => { if (!f || !Array.isArray(f.ficha) || !f.ficha.length) return; if (!fichasGerais[k] || (f.em || 0) > (fichasGerais[k].em || 0)) fichasGerais[k] = f; };
for (const c of dados.clientes) for (const [k, f] of Object.entries((c.controle && c.controle.fichas) || {})) somaFicha(k, f);
for (const n of dados.triagem || []) for (const [k, f] of Object.entries((n.dados && n.dados.fichas) || {})) somaFicha(k, f);
for (const [k, f] of Object.entries(fichasGerais)) {
  const e = editalDe(f.prova || k);
  if (e && !(e.ficha || []).length) Object.assign(e, { ficha: f.ficha, maximo: e.maximo || f.maximo || null, fichaFonte: (f.fonte || "Ficha montada pelo mentor") + " (portal)" });
  else if (!e) EDITAIS[k] = { nome: f.prova || k, ficha: f.ficha, maximo: f.maximo || null, fichaFonte: (f.fonte || "Ficha montada pelo mentor") + " (portal)" };
}
for (const c of dados.clientes) for (const p of c.provas) {
  const propria = ((c.controle && c.controle.fichas) || {})[kProva(p.nome)];
  const e = editalDe(p.nome);
  if (propria && (propria.ficha || []).length) { p.edital = { ...(e || { nome: p.nome }), ficha: propria.ficha, maximo: propria.maximo || (e && e.maximo) || null, fichaFonte: propria.fonte || "Ficha montada pelo mentor", fichaPropria: true }; if (!e) continue; }
  if (!e) continue;
  if (!p.edital) p.edital = e;
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
// Feedbacks para a aba da administração. Cifrado com a senha da equipe: o site só abre para José e Eduardo.
fs.writeFileSync(path.join(SAIDA, "admin.json"), JSON.stringify(await cifrar({ ok: true, em: agora, feedbacks: dados.feedbacks || [] }, SENHA)));
fs.writeFileSync(path.join(SAIDA, "equipe.json"), JSON.stringify(await cifrar({ geradoEm: new Date(agora).toISOString(), contato, editais: EDITAIS, mentores: dados.mentores.map(m => ({ ...m, telefone: EQUIPE[m.nome] || "" })), clientes: dados.clientes, triagem: dados.triagem || [], valoresPendentes: semValor > 0 }, SENHA)));
// Depoimentos aprovados pela administração: públicos de propósito, com a assinatura que o cliente escolheu
if (dados.feedbacks) fs.writeFileSync(path.join(SAIDA, "depoimentos.json"), JSON.stringify(dados.feedbacks.filter(f => f.tipo === "publico" && f.publicar && f.texto.trim())
  .map(f => ({ nome: f.nome || "Cliente MedEasy", nota: f.nota, texto: f.texto, provas: f.provas, mentor: String(f.mentor || "").split(",")[0].trim(), mes: new Date(f.em).toISOString().slice(0, 7) }))));
fs.writeFileSync(arqMarca, marca + "\n");
console.log(`OK: ${dados.clientes.length} clientes de ${linhas.length} linhas, ${dados.mentores.length} pessoas na equipe${semValor ? `, ${semValor} repasses sem valor` : ""}`);
