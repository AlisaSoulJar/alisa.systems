import { AsteroidsSystem } from '../systems/AsteroidsSystem.js';
import { MMOClient } from '../../soma/utils/MMOClient.js';

self.onmessage = async (e) => {
    const data = e.data;
    if (data.command === 'run_asteroids') {
        const ticks = data.iterations || 1800; // Default: 30 seconds at 60fps
        const shipClass = data.shipClass || 'VIPER';
        const playerNick = data.player || 'Agent_WebWorker';
        
        self.postMessage({ type: 'log', message: `[WebWorker] Starting Headless RL Training as ${playerNick} (${ticks} ticks)` });

        // Instantiate pure mathematical system without THREE.js dependencies
        const sys = new AsteroidsSystem();
        sys.start(1, shipClass, 10, 20, 0); // stage, shipClass, asteroidDensity, scrollSpeed, maxEnemies
        
        const dt = 0.016; // 60hz step
        for (let i = 0; i < ticks; i++) {
            sys.tick(dt);
        }

        self.postMessage({ 
            type: 'result', 
            status: 'finished', 
            score: sys.stats.score, 
            deaths: sys.stats.deaths, 
            graze: sys.stats.graze,
            time: sys.stats.time 
        });

        if (data.submitTelemetry === true) {
            self.postMessage({ type: 'log', message: `[WebWorker] Submitting telemetry to benchmark backend...` });

            // Hack to let MMOClient use the correct name in headless mode
            globalThis.alisa_nick = playerNick;

            try {
                MMOClient.submitTelemetry('asteroids', sys.stats.score, { stage: 1, time: sys.stats.time, graze: sys.stats.graze });
                self.postMessage({ type: 'log', message: `[WebWorker] Telemetry successfully dispatched.` });
            } catch(err) {
                self.postMessage({ type: 'error', message: `[WebWorker] Failed to dispatch telemetry: ${err.message}` });
            }
        } else {
            self.postMessage({ type: 'log', message: `[WebWorker] Telemetry skipped. Pass submitTelemetry: true to publish benchmark data.` });
        }
    }
};
