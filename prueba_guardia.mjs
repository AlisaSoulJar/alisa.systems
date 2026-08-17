/**
 * EL FSM DE GUARDIA — un jugador que no se aburre y no interpreta
 * ═══════════════════════════════════════════════════════════════════════════
 * Idea de Oscar: dejar autómatas jugando de betatester. Y tiene una ventaja que no
 * tenemos ni Motoko ni yo: **un FSM no tiene expectativas**, así que no «arregla»
 * mentalmente lo que ve raro. Entre las dos hemos dado tres falsos positivos en una
 * tarde justamente por interpretar; esto sólo registra.
 *
 * ⚠️ QUÉ PREGUNTA, Y POR QUÉ NO ES LO QUE YA PREGUNTA `calibrar`
 *
 * `calibrar` y `tabla` preguntan si el juego ORDENA a quien lo juega, que es una
 * propiedad estadística de muchas partidas. Esto pregunta si ALGO SE ROMPIÓ, que es una
 * propiedad de cada partida. Son dos preguntas distintas y hasta hoy sólo se hacía la
 * primera: un juego puede ordenar perfectamente a sus jugadores y estar rechazando una
 * de cada veinte jugadas legales sin que nadie se entere.
 *
 * Las cinco anomalías, y cada una es un fallo real que ya ha pasado aquí:
 *
 *   TIESA        sin jugadas legales y sin terminar. Le pasó a spades esta tarde con la
 *                subasta recién puesta, y a damas y xiangqi durante meses por no tener
 *                regla de tablas.
 *   RECHAZADA    `legal_moves` ofrece una jugada y `mover()` la rechaza. Ésta es la
 *                grande: «el panel es literalmente legal_moves» es la frase en la que se
 *                apoya el banco entero, y sólo se comprobaba en la PANTALLA — nunca en
 *                las miles de partidas de debajo.
 *   MUDA         el marcador no se mueve en toda la partida. Le pasó al ajedrez, a las
 *                damas y al xiangqi: valían 0 jugara quien jugara.
 *   NO_VERIFICA  una partida legítima que el verificador rechaza. Es el fallo más caro
 *                del banco, porque acusa de tramposo a quien juega limpio.
 *   AZAR_SUELTO  la misma semilla da dos partidas distintas. Sin esto no hay banco:
 *                da igual lo correctas que sean las reglas si nadie puede repetir tu
 *                partida.
 *
 * ⚠️ EN VERDE NO DICE NADA. Es a propósito: un instrumento que imprime una tabla bonita
 * cada vez se acaba mirando en diagonal. Éste calla y, cuando habla, da el juego, la
 * semilla y la jugada exacta — lo que hace falta para repetirlo, no para admirarlo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');

const args = process.argv.slice(2);
const num = (n, pd) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : pd; };
const PARTIDAS = num('--partidas', 20);
const TOPE = num('--tope', 400);
const pedidos = args.filter(a => !a.startsWith('-') && isNaN(Number(a)));
const juegos = pedidos.length ? pedidos : JUEGOS;

/**
 * ⚠️ LA AUTOPRUEBA: UN GUARDIA QUE CALLA TIENE QUE DEMOSTRAR QUE SABE HABLAR.
 *
 * Con `--autoprueba` se AVERÍAN cuatro juegos a propósito, uno por cada clase de
 * anomalía, y el guardia tiene que denunciar los cuatro. Si algún día un cambio en los
 * detectores los deja mudos, esto sale en rojo — y sin esto, «sin anomalías en 71.861
 * jugadas» podría significar «mis detectores no funcionan» y las dos frases se leerían
 * igual.
 *
 * Se avería el objeto de reglas EN MEMORIA, sin tocar ni un fichero: envolver es más
 * seguro que parchear, y no deja nada que restaurar si esto se muere a medias.
 *
 * ⚠️ Y las averías son las de VERDAD, las que ya pasaron aquí: damas y xiangqi sin poder
 * acabar, el panel ofreciendo jugadas que el juego rechaza, y ajedrez valiendo 0 en toda
 * partida jugara quien jugara.
 */
const AVERIAS = {
    ajedrez:  ['TIESA',      (r) => ({ ...r, estado: (p, a) => ({ ...r.estado(p, a), legal_moves: [], is_game_over: false }) })],
    damas:    ['RECHAZADA',  (r) => ({ ...r, estado: (p, a) => { const s = r.estado(p, a); return { ...s, legal_moves: [...(s.legal_moves ?? []), 'jugada_inventada'] }; },
                                       mover: (p, j) => (j === 'jugada_inventada' ? false : r.mover(p, j)) })],
    go:       ['MUDA',       (r) => ({ ...r, estado: (p, a) => ({ ...r.estado(p, a), puntos: 7, score: 7 }) })],
    snake:    ['AZAR_SUELTO',(r) => { let n = 0; return { ...r, estado: (p, a) => ({ ...r.estado(p, a), __ruido: n++ }) }; }],
};
const AUTOPRUEBA = args.includes('--autoprueba');
const averiar = (juego, reglas) => {
    const a = AVERIAS[juego];
    return a ? a[1](reglas) : reglas;
};

const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const anomalias = [];
const apunta = (juego, semilla, tipo, detalle) => anomalias.push({ juego, semilla, tipo, detalle });

console.log(`\n  ${juegos.length} juegos · ${PARTIDAS} partidas cada uno · tope ${TOPE}`);
console.log(gris('  en verde no dice nada; cuando habla, da juego, semilla y jugada\n'));

/**
 * ⚠️ «EL MARCADOR NO SE MUEVE» ES UNA PREGUNTA SOBRE EL JUEGO, NO SOBRE UNA PARTIDA.
 *
 * La primera versión lo preguntaba por partida y en los 35 juegos disparó 25 alarmas, en
 * brisca y tute. Todas ciertas y todas irrelevantes: en un juego de bazas se puede acabar
 * con cero puntos legítimamente si no te llevas nada que valga, y eso no es un fallo del
 * juego — es una mano mala.
 *
 * El fallo que este guardia debe cazar es el que tuvieron ajedrez, damas y xiangqi
 * durante meses: valer 0 SIEMPRE, jugara quien jugara y con cualquier semilla. Eso sólo
 * se ve juntando todas las partidas del juego. Preguntarlo por partida es el mismo error
 * de denominador de siempre, con el universo recortado a una mano.
 */
const porJuego = new Map();
let jugadas_totales = 0;
for (const juego of juegos) {
    porJuego.set(juego, new Set());
    let reglas;
    try { reglas = await cargarReglas(juego, {}); }
    catch (e) { apunta(juego, '—', 'NO_CARGA', String(e.message).slice(0, 70)); continue; }
    if (AUTOPRUEBA) reglas = averiar(juego, reglas);

    for (let s = 1; s <= PARTIDAS; s++) {
        let p;
        try { p = reglas.nuevaPartida({ semilla: s, seed: s }); }
        catch (e) { apunta(juego, s, 'NO_EMPIEZA', String(e.message).slice(0, 60)); continue; }

        const jugadas = [];
        const marcadores = new Set();
        let tiesa = false, sinMarcador = 0;

        for (let i = 0; i < TOPE; i++) {
            let st;
            try { st = reglas.estado(p); }
            catch (e) { apunta(juego, s, 'ESTADO_REVIENTA', String(e.message).slice(0, 60)); break; }

            /**
             * ⚠️ EL MARCADOR SE LLAMA DE TRES MANERAS, Y LEER MAL DA UN FALSO POSITIVO.
             *
             * En su primera pasada esto acusó a snake de tener el marcador mudo en las
             * cinco semillas. Era mentira: yo leía `puntos` y `score.white`, y snake
             * publica `score` como un número suelto. O sea que el fallo estaba en mi
             * lector, no en el juego — el mismo error de siempre, en el instrumento nuevo
             * y en su primer minuto de vida.
             *
             * Se prueban las tres formas que usan los 35, en orden.
             */
            const pts = Number.isFinite(st.puntos) ? st.puntos
                      : Number.isFinite(st.score) ? st.score
                      : Number.isFinite(st.score?.white) ? st.score.white
                      : null;
            if (pts === null) sinMarcador++;
            else marcadores.add(pts);
            if (st.is_game_over) break;

            const movs = (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset');
            if (!movs.length) { tiesa = true; break; }

            /**
             * ⚠️ AQUÍ ESTÁ LA COMPROBACIÓN QUE FALTABA EN TODO EL PROYECTO.
             *
             * Se coge una jugada de la lista y se exige que `mover()` la ACEPTE. Si la
             * lista ofrece algo que el juego rechaza, la promesa que sostiene el banco
             * —que el panel de una persona es la misma lista que recibe un agente— es
             * falsa en esa partida, y nadie se enteraría: el bucle simplemente probaría
             * otra jugada y seguiría.
             */
            /**
             * ⚠️ JUEGA EL RIVAL DE LA CASA, NO UN CONTADOR QUE ROTA.
             *
             * La primera versión elegía `movs[i % movs.length]`, y con eso la serpiente
             * de snake se retuerce en el sitio y muere en veintiuna jugadas SIN COMER
             * NADA. El marcador salía 0 en todas las semillas y el guardia lo denunciaba
             * como «MUDA» — cierto el dato y falsa la conclusión: el marcador puede
             * moverse perfectamente, es que ese jugador no puntuó.
             *
             * Un FSM de guardia tiene que jugar como un FSM, no como un contador. Con la
             * política de la casa, «el marcador no se mueve» vuelve a significar lo que
             * dice. Y una de cada cinco jugadas se elige rotando a propósito: así se
             * siguen ejerciendo jugadas raras de la lista, que es donde aparecen las
             * RECHAZADAS.
             */
            let elegida = null;
            if (i % 5 !== 4 && typeof reglas.sugerencia === 'function') {
                try { const g = reglas.sugerencia(p); if (g && movs.includes(String(g))) elegida = String(g); } catch { /* la casa puede no opinar */ }
            }
            if (!elegida) elegida = movs[i % movs.length];
            let ok;
            try { ok = reglas.mover(p, elegida); }
            catch (e) { apunta(juego, s, 'MOVER_REVIENTA', `${elegida}: ${String(e.message).slice(0, 50)}`); break; }
            if (!ok) { apunta(juego, s, 'RECHAZADA', `ofrecia '${elegida}' y mover() la rechaza`); break; }
            jugadas.push(elegida);
            jugadas_totales++;
        }

        if (tiesa) apunta(juego, s, 'TIESA', `${jugadas.length} jugadas y se queda sin jugadas legales sin terminar`);
        /**
         * ⚠️ «NO SE MUEVE» Y «NO LO ENCUENTRO» SON DOS ANOMALÍAS, NO UNA.
         *
         * La primera versión las juntaba: con el marcador ilegible el conjunto quedaba
         * vacío, `size <= 1` se cumplía, y salía «el marcador vale siempre undefined».
         * Eso acusa al juego de un fallo que es del lector. Un instrumento que no
         * distingue lo que no puede leer de lo que ha leído mal es el que más tiempo
         * hace perder, porque manda a mirar el sitio equivocado.
         */
        if (jugadas.length > 3 && sinMarcador > 0 && marcadores.size === 0) {
            apunta(juego, s, 'MARCADOR_ILEGIBLE', `no publica puntos ni score en ${jugadas.length} jugadas`);
        }
        // El marcador mudo se juzga POR JUEGO, más abajo. Ver la nota de `porJuego`.
        for (const v of marcadores) porJuego.get(juego).add(v);

        // ¿Se puede volver a jugar? Es la tesis del banco, partida por partida.
        if (jugadas.length) {
            try {
                const recibo = { juego, semilla: s, jugadas };
                if (reglas.NORMAS) recibo.normas = reglas.NORMAS;
                const v = verificar(reglas, recibo);
                if (v.valida !== true) apunta(juego, s, 'NO_VERIFICA', v.motivo ?? 'el verificador la rechaza');
            } catch (e) { apunta(juego, s, 'VERIFICAR_REVIENTA', String(e.message).slice(0, 60)); }
        }

        /**
         * Y el azar suelto: la misma semilla tiene que dar la misma partida. Se re-juega
         * la misma lista desde cero y se compara el estado final. Un `Math.random()`
         * escondido en el rival de casa ya se cazó dos veces en este proyecto —ajedrez y
         * xiangqi— y no daba ningún error: daba partidas distintas con la misma semilla.
         */
        if (jugadas.length > 2) {
            try {
                const q = reglas.nuevaPartida({ semilla: s, seed: s });
                for (const m of jugadas) if (!reglas.mover(q, m)) break;
                const a = JSON.stringify(reglas.estado(p));
                const b = JSON.stringify(reglas.estado(q));
                if (a !== b) apunta(juego, s, 'AZAR_SUELTO', 'la misma semilla y las mismas jugadas dan otro estado');
            } catch { /* si revienta, ya lo dijo otra anomalía */ }
        }
    }
    process.stdout.write(gris('.'));
}

// Ahora sí: un juego cuyo marcador no se mueve en NINGUNA de sus partidas.
for (const [juego, vistos] of porJuego) {
    if (vistos.size === 1) {
        apunta(juego, 'todas', 'MUDA',
            `el marcador vale ${[...vistos][0]} en las ${PARTIDAS} partidas: no distingue a nadie`);
    }
}

console.log('\n');

/**
 * En autoprueba el veredicto se invierte: lo que se comprueba es que las CUATRO averías
 * se hayan denunciado, cada una con su nombre y en su juego. Que salgan «algunas» no
 * vale: un detector roto se esconde perfectamente detrás de los otros tres.
 */
if (AUTOPRUEBA) {
    let faltan = 0;
    for (const [juego, [tipo]] of Object.entries(AVERIAS)) {
        const cazada = anomalias.some(a => a.juego === juego && a.tipo === tipo);
        if (!cazada) faltan++;
        console.log(`  ${cazada ? verde('✓') : rojo('✗')} ${tipo.padEnd(12)} averiado en ${juego}`
            + (cazada ? '' : rojo('  ← EL DETECTOR NO LO VE')));
    }
    console.log(`\n  ${faltan === 0
        ? verde('los cuatro detectores saben hablar')
        : rojo(`${faltan} detector(es) mudos — el verde de este guardia no valdría nada`)}\n`);
    process.exit(faltan ? 1 : 0);
}

if (!anomalias.length) {
    console.log(`  ${verde('sin anomalías')} — ${jugadas_totales.toLocaleString()} jugadas en ${juegos.length * PARTIDAS} partidas\n`);
    process.exit(0);
}

// Agrupadas por tipo, porque veinte líneas del mismo fallo no son veinte fallos.
const porTipo = new Map();
for (const a of anomalias) {
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, []);
    porTipo.get(a.tipo).push(a);
}
console.log(`  ${rojo(`${anomalias.length} anomalía(s)`)} en ${jugadas_totales.toLocaleString()} jugadas\n`);
for (const [tipo, lista] of porTipo) {
    console.log(`  ${rojo(tipo)} (${lista.length})`);
    for (const a of lista.slice(0, 4)) {
        console.log(`      ${a.juego} semilla ${a.semilla}: ${a.detalle}`);
    }
    if (lista.length > 4) console.log(gris(`      y ${lista.length - 4} más`));
}
console.log(gris('\n  Para repetir una: node prueba_guardia.mjs <juego> --partidas 1\n'));
process.exit(1);
