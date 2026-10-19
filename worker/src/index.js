// Ponte do Portal MedEasy: recebe mudanças do site, grava no Notion e manda o GitHub sincronizar.
// Roda num Cloudflare Worker. As chaves ficam nos secrets do Worker, nunca no site.
//   PORTAL_SENHA        senha da equipe (a mesma do site)
//   PORTAL_SENHA_ADMIN  senha de administrador (opcional, libera as colunas de dinheiro)
//   NOTION_TOKEN        token da conexão "Portal MedEasy" no Notion, com permissão de escrita
//   GITHUB_TOKEN        token fine-grained com Actions: write no repositório medeasy-posts (opcional)
//   GITHUB_REPO         "joseeduar1616/medeasy-posts"
//   ORIGEM              origens permitidas, separadas por vírgula. Ex.: https://curriculosmedeasy.com.br,https://joseeduar1616.github.io
//   TRIAGEM_DB          id da base "Triagem MedEasy" (recebe a triagem feita no site)
//   CLIENTES_DB         id da base "Controle cliente" (recebe o cliente que fechou)

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
  return { "Access-Control-Allow-Origin": ok ? origem || "*" : "null", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
const resposta = (obj, status, extra) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json; charset=utf-8", ...(extra || {}) } });

async function notion(env, caminho, metodo, corpo) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, { method: metodo || "GET", headers: { Authorization: `Bearer ${env.NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Notion ${r.status}: ${j.message || ""}`);
  return j;
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

export default {
  async fetch(req, env) {
    const h = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    if (url.pathname === "/saude") return resposta({ ok: true, notion: !!env.NOTION_TOKEN, github: !!(env.GITHUB_TOKEN && env.GITHUB_REPO), admin: !!env.PORTAL_SENHA_ADMIN }, 200, h);

    // Quem chama precisa da senha da equipe. A de administrador vai em X-Admin.
    const senha = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const equipeOk = env.PORTAL_SENHA && (iguais(senha, env.PORTAL_SENHA) || iguais(senha, String(env.PORTAL_SENHA).toLowerCase()));
    if (!equipeOk) return resposta({ erro: "senha da equipe incorreta" }, 401, h);
    const admin = !!env.PORTAL_SENHA_ADMIN && iguais((req.headers.get("X-Admin") || "").trim(), env.PORTAL_SENHA_ADMIN);
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
        const j = await notion(env, "pages", "POST", { parent: { database_id: dbc }, properties: await ajustarOpcoes(env, dbc, props.props) });
        const sync = await sincronizar(env);
        return resposta({ ok: true, id: j.id, url: j.url, gravadas: Object.keys(props.props), recusadas: props.recusadas, sincronizar: sync }, 200, h);
      } catch (e) { return resposta({ erro: e.message }, 502, h); }
    }

    if (url.pathname === "/pagina") {
      const id = String(corpo.id || "").replace(/-/g, ""); if (!/^[0-9a-f]{32}$/.test(id)) return resposta({ erro: "id da página inválido" }, 400, h);
      const props = {}; const recusadas = [];
      for (const [nome, v] of Object.entries(corpo.props || {})) {
        const tipo = COLUNAS[nome] || (admin ? TIPOS_ADMIN[nome] : null);
        if (!tipo || (SO_ADMIN.has(nome) && !admin)) { recusadas.push(nome); continue; }
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
