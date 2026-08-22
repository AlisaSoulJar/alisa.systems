import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AssetResolver } from '../AssetResolver.js';

/**
 * GLTFModelPool — Cached, Normalized Model Asset Pool
 * ====================================================
 * Extends the basic GLTFPlugin pattern with:
 *   - Automatic geometry centering and size normalization
 *   - Key-based cache (load once, clone N times)
 *   - Shadow setup and material preparation
 *   - Batch preloading from manifest
 *
 * Replaces inline loader code in: Marabunta, Aquarium, Raccoon
 *
 * Usage:
 *   const pool = new GLTFModelPool();
 *   await pool.load('marabunta', '../props/ready/Chicken.glb', 1.5);
 *   const clone = pool.get('marabunta'); // normalized, centered clone
 *   scene.add(clone);
 */
export class GLTFModelPool {
    constructor() {
        this.loader = new GLTFLoader();
        /** @type {Map<string, THREE.Group>} */
        this._cache = new Map();
        /** @type {Map<string, Promise<THREE.Group>>} */
        this._pending = new Map();
    }

    /**
     * LEGACY STATIC LOADER (restored 2026-07-27).
     * Several factories (Katamari, InteractionLab, Traffic, Locomotion) call
     * `GLTFModelPool.get(path)` expecting a Promise that resolves to the RAW gltf
     * ({ scene, animations }) — they scale/traverse/clone `gltf.scene` themselves.
     * This static loader is SEPARATE from the instance `get(key)` (cache clone);
     * static & instance methods coexist. Fresh load per call (callers mutate scene),
     * so no cross-mutation. Was removed when the class became an instantiable pool
     * → those factories crashed with "GLTFModelPool.get is not a function".
     * @param {string} path
     * @returns {Promise<{scene: THREE.Group, animations: THREE.AnimationClip[]}>}
     */
    static get(path) {
        if (!GLTFModelPool._staticLoader) GLTFModelPool._staticLoader = new GLTFLoader();
        // Resuelto contra la raíz del motor, no contra la página: si no, un lab
        // en /labs/ pedía /labs/props/models/... y se comía un 404.
        const url = AssetResolver.resolve(path);
        return new Promise((resolve, reject) => {
            GLTFModelPool._staticLoader.load(url, resolve, undefined, reject);
        });
    }

    /**
     * Load and cache a model with automatic normalization.
     * If the model is already cached or loading, returns the existing instance/promise.
     *
     * @param {string} key - Unique identifier for this model
     * @param {string} path - URL/path to the .glb/.gltf file
     * @param {number} [normalizeSize=1.5] - Target bounding sphere diameter
     * @param {Object} [options]
     * @param {boolean} [options.castShadow=true]
     * @param {boolean} [options.receiveShadow=true]
     * @returns {Promise<THREE.Group>} The canonical (non-cloned) instance
     */
    async load(key, path, normalizeSize = 1.5, options = {}) {
        // Return cached
        if (this._cache.has(key)) {
            return this._cache.get(key);
        }

        // Deduplicate concurrent loads
        if (this._pending.has(key)) {
            return this._pending.get(key);
        }

        const url = AssetResolver.resolve(path);
        const promise = new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                const scene = gltf.scene;

                // 1. Center geometry
                const box = new THREE.Box3().setFromObject(scene);
                const center = box.getCenter(new THREE.Vector3());
                scene.position.sub(center);
                scene.position.y = 0; // Keep on floor

                // 2. Normalize size
                const size = box.getSize(new THREE.Vector3()).length();
                const wrapper = new THREE.Group();
                if (size > 0) {
                    scene.scale.setScalar(normalizeSize / size);
                }
                wrapper.add(scene);

                // 3. Shadow + material prep
                const castShadow = options.castShadow !== false;
                const receiveShadow = options.receiveShadow !== false;
                wrapper.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = castShadow;
                        c.receiveShadow = receiveShadow;
                        // Clone material to allow per-instance modifications
                        c.material = c.material.clone();
                        c.material.roughness = c.material.roughness ?? 1.0;
                        c.material.metalness = c.material.metalness ?? 0.0;
                        // Save original for flash effects
                        c.userData.origMat = c.material.clone();
                    }
                });

                // 4. Preserve animations
                wrapper.animations = gltf.animations || [];

                // 5. Cache
                this._cache.set(key, wrapper);
                this._pending.delete(key);

                resolve(wrapper);
            }, undefined, (err) => {
                console.error(`[GLTFModelPool] Failed to load "${key}" from ${path}`, err);
                this._pending.delete(key);
                reject(err);
            });
        });

        this._pending.set(key, promise);
        return promise;
    }

    /**
     * Get a clone of a cached model. Returns null if not loaded yet.
     * @param {string} key
     * @returns {THREE.Group|null}
     */
    get(key) {
        const original = this._cache.get(key);
        if (!original) return null;
        return original.clone();
    }

    /**
     * Check if a model is cached and ready.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this._cache.has(key);
    }

    /**
     * Get the original (non-cloned) instance. Use for reading animations.
     * @param {string} key
     * @returns {THREE.Group|null}
     */
    getOriginal(key) {
        return this._cache.get(key) || null;
    }

    /**
     * Preload a batch of models from a manifest.
     * @param {Array<{key: string, path: string, size?: number}>} manifest
     * @returns {Promise<void>} Resolves when all models are loaded
     */
    async preloadBatch(manifest) {
        const promises = manifest.map(entry =>
            this.load(entry.key, entry.path, entry.size || 1.5)
                .catch(err => console.warn(`[GLTFModelPool] Skipping "${entry.key}":`, err))
        );
        await Promise.all(promises);
    }

    /**
     * Number of cached models
     * @returns {number}
     */
    get size() {
        return this._cache.size;
    }

    /**
     * Dispose all cached models and their materials.
     */
    dispose() {
        for (const [key, group] of this._cache) {
            group.traverse(c => {
                if (c.isMesh) {
                    c.geometry?.dispose();
                    c.material?.dispose();
                }
            });
        }
        this._cache.clear();
        this._pending.clear();
    }
}
