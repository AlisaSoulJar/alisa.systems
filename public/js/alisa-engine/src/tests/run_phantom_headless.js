import { PhantomFSMEngine } from '../PhantomFSMEngine.js';

function runSimulation() {
    const engine = new PhantomFSMEngine();
    const dt = 0.016; // 60hz tick
    
    engine.initAgent(1, {x: 0, z: 0});
    
    const env = {
        seekerRoom: 1,
        seekerPos: { x: 5, z: 5 },
        isIlluminated: false,
        rooms: [{id: 1, center: {x: 0, z: 0}}, {id: 2, center: {x: 20, z: 20}}],
        exploredRooms: new Set([1]),
        walls: [],
        arenaW: 30,
        arenaH: 30
    };

    console.log("Starting Headless Simulation... [ticks=500]");

    for (let i = 0; i < 500; i++) {
        // Illumination pushes the angel back
        if (i > 100 && i < 200) {
            env.isIlluminated = true; 
        } else {
            // Darkness allows the angel to approach and build ambush timer
            env.isIlluminated = false; 
            
            // Move seeker closer to simulate interaction
            env.seekerPos.x -= 0.01;
            env.seekerPos.z -= 0.01;
        }
        
        engine.update(dt, env);
    }
    
    // Print the definitive mathematical state
    const finalStateStr = JSON.stringify(engine.agentState);
    console.log("=== FINAL STATE ===");
    console.log(finalStateStr);
}

runSimulation();
