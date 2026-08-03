import * as THREE from 'three';
import { BaseEnvironmentFactory } from './BaseEnvironmentFactory.js';

export class PygmalionEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene, engine) {
        super(scene, engine);
        this.BELT_LENGTH = 80;
        this.rollers = [];
        this.beaconLeft = null;
        this.beaconRight = null;
        this.dust = null;
    }

    setupLighting() {
        this.applyLightingPreset({
            ambient: { color: 0x2a3c52, intensity: 1.5 },
            hemi: { skyColor: 0x334466, groundColor: 0x112211, intensity: 0.8 },
            fills: [
                { color: 0xff8844, intensity: 0.8, range: 40, position: [0, 8, -12] },
                { color: 0x2266aa, intensity: 0.8, range: 20, position: [-10, 5, 0] },
                { color: 0x2266aa, intensity: 0.8, range: 20, position: [10, 5, 0] },
                { color: 0x00ff66, intensity: 0.4, range: 20, position: [-2, 2, -10] },
                { color: 0x00ff66, intensity: 0.4, range: 20, position: [2, 2, -10] },
                { color: 0x00ff66, intensity: 0.4, range: 20, position: [-2, 2, 10] },
                { color: 0x00ff66, intensity: 0.4, range: 20, position: [2, 2, 10] }
            ],
            spots: [
                { color: 0x00ccff, intensity: 1.0, range: 25, angle: Math.PI/5, penumbra: 0.5, position: [3, 12, 0], target: [0, 0, 0] },
                { color: 0x00ccff, intensity: 1.0, range: 25, angle: Math.PI/5, penumbra: 0.5, position: [0, 12, 3], target: [0, 0, 0] },
                { color: 0x00ccff, intensity: 1.0, range: 25, angle: Math.PI/5, penumbra: 0.5, position: [-3, 12, 0], target: [0, 0, 0] },
                { color: 0x00ccff, intensity: 1.0, range: 25, angle: Math.PI/5, penumbra: 0.5, position: [0, 12, -3], target: [0, 0, 0] },
                { color: 0x00ff88, intensity: 0, range: 15, angle: Math.PI/5, penumbra: 0.4, position: [0, 8, 0], target: [0, 0.5, 0], castShadow: true }
            ]
        });
    }

    setupRoom() {
        this.createFloor();

        const hazardMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.15 });
        for (let side of [-1, 1]) {
            for (let i = -3; i <= 3; i++) {
                const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), hazardMat);
                stripe.rotation.x = -Math.PI / 2;
                stripe.rotation.z = Math.PI / 4;
                stripe.position.set(side * 3.5, 0.02, i * 1.5);
                this.scene.add(stripe);
            }
        }
    }

    setupHangar() {
        const hangarGroup = new THREE.Group();
        this.scene.add(hangarGroup);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x05050a, metalness: 0.1, roughness: 0.95 });
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.3, roughness: 0.8 });

        const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(100, 20), wallMat);
        wallLeft.rotation.y = Math.PI / 2;
        wallLeft.position.set(-20, 10, 0);
        hangarGroup.add(wallLeft);

        const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(100, 20), wallMat);
        wallRight.rotation.y = -Math.PI / 2;
        wallRight.position.set(20, 10, 0);
        hangarGroup.add(wallRight);

        const ceilingPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 100), ceilingMat);
        ceilingPlane.rotation.x = Math.PI / 2;
        ceilingPlane.position.set(0, 18, 0);
        hangarGroup.add(ceilingPlane);

        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
        backWall.position.set(0, 10, -40);
        hangarGroup.add(backWall);

        const portalRim = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 5.5, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.2 })
        );
        portalRim.position.set(0, 2.5, -39.5);
        hangarGroup.add(portalRim);

        const portalGlow = new THREE.Mesh(
            new THREE.BoxGeometry(4.8, 5, 2.6),
            new THREE.MeshBasicMaterial({ color: 0x00ffcc })
        );
        portalGlow.position.set(0, 2.3, -39.5);
        hangarGroup.add(portalGlow);

        const tubeGeo = new THREE.CylinderGeometry(1.5, 1.5, 8, 32, 1, true);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide });
        const ceilingTube = new THREE.Mesh(tubeGeo, tubeMat);
        ceilingTube.position.set(0, 13, 35);
        this.scene.add(ceilingTube);

        const tubeLight = new THREE.PointLight(0x44ffaa, 2, 12);
        tubeLight.position.set(0, 15, 35);
        this.scene.add(tubeLight);

        const rimGeo = new THREE.TorusGeometry(1.5, 0.12, 12, 48);
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const rimBottom = new THREE.Mesh(rimGeo, rimMat);
        rimBottom.rotation.x = Math.PI / 2;
        rimBottom.position.set(0, 9.01, 35);
        this.scene.add(rimBottom);

        const rimTop = rimBottom.clone();
        rimTop.position.set(0, 17.0, 35);
        this.scene.add(rimTop);

        this.beaconLeft = new THREE.PointLight(0xff4400, 0, 6);
        this.beaconLeft.position.set(-5.5, 2.5, -20);
        this.scene.add(this.beaconLeft);
        this.beaconRight = new THREE.PointLight(0xff4400, 0, 6);
        this.beaconRight.position.set(5.5, 2.5, -20);
        this.scene.add(this.beaconRight);
    }

    setupBelt() {
        const beltGroup = new THREE.Group();

        const beltGeo = new THREE.BoxGeometry(4, 0.3, this.BELT_LENGTH);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.85, metalness: 0.15 });
        const beltMesh = new THREE.Mesh(beltGeo, beltMat);
        beltMesh.position.y = 0.15;
        beltMesh.receiveShadow = true;
        beltGroup.add(beltMesh);

        for(let side of [-1, 1]) {
            const railGeo = new THREE.BoxGeometry(0.15, 0.6, this.BELT_LENGTH);
            const railMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.2 });
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(side * 2.1, 0.3, 0);
            beltGroup.add(rail);
        }

        for(let i = -this.BELT_LENGTH/2 + 1; i <= this.BELT_LENGTH/2 - 1; i += 1.8) {
            const rGeo = new THREE.CylinderGeometry(0.35, 0.35, 4.0, 16);
            const rMat = new THREE.MeshStandardMaterial({ color: 0x3a3a50, metalness: 0.85, roughness: 0.15 });
            const roller = new THREE.Mesh(rGeo, rMat);
            roller.rotation.z = Math.PI / 2;
            roller.position.set(0, 0.36, i);
            beltGroup.add(roller);
            this.rollers.push(roller);
        }
        this.scene.add(beltGroup);
    }

    setupTunnel() {
        const tunnelGroup = new THREE.Group();
        const TUNNEL_Z = -this.BELT_LENGTH / 2 + 1;
        tunnelGroup.position.set(0, 0, TUNNEL_Z);

        const tunnelWallMat = new THREE.MeshStandardMaterial({ color: 0x0f0f18, metalness: 0.7, roughness: 0.4 });
        const panelL = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 0.8), tunnelWallMat);
        panelL.position.set(-4.5, 4, 0);
        tunnelGroup.add(panelL);
        const panelR = panelL.clone();
        panelR.position.set(4.5, 4, 0);
        tunnelGroup.add(panelR);
        const panelTop = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.8), tunnelWallMat);
        panelTop.position.set(0, 7, 0);
        tunnelGroup.add(panelTop);

        const tunnelInner = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 4.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x050508, metalness: 0.3, roughness: 0.9, side: THREE.BackSide })
        );
        tunnelInner.position.set(0, 2.5, -3);
        tunnelGroup.add(tunnelInner);

        const frameMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00aa88, emissiveIntensity: 1.5 });
        const rBottom = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 0.4), frameMat);
        rBottom.position.set(0, 0.3, 0);
        tunnelGroup.add(rBottom);
        const rTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 0.4), frameMat);
        rTop.position.set(0, 4.9, 0);
        tunnelGroup.add(rTop);
        const rLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.75, 0.4), frameMat);
        rLeft.position.set(-2.3, 2.6, 0);
        tunnelGroup.add(rLeft);
        const rRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.75, 0.4), frameMat);
        rRight.position.set(2.3, 2.6, 0);
        tunnelGroup.add(rRight);

        const tunnelGlow = new THREE.PointLight(0xff6622, 1.5, 15);
        tunnelGlow.position.set(0, 3, -4);
        tunnelGroup.add(tunnelGlow);

        const chevronMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 });
        for (let i = -1; i <= 1; i++) {
            const chev = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), chevronMat);
            chev.position.set(i * 1.2, 5.2, 0.01);
            chev.rotation.z = Math.PI / 4;
            tunnelGroup.add(chev);
        }

        const labelSpot = new THREE.SpotLight(0x00ffcc, 2, 10, Math.PI / 4, 0.8, 1);
        labelSpot.position.set(0, 5.5, 1);
        labelSpot.target.position.set(0, 4.5, -1);
        tunnelGroup.add(labelSpot);
        tunnelGroup.add(labelSpot.target);

        this.scene.add(tunnelGroup);
    }

    setupDust() {
        const dustGeo = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(this.dustCount * 3);
        const dustSpeeds = new Float32Array(this.dustCount);
        for (let i = 0; i < this.dustCount; i++) {
            dustPositions[i * 3]     = (Math.random() - 0.5) * 35;
            dustPositions[i * 3 + 1] = Math.random() * 15;
            dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 35;
            dustSpeeds[i] = Math.random() * 0.5 + 0.1;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeo.setAttribute('speed', new THREE.BufferAttribute(dustSpeeds, 1));
        this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
            size: 0.05, color: 0x88ccff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending
        }));
        this.scene.add(this.dust);
    }

    buildAll() {
        this.setupLighting();
        this.setupRoom();
        this.setupHangar();
        this.setupBelt();
        this.setupTunnel();
        this.setupDust();
    }
}
