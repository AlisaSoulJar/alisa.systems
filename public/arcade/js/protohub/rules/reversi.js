/**
 * reversi.js — reglas completas de Reversi/Othello para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Habla el mismo formato que ya consumía el visualizador: un FEN con `W`/`B`
 * para las fichas y dígitos para los huecos seguidos.
 *
 *     "8/8/8/3WB3/3BW3/8/8/8 b"
 *
 * Las jugadas son el nombre de la casilla: "d3", "c4"…
 *
 * POR QUÉ ESTE JUEGO IMPORTA EN EL BENCHMARK
 * ------------------------------------------
 * Reversi es engañoso: la estrategia obvia (comer el máximo de fichas) es
 * MALA — te deja sin movilidad y regalas las esquinas. Un agente que solo sepa
 * maximizar lo inmediato pierde contra uno que entienda la posición. Eso lo
 * convierte en un buen separador de agentes, y en muy pocas líneas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const aCasilla = (f, c) => 'abcdefgh'[c] + (8 - f);
const aFC = (s) => [8 - parseInt(s[1], 10), 'abcdefgh'.indexOf(s[0])];

function tableroInicial() {
    // Posición estándar de Othello:
    //     d5 = negra   e5 = blanca
    //     d4 = blanca  e4 = negra
    // Con f=0 arriba (fila 8), d5 es t[3][3] y d4 es t[4][3].
    //
    // La primera versión tenía los cuatro colores INVERTIDOS. El tablero
    // funcionaba igual de bien —las partidas terminaban, no se perdía ninguna
    // ficha— pero la apertura daba las jugadas espejo (c5,d6,e3,f4 en vez de
    // d3,c4,f5,e6). Un error así no rompe nada: te da otro juego parecido, y
    // solo se caza comprobando contra los valores conocidos de la apertura.
    const t = Array.from({ length: 8 }, () => new Array(8).fill(null));
    t[3][3] = 'B'; t[3][4] = 'W';
    t[4][3] = 'W'; t[4][4] = 'B';
    return t;
}

/** Fichas que se voltearían al poner en (f,c). Vacío = jugada ilegal. */
function volteos(t, f, c, color) {
    if (t[f][c]) return [];
    const rival = color === 'B' ? 'W' : 'B';
    const out = [];
    for (const [df, dc] of DIRS) {
        const linea = [];
        let nf = f + df, nc = c + dc;
        while (dentro(nf, nc) && t[nf][nc] === rival) {
            linea.push([nf, nc]);
            nf += df; nc += dc;
        }
        // Solo cuenta si la línea de rivales acaba en una ficha PROPIA.
        if (linea.length && dentro(nf, nc) && t[nf][nc] === color) out.push(...linea);
    }
    return out;
}

function jugadasDe(t, color) {
    const out = [];
    for (let f = 0; f < 8; f++)
        for (let c = 0; c < 8; c++)
            if (volteos(t, f, c, color).length) out.push(aCasilla(f, c));
    return out;
}

function cuenta(t) {
    let W = 0, B = 0;
    for (const fila of t) for (const x of fila) { if (x === 'W') W++; else if (x === 'B') B++; }
    return { W, B };
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
    return filas.join('/') + ' ' + (p.turno === 'B' ? 'b' : 'w');
}

export const reversi = {
    /** A que se juega, para quien no ve el tablero. Lo publica ProtoHub.state. */
    OBJETIVO: 'Objetivo: terminar con MAS fichas tuyas que del rival; cada jugada voltea las que encierras.',

    // CUÁNTAS SILLAS TIENE LA MESA: dos, negras y blancas. Fijo.
    ASIENTOS: 2,

    /**
     * ⚠️ AQUÍ EL COLOR TAMPOCO ES ADORNO.
     *
     * Las fichas del reversi son negras por un lado y blancas por el otro, y VOLTEAR
     * es la jugada entera: lo que hace una partida es cambiar de color las que
     * encierras. Con azul y rojo genéricos se sigue jugando igual, pero se pierde lo
     * único que el tablero cuenta de un vistazo — y el estado ya las llama `B` y `W`.
     *
     * Se dice el nombre, no el hexadecimal: qué tono de blanco hace falta con la luz
     * de esta mesa es problema del pintor. `paleta.js` usa un hueso claro porque el
     * blanco puro pierde el borde de la ficha.
     */
    COLORES: { 0: 'negro', 1: 'blanco' },

    id: 'reversi',
    nombre: 'Reversi',

    /**
     * ⚠️ SU PROPIO SUSTRATO, POR LO MISMO QUE LAS DAMAS.
     *
     * `sustratoDe` reconstruye el tablero desde el FEN y decide el dueño por
     * MAYÚSCULAS —la convención del ajedrez—. El FEN del reversi es `3BW3/3WB3`:
     * las dos letras van en mayúscula porque aquí la letra ES el color. Medido antes
     * de portar la página, que es la lección que me dejaron las damas: las cuatro
     * fichas salían del mismo dueño, y sin distinguir bandos no se puede jugar.
     *
     * Se dice en vez de adivinarse. Y este juego deja de depender del adaptador.
     */
    sustrato(p) {
        const piezas = [];
        for (let f = 0; f < 8; f++) {
            for (let c = 0; c < 8; c++) {
                const x = p.tablero[f][c];
                if (!x) continue;
                piezas.push({ x: c, y: f, t: 'ficha', de: x === 'B' ? 0 : 1 });
            }
        }
        return {
            rejilla: { ancho: 8, alto: 8, celdas: new Array(64).fill(0) },
            piezas,
            zonas: [],
            // Una jugada es UNA casilla: se juega al primer toque. La cuenta es la
            // misma con la que se colocan las fichas aquí arriba.
            acciones: Object.fromEntries(
                jugadasDe(p.tablero, p.turno).map((m) => [
                    m, [(8 - Number(m[1])) * 8 + (m.charCodeAt(0) - 97)],
                ]),
            ),
            leyenda: { ficha: 'ficha' },
            simbolos: { ficha: 'o' },
        };
    },

    nuevaPartida() {
        return { tablero: tableroInicial(), turno: 'B', historial: [], pasesSeguidos: 0 };
    },

    estado(p) {
        const mias = jugadasDe(p.tablero, p.turno);
        const rival = p.turno === 'B' ? 'W' : 'B';
        const suyas = jugadasDe(p.tablero, rival);
        const { W, B } = cuenta(p.tablero);
        // Se acaba cuando NINGUNO puede mover (o no queda hueco).
        const fin = mias.length === 0 && suyas.length === 0;

        return {
            fen: haciaFEN(p),
            turn: p.turno === 'B' ? 'black' : 'white',
            // Si no tienes jugada pero el rival sí, te toca pasar. Se ofrece
            // como acción explícita para que ningún agente se quede colgado
            // sin saber por qué no puede hacer nada.
            legal_moves: mias.length ? mias : (fin ? [] : ['pass']),
            discs: { white: W, black: B },
            is_check: false,
            is_game_over: fin,
            result: fin ? (B > W ? 'black' : W > B ? 'white' : 'draw') : null,
            score: { black: B, white: W },
            // En reversi abren las negras: ése es el asiento que se mide.
            puntos: B,
        };
    },

    mover(p, jugada) {
        if (jugada === 'pass') {
            if (jugadasDe(p.tablero, p.turno).length) return false;  // no puedes pasar si puedes jugar
            p.historial.push({ paso: true, turno: p.turno });
            p.turno = p.turno === 'B' ? 'W' : 'B';
            p.pasesSeguidos++;
            return true;
        }
        if (!/^[a-h][1-8]$/.test(jugada)) return false;
        const [f, c] = aFC(jugada);
        const v = volteos(p.tablero, f, c, p.turno);
        if (!v.length) return false;

        p.historial.push({ f, c, volteadas: v, turno: p.turno });
        p.tablero[f][c] = p.turno;
        for (const [vf, vc] of v) p.tablero[vf][vc] = p.turno;
        p.turno = p.turno === 'B' ? 'W' : 'B';
        p.pasesSeguidos = 0;
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        p.turno = h.turno;
        if (h.paso) { p.pasesSeguidos = Math.max(0, p.pasesSeguidos - 1); return true; }
        const rival = h.turno === 'B' ? 'W' : 'B';
        p.tablero[h.f][h.c] = null;
        for (const [vf, vc] of h.volteadas) p.tablero[vf][vc] = rival;
        return true;
    },

    /**
     * Rival de casa. Coge esquina si puede, evita las casillas de al lado
     * (regalan la esquina) y si no, la que menos fichas voltee.
     *
     * Lo de "menos fichas" no es una errata: en reversi comer mucho pronto es
     * malo — te quedas sin movilidad. Es la trampa clásica del juego, y por eso
     * un agente ingenuo pierde aquí.
     */
    sugerencia(p) {
        const movs = jugadasDe(p.tablero, p.turno);
        if (!movs.length) return p.pasesSeguidos >= 2 ? null : 'pass';

        // ⚠️ ANTES ERA PEOR QUE JUGAR LA PRIMERA CASILLA LEGAL. Y no por hacer
        // lo típico mal, sino por hacer lo CORRECTO a medias: cogía esquina,
        // esquivaba las casillas de al lado y luego minimizaba volteos —que es
        // la jugada de manual en Othello, comer poco pronto conserva movilidad—.
        // Medido: 17 puntos contra los 39 de la política tonta.
        //
        // Minimizar volteos sin mirar una jugada por delante te deja a veces con
        // dos fichas en el tablero, y ahí no hay movilidad que valga: te barren y
        // la partida se acaba en 27 jugadas. La heurística era buena y el
        // horizonte demasiado corto para sostenerla.
        //
        // La solución de manual es la TABLA POSICIONAL: cada casilla vale lo que
        // vale para siempre. La esquina es inamovible (+120); la diagonal de al
        // lado regala la esquina (−40); los bordes son buenos y el centro casi
        // da igual. Y al final, cuando ya no hay futuro que proteger, lo que
        // cuenta son las fichas: se cambia a maximizar volteos.
        const TABLA = [
            [120, -20,  20,   5,   5,  20, -20, 120],
            [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
            [ 20,  -5,  15,   3,   3,  15,  -5,  20],
            [  5,  -5,   3,   3,   3,   3,  -5,   5],
            [  5,  -5,   3,   3,   3,   3,  -5,   5],
            [ 20,  -5,  15,   3,   3,  15,  -5,  20],
            [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
            [120, -20,  20,   5,   5,  20, -20, 120],
        ];

        const vacías = p.tablero.reduce(
            (s, fila) => s + fila.filter(x => !x).length, 0);
        const finalDePartida = vacías <= 10;

        let mejor = movs[0], mejorPuntos = -Infinity;
        for (const m of movs) {
            const [f, c] = aFC(m);
            const n = volteos(p.tablero, f, c, p.turno).length;
            // En el final mandan las fichas; antes, la posición. El desempate va
            // al revés según la fase, que es justo la intuición del juego.
            const puntos = finalDePartida ? n * 10 : TABLA[f][c] * 10 - n;
            if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = m; }
        }
        return mejor;
    },
};

export { jugadasDe, volteos, cuenta, haciaFEN, tableroInicial };
