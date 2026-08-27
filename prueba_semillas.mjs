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
 * ⚠️ TECHO DE SISTEMAS SIN SEMBRAR. Hoy son 2 de 54 (empezaron siendo 28).
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
 * Después bajó de 7 a 2 sembrando los cinco que antes quedaban fuera de
 * `world/` (esa prohibición ya se levantó): ArachneIngestionSystem y
 * GeppettoChoreographySystem reusan su `uiConfig` de siempre para llevar
 * `.rng`; SovereignAvatarSystem ya tenía un `options` propio; SparkSystem no
 * tenía ningún objeto de configuración así que ganó uno (`config = {}`); y
 * PygmalionTopologySystem tampoco —su constructor son seis callbacks
 * posicionales— así que se le añadió un séptimo parámetro `config = {}` al
 * final, compatible con quien ya lo llama con seis. Pygmalion además
 * construye su propio `SparkSystem` interno, y ahora le pasa el mismo `rng`
 * (`new SparkSystem(this.scene, { rng: this.rng })`) para que ambos compartan
 * un único flujo de azar — el mismo gesto que ya se hizo con `TrafficSurvivalSystem`
 * → `IDMSystem`.
 *
 * ⚠️ QUEDAN 2 DENTRO DE ALCANCE PERO NO SEMBRADOS A PROPÓSITO:
 *   AsteroidsSystem y MarabuntaSystem (con su base BulletHeavenEngine) NO
 *   aceptan `config.rng` cacheado en el constructor porque sus entornos del
 *   gym (`AsteroidsEnv._withSeed`, `MarabuntaEnv` + `DeterministicScope`)
 *   ya los hacen reproducibles sustituyendo el `Math.random` GLOBAL durante
 *   el episodio, y la construcción del sistema ocurre FUERA de ese tramo
 *   sembrado. Cachear `Math.random` en el constructor capturaría la versión
 *   sin sembrar y rompería silenciosamente el entorno — exactamente la clase
 *   de arreglo que parece bueno y no lo es. Se dejan así a propósito.
 */
/**
 * ⚠️ Y CON ESO, ESTE TRINQUETE HA TOCADO SUELO: **2 NO ES DEUDA, ES EL FONDO.**
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Empezó en 28 y bajó hasta 2. Aquí decía que esos dos últimos —Asteroids y
 * Marabunta— NO había que sembrarlos, y avisaba: *«si BAJA de 2, alguien los sembró
 * y rompió su determinismo en silencio»*.
 *
 * ⚠️ EL AVISO ERA BUENO Y LA CONCLUSIÓN ERA FALSA, Y SE HA COMPROBADO SEMBRANDO.
 *
 * El 24-08 se sembró `AsteroidsSystem` —32 llamadas al azar enrutadas a su `rng`— y
 * su determinismo NO se rompió: las tres notas publicadas de Pedrisco salieron
 * idénticas antes y después (1234 → 30,5000 · 7 → 50,4850 · 99 → 0,2333), medidas
 * a propósito ANTES de tocar nada. Lo que no se podía era sembrarlo *a ciegas*; con
 * la medida delante, sí.
 *
 * Se deja escrito el aviso viejo porque su instinto era correcto —un trinquete cuyo
 * texto dice «sólo puede bajar» invita a bajarlo sin mirar— y lo que cambia es el
 * método, no la prudencia: **se baja midiendo las notas antes y después, o no se
 * baja**.
 *
 * ⚠️ Y LOS DOS QUE QUEDAN NO SON DEUDA: SON DECISIONES, Y VAN CON SU MOTIVO.
 */
const NO_SE_SIEMBRAN = {
    TerminalUIEngine:
        'no es un motor de juego: es la interfaz del terminal de la colonia, en '
      + '`extensions/alisa-colony/`. Su azar no decide ninguna partida',
};
const MEDIO_SEMBRADOS = {
    MarabuntaSystem:
        'depende del parche global A PROPÓSITO: `MarabuntaEnv` llama a '
      + '`DeterministicScope.run(seed + steps, …)` en CADA paso, o sea que re-siembra '
      + 'el mundo a cada tick. Ése es su modelo de determinismo y sus notas publicadas '
      + '(1234 → 3,0000 · 7 → 2,5000) salen de ahí. Darle un generador propio las '
      + 'cambiaría — comprobado: de 3,0000 a 6,0000',
};

// 24-08: uno, y declarado. Antes 2, y por otro motivo.
const TECHO_SIN_SEMBRAR = Object.keys(NO_SE_SIEMBRAN).length;

const sistemas = [];
(function recorrer(dir) {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) { recorrer(p); continue; }
        /**
         * ⚠️ TAMBIÉN LOS `…Engine.js` Y LOS `…Core.js`. ANTES SÓLO `…System.js`.
         *
         * Esta casa nombra sus motores de tres maneras —`System`, `Engine`,
         * `Core`— y esta prueba sólo miraba una. Con eso, la mitad del motor no
         * tenía guardia: `InteractionLabEngine` llevaba SIETE `Math.random()` sin
         * sembrar y ninguna pasada lo dijo nunca. Y es el motor de ¡Sobrevive! 1.
         *
         * El fallo es el de siempre en este proyecto —un universo recortado que
         * suspende perfectamente dentro de su recorte— y el sabotaje es ciego a
         * él: se puede romper un `System.js` y la prueba lo caza, mientras un
         * `Engine.js` roto pasa de largo sin que nadie note el hueco.
         */
        if (!/(System|Engine|Core)\.js$/.test(f.name)) continue;
        const bruto = readFileSync(p, 'utf-8');
        /**
         * ⚠️ SIN COMENTARIOS, O ESTA PRUEBA ACUSA A QUIEN CUENTA CÓMO SE ARREGLÓ.
         *
         * Leía el fichero entero, comentarios incluidos. El 24-08, al sembrar
         * `AsteroidsSystem`, la prueba lo siguió marcando cuando ya no le quedaba
         * un solo `Math.random(` ejecutable: lo que encontraba eran las cuatro
         * menciones del comentario que explica **por qué** se le quitaron.
         *
         * O sea que documentar bien el arreglo hacía fallar la prueba del
         * arreglo. Eso empuja a escribir comentarios pobres para que el guardia
         * calle, que es justo lo contrario de lo que quiere esta casa.
         *
         * Es la tercera vez el mismo día que un detector lee prosa y la toma por
         * código —`motores.mjs` acusó a dos motores de no ser headless leyendo el
         * comentario «No THREE.js dependencies»—. Un detector que lee comentarios
         * mide lo que el fichero DICE, no lo que HACE.
         */
        const texto = bruto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        sistemas.push({
            nombre: f.name.replace('.js', ''),
            /**
             * Se busca la LLAMADA `Math.random(` y no la palabra suelta, para no
             * marcar a quien la deja como valor por defecto de un parámetro
             * inyectable —que es exactamente lo que hace un sistema ya arreglado.
             *
             * ⚠️ Y SE PERDONA EL RESPALDO ENVUELTO, QUE ES EL PATRÓN CORRECTO.
             *
             * `config.rng || (() => Math.random())` ES una llamada, así que esta
             * prueba lo marcaba — y marcaba justo la forma BUENA. La referencia
             * pelada (`|| Math.random`) captura la función global al construir, de
             * modo que un parche posterior de `DeterministicScope` no llega nunca;
             * envolverla en una llamada es lo único que hace que el parche mande.
             *
             * Medido el 24-08 con el global parcheado a `() => 0.5`: el que
             * captura devolvió 0,2308 —azar de verdad— y el envuelto 0,5000. Ese
             * `||` ya cambió una vez las notas publicadas de Marabunta.
             *
             * O sea que aquí la prueba suspendía a 27 motores por hacer lo
             * correcto. Se quita el respaldo envuelto ANTES de contar: lo que
             * queda es azar de verdad sin sembrar.
             */
            azar: texto.replace(/\|\|\s*\(\(\)\s*=>\s*Math\.random\(\)\)/g, '')
                       .includes('Math.random('),
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
for (const s of sinSembrar) {
    const razon = NO_SE_SIEMBRAN[s.nombre];
    console.log(`  ${razon ? '·' : '✗'} ${s.nombre}${razon ? '' : '  ← sin declarar'}`);
    if (razon) console.log(`      ${razon}`);
}

let fallos = 0;
/**
 * ⚠️ LOS DECLARADOS NO CUENTAN COMO FALLO, PERO SE IMPRIMEN IGUAL.
 *
 * Una excepción silenciosa se convierte en costumbre. Ésta se ve en cada pasada,
 * con su motivo al lado, para que quien la lea pueda discutirla — que es lo que
 * distingue una decisión de un descuido con antigüedad.
 */
const mixtosSinDeclarar = mixtos.filter(s => !MEDIO_SEMBRADOS[s.nombre]);
for (const s of mixtos.filter(s => MEDIO_SEMBRADOS[s.nombre])) {
    console.log(`\n  · ${s.nombre} acepta semilla y llama al azar global, DECLARADO:`);
    console.log(`      ${MEDIO_SEMBRADOS[s.nombre]}`);
}
if (mixtosSinDeclarar.length) {
    fallos++;
    console.log(`\n  ✗ ${mixtosSinDeclarar.length} sistema(s) aceptan semilla Y llaman a \`Math.random(\`:`);
    for (const s of mixtosSinDeclarar) console.log(`      · ${s.nombre}`);
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
const { CATALOGO } = await import('./public/js/alisa-engine/src/gym/registry.js');

/** Entornos que hoy NO usan la semilla. **Esta lista sólo puede encoger.** */
const INERTES = ['alisa/CorpBuilding-v0'];

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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ Y UNA MEZCLA QUE SE BORRABA A SÍ MISMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `randomPolicy(semilla)` empezaba con `semilla ^ K` y seguía con `^ env.seed`.
 * Con las dos semillas iguales eso es `(s ^ K) ^ s`, que vale `K` para cualquier
 * `s`: la semilla se borraba y TODOS los episodios jugaban la misma partida.
 *
 * Y pasarle la misma semilla del episodio es lo primero que escribe cualquiera.
 * Los juegos con azar propio lo disimulan —al menos cambia el reparto— y los
 * deterministas lo enseñan entero: go, reversi y mancala salían con exactamente
 * un tercio de posiciones distintas en tres semillas, o sea una partida repetida
 * tres veces. Lo encontré midiendo otra cosa, y parecía un fallo de lo que estaba
 * midiendo.
 *
 * Encaja aquí porque es exactamente lo que este fichero vigila: algo que no se
 * puede medir porque su azar no obedece a la semilla. Sólo que el azar de esta
 * no venía de `Math.random`, sino de una identidad de álgebra de bits.
 *
 * Se comprueba con un juego DETERMINISTA a propósito: si el juego trae su propio
 * azar, el reparto tapa el fallo y la comprobación aprobaría con el cable cortado.
 */
{
    const { CATALOGO, randomPolicy } = await import('./public/js/alisa-engine/src/gym/registry.js');
    const entrada = CATALOGO.find(e => e.juego === 'reversi');
    const Clase = entrada && await entrada.cargar().catch(() => null);
    if (!Clase) {
        console.log('  · no se pudo cargar reversi para medir la mezcla de `randomPolicy`');
    } else {
        const traza = (s) => {
            const env = new Clase();
            env.reset(s);
            const pol = randomPolicy(s);           // ⚠️ LA MISMA: es el caso que falla
            const pasos = [];
            for (let k = 0; k < 12 && !env.done; k++) {
                const obs = env.getObservation();
                pasos.push(String(pol(obs, env)));
                env.step(pasos[pasos.length - 1]);
            }
            return pasos.join('|');
        };
        if (traza(3) === traza(11)) {
            fallos++;
            console.log('  ✗ `randomPolicy(s)` con `reset(s)` juega la MISMA partida con dos semillas.');
            console.log('    La mezcla se está cancelando: `(s ^ K) ^ s` vale K para cualquier s.');
            console.log('    Multiplica antes de meter `env.seed`, para difundir la semilla.');
        } else {
            console.log('  ✓ `randomPolicy` no se cancela cuando le pasan la semilla del episodio');
        }
    }
}

console.log(fallos ? '\n  ✗ semillas: hay algo que no se puede medir\n' : '\n  ✓ semillas: la deuda no crece, los entornos usan su semilla y no hay copias\n');
process.exit(fallos ? 1 : 0);
