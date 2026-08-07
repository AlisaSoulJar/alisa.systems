// ATENCION: este import faltaba. El modulo usaba THREE. sin importarlo, o sea que
// dependia de que alguien hubiera dejado la global puesta con un <script> clasico:
// funcionaba EN SU PAGINA y en ninguna otra. Un modulo que solo funciona donde
// nacio no es un modulo. Lo destapo clasificar_piezas.mjs sobre las 179 piezas.
import * as THREE from 'three';

/**
 * [ALISA Overworld Frontend]
 * Polling loop and state management.
 */

// Usaba `AssetManager` como global, de cuando el motor eran scripts sueltos.
import { AssetManager } from '../../../soma/AssetManager.js';

const API_BASE = (window.location.protocol === 'file:' || window.location.port === '5500') ? 'http://localhost:8741' : '';

export const TerminalUIEngine = {
    pollingInterval: 1000,
    apiUrl: API_BASE + '/overworld/state',
    
    // Fractal Architecture: Navigation Stack
    domainStack: ["overworld"],
    
    get currentDomain() {
        return this.domainStack[this.domainStack.length - 1];
    },

    changeDomain: function(newDomain) {
        if (!newDomain) return;
        if (this.currentDomain === newDomain) return;
        
        // --- Cleanup previous domain visual systems ---
        if (typeof LightingEngine !== 'undefined') LightingEngine.destroy();
        if (typeof WeatherSystem !== 'undefined') WeatherSystem.destroy();
        if (typeof Renderer !== 'undefined') Renderer.clearWorld();
        
        this.domainStack.push(newDomain);
        
        // Reset FoW when entering a new domain (fresh darkness)
        if (typeof VisibilitySystem !== 'undefined') VisibilitySystem.resetExplored();
        
        // Re-initialize visual systems for the new domain
        if (typeof Renderer !== 'undefined') {
            if (typeof LightingEngine !== 'undefined') LightingEngine.init(Renderer.scene);
            if (typeof WeatherSystem !== 'undefined') WeatherSystem.init(Renderer.scene);
        }
        
        this.updateBreadcrumbUI();
        this.fetchState(); // Immediate refresh
    },

    ascendDomain: function() {
        if (this.domainStack.length > 1) {
            // Cleanup visual systems before ascending
            if (typeof LightingEngine !== 'undefined') LightingEngine.destroy();
            if (typeof WeatherSystem !== 'undefined') WeatherSystem.destroy();
            if (typeof Renderer !== 'undefined') Renderer.clearWorld();
            
            this.domainStack.pop();
            
            if (typeof VisibilitySystem !== 'undefined') VisibilitySystem.resetExplored();
            if (typeof Renderer !== 'undefined') {
                if (typeof LightingEngine !== 'undefined') LightingEngine.init(Renderer.scene);
                if (typeof WeatherSystem !== 'undefined') WeatherSystem.init(Renderer.scene);
            }
            
            this.updateBreadcrumbUI();
            this.fetchState();
        }
    },

    updateBreadcrumbUI: function() {
        const textLabel = document.getElementById('breadcrumb-text');
        const ascendBtn = document.getElementById('btn-ascend');
        if (textLabel) textLabel.innerText = "root." + this.domainStack.join('.');
        if (ascendBtn) ascendBtn.style.display = this.domainStack.length > 1 ? 'inline-block' : 'none';
        
        // Reset camera when returning to a map (or we could cache camera positions!)
        if (typeof Renderer !== 'undefined') {
            Renderer.cameraX = 0;
            Renderer.cameraY = 0;
            Renderer.lerpEntities = {}; // Clear interpolators to avoid ghost flying across maps
        }
    },

    targetEntityId: "Commander",

    // --- SCUMM Drama Log ---
    lastEventId: 0,
    maxDramaEntries: 60,

    start: function() {
        console.log("ALISA Overworld App Initialized");
        
        const btnAscend = document.getElementById('btn-ascend');
        if (btnAscend) {
            btnAscend.addEventListener('click', () => this.ascendDomain());
        }
        
        // Legacy inspector buttons (kept as fallback)
        const btnCloseInsp = document.getElementById('btn-close-insp');
        if (btnCloseInsp) btnCloseInsp.addEventListener('click', () => this.hideInspector());
        const btnFollow = document.getElementById('btn-follow');
        if (btnFollow) btnFollow.addEventListener('click', () => this.toggleCameraLock());
        
        // --- Init Entity Card System (Bestiario × Cyberpunk) ---
        if (typeof EntityCard !== 'undefined') {
            EntityCard.init();
            console.log('[MainApp] EntityCard system wired.');
        }
        
        // --- HUD Toggle ---
        const btnHudToggle = document.getElementById('hud-toggle-btn');
        if (btnHudToggle) {
            btnHudToggle.addEventListener('click', () => {
                document.body.classList.toggle('hud-collapsed');
            });
        }
        
        this.updateBreadcrumbUI();
        this.fetchState();
        setInterval(() => this.fetchState(), this.pollingInterval);

        // --- Conectar EventBus Lua SSE y SCUMM Narrator ---
        this.connectLuaStream();
        this.connectScummStream();
        
        // --- Bridge Websocket para control directo ---
        this.connectWorldBridge();
        
        // --- Multi-Tab Terminal ---
        this.initTabs();
        this._initIRC();
    },
    
    // --- LUA SSE EVENT BUS (with graceful fallback) ---
    _sseRetries: 0,
    _sseMaxRetries: 3,
    _sseConnected: false,
    
    worldBridgeWs: null,
    connectWorldBridge: function() {
        try {
            this.worldBridgeWs = new WebSocket('ws://localhost:8765');
            this.worldBridgeWs.onopen = () => console.log('[Bridge] Conectado para interact/navigate.');
            this.worldBridgeWs.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.type === 'ALISON_MOVE' && typeof Renderer !== 'undefined') {
                    // Reflejar instantáneamente!
                    const targetId = msg.alison_id;
                    if (Renderer.entityRefs && Renderer.entityRefs[targetId]) {
                        const sizeBox = Renderer.worldSize || 48.0;
                        const sizeMap = 60.0;
                        const nx = (msg.position[0] / sizeMap) * sizeBox - (sizeBox/2);
                        const nz = (msg.position[1] / sizeMap) * sizeBox - (sizeBox/2);
                        Renderer.entityRefs[targetId].targetX = nx;
                        Renderer.entityRefs[targetId].targetZ = nz;
                    }
                }
            };
            this.worldBridgeWs.onerror = () => console.warn('[Bridge] WebSocket no disponible. Comandos directos deshabilitados.');
            this.worldBridgeWs.onclose = () => setTimeout(() => this.connectWorldBridge(), 5000);
        } catch(e) {
            console.error('[Bridge] Failed to connect WebSocket.');
        }
    },
    
    connectLuaStream: function() {
        if (this.evtSource) this.evtSource.close();
        
        try {
            this.evtSource = new EventSource(API_BASE + '/lua/stream?surface=overworld');
        } catch (e) {
            console.warn('[SSE] EventSource creation failed, falling back to polling-only mode.');
            this._sseConnected = false;
            return;
        }
        
        this.evtSource.onopen = () => {
            this._sseConnected = true;
            this._sseRetries = 0;
            console.log('[SSE] Connected to Lua EventBus.');
        };
        
        this.evtSource.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                if (event.type === "message" || event.type === "aio_action" || event.type === "aio_result") {
                    const timeStr = event.ts ? new Date(event.ts * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    
                    if (event.type === "message") {
                        // Regular chat goes to IRC tab
                        this.appendIRCMessage(event.from, event.text, timeStr);
                    } else {
                        // Actions go to Drama tab
                        this.renderDramaLog([{
                            id: event.ts || Date.now() + Math.random(),
                            type: event.type,
                            time: timeStr,
                            prose: `<span class='drama-actor'>${event.from || "System"}</span>: ${event.text}`
                        }], false);
                    }
                    // Narrative Emission on 3D Holograms
                    if (event.from && typeof Renderer !== 'undefined' && Renderer.entityRefs) {
                        const targetId = Object.keys(Renderer.entityRefs).find(id => id.toLowerCase() === event.from.toLowerCase());
                        if (targetId) {
                            const ref = Renderer.entityRefs[targetId];
                            if (ref && ref.group) {
                                // Spawn an ephemeral PBR point light where the entity is located
                                const pLight = new THREE.PointLight(0xffffff, 8, 20);
                                pLight.position.copy(ref.group.position);
                                pLight.position.y += 2;
                                Renderer.scene.add(pLight);
                                
                                if (!Renderer.narrativePulses) Renderer.narrativePulses = [];
                                Renderer.narrativePulses.push({ light: pLight, life: 1.0 });
                            }
                        }
                    }
                }
            } catch(err) {
                console.error("SSE Parse Error:", err);
            }
        };
        
        this.evtSource.onerror = () => {
            this._sseConnected = false;
            this._sseRetries++;
            if (this._sseRetries >= this._sseMaxRetries) {
                console.warn(`[SSE] Failed after ${this._sseMaxRetries} retries. Falling back to polling-only for drama events.`);
                this.evtSource.close();
                this.evtSource = null;
            } else {
                console.warn(`[SSE] Connection error (retry ${this._sseRetries}/${this._sseMaxRetries})`);
            }
        };
    },

    // --- SCUMM NARRATOR SSE STREAM ---
    connectScummStream: function() {
        if (this.scummSource) this.scummSource.close();
        
        try {
            this.scummSource = new EventSource(API_BASE + '/scumm/stream');
        } catch (e) {
            console.warn('[SSE] SCUMM stream creation failed', e);
            return;
        }
        
        this.scummSource.onopen = () => console.log('[SSE] Connected to SCUMM Narrator.');
        
        this.scummSource.onmessage = (e) => {
            try {
                if (e.data.trim() === ": heartbeat") return; // Keepalive ignore
                const scene = JSON.parse(e.data);
                
                // Extract vars
                const timeParts = scene.timestamp ? scene.timestamp.split('T') : [];
                const timeStr = timeParts.length > 1 ? timeParts[1].substring(0, 5) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const type = scene.event_type || 'system';
                
                // Color formatting logic based on domain
                let colorClass = "accent-red";
                if (scene.domain === "soma") colorClass = ""; 
                else if (scene.domain === "psyche") colorClass = "highlight";
                else if (scene.domain === "world") colorClass = "drama-actor";
                
                let prose = scene.narrative;
                // Minor HTML injection logic if we want to style the actor:
                if (scene.data && scene.data.being) {
                    prose = prose.replace(scene.data.being, `<span class="${colorClass}">${scene.data.being}</span>`);
                }
                
                this.renderDramaLog([{
                    id: Date.now() + Math.random(),
                    type: type.toLowerCase(),
                    time: timeStr,
                    prose: prose
                }], false);
                
            } catch(err) {
                // Ignore empty heartbeats or malformed json silently to prevent console spam
            }
        };
    },
    
    // --- TERMINAL TABS & IRC LOGIC ---
    activeTab: 'drama',
    _hubLogsInterval: null,
    
    initTabs: function() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active classes
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add to clicked
                btn.classList.add('active');
                const targetId = 'tab-content-' + btn.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');
                
                this.activeTab = btn.getAttribute('data-tab');
                
                // Active behavior
                if (this.activeTab === 'logs') {
                    this._pollHubLogs(); // Fetch immediately
                    if (!this._hubLogsInterval) {
                        this._hubLogsInterval = setInterval(() => this._pollHubLogs(), 3000);
                    }
                } else {
                    if (this._hubLogsInterval) {
                        clearInterval(this._hubLogsInterval);
                        this._hubLogsInterval = null;
                    }
                }
            });
        });
    },
    
    _pollHubLogs: async function() {
        if (this.activeTab !== 'logs') return;
        try {
            const res = await fetch(API_BASE + '/system/logs/tail?lines=50');
            if (res.ok) {
                const text = await res.text();
                const pre = document.getElementById('hub-log-entries');
                if (pre) {
                    // Quick coloring for warnings and errors
                    let colored = text.replace(/WARNING/g, '<span style="color:var(--neon-yellow)">WARNING</span>')
                                      .replace(/ERROR/g, '<span style="color:var(--neon-red)">ERROR</span>');
                    pre.innerHTML = colored;
                    pre.scrollTop = pre.scrollHeight;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Hub Logs", e);
        }
    },
    
    _initIRC: async function() {
        // Fetch recent messages
        try {
            const res = await fetch(API_BASE + '/irc/recent?channel=%23colonial&limit=20');
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    // Reverse to show oldest first, as we append at the bottom
                    data.messages.reverse().forEach(m => {
                        const ts = new Date(m.ts * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        this.appendIRCMessage(m.sender, m.content || m.message, ts);
                    });
                }
            }
        } catch (e) {
            console.warn("Failed to fetch IRC history", e);
        }
        
        // Setup input handler
        const input = document.getElementById('irc-chat-input');
        if (input) {
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter' && input.value.trim() !== '') {
                    const text = input.value.trim();
                    input.value = '';
                    
                    // We use the AIO Native IRC Hub routing to automatically trigger logic
                    const url = `${API_BASE}/pidgin/mention?sender=Commander&text=${encodeURIComponent(text)}`;
                    try {
                        await fetch(url);
                        // No need to manually append, it will bounce back via lua/stream as a "message" event!
                    } catch (err) {
                        console.error("IRC Send error", err);
                        this.appendIRCMessage("System", "Error sending message.", "");
                    }
                }
            });
        }
    },
    
    appendIRCMessage: function(sender, text, timeStr) {
        const container = document.getElementById('irc-chat-entries');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = 'irc-entry';
        
        const timestamp = timeStr ? `<span style="color:rgba(255,255,255,0.3)">[${timeStr}]</span> ` : '';
        div.innerHTML = `${timestamp}<span class="irc-sender">${sender}</span>: ${text}`;
        
        container.appendChild(div);
        
        // Cap
        if (container.children.length > 50) {
            container.removeChild(container.firstChild);
        }
        container.scrollTop = container.scrollHeight;
    },
    
    showChatBubble: function(parentDiv, text) {
        let bubble = parentDiv.querySelector('.chat-bubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'chat-bubble';
            bubble.style.position = 'absolute';
            bubble.style.bottom = '100%'; // Encima de los pies
            bubble.style.left = '50%';
            bubble.style.transform = 'translate(-50%, -10px)';
            parentDiv.appendChild(bubble);
        }
        bubble.innerText = text;
        bubble.style.display = 'block';
        
        if (bubble.hideTimeout) clearTimeout(bubble.hideTimeout);
        bubble.hideTimeout = setTimeout(() => {
            bubble.style.display = 'none';
        }, 5000); // El bocadillo desaparece en 5 segundos
    },
    
    showInspector: function(entity) {
        // --- Delegate to EntityCard (Bestiario × Cyberpunk) ---
        if (typeof EntityCard !== 'undefined') {
            EntityCard.open(entity);
        } else {
            // Legacy fallback
            document.getElementById('inspector-panel').style.display = 'block';
            document.getElementById('insp-id').innerText = entity.id || 'Unknown';
            document.getElementById('insp-type').innerText = entity.type || 'N/A';
            document.getElementById('insp-action').innerText = entity.action || 'Idle';
            document.getElementById('insp-coords').innerText = `${entity.x}, ${entity.y}`;
        }
        
        // If we are currently locked to someone else, and we clicked a new entity, unlock.
        if (this.targetEntityId && this.targetEntityId !== entity.id) {
            this.toggleCameraLock();
        }
    },
    
    hideInspector: function() {
        if (typeof EntityCard !== 'undefined') {
            EntityCard.close();
        }
        document.getElementById('inspector-panel').style.display = 'none';
        if (this.targetEntityId) this.toggleCameraLock();
    },
    
    toggleCameraLock: function() {
        const btn = document.getElementById('btn-follow');
        if (!this.targetEntityId) {
            const id = document.getElementById('insp-id').innerText;
            if (id && id !== 'N/A') {
                this.targetEntityId = id;
                btn.innerText = "[ UNLOCK CAMERA ]";
                btn.style.color = "var(--neon-cyan)";
                btn.style.borderColor = "var(--neon-cyan)";
            }
        } else {
            this.targetEntityId = null;
            btn.innerText = "[ LOCK CAMERA ]";
            btn.style.color = "";
            btn.style.borderColor = "";
        }
    },
    
    fetchState: async function() {
        try {
            // Use domain-filtered endpoint (1.2MB → ~200KB)
            const url = `${this.apiUrl}?domain=${this.currentDomain}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            // With ?domain= param, response is flat: { tiles, entities, events, ... }
            // Without (legacy), it's { domains: { ... } }
            let state;
            if (data.domains) {
                // Legacy full-state fallback
                state = data.domains[this.currentDomain];
                if (!state) {
                    console.warn("Domain not found in state:", this.currentDomain);
                    return;
                }
            } else {
                // Filtered response (new)
                state = data;
            }
            
            // Store available domains for portal navigation
            if (data.available_domains) {
                this._availableDomains = data.available_domains;
            }
            
            // Load missing Web3/Skin external assets
            if (state.entities) {
                state.entities.forEach(ent => {
                    if (ent.asset_id && ent.asset_url) {
                        AssetManager.loadAsset(ent.asset_id, ent.asset_url);
                    }
                });
            }
            if (state.tiles) {
                state.tiles.forEach(tile => {
                    if (tile.asset_id && tile.asset_url) {
                        AssetManager.loadAsset(tile.asset_id, tile.asset_url);
                    }
                });
            }

            // Send to Renderer
            Renderer.updateState(state);
            this.updateStats(state);
            
            // Camera tracking logic + Live EntityCard update
            if (this.targetEntityId && state.entities) {
                const target = state.entities.find(e => e.id === this.targetEntityId);
                if (target) {
                    if (typeof EntityCard !== 'undefined' && EntityCard.isOpen) {
                        EntityCard.updateLive(target);
                    }
                } else {
                    this.hideInspector();
                }
            }
            // Also live-update if card is open but not camera-locked
            if (typeof EntityCard !== 'undefined' && EntityCard.isOpen && EntityCard.currentEntity && state.entities) {
                const cardTarget = state.entities.find(e => e.id === EntityCard.currentEntity.id);
                if (cardTarget) EntityCard.updateLive(cardTarget);
            }

            // --- SCUMM Drama Events from Backend ---
            // Events come as data.events (filtered endpoint) or fullState.events (legacy)
            const events = data.events || (data.domains ? [] : []);
            if (events.length > 0) {
                this.renderDramaLog(events, true);
            }
            
            // --- Minimap Update ---
            if (state.tiles && state.entities) {
                this.renderMinimap(state);
            }
        } catch (e) {
            console.error("Cartographer Sync Error:", e);
            const panel = document.getElementById("stats-panel");
            if (panel) {
                panel.innerHTML = `<div style="color:var(--neon-pink); padding: 10px; font-size: 1rem; text-align: left; background: rgba(255,0,0,0.2);">
                    <b>Sync Failed:</b> ${e.message}<br>
                    <pre style="font-size: 0.8em; margin-top: 10px; white-space: pre-wrap;">${e.stack || e}</pre>
                </div>`;
            }
        }
    },
    
    updateStats: function(state) {
        if (!state) return;
        const panel = document.getElementById("stats-panel");
        const dims = state.dimensions || {w: "N/A", h: "N/A"};
        panel.innerHTML = `
            <div>Dimensions: [${dims.w}x${dims.h}]</div>
            <div>Tiles loaded: ${state.tiles ? state.tiles.length : 0}</div>
            <div>Entities: <span class="highlight">${state.entities ? state.entities.length : 0}</span></div>
            <div>System Time: ${new Date().toLocaleTimeString()}</div>
        `;
    },

    renderDramaLog: function(events, isCartographerSync = false) {
        const container = document.getElementById('drama-entries');
        if (!container) return;

        // Apply filtering ONLY if these are Cartographer events (which use incremental int IDs starting from 0)
        let newEvents = events;
        if (isCartographerSync) {
            newEvents = events.filter(ev => typeof ev.id === 'number' && ev.id > this.lastEventId);
        }
        
        if (newEvents.length === 0) return;

        for (const ev of newEvents) {
            const div = document.createElement('div');
            div.className = 'drama-entry' + (ev.type ? ' drama-' + ev.type : '');

            const timeStr = ev.time || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            div.innerHTML = `<span class="drama-time">[${timeStr}]</span> ${ev.prose}`;

            container.appendChild(div);
            
            // Only update the polling tracker if it's an official sync pulse ID
            if (isCartographerSync && typeof ev.id === 'number') {
                this.lastEventId = Math.max(this.lastEventId, ev.id);
            }
        }

        // Cap entries
        while (container.children.length > this.maxDramaEntries) {
            container.removeChild(container.firstChild);
        }

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    },
    
    // --- Utility: Push a single drama entry programmatically ---
    pushDramaEntry: function(prose, type) {
        this.renderDramaLog([{
            id: Date.now() + Math.random(),
            type: type || '',
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            prose: prose
        }], false);
    },
    
    // --- MINIMAP RENDERER ---
    _minimapLastDraw: 0,
    
    renderMinimap: function(state) {
        // Throttle: redraw max every 2 seconds
        const now = Date.now();
        if (now - this._minimapLastDraw < 2000) return;
        this._minimapLastDraw = now;
        
        const canvas = document.getElementById('minimap');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        
        const dims = state.dimensions || { w: 60, h: 60 };
        const scale = Math.min(canvas.width / dims.w, canvas.height / dims.h);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#050608';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw tiles as 1px dots (biome-based color + topographic brightness)
        if (state.tiles) {
            const GENERIC = new Set(['floor','highway_asphalt_1','highway_asphalt_2','highway_asphalt']);
            for (const t of state.tiles) {
                // Use procedural biome if skin is generic
                let skin = t.skin || '';
                if (GENERIC.has(skin) && typeof Renderer !== 'undefined' && Renderer.getBiome) {
                    skin = Renderer.getBiome(t.x, t.y);
                }
                let r, g, b;
                if (skin.includes('grass'))          { r = 50;  g = 110; b = 40; }
                else if (skin.includes('tech'))      { r = 30;  g = 80;  b = 90; }
                else if (skin.includes('crystal'))   { r = 80;  g = 20;  b = 160; }
                else if (skin.includes('marble'))    { r = 140; g = 130; b = 125; }
                else if (skin.includes('void'))      { r = 50;  g = 15;  b = 70; }
                else if (skin.includes('dirt'))      { r = 85;  g = 70;  b = 45; }
                else if (skin.includes('corrupted')) { r = 100; g = 35;  b = 60; }
                else if (skin.includes('water'))     { r = 30;  g = 70;  b = 120; }
                else if (skin.includes('asphalt'))   { r = 60;  g = 60;  b = 60; }
                else                                 { r = 40;  g = 50;  b = 60; }
                
                // Topographic brightness: higher elevation = brighter (contour map)
                let elBright = 1.0;
                if (typeof Renderer !== 'undefined' && Renderer.getElevation) {
                    const el = Renderer.getElevation(t.x, t.y);
                    elBright = 0.6 + Math.max(0, el) * 0.35;
                }
                ctx.fillStyle = `rgb(${Math.min(255, Math.floor(r * elBright))}, ${Math.min(255, Math.floor(g * elBright))}, ${Math.min(255, Math.floor(b * elBright))})`;
                
                ctx.fillRect(t.x * scale, t.y * scale, Math.max(1, scale), Math.max(1, scale));
            }
        }
        
        // Draw entities as colored dots
        if (state.entities) {
            for (const e of state.entities) {
                if (e.type === 'being') ctx.fillStyle = '#00ffff';
                else if (e.type === 'building') ctx.fillStyle = '#bb00ff';
                else if (e.type === 'fauna') ctx.fillStyle = '#cda472';
                else if (e.type === 'flora') ctx.fillStyle = '#2d5a27';
                else if (e.type === 'mineral') ctx.fillStyle = '#666666';
                else ctx.fillStyle = '#444444';
                
                const dotSize = (e.type === 'being' || e.type === 'building') ? 3 : 2;
                ctx.fillRect(e.x * scale - dotSize/2, e.y * scale - dotSize/2, dotSize, dotSize);
            }
        }
        
        // Draw camera viewport rectangle
        if (typeof Renderer !== 'undefined' && Renderer.camera) {
            const cam = Renderer.camera;
            const cx = (cam.position.x - 20) * scale;
            const cy = (cam.position.z - 20) * scale;
            const vw = 30 * scale / (cam.zoom || 1);
            const vh = 30 * scale / (cam.zoom || 1);
            
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - vw/2, cy - vh/2, vw, vh);
        }
    }
};
