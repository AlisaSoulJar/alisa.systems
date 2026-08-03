import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * ALISA BLOOM ENGINE (Post-Processing Component)
 * -----------------------------------------------------
 * A modular pipeline plugin for AlisaRenderCore that enables
 * high-performance UnrealBloom lighting for synthwave/neon aesthetics.
 */
export class AlisaBloomEngine {
    constructor(core, strength = 1.2, radius = 0.5, threshold = 0.2) {
        this.core = core;

        // Initialize Composer Map
        this.composer = new EffectComposer(this.core.renderer);
        
        // 1. Render Scene Base Pass
        const renderPass = new RenderPass(this.core.scene, this.core.camera);
        this.composer.addPass(renderPass);
        
        // 2. Unreal Bloom Pass
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.bloomPass = new UnrealBloomPass(resolution, strength, radius, threshold);
        
        // Configuration options for bloom flavor
        this.bloomPass.strength = strength;
        this.bloomPass.radius = radius;
        this.bloomPass.threshold = threshold;
        this.composer.addPass(this.bloomPass);
        
        // 3. Output Pass (ToneMapping correctly handled)
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        // Bind Resize to ensure resolution scales dynamically
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Helper to get the bound composer render hook
     * Usage: app.startLoop(system.tick.bind(system), bloom.render.bind(bloom))
     */
    render(dt) {
        this.composer.render(dt);
    }
}
