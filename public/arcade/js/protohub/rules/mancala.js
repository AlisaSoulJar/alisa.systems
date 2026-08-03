/**
 * mancala.js — reglas completas de Mancala (Kalah) para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve el tablero en el formato que ya consumía el visualizador:
 *
 *     state.board = [ p1_0..p1_5, GRANERO_P1, p2_0..p2_5, GRANERO_P2 ]
 *                     0     5        6         7    12       13
 *
 * Las jugadas son el índice del hueco que se siembra: "0".."5" o "7".."12".
 *
 * REGLAS (Kalah, la variante habitual)
 * ------------------------------------
 * · 4 semillas en cada uno de los 12 huecos; los graneros empiezan vacíos.
 * · Se siembra en sentido antihorario, una semilla por hueco, **saltándose el
 *   granero del rival**.
 * · Si la última cae en TU granero, repites turno.
 * · Si la última cae en un hueco VACÍO de tu lado, capturas esa semilla y todas
 *   las del hueco de enfrente.
 * · Acaba cuando un lado se queda sin semillas; el otro se lleva las suyas.
 *
 * POR QUÉ ESTÁ EN EL BENCHMARK
 * ----------------------------
 * Es información perfecta y aritmética pura — sin azar y sin nada oculto. Aquí
 * un agente no puede excusarse en la suerte: si pierde, es que ha contado peor.
 * Eso lo hace el complemento exacto de la brisca, donde media baraja está oculta.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const GRANERO = { 0: 6, 1: 13 };     // jugador → índice de su granero
const HUECOS  = { 0: [0, 1, 2, 3, 4, 5], 1: [7, 8, 9, 10, 11, 12] };
const OPUESTO = (i) => 12 - i;       // hueco de enfrente (solo para los de juego)

function tableroInicial() {
    const b = new Array(14).fill(4);
    b[6] = 0; b[13] = 0;
    return b;
}

const sumaLado = (b, j) => HUECOS[j].reduce((s, i) => s + b[i], 0);

export const mancala = {
    id: 'mancala',
    nombre: 'Mancala',

    nuevaPartida() {
        return { board: tableroInicial(), turno: 0, historial: [] };
    },

    estado(p) {
        const b = p.board;
        const vacio0 = sumaLado(b, 0) === 0;
        const vacio1 = sumaLado(b, 1) === 0;
        const fin = vacio0 || vacio1;

        // Al acabar, cada uno se lleva lo que le quede en su lado.
        let g0 = b[6], g1 = b[13];
        if (fin) { g0 += sumaLado(b, 0); g1 += sumaLado(b, 1); }

        return {
            state: { board: b.slice(), turno: p.turno },
            board: b.slice(),
            turn: p.turno === 0 ? 'white' : 'black',
            legal_moves: fin ? [] : HUECOS[p.turno].filter(i => b[i] > 0).map(String),
            is_check: false,
            is_game_over: fin,
            result: fin ? (g0 > g1 ? 'white' : g1 > g0 ? 'black' : 'draw') : null,
            score: { white: g0, black: g1 },
            // Aquí abren las blancas, así que el camino heredado acertaba —por
            // casualidad, no por diseño. Se hace explícito igual.
            puntos: g0,
        };
    },

    mover(p, jugada) {
        const i = parseInt(jugada, 10);
        if (!HUECOS[p.turno].includes(i)) return false;
        if (p.board[i] <= 0) return false;

        p.historial.push({ board: p.board.slice(), turno: p.turno });

        const b = p.board;
        const miGranero = GRANERO[p.turno];
        const suGranero = GRANERO[1 - p.turno];
        let semillas = b[i];
        b[i] = 0;
        let pos = i;

        while (semillas > 0) {
            pos = (pos + 1) % 14;
            if (pos === suGranero) continue;      // el granero del rival se salta
            b[pos]++;
            semillas--;
        }

        // ¿Captura? Última semilla en hueco vacío (ahora con 1) de mi lado, y
        // con algo enfrente que llevarse.
        if (HUECOS[p.turno].includes(pos) && b[pos] === 1) {
            const frente = OPUESTO(pos);
            if (b[frente] > 0) {
                b[miGranero] += b[frente] + 1;
                b[frente] = 0;
                b[pos] = 0;
            }
        }

        // Caer en tu propio granero da otro turno.
        if (pos !== miGranero) p.turno = 1 - p.turno;
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        p.board = h.board;
        p.turno = h.turno;
        return true;
    },

    /**
     * Rival de casa. Por orden: repetir turno > capturar mucho > el más lejano.
     * No mira más allá de una jugada: deja sitio de sobra por encima.
     */
    sugerencia(p) {
        const movs = HUECOS[p.turno].filter(i => p.board[i] > 0);
        if (!movs.length) return null;

        const miGranero = GRANERO[p.turno];
        let mejor = movs[movs.length - 1], mejorPuntos = -1;

        for (const i of movs) {
            const antes = p.board[miGranero];
            const copia = { board: p.board.slice(), turno: p.turno, historial: [] };
            mancala.mover(copia, String(i));
            const ganado = copia.board[miGranero] - antes;
            const repite = copia.turno === p.turno;
            const puntos = ganado * 2 + (repite ? 10 : 0);
            if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = i; }
        }
        return String(mejor);
    },
};

export { tableroInicial, HUECOS, GRANERO, sumaLado };
