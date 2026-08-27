import * as THREE from 'three';

/**
 * 🏎️ KINEMATIC CONTROLLER ENGINE
 * --------------------------------------------------------------------------
 * Takes deterministic input state from an InputControllerEngine and applies
 * movement physics (Thrust, Drag, Gravity) to a specific mesh target.
 * Replaces hardcoded movement logic in sim_chopper, sim_predator, sim_asteroids.
 *
 * ⚠️ ESA ÚLTIMA FRASE ES UNA PROMESA QUE NUNCA SE CUMPLIÓ, Y HAY DOS MOTIVOS.
 *
 * `sistemas.mjs` lo declara ÁTOMO DE MOVIMIENTO —está en la lista, junto a Boids,
 * IDM y los demás— y `motores.mjs` lo cuenta entre los dormidos: cero llamadores.
 * Un átomo anunciado que no usa nadie. Medido el 27-08, por qué:
 *
 *   · IMPORTA THREE, cinco usos y los cinco de `Vector3`. Los núcleos que podrían
 *     adoptarlo corren sin pantalla, así que hoy no pueden — y ése es el mismo
 *     muro que tienen los otros ocho motores no-headless del inventario.
 *
 *   · Y TIENE CUATRO MODOS DENTRO (`AERIAL_6DOF`, `SHMUP_2D`, `KATAMARI_ROLL`,
 *     `FPS_WALK`). Eso choca de frente con la regla de extracción de esta casa:
 *     se separa una pieza cuando la diferencia cabe en un número o una bandera
 *     SIN que ningún llamador cambie de conducta; volar en seis grados y andar
 *     por el suelo son leyes distintas, no dos valores del mismo parámetro. Por
 *     eso `BallisticSystem` y `KinematicRageSystem` son dos y no uno.
 *
 * O sea que despertarlo no es quitarle el THREE: es decidir si se parte en las
 * leyes que lleva dentro. Escrito aquí para que la próxima que lo mire no empiece
 * por el `Vector3` creyendo que es lo único.
 */
export class KinematicControllerSystem {
    constructor() {
        this.targetNode = null;
        this.inputEngine = null; // Ref to InputControllerEngine
        
        // Physics state
        this.velocity = new THREE.Vector3();
        this.angularVel = new THREE.Vector3();
        this.isGrounded = false;
        
        // Profiles
        this.mode = 'AERIAL_6DOF'; // 'AERIAL_6DOF' | 'SHMUP_2D' | 'KATAMARI_ROLL' | 'FPS_WALK'
        
        this.config = {
            maxSpeed: 90.0,
            thrustPos: 40.0, // Acceleration power forward
            thrustNeg: 20.0, // Braking / Reverse power
            drag: 2.5,       // Air or ground friction
            gravity: 9.8,
            turnSpeed: 2.0,
            yBound: 0.0 // Don't fall below this Y
        };
    }

    setTarget(mesh) { this.targetNode = mesh; }
    setInput(inputEngine) { this.inputEngine = inputEngine; }
    
    configure(configOverrides) {
        Object.assign(this.config, configOverrides);
        if (configOverrides.mode) this.mode = configOverrides.mode;
    }

    update(dt) {
        if (!this.targetNode || !this.inputEngine) return;

        const state = this.inputEngine.state;
        
        if (this.mode === 'AERIAL_6DOF') {
            // e.g. Helicopter: Pitch/Yaw/Lift
            const forwardAxis = state.axes['pitch'] || 0; // W/S maps to pitch/forward
            const turnAxis = state.axes['yaw'] || 0; // A/D maps to yaw
            const liftAxis = state.axes['lift'] || 0; // Space/Ctrl maps to vertical lift

            // Rotation
            this.targetNode.rotation.y -= turnAxis * this.config.turnSpeed * dt;
            const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(this.targetNode.rotation);
            
            // Thrust along lookDir
            const thrust = lookDir.multiplyScalar(forwardAxis * this.config.thrustPos);
            const verticalThrust = new THREE.Vector3(0, liftAxis * this.config.thrustPos, 0);

            // Add forces
            this.velocity.add(thrust.multiplyScalar(dt));
            this.velocity.add(verticalThrust.multiplyScalar(dt));

            // Gravity (AERIAL uses mild generic downward force)
            this.velocity.y -= this.config.gravity * dt;

            // Drag
            this.velocity.multiplyScalar(1.0 - Math.min(dt * this.config.drag, 1.0));

            // Apply limits
            if (this.velocity.length() > this.config.maxSpeed) {
                this.velocity.setLength(this.config.maxSpeed);
            }

            // Move
            this.targetNode.position.add(this.velocity.clone().multiplyScalar(dt));

            // Hard ground bounce
            if (this.targetNode.position.y < this.config.yBound) {
                this.targetNode.position.y = this.config.yBound;
                this.velocity.y = 0;
            }

        } else if (this.mode === 'SHMUP_2D') {
            // E.g. Asteroids ship
            const thrustAxis = state.axes['thrust'] || 0; // Up Arrow
            const turnAxis = state.axes['yaw'] || 0;     // Left/Right arrows

            this.targetNode.rotation.y -= turnAxis * this.config.turnSpeed * dt;
            const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(this.targetNode.rotation);

            if (thrustAxis > 0) {
                this.velocity.add(lookDir.multiplyScalar(this.config.thrustPos * dt));
            }

            // Drag
            this.velocity.multiplyScalar(1.0 - Math.min(dt * this.config.drag, 1.0));

            // Apply limits
            if (this.velocity.length() > this.config.maxSpeed) {
                this.velocity.setLength(this.config.maxSpeed);
            }

            this.targetNode.position.add(this.velocity.clone().multiplyScalar(dt));
            // No vertical movement
        }
    }
}
