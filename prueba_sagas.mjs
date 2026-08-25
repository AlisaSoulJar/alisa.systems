/**
 * ¿JUEGAN LA PERSONA Y EL AGENTE AL MISMO JUEGO EN LAS SAGAS?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_sagas.mjs      → 0 todo bien · 1 hay fallos
 *
 * La tesis entera de este banco es que las cinco puertas juegan a LO MISMO: una
 * persona, un FSM, un modelo de lenguaje, uno con visión y la API se sientan
 * delante del mismo juego y por eso sus notas se pueden comparar. En los cuarenta
 * juegos del arcade eso es cierto por construcción —hay UN fichero de reglas y
 * todas las puertas lo llaman—.
 *
 * En las sagas NO está garantizado, porque cada etapa es una página con su motor
 * y su entorno de gym aparte. Y medido el 24-08, dos de las cuatro etapas que
 * están en el banco corrían **código distinto** según quién jugara:
 *
 *     ¡Busca! 1 Cabinet   persona: CabinetEscapeGame (59 KB, con THREE)
 *                         banco:   ScummInteractionEngine
 *     ¡Busca! 6 Espacio   persona: RaccoonSpaceSystem (4,5 KB)
 *                         banco:   RaccoonSpaceCore   (12,1 KB)
 *     ¡Busca! 3 Corp      los dos: CorporateSeekerSystem      ✓
 *     ¡Sobrevive! 2       los dos: ChopperAquariumEngine      ✓
 *
 * Y en espacio no es un matiz de nombres: son juegos distintos.
 *
 *     combustible   página 100 (lo pinta como %)   ·   núcleo 32
 *     escanear      cuesta 10                      ·   -1 sólo si es en balde
 *     marcador      fuel + restantes × 20          ·   +500 encontrar, +20 descartar
 *
 * O sea que la nota que saca una persona en ¡Busca! 6 y la que el banco le pone a
 * un agente **no miden la misma partida**. Con eso, compararlas no significa nada
 * — y comparar es lo único que hace este proyecto.
 *
 * ⚠️ Y `RaccoonSpaceSystem` SE LLAMA A SÍ MISMO «headless» EN SU PRIMERA LÍNEA
 * mientras importa THREE y usa `THREE.Vector3`. El comentario dice lo contrario
 * que el código, que es la forma más cara de documentar algo.
 *
 * Esto no arregla el reparto: lo VIGILA. Mientras haya dos motores, que al menos
 * esté escrito cuáles y no se añada un tercero sin que salte.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/**
 * Las etapas que están en el banco, con su página de persona y su entorno.
 * Las que no están en el banco se listan aparte, abajo: no tener entorno es otra
 * cosa que tener dos motores, y mezclarlas escondería las dos.
 *
 * ⚠️ EL MAPA YA NO VIVE AQUÍ: SE IMPORTA. Y ES POR UN FALLO DEL 25-08.
 *
 * Estaba escrito en este fichero como constante local. Ese día, al montar la
 * antesala de los betas, escribí `gen_sagas.mjs` parseando el `<title>` de las
 * páginas — porque la lista buena estaba AQUÍ DENTRO y no se podía importar.
 * Resultado: mi generador sólo miró `public/games` y la saga ¡Sobrevive! entera
 * se quedó fuera de la puerta. Sus dos etapas viven en `labs/`.
 *
 * Lo vio Oscar preguntando por qué faltaban sagas. No lo vio ninguna prueba.
 *
 * Una fuente canónica enterrada en un fichero que no la exporta es exactamente
 * el fallo del parser de la tripleta, el del resolver de intención y el del suelo
 * ciego. Cuatro veces el mismo día, y ésta me la hice yo sola.
 */
import { EN_EL_BANCO as MAPA } from './sagas.mjs';

const EN_EL_BANCO = MAPA.map(e => ({
    etapa: `¡${e.saga}! ${e.etapa} ${e.nombre}`,
    pagina: e.pagina,
    env: e.env,
}));

/**
 * ⚠️ TRINQUETE. Las etapas que HOY corren código distinto según quién juegue.
 * **Sólo puede encoger.** Si aparece una nueva, es que alguien ha escrito un
 * segundo motor para una etapa y la comparación de esa etapa dejó de valer.
 */
const PARTIDAS = {
    /**
     * ⚠️ `¡Busca! 1 Cabinet` TAMBIÉN SE HA IDO. UNIFICADO EL 24-08, Y AL REVÉS.
     *
     * Entró como «persona CabinetEscapeGame (59 KB, con THREE) · banco
     * ScummInteractionEngine». Y aquí ganó el motor de la PERSONA, no el del
     * banco: `CabinetEscapeSystem` (11 KB) es headless, va sembrado y tiene el
     * juego entero —eficiencia, Monty Hall, destape en cadena, pilas—, mientras
     * `ScummInteractionEngine` (3 KB) era la copia reducida.
     *
     * Medir la copia mientras se juega el original es exactamente lo que este
     * banco existe para no hacer. Las notas de `alisa/CabinetEscape-v0` cambiaron
     * —de 97 / 99 / -100 a 2,8 / 9,2 / -0,05— y tenían que cambiar: las viejas
     * medían el juego equivocado.
     */
    /**
     * ⚠️ `¡Busca! 6 Espacio` ESTUVO AQUÍ Y SE HA IDO. UNIFICADO EL 24-08.
     *
     * Entró con esto: «persona RaccoonSpaceSystem (combustible 100, escanear -10,
     * nota fuel+restantes×20) · banco RaccoonSpaceCore (combustible 32, +500
     * encontrar)». Ya no: la página juega el mismo núcleo que el banco.
     *
     * Lo que hizo falta, por si sirve para la que queda:
     *
     *   · la factoría admite un `mundo` y pinta las posiciones del núcleo en vez
     *     de inventarse las suyas;
     *   · las teclas se traducen a UN verbo del núcleo por tick, como un agente;
     *   · escanear es `nucleo.step('escanear')`, y el alcance lo decide él —antes
     *     valía cualquier planeta a menos de 100 de la CÁMARA, apuntando con el
     *     ratón, o sea que una persona escaneaba desde donde un agente no podía;
     *   · el marcador, el combustible y el final salen del núcleo.
     *
     * Y dos mentiras de pantalla que sólo se vieron abriendo la captura: la barra
     * de combustible hacía `width = fuel + '%'` —que funcionaba de casualidad
     * porque el motor viejo arrancaba en 100— y el rótulo decía «20%» con el
     * depósito al 84%.
     */
    /**
     * ⚠️ AQUÍ ESTABAN ¡BUSCA! 4 Y 5, Y YA NO. NO SE BORRA LA HISTORIA.
     *
     * Entraron al banco el 24-08 declaradas como partidas, a sabiendas: se medían
     * con `RaccoonSpaceCore` mientras sus páginas corrían `RaccoonCitySystem` y
     * `RaccoonPlanetSystem`. Ese mismo día se unieron, y al unirlas salieron TRES
     * reglas que la persona tenía y el banco no —el vehículo de cada etapa, el
     * coste de escanear en falso y unos asteroides invisibles que sólo sufría el
     * agente— más una que se lo comía todo: en las páginas se escaneaba desde
     * donde estuvieras, o sea que el dron y el satélite eran DECORATIVOS.
     *
     * Se deja escrito porque la lección no es «ya está»: es que «mismo motor» no
     * basta. `prueba_puertas_busca.mjs` nació de aquí — compara los AJUSTES con
     * los que cada puerta monta el núcleo, que es la grieta que esta prueba, la
     * que estás leyendo, no puede ver.
     */
};

/** Las etapas que una persona puede jugar y el banco no puede medir. */
const SIN_ENTORNO = {
    '¡Busca! 2 Registro de Planta': 'games/raccoon_floor_search.html — sin entorno de gym',
    '¡Sobrevive! 1 Interaction Lab':'labs/croupier_interaction_lab.html — sin entorno de gym',
};

/**
 * Los motores que importa un fichero: lo que de verdad ejecuta el juego.
 *
 * ⚠️ LA FONTANERÍA NO CUENTA COMO MOTOR, Y LA PRIMERA VERSIÓN SÍ LA CONTABA.
 *
 * `ECSWorld` lo importan la página y el entorno de Corp Building, así que con él
 * dentro la etapa salía «comparten motor» aunque el juego fuera otro. Lo destapó
 * `prueba_de_las_pruebas.mjs`: el sabotaje cambiaba el motor y la comprobación
 * seguía en verde, porque le quedaba el mundo ECS en común. Un armazón compartido
 * no es un juego compartido.
 *
 * Se cuenta lo que se llama `…System`, `…Engine`, `…Core` o `…Game`, que es la
 * convención de esta casa para «esto tiene las reglas dentro». Y un alias (`as`)
 * no cambia nada: importar lo mismo con otro nombre sigue siendo lo mismo, así
 * que se mira lo que hay ANTES del `as`.
 */
const ES_MOTOR = /(System|Engine|Core|Game)$/;
function motoresDe(txt) {
    const nombres = new Set();
    for (const m of txt.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
        const desde = m[2];
        if (!/systems|Engine|Core|gym_runners|world\//i.test(desde)) continue;
        for (const n of m[1].split(',')) {
            const limpio = n.trim().split(/\s+as\s+/)[0].trim();
            if (!limpio || !ES_MOTOR.test(limpio)) continue;
            // Los componentes y los puentes no son el motor del juego.
            if (/Component$|^RLGymBridge$|^GymEnv$/.test(limpio)) continue;
            nombres.add(limpio);
        }
    }
    return nombres;
}

const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * Los envoltorios que una página puede montar en vez del motor directamente:
 * ficheros de `world/` que a su vez importan motores. Se recogen una sola vez.
 */
const envoltorios = [];
{
    const { readdirSync, statSync } = await import('node:fs');
    const raizMundo = path.join(AQUI, 'public/js/alisa-engine/src/world');
    (function rec(d) {
        for (const n of readdirSync(d)) {
            const p = path.join(d, n);
            if (statSync(p).isDirectory()) { rec(p); continue; }
            if (n.endsWith('.js')) envoltorios.push([p, n.replace('.js', '')]);
        }
    })(raizMundo);
}

console.log('\n¿Juegan la persona y el agente al mismo juego, en las sagas?\n');

const fallos = [];
let comparten = 0;
const partidasHoy = [];

for (const { etapa, pagina, env } of EN_EL_BANCO) {
    if (!existsSync(path.join(AQUI, pagina))) { fallos.push(`${etapa}: no existe ${pagina}`); continue; }
    if (!existsSync(path.join(AQUI, env))) { fallos.push(`${etapa}: no existe ${env}`); continue; }

    /**
     * ⚠️ SE SIGUE UN SALTO: LA PÁGINA PUEDE MONTAR EL JUEGO A TRAVÉS DE UN ENVOLTORIO.
     *
     * `croupier_cabinet_escape.html` importa `CabinetEscapeGame`, y es ÉSE quien
     * usa `CabinetEscapeSystem`. Mirando sólo lo que la página importa a la cara,
     * la etapa salía partida cuando ya estaba unida.
     *
     * Es la TERCERA vez hoy que este proyecto tropieza con lo mismo: un subagente
     * me lo destapó en `motores.mjs`, lo arreglé allí, volví a caer en el patrón
     * dorado del mismo fichero, y aquí estaba otra vez. Cuando un fallo aparece
     * tres veces en un día ya no es un descuido: es que la forma «mira quién
     * importa a quién» necesita seguir la cadena, siempre, en todas partes.
     */
    const textoPagina = await readFile(path.join(AQUI, pagina), 'utf-8');
    const dePagina = motoresDe(textoPagina);
    for (const [ruta, nombre] of envoltorios) {
        if (new RegExp(`import[^;]*['"\`][^'"\`]*${nombre}\\.js(\\?[^'"\`]*)?['"\`]`).test(textoPagina)) {
            for (const m of motoresDe(await readFile(ruta, 'utf-8'))) dePagina.add(m);
        }
    }
    const deBanco = motoresDe(await readFile(path.join(AQUI, env), 'utf-8'));
    const comun = [...deBanco].filter(x => dePagina.has(x));

    if (comun.length) {
        comparten++;
        console.log(`  ${verde('✓')} ${etapa.padEnd(26)} los dos usan ${comun.join(', ')}`);
        if (PARTIDAS[etapa]) {
            console.log(`      ${gris('↓ ya comparten motor y siguen declarados como partidos: quítalo de PARTIDAS')}`);
        }
    } else {
        partidasHoy.push(etapa);
        const razon = PARTIDAS[etapa];
        console.log(`  ${razon ? '·' : rojo('✗')} ${etapa.padEnd(26)} `
                  + `persona: ${[...dePagina].join(',') || '?'}  ·  banco: ${[...deBanco].join(',') || '?'}`);
        if (razon) console.log(`      ${gris(razon)}`);
        else fallos.push(`${etapa}: la persona y el banco corren motores distintos y no está declarado. `
                       + 'Las notas de esa etapa dejan de ser comparables.');
    }
}

const nuevas = partidasHoy.filter(e => !PARTIDAS[e]);
if (nuevas.length) {
    fallos.push(`la deuda subió: ${nuevas.length} etapa(s) nuevas con dos motores (${nuevas.join(', ')})`);
}

console.log(`\n  ${comparten}/${EN_EL_BANCO.length} etapas del banco corren el MISMO motor por las dos puertas`);
console.log(`  ${partidasHoy.length} con dos motores (declaradas: ${Object.keys(PARTIDAS).length})`);

/**
 * Y lo que ni siquiera llega a tener dos motores: las etapas que una persona
 * puede jugar y el banco no puede medir. No es un fallo —nadie prometió que
 * estuvieran— pero callarlo haría creer que la saga entera está medida cuando
 * está medida a la mitad. Un top-N sin avisar, otra vez.
 */
console.log(`\n  ${Object.keys(SIN_ENTORNO).length} etapas se juegan y NO se miden:`);
for (const [etapa, nota] of Object.entries(SIN_ENTORNO)) {
    const [fichero] = nota.split(' — ');
    const hay = existsSync(path.join(AQUI, 'public', fichero));
    console.log(`      ${hay ? '·' : rojo('✗')} ${etapa.padEnd(30)} ${nota}`);
    if (!hay) fallos.push(`${etapa}: la página ${fichero} tampoco existe`);
}

/**
 * ⚠️ Y LA PISTA TIENE QUE LLEGAR A LAS TRES PUERTAS, NO A UNA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El fallo que esto vigila es el que se encontró el 24-08 al ir a unir Espacio:
 * `raccoon_space.html` le decía a la persona «🟢 HOT (37 LY away)» al descartar
 * un objetivo, y el núcleo del banco no le decía nada al agente. Con eso, la
 * persona jugaba a una DEDUCCIÓN y el agente a un recorrido a ciegas.
 *
 * Y no basta con que el dato exista: tiene que salir por cada puerta. Si sólo
 * llega al texto, la política numérica sigue jugando al juego de antes; si sólo
 * llega a los números, el modelo de lenguaje sigue a ciegas. Una puerta que se
 * queda sin una parte del estado es una comparación con trampa.
 */
{
    const { CATALOGO } = await import('./public/js/alisa-engine/src/gym/registro.js');
    const cargar = Object.fromEntries(CATALOGO.map(e => [e.id, e.cargar]));
    for (const id of ['alisa/RaccoonCity-v0', 'alisa/RaccoonPlanet-v0', 'alisa/RaccoonSpace-v0']) {
        const Clase = await cargar[id]();
        const env = new Clase();
        env.reset(1234);
        // Se descartan dos objetivos a mano, que es lo que genera pistas.
        for (let k = 0; k < 2; k++) {
            const p = env.sys.planetas.filter(x => !x.escaneado && env.sys.planetas.indexOf(x) !== env.sys.planetaDelMapache)[0];
            if (!p) break;
            /**
             * ⚠️ `colocarJunto`, y NO escribir `nave.x/y/z` a mano.
             *
             * Eso último es lo que hacía esta prueba, y con el satélite del planeta
             * dejó de funcionar sin decir por qué: su posición sale de latitud,
             * longitud y altura, y el primer `step` la recalcula y borra el
             * teletransporte. La prueba acusaba al planeta de no dar pistas cuando
             * las daba — el fallo era de aquí.
             */
            env.sys.colocarJunto(p);
            env.step('escanear');
        }
        const pistas = env.sys.pistas();
        const texto = env.describe();
        const obs = env.getObservation();
        const enTexto = /escáner|escaner/.test(texto) && pistas.some(p => texto.includes(p.banda));
        const enNumeros = obs.slice(22).some(v => v > 0);

        if (!pistas.length) {
            fallos.push(`${id}: descartar dos objetivos no genera ninguna pista`);
        } else if (!enTexto) {
            fallos.push(`${id}: la pista existe y NO sale por la puerta de lenguaje `
                      + '— el modelo juega a ciegas mientras la persona deduce');
        } else if (!enNumeros) {
            fallos.push(`${id}: la pista existe y NO sale por la puerta numérica `
                      + '— la política juega a ciegas mientras la persona deduce');
        }
    }
    if (!fallos.length) {
        console.log('\n  ✓ la pista del escáner llega a las tres puertas del mapache'
                  + gris('  (estado, texto y números)'));
    }
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach(f => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ las etapas que comparten motor lo comparten, y las que no están declaradas\n'));
