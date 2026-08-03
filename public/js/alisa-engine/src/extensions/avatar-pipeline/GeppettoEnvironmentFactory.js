import * as THREE from 'three';
import { BaseEnvironmentFactory } from './BaseEnvironmentFactory.js';

export class GeppettoEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene, gfxEngine) {
        super(scene, gfxEngine);
        
        this.tankGroup = null;
        this.propHolder = null;
        this.waterSurface = null;
        this.waterGlow = null;
        this.leds = [];
        this.curves = [];
        this.impulses = [];
        
        this.TANK_BOTTOM = 2.0;
        this.TANK_TOP = 8.0;
        this.WATER_FULL = 7.8;
        this.FLOAT_Y = 5.0;
        this.PLUNGE_Y = 3.0;
        this.DROP_START = 12.0;
    }

    setupLighting() {
        this.applyLightingPreset({
            ambient: { color: 0x2a3c52, intensity: 3.0 },
            hemi: { skyColor: 0x334466, groundColor: 0x112211, intensity: 1.8 },
            fills: [
                { color: 0xff8844, intensity: 1.2, range: 40, position: [0, 8, -12] },
                { color: 0x2266aa, intensity: 0.8, range: 20, position: [-10, 5, 0] },
                { color: 0x2266aa, intensity: 0.8, range: 20, position: [10, 5, 0] }
            ]
        });
    }

    setupRoom() {
        this.createFloor();
    }

    setupTank() {
        this.tankGroup = new THREE.Group();
        this.scene.add(this.tankGroup);

        const tankBase = new THREE.Mesh(
            new THREE.BoxGeometry(8, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.4 })
        );
        tankBase.position.y = 1;
        tankBase.receiveShadow = true;
        this.tankGroup.add(tankBase);

        const tankGlass = new THREE.Mesh(
            new THREE.BoxGeometry(7.5, 6, 7.5),
            new THREE.MeshPhysicalMaterial({
                color: 0x00ffcc, transmission: 0.95, opacity: 1, transparent: true,
                roughness: 0.05, ior: 1.5, thickness: 0.2, side: THREE.DoubleSide
            })
        );
        tankGlass.position.y = 5;
        tankGlass.castShadow = true;
        this.tankGroup.add(tankGlass);

        this.propHolder = new THREE.Group();
        this.tankGroup.add(this.propHolder);

        this.waterSurface = new THREE.Mesh(
            new THREE.PlaneGeometry(7.2, 7.2),
            new THREE.MeshPhysicalMaterial({
                color: 0x00eedd, transmission: 0.5, transparent: true, opacity: 0.55,
                roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide
            })
        );
        this.waterSurface.rotation.x = -Math.PI / 2;
        this.waterSurface.position.y = this.WATER_FULL;
        this.tankGroup.add(this.waterSurface);

        this.waterGlow = new THREE.PointLight(0x00ffcc, 2, 8);
        this.waterGlow.position.set(0, 4, 0);
        this.tankGroup.add(this.waterGlow);
    }

    setupServerRack() {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(0, 5, -19);
        this.scene.add(rackGroup);

        const rackBody = new THREE.Mesh(
            new THREE.BoxGeometry(10, 10, 2),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 })
        );
        rackGroup.add(rackBody);

        for (let i = 0; i < 16; i++) {
            const led = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.1, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0 })
            );
            led.position.set(-4 + Math.random() * 8, -4 + i * 0.5, 1.05);
            rackGroup.add(led);
            this.leds.push(led);
        }
    }

    setupCables() {
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.5, roughness: 0.5 });
        const impulseMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const numCables = 8;

        for (let i = 0; i < numCables; i++) {
            const startPt = new THREE.Vector3(-4 + i * 1.0, 1 + Math.random() * 2, -18);
            const midPt = new THREE.Vector3(-6 + Math.random() * 12, 0.1, -10);
            const endPt = new THREE.Vector3(-3.5 + i * 1.0, 0.5, -4);

            const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
            this.curves.push(curve);

            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.12, 8, false), cableMat);
            this.scene.add(tube);

            const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), impulseMat);
            pulse.visible = false;
            this.scene.add(pulse);
            this.impulses.push({ mesh: pulse, offset: Math.random() });
        }
    }

    setupDust() {
        this.createDustField({
            count: 600,
            spread: [30, 12, 30],
            color: 0x88ccff,
            size: 0.04,
            opacity: 0.3
        });
    }
}
