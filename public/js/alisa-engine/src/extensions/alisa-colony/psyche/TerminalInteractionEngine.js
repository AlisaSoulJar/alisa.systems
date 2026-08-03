/**
 * [ALISA Overworld Interaction System — Maniac Mansion Verbs]
 * 
 * Manages the contextual radial/drop-down menu when clicking on an entity,
 * and handles the direct communication pipeline (Chat Modal) to Ouroboros.
 */

export const TerminalInteractionEngine = {
    isOpen: false,
    currentEntity: null,
    
    // DOM Elements
    _menuEl: null,
    _headerEl: null,
    _chatModal: null,
    _chatInput: null,
    _chatTargetSpan: null,

    init: function() {
        this._menuEl = document.getElementById('action-menu');
        this._headerEl = document.getElementById('action-target-name');
        this._chatModal = document.getElementById('chat-modal');
        this._chatInput = document.getElementById('chat-input');
        this._chatTargetSpan = document.getElementById('chat-target-name');
        
        this._bindEvents();
        console.log('[ActionMenu] Initialized context interactions.');
    },

    _bindEvents: function() {
        // Global click to close menu if clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this._menuEl.contains(e.target)) {
                this.close();
            }
        });

        // Block propagation on the menu so clicking it doesn't close it instantly
        this._menuEl.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Handle Verb Buttons
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            
            const verb = btn.getAttribute('data-verb');
            this._executeVerb(verb);
        });
        
        // Chat Modal Buttons
        document.getElementById('btn-chat-close').addEventListener('click', () => {
            this._closeChat();
        });
        
        document.getElementById('btn-chat-send').addEventListener('click', () => {
            this._sendChat();
        });
        
        // Chat enter key
        this._chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._sendChat();
            } else if (e.key === 'Escape') {
                this._closeChat();
            }
        });
        
        // Prevent pan/zoom when interacting with chat
        this._chatModal.addEventListener('wheel', e => e.stopPropagation());
    },

    /**
     * Opens the action menu at the specified screen coordinates
     * @param {Object} entity - The target entity object
     * @param {number} clientX - Mouse X
     * @param {number} clientY - Mouse Y
     */
    open: function(entity, clientX, clientY) {
        if (!entity || !this._menuEl) return;
        
        // If already open on same entity, just close it (toggle behavior)
        if (this.isOpen && this.currentEntity && this.currentEntity.id === entity.id) {
            this.close();
            return;
        }

        this.currentEntity = entity;
        this._headerEl.textContent = entity.id.toUpperCase();
        
        // --- GAME JUICE: Spawn click particle burst at entity's world position ---
        if (typeof Renderer !== 'undefined' && Renderer.spawnClickBurst && Renderer.lerpEntities[entity.id]) {
            const le = Renderer.lerpEntities[entity.id];
            const el = (typeof Renderer.getElevation === 'function') ? Renderer.getElevation(le.curX, le.curY) : 0;
            const colorMap = { being: 0x00ffff, building: 0xcc44ff, feature: 0x44ff88, flora: 0x22aa44, mineral: 0xffaa22 };
            const burstColor = colorMap[entity.type] || 0x00ffff;
            Renderer.spawnClickBurst(le.curX, el, le.curY, burstColor);
        }
        
        // Adjust position so it doesn't fall off screen
        const menuWidth = 200;
        const menuHeight = 220; // Approx
        let x = clientX + 15;
        let y = clientY + 15;
        
        if (x + menuWidth > window.innerWidth) x = clientX - menuWidth - 15;
        if (y + menuHeight > window.innerHeight) y = clientY - menuHeight - 15;

        this._menuEl.style.left = `${x}px`;
        this._menuEl.style.top = `${y}px`;
        
        // Filter verbs based on entity type
        const buttons = this._menuEl.querySelectorAll('.action-btn');
        const isBeing = entity.type === 'being';
        const isPortal = !!entity.target_domain;
        const isDead = (entity.action === 'Offline' || (entity.cpu_glow === 0.0 && isBeing && entity.id !== "Commander" && entity.id !== "Queen"));
        
        buttons.forEach(btn => {
            const verb = btn.getAttribute('data-verb');
            // Only beings can be talked to or woken safely
            if ((verb === 'talk' || verb === 'wake') && !isBeing) {
                btn.style.display = 'none';
            } else if (verb === 'enter' && !isPortal) {
                btn.style.display = 'none';
            } else if (verb === 'spawn') {
                // Show spawn only if it's a dead Being
                btn.style.display = (isBeing && isDead) ? 'flex' : 'none';
            } else if (verb === 'kill') {
                // Show kill only if it's an alive Being
                btn.style.display = (isBeing && !isDead) ? 'flex' : 'none';
            } else {
                btn.style.display = 'flex';
            }
        });

        // Show menu
        this._menuEl.classList.remove('action-menu-hidden');
        // Force reflow
        void this._menuEl.offsetWidth;
        this._menuEl.classList.add('active');
        
        this.isOpen = true;
    },

    close: function() {
        if (!this.isOpen) return;
        
        this._menuEl.classList.remove('active');
        setTimeout(() => {
            if (!this.isOpen) this._menuEl.classList.add('action-menu-hidden');
        }, 150); // Matches CSS transition
        
        this.isOpen = false;
        // Don't null currentEntity yet, we might need it for a verb action triggering right after
    },

    /**
     * Executes the verb requested by the user
     */
    _executeVerb: function(verb) {
        const entity = this.currentEntity;
        if (!entity) return;
        
        this.close(); // Close menu immediately after action

        console.log(`[ActionMenu] Execute verb [${verb}] on [${entity.id}]`);

        switch (verb) {
            case 'inspect':
                if (typeof EntityCard !== 'undefined') {
                    EntityCard.open(entity);
                }
                break;
                
            case 'follow':
                if (typeof MainApp !== 'undefined') {
                    MainApp.targetEntityId = entity.id;
                }
                break;
                
            case 'talk':
                this._openChat(entity);
                break;
                
            case 'wake':
                this._dispatchInteract(entity.id, 'wake', { notify: true });
                break;
                
            case 'enter':
                if (typeof MainApp !== 'undefined' && entity.target_domain) {
                    MainApp.changeDomain(entity.target_domain);
                }
                break;
                
            case 'spawn':
                this._dispatchFleetControl(entity.id, 'spawn');
                break;
                
            case 'kill':
                if (confirm(`Are you sure you want to HARD KILL process [${entity.id}]?`)) {
                    this._dispatchFleetControl(entity.id, 'kill');
                }
                break;
                
            default:
                console.warn(`Verb ${verb} not implemented`);
                break;
        }
    },
    
    // --- HUD LOGIC ---
    dispatchNavigate: function(targetId, gridX, gridY) {
        if (!targetId || typeof MainApp === 'undefined' || !MainApp.worldBridgeWs || MainApp.worldBridgeWs.readyState !== WebSocket.OPEN) {
            console.warn('[Interact] WorldBridge not ready for NAVIGATE');
            return;
        }
        
        console.log(`[Interact] Commanding movement to ${gridX}:${gridY}`);
        MainApp.worldBridgeWs.send(JSON.stringify({
            type: "NAVIGATE",
            alison_id: targetId,
            target: `${gridX}:${gridY}`
        }));
        
        if (MainApp.pushDramaEntry) {
            MainApp.pushDramaEntry(`System sent [NAVIGATE] intent for ^${targetId}^ to ${gridX}:${gridY}.`);
        }
    },

    _dispatchInteract: function(targetId, verb, payload = {}) {
        // Envia el dict al nuevo endpoint en Soma/Navi/hub/overworld.py
        const body = {
            verb: verb,
            payload: payload
        };
        const base = (typeof API_BASE !== 'undefined') ? API_BASE : ((window.location.protocol === 'file:' || window.location.port === '5500') ? 'http://127.0.0.1:8741' : '');
        fetch(`${base}/overworld/interact/${targetId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(res => res.json())
        .then(data => {
            console.log(`[Interact] Sent ${verb} to ${targetId} ->`, data);
            if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
                MainApp.pushDramaEntry(`System sent [${verb}] signal to ^${targetId}^.`);
            }
        })
        .catch(err => {
            console.error('[Interact Error]', err);
            if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
                MainApp.pushDramaEntry(`FAILED to connect to Hub for [${verb}]. Node down?`, "system");
            }
        });
    },

    _dispatchFleetControl: function(targetId, action) {
        // Direct call to the Sovereign Fleet Hub endpoints
        const base = (typeof API_BASE !== 'undefined') ? API_BASE : ((window.location.protocol === 'file:' || window.location.port === '5500') ? 'http://127.0.0.1:8741' : '');
        
        let path = '';
        let body = null;
        if (action === 'spawn') {
            path = `/fleet/spawn`;
            body = JSON.stringify({ being: targetId });
        } else if (action === 'kill') {
            path = `/fleet/kill/${targetId}`;
            body = null; // Path param handles it
        }

        fetch(`${base}${path}`, {
            method: 'POST',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body
        })
        .then(res => res.json())
        .then(data => {
            console.log(`[Fleet] Sent [${action}] to [${targetId}] ->`, data);
            let displayState = action === 'spawn' ? 'SPAWNING' : 'TERMINATED';
            if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
                MainApp.pushDramaEntry(`SYSTEM: Process <span style="color:var(--neon-${action==='kill'?'red':'blue'})">[${displayState}]</span> for ^${targetId}^.`);
            }
        })
        .catch(err => {
            console.error('[Fleet Control Error]', err);
            if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
                MainApp.pushDramaEntry(`FAILED fleet control action [${action}] on ^${targetId}^.`, "system");
            }
        });
    },
    
    // --- CHAT MODAL LOGIC ---
    _openChat: function(entity) {
        this._chatTargetSpan.textContent = entity.id.toUpperCase();
        this._chatInput.value = '';
        
        this._chatModal.classList.remove('chat-modal-hidden');
        void this._chatModal.offsetWidth;
        this._chatModal.classList.add('active');
        
        setTimeout(() => this._chatInput.focus(), 100);
        
        // Pause MainApp auto-controls if we type
    },
    
    _closeChat: function() {
        this._chatModal.classList.remove('active');
        setTimeout(() => {
            this._chatModal.classList.add('chat-modal-hidden');
        }, 200);
    },
    
    _sendChat: function() {
        const text = this._chatInput.value.trim();
        if (!text || !this.currentEntity) return;
        
        const targetId = this.currentEntity.id;
        
        // 1. Send via Ouroboros interact verb
        this._dispatchInteract(targetId, 'talk', { message: text });
        
        // 2. Play UI feedback
        if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
            MainApp.pushDramaEntry(`You spoke to ^${targetId}^: "${text}"`, "spawn");
        }
        
        this._closeChat();
    }
};
