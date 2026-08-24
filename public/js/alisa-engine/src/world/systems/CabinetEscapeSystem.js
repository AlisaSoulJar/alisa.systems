// El generador canónico. Aquí se pedía `mulberry32(...)`, un
// método que `CabinetBSPEngine` no tiene — resto de cuando el generador vivía
// colgado del motor BSP. Ayer se arregló en `CabinetEscapeGame.js` y este
// hermano se quedó atrás: el mismo fallo aparece dos veces cuando se arregla
// por síntoma en vez de buscar todos los sitios que lo comparten.
import { mulberry32 } from '../core/DeterministicScope.js';

export class CabinetEscapeSystem {
    /**
     * @param {Object} [config]
     * @param {Object} [config.bspEngine]
     * @param {() => number} [config.rng] Fuente de azar en [0,1). Por defecto
     *        `Math.random`. `initEpisode` ya siembra su propio generador por
     *        episodio con `mulberry32(seed)` — esto es sólo para lo que queda
     *        fuera de ese episodio, como `doMontyReveal`.
     */
    constructor(config = {}) {
        this.bspEngine = config.bspEngine || null;
        this.rng = config.rng || (() => Math.random());
        this.resetState();
    }

    resetState() {
        // ⚠️ `episodes` NO se inicializaba aquí, y de ahí salía todo lo demás:
        // `randomizeCuts()` y `randomizeCabinetSize()` calculan
        // `episodes + 1`, así que con `undefined`/`null` obtenían NaN. Ese NaN
        // llegaba a la partición BSP como profundidad (y `depth >= NaN` es
        // siempre falso → recursión infinita) y a la geometría del mueble
        // («Computed radius is NaN»).
        //
        // Se arregla AQUÍ, en el sitio que lo declara, no en los dos métodos
        // que lo leen: un campo que nace sin valor lo rompe todo aguas abajo, y
        // parchear a la salida solo esconde el siguiente uso que aparezca.
        this.episodes = this.episodes ?? 0;

        this.partition = null;
        this.targetId = -1;
        this.snakeIds = [];
        this.batteryIds = [];
        this.tried = [];
        this.bspFeedback = [];
        this.minesweeperCounts = [];
        this.attemptHistory = [];
        this.montyRevealed = [];
        this.attempts = 0;
        this.found = false;
        this.dead = false;
        this.done = false;
        
        this.score = 0;
        this.lockedDrawers = {};
        this.padlockKeyLocId = -1;
        this.hasPadlockKey = false;
        this.hudEnergy = 100.0;
        this.hasFlashlight = false;
        this.currentStage = 1;
        this.snakeMode = 'on';
        this.mode = 'mastermind';
    }

    getOptimal() {
        if (!this.partition || !this.partition.leaves) return 0;
        return Math.ceil(Math.log2(this.partition.leaves.length));
    }

    initEpisode(partition, seed, stage, mode, snakeMode) {
        this.partition = partition;
        this.currentStage = stage;
        this.mode = mode;
        this.snakeMode = snakeMode;
        
        this.hasPadlockKey = false;
        this.hudEnergy = 100.0;
        this.hasFlashlight = false;
        this.attempts = 0;
        this.found = false;
        this.dead = false;
        this.done = false;
        
        const n = partition.leaves.length;
        this.tried = new Array(n).fill(false);
        this.bspFeedback = new Array(n).fill(-1);
        this.minesweeperCounts = new Array(n).fill(-1);
        this.attemptHistory = [];
        this.montyRevealed = [];
        
        const tRng = mulberry32(seed + 77777);
        
        // Target Placement (Area-weighted)
        const areas = partition.leaves.map(l => l.w * l.h);
        const totalArea = areas.reduce((s, a) => s + a, 0);
        let r = tRng() * totalArea;
        this.targetId = partition.leaves.length - 1;
        for (let i = 0; i < areas.length; i++) {
            r -= areas[i];
            if (r <= 0) { this.targetId = i; break; }
        }
        
        // Snakes placement
        this.snakeIds = [];
        const snakesActive = this.currentStage >= 3 || this.currentStage === 2;
        if (snakesActive && this.snakeMode !== 'off') {
            const count = this.snakeMode === 'hard' ? Math.min(2, n - 1) : Math.min(1, n - 1);
            const available = [];
            for (let i = 0; i < n; i++) { if (i !== this.targetId) available.push(i); }
            for (let s = 0; s < count && available.length > 0; s++) {
                const pick = Math.floor(tRng() * available.length);
                this.snakeIds.push(available[pick]);
                available.splice(pick, 1);
            }
        }
        
        // Locks Placement
        this.lockedDrawers = {};
        this.padlockKeyLocId = -1;
        if (this.currentStage >= 2) {
            const available = [];
            for (let i = 0; i < n; i++) if (i !== this.targetId && !this.snakeIds.includes(i)) available.push(i);
            if (available.length > 0) {
                let p1 = Math.floor(tRng() * available.length);
                this.lockedDrawers[available[p1]] = 'plank';
                available.splice(p1, 1);
            }
            if (available.length > 0) {
                let p2 = Math.floor(tRng() * available.length);
                this.lockedDrawers[available[p2]] = 'padlock';
                available.splice(p2, 1);
                if (tRng() > 0.5 && available.length > 0) {
                    let pk = Math.floor(tRng() * available.length);
                    this.padlockKeyLocId = available[pk];
                } else {
                    this.padlockKeyLocId = 'box'; 
                }
            }
        }
        
        // Battery placement
        this.batteryIds = [];
        if (this.snakeMode === 'off') {
            const emptyLeaves = [];
            for (let i = 0; i < n; i++) if (i !== this.targetId) emptyLeaves.push(i);
            const numBat = Math.min(emptyLeaves.length, 1 + Math.floor(tRng() * 2));
            for (let s = 0; s < numBat && emptyLeaves.length > 0; s++) {
                const pick = Math.floor(tRng() * emptyLeaves.length);
                this.batteryIds.push(emptyLeaves[pick]);
                emptyLeaves.splice(pick, 1);
            }
        }
        
        this.bspEngine.syncState(this.tried, this.montyRevealed, this.targetId, this.snakeIds, this.partition);
    }

    selectDrawer(idx) {
        if (this.done || idx < 0 || idx >= this.partition.leaves.length) return { reward: 0, bspDist: -1, valid: false };
        if (this.tried[idx]) return { reward: 0, bspDist: -1, valid: false };

        this.tried[idx] = true;
        this.attempts++;

        if (this.snakeIds.includes(idx)) {
            return { reward: -2, bspDist: -2, valid: true, triggeredSnakeLunge: true };
        }

        if (idx === this.targetId) {
            this.found = true;
            this.done = true;
            this.bspFeedback[idx] = 0;
            const efficiency = this.getOptimal() / Math.max(this.attempts, 1);
            const reward = Math.round(10 * Math.min(efficiency, 1.0) * 100) / 100;
            this.attemptHistory.push({ idx, dist: 0, order: this.attempts });
            return { reward, bspDist: 0, valid: true, foundRaccoon: true };
        } else {
            const dist = this.bspEngine.bspDistance(this.partition.leaves[idx].bspPath, this.partition.leaves[this.targetId].bspPath);
            this.bspFeedback[idx] = dist;
            const adjInfo = this.bspEngine.countAdjacentItems(idx);
            this.minesweeperCounts[idx] = adjInfo.snakes;
            
            let foundBat = false;
            if (this.batteryIds.includes(idx)) {
                this.hudEnergy = Math.min(100, this.hudEnergy + 25);
                foundBat = true;
            }
            this.attemptHistory.push({ idx, dist, order: this.attempts, mineCount: adjInfo.snakes, nearRabbit: adjInfo.rabbit > 0, battery: foundBat });
            
            if (this.mode === 'montyHall') this.doMontyReveal();
            if (this.mode === 'minesweeper' && adjInfo.snakes === 0 && adjInfo.rabbit === 0) {
                this.bspEngine.getBspNeighbors(idx).forEach(ni => {
                    if (!this.tried[ni] && !this.snakeIds.includes(ni) && ni !== this.targetId && !this.montyRevealed.includes(ni)) {
                        this.montyRevealed.push(ni);
                        this.minesweeperCounts[ni] = this.bspEngine.countAdjacentItems(ni).snakes;
                    }
                });
            }

            const remaining = this.tried.filter((t, i) => !t && !this.montyRevealed.includes(i)).length;
            if (remaining <= 0 || this.tried.every(t => t)) {
                this.done = true;
            }

            let reward;
            if (this.mode === 'blind') { 
                reward = -0.5; 
            } else if (this.mode === 'minesweeper') { 
                const infoGain = adjInfo.snakes > 0 ? 0.3 : (adjInfo.rabbit > 0 ? 0.5 : 0.1); 
                reward = -0.5 + infoGain; 
            } else { 
                const maxDist = this.partition.maxDepth * 2; 
                const proximity = 1 - Math.min(dist / maxDist, 1); 
                reward = -1 + proximity * 0.5; 
            }
            
            return { reward, bspDist: dist, valid: true, mineCount: adjInfo.snakes, foundBattery: foundBat };
        }
    }

    doMontyReveal() {
        const candidates = [];
        for (let i = 0; i < this.partition.leaves.length; i++) { 
            if (i !== this.targetId && !this.tried[i] && !this.montyRevealed.includes(i)) candidates.push(i); 
        }
        if (candidates.length > 0) this.montyRevealed.push(candidates[Math.floor(this.rng() * candidates.length)]);
    }

    pickUpBattery() {
        this.hudEnergy = Math.min(100, this.hudEnergy + 25);
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — Y ÉSTE YA ERA PLANO DESDE EL PRINCIPIO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * De los mundos de la casa, éste es el que menos tiene que traducir: un
     * mueble ES una superficie con cajones, y el BSP ya los guarda como
     * rectángulos `{x, y, w, h}` en un cuadrado de 0 a 1. O sea que el sustrato
     * aquí no aplasta nada — sólo lo dice en el idioma común.
     *
     * ⚠️ CADA CAJÓN SE PUBLICA CON LO QUE EL JUGADOR SABE, NO CON LO QUE HAY.
     *
     * Un cajón cerrado sale como `cerrado`, y sólo al abrirlo aparece qué tenía.
     * Publicar la serpiente antes de tiempo pondría la solución en el sustrato, y
     * cualquier dibujante que lo lea —o cualquier agente— la vería. Es la misma
     * regla que vigila `sustrato:secreto` en las cartas: lo que una silla no
     * sabe, no se dibuja.
     *
     * `minesweeperCounts` sí va, porque ésa es información que el juego DA: el
     * número de serpientes vecinas de un cajón ya abierto.
     */
    sustrato() {
        const hojas = this.partition?.leaves ?? [];
        const piezas = hojas.map((h, i) => {
            const abierto = this.tried[i];
            let t = 'cerrado';
            if (abierto) {
                t = i === this.targetId ? 'mapache'
                  : this.snakeIds.includes(i) ? 'serpiente'
                  : this.batteryIds?.includes(i) ? 'pila'
                  : 'vacio';
            }
            const pz = {
                x: h.x + h.w / 2, y: h.y + h.h / 2,
                t, de: 0, ancho: h.w, largo: h.h, cajon: i,
            };
            // El número de vecinas sólo existe en los cajones vacíos ya abiertos.
            const n = this.minesweeperCounts?.[i];
            if (abierto && Number.isFinite(n) && n >= 0) pz.vecinas = n;
            return pz;
        });

        return {
            piezas,
            zonas: [],
            limite: { forma: 'rectangulo', ancho: 1, alto: 1 },
            leyenda: {
                cerrado: 'cajón sin abrir', vacio: 'vacío',
                serpiente: '¡una serpiente!', mapache: '¡el mapache!', pila: 'una pila',
            },
            simbolos: { cerrado: '?', vacio: '.', serpiente: 's', mapache: '*', pila: 'p' },
        };
    }

    getObservationVector() {
        const drawers = [];
        const n = this.partition ? this.partition.leaves.length : 0;
        const maxDist = this.partition ? this.partition.maxDepth * 2 : 6;
        const areas = this.partition ? this.partition.leaves.map(l => l.w * l.h) : [];
        const ta = areas.reduce((s,a)=>s+a,0) || 1;
        
        for (let i = 0; i < 12; i++) {
            if (i < n) {
                const l = this.partition.leaves[i];
                const isM = this.montyRevealed.includes(i);
                const st = this.tried[i] ? 1 : (isM ? 0.5 : 0);
                const fb = this.bspFeedback[i] < 0 ? -1 : this.bspFeedback[i]/maxDist;
                drawers.push({cx:l.x+l.w/2, cy:l.y+l.h/2, w:l.w, h:l.h, status:st, bsp_feedback:fb, area_fraction:areas[i]/ta});
            } else {
                drawers.push({cx:0,cy:0,w:0,h:0,status:0,bsp_feedback:-1,area_fraction:0});
            }
        }
        return { 
            drawers, 
            meta: { 
                num_drawers: n, 
                attempts: this.attempts, 
                found: this.found ? 1 : 0, 
                optimal: n > 0 ? this.getOptimal() : 0 
            } 
        };
    }
}
