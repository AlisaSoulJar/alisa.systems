import { mulberry32 } from './DeterministicScope.js';

/**
 * SeededRNG — LA MISMA ARITMÉTICA QUE EL RESTO DE LA CASA, CON OTRA INTERFAZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Generación procedural reproducible: misma semilla, mismo mundo. Lo que ofrece
 * de más que una función suelta es comodidad —`range`, `int`, `pick`, `shuffle`,
 * `chance`— y poder rebobinar con `reset()`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ HABÍA DOS GENERADORES Y «SEMILLA 42» DABA DOS MUNDOS DISTINTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Medido el 24-08:
 *
 *     mulberry32(42):  0,601104  0,448291  0,852466     ← 26 ficheros
 *     SeededRNG(42):   0,885884  0,817627  0,958989     ←  4 ficheros
 *
 * Cada uno era reproducible por su cuenta, así que no había nada roto. Pero era
 * una trampa puesta: en cuanto alguien diera por hecho que la misma semilla da
 * el mismo mundo entre dos piezas, se equivocaba **sin que nada diera error**.
 * Y estuvo a punto de morder: `RaccoonEnvironmentFactory` usa esta clase y
 * `RaccoonSpaceCore` usa `mulberry32`, así que hasta esa misma mañana cada uno
 * se inventaba sus posiciones con la misma semilla.
 *
 * ⚠️ Y NO SE CAMBIA PORQUE EL VIEJO FUERA MALO. LO MEDÍ Y NO LO ERA.
 *
 * Di por hecho que un LCG con módulo 233280 —el de los tutoriales de los
 * noventa— sería flojo, y la medida me contradijo: en la prueba de retícula
 * —40.000 pares consecutivos sobre una cuadrícula de 200×200— salió 26.453
 * celdas distintas contra las 25.397 de mulberry32. Igual de bueno.
 *
 * Lo único real es el techo: **su secuencia se repite entera a las 233.280
 * tiradas**, medido. Para un episodio sobra, así que tampoco era eso.
 *
 * Se unifica por CONSISTENCIA, no por calidad: un solo generador en la casa
 * significa que «semilla 42» quiere decir una cosa. La clase se queda con su
 * interfaz —cuatro ficheros la usan y no tienen por qué enterarse— y por dentro
 * llama a `mulberry32`.
 */
export class SeededRNG {
    /**
     * @param {number} seed - Initial seed value (default 42)
     */
    constructor(seed = 42) {
        this._initial = seed;
        this._seed = seed;
        this._siguiente = mulberry32(seed >>> 0);
    }

    /** Reset to initial seed */
    reset() {
        this._seed = this._initial;
        this._siguiente = mulberry32(this._initial >>> 0);
    }

    /** Reseed with a new value */
    reseed(s) {
        this._seed = s;
        this._initial = s;
        this._siguiente = mulberry32(s >>> 0);
    }

    /**
     * Siguiente número en [0, 1). La aritmética es la de `mulberry32`, la misma
     * que usan los otros 26 ficheros del motor. Ver la nota de la clase.
     */
    next() {
        return this._siguiente();
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
