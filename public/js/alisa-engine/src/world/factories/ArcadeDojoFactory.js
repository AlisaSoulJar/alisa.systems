import * as THREE from 'three';
import { AssetManager } from '../../soma/AssetManager.js';

/**
 * 🏭 ARCADE DOJO FACTORY
 * --------------------------------------------------------------------------
 * Encapsulates the room geometry, Day/Night/Neon thematic lighting, and the 
 * physical Arcade Cabinet model loading mechanism to maintain a headless-first 
 * architecture for the Overworld.
 */
export class ArcadeDojoFactory {
    constructor(scene, renderCore) {
        this.scene = scene;
        this.renderCore = renderCore; // AlisaRenderCore instance
        
        this.cabinetGroup = new THREE.Group();
        this.scene.add(this.cabinetGroup);

        this.cabinetMesh = null;
        this.screenMesh = null;

        // Environment Lights
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.8);
        this.scene.add(this.hemiLight);

        // Responsive SpotLight built into AlisaRenderCore (used optionally for shadows)
        this.spotLight = this.renderCore.spotLight;

        // The glowing element from the Arcade Screen Surface
        this.screenLight = new THREE.PointLight(0x000000, 0, 8);
        this.scene.add(this.screenLight);
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * ASÍNCRONA: el mueble arcade es un GLB.
     *     await fab.buildAll({ lighting: 'neon' });
     */
    async buildAll(c = {}) {
        this.setLighting(c.lighting ?? 'day');
        await this.loadCabinet();
        return { cabinet: this.cabinetGroup, screen: this.screenMesh };
    }

    /** Tick estándar (esta factory no anima nada por sí sola). */
    update(_dt) {}

    /**
     * Map predefined lighting themes natively without embedded HTML coupling.
     * Incorporates the ALISA 'Day / Office' pure white baseline.
     */
    setLighting(mode) {
        if (!this.scene) return;

        if (mode === 'day') {
            this.hemiLight.color.setHex(0xffffff);
            this.hemiLight.groundColor.setHex(0xaaaaaa);
            this.hemiLight.intensity = 1.0;
            if(this.spotLight) { this.spotLight.color.setHex(0xffffff); this.spotLight.intensity = 150; }
            // Day office MUST be #ffffff as specified by user requirements
            this.scene.background = new THREE.Color(0xffffff);
            this.screenLight.intensity = 0;
        } else if (mode === 'night') {
            this.hemiLight.color.setHex(0xffffff);
            this.hemiLight.groundColor.setHex(0x444455);
            this.hemiLight.intensity = 0.1;
            if(this.spotLight) { this.spotLight.color.setHex(0xffffff); this.spotLight.intensity = 30; }
            this.scene.background = new THREE.Color(0x020205);
            this.screenLight.color.setHex(0x66ccff);
            this.screenLight.intensity = 15;
        } else if (mode === 'neon') {
            this.hemiLight.color.setHex(0xff00ff);
            this.hemiLight.groundColor.setHex(0x00ffff);
            this.hemiLight.intensity = 0.6;
            if(this.spotLight) { this.spotLight.color.setHex(0x00ffff); this.spotLight.intensity = 200; }
            this.scene.background = new THREE.Color(0x0a001a);
            this.screenLight.color.setHex(0xff00cc);
            this.screenLight.intensity = 25;
        }
    }

    /**
     * Toggles XRay material debug viewing mode on the cabinet.
     */
    toggleXRay(isXRay) {
        if (!this.cabinetMesh) return;
        this.cabinetMesh.traverse((child) => {
            if (child.isMesh && child.material) {
                if (isXRay) {
                    child.material.transparent = true;
                    child.material.opacity = 0.3;
                } else {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                }
                child.material.needsUpdate = true;
            }
        });
    }

    /**
     * Asynchronously loads the main Arcade GLB model into the factory pipeline.
     */
    loadCabinet() {
        return new Promise((resolve, reject) => {
            AssetManager.loadModelAsync('../props/models/Arcade Machine.glb')
            .then((scene) => {
                this.cabinetMesh = scene;
                
                // Re-scale appropriately (1.8 meters tall)
                const bbox = new THREE.Box3().setFromObject(this.cabinetMesh);
                const size = bbox.getSize(new THREE.Vector3());
                const scaleF = 1.8 / (size.y || 1);
                this.cabinetMesh.scale.set(scaleF, scaleF, scaleF);
                
                const adjustedBbox = new THREE.Box3().setFromObject(this.cabinetMesh);
                this.cabinetMesh.position.y = this.cabinetMesh.position.y - adjustedBbox.min.y; 
                
                // Native Rotation for "SIT AT ARCADE" frontal framing
                this.cabinetMesh.rotation.y = -Math.PI / 2; 

                // Resolve meshes
                this.cabinetMesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (child.name === 'GameScreen_Plane') {
                            this.screenMesh = child;
                        }
                    }
                });

                // Bind Light to Screen Position
                if (this.screenMesh) {
                    const screenBox = new THREE.Box3().setFromObject(this.screenMesh);
                    const trueCenter = new THREE.Vector3();
                    screenBox.getCenter(trueCenter);
                    this.screenLight.position.copy(trueCenter);
                    
                    // Move light slightly forward and up relative to the screen to cast outward
                    this.screenLight.position.z += 0.4;
                    this.screenLight.position.y += 0.3;
                }

                this.cabinetGroup.add(this.cabinetMesh);
                console.log('Arcade Dojo Factory: Cabinet Mounted via Delegate.');
                resolve(this.cabinetMesh);
                
            }).catch((error) => {
                console.error("Arcade Dojo Factory: GLB failed.", error);
                reject(error);
            });
        });
    }
}
