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
        // ⚠️ ANTES esto era `uiContext.document || typeof document !== 'undefined' ? document : null`,
        // sin paréntesis: por precedencia de operadores el `? :` se evaluaba sobre TODA la
        // condición y la rama verdadera devolvía siempre la variable global `document`, nunca
        // `uiContext.document`. En el navegador colaba porque ambas cosas eran el mismo objeto;
        // en Node (sin `document` global) revienta con ReferenceError en cuanto uiContext.document
        // es verdadero, que es justo el caso que necesita una prueba para pasarle un doble.
        this.document = uiContext.document || (typeof document !== 'undefined' ? document : null);
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
        this.faceAnchor = null;            // ancla puesta por setFaceAnchor(), ya escalada al modelo real
        this.currentExpression = 'neutral'; // última expresión pedida por setExpression()

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

    /**
     * ⚠️ COPIA DEL LÉXICO, A PROPÓSITO. `face_lexicon.json` (public/data/realizacion/)
     * es la fuente de verdad para NARRATIVA (qué expresión le toca a qué emoción),
     * pero nadie en este fichero lo trae por `fetch`: los sitios de llamada piden
     * `setExpression('neutral')` a pelo, sin pasar el léxico. Así que el dibujo
     * necesita su propia tabla símbolo↔forma, igual que `aspecto.js` guarda su
     * propia copia de la paleta (ver la nota de `camara.js`). Los 8 nombres y
     * símbolos tienen que coincidir con el JSON o la cara mentiría sobre lo que
     * la narrativa pidió; `prueba_cara.mjs` vigila esa deriva leyendo el disco.
     */
    static EXPRESIONES = {
        neutral:   { symbol: null,    boca: 'recta' },
        happy:     { symbol: 'note',  boca: 'sonrisa' },
        sad:       { symbol: 'tear',  boca: 'triste' },
        angry:     { symbol: 'vein',  boca: 'apretada' },
        surprised: { symbol: 'bang',  boca: 'o', ojosGrandes: true },
        thinking:  { symbol: 'dots',  boca: 'ladeada' },
        crying:    { symbol: 'tears', boca: 'triste' },
        nervous:   { symbol: 'sweat', boca: 'ondulada' },
    };

    /**
     * `pos`/`size` vienen de `face_anchors.json`, expresados para un arquetipo
     * CANÓNICO de `canon` unidades de alto (5.0 en el registro actual). El modelo
     * que se acaba de cargar casi nunca mide eso — `loadArchetypeGLB` escala cada
     * GLB a su propio `recipe.scale` — así que hay que reescalar el ancla ANTES
     * de guardarla. Si no, la cara de un droid_compact (canon-alto ~0.7 de sus
     * 5 unidades) se plantaría a la altura pensada para un modelo 7 veces más alto.
     *
     * El factor sale de la altura REAL del `currentGroup` ya cargado (medida con
     * `Box3`, igual que hace `attachStripeFace` para todo lo demás — por eso no la
     * recalculamos de otra forma, «para no contradecirlo»). Sin modelo cargado no
     * hay con qué medir: se guarda sin escalar (factor 1) en vez de reventar.
     */
    setFaceAnchor(pos, size, canon) {
        const alturaCanon = Number(canon) || 5.0;
        let factor = 1;
        const sujeto = this.currentGroup || this.currentModelLoaded;
        if (sujeto) {
            sujeto.updateMatrixWorld(true);
            const caja = new THREE.Box3().setFromObject(sujeto);
            const alturaReal = caja.getSize(new THREE.Vector3()).y;
            if (alturaReal > 0) factor = alturaReal / alturaCanon;
        }
        this.faceAnchor = {
            pos: [pos[0] * factor, pos[1] * factor, pos[2] * factor],
            size: size * factor,
            canon: alturaCanon,
            factor,
        };
        return this.faceAnchor;
    }

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

        let faceScale, faceX, faceY, faceZ;
        if (this.faceAnchor) {
            // Ancla explícita (setFaceAnchor): ya viene escalada al modelo real.
            // Y se mide desde los PIES (box.min.y = factor·0 del canónico); X/Z se
            // miden desde el centro de la caja, que es el origen que usa el propio
            // registro de anclas (casi todos los arquetipos llevan x:0 = centrado).
            const a = this.faceAnchor;
            faceScale = Math.max(0.05, a.size) * this.liveConfig.faceScaleMod;
            faceX = center.x + a.pos[0] + this.liveConfig.offsetX;
            faceY = box.min.y + a.pos[1] + this.liveConfig.offsetY;
            faceZ = center.z + a.pos[2] + this.liveConfig.offsetZ;
        } else {
            // Sin ancla: la heurística de siempre, estimada desde la caja del grupo.
            faceScale = Math.max(0.2, size.x * 0.4) * this.liveConfig.faceScaleMod;
            faceY = box.max.y - (size.y * 0.15) + this.liveConfig.offsetY;
            faceZ = box.max.z + 0.02 + this.liveConfig.offsetZ;
            faceX = center.x + this.liveConfig.offsetX;
        }

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

    /**
     * Pide una expresión de las 8 del léxico. Sencillo y legible a 64×64 es mejor
     * que detallado: dos ojos, una boca y el símbolo anime del léxico
     * (note/tear/vein/bang/dots/tears/sweat, o ninguno en `neutral`).
     *
     * ⚠️ UN NOMBRE QUE NO EXISTE AVISA Y CAE A 'neutral' — NO REVIENTA LA ESCENA.
     * `window.__direct` (los labs) llama esto desde un beat narrativo que puede
     * traer cualquier string; si revienta ahí, se cae la demo entera por una
     * palabra mal escrita en un guión.
     */
    setExpression(nombre) {
        let elegido = nombre;
        if (!AvatarCalibrationTool.EXPRESIONES[elegido]) {
            console.warn(`⚠️ AvatarCalibrationTool.setExpression: expresión desconocida "${nombre}", uso 'neutral'`);
            elegido = 'neutral';
        }
        this.currentExpression = elegido;
        // Pedir una expresión corta el parpadeo en curso: si no, un blink a medio
        // camino se queda pintado encima de la cara nueva.
        this.faceIsBlinking = false;
        this.faceBlinkTimer = 0;
        this.drawFaceFrame(false);
        return this.currentExpression;
    }

    drawFaceFrame(isBlinking) {
        if (!this.faceCtx) return;
        const ctx = this.faceCtx;
        const cfg = AvatarCalibrationTool.EXPRESIONES[this.currentExpression] || AvatarCalibrationTool.EXPRESIONES.neutral;
        ctx.clearRect(0, 0, 64, 64);

        ctx.fillStyle = '#00ffff';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';

        // OJOS — el parpadeo manda sobre cualquier expresión (una franja fina),
        // igual que en el dibujo original; 'surprised' los abre más de lo normal.
        if (isBlinking) {
            ctx.fillRect(12, 32, 16, 4);
            ctx.fillRect(36, 32, 16, 4);
        } else if (cfg.ojosGrandes) {
            ctx.fillRect(9, 15, 20, 22);
            ctx.fillRect(35, 15, 20, 22);
        } else {
            ctx.fillRect(12, 20, 16, 16);
            ctx.fillRect(36, 20, 16, 16);
        }

        // BOCA — un trazo distinto por expresión; a 64×64 no cabe más forma.
        ctx.shadowBlur = 6;
        ctx.beginPath();
        switch (cfg.boca) {
            case 'sonrisa':   ctx.arc(32, 42, 14, 0.15 * Math.PI, 0.85 * Math.PI); break;
            case 'triste':    ctx.arc(32, 60, 14, 1.15 * Math.PI, 1.85 * Math.PI); break;
            case 'apretada':  ctx.moveTo(18, 50); ctx.lineTo(46, 50); break;
            case 'o':         ctx.arc(32, 50, 7, 0, Math.PI * 2); break;
            case 'ladeada':   ctx.moveTo(18, 47); ctx.lineTo(46, 53); break;
            case 'ondulada':
                ctx.moveTo(16, 50);
                ctx.quadraticCurveTo(24, 44, 32, 50);
                ctx.quadraticCurveTo(40, 56, 48, 50);
                break;
            default: ctx.moveTo(18, 50); ctx.lineTo(46, 50); // recta — neutral
        }
        ctx.stroke();

        // SÍMBOLO — el icono anime del léxico, arriba-derecha para no pisar la cara.
        this._dibujarSimbolo(cfg.symbol);

        if (this.faceTexture) this.faceTexture.needsUpdate = true;
    }

    /** El símbolo de estado de ánimo que trae cada expresión en face_lexicon.json. */
    _dibujarSimbolo(symbol) {
        if (!symbol) return; // 'neutral' no lleva símbolo — es a propósito, no un olvido
        const ctx = this.faceCtx;
        ctx.save();
        ctx.lineWidth = 3;
        switch (symbol) {
            case 'note': // corchea — alegría
                ctx.fillStyle = ctx.shadowColor = '#ffe066';
                ctx.beginPath(); ctx.ellipse(50, 15, 4, 3, -0.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(53, 4, 2, 11);
                break;
            case 'tear': // una lágrima — tristeza
                ctx.fillStyle = ctx.shadowColor = '#7ec8ff';
                ctx.beginPath(); ctx.moveTo(16, 30); ctx.quadraticCurveTo(21, 39, 16, 42); ctx.quadraticCurveTo(11, 39, 16, 30); ctx.fill();
                break;
            case 'tears': // dos lágrimas — llanto abierto
                ctx.fillStyle = ctx.shadowColor = '#7ec8ff';
                for (const x of [16, 48]) {
                    ctx.beginPath(); ctx.moveTo(x, 30); ctx.quadraticCurveTo(x + 5, 41, x, 45); ctx.quadraticCurveTo(x - 5, 41, x, 30); ctx.fill();
                }
                break;
            case 'vein': // marca de enfado — ceja fruncida en zigzag
                ctx.strokeStyle = ctx.shadowColor = '#ff4d4d';
                ctx.beginPath(); ctx.moveTo(43, 5); ctx.lineTo(50, 12); ctx.lineTo(45, 15); ctx.lineTo(52, 22); ctx.stroke();
                break;
            case 'bang': // exclamación — sorpresa
                ctx.fillStyle = ctx.shadowColor = '#ffe066';
                ctx.fillRect(50, 3, 4, 13); ctx.fillRect(50, 19, 4, 4);
                break;
            case 'dots': // puntos suspensivos — deliberación
                ctx.fillStyle = ctx.shadowColor = '#ffffff';
                for (const x of [43, 50, 57]) { ctx.beginPath(); ctx.arc(x, 9, 2, 0, Math.PI * 2); ctx.fill(); }
                break;
            case 'sweat': // gota de sudor — nervios/culpa; arriba, no cae del ojo (eso es 'tear')
                ctx.fillStyle = ctx.shadowColor = '#a3e0ff';
                ctx.beginPath(); ctx.moveTo(50, 3); ctx.quadraticCurveTo(56, 12, 50, 17); ctx.quadraticCurveTo(44, 12, 50, 3); ctx.fill();
                break;
        }
        ctx.restore();
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
