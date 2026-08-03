import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class CabinetEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene) {
        super(scene, null);
        this.cabinetGroup = null;
        this.floorItemsGroup = new THREE.Group();
        this.scene.add(this.floorItemsGroup);
        this.drawerMeshes = [];
        this.ceilingBulb = null;
        this.active3DModels = [];
        
        this.cabinetAspect = 0.7;
        this.cabinetScale = 1.0;
        this.isDarkMode = false;
        
        // Caches
        this.rabbitModel = null;
        this.snakeModel = null;
        this.seekerModel = null;
        this.ghostModel = null;
        
        this.flashlightTemplate = null;
    }
    
    // Call during THREE init
    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Orden: sala → linternas → archivador.
     *
     * `partition` NO es una lista: es el árbol BSP que reparte el frontal, con
     * forma { planks:[{x,y,w,h}], leaves:[{x,y,w,h}] } en coordenadas 0..1. Lo
     * genera el juego. Sin él montamos una rejilla 2x3 para tener algo que ver.
     */
    buildAll(c = {}) {
        this.buildRoom(c.darkMode ?? true);
        this.setupFlashlights();
        this.build3DCabinet(c.partition ?? CabinetEnvironmentFactory.gridPartition(2, 3), c.lockedDrawers ?? []);
        return { room: this.room ?? null, cabinet: this.cabinetGroup ?? null };
    }

    /**
     * Partición de reserva: rejilla regular de cols x rows cajones.
     * Sirve para demos y pruebas; el juego real usa su BSP.
     * @returns {{planks: Array, leaves: Array}}
     */
    static gridPartition(cols = 2, rows = 3) {
        const leaves = [];
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                leaves.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
        return { planks: [], leaves };
    }

    buildRoom(isDarkMode) {
        this.isDarkMode = isDarkMode;
        const rG = new THREE.Group();
        const wM = new THREE.MeshStandardMaterial({color: isDarkMode ? 0x1a1520 : 0x2a2540, roughness: 0.9});
        const fM = new THREE.MeshStandardMaterial({color: isDarkMode ? 0x0f0d12 : 0x1a1828, roughness: 0.95});
        
        const f = new THREE.Mesh(new THREE.PlaneGeometry(8,8), fM); 
        f.rotation.x = -Math.PI/2; 
        f.receiveShadow = true; 
        rG.add(f);
        
        const c = new THREE.Mesh(new THREE.PlaneGeometry(8,8), new THREE.MeshStandardMaterial({color:0x0a0810,roughness:0.9})); 
        c.rotation.x = Math.PI/2; 
        c.position.y = 3.5; 
        rG.add(c);
        
        const bW = new THREE.Mesh(new THREE.PlaneGeometry(8,3.5), wM); 
        bW.position.set(0,1.75,-4); 
        rG.add(bW);
        
        const lW = new THREE.Mesh(new THREE.PlaneGeometry(8,3.5), wM); 
        lW.rotation.y = Math.PI/2; 
        lW.position.set(-4,1.75,0); 
        rG.add(lW);
        
        const rW = new THREE.Mesh(new THREE.PlaneGeometry(8,3.5), wM); 
        rW.rotation.y = -Math.PI/2; 
        rW.position.set(4,1.75,0); 
        rG.add(rW);
        
        this.scene.add(rG);
        
        this.ceilingBulb = new THREE.PointLight(0xffffee, 2.0, 20);
        this.ceilingBulb.position.set(0, 5.5, -1);
        this.ceilingBulb.castShadow = true;
        this.scene.add(this.ceilingBulb);
    }
    
    build3DCabinet(partition, lockedDrawers) {
        if (this.cabinetGroup) this.scene.remove(this.cabinetGroup);
        this.drawerMeshes = [];
        if (!partition) return;
        // Antes solo se comprobaba que `partition` existiera, así que cualquier
        // objeto con la forma equivocada petaba diez líneas más abajo con un
        // "reading 'forEach'" que no decía nada. Mejor fallar aquí y explicarlo.
        if (!Array.isArray(partition.planks) || !Array.isArray(partition.leaves)) {
            console.error('[CabinetEnvironmentFactory] build3DCabinet espera { planks:[], leaves:[] }; ' +
                          'recibido:', partition, '— usa CabinetEnvironmentFactory.gridPartition() si solo quieres una rejilla.');
            return;
        }
        
        this.cabinetGroup = new THREE.Group();
        const W = 3.0 * this.cabinetAspect * this.cabinetScale;
        const H = 2.8 * this.cabinetScale;
        const D = 0.6;
        
        const fMat = new THREE.MeshStandardMaterial({color:0x5c3a1a, roughness:0.6, metalness:0.2});
        
        const back = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,H+0.06,0.03), new THREE.MeshStandardMaterial({color:0x3a2510,roughness:0.8}));
        back.position.set(0,H/2,-D/2-0.015); back.receiveShadow=true; this.cabinetGroup.add(back);
        
        const topB = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,0.03,D), fMat); 
        topB.position.set(0,H+0.015,0); topB.castShadow=true; this.cabinetGroup.add(topB);
        
        const botB = new THREE.Mesh(new THREE.BoxGeometry(W+0.06,0.03,D), fMat); 
        botB.position.set(0,-0.015,0); this.cabinetGroup.add(botB);
        
        const sL = new THREE.Mesh(new THREE.BoxGeometry(0.03,H,D), fMat); 
        sL.position.set(-W/2-0.015,H/2,0); sL.castShadow=true; this.cabinetGroup.add(sL);
        
        const sR = new THREE.Mesh(new THREE.BoxGeometry(0.03,H,D), fMat); 
        sR.position.set(W/2+0.015,H/2,0); sR.castShadow=true; this.cabinetGroup.add(sR);
        
        const pMat = new THREE.MeshStandardMaterial({color:0x7a5530,roughness:0.5,metalness:0.15});
        partition.planks.forEach(p => { 
            const plank = new THREE.Mesh(new THREE.BoxGeometry(Math.max(p.w*W,0.02),Math.max(p.h*H,0.02),D*0.95), pMat); 
            plank.position.set((p.x+p.w/2-0.5)*W,(1-p.y-p.h/2)*H,0); plank.castShadow=true; this.cabinetGroup.add(plank); 
        });
        
        const dMat = new THREE.MeshStandardMaterial({color:0x3d2815, roughness:0.7, metalness:0.1});
        partition.leaves.forEach((l,i) => {
            const cx=(l.x+l.w/2-0.5)*W, cy=(1-l.y-l.h/2)*H, cw=l.w*W*0.92, ch=l.h*H*0.92;
            const face = new THREE.Mesh(new THREE.BoxGeometry(cw,ch,0.04), dMat.clone()); 
            face.position.set(cx,cy,D/2); face.castShadow=true; face.userData.drawerIdx=i; face.userData.closed=true; this.cabinetGroup.add(face);
            
            const knob = new THREE.Mesh(new THREE.SphereGeometry(Math.min(cw,ch)*0.06,8,8), new THREE.MeshStandardMaterial({color:0xbb9955,metalness:0.7,roughness:0.3})); 
            knob.position.set(cx,cy,D/2+0.03); knob.userData.drawerIdx=i; this.cabinetGroup.add(knob);
            
            if (lockedDrawers[i] === 'plank') {
                const pkGeo = new THREE.BoxGeometry(cw*1.1, 0.08, 0.02);
                const pkMat = new THREE.MeshStandardMaterial({color:0x4a301b, roughness:0.9});
                const plank = new THREE.Mesh(pkGeo, pkMat);
                plank.rotation.z = (Math.random()-0.5)*0.2;
                plank.position.set(cx, cy, D/2 + 0.05);
                plank.userData = { drawerIdx: i, isLock: true };
                plank.castShadow = true;
                this.cabinetGroup.add(plank);
            } else if (lockedDrawers[i] === 'padlock') {
                const plGeo = new THREE.BoxGeometry(0.06, 0.08, 0.03);
                const plMat = new THREE.MeshStandardMaterial({color:0xaaaaaa, metalness:0.8, roughness:0.2});
                const padlock = new THREE.Mesh(plGeo, plMat);
                padlock.position.set(cx, cy, D/2 + 0.06);
                padlock.userData = { drawerIdx: i, isLock: true };
                padlock.castShadow = true;
                this.cabinetGroup.add(padlock);
            }
            
            this.drawerMeshes.push(face);
        });
        
        this.cabinetGroup.position.set(0, 0.01, -3.2);
        this.scene.add(this.cabinetGroup);
    }
    
    openDrawer3D(idx) {
        if (idx < 0 || idx >= this.drawerMeshes.length) return;
        const f = this.drawerMeshes[idx]; 
        if (!f.userData.closed) return;
        
        f.userData.closed = false; 
        f.position.z += 0.35; 
        f.material.color.setHex(0x1a0f08); 
        f.material.opacity = 0.5; 
        f.material.transparent = true;
        
        if (this.cabinetGroup) {
            const locks = this.cabinetGroup.children.filter(c => c.userData.isLock && c.userData.drawerIdx === idx);
            locks.forEach(l => { this.cabinetGroup.remove(l); });
        }
    }
    
    populateFloorItems(currentStage, n, padlockKeyLocId) {
        while(this.floorItemsGroup.children.length > 0) {
            this.floorItemsGroup.remove(this.floorItemsGroup.children[0]);
        }
        
        let floorItemsArray = [];
        let floorIdCounter = n;
        
        if (this.flashlightTemplate) {
            const fl = this.flashlightTemplate.clone();
            fl.position.set((Math.random()-0.5)*3, 0.05, Math.random()*2 - 1);
            fl.rotation.y = Math.random()*Math.PI*2;
            const fid = floorIdCounter++;
            fl.traverse(c => { if(c.isMesh) { c.castShadow=true; c.receiveShadow=true; c.userData={isFloorItem:true, iType:'flashlight', drawerIdx: fid}; } });
            this.floorItemsGroup.add(fl); 
            floorItemsArray.push({mesh:fl, type:'flashlight', id: fid});
        }
        
        const numBat = currentStage === 1 ? 2 : (currentStage === 2 ? 3 : 4);
        const bGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12);
        const bMat = new THREE.MeshStandardMaterial({color: 0x34c759, emissive: 0x118822, emissiveIntensity: 0.5});
        
        for (let i=0; i<numBat; i++) {
            const bat = new THREE.Mesh(bGeo, bMat); bat.castShadow = true; bat.receiveShadow = true;
            bat.position.set((Math.random()-0.5)*4, 0.05, Math.random()*3 - 1);
            bat.rotation.x = Math.PI/2; bat.rotation.z = Math.random()*Math.PI;
            const fid = floorIdCounter++;
            bat.userData = {isFloorItem:true, iType:'battery', drawerIdx: fid};
            this.floorItemsGroup.add(bat); 
            floorItemsArray.push({mesh:bat, type:'battery', id: fid});
        }
        
        const numBoxes = currentStage >= 2 ? 2 : 0;
        const boxGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const boxMat = new THREE.MeshStandardMaterial({color: 0x8b5a2b, roughness: 0.9});
        
        for (let i=0; i<numBoxes; i++) {
            const box = new THREE.Mesh(boxGeo, boxMat); box.castShadow = true; box.receiveShadow = true;
            box.position.set((Math.random()-0.5)*5, 0.15, (Math.random()-0.5)*3 + 1);
            const fid = floorIdCounter++;
            let contents = 'empty';
            if (i === 0) contents = 'battery_from_box';
            if (i === 1 && padlockKeyLocId === 'box') contents = 'key';
            box.userData = {isFloorItem:true, iType:'box', drawerIdx: fid, contents: contents};
            this.floorItemsGroup.add(box); 
            floorItemsArray.push({mesh:box, type:'box', id: fid, contents: contents});
        }
        
        return floorItemsArray;
    }

    show3DModel(type, leaf, done, found) {
        if (!this.scene) return; 
        const model = type==='rabbit' ? this.rabbitModel : this.snakeModel; 
        if (!model) return;
        
        const inst = model.clone(); inst.visible = true;
        const W = 3.0 * this.cabinetAspect * this.cabinetScale;
        const H = 2.8 * this.cabinetScale;
        inst.position.set((leaf.x+leaf.w/2-0.5)*W, (1-leaf.y-leaf.h/2)*H-0.1, -3.2+0.5);
        inst.rotation.y = Math.random()*Math.PI*2; 
        
        this.scene.add(inst);
        this.active3DModels.push({mesh:inst, type, spawnTime:performance.now(), done, found});
    }

    showBattery3D(leaf) {
        if (!this.scene) return;
        const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12);
        const mat = new THREE.MeshStandardMaterial({color: 0x34c759, emissive: 0x118822, emissiveIntensity: 1.0, metalness: 0.8, roughness: 0.2});
        const inst = new THREE.Mesh(geo, mat);
        const W = 3.0 * this.cabinetAspect * this.cabinetScale;
        const H = 2.8 * this.cabinetScale;
        inst.position.set((leaf.x+leaf.w/2-0.5)*W, (1-leaf.y-leaf.h/2)*H-0.05, -3.2+0.1);
        inst.rotation.x = Math.PI/2;
        const glow = new THREE.PointLight(0x34c759, 1.0, 1.5); 
        inst.add(glow);
        this.scene.add(inst);
        this.active3DModels.push({mesh:inst, type:'battery', spawnTime:performance.now()});
    }

    hide3DModels() { 
        for (const m of this.active3DModels) { 
            if(this.scene) this.scene.remove(m.mesh); 
        } 
        this.active3DModels = []; 
    }

    createVolumetricTexture() {
        const c = document.createElement('canvas'); c.width = 16; c.height = 256;
        const cx = c.getContext('2d'); const g = cx.createLinearGradient(0,0,0,256);
        g.addColorStop(0,'rgba(255,255,255,0.60)'); g.addColorStop(0.5,'rgba(255,255,255,0.12)'); g.addColorStop(1,'rgba(255,255,255,0)');
        cx.fillStyle = g; cx.fillRect(0,0,16,256); return new THREE.CanvasTexture(c);
    }
    
    setupFlashlights() {
        const flashLight = new THREE.SpotLight(0xffeedd, 1.5, 20, Math.PI/8, 0.5, 1.2);
        flashLight.castShadow=true; flashLight.shadow.mapSize.set(1024,1024); flashLight.position.set(0,1.6,-0.3);
        
        const tgt = new THREE.Object3D(); tgt.position.set(0,1.0,-8); flashLight.target=tgt; 
        this.scene.add(flashLight); this.scene.add(tgt);
        
        const bGeo = new THREE.ConeGeometry(2,10,32,1,true); bGeo.translate(0,-5,0); bGeo.rotateX(Math.PI/2);
        const volumetricBeam = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({map:this.createVolumetricTexture(), blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, side:THREE.DoubleSide}));
        volumetricBeam.position.set(0,1.6,-0.3);
        
        const dGeo = new THREE.BufferGeometry(); const dC = 60; const dP = new Float32Array(dC*3);
        for(let i=0;i<dC;i++){dP[i*3]=(Math.random()-0.5)*2;dP[i*3+1]=(Math.random()-0.5)*1.5;dP[i*3+2]=-Math.random()*8-1;}
        dGeo.setAttribute('position',new THREE.BufferAttribute(dP,3));
        const flashDust = new THREE.Points(dGeo,new THREE.PointsMaterial({color:0xffffee,size:0.03,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false}));
        flashDust.position.set(0,1.6,-0.3);
        flashDust.userData.velocities=new Float32Array(dC*3);
        for(let i=0;i<dC;i++){flashDust.userData.velocities[i*3]=(Math.random()-0.5)*0.15;flashDust.userData.velocities[i*3+1]=Math.random()*0.15+0.05;flashDust.userData.velocities[i*3+2]=-(Math.random()*0.3+0.1);}
        
        return { flashLight, volumetricBeam, flashDust };
    }

    updateActiveModels(dt, now) {
        const t = now * 0.001;
        for (const m of this.active3DModels) {
            if (!('baseY' in m)) m.baseY = m.mesh.position.y;
            m.mesh.rotation.y += dt * (m.type === 'rabbit' && m.done && m.found ? 8.0 : 1.5); 
            const age = (now - m.spawnTime) * 0.001;
            let bounce = 0;
            if (m.type === 'rabbit' && m.done && m.found) {
                bounce = Math.abs(Math.sin(age * 6)) * 0.5; // Victory hops
            } else {
                bounce = Math.sin(t * 2 + age) * 0.04;
            }
            m.mesh.position.y = m.baseY + bounce;
            
            const sT = Math.min(age/0.4, 1);
            const sc = m.type === 'rabbit' ? 0.15 : 0.3;
            m.mesh.scale.setScalar(sc * Math.max(0.01, sT<1 ? (1-Math.pow(1-sT,3))*1.2-0.2*Math.sin(sT*Math.PI) : 1));
        }
    }
}
