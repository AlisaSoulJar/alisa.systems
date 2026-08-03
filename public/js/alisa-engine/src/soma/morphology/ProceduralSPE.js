import * as THREE from 'three';
import { mulberry32 } from '../../world/core/DeterministicScope.js';

/**
 * Standard Procedural Entity (SPE)
 * Merges rigid ML grid bounds with organic visual variance.
 */
export class AlisaEntity {
    constructor(config) {
        this.type = config.type; 
        this.tier = config.tier; 
        this.variance = config.variance || 1.0; 
        this.seed = config.seed || Math.random();
        
        // Identify Identity colors for BSP
        if(this.type === 'building') this.identity = { top: 0x555555, mid: 0x777777, bot: 0x333333 };
        else if(this.type === 'avatar') this.identity = { top: 0xffccaa, mid: 0x0088ff, bot: 0x002288 };
        else this.identity = { top: 0x992222, mid: 0x661111, bot: 0x330000 };

        this.physicsBox = this.getTierBounds(this.tier);
    }
    
    getTierBounds(tier) {
        const sizes = {
            2: {w: 1,   h: 1,   d: 1},   // Item / Dog
            4: {w: 2,   h: 4,   d: 2},   // Humanoid
            7: {w: 20,  h: 40,  d: 20},  // Mid Building
        };
        return sizes[tier] || {w:1, h:1, d:1};
    }

    /**
     * Pseudorandom based on seed logic.
     *
     * Antes usaba `Math.sin(this.seed++) * 10000`. Semillado sí, pero `Math.sin`
     * es de las pocas operaciones que IEEE-754 NO fija bit a bit, así que la
     * misma semilla podía dar morfologías distintas en otra máquina.
     * mulberry32 usa solo enteros de 32 bits: idéntico en todas partes.
     */
    random() {
        if (!this._rng) this._rng = mulberry32(this.seed ?? 42);
        return this._rng();
    }
    
    generateVisualModel() {
        const group = new THREE.Group();
        
        // 1. Rigid ML Hitbox (Visualized as Green wireframe)
        const hitGeo = new THREE.BoxGeometry(this.physicsBox.w, this.physicsBox.h, this.physicsBox.d);
        const hitMat = new THREE.LineBasicMaterial({color: 0x00ff00, transparent:true, opacity:0.8, depthWrite: false});
        const hitBox = new THREE.LineSegments(new THREE.EdgesGeometry(hitGeo), hitMat);
        hitBox.position.y = this.physicsBox.h / 2;
        group.add(hitBox);
        
        // 2. Visual Organic Model
        const visual = new THREE.Group();
        
        if (this.type === "building") {
            const w1 = this.physicsBox.w * this.variance * 0.9;
            const h1 = this.physicsBox.h * this.variance * 0.7; // main block
            const d1 = this.physicsBox.d * this.variance * 0.9;
            
            const bMat = new THREE.MeshStandardMaterial({color: 0xdddddd, roughness: 1, metalness: 0});
            const b1 = new THREE.Mesh(new THREE.BoxGeometry(w1, h1, d1), bMat);
            b1.position.y = h1/2;
            visual.add(b1);
            
            // Random tower on top
            if(this.random() > 0.3) {
                const h2 = this.physicsBox.h * this.variance * 0.3;
                const b2 = new THREE.Mesh(new THREE.BoxGeometry(w1*0.6, h2, d1*0.6), bMat);
                b2.position.y = h1 + (h2/2);
                visual.add(b2);
            }
        } 
        else if (this.type === "avatar") {
            // Body slightly thinner than full bounding box
            const bw = this.physicsBox.w * 0.4 * this.variance;
            const bh = this.physicsBox.h * 0.9 * this.variance;
            const bd = this.physicsBox.d * 0.4 * this.variance;
            
            const bMat = new THREE.MeshLambertMaterial({color: 0x0088ff});
            const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
            body.position.y = bh/2;
            visual.add(body);
        }
        else if (this.type === "item") { // RADIO
            const iSize = this.physicsBox.w * 0.6 * this.variance;
            const bMat = new THREE.MeshLambertMaterial({color: 0xaa3333});
            const item = new THREE.Mesh(new THREE.BoxGeometry(iSize, iSize*0.8, iSize*0.5), bMat);
            item.position.y = (iSize*0.8)/2;
            visual.add(item);
        }
        
        group.add(visual);
        return { root: group, visual: visual };
    }
}

export class SPEFactory {
    constructor() {
        this.instGeo = new THREE.BoxGeometry(1, 1, 1);
        this.vMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }

    subdivideVoxels(voxels, maxBounds) {
        const newVoxels = [];
        voxels.forEach(v => {
            const hx = v.sx / 2; const hy = v.sy / 2; const hz = v.sz / 2;
            for(let dx=-1; dx<=1; dx+=2) {
                for(let dy=-1; dy<=1; dy+=2) {
                    for(let dz=-1; dz<=1; dz+=2) {
                        const cx = v.cx + dx * (hx/2);
                        const cy = v.cy + dy * (hy/2);
                        const cz = v.cz + dz * (hz/2);
                        
                        // Simple Culling heuristics based on physics Box bounds
                        const distXZ = Math.sqrt(cx*cx + cz*cz);
                        if(distXZ < Math.max(maxBounds.w, maxBounds.d) * 0.6) {
                            newVoxels.push({ cx, cy, cz, sx:hx, sy:hy, sz:hz });
                        }
                    }
                }
            }
        });
        return newVoxels;
    }

    generateStaticMeshCloud(voxels, bounds, identity) {
        const cloud = new THREE.InstancedMesh(this.instGeo, this.vMat, voxels.length);
        const dummy = new THREE.Object3D();
        const tempColor = new THREE.Color();
        voxels.forEach((v, idx) => {
            dummy.position.set(v.cx, v.cy, v.cz);
            dummy.scale.set(v.sx * 0.95, v.sy * 0.95, v.sz * 0.95);
            dummy.updateMatrix();
            cloud.setMatrixAt(idx, dummy.matrix);
            
            const heightRatio = v.cy / bounds.h;
            if (heightRatio > 0.75) tempColor.setHex(identity.top); 
            else if (heightRatio > 0.4) tempColor.setHex(identity.mid); 
            else tempColor.setHex(identity.bot); 
            cloud.setColorAt(idx, tempColor);
        });
        return cloud;
    }
}
