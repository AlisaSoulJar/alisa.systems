import { ChopperAquariumEngine } from './ChopperAquariumEngine.js';

const engine = new ChopperAquariumEngine();
engine.reset();

console.log('--- ALISA STIGMERGIC TEST ---');
console.log('Simulating 5 seconds of ecological interactions...');

for(let i=0; i<50; i++) {
    // 50 ticks of 0.1s = 5 seconds
    engine.stepSimulation(0, 0.1, false);
}

const state = engine.getObservationVector();
console.log(`Fishes alive: ${state.meta.ecosystem_fishes}`);
console.log(`Hunters alive: ${state.meta.ecosystem_hunters}`);
console.log(`Sharks alive: ${state.meta.ecosystem_sharks}`);
console.log(`Active Pheromone Voxels: ${state.meta.pheromones.length}`);

if (state.meta.pheromones.length > 0) {
    console.log('Sample voxel: ', state.meta.pheromones[0]);
    console.log('SUCCESS: Pheromone Grid is alive and emitting biological gradients!');
} else {
    console.log('FAIL: No pheromones found in the water. Fishes are holding their breath?');
}
