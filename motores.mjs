/**
 * motores.mjs — ¿QUÉ MOTORES ESTÁN MONTADOS EN UN JUEGO, Y CUÁLES DUERMEN?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run motores
 *
 * Nace de una pregunta de Oscar que se hace sola cada vez que se planea una saga:
 * *«¿tenemos más motores de juego en potencia que no estamos usando?»*. Hasta
 * hoy se contestaba de memoria, y de memoria salían cosas que no eran.
 *
 * Cada motor se clasifica por quién lo IMPORTA:
 *
 *     EN EL BANCO           un entorno de gym lo usa → se puede medir
 *     jugable, sin medir    una página lo monta → una persona puede jugarlo
 *     medio: runner suelto  sólo un `gym_runner` sin cabeza, sin página ni entorno
 *     DORMIDO               nadie lo importa en ninguna parte
 *
 * Medido el 24-08: **doce motores dormidos (117 KB)** y **nueve más con sólo un
 * runner suelto (106 KB)**. Más de 200 KB de motor que ninguna página monta.
 *
 * ⚠️ Y LA PRIMERA VERSIÓN CONTABA MENCIONES, NO IMPORTS.
 *
 * Buscaba el nombre a secas, así que un motor citado en un comentario salía como
 * usado. `RaccoonCitySystem` aparecía «en el banco» porque yo lo había nombrado
 * esa misma tarde en una nota dentro de `RaccoonSpaceEnv.js`. Al apretar a
 * imports la respuesta cambió de verdad: `BulletHeavenEngine` pasó de parecer
 * medio montado a estar dormido del todo, y los motores dormidos subieron de
 * ocho a doce.
 *
 * Un inventario que cuenta lo que se menciona en vez de lo que se ejecuta dice
 * que hay más hecho de lo que hay, que es la mentira más cara de todas.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = process.cwd();
const dirSistemas = path.join(RAIZ, 'public/js/alisa-engine/src/world/systems');

// Todo el texto donde alguien podría usarlos.
async function ficheros(dir, acc = []) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (/node_modules|dist_publico|^dist$|_archivo/.test(e.name)) continue;
            await ficheros(p, acc);
        } else if (/\.(html|js|mjs)$/.test(e.name)) acc.push(p);
    }
    return acc;
}

const todos = await ficheros(path.join(RAIZ, 'public'));
const textos = new Map();
for (const f of todos) textos.set(f, await readFile(f, 'utf-8'));

const { CATALOGO } = await import('./public/js/alisa-engine/src/gym/registro.js');
const enBanco = new Set();
for (const e of CATALOGO) {
    if (e.familia !== 'propio') continue;
    const f = path.join(RAIZ, 'public/js/alisa-engine/src/gym/envs', e.fichero ?? '');
    if (textos.has(f)) enBanco.add(textos.get(f));
}

const sistemas = (await readdir(dirSistemas)).filter(f => f.endsWith('.js'));
const filas = [];
for (const fichero of sistemas) {
    const nombre = fichero.replace('.js', '');
    // ⚠️ Sólo IMPORTS. Contar el nombre a secas cuenta las menciones en
    // comentarios: RaccoonCitySystem salía «en el banco» porque yo lo nombré
    // hoy en una nota dentro de RaccoonSpaceEnv.js.
    const re = new RegExp(`import[^;]*['"\`][^'"\`]*${nombre}\\.js['"\`]`);
    let paginas = 0, runners = 0, envs = 0, otros = 0;
    for (const [f, t] of textos) {
        if (f.includes('world\\systems') || f.includes('world/systems')) continue;
        if (!re.test(t)) continue;
        if (f.endsWith('.html')) paginas++;
        else if (f.includes('gym_runners')) runners++;
        else if (f.includes('gym\\envs') || f.includes('gym/envs')) envs++;
        else otros++;
    }
    const tam = (await readFile(path.join(dirSistemas, fichero))).length;
    filas.push({ nombre, kb: tam / 1024, paginas, runners, envs, otros });
}

const estado = (f) => f.envs ? 'EN EL BANCO' : f.paginas ? 'jugable, sin medir'
                    : f.runners ? 'medio: runner suelto' : 'DORMIDO';
const orden = { 'DORMIDO': 0, 'medio: runner suelto': 1, 'jugable, sin medir': 2, 'EN EL BANCO': 3 };
filas.sort((a, b) => orden[estado(a)] - orden[estado(b)] || b.kb - a.kb);

console.log(`\n  ${filas.length} motores en el engine\n`);
let ultimo = null;
for (const f of filas) {
    const e = estado(f);
    if (e !== ultimo) { console.log(`\n  ── ${e} ──`); ultimo = e; }
    console.log(`    ${f.nombre.padEnd(30)} ${f.kb.toFixed(1).padStart(6)} KB`
        + `  paginas:${f.paginas} runners:${f.runners} envs:${f.envs} otros:${f.otros}`);
}
const dormidos = filas.filter(f => estado(f) === 'DORMIDO');
console.log(`\n  DORMIDOS: ${dormidos.length} motores · ${dormidos.reduce((a, b) => a + b.kb, 0).toFixed(0)} KB sin usar\n`);
