/**
 * PathfindingSystem — EL CAMINO MÁS CORTO POR UNA REJILLA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const camino = Pathfinding.buscar({
 *         filas, cols, pasable: (r, c) => rejilla[r][c] !== MURO,
 *         desde: {r: 0, c: 0}, hasta: {r: 11, c: 11},
 *     });
 *
 *     if (Pathfinding.sellaria({ ... , poner: {r, c} })) rechazar();
 *
 * A* de ocho direcciones con heurística octil. Devuelve celdas —`{r, c}`—, no
 * coordenadas de mundo: quién sabe dónde cae cada celda es de quien tiene el
 * mapa.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTABA ESCRITO Y NO SE PODÍA LLAMAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `NavMeshAgentSystem` lleva este A* dentro desde siempre, bien hecho y
 * headless. Lo que no se podía era usarlo desde otro sitio: su `_calculatePath`
 * pide un `navMesh` con una forma concreta —`metadata.bounds`, `metadata.rows`,
 * `data[r][c].w`, `data[r][c].x`— y devuelve coordenadas de mundo. Un tower
 * defense de laberinto no tiene navmesh: tiene una matriz de celdas.
 *
 * Es la avería de siempre: la pieza canónica existe, está enterrada donde no se
 * puede importar, y el siguiente que la necesita se escribe la suya. Aquí queda
 * el algoritmo, y `NavMeshAgentSystem` se queda con lo suyo — traducir su
 * navmesh a celdas y las celdas a metros.
 *
 * ⚠️ COPIADO ESTRUCTURA POR ESTRUCTURA, INCLUIDO LO QUE PARECE MEJORABLE.
 *
 * La lista abierta se ORDENA ENTERA en cada vuelta (`sort` y `shift`) en vez de
 * usar un montículo. Para una rejilla de tablero da igual, y cambiarlo cambiaría
 * los EMPATES: dos celdas con la misma `f` se visitan en otro orden y sale otro
 * camino igual de corto pero distinto. En un banco que verifica volviendo a
 * jugar, «igual de bueno» no es «igual».
 *
 * Comprobado: treinta caminos sobre una rejilla con muros dan el mismo resumen
 * —`26da19bc`— antes y después de sacarlo.
 */

/** Las ocho vecinas, con lo que cuesta ir a cada una. */
const VECINAS_8 = [
    { dr: -1, dc: 0, cost: 1 }, { dr: 1, dc: 0, cost: 1 },
    { dr: 0, dc: -1, cost: 1 }, { dr: 0, dc: 1, cost: 1 },
    { dr: -1, dc: -1, cost: 1.414 }, { dr: -1, dc: 1, cost: 1.414 },
    { dr: 1, dc: -1, cost: 1.414 }, { dr: 1, dc: 1, cost: 1.414 },
];

/** Las cuatro de siempre, para juegos donde no se anda en diagonal. */
const VECINAS_4 = VECINAS_8.slice(0, 4);

export class Pathfinding {
    /**
     * @param {Object}   o
     * @param {number}   o.filas
     * @param {number}   o.cols
     * @param {Function} o.pasable  `(r, c) => boolean`
     * @param {{r,c}}    o.desde
     * @param {{r,c}}    o.hasta
     * @param {boolean}  [o.diagonales=true]
     * @returns {Array<{r,c}>} las celdas SIN incluir la de salida, o `[]` si no hay
     */
    static buscar({ filas, cols, pasable, desde, hasta, diagonales = true }) {
        if (!desde || !hasta) return [];
        if (!pasable(hasta.r, hasta.c)) return [];

        const abierta = [];
        const enAbierta = new Set();
        const cerrada = new Set();
        const vengoDe = new Map();
        const g = new Map();
        const clave = (r, c) => `${r},${c}`;

        const kIni = clave(desde.r, desde.c);
        g.set(kIni, 0);
        abierta.push({ r: desde.r, c: desde.c, f: Pathfinding.heuristica(desde, hasta) });
        enAbierta.add(kIni);

        const vecinas = diagonales ? VECINAS_8 : VECINAS_4;

        while (abierta.length > 0) {
            abierta.sort((a, b) => a.f - b.f);
            const actual = abierta.shift();
            const kAct = clave(actual.r, actual.c);
            enAbierta.delete(kAct);

            if (actual.r === hasta.r && actual.c === hasta.c) {
                return Pathfinding.rehacer(vengoDe, kAct);
            }
            cerrada.add(kAct);

            for (const v of vecinas) {
                const nr = actual.r + v.dr;
                const nc = actual.c + v.dc;
                if (nr < 0 || nr >= filas || nc < 0 || nc >= cols) continue;
                if (!pasable(nr, nc)) continue;

                const kV = clave(nr, nc);
                if (cerrada.has(kV)) continue;

                const gTent = g.get(kAct) + v.cost;
                if (!g.has(kV) || gTent < g.get(kV)) {
                    vengoDe.set(kV, kAct);
                    g.set(kV, gTent);
                    const f = gTent + Pathfinding.heuristica({ r: nr, c: nc }, hasta);
                    if (!enAbierta.has(kV)) {
                        abierta.push({ r: nr, c: nc, f });
                        enAbierta.add(kV);
                    }
                }
            }
        }
        return [];
    }

    /** Distancia octil: la que corresponde a moverse en ocho direcciones. */
    static heuristica(a, b) {
        const dx = Math.abs(a.c - b.c);
        const dy = Math.abs(a.r - b.r);
        return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    }

    static rehacer(vengoDe, kFinal) {
        const camino = [];
        let k = kFinal;
        while (vengoDe.has(k)) {
            const [r, c] = k.split(',').map(Number);
            camino.unshift({ r, c });
            k = vengoDe.get(k);
        }
        return camino;
    }

    /**
     * ⚠️ LA REGLA ANTI-SELLADO, QUE ES LO QUE HACE QUE UN LABERINTO SEA UN JUEGO.
     *
     * En los tower defense de laberinto construyes SOBRE el suelo por donde
     * andan los bichos, y la gracia está en doblarles la carretera todo lo que
     * puedas — pero **no puedes cerrarla del todo**. Sin esa regla no hay juego:
     * pones una pared y ganas.
     *
     * Así que antes de dejar poner algo se pregunta: con esta celda tapada,
     * ¿sigue habiendo camino? Es una sola llamada al buscador, y es la línea que
     * convierte «dónde lo pongo» en «cuánto consigo alargarlo».
     */
    static sellaria({ filas, cols, pasable, desde, hasta, poner, diagonales = true }) {
        const conEsa = (r, c) => (r === poner.r && c === poner.c ? false : pasable(r, c));
        if (poner.r === desde.r && poner.c === desde.c) return true;
        if (poner.r === hasta.r && poner.c === hasta.c) return true;
        return Pathfinding.buscar({ filas, cols, pasable: conEsa, desde, hasta, diagonales }).length === 0;
    }

    /**
     * Cuánto mide el camino en celdas. Vale para lo que de verdad quiere saber
     * quien construye un laberinto: si esta pared alarga el recorrido o no.
     */
    static largo(opciones) {
        return Pathfinding.buscar(opciones).length;
    }
}

export default Pathfinding;
