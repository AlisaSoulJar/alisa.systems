// captura_entropy_jugado.mjs — juega unas jugadas en entropy y saca una captura, para
// comprobar A OJO lo que bajo_el_panel.mjs ya midió en números.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const RAIZ = 'Q:\\alisa_project\\alisa\\World\\Synthesis\\Web\\alisa-systems';
const P = 8960;
const juego = process.argv[2] || 'entropy';
const destino = process.argv[3] || `Q:\\SystemRelief\\OscarTemp\\Active\\claude\\Q--\\248d4bf5-cde4-4dcd-902c-e80e4f2e9efa\\scratchpad\\captura_${juego}_jugado.png`;

const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.goto(`${base}/arcade/${juego}.html?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
await page.evaluate(() => document.querySelector('.hud-panel')?.classList.remove('collapsed'));
await page.waitForTimeout(400);

for (let i = 0; i < 4; i++) {
    const botones = page.locator('.mesa-jugada');
    const cuantos = await botones.count().catch(() => 0);
    if (!cuantos) break;
    await botones.first().click({ timeout: 3000 });
    await page.waitForTimeout(900);   // deja asentar la animación + la segunda pasada de encuadre
}

await page.screenshot({ path: destino });
await navegador.close();
servidor.kill();
console.log('listo:', juego, '->', destino);
