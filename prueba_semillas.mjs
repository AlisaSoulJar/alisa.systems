/**
 * prueba_semillas.mjs — cuántos sistemas del motor todavía no se pueden medir
 * ═══════════════════════════════════════════════════════════════════════════
 * El motor tiene 54 sistemas. Los 27 juegos usan **uno**. No porque los otros
 * sean malos: porque no se pueden repetir.
 *
 * ⚠️ EL DEFECTO ES SIEMPRE EL MISMO, Y NO ES UN DEFECTO DE DISEÑO
 * Un sistema que llama a `Math.random()` funciona perfectamente en una demo —
 * que es para lo que se escribió— y no sirve para nada que tenga que
 * reproducirse: una tirada de banco de pruebas, un informe de fallo, el recibo
 * de una partida. Misma semilla, otro mundo. Y entonces `{juego, semilla,
 * jugadas}` deja de reproducir la partida, que es la única afirmación sobre la
 * que descansa este proyecto entero.
 *
 * No hace falta reescribir nada. `BSPSystem` pasó de inservible a sostener dos
 * géneros con **cuatro líneas**: aceptar `config.rng` y usarlo. Todo el que ya
 * lo llamaba siguió funcionando igual.
 *
 * ⚠️ POR QUÉ ESTO ES UNA PRUEBA Y NO UNA LISTA DE TAREAS
 * Porque una lista de tareas envejece en silencio y un techo no. Este número
 * **sólo puede bajar**. Si sube es que alguien añadió un sistema con azar
 * incontrolado, y eso es justo lo que no queremos que pase callando — la misma
 * disciplina que mantiene la deuda del adaptador clavada en 19 mientras el
 * catálogo crecía de 19 a 27 juegos.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const RAIZ = join(AQUI, 'public/js/alisa-engine/src');

/**
 * ⚠️ TECHO DE SISTEMAS SIN SEMBRAR. Hoy son 7 de 54 (empezaron siendo 28).
 * Cada uno que acepte `rng` baja este número. **Nunca sube.**
 *
 * 2026-08-15: bajó de 23 a 16 sembrando CroupierSystem, TurretCombatSystem,
 * RoboticArmSystem, KatamariSystem, TrafficSystem, OrbitalKinematicsSystem y
 * NeuralDrivingSystem — mismo patrón que BSPSystem: `config.rng || Math.random`.
 *
 * 2026-08-16: bajó de 16 a 9 sembrando CabinetJumpscareSystem, IDMSystem,
 * PhantomFSMSystem, FlickerSystem, WorldBuilderSystem y CabinetEscapeSystem
 * (mismo patrón), más KinematicRageSystem —que YA tenía la semilla inyectable
 * pero con otro nombre, `config.azar`, que esta prueba no sabía buscar; se
 * renombró a `this.rng` (se dejó `config.azar` como alias por compatibilidad
 * con `arcade/js/protohub/render/volcar.js`, fuera de esta carpeta). Después
 * bajó de 9 a 7 sembrando TrafficSurvivalSystem (13 llamadas; de paso se le
 * pasó `rng` a su `IDMSystem` interno, que antes se construía sin semilla) y
 * FileSystemDioramaSystem (37 llamadas) — éste último es un objeto singleton
 * sin constructor, así que la fuente de azar se cachea en `init(config)`, que
 * es lo más parecido a un constructor que tiene: mismo patrón, otro sitio.
 *
 * ⚠️ QUEDAN 5 FUERA DE ALCANCE: ArachneIngestionSystem, GeppettoChoreographySystem
 * y PygmalionTopologySystem viven en `extensions/alisa-colony/avatar-pipeline/`;
 * SovereignAvatarSystem en `extensions/alisa-colony/plugins/`; SparkSystem en
 * `soma/plugins/`. Ninguno está bajo `world/`, así que sembrarlos es trabajo de
 * otra sesión (la mía tiene prohibido tocar fuera de `world/`).
 *
 * ⚠️ Y QUEDAN 2 DENTRO DE ALCANCE PERO NO SEMBRADOS A PROPÓSITO:
 *   AsteroidsSystem y CuccoGameSystem (con su base BulletHeavenEngine) NO
 *   aceptan `config.rng` cacheado en el constructor porque sus entornos del
 *   gym (`AsteroidsEnv._withSeed`, `CuccoSwarmEnv` + `DeterministicScope`)
 *   ya los hacen reproducibles sustituyendo el `Math.random` GLOBAL durante
 *   el episodio, y la construcción del sistema ocurre FUERA de ese tramo
 *   sembrado. Cachear `Math.random` en el constructor capturaría la versión
 *   sin sembrar y rompería silenciosamente el entorno — exactamente la clase
 *   de arreglo que parece bueno y no lo es. Se dejan así a propósito.
 */
const TECHO_SIN_SEMBRAR = 7;

const sistemas = [];
(function recorrer(dir) {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) { recorrer(p); continue; }
        if (!f.name.endsWith('System.js')) continue;
        const texto = readFileSync(p, 'utf-8');
        sistemas.push({
            nombre: f.name.replace('.js', ''),
            /**
             * Se busca la LLAMADA `Math.random(` y no la palabra suelta, para no
             * marcar a quien la deja como valor por defecto de un parámetro
             * inyectable —que es exactamente lo que hace un sistema ya arreglado.
             */
            azar: texto.includes('Math.random('),
            sembrado: /config\.rng|opts\.rng|this\.rng/.test(texto),
        });
    }
})(RAIZ);

const sinSembrar = sistemas.filter(s => s.azar && !s.sembrado);
const sembrados = sistemas.filter(s => s.sembrado);

/**
 * ⚠️ LOS MIXTOS: ACEPTAN SEMILLA **Y ADEMÁS** LLAMAN A `Math.random(`.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La cuenta de arriba es `azar && !sembrado`, así que un sistema que reciba `rng`
 * en algún sitio queda absuelto aunque tenga un `Math.random(` suelto en otro. Y
 * ése es igual de irreproducible que uno sin sembrar — **peor**, porque parece
 * arreglado: mismo `rng`, distinto mundo, y nadie sospecha del que ya tiene semilla.
 *
 * Lo encontró `prueba_de_las_pruebas.mjs` el 15-08-2026: metió un `Math.random()` en
 * `BoidsSystem` —uno de los que esta prueba lista como sembrados— y esta
 * comprobación siguió dándolo por bueno y contándolo entre los buenos.
 *
 * Hoy son **cero**, así que esto se cierra sin poner nada en rojo: es un trinquete
 * nuevo que nace apretado, que es la única forma en que un trinquete sirve.
 *
 * ⚠️ AVISO PARA QUIEN SIEMBRE SISTEMAS: ESTO LEE EL FICHERO ENTERO, COMENTARIOS
 *    INCLUIDOS. Al sembrar `RoboticArmSystem` (15-08) el comentario explicaba el
 *    cambio citando la llamada literal entre comillas, y esta comprobación la contó
 *    como una llamada de verdad: sistema sembrado + azar suelto = mixto, y en rojo.
 *
 *    Se deja así a propósito. Distinguir código de comentario aquí pide un analizador
 *    o una heurística, y una heurística que se equivoque al revés —callarse un
 *    `Math.random(` de verdad porque parecía un comentario— es mucho peor que este
 *    falso positivo, que se ve al momento y se arregla reformulando la frase.
 */
const mixtos = sistemas.filter(s => s.azar && s.sembrado);

console.log('\n¿Cuántos sistemas del motor se pueden meter en un banco de pruebas?\n');
console.log(`  ${sistemas.length} sistemas · ${sembrados.length} aceptan semilla · `
          + `${sinSembrar.length} con azar incontrolado`);
if (sembrados.length) console.log(`  ✓ sembrados: ${sembrados.map(s => s.nombre).join(', ')}`);

console.log(`\n${sinSembrar.length}/${sistemas.length} sistemas sin sembrar (techo: ${TECHO_SIN_SEMBRAR})`);
for (const s of sinSembrar) console.log(`  · ${s.nombre}`);

let fallos = 0;
if (mixtos.length) {
    fallos++;
    console.log(`\n  ✗ ${mixtos.length} sistema(s) aceptan semilla Y llaman a \`Math.random(\`:`);
    for (const s of mixtos) console.log(`      · ${s.nombre}`);
    console.log('    Un sistema medio sembrado no es reproducible, y encima lo parece:');
    console.log('    misma semilla, distinto mundo. Quita el `Math.random(` o pásale el `rng`.');
}
if (sinSembrar.length > TECHO_SIN_SEMBRAR) {
    fallos++;
    console.log(`\n  ✗ la deuda SUBIÓ: ${sinSembrar.length} > ${TECHO_SIN_SEMBRAR}.`);
    console.log(`    Un sistema nuevo con \`Math.random()\` no se puede medir, y por`);
    console.log(`    tanto no puede ser un entorno. Acepta \`config.rng\` como hace`);
    console.log(`    BSPSystem: son cuatro líneas y no rompe a quien ya lo llama.`);
} else if (sinSembrar.length < TECHO_SIN_SEMBRAR) {
    console.log(`\n  ↓ la deuda bajó. Actualiza TECHO_SIN_SEMBRAR a ${sinSembrar.length}.`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEGUNDA PARTE — ¿LOS ENTORNOS DEL GYM USAN DE VERDAD LA SEMILLA?
 *
 * Que un entorno se repita no demuestra nada por sí solo: si ignora la semilla,
 * las dos vueltas corren con el valor por defecto y salen idénticas por no haber
 * cambiado nada. **Reproducible e inerte se parecen mucho desde fuera.**
 *
 * Así que se pregunta lo contrario: semillas distintas, ¿mundos distintos? Un
 * entorno que siempre da el mismo episodio convierte una tanda de ochenta
 * semillas en una sola partida repetida ochenta veces — y la tabla dirá que la
 * medida es precisísima porque no varía. Es la enfermedad del `±0,00` una capa
 * más abajo.
 *
 * ⚠️ Y SE BARREN LAS ACCIONES, NO SE REPITE LA PRIMERA.
 * Costó tres intentos llegar aquí. Mirar sólo el estado inicial da un falso
 * positivo en cuanto el entorno esconde algo —el mapache de Chopper se coloca
 * con la semilla y precisamente NO se ve al empezar, que es el juego—. Y mirar
 * sólo la recompensa da un falso negativo, porque un barrido corto no llega a
 * cobrar. Hace falta barrer todas las acciones y comparar la observación entera.
 */
const { CATALOGO } = await import('./public/js/alisa-engine/src/gym/registro.js');

/** Entornos que hoy NO usan la semilla. **Esta lista sólo puede encoger.** */
const INERTES = ['alisa/RueDelPercebe-v0'];

async function huellaDe(Clase, semilla, pasos = 80) {
    const env = new Clase();
    const t = [JSON.stringify(env.reset(semilla) ?? null)];
    for (let i = 0; i < pasos; i++) {
        const acciones = env.legal_actions?.() ?? env.legalActions?.() ?? [0];
        const r = env.step(acciones[i % acciones.length]);
        t.push(JSON.stringify([r?.observation ?? r?.obs ?? null, r?.reward ?? 0, !!(r?.done ?? r?.terminated)]));
        if (r?.done || r?.terminated) break;
    }
    return t.join('|');
}

console.log('¿Los entornos nativos usan la semilla?\n');
const inertesHoy = [];
for (const e of CATALOGO.filter(x => x.familia === 'propio')) {
    try {
        const Clase = await e.cargar();
        const hs = [];
        for (const s of [1, 7, 991, 48291, 123456]) hs.push(await huellaDe(Clase, s));
        const mundos = new Set(hs).size;
        const repite = (await huellaDe(Clase, 7)) === hs[1];
        if (!repite) { fallos++; console.log(`  ✗ ${e.titulo.padEnd(20)} NO se repite con la misma semilla`); continue; }
        if (mundos === 1) inertesHoy.push(e.id);
        console.log(`  ${mundos > 1 ? '✓' : '·'} ${e.titulo.padEnd(20)} ${mundos}/5 mundos distintos`);
    } catch (err) {
        fallos++;
        console.log(`  ✗ ${e.titulo.padEnd(20)} ${String(err.message).slice(0, 50)}`);
    }
}

const nuevos = inertesHoy.filter(id => !INERTES.includes(id));
if (nuevos.length) {
    fallos++;
    console.log(`\n  ✗ entorno(s) que ignoran la semilla y no estaban declarados: ${nuevos.join(', ')}`);
    console.log(`    Un entorno inerte hace que N semillas sean una sola partida repetida N veces.`);
} else if (inertesHoy.length < INERTES.length) {
    console.log(`\n  ↓ un entorno inerte se arregló. Quítalo de INERTES.`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TERCERA PARTE — ¿ESTAMOS USANDO LO QUE YA TENEMOS?
 *
 * La regla del proyecto es reusar antes que crear, y si hay que crear, seguir el
 * estándar de lo que hay. Una regla así no sobrevive en la cabeza de nadie: se
 * cumple mientras alguien se acuerda y luego aparece la sexta copia de
 * Bresenham. Aquí se cuenta.
 *
 * Dos números, y los dos van en la dirección contraria a una deuda:
 *
 *   · **piezas del motor que usan los juegos** — sólo puede SUBIR. Empezó en 1
 *     (BSPSystem, y por accidente) y hoy son tres sistemas sosteniendo cinco
 *     juegos.
 *   · **copias de un mismo algoritmo** — no puede volver a aparecer una función
 *     que ya vive en `protohub/rejilla.js`. Escribí Bresenham tres veces y la
 *     búsqueda de camino cinco antes de darme cuenta; cada copia funcionaba, y
 *     por eso el fallo de una nunca llegaba a las otras.
 */
const RULES = join(AQUI, 'public/arcade/js/protohub/rules');
const COMPARTIDAS = ['hayLinea', 'primerPaso'];
const PIEZAS_MINIMAS = 3;

const reglas = readdirSync(RULES).filter(f => f.endsWith('.js'));
const piezas = new Set();
const copias = [];
for (const f of reglas) {
    const t = readFileSync(join(RULES, f), 'utf-8');
    // El último segmento de la ruta, no lo que sobre: `[\w/]*` es voraz y se
    // comía el nombre dejando una letra suelta. Un contador que cuenta mal es
    // peor que no contar, porque parece que cuenta.
    for (const m of t.matchAll(/alisa-engine\/src\/(?:[\w-]+\/)*([\w-]+)\.js/g)) piezas.add(m[1]);
    for (const n of COMPARTIDAS) {
        if (t.includes(`function ${n}(`)) copias.push(`${f}: ${n}`);
    }
}

console.log('\n¿Usamos lo que ya tenemos?\n');
console.log(`  piezas del motor usadas por los juegos: ${piezas.size} (mínimo ${PIEZAS_MINIMAS})`);
console.log(`    ${[...piezas].join(', ')}`);
if (piezas.size < PIEZAS_MINIMAS) {
    fallos++;
    console.log(`  ✗ bajó: había ${PIEZAS_MINIMAS} y quedan ${piezas.size}.`);
} else if (piezas.size > PIEZAS_MINIMAS) {
    console.log(`  ↑ subió. Actualiza PIEZAS_MINIMAS a ${piezas.size}.`);
}

/**
 * ⚠️ TECHO DE COPIAS DE «MARCAR DÓNDE PUEDES JUGAR», Y SÓLO PUEDE BAJAR.
 *
 * Esto ya vive en dos sitios legítimos: `Entrada.js` lo hace para los tableros
 * (y de paso resuelve el clic entero), y `protohub/marcas.js` para los
 * visualizadores que son MÓDULOS, que no pueden llamar a un script clásico.
 *
 * Aparte de esos dos hay copias a mano, cada una con su `marcas = []`, su
 * `borrarMarcas()` y su geometría. Ninguna ha divergido todavía — que es
 * justamente el momento de contarlas, porque la siguiente ya no se parecerá.
 *
 * Bajarlo es engancharlas a `Entrada.js`, que además les daría el clic hecho.
 * Lo que este techo impide es que aparezca una copia NUEVA mientras tanto.
 */
const VISUALIZADORES = join(AQUI, 'public/arcade/js');
const TECHO_MARCAS = 2;
const conMarcas = readdirSync(VISUALIZADORES)
    .filter(f => f.endsWith('_visualizer.js'))
    .filter(f => /function\s+borrarMarcas\s*\(/.test(readFileSync(join(VISUALIZADORES, f), 'utf-8')));

console.log(`\n  visualizadores con marcas propias: ${conMarcas.length} (techo ${TECHO_MARCAS})`);
if (conMarcas.length) console.log(`    ${conMarcas.join(', ')}`);
if (conMarcas.length > TECHO_MARCAS) {
    fallos++;
    console.log(`  ✗ subió: alguien ha vuelto a escribir a mano lo que hay en`);
    console.log(`    protohub/marcas.js. Impórtalo, no lo copies.`);
} else if (conMarcas.length < TECHO_MARCAS) {
    console.log(`  ↓ bajó. Actualiza TECHO_MARCAS a ${conMarcas.length}.`);
}

if (copias.length) {
    fallos++;
    console.log(`\n  ✗ algoritmo copiado en vez de importado de protohub/rejilla.js:`);
    for (const c of copias) console.log(`      ${c}`);
    console.log(`    Cada copia funciona, y ése es el problema: el día que se arregle`);
    console.log(`    una, las otras seguirán mal. Ya pasó con la política oscilante de`);
    console.log(`    sokoban, que renació calcada en la cabina.`);
} else {
    console.log(`  ✓ sin copias de ${COMPARTIDAS.join(' ni ')} en las reglas`);
}

console.log(fallos ? '\n  ✗ semillas: hay algo que no se puede medir\n' : '\n  ✓ semillas: la deuda no crece, los entornos usan su semilla y no hay copias\n');
process.exit(fallos ? 1 : 0);
