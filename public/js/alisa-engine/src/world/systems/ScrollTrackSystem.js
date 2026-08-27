/**
 * ScrollTrackSystem — LA VÍA: UN MUNDO QUE AVANZA Y NO VUELVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const via = new ScrollTrackSystem({ velocidad: 20, visible: 130, cola: 30 });
 *     via.avanzar(dt);
 *     if (pocos) sembrar(via.frente());
 *     via.segar(this.asteroides, 30);
 *
 * Tres números y tres preguntas: dónde voy, dónde nace lo que aún no se ve, y
 * qué se ha quedado tan atrás que ya no cuenta.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTUVE A PUNTO DE NO ESCRIBIRLO, Y ESO ES PARTE DE LO QUE HACE FALTA SABER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La primera lectura decía que aquí no había pieza. El avance de un scroller es
 * `recorrido += velocidad * dt` — UNA línea— y compartir una línea no es
 * componer, es ceremonia. `globalZ` se lee en veinte sitios de Pedrisco y
 * diecisiete son lecturas: sacarlas todas sería mover código de sitio y llamarlo
 * arquitectura.
 *
 * Lo que sí se repite es lo otro: **cuatro sitios preguntan si algo se ha
 * quedado atrás**, con tres márgenes distintos —30 para asteroides, 30 para
 * enemigos, 20 para objetos, 30 otra vez en `OrbitalKinematicsSystem`— y con dos
 * nombres para la misma marca (`dead` en un sitio, `gc` en otro). Eso es una
 * mecánica: «lo que la vía deja atrás deja de existir», escrita cuatro veces y
 * desincronizada ya en el nombre.
 *
 * ⚠️ PERO LO QUE SE COMPARTE ES LA PREGUNTA, NO EL BUCLE. Y ESO LO DECIDIÓ EL
 *    CÓDIGO, NO YO.
 *
 * La primera versión traía un `segar(lista, margen)` que recorría la lista y
 * marcaba. Al ir a enchufarlo salió que en Pedrisco cada bucle **mueve la pieza
 * y DESPUÉS pregunta**, en el mismo paso. Un `segar` por fuera preguntaría con
 * la posición de antes de moverse: mismo resultado casi siempre, distinto justo
 * en el borde — y «casi siempre» en un banco que verifica volviendo a jugar es
 * una tarde perdida buscando qué se rompió.
 *
 * Así que `segar` se cayó. Con él fuera, la pieza es lo que comparten dos juegos
 * de verdad y ni una línea más. La tentación de meterle además «mantener la
 * población» —sembrar cuando bajen de N— se resistió por lo mismo: hoy sólo la
 * querría un llamador, y una pieza con un solo llamador es un ayudante privado
 * disfrazado de sistema.
 *
 * ⚠️ Y LAS CUENTAS CONSERVAN SU FORMA, QUE ES LO QUE MANTIENE LA HUELLA QUIETA.
 *
 * `o.z < recorrido - margen` y no `recorrido - o.z > margen`. En coma flotante
 * no son lo mismo, y esto se estrenó sustituyendo a un juego con notas selladas.
 */

export class ScrollTrackSystem {
    /**
     * @param {Object}  [cfg]
     * @param {number}  [cfg.velocidad=20] cuánto avanza la vía por segundo
     * @param {number}  [cfg.visible=130]  cuánto se ve por delante
     * @param {number}  [cfg.cola=30]      cuánto se conserva por detrás
     * @param {string}  [cfg.eje='z']      sobre qué coordenada corre
     */
    constructor(cfg = {}) {
        this.velocidad = cfg.velocidad ?? 20;
        this.visible = cfg.visible ?? 130;
        this.cola = cfg.cola ?? 30;
        this.eje = cfg.eje ?? 'z';
        this.recorrido = cfg.desde ?? 0;
    }

    reset(desde = 0) {
        this.recorrido = desde;
    }

    /**
     * Un paso de vía. Devuelve cuánto ha avanzado, porque casi siempre hay algo
     * más que quiere moverse lo mismo —una cámara, un fondo— y calcularlo dos
     * veces es cómo la cámara y el mundo acaban en sitios distintos.
     */
    avanzar(dt, velocidad = this.velocidad) {
        const d = velocidad * dt;
        this.recorrido += d;
        return d;
    }

    /** Dónde nace lo que aún no se ve. `extra` para sembrar más allá del borde. */
    frente(extra = 0) {
        return this.recorrido + this.visible + extra;
    }

    /**
     * ¿Se ha quedado atrás? Es la pregunta que se repetía cuatro veces, y va sin
     * bucle a propósito: quien la hace ya está recorriendo su lista y haciendo
     * lo suyo por el camino. Ver el aviso de la cabecera.
     */
    quedaAtras(o, margen = this.cola) {
        return o[this.eje] < this.recorrido - margen;
    }
}

export default ScrollTrackSystem;
