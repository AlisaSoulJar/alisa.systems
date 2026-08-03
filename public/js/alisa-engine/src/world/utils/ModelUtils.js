import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelUtils {
    /**
     * Loads a GLB file.
     * @param {string} url 
     * @returns {Promise<THREE.Group|null>}
     */
    static loadGLB(url) {
        return new Promise(r => new GLTFLoader().load(url, g => r(g), undefined, () => r(null)));
    }

    /**
     * Normalizes a mesh's scale to fit within a bounding box of size `s`.
     * Neutralizes Blender export scales.
     * @param {THREE.Object3D} obj 
     * @param {number} s Target max size
     */
    static fitToBox(obj, s) {
        obj.traverse(c => { if (c.scale.x > 1.5) c.scale.set(1, 1, 1); });
        obj.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(obj);
        const sz = box.getSize(new THREE.Vector3());
        const mx = Math.max(sz.x, sz.y, sz.z);
        if (mx > 0.0001) { const f = s / mx; obj.scale.set(f, f, f); }
        obj.updateWorldMatrix(true, true);
        const b2 = new THREE.Box3().setFromObject(obj);
        const c = b2.getCenter(new THREE.Vector3());
        obj.position.set(-c.x, -b2.min.y, -c.z);
    }
}
