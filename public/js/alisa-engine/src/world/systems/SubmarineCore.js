/**
 * SubmarineCore.js — ¡SOBREVIVE! EN EL AGUA: NO SER LO QUE SE COMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pilotas un submarino del tamaño de un pez en un tanque con una cadena trófica
 * viva: plancton que aparece, peces que forrajean y hacen banco, cazadores que
 * los siguen por el olor, y tiburones. Comes plancton para no quedarte sin
 * energía y te escondes entre medusas y arrecifes cuando algo grande se acerca.
 *
 * ⚠️ LAS REGLAS NO SON MÍAS: YA ESTABAN ESCRITAS.
 *
 * `EcosystemSystem` son 520 líneas con forrajeo, huida, banco, metabolismo,
 * escondite en medusas y coral, y estigmergia por feromonas. Está sembrado y es
 * headless. Lo único que le faltaba era alguien a quien le importara.
 *
 * Por eso este núcleo no inventa una mecánica de supervivencia: **te mete
 * dentro de la que ya corría**. El submarino se comporta como un pez más ante
 * los cazadores y los tiburones, que es exactamente la definición de la saga —
 * «no ser lo que se comen».
 *
 * ⚠️ DE DÓNDE SALE ESTA MITAD.
 *
 * `ChopperAquariumEngine` tenía dos juegos dentro, medido casi al 50%: 37
 * referencias al edificio y 30 al ecosistema. La mitad que BUSCA se fue a
 * `DroneTowerCore` (¡Busca! 7). Ésta es la que queda, y el rascacielos dentro
 * de una pecera deja de hacer falta: sin él, un tanque con peces es sólo un
 * tanque con peces.
 */
import { EcosystemSystem } from './EcosystemSystem.js';
import { PheromoneGrid } from './PheromoneGrid.js';
import { VolumeVehicleSystem } from './VolumeVehicleSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';

export const VERBS = ['nada', 'subir', 'bajar', 'izquierda', 'derecha', 'adelante', 'esconderse'];

export class SubmarineCore {
    constructor(cfg = {}) {
        this.lado = cfg.lado ?? 120;
        this.altura = cfg.altura ?? 112;
        this.peces = cfg.peces ?? 25;
        this.cazadores = cfg.cazadores ?? 4;
        this.tiburones = cfg.tiburones ?? 2;
        this.medusas = cfg.medusas ?? 5;
        this.arrecifes = cfg.arrecifes ?? 4;

        this.planctonInicial = cfg.plancton ?? 90;
        this.planctonTope = cfg.planctonTope ?? 140;
        this.energiaInicial = cfg.energia ?? 100;
        this.gasto = cfg.gasto ?? 1.2;          // metabolismo
        this.daPlancton = cfg.daPlancton ?? 12;
        this.bocado = cfg.bocado ?? 3.0;        // a qué distancia se come
        this.alcanceCaza = cfg.alcanceCaza ?? 4.0;
        this.aguanta = cfg.aguanta ?? 120;      // segundos para ganar

        this.reglas = new EcosystemSystem({ rng: () => this.rng() });
        this.vehiculo = new VolumeVehicleSystem({
            ancho: this.lado, alto: this.altura, largo: this.lado,
            velMax: cfg.velMax ?? 14, rozamiento: 0.93,
        });
        this.reset(cfg.seed ?? 42);
    }

    // ── contrato ────────────────────────────────────────────────────────────

    reset(semilla = 42) {
        this.semilla = semilla >>> 0;
        this.rng = mulberry32(this.semilla);
        this.t = 0;
        this.energia = this.energiaInicial;
        this.comidos = 0;
        this.estado = { jugando: true, terminado: false, ganado: false, escondido: false };

        this.rejilla = new PheromoneGrid(this.lado, this.altura, this.lado, 8.0, 5.0);

        const S = this.lado;
        const suelto = (k = 0.8) => (this.rng() - 0.5) * S * k;
        const bicho = (id, vel, extra = {}) => ({
            id, x: suelto(), y: 10 + this.rng() * 40, z: suelto(),
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0,
            speed: vel, timer: 0, stamina: 100, alive: true, score: 0,
            state: 'wander', hideTimer: 0, hideCooldown: 0, ...extra,
        });

        /**
         * ⚠️ EL PLANCTON HAY QUE SEMBRARLO, Y NADIE LO SEMBRABA.
         *
         * `tickPlankton` sólo MUEVE el que ya existe: le da su vaivén, lo mantiene
         * dentro del tanque y, cada seis o diez segundos, levanta un
         * `spawnTrigger` para que quien llama cree uno nuevo. No crea ninguno.
         *
         * Y `ChopperAquariumEngine.reset()` dejaba `plankton`, `ecosystemCorals` y
         * `ecosystemJellyfishes` como arrays VACÍOS. O sea que el ecosistema de esa
         * etapa llevaba desde siempre sin base: veinticinco peces sin nada que
         * comer y sin dónde esconderse, nadando por inercia. Por eso parecía
         * decorado — es que lo era.
         *
         * Medido aquí antes de arreglarlo: 60 segundos de partida, plancton = 0
         * en todo momento, y las cinco semillas acabando idénticas al agotarse el
         * metabolismo. Un juego de comer sin comida.
         */
        this.plancton = Array.from({ length: this.planctonInicial }, (_, i) =>
            this._granoDePlancton(`p_${i}`));
        this._siguienteGrano = this.planctonInicial;

        this.peces_ = Array.from({ length: this.peces }, (_, i) => bicho(`f_${i}`, 2));
        this.cazadores_ = Array.from({ length: this.cazadores }, (_, i) => bicho(`h_${i}`, 4, { energy: 100 }));
        this.tiburones_ = Array.from({ length: this.tiburones }, (_, i) => bicho(`s_${i}`, 3));

        /**
         * Medusas y arrecifes son los ESCONDITES, y el ecosistema ya sabe usarlos:
         * un pez perseguido corre a uno y se queda hasta que le vuelve la calma.
         * El submarino usa los mismos, que es lo que hace que la mecánica de
         * esconderse no haya que escribirla.
         */
        this.medusas_ = Array.from({ length: this.medusas }, (_, i) => ({
            id: `j_${i}`, x: suelto(0.7), y: 15 + this.rng() * 50, z: suelto(0.7), r: 6,
        }));
        this.arrecifes_ = Array.from({ length: this.arrecifes }, (_, i) => ({
            id: `c_${i}`, x: suelto(0.7), y: 4 + this.rng() * 8, z: suelto(0.7), r: 8,
        }));

        this.vehiculo.reset({ x: 0, y: this.altura * 0.35, z: 0 }, { x: 3, y: 0, z: 3 });
        return this.sustrato();
    }

    /** Familia de TIEMPO REAL: el agua no espera. */
    tick(dt = 1 / 60, mando = null) {
        if (this.estado.terminado) return this.info();
        this.t += dt;

        /**
         * `maxPlankton` va dentro de TANK porque es donde `tickPlankton` lo
         * busca: sin ese campo, `planctonArr.length < undefined` es SIEMPRE falso
         * y no se levanta jamás la bandera de nacer. Otro cero silencioso.
         */
        const TANK = { size: this.lado, height: this.altura, maxPlankton: this.planctonTope };
        this.plancton = this.reglas.tickPlankton(this.plancton, dt, TANK, this.t);
        // La bandera la levanta el ecosistema; nacer es cosa de quien tiene el mundo.
        for (const g of this.plancton) {
            if (!g.spawnTrigger) continue;
            g.spawnTrigger = false;
            if (this.plancton.length < this.planctonTope) {
                this.plancton.push(this._granoDePlancton(`p_${this._siguienteGrano++}`));
            }
        }

        /**
         * ⚠️ EL SUBMARINO ENTRA EN LA LISTA DE PECES, Y AHÍ ESTÁ EL JUEGO.
         *
         * Los cazadores y los tiburones persiguen lo que haya en `fishes`. Si el
         * submarino se quedara fuera de esa lista sería un fantasma: vería el
         * ecosistema sin pertenecer a él, y «no ser lo que se comen» no
         * significaría nada. Se mete como uno más y se saca antes de que las
         * reglas lo muevan — moverlo lo mueve quien pilota, no el forrajeo.
         */
        const yo = {
            id: 'submarino', alive: true,
            x: this.vehiculo.pos.x, y: this.vehiculo.pos.y, z: this.vehiculo.pos.z,
            vx: this.vehiculo.vel.x, vy: this.vehiculo.vel.y, vz: this.vehiculo.vel.z,
            speed: 0, timer: 0, stamina: 100, state: 'wander',
            hideTimer: 0, hideCooldown: 0, tx: 0, ty: 0, tz: 0,
        };

        this.reglas.tickFishes(this.peces_, this.cazadores_, this.tiburones_,
            this.plancton, this.medusas_, this.arrecifes_, dt, this.t, TANK, this.rejilla);
        this.reglas.tickHunters(this.cazadores_, [...this.peces_, yo], this.tiburones_,
            this.medusas_, this.arrecifes_, dt, this.t, TANK, this.rejilla);
        this.reglas.tickSharks(this.tiburones_, this.cazadores_, [...this.peces_, yo],
            this.medusas_, this.arrecifes_, dt, this.t, TANK, this.rejilla);

        if (mando) this._pilotar(mando, dt);
        else this._pilotarSolo(dt);
        this.vehiculo.acelerar(this.vehiculo.bordes(10, 22), dt);
        this.vehiculo.avanzar(dt);

        this._comer();
        this._mirarSiMeAlcanzan();

        this.energia -= this.gasto * dt;
        if (this.energia <= 0) { this.energia = 0; this._acabar(false); }
        if (this.t >= this.aguanta) this._acabar(true);
        return this.info();
    }

    /** ¿Estoy dentro de una medusa o un arrecife? Ahí no me ven. */
    escondido() {
        const p = this.vehiculo.pos;
        const dentroDe = (o) => ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2) < o.r * o.r;
        return this.medusas_.some(dentroDe) || this.arrecifes_.some(dentroDe);
    }

    terminado() { return this.estado.terminado; }

    // ── el mundo, en el idioma común ────────────────────────────────────────

    /**
     * ⚠️ EL PLANCTON NO ENTRA, IGUAL QUE EN EL MOTOR DEL QUE SALE ESTO.
     * Son cientos de puntos que no cambian ninguna partida. El sustrato describe
     * el estado del juego, no el decorado, y meter cientos de piezas lo haría
     * ilegible justo donde hay que mirar. Lo que SÍ entra es cuánto queda, como
     * escalar — porque de eso depende comer.
     */
    sustrato() {
        const piezas = [];
        const mete = (lista, t, de, r) => {
            for (const o of lista) {
                if (o.alive === false) continue;
                piezas.push({ x: o.x, y: o.z, alto: o.y, t, de, cajon: o.id,
                              ...(r ? { alcance: o.r } : {}) });
            }
        };
        mete(this.peces_, 'pez', 1);
        mete(this.cazadores_, 'cazador', 2);
        mete(this.tiburones_, 'tiburon', 3);
        mete(this.medusas_, 'medusa', 4, true);
        mete(this.arrecifes_, 'arrecife', 5, true);
        piezas.push(this.vehiculo.pieza({ t: 'submarino', de: 0, cajon: 'submarino' }));

        return {
            piezas,
            zonas: [],
            limite: { forma: 'caja', ancho: this.lado, alto: this.altura, largo: this.lado },
            leyenda: {
                submarino: 'tú', pez: 'un pez', cazador: 'un cazador',
                tiburon: 'un tiburón', medusa: 'medusa — aquí no te ven',
                arrecife: 'arrecife — aquí no te ven',
            },
            simbolos: {
                submarino: '@', pez: '.', cazador: 'c', tiburon: 'T',
                medusa: 'o', arrecife: '#',
            },
        };
    }

    info() {
        return {
            t: Math.round(this.t * 10) / 10,
            energia: Math.round(this.energia * 10) / 10,
            plancton: this.plancton.length,
            comidos: this.comidos,
            escondido: this.estado.escondido,
            aguanta: this.aguanta,
            terminado: this.estado.terminado,
            ganado: this.estado.ganado,
        };
    }

    // ── por dentro ──────────────────────────────────────────────────────────

    /**
     * Un grano de plancton con los campos que `tickPlankton` espera: `phase`,
     * `baseY` y `ampY` son su vaivén vertical, y `spawnTimer` el reloj que decide
     * cuándo pide que nazca otro.
     */
    _granoDePlancton(id) {
        const S = this.lado;
        const y = 6 + this.rng() * (this.altura * 0.7);
        return {
            id, alive: true,
            x: (this.rng() - 0.5) * S * 0.9,
            y, baseY: y,
            z: (this.rng() - 0.5) * S * 0.9,
            ampY: 1 + this.rng() * 3,
            phase: this.rng() * Math.PI * 2,
            spawnTimer: 2 + this.rng() * 8,
            spawnTrigger: false,
        };
    }

    _acabar(ganado) {
        this.estado.jugando = false;
        this.estado.terminado = true;
        this.estado.ganado = ganado;
    }

    _pilotar(m, dt) {
        const a = { x: 0, y: 0, z: 0 };
        if (m.subir) a.y += 26;
        if (m.bajar) a.y -= 26;
        if (m.izquierda) a.x -= 26;
        if (m.derecha) a.x += 26;
        if (m.adelante) a.z -= 26;

        /**
         * ⚠️ `esconderse` EMPUJA HACIA EL REFUGIO, NO TELETRANSPORTA.
         *
         * La tentación era meter al submarino dentro del escondite más cercano de
         * un salto: es una línea y «funciona». Pero entonces esconderse dejaría de
         * ser una decisión —cuándo dejo de comer y corro— para ser un botón de
         * inmunidad. Lo que hace jugable esto es que llegar cuesta tiempo, y el
         * tiempo cuesta energía.
         */
        if (m.esconderse) {
            const p = this.vehiculo.pos;
            const d2 = (o) => (o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2;
            const refugio = [...this.medusas_, ...this.arrecifes_]
                .reduce((mej, o) => (!mej || d2(o) < d2(mej) ? o : mej), null);
            if (refugio) {
                const dir = { x: refugio.x - p.x, y: refugio.y - p.y, z: refugio.z - p.z };
                VolumeVehicleSystem.normalizar(dir);
                a.x += dir.x * 30; a.y += dir.y * 30; a.z += dir.z * 30;
            }
        }
        this.vehiculo.acelerar(a, dt);
    }

    /**
     * El piloto automático: huir a un escondite si hay algo grande cerca, y si
     * no, ir a por el grano de plancton más próximo.
     *
     * Dos estados y ninguna memoria, a propósito: es la LÍNEA BASE del banco, y
     * una línea base tiene que ser fácil de superar y fácil de entender. Si
     * jugara bien, un agente que la iguale no habría demostrado nada.
     */
    _pilotarSolo(dt) {
        const p = this.vehiculo.pos;
        const d2 = (o) => (o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2;
        const masCerca = (lista) => lista.reduce(
            (m, o) => (o.alive === false ? m : (!m || d2(o) < d2(m) ? o : m)), null);

        const amenaza = [...this.tiburones_, ...this.cazadores_]
            .filter((o) => o.alive !== false && d2(o) < 30 ** 2);

        const destino = amenaza.length
            ? masCerca([...this.medusas_, ...this.arrecifes_])
            : masCerca(this.plancton);
        if (!destino) return;

        const dir = { x: destino.x - p.x, y: destino.y - p.y, z: destino.z - p.z };
        VolumeVehicleSystem.normalizar(dir);
        const fuerza = amenaza.length ? 34 : 22;
        this.vehiculo.acelerar(
            { x: dir.x * fuerza, y: dir.y * fuerza, z: dir.z * fuerza }, dt);
    }

    _comer() {
        const p = this.vehiculo.pos;
        const r2 = this.bocado * this.bocado;
        for (let i = this.plancton.length - 1; i >= 0; i--) {
            const q = this.plancton[i];
            if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 + (q.z - p.z) ** 2 > r2) continue;
            this.plancton.splice(i, 1);
            this.energia = Math.min(this.energiaInicial, this.energia + this.daPlancton);
            this.comidos++;
        }
    }

    _mirarSiMeAlcanzan() {
        this.estado.escondido = this.escondido();
        if (this.estado.escondido) return;      // dentro no te ven
        const p = this.vehiculo.pos;
        const r2 = this.alcanceCaza * this.alcanceCaza;
        const cerca = (o) => o.alive !== false
            && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2 < r2;
        if (this.tiburones_.some(cerca) || this.cazadores_.some(cerca)) this._acabar(false);
    }
}
