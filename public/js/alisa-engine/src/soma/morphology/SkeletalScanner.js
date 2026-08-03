import * as THREE from 'three';

export class SkeletalScanner {
    /**
     * Extracts all Bone node names from a scene, sends them to an AI mapping service,
     * and returns a mapped SemanticAnatomy structure.
     * @param {THREE.Scene} scene
     * @param {Object} options
     * @param {string} [options.hubUrl] - Endpoint del servicio de mapeo por IA.
     *   SIN VALOR POR DEFECTO a propósito: antes apuntaba a `http://127.0.0.1:8741`,
     *   o sea que un motor descargado por cualquiera intentaba hablar con un hub
     *   privado. Si no se pasa, se devuelve el listado de huesos en crudo y quien
     *   llame decide qué hacer con él.
     */
    static async scanAndMap(scene, options = {}) {
        const hubUrl = options.hubUrl || null;
        const boneNames = [];
        const boneMap = new Map();

        // 1. Traverse and find all realistic skeleton bones (THREE.Bone or specifically named objects)
        scene.traverse((node) => {
            if (node.isBone || node.name.toLowerCase().includes('bone') || node.name.toLowerCase().includes('mixamorig')) {
                // Avoid too generic roots that aren't actually bones
                if (node.name.length > 1) {
                    boneNames.push(node.name);
                    boneMap.set(node.name, node);
                }
            }
        });

        // Dedup and clean
        const uniqueBones = [...new Set(boneNames)];
        if (uniqueBones.length === 0) {
            console.warn("[SkeletalScanner] No bones found in mesh.");
            return null;
        }

        // Sin endpoint no hay a quién preguntar: devolvemos los huesos crudos.
        // Es un resultado útil (ProceduralRiggingEngine puede trabajar con él),
        // no un fallo — y no se dispara ninguna llamada de red.
        if (!hubUrl) {
            console.log(`[SkeletalScanner] ${uniqueBones.length} huesos encontrados. ` +
                        `Sin options.hubUrl no se pide mapeo por IA; se devuelven en crudo.`);
            return { type: 'raw', mapping: null, bonesFound: uniqueBones };
        }

        console.log(`[SkeletalScanner] Discovered ${uniqueBones.length} bones. Handing off to AI...`);

        // 2. Transmit to AI mapping service
        try {
            const res = await fetch(`${hubUrl}/do/scan-skeleton`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nodes: uniqueBones })
            });

            if (!res.ok) throw new Error("Hub unreachable or error returned");
            
            const data = await res.json();
            if (data.status !== "ok") {
                console.error("[SkeletalScanner] AI error:", data.message);
                return null;
            }

            console.log(`[SkeletalScanner] AI Match Successful! (${data.model_used})`);
            console.table(data.mapping);

            // 3. Construct a standard SemanticAnatomy Definition backwards-compatible with ProceduralAnimator
            const aiMapping = data.mapping; 
            const syntheticBones = [];

            // Helper to get World position of a Three object since SemanticAnatomy expects bounding-box relative positions.
            // But ProceduralAnimator actually converts relative into world! 
            // If we use REAL GLB bones, ProceduralAnimator's injectVoxelBones expects a semantic array 
            // but wait, if it's already a SkinnedMesh, we don't need 'injectVoxelBones' to create bones and do skinning!
            // BUT the user Prompt asked: "Skeletal Scanner: AI parses nodes of .glb ... para asignar el ProceduralRiggingEngine dinamicamente"
            // Wait, ProceduralAnimator's "applyWalkCycle" needs nodes mapped with `role`.
            
            // So if we just want to run Procedural Locomotion on a real GLB (Mixamo), 
            // we don't need Inverse Distance Weighting skinning. We just need to tag the existing bones!
            return {
                type: "ai_mapped",
                mapping: aiMapping,
                bonesFound: uniqueBones
            };

        } catch (e) {
            console.error("[SkeletalScanner] Pipeline failed:", e);
            return null;
        }
    }

    /**
     * Tags an existing SkinnedMesh's bones with roles based on the AI mapping, 
     * making it compatible with `ProceduralAnimator.applyWalkCycle()`.
     */
    static tagBonesWithAIRoles(meshGroup, aiMapping) {
        let boneDict = {};
        let rootBone = null;
        
        meshGroup.traverse(node => {
            // Apply roles if this node is in our AI mapping
            for (const [role, name] of Object.entries(aiMapping)) {
                if (node.name === name) {
                    node.userData.role = role;
                    
                    // ProceduralAnimator applyWalkCycle expects a worldPos roughly defining its layout
                    const wpos = new THREE.Vector3();
                    node.getWorldPosition(wpos);
                    node.userData.worldPos = wpos;

                    boneDict[name] = { bone: node, role: role };

                    if (role === 'root' || role === 'spine') {
                        if (!rootBone) rootBone = node;
                    }
                }
            }
        });

        // Mock ProceduralSkinned structure so applyWalkCycle knows it can animate it
        let targetMesh = null;
        meshGroup.traverse(m => {
            if (m.isSkinnedMesh) targetMesh = m;
        });

        if (targetMesh && Object.keys(boneDict).length > 0) {
            targetMesh.userData.isProceduralSkinned = true; // Trick the animator
            targetMesh.userData.rootBone = rootBone;
            targetMesh.userData.bonesDict = boneDict;
            targetMesh.userData.animState = { phase: 0 };
            return true;
        }
        
        return false;
    }
}
