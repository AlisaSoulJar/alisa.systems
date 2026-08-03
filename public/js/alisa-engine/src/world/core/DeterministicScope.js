/**
 * DeterministicScope.js
 * ═══════════════════════════════════════════════════════════════════════════
 * MISMA SEMILLA ⇒ MISMO MUNDO. Sin tocar los 470 sitios que llaman a random.
 *
 * EL PROBLEMA
 * -----------
 * El motor tiene `SeededRNG` (world/core/SeededRNG.js) escrito literalmente
 * para esto — su cabecera dice "critical for headless/RL determinism". Pero al
 * medirlo: **470 llamadas a `Math.random()` repartidas por 67 de los 167
 * ficheros fuente, y solo 4 ficheros usan SeededRNG.**
 *
 * Así que hoy el mismo `seed` produce un mundo distinto en cada ejecución, y
 * sin eso no hay benchmark: no se puede volver a simular una partida ajena
 * para comprobar que su puntuación es real.
 *
 * Migrar 470 llamadas a mano es mucha cirugía y mucho riesgo de erratas.
 *
 * LA SOLUCIÓN
 * -----------
 * Sustituir `Math.random` por un PRNG semillado SOLO durante el tramo de código
 * que quieras determinista, y devolverlo siempre a su sitio al salir:
 *
 *     import { DeterministicScope } from '@alisa-engine/src/world/core/DeterministicScope.js';
 *
 *     const a = DeterministicScope.run(1234, () => { env.reset(); return env.checksum(); });
 *     const b = DeterministicScope.run(1234, () => { env.reset(); return env.checksum(); });
 *     a === b   // ✅ y con 1235 sale distinto
 *
 * Cero ediciones en los systems. Los que ya usan SeededRNG siguen igual de
 * deterministas (no dependen de la global).
 *
 * POR QUÉ mulberry32 Y NO EL LCG DE SeededRNG
 * -------------------------------------------
 * El LCG de SeededRNG es `(s*9301+49297) % 233280`: correcto y reproducible bit
 * a bit (solo usa enteros exactos en float64), pero su periodo son **233 280**
 * valores. Un episodio largo lo agota y empieza a repetir la misma secuencia.
 * mulberry32 tiene periodo 2^32 y también usa solo enteros de 32 bits, así que
 * es igual de reproducible entre máquinas y no cicla en la práctica.
 *
 * LÍMITES — LÉELOS ANTES DE FIARTE
 * --------------------------------
 * 1. NO arregla los transcendentales. `Math.sin/cos/tan/pow/exp/log` no están
 *    especificados bit a bit por IEEE-754 y pueden diferir en el último bit
 *    entre navegadores o CPUs. Para validar partidas, compara con tolerancia o
 *    audita las ACCIONES, no el estado final exacto.
 * 2. Es una variable GLOBAL. No anides dos scopes con semillas distintas ni lo
 *    uses en dos simulaciones concurrentes: se pisan. Es secuencial a propósito.
 * 3. `runAsync` cubre `await`, pero mientras espera, CUALQUIER otro código de la
 *    página que llame a Math.random también recibirá números semillados. Para
 *    validar partidas eso da igual; para una app viva, tenlo presente.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Normaliza cualquier semilla a un entero de 32 bits utilizable.
 *
 * Hace falta porque por el motor circulan semillas fraccionarias —
 * `config.seed || Math.random()` en ProceduralSPE, por ejemplo. Un `0.37 >>> 0`
 * da **0**, así que sin esto todas esas entidades compartirían semilla y
 * saldrían clavadas. Las fraccionarias se escalan; las cadenas se hashean
 * (FNV-1a) para poder sembrar con nombres.
 *
 * @param {number|string} seed
 * @returns {number} entero sin signo de 32 bits
 */
export function normalizeSeed(seed) {
    if (typeof seed === 'string') {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }
    const n = Number(seed);
    if (!Number.isFinite(n)) return 42;
    if (Number.isInteger(n)) return n >>> 0;
    // Fraccionaria: repartimos la parte decimal por los 32 bits.
    return Math.abs(Math.trunc(n * 4294967296)) >>> 0;
}

/**
 * mulberry32 — PRNG de 32 bits, periodo 2^32.
 * Solo operaciones enteras de 32 bits ⇒ idéntico en cualquier máquina.
 * @param {number|string} seed  se normaliza con normalizeSeed()
 * @returns {() => number} función que devuelve [0, 1)
 */
export function mulberry32(seed) {
    let a = normalizeSeed(seed);
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class DeterministicScope {
    /** @type {boolean} true mientras haya un scope activo */
    static active = false;
    static _saved = null;
    static _depth = 0;
    /** Cuántos números se han consumido en el scope actual (útil para depurar divergencias). */
    static draws = 0;

    /**
     * Ejecuta `fn` con `Math.random` semillado y lo restaura al salir.
     * Restaura también si `fn` lanza.
     *
     * @template T
     * @param {number} seed
     * @param {() => T} fn
     * @returns {T} lo que devuelva fn
     */
    static run(seed, fn) {
        DeterministicScope._enter(seed);
        try {
            return fn();
        } finally {
            DeterministicScope._exit();
        }
    }

    /**
     * Igual que run(), pero espera a una `fn` asíncrona.
     * Ojo con el límite 3 de la cabecera.
     *
     * @template T
     * @param {number} seed
     * @param {() => Promise<T>} fn
     * @returns {Promise<T>}
     */
    static async runAsync(seed, fn) {
        DeterministicScope._enter(seed);
        try {
            return await fn();
        } finally {
            DeterministicScope._exit();
        }
    }

    static _enter(seed) {
        if (DeterministicScope._depth === 0) {
            DeterministicScope._saved = Math.random;
            const rng = mulberry32(seed);
            Math.random = () => { DeterministicScope.draws++; return rng(); };
            DeterministicScope.draws = 0;
            DeterministicScope.active = true;
        } else {
            // Anidar con otra semilla sería una trampa silenciosa: el de dentro
            // mandaría y el de fuera creería que su semilla vale. Mejor avisar.
            console.warn('[DeterministicScope] scope anidado — se ignora la semilla interna. ' +
                         'No anides scopes ni simules dos partidas a la vez.');
        }
        DeterministicScope._depth++;
    }

    static _exit() {
        DeterministicScope._depth--;
        if (DeterministicScope._depth === 0) {
            Math.random = DeterministicScope._saved;
            DeterministicScope._saved = null;
            DeterministicScope.active = false;
        }
    }

    /**
     * Comprueba que algo es reproducible: ejecuta `fn` dos veces con la misma
     * semilla y una tercera con otra distinta.
     *
     * @param {number} seed
     * @param {() => any} fn debe devolver algo comparable (número, string, array)
     * @returns {{deterministic: boolean, sensitive: boolean, a: any, b: any, c: any, draws: number}}
     *   deterministic = misma semilla dio lo mismo
     *   sensitive     = otra semilla dio algo distinto (si no, `fn` igual ni usa azar)
     */
    static verify(seed, fn) {
        const key = v => JSON.stringify(v);
        const a = DeterministicScope.run(seed, fn);
        const draws = DeterministicScope.draws;
        const b = DeterministicScope.run(seed, fn);
        const c = DeterministicScope.run(seed + 1, fn);
        return {
            deterministic: key(a) === key(b),
            sensitive: key(a) !== key(c),
            a, b, c, draws
        };
    }
}
