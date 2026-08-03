/**
 * damas.js — reglas completas de Damas (8×8) para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve un FEN al estilo del de reversi, que es el que ya entiende el resto
 * del arcade: 8 filas separadas por `/`, dígitos para los huecos seguidos y
 *
 *     w = peón blanco    W = dama blanca
 *     b = peón negro     B = dama negra
 *
 *     "1b1b1b1b/b1b1b1b1/1b1b1b1b/8/8/w1w1w1w1/1w1w1w1w/w1w1w1w1 w"
 *
 * Las jugadas son origen+destino: "c3d4". Una captura múltiple se escribe
 * encadenando las casillas: "c3e5g7".
 *
 * REGLAS
 * ------
 * · Los peones avanzan en diagonal hacia el lado contrario; las damas, en las
 *   cuatro diagonales.
 * · **Comer es OBLIGATORIO** — si hay captura disponible, no puedes hacer otra
 *   cosa. Y si tras comer puedes seguir comiendo, sigues.
 * · Llegar a la última fila corona: el peón pasa a dama.
 * · Pierde quien se queda sin piezas o sin jugadas.
 *
 * POR QUÉ ESTÁ EN EL BENCHMARK
 * ----------------------------
 * La obligación de comer le da la vuelta al juego: una captura que parece
 * regalada puede ser una trampa, porque el rival te OBLIGA a entrar. Un agente
 * que solo mire "material ganado" cae una y otra vez. Es el juego más barato de
 * la suite para castigar la codicia a un solo movimiento de profundidad.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const aCasilla = (f, c) => 'abcdefgh'[c] + (8 - f);
const aFC = (s) => [8 - parseInt(s[1], 10), 'abcdefgh'.indexOf(s[0])];
const esBlanca = (p) => p === 'w' || p === 'W';
const esDama = (p) => p === 'W' || p === 'B';
const mismoBando = (a, b) => a && b && esBlanca(a) === esBlanca(b);

function tableroInicial() {
    const t = Array.from({ length: 8 }, () => new Array(8).fill(null));
    for (let f = 0; f < 3; f++)
        for (let c = 0; c < 8; c++)
            if ((f + c) % 2 === 1) t[f][c] = 'b';        // negras arriba
    for (let f = 5; f < 8; f++)
        for (let c = 0; c < 8; c++)
            if ((f + c) % 2 === 1) t[f][c] = 'w';        // blancas abajo
    return t;
}

/** Direcciones en las que puede AVANZAR una pieza (sin capturar). */
function dirsDe(pieza) {
    if (esDama(pieza)) return [[-1,-1],[-1,1],[1,-1],[1,1]];
    return esBlanca(pieza) ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
}

/**
 * Todas las cadenas de captura que salen de (f,c). Devuelve rutas completas:
 * cada una es la lista de casillas por las que pasa la pieza.
 *
 * Se explora en profundidad porque una captura puede encadenar varias, y en
 * damas **hay que seguir comiendo mientras se pueda**.
 */
function capturasDesde(t, f, c, pieza, visitadas = []) {
    const rutas = [];
    // Al capturar, incluso el peón puede hacerlo en las cuatro diagonales en
    // muchas reglas; aquí se mantiene la restricción del peón (hacia delante),
    // que es la variante más extendida en el ajedrez de damas anglosajón.
    for (const [df, dc] of dirsDe(pieza)) {
        const mf = f + df, mc = c + dc;            // casilla del rival
        const df2 = f + 2 * df, dc2 = c + 2 * dc;  // casilla de aterrizaje
        if (!dentro(df2, dc2)) continue;
        const victima = t[mf][mc];
        if (!victima || mismoBando(victima, pieza)) continue;
        if (t[df2][dc2]) continue;                 // el aterrizaje debe estar libre
        if (visitadas.some(([vf, vc]) => vf === mf && vc === mc)) continue;  // no recomer

        // Simular el salto para buscar continuaciones.
        const guardada = t[mf][mc];
        t[mf][mc] = null; t[f][c] = null; t[df2][dc2] = pieza;
        const sigue = capturasDesde(t, df2, dc2, pieza, [...visitadas, [mf, mc]]);
        t[df2][dc2] = null; t[f][c] = pieza; t[mf][mc] = guardada;

        if (sigue.length) {
            for (const r of sigue) rutas.push([[df2, dc2], ...r]);
        } else {
            rutas.push([[df2, dc2]]);
        }
    }
    return rutas;
}

function jugadasDe(t, blancas) {
    const capturas = [], simples = [];
    for (let f = 0; f < 8; f++) {
        for (let c = 0; c < 8; c++) {
            const p = t[f][c];
            if (!p || esBlanca(p) !== blancas) continue;

            for (const ruta of capturasDesde(t, f, c, p)) {
                capturas.push(aCasilla(f, c) + ruta.map(([rf, rc]) => aCasilla(rf, rc)).join(''));
            }
            for (const [df, dc] of dirsDe(p)) {
                const nf = f + df, nc = c + dc;
                if (dentro(nf, nc) && !t[nf][nc]) simples.push(aCasilla(f, c) + aCasilla(nf, nc));
            }
        }
    }
    // COMER ES OBLIGATORIO: si hay capturas, las simples no existen.
    return capturas.length ? capturas : simples;
}

function haciaFEN(p) {
    const filas = p.tablero.map(fila => {
        let s = '', vacias = 0;
        for (const x of fila) {
            if (x) { if (vacias) { s += vacias; vacias = 0; } s += x; }
            else vacias++;
        }
        if (vacias) s += vacias;
        return s;
    });
    return filas.join('/') + ' ' + (p.blancasJuegan ? 'w' : 'b');
}

/** ¿Esta jugada come? Come si el primer paso salta dos casillas. */
function esCaptura(jugada) {
    if (!jugada) return false;
    const pasos = jugada.match(/[a-h][1-8]/g);
    if (!pasos || pasos.length < 2) return false;
    const [f1, c1] = aFC(pasos[0]);
    const [f2, c2] = aFC(pasos[1]);
    return Math.abs(c2 - c1) === 2 && Math.abs(f2 - f1) === 2;
}

const cuenta = (t) => {
    let w = 0, b = 0;
    for (const fila of t) for (const x of fila) { if (!x) continue; esBlanca(x) ? w++ : b++; }
    return { w, b };
};

/**
 * Puntuación para el banco de pruebas, desde las BLANCAS. NO es regla de damas.
 *
 * ⚠️ Mismo agujero que el ajedrez y el xiangqi: las damas se jugaban, eran
 * deterministas y se verificaban, pero `estado()` no publicaba marcador y
 * `puntuacionDe()` devolvía 0 en toda partida, jugara quien jugara. Tres juegos
 * de tablero con el mismo fallo, y ninguna de las pruebas que ya existían lo
 * veía: todas comprobaban que el juego FUNCIONA, ninguna que MIDE.
 *
 * Una dama vale por dos peones: coronar es el objetivo intermedio del juego y
 * un marcador que no lo note premia igual al que corona y al que no.
 */
const marcadorBlancas = (t, ganador) => {
    let material = 0;
    for (const fila of t) for (const x of fila) {
        if (!x) continue;
        const v = (x === x.toUpperCase()) ? 2 : 1;      // mayúscula = dama
        material += esBlanca(x) ? v : -v;
    }
    const fin = ganador === 'white' ? 1000 : ganador === 'black' ? -1000 : 0;
    return fin + material;
};

export const damas = {
    id: 'checkers',
    nombre: 'Damas',

    nuevaPartida() {
        return { tablero: tableroInicial(), blancasJuegan: true, historial: [] };
    },

    estado(p) {
        const movs = jugadasDe(p.tablero, p.blancasJuegan);
        const { w, b } = cuenta(p.tablero);
        const fin = movs.length === 0 || w === 0 || b === 0;
        // Pierde quien no puede mover: gana el que TIENE el turno siguiente.
        const ganador = !fin ? null
            : (w === 0 || (movs.length === 0 && p.blancasJuegan)) ? 'black' : 'white';

        return {
            fen: haciaFEN(p),
            turn: p.blancasJuegan ? 'white' : 'black',
            legal_moves: movs,
            is_check: false,
            is_game_over: fin,
            result: fin ? ganador : null,
            pieces: { white: w, black: b },
            // Ayuda a los agentes de lenguaje: saber que estás OBLIGADO a comer
            // cambia por completo la lectura de la posición.
            //
            // OJO: la primera versión miraba `movs[0].length > 4`, y una captura
            // simple ("c3e5") mide exactamente lo mismo que un avance ("a3b4"),
            // así que el aviso salía en falso justo cuando más falta hacía.
            // Una captura se reconoce porque SALTA: dos columnas de distancia.
            captura_obligada: esCaptura(movs[0]),
            score: marcadorBlancas(p.tablero, fin ? ganador : null),
            puntos: marcadorBlancas(p.tablero, fin ? ganador : null),
        };
    },

    mover(p, jugada) {
        if (!jugadasDe(p.tablero, p.blancasJuegan).includes(jugada)) return false;

        const pasos = jugada.match(/[a-h][1-8]/g);
        const t = p.tablero;
        p.historial.push({ tablero: t.map(f => f.slice()), blancasJuegan: p.blancasJuegan });

        let [f, c] = aFC(pasos[0]);
        let pieza = t[f][c];
        t[f][c] = null;

        for (let i = 1; i < pasos.length; i++) {
            const [nf, nc] = aFC(pasos[i]);
            // Si el salto es de dos, hay una víctima en medio.
            if (Math.abs(nf - f) === 2) t[(f + nf) / 2][(c + nc) / 2] = null;
            f = nf; c = nc;
        }

        // Coronación: llegar a la última fila del rival.
        if (!esDama(pieza) && ((esBlanca(pieza) && f === 0) || (!esBlanca(pieza) && f === 7))) {
            pieza = esBlanca(pieza) ? 'W' : 'B';
        }
        t[f][c] = pieza;
        p.blancasJuegan = !p.blancasJuegan;
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        p.tablero = h.tablero;
        p.blancasJuegan = h.blancasJuegan;
        return true;
    },

    /**
     * Rival de casa: come lo máximo posible y, en igualdad, avanza para coronar.
     * Es deliberadamente codicioso — y en damas la codicia se paga, que es
     * justo lo que queremos que un buen agente demuestre saber.
     *
     * ⚠️ NO CONTABA LAS CAPTURAS. Hacía `comidas = pasos.length - 1`, y eso vale
     * 1 tanto para una captura simple («c3e5») como para un avance cualquiera
     * («a3b4»): las dos son dos casillas de texto. Con todas las jugadas
     * empatadas a una comida, decidía el desempate de avance y el resultado era
     * casi siempre la primera de la lista — o sea, **el rival de casa jugaba
     * igual que la política tonta**, y el calibrador lo cazó: damas daba el
     * mismo marcador exacto con las dos.
     *
     * Y lo mejor: este error EXACTO está documentado y arreglado veinte líneas
     * más arriba, en `captura_obligada`. Se corrigió en un sitio y no en el
     * otro. Por eso existe `esCaptura()` — una captura se reconoce porque SALTA,
     * no por lo larga que sea la cadena.
     */
    sugerencia(p) {
        const movs = jugadasDe(p.tablero, p.blancasJuegan);
        if (!movs.length) return null;
        let mejor = movs[0], mejorPuntos = -Infinity;
        for (const m of movs) {
            const pasos = m.match(/[a-h][1-8]/g);
            const comidas = esCaptura(m) ? pasos.length - 1 : 0;
            const [ff] = aFC(pasos[pasos.length - 1]);
            const avance = p.blancasJuegan ? (7 - ff) : ff;   // más cerca de coronar
            let puntos = comidas * 10 + avance;

            // ⚠️ UN PLY DE SEGURIDAD — y no es un adorno, era la diferencia
            // entre tener rival de casa y no tenerlo.
            // Con sólo capturas y avance, todas las jugadas empataban muy a
            // menudo, y como el desempate es `>` estricto se quedaba la primera
            // de la lista. Para las NEGRAS eso daba algo distinto; para las
            // BLANCAS, el generador ya devuelve ordenadas las más avanzadas, así
            // que el «heurístico» coincidía con la primera jugada legal **en las
            // 600 jugadas de la partida, sin una sola discrepancia**. Es decir:
            // el rival de casa de las blancas era la política tonta con otro
            // nombre, y por eso damas salía con el mismo marcador exacto con las
            // dos políticas.
            //
            // Mirar una jugada por delante rompe los empates por una razón de
            // verdad, y de paso es la lección del propio juego: en damas la
            // codicia se paga.
            if (damas.mover(p, m)) {
                const réplicas = jugadasDe(p.tablero, p.blancasJuegan);
                if (réplicas.length && esCaptura(réplicas[0])) {
                    const saltos = réplicas[0].match(/[a-h][1-8]/g).length - 1;
                    puntos -= 10 * saltos;
                }
                damas.deshacer(p);
            }

            if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = m; }
        }
        return mejor;
    },
};

export { jugadasDe, tableroInicial, haciaFEN, cuenta, esCaptura };
