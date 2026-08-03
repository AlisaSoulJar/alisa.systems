import * as THREE from 'three';

/**
 * [Arachne Engine] 🕷️📐
 * The Universal Morphological Ingestor
 * 
 * Responsibilities:
 * 1. Takes raw, chaotic GLB meshes and flattens out hierarchical technical death.
 * 2. Applies the Sovereign Katamari Dimension (Target Tier) to construct a homogenized BaseMesh.
 */
export class ArachneEngine {

    /**
     * Extracts pure continuous geometry from a raw group, discarding internal transforms.
     * @param {THREE.Group} rawGroup
     * @returns {THREE.Group} The flat 'baseMesh'
     */
    static normalizeMesh(rawGroup) {
        console.log(`[ArachneEngine]🕸️ Normalizing raw mesh hierarchy...`);
        const pureSkinGroup = new THREE.Group();
        const pureMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.2, wireframe: true });

        rawGroup.updateMatrixWorld(true);

        rawGroup.traverse((c) => {
            if (c.isMesh && c.geometry) {
                let geom = c.geometry.clone();

                if (c.isSkinnedMesh) {
                    const posAtt = geom.attributes.position;
                    const skinWeight = geom.attributes.skinWeight;
                    const skinIndex = geom.attributes.skinIndex;
                    const bindMatrix = c.bindMatrix;
                    const bindMatrixInverse = c.bindMatrixInverse;
                    const skeleton = c.skeleton;

                    const vertex = new THREE.Vector3();
                    const skinVertex = new THREE.Vector3();
                    const temp = new THREE.Vector3();
                    const tempMatrix = new THREE.Matrix4();

                    for (let i = 0; i < posAtt.count; i++) {
                        vertex.fromBufferAttribute(posAtt, i);
                        vertex.applyMatrix4(bindMatrix);

                        skinVertex.set(0, 0, 0);

                        for (let j = 0; j < 4; j++) {
                            const weight = skinWeight.getComponent(i, j);
                            if (weight === 0) continue;

                            const boneIndex = skinIndex.getComponent(i, j);
                            const bone = skeleton.bones[boneIndex];

                            tempMatrix.multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[boneIndex]);
                            temp.copy(vertex).applyMatrix4(tempMatrix).multiplyScalar(weight);
                            skinVertex.add(temp);
                        }
                        
                        skinVertex.applyMatrix4(bindMatrixInverse);
                        posAtt.setXYZ(i, skinVertex.x, skinVertex.y, skinVertex.z);
                    }
                    posAtt.needsUpdate = true;
                    geom.applyMatrix4(c.matrixWorld);
                    console.log(`[ArachneEngine] 🦴 SkinnedMesh flattened: "${c.name}", ${posAtt.count} verts`);
                } else {
                    geom.applyMatrix4(c.matrixWorld);
                    console.log(`[ArachneEngine] 📦 StaticMesh flattened: "${c.name}", ${geom.attributes.position.count} verts`);
                }

                if (geom.index) geom = geom.toNonIndexed();
                
                const skinMesh = new THREE.Mesh(geom, pureMat);
                pureSkinGroup.add(skinMesh);
            }
        });

        console.log(`[ArachneEngine] ✅ Total decoupled meshes extracted: ${pureSkinGroup.children.length}`);
        return pureSkinGroup;
    }

    /**
     * Measures the extracted BaseMesh and applies the Katamari Tier Target Size.
     * @param {THREE.Group} baseMesh 
     * @param {Object} manifest - The .katamari.json manifest describing the tier.
     * @returns {Object} { scaledMesh, originalCenter, maxDim, finalScaleMultiplier }
     */
    static applyKatamariScale(baseMesh, manifest) {
        const initBox = new THREE.Box3().setFromObject(baseMesh);
        const size = initBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        
        const tier = (manifest && manifest.target_tier) ? manifest.target_tier : "Tier 1.0";
        // Default Tier sizing fallback
        const targetSizeMap = { "Tier 1.0": 3.2, "Tier 1.5": 4.4, "Tier 2.0": 5.6, "Tier 2.5": 7.2, "Tier 3.0": 8.8, "Tier 4.0": 16.0 };
        const targetSize = targetSizeMap[tier] || (manifest && manifest.target_scale_constraint) || 4.8;
        
        const scaleMultiplier = targetSize / maxDim;
        console.log(`[ArachneEngine] 📏 initBox maxDim=${maxDim.toFixed(3)} → target=${targetSize} (tier="${tier}"). Scaler f=${scaleMultiplier.toFixed(4)}`);
        
        if (maxDim > 0.0001) {
            baseMesh.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
        }
        baseMesh.updateWorldMatrix(true, true);

        // Center Horizontally, snap to Y=0
        const finalBox = new THREE.Box3().setFromObject(baseMesh);
        const center = finalBox.getCenter(new THREE.Vector3());
        baseMesh.position.set(-center.x, -finalBox.min.y, -center.z);
        baseMesh.updateWorldMatrix(true, true);

        return {
            scaledMesh: baseMesh,
            originalBox: initBox,
            maxDim: maxDim,
            scaleMultiplier: scaleMultiplier,
            targetSize: targetSize
        };
    }
}
