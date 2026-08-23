/**
 * veredicto.mjs — ¿SIGUE VIVO ESTE AVISO, O YA ESTÁ ARREGLADO?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El buzón no tiene estado. Un aviso escrito el 12 de agosto sigue ahí el 23
 * pidiendo trabajo aunque se arreglara el 14, y no hay forma de distinguirlo de
 * uno vivo. Medido: seis avisos de entropy —«no se puede robar del mazo», «no me
 * deja coger la del descarte»— y las dos cosas funcionan hoy. Media hora en
 * confirmar que algo ya iba bien, mientras los de mancala y alisapolis, que SÍ
 * estaban vivos, se leían igual de urgentes.
 *
 * `avisos.mjs` ya decía «SE PUEDE REPETIR», y eso engaña: sólo significa que las
 * reglas no han cambiado bajo el recibo. No dice nada de la QUEJA.
 *
 * ⚠️ Y LO PRIMERO ES ADMITIR QUÉ NO SE PUEDE JUZGAR A MÁQUINA.
 *
 * «gráficamente pobre», «la luz quema el tablero», «el tapete no cumple el
 * estándar» — eso no lo decide un programa, y fingir un veredicto sería peor que
 * no darlo: convertiría en verde una cosa que nadie ha mirado. Esas se marcan
 * como HAY QUE MIRARLO, que es información de verdad: dice a quién le toca.
 *
 * Lo que sí se puede comprobar, y se comprueba:
 *
 *   casa           «parece que juego yo solo» → se re-juega y se cuentan los
 *                  turnos por silla. Si el árbitro reparte, la queja es de la
 *                  PANTALLA, no de las reglas — y eso cambia dónde buscar.
 *   instrucciones  «ni idea de cómo se juega» → ¿declara el juego su objetivo?
 *                  Los 40 lo declaran, así que la queja es de que no se ENSEÑA.
 *   pulsar         «no pasa nada al darle» → ¿estaba esa jugada entre las legales
 *                  en el momento del aviso? El propio aviso trae la cuenta.
 *
 * Y en todos, un dato objetivo y barato: si el código de ese juego ha cambiado
 * desde que se escribió el aviso. Sin cambios, casi seguro que sigue vivo.
 */

/** Las familias de queja, por lo que dicen. El orden importa: gana la primera. */
const FAMILIAS = [
    ['casa', /juego yo solo|juego solo|la casa no|no saca|va solo|no juega/i],
    /**
     * ⚠️ «EL DADO NO SE MUEVE» NO ES «SE MUEVE TODO EL RATO».
     *
     * Son la queja CONTRARIA y comparten las tres palabras. Con un `/se mueve/` a
     * secas, la de la oca —«gráficamente muy pobre, el dado no se mueve»— caía en
     * la familia del temblor, y habría mandado a alguien a buscar un bucle de
     * animación donde lo que falta es la animación entera.
     *
     * Así que esta familia exige el sentido de EXCESO: «todo el rato», «antes de
     * tocarlas», «no para de», «cada frame», «tiembla», «bucle». Lo caza
     * `prueba_veredicto.mjs` con la frase real, que fue quien lo destapó.
     */
    ['movimiento', /se mueve[ns]? (todo el rato|antes de|sol[oa])|no para de mover|cada frame|tiembla|bucle|buggueado/i],
    ['pulsar', /no pasa nada|no me deja|no se puede|no funciona con|no existe|no deja/i],
    ['instrucciones', /ni idea de como|ni idea de cómo|no hay normas|instrucciones|reglas del juego|no deberia mostrar|no debería mostrar/i],
    ['aspecto', /graficamente|gráficamente|pobre|tapete|la luz|quema|standar|estandar|estándar|eye ?candy|se ve raro|mesa mal/i],
    ['reglas', /baraja|palos|no iria|no iría|solo mueve|damas inglesas/i],
];

/** A qué familia pertenece una queja. `null` si no encaja en ninguna. */
export function familia(comentario) {
    const t = String(comentario ?? '');
    for (const [nombre, patron] of FAMILIAS) if (patron.test(t)) return nombre;
    return null;
}

/** Qué familias puede juzgar una máquina, y cuáles necesitan ojos. */
export const AUTOMATICAS = new Set(['casa', 'instrucciones', 'pulsar']);
export const NECESITAN_OJOS = new Set(['movimiento', 'aspecto', 'reglas']);

/**
 * ¿Reparte turnos el árbitro de este juego?
 *
 * Se juega una partida entera dejando decidir a la casa y se cuentan los turnos
 * por nombre. Si aparece más de un nombre, la casa juega — y entonces «parece que
 * juego yo solo» NO es un fallo de las reglas: o no se ve mover a nadie, o las
 * fichas de los dos jugadores son indistinguibles. Las dos cosas han pasado esta
 * semana, y las dos se buscan en sitios muy distintos.
 */
export function repartoDeTurnos(reglas, semilla = 7, tope = 300) {
    const p = reglas.nuevaPartida({ semilla });
    const turnos = new Map();
    for (let i = 0; i < tope; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length) break;
        const quien = String(st.turn ?? st.turno ?? '?');
        turnos.set(quien, (turnos.get(quien) ?? 0) + 1);
        if (!reglas.mover(p, reglas.sugerencia?.(p) ?? leg[0])) break;
    }
    return { sillas: turnos.size, detalle: [...turnos.entries()].map(([k, v]) => `${k}:${v}`).join(' ') };
}

/**
 * El veredicto de un aviso. Devuelve `{ estado, porque }`, donde `estado` es uno
 * de: `vivo`, `pantalla`, `mirar`, `sin-datos`.
 *
 * ⚠️ NUNCA devuelve «arreglado» por su cuenta. Que una comprobación pase no
 * demuestra que la queja se resolviera: puede que la comprobación no mire lo que
 * la persona vio. Lo más que se afirma es DÓNDE está el problema, que es lo que
 * de verdad ahorra tiempo.
 */
export function veredicto(aviso, { reglas = null, cambiosDesde = null } = {}) {
    const f = familia(aviso?.comentario);
    if (!f) return { estado: 'mirar', familia: null, porque: 'no encaja en ninguna familia conocida' };

    if (NECESITAN_OJOS.has(f)) {
        return { estado: 'mirar', familia: f, porque: 'esto no lo juzga un programa: hace falta abrirlo' };
    }

    if (f === 'instrucciones') {
        const tiene = !!(reglas?.OBJETIVO || reglas?.objetivo);
        return tiene
            ? { estado: 'pantalla', familia: f, porque: 'el juego SÍ declara su objetivo: no se está enseñando' }
            : { estado: 'vivo', familia: f, porque: 'el juego no declara objetivo: no hay nada que enseñar' };
    }

    if (f === 'casa') {
        if (!reglas) return { estado: 'sin-datos', familia: f, porque: 'no se pudieron cargar sus reglas' };
        const r = repartoDeTurnos(reglas);
        return r.sillas > 1
            ? { estado: 'pantalla', familia: f, porque: `el árbitro SÍ reparte (${r.detalle}): no se ve mover, o las fichas no se distinguen` }
            : { estado: 'vivo', familia: f, porque: `sólo una silla tiene turno nunca (${r.detalle})` };
    }

    if (f === 'pulsar') {
        const n = Number(aviso?.estado?.legal_moves);
        if (!Number.isFinite(n)) return { estado: 'sin-datos', familia: f, porque: 'el aviso no trae cuántas jugadas había' };
        return n > 0
            ? { estado: 'pantalla', familia: f, porque: `había ${n} jugada(s) legal(es) en ese momento: la jugada existía y el clic no llegó` }
            : { estado: 'vivo', familia: f, porque: 'no había ninguna jugada legal: la partida estaba atascada de verdad' };
    }

    return { estado: 'mirar', familia: f, porque: 'sin comprobación para esta familia' };
}
