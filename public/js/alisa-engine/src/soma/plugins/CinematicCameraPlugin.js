import * as THREE from 'three';

/**
 * 🎥 CINEMATIC CAMERA ENGINE
 * --------------------------------------------------------------------------
 * Handles generic spring-damper smoothing, tracking, and isometric pinning 
 * for any dynamically spawned target in the Overworld Engine.
 */
export class CinematicCameraPlugin {
    constructor(camera, mode = 'SPRING_FOLLOW') {
        this.camera = camera;
        this.mode = mode; // 'SPRING_FOLLOW' | 'ISOMETRIC_ORBIT' | 'FPS_ANCHOR'
        
        // Physics tracking state
        this.targetNode = null;
        this.trackedPos = new THREE.Vector3(); // Spring dummy point
        this.trackedVel = new THREE.Vector3(); // Spring velocity
        
        // Configuration
        this.config = {
            offset: new THREE.Vector3(0, 50, 50), // Cam relation to target
            lookOffset: new THREE.Vector3(0, 0, 0), // Look target offset
            springStrength: 25.0, // Stiffer = follows tighter
            damping: 10.0, // Friction on spring
            fpsHeight: 1.5 // Height offset if in FPS mode
        };
    }

    /**
     * Set the mesh or group the camera should track
     * @param {THREE.Object3D} mesh Node to track
     */
    setTarget(mesh) {
        this.targetNode = mesh;
        if (mesh) {
            mesh.getWorldPosition(this.trackedPos);
            this.trackedVel.set(0, 0, 0);
        }
    }

    /**
     * Update configuration parameters dynamically
     */
    configure(configOverrides) {
        if (configOverrides.offset) this.config.offset.fromArray(configOverrides.offset);
        if (configOverrides.lookOffset) this.config.lookOffset.fromArray(configOverrides.lookOffset);
        if (configOverrides.springStrength !== undefined) this.config.springStrength = configOverrides.springStrength;
        if (configOverrides.damping !== undefined) this.config.damping = configOverrides.damping;
        if (configOverrides.mode) this.mode = configOverrides.mode;
        if (configOverrides.fpsHeight !== undefined) this.config.fpsHeight = configOverrides.fpsHeight;
    }

    /**
     * Call every frame in the render loop dt
     * @param {number} dt Delta time in seconds
     */
    onUpdate(dt) {
        if (!this.targetNode) return;

        const targetRealPos = new THREE.Vector3();
        this.targetNode.getWorldPosition(targetRealPos);

        if (this.mode === 'SPRING_FOLLOW' || this.mode === 'ISOMETRIC_ORBIT') {
            // Compute hooke's law (Spring)
            const displacement = new THREE.Vector3().subVectors(targetRealPos, this.trackedPos);
            const springForce = displacement.multiplyScalar(this.config.springStrength);
            
            // Apply damping
            const dampingForce = this.trackedVel.clone().multiplyScalar(-this.config.damping);
            const totalForce = springForce.add(dampingForce);
            
            // Euler Integration
            this.trackedVel.add(totalForce.multiplyScalar(dt));
            this.trackedPos.add(this.trackedVel.clone().multiplyScalar(dt));

            if (this.mode === 'SPRING_FOLLOW') {
                this.camera.position.subVectors(this.trackedPos, this.config.offset);
            } else if (this.mode === 'ISOMETRIC_ORBIT') {
                // Fixed isometric angle
                this.camera.position.copy(this.trackedPos).add(this.config.offset);
            }

            // Always look at the tracked soft position
            const lookPos = this.trackedPos.clone().add(this.config.lookOffset);
            this.camera.lookAt(lookPos);
            
        } else if (this.mode === 'FPS_ANCHOR') {
            // Instantly stick to target proxy head
            this.camera.position.copy(targetRealPos);
            this.camera.position.y += this.config.fpsHeight;
            // The renderer or mouse controller usually handles lookAt in FPS
        }
    }
}
