/**
 * renombrar_saga.mjs — saca las marcas ajenas de la saga y de los dos sueltos
 * ═══════════════════════════════════════════════════════════════════════════
 *     node renombrar_saga.mjs           # dice qué haría, no toca nada
 *     node renombrar_saga.mjs --hazlo   # lo hace
 *
 * Los seis entornos con física propia nunca pasaron por el filtro de marcas que
 * el arcade sí pasó en su día (`_archivo/scripts_de_trabajo/arcade/
 * renombrar_marcas.py`, que sacó balatro, mtg, pac-man, frogger y pokémon). Y
 * ahora van a entrar en la tabla, o sea que sus identificadores se publican.
 *
 * ⚠️ LA DOCTRINA ES LA DE ENTONCES Y SE REPITE AQUÍ PORQUE FUNCIONA.
 *
 * «Un disfraz fino ("Pak-Man") es PEOR que no cambiar nada: sigue siendo
 * infracción por similitud confusa, y encima demuestra que sabías lo que
 * hacías.» Se nombra por la MECÁNICA y el arquetipo, que no se registran.
 *
 * ⚠️ Y SE DISTINGUE LA MARCA DE LA PALABRA, QUE ES LO QUE HACE ESTO BARATO.
 *
 * «Asteroids» aparece 286 veces, y 195 son nombres internos como
 * `AsteroidsSystem`. **«Asteroide» es una palabra común para una piedra en el
 * espacio y no la posee nadie**; lo que Atari tiene registrado es el TÍTULO de un
 * videojuego. Así que la física se queda como está y cambia lo que se publica:
 * seis sitios, no doscientos ochenta y seis.
 *
 * «Cucco», en cambio, es una palabra INVENTADA por Nintendo. Ésa va entera.
 * Y «Rue del Percebe» es el título de Ibáñez: esa etapa pasa a llamarse por lo
 * que es dentro de la saga, el edificio corporativo.
 */
import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const HAZLO = process.argv.includes('--hazlo');
/**
 * ⚠️ LA RAÍZ TAMBIÉN, Y LA PRIMERA VERSIÓN SE LA DEJÓ.
 *
 * Empecé con `['public', 'docs']` porque ahí está el sitio. Pero las
 * comprobaciones viven en la RAÍZ, y una de ellas —`prueba_semillas.mjs`— lleva
 * una lista de entornos declarados: `INERTES = ['alisa/RueDelPercebe-v0']`. Al
 * renombrar el entorno y no la lista, la prueba empezó a denunciar a
 * `alisa/CorpBuilding-v0` por «ignorar la semilla sin estar declarado».
 *
 * O sea que el script escrito para no dejarme ninguna se dejó una, por mirar
 * donde yo creía que estaba el código en vez de donde está. Lo cazó la batería,
 * que para eso está.
 */
const RAIZ = ['public', 'docs', '.'];
const EXT = new Set(['.js', '.mjs', '.html', '.json', '.md', '.py']);
const SALTAR = /node_modules|[\\/]vendor[\\/]|_archivo|dist_publico|\.git/;
/**
 * ⚠️ Y DOS QUE NO SE TOCAN, POR MOTIVOS DISTINTOS.
 *
 * `renombrar_saga.mjs` es este fichero: contiene los nombres viejos **a
 * propósito**, porque son el mapa. Reescribirlo lo dejaría diciendo
 * `['Marabunta','Marabunta']` y perdería la memoria de qué se cambió.
 *
 * `atlas.json` es un índice GENERADO de todo el proyecto, con rutas absolutas de
 * carpetas que ni siquiera están aquí. Se regenera, no se parchea.
 */
const INTOCABLES = /renombrar_saga\.mjs|atlas\.json|temp_script\.js/;

/**
 * Lo que se cambia DENTRO de los ficheros. El orden importa: lo más largo
 * primero, o `Cucco` se comería a `CuccoSwarm` y quedaría `MarabuntaSwarm`.
 */
const TEXTO = [
    // ── Nintendo: «Cucco» es palabra inventada, va entera ──────────────────
    ['CuccoSwarmEnv', 'MarabuntaEnv'],
    ['CuccoEnvironmentFactory', 'MarabuntaEnvironmentFactory'],
    ['CuccoGameSystem', 'MarabuntaSystem'],
    ['CuccoSwarm', 'Marabunta'],
    ['cucco_swarm', 'marabunta'],
    ['Cucco Swarm', 'Marabunta'],
    ['CUCCO SWARM', 'MARABUNTA'],
    ['Cucco', 'Marabunta'],
    ['cucco', 'marabunta'],
    ['CUCCO', 'MARABUNTA'],

    // ── Ibáñez: la etapa se llama por lo que es en la saga ─────────────────
    ['RueDelPercebeEnv', 'CorpBuildingEnv'],
    ['RueDelPercebe', 'CorpBuilding'],
    ['rue_del_percebe', 'corp_building'],
    ['Rue del Percebe', 'Corp Building'],
    ['RUE DEL PERCEBE', 'CORP BUILDING'],
    ['13 Rue del Percebe', 'el edificio corporativo'],

    // ── Capcom: sólo la cadena literal, no el mapache ──────────────────────
    ['Raccoon City Sector', 'City Sector'],
    ['Raccoon City', 'City Sector'],

    // ── Atari: SÓLO el título y el identificador, nunca la física ──────────
    ["alisa/Asteroids-v0", 'alisa/Pedrisco-v0'],
    ["titulo: 'Asteroids'", "titulo: 'Pedrisco'"],
    ['<title>ALISA — Asteroids', '<title>ALISA — Pedrisco'],
];

/** Y los nombres de fichero. La física de asteroides NO se renombra. */
const FICHEROS = [
    ['CuccoSwarmEnv.js', 'MarabuntaEnv.js'],
    ['CuccoEnvironmentFactory.js', 'MarabuntaEnvironmentFactory.js'],
    ['CuccoGameSystem.js', 'MarabuntaSystem.js'],
    ['play_cucco_headless.mjs', 'play_marabunta_headless.mjs'],
    ['croupier_cucco_swarm.html', 'croupier_marabunta.html'],
    ['cucco_swarm_phase5.md', 'marabunta_phase5.md'],
    ['RueDelPercebeEnv.js', 'CorpBuildingEnv.js'],
    ['rue_del_percebe.html', 'corp_building.html'],
    ['croupier_rue_del_percebe.html', 'croupier_corp_building.html'],
    ['croupier_rue_del_percebe_3d.html', 'croupier_corp_building_3d.html'],
];

async function* recorrer(dir) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
        const p = path.join(dir, e.name);
        if (SALTAR.test(p) || INTOCABLES.test(p)) continue;
        // La raíz se recorre SIN bajar: sus subcarpetas ya van por su cuenta, y
        // bajando se pasaría dos veces por `public/` y `docs/`.
        if (e.isDirectory()) { if (dir !== '.') yield* recorrer(p); continue; }
        if (EXT.has(path.extname(e.name))) yield p;
    }
}

const tocados = [];
let cambios = 0;
for (const raiz of RAIZ) {
    for await (const f of recorrer(raiz)) {
        const antes = await readFile(f, 'utf-8');
        let ahora = antes;
        for (const [de, a] of TEXTO) ahora = ahora.split(de).join(a);
        if (ahora === antes) continue;
        const n = antes.length - ahora.length;
        cambios++;
        tocados.push(f);
        if (HAZLO) await writeFile(f, ahora, 'utf-8');
        void n;
    }
}

const renombrados = [];
for (const raiz of RAIZ) {
    for await (const f of recorrer(raiz)) {
        const base = path.basename(f);
        const par = FICHEROS.find(([de]) => de === base);
        if (!par) continue;
        const destino = path.join(path.dirname(f), par[1]);
        renombrados.push(`${base} → ${par[1]}`);
        if (HAZLO) { try { await stat(destino); } catch { await rename(f, destino); } }
    }
}

console.log(`\n${HAZLO ? 'HECHO' : 'ENSAYO (nada tocado — usa --hazlo)'}\n`);
console.log(`  ${cambios} ficheros con texto cambiado`);
console.log(`  ${renombrados.length} ficheros renombrados`);
renombrados.forEach((r) => console.log(`    ${r}`));
console.log(`\n  ⚠️ Después hay que correr: node gen_paginas.mjs && npm test`);
console.log('     y mirar que ningún import se haya quedado apuntando a un nombre viejo.\n');
