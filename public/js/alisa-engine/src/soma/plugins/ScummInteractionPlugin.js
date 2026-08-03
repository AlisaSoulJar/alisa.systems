export class ScummInteractionPlugin {
    constructor() {
        this.state = {
            partition: null,
            targetId: -1,
            snakeIds: [],
            batteryIds: [],
            tried: [],
            minesweeperCounts: [],
            attemptHistory: [],
            montyRevealed: [],
            attempts: 0,
            found: false,
            dead: false,
            done: false,
            score: 0,
            hudEnergy: 0.0,
            lockedDrawers: {},
            padlockKeyLocId: -1,
            hasPadlockKey: false,
            snakesActive: false,
            currentStage: 1,
            mode: 'blind' 
        };
        this.onEvent = null; // visual callback
    }

    // PRNG (mulberry32)
    mulberry32(a) {
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

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
        return { leaves, planks, maxDepth };
    }

    bspDistance(pathA, pathB) {
        let shared = 0;
        const minLen = Math.min(pathA.length, pathB.length);
        for (let i = 0; i < minLen; i++) { if (pathA[i] === pathB[i]) shared++; else break; }
        return (pathA.length - shared) + (pathB.length - shared);
    }

    initEpisode(seed, cuts, stage, numSnakes, numBats, mode) {
        this.state.partition = this.fractalPartition(cuts, seed);
        this.state.currentStage = stage;
        this.state.mode = mode;
        this.state.snakesActive = stage >= 3 || numSnakes > 0;
        
        const n = this.state.partition.leaves.length;
        const tRng = this.mulberry32(seed + 77777);
        this.state.targetId = Math.floor(tRng() * n);

        this.state.snakeIds = [];
        if (numSnakes > 0) {
            const avail = [];
            for (let i = 0; i < n; i++) { if (i !== this.state.targetId) avail.push(i); }
            for (let s = 0; s < numSnakes && avail.length > 0; s++) {
                const pick = Math.floor(tRng() * avail.length);
                this.state.snakeIds.push(avail[pick]); avail.splice(pick, 1);
            }
        }

        this.state.batteryIds = [];
        if (numBats > 0) {
            const availBat = [];
            for (let i = 0; i < n; i++) { if (i !== this.state.targetId && !this.state.snakeIds.includes(i)) availBat.push(i); }
            for (let s=0; s<numBats && availBat.length>0; s++) {
                const pick = Math.floor(tRng() * availBat.length);
                this.state.batteryIds.push(availBat[pick]); availBat.splice(pick, 1);
            }
        }

        this.state.tried = new Array(n).fill(false);
        this.state.minesweeperCounts = new Array(n).fill(-1);
        this.state.attemptHistory = [];
        this.state.montyRevealed = [];
        this.state.attempts = 0;
        this.state.found = false;
        this.state.dead = false;
        this.state.done = false;
        this.state.score = 0;
        this.state.hudEnergy = 0.0;
        this.state.hasPadlockKey = false;
        this.state.lockedDrawers = {};

        // Generate locks
        if (stage >= 2) {
            const availLock = [];
            for (let i = 0; i < n; i++) if (i !== this.state.targetId && !this.state.snakeIds.includes(i)) availLock.push(i);
            
            if (availLock.length > 0) {
                let p1 = Math.floor(tRng() * availLock.length);
                this.state.lockedDrawers[availLock[p1]] = 'plank';
                availLock.splice(p1, 1);
            }
            if (availLock.length > 0) {
                let p2 = Math.floor(tRng() * availLock.length);
                this.state.lockedDrawers[availLock[p2]] = 'padlock';
                availLock.splice(p2, 1);
                
                if (tRng() > 0.5 && availLock.length > 0) {
                    let pk = Math.floor(tRng() * availLock.length);
                    this.state.padlockKeyLocId = availLock[pk];
                } else {
                    this.state.padlockKeyLocId = 'box'; 
                }
            }
        }
        
        return this.state;
    }

    getBspNeighbors(idx) {
        if (!this.state.partition) return [];
        const path = this.state.partition.leaves[idx].bspPath;
        const neighbors = [];
        for (let i = 0; i < this.state.partition.leaves.length; i++) {
            if (i === idx) continue;
            if (this.bspDistance(path, this.state.partition.leaves[i].bspPath) <= 2) neighbors.push(i);
        }
        return neighbors;
    }

    countAdjacentItems(idx) {
        const neighbors = this.getBspNeighbors(idx);
        let snakes = 0, rabbit = 0;
        for (const ni of neighbors) {
            if (this.state.snakeIds.includes(ni)) snakes++;
            if (ni === this.state.targetId) rabbit++;
        }
        return { snakes, rabbit, total: snakes + rabbit };
    }

    pickUpItem(iType) {
        if (iType === 'key') {
            this.state.hasPadlockKey = true;
            if (this.onEvent) this.onEvent({ action: 'item_picked', item: 'key' });
        } else if (iType === 'battery') {
            this.state.hudEnergy = Math.min(100, this.state.hudEnergy + 25);
            if (this.onEvent) this.onEvent({ action: 'item_picked', item: 'battery' });
        }
    }

    selectDrawer(idx) {
        if (this.state.done || idx < 0 || idx >= this.state.partition.leaves.length) return { valid: false };
        if (this.state.tried[idx]) return { valid: false };
        
        // Locked logic
        if (this.state.lockedDrawers[idx] === 'padlock' && !this.state.hasPadlockKey) {
            if (this.onEvent) this.onEvent({ action: 'locked', reason: 'needs_key', idx });
            return { valid: false };
        }

        this.state.tried[idx] = true;
        this.state.attempts++;

        if (this.state.snakeIds.includes(idx)) {
            // Snake bite / dodge logic
            return { valid: true, snake: true, danger: true, idx };
        }

        if (idx === this.state.targetId) {
            this.state.found = true;
            this.state.done = true;
            return { valid: true, found: true, idx };
        }

        const dist = this.bspDistance(this.state.partition.leaves[idx].bspPath, this.state.partition.leaves[this.state.targetId].bspPath);
        const adjInfo = this.countAdjacentItems(idx);
        this.state.minesweeperCounts[idx] = adjInfo.snakes;

        let foundBat = false;
        if (this.state.batteryIds.includes(idx)) {
            this.state.hudEnergy = Math.min(100, this.state.hudEnergy + 25);
            foundBat = true;
        }
        
        if (this.state.padlockKeyLocId === idx) {
            this.pickUpItem('key');
        }

        this.state.attemptHistory.push({
            idx, dist,
            mineCount: adjInfo.snakes,
            nearRabbit: adjInfo.rabbit > 0,
            battery: foundBat
        });

        // Calculate reward
        let reward = 0;
        if (this.state.mode === 'blind') { reward = -0.5; }
        else if (this.state.mode === 'minesweeper') {
            const infoGain = adjInfo.snakes > 0 ? 0.3 : (adjInfo.rabbit > 0 ? 0.5 : 0.1); 
            reward = -0.5 + infoGain;
        } else {
            const maxDist = this.state.partition.maxDepth * 2; 
            const proximity = 1 - Math.min(dist / maxDist, 1); 
            reward = -1 + proximity * 0.5; 
        }

        this.state.score += reward;

        const remaining = this.state.tried.filter((t, i) => !t && !this.state.montyRevealed.includes(i)).length;
        if (remaining <= 0 || this.state.tried.every(t => t)) {
            this.state.done = true;
            this.state.exhausted = true;
        }

        return { valid: true, dist, foundBat, mineCount: adjInfo.snakes, reward, exhausted: this.state.exhausted, idx };
    }
}
