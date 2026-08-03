/**
 * xiangqi.js — reglas completas de Ajedrez Chino para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve el tablero como lo espera el visualizador:
 *
 *     state.grid[fila][columna]   10 filas × 9 columnas, '' si está vacío
 *     MAYÚSCULA = rojo (abajo, sale primero) · minúscula = negro (arriba)
 *
 *     R torre · N caballo · B elefante · A consejero · K general · C cañón · P soldado
 *
 * Jugadas: origen+destino con columna a–i y fila 0–9, "e6e5".
 *
 * LAS REGLAS RARAS — que son casi todas
 * -------------------------------------
 * · **Cañón (C)**: se mueve como una torre, pero para COMER tiene que saltar
 *   exactamente una pieza. Es la pieza más ajena al ajedrez occidental: mover y
 *   capturar siguen reglas distintas.
 * · **Caballo (N)**: salta como el nuestro, pero **se traba**: si la casilla
 *   ortogonal por la que "sale la pata" está ocupada, no puede.
 * · **Elefante (B)**: dos en diagonal, **no cruza el río**, y se bloquea si el
 *   punto intermedio (su "ojo") está ocupado.
 * · **Consejero (A)** y **General (K)**: encerrados en el palacio de 3×3.
 * · **Soldado (P)**: adelante y nunca atrás; **tras cruzar el río** también de
 *   lado.
 * · **Generales enfrentados**: los dos generales no pueden verse por una
 *   columna despejada. Es una regla sin equivalente, y convierte la columna
 *   central en un arma a distancia.
 *
 * Todo eso hace del xiangqi el mejor separador de la suite para un agente que
 * "sabe ajedrez": aquí la intuición occidental **estorba**.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const FILAS = 10, COLS = 9;
const LETRAS = 'abcdefghi';

const dentro = (r, c) => r >= 0 && r < FILAS && c >= 0 && c < COLS;
const aCasilla = (r, c) => LETRAS[c] + r;
const aRC = (s) => [parseInt(s[1], 10), LETRAS.indexOf(s[0])];
const esRojo = (p) => p && p === p.toUpperCase();
const mismoBando = (a, b) => a && b && esRojo(a) === esRojo(b);

/** Palacio: filas 0-2 para negro (arriba), 7-9 para rojo (abajo); cols 3-5. */
const enPalacio = (r, c, rojo) =>
    c >= 3 && c <= 5 && (rojo ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2));
/** El río parte el tablero: filas 0-4 lado negro, 5-9 lado rojo. */
const enSuLado = (r, rojo) => rojo ? r >= 5 : r <= 4;

const INICIAL = [
    'rnbakabnr',
    '         ',
    ' c     c ',
    'p p p p p',
    '         ',
    '         ',
    'P P P P P',
    ' C     C ',
    '         ',
    'RNBAKABNR',
];

function tableroInicial() {
    return INICIAL.map(f => f.split('').map(ch => ch === ' ' ? '' : ch));
}

// ─── generación de jugadas ──────────────────────────────────────

function pseudolegales(g, rojo) {
    const out = [];
    const añade = (r, c, nr, nc) => {
        if (!dentro(nr, nc)) return;
        if (mismoBando(g[nr][nc], g[r][c])) return;
        out.push(aCasilla(r, c) + aCasilla(nr, nc));
    };

    for (let r = 0; r < FILAS; r++) {
        for (let c = 0; c < COLS; c++) {
            const p = g[r][c];
            if (!p || esRojo(p) !== rojo) continue;
            const t = p.toUpperCase();

            if (t === 'R' || t === 'C') {
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    let nr = r + dr, nc = c + dc;
                    let saltada = false;
                    while (dentro(nr, nc)) {
                        const ocupa = g[nr][nc];
                        if (t === 'R') {
                            if (!ocupa) añade(r, c, nr, nc);
                            else { añade(r, c, nr, nc); break; }
                        } else {
                            // El cañón: avanza libre por casillas vacías, pero
                            // solo come DESPUÉS de saltar exactamente una pieza.
                            if (!saltada) {
                                if (!ocupa) añade(r, c, nr, nc);
                                else saltada = true;
                            } else if (ocupa) {
                                añade(r, c, nr, nc);
                                break;
                            }
                        }
                        nr += dr; nc += dc;
                    }
                }
            } else if (t === 'N') {
                // Cada salto tiene su "pata": si está ocupada, el caballo se traba.
                const saltos = [
                    [-2,-1,-1,0], [-2,1,-1,0], [2,-1,1,0], [2,1,1,0],
                    [-1,-2,0,-1], [1,-2,0,-1], [-1,2,0,1], [1,2,0,1],
                ];
                for (const [dr, dc, pr, pc] of saltos) {
                    if (!dentro(r + pr, c + pc) || g[r + pr][c + pc]) continue;   // trabado
                    añade(r, c, r + dr, c + dc);
                }
            } else if (t === 'B') {
                for (const [dr, dc] of [[-2,-2],[-2,2],[2,-2],[2,2]]) {
                    const nr = r + dr, nc = c + dc;
                    if (!dentro(nr, nc)) continue;
                    if (!enSuLado(nr, rojo)) continue;                    // no cruza el río
                    if (g[r + dr/2][c + dc/2]) continue;                  // ojo tapado
                    añade(r, c, nr, nc);
                }
            } else if (t === 'A') {
                for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
                    const nr = r + dr, nc = c + dc;
                    if (dentro(nr, nc) && enPalacio(nr, nc, rojo)) añade(r, c, nr, nc);
                }
            } else if (t === 'K') {
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = r + dr, nc = c + dc;
                    if (dentro(nr, nc) && enPalacio(nr, nc, rojo)) añade(r, c, nr, nc);
                }
            } else if (t === 'P') {
                const adelante = rojo ? -1 : 1;      // el rojo sube (filas menores)
                añade(r, c, r + adelante, c);
                // Tras cruzar el río, también de lado. Nunca hacia atrás.
                if (!enSuLado(r, rojo)) { añade(r, c, r, c - 1); añade(r, c, r, c + 1); }
            }
        }
    }
    return out;
}

function buscaGeneral(g, rojo) {
    const K = rojo ? 'K' : 'k';
    for (let r = 0; r < FILAS; r++)
        for (let c = 0; c < COLS; c++)
            if (g[r][c] === K) return [r, c];
    return null;
}

/**
 * ¿Se miran los dos generales por una columna despejada?
 * Es ilegal dejar esa posición: cuenta como estar en jaque.
 */
function generalesEnfrentados(g) {
    const a = buscaGeneral(g, true), b = buscaGeneral(g, false);
    if (!a || !b || a[1] !== b[1]) return false;
    const c = a[1];
    const [r1, r2] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]];
    for (let r = r1 + 1; r < r2; r++) if (g[r][c]) return false;
    return true;
}

function enJaque(g, rojo) {
    if (generalesEnfrentados(g)) return true;
    const rey = buscaGeneral(g, rojo);
    if (!rey) return true;                                  // sin general, perdido
    const destino = aCasilla(rey[0], rey[1]);
    return pseudolegales(g, !rojo).some(m => m.slice(2) === destino);
}

function aplica(g, jugada) {
    const [r1, c1] = aRC(jugada.slice(0, 2));
    const [r2, c2] = aRC(jugada.slice(2));
    const ng = g.map(f => f.slice());
    ng[r2][c2] = ng[r1][c1];
    ng[r1][c1] = '';
    return ng;
}

/** Legales = pseudolegales que no dejan a tu general en jaque (ni enfrentado). */
function legales(g, rojo) {
    return pseudolegales(g, rojo).filter(m => !enJaque(aplica(g, m), rojo));
}

const gridAFEN = (g) => g.map(f => {
    let s = '', v = 0;
    for (const x of f) { if (x) { if (v) { s += v; v = 0; } s += x; } else v++; }
    return v ? s + v : s;
}).join('/');

/**
 * Puntuación para el banco de pruebas, desde el bando ROJO (el que abre).
 * Mismo agujero que tenía el ajedrez: se jugaba, era determinista y se
 * verificaba, pero `estado()` no publicaba marcador y valía 0 siempre.
 * Los valores son los mismos que usa el rival de casa unas líneas más abajo.
 */
const VALOR_PIEZA = { P: 1, A: 2, B: 2, N: 4, C: 4.5, R: 9, K: 0 };

function marcadorRojo(g, resultado) {
    let material = 0;
    for (const fila of g) {
        for (const c of fila) {
            if (!c) continue;
            const v = VALOR_PIEZA[c.toUpperCase()] ?? 0;
            material += esRojo(c) ? v : -v;
        }
    }
    const fin = resultado === 'white' ? 1000 : resultado === 'black' ? -1000 : 0;
    return fin + material;
}

export const xiangqi = {
    id: 'xiangqi',
    nombre: 'Xiangqi',

    nuevaPartida() {
        return { grid: tableroInicial(), rojoJuega: true, historial: [] };
    },

    estado(p) {
        const movs = legales(p.grid, p.rojoJuega);
        const jaque = enJaque(p.grid, p.rojoJuega);
        const mate = movs.length === 0 && jaque;
        const ahogado = movs.length === 0 && !jaque;   // en xiangqi ahogado = PIERDE
        const fin = movs.length === 0;

        return {
            state: { grid: p.grid.map(f => f.slice()), fen: gridAFEN(p.grid) },
            grid: p.grid.map(f => f.slice()),
            fen: gridAFEN(p.grid) + ' ' + (p.rojoJuega ? 'w' : 'b'),
            turn: p.rojoJuega ? 'white' : 'black',   // rojo ocupa el papel de "blancas"
            legal_moves: movs,
            is_check: jaque,
            is_checkmate: mate,
            is_game_over: fin,
            // Ojo: aquí quedarse sin jugadas PIERDE, no es tablas como en ajedrez.
            result: fin ? (p.rojoJuega ? 'black' : 'white') : null,
            ahogado,
            score: marcadorRojo(p.grid, fin ? (p.rojoJuega ? 'black' : 'white') : null),
            puntos: marcadorRojo(p.grid, fin ? (p.rojoJuega ? 'black' : 'white') : null),
        };
    },

    mover(p, jugada) {
        if (!legales(p.grid, p.rojoJuega).includes(jugada)) return false;
        p.historial.push({ grid: p.grid.map(f => f.slice()), rojoJuega: p.rojoJuega });
        p.grid = aplica(p.grid, jugada);
        p.rojoJuega = !p.rojoJuega;
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        p.grid = h.grid;
        p.rojoJuega = h.rojoJuega;
        return true;
    },

    /** Rival de casa: captura lo más valioso que pueda; si no, jugada al azar. */
    sugerencia(p) {
        const movs = legales(p.grid, p.rojoJuega);
        if (!movs.length) return null;
        const valor = { P: 1, A: 2, B: 2, N: 4, C: 4.5, R: 9, K: 0 };
        let mejor = movs[0], mejorV = -1;
        for (const m of movs) {
            const [r2, c2] = aRC(m.slice(2));
            const obj = p.grid[r2][c2];
            const v = obj ? valor[obj.toUpperCase()] ?? 0 : 0;
            if (v > mejorV) { mejorV = v; mejor = m; }
        }
        // ⚠️ Mismo arreglo que en `ajedrez.js`: aquí había un `Math.random()`
        // que hacía al rival de casa impredecible. Misma semilla, partida
        // distinta — y entonces dos ejecuciones de la misma política no se
        // pueden comparar. La elección sale del número de jugada.
        if (mejorV > 0) return mejor;
        let h = ((p.historial?.length ?? 0) + 0x9E3779B9) >>> 0;
        h = (Math.imul(h ^ (h >>> 15), 0x85EBCA6B)) >>> 0;
        return movs[(h >>> 0) % movs.length];
    },
};

export { legales, pseudolegales, enJaque, generalesEnfrentados, tableroInicial, aplica, aRC, aCasilla };
