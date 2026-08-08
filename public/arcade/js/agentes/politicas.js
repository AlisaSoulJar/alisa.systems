/**
 * politicas.js — las líneas base, en las mismas filas que los modelos
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
    const elegir = (env, opciones) => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) % opciones.length;
    };
    /**
     * ⚠️ RESEMBRAR ANTES DE CADA PARTIDA, Y ANTES NO SE HACÍA.
     *
     * Esta política se creaba UNA vez y su estado interno viajaba de juego en
     * juego y de semilla en semilla durante toda la tanda. Consecuencia: la
     * partida aleatoria de `cripta` dependía de cuántas jugadas había gastado
     * `brisca` antes que ella.
     *
     * O sea que **el suelo de un juego cambiaba según con qué otros juegos se
     * midiera**. Correr `--juegos rebano,relevo` daba un número distinto que
     * correr el catálogo entero, y ninguna de las dos medidas era reproducible
     * por separado. Lo destapó Fable verificando un arreglo: la comprobación
     * aislada no reproducía el fallo que sí aparecía con los 30.
     *
     * Con puntuaciones que valen algo eso es un agujero, no una curiosidad: la
     * línea base contra la que se normaliza a todo el mundo dependería de la
     * composición de la tanda, que la elige quien la lanza.
     *
     * Ahora cada partida siembra con `(juego, semilla)`, así que la misma
     * partida da siempre lo mismo, se mida sola o acompañada.
     */
    elegir.sembrar = (nueva) => { a = (nueva >>> 0) || 1; };
    return elegir;
}

/** Mezcla un nombre de juego y una semilla en un entero estable (FNV-1a). */
export function semillaDe(juego, semilla) {
    let h = 0x811c9dc5;
    const s = `${juego}#${semilla}`;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
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
