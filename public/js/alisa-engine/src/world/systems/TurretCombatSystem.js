// ============================================================================
// TurretCombatEngine.js
// Headless deterministic physics and state engine for Search & Rescue combat
// Maps 3D vector arithmetic locally without requiring Three.js dependencies.
// ============================================================================
import { Hitbox } from './HitboxSystem.js';
import { WeaponSystem } from './WeaponSystem.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { HealthSystem } from './HealthSystem.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTE FICHERO ERA EL 90% DE UN SISTEMA DE DISPARO, ESCONDIDO EN UN JUEGO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ciento ochenta y tres líneas headless con cadencia escalonada, balas con vida,
 * impactos, daño y aturdimiento. Todo bien hecho, y todo hablando el idioma de
 * UN solo juego: sus métodos se llaman `chopperBullets`, su `tick` pide
 * `chopperPos` y `chopperForward`, y sus radios de impacto (`< 16.0`, `< 4.0`),
 * su daño (15) y su aturdimiento (8 s) están escritos a fuego en medio del bucle.
 *
 * Es lo mismo que le pasaba a la vía dentro de Pedrisco: la pieza existía y no
 * se podía llamar desde otro sitio. Ahora las cuatro leyes que tenía dentro
 * —tocar, recargar, volar y encajar— viven fuera, y aquí queda lo que de verdad
 * es de este juego: que hay torretas, que apuntan al helicóptero, y que un
 * disparo suyo puede reventar una bala enemiga en el aire.
 *
 * Comprobado con una huella de mano —seis torretas, 900 pasos, un piloto fijo—:
 * mismo resumen `c621a176` antes y después.
 */
export class TurretCombatSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible firing pattern.
     */
    /**
     * ⚠️ LOS NÚMEROS DE LOS CHOQUES SALEN DE AQUÍ Y ANTES NO SALÍAN DE NINGÚN
     *    SITIO: estaban en el bucle, como `< 16.0` y `< 4.0`, al cuadrado y sin
     *    nombre. Son radios de 4 y de 2, y ahora se leen.
     */
    static ALCANCES = { alHelicoptero: 4.0, aLaTorreta: 4.0, balaContraBala: 2.0 };
    static DANO_AL_HELICOPTERO = 15;

    constructor(config = {}) {
        this.turrets = [];

        this.fireInterval = config.fireInterval || 2.5;
        this.stunDuration = config.stunDuration || 8.0;
        this.chopperCooldown = config.chopperCooldown || 0.5;
        this.bulletSpeed = config.bulletSpeed || 25.0;

        /**
         * Las dos remesas de balas, cada una con su tabla de un solo tipo. Son
         * dos `ProjectileSystem` y no uno con un campo `deQuien` porque el juego
         * las trata distinto: las del helicóptero pueden reventar a las otras en
         * el aire, y las otras no pueden reventar nada.
         */
        this.balasTorreta = new ProjectileSystem({
            piel: 'bala_torreta',
            tipos: { bala: { vel: this.bulletSpeed, vida: 5.0, radio: 0, dmg: TurretCombatSystem.DANO_AL_HELICOPTERO } },
        });
        this.balasHelicoptero = new ProjectileSystem({
            piel: 'bala_helicoptero',
            tipos: { bala: { vel: this.bulletSpeed * 2, vida: 3.0, radio: 0, dmg: 0 } },
        });

        this.armaHelicoptero = WeaponSystem.crear({ cadencia: this.chopperCooldown });

        // Semilla inyectable. Sin ella el desfase inicial y la cadencia de las
        // torretas cambian en cada partida y un combate no se puede volver a
        // jugar igual. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
    }

    /**
     * ⚠️ EL ARMA Y EL CUERPO SON PIEZAS, PERO LA TORRETA SIGUE SIENDO SUYA.
     *
     * `fireTimer`, `stunTimer` y `hp` se quedan como campos visibles porque son
     * lo que lee quien dibuja una torreta; lo que hay debajo son un
     * `WeaponSystem` y un `HealthSystem`, y son ellos los que llevan la cuenta.
     *
     * El desfase inicial —`fireInterval * azar()`, una tirada por torreta— no se
     * mueve de sitio ni de orden: es lo que hace que seis torretas no disparen a
     * la vez, y correrlo cambiaría el combate entero con la misma semilla.
     */
    addTurret(id, x, y, z) {
        const t = {
            id: id,
            pos: { x, y, z },
            arma: WeaponSystem.crear({
                cadencia: this.fireInterval,
                jitter: 0.5,
                desfase: this.fireInterval * this.rng(),
            }),
            cuerpo: HealthSystem.crear({ hp: 3, gracia: 0 }),
        };
        /** Ventanas a las piezas, para no tener dos sitios con el mismo dato. */
        Object.defineProperties(t, {
            fireTimer: { get: () => t.arma.reloj, set: (v) => { t.arma.reloj = v; }, enumerable: true },
            stunTimer: { get: () => t.cuerpo.aSalvo, set: (v) => { t.cuerpo.aSalvo = v; }, enumerable: true },
            hp: { get: () => t.cuerpo.hp, set: (v) => { t.cuerpo.hp = v; }, enumerable: true },
        });
        this.turrets.push(t);
    }

    reset() {
        this.turrets.forEach(t => {
            t.cuerpo = HealthSystem.crear({ hp: 3, gracia: 0 });
            t.arma.reloj = this.fireInterval * this.rng();
        });
        this.balasTorreta.reset();
        this.balasHelicoptero.reset();
        this.armaHelicoptero.reloj = 0;
    }

    /** @deprecated Es `Hitbox.distanciaSq`. Se conserva porque el test la llama. */
    distSq(p1, p2) {
        return Hitbox.distanciaSq(p1, p2);
    }

    /**
     * ⚠️ LAS BALAS SIGUEN RESPONDIENDO A `pos`, `vel` Y `life`.
     *
     * `ProjectileSystem` las guarda planas —`x,y,z,vx,vy,vz,vida`— porque es lo
     * que usan los tres juegos que vuelan en recta. Este fichero las publicaba
     * con `pos`, `vel` y `life`, y eso lo leen `test_engines.js` y quien dibuje.
     *
     * `pos` devuelve la bala misma: como ya tiene `x`, `y` y `z`, `b.pos.x` lee
     * y `b.pos.x = 2` escribe, igual que antes y sin copiar nada. Es el mismo
     * truco de la ventana que le puse a `globalZ` en Pedrisco.
     *
     * Y sin esto no habría podido comprobar nada: el arnés de este refactor —una
     * partida de 900 pasos— lee `b.pos.x` y `b.life`. Un cambio de forma que
     * obliga a reescribir el arnés deja el «antes» sin con qué compararse.
     */
    _conNombresDeAntes(b) {
        Object.defineProperties(b, {
            pos: {
                get: () => b,
                /** También se puede asignar entera: la prueba de motores lo hace. */
                set: (p) => { b.x = p.x; b.y = p.y; b.z = p.z; },
                enumerable: false,
            },
            life: {
                get: () => b.vida, set: (v) => { b.vida = v; }, enumerable: false,
            },
            vel: {
                get: () => ({ x: b.vx, y: b.vy, z: b.vz }),
                set: (v) => { b.vx = v.x; b.vy = v.y; b.vz = v.z; },
                enumerable: false,
            },
        });
        return b;
    }

    // Helper: generate purely normalized directional vector
    dir(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (mag === 0) return {x:0, y:0, z:1};
        return { x: dx/mag, y: dy/mag, z: dz/mag };
    }

    tick(dt, chopperPos, chopperForward, wantFire) {
        const events = [];

        // 1. TURRET AI
        this.turrets.forEach(t => {
            /**
             * Aturdida: el reloj de la ventana baja y la torreta no hace nada
             * más. Su arma TAMPOCO se recarga mientras tanto — que era el efecto
             * del `return` de antes, y es una regla del juego, no un descuido.
             */
            if (t.cuerpo.aSalvo > 0) { HealthSystem.tick(t.cuerpo, dt); return; }

            if (WeaponSystem.listo(t.arma, dt)) {
                WeaponSystem.gastar(t.arma, this.rng);
                const d = this.dir(t.pos, chopperPos);
                const b = this.balasTorreta.soltar({
                    desde: t.pos,
                    velocidad: { x: d.x * this.bulletSpeed, y: d.y * this.bulletSpeed, z: d.z * this.bulletSpeed },
                });
                b.id = `tb_${this._bulletCounter++}`;
                this._conNombresDeAntes(b);
                events.push({ type: 'TURRET_FIRE', turretId: t.id, bulletId: b.id, pos: t.pos, dir: d });
            }
        });

        // 2. CHOPPER WEAPONS
        if (WeaponSystem.listo(this.armaHelicoptero, dt) && wantFire) {
            WeaponSystem.gastar(this.armaHelicoptero);
            const b = this.balasHelicoptero.soltar({
                desde: chopperPos,
                velocidad: {
                    x: chopperForward.x * this.bulletSpeed * 2,
                    y: chopperForward.y * this.bulletSpeed * 2,
                    z: chopperForward.z * this.bulletSpeed * 2,
                },
            });
            b.id = `cb_${this._bulletCounter++}`;
            this._conNombresDeAntes(b);
            events.push({ type: 'CHOPPER_FIRE', bulletId: b.id, pos: chopperPos, dir: chopperForward });
        }

        /**
         * 3. VUELO E IMPACTOS
         *
         * ⚠️ EL VUELO LO LLEVA LA PIEZA; EL ORDEN DE LOS AVISOS SIGUE SIENDO
         *    DEL REVÉS, Y ESO NO ES MANÍA.
         *
         * El bucle original recorría las balas de la última a la primera para
         * poder quitarlas con `splice` sin descolocar el índice. Consecuencia: si
         * dos caducan en el mismo paso, la última avisa primero. Nada del juego
         * depende de eso... salvo el ORDEN de la lista de eventos, que es lo que
         * lee quien dibuja y lo que compara una huella.
         *
         * `ProjectileSystem.tick` recorre hacia delante, así que aquí se le da la
         * vuelta a lo que devuelve. Conservar una rareza que no molesta cuesta
         * una línea; descubrir por qué se movió la huella cuesta una tarde.
         */
        const A = TurretCombatSystem.ALCANCES;
        const rTb = this.balasTorreta.tick(dt);
        for (let i = rTb.length - 1; i >= 0; i--) {
            events.push({ type: 'BULLET_EXPIRE', bulletType: 'turret', bulletId: rTb[i].id });
        }

        // Balas de torreta -> ¿le dan al helicóptero?
        const tb = this.balasTorreta.balas;
        for (let i = tb.length - 1; i >= 0; i--) {
            const b = tb[i];
            if (b.muerta) continue;
            if (Hitbox.distancia(b, chopperPos) < A.alHelicoptero) {
                events.push({ type: 'HIT_CHOPPER', bulletId: b.id, damage: b.dmg, rlReward: -2.0 });
                this.balasTorreta.matar(b);
            }
        }

        const rCb = this.balasHelicoptero.tick(dt);
        for (let i = rCb.length - 1; i >= 0; i--) {
            events.push({ type: 'BULLET_EXPIRE', bulletType: 'chopper', bulletId: rCb[i].id });
        }

        // Balas del helicóptero -> ¿torreta? ¿o una bala enemiga en el aire?
        const cb = this.balasHelicoptero.balas;
        for (let i = cb.length - 1; i >= 0; i--) {
            const b = cb[i];
            if (b.muerta) continue;
            let collision = false;

            for (let t of this.turrets) {
                if (HealthSystem.alcanzable(t.cuerpo) && Hitbox.distancia(b, t.pos) < A.aLaTorreta) {
                    /**
                     * El disparo no baja vida: ATURDE. Por eso se toca la ventana
                     * y no `golpe()` — en este juego una torreta no se destruye,
                     * se calla ocho segundos.
                     */
                    t.cuerpo.aSalvo = this.stunDuration;
                    events.push({ type: 'HIT_TURRET', bulletId: b.id, turretId: t.id, rlReward: 2.0 });
                    this.balasHelicoptero.matar(b);
                    collision = true;
                    break;
                }
            }
            if (collision) continue;

            const tbs = this.balasTorreta.balas;
            for (let j = tbs.length - 1; j >= 0; j--) {
                const otra = tbs[j];
                if (otra.muerta) continue;
                if (Hitbox.distancia(b, otra) < A.balaContraBala) {
                    events.push({ type: 'BULLET_CLASH', cBulletId: b.id, tBulletId: otra.id, rlReward: 0.5 });
                    this.balasTorreta.matar(otra);
                    this.balasHelicoptero.matar(b);
                    collision = true;
                    break;
                }
            }
        }

        /**
         * Y ahora se barren las gastadas. El original las quitaba con `splice` en
         * el momento; aquí se marcan y se barren al final, que es lo que permite
         * que los dos bucles vean la misma foto — antes, una bala reventada en el
         * primer bucle desaparecía a media pasada del segundo.
         */
        this.balasTorreta.barrer();
        this.balasHelicoptero.barrer();

        return events;
    }

    /**
     * ⚠️ LOS DOS NOMBRES DE ANTES SIGUEN AHÍ, Y NO ES POR NOSTALGIA.
     *
     * `turretBullets` y `chopperBullets` son lo que lee quien dibuja y lo que
     * llama la prueba de motores. Debajo son dos `ProjectileSystem`, pero
     * renombrar la puerta de golpe habría roto a los llamadores sin necesidad —
     * y una extracción que obliga a tocar a todos los de fuera no es una
     * extracción, es una mudanza.
     */
    get turretBullets() { return this.balasTorreta.vivas(); }

    get chopperBullets() { return this.balasHelicoptero.vivas(); }

    /** El reloj del helicóptero, por el mismo motivo. */
    get chopperFireTimer() { return this.armaHelicoptero.reloj; }

    set chopperFireTimer(v) { this.armaHelicoptero.reloj = v; }
}
