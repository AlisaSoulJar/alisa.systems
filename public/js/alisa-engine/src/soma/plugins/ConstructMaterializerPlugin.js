import * as THREE from 'three';

/**
 * ConstructMaterializerPlugin
 * Gestiona el material "Ghost" (translúcido/holográfico) de las entidades
 * cuando se están materializando en la niebla, e interpola hasta el material PBR final.
 */
export class ConstructMaterializerPlugin {
    constructor() {
        this.name = 'ConstructMaterializer';
        this.entities = [];
        
        // Material Ghost extraído de Trama Atlas Editor
        this.ghostMaterial = new THREE.MeshBasicMaterial({
            color: 0x2B6B77, // Cian oscuro TRAMA (o podemos usar ámbar 0xB8934D)
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            wireframe: true // Efecto grid de construcción
        });
    }

    /**
     * Registra una entidad (e.g., máquina arcade) para ser gestionada.
     * @param {Object} entity - Objeto con { grupo, materia }
     */
    registerEntity(entity) {
        if (!entity.grupo) return;
        
        // Guardar materiales originales y asignar Ghost a todas las mallas
        entity.originalMaterials = new Map();
        
        entity.grupo.traverse((child) => {
            if (child.isMesh) {
                entity.originalMaterials.set(child, child.material);
                
                // Empezar en modo "Ghost" (0% materializado)
                child.material = this.ghostMaterial;
                child.scale.setScalar(0.01); // Aparece colapsado inicialmente
            }
        });

        // Marcar estado interno
        entity._lastMateria = 0;
        this.entities.push(entity);
    }

    onUpdate(dt) {
        for (const e of this.entities) {
            // Si la materia ha cambiado (0 a 1)
            if (e.materia !== e._lastMateria) {
                const isSolid = e.materia >= 0.99;
                
                e.grupo.traverse((child) => {
                    if (child.isMesh) {
                        if (isSolid) {
                            // Restaurar material físico cuando está materializado
                            if (child.material === this.ghostMaterial) {
                                child.material = e.originalMaterials.get(child);
                            }
                            child.scale.setScalar(1.0);
                        } else {
                            // En proceso de materialización
                            child.material = this.ghostMaterial;
                            
                            // Escala va de 0.8 a 1.0 mientras materializa
                            const s = 0.8 + (e.materia * 0.2);
                            child.scale.setScalar(s);
                            
                            // Aumentar opacidad del holograma según materia
                            this.ghostMaterial.opacity = 0.2 + (e.materia * 0.8);
                        }
                    }
                });
                e._lastMateria = e.materia;
            }
        }
    }
}
