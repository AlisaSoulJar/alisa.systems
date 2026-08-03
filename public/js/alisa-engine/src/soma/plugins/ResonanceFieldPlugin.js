export class ResonanceFieldPlugin {
    constructor(width, height) {
        this.particles = [];
        this.attractors = [];
        this.W = width;
        this.H = height;
        
        this.PARTICLE_COUNT = 400;
        this.RESONANCE_RADIUS = 80;
        this.COHERENCE_THRESHOLD = 0.72;
        this.FIELD_DAMPING = 0.985;
        this.EMERGENCE_RATE = 0.003;

        this.globalCoherence = 0;
        this.globalEntropy = 1.0;
        this.fieldAge = 0;
    }

    setSize(width, height) {
        this.W = width;
        this.H = height;
    }

    initialize() {
        this.particles = [];
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            this.particles.push({
                x: Math.random() * this.W,
                y: Math.random() * this.H,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                phase: Math.random() * Math.PI * 2,
                naturalFreq: 0.005 + Math.random() * 0.02,
                energy: 0.5 + Math.random() * 0.5,
                resonating: false,
                hue: 210 + Math.random() * 40,
                size: 1 + Math.random() * 2
            });
        }
    }

    alignFrequencies(p, neighbors) {
        let sumSin = 0, sumCos = 0;
        for (const n of neighbors) {
            sumSin += Math.sin(n.phase);
            sumCos += Math.cos(n.phase);
        }
        if (neighbors.length > 0) {
            const meanPhase = Math.atan2(sumSin / neighbors.length, sumCos / neighbors.length);
            p.phase += (meanPhase - p.phase) * 0.05;
        }
        p.phase += p.naturalFreq;
    }

    synchronizeOscillators() {
        const cellSize = this.RESONANCE_RADIUS;
        const grid = {};
        for (const p of this.particles) {
            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);
            const key = `${cx},${cy}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(p);
        }

        let totalCoherence = 0;
        let resonatingCount = 0;

        for (const p of this.particles) {
            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);
            const neighbors = [];

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = `${cx + dx},${cy + dy}`;
                    if (grid[key]) {
                        for (const n of grid[key]) {
                            if (n === p) continue;
                            const dist = Math.hypot(n.x - p.x, n.y - p.y);
                            if (dist < this.RESONANCE_RADIUS) neighbors.push(n);
                        }
                    }
                }
            }

            this.alignFrequencies(p, neighbors);

            if (neighbors.length > 0) {
                const avgEnergy = neighbors.reduce((s, n) => s + n.energy, 0) / neighbors.length;
                p.energy += (avgEnergy - p.energy) * this.EMERGENCE_RATE;
            }

            const localCoh = neighbors.length > 0
                ? Math.abs(neighbors.reduce((s, n) => s + Math.cos(n.phase - p.phase), 0) / neighbors.length)
                : 0;
            p.resonating = localCoh > this.COHERENCE_THRESHOLD;
            totalCoherence += localCoh;
            if (p.resonating) resonatingCount++;
        }

        this.globalCoherence = this.particles.length > 0 ? totalCoherence / this.particles.length : 0;
        this.globalEntropy = 1.0 - (resonatingCount / Math.max(this.particles.length, 1));
    }

    analyzeConvergence() {
        this.attractors = [];
        const checked = new Set();

        for (let i = 0; i < this.particles.length; i++) {
            if (checked.has(i) || !this.particles[i].resonating) continue;
            const cluster = [i];
            checked.add(i);

            for (let j = i + 1; j < this.particles.length; j++) {
                if (checked.has(j) || !this.particles[j].resonating) continue;
                const dist = Math.hypot(this.particles[j].x - this.particles[i].x, this.particles[j].y - this.particles[i].y);
                if (dist < this.RESONANCE_RADIUS * 1.5) {
                    cluster.push(j);
                    checked.add(j);
                }
            }

            if (cluster.length >= 5) {
                let cx = 0, cy = 0;
                for (const idx of cluster) { cx += this.particles[idx].x; cy += this.particles[idx].y; }
                this.attractors.push({
                    x: cx / cluster.length,
                    y: cy / cluster.length,
                    strength: cluster.length / this.particles.length,
                    size: cluster.length
                });
            }
        }
    }

    animateWaveFunction() {
        for (const p of this.particles) {
            for (const a of this.attractors) {
                const dx = a.x - p.x;
                const dy = a.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0 && dist < this.RESONANCE_RADIUS * 3) {
                    const force = a.strength * 0.15 / (dist * 0.1 + 1);
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }
            p.vx *= this.FIELD_DAMPING;
            p.vy *= this.FIELD_DAMPING;

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x += this.W;
            if (p.x > this.W) p.x -= this.W;
            if (p.y < 0) p.y += this.H;
            if (p.y > this.H) p.y -= this.H;
        }
    }

    warpPhaseSpace() {
        if (this.globalCoherence > 0.85 && Math.random() < 0.01) {
            const idx = Math.floor(Math.random() * this.particles.length);
            this.particles[idx].phase += Math.PI * (0.5 + Math.random());
            this.particles[idx].energy *= 0.3;
        }
    }

    accumulateEnergy() {
        const breathPhase = Math.sin(this.fieldAge * 0.0005) * 0.5 + 0.5;
        for (const p of this.particles) {
            p.energy = Math.min(1, p.energy + breathPhase * 0.0005);
            p.energy *= 0.9995; 
        }
    }

    tick() {
        this.fieldAge++;
        this.synchronizeOscillators();
        this.analyzeConvergence();
        this.animateWaveFunction();
        this.warpPhaseSpace();
        this.accumulateEnergy();
    }
}
