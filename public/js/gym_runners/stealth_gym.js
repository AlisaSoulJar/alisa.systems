import { StealthSightSystem } from '../alisa-engine/src/world/systems/StealthSightSystem.js';

export async function runGymEpisode(epochs = 1500, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] StealthSightSystem → Q-Learning Headless RL por ${epochs} epocas...`);

    const engine = new StealthSightSystem();

    // Map definition
    const walls = [
        { minX: -10, maxX: -9, minZ: -10, maxZ: 10 },
        { minX: 9, maxX: 10, minZ: -10, maxZ: 10 },
        { minX: -10, maxX: 10, minZ: -10, maxZ: -9 },
        { minX: -10, maxX: 10, minZ: 9, maxZ: 10 },
        { minX: -3, maxX: -2, minZ: -3, maxZ: 3 },
        { minX: 2, maxX: 3, minZ: -3, maxZ: 3 }
    ];

    const target = { x: 7, z: 7 };
    const guard = { x: 0, z: 0 }; // The Guard is in the center, can see through the middle

    // Q-Learning parameters
    let QTable = {}; // "x,z" -> [Q_UP, Q_DOWN, Q_LEFT, Q_RIGHT]
    const LEARNING_RATE = 0.1;
    const DISCOUNT_FACTOR = 0.95;
    
    function getState(x, z) {
        return `${Math.floor(x)},${Math.floor(z)}`;
    }
    
    function getQ(state) {
        if (!QTable[state]) QTable[state] = [0, 0, 0, 0];
        return QTable[state];
    }

    const t0 = performance.now();
    let wins = 0, deaths = 0, total_steps = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
        let agent = { x: -7, z: -7 }; // Start position
        let done = false;
        let steps = 0;
        
        let epsilon = Math.max(0.05, 1.0 - (epoch / (epochs * 0.8)));

        while (!done && steps < 200) {
            steps++;
            total_steps++;
            
            let stateStr = getState(agent.x, agent.z);
            let qVals = getQ(stateStr);
            
            let action = 0;
            if (Math.random() < epsilon) {
                action = Math.floor(Math.random() * 4);
            } else {
                let maxQ = -Infinity;
                for (let a = 0; a < 4; a++) {
                    if (qVals[a] > maxQ) { maxQ = qVals[a]; action = a; }
                }
            }

            // Execute action
            let vx = 0, vz = 0;
            if (action === 0) vz = 1; // UP
            if (action === 1) vz = -1; // DOWN
            if (action === 2) vx = -1; // LEFT
            if (action === 3) vx = 1; // RIGHT

            let newX = agent.x + vx;
            let newZ = agent.z + vz;

            // Resolve collision against walls using engine
            const resolved = engine.resolveCollisions(newX, newZ, walls, 0.4);
            let hitWall = (resolved.x !== newX || resolved.z !== newZ);
            agent.x = resolved.x;
            agent.z = resolved.z;

            let nextStateStr = getState(agent.x, agent.z);
            let nextQVals = getQ(nextStateStr);
            let maxNextQ = Math.max(...nextQVals);

            // Compute reward
            let reward = -0.1; // step penalty
            if (hitWall) reward = -1.0;

            let distToTarget = Math.hypot(target.x - agent.x, target.z - agent.z);
            if (distToTarget < 1.5) {
                reward = 100.0;
                wins++;
                done = true;
            } else {
                // Check Guard LOS
                if (engine.canSeePoint2D(guard.x, guard.z, agent.x, agent.z, walls, 15)) {
                    reward = -100.0;
                    deaths++;
                    done = true;
                }
            }

            // Q-Learning update
            QTable[stateStr][action] = qVals[action] + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - qVals[action]);
        }
    }

    const t1 = performance.now();
    console.log(`[${WORKER_NAME}] Entrenamiento Q-Learning completado en ${Math.round(t1 - t0)}ms.`);

    return {
        method: "Stealth Q-Learning (Evade LOS)",
        epochs: epochs,
        wins: wins,
        deaths: deaths,
        total_steps: total_steps,
        win_rate: ((wins / epochs) * 100).toFixed(1) + "%",
        sim_time_ms: t1 - t0,
        q_table_size: Object.keys(QTable).length
    };
}
