/**
 * huella.js — ¿juegan los dos lados exactamente al mismo juego?
 * ═══════════════════════════════════════════════════════════════════════════
 * La tesis del banco de pruebas es que la puntuación no se envía, se recalcula:
 * el servidor vuelve a jugar tu partida. Eso sólo vale si **el servidor usa las
 * mismas reglas que tú**, y eso es una promesa, no un hecho.
 *
 * Aquí se convierte en un hecho comprobable: cada juego reparte su partida
 * inicial con una semilla fija y se resume en ocho caracteres. Navegador y
 * servidor calculan la suya y se comparan. Si divergen, se ve el primer día.
 *
 * ⚠️ POR QUÉ ESTO NO ES PARANOIA
 * `blackjack` y `poker` leen `card_library.json`, y si esa lectura falla tienen
 * un respaldo interno con los mismos valores copiados a mano. Medido: hoy
 * reparten idéntico, así que el fallo no se notaría. Pero el respaldo es una
 * COPIA, y las copias se separan: el día que la biblioteca pase a 8 barajas, un
 * lado jugaría con 8 y el otro con 6, todas las partidas legítimas saldrían
 * inválidas y el motivo no aparecería en ningún error.
 *
 * Y este fichero se importa desde los DOS lados a propósito. Duplicar la
 * función que vigila la duplicación habría tenido su gracia, pero poca.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** La semilla con la que se toma la huella. Cambiarla invalida las anteriores. */
export const SEMILLA_HUELLA = 7;

/** Suma de control corta y estable (FNV-1a). No hace falta criptografía. */
export function resumir(valor) {
    const s = typeof valor === 'string' ? valor : JSON.stringify(valor);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

/**
 * Huella de un módulo de reglas: su partida inicial, resumida.
 *
 * Sólo entra lo que DEFINE la partida —lo que se puede hacer, de quién es el
 * turno, qué cartas hay— y no lo que la adorna. Si se metiera el estado entero,
 * cualquier campo cosmético nuevo daría una falsa alarma y en dos semanas nadie
 * miraría las huellas.
 */
export function huellaDeReglas(reglas) {
    const p = reglas.nuevaPartida({ seed: SEMILLA_HUELLA, semilla: SEMILLA_HUELLA });
    const e = reglas.estado(p);
    return resumir({
        legal_moves: e.legal_moves ?? null,
        turn: e.turn ?? null,
        fen: e.fen ?? null,
        // ⚠️ ESTA LISTA SE QUEDÓ CORTA Y LA HUELLA MINTIÓ.
        // Al añadir los juegos de baza, **hearts y spades salieron con la MISMA
        // huella**: son juegos distintos —uno sin triunfo y se juega a perder,
        // el otro con picas de triunfo y contando bazas— pero comparten baraja,
        // reparto y semilla, y los campos que los diferencian (`mano`,
        // `triunfo`, `marcador`) no estaban aquí. La huella sólo veía lo que
        // tenían en común.
        //
        // Una huella que no distingue dos juegos no distinguiría dos versiones
        // del mismo: exactamente para lo que existe. Se añaden los campos que
        // definen la apertura, sin meter nada cosmético —si entrara cualquier
        // campo nuevo, saltarían falsas alarmas y en dos semanas nadie miraría
        // las huellas.
        mano: e.player_hand ?? e.mano ?? null,
        casa: e.dealer_hand ?? null,
        mazo: e.mazo_restante ?? null,
        triunfo: e.triunfo ?? null,
        marcador: e.marcador ?? null,
        tablero: e.board ?? null,
    });
}
