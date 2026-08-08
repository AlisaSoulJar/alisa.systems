/**
 * rejilla.js — lo que TODOS los juegos de rejilla necesitan, escrito una vez
 * ═══════════════════════════════════════════════════════════════════════════
 * Línea de visión y camino más corto. Dos funciones, y estaban copiadas por
 * media docena de ficheros.
 *
 * ⚠️ POR QUÉ EXISTE ESTE FICHERO
 * Escribí Bresenham tres veces —cripta, sigilo, nave— y la búsqueda de camino
 * cinco. Cada copia funcionaba, y ése es justo el problema: **el día que una se
 * arregle, las otras seguirán mal**. Ya pasó con la política oscilante de
 * sokoban y volvió a pasar, calcada, en la cabina; si el algoritmo hubiera
 * estado en un sitio, el segundo juego habría nacido arreglado.
 *
 * La regla del proyecto es usar lo que ya hay, y si hay que crear algo, que
 * siga el estándar de lo que hay. Estas dos van donde `azar.js` y
 * `descripcion.js`: al lado de las reglas, sin dependencias, puras.
 *
 * ⚠️ Y SON PURAS DEL SUSTRATO, COMO LOS PINTORES
 * `primerPaso` no recibe el estado del juego sino el cuadro que ve un asiento.
 * Eso no es elegancia: es lo que impide que una política de la casa haga trampa
 * mirando lo que su personaje no puede saber. Un algoritmo compartido que
 * aceptara el estado interno sería una puerta trasera en seis juegos a la vez.
 */

/** Las cuatro direcciones, con los nombres que usan todas las reglas. */
export const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };

export const suma = (q, [dx, dy]) => ({ x: q.x + dx, y: q.y + dy });

/**
 * ¿Se ve `b` desde `a`? Bresenham sobre una rejilla con muros.
 *
 * El muro del final SÍ se ve —ves la pared que te tapa— y lo de detrás no. Esa
 * distinción es la que hace que las esquinas escondan, y esconderse es medio
 * juego en cripta, en sigilo y en la nave.
 *
 * @param {(x:number,y:number)=>boolean} esMuro
 */
export function hayLinea(esMuro, a, b) {
    let x = a.x, y = a.y;
    const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y);
    const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let err = dx - dy;
    for (;;) {
        if (x === b.x && y === b.y) return true;
        if (!(x === a.x && y === a.y) && esMuro(x, y)) return false;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

/**
 * Primer paso del camino más corto hasta una meta, SOBRE EL SUSTRATO.
 *
 * @param {Object} sus       el cuadro que ve quien decide
 * @param {{x,y}} desde
 * @param {(i:number)=>boolean} esMeta   sobre índices de la rejilla
 * @param {Object} [opciones]
 * @param {Set<number>} [opciones.evitar]  casillas que no se quieren pisar
 * @param {boolean} [opciones.cruzarNiebla=false]  planificar por lo no visto
 *
 * ⚠️ `cruzarNiebla` NO ES UN DETALLE DE RENDIMIENTO: CAMBIA EL JUEGO.
 *
 * Por defecto se entra en la niebla y ahí se para, porque no se puede planificar
 * a través de lo que no se sabe: una casilla sin explorar es destino válido y
 * callejón para el algoritmo. Eso es literalmente la exploración por frontera de
 * cripta y de sigilo.
 *
 * Pero en la nave el plano es público y lo que se ignora es quién anda por cada
 * sala: ahí sí se planifica por sitios que ahora mismo no ves. Confundir las dos
 * ignorancias costó dos intentos y una tripulación que hacía cero tareas de seis.
 */
export function primerPaso(sus, desde, esMeta, opciones = {}) {
    const { evitar = null, cruzarNiebla = false } = opciones;
    const { ancho, alto, celdas, niebla } = sus.rejilla;
    const inicio = desde.y * ancho + desde.x;
    if (esMeta(inicio)) return null;

    // Dos pasadas cuando hay casillas a evitar: primero limpio, y si no hay
    // camino limpio, por donde sea. Sin la segunda, un agente se quedaría
    // parado ante un peligro rodeable sólo pisándolo.
    for (const limpio of (evitar ? [true, false] : [false])) {
        const visto = new Set([inicio]);
        const cola = [{ q: desde, primera: null }];
        while (cola.length) {
            const n = cola.shift();
            for (const [dir, d] of Object.entries(DIRS)) {
                const q = suma(n.q, d);
                if (q.x < 0 || q.y < 0 || q.x >= ancho || q.y >= alto) continue;
                const i = q.y * ancho + q.x;
                if (visto.has(i) || (limpio && evitar?.has(i))) continue;
                visto.add(i);
                const primera = n.primera ?? dir;
                if (esMeta(i)) return primera;
                if (celdas[i] === 1) continue;
                if (!cruzarNiebla && niebla?.[i] === 1) continue;
                cola.push({ q, primera });
            }
        }
    }
    return null;
}
