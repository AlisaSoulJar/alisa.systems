import { mulberry32 } from '../core/DeterministicScope.js';

export const ZoneType = { DOWNTOWN: 1, INDUSTRIAL: 2, NIGHTLIFE: 3, SLUMS: 4 };

export class CarverSystem {
    constructor(w, h) {
        this.w = w; this.h = h;
        // 1 = solid buildable block, 0 = empty space (roads)
        this.grid = new Array(h).fill(0).map(() => new Array(w).fill(1));
        this.zoneGrid = new Array(h).fill(0).map(() => new Array(w).fill(ZoneType.DOWNTOWN));
        this.elevationGrid = new Array(h).fill(0).map(() => new Array(w).fill(0));
        this.buildings = [];
    }

    /**
     * PRNG de la ciudad.
     *
     * Antes:  `let x = Math.sin(this.seed++) * 10000; return x - Math.floor(x);`
     * Era semillado, sí, pero apoyado en `Math.sin`, que es la operación que
     * IEEE-754 **NO** especifica bit a bit: cada navegador/CPU puede devolver un
     * último bit distinto. Multiplicado por 10000 y tomando la parte decimal,
     * ese último bit se amplifica hasta cambiar el número entero. Resultado:
     * la MISMA semilla generaba ciudades DISTINTAS en máquinas distintas — que
     * es exactamente lo que impide validar la partida de otro.
     *
     * Ahora mulberry32: solo enteros de 32 bits, idéntico en todas partes.
     */
    random() {
        if (!this._rng) this._rng = mulberry32(this.seed ?? 42);
        return this._rng();
    }

    generate(seed) {
        this.seed = seed;
        this._rng = mulberry32(seed);   // re-siembra: generate(s) dos veces ⇒ misma ciudad
        this.generateVoronoiZones();
        this.generateTopography();
        this.carveAvenues();
        this.carveSlums();
        this.carveStreets();
        this.carvePlazas();
        this.resolveSlums();
        this.assignBuildings();
    }

    generateVoronoiZones() {
        const seeds = [
            { x: Math.floor(this.random() * this.w), y: Math.floor(this.random() * this.h), zone: ZoneType.DOWNTOWN },
            { x: Math.floor(this.random() * this.w), y: Math.floor(this.random() * this.h), zone: ZoneType.INDUSTRIAL },
            { x: Math.floor(this.random() * this.w), y: Math.floor(this.random() * this.h), zone: ZoneType.NIGHTLIFE },
            { x: Math.floor(this.random() * this.w), y: Math.floor(this.random() * this.h), zone: ZoneType.SLUMS }
        ];
        for(let y=0; y<this.h; y++) {
            for(let x=0; x<this.w; x++) {
                let minDist = 999999; let closestZone = ZoneType.DOWNTOWN;
                for(let s of seeds) {
                    let d = Math.sqrt(Math.pow(s.x - x, 2) + Math.pow(s.y - y, 2));
                    if (d < minDist) { minDist = d; closestZone = s.zone; }
                }
                this.zoneGrid[y][x] = closestZone;
            }
        }
    }

    generateTopography() {
        let noise = new Array(this.h).fill(0).map(() => new Array(this.w).fill(0));
        for(let y=0; y<this.h; y++) for(let x=0; x<this.w; x++) noise[y][x] = this.random();
        
        // 4 passes of Box Blur for smooth rolling hills
        for(let pass=0; pass<4; pass++) {
            let temp = new Array(this.h).fill(0).map(() => new Array(this.w).fill(0));
            for(let y=0; y<this.h; y++) {
                for(let x=0; x<this.w; x++) {
                    let sum = 0, count = 0;
                    for(let dy=-1; dy<=1; dy++) {
                        for(let dx=-1; dx<=1; dx++) {
                            let ny = y+dy, nx = x+dx;
                            if (ny>=0 && ny<this.h && nx>=0 && nx<this.w) { sum += noise[ny][nx]; count++; }
                        }
                    }
                    temp[y][x] = sum / count;
                }
            }
            noise = temp;
        }
        
        // Quantize to Stepped Terraces
        let maxN = 0, minN = 1;
        for(let y=0; y<this.h; y++) for(let x=0; x<this.w; x++) {
            if(noise[y][x]>maxN) maxN=noise[y][x]; if(noise[y][x]<minN) minN=noise[y][x];
        }
        for(let y=0; y<this.h; y++) for(let x=0; x<this.w; x++) {
            let norm = (noise[y][x] - minN) / (maxN - minN);
            this.elevationGrid[y][x] = Math.floor(norm * 4); // 0 to 3
        }
    }

    carveAvenues() {
        const minSpacing = 14, variance = 6;
        for(let x = 6; x < this.w; x += minSpacing + Math.floor(this.random()*variance)) {
            for(let y=0; y<this.h; y++) { this.grid[y][x] = 0; if(x+1 < this.w) this.grid[y][x+1] = 0; }
        }
        for(let y = 6; y < this.h; y += minSpacing + Math.floor(this.random()*variance)) {
            for(let x=0; x<this.w; x++) { this.grid[y][x] = 0; if(y+1 < this.h) this.grid[y+1][x] = 0; }
        }
    }

    carveSlums() {
        for(let y = 1; y < this.h - 1; y++) {
            for(let x = 1; x < this.w - 1; x++) {
                if (this.grid[y][x] === 1 && this.grid[y-1][x] === 0 && this.grid[y][x-1] === 0) {
                    let bw = 0, bh = 0;
                    while(x + bw < this.w && this.grid[y][x + bw] === 1) bw++;
                    while(y + bh < this.h && this.grid[y + bh][x] === 1) bh++;
                    if (bw >= 7 && bh >= 7 && this.zoneGrid[y][x] === ZoneType.SLUMS && this.random() > 0.2) {
                        this.carveBraidMaze(x, y, bw, bh);
                    }
                }
            }
        }
    }

    carveBraidMaze(sx, sy, bw, bh) {
        this.fill(sx, sy, bw, bh, 3);
        let stack = []; let cx = sx + 1, cy = sy + 1;
        this.grid[cy][cx] = 4; stack.push({x: cx, y: cy});

        while(stack.length > 0) {
            let current = stack[stack.length - 1];
            let neighbors = [];
            let dirs = [{dx:0, dy:-2}, {dx:2, dy:0}, {dx:0, dy:2}, {dx:-2, dy:0}];
            for(let idx=0; idx<dirs.length; idx++) {
                let r = Math.floor(this.random() * dirs.length);
                let temp = dirs[idx]; dirs[idx] = dirs[r]; dirs[r] = temp;
            }
            let moved = false;
            for(let d of dirs) {
                let nx = current.x + d.dx, ny = current.y + d.dy;
                if(nx >= sx && nx < sx + bw && ny >= sy && ny < sy + bh) {
                    if (this.grid[ny][nx] === 3) {
                        this.grid[ny][nx] = 4;
                        this.grid[current.y + d.dy/2][current.x + d.dx/2] = 4;
                        stack.push({x: nx, y: ny});
                        moved = true; break;
                    }
                }
            }
            if(!moved) stack.pop();
        }

        for(let y = sy+1; y < sy+bh-1; y++) {
            for(let x = sx+1; x < sx+bw-1; x++) {
                if(this.grid[y][x] === 4) {
                    let walls = 0; let ww = null;
                    if(this.grid[y-1][x] === 3) { walls++; ww = {dx:0, dy:-1}; }
                    if(this.grid[y+1][x] === 3) { walls++; ww = {dx:0, dy:1}; }
                    if(this.grid[y][x-1] === 3) { walls++; ww = {dx:-1, dy:0}; }
                    if(this.grid[y][x+1] === 3) { walls++; ww = {dx:1, dy:0}; }
                    if (walls === 3 && ww && this.random() > 0.1) {
                        this.grid[y + ww.dy][x + ww.dx] = 4;
                    }
                }
            }
        }
        
        let exits = 0;
        for(let i=0; i<100 && exits < 2; i++) {
            let rx = sx + 1 + Math.floor(this.random() * (bw - 2));
            if (this.grid[sy+1][rx] === 4) { this.grid[sy][rx] = 4; exits++; }
            let ry = sy + 1 + Math.floor(this.random() * (bh - 2));
            if (this.grid[ry][sx+1] === 4) { this.grid[ry][sx] = 4; exits++; }
        }
    }

    resolveSlums() {
        for(let y=0; y<this.h; y++) {
            for(let x=0; x<this.w; x++) {
                if(this.grid[y][x] === 3) this.grid[y][x] = 1;
                if(this.grid[y][x] === 4) this.grid[y][x] = 0;
            }
        }
    }

    carveStreets() {
        const step = 4;
        for(let y = step; y < this.h - step; y += step) {
            for(let x = step; x < this.w - step; x += step) {
                if (this.grid[y][x] === 1 && this.random() > 0.6) {
                    const dir = this.random() > 0.5 ? {dx: 1, dy: 0} : {dx: 0, dy: 1};
                    const sign = this.random() > 0.5 ? 1 : -1;
                    let cx = x, cy = y;
                    while(cx >= 0 && cx < this.w && cy >= 0 && cy < this.h && this.grid[cy][cx] === 1) {
                        this.grid[cy][cx] = 0;
                        cx += dir.dx * sign; cy += dir.dy * sign;
                    }
                }
            }
        }
    }

    carvePlazas() {
        const size = 3;
        for(let y = 1; y < this.h - size; y++) {
            for(let x = 1; x < this.w - size; x++) {
                if (this.canFit(x, y, size, size, 1) && this.random() > 0.8) {
                    this.fill(x, y, size, size, 2);
                }
            }
        }
    }

    assignBuildings() {
        const archetypes = [
            { id: 10, w: 5, h: 5, color: '#00ffff', name: 'Corp V0', zones: [ZoneType.DOWNTOWN] },
            { id: 11, w: 4, h: 4, color: '#ff0044', name: 'Ziggurat', zones: [ZoneType.DOWNTOWN, ZoneType.INDUSTRIAL] },
            { id: 12, w: 4, h: 4, color: '#ff4400', name: 'Military', zones: [ZoneType.INDUSTRIAL] },
            { id: 13, w: 3, h: 3, color: '#8800ff', name: 'Skybridge', zones: [ZoneType.DOWNTOWN, ZoneType.NIGHTLIFE] },
            { id: 14, w: 3, h: 3, color: '#aa00ee', name: 'Neon Club', zones: [ZoneType.NIGHTLIFE, ZoneType.SLUMS] },
            { id: 15, w: 2, h: 2, color: '#ffdd00', name: 'Slum Tower', zones: [ZoneType.SLUMS] },
            { id: 16, w: 2, h: 2, color: '#ddff00', name: 'L-Shape', zones: [ZoneType.INDUSTRIAL, ZoneType.SLUMS] },
            { id: 17, w: 2, h: 2, color: '#ff8800', name: 'Depot', zones: [ZoneType.INDUSTRIAL] },
            { id: 18, w: 1, h: 1, color: '#ff00ff', name: 'Stalls', zones: [ZoneType.SLUMS, ZoneType.NIGHTLIFE] },
            { id: 19, w: 1, h: 1, color: '#00ff44', name: 'Capsule', zones: [ZoneType.NIGHTLIFE, ZoneType.DOWNTOWN] },
            { id: 20, w: 1, h: 1, color: '#555555', name: 'Vent Shaft', zones: [ZoneType.INDUSTRIAL, ZoneType.SLUMS] }
        ];
        
        for(let size = 5; size >= 1; size--) {
            let archsOfSize = archetypes.filter(a => a.w === size);
            if (archsOfSize.length === 0) continue;

            for(let y=0; y<this.h; y++) {
                for(let x=0; x<this.w; x++) {
                    if (this.canFit(x, y, size, size, 1)) {
                        let zone = this.zoneGrid[y][x];
                        let valid = archsOfSize.filter(a => a.zones.includes(zone));
                        if (valid.length > 0) {
                            if (size === 1 && zone !== ZoneType.SLUMS && this.random() > 0.60) {
                                this.grid[y][x] = 0; continue;
                            }
                            if (zone === ZoneType.DOWNTOWN && size === 2 && this.random() > 0.9) {
                                this.fill(x, y, size, size, 0); continue;
                            }
                            let chosen = valid[Math.floor(this.random() * valid.length)];
                            this.fill(x, y, size, size, chosen.id);
                            this.buildings.push({x, y, w: size, h: size, type: chosen});
                        } else {
                            if (size === 1) this.grid[y][x] = 0;
                        }
                    }
                }
            }
        }
    }

    canFit(StartX, StartY, w, h, targetValue) {
        if (StartX + w > this.w || StartY + h > this.h) return false;
        for(let y = StartY; y < StartY + h; y++) {
            for(let x = StartX; x < StartX + w; x++) {
                if (this.grid[y][x] !== targetValue) return false;
            }
        }
        return true;
    }

    fill(StartX, StartY, w, h, val) {
        for(let y = StartY; y < StartY + h; y++) {
            for(let x = StartX; x < StartX + w; x++) {
                this.grid[y][x] = val;
            }
        }
    }
}
