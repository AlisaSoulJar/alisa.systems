import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Usaba `AssetManager` como global, de cuando el motor eran scripts sueltos.
import { AssetManager } from '../AssetManager.js';

/**
 * ALISA GLTF Loader Plugin
 * ----------------------------------------------------
 * Decouples the THREE.js GLTFLoader from the core logic.
 * Exposes a standard load method, registering itself into the 
 * AlisaRenderCore plugin system and resolving GLB payloads asynchronously.
 */
export class GLTFPlugin {
    constructor() {
        this.name = 'GLTFPlugin';
        this.loader = new GLTFLoader();
        console.log(`[GLTFPlugin] 📦 Initialized GLTFLoader Subsystem.`);
    }

    /**
     * Called automatically by AlisaRenderCore.registerPlugin
     */
    onInit(core) {
        this.core = core;
        // Inject delegate
        import('../AssetManager.js').then(module => {
            module.AssetManager.setGLTFDelegate(this.load.bind(this));
            console.log(`[GLTFPlugin] 🔌 Injected GLTF delegate into AssetManager.`);
        }).catch(err => console.error("Could not load AssetManager to inject GLTFPlugin", err));
    }

    /**
     * Asynchronously loads a model and returns the resolved THREE.Group / Scene.
     * @param {string} url Path to the .glb / .gltf
     * @returns {Promise<THREE.Group>}
     */
    async load(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    if (gltf.animations && gltf.animations.length > 0) {
                        gltf.scene.userData.animations = gltf.animations;
                    }
                    resolve(gltf.scene);
                },
                undefined, // Progress callback
                (error) => {
                    console.error(`[GLTFPlugin] 🛑 Failed to load GLTF from ${url}`, error);
                    reject(error);
                }
            );
        });
    }
}
