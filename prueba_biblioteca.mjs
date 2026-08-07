/**
 * prueba_biblioteca.mjs — ¿de verdad cada juego de cartas lee el catálogo?
 * ═══════════════════════════════════════════════════════════════════════════
 * Los juegos de cartas sacan palos y rangos de `arcade/data/card_library.json`.
 * Como fuera del navegador esa ruta no siempre resuelve, todos aceptan un
 * `{ url }` para decirles dónde está — y eso es lo que usan `/api/gym`,
 * `/api/verificar`, `/api/dataset` y las mesas compartidas.
 *
 * POR QUÉ EXISTE ESTA PRUEBA
 * Cuatro de ellos —brisca, tute, hearts y spades— ACEPTABAN el parámetro y lo
 * tiraban a la basura: estaban escritos como `() => …`, una flecha sin
 * parámetros, así que JavaScript descartaba el argumento sin una palabra. En el
 * servidor caían al respaldo interno mientras el navegador usaba la biblioteca.
 *
 * Y no falló nunca, que es lo peor: el respaldo de `spanish_40` resulta ser
 * idéntico al del catálogo, así que las dos barajas coincidían por casualidad.
 * Un fallo que sólo aparece el día que alguien toque una carta del catálogo, y
 * que entonces se manifiesta como «tu partida es inválida» en la cara de un
 * desconocido.
 *
 * CÓMO SE COMPRUEBA
 * Se le pasa el catálogo REAL como `data:` URL. Un juego que honre el parámetro
 * lo lee y publica `biblioteca: true`. Uno que lo ignore intentará su ruta
 * relativa, que aquí es un `file://` que `fetch` no sirve, y acabará en el
 * respaldo — `biblioteca: false`. La distinción es exacta y no necesita red.
 */
import { readFile } from 'node:fs/promises';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';

const bruto = await readFile(
    new URL('./public/arcade/data/card_library.json', import.meta.url));
const URL_CATALOGO =
    'data:application/json;base64,' + Buffer.from(bruto).toString('base64');

/**
 * ⚠️ LA MARCA VIVE EN DOS SITIOS, Y HAY QUE MIRAR LOS DOS.
 * Los de bazas y los portados la ponen en el ESTADO; blackjack y póker, en el
 * objeto de REGLAS. La primera versión de esta prueba sólo miraba el estado, así
 * que saltó a esos dos en silencio y cantó «todos ✓» sin haberlos mirado —
 * exactamente el vicio que esta prueba existe para cazar.
 */
const marcaDe = (reglas, st) => st.biblioteca ?? reglas.biblioteca;

/** Los que no son de cartas no publican la marca, y no tienen por qué. */
const DE_CARTAS = [];
let fallos = 0;
console.log('\n¿Cada juego de cartas usa el catálogo que se le da?\n');

for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, { url: URL_CATALOGO });
    const st = reglas.estado(reglas.nuevaPartida({ semilla: 1, seed: 1 }));
    const marca = marcaDe(reglas, st);
    if (marca === undefined) continue;

    DE_CARTAS.push(juego);
    if (marca === true) {
        console.log(`  ✓ ${juego}`);
    } else {
        fallos++;
        console.log(`  ✗ ${juego} — ignora el \`url\` que se le pasa y cae al respaldo`);
    }
}

// Un juego de cartas que dejara de publicar la marca desaparecería de esta lista
// sin que nadie lo notara. Se cuenta, y el número tiene que cuadrar.
const ESPERADOS = 10;   // blackjack, poker, brisca, tute, hearts, spades,
                        // guerra, gofish, unit, entropy
if (DE_CARTAS.length !== ESPERADOS) {
    fallos++;
    console.log(`\n  ✗ se esperaban ${ESPERADOS} juegos de cartas y se han mirado ${DE_CARTAS.length}`
              + `\n    mirados: ${DE_CARTAS.join(', ')}`
              + `\n    (si has añadido o quitado uno, actualiza el número; si no, alguno`
              + `\n     ha dejado de publicar \`biblioteca\` y esta prueba ya no lo cubre)`);
}

console.log(fallos === 0
    ? `\n✓ los ${DE_CARTAS.length} leen el catálogo que se les indica\n`
    : `\n✗ ${fallos} fallo(s): en el servidor se jugaría con otra baraja que en el navegador\n`);
process.exit(fallos === 0 ? 0 : 1);
