/* Motor dos vídeos da MedEasy: monta as cenas de VIDEO e expõe render(t).
   Toda animação é Web Animations pausada e os objetos 3D (three.js) são desenhados
   no mesmo t, então cada quadro sai igual em qualquer máquina. */
import * as THREE from './three.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

const ANIMS = [], GANCHOS = [], EVENTOS = [], TRES = [];
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeBack = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

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
function evento(t, tipo) { if (t >= 0) EVENTOS.push({ t: +t.toFixed(3), tipo }); }
const ENTRA = [{ opacity: 0, transform: 'translateY(50px)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];
const PALAVRA = [{ opacity: 0, transform: 'translateY(30px) scale(.94)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];

/* grão de filme, um só pra todas as cenas */
let semente = 11;
const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
const GRAO = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c.toDataURL();
})();

/* ── texto ─────────────────────────────────────────────────────── */
// *assim* acende (verde ou pílula, conforme o tema), ~assim~ risca em vermelho.
function frase(pai, texto, t0, passo) {
  const partes = texto.match(/\*[^*]+\*[.,!?]*|~[^~]+~[.,!?]*|\S+/g);
  let i = 0;
  for (const p of partes) {
    const m = p[0] === '*' ? 'hl' : p[0] === '~' ? 'rs' : '';
    if (!m) { const w = el('span', 'w', pai); w.textContent = p; anim(w, PALAVRA, t0 + i * passo, .34); evento(t0 + i * passo, 'tique'); i++; continue; }
    const fim = p.lastIndexOf(p[0]), dentro = p.slice(1, fim), resto = p.slice(fim + 1);
    const grupo = el('span', 'w ' + m, pai), ti = t0 + i * passo;
    dentro.split(' ').forEach((pal, j) => {
      const s = el('span', '', grupo); s.textContent = pal + (j < dentro.split(' ').length - 1 ? ' ' : '');
      s.style.display = 'inline-block'; s.style.whiteSpace = 'pre';
      anim(s, PALAVRA, ti + j * .07, .34); i++; // a pílula entra inteira, sem caixa vazia
    });
    if (resto) { const r = el('span', '', grupo); r.textContent = resto; if (m === 'hl') r.style.color = 'inherit'; anim(r, PALAVRA, t0 + (i - 1) * passo, .34); }
    if (m === 'hl') { anim(grupo, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], ti, .42); evento(ti, 'pop'); }
    if (m === 'rs') { const tr = t0 + i * passo + .35; GANCHOS.push(tt => grupo.style.setProperty('--k', cl((tt - tr) / .35))); evento(tr, 'risco'); }
  }
}

/* ── 3D ────────────────────────────────────────────────────────── */
function palco(caixa, w, h, fov = 30) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  caixa.appendChild(r.domElement);
  const cena = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  cena.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const luz = new THREE.DirectionalLight('#ffffff', 1.6); luz.position.set(3, 6, 5); cena.add(luz);
  const cam = new THREE.PerspectiveCamera(fov, w / h, .1, 100);
  return { r, cena, cam };
}
function textura(w, h, desenha) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const g = c.getContext('2d');
  return { tx, g, c, upd: (...a) => { desenha(g, ...a); tx.needsUpdate = true; } };
}
function round(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

const OBJ = {
  certificados(s, { cena, cam }) {
    cam.position.set(0, 4.3, 5.9); cam.lookAt(0, .25, 0);
    const grupo = new THREE.Group(); cena.add(grupo);
    const papel = new THREE.MeshPhysicalMaterial({ color: '#ece7d8', roughness: .5, clearcoat: .3 });
    const folhas = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(3.5, .07, 2.5, 3, .03), papel);
      m.rotation.y = [.32, -.18, .12, -.05][i]; grupo.add(m); folhas.push(m);
    }
    const capa = textura(1120, 800, g => {
      g.fillStyle = '#f3efe3'; g.fillRect(0, 0, 1120, 800);
      g.strokeStyle = '#0B0F0A'; g.lineWidth = 6; round(g, 40, 40, 1040, 720, 26); g.stroke();
      g.strokeStyle = 'rgba(11,15,10,.25)'; g.lineWidth = 2; round(g, 62, 62, 996, 676, 18); g.stroke();
      g.fillStyle = '#0B0F0A'; g.font = '800 92px Jak'; g.textAlign = 'center'; g.fillText('CERTIFICADO', 560, 230);
      g.fillStyle = 'rgba(11,15,10,.55)'; g.font = '400 38px Jak'; g.fillText('Certificamos que', 560, 320);
      g.fillStyle = 'rgba(11,15,10,.16)';
      [[260, 380, 600, 26], [200, 450, 720, 18], [240, 495, 640, 18], [300, 540, 520, 18]].forEach(([x, y, w, h]) => { round(g, x, y, w, h, 9); g.fill(); });
      g.fillStyle = 'rgba(11,15,10,.35)'; round(g, 150, 650, 300, 5, 3); g.fill(); round(g, 670, 650, 300, 5, 3); g.fill();
    });
    capa.upd();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.38, 2.38), new THREE.MeshPhysicalMaterial({ map: capa.tx, roughness: .6, clearcoat: .2 }));
    face.rotation.x = -Math.PI / 2; face.position.y = .037; folhas[3].add(face);
    const selo = new THREE.Group(); folhas[3].add(selo); selo.position.set(1.05, .09, .55);
    const verde = new THREE.MeshStandardMaterial({ color: '#0a7a08', roughness: .4, envMapIntensity: .3 });
    const topo = textura(256, 256, g => {
      const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128); gr.addColorStop(0, '#1fb81b'); gr.addColorStop(1, '#065c05');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(0,40,0,.45)'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 62; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); }
      g.closePath(); g.fill();
    }); topo.upd();
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .1, 48), [verde, new THREE.MeshStandardMaterial({ map: topo.tx, roughness: .45, envMapIntensity: .3 }), verde]); selo.add(disco);
    const borda = new THREE.Mesh(new THREE.TorusGeometry(.46, .055, 16, 48), verde); borda.rotation.x = Math.PI / 2; selo.add(borda);
    const fita = new THREE.MeshStandardMaterial({ color: '#0b7a09', roughness: .5, envMapIntensity: .35 });
    [-.16, .16].forEach((x, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(.16, .025, .55), fita); f.position.set(x, -.03, .42); f.rotation.y = i ? -.35 : .35; selo.add(f); });
    return t => {
      folhas.forEach((f, i) => { const k = cl((t - (s.t + i * .16)) / .55); f.position.y = i * .085 + (1 - easeBack(k)) * 3.2; f.visible = k > 0; });
      const ks = cl((t - (s.t + .9)) / .45); selo.scale.setScalar(Math.max(.001, easeBack(ks)));
      grupo.rotation.y = -.22 + .2 * Math.sin(t * .7); grupo.rotation.x = .38 + .05 * Math.sin(t * .9);
      grupo.position.y = .08 * Math.sin(t * 1.3);
    };
  },

  lampada(s, { cena, cam }) {
    cam.position.set(0, .6, 7.6); cam.lookAt(0, .6, 0);
    const grupo = new THREE.Group(); cena.add(grupo);
    const perfil = [[0, 2.35], [.62, 2.27], [1.05, 1.98], [1.25, 1.55], [1.2, 1.08], [.95, .62], [.66, .22], [.55, -.08]];
    const seg = 10, aneis = perfil.map(([r, y], j) => Array.from({ length: seg }, (_, i) => { const a = i / seg * Math.PI * 2 + (j % 2) * Math.PI / seg; return new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)); }));
    const arestas = [];
    for (let j = 0; j < aneis.length; j++) for (let i = 0; i < seg; i++) {
      if (j > 0) arestas.push([aneis[j][i], aneis[j][(i + 1) % seg]]);
      if (j + 1 < aneis.length) { arestas.push([aneis[j][i], aneis[j + 1][i]]); arestas.push([aneis[j][i], aneis[j + 1][(i + (j % 2 ? 1 : seg - 1)) % seg]]); }
    }
    const amarelo = new THREE.MeshBasicMaterial({ color: '#FFC83D' });
    const tubo = new THREE.CylinderGeometry(.022, .022, 1, 6); tubo.translate(0, .5, 0);
    const inst = new THREE.InstancedMesh(tubo, amarelo, arestas.length); grupo.add(inst);
    const nos = aneis.flat();
    const bolas = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE08A' }), nos.length); grupo.add(bolas);
    const ordem = arestas.map((a, i) => ({ i, d: 2.35 - Math.max(a[0].y, a[1].y) + rnd() * .25 }));
    ordem.forEach(o => { o.d = (o.d / 2.7); });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    const base = new THREE.Group(); grupo.add(base);
    const ouro = new THREE.MeshPhysicalMaterial({ color: '#E8A825', metalness: .9, roughness: .28 });
    for (let k = 0; k < 4; k++) { const tr = new THREE.Mesh(new THREE.TorusGeometry(.5 - k * .03, .07, 12, 40), ouro); tr.rotation.x = Math.PI / 2; tr.position.y = -.2 - k * .17; base.add(tr); }
    const ponta = new THREE.Mesh(new THREE.CylinderGeometry(.22, .1, .2, 24), ouro); ponta.position.y = -.94; base.add(ponta);
    const brilho = new THREE.Mesh(new THREE.SphereGeometry(.75, 24, 16), new THREE.MeshBasicMaterial({ color: '#FFC83D', transparent: true, opacity: 0 })); brilho.position.y = 1.25; grupo.add(brilho);
    return t => {
      const k0 = (t - s.t) / 1.3;
      ordem.forEach(({ i, d }) => {
        const k = easeOut(cl((k0 - d * .7) / .3)); const [a, b] = arestas[i];
        v.subVectors(b, a); const L = v.length(); q.setFromUnitVectors(up, v.clone().normalize());
        m4.compose(a, q, new THREE.Vector3(k ? 1 : 0, Math.max(.0001, L * k), k ? 1 : 0)); inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
      nos.forEach((p, i) => { const k = cl((k0 - (2.35 - p.y) / 2.7 * .7) / .2); m4.compose(p, q.identity(), new THREE.Vector3(k, k, k)); bolas.setMatrixAt(i, m4); });
      bolas.instanceMatrix.needsUpdate = true;
      base.scale.setScalar(Math.max(.001, easeBack(cl((t - s.t - .9) / .5))));
      brilho.material.opacity = .22 * cl((t - s.t - 1.2) / .6) * (.8 + .2 * Math.sin(t * 6));
      grupo.rotation.y = t * .55; grupo.rotation.z = .08 * Math.sin(t * .8); grupo.position.y = .07 * Math.sin(t * 1.6);
    };
  },

  celular(s, { cena, cam }) {
    cam.position.set(0, .1, 8.6); cam.lookAt(0, 0, 0);
    const grupo = new THREE.Group(); cena.add(grupo);
    const corpo = new THREE.Mesh(new RoundedBoxGeometry(2.25, 4.6, .26, 6, .3), new THREE.MeshPhysicalMaterial({ color: '#141814', metalness: .6, roughness: .3, clearcoat: 1 }));
    grupo.add(corpo);
    const W = 520, H = 1080;
    const tela = textura(W, H, (g, t) => {
      const p = easeOut(cl((t - s.t - .7) / 1.6));
      g.fillStyle = '#0B0F0A'; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W * .8, 60, 0, W * .8, 60, 420); gr.addColorStop(0, 'rgba(62,242,58,.22)'); gr.addColorStop(1, 'rgba(62,242,58,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#9EA39F'; g.font = '700 22px Jak'; g.textAlign = 'left'; g.fillText('PORTAL MEDEASY', 44, 120);
      g.fillStyle = '#fff'; g.font = '800 46px Jak'; g.fillText('Seu currículo', 44, 180);
      const cx = W / 2, cy = 410, R = 140;
      g.lineCap = 'round'; g.lineWidth = 30; g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#3EF23A'; g.shadowColor = '#3EF23A'; g.shadowBlur = 24; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .78 * p); g.stroke(); g.shadowBlur = 0;
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 44px Jak'; g.fillText('Sua nota', cx, cy + 8);
      g.fillStyle = '#9EA39F'; g.font = '400 24px Jak'; g.fillText('por prova', cx, cy + 46);
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '800 34px Jak'; g.fillText('O que falta', 44, 660);
      [0, 1, 2].forEach(i => {
        const y = 700 + i * 112, ok = t > s.t + 2 + i * .45;
        g.fillStyle = 'rgba(255,255,255,.06)'; round(g, 44, y, W - 88, 88, 22); g.fill();
        g.fillStyle = ok ? '#3EF23A' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(92, y + 44, 20, 0, 7); g.fill();
        if (ok) { g.strokeStyle = '#0B0F0A'; g.lineWidth = 5; g.beginPath(); g.moveTo(82, y + 45); g.lineTo(90, y + 53); g.lineTo(104, y + 36); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.22)'; round(g, 132, y + 30, [230, 280, 200][i], 14, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; round(g, 132, y + 54, [150, 120, 170][i], 10, 5); g.fill();
      });
    });
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 4.26), new THREE.MeshBasicMaterial({ map: tela.tx, toneMapped: false }));
    vidro.position.z = .132; grupo.add(vidro);
    return t => {
      tela.upd(t);
      const k = easeOut(cl((t - s.t) / .8));
      grupo.position.y = -6 * (1 - k) + .06 * Math.sin(t * 1.4);
      grupo.rotation.y = -.42 + .5 * (1 - k) + .08 * Math.sin(t * .8); grupo.rotation.x = .1; grupo.rotation.z = .06;
    };
  },
};

/* ── blocos ────────────────────────────────────────────────────── */
const B = {
  head(c, s) { const h = el('div', 'head', c.dom); h.style.top = s.top + 'px'; if (s.size) h.style.fontSize = s.size + 'px'; frase(h, s.texto, s.t, s.passo || .16); },
  sub(c, s) { const e = el('div', 'sub', c.dom, s.texto); e.style.top = s.top + 'px'; anim(e, ENTRA, s.t, .5); evento(s.t, 'pop'); },
  tres(c, s) {
    const box = el('div', 'tres ' + s.obj, c.dom); box.style.top = s.y + 'px'; box.style.height = s.h + 'px';
    if (s.obj !== 'lampada') { const ch = el('div', 'chao', box); ch.style.top = (s.h * .8) + 'px'; anim(ch, [{ opacity: 0 }, { opacity: 1 }], s.t + .3, .6); }
    const p = palco(box, 1080, s.h);
    const upd = OBJ[s.obj](s, p);
    TRES.push(t => { if (t < c.t0 - .1 || t > c.t1 + .7) return; upd(t); p.r.render(p.cena, p.cam); });
    evento(s.t, 'whoosh'); evento(s.t + .9, 'impacto');
  },
  fichas(c, s) {
    const box = el('div', 'fichas', c.dom); box.style.top = s.y + 'px';
    const linhas = [[[120, 150], [90, 60], [140, 120], [70, 170], [110, 40]], [[100, 60], [130, 170], [80, 110], [120, 30], [90, 140]], [[140, 90], [70, 40], [110, 160], [100, 120], [130, 70]]];
    ['A', 'B', 'C'].forEach((n, i) => {
      const f = el('div', 'ficha', box, `<div class="tag">EDITAL</div><div class="tit">Prova ${n}</div>` + linhas[i].map(([a, b]) => `<div class="lin"><i style="width:${a}px"></i><b style="width:${b}px"></b></div>`).join(''));
      const rot = [-7, 0, 7][i], x = [40, 375, 710][i], y = [40, 0, 40][i];
      f.style.left = x + 'px'; f.style.top = y + 'px';
      const t = s.t + i * .22;
      anim(f, [{ opacity: 0, transform: `translateY(220px) rotate(${rot * 2}deg)` }, { opacity: 1, transform: `translateY(0) rotate(${rot}deg)` }], t, .6); evento(t, 'pop');
      [...f.querySelectorAll('.lin b')].forEach((b, j) => anim(b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], t + .55 + j * .12, .5));
    });
  },
  compara(c, s) {
    const box = el('div', 'compara', c.dom); box.style.top = s.y + 'px';
    const cert = el('div', 'cert', box, `<div class="ic"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#3EF23A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg></div><div><div class="t1">Seu certificado</div><div class="t2">um curso, um congresso...</div></div>`);
    anim(cert, ENTRA, s.t, .5); evento(s.t, 'pop');
    const r1 = el('div', 'ramo', box); r1.style.left = '300px'; r1.style.transform = 'rotate(28deg)';
    const r2 = el('div', 'ramo', box); r2.style.left = '774px'; r2.style.transform = 'rotate(-28deg)';
    anim(r1, [{ transform: 'rotate(28deg) scaleY(0)' }, { transform: 'rotate(28deg) scaleY(1)' }], s.t + .45, .35);
    anim(r2, [{ transform: 'rotate(-28deg) scaleY(0)' }, { transform: 'rotate(-28deg) scaleY(1)' }], s.t + .45, .35);
    const sim = el('div', 'prova sim', box, `<div class="n">PROVA A</div><div class="r"><svg width="62" height="62" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#3EF23A"/><path d="M19 33 l9 9 l18 -19" fill="none" stroke="#0B0F0A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>Soma</div>`);
    sim.style.left = '50px';
    const nao = el('div', 'prova nao', box, `<div class="n">PROVA B</div><div class="r"><svg width="62" height="62" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#FF4B3E"/><path d="M22 22 L42 42 M42 22 L22 42" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>Zero</div>`);
    nao.style.left = '620px';
    anim(sim, [{ opacity: 0, transform: 'scale(.7) translateY(40px)' }, { opacity: 1, transform: 'none' }], s.t + .8, .5); evento(s.t + .8, 'pop');
    anim(nao, [{ opacity: 0, transform: 'scale(.7) translateY(40px)' }, { opacity: 1, transform: 'none' }], s.t + 1.2, .5); evento(s.t + 1.2, 'risco');
  },
  checks(c, s) {
    const box = el('div', 'checks', c.dom); box.style.top = s.y + 'px';
    s.itens.forEach((it, i) => {
      const t = s.t + i * (s.passo || .7);
      const linha = el('div', 'ck', box, `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#3EF23A" stroke-width="5"/><path class="v" d="M19 33 l9 9 l18 -19" fill="none" stroke="#3EF23A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="40" stroke-dashoffset="40"/></svg><span>${it.replace(/\*(.+?)\*/g, '<span class="hl">$1</span>')}</span>`);
      anim(linha, [{ opacity: 0, transform: 'translateX(-70px)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], t, .45); evento(t, 'pop');
      anim(linha.querySelector('.v'), [{ strokeDashoffset: 40 }, { strokeDashoffset: 0 }], t + .25, .35);
    });
  },
  fim(c, s) {
    const f = el('div', 'fim', c.dom, `<img src="logo.png"><div class="a">Chama no <span>direct</span></div><div class="b">Currículo pra residência,<br>do edital à entrega.</div><div class="c">@med_easyy</div>`);
    [...f.children].forEach((k, i) => anim(k, ENTRA, s.t + i * .3, .55));
    evento(s.t, 'whoosh'); evento(s.t + .6, 'impacto');
  },
};

export function montar(VIDEO) {
  VIDEO.cenas.forEach((c, n) => {
    c.dom = el('div', 'cena ' + c.tema);
    el('div', 'fundo', c.dom);
    const g = el('div', 'grao', c.dom); g.style.backgroundImage = `url(${GRAO})`;
    GANCHOS.push(t => { g.style.transform = `translate(${(t * 977) % 256}px, ${(t * 613) % 256}px)`; });
    const prox = VIDEO.cenas[n + 1];
    if (n > 0) { // entra empurrando a cena anterior, como um cartão subindo
      anim(c.dom, [{ transform: 'translateY(1920px) scale(.96)', borderRadius: '80px' }, { transform: 'none', borderRadius: '0px' }], c.t0, .6, { easing: 'cubic-bezier(.7,0,.15,1)' });
      evento(c.t0, 'whoosh');
    }
    if (prox) {
      const sombra = el('div', 'sombra', c.dom);
      anim(c.dom, [{ transform: 'none', filter: 'blur(0)' }, { transform: 'scale(.86) translateY(-60px)', filter: 'blur(6px)' }], prox.t0, .6, { fill: 'forwards', easing: 'cubic-bezier(.7,0,.15,1)' });
      anim(sombra, [{ opacity: 0 }, { opacity: .55 }], prox.t0, .6, { fill: 'forwards' });
    }
    GANCHOS.push(t => { c.dom.style.visibility = (n > 0 && t < c.t0) || (prox && t > prox.t0 + .7) ? 'hidden' : 'visible'; });
    for (const b of c.blocos) B[b.tipo](c, b);
  });
  window.EVENTOS = EVENTOS.sort((a, b) => a.t - b.t);
  window.render = t => { for (const a of ANIMS) a.currentTime = t * 1000; for (const g of GANCHOS) g(t); for (const f of TRES) f(t); };
}
