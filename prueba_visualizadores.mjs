/**
 * prueba_visualizadores.mjs — ¿dice `visualizadores.js` lo mismo que las páginas?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ EXISTE
 *
 * Con qué se dibuja cada juego vivía en SU página, dentro de la llamada a
 * `montarMesa({ juego, visualizador })`. Eso convierte «el ajedrez se dibuja con
 * chess_visualizer» en una propiedad de la página y no del juego, y funcionó
 * mientras cada juego se viera en un solo sitio. En cuanto apareció el segundo —la
 * sala de bolsillo— la sala no tenía forma de saberlo y dibujaba los diecisiete con
 * la mesa genérica: el ajedrez salía con discos y hexágonos teniendo sus piezas en
 * el mismo repositorio.
 *
 * `visualizadores.js` pone el dato donde pertenece. Pero ahora hay dos sitios que lo
 * dicen —el mapa y las páginas— y este proyecto lleva ocho listas paralelas que se
 * separaron en silencio. Ésta es la novena, y no se le va a permitir.
 *
 * QUÉ COMPRUEBA
 *   1. Todo lo que una página declara está en el mapa, con el mismo fichero.
 *   2. Todo lo que el mapa declara existe como fichero en `js/`.
 *   3. Todo lo que `SABE_SER_INVITADO` nombra está en el mapa. Decir que un juego
 *      sabe ser invitado sin decir con qué se dibuja no significa nada.
 *
 * NO comprueba que el mapa cubra todos los juegos, y es a propósito: la mayoría se
 * dibujan con `mesa_cartas` o `mesa_tablero`, que se eligen por lo que el juego
 * PUBLICA. Exigir una entrada por juego sería obligar a declarar lo deducible.
 *
 * SABOTAJE DECLARADO
 *   · se le cambia el visualizador a una página → debe salir en rojo por discrepar
 */
import { readFile, readdir } from 'node:fs/promises';

const RAIZ = new URL('./public/arcade/', import.meta.url);
const { VISUALIZADOR, SABE_SER_INVITADO } =
    await import('./public/arcade/js/visualizadores.js');

/** Las mesas genéricas no entran en el mapa: se eligen mirando el sustrato. */
const GENERICAS = new Set(['mesa_cartas.mjs', 'mesa_tablero.mjs']);

const paginas = (await readdir(RAIZ)).filter(f => f.endsWith('.html'));
const declarado = new Map();     // juego → fichero, según las páginas
for (const f of paginas) {
    const txt = await readFile(new URL(f, RAIZ), 'utf8');
    // Se lee la llamada entera aunque ocupe dos líneas: `blackjack.html` la parte.
    for (const m of txt.matchAll(/montarMesa\(\{([\s\S]{0,240}?)\}\)/g)) {
        const cuerpo = m[1];
        const juego = cuerpo.match(/juego\s*:\s*'([^']+)'/)?.[1];
        const vis = cuerpo.match(/visualizador\s*:\s*'([^']+)'/)?.[1];
        if (!juego || !vis || GENERICAS.has(vis)) continue;
        declarado.set(juego, { vis, pagina: f });
    }
}

const ficheros = new Set((await readdir(new URL('js/', RAIZ))));
let fallos = 0;
console.log('\n¿Dice el mapa lo mismo que las páginas?\n');

for (const [juego, { vis, pagina }] of declarado) {
    const enMapa = VISUALIZADOR[juego];
    if (!enMapa) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(11)} ${pagina} monta '${vis}' y el mapa no lo nombra`);
    } else if (enMapa !== vis) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(11)} ${pagina} monta '${vis}' y el mapa dice '${enMapa}'`);
    } else {
        console.log(`  ✓ ${juego.padEnd(11)} ${vis}`);
    }
}

for (const [juego, vis] of Object.entries(VISUALIZADOR)) {
    if (!ficheros.has(vis)) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(11)} el mapa nombra '${vis}', que no existe en js/`);
    }
}

for (const juego of SABE_SER_INVITADO) {
    if (!VISUALIZADOR[juego]) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(11)} dice saber ser invitado y no declara con qué dibuja`);
    }
}

/**
 * Y al revés: una página que declare un visualizador que el mapa no conoce ya lo
 * caza el primer bucle. Lo que queda fuera —un juego del mapa sin página propia— no
 * es un fallo: la sala de bolsillo es un sitio legítimo donde verlo.
 */
console.log(fallos === 0
    ? `\n✓ las ${declarado.size} páginas y el mapa dicen lo mismo\n`
    : `\n✗ ${fallos} discrepancia(s): sentarse a la mesa y abrir la página dibujarían distinto\n`);
process.exit(fallos === 0 ? 0 : 1);
