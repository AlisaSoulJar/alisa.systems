// ⚠️ Aquí había `import * as THREE from 'three'` y `THREE` sólo aparecía en los
// comentarios de tipo (`@param {THREE.Object3D}`), nunca en el código. Un import
// muerto ata el fichero al navegador para nada, y lo atado al navegador no lo
// puede cargar el banco.

/**
 * [ALISA V4 Engine: ProceduralRiggingEngine]
 * The bridge between the Hub's Multimodal Vision and Three.js Skeletons.
 * 
 * Auto-maps arbitrary humanoid .glb bones to ALISA's standard 'IKRig' template
 * by heuristically analyzing bone topology and bounding boxes. 
 * Allows any asset to become a sovereign 'Being' without manual Maya/Blender rigging.
 */
export class ProceduralRiggingEngine {
    constructor() {
        this.standardBones = [
            'Hips', 'Spine', 'Chest', 'Neck', 'Head',
            'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
            'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
            'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
            'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'
        ];
        
        // Dictionary mapping standard bones to the actual THREE.Bone in the current model
        this.boneMap = new Map();
        this.skeleton = null;
    }

    /**
     * Extracts the skeleton from a loaded GLTF scene and attempts heuristic mapping.
     * @param {THREE.Object3D} rootModel 
     */
    extractAndMapSkeleton(rootModel) {
        console.log(`[ProceduralRigging] Scanning topology for: ${rootModel.name || 'Unnamed Avatar'}`);
        let targetSkinnedMesh = null;
        
        rootModel.traverse((child) => {
            if (child.isSkinnedMesh) {
                targetSkinnedMesh = child;
            }
        });

        if (!targetSkinnedMesh) {
            console.warn(`[ProceduralRigging] No SkinnedMesh found. Cannot build IK Rig.`);
            return false;
        }

        this.skeleton = targetSkinnedMesh.skeleton;
        console.log(`[ProceduralRigging] Discovered Skeleton with ${this.skeleton.bones.length} bones.`);
        
        // Topological Heuristic Approach (Phase 1 of Auto-Rigging)
        // 1. Root bone is usually the one with no parent or parent is a standard Group.
        // 2. We can use string matching as a fallback before calling the Vision SDK.
        this._heuristicStringMatch();

        this._validateRig();
        return true;
    }

    /**
     * Fallback strategy: Match common Mixamo / Unity naming conventions
     */
    _heuristicStringMatch() {
        const bones = this.skeleton.bones;
        
        const dictionary = {
            'Hips': ['hips', 'pelvis', 'root'],
            'Spine': ['spine', 'chest', 'back'],
            'Head': ['head', 'cabEza'],
            'LeftArm': ['l_arm', 'leftarm', 'shoulder.l'],
            'RightArm': ['r_arm', 'rightarm', 'shoulder.r'],
            'LeftLeg': ['l_leg', 'leftleg', 'calf.l'],
            'RightLeg': ['r_leg', 'rightleg', 'calf.r']
        };

        for (const bone of bones) {
            const name = bone.name.toLowerCase();
            for (const [stdName, keywords] of Object.entries(dictionary)) {
                // If we haven't mapped this standard bone yet
                if (!this.boneMap.has(stdName)) {
                    for (const kw of keywords) {
                        if (name.includes(kw)) {
                            this.boneMap.set(stdName, bone);
                            console.log(`[ProceduralRigging] Mapped ${stdName} -> ${bone.name}`);
                            break;
                        }
                    }
                }
            }
        }
    }

    _validateRig() {
        const mappedCount = this.boneMap.size;
        console.log(`[ProceduralRigging] Rig Validation: Mapped ${mappedCount}/${this.standardBones.length} crucial bones.`);
        
        if (mappedCount < 5) {
            console.warn(`[ProceduralRigging] Critical mapping failure. Model requires Alisa Vision Monk SDK scan for deep topological analysis.`);
        } else {
            console.log(`[ProceduralRigging] Rig is viable for Inverse Kinematics (IK).`);
        }
    }

    /**
     * Extracts a frame for the Hub's Multimodal LLM to analyze the T-Pose 
     * and respond with the exact bone mappings.
     * @param {THREE.WebGLRenderer} renderer 
     * @param {THREE.Scene} scene 
     * @param {THREE.Camera} camera 
     */
    async requestVisionSDKMapping(renderer, scene, camera) {
        // [ALISA V4 SPEC] 
        // Generates a base64 snapshot and sends it to `http://127.0.0.1:8741/colony/monk/vision-scan`
        // Expecting a JSON return with bounding boxes mapped to bone names.
        console.log(`[ProceduralRigging] Requesting Monk Vision assistance via Hub...`);
        return { status: 'mock_pending_v4' };
    }
}
