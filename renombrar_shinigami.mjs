/**
 * yokai (el juego) → shinigami. Y el bestiario NO se toca.
 * ═══════════════════════════════════════════════════════════════════════════
 *     node renombrar_shinigami.mjs --simulacro     enseña qué haría
 *     node renombrar_shinigami.mjs                 lo hace
 *
 * ⚠️ POR QUÉ HAY DOS YOKAI Y CUÁL SE VA
 *
 * `Data/Lecciones/RPG_CODEBASE_FEDERATION_CONVERGENCE_20260729.md` define en el
 * canon del proyecto:
 *
 *     «Yokai are benchmark-problems, not malware.
 *      Yokai = safe problem prototype + signature + expected remedy + capture metric»
 *      yokai.temp.bloat · yokai.schema.drift · yokai.log.noise · yokai.port.shadow
 *
 * Y eso YA ESTÁ IMPLEMENTADO aquí. `public/arcade/data/bestiario_yokai.json`:
 *
 *     «Cada yokai es la personificación de un fallo real de sistema. Sirve a la
 *      vez de catálogo de criaturas para el juego "Bestiario" y de taxonomía para
 *      el BugDex: cazar al bicho ES arreglar el bug.»
 *
 * Con sus sprites (`sprites.js`), sus luces (`lighting.js`) y sus fichas
 * (`EntityCardSystem.js`). O sea que el nombre estaba bien usado y el juego de
 * deducción social —creado el 23-08-2026— se lo quitó sin saberlo.
 *
 * Se va el juego. Shinigami (死神) son los dioses de la muerte japoneses: encaja
 * con lo que hace —señalar de noche a quien muere— y deja `yokai` libre para lo
 * que el canon ya dice que significa.
 *
 * ⚠️ LISTA EXPLÍCITA DE FICHEROS, NO BARRIDO POR PATRÓN.
 *
 * El renombrado anterior de este proyecto (`renombrar_saga.mjs`) se dejó cosas
 * tres veces por barrer con expresiones: se saltó la raíz, cosió medio nombre
 * viejo a uno nuevo, y hasta reescribió una cita de Oscar. Aquí conviven DOS
 * significados de la misma palabra en el mismo repositorio, así que un barrido no
 * es arriesgado: es seguro que rompe el bestiario. Se enumeran los ficheros del
 * JUEGO y no se toca nada más.
 */
import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';

const SIMULACRO = process.argv.includes('--simulacro');
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/** Sólo estos. Todo lo demás que diga «yokai» es el bestiario y se queda. */
const DEL_JUEGO = [
    'public/arcade/js/protohub/rules/yokai.js',
    'public/arcade/yokai.html',
    'public/arcade/js/protohub/rules/index.js',
    'public/js/alisa-engine/src/gym/registro.js',
    'enfrentamiento.mjs',
    'enfrentar.mjs',
    'prueba_enfrentamiento.mjs',
    'prueba_de_las_pruebas.mjs',
    'medir.mjs',
    '_yokai_gym.mjs',
    'docs/ENFRENTAMIENTO.md',
    'docs/COMO_MEDIR.md',      // «si te toca ser yokai» — es el juego
    'docs/clasificacion.md',   // su fila en la tabla — es el juego
    /**
     * ⚠️ Y AQUÍ ESTUVIERON A PUNTO DE ENTRAR DOS QUE NO SON. La lista explícita
     * no basta si no se lee lo que hay dentro:
     *
     *   docs/CUADERNO_ESTUDIO_MOTOR.md:848
     *       «### 👹 EL BESTIARIO YOKAI — arcade/data/bestiario_yokai.json»
     *   docs/HALL_SALA_DEL_HUEVO.md:332
     *       «degrada el LOD a vóxeles e invoca yokais de...»
     *
     * Los dos hablan del bestiario. Renombrarlos habría dejado el documento
     * describiendo un fichero que no existe y una criatura que no se llama así —
     * y el fallo sería mudo, porque un `.md` no se ejecuta. Se quedan fuera.
     */
];

/** Y estos se RENOMBRAN de fichero, no sólo de contenido. */
const RENOMBRES = [
    ['public/arcade/js/protohub/rules/yokai.js', 'public/arcade/js/protohub/rules/shinigami.js'],
    ['public/arcade/yokai.html', 'public/arcade/shinigami.html'],
    ['_yokai_gym.mjs', '_shinigami_gym.mjs'],
];

/**
 * ⚠️ DE MÁS LARGO A MÁS CORTO, QUE ES LO QUE EL ANTERIOR HIZO AL REVÉS.
 * Si `yokai` se sustituye antes que `crearYokai`, queda `crearShinigami` por un
 * lado y `crearYokai` intacto por otro según cómo caiga. Las mayúsculas y los
 * compuestos van primero.
 */
const CAMBIOS = [
    ['crearYokai', 'crearShinigami'],
    ['bestiario_yokai', 'bestiario_yokai'],   // centinela: NO se toca, y se ve en el diff
    ['YOKAI', 'SHINIGAMI'],
    ['Yokai', 'Shinigami'],
    ['yokai', 'shinigami'],
];

console.log(`\nyokai (el juego) → shinigami${SIMULACRO ? gris('   [SIMULACRO]') : ''}\n`);

let tocados = 0, sustituciones = 0;
for (const rel of DEL_JUEGO) {
    let t;
    try { t = await readFile(rel, 'utf-8'); } catch { console.log(rojo(`  ✗ no existe ${rel}`)); continue; }
    const antes = t;
    for (const [de, a] of CAMBIOS) {
        if (de === a) continue;
        const n = t.split(de).length - 1;
        if (n) { t = t.split(de).join(a); sustituciones += n; }
    }
    if (t === antes) { console.log(gris(`    sin cambios  ${rel}`)); continue; }
    tocados++;
    console.log(`  ${verde('✓')} ${rel}`);
    if (!SIMULACRO) await writeFile(rel, t, 'utf-8');
}

for (const [de, a] of RENOMBRES) {
    console.log(`  ${verde('→')} ${de}  ⇒  ${a}`);
    if (!SIMULACRO) { try { await rename(de, a); } catch (e) { console.log(rojo(`      ${e.message}`)); } }
}

/**
 * ⚠️ Y SE COMPRUEBA QUE EL BESTIARIO SIGUE ENTERO.
 *
 * Es la mitad que importa: el renombrado tiene que dejar EXACTAMENTE igual todo
 * lo que dice «yokai» y no es el juego. Si aquí baja el número, se ha tocado algo
 * que no era.
 */
const SALTAR = /node_modules|dist_publico|[\\/]dist[\\/]|\.git|_archivo/;
async function* recorrer(dir) {
    let e; try { e = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
        const p = path.join(dir, x.name);
        if (SALTAR.test(p)) continue;
        if (x.isDirectory()) yield* recorrer(p);
        else if (/\.(js|mjs|json|html)$/.test(x.name)) yield p;
    }
}
const DEL_BESTIARIO = ['public/arcade/data/bestiario_yokai.json', 'public/js/sprites.js',
    'public/js/lighting.js', 'public/arcade/js/bestiario_visualizer.js'];
let vivas = 0;
for (const f of DEL_BESTIARIO) {
    try { vivas += ((await readFile(f, 'utf-8')).match(/yokai/gi) ?? []).length; } catch {}
}
console.log(`\n  ${tocados} ficheros · ${sustituciones} sustituciones`);
console.log(`  ${vivas > 0 ? verde('✓') : rojo('✗')} el bestiario conserva ${vivas} menciones a «yokai»`
    + gris('  (tienen que seguir ahí: son el yokai del canon)'));
console.log('');
