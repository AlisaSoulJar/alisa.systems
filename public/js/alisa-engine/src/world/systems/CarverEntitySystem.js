export class CarverEntitySystem {
    constructor(config = {}) {
        // Semilla inyectable, como en el resto del lote. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || Math.random;
        this.entities = [];
        this.w = config.w || 40;
        this.h = config.h || 40;
    }

    /**
     * Initializes procedural population into the traversable topology
     */
    populate(count, grid, seed = 12345) {
        let rng = function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };

        let spawnAttempts = 0;
        while(this.entities.length < count && spawnAttempts < 5000) {
            let sx = Math.floor(rng() * this.w);
            let sy = Math.floor(rng() * this.h);
            
            // 0 = road, 2 = plaza
            if (grid && grid[sy] && (grid[sy][sx] === 0 || grid[sy][sx] === 2)) {
                this.entities.push({
                    id: spawnAttempts,
                    isDrone: rng() > 0.8,
                    x: sx, y: sy,
                    tx: sx, ty: sy,
                    lastX: sx, lastY: sy,
                    progress: 0,
                    speed: 0.5 + rng() * 1.5
                });
            }
            spawnAttempts++;
        }
    }

    pickTarget(boid, grid) {
        let options = [];
        const dirs = [ {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1} ];
        
        for(let d of dirs) {
            let nx = boid.x + d.dx;
            let ny = boid.y + d.dy;
            if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) {
                if (grid[ny][nx] === 0 || grid[ny][nx] === 2) {
                    let weight = (nx === boid.lastX && ny === boid.lastY) ? 1 : 10;
                    for(let i = 0; i < weight; i++) options.push({x: nx, y: ny});
                }
            }
        }
        
        if (options.length > 0) {
            let choice = options[Math.floor(this.rng() * options.length)];
            boid.lastX = boid.x; boid.lastY = boid.y;
            boid.tx = choice.x; boid.ty = choice.y;
        }
    }

    tick(grid, dt = 0.016) {
        if (!grid || grid.length === 0) return this.entities;
        
        for (let e of this.entities) {
            if (e.x === e.tx && e.y === e.ty) {
                this.pickTarget(e, grid);
            } else {
                e.progress += e.speed * dt;
                if (e.progress >= 1.0) {
                    e.x = e.tx; e.y = e.ty;
                    e.progress = 0;
                    this.pickTarget(e, grid);
                }
            }
        }
        return this.entities;
    }
}
