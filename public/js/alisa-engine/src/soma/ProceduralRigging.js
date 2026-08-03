import * as THREE from 'three';

/**
 * ToplogyExtractor (NUEVO PARADIGMA)
 * Convierte un grafo analítico de rodajas MST en una estructura ósea orgánica
 * extrayendo la espina y agrupando las extremidades en columnas verticales.
 */
class TopologyExtractor {
    static extract(detectedSlices, modelSize, modelMin, archetypeType) {
        const bones = [];
        function addBone(p1, p2) {
            bones.push([new THREE.Vector3(...p1.toArray()), new THREE.Vector3(...p2.toArray())]);
        }

        // Si no hay rodajas, o son muy pocas, devolvemos null para fallback
        if (!detectedSlices || detectedSlices.length < 2) return null;

        const ySlices = detectedSlices.filter(s => s.axis === 'y');
        const zSlices = detectedSlices.filter(s => s.axis === 'z');
        const xSlices = detectedSlices.filter(s => s.axis === 'x');

        // 1. ESPINA DORSAL (Buscamos el eje más largo)
        const spineAxis = (modelSize.z > modelSize.x) ? 'z' : 'x';
        const rawSpineSlices = (spineAxis === 'z') ? zSlices : xSlices;
        
        if (rawSpineSlices.length < 2) return null;

        // Ordenamos de cabeza a cola (o viceversa dependiendo del eje)
        rawSpineSlices.sort((a,b) => a.center[spineAxis] - b.center[spineAxis]);

        // Simplificamos agrupando por tramos (bins) a lo largo del eje espinal.
        // Dentro de cada tramo, escogemos la rodaja con el mayor volumen radial ('spread')
        // para asegurar que la placa base se fija al torso y NUNCA a los apéndices laterales.
        const spineStep = modelSize[spineAxis] * 0.15; // Un hueso cada 15% del cuerpo
        const bins = [];
        const startCoord = rawSpineSlices[0].center[spineAxis];

        rawSpineSlices.forEach(s => {
            const stepIdx = Math.floor((s.center[spineAxis] - startCoord) / spineStep);
            if (!bins[stepIdx]) bins[stepIdx] = [];
            // Si el slice no tiene spread (legacy fallback), le damos 0
            bins[stepIdx].push({ slice: s, spread: s.spread || 0 });
        });

        const spineNodes = [];
        bins.forEach(bin => {
            if (!bin || bin.length === 0) return;
            // El "tallo principal" es SIEMPRE la rodaja más masiva (spread max)
            let maxSpread = -Infinity;
            let bestSlice = bin[0].slice;
            bin.forEach(item => {
                if (item.spread > maxSpread) {
                    maxSpread = item.spread;
                    bestSlice = item.slice;
                }
            });
            spineNodes.push(bestSlice.center);
        });

        // Aseguramos que la cola y cabeza extremas siempre se incluyan
        if (spineNodes.length > 0 && spineNodes[spineNodes.length-1] !== rawSpineSlices[rawSpineSlices.length-1].center) {
            spineNodes.push(rawSpineSlices[rawSpineSlices.length-1].center);
        }

        // Construir huesos de la espina dorsal
        for(let i=0; i<spineNodes.length-1; i++) {
            addBone(spineNodes[i], spineNodes[i+1]);
        }

        // 2. EXTREMIDADES (Columnas Y)
        // Agrupamos las rodajas Y en columnas espaciales (XZ)
        const legColumns = [];
        const maxLegRadius = Math.max(modelSize.x, modelSize.z) * 0.4; // Ignorar torso gigante
        const columnRadiusXZ = Math.max(modelSize.x, modelSize.z) * 0.25;

        ySlices.forEach(vs => {
            if (vs.radius > maxLegRadius) return; // Probablemente torso

            let added = false;
            for (let col of legColumns) {
                // Comparamos con el centroide promedio de la columna
                let cx=0, cz=0;
                col.forEach(s => { cx += s.center.x; cz += s.center.z; });
                cx /= col.length; cz /= col.length;
                
                const distXZ = Math.hypot(cx - vs.center.x, cz - vs.center.z);
                if (distXZ < columnRadiusXZ) {
                    col.push(vs);
                    added = true;
                    break;
                }
            }
            if (!added) {
                legColumns.push([vs]);
            }
        });

        // Filtrar y construir las patas
        const finalLegs = legColumns.filter(col => col.length >= 2); // Al menos rodilla y pie
        
        finalLegs.forEach(col => {
            // Ordenar de abajo hacia arriba (Y ascendente)
            col.sort((a,b) => a.center.y - b.center.y);
            
            // Unir la pata interna
            for(let i=0; i<col.length-1; i++) {
                addBone(col[i].center, col[i+1].center);
            }
            
            // Conectar la cima de la pata a la espina dorsal asumiendo Hombros/Caderas
            const topPaw = col[col.length - 1].center;
            let closestSpine = null;
            let bestDist = Infinity;
            spineNodes.forEach(sn => {
                const dist = topPaw.distanceTo(sn);
                if (dist < bestDist) {
                    bestDist = dist;
                    closestSpine = sn;
                }
            });
            if (closestSpine) {
                addBone(topPaw, closestSpine);
            }
        });

        console.log(`[TopologicalExtractor] Extracted ${spineNodes.length} spine nodes and ${finalLegs.length} appendages.`);
        return bones;
    }
}

/**
 * ProceduralRigging
 * Code-driven procedural rigging and inverse kinematics 
 * for ALISA's 22 phylogenetic archetypes.
 */
export class ProceduralRigging {

    static buildArchetypeSkeleton(type, renderGroup, detectedSlices = [], injectedBones = null) {
            let bones = [];
            let mappedUB = null; // 📍 Guardará el Punto Cero Geodésico real
            function addBone(p1, p2, name1 = null, name2 = null) {
                const v1 = new THREE.Vector3(...p1);
                if (name1) v1.semanticName = name1;
                const v2 = new THREE.Vector3(...p2);
                if (name2) v2.semanticName = name2;
                bones.push([v1, v2]);
            }

            // === MODEL AABB: Computar desde la MALLA REAL (fuente de verdad) ===
            const modelBox = new THREE.Box3();
            let meshBox = new THREE.Box3();
            
            // PRIMARIO: AABB del mesh real
            if (renderGroup && renderGroup.children.length > 0) {
                const baseW = renderGroup.children[0];
                baseW.updateMatrixWorld(true);
                meshBox.setFromObject(baseW);
                modelBox.copy(meshBox);
            }
            
            // REFINAMIENTO Y-MAX (TRUCO CORE-SCALING):
            // Aplastar modelBox.max.y hasta el lomo real (ignorar colas/orejas).
            // También detectar los bordes Z del torso grueso (dónde nace la cola / cuello).
            let torsoMinZ = Infinity, torsoMaxZ = -Infinity; // Bordes longitudinales del torso
            let bodyTailZ = Infinity; // Juntura cuerpo-cola (umbral bajo)
            if (detectedSlices && detectedSlices.length > 0) {
                let maxSpread = 0;
                detectedSlices.forEach(s => { if (s.spread > maxSpread) maxSpread = s.spread; });
                
                let torsoMaxY = -Infinity;
                detectedSlices.forEach(cs => {
                    // Filtrar extremidades: el lomo es la parte más ancha
                    if (cs.spread > maxSpread * 0.35) { 
                        // En lugar del centroide, usamos los vértices si meshRef existe
                        if (cs.meshRef && cs.meshRef.geometry && cs.meshRef.geometry.attributes.position) {
                            const arr = cs.meshRef.geometry.attributes.position.array;
                            for (let i = 0; i < arr.length; i += 3) {
                                if (arr[i+1] > torsoMaxY) torsoMaxY = arr[i+1];
                            }
                        } else {
                            let ty = cs.center.y;
                            if (cs.axis !== 'y') ty += cs.spread * 0.8; 
                            if (ty > torsoMaxY) torsoMaxY = ty;
                        }
                        // Detectar bordes Z del torso
                        if (cs.center.z < torsoMinZ) torsoMinZ = cs.center.z;
                        if (cs.center.z > torsoMaxZ) torsoMaxZ = cs.center.z;
                    }
                });
                
                if (torsoMaxY > meshBox.min.y + 0.2 && torsoMaxY < meshBox.max.y) {
                    modelBox.max.y = torsoMaxY;
                }
                
                // Detectar la juntura cuerpo-cola: buscar el SALTO más grande de grosor
                // caminando de delante a atrás. Donde el spread cae en picado = base de la cola.
                const centralSlices = detectedSlices
                    .filter(cs => Math.abs(cs.center.x - (meshBox.min.x + meshBox.max.x) / 2) < (meshBox.max.x - meshBox.min.x) * 0.15)
                    .sort((a, b) => b.center.z - a.center.z); // Front to back (Z descendente)
                
                let biggestDrop = 0;
                bodyTailZ = torsoMinZ; // fallback
                for (let i = 1; i < centralSlices.length; i++) {
                    const drop = centralSlices[i - 1].spread - centralSlices[i].spread;
                    if (drop > biggestDrop && centralSlices[i].center.z < 0) {
                        biggestDrop = drop;
                        // Usamos la rodaja ANTES del salto (el último anillo del cuerpo)
                        // en lugar de la que está después (el primer anillo de la cola limpia)
                        bodyTailZ = centralSlices[i - 1].center.z; 
                    }
                }
            }
            // Fallback si no detectamos bordes Z
            if (!isFinite(torsoMinZ)) { torsoMinZ = modelBox.min.z; torsoMaxZ = modelBox.max.z; }
            if (!isFinite(bodyTailZ)) bodyTailZ = torsoMinZ;
            
            const modelSize = modelBox.getSize(new THREE.Vector3());
            const modelMin = modelBox.min;

            // INTENTO 0: Huesos inyectados desde Pygmalion
            if (injectedBones && injectedBones.length > 0) {
                console.log("[ProceduralRigging] Using Pygmalion injected bones!");
                injectedBones.forEach(boneArr => {
                    addBone(boneArr[0], boneArr[1]);
                });
                // When injecting pre-scaled/welded bones from Pygmalion, we DO NOT want kinematic pre-warp.
                // It is already geolocated in world space.
                return { bones, modelBox, meshBox, torsoMinZ, torsoMaxZ, bodyTailZ };
            }

            // INTENTO 1: Extracción topológica viva (Data-Driven BOTTOM-UP)
            let topologicalBones = null;
            if (!type || type === 'unknown' || type === 'none') {
                topologicalBones = TopologyExtractor.extract(detectedSlices, modelSize, modelMin, type);
            }

            if (topologicalBones && topologicalBones.length > 0) {
                bones = topologicalBones;
            } else {
                // INTENTO 2: Fallback Rígido
                if (type === 'humanoid') {
                addBone([0, 3.2, 2.0], [0, 3.8, 3.0], 'Neck', 'Head');   // neck/head
                addBone([-0.8, 3.0, 0], [0.8, 3.0, 0], 'L_Pelvis', 'R_Pelvis');  // heavy hips
                addBone([-0.8, 3.0, 0], [-1.0, 1.8, 0.8], 'L_Pelvis', 'L_Femur'); // L thigh
                addBone([-1.0, 1.8, 0.8], [-0.8, 1.0, -0.5], 'L_Femur', 'L_Tibia'); // L hock
                addBone([-0.8, 1.0, -0.5], [-0.8, 0, 0.5], 'L_Tibia', 'L_Foot'); // L foot
                addBone([0.8, 3.0, 0], [1.0, 1.8, 0.8], 'R_Pelvis', 'R_Femur'); // R thigh
                addBone([1.0, 1.8, 0.8], [0.8, 1.0, -0.5], 'R_Femur', 'R_Tibia'); // R hock
                addBone([0.8, 1.0, -0.5], [0.8, 0, 0.5], 'R_Tibia', 'R_Foot'); // R foot
                addBone([-0.6, 3.0, 1.8], [-0.8, 2.2, 2.0], 'L_Shoulder', 'L_Humerus'); // L arm (tiny)
                addBone([-0.8, 2.2, 2.0], [-0.6, 1.8, 2.2], 'L_Humerus', 'L_Radius'); // L claw
                addBone([0.6, 3.0, 1.8], [0.8, 2.2, 2.0], 'R_Shoulder', 'R_Humerus'); // R arm (tiny)
                addBone([0.8, 2.2, 2.0], [0.6, 1.8, 2.2], 'R_Humerus', 'R_Radius'); // R claw
            } else if (type === 'canine' || type.startsWith('feline')) {
                // === THE VOLUMETRIC TRAPEZOID (Torso Scaffolding) ===
                
                // --- RADIACIÓN ADAPTATIVA FILOGENÉTICA ---
                let shoulderW = 0.4;
                let pelvisW = 0.4;
                let tailBaseZ = -2.0;
                let pelvisZ = -1.4; // Por defecto el trasero es inclinado (trapecio)
                let tailTipZ = -2.5;
                let tailTipY = 6.0;

                if (type === 'feline_big') {
                    // Leones, Tigres, Panteras (Pecho de barril, cola más corta/fuerte, cuartos traseros rectos)
                    shoulderW = 0.65;
                    pelvisW = 0.55;
                    tailBaseZ = -1.8;
                    pelvisZ = -1.8; // Culo recto (pared posterior cae verticalmente)
                    tailTipY = 5.0;
                } else if (type === 'feline_house') {
                    // Gato doméstico (Estrechos, flexibles, trasero inclinado suave, cola muy larga)
                    shoulderW = 0.35;
                    pelvisW = 0.35;
                    tailBaseZ = -2.2;
                    pelvisZ = -1.4; 
                    tailTipY = 6.5;
                } else if (type === 'feline_medium') {
                    // Lince, Puma
                    shoulderW = 0.45;
                    pelvisW = 0.45;
                    tailTipY = 5.5;
                }
                
                // La parte trasera tiene altura real, pero el lomo (UB) se extiende
                // más atrás hasta la base de la cola, mientras la barriga (LB) acaba en la cadera (pelvisZ).
                const UB     = [0, 3.0, tailBaseZ]; // Upper Back (Coxis superior, nace directamente en el anillo de la cola)
                const LB     = [0, 1.5, pelvisZ];   // Lower Back (Pelvis inferior, nacen las patas)
                const MB     = [0, 3.0,  0.0]; // Mid Back (Lumbar espinal)
                const LM     = [0, 1.5,  0.0]; // Lower Mid (Barriga central)
                const UF     = [0, 3.0,  1.2]; // Upper Front (Hombro espinal)
                const LF     = [0, 1.5,  1.2]; // Lower Front (Hombro inferior)

                // Espina Dorsal
                addBone(UB, MB, 'Pelvis', 'Spine1');
                addBone(MB, UF, 'Spine1', 'Chest');
                
                // Barriga
                addBone(LB, LM);
                addBone(LM, LF);

                // Pilares (La pared trasera ahora es diagonal: cola -> caderas)
                addBone(UB, LB, 'Pelvis', null); // Pelvis trasera
                addBone(MB, LM, 'Spine1', null); // Costilla media
                addBone(UF, LF, 'Chest', null); // Costilla frontal (hombros)
                
                // === TAIL: Sale de UB (Arriba en el anillo trasero) ===
                // Adaptado al tamaño de especie
                const midTailY = 3.0 + (tailTipY - 3.0) * 0.5;
                const midTailZ = tailBaseZ + (tailTipZ - tailBaseZ) * 0.5;
                addBone(UB, [0, midTailY, midTailZ], 'Pelvis', 'Tail1');              
                addBone([0, midTailY, midTailZ], [0, tailTipY, tailTipZ], 'Tail1', 'Tail2'); 

                // === NECK & HEAD: Base Cervical + Cuello + Cabeza ===
                const CERVICAL = [0, 3.3, 1.5];
                addBone(UF, CERVICAL, 'Chest', 'Neck');                         // Hombro espinal → Base cervical
                addBone(CERVICAL, [0, 4.0, 1.8], 'Neck', 'Head');             // Base cervical → Cráneo
                addBone([0, 4.0, 1.8], [0, 3.6, 2.3], 'Head', 'Snout');        // Cráneo → Hocico
                addBone([0, 4.0, 1.8], [-0.2, 4.4, 1.6], 'Head', 'L_Ear');     // Oreja L
                addBone([0, 4.0, 1.8], [0.2, 4.4, 1.6], 'Head', 'R_Ear');      // Oreja R

                // === HINDLEGS: Nacen de LB (Abajo) ===
                // L Branch
                addBone(LB, [-pelvisW, 1.5, -1.4], null, 'L_Femur');                 // L Hip Width
                addBone([-pelvisW, 1.5, -1.4], [-0.5, 0.8, -0.8], 'L_Femur', 'L_Tibia');  // L Femur
                addBone([-0.5, 0.8, -0.8], [-0.5, 0.3, -1.4], 'L_Tibia', 'L_Foot');  // L Tibia
                addBone([-0.5, 0.3, -1.4], [-0.5, 0.0, -1.1], 'L_Foot', 'L_Toe');  // L Paw
                
                // R Branch
                addBone(LB, [pelvisW, 1.5, -1.4], null, 'R_Femur'); 
                addBone([pelvisW, 1.5, -1.4], [0.5, 0.8, -0.8], 'R_Femur', 'R_Tibia');
                addBone([0.5, 0.8, -0.8], [0.5, 0.3, -1.4], 'R_Tibia', 'R_Foot');
                addBone([0.5, 0.3, -1.4], [0.5, 0.0, -1.1], 'R_Foot', 'R_Toe');

                // === FORELEGS: Nacen de LF (hombro inferior) ===
                // L Branch
                addBone(LF, [-shoulderW, 1.5, 1.2], null, 'L_Humerus');                 // L Clavicle Width
                addBone([-shoulderW, 1.5, 1.2], [-0.5, 0.8, 1.0], 'L_Humerus', 'L_Radius');   // L Humerus
                addBone([-0.5, 0.8, 1.0], [-0.5, 0.3, 1.2], 'L_Radius', 'L_Hand');   // L Forearm
                addBone([-0.5, 0.3, 1.2], [-0.5, 0.0, 1.3], 'L_Hand', 'L_Finger');   // L Paw
                
                // R Branch
                addBone(LF, [shoulderW, 1.5, 1.2], null, 'R_Humerus'); 
                addBone([shoulderW, 1.5, 1.2], [0.5, 0.8, 1.0], 'R_Humerus', 'R_Radius');
                addBone([0.5, 0.8, 1.0], [0.5, 0.3, 1.2], 'R_Radius', 'R_Hand');
                addBone([0.5, 0.3, 1.2], [0.5, 0.0, 1.3], 'R_Hand', 'R_Finger');
            } else if (type === 'arachnid') {
                addBone([0, 1.8, -1.5], [0, 1.5, 0]);    // abdomen -> thorax
                addBone([0, 1.5, 0], [0, 1.4, 1.0]);     // thorax -> head
                [1, -1].forEach(side => {
                    // L1 (Front)
                    addBone([0, 1.5, 0], [side * 0.5, 1.6, 0.5]); 
                    addBone([side * 0.5, 1.6, 0.5], [side * 1.5, 2.0, 1.5]); 
                    addBone([side * 1.5, 2.0, 1.5], [side * 2.0, 0, 2.0]);
                    // L2 (Mid-Front)
                    addBone([0, 1.5, 0], [side * 0.6, 1.6, 0]); 
                    addBone([side * 0.6, 1.6, 0], [side * 1.8, 2.0, 0.5]); 
                    addBone([side * 1.8, 2.0, 0.5], [side * 2.5, 0, 1.0]);
                    // L3 (Mid-Back)
                    addBone([0, 1.5, 0], [side * 0.6, 1.6, -0.5]); 
                    addBone([side * 0.6, 1.6, -0.5], [side * 1.8, 2.0, -0.5]); 
                    addBone([side * 1.8, 2.0, -0.5], [side * 2.5, 0, -1.0]);
                    // L4 (Back)
                    addBone([0, 1.5, 0], [side * 0.5, 1.6, -1.0]); 
                    addBone([side * 0.5, 1.6, -1.0], [side * 1.5, 2.0, -1.5]); 
                    addBone([side * 1.5, 2.0, -1.5], [side * 2.0, 0, -2.0]);
                });
            } else if (type === 'serpentine') {
                const segs = [
                    [0, 0.5, 3.0], [0.5, 0.2, 2.0], [-0.5, 0.2, 1.0], [0.5, 0.2, 0],
                    [-0.5, 0.2, -1.0], [0.5, 0.2, -2.0], [0, 0.2, -3.0]
                ];
                for(let i=0; i<segs.length-1; i++) addBone(segs[i], segs[i+1]);
            } else if (type === 'piscine') {
                const spine = [
                    [0, 2.0, 3.0], [0, 2.0, 1.5], [0, 2.0, 0], [0, 2.0, -1.5], [0, 2.0, -3.0]
                ];
                for(let i=0; i<spine.length-1; i++) addBone(spine[i], spine[i+1]);
                // Pectoral/Pelvic Fins
                addBone([0, 2.0, 1.5], [1.5, 1.5, 1.0]); // R Pectoral
                addBone([0, 2.0, 1.5], [-1.5, 1.5, 1.0]); // L Pectoral
                addBone([0, 2.0, 0.0], [0.8, 1.0, -0.5]); // R Pelvic
                addBone([0, 2.0, 0.0], [-0.8, 1.0, -0.5]); // L Pelvic
                // Dorsal
                addBone([0, 2.0, 0.5], [0, 3.5, 0.0]);
                // Caudal (Tail - Vertical orientation for fish)
                addBone([0, 2.0, -3.0], [0, 3.5, -4.0]); // Top lobe
                addBone([0, 2.0, -3.0], [0, 0.5, -4.0]); // Bottom lobe
            } else if (type === 'cetacean') {
                const spine = [
                    [0, 2.0, 3.0], [0, 2.0, 1.5], [0, 2.0, 0], [0, 2.0, -1.5], [0, 2.0, -3.0]
                ];
                for(let i=0; i<spine.length-1; i++) addBone(spine[i], spine[i+1]);
                // Flippers (Front)
                addBone([0, 2.0, 1.5], [2.0, 1.5, 1.0]); // R Flipper
                addBone([0, 2.0, 1.5], [-2.0, 1.5, 1.0]); // L Flipper
                // Dorsal
                addBone([0, 2.0, 0.0], [0, 3.5, -0.5]);
                // Flukes (Tail - Horizontal orientation for marine mammals)
                addBone([0, 2.0, -3.0], [1.5, 2.0, -4.0]); // R Fluke
                addBone([0, 2.0, -3.0], [-1.5, 2.0, -4.0]); // L Fluke
            } else if (type === 'bird') {
                addBone([0, 2.0, -0.5], [0, 2.5, 1.0]); // spine
                addBone([0, 2.5, 1.0], [0, 3.2, 1.5]); // neck/head
                addBone([-0.4, 2.0, -0.5], [0.4, 2.0, -0.5]); // pelvis
                addBone([-0.4, 2.0, -0.5], [-0.4, 1.0, 0.2]); // L femur
                addBone([-0.4, 1.0, 0.2], [-0.4, 0, 0]); // L foot
                addBone([0.4, 2.0, -0.5], [0.4, 1.0, 0.2]); // R femur
                addBone([0.4, 1.0, 0.2], [0.4, 0, 0]); // R foot
                addBone([0, 2.5, 0.5], [-1.5, 2.3, 0.0]); // L wing mid
                addBone([-1.5, 2.3, 0.0], [-3.0, 2.2, -0.5]); // L wing tip
                addBone([0, 2.5, 0.5], [1.5, 2.3, 0.0]); // R wing mid
                addBone([1.5, 2.3, 0.0], [3.0, 2.2, -0.5]); // R wing tip
            } else if (type === 'primate') {
                // === GRAN SIMIO (Gorila/Chimpancé) ===
                // Intermembral index ~116 (brazos más largos que piernas)
                // Postura semi-erguida, espalda inclinada ~45°
                addBone([0, 2.0, 0], [0, 2.8, 0.3]);       // pelvis → lumbar
                addBone([0, 2.8, 0.3], [0, 3.5, 0.6]);     // lumbar → torso (inclinado adelante)
                addBone([0, 3.5, 0.6], [0, 3.8, 0.8]);     // torso → base cuello
                addBone([0, 3.8, 0.8], [0, 4.3, 1.0]);     // cuello → cráneo (cresta sagital)
                // === MANDÍBULA (prognatismo) ===
                addBone([0, 4.3, 1.0], [0, 4.0, 1.4]);     // mandíbula inferior prognata
                // === HOMBROS (muy anchos) ===
                addBone([0, 3.5, 0.6], [-0.9, 3.5, 0.6]);  // chest → L shoulder
                addBone([0, 3.5, 0.6], [0.9, 3.5, 0.6]);   // chest → R shoulder
                // === BRAZOS (largos — knuckle-walking) ===
                addBone([-0.9, 3.5, 0.6], [-1.0, 2.5, 0.8]);  // L húmero
                addBone([-1.0, 2.5, 0.8], [-1.0, 1.5, 1.2]);  // L antebrazo
                addBone([-1.0, 1.5, 1.2], [-1.0, 0.8, 1.4]);  // L mano/nudillos
                addBone([0.9, 3.5, 0.6], [1.0, 2.5, 0.8]);    // R húmero
                addBone([1.0, 2.5, 0.8], [1.0, 1.5, 1.2]);    // R antebrazo
                addBone([1.0, 1.5, 1.2], [1.0, 0.8, 1.4]);    // R mano/nudillos
                // === CADERAS ===
                addBone([0, 2.0, 0], [-0.5, 2.0, 0]);      // pelvis → L hip
                addBone([0, 2.0, 0], [0.5, 2.0, 0]);       // pelvis → R hip
                // === PIERNAS (cortas vs brazos) ===
                addBone([-0.5, 2.0, 0], [-0.5, 1.2, 0.2]); // L fémur
                addBone([-0.5, 1.2, 0.2], [-0.5, 0.4, 0]); // L tibia
                addBone([-0.5, 0.4, 0], [-0.5, 0, 0.2]);   // L pie (plantígrado)
                addBone([0.5, 2.0, 0], [0.5, 1.2, 0.2]);   // R fémur
                addBone([0.5, 1.2, 0.2], [0.5, 0.4, 0]);   // R tibia
                addBone([0.5, 0.4, 0], [0.5, 0, 0.2]);     // R pie
            } else if (type === 'lacertilian') {
                // === LAGARTO (Sprawling Gait) ===
                // Patas perpendiculares al cuerpo, cuerpo bajo pegado al suelo
                // Cola ~60% longitud total
                addBone([0, 0.8, -3.0], [0, 0.8, -2.0]);   // cola punta
                addBone([0, 0.8, -2.0], [0, 0.8, -1.0]);   // cola media
                addBone([0, 0.8, -1.0], [0, 1.0, 0]);      // cola base → pelvis
                addBone([0, 1.0, 0], [0, 1.2, 1.5]);       // pelvis → torso
                addBone([0, 1.2, 1.5], [0, 1.3, 2.5]);     // torso → hombros
                addBone([0, 1.3, 2.5], [0, 1.4, 3.2]);     // cuello → cabeza
                // === PATAS (sprawling a 90° del cuerpo) ===
                // Caderas → patas traseras
                addBone([0, 1.0, 0], [-0.6, 1.0, 0]);      // pelvis → L hip
                addBone([0, 1.0, 0], [0.6, 1.0, 0]);       // pelvis → R hip
                addBone([-0.6, 1.0, 0], [-1.4, 0.6, -0.3]);  // L fémur (lateral y abajo)
                addBone([-1.4, 0.6, -0.3], [-1.6, 0, 0.3]);  // L tibia (toca suelo)
                addBone([0.6, 1.0, 0], [1.4, 0.6, -0.3]);    // R fémur
                addBone([1.4, 0.6, -0.3], [1.6, 0, 0.3]);    // R tibia
                // Hombros → patas delanteras
                addBone([0, 1.2, 1.5], [-0.6, 1.2, 1.5]);    // chest → L shoulder
                addBone([0, 1.2, 1.5], [0.6, 1.2, 1.5]);     // chest → R shoulder
                addBone([-0.6, 1.2, 1.5], [-1.3, 0.6, 1.8]); // L húmero
                addBone([-1.3, 0.6, 1.8], [-1.5, 0, 2.2]);   // L radio
                addBone([0.6, 1.2, 1.5], [1.3, 0.6, 1.8]);   // R húmero
                addBone([1.3, 0.6, 1.8], [1.5, 0, 2.2]);     // R radio
            } else if (type === 'pachyderm') {
                // === ELEFANTE (Graviportal) ===
                // Espina dorsal rígida y arqueada, patas COLUMNA (casi verticales)
                // Sin clavícula, mandíbula con trompa
                addBone([0, 4.0, -2.0], [0, 4.2, -0.5]);   // pelvis → lumbar
                addBone([0, 4.2, -0.5], [0, 4.5, 1.0]);    // lumbar → torso (arco dorsal)
                addBone([0, 4.5, 1.0], [0, 4.3, 1.8]);     // torso → hombros
                addBone([0, 4.3, 1.8], [0, 4.5, 2.5]);     // base cuello → cráneo
                // === TROMPA (3 segmentos articulados) ===
                addBone([0, 4.5, 2.5], [0, 3.8, 3.2]);     // trompa proximal
                addBone([0, 3.8, 3.2], [0, 2.8, 3.6]);     // trompa media
                addBone([0, 2.8, 3.6], [0, 1.8, 3.8]);     // trompa distal (punta)
                // === OREJAS (grandes, laterales) ===
                addBone([0, 4.5, 2.5], [-1.2, 4.0, 2.2]);  // oreja izquierda
                addBone([0, 4.5, 2.5], [1.2, 4.0, 2.2]);   // oreja derecha
                // === COLA (corta, colgante) ===
                addBone([0, 4.0, -2.0], [0, 3.5, -2.8]);   // cola seg 1
                addBone([0, 3.5, -2.8], [0, 2.8, -3.2]);   // cola seg 2
                // === CADERAS (anchas) ===
                addBone([0, 4.0, -2.0], [-0.8, 4.0, -2.0]); // pelvis → L hip
                addBone([0, 4.0, -2.0], [0.8, 4.0, -2.0]);  // pelvis → R hip
                // === HOMBROS (sin clavícula, sling muscular) ===
                addBone([0, 4.3, 1.8], [-0.8, 4.3, 1.8]);   // chest → L shoulder
                addBone([0, 4.3, 1.8], [0.8, 4.3, 1.8]);    // chest → R shoulder
                // Patas traseras (COLUMNAS: casi perfectamente verticales)
                addBone([-0.8, 4.0, -2.0], [-0.8, 2.8, -2.0]); // RL fémur (vertical puro)
                addBone([-0.8, 2.8, -2.0], [-0.8, 1.5, -1.9]); // RL rodilla
                addBone([-0.8, 1.5, -1.9], [-0.8, 0, -1.8]);   // RL pie (semi-plantígrado)
                addBone([0.8, 4.0, -2.0], [0.8, 2.8, -2.0]);   // RR fémur
                addBone([0.8, 2.8, -2.0], [0.8, 1.5, -1.9]);   // RR rodilla
                addBone([0.8, 1.5, -1.9], [0.8, 0, -1.8]);     // RR pie
                // Patas delanteras (COLUMNAS)
                addBone([-0.8, 4.3, 1.8], [-0.8, 3.0, 1.8]);   // FL húmero
                addBone([-0.8, 3.0, 1.8], [-0.8, 1.5, 1.9]);   // FL codo
                addBone([-0.8, 1.5, 1.9], [-0.8, 0, 2.0]);     // FL pie
                addBone([0.8, 4.3, 1.8], [0.8, 3.0, 1.8]);     // FR húmero
                addBone([0.8, 3.0, 1.8], [0.8, 1.5, 1.9]);     // FR codo
                addBone([0.8, 1.5, 1.9], [0.8, 0, 2.0]);       // FR pie
            } else if (type === 'mustelid') {
                // === MUSTÉLIDO (Hurón / Nutria / Comadreja) ===
                // Cuerpo extremadamente elongado, patas muy cortas
                // Espina hipermóvil (galope ondulante tipo oruga)
                addBone([0, 1.2, -2.5], [0, 1.3, -1.5]);   // cola
                addBone([0, 1.3, -1.5], [0, 1.5, -0.5]);   // pelvis
                addBone([0, 1.5, -0.5], [0, 1.6, 0.5]);    // lumbar (flexión máxima)
                addBone([0, 1.6, 0.5], [0, 1.7, 1.5]);     // torso medio
                addBone([0, 1.7, 1.5], [0, 1.6, 2.5]);     // pecho/hombros
                addBone([0, 1.6, 2.5], [0, 1.8, 3.2]);     // cuello → cabeza
                // === CADERAS ===
                addBone([0, 1.5, -0.5], [-0.3, 1.5, -0.5]); // L hip
                addBone([0, 1.5, -0.5], [0.3, 1.5, -0.5]);  // R hip
                // === HOMBROS ===
                addBone([0, 1.6, 2.5], [-0.3, 1.6, 2.5]);   // L shoulder
                addBone([0, 1.6, 2.5], [0.3, 1.6, 2.5]);    // R shoulder
                // Patas traseras (MUY cortas)
                addBone([-0.3, 1.5, -0.5], [-0.4, 0.7, -0.3]); // L fémur
                addBone([-0.4, 0.7, -0.3], [-0.4, 0, -0.2]);   // L tibia
                addBone([0.3, 1.5, -0.5], [0.4, 0.7, -0.3]);   // R fémur
                addBone([0.4, 0.7, -0.3], [0.4, 0, -0.2]);     // R tibia
                // Patas delanteras (MUY cortas)
                addBone([-0.3, 1.6, 2.5], [-0.4, 0.8, 2.6]);   // L húmero
                addBone([-0.4, 0.8, 2.6], [-0.4, 0, 2.7]);     // L radio
                addBone([0.3, 1.6, 2.5], [0.4, 0.8, 2.6]);     // R húmero
                addBone([0.4, 0.8, 2.6], [0.4, 0, 2.7]);       // R radio
            } else if (type === 'crocodilian') {
                // === COCODRILO (Semi-Erguido / High Walk) ===
                // Cuerpo aplanado y ancho, cola muscular larga
                // Patas en posición intermedia (entre sprawling y erguido)
                addBone([0, 1.0, -4.0], [0, 1.0, -3.0]);   // cola distal
                addBone([0, 1.0, -3.0], [0, 1.0, -2.0]);   // cola media
                addBone([0, 1.0, -2.0], [0, 1.2, -1.0]);   // cola proximal
                addBone([0, 1.2, -1.0], [0, 1.5, 0]);      // pelvis
                addBone([0, 1.5, 0], [0, 1.6, 1.0]);       // torso
                addBone([0, 1.6, 1.0], [0, 1.5, 2.0]);     // pecho
                addBone([0, 1.5, 2.0], [0, 1.3, 3.0]);     // cuello (bajo)
                addBone([0, 1.3, 3.0], [0, 1.2, 3.8]);     // cabeza/hocico largo
                // === CADERAS (anchas) ===
                addBone([0, 1.5, 0], [-0.8, 1.5, 0]);      // L hip
                addBone([0, 1.5, 0], [0.8, 1.5, 0]);       // R hip
                // === HOMBROS ===
                addBone([0, 1.5, 2.0], [-0.7, 1.5, 2.0]);  // L shoulder
                addBone([0, 1.5, 2.0], [0.7, 1.5, 2.0]);   // R shoulder
                // Patas traseras (semi-sprawling, ligeramente laterales)
                addBone([-0.8, 1.5, 0], [-1.2, 0.8, -0.3]); // L fémur
                addBone([-1.2, 0.8, -0.3], [-1.0, 0, 0.2]); // L tibia
                addBone([0.8, 1.5, 0], [1.2, 0.8, -0.3]);   // R fémur
                addBone([1.2, 0.8, -0.3], [1.0, 0, 0.2]);   // R tibia
                // Patas delanteras
                addBone([-0.7, 1.5, 2.0], [-1.1, 0.8, 2.3]); // L húmero
                addBone([-1.1, 0.8, 2.3], [-0.9, 0, 2.5]);   // L radio
                addBone([0.7, 1.5, 2.0], [1.1, 0.8, 2.3]);   // R húmero
                addBone([1.1, 0.8, 2.3], [0.9, 0, 2.5]);     // R radio
            } else if (type === 'anuran') {
                // === RANA (Saltatorial) ===
                // Cuerpo compacto, sin cola (urostyle rígido)
                // Patas traseras enormes (~1.5x longitud corporal)
                // Patas delanteras cortas (amortiguación de aterrizaje)
                addBone([0, 1.5, 0], [0, 1.8, 0.8]);       // pelvis → sacro (urostyle rígido)
                addBone([0, 1.8, 0.8], [0, 2.0, 1.5]);     // torso compacto
                addBone([0, 2.0, 1.5], [0, 2.2, 2.0]);     // cabeza (ancha, aplanada)
                // === OJOS (grandes, dorsales) ===
                addBone([0, 2.2, 2.0], [-0.3, 2.5, 2.0]);  // ojo izquierdo (dorsal)
                addBone([0, 2.2, 2.0], [0.3, 2.5, 2.0]);   // ojo derecho
                // === CADERAS (anchas para salto) ===
                addBone([0, 1.5, 0], [-0.5, 1.5, 0]);      // L hip
                addBone([0, 1.5, 0], [0.5, 1.5, 0]);       // R hip
                // === HOMBROS ===
                addBone([0, 2.0, 1.5], [-0.4, 2.0, 1.5]);  // L shoulder
                addBone([0, 2.0, 1.5], [0.4, 2.0, 1.5]);   // R shoulder
                // Patas traseras (ENORMES: fémur + tibia + tarso elongado)
                addBone([-0.5, 1.5, 0], [-0.8, 1.0, -0.8]); // L fémur (largo, hacia atrás en crouch)
                addBone([-0.8, 1.0, -0.8], [-0.6, 0.4, 0.2]); // L tibia (zigzag Z)
                addBone([-0.6, 0.4, 0.2], [-0.5, 0, 0.8]);    // L tarso elongado + pie
                addBone([0.5, 1.5, 0], [0.8, 1.0, -0.8]);     // R fémur
                addBone([0.8, 1.0, -0.8], [0.6, 0.4, 0.2]);   // R tibia
                addBone([0.6, 0.4, 0.2], [0.5, 0, 0.8]);      // R tarso + pie
                // Patas delanteras (cortas, amortiguadoras)
                addBone([-0.4, 2.0, 1.5], [-0.6, 1.0, 1.8]);  // L brazo (radio-ulna fusionado)
                addBone([-0.6, 1.0, 1.8], [-0.5, 0, 2.0]);    // L mano
                addBone([0.4, 2.0, 1.5], [0.6, 1.0, 1.8]);    // R brazo
                addBone([0.6, 1.0, 1.8], [0.5, 0, 2.0]);      // R mano
            } else if (type === 'chelonian') {
                // === TORTUGA (Caparazón Integrado) ===
                // Caparazón = espina + costillas fusionadas
                // Cintura escapular y pélvica DENTRO del caparazón
                // Cuello muy flexible (8 vértebras cervicales)
                // Shell dome: represented as rigid central body
                addBone([0, 1.5, -1.0], [0, 1.5, 0]);      // caparazón posterior
                addBone([0, 1.5, 0], [0, 1.8, 0.8]);       // caparazón central (apex domo)
                addBone([0, 1.8, 0.8], [0, 1.5, 1.5]);     // caparazón anterior
                // === CUELLO (flexible, retráctil) ===
                addBone([0, 1.5, 1.5], [0, 1.6, 2.0]);     // cuello seg1
                addBone([0, 1.6, 2.0], [0, 1.8, 2.5]);     // cuello seg2
                addBone([0, 1.8, 2.5], [0, 1.7, 3.0]);     // cabeza
                // === COLA (corta) ===
                addBone([0, 1.5, -1.0], [0, 1.3, -1.6]);   // cola stub
                // === CADERAS (dentro del caparazón) ===
                addBone([0, 1.5, -1.0], [-0.5, 1.5, -1.0]); // L hip
                addBone([0, 1.5, -1.0], [0.5, 1.5, -1.0]);  // R hip
                // === HOMBROS (dentro del caparazón) ===
                addBone([0, 1.5, 1.5], [-0.5, 1.5, 1.5]);   // L shoulder
                addBone([0, 1.5, 1.5], [0.5, 1.5, 1.5]);    // R shoulder
                // Patas traseras (cortas, robustas)
                addBone([-0.5, 1.5, -1.0], [-0.8, 0.8, -1.2]); // L fémur
                addBone([-0.8, 0.8, -1.2], [-0.7, 0, -1.0]);   // L tibia
                addBone([0.5, 1.5, -1.0], [0.8, 0.8, -1.2]);   // R fémur
                addBone([0.8, 0.8, -1.2], [0.7, 0, -1.0]);     // R tibia
                // Patas delanteras (cortas, con garras)
                addBone([-0.5, 1.5, 1.5], [-0.8, 0.8, 1.8]);   // L húmero
                addBone([-0.8, 0.8, 1.8], [-0.7, 0, 2.0]);     // L radio
                addBone([0.5, 1.5, 1.5], [0.8, 0.8, 1.8]);     // R húmero
                addBone([0.8, 0.8, 1.8], [0.7, 0, 2.0]);       // R radio
            } else if (type === 'insecta') {
                // === INSECTO (Hexápodo) ===
                // 3 Tagmas: Cabeza, Tórax (pro, meso, meta), Abdomen
                addBone([0, 1.5, -1.0], [0, 1.6, 0.5]);    // Abdomen
                addBone([0, 1.6, 0.5], [0, 1.6, 1.2]);     // Metatórax (patas traseras)
                addBone([0, 1.6, 1.2], [0, 1.6, 1.8]);     // Mesotórax (patas medias)
                addBone([0, 1.6, 1.8], [0, 1.6, 2.2]);     // Protórax (patas delanteras)
                addBone([0, 1.6, 2.2], [0, 1.4, 2.6]);     // Cabeza
                // === PATAS DELANTERAS (Protórax) ===
                addBone([0, 1.6, 2.2], [-0.4, 1.6, 2.4]);  // L coxa frontal
                addBone([-0.4, 1.6, 2.4], [-0.8, 1.8, 2.6]); // L fémur frontal elevado
                addBone([-0.8, 1.8, 2.6], [-1.0, 0, 2.8]); // L tibia/tarso
                addBone([0, 1.6, 2.2], [0.4, 1.6, 2.4]);   // R coxa frontal
                addBone([0.4, 1.6, 2.4], [0.8, 1.8, 2.6]); // R fémur frontal elevado
                addBone([0.8, 1.8, 2.6], [1.0, 0, 2.8]);   // R tibia/tarso
                // === PATAS MEDIAS (Mesotórax) ===
                addBone([0, 1.6, 1.8], [-0.5, 1.6, 1.8]);  // L coxa media
                addBone([-0.5, 1.6, 1.8], [-1.0, 1.8, 1.8]); // L fémur medio
                addBone([-1.0, 1.8, 1.8], [-1.2, 0, 1.8]); // L tibia/tarso
                addBone([0, 1.6, 1.8], [0.5, 1.6, 1.8]);   // R coxa media
                addBone([0.5, 1.6, 1.8], [1.0, 1.8, 1.8]); // R fémur medio
                addBone([1.0, 1.8, 1.8], [1.2, 0, 1.8]);   // R tibia/tarso
                // === PATAS TRASERAS (Metatórax) ===
                addBone([0, 1.6, 1.2], [-0.4, 1.6, 1.0]);  // L coxa trasera
                addBone([-0.4, 1.6, 1.0], [-0.8, 1.8, 0.5]); // L fémur trasero
                addBone([-0.8, 1.8, 0.5], [-1.0, 0, -0.2]); // L tibia/tarso
                addBone([0, 1.6, 1.2], [0.4, 1.6, 1.0]);   // R coxa trasera
                addBone([0.4, 1.6, 1.0], [0.8, 1.8, 0.5]); // R fémur trasero
                addBone([0.8, 1.8, 0.5], [1.0, 0, -0.2]);  // R tibia/tarso
            } else if (type === 'lagomorph') {
                // === LAGOMORFO (Conejo / Liebre) ===
                addBone([0, 1.2, -0.5], [0, 1.5, 0.5]);    // Espina lumbar
                addBone([0, 1.5, 0.5], [0, 1.8, 1.5]);     // Espina torácica
                addBone([0, 1.8, 1.5], [0, 2.2, 2.0]);     // Cuello arriba
                addBone([0, 2.2, 2.0], [0, 2.0, 2.5]);     // Cabeza
                addBone([0, 2.2, 2.0], [0, 3.2, 1.8]);     // Orejas altas
                addBone([0, 1.2, -0.5], [0, 1.2, -0.8]);   // Cola stub
                // Caderas
                addBone([0, 1.2, -0.5], [-0.4, 1.2, -0.5]); // L hip
                addBone([0, 1.2, -0.5], [0.4, 1.2, -0.5]);  // R hip
                // Hombros
                addBone([0, 1.8, 1.5], [-0.3, 1.8, 1.5]);   // L shoulder
                addBone([0, 1.8, 1.5], [0.3, 1.8, 1.5]);    // R shoulder
                // Patas traseras (MUY largas, en zigzag de resorte)
                addBone([-0.4, 1.2, -0.5], [-0.5, 1.5, 0.2]);  // L fémur (adelante-arriba)
                addBone([-0.5, 1.5, 0.2], [-0.4, 0.4, -0.2]);  // L tibia (atrás-abajo)
                addBone([-0.4, 0.4, -0.2], [-0.4, 0, 0.8]);    // L pie largo plano
                addBone([0.4, 1.2, -0.5], [0.5, 1.5, 0.2]);    // R fémur
                addBone([0.5, 1.5, 0.2], [0.4, 0.4, -0.2]);    // R tibia
                addBone([0.4, 0.4, -0.2], [0.4, 0, 0.8]);      // R pie
                // Patas delanteras (cortas, de apoyo)
                addBone([-0.3, 1.8, 1.5], [-0.4, 0.8, 1.5]);   // L humero
                addBone([-0.4, 0.8, 1.5], [-0.4, 0, 1.8]);     // L radio
                addBone([0.3, 1.8, 1.5], [0.4, 0.8, 1.5]);     // R humero
                addBone([0.4, 0.8, 1.5], [0.4, 0, 1.8]);       // R radio
            } else if (type === 'crustacean') {
                // === CRUSTÁCEO DECÁPODO (Langosta / Cangrejo) ===
                addBone([0, 1.0, 1.0], [0, 1.2, -0.5]);    // Cefalotórax posterior
                addBone([0, 1.2, -0.5], [0, 1.0, -2.0]);   // Abdomen
                addBone([0, 1.0, -2.0], [0, 0.8, -2.5]);   // Telson (Cola pan)
                addBone([0, 1.0, 1.0], [0, 0.8, 1.8]);     // Rostrum / cabeza frontal
                // Chelipeds (Pinzas Grandes) - 1er par de patas
                addBone([0, 1.0, 1.0], [-0.6, 1.0, 1.2]);  // L coxa pinza
                addBone([-0.6, 1.0, 1.2], [-1.0, 1.2, 1.8]); // L brazo
                addBone([-1.0, 1.2, 1.8], [-0.8, 0.8, 2.5]); // L pinza
                addBone([0, 1.0, 1.0], [0.6, 1.0, 1.2]);   // R coxa pinza
                addBone([0.6, 1.0, 1.2], [1.0, 1.2, 1.8]); // R brazo
                addBone([1.0, 1.2, 1.8], [0.8, 0.8, 2.5]); // R pinza
                // Walking legs (4 pares = 8 patas). Modelaremos 3 pares principales para simplicar rig visual iterativo
                // Par frontal (L/R)
                addBone([0, 1.1, 0.5], [-0.5, 1.1, 0.6]); 
                addBone([-0.5, 1.1, 0.6], [-1.2, 1.5, 0.8]);
                addBone([-1.2, 1.5, 0.8], [-1.5, 0, 1.0]);
                addBone([0, 1.1, 0.5], [0.5, 1.1, 0.6]); 
                addBone([0.5, 1.1, 0.6], [1.2, 1.5, 0.8]);
                addBone([1.2, 1.5, 0.8], [1.5, 0, 1.0]);
                // Par medio (L/R)
                addBone([0, 1.15, 0.0], [-0.5, 1.15, 0.0]); 
                addBone([-0.5, 1.15, 0.0], [-1.3, 1.5, 0.0]);
                addBone([-1.3, 1.5, 0.0], [-1.6, 0, 0.0]);
                addBone([0, 1.15, 0.0], [0.5, 1.15, 0.0]); 
                addBone([0.5, 1.15, 0.0], [1.3, 1.5, 0.0]);
                addBone([1.3, 1.5, 0.0], [1.6, 0, 0.0]);
                // Par trasero (L/R)
                addBone([0, 1.2, -0.5], [-0.5, 1.2, -0.6]); 
                addBone([-0.5, 1.2, -0.6], [-1.2, 1.5, -0.8]);
                addBone([-1.2, 1.5, -0.8], [-1.5, 0, -1.0]);
                addBone([0, 1.2, -0.5], [0.5, 1.2, -0.6]); 
                addBone([0.5, 1.2, -0.6], [1.2, 1.5, -0.8]);
                addBone([1.2, 1.5, -0.8], [1.5, 0, -1.0]);
            } else if (type === 'wheeled') {
                // === VEHÍCULO RODANTE (Coche / Camión / Scooter) ===
                // Chasis principal
                addBone([0, 0.8, -1.5], [0, 0.8, 1.5]);    // Eje central chasis
                addBone([0, 0.8, 0], [0, 1.6, 0]);         // Cabina / Techo
                // Ejes y ruedas (representados como un solo hueso hacia abajo/afuera por rueda)
                // Frontales
                addBone([0, 0.8, 1.2], [-0.8, 0.8, 1.2]);  // L eje delantero
                addBone([-0.8, 0.8, 1.2], [-0.8, 0, 1.2]); // L rueda delantera
                addBone([0, 0.8, 1.2], [0.8, 0.8, 1.2]);   // R eje delantero
                addBone([0.8, 0.8, 1.2], [0.8, 0, 1.2]);   // R rueda delantera
                // Traseras
                addBone([0, 0.8, -1.2], [-0.8, 0.8, -1.2]); // L eje trasero
                addBone([-0.8, 0.8, -1.2], [-0.8, 0, -1.2]); // L rueda trasera
                addBone([0, 0.8, -1.2], [0.8, 0.8, -1.2]);  // R eje trasero
                addBone([0.8, 0.8, -1.2], [0.8, 0, -1.2]);  // R rueda trasera
            } else if (type === 'hovering') {
                // === AERONAVE FLOTANTE (Nave / Helicóptero / UFO) ===
                // Fuselaje principal
                addBone([0, 1.5, -2.0], [0, 1.5, 2.0]);    // Eje longitudinal
                addBone([0, 1.5, 0], [0, 2.5, 0]);         // Mástil rotor o cabina superior
                // Alas / Estabilizadores laterales / Rotores quad
                addBone([0, 1.5, 0], [-2.0, 1.5, 0]);      // L ala
                addBone([0, 1.5, 0], [2.0, 1.5, 0]);       // R ala
                addBone([0, 1.5, -1.8], [0, 2.5, -2.0]);   // Ala de cola (Deriva)
            }
            } // CIERRA EL INTENTO 2 (Fallback Rígido)


            // === KINEMATIC RETARGETING (SNAP TO SLICES) ===
            // === KINEMATIC PRE-WARP (PROCRUSTES ALIGNMENT) ===
            // Calculamos la caja teórica del esqueleto puro
            const skelBox = new THREE.Box3();
            bones.forEach(b => { skelBox.expandByPoint(b[0]); skelBox.expandByPoint(b[1]); });
            const skelSize = skelBox.getSize(new THREE.Vector3());
            const skelMin = skelBox.min;
            
            const preWarp = (p) => {
                const wp = p.clone();
                if (p.semanticName) wp.semanticName = p.semanticName;
                // Salvaguardamos las coordenadas Platónicas originales antes de distorsionar
                wp.archetypeY = p.y;
                wp.archetypeZ = p.z;

                if (topologicalBones && topologicalBones.length > 0) return wp;
                if (skelSize.y <= 0.001 || modelSize.y <= 0.001) return wp;
                
                const px = skelSize.x > 0 ? (wp.x - skelMin.x) / skelSize.x : 0.5;
                const pz = skelSize.z > 0 ? (wp.z - skelMin.z) / skelSize.z : 0.5;
                
                wp.x = modelMin.x + px * modelSize.x;
                wp.z = modelMin.z + pz * modelSize.z;

                // DUAL-ZONE Y SCALING (OBLIGATORIO PARA ANIMALES CON COLA/CUELLO VERTICAL)
                // El torso llega hasta Y=3.0 en el arquetipo, y debe mapearse estrictamente a modelBox.max.y
                // Todo lo que supere Y=3.0 (cabeza, cola alta) se mapeará en el espacio restante hasta la cima real (meshBox.max.y)
                if (wp.y <= 3.0 && skelSize.y > 0) {
                    // Mapeo normal dentro del torso
                    // Asumimos que la base del arquetipo es ~0 y el techo del torso es 3.0
                    const py = (wp.y - skelMin.y) / (3.0 - skelMin.y); 
                    wp.y = modelMin.y + py * (modelBox.max.y - modelMin.y);
                } else if (wp.y > 3.0) {
                    // Mapeo en el techo (cabeza/cola sobresaliendo del torso)
                    // skelBox.max.y es el punto más alto del arquetipo (ej: 6.0)
                    const extraArchetypeH = skelBox.max.y - 3.0;
                    const extraMeshH = meshBox.max.y - modelBox.max.y;
                    
                    if (extraArchetypeH > 0 && extraMeshH > 0) {
                        const pyOver = (wp.y - 3.0) / extraArchetypeH;
                        wp.y = modelBox.max.y + pyOver * extraMeshH;
                    } else {
                        wp.y = modelBox.max.y; // Fallback si no hay espacio real o platónico
                    }
                }
                
                return wp;
            };

            const snappedBones = [];
            const processedJoints = new Map(); // Cache snapped positions so shared joints stay connected
            const matchedArchetypeSlices = []; // Top-down logic: we fish exactly the slices we need
            
            const snapNode = (p) => {
                const key = `${p.x}_${p.y}_${p.z}`;
                if (processedJoints.has(key)) return processedJoints.get(key);
                
                const maxSnap = Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.50;
                let bestP = p.clone();
                let bestDist = Infinity; 
                
                let matchedSlice = null;
                // === GUARDIA LATERAL (X): Compartimento Izquierda/Derecha ===
                const centerX = modelMin.x + modelSize.x / 2;
                const isLegNode = Math.abs(p.x - centerX) > modelSize.x * 0.05;
                const sideDir = Math.sign(p.x - centerX);
                
                // === GUARDIA LONGITUDINAL (Z): Compartimento Delante/Detrás ===
                const centerZ = modelMin.z + modelSize.z / 2;
                const isForeLimb = (p.archetypeZ !== undefined && p.archetypeZ > 0.3);  // Nodos delanteros
                const isHindLimb = (p.archetypeZ !== undefined && p.archetypeZ < -0.3); // Nodos traseros
                const isTailNode = (p.archetypeZ !== undefined && p.archetypeZ <= -1.7 && p.archetypeY > 3.0);
                
                // === ALGORITMO SOBERANO DE COLAS (GEODÉSIA ABSOLUTA UB) ===
                if (isTailNode && detectedSlices && detectedSlices.length > 0) {
                    const tailSlices = detectedSlices.filter(cs => {
                        // Capturamos el cono posterior basándonos en la cadera (o su estimación si falló el mapeo secuencial)
                        const zLimit = mappedUB ? mappedUB.z : (centerZ - modelSize.z * 0.05);
                        const isBehind = cs.center.z <= zLimit; 
                        const isCentral = Math.abs(cs.center.x - centerX) <= modelSize.x * 0.35; // Muy amplio para no perder colas revueltas
                        return isBehind && isCentral;
                    });

                    if (tailSlices.length > 0) {
                        // 📍 EL ANCLA ABSOLUTA 
                        // Utilizamos la posición 3D real de la cadera (`UB`) que fue mapeada segundos previos.
                        const root = mappedUB ? mappedUB : new THREE.Vector3(
                            centerX,
                            modelMin.y + modelSize.y * 0.8,
                            modelMin.z + modelSize.z * 0.15 
                        );
                        
                        let furthestSlice = tailSlices[0];
                        let maxDistRaw = 0;

                        tailSlices.forEach(cs => {
                            // La cola es la extensión máxima hacia atrás (Z). 
                            // Desde el Punto Cero (Root), medimos la distancia de la rodaja.
                            const d = cs.center.distanceTo(root);
                            
                            // ☢️ CORTAFUEGOS ANTI-PIERNAS ☢️
                            // Si el nodo está muy por debajo de la cadera anatómica Y además está desplazado a un lado, ES UN PIE.
                            // Las colas (hasta las que arrastran en el suelo) retienen el eje X porque nacen del coxis central.
                            const driftX = Math.abs(cs.center.x - root.x);
                            const dropY = root.y - cs.center.y; // Cuánto ha caído desde la cadera
                            
                            let isLeg = false;
                            // Si  ha bajado el 50% de la altura total del cuerpo...
                            if (dropY > modelSize.y * 0.45) {
                                // Y se ha desviado lateralmente más del 5% del ancho total del cuerpo...
                                if (driftX > modelSize.x * 0.05) {
                                    isLeg = true; // Es indudablemente un talón
                                }
                            }
                            
                            if (!isLeg && d > maxDistRaw) {
                                maxDistRaw = d; 
                                furthestSlice = cs;
                            }
                        });
                        
                        const tailProgress = Math.min(1.0, Math.max(0.0, (p.archetypeY - 3.0) / 3.0));
                        
                        // Una vez sabemos exactamente cuál es el TIP (maxDistRaw), interpolamos geodésicamente la distancia:
                        if (tailProgress >= 0.95) { 
                            let result = furthestSlice.center.clone();
                            if (!matchedArchetypeSlices.includes(furthestSlice)) matchedArchetypeSlices.push(furthestSlice);
                            processedJoints.set(key, result);
                            return result;
                        } else {
                            // Encontrar el anillo de vóxeles que más se aproxime a la distancia intermedia solicitada
                            let targetDist = maxDistRaw * tailProgress;
                            let bestSlice = tailSlices[0];
                            let minError = Infinity;

                            tailSlices.forEach(cs => {
                                // Protegemos también los anillos intermedios de chocar contra las rodillas
                                const driftX = Math.abs(cs.center.x - root.x);
                                const dropY = root.y - cs.center.y;
                                if (dropY > modelSize.y * 0.45 && driftX > modelSize.x * 0.05) return; // Ignorar piernas
                                
                                const err = Math.abs(cs.center.distanceTo(root) - targetDist);
                                if (err < minError) {
                                    minError = err;
                                    bestSlice = cs;
                                }
                            });
                            
                            let result = bestSlice.center.clone();
                            if (!matchedArchetypeSlices.includes(bestSlice)) matchedArchetypeSlices.push(bestSlice);
                            processedJoints.set(key, result);
                            return result;
                        }
                    }
                }
                
                if (detectedSlices && detectedSlices.length > 0) {
                    detectedSlices.forEach(cs => {
                        // GUARDIA LATERAL
                        const sliceSide = Math.sign(cs.center.x - centerX);
                        const isSliceCentral = Math.abs(cs.center.x - centerX) <= modelSize.x * 0.1;

                        if (isLegNode) {
                            if (isSliceCentral || sliceSide !== sideDir) return;
                        } else {
                            if (!isSliceCentral) return;
                        }
                        
                        // GUARDIA LONGITUDINAL: Patas delanteras solo tocan rodajas de la mitad delantera
                        if (isForeLimb && cs.center.z < centerZ) return;
                        if (isHindLimb && cs.center.z > centerZ) return;

                        let d = p.distanceTo(cs.center);
                        if (d < bestDist) {
                            bestDist = d;
                            bestP = cs.center.clone();
                            matchedSlice = cs;
                        }
                    });
                }

                let result = p.clone();
                if (bestDist <= maxSnap) {
                    result = bestP;
                    if (matchedSlice && !matchedArchetypeSlices.includes(matchedSlice)) {
                        matchedArchetypeSlices.push(matchedSlice);
                    }
                }
                
                if (p.semanticName) {
                    result.semanticName = p.semanticName;
                    if (processedJoints.has(key)) {
                        processedJoints.get(key).semanticName = p.semanticName;
                    }
                }
                
                // === REGLAS MATEMÁTICAS SEMÁNTICAS ===
                if (p.archetypeY !== undefined) {
                    const isSpineTecho = Math.abs(p.archetypeY - 3.0) < 0.1;

                    const isSternumBarriga = Math.abs(p.archetypeY - 1.5) < 0.1;
                    const isPisoZarpa = Math.abs(p.archetypeY - 0.0) < 0.1;
                    
                    // Altura de la columna: 80% del recorrido suelo→techo (profundidad interna, no flotando)
                    const spineY = meshBox.min.y + (modelBox.max.y - meshBox.min.y) * 0.80;
                    const sternumY = meshBox.min.y + (modelBox.max.y - meshBox.min.y) * 0.40;

                    if (isSpineTecho) {
                        result.y = spineY;
                        // NO forzamos 'z' en el techo trasero. 
                        // El archetypeZ = -2.0 permite que el algoritmo topológico lo enganche
                        // directamente en el anillo naranja de la base de la cola de forma natural.
                        
                        // 📍 CAPTURA DEL PUNTO CERO GEODÉSICO (Espina Trasera / UB)
                        // Cuando archetypeZ < -1.7 sabemos que es el nodo UB (Upper Back)
                        if (p.archetypeZ <= -1.7 && p.archetypeZ > -2.5) {
                            mappedUB = result.clone();
                            console.log("📍 [ProceduralRigging] Punto Cero (UB) anclado en:", mappedUB);
                        }
                    }
                    else if (isSternumBarriga) {
                        result.y = sternumY;
                        // El borde trasero del suelo (LB) se clava en la base de la cola (formando pared vertical)
                        if (p.archetypeZ !== undefined && p.archetypeZ < -0.5) {
                            result.z = bodyTailZ;
                        }
                    }
                    else if (isPisoZarpa) {
                        result.y = meshBox.min.y;
                        if (p.archetypeZ !== undefined && p.archetypeZ > 0) {
                            result.z = Math.min(torsoMaxZ, result.z);
                        } else {
                            result.z = Math.max(torsoMinZ, result.z);
                        }
                    }
                }
                
                processedJoints.set(key, result);
                return result;
            };

            bones.forEach(b => {
                const w0 = preWarp(b[0]);
                const w1 = preWarp(b[1]);
                
                if (topologicalBones && topologicalBones.length > 0) {
                    // TopologyExtractor bones are ALREADY at exact slice centers.
                    // Snapping them to nearest ANY-axis slice would corrupt their positions (zigzag).
                    const k0 = `${w0.x}_${w0.y}_${w0.z}`;
                    const k1 = `${w1.x}_${w1.y}_${w1.z}`;
                    if (!processedJoints.has(k0)) processedJoints.set(k0, w0.clone());
                    if (!processedJoints.has(k1)) processedJoints.set(k1, w1.clone());
                } else {
                    snapNode(w0);
                    snapNode(w1);
                }
                snappedBones.push([w0, w1]);
            });

            // === PROCEDURAL BONE INJECTION & HIERARCHY ===
            const activeProceduralBones = [];
            const bonesMap = new Map();
            const rootBones = [];

            const jointMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false });
            const jointGeo = new THREE.SphereGeometry(0.1, 8, 8);

            // 1. Crear nodos espaciales SIEMPRE (incluso sin malla)
            Array.from(processedJoints.entries()).forEach(([key, pos]) => {
                const b = new THREE.Bone();
                if (pos.semanticName) b.name = pos.semanticName;
                b.userData.worldPos = pos.clone();
                b.position.copy(pos);
                bonesMap.set(key, b);
                activeProceduralBones.push(b);
                
                // Representación visual esférica atada al propio hueso
                const m = new THREE.Mesh(jointGeo, jointMat);
                b.add(m); 
            });

            // 2. Construir Jerarquía (Parenting)
            snappedBones.forEach(pair => {
                const k0 = `${pair[0].x}_${pair[0].y}_${pair[0].z}`;
                const k1 = `${pair[1].x}_${pair[1].y}_${pair[1].z}`;
                const b0 = bonesMap.get(k0);
                const b1 = bonesMap.get(k1);
                if (b0 && b1 && b0 !== b1 && b1.parent === null) {
                    b0.add(b1);
                }
            });

            // 3. Localizar coordenadas relativas (esencial para IK y rotations)
            const rawBones = Array.from(bonesMap.values());
            const skeletonGroup = new THREE.Group();
            
            rawBones.forEach(b => {
                if (b.parent && b.parent.isBone) {
                    b.position.copy(b.userData.worldPos).sub(b.parent.userData.worldPos);
                } else {
                    rootBones.push(b);
                    skeletonGroup.add(b);
                }
            });
            
            const skeleton = new THREE.Skeleton(rawBones);

            // Añadir representador visual dinámico (SkeletonHelper)
            // Usamos skeletonGroup (identity transform) como raíz para que las líneas
            // se dibujen en world-space ABSOLUTO, no relativo a un bone específico.
            const helper = new THREE.SkeletonHelper(skeletonGroup);
            
            // El esqueleto queda alineado al origen para encajar matemáticamente con la piel.

        return { skeleton, rawBones, activeProceduralBones, helper, skeletonGroup, rootBones, matchedArchetypeSlices };
    }

    /**
     * Envuelve malla plana en un SkinnedMesh usando Inverse Distance Weighting basado en vértices.
     * CANONICAL THREE.JS PATTERN: rootBones se añaden como hijos del SkinnedMesh ANTES de bind().
     */
    static bindMesh(skeleton, rawBones, rootBones, renderGroup, targetMesh = null) {
        if (!rawBones || rawBones.length === 0) {
            console.warn("ProceduralRigging.bindMesh: No rawBones available (archetype unsupported/empty). Skinning aborted.");
            return [];
        }
        const activeSkinnedMeshes = [];
        if (!renderGroup || renderGroup.children.length === 0) return activeSkinnedMeshes;
        
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const baseW = targetMesh || renderGroup.children[0];
        baseW.updateMatrixWorld(true);

        let bonesAttached = false; // Solo añadir rootBones al PRIMER SkinnedMesh

        baseW.traverse(c => {
            if (c.isMesh) {
                let geo = c.geometry.clone();
                
                if (c.isSkinnedMesh && c.skeleton) {
                    c.skeleton.pose();
                    const posAtt = geo.attributes.position;
                    const v = new THREE.Vector3();
                    for(let i=0; i<posAtt.count; i++) {
                        v.fromBufferAttribute(posAtt, i);
                        c.applyBoneTransform(i, v);
                        posAtt.setXYZ(i, v.x, v.y, v.z);
                    }
                }
                
                if (geo.index) geo = geo.toNonIndexed();
                geo.computeVertexNormals();
                
                // BAKE WORLD TRANSFORM AL GEOMETRY PARA DESTRUIR HERENCIAS ESPAGUETI
                const localToWorld = c.matrixWorld;
                geo.applyMatrix4(localToWorld);
                
                const posAtt = geo.attributes.position;
                const skinIndices = [];
                const skinWeights = [];

                for (let i = 0; i < posAtt.count; i++) {
                    const vertexWorld = new THREE.Vector3(posAtt.getX(i), posAtt.getY(i), posAtt.getZ(i));
                    
                    const distances = [];
                    rawBones.forEach((b, index) => {
                        const d = vertexWorld.distanceTo(b.userData.worldPos);
                        distances.push({ index, d });
                    });
                    distances.sort((a,b) => a.d - b.d);
                    const top4 = distances.slice(0, 4);
                    
                    let sumW = 0;
                    const weights = top4.map(w => {
                        const val = 1.0 / Math.pow(w.d + 0.001, 4);
                        sumW += val; return val;
                    });
                    
                    skinIndices.push(top4[0].index, top4[1] ? top4[1].index : 0, top4[2] ? top4[2].index : 0, top4[3] ? top4[3].index : 0);
                    skinWeights.push(weights[0]/sumW, top4[1] ? weights[1]/sumW : 0, top4[2] ? weights[2]/sumW : 0, top4[3] ? weights[3]/sumW : 0);
                }
                
                geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
                geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
                
                const skinnedMesh = new THREE.SkinnedMesh(geo, skinMat);
                skinnedMesh.position.set(0, 0, 0);
                skinnedMesh.rotation.set(0, 0, 0);
                skinnedMesh.scale.set(1, 1, 1);
                
                console.log(`[bindMesh] Creating SkinnedMesh for ${c.name}`);
                
                // === CANONICAL THREE.JS PATTERN ===
                if (!bonesAttached && rootBones && rootBones.length > 0) {
                    console.log(`[bindMesh] Attaching ${rootBones.length} root bones to SkinnedMesh...`);
                    rootBones.forEach(rb => skinnedMesh.add(rb));
                    bonesAttached = true;
                    console.log('[bindMesh] ✅ Attached root bones.');
                }
                
                console.log(`[bindMesh] Calling updateMatrixWorld on skinnedMesh...`);
                try {
                    skinnedMesh.updateMatrixWorld(true);
                } catch(e) {
                    console.error('[bindMesh] Error in updateMatrixWorld:', e);
                    throw e;
                }
                
                console.log(`[bindMesh] Calling bind(skeleton)...`);
                try {
                    skinnedMesh.bind(skeleton);
                } catch(e) {
                    console.error('[bindMesh] Error in bind:', e);
                    throw e;
                }
                
                console.log(`[bindMesh] Adding to renderGroup...`);
                try {
                    renderGroup.add(skinnedMesh);
                } catch(e) {
                    console.error('[bindMesh] Error in renderGroup.add:', e);
                    throw e;
                }
                activeSkinnedMeshes.push(skinnedMesh);
                
                // === DIAGNOSTIC: Coordinate Space Verification ===
                if (activeSkinnedMeshes.length === 1 && rawBones.length > 0) {
                    const geoBox = new THREE.Box3().setFromBufferAttribute(posAtt);
                    const geoSize = geoBox.getSize(new THREE.Vector3());
                    const boneBox = new THREE.Box3();
                    rawBones.forEach(b => boneBox.expandByPoint(b.userData.worldPos));
                    const boneSize = boneBox.getSize(new THREE.Vector3());
                    const f2 = v => v.toFixed(2);
                    console.log(`[bindMesh] 📐 Mesh AABB: min(${f2(geoBox.min.x)}, ${f2(geoBox.min.y)}, ${f2(geoBox.min.z)}) → max(${f2(geoBox.max.x)}, ${f2(geoBox.max.y)}, ${f2(geoBox.max.z)}) size(${f2(geoSize.x)}, ${f2(geoSize.y)}, ${f2(geoSize.z)})`);
                    console.log(`[bindMesh] 🦴 Bone AABB: min(${f2(boneBox.min.x)}, ${f2(boneBox.min.y)}, ${f2(boneBox.min.z)}) → max(${f2(boneBox.max.x)}, ${f2(boneBox.max.y)}, ${f2(boneBox.max.z)}) size(${f2(boneSize.x)}, ${f2(boneSize.y)}, ${f2(boneSize.z)})`);
                }
                
                if (c.material) {
                    c.material.opacity = 0.15;
                    c.material.transparent = true;
                }
            }
        });

        return activeSkinnedMeshes;
    }

    /**
     * Binds an array of bone pairs (start-end vectors) to a given Mesh,
     * generating a SkinnedMesh and procedural weights.
     */
    static bindSkin(sourceMesh, bonePairs) {
        if (!sourceMesh || !sourceMesh.isMesh) return null;

        // Construir jerarquía básica de huesos
        const threeBones = [];
        const rootBone = new THREE.Bone();
        rootBone.position.set(0, 0, 0);
        threeBones.push(rootBone);

        bonePairs.forEach((bPair) => {
            const b = new THREE.Bone();
            const center = bPair[0].clone().lerp(bPair[1], 0.5);
            b.position.copy(center);
            
            const dir = bPair[1].clone().sub(bPair[0]).normalize();
            const defaultDir = new THREE.Vector3(0, 1, 0);
            const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, dir);
            b.quaternion.copy(quat);

            b.userData = { originalPos: b.position.clone(), originalQuat: b.quaternion.clone(), isLeg: center.y < sourceMesh.geometry.boundingBox?.max.y * 0.4 };
            
            rootBone.add(b);
            threeBones.push(b);
        });

        const geom = sourceMesh.geometry.clone();
        const posAttr = geom.attributes.position;
        const skinIndices = [];
        const skinWeights = [];

        for (let i = 0; i < posAttr.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(posAttr, i);
            vertex.applyMatrix4(sourceMesh.matrixWorld);

            const boneDistances = [];
            for (let b = 1; b < threeBones.length; b++) {
                const bone = threeBones[b];
                const dist = vertex.distanceTo(bone.userData.originalPos);
                boneDistances.push({ index: b, dist: dist });
            }
            boneDistances.sort((a, b) => a.dist - b.dist);
            
            const top2 = boneDistances.slice(0, 2);
            let wSum = 0;
            top2.forEach(bd => {
                bd.weight = 1.0 / Math.pow(bd.dist + 0.001, 2);
                wSum += bd.weight;
            });

            skinIndices.push(top2[0] ? top2[0].index : 0, top2[1] ? top2[1].index : 0, 0, 0);
            skinWeights.push(
                top2[0] ? top2[0].weight / wSum : 1,
                top2[1] ? top2[1].weight / wSum : 0,
                0, 0
            );
        }

        geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        const skinnedMesh = new THREE.SkinnedMesh(geom, sourceMesh.material);
        skinnedMesh.add(rootBone);
        
        const skeleton = new THREE.Skeleton(threeBones);
        skinnedMesh.bind(skeleton);

        // Inherit transforms
        skinnedMesh.position.copy(sourceMesh.position);
        skinnedMesh.quaternion.copy(sourceMesh.quaternion);
        skinnedMesh.scale.copy(sourceMesh.scale);

        return { skinnedMesh, skeleton, rootBone, threeBones };
    }
}
