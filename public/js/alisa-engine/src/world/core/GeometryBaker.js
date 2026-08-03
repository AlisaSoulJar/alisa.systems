import * as THREE from 'three';

export class GeometryBaker {
    /**
     * Extracts and bakes a single flat geometry from a GLTF object hierarchy.
     * Preserves original scaling (e.g. 0.01 from Blender) and rotation by applying matrixWorld.
     * Extremely useful for feeding O(1) InstancedRenderPools.
     */
    static extractBakedGeometry(gltfScene) {
        let foundMesh = null;
        gltfScene.traverse(c => { if (c.isMesh && !foundMesh) foundMesh = c; });
        
        if (!foundMesh) return null;
        
        const geo = foundMesh.geometry.clone();
        foundMesh.updateMatrixWorld(true);
        geo.applyMatrix4(foundMesh.matrixWorld);
        
        // Normalize to a 1-unit bounding box so instancing scale values remain perfectly predictable
        geo.computeBoundingBox();
        const size = new THREE.Vector3();
        geo.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        
        const scaleMat = new THREE.Matrix4().makeScale(1 / maxDim, 1 / maxDim, 1 / maxDim);
        geo.applyMatrix4(scaleMat);

        return geo;
    }

    static extractMaterial(gltfScene) {
        let foundMesh = null;
        gltfScene.traverse(c => { if (c.isMesh && !foundMesh) foundMesh = c; });
        return foundMesh && foundMesh.material ? foundMesh.material.clone() : null;
    }
}
