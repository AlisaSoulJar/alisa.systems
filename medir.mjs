/**
 * medir.mjs — LO QUE HAY QUE HACER SIEMPRE Y SE ME OLVIDA
 * ═══════════════════════════════════════════════════════════════════════════
 *     import { huecoEmparejado, reproduce } from './medir.mjs';
 *
 * Dos funciones de veinte líneas que existen porque sin ellas he publicado
 * números falsos. No son una utilidad: son un pretexto retirado.
 *
 * ⚠️ POR QUÉ ESTO ES UN FICHERO Y NO UNA NOTA EN UN DOCUMENTO.
 *
 * La lección de agosto ya estaba «aprendida»: hay una memoria que resume tres
 * reglas y remite a `COMO_MEDIR.md`. Ese documento **no existía en ningún sitio**.
 * O sea que la lección se guardó como intención, y una intención no se ejecuta.
 * Hoy he vuelto a caer en la misma familia dos veces en una tarde.
 *
 * Un propósito se olvida; una función que ya está escrita se usa porque es más
 * cómoda que hacerlo a mano.
 */

/**
 * El hueco entre dos políticas, con su error, EMPAREJADO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ UNA DIFERENCIA SIN SU ERROR NO ES UNA DIFERENCIA.
 *
 * El 21-08-2026 comparé dos configuraciones de shinigami por su hueco crudo —27,9
 * contra 19,5— y le anuncié a Oscar un conflicto entre «jugable» y «medible» que
 * había que resolver. Dividido por su propio error, era 7,3 veces contra 6,7:
 * las dos separaban de sobra y no había nada que elegir. **El conflicto lo
 * inventó la resta.**
 *
 * ⚠️ Y EMPAREJADO, QUE NO ES UN REFINAMIENTO.
 *
 * Las dos políticas tienen que jugar las MISMAS semillas en las MISMAS sillas, y
 * se resta partida a partida. Sin emparejar, la varianza de lo que no se controla
 * —en shinigami, si te toca ser shinigami o no— entra entera en el error y esconde el
 * hueco. En remigio esa varianza era seis veces la interna de la propia política.
 *
 * @param {number[]} a  puntuación de la política A, partida a partida
 * @param {number[]} b  la de B, en el MISMO orden de partidas
 * @returns {{media:number, ee:number, senal:number, n:number}}
 *          `senal` = cuántas veces el hueco supera a su error. Por debajo de 2,
 *          el hueco no se distingue de cero y no se puede contar como hallazgo.
 */
export function huecoEmparejado(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length < 2) {
        throw new Error(`emparejar exige dos series del mismo largo (${a?.length} vs ${b?.length})`);
    }
    const d = a.map((x, i) => x - b[i]);
    const media = d.reduce((s, x) => s + x, 0) / d.length;
    const varianza = d.reduce((s, x) => s + (x - media) ** 2, 0) / (d.length - 1);
    const ee = Math.sqrt(varianza / d.length);
    return { media, ee, senal: Math.abs(media / (ee || Infinity)), n: d.length };
}

/** Cómo se dice un hueco en voz alta, sin poder quitarle el error. */
export const diHueco = (h) =>
    `${h.media.toFixed(1)} ± ${h.ee.toFixed(1)} (señal ${h.senal.toFixed(1)}×, n=${h.n})`
    + (h.senal < 2 ? '  ⚠ por debajo de 2: no se distingue de cero' : '');

/**
 * ¿Mi sonda reproduce un número que ya se sabe?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ UNA SONDA NUEVA NO TIENE DERECHO A UN NÚMERO NUEVO HASTA REPETIR UNO VIEJO.
 *
 * El 21-08-2026 medí que darle voz a la junta de nave bajaba el azar de 0,36 a
 * 0,21, y se lo conté a Oscar como el resultado del día. La tabla oficial dijo
 * 0,41 — el mismo de antes. Mi sonda ponía la misma política en las CUATRO
 * sillas; el banco sienta al agente en UNA y juega las demás con la casa. Medían
 * cosas distintas y yo no lo sabía.
 *
 * Lo que lo habría cazado antes de abrir la boca: pedirle a mi sonda el número
 * de un caso YA CONOCIDO. Si no reproduce el 0,41 de nave sin tocar nada, no
 * tiene ninguna autoridad para decirme el 0,21 de nave con debate.
 *
 * @param {number} obtenido    lo que da mi sonda en el caso conocido
 * @param {number} conocido    lo que dice el instrumento que manda
 * @param {number} [margen]    cuánto se acepta de diferencia relativa
 * @returns {{vale:boolean, motivo:string}}
 */
export function reproduce(obtenido, conocido, margen = 0.15) {
    const escala = Math.max(Math.abs(conocido), 1e-9);
    const desvio = Math.abs(obtenido - conocido) / escala;
    return desvio <= margen
        ? { vale: true, motivo: `reproduce ${conocido} (sale ${obtenido})` }
        : {
            vale: false,
            motivo: `NO reproduce el caso conocido: dice ${obtenido} donde el instrumento`
                  + ` que manda dice ${conocido} (${(desvio * 100).toFixed(0)} % de desvío).`
                  + ' Esta sonda no mide lo mismo, así que su número nuevo no vale.',
        };
}
