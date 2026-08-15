/**
 * enlace_repetidor.js — el enlace que vuelve a jugar una partida
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Una función de cinco líneas con fichero propio, y a propósito: la va a usar el
 * navegador (el botón de compartir), Node (`avisos.mjs`, que revisa lo que cuentan
 * los betatesters) y la página del corpus. Tres sitios construyendo la misma URL a
 * mano es la forma exacta en que un formato se bifurca sin que nadie lo note — y
 * aquí ya pasó con el sustrato, que tenía dos caminos y sólo uno recibía los datos
 * nuevos.
 *
 * ⚠️ EL NOMBRE DE LA PÁGINA NO ES EL DEL JUEGO, Y ESO MUERDE.
 *
 * Las reglas se llaman `damas` y la página es `checkers.html`; el go, el ajedrez y
 * el xiangqi vienen con la misma herencia. Un enlace construido con la clave de las
 * reglas da un 404 elegante que parece que el repetidor no funciona.
 */

/**
 * Las páginas cuyo nombre no coincide con la clave de sus reglas.
 *
 * MEDIDO, no recordado: leyendo el `juego:` de las 36 páginas que montan mesa, las
 * únicas dos que no coinciden con su nombre de fichero son éstas. `prueba_repetidor`
 * repite esa medida en cada `npm test`, así que el día que alguien añada una tercera
 * —o renombre una— salta ahí y no en un enlace roto que nadie sabe por qué falla.
 */
export const PAGINA = {
    damas: 'checkers',
    ajedrez: 'chess',
};

/**
 * @param {object} recibo   {juego, semilla, jugadas}
 * @param {object} [opts]
 *   sitio    prefijo absoluto («https://alisa.systems»); vacío = relativo
 * @returns {string|null}  null si la partida no se puede repetir, que se dice y no
 *                         se disimula con un enlace roto
 */
export function enlaceRepetidor(recibo, { sitio = '' } = {}) {
    if (!recibo?.juego) return null;
    // Sin semilla el reparto sería otro: el enlace enseñaría una partida distinta
    // con aspecto de ser la misma, que es peor que no dar enlace.
    if (recibo.semilla === null || recibo.semilla === undefined) return null;

    const pagina = PAGINA[recibo.juego] ?? recibo.juego;
    const jugadas = Array.isArray(recibo.jugadas) ? recibo.jugadas : [];

    /**
     * ⚠️ LAS NORMAS VAN EN EL ENLACE. SIN ELLAS, REPITE OTRO JUEGO.
     *
     * Damas es el primero con normas variables (`damaVuela`, `peonComeAtras`), y en
     * cuanto existe una variable, `{juego, semilla, jugadas}` deja de identificar una
     * partida: la misma lista es legal con unas normas e ilegal con otras. El
     * ProtoHub ya mete `normas` en el recibo por eso, y está medido — sin ese campo,
     * tres de cada cuatro partidas cruzadas se validaban con normas ajenas.
     *
     * Lo vi al copiar un enlace de damas y encontrarme `normas` en el recibo que el
     * enlace no llevaba. Habría dado un repetidor que se para en mitad de la partida
     * culpando al recibo, cuando el recibo estaba bien y el roto era el enlace.
     *
     * `?normas=` nombra las ENCENDIDAS, que es como lo lee `montarMesa`. Las apagadas
     * se omiten: no hay forma de escribirlas en ese formato, y ninguna norma de las
     * que existen viene encendida de fábrica.
     */
    const encendidas = Object.entries(recibo.normas ?? {})
        .filter(([, v]) => v === true).map(([k]) => k);
    const normas = encendidas.length
        ? `&normas=${encendidas.map(encodeURIComponent).join(',')}` : '';

    /**
     * ⚠️ CERO JUGADAS TAMBIÉN TIENE ENLACE, Y ES LA MITAD DE LOS AVISOS.
     *
     * La primera versión devolvía `null` sin jugadas, y midiéndolo contra el buzón
     * real resultó que la mayoría de los avisos son de gente que escribe NADA MÁS
     * ABRIR: «ni idea tengo de cómo se juega», «esto no iría con dos barajas».
     * Recibo con semilla y cero jugadas.
     *
     * Y ese enlace es justo el que hace falta: `?semilla=N` reparte EXACTAMENTE lo
     * que esa persona tenía delante cuando escribió. Comprobado abriendo mancala con
     * la semilla del aviso — la mesa local ya la respeta.
     *
     * Sin `repetir=`, así que no monta el repetidor: no hay nada que ver repetirse,
     * hay una partida que empezar en el mismo sitio donde alguien se atascó.
     */
    const base = `${sitio}/arcade/${pagina}.html?semilla=${recibo.semilla}${normas}`;
    if (!jugadas.length) return base;

    const lista = jugadas.map(m => encodeURIComponent(String(m))).join(',');
    return `${base}&repetir=${lista}`;
}
