const W = 11, H = 11;

const DIRS = {
    arriba:    { x: 0,  y: -1 },
    abajo:     { x: 0,  y: 1 },
    izquierda: { x: -1, y: 0 },
    derecha:   { x: 1,  y: 0 },
    esperar:   { x: 0,  y: 0 },
};

import { mulberry32 } from './azar.js';

function generarCarriles(seed) {
    const rnd = mulberry32(seed);
    const carriles = [];
    for (let y = 0; y < H; y++) {
        if (y === 0 || y === H - 1) { carriles.push({ tipo: 'orilla', dir: 0, velocidad: 1, objetos: [] }); continue; }
        
        let r = rnd();
        let tipo = 'calzada';
        if (r < 0.2) tipo = 'orilla';
        else if (r < 0.5) tipo = 'agua';
        
        let dir = rnd() < 0.5 ? 1 : -1;
        let velocidad = 1 + Math.floor(rnd() * 3);        // ticks por casilla
        let n = (tipo === 'orilla') ? 0 : 2 + Math.floor(rnd() * 2);
        let objetos = Array.from({ length: n }, () => Math.floor(rnd() * W));
        
        carriles.push({ tipo, dir, velocidad, objetos });
    }
    return carriles;
}

function cochesEn(carril, t) {
    if (!carril || carril.tipo === 'orilla') return [];
    const avance = Math.floor(t / carril.velocidad) * carril.dir;
    let occ = new Set();
    for (let x0 of carril.objetos) {
        let x = ((x0 + avance) % W + W) % W;
        occ.add(x);
        if (carril.tipo === 'agua') {
            occ.add((x + 1) % W);
        }
    }
    return Array.from(occ);
}

const peaton = {
    OBJETIVO: 'Objetivo: llegar hasta arriba del todo cruzando los carriles sin que te atropellen. Esperar a que pase el hueco también es una jugada.',
    ASIENTOS: 1,
    id: 'peaton',
    nombre: 'Peatón',

    nuevaPartida(opts = {}) {
        const seed = opts.seed ?? 1234;
        return {
            seed,
            carriles: generarCarriles(seed),
            pos: { x: Math.floor(W / 2), y: H - 1 },
            huron: { x: Math.floor(W / 2), y: H, activo: false, aviso: false, target: null },
            t: 0,
            score: 0,
            maxY: H - 1,
            muerto: false,
            llegado: false,
            historial: [],
            tope: opts.tope ?? 400,
        };
    },

    sustrato(p) {
        const celdas = new Array(W * H).fill(0);
        for (let y = 0; y < H; y++) {
            const c = p.carriles[y];
            let v = 0;
            if (c.tipo === 'calzada') v = c.dir > 0 ? 1 : 2;
            else if (c.tipo === 'agua') v = c.dir > 0 ? 3 : 4;
            else if (c.tipo === 'orilla') v = 5;
            for (let x = 0; x < W; x++) celdas[y * W + x] = v;
        }
        
        const piezas = [];
        for (let y = 0; y < H; y++) {
            const c = p.carriles[y];
            if (!c || c.tipo === 'orilla') continue;
            for (const x of cochesEn(c, p.t)) {
                let t_str = '';
                if (c.tipo === 'calzada') t_str = c.dir > 0 ? 'coche_der' : 'coche_izq';
                else if (c.tipo === 'agua') t_str = 'tronco';
                piezas.push({ x, y, t: t_str, de: 1 });
            }
        }
        
        if (p.pos) piezas.push({ x: p.pos.x, y: p.pos.y, t: 'jugador', de: 0 });
        
        if (p.huron && p.huron.activo) {
            piezas.push({ x: p.huron.x, y: p.huron.y, t: 'huron', de: 1 });
            if (p.huron.aviso && p.huron.target) {
                piezas.push({ x: p.huron.target.x, y: p.huron.target.y, t: 'aviso_huron', de: 1 });
            }
        }

        return {
            rejilla: { ancho: W, alto: H, celdas },
            piezas,
            zonas: [],
            leyenda: { jugador: 'tu ficha, cruza de abajo arriba',
                       coche_der: 'coche que avanza hacia la derecha',
                       coche_izq: 'coche que avanza hacia la izquierda',
                       tronco: 'plataforma segura sobre el agua',
                       huron: 'cazador que te persigue',
                       aviso_huron: 'punto donde atacará el hurón el próximo turno' },
            simbolos: { jugador: '@', coche_der: '>', coche_izq: '<', tronco: 'O', huron: 'H', aviso_huron: '!' },
            terreno: { 0: '.', 1: '-', 2: '=', 3: '~', 4: '≈', 5: '+' },
            leyendaTerreno: { 0: 'acera: aquí no atropellan',
                              1: 'calzada con tráfico hacia la derecha',
                              2: 'calzada con tráfico hacia la izquierda',
                              3: 'río con corriente hacia la derecha (ahoga)',
                              4: 'río con corriente hacia la izquierda (ahoga)',
                              5: 'orilla de descanso' },
            /**
             * SONIDOS
             * Para el paso "sonidos que causa el mundo":
             * drown         : te ahogas si caes en agua sin tronco
             * ferret_catch  : te come el hurón
             * predator_alert: el hurón te marca con el aviso (!)
             * safe_zone     : llegas a la orilla
             * land          : coger orilla general
             */
            sonidos: { jugada: { arriba: 'jump', abajo: 'jump', izquierda: 'jump', derecha: 'jump', esperar: null } }
        };
    },

    estado(p) {
        const hazards = p.carriles.map(c => 
            cochesEn(c, p.t).map(x => ({ x, dir: c ? c.dir : 0, tipo: c ? c.tipo : 'orilla' }))
        );
        const fin = p.muerto || p.llegado || p.t >= p.tope;
        const carriles_resumen = p.carriles.map((c, i) => {
            if (c.tipo === 'orilla') return `${i} orilla`;
            const flecha = c.dir > 0 ? '→' : '←';
            const tipo = c.tipo === 'agua' ? 'rio' : 'calzada';
            return `${i} ${tipo} ${flecha}${c.velocidad}`;
        }).join(' · ');

        return {
            /**
             * ⚠️ `state` ES LO QUE LEE EL VISUALIZADOR 3D, Y SE QUEDÓ SIN COCHES.
             *
             * Al añadir el resumen de carriles y quitar el volcado de `carriles`,
             * este objeto anidado perdió `hazards` y `carriles`. `peaton_visualizer`
             * hace `syncStateToBoard(data.state)` y recorre `state.hazards` para
             * pintar coches, troncos y hurón: sin ellos dibujaba **la rana y nada
             * más**. Lo cazó `prueba_vistas` —«el sustrato dice 20 y se dibujan 1»—
             * y no lo habría notado nadie mirando el texto, que estaba perfecto.
             *
             * ⚠️ Y NO CUESTA PROMPT: `state` es maquinaria y el descriptor no lo
             *    saca al texto. Lo que se quitó para no gastar contexto —el volcado
             *    de `carriles` en la RAÍZ— sigue quitado. Aquí abajo no se lee.
             */
            state: {
                width: W, height: H, peaton: { ...p.pos }, carriles_resumen,
                hazards, carriles: p.carriles, huron: p.huron ?? null,
                score: p.score,
            },
            width: W, height: H,
            peaton: { ...p.pos },
            carriles_resumen,
            hazards,
            huron: p.huron ? { ...p.huron, target: p.huron.target ? {...p.huron.target} : null } : null,
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

        let huron_copy = p.huron ? { ...p.huron, target: p.huron.target ? { ...p.huron.target } : null } : null;

        p.historial.push({
            pos: { ...p.pos }, t: p.t, score: p.score,
            maxY: p.maxY, muerto: p.muerto, llegado: p.llegado,
            huron: huron_copy,
        });

        // Drag on water
        let cur_c = p.carriles[p.pos.y];
        if (cur_c && cur_c.tipo === 'agua') {
            let objs = cochesEn(cur_c, p.t);
            if (objs.includes(p.pos.x)) {
                let t_old = Math.floor(p.t / cur_c.velocidad);
                let t_new = Math.floor((p.t + 1) / cur_c.velocidad);
                if (t_old !== t_new) {
                    p.pos.x += cur_c.dir;
                    if (p.pos.x < 0 || p.pos.x >= W) { 
                        p.muerto = true; 
                        p.t++; 
                        return true; 
                    }
                }
            }
        }

        p.pos.x = Math.max(0, Math.min(W - 1, p.pos.x + d.x));
        p.pos.y = Math.max(0, Math.min(H - 1, p.pos.y + d.y));
        p.t++;

        if (p.pos.y < p.maxY) { p.score += 10; p.maxY = p.pos.y; }

        if (p.huron) {
            if (!p.huron.activo) {
                if (p.t >= 5) p.huron.activo = true;
            } else {
                if (p.huron.aviso) {
                    p.huron.x = p.huron.target.x;
                    p.huron.y = p.huron.target.y;
                    p.huron.aviso = false;
                    p.huron.target = null;
                } else {
                    let dx = p.pos.x - p.huron.x;
                    let dy = p.pos.y - p.huron.y;
                    let dist = Math.abs(dx) + Math.abs(dy);
                    if (dist === 1 || dist === 2) {
                        p.huron.aviso = true;
                        p.huron.target = { x: p.pos.x, y: p.pos.y };
                    } else if (dist > 0) {
                        if (Math.abs(dx) > Math.abs(dy)) p.huron.x += Math.sign(dx);
                        else p.huron.y += Math.sign(dy);
                    }
                }
            }
        }

        if (p.huron && p.huron.activo && p.huron.x === p.pos.x && p.huron.y === p.pos.y) {
            p.muerto = true;
            return true;
        }

        let new_c = p.carriles[p.pos.y];
        let objs = cochesEn(new_c, p.t);

        if (new_c.tipo === 'agua') {
            if (!objs.includes(p.pos.x)) p.muerto = true;
        } else if (new_c.tipo === 'calzada') {
            if (objs.includes(p.pos.x)) p.muerto = true;
        }

        if (p.pos.y === 0 && !p.muerto) { p.llegado = true; p.score += 100; }
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        Object.assign(p, h);
        return true;
    },

    sugerencia(p) {
        if (p.muerto || p.llegado) return null;
        const siguiente = p.t + 1;

        const libre = (x, y) => {
            if (y < 0 || y >= H || x < 0 || x >= W) return false;
            if (p.huron && p.huron.aviso && p.huron.target && p.huron.target.x === x && p.huron.target.y === y) return false;
            
            const c = p.carriles[y];
            if (!c || c.tipo === 'orilla') return true;
            
            const objs = cochesEn(c, siguiente);
            if (c.tipo === 'calzada') return !objs.includes(x);
            if (c.tipo === 'agua') return objs.includes(x);
            return true;
        };

        if (libre(p.pos.x, p.pos.y - 1)) return 'arriba';
        for (const lado of ['izquierda', 'derecha']) {
            const d = DIRS[lado];
            if (libre(p.pos.x + d.x, p.pos.y) && libre(p.pos.x + d.x, p.pos.y - 1)) return lado;
        }
        return libre(p.pos.x, p.pos.y) ? 'esperar' : 'abajo';
    },
};

export { W, H, DIRS, generarCarriles, cochesEn, peaton };
