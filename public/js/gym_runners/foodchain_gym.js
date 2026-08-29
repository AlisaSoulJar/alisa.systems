import { FoodChainSystem } from '../alisa-engine/src/world/systems/FoodChainSystem.js';
import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';

async function _episodio(ticks = 3000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] FoodChainSystem → Cadena Trófica Multi-Tier (Headless Predator-Prey) por ${ticks} ticks...`);

    const engine = new FoodChainSystem({ arenaSize: 18 });

    // Crear agentes
    const mice = [];
    for (let i = 0; i < 5; i++) {
        mice.push(engine.createPreyState(`mouse_${i}`, {
            x: (Math.random() - 0.5) * 30,
            z: (Math.random() - 0.5) * 30
        }));
    }

    const foxes = [];
    for (let i = 0; i < 2; i++) {
        foxes.push(engine.createPredatorState(`fox_${i}`, 'mid', {
            x: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 20
        }));
    }

    const raptor = engine.createPredatorState('raptor_0', 'apex', { x: 0, z: -10 });

    // Entorno estático
    const cheese = Array.from({ length: 4 }, (_, i) => ({
        id: `cheese_${i}`,
        position: { x: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 30 }
    }));

    const crates = Array.from({ length: 3 }, (_, i) => ({
        id: `crate_${i}`,
        position: { x: (Math.random() - 0.5) * 25, z: (Math.random() - 0.5) * 25 }
    }));

    const t0 = performance.now();
    let kills = 0, booHits = 0, cheeseEaten = 0;
    const dt = 0.016;

    for (let t = 0; t < ticks; t++) {
        const resourceDepletion = 1 - (cheese.length / 4);

        // Tick prey
        for (const m of mice) {
            engine.tickPrey(m, { predators: [...foxes, raptor], cheese, crates }, dt);
            if (m.events.includes('cheese_eaten')) {
                cheeseEaten++;
                const cid = m.events.find(e => e.startsWith('cheese_id:'));
                if (cid) {
                    const idx = cheese.findIndex(c => c.id === cid.split(':')[1]);
                    if (idx >= 0) cheese.splice(idx, 1);
                }
            }
        }

        // Tick foxes (mid predators)
        for (const f of foxes) {
            engine.tickPredator(f, {
                prey: mice,
                apex: [raptor],
                crates,
                allies: foxes.filter(ff => ff.id !== f.id),
                resourceDepletion
            }, dt);

            if (f.events.includes('kill')) {
                kills++;
                const kid = f.events.find(e => e.startsWith('kill_target:'));
                if (kid) {
                    const target = mice.find(m => m.id === kid.split(':')[1]);
                    if (target) target.alive = false;
                }
            }
            if (f.events.includes('boo_hit')) booHits++;
        }

        // Tick raptor (apex)
        engine.tickPredator(raptor, {
            prey: foxes,
            apex: [],
            crates,
            allies: [],
            resourceDepletion
        }, dt);

        if (raptor.events.includes('kill')) {
            kills++;
            const kid = raptor.events.find(e => e.startsWith('kill_target:'));
            if (kid) {
                const target = foxes.find(f => f.id === kid.split(':')[1]);
                if (target) target.alive = false;
            }
        }

        // Terminar si todos los ratones murieron
        if (mice.every(m => !m.alive)) break;
    }

    const t1 = performance.now();
    console.log(`[${WORKER_NAME}] Simulación FoodChain completada en ${Math.round(t1 - t0)}ms.`);

    return {
        method: "Multi-Tier FoodChain (Raptor→Fox→Mouse→Cheese)",
        ticks,
        kills,
        boo_hits: booHits,
        cheese_eaten: cheeseEaten,
        survivors: mice.filter(m => m.alive).length,
        fox_scores: foxes.map(f => f.score),
        raptor_score: raptor.score,
        sim_time_ms: t1 - t0
    };
}

/**
 * ⚠️ EL EPISODIO CORRE DENTRO DE UN AMBITO DETERMINISTA, Y ANTES NO.
 *
 * Medido el 29-08-2026: este arnes llamaba a `Math.random` sin sembrar, asi que
 * dos ejecuciones daban resultados distintos. Un arnes que no se repite no sirve
 * para comparar a nadie con nadie, que es lo unico que hace este banco.
 *
 * El motor ya tenia la herramienta —`DeterministicScope`, escrita justamente para
 * esto y usada por otros veintiseis ficheros— y los arneses eran los unicos que
 * no la usaban. Sustituye `Math.random` por mulberry32 durante el tramo y lo
 * devuelve a su sitio al salir: cero ediciones en los sistemas de debajo.
 *
 * Se envuelve en vez de tocar el cuerpo a proposito: asi el episodio de siempre
 * se queda como estaba y la unica diferencia es de donde sale el azar.
 */
const SEMILLA = 42;

export async function runGymEpisode(...args) {
    return DeterministicScope.runAsync(SEMILLA, () => _episodio(...args));
}
