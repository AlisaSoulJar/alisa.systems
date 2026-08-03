/**
 * 🎬 ARCADE FX PLUGIN
 * --------------------------------------------------------------------------
 * Cinematic overlay effects for the Arcade Dojo experience.
 * Encapsulates CRT scanlines, transition vignettes, and contextual HUD —
 * all injected purely via JS into the DOM. Zero HTML dependency.
 * 
 * Usage:
 *   const fx = new ArcadeFXPlugin(hologramPlugin);
 *   gfx.plugins.push(fx);
 * 
 * @requires CSS3DHologramPlugin (observes its screenMode + isSeated)
 */
export class ArcadeFXPlugin {
    constructor(hologramPlugin) {
        this.hologram = hologramPlugin;
        this._lastMode = null;
        this._lastSeated = null;

        // ── Build DOM layers ──
        this._scanlines = this._createScanlines();
        this._vignette  = this._createVignette();
        this._hud       = this._createHUD();

        document.body.appendChild(this._scanlines);
        document.body.appendChild(this._vignette);
        document.body.appendChild(this._hud);
    }

    // ═══════════════════════════════════════════════════
    //  CRT SCANLINE OVERLAY
    // ═══════════════════════════════════════════════════
    _createScanlines() {
        const el = document.createElement('div');
        el.id = 'arcadefx-scanlines';
        Object.assign(el.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            pointerEvents: 'none',
            zIndex: '100000',       // Above the fullscreen overlay  
            opacity: '0',
            transition: 'opacity 0.6s ease',
            // Repeating gradient creates horizontal scan lines
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
            mixBlendMode: 'multiply'
        });
        return el;
    }

    _setScanlines(visible) {
        this._scanlines.style.opacity = visible ? '1' : '0';
    }

    // ═══════════════════════════════════════════════════
    //  CINEMATIC VIGNETTE
    // ═══════════════════════════════════════════════════
    _createVignette() {
        const el = document.createElement('div');
        el.id = 'arcadefx-vignette';
        Object.assign(el.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            pointerEvents: 'none',
            zIndex: '100001',
            opacity: '0',
            transition: 'opacity 0.8s ease',
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.85) 100%)'
        });
        return el;
    }

    /**
     * Flash the vignette for a transition pulse
     */
    _pulseVignette(durationMs = 600) {
        this._vignette.style.transition = `opacity ${durationMs / 2}ms ease`;
        this._vignette.style.opacity = '1';
        setTimeout(() => {
            this._vignette.style.opacity = '0';
        }, durationMs / 2);
    }

    _setVignette(visible) {
        this._vignette.style.opacity = visible ? '0.7' : '0';
    }

    // ═══════════════════════════════════════════════════
    //  CONTEXTUAL HOTKEY HUD
    // ═══════════════════════════════════════════════════
    _createHUD() {
        const el = document.createElement('div');
        el.id = 'arcadefx-hud';
        Object.assign(el.style, {
            position: 'fixed',
            bottom: '24px', left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: '100002',
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            padding: '8px 20px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            letterSpacing: '0.5px',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.4s ease'
        });
        return el;
    }

    _setHUD(text) {
        if (text) {
            this._hud.innerHTML = text;
            this._hud.style.opacity = '1';
        } else {
            this._hud.style.opacity = '0';
        }
    }

    // ═══════════════════════════════════════════════════
    //  HOTKEY MAP PER STATE
    // ═══════════════════════════════════════════════════
    _getHUDText(mode, seated) {
        if (mode === 'FULLSCREEN') {
            return '<span style="color:#ff6b6b">ESC</span> Exit Fullscreen';
        }
        if (mode === 'PROJECTED') {
            return '<span style="color:#ffd93d">CLICK</span> Fullscreen &nbsp;·&nbsp; <span style="color:#ff6b6b">ESC</span> Retract';
        }
        if (seated && mode === 'MOUNTED') {
            return '<span style="color:#6bffb8">CLICK</span> Screen &nbsp;·&nbsp; <span style="color:#ff6b6b">ESC</span> Stand Up';
        }
        // Standing — no persistent HUD, let the neon box speak
        return null;
    }

    // ═══════════════════════════════════════════════════
    //  PLUGIN LIFECYCLE
    // ═══════════════════════════════════════════════════
    onUpdate(dt) {
        const mode   = this.hologram.screenMode;
        const seated = this.hologram.isSeated;

        // Only react to state changes (not every frame)
        if (mode === this._lastMode && seated === this._lastSeated) return;

        // Detect a state change → fire vignette pulse
        if (this._lastMode !== null && mode !== this._lastMode) {
            this._pulseVignette(500);
        }

        // CRT Scanlines: visible when seated or deeper
        this._setScanlines(seated && mode !== 'FULLSCREEN');

        // Vignette: persistent gentle darken when seated in MOUNTED
        this._setVignette(seated && mode === 'MOUNTED');

        // Contextual HUD
        this._setHUD(this._getHUDText(mode, seated));

        this._lastMode = mode;
        this._lastSeated = seated;
    }
}
