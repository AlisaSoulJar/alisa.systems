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
 *     medio: runner suelto  sólo un `gym_runner` sin cabeza
 *     pieza de otro motor   lo usa otro motor, una factory o un plugin
 *     DORMIDO               nadie lo importa en ninguna parte
 *
 * Medido el 24-08, ya con las tres correcciones de abajo: **TRES motores
 * dormidos** —`KatamariScaleSystem`, `ml_dqn_idm`, `KinematicControllerSystem`—
 * y nueve más con sólo un runner suelto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTA HERRAMIENTA HA MENTIDO DOS VECES, Y LAS DOS A LA ALTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Primera: contaba MENCIONES, no imports.** Un motor citado en un comentario
 * salía como usado. `RaccoonCitySystem` aparecía «en el banco» porque yo lo
 * había nombrado esa tarde en una nota dentro de `RaccoonSpaceEnv.js`.
 *
 * **Segunda: al apretar a imports se pasó de frenada y declaró muertos a nueve
 * que están vivos.** Lo destapó un subagente al que mandé leer los doce
 * «dormidos» uno por uno, y eran tres fallos a la vez:
 *
 *   1. `if (f.includes('world/systems')) continue` — un motor usado por OTRO
 *      motor no contaba como usado. Así perdí `BulletHeavenEngine`, que es la
 *      clase madre de `MarabuntaSystem`: declaré muerto al padre del único
 *      motor que tiene las cuatro piezas del patrón dorado.
 *   2. El patrón exigía comilla justo detrás del `.js`, y la página de
 *      asteroides importa `AsteroidsEngine.js?v=3` con rompe-cachés.
 *   3. Y la peor: **`otros` no contaba para nada.** La línea impresa decía
 *      `TrafficSystem … otros:1 ← DORMIDO`. El importador estaba contado, en
 *      pantalla, y la etiqueta decía lo contrario dos columnas más allá.
 *
 * Un inventario que cuenta menciones dice que hay más hecho de lo que hay. Uno
 * que ignora la mitad de sus propios importadores dice que hay menos. Las dos
 * mentiras cuestan lo mismo: se planifica sobre un mapa falso.
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
    /**
     * ⚠️ Sólo IMPORTS. Contar el nombre a secas cuenta las menciones en
     * comentarios: RaccoonCitySystem salía «en el banco» porque yo lo nombré
     * hoy en una nota dentro de RaccoonSpaceEnv.js.
     *
     * ⚠️ Y SE ADMITE `?v=3` DESPUÉS DEL `.js`. La página de asteroides importa
     * `AsteroidsEngine.js?v=3` —un rompe-cachés— y el patrón exigía comilla justo
     * detrás del `.js`, así que ese import no existía para mí.
     */
    const re = new RegExp(`import[^;]*['"\`][^'"\`]*${nombre}\\.js(\\?[^'"\`]*)?['"\`]`);
    let paginas = 0, runners = 0, envs = 0, motores = 0, otros = 0;
    for (const [f, t] of textos) {
        /**
         * ⚠️ AQUÍ SE SALTABAN LOS MOTORES QUE IMPORTAN A OTROS MOTORES, Y ÉSE
         * ERA EL FALLO GORDO.
         *
         * La línea decía `if (f.includes('world/systems')) continue`, o sea que
         * un motor usado por otro motor no contaba como usado. Con eso salían
         * como dormidos cuatro que están vivos y en producción:
         *
         *     BulletHeavenEngine  ← MarabuntaSystem lo EXTIENDE (L1, L54)
         *     PheromoneGrid       ← ChopperAquariumEngine (L4)
         *     KatamariSystem      ← KatamariEngine (L1) → una página
         *     RoboticArmSystem    ← PygmalionTopologySystem (L4) → una sala
         *
         * `BulletHeavenEngine` es el caso que más duele: es la clase madre del
         * único motor que tiene las cuatro piezas del patrón dorado. Lo declaré
         * muerto y es el padre del vivo.
         */
        const esOtroMotor = f.includes('world\\systems') || f.includes('world/systems');
        if (esOtroMotor && f.endsWith(`${nombre}.js`)) continue;   // no se cuenta a sí mismo
        if (!re.test(t)) continue;
        if (esOtroMotor) motores++;
        else if (f.endsWith('.html')) paginas++;
        else if (f.includes('gym_runners')) runners++;
        else if (f.includes('gym\\envs') || f.includes('gym/envs')) envs++;
        else otros++;
    }
    const tam = (await readFile(path.join(dirSistemas, fichero))).length;
    filas.push({ nombre, kb: tam / 1024, paginas, runners, envs, motores, otros });
}

/**
 * ⚠️ Y `otros` NO CONTABA PARA NADA, QUE ES EL FALLO MÁS FEO DE LOS TRES.
 *
 * La clasificación miraba `envs`, `paginas` y `runners` y **ignoraba `otros`**,
 * que es donde caen las factories y los plugins. Resultado: `TrafficSystem`
 * salía impreso como
 *
 *     TrafficSystem   5.7 KB  paginas:0 runners:0 envs:0 otros:1   ← DORMIDO
 *
 * con el `otros:1` delante de mis ojos. No es que el dato faltara: es que la
 * etiqueta contradecía al número que estaba en la misma línea. Un regex malo se
 * entiende; poner «DORMIDO» al lado de un importador que acabas de contar, no.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ QUIÉN HEREDA DE QUIÉN, PORQUE UNA CLASE MADRE NO ES UN MOTOR PARADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `BulletHeavenEngine` sale con `pag:0 run:0 env:0` y con eso aterrizaba entre
 * los motores sin puertas propias. Es cierto y es engañoso: `MarabuntaSystem`
 * **extiende** esa clase, y Marabunta tiene el patrón dorado completo. O sea que
 * el motor no está esperando un juego — su juego existe y se llama de otra
 * manera.
 *
 * Yo mismo lo leí mal el 24-08 y llegué a proponer «montarle un juego encima»,
 * que habría sido un reskin de Marabunta vendido como medida nueva. El censo
 * tenía el dato —`motor:2`— y la etiqueta invitaba a ignorarlo.
 *
 * Se busca `class X extends Y` en todo el árbol y se dice el nombre del hijo.
 * Decir «pieza de otro motor» no basta: hay que decir DE CUÁL, porque lo único
 * que responde la pregunta «¿le falta un juego?» es mirar a ese hijo.
 */
const hijos = new Map();
for (const [, t] of textos) {
    for (const m of t.matchAll(/class\s+([A-Za-z_$][\w$]*)\s+extends\s+([A-Za-z_$][\w$]*)/g)) {
        if (!hijos.has(m[2])) hijos.set(m[2], new Set());
        hijos.get(m[2]).add(m[1]);
    }
}

const importadores = (f) => f.envs + f.paginas + f.runners + f.motores + f.otros;
const estado = (f) => f.envs ? 'EN EL BANCO'
                    : f.paginas ? 'jugable, sin medir'
                    : hijos.has(f.nombre) ? `clase madre de ${[...hijos.get(f.nombre)].join(', ')}`
                    : f.runners ? 'medio: runner suelto'
                    : importadores(f) ? 'pieza de otro motor'
                    : 'DORMIDO';
const orden = { 'DORMIDO': 0, 'pieza de otro motor': 1, 'medio: runner suelto': 2,
                'jugable, sin medir': 3, 'EN EL BANCO': 4 };
filas.sort((a, b) => orden[estado(a)] - orden[estado(b)] || b.kb - a.kb);

console.log(`\n  ${filas.length} motores en el engine\n`);
let ultimo = null;
for (const f of filas) {
    const e = estado(f);
    if (e !== ultimo) { console.log(`\n  ── ${e} ──`); ultimo = e; }
    console.log(`    ${f.nombre.padEnd(30)} ${f.kb.toFixed(1).padStart(6)} KB`
        + `  pag:${f.paginas} run:${f.runners} env:${f.envs} motor:${f.motores} otros:${f.otros}`);
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
    /**
     * ⚠️ LA FACTORY SE BUSCA POR QUIÉN LA USA, NO POR CÓMO SE LLAMA.
     *
     * Antes se emparejaba por raíz del nombre —`ChopperAquariumEngine` →
     * «chopperaquarium»— y eso falla en cuanto alguien nombra bien sus ficheros:
     * la factory de ese motor se llama `AquariumEnvironmentFactory`, que no
     * contiene «chopper» ni al revés. El motor tenía su Factory y salía sin ella.
     *
     * La señal buena es de uso: **si un fichero importa este motor y además
     * importa una Factory, ese juego tiene su Factory.** Es lo que significa la
     * pieza —alguien construye el mundo de este motor— y no depende de que dos
     * personas eligieran nombres parecidos.
     */
    const reMotor = new RegExp(`import[^;]*['"\`][^'"\`]*${f.nombre}\\.js(\\?[^'"\`]*)?['"\`]`);
    /**
     * ⚠️ Y SE EXCLUYE SÓLO EL FICHERO DEL PROPIO MOTOR, NO LA CARPETA ENTERA.
     *
     * El primer intento saltaba todo `world/systems`, y con eso `AsteroidsSystem`
     * perdía su Factory: quien importa el motor y la Factory a la vez es
     * `AsteroidsEngine` —el renderizador—, que vive en esa misma carpeta. Excluir
     * una carpeta para no contarse a uno mismo se lleva por delante a los vecinos.
     */
    const reFactory = /import[^;]*['"`][^'"`]*Factory\.js(\?[^'"`]*)?['"`]/;
    /**
     * ⚠️ Y EL MOTOR PUEDE IMPORTAR SU PROPIA FACTORÍA. ANTES NO CONTABA.
     *
     * Esto buscaba un TERCERO que importara motor y factoría a la vez, porque en
     * los juegos 3D la factoría monta la escena y quien las junta es la página.
     * En `DefiendeSystem` no hay escena: la factoría genera el TERRENO —la matriz
     * y el sendero—, así que es el propio motor quien la usa, y salía sin «F»
     * teniendo una factoría de libro.
     *
     * Excluir el fichero del motor tenía sentido para no contarse a sí mismo como
     * IMPORTADOR; se coló también para la factoría, que es otra pregunta. Es la
     * quinta vez esta semana que un filtro puesto por comodidad me deja fuera
     * justo el caso que buscaba.
     */
    const tieneF = reFactory.test(t) || [...textos].some(([fi, ti]) =>
        !fi.endsWith(`${f.nombre}.js`) && reMotor.test(ti) && reFactory.test(ti));
    /**
     * ⚠️ LA PUERTA HUMANA PUEDE IR POR UN RENDERIZADOR, Y ANTES NO CONTABA.
     *
     * Esto exigía que una PÁGINA importara el System directamente. Pero un juego
     * bien hecho separa reglas de dibujo: `croupier_asteroids_survival.html`
     * importa `AsteroidsEngine` —el renderizador— y es ÉSE quien usa
     * `AsteroidsSystem`. O sea que la arquitectura correcta hacía perder la «V».
     *
     * Es el mismo fallo de segundo salto que un subagente me destapó esta tarde
     * en la otra mitad de este fichero, y lo tenía aquí sin corregir: arreglé la
     * clasificación de dormidos y dejé el patrón dorado mirando sólo un paso.
     * Una lección aplicada a medias es la manera favorita que tiene este proyecto
     * de repetir un fallo.
     */
    /**
     * ⚠️ Y EL ENVOLTORIO PUEDE ESTAR EN CUALQUIER SITIO DE `world/`, NO SÓLO EN
     * `world/systems`.
     *
     * Lo restringí a `systems` y con eso `CabinetEscapeSystem` perdió su puerta
     * humana: su envoltorio, `CabinetEscapeGame`, vive en `world/gym_runners/`.
     *
     * Es la CUARTA vez hoy que tropiezo con el mismo salto —un subagente me lo
     * enseñó en la clasificación de dormidos, volví a caer en el patrón dorado,
     * otra vez en `prueba_sagas.mjs`, y aquí de nuevo con la carpeta mal—. Cuando
     * un fallo aparece cuatro veces en un día no es descuido: es que «quién
     * importa a quién» hay que seguirlo entero y en todas partes, y cada vez que
     * lo acoto por comodidad me deja fuera justo el caso que buscaba.
     */
    const puertaHumana = f.paginas > 0 || [...textos].some(([fi, ti]) =>
        fi.endsWith('.html') && [...textos].some(([fj, tj]) =>
            /[\\/]world[\\/]/.test(fj) && fj.endsWith('.js')
            && new RegExp(`import[^;]*['"\`][^'"\`]*${path.basename(fj, '.js')}\\.js(\\?[^'"\`]*)?['"\`]`).test(ti)
            && new RegExp(`import[^;]*['"\`][^'"\`]*${f.nombre}\\.js(\\?[^'"\`]*)?['"\`]`).test(tj)));

    const piezas = (tieneF ? 'F' : '·') + (limpio ? 'S' : '·') + (f.envs ? 'E' : '·') + (puertaHumana ? 'V' : '·');
    if (piezas === 'FSEV') completos.push(f.nombre);
    if (!limpio && f.envs) sucios.push(f.nombre);
    console.log(`    ${piezas}  ${f.nombre.padEnd(28)} ${f.kb.toFixed(1).padStart(6)} KB`
        + (limpio ? '' : '   ⚠ importa THREE: no es headless'));
}
console.log(`\n  con las CUATRO piezas: ${completos.length ? completos.join(', ') : 'NINGUNO'}`);

/**
 * ⚠️ TRINQUETE AL REVÉS: ESTE NÚMERO SÓLO PUEDE SUBIR.
 *
 * Los demás trinquetes de la casa cuentan deuda y sólo bajan. Éste cuenta juegos
 * COMPLETOS —Factory, System headless, Env y puerta humana— y sólo sube. Si baja,
 * alguien le ha quitado una pieza a un juego que la tenía, y eso no da error: da
 * un juego que se sigue pudiendo jugar y ya no se puede medir, o al revés.
 *
 * Medido el 24-08: cuatro. Y llegó a decir UNO por dos cegueras mías —la puerta
 * humana a través de un renderizador, y la Factory emparejada por nombre en vez
 * de por uso—. El número no subió porque se trabajara: subió porque el
 * instrumento dejó de mentir. Vale la pena distinguirlo.
 */
// 24-08 (tarde): cinco. Entro RaccoonSpaceCore al unificar ¡Busca! 6.
const SUELO_COMPLETOS = 7;
if (completos.length < SUELO_COMPLETOS) {
    console.log(`\n  ✗ eran ${SUELO_COMPLETOS} juegos completos y ahora hay ${completos.length}.`);
    console.log('    A alguno le falta una pieza que tenía: se podrá jugar y no medir,');
    console.log('    o medir y no jugar. Mira cuál y por qué antes de bajar este suelo.');
    process.exitCode = 1;
} else if (completos.length > SUELO_COMPLETOS) {
    console.log(`  ↑ sube a ${completos.length}. Actualiza SUELO_COMPLETOS.`);
}
if (sucios.length) {
    console.log(`  ⚠ en el banco y con THREE dentro: ${sucios.join(', ')}`);
    console.log('    Su entorno no puede correr en un worker sin montar una escena.');
}
console.log('');
