/**
 * [ALISA A* Pathfinding]
 * Grid-based pathfinding for isometric overworld.
 * Inspired by JohnBrx ISO-CORE click-to-move system.
 *
 * Usage:
 *   AStarPath.findPath(startX, startY, endX, endY, walkableCheck)
 *   Returns array of {x, y} nodes or null if unreachable.
 */

const AStarPath = {
    /**
     * Find path from (sx,sy) to (ex,ey).
     * @param {number} sx - Start X
     * @param {number} sy - Start Y
     * @param {number} ex - End X
     * @param {number} ey - End Y
     * @param {Function} isWalkable - (x, y) => boolean
     * @param {number} maxSteps - Safety limit (default 200)
     * @returns {Array|null} Array of {x, y} or null
     */
    findPath(sx, sy, ex, ey, isWalkable, maxSteps = 200) {
        // Trivial case
        if (sx === ex && sy === ey) return [];

        const key = (x, y) => `${x},${y}`;

        const openSet = new Map(); // key -> node
        const closedSet = new Set();

        const startNode = { x: sx, y: sy, g: 0, h: this._heuristic(sx, sy, ex, ey), parent: null };
        startNode.f = startNode.g + startNode.h;
        openSet.set(key(sx, sy), startNode);

        let iterations = 0;

        while (openSet.size > 0 && iterations < maxSteps) {
            iterations++;

            // Find node with lowest f in open set
            let current = null;
            for (const node of openSet.values()) {
                if (!current || node.f < current.f) {
                    current = node;
                }
            }

            if (current.x === ex && current.y === ey) {
                return this._reconstructPath(current);
            }

            const ck = key(current.x, current.y);
            openSet.delete(ck);
            closedSet.add(ck);

            // 8-directional neighbors
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 },
                { x: current.x + 1, y: current.y + 1 },
                { x: current.x - 1, y: current.y - 1 },
                { x: current.x + 1, y: current.y - 1 },
                { x: current.x - 1, y: current.y + 1 },
            ];

            for (const nb of neighbors) {
                const nk = key(nb.x, nb.y);
                if (closedSet.has(nk)) continue;
                if (!isWalkable(nb.x, nb.y)) {
                    closedSet.add(nk);
                    continue;
                }

                // Diagonal cost = sqrt(2) ≈ 1.41
                const isDiag = (nb.x !== current.x && nb.y !== current.y);
                const moveCost = isDiag ? 1.41 : 1.0;
                const tentativeG = current.g + moveCost;

                const existing = openSet.get(nk);
                if (existing && tentativeG >= existing.g) continue;

                const node = {
                    x: nb.x,
                    y: nb.y,
                    g: tentativeG,
                    h: this._heuristic(nb.x, nb.y, ex, ey),
                    parent: current
                };
                node.f = node.g + node.h;
                openSet.set(nk, node);
            }
        }

        return null; // No path found
    },

    _heuristic(x1, y1, x2, y2) {
        // Octile distance (better for 8-dir movement)
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
    },

    _reconstructPath(node) {
        const path = [];
        let current = node;
        while (current.parent) {
            path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        return path;
    }
};
