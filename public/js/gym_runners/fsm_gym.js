/**
 * fsm_gym.js — la máquina de estados del motor, sin pantalla
 * ═══════════════════════════════════════════════════════════════════════════
 * Cinco bichos con cognición "triuna": deambulan, huyen de la amenaza, cazan a
 * la presa y atacan cuando la alcanzan. Cada uno lleva su propia `FSMSystem`.
 *
 * QUÉ DEMUESTRA
 * -------------
 * Que el comportamiento no está cableado en el juego: está declarado como
 * estados y transiciones sobre el primitivo genérico del motor. El mismo
 * `FSMSystem` mueve a PhantomFSM, CuccoGame, CorporateSeeker o StealthSight.
 * Aquí corre a 2000 ticks sin abrir una ventana — que es lo que lo hace
 * medible.
 *
 * ⚠️ POR QUÉ ESTABA ROTO
 * Este fichero llamaba a `new FSMSystem({fovAngle, fleeDistance, …})` y a
 * `engine.tick(agente, amenaza, presa, dt)`, una API de una versión anterior
 * que ya no existe. Nunca reventó porque el fichero solo EXPORTABA la función
 * y nadie la llamaba: `node fsm_gym.js` no imprimía nada y parecía correcto.
 * Un banco de pruebas que no se ejecuta no prueba nada.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { FSMSystem } from '../alisa-engine/src/psyche/FSMSystem.js';

const ESTADOS = ['WANDER', 'FLEE', 'CHASE', 'ATTACK'];

const DIST_HUIDA  = 12;   // más cerca que esto y la amenaza le espanta
const DIST_CAZA   = 20;   // dentro de esto persigue a la presa
const DIST_ATAQUE = 2;    // pegado: ataca
const VELOCIDAD   = 6;

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Un bicho = una FSM + su cuerpo. La FSM decide, el cuerpo se mueve.
 * Las condiciones leen la pizarra (`blackboard`), que es donde el bucle deja
 * lo que el bicho "ve" en cada tick.
 */
function nuevoBicho(id, rnd) {
    const fsm = new FSMSystem(ESTADOS, 'WANDER');

    const amenazaCerca = (b) => b.distAmenaza < DIST_HUIDA;
    const presaLejos   = (b) => b.distPresa > DIST_CAZA;

    // Huir manda sobre todo lo demás: se sale de cualquier estado.
    for (const desde of ['WANDER', 'CHASE', 'ATTACK']) {
        fsm.addTransition(desde, 'FLEE', amenazaCerca);
    }
    fsm.addTransition('FLEE',   'WANDER', (b) => !amenazaCerca(b));
    fsm.addTransition('WANDER', 'CHASE',  (b) => !amenazaCerca(b) && b.distPresa <= DIST_CAZA);
    fsm.addTransition('CHASE',  'ATTACK', (b) => b.distPresa <= DIST_ATAQUE);
    fsm.addTransition('CHASE',  'WANDER', presaLejos);
    fsm.addTransition('ATTACK', 'CHASE',  (b) => b.distPresa > DIST_ATAQUE);

    return {
        id,
        fsm,
        pos: { x: (rnd() - 0.5) * 40, y: 0, z: (rnd() - 0.5) * 40 },
        aliento: 10,
    };
}

/** Mulberry32: mismo generador que el resto del gym, para que sea repetible. */
function aleatorio(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export async function runGymEpisode(ticks = 2000, semilla = 1234) {
    const rnd = aleatorio(semilla);
    const bichos = Array.from({ length: 5 }, (_, i) => nuevoBicho(i, rnd));

    const amenaza = { x: 15, y: 0, z: 0 };
    const presa   = { x: -10, y: 0, z: -10 };

    const dt = 0.016;
    const t0 = performance.now();
    const conteo = { WANDER: 0, FLEE: 0, CHASE: 0, ATTACK: 0 };
    let cambios = 0;

    for (let t = 0; t < ticks; t++) {
        // La amenaza patrulla en círculo; la presa va a la deriva.
        amenaza.x = Math.cos(t * dt * 0.5) * 20;
        amenaza.z = Math.sin(t * dt * 0.5) * 20;
        presa.x = Math.max(-20, Math.min(20, presa.x + (rnd() - 0.5) * 0.5));
        presa.z = Math.max(-20, Math.min(20, presa.z + (rnd() - 0.5) * 0.5));

        for (const b of bichos) {
            const antes = b.fsm.currentState;

            // Lo que el bicho percibe este tick va a la pizarra.
            b.fsm.blackboard.distAmenaza = dist(b.pos, amenaza);
            b.fsm.blackboard.distPresa   = dist(b.pos, presa);
            b.fsm.tick(dt);

            const estado = b.fsm.currentState;
            if (estado !== antes) cambios++;
            conteo[estado]++;

            // El estado decide hacia dónde y a qué ritmo.
            let destino = null, ritmo = 0.5;
            if (estado === 'FLEE')  { destino = amenaza; ritmo = 1.5; }
            if (estado === 'CHASE') { destino = presa;   ritmo = 1.2; }

            if (destino) {
                const d = dist(b.pos, destino) || 1;
                const signo = (estado === 'FLEE') ? -1 : 1;
                b.pos.x += signo * ((destino.x - b.pos.x) / d) * VELOCIDAD * ritmo * dt;
                b.pos.z += signo * ((destino.z - b.pos.z) / d) * VELOCIDAD * ritmo * dt;
            }

            // Correr cansa; deambular repone.
            b.aliento = (estado === 'FLEE' || estado === 'CHASE')
                ? Math.max(0, b.aliento - dt)
                : Math.min(10, b.aliento + dt * 0.5);
        }
    }

    return {
        method: 'Triune Cognition FSM (Wander/Flee/Chase/Attack) sobre FSMSystem',
        ticks,
        semilla,
        agentes: bichos.length,
        cambios_de_estado: cambios,
        ticks_por_estado: conteo,
        aliento_final: bichos.map(b => Number(b.aliento.toFixed(2))),
        sim_time_ms: Number((performance.now() - t0).toFixed(2)),
    };
}

// Cola de línea de comandos. `import 'node:url'` arriba del fichero hacía que
// el navegador ni pudiera CARGAR el módulo: se moría al resolver el specifier,
// antes de llegar a ninguna función. Ahora la dependencia de Node se pide sólo
// si estamos en Node, así que el mismo fichero sirve para `node fsm_gym.js` y
// para el banco de motores del navegador.
if (typeof process !== 'undefined' && process.argv?.[1]) {
    const { pathToFileURL } = await import('node:url');
    if (import.meta.url === pathToFileURL(process.argv[1]).href) {
        console.log(JSON.stringify(await runGymEpisode(), null, 2));
    }
}
