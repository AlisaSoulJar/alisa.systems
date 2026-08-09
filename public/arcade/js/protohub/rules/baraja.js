/**
 * baraja.js — de dónde salen las cartas, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 * Las cartas no se inventan aquí: se leen de `arcade/data/card_library.json`,
 * que es la biblioteca del ProtoHub y la autoridad sobre qué palos y qué rangos
 * tiene cada baraja. Este fichero sólo sabe leerla y tener un respaldo por si no
 * se puede.
 *
 * ⚠️ POR QUÉ EXISTE
 * Mismo cuento que en [azar.js]: `cargarBaraja` y el respaldo de la baraja
 * francesa estaban copiados en `bazas.js` y en `guerra.js`, con dos firmas
 * distintas —una pedía el nombre de la baraja, la otra lo tenía dentro—. Nadie
 * había divergido todavía. Pero el respaldo es justo lo que se usa **cuando la
 * biblioteca no carga**, o sea el camino que menos se prueba y más silencioso
 * es: si una copia lista los palos en otro orden, esa mesa reparte distinto y
 * las partidas guardadas de ese juego dejan de verificar.
 *
 * NOTA SOBRE EL FORMATO DE CARTA
 * Una carta es una cadena `PALO_RANGO` — `S_A`, `O_1`, `H_10`. Es fea y a
 * propósito: se compara con `===`, se serializa sola y viaja en el recibo de la
 * partida sin necesidad de un objeto. `palo()` y `rango()` son las únicas dos
 * formas legítimas de abrirla.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const RUTA_BIBLIOTECA = '../../../data/card_library.json';

export const palo  = (id) => id.split('_')[0];
export const rango = (id) => id.split('_').slice(1).join('_');

/**
 * El respaldo. Sólo se usa si la biblioteca no carga —sin red, fichero movido,
 * `file://` en Node—. Que el juego siga en pie es preferible a una pantalla en
 * blanco, pero el estado lo dice (`biblioteca: false`) para que nadie compare
 * una partida de la biblioteca con una del respaldo sin enterarse.
 */
export const RESPALDO = {
    spanish_40: { suits: ['O', 'P', 'E', 'B'],
                  ranks: ['1', '2', '3', '4', '5', '6', '7', 'S', 'C', 'R'] },
    spanish_48: { suits: ['O', 'P', 'E', 'B'],
                  ranks: ['1','2','3','4','5','6','7','8','9','S','C','R'] },
    french_52:  { suits: ['S', 'H', 'D', 'C'],
                  ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] },
    french_54:  { suits: ['S', 'H', 'D', 'C'],
                  ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] },
    unit_108:   { suits: ['R', 'B', 'G', 'Y'],
                  ranks: ['0','1','2','3','4','5','6','7','8','9'] },
    // La nuestra: cuatro colores y doce números, sin figuras. Entropy repartía
    // con la española de 48 y no miraba el palo ni una vez — se dibujaban oros y
    // copas para un juego que sólo suma valores, y había que traducir «R» a 12
    // de cabeza. Aquí la carta ES su número.
    alisa_48:   { suits: ['A', 'V', 'C', 'M'],
                  ranks: ['1','2','3','4','5','6','7','8','9','10','11','12'] },
};

const id = (x) => (typeof x === 'string' ? x : x?.id ?? x?.rank);

/**
 * Resuelve una baraja de la biblioteca, siguiendo `extends`.
 *
 * ⚠️ ESTO FALTABA, Y NADIE LO SABÍA
 * La biblioteca lleva `extends` desde siempre: `spanish_48` hereda los palos de
 * `spanish_40` y sólo redefine los rangos; `french_54` hereda las dos cosas y
 * sólo añade comodines. Ningún cargador lo implementaba. Resultado: **dos de las
 * seis barajas del catálogo no eran cargables** y nadie se había enterado,
 * porque los cuatro juegos que había usaban las dos que no heredan.
 *
 * Apareció al portar Entropy, que es el primero que pide `spanish_48`.
 */
function resolver(lib, nombre, vistas = new Set()) {
    const d = lib?.decks?.[nombre];
    if (!d) throw new Error(`la biblioteca no tiene la baraja '${nombre}'`);
    if (vistas.has(nombre)) throw new Error(`'extends' circular en '${nombre}'`);
    vistas.add(nombre);
    const base = d.extends ? resolver(lib, d.extends, vistas) : { suits: [], ranks: [] };
    return {
        suits: d.suits ? d.suits.map(id) : base.suits,
        ranks: d.ranks ? d.ranks.map(id) : base.ranks,
    };
}

/**
 * Lee una baraja de la biblioteca. Si no puede, cae al respaldo.
 *
 * @param {string} nombre  clave en `decks` — 'spanish_40', 'french_52', …
 * @param {string} url     ruta a card_library.json, relativa a ESTE módulo
 * @returns {Promise<{suits: string[], ranks: string[], biblioteca: boolean}>}
 */
export async function cargarBaraja(nombre, url = RUTA_BIBLIOTECA) {
    let baraja, deLaBiblioteca = true;
    try {
        const lib = await fetch(new URL(url, import.meta.url)).then(r => r.json());
        baraja = resolver(lib, nombre);
    } catch {
        baraja = RESPALDO[nombre];
        deLaBiblioteca = false;
    }
    // ⚠️ FALLAR ALTO, NO BAJO.
    // La versión anterior hacía `{ ...RESPALDO[nombre] }`, y para una baraja sin
    // respaldo eso da `{}`: un objeto que PARECE una baraja, se pasa alegremente
    // por tres funciones y revienta mucho después con un
    // «Cannot read properties of undefined». El respaldo es el camino que menos
    // se prueba; si no sirve, tiene que decirlo aquí y ahora.
    if (!baraja?.suits?.length || !baraja?.ranks?.length) {
        throw new Error(`baraja '${nombre}' no disponible: ni en la biblioteca ni en el respaldo`);
    }
    return { ...baraja, biblioteca: deLaBiblioteca };
}

/** La baraja entera como lista de cartas, sin barajar. */
export const cartasDe = (baraja) =>
    baraja.suits.flatMap(s => baraja.ranks.map(r => `${s}_${r}`));
