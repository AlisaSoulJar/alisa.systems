/**
 * ¿QUÉ JUGADAS SE PUEDEN HACER CON EL DEDO, JUEGO POR JUEGO?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El panel de jugadas es la lista LITERAL que recibe un agente por la puerta de
 * texto, y eso no se toca: es lo que hace comparables las dos filas de la tabla
 * del banco. Pero una persona en un móvil no quiere leer catorce botones — quiere
 * tocar la carta. La pregunta es cuánto de eso funciona ya.
 *
 * ⚠️ NO SE MIRA EL CÓDIGO, SE TOCA LA PANTALLA.
 *
 * Cada juego tiene su visualizador y algunos son propios; leer sus manejadores
 * daría una respuesta por fichero y ninguna comparable. Así que se toca a ciegas,
 * como haría un dedo: una cuadrícula de puntos sobre el lienzo, tap de verdad
 * (`touchscreen.tap`, no un clic de ratón disfrazado), y se recoge lo que sale.
 *
 * `sendMove` se intercepta para GRABAR Y NO ENVIAR. Si dejáramos jugar, el primer
 * toque cambiaría el estado y los siguientes ya estarían respondiendo a otra
 * partida: saldría una lista de jugadas que nunca fueron legales a la vez.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8137;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const b = await chromium.launch({ channel: 'chrome', headless: true });

// Una pantalla de móvil de verdad, con dedo. 390x844 es un iPhone corriente.
const MOVIL = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
                deviceScaleFactor: 2 };

const soloEstos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (soloEstos.length ? soloEstos : Object.keys(paginas)).filter(j => paginas[j]);

console.log('\n¿Qué jugadas llegan con el dedo?  (móvil 390x844, toque real)\n');
const filas = [];

for (const juego of juegos) {
    const ctx = await b.newContext(MOVIL);
    const p = await ctx.newPage();
    const url = `http://127.0.0.1:${P}/arcade/${paginas[juego].pagina}?semilla=7`
              + (paginas[juego].pagina === 'mesa.html' ? `&juego=${juego}` : '');
    try {
        await p.goto(url, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(4500);   // que termine de repartir

        /**
         * ⚠️ SE PINCHA `ALISA_PROTOHUB.move`, NO EL `sendMove` DE CADA MOTOR.
         *
         * Empecé por `sendMove` y me quedé sin medir la mitad: los visualizadores
         * propios (ajedrez, go, mancala…) no exponen su motor en `window`, así que
         * salía «no medible» en un montón de juegos que sí se pueden tocar.
         *
         * `hub.move` es por donde pasan LOS 35 —es el mismo punto que usa
         * `laboratorio_mesas.mjs`, que ya los cubre enteros— y además es el punto
         * donde se sabe que una jugada iba en serio.
         */
        const datos = await p.evaluate(async () => {
            const hub = window.ALISA_PROTOHUB;
            if (!hub) return null;
            const clave = window.ALISA_JUEGO ?? [...(hub.reglas?.keys?.() ?? [])][0];
            const st = await hub.state(clave);
            window.__tocadas = [];
            const orig = hub.move.bind(hub);
            // ⚠️ LA JUGADA VIENE DENTRO DE UN OBJETO, NO COMO CADENA.
            //
            // La firma es `move(juegoId, accion)` con `accion = {action:'move',
            // params:{action: 'robar_descarte'}}`. Yo grababa `a[1]` a secas y me
            // salía «[object Object]» — que no coincide con ninguna jugada legal,
            // así que los 35 juegos daban 0% y parecía que el táctil no existía.
            // Existía: el roto era esta línea.
            const jugadaDe = (acc) => (typeof acc === 'string' ? acc
                : acc?.params?.action ?? acc?.params?.jugada ?? acc?.action ?? null);
            // Graba y NO juega: devuelve el estado de ahora para no romper el repintado.
            hub.move = (...a) => {
                const j = jugadaDe(a[1]);
                if (j && j !== 'move') window.__tocadas.push(String(j));
                return Promise.resolve(st);
            };
            return { legales: (st.legal_moves ?? st.legal_actions ?? [])
                        .filter(m => m !== 'nueva' && m !== 'reset').map(String) };
        });

        if (!datos) {
            console.log(`  ? ${juego.padEnd(11)} la página no registró ALISA_PROTOHUB`);
            filas.push({ juego, medible: false });
            await ctx.close();
            continue;
        }
        const legales = datos.legales;

        // La cuadrícula de dedos. Se evita la franja de arriba, donde vive el panel.
        const { width: W, height: H } = MOVIL.viewport;
        const COLS = 9, FILS = 11, ARRIBA = 150;
        for (let cx = 0; cx < COLS; cx++) {
            for (let cy = 0; cy < FILS; cy++) {
                const x = Math.round((cx + 0.5) * W / COLS);
                const y = Math.round(ARRIBA + (cy + 0.5) * (H - ARRIBA) / FILS);
                await p.touchscreen.tap(x, y);
            }
        }
        await p.waitForTimeout(300);
        const tocadas = [...new Set(await p.evaluate(() => window.__tocadas ?? []))];

        const legalesSet = new Set(legales.map(String));
        const alcanzables = tocadas.filter(m => legalesSet.has(m));
        const pct = legales.length ? Math.round(100 * alcanzables.length / legales.length) : null;
        filas.push({ juego, medible: true, legales: legales.length,
                     alcanzables: alcanzables.length, pct, tocadas: tocadas.length,
                     ejemplos: legales.filter(m => !tocadas.includes(String(m))).slice(0, 3) });

        const marca = pct === null ? '·' : pct === 0 ? '✗' : pct === 100 ? '✓' : '~';
        console.log(`  ${marca} ${juego.padEnd(11)} ${String(alcanzables.length).padStart(2)}/${String(legales.length).padEnd(2)} jugadas con el dedo`
            + (pct === null ? '  (sin jugadas legales ahora)' : `  ${String(pct).padStart(3)}%`)
            + (pct === 0 && legales.length ? `   ⚠ SOLO PANEL` : ''));
    } catch (e) {
        console.log(`  ! ${juego.padEnd(11)} ${String(e.message).split('\n')[0].slice(0, 60)}`);
        filas.push({ juego, medible: false });
    }
    await ctx.close();
}

// ── El resumen, que es lo que se mira ──
const med = filas.filter(f => f.medible && f.legales > 0);
const solo = med.filter(f => f.pct === 0);
const todo = med.filter(f => f.pct === 100);
console.log(`\n  ${med.length} juegos medidos con jugadas legales`);
console.log(`  ${todo.length} llegan enteros con el dedo · ${med.length - todo.length - solo.length} a medias · ${solo.length} SOLO POR PANEL`);
if (solo.length) console.log(`  solo panel: ${solo.map(f => f.juego).join(', ')}`);

await b.close();
s.kill();
