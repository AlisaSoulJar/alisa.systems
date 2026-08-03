/**
 * prueba_reglas.mjs — que cada juego se juegue entero y se pueda verificar
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_reglas.mjs        → 0 todo bien · 1 hay fallos
 *
 * POR QUÉ EXISTE
 * `prueba_funcion.mjs` comprueba el verificador de producción y
 * `check_gym_envs.mjs` los entornos nativos. Faltaba lo de en medio: **las
 * reglas**. Se añadieron cinco juegos en una tarde —brisca, tute, hearts,
 * spades y guerra— y sus pruebas vivían en una carpeta temporal. Publicar cinco
 * juegos sin una prueba que los cubra es justo el descuido que este proyecto
 * dice cazar.
 *
 * QUÉ COMPRUEBA, Y POR QUÉ CADA COSA
 *   1. **se juega entero** — hay quien declara acciones legales y luego no las
 *      acepta; una partida que se cuelga a mitad no se puede puntuar
 *   2. **es determinista** — misma semilla, misma partida. Sin esto no hay
 *      verificación posible, y la verificación es el producto
 *   3. **el verificador la acepta** — re-simulada da lo mismo
 *   4. **caza la trampa** — inflar la puntuación tiene que fallar
 *   5. **la huella es única** — si dos juegos firman igual, la firma no sirve
 *      para detectar que uno cambió (nos pasó con hearts y spades)
 *
 * La lista de juegos NO se escribe aquí: sale de `rules/index.js`, que es la
 * única que hay. Un comprobador con su propia lista es el fallo que este
 * proyecto ha arreglado seis veces en un día.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROTOHUB = path.join(AQUI, 'public', 'arcade', 'js', 'protohub');

// Los módulos de cartas leen `card_library.json` con `fetch`. En Node eso es
// `file://`, que su `fetch` no sirve — y caerían a su respaldo interno EN
// SILENCIO, probando otras reglas de las que se publican.
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};

const imp = (rel) => import(pathToFileURL(path.join(PROTOHUB, rel)).href);
const { JUEGOS, TITULOS, cargarReglas } = await imp('rules/index.js');
// ⚠️ `puntuacionDe` se IMPORTA, no se reescribe. La primera versión de esta
// prueba leía `estado.puntos` a pelo y daba 0 en go, reversi, mancala, snake,
// fagocito y peatón — que publican `score`, a veces como objeto. Seis juegos
// «rotos» que estaban perfectos: el roto era el comprobador.
// Es la tercera vez hoy que reimplemento esta función y me muerde.
const { verificar, puntuacionDe } = await imp('Verificador.js');
const { huellaDeReglas } = await imp('huella.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const TOPE = 600;                 // ninguna partida nuestra pasa de aquí

/**
 * Juega una partida entera de forma determinista y devuelve la traza.
 *
 * `fuerte` decide quién lleva al jugador 0: la primera jugada legal (flojo) o
 * la sugerencia de la casa (fuerte). Las dos son deterministas y sin estado.
 *
 * ⚠️ POR QUÉ HAY DOS POLÍTICAS Y NO UNA
 * Go Fish llegaba a `manos [0,3,0] · mazo 1`: el único con cartas no tenía a
 * quién pedir y la partida no estaba terminada, así que **se moría de pie** —ni
 * seguía ni acababa, y el estado seguía diciendo `is_game_over: false`—. La
 * política floja terminaba las 200 semillas sin rozar ese estado. Sólo caía el
 * jugador bueno. La línea base tonta no visita los rincones del espacio de
 * estados, y un verde sacado sólo con ella no significa gran cosa.
 */
function jugar(reglas, semilla, fuerte = false) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    const jugadas = [];
    let muerta = false;
    for (let i = 0; i < TOPE; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const legales = (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset');
        if (!legales.length) { muerta = true; break; }   // sin salida y sin final
        const suya = st.turn && st.turn !== 'player';
        const j = ((suya || fuerte) && reglas.sugerencia)
                ? (reglas.sugerencia(p) ?? legales[0])
                : legales[0];
        if (!reglas.mover(p, j)) { muerta = true; break; }  // declara legal lo que no acepta
        jugadas.push(j);
    }
    const fin = reglas.estado(p);
    return { jugadas, puntos: puntuacionDe(fin), terminada: !!fin.is_game_over, muerta };
}

const huellas = new Map();
let fallos = 0;
console.log(`\n  ${JUEGOS.length} juegos declarados en rules/index.js\n`);

for (const juego of JUEGOS) {
    const problemas = [];
    let reglas;
    try {
        reglas = await cargarReglas(juego);
        if (!reglas) throw new Error('no devuelve reglas');
    } catch (e) {
        console.log(`  ${rojo('✗')} ${juego.padEnd(10)} no carga: ${e.message}`);
        fallos++;
        continue;
    }

    const a = jugar(reglas, 20260802);
    const b = jugar(reglas, 20260802);

    if (!a.jugadas.length) problemas.push('no admite ninguna jugada');
    if (JSON.stringify(a) !== JSON.stringify(b)) problemas.push('NO es determinista');
    if (a.muerta) problemas.push('se muere de pie: sin jugadas legales y sin terminar');

    // La misma partida con el jugador bueno a los mandos, sobre varias semillas:
    // es el que se mete en los rincones donde el flojo no entra.
    for (const s of [1, 7, 42, 20260802]) {
        const f = jugar(reglas, s, true);
        if (f.muerta) { problemas.push(`se muere de pie con el jugador fuerte (semilla ${s})`); break; }
        if (JSON.stringify(f) !== JSON.stringify(jugar(reglas, s, true))) {
            problemas.push(`NO es determinista con el jugador fuerte (semilla ${s})`); break;
        }
    }

    const partida = { juego, semilla: 20260802, jugadas: a.jugadas, puntos: a.puntos };
    const v = verificar(reglas, partida);
    if (!v.valida) problemas.push(`el verificador la rechaza: ${v.motivo}`);
    if (verificar(reglas, { ...partida, puntos: 999999 }).valida) {
        problemas.push('NO caza la puntuación inflada');
    }

    const h = huellaDeReglas(reglas);
    if (huellas.has(h)) problemas.push(`misma huella que ${huellas.get(h)}`);
    huellas.set(h, juego);

    if (problemas.length) fallos++;
    console.log(`  ${problemas.length ? rojo('✗') : verde('✓')} ${juego.padEnd(10)}`
        + ` ${String(a.jugadas.length).padStart(3)} jugadas`
        + ` · puntos ${String(a.puntos).padStart(6)}`
        + ` · ${a.terminada ? 'termina' : 'tope   '}`
        + ` · huella ${h}`
        + (problemas.length ? rojo('  ← ' + problemas.join('; ')) : ''));
}

// ── El control: en la Guerra no hay decisiones, luego nadie puede destacar ──
if (JUEGOS.includes('guerra')) {
    const reglas = await cargarReglas('guerra');
    const marcadores = new Set();
    for (const semilla of [11, 11, 11]) marcadores.add(jugar(reglas, semilla).puntos);
    // Y la invariante que en el original destapó un fallo: no se pierden cartas.
    let intactas = true;
    for (let s = 1; s <= 50; s++) {
        const p = reglas.nuevaPartida({ semilla: s });
        while (!reglas.estado(p).is_game_over) {
            if (!reglas.mover(p, 'voltear')) break;
            if (!reglas.estado(p).cartas_intactas) intactas = false;
        }
    }
    const ok = marcadores.size === 1 && intactas;
    if (!ok) fallos++;
    console.log(`\n  ${ok ? verde('✓') : rojo('✗')} control de laboratorio (guerra):`
        + ` misma semilla ⇒ mismo marcador · 50 partidas sin perder una carta`);
}

console.log(`\n  ${fallos === 0
    ? verde(`${JUEGOS.length} de ${JUEGOS.length} juegos se juegan, se repiten y se verifican`)
    : rojo(`${fallos} juego(s) con problemas`)}\n`);
process.exit(fallos === 0 ? 0 : 1);
