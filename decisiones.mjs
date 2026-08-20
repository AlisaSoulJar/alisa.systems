/**
 * decisiones.mjs — EL ÍNDICE DE LO QUE YA DECIDIMOS
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run decisiones      escribe docs/decisiones.md
 *
 * ⚠️ POR QUÉ EXISTE, Y LA FRASE QUE LO PROVOCÓ.
 *
 * 20-08-2026, después de un día largo: «buena parte de hoy no ha sido descubrir, ha
 * sido leer lo que ya habíamos escrito». Y Oscar: «pues aprendamos de esto».
 *
 * El día tuvo tres casos, y los tres son el mismo:
 *
 *   · `tabla.mjs` tenía escrita la regla buena en un comentario —«el promedio largo
 *     sirve para decidir SI el juego puntúa; el corto, para el cuánto»— y el código,
 *     ciento cincuenta líneas más abajo, hacía lo contrario. Costó media tarde.
 *   · `remigio.js` tenía una nota del 14-08 que ya contestaba «¿el chinchón es una
 *     variante?» con el precio puesto. La volví a calcular.
 *   · `prueba_subasta.mjs` existía desde hacía días, pasaba, y no la corría nadie.
 *
 * ⚠️ Y EL PROBLEMA NO ES QUE NO ESTÉ ESCRITO: ES QUE NO HAY ÍNDICE.
 *
 * Medido antes de escribir esto: **879 bloques de decisión en 653 ficheros**. Eso es
 * una biblioteca sin catálogo. La pregunta «¿qué decidimos ya sobre las sillas?» hoy
 * se contesta con un `grep` afortunado o volviéndolo a decidir, y volver a decidirlo
 * sale más barato en el momento y carísimo a la semana — porque la segunda decisión
 * casi nunca coincide con la primera y entonces hay dos verdades.
 *
 * Así que esto no inventa documentación: RECOGE la que ya hay. Cada bloque `⚠️` con
 * título es una decisión que alguien se paró a justificar, y aquí salen todas juntas,
 * con su fichero y su línea, agrupadas por área.
 *
 * ⚠️ SE REGENERA CON EL PAQUETE, COMO EL ESCAPARATE Y LA PUERTA HTTP.
 *
 * Un índice que hay que acordarse de generar acaba sin generarse. Va en `empaquetar`,
 * que es donde ya están los otros tres generadores por el mismo motivo.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

/** Lo que no se mira: copias, dependencias y lo archivado, que ya no manda. */
const FUERA = /node_modules|dist_publico|[\\/]_archivo|[\\/]vendor|[\\/]dist[\\/]|capturas|\.git/;
const EXT = new Set(['.js', '.mjs', '.py', '.css', '.html']);

/**
 * De qué zona es cada fichero. El orden importa: gana la primera que coincida, así
 * que lo más específico va antes. Sin esto, ochocientas entradas seguidas no se leen.
 */
const AREAS = [
    [/rules[\\/]/,                'Reglas de los juegos'],
    [/protohub[\\/]render[\\/]/,  'Cómo se dibuja (el pintor)'],
    [/protohub[\\/]/,             'El ProtoHub y el sustrato'],
    [/gym[\\/]/,                  'El gym y los entornos'],
    [/agentes[\\/]/,              'Los agentes y las políticas'],
    [/arcade[\\/]js[\\/]/,        'Las mesas y los visualizadores'],
    [/arcade[\\/].*\.html$/,      'Las páginas de los juegos'],
    [/\.css$/,                    'Estilos'],
    [/^(prueba_|check_)/,         'Las comprobaciones'],
    [/alisa-engine/,              'El motor'],
    [/worker-mesas|functions/,    'El servidor y las salas'],
    [/\.mjs$|\.js$|\.py$/,        'Herramientas de medida'],
];
const areaDe = (rel) => (AREAS.find(([re]) => re.test(rel)) ?? [null, 'Otros'])[1];

async function* ficheros(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (FUERA.test(p)) continue;
        if (e.isDirectory()) yield* ficheros(p);
        else if (EXT.has(path.extname(e.name))) yield p;
    }
}

/**
 * ⚠️ QUÉ CUENTA COMO DECISIÓN Y QUÉ NO.
 *
 * Sólo los bloques con TÍTULO —`⚠️` seguido de texto que empieza en mayúscula y tiene
 * cuerpo—. Un `// ⚠️ ojo con esto` de media línea es un recordatorio, no una decisión
 * justificada, y meterlo aquí ahogaría las que sí lo son. De 1.333 marcas salen unas
 * 879 con título, que es la proporción que uno espera: la mayoría de las veces que
 * escribimos ⚠️ es porque nos paramos a explicar algo.
 */
function decisionesDe(texto) {
    const lineas = texto.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lineas.length; i++) {
        const m = /⚠️\s*(.+)$/.exec(lineas[i]);
        if (!m) continue;
        let titulo = m[1].trim()
            .replace(/^\*+\s*/, '')
            .replace(/[\s*]+$/, '')
            .replace(/^[«"']|["'»]$/g, '');
        // Un título es una frase corta que empieza fuerte. Lo que no lo parezca se
        // cuenta como nota suelta y no entra: ver la nota de arriba.
        if (!/^[A-ZÁÉÍÓÚÑ¿¡«0-9`]/.test(titulo)) continue;

        /**
         * ⚠️ EL TÍTULO SE CORTA EN LA PRIMERA FRASE.
         *
         * La primera versión se llevaba la línea entera, y cuando el título y el cuerpo
         * comparten renglón salían entradas como «Y JUEGA LEYENDO EL SUSTRATO, NO EL
         * ESTADO. Esa línea de más arriba» — mitad titular, mitad frase cortada. Un
         * índice cuyas entradas están a medias no se puede leer en diagonal, que es
         * justo para lo que existe.
         */
        const punto = titulo.search(/\.\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]/);
        if (punto > 12) titulo = titulo.slice(0, punto + 1);
        if (titulo.length < 8 || titulo.length > 120) continue;

        // El cuerpo: las siguientes líneas de comentario hasta el primer hueco, para
        // que el índice diga de qué va sin tener que abrir el fichero.
        const cuerpo = [];
        for (let k = i + 1; k < lineas.length && cuerpo.length < 3; k++) {
            const l = lineas[k].replace(/^\s*(\*|\/\/|#)\s?/, '').trim();
            if (!l || /^[═─=-]{3,}$/.test(l)) { if (cuerpo.length) break; else continue; }
            if (/⚠️/.test(l)) break;
            if (/^\s*\*\//.test(lineas[k])) break;
            cuerpo.push(l);
        }
        out.push({ linea: i + 1, titulo, cuerpo: cuerpo.join(' ').slice(0, 260) });
    }
    return out;
}

const porArea = new Map();
let total = 0, conCuerpo = 0, ficherosConAlgo = 0;

for await (const f of ficheros(AQUI)) {
    let texto;
    try { texto = await readFile(f, 'utf-8'); } catch { continue; }
    if (!texto.includes('⚠️')) continue;
    const ds = decisionesDe(texto);
    if (!ds.length) continue;
    ficherosConAlgo++;
    const rel = path.relative(AQUI, f).replace(/\\/g, '/');
    const area = areaDe(rel);
    if (!porArea.has(area)) porArea.set(area, []);
    porArea.get(area).push({ rel, ds });
    total += ds.length;
    conCuerpo += ds.filter(d => d.cuerpo).length;
}

// ── El documento ───────────────────────────────────────────────────────────
const hoy = new Date().toISOString().slice(0, 10);
const lineas = [];
lineas.push('# Lo que ya decidimos');
lineas.push('');
lineas.push(`> Generado por \`npm run decisiones\` el ${hoy}. **No se escribe a mano.**`);
lineas.push('> Recoge los bloques `⚠️` con título que hay repartidos por el código: cada uno');
lineas.push('> es una decisión que alguien se paró a justificar donde vive.');
lineas.push('');
lineas.push('## Para qué es esto');
lineas.push('');
lineas.push('Antes de decidir algo, mira si ya está decidido. El 20-08-2026 perdimos media');
lineas.push('tarde re-derivando una regla que estaba escrita en un comentario de `tabla.mjs`');
lineas.push('—«el promedio largo sirve para decidir SI el juego puntúa; el corto, para el');
lineas.push('cuánto»— mientras el código, ciento cincuenta líneas más abajo, hacía lo');
lineas.push('contrario. El problema no era que no estuviera escrito: era que no había índice.');
lineas.push('');
lineas.push('Volver a decidir sale barato en el momento y carísimo a la semana, porque la');
lineas.push('segunda decisión casi nunca coincide con la primera y entonces hay dos verdades.');
lineas.push('');
lineas.push(`**${total} decisiones** en ${ficherosConAlgo} ficheros.`);
lineas.push('');

const areas = [...porArea.entries()].sort((a, b) =>
    b[1].reduce((n, x) => n + x.ds.length, 0) - a[1].reduce((n, x) => n + x.ds.length, 0));

lineas.push('## Índice');
lineas.push('');
for (const [area, fs] of areas) {
    const n = fs.reduce((k, x) => k + x.ds.length, 0);
    lineas.push(`- [${area}](#${area.toLowerCase().replace(/[^a-záéíóúñ0-9]+/g, '-')}) — ${n}`);
}
lineas.push('');

for (const [area, fs] of areas) {
    lineas.push(`## ${area}`);
    lineas.push('');
    for (const { rel, ds } of fs.sort((a, b) => a.rel.localeCompare(b.rel))) {
        lineas.push(`### \`${rel}\``);
        lineas.push('');
        for (const d of ds) {
            lineas.push(`- **${d.titulo}** <sub>línea ${d.linea}</sub>`);
            if (d.cuerpo) lineas.push(`  <br><sub>${d.cuerpo}</sub>`);
        }
        lineas.push('');
    }
}

await writeFile(path.join(AQUI, 'docs/decisiones.md'), lineas.join('\n'), 'utf-8');

console.log(`\n  ${verde('✓')} ${total} decisiones de ${ficherosConAlgo} ficheros`
          + gris(` · ${conCuerpo} con explicación`));
for (const [area, fs] of areas.slice(0, 6)) {
    const n = fs.reduce((k, x) => k + x.ds.length, 0);
    console.log(gris(`      ${String(n).padStart(4)}  ${area}`));
}
console.log(`  → docs/decisiones.md\n`);
