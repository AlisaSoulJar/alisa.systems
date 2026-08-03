import * as THREE from 'three';
import { BaseSimulationSystem } from '../../avatar-pipeline/BaseSimulationSystem.js';
import { HubClient } from '../utils/HubClient.js';

export class MorpheusSimulationSystem extends BaseSimulationSystem {
    constructor(engine, envFactory, uiConfig = {}) {
        super(engine, envFactory, uiConfig);

        this.currentAvatarGroup = null;
        this.activeBones = [];
        this.qaState = 'IDLE'; // IDLE, READY, RUNNING, PASSED, FAILED
        this.startZ = 0;
        this.speed = 4.0; // u/s
    }

    async loadAvatar(filename) {
        if (!filename) return;

        this.currentFilename = filename;
        this.log(`[Morpheus] Iniciando carga e hidratación de ${filename}...`);

        if (this.currentAvatarGroup) {
            this.engine.scene.remove(this.currentAvatarGroup);
        }

        try {
            // 1. Cargar el GLB soldado por Pygmalion
            const { ModelUtils } = await import('../../../world/utils/ModelUtils.js');
            const gltf = await ModelUtils.loadGLB(`../props/ready/${filename}`);
            if (!gltf) throw new Error("Fallo al cargar GLB");

            this.currentAvatarGroup = new THREE.Group();
            const rawMeshGroup = gltf.scene;
            
            // Reescalar usando el mismo truco que Pygmalion si es necesario
            rawMeshGroup.traverse(child => { if (child.isMesh && child.scale.x > 10) child.scale.set(1, 1, 1); });
            
            // Acomodar al centro
            const box = new THREE.Box3().setFromObject(rawMeshGroup);
            const center = box.getCenter(new THREE.Vector3());
            rawMeshGroup.position.set(-center.x, -box.min.y, -center.z);
            rawMeshGroup.updateMatrixWorld(true);

            // 2. Fetch Manifest for igor_bones
            let manifest = null;
            try {
                const manifestRes = await fetch(`../props/ready/${filename}.katamari.json`);
                if (manifestRes.ok) manifest = await manifestRes.json();
            } catch(e) {
                this.log(`[Warning] No se encontró katamari.json para ${filename}.`);
            }

            // 3. Procedural Rigging usando los huesos de Pygmalion
            const { ProceduralRigging } = await import('../../../soma/ProceduralRigging.js');
            const archetype = manifest?.archetype || "default";
            const injectedBones = manifest?.igor_bones || null;

            this.log(`[Morpheus] Reconstruyendo esqueleto [Arquetipo: ${archetype}]...`);
            
            const rigResult = ProceduralRigging.buildArchetypeSkeleton(archetype, rawMeshGroup, [], injectedBones);
            
            if (!rigResult || !rigResult.bones || rigResult.bones.length === 0) {
                throw new Error("ProceduralRigging no pudo extraer/inyectar huesos.");
            }

            // Construir jerarquía básica de huesos
            const threeBones = [];
            const rootBone = new THREE.Bone();
            rootBone.position.set(0, 0, 0);
            threeBones.push(rootBone);

            rigResult.bones.forEach((bPair) => {
                const b = new THREE.Bone();
                // Localizar el hueso en el centro del segmento
                const center = bPair[0].clone().lerp(bPair[1], 0.5);
                b.position.copy(center);
                
                // Orientar a lo largo del segmento
                const dir = bPair[1].clone().sub(bPair[0]).normalize();
                const defaultDir = new THREE.Vector3(0, 1, 0);
                const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, dir);
                b.quaternion.copy(quat);

                b.userData = { originalPos: b.position.clone(), originalQuat: b.quaternion.clone(), isLeg: center.y < box.max.y * 0.4 };
                
                rootBone.add(b);
                threeBones.push(b);
            });

            // Buscar la malla real
            let sourceMesh = null;
            rawMeshGroup.traverse(child => {
                if (child.isMesh && !sourceMesh) sourceMesh = child;
            });

            if (!sourceMesh) throw new Error("No mesh found to skin.");

            // Clonar geometría y calcular pesos procedurales
            const geom = sourceMesh.geometry.clone();
            const posAttr = geom.attributes.position;
            const skinIndices = [];
            const skinWeights = [];

            for (let i = 0; i < posAttr.count; i++) {
                const vertex = new THREE.Vector3().fromBufferAttribute(posAttr, i);
                vertex.applyMatrix4(sourceMesh.matrixWorld);

                const boneDistances = [];
                for (let b = 1; b < threeBones.length; b++) {
                    const bone = threeBones[b];
                    const dist = vertex.distanceTo(bone.userData.originalPos);
                    boneDistances.push({ index: b, dist: dist });
                }
                boneDistances.sort((a, b) => a.dist - b.dist);
                
                const top2 = boneDistances.slice(0, 2);
                let wSum = 0;
                top2.forEach(bd => {
                    bd.weight = 1.0 / Math.pow(bd.dist + 0.001, 2);
                    wSum += bd.weight;
                });

                skinIndices.push(top2[0] ? top2[0].index : 0, top2[1] ? top2[1].index : 0, 0, 0);
                skinWeights.push(
                    top2[0] ? top2[0].weight / wSum : 1,
                    top2[1] ? top2[1].weight / wSum : 0,
                    0, 0
                );
            }

            geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
            geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

            const skinnedMesh = new THREE.SkinnedMesh(geom, sourceMesh.material);
            skinnedMesh.add(rootBone);
            
            const skeleton = new THREE.Skeleton(threeBones);
            skinnedMesh.bind(skeleton);

            this.currentAvatarGroup.add(skinnedMesh);
            this.currentAvatarGroup.position.set(0, 0.5, -5);
            this.engine.scene.add(this.currentAvatarGroup);

            this.activeBones = threeBones;
            this.skeleton = skeleton;
            this.qaState = 'READY';
            this.log(`[Morpheus] Avatar hidratado (SkinnedMesh) con ${this.activeBones.length} huesos.`);
            
            // Actualizar DOM
            const domBones = document.getElementById('hBones');
            if (domBones) domBones.innerText = this.activeBones.length;

            this.engine.camera.position.set(-10, 10, -10);
            this.engine.controls.target.copy(this.currentAvatarGroup.position);

        } catch (e) {
            this.log(`<span style="color:#ff3355">[ERROR] ${e.message}</span>`);
            this.qaState = 'FAILED';
        }
    }

    startTest() {
        if (!this.currentAvatarGroup || this.qaState !== 'READY') {
            this.log("Carga un avatar primero.");
            return;
        }

        this.qaState = 'RUNNING';
        this.log(">> INICIANDO TEST FÍSICO <<");

        this.currentAvatarGroup.position.set(0, 0.5, -5);
        this.startZ = -5;
    }

    async postFailureToJobBoard(filename) {
        const data = await HubClient.post('/jobboard/post', {
            title: `QA FALLIDO: ${filename}`,
            description: `El avatar no superó la prueba funcional de salto de obstáculos. Las proporciones causaron colisiones.`,
            categories: ["FACTORY_QA", "BUG_REPORT", "REJECTED"],
            reward: 10.0,
            manifest_path: `props/ready/${filename}.katamari.json`
        });
        if (data) {
            this.log(`<span style='color:#ffaa00'>[Auto-QA] Ticket #${data.contract_id || '?'} postulado.</span>`);
        } else {
            this.log(`<span style='color:#ff0055'>[Auto-QA] Falla al conectar con JobBoard.</span>`);
        }
    }

    async postSuccessToHub() {
        if (!this.currentFilename) return;
        try {
            const data = await HubClient.post(`/pygmalion/certify/${this.currentFilename}`, {});
            if (data && data.certified) {
                this.log(`<span style='color:#00ffcc'>[Auto-QA] Katamari actualizado. QA_PASSED = true. JobBoard notificado.</span>`);
            }
        } catch (e) {
            this.log(`<span style='color:#ff0055'>[Auto-QA] Falla al certificar con el Hub.</span>`);
        }
    }

    tick(dt, elapsed, onStateChange) {
        super.tick(dt, elapsed);

        if (this.qaState === 'RUNNING' && this.currentAvatarGroup) {
            // Mover adelante
            this.currentAvatarGroup.position.z += this.speed * dt;

            // Cinemática (Animar los huesos individualmente)
            if (this.activeBones && this.activeBones.length > 1) {
                const runCycle = elapsed * 10.0;
                for (let i = 1; i < this.activeBones.length; i++) {
                    const b = this.activeBones[i];
                    if (b.userData.isLeg) {
                        // Swing legs back and forth
                        const phaseOffset = i % 2 === 0 ? 0 : Math.PI;
                        b.rotation.x = Math.sin(runCycle + phaseOffset) * 0.5;
                        b.position.y = b.userData.originalPos.y + Math.abs(Math.cos(runCycle + phaseOffset)) * 0.2;
                    } else {
                        // Bouncing torso
                        b.position.y = b.userData.originalPos.y + Math.abs(Math.sin(runCycle)) * 0.1;
                    }
                }
            }

            // Gravedad / Salto simulado
            if (this.currentAvatarGroup.position.y > 0.5) {
                this.currentAvatarGroup.position.y -= 9.8 * dt * 0.5;
                if (this.currentAvatarGroup.position.y < 0.5) this.currentAvatarGroup.position.y = 0.5;
            }

            // Colisiones
            const avatarBox = new THREE.Box3().setFromObject(this.currentAvatarGroup);
            let collision = false;

            this.env.obstacles.forEach(obs => {
                if (avatarBox.intersectsBox(obs.box)) {
                    collision = true;
                }

                // Simple jump trigger (AI heurística)
                const dist = obs.mesh.position.z - this.currentAvatarGroup.position.z;
                if (dist > 0 && dist < 3.0 && this.currentAvatarGroup.position.y <= 0.6) {
                    this.currentAvatarGroup.position.y += 3.5 * dt;
                }
            });

            if (collision) {
                this.log("<span style='color:#ff3355'>[CRASH] Falla estructural detectada.</span>");
                this.qaState = 'FAILED';

                // We don't have direct access to material inside skinned mesh easily without traverse
                this.currentAvatarGroup.traverse(c => {
                    if (c.isMesh) {
                        c.material.color.setHex(0xff3355);
                        c.material.wireframe = false;
                    }
                });

                if (onStateChange) onStateChange('FAILED');
            } else if (this.currentAvatarGroup.position.z > 80) {
                this.log("<span style='color:#00ffcc'>[ÉXITO] Track completado sin colisiones.</span>");
                this.qaState = 'PASSED';
                this.postSuccessToHub();
                if (onStateChange) onStateChange('PASSED');
            }

            // Cámara sigue al avatar
            this.engine.camera.position.z += (this.currentAvatarGroup.position.z - 10 - this.engine.camera.position.z) * dt * 2;
            this.engine.controls.target.copy(this.currentAvatarGroup.position);
        }
    }
}
