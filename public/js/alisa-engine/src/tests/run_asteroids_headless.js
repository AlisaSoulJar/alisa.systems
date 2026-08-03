import { AsteroidsEngine } from '../world/systems/AsteroidsEngine.js';
import * as THREE from 'three';

async function runSimulation() {
    global.alisa_nick = "Zazu_Agent";
    console.log("Starting Headless Asteroids Simulation as", global.alisa_nick, "...");
    
    // Mock core and UI callbacks
    const mockCore = {
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(75, 800/600, 0.1, 1000),
        setupDefaultEnvironment: () => {},
        controls: null
    };

    const uiCallbacks = {
        onFlashScreen: () => {},
        onGaugeUpdate: () => {},
        onWaveUpdate: () => {}
    };

    const engine = new AsteroidsEngine(mockCore, uiCallbacks);
    
    // Mock AssetManager to skip loading actual GLB files in headless mode
    // We already have a fallback inside AsteroidsEngine, but we bypass AssetManager call to avoid fetch in Node
    engine.loadAssets = async function() {
        this.modelShip = new THREE.Group();
        this.modelShip.add(new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 8)));
        this.modelDrone = new THREE.Group();
        this.modelDrone.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8)));
        this.rockModels = [];
        for(let i=0; i<3; i++) {
            const r = new THREE.Group();
            r.add(new THREE.Mesh(new THREE.DodecahedronGeometry(1.0), new THREE.MeshStandardMaterial({color:0xffffff, emissive:0x000000})));
            this.rockModels.push(r);
        }
    };

    await engine.loadAssets();
    
    engine.start({
        stage: 1,
        shipClass: 'VIPER',
        asteroidDensity: 10,
        scrollSpeed: 20
    });

    const dt = 0.016; // 60hz
    const ticks = 1800; // 30 seconds

    for(let i = 0; i < ticks; i++) {
        engine.tick(dt);
        // Break early if ship died to save CPU, or let it revive
    }

    console.log("=== FINAL ASTEROIDS RESULTS ===");
    console.log(`Ticks simulated: ${ticks}`);
    console.log(`Time: ${engine.stats.time.toFixed(1)}s`);
    console.log(`Score: ${engine.stats.score}`);
    console.log(`Deaths: ${engine.stats.deaths}`);
    console.log(`Graze: ${engine.stats.graze}`);

    if (process.env.ALISA_SUBMIT_TELEMETRY === '1') {
        console.log("Submitting telemetry because ALISA_SUBMIT_TELEMETRY=1...");
        engine.submitTelemetry({ force: true });

        // Wait for async fetch to finish in Node
        await new Promise(r => setTimeout(r, 2000));
    } else {
        console.log("Skipping telemetry submission (set ALISA_SUBMIT_TELEMETRY=1 to publish benchmark data).");
    }

    return {
        success: true,
        score: engine.stats.score,
        deaths: engine.stats.deaths
    };
}

runSimulation().then(res => {
    if (!res.success) process.exit(1);
}).catch(err => {
    console.error("Simulation failed:", err);
    process.exit(1);
});
