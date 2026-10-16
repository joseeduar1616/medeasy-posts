// Lê a análise curricular MedEasy (PDF ou triagem.json) e devolve a prova com cada item.
// O PDF é convertido com `pdftotext -layout` (pacote poppler-utils).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const num = s => { const n = parseFloat(String(s || "").replace(/\s/g, "").replace("+", "").replace(",", ".")); return isFinite(n) ? n : 0; };
const isoDe = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
const limpa = s => s.replace(/\s+/g, " ").trim();
const ROTULO = /^\s*([+-]?\d+(?:,\d+)?)\s+(PONTUAÇÃO MÁXIMA|POR ATIVIDADE|PONTUAÇÃO PESSOAL|GANHO POSSÍVEL)\b/;

export function pdfParaTexto(arquivo) { return execFileSync("pdftotext", ["-layout", arquivo, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }

export function lerTextoAnalise(texto) {
  // tira os cabeçalhos de página ("MEDEASY ANÁLISE CURRICULAR HPP 2026   NOME   01")
  const linhas = texto.replace(/\f/g, "\n").split("\n").filter(l => !/^\s*MEDEASY ANÁLISE CURRICULAR/i.test(l));
  const corpo = linhas.join("\n");
  const naoVazias = linhas.map(l => l.trim()).filter(Boolean);
  const sigla = naoVazias[0] || "";
  const subtitulo = naoVazias[1] || "";
  const iNome = naoVazias.findIndex(l => /^análise curricular$/i.test(l));
  const cliente = iNome >= 0 ? naoVazias[iNome + 1] || "" : "";
  const nota = corpo.match(/(\d+(?:,\d+)?)\s*\/\s*(\d+(?:,\d+)?)\s*\n\s*PONTUAÇÃO ESTIMADA/i);
  // "62,0" fica sozinho numa linha um pouco acima de "POSSÍVEL ATÉ 09/11/2026"
  let possivel = null; { const iP = linhas.findIndex(l => /POSSÍVEL ATÉ\s*\d{2}\/\d{2}\/\d{4}/i.test(l)); if (iP >= 0) { const data = linhas[iP].match(/POSSÍVEL ATÉ\s*(\d{2}\/\d{2}\/\d{4})/i)[1]; for (let i = iP - 1; i >= Math.max(0, iP - 6); i--) { const m = linhas[i].trim().match(/^(\d+(?:,\d+)?)$/); if (m) { possivel = [null, m[1], data]; break; } } if (!possivel) possivel = [null, "", data]; } }
  const regras = (corpo.match(/Regras do edital que você precisa saber\s*\n([\s\S]*?)(?=\n\s*ITEM \d+\s|\n{3,})/i) || [])[1];
  const anoM = (sigla + " " + subtitulo).match(/20\d\d/) || corpo.match(/ANÁLISE CURRICULAR\s+\S+\s+(20\d\d)/i);

  const itens = [];
  const partes = corpo.split(/\n(?=\s*ITEM \d+\s)/).slice(1);
  for (const parte of partes) {
    const cab = parte.match(/^\s*ITEM (\d+)\s+(.*)$/m); if (!cab) continue;
    const [antes, depois = ""] = parte.split(/\n\s*Análise curricular\s+COMPROVANTES NO CURRÍCULO/i);
    const topo = antes.split("\n").slice(1).map(l => l.trim()).filter(Boolean);
    // título: primeira linha e as seguintes enquanto não começar a regra
    // o título continua só quando a linha seguinte começa com letra minúscula (quebra de linha)
    let t = 1; const tit = [topo[0] || ""];
    while (t < topo.length && /^[a-zà-ú(]/.test(topo[t])) { tit.push(topo[t]); t++; }
    const regra = limpa(topo.slice(t).join(" "));
    const [lista, coment = ""] = depois.split(/\n\s*Comentário:\s*/i);
    const v = { max: 0, porAtividade: 0, pontos: 0, ganho: 0 };
    const comprovantes = []; let atual = null;
    for (const l of (lista || "").split("\n").slice(1)) {
      let resto = l; const r = l.match(ROTULO);
      if (r) { const k = { "PONTUAÇÃO MÁXIMA": "max", "POR ATIVIDADE": "porAtividade", "PONTUAÇÃO PESSOAL": "pontos", "GANHO POSSÍVEL": "ganho" }[r[2]]; v[k] = num(r[1]); resto = l.slice(r[0].length); }
      const s = resto.trim(); if (!s) continue;
      const m = s.match(/^(\d+)\.\s+(.*)$/);
      if (m) { atual = m[2]; comprovantes.push(atual); } else if (atual !== null) { comprovantes[comprovantes.length - 1] += " " + s; }
    }
    itens.push({ n: +cab[1], nome: `${cab[1]}. ${limpa(tit.join(" "))}`, situacao: limpa(cab[2]), regra, max: v.max, porAtividade: v.porAtividade, pontos: v.pontos, ganho: v.ganho, comprovantes: comprovantes.map(limpa), comentario: limpa(coment) });
  }
  return {
    nome: sigla, ano: anoM ? (anoM[1] || anoM[0]) : "", area: subtitulo, cliente,
    notaEstimada: nota ? num(nota[1]) : itens.reduce((a, i) => a + i.pontos, 0),
    notaMax: nota ? num(nota[2]) : itens.reduce((a, i) => a + i.max, 0),
    notaPossivel: possivel && possivel[1] ? num(possivel[1]) : "", prazoEnvio: possivel ? isoDe(possivel[2]) : "",
    regras: regras ? limpa(regras) : "", itens, fonte: "analise",
  };
}

export function lerTriagem(j) {
  return {
    nome: j.sigla || j.prova || "Prova", ano: (String(j.prova || j.edital || "").match(/20\d\d/) || [""])[0], area: j.area || "", cliente: j.cliente || "",
    notaEstimada: num(j.nota_total), notaPossivel: j.nota_possivel ? num(j.nota_possivel) : "",
    notaMax: (j.itens || []).reduce((a, i) => a + num(i.maximo), 0), prazoEnvio: isoDe(j.envio && j.envio.prazo) || (j.envio && j.envio.prazo) || "",
    regras: [j.envio?.formato, j.envio?.tamanho_max ? "até " + j.envio.tamanho_max : "", j.envio?.ordem].filter(Boolean).join(". "),
    itens: (j.itens || []).map(i => ({ n: i.n, nome: `${i.n ? i.n + ". " : ""}${i.titulo || "Item"}`, situacao: i.situacao || "", regra: i.regra || "", max: num(i.maximo), porAtividade: num(i.por_atividade), pontos: num(i.nota), ganho: num(i.ganho_possivel), comprovantes: (i.certificados || []).filter(c => !c.reserva).map(c => [c.evento, [c.data, c.ch].filter(Boolean).join(", ")].filter(Boolean).join(" (") + (c.data || c.ch ? ")" : "")), comentario: i.risco || "" })),
    fonte: "triagem",
  };
}

/* Lê um arquivo (PDF ou JSON) já baixado. */
export function lerArquivoAnalise(arquivo) {
  if (/\.json$/i.test(arquivo)) return lerTriagem(JSON.parse(fs.readFileSync(arquivo, "utf8")));
  return lerTextoAnalise(pdfParaTexto(arquivo));
}

/* Baixa de uma URL (anexo do Notion) e lê. */
export async function lerAnaliseDaUrl(url, nome) {
  const r = await fetch(url); if (!r.ok) throw new Error("download " + r.status);
  const tmp = path.join(os.tmpdir(), "analise-" + Date.now() + "-" + Math.random().toString(36).slice(2) + (/\.json$/i.test(nome) ? ".json" : ".pdf"));
  fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  try { return lerArquivoAnalise(tmp); } finally { fs.rmSync(tmp, { force: true }); }
}

// Teste rápido: node scripts/portal/analise.mjs arquivo.pdf
if (process.argv[1] && process.argv[1].endsWith("analise.mjs") && process.argv[2]) console.log(JSON.stringify(lerArquivoAnalise(process.argv[2]), null, 1));
