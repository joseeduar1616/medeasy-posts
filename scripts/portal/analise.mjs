// Lê a análise curricular MedEasy (PDF ou triagem.json) e devolve a prova com cada item.
// O PDF é convertido com `pdftotext -layout` (pacote poppler-utils).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lerTextoAnalise } from "./leitor-analise.mjs";

const num = s => { const n = parseFloat(String(s || "").replace(/\s/g, "").replace("+", "").replace(",", ".")); return isFinite(n) ? n : 0; };
const isoDe = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
const limpa = s => s.replace(/\s+/g, " ").trim();

export function pdfParaTexto(arquivo) { return execFileSync("pdftotext", ["-layout", arquivo, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }

export { lerTextoAnalise };

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
