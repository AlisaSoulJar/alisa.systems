/**
 * prueba_de_las_pruebas.mjs — ¿saben fallar nuestras comprobaciones?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_de_las_pruebas.mjs            todas
 *     node prueba_de_las_pruebas.mjs repetidor  una
 *
 * ⚠️ POR QUÉ EXISTE: EN UN SOLO DÍA, CINCO INSTRUMENTOS MINTIERON.
 *
 * No uno. Cinco, el 15-08-2026, y ninguno daba error — todos salían en verde:
 *
 *   · `prueba_repetidor` aprobaba `crearRepetidorZZZ` porque buscaba
 *     `crearRepetidor` y una cadena contiene a la otra;
 *   · `prueba_teclado` aprobó DOS veces seguidas con el cable cortado: primero
 *     porque el nombre saboteado seguía apareciendo en el fichero, y luego porque
 *     la DEFINICIÓN de la función se hacía pasar por una llamada;
 *   · la comprobación de valor de `legibilidad` no saltaba ni con el umbral a 200,
 *     porque estaba dentro de un bucle que descartaba antes casi todos los pares;
 *   · `tacto` medía si el estado cambiaba al pulsar, y en los juegos con reloj
 *     propio el estado lo cambia el reloj: sus 5/5 eran tan casuales como sus 3/5;
 *   · y una medida mía del «tablero tapado» daba 20 % antes del arreglo y 31 %
 *     después, con la imagen claramente mejor, porque metía las LUCES en la caja.
 *
 * Cinco en un día es un patrón, no mala suerte. Y todos comparten forma: **nadie
 * había comprobado nunca que pudieran suspender**. Una comprobación que no puede
 * fallar no es una comprobación: es una frase que sale en verde.
 *
 * ⚠️ QUÉ HACE ESTO, Y POR QUÉ NO ES «PROBAR LAS PRUEBAS» POR DEPORTE.
 *
 * Para cada comprobación de `npm test` hay un SABOTAJE declarado: un cambio
 * concreto que rompe justo lo que esa prueba dice vigilar. Se aplica, se corre la
 * prueba, y **tiene que suspender**. Si sale verde con el cable cortado, la prueba
 * está muerta y este fichero lo dice.
 *
 * Es la disciplina que hoy he aplicado a mano cinco veces, automatizada — porque
 * hacerlo a mano depende de que me acuerde, y hoy se me olvidó dos veces seguidas
 * en el mismo fichero.
 *
 * ⚠️ CÓMO SE PROTEGEN LOS FICHEROS DE VERDAD.
 *
 * El sabotaje toca ficheros del proyecto. Antes se guarda el contenido, se
 * restaura SIEMPRE —pase lo que pase— y al final se verifica que todo quedó como
 * estaba comparando el texto. Si algo no se pudo restaurar, se dice a gritos y se
 * sale con error: es preferible un susto a dejar un sabotaje puesto.
 *
 * Y todo esto es recuperable con git, que es la red de debajo.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * Cada entrada dice: qué prueba, qué fichero romper, y con qué cambio.
 *
 * ⚠️ EL SABOTAJE TIENE QUE ROMPER LO QUE ESA PRUEBA VIGILA, NO CUALQUIER COSA.
 *
 * Meter un error de sintaxis haría suspender a cualquiera y no demostraría nada:
 * probaría que node sabe leer. Cada sabotaje de aquí es el fallo REAL contra el que
 * se escribió la prueba — quitarle las normas al enlace, dejar que las teclas jueguen
 * mientras escribes, cambiar el sello de versión.
 */
const SABOTAJES = [
    {
        nombre: 'repetidor',
        corre: 'node prueba_repetidor.mjs',
        fichero: 'public/arcade/js/protohub/enlace_repetidor.js',
        de: '.filter(([, v]) => v === true)',
        a: '.filter(() => false)',
        vigila: 'que el enlace lleve las normas variables (damas se repetía con otras reglas)',
    },
    {
        nombre: 'teclado',
        corre: 'node prueba_teclado.mjs',
        fichero: 'public/arcade/js/Entrada.js',
        de: 'if (estaEscribiendo()) return;',
        a: '',
        vigila: 'que escribir una frase no juegue la partida',
    },
    {
        nombre: 'final',
        corre: 'node prueba_final.mjs',
        fichero: 'public/arcade/js/protohub/ProtoHub.js',
        de: "if (jugada === 'nueva' || jugada === 'reset') {",
        a: "if (jugada === '@nunca@') {",
        vigila: 'que al terminar una partida se pueda empezar otra',
    },
    {
        nombre: 'css',
        corre: 'node prueba_css.mjs',
        fichero: 'public/arcade/css/jugables.css',
        de: '.repetir-mandos {',
        a: '/* .repetir-mandos {',
        vigila: 'que un comentario sin cerrar no se coma las reglas de debajo',
    },
    {
        nombre: 'version',
        corre: 'node prueba_version.mjs',
        fichero: 'public/arcade/js/montarMesa.js',
        de: 'const VERSION',
        a: 'const VERSION_X',
        vigila: 'que el sello del `?v=` corresponda al código que hay en disco',
    },
    {
        nombre: 'censo',
        corre: 'node prueba_censo.mjs',
        fichero: 'public/js/alisa-engine/src/gym/registro.js',
        /**
         * ⚠️ ÉSTE ES EL PRIMER SABOTAJE DE ENUMERACIÓN, Y ES OTRA COSA QUE LOS DEMÁS.
         *
         * Los quince de arriba rompen una CONDICIÓN y esperan que la comprobación la
         * eche de menos. Éste rompe el UNIVERSO: le cambia el nombre a un juego del
         * catálogo, de modo que el conjunto medido sigue teniendo treinta y cinco
         * elementos pero ya no es el mismo conjunto.
         *
         * Se hace así a propósito, y es la parte que enseña algo: si `prueba_censo`
         * comparara sólo el TOTAL, este sabotaje pasaría —35 y 35— y la comprobación
         * parecería sana. Compara la lista, así que dice «existen y no se miden: oca»
         * y «se miden y no existen: oca_FUERA».
         */
        de: "'oca'",
        a: "'oca_FUERA'",
        vigila: 'que los medidores midan sobre todos los juegos que hay',
    },
    {
        nombre: 'fichas',
        corre: 'node --import ./resolver_three.mjs prueba_fichas.mjs',
        fichero: 'public/arcade/js/protohub/rules/bazas.js',
        /**
         * El fallo real: que la ficha PROMETA algo que el juego no cumple. Se le
         * cambia el número de sillas a la familia de bazas —que reparte a cuatro— y
         * tiene que saltar con nombre y cifra, no con un «algo no cuadra».
         *
         * Se sabotea aquí y no en un juego suelto porque esta fábrica sirve a cuatro
         * a la vez: si la comprobación sólo mirara uno, el sabotaje se notaría igual
         * y no se vería que cubre a los cuatro.
         */
        de: 'ASIENTOS: jugadores,',
        a: 'ASIENTOS: 3,',
        vigila: 'que la ficha de cada juego no prometa lo que el juego no cumple',
    },
    {
        nombre: 'fichas·rutas',
        corre: 'node --import ./resolver_three.mjs prueba_fichas.mjs',
        fichero: 'public/data/fichas.json',
        /**
         * ⚠️ DOS SABOTAJES PARA EL MISMO FICHERO, Y HACE FALTA.
         *
         * `prueba_fichas` vigila ahora dos cosas distintas: que lo declarado coincida
         * con lo que hace el juego, y que las rutas que promete la ficha SE PUEDAN
         * PEDIR. Con un solo sabotaje, la segunda estaría sin cubrir — y es justo la
         * que acaba de fallar en los 35 sin que nadie lo notara: la ficha apuntaba a
         * `capturas_laboratorio/`, que está en `.gitignore`, así que prometía treinta y
         * cinco imágenes que desde el sitio dan 404. Un sabotaje que no se nota es un
         * hueco de cobertura, no mala puntería.
         *
         * Se rompe la ruta en el JSON PUBLICADO, que es exactamente la forma del fallo:
         * el fichero está en mi disco y no en lo que se sirve.
         */
        de: '"/capturas/snake.png"',
        a: '"/capturas/snake_FUERA.png"',
        vigila: 'que lo que la ficha promete se pueda pedir, y no sólo exista en mi disco',
    },
    {
        nombre: 'clasificacion',
        corre: 'node prueba_clasificacion.mjs',
        fichero: 'public/clasificacion.html',
        /**
         * El fallo REAL contra el que se escribió: que alguien corra `tabla.mjs` sin
         * `--html` y la página se quede con los números de una medida anterior. Así
         * que el sabotaje es exactamente eso —cambiar un número publicado— y no un
         * destrozo del HTML, que haría suspender a cualquier comprobación.
         *
         * `0.00` es la mediana del suelo, que vale eso por definición: es el número
         * más estable de la tabla y no depende de qué salga en la medición del día.
         */
        de: '<td class="n"><b>0.00</b>',
        a: '<td class="n"><b>0.42</b>',
        vigila: 'que la clasificación publicada sea la que se midió',
    },
    {
        nombre: 'objetivo',
        corre: 'node prueba_objetivo.mjs',
        fichero: 'public/arcade/js/protohub/rules/damas.js',
        // Va dentro del objeto de reglas, no como `export const`: lo comprobé
        // mirándolo, que es la única forma de que un sabotaje encaje de verdad.
        de: '    OBJETIVO:',
        a: '    OBJETIVO_QUITADO:',
        vigila: 'que cada juego diga a qué se juega',
    },
    {
        nombre: 'biblioteca',
        corre: 'node prueba_biblioteca.mjs',
        fichero: 'public/arcade/data/card_library.json',
        de: '"spanish_40"',
        a: '"spanish_40_ROTA"',
        vigila: 'que los juegos de cartas lean el catálogo que se les indica',
    },
    {
        nombre: 'barajas',
        corre: 'node prueba_barajas.mjs',
        fichero: 'public/arcade/js/protohub/rules/gofish.js',
        /**
         * ⚠️ ES OTRA PREGUNTA QUE LA DE `biblioteca`, Y POR ESO OTRO SABOTAJE.
         *
         * Aquélla comprueba que los juegos LEEN el catálogo que se les pasa. Ésta,
         * que cogen de él LA BARAJA QUE LES TOCA. Un juego francés que pidiera la
         * española leería el catálogo impecablemente y repartiría oros en una mesa de
         * póker, y `biblioteca` lo saludaría en verde: verifica su condición, y su
         * condición no es la que importa.
         *
         * El sabotaje es literalmente ese fallo — al gofish se le da la española — y
         * tiene que salir «declara french_52 y reparte spanish_40».
         */
        de: "cargarBaraja('french_52', url)",
        a: "cargarBaraja('spanish_40', url)",
        vigila: 'que cada juego reparta la baraja que la biblioteca le asigna',
    },
    {
        nombre: 'reglas',
        corre: 'node prueba_reglas.mjs',
        fichero: 'public/arcade/js/protohub/rules/azar.js',
        /**
         * El generador sembrado, convertido en azar de verdad. Es EL fallo contra el
         * que existe media suite: sin determinismo, `{juego, semilla, jugadas}` deja
         * de reproducir la partida y con eso se cae el producto entero. Y el propio
         * fichero avisa de que siete copias de esto eran «una escopeta cargada
         * apuntando al producto» — esto comprueba que el gatillo se oye.
         */
        de: 'let a = semilla >>> 0;',
        a: 'let a = semilla >>> 0; return Math.random;',
        vigila: 'que la misma semilla dé siempre la misma partida',
    },
    {
        nombre: 'lenguaje',
        corre: 'node prueba_lenguaje.mjs',
        fichero: 'public/arcade/js/protohub/descripcion.js',
        // Se deja mudo al narrador: es exactamente el fallo contra el que nació esa
        // prueba —«los 19 juegos jugaban a ciegas»—.
        de: 'export function describirEstado',
        a: 'export function describirEstado(...__a) { return ""; }\nfunction __viejo',
        vigila: 'que cada juego sepa contar su estado a un agente sin vista',
    },
    {
        nombre: 'sustrato',
        corre: 'node prueba_sustrato.mjs',
        fichero: 'public/arcade/js/protohub/rules/damas.js',
        de: '    sustrato',
        a: '    sustrato_QUITADO',
        vigila: 'que el estado sea una matriz plana y no lo pierda ningún juego',
    },
    {
        nombre: 'openapi',
        corre: 'node prueba_openapi.mjs',
        fichero: 'public/openapi.json',
        de: '"/api/verificar"',
        a: '"/api/verificar_QUITADA"',
        vigila: 'que las puertas declaradas y las que existen sean las mismas',
    },
    {
        nombre: 'funcion',
        corre: 'node prueba_funcion.mjs',
        fichero: 'functions/api/verificar.js',
        /**
         * El verificador de servidor, dando por buena cualquier partida. Es la
         * trampa que sostiene el corpus: si esto se cae, entra basura y nadie se
         * entera — que es literalmente lo que ese fichero dice impedir.
         */
        de: "import { verificar, puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';",
        a: "import { verificar as __v, puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';\n"
         + "const verificar = () => ({ valida: true, puntos: 999999, terminada: true });",
        vigila: 'que el verificador de servidor cace las partidas infladas',
    },
    {
        nombre: 'gym_envs',
        corre: 'node check_gym_envs.mjs',
        fichero: 'public/js/alisa-engine/src/gym/ProtoHubEnv.js',
        /**
         * ⚠️ AQUÍ FALLÉ LA PUNTERÍA DOS VECES, Y ES EL ERROR TÍPICO DE ESTE FICHERO.
         *
         * Primero cambié `juego: 'ajedrez'` en el catálogo: la prueba aprobó, porque
         * enumera el catálogo y construye cada entorno — un nombre distinto se
         * construye igual. Luego puse `reset(` a secas, que aparece también en un
         * COMENTARIO del fichero, así que el reemplazo cayó donde no debía.
         *
         * El sabotaje tiene que romper lo que la prueba MIRA. Aquí es el contrato que
         * sí comprueba: `reset(seed)` devolviendo una observación vacía.
         */
        de: 'reset(seed = 0) {',
        a: 'reset(seed = 0) { return []; }\n    __resetViejo(seed = 0) {',
        vigila: 'que los entornos del banco se puedan enumerar, cargar y jugar',
    },
    {
        nombre: 'semillas',
        corre: 'node --import ./resolver_three.mjs prueba_semillas.mjs',
        fichero: 'public/js/alisa-engine/src/world/systems/BoidsSystem.js',
        /**
         * Un `Math.random(` dentro de un fichero `*System.js` del motor — que es
         * literalmente lo que esa prueba busca recorriendo el árbol, y BoidsSystem
         * es uno de los que hoy da por SEMBRADOS, así que ensuciarlo sube la deuda.
         *
         * Dos intentos fallidos antes: `rules/azar.js` (es el generador de las
         * REGLAS, no un sistema del motor) y `ProceduralKinematics.js` (no acaba en
         * `System.js`, así que el recorrido ni lo abre). Las dos veces la prueba
         * aprobó con razón y yo estuve a punto de acusarla.
         */
        de: 'export',
        a: 'const __ruido = () => Math.random();\nexport',
        vigila: 'que los sistemas del motor usen su semilla y no `Math.random`',
    },
    {
        nombre: 'preflight',
        corre: 'python preflight.py',
        /**
         * ⚠️ SE SABOTEA EL PAQUETE, NO `public/`. LO DICE SU PROPIO CÓDIGO:
         *
         *     medido = PAQUETE if hay_paquete else PUBLIC
         *
         * O sea que en cuanto existe `dist_publico` —y existe en cuanto alguien
         * empaqueta— `preflight` mide ESO y no las fuentes. Metí el CDN en
         * `public/arcade/index.html` y la prueba aprobó tan tranquila: no estaba
         * muerta, es que yo le estaba rompiendo un fichero que no mira.
         *
         * Es el mismo error que cometí con el gym, y explica por qué este fichero
         * distingue «no sabe fallar» de «el sabotaje no encaja»: hace falta una
         * tercera categoría, «el sabotaje no apunta donde mira la prueba», y la
         * única forma de detectarla es entender qué mide cada una antes de
         * declararle un sabotaje.
         */
        corre_solo_si: 'dist_publico',
        fichero: 'dist_publico/arcade/index.html',
        de: '<link rel="stylesheet" href="css/arcade.css">',
        a: '<link rel="stylesheet" href="css/arcade.css">\n'
         + '<script src="https://cdn.jsdelivr.net/npm/roto@1"></script>',
        vigila: 'que ninguna página del PAQUETE cargue código desde un CDN',
    },
];

/**
 * Corre un comando y devuelve si SUSPENDIÓ. No se mira la salida: se mira el código
 * de salida, que es el contrato de `npm test` — si una prueba no sale con error, la
 * cadena entera sigue y el fallo pasa.
 */
function suspende(cmd) {
    return new Promise((res) => {
        const [bin, ...args] = cmd.split(' ');
        const p = spawn(bin, args, { shell: true, stdio: 'ignore' });
        p.on('close', (code) => res(code !== 0));
        p.on('error', () => res(true));
    });
}

const pedidos = process.argv.slice(2);
const lista = pedidos.length
    ? SABOTAJES.filter(s => pedidos.includes(s.nombre))
    : SABOTAJES;

console.log('\n¿SABEN FALLAR NUESTRAS COMPROBACIONES?');
console.log(gris('  se rompe a propósito lo que cada una vigila, y tiene que suspender\n'));

let malas = 0, sinRestaurar = [];

for (const s of lista) {
    const original = await readFile(s.fichero, 'utf8').catch(() => null);
    if (original === null) {
        console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} no existe ${s.fichero}`);
        malas++;
        continue;
    }
    if (!original.includes(s.de)) {
        /**
         * Que el sabotaje ya no encaje NO es un detalle: significa que el código
         * cambió y este fichero se quedó atrás. Un sabotaje que no se aplica haría
         * pasar la prueba por buena sin haberla probado, que es exactamente el fallo
         * que este instrumento existe para cazar — cometido aquí dentro.
         */
        console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} el sabotaje ya no encaja: falta «${s.de.slice(0, 40)}»`);
        console.log(gris(`      el código cambió y este fichero no. Hay que actualizar el sabotaje.`));
        malas++;
        continue;
    }

    let restaurado = false;
    try {
        await writeFile(s.fichero, original.split(s.de).join(s.a));
        const suspendio = await suspende(s.corre);
        await writeFile(s.fichero, original);
        restaurado = true;

        if (suspendio) {
            console.log(`  ${verde('✓')} ${s.nombre.padEnd(12)} suspende ${gris('— ' + s.vigila)}`);
        } else {
            console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} ${rojo('APRUEBA CON EL CABLE CORTADO')}`);
            console.log(gris(`      dice vigilar: ${s.vigila}`));
            console.log(gris(`      se rompió: ${s.fichero} · «${s.de.slice(0, 50)}»`));
            malas++;
        }
    } finally {
        if (!restaurado) {
            // Segundo intento pase lo que pase: dejar un sabotaje puesto sería
            // muchísimo peor que cualquier fallo que esto pueda encontrar.
            await writeFile(s.fichero, original).catch(() => sinRestaurar.push(s.fichero));
        }
        const ahora = await readFile(s.fichero, 'utf8').catch(() => null);
        if (ahora !== original) sinRestaurar.push(s.fichero);
    }
}

if (sinRestaurar.length) {
    console.log(`\n${rojo('⚠️  NO SE PUDO DEVOLVER A SU SITIO:')}`);
    for (const f of sinRestaurar) console.log(rojo(`      ${f}`));
    console.log(rojo('   RECUPÉRALOS CON `git checkout -- <fichero>` ANTES DE SEGUIR.'));
    process.exit(2);
}

/**
 * Las que todavía no tienen sabotaje se dicen, no se callan. Un «8 de 8 saben
 * fallar» que esconde que hay siete sin mirar es la misma clase de media verdad que
 * este fichero persigue.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL CENSO SE DERIVA. ANTES ERA UNA LISTA A MANO, Y SE QUEDÓ VIEJA.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Aquí había un array `TODAS` con los nombres escritos a mano. Es la enésima lista
 * de este proyecto que se separa de la realidad en silencio — y ésta era la peor,
 * porque es la lista de la red de seguridad.
 *
 * Lo destapó una auditoría externa (Fable, 16-08) con un diagnóstico que no habíamos
 * visto: **todos nuestros errores son de DENOMINADOR, no de predicado.** Toda esta
 * maquinaria vigila si una condición detecta su fallo; ninguna pieza vigilaba si el
 * conjunto sobre el que se mide es el conjunto que existe. Y el sabotaje es
 * estructuralmente ciego a esa clase: una prueba con el universo recortado **sigue
 * sabiendo suspender perfectamente dentro de su universo recortado**. Que este mismo
 * fichero cazara el «6 de 41» de `check_gym_envs` fue un accidente afortunado —el
 * sabotaje cayó justo en la zona no mirada— y nunca se convirtió en mecanismo.
 *
 * Al derivar el censo salieron a la primera DOS guardianes huérfanos: `prueba_fichas`
 * —escrita esa misma mañana, la que vigila que la ficha no mienta— y
 * `prueba_variantes`, que impide que el verificador acepte una partida jugada con
 * otras normas. Existían, pasaban, y no las corría nadie. La duplicación que el
 * proyecto daba por «vigilada» estaba vigilada por un guardia al que nadie pasaba
 * lista.
 *
 * Tres alarmas, y las tres salen de comparar tres conjuntos que deberían coincidir:
 * los ficheros que hay, los que corre `npm test`, y los que tienen sabotaje.
 */
const { readdir } = await import('node:fs/promises');

/**
 * Las que NO van en `npm test`, con su motivo. La lista es corta a propósito: cada
 * entrada aquí es una comprobación que nadie corre por defecto, o sea una que se
 * puede pudrir sin que salte. Sólo entran las que abren navegadores para los 35
 * juegos —minutos por pasada— y por eso tienen su propio `npm run`.
 *
 * Estar aquí NO es un permiso para olvidarlas: es una deuda declarada. Si alguna
 * deja de correrse nunca, mejor traerla a `npm test` aunque tarde.
 */
const APARTE = new Set([
    'prueba_de_las_pruebas.mjs',   // es esto mismo: se corre con `npm run pruebas`
    'prueba_vistas.mjs',           // abre los 35 en un navegador: `npm run vistas`
    'prueba_verbos.mjs',           // abre los 35 en un navegador: `npm run verbos`
    'prueba_portal.mjs',           // abre las 35 fichas en un navegador: `npm run portal`
    // Mide, no comprueba: juega cada juego con topes crecientes para averiguar cuántas
    // decisiones necesita y lo escribe en `topes.json`. No tiene veredicto que sabotear
    // —su salida es un número—, y tarda lo que tarda jugar 480 partidas: `npm run topes`.
    'prueba_topes.mjs',
    /**
     * Lleva su sabotaje DENTRO: `npm run guardia -- --autoprueba` avería cuatro juegos en
     * memoria y exige que los cuatro detectores los denuncien. Se queda aparte de `npm
     * test` porque juega setenta mil jugadas y tarda: `npm run guardia`.
     */
    'prueba_guardia.mjs',
    /**
     * Mide, no comprueba una condición: abre los 35 en CUATRO pantallas y cuenta qué se
     * sale de cuadro y qué cae bajo el panel. Necesita navegador y tarda 140 cargas de
     * página: `npm run pantallas`.
     */
    'prueba_pantallas.mjs',
]);

const enDisco = (await readdir(new URL('.', import.meta.url)))
    .filter(f => /^(prueba_|check_).*\.mjs$/.test(f) && !APARTE.has(f));
const guion = JSON.parse(
    await readFile(new URL('./package.json', import.meta.url), 'utf-8')).scripts.test ?? '';
const corridas = new Set(enDisco.filter(f => guion.includes(f)));
/**
 * Del comando se saca el fichero de la PRUEBA, no el primer `.mjs` que aparezca:
 * varias se lanzan con `node --import ./resolver_three.mjs prueba_x.mjs`, y quedarse
 * con el primero daba «sabotaje que apunta a una prueba que ya no existe:
 * ./resolver_three.mjs» y tres falsos «sin sabotaje». Un cargador no es una prueba.
 */
const ficheroDe = (cmd) =>
    (cmd.match(/(?:^|[\s/\\])((?:prueba_|check_)[\w.]+\.mjs)/) ?? [])[1];
const conSabotaje = new Set(SABOTAJES.map(s => ficheroDe(s.corre)).filter(Boolean));

const huerfanas = enDisco.filter(f => !corridas.has(f));
const sinSabotaje = [...corridas].filter(f => !conSabotaje.has(f));
const sabotajeMuerto = [...conSabotaje].filter(f => f && !enDisco.includes(f));

console.log(`\n  ${lista.length} comprobaciones puestas a prueba`
    + (malas ? rojo(` · ${malas} no saben fallar`) : verde(' · todas suspenden cuando deben')));

if (!pedidos.length) {
    if (huerfanas.length) {
        console.log(rojo(`\n  ✗ ${huerfanas.length} comprobación(es) que NO CORRE NADIE:`));
        for (const f of huerfanas) console.log(rojo(`      ${f}`));
        console.log('    Existen, pasan, y `npm test` no las llama. Una prueba que');
        console.log('    nadie ejecuta no vigila nada — es un guardia sin turno.');
    }
    if (sinSabotaje.length) {
        console.log(gris(`\n  todavía sin sabotaje declarado (${sinSabotaje.length}): `
                       + sinSabotaje.join(', ')));
    }
    if (sabotajeMuerto.length) {
        console.log(rojo(`\n  ✗ sabotaje que apunta a una prueba que ya no existe: `
                       + sabotajeMuerto.join(', ')));
    }
}
console.log('');
/**
 * Las alarmas del censo sólo cuentan en la pasada COMPLETA. Pedir un sabotaje suelto
 * —`node prueba_de_las_pruebas.mjs clasificacion`— es depurar uno concreto, y hacer
 * que eso falle por una huérfana que no se ha llegado a listar da un rojo mudo: salía
 * `exit 1` debajo de un «todas suspenden cuando deben».
 */
const censoMal = pedidos.length ? 0 : huerfanas.length + sabotajeMuerto.length;
process.exit(malas || censoMal ? 1 : 0);
