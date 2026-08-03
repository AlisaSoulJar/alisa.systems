import * as THREE from 'three';
import { BaseEnvironmentFactory } from './BaseEnvironmentFactory.js';

export class MorpheusEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene, engine) {
        super(scene, engine);
        this.obstacles = [];
        this.trackGroup = new THREE.Group();
    }

    setupLighting() {
        this.applyLightingPreset({
            hemi: { skyColor: 0xffffff, groundColor: 0xaaaaaa, intensity: 1.0 },
            fog: { color: 0xe0e0e0, density: 0.01 }
        });
    }

    setupTrack() {
        const grid = new THREE.GridHelper(200, 100, 0x000000, 0x000000);
        grid.material.opacity = 0.1;
        grid.material.transparent = true;
        this.scene.add(grid);
        this.scene.add(this.trackGroup);
    }

    buildObstacleCourse() {
        while(this.trackGroup.children.length > 0) this.trackGroup.remove(this.trackGroup.children[0]);
        this.obstacles.length = 0;

        const boxGeo = new THREE.BoxGeometry(4, 1, 1);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.2 });

        for(let i=0; i<5; i++) {
            const obs = new THREE.Mesh(boxGeo, boxMat);
            obs.position.set(0, 0.5, i * 15 + 10);
            this.trackGroup.add(obs);
            this.obstacles.push({
                mesh: obs,
                box: new THREE.Box3().setFromObject(obs)
            });
        }
    }

    buildAll() {
        this.setupLighting();
        this.setupTrack();
        this.buildObstacleCourse();
    }
}
