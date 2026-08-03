import * as THREE from 'three';

export class GeppettoKinematics {
    constructor() {
        this.defaults = {
            freq: 6.0,
            ampY: 0.15,
            wobbleZ: 0.05,
            rollX: 0.08
        };
    }

    applyKinematics(propHolder, elapsed, FLOAT_Y) {
        if (!propHolder) return;
        
        const rK = propHolder.userData.kinematics || {};
        const freq = rK.cycle_frequency_hz !== undefined ? rK.cycle_frequency_hz * 5.0 : this.defaults.freq;
        const bounceExt = rK.vertical_bounce !== undefined ? rK.vertical_bounce : this.defaults.ampY;
        const wobbleZ = rK.step_amplitude !== undefined ? rK.step_amplitude * 0.3 : this.defaults.wobbleZ;
        const rollX = rK.spine_flexion !== undefined ? rK.spine_flexion * 0.3 : this.defaults.rollX;

        const bounce = Math.abs(Math.sin(elapsed * freq)) * bounceExt;
        propHolder.position.y = FLOAT_Y + bounce;
        propHolder.rotation.z = Math.sin(elapsed * freq * 0.5) * wobbleZ;
        propHolder.rotation.x = Math.cos(elapsed * freq * 0.5) * rollX;

        // Procedural Squash and Stretch
        const squashPhase = Math.sin(elapsed * freq);
        const stretch = 1.0 + squashPhase * 0.08;
        const squash = 1.0 - squashPhase * 0.04;
        propHolder.scale.set(squash, stretch, squash);

        // Advanced Biological Gait Pattern
        if (propHolder.userData.joints && propHolder.userData.joints.length > 0) {
            const gait_freq = rK.cycle_frequency_hz !== undefined ? rK.cycle_frequency_hz * 5.0 : freq;
            
            propHolder.userData.joints.forEach(j => {
                const name = j.joint.name || "";
                let phase_offset = 0;
                
                // Diagonal Trot Pairing (Cross-Limb Coordination)
                if (name.includes('FL') || name.includes('BR')) phase_offset = 0;
                if (name.includes('FR') || name.includes('BL')) phase_offset = Math.PI;

                const swing = Math.sin(elapsed * gait_freq + phase_offset);
                
                if (name.includes('Femur')) {
                    j.joint.rotation.x = j.baseRot.x + swing * 0.6; // Hip swing
                } else if (name.includes('Tibia')) {
                    // Flex knee primarily during the forward swing phase
                    let flex = swing > 0 ? swing * 0.9 : swing * 0.1; 
                    
                    // Anatomical constraints: Front knees bend back (+X), Hind knees bend forwards (-X)
                    if (name.includes('F')) {
                        j.joint.rotation.x = j.baseRot.x - flex; 
                    } else {
                        j.joint.rotation.x = j.baseRot.x + flex;
                    }
                } else if (name.includes('Foot') || name.includes('Leg')) { 
                    j.joint.rotation.x = j.baseRot.x + swing * 0.4;
                } else if (name.includes('Neck') || name.includes('Head')) {
                    j.joint.rotation.x = j.baseRot.x + Math.sin(elapsed * gait_freq * 0.5) * 0.2;
                } else if (name.includes('Hindquarters')) {
                    j.joint.rotation.x = j.baseRot.x + Math.sin(elapsed * gait_freq * 0.5) * 0.15;
                } else {
                    // Default wriggle for unrecognized geometry
                    j.joint.rotation.z = j.baseRot.z + Math.sin(elapsed * j.speed + j.offset) * 0.2;
                    j.joint.rotation.x = j.baseRot.x + Math.sin(elapsed * (j.speed * 0.8) + j.offset) * 0.2;
                }
            });
        }
    }
}
