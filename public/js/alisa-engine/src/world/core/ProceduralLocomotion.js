export class ProceduralLocomotion {
    /**
     * Applies purely mathematical, procedural locomotion curves for massive Swarm rendering.
     * Serves as the procedural equivalent of Geppetto/Pygmalion for InstancedMeshes.
     */
    static apply(pattern, entityId, time, scale, speed, posX, posZ) {
        let dy = 0, dRotX = 0, dRotZ = 0;
        // Pseudo-random seed based ONLY on ID to prevent erratic high-frequency shaking
        let hash = 0;
        for (let i = 0; i < String(entityId).length; i++) hash += String(entityId).charCodeAt(i);
        const seed = hash * 12.345; 

        switch(pattern) {
            case 'hop': // Birds, Frogs, Marabuntas
                // Fast rectified sine wave for hopping when moving
                const hopSpeed = 15;
                const hopHeight = scale * 0.2;
                if (speed > 0.05) {
                    dy = Math.max(0, Math.sin(time * hopSpeed + seed)) * hopHeight;
                    dRotX = Math.cos(time * hopSpeed + seed) * 0.15; // Pitch forward/backwards
                } else {
                    // Idle breathing
                    dy = Math.sin(time * 2 + seed) * (scale * 0.03);
                }
                break;
                
            case 'scurry': // Roaches, Mice, Spiders
                // Erratic side-to-side wiggle, stays low to ground
                const wiggleSpeed = 25;
                if (speed > 0.05) {
                    dRotZ = Math.sin(time * wiggleSpeed + seed) * 0.2; // Wiggle roll
                    dy = Math.abs(Math.cos(time * wiggleSpeed * 0.5 + seed)) * (scale * 0.05); // Tiny bouncing
                }
                break;
                
            case 'hover': // Bees, Drones
                const hoverSpeed = 5;
                dy = Math.sin(time * hoverSpeed + seed) * (scale * 0.5);
                dRotX = Math.sin(time * hoverSpeed * 1.5 + seed) * 0.05;
                dRotZ = Math.cos(time * hoverSpeed * 1.2 + seed) * 0.05;
                break;
                
            case 'slither': // Snakes, Worms
                const slitherSpeed = 10;
                if (speed > 0.05) {
                    // Sine wave around Y axis usually handled by rotY, but we add body roll
                    dRotZ = Math.sin(time * slitherSpeed + seed) * 0.15; 
                }
                break;
        }

        return { dy, dRotX, dRotZ };
    }
}
