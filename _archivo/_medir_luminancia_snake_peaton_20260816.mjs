// Script temporal de medición — se borra al terminar la tarea.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { leerPNG, valorDe } from './png.mjs';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = 'Q:/SystemRelief/OscarTemp/Active/claude/Q--/248d4bf5-cde4-4dcd-902c-e80e4f2e9efa/scratchpad/';
const P = 8161;

const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}

const juegos = process.argv.slice(2).length ? process.argv.slice(2) : ['snake', 'peaton'];
const paginas = { snake: 'snake.html', peaton: 'peaton.html' };
const FORMAS = [
    { nombre: 'ancho', width: 1280, height: 720 },
    { nombre: 'movil', width: 390, height: 844 },
];

const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const juego of juegos) {
    for (const forma of FORMAS) {
        const ctx = await b.newContext({ viewport: { width: forma.width, height: forma.height } });
        const p = await ctx.newPage();
        await p.goto(`http://127.0.0.1:${P}/arcade/${paginas[juego]}?semilla=7`, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(3500);
        const buf = await p.screenshot({ type: 'png' });
        await writeFile(`${OUT}${juego}_${forma.nombre}.png`, buf);
        const img = leerPNG(buf);
        let suma = 0, n = 0;
        for (let y = 0; y < img.alto; y += 3) {
            for (let x = 0; x < img.ancho; x += 3) {
                const o = (y * img.ancho + x) * img.canales;
                suma += valorDe([img.px[o], img.px[o + 1], img.px[o + 2]]);
                n++;
            }
        }
        console.log(`  ${juego.padEnd(8)} ${forma.nombre.padEnd(6)} luminancia media = ${(suma / n).toFixed(1)}`);
        await ctx.close();
    }
}
await b.close();
s.kill();
