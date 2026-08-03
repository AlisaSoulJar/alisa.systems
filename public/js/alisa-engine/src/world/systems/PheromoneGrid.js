export class PheromoneGrid {
    constructor(width, height, depth, cellSize, decayRate = 5.0) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.gridX = Math.ceil(width / cellSize);
        this.gridY = Math.ceil(height / cellSize);
        this.gridZ = Math.ceil(depth / cellSize);
        this.decayRate = decayRate; // Cuánto olor se pierde por segundo
        
        // Flat array for maximum performance O(1) reads
        // Each cell contains { food: 0, danger: 0 }
        this.grid = new Array(this.gridX * this.gridY * this.gridZ);
        for(let i=0; i<this.grid.length; i++) {
            this.grid[i] = { food: 0, danger: 0 };
        }
    }

    _getIndex(x, y, z) {
        // Transform World Coords to Grid Indices
        // Note: x,z origin is center (0,0), but y origin is bottom (0)
        let gx = Math.floor((x + this.width/2) / this.cellSize);
        let gy = Math.floor(y / this.cellSize);
        let gz = Math.floor((z + this.depth/2) / this.cellSize);
        
        // Clamp to avoid OutOfBounds
        gx = Math.max(0, Math.min(gx, this.gridX - 1));
        gy = Math.max(0, Math.min(gy, this.gridY - 1));
        gz = Math.max(0, Math.min(gz, this.gridZ - 1));
        
        return gx + (gy * this.gridX) + (gz * this.gridX * this.gridY);
    }

    addPheromone(x, y, z, type, amount) {
        let idx = this._getIndex(x, y, z);
        this.grid[idx][type] += amount;
        // Cap maximum intensity to avoid infinite buildup
        if (this.grid[idx][type] > 100) this.grid[idx][type] = 100;
    }

    getPheromone(x, y, z, type) {
        let idx = this._getIndex(x, y, z);
        return this.grid[idx][type];
    }
    
    // Devuelve el vector normalizado hacia la casilla vecina con mayor olor
    getGradient(x, y, z, type) {
        let gx = Math.floor((x + this.width/2) / this.cellSize);
        let gy = Math.floor(y / this.cellSize);
        let gz = Math.floor((z + this.depth/2) / this.cellSize);
        
        let bestVal = -1;
        let bestDir = {x: 0, y: 0, z: 0};
        
        // Check 3x3x3 neighborhood (27 cells)
        for(let i=-1; i<=1; i++) {
            for(let j=-1; j<=1; j++) {
                for(let k=-1; k<=1; k++) {
                    if(i===0 && j===0 && k===0) continue; // Skip center
                    
                    let nx = Math.max(0, Math.min(gx + i, this.gridX - 1));
                    let ny = Math.max(0, Math.min(gy + j, this.gridY - 1));
                    let nz = Math.max(0, Math.min(gz + k, this.gridZ - 1));
                    
                    let idx = nx + (ny * this.gridX) + (nz * this.gridX * this.gridY);
                    
                    let val = this.grid[idx][type];
                    if (val > bestVal) {
                        bestVal = val;
                        // Transform index direction back to world direction
                        bestDir = {x: i, y: j, z: k};
                    }
                }
            }
        }
        
        // Normalize direction
        let len = Math.sqrt(bestDir.x*bestDir.x + bestDir.y*bestDir.y + bestDir.z*bestDir.z);
        if(len > 0) {
            bestDir.x /= len; bestDir.y /= len; bestDir.z /= len;
        }
        return { dir: bestDir, value: bestVal };
    }

    tick(dt) {
        // Evaporation stage (Stigmergy core)
        let decayAmount = this.decayRate * dt;
        for(let i=0; i<this.grid.length; i++) {
            if(this.grid[i].food > 0) {
                this.grid[i].food -= decayAmount;
                if(this.grid[i].food < 0) this.grid[i].food = 0;
            }
            if(this.grid[i].danger > 0) {
                this.grid[i].danger -= decayAmount;
                if(this.grid[i].danger < 0) this.grid[i].danger = 0;
            }
        }
    }
    
    // API/FSM/Visualizer Bridge (OpenCore Standard)
    getState() {
        // Returns only active cells to minimize payload overhead
        let active = [];
        for(let i=0; i<this.grid.length; i++) {
            if(this.grid[i].food > 0.1 || this.grid[i].danger > 0.1) {
                // Reverse index to grid coords
                let gx = i % this.gridX;
                let gy = Math.floor((i / this.gridX)) % this.gridY;
                let gz = Math.floor(i / (this.gridX * this.gridY));
                
                active.push({
                    // Convert grid coords back to World Center coords
                    x: (gx * this.cellSize) - this.width/2 + this.cellSize/2,
                    y: (gy * this.cellSize) + this.cellSize/2,
                    z: (gz * this.cellSize) - this.depth/2 + this.cellSize/2,
                    food: Number(this.grid[i].food.toFixed(2)),
                    danger: Number(this.grid[i].danger.toFixed(2))
                });
            }
        }
        return active;
    }
}
