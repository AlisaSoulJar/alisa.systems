/**
 * calibrar.mjs — ¿miden algo estos entornos?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node calibrar.mjs [semillas]      → 0 todo bien · 1 algo no mide
 *
 * POR QUÉ EXISTE
 * Que un juego se ejecute, sea determinista y se verifique **no significa que
 * mida nada**. Un entorno mide cuando el resultado depende de quién juega. Si
 * una política tonta y una razonable sacan lo mismo, ese entorno no es una
 * prueba: es un generador de números.
 *
 * Casi todos los bancos de pruebas publican la tabla de qué agente saca cuánto.
 * Muy pocos publican la prueba de que el entorno era capaz de distinguirlos. Eso
 * es lo que hay aquí, y por eso se ejecuta y no se escribe a mano.
 *
 * LAS DOS POLÍTICAS
 *   TONTA  — la primera jugada legal, siempre. No mira el estado.
 *   CASA   — la del rival de la casa (`sugerencia`), una heurística sencilla.
 * Las dos son deterministas y sin estado: mismo resultado en cada ejecución.
 *
 * CÓMO SE LEE
 *   · **separa** — la casa saca más que la tonta. Es lo que se espera.
 *   · **PLANO**  — sacan lo mismo: el entorno no distingue y hay que mirarlo.
 *   · **AL REVÉS** — la tonta gana. O la métrica apunta al revés (le pasó a
 *     UNIT: premiaba soltar comodines, que es justo lo que pierde partidas), o
 *     hay un fallo de turno (le pasó a Go Fish en el Python: acertar te quitaba
 *     el turno, y una política tonta ganaba el 98% de las veces).
 *
 * ⚠️ LA GUERRA TIENE QUE SALIR PLANA
 * Es el control del laboratorio: un juego sin una sola decisión, donde todos los
 * agentes DEBEN empatar. Si algún día separa, el que falla es el banco de
 * pruebas, no el agente. Por eso aquí «plano» es su aprobado y cualquier otra
 * cosa es un fallo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROTOHUB = path.join(AQUI, 'public', 'arcade', 'js', 'protohub');

const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};

const imp = (rel) => import(pathToFileURL(path.join(PROTOHUB, rel)).href);
const { JUEGOS, TITULOS, cargarReglas } = await imp('rules/index.js');
const { puntuacionDe } = await imp('Verificador.js');
// ⚠️ Esto era `st.turn === 'player'` escrito a mano aquí. En los nueve juegos de
// tablero el turno se llama 'white', así que la política tonta NO LLEGABA A
// JUGAR y la tabla declaraba «no distingue» de medio catálogo. Ver `turno.js`.
const { crearJuezDeTurno } = await imp('turno.js');

const SEMILLAS = Number(process.argv[2]) || 25;
const TOPE = 600;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

/** Una partida con la política dada a los mandos del jugador 0. */
function jugar(reglas, semilla, casa) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    // El asiento medido es el que ABRE, se llame como se llame. Preguntarlo en
    // vez de adivinarlo es lo que arregló el desacuerdo con el arnés en go y
    // reversi, donde abren las negras. Ver `turno.js`.
    const meToca = crearJuezDeTurno(reglas.estado(p));
    for (let i = 0; i < TOPE; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const legales = (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset');
        if (!legales.length) break;
        const j = ((!meToca(st) || casa) && reglas.sugerencia)
                ? (reglas.sugerencia(p) ?? legales[0]) : legales[0];
        if (!reglas.mover(p, j)) break;
    }
    return puntuacionDe(reglas.estado(p));
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Error típico de la diferencia EMPAREJADA (misma semilla, dos políticas).
 *
 * ⚠️ Sin esto la tabla llamaba «AL REVÉS» a diferencias que eran ruido. En UNIT,
 * una sola partida ganada vale más de 1000 puntos, así que con 25 semillas dos
 * victorias de suerte mueven la media 90 puntos y la conclusión entera. Emparejar
 * por semilla quita casi todo el ruido del reparto; lo que queda, se mide.
 */
function errorTipico(a, b) {
    const d = a.map((x, i) => b[i] - x);
    const m = media(d);
    const v = d.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, d.length - 1);
    return Math.sqrt(v / d.length);
}

console.log(`\n  ${JUEGOS.length} juegos · ${SEMILLAS} semillas cada uno · dos políticas\n`);
console.log(gris('  juego              tonta      casa    delta   ruido   veredicto'));

let fallos = 0, avisos = 0;
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego);
    if (!reglas) { console.log(`  ${rojo('✗')} ${juego}: no carga`); fallos++; continue; }

    const tonta = [], casa = [];
    for (let s = 1; s <= SEMILLAS; s++) {
        tonta.push(jugar(reglas, s, false));
        casa.push(jugar(reglas, s, true));
        // ⚠️ Los seis juegos de tablero salen de una posición FIJA: la semilla no
        // los toca. Repetirlos 200 veces es jugar la misma partida 200 veces —
        // y con el ply de seguridad de las damas eso son minutos de nada. Tres
        // semillas idénticas bastan para saberlo; a partir de ahí, no hay más
        // que medir.
        if (s === 3 && new Set(tonta).size === 1 && new Set(casa).size === 1) break;
    }
    const mt = media(tonta), mc = media(casa), d = mc - mt;
    const se = errorTipico(tonta, casa);
    // Dos errores típicos: por debajo de eso no se afirma nada.
    //
    // ⚠️ Aquí había un `&& se > 0` que invertía el sentido justo donde más
    // importa. Los seis juegos de tablero salen de una posición FIJA: la semilla
    // no cambia nada, las 60 partidas son la misma, y el error típico es
    // exactamente 0. Con aquel guardia, Go marcaba +99,0 de diferencia con ±0,0
    // de ruido y se declaraba «sin señal» — cuando un ruido nulo es la señal más
    // limpia que existe, no la más floja.
    const significativo = Math.abs(d) > 2 * se && d !== 0;
    const constante = new Set([...tonta, ...casa]).size === 1;
    // Si la semilla no mueve el resultado, 60 semillas son una sola partida.
    // No invalida la comparación —es exacta— pero hay que decirlo.
    const sinAzar = new Set(tonta).size === 1 && new Set(casa).size === 1;

    // ⚠️ DOS COSAS DISTINTAS, Y ANTES SE CONTABAN IGUAL.
    // Un entorno cuya métrica es constante está ROTO: mide lo mismo juegue quien
    // juegue, y eso no lo arregla ninguna cantidad de semillas. Un entorno sin
    // señal a 120 semillas puede estar perfectamente bien y ser sólo ruidoso —en
    // UNIT una victoria vale más de mil puntos, así que la varianza es enorme
    // por construcción—. Lo primero tumba la CI; lo segundo es un aviso.
    const control = juego === 'guerra';
    let veredicto, ok, aviso = false;
    if (control) {
        ok = !significativo;
        veredicto = ok ? 'PLANO (es el control ✔)' : 'el control SEPARA — mal';
    } else if (constante) {
        ok = false; veredicto = 'MÉTRICA CONSTANTE — no puntúa';
    } else if (!significativo) {
        ok = true; aviso = true; veredicto = `sin señal a ${SEMILLAS} semillas (ruido ±${(2 * se).toFixed(1)})`;
    } else if (d < 0) {
        ok = false; veredicto = 'AL REVÉS — la tonta gana';
    } else {
        ok = true;  veredicto = sinAzar ? 'separa (posición fija: 1 partida exacta)' : 'separa';
    }

    if (!ok) fallos++;
    if (aviso) avisos++;
    const marca = !ok ? rojo('✗') : (aviso ? '·' : verde('✓'));
    console.log(`  ${marca} ${(TITULOS[juego] ?? juego).padEnd(16)}`
        + `${mt.toFixed(1).padStart(8)}${mc.toFixed(1).padStart(10)}`
        + `${((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(9)}`
        + `${('±' + (2 * se).toFixed(1)).padStart(8)}`
        + `   ${!ok ? rojo(veredicto) : (aviso ? gris(veredicto) : veredicto)}`);
}

console.log(`\n  ${fallos === 0
    ? verde(`los ${JUEGOS.length - avisos} entornos con señal se comportan como deben`)
    : rojo(`${fallos} entorno(s) ROTO(s)`)}`
    + (avisos ? gris(`  ·  ${avisos} sin señal suficiente a ${SEMILLAS} semillas (prueba con más)`) : '') + '\n');
process.exit(fallos === 0 ? 0 : 1);
