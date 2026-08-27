/**
 * WeaponSystem — EL RITMO DE DISPARO, Y NADA MÁS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const arma = WeaponSystem.crear({ cadencia: 0.6 });
 *     if (WeaponSystem.listo(arma, dt)) { disparar(); WeaponSystem.gastar(arma, azar); }
 *
 * Un reloj que baja y dice cuándo puedes volver a disparar. Eso es todo lo que
 * hace, y es a propósito: quién dispara, hacia dónde y con qué es del juego.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LOS CUATRO QUE DISPARAN EN ESTA CASA COINCIDEN EN LA LEY. SE COMPROBÓ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Antes de sacar esto fui a mirar si los cuatro hacían lo mismo o sólo se
 * parecían, que es la diferencia que casi me cuesta unificar dos Reynolds
 * distintos:
 *
 *     TurretCombat   `fireTimer -= dt; si ≤0 → dispara; fireTimer = int + azar*0,5`
 *     Pedrisco       `fireCooldown -= dt; si ≤0 → dispara; = 0,3 * fireRateMult`
 *     BulletHeaven   `w.timer -= dt; si ≤0 → w.timer = w.cd; dispara`
 *     ¡Defiende!     `t.timer -= dt; si ≤0 → busca objetivo; t.timer = cadencia`
 *
 * Los cuatro **REPONEN** el reloj, no le restan el sobrante. Y eso importa:
 * `SpawnWaveSystem` —el calendario de oleadas— hace lo contrario (`acum -= cada`)
 * porque ahí sí quiere conservar el resto. Dos relojes con dos leyes, y ninguna
 * es «la buena»: reponer pierde el sobrante y con dt variable dispara un pelo
 * más despacio; restar mantiene el ritmo exacto y puede disparar dos veces en un
 * fotograma largo. Un arma quiere lo primero; un calendario, lo segundo.
 *
 * ⚠️ Y ¡DEFIENDE! APORTA UN PARÁMETRO QUE PARECÍA UN DESCUIDO Y NO LO ES.
 *
 * Su torreta sólo repone el reloj **si encontró a quién disparar**: sin objetivo
 * se queda cargada y dispara en cuanto entra alguien en su alcance. Es una
 * decisión de diseño —no desperdicias la recarga esperando— y por eso está aquí
 * como `guardaCarga` en vez de quedarse escondida en un `continue`.
 */

export class WeaponSystem {
    /**
     * Un arma es cuatro números. No es una clase a propósito: hay juegos con
     * una y juegos con doscientas, y doscientos objetos con métodos cuestan más
     * que doscientos objetos planos.
     *
     * @param {Object} [cfg]
     * @param {number} [cfg.cadencia=1] segundos entre disparos
     * @param {number} [cfg.jitter=0]   cuánto se desordena la recarga, con azar
     * @param {number} [cfg.desfase=0]  con qué reloj empieza (para escalonar)
     * @param {boolean}[cfg.guardaCarga=false] si se queda cargada al no disparar
     */
    static crear(cfg = {}) {
        return {
            cadencia: cfg.cadencia ?? 1,
            jitter: cfg.jitter ?? 0,
            guardaCarga: cfg.guardaCarga ?? false,
            reloj: cfg.desfase ?? 0,
        };
    }

    /**
     * Baja el reloj y dice si se puede disparar. **No lo gasta**: eso es
     * `gastar`, y están separados porque entre «puedo» y «disparo» hay juegos
     * que meten una decisión —buscar objetivo, mirar si el jugador quiere— y ahí
     * es donde vive `guardaCarga`.
     */
    static listo(arma, dt) {
        arma.reloj -= dt;
        return arma.reloj <= 0;
    }

    /**
     * Repone el reloj. `azar` sólo hace falta si el arma tiene `jitter`.
     *
     * ⚠️ SE REPONE, NO SE RESTA. Ver la cabecera: es la ley que comparten los
     * cuatro, y cambiarla movería la cadencia de todos ellos.
     */
    static gastar(arma, azar = null) {
        arma.reloj = arma.cadencia + (arma.jitter && azar ? azar() * arma.jitter : 0);
        return arma.reloj;
    }

    /** Lo contrario de gastar: dejarla cargada. Para el caso de ¡Defiende!. */
    static reservar(arma) {
        if (!arma.guardaCarga) WeaponSystem.gastar(arma);
        return arma.reloj;
    }

    /** Cuánto falta, en [0,1], para quien quiera pintar una barra de recarga. */
    static recarga(arma) {
        if (!arma.cadencia) return 1;
        return Math.max(0, Math.min(1, 1 - arma.reloj / arma.cadencia));
    }
}

export default WeaponSystem;
