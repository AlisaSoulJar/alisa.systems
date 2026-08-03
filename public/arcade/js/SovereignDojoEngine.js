/**
 * SovereignDojoEngine.js
 * Extracted, purely data-driven procedural visualizer for RL GridWorlds.
 * Mirrors the architecture of SovereignCardEngine but for the Dojo Simulation Layer.
 */

class SovereignDojoEngine {
    constructor(scene, libraryData = null) {
        this.scene = scene;
        this.library = libraryData;
        this.activeSchema = null;
        this.envId = null;
        
        // Asset cache for the Hybrid Rendering Pattern
        this.cachedMaterials = {};
        this._spriteImages = {};

        // THREE.js Groups
        this.boardGroup = new THREE.Group();
        this.scene.add(this.boardGroup);
        
        this.entityMeshes = {}; // Tracks dynamic entities for tweening
        this.gridW = 0;
        this.gridH = 0;
    }

    loadEnvironment(envId) {
        if (!this.library || !this.library.environments[envId]) {
            console.error(`[DOJO] Environment schema '${envId}' not found.`);
            return false;
        }
        this.envId = envId;
        this.activeSchema = this.library.environments[envId];
        
        // Trigger preload of defined hybrid assets
        this._preloadAssets();
        
        // Clear board
        while(this.boardGroup.children.length > 0){ 
            this.boardGroup.remove(this.boardGroup.children[0]); 
        }
        this.entityMeshes = {};
        console.log(`[DOJO] Mounted Environment: ${this.activeSchema.name}`);
        return true;
    }

    _preloadAssets() {
        const basePath = '../assets/dojo';
        for (const [id, entity] of Object.entries(this.activeSchema.entities)) {
            if (entity.asset) {
                const img = new Image();
                img.onload = () => {
                    this._spriteImages[entity.asset] = img;
                    delete this.cachedMaterials[id]; // Invlidate procedural fallback
                    console.log(`[DOJO] Asset loaded: ${entity.asset}`);
                };
                img.onerror = () => {}; // Procedural fallback
                img.src = `${basePath}/${entity.asset}`;
            }
        }
    }

    // Mathematical coordinate mapping (matches standard matrix [r][c])
    _coordToPhys(x, y) {
        // x: 0 to W-1 (columns)
        // y: 0 to H-1 (rows)
        const pX = x - (this.gridW / 2) + 0.5;
        const pZ = -y + (this.gridH / 2) - 0.5;
        return { x: pX, y: 0.5, z: pZ };
    }

    _getMaterial(entitySchema, entityId) {
        if (this.cachedMaterials[entityId]) return this.cachedMaterials[entityId];

        // 1. Check for Hybrid Image Asset WebP
        if (entitySchema.asset && this._spriteImages[entitySchema.asset]) {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this._spriteImages[entitySchema.asset], 0, 0, 256, 256);
            
            const tex = new THREE.CanvasTexture(canvas);
            tex.anisotropy = 16;
            const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, transparent: true });
            this.cachedMaterials[entityId] = mat;
            return mat;
        }

        // 2. Procedural Fallback depending on schema type
        let mat;
        if (entitySchema.type === 'background') {
            mat = new THREE.MeshStandardMaterial({ color: parseInt(entitySchema.color.replace('#','0x')), roughness: 0.9 });
        } else if (entitySchema.type === 'agent') {
            mat = new THREE.MeshStandardMaterial({ color: parseInt(entitySchema.color.replace('#','0x')), roughness: 0.2, emissive: parseInt(entitySchema.color.replace('#','0x')), emissiveIntensity: 0.4 });
        } else {
            mat = new THREE.MeshStandardMaterial({ color: parseInt(entitySchema.color.replace('#','0x')), roughness: 0.5 });
        }
        
        this.cachedMaterials[entityId] = mat;
        return mat;
    }

    _createMesh(entitySchema, entityId) {
        const mat = this._getMaterial(entitySchema, entityId);
        let geo;
        if (entitySchema.geometry === 'plane') geo = new THREE.BoxGeometry(1, 0.2, 1);
        else if (entitySchema.geometry === 'sphere') geo = new THREE.SphereGeometry(0.4, 16, 16);
        else if (entitySchema.geometry === 'sphere_small') geo = new THREE.SphereGeometry(0.15, 8, 8);
        else if (entitySchema.geometry === 'cylinder') geo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16);
        else geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); // Generic box

        const mesh = new THREE.Mesh(geo, mat);
        if (entitySchema.type === 'background') {
            mesh.position.y = -0.1;
            mesh.receiveShadow = true;
        } else {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        return mesh;
    }

    /**
     * Render a pure 2D Matrix frame. 
     * Matrix dimensions: [rows][cols]
     */
    renderFrameMatrix(matrixFrame) {
        if (!this.activeSchema) return;

        this.gridH = matrixFrame.length;
        this.gridW = this.gridH > 0 ? matrixFrame[0].length : 0;

        // Active tracking for diffs and removals
        const touchedMeshes = new Set();
        
        // Background generation (if empty, fill with 0)
        // Usually backgrounds are static, but we'll rebuild them safely
        for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
                const val = matrixFrame[y][x];
                const entityIdStr = val.toString();
                const schema = this.activeSchema.entities[entityIdStr];
                
                if (!schema) continue;

                // Instance keying logic (for tweening vs replacing)
                // If it's the agent, we just have one.
                // For obstacles, we should probably do standard pooling or instance tracking.
                // For this pure matrix version, we will key by physical position for obstacles, 
                // but the strictly correct way is tracking entity IDs. Since the matrix doesn't have IDs,
                // we'll pool them.
                
                let meshKey = `${schema.type}_${x}_${y}`;
                if (schema.type === 'agent') meshKey = 'agent_primary'; // tweening target
                
                touchedMeshes.add(meshKey);

                const physPos = this._coordToPhys(x, y);

                if (!this.entityMeshes[meshKey]) {
                    const mesh = this._createMesh(schema, entityIdStr);
                    this.boardGroup.add(mesh);
                    this.entityMeshes[meshKey] = mesh;
                    
                    if (schema.type === 'background') {
                        mesh.position.set(physPos.x, -0.1, physPos.z);
                    } else if (schema.type === 'agent' && window.TWEEN) {
                        mesh.position.set(physPos.x, physPos.y, physPos.z);
                        // entrance pop animation
                        mesh.scale.set(0,0,0);
                        new TWEEN.Tween(mesh.scale).to({x:1,y:1,z:1}, 200).easing(TWEEN.Easing.Back.Out).start();
                    } else {
                        mesh.position.set(physPos.x, physPos.y, physPos.z);
                    }
                } else {
                    // Update existing
                    if (schema.type === 'agent' && window.TWEEN) {
                        new TWEEN.Tween(this.entityMeshes[meshKey].position)
                            .to({ x: physPos.x, z: physPos.z }, 100)
                            .easing(TWEEN.Easing.Quadratic.Out)
                            .start();
                    } else {
                        this.entityMeshes[meshKey].position.set(physPos.x, physPos.y, physPos.z);
                    }
                }
            }
        }

        // Cleanup meshes that are no longer in the matrix (except backgrounds unless they changed)
        for (const [key, mesh] of Object.entries(this.entityMeshes)) {
            if (!touchedMeshes.has(key) && !key.startsWith('background_')) {
                this.boardGroup.remove(mesh);
                delete this.entityMeshes[key];
            }
        }
    }
}

// Export if module
if (typeof module !== 'undefined') {
    module.exports = { SovereignDojoEngine };
}
