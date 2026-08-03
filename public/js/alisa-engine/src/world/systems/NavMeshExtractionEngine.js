import * as THREE from 'three';

/**
 * [ALISA Engine: NavMeshExtractionEngine]
 * "The Angel's Egg" Subsystem.
 * 
 * Purpose: Headless extraction of a 2D Navigation Grid (NavMesh) from chaotic 3D geometry.
 * Method: Volumetric top-down raycasting over a grid layout.
 */
export class NavMeshExtractionEngine {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.gridSize = options.gridSize || 0.5; // 0.5 meters per tile
        this.maxHeight = options.maxHeight || 2.0; // Agent height
        this.stepHeight = options.stepHeight || 0.3; // Max climbable obstacle
        this.rayOriginY = options.rayOriginY || 50;  // Cast from 50m above
        this.raycastGroup = new THREE.Group();
        this.gridMap = [];
        this.bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }

    /**
     * Rebuilds the walkable matrix
     * @param {THREE.Box3} arenaBounds - area to scan
     */
    extract(arenaBounds) {
        console.log(`[NavMeshExtractor] Initiating Angel's Scan...`);
        let startTime = performance.now();
        this.gridMap = [];
        this.bounds = {
            minX: Math.floor(arenaBounds.min.x / this.gridSize) * this.gridSize,
            maxX: Math.ceil(arenaBounds.max.x / this.gridSize) * this.gridSize,
            minZ: Math.floor(arenaBounds.min.z / this.gridSize) * this.gridSize,
            maxZ: Math.ceil(arenaBounds.max.z / this.gridSize) * this.gridSize,
        };

        const widthIter = Math.round((this.bounds.maxX - this.bounds.minX) / this.gridSize);
        const depthIter = Math.round((this.bounds.maxZ - this.bounds.minZ) / this.gridSize);
        
        console.log(`[NavMeshExtractor] Matrix Dimensions: ${widthIter}x${depthIter} (Resolution: ${this.gridSize}m)`);
        
        const raycaster = new THREE.Raycaster();
        const downVector = new THREE.Vector3(0, -1, 0);

        // Filter valid objects for intersection (exclude lights, cameras, hidden)
        const hitTargets = [];
        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.visible && !obj.userData.isHologram) {
                hitTargets.push(obj);
            }
        });

        // Loop and bombard the terrain
        for (let zOffset = 0; zOffset < depthIter; zOffset++) {
            let row = [];
            for (let xOffset = 0; xOffset < widthIter; xOffset++) {
                const worldX = this.bounds.minX + (xOffset * this.gridSize);
                const worldZ = this.bounds.minZ + (zOffset * this.gridSize);
                
                const origin = new THREE.Vector3(worldX, this.rayOriginY, worldZ);
                raycaster.set(origin, downVector);
                
                const intersects = raycaster.intersectObjects(hitTargets, false);
                
                let walkable = false;
                let elevation = 0;

                if (intersects.length > 0) {
                    // Check top most hit
                    const hit = intersects[0];
                    elevation = hit.point.y;
                    
                    // Simple heuristic: Normal facing somewhat UP means it's a floor.
                    if (hit.face) {
                        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
                        if (normal.y > 0.7) { // Within ~45 degrees of UP
                            walkable = true;
                        }
                    }

                    // Check if there is headroom for the agent
                    if (walkable && intersects.length > 1) {
                        for(let i=1; i < intersects.length; i++) {
                            const roofHit = intersects[i];
                            if (roofHit.point.y < elevation + this.maxHeight && roofHit.point.y > elevation) {
                                // Blocked by roof
                                walkable = false;
                                break;
                            }
                        }
                    }
                }

                row.push({
                    x: worldX,
                    z: worldZ,
                    y: elevation,
                    w: walkable ? 1 : 0
                });
            }
            this.gridMap.push(row);
        }

        let endTime = performance.now();
        console.log(`[NavMeshExtractor] Scan complete in ${Math.round(endTime - startTime)}ms. Tiles generated: ${widthIter * depthIter}`);

        return this.getExportPayload();
    }

    getExportPayload() {
        return {
            metadata: {
                generator: "Tenshi No Tamago V1",
                gridSize: this.gridSize,
                bounds: this.bounds,
                rows: this.gridMap.length,
                cols: this.gridMap.length > 0 ? this.gridMap[0].length : 0 
            },
            data: this.gridMap
        };
    }
}
