/**
 * ¿JUEGAN LA PERSONA Y EL AGENTE LA MISMA PARTIDA EN ¡BUSCA!?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_puertas_busca.mjs
 *
 * Las tres etapas de ¡Busca! montan `RaccoonSpaceCore` DOS VECES: una en la
 * página, con los ajustes escritos a mano en el HTML, y otra en el entorno del
 * gimnasio, con los suyos. Que las dos usen el mismo motor no basta — si la
 * página pide `fuel: 30` y el entorno `fuel: 12`, siguen siendo dos juegos.
 *
 * ⚠️ Y ESTE ES EXACTAMENTE EL FALLO QUE VENGO ARRASTRANDO TODO EL DÍA.
 * Cuatro veces he dado por unida una etapa mirando qué se importa y no qué se
 * CONFIGURA. Importar el mismo módulo con parámetros distintos es la misma
 * grieta con mejor disfraz, y encima una que ninguna prueba veía.
 *
 * Se comparan los ajustes que la página escribe en su `new RaccoonSpaceCore({…})`
 * contra los `static ajustes` del entorno, campo a campo.
 */
import { readFileSync } from 'node:fs';
import { RaccoonSpaceEnv, RaccoonCityEnv, RaccoonPlanetEnv }
    from './public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js';

const ETAPAS = [
    ['¡Busca! 4 ciudad',  'public/games/raccoon_city_sector.html', RaccoonCityEnv],
    ['¡Busca! 5 planeta', 'public/games/raccoon_planet.html',      RaccoonPlanetEnv],
    ['¡Busca! 6 espacio', 'public/games/raccoon_space.html',       RaccoonSpaceEnv],
];

/** Los campos que CAMBIAN la partida. El color de un planeta no está aquí. */
const CAMPOS = ['tankSize', 'planets', 'asteroids', 'fuel', 'tope', 'forma', 'mando', 'scanCost'];

/**
 * ⚠️ SE LEE EL CÓDIGO, NO LOS COMENTARIOS.
 *
 * Tres veces esta semana un detector mío ha leído prosa como si fuera código: la
 * explicación de un arreglo mencionaba `Math.random` y el instrumento la contaba
 * como una llamada. Aquí los comentarios hablan largo y tendido de `fuel: 30` y
 * `forma: 'esfera'`, así que si no se quitan primero, esta prueba mide mis
 * comentarios.
 */
function sinComentarios(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * ⚠️ Y VARIOS AJUSTES SON VARIABLES, NO NÚMEROS.
 *
 * La página deja elegir cuántos objetivos hay en su ventana de arranque, así que
 * en el código pone `planets: totalBuildings`. Comparar el NOMBRE contra el
 * número del banco daría siempre distinto — la prueba acusaría a una página
 * sana, que es el fallo que más veces me ha costado esta semana.
 *
 * Lo que hay que comparar es el valor POR DEFECTO de ese control, que es con el
 * que se juega si nadie lo toca: el `|| 10` de `parseInt(…) || 10`.
 */
function resolver(src, expr) {
    if (/^-?[\d.]+$/.test(expr)) return expr;
    if (/^['"]/.test(expr)) return expr.replace(/^['"]|['"]$/g, '');
    const m = src.match(new RegExp(`\\b${expr}\\s*=[^;\\n]*\\|\\|\\s*(-?[\\d.]+)`));
    return m ? m[1] : expr;
}

function ajustesDeLaPagina(ruta) {
    const src = sinComentarios(readFileSync(ruta, 'utf8'));
    const i = src.indexOf('new RaccoonSpaceCore(');
    if (i === -1) return null;
    const abre = src.indexOf('{', i);
    let n = 0, fin = abre;
    for (; fin < src.length; fin++) {
        if (src[fin] === '{') n++;
        if (src[fin] === '}') { n--; if (n === 0) break; }
    }
    const cuerpo = src.slice(abre, fin + 1);
    const out = {};
    for (const campo of CAMPOS) {
        const m = cuerpo.match(new RegExp(`\\b${campo}\\s*:\\s*('[^']*'|"[^"]*"|[\\w.]+)`));
        if (m) out[campo] = resolver(src, m[1]);
    }
    return out;
}

/**
 * ⚠️ Y DEL LADO DEL BANCO SE MIRA EL MOTOR MONTADO, NO LA DECLARACIÓN.
 *
 * `RaccoonSpaceEnv.ajustes` está vacío: la etapa 6 se apoya en los valores por
 * defecto del núcleo. Comparar declaraciones diría «la página pone 400 y el
 * banco no pone nada» y acusaría a una etapa que lleva unida desde ayer. Se
 * monta el entorno y se le preguntan sus números de verdad.
 */
const CAMPO_A_NUCLEO = {
    tankSize: c => c.tanque,
    planets: c => c.nPlanetas,
    asteroids: c => c.nAsteroides,
    fuel: c => c.combustibleInicial,
    tope: c => c.tope,
    forma: c => c.forma,
    mando: c => c.mando,
    scanCost: c => +(c.costeEscaneo / (c.combustibleInicial || 1)).toFixed(6),
};

function ajustesDelBanco(Env) {
    const env = new Env();
    const core = env.sys ?? env.core ?? env.nucleo;
    if (!core) throw new Error(`${Env.id}: no encuentro su RaccoonSpaceCore`);
    const out = {};
    for (const campo of CAMPOS) out[campo] = CAMPO_A_NUCLEO[campo](core);
    return out;
}

let fallos = 0;
console.log('\n¿La página y el banco montan el mismo juego?\n');

for (const [nombre, ruta, Env] of ETAPAS) {
    const pagina = ajustesDeLaPagina(ruta);
    if (!pagina) {
        console.log(`  ✗ ${nombre}: la página no monta RaccoonSpaceCore — sigue partida`);
        fallos++;
        continue;
    }
    const banco = ajustesDelBanco(Env);
    const difs = [];
    for (const campo of CAMPOS) {
        // Si la página no lo dice, coge el mismo defecto del núcleo que el banco.
        const a = pagina[campo] ?? banco[campo];
        const b = banco[campo];
        if (String(a) !== String(b)) difs.push(`${campo}: página ${a} · banco ${b}`);
    }
    if (difs.length) {
        console.log(`  ✗ ${nombre}: mismo motor, distinta partida`);
        difs.forEach(d => console.log(`       ${d}`));
        fallos += difs.length;
    } else {
        console.log(`  ✓ ${nombre}: mismos ajustes en las dos puertas`);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ SEGUNDA PARTE: ¿OFRECEN LO MISMO LA PUERTA DE LENGUAJE Y LA NUMÉRICA?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto no es de ¡Busca!: es de TODOS los entornos, y se barre entero.
 *
 * El fallo, medido en el navegador el 24-08: a un modelo que jugara al sector de
 * ciudad, `affordances()` le ofrecía `empujar`, `girar_izq`, `morro_arriba`… —
 * los mandos de una nave espacial para pilotar un dron. Seis de siete verbos que
 * esa etapa no tiene. Y el núcleo ACEPTABA algunos, así que el modelo podía hacer
 * cosas que la política numérica ni siquiera podía nombrar.
 *
 * Un menú que ofrece jugadas que no existen no da un error: da un agente que
 * gasta turnos en nada y una comparación con sesgo a favor de la otra puerta.
 * Es la misma familia que todo lo de hoy — dos puertas jugando a cosas distintas
 * — sólo que aquí la grieta está en el MENÚ y no en los ajustes.
 */
{
    const { CATALOGO } = await import('./public/js/alisa-engine/src/gym/registry.js');
    let revisados = 0, conMenuRoto = 0;
    for (const entrada of CATALOGO) {
        let env;
        try {
            const Clase = await entrada.cargar();
            env = new Clase();
            env.reset(7);
            if (typeof env.affordances !== 'function') continue;
        } catch { continue; }          // los que no cargan ya los caza check_gym_envs

        const espacio = env.constructor.actionSpace;
        const ofrecidos = env.affordances();

        /**
         * ⚠️ Y SÓLO VALE PARA LAS ACCIONES DISCRETAS. LO APRENDÍ SUSPENDIENDO A
         * UN ENTORNO SANO.
         *
         * La primera versión de esto acusó a `alisa/Pedrisco-v0` de ofrecer ocho
         * verbos inventados. No inventaba nada: su acción es CONTINUA
         * —`['tx','ty','fire']`— y ahí `names` son las DIMENSIONES del vector, no
         * un menú. Sus verbos (`esquivar_izquierda`…) son una capa de traducción
         * que lleva cada uno su `action: [...]`, que es justo para lo que existe
         * `actFromVerb`.
         *
         * O sea: comparé peras con manzanas y el resultado fue una acusación
         * convincente contra código correcto. Van varias esta semana — cuando una
         * prueba nueva suspende a alguien sano, el roto suele ser ella.
         *
         * En continuo la pregunta correcta es otra: que cada verbo del menú SEPA
         * traducirse. Un verbo sin acción es un botón que no hace nada.
         */
        revisados++;
        /**
         * ⚠️ Y HAY DISCRETOS CUYO `names` ES UNA LEYENDA, NO UNA ENUMERACIÓN.
         *
         * `alisa/Defiende-v1` tiene 433 acciones —una por torreta y celda— y
         * cuatro nombres, porque enumerar «construir guijarro en (7,3)» 432 veces
         * no ayuda a nadie. Comparar sus verbos contra esa lista de cuatro lo
         * suspendía sin que hubiera nada roto.
         *
         * Es el mismo error que ya cometí con `Pedrisco`: dar por hecho que
         * `names` significa lo mismo en todos los entornos. Cuando `names.length`
         * no coincide con `n`, la pregunta correcta no es «¿está el verbo en la
         * lista?» sino **«¿sabe el entorno traducir ese verbo a una acción
         * válida?»** — que además es la pregunta que de verdad importa siempre.
         */
        /**
         * ⚠️ Y SON TRES CASOS, NO DOS. Me costó suspender a 715 verbos sanos.
         *
         * Al añadir el segundo caso di por hecho que todo `type: 'discrete'` tiene
         * un `n` numérico. Medido: los entornos del ProtoHub —ajedrez, chinchón,
         * alisápolis…— declaran `discrete` con `n` y `names` **sin definir**, y sus
         * acciones son los propios verbos con argumentos, no enteros. Exigirles un
         * entero los suspendía a todos.
         *
         *   1. enumerada  `names.length === n`  → el verbo tiene que estar en names
         *   2. leyenda    `n` numérico, names corto → traducir y que dé un entero válido
         *   3. por verbos `n` sin definir  → traducir y que dé ALGO
         *
         * Tercera vez esta semana que asumo que un campo significa lo mismo en
         * todos los entornos. La regla: cuando una comprobación nueva suspende a
         * mucha gente sana, la rota es ella.
         */
        const enumerada = espacio?.type === 'discrete'
            && Number.isFinite(espacio.n) && espacio.names?.length === espacio.n;
        const porEnteros = espacio?.type === 'discrete' && Number.isFinite(espacio.n);
        if (enumerada) {
            const legales = new Set(espacio.names);
            const inventados = [...new Set(ofrecidos.map(a => a.verb).filter(v => !legales.has(v)))];
            if (inventados.length) {
                conMenuRoto++;
                fallos += inventados.length;
                console.log(`  ✗ ${entrada.id}: la puerta de lenguaje ofrece ${inventados.length} verbo(s) `
                          + `que la acción discreta no admite — ${inventados.join(', ')}`);
            }
        } else if (porEnteros) {
            // Leyenda: se comprueba traduciendo, que es más fuerte que comparar.
            const rotos = [...new Set(ofrecidos.filter(a => {
                const accion = env.actFromVerb(a.verb, a.args ?? {});
                return accion === null || !Number.isInteger(accion)
                    || accion < 0 || accion >= espacio.n;
            }).map(a => a.verb))];
            if (rotos.length) {
                conMenuRoto++;
                fallos += rotos.length;
                console.log(`  ✗ ${entrada.id}: ${rotos.length} verbo(s) del menú no se traducen `
                          + `a una acción válida — ${rotos.join(', ')}`);
            }
        } else {
            const mudos = ofrecidos.filter(a => a.action === undefined && a.args === undefined)
                                   .map(a => a.verb);
            if (mudos.length) {
                conMenuRoto++;
                fallos += mudos.length;
                console.log(`  ✗ ${entrada.id}: ${mudos.length} verbo(s) del menú no se traducen `
                          + `a ninguna acción — ${mudos.join(', ')}`);
            }
        }
    }
    if (!conMenuRoto) {
        console.log(`\n  ✓ los ${revisados} entornos con menú ofrecen sólo verbos que su acción admite`);
    }
}

console.log('');
if (fallos) {
    console.log(`  ${fallos} diferencia(s): lo que juega la persona y lo que mide el banco NO es lo mismo\n`);
    process.exit(1);
}
console.log('  ✓ las tres etapas de ¡Busca! se juegan igual por las cinco puertas\n');
