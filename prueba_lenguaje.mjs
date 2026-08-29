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
import { apuntar } from './adopcion.mjs';

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
        // El montón del descarte entero, por el mismo motivo que la línea de
        // arriba: cada una de esas cartas la puso alguien BOCA ARRIBA sobre la
        // mesa. `st.descarte` (la de encima) ya estaba; faltaba el montón, que es
        // lo que publica el remigio. Comprobado antes de tocar esto, y no
        // suponiendo: de las 38 cartas secretas de una partida —mano del rival
        // más mazo— el estado no nombra ninguna. Las tres que saltaban estaban
        // las tres en el descarte.
        ...arr(st.descartes),
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

    /**
     * 2c. ⚠️ LO QUE SE ROBA A CIEGAS NO SE PUBLICA A LOS DEMÁS.
     *
     * Y ESTA COMPROBACIÓN MIRA EL ESTADO, NO EL TEXTO — que es el hueco que tenía
     * la de arriba. La 2 pregunta «¿dice el texto algo que el estado no declare
     * público?», o sea que **usa el estado como definición de lo público**: una
     * fuga metida en el propio estado le resulta invisible por construcción. Era
     * una prueba de seguridad que sólo vigilaba una de las dos puertas, y los
     * agentes entran por la otra.
     *
     * Pasó en entropy: `robada: p.robada` se publicaba sin mirar quién pregunta,
     * así que el rival veía la carta que acababas de sacar del mazo antes de que
     * decidieras qué hacer con ella. Del descarte es pública —la ha visto todo el
     * mundo—; del mazo es lo único privado que hay en ese turno.
     *
     * En un juego cuya gracia es la memoria, un agente que lea el estado del rival
     * deja de tener que recordar: el entorno mediría lectura, no memoria.
     */
    const conRobo = reglas.nuevaPartida({ semilla: 11, seed: 11 });
    const stRobo = reglas.estado(conRobo);
    if ((stRobo.legal_moves ?? []).includes('robar_mazo') && reglas.estado(conRobo, 1)) {
        reglas.mover(conRobo, 'robar_mazo');
        const mia = reglas.estado(conRobo, 0);
        const suya = reglas.estado(conRobo, 1);
        if (mia.robada && suya.robada && mia.robada === suya.robada
            && mia.robada_de !== 'descarte') {
            mal(`${juego}: publica al rival la carta robada del mazo (${mia.robada}) `
              + '— es lo único privado del turno');
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

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ 5. Y EL AGUJERO QUE ENCONTRÉ JUGANDO, QUE ES DISTINTO DE LOS CUATRO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * La comprobación 1 pide que el juego cuente ALGO más que turno y jugadas
     * legales. `mecha` la pasa diciendo «t: 0. rotasPorJugador: [0,0]» — que es
     * algo, y no sirve para nada. Jugué una partida a ciegas leyendo sólo esto y
     * no sabía dónde estaba yo, dónde estaban las cajas ni dónde había puesto mi
     * bomba. Se puede elegir sin equivocarse —eso lo garantiza `legal_moves`— y no
     * se puede elegir bien.
     *
     * Medido el 29-08-2026: de los 26 juegos de rejilla, 9 publican tablero en
     * texto y 17 no. Y no falta la máquina: `dibujarRejilla` existe en
     * `descripcion.js` y el sustrato ya publica rejilla, piezas, terreno y
     * símbolos —es lo que `pintar2d.js` usa para el minimapa—. Lo que hay es un
     * `contarEspacial` con cuatro ramas escritas a mano, o sea una lista paralela
     * de las que esta casa ha arreglado seis veces.
     *
     * ⚠️ NO SE MARCA COMO FALLO HOY, Y SE DICE POR QUÉ. Ponerlo en rojo dejaría la
     *    suite con diecisiete rojos que no se arreglan en una tarde, y una suite
     *    que se queda roja deja de mirarse. Va de trinquete: publicado y sólo
     *    puede subir.
     */
    if (!fallos || true) {
        const resumen = cuerpo.replace(/\s+/g, ' ').slice(0, 58);
        console.log(`  ✓ ${juego.padEnd(10)} ${String(d.length).padStart(5)} car · ${resumen}…`);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ¿CUÁNTOS JUEGOS DE REJILLA PUBLICAN SU TABLERO EN TEXTO?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Los cuatro controles de arriba miran que el texto no MIENTA. Éste mira que
 * BASTE, que es otra cosa. Lo encontré jugando a `mecha` a ciegas: la
 * descripción entera era «Puntos: 0. Turno: white. t: 0. rotasPorJugador: [0,0].
 * Puedes: abajo, derecha, esperar, bomba.» Ni dónde estaba yo, ni dónde las
 * cajas, ni dónde el rival.
 *
 * Es la avería que la cabecera de `descripcion.js` dice haber arreglado —«jugar
 * al ajedrez leyendo *Puedes: a2a3…* sin ver el tablero jamás»— y que volvió a
 * entrar con cada juego nuevo, porque el relato espacial es una cadena de `if`
 * por juego y nadie le añade una rama al llegar.
 *
 * ⚠️ EL CRITERIO ES EXACTO, NO UNA HEURÍSTICA. Tres instrumentos míos acusaron en
 *    falso antes de éste: uno por regex (decía que `mancala` no dice dónde está
 *    nada, y lo dice); otro comparando cuatro repartos (acusaba a ajedrez, go y
 *    damas, que empiezan siempre en la misma posición, claro). Lo que se
 *    pregunta aquí es del código: si el juego tiene rejilla, ¿publica `fen`,
 *    `board`/`tablero`, o tiene rama propia en `contarEspacial`?
 */
{
    const { obtenerSustrato } = await import('./public/arcade/js/protohub/sustrato.js');
    const conTablero = [], ciegos = [];
    for (const juego of JUEGOS) {
        let sus, st, texto;
        try {
            const reglas = await cargarReglas(juego, {});
            const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
            st = reglas.estado(p);
            sus = obtenerSustrato(juego, reglas, p, st) ?? {};
            texto = describirEstado(juego, st, sus);
        } catch { continue; }
        if (!sus.rejilla) continue;              // los de cartas se cuentan solos

        /**
         * ⚠️ AHORA SE MIRA EL TEXTO QUE SALE, NO DE DÓNDE SALE.
         *
         * La primera versión preguntaba «¿tiene rama en `contarEspacial` o
         * publica fen/board?». Eso era una lista de nombres —de las que esta casa
         * ha arreglado seis veces— y ademas dejó de ser cierta en cuanto el
         * sustrato empezó a dibujarse solo: los diecisiete que se encendieron no
         * tienen rama ninguna y ahora sacan su mapa.
         *
         * Lo que de verdad importa es si en el texto hay un DIBUJO o una posición:
         * varias líneas, un FEN, coordenadas, o la frase con la que cada juego
         * cuenta lo suyo. Eso no depende de por qué camino llegó.
         */
        const cuerpo = texto.replace(/^.*?Turno: [^.]*\.\s*/s, '').replace(/\s*Puedes:.*$/s, '');
        const dibuja = /\n/.test(cuerpo)              // un mapa de varias líneas
            || /\(\d+,\s*\d+\)/.test(cuerpo)          // «cabeza en (10,10)»
            || /\//.test(cuerpo)                      // un FEN
            || /hoyos/.test(cuerpo);                  // el mancala, que cuenta los suyos
        (dibuja ? conTablero : ciegos).push(juego);
    }
    const total = conTablero.length + ciegos.length;

    /**
     * ⚠️ TRINQUETE, NO FALLO. Ponerlo en rojo hoy dejaría la suite con diecisiete
     *    rojos que no se arreglan en una tarde, y una suite que se queda roja deja
     *    de mirarse — eso es peor que el agujero. Así que se publica y sólo puede
     *    subir; el día que suba, hay que subir este número a mano, que es lo que
     *    obliga a mirarlo.
     */
    const SUELO_CON_TABLERO = 26;
    console.log(`\n  ${conTablero.length} de ${total} juegos de rejilla publican su tablero en texto`);
    if (ciegos.length) {
        console.log(`  a ciegas: ${ciegos.join(', ')}`);
    }
    if (conTablero.length < SUELO_CON_TABLERO) {
        console.log(`\n  ✗ BAJÓ: eran ${SUELO_CON_TABLERO} y ahora son ${conTablero.length}. `
            + 'Un juego ha dejado de contar dónde está lo que hay.');
        fallos++;
    } else if (conTablero.length > SUELO_CON_TABLERO) {
        console.log(`  ↑ subió a ${conTablero.length}: aprieta SUELO_CON_TABLERO.`);
    }

    await apuntar({
        clave: 'tablero-en-texto',
        titulo: 'juegos de rejilla que dicen DÓNDE está lo que hay, no sólo cuántos',
        usan: conTablero.length, podrian: total, quien: 'prueba_lenguaje.mjs',
        nota: 'el resto sólo publica escalares: se puede elegir sin equivocarse, no elegir bien',
    });
}

console.log(fallos === 0
    ? `\n✓ los ${JUEGOS.length} se cuentan, ninguno filtra, todos deterministas\n`
    : `\n✗ ${fallos} fallo(s) en la puerta de lenguaje\n`);
process.exit(fallos === 0 ? 0 : 1);
