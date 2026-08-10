/**
 * comprobar_cache.mjs — que un despliegue llegue ENTERO al dominio publicado
 * ═══════════════════════════════════════════════════════════════════════════
 *     node comprobar_cache.mjs [--sitio https://alisa.systems]
 *
 * ⚠️ QUÉ PROBLEMA VIGILA, QUE COSTÓ MEDIA TARDE ENTENDER
 *
 * Cloudflare guarda en el navegador los `.js` durante CUATRO HORAS y los `.mjs`,
 * `.html` y `.json` durante cero. Con esa mezcla, un despliegue no llega tarde:
 * llega A MEDIAS. Quien ya hubiera entrado se lleva el HTML nuevo y los módulos
 * `.mjs` nuevos **ejecutándose contra el código viejo en `.js`**.
 *
 * Eso no es una versión antigua, que sería recuperable: es una combinación que
 * nunca existió en el repositorio. Y NO DA ERROR. Se vio así — la mesa de cartas
 * nueva pidiendo `casillas` a un `sustrato.js` viejo que no las publica: se caía
 * al camino de antes y dibujaba bien… otra cosa. Las cartas en abanico donde
 * tenía que haber una rejilla, sin una línea en la consola.
 *
 * ⚠️ Y POR QUÉ NO SE ARREGLA DESDE EL REPOSITORIO
 *
 * `public/_headers` pide `max-age=0` y Cloudflare Pages lo respeta: en la
 * dirección del despliegue (`*.pages.dev`) las cabeceras salen bien, con su marca
 * `X-Alisa-Cabeceras` incluida. En el dominio publicado se pierden las dos cosas.
 *
 * O sea que quien sobrescribe no es Pages: es el **Browser Cache TTL de la zona**
 * del dominio, que vive en el panel de Cloudflare. 14400 segundos son cuatro
 * horas exactas, que es uno de sus valores de lista.
 *
 * Se arregla ahí, en un sitio donde el repositorio no puede contradecirlo — el
 * mismo problema que documenta `wrangler.toml`, con otra cara:
 *
 *     dash.cloudflare.com → alisa.systems → Caching → Configuration
 *     Browser Cache TTL: «Respect Existing Headers»
 *
 * Esto no lo arregla. Lo COMPRUEBA, que es lo único que se puede hacer desde
 * aquí: si alguien lo cambia, o si al mover el dominio se pierde, sale en rojo en
 * vez de descubrirse dentro de tres meses depurando un fallo imposible.
 */
const arg = (n, d) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : d;
};
const SITIO = arg('sitio', 'https://alisa.systems').replace(/\/$/, '');

/** Lo que se mira: un fichero de cada clase que el navegador guarda distinto. */
const MUESTRAS = [
    '/arcade/js/montarMesa.js',              // el andamio de toda página de juego
    '/arcade/js/protohub/sustrato.js',       // el que causó el fallo real
    '/arcade/js/mesa_cartas.mjs',            // módulo: éste ya iba bien
    '/arcade/data/card_library.json',        // los datos que el código lee
];

/** Cuántos segundos son demasiados para código que cambia con cada despliegue. */
const TOPE = 300;

console.log(`\n¿Un despliegue llega entero a ${SITIO}?\n`);

let fallos = 0;
const filas = [];
for (const ruta of MUESTRAS) {
    let r;
    try {
        r = await fetch(SITIO + ruta, { cache: 'no-store' });
    } catch (e) {
        fallos++;
        console.log(`  ✗ ${ruta} — no responde: ${e.message}`);
        continue;
    }
    const cc = r.headers.get('cache-control') ?? '';
    const marca = r.headers.get('x-alisa-cabeceras');
    const edad = Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 0);
    const bien = edad <= TOPE;
    if (!bien) fallos++;
    filas.push({ ruta, edad, marca, bien });
    console.log(`  ${bien ? '✓' : '✗'} ${ruta.padEnd(38)} max-age=${String(edad).padStart(5)}`
        + (marca ? '  · cabeceras propias' : ''));
}

/**
 * ⚠️ Y LO QUE DE VERDAD DELATA EL PROBLEMA: que unos ficheros se guarden más que
 * otros. Una caché larga PAREJA sería lenta pero honesta — todo el mundo vería la
 * misma versión, la de antes. Lo que rompe es la mezcla, porque produce una
 * combinación de ficheros que nunca existió.
 */
const edades = [...new Set(filas.map(f => f.edad))];
if (edades.length > 1) {
    fallos++;
    console.log(`\n  ✗ NO TODOS SE GUARDAN IGUAL: ${edades.join(' y ')} segundos.`);
    console.log('    Un despliegue llegará A MEDIAS — código nuevo contra código viejo,');
    console.log('    una combinación que nunca existió en el repositorio, y sin dar error.');
}

if (fallos) {
    console.log(`\n  Se arregla en el panel, no aquí (\`public/_headers\` ya pide max-age=0 y`);
    console.log(`  Pages lo respeta en *.pages.dev — lo sobrescribe la zona del dominio):`);
    console.log(`\n      dash.cloudflare.com → alisa.systems → Caching → Configuration`);
    console.log(`      Browser Cache TTL: «Respect Existing Headers»\n`);
} else {
    console.log(`\n✓ el dominio respeta las cabeceras del origen: un despliegue llega entero\n`);
}
process.exit(fallos === 0 ? 0 : 1);
