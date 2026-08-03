/**
 * States.js - The Hormonal Domain (El Humor Temporal)
 * Maps mathematically to the 9 hormones of hormones.json
 */

export const States = {
    DOPAMINERGIC: 'dopaminergic',       // Euphoria/Exploration
    SEROTONERGIC: 'serotonergic',       // Calm/Satisfaction
    OXYTOCINIC: 'oxytocinic',           // Social/Herd-bonding
    CORTISOLIC: 'cortisolic',           // Stress/Panic/Jitter
    ADRENERGIC: 'adrenergic',           // Fight/Flight, Max Speed
    NOREPINEPHRIC: 'norepinephric',     // Absolute focus/Tunnel Vision
    GABERGIC: 'gabergic',               // Inhibitory/Slowdown
    ENDORPHINIC: 'endorphinic',         // Reckless/Ignores Fear
    MELATONIC: 'melatonic',             // Sleep
    NEUTRAL: 'neutral'                  // Baseline
};

/**
 * Applies transient hormonal modifiers to an entity's base physics.
 */
export function applyStateModifiers(state, baseSpeed) {
    let modifiers = {
        speedMult: 1.0,
        turnSmoothness: 10.0,
        jitter: 0.0,
        cohesionBias: 1.0,   // For Swarm/Boids
        fearBias: 1.0        // For Psyches that evaluate threat
    };

    switch(state) {
        case States.DOPAMINERGIC:
            modifiers.speedMult = 1.2; 
            modifiers.turnSmoothness = 5.0; // Very smooth, relaxed turns
            modifiers.fearBias = 0.5;       // Less afraid to explore
            break;
            
        case States.SEROTONERGIC:
            modifiers.speedMult = 0.8;
            modifiers.turnSmoothness = 3.0; // Chill movement
            break;
            
        case States.OXYTOCINIC:
            modifiers.speedMult = 0.9;
            modifiers.cohesionBias = 5.0;   // Massive magnetic pull to siblings
            modifiers.turnSmoothness = 15.0; // Quick correction to stay in group
            break;
            
        case States.CORTISOLIC:
            modifiers.speedMult = 1.3;
            modifiers.turnSmoothness = 20.0; // Snap turns, erratic
            modifiers.jitter = 0.5;          // Random noise in vector
            modifiers.fearBias = 3.0;        // Highly reactive to threats
            break;
            
        case States.ADRENERGIC:
            modifiers.speedMult = 2.0;       // Double speed burst
            modifiers.turnSmoothness = 60.0; // Instant turns, robot-like snapping
            modifiers.fearBias = 0.1;        // Ignores all caution
            break;
            
        case States.NOREPINEPHRIC:
            modifiers.speedMult = 1.5;
            modifiers.turnSmoothness = 2.0;  // Stiff trajectory, very slow to get distracted
            modifiers.fearBias = 0.0;        // Absolute tunnel vision on primary target
            break;
            
        case States.GABERGIC:
            modifiers.speedMult = 0.4;       // Heavy inhibition
            modifiers.turnSmoothness = 1.0;  // Extremely slow turning radius
            modifiers.jitter = 0.0;
            break;
            
        case States.ENDORPHINIC:
            modifiers.speedMult = 1.1;
            modifiers.fearBias = 0.0;        // Absolute fear removal (painkiller effect)
            break;
            
        case States.MELATONIC:
            modifiers.speedMult = 0.0;       // Sleeping / No movement
            modifiers.turnSmoothness = 0.0;
            break;
            
        case States.NEUTRAL:
        default:
            break;
    }

    return modifiers;
}
