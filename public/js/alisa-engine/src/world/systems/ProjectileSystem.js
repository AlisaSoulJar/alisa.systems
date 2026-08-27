/**
 * ProjectileSystem — LO QUE SALE DISPARADO Y VUELA EN RECTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const balas = new ProjectileSystem({ tipos: TIPOS_BALA });
 *     balas.soltar({ desde, hacia, tipo: 'cohete', deQuien: 'jugador' });
 *     const muertas = balas.tick(dt);
 *
 * Nace, vuela, envejece y desaparece. El IMPACTO no está aquí: lo resuelve
 * `Hitbox`, que es quien sabe qué toca a qué, y el juego decide qué significa.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ TRES DE LOS CUATRO QUE DISPARAN. EL CUARTO NO ENTRA, Y SE DICE POR QUÉ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     TurretCombat   `pos += vel*dt; life -= dt; si ≤0 muere`   ✔ dos listas
 *     Pedrisco       `p.life -= dt` con `vx,vy,vz` y radio      ✔
 *     BulletHeaven   `proj.life -= dt`, se quita del array      ✔
 *     ¡Defiende!     **persigue a un objetivo fijado**          ✘
 *
 * Las balas de ¡Defiende! no vuelan: van hacia un objetivo, impactan cuando el
 * paso del fotograma supera la distancia que falta, y **no hacen ni una prueba
 * de colisión**. Si el objetivo muere antes, la bala se pierde a propósito
 * —«reasignar sería regalar puntería que la torreta no tiene»—.
 *
 * Meterla aquí con un `if (guiado)` sería lo mismo que unificar `EcosystemSystem`
 * con `BoidsSystem` porque los dos «hacen bandada»: parecerse no es ser igual.
 * La tabla de tipos deja sitio para un `guiado` el día que haya un SEGUNDO
 * perseguidor; con uno solo sería un parámetro escrito para nadie.
 *
 * ⚠️ Y LOS TIPOS VAN EN TABLA, COMO `AST_TYPES` Y COMO LAS TORRETAS.
 *
 * Pedrisco tiene tipos de bala desde siempre —cohete, láser, doble, abanico— y
 * los lleva repartidos en una cadena de `else if` con el radio escrito a fuego
 * en medio (`type === 'rocket' ? 1.2 : 0.5`). Es exactamente lo que `AST_TYPES`
 * arregló para los asteroides: una tabla que se lee de un vistazo y se compara
 * con la de otro juego.
 */

export class ProjectileSystem {
    /**
     * @param {Object} [cfg]
     * @param {Object} [cfg.tipos]  `{ nombre: {vel, vida, radio, dmg} }`
     * @param {string} [cfg.piel='bala'] cómo se llama en el sustrato
     */
    constructor(cfg = {}) {
        this.tipos = cfg.tipos ?? { bala: { vel: 25, vida: 5, radio: 0.5, dmg: 10 } };
        this.piel = cfg.piel ?? 'bala';
        this.balas = [];
        this._n = 0;
    }

    reset() {
        this.balas = [];
        this._n = 0;
    }

    /**
     * Una bala nueva. `hacia` es una dirección —no hace falta normalizarla, se
     * normaliza aquí— y el resto sale de la tabla salvo lo que se pise a mano.
     *
     * ⚠️ EL ID ES UN CONTADOR, NO AZAR. Un identificador sorteado gasta una
     * tirada del generador y corre la secuencia entera: el mismo mundo con la
     * misma semilla dejaría de repetirse por culpa de un nombre.
     */
    /**
     * ⚠️ `velocidad` EXISTE PARA NO NORMALIZAR DOS VECES, Y NO ES UN CAPRICHO.
     *
     * Quien ya tiene la velocidad calculada —`dir(a,b)` multiplicado por la
     * rapidez, que es lo que hacía `TurretCombatSystem`— la pasa tal cual. Si en
     * vez de eso le pasara el vector unitario en `hacia`, esto lo volvería a
     * dividir por su módulo: un módulo que vale «uno coma algo en el último bit»,
     * y el resultado deja de ser el mismo número.
     *
     * En un banco donde una partida se verifica volviéndola a jugar, ese bit es
     * la diferencia entre una huella quieta y una tarde perdida.
     */
    soltar({ desde, hacia = null, velocidad = null, tipo = this.piel, deQuien = null, vel = null, extra = null }) {
        const t = this.tipos[tipo] ?? this.tipos[Object.keys(this.tipos)[0]];
        let vx = 0, vy = 0, vz = 0;
        if (velocidad) {
            vx = velocidad.x ?? 0; vy = velocidad.y ?? 0; vz = velocidad.z ?? 0;
        } else if (hacia) {
            const hx = hacia.x ?? 0, hy = hacia.y ?? 0, hz = hacia.z ?? 0;
            const m = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
            const v = vel ?? t.vel;
            vx = (hx / m) * v; vy = (hy / m) * v; vz = (hz / m) * v;
        }
        const b = {
            id: `${this.piel}_${this._n++}`,
            tipo, deQuien,
            x: desde.x ?? 0, y: desde.y ?? 0, z: desde.z ?? 0,
            vx, vy, vz,
            vida: t.vida, radius: t.radio, dmg: t.dmg,
            muerta: false,
            ...(extra ?? {}),
        };
        this.balas.push(b);
        return b;
    }

    /**
     * Un paso de vuelo. Devuelve las que se han apagado por vejez, porque quien
     * dibuja necesita saber cuáles quitar y quien puntúa a veces cobra por
     * fallar.
     *
     * ⚠️ SE MUEVE Y DESPUÉS SE ENVEJECE, EN ESE ORDEN. Es el que tenían los tres
     * donantes, y al revés una bala recorrería un fotograma de menos.
     */
    tick(dt) {
        const caducadas = [];
        for (const b of this.balas) {
            if (b.muerta) continue;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            b.vida -= dt;
            if (b.vida <= 0) { b.muerta = true; caducadas.push(b); }
        }
        return caducadas;
    }

    /** Las que siguen volando. */
    vivas() {
        return this.balas.filter((b) => !b.muerta);
    }

    /** Marcar una como gastada — al impactar, por ejemplo. */
    matar(bala) {
        if (bala) bala.muerta = true;
        return bala;
    }

    /**
     * Barre las muertas. Aparte del `tick` a propósito: quien dibuja necesita
     * ver la marca ANTES de que desaparezcan para quitarles la malla, igual que
     * en `ScrollTrackSystem`.
     */
    barrer() {
        const antes = this.balas.length;
        this.balas = this.balas.filter((b) => !b.muerta);
        return antes - this.balas.length;
    }

    /** Las balas, para el sustrato. */
    piezas({ de = 3 } = {}) {
        return this.vivas().map((b) => ({
            t: this.piel, x: b.x, y: b.z, alto: b.y, de,
            cajon: b.id, clase: b.tipo, alcance: b.radius, deQuien: b.deQuien,
        }));
    }

    vocabulario() {
        return {
            leyenda: { [this.piel]: 'un disparo en el aire' },
            simbolos: { [this.piel]: '·' },
        };
    }
}

export default ProjectileSystem;
