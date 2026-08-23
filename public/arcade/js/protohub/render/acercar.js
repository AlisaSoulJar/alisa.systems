/**
 * acercar.js — QUÉ PIEZA ES CUÁL, Y CUÁNTO SE ACERCA A SU SITIO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El sustrato manda una FOTO: dónde está todo ahora. Para que una ficha se vea
 * VIAJAR en vez de aparecer, hay que saber qué pieza de la foto nueva es cuál de
 * la vieja — y eso el sustrato sólo lo dice cuando el juego publica `id`.
 *
 * Esto vive suelto y sin THREE a propósito. `pintar3d.js` necesita un lienzo y
 * una escena para arrancar, así que su lógica no se puede probar sin navegador; y
 * el emparejamiento es justo la parte que se equivoca en silencio. Mismo motivo
 * por el que `medir.mjs` y `enfrentar.mjs` viven fuera de sus guiones.
 *
 * ⚠️ CÓMO SE EQUIVOCA ESTO SIN DAR ERROR
 *
 *   · si empareja mal, una ficha quieta sale deslizándose y la que se movió
 *     aparece de golpe — o sea, se ve MÁS movimiento y peor;
 *   · si no empareja nada, todo se teletransporta, que es exactamente el aspecto
 *     que había antes, así que el fallo se disfraza de «todavía no está hecho»;
 *   · si empareja piezas que están lejísimos, una ficha nueva llega deslizándose
 *     desde donde estaba otra — un movimiento que nadie hizo. En un juego con
 *     recibo, inventarse un movimiento es peor que dar un salto.
 */

/** Cuánto se acerca la pieza a su destino en cada fotograma. */
export const ACERCAMIENTO = 0.18;
/** Más lejos que esto no es un movimiento: es otra pieza. Se pone y ya. */
export const SALTO = 6;

/**
 * Empareja las posiciones mostradas con los destinos y devuelve dónde hay que
 * dibujar ahora.
 *
 * @param {{x:number,z:number,id?:string}[]} previas   dónde se está dibujando
 * @param {{x:number,z:number,id?:string}[]} objetivos dónde debería estar
 * @returns {{x:number,z:number,id?:string,venia:boolean}[]}
 *
 * Con `id` se empareja por nombre, que es exacto. Sin `id`, por cercanía: cuando
 * una ficha se mueve, todas las demás casan consigo mismas a distancia cero y la
 * que sobra es la que viajó. Es una asignación voraz y no óptima — con dos fichas
 * cruzándose a la vez puede equivocarse— y se prefiere a lo óptimo porque el caso
 * de dos movimientos simultáneos no existe en un juego por turnos.
 */
export function acercar(previas, objetivos, acercamiento = ACERCAMIENTO, salto = SALTO) {
    const porId = new Map(previas.filter((v) => v.id !== undefined).map((v) => [v.id, v]));
    const libres = previas.filter((v) => v.id === undefined);
    const fuera = [];

    for (const o of objetivos) {
        let venia = null;
        if (o.id !== undefined && porId.has(o.id)) {
            venia = porId.get(o.id);
            porId.delete(o.id);
        } else {
            let mejor = -1, dist = Infinity;
            for (let i = 0; i < libres.length; i++) {
                const d = (libres[i].x - o.x) ** 2 + (libres[i].z - o.z) ** 2;
                if (d < dist) { dist = d; mejor = i; }
            }
            if (mejor >= 0 && dist <= salto * salto) venia = libres.splice(mejor, 1)[0];
        }
        fuera.push({
            x: venia ? venia.x + (o.x - venia.x) * acercamiento : o.x,
            z: venia ? venia.z + (o.z - venia.z) * acercamiento : o.z,
            id: o.id,
            venia: !!venia,
        });
    }
    return fuera;
}
