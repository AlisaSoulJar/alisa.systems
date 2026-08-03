/**
 * [ALISA V4 Engine: NavMeshAgentSystem]
 * Consumes the generated Angel's Egg NavMesh and performs FrontEnd A* pathfinding.
 * Part of the OverworldECS pipeline.
 */

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
     * Precalculates an A* path over the NavMesh
     */
    _calculatePath(startW, endW, navMesh) {
        if (!navMesh || !navMesh.data) return [];

        const startIdx = this._worldToIndex(startW.x, startW.z, navMesh);
        const endIdx = this._worldToIndex(endW.x, endW.z, navMesh);

        if (!startIdx || !endIdx) return [];

        const matrix = navMesh.data;
        const rows = navMesh.metadata.rows;
        const cols = navMesh.metadata.cols;
        
        // Target unreachable
        if (matrix[endIdx.r][endIdx.c].w === 0) return [];

        const openList = [];
        const openSetKeys = new Set();
        const closedList = new Set();
        const cameFrom = new Map();

        const gScore = new Map();
        const fScore = new Map();

        const nodeKey = (r, c) => `${r},${c}`;

        const startKey = nodeKey(startIdx.r, startIdx.c);
        gScore.set(startKey, 0);
        fScore.set(startKey, this._heuristic(startIdx, endIdx));

        openList.push({ r: startIdx.r, c: startIdx.c, f: fScore.get(startKey) });
        openSetKeys.add(startKey);

        // Preallocate neighbors to avoid gc
        const neighbors = [
            { dr: -1, dc: 0, cost: 1 }, { dr: 1, dc: 0, cost: 1 },
            { dr: 0, dc: -1, cost: 1 }, { dr: 0, dc: 1, cost: 1 },
            { dr: -1, dc: -1, cost: 1.414 }, { dr: -1, dc: 1, cost: 1.414 },
            { dr: 1, dc: -1, cost: 1.414 }, { dr: 1, dc: 1, cost: 1.414 }
        ];

        while (openList.length > 0) {
            // Get node with lowest fScore
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift();
            const currentKey = nodeKey(current.r, current.c);
            openSetKeys.delete(currentKey);

            if (current.r === endIdx.r && current.c === endIdx.c) {
                // Reconstruct path
                return this._reconstructPath(cameFrom, currentKey, matrix);
            }

            closedList.add(currentKey);

            for (let n of neighbors) {
                const nr = current.r + n.dr;
                const nc = current.c + n.dc;

                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (matrix[nr][nc].w === 0) continue; // Obstacle

                const nKey = nodeKey(nr, nc);
                if (closedList.has(nKey)) continue;

                const tentative_gScore = gScore.get(currentKey) + n.cost;

                if (!gScore.has(nKey) || tentative_gScore < gScore.get(nKey)) {
                    cameFrom.set(nKey, currentKey);
                    gScore.set(nKey, tentative_gScore);
                    const h = this._heuristic({ r: nr, c: nc }, endIdx);
                    const f = tentative_gScore + h;
                    fScore.set(nKey, f);
                    
                    if (!openSetKeys.has(nKey)) {
                        openList.push({ r: nr, c: nc, f: f });
                        openSetKeys.add(nKey);
                    }
                }
            }
        }

        return []; // No path found
    }

    _heuristic(posA, posB) {
        // Octile distance heuristic for 8-way movement
        const dx = Math.abs(posA.c - posB.c);
        const dy = Math.abs(posA.r - posB.r);
        return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    }

    _reconstructPath(cameFrom, currentKey, matrix) {
        const path = [];
        let curr = currentKey;
        while (cameFrom.has(curr)) {
            const [r, c] = curr.split(',').map(Number);
            const wPos = matrix[r][c];
            path.unshift({ x: wPos.x, z: wPos.z });
            curr = cameFrom.get(curr);
        }
        return path;
    }

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
