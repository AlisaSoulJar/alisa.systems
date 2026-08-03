import * as tf from '@tensorflow/tfjs';
import { IDMSystem } from './IDMSystem.js'; // was './IDMEngine.js' — renamed Engine→System in the migration

// Hyperparameters
const MAX_STEPS = 500;
const BATCH_SIZE = 32;
const LEARNING_RATE = 0.001;
const GAMMA = 0.99;
const EPSILON_MIN = 0.01;
const EPSILON_DECAY = 0.995;

function buildModel(stateSize, actionSize) {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, inputShape: [stateSize], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: actionSize, activation: 'linear' }));
    model.compile({ optimizer: tf.train.adam(LEARNING_RATE), loss: 'meanSquaredError' });
    return model;
}

function getInitialVehicles() {
    return [
        { id: 'RL_EGO', x: 0, z: 2.5, dir: 1, speed: 10, baseSpeed: 10, followDist: 15, brakeSensitivity: 0.8, laneChangeChance: 0, laneZ: 2.5, sizeX: 4, sizeZ: 2, brakeFactor: 0, braking: false },
        { id: 'NPC_1', x: 30, z: 2.5, dir: 1, speed: 8, baseSpeed: 8, followDist: 15, brakeSensitivity: 0.8, laneChangeChance: 0.01, laneZ: 2.5, sizeX: 4, sizeZ: 2, brakeFactor: 0, braking: false },
        { id: 'NPC_2', x: 10, z: -2.5, dir: 1, speed: 15, baseSpeed: 15, followDist: 15, brakeSensitivity: 0.8, laneChangeChance: 0.05, laneZ: -2.5, sizeX: 4, sizeZ: 2, brakeFactor: 0, braking: false }
    ];
}

const lanes = [ { z: 2.5, speed: 10, dir: 1 }, { z: -2.5, speed: 15, dir: 1 } ];

async function train() {
    console.log("Initializing IDM Engine DQN Training in Headless Mode...");
    const engine = new IDMSystem({ laneTolerance: 2.5, lookAhead: 50.0 });
    
    // Actions: 0=Stay, 1=Lane Change Left, 2=Lane Change Right
    const ACTION_SIZE = 3;
    // State: Ego speed + 2 closest peers (dx, dz, vx) => 1 + 2*3 = 7
    const STATE_SIZE = 7;
    
    const model = buildModel(STATE_SIZE, ACTION_SIZE);
    let epsilon = 1.0;
    
    let totalReward = 0;
    let vehicles = getInitialVehicles();
    
    console.log("Starting episodic loop...");
    for (let step = 0; step < MAX_STEPS; step++) {
        const egoIndex = vehicles.findIndex(v => v.id === 'RL_EGO');
        if (egoIndex < 0) break;
        const ego = vehicles[egoIndex];
        
        // 1. Get Observation
        const obs = engine.getObservation(ego, vehicles.filter(v => v.id !== 'RL_EGO'), 2);
        let stateArr = [obs.ego.v];
        obs.peers.forEach(p => {
            stateArr.push(p.dx, p.dz, p.vx);
        });
        while (stateArr.length < STATE_SIZE) stateArr.push(0);
        
        let stateTensor = tf.tensor2d([stateArr]);
        
        // 2. Select Action (Epsilon-greedy)
        let action = 0;
        if (Math.random() <= epsilon) {
            action = Math.floor(Math.random() * ACTION_SIZE);
        } else {
            const qs = model.predict(stateTensor);
            action = (await qs.argMax(-1).data())[0];
            qs.dispose();
        }
        
        // 3. Apply Action to Ego
        if (action === 1) ego.z -= 5.0; // Quick Left
        if (action === 2) ego.z += 5.0; // Quick Right
        // Snap back to bounds
        if (ego.z < -2.5) ego.z = -2.5;
        if (ego.z > 2.5) ego.z = 2.5;
        
        // 4. Step Environment
        const updates = engine.tickMultiLane(vehicles, lanes, [], 0.05); // dt=0.05
        
        // Update vehicle state
        updates.forEach(u => {
            const v = vehicles.find(veh => veh.id === u.id);
            if (v) {
                v.brakeFactor = u.brakeFactor;
                v.braking = u.braking;
                if (u.laneChange) Object.assign(v, { laneZ: u.laneChange, z: u.laneChange });
                v.speed = Math.max(0, v.baseSpeed * (1 - v.brakeFactor));
                v.x += v.speed * v.dir * 0.05;
            }
        });
        
        // 5. Calculate Reward (Reward for forward movement, penalty for braking)
        const updatedEgo = vehicles.find(v => v.id === 'RL_EGO');
        let reward = updatedEgo.speed * 0.1;
        if (updatedEgo.braking) reward -= 1.0;
        
        totalReward += reward;
        
        // Train on this immediately (naive online training for demonstration)
        const nextObs = engine.getObservation(updatedEgo, vehicles.filter(v => v.id !== 'RL_EGO'), 2);
        let nextStateArr = [nextObs.ego.v];
        nextObs.peers.forEach(p => nextStateArr.push(p.dx, p.dz, p.vx));
        while (nextStateArr.length < STATE_SIZE) nextStateArr.push(0);
        
        const nextStateTensor = tf.tensor2d([nextStateArr]);
        const nextQs = model.predict(nextStateTensor);
        const maxNextQ = (await nextQs.max().data())[0];
        
        let target = reward + GAMMA * maxNextQ;
        const targetFs = model.predict(stateTensor);
        const targetData = await targetFs.array();
        targetData[0][action] = target;
        
        const targetTensor = tf.tensor2d(targetData);
        await model.fit(stateTensor, targetTensor, { epochs: 1, verbose: 0 });
        
        // Cleanup tensors
        stateTensor.dispose();
        nextStateTensor.dispose();
        nextQs.dispose();
        targetFs.dispose();
        targetTensor.dispose();
        
        if (epsilon > EPSILON_MIN) epsilon *= EPSILON_DECAY;
    }
    
    console.log("Training complete.");
    const weightsOutput = {
        modelArchitecture: "Deep Q-Network",
        stateSize: STATE_SIZE,
        actionSize: ACTION_SIZE,
        finalTotalReward: totalReward.toFixed(2),
        finalEpsilon: epsilon.toFixed(4)
    };
    
    console.log("\n=== FINAL STATE ===");
    console.log(JSON.stringify(weightsOutput, null, 2));
}

train().catch(err => {
    console.error("DQN Error:", err);
    process.exit(1);
});
