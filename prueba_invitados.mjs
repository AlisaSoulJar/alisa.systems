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

/**
 * Un sitio del tablero donde pinchar, en las coordenadas del PROPIO visualizador, y
 * qué campo del estado hace de testigo de que la partida avanzó.
 *
 * Va a mano y no se deduce: dónde está una casilla jugable depende de cómo cada
 * visualizador construyó su geometría, que es justo lo que no publica. Pero es corto
 * y explícito, y un juego sin entrada aquí SE DICE en voz alta en vez de aprobarse
 * por omisión.
 *
 * ⚠️ EL TESTIGO IMPORTA. Mi primera versión miraba `st.historial`, que mancala no
 * publica, así que dio «no pasó nada» en los dos sitios y estuve a punto de contarlo
 * como que el clic estaba roto. Se mira lo que el juego SÍ publica.
 */
const DONDE_PINCHAR = {
    // El hoyo 0 del jugador, en local. Lo dice el propio `mancala_visualizer.js`.
    mancala: { clics: [[-3.25, 0.2, 1.0]], testigo: 'board' },
    /**
     * ⚠️ EL AJEDREZ NECESITA DOS CLICS Y MI PRIMERA VERSIÓN DABA UNO.
     *
     * Se coge la pieza y se suelta en el destino. Con un solo clic el peón queda
     * seleccionado, el FEN no cambia y la prueba cantó «es un decorado» sobre un
     * ajedrez que se jugaba perfectamente. La prueba estaba jugando mal, no el juego.
     *
     * Las casillas salen de la cuenta que hace el propio visualizador y no de mi
     * intuición: `casillaDesde3D` es `file = round(x + 3.5)`, `rank = round(z + 3.5)`
     * y la casilla es `letra[file] + (8 - rank)`. Así que e2 es (0.5, 2.5) y e4 es
     * (0.5, 0.5).
     *
     * ⚠️ Y A RAS DE TABLERO, `y = 0.02`. Aquí perdí tres intentos.
     *
     * Apuntaba a `y = 0.6`, la altura de una pieza. Para coger el peón vale —el rayo
     * choca con la pieza— pero para SOLTAR en una casilla vacía el rayo atraviesa ese
     * punto y sigue hasta la madera, que está más lejos: con la cámara a unos 40°,
     * seiscientos milímetros de altura son setenta centímetros de más en el tablero,
     * o sea una casilla entera. Se soltaba en e5 queriendo e4, e5 no es legal desde
     * e2, y no pasaba nada.
     *
     * Y de paso: cambié DOS COSAS A LA VEZ —el número de clics y el signo de la z—
     * así que la primera corrección siguió en rojo por otro motivo y me costó otra
     * vuelta. Un cambio cada vez, o no se sabe cuál era.
     */
    ajedrez: { clics: [[0.5, 0.02, 2.5], [0.5, 0.02, 0.5]], testigo: 'fen' },
};

/**
 * Pincha los puntos declarados y dice si la partida avanzó. Vale igual dentro de la
 * mesa de otro que en la página propia, y eso es lo importante: es la MISMA medida en
 * los dos sitios, así que la diferencia entre ellos significa algo.
 */
async function pinchar(pagina, { clics, testigo }) {
    const sitio = await pagina.evaluate(({ clics, testigo }) => {
        const e = window.ALISA_MOTOR;
        e.scene.updateMatrixWorld(true);
        const l = e.lienzo.getBoundingClientRect();
        const aPantalla = (local) => {
            const v = new window.THREE.Vector3(...local)
                .applyMatrix4(e.scene.matrixWorld).project(e.camera);
            return [l.left + (v.x + 1) / 2 * l.width, l.top + (1 - v.y) / 2 * l.height];
        };
        return {
            puntos: clics.map(aPantalla),
            antes: JSON.stringify(window.ALISA_PROTOHUB.state(e.gameId)?.[testigo] ?? null),
        };
    }, { clics, testigo }).catch(() => null);
    if (!sitio) return null;

    for (const [x, y] of sitio.puntos) {
        await pagina.mouse.click(x, y);
        await new Promise(r => setTimeout(r, 700));
    }
    await new Promise(r => setTimeout(r, 1600));
    const despues = await pagina.evaluate((t) => JSON.stringify(
        window.ALISA_PROTOHUB.state(window.ALISA_MOTOR.gameId)?.[t] ?? null), testigo)
        .catch(() => null);
    return despues !== null && despues !== sitio.antes;
}

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
    /**
     * Y lo que de verdad importa: ¿se puede JUGAR? Un tablero dibujado con sus
     * jugadas listadas al lado sigue siendo un decorado si al pincharlo no pasa nada,
     * y ése es exactamente el estado en el que estuvo el ajedrez esta tarde.
     */
    const punto = DONDE_PINCHAR[juego];
    const jugable = punto ? await pinchar(p, punto) : null;
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
                  + `${m.mallas} mallas en la mesa · ${m.jugadas} jugadas`
                  + (jugable ? ' · se juega con el ratón' : ''));
    }
    // Un juego sin punto declarado se aprueba sin haber sido pinchado, y eso hay que
    // decirlo: una cobertura que no se nombra se lee como cobertura completa.
    if (!punto) {
        console.log(`    · ${juego}: sin punto en \`DONDE_PINCHAR\`, así que nadie ha`
                  + ` comprobado que se pueda jugar con el ratón`);
    }
    if (jugable === null && punto) {
        console.log(`    · no se ha podido pinchar: la sonda no encontró el motor`);
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

    /**
     * ⚠️ Y SI NO SE PUEDE JUGAR, HAY QUE SABER SI ES CULPA DE SER INVITADO.
     *
     * Aquí me pilló el ajedrez. La prueba lo puso en rojo por «se pincha y no pasa
     * nada», y la corrección natural era buscar qué le había hecho yo al meterlo en
     * la sala. No le había hecho nada: el clic de dos pasos del ajedrez —coger la
     * pieza, soltarla— tampoco completa en SU PROPIA PÁGINA, y `tacto` ya lo decía
     * desde antes («de los 8 que juegan a casillas, no responden: ajedrez, mancala,
     * canadiense»).
     *
     * Un fallo que existe en los dos sitios no lo causó la mudanza. Confundirlos
     * habría hecho que buscara la causa donde no está —que es media tarde— y que
     * además culpara a un cambio que no tiene culpa. Así que se mide en los dos y
     * sólo cuenta como fallo de invitado si el juego SÍ se juega en su casa.
     */
    let jugableEnCasa = null;
    if (punto && viva) jugableEnCasa = await pinchar(q, punto);
    await q.close();

    if (e2.length || !viva) {
        fallos++;
        console.log(`    ✗ y su página propia se ha roto: ${e2[0] ?? 'sin motor con renderizador'}`);
    }
    if (jugable === false && jugableEnCasa === true) {
        fallos++;
        console.log(`    ✗ se juega en su página y NO dentro de la mesa: lo rompió la mudanza`);
    } else if (jugable === false && jugableEnCasa === false) {
        console.log(`    · no se puede jugar con el ratón NI AQUÍ NI en su página propia:`
                  + ` es un fallo suyo de antes, no de ser invitado`);
    }
}

await navegador.close();
srv.kill();

console.log(fallos === 0
    ? `\n✓ los ${SABE_SER_INVITADO.size} declarados dibujan dentro de la mesa de otro\n`
    : `\n✗ ${fallos} fallo(s): la sala de bolsillo enseñaría un decorado en vez de una partida\n`);
process.exit(fallos === 0 ? 0 : 1);
