/**
 * ObservacionDeSustrato — EL VECTOR NUMÉRICO, SACADO DEL ESTADO EN VEZ DE A MANO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Convierte el `sustrato()` de cualquier mundo en números planos. Sirve para los
 * nueve sin saber a qué se juega, porque el sustrato ya es el idioma común.
 *
 * ⚠️ POR QUÉ EXISTE: UN VECTOR ESCRITO A MANO ES UN SITIO DONDE MENTIR.
 *
 * Cada entorno se fabrica su observación a mano —24 números en ¡Busca!, 64 en
 * Marabunta, 26 en CorpBuilding— y ahí es exactamente donde el 24-08 encontré
 * que `escaner_listo` valía 1 mientras la puerta de lenguaje decía «lo tienes al
 * alcance, pero ya lo escaneaste». El estado decía una cosa y su copia otra, y
 * llevaba así desde antes de que nadie mirara.
 *
 * Esto no se escribe: se RECORRE. Si mañana aparece una pieza nueva en el
 * sustrato, sale en el vector sin que nadie se acuerde de añadirla.
 *
 * ⚠️ Y NO REEMPLAZA A LAS OBSERVACIONES QUE YA HAY, A PROPÓSITO.
 *
 * Cambiar el vector de un entorno publicado le cambia la forma y con ella las
 * notas de quien ya jugó. Esto es para los mundos NUEVOS —que nacen con
 * observación gratis— y para demostrar una cosa que hoy sólo era una intuición:
 * **que el sustrato basta**. Si de un sustrato sale un vector jugable, entonces
 * la información está toda ahí, y lo demás es presentación.
 */

/**
 * @param {Object} sus sustrato: `{rejilla?, piezas, zonas, limite?}`
 * @param {Object} [opts]
 * @param {number} [opts.maxPiezas=32] cuántas piezas caben. La forma tiene que
 *        ser FIJA —una red no admite un vector que cambia de largo— así que se
 *        recortan las que sobran y se rellena con ceros.
 * @param {string[]} [opts.tipos] orden de los tipos. Por defecto, **el
 *        vocabulario que el sustrato declara en `leyenda`**.
 * @returns {number[]}
 *
 * ⚠️ LOS TIPOS SALEN DE `leyenda`, Y NO DE LAS PIEZAS QUE HAY AHORA.
 *
 * La primera versión los sacaba de las piezas presentes, y con eso dos mundos de
 * nueve dieron un vector que NO CAMBIABA AL JUGAR:
 *
 *   · en Cabinet todos los cajones empiezan `cerrado`, así que el vocabulario
 *     era `['cerrado']`; al abrir uno y salir `mapache`, el tipo no estaba en la
 *     lista y caía a cero — el mismo número que `cerrado`. **El juego entero es
 *     qué había dentro, y el vector decía siempre lo mismo.**
 *   · en ¡Busca! 5 igual: todo empieza `sin_escanear` y las bandas —caliente,
 *     templado…— aparecen después.
 *
 * O sea que un tipo desconocido se confundía en silencio con el tipo 0. Es el
 * mismo fallo que llevo dos días persiguiendo: una copia del estado que dice
 * menos que el estado y no avisa.
 *
 * `leyenda` es la lista completa que el mundo DECLARA, y ya estaba escrita en
 * los nueve sustratos. Y por si aparece un tipo que no está declarado, se
 * codifica como 0 y los declarados empiezan en 1/(n+1): así el cero significa
 * «esto no lo tengo en el vocabulario» y no puede pasar por otra cosa.
 */
export function substrateObservation(sus, opts = {}) {
    const maxPiezas = opts.maxPiezas ?? 32;
    const tipos = opts.tipos
        ?? (sus.leyenda ? Object.keys(sus.leyenda).sort()
                        : [...new Set((sus.piezas ?? []).map(p => p.t))].sort());
    const idxTipo = new Map(tipos.map((t, i) => [t, i + 1]));   // 0 queda para «desconocido»

    const out = [];

    /**
     * 1. EL TERRENO, SI LO HAY.
     *
     * Se manda el tamaño y no las celdas: una rejilla de 12×12 son 144 números y
     * de 20×20 son 400, y la forma del vector tiene que ser fija. Quien quiera el
     * terreno entero que lo pida al sustrato — aquí va lo que cabe en un vector
     * de tamaño constante.
     */
    const r = sus.rejilla;
    out.push(r ? 1 : 0, r ? Math.min(1, r.ancho / 64) : 0, r ? Math.min(1, r.alto / 64) : 0);

    /**
     * 2. LAS PIEZAS. Cinco números cada una: tipo, x, y, alto y vida.
     *
     * ⚠️ LAS COORDENADAS SE NORMALIZAN CON EL LÍMITE DEL MUNDO, Y SI NO LO HAY
     * CON LO QUE HAYA. Un acuario mide 120 y una rejilla 12: sin normalizar, el
     * mismo número significaría cosas distintas según el mundo y una red
     * entrenada en uno no entendería el otro.
     */
    const escala = sus.limite?.radio ?? sus.limite?.ancho ?? (r ? Math.max(r.ancho, r.alto) : null)
                ?? Math.max(1, ...(sus.piezas ?? []).map(p => Math.abs(p.x)), ...(sus.piezas ?? []).map(p => Math.abs(p.y)));
    const norm = (v) => Math.max(-1, Math.min(1, (v ?? 0) / (escala || 1)));

    const piezas = (sus.piezas ?? []).slice(0, maxPiezas);
    for (const p of piezas) {
        out.push(
            (idxTipo.get(p.t) ?? 0) / (tipos.length + 1),   // 0 = tipo no declarado
            norm(p.x), norm(p.y), norm(p.alto),
            p.vida ?? 1,
        );
    }
    for (let i = piezas.length; i < maxPiezas; i++) out.push(0, 0, 0, 0, 0);

    /** 3. Cuántas piezas hay de verdad: el relleno de ceros es indistinguible sin esto. */
    out.push(Math.min(1, (sus.piezas?.length ?? 0) / maxPiezas));

    return out.map(v => +(+v).toFixed(4));
}

/** El largo que va a tener, para declararlo en `observationSpace`. */
export const observationLength = (maxPiezas = 32) => 3 + maxPiezas * 5 + 1;
