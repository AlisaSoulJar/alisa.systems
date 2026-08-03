/**
 * [ALISA V4 Engine: OverworldECS]
 * JIT Entity Component System for P2P Holographic World.
 * 
 * Manages Entities, Components, and Systems dynamically to allow JIT P2P streaming.
 * Handles the "Quantum Collapse" of processing: only process what is active/observed.
 */

export class ECSWorld {
    constructor() {
        this.entities = new Map(); // entityId -> { componentName: data }
        this.systems = []; // Array of { update: function(world, dt), query: [components] }
        this.nextEntityId = 1;
        this.queryCache = new Map();
    }

    createEntity() {
        const id = this.nextEntityId++;
        this.entities.set(id, {});
        this._invalidateCache();
        return id;
    }

    destroyEntity(entityId) {
        this.entities.delete(entityId);
        this._invalidateCache();
    }

    addComponent(entityId, componentName, data = {}) {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity[componentName] = data;
            this._invalidateCache();
        }
    }

    removeComponent(entityId, componentName) {
        const entity = this.entities.get(entityId);
        if (entity && entity[componentName]) {
            delete entity[componentName];
            this._invalidateCache();
        }
    }

    getComponent(entityId, componentName) {
        const entity = this.entities.get(entityId);
        return entity ? entity[componentName] : null;
    }

    /**
     * @param {Array<string>} componentNames 
     * @returns {Array<number>} Array of entity IDs that have all requested components
     */
    query(componentNames) {
        // Simple string key for cache
        const cacheKey = componentNames.sort().join('|');
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey);
        }

        const match = [];
        for (const [id, entityComponents] of this.entities.entries()) {
            let hasAll = true;
            for (const name of componentNames) {
                if (entityComponents[name] === undefined) {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) match.push(id);
        }

        this.queryCache.set(cacheKey, match);
        return match;
    }

    addSystem(systemFunc, requiredComponents = []) {
        this.systems.push({
            update: systemFunc,
            query: requiredComponents
        });
    }

    /**
     * Executes all registered systems
     * @param {number} dt Delta time
     */
    tick(dt) {
        for (const sys of this.systems) {
            const entities = this.query(sys.query);
            if (entities.length > 0 || sys.query.length === 0) {
                sys.update(this, entities, dt);
            }
        }
    }

    _invalidateCache() {
        this.queryCache.clear();
    }
}

/**
 * Common Standardized Components for ALISA v4
 */
export const TransformComponent = (x=0, y=0, z=0) => ({ x, y, z, rx:0, ry:0, rz:0 });
export const VelocityComponent = (vx=0, vy=0, vz=0) => ({ vx, vy, vz });
export const RenderProxyComponent = (object3d = null) => ({ object3d, isLoaded: !!object3d, isJIT: false });
export const P2PAssetStreamingComponent = (uri = "") => ({ uri, streamingState: "idle", blob: null });
