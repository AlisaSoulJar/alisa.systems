import * as THREE from 'three';

/**
 * ProceduralTextureFactory — Centralized Canvas Texture Generation
 * ================================================================
 * Eliminates duplicated CanvasTexture creation across factories.
 * All textures are generated on-demand and cached by key.
 *
 * Replaces inline texture code in: Carver (facades, asphalt, strips),
 * ProceduralBuilding (checkerboard, labels), Aquarium (windows).
 */
export class ProceduralTextureFactory {
    constructor() {
        /** @type {Map<string, THREE.CanvasTexture>} */
        this._cache = new Map();
    }

    /**
     * Get or create a cached texture by key.
     * @param {string} key - Cache key
     * @param {Function} generatorFn - () => HTMLCanvasElement
     * @param {Object} [texConfig] - wrapS, wrapT, repeat, filter settings
     * @returns {THREE.CanvasTexture}
     */
    getOrCreate(key, generatorFn, texConfig = {}) {
        if (this._cache.has(key)) return this._cache.get(key);

        const canvas = generatorFn();
        const tex = new THREE.CanvasTexture(canvas);

        tex.wrapS = texConfig.wrapS ?? THREE.RepeatWrapping;
        tex.wrapT = texConfig.wrapT ?? THREE.RepeatWrapping;
        if (texConfig.repeat) tex.repeat.set(texConfig.repeat[0], texConfig.repeat[1]);
        tex.magFilter = texConfig.magFilter ?? THREE.LinearFilter;
        tex.minFilter = texConfig.minFilter ?? THREE.LinearMipmapLinearFilter;

        this._cache.set(key, tex);
        return tex;
    }

    // ─────────────────────────────────────────
    //  PREBUILT GENERATORS
    // ─────────────────────────────────────────

    /**
     * B&W checkerboard pattern (ProceduralBuilding carpet).
     * @param {number} [size=64]
     * @param {string} [lightColor='#dddddd']
     * @param {string} [darkColor='#222222']
     */
    static checkerboard(size = 64, lightColor = '#dddddd', darkColor = '#222222') {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const half = size / 2;
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = darkColor;
        ctx.fillRect(0, 0, half, half);
        ctx.fillRect(half, half, half, half);
        return canvas;
    }

    /**
     * Text label plate (floor numbers, door signs).
     * @param {string} text
     * @param {Object} [config]
     * @param {number} [config.width=64]
     * @param {number} [config.height=32]
     * @param {string} [config.bgColor='#111']
     * @param {string} [config.textColor='#ff9500']
     * @param {string} [config.font='bold 22px monospace']
     */
    static labelPlate(text, config = {}) {
        const w = config.width || 64;
        const h = config.height || 32;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = config.bgColor || '#111';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = config.textColor || '#ff9500';
        ctx.font = config.font || 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
        return canvas;
    }

    /**
     * Window grid texture (Aquarium skyscraper).
     * @param {number} [cols=8]
     * @param {number} [rows=1]
     * @param {Object} [config]
     */
    static windowGrid(cols = 8, rows = 1, config = {}) {
        const w = config.width || 512;
        const h = config.height || 128;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = config.bgColor || '#111';
        ctx.fillRect(0, 0, w, h);

        const cellW = w / cols;
        const cellH = h / rows;
        const winColor = config.windowColor || '#050a15';
        const frameColor = config.frameColor || '#0a1525';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellW + cellW * 0.15;
                const y = r * cellH + cellH * 0.15;
                const ww = cellW * 0.7;
                const wh = cellH * 0.7;
                ctx.fillStyle = winColor;
                ctx.fillRect(x, y, ww, wh);
                // Inner pane
                ctx.fillStyle = frameColor;
                ctx.fillRect(x + ww * 0.1, y + wh * 0.1, ww * 0.4, wh * 0.5);
            }
        }
        return canvas;
    }

    /**
     * 1D gradient beam texture (volumetric lights).
     * @param {Array<number>} color - [r, g, b] normalized 0-1
     * @param {number} [opacity=0.55]
     */
    static gradientBeam(color = [1, 1, 1], opacity = 0.55) {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        const [r, g, b] = color.map(v => Math.round(v * 255));
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 256);
        return canvas;
    }

    /**
     * Radial light pool decal (streetlights, fake shadows).
     * @param {number} [size=64]
     * @param {Array<number>} [color=[255, 180, 80]]
     */
    static lightPool(size = 64, color = [255, 180, 80]) {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const c = size / 2;
        const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
        grad.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
        grad.addColorStop(0.4, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    /**
     * Industrial tile floor with grout lines and grime (Cucco arena).
     * @param {number} [size=512]
     * @param {string} [baseColor='#c8cccf']
     * @param {number} [tileCount=8]
     */
    static industrialTiles(size = 512, baseColor = '#c8cccf', tileCount = 8) {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);

        // Grout
        ctx.strokeStyle = '#a0a4a8';
        ctx.lineWidth = 4;
        const step = size / tileCount;
        for (let i = 0; i <= size; i += step) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
        }

        // Grime spots
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 30 + 10, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Carver composite facade atlas for tall buildings.
     * @param {number} floors - Number of vertical floor tiles
     * @param {number} variant - RNG variant index for weathering
     * @param {Object} stripImages - Dictionary of loaded Image objects { ground, middle, top }
     */
    static carverFacadeAtlas(floors = 1, variant = 0, stripImages = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = floors * 256;
        const ctx = canvas.getContext('2d');
        
        // Fallback background
        ctx.fillStyle = "#111116";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // AI images are 1024x1024. The strip we want is the center 1024x256.
        const sy = (1024 - 256) / 2;
        const syH = 256;
        
        for (let f = 0; f < floors; f++) {
            let drawY = (floors - 1 - f) * 256; // Draw from bottom of canvas to top
            let imgToDraw = null;
            
            if (f === 0 && stripImages.ground && stripImages.ground.complete) imgToDraw = stripImages.ground;
            else if (f === floors - 1 && stripImages.top && stripImages.top.complete) imgToDraw = stripImages.top;
            else if (stripImages.middle && stripImages.middle.complete) imgToDraw = stripImages.middle;
            
            if (imgToDraw && imgToDraw.width > 0) {
                ctx.drawImage(imgToDraw, 0, sy, 1024, syH, 0, drawY, 1024, 256);
                
                // Random variation to break repeating patterns on middle floors
                if (f > 0 && f < floors - 1 && variant > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + variant * 0.1})`;
                    ctx.fillRect(0, drawY, 1024, 256);
                }
            } else {
                // Placeholder boxes if image failed to load yet
                ctx.strokeStyle = "#ff00ff";
                ctx.strokeRect(4, drawY + 4, 1016, 248);
                ctx.fillStyle = "#ff00ff";
                ctx.fillText("WAITING FOR ASSET", 512, drawY + 128);
            }
        }
        
        return canvas;
    }

    /**
     * Procedural asphalt with yellow dividing lines.
     */
    static asphalt() {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#222222'; ctx.fillRect(0,0,256,256);
        ctx.fillStyle = '#2a2a2a';
        for(let i=0; i<8000; i++) ctx.fillRect(Math.random()*256, Math.random()*256, 1, 1);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(16, 126, 96, 4); ctx.fillRect(144, 126, 96, 4);
        return c;
    }

    /**
     * Procedural noisy grass.
     */
    static grass() {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#2b4f17'; ctx.fillRect(0,0,128,128);
        ctx.fillStyle = '#36611e';
        for(let i=0; i<4000; i++) ctx.fillRect(Math.random()*128, Math.random()*128, 2, 2);
        return c;
    }

    /**
     * Procedural oil spill gradient decal.
     */
    static oilSpill() {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 5, 32, 32, 28);
        grad.addColorStop(0, 'rgba(20,10,40,0.9)'); grad.addColorStop(1, 'rgba(20,20,20,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI*2); ctx.fill();
        return c;
    }

    /**
     * Generates a soft warm light pool texture (e.g. for streetlights).
     * @returns {HTMLCanvasElement}
     */
    static lightPool() {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 180, 80, 0.6)'); // Warm tungsten center
        grad.addColorStop(0.4, 'rgba(255, 150, 50, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,64,64);
        return c;
    }

    /**
     * Generates a steam/vapor puff texture.
     * @returns {HTMLCanvasElement}
     */
    static vapor() {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(180, 220, 255, 0.25)'); 
        grad.addColorStop(0.5, 'rgba(100, 150, 200, 0.1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,64,64);
        return c;
    }

    /**
     * Procedural splattered blood decal.
     */
    static bloodSplatter() {
        const c = document.createElement('canvas'); c.width = 32; c.height = 32;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI*2); ctx.fill();
        for(let i=0; i<5; i++) {
            ctx.beginPath(); ctx.arc(16+Math.random()*16, 16+Math.random()*16, Math.random()*6, 0, Math.PI*2); ctx.fill();
        }
        return c;
    }

    /** Dispose all cached textures */
    dispose() {
        for (const tex of this._cache.values()) {
            tex.dispose();
        }
        this._cache.clear();
    }
}
