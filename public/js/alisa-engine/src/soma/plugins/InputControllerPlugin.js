// InputControllerEngine.js - Deterministic Input Adapter for ML-Gym decoupling

export class InputControllerPlugin {
    constructor() {
        this.keybinds = {}; // e.code -> actionName
        this.axisBindings = {}; // axisName -> { negative: e.code, positive: e.code }
        
        // Raw hardware state
        this._hardwareKeys = {};
        
        // Processed deterministic state
        this.state = {
            actions: {}, // actionName -> boolean
            justPressed: {}, // actionName -> boolean (true only for one tick)
            timeHeld: {}, // actionName -> float (seconds)
            axes: {} // axisName -> float (-1 to 1)
        };
        
        // Track previous state for "justPressed" logic
        this._prevActions = {};
        this._lastTickTime = performance.now();
        
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundKeyUp = this._onKeyUp.bind(this);
    }

    /**
     * Attaches DOM event listeners to capture hardware input
     * @param {HTMLElement|Window} target The DOM element to attach to
     */
    attach(target = window) {
        target.addEventListener('keydown', this._boundKeyDown);
        target.addEventListener('keyup', this._boundKeyUp);
    }

    /**
     * Detaches DOM event listeners
     * @param {HTMLElement|Window} target The DOM element to detach from
     */
    detach(target = window) {
        target.removeEventListener('keydown', this._boundKeyDown);
        target.removeEventListener('keyup', this._boundKeyUp);
    }

    _onKeyDown(e) {
        if (e.repeat) return;
        this._hardwareKeys[e.code] = true;
    }

    _onKeyUp(e) {
        this._hardwareKeys[e.code] = false;
    }

    /**
     * Map a specific keyboard code to a boolean action
     * @param {string} code event.code (e.g. 'Space', 'KeyW')
     * @param {string} actionName Name of the action (e.g. 'jump')
     */
    bindKey(code, actionName) {
        if (!this.keybinds[actionName]) this.keybinds[actionName] = [];
        this.keybinds[actionName].push(code);
        this.state.actions[actionName] = false;
        this.state.justPressed[actionName] = false;
        this._prevActions[actionName] = false;
    }

    /**
     * Map two keys to a localized axis (-1.0 to 1.0)
     * @param {string} negativeCode event.code for -1.0
     * @param {string} positiveCode event.code for +1.0
     * @param {string} axisName Name of the axis (e.g. 'horizontal')
     */
    bindAxis(negativeCode, positiveCode, axisName) {
        this.axisBindings[axisName] = { negative: negativeCode, positive: positiveCode };
        this.state.axes[axisName] = 0.0;
    }

    /**
     * Process input for the current frame
     * @param {Object} overrideState If provided (e.g., from ML Gym), completely overrides hardware state
     */
    tick(overrideState = null) {
        // 1. Snapshot previous state
        for (let action in this.state.actions) {
            this._prevActions[action] = this.state.actions[action];
        }

        // 2. Either use hardware keys or ML override
        if (overrideState) {
            // ML Override injection
            if (overrideState.actions) {
                for (let action in this.state.actions) {
                    this.state.actions[action] = !!overrideState.actions[action];
                }
            }
            if (overrideState.axes) {
                for (let axis in this.state.axes) {
                    this.state.axes[axis] = overrideState.axes[axis] || 0.0;
                }
            }
        } else {
            // Compute from bound hardware tracking
            for (let action in this.keybinds) {
                let isPressed = false;
                for (let code of this.keybinds[action]) {
                    if (this._hardwareKeys[code]) {
                        isPressed = true;
                        break;
                    }
                }
                this.state.actions[action] = isPressed;
            }

            for (let axis in this.axisBindings) {
                let val = 0.0;
                const bind = this.axisBindings[axis];
                if (this._hardwareKeys[bind.negative]) val -= 1.0;
                if (this._hardwareKeys[bind.positive]) val += 1.0;
                this.state.axes[axis] = val;
            }
        }

        // 3. Compute 'justPressed' and 'timeHeld'
        const now = performance.now();
        const dt = (now - this._lastTickTime) / 1000.0;
        this._lastTickTime = now;
        
        for (let action in this.state.actions) {
            this.state.justPressed[action] = this.state.actions[action] && !this._prevActions[action];
            
            if (this.state.actions[action]) {
                if (this.state.justPressed[action]) this.state.timeHeld[action] = 0.0;
                else this.state.timeHeld[action] = (this.state.timeHeld[action] || 0.0) + dt;
            } else {
                this.state.timeHeld[action] = 0.0;
            }
        }
    }

    /**
     * Check if an action is currently held down
     */
    isDown(actionName) {
        return !!this.state.actions[actionName];
    }

    /**
     * Check if an action was pressed EXACTLY this frame
     */
    justPressed(actionName) {
        return !!this.state.justPressed[actionName];
    }

    /**
     * Get the floating point value of an axis (-1 to 1)
     */
    getAxis(axisName) {
        return this.state.axes[axisName] || 0.0;
    }
    
    /**
     * Get the time in seconds that an action has been continuously held down
     */
    timeHeld(actionName) {
        return this.state.timeHeld[actionName] || 0.0;
    }
}

