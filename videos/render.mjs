// node render.mjs m1            -> saida/<id>-mudo.mp4 e saida/<id>-eventos.json
// node render.mjs m1 previa 1,5  -> quadros soltos em saida/<id>-<t>.jpg
// Precisa de um servidor local na pasta (python3 -m http.server 8765), por causa dos módulos.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const [v, modo] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('ERRO', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto(`http://localhost:8765/index.html?v=${v}`);
await p.waitForFunction('window.PRONTO === true', null, { timeout: 60000 });
const dur = await p.evaluate('VIDEO.dur'), id = await p.evaluate('VIDEO.id');
fs.mkdirSync('saida', { recursive: true });
if (modo === 'previa') {
  for (const t of (process.argv[4] || '').split(',').map(Number)) {
    await p.evaluate(t => render(t), t);
    await p.screenshot({ path: `saida/${id}-${t}.jpg`, type: 'jpeg', quality: 82 });
  }
} else {
  fs.writeFileSync(`saida/${id}-eventos.json`, JSON.stringify({ dur, eventos: await p.evaluate('EVENTOS') }));
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', `saida/${id}-mudo.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * 30);
  for (let f = 0; f < n; f++) {
    await p.evaluate(t => render(t), f / 30);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(id, f, '/', n);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
