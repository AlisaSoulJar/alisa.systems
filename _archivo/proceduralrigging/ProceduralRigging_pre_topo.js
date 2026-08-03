import * as THREE from 'three';

/**
 * ProceduralRigging
 * Code-driven procedural rigging and inverse kinematics 
 * for ALISA's 22 phylogenetic archetypes.
 */
export class ProceduralRigging {

    static buildArchetypeSkeleton(type, renderGroup, detectedSlices = []) {
            const bones = [];
            function addBone(p1, p2) {
                bones.push([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
            }

            // === PHYLOGENETIC ARCHETYPES (Normalized to ~4.5 units height) ===
            if (type === 'humanoid') {
                addBone([0, 2.2, 0], [0, 3.5, 0]); // spine
                addBone([0, 3.5, 0], [0, 4.2, 0.2]); // neck/head
                addBone([-0.8, 3.5, 0], [0.8, 3.5, 0]); // shoulders
                addBone([-0.8, 3.5, 0], [-1.0, 2.0, 0.2]); // L arm upper
                addBone([-1.0, 2.0, 0.2], [-1.0, 0.5, 0.4]); // L arm lower
                addBone([0.8, 3.5, 0], [1.0, 2.0, 0.2]); // R arm upper
                addBone([1.0, 2.0, 0.2], [1.0, 0.5, 0.4]); // R arm lower
                addBone([-0.4, 2.2, 0], [0.4, 2.2, 0]); // hips
                addBone([-0.4, 2.2, 0], [-0.4, 1.2, 0.3]); // L femur
                addBone([-0.4, 1.2, 0.3], [-0.4, 0, 0]); // L tibia
                addBone([0.4, 2.2, 0], [0.4, 1.2, 0.3]); // R femur
                addBone([0.4, 1.2, 0.3], [0.4, 0, 0]); // R tibia
            } else if (type === 'canine' || type === 'feline') {
                addBone([0, 2.8, -2.5], [0, 3.0, -1.8]); // tail -> pelvis
                addBone([0, 3.0, -1.8], [0, 3.2, 1.5]);  // pelvis -> chest
                addBone([0, 3.2, 1.5], [0, 4.0, 2.0]);   // neck/head
                // Caderas traseras: desde la ESPINA hacia cada lado
                addBone([0, 3.0, -1.8], [-0.4, 3.0, -1.8]); // pelvis -> L hip
                addBone([0, 3.0, -1.8], [0.4, 3.0, -1.8]);  // pelvis -> R hip
                // Hombros delanteros: desde la ESPINA hacia cada lado
                addBone([0, 3.2, 1.5], [-0.4, 3.2, 1.5]);   // chest -> L shoulder
                addBone([0, 3.2, 1.5], [0.4, 3.2, 1.5]);    // chest -> R shoulder
                // Patas traseras
                addBone([-0.4, 3.0, -1.8], [-0.5, 2.0, -1.4]); // RL femur -> true knee
                addBone([-0.5, 2.0, -1.4], [-0.4, 1.0, -2.0]); // RL knee -> hock
                addBone([-0.4, 1.0, -2.0], [-0.4, 0, -1.8]);   // RL hock -> paws
                addBone([0.4, 3.0, -1.8], [0.5, 2.0, -1.4]); // RR femur -> true knee
                addBone([0.5, 2.0, -1.4], [0.4, 1.0, -2.0]); // RR knee -> hock
                addBone([0.4, 1.0, -2.0], [0.4, 0, -1.8]);   // RR hock -> paws
                // Patas delanteras
                addBone([-0.4, 3.2, 1.5], [-0.5, 1.8, 1.2]);   // FL humerus -> elbow
                addBone([-0.5, 1.8, 1.2], [-0.4, 0.5, 1.5]);   // FL elbow -> wrist
                addBone([-0.4, 0.5, 1.5], [-0.4, 0, 1.6]);     // FL wrist -> paws
                addBone([0.4, 3.2, 1.5], [0.5, 1.8, 1.2]);     // FR humerus -> elbow
                addBone([0.5, 1.8, 1.2], [0.4, 0.5, 1.5]);     // FR elbow -> wrist
                addBone([0.4, 0.5, 1.5], [0.4, 0, 1.6]);       // FR wrist -> paws
            } else if (type === 'equine') {
                // === COLUMNA VERTEBRAL (con Cruz/Withers) ===
                addBone([0, 3.5, -2.0], [0, 3.6, -0.5]);  // pelvis → lomo (ligero arco)
                addBone([0, 3.6, -0.5], [0, 3.9, 1.0]);   // lomo → cruz (WITHERS - punto más alto)
                addBone([0, 3.9, 1.0], [0, 3.5, 1.5]);    // cruz → base cuello (cae un poco)
                // === CUELLO Y CABEZA ===
                addBone([0, 3.5, 1.5], [0, 4.5, 2.2]);    // base cuello → cuello alto
                addBone([0, 4.5, 2.2], [0, 4.4, 3.0]);    // cuello alto → hocico
                // === OREJAS (bifurcan desde la cima del cráneo) ===
                addBone([0, 4.5, 2.2], [-0.15, 4.9, 2.3]); // oreja izquierda
                addBone([0, 4.5, 2.2], [0.15, 4.9, 2.3]);  // oreja derecha
                // === MANDÍBULA (colgando del hocico) ===
                addBone([0, 4.4, 3.0], [0, 4.0, 2.8]);     // mandíbula inferior
                // === ESTERNÓN (define caja torácica) ===
                addBone([0, 3.9, 1.0], [0, 2.8, 0.5]);     // esternón colgando de la cruz
                // === COLA (3 segmentos cascada desde la pelvis) ===
                addBone([0, 3.5, -2.0], [0, 3.3, -2.8]);   // cola segmento 1
                addBone([0, 3.3, -2.8], [0, 2.8, -3.4]);   // cola segmento 2
                addBone([0, 2.8, -3.4], [0, 2.2, -3.8]);   // cola segmento 3 (punta)
                // === CADERAS: desde la ESPINA hacia cada lado ===
                addBone([0, 3.5, -2.0], [-0.6, 3.5, -2.0]); // spine → L hip
                addBone([0, 3.5, -2.0], [0.6, 3.5, -2.0]);  // spine → R hip
                // === HOMBROS: desde la base del cuello hacia cada lado ===
                addBone([0, 3.5, 1.5], [-0.6, 3.5, 1.5]);   // spine → L shoulder
                addBone([0, 3.5, 1.5], [0.6, 3.5, 1.5]);    // spine → R shoulder
                // Patas traseras (4 segmentos: femur → stifle → cannon → fetlock/hoof)
                addBone([-0.6, 3.5, -2.0], [-0.6, 2.5, -1.2]); // RL femur → stifle
                addBone([-0.6, 2.5, -1.2], [-0.5, 1.8, -2.2]); // RL stifle → hock
                addBone([-0.5, 1.8, -2.2], [-0.5, 0.5, -2.0]); // RL cannon
                addBone([-0.5, 0.5, -2.0], [-0.5, 0, -1.8]);   // RL fetlock → hoof (ÚNGULA)
                addBone([0.6, 3.5, -2.0], [0.6, 2.5, -1.2]); // RR femur → stifle
                addBone([0.6, 2.5, -1.2], [0.5, 1.8, -2.2]); // RR stifle → hock
                addBone([0.5, 1.8, -2.2], [0.5, 0.5, -2.0]); // RR cannon
                addBone([0.5, 0.5, -2.0], [0.5, 0, -1.8]);   // RR fetlock → hoof (ÚNGULA)
                // Patas delanteras (4 seg - ESPEJO de traseras: húmero vertical largo)
                addBone([-0.6, 3.5, 1.5], [-0.6, 2.0, 1.5]);   // FL húmero → codo (VERTICAL, largo)
                addBone([-0.6, 2.0, 1.5], [-0.5, 1.2, 1.8]);   // FL codo → carpus (abajo y ligeramente adelante)
                addBone([-0.5, 1.2, 1.8], [-0.5, 0.5, 1.6]);   // FL cannon
                addBone([-0.5, 0.5, 1.6], [-0.5, 0, 1.5]);     // FL fetlock → hoof (ÚNGULA)
                addBone([0.6, 3.5, 1.5], [0.6, 2.0, 1.5]);     // FR húmero → codo (VERTICAL, largo)
                addBone([0.6, 2.0, 1.5], [0.5, 1.2, 1.8]);     // FR codo → carpus
                addBone([0.5, 1.2, 1.8], [0.5, 0.5, 1.6]);     // FR cannon
                addBone([0.5, 0.5, 1.6], [0.5, 0, 1.5]);       // FR fetlock → hoof (ÚNGULA)
            } else if (type === 'theropod') {
                addBone([0, 1.5, -4.0], [0, 2.8, -2.0]); // tail tip -> base
                addBone([0, 2.8, -2.0], [0, 3.0, 0]);    // tail base -> pelvis
                addBone([0, 3.0, 0], [0, 3.2, 2.0]);     // pelvis -> chest (forward lean)
                addBone([0, 3.2, 2.0], [0, 3.8, 3.0]);   // neck/head
                addBone([-0.8, 3.0, 0], [0.8, 3.0, 0]);  // heavy hips
                addBone([-0.8, 3.0, 0], [-1.0, 1.8, 0.8]); // L thigh
                addBone([-1.0, 1.8, 0.8], [-0.8, 1.0, -0.5]); // L hock
                addBone([-0.8, 1.0, -0.5], [-0.8, 0, 0.5]); // L foot
                addBone([0.8, 3.0, 0], [1.0, 1.8, 0.8]); // R thigh
                addBone([1.0, 1.8, 0.8], [0.8, 1.0, -0.5]); // R hock
                addBone([0.8, 1.0, -0.5], [0.8, 0, 0.5]); // R foot
                addBone([-0.6, 3.0, 1.8], [-0.8, 2.2, 2.0]); // L arm (tiny)
                addBone([-0.8, 2.2, 2.0], [-0.6, 1.8, 2.2]); // L claw
                addBone([0.6, 3.0, 1.8], [0.8, 2.2, 2.0]); // R arm (tiny)
                addBone([0.8, 2.2, 2.0], [0.6, 1.8, 2.2]); // R claw
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


            // === KINEMATIC RETARGETING (SNAP TO SLICES) ===
            // === KINEMATIC PRE-WARP (PROCRUSTES ALIGNMENT) ===
            // Calculamos la caja teórica del esqueleto puro
            const skelBox = new THREE.Box3();
            bones.forEach(b => { skelBox.expandByPoint(b[0]); skelBox.expandByPoint(b[1]); });
            const skelSize = skelBox.getSize(new THREE.Vector3());
            const skelMin = skelBox.min;
            
            // Usamos la caja real densa (detectada por el Bisturí) + UNIÓN con AABB real del mesh
            const modelBox = new THREE.Box3();
            if (detectedSlices && detectedSlices.length > 0) {
                detectedSlices.forEach(cs => modelBox.expandByPoint(cs.center));
            }
            // Eliminado el fallback traicionero de union(meshAABB) que inflaba las proporciones con bigotes/mallas invisibles
            const modelSize = modelBox.getSize(new THREE.Vector3());
            const modelMin = modelBox.min;

            const preWarp = (p) => {
                const wp = p.clone();
                if (skelSize.y <= 0.001 || modelSize.y <= 0.001) return wp;
                
                // Porcentaje local en la caja teórica
                const px = skelSize.x > 0 ? (wp.x - skelMin.x) / skelSize.x : 0.5;
                const py = skelSize.y > 0 ? (wp.y - skelMin.y) / skelSize.y : 0.5;
                const pz = skelSize.z > 0 ? (wp.z - skelMin.z) / skelSize.z : 0.5;
                
                // Mapeo topológico exacto a la caja real
                wp.x = modelMin.x + px * modelSize.x;
                wp.y = modelMin.y + py * modelSize.y;
                wp.z = modelMin.z + pz * modelSize.z;
                
                return wp;
            };

            const snappedBones = [];
            const processedJoints = new Map(); // Cache snapped positions so shared joints stay connected
            const matchedArchetypeSlices = []; // Top-down logic: we fish exactly the slices we need
            
            const snapNode = (p) => {
                const key = `${p.x}_${p.y}_${p.z}`;
                if (processedJoints.has(key)) return processedJoints.get(key);
                
                // Imantación LIMITADA: solo colapsar al centroide si está razonablemente cerca.
                // Aumentado al 50% de la caja real para dominar artefactos de preWarp inflados (bigotes).
                const maxSnap = Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.50;
                let bestP = p.clone();
                let bestDist = Infinity; 
                
                let matchedSlice = null;
                
                if (detectedSlices && detectedSlices.length > 0) {
                    detectedSlices.forEach(cs => {
                        const d = p.distanceTo(cs.center);
                        if (d < bestDist) {
                            bestDist = d;
                            bestP = cs.center.clone();
                            matchedSlice = cs;
                        }
                    });
                }
                // Solo usar el centroide si está CERCA. Si no, preWarp ya es bueno.
                let result = p.clone();
                if (bestDist <= maxSnap) {
                    result = bestP;
                    if (matchedSlice && !matchedArchetypeSlices.includes(matchedSlice)) {
                        matchedArchetypeSlices.push(matchedSlice);
                    }
                }
                processedJoints.set(key, result);
                return result;
            };

            bones.forEach(b => {
                // Primero deformamos la geometría al AABB real, luego aplicamos el magnetismo de la rodaja
                const w0 = preWarp(b[0]);
                const w1 = preWarp(b[1]);
                snapNode(w0); // Cache the snapped position
                snapNode(w1);
                snappedBones.push([w0, w1]); // Guardamos las claves crudas para la jerarquía
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
            const helper = new THREE.SkeletonHelper(rootBones[0] || skeletonGroup);

        return { skeleton, rawBones, activeProceduralBones, helper, skeletonGroup, matchedArchetypeSlices };
    }

    /**
     * Envuelve malla plana en un SkinnedMesh usando Inverse Distance Weighting basado en vértices
     */
    static bindMesh(skeleton, rawBones, renderGroup) {
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

        const baseW = renderGroup.children[0];
        baseW.updateMatrixWorld(true);

        baseW.traverse(c => {
            if (c.isMesh && !c.isSkinnedMesh) {
                let geo = c.geometry.clone();
                if (geo.index) geo = geo.toNonIndexed(); // Para poder mapear vértice a vértice secuencial
                geo.computeVertexNormals(); // FIX: Prevenir que la malla se vea negra por normales corruptas
                
                // BAKE WORLD TRANSFORM AL GEOMETRY PARA DESTRUIR HERENCIAS ESPAGUETI
                const localToWorld = c.matrixWorld;
                geo.applyMatrix4(localToWorld);
                
                const posAtt = geo.attributes.position;
                const skinIndices = [];
                const skinWeights = [];

                for (let i = 0; i < posAtt.count; i++) {
                    const vertexWorld = new THREE.Vector3(posAtt.getX(i), posAtt.getY(i), posAtt.getZ(i));
                    
                    // Buscar los huesos más cercanos
                    const distances = [];
                    rawBones.forEach((b, index) => {
                        const d = vertexWorld.distanceTo(b.userData.worldPos);
                        distances.push({ index, d });
                    });
                    distances.sort((a,b) => a.d - b.d);
                    const top4 = distances.slice(0, 4);
                    
                    // Matemática de Ponderación p=4
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
                
                // AL ESTAR BAKEADO, NO HEREDAMOS DE LA JERARQUIA ORIGINAL (Identity Scale 1x1x1)
                skinnedMesh.position.set(0, 0, 0);
                skinnedMesh.rotation.set(0, 0, 0);
                skinnedMesh.scale.set(1, 1, 1);
                
                skinnedMesh.updateMatrixWorld(true);
                skinnedMesh.bind(skeleton);
                skinnedMesh.matrixAutoUpdate = false;
                
                // Añadimos a la RAIZ, evitando la jerarquía GLB y su baseWireframe
                renderGroup.add(skinnedMesh);
                activeSkinnedMeshes.push(skinnedMesh);
                c.visible = false; // Escondemos el Wireframe fantasma original
            }
        });

        return activeSkinnedMeshes;
    }
}
