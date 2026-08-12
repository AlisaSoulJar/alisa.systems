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

/**
 * Un juego de cartas que dejara de publicar la marca desaparecería de esta lista
 * sin que nadie lo notara, así que hay que comprobar que están TODOS.
 *
 * ⚠️ AQUÍ HABÍA UN `ESPERADOS = 10` ESCRITO A MANO, con los diez nombres en un
 * comentario al lado. Cumplía su función y traía la de siempre: al añadir el
 * remigio la prueba se puso roja diciendo «se esperaban 10 y se han mirado 11»,
 * o sea acusando al juego nuevo de un fallo que no existía. Una prueba que hay
 * que actualizar a mano acaba actualizándose sin mirar, que es cuando deja de
 * proteger.
 *
 * Y no hacía falta ningún número: la definición de «juego de cartas» YA existe y
 * se usa en tres sitios —`montarMesa`, `sala.html` y la Sala del Huevo— para
 * decidir qué motor monta cada mesa. Es **zonas y ninguna rejilla**. Preguntarle
 * eso al propio juego cubre las dos direcciones a la vez: uno que deje de
 * publicar la marca sale como ausente, y uno nuevo entra solo.
 */
/**
 * ⚠️ «ZONAS Y NINGUNA REJILLA» NO ES «ES DE CARTAS», Y AQUÍ SE VIO.
 *
 * Ésa era la definición que usaba esto —la misma que usa `montarMesa` para elegir
 * motor— y sirvió hasta que llegó la GENERALA: cinco dados, ningún tablero, o sea
 * zonas sin rejilla. La prueba la acusó de no publicar `biblioteca` y de estar
 * jugando con otra baraja que el navegador. La generala no tiene baraja.
 *
 * Es la misma sobreaproximación que Fable encontró esta mañana en la guarda
 * `ambiguos` de `prueba_sustrato.mjs`, cometida por mí en otro fichero el mismo
 * día. Y el arreglo es el suyo: un juego es de cartas si sus items SON CARTAS DE
 * LA BIBLIOTECA. Se comprueba contra el catálogo de verdad, no contra una lista:
 * `S_A` está en la francesa, `d6_5` no está en ninguna.
 */
const { obtenerSustrato } = await import('./public/arcade/js/protohub/sustrato.js');
const catalogo = JSON.parse(bruto.toString('utf-8'));
const idDe = (x) => (typeof x === 'string' ? x : x?.id ?? x?.rank);
const TODAS = new Set();
for (const d of Object.values(catalogo.decks ?? {})) {
    for (const s of (d.suits ?? [])) {
        for (const r of (d.ranks ?? [])) TODAS.add(`${idDe(s)}_${idDe(r)}`);
    }
}
const CON_CARTAS = [];
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, { url: URL_CATALOGO });
    const q = reglas.nuevaPartida({ semilla: 1, seed: 1 });
    const sus = reglas.sustrato ? reglas.sustrato(q, 0)
                                : obtenerSustrato(juego, reglas, q, reglas.estado(q));
    const items = (sus?.zonas ?? []).flatMap(z => (z.items ?? []).map(idDe));
    if (items.some(c => TODAS.has(String(c)))) CON_CARTAS.push(juego);
}
const mudos = CON_CARTAS.filter(j => !DE_CARTAS.includes(j));
if (mudos.length) {
    fallos++;
    console.log(`\n  ✗ reparten cartas y NO publican \`biblioteca\`: ${mudos.join(', ')}`
              + `\n    esta prueba no los cubre, así que podrían estar jugando con otra baraja`
              + `\n    en el servidor que en el navegador sin que nadie se enterara`);
}

console.log(fallos === 0
    ? `\n✓ los ${DE_CARTAS.length} leen el catálogo que se les indica\n`
    : `\n✗ ${fallos} fallo(s): en el servidor se jugaría con otra baraja que en el navegador\n`);
process.exit(fallos === 0 ? 0 : 1);
