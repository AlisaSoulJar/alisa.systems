export const EnergyComponent = (config = {}) => ({
    maxEnergy: config.maxEnergy || 100.0,
    currentEnergy: config.currentEnergy !== undefined ? config.currentEnergy : 100.0,
    drainRate: config.drainRate || 1.5,
    isOn: config.isOn !== undefined ? config.isOn : true,
    hasDevice: config.hasDevice !== undefined ? config.hasDevice : false
});

export class EnergySystem {
    update(ecs, entities, dt) {
        for (const entityId of entities) {
            const energy = ecs.getComponent(entityId, 'EnergyComponent');
            if (!energy) continue;

            if (energy.hasDevice && energy.isOn) {
                if (energy.currentEnergy > 0) {
                    energy.currentEnergy -= energy.drainRate * dt;
                    if (energy.currentEnergy <= 0) {
                        energy.currentEnergy = 0;
                        energy.isOn = false;
                    }
                }
            }
        }
    }
}
