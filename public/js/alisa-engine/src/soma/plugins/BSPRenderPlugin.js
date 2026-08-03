/**
 * BSP RENDER ENGINE
 * ----------------------------------------------------
 * High-performance deterministic engine for generating BSP-based room logic.
 * Decoupled from Three.js rendering to support headless ML training and pathing.
 */
export class BSPRenderPlugin {
    constructor() {}

    /**
     * Generates a structural room layout using Binary Space Partitioning (BSP).
     * @param {Function} rng Deterministic RNG function (e.g. mulberry32)
     * @param {number} roomW Total width of the arena
     * @param {number} roomD Total depth of the arena
     * @param {number} cuts Number of recursive cuts to perform
     * @returns {Object} JSON payload with { rooms: [], walls: [] }
     */
    static generateBSPTopology(rng, roomW, roomD, cuts) {
        const rooms = [];
        const walls = [];

        function doBsp(bx, bz, bw, bd, depth, path, forceType = null) {
            // Semantic zoning
            let type = forceType;
            if (!type) {
                // A corridor is usually narrow and long. If it's disproportionate assumed corridor
                if (bw / bd > 3.0 || bd / bw > 3.0) type = 'corridor';
                else type = 'room';
            }

            if (depth <= 0 || bw < 4 || bd < 4 || type === 'corridor') {
                rooms.push({ x: bx, z: bz, w: bw, d: bd, id: rooms.length, path: path, type: type });
                return;
            }

            const splitH = bw > bd * 1.3 ? false : (bd > bw * 1.3 ? true : rng() > 0.5);
            
            // 40% chance of making a corridor cut instead of a binary cut if room is big enough
            const makeCorridor = (rng() < 0.4 && bw > 7 && bd > 7);
            const cw = 2.5; // Corridor width/depth

            const ratio = 0.35 + rng() * 0.3;

            if (splitH) {
                const splitZ1 = bz + bd * ratio;
                
                if (makeCorridor && splitZ1 + cw < bz + bd - 3) {
                    // Tri-split with corridor in the middle
                    const splitZ2 = splitZ1 + cw;
                    walls.push({ x: bx, z: splitZ1, w: bw, d: 0, isHorizontal: true });
                    walls.push({ x: bx, z: splitZ2, w: bw, d: 0, isHorizontal: true });
                    
                    doBsp(bx, bz, bw, splitZ1 - bz, depth - 1, path + '0', null);
                    if (depth > 1) { 
                        rooms.push({ x: bx, z: splitZ1, w: bw, d: cw, id: rooms.length, path: path + 'C', type: 'corridor' });
                    }
                    doBsp(bx, splitZ2, bw, (bz + bd) - splitZ2, depth - 1, path + '1', null);
                } else {
                    // Normal binary split
                    walls.push({ x: bx, z: splitZ1, w: bw, d: 0, isHorizontal: true });
                    doBsp(bx, bz, bw, splitZ1 - bz, depth - 1, path + '0', null);
                    doBsp(bx, splitZ1, bw, bz + bd - splitZ1, depth - 1, path + '1', null);
                }
            } else {
                const splitX1 = bx + bw * ratio;

                if (makeCorridor && splitX1 + cw < bx + bw - 3) {
                    // Tri-split with corridor
                    const splitX2 = splitX1 + cw;
                    walls.push({ x: splitX1, z: bz, w: 0, d: bd, isHorizontal: false });
                    walls.push({ x: splitX2, z: bz, w: 0, d: bd, isHorizontal: false });

                    doBsp(bx, bz, splitX1 - bx, bd, depth - 1, path + '0', null);
                    if (depth > 1) {
                        rooms.push({ x: splitX1, z: bz, w: cw, d: bd, id: rooms.length, path: path + 'C', type: 'corridor' });
                    }
                    doBsp(splitX2, bz, (bx + bw) - splitX2, bd, depth - 1, path + '1', null);
                } else {
                    walls.push({ x: splitX1, z: bz, w: 0, d: bd, isHorizontal: false });
                    doBsp(bx, bz, splitX1 - bx, bd, depth - 1, path + '0', null);
                    doBsp(splitX1, bz, bx + bw - splitX1, bd, depth - 1, path + '1', null);
                }
            }
        }

        doBsp(0, 0, roomW, roomD, cuts, '');
        return { rooms, walls };
    }
}
