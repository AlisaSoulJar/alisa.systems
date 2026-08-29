/**
 * dqn_gym.js — el agente que APRENDE, sobre un entorno de verdad
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LO QUE HABÍA AQUÍ NO ERA UN DQN NI ERA UN ARNÉS.
 *
 * Importaba `@tensorflow/tfjs` —que no está en las dependencias del proyecto ni
 * en `node_modules`, así que no ha corrido nunca— y lo que hacía era generar 500
 * filas de datos INVENTADOS con `Math.random` y ajustarles un perceptrón a una
 * función de frenado imaginaria. Sin entorno, sin acciones, sin recompensas y sin
 * ecuación de Bellman: se llamaba «Deep Q-Network» y era regresión supervisada
 * sobre datos falsos.
 *
 * Era, además, el único de los veintidós arneses que no arrancaba.
 *
 * ⚠️ POR QUÉ NO SE INSTALA TENSORFLOW Y SE ESCRIBE LA RED A MANO.
 *
 * Porque es lo que se hace fuera: en Gymnasium, ALE, Procgen o MuJoCo el ENTORNO
 * no depende de ningún marco de aprendizaje, y los aprendices van aparte. Esa
 * separación es la que permite enchufarle cualquier framework al mismo entorno,
 * que es la promesa entera de un banco de pruebas.
 *
 * Y aquí pesa doble: `preflight` prohíbe cargar código desde un CDN, así que
 * meter tfjs sería meter megabytes de marco de aprendizaje en un sitio estático
 * para entrenar una red de tres capas. Ver `gym/AgenteDQN.js`, que son ochenta
 * líneas y se puede leer entera.
 *
 * Ahora entrena de verdad, sobre `RaccoonSpace`, que es uno de los entornos donde
 * el aprendizaje se nota: el azar saca −24,90 y el agente entrenado 0,00.
 */
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';
import { entrenarEn } from '../alisa-engine/src/gym/AgenteDQN.js';
import { cargar } from '../alisa-engine/src/gym/registry.js';

const SEMILLA = 42;
const ENTORNO = 'alisa/RaccoonSpace-v1';

async function _episodio(episodios = 30, WORKER_NAME = 'LabRat') {
    console.log(`[${WORKER_NAME}] DQN sin dependencias → ${ENTORNO}, ${episodios} episodios...`);

    const Entorno = await cargar(ENTORNO);
    const t0 = performance.now();
    const r = await entrenarEn(Entorno, { episodios, pasosMax: 200, semilla: SEMILLA });
    const t1 = performance.now();

    console.log(`[${WORKER_NAME}] primeros ${r.primeros.toFixed(2)} · últimos ${r.ultimos.toFixed(2)}`
        + ` en ${Math.round(t1 - t0)}ms.`);

    return {
        method: 'DQN propio, sin dependencias (red densa 3 capas, escrita a mano)',
        entorno: ENTORNO,
        episodios,
        /**
         * ⚠️ SE DEVUELVE LA CURVA, NO SÓLO EL TOTAL. Un número final no distingue
         *    «aprendió» de «tuvo suerte en el último episodio»; lo que lo dice es
         *    que los últimos superen a los primeros, y para verlo hace falta la
         *    serie entera.
         */
        recompensa_primeros: r.primeros,
        recompensa_ultimos: r.ultimos,
        curva: r.curva,
        epsilon_final: r.epsilon,
        sim_time_ms: t1 - t0,
    };
}

/**
 * ⚠️ El episodio corre dentro de un ámbito determinista, como los otros veintiuno.
 *    Aquí importa aún más: un aprendiz que no se repite no es una línea base, es
 *    una anécdota distinta cada vez.
 */
export async function runGymEpisode(...args) {
    return DeterministicScope.runAsync(SEMILLA, () => _episodio(...args));
}
