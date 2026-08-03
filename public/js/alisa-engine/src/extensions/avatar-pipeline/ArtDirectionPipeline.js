/**
 * ArtDirectionPipeline.js
 * ═══════════════════════════════════════════════════════════════
 * Orchestrates the full Art Direction pipeline:
 *   1. Catalog fetch & avatar library hydration
 *   2. Model load → Arachne normalize → Pygmalion voxelize → MST
 *   3. Skeleton projection (ProceduralRigging)
 *   4. Avatar skin binding
 *   5. Scanner visibility toggles
 *   6. Procedural animation loop (delegates to ProceduralKinematics)
 *
 * Extracted from the 1000+ line room_art_direction.html monolith.
 * ═══════════════════════════════════════════════════════════════
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// These 5 live in soma/, not in extensions/ — '../X.js' resolved to extensions/X.js and
// broke every import of this pipeline (module specifiers resolve against the FILE, not the page).
import { ProceduralRigging } from '../../soma/ProceduralRigging.js';
import { ProceduralKinematics } from '../../soma/ProceduralKinematics.js';
import { MotionBank } from '../../soma/MotionBank.js';
import { ArachneEngine } from '../../soma/ArachneEngine.js';
import { PygmalionEngine } from '../../soma/PygmalionEngine.js';

export class ArtDirectionPipeline {
    constructor(engine, renderGroup, logCallback) {
        this.engine = engine;
        this.scene = engine.scene;
        this.renderGroup = renderGroup;
        this.log = logCallback || (() => {});
        this.loader = new GLTFLoader();

        // Catalog state
        this.dropQueue = [];
        this.avatarQueue = [];
        this.platonicSkeletonsDB = {};
        this.geppettoData = { gaitsDict: {}, ROM: {}, rosettaMap: {}, motionBankData: {} };

        // Active state
        this.currentModelFilename = null;
        this.activeSkeletonType = '';
        this.activeProceduralBones = null;
        this.activeSkeleton = null;
        this.activeSkinnedMeshes = null;
        this.activeAvatarGroup = null;
        this.activeBaseMeshes = null;
        this.engineRes = null;
        this.matchedArchetypeSlices = [];

        // Slice groups (populated after model load)
        this.visGroupY = null;
        this.visGroupZ = null;
        this.visGroupRing = null;
        this.visGroupSpine = null;
        this.visGroupMST = null;
        this.detectedSlices = null;
        this.allDetectedSlices = null;
        this.essentialSlices = null;

        // Skeleton visualization group
        this.standardSkeletonGroup = new THREE.Group();
        this.scene.add(this.standardSkeletonGroup);
    }

    // ═══════════════════════════════════════════════════════════
    //  INITIALIZATION: Fetch catalogs and configs
    // ═══════════════════════════════════════════════════════════
    async init() {
        try {
            const [movRes, skelRes] = await Promise.all([
                fetch('../data/kinematics.json'),
                fetch('../data/skeletons.json')
            ]);

            const globalMovements = await movRes.json();
            this.platonicSkeletonsDB = await skelRes.json();

            // Map to legacy geppettoData structure
            this.geppettoData.gaitsDict = {};
            for (const archetype in globalMovements) {
                if (globalMovements[archetype]?.gaits) {
                    this.geppettoData.gaitsDict[archetype] = globalMovements[archetype].gaits;
                }
            }
            this.geppettoData.ROM = globalMovements._shared_biological_rom || {};

            // Rosetta Map for retargeting
            const rosettaRes = await fetch('../js/alisa-engine/src/soma/SemanticBoneMap.json');
            this.geppettoData.rosettaMap = await rosettaRes.json();

            // Sovereign Asset Gateway
            const res = await fetch('/geppetto/catalog');
            const data = await res.json();
            const catalog = data.catalog || {};
            this.dropQueue = [];
            let totalAssets = 0;

            for (const [, items] of Object.entries(catalog)) {
                if (items.length === 0) continue;
                items.forEach(item => {
                    this.dropQueue.push(item);
                    totalAssets++;
                });
            }

            // Avatar Gateway
            const avatarsRes = await fetch('/geppetto/avatars');
            const avatarsData = await avatarsRes.json();
            const avatarsCatalog = avatarsData.avatars || {};
            this.avatarQueue = [];

            for (const [, items] of Object.entries(avatarsCatalog)) {
                if (items.length === 0) continue;
                items.forEach(item => this.avatarQueue.push(item));
            }

            this.log(`Loaded <span style="color:#00ffcc">${totalAssets}</span> procedural assets via Taxonomic Catalog.`);

            return {
                catalog,
                avatarsCatalog,
                dropQueue: this.dropQueue,
                avatarQueue: this.avatarQueue,
                skeletonsDB: this.platonicSkeletonsDB,
                gaitsDict: this.geppettoData.gaitsDict
            };
        } catch (e) {
            this.log(`Error connecting to Taxonomic Hub manifest: ${e.message}`);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  MODEL LOADING: Arachne → Pygmalion → MST pipeline
    // ═══════════════════════════════════════════════════════════
    loadModel(assetInfo) {
        this.log(`Loading ${assetInfo.name}...`);
        this.currentModelFilename = assetInfo.filename || assetInfo.name;

        // Clear previous
        while (this.renderGroup.children.length > 0) this.renderGroup.remove(this.renderGroup.children[0]);

        return new Promise((resolve, reject) => {
            this.loader.load(assetInfo.url, (gltf) => {
                let baseMesh = gltf.scene;
                baseMesh.updateWorldMatrix(true, true);

                // Motion Bank extraction
                if (gltf.animations?.length > 0) {
                    const extracted = MotionBank.extractFromGLTF(gltf, this.geppettoData.rosettaMap, assetInfo.filename);
                    Object.assign(this.geppettoData.motionBankData, extracted);
                    this.log(`Extracted <span style="color:#00ffcc">${Object.keys(extracted).length}</span> Kinematic Motions via Rosetta.`);
                }

                // Arachne: normalize + Katamari scale
                baseMesh = ArachneEngine.normalizeMesh(gltf.scene);
                const arachneData = ArachneEngine.applyKatamariScale(baseMesh, assetInfo.manifest);
                this.renderGroup.add(arachneData.scaledMesh);

                // Ghost wireframe
                const baseWireframe = arachneData.scaledMesh.clone();
                baseWireframe.traverse(c => {
                    if (c.isMesh) c.material = new THREE.MeshBasicMaterial({
                        color: 0x334455, wireframe: true, transparent: true, opacity: 0.2
                    });
                });
                this.renderGroup.add(baseWireframe);

                // Pygmalion: voxelize + tomography
                const { proceduralCopy, allPts } = PygmalionEngine.voxelize(arachneData.scaledMesh);
                this.renderGroup.add(proceduralCopy);
                this.activeBaseMeshes = [arachneData.scaledMesh, baseWireframe, proceduralCopy];

                const tomoRes = PygmalionEngine.performTomography(allPts, arachneData.targetSize, proceduralCopy);
                this.detectedSlices = tomoRes.detectedSlices;
                this.allDetectedSlices = this.detectedSlices;
                this.essentialSlices = this.detectedSlices;

                this.visGroupY = tomoRes.groups.visGroupY;
                this.visGroupZ = tomoRes.groups.visGroupZ;
                this.visGroupRing = tomoRes.groups.visGroupRing;
                this.visGroupSpine = tomoRes.groups.visGroupSpine;
                this.visGroupMST = proceduralCopy.children.find(c => c.name === 'visGroupMST') || new THREE.Group();
                this.visGroupMST.name = 'visGroupMST';
                if (!this.visGroupMST.parent) proceduralCopy.add(this.visGroupMST);

                // MST: filter structural vs noise slices
                const mstData = PygmalionEngine.generateMST(this.detectedSlices);
                this.essentialSlices = mstData.essentialSlices;

                // Visualize MST edges
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3, depthTest: false });
                mstData.edges.forEach(edge => {
                    if (edge.v && edge.u) {
                        const points = [edge.v.center, edge.u.center];
                        const geom = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geom, lineMat);
                        this.visGroupMST.add(line);
                    }
                });

                console.log(`[ArtDirection] Modular Orchestration Complete (MST: ${this.essentialSlices.length}/${this.detectedSlices.length} slices). Ready for Sculpt`);

                resolve({
                    arachneData,
                    tomoRes,
                    mstData,
                    extractedMotions: gltf.animations?.length > 0 ? Object.keys(this.geppettoData.motionBankData) : []
                });
            }, undefined, err => {
                this.log(`Error loading ${assetInfo.name}: ${err}`);
                reject(err);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  SKELETON PROJECTION
    // ═══════════════════════════════════════════════════════════
    projectSkeleton(type) {
        this.activeSkeletonType = type;
        this.standardSkeletonGroup.clear();
        if (!type) return null;

        const validSlices = (this.essentialSlices?.length > 0) ? this.essentialSlices : this.detectedSlices;

        const engineRes = ProceduralRigging.buildArchetypeSkeleton(type, this.renderGroup, validSlices);
        this.activeProceduralBones = engineRes.activeProceduralBones;
        this.activeSkeleton = engineRes.skeleton;
        this.matchedArchetypeSlices = engineRes.matchedArchetypeSlices || [];
        this.engineRes = engineRes;

        // Visual helper
        const helper = engineRes.helper;
        if (helper) {
            helper.material.linewidth = 2;
            helper.material.depthTest = false;
            helper.material.vertexColors = false;
            helper.material.color.setHex(0xff00bb);
            this.standardSkeletonGroup.add(helper);
        }
        if (engineRes.skeletonGroup) {
            this.standardSkeletonGroup.add(engineRes.skeletonGroup);
        }

        // Auto-weighting
        this.standardSkeletonGroup.updateMatrixWorld(true);

        if (this.activeSkinnedMeshes) {
            this.activeSkinnedMeshes.forEach(sm => sm.removeFromParent());
        }
        this.activeSkinnedMeshes = ProceduralRigging.bindMesh(
            engineRes.skeleton, engineRes.rawBones, engineRes.rootBones, this.renderGroup
        );

        this.log(`Proyectado esqueleto estándar: ${type} y auto-weighted.`);
        return engineRes;
    }

    // ═══════════════════════════════════════════════════════════
    //  AVATAR SKIN BINDING
    // ═══════════════════════════════════════════════════════════
    applyAvatarSkin(assetInfo) {
        this.log(`Descargando Piel (Avatar): ${assetInfo.id}...`);

        if (this.activeAvatarGroup) {
            this.renderGroup.remove(this.activeAvatarGroup);
            this.activeAvatarGroup = null;
        }
        if (this.activeSkinnedMeshes) {
            this.activeSkinnedMeshes.forEach(sm => sm.removeFromParent());
            this.activeSkinnedMeshes = null;
        }

        let finalUrl = assetInfo.url;
        if (!finalUrl.startsWith('../')) finalUrl = '../' + finalUrl;

        return new Promise((resolve) => {
            this.loader.load(finalUrl, (gltf) => {
                let avatarMesh = gltf.scene;
                avatarMesh.updateWorldMatrix(true, true);

                const arachneData = ArachneEngine.applyKatamariScale(avatarMesh, null);
                this.activeAvatarGroup = arachneData.scaledMesh;
                this.renderGroup.add(this.activeAvatarGroup);

                // Bind to procedural skeleton
                if (this.activeSkeleton && this.activeProceduralBones) {
                    this.log(`Simbiosis: Vinculando [${assetInfo.id}] al Esqueleto Matemático...`);
                    this.activeSkinnedMeshes = ProceduralRigging.bindMesh(
                        this.activeSkeleton,
                        this.activeProceduralBones,
                        this.engineRes.rootBones,
                        this.renderGroup,
                        this.activeAvatarGroup
                    );
                    this.log(`<span style="color:#ff00bb">Vinculación Biológica Completada.</span>`);
                } else {
                    this.log(`<span style="color:#ff0055">Advertencia: Esqueleto Ausente. Proyecte un esqueleto primero.</span>`);
                }

                resolve(arachneData);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  SCANNER VISIBILITY
    // ═══════════════════════════════════════════════════════════
    updateScannerVisibility(toggles) {
        const { showY, showZ, showRing, showSpine, showMST, onlyEssential, onlyArchetype } = toggles;

        if (this.visGroupY) this.visGroupY.visible = showY;
        if (this.visGroupZ) this.visGroupZ.visible = showZ;
        if (this.visGroupRing) this.visGroupRing.visible = showRing;
        if (this.visGroupSpine) this.visGroupSpine.visible = showSpine;
        if (this.visGroupMST) this.visGroupMST.visible = showMST;

        if (this.allDetectedSlices?.length > 0 && this.essentialSlices) {
            this.detectedSlices = onlyEssential ? this.essentialSlices : this.allDetectedSlices;

            this.allDetectedSlices.forEach(cs => {
                if (cs.meshRef) {
                    const isEssential = this.essentialSlices.includes(cs);
                    const isArchetype = this.matchedArchetypeSlices?.includes(cs);

                    let isVis = true;
                    if (onlyEssential) isVis = isVis && isEssential;
                    if (onlyArchetype) isVis = isVis && isArchetype;

                    cs.meshRef.visible = isVis;
                    if (cs.neons) cs.neons.forEach(n => n.visible = isVis);

                    // Visual hierarchy
                    if (isArchetype) {
                        cs.meshRef.material.opacity = 0.9;
                        cs.meshRef.scale.set(1.2, 1.2, 1.2);
                        cs.meshRef.material.color.setHex(0xff0055);
                    } else if (isEssential && onlyEssential) {
                        cs.meshRef.material.opacity = 0.8;
                        cs.meshRef.scale.set(1.1, 1.1, 1.1);
                        cs.meshRef.material.color.setHex(cs.baseColor || 0xffffff);
                    } else {
                        cs.meshRef.material.opacity = 0.4;
                        cs.meshRef.scale.set(1.0, 1.0, 1.0);
                        cs.meshRef.material.color.setHex(cs.baseColor || 0xffffff);
                    }
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ANIMATION TICK (delegates to ProceduralKinematics)
    // ═══════════════════════════════════════════════════════════
    tickAnimation(t, mode) {
        if (!this.activeProceduralBones || this.activeProceduralBones.length === 0) return;
        const config = {
            activeSkeletonType: this.activeSkeletonType,
            geppettoData: this.geppettoData,
            motionBankData: this.geppettoData.motionBankData
        };
        ProceduralKinematics.tick(this.activeProceduralBones, t, mode, config);
    }

    // ═══════════════════════════════════════════════════════════
    //  VISIBILITY TOGGLES
    // ═══════════════════════════════════════════════════════════
    setAvatarVisible(visible) {
        if (this.activeAvatarGroup) this.activeAvatarGroup.visible = visible;
        if (this.activeSkinnedMeshes) this.activeSkinnedMeshes.forEach(sm => sm.visible = visible);
    }

    setBaseMeshVisible(visible) {
        if (this.activeBaseMeshes) this.activeBaseMeshes.forEach(m => { if (m) m.visible = visible; });
    }
}
