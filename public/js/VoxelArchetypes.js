/**
 * ===============================================================
 * KATAMARI SOVEREIGN MATRICES (Voxel Archetypes)
 * ===============================================================
 * Leyes Físicas del Panteón de ALISA.
 * Define los contenedores volumétricos (en voxels relativos gw, gh, gd)
 * para cualquier entidad, forzando un mapeo determinista en la escala del mundo.
 */

const ARCHETYPE_MATRICES = {
    // --- 1. FAUNA ---
    "humanoid": { gw: 3, gh: 6, gd: 2 },        // Tall, thin, wide enough for arms (36 voxels max)
    "brute": { gw: 5, gh: 5, gd: 4 },           // Orcs, Gorillas. Wide, hunched (100 voxels max)
    "quadruped_long": { gw: 2, gh: 4, gd: 6 },  // Horses, Cows, Lizards. Focus on Z depth (48 voxels max)
    "quadruped_tall": { gw: 3, gh: 7, gd: 4 },  // Llamas, Giraffes. Focus on Y height (84 voxels max)
    "crawler": { gw: 3, gh: 1, gd: 6 },         // Snakes, Centipedes. Ultra low profile (18 voxels max)
    "avian": { gw: 8, gh: 2, gd: 4 },           // Birds, Dragons. Massive X wingspan (64 voxels max)
    
    // --- 2. VEHICLES ---
    "vehicle_car": { gw: 4, gh: 3, gd: 6 },     // Standard car, van. Medium block (72 voxels max)
    "vehicle_truck": { gw: 4, gh: 4, gd: 10 },  // Semi, Train. Extreme Z length (160 voxels max)
    "vehicle_bike": { gw: 2, gh: 4, gd: 5 },    // Motorcycle, Vespa. Very thin X (40 voxels max)
    "vehicle_air": { gw: 10, gh: 3, gd: 8 },    // Airplane, Heli. Incredible X/Z footprint (240 voxels max)

    // --- 3. PROPS & ARCHITECTURE ---
    "prop_cube": { gw: 4, gh: 4, gd: 4 },       // Barrel, Washer, Crate. Rigid (64 voxels max)
    "prop_tall": { gw: 2, gh: 8, gd: 2 },       // Lamp post, Vending Machine. Vertical (32 voxels max)
    "prop_wall": { gw: 8, gh: 6, gd: 1 },       // TV, Billboard, Fence. Flat plane (48 voxels max)
    "prop_floor": { gw: 8, gh: 1, gd: 8 },      // Pool, Helipad, Rug. Floor plane (64 voxels max)

    // --- 4. CELESTIALS ---
    "celestial_sphere": { gw: 10, gh: 10, gd: 10 }, // Planets, Moons. Gigantic spheres (1000 voxels max)
    "celestial_flat": { gw: 16, gh: 2, gd: 16 }     // Halos, Asteroid belts. Disc shaped (512 voxels max)
};

// --- The Katamari Powers of 10 Tiers Data ---
// REFACTORED to Base-3 Fractal Voxel Matrix (Tier 0 cell = 0.3m. Each tier voxel = 3x3x3 voxels of prior tier)
const KATAMARI_TIERS = [
    { level: -3, name: "Tier -3: Micro", color: 0x00ffaa, archetype: "crawler", model: "props/models/Ant.glb" },
    { level: -2, name: "Tier -2: Tiny", color: 0x00ffff, archetype: "quadruped_long", model: "props/models/Mouse.glb" },
    { level: -1, name: "Tier -1: Small Fauna", color: 0xffcc00, archetype: "quadruped_long", model: "props/models/Dog.glb" },
    { level: 0, name: "Tier 0: Base Humanoid", color: 0x0088ff, archetype: "humanoid", model: "props/models/Generic Male.glb" },
    { level: 1, name: "Tier 1: Megafauna/Vehicles", color: 0xff9900, archetype: "vehicle_car", model: "props/models/Elephant.glb" },
    { level: 2, name: "Tier 2: Colossal", color: 0xbb00ff, archetype: "vehicle_air", model: "props/models/Whale.glb" },
    { level: 3, name: "Tier 3: Mega-Structure", color: 0xff8800, archetype: "prop_floor", model: "props/models/tankship.glb" },
    { level: 4, name: "Tier 4: Arcology", color: 0x00ff88, archetype: "celestial_flat", model: "props/models/Floating Island.glb" },
    { level: 5, name: "Tier 5: City Chunk", color: 0xaa00aa, archetype: "celestial_sphere", model: "" },
    { level: 6, name: "Tier 6: Orbital Habitat", color: 0x8800bb, archetype: "celestial_flat", model: "" },
    { level: 7, name: "Tier 7: Deep Space Anomaly", color: 0x6600cc, archetype: "celestial_sphere", model: "props/models/Planet (1).glb" },
    { level: 8, name: "Tier 8: Lunar Mass", color: 0x4400dd, archetype: "celestial_sphere", model: "" },
    { level: 9, name: "Tier 9: Planetary Core", color: 0x0088ff, archetype: "celestial_sphere", model: "props/models/Planet (1).glb" },
    { level: 10, name: "Tier 10: Earth Class", color: 0x00ccff, archetype: "celestial_sphere", model: "props/models/Planet (2).glb" },
    { level: 11, name: "Tier 11: Gas Giant", color: 0xff2222, archetype: "celestial_sphere", model: "" },
    { level: 12, name: "Tier 12: Stellar Mass", color: 0xffdd00, archetype: "celestial_sphere", model: "" },
    { level: 13, name: "Tier 13: Solar System", color: 0xffffff, archetype: "celestial_sphere", model: "" },
    { level: 14, name: "Tier 14: Galactic Core", color: 0xff00ff, archetype: "celestial_sphere", model: "" }
];

const BASE_CELL_SIZE = 0.3; // Tier 0 Voxel Size in meters

// Automatically quantize width, height and depth using the Base Voxel Unit (cell)
KATAMARI_TIERS.forEach(t => {
    // 1. Inherit the Sovereign Mathematical Boudaries
    const arch = ARCHETYPE_MATRICES[t.archetype] || ARCHETYPE_MATRICES["prop_cube"];
    t.gw = arch.gw;
    t.gh = arch.gh;
    t.gd = arch.gd;
    
    // 2. The Absolute Base-3 Fractal Law
    // Cell size dictamina la unidad. No se deriva del objeto; el voxel rige el espacio.
    t.cell = BASE_CELL_SIZE * Math.pow(3, t.level);
    
    // 3. Set actual physical float bounding box parameters for Three.js
    t.w = t.gw * t.cell;
    t.h = t.gh * t.cell;  
    t.d = t.gd * t.cell;
    
    // We compute the theoretical "size" (longest axis) purely as a reference for Arachne
    const maxAxis = Math.max(t.gw, t.gh, t.gd);
    t.size = maxAxis * t.cell;
});

// Expose to global scope for legacy standard <script> tags
if (typeof window !== 'undefined') {
    window.ARCHETYPE_MATRICES = ARCHETYPE_MATRICES;
    window.KATAMARI_TIERS = KATAMARI_TIERS;
}

export { ARCHETYPE_MATRICES, KATAMARI_TIERS };
