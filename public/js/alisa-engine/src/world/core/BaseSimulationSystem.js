/**
 * BaseSimulationSystem.js
 * ═══════════════════════════════════════════════════════════════
 * Abstract base class for all avatar-pipeline simulation systems.
 * Provides common constructor pattern, logging, and animation
 * crossfade utilities so subclasses only implement their unique logic.
 * ═══════════════════════════════════════════════════════════════
 */
import * as THREE from 'three';

export class BaseSimulationSystem {
    /**
     * @param {Object} engine - AlisaRenderCore instance
     * @param {Object} envFactory - Corresponding BaseEnvironmentFactory subclass instance
     * @param {Object} [uiConfig] - UI element references { logElement, brainElement, ... }
     */
    constructor(engine, envFactory, uiConfig = {}) {
        this.engine = engine;
        this.env = envFactory;
        this.ui = uiConfig;

        /** @type {THREE.AnimationMixer|null} */
        this.mixer = null;
        /** @type {Object<string, THREE.AnimationAction>} */
        this.actions = {};
        /** @type {THREE.AnimationAction|null} */
        this.currentAction = null;
    }

    // ─── LOGGING ─────────────────────────────────────────────

    /**
     * Standardized log output. Override uiConfig.logElement to use.
     * @param {string} msg
     * @param {boolean} [highlight=false]
     */
    log(msg, highlight = false) {
        if (!this.ui.logElement) return;
        const e = document.createElement('div');
        e.className = 'log-entry' + (highlight ? ' highlight' : '');
        e.textContent = `> ${msg}`;
        this.ui.logElement.appendChild(e);
        // Keep log trimmed
        while (this.ui.logElement.children.length > 50) {
            this.ui.logElement.removeChild(this.ui.logElement.firstChild);
        }
    }

    // ─── ANIMATION CROSSFADE ─────────────────────────────────

    /**
     * Cross-fades from the current animation to a new one.
     * Works with any THREE.AnimationMixer-based system.
     *
     * @param {string} name - Clip name key in this.actions
     * @param {boolean} [loop=true] - Whether to loop the animation
     * @param {number} [speed=1.0] - Playback speed
     * @param {number} [fadeDuration=0.3] - Crossfade duration in seconds
     * @returns {THREE.AnimationAction|null}
     */
    playAnim(name, loop = true, speed = 1.0, fadeDuration = 0.3) {
        if (!this.actions[name]) return null;
        if (this.currentAction && this.currentAction !== this.actions[name]) {
            this.currentAction.fadeOut(fadeDuration);
        }
        const action = this.actions[name];
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.clampWhenFinished = !loop;
        action.timeScale = speed;
        action.fadeIn(fadeDuration);
        action.play();
        this.currentAction = action;
        return action;
    }

    /**
     * Initializes the animation mixer from a loaded GLTF.
     * @param {THREE.Object3D} target - The scene/object to animate
     * @param {THREE.AnimationClip[]} clips - Array of clips from gltf.animations
     */
    initMixer(target, clips) {
        this.mixer = new THREE.AnimationMixer(target);
        this.actions = {};
        for (const clip of clips) {
            this.actions[clip.name] = this.mixer.clipAction(clip);
        }
    }

    // ─── TICK (abstract) ─────────────────────────────────────

    /**
     * Called every frame by the render loop.
     * Subclasses MUST override this method.
     * @param {number} dt - Delta time in seconds
     * @param {number} elapsed - Total elapsed time
     */
    tick(dt, elapsed) {
        // Update mixer if present
        if (this.mixer) this.mixer.update(dt);
    }
}
