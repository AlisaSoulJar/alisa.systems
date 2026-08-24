/**
 * ¿HAY UN SOLO AZAR EN LA CASA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_azar.mjs
 *
 * ⚠️ POR QUÉ EXISTE: «SEMILLA 42» LLEGÓ A SIGNIFICAR DOS MUNDOS DISTINTOS.
 *
 * Había dos generadores sembrados en el motor. Medido el 24-08:
 *
 *     mulberry32(42):  0,601104  0,448291  0,852466     ← 26 ficheros
 *     SeededRNG(42):   0,885884  0,817627  0,958989     ←  4 ficheros
 *
 * Cada uno era reproducible por su cuenta, así que ninguna prueba se quejaba.
 * Pero era una trampa puesta: en cuanto alguien diera por hecho que la misma
 * semilla da el mismo mundo entre dos piezas, se equivocaba **sin un solo
 * error**. Y estuvo a punto de morder — `RaccoonEnvironmentFactory` usa uno y
 * `RaccoonSpaceCore` el otro, así que hasta esa mañana cada uno se inventaba sus
 * posiciones con la misma semilla.
 *
 * ⚠️ Y NO SE UNIFICÓ PORQUE UNO FUERA MALO. LO MEDÍ Y NO LO ERA.
 * En la prueba de retícula el viejo LCG salió incluso algo mejor (26.453 celdas
 * contra 25.397). Su único límite real es que la secuencia se repite entera a
 * las 233.280 tiradas — de sobra para un episodio. Se unificó por CONSISTENCIA.
 *
 * Esto vigila que no vuelvan a ser dos: que las dos formas de pedir azar den la
 * misma secuencia, y que nadie escriba un tercer generador a mano.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { mulberry32 } from './public/js/alisa-engine/src/world/core/DeterministicScope.js';
import { SeededRNG } from './public/js/alisa-engine/src/world/core/SeededRNG.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Hay un solo azar en la casa?\n');

// 1. Las dos interfaces, la misma secuencia.
for (const semilla of [1, 42, 1234, 999999]) {
    const a = mulberry32(semilla), b = new SeededRNG(semilla);
    const A = Array.from({ length: 6 }, () => a());
    const B = Array.from({ length: 6 }, () => b.next());
    if (A.some((v, i) => v !== B[i])) {
        mal(`con semilla ${semilla}, mulberry32 y SeededRNG dan mundos distintos:\n`
          + `       mulberry32 ${A.slice(0, 3).map(v => v.toFixed(6)).join(' ')}\n`
          + `       SeededRNG  ${B.slice(0, 3).map(v => v.toFixed(6)).join(' ')}`);
    }
}
if (!fallos) console.log('  ✓ las dos formas de pedir azar dan la misma secuencia');

// 2. `reset()` rebobina de verdad.
{
    const g = new SeededRNG(7);
    const antes = [g.next(), g.next(), g.next()];
    g.reset();
    const despues = [g.next(), g.next(), g.next()];
    if (antes.some((v, i) => v !== despues[i])) mal('SeededRNG.reset() no rebobina a la semilla inicial');
    else console.log('  ✓ reset() rebobina a la semilla inicial');
}

/**
 * 3. ⚠️ QUE NADIE ESCRIBA UN TERCERO A MANO.
 *
 * Un generador sembrado son tres líneas, así que aparecen solos: alguien
 * necesita azar reproducible en un fichero, lo escribe ahí y ya hay dos verdades
 * sobre lo que significa una semilla. Se buscan las constantes típicas.
 *
 * ⚠️ Y SE LEE EL CÓDIGO, NO LOS COMENTARIOS. Esta misma semana, cuatro veces, un
 * detector mío contó prosa como si fuera código — incluida la nota que explicaba
 * cómo se había quitado un `Math.random`.
 */
/**
 * ⚠️ Y HAY DOS GRAVEDADES, NO UNA. LA PRIMERA VERSIÓN LAS CONFUNDIÓ.
 *
 * Al correr esto salieron nueve ficheros y el mensaje decía «la semilla no
 * significa lo mismo en toda la casa». **Era falso**: los nueve copian la
 * constante de `mulberry32`, o sea que dan exactamente la misma secuencia. Lo
 * que hay ahí es código duplicado, no dos verdades.
 *
 *   OTRO ALGORITMO  → otro mundo con la misma semilla. Eso es un fallo.
 *   MISMA FÓRMULA COPIADA → el mismo mundo, pero un sitio más donde divergir el
 *                    día que alguien toque una de las copias. Eso es deuda, y va
 *                    con techo declarado como el resto de la casa.
 *
 * Distinguirlas importa: si esto suspendiera por las nueve copias, la forma más
 * rápida de poner la prueba en verde sería subir el techo, y entonces dejaría de
 * avisar del caso que sí duele.
 */
const OTRO_ALGORITMO = [
    [/\b9301\b[\s\S]{0,40}\b49297\b/, 'el LCG 9301/49297 escrito a mano'],
    [/\b1664525\b[\s\S]{0,40}\b1013904223\b/, 'el LCG de Numerical Recipes'],
    [/Math\.imul\([^)]*0x85ebca6b/i, 'un hash de Murmur usado como generador'],
];
const COPIA_DE_LA_CASA = [/0x6D2B79F5/i];

/**
 * Nueve copias medidas el 24-08. El techo sólo baja: cada vez que alguien
 * importe en vez de copiar, se actualiza a la baja y ya no puede volver a subir.
 */
const TECHO_COPIAS = 9;
const RAIZ = process.cwd();
const PERMITIDOS = ['DeterministicScope.js', 'SeededRNG.js'];

async function ficheros(dir, acc = []) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        if (/node_modules|dist_publico|^dist$|_archivo|\.git/.test(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await ficheros(p, acc);
        else if (/\.(js|mjs)$/.test(e.name)) acc.push(p);
    }
    return acc;
}

let otros = 0;
const copias = [];
for (const f of await ficheros(path.join(RAIZ, 'public/js/alisa-engine/src'))) {
    if (PERMITIDOS.some(p => f.endsWith(p))) continue;
    const bruto = await readFile(f, 'utf-8');
    const codigo = bruto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const [re, que] of OTRO_ALGORITMO) {
        if (re.test(codigo)) {
            otros++;
            mal(`${path.relative(RAIZ, f)}: ${que} — con la misma semilla da OTRO mundo`);
        }
    }
    if (COPIA_DE_LA_CASA.some(re => re.test(codigo))) copias.push(path.relative(RAIZ, f));
}
if (!otros) console.log('  ✓ ningún fichero usa un algoritmo distinto: una semilla, un mundo');

console.log(`\n  ${copias.length} fichero(s) copian la fórmula en vez de importarla (techo: ${TECHO_COPIAS})`);
for (const c of copias) console.log(`      ${c}`);
if (copias.length > TECHO_COPIAS) {
    mal(`SUBIÓ: ${copias.length} > ${TECHO_COPIAS}. Alguien ha vuelto a copiar el generador. `
      + 'Impórtalo de `DeterministicScope.js`, no subas el techo.');
} else if (copias.length < TECHO_COPIAS) {
    console.log(`  ↓ bajó. Actualiza TECHO_COPIAS a ${copias.length} para que no vuelva a subir.`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  4. ¿HAY UNA SOLA ESCALA DE «CALIENTE / FRÍO»?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mismo problema que el generador, en otro sitio. Medido el 24-08:
 *
 *     RaccoonSpaceCore   caliente · templado · fresco · frío · helado
 *     CorpBuildingEnv    CALIENTE · TIBIO · FRÍO
 *
 * **«Caliente» quería decir cosas distintas en dos juegos del mismo banco**, y
 * «TIBIO» no existía en el otro. Un agente que aprende a leer una escala se
 * equivoca con la otra, y eso no es dificultad del juego: es ruido de
 * vocabulario que el banco le mete encima.
 *
 * Los CORTES siguen siendo de cada juego —los de Raccoon salen de medir dónde
 * caen sus distancias, los del edificio cuentan plantas— y eso está bien: lo que
 * se comparte es cómo se llaman los peldaños.
 */
{
    const { ESCALA } = await import('./public/js/alisa-engine/src/world/core/Bandas.js');
    const VIEJAS = /'(CALIENTE|TIBIO|FR[IÍ]O|HOT|WARM|COOL|CHILLY|COLD)'/;

    /**
     * ⚠️ TRADUCIR EN LA FRONTERA NO ES INVENTARSE UN IDIOMA, Y ESTA PRUEBA
     * ACUSÓ A DOS SITIOS SANOS ANTES DE QUE LO DISTINGUIERA.
     *
     * `CorporateSeekerSystem` es el agente de referencia del edificio y habla
     * `HOT/WARM/COLD` por su cuenta; `CorpBuildingEnv` le traduce al llamarlo.
     * Eso está bien: es un adaptador hacia una interfaz ajena, que es justo para
     * lo que existen los adaptadores. Lo que NO vale es que el ESTADO del juego
     * viaje con nombres propios — y eso es lo que se arregló.
     *
     * Cambiarle el idioma al agente sería tocar cinco ficheros —dos páginas, una
     * de ellas legacy— para que una prueba se calle. Se declara con su motivo,
     * que es lo que hace el resto de la casa cuando una excepción es legítima.
     */
    const permitidos = [
        'Bandas.js',
        // El agente de referencia: interfaz propia, anterior a la escala común.
        'CorporateSeekerSystem.js',
    ];
    let inventados = 0;
    for (const f of await ficheros(path.join(RAIZ, 'public/js/alisa-engine/src'))) {
        if (permitidos.some(p => f.endsWith(p))) continue;
        const bruto = await readFile(f, 'utf-8');
        const codigo = bruto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        /**
         * ⚠️ SÓLO LO QUE SE COMPARA O SE DEVUELVE, Y ESA PRECISIÓN ES EL ARREGLO.
         *
         * La primera versión miraba `(===|!==|return|:)` y con el `:` acusaba al
         * traductor de `CorpBuildingEnv` —`r === 'caliente' ? 'HOT' : 'COLD'`—,
         * que es un adaptador correcto hacia un agente ajeno.
         *
         * Lo que de verdad importa es si el ESTADO viaja con nombres propios: eso
         * se ve en lo que una función DEVUELVE y en contra de qué se COMPARA. Un
         * `'HOT'` pasado como argumento a otra cosa es una traducción en la
         * frontera, y traducir en la frontera es lo correcto.
         *
         * Y así el sabotaje sigue mordiendo: volver a poner `result === 'CALIENTE'`
         * es exactamente una comparación de estado.
         */
        const m = codigo.match(new RegExp(`(===|!==|return)\\s*${VIEJAS.source}`));
        if (m) {
            inventados++;
            mal(`${path.relative(RAIZ, f)}: usa ${m[2]} como banda — la escala común es `
              + `(${ESCALA.join(' · ')}), ver \`Bandas.js\``);
        }
    }
    if (!inventados) console.log('  ✓ una sola escala de caliente/frío en todo el banco');
}

console.log('');
if (fallos) { console.log(`  ${fallos} fallo(s) de azar\n`); process.exit(1); }
console.log('  ✓ un solo azar y una sola escala\n');
