export const ElevatorComponent = (params = {}) => ({
    currentFloor: params.currentFloor || 1,
    targetFloor: params.targetFloor || -1,
    y: params.y || 0,
    moving: params.moving || false,
    speed: params.speed || 12.0,
    floorHeight: params.floorHeight || 5.0,
    onFloorReached: params.onFloorReached || null
});

export class ElevatorSystem {
    update(ecs, entities, dt) {
        for (const entityId of entities) {
            const el = ecs.getComponent(entityId, 'ElevatorComponent');
            if (!el) continue;
            
            if (el.moving && el.targetFloor !== -1) {
                const targetY = el.targetFloor * el.floorHeight;
                const dist = targetY - el.y;
                
                if (Math.abs(dist) <= el.speed * dt) {
                    el.y = targetY;
                    el.currentFloor = el.targetFloor;
                    el.targetFloor = -1;
                    el.moving = false;
                    
                    if (el.onFloorReached) {
                        el.onFloorReached(entityId, el.currentFloor);
                    }
                } else {
                    el.y += Math.sign(dist) * el.speed * dt;
                }
            }
        }
    }
}
