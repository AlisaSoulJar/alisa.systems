/**
 * HealthSystem — ENCAJAR UN GOLPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const cuerpo = HealthSystem.crear({ hp: 3, gracia: 2.5 });
 *     HealthSystem.tick(cuerpo, dt);
 *     const r = HealthSystem.golpe(cuerpo, 15);   // → {encajado, muerto, hp}
 *
 * Puntos de vida, daño, una ventana en la que no te pueden dar, y morirse. Es la
 * otra mitad de disparar, y estaba escrita cuatro veces.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LOS CUATRO TIENEN VENTANA, Y NINGUNO LA LLAMA IGUAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     Pedrisco      `ship.invuln` — tras un golpe no te pueden dar otra vez
 *     BulletHeaven  `player.invuln` + `damageReduce`
 *     TurretCombat  `stunTimer` — la torreta aturdida ni dispara ni encaja
 *     ¡Defiende!    `a.hp` a secas, sin ventana
 *
 * `stunTimer` y `invuln` parecen dos cosas y son la misma: **un reloj durante el
 * cual este cuerpo está fuera del intercambio**. Que uno se llame aturdimiento y
 * el otro invulnerabilidad es la piel; la regla es una.
 *
 * Y esa unificación no es cosmética: es lo que permite que un juego declare
 * «mis torretas se aturden 8 s» y otro «mi nave tiene 2,5 s de gracia» con la
 * misma pieza y sin que ninguno de los dos sepa del otro.
 *
 * ⚠️ LO QUE NO HACE: DECIDIR QUÉ PASA AL MORIR.
 *
 * Devuelve `muerto: true` y se calla. Quién suma puntos, quién suelta un premio
 * y quién quita la malla es del juego — y meterlo aquí obligaría a esta pieza a
 * conocer marcadores, botín y dibujo, que es cómo un átomo se convierte en un
 * motor.
 */

export class HealthSystem {
    /**
     * @param {Object} [cfg]
     * @param {number} [cfg.hp=1]        vida actual
     * @param {number} [cfg.hpMax]       tope; por defecto, la de salida
     * @param {number} [cfg.gracia=0]    segundos sin poder recibir tras un golpe
     * @param {number} [cfg.reduce=0]    fracción del daño que se descuenta [0,1]
     */
    static crear(cfg = {}) {
        const hp = cfg.hp ?? 1;
        return {
            hp,
            hpMax: cfg.hpMax ?? hp,
            gracia: cfg.gracia ?? 0,
            reduce: cfg.reduce ?? 0,
            /** Lo que queda de ventana. Mientras sea > 0, este cuerpo no encaja. */
            aSalvo: 0,
            muerto: false,
        };
    }

    /** Baja la ventana. Devuelve `true` el paso en que se acaba de abrir. */
    static tick(cuerpo, dt) {
        if (cuerpo.aSalvo <= 0) return false;
        cuerpo.aSalvo -= dt;
        if (cuerpo.aSalvo <= 0) { cuerpo.aSalvo = 0; return true; }
        return false;
    }

    /** ¿Se le puede dar ahora mismo? */
    static alcanzable(cuerpo) {
        return !cuerpo.muerto && cuerpo.aSalvo <= 0;
    }

    /**
     * Un golpe.
     *
     * ⚠️ `letal` SALTA LA REDUCCIÓN Y LA VENTANA, y existe porque Pedrisco lo
     * necesita: chocar contra un monolito mata aunque acabes de recibir. Sin ese
     * parámetro habría que escribir la excepción fuera, y entonces habría dos
     * sitios decidiendo cuándo mueres.
     *
     * @returns {{encajado:boolean, muerto:boolean, hp:number}}
     */
    static golpe(cuerpo, dmg = 1, { letal = false } = {}) {
        if (cuerpo.muerto) return { encajado: false, muerto: true, hp: cuerpo.hp };
        if (!letal && cuerpo.aSalvo > 0) return { encajado: false, muerto: false, hp: cuerpo.hp };

        const real = letal ? cuerpo.hp : dmg * (1 - cuerpo.reduce);
        cuerpo.hp -= real;
        cuerpo.aSalvo = letal ? 0 : cuerpo.gracia;
        if (cuerpo.hp <= 0) { cuerpo.hp = 0; cuerpo.muerto = true; }
        return { encajado: true, muerto: cuerpo.muerto, hp: cuerpo.hp };
    }

    /** Curar, con el tope puesto. Devuelve cuánto entró de verdad. */
    static curar(cuerpo, cuanto) {
        const antes = cuerpo.hp;
        cuerpo.hp = Math.min(cuerpo.hpMax, cuerpo.hp + cuanto);
        return cuerpo.hp - antes;
    }

    /** En [0,1], para una barra o para una observación. */
    static fraccion(cuerpo) {
        return cuerpo.hpMax ? cuerpo.hp / cuerpo.hpMax : 0;
    }
}

export default HealthSystem;
