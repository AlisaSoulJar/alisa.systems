import * as THREE from 'three';
import { VolumetricsPlugin } from '../../soma/plugins/VolumetricsPlugin.js';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class ProceduralBuildingFactory extends BaseEnvironmentFactory {
    constructor(scene, AssetManager) {
        super(scene);
        this.AssetManager = AssetManager;
        this.FL_H = 5.0;
        this.CORRIDOR_W = 28;
        this.CORRIDOR_DEPTH = 5.0;
        this.BUILDING_DEPTH = 30.0;
        this.WALL_D = 0.5;
        this.DOOR_COLORS = [0x885522, 0x664411, 0x553311, 0x774422, 0x886633, 0x665533];
        this.buildingGroup = null;
        this.floors = [];
        this.floorLights = [];
        this.floorLightTimers = [];
        this.batteryPickups = [];
        this.DOOR_ZONE_START = 0;
        this.DOOR_ZONE_W = 0;
        this.flashDust = null;
        this.texFactory = new ProceduralTextureFactory();
        // `elevator` era una GLOBAL del monolito; al extraer a módulo ES quedó huérfana
        // y build() reventaba con "elevator is not defined". Ahora es estado de la fábrica.
        this.elevator = { cabin: null, fridgeLight: null, y: 0, currentFloor: 1, doorTimer: 0 };
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Adaptador sobre `build()`, que tiene 10 argumentos posicionales heredados
     * del monolito. Permite arrancar esta factory igual que cualquier otra:
     *     const fab = new ProceduralBuildingFactory(scene, assets);
     *     fab.buildAll({ floors: 8, doorsPerFloor: 3 });
     * @param {Object} [c]
     * @param {number} [c.floors=6]          plantas habitables (se añade azotea)
     * @param {number} [c.doorsPerFloor=3]
     * @param {boolean}[c.lightsOut=false]
     * @param {boolean}[c.characters=false]  construir acosador + mapache
     * @param {number} [c.lightScale=1]      ×intensidad (las luces vienen en unidades legacy)
     */
    buildAll(c = {}) {
        const r = this.build(
            c.floors ?? 6, c.doorsPerFloor ?? 3, c.lightsOut ?? false, c.stage ?? 1,
            c.rabbitModel ?? null, c.seeker ?? { mesh: null }, c.rabbit ?? { mesh: null },
            c.camera ?? null, c.controls ?? null,
            { buildCharacters: c.characters ?? false, ...c }
        );
        // Las intensidades de esta factory están calibradas para el modelo de luz
        // ANTIGUO de three (pre-r155). En r155+ (físicamente correcto) hay que escalarlas
        // o la escena sale negra. Ver ESTUDIO_ProceduralBuildingFactory.md §4.
        const k = c.lightScale ?? 1;
        if (k !== 1) {
            this.floorLights.forEach(l => { if (l) l.intensity *= k; });
            this.buildingGroup?.traverse(n => { if (n.isLight) n.intensity *= k; });
        }
        return r;
    }

    /** Tick estándar (el FlickerSystem de la clase base + parpadeo de plantas). */
    update(dt) { super.update?.(dt); }

build(totalFloors, doorsPerFloor, isLightsOut, currentStage, rabbitModel, seeker, rabbit, cam, controls, opts = {}) {
    // ── HUÉRFANAS DEL MONOLITO ──────────────────────────────────────────────
    // Estas eran globales del HTML original. Al extraer la fábrica a módulo ES
    // (strict mode) quedaron sin declarar y build() reventaba en la 1ª ejecución
    // ("seekerModel is not defined", etc.). Se declaran aquí como locales: si el
    // llamante no las aporta, esas partes quedan INERTES, no rotas.
    let seekerModel   = opts.seekerModel   ?? null;   // GLB del acosador (opcional)
    let flashLight    = opts.flashLight    ?? null;   // linterna del jugador
    let volumetricBeam = opts.volumetricBeam ?? null; // haz volumétrico de la linterna
    let flashDust     = this.flashDust;               // partículas del haz
    let gamePhase     = opts.gamePhase     ?? 'idle'; // fase del juego (la lleva el System)
    let cinematicPhase = opts.cinematicPhase ?? null;
    let cinematicTimer = opts.cinematicTimer ?? 0;
    /**
     * ⚠️ TRES QUE SE QUEDARON FUERA DE ESA MISMA LISTA, Y NO ERAN INOFENSIVAS.
     *
     * `targetFloor`, `targetDoor` y `seekerAI` son huérfanas del monolito igual
     * que las de arriba, pero a éstas no se las declaró — y estaban al FINAL de
     * `build()`, en el bloque de la cinemática. Resultado medido en el navegador:
     *
     *     ReferenceError: targetFloor is not defined   (ProceduralBuildingFactory:867)
     *
     * en CADA partida de ¡Busca! 3, porque `build()` es el camino normal, no un
     * caso raro. Todo lo que va después de esa línea —el reparto de escondites
     * del bucle de la 905— no llegaba a ejecutarse nunca. Y no se veía: la
     * excepción salía por `onError` del `GLTFLoader`, que la envuelve, así que
     * parecía «un modelo que no carga» cuando los tres cargan bien.
     *
     * Es exactamente la avería que la nota de arriba describe, con una víctima
     * más. Van declaradas, y el destino elegido se publica en `this` para que
     * quien llame pueda leerlo en vez de tener que adivinarlo.
     */
    let targetFloor   = opts.targetFloor   ?? 0;
    let targetDoor    = opts.targetDoor    ?? 0;
    const seekerAI    = opts.seekerAI      ?? {
        exploredFloors: new Set(),   // el bloque de abajo llama a .clear()
    };

    if (this.buildingGroup) this.scene.remove(this.buildingGroup);
    this.buildingGroup = new THREE.Group();
    this.floors = [];

    const totalH = totalFloors * this.FL_H;
    // Center building vertically
    this.buildingGroup.position.y = -totalH / 2 + this.FL_H / 2;

    const halfW = this.CORRIDOR_W / 2;
    const STAIR_DOOR_W = 2.2; // width of each stair door
    const STAIR_GAP = 0.6;    // gap between the two stair doors
    const STAIR_TOTAL = STAIR_DOOR_W * 2 + STAIR_GAP + 1.5; // total stair zone
    const ELEV_ZONE = 3.0;  // width of elevator zone on right
    this.DOOR_ZONE_START = -halfW + STAIR_TOTAL + 0.5;
    const DOOR_ZONE_END = halfW - ELEV_ZONE - 1.5;
    this.DOOR_ZONE_W = DOOR_ZONE_END - this.DOOR_ZONE_START;

    // ─── Exterior shell (back wall + sides) ───
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9, transparent: true, opacity: 0.85 });

    // Total building volume center Z
    const bCenterZ = -this.BUILDING_DEPTH/2 + this.CORRIDOR_DEPTH/2; // for BUILDING=30, CORRIDOR=5: CenterZ is -12.5

    // Left exterior wall (side of the aquarium)
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(this.WALL_D, totalH + this.FL_H, this.BUILDING_DEPTH + this.WALL_D),
        shellMat
    );
    leftWall.position.set(-halfW - this.WALL_D/2, totalH/2, bCenterZ);
    this.buildingGroup.add(leftWall);

    // Right exterior wall
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(this.WALL_D, totalH + this.FL_H, this.BUILDING_DEPTH + this.WALL_D),
        shellMat
    );
    rightWall.position.set(halfW + this.WALL_D/2, totalH/2, bCenterZ);
    this.buildingGroup.add(rightWall);

    // Back wall (behind everything, the far end of the rooms)
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(this.CORRIDOR_W + this.WALL_D * 2, totalH + this.FL_H, this.WALL_D),
        shellMat
    );
    backWall.position.set(0, totalH/2, -this.BUILDING_DEPTH + this.CORRIDOR_DEPTH/2 - this.WALL_D/2);
    this.buildingGroup.add(backWall);

    // Roof (Azotea Walkable Surface)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(this.CORRIDOR_W + this.WALL_D * 4, 0.4, this.BUILDING_DEPTH + this.WALL_D*2),
        roofMat
    );
    // Align top surface exactly at totalH so seeker glides on it
    roof.position.set(0, totalH - 0.2, bCenterZ);
    this.buildingGroup.add(roof);

    // ─── ELEVATOR SHAFT (GLOBAL BOX) ───
    const ELEV_X = halfW - ELEV_ZONE / 2;
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.7 });
    
    // Front shaft wall (starts at Planta Baja)
    const shaftFront = new THREE.Mesh(new THREE.BoxGeometry(ELEV_ZONE, totalH - this.FL_H, 0.4), shaftMat);
    shaftFront.position.set(ELEV_X, (totalH + this.FL_H)/2, this.CORRIDOR_DEPTH/2 - 0.2); 
    this.buildingGroup.add(shaftFront);

    // Back shaft wall (starts at Planta Baja)
    const shaftBack = new THREE.Mesh(new THREE.BoxGeometry(ELEV_ZONE, totalH - this.FL_H, 0.4), shaftMat);
    shaftBack.position.set(ELEV_X, (totalH + this.FL_H)/2, -this.CORRIDOR_DEPTH/2 - 0.05);
    this.buildingGroup.add(shaftBack);

    // ─── Per-floor construction ───
    for (let f = 0; f <= totalFloors; f++) {
        const baseY = f * this.FL_H;
        
        if (f === totalFloors) {
            const roofGroup = new THREE.Group();
            
            // Solid cube Caseta on the left side (opposite to elevator)
            const shackW = ELEV_ZONE; // 4.0
            const shackD = 3.5;
            const shackH = this.FL_H;
            const sMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.7 }); // Industrial shaft like elevator
            
            // Build the solid block flush with the back wall
            const sCube = new THREE.Mesh(new THREE.BoxGeometry(shackW, shackH, shackD), sMat);
            // Center of block is X = -halfW + 2.0 = -8.0
            sCube.position.set(-halfW + shackW/2, baseY + shackH/2, -this.CORRIDOR_DEPTH/2 + shackD/2 - 0.2);
            roofGroup.add(sCube);

            // Place the door on the RIGHT face of the Caseta (facing towards the center of the roof)
            // The Caseta spans X: -10 to -6. The right face is exactly at X = -6.0.
            // We set stairX slightly to the right of the face so the AI/Player can stand in front of it.
            let stairX = -halfW + shackW + 0.5; // X = -5.5
            let doorVisX = -halfW + shackW + 0.05; // X = -5.95 (on the side wall)
            
            // Door Arrow Down
            const arrowCanvas = ProceduralTextureFactory.labelPlate('▼', {
                width: 64, height: 64,
                bgColor: 'transparent', textColor: '#cc7722',
                font: 'bold 40px monospace'
            });
            const arrowTex = new THREE.CanvasTexture(arrowCanvas);
            const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({map: arrowTex, transparent:true}));
            
            // Posing it on the right side-wall, facing outwards (+X).
            arrowMesh.position.set(doorVisX, baseY + 1.5, -0.8); 
            arrowMesh.rotation.y = Math.PI / 2;
            roofGroup.add(arrowMesh);
            
            // Hiding spots on the roof — place AC unit to the RIGHT of shack
            let rSpots = [];
            const acX = -halfW + shackW + 2.0;
            const rMat = new THREE.MeshStandardMaterial({color: 0x445566, roughness: 0.9});
            const rMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 2.0), rMat);
            rMesh.position.set(acX, baseY + 1.5/2, -1.0);
            rMesh.castShadow = true;
            roofGroup.add(rMesh);
            
            rSpots.push({ x: acX, label: 'AC', mesh: rMesh, isSearched: false, hasRaccoon: false, originalColor: 0x445566 });
            
            // Additional random roof clutter (1-2 extra items)
            const roofLabels = ['VNT', 'PIP', 'TNK'];
            const numRoofExtra = 1 + Math.floor(Math.random() * 2);
            for (let ri = 0; ri < numRoofExtra; ri++) {
                let rx;
                for (let tries = 0; tries < 15; tries++) {
                    rx = -halfW + 2.0 + Math.random() * (this.CORRIDOR_W - 4.0);
                    let ok = true;
                    for (const sp of rSpots) { if (Math.abs(rx - sp.x) < 3.0) { ok = false; break; } }
                    if (Math.abs(rx - stairX) < shackW) { ok = false; }
                    if (ok) break;
                }
                const rlbl = roofLabels[Math.floor(Math.random() * roofLabels.length)];
                const riMat = new THREE.MeshStandardMaterial({color: 0x556655, roughness: 0.9});
                const riW = 1.0 + Math.random() * 1.2;
                const riH = 0.8 + Math.random() * 1.0;
                const riMesh = new THREE.Mesh(new THREE.BoxGeometry(riW, riH, riW), riMat);
                riMesh.position.set(rx, baseY + riH/2, -3.0 + Math.random() * 6.0);
                riMesh.castShadow = true;
                roofGroup.add(riMesh);
                rSpots.push({ x: rx, label: rlbl, mesh: riMesh, isSearched: false, hasRaccoon: false, originalColor: 0x556655 });
            }
            
            // Front Perimetral Railing/Parapet
            const parapetMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 });
            const pFront = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W + this.WALL_D*2, 1.2, 0.4), parapetMat);
            pFront.position.set(0, baseY + 0.6, this.CORRIDOR_DEPTH/2 + 0.2);
            roofGroup.add(pFront);

            this.buildingGroup.add(roofGroup);
            this.floors.push({
                group: roofGroup, baseY: baseY,
                doors: [], hidingSpots: rSpots,
                stairX: stairX,
                elevX: halfW - 3.0 / 2, elevDoorX: undefined,
                edoorL: null, edoorR: null, edoorW: 1.6, indicator: null
            });
            continue;
        }

        // Deterministic coloring per floor
        const rngSeed = f * 1337 + 42;
        const floorHsl = `hsl(${(rngSeed * 37) % 360}, ${20 + (rngSeed % 10)}%, ${40 + (rngSeed % 20)}%)`;
        const wallHsl = 0xded8cc; // Beige / dirty corporate white
        
        const floorGroup = new THREE.Group();

        // 1. Thick Floor Slab (Concrete base) spanning entire depth
        const slabMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const slab = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W, 0.3, this.BUILDING_DEPTH), slabMat);
        slab.position.set(0, baseY - 0.15, bCenterZ); // flush under the base line
        floorGroup.add(slab);

        // B&W Checkerboard Carpet
        const checkCanvas = ProceduralTextureFactory.checkerboard(64, '#dddddd', '#222222');
        const checkTex = this.texFactory.getOrCreate('checkerboard_carpet', () => checkCanvas);
        checkTex.wrapS = THREE.RepeatWrapping; checkTex.wrapT = THREE.RepeatWrapping;
        checkTex.repeat.set(this.CORRIDOR_W / 2, this.BUILDING_DEPTH / 2);
        
        const carpetMat = new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.95 });
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W - 0.1, 0.1, this.BUILDING_DEPTH - 0.2), carpetMat);
        carpet.position.set(0, baseY + 0.05, bCenterZ);
        carpet.receiveShadow = true;
        floorGroup.add(carpet);

        // Ceiling of this floor (the roof slab is added after the loop, but inter-floor slabs here)
        if (f < totalFloors) {
            const ceilMat = new THREE.MeshStandardMaterial({ color: 0xdddddf, roughness: 1.0 });
            const ceiling = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W, 0.1, this.BUILDING_DEPTH), ceilMat);
            ceiling.position.set(0, baseY + this.FL_H - 0.05, bCenterZ);
            floorGroup.add(ceiling);
        }

        // 2. Back Corridor Wall (Inner boundary - partitioned dynamically in door loop)
        const innerWallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(wallHsl), roughness: 0.8 });

        // 3. Skirting boards (Zócalos) and Cornice (Cornisa)
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        const skirting = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W, 0.15, 0.1), woodMat);
        skirting.position.set(0, baseY + 0.1 + 0.075, -this.CORRIDOR_DEPTH/2 + 0.15); // right above carpet
        floorGroup.add(skirting);

        const cornice = new THREE.Mesh(new THREE.BoxGeometry(this.CORRIDOR_W, 0.12, 0.08), woodMat);
        cornice.position.set(0, baseY + this.FL_H - 0.1 - 0.06, -this.CORRIDOR_DEPTH/2 + 0.15);
        floorGroup.add(cornice);

        // Floor interior light (warm yellow, or 'Minutero')
        const fLight = new THREE.PointLight(0xffddaa, 0.4, this.FL_H * 3.5);
        fLight.position.set(0, baseY + this.FL_H - 0.4, 1.5);
        fLight.castShadow = true;
        floorGroup.add(fLight);
        this.floorLights[f] = fLight;
        this.floorLightTimers[f] = isLightsOut ? 0 : 9999;

        // Floor number label (on back wall)
        let floorName = String(f);
        if (f === 0) floorName = "S";      // Sótano
        if (f === 1) floorName = "PB";     // Planta Baja
        if (f === totalFloors) floorName = "AZ"; // Caseta Azotea

        const labelCanvas = ProceduralTextureFactory.labelPlate(floorName, {
            width: 64, height: 32,
            bgColor: '#111', textColor: '#ff9500',
            font: 'bold 22px monospace'
        });
        const labelTex = this.texFactory.getOrCreate(`floor_label_${floorName}`, () => labelCanvas);
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 0.8),
            new THREE.MeshBasicMaterial({ map: labelTex })
        );
        label.position.set(-halfW + 1.2, baseY + this.FL_H - 0.8, -this.CORRIDOR_DEPTH/2 + 0.14);
        floorGroup.add(label);

        // ─── DOORS (Hide&Seek Style Frames) ───
        const doorData = [];
        const frameColor = 0xc0c0c8; // standard metallic/white frame
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6, metalness: 0.2 });

        // halfW already defined in outer scope (line 406)
        const STAIR_DOOR_W = 1.6 * 1.5;
        const STAIR_GAP = 1.2;
        
        let stairX = -halfW + 1.0 + STAIR_DOOR_W / 2;
        let doorX = null;
        let doorW = 1.6 * 1.5;
        const fThickness = 0.15; const fDepth = 0.15;
        const fBaseZ = -this.CORRIDOR_DEPTH/2 + 0.1 + fDepth/2;
        const frameMatInst = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
        
        const holes = [];

        let stairType = 'stairs';
        if (f === 0) stairType = 'up';
        
        holes.push({ x: stairX, w: STAIR_DOOR_W, type: stairType });

        if (f === 0) { // Sótano labyrinth
            const bStartX = stairX + STAIR_DOOR_W + 0.4;
            const spaceW = (halfW - bStartX - 1.0);
            if (spaceW > 6.0) {
                const stepW = spaceW / 3;
                holes.push({ x: bStartX + stepW*0.5, w: 2.0, type: 'machine_red' });
                holes.push({ x: bStartX + stepW*1.5, w: 2.0, type: 'machine_green' });
                holes.push({ x: bStartX + stepW*2.5, w: 2.0, type: 'machine_archive' });
            }
        } else if (f === 1) { // Planta Baja
            const boilerX = stairX + STAIR_DOOR_W + 0.4;
            holes.push({ x: boilerX, w: STAIR_DOOR_W, type: 'boiler_hall' });
        } else if (f > 0) { // Normal this.floors (1..totalFloors-1 are habitable)
            doorX = this.DOOR_ZONE_START + 0.5 * this.DOOR_ZONE_W;
            holes.push({ x: doorX, w: doorW, type: 'door' });
        }

        holes.sort((a,b) => a.x - b.x);
        let currentX = -this.CORRIDOR_W / 2;

        holes.forEach(hole => {
            const isDoor = (hole.type === 'door');
            const holeH = isDoor ? (this.FL_H * 0.7) : (this.FL_H * 0.65);
            
            // Wall segment before the hole
            const spanW = (hole.x - hole.w/2) - currentX;
            if (spanW > 0.01) {
                const w = new THREE.Mesh(new THREE.BoxGeometry(spanW, this.FL_H, 0.4), innerWallMat);
                w.position.set(currentX + spanW/2, baseY + this.FL_H/2, -this.CORRIDOR_DEPTH/2 - 0.1);
                w.receiveShadow = true; floorGroup.add(w);
            }
            
            // Wall piece above the hole
            const topH = this.FL_H - holeH;
            const wTop = new THREE.Mesh(new THREE.BoxGeometry(hole.w, topH, 0.4), innerWallMat);
            wTop.position.set(hole.x, baseY + holeH + topH/2, -this.CORRIDOR_DEPTH/2 - 0.1);
            wTop.receiveShadow = true; floorGroup.add(wTop);

            // Room behind the hole
            let isMachine = hole.type.startsWith('machine_');
            let roomW = isDoor ? 3.6 : (isMachine ? hole.w + 0.4 : hole.w + 0.4);
            let roomD = isDoor ? 4.0 : (isMachine ? 3.5 : 2.5); 
            let roomCenterX = hole.x;
            
            if (hole.type === 'boiler_hall') {
                const startX = hole.x - hole.w/2;
                roomW = halfW - startX - 2.0; // Extend to the right end
                roomD = 3.5;
                roomCenterX = startX + roomW/2;
            }

            let roomColor = 0x334455;
            if (hole.type === 'up' || hole.type === 'roof') roomColor = 0x224433;
            if (hole.type === 'down' || hole.type === 'down_basement' || hole.type === 'chute') roomColor = 0x442222;
            if (hole.type === 'boiler_hall' || isMachine) roomColor = 0x111111; // Very dark

            const aqMat = new THREE.MeshStandardMaterial({ color: roomColor, side: THREE.BackSide, roughness: 0.9 });
            const aquarium = new THREE.Mesh(new THREE.BoxGeometry(roomW, this.FL_H, roomD), aqMat);
            aquarium.position.set(roomCenterX, baseY + this.FL_H/2, -this.CORRIDOR_DEPTH/2 - 0.1 - roomD/2);
            floorGroup.add(aquarium);
            
            // Store broom closet references for dynamic transparency
            if (hole.type === 'boiler_hall' || isMachine) {
                wTop.userData.broomWall = true;
                wTop.material = wTop.material.clone();
                wTop.material.transparent = true;
                wTop.material.opacity = 1.0;
            }
            
            // Light inside Aquarium (very tight, physical decay)
            let lColor = hole.type === 'boiler_hall' ? 0xff4422 : 0xaaccff;
            if (hole.type === 'machine_red') lColor = 0xff2211;
            if (hole.type === 'machine_green') lColor = 0x11ffaa;
            if (hole.type === 'machine_archive') lColor = 0xffcc77;
            const aqLight = new THREE.PointLight(lColor, isDoor ? 0.2 : 0.4, (hole.type === 'boiler_hall' || isMachine) ? 1.5 : 2.0, 2.0);
            aqLight.position.set(hole.x, baseY + this.FL_H - 1.0, -this.CORRIDOR_DEPTH/2 - 0.1 - roomD/2);
            floorGroup.add(aqLight);

            // Volumetric slice for open portals (stairs, boiler) - Stage 1 Atmosphere
            if (!isDoor) {
                let sliceColor = 0x1177ff;
                if (hole.type === 'boiler_hall' || hole.type === 'machine_red') sliceColor = 0xff4422;
                if (hole.type === 'machine_green') sliceColor = 0x11ffaa;
                if (hole.type === 'machine_archive') sliceColor = 0xffcc77;

                const bMat = new THREE.MeshBasicMaterial({ 
                    color: sliceColor, 
                    transparent: true, opacity: 0.1,
                    blending: THREE.AdditiveBlending, side: THREE.DoubleSide
                });
                const sliceH = this.FL_H * 0.8;
                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(hole.w * 0.9, sliceH, roomD * 1.5), bMat);
                bMesh.position.set(roomCenterX, baseY + sliceH/2, -this.CORRIDOR_DEPTH/2 - 0.1 - roomD/4);
                floorGroup.add(bMesh);
            }

            // Boiler hall inner light far along the corridor
            if (hole.type === 'boiler_hall') {
                const boilerEndLight = new THREE.PointLight(0xffaa55, 0.3, 2.0, 2.0);
                boilerEndLight.position.set(roomCenterX + roomW/4, baseY + this.FL_H - 1.0, -this.CORRIDOR_DEPTH/2 - 0.1 - roomD/2);
                floorGroup.add(boilerEndLight);
            }

            // Frame for the hole
            const fTopMesh = new THREE.Mesh(new THREE.BoxGeometry(hole.w + 0.1, fThickness, fDepth + 0.05), frameMatInst);
            fTopMesh.position.set(hole.x, baseY + holeH + fThickness/2 + 0.05, fBaseZ);
            fTopMesh.castShadow = true; floorGroup.add(fTopMesh);

            // Hide&Seek arrow for stairs inside the room
            if (!isDoor && hole.type !== 'boiler_hall') {
                let textColor = '#fff';
                let sym = '';
                if (hole.type === 'up') { textColor = '#44cc88'; sym = '▲'; }
                if (hole.type === 'down') { textColor = '#cc7722'; sym = '▼'; }
                if (hole.type === 'stairs') { textColor = '#ddaa33'; sym = '▲▼'; } 
                if (hole.type === 'roof') { textColor = '#88aabb'; sym = '##'; }
                if (hole.type === 'chute') { textColor = '#ff2222'; sym = '!!'; }

                const arrowCanvas = ProceduralTextureFactory.labelPlate(sym, {
                    width: 64, height: 64,
                    bgColor: 'transparent', textColor: textColor,
                    font: 'bold 40px monospace'
                });
                const arrowTex = this.texFactory.getOrCreate(`arrow_${sym}`, () => arrowCanvas);
                const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({map: arrowTex, transparent:true}));
                arrowMesh.position.set(hole.x, baseY + holeH + 0.7, -this.CORRIDOR_DEPTH/2 - 0.12);
                floorGroup.add(arrowMesh);
            }

            // Standard door mesh for the main door only
            if (isDoor) {
                const doorColor = this.DOOR_COLORS[(f * doorsPerFloor) % this.DOOR_COLORS.length];
                const doorMat = new THREE.MeshStandardMaterial({ color: 0x995533, roughness: 0.6, metalness: 0.1 });
                const dMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.1, holeH - 0.1, 0.08), doorMat);
                dMesh.position.set(hole.x, baseY + holeH/2 - 0.05, -this.CORRIDOR_DEPTH/2 + 0.12);
                dMesh.castShadow = true; floorGroup.add(dMesh);

                const numCanvas = ProceduralTextureFactory.labelPlate(String(f) + "A", {
                    width: 32, height: 32,
                    bgColor: doorColor > 0x777777 ? '#222' : '#ddd',
                    textColor: '#111',
                    font: 'bold 20px serif'
                });
                const numTex = this.texFactory.getOrCreate(`door_num_${f}`, () => numCanvas);
                const numPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: numTex, transparent: true }));
                numPlate.position.set(hole.x, baseY + holeH + 0.4, -this.CORRIDOR_DEPTH/2 + 0.18);
                floorGroup.add(numPlate);

                const logicalFrameGroup = new THREE.Group(); logicalFrameGroup.add(fTopMesh);
                
                // Yellow Square "Battery" Applique for normal doors
                const indMat = new THREE.MeshBasicMaterial({ 
                    color: 0xffdd55, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending 
                });
                const dSphere = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), indMat);
                dSphere.position.set(hole.x - 0.1, baseY + holeH + 0.8, -this.CORRIDOR_DEPTH/2 + 0.2); 
                
                // Random super faint glow, physical decay
                const randIntensity = 0.01 + Math.random() * 0.04;
                const sqLight = new THREE.PointLight(0xffaa22, randIntensity, 0.8, 2.0);
                dSphere.add(sqLight);

                dSphere.userData.isGlowSphere = true;
                if (this.flickerSystem) {
                    this.flickerSystem.register(indMat, { type: 'opacity', speed: 0.5 });
                }
                floorGroup.add(dSphere);
                
                doorData.push({ x: hole.x, mesh: dMesh, frame: logicalFrameGroup, sphere: dSphere });
            }

            currentX = hole.x + hole.w/2;
        });

        // Wall segment after the last hole
        const endW = (this.CORRIDOR_W / 2) - currentX;
        if (endW > 0.01) {
            const wEnd = new THREE.Mesh(new THREE.BoxGeometry(endW, this.FL_H, 0.4), innerWallMat);
            wEnd.position.set(currentX + endW/2, baseY + this.FL_H/2, -this.CORRIDOR_DEPTH/2 - 0.1);
            wEnd.receiveShadow = true; floorGroup.add(wEnd);
        }

        let elevX = halfW - ELEV_ZONE / 2;
        let elevDoorX = undefined;
        let switchX = (f > 0 && f < totalFloors) ? (halfW - ELEV_ZONE - 1.2) : (stairX + (isLightsOut ? 1.5 : 1.5));
        if (f === 1) switchX = stairX + 3.0; // Avoid boiler room door
        
        // ─── MINUTERO SWITCH (INTERRUPTOR) ───
        const switchMat = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.9 });
        const pSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.05), switchMat);
        pSwitch.position.set(switchX, baseY + 1.2, -this.CORRIDOR_DEPTH/2 + 0.15);
        floorGroup.add(pSwitch);

        let edoorL = null;
        let edoorR = null;
        let edoorW = 1.6;
        let ind = null;

        if (f > 0 && f < totalFloors) {
            // ─── ELEVATOR SHAFT DOORS & SEPARATOR (right side) ───
            elevX = halfW - ELEV_ZONE / 2;
            elevDoorX = halfW - ELEV_ZONE; // Left wall of the shaft where doors are at

            // Separator wall (faces the corridor) -> This is where the door goes!
            const sepMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.8 });
        
            // Split the separator wall into two pieces to leave a hole for the doors
            edoorW = 1.6; // Width of the doors
        
        // Wall left (front of doors)
            const sepW1 = (this.CORRIDOR_DEPTH - edoorW) / 2;
            const sepFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.FL_H, sepW1), sepMat);
            sepFront.position.set(elevDoorX, baseY + this.FL_H/2, this.CORRIDOR_DEPTH/2 - sepW1/2);
        
            // Wall right (back of doors)
            const sepBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.FL_H, sepW1), sepMat);
            sepBack.position.set(elevDoorX, baseY + this.FL_H/2, -this.CORRIDOR_DEPTH/2 + sepW1/2);
            floorGroup.add(sepFront, sepBack);

            // Elevator doors (two panels that slide open along the Z axis!)
            const edoorH = this.FL_H * 0.75;
            const edoorMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.7 });

            // Left door (front)
            edoorL = new THREE.Mesh(new THREE.BoxGeometry(0.1, edoorH, edoorW/2), edoorMat);
            edoorL.position.set(elevDoorX - 0.05, baseY + edoorH/2 + 0.15, edoorW/4);
            floorGroup.add(edoorL);

            // Right door (back)
            edoorR = new THREE.Mesh(new THREE.BoxGeometry(0.1, edoorH, edoorW/2), edoorMat);
            edoorR.position.set(elevDoorX - 0.05, baseY + edoorH/2 + 0.15, -edoorW/4);
            floorGroup.add(edoorR);

            // Elevator Indicator Block (BoxGeometry instead of sphere)
            const indMat = new THREE.MeshBasicMaterial({ color: 0x002244 });
            ind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.8), indMat);
            ind.position.set(elevDoorX - 0.06, baseY + edoorH + 0.6, 0); // At Z=0
            floorGroup.add(ind);
        }
        this.buildingGroup.add(floorGroup);

        // Compute hiding spots for special this.floors
        let hidingSpots = [];
        
        const addHidingProps = (xPos, lbl, t) => {
            const hMat = new THREE.MeshStandardMaterial({color: t==='cabinet' ? 0x444444 : 0x554433, roughness: 0.9});
            const w = t==='cabinet' ? 1.5 : 1.2;
            const h = t==='cabinet' ? 2.5 : 1.2;
            const hMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), hMat);
            hMesh.position.set(xPos, baseY + h/2, Math.random()*2 - 1);
            hMesh.castShadow = true;
            hMesh.userData = { isHideSpot: true, hideSpotIdx: hidingSpots.length, floorIdx: f };
            floorGroup.add(hMesh);
            
            hidingSpots.push({ x: xPos, label: lbl, mesh: hMesh, isSearched: false, hasRaccoon: false, originalColor: hMat.color.getHex() });
        }

        // ─── PROCEDURAL HIDING SPOTS (random distribution) ───
        // Safe corridor zone: from right edge of stairwell to left edge of elevator
        const safeMinX = stairX + STAIR_DOOR_W/2 + 1.5; // clear of stair door
        const safeMaxX = (f > 0 && f < totalFloors) 
            ? (elevDoorX !== undefined ? elevDoorX - 2.0 : halfW - 3.0)
            : halfW - 1.5;
        const safeWidth = safeMaxX - safeMinX;

        // Exclusion zones: positions that must not have items (doors, switches, elevator)
        const exclusions = [];
        doorData.forEach(d => exclusions.push({ x: d.x, r: 2.0 }));
        if (switchX !== undefined) exclusions.push({ x: switchX, r: 1.0 });
        if (elevDoorX !== undefined) exclusions.push({ x: elevDoorX, r: 3.0 }); // Keep far from elevator
        if (elevX !== undefined) exclusions.push({ x: elevX, r: 2.5 });

        const randomSafeX = (existingSpots) => {
            for (let tries = 0; tries < 20; tries++) {
                const rx = safeMinX + Math.random() * safeWidth;
                // Check against exclusion zones
                let blocked = false;
                for (const ex of exclusions) { if (Math.abs(rx - ex.x) < ex.r) { blocked = true; break; } }
                // Check against already-placed spots
                for (const sp of existingSpots) { if (Math.abs(rx - sp.x) < 2.0) { blocked = true; break; } }
                if (!blocked) return rx;
            }
            return safeMinX + safeWidth * 0.5; // fallback center
        }

        const itemTypes = ['crate', 'cabinet'];
        const itemLabels = { crate: ['BOX', 'CR1', 'CR2'], cabinet: ['CAB', 'ARM', 'ELC'] };

        // `numItems` venía del ámbito global del monolito; al extraer a módulo ES
        // (strict mode) asignar sin declarar lanza ReferenceError y rompía build().
        let numItems = 0;
        if (f === 0) numItems = 2 + Math.floor(Math.random() * 3);      // Sótano: 2-4
        else if (f === 1) numItems = 1 + Math.floor(Math.random() * 2);  // PB: 1-2
        else if (f < totalFloors) numItems = Math.random() > 0.3 ? (1 + Math.floor(Math.random() * 2)) : 0; // Normal: 0-2
        // Azotea is handled separately above

        for (let si = 0; si < numItems; si++) {
            const rx = randomSafeX(hidingSpots);
            const t = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            const labels = itemLabels[t];
            const lbl = labels[Math.floor(Math.random() * labels.length)];
            addHidingProps(rx, lbl, t);
        }

        // --- SPECIFIC BROOM CLOSET SPOTS (Floor 1) ---
        // Ensure the AI enters the broom closet by placing 2 guaranteed spots deep inside
        if (f === 1) {
            const boilerDoorX = stairX + 1.6*1.5 + 0.4;
            // Place inside boiler room X range
            addHidingProps(boilerDoorX + 1.0, 'MOP', 'cabinet');
            // Hardcode Z to be deep inside the boiler room!
            const lastSpot = hidingSpots[hidingSpots.length - 1];
            lastSpot.mesh.position.z = -this.CORRIDOR_DEPTH/2 - 2.0;

            addHidingProps(boilerDoorX + 2.5, 'BOX', 'crate');
            const lastSpot2 = hidingSpots[hidingSpots.length - 1];
            lastSpot2.mesh.position.z = -this.CORRIDOR_DEPTH/2 - 1.5;
        }

        // --- SPECIFIC SÓTANO MAZE SPOTS (Floor 0) ---
        if (f === 0) {
            holes.forEach(h => {
                if (h.type === 'machine_red') {
                    addHidingProps(h.x, 'CAL', 'cabinet');
                    hidingSpots[hidingSpots.length - 1].mesh.position.z = -this.CORRIDOR_DEPTH/2 - 2.0;
                }
                if (h.type === 'machine_green') {
                    addHidingProps(h.x, 'GEN', 'crate');
                    hidingSpots[hidingSpots.length - 1].mesh.position.z = -this.CORRIDOR_DEPTH/2 - 1.5;
                }
                if (h.type === 'machine_archive') {
                    addHidingProps(h.x - 0.5, 'BOX', 'crate');
                    hidingSpots[hidingSpots.length - 1].mesh.position.z = -this.CORRIDOR_DEPTH/2 - 1.5;
                    addHidingProps(h.x + 0.5, 'DOC', 'cabinet');
                    hidingSpots[hidingSpots.length - 1].mesh.position.z = -this.CORRIDOR_DEPTH/2 - 2.0;
                }
            });
        }

        this.floors.push({
            group: floorGroup,
            baseY: baseY,
            doors: doorData,
            hidingSpots: hidingSpots,
            stairX: stairX,
            elevX: elevX,
            elevDoorX: elevDoorX,
            switchX: switchX,
            edoorL: edoorL,
            edoorR: edoorR,
            edoorW: edoorW,
            indicator: ind
        });
    }

    // ─── Elevator cabin (moves through the shaft) ───
    const cabinH = this.FL_H * 0.7;
    const cabinW = ELEV_ZONE - 0.8;
    const cabinD = this.CORRIDOR_DEPTH - 0.8;
    const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x556677, roughness: 0.3, metalness: 0.6,
        transparent: true, opacity: 0.9
    });
    this.elevator.cabin = new THREE.Mesh(
        new THREE.BoxGeometry(cabinW, cabinH, cabinD),
        cabinMat
    );
    this.elevator.cabin.position.set(this.floors[1].elevX, cabinH/2 + 0.15, 0);
    this.buildingGroup.add(this.elevator.cabin);

    // Cabin interior light + Fridge effect
    const cabLight = new THREE.PointLight(0xffeecc, 0.4, 6);
    cabLight.position.set(0, cabinH/2 - 0.3, 0.3);
    this.elevator.cabin.add(cabLight);
    
    // The Fridge Light Box (illuminates the dark corridor when doors open)
    const fridgeLight = VolumetricsPlugin.createApplianceBeam('fridge');
    fridgeLight.position.set(-cabinW/2, cabinH/2 - 1.0, 0); 
    fridgeLight.rotation.y = -Math.PI / 2; 
    this.elevator.cabin.add(fridgeLight);
    this.elevator.fridgeLight = fridgeLight;

    this.elevator.y = this.floors[1] ? this.floors[1].baseY : 0;
    this.elevator.currentFloor = 1; // Start on Planta Baja, not Sótano (which has no elevator)
    this.elevator.doorTimer = 0;

    // Procedural Volumetric Beam Texture (H&S standard)
    const createVolumetricTexture = () => {
        const canvas = ProceduralTextureFactory.gradientBeam([1, 1, 1], 0.65);
        return this.texFactory.getOrCreate('volumetric_beam_white', () => canvas);
    }

    // ─── PERSONAJES (opcionales) ─────────────────────────────────────────────
    // El bloque de acosador + linterna volumétrica venía acoplado al bucle de juego
    // del monolito. Con `buildCharacters:false` la fábrica construye SOLO EL EDIFICIO,
    // que es lo que necesita un lab de búsqueda por puertas o un entorno de gym.
    if (opts.buildCharacters === false) {
        // ⚠️ Esta salida temprana devolvía el grupo SIN COLGARLO DE LA ESCENA.
        //
        // `this.scene.add(this.buildingGroup)` está mucho más abajo, después de
        // crear los personajes, así que por este camino nunca se ejecutaba: la
        // fábrica construía el edificio entero — 183 mallas y 26 luces, todo
        // correcto — y lo devolvía huérfano. La pantalla salía NEGRA sin un solo
        // error, y todo apuntaba a un problema de iluminación que no existía.
        //
        // Peor aún: `buildAll()` pasa `buildCharacters: c.characters ?? false`,
        // así que el camino POR DEFECTO era justo este. Quien llamara a la
        // fábrica de la forma recomendada no veía nada.
        //
        // Una función que construye algo y lo devuelve sin colgarlo es una
        // trampa para todo el que la use: colgar es parte de construir.
        this.scene.add(this.buildingGroup);
        return { group: this.buildingGroup, floors: this.floors, elevator: this.elevator };
    }

    // ─── Seeker character ───
    seeker.mesh = new THREE.Group();
    if (seekerModel) {
        seeker.mesh.add(seekerModel);
        seeker.visualModel = seekerModel;
        seekerModel.rotation.y = Math.PI; // Face outwards
    }
    
    // ─── Flashlight Setup (Face Mounted) ───
    seeker.flashLightGroup = new THREE.Group();

    // The character mesh's scale is 1.815. Head height is ~3.2m, face height ~2.9m.
    // Z=0.3 pushes it out just in front of the nose.
    const fY = 2.9;
    const fZ = 0.35;
    
    flashLight = new THREE.SpotLight(0xffeedd, 1.2, 15, Math.PI / 10, 0.6, 1.2);
    flashLight.position.set(0, fY, fZ); 

    const targetObj = new THREE.Object3D();
    // Revert target Y to a stable floor intersection angle (1.5) so the beam actually draws the floor
    const targetY = 1.5;
    targetObj.position.set(0, targetY, 4.0); 
    seeker.flashLightGroup.add(targetObj);
    flashLight.target = targetObj;
    seeker.flashLightGroup.add(flashLight);
    
    // Volumetric Beam (Amnesia Fake Cone)
    const bGeo = new THREE.ConeGeometry(3.5, 15, 32, 1, true);
    bGeo.translate(0, -7.5, 0); // Put tip at origin
    bGeo.rotateX(-Math.PI / 2); // Point along +Z
    const bMat = new THREE.MeshBasicMaterial({
        map: VolumetricsPlugin.createBaseTexture(),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide
    });
    volumetricBeam = new THREE.Mesh(bGeo, bMat);
    volumetricBeam.position.set(0, fY, fZ);
    // Tilt the beam down by exactly the Y difference.
    volumetricBeam.rotation.x = Math.atan2(fY - targetY, 4.0 - fZ);
    seeker.flashLightGroup.add(volumetricBeam);

    /**
     * ⚠️ LA LINTERNA SE PUBLICA, Y HASTA HOY NO SALÍA DE AQUÍ.
     *
     * `flashLight` y `volumetricBeam` son LOCALES de `build()` (l.71-72). La
     * página declara sus propios `let flashLight = null` / `volumetricBeam =
     * null` y **nunca los asigna**, así que sus cinco
     * `if (flashLight) flashLight.intensity = …` eran no-ops: el cono se quedaba
     * a intensidad fija y NO SE APAGABA NUNCA, aunque el HUD pusiera OFF o DEAD.
     * La interfaz mentía sobre lo que hacía la tecla F.
     *
     * Es exactamente el fallo que ya está documentado veinte líneas más abajo
     * con `flashDust`, y que allí se arregló publicándolo. Aquí se hace igual:
     * en `this` para quien tenga la fábrica, y en `seeker` para quien tenga al
     * personaje. Dos referencias al MISMO objeto, no dos copias.
     */
    this.flashLight = flashLight;
    this.volumetricBeam = volumetricBeam;
    seeker.flashLight = flashLight;
    seeker.volumetricBeam = volumetricBeam;

    // Flashlight Dust Particles
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 60;
    const dustPos = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount; i++) {
        dustPos[i*3] = (Math.random() - 0.5) * 2.0;
        dustPos[i*3+1] = (Math.random() - 0.5) * 2.0;
        dustPos[i*3+2] = Math.random() * 12 + 1.0; 
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xffffee, size: 0.04, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    // ⚠️ Aquí ponía `window.flashDust = new THREE.Points(...)`, pero arriba (l.73)
    // hay un `let flashDust` LOCAL. Son dos variables distintas: la global se
    // rellenaba y la local seguía a null, así que la línea siguiente reventaba
    // con «Cannot read properties of null (reading 'position')» — y con ella se
    // caía todo el resto de `build()`, incluido el `scene.add` del final. El
    // edificio se construía y se quedaba huérfano.
    //
    // Es un resto de cuando esto vivía en un monolito y las variables eran
    // globales de la página. Se asigna a la local, y se sigue publicando en
    // `window` y en la fábrica por si alguien lo lee por ahí.
    flashDust = new THREE.Points(dustGeo, dustMat);
    this.flashDust = flashDust;
    window.flashDust = flashDust;
    flashDust.position.set(0, fY, fZ);
    flashDust.rotation.x = volumetricBeam.rotation.x;
    flashDust.userData.velocities = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount; i++) {
        flashDust.userData.velocities[i*3] = (Math.random() - 0.5) * 0.2;
        flashDust.userData.velocities[i*3+1] = Math.random() * 0.2 + 0.1;
        flashDust.userData.velocities[i*3+2] = Math.random() * 0.5 + 0.2; // Move dynamically forward
    }
    seeker.flashLightGroup.add(flashDust);

    // Add flashlight group to the seeker mesh (it will rotate via logic)
    seeker.mesh.add(seeker.flashLightGroup);

    seeker.floor = 1; seeker.x = 0; seeker.z = 0;
    seeker.mesh.position.set(0, this.floors[1].baseY + 0.12, seeker.z);
    this.buildingGroup.add(seeker.mesh);
    
    // ─── Rabbit character (Raccoon) ───
    rabbit.mesh = new THREE.Group();
    if (rabbitModel) {
        rabbit.mesh.add(rabbitModel);
        rabbit.visualModel = rabbitModel;
    }
    rabbit.floor = 1; rabbit.x = -this.exteriorDistance(); rabbit.z = 0; 
    rabbit.mesh.position.set(rabbit.x, this.floors[1].baseY + 0.12, rabbit.z);
    this.buildingGroup.add(rabbit.mesh);
    
    this.scene.add(this.buildingGroup);

    // Frame the camera gracefully over the whole building to see basement to roof
    const distanceToFit = (totalH * 0.55) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(0, 0, distanceToFit);
    controls.target.set(0, 0, bCenterZ);
    controls.update();

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  DE AQUÍ AL FINAL: LA CINEMÁTICA. APAGADA SALVO QUE SE PIDA, Y NO ES
     *  PEREZA — ES QUE ENCENDERLA CAMBIA EL JUEGO.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Este bloque nunca llegó a ejecutarse: `targetFloor` estaba sin declarar y
     * `build()` moría aquí en cada partida, con la excepción disfrazada de «un
     * modelo que no carga» porque salía por el `onError` del `GLTFLoader`.
     *
     * Al declararla y volver a mirar la pantalla, el bloque se activó y el
     * buscador DESAPARECIÓ —línea `seeker.mesh.visible = false`, «durante la
     * cinemática»— en una página que no ejecuta ninguna cinemática. Y la cámara
     * se reencuadraba sola al final. O sea que arreglar la excepción, a secas,
     * habría estropeado el juego para dejar el código «correcto».
     *
     * Así que se hace lo que ya dice la nota de las huérfanas del principio:
     * queda INERTE, no roto. Con `opts.cinematica` se enciende entero, y quien
     * lo encienda tiene que traerse también `seekerAI` y sus globales. Lo que
     * sí sale siempre es `this.cinematica`, el destino elegido, porque calcularlo
     * no cuesta nada y no tenerlo obligaba a adivinarlo.
     */
    let cinematicScenarios = [
        { floor: 0, door: 0 },
        { floor: totalFloors - 1, door: 0 }
    ];
    if (this.floors[1].doors.length > 1) {
        cinematicScenarios.push({ floor: 1, door: 1 }); // Broom closet on Ground Floor
    }
    let scent = cinematicScenarios[Math.floor(Math.random() * cinematicScenarios.length)];
    targetFloor = scent.floor;
    targetDoor = scent.door;
    this.cinematica = { floor: targetFloor, door: targetDoor };

    /**
     * ⚠️ LAS PILAS SON CONTENIDO DEL JUEGO, NO CINEMÁTICA. ESTO LO PUSE MAL YO.
     *
     * Al dejar inerte el bloque de la cinemática, `spawnBatteries()` se quedó
     * DETRÁS del `return` de abajo, porque estaba escrito al final del método.
     * Con eso, la mecánica de la linterna quedaba coja: la barra bajaba 1,5 por
     * segundo y no había ni una sola pila en el edificio para subirla. Eso no es
     * un juego de recurso, es una cuenta atrás.
     *
     * (Antes tampoco aparecían, por otro motivo: `build()` reventaba mucho antes
     * con las globales huérfanas. O sea que esta mecánica lleva sin verse desde
     * que se extrajo la fábrica del monolito.)
     */
    this.spawnBatteries(totalFloors);

    if (!opts.cinematica) return;

    // Initial State override
    gamePhase = 'cinematic';
    cinematicPhase = 'walking_to_elevator';
    cinematicTimer = 0;

    seeker.mesh.visible = false; // Hide seeker during cinematic

    // ─── Reset Córtex Tiburón AI ───
    seekerAI.phase = 'PICK_FLOOR';
    seekerAI.aiTargetFloor = -1;
    seekerAI.exploredFloors.clear();
    seekerAI.sweepIndex = 0;
    seekerAI.stuckTimer = 0;
    seekerAI.lastX = 0;
    seekerAI.lastFloor = 0;
    seekerAI.travelMode = 'elevator';
    // Initialize uniform Bayesian beliefs
    seekerAI.beliefs = [];
    for (let i = 0; i < this.floors.length; i++) {
        const hasSearchables = this.floors[i].doors.length > 0 || (this.floors[i].hidingSpots && this.floors[i].hidingSpots.length > 0);
        seekerAI.beliefs.push(hasSearchables ? 1.0 : 0.0);
    }
    // Normalize
    const beliefSum = seekerAI.beliefs.reduce((a, b) => a + b, 0);
    if (beliefSum > 0) seekerAI.beliefs = seekerAI.beliefs.map(b => b / beliefSum);

    // Center camera on the building
    const bldgCenterY = totalFloors * this.FL_H / 2;
    cam.position.set(0, 0, 60);
    cam.lookAt(0, 0, 0);
    this.buildingGroup.position.y = -bldgCenterY + this.FL_H * 0.3;
    // Las pilas ya se repartieron antes del `return` de la cinemática: son
    // contenido del juego y tienen que existir se juegue la cinemática o no.
    // Volver a llamar aquí las borraría y las repartiría otra vez.
}

/**
 * ⚠️ DOS HUÉRFANAS MÁS, CAZADAS POR `check_globales_huerfanos.py` EL 26-08.
 *
 * Este método usaba `batteryPickups` y `totalFloors` como si fueran globales
 * del monolito: en un módulo, la primera línea lanza `ReferenceError`. Nadie lo
 * había visto porque `build()` moría antes de llegar a llamarlo — un fallo
 * tapando a otro.
 *
 * `batteryPickups` ya existía como estado de la fábrica (`this.batteryPickups`,
 * declarado en el constructor) y la página lo lee de ahí después de construir.
 * Así que no había que inventar nada: había que usar el que ya estaba. Y las
 * plantas entran por parámetro, que es de donde vienen.
 */
spawnBatteries(totalFloors) {
    for (const b of this.batteryPickups) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
    }
    this.batteryPickups = [];

    for (let f = 1; f < totalFloors; f++) { // Skip basement (f=0) just in case
        if (Math.random() < 0.7) { // 70% chance to have a battery
            const bMat = new THREE.MeshStandardMaterial({color: 0x34c759, emissive: 0x34c759, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.8});
            const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8), bMat);
            batt.rotation.x = Math.PI / 2;
            
            // Add actual glowing light, physical decay
            const bLight = new THREE.PointLight(0x34c759, 1.0, 1.2, 2.0);
            batt.add(bLight);
            
            const bx = (Math.random() - 0.5) * (this.CORRIDOR_W - 6);
            batt.position.set(bx, this.floors[f].baseY + 0.1, (Math.random() - 0.5) * 2.0);
            this.buildingGroup.add(batt);
            this.batteryPickups.push({mesh: batt, floor: f, x: bx, z: batt.position.z});
        }
    }
}

exteriorDistance() {
    return this.CORRIDOR_W / 2 + 5; 
}

// Arrow indicator helper

}
