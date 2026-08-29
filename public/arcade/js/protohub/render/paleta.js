/**
 * paleta.js — los colores con nombre, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un juego puede decir de qué color son sus piezas:
 *
 *     COLORES: { 0: 'negro', 1: 'blanco' }      // en go.js
 *
 * y aquí se traduce el nombre al tono que hace falta.
 *
 * ⚠️ POR QUÉ NOMBRES Y NO HEXADECIMALES.
 *
 * Salió del go: sus piedras salían azul y roja porque llevaban el color genérico
 * de dueño. Consistente con las damas, pero en el go los colores SON el nombre de
 * los bandos — «juega negras» no describe el aspecto, es la regla.
 *
 * Lo fácil habría sido que `go.js` pusiera `0x1a1a1a`, y habría metido tres
 * problemas de golpe:
 *
 *   · Las reglas se llenan de configuración de render y dejan de servir para lo
 *     que no es 3D. La puerta de texto y el pintor 2D no quieren un RGB.
 *   · Retocar la luz de la mesa obligaría a repasar treinta y cinco ficheros. Hoy
 *     mismo el color de la madera salió amarillo fosforito porque lo elegí mirando
 *     la muestra en vez del render — eso, multiplicado por juego.
 *   · Y un `0xFFFF00` puesto con prisa es cómo `fagocito` acabó llevando encima el
 *     amarillo y el azul de otro juego, que ya costó una limpieza.
 *
 * ⚠️ Y POR QUÉ ESTO ES UN FICHERO Y NO UNA CONSTANTE EN `pintar3d.js`.
 *
 * Porque hay DOS pintores. `pintar2d.js` dibuja el minimapa que va dentro del
 * panel, y tenía su propia tabla de colores por dueño: el go habría salido con
 * piedras negras en la mesa y azules en el minimapa, a la vez y en la misma
 * pantalla. Es el fallo que este proyecto lleva persiguiendo todo el día con otra
 * ropa — el mismo estado contado por dos proyecciones y una de las dos mintiendo.
 * Dos copias de una tabla de colores se separan igual que dos copias de una lista.
 *
 * ⚠️ EL BLANCO NO ES BLANCO Y EL NEGRO NO ES NEGRO.
 *
 * `0xffffff` con la luz cenital de la mesa es una mancha sin forma: se pierde el
 * borde de la ficha y se confunde con el suelo claro. Un hueso muy claro se LEE
 * como blanco y conserva el relieve. Igual por abajo: el negro puro se traga las
 * sombras y parece un agujero.
 */
export const PALETA = {
    negro: 0x14161a, blanco: 0xece4d2,
    rojo: 0xc0392b, azul: 0x2a3550, verde: 0x2e8b57, ambar: 0xd68910,
    morado: 0x7d4f9c, gris: 0x7f8c8d, hueso: 0xd8cfbb, tierra: 0x7d6039,
};

/** El mismo color, en `#rrggbb`, para quien pinta en un lienzo 2D. */
export const enCSS = (hex) => '#' + hex.toString(16).padStart(6, '0');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA SILUETA: NEGRA SOBRE LO CLARO, CLARA SOBRE LO OSCURO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Idea de Oscar. Una ficha clara sobre un tapete claro pierde el borde, y una
 * oscura sobre sombra hace lo mismo por el otro lado. Un contorno del color
 * contrario devuelve el borde en los dos casos.
 *
 * ⚠️ SE DECIDE POR LUMINANCIA, NO POR LA MEDIA DE LOS TRES CANALES.
 *
 * La media dice que el verde puro (0x00ff00) y el azul puro (0x0000ff) son
 * igual de claros —los dos 85 de 255— y el ojo ve el verde muchísimo más
 * brillante que el azul. Con la media, el verde de esta paleta llevaría contorno
 * claro, que es justo el que no se ve encima de él. Se usa la fórmula de
 * luminancia relativa de WCAG, que es la que pesa cada canal por lo que el ojo
 * aporta: 0,2126 / 0,7152 / 0,0722, con la corrección de gamma.
 *
 * ⚠️ Y EL CONTORNO NO ES BLANCO PURO NI NEGRO PURO, POR LO MISMO QUE ARRIBA.
 *
 * Este fichero ya explica que `0xffffff` con la luz cenital de la mesa es una
 * mancha sin forma. Un contorno de blanco puro haría eso mismo alrededor de cada
 * ficha oscura: en vez de un borde, un halo. Se usan los dos extremos de la
 * paleta, que están elegidos para esta mesa.
 *
 * ⚠️ EL UMBRAL ES 0,18 Y NO 0,5.
 *
 * Con 0,5 casi todos los colores de la paleta —rojo, azul, verde, morado— caen
 * del lado oscuro y llevarían contorno claro, o sea que la mitad del tablero
 * tendría halo. Medido sobre esta paleta, 0,18 deja el negro y el azul con
 * contorno claro y el resto con contorno oscuro, que es lo que se ve bien contra
 * el tapete.
 */
export const SILUETA = { oscura: 0x0d0f12, clara: 0xf2ece0 };

/** Luminancia relativa (WCAG 2.x), de 0 a 1. Función pura: se prueba sin navegador. */
export function luminancia(hex) {
    const canal = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const r = canal((hex >> 16) & 0xff);
    const g = canal((hex >> 8) & 0xff);
    const b = canal(hex & 0xff);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** El contorno que hace que ese color se recorte: oscuro si es claro, claro si es oscuro. */
export const contrasteDe = (hex) => (luminancia(hex) > 0.18 ? SILUETA.oscura : SILUETA.clara);

const avisados = new Set();

/**
 * El color de un dueño: el que declaró el juego, o `null` si no declaró ninguno
 * —y entonces cada pintor pone el suyo de siempre—.
 *
 * ⚠️ UN NOMBRE QUE NO EXISTE SE DICE EN VOZ ALTA.
 *
 * Caer al color genérico en silencio sería justo el tipo de fallo que más caro
 * sale aquí: `COLORES: {0:'negor'}` dibujaría un go azul, todo verde, y sin nada
 * que explicara por qué. Se avisa UNA vez por nombre — esto se llama en cada
 * repintado, o sea sesenta veces por segundo.
 */
export function colorDe(de, colores) {
    const nombre = colores?.[de];
    if (!nombre) return null;

    const hex = PALETA[nombre];
    if (hex === undefined) {
        if (!avisados.has(nombre)) {
            avisados.add(nombre);
            console.warn(`[paleta] el color '${nombre}' no existe. Hay: ${Object.keys(PALETA).join(', ')}`);
        }
        return null;
    }
    return hex;
}
