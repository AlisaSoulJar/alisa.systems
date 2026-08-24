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
console.log(`\n  DORMIDOS: ${dormidos.length} motores · ${dormidos.reduce((a, b) => a + b.kb, 0).toFixed(0)} KB sin usar`);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL PATRÓN DORADO: ¿CUÁNTOS JUEGOS TIENEN LAS CUATRO PIEZAS?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `docs/PATRON_DORADO.md` define la forma de un juego ALISA en cuatro piezas:
 *
 *     Factory        construye el mundo. Sólo geometría, materiales y luces.
 *     System         las reglas, SIN PANTALLA. Corre en node y en un worker.
 *     Env            las tres puertas de agente: números, lenguaje y verbos.
 *     Visualizador   la puerta humana. Traduce dedos a verbos legales.
 *
 * Y la regla que lo sostiene, con sus palabras: *«el System no sabe que existe
 * una pantalla. Si para saber qué pasa hay que renderizar, no es un benchmark —
 * es una demo»*. O sea: **un System que importa THREE no es un System.**
 *
 * Eso último se puede comprobar, y hasta hoy nadie lo comprobaba. Es la
 * diferencia entre tener el patrón escrito y tenerlo aplicado.
 */
/**
 * ⚠️ SIN COMENTARIOS, O LA FRASE QUE NIEGA LA DEPENDENCIA LA CONFIRMA.
 *
 * La primera versión buscaba `THREE.` en el texto entero y acusó a
 * `FoodChainSystem` y a `ChopperAquariumEngine` de no ser headless. Fui a
 * comprobarlo porque contradecía a `PATRON_DORADO.md`, que nombra a
 * FoodChainSystem entre los headless de verdad — y el doc tenía razón: lo que
 * había en esas dos líneas era
 *
 *     FoodChainSystem       «No THREE.js or DOM dependencies.»
 *     ChopperAquariumEngine «Math utilities to avoid THREE.js dependency»
 *
 * Comentarios que dicen justo lo contrario de lo que yo estaba leyendo. Un
 * detector que lee comentarios mide lo que el fichero DICE, no lo que HACE.
 */
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const traeTHREE = (t) => {
    const c = sinComentarios(t);
    return /import\s[^;]*from\s*['"`]three['"`]/.test(c) || /\bnew\s+THREE\./.test(c);
};
const factories = new Set();
for (const [f] of textos) {
    const m = /([A-Za-z]+)Factory\.js$/.exec(f.replace(/\\/g, '/'));
    if (m) factories.add(m[1].toLowerCase());
}

console.log('\n  ── el patrón dorado, pieza a pieza ──');
console.log('    (F)actory · (S)ystem headless · (E)nv · (V)isualizador o página\n');
const completos = [];
const sucios = [];
for (const f of filas) {
    if (estado(f) === 'DORMIDO') continue;
    const t = await readFile(path.join(dirSistemas, `${f.nombre}.js`), 'utf-8');
    const limpio = !traeTHREE(t);
    // La factory se busca por raíz del nombre: RaccoonSpaceCore → raccoonspace…
    const raiz = f.nombre.toLowerCase().replace(/(system|engine|core)$/, '');
    const tieneF = [...factories].some(x => x.includes(raiz) || raiz.includes(x));
    const piezas = (tieneF ? 'F' : '·') + (limpio ? 'S' : '·') + (f.envs ? 'E' : '·') + (f.paginas ? 'V' : '·');
    if (piezas === 'FSEV') completos.push(f.nombre);
    if (!limpio && f.envs) sucios.push(f.nombre);
    console.log(`    ${piezas}  ${f.nombre.padEnd(28)} ${f.kb.toFixed(1).padStart(6)} KB`
        + (limpio ? '' : '   ⚠ importa THREE: no es headless'));
}
console.log(`\n  con las CUATRO piezas: ${completos.length ? completos.join(', ') : 'NINGUNO'}`);
if (sucios.length) {
    console.log(`  ⚠ en el banco y con THREE dentro: ${sucios.join(', ')}`);
    console.log('    Su entorno no puede correr en un worker sin montar una escena.');
}
console.log('');
