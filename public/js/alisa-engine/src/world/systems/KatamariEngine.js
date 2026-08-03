import { KatamariSystem } from './KatamariSystem.js';
import { KatamariFactory } from '../factories/KatamariFactory.js';

export class KatamariEngine {
    constructor(core = {}, config = {}) {
        this.core = core;
        this.scene = core.scene;
        this.camera = core.camera;
        
        this.system = new KatamariSystem(config);
        if (this.scene) this.factory = new KatamariFactory(this.scene, this.camera, '../');
        
        this.elapsedTime = 0;
        this.running = false;
    }

    boot() {
        this.system.init();
        if (this.factory) this.factory.buildAll(this.system.chunkCount);
        this.running = true;
        this.elapsedTime = 0;
    }

    tick(dt) {
        if (!this.running) return;
        this.elapsedTime += dt;
        
        this.system.update(dt);
        
        const state = this.system.getState();
        if (this.factory) this.factory.syncToEngine(state, dt, this.elapsedTime);
        
        return {
            size: state.core.radius,
            objCount: state.attachedCount
        };
    }
}
