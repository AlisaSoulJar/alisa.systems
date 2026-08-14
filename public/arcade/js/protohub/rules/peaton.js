/**
 * peaton.js — cruzar la calle, para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve lo que ya esperaba el visualizador:
 *
 *     { width, height, frog:{x,y}, hazards: [ [ {x,dir}, … ], … ], score }
 *
 * Rejilla 11×11. Jugadas: "arriba" · "abajo" · "izquierda" · "derecha" · "esperar".
 * Estás abajo (y = 0) y hay que llegar arriba (y = height-1).
 *
 * POR QUÉ ESTÁ EN LA SUITE
 * ------------------------
 * Completa el trío de acción y aporta lo que los otros dos no tienen:
 * **esperar es una jugada**. En snake y fagocito siempre te mueves; aquí la
 * decisión más difícil suele ser quedarse quieto un tick y dejar pasar el
 * coche. Un agente que no sepa no hacer nada, no cruza.
 *
 * Es el mismo problema que en los bancos clásicos de RL: recompensa muy
 * separada del riesgo, y un tope de tiempo que castiga la parálisis.
 *
 * DETERMINISTA
 * ------------
 * Los carriles se generan con semilla y **avanzan por reloj de la partida**, no
 * por tiempo real: `t` cuenta ticks. Así la misma semilla y las mismas jugadas
 * dan exactamente la misma partida — que es lo que exige el benchmark.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const W = 11, H = 11;

const DIRS = {
    arriba:    { x: 0,  y: 1 },
    abajo:     { x: 0,  y: -1 },
    izquierda: { x: -1, y: 0 },
    derecha:   { x: 1,  y: 0 },
    esperar:   { x: 0,  y: 0 },
};

import { mulberry32 } from './azar.js';

/**
 * Los carriles. La fila 0 (salida) y la última (meta) están siempre despejadas:
 * si no, se puede morir sin haber jugado, y eso no mide nada.
 */
function generarCarriles(seed) {
    const rnd = mulberry32(seed);
    const carriles = [];
    for (let y = 0; y < H; y++) {
        if (y === 0 || y === H - 1) { carriles.push(null); continue; }
        carriles.push({
            dir: rnd() < 0.5 ? 1 : -1,
            velocidad: 1 + Math.floor(rnd() * 3),        // ticks por casilla
            coches: Array.from({ length: 2 + Math.floor(rnd() * 2) },
                               () => Math.floor(rnd() * W)),
        });
    }
    return carriles;
}

/** Dónde está cada coche en el tick `t`. Se calcula, no se guarda. */
function cochesEn(carril, t) {
    if (!carril) return [];
    const avance = Math.floor(t / carril.velocidad) * carril.dir;
    return carril.coches.map(x0 => ((x0 + avance) % W + W) % W);
}

const atropellado = (p) => {
    const c = p.carriles[p.pos.y];
    return !!c && cochesEn(c, p.t).includes(p.pos.x);
};

export const peaton = {
    OBJETIVO: 'Objetivo: llegar hasta arriba del todo cruzando los carriles sin que te atropellen. Esperar a que pase el hueco también es una jugada.',
    id: 'peaton',
    nombre: 'Peatón',

    nuevaPartida(opts = {}) {
        const seed = opts.seed ?? 1234;
        return {
            seed,
            carriles: generarCarriles(seed),
            pos: { x: Math.floor(W / 2), y: 0 },
            t: 0,
            score: 0,
            maxY: 0,
            muerto: false,
            llegado: false,
            historial: [],
            tope: opts.tope ?? 400,
        };
    },

    estado(p) {
        const hazards = p.carriles.map(c =>
            cochesEn(c, p.t).map(x => ({ x, dir: c ? c.dir : 0 })));

        const fin = p.muerto || p.llegado || p.t >= p.tope;
        return {
            state: { width: W, height: H, frog: { ...p.pos }, hazards, score: p.score },
            width: W, height: H,
            frog: { ...p.pos },
            hazards,
            score: p.score,
            turn: 'white',
            legal_moves: fin ? [] : Object.keys(DIRS),
            is_check: false,
            is_game_over: fin,
            result: p.llegado ? 'white' : (p.muerto ? 'black' : null),
            t: p.t,
            avanceMaximo: p.maxY,
        };
    },

    mover(p, jugada) {
        if (p.muerto || p.llegado) return false;
        const d = DIRS[jugada];
        if (!d) return false;

        p.historial.push({
            pos: { ...p.pos }, t: p.t, score: p.score,
            maxY: p.maxY, muerto: p.muerto, llegado: p.llegado,
        });

        const nx = Math.max(0, Math.min(W - 1, p.pos.x + d.x));
        const ny = Math.max(0, Math.min(H - 1, p.pos.y + d.y));
        p.pos = { x: nx, y: ny };
        p.t++;

        // Avanzar puntúa una sola vez por fila: así no se puede farmear
        // subiendo y bajando en la misma casilla.
        if (ny > p.maxY) { p.score += 10; p.maxY = ny; }

        // Se comprueba DESPUÉS de mover y DESPUÉS de que avancen los coches:
        // te puede atropellar el que llega, no solo aquel al que te acercas.
        if (atropellado(p)) { p.muerto = true; return true; }
        if (ny === H - 1) { p.llegado = true; p.score += 100; }
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        Object.assign(p, h);
        return true;
    },

    /**
     * Rival de casa: sube si el hueco de arriba está despejado en el siguiente
     * tick; si no, **espera**. Esa es la lección del juego.
     */
    sugerencia(p) {
        if (p.muerto || p.llegado) return null;
        const siguiente = p.t + 1;

        const libre = (x, y) => {
            if (y < 0 || y >= H || x < 0 || x >= W) return false;
            const c = p.carriles[y];
            return !c || !cochesEn(c, siguiente).includes(x);
        };

        if (libre(p.pos.x, p.pos.y + 1)) return 'arriba';
        // Si arriba está tomado, buscar un hueco al lado desde el que sí se suba.
        for (const lado of ['izquierda', 'derecha']) {
            const d = DIRS[lado];
            if (libre(p.pos.x + d.x, p.pos.y) && libre(p.pos.x + d.x, p.pos.y + 1)) return lado;
        }
        // Quedarse quieto SOLO si aquí se sigue estando a salvo.
        return libre(p.pos.x, p.pos.y) ? 'esperar' : 'abajo';
    },
};

export { W, H, DIRS, generarCarriles, cochesEn };
