/**
 * go.js — reglas completas de Go (19×19) para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve el tablero como lo espera el visualizador:
 *
 *     state.board[fila][columna]   0 = vacío · 1 = negras · 2 = blancas
 *
 * Las jugadas son "d16" (columna a–s, fila 1–19) o "pass".
 *
 * LO QUE TIENE MIGA EN EL GO
 * --------------------------
 * Colocar una piedra es trivial; lo que hay que hacer bien es el resto:
 *
 * · **Libertades** — un grupo vive mientras toque alguna intersección vacía.
 *   Se calcula con inundación sobre las piedras conectadas en ortogonal.
 * · **Captura** — al poner una piedra se miran PRIMERO los grupos rivales
 *   adyacentes; los que se queden sin libertades se retiran.
 * · **Suicidio** — es ilegal quedarte sin libertades… salvo que al hacerlo
 *   captures, porque entonces la captura te las devuelve. El orden importa.
 * · **Ko** — no puedes recrear la posición inmediatamente anterior. Sin esta
 *   regla, dos jugadores pueden recapturarse la misma piedra eternamente y la
 *   partida no termina jamás.
 *
 * PUNTUACIÓN
 * ----------
 * Área (regla china): piedras en el tablero + territorio rodeado en exclusiva.
 * Se elige esta y no la japonesa porque es **calculable sin acuerdo previo
 * sobre piedras muertas** — y un benchmark no puede depender de que dos agentes
 * se pongan de acuerdo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const N = 19;
const LETRAS = 'abcdefghijklmnopqrs';        // 19 letras, sin saltarse la i
const VACIO = 0, NEGRAS = 1, BLANCAS = 2;

const dentro = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const aCasilla = (r, c) => LETRAS[c] + (N - r);
const aRC = (s) => [N - parseInt(s.slice(1), 10), LETRAS.indexOf(s[0])];
const rival = (color) => color === NEGRAS ? BLANCAS : NEGRAS;

function tableroVacio() {
    return Array.from({ length: N }, () => new Array(N).fill(VACIO));
}

/** Grupo conectado y sus libertades, por inundación. */
function grupo(b, r, c) {
    const color = b[r][c];
    if (color === VACIO) return { piedras: [], libertades: 0 };
    const vistas = new Set([r * N + c]);
    const pila = [[r, c]];
    const piedras = [];
    const libres = new Set();

    while (pila.length) {
        const [pr, pc] = pila.pop();
        piedras.push([pr, pc]);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nr = pr + dr, nc = pc + dc;
            if (!dentro(nr, nc)) continue;
            const v = b[nr][nc];
            if (v === VACIO) { libres.add(nr * N + nc); continue; }
            if (v !== color) continue;
            const k = nr * N + nc;
            if (vistas.has(k)) continue;
            vistas.add(k);
            pila.push([nr, nc]);
        }
    }
    return { piedras, libertades: libres.size };
}

/**
 * Intenta poner una piedra. Devuelve el tablero resultante y las capturas, o
 * null si la jugada es ilegal.
 *
 * El ORDEN es lo importante: se coloca, se capturan los grupos rivales sin
 * libertades, y SOLO ENTONCES se comprueba el suicidio. Al revés, una jugada
 * legal que captura parecería suicidio.
 */
function simular(b, r, c, color) {
    if (!dentro(r, c) || b[r][c] !== VACIO) return null;

    const nb = b.map(f => f.slice());
    nb[r][c] = color;

    let capturadas = 0;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (!dentro(nr, nc) || nb[nr][nc] !== rival(color)) continue;
        const g = grupo(nb, nr, nc);
        if (g.libertades === 0) {
            for (const [gr, gc] of g.piedras) nb[gr][gc] = VACIO;
            capturadas += g.piedras.length;
        }
    }

    // Suicidio: solo ahora, cuando las capturas ya han liberado sitio.
    if (grupo(nb, r, c).libertades === 0) return null;

    return { tablero: nb, capturadas };
}

const huella = (b) => b.map(f => f.join('')).join('');

function jugadasDe(p) {
    const out = [];
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (p.tablero[r][c] !== VACIO) continue;
            const sim = simular(p.tablero, r, c, p.turno);
            if (!sim) continue;
            if (p.ko && huella(sim.tablero) === p.ko) continue;   // regla de ko
            out.push(aCasilla(r, c));
        }
    }
    out.push('pass');   // pasar es SIEMPRE legal
    return out;
}

/**
 * Puntuación por área (china): piedras propias + territorio rodeado en
 * exclusiva por un color. Las zonas vacías tocadas por ambos no son de nadie.
 */
function puntuar(b) {
    let n = 0, bl = 0;
    const visto = new Set();
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const v = b[r][c];
            if (v === NEGRAS) { n++; continue; }
            if (v === BLANCAS) { bl++; continue; }
            const k = r * N + c;
            if (visto.has(k)) continue;

            // Inundar la región vacía y ver qué colores la tocan.
            const pila = [[r, c]], region = [];
            const toca = new Set();
            visto.add(k);
            while (pila.length) {
                const [pr, pc] = pila.pop();
                region.push([pr, pc]);
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = pr + dr, nc = pc + dc;
                    if (!dentro(nr, nc)) continue;
                    const vv = b[nr][nc];
                    if (vv !== VACIO) { toca.add(vv); continue; }
                    const kk = nr * N + nc;
                    if (visto.has(kk)) continue;
                    visto.add(kk);
                    pila.push([nr, nc]);
                }
            }
            if (toca.size === 1) {
                if (toca.has(NEGRAS)) n += region.length; else bl += region.length;
            }
        }
    }
    return { negras: n, blancas: bl };
}

export const go = {
    /** A que se juega, para quien no ve el tablero. Lo publica ProtoHub.state. */
    OBJETIVO: 'Objetivo: rodear mas territorio que el rival; una piedra sin libertades se captura.',

    id: 'go',
    nombre: 'Go',

    nuevaPartida(opts = {}) {
        return {
            tablero: tableroVacio(),
            turno: NEGRAS,                 // en go salen negras
            ko: null,
            pasesSeguidos: 0,
            capturas: { 1: 0, 2: 0 },
            komi: opts.komi ?? 6.5,        // compensación a blancas por jugar segundas
            historial: [],
        };
    },

    estado(p) {
        const fin = p.pasesSeguidos >= 2;
        const area = puntuar(p.tablero);
        const pn = area.negras;
        const pb = area.blancas + p.komi;

        return {
            state: { board: p.tablero.map(f => f.slice()) },
            board: p.tablero.map(f => f.slice()),
            turn: p.turno === NEGRAS ? 'black' : 'white',
            legal_moves: fin ? [] : jugadasDe(p),
            is_check: false,
            is_game_over: fin,
            result: fin ? (pn > pb ? 'black' : pb > pn ? 'white' : 'draw') : null,
            score: { black: pn, white: pb },
            // El asiento medido es el que ABRE, y en go abren las negras. Sin
            // este escalar, el normalizador del verificador cogía `white` y la
            // tabla publicaba el marcador del rival. Ver `Verificador.js`.
            puntos: pn,
            capturas: { black: p.capturas[NEGRAS], white: p.capturas[BLANCAS] },
            komi: p.komi,
        };
    },

    mover(p, jugada) {
        if (jugada === 'pass') {
            p.historial.push({ tablero: p.tablero.map(f => f.slice()), turno: p.turno,
                               ko: p.ko, pases: p.pasesSeguidos, capturas: { ...p.capturas } });
            p.pasesSeguidos++;
            p.ko = null;                   // pasar deshace el ko
            p.turno = rival(p.turno);
            return true;
        }
        if (!/^[a-s](1[0-9]|[1-9])$/.test(jugada)) return false;
        const [r, c] = aRC(jugada);
        const sim = simular(p.tablero, r, c, p.turno);
        if (!sim) return false;
        if (p.ko && huella(sim.tablero) === p.ko) return false;

        p.historial.push({ tablero: p.tablero.map(f => f.slice()), turno: p.turno,
                           ko: p.ko, pases: p.pasesSeguidos, capturas: { ...p.capturas } });

        // El ko guarda la posición ANTERIOR: no se puede volver a ella.
        p.ko = sim.capturadas === 1 ? huella(p.tablero) : null;
        p.tablero = sim.tablero;
        p.capturas[p.turno] += sim.capturadas;
        p.pasesSeguidos = 0;
        p.turno = rival(p.turno);
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        p.tablero = h.tablero;
        p.turno = h.turno;
        p.ko = h.ko;
        p.pasesSeguidos = h.pases;
        p.capturas = h.capturas;
        return true;
    },

    /**
     * Rival de casa. Prioriza capturar y salvar grupos en atari (una libertad),
     * y si no hay urgencia juega cerca de lo que ya hay en vez de al azar —
     * jugar suelto en un 19×19 es la forma más rápida de perder.
     */
    sugerencia(p) {
        const movs = jugadasDe(p).filter(m => m !== 'pass');
        if (!movs.length) return 'pass';

        let mejor = null, mejorPuntos = -Infinity;
        for (const m of movs.length > 120 ? muestra(movs, 120) : movs) {
            const [r, c] = aRC(m);
            const sim = simular(p.tablero, r, c, p.turno);
            if (!sim) continue;
            let puntos = sim.capturadas * 12;

            // ¿Me salva de un atari? (algún grupo propio pasa de 1 libertad a más)
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nr = r + dr, nc = c + dc;
                if (!dentro(nr, nc)) continue;
                if (p.tablero[nr][nc] === p.turno && grupo(p.tablero, nr, nc).libertades === 1) puntos += 8;
                if (p.tablero[nr][nc] === rival(p.turno) && grupo(p.tablero, nr, nc).libertades === 1) puntos += 6;
                if (p.tablero[nr][nc] !== VACIO) puntos += 1;   // no jugar suelto
            }
            // Ligera preferencia por no pegarse al borde en la apertura.
            const borde = Math.min(r, c, N - 1 - r, N - 1 - c);
            puntos += borde === 0 ? -3 : borde >= 2 ? 1 : 0;

            if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = m; }
        }

        // ⚠️ SIN ESTO LA PARTIDA NO TERMINA NUNCA.
        // En go casi siempre quedan jugadas legales —hay 361 puntos—, así que
        // un rival que solo pasa "cuando no puede mover" no pasa jamás: las 30
        // partidas de prueba se atascaron todas en el tope de movimientos.
        // Se pasa cuando ya no queda nada constructivo: ni capturas, ni grupos
        // en apuros, ni contacto con piedras. Eso es también lo que hace un
        // humano — dejar de rellenar su propio territorio.
        if (mejorPuntos <= 0) return 'pass';
        return mejor ?? 'pass';
    },
};

/** Muestra determinista de n elementos, para no evaluar las 361 cada turno. */
function muestra(arr, n) {
    const paso = Math.max(1, Math.floor(arr.length / n));
    const out = [];
    for (let i = 0; i < arr.length && out.length < n; i += paso) out.push(arr[i]);
    return out;
}

export { grupo, simular, puntuar, jugadasDe, tableroVacio, aCasilla, aRC, N };
