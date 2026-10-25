/* Motor de vídeo: monta as cenas a partir de VIDEO (spec) e expõe render(t).
   Toda animação é Web Animations pausada; render(t) põe todas no mesmo tempo. */
const ANIMS = [], GANCHOS = [], EVENTOS = [];
const EASE = 'cubic-bezier(.2,.8,.2,1)';

function el(tag, cls, pai, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  (pai || document.body).appendChild(e);
  return e;
}
function anim(e, kf, ini, dur, opt = {}) {
  const a = e.animate(kf, { duration: dur * 1000, delay: ini * 1000, fill: opt.fill || 'both', easing: opt.easing || EASE });
  a.pause(); ANIMS.push(a); return a;
}
function evento(t, tipo) { EVENTOS.push({ t: +t.toFixed(3), tipo }); }
const ENTRA = [{ opacity: 0, transform: 'translateY(40px)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];

/* ── fundo: constelação, brilhos e grão ─────────────────────────── */
let semente = 7;
function rnd() { semente = (semente * 16807) % 2147483647; return semente / 2147483647; }
const PONTOS = Array.from({ length: 80 }, () => ({ x: rnd() * 1080, y: rnd() * 1920, ax: 20 + rnd() * 40, ay: 20 + rnd() * 50, f: .05 + rnd() * .12, p: rnd() * 6.28, r: 1.5 + rnd() * 2.5 }));
let cv, cx, grao;
function prepararFundo() {
  cv = el('canvas', '', document.body); cv.id = 'bg'; cv.width = 1080; cv.height = 1920; cx = cv.getContext('2d');
  document.body.prepend(cv);
  grao = document.createElement('canvas'); grao.width = grao.height = 512;
  const g = grao.getContext('2d'), d = g.createImageData(512, 512);
  for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  el('div', 'vin');
}
function brilhoDaCena(t) {
  for (const c of VIDEO.cenas) if (t >= c.t0 && t < c.t1) return c.bg || ['#3b1d8f', '#0e7490'];
  return ['#3b1d8f', '#0e7490'];
}
function desenharFundo(t) {
  cx.fillStyle = '#04050d'; cx.fillRect(0, 0, 1080, 1920);
  const [a, b] = brilhoDaCena(t);
  const g1 = cx.createRadialGradient(240 + 60 * Math.sin(t * .3), 1300, 0, 240, 1300, 900);
  g1.addColorStop(0, a + 'aa'); g1.addColorStop(1, 'transparent'); cx.fillStyle = g1; cx.fillRect(0, 0, 1080, 1920);
  const g2 = cx.createRadialGradient(900, 500 + 80 * Math.cos(t * .25), 0, 900, 500, 800);
  g2.addColorStop(0, b + '88'); g2.addColorStop(1, 'transparent'); cx.fillStyle = g2; cx.fillRect(0, 0, 1080, 1920);
  const ps = PONTOS.map(p => ({ x: p.x + p.ax * Math.sin(t * p.f * 2 + p.p), y: p.y + p.ay * Math.cos(t * p.f * 1.6 + p.p), r: p.r }));
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y, d = Math.hypot(dx, dy);
    if (d < 230) { cx.strokeStyle = `rgba(103,232,249,${(1 - d / 230) * .22})`; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(ps[i].x, ps[i].y); cx.lineTo(ps[j].x, ps[j].y); cx.stroke(); }
  }
  for (const p of ps) { cx.fillStyle = 'rgba(103,232,249,.75)'; cx.shadowColor = '#22d3ee'; cx.shadowBlur = 12; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.29); cx.fill(); }
  cx.shadowBlur = 0;
  cx.globalAlpha = .07; const ox = (t * 977) % 512, oy = (t * 613) % 512;
  for (let x = -512; x < 1080 + 512; x += 512) for (let y = -512; y < 1920 + 512; y += 512) cx.drawImage(grao, x + ox, y + oy);
  cx.globalAlpha = 1;
}

/* ── blocos ─────────────────────────────────────────────────────── */
const B = {
  head(c, s) {
    const h = el('div', 'head', c.dom); if (s.top) h.style.top = s.top + 'px'; if (s.size) h.style.fontSize = s.size + 'px';
    const passo = s.passo || .2; let i = 0, modo = '';
    for (const tok of s.texto.split(' ')) {
      let cls = 'w', txt = tok, m = modo;
      const ab = tok[0];
      if (!modo && '*^~'.includes(ab)) { m = ab; modo = ab; txt = txt.slice(1); }
      if (modo && txt.replace(/[.,!?]$/, '').endsWith(modo)) { txt = txt.replace(modo, ''); modo = ''; }
      txt = txt.replace(/[*^~]/g, '');
      if (m === '*') cls += ' hl'; else if (m === '^') cls += ' cy'; else if (m === '~') cls += ' rs';
      const w = el('span', cls, h); w.textContent = txt;
      const t = s.t + i * passo; anim(w, [{ opacity: 0, transform: 'translateY(26px) scale(.96)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], t, .32);
      evento(t, 'tique');
      if (cls.includes('rs')) { const tr = s.risca || t + .7; GANCHOS.push(tt => w.style.setProperty('--k', Math.max(0, Math.min(1, (tt - tr) / .35)))); evento(tr, 'risco'); }
      i++;
    }
  },
  relogio(c, s) {
    const r = el('div', 'relogio', c.dom, `<div class="rot">${s.rot}</div><div class="num">${s.texto}</div>`); r.style.top = s.y + 'px';
    anim(r, ENTRA, s.t, .5); evento(s.t, 'impacto');
    const n = r.querySelector('.num');
    anim(n, [{ opacity: .2 }, { opacity: 1 }, { opacity: .5 }, { opacity: 1 }], s.t + .1, .5, { easing: 'steps(4)' });
  },
  chips(c, s) {
    const box = el('div', 'chips', c.dom); box.style.top = s.y + 'px';
    s.lista.forEach((it, i) => {
      const ch = el('div', 'chip' + (it.ruim ? ' ruim' : ''), box, `${it.k} <b>${it.v}</b>`);
      const t = s.t + i * (s.passo || .55); anim(ch, [{ opacity: 0, transform: 'translateX(-40px)' }, { opacity: 1, transform: 'none' }], t, .4); evento(t, 'pop');
    });
  },
  carimbo(c, s) {
    const k = el('div', 'carimbo', c.dom, s.texto); k.style.left = s.x + 'px'; k.style.top = s.y + 'px';
    anim(k, [{ opacity: 0, transform: `rotate(${s.rot || -8}deg) scale(2.4)` }, { opacity: 1, transform: `rotate(${s.rot || -8}deg) scale(.94)`, offset: .7 }, { opacity: 1, transform: `rotate(${s.rot || -8}deg) scale(1)` }], s.t, .38, { easing: 'cubic-bezier(.5,0,.7,1)' });
    evento(s.t + .26, 'carimbo');
  },
  tela(c, s) {
    const w = 936, h = s.h || Math.round(936 * s.recorte[3] / s.recorte[2]);
    const t = el('div', 'tela', c.dom, `${s.rot ? `<div class="rot">${s.rot}</div>` : ''}<div class="box" style="height:${h}px"><div class="img"></div><div class="brilho"></div></div>`);
    t.style.top = s.y + 'px';
    const [x, y, cw, ch] = s.recorte, esc = Math.max(w / cw, h / ch), img = t.querySelector('.img');
    img.style.backgroundImage = `url(${s.img})`; img.style.backgroundSize = `${s.iw * esc}px auto`;
    img.style.backgroundPosition = `${-x * esc + (w - cw * esc) / 2}px ${-y * esc + (h - ch * esc) / 2}px`;
    anim(t, [{ opacity: 0, transform: 'translateY(90px) scale(.94)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], s.t, .6); evento(s.t, 'whoosh');
    anim(img, [{ transform: 'scale(1)' }, { transform: `scale(${s.zoom || 1.07})` }], s.t, c.t1 - s.t, { easing: 'linear' });
    anim(t.querySelector('.brilho'), [{ backgroundPosition: '120% 0' }, { backgroundPosition: '-20% 0' }], s.t + .5, 1.1, { easing: 'ease-in-out' });
  },
  escada(c, s) {
    const e = el('div', 'escada', c.dom, `<div class="trilho"><div class="enche"></div></div><div class="nos"></div>`); e.style.top = s.y + 'px';
    anim(e, ENTRA, s.t, .45);
    const nos = e.querySelector('.nos'), passo = s.passo || .55, n = s.passos.length;
    s.passos.forEach((p, i) => {
      const no = el('div', 'no', nos, `<div class="bola">${i + 1}</div><div class="leg">${p}</div>`);
      const t = s.t + .5 + i * passo;
      GANCHOS.push(tt => no.classList.toggle('on', tt >= t)); evento(t, 'pop');
      anim(no.querySelector('.bola'), [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], t, .35);
    });
    anim(e.querySelector('.enche'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], s.t + .5, passo * (n - 1), { easing: 'linear' });
  },
  checks(c, s) {
    const box = el('div', 'checks', c.dom); box.style.top = s.y + 'px'; if (s.size) box.style.setProperty('--fs', s.size);
    s.itens.forEach((it, i) => {
      const linha = el('div', 'ck', box, `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#c084fc" stroke-width="5"/><path d="M19 33 l9 9 l18 -19" fill="none" stroke="#e9d5ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${it.replace(/\*(.+?)\*/g, '<span class="hl">$1</span>').replace(/~(.+?)~/g, '<span class="rs">$1</span>')}</span>`);
      if (s.size) linha.style.fontSize = s.size + 'px';
      const t = s.t + i * (s.passo || .7);
      linha.querySelectorAll('.rs').forEach(r => { const tr = t + .8; GANCHOS.push(tt => r.style.setProperty('--k', Math.max(0, Math.min(1, (tt - tr) / .35)))); evento(tr, 'risco'); });
      anim(linha, [{ opacity: 0, transform: 'translateX(-50px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], t, .45); evento(t, 'pop');
    });
  },
  grande(c, s) {
    const g = el('div', 'grande', c.dom, `${s.rot ? `<div class="rot" style="margin-bottom:10px">${s.rot}</div>` : ''}<div class="v">${s.texto}</div>${s.sub ? `<div class="s">${s.sub}</div>` : ''}`);
    g.style.top = s.y + 'px'; if (s.size) g.querySelector('.v').style.fontSize = s.size + 'px';
    anim(g.querySelector('.v'), [{ opacity: 0, transform: 'scale(1.35)', filter: 'blur(20px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], s.t, .5);
    if (s.rot) anim(g.querySelector('.rot'), ENTRA, s.t - .15, .4);
    if (s.sub) anim(g.querySelector('.s'), ENTRA, s.t + .45, .4);
    evento(s.t, 'impacto');
  },
  adesivo(c, s) {
    const a = el('div', 'adesivo', c.dom, `<span>${s.a}</span><span>${s.b}</span>`); a.style.left = s.x + 'px'; a.style.top = s.y + 'px';
    const r = s.rot || -4;
    anim(a, [{ opacity: 0, transform: `rotate(${r}deg) scale(.3)` }, { opacity: 1, transform: `rotate(${r}deg) scale(1.12)`, offset: .65 }, { opacity: 1, transform: `rotate(${r}deg) scale(1)` }], s.t, .42);
    evento(s.t, 'pop');
  },
  contador(c, s) {
    const box = el('div', 'contador', c.dom); box.style.top = s.y + 'px';
    s.itens.forEach((it, i) => {
      const d = el('div', 'c', box, `<div class="n">0</div><div class="l">${it.l}</div>`);
      const t = s.t + i * .35, dur = s.dur || 1.4, n = d.querySelector('.n');
      anim(d, ENTRA, t, .4); evento(t, 'pop');
      GANCHOS.push(tt => { const k = Math.max(0, Math.min(1, (tt - t) / dur)); n.textContent = Math.round(it.n * (1 - Math.pow(1 - k, 3))); });
    });
  },
  pergunta(c, s) {
    const p = el('div', 'pergunta', c.dom, `<div class="av"><img src="marca.png"></div><div><div class="q1">${s.rot}</div><div class="q2">${s.texto}</div></div>`);
    if (s.top) p.style.top = s.top + 'px';
    anim(p, [{ opacity: 0, transform: 'translateY(-40px) scale(.96)' }, { opacity: 1, transform: 'none' }], s.t, .45); evento(s.t, 'pop');
  },
  rank(c, s) {
    const box = el('div', 'rank', c.dom); box.style.top = s.y + 'px';
    s.linhas.forEach((l, i) => {
      const r = el('div', 'r' + (l.eu ? ' eu' : ''), box, `<span class="p">${i + 1}</span><span class="nm">${l.n}</span><span class="h">${l.h}</span>`);
      const t = s.t + i * .3; anim(r, [{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }], t, .4); evento(t, 'tique');
    });
  },
  timer(c, s) {
    const T = el('div', 'timer', c.dom, `<div class="anel"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="none" stroke="rgba(196,181,253,.2)" stroke-width="10"/><circle class="arco" cx="100" cy="100" r="88" fill="none" stroke="#c084fc" stroke-width="10" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0" style="filter:drop-shadow(0 0 8px #a855f7)"/></svg><div class="t">25:00</div></div><div class="info">${s.info.map(x => `<div>${x.l}<b>${x.v}</b></div>`).join('')}</div>`);
    T.style.top = s.y + 'px'; anim(T, ENTRA, s.t, .5); evento(s.t, 'whoosh');
    const tx = T.querySelector('.t'), arco = T.querySelector('.arco');
    GANCHOS.push(tt => { const seg = Math.max(0, Math.min(1500, (tt - s.t) * (s.vel || 14))); const rest = 1500 - seg; tx.textContent = String(Math.floor(rest / 60)).padStart(2, '0') + ':' + String(Math.floor(rest % 60)).padStart(2, '0'); arco.style.strokeDashoffset = 553 * seg / 1500; });
  },
  areas(c, s) {
    const box = el('div', 'areas', c.dom); box.style.top = s.y + 'px';
    s.itens.forEach((a, i) => {
      const d = el('div', 'area', box, `<span>${a.n}</span><b>${a.v}</b>`); if (a.largo) d.style.gridColumn = '1 / 3';
      const t = s.t + i * .35; anim(d, [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], t, .4); evento(t, 'tique');
    });
  },
  fim(c, s) {
    const f = el('div', 'fim', c.dom, `<img src="marca.png"><div class="a">${s.a}</div><div class="b">${s.b}</div><div class="url">cadenciamed.com.br</div><div class="c">${s.c || 'Link na bio'}</div>`);
    const kids = [...f.children];
    kids.forEach((k, i) => anim(k, ENTRA, s.t + i * .28, .5));
    evento(s.t, 'whoosh'); evento(s.t + .56, 'impacto');
  },
};

function montar() {
  prepararFundo();
  el('div', 'topo', document.body, `<img src="marca.png"><span class="pt"></span><span>${VIDEO.topo || 'Cadência Med'}</span><span class="sep">·</span><span>${VIDEO.topo2 || '3 dias grátis'}</span>`);
  for (const c of VIDEO.cenas) {
    c.dom = el('div', 'cena');
    anim(c.dom, [{ opacity: 0 }, { opacity: 1 }], c.t0, .2);
    if (c.t1 < VIDEO.dur) anim(c.dom, [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(16px)', transform: 'scale(1.03)' }], c.t1 - .32, .32, { fill: 'forwards', easing: 'ease-in' });
    evento(c.t0, 'whoosh');
    for (const b of c.blocos) B[b.tipo](c, b);
  }
  window.EVENTOS = EVENTOS.sort((a, b) => a.t - b.t);
}
window.render = t => { for (const a of ANIMS) a.currentTime = t * 1000; for (const g of GANCHOS) g(t); desenharFundo(t); };
