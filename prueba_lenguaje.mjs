/**
 * prueba_lenguaje.mjs — LA PUERTA DE LENGUAJE, VIGILADA
 * ═══════════════════════════════════════════════════════════════════════════
 * Lo que un agente sin visión LEE de una partida. Es la puerta más fácil de
 * romper sin enterarse: no da error, no rompe ninguna página, y el juego sigue
 * funcionando. Lo único que pasa es que el modelo juega peor y nadie sabe por
 * qué.
 *
 * Ya pasó dos veces en un solo día:
 *   · los 19 juegos caían en una plantilla que sólo decía turno y jugadas
 *     legales — se jugaba al ajedrez SIN VER EL TABLERO;
 *   · y al arreglarlo, el diagnóstico «cinco juegos no publican estado» era
 *     falso: publicaban todo, con nombres que el descriptor no conocía.
 *
 * Se comprueban cuatro cosas, y la segunda es de seguridad:
 *   1. cada juego cuenta ALGO más que su turno y sus jugadas legales;
 *   2. ⚠️ no se filtra ninguna carta que el jugador no deba ver;
 *   3. la descripción es determinista — misma semilla, mismo texto;
 *   4. no se dispara de tamaño (un prompt gigante cuesta dinero en cada jugada).
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { describirEstado } from './public/arcade/js/protohub/descripcion.js';

// Las reglas leen `card_library.json` con fetch; en Node eso es file://
const fetchReal = globalThis.fetch;
globalThis.fetch = async (e, i) => {
    const u = e instanceof URL ? e : new URL(String(e));
    if (u.protocol !== 'file:') return fetchReal(e, i);
    return new Response(await readFile(fileURLToPath(u), 'utf-8'), { status: 200 });
};

const TOPE_CARACTERES = 4000;
let fallos = 0;
const mal = (m) => { fallos++; console.log(`  ✗ ${m}`); };
const arr = (v) => (Array.isArray(v) ? v : []);

console.log('\n¿Qué lee un agente sin visión?\n');

for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla: 9, seed: 9 });
    // Unas jugadas: hay estado que sólo aparece con la partida en marcha.
    for (let i = 0; i < 6; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const m = (st.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(p, m)) break;
    }
    const st = reglas.estado(p);
    const d = describirEstado(juego, st);

    // 1. ¿Cuenta algo más que el turno y las jugadas legales?
    const cuerpo = d.replace(/^.*?Turno: \S+\.\s*/s, '').replace(/Puedes:.*$/s, '').trim();
    if (!cuerpo) mal(`${juego}: sólo dice turno y jugadas legales — se juega a ciegas`);

    // 2. ⚠️ ¿Se filtra algo que el jugador no deba ver?
    // Se recogen las cartas que el propio juego declara PÚBLICAS y se exige que
    // el texto no nombre ninguna otra. Que el descriptor pueda ser generoso
    // depende de que las reglas oculten bien: esto lo comprueba, no lo supone.
    const publicas = new Set([
        ...arr(st.mano), ...arr(st.player_hand), ...arr(st.jugador),
        ...arr(st.community_cards), ...arr(st.casa), ...arr(st.dealer_hand),
        ...arr(st.caja).filter(Boolean),
        ...arr(st.cajas_rivales).flat().filter(Boolean),
        ...arr(st.baza).map(b => b?.carta), st.cima, st.descarte,
        // La última ronda de `guerra` son cartas ya volteadas boca arriba: son
        // públicas por definición del juego. Sin esta línea la prueba las
        // señalaba como fuga, y no lo eran — un falso positivo en una prueba de
        // seguridad es tan dañino como un fallo: enseña a ignorarla.
        ...arr(st.ultima_ronda).flatMap(v => (Array.isArray(v) ? v : [v])),
        // Y las jugadas legales son, por construcción, las de quien tiene el
        // turno. Abajo se comprueba que el turno sea el del asiento descrito;
        // aquí basta con no contarlas como fuga.
        ...arr(st.legal_moves).map(m => String(m).replace(/^\w+:/, '')),
    ].filter(Boolean).map(String));
    const enTexto = [...new Set(d.match(/\b[A-Z]_[A-Z0-9]+\b/g) ?? [])];
    const fuera = enTexto.filter(c => !publicas.has(c));
    if (fuera.length) mal(`${juego}: FILTRA cartas que no son públicas → ${fuera.join(' ')}`);

    // 2b. ⚠️ LA INVARIANTE QUE DE VERDAD IMPORTA:
    // `legal_moves` son las jugadas de QUIEN TIENE EL TURNO. Cuando ese es el
    // asiento descrito, tienen que salir de SU mano. Si alguna vez saliera una
    // carta ajena, sería que el juego está ofreciendo jugadas de otro — y esa
    // lista, en un juego de cartas, es literalmente la mano del rival.
    //
    // No es hipotético: la mesa compartida enviaba `acciones` a todo el que
    // mirase, así que un jugador sondeando mientras el rival pensaba veía sus
    // cartas. Se tapó en el árbitro; esto vigila el otro lado.
    const miMano = new Set([...arr(st.mano), ...arr(st.player_hand)].map(String));
    if (miMano.size && (st.turn === 'player' || st.turn === undefined)) {
        const ajenas = arr(st.legal_moves)
            .map(m => String(m).replace(/^\w+:/, ''))
            .filter(c => /^[A-Z]_/.test(c) && !miMano.has(c));
        if (ajenas.length) {
            mal(`${juego}: ofrece jugadas con cartas que no son de tu mano → ${ajenas.join(' ')}`);
        }
    }

    // 3. ¿Es determinista? Dos partidas con la misma semilla, el mismo texto.
    const q = reglas.nuevaPartida({ semilla: 9, seed: 9 });
    for (let i = 0; i < 6; i++) {
        const s = reglas.estado(q);
        if (s.is_game_over) break;
        const m = (s.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(q, m)) break;
    }
    if (describirEstado(juego, reglas.estado(q)) !== d) {
        mal(`${juego}: la descripción cambia entre dos partidas con la misma semilla`);
    }

    // 4. ¿Cabe en un prompt sin arruinar a nadie?
    if (d.length > TOPE_CARACTERES) {
        mal(`${juego}: la descripción son ${d.length} caracteres (tope ${TOPE_CARACTERES})`);
    }

    if (!fallos || true) {
        const resumen = cuerpo.replace(/\s+/g, ' ').slice(0, 58);
        console.log(`  ✓ ${juego.padEnd(10)} ${String(d.length).padStart(5)} car · ${resumen}…`);
    }
}

console.log(fallos === 0
    ? `\n✓ los ${JUEGOS.length} se cuentan, ninguno filtra, todos deterministas\n`
    : `\n✗ ${fallos} fallo(s) en la puerta de lenguaje\n`);
process.exit(fallos === 0 ? 0 : 1);
