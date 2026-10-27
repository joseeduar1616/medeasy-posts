// Ponte do Portal MedEasy: recebe mudanças do site, grava no Notion e manda o GitHub sincronizar.
// Roda num Cloudflare Worker. As chaves ficam nos secrets do Worker, nunca no site.
//   PORTAL_SENHA        senha da equipe (a mesma do site)
//   PORTAL_SENHA_ADMIN  senha de administrador (opcional, antiga: ainda libera as colunas de dinheiro pelo cabeçalho X-Admin)
//   ADMINS              primeiros nomes dos administradores, separados por vírgula (padrão "jose,eduardo"). Eles entram só com a senha da equipe.
//   NOTION_TOKEN        token da conexão "Portal MedEasy" no Notion, com permissão de escrita
//   GITHUB_TOKEN        token fine-grained com Actions: write no repositório medeasy-posts (opcional)
//   GITHUB_REPO         "joseeduar1616/medeasy-posts"
//   ORIGEM              origens permitidas, separadas por vírgula. Ex.: https://curriculosmedeasy.com.br,https://joseeduar1616.github.io
//   TRIAGEM_DB          id da base "Triagem MedEasy" (recebe a triagem feita no site)
//   CLIENTES_DB         id da base "Controle cliente" (recebe o cliente que fechou)
//   FEEDBACK_DB         id da base "Feedback MedEasy" (opcional: sem ele, a ponte acha pelo nome ou cria a base ao lado da Triagem)
//   SITE                endereço do site, para conferir o código do cliente (opcional: usa a primeira ORIGEM)

// Colunas que o site pode gravar, com o tipo no Notion. Qualquer outra é recusada.
const COLUNAS = {
  "Status": "status",
  "Pagamento": "select",
  "Mentor pago": "checkbox",
  "corretor  pago ": "checkbox",
  "Tipo de serviço": "multi_select",
  "Certificados por item": "rich_text",
  "Controle de certificados": "rich_text",
  "Data da entrega": "date",
  "Data de início ": "date",
  "DATA DE PAGAMENTO  MENTOR": "date",
  "Mentor": "select",
  "Corretor": "select",
  "Trainee": "select",
  "Telefone": "phone_number",
};
// Colunas da base "Triagem MedEasy" que o site grava
const COLUNAS_TRIAGEM = {
  "Nome": "title", "WhatsApp": "phone_number", "Especialidade": "rich_text", "Pedido": "rich_text", "Observações": "rich_text",
  "Outras provas": "rich_text", "Drive": "url", "Mentor": "rich_text", "Provas": "multi_select", "Certificados": "number",
  "Situação": "select", "Serviço": "rich_text", "Valor do orçamento": "number", "Dados do site": "rich_text",
};
// Colunas de um cliente novo no "Controle cliente". O valor entra na criação, depois só o administrador muda.
const COLUNAS_NOVO = { "Cliente": "title", "Valor total": "number", "Pagamento": "select", "Status": "status", "Tipo de serviço": "multi_select", "Mentor": "select", "Telefone": "phone_number", "Data de início ": "date", "Certificados por item": "rich_text", "Controle de certificados": "rich_text" };
// Só o administrador mexe em dinheiro
const SO_ADMIN = new Set(["Valor total", "DESCONTO APLICADO ", "FORMA DE PAGAMENTO ", "Mentor pago", "corretor  pago ", "DATA DE PAGAMENTO  MENTOR"]);
const TIPOS_ADMIN = { "Valor total": "number", "DESCONTO APLICADO ": "multi_select", "FORMA DE PAGAMENTO ": "select" };

const iguais = (a, b) => { a = String(a || ""); b = String(b || ""); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function valorNotion(tipo, v) {
  if (v === null || v === undefined || v === "") {
    return { title: { title: [] }, url: { url: null }, status: { status: null }, select: { select: null }, multi_select: { multi_select: [] }, checkbox: { checkbox: false }, rich_text: { rich_text: [] }, date: { date: null }, number: { number: null }, phone_number: { phone_number: null } }[tipo];
  }
  switch (tipo) {
    case "status": return { status: { name: String(v) } };
    case "select": return { select: { name: String(v) } };
    case "multi_select": return { multi_select: (Array.isArray(v) ? v : String(v).split(",")).map(x => ({ name: String(x).trim() })).filter(x => x.name) };
    case "checkbox": return { checkbox: v === true || v === "true" || v === 1 || v === "__YES__" };
    case "rich_text": { const t = String(v); const partes = []; for (let i = 0; i < t.length; i += 1900) partes.push({ type: "text", text: { content: t.slice(i, i + 1900) } }); return { rich_text: partes }; }
    case "date": return { date: { start: String(v).slice(0, 10) } };
    case "number": return { number: Number(String(v).replace(",", ".")) };
    case "phone_number": return { phone_number: String(v) };
    case "title": return { title: [{ type: "text", text: { content: String(v).slice(0, 1900) } }] };
    case "url": return { url: String(v) };
  }
  return null;
}

function cors(env, req) {
  const origem = req.headers.get("Origin") || "";
  const lista = String(env.ORIGEM || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = !lista.length || lista.includes(origem) || /^http:\/\/localhost(:\d+)?$/.test(origem);
  return { "Access-Control-Allow-Origin": ok ? origem || "*" : "null", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin,X-Quem", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
const resposta = (obj, status, extra) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json; charset=utf-8", ...(extra || {}) } });

async function notion(env, caminho, metodo, corpo) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, { method: metodo || "GET", headers: { Authorization: `Bearer ${env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Notion ${r.status}: ${j.message || ""}`);
  return j;
}
// Linha criada nas últimas 2 horas com o mesmo nome e o mesmo telefone (8 últimos dígitos)
async function clienteRecente(env, dbc, props) {
  const nome = semAcento(props.Cliente?.title?.[0]?.text?.content || "").replace(/\s+/g, " ").trim();
  const tel = String(props.Telefone?.phone_number || "").replace(/\D/g, "").slice(-8);
  if (!nome || tel.length < 8) return null;
  try {
    const desde = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const j = await notion(env, `databases/${dbc}/query`, "POST", { filter: { timestamp: "created_time", created_time: { on_or_after: desde } }, page_size: 100 });
    return (j.results || []).find(pg => { const pp = pg.properties || {};
      const n = semAcento((pp.Cliente?.title || []).map(t => t.plain_text).join("")).replace(/\s+/g, " ").trim();
      return n === nome && String(pp.Telefone?.phone_number || "").replace(/\D/g, "").slice(-8) === tel; }) || null;
  } catch { return null; }
}
async function sincronizar(env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return { ok: false, motivo: "sem GITHUB_TOKEN" };
  const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/portal-notion.yml/dispatches`, { method: "POST", headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "medeasy-ponte", "Content-Type": "application/json" }, body: JSON.stringify({ ref: "main" }) });
  return { ok: r.status === 204, status: r.status };
}

// Troca o nome mandado pelo site pela opção que já existe na base (sem diferença de maiúscula, acento ou traço),
// para não criar opção repetida. Ex.: "Lucas" vira "LUCAS", "PSU-GO" vira "PSUGO".
const chaveOp = s => semAcento(s).replace(/[^a-z0-9]/g, "");
const APELIDOS = { amrigs: "amirgs", santacasasp: "santacasadesp" };
async function ajustarOpcoes(env, dbId, props) {
  const precisa = Object.values(props).some(v => v.select || (v.multi_select && v.multi_select.length));
  if (!precisa) return props;
  let base; try { base = await notion(env, `databases/${dbId}`); } catch { return props; }
  const acha = (nome, ops) => { const k = chaveOp(nome); const k2 = APELIDOS[k] || k; return ops.find(o => chaveOp(o.name) === k || chaveOp(o.name) === k2) || (k.length >= 3 ? ops.find(o => { const ko = chaveOp(o.name); return ko.length >= 3 && (k.startsWith(ko) || ko.startsWith(k)); }) : null); };
  for (const [nome, v] of Object.entries(props)) {
    const def = base.properties?.[nome]; if (!def) continue;
    if (v.select && v.select.name && def.select) { const o = acha(v.select.name, def.select.options || []); if (o) v.select.name = o.name; }
    if (v.multi_select && def.multi_select) v.multi_select = v.multi_select.map(x => { const o = acha(x.name, def.multi_select.options || []); return o ? { name: o.name } : x; }).filter((x, i, a) => a.findIndex(y => y.name === x.name) === i);
  }
  return props;
}

// Converte {coluna: valor} do site no formato do Notion, só com as colunas permitidas
function montar(permitidas, entrada) {
  const props = {}; const recusadas = [];
  for (const [nome, v] of Object.entries(entrada || {})) {
    const tipo = permitidas[nome]; if (!tipo) { recusadas.push(nome); continue; }
    if (tipo === "rich_text" && String(v ?? "").length > 190000) return { erro: `${nome} grande demais` };
    if (tipo === "url" && v && !/^https?:\/\//i.test(String(v))) { recusadas.push(nome); continue; }
    const nv = valorNotion(tipo, v); if (nv) props[nome] = nv;
  }
  return { props, recusadas };
}

/* ---------- feedback dos clientes ---------- */
// O cliente manda sem a senha da equipe. A ponte só confere se o código existe no site (o arquivo cifrado dele),
// e não guarda o código. A parte particular vai sem nome, só com o mentor, e só a administração vê no site.
const COLUNAS_FEEDBACK = {
  "Nome": { title: {} },
  "Tipo": { select: { options: [{ name: "Público", color: "green" }, { name: "Particular", color: "gray" }] } },
  "Nota": { number: {} }, "Nota do mentor": { number: {} }, "Nota da MedEasy": { number: {} },
  "Indicaria": { select: { options: [{ name: "Sim", color: "green" }, { name: "Talvez", color: "yellow" }, { name: "Não", color: "red" }] } },
  "Texto": { rich_text: {} }, "Mentor": { rich_text: {} }, "Provas": { rich_text: {} }, "Publicar": { checkbox: {} },
};
let BASE_FEEDBACK = "";
const tituloDe = d => (d.title || []).map(t => t.plain_text).join("");
async function baseFeedback(env) {
  if (env.FEEDBACK_DB) return String(env.FEEDBACK_DB).replace(/-/g, "");
  if (BASE_FEEDBACK) return BASE_FEEDBACK;
  const busca = await notion(env, "search", "POST", { query: "Feedback MedEasy", filter: { property: "object", value: "database" }, page_size: 20 });
  const achou = (busca.results || []).find(d => /feedback medeasy/i.test(tituloDe(d)) && !d.archived && !d.in_trash);
  if (achou) return (BASE_FEEDBACK = achou.id.replace(/-/g, ""));
  // Não existe: cria na mesma página da base Triagem (ou do Controle cliente)
  let pai = "";
  for (const db of [env.TRIAGEM_DB, env.CLIENTES_DB].filter(Boolean)) {
    try { const j = await notion(env, `databases/${String(db).replace(/-/g, "")}`); if (j.parent?.type === "page_id") { pai = j.parent.page_id; break; } } catch {}
  }
  if (!pai) throw new Error("não achei onde criar a base Feedback MedEasy. Crie a base no Notion ou defina FEEDBACK_DB");
  const nova = await notion(env, "databases", "POST", { parent: { type: "page_id", page_id: pai }, title: [{ type: "text", text: { content: "Feedback MedEasy" } }], properties: COLUNAS_FEEDBACK });
  return (BASE_FEEDBACK = nova.id.replace(/-/g, ""));
}
const normCodigo = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function arquivoCliente(codigo) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("medeasy-c:" + normCodigo(codigo))));
  return [...d].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const siteDe = env => String(env.SITE || String(env.ORIGEM || "").split(",")[0] || "").trim().replace(/\/$/, "");
const nota5 = v => { const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; };
const corta = (v, n) => String(v ?? "").replace(/\s+$/g, "").slice(0, n);
async function receberFeedback(env, corpo) {
  const codigo = normCodigo(corpo.codigo);
  if (codigo.length < 8) return [400, { erro: "código inválido" }];
  const site = siteDe(env); if (!site) return [500, { erro: "SITE não configurado" }];
  const arq = await arquivoCliente(codigo);
  const r = await fetch(`${site}/data/c/${arq}.json`, { cf: { cacheTtl: 60 } });
  if (!r.ok) return [403, { erro: "código não encontrado" }];
  // Um envio a cada 2 minutos por cliente (no mesmo ponto do Cloudflare)
  const marca = new Request(`https://ponte.local/feedback/${arq}`);
  if (await caches.default.match(marca)) return [429, { erro: "Você acabou de mandar. Espere 2 minutos para mandar de novo" }];
  const mentor = (Array.isArray(corpo.mentor) ? corpo.mentor : [corpo.mentor]).filter(Boolean).slice(0, 3).map(m => corta(m, 60)).join(", ");
  const pub = corpo.publico || null, par = corpo.particular || null;
  const paginas = [];
  if (pub && (corta(pub.texto, 3000).trim() || nota5(pub.nota))) paginas.push({
    "Nome": valorNotion("title", corta(pub.assinatura, 80).trim() || "Anônimo"), "Tipo": valorNotion("select", "Público"),
    "Nota": valorNotion("number", nota5(pub.nota)), "Texto": valorNotion("rich_text", corta(pub.texto, 3000)),
    "Mentor": valorNotion("rich_text", mentor), "Provas": valorNotion("rich_text", corta(pub.provas, 200)), "Publicar": valorNotion("checkbox", false) });
  if (par && (corta(par.texto, 4000).trim() || nota5(par.notaMentor) || nota5(par.notaMedEasy) || par.indicaria)) paginas.push({
    "Nome": valorNotion("title", "Anônimo"), "Tipo": valorNotion("select", "Particular"),
    "Nota do mentor": valorNotion("number", nota5(par.notaMentor)), "Nota da MedEasy": valorNotion("number", nota5(par.notaMedEasy)),
    "Indicaria": valorNotion("select", ["Sim", "Talvez", "Não"].includes(par.indicaria) ? par.indicaria : ""), "Texto": valorNotion("rich_text", corta(par.texto, 4000)),
    "Mentor": valorNotion("rich_text", mentor) });
  if (!paginas.length) return [400, { erro: "feedback vazio" }];
  const base = await baseFeedback(env);
  for (const props of paginas) await notion(env, "pages", "POST", { parent: { database_id: base }, properties: props });
  await caches.default.put(marca, new Response("1", { headers: { "Cache-Control": "max-age=120" } }));
  return [200, { ok: true, gravados: paginas.length }];
}

export default {
  async fetch(req, env) {
    const h = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    if (url.pathname === "/saude") return resposta({ ok: true, notion: !!env.NOTION_TOKEN, github: !!(env.GITHUB_TOKEN && env.GITHUB_REPO), admin: true, feedback: true }, 200, h);

    // Feedback do cliente: a única rota sem a senha da equipe. Precisa do código de um cliente que existe.
    if (url.pathname === "/feedback/enviar") {
      if (req.method !== "POST") return resposta({ erro: "use POST" }, 405, h);
      if (Number(req.headers.get("Content-Length") || 0) > 20000) return resposta({ erro: "grande demais" }, 413, h);
      let corpo; try { corpo = await req.json(); } catch { return resposta({ erro: "JSON inválido" }, 400, h); }
      try { const [st, j] = await receberFeedback(env, corpo); return resposta(j, st, h); }
      catch (e) { return resposta({ erro: e.message }, 502, h); }
    }

    // Quem chama precisa da senha da equipe. A de administrador vai em X-Admin.
    const senha = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const equipeOk = env.PORTAL_SENHA && (iguais(senha, env.PORTAL_SENHA) || iguais(senha, String(env.PORTAL_SENHA).toLowerCase()));
    if (!equipeOk) return resposta({ erro: "senha da equipe incorreta" }, 401, h);
    // Administrador: José e Eduardo entram só com a senha da equipe, e o site manda o nome em X-Quem.
    let quem = ""; try { quem = decodeURIComponent(req.headers.get("X-Quem") || ""); } catch {}
    const admins = String(env.ADMINS || "jose,eduardo").split(",").map(semAcento).filter(Boolean);
    const admin = admins.includes(semAcento(quem).split(" ")[0]) || (!!env.PORTAL_SENHA_ADMIN && iguais((req.headers.get("X-Admin") || "").trim(), env.PORTAL_SENHA_ADMIN));
    if (req.method !== "POST") return resposta({ erro: "use POST" }, 405, h);
    let corpo; try { corpo = await req.json(); } catch { return resposta({ erro: "JSON inválido" }, 400, h); }

    if (url.pathname === "/sincronizar") return resposta(await sincronizar(env), 200, h);

    // Triagem: cria ou atualiza a linha na base "Triagem MedEasy". Só mexe em páginas dessa base.
    if (url.pathname === "/triagem") {
      if (!env.TRIAGEM_DB) return resposta({ erro: "TRIAGEM_DB não configurado" }, 500, h);
      const base = String(env.TRIAGEM_DB).replace(/-/g, "");
      const id = String(corpo.id || "").replace(/-/g, "");
      if (id && !/^[0-9a-f]{32}$/.test(id)) return resposta({ erro: "id da página inválido" }, 400, h);
      const props = montar(COLUNAS_TRIAGEM, corpo.props);
      if (props.erro) return resposta(props, 400, h);
      try {
        if (id) {
          const pg = await notion(env, `pages/${id}`);
          if (String(pg.parent?.database_id || "").replace(/-/g, "") !== base) return resposta({ erro: "essa página não é da triagem" }, 403, h);
          const j = await notion(env, `pages/${id}`, "PATCH", corpo.arquivar ? { archived: true } : { properties: await ajustarOpcoes(env, base, props.props) });
          return resposta({ ok: true, id: j.id, url: j.url, gravadas: Object.keys(props.props), recusadas: props.recusadas }, 200, h);
        }
        const j = await notion(env, "pages", "POST", { parent: { database_id: base }, properties: await ajustarOpcoes(env, base, props.props) });
        return resposta({ ok: true, id: j.id, url: j.url, gravadas: Object.keys(props.props), recusadas: props.recusadas, criada: true }, 200, h);
      } catch (e) { return resposta({ erro: e.message }, 502, h); }
    }

    // Cliente que fechou: cria a linha no "Controle cliente" e pede a sincronização
    if (url.pathname === "/cliente") {
      if (!env.CLIENTES_DB) return resposta({ erro: "CLIENTES_DB não configurado" }, 500, h);
      const props = montar(COLUNAS_NOVO, corpo.props);
      if (props.erro) return resposta(props, 400, h);
      if (!props.props.Cliente) return resposta({ erro: "falta o nome do cliente" }, 400, h);
      try {
        const dbc = String(env.CLIENTES_DB).replace(/-/g, "");
        // Dois toques no botão, ou a mesma triagem aberta em dois aparelhos: não cria a linha de novo
        if (!corpo.outraLinha) { const ja = await clienteRecente(env, dbc, props.props); if (ja) return resposta({ ok: true, id: ja.id, url: ja.url, jaExistia: true }, 200, h); }
        const j = await notion(env, "pages", "POST", { parent: { database_id: dbc }, properties: await ajustarOpcoes(env, dbc, props.props) });
        const sync = await sincronizar(env);
        return resposta({ ok: true, id: j.id, url: j.url, gravadas: Object.keys(props.props), recusadas: props.recusadas, sincronizar: sync }, 200, h);
      } catch (e) { return resposta({ erro: e.message }, 502, h); }
    }

    // Administração publica ou tira um depoimento do site. Só mexe em páginas da base de feedback.
    if (url.pathname === "/feedback/publicar") {
      if (!admin) return resposta({ erro: "só o administrador publica depoimentos" }, 403, h);
      const id = String(corpo.id || "").replace(/-/g, ""); if (!/^[0-9a-f]{32}$/.test(id)) return resposta({ erro: "id da página inválido" }, 400, h);
      try {
        const base = await baseFeedback(env); const pg = await notion(env, `pages/${id}`);
        if (String(pg.parent?.database_id || "").replace(/-/g, "") !== base) return resposta({ erro: "essa página não é de feedback" }, 403, h);
        await notion(env, `pages/${id}`, "PATCH", { properties: { "Publicar": valorNotion("checkbox", !!corpo.publicar) } });
        return resposta({ ok: true, sincronizar: await sincronizar(env) }, 200, h);
      } catch (e) { return resposta({ erro: e.message }, 502, h); }
    }

    if (url.pathname === "/pagina") {
      const id = String(corpo.id || "").replace(/-/g, ""); if (!/^[0-9a-f]{32}$/.test(id)) return resposta({ erro: "id da página inválido" }, 400, h);
      const props = {}; const recusadas = [];
      // O mentor ajusta o "Valor total" do próprio orçamento enquanto o cliente não pagou nada. Depois disso, só o administrador.
      let naoPago = false;
      if (!admin && corpo.props && "Valor total" in corpo.props) {
        try { const pg = await notion(env, `pages/${id}`); const p = pg.properties?.["Pagamento"]?.select?.name || ""; naoPago = !p || semAcento(p).startsWith("nao pago"); } catch {}
      }
      for (const [nome, v] of Object.entries(corpo.props || {})) {
        const liberadoMentor = nome === "Valor total" && naoPago;
        const tipo = COLUNAS[nome] || (admin || liberadoMentor ? TIPOS_ADMIN[nome] : null);
        if (!tipo || (SO_ADMIN.has(nome) && !admin && !liberadoMentor)) { recusadas.push(nome); continue; }
        const nv = valorNotion(tipo, v); if (nv) props[nome] = nv;
      }
      if (!Object.keys(props).length) return resposta({ erro: "nenhuma coluna permitida", recusadas }, 403, h);
      try { await notion(env, `pages/${id}`, "PATCH", { properties: props }); }
      catch (e) { return resposta({ erro: e.message }, 502, h); }
      const sync = corpo.sincronizar === false ? { ok: false, motivo: "não pedido" } : await sincronizar(env);
      return resposta({ ok: true, gravadas: Object.keys(props), recusadas, sincronizar: sync, quem: semAcento(corpo.quem || "") }, 200, h);
    }
    return resposta({ erro: "rota desconhecida" }, 404, h);
  },
  // Agendamento do Cloudflare (wrangler.toml, [triggers]). O agendamento do GitHub atrasa horas, este não.
  async scheduled(evento, env, ctx) { ctx.waitUntil(sincronizar(env)); },
};
