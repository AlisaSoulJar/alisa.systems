import { IDMEngine } from '../IDMEngine.js';

function runSimulation() {
    console.log("Starting Headless IDM Traffic Simulation... [ticks=500]");
    const engine = new IDMEngine({ laneLength: 1000 });
    const dt = 0.016;
    
    let vehicles = [];
    for(let i=0; i<10; i++) {
        vehicles.push({
            id: i,
            position: i * 50,
            velocity: 10 + Math.random()*5,
            length: 4.5
        });
    }

    for (let i = 0; i < 500; i++) {
        const updates = engine.tick(vehicles, dt);
        for(let j=0; j<vehicles.length; j++) {
            vehicles[j].position = updates[j].position;
            vehicles[j].velocity = updates[j].velocity;
        }
    }
    
    // Hash output helper
    let finalHash = 0;
    for(let v of vehicles) {
        finalHash += v.position + v.velocity;
    }
    
    const finalState = {
        tick: 500,
        vehicleCount: vehicles.length,
        stateHash: finalHash.toFixed(4)
    };
    
    const finalStateStr = JSON.stringify(finalState);
    console.log("=== FINAL STATE ===");
    console.log(finalStateStr);
}

runSimulation();
