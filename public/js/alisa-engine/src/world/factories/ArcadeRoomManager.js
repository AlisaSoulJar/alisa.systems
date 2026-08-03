import * as THREE from 'three';
import { AssetManager } from '../../soma/AssetManager.js';

/**
 * 🏭 ARCADE ROOM MANAGER
 * --------------------------------------------------------------------------
 * MMO-Ready multi-cabinet room manager. Loads N cabinets from a config array,
 * each with its own position, rotation, GLB model, and assigned game.
 * 
 * The manager exposes entity-level state (who's sitting where, which game)
 * independently from the player's local interaction (hologram, FX).
 * 
 * Designed for future WebSocket sync: each cabinet's state is serializable.
 * 
 * Usage:
 *   const room = new ArcadeRoomManager(scene, renderCore);
 *   room.setLighting('neon');
 *   await room.loadCabinets(cabinetConfigs);
 *   room.getActiveCabinet(clickedGroup);
 */
export class ArcadeRoomManager {
    /**
     * @param {THREE.Scene} scene
     * @param {Object} renderCore
     * @param {Object} [options]
     * @param {boolean} [options.sync=false] conectar al hub multijugador de la
     *   colonia (`/overworld/sync`). APAGADO por defecto: antes se conectaba
     *   solo al instanciar, y en una página sin hub dejaba un bucle infinito de
     *   reconexión cada 5 s. El motor tiene que poder correr suelto.
     * @param {string} [options.syncUrl] endpoint propio, si no quieres el de la colonia.
     */
    constructor(scene, renderCore, options = {}) {
        this.scene = scene;
        this.renderCore = renderCore;
        this.syncUrl = options.syncUrl ?? null;
        this._syncStopped = false;
        this._syncRetries = 0;

        /** @type {ArcadeCabinetEntity[]} */
        this.cabinets = [];
        if (options.sync) this._initMMOSync();

        // ── Shared Environment ──
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.8);
        this.scene.add(this.hemiLight);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
    }

    _initMMOSync() {
        if (this._syncStopped) return;
        try {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = this.syncUrl ?? `${proto}//${window.location.host}/overworld/sync`;
            this.ws = new WebSocket(url);
            this.ws.onopen = () => { this._syncRetries = 0; };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'sync') {
                    // Initial sync
                    for (const [termId, player] of Object.entries(data.state)) {
                        const cab = this.cabinets.find(c => c.id === termId);
                        if (cab) cab.occupiedBy = player;
                    }
                } else if (data.type === 'state_update') {
                    // Update specific node
                    const cab = this.cabinets.find(c => c.id === data.terminal_id);
                    if (cab) cab.occupiedBy = data.player;
                    
                    // Update visual HUD if hovering over it
                    const hud = document.getElementById('game-status');
                    if (hud && window._activeHoverCab && window._activeHoverCab === cab) {
                        hud.innerHTML = cab.occupiedBy ? `<span style="color:red">Occupied by ${cab.occupiedBy}</span>` : `Ready to connect: <b>${cab.gameName}</b>`;
                    }
                }
            };
            this.ws.onclose = () => {
                if (this._syncStopped) return;
                // Reintentos ACOTADOS con espera creciente. Antes reintentaba
                // cada 5 s eternamente aunque no hubiera hub al otro lado.
                if (++this._syncRetries > 5) {
                    console.warn('[MMOSync] Sin hub tras 5 intentos — modo offline. Llama a connectSync() para reintentar.');
                    return;
                }
                const wait = Math.min(30000, 2000 * 2 ** (this._syncRetries - 1));
                console.warn(`[MMOSync] Desconectado del Overworld Hub. Reintento ${this._syncRetries}/5 en ${wait / 1000}s.`);
                this._syncTimer = setTimeout(() => this._initMMOSync(), wait);
            };
        } catch (e) {
            console.warn("[MMOSync] Offline Mode active.");
        }
    }

    /** Conecta (o reconecta) el sync multijugador a mano. */
    connectSync() { this._syncStopped = false; this._syncRetries = 0; this._initMMOSync(); }

    /** Corta el sync y sus reintentos. Llámalo al desmontar la sala. */
    disconnectSync() {
        this._syncStopped = true;
        clearTimeout(this._syncTimer);
        try { this.ws?.close(); } catch { /* ya cerrado */ }
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * ASÍNCRONA: los muebles arcade son GLBs.
     *     await room.buildAll({ lighting: 'neon', cabinets: [{ id, glb, position, rotation, gameUrl, gameName }] });
     *
     * Sin `cabinets` monta la sala vacía (suelo + luz): qué máquinas hay lo
     * decide la app, no el motor.
     */
    async buildAll(c = {}) {
        if (c.lighting && this.setLighting) this.setLighting(c.lighting);
        await this.loadCabinets(c.cabinets ?? []);
        return { cabinets: this.cabinets, floor: this.floor };
    }

    /** Libera el sync; la geometría la gestiona la escena. */
    dispose() { this.disconnectSync(); }

    // ═══════════════════════════════════════════════════
    //  LIGHTING THEMES (shared, same as single-player)
    // ═══════════════════════════════════════════════════
    setLighting(mode) {
        if (mode === 'day') {
            this.hemiLight.color.setHex(0xffffff);
            this.hemiLight.groundColor.setHex(0xaaaaaa);
            this.hemiLight.intensity = 1.0;
            this.scene.background = new THREE.Color(0xffffff);
            this.floor.material.color.setHex(0xcccccc);
            this.cabinets.forEach(c => c.screenLight.intensity = 0);
        } else if (mode === 'night') {
            this.hemiLight.color.setHex(0xffffff);
            this.hemiLight.groundColor.setHex(0x444455);
            this.hemiLight.intensity = 0.1;
            this.scene.background = new THREE.Color(0x020205);
            this.floor.material.color.setHex(0x111122);
            this.cabinets.forEach(c => { c.screenLight.color.setHex(0x66ccff); c.screenLight.intensity = 15; });
        } else if (mode === 'neon') {
            this.hemiLight.color.setHex(0xff00ff);
            this.hemiLight.groundColor.setHex(0x00ffff);
            this.hemiLight.intensity = 0.6;
            this.scene.background = new THREE.Color(0x0a001a);
            this.floor.material.color.setHex(0x050010);
            this.cabinets.forEach(c => { c.screenLight.color.setHex(0xff00cc); c.screenLight.intensity = 25; });
        }
    }

    // ═══════════════════════════════════════════════════
    //  MULTI-CABINET LOADER
    // ═══════════════════════════════════════════════════
    /**
     * @param {Array<{id: string, glb: string, position: number[], rotation: number, gameUrl: string, gameName: string}>} configs
     */
    async loadCabinets(configs = []) {
        if (!Array.isArray(configs)) {
            console.error('[ArcadeRoomManager] loadCabinets espera un array de configs; recibido:', configs);
            return;
        }
        const promises = configs.map(cfg => this._loadSingleCabinet(cfg));
        await Promise.all(promises);
        console.log(`ArcadeRoomManager: ${this.cabinets.length} cabinets loaded.`);
    }

    _loadSingleCabinet(cfg) {
        return new Promise((resolve, reject) => {
            AssetManager.loadModelAsync(cfg.glb).then((scene) => {
                // We must clone it because the same GLB might be used multiple times
                const mesh = scene.clone();

                // Normalize to target height (default 1.8m for arcades, smaller for monitors)
                const targetHeight = cfg.height || 1.8;
                const bbox = new THREE.Box3().setFromObject(mesh);
                const size = bbox.getSize(new THREE.Vector3());
                const scaleF = targetHeight / (size.y || 1);
                mesh.scale.set(scaleF, scaleF, scaleF);

                // Position: optional surface elevation (e.g. desk at 0.8m)
                const surfaceY = cfg.surfaceY || 0;
                const adjustedBbox = new THREE.Box3().setFromObject(mesh);
                mesh.position.set(cfg.position[0], surfaceY - adjustedBbox.min.y, cfg.position[2]);

                // Auto-face the screen toward the room's focal point (player spawn)
                const baseOffset = cfg.baseRotation !== undefined ? cfg.baseRotation : -Math.PI / 2;
                const focalPoint = cfg.faceToward || [0, 0, 5];
                const dx = focalPoint[0] - cfg.position[0];
                const dz = focalPoint[2] - cfg.position[2];
                const faceAngle = Math.atan2(dx, dz) + baseOffset;
                mesh.rotation.y = faceAngle;

                // ── 3-Tier Screen Detection ──
                // Enable shadows on all meshes first
                mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Detect screen: Priority 1 (named) → Priority 2 (geometry) → Priority 3 (synthetic)
                let screenMesh = this._detectScreenMesh(mesh, cfg);

                // Priority 3 Fallback: Synthetic screen from bounding box
                if (!screenMesh && cfg.autoScreen !== false) {
                    screenMesh = this._createSyntheticScreen(mesh, cfg);
                }

                // Per-entity screen glow light
                const screenLight = new THREE.PointLight(0x000000, 0, 8);
                if (screenMesh) {
                    const screenBox = new THREE.Box3().setFromObject(screenMesh);
                    const center = new THREE.Vector3();
                    screenBox.getCenter(center);
                    screenLight.position.copy(center);
                    screenLight.position.z += 0.4;
                    screenLight.position.y += 0.3;
                }
                this.scene.add(screenLight);

                // Group for raycasting
                const group = new THREE.Group();
                group.add(mesh);
                this.scene.add(group);

                // Create entity
                const entity = {
                    id: cfg.id,
                    group: group,
                    mesh: mesh,
                    screenMesh: screenMesh,
                    screenLight: screenLight,
                    rotation: faceAngle,
                    cssRotation: faceAngle + (cfg.cssRotationOffset !== undefined ? cfg.cssRotationOffset : 0),
                    focalPoint: focalPoint,
                    cabPosition: [cfg.position[0], 0, cfg.position[2]],
                    gameUrl: cfg.gameUrl || null,
                    gameName: cfg.gameName || 'Unknown',
                    occupiedBy: null,  // MMO: playerId who is sitting here
                    // Camera positioning params (from config)
                    sitDistance: cfg.sitDistance || 1.8,
                    eyeHeight: cfg.eyeHeight || 1.35,
                    surfaceY: cfg.surfaceY || 0,
                    modelHeight: targetHeight
                };

                this.cabinets.push(entity);
                resolve(entity);
            }).catch(reject);
        });
    }

    // ═══════════════════════════════════════════════════
    //  SCREEN DETECTION ENGINE (3-Tier)
    // ═══════════════════════════════════════════════════

    /**
     * Priority 1: Named mesh from config (artist convention)
     * Priority 2: Auto-detect flattest quad with screen-like aspect ratio
     * @returns {THREE.Mesh|null} The detected screen mesh, or null for synthetic fallback
     */
    _detectScreenMesh(rootMesh, cfg) {
        // ── Priority 1: Explicit named mesh ──
        const screenName = cfg.screenMeshName || 'GameScreen_Plane';
        let namedMesh = null;
        rootMesh.traverse(child => {
            if (child.isMesh && child.name === screenName) namedMesh = child;
        });
        if (namedMesh) {
            console.log(`[ScreenDetect] ${cfg.id}: P1 Named → "${namedMesh.name}"`);
            return namedMesh;
        }

        // ── Priority 2: Geometry-based flat quad detection ──
        // Temporarily strip rotation to measure in local space
        const savedRot = rootMesh.rotation.y;
        rootMesh.rotation.y = 0;
        rootMesh.updateMatrixWorld(true);

        const candidates = [];
        rootMesh.traverse(child => {
            if (!child.isMesh) return;
            // Skip the root scene itself
            if (child === rootMesh) return;

            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // Sort dimensions: thinnest, middle, widest
            const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
            const thinnest = dims[0];
            const h = dims[1];
            const w = dims[2];
            const aspectRatio = w / (h || 0.001);
            const vCount = child.geometry.attributes.position?.count || Infinity;

            // A screen is: very thin on one axis, aspect ratio 1.0–2.2 (square to ultrawide)
            if (thinnest < 0.05 && aspectRatio >= 0.8 && aspectRatio <= 2.5 && w > 0.05) {
                candidates.push({
                    mesh: child,
                    flatness: thinnest,
                    vertices: vCount,
                    aspect: aspectRatio,
                    area: w * h,
                    center: center.clone(),
                    width: w,
                    height: h
                });
            }
        });

        // Restore rotation
        rootMesh.rotation.y = savedRot;
        rootMesh.updateMatrixWorld(true);

        if (candidates.length > 0) {
            // Sort: flattest → fewest vertices → largest area
            candidates.sort((a, b) => {
                const flatDiff = a.flatness - b.flatness;
                if (Math.abs(flatDiff) > 0.005) return flatDiff;
                const vertDiff = a.vertices - b.vertices;
                if (vertDiff !== 0) return vertDiff;
                return b.area - a.area;
            });

            const winner = candidates[0];
            console.log(`[ScreenDetect] ${cfg.id}: P2 AutoDetect → "${winner.mesh.name}" ` +
                `(${winner.vertices}v, flat=${winner.flatness.toFixed(4)}, ` +
                `ratio=${winner.aspect.toFixed(2)}, area=${winner.area.toFixed(4)})`);
            return winner.mesh;
        }

        console.log(`[ScreenDetect] ${cfg.id}: P1+P2 failed → falling back to P3 Synthetic`);
        return null;
    }

    /**
     * Priority 3: Create a synthetic invisible screen from the model's bounding box.
     * Used when the model has no identifiable flat screen sub-mesh.
     */
    _createSyntheticScreen(rootMesh, cfg) {
        const savedRot = rootMesh.rotation.y;
        rootMesh.rotation.y = 0;
        rootMesh.updateMatrixWorld(true);

        const localBox = new THREE.Box3().setFromObject(rootMesh);
        const localSize = localBox.getSize(new THREE.Vector3());
        const localCenter = localBox.getCenter(new THREE.Vector3());

        rootMesh.rotation.y = savedRot;
        rootMesh.updateMatrixWorld(true);

        // Screen dimensions: proportional to model
        const screenW = localSize.x * 0.7;
        const screenH = localSize.y * 0.5;
        const syntheticGeo = new THREE.PlaneGeometry(screenW, screenH);
        const syntheticMat = new THREE.MeshBasicMaterial({ visible: false });
        const screenMesh = new THREE.Mesh(syntheticGeo, syntheticMat);
        screenMesh.name = 'SyntheticScreen';

        // Position: center X, upper-center Y, front Z face
        screenMesh.position.set(
            localCenter.x - rootMesh.position.x,
            localCenter.y - rootMesh.position.y + localSize.y * 0.1,
            localBox.max.z - rootMesh.position.z + 0.02
        );

        // Add as child → inherits rotation
        rootMesh.add(screenMesh);
        console.log(`[ScreenDetect] ${cfg.id}: P3 Synthetic → ${screenW.toFixed(3)}×${screenH.toFixed(3)}`);
        return screenMesh;
    }

    // ═══════════════════════════════════════════════════
    //  ENTITY QUERIES (used by raycaster & network)
    // ═══════════════════════════════════════════════════

    /**
     * Given a raycast hit, find which cabinet entity was clicked.
     * @returns {object|null} The cabinet entity or null
     */
    getCabinetFromIntersect(intersectedObject) {
        for (const cab of this.cabinets) {
            let found = false;
            cab.group.traverse(child => {
                if (child === intersectedObject) found = true;
            });
            if (found) return cab;
        }
        return null;
    }

    /**
     * Get all cabinet groups as an array for batch raycasting.
     */
    getAllGroups() {
        return this.cabinets.map(c => c.group);
    }

    /**
     * Get available (non-occupied) cabinets.
     * MMO-ready: filters out cabinets occupied by other players.
     */
    getAvailableCabinets() {
        return this.cabinets.filter(c => c.occupiedBy === null);
    }

    /**
     * Serializable state for network sync.
     */
    serializeState() {
        return this.cabinets.map(c => ({
            id: c.id,
            occupiedBy: c.occupiedBy,
            gameUrl: c.gameUrl
        }));
    }

    /**
     * Apply state from network.
     */
    applyNetworkState(stateArray) {
        for (const s of stateArray) {
            const cab = this.cabinets.find(c => c.id === s.id);
            if (cab) {
                cab.occupiedBy = s.occupiedBy;
                cab.gameUrl = s.gameUrl;
            }
        }
    }
}
