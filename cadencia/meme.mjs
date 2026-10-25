// Meme em formato de tweet, feito aqui e em alta: imagem do feed (1080x1350) e do story (1080x1920).
//
//   node cadencia/meme.mjs cadencia/posts/2026-10-26-algo-meme.json
//
// JSON:
//   "id": "2026-10-26-algo-meme",
//   "formato": "meme-print",
//   "texto": "Eu fingindo que não vi as **revisões vencidas**",     (**assim** sai em negrito)
//   "imagem": { "print": "revisoes", "recorte": [285, 225, 1115, 200] }   tela real de cadencia/prints
//          ou { "arquivo": "/tmp/meme.jpg" }                            meme famoso baixado do Drive (fica fora do git)
//          ou { "ranking": [["Marina","12h40"],["Você","11h05",1],["Rafael","8h30"]] }
//   "selo": "Tela real do app"     (opcional, etiqueta pequena em cima da imagem)
//   "legenda": "..."
// Saída: cadencia/publicado/<id>/feed.jpg e story.jpg.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.join(AQUI, 'package.json'));
const { chromium } = require('playwright');

const post = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
for (const m of ['—', '–']) if ((post.texto + (post.legenda || '')).includes(m)) throw new Error('texto com travessão');
if (/n[ãa]o [ée] .{1,40}, [ée] /i.test(post.texto + (post.legenda || ''))) throw new Error('texto no molde "não é X, é Y"');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const texto = esc(post.texto).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const fonte = (f, p) => `@font-face{font-family:J;font-weight:${p};src:url(file://${AQUI}/fontes/${f})}`;

function imagemHTML(largura) {
  const im = post.imagem || {};
  if (im.ranking) {
    return `<div class="rank">${im.ranking.map((r, i) => `<div class="r${r[2] ? ' eu' : ''}"><span class="p">${i + 1}</span><span class="n">${esc(r[0])}</span><span class="h">${esc(r[1])}</span></div>`).join('')}</div>`;
  }
  let src, iw, ih, rc;
  if (im.print) {
    src = `file://${AQUI}/prints/${im.print}.jpg`;
    [iw, ih] = tamanho(path.join(AQUI, 'prints', im.print + '.jpg'));
  } else {
    src = 'file://' + path.resolve(im.arquivo);
    [iw, ih] = tamanho(path.resolve(im.arquivo));
  }
  rc = im.recorte || [0, 0, iw, ih];
  const altura = Math.min(Math.round(largura * rc[3] / rc[2]), im.alturaMax || 760);
  const k = Math.max(largura / rc[2], altura / rc[3]);
  const x = -rc[0] * k + (largura - rc[2] * k) / 2, y = -rc[1] * k + (altura - rc[3] * k) / 2;
  return `<div class="img" style="height:${altura}px;background-image:url('${src}');background-size:${iw * k}px ${ih * k}px;background-position:${x}px ${y}px">${post.selo ? `<span class="selo">${esc(post.selo)}</span>` : ''}</div>`;
}

function tamanho(arq) {           // largura e altura de JPG ou PNG, sem dependência
  const b = fs.readFileSync(arq);
  if (b[0] === 0x89) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error('não li o tamanho de ' + arq);
}

function pagina(W, H) {
  const pad = 64, card = W - 2 * pad, dentro = card - 2 * 52;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonte('plus-jakarta-sans-latin-400-normal.woff2', 400)}${fonte('plus-jakarta-sans-latin-700-normal.woff2', 700)}${fonte('plus-jakarta-sans-latin-800-normal.woff2', 800)}
@font-face{font-family:M;src:url(file://${AQUI}/fontes/jetbrains-mono-latin-600-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:J,sans-serif;background:#0a0618;color:#16121f;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.fundo{position:absolute;inset:0;background:
 radial-gradient(900px 700px at 15% 10%,rgba(124,58,237,.55),transparent 70%),
 radial-gradient(800px 700px at 95% 95%,rgba(34,211,238,.30),transparent 70%),
 radial-gradient(1px 1px at 20% 30%,#7dd3fc 99%,transparent),radial-gradient(1.5px 1.5px at 70% 18%,#c4b5fd 99%,transparent),
 radial-gradient(1px 1px at 85% 60%,#7dd3fc 99%,transparent),radial-gradient(1.5px 1.5px at 35% 85%,#c4b5fd 99%,transparent),#0a0618}
.topo{position:relative;font:600 22px M,monospace;letter-spacing:.22em;color:#cbbff5;text-transform:uppercase;margin-bottom:34px;display:flex;gap:14px;align-items:center}
.topo i{width:10px;height:10px;border-radius:50%;background:#f43f5e;box-shadow:0 0 10px #f43f5e}
.card{position:relative;width:${card}px;background:#fff;border-radius:34px;padding:46px 52px 52px;box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06)}
.quem{display:flex;align-items:center;gap:20px}
.av{width:88px;height:88px;border-radius:50%;background:#140b2a;display:flex;align-items:center;justify-content:center;flex:none}
.av img{width:66px}
.nome{font-weight:800;font-size:36px;color:#0f0b18}
.arroba{font-size:30px;color:#6b6478;margin-top:2px}
.txt{font-size:${post.tamanho || 50}px;line-height:1.32;margin:30px 0 32px;color:#14101c;letter-spacing:-.005em}
.txt b{font-weight:800}
.img{position:relative;width:${dentro}px;border-radius:24px;border:1px solid #e5e2ec;background-repeat:no-repeat;background-color:#0b0a18;overflow:hidden}
.selo{position:absolute;right:18px;bottom:18px;font:600 20px M,monospace;letter-spacing:.12em;text-transform:uppercase;color:#e9e4ff;background:rgba(20,10,40,.78);border:1px solid rgba(196,181,253,.5);padding:9px 14px;border-radius:999px}
.rank{width:${dentro}px;display:flex;flex-direction:column;gap:14px}
.rank .r{display:flex;align-items:center;gap:20px;padding:24px 28px;border-radius:20px;background:#f4f1fb;border:2px solid #e6e0f5;font-weight:800;font-size:38px}
.rank .p{font:600 30px M;color:#8b84a3;width:34px}.rank .n{flex:1}.rank .h{font:600 34px M;color:#7c3aed}
.rank .eu{background:#efe7ff;border-color:#a78bfa}
.pe{position:relative;margin-top:34px;font:600 22px M,monospace;letter-spacing:.18em;color:#d8cff7;text-transform:uppercase}
.pe b{color:#67e8f9;font-weight:600}
</style></head><body><div class="fundo"></div>
<div class="topo"><i></i>Cadência Med · app de estudos pra residência</div>
<div class="card"><div class="quem"><div class="av"><img src="file://${AQUI}/marca.png"></div><div><div class="nome">Cadência Med</div><div class="arroba">@cadenciamed</div></div></div>
<div class="txt">${texto}</div>${imagemHTML(dentro)}</div>
<div class="pe">cadenciamed.com.br · <b>3 dias grátis</b></div>
</body></html>`;
}

const dest = path.join(AQUI, 'publicado', post.id);
fs.mkdirSync(dest, { recursive: true });
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
for (const [nome, W, H] of [['feed', 1080, 1350], ['story', 1080, 1920]]) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const html = path.join(dest, `_${nome}.html`);
  fs.writeFileSync(html, pagina(W, H));
  await p.goto('file://' + html);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const alto = await p.evaluate(() => document.querySelector('.card').getBoundingClientRect().bottom);
  if (alto > H - 60) throw new Error(`${nome}: o cartão passou do tamanho (${Math.round(alto)} px). Corte o texto ou use um recorte mais baixo.`);
  await p.screenshot({ path: path.join(dest, `${nome}.jpg`), type: 'jpeg', quality: 95 });
  fs.unlinkSync(html);
  await p.close();
}
await b.close();
console.log(dest + '/feed.jpg', dest + '/story.jpg');
