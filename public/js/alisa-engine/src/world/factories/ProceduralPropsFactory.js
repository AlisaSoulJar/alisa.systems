import * as THREE from 'three';
import { BspPropSystem } from '../BspPropSystem.js';
import { NeonSignFactory } from './NeonSignFactory.js';

/**
 * ProceduralPropsFactory
 * Generates modular, Tier-based furniture and props.
 * Centralizes all procedural geometry generation that isn't tied to the macro-building.
 */
export class ProceduralPropsFactory {
    
    /**
     * Builds a BSP Shelf based on BspPropSystem definitions.
     */
    static createBspShelf(w, h, d, cuts, seed, materialOpts = { color: 0x4a3a2a, roughness: 0.9 }) {
        const shelfGroup = new THREE.Group();
        const parts = BspPropSystem.generateBspShelf(w, h, d, cuts, seed);
        const mat = new THREE.MeshStandardMaterial(materialOpts);
        
        parts.forEach(p => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]), mat);
            mesh.position.set(...p.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.partType = p.partType;
            shelfGroup.add(mesh);
        });
        
        return shelfGroup;
    }

    /**
     * Builds a Grid Storage (e.g. Lockers).
     */
    static createGridStorage(w, h, d, cols, rows, materialOpts = { color: 0x223344, roughness: 0.7, metalness: 0.4 }) {
        const group = new THREE.Group();
        const parts = BspPropSystem.generateGridStorage(w, h, d, cols, rows);
        const mat = new THREE.MeshStandardMaterial(materialOpts);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6, metalness: 0.5 });
        
        parts.forEach(p => {
            const isDoor = p.partType === 'door_front';
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]), 
                isDoor ? doorMat : mat
            );
            mesh.position.set(...p.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { ...p };
            group.add(mesh);
        });
        
        return group;
    }

    /**
     * Generates a procedural office desk.
     */
    static createDesk() {
        const deskGroup = new THREE.Group();
        
        // Desktop surface
        const deskGeo = new THREE.BoxGeometry(1.5, 0.06, 0.8);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50, roughness: 0.4, metalness: 0.3
        });
        const deskTop = new THREE.Mesh(deskGeo, deskMat);
        deskTop.position.set(0, 0.79, 0);
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskGroup.add(deskTop);

        // Desk legs
        const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.78);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1a252f, metalness: 0.6 });
        const offsets = [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]];
        
        offsets.forEach(([ox, oz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(ox, 0.39, oz);
            leg.castShadow = true;
            leg.receiveShadow = true;
            deskGroup.add(leg);
        });

        return deskGroup;
    }

    /**
     * Generates a pedestal TV Stand.
     */
    static createTVStand(height) {
        const standGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5, roughness: 0.3 });
        
        // Main stem
        const stemGeo = new THREE.CylinderGeometry(0.06, 0.1, height, 8);
        const stem = new THREE.Mesh(stemGeo, mat);
        stem.position.set(0, height / 2, 0);
        stem.castShadow = true;
        stem.receiveShadow = true;
        standGroup.add(stem);
        
        // Base plate
        const baseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.set(0, 0.015, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        standGroup.add(base);

        return standGroup;
    }

    /**
     * Generates an office chair.
     */
    static createChair() {
        const chairGroup = new THREE.Group();
        
        // Seat
        const seatGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.y = 0.48;
        seat.castShadow = true;
        seat.receiveShadow = true;
        chairGroup.add(seat);
        
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.28;
        stem.castShadow = true;
        stem.receiveShadow = true;
        chairGroup.add(stem);
        
        // Base star
        const baseGeo = new THREE.TorusGeometry(0.15, 0.015, 6, 5);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = Math.PI / 2;
        base.position.y = 0.08;
        base.castShadow = true;
        base.receiveShadow = true;
        chairGroup.add(base);

        return chairGroup;
    }

    /**
     * Generates a procedural streetlight with a fake light pool decal.
     * Returns { mesh: THREE.Group, flickerMat: THREE.Material }
     */
    static createStreetlight(px, py, pz, matLightPool) {
        const group = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 4);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.5 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, py + 2, pz);
        
        const bulbGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: new THREE.Color(0xffaa44), // Warm tungsten
            emissiveIntensity: 3.5
        });
        bulbMat.userData = { flickerSeed: Math.random() * 100, flickerSpeed: 0.1 + Math.random() * 0.2 };
        
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(px + 0.3, py + 4.1, pz); // Hang slightly over road
        
        // Add Fake Light Pool (Decal)
        if (matLightPool) {
            const poolGeo = new THREE.PlaneGeometry(12, 12);
            const pool = new THREE.Mesh(poolGeo, matLightPool);
            pool.rotation.x = -Math.PI / 2; // Flat on ground
            pool.position.set(px + 1.0, py + 0.05, pz); // Shifted exactly under the bulb
            group.add(pool);
        }
        
        group.add(pole);
        group.add(bulb);
        
        return { mesh: group, flickerMat: bulbMat };
    }

    /**
     * Generates a procedural dumpster.
     */
    static createDumpster(px, py, pz, rotY = 0) {
        const geo = new THREE.BoxGeometry(2.0, 1.5, 1.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x112211, roughness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), NeonSignFactory.createNeonLineMat(0x335533));
        mesh.add(edges);
        
        mesh.position.set(px, py + 0.75, pz);
        mesh.rotation.y = rotY;
        return mesh;
    }

    /**
     * Generates a procedural vapor sprite.
     * Returns { mesh: THREE.Sprite, vaporMat: THREE.Material }
     */
    static createVapor(px, py, pz, texVapor) {
        const mat = new THREE.SpriteMaterial({
            map: texVapor, 
            color: 0xffffff, 
            transparent: true, 
            blending: THREE.AdditiveBlending, 
            depthWrite: false,
            opacity: 0.5
        });
        
        mat.userData = { isVapor: true, vaporSeed: Math.random() * Math.PI * 2, vaporSpeed: 0.05 + Math.random() * 0.05 };
        
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3, 8, 1);
        sprite.position.set(px, py + 2.0, pz);
        
        return { mesh: sprite, vaporMat: mat };
    }
}
