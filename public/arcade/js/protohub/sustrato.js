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
 * EL CONTRATO: CINCO ESTRUCTURAS, Y LAS DOS ÚLTIMAS COSTARON ADMITIRLAS
 *
 *     rejilla   el terreno: lo que no se mueve      (go, sokoban, cripta)
 *     piezas    lo que sí se mueve                  (ajedrez, snake, fagocito)
 *     zonas     montones ordenados FUERA del tablero (manos, mazos, descartes)
 *     asientos  sitios declarados que CONTIENEN     (mancala, escondites)
 *     dichos    lo que alguien DICE                 (apuestas, órdenes, acusaciones)
 *
 * Un juego de cartas es zonas sin rejilla. Go es rejilla sin zonas. Fagocito es
 * rejilla con piezas. Brisca es zonas más una pieza por carta en la baza.
 *
 * ⚠️ AQUÍ PONÍA «TRES ESTRUCTURAS, PORQUE HAY TRES COSAS Y NO MÁS», Y ERA VERDAD
 *    HASTA QUE DEJÓ DE SERLO. ASÍ QUE HAY QUE ARGUMENTAR LA CUARTA.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Un `asiento` no es ninguna de las otras tres:
 *
 *   · NO es rejilla — una celda es lo que hay DEBAJO de ti; un asiento es un
 *     sitio que CONTIENE. Y muchos no caen en cuadrícula: los catorce hoyos de
 *     mancala están en óvalo, y un escondite en un edificio de seis plantas no
 *     tiene fila ni columna.
 *   · NO es pieza — no se mueve. Es donde las piezas están.
 *   · NO es zona — una zona es el montón de un jugador, fuera del tablero. Un
 *     asiento está EN el sitio y puede no ser de nadie.
 *
 * Y no se admite por elegancia: se admite porque CINCO sistemas de esta casa lo
 * inventaron por separado, cada uno con su nombre, sin poder decírselo al motor:
 *
 *     mancala                    14 hoyos con N semillas → y por eso necesita
 *                                visualizador propio: el adaptador le saca
 *                                `rejilla: null` y cero piezas. No tiene sustrato.
 *     ProceduralBuildingFactory  hidingSpots[] con hasRaccoon e isSearched
 *     ScummInteractionEngine     partition.leaves + targetId + snakeIds + tried[]
 *     raccoon_floor_search       escondites[] + registrados + conMapache
 *     alisapolis                 40 casillas con nombre y dueño
 *
 * Los cinco son lo mismo: un sitio declarado que puede contener algo y que
 * puedes haber mirado ya. Por eso ¡Busca! es una saga coherente — cada etapa es
 * esta abstracción a otra escala: un cajón, una habitación, una planta, un
 * edificio, un planeta.
 *
 * ⚠️ Y EL NOMBRE VIENE DEL CANON, NO DE AQUÍ.
 * `Data/Lecciones/RPG_CODEBASE_FEDERATION_CONVERGENCE_20260729.md` ya define
 * `Seat = situated Role in a Facade` y `Appointment = Being bound to a Seat`, con
 * `Reality.Seats` y `Reality.Appointments` de almacenes primarios. Inventar
 * `huecos` habría sido el sexto dialecto de la misma cosa.
 *
 * LA FORMA:
 *
 *     { id, x, y }              quién es y dónde está
 *     { de }                    de quién es, si es de alguien
 *     { nombre }                cómo se llama para una persona («Data-1», «nevera»)
 *     { cuantas }               cuánto contiene, si el contenido es FUNGIBLE
 *     { tiene: [id] }           qué contiene, si el contenido tiene identidad
 *     { visto }                 si ya se miró — la mecánica entera de ¡Busca!
 *
 * `cuantas` y `tiene` son las dos caras: doce semillas de mancala son
 * intercambiables y se cuentan; el mapache no, y se nombra.
 *
 * Un juego de cartas es zonas sin rejilla. Go es rejilla sin zonas. Fagocito es
 * rejilla con piezas. Brisca es zonas más una pieza por carta en la baza.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA QUINTA: `dichos`. LO QUE ALGUIEN DICE NO ESTÁ EN NINGÚN SITIO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aquí también hubo que argumentarla, y el argumento es el mismo de `asientos`:
 * no se admite por elegancia, se admite porque CUATRO juegos la inventaron por
 * separado —cada uno con su nombre— y ninguno podía decírselo al motor:
 *
 *     spades      p.apuestas[]            un número por asiento
 *     gofish      p.preguntas[]           {de, a, rango, acierta}
 *     cabina      p.mensaje + p.dichos    la última orden, y un contador
 *     shinigami   p.dichos[] + p.oculta{} lo dicho en voz alta, y lo elegido a solas
 *
 * Y se destapó midiendo, no pensando: `veredicto.movioLaPantalla` buscó juegos
 * donde NINGUNA jugada de apertura cambia el dibujo, y salieron estos tres —
 * `spades`, `shinigami`, `cabina`. Los tres con la misma forma: **apuestas,
 * señalas o das una orden, y la pantalla no acusa recibo.** Es el mismo síntoma
 * que el «le doy a voltear y no pasa nada» de `guerra`, con otra causa: allí no
 * había sustrato, aquí el sustrato no tiene dónde ponerlo.
 *
 * UN `dicho` NO ES NINGUNA DE LAS OTRAS CUATRO:
 *
 *   · NO es rejilla — no es terreno, y no está debajo de nadie.
 *   · NO es pieza — no se mueve porque no está en ningún sitio. Una apuesta no
 *     tiene x ni y, y ponerle unas inventadas es mentir en la fuente única.
 *   · NO es zona — una zona es un MONTÓN DE COSAS que alguien tiene. Un dicho no
 *     se tiene: se emite. No se puede robar, ni barajar, ni contar.
 *   · NO es asiento — un asiento es un sitio que CONTIENE. Las otras cuatro
 *     contestan DÓNDE; ésta contesta QUIÉN DIJO QUÉ SOBRE QUIÉN.
 *
 * Ésa es la prueba limpia: un dicho tiene ORIGEN y DESTINATARIO y no tiene
 * posición. Ninguna de las cuatro puede con eso sin inventarse un sitio.
 *
 * LA FORMA:
 *
 *     { de }        qué asiento lo dijo (número), o null si lo dice la mesa
 *     { a }         a qué asiento va dirigido, o null si es en voz alta
 *     { que }       de qué tipo: 'apuesta' · 'pregunta' · 'orden' · 'senala'
 *     { valor }     el dato para una máquina (el número apostado, la dirección)
 *     { texto }     la línea corta que lee una persona o un modelo
 *     { sobre }     opcional: a quién o a qué se refiere (id de asiento o zona)
 *     { vigente }   si sigue en pie (la última orden de la guía) o ya se gastó
 *
 * ⚠️ Y LOS DICHOS PASAN POR LA NIEBLA COMO TODO LO DEMÁS.
 *
 * Un dicho se ve si se dijo EN VOZ ALTA, o si lo dijiste TÚ. Lo que otro eligió
 * a solas no se publica jamás — la elección nocturna de shinigami vive en
 * `p.oculta` y sólo la ve quien la hizo. Ya se ha escapado información dos veces
 * en esta casa (la mano del rival, las jugadas legales de otro), las dos en
 * silencio y las dos porque alguien publicó el estado entero «para dibujarlo».
 * `prueba_sustrato.mjs` lo comprueba: ningún asiento ve el dicho secreto de otro.
 *
 * ⚠️ UNA PIEZA PUEDE LLEVAR `id`, Y ESO NO AÑADE ESTRUCTURA: AMPLÍA UNA.
 * ───────────────────────────────────────────────────────────────────────────
 *
 *     { x, y, t, de }          lo mínimo: dónde, qué, de quién
 *     { …, id }                QUIÉN es, cuando el juego necesita distinguirla
 *
 * No es invento: las `zonas` llevan `id` desde el principio —`{id:'dados'}`,
 * `{id:'fincas', de:2}`— y nadie lo discutió. Lo raro era que una mano tuviera
 * identidad y una ficha no.
 *
 * Y hacía falta de verdad. Alisapolis se lo inventó por su cuenta cuando el
 * contrato no lo tenía, y de paso escribió los otros dos campos con otros
 * nombres: `{id, x, y, dueno, tipo}`. El pintor lee `de` y `t`, así que sus
 * cuatro peones salían como DISCOS GRISES IDÉNTICOS — y un betatester escribió
 * «parece que juego yo solo», que yo había leído como un problema de turnos.
 * Un dialecto no se queda en feo: rompe, y rompe callando.
 *
 * QUÉ TIENE QUE CUMPLIR UN `id`, Y POR QUÉ IMPORTA:
 *
 *   · ÚNICO dentro de la partida — dos piezas con el mismo `id` son una sola
 *     para quien las siga;
 *   · ESTABLE entre turnos — si cambia, la pieza deja de ser la misma y todo lo
 *     que dependa de seguirla se rompe.
 *
 * Quién lo necesita, y no es sólo el dibujo:
 *
 *   · el pintor, para animar un movimiento en vez de teletransportar (hoy
 *     tendría que adivinar por cercanía cuál se movió);
 *   · el juego, cuando hay varias piezas iguales del mismo dueño —parchís tiene
 *     cuatro— y hay que decir cuál;
 *   · un agente, para hablar de «la que saqué el turno pasado»;
 *   · `descripcion.js`, que hoy no puede nombrar una pieza concreta;
 *   · y el canon de rol, donde un `Appointment` es *a Being bound to a Seat* —
 *     sin identidad no hay a quién vincular.
 *
 * Es OPCIONAL: un peón de ajedrez no necesita nombre propio y no lo lleva.
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
/**
 * Las casillas que toca UNA jugada, por su nombre.
 *
 * ⚠️ SE EXPORTA PORQUE HACE FALTA PARA JUGADAS QUE YA NO SON LEGALES.
 *
 * `acciones` es un mapa de las legales AHORA, y sirve para ofrecerlas. Pero para
 * subrayar en el tablero lo que ACABA DE PASAR hace falta lo mismo de una jugada
 * que ya se hizo — y ésa, por definición, ya no está en la lista.
 *
 * Podría escribirse otra vez en la mesa, y sería una segunda copia de la regla que
 * traduce `a3b4` a casillas. El día que un juego use otra notación, una de las dos
 * se enteraría y la otra no. Una sola.
 */
export function celdasDeJugada(m, rejilla) {
    if (!rejilla?.ancho || !rejilla?.alto) return null;
    const { ancho, alto } = rejilla;
    // Cada tramo `letra + número` es una casilla. `a3b4` da dos; `e6`, una.
    const trozos = String(m).match(/[a-z]\d+/gi);
    if (!trozos) return null;
    const celdas = [];
    for (const t of trozos) {
        const x = t[0].toLowerCase().charCodeAt(0) - 97;
        const y = alto - Number(t.slice(1));
        if (x < 0 || x >= ancho || y < 0 || y >= alto) return null;
        celdas.push(y * ancho + x);
    }
    return celdas.length ? celdas : null;
}

function accionesDe(rejilla, legales) {
    if (!rejilla?.ancho || !rejilla?.alto || !legales?.length) return null;
    const mapa = {};
    for (const m of legales) {
        const celdas = celdasDeJugada(m, rejilla);
        if (celdas) mapa[String(m)] = celdas;
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
        // De qué color es cada dueño, si el juego lo dijo. Va con las piezas y no
        // con la rejilla porque habla de las piezas — el `patron` sí es del suelo.
        ...(st.colores ? { colores: st.colores } : {}),
        // Marca de que esto viene del adaptador y no del juego. Es lo que
        // `prueba_sustrato.mjs` cuenta para que el número baje con el tiempo.
        derivado: true,
    };
}

/**
 * Nombres legibles de las letras, por juego. Sólo donde no se adivinan.
 *
 * ⚠️ SÓLO CABEN AQUÍ LOS JUEGOS QUE PASAN POR EL ADAPTADOR DE ARRIBA.
 *
 * Bastantes de los que faltaban en el recuento de `fichas.mjs` NO están rotos:
 * publican su PROPIO `sustrato(p)` con su PROPIA `leyenda` ya dentro —flota,
 * sokoban, cripta, defensa, sigilo, frentes, relevo, cabina, nave, pradera,
 * rebano, parchis, oca, generala, canadiense— y `obtenerSustrato()` los sirve
 * sin pasar por aquí, así que una entrada en este mapa no llegaría a leerse
 * nunca en la mesa real. `fichas.mjs` sólo mira el adaptador (`sustratoDe`
 * directo, ver su cabecera), así que a esos el contador los sigue contando
 * como «sin leyenda» aunque el jugador y el agente de visión ya la vean. Es un
 * punto ciego de la MEDIDA, no del juego, y no se arregla aquí sin tocar
 * `rules/*.js`, que está fuera de este encargo.
 *
 * Añadidos el 2026-08-16, comprobados contra `sustratoDe()` con una partida
 * recién empezada de cada uno (ver informe): snake, fagocito, peaton — los
 * tres únicos que quedaban con rejilla real y sin dueño nativo.
 *
 * `mancala` se queda fuera a propósito: su rejilla no lleva códigos, lleva
 * CUENTAS de semillas (0, 4, 9…), y una leyenda por valor numérico tendría que
 * enumerar cada cantidad posible o no decir nada — justo lo que este fichero
 * pide no hacer. Los juegos de cartas (blackjack, poker, brisca, tute,
 * hearts, spades, guerra, gofish, unit, remigio) y `entropy` tampoco tienen
 * `rejilla` — son montones (`zonas`), y forzar una leyenda de tablero donde no
 * hay tablero sería inventar una casilla que no existe.
 */
const LEYENDAS = {
    ajedrez: { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' },
    xiangqi: { p: 'soldado', c: 'cañón', r: 'carro', n: 'caballo', b: 'elefante',
               a: 'consejero', k: 'general' },
    damas: { w: 'peón claro', b: 'peón oscuro' },
    /**
     * ⚠️ MANCALA ERA EL ÚNICO DE LOS 35 SIN LEYENDA, Y ES EL QUE MÁS LA NECESITA.
     *
     * Su tablero son catorce números seguidos y las jugadas son el ÍNDICE del hoyo:
     * `0`…`5` para un lado y `7`…`12` para el otro. Sin decir qué es cada índice, un
     * agente que mire la pantalla ve una fila de cuentas y no puede saber cuál es su
     * lado ni cuál es el granero — y el granero es donde se gana.
     *
     * Los índices 6 y 13 no son hoyos: son los graneros, y por eso se saltan al
     * sembrar. Eso es exactamente lo que una leyenda tiene que decir.
     */
    mancala: { 0: 'tu lado: hoyos 0 a 5, y son tus jugadas',
               6: 'TU GRANERO — lo que caiga aquí puntúa, y caer en él repite turno',
               7: 'el lado del rival: hoyos 7 a 12',
               13: 'el granero del rival — se salta al sembrar' },
    reversi: { w: 'ficha clara', b: 'ficha oscura' },
    go: { n: 'piedra negra', b: 'piedra blanca' },
    // Piezas (campo `t`); la rejilla en sí no lleva muros ni marcas.
    snake: { cabeza: 'tu cabeza', cuerpo: 'tu cuerpo, no lo choques',
              comida: 'cómetela para crecer' },
    // La rejilla SÍ lleva terreno aquí: `1` es el muro que pone `sustratoDe`
    // al leer `maze` (ver comentario «1 = muro» más arriba en este fichero).
    // Los tres fantasmas se distinguen por carácter, no por color — ver
    // `fagocito.js`: cazador va directo a ti, flanco corta por donde vas a
    // estar, errante se mueve al azar.
    fagocito: { 1: 'muro, no se puede cruzar', bolita: 'comida por recoger',
                jugador: 'tu ficha',
                cazador: 'fantasma que viene directo a por ti',
                flanco: 'fantasma que corta por donde vas a estar',
                errante: 'fantasma que se mueve al azar' },
    // Sin muros: la rejilla queda entera en 0 y lo que importa son las piezas.
    // `coche_der`/`coche_izq` son el sentido en que avanza cada coche, no de
    // dónde viene — ver `peaton.js`: fila 0 es la salida, la última es la meta.
    peaton: { jugador: 'tu ficha, cruza de abajo arriba',
              coche_der: 'coche que avanza hacia la derecha',
              coche_izq: 'coche que avanza hacia la izquierda' },
};

/**
 * ¿Tiene este juego sustrato propio, sin pasar por el adaptador?
 * Se usará cuando los módulos empiecen a publicar `sustrato(p)` nativo.
 */
export const tieneSustratoPropio = (reglas) => typeof reglas?.sustrato === 'function';

/**
 * Devuelve el sustrato nativo si existe, y si no lo deriva.
 *
 * ⚠️ Y AQUÍ SE PEGAN LOS `dichos`, EN UN SOLO SITIO Y A PROPÓSITO.
 *
 * Un juego puede publicar lo que dicen sus jugadores de dos maneras: metiéndolo
 * en su `sustrato()` nativo, o declarando un `dichos(p, asiento)` aparte. La
 * segunda existe porque `spades` la necesita: sus apuestas son cuatro números y
 * su dibujo entero lo deriva el adaptador. Obligarle a escribir un sustrato de
 * cartas completo para poder enseñar una apuesta sería cobrar carísimo por algo
 * pequeño, y probablemente no se haría.
 *
 * Pegarlo aquí garantiza además que el campo EXISTE siempre —lista vacía si no
 * hay nada— y eso importa: un campo que a veces no está obliga a todo pintor a
 * comprobarlo, y el que se olvide no dará error, dará una pantalla incompleta.
 *
 * ⚠️ Y SE PASA EL ASIENTO. Esto llamaba `reglas.sustrato(p)` a secas, o sea que
 * SIEMPRE devolvía la vista del asiento 0 aunque el juego tuviera una por silla.
 * Con `dichos` eso deja de ser un detalle: la vista equivocada aquí no es un
 * dibujo raro, es la apuesta de otro en tu pantalla.
 */
export function obtenerSustrato(juego, reglas, p, st, asiento = 0) {
    const base = tieneSustratoPropio(reglas)
        ? { ...reglas.sustrato(p, asiento), derivado: false }
        : sustratoDe(juego, st);
    const propios = typeof reglas?.dichos === 'function'
        ? reglas.dichos(p, asiento)
        : base.dichos;
    return { ...base, dichos: Array.isArray(propios) ? propios : [] };
}
