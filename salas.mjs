/**
 * salas.mjs — ¿funcionan las mesas compartidas, juego por juego?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run salas          los que admiten dos sillas
 *     npm run salas ajedrez  sólo ése
 *
 * ⚠️ SE MIDE CON DOS NAVEGADORES, NO MIRANDO EL CÓDIGO.
 *
 * Los tres caminos de montaje tienen la llamada a `crearSala`, y eso no significa
 * nada: ya me equivoqué dos veces dando esto por bueno. Una vez comparando las
 * vistas de dos asientos —que son distintas A PROPÓSITO, porque hay información
 * oculta— y otra buscando el motor en `window` en juegos que no lo publican.
 *
 * Lo único que prueba que dos personas están en la misma partida es que UNA JUEGUE
 * Y LA OTRA LO VEA. Eso es lo que se mide aquí: se abren dos pestañas en la misma
 * sala, la primera manda una jugada legal, y se mira si a la segunda le sube el
 * contador de jugadas.
 *
 * Se comprueba el CONTADOR y no el tablero: dos asientos ven tableros distintos en
 * los juegos con información oculta, pero el número de jugadas de la partida es uno
 * solo y es público. Es el dato que significa «estamos en la misma mesa».
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8161;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
// Sólo tiene sentido en los que admiten más de una silla.
const juegos = (pedidos.length ? pedidos : Object.keys(paginas))
    .filter(j => paginas[j] && (paginas[j].sillas ?? 1) >= 2);

const b = await chromium.launch({ channel: 'chrome', headless: true });
console.log(`\n¿Se ven dos personas en la misma mesa?  (${juegos.length} juegos con dos o más sillas)\n`);
const malos = [];

for (const juego of juegos) {
    const sala = `p${Math.random().toString(36).slice(2, 8)}`;
    const url = (yo) => `http://127.0.0.1:${P}/arcade/${paginas[juego].pagina}`
                      + `?juego=${juego}&sala=${sala}&yo=${yo}`;
    const uno = await b.newPage({ viewport: { width: 900, height: 650 } });
    const dos = await b.newPage({ viewport: { width: 900, height: 650 } });
    let queja = null;
    try {
        await uno.goto(url('ana'), { waitUntil: 'load', timeout: 25000 });
        await dos.goto(url('bea'), { waitUntil: 'load', timeout: 25000 });
        await uno.waitForTimeout(6000);
        await dos.waitForTimeout(1000);

        /** Cuántas jugadas lleva la partida, según esta pestaña. */
        const jugadas = (p) => p.evaluate(async () => {
            const m = window.ALISA_SALA ?? window.ALISA_MESA?.backend ?? null;
            if (m?.estado) { await m.refrescar?.(); const st = m.estado(); return st?.jugadas?.length ?? st?.turnos ?? -1; }
            return -2;   // -2 = esta pestaña no sabe que está en una sala
        });

        const antes = await jugadas(dos);
        if (antes === -2) { queja = 'la segunda pestaña no entró en la sala'; }
        else {
            /**
             * ⚠️ JUEGA LA QUE TENGA EL TURNO, NO SIEMPRE LA PRIMERA.
             *
             * Mi primera versión jugaba con `ana` y daba «nadie tenía jugadas
             * legales» en damas y en brisca. No era el juego: era que le tocaba a la
             * otra silla, que es exactamente lo que debe pasar en una mesa de dos.
             * Acusar a un juego por no dejarme jugar fuera de mi turno habría sido
             * la quinta medida falsa del día.
             */
            const mover = async (p) => p.evaluate(async () => {
                const m = window.ALISA_SALA ?? window.ALISA_MESA?.backend ?? null;
                if (!m?.acciones) return false;
                const a = m.acciones();
                if (!a?.length) return null;
                await m.jugar(a[0]);
                return a[0];
            });
            let jugo = await mover(uno);
            let miron = dos;
            if (jugo === null) { jugo = await mover(dos); miron = uno; }
            if (jugo === null) jugo = 'sin jugadas';
            if (jugo === false) queja = 'la primera pestaña no entró en la sala';
            else if (jugo === 'sin jugadas') queja = 'nadie tenía jugadas legales';
            else {
                await miron.waitForTimeout(2500);
                const despues = await jugadas(miron);
                if (!(despues > antes)) queja = `una jugó (${jugo}) y la otra sigue en ${despues}`;
            }
        }
    } catch (e) {
        queja = String(e.message).split('\n')[0].slice(0, 50);
    }
    if (queja) malos.push(juego);
    console.log(`  ${queja ? '✗' : '✓'} ${juego.padEnd(11)} ${queja ?? 'lo que juega una, la otra lo ve'}`);
    await uno.close(); await dos.close();
}

console.log(`\n  ${juegos.length - malos.length}/${juegos.length} salas compartidas funcionando`);
if (malos.length) console.log(`  fallan: ${malos.join(', ')}`);
await b.close();
s.kill();
