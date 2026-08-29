/**
 * prueba_arneses.mjs — los 22 arneses del gimnasio, ¿arrancan y se repiten?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_arneses.mjs
 *         → 0 bien · 1 hay arneses rotos · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * `public/js/gym_runners/` son las puertas por las que un agente entra a los
 * motores propios: cada fichero arranca su motor, lo simula sin navegador y
 * devuelve métricas. Son veintidós.
 *
 * Y no los vigilaba nadie. Sólo se ejecutaban desde `labs/croupier_banco_motores.html`,
 * una página que alguien tiene que abrir y pulsar un botón. `check_gym_envs.mjs`
 * sí está en la suite, pero comprueba los ENTORNOS del gimnasio —otra cosa— y
 * confundirlas es fácil: yo las confundí leyendo el informe de un minero.
 *
 * La primera vez que aquella página se ejecutó, el 02-08-2026, **cinco de los
 * veintidós estaban rotos** y llevaban tiempo estándolo. Se arreglaron. Lo que no
 * se arregló es que nada avise la próxima vez, y ésta es esa parte.
 *
 * ⚠️ SE MIRAN DOS COSAS PORQUE AQUELLOS CINCO SE ROMPIERON DE DOS MANERAS.
 *
 * De los cinco de agosto, tres reventaban en cualquier sitio —un motor renombrado
 * de `…Engine` a `…System` con el `import` actualizado y el `new` no, y un módulo
 * que no exportaba nada— y **dos sólo en el NAVEGADOR**: un `import 'node:url'` en
 * la primera línea y un `process.argv` suelto. Esos dos, corridos desde Node,
 * funcionan perfectamente.
 *
 * Así que una prueba de Node sola habría dejado pasar dos de los cinco. Se
 * ejecutan aquí Y se lee el fichero buscando lo que el navegador no sabe cargar.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

/**
 * ⚠️ CADA ARNÉS SE MIDE EN SU PROPIO PROCESO, Y ES POR UN HALLAZGO, NO POR GUSTO.
 *
 * La primera versión los cargaba a los veintidós en el mismo proceso, y la cuenta
 * de rotos bailaba entre 8 y 9 de una corrida a otra. El que cambiaba de bando era
 * `ecosystem_gym` — así que lo corrí solo: **40 episodios, 1 solo resultado**.
 *
 * Escribí entonces que había «estado compartido misterioso entre los motores», y
 * era una explicación de más. Lo compartido es **el propio flujo de
 * `Math.random`**: doce de los veintidós tiran de él, y en un proceso común cada
 * arnés empieza donde lo dejó el anterior, así que ve una porción distinta del
 * azar según el orden y según cuántos números gastaron los de delante.
 *
 * Un proceso por arnés contesta la pregunta que quería hacer —«¿funciona ESTE
 * arnés?»— en vez de «¿funciona después de aquellos veintiuno?». Cuesta unos
 * segundos. Una prueba que da un número distinto cada vez cuesta mucho más: se
 * acaba ignorando.
 */
/**
 * ⚠️ Y SE SIEMBRA `Math.random`, PORQUE CONTAR ROTOS NO DABA UN NÚMERO ESTABLE.
 *
 * Corriendo los episodios tal cual, la cuenta bailaba entre 9 y 11 aunque cada
 * arnés estuviera aislado en su proceso y aunque subiera a treinta episodios.
 * El motivo es que la propiedad NO ES BINARIA: varios motores divergen sólo de
 * vez en cuando, así que «cuántos no se repiten» depende de la suerte de esa
 * corrida. Un trinquete sobre un número que depende de la suerte suspende solo
 * cada pocas veces, y una prueba que falla sin motivo se acaba ignorando.
 *
 * Así que se mide otra cosa, que sí tiene respuesta fija: **¿llama este motor a
 * `Math.random`?** Se sustituye por un generador sembrado —que además se
 * resiembra antes de cada episodio— y se cuentan las llamadas. Eso es un sí o un
 * no, sale igual todas las veces, y es exactamente la causa: un motor que tira
 * del azar del sistema no se puede repetir, lo intente quien lo intente.
 *
 * Y la siembra convierte la segunda pregunta en otra distinta y también útil:
 * con el azar bajo control, ¿se repite? Si aun así no, depende del reloj o de
 * algo peor, y eso es más grave que usar `Math.random`.
 */
const SONDA = (ruta, ticks, veces) => `
    let llamadas = 0, s = 0;
    const sembrar = () => { s = 0x2F6E2B1 >>> 0; };
    sembrar();
    Math.random = () => {
        llamadas++;
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const m = await import(${JSON.stringify(pathToFileURL(ruta).href)});
    if (typeof m.runGymEpisode !== 'function') { console.log('SIN_EXPORT'); process.exit(0); }
    const r = [];
    for (let k = 0; k < ${veces}; k++) { sembrar(); r.push(await m.runGymEpisode(${ticks})); }
    console.log('RESULTADO' + JSON.stringify({ azar: llamadas, corridas: r }));
`;

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const DIR = path.join(process.cwd(), 'public', 'js', 'gym_runners');
const TICKS = 60;   // suficiente para que un motor se mueva; barato para 22
const VECES = 6;    // episodios por arnes, dentro de SU proceso

const ficheros = (await readdir(DIR)).filter((f) => f.endsWith('.js')).sort();

const MINIMO = 15;
if (ficheros.length < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${ficheros.length} arneses en ${DIR}. `
        + `Un recorrido casi vacío aprueba solo.\n`));
    process.exit(1 * 2);
}

/**
 * ⚠️ LO QUE UN NAVEGADOR NO SABE CARGAR. No es una lista de estilo: cada patrón
 *    de aquí tumbó un arnés de verdad en producción, en silencio, y sólo se vio
 *    al abrir la página del banco a mano.
 */
const SOLO_NODE = [
    [/\bfrom\s+['"]node:/, 'importa un módulo `node:…`, que el navegador no resuelve'],
    [/\brequire\s*\(/, 'usa `require`, que no existe en un módulo del navegador'],
    [/\bprocess\s*\./, 'usa `process` sin comprobar que exista'],
    [/\bfrom\s+['"]node_modules\//, 'importa desde `node_modules`, que no se publica'],
];

/**
 * ⚠️ SE MIRA EL CÓDIGO, NO LOS COMENTARIOS — Y SE PERDONA EL PATRÓN CORRECTO.
 *
 * La primera versión acusó a tres arneses de usar `process`. Los tres estaban
 * BIEN: lo guardan con `typeof process !== 'undefined'`, que es exactamente la
 * forma segura de tener un arranque por línea de comandos en un fichero que
 * también carga el navegador. Y uno de los tres ni siquiera lo usaba: mi
 * expresión regular casó con un COMENTARIO que contaba aquel fallo de agosto.
 *
 * O sea que estaba marcando el ARREGLO como si fuera la avería, y encima leyendo
 * la documentación del arreglo. Se quitan los comentarios antes de mirar, y un
 * fichero que comprueba `typeof process` queda perdonado.
 */
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const guardado = (t) => /typeof\s+process\s*!==?\s*['"]undefined['"]/.test(t);

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobados = 0, corridos = 0;

console.log('\n¿Arrancan y se repiten los arneses del gimnasio?\n');

for (const f of ficheros) {
    const ruta = path.join(DIR, f);
    const nombre = f.replace(/\.js$/, '');
    const texto = await readFile(ruta, 'utf8');
    comprobados++;

    // ── 1. ¿Lo puede cargar un navegador? ────────────────────────────────────
    const codigo = sinComentarios(texto);
    const pegas = SOLO_NODE
        .filter(([re, q]) => re.test(codigo) && !(q.includes('`process`') && guardado(codigo)))
        .map(([, q]) => q);
    if (pegas.length) mal(`${nombre}: ${pegas.join('; ')}`);

    // ── 2. ¿Se importa, exporta lo que promete, corre y se repite? ───────────
    let corridas = null, error = null, usaAzar = 0;
    try {
        const { stdout } = await ejecutar(process.execPath,
            ['--import', './resolver_three.mjs', '--input-type=module', '-e', SONDA(ruta, TICKS, VECES)],
            { cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024, timeout: 60_000 });
        if (stdout.includes('SIN_EXPORT')) {
            mal(`${nombre}: no exporta \`runGymEpisode\``);
            console.log(`  ${rojo('✗')} ${nombre.padEnd(26)} sin runGymEpisode`);
            continue;
        }
        const marca = stdout.lastIndexOf('RESULTADO');
        if (marca < 0) throw new Error('no devolvió resultado');
        const bruto = JSON.parse(stdout.slice(marca + 'RESULTADO'.length));
        corridas = bruto.corridas;
        usaAzar = bruto.azar;
    } catch (e) {
        error = String(e.stderr || e.message).split('\n').filter(Boolean).pop() ?? 'sin motivo';
    }
    if (error) {
        mal(`${nombre}: no arranca — ${error.slice(0, 120)}`);
        console.log(`  ${rojo('✗')} ${nombre.padEnd(26)} no arranca`);
        continue;
    }
    corridos++;

    /**
     * ── 3. ¿Se puede repetir? Dos preguntas, y la primera es la que da un número
     *       fijo ────────────────────────────────────────────────────────────────
     *
     * ⚠️ LA REPETICIÓN NO ES UN EXTRA: ES EL ARGUMENTO ENTERO DEL BANCO.
     *
     * Un arnés que da un número distinto cada vez no sirve para comparar a nadie
     * con nadie, que es lo único que este sitio hace.
     */
    const a = corridas[0];
    const b = corridas.slice(1);

    const obs = a?.final_obs ?? a?.obs ?? null;
    const finitos = Array.isArray(obs) ? obs.every((x) => Number.isFinite(x)) : null;
    if (finitos === false) mal(`${nombre}: su observación trae NaN o infinitos`);

    /**
     * ⚠️ SE COMPARA SIN NADA QUE VENGA DEL RELOJ, Y LA PRIMERA VERSIÓN NO LO HACÍA.
     *
     * Nada más escribir esto acusó a tres arneses de no repetirse. Abriendo uno:
     * `total_reward`, `final_score` y `deaths` eran idénticos, y lo único distinto
     * era `sim_time_ms` —2,73 contra 0,81— y `tps`, que sale de dividir por ese
     * tiempo. O sea que medían lo rápido que va esta máquina, no lo que hace el
     * motor.
     *
     * Yo había quitado `sim_time_ms` por su nombre exacto y no había pensado en
     * `tps`. Un arnés puede publicar la velocidad con el nombre que quiera, así
     * que se quitan POR FORMA DEL NOMBRE y no por lista: cualquier cosa que suene
     * a tiempo o a ritmo.
     *
     * Tercera vez esta semana que el instrumento acusa al mundo. Es más barato
     * abrir un caso y mirar qué campo difiere que discutir con el resultado.
     */
    /**
     * ⚠️ Y OJO CON PASARSE AL QUITAR: `velocidad` y `hz` estaban aquí y los quité.
     *
     * Una simulación orbital publica velocidades porque son FÍSICA, no ritmo de
     * ejecución, y al borrarlas dejé de ver que `orbital_gym` no se repetía —
     * había cambiado un falso positivo por un falso negativo, que es peor porque
     * no se queja. Sólo se anula lo que sólo puede venir del cronómetro.
     */
    const DEL_RELOJ = /time|tiempo|_ms$|^ms$|\btps\b|\bfps\b|elapsed|duracion|duration/i;
    const sinTiempos = (o) => JSON.stringify(o, (k, v) => (DEL_RELOJ.test(k) ? 0 : v));
    const repite = b.every((otra) => sinTiempos(a) === sinTiempos(otra));

    /**
     * ⚠️ ÉSTA ES LA QUE CUENTA, Y ES UN SÍ O UN NO.
     *
     * Llamar a `Math.random` es una propiedad del código, no de la suerte: sale
     * igual todas las veces. Y es la causa directa de que un arnés no se pueda
     * repetir — da igual cuántos episodios se comparen, si tira del azar del
     * sistema no hay forma de reproducir la partida.
     */
    if (usaAzar > 0) {
        mal(`${nombre}: su motor llama ${usaAzar} veces a \`Math.random\` — sin sembrar no se puede repetir`);
    }
    // Y si ni con el azar sembrado se repite, depende del reloj o de estado que
    // se queda pegado entre episodios. Eso es peor.
    if (!repite) mal(`${nombre}: no se repite NI con el azar sembrado — mira el reloj o guarda estado`);
    

    const marca = pegas.length || !repite || usaAzar > 0 || finitos === false ? rojo('✗') : verde('✓');
    console.log(`  ${marca} ${nombre.padEnd(26)} `
        + gris(`${Array.isArray(obs) ? obs.length : '—'} obs · `
            + `${usaAzar > 0 ? `azar x${usaAzar}` : 'sin azar'} · ${repite ? 'repite sembrado' : 'NO repite'}`));
}

console.log(gris(`\n  ${comprobados} arneses · ${corridos} corridos ${VECES} veces con ${TICKS} ticks`));

if (corridos < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${corridos} arneses llegaron a correr.\n`));
    process.exit(2);
}
/**
 * ⚠️ UN TECHO, NO UN APROBADO. EMPEZÓ EN TRECE Y BAJÓ A UNO LA MISMA NOCHE.
 *
 * La primera medida: doce de los veintidós arneses llamaban a `Math.random` sin
 * sembrar —de 30 llamadas (`turret_combat_gym`) a 45.414 (`stealth_gym`)— y uno
 * no arrancaba. Escribí aquí que arreglarlo era «tocar doce motores compartidos,
 * un cambio de forma», y **estaba equivocada**.
 *
 * Al mirar de verdad: los motores ya aceptan un generador —`this.rng = config.rng
 * || (() => Math.random())`— y `prueba_semillas.mjs` lleva ese trabajo hecho, con
 * su propio techo en 2 de 54 sistemas. Los que no sembraban eran LOS ARNESES, que
 * no pasaban ninguno. Y el motor tiene desde hace tiempo `DeterministicScope`,
 * escrito exactamente para esto y usado por otros veintiséis ficheros. Los
 * veintidós arneses eran los únicos que no lo usaban.
 *
 * Así que cada episodio se envuelve en `DeterministicScope.runAsync(42, …)`, sin
 * tocar el cuerpo de ninguno ni una línea de los sistemas de debajo. Doce puertas
 * de agente pasaron de irreproducibles a reproducibles.
 *
 *   · QUEDA UNO: `dqn_gym` importa `@tensorflow/tfjs`, que no está instalado. En
 *     el navegador tampoco lo estaría sin un CDN, y `preflight` los prohíbe con
 *     razón. Ése no es un arnés lento: es una puerta cerrada, y arreglarlo es
 *     decidir si ese entorno entra en el paquete o sale del catálogo.
 *
 * ⚠️ Y EL TECHO BAJA EN LOS DOS SENTIDOS.
 *
 * Si alguien arregla el que queda y no baja el número, esto suspende. Un límite
 * que se queda por encima de la realidad deja de vigilar sin que nadie se entere.
 */
const TECHO = 1;

if (fallos.length > TECHO) {
    for (const f of fallos) console.log(rojo(`  ✗ ${f}`));

    console.log(rojo(`\n✗ ${fallos.length} arneses rotos y el techo está en ${TECHO}. `
        + `Son las puertas por las que entran los agentes.\n`));
    process.exit(1);
}
if (fallos.length < TECHO) {
    for (const f of fallos) console.log(gris(`  · ${f}`));
    console.log(verde(`\n✓ ${fallos.length} rotos, por debajo del techo de ${TECHO}.`));
    console.log(rojo(`  Baja el techo a ${fallos.length} en prueba_arneses.mjs: un límite `
        + `que va por detrás de la realidad ya no vigila nada.\n`));
    process.exit(1);
}
for (const f of fallos) console.log(gris(`  · ${f}`));
console.log(gris(`\n  ${fallos.length} sin arrancar, justo el techo — `
    + `los otros 21 corren dentro de un ámbito determinista`));
console.log(verde('✓ los 22 se cargan en un navegador y 21 arrancan y se repiten\n'));
