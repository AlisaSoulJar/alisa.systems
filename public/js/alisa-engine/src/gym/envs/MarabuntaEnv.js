import { GymEnv } from '../GymEnv.js';
// ⚠️ `BulletHeavenEngine` es la clase ABSTRACTA: su tabla de oleadas nace vacía
// (`config.waves || []`), así que envolviéndola no aparece un solo enemigo — 400
// ticks con la arena desierta y la falsa sensación de que el determinismo
// fallaba, cuando lo que pasaba es que no había nada que diferenciar.
// El juego concreto es `MarabuntaSystem`, que la extiende y trae las 12 oleadas
// con jefes en la 8 y la 12. Es también el que usa la página del lab, así que
// agente y persona juegan exactamente la misma partida.
import { MarabuntaSystem } from '../../world/systems/MarabuntaSystem.js';
import { DeterministicScope } from '../../world/core/DeterministicScope.js';

/**
 * MarabuntaEnv — el bullet heaven, con jefes
 * ═══════════════════════════════════════════════════════════════════════════
 * `BulletHeavenEngine` ya era headless y ya devolvía `{state, reward, done}`.
 * No le faltaba motor: le faltaban la SEMILLA y las puertas de lenguaje. Esto
 * es solo el enchufe.
 *
 * 🤖 numérica : 20 números, acción discreta 0..14
 * 🧠 lenguaje : `describe()` cuenta la arena en prosa; `affordances()` da los
 *               verbos legales de ESTE instante (las mejoras solo aparecen
 *               cuando hay una pendiente)
 * 🕹️ humana   : `croupier_marabunta.html` — WASD, Q barrido, ESPACIO golpe,
 *               SHIFT esquiva. Los mismos catorce verbos.
 *
 * POR QUÉ IMPORTA ESTE ENTORNO
 * Es el único que tiene JEFES. Un benchmark cuya dificultad crece de forma
 * continua se puede resolver con una sola política; uno con jefes obliga a
 * cambiar de plan a mitad de partida. Eso es lo que mide.
 *
 * ⚠️ DETERMINISMO — mírate esto antes de fiarte de una puntuación
 * El motor usa `Math.random()` por dentro (spawns, drops, la baraja de
 * mejoras). Aquí NO se copia otro mulberry32: se usa `DeterministicScope`, que
 * es el canónico. Ya hubo dos generadores conviviendo en el motor y, aunque
 * resultaron dar la misma secuencia (4.000 comparaciones, 0 divergencias), dos
 * copias es una de más: el día que una se toque, el benchmark deja de ser
 * comparable sin que nadie se entere.
 *
 * El scope es GLOBAL y secuencial a propósito: no anides dos episodios ni
 * corras dos entornos a la vez sobre el mismo hilo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Los 15 verbos del motor, en el orden que espera `act(actionId)`. */
const VERBOS = [
    'quieto', 'norte', 'noreste', 'este', 'sureste',
    'sur', 'suroeste', 'oeste', 'noroeste',
    'mejora_1', 'mejora_2', 'mejora_3',
    'barrido', 'golpe', 'esquiva',
];

export class MarabuntaEnv extends GymEnv {
    static id = 'alisa/Marabunta-v0';

    /**
     * La observación es LA DEL MOTOR, no una mía.
     *
     * Escribí una primera versión con "los 5 enemigos más cercanos" y luego vi
     * que `BulletHeavenEngine.getObservation()` ya daba algo mejor pensado: un
     * radar de 12 sectores con densidad y distancia mínima en cada uno. Para un
     * bullet heaven eso es lo correcto — lo que te mata no es un enemigo
     * concreto, es que se te cierre un sector. Duplicarlo habría sido peor y
     * además habría creado dos verdades sobre el mismo juego.
     *
     *   0- 5  jugador: x, z, vida, xp, nivel, velocidad
     *   6-17  densidad de enemigos por sector (12 sectores)
     *  18-29  distancia al más cercano de cada sector
     *  30-35  los 3 objetos recogibles más cercanos (dx, dz)
     *  36-63  reservado por el motor
     */
    static observationSpace = { shape: [64], low: -1, high: 1 };

    /** Discreta: un verbo por tick. Ver VERBOS. */
    static actionSpace = { type: 'discrete', n: VERBOS.length, names: VERBOS };

    static meta = {
        title: 'Enjambre de Marabuntas',
        summary: 'Sobrevive a oleadas crecientes y a los jefes. Moverse te salva pero no ' +
                 'puntúa; quedarte quieto dispara más pero te rodean. Las mejoras obligan ' +
                 'a decidir con la partida en pausa.',
        horizon: 1200,
        tags: ['supervivencia', 'oleadas', 'jefes', 'construccion-de-build', 'discreto'],
    };

    constructor(opts = {}) {
        super(opts);
        this.sys = new MarabuntaSystem();
        this.seed = 0;
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.sys = new MarabuntaSystem();
        DeterministicScope.run(this.seed, () => this.sys.reset());
        this.steps = 0;
        this.done = false;
        this._recompensa = 0;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        // La acción puede venir como índice o como verbo: un agente numérico
        // manda 12, uno de lenguaje manda 'barrido'. Las dos son válidas.
        const idx = typeof action === 'string'
            ? VERBOS.indexOf(action)
            : Number(action) | 0;

        // ⚠️ El método del motor es `update(dt)`, no `step(dt)`. Lo di por
        // supuesto y reventó al primer tick.
        const resultado = DeterministicScope.run(this.seed + this.steps, () => {
            if (idx >= 0 && idx < VERBOS.length) this.sys.act(idx);
            return this.sys.update(dt);
        });

        this.steps++;
        this.done = !!resultado.done;
        this._recompensa = resultado.reward ?? 0;

        return {
            obs: this.getObservation(),
            reward: this._recompensa,
            done: this.done,
            info: {
                oleada: this.sys.wave,
                puntos: this.sys.score,
                bajas: this.sys.kills,
                victoria: !!this.sys.victory,
            },
        };
    }

    /** La del motor, tal cual. Se pasa a Array normal para que sea serializable
     *  (un Float32Array se convierte en `{"0":…}` al hacerle JSON.stringify, y
     *  el dataset y la verificación viajan como JSON). */
    getObservation() {
        return Array.from(this.sys.getObservation());
    }

    /** La arena en prosa. Lo que lee un LLM antes de decidir. */
    describe() {
        const s = this.sys;
        const p = s.player;
        const vida = Math.round(100 * (p.hp / (p.maxHp || 1)));
        const jefe = s.enemies.find(e => e.type === 'boss');

        const partes = [
            `Oleada ${s.wave}. Llevas ${s.kills} bajas y ${s.score} puntos.`,
            `Tu salud es del ${vida}%, nivel ${p.level}.`,
        ];

        if (jefe) {
            const vj = Math.round(100 * (jefe.hp / (jefe.maxHp || 1)));
            partes.push(`Hay un JEFE en la arena, al ${vj}% de vida.`);
        }
        partes.push(`Te rodean ${s.enemies.length} enemigos.`);

        if (s.pendingUpgrade) {
            partes.push('La partida está EN PAUSA esperando que elijas una mejora.');
        }
        if (s.gameOver) partes.push('Has caído.');
        if (s.victory) partes.push('Has aguantado hasta el final.');

        return partes.join(' ');
    }

    /**
     * Los verbos LEGALES ahora mismo — no la lista entera.
     * Con una mejora pendiente el motor ignora el movimiento, así que ofrecer
     * "norte" sería mentirle al agente.
     */
    affordances() {
        const s = this.sys;
        if (s.gameOver || s.victory) return [];

        if (s.pendingUpgrade) {
            const ops = s.pendingUpgrade.options || s.pendingUpgrade || [];
            return [0, 1, 2].map(i => ({
                verb: VERBOS[9 + i],
                args: {},
                desc: ops[i] ? `Elegir: ${ops[i].name || ops[i].id}` : `Elegir la mejora ${i + 1}`,
            }));
        }

        const mover = VERBOS.slice(0, 9).map(v => ({
            verb: v, args: {}, desc: `Moverse hacia ${v}`,
        }));
        return [
            ...mover,
            { verb: 'barrido', args: {}, desc: 'Barrido en círculo: limpia lo pegado a ti' },
            { verb: 'golpe',   args: {}, desc: 'Golpe al suelo: daño en área, te deja plantado' },
            { verb: 'esquiva', args: {}, desc: 'Dash: atraviesa el cerco, sin daño' },
        ];
    }
}

export default MarabuntaEnv;
