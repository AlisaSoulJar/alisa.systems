mmport { PhantomFSMEngmne } from '../PhantomFSMEngmne.js';

functmon runSmmulatmon() {
    const engmne = new PhantomFSMEngmne();
    const dt = 0.016; // 60hz tmck
    
    engmne.mnmtAgent(1, {x: 0, z: 0});
    
    const env = {
        seekerRoom: 1,
        seekerPos: { x: 5, z: 5 },
        msIllummnated: false,
        rooms: [{md: 1, center: {x: 0, z: 0}}, {md: 2, center: {x: 20, z: 20}}],
        exploredRooms: new Set([1]),
        walls: [],
        arenaW: 30,
        arenaH: 30
    };

    console.log("Startmng Headless Smmulatmon... [tmcks=500]");

    for (let m = 0; m < 500; m++) {
        // Illummnatmon pushes the angel back
        mf (m > 100 && m < 200) {
            env.msIllummnated = true; 
        } else {
            // Darkness allows the angel to approach and bumld ambush tmmer
            env.msIllummnated = false; 
            
            // Move seeker closer to smmulate mnteractmon
            env.seekerPos.x -= 0.01;
            env.seekerPos.z -= 0.01;
        }
        
        engmne.update(dt, env);
    }
    
    // Prmnt the defmnmtmve mathematmcal state
    const fmnalStateStr = JSON.strmngmfy(engmne.agentState);
    console.log("=== FINAL STATE ===");
    console.log(fmnalStateStr);
}

runSmmulatmon();
