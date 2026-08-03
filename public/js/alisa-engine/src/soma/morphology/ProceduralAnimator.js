import * as THREE from '/vendor/three-0.160.0/build/three.module.js';
import { SEMANTIC_ANATOMY, deduceSemanticArchetype } from './SemanticAnatomy.js';

export class ProceduralAnimator {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Phase 1: Inject proxy bones (cylinders) onto the mesh bounding box
     * Used exclusively by animator_lab.html (The Goofy Patitas Lab)
     */
    injectProxyBones(mesh, tier = 'T4') {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        let bonesGroup = new THREE.Group();
        bonesGroup.name = "ProxyBones_" + mesh.uuid;
        mesh.userData.proxyBones = {};
        
        const geom = new THREE.CylinderGeometry(size.x * 0.05, size.x * 0.05, size.y * 0.4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        
        const legL = new THREE.Mesh(geom, mat);
        legL.position.set(center.x - size.x * 0.2, box.min.y + size.y * 0.2, center.z);
        bonesGroup.add(legL);
        mesh.userData.proxyBones['leg_l'] = legL;
        
        const legR = legL.clone();
        legR.position.set(center.x + size.x * 0.2, box.min.y + size.y * 0.2, center.z);
        bonesGroup.add(legR);
        mesh.userData.proxyBones['leg_r'] = legR;

        mesh.add(bonesGroup);
        return bonesGroup;
    }

    /**
     * Parse semantic position (e.g., '0.5h', '-0.2w') into absolute float coordinates based on bounding box
     */
    _parseSemanticPosition(valStr, size) {
        if (typeof valStr === 'number') return valStr;
        if (typeof valStr === 'string') {
            const v = parseFloat(valStr);
            if (valStr.includes('w')) return v * size.x;
            if (valStr.includes('h')) return v * size.y;
            if (valStr.includes('d')) return v * size.z;
        }
        return 0;
    }

    /**
     * Phase 2: SkinnedMesh conversion via Semantic Anatomy
     * Converts a static mesh into an anatomically rigged SkinnedMesh based on its Name and BoundingBox
     */
    injectVoxelBones(meshGroup, name) {
        let targetMesh = null;
        meshGroup.traverse(m => {
            if (m.isMesh && !targetMesh) targetMesh = m;
        });
        if (!targetMesh) return null;

        const archetypeStr = deduceSemanticArchetype(name);
        if (!archetypeStr) {
            console.log(`[ProceduralAnimator] No biological anatomy for "${name}". Treating as static prop.`);
            return null;
        }
        const anatomyDef = SEMANTIC_ANATOMY[archetypeStr];

        if (!anatomyDef) {
            console.warn(`[ProceduralAnimator] No anatomy found for archetype [${archetypeStr}]. Treating as static.`);
            return null; // Fallback to unrigged for props
        }

        console.log(`[ProceduralAnimator] Morphological Rigging Started. Mesh: ${name} -> Archetype: ${archetypeStr}`);

        const geo = targetMesh.geometry.clone();
        geo.computeBoundingBox();
        const bbox = geo.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const threeBones = [];
        const boneDict = {};

        // 1. Build The Semantic Skeleton Graph
        anatomyDef.bones.forEach((bDef, index) => {
            const bone = new THREE.Bone();
            bone.name = bDef.name;
            bone.userData.role = bDef.role || 'core';
            
            // X, Y, Z parsing based on Bounding Box size ratios
            const bx = this._parseSemanticPosition(bDef.position[0], size);
            const by = this._parseSemanticPosition(bDef.position[1], size);
            const bz = this._parseSemanticPosition(bDef.position[2], size);
            
            // Note: Bone positions in Three.js are relative to their parent!
            // However, our dictionary expresses them globally relative to the BoundingBox center (x,z) and bottom (y)
            let worldPosY = bbox.min.y + by;
            let worldPosX = center.x + bx;
            let worldPosZ = center.z + bz;
            
            bone.userData.worldPos = new THREE.Vector3(worldPosX, worldPosY, worldPosZ);
            
            boneDict[bDef.name] = { bone: bone, def: bDef, index: index };
            threeBones.push(bone);
        });

        // Resolve Parents and local positions
        let rootBone = null;
        threeBones.forEach(bone => {
            const def = boneDict[bone.name].def;
            if (def.parent && boneDict[def.parent]) {
                const parentNode = boneDict[def.parent].bone;
                parentNode.add(bone);
                // Convert world position back to local
                const parentWPos = parentNode.userData.worldPos;
                const localWPos = bone.userData.worldPos;
                bone.position.set(localWPos.x - parentWPos.x, localWPos.y - parentWPos.y, localWPos.z - parentWPos.z);
            } else {
                rootBone = bone;
                bone.position.copy(bone.userData.worldPos); // Root keeps absolute
            }
        });

        // 2. Vertex Skinning via Inverse Distance Weighting
        const positionAttribute = geo.attributes.position;
        const vertexCount = positionAttribute.count;

        const skinIndices = [];
        const skinWeights = [];

        // Precompute world positions of all bones to avoid loop overhead
        const boneWorldPositions = threeBones.map(b => b.userData.worldPos);

        for (let i = 0; i < vertexCount; i++) {
            const vx = positionAttribute.getX(i);
            const vy = positionAttribute.getY(i);
            const vz = positionAttribute.getZ(i);
            const vPos = new THREE.Vector3(vx, vy, vz);
            
            // Find distances from this vertex to every bone
            let distances = [];
            for (let b = 0; b < threeBones.length; b++) {
                const dist = vPos.distanceTo(boneWorldPositions[b]);
                distances.push({ index: b, d: dist });
            }
            
            // Sort to get 4 closest bones
            distances.sort((a, b) => a.d - b.d);
            
            // Calculate inverse-square weights for the top 4
            let rawWeights = [0, 0, 0, 0];
            let rawIndices = [0, 0, 0, 0];
            let totalWeight = 0;
            
            for (let w = 0; w < Math.min(4, distances.length); w++) {
                rawIndices[w] = distances[w].index;
                const d = Math.max(0.01, distances[w].d); // Prevent DBZ
                const weight = 1.0 / (d * d); // Inverse square falloff
                rawWeights[w] = weight;
                totalWeight += weight;
            }
            
            // Normalize weights to sum exactly to 1.0
            if (totalWeight > 0) {
                rawWeights = rawWeights.map(w => w / totalWeight);
            } else {
                rawWeights = [1, 0, 0, 0]; 
            }
            
            skinIndices.push(...rawIndices);
            skinWeights.push(...rawWeights);
        }

        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        const skeleton = new THREE.Skeleton(threeBones);
        const skinnedMesh = new THREE.SkinnedMesh(geo, targetMesh.material);
        skinnedMesh.add(rootBone);
        skinnedMesh.bind(skeleton);

        skinnedMesh.userData.isProceduralSkinned = true;
        skinnedMesh.userData.rootBone = rootBone;
        skinnedMesh.userData.bonesDict = boneDict;
        skinnedMesh.userData.animState = { phase: 0 };

        // Replace original
        const parent = targetMesh.parent;
        if (parent) {
            parent.remove(targetMesh);
            parent.add(skinnedMesh);
        } else {
            meshGroup.add(skinnedMesh);
        }
        
        return skinnedMesh;
    }

    /**
     * Applies an organic locomotion cycle based on bone roles (Spore style intent)
     */
    applyWalkCycle(mesh, time, speed = 1.0) {
        if (!mesh) return;

        if (mesh.userData.isProceduralSkinned) {
            const state = mesh.userData.animState;
            state.phase += speed * 0.05;
            const phase = state.phase;

            const root = mesh.userData.rootBone;
            if (root) {
                root.position.y = root.userData.worldPos.y + Math.abs(Math.sin(phase * 4)) * 0.05;
            }
            
            // Loop through specialized bones
            const bones = mesh.userData.bonesDict;
            if (!bones) return;

            // Spore-like intent loops:
            for (const key in bones) {
                const bone = bones[key].bone;
                const role = bone.userData.role;
                
                if (role === 'leg') {
                    // Out-of-phase leg swing. Use X pos to determine left/right, and Z pos to determine front/back phase offsets.
                    const isLeft = bone.userData.worldPos.x > 0;
                    const isFront = bone.userData.worldPos.z > 0;
                    const offset = (isLeft ? 0 : Math.PI) + (isFront ? Math.PI/2 : 0); // Out of phase trot
                    bone.rotation.x = Math.sin(phase * 4 + offset) * 0.6; 
                } 
                else if (role === 'arm') {
                    const isLeft = bone.userData.worldPos.x > 0;
                    const offset = isLeft ? Math.PI : 0;
                    // Arms swing opposite to legs
                    bone.rotation.x = Math.sin(phase * 4 + offset) * 0.5;
                }
                else if (role === 'wing') {
                    // Flap
                    const isLeft = bone.userData.worldPos.x > 0;
                    const offset = isLeft ? 1 : -1;
                    bone.rotation.z = Math.sin(phase * 8) * 0.5 * offset;
                }
                else if (role === 'head') {
                    bone.rotation.y = Math.sin(phase * 2) * 0.2; // Look around
                    bone.rotation.z = Math.cos(phase * 4) * 0.05; // Bob head
                }
            }

        } else if (mesh.userData.proxyBones) {
            // Proxy Goofy Patitas
            const bones = mesh.userData.proxyBones;
            if (bones.leg_l && bones.leg_r) {
                bones.leg_l.position.y = Math.max(0, Math.sin(time * speed * 5)) * 0.1;
                bones.leg_r.position.y = Math.max(0, Math.sin(time * speed * 5 + Math.PI)) * 0.1;
            }
        }
    }
}
