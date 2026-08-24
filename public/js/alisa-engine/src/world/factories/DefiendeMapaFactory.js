/**
 * DefiendeMapaFactory — EL TERRENO DE ¡DEFIENDE!, SEPARADO DE LAS REGLAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Genera la matriz y el sendero. Nada más: no sabe qué es una torreta, ni cuánto
 * cuesta, ni cuándo se pierde una vida.
 *
 * Está aparte porque es la pieza que va a cambiar en cada etapa de la saga. La
 * siguiente será otro trazado —dos entradas, o un cruce, o un mapa con zonas
 * donde no se puede construir— y eso es un mapa nuevo, no un juego nuevo. Si el
 * trazado viviera dentro de las reglas, cada etapa sería una copia del motor, que
 * es la avería que este proyecto lleva toda la semana pagando.
 *
 * Y no dibuja: devuelve números. Quien pinte —la página en 2D, el agente en su
 * vector— recibe lo mismo.
 */

/** Lo que puede haber en una celda. Es el alfabeto del mundo. */
export const CELDA = { LIBRE: 0, CAMINO: 1, NUCLEO: 2, ENTRADA: 3, TORRETA: 4 };

export class DefiendeMapaFactory {
    /**
     * ⚠️ LA PRIMERA VERSIÓN HACÍA UN PASILLO, NO UN SENDERO.
     *
     * Iba del borde al núcleo sin volver nunca atrás, con «desvíos laterales».
     * Los desvíos no desviaban nada: al ser monótono, cada paso acercaba, así que
     * el camino medía siempre la distancia Manhattan y punto. Medido en 40
     * semillas: **de 7 a 13 celdas, mediana 9**, sobre un mínimo teórico de 7.
     *
     * Y eso no es estético: con nueve celdas un bicho cruza en cinco segundos,
     * las torretas apenas disparan, y la partida se gana llenando el mapa en vez
     * de eligiendo bien. O sea que el juego medía «¿tienes presupuesto?» en vez
     * de «¿dónde lo pones?», que es lo único que esta etapa existe para medir.
     *
     * Con tramos en L entre puntos de paso: **de 12 a 49, mediana 29**.
     *
     * Dos reglas que tampoco son estéticas:
     *
     *   1. **siempre hay camino**. Cada tramo es monótono hacia su punto de paso,
     *      así que nunca se atasca. Un laberinto sembrado puede quedar cerrado, y
     *      un tower defense sin ruta no es difícil: es imposible, y la partida no
     *      lo diría — los atacantes simplemente no llegarían nunca.
     *   2. **el jugador ve el camino entero desde el principio**. Aquí no se mide
     *      adivinar por dónde vienen: se mide DÓNDE PONES lo que tienes. Esconder
     *      la ruta convertiría el juego en otra cosa.
     *
     * @param {number} lado tamaño de la matriz
     * @param {() => number} rnd generador sembrado, [0,1)
     * @returns {{rejilla:number[][], camino:{x,z}[], entrada:{x,z}, nucleo:{x,z}}}
     */
    trazar(lado, rnd) {
        const L = lado;
        const g = Array.from({ length: L }, () => new Array(L).fill(CELDA.LIBRE));
        const cz = Math.floor(L / 2), cx = Math.floor(L / 2);

        const jalones = [];
        const borde = Math.floor(rnd() * 4);
        const r = () => Math.floor(rnd() * L);
        jalones.push(borde === 0 ? { x: 0, z: r() }
                   : borde === 1 ? { x: L - 1, z: r() }
                   : borde === 2 ? { x: r(), z: 0 }
                   :               { x: r(), z: L - 1 });
        const nJalones = 2 + Math.floor(rnd() * 2);   // 2 o 3 puntos intermedios
        for (let i = 0; i < nJalones; i++) jalones.push({ x: r(), z: r() });
        jalones.push({ x: cx, z: cz });

        const entrada = { ...jalones[0] };
        const camino = [{ ...jalones[0] }];

        for (let i = 1; i < jalones.length; i++) {
            const a = camino[camino.length - 1], b = jalones[i];
            // El orden del tramo en L también se sortea: si fuera siempre
            // «primero en horizontal», todos los mapas tendrían la misma forma.
            const ejes = rnd() < 0.5 ? ['x', 'z'] : ['z', 'x'];
            let cur = { ...a };
            for (const eje of ejes) {
                while (cur[eje] !== b[eje]) {
                    cur = { ...cur, [eje]: cur[eje] + Math.sign(b[eje] - cur[eje]) };
                    camino.push({ ...cur });
                }
            }
        }

        for (const p of camino) {
            if (g[p.z][p.x] === CELDA.LIBRE) g[p.z][p.x] = CELDA.CAMINO;
        }
        g[entrada.z][entrada.x] = CELDA.ENTRADA;
        g[cz][cx] = CELDA.NUCLEO;

        return { rejilla: g, camino, entrada, nucleo: { x: cx, z: cz } };
    }
}
