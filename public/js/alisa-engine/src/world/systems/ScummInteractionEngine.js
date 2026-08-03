import { CabinetBSPEngine } from '../CabinetBSPEngine.js';
import { SeededRNG } from '../core/SeededRNG.js';

export class ScummInteractionEngine {
    constructor() {
        this.bsp = new CabinetBSPEngine();
        this.state = null;
    }
    
    initEpisode(seed, cuts, stage, numSnakes, bats, mode) {
        const partition = this.bsp.fractalPartition(cuts, seed);
        const leavesCount = partition.leaves.length;
        
        // Randomly place target and snakes based on seed offset to avoid coupling with partition layout sequence
        const rng = new SeededRNG(seed + 999);
        const available = Array.from({length: leavesCount}, (_, i) => i);
        
        // Pick target (The Rabbit / Key)
        let targetId = -1;
        if (available.length > 0) {
            targetId = available.splice(Math.floor(rng.next() * available.length), 1)[0];
        }
        
        // Pick snakes
        const snakeIds = [];
        for (let i = 0; i < Math.min(numSnakes, available.length); i++) {
            const idx = Math.floor(rng.next() * available.length);
            snakeIds.push(available.splice(idx, 1)[0]);
        }
        
        const tried = new Array(leavesCount).fill(false);
        this.bsp.syncState(tried, [], targetId, snakeIds, partition);
        
        this.state = {
            seed,
            cuts,
            stage,
            mode,
            partition,
            targetId,
            snakeIds,
            tried,
            done: false,
            dead: false,
            found: false,
            steps: 0
        };
        
        return this.state;
    }
    
    selectDrawer(index) {
        if (!this.state || this.state.done) {
            return { targetDrawer: index, found: false, snake: false, reward: 0, adjacent: { snakes: 0, rabbit: 0 } };
        }
        
        this.state.steps++;
        this.state.tried[index] = true;
        
        const isTarget = (this.state.targetId === index);
        const isSnake = this.state.snakeIds.includes(index);
        
        // Base penalty for taking a step (drives agent to find shortest path)
        let reward = -1;
        
        if (isSnake) {
            this.state.dead = true;
            this.state.done = true;
            reward = -100;
        } else if (isTarget) {
            this.state.found = true;
            this.state.done = true;
            reward = 100;
        } else {
            // Reward shaping for 'minesweeper' mode
            if (this.state.mode === 'minesweeper') {
                const adj = this.bsp.countAdjacentItems(index);
                if (adj.snakes > 0) {
                    // Slight negative reinforcement if near snake
                    reward -= (adj.snakes * 2);
                }
                if (adj.rabbit > 0) {
                    // Positive reinforcement if near target
                    reward += 5;
                }
            }
        }
        
        // Resync core state (so the bsp engine knows what has been tried)
        this.bsp.syncState(this.state.tried, [], this.state.targetId, this.state.snakeIds, this.state.partition);
        
        return {
            targetDrawer: index,
            found: this.state.found,
            snake: this.state.dead,
            reward: reward,
            adjacent: this.bsp.countAdjacentItems(index)
        };
    }
}
