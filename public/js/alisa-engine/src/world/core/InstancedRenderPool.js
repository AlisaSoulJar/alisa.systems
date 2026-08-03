import * as THREE from 'three';

/**
 * InstancedRenderPool.js
 * ═══════════════════════════════════════════════════════════════
 * Agnostic visual module (Composition over Inheritance).
 * Single responsibility: Manages and updates THREE.InstancedMesh
 * pools for massive amounts of entities. 
 * It knows absolutely nothing about game logic, enemies, or state.
 * It just receives raw coordinates and colors and paints them in O(1).
 * ═══════════════════════════════════════════════════════════════
 */
export class InstancedRenderPool {
    constructor(scene) {
        this.scene = scene;
        this.pools = new Map();
        
        // Memory-efficient calculation variables
        this._dummy = new THREE.Object3D();
        this._color = new THREE.Color();
        this._rotations = new Map(); // Stores smooth rotations across frames
    }

    /**
     * Registers a new type of instanced mesh to the pool.
     * @param {string} type - Key identifier (e.g., 'asteroid', 'enemy')
     * @param {THREE.BufferGeometry} geometry - Base geometry
     * @param {THREE.Material} material - Base material
     * @param {number} [maxInstances=5000] - Hardware allocation limit
     */
    registerType(type, geometry, material, maxInstances = 5000) {
        if (this.pools.has(type)) return;
        
        // Ensure material supports instance colors by whitening the base tint
        const mat = material.clone();
        if (mat.color) mat.color.setHex(0xffffff);

        const iMesh = new THREE.InstancedMesh(geometry, mat, maxInstances);
        iMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        iMesh.castShadow = true;
        iMesh.receiveShadow = true;
        
        this.scene.add(iMesh);
        this.pools.set(type, iMesh);
    }

    /**
     * Syncs a raw array of spatial states directly to the GPU.
     * @param {string} type - Registered pool type
     * @param {Array} entities - Raw array [{id, x, y, z, scale, rotY, colorHex}]
     */
    syncType(type, entities) {
        const iMesh = this.pools.get(type);
        if (!iMesh) return;

        // Truncate to max capacity to prevent GPU crashes
        iMesh.count = Math.min(entities.length, iMesh.instanceMatrix.array.length / 16);

        for (let i = 0; i < iMesh.count; i++) {
            const e = entities[i];
            
            // Spatial
            this._dummy.position.set(e.x || 0, e.y || 0, e.z || 0);
            this._dummy.scale.setScalar(e.scale !== undefined ? e.scale : 1);
            this._dummy.rotation.set(e.rotX || 0, e.rotY || 0, e.rotZ || 0);
            
            this._dummy.updateMatrix();
            iMesh.setMatrixAt(i, this._dummy.matrix);

            // Tint / Emissive Override
            if (e.colorHex !== undefined) {
                this._color.setHex(e.colorHex);
                iMesh.setColorAt(i, this._color);
            }
        }

        iMesh.instanceMatrix.needsUpdate = true;
        if (iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;
    }

    /**
     * Helper: Computes a smooth Y rotation (heading) based on velocity vectors.
     * Purely mathematical, agnostic to what the entity is.
     * @returns {number} The new smoothed radian angle.
     */
    computeSmoothHeading(id, vx, vz, dt, rotationSpeed = 10, idleRotationSpeed = 0) {
        let currentRot = this._rotations.get(id) || 0;
        const magSq = vx * vx + vz * vz;
        
        if (magSq > 0.001) {
            const targetAngle = Math.atan2(vx, vz);
            let diff = targetAngle - currentRot;
            // Normalize angle wraps
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            currentRot += diff * dt * rotationSpeed;
        } else {
            currentRot += dt * idleRotationSpeed;
        }
        
        this._rotations.set(id, currentRot);
        return currentRot;
    }

    /**
     * Purges orphaned data (e.g. rotations of dead entities)
     * @param {Array} activeIds - Array or Set of active IDs
     */
    purgeMemory(activeIds) {
        const alive = new Set(activeIds);
        for (const id of this._rotations.keys()) {
            if (!alive.has(id)) this._rotations.delete(id);
        }
    }
}
