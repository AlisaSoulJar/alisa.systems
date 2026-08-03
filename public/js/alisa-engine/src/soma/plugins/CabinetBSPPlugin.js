export class CabinetBSPPlugin {
    constructor() {
        this.partition = null;
        this.targetId = -1;
        this.snakeIds = [];
        this.tried = [];
        this.montyRevealed = [];
    }

    // ═══════════════════════════════════════════════════
    //  PRNG
    // ═══════════════════════════════════════════════════
    mulberry32(a) {
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ═══════════════════════════════════════════════════
    //  FRACTAL PARTITION (BSP core with tree tracking)
    // ═══════════════════════════════════════════════════
    fractalPartition(cuts, seed) {
        const rng = this.mulberry32(seed);
        const leaves = [];
        const planks = [];
        const PT = 0.025;
        const FRAME = 0.03;
        let maxDepth = 0;

        function split(x, y, w, h, d, path) {
            if (d <= 0 || w < 0.08 || h < 0.08) {
                leaves.push({ x, y, w, h, id: leaves.length, bspPath: path });
                maxDepth = Math.max(maxDepth, path.length);
                return;
            }
            let horiz = rng() > 0.45;
            if (w > h * 1.4) horiz = false;
            if (h > w * 1.4) horiz = true;
            const ratio = 0.3 + rng() * 0.4;

            if (horiz) {
                const cutY = y + h * ratio;
                planks.push({ x, y: cutY - PT / 2, w, h: PT });
                split(x, y, w, cutY - y - PT / 2, d - 1, path + '0');
                split(x, cutY + PT / 2, w, y + h - cutY - PT / 2, d - 1, path + '1');
            } else {
                const cutX = x + w * ratio;
                planks.push({ x: cutX - PT / 2, y, w: PT, h });
                split(x, y, cutX - x - PT / 2, h, d - 1, path + '0');
                split(cutX + PT / 2, y, w - (cutX - x) - PT / 2, h, d - 1, path + '1');
            }
        }
        split(FRAME, FRAME, 1 - 2 * FRAME, 1 - 2 * FRAME, cuts, '');
        this.partition = { leaves, planks, maxDepth };
        return this.partition;
    }

    bspDistance(pathA, pathB) {
        let shared = 0;
        const minLen = Math.min(pathA.length, pathB.length);
        for (let i = 0; i < minLen; i++) { if (pathA[i] === pathB[i]) shared++; else break; }
        return (pathA.length - shared) + (pathB.length - shared);
    }

    bspSharedPrefix(pathA, pathB) {
        let shared = 0;
        const minLen = Math.min(pathA.length, pathB.length);
        for (let i = 0; i < minLen; i++) { if (pathA[i] === pathB[i]) shared++; else break; }
        return shared;
    }

    getBspNeighbors(drawerIdx) {
        if (!this.partition) return [];
        const path = this.partition.leaves[drawerIdx].bspPath;
        const neighbors = [];
        for (let i = 0; i < this.partition.leaves.length; i++) {
            if (i === drawerIdx) continue;
            if (this.bspDistance(path, this.partition.leaves[i].bspPath) <= 2) neighbors.push(i);
        }
        return neighbors;
    }

    // ═══════════════════════════════════════════════════
    //  AI SELECTOR AGENTS
    // ═══════════════════════════════════════════════════
    selectRandom() { 
        const u = []; 
        for (let i = 0; i < this.partition.leaves.length; i++) { 
            if (!this.tried[i] && !this.montyRevealed.includes(i)) u.push(i); 
        } 
        return u.length ? u[Math.floor(Math.random()*u.length)] : -1; 
    }

    selectAreaGreedy() { 
        let bi = -1, ba = -1; 
        for (let i = 0; i < this.partition.leaves.length; i++) { 
            if (this.tried[i] || this.montyRevealed.includes(i)) continue; 
            const a = this.partition.leaves[i].w * this.partition.leaves[i].h; 
            if (a > ba) { ba = a; bi = i; } 
        } 
        return bi; 
    }

    selectBayesian() { 
        const n = this.partition.leaves.length; 
        const areas = this.partition.leaves.map(l => l.w * l.h); 
        const ta = areas.reduce((s,a)=>s+a,0); 
        const post = areas.map(a => a/ta); 
        for (let i=0; i<n; i++) { 
            if (this.tried[i] || this.montyRevealed.includes(i)) post[i] = 0; 
        } 
        const tp = post.reduce((s,p)=>s+p,0); 
        if (tp <= 0) return -1; 
        for (let i=0; i<n; i++) post[i] /= tp; 
        
        let bi=-1, bp=-1; 
        for (let i=0; i<n; i++) { 
            if (post[i] > bp) { bp=post[i]; bi=i; } 
        } 
        return bi; 
    }

    countAdjacentDangers(drawerIdx) { 
        return this.getBspNeighbors(drawerIdx).filter(ni => this.snakeIds.includes(ni)).length; 
    }

    countAdjacentItems(drawerIdx) {
        const neighbors = this.getBspNeighbors(drawerIdx);
        let snakes = 0, rabbit = 0;
        for (const ni of neighbors) { 
            if (this.snakeIds.includes(ni)) snakes++; 
            if (ni === this.targetId) rabbit++; 
        }
        return { snakes, rabbit, total: snakes + rabbit };
    }

    // Updates internal tracking
    syncState(triedArray, montyArray, targetId, snakeIds, partition) {
        this.tried = triedArray || [];
        this.montyRevealed = montyArray || [];
        this.targetId = targetId !== undefined ? targetId : this.targetId;
        this.snakeIds = snakeIds || [];
        if (partition) this.partition = partition;
    }
}
