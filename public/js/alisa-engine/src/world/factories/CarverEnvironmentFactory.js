import * as THREE from 'three';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { ProceduralPropsFactory } from './ProceduralPropsFactory.js';
import { NeonSignFactory } from './NeonSignFactory.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
// ZoneType era una GLOBAL del monolito. En un módulo ES (modo estricto) no
// existe, y build() petaba con "ZoneType is not defined" al llegar al reparto
// de zonas. Vive en CarverSystem, que es quien genera zoneGrid.
import { ZoneType } from '../systems/CarverSystem.js';

export class CarverEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene, carverGrid) {
        super(scene);
        this.carver = carverGrid;
        
        this.TILE_SIZE_3D = 4;
        this.STEP_HEIGHT = 4;
        this.CURB_HEIGHT = 0.4;
        this.SIDEWALK_WIDTH = 1.0;
        
        this._usedTex = {};
        
        this.texFactory = new ProceduralTextureFactory();
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Esta factory ya tenía su montaje entero en build(); buildAll() es el
     * alias que la pone bajo el mismo contrato que las demás.
     *
     * OJO: la geometría NO sale de la config, sale de `carverGrid`, que se pasa
     * al CONSTRUCTOR con la forma:
     *     { w, h, grid: number[h][w], elevationGrid: number[h][w] }
     * (matrices 2D indexadas [y][x], no listas planas). Si no tienes una,
     * CarverEnvironmentFactory.demoGrid(w, h) te da una válida.
     */
    buildAll(_c = {}) {
        if (!this.carver?.grid) {
            throw new Error('CarverEnvironmentFactory: falta carverGrid { w, h, grid[y][x], elevationGrid[y][x] } ' +
                            'en el constructor. Usa CarverEnvironmentFactory.demoGrid(w, h) para una de prueba.');
        }
        return this.build();
    }

    /**
     * Rejilla de demostración: manzana rodeada de edificios con calles dentro.
     * Códigos de celda: 0 = calle · 1 = edificio · 2 = acera/transitable.
     *
     * build() consume CINCO campos, no dos: w, h, grid, elevationGrid, zoneGrid
     * y buildings. Faltando cualquiera peta con un "reading" sin contexto.
     *
     * @returns {{w:number, h:number, grid:number[][], elevationGrid:number[][],
     *            zoneGrid:number[][], buildings:Array}}
     */
    static demoGrid(w = 12, h = 12) {
        const grid = [], elevationGrid = [], zoneGrid = [];
        for (let y = 0; y < h; y++) {
            const row = [], erow = [], zrow = [];
            for (let x = 0; x < w; x++) {
                const borde = x === 0 || y === 0 || x === w - 1 || y === h - 1;
                row.push(borde ? 1 : (x % 4 === 0 || y % 4 === 0) ? 0 : 2);
                erow.push(0);
                zrow.push(0);
            }
            grid.push(row); elevationGrid.push(erow); zoneGrid.push(zrow);
        }
        return { w, h, grid, elevationGrid, zoneGrid, buildings: [] };
    }

    build() {
        // Setup initial variables and mats
        const TILE_SIZE_3D = this.TILE_SIZE_3D;
        const STEP_HEIGHT = this.STEP_HEIGHT;
        const CURB_HEIGHT = this.CURB_HEIGHT;
        const SIDEWALK_WIDTH = this.SIDEWALK_WIDTH;
        const scene = this.scene;
        const carver = this.carver;
        const flickerSystem = this.flickerSystem;
        const _usedTex = this._usedTex;
        const texFactory = this.texFactory;
        // Gancho de progreso opcional, capturado como local igual que el resto:
        // el bloque de abajo viene del monolito y no conviene fiarse de `this`.
        const onProgress = this.onProgress ?? (() => {});

// --- Extracted Monolith Code ---

const cx = (carver.w * TILE_SIZE_3D) / 2;
const cz = (carver.h * TILE_SIZE_3D) / 2;

// Assume scene is passed in


// Define Ghostly Materials (Base is dark translucent grey, lines are vivid neon)
const matBase = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6, metalness: 0.4 }); 

const textureLoader = new THREE.TextureLoader();

// PBR TEXTURES (Loaded from local /textures folder)
const texRoof = textureLoader.load('../textures/rooftop.png');
texRoof.wrapS = texRoof.wrapT = THREE.RepeatWrapping;
texRoof.magFilter = texRoof.minFilter = THREE.NearestFilter;

const texWall = textureLoader.load('../textures/concrete_wall.png');
texWall.wrapS = texWall.wrapT = THREE.RepeatWrapping;
texWall.magFilter = texWall.minFilter = THREE.NearestFilter;

const texAsphalt = [
    textureLoader.load('../textures/asphalt_1.png'),
    textureLoader.load('../textures/asphalt_2.png'),
    textureLoader.load('../textures/asphalt_3.png')
];
texAsphalt.forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.NearestFilter;
});

const texSidewalk = [
    textureLoader.load('../textures/sidewalk_1.png'),
    textureLoader.load('../textures/sidewalk_2.png'),
    textureLoader.load('../textures/sidewalk_3.png')
];
texSidewalk.forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.NearestFilter;
});

const matRoof = new THREE.MeshStandardMaterial({ 
    map: texRoof, color: 0x666666, roughness: 0.9, metalness: 0.1,
    emissiveMap: texRoof, emissive: 0x555555, emissiveIntensity: 0.6
}); 
const matRetainingWall = new THREE.MeshStandardMaterial({ 
    map: texWall, color: 0x888888, roughness: 1.0, metalness: 0.0,
    emissiveMap: texWall, emissive: 0x444444, emissiveIntensity: 0.5
}); 

// Asphalt materials (very dark road surface — lit by streetlights & neon only)
const floorMatsAsphalt = texAsphalt.map(tex => new THREE.MeshStandardMaterial({ 
    map: tex, color: 0x333333, roughness: 0.95, metalness: 0.05
}));
// Sidewalk materials (dark concrete — receives light from farolas & facades)
const floorMatsSidewalk = texSidewalk.map(tex => new THREE.MeshStandardMaterial({ 
    map: tex, color: 0x555555, roughness: 0.9, metalness: 0.0
})); 


const _stripImages = {
    ground: new Image(),
    middle: new Image(),
    top: new Image()
};
// Use raw artifact images. We crop dynamically in drawImage.
_stripImages.ground.src = "../textures/strips/ground.png";
_stripImages.middle.src = "../textures/strips/middle.png";
_stripImages.top.src = "../textures/strips/top.png";

function getProceduralSkin(w, d, h, lineMat, seed, texFactory) {
    const floors = Math.max(1, Math.floor(h / 4));
    const variant = Math.floor(Math.abs(seed) % 3);
    const cacheKey = `carver_skin_${floors}_${variant}`;
    
    const tex = texFactory.getOrCreate(cacheKey, () => ProceduralTextureFactory.carverFacadeAtlas(floors, variant, _stripImages), {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearMipmapLinearFilter
    });
    
    return new THREE.MeshStandardMaterial({ 
        map: tex, 
        color: new THREE.Color(0x9999aa), 
        roughness: 0.8, 
        metalness: 0.2
    });
}

const lineMats = {
    CYAN: NeonSignFactory.createNeonLineMat(0x00ffff),
    RED: NeonSignFactory.createNeonLineMat(0xff0044),
    PURPLE: NeonSignFactory.createNeonLineMat(0x8800ff),
    YELLOW: NeonSignFactory.createNeonLineMat(0xffdd00),
    PINK: NeonSignFactory.createNeonLineMat(0xff00ff),
    GREEN: NeonSignFactory.createNeonLineMat(0x00ff44),
    ORANGE: NeonSignFactory.createNeonLineMat(0xff8800),
    GREY: NeonSignFactory.createNeonLineMat(0x444444)
};

// ==============================================================
// 3. 3D ARCHETYPE FACTORIES
// ==============================================================

function getLineMatForId(id) {
    if (id === 10) return lineMats.CYAN;
    if (id === 11) return lineMats.RED;
    if (id === 12) return lineMats.ORANGE;
    if (id === 13) return lineMats.PURPLE;
    if (id === 14) return lineMats.PURPLE; // Neon Club
    if (id === 15) return lineMats.YELLOW;
    if (id === 16) return lineMats.YELLOW;
    if (id === 17) return lineMats.ORANGE;
    if (id === 18) return lineMats.PINK;
    if (id === 19) return lineMats.GREEN;
    return lineMats.GREY; // 20 Vent Shaft
}

function applyTilingUVs(geo, w, h, d, scaleX = 8, scaleY = 8) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        let u = uv.getX(i);
        let v = uv.getY(i);
        let faceIdx = Math.floor(i / 4);
        if (faceIdx === 0 || faceIdx === 1) {
            u *= (d / scaleX); v *= (h / scaleY);
        } else if (faceIdx === 2 || faceIdx === 3) {
            u *= (w / scaleX); v *= (d / scaleX);
        } else {
            u *= (w / scaleX); v *= (h / scaleY);
        }
        uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
}



function createFacadeMaterials(texPath) {
    let tex = textureLoader.load(texPath);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.NearestFilter; // Sharp pixel art facades
    // Utilize the texture itself as emissive base. Darken the diffuse color to force stark contrast.
    let facadeMat = new THREE.MeshStandardMaterial({ 
        map: tex, 
        color: new THREE.Color(0x2b2b2b), // Deeply darken non-emissive rendering
        roughness: 0.8, 
        metalness: 0.3,
        emissiveMap: tex,
        emissive: new THREE.Color(0xefefef), // Keep natural colors intact without over-boosting
        emissiveIntensity: 1.2 // Cinematic level, no burning
    });
    // Add custom seed properties to unsync the flickers (Slower speeds now)
    facadeMat.userData = { flickerSeed: Math.random() * 100.0, flickerSpeed: 0.2 + Math.random() * 0.3 };
    if (flickerSystem) flickerSystem.register(facadeMat, { type: 'random', speed: facadeMat.userData.flickerSpeed, seed: facadeMat.userData.flickerSeed });
    
    return [
        facadeMat, // Right
        facadeMat, // Left
        matRoof,   // Top (roof uses new environmental material)
        matBase,   // Bottom
        facadeMat, // Front
        facadeMat  // Back
    ];
}



function createBlock(w, h, d, px, py, pz, lineMat, useAiMat = null) {
    const group = new THREE.Group();
    
    let scaleX = 8, scaleY = 8;
    if (useAiMat) {
        if (useAiMat.startsWith('corp')) { scaleX = 16; scaleY = 30; }       // 15 floors * 2u
        else if (useAiMat.startsWith('slum')) { scaleX = 16; scaleY = 20; }  // 10 floors * 2u
        else if (useAiMat.startsWith('military')) { scaleX = 16; scaleY = 12; } // 6 floors * 2u
        else if (useAiMat.startsWith('stall')) { scaleX = 8; scaleY = 4; }   // 2 floors * 2u
    }

    const geo = new THREE.BoxGeometry(w, h, d);
    if (useAiMat) {
        applyTilingUVs(geo, w, h, d, scaleX, scaleY);
    } else {
        // APPLY PRECISE 4-PANEL COMIC UV MAPPING
        // BoxGeometry face order: 
        // 0: Right, 1: Left, 2: Top, 3: Bottom, 4: Front, 5: Back
        const uv = geo.attributes.uv;
        const totalP = (w + d + w + d);
        // Panel 1 (Front): 0 to w/total
        const p10 = 0, p11 = w / totalP;
        // Panel 2 (Right): w/total to (w+d)/total
        const p20 = p11, p21 = (w+d)/totalP;
        // Panel 3 (Back): (w+d) to (2w+d)
        const p30 = p21, p31 = (w+w+d)/totalP;
        // Panel 4 (Left): (2w+d) to 1.0
        const p40 = p31, p41 = 1.0;
        
        for (let i = 0; i < uv.count; i++) {
            let u = uv.getX(i);
            let v = uv.getY(i);
            let faceIdx = Math.floor(i / 4);
            
            if (faceIdx === 4) u = (u === 1 ? p11 : p10); // Front
            else if (faceIdx === 0) u = (u === 1 ? p21 : p20); // Right
            else if (faceIdx === 5) u = (u === 1 ? p31 : p30); // Back
            else if (faceIdx === 1) u = (u === 1 ? p41 : p40); // Left
            
            uv.setXY(i, u, v);
        }
        uv.needsUpdate = true;
    }

    let materials = [lineMat, lineMat, lineMat, lineMat, lineMat, lineMat];
    if (useAiMat) {
        materials = createFacadeMaterials('../textures/' + useAiMat + '.png');
    } else {
        // Generate mapping from AI atlas
        let seed = px * 13 + pz * 7;
        let fMat = getProceduralSkin(w, d, h, lineMat, seed, texFactory);
        materials = [fMat, fMat, matRoof, matBase, fMat, fMat];
    }

    const mesh = new THREE.Mesh(geo, materials);
    group.add(mesh);
    // Wireframes (Edges) disabled globally on building blocks to preserve photorealistic PBR look
    
    // ==========================================
    // PROCEDURAL GREEBLES (Details & Props)
    // ==========================================
    // Only decorate large enough blocks to avoid chaotic clipping on tiny stalls
    if (!useAiMat && w >= 6 && d >= 6 && Math.random() > 0.3) {
        let greebleCount = Math.floor(Math.random() * 4) + 1;
        let roofY = h / 2; // relative to block center
        
        for(let i=0; i<greebleCount; i++) {
            let gx = (Math.random() - 0.5) * (w * 0.7);
            let gz = (Math.random() - 0.5) * (d * 0.7);
            let type = Math.random();
            
            if (type > 0.6) {
                // 📡 Comms Antenna / Spike
                let ah = 4 + Math.random() * 8;
                let antGeo = new THREE.CylinderGeometry(0.2, 0.4, ah, 5);
                let antMesh = new THREE.Mesh(antGeo, matRoof);
                antMesh.position.set(gx, roofY + ah/2, gz);
                group.add(antMesh);
            } else if (type > 0.3) {
                // 🧊 Roof HVAC / AC Unit
                let as = 1.5 + Math.random() * 2;
                let acGeo = new THREE.BoxGeometry(as, as, as);
                let acMesh = new THREE.Mesh(acGeo, matRoof);
                // Also add wireframe to big props
                let acWire = new THREE.LineSegments(new THREE.EdgesGeometry(acGeo), lineMats.GREY);
                acMesh.add(acWire);
                acMesh.position.set(gx, roofY + as/2, gz);
                group.add(acMesh);
            } else {
                // 🛰️ Radar Dish (Tilted Cylinder/Cone)
                let rGeo = new THREE.ConeGeometry(2, 1, 8);
                let rMesh = new THREE.Mesh(rGeo, matRoof);
                let edges = new THREE.LineSegments(new THREE.EdgesGeometry(rGeo), NeonSignFactory.createNeonLineMat(0x335533));
                rMesh.add(edges);
                rMesh.position.set(gx, roofY + 1.5, gz);
                rMesh.rotation.x = Math.random() * Math.PI/2;
                rMesh.rotation.y = Math.random() * Math.PI;
                group.add(rMesh);
            }
        }
    }
    
    // 📺 Mega-Billboards / Neon Signs on tall Facades
    if (!useAiMat && h >= 16 && w >= 6 && Math.random() > 0.6) {
        let bw = 1; let bh = 6 + Math.random() * 10; let bd = 4 + Math.random() * 6;
        let isSideX = Math.random() > 0.5; // Attach to X facade or Z facade?
        
        // Pick a random vibrant color for the sign (Cyan, Magenta, or Yellow)
        let signColors = [lineMats.CYAN, lineMats.PINK, lineMats.YELLOW];
        let signMat = signColors[Math.floor(Math.random() * signColors.length)];
        
        let sGeo = isSideX ? new THREE.BoxGeometry(bw, bh, bd) : new THREE.BoxGeometry(bd, bh, bw);
        let sMesh = new THREE.Mesh(sGeo, matBase);
        let sWire = new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), signMat);
        sMesh.add(sWire);
        
        let fx = isSideX ? (w/2 + 0.5) * (Math.random() > 0.5 ? 1 : -1) : 0;
        let fz = !isSideX ? (d/2 + 0.5) * (Math.random() > 0.5 ? 1 : -1) : 0;
        let fy = (Math.random() * 0.4) * h; // Random height on facade
        
        sMesh.position.set(fx, fy, fz);
        group.add(sMesh);
    }
    
    group.position.set(px, py, pz);
    return group;
}

// ==========================================
// --- CHEAP LIGHTING & FX TEXTURES ---
const texLightPool = texFactory.getOrCreate('carver_light_pool', () => ProceduralTextureFactory.lightPool());
const matLightPool = new THREE.MeshBasicMaterial({
    map: texLightPool,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -5
});

const texVapor = texFactory.getOrCreate('carver_vapor', () => ProceduralTextureFactory.vapor());

// PROCEDURAL GREEBLES (Props & Signs) - Factory Adapters
// ==========================================

const createStreetlight = (px, py, pz) => {
    const sl = ProceduralPropsFactory.createStreetlight(px, py, pz, matLightPool);
    scene.add(sl.mesh);
    if (flickerSystem) flickerSystem.register(sl.flickerMat, { type: 'sin', speed: sl.flickerMat.userData.flickerSpeed, seed: sl.flickerMat.userData.flickerSeed });
};

const createDumpster = (px, py, pz, rotY) => {
    scene.add(ProceduralPropsFactory.createDumpster(px, py, pz, rotY));
};

const createVapor = (px, py, pz) => {
    const vp = ProceduralPropsFactory.createVapor(px, py, pz, texVapor);
    scene.add(vp.mesh);
    if (flickerSystem) flickerSystem.register(vp.vaporMat, { type: 'vapor' });
};

const createNeonSign = (w, h, colorHex) => {
    const ns = NeonSignFactory.createNeonSign(w, h, colorHex);
    if (flickerSystem) flickerSystem.register(ns.flickerMat, { type: 'random', speed: ns.flickerMat.userData.flickerSpeed, seed: ns.flickerMat.userData.flickerSeed });
    return ns.mesh;
};

const createHologramSign = (w, h, text, colorHex) => {
    const hs = NeonSignFactory.createHologramSign(w, h, text, colorHex);
    if (flickerSystem) flickerSystem.registerHologram(hs.mesh, hs.tex, hs.speed);
    return hs.mesh;
};

function createCyl(r, h, px, py, pz, lineMat) {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(r, r, h, 8);
    const mesh = new THREE.Mesh(geo, matBase);
    const edges = new THREE.EdgesGeometry(geo);
    const wire = new THREE.LineSegments(edges, lineMat);
    group.add(mesh); group.add(wire);
    group.position.set(px, py, pz);
    return group;
}


function getAiMap(bx, by, categories) {
    let pool = [];
    // Currently relying on 01.png to 03.png in these folders
    categories.forEach(cat => {
        pool.push(`${cat}/01`);
        pool.push(`${cat}/02`);
        pool.push(`${cat}/03`);
    });
    
    // Spatial Awareness (Anti-Cloning)
    let n1 = _usedTex[`${bx-1},${by}`];
    let n2 = _usedTex[`${bx},${by-1}`];
    let filtered = pool.filter(t => t !== n1 && t !== n2);
    
    if(filtered.length === 0) filtered = pool; // Fallback strictly
    let picked = filtered[Math.floor(Math.random() * filtered.length)];
    
    // Reserve footprint coordinate minimally
    _usedTex[`${bx},${by}`] = picked;
    
    return picked;
}

const ArchetypeBuilders = {
    // 10: Corp V0 (5x5, T3D=20)
    10: (mat, bx, by) => {
        let g = new THREE.Group();
        g.add(createBlock(20, 6, 20, 0, 3, 0, mat)); // Base Podium
        let picked = getAiMap(bx, by, ['corp']);
        g.add(createBlock(12, 24, 12, 0, 18, 0, mat, picked)); // Main Tower
        
        // 40% chance of a giant Rooftop Hologram Billboard
        if (Math.random() > 0.6) {
            let cx = [0x00ffff, 0xff00ff, 0x00ffaa][Math.floor(Math.random()*3)];
            let msgs = ["ALISA::OS", "DEEP SPACE", "BUY NEURO", "NEO-TOKYO.HQ"];
            let msg = msgs[Math.floor(Math.random() * msgs.length)];
            let holo = createHologramSign(16, 4, msg, cx);
            holo.position.set(0, 32, 0); // Position exactly atop the 30u height tower 
            g.add(holo);
        }
        
        return g;
    },
    // 11: Ziggurat (4x4, T3D=16)
    11: (mat, bx, by, zone) => {
        let g = new THREE.Group();
        let cats = zone === 1 /*DOWNTOWN*/ ? ['corp'] : ['military'];
        let picked = getAiMap(bx, by, cats);
        g.add(createBlock(16, 6, 16, 0, 3, 0, mat, picked)); // Tier 1
        g.add(createBlock(12, 6, 12, 0, 9, 0, mat, picked)); // Tier 2
        g.add(createBlock(8, 6, 8, 0, 15, 0, mat, picked)); // Tier 3
        return g;
    },
    // 12: Military Base (4x4, T3D=16)
    12: (mat, bx, by) => {
        let g = new THREE.Group();
        let picked = getAiMap(bx, by, ['military']);
        g.add(createBlock(16, 12, 16, 0, 6, 0, mat, picked)); // Blocky clean keep
        return g;
    },
    // 13: Skybridge (3x3, T3D=12)
    13: (mat, bx, by, zone) => {
        let g = new THREE.Group();
        let cats = zone === 1 /*DOWNTOWN*/ ? ['corp'] : ['slum'];
        let p1 = getAiMap(bx, by, cats);
        let p2 = getAiMap(bx+2, by, cats); // Offset slightly for uniqueness
        
        g.add(createBlock(4, 20, 4, -4, 10, 0, mat, p1));
        g.add(createBlock(4, 20, 4, 4, 10, 0, mat, p2));
        g.add(createBlock(12, 4, 4, 0, 18, 0, mat, p1)); // Bridge matches one tower
        return g;
    },
    // 14: Neon Club (3x3, T3D=12)
    14: (mat, bx, by) => {
        let g = new THREE.Group();
        let picked = getAiMap(bx, by, ['stall', 'slum']);
        g.add(createBlock(12, 8, 12, 0, 4, 0, mat, picked));
        return g;
    },
    // 15: Slum Tower (2x2, T3D=8)
    15: (mat, bx, by, zone) => {
        let g = new THREE.Group();
        let picked = getAiMap(bx, by, ['slum']);
        g.add(createBlock(8, 24, 8, 0, 12, 0, mat, picked));
        if (Math.random() > 0.6) {
            let colors = [0x00ffff, 0xff00ff, 0x00ff44, 0xffcc00];
            let c = colors[Math.floor(Math.random() * colors.length)];
            let sign = createNeonSign(5, 12, c);
            sign.position.set(0, 12 + Math.random() * 4, 4.2);
            g.add(sign);
        }
        return g;
    },
    // 16: L-Shape (2x2, T3D=8)
    16: (mat, bx, by, zone) => {
        let g = new THREE.Group();
        let cats = zone === 2 /*INDUSTRIAL*/ ? ['military'] : ['slum'];
        let picked = getAiMap(bx, by, cats);
        g.add(createBlock(4, 12, 8, -2, 6, 0, mat, picked)); // Main trunk
        g.add(createBlock(4, 12, 4, 2, 6, -2, mat, picked)); // Wing
        return g;
    },
    // 17: Depot (2x2, T3D=8)
    17: (mat, bx, by) => {
        let g = new THREE.Group();
        let picked = getAiMap(bx, by, ['stall', 'military']);
        g.add(createBlock(8, 10, 8, 0, 5, 0, mat, picked));
        return g;
    },
    // 18: Stalls (1x1, T3D=4)
    18: (mat, bx, by) => {
        let g = new THREE.Group();
        let picked = getAiMap(bx, by, ['stall']);
        g.add(createBlock(4, 4, 4, 0, 2, 0, mat, picked));
        return g;
    },
    // 19: Capsule (1x1, T3D=4)
    19: (mat, bx, by, zone) => {
        let g = new THREE.Group();
        let cats = zone === 1 /*DOWNTOWN*/ ? ['corp'] : ['slum'];
        let picked = getAiMap(bx, by, cats);
        g.add(createBlock(3, 16, 3, 0, 8, 0, mat, picked));
        if (Math.random() > 0.5) {
            let colors = [0x00ffff, 0xff00ff, 0xff4400];
            let c = colors[Math.floor(Math.random() * colors.length)];
            let sign = createNeonSign(2, 6, c);
            sign.position.set(1.6, 8, 0); 
            sign.rotation.y = Math.PI / 2;
            g.add(sign);
        }
        return g;
    },
    // 20: Vent Shaft (1x1, T3D=4)
    20: (mat) => {
        let g = new THREE.Group();
        g.add(createBlock(4, 4, 4, 0, 2, 0, mat));
        // Random fan radius
        let fanR = 1 + Math.random()*1.5;
        g.add(createCyl(fanR, 2, 0, 5, 0, mat));
        return g;
    }
};

// ==============================================================
// 4. THE BRIDGE (2D -> 3D)
// ==============================================================



// Helper: is a grid cell a building? (id >= 10 means archetype building)
function isBuildingCell(gx, gy) {
    if (gx < 0 || gx >= carver.w || gy < 0 || gy >= carver.h) return false;
    return carver.grid[gy][gx] >= 10;
}

// Voxel Terrain (Elevations & Floor) with Asphalt + Sidewalk Edge Detection
for(let y=0; y<carver.h; y++) {
    for(let x=0; x<carver.w; x++) {
        const px = x * TILE_SIZE_3D;
        const pz = y * TILE_SIZE_3D;
        const surfaceY = carver.elevationGrid[y][x] * STEP_HEIGHT;
        const H = surfaceY + 4;
        
        // Deterministic seed for UV flipping
        let seed = (x * 73856093 ^ y * 19349663);
        let flipU = (seed & 1) !== 0;
        let flipV = (seed & 2) !== 0;
        
        // Pick asphalt variation using seed (stays consistent per tile)
        let asphaltIdx = Math.abs(seed) % floorMatsAsphalt.length;
        let topMat = floorMatsAsphalt[asphaltIdx];
        
        // Apply Concrete to vertical cliffs, Asphalt to horizontal floor
        const geoMats = [
            matRetainingWall, matRetainingWall, // Right, Left
            topMat,                             // Top (Road)
            matRetainingWall,                   // Bottom
            matRetainingWall, matRetainingWall  // Front, Back
        ];
        
        const geo = new THREE.BoxGeometry(TILE_SIZE_3D, H, TILE_SIZE_3D);
        
        // Adjust UV scaling for terrain voxel faces
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            let cx = uv.getX(i);
            let cy = uv.getY(i);
            let faceIdx = Math.floor(i / 4);
            if (faceIdx === 2 || faceIdx === 3) {
                let u = cx; let v = cy;
                if (flipU) u = 1 - u;
                if (flipV) v = 1 - v;
                uv.setXY(i, u * 3, v * 3);
            } else {
                uv.setXY(i, cx * 3, cy * (H/8));
            }
        }
        
        const mesh = new THREE.Mesh(geo, geoMats);
        mesh.position.set(px, surfaceY - H/2, pz);
        scene.add(mesh);
        // (Removed legacy tile-by-tile sidewalk logic)
    }
}

// Render Buildings
// Antes: document.getElementById('stats').innerText = ...
// El motor NO puede dar por hecho que existe un <div id="stats"> en la página:
// venía del monolito y hacía petar la factory en cualquier otra. Ahora es un
// gancho opcional —  fab.onProgress = txt => miHUD.textContent = txt;
onProgress(`Spawning ${carver.buildings.length} procedural buildings...`);

carver.buildings.forEach(b => {
    const px = b.x * TILE_SIZE_3D + (b.w * TILE_SIZE_3D)/2 - TILE_SIZE_3D/2;
    const pz = b.y * TILE_SIZE_3D + (b.h * TILE_SIZE_3D)/2 - TILE_SIZE_3D/2;
    
    // Clone material for unique variations per building
    let lineMat = getLineMatForId(b.type.id).clone();
    
    // 1. Hue Micro-shift (randomly shift the color tone slightly)
    let hsl = { h: 0, s: 0, l: 0 };
    lineMat.color.getHSL(hsl);
    lineMat.color.setHSL(Math.abs(hsl.h + (Math.random() * 0.1 - 0.05)), hsl.s, hsl.l);
    
    // 2. Blackouts / Dead Zones (15% chance in Slums/Industrial to have neon turned off)
    let zone = carver.zoneGrid[b.y][b.x];
    if (Math.random() > 0.85 && (zone === ZoneType.SLUMS || zone === ZoneType.INDUSTRIAL)) {
        lineMat.opacity = 0.02; // Ghosted, abandoned look
    }
    
    let builderFn = ArchetypeBuilders[b.type.id];
    
    if (builderFn) {
        let zoneVal = carver.zoneGrid[b.y][b.x];
        let meshGroup = builderFn(lineMat, b.x, b.y, zoneVal);
        
        // 3. Orthogonal Rotation (0, 90, 180, 270)
        meshGroup.rotation.y = (Math.PI / 2) * Math.floor(Math.random() * 4);
        
        // 4. Asymmetric Scaling (creates organic alleys instead of perfect grids)
        meshGroup.scale.x = 0.80 + Math.random() * 0.20;
        meshGroup.scale.z = 0.80 + Math.random() * 0.20;
        
        // 5. Adapt to Terrain Elevation (Foundation Anchoring)
        let maxStep = 0;
        for(let cy=Math.floor(b.y); cy<Math.ceil(b.y+b.h); cy++) {
            for(let cx=Math.floor(b.x); cx<Math.ceil(b.x+b.w); cx++) {
                if(carver.elevationGrid[cy] && carver.elevationGrid[cy][cx] > maxStep) {
                    maxStep = carver.elevationGrid[cy][cx];
                }
            }
        }
        
        const surfaceY = maxStep * STEP_HEIGHT;
        meshGroup.position.set(px, surfaceY + CURB_HEIGHT, pz);
        scene.add(meshGroup);
        
        // Foundation Block (Roots the building deep into the bedrock to cover cliff overhangs)
        const fw = b.w * TILE_SIZE_3D - 0.5; // Slight inset for visual distinction
        const fh = b.h * TILE_SIZE_3D - 0.5;
        const rootH = surfaceY + 4;
        const fGeo = new THREE.BoxGeometry(fw, rootH, fh);
        const fMesh = new THREE.Mesh(fGeo, floorMatsAsphalt[0]);
        const fWire = new THREE.LineSegments(new THREE.EdgesGeometry(fGeo), lineMats.GREY);
        fMesh.add(fWire);
        fMesh.position.set(px, surfaceY - rootH/2, pz);
        scene.add(fMesh);
    }
});

// ==============================================================
// 5. PROCEDURAL CITY BLOCKS (MANZANAS)
// ==============================================================
(function generateCityBlocks() {
    let visited = new Array(carver.h).fill(0).map(() => new Array(carver.w).fill(false));
    
    for(let y=0; y<carver.h; y++) {
        for(let x=0; x<carver.w; x++) {
            if(isBuildingCell(x,y) && !visited[y][x]) {
                // 1. BFS to trace complete contiguous block
                let cluster = [];
                let q = [{x,y}];
                visited[y][x] = true;
                let maxStep = carver.elevationGrid[y] ? carver.elevationGrid[y][x] : 0;
                let blockSeed = (x * 73856 ^ y * 19349); // Seed based on origin
                
                while(q.length > 0) {
                    let p = q.shift();
                    cluster.push(p);
                    if (carver.elevationGrid[p.y] && carver.elevationGrid[p.y][p.x] > maxStep) {
                        maxStep = carver.elevationGrid[p.y][p.x];
                    }
                    const dirs = [{dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1}];
                    for(let d of dirs) {
                        let nx = p.x + d.dx, ny = p.y + d.dy;
                        if(nx>=0 && nx<carver.w && ny>=0 && ny<carver.h && isBuildingCell(nx,ny) && !visited[ny][nx]) {
                            visited[ny][nx] = true;
                            q.push({x:nx, y:ny});
                        }
                    }
                }
                
                const surfaceY = maxStep * STEP_HEIGHT;
                
                // 2. Extract bounding edges of the cluster
                let edges = new Map();
                let addEdge = (x1, y1, x2, y2) => {
                    let key = `${x1},${y1}->${x2},${y2}`;
                    let reverseKey = `${x2},${y2}->${x1},${y1}`;
                    if (edges.has(reverseKey)) edges.delete(reverseKey);
                    else edges.set(key, {p1:{x:x1,y:y1}, p2:{x:x2,y:y2}});
                };
                
                for(let cell of cluster) {
                    addEdge(cell.x, cell.y, cell.x+1, cell.y); // Top
                    addEdge(cell.x+1, cell.y, cell.x+1, cell.y+1); // Right
                    addEdge(cell.x+1, cell.y+1, cell.x, cell.y+1); // Bottom
                    addEdge(cell.x, cell.y+1, cell.x, cell.y); // Left
                }
                
                let edgeList = Array.from(edges.values());
                if(edgeList.length === 0) continue;
                
                // 3. Link edges into ordered clockwise polygon
                let orderedVertices = [];
                let currentEdge = edgeList[0];
                orderedVertices.push(currentEdge.p1);
                
                let edgeMap = new Map();
                for(let e of edgeList) edgeMap.set(`${e.p1.x},${e.p1.y}`, e);
                
                while(orderedVertices.length <= edgeList.length) {
                    let nextP = currentEdge.p2;
                    if(nextP.x === orderedVertices[0].x && nextP.y === orderedVertices[0].y) break;
                    orderedVertices.push(nextP);
                    currentEdge = edgeMap.get(`${nextP.x},${nextP.y}`);
                    if(!currentEdge) break;
                }
                
                // 4. Simplify Collinear Points
                let simplified = [];
                for(let i=0; i<orderedVertices.length; i++) {
                    let p_prev = orderedVertices[(i-1+orderedVertices.length)%orderedVertices.length];
                    let p = orderedVertices[i];
                    let p_next = orderedVertices[(i+1)%orderedVertices.length];
                    if (Math.sign(p.x - p_prev.x) !== Math.sign(p_next.x - p.x) || 
                        Math.sign(p.y - p_prev.y) !== Math.sign(p_next.y - p.y)) {
                        simplified.push(p);
                    }
                }
                
                // 5. Expand & Chamfer (Chaflanes) -> Convert to 3D coords
                let expanded = [];
                for(let i=0; i<simplified.length; i++) {
                    let p_prev = simplified[(i-1+simplified.length)%simplified.length];
                    let p = simplified[i];
                    let p_next = simplified[(i+1)%simplified.length];
                    
                    // Vectors direction
                    let vInX = p.x - p_prev.x, vInY = p.y - p_prev.y;
                    let lenIn = Math.hypot(vInX, vInY);
                    let nInX = -vInY/lenIn, nInY = vInX/lenIn; // Outward normal
                    
                    let vOutX = p_next.x - p.x, vOutY = p_next.y - p.y;
                    let lenOut = Math.hypot(vOutX, vOutY);
                    let nOutX = -vOutY/lenOut, nOutY = vOutX/lenOut; // Outward normal
                    
                    // Cross product to find convexity
                    let cross = vInX * vOutY - vInY * vOutX;
                    
                    // Base 3D Point (Tile space to World space)
                    let p3X = p.x * TILE_SIZE_3D - TILE_SIZE_3D/2;
                    let p3Z = p.y * TILE_SIZE_3D - TILE_SIZE_3D/2;
                    
                    if (cross > 0) {
                        // Convex Turn -> Chamfer (Add two shifted vertices)
                        expanded.push({ x: p3X + nInX*SIDEWALK_WIDTH, z: p3Z + nInY*SIDEWALK_WIDTH });
                        expanded.push({ x: p3X + nOutX*SIDEWALK_WIDTH, z: p3Z + nOutY*SIDEWALK_WIDTH });
                    } else {
                        // Concave Turn -> Inside corner (One merged offset vertex)
                        expanded.push({ x: p3X + nInX*SIDEWALK_WIDTH + nOutX*SIDEWALK_WIDTH, 
                                        z: p3Z + nInY*SIDEWALK_WIDTH + nOutY*SIDEWALK_WIDTH });
                    }
                }
                
                // 6. Erosion (Noise along edges to rough up curbs)
                let eroded = [];
                for(let i=0; i<expanded.length; i++) {
                    let pA = expanded[i];
                    let pB = expanded[(i+1)%expanded.length];
                    eroded.push(pA);
                    
                    let dist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
                    if (dist > 1.5) { // Only erode segments long enough
                        let segments = Math.floor(dist / 0.8);
                        let nX = -(pB.z - pA.z) / dist;
                        let nZ = (pB.x - pA.x) / dist;
                        
                        // Seeded random for deterministic erosion
                        let rng = function(seedOffset) {
                            let s = Math.abs((blockSeed + seedOffset) * 16807) % 2147483647;
                            return (s / 2147483647);
                        };
                        
                        for(let s=1; s<segments; s++) {
                            let t = s / segments;
                            let noise = (rng(i*100 + s) * 0.15); // Slight inward erosion push
                            eroded.push({ 
                                x: pA.x + (pB.x - pA.x) * t + nX * noise, 
                                z: pA.z + (pB.z - pA.z) * t + nZ * noise 
                            });
                        }
                    }
                }
                
                // 7. Extrude 3D Polygon
                const shape = new THREE.Shape();
                shape.moveTo(eroded[0].x, eroded[0].z);
                for(let i=1; i<eroded.length; i++) {
                    shape.lineTo(eroded[i].x, eroded[i].z);
                }
                shape.lineTo(eroded[0].x, eroded[0].z);
                
                const extrudeSettings = {
                    depth: CURB_HEIGHT,
                    bevelEnabled: false
                };
                const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                geom.rotateX(-Math.PI / 2); // Lay flat on XZ plane, extrusion upward (+Y)
                
                // Top sidewalk material (mat index 0), side curb material (mat index 1)
                let sidewalkIdx = Math.abs(blockSeed) % floorMatsSidewalk.length;
                let swMat = floorMatsSidewalk[sidewalkIdx];
                let curbMat = matRetainingWall; 
                
                const mesh = new THREE.Mesh(geom, [swMat, curbMat]);
                mesh.position.set(0, surfaceY, 0); // Position at terrain level (extruding upward to surfaceY+CURB_HEIGHT)
                scene.add(mesh);
            }
        }
    }
})();

// ==============================================================
// 6. INFRASTRUCTURE BUILDERS (Modular Pieces Catalog)
// ==============================================================

const pathMat = floorMatsSidewalk[0]; // Infrastructure uses sidewalk texture

const InfrastructureBuilders = {
    
    // STAIRWAY: Proper stepped staircase with side walls and treads
    // Returns a Group positioned at origin; caller places it at the boundary
    stairway: (mat, totalWidth, totalRise, numSteps, direction) => {
        const g = new THREE.Group();
        const stepRise = totalRise / numSteps;
        const stepRun = TILE_SIZE_3D / numSteps;
        const slabH = 0.25;
        const wallThickness = 0.15;
        const wallMat = matRetainingWall;
        
        for (let i = 0; i < numSteps; i++) {
            let stepY = stepRise * (i + 1);
            
            // Tread (the flat part you step on)
            let treadW = direction === 'x' ? stepRun : totalWidth;
            let treadD = direction === 'z' ? stepRun : totalWidth;
            let tGeo = new THREE.BoxGeometry(treadW, slabH, treadD);
            let tMesh = new THREE.Mesh(tGeo, mat);
            
            let offset = -TILE_SIZE_3D/2 + stepRun/2 + i * stepRun;
            let ox = direction === 'x' ? offset : 0;
            let oz = direction === 'z' ? offset : 0;
            tMesh.position.set(ox, stepY, oz);
            g.add(tMesh);
            
            // Riser (the vertical face of the step)
            let riserW = direction === 'x' ? slabH : totalWidth;
            let riserD = direction === 'z' ? slabH : totalWidth;
            let rGeo = new THREE.BoxGeometry(riserW, stepRise, riserD);
            let rMesh = new THREE.Mesh(rGeo, wallMat);
            let rox = direction === 'x' ? (offset - stepRun/2) : 0;
            let roz = direction === 'z' ? (offset - stepRun/2) : 0;
            rMesh.position.set(rox, stepY - stepRise/2, roz);
            g.add(rMesh);
        }
        
        // Side walls (two thin walls flanking the staircase)
        let wallH = totalRise + 0.5;
        let wallLen = TILE_SIZE_3D;
        for (let side of [-1, 1]) {
            let wGeo, wMesh;
            if (direction === 'x') {
                wGeo = new THREE.BoxGeometry(wallLen, wallH, wallThickness);
                wMesh = new THREE.Mesh(wGeo, wallMat);
                wMesh.position.set(0, totalRise/2, side * (totalWidth/2));
            } else {
                wGeo = new THREE.BoxGeometry(wallThickness, wallH, wallLen);
                wMesh = new THREE.Mesh(wGeo, wallMat);
                wMesh.position.set(side * (totalWidth/2), totalRise/2, 0);
            }
            g.add(wMesh);
        }
        
        return g;
    },
    
    // ELEVATOR: Industrial shaft with rails, platform, and cabin
    elevator: (mat, totalRise, lowY) => {
        const g = new THREE.Group();
        const tw = 2.5;
        const shaftH = totalRise + 6;
        
        // Central shaft column
        let shaft = new THREE.Mesh(
            new THREE.BoxGeometry(tw, shaftH, tw), mat
        );
        shaft.position.set(0, lowY + shaftH/2, 0);
        g.add(shaft);
        
        // 4 corner rails
        const railMat = lineMats.PINK;
        for (let rx of [-tw/2, tw/2]) {
            for (let rz of [-tw/2, tw/2]) {
                let rail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.08, shaftH, 4), railMat
                );
                rail.position.set(rx, lowY + shaftH/2, rz);
                g.add(rail);
            }
        }
        
        // Platform at bottom
        let platGeo = new THREE.BoxGeometry(tw + 0.6, 0.3, tw + 0.6);
        let plat = new THREE.Mesh(platGeo, mat);
        plat.position.set(0, lowY + 0.15, 0);
        g.add(plat);
        
        // Cabin at random height
        let cabH = 2.0;
        let cab = new THREE.Mesh(
            new THREE.BoxGeometry(tw + 0.3, cabH, tw + 0.3), mat
        );
        cab.position.set(0, lowY + cabH + Math.random() * (totalRise - cabH), 0);
        g.add(cab);
        
        return g;
    },
    
    // GUARDRAIL: Low railing along cliff edges
    guardrail: (length, height, direction) => {
        const g = new THREE.Group();
        const railMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.6 });
        
        // Top bar
        let barW = direction === 'x' ? length : 0.08;
        let barD = direction === 'z' ? length : 0.08;
        let bar = new THREE.Mesh(
            new THREE.BoxGeometry(barW, 0.08, barD), railMat
        );
        bar.position.set(0, height, 0);
        g.add(bar);
        
        // Vertical posts every 2 units
        let numPosts = Math.max(2, Math.floor(length / 2));
        for (let i = 0; i < numPosts; i++) {
            let t = -length/2 + (length / (numPosts-1)) * i;
            let post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, height, 4), railMat
            );
            if (direction === 'x') post.position.set(t, height/2, 0);
            else post.position.set(0, height/2, t);
            g.add(post);
        }
        
        return g;
    }
};

// 6.b PATHWAY PLACEMENT (using InfrastructureBuilders)
for(let y=0; y<carver.h; y++) {
    for(let x=0; x<carver.w; x++) {
        if (carver.grid[y][x] === 0 || carver.grid[y][x] === 2) {
            let e1 = carver.elevationGrid[y][x];
            let p1x = x * TILE_SIZE_3D;
            let p1z = y * TILE_SIZE_3D;
            
            let checks = [ { dx: 1, dy: 0, dir: 'x' }, { dx: 0, dy: 1, dir: 'z' } ];
            
            for(let chk of checks) {
                let nx = x + chk.dx;
                let ny = y + chk.dy;
                
                if (nx < carver.w && ny < carver.h && (carver.grid[ny][nx] === 0 || carver.grid[ny][nx] === 2)) {
                    let e2 = carver.elevationGrid[ny][nx];
                    let delta = Math.abs(e2 - e1);
                    
                    if (delta >= 1) {
                        let lowY = Math.min(e1, e2) * STEP_HEIGHT;
                        let highY = Math.max(e1, e2) * STEP_HEIGHT;
                        let dropH = highY - lowY;
                        let isAscending = (chk.dx > 0 ? e2 > e1 : e2 > e1);
                        
                        // Center boundary between tiles
                        let mx = p1x + (chk.dx * TILE_SIZE_3D / 2);
                        let mz = p1z + (chk.dy * TILE_SIZE_3D / 2);
                        
                        if (delta <= 2) {
                            // STAIRWAY piece
                            let numSteps = delta * 4;
                            let piece = InfrastructureBuilders.stairway(
                                pathMat, 2.8, dropH, numSteps, chk.dir
                            );
                            if (!isAscending) piece.rotation.y = Math.PI;
                            piece.position.set(mx, lowY, mz);
                            scene.add(piece);
                        } else {
                            // ELEVATOR piece
                            let piece = InfrastructureBuilders.elevator(
                                pathMat, dropH, lowY
                            );
                            piece.position.set(mx, 0, mz);
                            scene.add(piece);
                        }
                    }
                }
            }
        }
    }
}

// ==============================================================
// 6.b PROCEDURAL PROPS (Streetlights, Dumpsters, Signs)
// ==============================================================
for(let y=0; y<carver.h; y++) {
    for(let x=0; x<carver.w; x++) {
        let cell = carver.grid[y][x];
        if (cell === 0 || cell === 2) {
            let px = x * TILE_SIZE_3D;
            let pz = y * TILE_SIZE_3D;
            let py = carver.elevationGrid[y][x] * STEP_HEIGHT;
            let seed = Math.abs(x * 937 + y * 811);
            let zone = carver.zoneGrid ? carver.zoneGrid[y][x] : 4; 
            
            // Check building adjacency
            let nb = {
                t: y>0 && carver.grid[y-1][x]===1,
                b: y<carver.h-1 && carver.grid[y+1][x]===1,
                l: x>0 && carver.grid[y][x-1]===1,
                r: x<carver.w-1 && carver.grid[y][x+1]===1
            };
            
            // A 10x10 road tile. Edge of building is at 5.0 from center.
            // Sidewalk width is 1.0. So prop should be at 4.0 from center towards the building.
            const offset = TILE_SIZE_3D / 2 - 1.2; 
            
            if (nb.t && seed % 2 === 0) createStreetlight(px, py, pz - offset);
            else if (nb.b && seed % 2 === 1) createStreetlight(px, py, pz + offset);
            else if (nb.l && seed % 2 === 0) createStreetlight(px - offset, py, pz);
            else if (nb.r && seed % 2 === 1) createStreetlight(px + offset, py, pz);

            // Dumpsters 
            if (seed % 13 === 0) {
                if (nb.t) createDumpster(px, py, pz - offset + 0.5, 0);
                else if (nb.l) createDumpster(px - offset + 0.5, py, pz, Math.PI/2);
            }
            
            // Holograms/Neons directly attached to building walls near the road
            if (seed % 17 === 0) {
                let signColor = [0x00ffff, 0xff00ff, 0xffdd00][seed % 3];
                let sign = (seed % 2 === 0) ? 
                    createHologramSign(4, 1, "ALISA", signColor) : 
                    createNeonSign(1.5, 6, signColor);
                
                if (nb.t) { sign.position.set(px, py + 4.0, pz - offset - 0.5); scene.add(sign); }
                else if (nb.b) { sign.position.set(px, py + 4.0, pz + offset + 0.5); sign.rotation.y = Math.PI; scene.add(sign); }
                else if (nb.l) { sign.position.set(px - offset - 0.5, py + 4.0, pz); sign.rotation.y = Math.PI/2; scene.add(sign); }
                else if (nb.r) { sign.position.set(px + offset + 0.5, py + 4.0, pz); sign.rotation.y = -Math.PI/2; scene.add(sign); }
            }
        }
    }
}

// DIAGNOSTIC - GUARANTEE SOMETHING VISIBLE
const diagGeo = new THREE.SphereGeometry(15, 32, 32);
const diagMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const diagMesh = new THREE.Mesh(diagGeo, diagMat);
diagMesh.position.set(0, 30, 0);
scene.add(diagMesh);

// ==============================================================
// 6.c STREET DECALS (Ground Detail Layer)
// ==============================================================

// Preload manhole sprite texture
const _manholeImg = new Image();
_manholeImg.src = '../textures/decal_manhole.png';
_manholeImg.onload = () => {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.drawImage(_manholeImg, 0, 0, 32, 32);
    StreetDecals._manholeTexLoaded = c;
};
const StreetDecals = {
    // Manhole cover — uses AI-generated 16-bit pixel art sprite
    _manholeTexLoaded: null,
    manhole: () => {
        // Return pre-loaded texture canvas or generate fallback
        if (StreetDecals._manholeTexLoaded) return StreetDecals._manholeTexLoaded;
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(13, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(8, 13); ctx.stroke();
        return c;
    },
    
    // Crack — jagged line across surface
    crack: (seed) => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let px = (seed & 3), py = (seed >> 2) & 7;
        ctx.moveTo(px, py);
        for (let i = 0; i < 5; i++) {
            px += 2 + ((seed >> (i+4)) & 3);
            py += ((seed >> (i+7)) & 3) - 1;
            py = Math.max(1, Math.min(14, py));
            ctx.lineTo(Math.min(15, px), py);
        }
        ctx.stroke();
        // Branch
        ctx.strokeStyle = '#222222';
        ctx.beginPath();
        ctx.moveTo(Math.min(12, px-3), py);
        ctx.lineTo(Math.min(14, px-1), py + ((seed & 1) ? 3 : -3));
        ctx.stroke();
        return c;
    },
    
    // Oil stain — dark irregular blob
    oilStain: (seed) => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0d0d12';
        ctx.beginPath();
        let rx = 3 + (seed & 3), ry = 2 + ((seed >> 2) & 3);
        ctx.ellipse(8, 8, rx, ry, (seed & 7) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Iridescent highlight
        ctx.fillStyle = '#1a1a2a';
        ctx.beginPath();
        ctx.ellipse(7, 7, rx - 1, ry - 1, (seed & 7) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        return c;
    },
    
    // Trash / debris — small scattered shapes
    trash: (seed) => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        const colors = ['#444444', '#3a3a2a', '#2a2a2a', '#4a3a2a'];
        for (let i = 0; i < 3 + (seed & 3); i++) {
            ctx.fillStyle = colors[((seed >> (i*2)) & 3)];
            let tx = 2 + ((seed >> (i*3+1)) & 0xb);
            let ty = 2 + ((seed >> (i*3+4)) & 0xb);
            let tw = 1 + ((seed >> (i+8)) & 1);
            let th = 1 + ((seed >> (i+10)) & 1);
            ctx.fillRect(tx, ty, tw, th);
        }
        return c;
    },
    
    // Puddle — dark reflective patch 
    puddle: (seed) => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath();
        let rx = 4 + (seed & 3), ry = 2 + ((seed >> 2) & 3);
        ctx.ellipse(8, 8, rx, ry, (seed & 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Reflection highlight
        ctx.fillStyle = '#141428';
        ctx.fillRect(6, 6, 3, 1);
        return c;
    },
    
    // Crosswalk — zebra stripes
    crosswalk: (direction) => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ccccaa';
        let numStripes = 4;
        for (let i = 0; i < numStripes; i++) {
            if (direction === 'x') {
                ctx.fillRect(0, i * 4, 16, 2);
            } else {
                ctx.fillRect(i * 4, 0, 2, 16);
            }
        }
        return c;
    }
};

// Create a decal plane from a canvas
function spawnDecal(canvas, px, py, pz, size) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        side: THREE.DoubleSide
    });
    
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    mesh.position.set(px, py + 0.02, pz); // Float just above surface
    scene.add(mesh);
}

// Decal placement loop
for(let y=0; y<carver.h; y++) {
    for(let x=0; x<carver.w; x++) {
        let cellVal = carver.grid[y][x];
        if (cellVal !== 0 && cellVal !== 2) continue;
        
        let px = x * TILE_SIZE_3D;
        let pz = y * TILE_SIZE_3D;
        let py = carver.elevationGrid[y][x] * STEP_HEIGHT;
        let zone = carver.zoneGrid ? carver.zoneGrid[y][x] : 0; // Fallback to 0 if zones ungen
        let seed = Math.abs(x * 73856093 ^ y * 19349663);
        
        let hasCenterDecal = false;
        
        // --- MULTUALLY EXCLUSIVE CENTER DECALS ---
        
        // 1. CROSSWALKS (avenue intersections only)
        let hasHorizRoad = (x > 0 && x < carver.w-1 && carver.grid[y][x-1] === 0 && carver.grid[y][x+1] === 0);
        let hasVertRoad = (y > 0 && y < carver.h-1 && carver.grid[y-1][x] === 0 && carver.grid[y+1][x] === 0);
        let isCrosswalk = hasHorizRoad && hasVertRoad && seed % 3 === 0;
        
        if (isCrosswalk) {
            let crossDir = (seed & 1) ? 'x' : 'z';
            spawnDecal(StreetDecals.crosswalk(crossDir), px, py, pz, TILE_SIZE_3D * 0.9);
            hasCenterDecal = true;
        } 
        else if (seed % 12 === 0) {
            // MANHOLE
            spawnDecal(StreetDecals.manhole(), px, py, pz, 2.0);
            hasCenterDecal = true;
            // Sometimes spawn toxic vapor over manholes
            if (seed % 3 === 0) {
                createVapor(px, py, pz);
            }
        }
        else if (seed % 10 === 0) {
            // OIL STAINS (Industrial & Downtown vibes, more frequent)
            spawnDecal(StreetDecals.oilStain(seed >> 3), px + ((seed >> 6) & 1), py, pz, 2.0);
            hasCenterDecal = true;
        }
        else if (seed % 13 === 0) {
            // PUDDLES
            spawnDecal(StreetDecals.puddle(seed >> 4), px, py, pz, 2.5);
            hasCenterDecal = true;
        }
        
        // --- PERIPHERAL DECALS (Can coexist if no center decal occupies exact center) ---
        
        // CRACKS (frequent, ~20% of tiles, offset from center)
        if (seed % 5 === 0 && !hasCenterDecal) {
            spawnDecal(StreetDecals.crack(seed), px + ((seed & 3) - 1.5) * 0.5, py, pz + (((seed >> 4) & 3) - 1.5) * 0.5, 2.5);
        }
        
        // TRASH (scattered visually, based on zone density, offset randomly)
        let spawnTrash = false;
        if (zone === ZoneType.SLUMS && seed % 4 === 0) spawnTrash = true;
        else if (zone === ZoneType.NIGHTLIFE && seed % 8 === 0) spawnTrash = true;
        else if (seed % 15 === 0) spawnTrash = true; // Random general trash
        
        if (spawnTrash && !hasCenterDecal) {
            spawnDecal(StreetDecals.trash(seed >> 2), px + ((seed & 3) - 1.5), py, pz + (((seed >> 2) & 3) - 1.5), 1.8);
        }
    }
}


// ==============================================================
// 7. FAUNA (Simulated Entities)
// ==============================================================
        // ==============================================================
        // 7. FAUNA (Simulated Entities using TrafficSystem)
        // ==============================================================
        this.trafficSystem = new TrafficSystem(scene, carver.grid, carver.elevationGrid, {
            tileSize: TILE_SIZE_3D, stepHeight: STEP_HEIGHT
        });
        
        let spawnAttempts = 0;
        let spawnedCount = 0;
        while(spawnedCount < 100 && spawnAttempts < 5000) {
            let sx = Math.floor(Math.random() * carver.w);
            let sy = Math.floor(Math.random() * carver.h);
            if (carver.grid[sy][sx] === 0 || carver.grid[sy][sx] === 2) {
                this.trafficSystem.spawnAgent(sx, sy, Math.random() > 0.8);
                spawnedCount++;
            }
            spawnAttempts++;
        }

        // --- End Extracted Code ---

        // Antes: `return { group: group }` — pero ese `group` solo existía
        // dentro de dos funciones auxiliares (líneas ~258 y ~431), así que aquí
        // era otra global huérfana del monolito y tiraba "group is not defined".
        //
        // LIMITACIÓN CONOCIDA: esta factory cuelga la ciudad DIRECTAMENTE de la
        // escena, no de un contenedor propio, así que no hay un `group` único
        // que devolver ni con el que moverla o borrarla de golpe. Envolverla
        // pediría tocar los ~200 `scene.add()` del bloque extraído; queda
        // apuntado como deuda, no lo tapamos con un grupo vacío que mentiría.
        return {
            scene: this.scene,
            trafficSystem: this.trafficSystem ?? null
        };
    }
    
    // Extracted global pure functions inside class
    getProceduralSkin() { return null; }

    update(dt) {
        super.update(dt); // Ticks the flickerSystem automatically
        if (this.trafficSystem) {
            this.trafficSystem.update(dt);
        }
    }
}
