/**
 * politicas.mjs — las líneas base, en las mismas filas que los modelos
 * ═══════════════════════════════════════════════════════════════════════════
 * Una tabla de modelos sin líneas base no dice nada. «GPT-loquesea saca 47» no
 * es información: 47 puede ser una barbaridad o menos que apretar siempre el
 * primer botón. Casi todo lo que se publica en este sector tiene ese agujero.
 *
 * Aquí las tres líneas base juegan **exactamente el mismo episodio** que los
 * modelos —mismo entorno, mismas semillas, mismo tope, mismo recibo verificado—
 * y aparecen como una fila más. No son una nota al pie: son la escala.
 *
 *   primera  — elige siempre la primera opción. El suelo. Si un modelo no le
 *              gana, no está jugando.
 *   azar     — elige al azar entre las legales. Suelo alternativo, y en algunos
 *              juegos es sorprendentemente difícil de batir.
 *   casa     — el rival de la casa del propio juego (`sugerencia`). El techo
 *              blando: una heurística sencilla, escrita a mano, sin búsqueda.
 *
 * ⚠️ POR QUÉ `casa` ENTRA POR OTRA PUERTA
 * Una política de código ve el entorno; un proveedor de modelo sólo ve texto y
 * no puede tocar nada. Esa frontera es una garantía del banco de pruebas, no una
 * comodidad, así que `casa` no se disfraza de proveedor: se pasa como
 * `politica`. Un modelo no puede hacer lo que hace `casa`, y así queda escrito.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Siempre la primera opción. Determinista y sin estado. */
export const primera = () => 0;

/**
 * Al azar entre las legales, reproducible.
 * La semilla del sorteo NO es la de la partida: si lo fuera, el mismo azar
 * acompañaría siempre al mismo reparto y dejaría de ser una línea base neutral.
 */
export function azar(semilla = 20260802) {
    let a = semilla >>> 0;
    return (env, opciones) => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) % opciones.length;
    };
}

/**
 * El rival de la casa del propio juego.
 *
 * Se pide la jugada a `reglas.sugerencia` y se busca en las opciones ofrecidas.
 * Si no aparece —puede pasar: `sugerencia` a veces propone 'pass' o 'nueva', que
 * no siempre están en la lista— se cae a la primera, y se puede contar aparte.
 */
export function casa() {
    return (env, opciones, Clase) => {
        const reglas = Clase?.reglas;
        if (!reglas?.sugerencia || env?.p === undefined) return 0;
        const j = reglas.sugerencia(env.p);
        if (j === null || j === undefined) return 0;
        const i = opciones.findIndex(o => String(o.verb) === String(j));
        return i >= 0 ? i : 0;
    };
}

export const POLITICAS = {
    primera: () => primera,
    azar: () => azar(),
    casa,
};
