/**
 * historial.js — lo que ha pasado, y que se puede volver a jugar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     pintarHistorial(caja, { juego, semilla, jugadas, autores, yo });
 *
 * ⚠️ POR QUÉ ESTO NO ES DECORACIÓN.
 *
 * En los sitios de cartas más usados hay hilos enteros de gente convencida de que
 * el reparto está amañado. No es paranoia sin causa: cuando una máquina reparte y
 * pierdes tres veces seguidas, sin nada que mirar, la sospecha es la conclusión
 * razonable. Es de los antipatrones mejor documentados del sector.
 *
 * Y nosotros tenemos la respuesta buena desde el principio —la partida ENTERA se
 * puede volver a jugar desde `{juego, semilla, jugadas}`, y el verificador la
 * comprueba con aritmética y no con un modelo que opine— sólo que vivía dentro del
 * recibo y no se veía por ningún lado.
 *
 * Esto lo enseña. Y de paso hace tres cosas más que salen gratis:
 *
 *   · **Dice qué hizo la casa mientras no mirabas.** En un juego contra un FSM, las
 *     jugadas del rival ocurren solas; sin registro, el tablero cambia y no sabes
 *     por qué. La guía de Board Game Arena lo pone de norma: un log de toda acción
 *     mayor, diciendo quién actuó.
 *   · **Es la traza que un agente puede leer.** Mismo texto para los dos, que es lo
 *     que hace comparables las dos filas de la tabla.
 *   · **Convierte «me ha pasado algo raro» en un caso reproducible**, porque la
 *     semilla está ahí, a la vista, para copiarla en un aviso.
 *
 * ⚠️ LO ÚLTIMO ARRIBA.
 *
 * Se lee para saber qué acaba de pasar, no para repasar la partida desde el
 * principio. Ordenarlo como un diario obligaría a desplazarse hasta el final cada
 * vez, y en un móvil eso es no leerlo.
 */

/** Cuántas se enseñan. Las demás siguen en el recibo: esto es una ventana, no el archivo. */
const CUANTAS = 8;

/**
 * @param {HTMLElement} caja
 * @param {object} cfg
 *   juego     su nombre, para el recibo
 *   semilla   el reparto. Misma semilla = misma partida
 *   jugadas   todas, en orden
 *   autores   quién hizo cada una, en paralelo. Puede venir corto o vacío
 *   yo        el nombre de tu asiento, para poder distinguir lo tuyo
 */
export function pintarHistorial(caja, { juego, semilla, jugadas = [], autores = [], yo = null } = {}) {
    if (!caja) return;

    if (!jugadas.length) {
        // Sin jugadas todavía se enseña la semilla igual: es la promesa de que esto
        // se puede repetir, y vale desde antes de empezar.
        caja.innerHTML = `<div class="historial-recibo">semilla <b>${semilla ?? '—'}</b>`
                       + ` · esta partida se puede volver a jugar</div>`;
        return;
    }

    const desde = Math.max(0, jugadas.length - CUANTAS);
    const filas = [];
    for (let i = jugadas.length - 1; i >= desde; i--) {
        const quien = autores[i] ?? null;
        // `mío` no es cosmético: en una partida contra la casa, saber cuáles son las
        // tuyas es la mitad de poder entender lo que pasó.
        const mio = yo !== null && quien !== null && String(quien) === String(yo);
        const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        filas.push(
            `<li class="${mio ? 'historial-mio' : ''}">`
            + `<span class="historial-n">${i + 1}</span>`
            + (quien ? `<span class="historial-quien">${esc(quien)}</span>` : '')
            + `<span class="historial-jugada">${esc(String(jugadas[i]).replace(/^jugar:|^pedir:/, ''))}</span>`
            + `</li>`);
    }

    const ocultas = jugadas.length - (jugadas.length - desde);
    caja.innerHTML =
        `<div class="historial-recibo">${esc0(juego)} · semilla <b>${semilla ?? '—'}</b>`
        + ` · ${jugadas.length} jugada${jugadas.length === 1 ? '' : 's'}`
        + ` — se puede volver a jugar</div>`
        + `<ol class="historial-lista">${filas.join('')}</ol>`
        + (ocultas > 0 ? `<div class="historial-mas">y ${ocultas} antes</div>` : '');
}

const esc0 = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
