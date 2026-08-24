import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class SovereignAvatarSystem {
    /**
     * Initializes the Sovereign Avatar System module within the AlisaRenderCore.
     * @param {AlisaRenderCore} app - The core rendering context.
     * @param {Object} options - Configuration object.
     * @param {() => number} [options.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible spawn
     *        positions, waypoint jitter and systemic-event scatter.
     */
    constructor(app, options = {}) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        this.clock = app.clock;
        this.rng = options.rng || (() => Math.random());

        this.activeAvatars = {};
        this.systemicEvents = [];

        this.basePath = options.basePath || '../props/models/';
        this.loader = new GLTFLoader();
        this.vrmModuleLoaded = false;
        
        this.beingRegistry = {
            "Default": { color: 0xaaaaaa, model: "Blocks Humanoid.glb", scale: 3.0, role: "Worker", methods: ["walk", "idle"] }
        };
        
        this._fetchRegistryFromHub();
        
        this._initCSS2D();
        this._initAudio();
        this._initStateStream();
    }
    
    _initCSS2D() {
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.zIndex = '50';
        document.body.appendChild(this.labelRenderer.domElement);
        
        window.addEventListener('resize', () => {
            if (this.labelRenderer) {
                this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        const styleId = 'sov-avatar-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .avatar-hud {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    pointer-events: auto;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    transform-origin: bottom center;
                    transform: translateY(-20px);
                }
                .avatar-hud.idle {
                    opacity: 0.6;
                    transform: translateY(-10px) scale(0.9);
                }
                .hud-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(0,0,0,0.7);
                    padding: 4px 12px;
                    border-radius: 20px;
                    border: 1px solid var(--being-color);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    z-index: 2;
                }
                .hud-name {
                    font-size: 13px;
                    color: var(--being-color);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    font-weight: bold;
                    font-family: monospace;
                    text-shadow: 0 0 5px var(--being-color);
                }
                .hud-emoji {
                    font-size: 16px;
                }
                .comic-bubble {
                    background: #ffffff;
                    color: #000000;
                    border: 3px solid var(--being-color);
                    border-radius: 15px;
                    padding: 10px 15px;
                    font-family: 'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif;
                    font-weight: bold;
                    font-size: 14px;
                    max-width: 250px;
                    text-align: center;
                    box-shadow: 4px 4px 0px rgba(0,0,0,0.3);
                    position: relative;
                    margin-top: 10px;
                    z-index: 1;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                .comic-bubble::before {
                    content: '';
                    position: absolute;
                    top: -14px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 0 10px 14px;
                    border-style: solid;
                    border-color: transparent transparent var(--being-color) transparent;
                    display: block;
                    width: 0;
                }
                .comic-text { font-size: 15px; line-height: 1.3; }
                .comic-info { display: none; background: rgba(0,0,0,0.85); color: #fff; margin-top: 10px; font-size: 11px; font-family: monospace; border: 1px solid #555; border-radius: 8px; padding: 10px; text-align: left; font-weight: normal; max-width: 250px; }
                .avatar-hud.expanded .comic-info { display: block; }
            `;
            document.head.appendChild(style);
        }
    }
    
    _initAudio() {
        this.playBeep = (freq, waveType, duration) => {
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if(!window._alisa_audio_ctx) window._alisa_audio_ctx = new Ctx();
                const ctx = window._alisa_audio_ctx;
                if(ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = waveType;
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch(e) {}
        };
    }
    
    _initStateStream() {
        try {
            this.stateWs = new WebSocket("ws://127.0.0.1:8741/state/stream");
            this.stateWs.onopen = () => {
                console.log("[SovereignAvatarSystem] Bidirectional State Stream Connected.");
                // Start broadcasting frontend positions back to backend
                this._startPositionBroadcast();
            };
            this.stateWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onDebugReceive) this.onDebugReceive(data);
                    if (data.type === "sovereign_nexus_state") {
                        this._processStatePayload(data);
                    }
                } catch (e) { }
            };
            this.stateWs.onclose = () => {
                this._stopPositionBroadcast();
                setTimeout(() => this._initStateStream(), 5000);
            };
        } catch (e) {
            console.warn("[SovereignAvatarSystem] State WebSocket failed to initialize", e);
        }
    }
    
    _startPositionBroadcast() {
        this._posInterval = setInterval(() => {
            if (this.stateWs.readyState !== WebSocket.OPEN) return;
            
            const posPayload = {
                type: "avatar_positions",
                timestamp: Date.now(),
                avatars: {}
            };
            
            for (const [name, avatar] of Object.entries(this.activeAvatars)) {
                posPayload.avatars[name] = {
                    x: avatar.group.position.x,
                    y: avatar.group.position.y,
                    z: avatar.group.position.z,
                    rotation: avatar.group.rotation.y
                };
            }
            
            if (this.onDebugEmit) this.onDebugEmit(posPayload);
            this.stateWs.send(JSON.stringify(posPayload));
        }, 1000); // 1Hz heartbeat
    }
    
    _stopPositionBroadcast() {
        if (this._posInterval) clearInterval(this._posInterval);
    }

    _processStatePayload(payload) {
        for (const [beingName, state] of Object.entries(payload.beings)) {
            // Check if avatar is active in the scene
            if (!this.activeAvatars[beingName]) continue;
            
            const avatar = this.activeAvatars[beingName];
            
            // Map desires to waypoints/emojis
            if (state.active_desires && state.active_desires.length > 0) {
                const mainDesire = state.active_desires[0];
                const actionType = mainDesire.desire.toUpperCase();
                
                // Wake up the avatar
                avatar.lastActionTime = this.clock.getElapsedTime();
                avatar.wrapperDiv.classList.remove('idle');
                
                // Update Emoji based on soul state or desire
                if (state.soul_state === "flow") avatar.emojiSpan.innerText = "🌊";
                else if (state.soul_state === "frustrated") avatar.emojiSpan.innerText = "😤";
                else if (state.soul_state === "sleeping") avatar.emojiSpan.innerText = "💤";
                else avatar.emojiSpan.innerText = "⚡";
                
                // Update waypoint if desire changed (avoid continuous lookAt resets if same desire)
                if (avatar._lastDesire !== mainDesire.desire) {
                    const waypoint = this._getWaypointForEvent(actionType, "world", beingName);
                    // Add some variance so they don't all stand on the exact same spot
                    waypoint.x += (this.rng() - 0.5) * 2;
                    waypoint.z += (this.rng() - 0.5) * 2;
                    
                    avatar.targetPos.copy(waypoint);
                    avatar.group.lookAt(avatar.targetPos);
                    
                    // Show desire in comic bubble
                    avatar.textSpan.innerText = `[Desire] ${mainDesire.desire}`;
                    avatar.bubbleDiv.style.opacity = '1';
                    avatar.bubbleDiv.style.pointerEvents = 'auto';
                    avatar._lastDesire = mainDesire.desire;
                    
                    // Auto-hide after 8 seconds
                    setTimeout(() => {
                        if (avatar && avatar._lastDesire === mainDesire.desire) {
                            avatar.bubbleDiv.style.opacity = '0';
                            avatar.bubbleDiv.style.pointerEvents = 'none';
                        }
                    }, 8000);
                }
            } else {
                // If no active desires and not idle, maybe reset emoji
                if (avatar._lastDesire) {
                    avatar._lastDesire = null;
                }
            }
        }
    }
    
    async _fetchRegistryFromHub() {
        try {
            const res = await fetch("http://127.0.0.1:8741/avatars/catalog");
            if(res.ok) {
                const data = await res.json();
                console.log("[SovereignAvatarSystem] Successfully synced Avatar Catalog from SQLite DB.");
                // Merge data (keep generic Default if not sent)
                this.beingRegistry = { ...this.beingRegistry, ...data };
            }
        } catch (e) {
            console.warn("[SovereignAvatarSystem] Failed to fetch SQLite registry. Operating with defaults.", e);
        }
    }

    getBeingConfig(name) {
        let lower = name.toLowerCase();
        for(const key in this.beingRegistry) {
            if(lower.includes(key.toLowerCase())) return this.beingRegistry[key];
        }
        return this.beingRegistry["Default"];
    }

    /**
     * Process a SCUMM Scene Payload and dispatch to Avatar or Systemic handler.
     */
    processScene(scene) {
        const beingName = scene.data?.being || scene.data?.actor;
        if (beingName) {
            this._handleAvatarEvent(scene, beingName);
        } else {
            this._spawnSystemicEvent(scene);
        }
    }
    
    forceSpawn(beingName, position, role = "NPC") {
        if (this.activeAvatars[beingName]) return;
        
        let mockScene = { event_type: 'SYSTEM', narrative: `Assigned Role: ${role}`, domain: 'WORLD' };
        this._handleAvatarEvent(mockScene, beingName);
        
        // Immediately set their position to the fixed position
        const avatar = this.activeAvatars[beingName];
        if (avatar) {
            avatar.group.position.copy(position);
            avatar.targetPos.copy(position);
            avatar.wrapperDiv.classList.add('idle');
            avatar.emojiSpan.innerText = "💤";
        }
    }
    
    _buildComicBubble(beingName, colorHex, scene) {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'avatar-hud';
        wrapperDiv.style.setProperty('--being-color', '#' + colorHex.toString(16).padStart(6, '0'));

        const headerDiv = document.createElement('div');
        headerDiv.className = 'hud-header';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'hud-name';
        nameSpan.innerText = beingName;
        
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'hud-emoji';
        emojiSpan.innerText = "✨";
        
        headerDiv.appendChild(nameSpan);
        headerDiv.appendChild(emojiSpan);
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'comic-bubble';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'comic-text';
        
        bubbleDiv.appendChild(textSpan);
        
        const infoPanel = document.createElement('div');
        infoPanel.className = 'comic-info';
        
        wrapperDiv.appendChild(headerDiv);
        wrapperDiv.appendChild(bubbleDiv);
        wrapperDiv.appendChild(infoPanel);

        wrapperDiv.addEventListener('pointerdown', () => {
            wrapperDiv.classList.toggle('expanded');
        });

        const labelObj = new CSS2DObject(wrapperDiv);
        return { labelObj, wrapperDiv, emojiSpan, bubbleDiv, textSpan, infoPanel };
    }

    _getEmojiForEvent(eventType, domain) {
        if (!eventType) return "✨";
        const t = String(eventType).toUpperCase();
        if (t.includes('JOB') || t.includes('WORK') || t.includes('BID')) return "🛠️";
        if (t.includes('BUY') || t.includes('SELL') || t.includes('TRANSFER')) return "💰";
        if (t.includes('THINK') || t.includes('REASON')) return "🧠";
        if (t.includes('WALK') || t.includes('MOVE') || t.includes('NAV')) return "🚶";
        if (t.includes('SOMA')) return "🧬";
        if (t.includes('PSYCHE') || t.includes('FEEL')) return "👁️";
        if (t.includes('ERROR')) return "⚠️";
        if (domain === 'NODO') return "🕹️";
        if (domain === 'world') return "🌍";
        return "⚡";
    }

    _getWaypointForEvent(eventType, domain, beingName) {
        const t = String(eventType).toUpperCase();
        
        // Specific Named Logic
        if (beingName === 'Zazu') {
            if (t.includes('JOB') || t.includes('CONTRACT') || t.includes('WORK')) return new THREE.Vector3(-5, 0, -4); // Fly to Heti
            return new THREE.Vector3(5, 0.82, -4); // Sit on JobBoard Desk
        }
        if (beingName === 'Heti') {
            return new THREE.Vector3(-5, 0, -4); // Stay at Reception
        }
        
        // Generic Workers
        if (t.includes('JOB') || t.includes('WORK') || t.includes('BID')) {
            return new THREE.Vector3(-5, 0, -4); // Go to Heti/Reception
        }
        if (t.includes('SOMA') || t.includes('PSYCHE')) {
            return new THREE.Vector3(5, 0, 4 * (this.rng() > 0.5 ? 1 : -1)); // SOMA Desk
        }
        if (domain === 'NODO') {
            return new THREE.Vector3(14, 0, (this.rng() - 0.5) * 10); // Arcades on East wall
        }
        if (t.includes('SPEAK')) {
            return new THREE.Vector3(0, 0, 0); // Center stage
        }
        // Idle/Wander Default = Waiting Room
        return new THREE.Vector3(-10, 0, (this.rng() - 0.5) * 6);
    }

    _createHolographicProp(domainHex) {
        const propGroup = new THREE.Group();
        const tabletGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
        const tabletMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 });
        const tablet = new THREE.Mesh(tabletGeo, tabletMat);
        
        const screenGeo = new THREE.PlaneGeometry(1.1, 0.7);
        const screenMat = new THREE.MeshBasicMaterial({ color: domainHex || 0xffcc00, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = 0.03;
        tablet.add(screen);
        
        propGroup.add(tablet);
        propGroup.scale.set(0, 0, 0); // Start hidden/small
        return propGroup;
    }

    _handleAvatarEvent(scene, beingName) {
        if (!this.activeAvatars[beingName]) {
            const config = this.getBeingConfig(beingName);
            const group = new THREE.Group();
            
            // Temporary Placeholder Box while GLB loads
            const boxGeo = new THREE.BoxGeometry(1, 2, 1);
            const boxMat = new THREE.MeshStandardMaterial({ color: config.color, wireframe: true });
            const placeholder = new THREE.Mesh(boxGeo, boxMat);
            placeholder.position.y = 1;
            group.add(placeholder);

            // Asynchronous Lazy Loading of Model (GLB or VRM)
            const loadModel = async () => {
                if (config.model.toLowerCase().endsWith('.vrm') && !this.vrmModuleLoaded) {
                    try {
                        const vrmModule = await import('@pixiv/three-vrm');
                        this.VRMUtils = vrmModule.VRMUtils;
                        this.loader.register((parser) => new vrmModule.VRMLLoaderPlugin(parser));
                        this.vrmModuleLoaded = true;
                        console.log("[SovereignAvatarSystem] Sovereign VRM Module dynamically loaded.");
                    } catch (err) {
                        console.error("[SovereignAvatarSystem] Failed to lazy load @pixiv/three-vrm.", err);
                    }
                }

                this.loader.load(this.basePath + config.model, (gltf) => {
                    let model = gltf.scene;
                    
                    // VRM Integration
                    const vrm = gltf.userData.vrm;
                    if (vrm && this.VRMUtils) {
                        this.VRMUtils.removeUnnecessaryVertices(gltf.scene);
                        this.VRMUtils.removeUnnecessaryJoints(gltf.scene);
                        vrm.scene.traverse((obj) => { obj.frustumCulled = false; });
                        model = vrm.scene;
                        if (this.activeAvatars[beingName]) {
                            this.activeAvatars[beingName].vrm = vrm;
                        } else {
                            setTimeout(() => { if (this.activeAvatars[beingName]) this.activeAvatars[beingName].vrm = vrm; }, 100);
                        }
                    }
                    
                    // Add outlines or standard materials if needed
                    model.traverse((child) => {
                        if (child.isMesh && !vrm) { // Don't mess with VRM MToon shaders
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                
                // Centering based on bounding box
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Normalize scale so they are roughy 1 unit tall, then multiply by config config.scale
                const maxDim = Math.max(size.x, size.y, size.z);
                const normalizedScale = (1.0 / maxDim) * config.scale;
                model.scale.setScalar(normalizedScale);
                
                // Position so bottom is at Y=0
                model.position.y = - (box.min.y * normalizedScale);
                
                group.remove(placeholder);
                group.add(model);
                
                // If the model has animations, store them
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    this.activeAvatars[beingName].mixer = mixer;
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }
            }, undefined, (error) => {
                console.warn(`[SovereignAvatarSystem] Model not found: ${config.model}. Using placeholder.`);
            });
            };
            loadModel();

            const { labelObj, wrapperDiv, emojiSpan, bubbleDiv, textSpan, infoPanel } = this._buildComicBubble(beingName, config.color, scene);
            labelObj.position.set(0, 3, 0); // Above the model
            group.add(labelObj);

            // Set initial spawn
            group.position.set((this.rng() - 0.5) * 8, 0, (this.rng() - 0.5) * 8);
            this.scene.add(group);
            
            this.activeAvatars[beingName] = {
                group: group,
                targetPos: group.position.clone(),
                lastActionTime: this.clock.getElapsedTime(),
                wrapperDiv: wrapperDiv,
                emojiSpan: emojiSpan,
                bubbleDiv: bubbleDiv,
                textSpan: textSpan,
                infoPanel: infoPanel,
                config: config
            };
        }
        
        // Execute Action
        const avatar = this.activeAvatars[beingName];
        avatar.lastActionTime = this.clock.getElapsedTime();
        avatar.wrapperDiv.classList.remove('idle');
        
        if(scene.narrative) {
            let actionEmoji = this._getEmojiForEvent(scene.event_type, scene.domain);
            let isSpeaking = scene.event_type === 'SPEAK' || scene.narrative.includes('"');
            
            avatar.emojiSpan.innerText = actionEmoji;
            
            if (isSpeaking) {
                let text = scene.narrative;
                if(text.length > 80) text = text.substring(0, 80) + "...";
                avatar.textSpan.innerText = text;
                avatar.bubbleDiv.style.opacity = '1';
                avatar.bubbleDiv.style.pointerEvents = 'auto';
            } else {
                avatar.bubbleDiv.style.opacity = '0';
                avatar.bubbleDiv.style.pointerEvents = 'none';
            }
            
            avatar.infoPanel.innerHTML = `<strong>${scene.event_type || 'ACTION'}</strong><br>${scene.narrative}<br><br><small>Domain: ${scene.domain}<br>ID: ${scene.id || 'N/A'}</small>`;
        }
        
        // Semantic Navigation
        const newWaypoint = this._getWaypointForEvent(scene.event_type, scene.domain, beingName);
        avatar.targetPos.copy(newWaypoint);
        avatar.group.lookAt(avatar.targetPos);
        
        // Prop Management (Atrezzo)
        if (!avatar.prop) {
            const colorMap = { world: 0xffaa33, soma: 0xff3344, psyche: 0x4488ff, nodo: 0x44ff88 };
            const hue = colorMap[scene.domain] || avatar.config.color;
            avatar.prop = this._createHolographicProp(hue);
            // Positioned floating in front of them
            avatar.prop.position.set(0, 1.2, 1.0);
            avatar.prop.rotation.x = -Math.PI / 6; // tilted up towards face
            avatar.group.add(avatar.prop);
        }
        avatar.prop.visible = true;
        
        this.playBeep(220, "square", 0.3);
        if (this.app.camera.fov) {
            this.app.camera.fov -= 1;
            this.app.camera.updateProjectionMatrix();
        }
    }
    
    _spawnSystemicEvent(scene) {
        const colorMap = { world: 0xffaa33, soma: 0xff3344, psyche: 0x4488ff, nodo: 0x44ff88 };
        const colorHex = colorMap[scene.domain] || 0xffffff;
        
        let geometry;
        if(scene.event_type === "SOMA_TICK" || scene.event_type === "HORMONE_CHANGE") {
            geometry = new THREE.IcosahedronGeometry(0.5, 1);
            this.playBeep(120, "sine", 0.6);
        } else if(scene.event_type === "PSYCHE_CYCLE" || scene.event_type === "DREAM") {
            geometry = new THREE.OctahedronGeometry(0.6, 0);
            this.playBeep(880, "triangle", 0.8);
        } else {
            geometry = new THREE.SphereGeometry(0.4, 16, 16);
            this.playBeep(440, "sine", 0.2);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: colorHex, emissive: colorHex, emissiveIntensity: 0.6, transparent: true, opacity: 1.0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((this.rng() - 0.5) * 10, this.rng() * 2 + 1, (this.rng() - 0.5) * 10);
        this.scene.add(mesh);
        
        this.systemicEvents.push({ mesh: mesh, spawnTime: this.clock.getElapsedTime(), domain: scene.domain });
    }

    /**
     * Must be called inside the main application loop.
     * @param {Number} dt - Delta time
     */
    update(dt) {
        const now = this.clock.getElapsedTime();
        
        // Update Avatars
        for (const key in this.activeAvatars) {
            const avatar = this.activeAvatars[key];
            const age = now - avatar.lastActionTime;
            
            // Movement Kinematics
            avatar.group.position.lerp(avatar.targetPos, dt * 2.5);
            
            // Bobbing effect ONLY if they don't have skeletal animations
            if (avatar.vrm) {
                avatar.vrm.update(dt);
            } else if (!avatar.mixer) {
                if (age < 2.0) {
                    avatar.group.position.y = Math.sin(now * 15) * 0.1;
                } else {
                    avatar.group.position.y = THREE.MathUtils.lerp(avatar.group.position.y, 0, dt * 5.0);
                }
            } else {
                avatar.mixer.update(dt);
            }
            
            // Prop Animation
            if (avatar.prop) {
                if (age > 8.0) {
                    avatar.prop.scale.lerp(new THREE.Vector3(0, 0, 0), dt * 5);
                    if (avatar.prop.scale.length() < 0.1) avatar.prop.visible = false;
                } else {
                    avatar.prop.visible = true;
                    avatar.prop.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 8);
                    avatar.prop.position.y = 1.2 + Math.sin(now * 8) * 0.05;
                }
            }
            
            // Idleness
            if (age > 8.0 && !avatar.wrapperDiv.classList.contains('idle')) {
                avatar.wrapperDiv.classList.add('idle');
                avatar.bubbleDiv.style.opacity = '0';
                avatar.bubbleDiv.style.pointerEvents = 'none';
                avatar.emojiSpan.innerText = "💤";
            }
        }
        
        // Update Systemic Events
        for (let i = this.systemicEvents.length - 1; i >= 0; i--) {
            const node = this.systemicEvents[i];
            const age = now - node.spawnTime;
            
            node.mesh.position.y += dt;
            node.mesh.rotation.y += dt;
            node.mesh.rotation.x += dt * 0.5;
            
            if (age > 3) {
                node.mesh.material.opacity = 1.0 - (age - 3);
                if (node.mesh.material.opacity <= 0) {
                    this.scene.remove(node.mesh);
                    this.systemicEvents.splice(i, 1);
                }
            }
        }
        
        // Render Labels layer
        this.labelRenderer.render(this.scene, this.camera);
    }
}
