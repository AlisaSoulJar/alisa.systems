/**
 * sustrato.js — LA MATRIZ PLANA DE LA QUE TODO LO DEMÁS ES UNA PROYECCIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 * La tesis del motor: **el 3D es sólo un ledger visual**. El estado de verdad es
 * una matriz plana, y el 3D, el texto que lee un modelo, los números que lee una
 * política y el recibo que verifica un desconocido son proyecciones de ella. Por
 * eso los tres pueden jugar la misma partida.
 *
 * ⚠️ ESO ERA LA ARQUITECTURA, NO LA IMPLEMENTACIÓN. Medido el 2026-08-07:
 *
 *     fen: string          ajedrez · reversi · damas · xiangqi
 *     board: matriz 19x19  go
 *     board: lista de 14   mancala
 *     listas de {x,y}      snake · fagocito · peaton
 *     listas de cartas     los diez de cartas
 *     nada                 guerra · entropy
 *
 * **Cinco codificaciones para la misma idea**, y de ahí salieron casi todos los
 * fallos de la semana: `syncGoState` leyendo el tablero de dos formas en la misma
 * función (las piedras no se dibujaron durante meses), `board` contra `tablero`
 * dejando a go sin describir para los LLM, catorce visualizadores a medida cada
 * uno con su bug. Cada renderizador se convirtió en un NERVIO en vez de ser un
 * ESPECTADOR — justo lo contrario de la tesis.
 *
 * EL CONTRATO: TRES ESTRUCTURAS, PORQUE HAY TRES COSAS Y NO MÁS
 *
 *     rejilla  el terreno: lo que no se mueve      (go, sokoban, mancala)
 *     piezas   lo que sí se mueve                  (ajedrez, snake, fagocito)
 *     zonas    montones ordenados fuera del tablero (manos, mazos, descartes)
 *
 * Un juego de cartas es zonas sin rejilla. Go es rejilla sin zonas. Fagocito es
 * rejilla con piezas. Brisca es zonas más una pieza por carta en la baza.
 *
 * ⚠️ ESTE FICHERO ES UN ADAPTADOR, Y ES TEMPORAL A PROPÓSITO.
 * Deriva el sustrato de lo que cada juego YA publica, para tener renderizadores
 * universales hoy sin reescribir diecinueve módulos de reglas. Lo bueno es que
 * cada juego puede empezar a publicar su `sustrato()` nativo cuando quiera y
 * dejar de pasar por aquí.
 *
 * Y TIENE QUE DOLER: `prueba_sustrato.mjs` cuenta cuántos juegos siguen
 * dependiendo del adaptador, y ese número **sólo puede bajar**. Sin esa regla,
 * dentro de veinte juegos esto tendrá veinte casos especiales — que es la
 * situación de hoy con otro nombre.
 */

/** Celda vacía. Se usa `0` y no `null` para que la matriz sea numérica y plana. */
export const VACIO = 0;

/**
 * Lee la parte de tablero de un FEN.
 *
 * Vale para los cuatro que lo publican aunque usen alfabetos distintos —
 * `rnbqkbnr` en ajedrez, `WB` en reversi, `wb` en damas, `rnbakabnr` en xiangqi—
 * porque la gramática es la misma: filas separadas por `/`, dígitos que son
 * huecos seguidos, letras que son piezas. Mayúscula = primer jugador.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LAS ACCIONES TAMBIÉN SE PROYECTAN: QUÉ CASILLAS TOCA CADA JUGADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ÉSTE ERA EL AGUJERO DE RAÍZ, Y ME LO SEÑALÓ FABLE REVISANDO.
 *
 * El sustrato normalizó el ESTADO —`rejilla`, `piezas`, `zonas`— y las ACCIONES se
 * quedaron fuera: cada juego tiene su microgramática (`e2e4`, `a3b4`, `a1`, `e6`) y
 * quien dibuja no puede saber a qué casilla apunta ninguna. De ahí salen tres cosas
 * que llevo todo el día parcheando a mano:
 *
 *   · la mesa genérica no puede ofrecer entrada espacial, así que quince juegos se
 *     juegan sólo por el panel;
 *   · flota necesitó que su regla publicara `nombres` a medida;
 *   · y los once visualizadores propios tienen excusa para existir, porque cada uno
 *     se escribe su propio clic→jugada. Son 2.800 líneas de columna duplicada.
 *
 * ⚠️ Y AQUÍ SE PUEDE DERIVAR SIN ADIVINAR NADA, QUE ES LA GRACIA.
 *
 * Esta mañana escribí esto mismo en la mesa —probando `a1` y `a8` a ver cuál era
 * legal— y lo quité, porque en flota las dos numeraciones eran legales a la vez:
 * tocar la esquina habría jugado una casilla que no era la señalada.
 *
 * Aquí no hay ambigüedad: es `deFen` quien COLOCA el tablero, poniendo la primera
 * fila del FEN en `y = 0`. Así que la fila 3 está en `y = alto - 3` por
 * construcción, no por convención. El que reparte las casillas es el mismo que dice
 * cómo se llaman.
 *
 * Devuelve, por cada jugada legal, la lista de casillas que toca:
 *
 *     "a3b4" → [45, 36]     de una casilla a otra (damas, ajedrez, xiangqi)
 *     "e6"   → [20]         una sola (reversi, go, flota)
 *     "pasar" → no aparece  las que no son espaciales se quedan fuera
 */
function accionesDe(rejilla, legales) {
    if (!rejilla?.ancho || !rejilla?.alto || !legales?.length) return null;
    const { ancho, alto } = rejilla;
    const mapa = {};

    for (const m of legales) {
        const s = String(m);
        // Cada tramo `letra + número` es una casilla. `a3b4` da dos; `e6`, una.
        const trozos = s.match(/[a-z]\d+/gi);
        if (!trozos) continue;
        const celdas = [];
        for (const t of trozos) {
            const x = t[0].toLowerCase().charCodeAt(0) - 97;
            const y = alto - Number(t.slice(1));
            if (x < 0 || x >= ancho || y < 0 || y >= alto) { celdas.length = 0; break; }
            celdas.push(y * ancho + x);
        }
        if (celdas.length) mapa[s] = celdas;
    }
    return Object.keys(mapa).length ? mapa : null;
}

function deFen(fen) {
    const filas = String(fen).split(' ')[0].split('/');
    const piezas = [];
    let ancho = 0;
    filas.forEach((fila, y) => {
        let x = 0;
        for (const ch of fila) {
            if (/\d/.test(ch)) { x += Number(ch); continue; }
            piezas.push({ x, y, t: ch.toLowerCase(), de: ch === ch.toUpperCase() ? 0 : 1 });
            x++;
        }
        ancho = Math.max(ancho, x);
    });
    return {
        rejilla: { ancho, alto: filas.length, celdas: new Array(ancho * filas.length).fill(VACIO) },
        piezas,
    };
}

/** Matriz de números (go): las fichas son piezas, el tablero queda vacío. */
function deMatriz(m) {
    const alto = m.length, ancho = m[0]?.length ?? 0;
    const piezas = [];
    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
            const v = m[y][x];
            if (!v) continue;
            piezas.push({ x, y, t: v === 1 ? 'n' : 'b', de: v === 1 ? 0 : 1 });
        }
    }
    return { rejilla: { ancho, alto, celdas: new Array(ancho * alto).fill(VACIO) }, piezas };
}

/** Deriva ancho y alto de unas listas de puntos, cuando el juego no los dice. */
function extension(...listas) {
    let ancho = 0, alto = 0;
    for (const l of listas) {
        for (const p of (l ?? [])) {
            if (!p || !Number.isFinite(p.x)) continue;
            ancho = Math.max(ancho, p.x + 1);
            alto = Math.max(alto, p.y + 1);
        }
    }
    return { ancho, alto };
}

const lista = (v) => (Array.isArray(v) ? v : []);

/**
 * El adaptador. Devuelve siempre la misma forma, aunque venga vacía.
 *
 * @param {string} juego
 * @param {object} st  lo que devuelve `reglas.estado(p)`
 * @returns {{rejilla, piezas, zonas, leyenda, derivado}}
 */
export function sustratoDe(juego, st = {}) {
    let rejilla = null, piezas = [], zonas = [];

    // ── Terreno y piezas ────────────────────────────────────────────────
    const matriz = st.tablero ?? st.board ?? st.state?.board;

    if (st.fen) {
        ({ rejilla, piezas } = deFen(st.fen));
    } else if (Array.isArray(matriz) && Array.isArray(matriz[0])) {
        ({ rejilla, piezas } = deMatriz(matriz));
    } else if (Array.isArray(matriz) && matriz.length === 14 && juego === 'mancala') {
        // ⚠️ Mancala NO es una lista: son dos filas de seis hoyos más dos
        // graneros. Publicarlo plano obligaba a cada consumidor a saberse el
        // reparto de memoria. Aquí se dice una vez y ya está.
        rejilla = { ancho: 7, alto: 2, celdas: [...matriz.slice(0, 7), ...matriz.slice(7, 14)] };
    } else if (st.maze || st.snake || st.frog) {
        // Espaciales por entidades. El terreno son los muros, si los hay.
        const muros = lista(st.maze);
        const { ancho, alto } = st.width && st.height
            ? { ancho: st.width, alto: st.height }
            : extension(muros, lista(st.pellets), lista(st.snake), lista(st.ghosts));
        rejilla = { ancho, alto, celdas: new Array(ancho * alto).fill(VACIO) };
        for (const m of muros) if (m.y * ancho + m.x < rejilla.celdas.length) {
            rejilla.celdas[m.y * ancho + m.x] = 1;             // 1 = muro
        }
        piezas = [
            ...lista(st.pellets).map(p => ({ x: p.x, y: p.y, t: 'bolita', de: null })),
            ...lista(st.ghosts).map(g => ({ x: g.x, y: g.y, t: g.type ?? 'fantasma', de: 1 })),
            ...lista(st.snake).map((s, i) => ({ x: s.x, y: s.y, t: i ? 'cuerpo' : 'cabeza', de: 0 })),
            ...(st.food ? [{ x: st.food.x, y: st.food.y, t: 'comida', de: null }] : []),
            ...(st.fagocito ? [{ x: st.fagocito.x, y: st.fagocito.y, t: 'jugador', de: 0 }] : []),
            ...(st.frog ? [{ x: st.frog.x, y: st.frog.y, t: 'jugador', de: 0 }] : []),
            ...lista(st.hazards).flatMap((fila, y) =>
                lista(fila).map(h => ({ x: h.x, y, t: h.dir > 0 ? 'coche_der' : 'coche_izq', de: 1 }))),
        ];
    }

    /**
     * ⚠️ SI EL JUEGO DICE CÓMO ES SU TABLERO, LA REJILLA LO LLEVA.
     *
     * Un go y un reversi publican exactamente la misma matriz de números, así que
     * esto NO se puede derivar: hay que preguntarlo. El juego lo declara con
     * `PATRON` y el hub lo mete en el estado, igual que el objetivo.
     *
     * Va aquí, en un sitio, y no dentro de cada rama de arriba: si mañana un juego
     * de intersecciones llega por FEN en vez de por matriz —el xiangqi podría—, ya
     * funciona sin tocar nada.
     */
    if (rejilla && st.patron) rejilla.patron = st.patron;

    // ── Montones ────────────────────────────────────────────────────────
    // ⚠️ Lo oculto se marca, no se omite. Un consumidor tiene que poder pintar
    // «tres cartas boca abajo» — si aquí desaparecieran, el render mentiría
    // diciendo que el rival no tiene nada.
    const mano = lista(st.mano).length ? st.mano : lista(st.player_hand);
    if (lista(mano).length) zonas.push({ id: 'mano', de: 0, items: [...mano], ocultas: 0 });
    lista(st.manos_rivales).forEach((n, i) =>
        zonas.push({ id: 'mano', de: i + 1, items: [], ocultas: n }));
    /**
     * ⚠️ Y LA MANO DEL RIVAL TAMBIÉN VIENE **TAPADA EN LUGAR DE CONTADA**.
     *
     * Aquí sólo se miraba `manos_rivales`, que es un número de cartas. Poker no
     * publica un número: publica `opponent_hand: ['??','??']` — las cartas, con
     * la cara hacia abajo. Enmascarar así está bien y no filtra nada; lo que
     * fallaba es que el adaptador no reconocía la forma, y entonces la zona del
     * rival no llegaba a existir.
     *
     * Consecuencia exacta: el dibujo de poker decía que el contrario **no tiene
     * cartas**. Es la mentira que el comentario de arriba prohíbe, cometida tres
     * líneas más abajo — y no la vio nadie porque no da error, sólo dibuja mal.
     * Lo destapó la matriz de géneros al preguntar «¿este juego tiene
     * información oculta?» y contestar que no. De poker.
     */
    const tapada = (c) => !c || c === '??' || c === '?';
    if (lista(st.opponent_hand).length) {
        zonas.push({ id: 'mano', de: 1,
                     items: st.opponent_hand.filter(c => !tapada(c)),
                     ocultas: st.opponent_hand.filter(tapada).length });
    }
    if (lista(st.baza).length) {
        zonas.push({ id: 'baza', de: null, items: st.baza.map(j => j.carta ?? j), ocultas: 0 });
    }
    if (lista(st.community_cards).length) {
        zonas.push({ id: 'comunes', de: null, items: [...st.community_cards], ocultas: 0 });
    }
    /**
     * ⚠️ UNA CAJA TIENE CASILLAS, Y `filter(Boolean)` LAS BORRABA.
     *
     * Esto publicaba sólo las cartas destapadas, así que ocho huecos con tres
     * cartas vistas salían como «tres cartas y cinco tapadas» — un montón, sin
     * decir cuál estaba dónde. Y en entropy las casillas SON el juego: `cambiar:5`
     * nombra un hueco fijo, y la regla que lo hace interesante —dos cartas iguales
     * en la misma COLUMNA se anulan— sólo se puede pensar viendo la rejilla.
     *
     * O sea que la mesa dibujaba las vistas amontonadas a un lado y las tapadas al
     * otro: un reparto que no existe, en el que no se puede señalar `cambiar:5` ni
     * ver una columna. Se veía bien y era ilegible, que es la peor combinación.
     *
     * `casillas` conserva el array tal cual, con `null` donde hay carta boca abajo
     * — que es exactamente como lo publica el juego. `items` y `ocultas` siguen
     * igual para quien ya los leía: esto añade, no cambia.
     */
    const conCasillas = (caja, de) => ({
        id: 'caja', de,
        items: caja.filter(Boolean),
        ocultas: caja.filter(c => !c).length,
        casillas: [...caja],
        // Cuántas casillas por fila. Lo DECLARA el juego —entropy publica
        // `columnas: 4`— porque una rejilla de 8 huecos podría ser 2×4 o 4×2 y
        // eso no se deduce del número de cartas. Sin ello, una sola fila.
        ...(Number.isFinite(st.columnas) ? { columnas: st.columnas } : {}),
    });
    if (lista(st.caja).length) zonas.push(conCasillas(st.caja, 0));
    lista(st.cajas_rivales).forEach((c, i) => zonas.push(conCasillas(c, i + 1)));
    /**
     * ⚠️ LA CARTA QUE TIENES EN LA MANO TAMBIÉN ES UNA ZONA.
     *
     * No estaba, y era la que más falta hacía: robabas y **no se dibujaba en
     * ninguna parte**. Sabías que tenías algo porque los botones cambiaban, pero
     * no qué — que es justo lo único que decide la jugada siguiente. Se veía
     * jugar sin poder jugar.
     *
     * Sólo se publica cuando el estado la trae: las reglas ya deciden si te toca
     * verla (la robada del mazo es privada de quien la roba; la del descarte la
     * ha visto todo el mundo). Aquí no se decide nada de eso, sólo se dibuja lo
     * que llega.
     */
    if (st.robada) zonas.push({ id: 'robada', de: 0, items: [st.robada], ocultas: 0 });

    if (typeof st.descarte === 'string') zonas.push({ id: 'descarte', de: null, items: [st.descarte], ocultas: 0 });
    if (st.cima) zonas.push({ id: 'descarte', de: null, items: [st.cima], ocultas: 0 });
    if (Number.isFinite(st.mazo_restante)) {
        zonas.push({ id: 'mazo', de: null, items: [], ocultas: st.mazo_restante });
    }

    return {
        rejilla, piezas, zonas,
        acciones: accionesDe(rejilla, st.legal_moves ?? st.legal_actions ?? []),
        leyenda: LEYENDAS[juego] ?? {},
        // Marca de que esto viene del adaptador y no del juego. Es lo que
        // `prueba_sustrato.mjs` cuenta para que el número baje con el tiempo.
        derivado: true,
    };
}

/** Nombres legibles de las letras, por juego. Sólo donde no se adivinan. */
const LEYENDAS = {
    ajedrez: { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' },
    xiangqi: { p: 'soldado', c: 'cañón', r: 'carro', n: 'caballo', b: 'elefante',
               a: 'consejero', k: 'general' },
    damas: { w: 'peón claro', b: 'peón oscuro' },
    reversi: { w: 'ficha clara', b: 'ficha oscura' },
    go: { n: 'piedra negra', b: 'piedra blanca' },
};

/**
 * ¿Tiene este juego sustrato propio, sin pasar por el adaptador?
 * Se usará cuando los módulos empiecen a publicar `sustrato(p)` nativo.
 */
export const tieneSustratoPropio = (reglas) => typeof reglas?.sustrato === 'function';

/** Devuelve el sustrato nativo si existe, y si no lo deriva. */
export function obtenerSustrato(juego, reglas, p, st) {
    if (tieneSustratoPropio(reglas)) return { ...reglas.sustrato(p), derivado: false };
    return sustratoDe(juego, st);
}
