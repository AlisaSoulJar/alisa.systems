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
    // CUÁNTAS SILLAS TIENE LA MESA: una. Los coches son el entorno, no rival.
    ASIENTOS: 1,
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


    /**
     * Los carriles, los coches y tu.
     *
     * ⚠️ EL CARRIL VACIO TAMBIEN DICE ALGO, Y EL DERIVADO LO CALLABA.
     *
     * `sustratoDe` saca los coches de `hazards` y deja la rejilla a cero, asi
     * que un carril sin coches a la vista sale igual que la acera. Y no es
     * igual: por ese carril viene trafico, y en un sentido concreto. La
     * decision del juego es CUANDO cruzar, o sea que saber por donde va a venir
     * el coche que todavia no esta es justo la mitad del problema.
     *
     * El sentido de cada carril no se deduce de los coches que hay ahora
     * —puede no haber ninguno—, sale de `p.carriles`, y por eso esto solo se
     * puede publicar desde dentro.
     */
    sustrato(p) {
        const celdas = new Array(W * H).fill(0);
        for (let y = 0; y < H; y++) {
            const carril = p.carriles[y];
            if (!carril) continue;
            const v = carril.dir > 0 ? 1 : 2;
            for (let x = 0; x < W; x++) celdas[y * W + x] = v;
        }
        const piezas = [];
        for (let y = 0; y < H; y++) {
            const carril = p.carriles[y];
            if (!carril) continue;
            for (const x of cochesEn(carril, p.t)) {
                piezas.push({ x, y, t: carril.dir > 0 ? 'coche_der' : 'coche_izq', de: 1 });
            }
        }
        if (p.pos) piezas.push({ x: p.pos.x, y: p.pos.y, t: 'jugador', de: 0 });
        return {
            rejilla: { ancho: W, alto: H, celdas },
            piezas,
            zonas: [],
            leyenda: { jugador: 'tu ficha, cruza de abajo arriba',
                       coche_der: 'coche que avanza hacia la derecha',
                       coche_izq: 'coche que avanza hacia la izquierda' },
            /**
             * ⚠️ LOS DOS SENTIDOS SE DIBUJABAN CON LA MISMA LETRA.
             *
             * Sin símbolos declarados, el mapa usa la inicial del tipo: `coche_der`
             * y `coche_izq` salían las dos como `C`, o sea que el mapa enseñaba
             * dónde hay coches y no hacia dónde van. Cruzar es esperar el hueco,
             * así que el sentido no es un detalle: es la decisión.
             *
             * La flecha se la queda el COCHE, que es lo que se mueve, y el carril
             * usa otro par para que no se confundan sobre la misma casilla.
             */
            simbolos: { jugador: '@', coche_der: '>', coche_izq: '<' },
            terreno: { 0: '.', 1: '-', 2: '=' },
            leyendaTerreno: { 0: 'acera: aquí no atropellan',
                              1: 'carril con tráfico hacia la derecha',
                              2: 'carril con tráfico hacia la izquierda' },
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
