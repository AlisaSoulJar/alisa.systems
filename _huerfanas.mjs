/**
 * ¿QUÉ SE SACÓ DE LOS MONOLITOS Y NADIE VOLVIÓ A ENCHUFAR?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las cuatro luces de la casa —bombilla, tele, nevera, ventana— resultaron estar
 * en `VolumetricsPlugin.js`, sacadas del juego y convertidas en pieza del motor.
 * Oscar preguntó lo evidente: ¿cuántas más habrá así?
 *
 * La firma de una pieza extraída y olvidada es que **nadie la nombra fuera de su
 * propio fichero**. No prueba que esté rota —puede cargarse por ruta, o esperar
 * su momento— pero sí dice dónde mirar: son kilobytes escritos, probados en su
 * día dentro de un monolito, y hoy sin un solo llamador.
 *
 * Se cuenta por NOMBRE EXPORTADO, no por ruta de importación: hay piezas que se
 * cargan con `import()` dinámico o por cadena, y buscar sólo `from '…'` las daría
 * por muertas siendo mentira.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MOTOR = 'public/js/alisa-engine/src';
const SALTAR = /node_modules|[\\/]vendor[\\/]|_archivo|dist_publico|[\\/]dist[\\/]|\.git/;

async function* recorrer(dir) {
    let e;
    try { e = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
        const p = path.join(dir, x.name);
        if (SALTAR.test(p)) continue;
        if (x.isDirectory()) yield* recorrer(p);
        else if (/\.(js|mjs|html)$/.test(x.name)) yield p;
    }
}

// Todo el texto del sitio, una vez, para no releerlo por cada pieza.
const textos = new Map();
for await (const f of recorrer('public')) textos.set(f, await readFile(f, 'utf-8'));

const piezas = [...textos.keys()].filter((f) => f.includes(path.normalize(MOTOR))
    && /(System|Plugin|Factory|Engine|Core)\.js$/.test(f));

const huerfanas = [];
for (const f of piezas) {
    const nombre = path.basename(f, '.js');
    let fuera = 0, dentroDelMotor = 0;
    for (const [g, t] of textos) {
        if (g === f) continue;
        if (!t.includes(nombre)) continue;
        if (g.includes(path.normalize(MOTOR))) dentroDelMotor++;
        else fuera++;
    }
    const kb = Math.round(textos.get(f).length / 1024);
    if (fuera === 0) huerfanas.push({ nombre, kb, dentroDelMotor, f });
}

huerfanas.sort((a, b) => b.kb - a.kb);
const total = huerfanas.reduce((s, h) => s + h.kb, 0);

console.log(`\n  ${piezas.length} piezas del motor · ${huerfanas.length} sin un solo llamador fuera del motor`);
console.log(`  ${total} KB escritos que hoy no usa ninguna página\n`);
for (const h of huerfanas.slice(0, 25)) {
    console.log(`   ${String(h.kb).padStart(4)} KB  ${h.nombre.padEnd(34)}`
        + (h.dentroDelMotor ? `lo nombran ${h.dentroDelMotor} piezas del propio motor` : 'nadie lo nombra'));
}
if (huerfanas.length > 25) console.log(`   … y ${huerfanas.length - 25} más\n`);
