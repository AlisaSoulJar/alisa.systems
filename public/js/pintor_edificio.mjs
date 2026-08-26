/**
 * pintor_edificio.mjs — EL TERCER PINTOR: UN EDIFICIO DE PUERTAS, EN VOLUMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const pintor = new PintorEdificio(puertas, ESTILO);
 *     pintor.pintar(nucleo.sustrato());     // una vez por jugada
 *
 * Hermano de `PintorMundo` (piezas sueltas en un volumen) y de `PintorMatriz`
 * (una cuadrícula plana). Éste pinta el caso que faltaba: una cuadrícula que
 * existe **dentro de un edificio en 3D** — plantas × puertas — donde las mallas
 * no las fabrica él, se las dan hechas.
 *
 * Pide lo mismo que los otros dos: `pintar(sustrato)` y nada más. No sabe qué es
 * un mapache ni qué es una pista.
 *
 * ⚠️ POR QUÉ HACE FALTA, Y NO VALÍA NINGUNO DE LOS DOS.
 *
 * `croupier_corp_building_3d.html` ya mapeaba las puertas de la fábrica a los
 * sitios del juego y las coloreaba al abrirlas. Pero lo hacía leyendo el
 * RESULTADO de la jugada, no el sustrato — y con un diccionario de colores
 * escrito así:
 *
 *     const COL = { '¡ENCONTRADO!': …, 'CALIENTE': …, 'TIBIO': …, 'FRÍO': … };
 *
 * Ese vocabulario lleva meses sin existir: las bandas de este juego son
 * `caliente · fresco · helado` desde que se pasó a la escala común del banco. O
 * sea que **ninguna puerta se coloreaba nunca**, y nadie lo notó porque no da
 * error: simplemente no pasa nada.
 *
 * Leyendo el SUSTRATO eso no puede ocurrir: los tipos que publica el núcleo
 * —`sin_mirar`, `mirado`, `mapache`— son los mismos que dibuja el pintor plano y
 * los mismos que lee un agente. Un vocabulario, tres puertas.
 */

/**
 * El encuadre inicial. Va aquí y no en la página por la misma razón que
 * `encuadrarTorre`: desde dónde se mira decide tanto como de qué color es cada
 * puerta — y porque `paginas.mjs` cuenta «mueve objetos 3D» con un techo que
 * SÓLO PUEDE BAJAR. Con el encuadre escrito en la página el total subía de 339 a
 * 340, y la respuesta correcta a esa vara no es levantarla.
 *
 * A escala real de la fábrica: pasillo de 28, fondo de 30 y plantas de 5, así que
 * hay que alejarse bastante para ver el edificio entero.
 */
export function encuadrarEdificio(gfx, plantas = 8, altoPlanta = 5) {
    const alto = plantas * altoPlanta;
    /**
     * ⚠️ SE APUNTA AL CENTRO, Y ESO HAY QUE SABERLO DE LA FÁBRICA.
     *
     * `ProceduralBuildingFactory` CENTRA su edificio en el origen —baja el grupo
     * media altura— así que las plantas van de −alto/2 a +alto/2, no de 0 hacia
     * arriba como en la torre del dron. Apuntando a `alto * 0.25` se veían bien
     * las cuatro de arriba y las cuatro de abajo quedaban de refilón, oscuras.
     * Medido en pantalla: parecía un problema de luz y era de puntería.
     */
    gfx.camera.position.set(alto * 0.7, alto * 0.62, alto * 2.1);
    gfx.controls.target.set(0, alto * 0.45, 0);
    gfx.controls.update();
}

export class PintorEdificio {
    /**
     * @param {Array}  puertas  `[{ malla, planta, indice, tipo }, …]` — las mallas
     *                          las trae quien construya el edificio
     * @param {Object} estilo   `{ [tipo]: { color, emision? } }`
     * @param {Object} THREE
     */
    constructor(puertas, estilo, THREE) {
        this.puertas = puertas;
        this.estilo = estilo;
        this.THREE = THREE;
        /**
         * El material de cada puerta se CLONA la primera vez. Las mallas de la
         * fábrica comparten material entre plantas —es lo eficiente para ella— y
         * teñir uno teñiría todas: al abrir la puerta A de la planta 3 se
         * encenderían las veintitrés. Medido en la primera pasada.
         */
        for (const p of puertas) {
            if (p.malla?.material && !p.malla.userData.__propio) {
                p.malla.material = p.malla.material.clone();
                p.malla.userData.__propio = true;
                p.malla.userData.__base = p.malla.material.color.clone();
            }
        }
    }

    /**
     * Pinta un sustrato. Cada pieza que traiga `x` (índice) e `y` (planta) se
     * busca entre las puertas y se tiñe según su tipo.
     */
    pintar(sus) {
        let tocadas = 0;
        for (const pieza of (sus?.piezas ?? [])) {
            const e = this.estilo[pieza.t];
            if (!e) continue;
            const puerta = this.puertas.find(
                (p) => p.planta === pieza.y && p.indice === pieza.x);
            if (!puerta?.malla?.material) continue;
            const m = puerta.malla.material;
            m.color.set(e.color);
            if ('emissive' in m) {
                m.emissive.set(e.emision ?? e.color);
                m.emissiveIntensity = e.brillo ?? 0.0;
            }
            tocadas++;
        }
        return tocadas;
    }
}
