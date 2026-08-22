/**
 * Limpia el resto que dejó el renombrado: «Marabunta Swarm».
 *
 * `Cucco Swarm` aparecía a veces partido entre dos líneas de comentario —`Cucco`
 * al final de una y `Swarm,` al principio de la siguiente—, así que sustituir
 * `Cucco` dejó la palabra `Swarm` huérfana detrás del nombre nuevo. Es cosmético
 * y no rompe nada, pero «Marabunta Swarm» es medio nombre viejo pegado al nuevo,
 * que es justo lo que la doctrina de marcas llama un disfraz fino.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SALTAR = /node_modules|[\\/]vendor[\\/]|_archivo|dist_publico|\.git|renombrar_saga|temp_script|_limpiar_swarm/;
const EXT = /\.(js|mjs|html|md|json|py)$/;

async function* recorrer(dir, bajar = true) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
        const p = path.join(dir, e.name);
        if (SALTAR.test(p)) continue;
        if (e.isDirectory()) { if (bajar) yield* recorrer(p); continue; }
        if (EXT.test(e.name)) yield p;
    }
}

let n = 0;
for (const [raiz, bajar] of [['public', true], ['docs', true], ['.', false]]) {
    for await (const f of recorrer(raiz, bajar)) {
        const antes = await readFile(f, 'utf-8');
        const ahora = antes
            // El caso partido en dos líneas de comentario.
            .replace(/Marabunta(\s*\n\s*\*\s*)Swarm,/g, 'Marabunta,$1')
            .replace(/Marabunta Swarm/g, 'Marabunta')
            .replace(/MARABUNTA SWARM/g, 'MARABUNTA');
        if (ahora === antes) continue;
        await writeFile(f, ahora, 'utf-8');
        n++;
        console.log(`   ${f}`);
    }
}
console.log(`\n  ${n} ficheros limpiados\n`);
