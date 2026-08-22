/**
 * FSMSystem.js — Universal Headless Finite State Machine
 * ═══════════════════════════════════════════════════════════════
 * OpenCore state machine with timers, state history, and
 * entry/exit lifecycle hooks. Used by PhantomFSM, ArachneBrain,
 * MarabuntaGame, CorporateSeeker, RaccoonCity, StealthSight, etc.
 * ═══════════════════════════════════════════════════════════════
 */

export class FSMSystem {
    /**
     * @param {Array<string>} states List of valid state names
     * @param {string} initialState The starting state
     */
    constructor(states = [], initialState = null) {
        this.states = new Set(states);
        this.currentState = initialState || (states.length > 0 ? states[0] : null);
        this.previousState = null;
        this.stateHistory = [];
        this.maxHistory = 20;
        
        // Transitions: { [state]: [ { target, condition, onTransition } ] }
        this.transitions = {};
        
        // Lifecycle callbacks: { [state]: { onTick, onEnter, onExit } }
        this.actions = {};
        this.enterCallbacks = {};
        this.exitCallbacks = {};
        
        // Timer support
        this.stateTimer = 0;       // Time spent in current state
        this.stateTimerTarget = 0; // Optional deadline
        
        this.blackboard = {}; // Shared memory for conditions
    }

    /**
     * Register a state with optional lifecycle callbacks.
     * @param {string} name
     * @param {Object} [callbacks]
     * @param {Function} [callbacks.onTick] - (blackboard, dt) called every tick
     * @param {Function} [callbacks.onEnter] - (blackboard, previousState) called on entry
     * @param {Function} [callbacks.onExit] - (blackboard, nextState) called on exit
     */
    addState(name, callbacks = null) {
        this.states.add(name);
        if (!this.currentState) this.currentState = name;

        if (callbacks) {
            if (typeof callbacks === 'function') {
                // Backward compat: addState(name, onTick)
                this.actions[name] = callbacks;
            } else {
                if (callbacks.onTick) this.actions[name] = callbacks.onTick;
                if (callbacks.onEnter) this.enterCallbacks[name] = callbacks.onEnter;
                if (callbacks.onExit) this.exitCallbacks[name] = callbacks.onExit;
            }
        }
    }

    /**
     * Define a transition rule.
     * @param {string} fromState 
     * @param {string} toState 
     * @param {Function} condition - (blackboard, dt, stateTimer) => boolean
     * @param {Function} [onTransition] - Optional callback on switch
     */
    addTransition(fromState, toState, condition, onTransition = null) {
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = [];
        }
        this.transitions[fromState].push({ target: toState, condition, onTransition });
    }

    /**
     * Force a state change with proper lifecycle callbacks.
     * @param {string} name
     */
    setState(name) {
        if (!this.states.has(name)) throw new Error(`FSMSystem: Invalid state ${name}`);
        this._doTransition(name);
    }

    /**
     * Set a timer that can be checked via `this.stateTimer` in conditions.
     * @param {number} seconds
     */
    setTimer(seconds) {
        this.stateTimerTarget = seconds;
    }

    /**
     * Check if the current state's timer has expired.
     * @returns {boolean}
     */
    isTimerExpired() {
        return this.stateTimerTarget > 0 && this.stateTimer >= this.stateTimerTarget;
    }

    /**
     * Internal transition with lifecycle hooks.
     * @param {string} nextState
     * @private
     */
    _doTransition(nextState) {
        const prev = this.currentState;
        
        // Exit callback
        if (prev && this.exitCallbacks[prev]) {
            this.exitCallbacks[prev](this.blackboard, nextState);
        }
        
        // Update history
        this.previousState = prev;
        if (prev) {
            this.stateHistory.push(prev);
            if (this.stateHistory.length > this.maxHistory) {
                this.stateHistory.shift();
            }
        }
        
        // Switch
        this.currentState = nextState;
        this.stateTimer = 0;
        this.stateTimerTarget = 0;
        
        // Enter callback
        if (this.enterCallbacks[nextState]) {
            this.enterCallbacks[nextState](this.blackboard, prev);
        }
    }

    /**
     * Tick the FSM — evaluates transitions then executes current state logic.
     * @param {number} dt - Delta time in seconds
     * @returns {string} Current state after tick
     */
    tick(dt) {
        if (!this.currentState) return null;

        // Accumulate timer
        this.stateTimer += dt;

        // 1. Check transitions for current state
        const rules = this.transitions[this.currentState] || [];
        for (const rule of rules) {
            if (rule.condition(this.blackboard, dt, this.stateTimer)) {
                if (rule.onTransition) rule.onTransition(this.blackboard);
                this._doTransition(rule.target);
                break; // Only one transition per tick
            }
        }

        // 2. Execute current state logic
        if (this.actions[this.currentState]) {
            this.actions[this.currentState](this.blackboard, dt, this.stateTimer);
        }
        
        return this.currentState;
    }

    /**
     * Was the FSM in a given state at some point in its recent history?
     * @param {string} stateName
     * @returns {boolean}
     */
    wasInState(stateName) {
        return this.stateHistory.includes(stateName);
    }

    /**
     * Get a debug snapshot.
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            current: this.currentState,
            previous: this.previousState,
            timer: parseFloat(this.stateTimer.toFixed(2)),
            timerTarget: this.stateTimerTarget,
            history: [...this.stateHistory].slice(-5),
            blackboard: { ...this.blackboard }
        };
    }
}
