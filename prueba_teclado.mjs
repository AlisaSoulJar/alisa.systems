/**
 * prueba_teclado.mjs — escribir una frase no debe jugar la partida
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_teclado.mjs        (entra en `npm test`)
 *
 * ⚠️ DE DÓNDE SALE, MEDIDO EN UN CHROME DE VERDAD:
 *
 *     quería escribir  «las casas se ven raras y no se donde estoy»
 *     salía            «lcevenrrynoeoneetoy»
 *     letras perdidas  23
 *     y la serpiente   se movía 17 veces
 *
 * Los juegos de acción mapean `w a s d`, sus mayúsculas y **el espacio** a
 * direcciones, escuchando en `window` y con `preventDefault()`. Sin comprobar dónde
 * está el foco, escribir en cualquier campo de la página hacía las dos cosas a la
 * vez: mover al personaje de verdad y comerse la letra.
 *
 * Y el único sitio de todo el arcade donde alguien escribe una frase es el botón de
 * «¿algo va raro?» — o sea, **el buzón de betatesters**. Contar un fallo estaba roto
 * por el mismo tipo de fallo que se quería contar.
 *
 * ⚠️ ESTA PRUEBA ES DE TEXTO, NO DE NAVEGADOR, Y HAY QUE SABER QUÉ NO CUBRE.
 *
 * Lo de arriba se midió abriendo snake y escribiendo tecla a tecla; eso no cabe en
 * `npm test` sin arrastrar un Chrome. Lo que sí se puede comprobar sin navegador es
 * que **ningún manejador de teclas del arcade se salte la comprobación del foco**, y
 * eso es justo lo que se rompió. Es una prueba de estructura: débil comparada con
 * medirlo, y suficiente para que el arreglo no se caiga sin avisar.
 */
import { readdir, readFile } from 'node:fs/promises';

const DIR = './public/arcade/js';
let fallos = 0;

console.log('\nEL TECLADO — que escribir una frase no juegue la partida\n');

/**
 * La seña de que un manejador comprueba dónde está el foco: que LLAME a la función
 * compartida.
 *
 * ⚠️ ESTO ERA `activeElement|isContentEditable` Y SE QUEDÓ VERDE CON EL CABLE CORTADO.
 *
 * Al comprobar que esta prueba puede fallar —quitando la llamada y renombrando la
 * función— siguió aprobando: los nombres seguían APARECIENDO en el fichero, dentro
 * de una función que ya no llamaba nadie. Buscar una palabra en alguna parte de un
 * fichero no dice nada sobre si se ejecuta.
 *
 * Se arregló sacando la comprobación a una función con nombre, `estaEscribiendo()`,
 * que además elimina la copia que tenía `peaton_visualizer.js` — dos copias de la
 * misma regla es exactamente cómo el fallo llegó a estar en dos sitios a la vez.
 */
const LLAMA_A_LA_COMPARTIDA = /estaEscribiendo\(\)|ALISA_ESCRIBIENDO\?\.\(\)/;

/**
 * ⚠️ Y LA DEFINICIÓN NO CUENTA COMO LLAMADA. TERCERA VEZ HOY CON LA MISMA FORMA.
 *
 * `function estaEscribiendo()` contiene literalmente `estaEscribiendo()`, así que la
 * marca de arriba aprobaba el fichero que DEFINE la función aunque nadie la llamara
 * — y ese fichero es justo el que hay que vigilar.
 *
 * Van tres marcas textuales que me han engañado hoy, todas del mismo modo: buscar un
 * nombre en un fichero no dice nada sobre si se ejecuta. `crearRepetidor` casaba con
 * `crearRepetidorZZZ`; `activeElement` seguía apareciendo dentro de una función
 * huérfana; y ahora la definición se hacía pasar por uso.
 *
 * La regla que queda: **una comprobación por texto no vale hasta que la has visto
 * suspender con el cable cortado de verdad.**
 */
const quitarDefiniciones = (txt) =>
    txt.replace(/function\s+estaEscribiendo\s*\([^)]*\)/g, '')
       .replace(/window\.ALISA_ESCRIBIENDO\s*=\s*estaEscribiendo\s*;?/g, '');

/**
 * Un manejador es sospechoso si mapea letras. Las flechas solas no molestan: dentro
 * de un campo de texto mueven el cursor y nadie escribe con ellas. El problema son
 * `w a s d` y el espacio, que SON letras que la gente teclea.
 */
const MAPEA_LETRAS = /['"][wasdWASD ]['"]\s*:/;

const ficheros = (await readdir(DIR)).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
const revisados = [];

for (const f of ficheros) {
    const txt = await readFile(`${DIR}/${f}`, 'utf8');
    if (!/addEventListener\(\s*['"]key(down|press)/.test(txt)) continue;
    if (!MAPEA_LETRAS.test(txt)) continue;   // sólo flechas: no compite con escribir
    revisados.push(f);
    if (!LLAMA_A_LA_COMPARTIDA.test(quitarDefiniciones(txt))) {
        console.log(`  ✗ ${f}: mapea letras a jugadas y no mira dónde está el foco`);
        console.log(`      escribir «w», «a», «s», «d» o un espacio en cualquier campo`);
        console.log(`      de la página movería al personaje y se comería la letra.`);
        fallos++;
    } else {
        console.log(`  ✓ ${f}: comprueba el foco antes de convertir una tecla en jugada`);
    }
}

/**
 * Y que quede alguno que revisar: si un día se renombran los ficheros o cambia la
 * forma de enganchar el teclado, esta prueba se quedaría en verde sin mirar nada
 * —que es la forma favorita de mentir de un instrumento en este proyecto—.
 */
if (!revisados.length) {
    console.log('  ✗ no se encontró NINGÚN manejador de teclas que revisar.');
    console.log('      O han cambiado de sitio, o esta prueba ya no mira donde debe.');
    fallos++;
}

console.log(fallos ? `\n✗ ${fallos} fallo(s)\n`
                   : `\n✓ los ${revisados.length} manejadores de teclas respetan a quien escribe\n`);
process.exit(fallos ? 1 : 0);
