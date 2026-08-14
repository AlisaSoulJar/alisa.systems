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
