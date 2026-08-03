import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class ArchetypeEnvironmentFactory extends BaseEnvironmentFactory {
    
    constructor(scene = null, camera = null) {
        super(scene, null);
        this.camera = camera;
        this.entities = [];
        this._pendingAdds = [];
        
        // Proxy for legacy constructors trying to do this.scene.add() before init
        if (!scene) {
            this.scene = { 
                add: (obj) => { this._pendingAdds.push(obj); },
                remove: (obj) => { }
            };
        }
        
        this._legacyConstructor();
    }

    _legacyConstructor() {

        this.subjectGroup = null;
        this.subjectMesh = null;
        this.subjectMat = null;
        this.eyes = null;
        
        this.stimulus = null;
        this.stimLight = null;
        
        this.setupVisuals();
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Banco cognitivo: una sola pieza. Después se pilota con
     * setStimulusPos() + applyCognitiveColors().
     */
    buildAll(_c = {}) {
        this.setupVisuals();
        return { avatar: this.getAvatarGroup(), stimulus: this.getStimulusPos() };
    }

    setupVisuals() {
        this.subjectGroup = new THREE.Group();
        const subGeo = new THREE.CapsuleGeometry(0.5, 1.0, 8, 16);
        this.subjectMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, emissive: 0x334155, emissiveIntensity: 0.5 });
        this.subjectMesh = new THREE.Mesh(subGeo, this.subjectMat);
        this.subjectMesh.position.y = 1.0;
        this.subjectMesh.castShadow = true;
        this.subjectGroup.add(this.subjectMesh);
        
        const eyeGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.eyes = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyes.position.set(0, 1.4, 0.4);
        this.subjectGroup.add(this.eyes);

        this.scene.add(this.subjectGroup);

        const stimGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const stimMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
        this.stimulus = new THREE.Mesh(stimGeo, stimMat);
        this.stimulus.position.set(10, 0.5, 10);
        this.scene.add(this.stimulus);

        this.stimLight = new THREE.PointLight(0xf43f5e, 5, 20);
        this.stimLight.position.y = 1;
        this.stimulus.add(this.stimLight);
    }

    applyCognitiveColors(reqConducta, reqPsyche, reqState) {
        this.subjectMesh.scale.set(1, 1, 1);
        
        if (reqConducta === 'ghost_clip') {
            this.subjectMat.transparent = true;
            this.subjectMat.opacity = 0.5;
            this.subjectMat.color.setHex(0xa78bfa);
        } else {
            this.subjectMat.transparent = false;
            this.subjectMat.opacity = 1.0;
        }

        if (reqState === 'adrenergic') {
            this.subjectMat.emissive.setHex(0x880000); 
        } else if (reqState === 'cortisolic') {
            this.subjectMat.emissive.setHex(0x004488); 
        } else if (reqPsyche === 'trickster') {
            this.subjectMat.color.setHex(0x222222);
        } else if (reqPsyche === 'rebel') {
            this.subjectMat.color.setHex(0x10b981); 
        } else if (reqConducta === 'burrower') {
            this.subjectMat.color.setHex(0x92400e); 
        } else {
            this.subjectMat.color.setHex(0xcbd5e1);
        }

        if (reqConducta !== 'burrower' && reqConducta !== 'ghost_clip') {
            this.subjectGroup.position.y = 0;
        }
    }

    syncLights(isNight, gfx) {
        if(isNight) {
            gfx.hemiLight.intensity = 0.05;
            gfx.spotLight.intensity = 0.2;
            gfx.scene.fog.density = 0.05;
            gfx.renderer.setClearColor(0x020205);
        } else {
            gfx.hemiLight.intensity = 0.4;
            gfx.spotLight.intensity = 0.5;
            gfx.scene.fog.density = 0.015;
            gfx.renderer.setClearColor(0x0b0b14);
        }
    }

    getAvatarGroup() {
        return this.subjectGroup;
    }

    getStimulusPos() {
        return this.stimulus.position;
    }

    setStimulusPos(pt) {
        this.stimulus.position.copy(pt);
    }

    setCore(core) {
        this.core = core;
        if (!this.camera && core.camera) this.camera = core.camera;
    }

    init(scene) {
        this.scene = scene;
        // Apply any groups added during the proxy constructor phase
        if (this._pendingAdds) {
            this._pendingAdds.forEach(obj => this.scene.add(obj));
            this._pendingAdds = [];
        }
    }
    
    update(dt) {
        if(this.stimulus) {
            this.stimulus.rotation.y += dt;
        }
    }

}
