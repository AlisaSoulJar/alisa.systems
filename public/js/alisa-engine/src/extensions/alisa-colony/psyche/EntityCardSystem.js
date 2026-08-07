// ATENCION: este import faltaba. El modulo usaba THREE. sin importarlo, o sea que
// dependia de que alguien hubiera dejado la global puesta con un <script> clasico:
// funcionaba EN SU PAGINA y en ninguna otra. Un modulo que solo funciona donde
// nacio no es un modulo. Lo destapo clasificar_piezas.mjs sobre las 179 piezas.
import * as THREE from 'three';

/**
 * [ALISA Entity Card v1 — Bestiario × Cyberpunk Inspection Card]
 * 
 * Replaces the old text-only inspector with an animated, pixel-art portrait card.
 * 
 * Architecture:
 *   - Portrait: SpriteFactory sprite rendered at 4x on a <canvas>
 *   - Stat Bars: CSS-animated width transitions (energy, CPU, perception)
 *   - Type Themes: Border color + name glow per entity type
 *   - Animation: CSS scale/opacity transitions (open: bounce, close: shrink)
 *   - Keyboard: Escape to close, W to wake, C to follow
 * 
 * Data sources: entity object from Cartographer state export
 */

export const EntityCardSystem = {
    isOpen: false,
    currentEntity: null,
    portraitAnimFrame: null,
    
    // DOM refs (cached on first open)
    _overlay: null,
    _card: null,
    _portraitCanvas: null,
    
    // Phase 22 WebGL Micro-Renderer
    _portraitRenderer: null,
    _portraitScene: null,
    _portraitCamera: null,
    _portraitModel: null,
    
    // Type → visual identity mapping
    TYPE_CONFIG: {
        being:    { badge: '🐝', cssClass: 'type-being',    label: 'BEING' },
        building: { badge: '🏭', cssClass: 'type-building',  label: 'BUILDING' },
        feature:  { badge: '🌀', cssClass: 'type-portal',    label: 'PORTAL' },
        fauna:    { badge: '🐁', cssClass: 'type-fauna',     label: 'FAUNA' },
        flora:    { badge: '🌲', cssClass: 'type-flora',     label: 'FLORA' },
        mineral:  { badge: '🪨', cssClass: 'type-mineral',   label: 'MINERAL' },
        scrap:    { badge: '⚙️', cssClass: 'type-mineral',   label: 'SCRAP' },
        yokai:    { badge: '👾', cssClass: 'type-yokai',     label: 'YOKAI' },
        // Añadidos para cosas que no son criaturas: una máquina del arcade, una
        // mesa de juego, un terminal. Reutilizan temas que ya existen en el CSS
        // en vez de traer colores nuevos — la paleta ya estaba decidida.
        estacion: { badge: '🕹️', cssClass: 'type-building',  label: 'ARCADE' },
        mesa:     { badge: '🎲', cssClass: 'type-mineral',   label: 'MESA' },
        terminal: { badge: '▤',  cssClass: 'type-portal',    label: 'TERMINAL' }
    },
    
    init: function() {
        // ⚠️ ESTA PIEZA TENÍA 0 IMPORTADORES, y por una razón concreta: creaba
        // su DOM pero NO llevaba sus estilos. El CSS vivía suelto en el
        // `style.css` del overworld viejo, que ya no existe en el proyecto.
        // Quien la importara veía... nada: elementos sin forma, invisibles.
        //
        // Una pieza del motor que necesita que la página adivine su CSS es una
        // pieza que no usa nadie, y con razón. Ahora se lo lleva dentro: la
        // importas, llamas a init(), y funciona. Rescatado del backup del 3 de
        // mayo (59 reglas).
        this._inyectarEstilos();
        this._createDOM();
        this._bindEvents();
        console.log('[EntityCard] Initialized — Bestiario × Cyberpunk card system ready');
    },

    _inyectarEstilos: function() {
        if (document.getElementById('ecard-estilos')) return;   // una sola vez
        const s = document.createElement('style');
        s.id = 'ecard-estilos';
        s.textContent = String.raw`/* ========================================
   ENTITY CARD — carta de criatura × cyberpunk
   ======================================== */

/* Backdrop overlay — click to close */
#entity-card-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.55);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    z-index: 9990;
    cursor: pointer;
}
#entity-card-overlay.active {
    display: block;
    animation: overlayFadeIn 0.2s ease-out;
}
/* The Card itself */
#entity-card {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
    z-index: 9995;
    
    width: 520px;
    max-width: 90vw;
    
    background: linear-gradient(135deg, rgba(8, 12, 22, 0.95), rgba(15, 22, 40, 0.92));
    border: 2px solid var(--glass-border);
    border-radius: 8px;
    box-shadow:
        0 0 40px rgba(0, 255, 255, 0.08),
        0 0 80px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    
    pointer-events: auto;
    overflow: hidden;
    
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.2s ease-out;
}
#entity-card.active {
    display: block;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
}
#entity-card.closing {
    transform: translate(-50%, -50%) scale(0.85);
    opacity: 0;
    transition: transform 0.18s ease-in, opacity 0.15s ease-in;
}
/* --- Card Header Bar --- */
.ecard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.3);
}
.ecard-name {
    font-family: var(--font-head);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 0 12px currentColor;
}
.ecard-badge {
    font-size: 1.6rem;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
}
.ecard-close-x {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #888;
    font-family: var(--font-mono);
    font-size: 1rem;
    width: 28px;
    height: 28px;
    line-height: 26px;
    text-align: center;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
}
.ecard-close-x:hover {
    color: var(--neon-red);
    border-color: var(--neon-red);
    box-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
}
/* --- Card Body --- */
.ecard-body {
    display: flex;
    gap: 16px;
    padding: 16px;
}
/* --- Portrait Section (left) --- */
.ecard-portrait {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}
.ecard-portrait-canvas {
    width: 192px;
    height: 288px;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: -moz-crisp-edges;
    image-rendering: pixelated;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.4);
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}
.ecard-type-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 3px 10px;
    border-radius: 3px;
    border: 1px solid currentColor;
    opacity: 0.8;
}
/* --- Stats Section (right) --- */
.ecard-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}
/* Stat bar row */
.ecard-stat-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
}
.ecard-stat-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: #8da4b4;
    display: flex;
    justify-content: space-between;
}
.ecard-stat-label span {
    color: #fff;
    font-weight: 600;
}
.ecard-stat-bar-bg {
    height: 10px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.04);
}
.ecard-stat-bar-fill {
    height: 100%;
    border-radius: 2px;
    width: 0%;
    transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.ecard-stat-bar-fill.bar-energy {
    background: linear-gradient(90deg, #00cc66, #00ffaa);
    box-shadow: 0 0 8px rgba(0, 255, 170, 0.3);
}
.ecard-stat-bar-fill.bar-energy.low {
    background: linear-gradient(90deg, #ff4444, #ff8800);
    box-shadow: 0 0 8px rgba(255, 68, 68, 0.3);
}
.ecard-stat-bar-fill.bar-energy.mid {
    background: linear-gradient(90deg, #ffaa00, #ffdd44);
    box-shadow: 0 0 8px rgba(255, 170, 0, 0.3);
}
.ecard-stat-bar-fill.bar-cpu {
    background: linear-gradient(90deg, #ff8800, #ff4444);
    box-shadow: 0 0 8px rgba(255, 136, 0, 0.3);
}
.ecard-stat-bar-fill.bar-perception {
    background: linear-gradient(90deg, #4488ff, #00ccff);
    box-shadow: 0 0 8px rgba(68, 136, 255, 0.3);
}
.ecard-stat-bar-fill.bar-age {
    background: linear-gradient(90deg, #aa88ff, #cc44ff);
    box-shadow: 0 0 8px rgba(170, 136, 255, 0.3);
}
/* Data rows */
.ecard-data {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: #8da4b4;
    line-height: 1.7;
}
.ecard-data .label { color: #5a7888; }
.ecard-data .value {
    color: #fff;
    font-weight: 600;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
}
.ecard-data .action-value {
    text-transform: uppercase;
    letter-spacing: 1px;
}
/* Separator line */
.ecard-sep {
    border: none;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    margin: 4px 0;
}
/* --- Card Footer (actions) --- */
.ecard-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.2);
}
.ecard-btn {
    flex: 1 1 112px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ccc;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    padding: 8px 4px;
    text-align: center;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    letter-spacing: 1px;
    white-space: normal;
    overflow-wrap: anywhere;
}
.ecard-btn:hover {
    background: rgba(0, 255, 255, 0.08);
    border-color: var(--neon-cyan);
    color: var(--neon-cyan);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
}
.ecard-btn.btn-wake {
    border-color: rgba(187, 0, 255, 0.3);
    color: var(--neon-purple);
}
.ecard-btn.btn-wake:hover {
    background: rgba(187, 0, 255, 0.1);
    border-color: var(--neon-purple);
    box-shadow: 0 0 12px rgba(187, 0, 255, 0.2);
}
.ecard-btn.btn-close {
    border-color: rgba(255, 0, 85, 0.2);
    color: #999;
}
.ecard-btn.btn-close:hover {
    border-color: var(--neon-red);
    color: var(--neon-red);
    box-shadow: 0 0 12px rgba(255, 0, 85, 0.2);
}
.ecard-btn.btn-observation {
    border-color: rgba(0, 255, 255, 0.28);
    color: var(--neon-cyan);
}
.ecard-btn.btn-observation:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: var(--neon-cyan);
}
.ecard-btn.btn-consent {
    border-color: rgba(255, 190, 80, 0.35);
    color: #ffbe50;
}
.ecard-btn.btn-consent:hover {
    background: rgba(255, 190, 80, 0.1);
    border-color: #ffbe50;
    color: #ffd58a;
}
.ecard-btn.btn-sent {
    border-color: rgba(0, 255, 170, 0.4);
    color: #00ffaa;
    pointer-events: none;
}
.ecard-btn.btn-failed {
    border-color: rgba(255, 0, 85, 0.45);
    color: var(--neon-red);
}
.ecard-btn.btn-cancelled {
    border-color: rgba(255, 255, 255, 0.16);
    color: #888;
}
/* --- Type-specific card border accents --- */
#entity-card.type-being { border-color: rgba(0, 255, 255, 0.5); }
#entity-card.type-being .ecard-name { color: var(--neon-cyan); }
#entity-card.type-building { border-color: rgba(187, 0, 255, 0.5); }
#entity-card.type-building .ecard-name { color: var(--neon-purple); }
#entity-card.type-portal { border-color: rgba(0, 255, 100, 0.5); }
#entity-card.type-portal .ecard-name { color: #00ff66; }
#entity-card.type-fauna { border-color: rgba(205, 164, 114, 0.5); }
#entity-card.type-fauna .ecard-name { color: #cda472; }
#entity-card.type-flora { border-color: rgba(45, 90, 39, 0.5); }
#entity-card.type-flora .ecard-name { color: #5ab34f; }
#entity-card.type-yokai { border-color: rgba(204, 68, 255, 0.5); }
#entity-card.type-yokai .ecard-name { color: #cc44ff; }
#entity-card.type-mineral { border-color: rgba(150, 150, 150, 0.5); }
#entity-card.type-mineral .ecard-name { color: #aaa; }`;
        document.head.appendChild(s);
    },
    
    _createDOM: function() {
        // Overlay backdrop
        const overlay = document.createElement('div');
        overlay.id = 'entity-card-overlay';
        document.body.appendChild(overlay);
        this._overlay = overlay;
        
        // Card container
        const card = document.createElement('div');
        card.id = 'entity-card';
        card.innerHTML = `
            <div class="ecard-header">
                <span class="ecard-badge" id="ecard-badge"></span>
                <span class="ecard-name" id="ecard-name">---</span>
                <button class="ecard-close-x" id="ecard-close-x" title="Close (Esc)">✕</button>
            </div>
            <div class="ecard-body">
                <div class="ecard-portrait">
                    <canvas class="ecard-portrait-canvas" id="ecard-portrait" width="192" height="288"></canvas>
                    <div class="ecard-type-label" id="ecard-type-label">---</div>
                </div>
                <div class="ecard-stats" id="ecard-stats">
                    <!-- Populated dynamically -->
                </div>
            </div>
            <div class="ecard-footer" id="ecard-footer">
                <!-- Populated dynamically -->
            </div>
        `;
        document.body.appendChild(card);
        this._card = card;
        this._portraitCanvas = document.getElementById('ecard-portrait');
        
        // Phase 22: Initialize WebGL Micro-Renderer
        if (typeof THREE !== 'undefined') {
            this._portraitRenderer = new THREE.WebGLRenderer({ canvas: this._portraitCanvas, alpha: true, antialias: true });
            this._portraitRenderer.setSize(192, 288);
            
            this._portraitScene = new THREE.Scene();
            
            // Add subtle grid background logic to the scene directly if needed, or rely on CSS/alpha.
            // Using ambient and directional light
            const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
            this._portraitScene.add(ambLight);
            
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(2, 5, 3);
            this._portraitScene.add(dirLight);
            
            this._portraitCamera = new THREE.PerspectiveCamera(50, 192 / 288, 0.1, 100);
            this._portraitCamera.position.set(0, 1.5, 5);
            this._portraitCamera.lookAt(0, 1, 0);
        }
    },
    
    _bindEvents: function() {
        // Overlay click to close
        this._overlay.addEventListener('click', () => this.close());
        
        // X button
        document.getElementById('ecard-close-x').addEventListener('click', () => this.close());
        
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
            if (e.key === 'w' || e.key === 'W') {
                if (this.currentEntity && this.currentEntity.type === 'being') {
                    this._wakeEntity();
                }
            }
            if (e.key === 'c' || e.key === 'C') {
                this._toggleFollow();
            }
        });
    },
    
    /**
     * Open the entity card with full animation.
     * @param {Object} entity - Entity data from Cartographer state
     */
    open: function(entity) {
        if (!entity) return;
        this.currentEntity = entity;
        
        // Determine type config
        let typeKey = entity.type || 'being';
        if (entity.target_domain) typeKey = 'feature'; // Portals
        if (entity.skin_tag && entity.skin_tag.includes('yokai')) typeKey = 'yokai';
        const typeConf = this.TYPE_CONFIG[typeKey] || this.TYPE_CONFIG.being;
        
        // --- 1. Header ---
        document.getElementById('ecard-badge').textContent = typeConf.badge;
        document.getElementById('ecard-name').textContent = entity.id || 'UNKNOWN';
        
        // Type-specific CSS class
        this._card.className = ''; // Reset
        this._card.classList.add(typeConf.cssClass);
        
        // Type label under portrait
        const typeLabel = document.getElementById('ecard-type-label');
        typeLabel.textContent = typeConf.label;
        typeLabel.style.color = getComputedStyle(document.querySelector(`#entity-card.${typeConf.cssClass} .ecard-name`) || document.body).color;
        
        // --- 2. Portrait ---
        this._startPortraitAnimation(entity);
        
        // --- 3. Stats ---
        this._renderStats(entity);
        
        // --- 4. Footer buttons ---
        this._renderFooter(entity);
        
        // --- 5. Animate open ---
        this._card.style.display = ''; // Clear inline 'none' from previous close
        this._overlay.style.display = '';

        this._overlay.classList.add('active');
        this._card.classList.remove('closing');
        // Force reflow for animation restart
        void this._card.offsetWidth;
        this._card.classList.add('active');
        
        this.isOpen = true;
        
        // Hide old inspector if it was showing
        const oldInsp = document.getElementById('inspector-panel');
        if (oldInsp) oldInsp.style.display = 'none';
    },
    
    /**
     * Close the card with shrink animation.
     */
    close: function() {
        if (!this.isOpen) return;
        
        // Stop portrait animation
        if (this.portraitAnimFrame) {
            cancelAnimationFrame(this.portraitAnimFrame);
            this.portraitAnimFrame = null;
        }
        
        // Animate close
        this._card.classList.add('closing');
        this._card.classList.remove('active');
        
        setTimeout(() => {
            this._card.classList.remove('closing');
            this._card.style.display = 'none';
            this._overlay.classList.remove('active');
            // BUG 7 FIX: Null currentEntity only after CSS animation finishes
            // so polling loop can still update the card visually while shrinking
            this.currentEntity = null;
        }, 200);
        
        this.isOpen = false;
    },
    
    /**
     * Update card data live (called from polling loop when card is open).
     * @param {Object} entity - Updated entity data
     */
    updateLive: function(entity) {
        if (!this.isOpen || !entity) return;
        this.currentEntity = entity;
        
        // Update stat bar widths (they animate via CSS transition)
        this._updateStatBars(entity);
        
        // Update action text
        const actionEl = document.getElementById('ecard-action-value');
        if (actionEl) actionEl.textContent = entity.action || 'idle';
        
        const coordsEl = document.getElementById('ecard-coords-value');
        if (coordsEl) coordsEl.textContent = `${entity.x}, ${entity.y}`;
    },
    
    // ─── Portrait Rendering ───────────────────────────────────────
    
    _startPortraitAnimation: function(entity) {
        if (this.portraitAnimFrame) {
            cancelAnimationFrame(this.portraitAnimFrame);
        }
        
        if (!this._portraitRenderer || typeof Renderer === 'undefined') return;

        // Clean up previous model
        if (this._portraitModel) {
            this._portraitScene.remove(this._portraitModel);
            this._portraitModel = null;
        }

        // Clone the entity's 3D mesh from the main scene pool!
        if (Renderer.entityRefs && Renderer.entityRefs[entity.id]) {
            const sourceRef = Renderer.entityRefs[entity.id];
            this._portraitModel = sourceRef.group.clone();
            
            // Re-center for the portrait view
            this._portraitModel.position.set(0, 0, 0);
            this._portraitScene.add(this._portraitModel);
            
            // Adjust camera depending on type
            if (entity.type === 'building') {
                this._portraitCamera.position.set(0, 3, 8);
                this._portraitCamera.lookAt(0, 2.5, 0);
            } else {
                this._portraitCamera.position.set(0, 1.5, 4.5);
                this._portraitCamera.lookAt(0, 1, 0);
            }
        }

        // Fallback for missing geometry handled by empty scene.

        let rotationAngle = 0;
        const animate = () => {
            if (this._portraitModel) {
                rotationAngle += 0.01;
                this._portraitModel.rotation.y = rotationAngle;
                
                // Add a gentle floating bob
                this._portraitModel.position.y = Math.sin(rotationAngle * 2) * 0.1;
            }
            
            this._portraitRenderer.render(this._portraitScene, this._portraitCamera);
            this.portraitAnimFrame = requestAnimationFrame(animate);
        };
        
        animate();
    },
    
    // ─── Stats Rendering ──────────────────────────────────────────
    
    _renderStats: function(entity) {
        const container = document.getElementById('ecard-stats');

        // ── BARRAS PROPIAS ────────────────────────────────────────────────
        // Esta ficha nació para Beings del overworld: leía `energy`, `cpu_glow`,
        // `perception_radius`. Al usarla para otra cosa —una estación de arcade,
        // por ejemplo— salía "CPU LOAD 0%" y "Coords: undefined": datos falsos
        // con pinta de verdaderos, que es peor que no enseñar nada.
        //
        // Ahora quien la abre puede pasar sus PROPIAS barras. Si las pasa, se
        // usan esas y no se inventa nada. Si no, sigue el camino de Being de
        // toda la vida, así que nada de lo que ya funcionaba se rompe.
        //
        //   EntityCardSystem.open({ id:'Go', type:'station',
        //       barras: [ {etiqueta:'RESUELTA', valor:100, sufijo:'%'},
        //                 {etiqueta:'PUNTOS',   valor:40, max:60} ] })
        if (Array.isArray(entity.barras)) {
            container.innerHTML = entity.barras.map(b => {
                const max = b.max ?? 100;
                const pct = Math.max(0, Math.min(100, (b.valor / max) * 100));
                return `
                  <div class="ecard-stat-row">
                      <div class="ecard-stat-label">${b.etiqueta}
                          <span>${b.valor}${b.sufijo ?? ''}</span></div>
                      <div class="ecard-stat-bar-bg">
                          <div class="ecard-stat-bar-fill" style="width:${pct}%"></div>
                      </div>
                  </div>`;
            }).join('') + (entity.nota
                ? `<div class="ecard-info-row" style="margin-top:14px">${entity.nota}</div>` : '');
            return;
        }
        
        // Energy bar
        const energy = entity.energy !== undefined ? entity.energy : null;
        const cpuGlow = entity.cpu_glow || 0;
        const perception = entity.perception_radius || 8;
        const age = entity.age || 0;
        
        let html = '';
        
        // Energy stat bar
        if (energy !== null) {
            const energyPct = Math.max(0, Math.min(100, energy));
            const energyClass = energyPct < 20 ? 'low' : (energyPct < 50 ? 'mid' : '');
            html += `
                <div class="ecard-stat-row">
                    <div class="ecard-stat-label">ENERGY <span>${energyPct.toFixed(0)}%</span></div>
                    <div class="ecard-stat-bar-bg">
                        <div class="ecard-stat-bar-fill bar-energy ${energyClass}" id="ecard-bar-energy" style="width: 0%"></div>
                    </div>
                </div>
            `;
        }
        
        // CPU Load bar
        if (cpuGlow > 0 || entity.type === 'being' || entity.type === 'building') {
            const cpuPct = Math.min(100, cpuGlow * 100);
            html += `
                <div class="ecard-stat-row">
                    <div class="ecard-stat-label">CPU LOAD <span>${cpuPct.toFixed(0)}%</span></div>
                    <div class="ecard-stat-bar-bg">
                        <div class="ecard-stat-bar-fill bar-cpu" id="ecard-bar-cpu" style="width: 0%"></div>
                    </div>
                </div>
            `;
        }
        
        // Perception radius bar (max ~20)
        if (entity.type === 'being' || entity.type === 'fauna') {
            const percPct = Math.min(100, (perception / 20) * 100);
            html += `
                <div class="ecard-stat-row">
                    <div class="ecard-stat-label">PERCEPTION <span>${perception}</span></div>
                    <div class="ecard-stat-bar-bg">
                        <div class="ecard-stat-bar-fill bar-perception" id="ecard-bar-perception" style="width: 0%"></div>
                    </div>
                </div>
            `;
        }
        
        // Separator + data fields
        html += '<hr class="ecard-sep">';
        html += '<div class="ecard-data">';
        html += `<div><span class="label">Action:</span> <span class="value action-value" id="ecard-action-value">${entity.action || 'idle'}</span></div>`;
        html += `<div><span class="label">Coords:</span> <span class="value" id="ecard-coords-value">${entity.x}, ${entity.y}</span></div>`;
        
        if (age > 0) {
            html += `<div><span class="label">Age:</span> <span class="value">${age.toLocaleString()} ticks</span></div>`;
        }
        if (entity.skin_tag) {
            html += `<div><span class="label">Skin:</span> <span class="value">${entity.skin_tag}</span></div>`;
        }
        if (entity.target_domain) {
            html += `<div><span class="label">Portal →</span> <span class="value">${entity.target_domain}</span></div>`;
        }
        
        html += '</div>';
        
        container.innerHTML = html;
        
        // Trigger bar animations after a brief delay (so transition plays)
        requestAnimationFrame(() => {
            setTimeout(() => this._updateStatBars(entity), 50);
        });
    },
    
    _updateStatBars: function(entity) {
        const energyBar = document.getElementById('ecard-bar-energy');
        const cpuBar = document.getElementById('ecard-bar-cpu');
        const percBar = document.getElementById('ecard-bar-perception');
        
        if (energyBar && entity.energy !== undefined) {
            const pct = Math.max(0, Math.min(100, entity.energy));
            energyBar.style.width = pct + '%';
            // Update color class
            energyBar.classList.remove('low', 'mid');
            if (pct < 20) energyBar.classList.add('low');
            else if (pct < 50) energyBar.classList.add('mid');
        }
        if (cpuBar) {
            cpuBar.style.width = Math.min(100, (entity.cpu_glow || 0) * 100) + '%';
        }
        if (percBar) {
            percBar.style.width = Math.min(100, ((entity.perception_radius || 8) / 20) * 100) + '%';
        }
    },
    
    // ─── Footer Buttons ───────────────────────────────────────────
    
    _renderFooter: function(entity) {
        const footer = document.getElementById('ecard-footer');
        let html = '';

        // ── ACCIONES PROPIAS ──────────────────────────────────────────────
        // Igual que las barras: los botones eran de Being (WAKE / FOLLOW), y
        // ofrecerle "despertar" a una máquina recreativa no significa nada.
        // Quien abre la ficha puede traer sus verbos.
        if (Array.isArray(entity.acciones) && entity.acciones.length) {
            footer.innerHTML = entity.acciones.map((a, i) =>
                `<button class="ecard-btn" data-accion="${i}">[ ${a.etiqueta} ]</button>`
            ).join('') + `<button class="ecard-btn" id="ecard-btn-close">[ CERRAR ]</button>`;

            footer.querySelectorAll('[data-accion]').forEach(b => {
                b.onclick = () => {
                    const a = entity.acciones[+b.dataset.accion];
                    this.close();
                    a.hacer?.();
                };
            });
            footer.querySelector('#ecard-btn-close').onclick = () => this.close();
            return;
        }
        
        // WAKE button (beings only)
        if (entity.type === 'being') {
            html += `<button class="ecard-btn btn-wake" id="ecard-btn-wake" title="Wake this Being (W)">[ WAKE ]</button>`;
        }
        
        // ENTER portal button
        if (entity.target_domain) {
            html += `<button class="ecard-btn" id="ecard-btn-enter" title="Enter this domain">[ ENTER ]</button>`;
        }
        
        // FOLLOW button
        html += `<button class="ecard-btn" id="ecard-btn-follow" title="Lock camera (C)">[ FOLLOW ]</button>`;
        
        // CLOSE button
        html += `<button class="ecard-btn btn-close" id="ecard-btn-close" title="Close (Esc)">[ CLOSE ]</button>`;
        
        footer.innerHTML = html;
        
        // Wire events
        const wakeBtn = document.getElementById('ecard-btn-wake');
        if (wakeBtn) {
            wakeBtn.addEventListener('click', () => this._wakeEntity());
        }
        
        const enterBtn = document.getElementById('ecard-btn-enter');
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                this.close();
                if (typeof MainApp !== 'undefined') {
                    MainApp.changeDomain(entity.target_domain);
                }
            });
        }
        
        const followBtn = document.getElementById('ecard-btn-follow');
        if (followBtn) {
            followBtn.addEventListener('click', () => this._toggleFollow());
        }
        
        const closeBtn = document.getElementById('ecard-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    },
    
    // ─── Actions ──────────────────────────────────────────────────
    
    _wakeEntity: function() {
        if (!this.currentEntity) return;
        const entity = this.currentEntity;
        
        const btn = document.getElementById('ecard-btn-wake');
        if (btn) {
            btn.textContent = '[ SIGNAL SENT ]';
            btn.classList.add('btn-sent');
        }
        
        // BUG 3 FIX: Use unified overworld endpoint so signals flow properly
        const payload = { notify: true };
        const body = { verb: 'wake', payload: payload };
        const base = (typeof API_BASE !== 'undefined') ? API_BASE : ((window.location.protocol === 'file:' || window.location.port === '5500') ? 'http://127.0.0.1:8741' : '');
        
        fetch(`${base}/overworld/interact/${entity.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(res => res.json())
        .then(data => {
            if (typeof MainApp !== 'undefined' && MainApp.pushDramaEntry) {
                MainApp.pushDramaEntry(`System sent [wake] signal to ^${entity.id}^ via Card.`);
            }
        })
        .catch(err => {
            console.error('[EntityCard Wake Error]', err);
            if (btn) {
                btn.textContent = '[ FAILED ]';
                btn.classList.remove('btn-sent');
                btn.style.color = 'var(--neon-red)';
            }
        });
    },
    
    _toggleFollow: function() {
        if (!this.currentEntity || typeof MainApp === 'undefined') return;
        
        const btn = document.getElementById('ecard-btn-follow');
        if (!MainApp.targetEntityId) {
            MainApp.targetEntityId = this.currentEntity.id;
            if (btn) btn.textContent = '[ UNFOLLOW ]';
        } else {
            MainApp.targetEntityId = null;
            if (btn) btn.textContent = '[ FOLLOW ]';
        }
    }
};
