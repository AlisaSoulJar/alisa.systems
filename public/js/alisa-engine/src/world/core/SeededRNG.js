/**
 * SeededRNG — Deterministic Pseudo-Random Number Generator
 * ========================================================
 * Unified LCG (Linear Congruential Generator) for all procedural
 * generation across the engine. Ensures reproducible results
 * given the same seed, critical for headless/RL determinism.
 *
 * Replaces inline PRNG in: Raccoon, Carver, ProceduralBuilding
 */
export class SeededRNG {
    /**
     * @param {number} seed - Initial seed value (default 42)
     */
    constructor(seed = 42) {
        this._seed = seed;
        this._initial = seed;
    }

    /** Reset to initial seed */
    reset() {
        this._seed = this._initial;
    }

    /** Reseed with a new value */
    reseed(s) {
        this._seed = s;
        this._initial = s;
    }

    /**
     * Generate next pseudo-random number in [0, 1)
     * Uses the same LCG constants as the original Raccoon implementation
     */
    next() {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    }

    /**
     * Random float in [min, max)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    range(min, max) {
        return min + this.next() * (max - min);
    }

    /**
     * Random integer in [min, max] (inclusive)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    /**
     * Pick a random element from an array
     * @param {Array} arr
     * @returns {*}
     */
    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }

    /**
     * Shuffle an array in-place (Fisher-Yates)
     * @param {Array} arr
     * @returns {Array} same array, shuffled
     */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Boolean with given probability
     * @param {number} probability 0..1 (default 0.5)
     * @returns {boolean}
     */
    chance(probability = 0.5) {
        return this.next() < probability;
    }

    /**
     * Deterministic hash-seed from spatial coordinates
     * Useful for per-tile/per-block consistent generation
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    static spatialSeed(x, y) {
        return Math.abs((x * 73856093 ^ y * 19349663) | 0);
    }
}
