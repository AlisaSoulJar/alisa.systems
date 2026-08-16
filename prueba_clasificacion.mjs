/**
 * prueba_clasificacion.mjs — ¿la clasificación PUBLICADA es la que se midió?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tabla.mjs` escribe `resultados/tabla.json` SIEMPRE y `public/clasificacion.html`
 * sólo si le pasas `--html`. O sea que basta con correr la tabla una vez sin esa
 * bandera para que el número medido y el número publicado dejen de ser el mismo, sin
 * que nada avise.
 *
 * Y pasó: el 16-08 la página llevaba desde el **8 de agosto** y el JSON era del 13.
 * Ocho días publicando una clasificación que no correspondía a ninguna medida
 * guardada — con los números incrustados en el HTML, así que tampoco podía
 * corregirse sola. La página decía `azar 0.14`; el JSON, `0.686`.
 *
 * Eso es justo lo que este proyecto lleva semanas quitando de en medio: una tabla de
 * resultados que se separa de la realidad en silencio. Y en un banco de pruebas cuyo
 * argumento entero es «los números se recalculan, no se declaran», publicar una
 * clasificación que nadie puede reproducir es el peor sitio donde tenerlo.
 *
 * ⚠️ NO COMPRUEBA QUE LOS NÚMEROS SEAN BUENOS, sino que sean LOS MISMOS.
 * Si la medición está mal, esto sale verde igual — para eso están el calibrador y las
 * líneas base. Lo único que vigila es que lo publicado y lo medido no se separen.
 */
import { readFile } from 'node:fs/promises';

const HTML = new URL('./public/clasificacion.html', import.meta.url);
const JSON_ = new URL('./resultados/tabla.json', import.meta.url);

let html, datos;
try { html = await readFile(HTML, 'utf-8'); }
catch { console.log('\n  ✗ no hay `public/clasificacion.html`.'); process.exit(1); }
try { datos = JSON.parse(await readFile(JSON_, 'utf-8')); }
catch { console.log('\n  ✗ no hay `resultados/tabla.json`.'); process.exit(1); }

console.log('\n¿La clasificación publicada es la que se midió?\n');

const resumen = datos.resumen ?? [];
if (!resumen.length) {
    console.log('  ✗ el JSON no trae participantes: no hay nada que comparar.');
    process.exit(1);
}

/**
 * Se busca cada participante por su nombre en el HTML y se lee la mediana que hay a
 * su lado. El formato lo escribe `tabla.mjs`:
 *     <tr><th>azar</th><td class="n"><b>0.14</b></td>…
 * Con `escapar()` porque los nombres llevan paréntesis —«casa (techo blando)»— y sin
 * escapar serían un grupo de la expresión regular en vez de texto literal.
 */
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let fallos = 0;
for (const r of resumen) {
    const m = html.match(new RegExp(
        `<th>${escapar(r.participante)}</th><td class="n"><b>([-\\d.]+)</b>`));
    const medido = r.mediana.toFixed(2);
    if (!m) {
        fallos++;
        console.log(`  ✗ «${r.participante}» está medido (${medido}) y NO aparece en la página.`);
        continue;
    }
    if (m[1] !== medido) {
        fallos++;
        console.log(`  ✗ «${r.participante}»: la página dice ${m[1]} y lo medido es ${medido}.`);
    } else {
        console.log(`  ✓ ${r.participante.padEnd(22)} ${medido}`);
    }
}

/** Y al revés: un participante publicado que ya no se mide es igual de falso. */
for (const [, nombre] of html.matchAll(/<tr><th>([^<]+)<\/th><td class="n"><b>/g)) {
    if (!resumen.some(r => r.participante === nombre)) {
        fallos++;
        console.log(`  ✗ «${nombre}» aparece en la página y NO está en la medición.`);
    }
}

if (fallos) {
    console.log(`\n  ${fallos} desajuste(s). La página se regenera midiendo:`);
    console.log('      node --import ./resolver_three.mjs tabla.mjs --html public/clasificacion.html …');
    console.log('  con los MISMOS argumentos con los que se hizo la medida buena.');
} else {
    console.log(`\n  ✓ los ${resumen.length} participantes publicados son los medidos.`);
}
process.exit(fallos ? 1 : 0);
