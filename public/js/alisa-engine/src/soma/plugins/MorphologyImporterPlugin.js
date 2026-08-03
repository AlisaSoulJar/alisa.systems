import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KATAMARI_TIERS } from '../../../../VoxelArchetypes.js';

/**
 * MorphologyImporterPlugin
 * The universal GLB ingestion bridge.
 * Mathematically normalizes unhinged raw 3D Assets:
 * 1. Computes physical BoundingBox.
 * 2. Grounds the mesh so its physical bottom touches Y=0 perfectly.
 * 3. Centers the mesh on X and Z uniformly.
 * 4. Extrapolates exact Katamari metric sizes, squashing or inflating to perfection.
 */
export class MorphologyImporterPlugin {
    constructor(app, config = {}) {
        this.name = config.name || 'Morphology_Importer';
        this.app = app;
        this.loader = new GLTFLoader();
    }
    
    onInit() {
        // Core registration. It doesn't run continuous logic here.
        console.log("[MorphologyImporterPlugin] Initialized. Ready for asset ingestion.");
    }
    
    /**
     * Loads a raw GLB url, normalizes it, and returns the master Wrapper Group.
     * @param {string} url - The URL to the GLB file.
     * @param {string} targetTierName - Exact name from KATAMARI_TIERS (e.g. "Tier 0.0: Base Humanoid").
     * @param {Object} options - { position: Vector3, rotation: Euler, debug: bool }
     * @returns {Promise<THREE.Group>}
     */
    async loadNormalizedAsset(url, targetTierName, options = {}) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                const rawScene = gltf.scene;
                
                // 1. Calculate Target Physical Size from Katamari
                const tier = KATAMARI_TIERS.find(t => t.name === targetTierName);
                if (!tier) {
                    console.error(`[MorphologyImporter] ERROR: Tier '${targetTierName}' not found. Falling back to Tier 0.0`);
                }
                const targetSizeMeters = tier ? tier.size : 1.8;
                
                // 2. Wrap the raw mesh into a logical Sovereign Master Container
                const wrapper = new THREE.Group();
                wrapper.name = "Morphology_Wrapper_" + url;
                
                // 3. Compute absolute raw Box3 to find the chaotic origin
                const rawBox = new THREE.Box3().setFromObject(rawScene);
                const rawCenter = new THREE.Vector3();
                rawBox.getCenter(rawCenter);
                
                const rawSize = new THREE.Vector3();
                rawBox.getSize(rawSize);
                
                // 4. Grounding & Centering Core Logic:
                // We offset the internal raw geometry inversely to the bounding box.
                // - Shift X and Z back to mathematically center.
                // - Crucially: Shift Y precisely so rawBox.min.y touches 0.
                rawScene.position.set(
                    -rawCenter.x,
                    -rawBox.min.y,  // Perfect grounding against the floor
                    -rawCenter.z
                );
                
                // Add the offset raw geometry into our clean wrapper
                wrapper.add(rawScene);
                
                // 5. Scale Quantization (The Katamari Absolute Sizing)
                // We use the rawSize (which represents the max boundaries in local space).
                const maxAxis = Math.max(rawSize.x, rawSize.y, rawSize.z);
                const scaleFactor = targetSizeMeters / maxAxis;
                wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // 6. Fix Standard Shadows and Material defaults
                rawScene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Enhance visuals by preventing excessive dark raw roughness
                        if (child.material) {
                            child.material.envMapIntensity = 1.0;
                            child.material.needsUpdate = true;
                        }
                    }
                });
                
                // 7. Apply optional positioning to the Wrapper Container
                if (options.position) {
                    wrapper.position.copy(options.position);
                }
                if (options.rotation) {
                    wrapper.rotation.copy(options.rotation);
                }
                
                if (options.debug) {
                    const boxHelper = new THREE.BoxHelper(wrapper, 0xff00ff);
                    wrapper.add(boxHelper);
                    console.log(`[Morphology] Ingested ${url}. Target Tier: ${targetSizeMeters}m. Applied factor: ${scaleFactor.toFixed(4)}.`);
                }
                
                resolve(wrapper);
            }, undefined, (error) => {
                console.error(`[MorphologyImporter] GLB Failed: ${url}`, error);
                reject(error);
            });
        });
    }
}
