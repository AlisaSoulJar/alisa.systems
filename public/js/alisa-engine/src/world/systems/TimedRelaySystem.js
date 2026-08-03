export const TimedRelayComponent = (config = {}) => ({
    timeRemaining: config.timeRemaining || 0,
    maxTime: config.maxTime || 13.0,
    isActive: config.isActive !== undefined ? config.isActive : false,
    triggered: false
});

export class TimedRelaySystem {
    update(ecs, entities, dt) {
        for (const entityId of entities) {
            const relay = ecs.getComponent(entityId, 'TimedRelayComponent');
            if (!relay) continue;

            relay.triggered = false;
            if (relay.isActive) {
                if (relay.timeRemaining > 0) {
                    relay.timeRemaining -= dt;
                    if (relay.timeRemaining <= 0) {
                        relay.timeRemaining = 0;
                        relay.isActive = false;
                        relay.triggered = true; // Signals that it just turned off
                    }
                }
            }
        }
    }
}
