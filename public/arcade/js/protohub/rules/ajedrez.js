/**
 * ajedrez.js — reglas completas de ajedrez para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Sin dependencias. Habla FEN y jugadas UCI ("e2e4", "e7e8q"), que es
 * exactamente lo que ya consumía el visualizador cuando hablaba con el hub:
 *
 *     data.fen · data.turn · data.legal_moves · data.is_check · data.is_game_over
 *
 * Está TODO lo que hace falta para que una partida sea legal de verdad:
 * movimiento de las seis piezas, seguridad del rey (no puedes dejarte en jaque),
 * enroque corto y largo con sus condiciones, captura al paso, coronación,
 * jaque mate, ahogado, regla de las 50 jugadas y material insuficiente.
 *
 * REPRESENTACIÓN
 * --------------
 * Tablero de 64 casillas, índice 0 = a8 y 63 = h1 (el mismo orden en que se lee
 * un FEN, para que la conversión sea directa y no haya que darle la vuelta).
 * Piezas en notación FEN: mayúsculas blancas (PNBRQK), minúsculas negras.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const esBlanca = (p) => p && p === p.toUpperCase();
const mismoBando = (a, b) => a && b && esBlanca(a) === esBlanca(b);

const fila = (i) => i >> 3;          // 0 = octava fila (arriba)
const col = (i) => i & 7;            // 0 = columna a
const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const idx = (f, c) => f * 8 + c;

/** "e4" → índice, y al revés. */
const aCasilla = (i) => 'abcdefgh'[col(i)] + (8 - fila(i));
const aIndice = (s) => idx(8 - parseInt(s[1], 10), 'abcdefgh'.indexOf(s[0]));

// ─── FEN ────────────────────────────────────────────────────────

function desdeFEN(fen) {
    const [tablero, turno, enroques, alPaso, medias, plena] = fen.split(' ');
    const casillas = new Array(64).fill(null);
    let i = 0;
    for (const c of tablero) {
        if (c === '/') continue;
        if (c >= '1' && c <= '8') i += +c;
        else casillas[i++] = c;
    }
    return {
        casillas,
        blancasJuegan: turno === 'w',
        enroques: enroques === '-' ? '' : enroques,
        alPaso: alPaso === '-' ? -1 : aIndice(alPaso),
        medias: +medias || 0,
        plena: +plena || 1,
        historial: [],
    };
}

function haciaFEN(p) {
    let filas = [];
    for (let f = 0; f < 8; f++) {
        let s = '', vacias = 0;
        for (let c = 0; c < 8; c++) {
            const pieza = p.casillas[idx(f, c)];
            if (pieza) { if (vacias) { s += vacias; vacias = 0; } s += pieza; }
            else vacias++;
        }
        if (vacias) s += vacias;
        filas.push(s);
    }
    return [
        filas.join('/'),
        p.blancasJuegan ? 'w' : 'b',
        p.enroques || '-',
        p.alPaso >= 0 ? aCasilla(p.alPaso) : '-',
        p.medias,
        p.plena,
    ].join(' ');
}

// ─── generación de jugadas ──────────────────────────────────────

const SALTOS_CABALLO = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const DIAGONALES = [[-1,-1],[-1,1],[1,-1],[1,1]];
const RECTAS = [[-1,0],[1,0],[0,-1],[0,1]];

/** Jugadas SIN comprobar que el rey quede seguro (pseudolegales). */
function pseudolegales(p, soloBlancas = p.blancasJuegan) {
    const out = [];
    const añade = (desde, hasta, extra = {}) => out.push({ desde, hasta, ...extra });

    for (let i = 0; i < 64; i++) {
        const pieza = p.casillas[i];
        if (!pieza || esBlanca(pieza) !== soloBlancas) continue;
        const f = fila(i), c = col(i);
        const tipo = pieza.toLowerCase();

        if (tipo === 'p') {
            const dir = soloBlancas ? -1 : 1;              // blancas suben (índice baja)
            const salida = soloBlancas ? 6 : 1;
            const coronan = soloBlancas ? 1 : 6;
            const f1 = f + dir;
            if (dentro(f1, c) && !p.casillas[idx(f1, c)]) {
                if (f === coronan) for (const q of 'qrbn') añade(i, idx(f1, c), { corona: q });
                else {
                    añade(i, idx(f1, c));
                    const f2 = f + 2 * dir;
                    if (f === salida && !p.casillas[idx(f2, c)]) añade(i, idx(f2, c), { doble: true });
                }
            }
            for (const dc of [-1, 1]) {
                const cc = c + dc;
                if (!dentro(f1, cc)) continue;
                const destino = idx(f1, cc);
                const ocupa = p.casillas[destino];
                if (ocupa && !mismoBando(ocupa, pieza)) {
                    if (f === coronan) for (const q of 'qrbn') añade(i, destino, { corona: q });
                    else añade(i, destino);
                } else if (destino === p.alPaso) {
                    añade(i, destino, { alPaso: true });
                }
            }
        } else if (tipo === 'n') {
            for (const [df, dc] of SALTOS_CABALLO) {
                const nf = f + df, nc = c + dc;
                if (!dentro(nf, nc)) continue;
                const destino = idx(nf, nc);
                if (!mismoBando(p.casillas[destino], pieza)) añade(i, destino);
            }
        } else if (tipo === 'k') {
            for (const [df, dc] of [...RECTAS, ...DIAGONALES]) {
                const nf = f + df, nc = c + dc;
                if (!dentro(nf, nc)) continue;
                const destino = idx(nf, nc);
                if (!mismoBando(p.casillas[destino], pieza)) añade(i, destino);
            }
            // Enroque: se comprueba aquí la geometría; que no pase por jaque se
            // valida en legales(), donde ya se puede simular.
            const base = soloBlancas ? 7 : 0;
            if (f === base && c === 4) {
                const corto = soloBlancas ? 'K' : 'k';
                const largo = soloBlancas ? 'Q' : 'q';
                if (p.enroques.includes(corto) &&
                    !p.casillas[idx(base, 5)] && !p.casillas[idx(base, 6)] &&
                    (p.casillas[idx(base, 7)] || '').toLowerCase() === 'r') {
                    añade(i, idx(base, 6), { enroque: 'corto' });
                }
                if (p.enroques.includes(largo) &&
                    !p.casillas[idx(base, 3)] && !p.casillas[idx(base, 2)] && !p.casillas[idx(base, 1)] &&
                    (p.casillas[idx(base, 0)] || '').toLowerCase() === 'r') {
                    añade(i, idx(base, 2), { enroque: 'largo' });
                }
            }
        } else {
            const dirs = tipo === 'b' ? DIAGONALES : tipo === 'r' ? RECTAS : [...RECTAS, ...DIAGONALES];
            for (const [df, dc] of dirs) {
                let nf = f + df, nc = c + dc;
                while (dentro(nf, nc)) {
                    const destino = idx(nf, nc);
                    const ocupa = p.casillas[destino];
                    if (!ocupa) añade(i, destino);
                    else { if (!mismoBando(ocupa, pieza)) añade(i, destino); break; }
                    nf += df; nc += dc;
                }
            }
        }
    }
    return out;
}

/**
 * ¿Ataca el bando `porBlancas` la casilla `casilla`?
 *
 * ⚠️ ESTO ESTABA MAL Y LO CAZÓ EL PERFT.
 * La primera versión deducía los ataques recorriendo las jugadas pseudolegales.
 * Parece razonable, pero tiene un agujero: **un peón no genera jugada hacia una
 * casilla vacía** (solo captura si hay pieza enemiga o es al paso). Así que un
 * peón que apuntaba a una casilla vacía resultaba INVISIBLE para esta función.
 *
 * Da igual para el jaque normal —cuando el rey se pone ahí la casilla deja de
 * estar vacía y el peón sí genera la captura— pero es fatal para el ENROQUE:
 * la casilla por la que PASA el rey sigue vacía mientras se comprueba, así que
 * se permitían enroques ilegales a través del ataque de un peón.
 * Síntoma: Kiwipete a profundidad 3 daba 97.898 en vez de 97.862 (36 de más).
 *
 * Ahora se calcula por geometría directa, que además es mucho más rápido: no
 * hay que generar todas las jugadas del rival para preguntar por una casilla.
 */
function atacada(p, casilla, porBlancas) {
    const f = fila(casilla), c = col(casilla);
    const suya = (ch) => porBlancas ? ch === ch.toUpperCase() : ch === ch.toLowerCase();

    // Peones: desde dónde podría capturar uno hacia aquí.
    // Un peón blanco captura hacia arriba (índice menor), así que para atacar
    // esta casilla tendría que estar una fila por DEBAJO.
    const dirPeon = porBlancas ? 1 : -1;
    for (const dc of [-1, 1]) {
        const nf = f + dirPeon, nc = c + dc;
        if (!dentro(nf, nc)) continue;
        const ch = p.casillas[idx(nf, nc)];
        if (ch && ch.toLowerCase() === 'p' && suya(ch)) return true;
    }

    // Caballos
    for (const [df, dc] of SALTOS_CABALLO) {
        const nf = f + df, nc = c + dc;
        if (!dentro(nf, nc)) continue;
        const ch = p.casillas[idx(nf, nc)];
        if (ch && ch.toLowerCase() === 'n' && suya(ch)) return true;
    }

    // Rey contrario
    for (const [df, dc] of [...RECTAS, ...DIAGONALES]) {
        const nf = f + df, nc = c + dc;
        if (!dentro(nf, nc)) continue;
        const ch = p.casillas[idx(nf, nc)];
        if (ch && ch.toLowerCase() === 'k' && suya(ch)) return true;
    }

    // Deslizantes: torre/dama en recta, alfil/dama en diagonal.
    const rayo = (dirs, tipos) => {
        for (const [df, dc] of dirs) {
            let nf = f + df, nc = c + dc;
            while (dentro(nf, nc)) {
                const ch = p.casillas[idx(nf, nc)];
                if (ch) {
                    if (suya(ch) && tipos.includes(ch.toLowerCase())) return true;
                    break;   // cualquier pieza bloquea la línea
                }
                nf += df; nc += dc;
            }
        }
        return false;
    };
    if (rayo(RECTAS, ['r', 'q'])) return true;
    if (rayo(DIAGONALES, ['b', 'q'])) return true;

    return false;
}

function buscaRey(p, blancas) {
    const r = blancas ? 'K' : 'k';
    return p.casillas.indexOf(r);
}

function enJaque(p, blancas = p.blancasJuegan) {
    const rey = buscaRey(p, blancas);
    return rey >= 0 && atacada(p, rey, !blancas);
}

/** Aplica una jugada sin validarla. Devuelve lo necesario para deshacerla. */
function aplica(p, m) {
    const pieza = p.casillas[m.desde];
    const capturada = m.alPaso
        ? p.casillas[idx(fila(m.desde), col(m.hasta))]
        : p.casillas[m.hasta];
    const deshacer = {
        m, pieza, capturada,
        enroques: p.enroques, alPaso: p.alPaso, medias: p.medias, plena: p.plena,
        capturadaEn: m.alPaso ? idx(fila(m.desde), col(m.hasta)) : m.hasta,
    };

    p.casillas[m.hasta] = m.corona
        ? (esBlanca(pieza) ? m.corona.toUpperCase() : m.corona)
        : pieza;
    p.casillas[m.desde] = null;
    if (m.alPaso) p.casillas[deshacer.capturadaEn] = null;

    if (m.enroque) {
        const base = fila(m.desde);
        if (m.enroque === 'corto') {
            p.casillas[idx(base, 5)] = p.casillas[idx(base, 7)];
            p.casillas[idx(base, 7)] = null;
        } else {
            p.casillas[idx(base, 3)] = p.casillas[idx(base, 0)];
            p.casillas[idx(base, 0)] = null;
        }
    }

    // Derechos de enroque: los pierde quien mueve rey o torre, y también se
    // pierden si te capturan la torre en su casilla de origen.
    let e = p.enroques;
    const t = pieza.toLowerCase();
    if (t === 'k') e = e.replace(esBlanca(pieza) ? /[KQ]/g : /[kq]/g, '');
    if (t === 'r') {
        if (m.desde === 63) e = e.replace('K', '');
        if (m.desde === 56) e = e.replace('Q', '');
        if (m.desde === 7)  e = e.replace('k', '');
        if (m.desde === 0)  e = e.replace('q', '');
    }
    if (m.hasta === 63) e = e.replace('K', '');
    if (m.hasta === 56) e = e.replace('Q', '');
    if (m.hasta === 7)  e = e.replace('k', '');
    if (m.hasta === 0)  e = e.replace('q', '');
    p.enroques = e;

    p.alPaso = m.doble ? idx((fila(m.desde) + fila(m.hasta)) / 2, col(m.desde)) : -1;
    p.medias = (t === 'p' || capturada) ? 0 : p.medias + 1;
    if (!p.blancasJuegan) p.plena++;
    p.blancasJuegan = !p.blancasJuegan;
    return deshacer;
}

function revierte(p, d) {
    const m = d.m;
    p.blancasJuegan = !p.blancasJuegan;
    if (!p.blancasJuegan) p.plena--;
    p.casillas[m.desde] = d.pieza;
    p.casillas[m.hasta] = null;
    if (d.capturada) p.casillas[d.capturadaEn] = d.capturada;
    if (m.enroque) {
        const base = fila(m.desde);
        if (m.enroque === 'corto') {
            p.casillas[idx(base, 7)] = p.casillas[idx(base, 5)];
            p.casillas[idx(base, 5)] = null;
        } else {
            p.casillas[idx(base, 0)] = p.casillas[idx(base, 3)];
            p.casillas[idx(base, 3)] = null;
        }
    }
    p.enroques = d.enroques;
    p.alPaso = d.alPaso;
    p.medias = d.medias;
    p.plena = d.plena;
}

/** Jugadas LEGALES: las pseudolegales que no dejan al rey en jaque. */
function legales(p) {
    const out = [];
    const mias = p.blancasJuegan;
    for (const m of pseudolegales(p)) {
        // El enroque no puede empezar, pasar ni acabar en jaque.
        if (m.enroque) {
            const base = fila(m.desde);
            const paso = m.enroque === 'corto' ? idx(base, 5) : idx(base, 3);
            if (enJaque(p, mias)) continue;
            if (atacada(p, paso, !mias)) continue;
        }
        const d = aplica(p, m);
        if (!enJaque(p, mias)) out.push(m);
        revierte(p, d);
    }
    return out;
}

const aUCI = (m) => aCasilla(m.desde) + aCasilla(m.hasta) + (m.corona || '');

function materialInsuficiente(p) {
    const piezas = p.casillas.filter(Boolean).map(c => c.toLowerCase()).filter(c => c !== 'k');
    if (piezas.length === 0) return true;                       // rey contra rey
    if (piezas.length === 1 && (piezas[0] === 'n' || piezas[0] === 'b')) return true;
    if (piezas.length === 2 && piezas.every(c => c === 'b')) return true;  // aprox.
    return false;
}

/**
 * Puntuación para el banco de pruebas. NO es una regla del ajedrez.
 *
 * ⚠️ EL AJEDREZ NO PUNTUABA. Se jugaba entero, era determinista y se verificaba
 * —las tres cosas verdes— pero `estado()` no publicaba ningún marcador, así que
 * `puntuacionDe()` devolvía 0 **siempre**. En una partida, en mil, y jugara
 * quien jugara. El juego insignia del catálogo era, como banco de pruebas, un
 * termómetro sin mercurio: funcionaba perfectamente y no medía nada.
 *
 * No lo destapó ninguna prueba de las que ya había, porque ninguna preguntaba lo
 * único que importa aquí: **¿cambia el número según quién juegue?**
 *
 * Se puntúa desde el bando de las BLANCAS, que es el asiento que medimos:
 *   · ganar vale 1000 y perder −1000, muy por encima de cualquier material
 *   · el material desempata, para que haya señal antes del jaque mate
 * Denso a propósito: una señal que sólo aparece al final del juego no distingue
 * entre perder por poco y perder por mucho.
 */
const VALOR_PIEZA = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function marcadorBlancas(p, resultado) {
    let material = 0;
    for (const c of p.casillas) {
        if (!c) continue;
        const v = VALOR_PIEZA[c.toLowerCase()] ?? 0;
        material += (c === c.toUpperCase()) ? v : -v;      // mayúscula = blancas
    }
    const fin = resultado === '1-0' ? 1000 : resultado === '0-1' ? -1000 : 0;
    return fin + material;
}

// ─── el módulo que consume el ProtoHub ──────────────────────────

export const ajedrez = {
    /** A que se juega, para quien no ve el tablero. Lo publica ProtoHub.state. */
    OBJETIVO: 'Objetivo: dar jaque mate al rey rival.',

    // CUÁNTAS SILLAS TIENE LA MESA: dos, blancas y negras. Fijo, no hay
    // variante de este juego con otro número de bandos.
    ASIENTOS: 2,

    id: 'chess',
    nombre: 'Ajedrez',

    nuevaPartida(opts = {}) {
        const p = desdeFEN(opts.fen || INICIAL);
        p.historial = [];
        return p;
    },

    estado(p) {
        const movs = legales(p);
        const jaque = enJaque(p);
        const ahogado = movs.length === 0 && !jaque;
        const mate = movs.length === 0 && jaque;
        const tablas = ahogado || p.medias >= 100 || materialInsuficiente(p);

        let resultado = null;
        if (mate) resultado = p.blancasJuegan ? '0-1' : '1-0';
        else if (tablas) resultado = '1/2-1/2';

        return {
            fen: haciaFEN(p),
            turn: p.blancasJuegan ? 'white' : 'black',
            legal_moves: movs.map(aUCI),
            is_check: jaque,
            is_checkmate: mate,
            is_stalemate: ahogado,
            is_game_over: mate || tablas,
            result: resultado,
            halfmove_clock: p.medias,
            fullmove_number: p.plena,
            // Ver `marcadorBlancas`: sin esto el ajedrez valía 0 en toda partida.
            score: marcadorBlancas(p, resultado),
            puntos: marcadorBlancas(p, resultado),
        };
    },

    mover(p, uci) {
        const m = legales(p).find(x => aUCI(x) === uci);
        if (!m) return false;
        p.historial.push(aplica(p, m));
        return true;
    },

    deshacer(p) {
        const d = p.historial.pop();
        if (!d) return false;
        revierte(p, d);
        return true;
    },

    /**
     * Rival de casa: captura lo más valioso que pueda; si no hay captura,
     * elige de forma REPETIBLE.
     *
     * ⚠️ Aquí ponía `movs[(Math.random() * movs.length) | 0]`, y eso rompía lo
     * único que este proyecto promete: la misma semilla daba partidas
     * distintas, así que dos ejecuciones de la misma política no eran
     * comparables. El recibo seguía verificando —guarda también las jugadas de
     * la casa— pero un banco de pruebas cuyo rival tira un dado mide ruido.
     *
     * La elección sale ahora del número de jugada, no del azar: determinista,
     * sin estado que arrastrar y sin necesidad de sembrar nada.
     */
    sugerencia(p) {
        const movs = legales(p);
        if (!movs.length) return null;
        const valor = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        let mejor = movs[0], mejorV = -1;
        for (const m of movs) {
            const obj = p.casillas[m.hasta];
            const v = obj ? valor[obj.toLowerCase()] : 0;
            if (v > mejorV) { mejorV = v; mejor = m; }
        }
        if (mejorV > 0) return aUCI(mejor);
        // Mezcla entera de 32 bits: idéntica en cualquier máquina.
        let h = ((p.historial?.length ?? 0) + 0x9E3779B9) >>> 0;
        h = (Math.imul(h ^ (h >>> 15), 0x85EBCA6B)) >>> 0;
        return aUCI(movs[(h >>> 0) % movs.length]);
    },
};

export { desdeFEN, haciaFEN, legales, enJaque, aUCI, INICIAL };
