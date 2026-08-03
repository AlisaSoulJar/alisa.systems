import * as THREE from 'three';

/**
 * ----------------------------------------------------
 * CAPA MUNDO: THE MATRIX (World.js)
 * ----------------------------------------------------
 * Representa el Arnés de la Realidad o el Motor Gráfico.
 * Delimita fronteras físicas globales, gravedad, tiempo (dt), y el registro de todos los Beings para Colisiones Sociales.
 */
export class RealWorldHarness {
    constructor(scene) {
        this.scene = scene;
        this.beings = []; // Registro de hermanos (Boids)
        this.gravity = -9.8;
        
        // Fronteras artificiales del entorno actual
        this.bounds = {
            minX: -100, maxX: 100,
            minY: 0, maxY: 100,
            minZ: -100, maxZ: 100
        };
    }

    /**
     * Inyecta un nuevo Ente a las leyes espaciales de esta instancia de realidad
     */
    registerBeing(sovereignBeing) {
        this.beings.push(sovereignBeing);
    }

    /**
     * Construye y entrega el Contexto del Entorno para los sentidos de un ser específico
     */
    getEnvironmentFor(being) {
        // En el futuro, usar Octrees o distancia espacial
        const siblings = this.beings.filter(b => b !== being);
        return {
            siblings: siblings,
            gravity: this.gravity,
            bounds: this.bounds
        };
    }
}
