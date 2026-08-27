/**
 * BallisticSystem — CAER, Y DE VEZ EN CUANDO NO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const salto = new BallisticSystem({ gravedad: -38, velMax: 26 });
 *     if (pulsas) salto.impulso(pajaro, 14);
 *     salto.caer(pajaro, dt);
 *
 * Gravedad, integración de Euler y un empujón hacia arriba cuando alguien lo
 * pide. Es la ley de todo lo que salta, se lanza o se deja caer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ÉSTE NO SALIÓ EXTRAÍDO, Y ES EL ÚNICO DE LOS TRES. CONVIENE DECIRLO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Hitbox` y `ScrollTrackSystem` se sacaron de Pedrisco con su huella `fd061509`
 * de arnés: estaban escritos ahí dentro y salieron sin mover un bit. Con éste
 * fui a hacer lo mismo y **no había de dónde**. Buscado en los 65 sistemas:
 *
 *   · `KinematicRageSystem` tiene gravedad de verdad y headless, pero está
 *     moldeado para escombros: un estallido único, rebote, rotación y fricción.
 *     No tiene «empujón a demanda», que es la mitad del asunto.
 *   · `KinematicControllerSystem` DECLARA `config.gravity` y está en la lista de
 *     átomos de movimiento, pero pide una malla de THREE y su modo de andar
 *     —`FPS_WALK`— ni siquiera está implementado. Un átomo que no se puede
 *     llamar sin navegador no le sirve a un núcleo sin pantalla.
 *   · El resto de la casa no tiene gravedad. Ninguno de los doce juegos salta.
 *
 * O sea que esto no era deuda escondida: era un hueco. Y la diferencia importa,
 * porque una extracción se prueba con la huella del donante y esto no tiene
 * donante — lo prueba el juego que lo estrena, que es una prueba más floja.
 *
 * ⚠️ POR ESO SE LE BUSCÓ SEGUNDO LLAMADOR EL MISMO DÍA.
 *
 * Una pieza con un solo llamador es un ayudante privado disfrazado de sistema:
 * nace con la forma de quien la pidió y nadie descubre que no vale hasta el
 * segundo. `paso()` es la forma PURA —números entrando y saliendo, sin objeto—
 * justamente para que `KinematicRageSystem` pudiera adoptarla sin cambiar dónde
 * guarda su estado. La adopción se comprobó con una huella de mano: doce
 * escombros, 240 pasos, mismo resumen antes y después (`0fa3c20e`).
 */

export class BallisticSystem {
    /**
     * @param {Object} [cfg]
     * @param {number} [cfg.gravedad=-60] hacia abajo es negativo
     * @param {number} [cfg.velMax=Infinity] tope de caída, si el juego lo quiere
     */
    constructor(cfg = {}) {
        this.gravedad = cfg.gravedad ?? -60;
        this.velMax = cfg.velMax ?? Infinity;
    }

    /**
     * Un paso de caída, en crudo. La gravedad entra en la velocidad ANTES de que
     * la velocidad mueva la posición — que es el orden que ya tenía
     * `KinematicRageSystem`, y cambiarlo daría otra trayectoria.
     *
     * Se devuelve un objeto en vez de mutar porque quien tiene su estado en otra
     * forma —`{position:{y}, rageState:{velocity:{y}}}`, por ejemplo— no puede
     * pasarnos su cuerpo: puede pasarnos sus números.
     */
    static paso(y, vy, dt, gravedad) {
        const nv = vy + gravedad * dt;
        return { y: y + nv * dt, vy: nv };
    }

    /**
     * El paso, sobre un cuerpo con `{y, vy}`. Aplica además el tope de caída, si
     * lo hay: sin tope, un pájaro que lleva tres segundos cayendo baja tan
     * rápido que ya no se puede corregir, y la partida se decide antes de que la
     * persona vea qué pasó.
     */
    caer(cuerpo, dt) {
        const r = BallisticSystem.paso(cuerpo.y, cuerpo.vy ?? 0, dt, this.gravedad);
        cuerpo.vy = Math.max(-this.velMax, Math.min(this.velMax, r.vy));
        cuerpo.y = r.y;
        return cuerpo;
    }

    /**
     * El empujón. Se ASIGNA la velocidad, no se suma, y eso es una decisión de
     * diseño, no un descuido: aporrear la tecla no debe acumular impulso. Con
     * suma, el juego se gana pulsando muy rápido; con asignación, cada pulsación
     * vale lo mismo y lo que decide es CUÁNDO.
     */
    impulso(cuerpo, v) {
        cuerpo.vy = v;
        return cuerpo;
    }
}

export default BallisticSystem;
