import { GymEnv } from '../GymEnv.js';
import { SubmarineCore } from '../../world/systems/SubmarineCore.js';

/**
 * ¡SOBREVIVE! EN EL AGUA — NO SER LO QUE SE COMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pilotas un submarino del tamaño de un pez dentro de una cadena trófica viva:
 * plancton que aparece, peces que forrajean y hacen banco, cazadores que los
 * siguen por el olor, tiburones. Comes plancton para no quedarte sin energía y
 * te metes en medusas y arrecifes cuando algo grande se acerca.
 *
 * ⚠️ SUSTITUYE A `alisa/ChopperAquarium-v0`, Y NO ES UN `-v1`.
 *
 * Un `-v1` dice «el mismo juego, que cambió de comportamiento». Esto es OTRO
 * juego: aquel escaneaba las plantas de un rascacielos metido en una pecera —su
 * portada decía «scanning a procedural skyscraper for a hidden raccoon», que es
 * ¡Busca!— y esta es la mitad que de verdad pertenecía a ¡Sobrevive!. La mitad
 * que buscaba se fue a `alisa/DroneTower-v0`.
 *
 * Se retira en vez de versionarse porque llamarlo `-v1` invitaría a comparar sus
 * notas con las del acuario, y no hay nada comparable entre buscar y sobrevivir.
 * Medido antes de decidirlo: CERO referencias a `ChopperAquarium` en
 * `resultados/tabla.json` y `matriz.json`, así que no se retira ninguna nota.
 *
 * ⚠️ Y LAS REGLAS NO SON NUEVAS: `EcosystemSystem` ya las tenía todas.
 * Forrajeo, huida, banco, metabolismo, escondite y feromonas — 520 líneas
 * sembradas y headless que no usaba ninguna etapa. Lo único que faltaba era
 * alguien a quien le importara, y que alguien SEMBRARA el plancton: el acuario
 * dejaba `plankton`, `ecosystemCorals` y `ecosystemJellyfishes` vacíos, así que
 * sus peces llevaban desde siempre sin comida y sin escondites.
 */
export class SubmarineEnv extends GymEnv {
    static id = 'alisa/Submarine-v0';
    /** El nucleo, expuesto: es por donde se llega a la `familia` del cartucho. */
    static Core = SubmarineCore;

    static ajustes = {
        lado: 120, altura: 112, peces: 25, cazadores: 4, tiburones: 2,
        medusas: 5, arrecifes: 4, energia: 100, aguanta: 120,
    };

    static observationSpace = { type: 'box', shape: [11], low: -1, high: 1 };

    /** Seis direcciones y esconderse. `esconderse` no teletransporta: acerca. */
    static actionSpace = { type: 'discrete', n: 7 };

    static meta = {
        title: '¡Sobrevive! — Submarino',
        summary: 'Un submarino del tamaño de un pez en un tanque con cadena trófica: '
               + 'come plancton para no quedarte sin energía y métete en las medusas '
               + 'o el arrecife cuando se acerquen los cazadores o un tiburón.',
        horizon: 9000,
        tags: ['supervivencia', 'ecosistema', 'volumen', 'recurso', 'continuo'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = { ...new.target.ajustes, ...opts };
        this.nucleo = new SubmarineCore(this.opts);
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.nucleo = new SubmarineCore({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        const a = Number(action) | 0;
        const antes = this.nucleo.energia;

        this.nucleo.tick(dt, {
            subir: a === 1, bajar: a === 2,
            izquierda: a === 3, derecha: a === 4,
            adelante: a === 5,
            // `esconderse` es empujar hacia el escondite más cercano: el juego no
            // regala posiciones, y un botón que teletransporta no es una decisión.
            esconderse: a === 6,
        });

        this.steps++;
        this.done = this.nucleo.terminado();

        /**
         * La recompensa dice lo que el juego quiere: seguir vivo y comer. No se
         * premia esconderse: esconderse es un MEDIO, y premiar el medio enseña a
         * quedarse dentro de una medusa las dos horas sin comer nada.
         */
        let recompensa = dt * 0.5;
        if (this.nucleo.energia > antes) recompensa += 2;
        if (this.done) recompensa += this.nucleo.estado.ganado ? 50 : -50;

        return {
            obs: this.getObservation(),
            reward: recompensa,
            done: this.done,
            info: this.nucleo.info(),
        };
    }

    getObservation() {
        const n = this.nucleo;
        const v = n.vehiculo;
        const p = v.pos;
        const diag = Math.hypot(n.lado, n.altura, n.lado);
        const cerca = (lista) => {
            let mejor = null;
            for (const o of lista) {
                if (o.alive === false) continue;
                const d = Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z);
                if (!mejor || d < mejor.d) mejor = { o, d };
            }
            return mejor;
        };
        const comida = cerca(n.plancton);
        const bicho = cerca([...n.cazadores_, ...n.tiburones_]);
        const refugio = cerca([...n.medusas_, ...n.arrecifes_]);
        return [
            n.energia / n.energiaInicial,
            n.t / n.aguanta,
            p.x / (n.lado / 2), p.y / n.altura, p.z / (n.lado / 2),
            v.vel.x / v.velMax, v.vel.y / v.velMax, v.vel.z / v.velMax,
            comida ? 1 - Math.min(1, comida.d / diag) : 0,
            bicho ? 1 - Math.min(1, bicho.d / diag) : 0,
            refugio ? 1 - Math.min(1, refugio.d / diag) : 0,
        ];
    }

    describe() {
        const n = this.nucleo;
        const i = n.info();
        const p = n.vehiculo.pos;
        const dist = (o) => Math.round(Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z));
        const amenazas = [...n.cazadores_, ...n.tiburones_]
            .filter((o) => o.alive !== false && dist(o) < 35)
            .sort((a, b) => dist(a) - dist(b)).slice(0, 3);
        const refugio = [...n.medusas_, ...n.arrecifes_]
            .sort((a, b) => dist(a) - dist(b))[0];

        return `Estás en el agua, a ${Math.round(p.y)} de altura. Energía `
             + `${Math.round(i.energia)} de ${n.energiaInicial}, y baja sola. `
             + `Llevas ${i.t} segundos de los ${i.aguanta} que hay que aguantar. `
             + `Has comido ${i.comidos} de plancton. `
             + (i.escondido ? 'Estás DENTRO de un escondite: aquí no te ven. ' : '')
             + (amenazas.length
                 ? `Cerca: ${amenazas.map((o) => `${o.id.startsWith('s') ? 'un tiburón' : 'un cazador'} a ${dist(o)}`).join(', ')}. `
                 : 'No hay nada grande cerca. ')
             + (refugio ? `El escondite más próximo está a ${dist(refugio)}. ` : '')
             + (i.terminado
                 ? (i.ganado ? 'Aguantaste.' : 'Se acabó.')
                 : 'Come plancton y no dejes que te alcancen.');
    }

    affordances() {
        if (this.nucleo.terminado()) return [];
        return [
            { verb: 'esperar', args: {}, action: 0, metodo: 'esperar', params: [],
              desc: 'Dejarse llevar — la energía sigue bajando' },
            /**
             * ⚠️ `#mover |dirección`, NO `#subir`. La ley AIO de esta casa dice
             * que la dirección va de parámetro, para que un modelo aprenda
             * `#mover` una vez y lo aplique a las trece. Lo escribí mal en la
             * torre y me lo cazó `prueba_gramatica`; aquí ya va bien de origen.
             */
            { verb: 'subir', args: {}, action: 1, metodo: 'mover', params: ['subir'], desc: 'Ascender' },
            { verb: 'bajar', args: {}, action: 2, metodo: 'mover', params: ['bajar'], desc: 'Descender' },
            { verb: 'izquierda', args: {}, action: 3, metodo: 'mover', params: ['izquierda'], desc: 'Ir a babor' },
            { verb: 'derecha', args: {}, action: 4, metodo: 'mover', params: ['derecha'], desc: 'Ir a estribor' },
            { verb: 'adelante', args: {}, action: 5, metodo: 'mover', params: ['adelante'], desc: 'Avanzar' },
            { verb: 'esconderse', args: {}, action: 6, metodo: 'esconderse', params: [],
              desc: 'Ir hacia el escondite más cercano — dentro de una medusa o del arrecife no te ven' },
        ];
    }

    actFromVerb(verb) {
        const i = ['esperar', 'subir', 'bajar', 'izquierda', 'derecha', 'adelante', 'esconderse']
            .indexOf(verb);
        return i < 0 ? null : i;
    }

    getScore() {
        const n = this.nucleo;
        const i = n.info();
        return {
            score: Math.round((i.t / n.aguanta) * 1000) / 1000,
            metrics: {
                aguantada: i.ganado, segundos: i.t, comidos: i.comidos,
                energia: i.energia, plancton: i.plancton,
            },
        };
    }

    sustrato() { return this.nucleo.sustrato(); }
}
