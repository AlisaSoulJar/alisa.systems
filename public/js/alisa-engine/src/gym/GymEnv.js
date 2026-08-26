/**
 * GymEnv — EL CONTRATO DE LAS TRES PUERTAS
 * ═══════════════════════════════════════════════════════════════
 * Un solo entorno, tres tipos de agente, UNA métrica comparable.
 * Esto es lo que no existe en el mercado: los gyms actuales (Gym/Gymnasium,
 * MineRL, ALE) son RL-numérico y punto. Aquí el MISMO entorno se juega:
 *
 *   🤖 NUMÉRICA  reset(seed) / step(action) / getObservation()      → RL, políticas, DQN
 *   🧠 LENGUAJE  describe() / affordances() / actFromVerb()          → agentes LLM
 *   🕹️ HUMANA    el lab lo renderiza y lo juegas con teclado/ratón   → personas
 *
 * ...y los tres producen el MISMO flujo de recibos firmados, así que sus
 * puntuaciones son comparables y verificables (ver GymRecorder).
 *
 * Para crear un entorno: extiende esta clase e implementa los 5 métodos
 * marcados ABSTRACTO. Lo demás te lo da el contrato.
 */
import { DeterministicScope } from '../world/core/DeterministicScope.js';
import { tripleta, escribir, leer, nameOf } from './Grammar.js';

export class GymEnv {
    /** Identificador estable, estilo gym: 'alisa/Pedrisco-v0' */
    static id = 'alisa/Env-v0';
    /** { shape:[n], names:[...], low:[], high:[] } */
    static observationSpace = { shape: [0], names: [] };
    /** { type:'continuous'|'discrete'|'verb', ... } */
    static actionSpace = { type: 'continuous', shape: [0] };
    /** Metadatos para la ficha del benchmark */
    static meta = { title: '', summary: '', horizon: 1800, tags: [] };

    constructor(opts = {}) {
        this.recorder = opts.recorder || null;   // GymRecorder (opcional)
        this.seed = 0;
        this.t = 0;                              // tiempo simulado
        this.steps = 0;
        this.done = false;
        this._lastScore = 0;
    }

    // ─── ABSTRACTO: lo que implementa cada entorno ───────────────
    /** @abstract Reinicia con semilla. Debe ser DETERMINISTA. → obs */
    reset(_seed = 0) { throw new Error('GymEnv.reset() no implementado'); }
    /** @abstract Avanza la simulación un paso. → {obs, reward, done, info} */
    step(_action, _dt = 1 / 60) { throw new Error('GymEnv.step() no implementado'); }
    /** @abstract Vector de observación (números planos). */
    getObservation() { throw new Error('GymEnv.getObservation() no implementado'); }
    /** @abstract Estado en lenguaje natural, para agentes LLM. */
    describe() { throw new Error('GymEnv.describe() no implementado'); }
    /** @abstract Verbos disponibles AHORA: [{verb, args, label}] (capa SCUMM). */
    affordances() { throw new Error('GymEnv.affordances() no implementado'); }

    /**
     * ─── LA TRIPLETA: `@objeto #metodo |parametros` ──────────────────
     *
     * Lo mismo que `affordances()`, dicho en el idioma del organismo entero.
     * Ver `Grammar.js`: es la ley AIO-I del proyecto general, que allí lleva
     * 802 usos en 267 ficheros y que aquí no se hablaba.
     *
     * ⚠️ NO SUSTITUYE A `affordances()`, LA ACOMPAÑA — Y ES A PROPÓSITO.
     *
     * El banco mide desde hace semanas con `{verb, args}`, y las huellas de
     * comportamiento están selladas contra eso. Cambiar el menú por debajo sería
     * cambiar el juego conservando el nombre, que es la avería que este proyecto
     * lleva toda la semana pagando. Así que la tripleta se AÑADE: mismo menú,
     * dos idiomas, y las notas publicadas siguen siendo comparables.
     *
     * Cada entrada gana `objeto`, `metodo`, `params` y `atomo`. Un mundo que
     * sepa dónde acaba su método puede declararlo en `affordances()` —
     * `{metodo: 'construir', params: ['guijarro', 3, 4]}`— y si no lo dice, el
     * verbo entero es el método. Aquí nadie adivina.
     */
    verbos() {
        const objeto = this.constructor.id;
        return this.affordances().map(a => {
            const t = tripleta(objeto, a);
            return { ...a, ...t, atomo: escribir(t) };
        });
    }

    // ─── PUERTA DE LENGUAJE: verbo → acción numérica ─────────────
    /** Traduce un verbo de affordances() a la acción nativa. Sobrescribible. */
    actFromVerb(verb, args = {}) {
        const a = this.affordances().find(x => x.verb === verb);
        if (!a) return null;
        return a.action !== undefined ? a.action : args;
    }
    /** Atajo para agentes LLM: ejecuta un verbo directamente. */
    stepVerb(verb, args = {}, dt = 1 / 60) {
        const action = this.actFromVerb(verb, args);
        if (action === null) return { obs: this.getObservation(), reward: 0, done: this.done,
                                      info: { error: `verbo desconocido: ${verb}` } };
        const r = this.step(action, dt);
        if (this.recorder) this.recorder.record({ verb, args, reward: r.reward, t: this.t });
        return r;
    }

    /**
     * ─── LA INTENCIÓN COMO TEXTO: JUGAR ESCRIBIENDO UN ÁTOMO ─────────
     *
     *     env.stepAtomo('@Defiende #construir |guijarro,3,4')
     *
     * ⚠️ ESTO ES LO QUE FALTABA, Y NO ERA SINTAXIS.
     *
     * La primera versión de la tripleta sólo la DESCRIBÍA: `verbos()` la emitía
     * y `stepVerb()` seguía siendo lo único que ejecutaba. O sea que el átomo
     * era adorno — dos caminos que hoy coinciden y mañana no, que es la avería
     * que este proyecto lleva toda la semana pagando.
     *
     * En AIO —Agent Intention Ontology— el átomo NO es la firma de una llamada:
     * es una intención declarada, separada de su ejecución para poder ser vista,
     * atribuida y auditada. Lo dice el curso de la colonia: se sustituye «la
     * ejecución imperativa por terminal» por una intención que el anillo vital
     * puede ver, que se ejecuta bajo la identidad real de quien la emite, y que
     * deja recibo.
     *
     * El banco ya tenía la mitad de eso —recibos verificables, identidad de
     * quien jugó, repetición con la misma semilla— y le faltaba justo la puerta:
     * que la intención escrita fuera lo que juega.
     *
     * ⚠️ Y EL OBJETO SE COMPRUEBA, QUE ES LA PARTE DE IDENTIDAD.
     *
     * Un átomo dirigido a otro mundo se rechaza en vez de ejecutarse a ciegas.
     * Sin eso, `@Chess #jugar |a2a3` movería una torreta en ¡Defiende! porque el
     * método casa — y el error saldría como una jugada legal, que es la peor
     * forma de equivocarse: en verde.
     */
    stepAtomo(texto, dt = 1 / 60) {
        const at = leer(texto);
        if (!at) {
            return { obs: this.getObservation(), reward: 0, done: this.done,
                     info: { error: `no es un átomo: ${texto}` } };
        }
        const mio = nameOf(this.constructor.id);
        if (at.objeto.toLowerCase() !== mio.toLowerCase()) {
            return { obs: this.getObservation(), reward: 0, done: this.done,
                     info: { error: `@${at.objeto} no es este mundo: aquí es @${mio}` } };
        }
        /**
         * Se busca entre lo que HOY es legal, no en un catálogo. Es la misma
         * regla de oro del arcade —«no se manda nada que no esté en
         * `legal_moves`»— y por eso se compara contra `verbos()`.
         */
        const clave = (a) => `${a.metodo}|${(a.params ?? []).join(',')}`;
        const buscado = `${at.metodo}|${at.params.join(',')}`;
        const legal = this.verbos().find(a => clave(a) === buscado);
        if (!legal) {
            return { obs: this.getObservation(), reward: 0, done: this.done,
                     info: { error: `intención no disponible ahora: ${texto}` } };
        }
        return this.stepVerb(legal.verb, legal.args ?? {}, dt);
    }

    // ─── PUNTUACIÓN COMPARABLE ───────────────────────────────────
    /** { score, metrics{...} } — el eje común de los tres tipos de agente. */
    getScore() { return { score: this._lastScore, metrics: {} }; }

    /** Ficha del entorno, para el registro del benchmark. */
    static spec() {
        return { id: this.id, observationSpace: this.observationSpace,
                 actionSpace: this.actionSpace, meta: this.meta };
    }

    // ─── EJECUCIÓN COMPLETA (usada por el validador headless) ────
    /**
     * Corre un episodio entero con una política.
     *
     * ⚠️ EL EPISODIO ENTERO VA DENTRO DE UN DeterministicScope. Sin esto la
     * palabra "determinista" era un deseo, no una garantía: el motor tiene 470
     * llamadas a `Math.random()` sin semilla repartidas por 67 ficheros, así que
     * la misma semilla daba mundos distintos en la misma máquina. Medido, y
     * `AsteroidsSystem` lo demostraba (2019 azares por episodio).
     *
     * Esto es lo que sostiene el benchmark: para validar la puntuación de otro
     * hay que poder volver a simular su partida y obtener lo mismo.
     *
     * @param {Function} policy - (obs, env) => action
     * @returns {Object} resultado + recibos
     */
    runEpisode(policy, { seed = 0, maxSteps = 1800, dt = 1 / 60 } = {}) {
        return DeterministicScope.run(seed, () => {
            this.reset(seed);
            let obs = this.getObservation(), total = 0;
            for (let i = 0; i < maxSteps && !this.done; i++) {
                const action = policy(obs, this);
                const r = this.step(action, dt);
                obs = r.obs; total += r.reward;
                if (this.recorder) this.recorder.record({ action, reward: r.reward, t: this.t });
            }
            return { seed, steps: this.steps, totalReward: total, ...this.getScore(),
                     draws: DeterministicScope.draws,   // nº de azares consumidos: huella del episodio
                     receipts: this.recorder ? this.recorder.receipts : [] };
        });
    }

    /**
     * ¿Es este entorno reproducible? Corre el mismo episodio dos veces con la
     * misma semilla y una tercera con otra.
     *
     * Todo entorno que quiera entrar en el benchmark tiene que pasar esto.
     *
     * @param {Function} policy política determinista (o semillada aparte)
     * @returns {{reproducible: boolean, sensible: boolean, draws: number, a: Object, b: Object}}
     *   reproducible = misma semilla ⇒ misma puntuación y mismos pasos
     *   sensible     = otra semilla ⇒ resultado distinto (si no, el entorno ignora la semilla)
     */
    static selfTest(policy, { seed = 1234, maxSteps = 600, dt = 1 / 60 } = {}) {
        const huella = r => `${r.steps}|${r.totalReward.toFixed(6)}|${r.score ?? ''}|${r.draws}`;
        const a = new this().runEpisode(policy, { seed, maxSteps, dt });
        const b = new this().runEpisode(policy, { seed, maxSteps, dt });
        const c = new this().runEpisode(policy, { seed: seed + 1, maxSteps, dt });
        return {
            reproducible: huella(a) === huella(b),
            sensible: huella(a) !== huella(c),
            draws: a.draws,
            a, b
        };
    }
}
