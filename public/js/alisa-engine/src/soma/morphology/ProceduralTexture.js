// ATENCION: este import faltaba. El modulo usaba THREE. sin importarlo, o sea que
// dependia de que alguien hubiera dejado la global puesta con un <script> clasico:
// funcionaba EN SU PAGINA y en ninguna otra. Un modulo que solo funciona donde
// nacio no es un modulo. Lo destapo clasificar_piezas.mjs sobre las 179 piezas.
import * as THREE from 'three';

// SOMA Layer: Procedural Texture Plugin
// Dynamically creates infinite deterministic Canvas2D textures, wear, and rust for WebGL objects

const TEX_SIZE = 128;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function ditherAlpha(x, y, val) {
    return val + (BAYER[y % 4][x % 4] / 16 - 0.5) * 50; 
}

export class ProceduralTexture {
    constructor() {
        this.MASTER_OVERLAYS = {};
        this.HERO_IMAGES = {};
        this.MAT_CACHE = {};
        
        this.PALETTES = {};
        this.CATEGORY_MAP = {};
        
        this.TYPE_OVERLAY_MAP = {
            'glass':     'none',
            'sprite':    'none',
            'red_neo':   'none',
            'cyan_neo':  'none',
            'l3_screen': 'none'
        };
    }

    onInit() {
        console.log("[ProceduralTexturePlugin] Generating Baseline Semantic Matrices...");
        this._generateMasterOverlays();
        this._loadPalettes();
    }

    async _loadPalettes() {
        try {
            // Attempt to load palettes relative to typical overworld directory
            const resp = await fetch('../props/palettes.json');
            const data = await resp.json();
            this.CATEGORY_MAP = data._category_map || {};
            delete data._doc; delete data._category_map;
            this.PALETTES = data;
        } catch(e) {
            console.warn('[ProceduralTexturePlugin] Could not load palettes.json. Using fallback logic.');
            this.PALETTES = {
                industrial: { colors:['#4a4a4a','#5c5c5c','#3d3d3d'], overlays:['ov_metal','ov_diamond','ov_rust'], textures:[], roughness:[0.75,0.95] },
                organic:    { colors:['#8B4513','#A0522D','#6B3A2A'], overlays:['ov_wood','ov_leather'], textures:[], roughness:[0.8,1.0] },
                abandoned:  { colors:['#5c5040','#4a4238','#6b5d4f'], overlays:['ov_rust','ov_concrete'], textures:[], roughness:[0.85,1.0] }
            };
            this.CATEGORY_MAP = { slum:['abandoned'], military:['industrial'], common:['organic'] };
        }
    }

    onUpdate(dt) {
        // Static procedural generation does not require per-frame physics ticks.
    }

    preloadAssets(basePath, names, cb) {
        let loaded = 0;
        if (names.length === 0) return cb();
        names.forEach(name => {
            const img = new Image();
            img.onload = () => { this.HERO_IMAGES[name] = img; loaded++; if(loaded === names.length) cb(); };
            img.onerror = () => { console.error("Failed to load", name); loaded++; if(loaded === names.length) cb(); };
            img.src = `${basePath}/${name}.png`;
        });
    }

    _generateMasterOverlays() {
        // Wood
        let c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        let ctx = c.getContext('2d', { willReadFrequently: true });
        let rng = mulberry32(42);
        let imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let grain = Math.sin(y * 0.5 + Math.sin(x * 0.02 + y * 0.1) * 3) * 0.5 + 0.5;
                let knot = Math.sin(x*0.08)*Math.cos(y*0.06);
                let finalAlpha = Math.min(255, Math.max(0, ditherAlpha(x, y, (grain*0.6 + Math.abs(knot)*0.4)*200 + (rng()-0.5)*80)));
                imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0; 
                imgData.data[idx+3] = finalAlpha;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 1;
        for (let i = 32; i < TEX_SIZE; i += 32) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(TEX_SIZE, i); ctx.stroke(); }
        this.MASTER_OVERLAYS['ov_wood'] = c;

        // Metal
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(77);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let val = ditherAlpha(x, y, (rng() - 0.5) * 15);
                if (val > 20) { imgData.data[idx]=255; imgData.data[idx+1]=255; imgData.data[idx+2]=255; imgData.data[idx+3]=15; } 
                else if (val < -20) { imgData.data[idx]=0; imgData.data[idx+1]=0; imgData.data[idx+2]=0; imgData.data[idx+3]=15; }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let rx = 16; rx < TEX_SIZE; rx += 32) {
            for (let ry = 16; ry < TEX_SIZE; ry += 32) {
                ctx.beginPath(); ctx.arc(rx, ry, 0.8, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(rx+1, ry+1, 0.8, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
            }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeRect(1, 1, TEX_SIZE-2, TEX_SIZE-2);
        this.MASTER_OVERLAYS['ov_metal'] = c;

        // Fabric
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(33);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                const crosshatch = (((x + y) % 4 < 2) ? 1.0 : -1.0) * (((x - y + 128) % 6 < 3) ? 1.0 : -1.0);
                let val = ditherAlpha(x, y, crosshatch*30 + Math.sin(x*0.04)*Math.sin(y*0.05)*60 + (rng() - 0.5)*80);
                if (val > 0) { imgData.data[idx]=255; imgData.data[idx+1]=255; imgData.data[idx+2]=255; imgData.data[idx+3]=Math.min(150, val); } 
                else { imgData.data[idx]=0; imgData.data[idx+1]=0; imgData.data[idx+2]=0; imgData.data[idx+3]=Math.min(180, -val); }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.MASTER_OVERLAYS['ov_fabric'] = c;

        // Brick
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(11);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let val = ditherAlpha(x, y, (rng() - 0.5) * 40);
                imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0;
                imgData.data[idx+3] = Math.max(0, val);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const bw = 32, bh = 16;
        for (let y = 0; y < TEX_SIZE; y += bh) {
            ctx.fillRect(0, y, TEX_SIZE, 2);
            let offset = (y / bh % 2 === 0) ? 0 : bw / 2;
            for (let x = offset; x < TEX_SIZE; x += bw) {
                ctx.fillRect(x, y, 2, bh);
            }
        }
        this.MASTER_OVERLAYS['ov_brick'] = c;

        // Concrete
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(55);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let lf = Math.sin(x*0.05)*Math.sin(y*0.05)*30;
                let val = ditherAlpha(x, y, lf + (rng() - 0.5) * 80);
                if (val > 0) {
                    imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0; 
                    imgData.data[idx+3] = Math.min(150, val);
                } else {
                    imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 255; 
                    imgData.data[idx+3] = Math.min(80, -val);
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.MASTER_OVERLAYS['ov_concrete'] = c;

        // Rust
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(99);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let lf = Math.sin(x*0.1)*Math.sin(y*0.1)*40;
                let val = ditherAlpha(x, y, lf + (rng()-0.5)*90);
                if (val > 20) {
                    imgData.data[idx] = 130; imgData.data[idx+1] = 60; imgData.data[idx+2] = 20;
                    imgData.data[idx+3] = Math.min(255, val * 3);
                } else if (val < -20) {
                    imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0;
                    imgData.data[idx+3] = Math.min(255, -val * 2);
                } else {
                    imgData.data[idx+3] = 0;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.MASTER_OVERLAYS['ov_rust'] = c;

        // Dirt
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        rng = mulberry32(5577);
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                const edgeDist = Math.min(x, y, TEX_SIZE-x, TEX_SIZE-y) / (TEX_SIZE*0.3);
                const edgeBias = Math.max(0, 1 - edgeDist) * 60;
                const noise = (rng() - 0.5) * 30 + edgeBias;
                const val = ditherAlpha(x, y, noise);
                if (val > 0) {
                    imgData.data[idx] = 40; imgData.data[idx+1] = 30; imgData.data[idx+2] = 20;
                    imgData.data[idx+3] = Math.min(90, val);
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.MASTER_OVERLAYS['ov_dirt'] = c;

        // Scratches
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d');
        ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
        rng = mulberry32(8833);
        ctx.strokeStyle = 'rgba(200,200,200,0.25)'; ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            const x1 = rng() * TEX_SIZE, y1 = rng() * TEX_SIZE;
            const angle = rng() * Math.PI;
            const len = 10 + rng() * 40;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(angle)*len, y1 + Math.sin(angle)*len);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(30,20,10,0.3)'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x1 = rng() * TEX_SIZE, y1 = rng() * TEX_SIZE;
            const angle = rng() * Math.PI;
            const len = 15 + rng() * 30;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(angle)*len, y1 + Math.sin(angle)*len);
            ctx.stroke();
        }
        this.MASTER_OVERLAYS['ov_scratches'] = c;

        // Wallpaper
        c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        ctx = c.getContext('2d', { willReadFrequently: true });
        imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const idx = (y * TEX_SIZE + x) * 4;
                let stripe = Math.sin((x + y)*0.2) > 0 ? 40 : 0;
                let val = ditherAlpha(x, y, stripe);
                imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0;
                imgData.data[idx+3] = Math.max(0, val);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.MASTER_OVERLAYS['ov_wallpaper'] = c;
    }

    // Resolves what colors/overlays a prop should have
    resolvePalette(category, propName, partType, seed) {
        if (this.TYPE_OVERLAY_MAP[partType] !== undefined) {
            return { color: null, overlay: this.TYPE_OVERLAY_MAP[partType], texture: null, roughness: 0.5 };
        }
        const paletteNames = this.CATEGORY_MAP[category] || this.CATEGORY_MAP['common'] || ['industrial'];
        const rng = mulberry32(seed);

        const palIdx = Math.floor(rng() * paletteNames.length);
        const paletteName = paletteNames[palIdx];
        const pal = this.PALETTES[paletteName] || this.PALETTES['industrial'] || { colors:['#666'], overlays:['ov_metal'], textures:[], roughness:[0.8,0.95] };

        const color = pal.colors[Math.floor(rng() * pal.colors.length)];
        let overlay = 'none';
        if (rng() > 0.3 && pal.overlays.length > 0) {
            overlay = pal.overlays[Math.floor(rng() * pal.overlays.length)];
        }
        let texture = null;
        if (pal.textures && pal.textures.length > 0) {
            texture = pal.textures[Math.floor(rng() * pal.textures.length)];
        }
        const roughMin = pal.roughness ? pal.roughness[0] : 0.8;
        const roughMax = pal.roughness ? pal.roughness[1] : 0.95;
        const roughness = roughMin + rng() * (roughMax - roughMin);

        return { color, overlay, texture, roughness, paletteName };
    }

    getAutoMaterial(category, propName, partIndex, partType, seed) {
        if (!window.THREE) return null;
        const partSeed = seed + partIndex * 7919;
        const resolved = this.resolvePalette(category, propName, partType, partSeed);

        if (resolved.texture) {
            return this.getTintedHeroMat(resolved.texture, resolved.color);
        }
        if (resolved.overlay && resolved.overlay !== 'none') {
            return this.getCompositeMat(resolved.color, resolved.overlay, 0.6);
        }
        return this.getSolidMat(resolved.color || '#666666');
    }

    getCompositeMat(hexColor, overlayKey, opacity=0.6, repeat=[1,1]) {
        if (!window.THREE) return null;
        const key = `${hexColor}_${overlayKey}_${repeat.join('_')}`;
        if (this.MAT_CACHE[key]) return this.MAT_CACHE[key];

        const c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
        const ctx = c.getContext('2d');
        ctx.fillStyle = hexColor; ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
        if (this.MASTER_OVERLAYS[overlayKey]) {
            ctx.globalAlpha = opacity;
            ctx.drawImage(this.MASTER_OVERLAYS[overlayKey], 0, 0);
        }

        const map = new THREE.CanvasTexture(c);
        map.magFilter = map.minFilter = THREE.NearestFilter; 
        map.wrapS = map.wrapT = THREE.RepeatWrapping; 
        map.repeat.set(repeat[0], repeat[1]);

        const mat = new THREE.MeshStandardMaterial({ map: map, roughness: 0.85 });
        this.MAT_CACHE[key] = mat;
        return mat;
    }

    getSolidMat(hexColor) {
        if (!window.THREE) return null;
        const key = `solid_${hexColor}`;
        if(this.MAT_CACHE[key]) return this.MAT_CACHE[key];
        const mat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.95 });
        this.MAT_CACHE[key] = mat;
        return mat;
    }

    getTintedHeroMat(heroName, tintHex = '#ffffff', stretchYFix = false) {
        if (!window.THREE) return null;
        const key = `${heroName}_${tintHex}_${stretchYFix}`;
        if (this.MAT_CACHE[key]) return this.MAT_CACHE[key];

        const img = this.HERO_IMAGES[heroName];
        if (!img) return this.getSolidMat(tintHex);
        
        const cHeight = stretchYFix ? TEX_SIZE * 3 : TEX_SIZE;
        const c = document.createElement('canvas'); c.width = TEX_SIZE; c.height = cHeight;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#b0b0b0'; 
        ctx.fillRect(0, 0, TEX_SIZE, cHeight);

        ctx.filter = 'grayscale(100%) contrast(1.2)';
        ctx.drawImage(img, 0, 0, TEX_SIZE, stretchYFix ? Math.floor(TEX_SIZE * 1.5) : TEX_SIZE);
        ctx.filter = 'none';

        if (tintHex && tintHex !== '#ffffff') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = tintHex;
            ctx.fillRect(0, 0, TEX_SIZE, cHeight);
        }

        const map = new THREE.CanvasTexture(c);
        map.magFilter = map.minFilter = THREE.NearestFilter;
        const mat = new THREE.MeshStandardMaterial({ map: map, roughness: 0.8 });
        this.MAT_CACHE[key] = mat;
        return mat;
    }
}
