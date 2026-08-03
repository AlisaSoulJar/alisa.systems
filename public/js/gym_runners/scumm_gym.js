import { ScummInteractionEngine } from '../alisa-engine/src/world/systems/ScummInteractionEngine.js';

export async function runGymEpisode(seed = 12345, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] ScummInteractionEngine → Resolviendo Puzzle Espacial BSP (Headless SCUMM)...`);
    
    const engine = new ScummInteractionEngine();
    
    // Configuración del episodio: cuts=5 (32 particiones máximo), stage=3, numSnakes=3, bats=2
    const nDrawers = engine.initEpisode(seed, 5, 3, 3, 2, 'minesweeper').partition.leaves.length;
    
    const t0 = performance.now();
    let totalAttempts = 0;
    
    // Tabular Q-Learning Mock Variables
    let QTable = new Array(nDrawers).fill(0.0);
    const LEARNING_RATE = 0.1;
    const REWARD_SNAKE = -10.0;
    const REWARD_KEY = 5.0;
    const REWARD_GOAL = 20.0;
    const REWARD_EMPTY = -0.1;

    let wins = 0;
    let deaths = 0;

    // Entrenamiento: Múltiples Épocas sobre la misma Seed
    const num_epochs = 1000;
    
    for(let epoch = 0; epoch < num_epochs; epoch++) {
        const state = engine.initEpisode(seed, 5, 3, 3, 2, 'minesweeper');
        
        let maxSteps = nDrawers * 2;
        let survived = true;
        
        for (let i = 0; i < maxSteps; i++) {
            if (state.done) break;
            
            // Epsilon-Greedy Selection
            let epsilon = Math.max(0.05, 1.0 - (epoch / (num_epochs * 0.8))); // Decay
            let targetDrawer = 0;
            
            if (Math.random() < epsilon) {
                targetDrawer = Math.floor(Math.random() * nDrawers); // Explore
            } else {
                // Exploit (argmax Q)
                let maxQ = -Infinity;
                for(let d=0; d<nDrawers; d++) {
                    if (QTable[d] > maxQ) {
                        maxQ = QTable[d];
                        targetDrawer = d;
                    }
                }
            }
            
            let res = engine.selectDrawer(targetDrawer);
            totalAttempts++;
            
            let reward = REWARD_EMPTY;
            if (res.snake) reward = REWARD_SNAKE;
            else if (res.foundKey) reward = REWARD_KEY;
            else if (res.found) reward = REWARD_GOAL;

            // Simple Q-Update (Tabular) - No V(S') since states are memory-less here for simplicity
            QTable[targetDrawer] = QTable[targetDrawer] + LEARNING_RATE * (reward - QTable[targetDrawer]);
            
            if (res.snake) {
                state.dead = true;
                state.done = true;
                deaths++;
                survived = false;
                break;
            }
            if (res.found) {
                wins++;
                break;
            }
        }
    }
    
    const t1 = performance.now();

    console.log(`[${WORKER_NAME}] Simulación SCUMM RL (Q-Table) completada en ${Math.round(t1 - t0)}ms. Épocas: ${num_epochs} [W:${wins} / D:${deaths}]`);

    return {
        method: "SCUMM BSP Q-Learning",
        drawers_total: nDrawers,
        epochs_run: num_epochs,
        attempts: totalAttempts,
        win_rate: (wins / num_epochs).toFixed(2),
        sim_time_ms: t1 - t0,
        tensor_data: QTable // <--- The Actual Q-Table!
    };
}
