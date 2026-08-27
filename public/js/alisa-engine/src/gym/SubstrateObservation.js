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

    /**
     * 3. Cuántas piezas hay de verdad: el relleno de ceros es indistinguible sin esto.
     *
     * ⚠️ Y CON `maxPiezas: 0` ESTO ERA `0/0`, O SEA `NaN`.
     *
     * Los juegos de cartas no tienen piezas sueltas —sus cosas están en montones—
     * y los de tablero las llevan ya en el plano de casillas, así que los cuarenta
     * piden cero huecos. La división se quedó sin guardia y metía un `NaN` en el
     * séptimo número de veintiún entornos. Lo cazó `check_gym_envs`, que mira
     * justo eso; a ojo no se ve, porque un `NaN` no rompe nada hasta que alguien
     * multiplica.
     */
    out.push(maxPiezas ? Math.min(1, (sus.piezas?.length ?? 0) / maxPiezas) : 0);

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  4, 5 y 6. MONTONES, HECHOS Y LO QUE TIENES EN LA MANO — TODO OPCIONAL
     * ═══════════════════════════════════════════════════════════════════════
     *
     * ⚠️ POR QUÉ SON OPCIONALES Y NO SALEN SIEMPRE.
     *
     * Los trece mundos del banco tienen su vector SELLADO en una huella. Añadirles
     * números al final los cambia de forma y retira, sin avisar, todas las notas
     * publicadas de quien ya jugó. Así que estas tres secciones sólo aparecen si
     * quien llama las pide — y quien las pide es el adaptador del ProtoHub, cuyos
     * cuarenta juegos NO tenían vector: entregaban cuatro números —puntos, cuántas
     * jugadas legales, si es tu turno y si acabó— o sea el marcador y ni una carta.
     * Un agente numérico no podía jugar al ajedrez con eso.
     *
     * ⚠️ Y LOS VOCABULARIOS SE PASAN, NO SE ADIVINAN.
     *
     * Es la misma lección que la nota de arriba sobre `leyenda`: sacar el
     * vocabulario de lo que hay AHORA hace que lo que aparezca después se confunda
     * en silencio con el cero. Un montón de descarte no existe en el reparto y sale
     * a la tercera jugada; el triunfo de la brisca puede ser cualquiera de cuatro
     * palos. Así que las listas se miden jugando y se guardan en un fichero que se
     * puede abrir y leer — `public/data/vocabulario_observacion.js`—, y aquí sólo
     * se usan. Lo que no esté declarado vale 0, que significa «no lo tengo en el
     * vocabulario» y no puede pasar por otra cosa.
     */
    const indice = (lista, v) => {
        const i = lista.indexOf(v);
        return i < 0 ? 0 : (i + 1) / (lista.length + 1);
    };

    /**
     * 3.bis EL TABLERO ENTERO, CASILLA A CASILLA — TAMBIÉN OPCIONAL, Y AQUÍ SÍ CABE.
     *
     * La sección 1 manda sólo el TAMAÑO de la rejilla, y su nota explica por qué:
     * «una rejilla de 12×12 son 144 números y de 20×20 son 400, y la forma del
     * vector tiene que ser fija». Eso valía cuando un mismo vector tenía que servir
     * a nueve mundos distintos.
     *
     * Para un juego de tablero concreto no vale: el go son 361 intersecciones y la
     * sección de piezas lleva 32, así que ONCE DE CADA DOCE PIEDRAS se quedaban
     * fuera. Un agente numérico con ese vector no está jugando al go.
     *
     * Y aquí el argumento se da la vuelta: cada juego declara SU forma, y un
     * tablero de go mide siempre 19×19. Así que se manda entero, en dos planos —el
     * suelo y quién lo ocupa—, que es como se le da un tablero a una red desde hace
     * treinta años.
     *
     * El dueño va DENTRO del código de la pieza y no en un tercer plano: duplicar
     * el tamaño para distinguir dos bandos sale caro en el fagocito (784 casillas)
     * y un índice par/impar lo dice igual de bien.
     */
    if (opts.rejilla && r) {
        const { ancho, alto } = opts.rejilla;
        const suelo = new Array(ancho * alto).fill(0);
        const quien = new Array(ancho * alto).fill(0);
        const celdas = r.celdas ?? [];
        for (let i = 0; i < ancho * alto; i++) {
            suelo[i] = Math.max(-1, Math.min(1, (celdas[i] ?? 0) / 8));
        }
        const nt = tipos.length + 1;
        for (const p of (sus.piezas ?? [])) {
            if (!(p.x >= 0 && p.x < ancho && p.y >= 0 && p.y < alto)) continue;
            const t = idxTipo.get(p.t) ?? 0;
            const bando = (p.de === null || p.de === undefined) ? 0 : Math.min(3, p.de) + 1;
            quien[p.y * ancho + p.x] = (t * 5 + bando) / (nt * 5);
        }
        out.push(...suelo, ...quien);
    }

    // 4. LOS MONTONES: qué montón, de quién, cuánto se ve y cuánto está tapado.
    if (opts.zonas) {
        const { ids = [], max = 12, tope = 108 } = opts.zonas;
        const zs = (sus.zonas ?? []).slice(0, max);
        for (const z of zs) {
            out.push(
                indice(ids, z.id),
                z.de === null || z.de === undefined ? 0 : Math.min(1, (z.de + 1) / 8),
                Math.min(1, (z.items?.length ?? 0) / tope),
                Math.min(1, (z.ocultas ?? 0) / tope),
            );
        }
        for (let i = zs.length; i < max; i++) out.push(0, 0, 0, 0);
    }

    // 5. LOS HECHOS DE LA MESA: el triunfo, el bote, el color en juego.
    if (opts.hechos) {
        const { ids = [], valores = {}, max = 8, tope = 200 } = opts.hechos;
        const hs = (sus.hechos ?? []).slice(0, max);
        for (const h of hs) {
            /**
             * Un valor puede ser un número —el bote— o una palabra —el palo de
             * triunfo—. El número se normaliza; la palabra se codifica por su sitio
             * en la lista declarada para ESE hecho, porque «B» significa una cosa en
             * `triunfo` y otra en `color`.
             */
            const esNum = typeof h.valor === 'number' && Number.isFinite(h.valor);
            out.push(
                indice(ids, h.id),
                h.de === null || h.de === undefined ? 0 : Math.min(1, (h.de + 1) / 8),
                esNum ? Math.max(-1, Math.min(1, h.valor / tope)) : 0,
                esNum ? 0 : indice(valores[h.id] ?? [], String(h.valor)),
            );
        }
        for (let i = hs.length; i < max; i++) out.push(0, 0, 0, 0);
    }

    /**
     * 6. LO QUE TIENES EN LA MANO, UNA CASILLA POR CARTA DE LA BARAJA.
     *
     * ⚠️ MULTI-HOT Y NO UNA LISTA DE ÍNDICES, y la diferencia importa.
     *
     * Una lista de índices —«mi 1.ª carta es la 17, la 2.ª la 3»— hace que el mismo
     * juego se vea distinto según el ORDEN en que estén ordenadas las cartas, que
     * no es información del juego: es del que las reparte. Una casilla por carta de
     * la baraja no tiene orden, y es lo que un tablero de ajedrez ya hace con las
     * casillas.
     *
     * Se marcan las cartas de las zonas que son TUYAS (`de === asiento`), que es
     * exactamente lo que el sustrato ya decide por silla.
     */
    if (opts.mano) {
        const { cartas = [], asiento = 0 } = opts.mano;
        const mias = new Set();
        for (const z of (sus.zonas ?? [])) {
            if (z.de !== asiento) continue;
            for (const c of (z.items ?? [])) if (c) mias.add(String(c));
            for (const c of (z.casillas ?? [])) if (c) mias.add(String(c));
        }
        for (const c of cartas) out.push(mias.has(c) ? 1 : 0);
    }

    return out.map(v => +(+v).toFixed(4));
}

/**
 * El largo que va a tener, para declararlo en `observationSpace`.
 *
 * Se le pasan las mismas opciones que a la función, para que la forma declarada y
 * la real no puedan separarse — que es el fallo que `prueba_observacion` vigila.
 */
export const observationLength = (maxPiezas = 32, opts = {}) =>
    3 + maxPiezas * 5 + 1
    + (opts.rejilla ? opts.rejilla.ancho * opts.rejilla.alto * 2 : 0)
    + (opts.zonas ? (opts.zonas.max ?? 12) * 4 : 0)
    + (opts.hechos ? (opts.hechos.max ?? 8) * 4 : 0)
    + (opts.mano ? (opts.mano.cartas?.length ?? 0) : 0);
