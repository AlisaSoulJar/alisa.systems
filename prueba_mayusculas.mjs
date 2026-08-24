/**
 * ¿SOBREVIVIRÍA ESTO A UN SISTEMA DE FICHEROS QUE DISTINGUE MAYÚSCULAS?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_mayusculas.mjs
 *
 * ⚠️ POR QUÉ EXISTE: `npm test` PASABA AQUÍ Y FALLABA EN CI, Y ESO NOS DEJÓ
 * CIENTO VEINTIÚN COMMITS SIN PUBLICAR.
 *
 * Windows y macOS no distinguen mayúsculas al abrir un fichero: `./Cosa.js` y
 * `./cosa.js` son lo mismo. Linux sí las distingue — y CI es Linux, y el
 * despliegue depende de CI. Así que un `import` con una letra cambiada funciona
 * en las tres máquinas donde se escribe el código y revienta en la única que
 * publica.
 *
 * Es la peor forma de fallo que hay en esta casa: el mismo comando, dos
 * entornos, y el que falla es el que nadie mira. El propio `ci.yml` ya avisa de
 * este patrón por otra causa. Aquí se comprueba sin necesitar un Linux: se
 * compara la ruta ESCRITA contra el nombre REAL del fichero en disco, letra a
 * letra.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const RAIZ = process.cwd();
const SALTAR = new Set(['node_modules', '.git', 'dist', 'dist_publico', '.wrangler', 'assets']);

function ficheros(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (SALTAR.has(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) ficheros(p, out);
        else if (/\.(mjs|js)$/.test(e.name)) out.push(p);
    }
    return out;
}

/**
 * ⚠️ Y HAY QUE PREGUNTARLE AL DIRECTORIO, NO A `existsSync`.
 *
 * `existsSync('./Cosa.js')` devuelve `true` en Windows aunque el fichero se
 * llame `cosa.js`, que es justo el fallo que se busca. La única forma de saber
 * el nombre REAL es listar la carpeta y comparar la cadena.
 */
const cacheDir = new Map();
function nombresDe(dir) {
    if (!cacheDir.has(dir)) {
        try { cacheDir.set(dir, readdirSync(dir)); } catch { cacheDir.set(dir, null); }
    }
    return cacheDir.get(dir);
}

let revisados = 0, malos = 0;
console.log('\n¿Aguantarían los import en un disco que distingue mayúsculas?\n');

for (const f of ficheros(RAIZ)) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    /**
     * ⚠️ SE QUITAN LOS COMENTARIOS ANTES DE MIRAR, Y NO ES PRECAUCIÓN TEÓRICA.
     *
     * La primera versión de esto acusó a diez ficheros sanos. Ninguno tenía un
     * import roto: lo que leía eran EJEMPLOS dentro de comentarios y CADENAS DE
     * DATOS — `prueba_de_las_pruebas.mjs` guarda rutas de ficheros a sabotear en
     * una tabla, y las contaba como importaciones.
     *
     * Es la cuarta vez esta semana que un detector mío lee prosa como si fuera
     * código. Ya pasó con `Math.random` en un comentario que explicaba cómo se
     * había quitado `Math.random`. La regla, ya: **quita los comentarios y exige
     * que el import esté al principio de una línea**, que es donde vive un import
     * de verdad.
     */
    const codigo = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    // Sólo rutas relativas: los paquetes y los alias los resuelve otro.
    const rutas = [...codigo.matchAll(/^\s*(?:import[^'"\n]*from|import|export[^'"\n]*from)\s*\(?\s*['"](\.[^'"]+)['"]/gm)]
        .map(m => m[1]);
    for (const r of rutas) {
        if (!/\.(mjs|js|json)$/.test(r)) continue;      // sin extensión: lo resuelve node, otro problema
        const abs = resolve(dirname(f), r);
        const carpeta = dirname(abs);
        const pedido = abs.slice(carpeta.length + 1);
        const reales = nombresDe(carpeta);
        revisados++;
        if (reales === null) {
            malos++;
            console.log(`  ✗ ${f.replace(RAIZ + sep, '')}`);
            console.log(`      importa "${r}" y esa carpeta no existe`);
            continue;
        }
        if (reales.includes(pedido)) continue;          // coincide exacto: bien
        const casi = reales.find(n => n.toLowerCase() === pedido.toLowerCase());
        malos++;
        console.log(`  ✗ ${f.replace(RAIZ + sep, '')}`);
        console.log(casi
            ? `      importa "${pedido}" y el fichero se llama "${casi}" — aquí va, en Linux no`
            : `      importa "${pedido}" y no existe ningún fichero así`);
    }
}

console.log('');
if (malos) {
    console.log(`  ${malos} de ${revisados} rutas relativas no sobrevivirían a Linux\n`);
    process.exit(1);
}
console.log(`  ✓ las ${revisados} rutas relativas coinciden letra a letra con el disco\n`);
