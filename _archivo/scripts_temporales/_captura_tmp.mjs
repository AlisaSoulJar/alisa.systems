// _captura_tmp.mjs — screenshot temporal para verificar el encuadre a ojo. Va a _archivo/ al terminar.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = 8957;
const juego = process.argv[2] || 'snake';
const pagina = process.argv[3] || `${juego}.html`;
const destino = process.argv[4] || `Q:\\SystemRelief\\OscarTemp\\Active\\claude\\Q--\\248d4bf5-cde4-4dcd-902c-e80e4f2e9efa\\scratchpad\\captura_${juego}.png`;

const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on('console', m => console.log('PAGE:', m.text()));
await page.goto(`${base}/arcade/${pagina}?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
await page.evaluate(() => document.querySelector('.hud-panel')?.classList.remove('collapsed'));
await page.waitForTimeout(400);
await page.screenshot({ path: destino });
await navegador.close();
servidor.kill();
console.log('listo:', juego, '->', destino);
