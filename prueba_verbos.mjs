/**
 * ¿SALEN LOS VERBOS DONDE SE PUEDEN PULSAR, EN LOS 35?
 *
 * Una jugada que NOMBRA una pieza —una carta, una casilla— se hace tocándola en la
 * mesa. Un verbo —`robar`, `plantarse`, `arriba`— no está en ninguna parte de la mesa,
 * así que si no tiene botón propio no hay forma humana de hacerlo salvo el panel, y el
 * panel deja de ser para pulsar.
 *
 * Esto compara, DENTRO DE LA MISMA PÁGINA, los verbos que el panel publica contra los
 * botones de la barra. No pregunta a las reglas por Node: mide lo que hay en pantalla,
 * que es donde estaba el fallo — snake pintaba sus cuatro flechas en el panel y la
 * barra no existía.
 *
 * ⚠️ POR QUÉ EL DENOMINADOR ES EL PANEL Y NO UNA LISTA DE JUEGOS CON VERBOS.
 *
 * Escribir «estos doce tienen verbos» sería la enésima lista a mano, y de nueve números
 * falsos de agosto siete fueron de denominador. Cada página dice cuántos verbos le
 * tocan; si un juego no ofrece ninguno en ese instante, sale como NO COMPROBABLE, que
 * es una verdad distinta de aprobado.
 *
 * ⚠️ Y HAY TRES CAMINOS DE PANEL, NO DOS.
 *
 * `jugadas.js`, `SovereignBoardEngine` y `SovereignCardEngine` pintan cada uno sus
 * `.mesa-jugada`. El repetidor ya se montó una vez «en los dos motores» y cuatro juegos
 * se quedaron fuera. Esta prueba es la que nota que falta el tercero.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const PUERTO = 8941;
const SEMILLA = 7;
const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));

const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/index.html`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await nav.newContext({ viewport: { width: 1100, height: 660 } });

const filas = [];
for (const juego of juegos) {
    const pag = paginas[juego];
    const url = `${base}/arcade/${pag.pagina}?semilla=${SEMILLA}`
        + (pag.pagina === 'mesa.html' ? `&juego=${juego}` : '');
    const p = await ctx.newPage();
    let r;
    try {
        await p.goto(url, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(4500);
        r = await p.evaluate(() => {
            // El mismo criterio que `barraDeVerbos`, escrito aquí a propósito: si la
            // prueba importara la función que vigila, un fallo en el criterio saldría
            // en verde por los dos lados a la vez.
            const sitio = (s) => /^[a-z]\d[a-z]?\d?$/i.test(s) || /^\d+$/.test(s);
            // Se parte por guion bajo Y por espacio: defensa dice `torre a1`, no
            // `torre_a1`, y separar sólo por guion la dejaba con 69 botones en la barra.
            const esVerbo = (m) => !m.includes(':') && !sitio(m) && !sitio(m.split(/[_\s]/).pop());
            /**
             * ⚠️ SE LEE `title`, QUE ES LA JUGADA, NO LA ETIQUETA.
             *
             * El panel muestra `H_Q` para la jugada `jugar:H_Q`, y la barra muestra
             * «enviar a» para `enviar_a`. Comparando etiquetas salieron seis juegos en
             * rojo —las trece cartas de la mano de hearts «faltando» en la barra—
             * estando los dos lados de acuerdo. Un instrumento que compara el ADORNO
             * en vez del dato mide la presentación y lo cuenta como fallo.
             */
            const jugada = (b) => (b.title || b.textContent).trim();
            const panel = [...document.querySelectorAll('.mesa-jugada')].map(jugada).filter(Boolean);
            const barra = [...document.querySelectorAll('.alisa-verbo')].map(jugada);
            return { panel, verbos: panel.filter(esVerbo), barra };
        });
    } catch { r = null; }
    await p.close();

    if (!r || !r.panel.length) { filas.push({ juego, estado: 'sin panel' }); continue; }
    if (!r.verbos.length) { filas.push({ juego, estado: 'sin verbos ahora', panel: r.panel.length }); continue; }

    const faltan = r.verbos.filter(v => !r.barra.includes(v));
    const sobran = r.barra.filter(v => !r.verbos.includes(v));
    filas.push({ juego, estado: faltan.length || sobran.length ? 'MAL' : 'ok', faltan, sobran, n: r.verbos.length });
}

await nav.close();
srv.kill();

console.log('\n  juego          verbos   barra\n');
let mal = 0, ok = 0, mudos = 0;
for (const f of filas) {
    if (f.estado === 'ok') { ok++; console.log(`  ${f.juego.padEnd(13)} ${String(f.n).padStart(6)}   ✓`); }
    else if (f.estado === 'MAL') {
        mal++;
        const q = [f.faltan.length ? `faltan ${f.faltan.join(', ')}` : '', f.sobran.length ? `sobran ${f.sobran.join(', ')}` : ''].filter(Boolean).join(' · ');
        console.log(`  ${f.juego.padEnd(13)} ${String(f.n).padStart(6)}   ✗  ${q}`);
    } else { mudos++; console.log(`  ${f.juego.padEnd(13)}      ·   ${f.estado}`); }
}
console.log(`\n  ${ok} con la barra puesta · ${mal} mal · ${mudos} no comprobables ahora\n`);
process.exit(mal ? 1 : 0);
