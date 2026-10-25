import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const [v, modo] = process.argv.slice(2);           // modo: "previa" tira quadros soltos
const exe = '/opt/pw-browsers/chromium';
const b = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('ERRO', e.message));
await p.goto(`file://${process.cwd()}/index.html?v=${v}`);
await p.waitForFunction('window.PRONTO === true', null, { timeout: 30000 });
const dur = await p.evaluate('VIDEO.dur'), id = await p.evaluate('VIDEO.id');
fs.mkdirSync('saida', { recursive: true });
if (modo === 'previa') {
  const ts = (process.argv[4] || '').split(',').map(Number);
  for (const t of ts) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `saida/${id}-${t}.jpg`, type: 'jpeg', quality: 80 }); }
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
