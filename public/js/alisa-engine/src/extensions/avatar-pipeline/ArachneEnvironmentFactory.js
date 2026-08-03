import * as THREE from 'three';
import { BaseEnvironmentFactory } from './BaseEnvironmentFactory.js';

export class ArachneEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene, gfxEngine) {
        super(scene, gfxEngine);
        this.tubeLight = null;
        this.spiderGlow = null;
    }

    setupLighting() {
        this.applyLightingPreset({
            ambient: { color: 0x1a0a2e, intensity: 0.6 },
            fills: [
                { color: 0x6622aa, intensity: 30, range: 50, position: [-20, 5, 15] },
                { color: 0x6622aa, intensity: 30, range: 50, position: [20, 5, -15] },
                { color: 0x6622aa, intensity: 30, range: 50, position: [0, 3, 20] }
            ]
        });

        this.tubeLight = new THREE.SpotLight(0x00ffcc, 0, 60, Math.PI / 7, 0.7, 1);
        this.tubeLight.position.set(0, 40, 0);
        this.tubeLight.target.position.set(0, 0, 0);
        this.tubeLight.castShadow = true;
        this.scene.add(this.tubeLight);
        this.scene.add(this.tubeLight.target);

        this.spiderGlow = new THREE.PointLight(0xff2200, 0, 18);
        this.spiderGlow.position.set(0, 0.5, -10);
        this.scene.add(this.spiderGlow);
    }

    setupDust() {
        this.createDustField({
            count: 300,
            spread: [50, 30, 50],
            color: 0x8866bb,
            size: 0.08,
            opacity: 0.4
        });
    }
}
