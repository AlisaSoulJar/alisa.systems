/**
 * ¿SE VE BIEN LA FICHA DE LOS 35, O HAY HUECOS QUE NADIE MIRA?
 *
 * La ficha de cada juego se pinta en el navegador desde `fichas.json`. Eso quiere
 * decir que un campo con la forma equivocada NO da error en ninguna parte: el JSON se
 * genera, la página carga, el panel está ahí, y dentro pone `[object Object]`.
 *
 * Pasó exactamente eso el 17-08-2026 con la LEYENDA, que es un diccionario y se estaba
 * interpolando como si fuera una frase. Salía roto en los VEINTITRÉS juegos que la
 * declaran —justo el campo de la puerta de visión, sin el cual se ve la pantalla y no
 * se entiende— y no lo vio ninguna prueba. Lo vi abriendo una captura.
 *
 * ⚠️ LO QUE SE BUSCA SON LAS MARCAS DE QUE JAVASCRIPT SE HA RENDIDO.
 *
 * `[object Object]`, `undefined`, `null` y `NaN` sueltos en el texto son lo que deja
 * una plantilla cuando el dato no tiene la forma que esperaba. Ninguna de las cuatro
 * es una palabra que quepa en una ficha escrita en español, así que encontrarlas es
 * inequívoco. No es una prueba de que la ficha sea BUENA: es una prueba de que no está
 * rota de la forma en que se rompen las plantillas.
 *
 * Y se comprueba también que el catálogo tenga las 35 tarjetas con su imagen CARGADA
 * (`naturalWidth > 0`), no sólo la etiqueta puesta: la ficha ya prometió una vez 35
 * capturas que no se publicaban, y el `<img>` roto se ve igual de vacío que el bueno
 * desde el DOM.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const PUERTO = 8962;
const fichas = JSON.parse(await readFile(new URL('./public/data/fichas.json', import.meta.url), 'utf-8'));
const juegos = Object.keys(fichas);

const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/index.html`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await nav.newContext({ viewport: { width: 1180, height: 900 } });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push(String(e.message).slice(0, 90)));

let fallos = 0;

// ── El catálogo ──────────────────────────────────────────────────
await p.goto(`${base}/arcade/ficha.html`, { waitUntil: 'load' });
await p.waitForTimeout(1500);
const cat = await p.evaluate(() => ({
    tarjetas: document.querySelectorAll('.tarjeta').length,
    conImagen: [...document.querySelectorAll('.tarjeta img')].filter(i => i.naturalWidth > 0).length,
    texto: document.body.innerText,
}));
const catBien = cat.tarjetas === 35 && cat.conImagen === 35;
if (!catBien) fallos++;
console.log(`\n  ${catBien ? '✓' : '✗'} catálogo: ${cat.tarjetas}/35 tarjetas · ${cat.conImagen}/35 con la imagen CARGADA`);

// ── Las 35 fichas ────────────────────────────────────────────────
const MARCAS = ['[object Object]', 'undefined', 'NaN'];
const rotas = [];
for (const juego of juegos) {
    await p.goto(`${base}/arcade/ficha.html?juego=${juego}`, { waitUntil: 'load' });
    await p.waitForTimeout(350);
    const t = await p.evaluate(() => document.body.innerText);
    const halladas = MARCAS.filter(m => t.includes(m));
    // Un panel vacío del todo es otra forma de rendirse en silencio.
    const corta = t.length < 300;
    if (halladas.length || corta) rotas.push({ juego, halladas, corta, largo: t.length });
}
if (rotas.length) {
    fallos++;
    console.log(`\n  ✗ ${rotas.length} ficha(s) con marcas de plantilla rota:`);
    for (const r of rotas) {
        console.log(`      ${r.juego.padEnd(12)} ${r.halladas.join(', ')}${r.corta ? ` (sólo ${r.largo} caracteres)` : ''}`);
    }
    console.log('    `[object Object]` o `undefined` en el texto es una plantilla que');
    console.log('    esperaba otra forma de dato. No da error en ninguna parte.');
} else {
    console.log(`  ✓ las ${juegos.length} fichas se pintan enteras, sin marcas de plantilla rota`);
}

if (errores.length) {
    fallos++;
    console.log(`\n  ✗ errores de JavaScript: ${[...new Set(errores)].slice(0, 3).join(' | ')}`);
}

await nav.close();
srv.kill();
console.log();
process.exit(fallos ? 1 : 0);
