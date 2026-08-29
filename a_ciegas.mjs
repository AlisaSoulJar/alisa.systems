/**
 * a_ciegas.mjs — jugar por la puerta de texto, sin mirar el tablero
 * ═══════════════════════════════════════════════════════════════════════════
 *     node a_ciegas.mjs                          → la lista de juegos
 *     node a_ciegas.mjs mecha                    → la posición inicial
 *     node a_ciegas.mjs mecha 7                  → con otra semilla
 *     node a_ciegas.mjs mecha 7 abajo,bomba      → después de esas jugadas
 *
 * Imprime EXACTAMENTE lo que leería un agente de lenguaje: `describirEstado`, ni
 * una palabra más. Como la partida es determinista, se vuelve a jugar entera cada
 * vez y basta con ir alargando la lista de jugadas.
 *
 * ⚠️ POR QUÉ ESTO ES UNA HERRAMIENTA Y NO UN BORRADOR.
 *
 * `prueba_lenguaje.mjs` comprueba que el texto no MIENTA —que no filtre cartas,
 * que sea determinista, que quepa en un prompt—. Lo que ninguna prueba puede
 * comprobar es si BASTA para jugar, porque eso es una pregunta sobre entender, no
 * sobre datos.
 *
 * Se destapa jugando, y sólo jugando. Así salieron las dos averías gordas de esta
 * puerta:
 *
 *   · El 06-08-2026: los diecinueve juegos caían en una plantilla que sólo decía
 *     turno y jugadas legales. Se jugaba al ajedrez SIN VER EL TABLERO.
 *   · En una mano de entropy, las reglas ofrecían seis `descartar_y_voltear` y la
 *     descripción enseñaba cuatro: un `.slice(0, 12)` mudo. Dos jugadas legales
 *     que un agente no podía ni saber que existían.
 *   · Y el 29-08-2026, jugando a `mecha` con esto: la descripción entera era
 *     «Puntos: 0. Turno: white. t: 0. rotasPorJugador: [0,0]. Puedes: abajo,
 *     derecha, esperar, bomba.» Ni dónde estaba yo, ni las cajas, ni el rival.
 *     De los 26 juegos de rejilla, 9 publican tablero en texto y 17 no.
 *
 * Las tres las encontró alguien jugando. Ninguna la habría encontrado leyendo.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { describirEstado } from './public/arcade/js/protohub/descripcion.js';
import { obtenerSustrato } from './public/arcade/js/protohub/sustrato.js';

// Las reglas de cartas leen `card_library.json` con fetch; en Node eso es file://
const fetchReal = globalThis.fetch;
globalThis.fetch = async (e, i) => {
    const u = e instanceof URL ? e : new URL(String(e));
    if (u.protocol !== 'file:') return fetchReal(e, i);
    return new Response(await readFile(fileURLToPath(u), 'utf-8'), { status: 200 });
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA CASA JUEGA LOS OTROS ASIENTOS. LA PRIMERA VERSIÓN NO, Y ERA GRAVE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta herramienta nació el 29-08 aplicando las jugadas que le dieras, sin más.
 * En un juego de un solo asiento da igual; en uno de dos, significa que **juegas
 * también por el rival**, y entonces la partida no mide jugar: mide construir una
 * línea a tu favor.
 *
 * Lo destapó Motoko usándola: hizo el mate del loco en el ajedrez eligiendo ella
 * las dos peores jugadas de las negras —f7f6 y g7g5— y sacó 1000 puntos. Y lo dijo
 * ella misma, con una frase que da el diagnóstico exacto: «el entorno no mide mi
 * capacidad de jugar a los barquitos, mide que soy dios en ese tablero».
 *
 * ⚠️ Y EL ARREGLO YA ESTABA ESCRITO, EN EL SITIO QUE MÁS DUELE.
 *
 * `ProtoHubEnv` —el entorno de gym, el que usan los agentes de verdad— hace que
 * responda la casa desde siempre, con este comentario al lado:
 *
 *     «Que responda la casa, si el juego tiene turnos y trae rival. Sin esto un
 *      agente jugaría al ajedrez contra sí mismo y la puntuación no significaría
 *      nada.»
 *
 * O sea que el motivo estaba escrito, la pieza estaba escrita, y yo monté una
 * puerta nueva sin ella. Van siete esta semana.
 *
 * ⚠️ LA JUGADA DE LA CASA CUENTA EN EL RECIBO, igual que en el entorno: si
 *    faltara, al re-simular la partida saldría otro tablero.
 *
 * Con `--dios` se recupera el comportamiento viejo —tú mueves todos los asientos—,
 * que sirve para explorar un juego y NO sirve para medir nada. Se dice en la
 * cabecera de la salida, para que ningún número salga de aquí sin su condición.
 */
const CASA_MAX = 64;

const argv = process.argv.slice(2);
const dios = argv.includes('--dios');
const [juego, semilla = '7', lista = ''] = argv.filter((a) => !a.startsWith('--'));

if (!juego) {
    console.log(`\nnode a_ciegas.mjs <juego> [semilla] [jugada,jugada,…]\n`);
    console.log(`Los ${JUEGOS.length}: ${JUEGOS.join(', ')}\n`);
    process.exit(0);
}
if (!JUEGOS.includes(juego)) {
    console.log(`\n«${juego}» no está. Los ${JUEGOS.length}: ${JUEGOS.join(', ')}\n`);
    process.exit(2);
}

const jugadas = lista ? lista.split(',').map(s => s.trim()).filter(Boolean) : [];
const reglas = await cargarReglas(juego, {});
const p = reglas.nuevaPartida({ semilla: Number(semilla), seed: Number(semilla) });

/**
 * De quién es la mesa. Se toma del primer estado y no se vuelve a preguntar: es
 * TU asiento durante toda la partida, igual que en una mesa de verdad.
 */
const miTurno = reglas.estado(p).turn;

/** Deja jugar a la casa mientras no te toque. Devuelve las jugadas que hizo. */
function juegaLaCasa() {
    const suyas = [];
    if (dios || !reglas.sugerencia) return suyas;
    for (let i = 0; i < CASA_MAX; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        if (st.turn === undefined || st.turn === miTurno) break;
        const j = reglas.sugerencia(p);
        if (!j || !reglas.mover(p, j)) break;
        suyas.push(j);
    }
    return suyas;
}

const deLaCasa = [];
deLaCasa.push(...juegaLaCasa());   // por si la casa abre

let hechas = 0;
for (const j of jugadas) {
    /**
     * ⚠️ SI UNA JUGADA NO ES LEGAL SE PARA Y SE DICE CUÁL, en vez de saltársela.
     * Seguir con la lista dejaría una posición que no corresponde a lo que pediste,
     * y estarías leyendo la descripción de otra partida creyendo que es la tuya —
     * que es justo el tipo de error que esta herramienta existe para no cometer.
     */
    if (!reglas.mover(p, j)) {
        console.log(`\n!! la jugada ${hechas + 1}, «${j}», no era legal. Paro aquí.`);
        console.log(`   legales ahí: ${(reglas.estado(p).legal_moves ?? []).slice(0, 12).join(', ')}\n`);
        break;
    }
    hechas++;
    deLaCasa.push(...juegaLaCasa());
}

const st = reglas.estado(p);
console.log(`\n[${juego} · semilla ${semilla} · ${hechas} tuyas · ${deLaCasa.length} de la casa` + (dios ? ` · ⚠️ MODO DIOS: mueves todos los asientos, esto NO mide nada` : ``) + `]\n`);
console.log(describirEstado(juego, st, obtenerSustrato(juego, reglas, p, st)));
console.log('');
