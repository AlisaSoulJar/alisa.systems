/**
 * EnvironmentFactory
 * Consolidates dispersed procedural generation logic (trees, rooms, stars, props)
 * into a single unified factory for the ALISA WorldBuilderEngine.
 */
import * as THREE from 'three';

export const EnvironmentFactory = {
    _textureCache: {},

    loadTexture(url) {
        if (this._textureCache[url]) return this._textureCache[url];
        const tex = new THREE.TextureLoader().load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        this._textureCache[url] = tex;
        return tex;
    },

    // ═══════════════════════════════════════════════════
    // SPACE & CELESTIAL
    // ═══════════════════════════════════════════════════
    createProceduralPlanet(radius = 150, baseColor = 0x88ccff) {
        const group = new THREE.Group();
        // Core sphere
        const geo = new THREE.IcosahedronGeometry(radius, 4);
        const mat = new THREE.MeshStandardMaterial({ 
            color: baseColor, 
            roughness: 0.8, 
            metalness: 0.1,
            flatShading: true
        });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Atmosphere shell
        const atmosGeo = new THREE.IcosahedronGeometry(radius * 1.05, 4);
        const atmosMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        const atmos = new THREE.Mesh(atmosGeo, atmosMat);
        
        group.add(mesh);
        group.add(atmos);
        
        // Ring (optional, procedurally added if big enough)
        if (radius > 200) {
            const ringGeo = new THREE.RingGeometry(radius * 1.4, radius * 2.2, 64);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: baseColor, 
                transparent: true, 
                opacity: 0.4, 
                side: THREE.DoubleSide 
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + 0.2;
            group.add(ring);
        }

        group.userData = { isPlanet: true };
        return group;
    },

    createStarBlock(count = 200, size = 1000) {
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const rng = (Math.random) // Use deterministic source later
        for(let i=0; i<count*3; i++) {
            positions[i] = (Math.random() - 0.5) * size;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({color: 0xddddff, size: 2.0, transparent: true, opacity: 0.8});
        return new THREE.Points(starGeo, starMat);
    },

    // ═══════════════════════════════════════════════════
    // FOLIAGE / NATURE
    // ═══════════════════════════════════════════════════
    createTree(x, z, scale = 1.0) {
        const group = new THREE.Group();
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2 * scale, 5);
        const trunkMat = new THREE.MeshStandardMaterial({color: 0x4a3424, roughness: 0.9});
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Leaves
        const leafGeo = new THREE.DodecahedronGeometry(1.5 * scale, 0);
        const leafMat = new THREE.MeshStandardMaterial({color: 0x228833, roughness: 0.8});
        const leaves = new THREE.Mesh(leafGeo, leafMat);
        leaves.position.y = 2.5 * scale;
        leaves.castShadow = true;
        group.add(leaves);

        group.position.set(x, 0, z);
        return group;
    },

    createForest(count, sizeX, sizeZ) {
        const forest = new THREE.Group();
        for(let i=0; i<count; i++) {
            const x = (Math.random() - 0.5) * sizeX;
            const z = (Math.random() - 0.5) * sizeZ;
            forest.add(this.createTree(x, z, 0.8 + Math.random() * 0.4));
        }
        return forest;
    },

    // ═══════════════════════════════════════════════════
    // PROCEDURAL INTERIORS (BSP)
    // ═══════════════════════════════════════════════════
    createBSPRoom(bspLayout, roomW, roomD, WALL_H = 12, WALL_THICK = 1.0) {
        // bspLayout comes from BSPRenderEngine.generateBSPTopology
        const roomGroup = new THREE.Group();

        const matFloorRoom = new THREE.MeshStandardMaterial({ color: 0xcad0d8, roughness: 0.95 });
        const matFloorCorridor = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.7, metalness: 0.1 });
        const matOuterWall = new THREE.MeshStandardMaterial({ color: 0xd0d0d8, roughness: 0.7 });
        const matInnerWall = new THREE.MeshStandardMaterial({ color: 0xc8c8d5, roughness: 0.75 });
        
        const hw = roomW / 2;
        const hd = roomD / 2;

        // 1. Draw per-room floors
        bspLayout.rooms.forEach(r => {
            const fGeo = new THREE.PlaneGeometry(r.w, r.d);
            const fMat = r.type === 'corridor' ? matFloorCorridor : matFloorRoom;
            const f = new THREE.Mesh(fGeo, fMat);
            f.rotation.x = -Math.PI / 2;
            f.position.set(r.x + r.w/2 - hw, 0, r.z + r.d/2 - hd);
            f.receiveShadow = true;
            roomGroup.add(f);
        });

        // 2. Outer boundary walls
        const outerWalls = [
            { size: [roomW, WALL_H, WALL_THICK], pos: [0, WALL_H / 2, -hd] },  // back
            { size: [roomW, WALL_H, WALL_THICK], pos: [0, WALL_H / 2, hd] },   // front
            { size: [WALL_THICK, WALL_H, roomD], pos: [-hw, WALL_H / 2, 0] },  // left
            { size: [WALL_THICK, WALL_H, roomD], pos: [hw, WALL_H / 2, 0] }    // right
        ];
        outerWalls.forEach(ow => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(...ow.size), matOuterWall);
            m.position.set(...ow.pos);
            m.castShadow = true; m.receiveShadow = true;
            roomGroup.add(m);
        });

        // 3. Inner partitioning walls
        bspLayout.walls.forEach(w => {
            const isHoriz = w.w > w.d;
            const dw = isHoriz ? w.w : WALL_THICK;
            const dd = isHoriz ? WALL_THICK : w.d;
            
            const wGeo = new THREE.BoxGeometry(dw, WALL_H, dd);
            const wMesh = new THREE.Mesh(wGeo, matInnerWall);
            wMesh.position.set(w.x + w.w/2 - hw, WALL_H/2, w.z + w.d/2 - hd);
            wMesh.castShadow = true; wMesh.receiveShadow = true;
            roomGroup.add(wMesh);
        });

        return roomGroup;
    },

    createBSPCabinet(partition, lockedDrawers, cabinetAspect = 0.7, cabinetScale = 1.0) {
        const drawerMeshes = [];
        const cabinetGroup = new THREE.Group();
        const W = 3.0*cabinetAspect*cabinetScale, H = 2.8*cabinetScale, D = 0.6;
        const fMat = new THREE.MeshStandardMaterial({color:0x5c3a1a, roughness:0.6, metalness:0.2});
        
        const back = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,H+0.06,0.03), new THREE.MeshStandardMaterial({color:0x3a2510,roughness:0.8}));
        back.position.set(0,H/2,-D/2-0.015); back.receiveShadow=true; cabinetGroup.add(back);
        
        const topB = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,0.03,D), fMat); topB.position.set(0,H+0.015,0); topB.castShadow=true; cabinetGroup.add(topB);
        const botB = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,0.03,D), fMat); botB.position.set(0,-0.015,0); cabinetGroup.add(botB);
        const sL = new THREE.Mesh(new THREE.BoxGeometry(0.03,H,D), fMat); sL.position.set(-W/2-0.015,H/2,0); sL.castShadow=true; cabinetGroup.add(sL);
        const sR = new THREE.Mesh(new THREE.BoxGeometry(0.03,H,D), fMat); sR.position.set(W/2+0.015,H/2,0); sR.castShadow=true; cabinetGroup.add(sR);
        
        const pMat = new THREE.MeshStandardMaterial({color:0x7a5530,roughness:0.5,metalness:0.15});
        partition.planks.forEach(p => { 
            const plank = new THREE.Mesh(new THREE.BoxGeometry(Math.max(p.w*W,0.02),Math.max(p.h*H,0.02),D*0.95), pMat); 
            plank.position.set((p.x+p.w/2-0.5)*W,(1-p.y-p.h/2)*H,0); plank.castShadow=true; cabinetGroup.add(plank); 
        });
        
        const dMat = new THREE.MeshStandardMaterial({color:0x3d2815, roughness:0.7, metalness:0.1});
        partition.leaves.forEach((l,i) => {
            const cx=(l.x+l.w/2-0.5)*W, cy=(1-l.y-l.h/2)*H, cw=l.w*W*0.92, ch=l.h*H*0.92;
            const face = new THREE.Mesh(new THREE.BoxGeometry(cw,ch,0.04), dMat.clone()); face.position.set(cx,cy,D/2); face.castShadow=true; face.userData.drawerIdx=i; face.userData.closed=true; cabinetGroup.add(face);
            const knob = new THREE.Mesh(new THREE.SphereGeometry(Math.min(cw,ch)*0.06,8,8), new THREE.MeshStandardMaterial({color:0xbb9955,metalness:0.7,roughness:0.3})); knob.position.set(cx,cy,D/2+0.03); knob.userData.drawerIdx=i; cabinetGroup.add(knob);
            
            if (lockedDrawers && lockedDrawers[i] === 'plank') {
                const pkGeo = new THREE.BoxGeometry(cw*1.1, 0.08, 0.02);
                const pkMat = new THREE.MeshStandardMaterial({color:0x4a301b, roughness:0.9});
                const plank = new THREE.Mesh(pkGeo, pkMat);
                plank.rotation.z = (Math.random()-0.5)*0.2;
                plank.position.set(cx, cy, D/2 + 0.05);
                plank.userData = { drawerIdx: i, isLock: true };
                plank.castShadow = true;
                cabinetGroup.add(plank);
            } else if (lockedDrawers && lockedDrawers[i] === 'padlock') {
                const plGeo = new THREE.BoxGeometry(0.06, 0.08, 0.03);
                const plMat = new THREE.MeshStandardMaterial({color:0xaaaaaa, metalness:0.8, roughness:0.2});
                const padlock = new THREE.Mesh(plGeo, plMat);
                padlock.position.set(cx, cy, D/2 + 0.06);
                padlock.userData = { drawerIdx: i, isLock: true };
                padlock.castShadow = true;
                cabinetGroup.add(padlock);
            }
            
            drawerMeshes.push(face);
        });

        cabinetGroup.userData = { isBSPCabinet: true, drawerMeshes };
        return cabinetGroup;
    },

    // ═══════════════════════════════════════════════════
    // PROPS & INSTANCES
    // ═══════════════════════════════════════════════════
    createProp(type, scale = 1.0) {
        const mesh = new THREE.Group();
        if (type === 'chair') {
            const mat = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.6});
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), mat);
            seat.position.y = 0.5;
            seat.castShadow = true;
            mesh.add(seat);
            // Legs
            for(let i = -1; i <= 1; i+=2) {
                for(let j = -1; j <= 1; j+=2) {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat);
                    leg.position.set(i*0.35, 0.25, j*0.35);
                    leg.castShadow = true;
                    mesh.add(leg);
                }
            }
        }
        mesh.scale.set(scale, scale, scale);
        return mesh;
    },

    // ═══════════════════════════════════════════════════
    // AGENT PROXIES (Logic-less Bodies)
    // ═══════════════════════════════════════════════════
    createBoidProxy(type = 'default') {
        const mesh = new THREE.Group();
        if (type === 'cucco') {
            // White body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.9}));
            body.position.y = 0.25; body.castShadow = true;
            mesh.add(body);
            // Orange beak
            const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), new THREE.MeshStandardMaterial({color: 0xffa500}));
            beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.4, 0.4);
            mesh.add(beak);
            // Red comb
            const comb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), new THREE.MeshStandardMaterial({color: 0xff0000}));
            comb.position.set(0, 0.6, 0.2);
            mesh.add(comb);
        } else {
            // Generic Bird Proxy
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 4), new THREE.MeshStandardMaterial({color: 0x2288ff}));
            body.rotation.x = Math.PI / 2; body.castShadow = true;
            mesh.add(body);
        }
        return mesh;
    },

    createPhantomProxy() {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 2.0, 8);
        geo.translate(0, 1.0, 0); // Origin at feet
        const mat = new THREE.MeshBasicMaterial({color: 0xaa0000, wireframe: true, transparent: true, opacity: 0.8});
        const mesh = new THREE.Mesh(geo, mat);
        // Phantom Eye/Core
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({color: 0xff00ff}));
        eye.position.set(0, 1.5, 0.2);
        mesh.add(eye);
        return mesh;
    },

    createKatamariProxy(radius = 2.0) {
        const geo = new THREE.IcosahedronGeometry(radius, 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            wireframe: true,
            roughness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.isKatamari = true;
        mesh.userData.baseRadius = radius;
        return mesh;
    },

    // ═══════════════════════════════════════════════════
    // ARCHITECTURE / BUILDINGS
    // ═══════════════════════════════════════════════════
    createCorporateSkyscraper(totalFloors = 18, FL_W = 100, FL_H = 12, FL_D = 100) {
        const buildingGroup = new THREE.Group();
        const floorsArray = [];

        const geo = new THREE.BoxGeometry(FL_W, FL_H, FL_D);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            let u = uv.getX(i); let v = uv.getY(i); let faceIdx = Math.floor(i / 4);
            if (faceIdx === 4 || faceIdx===5) u = (u === 1 ? 0.25 : 0.0);       
            else if (faceIdx === 0) u = (u === 1 ? 0.5 : 0.25);  
            else if (faceIdx === 1) u = (u === 1 ? 1.0 : 0.75);  
            uv.setXY(i, u * 2, v);
        }
        
        // Procedural Windows Tex
        const createStripTex = () => {
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 512, 128); 
            ctx.fillStyle = '#050a15';
            for(let i=0; i<8; i++) {
                ctx.fillRect(10 + i*(64), 20, 50, 88); 
                ctx.fillStyle = '#0a1525'; ctx.fillRect(10 + i*(64) + 5, 25, 20, 40); ctx.fillStyle = '#050a15'; 
            }
            const tex = new THREE.CanvasTexture(canvas); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
            return tex;
        };
        const texStrips = createStripTex();
        
        const matRoof = new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.9 });
        const matBodyX = new THREE.MeshBasicMaterial({ color: 0x011b33, wireframe: true, transparent: true, opacity: 0.3 });
        const bottomX = new THREE.MeshBasicMaterial({ color: 0x0044aa, transparent: true, opacity: 0.5 });
        const topX = new THREE.MeshBasicMaterial({ color: 0x002266, transparent: true, opacity: 0.8 });
        const xrayMaterials = [matBodyX, matBodyX, topX, bottomX, matBodyX, matBodyX];

        for(let i=0; i<totalFloors; i++) {
            const paintC = document.createElement('canvas'); paintC.width = 512; paintC.height = 128;
            const paintCtx = paintC.getContext('2d', { willReadFrequently: true }); 
            paintCtx.fillStyle = '#000000'; paintCtx.fillRect(0,0,512,128);
            const paintTex = new THREE.CanvasTexture(paintC);
            paintTex.magFilter = THREE.LinearFilter; paintTex.wrapS = THREE.RepeatWrapping; paintTex.wrapT = THREE.RepeatWrapping;
            
            let fMatBody = new THREE.MeshStandardMaterial({ 
                color: 0x111111, roughness: 0.8, map: texStrips, 
                emissiveMap: paintTex, emissive: 0x00ffff, emissiveIntensity: 1.5,
                transparent: true, opacity: 1.0, depthWrite: true 
            });
            
            let m = (i === totalFloors-1) ? [fMatBody, fMatBody, matRoof, matRoof, fMatBody, fMatBody] : [fMatBody, fMatBody, fMatBody, fMatBody, fMatBody, fMatBody];
            
            const floorGroup = new THREE.Group(); 
            floorGroup.position.set(0, (i * FL_H) + (FL_H/2), 0);
            
            const mesh = new THREE.Mesh(geo, m);
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData = { isFloor: true, floorIndex: i, originalMaterials: m, xrayMaterials: xrayMaterials, slideOut: 0, isOpen: false, openAmount: 0.0 };
            
            floorGroup.add(mesh);

            // Add Fake Light additive blending box
            const glowGeo = new THREE.BoxGeometry(FL_W + 0.1, FL_H + 0.1, FL_D + 0.1);
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, visible: false });
            const glowBox = new THREE.Mesh(glowGeo, glowMat);
            floorGroup.add(glowBox);

            const hitGeo = new THREE.BoxGeometry(FL_W + 0.5, FL_H, FL_D + 0.5);
            const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({visible:false}));
            hitMesh.userData = mesh.userData; 
            
            buildingGroup.add(floorGroup); 
            buildingGroup.add(hitMesh);
            hitMesh.position.set(0, (i * FL_H) + (FL_H/2), 0);

            floorsArray.push({ visual: mesh, hit: hitMesh, group: floorGroup, glow: glowBox, matProg: fMatBody, paintData: { ctx: paintCtx, tex: paintTex } });
        }

        const ringGeo = new THREE.TorusGeometry(FL_W*0.4, 0.2, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x1e88e5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, (totalFloors * FL_H) + 0.2, 0); ring.rotation.x = -Math.PI/2;
        buildingGroup.add(ring);

        // Calculate a strict bound limit for WorldBuilder props positioning
        buildingGroup.userData.roofY = totalFloors * FL_H;
        return { mesh: buildingGroup, floors: floorsArray };
    }
};
