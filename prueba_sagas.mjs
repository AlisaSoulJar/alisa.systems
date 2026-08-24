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
 */
const EN_EL_BANCO = [
    { etapa: '¡Busca! 1 Cabinet Escape', pagina: 'public/games/croupier_cabinet_escape.html',
      env: 'public/js/alisa-engine/src/gym/envs/CabinetEscapeEnv.js' },
    { etapa: '¡Busca! 3 Corp Building', pagina: 'public/games/croupier_corporate_building.html',
      env: 'public/js/alisa-engine/src/gym/envs/CorpBuildingEnv.js' },
    { etapa: '¡Busca! 6 Espacio', pagina: 'public/games/raccoon_space.html',
      env: 'public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js' },
    { etapa: '¡Sobrevive! 2 Acuario', pagina: 'public/labs/croupier_chopper_aquarium.html',
      env: 'public/js/alisa-engine/src/gym/envs/ChopperAquariumEnv.js' },
];

/**
 * ⚠️ TRINQUETE. Las etapas que HOY corren código distinto según quién juegue.
 * **Sólo puede encoger.** Si aparece una nueva, es que alguien ha escrito un
 * segundo motor para una etapa y la comparación de esa etapa dejó de valer.
 */
const PARTIDAS = {
    '¡Busca! 1 Cabinet Escape':
        'persona CabinetEscapeGame (59 KB, con THREE) · banco ScummInteractionEngine',
    '¡Busca! 6 Espacio':
        'persona RaccoonSpaceSystem (combustible 100, escanear -10, nota fuel+restantes×20) · '
      + 'banco RaccoonSpaceCore (combustible 32, +500 encontrar, +20 descartar)',
};

/** Las etapas que una persona puede jugar y el banco no puede medir. */
const SIN_ENTORNO = {
    '¡Busca! 2 Registro de Planta': 'games/raccoon_floor_search.html — sin entorno de gym',
    '¡Busca! 4 City Sector':        'games/raccoon_city_sector.html — sin entorno de gym',
    '¡Busca! 5 Planeta':            'games/raccoon_planet.html — sin entorno de gym',
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

console.log('\n¿Juegan la persona y el agente al mismo juego, en las sagas?\n');

const fallos = [];
let comparten = 0;
const partidasHoy = [];

for (const { etapa, pagina, env } of EN_EL_BANCO) {
    if (!existsSync(path.join(AQUI, pagina))) { fallos.push(`${etapa}: no existe ${pagina}`); continue; }
    if (!existsSync(path.join(AQUI, env))) { fallos.push(`${etapa}: no existe ${env}`); continue; }

    const dePagina = motoresDe(await readFile(path.join(AQUI, pagina), 'utf-8'));
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

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach(f => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ las etapas que comparten motor lo comparten, y las que no están declaradas\n'));
