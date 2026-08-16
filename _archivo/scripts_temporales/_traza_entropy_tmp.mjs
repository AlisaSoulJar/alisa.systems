// traza_entropy.mjs — instrumento temporal: juega unas jugadas en entropy y vuelca
// window.__TRAZA tras cada clic, para ver POR QUÉ vuelve a taparse el descarte.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const RAIZ = 'Q:\\alisa_project\\alisa\\World\\Synthesis\\Web\\alisa-systems';
const P = 8958;
const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { window.__TRAZA = []; });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 300)));

await page.goto(`${base}/arcade/entropy.html?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
await page.evaluate(() => document.querySelector('.hud-panel')?.classList.remove('collapsed'));
await page.waitForTimeout(400);

const volcar = async (etiqueta) => {
    const traza = await page.evaluate(() => { const t = window.__TRAZA; window.__TRAZA = []; return t; });
    console.log(`\n── ${etiqueta} (${traza.length} eventos) ──`);
    for (const ev of traza) console.log('  ', JSON.stringify(ev));
};

await volcar('al abrir');

for (let i = 0; i < 4; i++) {
    const botones = page.locator('.mesa-jugada');
    const cuantos = await botones.count().catch(() => 0);
    if (!cuantos) { console.log(`\n(jugada ${i + 1}: sin botón que pulsar, se para)`); break; }
    await botones.first().click({ timeout: 3000 });
    await page.waitForTimeout(600);
    await volcar(`tras jugada ${i + 1}`);
}

await navegador.close();
servidor.kill();
process.exit(0);
