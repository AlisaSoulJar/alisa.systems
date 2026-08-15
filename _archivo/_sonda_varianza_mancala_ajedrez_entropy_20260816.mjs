// Script temporal — comprueba si mancala/ajedrez/entropy varían solos entre pasadas
// (animaciones, temporizadores) antes de sospechar de un efecto compartido.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { leerPNG, valorDe } from './png.mjs';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = 8165;
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const b = await chromium.launch({ channel: 'chrome', headless: true });

for (const juego of ['mancala', 'ajedrez', 'entropy']) {
    const info = paginas[juego];
    for (let intento = 1; intento <= 3; intento++) {
        const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
        const p = await ctx.newPage();
        await p.goto(`http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7`, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(3500);
        const buf = await p.screenshot({ type: 'png' });
        const img = leerPNG(buf);
        let suma = 0, n = 0;
        for (let y = 0; y < img.alto; y += 3) for (let x = 0; x < img.ancho; x += 3) {
            const o = (y * img.ancho + x) * img.canales;
            suma += valorDe([img.px[o], img.px[o + 1], img.px[o + 2]]);
            n++;
        }
        console.log(`  ${juego.padEnd(10)} intento ${intento}: ${(suma / n).toFixed(2)}`);
        await ctx.close();
    }
}
await b.close();
s.kill();
