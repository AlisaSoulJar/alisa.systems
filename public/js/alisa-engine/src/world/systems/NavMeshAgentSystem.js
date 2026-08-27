/**
 * [ALISA V4 Engine: NavMeshAgentSystem]
 * Consumes the generated Angel's Egg NavMesh and performs FrontEnd A* pathfinding.
 * Part of the OverworldECS pipeline.
 */

import { Pathfinding } from './PathfindingSystem.js';

// ECS Component Definition
export const NavMeshAgentComponent = (speed = 4.0, turnSpeed = 8.0) => ({
    speed,
    turnSpeed,
    targetPosition: null, // {x, z}
    lastTargetPosition: null, // {x, z} cache for dynamic repathing
    pathCache: [], // Array of {x, z}
    currentPathIndex: 0,
    isPathing: false
});

export class NavMeshAgentSystem {
    constructor() {}

    /**
     * Helper to map World Coordinates to grid Indices
     */
    _worldToIndex(wx, wz, navMesh) {
        if (!navMesh || !navMesh.metadata || !navMesh.data) return null;
        const b = navMesh.metadata.bounds;
        const gs = navMesh.metadata.gridSize;
        
        let c = Math.round((wx - b.minX) / gs);
        let r = Math.round((wz - b.minZ) / gs);
        
        if (r < 0 || r >= navMesh.metadata.rows || c < 0 || c >= navMesh.metadata.cols) return null;
        return { r, c };
    }

    /**
     * ⚠️ EL A* SE FUE A `PathfindingSystem`, Y AQUÍ QUEDA LA TRADUCCIÓN.
     *
     * El algoritmo estaba escrito aquí dentro, bien hecho y headless, y no se
     * podía llamar desde ningún otro sitio: pedía un `navMesh` con su forma
     * —`metadata.bounds`, `data[r][c].w`— y devolvía metros. Un tower defense de
     * laberinto no tiene navmesh, tiene una matriz de celdas.
     *
     * Ahora este método hace lo que de verdad es suyo: pasar de metros a celdas,
     * preguntar, y pasar de celdas a metros. El camino más corto lo busca la
     * pieza. Comprobado con treinta caminos sobre una rejilla con muros: mismo
     * resumen `26da19bc` antes y después.
     */
    _calculatePath(startW, endW, navMesh) {
        if (!navMesh || !navMesh.data) return [];

        const startIdx = this._worldToIndex(startW.x, startW.z, navMesh);
        const endIdx = this._worldToIndex(endW.x, endW.z, navMesh);

        if (!startIdx || !endIdx) return [];

        const matrix = navMesh.data;
        const celdas = Pathfinding.buscar({
            filas: navMesh.metadata.rows,
            cols: navMesh.metadata.cols,
            pasable: (r, c) => matrix[r][c].w !== 0,
            desde: startIdx,
            hasta: endIdx,
        });
        return celdas.map(({ r, c }) => ({ x: matrix[r][c].x, z: matrix[r][c].z }));
    }

    /**
     * ⚠️ AQUÍ VIVÍA EL A*, Y SE HA IDO ENTERO A `PathfindingSystem`.
     *
     * Ciento dos lineas: el buscador, la heuristica octil y la
     * reconstruccion del camino. No se dejan «por si acaso» porque dejar dos
     * algoritmos escritos es justo lo que la extraccion venia a quitar: el
     * dia que alguien afine uno, el otro se queda atras y nadie se entera.
     *
     * Si hace falta mirarlo, esta en git.
     */

    update(world, entities, dt) {
        const navMesh = window.globalNavMesh || null;
        if (!navMesh) return; // No nav mesh available yet

        for (const entityId of entities) {
            const transform = world.getComponent(entityId, 'TransformComponent');
            const agent = world.getComponent(entityId, 'NavMeshAgentComponent');
            const velocity = world.getComponent(entityId, 'VelocityComponent');

            if (!transform || !agent) continue;

            // Need to recalculate path dynamically if target moves?
            if (agent.targetPosition) {
                let targetMoved = false;
                if (agent.lastTargetPosition) {
                    const dx = agent.targetPosition.x - agent.lastTargetPosition.x;
                    const dz = agent.targetPosition.z - agent.lastTargetPosition.z;
                    // Recalculate if target moved more than 2 meters
                    if ((dx * dx + dz * dz) > 4.0) {
                        targetMoved = true;
                    }
                } else {
                    targetMoved = true; // First time
                }

                if (!agent.isPathing || targetMoved) {
                    const startNode = { x: transform.x, z: transform.z };
                    const newPath = this._calculatePath(startNode, agent.targetPosition, navMesh);
                    
                    if (newPath.length > 0) {
                        agent.pathCache = newPath;
                        agent.currentPathIndex = 0;
                        agent.isPathing = true;
                        agent.lastTargetPosition = { x: agent.targetPosition.x, z: agent.targetPosition.z };
                    }
                }
            }

            // Path execution
            if (agent.isPathing && agent.pathCache.length > 0) {
                if (agent.currentPathIndex >= agent.pathCache.length) {
                    // Arrived
                    agent.isPathing = false;
                    agent.targetPosition = null;
                    agent.pathCache = [];
                    if (velocity) {
                        velocity.vx = 0;
                        velocity.vz = 0;
                    }
                    continue;
                }

                const targetNode = agent.pathCache[agent.currentPathIndex];
                const dx = targetNode.x - transform.x;
                const dz = targetNode.z - transform.z;
                const distanceSq = dx * dx + dz * dz;

                // Threshold reached?
                if (distanceSq < 0.25) { 
                    agent.currentPathIndex++;
                } else {
                    const dist = Math.sqrt(distanceSq);
                    const dirX = dx / dist;
                    const dirZ = dz / dist;

                    if (velocity) {
                        velocity.vx = dirX * agent.speed;
                        velocity.vz = dirZ * agent.speed;
                    } else {
                        // Apply directly if Velocity component is absent (non-kinematic setup)
                        transform.x += dirX * agent.speed * dt;
                        transform.z += dirZ * agent.speed * dt;
                    }

                    // Face direction
                    const targetAngle = Math.atan2(dirX, dirZ);
                    // Simple sudden rotation, maybe lerp later
                    transform.ry = targetAngle;
                }
            } else if (velocity) {
                // Not pathing
                velocity.vx = 0;
                velocity.vz = 0;
            }
        }
    }
}
