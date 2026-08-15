// Script temporal — se borra al terminar la tarea. Vuelve a capturar los 35 juegos
// a 1280x720 y mide su luminancia media, para comparar CONTRA la tabla que ya se
// tomó antes de tocar nada y confirmar que sólo snake y peatón se movieron.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { leerPNG, valorDe } from './png.mjs';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = 8163;
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

const b = await chromium.launch({ channel: 'chrome', headless: true });
const filas = [];
for (const juego of Object.keys(paginas)) {
    const info = paginas[juego];
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    try {
        await p.goto(`http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7`
                    + (info.pagina === 'mesa.html' ? `&juego=${juego}` : ''),
                    { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(3500);
        const buf = await p.screenshot({ type: 'png' });
        const img = leerPNG(buf);
        let suma = 0, n = 0;
        for (let y = 0; y < img.alto; y += 3) {
            for (let x = 0; x < img.ancho; x += 3) {
                const o = (y * img.ancho + x) * img.canales;
                suma += valorDe([img.px[o], img.px[o + 1], img.px[o + 2]]);
                n++;
            }
        }
        filas.push({ juego, luminancia: +(suma / n).toFixed(1) });
    } catch (e) {
        filas.push({ juego, luminancia: null, error: String(e.message).slice(0, 60) });
    }
    await ctx.close();
}
filas.sort((a, b2) => (a.luminancia ?? -1) - (b2.luminancia ?? -1));
for (const r of filas) console.log(`  ${r.juego.padEnd(12)} ${String(r.luminancia ?? 'ERROR').padStart(6)}${r.error ? '  ' + r.error : ''}`);
await b.close();
s.kill();
