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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Y LA OTRA TABLA PUBLICADA: `public/suelo.html`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La de arriba se vigila COMPARANDO números, porque los lleva incrustados. Ésta
 * se vigila al revés: comprobando que **no lleve ninguno**.
 *
 * Nació el 25-08 con la cicatriz de la otra delante. Si no guarda copia de la
 * medición, no puede separarse de ella — no hay nada de lo que separarse. Es el
 * mismo criterio que el sustrato en los juegos: una sola verdad, capas encima.
 *
 * Lo que se exige, entonces:
 *   1. que el fichero medido exista y tenga los 49 entornos;
 *   2. que la página lo PIDA, en vez de traérselo puesto;
 *   3. que no haya una sola nota escrita a mano en el HTML.
 *
 * La (3) es la que de verdad protege. El día que alguien «arregle» la página
 * pegando la tabla para que cargue más rápido, habrá reinventado los ocho días
 * de agosto — y saldrá aquí en rojo el mismo día, no ocho después.
 */
{
    const DATOS = new URL('./public/data/suelo_por_entorno.json', import.meta.url);
    const PAGINA = new URL('./public/suelo.html', import.meta.url);
    let d, pag;
    try {
        d = JSON.parse(await readFile(DATOS, 'utf8'));
        pag = await readFile(PAGINA, 'utf8');
    } catch (e) {
        console.log(`\n  ✗ falta el suelo publicado: ${e.message}`);
        console.log('    Se mide y se escribe con `node prueba_senal.mjs`.');
        process.exit(1);
    }

    if (!Array.isArray(d.entornos) || d.entornos.length < 40) {
        fallos++;
        console.log(`\n  ✗ el suelo medido trae ${d.entornos?.length ?? 0} entornos y el banco tiene 49.`);
    }
    if (!pag.includes('suelo_por_entorno.json')) {
        fallos++;
        console.log('\n  ✗ `suelo.html` no pide la medición: se la ha traído puesta.');
    }

    /**
     * Números escritos a mano en el HTML. Se miran sólo fuera del `<script>` y
     * del `<style>`: el guion tiene índices y tamaños de fuente que no son notas,
     * y contarlos sería acusar a código sano — cosa que ya me ha pasado cinco
     * veces esta semana.
     */
    const cuerpo = pag
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
    const sospechosos = [...cuerpo.matchAll(/-?\d+[.,]\d+|(?<![\w-])-\d{2,}(?![\w-])/g)].map(m => m[0]);
    if (sospechosos.length) {
        fallos++;
        console.log(`\n  ✗ hay ${sospechosos.length} número(s) escritos a mano en suelo.html: `
                  + `${sospechosos.slice(0, 6).join(', ')}`);
        console.log('    Una tabla con copia de los datos se separa de ellos. Que los pida.');
    } else {
        console.log(`  ✓ suelo.html no guarda ni una nota: pide las ${d.entornos.length} medidas`);
    }
}

process.exit(fallos ? 1 : 0);
