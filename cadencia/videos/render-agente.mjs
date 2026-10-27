import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const [modo, lista] = process.argv.slice(2);   // "previa 1,5,9" ou "video"
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('ERRO', e.message));
await p.goto(`file://${process.cwd()}/agente.html`);
await p.waitForFunction('window.PRONTO === true', null, { timeout: 30000 });
await p.evaluate(() => document.fonts.ready);
const dur = await p.evaluate('ROTEIRO.dur');
fs.mkdirSync('saida', { recursive: true });
if (modo === 'previa') {
  for (const t of lista.split(',').map(Number)) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `saida/agente-${t}.jpg`, type: 'jpeg', quality: 80 }); }
} else {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', 'saida/agente-mudo.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * 30);
  for (let f = 0; f < n; f++) {
    await p.evaluate(t => render(t), f / 30);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log('quadro', f, '/', n);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
