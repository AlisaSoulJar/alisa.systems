export class RLGymBridge {
    /**
     * Initializes the RL Gym API on the global window object.
     * @param {Object} engine - The engine instance that implements `getObservationVector()`, `reset()`, and `stepSimulation()`.
     */
    constructor(engine) {
        this.engine = engine;
        this.isRLMode = false;

        // Expose to Python/Playwright global scope
        window.RLMode = this.isRLMode;
        
        window.setRLMode = (enabled) => {
            this.isRLMode = enabled;
            window.RLMode = enabled;
            if (this.engine.setRLMode) {
                this.engine.setRLMode(enabled);
            }
        };

        window.getObservationVector = () => {
            if (this.engine.getObservationVector) {
                return this.engine.getObservationVector();
            }
            console.warn('[RLGymBridge] Engine does not implement getObservationVector()');
            return { obs: [], meta: {} };
        };

        window.resetEpisode = (seed) => {
            if (this.engine.reset) {
                this.engine.reset(seed);
            } else {
                console.warn('[RLGymBridge] Engine does not implement reset(seed)');
            }
            return window.getObservationVector();
        };

        window.stepSimulation = (action, dt) => {
            if (this.engine.stepSimulation) {
                return this.engine.stepSimulation(action, dt, this.isRLMode);
            }
            console.warn('[RLGymBridge] Engine does not implement stepSimulation(action, dt)');
            return { obs: [], reward: 0, done: true, info: {} };
        };

        console.log('[RLGymBridge] Standard RL Hooks initialized on window object.');
    }
}
