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
const rotos = [];   // rutas relativas que no resuelven, para contarlas por carpeta
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
    /**
     * ⚠️ Y EL `import` PUEDE OCUPAR DOS LÍNEAS. NO LOS VEÍA.
     *
     * El patrón exigía que la ruta estuviera en la MISMA línea que el `import`, y
     * una lista larga de símbolos se parte:
     *
     *     import { DefiendeSystem, TORRETAS, TIPOS, CELDA, OLEADAS }
     *         from '../../world/systems/DefiendeSystem.js';
     *
     * La primera línea no tiene comillas y la segunda empieza por `from`, que no
     * era ninguna de las alternativas. Resultado: esos imports **no existían**
     * para esta prueba.
     *
     * Lo destapó el arnés de sabotajes: le rompí a propósito esa misma ruta y la
     * prueba aprobó con el cable cortado. Es exactamente para lo que existe ese
     * arnés — una comprobación que no puede fallar no es una comprobación.
     */
    const rutas = [
        // `import … from '…'` y `export … from '…'`, aunque se partan en varias líneas.
        ...[...codigo.matchAll(/(?:^|\n)\s*(?:import|export)\b[\s\S]{0,400}?\bfrom\s*['"](\.[^'"]+)['"]/g)],
        // `import '…'` a secas (por efecto) y `import('…')` dinámico.
        ...[...codigo.matchAll(/(?:^|\n)\s*import\s*\(?\s*['"](\.[^'"]+)['"]/g)],
    ].map(m => m[1]);
    for (const r of rutas) {
        if (!/\.(mjs|js|json)$/.test(r)) continue;      // sin extensión: lo resuelve node, otro problema
        const abs = resolve(dirname(f), r);
        const carpeta = dirname(abs);
        const pedido = abs.slice(carpeta.length + 1);
        const reales = nombresDe(carpeta);
        revisados++;
        if (reales === null) {
            malos++;
            rotos.push(f.replace(RAIZ + sep, ''));
            console.log(`  ✗ ${f.replace(RAIZ + sep, '')}`);
            console.log(`      importa "${r}" y esa carpeta no existe`);
            continue;
        }
        if (reales.includes(pedido)) continue;          // coincide exacto: bien
        const casi = reales.find(n => n.toLowerCase() === pedido.toLowerCase());
        malos++;
        rotos.push(f.replace(RAIZ + sep, ''));
        console.log(`  ✗ ${f.replace(RAIZ + sep, '')}`);
        console.log(casi
            ? `      importa "${pedido}" y el fichero se llama "${casi}" — aquí va, en Linux no`
            : `      importa "${pedido}" y no existe ningún fichero así`);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA DEUDA, CON TECHO — Y SÓLO LA QUE SE PUBLICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Los rotos de `_archivo/` y `colonia_privada/` no viajan al paquete, así que no
 * pueden romperle nada a nadie: se cuentan aparte. Lo que sí importa es lo que
 * hay bajo `public/`, porque eso se publica.
 *
 * Medido el 24-08: seis rotos en `public/`. Cinco eran renombrados —los ficheros
 * pasaron de `*Engine.js` a `*System.js` y sus importadores se quedaron atrás—
 * y se arreglaron apuntándolos al sitio real.
 *
 * ⚠️ EL SEXTO ERA UNA PREGUNTA DE FRONTERA, Y SE RESOLVIÓ ABSORBIÉNDOLO.
 *
 * `public/js/psyche.js` importaba `AlisaAgentBridge.js`, que vive en
 * `colonia_privada/` y hace `fetch` a `localhost:8741` — la reina de una colonia
 * que quien se descargue esto no tiene. Con eso, **la cadena entera del Ser no
 * cargaba**: `alisa.js` → `psyche.js` → un módulo que no está. `SovereignBeing`
 * —el cerebro triúnico— estaba publicado y roto, y no se notaba porque ninguna
 * página lo carga.
 *
 * No se copió el puente al paquete abierto: se INVIRTIÓ la dependencia. El
 * Neocórtex recibe su `puente` como el resto de la casa recibe `config.rng`. La
 * colonia privada le pasa el suyo; el paquete abierto funciona en T0 sin puente.
 *
 * Ya no hay nada declarado, y ése es el estado bueno: una lista de excepciones
 * vacía es lo que hay que perseguir, no una lista bien escrita.
 */
const DECLARADOS = {};
const TECHO_PUBLICO = Object.keys(DECLARADOS).length;

console.log('');
const enPublico = rotos.filter(r => r.startsWith(`public${sep}`));
const sinDeclarar = enPublico.filter(r => !DECLARADOS[r]);
console.log(`  ${rotos.length} de ${revisados} rutas relativas están rotas`);
console.log(`  de ellas, ${enPublico.length} bajo public/ (o sea, publicadas) · declaradas: ${TECHO_PUBLICO}`);
for (const [f, motivo] of Object.entries(DECLARADOS)) console.log(`      · ${f} — ${motivo}`);

if (sinDeclarar.length) {
    console.log('');
    for (const r of sinDeclarar) console.log(`  ✗ ${r}: import roto sin declarar`);
    console.log(`\n  ${sinDeclarar.length} ruta(s) rotas nuevas bajo public/. `
              + 'Apúntalas al fichero real o decláralas con su motivo.\n');
    process.exit(1);
}
console.log(`\n  ✓ nada roto sin declarar bajo public/`
          + `  ·  ${rotos.length - enPublico.length} en carpetas que no se publican\n`);
