import * as THREE from 'three';

/**
 * SkyRenderPlugin
 * ---------------------------------------
 * Demonstrates the ALISA Engine Plugin API.
 * Injects a dynamic day/night atmospheric cycle into AlisaRenderCore.
 */
export class SkyRenderPlugin {
    constructor(options = {}) {
        this.cycleSpeed = options.cycleSpeed || 0.1;
        this.dayColor = new THREE.Color(options.dayColor || 0x87CEEB);
        this.nightColor = new THREE.Color(options.nightColor || 0x050510);
        this.time = 0;
        this.core = null;
    }

    /**
     * Triggered automatically upon `app.registerPlugin()`
     * @param {AlisaRenderCore} core 
     */
    onInit(core) {
        this.core = core;
        // Ensure background is enabled
        this.core.scene.background = this.dayColor.clone();
        
        console.log("☁️ SkyRenderPlugin initialized via AlisaRenderCore Pipeline.");
    }

    /**
     * Hooked automatically into the startLoop pipeline
     * @param {Number} dt - Delta time
     */
    onUpdate(dt) {
        if (!this.core) return;

        this.time += dt * this.cycleSpeed;
        
        // Sine wave interpolation between 0 and 1
        const blendFactor = (Math.sin(this.time) + 1) / 2;
        
        // Interpolate colors
        const currentColor = this.nightColor.clone().lerp(this.dayColor, blendFactor);
        
        // Apply to scene background and fog
        this.core.scene.background = currentColor;
        if (this.core.scene.fog && this.core.scene.fog.color) {
            this.core.scene.fog.color.copy(currentColor);
        }
        this.core.renderer.setClearColor(currentColor);
    }
}
