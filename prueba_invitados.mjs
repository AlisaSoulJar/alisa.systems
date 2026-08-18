/**
 * prueba_invitados.mjs — ¿saben los visualizadores propios dibujar en la mesa de otro?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * QUÉ ES SER INVITADO
 *
 * Sentarse a una mesa de la Sala del Huevo lleva a `arcade/sala.html`, que monta el
 * juego DENTRO de su escena: su mesa, su cámara, su luz, su bucle. Los visualizadores
 * propios se escribieron cuando cada juego tenía una página para él solo, así que
 * cada uno es dueño de todo — pone su cámara, monta sus controles, añade sus luces,
 * pinta su panel y le pregunta al hub por SU identificador.
 *
 * Dentro de la mesa de otro cada una de esas cinco cosas se rompe distinto, y eso se
 * midió: al enchufarlos de golpe el ajedrez dibujó su tablero y se quedó sin piezas
 * («SIN CONEXIÓN»: preguntaba por `chess` y la sala registra `ajedrez`), el póker
 * puso un tapete de tamaño de sala sin ninguna carta, y el mancala murió leyendo
 * `renderer.domElement`. O sea que «saben ser invitados» no se puede decir de todos
 * a la vez, y por eso `SABE_SER_INVITADO` es una lista corta que sólo crece cuando
 * esta prueba lo permite.
 *
 * QUÉ MIDE
 *
 * Para cada juego de la lista, abre su sala de bolsillo y comprueba TRES cosas, que
 * son las tres formas de fallar que ya hemos visto:
 *
 *   1. que no haya errores en la página;
 *   2. que las piezas del visualizador estén EN LA ESCENA de la sala — no basta con
 *      que el fichero cargue, que es lo que parecía antes de mirar;
 *   3. que el estado llegue: `legal_moves` no vacío. El ajedrez sin piezas tenía el
 *      tablero perfecto y cero jugadas, y esa es la diferencia entre un decorado y
 *      una partida.
 *
 * Y una cuarta que no es del invitado sino de la casa: que su página propia siga
 * funcionando. Enseñar a un visualizador a ser invitado no puede costarle el sitio
 * donde ya vivía.
 *
 * SABOTAJE DECLARADO
 *   · se le quita el alias de `chess` → el ajedrez de la sala se queda sin partida
 *     y esto tiene que decirlo
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PUERTO = 9081;
const { VISUALIZADOR, SABE_SER_INVITADO } =
    await import('./public/arcade/js/visualizadores.js');

const srv = spawn('python', ['servir.py', String(PUERTO)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${PUERTO}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 300)); }
}
const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
let fallos = 0;

console.log('\n¿Saben los visualizadores propios dibujar en la mesa de otro?\n');

if (!SABE_SER_INVITADO.size) {
    console.log('  (ninguno declarado todavía)');
}

for (const juego of SABE_SER_INVITADO) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message).slice(0, 70)));
    await p.goto(`http://127.0.0.1:${PUERTO}/arcade/sala.html?juego=${juego}`,
                 { waitUntil: 'load', timeout: 45000 });
    await new Promise(r => setTimeout(r, 9000));

    const m = await p.evaluate(() => {
        const a = window.ALISA_ANFITRION;
        const motor = window.ALISA_MOTOR;
        let mallas = 0;
        a?.grupo?.traverse(o => { if (o.isMesh) mallas++; });
        // El estado se pide por el id que use el motor, que puede no ser el del juego.
        const st = (() => {
            try { return window.ALISA_PROTOHUB.state(motor?.gameId ?? window.ALISA_JUEGO); }
            catch { return null; }
        })();
        return {
            invitado: !!motor?.invitado,
            sinRenderPropio: !motor?.renderer,
            mallas,
            jugadas: (st?.legal_moves ?? []).length,
        };
    });
    await p.close();

    const mal = [];
    if (errs.length) mal.push(errs[0]);
    if (!m.invitado) mal.push('el motor no se reconoce invitado');
    if (!m.sinRenderPropio) mal.push('se ha montado su propio renderizador');
    // Diez es el mínimo de cualquier tablero dibujado; por debajo está vacío.
    if (m.mallas < 10) mal.push(`sólo ${m.mallas} mallas en la mesa`);
    if (!m.jugadas) mal.push('sin jugadas legales: hay decorado pero no partida');

    if (mal.length) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(10)} ${VISUALIZADOR[juego]} — ${mal.join(' · ')}`);
    } else {
        console.log(`  ✓ ${juego.padEnd(10)} ${VISUALIZADOR[juego]} — `
                  + `${m.mallas} mallas en la mesa · ${m.jugadas} jugadas`);
    }

    // Y su página propia, que no puede haberse roto por el camino.
    const q = await ctx.newPage();
    const e2 = [];
    q.on('pageerror', e => e2.push(String(e.message).slice(0, 70)));
    // El nombre de la página no siempre es el del juego: el ajedrez vive en chess.html.
    const alias = { ajedrez: 'chess', damas: 'checkers' };
    await q.goto(`http://127.0.0.1:${PUERTO}/arcade/${alias[juego] ?? juego}.html`,
                 { waitUntil: 'load', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 7000));
    const viva = await q.evaluate(() => !!window.ALISA_MOTOR
        && !window.ALISA_MOTOR.invitado && !!window.ALISA_MOTOR.renderer).catch(() => false);
    await q.close();
    if (e2.length || !viva) {
        fallos++;
        console.log(`    ✗ y su página propia se ha roto: ${e2[0] ?? 'sin motor con renderizador'}`);
    }
}

await navegador.close();
srv.kill();

console.log(fallos === 0
    ? `\n✓ los ${SABE_SER_INVITADO.size} declarados dibujan dentro de la mesa de otro\n`
    : `\n✗ ${fallos} fallo(s): la sala de bolsillo enseñaría un decorado en vez de una partida\n`);
process.exit(fallos === 0 ? 0 : 1);
