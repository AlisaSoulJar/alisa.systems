/**
 * ═══════════════════════════════════════════════════════════════
 * SemanticAnatomy.js — Morphological Bone Dictionary
 * ═══════════════════════════════════════════════════════════════
 * Maps VoxelArchetypes to Intentional Bone Structures for
 * Procedural Auto-Rigging. Pure ES Module — zero window globals.
 *
 * Each archetype defines:
 *   - type: locomotion class (biped, quadruped, multiped, etc.)
 *   - bones[]: array of { name, position[x,y,z], parent?, role? }
 *
 * Positions use a semantic DSL relative to the BoundingBox:
 *   '0.5h' = 50% of height,  '-0.2w' = -20% of width,
 *   '0.3d' = 30% of depth.   Numbers are raw floats.
 */

export const SEMANTIC_ANATOMY = {
    // ─── HUMANOID BÍPEDOS (Bipedal) ───
    "humanoid": {
        type: "biped",
        bones: [
            { name: "root",  position: [0, 0, 0] },
            { name: "spine", position: [0, '0.5h', 0],      parent: "root" },
            { name: "head",  position: [0, '0.9h', 0],      parent: "spine", role: "head" },
            { name: "leg_l", position: ['0.2w', '0.25h', 0], parent: "root",  role: "leg" },
            { name: "leg_r", position: ['-0.2w', '0.25h', 0],parent: "root",  role: "leg" },
            { name: "arm_l", position: ['0.4w', '0.7h', 0],  parent: "spine", role: "arm" },
            { name: "arm_r", position: ['-0.4w', '0.7h', 0], parent: "spine", role: "arm" }
        ]
    },

    // ─── BRUTE (Gorillas, Trolls) ───
    "brute": {
        type: "biped_wide",
        bones: [
            { name: "root",  position: [0, 0, 0] },
            { name: "spine", position: [0, '0.4h', '0.1d'],   parent: "root" },
            { name: "head",  position: [0, '0.8h', 0],        parent: "spine", role: "head" },
            { name: "leg_l", position: ['0.3w', '0.2h', 0],   parent: "root",  role: "leg" },
            { name: "leg_r", position: ['-0.3w', '0.2h', 0],  parent: "root",  role: "leg" },
            { name: "arm_l", position: ['0.45w', '0.6h', 0],  parent: "spine", role: "arm" },
            { name: "arm_r", position: ['-0.45w', '0.6h', 0], parent: "spine", role: "arm" }
        ]
    },

    // ─── CUADRÚPEDOS LARGOS (Elephant, Dog, Cow) ───
    "quadruped_long": {
        type: "quadruped",
        bones: [
            { name: "root",       position: [0, 0, 0] },
            { name: "spine",      position: [0, '0.6h', 0],            parent: "root" },
            { name: "head_trunk", position: [0, '0.7h', '0.4d'],       parent: "spine", role: "head" },
            { name: "leg_fl",     position: ['0.25w', '0.3h', '0.3d'], parent: "root",  role: "leg" },
            { name: "leg_fr",     position: ['-0.25w', '0.3h', '0.3d'],parent: "root",  role: "leg" },
            { name: "leg_bl",     position: ['0.25w', '0.3h', '-0.3d'],parent: "root",  role: "leg" },
            { name: "leg_br",     position: ['-0.25w','0.3h','-0.3d'], parent: "root",  role: "leg" }
        ]
    },

    // ─── CUADRÚPEDOS ALTOS (Giraffe, Llama, Horse) ───
    "quadruped_tall": {
        type: "quadruped",
        bones: [
            { name: "root",   position: [0, 0, 0] },
            { name: "spine",  position: [0, '0.5h', 0],            parent: "root" },
            { name: "head",   position: [0, '0.9h', '0.3d'],       parent: "spine", role: "head" },
            { name: "leg_fl", position: ['0.2w', '0.4h', '0.2d'],  parent: "root",  role: "leg" },
            { name: "leg_fr", position: ['-0.2w', '0.4h', '0.2d'], parent: "root",  role: "leg" },
            { name: "leg_bl", position: ['0.2w', '0.4h', '-0.2d'], parent: "root",  role: "leg" },
            { name: "leg_br", position: ['-0.2w','0.4h','-0.2d'],  parent: "root",  role: "leg" }
        ]
    },

    // ─── CRAWLERS / MICRO (Insects, Snakes, Fish) ───
    "crawler": {
        type: "multiped",
        bones: [
            { name: "root",   position: [0, 0, 0] },
            { name: "spine",  position: [0, '0.5h', 0],             parent: "root" },
            { name: "head",   position: [0, '0.5h', '0.4d'],        parent: "spine", role: "head" },
            { name: "tail",   position: [0, '0.5h', '-0.4d'],       parent: "spine" },
            { name: "leg_fl", position: ['0.4w', '0.2h', '0.3d'],   parent: "root",  role: "leg" },
            { name: "leg_fr", position: ['-0.4w', '0.2h', '0.3d'],  parent: "root",  role: "leg" },
            { name: "leg_ml", position: ['0.4w', '0.2h', 0],        parent: "root",  role: "leg" },
            { name: "leg_mr", position: ['-0.4w', '0.2h', 0],       parent: "root",  role: "leg" },
            { name: "leg_bl", position: ['0.4w', '0.2h', '-0.3d'],  parent: "root",  role: "leg" },
            { name: "leg_br", position: ['-0.4w', '0.2h', '-0.3d'], parent: "root",  role: "leg" }
        ]
    },

    // ─── AVIAN (Birds, Dragons) ───
    "avian": {
        type: "biped_winged",
        bones: [
            { name: "root",   position: [0, 0, 0] },
            { name: "spine",  position: [0, '0.4h', 0],            parent: "root" },
            { name: "head",   position: [0, '0.8h', '0.2d'],       parent: "spine", role: "head" },
            { name: "leg_l",  position: ['0.15w', '0.2h', '-0.1d'],parent: "root",  role: "leg" },
            { name: "leg_r",  position: ['-0.15w','0.2h','-0.1d'], parent: "root",  role: "leg" },
            { name: "wing_l", position: ['0.4w', '0.6h', '0.1d'],  parent: "spine", role: "wing" },
            { name: "wing_r", position: ['-0.4w', '0.6h', '0.1d'], parent: "spine", role: "wing" }
        ]
    }
};

/**
 * Deduce an archetype key from SEMANTIC_ANATOMY based on keyword matching
 * in the mesh/file name. Returns null if no biological match (→ static prop).
 */
export function deduceSemanticArchetype(name) {
    const n = name.toLowerCase();

    if (n.includes('elephant') || n.includes('cow') || n.includes('dog') || n.includes('wolf') || n.includes('cat'))
        return 'quadruped_long';
    if (n.includes('giraffe') || n.includes('llama') || n.includes('horse') || n.includes('deer'))
        return 'quadruped_tall';
    if (n.includes('ant') || n.includes('bug') || n.includes('snake') || n.includes('worm') || n.includes('fish') || n.includes('mouse'))
        return 'crawler';
    if (n.includes('bird') || n.includes('chicken') || n.includes('dragon') || n.includes('bat') || n.includes('eagle'))
        return 'avian';
    if (n.includes('gorilla') || n.includes('orc') || n.includes('troll'))
        return 'brute';
    if (n.includes('human') || n.includes('generic') || n.includes('pig') || n.includes('male') || n.includes('female'))
        return 'humanoid';

    return null; // No biological match → treat as static prop
}
