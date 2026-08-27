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

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL TABLERO ABIERTO — para el laberinto
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Aquí no se traza nada: **el suelo entero es andable y construible**, y el
     * camino lo dibuja quien juega poniendo torretas. Es la diferencia entera
     * entre las dos familias de tower defense:
     *
     *     sendero    el mapa trae la carretera y tú pones torres al lado
     *     laberinto  el mapa está vacío y tú DOBLAS la carretera con las torres
     *
     * Y por eso este método es tan corto y el de arriba tan largo: cuando el
     * jugador es quien construye el recorrido, el generador no tiene nada que
     * decidir salvo dónde se entra y dónde está lo que hay que proteger.
     *
     * ⚠️ LA ENTRADA Y EL NÚCLEO EN ESQUINAS OPUESTAS, Y NO ES DECORACIÓN.
     *
     * Es la distancia máxima que cabe en la matriz, o sea el mayor margen para
     * doblar. Si estuvieran cerca no habría sitio donde plegar la ruta, y el
     * juego se quedaría sin su única pregunta.
     *
     * `camino` sale vacío a propósito: en este modo la ruta no es del mapa, es
     * de cada bicho y se recalcula. Devolverlo aquí sería una verdad que caduca
     * en cuanto alguien construya.
     */
    abierto(lado, rnd) {
        const L = lado;
        const g = Array.from({ length: L }, () => new Array(L).fill(CELDA.LIBRE));

        /** Se sortea la esquina de entrada; el núcleo va en la de enfrente. */
        const esquina = Math.floor(rnd() * 4);
        const entrada = esquina === 0 ? { x: 0, z: 0 }
            : esquina === 1 ? { x: L - 1, z: 0 }
                : esquina === 2 ? { x: 0, z: L - 1 }
                    : { x: L - 1, z: L - 1 };
        const nucleo = { x: L - 1 - entrada.x, z: L - 1 - entrada.z };

        g[entrada.z][entrada.x] = CELDA.ENTRADA;
        g[nucleo.z][nucleo.x] = CELDA.NUCLEO;

        return { rejilla: g, camino: [], entrada, nucleo };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL TABLERO TALLADO — la ciudad de `CarverSystem`, usada de mapa
     * ═══════════════════════════════════════════════════════════════════════
     *
     * ⚠️ ESTO NO ES UN GENERADOR NUEVO: ES UNO QUE LLEVABA AÑOS AHÍ.
     *
     * `CarverSystem` reparte una ciudad sobre una rejilla con avenidas, calles,
     * plazas y barrios, sembrada y headless. Y su salida es, literalmente,
     * `1 = bloque construible · 0 = calle` — o sea **el tablero de un tower
     * defense**, escrito para otra cosa y esperando desde entonces.
     *
     * ⚠️ Y POR QUÉ IMPORTA PARA EL LABERINTO, QUE ES LO QUE SE MIDE.
     *
     * El tablero abierto está vacío, y medido resultó que sobre un tablero vacío
     * alfombrar de torretas baratas junto a la línea recta gana siempre: doblar
     * la carretera cuesta paredes que compras tú, y no hay nada que aproveches.
     *
     * Una ciudad tallada trae los muros puestos. La hipótesis era que la ruta
     * naciera doblada y que cada pared comprada sumara sobre lo que el mapa ya
     * te dio.
     *
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ Y LA HIPÓTESIS ERA FALSA. MEDIDA, PARA QUE NADIE LA REPITA.
     * ═══════════════════════════════════════════════════════════════════════
     *
     *     lado  libres  conectados   camino  distancia recta
     *       12    38%       5 de 10      14        14
     *       16    35%       0 de 10       —         —
     *       24    42%       6 de 10      42        42
     *       32    41%       0 de 10       —         —
     *
     * **El camino de la ciudad mide EXACTAMENTE la distancia recta.** Y tiene
     * sentido en cuanto se ve: las calles de `CarverSystem` son avenidas rectas
     * que se cruzan, o sea una cuadrícula — y en una cuadrícula el camino más
     * corto entre dos puntos ya es el mínimo posible. Un tablero de manzanas no
     * dobla nada: sólo quita sitio donde construir.
     *
     * Y encima conecta la mitad de las veces. `CarverSystem` se escribió para una
     * ciudad grande, y a estos tamaños sus avenidas no llegan a tocarse: la
     * entrada y el núcleo caen en bolsas de calle separadas.
     *
     * Así que ningún cartucho usa esto hoy. Se conserva porque es el único puente
     * entre el tallador y esta familia de juegos y alguien va a querer un tablero
     * de ciudad — pero que lo lea antes de contar con que doble la ruta.
     *
     * Las manzanas de la ciudad pasan a `CELDA.TORRETA`: son bloques que ni se
     * andan ni se construyen, que es exactamente lo que un edificio es aquí.
     */
    ciudad(lado, rnd, CarverSystem) {
        const L = lado;
        /**
         * La ciudad se siembra con una tirada del azar del núcleo, no con el
         * suyo: quien reparte el mundo es quien lleva la semilla de la partida.
         */
        const ciudad = new CarverSystem(L, L);
        ciudad.generate(Math.floor(rnd() * 2 ** 31));

        const g = Array.from({ length: L }, (_, z) =>
            Array.from({ length: L }, (_, x) => (ciudad.grid[z][x] ? CELDA.TORRETA : CELDA.LIBRE)));

        /**
         * La entrada y el núcleo van en calle, no dentro de una manzana. Se
         * busca la celda libre más cercana a cada esquina; si no hubiera
         * ninguna —una ciudad maciza— se abre a la fuerza, que es mejor que
         * devolver un mapa injugable.
         */
        const masCercaDe = (ex, ez) => {
            let mejor = null, mejorD = Infinity;
            for (let z = 0; z < L; z++) {
                for (let x = 0; x < L; x++) {
                    if (g[z][x] !== CELDA.LIBRE) continue;
                    const d = Math.abs(x - ex) + Math.abs(z - ez);
                    if (d < mejorD) { mejorD = d; mejor = { x, z }; }
                }
            }
            if (!mejor) { g[ez][ex] = CELDA.LIBRE; mejor = { x: ex, z: ez }; }
            return mejor;
        };

        const esquina = Math.floor(rnd() * 4);
        const eA = esquina === 0 ? { x: 0, z: 0 } : esquina === 1 ? { x: L - 1, z: 0 }
            : esquina === 2 ? { x: 0, z: L - 1 } : { x: L - 1, z: L - 1 };
        const entrada = masCercaDe(eA.x, eA.z);
        const nucleo = masCercaDe(L - 1 - eA.x, L - 1 - eA.z);

        g[entrada.z][entrada.x] = CELDA.ENTRADA;
        g[nucleo.z][nucleo.x] = CELDA.NUCLEO;

        return { rejilla: g, camino: [], entrada, nucleo };
    }
}
