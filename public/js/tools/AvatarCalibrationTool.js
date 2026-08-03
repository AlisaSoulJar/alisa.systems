import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

export class AvatarCalibrationTool {
    constructor(scene, uiContext = {}) {
        this.scene = scene;
        this.currentGroup = null;
        this.currentModelLoaded = null;

        // UI references & State
        this.document = uiContext.document || typeof document !== 'undefined' ? document : null;
        this.updateJSONOutCallback = uiContext.onJSONUpdate || (() => {});
        this.onStatsUpdate = uiContext.onStatsUpdate || (() => {});

        this.archetypes = {};
        
        // Face decal states
        this.facePlane = null;
        this.faceCanvas = null;
        this.faceCtx = null;
        this.faceTexture = null;
        this.faceBlinkTimer = 0;
        this.faceIsBlinking = false;
        
        // Calibration States
        this.liveConfig = { scale: 1.0, faceMode: 'hologram', faceScaleMod: 1.0, offsetX: 0, offsetY: 0, offsetZ: 0 };
    }

    async loadArchetypesDB(registriesData) {
        try {
            this.archetypes = {};
            for (const [cat, url] of Object.entries(registriesData)) {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const data = await resp.json();
                        delete data._doc;
                        this.archetypes[cat] = data;
                    }
                } catch(e) {
                     console.warn(`Could not load ${url}`);
                }
            }
            return this.archetypes;
        } catch (e) {
            console.error('Failed to load avatar archetypes', e);
        }
    }

    handleKeydown(keyStr) {
        if(!this.currentModelLoaded || !this.currentGroup) return false;
        const key = keyStr.toLowerCase();
        const sStep = 0.02;
        const posStep = 0.03;
        let changed = false;

        if (key === 'q') { this.liveConfig.scale = Math.max(0.01, this.liveConfig.scale - sStep); changed = true; }
        if (key === 'e') { this.liveConfig.scale += sStep; changed = true; }
        if (key === 't') { this.liveConfig.faceScaleMod += 0.1; changed = true; }
        if (key === 'g') { this.liveConfig.faceScaleMod = Math.max(0.1, this.liveConfig.faceScaleMod - 0.1); changed = true; }
        if (key === 'w') { this.liveConfig.offsetY += posStep; changed = true; }
        if (key === 's') { this.liveConfig.offsetY -= posStep; changed = true; }
        if (key === 'a') { this.liveConfig.offsetX -= posStep; changed = true; }
        if (key === 'd') { this.liveConfig.offsetX += posStep; changed = true; }
        if (key === 'r') { this.liveConfig.offsetZ += posStep; changed = true; }
        if (key === 'f') { this.liveConfig.offsetZ -= posStep; changed = true; }
        if (key === 'c') { 
            this.liveConfig.faceMode = this.liveConfig.faceMode === 'hologram' ? 'decal' : 'hologram'; 
            changed = true; 
        }

        if(changed) {
            this.currentModelLoaded.scale.set(this.liveConfig.scale, this.liveConfig.scale, this.liveConfig.scale);
            this.attachStripeFace(this.currentGroup, this.liveConfig.faceMode);
            this.updateJSONOutCallback(this.liveConfig);
            return true;
        }
        return false;
    }

    loadArchetypeGLB(recipe, uiTint, uiStyle) {
        if (this.currentGroup) this.scene.remove(this.currentGroup);
        this.currentGroup = new THREE.Group();
        
        this.currentModelLoaded = null;
        this.liveConfig.scale = recipe.scale || 1.0;
        this.liveConfig.faceMode = recipe.faceStyle || 'hologram';
        this.liveConfig.faceScaleMod = recipe.faceScaleMod || 1.0;
        this.liveConfig.offsetX = recipe.offsetX || 0;
        this.liveConfig.offsetY = recipe.offsetY || 0;
        this.liveConfig.offsetZ = recipe.offsetZ || 0;

        const useTint = uiTint !== '#ffffff';

        console.log(`Loading Monolithic GLB: ${recipe.url}`);
        const loader = new GLTFLoader();
        let url = recipe.url;
        if (url && !url.startsWith("../") && !url.startsWith("http")) url = "../" + url;
        
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            const scale = recipe.scale || 1.0;
            model.scale.set(scale, scale, scale);
            
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (uiStyle === 'wireframe') {
                        child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
                    } else if (uiStyle === 'silhouette') {
                        child.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                    } else if (uiStyle === 'xray') {
                        child.material = new THREE.MeshStandardMaterial({ 
                            color: useTint ? uiTint : 0x00ffff, 
                            transparent: true, opacity: 0.3, wireframe: true 
                        });
                    } else {
                        if (useTint && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => { if (mat.color) mat.color.set(uiTint); });
                            } else {
                                if (child.material.color) child.material.color.set(uiTint);
                            }
                        }
                    }
                }
            });

            this.currentGroup.add(model);
            this.currentModelLoaded = model;
            this.scene.add(this.currentGroup);

            this.extractColorPalette(this.currentGroup);
            this.attachStripeFace(this.currentGroup, this.liveConfig.faceMode);
            this.onStatsUpdate({ parts: '1 (GLB)', triCount: '?' });
            this.updateJSONOutCallback(this.liveConfig);
            
        }, undefined, (e) => console.error("Failed to load GLB:", e));
    }

    // ==========================================
    // 🧬 VERTEX PALETTE EXTRACTOR
    // ==========================================
    extractColorPalette(group) {
        if (!this.document) return;
        const paletteContainer = this.document.getElementById('dynamicPalette');
        if(!paletteContainer) return;
        paletteContainer.innerHTML = ''; 
        
        let colorCounts = {}; 

        group.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry && child.geometry.attributes.color) {
                    const colors = child.geometry.attributes.color;
                    const c = new THREE.Color();
                    for (let i = 0; i < colors.count; i++) {
                        c.fromBufferAttribute(colors, i);
                        let rq = Math.round(c.r * 5) / 5;
                        let gq = Math.round(c.g * 5) / 5;
                        let bq = Math.round(c.b * 5) / 5;
                        let qColor = new THREE.Color(rq, gq, bq);
                        let hex = '#' + qColor.getHexString();
                        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
                    }
                } else if (child.material) {
                    let mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(mat => {
                        if (mat.color && !mat.map) {
                            let rq = Math.round(mat.color.r * 5) / 5;
                            let gq = Math.round(mat.color.g * 5) / 5;
                            let bq = Math.round(mat.color.b * 5) / 5;
                            let qColor = new THREE.Color(rq, gq, bq);
                            let hex = '#' + qColor.getHexString();
                            colorCounts[hex] = (colorCounts[hex] || 0) + 10; 
                        }
                    });
                }
            }
        });

        let sortedHex = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
        let topColors = sortedHex.slice(0, 8);
        
        if (topColors.length === 0) {
            paletteContainer.innerHTML = '<span style="font-size:11px; color:#666;">Sin Vertex Colors detectados.</span>';
            return;
        }

        topColors.forEach(origHex => {
            let wrapper = this.document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            
            let label = this.document.createElement('div');
            label.style.fontSize = '9px';
            label.style.color = '#fff';
            label.innerText = colorCounts[origHex];

            let inp = this.document.createElement('input');
            inp.type = 'color';
            inp.value = origHex;
            inp.title = `Vertex Base: ${origHex} (${colorCounts[origHex]} px)`;
            inp.style.width = '25px';
            inp.style.height = '25px';
            inp.style.padding = '0';
            inp.style.border = '1px solid #444';
            inp.style.cursor = 'pointer';
            
            inp.onchange = (e) => {
                let newHex = e.target.value;
                let currentTargetHex = inp.dataset.current || origHex;
                this.replaceVertexColorSpecific(currentTargetHex, newHex, 0.25);
                inp.dataset.current = newHex; 
            };

            wrapper.appendChild(inp);
            wrapper.appendChild(label);
            paletteContainer.appendChild(wrapper);
        });
    }

    replaceVertexColorSpecific(targetHex, replaceHex, tol) {
        if (!this.currentGroup) return;
        const targetC = new THREE.Color(targetHex);
        const replaceC = new THREE.Color(replaceHex);
        let replacedCount = 0;

        this.currentGroup.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry && child.geometry.attributes.color) {
                    const colors = child.geometry.attributes.color;
                    const c = new THREE.Color();
                    for (let i = 0; i < colors.count; i++) {
                        c.fromBufferAttribute(colors, i);
                        const dist = Math.sqrt(
                            Math.pow(c.r - targetC.r, 2) + Math.pow(c.g - targetC.g, 2) + Math.pow(c.b - targetC.b, 2)
                        );
                        if (dist <= tol) {
                            colors.setXYZ(i, replaceC.r, replaceC.g, replaceC.b);
                            replacedCount++;
                        }
                    }
                    colors.needsUpdate = true;
                } else if (child.material) {
                    let mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(mat => {
                        if (mat.color && !mat.map) {
                            const dist = Math.sqrt(
                                Math.pow(mat.color.r - targetC.r, 2) + Math.pow(mat.color.g - targetC.g, 2) + Math.pow(mat.color.b - targetC.b, 2)
                            );
                            if (dist <= tol) {
                                mat.color.copy(replaceC.clone());
                                replacedCount++;
                            }
                        }
                    });
                }
            }
        });
        console.log(`DNA Spliced: ${replacedCount} elements from ${targetHex} to ${replaceHex}`);
    }

    // ==========================================
    // 👁️ STRIPE GIF / PROCEDURAL FACE SCREEN
    // ==========================================
    attachStripeFace(group, style) {
        if (this.facePlane) {
            if(this.facePlane.parent) this.facePlane.parent.remove(this.facePlane);
            this.facePlane = null;
        }
        
        if (!this.document) return;

        this.faceCanvas = this.document.createElement('canvas');
        this.faceCanvas.width = 64; this.faceCanvas.height = 64;
        this.faceCtx = this.faceCanvas.getContext('2d');
        
        this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
        this.faceTexture.magFilter = THREE.NearestFilter; 
        this.drawFaceFrame(false);

        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const faceScale = Math.max(0.2, size.x * 0.4) * this.liveConfig.faceScaleMod; 
        const faceY = box.max.y - (size.y * 0.15) + this.liveConfig.offsetY; 
        const faceZ = box.max.z + 0.02 + this.liveConfig.offsetZ; 
        const faceX = center.x + this.liveConfig.offsetX;

        if (style === 'decal') {
            const mat = new THREE.MeshBasicMaterial({ 
                map: this.faceTexture, transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4
            });
            let highestMesh = null;
            let maxMeshY = -Infinity;
            group.traverse(c => {
                if (c.isMesh) {
                    const bbox = new THREE.Box3().setFromObject(c);
                    if (bbox.max.y > maxMeshY) { maxMeshY = bbox.max.y; highestMesh = c; }
                }
            });
            
            if (highestMesh) {
                const position = new THREE.Vector3(faceX, faceY, faceZ);
                const orientation = new THREE.Euler(0, Math.PI, 0); 
                const decalSize = new THREE.Vector3(faceScale, faceScale, faceScale * 5); // Profundidad brutal en Z para atravesar pelo
                
                const decalGeo = new DecalGeometry(highestMesh, position, orientation, decalSize);
                this.facePlane = new THREE.Mesh(decalGeo, mat);
                this.facePlane.userData.isDecal = true;
                group.add(this.facePlane);
            }
        } else {
            // Hologram (Floating Plane)
            const mat = new THREE.MeshBasicMaterial({ map: this.faceTexture, transparent: true, side: THREE.DoubleSide });
            this.facePlane = new THREE.Mesh(new THREE.PlaneGeometry(faceScale, faceScale), mat);
            this.facePlane.userData.baseY = faceY;
            this.facePlane.userData.isDecal = false;
            this.facePlane.position.set(faceX, faceY, box.max.z + 0.005 + this.liveConfig.offsetZ); 
            group.add(this.facePlane);
        }
    }

    drawFaceFrame(isBlinking) {
        if (!this.faceCtx) return;
        this.faceCtx.clearRect(0, 0, 64, 64);
        
        this.faceCtx.fillStyle = '#00ffff';
        this.faceCtx.shadowBlur = 12;
        this.faceCtx.shadowColor = '#00ffff';
        
        if (isBlinking) {
            this.faceCtx.fillRect(12, 32, 16, 4);
            this.faceCtx.fillRect(36, 32, 16, 4);
        } else {
            this.faceCtx.fillRect(12, 20, 16, 16);
            this.faceCtx.fillRect(36, 20, 16, 16);
        }
        if (this.faceTexture) this.faceTexture.needsUpdate = true;
    }

    // ==========================================
    // 📥 GLB EXPORTER
    // ==========================================
    exportModifiedGLB(cat, key) {
        if (!this.currentGroup) {
            alert("No hay ningún modelo cargado para exportar.");
            return;
        }

        const exporter = new GLTFExporter();
        let exportTarget = this.currentGroup;
        
        this.currentGroup.children.forEach(c => {
            if(c.type === "Group" || c.type === "Scene") exportTarget = c;
        });

        exporter.parse(exportTarget, (gltf) => {
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = this.document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = `alisa_${cat}_${key}_modified.glb`;
            this.document.body.appendChild(link);
            link.click();
            this.document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, { binary: true });
    }

    tickBlock() {
        if (this.currentModelLoaded && this.currentGroup) {
            const t = Date.now() * 0.002;
            this.currentGroup.position.y = Math.sin(t) * 0.008;
            this.currentModelLoaded.rotation.x = 0;
        }

        if (this.facePlane) {
            this.faceBlinkTimer++;
            if (!this.faceIsBlinking && this.faceBlinkTimer > 180) { 
                this.faceIsBlinking = true;
                this.drawFaceFrame(true);
                this.faceBlinkTimer = 0;
            } else if (this.faceIsBlinking && this.faceBlinkTimer > 10) { 
                this.faceIsBlinking = false;
                this.drawFaceFrame(false);
                this.faceBlinkTimer = 0;
            }
            if (!this.facePlane.userData.isDecal && this.facePlane.userData.baseY !== undefined) {
                const floatOffset = Math.sin(Date.now() * 0.005) * (this.facePlane.scale.x * 0.02 + 0.01);
                this.facePlane.position.y = this.facePlane.userData.baseY + floatOffset;
            }
        }
    }
}
