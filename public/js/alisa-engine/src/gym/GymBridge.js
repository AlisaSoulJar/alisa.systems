/**
 * GymBridge.js — LAS TRES PUERTAS, EXPUESTAS A PYTHON
 * ═══════════════════════════════════════════════════════════════════════════
 * Deja cualquier `GymEnv` pilotable desde fuera del navegador (Python,
 * Playwright, Selenium) colgando funciones del objeto `window`.
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * ---------------------------
 * Ya había un `world/systems/RLGymBridge.js` que hacía justo el transporte…
 * pero con OTRO vocabulario (`stepSimulation`, `getObservationVector`,
 * `resetEpisode`) y esperando un "engine" que implementara esos nombres, no un
 * `GymEnv`. Resultado: dos mitades del mismo producto que no encajaban.
 *
 * Este puente habla el contrato `GymEnv` y **mantiene vivos los nombres
 * antiguos como alias**, para no romper lo que ya los usara.
 *
 * Y sobre todo: el puente viejo solo exponía la puerta NUMÉRICA. Lo que hace
 * distinto a este gym —  que el MISMO entorno se pueda jugar con lenguaje— no
 * llegaba a Python. Aquí llega.
 *
 * USO DESDE PYTHON (vía Playwright/CDP)
 * ------------------------------------
 *     page.evaluate("alisaGym.reset(1234)")
 *     page.evaluate("alisaGym.step([0.5, 0, 1])")          # puerta numérica
 *     page.evaluate("alisaGym.describe()")                 # puerta de lenguaje
 *     page.evaluate("alisaGym.affordances()")              # verbos disponibles
 *     page.evaluate("alisaGym.stepVerb('disparar', {})")   # actuar por verbo
 *     page.evaluate("alisaGym.selfTest()")                 # ¿es reproducible?
 *
 * Todo lo que devuelve es JSON-serializable a propósito: cruza el puente
 * navegador→Python sin que haya que convertir nada al otro lado.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { DeterministicScope } from '../world/core/DeterministicScope.js';

export class GymBridge {
    /**
     * Cuelga la API en `window.alisaGym` (y los alias antiguos).
     *
     * @param {GymEnv} env instancia de un entorno
     * @param {Object} [opts]
     * @param {string} [opts.namespace='alisaGym'] nombre en window
     * @param {boolean} [opts.legacyAliases=true] mantener los nombres de RLGymBridge
     * @returns {Object} la misma API, por si la quieres usar en el propio JS
     */
    static attach(env, opts = {}) {
        const ns = opts.namespace ?? 'alisaGym';
        const api = GymBridge.makeApi(env);

        if (typeof window !== 'undefined') {
            window[ns] = api;

            if (opts.legacyAliases !== false) {
                // Nombres del RLGymBridge original. Se mantienen para no romper
                // nada que ya los llamara; el vocabulario bueno es el de arriba.
                window.resetEpisode = (seed) => api.reset(seed);
                window.stepSimulation = (action, dt) => api.step(action, dt);
                window.getObservationVector = () => ({ obs: api.observation(), meta: api.spec() });
                window.setRLMode = (on) => { window.RLMode = !!on; api.setRenderEnabled(!on); };
                window.RLMode = false;
            }
            console.log(`[GymBridge] ${env.constructor.id ?? 'env'} expuesto en window.${ns} ` +
                        `— puertas: numérica · lenguaje · (humana la pinta el lab)`);
        }
        return api;
    }

    /** Construye la API sin tocar `window` (útil para tests headless en Node). */
    static makeApi(env) {
        return {
            // ── ficha ────────────────────────────────────────────────
            spec: () => env.constructor.spec(),
            id: () => env.constructor.id,

            // ── 🤖 PUERTA NUMÉRICA ───────────────────────────────────
            reset: (seed = 0) => {
                // La semilla manda también sobre el `Math.random` global; si no,
                // "reset(1234)" no garantizaría nada (470 llamadas sin semilla).
                return DeterministicScope.run(seed, () => { env.reset(seed); return env.getObservation(); });
            },
            step: (action, dt = 1 / 60) => {
                const r = env.step(action, dt);
                return { obs: r.obs, reward: r.reward, done: r.done, info: r.info ?? {} };
            },
            observation: () => env.getObservation(),
            score: () => env.getScore(),

            // ── 🧠 PUERTA DE LENGUAJE (esto es lo que no tiene nadie) ─
            describe: () => env.describe(),
            affordances: () => env.affordances(),
            stepVerb: (verb, args = {}, dt = 1 / 60) => {
                const r = env.stepVerb(verb, args, dt);
                return { obs: r.obs, reward: r.reward, done: r.done, info: r.info ?? {} };
            },

            // ── 🕹️ PUERTA HUMANA ─────────────────────────────────────
            // El render lo monta el lab. Desde fuera solo se enciende o apaga:
            // corriendo un benchmark headless no quieres gastar GPU.
            setRenderEnabled: (on) => { env.renderEnabled = !!on; return env.renderEnabled; },

            // ── benchmark ────────────────────────────────────────────
            /** Corre un episodio con una política escrita como texto JS. */
            runEpisode: (policySrc, cfg = {}) => {
                // eslint-disable-next-line no-new-func
                const policy = new Function('obs', 'env', policySrc);
                return env.runEpisode(policy, cfg);
            },
            /** ¿Es reproducible? Requisito para entrar en el benchmark. */
            selfTest: (policySrc = 'return null;', cfg = {}) => {
                // eslint-disable-next-line no-new-func
                const policy = new Function('obs', 'env', policySrc);
                return env.constructor.selfTest(policy, cfg);
            },

            /** Estado del scope determinista, para depurar divergencias. */
            deterministicInfo: () => ({ active: DeterministicScope.active, draws: DeterministicScope.draws })
        };
    }
}
