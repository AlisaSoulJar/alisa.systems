import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ProceduralAnimator } from './ProceduralAnimator.js';
import { AssetManager } from '../AssetManager.js';

export class ProceduralRigging {
    constructor(scene) {
        this.scene = scene;
        this.archetypes = {};
        this.animator = new ProceduralAnimator();
        this.matCache = {};
    }

    async loadDatabases(dbUrls) {
        for (const [cat, url] of Object.entries(dbUrls)) {
            try {
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    delete data._doc;
                    this.archetypes[cat] = data;
                }
            } catch (e) {
                console.warn(`[ProceduralRiggingEngine] Could not load ${url}`);
            }
        }
        return this.archetypes;
    }

    getSolidMat(hex) {
        const k = `solid_${hex}`;
        if (this.matCache[k]) return this.matCache[k];
        const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85 });
        this.matCache[k] = m;
        return m;
    }

    buildMaterial(style, color) {
        if (style === 'silhouette') return new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        if (style === 'wireframe')  return new THREE.MeshBasicMaterial({ color, wireframe: true });
        if (style === 'xray')       return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35, roughness: 0.5 });
        return this.getSolidMat(color);
    }

    applyMaterialStyle(child, style, tint, useTint) {
        if (style === 'wireframe') {
            child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        } else if (style === 'silhouette') {
            child.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        } else if (style === 'xray') {
            child.material = new THREE.MeshStandardMaterial({
                color: useTint ? tint : 0x00ffff,
                transparent: true, opacity: 0.3, wireframe: true
            });
        } else if (useTint && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => { if (m.color && m.color.set) m.color.set(tint); });
        }
    }

    buildPrimitiveGeometry(part) {
        if (part.shape === 'box') {
            return part.radius 
                ? new RoundedBoxGeometry(part.size[0], part.size[1], part.size[2], 2, part.radius)
                : new THREE.BoxGeometry(...part.size);
        }
        if (part.shape === 'cylinder')   return new THREE.CylinderGeometry(...part.size);
        if (part.shape === 'sphere')     return new THREE.SphereGeometry(...part.size);
        if (part.shape === 'cone')       return new THREE.ConeGeometry(...part.size);
        if (part.shape === 'hemisphere') return new THREE.SphereGeometry(part.size[0], part.size[1]||8, part.size[2]||6, 0, Math.PI*2, 0, Math.PI/2);
        if (part.shape === 'wedge') {
            const g = new THREE.CylinderGeometry(part.size[0]*0.7071, part.size[1]*0.7071, part.size[2], 4);
            g.rotateY(Math.PI / 4);
            return g;
        }
        return null;
    }

    buildRig(recipe, key, uiStyle, uiTint, rigType = 'voxel') {
        return new Promise((resolve) => {
            const useTint = uiTint !== '#ffffff';
            const currentGroup = new THREE.Group();
            let currentModel = null;
            let currentSkinned = null;
            let boneCount = 0;
            let triCount = 0;

            // ── GLB Model (Loaded via Plugin/AssetManager Delegate) ──
            if (recipe.type === 'glb') {
                const modelUrl = recipe.url.startsWith('http') ? recipe.url : '../' + recipe.url;
                
                AssetManager.loadModelAsync(modelUrl).then((model) => {
                    const s = recipe.scale || 1.0;
                    model.scale.set(s, s, s);

                    model.traverse(child => {
                        if (!child.isMesh) return;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        this.applyMaterialStyle(child, uiStyle, uiTint, useTint);
                    });

                    currentGroup.add(model);
                    currentModel = model;

                    if (rigType === 'proxy') {
                        this.animator.injectProxyBones(currentGroup, recipe.tier || 'T4');
                    } else if (rigType === 'voxel') {
                        currentSkinned = this.animator.injectVoxelBones(currentGroup, key);
                        if (currentSkinned) {
                            currentModel = currentSkinned;
                            const helper = new THREE.SkeletonHelper(currentSkinned);
                            helper.material.linewidth = 3;
                            helper.material.depthTest = false;
                            helper.material.transparent = true;
                            currentGroup.userData.helper = helper;
                            boneCount = currentSkinned.skeleton?.bones?.length || 0;
                        }
                    } else if (rigType === 'ai_scan') {
                        // Lazy loading the scanner so it doesn't block the UI initially
                        import('./SkeletalScanner.js').then(module => {
                            module.SkeletalScanner.scanAndMap(model).then(result => {
                                if (result && result.mapping) {
                                    const success = module.SkeletalScanner.tagBonesWithAIRoles(model, result.mapping);
                                    if (success) {
                                        console.log("[ProceduralRiggingEngine] AI Skeletal Scanner successfully hooked up ProceduralAnimator roles for", key);
                                    }
                                }
                            });
                        });
                        // For .glb that already has a skeleton, we just use the original model
                        currentSkinned = null; 
                    }

                    resolve({ 
                        root: currentGroup, 
                        model: currentModel, 
                        skinned: currentSkinned, 
                        helper: currentGroup.userData.helper, 
                        stats: { parts: 1, tris: 0, bones: boneCount } 
                    });
                }).catch((error) => {
                    console.error("[ProceduralRigging] Failed to load model via AssetManager GLTF Delegate.", error);
                    resolve(null);
                });
                return;
            }

            // ── Procedural Primitive Construction ──
            if (Array.isArray(recipe)) {
                for (const part of recipe) {
                    const geo = this.buildPrimitiveGeometry(part);
                    if (!geo) continue;

                    const baseColor = useTint ? uiTint : (part.color || '#888888');
                    const mat = this.buildMaterial(uiStyle, baseColor);

                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(part.pos?.[0] || 0, part.pos?.[1] || 0, part.pos?.[2] || 0);
                    if (part.rot) mesh.rotation.set(...part.rot);
                    if (part.scale) mesh.scale.set(...part.scale);
                    mesh.castShadow = true;
                    
                    if (uiStyle !== 'wireframe') {
                        const edges = new THREE.EdgesGeometry(geo);
                        const edgeColor = uiStyle === 'silhouette' ? 0x333333 : 0x000000;
                        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.3 })));
                    }

                    triCount += geo.index ? geo.index.count / 3 : (geo.attributes.position.count / 3);
                    currentGroup.add(mesh);
                }

                resolve({ 
                    root: currentGroup, 
                    model: currentGroup, 
                    skinned: null, 
                    helper: null, 
                    stats: { parts: recipe.length, tris: Math.round(triCount), bones: 0 } 
                });
            } else {
                resolve(null);
            }
        });
    }

    animateLocomotion(model, time, speed) {
        if (!model) return;
        this.animator.applyWalkCycle(model, time, speed);
    }
}
