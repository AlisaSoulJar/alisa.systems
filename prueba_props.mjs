/**
 * prueba_props.mjs — ¿se construyen de verdad los 234 props del catálogo?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_props.mjs
 *     → 0 todos · 1 alguno falla · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * `public/props/*.json` son dieciséis catálogos con **234 props y 754 piezas**,
 * cada una con medidas en metros y su material declarado por nombre. Es el
 * mobiliario del proyecto y llevaba escrito mucho antes que esta prueba.
 *
 * Lo leía UNA sola página, `generators/gen_semantic_props.html`. Y ahí estaba el
 * problema, porque su cadena de `if` cubre `box`, `cylinder` y `sphere` y **no
 * `wedge`**: la geometría se queda en `undefined` y la pieza desaparece sin un
 * error, sin un aviso y sin un hueco visible.
 *
 * Medido: **63 cuñas en 50 props**, uno de cada cinco. Los parabrisas de los
 * coches, las solapas de las cajas, las rampas. Dibujándose a medias desde
 * siempre, y nadie lo vio porque lo que falta en silencio no se echa de menos.
 *
 * QUÉ MIDE
 *
 * Construye TODAS las piezas de TODOS los props y comprueba, pieza a pieza:
 *
 *   1. que la forma se reconozca — una forma desconocida es una pieza que falta;
 *   2. que la geometría salga con vértices, no vacía;
 *   3. que ninguna coordenada sea `NaN` — un `size` mal leído no revienta,
 *      produce una malla invisible, que es peor;
 *   4. que su material se resuelva por rol, sin caer en el magenta de
 *      «rol desconocido».
 *
 * ⚠️ EL CONTROL POSITIVO. Un recorrido sobre cero props aprueba siempre. Se
 * exige un mínimo de props y de piezas, y además ver las CUATRO formas — porque
 * «ninguna forma desconocida» lo cumple también un catálogo del que sólo hayamos
 * sabido leer la mitad.
 *
 * SABOTAJE DECLARADO
 *   · se le quita el caso `wedge` a `geometriaDe` → vuelve el fallo de origen
 */
import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { geometriaDe } from './public/arcade/js/protohub/render/sitio.js';
import { aspectoDe, ROLES } from './public/arcade/js/protohub/render/aspecto.js';

const CATS = ['common', 'vehicles', 'corp', 'commercial', 'slum', 'military', 'urban',
              'rooftop', 'lab', 'industrial', 'recreation', 'utility', 'infrastructure',
              'docks', 'decor', 'signs'];

const MINIMO_PROPS = 150;   // hoy hay 234; si bajan de aquí, algo se perdió
const MINIMO_PIEZAS = 500;  // hoy hay 754

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const problemas = [];
const formasVistas = new Set(), rolesVistos = new Set();
let props = 0, piezas = 0, recetas = 0;

for (const c of CATS) {
    let j;
    try { j = JSON.parse(await readFile(`./public/props/${c}.json`, 'utf8')); }
    catch { problemas.push(`no pude leer ${c}.json`); continue; }

    for (const [nombre, receta] of Object.entries(j)) {
        if (nombre.startsWith('_')) continue;
        props++;
        const lista = Array.isArray(receta) ? receta : (receta.parts ?? receta.partes ?? []);
        if (!lista.length) { recetas++; continue; }

        for (const [i, parte] of lista.entries()) {
            piezas++;
            const donde = `${c}/${nombre}[${i}]`;
            formasVistas.add(parte.shape);

            const g = geometriaDe(THREE, parte);
            if (!g) { problemas.push(`${donde}: forma «${parte.shape}» sin geometría`); continue; }

            const pos = g.getAttribute?.('position');
            if (!pos || pos.count === 0) { problemas.push(`${donde}: geometría vacía`); continue; }
            for (let k = 0; k < pos.array.length; k++) {
                if (!Number.isFinite(pos.array[k])) {
                    problemas.push(`${donde}: coordenada no finita — size ${JSON.stringify(parte.size)}`);
                    break;
                }
            }

            const rol = `prop:${parte.type ?? 'base'}`;
            rolesVistos.add(rol);
            if (!ROLES[rol]) { problemas.push(`${donde}: rol «${rol}» no existe en el vocabulario`); continue; }
            const a = aspectoDe(rol);
            if (typeof a.color !== 'number') problemas.push(`${donde}: «${rol}» no da color`);
        }
    }
}

console.log(`\n¿Se construyen los props del catálogo?  (${CATS.length} catálogos)\n`);
console.log(`  ${props} props · ${piezas} piezas · ${recetas} que son receta y no lista`);
console.log(gris(`  formas: ${[...formasVistas].sort().join(', ')}`));
console.log(gris(`  roles:  ${[...rolesVistos].sort().join(', ')}\n`));

if (props < MINIMO_PROPS || piezas < MINIMO_PIEZAS) {
    console.log(rojo(`CONTROL POSITIVO FALLIDO: ${props} props y ${piezas} piezas, por debajo del mínimo `
        + `(${MINIMO_PROPS}/${MINIMO_PIEZAS}). Un recorrido corto aprueba sin haber mirado el catálogo.\n`));
    process.exit(2);
}
if (formasVistas.size < 4) {
    console.log(rojo(`CONTROL POSITIVO FALLIDO: sólo se vieron ${formasVistas.size} formas `
        + `(${[...formasVistas].join(', ')}). «Ninguna forma desconocida» lo cumple también quien `
        + `sólo sabe leer la mitad del catálogo.\n`));
    process.exit(2);
}

if (problemas.length) {
    for (const p of problemas.slice(0, 20)) console.log(`  ${rojo('✗')} ${p}`);
    if (problemas.length > 20) console.log(gris(`     … y ${problemas.length - 20} más`));
    console.log(rojo(`\n✗ ${problemas.length} piezas que no se construyen\n`));
    process.exit(1);
}

console.log(verde(`✓ las ${piezas} piezas de los ${props} props se construyen, con las 4 formas\n`));
