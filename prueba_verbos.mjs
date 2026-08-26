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
 * ⚠️ POR QUÉ EL DENOMINADOR ES EL PANEL Y NO UNA LISTA DE JUEGOS CON VERBS.
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
import { readFile, writeFile } from 'node:fs/promises';

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
const desajustes = [];
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
            /**
             * ⚠️ Y LO QUE EL AGENTE RECIBE, PARA PODER COMPARARLO CON LO QUE SE VE.
             *
             * «El panel de jugadas es literalmente `legal_moves`» está escrito en cinco
             * comentarios de este proyecto y era la frase en la que se apoya el banco
             * entero: si las puertas no ofrecen lo mismo, comparar a una persona con un
             * agente deja de significar nada. No la medía nadie.
             */
            const st = window.ALISA_PROTOHUB?.state?.(window.ALISA_JUEGO) ?? {};
            const legales = (st.legal_moves ?? []).map(String);
            return { panel, verbos: panel.filter(esVerbo), barra, legales };
        });
    } catch { r = null; }
    await p.close();

    /**
     * ⚠️ LA PUERTA HUMANA Y LA DEL AGENTE, ¿OFRECEN LO MISMO?
     *
     * Se comparan las LISTAS y no los totales. Un panel al que le falte una jugada y le
     * sobre otra tiene el mismo número de botones, y ése es exactamente el caso que
     * importa: significa que una persona y un agente están jugando a cosas distintas
     * sin que nada dé error. `nueva` y `reset` se descuentan porque el panel las manda
     * a la pantalla de fin, que es otro sitio y a propósito.
     *
     * ⚠️ COMPROBADO CORTANDO EL CABLE: quitando una jugada del pintado de `jugadas.js`
     * (`legales.slice(1)`), parchís sale en rojo diciendo «no salen tirar». Y con el
     * mismo sabotaje snake seguía en verde, que NO es un fallo de esta prueba sino el
     * recordatorio de que hay TRES caminos de panel: cortar uno sólo prueba ése. Un
     * sabotaje aquí hay que hacerlo tres veces o no dice lo que parece.
     */
    if (r?.legales?.length) {
        const inter = (a, b) => a.filter(x => !b.includes(x));
        const leg = r.legales.filter(m => m !== 'nueva' && m !== 'reset');
        const pan = r.panel.filter(m => m !== 'nueva' && m !== 'reset');
        const faltanEnPanel = inter(leg, pan), sobranEnPanel = inter(pan, leg);
        if (faltanEnPanel.length || sobranEnPanel.length) {
            desajustes.push({ juego, faltanEnPanel, sobranEnPanel });
        }
    }

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
console.log(`\n  ${ok} con la barra puesta · ${mal} mal · ${mudos} no comprobables ahora`);

if (desajustes.length) {
    console.log(`\n  ✗ ${desajustes.length} juego(s) donde el panel NO es lo que recibe el agente:`);
    for (const d of desajustes) {
        const q = [d.faltanEnPanel.length ? `no salen ${d.faltanEnPanel.slice(0, 6).join(', ')}` : '',
                   d.sobranEnPanel.length ? `sobran ${d.sobranEnPanel.slice(0, 6).join(', ')}` : ''].filter(Boolean).join(' · ');
        console.log(`     ${d.juego.padEnd(12)} ${q}`);
    }
    console.log(`     Una persona y un agente estarían jugando a cosas distintas sin que nada dé error.`);
} else {
    console.log(`  ✓ en los ${filas.length} el panel ofrece EXACTAMENTE las jugadas legales del agente`);
}
/**
 * ⚠️ SE ESCRIBE LO MEDIDO, CON FECHA, Y SÓLO EN LA PASADA COMPLETA.
 *
 * La ficha de cada juego deriva lo que puede y de la barra de verbos no sabía nada.
 * Corriendo `node prueba_verbos.mjs snake` se guardaría un fichero con un juego y
 * treinta y cuatro huecos, que en la ficha se leerían como «sin verbos» — y eso es
 * poner un valor por defecto donde la verdad es «no lo he mirado».
 */
if (!pedidos.length) {
    const salida = {};
    for (const f of filas) {
        /**
         * ⚠️ `null`, NO CERO, CUANDO NO SE PUDO COMPROBAR.
         *
         * Escribir `verbos: 0` para un juego que en ese instante no ofrecía ninguno
         * hace que la ficha publique «este juego no tiene verbos», que es una
         * afirmación distinta y puede ser falsa: hearts no ofrece verbos al empezar la
         * mano y sí los tiene después. Cero es un dato; «no lo he mirado» es otro.
         */
        salida[f.juego] = f.estado === 'ok' || f.estado === 'MAL'
            ? { verbos: f.n, enLaBarra: f.estado === 'ok' }
            : { verbos: null, enLaBarra: null, nota: f.estado };
    }
    await writeFile(new URL('./public/data/verbos.json', import.meta.url), JSON.stringify({
        fecha: new Date().toISOString().slice(0, 10),
        panelEsLegalMoves: desajustes.length === 0,
        juegos: salida,
    }, null, 1));
    console.log(`  escrito public/data/verbos.json (${filas.length} juegos)\n`);
}

console.log();
process.exit(mal || desajustes.length ? 1 : 0);
