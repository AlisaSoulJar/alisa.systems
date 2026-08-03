import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';

export class KatamariFactory extends BaseEnvironmentFactory {
    constructor(scene, camera, basePath = '../') { // default was '/colony/overworld/' (pre-reorg absolute path → 404 on every asset)
        super(scene, null);
        this.camera = camera;
        this.basePath = basePath;
        this.dummy = new THREE.Object3D();
    }

    buildAll(chunkCount) {
        // Build Core
        const coreGeo = new THREE.IcosahedronGeometry(1, 4);
        const coreMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3399, emissive: 0x550033, roughness: 0.2, metalness: 0.8,
            wireframe: true 
        });
        this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
        this.coreMesh.name = "katamari_core";
        this.scene.add(this.coreMesh);

        // Build InstancedMesh Swarm
        this.chunkCount = chunkCount;
        GLTFModelPool.get(this.basePath + 'props/models/Cockroach.glb').then((gltf) => {
            let swarmGeo = null;
            let swarmMat = null;
            gltf.scene.traverse((child) => {
                if (child.isMesh && !swarmGeo) {
                    swarmGeo = child.geometry.clone();
                    swarmGeo.scale(0.015, 0.015, 0.015);
                    swarmMat = child.material;
                }
            });
            if (!swarmGeo) {
                swarmGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                swarmMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
            }
            if (swarmMat && swarmMat.isMaterial) {
                swarmMat.roughness = 1.0;
                swarmMat.metalness = 0.0;
            }
            this.instancedMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, this.chunkCount);
            this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(this.instancedMesh);
        }).catch(() => {
            let swarmGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            let swarmMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
            this.instancedMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, this.chunkCount);
            this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(this.instancedMesh);
        });
    }

    syncToEngine(state, dt, t) {
        if (!this.coreMesh) return;
        
        // Sync Core
        this.coreMesh.position.copy(state.corePosition);
        this.coreMesh.rotation.copy(state.coreRotation);
        
        const visualScale = state.katamariRadius * (1.0 + Math.sin(t * 5) * 0.05);
        this.coreMesh.scale.setScalar(visualScale);

        // Sync Swarm
        if (this.instancedMesh) {
            let matrixNeedsUpdate = false;
            for(let i = 0; i < state.preyData.length; i++) {
                const p = state.preyData[i];
                if (!p.active) continue;
                
                if (p.attached) {
                    this.dummy.position.set(0, p.attachDist, 0);
                    this.dummy.quaternion.copy(p.attachQuat);
                    this.dummy.position.applyQuaternion(p.attachQuat);
                    this.dummy.position.add(state.corePosition);
                    
                    const coreQuat = new THREE.Quaternion().setFromEuler(state.coreRotation);
                    this.dummy.quaternion.copy(coreQuat).multiply(p.attachQuat);
                    this.dummy.scale.setScalar(1);
                } else {
                    this.dummy.position.copy(p.position);
                    this.dummy.rotation.copy(p.rotation);
                    this.dummy.scale.setScalar(1);
                }
                
                this.dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                matrixNeedsUpdate = true;
            }
            if (matrixNeedsUpdate) this.instancedMesh.instanceMatrix.needsUpdate = true;
        }

        // Camera shake
        if (state.screenShake > 0.01 && this.camera) {
            const shakeX = (Math.random() - 0.5) * state.screenShake;
            const shakeY = (Math.random() - 0.5) * state.screenShake;
            const shakeZ = (Math.random() - 0.5) * state.screenShake;
            this.camera.position.x += shakeX;
            this.camera.position.y += shakeY;
            this.camera.position.z += shakeZ;
        }
        
        // Camera follow logic
        if (this.camera && state.katamariRadius) {
            const size = state.katamariRadius;
            const camOffset = new THREE.Vector3(0, size * 5 + 15, size * 10 + 30);
            const targetPos = state.corePosition.clone().add(camOffset);
            this.camera.position.lerp(targetPos, 0.1);
        }
    }
}
