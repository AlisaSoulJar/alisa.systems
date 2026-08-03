import { ChopperAquariumEngine } from '../world/systems/ChopperAquariumEngine.js';

async function runSimulation() {
    console.log("Starting Headless Chopper Aquarium Simulation...");
    const engine = new ChopperAquariumEngine();
    
    let crashCount = 0;
    let winCount = 0;
    let timeoutCount = 0;
    const episodes = 5;

    for (let e = 0; e < episodes; e++) {
        engine.reset(42 + e);
        const dt = 0.016; // 60hz tick
        let ticks = 0;
        
        while (!engine.gameState.ended && ticks < 3000) {
            engine.stepSimulation(0, dt, false);
            ticks++;
        }
        
        if (engine.gameState.ended) {
            const currentFuel = engine.ecs.getComponent(engine.chopperEntity, 'EnergyComponent').currentEnergy;
            if (currentFuel <= 0) {
                crashCount++;
            } else {
                winCount++;
            }
        } else {
            console.log(`Episode ${e+1}: TIMEOUT (3000 ticks)`);
            timeoutCount++;
        }
    }

    console.log("=== FINAL CHOPPER RESULTS ===");
    console.log(`Episodes: ${episodes}`);
    console.log(`Wins: ${winCount}`);
    console.log(`Crashes: ${crashCount}`);
    console.log(`Timeouts: ${timeoutCount}`);

    return {
        success: crashCount === 0 || winCount > 0,
        wins: winCount,
        crashes: crashCount,
        timeouts: timeoutCount
    };
}

runSimulation().then(res => {
    if (!res.success) process.exit(1);
}).catch(err => {
    console.error("Simulation failed:", err);
    process.exit(1);
});
