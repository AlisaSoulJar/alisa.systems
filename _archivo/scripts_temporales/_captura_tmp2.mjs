// _captura_tmp2.mjs — verificación visual final. Va a _archivo/ al terminar.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = 8958;
const juego = process.argv[2] || 'blackjack';
const pagina = process.argv[3] || `${juego}.html`;
const destino = process.argv[4];

const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.goto(`${base}/arcade/${pagina}?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
await page.evaluate(() => document.querySelector('.hud-panel')?.classList.remove('collapsed'));
await page.waitForTimeout(400);
await page.screenshot({ path: destino });
await navegador.close();
servidor.kill();
console.log('listo:', juego, '->', destino);
