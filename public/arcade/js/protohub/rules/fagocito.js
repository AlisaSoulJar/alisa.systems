/**
 * fagocito.js — laberinto de perseguidores para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve lo que ya documentaba el visualizador:
 *
 *     { maze:[{x,y}…muros], fagocito:{x,y}, ghosts:[{x,y,type}],
 *       pellets:[{x,y}], score }
 *
 * Rejilla 28×28. Jugadas: "arriba" · "abajo" · "izquierda" · "derecha".
 *
 * QUÉ ES
 * ------
 * Una célula que engulle mientras la persiguen. Recoge todo el alimento del
 * laberinto sin que te alcancen. El laberinto se genera **con semilla**, así que
 * la misma semilla da el mismo mapa — requisito para que el benchmark valga.
 *
 * POR QUÉ ESTÁ EN LA SUITE
 * ------------------------
 * Es el otro extremo del catálogo. El go es información perfecta y sin prisa;
 * esto es **evasión bajo presión con recompensa dispersa** — el problema clásico
 * de los bancos de RL. Que el mismo motor, el mismo ProtoHub y el mismo contrato
 * de tres puertas sirvan para ambos es justo lo que se quiere demostrar.
 *
 * LOS PERSEGUIDORES
 * -----------------
 * Cada uno tiene su carácter, que es lo que hace interesante el problema:
 *   · `cazador`  va directo a por ti
 *   · `flanco`   apunta a donde VAS a estar, no a donde estás
 *   · `errante`  se mueve al azar — el impredecible es el que te mata
 * Ninguno atraviesa muros y ninguno da media vuelta salvo sin salida, que es lo
 * que evita el temblor de ir y venir en el sitio.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const N = 28;

const DIRS = {
    arriba:    { x: 0,  y: -1 },
    abajo:     { x: 0,  y: 1 },
    izquierda: { x: -1, y: 0 },
    derecha:   { x: 1,  y: 0 },
};
const OPUESTA = { arriba: 'abajo', abajo: 'arriba', izquierda: 'derecha', derecha: 'izquierda' };

/** PRNG con semilla: mismo número, mismo laberinto. */
import { mulberry32 } from './azar.js';

/**
 * Laberinto simétrico estilo salón recreativo: borde cerrado y bloques
 * repartidos. La simetría no es estética — hace el mapa justo, sin un lado
 * más fácil que el otro.
 */
function generarLaberinto(seed) {
    const rnd = mulberry32(seed);
    const muro = Array.from({ length: N }, () => new Array(N).fill(false));

    for (let i = 0; i < N; i++) {                 // borde
        muro[0][i] = muro[N-1][i] = true;
        muro[i][0] = muro[i][N-1] = true;
    }
    // Bloques en rejilla, con hueco entre ellos para que siempre haya paso.
    for (let y = 2; y < N - 2; y += 3) {
        for (let x = 2; x < N - 2; x += 3) {
            if (rnd() < 0.55) {
                const ancho = rnd() < 0.5 ? 2 : 1;
                const alto  = rnd() < 0.5 ? 2 : 1;
                for (let dy = 0; dy < alto; dy++)
                    for (let dx = 0; dx < ancho; dx++)
                        if (x + dx < N - 2 && y + dy < N - 2) {
                            muro[y + dy][x + dx] = true;
                            muro[y + dy][N - 1 - (x + dx)] = true;   // espejo
                        }
            }
        }
    }
    // El centro y las esquinas de salida, siempre libres.
    for (let y = 12; y <= 15; y++) for (let x = 12; x <= 15; x++) muro[y][x] = false;
    muro[1][1] = muro[1][N-2] = muro[N-2][1] = muro[N-2][N-2] = false;
    return muro;
}

const libre = (p, x, y) => x >= 0 && x < N && y >= 0 && y < N && !p.muro[y][x];

export const fagocito = {
    OBJETIVO: 'Objetivo: recoger todo el alimento del laberinto sin que te alcance ningún perseguidor. Si te tocan, se acabó.',
    // CUÁNTAS SILLAS TIENE LA MESA: una. Los fantasmas son el entorno, no
    // sillas — nadie más se sienta a decidir por ellos.
    ASIENTOS: 1,
    id: 'fagocito',
    nombre: 'Fagocito',

    nuevaPartida(opts = {}) {
        const seed = opts.seed ?? 1234;
        const muro = generarLaberinto(seed);
        const p = {
            muro, seed,
            pos: { x: 1, y: 1 },
            direccion: 'derecha',
            score: 0,
            muerto: false,
            pasos: 0,
            historial: [],
        };
        // Alimento en todo lo transitable menos donde arrancas.
        p.pellets = [];
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++)
                if (!muro[y][x] && !(x === 1 && y === 1)) p.pellets.push({ x, y });

        p.ghosts = [
            { x: 13, y: 13, type: 'cazador', dir: 'arriba' },
            { x: 14, y: 13, type: 'flanco',  dir: 'abajo' },
            { x: 13, y: 14, type: 'errante', dir: 'izquierda' },
        ];
        p._rnd = mulberry32(seed ^ 0x9E37);
        return p;
    },


    /**
     * El laberinto, la comida y los tres fantasmas.
     *
     * Misma division que en la mazmorra de cripta: lo que no cambia va en la
     * rejilla —el muro es `1`— y lo que cambia va como pieza. Los fantasmas
     * salen con SU tipo de pieza (`cazador`, `flanco`, `errante`) y no como
     * tres bichos iguales, porque lo que hace cada uno es la partida entera.
     */
    sustrato(p) {
        const alto = p.muro.length, ancho = p.muro[0].length;
        const celdas = new Array(ancho * alto).fill(0);
        for (let f = 0; f < alto; f++) {
            for (let c = 0; c < ancho; c++) if (p.muro[f][c]) celdas[f * ancho + c] = 1;
        }
        const piezas = [
            ...(p.pellets ?? []).map(g => ({ x: g.x, y: g.y, t: 'bolita', de: null })),
            ...(p.ghosts ?? []).map(b => ({ x: b.x, y: b.y, t: b.type ?? 'fantasma', de: 1 })),
        ];
        if (p.pos) piezas.push({ x: p.pos.x, y: p.pos.y, t: 'jugador', de: 0 });
        return {
            rejilla: { ancho, alto, celdas },
            piezas,
            zonas: [],
            /**
             * ⚠️ EL MURO SE FUE DE `leyenda` A `leyendaTerreno`, QUE ES SU SITIO.
             *
             * El adaptador lo metía como `1: 'muro…'` dentro de la leyenda de
             * PIEZAS, y no es una pieza: es el suelo. No es cosmético — la
             * observación numérica del gimnasio construye su vocabulario de tipos
             * con `Object.keys(leyenda)`, así que un valor de terreno colado ahí
             * añadía un tipo fantasma que ninguna pieza usa jamás.
             */
            leyenda: { bolita: 'comida por recoger',
                       jugador: 'tu ficha',
                       cazador: 'fantasma que viene directo a por ti',
                       flanco: 'fantasma que corta por donde vas a estar',
                       errante: 'fantasma que se mueve al azar' },
            terreno: { 0: '.', 1: '#' },
            leyendaTerreno: { 0: 'pasillo', 1: 'muro, no se puede cruzar' },
        };
    },

    estado(p) {
        const muros = [];
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++)
                if (p.muro[y][x]) muros.push({ x, y });

        const ganado = p.pellets.length === 0;
        return {
            maze: muros,
            fagocito: { ...p.pos },
            ghosts: p.ghosts.map(g => ({ x: g.x, y: g.y, type: g.type })),
            pellets: p.pellets.map(x => ({ ...x })),
            score: p.score,
            turn: 'white',
            legal_moves: (p.muerto || ganado) ? [] : Object.keys(DIRS).filter(d => {
                const dd = DIRS[d];
                return libre(p, p.pos.x + dd.x, p.pos.y + dd.y);
            }),
            is_check: false,
            is_game_over: p.muerto || ganado,
            result: ganado ? 'white' : (p.muerto ? 'black' : null),
            restantes: p.pellets.length,
            pasos: p.pasos,
        };
    },

    mover(p, jugada) {
        if (p.muerto || !DIRS[jugada]) return false;
        const d = DIRS[jugada];
        const destino = { x: p.pos.x + d.x, y: p.pos.y + d.y };
        if (!libre(p, destino.x, destino.y)) return false;   // contra un muro

        p.historial.push({
            pos: { ...p.pos }, direccion: p.direccion, score: p.score,
            pellets: p.pellets.map(x => ({ ...x })),
            ghosts: p.ghosts.map(g => ({ ...g })), muerto: p.muerto, pasos: p.pasos,
        });

        p.pos = destino;
        p.direccion = jugada;
        p.pasos++;

        const i = p.pellets.findIndex(x => x.x === destino.x && x.y === destino.y);
        if (i >= 0) { p.pellets.splice(i, 1); p.score += 10; }

        // Te alcanzan al entrar tú o al moverse ellos: se comprueban las dos.
        if (this._colision(p)) { p.muerto = true; return true; }
        this._moverFantasmas(p);
        if (this._colision(p)) p.muerto = true;
        return true;
    },

    _colision(p) {
        return p.ghosts.some(g => g.x === p.pos.x && g.y === p.pos.y);
    },

    _moverFantasmas(p) {
        for (const g of p.ghosts) {
            const opciones = Object.entries(DIRS).filter(([n, d]) => libre(p, g.x + d.x, g.y + d.y));
            if (!opciones.length) continue;
            // No dar media vuelta salvo sin salida: sin esto tiemblan en el sitio.
            const sinVolver = opciones.filter(([n]) => n !== OPUESTA[g.dir]);
            const candidatas = sinVolver.length ? sinVolver : opciones;

            let elegida;
            if (g.type === 'errante') {
                elegida = candidatas[(p._rnd() * candidatas.length) | 0];
            } else {
                // `flanco` apunta dos casillas por delante de ti, no a ti.
                const objetivo = g.type === 'flanco'
                    ? { x: p.pos.x + DIRS[p.direccion].x * 2, y: p.pos.y + DIRS[p.direccion].y * 2 }
                    : p.pos;
                let mejorD = Infinity;
                for (const [n, d] of candidatas) {
                    const nx = g.x + d.x, ny = g.y + d.y;
                    const dist = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);
                    if (dist < mejorD) { mejorD = dist; elegida = [n, d]; }
                }
            }
            const [nombre, d] = elegida;
            g.x += d.x; g.y += d.y; g.dir = nombre;
        }
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        Object.assign(p, h);
        return true;
    },

    /** Rival de casa: hacia el alimento más cercano, huyendo si hay uno encima. */
    sugerencia(p) {
        if (p.muerto || !p.pellets.length) return null;
        const opciones = Object.entries(DIRS).filter(([n, d]) => libre(p, p.pos.x + d.x, p.pos.y + d.y));
        if (!opciones.length) return null;

        const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        const cerca = p.pellets.reduce((m, x) => dist(x, p.pos) < dist(m, p.pos) ? x : m, p.pellets[0]);

        let mejor = opciones[0][0], mejorP = -Infinity;
        for (const [n, d] of opciones) {
            const np = { x: p.pos.x + d.x, y: p.pos.y + d.y };
            const peligro = Math.min(...p.ghosts.map(g => dist(np, g)));
            // Huir pesa más que comer: morir cuesta toda la partida.
            const puntos = -dist(np, cerca) + (peligro <= 2 ? peligro * 12 : 4);
            if (puntos > mejorP) { mejorP = puntos; mejor = n; }
        }
        return mejor;
    },
};

export { N, DIRS, generarLaberinto };
