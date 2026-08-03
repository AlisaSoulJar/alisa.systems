import * as THREE from 'three';
import { HubClient } from '../utils/HubClient.js';

/**
 * ColonialMetabolismEngine
 * ES6 Tensegrity Engine bridging Python's Tokenomics (Energy/Heat)
 * into mathematical graphical representations in Three.js.
 */
export class ColonialMetabolismSystem {
    /**
     * @param {THREE.Scene} scene
     * @param {Object} options
     * @param {string} [options.hubUrl='http://127.0.0.1:8741'] - Base URL for the data API
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        
        this.targetLightIntensity = options.baseLightIntensity || 1.0;
        this.currentLightIntensity = this.targetLightIntensity;
        this.baseColor = new THREE.Color(options.baseColor || 0xd1e8ff);
        this.poorColor = new THREE.Color(0x334455);
        
        // 1. Ambient Light Controller
        this.ambientLight = null;
        scene.traverse((node) => {
            if (node.isAmbientLight) this.ambientLight = node;
        });
        if (!this.ambientLight) {
            this.ambientLight = new THREE.AmbientLight(this.baseColor, this.currentLightIntensity);
            scene.add(this.ambientLight);
        }

        // 2. Thermodynamic Fog Controller (Heat Waste)
        this.baseFogDensity = options.fogDensity || 0.002;
        this.sceneFog = new THREE.FogExp2(0x000814, this.baseFogDensity);
        scene.fog = this.sceneFog;
        
        this.heatFogColor = new THREE.Color(0xff2200); // Red heat
        this.coldFogColor = new THREE.Color(0x000814); // Normal void
        
        this.treasuryBalance = -1;
        this.heatSpike = 0.0; // Decay variable for visual heat spikes

        this.pollInterval = 3000; // ms
        this.lastPoll = 0;
    }

    /**
     * Start autonomous polling of the Python Hub
     */
    startMetabolism() {
        this.pollStatus();
    }

    async pollStatus() {
        const data = await HubClient.get('/tokenomics/portfolio/treasury');
        if (data) {
            const newBalance = data.neuro_dust || 0;
            
            if (this.treasuryBalance !== -1 && newBalance < this.treasuryBalance) {
                const diff = this.treasuryBalance - newBalance;
                console.warn(`[MetabolismEngine] Detected Entropy Pulse! Lost ${diff} DUST as heat.`);
                this.triggerHeatSpike(Math.min(1.0, diff / 50.0));
            }
            
            this.treasuryBalance = newBalance;
            this.updateLightTargets(newBalance);
        }

        // Re-schedule
        setTimeout(() => this.pollStatus(), this.pollInterval);
    }

    updateLightTargets(balance) {
        // High treasury > 1000 = Bright
        // Low treasury < 100 = Dim and sad
        const factor = Math.max(0, Math.min(1, balance / 1000.0));
        
        // Target intensity mapping
        this.targetLightIntensity = 0.2 + (factor * 1.5); 
        
        // If poor, colors go gray/cold
        this.ambientLight.color.copy(this.poorColor).lerp(this.baseColor, factor);
    }

    /**
     * Triggered artificially or by polling when entropy drops
     * @param {number} intensity 0.0 to 1.0 
     */
    triggerHeatSpike(intensity) {
        this.heatSpike = Math.max(this.heatSpike, intensity);
    }

    /**
     * Integrate into AlisaRenderCore tick loop
     */
    tick(deltaTime) {
        // 1. Smoothly interpolate Ambient Light towards target
        this.currentLightIntensity = THREE.MathUtils.lerp(this.currentLightIntensity, this.targetLightIntensity, deltaTime * 2.0);
        this.ambientLight.intensity = this.currentLightIntensity;

        // 2. Decay Heat Spike termodynamics over time
        if (this.heatSpike > 0) {
            this.heatSpike -= deltaTime * 0.5; // Decays over ~2 seconds
            if (this.heatSpike < 0) this.heatSpike = 0;
        }

        // 3. Map Heat to Fog visuals
        // Normal density = base (0.002), Heat spike = high density (0.05)
        const targetDensity = this.baseFogDensity + (this.heatSpike * 0.03);
        this.sceneFog.density = THREE.MathUtils.lerp(this.sceneFog.density, targetDensity, deltaTime * 5.0);
        
        // Interpolate fog color towards red based on heat spike
        const targetFogColor = this.coldFogColor.clone().lerp(this.heatFogColor, this.heatSpike);
        this.sceneFog.color.lerp(targetFogColor, deltaTime * 5.0);
    }
}
