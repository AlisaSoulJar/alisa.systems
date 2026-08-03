import { BoidsSystem } from '../world/systems/BoidsSystem.js';

function runSimulation() {
    const engine = new BoidsSystem();
    const dt = 0.016; // 60hz tick
    
    // Config: 20 boids, bounded -20 to 20
    const bounds = { minX: -20, maxX: 20, minY: -5, maxY: 5, minZ: -20, maxZ: 20 };
    engine.initAgents(20, bounds);
    
    console.log("Starting Headless Boids Simulation... [ticks=1000]");

    // Setup an environment hazard
    const predator = { position: { x: 0, y: 0, z: 0 }, power: 15 };

    for (let i = 0; i < 1000; i++) {
        // Move predator in a circle
        predator.position.x = Math.sin(i * 0.02) * 10;
        predator.position.z = Math.cos(i * 0.02) * 10;
        
        engine.update(dt, predator, null);
    }
    
    // Hash output helper (we need exact state, but boids state is huge, let's summarize center of mass)
    let cx = 0, cy = 0, cz = 0;
    for(let b of engine.flock) {
        cx += b.position.x; cy += b.position.y; cz += b.position.z;
    }
    cx /= engine.flock.length;
    cy /= engine.flock.length;
    cz /= engine.flock.length;
    
    const finalState = {
        tick: 1000,
        centerOfMass: { x: cx, y: cy, z: cz },
        predatorFinalPos: predator.position
    };
    
    const finalStateStr = JSON.stringify(finalState);
    console.log("=== FINAL STATE ===");
    console.log(finalStateStr);
}

runSimulation();
