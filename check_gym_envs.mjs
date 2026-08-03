/**
 * check_gym_envs.mjs — que los entornos del benchmark existan y funcionen
 * ═══════════════════════════════════════════════════════════════════════════
 *     node check_gym_envs.mjs      → 0 todo bien · 1 hay fallos · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 * Tres de los cinco entornos estaban escritos, documentados y terminados, y no
 * los exportaba nadie — ni siquiera el barril `index.js`. Un entorno de
 * benchmark que no se puede importar no existe para quien se descargue el
 * motor, por muy bien hecho que esté.
 *
 * Y recorrerlos TODOS DE GOLPE encuentra cosas que probarlos de uno en uno no:
 * así salió que `AsteroidsEnv` declaraba 14 números de observación y devolvía
 * 16. Un agente que se fiara del espacio declarado habría entrenado sobre una
 * observación desplazada, sin un solo error en consola.
 *
 * QUÉ COMPRUEBA DE CADA ENTORNO
 *   · que se pueda importar desde el catálogo
 *   · que `reset(semilla)` devuelva una observación del tamaño DECLARADO
 *   · que `affordances()` dé verbos y que el entorno los acepte
 *   · que `describe()` diga algo (la puerta de lenguaje)
 *   · que la misma semilla dé el mismo resultado
 *
 * ⚠️ CONTROL POSITIVO
 * Un catálogo vacío y un catálogo sano dan el mismo "sin fallos". Por eso, si
 * hay menos de 2 entornos, esto NO dice OK: dice que la prueba no vale (2).
 * Aprendido a base de dar por bueno un silencio que solo significaba que no
 * había mirado nada.
 * ═══════════════════════════════════════════════════════════════════════════
 */
// ⚠️ Antes se importaba desde `src/index.js`, que es el índice del motor ENTERO:
// arrastra `AlisaRenderCore` y con él `three`. En una máquina con
// `node_modules` no se nota; en el runner de CI —donde no los hay— reventaba
// con `Cannot find package 'three'`. O sea: la CI habría fallado en el primer
// empujón, y no por un fallo del código sino del comprobador.
//
// El contrato del gym no necesita un renderizador. Se lee del registro, que es
// donde se declaran los entornos.
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

const GYM_ENVS = Object.fromEntries(
    CATALOGO.filter(e => e.familia === 'propio').map(e => [e.id, e.cargar]));

const ids = Object.keys(GYM_ENVS);

if (ids.length < 2) {
    console.log(`CONTROL POSITIVO FALLIDO: el catalogo trae ${ids.length} entornos. ` +
                `El "sin fallos" de una lista vacia no significa nada.`);
    process.exit(2);
}

/** Un episodio corto usando solo verbos que el propio entorno declara legales. */
function jugar(env, pasos = 150) {
    let recompensa = 0, dados = 0;
    for (let i = 0; i < pasos; i++) {
        const verbos = env.affordances();
        if (!verbos.length) break;
        const r = env.step(verbos[i % verbos.length].verb);
        recompensa += (r.reward ?? 0);
        dados++;
        if (r.done) break;
    }
    return { recompensa, dados };
}

console.log(`${ids.length} entornos en el catalogo\n`);
let fallos = 0;

for (const id of ids) {
    const problemas = [];
    let linea = '';
    try {
        const Clase = await GYM_ENVS[id]();

        if (Clase.id !== id) problemas.push(`la clave dice "${id}" y su static id dice "${Clase.id}"`);

        const env = new Clase();
        const obs = env.reset(1234);
        const declarado = Clase.observationSpace?.shape?.[0];

        if (!obs || typeof obs.length !== 'number') problemas.push('reset() no devuelve una lista');
        else if (declarado && obs.length !== declarado) {
            problemas.push(`observacion de ${obs.length} pero declara ${declarado}`);
        }
        if ([...obs].some(v => typeof v !== 'number' || Number.isNaN(v))) {
            problemas.push('hay NaN o no-numeros en la observacion');
        }

        const { recompensa, dados } = jugar(env);
        if (dados === 0) problemas.push('no acepto ni un verbo de los suyos');

        const texto = env.describe();
        if (!texto || texto.length < 15) problemas.push('describe() no dice nada');

        // Repetible: la misma semilla, el mismo resultado.
        const huella = (s) => { const e = new Clase(); e.reset(s); return JSON.stringify(jugar(e)); };
        const a = huella(1234), b = huella(1234);
        if (a !== b) problemas.push('misma semilla da resultados distintos');

        linea = `obs=${String(obs.length).padStart(3)}  pasos=${String(dados).padStart(3)}  recompensa=${recompensa.toFixed(1).padStart(8)}`;
    } catch (e) {
        problemas.push(`revienta: ${e.message}`);
    }

    if (problemas.length) {
        fallos++;
        console.log(`  !! ${id.padEnd(24)} ${linea}`);
        for (const p of problemas) console.log(`       ${p}`);
    } else {
        console.log(`  ok ${id.padEnd(24)} ${linea}`);
    }
}

console.log();
console.log(fallos === 0
    ? `OK — los ${ids.length} entornos se importan, aceptan sus verbos y son repetibles.`
    : `${fallos} entorno(s) con problemas.`);
process.exit(fallos ? 1 : 0);
