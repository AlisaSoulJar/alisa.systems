export const HidingSpotComponent = (config = {}) => ({
    isSearched: config.isSearched || false,
    hasRaccoon: config.hasRaccoon || false,
    hasBattery: config.hasBattery || false,
    label: config.label || 'Cabinet',
    bspDist: config.bspDist || -1, 
    mesh: config.mesh || null // Reference to the 3D Object for interaction
});

export class HidingSpotSystem {
    update(ecs, entities, dt) {
        // Pure state container for now. 
        // Logic (like revealing the raccoon or updating BSP distance visual feedback)
        // is typically handled by the Interaction System upon 'E' / Click.
    }
}
