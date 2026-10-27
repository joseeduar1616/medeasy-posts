/* Vídeo "agente de IA que fala": esfera de pontos que pulsa com a voz, legenda palavra por palavra,
   telas do app entrando conforme a fala. Tudo calculado em render(t), sem animação CSS.
   Entrada: window.ROTEIRO = { dur, frases: [{palavras:[{w,s,e}], hl:[índices], cena}], env:[0..1 por quadro a 30 fps] }
   cena: 'orb' (esfera grande), 'painel', 'rotina', 'cartoes', 'escada', 'fim'. */
const W = 1080, H = 1920, FPS = 30;
const R = window.ROTEIRO;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = k => 1 - Math.pow(1 - clamp(k), 3);
const sm = k => { k = clamp(k); return k * k * (3 - 2 * k); };

/* ── cenas: começo e fim de cada uma, pelas frases ── */
const CENAS = [];
R.frases.forEach((f, i) => {
  const s = i === 0 ? 0 : f.palavras[0].s - .15;
  const ult = CENAS[CENAS.length - 1];
  if (ult && ult.tipo === f.cena) ult.e = null; else CENAS.push({ tipo: f.cena, s, e: null, primeira: i });
});
CENAS.forEach((c, i) => c.e = i + 1 < CENAS.length ? CENAS[i + 1].s : R.dur);
const cenaEm = t => CENAS.find(c => t >= c.s && t < c.e) || CENAS[CENAS.length - 1];
const vis = (c, t, f = .35) => c ? Math.min(sm((t - c.s) / f), sm((c.e - t) / f)) : 0;

/* ── fundo ── */
const bg = document.getElementById('bg'), bx = bg.getContext('2d');
function fundo(t) {
  bx.fillStyle = '#06040d'; bx.fillRect(0, 0, W, H);
  const g1 = bx.createRadialGradient(540, 700, 0, 540, 700, 1100);
  g1.addColorStop(0, 'rgba(91,33,182,.42)'); g1.addColorStop(1, 'transparent');
  bx.fillStyle = g1; bx.fillRect(0, 0, W, H);
  const g2 = bx.createRadialGradient(900 + 60 * Math.sin(t * .2), 1600, 0, 900, 1600, 900);
  g2.addColorStop(0, 'rgba(14,116,144,.30)'); g2.addColorStop(1, 'transparent');
  bx.fillStyle = g2; bx.fillRect(0, 0, W, H);
  bx.strokeStyle = 'rgba(196,181,253,.055)'; bx.lineWidth = 1;
  const off = (t * 6) % 72;
  for (let x = -72 + off; x < W; x += 72) { bx.beginPath(); bx.moveTo(x, 0); bx.lineTo(x, H); bx.stroke(); }
  for (let y = -72 + off; y < H; y += 72) { bx.beginPath(); bx.moveTo(0, y); bx.lineTo(W, y); bx.stroke(); }
}

/* ── esfera de pontos ── */
const ov = document.getElementById('orb'), ox = ov.getContext('2d');
const N = 1400, PTS = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
  PTS.push([Math.cos(th) * r, y, Math.sin(th) * r]);
}
const envEm = t => { const e = R.env || []; const i = Math.floor(t * FPS); return e.length ? (e[Math.min(i, e.length - 1)] || 0) : .25 + .25 * Math.sin(t * 9) ** 2; };
let orbAtual = null;
function alvoOrb(c) {
  if (c.tipo === 'orb') return { x: 540, y: 690, r: 300 };
  if (c.tipo === 'fim') return { x: 540, y: 1600, r: 120 };
  return { x: 540, y: 1640, r: 115 };
}
function orb(t) {
  const c = cenaEm(t), ant = CENAS[CENAS.indexOf(c) - 1];
  const de = ant ? alvoOrb(ant) : alvoOrb(c), para = alvoOrb(c), k = ease((t - c.s) / .7);
  const o = { x: lerp(de.x, para.x, k), y: lerp(de.y, para.y, k), r: lerp(de.r, para.r, k) };
  const a = envEm(t);
  ox.clearRect(0, 0, W, H);
  // halo
  const hg = ox.createRadialGradient(o.x, o.y, o.r * .2, o.x, o.y, o.r * 1.9);
  hg.addColorStop(0, `rgba(168,85,247,${.22 + a * .35})`); hg.addColorStop(1, 'transparent');
  ox.fillStyle = hg; ox.beginPath(); ox.arc(o.x, o.y, o.r * 1.9, 0, 6.29); ox.fill();
  // anel
  ox.strokeStyle = `rgba(103,232,249,${.12 + a * .35})`; ox.lineWidth = 2;
  ox.beginPath(); ox.arc(o.x, o.y, o.r * (1.18 + a * .12), 0, 6.29); ox.stroke();
  const ry = t * .45, rx = .35 + Math.sin(t * .3) * .15, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const lista = [];
  for (const [px, py, pz] of PTS) {
    // faixas que correm pela superfície (o "desenho" da esfera) + deformação pela voz
    const banda = Math.sin(py * 7 + Math.atan2(pz, px) * 2 - t * 2.2);
    const vis = banda > -.15;
    const bump = 1 + a * .16 * Math.sin(px * 6 + t * 7) * Math.cos(py * 5 - t * 5);
    let x = px * bump, y = py * bump, z = pz * bump;
    let x2 = x * cy - z * sy, z2 = x * sy + z * cy;
    let y2 = y * cx - z2 * sx, z3 = y * sx + z2 * cx;
    lista.push([x2, y2, z3, vis, banda]);
  }
  lista.sort((p, q) => p[2] - q[2]);
  for (const [x, y, z, v, b] of lista) {
    const prof = (z + 1) / 2;
    if (!v && prof < .55) continue;
    const s = (v ? 2.1 + 2.6 * prof : 1.1 + prof) * (o.r / 300) * (1 + a * .4);
    const al = v ? .25 + .75 * prof : .12 * prof;
    const mix = clamp((y + 1) / 2);
    const rr = Math.round(lerp(103, 192, mix)), gg = Math.round(lerp(232, 132, mix)), bb = Math.round(lerp(249, 252, mix));
    ox.fillStyle = `rgba(${rr},${gg},${bb},${al})`;
    ox.beginPath(); ox.arc(o.x + x * o.r, o.y + y * o.r, s, 0, 6.29); ox.fill();
  }
}

/* ── legenda ── */
const leg = document.getElementById('leg');
const montadas = R.frases.map((f, fi) => {
  const d = document.createElement('div'); d.className = 'frase';
  f.palavras.forEach((p, i) => { const s = document.createElement('span'); s.textContent = p.w; if (f.hl.includes(i)) s.className = 'hl'; d.appendChild(s); d.appendChild(document.createTextNode(' ')); });
  leg.appendChild(d); return d;
});
function legenda(t) {
  let atual = -1;
  R.frases.forEach((f, i) => { if (t >= f.palavras[0].s - .05) atual = i; });
  const c = cenaEm(t);
  leg.style.top = (c.tipo === 'orb' ? 1130 : c.tipo === 'fim' ? 1250 : 1290) + 'px';
  montadas.forEach((d, i) => {
    const f = R.frases[i], fimF = (R.frases[i + 1] ? R.frases[i + 1].palavras[0].s - .05 : R.dur);
    const ativo = i === atual && t < fimF + .1;
    d.style.display = ativo ? 'block' : 'none';
    if (!ativo) return;
    [...d.querySelectorAll('span')].forEach((s, j) => {
      const k = clamp((t - f.palavras[j].s + .04) / .14);
      s.style.opacity = .15 + .85 * k;
      s.style.transform = `translateY(${(1 - ease(k)) * 10}px)`;
    });
  });
}

/* ── painéis ── */
const P = id => document.getElementById(id);
function paineis(t) {
  for (const id of ['painel', 'rotina', 'cartoes', 'escada', 'fim']) {
    const el = P('c-' + id); if (!el) continue;
    const c = CENAS.find(x => x.tipo === id && t >= x.s - .5 && t < x.e + .5);
    const v = c ? vis(c, t) : 0;
    el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 40}px) scale(${.97 + .03 * v})`;
    if (c && id === 'painel') {
      el.querySelectorAll('.chip').forEach((ch, i) => {
        const f = R.frases[c.primeira + 1 + i]; const k = f ? ease((t - f.palavras[0].s) / .35) : 0;
        ch.style.opacity = k; ch.style.transform = `translateX(${(1 - k) * -30}px)`;
        ch.classList.toggle('ok', f && t > f.palavras[f.palavras.length - 1].e);
      });
    }
    if (c && id === 'escada') {
      const marcas = R.marcasEscada || [];
      el.querySelectorAll('.no').forEach((n, i) => n.classList.toggle('on', marcas[i] != null && t >= marcas[i]));
      const on = marcas.filter(m => t >= m).length;
      el.querySelector('.enche').style.transform = `scaleX(${Math.max(0, (on - 1) / 4)})`;
    }
    if (c && id === 'fim') {
      el.querySelectorAll('[data-k]').forEach(n => { const k = ease((t - c.s - +n.dataset.k) / .5); n.style.opacity = k; n.style.transform = `translateY(${(1 - k) * 24}px)`; });
    }
  }
}

window.render = t => { fundo(t); orb(t); legenda(t); paineis(t); };
window.PRONTO = true;
