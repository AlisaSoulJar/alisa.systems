/**
 * azar.js — el azar reproducible, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 * Toda la tesis del proyecto —«una partida se verifica volviéndola a jugar»—
 * se apoya en que el azar sea una función de la semilla. Si el generador cambia,
 * TODAS las partidas guardadas dejan de verificar a la vez. Es la pieza con más
 * cosas colgando de ella y por eso vive sola.
 *
 * ⚠️ POR QUÉ EXISTE ESTE FICHERO
 * `mulberry32` estaba copiado **siete veces** —bazas, blackjack, poker, guerra,
 * snake, peaton, fagocito— y las copias ya se habían separado en dos escrituras
 * distintas:
 *
 *     A)  a |= 0;  a = (a + K) | 0;   t = (t + imul(...)) ^ t;
 *     B)  a >>>= 0; a = (a + K) >>> 0; t ^= t + imul(...);
 *
 * Resultan equivalentes —comprobado, no razonado: 7 semillas × 5000 tiradas dan
 * la misma secuencia, porque `|0` y `>>>0` guardan los mismos bits y el XOR es
 * conmutativo—. O sea: esta vez no había fallo. Pero siete copias del generador
 * que sostiene la verificación es una escopeta cargada apuntando al producto: el
 * día que alguien «mejore» una, los juegos de esa copia empiezan a rechazar
 * partidas legítimas y nada avisa.
 *
 * Se unifica en la escritura B, que es la canónica de mulberry32.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * mulberry32 — generador de 32 bits, rápido y determinista.
 *
 * Sólo enteros de 32 bits a propósito: los flotantes pueden variar entre
 * motores de JavaScript, y entonces la misma semilla daría partidas distintas
 * en Chrome y en Node, que es exactamente lo que no puede pasar aquí.
 *
 * @param {number} semilla
 * @returns {() => number} tiradas en [0, 1)
 */
export function mulberry32(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Fisher-Yates con semilla: misma semilla, mismo reparto. Modifica el array. */
export function barajar(cartas, rnd) {
    for (let i = cartas.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }
    return cartas;
}

/**
 * Entero determinista a partir de un número (p. ej. el nº de jugada).
 *
 * Para desempatar SIN estado y SIN `Math.random`. Nació de un fallo real: el
 * rival de casa del ajedrez y del xiangqi elegía al azar cuando no había
 * captura, y entonces la misma semilla daba partidas distintas.
 */
export function revuelto(n) {
    let h = ((n | 0) + 0x9E3779B9) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x85EBCA6B) >>> 0;
    return (h ^ (h >>> 13)) >>> 0;
}
