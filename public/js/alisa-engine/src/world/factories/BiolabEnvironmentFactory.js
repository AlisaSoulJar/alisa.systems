import * as THREE from 'three';
import { AssetManager } from '../../soma/AssetManager.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class BiolabEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene) {
        super(scene, null);
        this.vatGroup = new THREE.Group();
        this.isNight = true;
        
        this.lights = {};
        this.robotArms = [];
        this.fluidDrops = [];
        this.extDrops = [];
        this.baseLEDs = [];
        this.capLEDs = [];
        this.bubbles = null;
        this.bubbleCount = 150;
        this.bubbleSpeeds = null;
        this.agentBody = null;
        this.core = null;
        this.scannerLaser = null;
        this.scannerArea = null;
    }

    init() {
        this.setupLighting();
        this.buildProceduralVat();
        this.scene.add(this.vatGroup);
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Aquí `init()` YA es el montaje completo: buildProceduralVat() encadena
     * buildBubbles + buildLEDs + buildTubes + buildRoboticArms. buildAll() solo
     * le pone el nombre del contrato.
     */
    buildAll(_c = {}) {
        this.init();
        return { vat: this.vatGroup, lights: this.lights, arms: this.robotArms };
    }

    setupLighting() {
        const refs = this.applyLightingPreset({
            hemi: { skyColor: 0x00ffaa, groundColor: 0x050511, intensity: 0.2 },
            fills: [
                { color: 0x00ffaa, intensity: 2, range: 10, position: [0, 1.5, 0] },
                { color: 0x00ffaa, intensity: 3, range: 3, position: [0, 0.5, 0] }
            ]
        });
        this.lights.hemiLight = refs.hemi;
        this.lights.pointLight = refs.fills[0];
        this.lights.baseGlow = refs.fills[1];

        this.lights.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.lights.dirLight.position.set(3, 5, 3);
        this.lights.dirLight.castShadow = true;
        this.scene.add(this.lights.dirLight);
    }

    toggleLights() {
        this.isNight = !this.isNight;
        if(this.isNight) {
            this.scene.background.setHex(0x050505);
            this.scene.fog.color.setHex(0x050505);
            this.lights.hemiLight.color.setHex(0x00ffaa);
            this.lights.hemiLight.groundColor.setHex(0x050511);
            this.lights.hemiLight.intensity = 0.2;
            this.lights.dirLight.intensity = 0.5;
            this.lights.pointLight.intensity = 2.0;
            this.lights.baseGlow.intensity = 3.0;
        } else {
            this.scene.background.setHex(0x1e293b);
            this.scene.fog.color.setHex(0x1e293b);
            this.lights.hemiLight.color.setHex(0xffffff);
            this.lights.hemiLight.groundColor.setHex(0x444455);
            this.lights.hemiLight.intensity = 0.8;
            this.lights.dirLight.intensity = 1.0;
            this.lights.pointLight.intensity = 0.3;
            this.lights.baseGlow.intensity = 1.0;
        }
    }

    buildProceduralVat() {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.4, 32), metalMat);
        base.position.y = 0.2;
        base.castShadow = true;
        base.receiveShadow = true;
        this.vatGroup.add(base);

        const topCap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.2, 0.5, 32), metalMat);
        topCap.position.y = 3.8;
        topCap.castShadow = true;
        this.vatGroup.add(topCap);

        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ffcc, metalness: 0.1, roughness: 0.05,
            transmission: 0.95, ior: 1.5, thickness: 0.5, transparent: true
        });
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.2, 32), glassMat);
        glass.position.y = 2.0;
        this.vatGroup.add(glass);

        this.core = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 32), new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
        this.core.position.y = 2.0;
        this.vatGroup.add(this.core);

        this.buildBubbles();
        
        this.agentBody = new THREE.Group();
        this.agentBody.position.y = 1.8;
        this.vatGroup.add(this.agentBody);
        
        // loadModelAsync YA resuelve a gltf.scene (un THREE.Group), no al gltf
        // entero. Aquí se hacía `.scene` otra vez → undefined → "reading 'scale'".
        AssetManager.loadModelAsync('../props/models/Superhero_Male_FullBody.glb').then(loadedAgent => {
            loadedAgent.scale.set(0.85, 0.85, 0.85);
            loadedAgent.position.y = -1.05;
            loadedAgent.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x112211, metalness: 0.8, roughness: 0.2 });
                    child.castShadow = true;
                }
            });
            this.agentBody.add(loadedAgent);
        }).catch(e => console.error("Error loading Agent GLB:", e));

        this.scannerLaser = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 16, 100), new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.scannerLaser.rotation.x = Math.PI / 2;
        this.vatGroup.add(this.scannerLaser);

        this.scannerArea = new THREE.Mesh(new THREE.CircleGeometry(0.94, 32), new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        this.scannerArea.rotation.x = Math.PI / 2;
        this.vatGroup.add(this.scannerArea);

        this.buildLEDs();
        this.buildTubes();
        this.buildRoboticArms();
    }

    buildBubbles() {
        const bubbleGeo = new THREE.BufferGeometry();
        const bubblePos = new Float32Array(this.bubbleCount * 3);
        this.bubbleSpeeds = new Float32Array(this.bubbleCount);
        
        for(let i = 0; i < this.bubbleCount; i++) {
            const r = Math.random() * 0.85;
            const theta = Math.random() * 2 * Math.PI;
            bubblePos[i*3] = r * Math.cos(theta);
            bubblePos[i*3 + 1] = 0.5 + Math.random() * 3.0;
            bubblePos[i*3 + 2] = r * Math.sin(theta);
            this.bubbleSpeeds[i] = 0.005 + Math.random() * 0.015;
        }
        bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
        const bubbleMat = new THREE.PointsMaterial({ color: 0xccffaa, size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        this.bubbles = new THREE.Points(bubbleGeo, bubbleMat);
        this.vatGroup.add(this.bubbles);
    }

    buildLEDs() {
        const ledGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const ledMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
        
        for(let i=0; i<8; i++) {
            const angle = (i * Math.PI / 4) + Math.PI/8;
            const ledB = new THREE.Mesh(ledGeo, ledMatGreen.clone());
            ledB.position.set(Math.cos(angle) * 1.22, 0.45, Math.sin(angle) * 1.22);
            this.vatGroup.add(ledB);
            this.baseLEDs.push(ledB);
            
            const ledT = new THREE.Mesh(ledGeo, ledMatGreen.clone());
            ledT.position.set(Math.cos(angle) * 1.22, 3.55, Math.sin(angle) * 1.22);
            this.vatGroup.add(ledT);
            this.capLEDs.push(ledT);
        }
    }

    buildTubes() {
        const curveL = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.4, 3.6, 0), new THREE.Vector3(-1.2, 2.7, 0), new THREE.Vector3(-0.35, 1.8, 0));
        const curveR = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.4, 3.6, 0), new THREE.Vector3(1.2, 2.7, 0), new THREE.Vector3(0.35, 1.8, 0));

        const neonTubeMat = new THREE.MeshPhysicalMaterial({ color: 0xff00dd, transmission: 0.9, transparent: true, opacity: 0.2 });
        this.vatGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveL, 20, 0.02, 8, false), neonTubeMat));
        this.vatGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveR, 20, 0.02, 8, false), neonTubeMat));

        const extCurveL = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.4, 0.45, 0), new THREE.Vector3(-1.0, 1.2, 0), new THREE.Vector3(-0.35, 1.7, 0));
        const extCurveR = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.4, 0.45, 0), new THREE.Vector3(1.0, 1.2, 0), new THREE.Vector3(0.35, 1.7, 0));

        const extTubeMat = new THREE.MeshPhysicalMaterial({ color: 0x00ffff, transmission: 0.9, transparent: true, opacity: 0.2 });
        this.vatGroup.add(new THREE.Mesh(new THREE.TubeGeometry(extCurveL, 20, 0.02, 8, false), extTubeMat));
        this.vatGroup.add(new THREE.Mesh(new THREE.TubeGeometry(extCurveR, 20, 0.02, 8, false), extTubeMat));

        const dropGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const extDropMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent:true, opacity: 1.0, blending: THREE.AdditiveBlending });
        const dropMat = new THREE.MeshBasicMaterial({ color: 0xff00dd, transparent:true, opacity: 1.0, blending: THREE.AdditiveBlending });

        for(let i=0; i<30; i++) {
            const extDrop = new THREE.Mesh(dropGeo, extDropMat.clone());
            this.vatGroup.add(extDrop);
            this.extDrops.push({ mesh: extDrop, curve: i % 2 === 0 ? extCurveL : extCurveR, t: Math.random() });

            const fDrop = new THREE.Mesh(dropGeo, dropMat.clone());
            this.vatGroup.add(fDrop);
            this.fluidDrops.push({ mesh: fDrop, curve: i % 2 === 0 ? curveL : curveR, t: Math.random() });
        }
    }

    buildRoboticArms() {
        const createArm = (baseColor, glowColor, extraJoints = 0) => {
            const armGroup = new THREE.Group();
            const darkMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7, metalness: 0.5 });
            const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
            const jGeo = new THREE.SphereGeometry(0.04, 8, 8);

            const shoulder = new THREE.Group();
            shoulder.add(new THREE.Mesh(jGeo, darkMat));
            armGroup.add(shoulder);

            const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), darkMat);
            arm1.position.y = 0.175;
            shoulder.add(arm1);

            const elbow = new THREE.Group();
            elbow.position.y = 0.35;
            elbow.add(new THREE.Mesh(jGeo, darkMat));
            shoulder.add(elbow);

            let currentTipGroup = elbow;
            const jointsToAnimate = [elbow];

            for(let i=0; i<extraJoints; i++) {
                 const xArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), darkMat);
                 xArm.position.y = 0.1;
                 currentTipGroup.add(xArm);
                 
                 const xWrist = new THREE.Group();
                 xWrist.position.y = 0.2;
                 xWrist.add(new THREE.Mesh(jGeo, darkMat));
                 currentTipGroup.add(xWrist);
                 currentTipGroup = xWrist;
                 jointsToAnimate.push(xWrist);
            }

            const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), darkMat);
            arm2.position.y = 0.15;
            currentTipGroup.add(arm2);

            const welder = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), darkMat);
            welder.position.y = 0.3;
            currentTipGroup.add(welder);
            
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), glowMat);
            tip.position.y = 0.03;
            welder.add(tip);

            return { root: armGroup, shoulder: shoulder, jointsToAnimate: jointsToAnimate, tip: tip };
        };

        const addArm = (arm, x, y, z, rx, off, dir) => {
            arm.root.position.set(x, y, z);
            arm.root.rotation.x = rx;
            this.vatGroup.add(arm.root);
            this.robotArms.push({ ...arm, offset: off, dir: dir });
        };

        addArm(createArm(0x222222, 0x00ffff, 1), -0.25, 0.5, 0.3, 0, 0.0, 1.0);
        addArm(createArm(0x222222, 0x00ffff, 0),  0.25, 0.5,-0.3, 0, Math.PI, 1.0);
        addArm(createArm(0x222222, 0xff00dd, 2), -0.25, 3.4,-0.3, Math.PI, Math.PI/2, -1.0);
        addArm(createArm(0x222222, 0xff00dd, 0),  0.25, 3.4, 0.3, Math.PI, Math.PI*1.5,-1.0);
    }

    tick(dt, time, labState) {
        if(this.agentBody) {
            this.agentBody.position.y = 1.8 + Math.sin(time) * 0.1;
            this.agentBody.position.x = Math.cos(time * 0.3) * 0.05;
            this.agentBody.position.z = Math.sin(time * 0.4) * 0.05;
            this.agentBody.rotation.y = time * 0.2;
            this.agentBody.rotation.z = Math.sin(time * 0.5) * 0.05;
        }

        if(this.core) this.core.material.opacity = 0.15 + Math.sin(time * 1.5) * 0.05;

        if(this.bubbles) {
            const posIter = this.bubbles.geometry.attributes.position.array;
            for(let i=0; i<this.bubbleCount; i++) {
                posIter[i*3 + 1] += this.bubbleSpeeds[i];
                posIter[i*3] += Math.sin(time * 2 + i) * 0.001;
                if(posIter[i*3 + 1] > 3.5) posIter[i*3 + 1] = 0.5;
            }
            this.bubbles.geometry.attributes.position.needsUpdate = true;
        }

        if(this.scannerLaser) {
            this.scannerLaser.position.y = 2.0 + Math.sin(time * 0.8) * 1.4;
            this.scannerLaser.scale.set(1.0 + Math.sin(time*5)*0.03, 1.0 + Math.sin(time*5)*0.03, 1.0);
        }
        if(this.scannerArea) {
            this.scannerArea.position.y = 2.0 + Math.cos(time * 0.8) * 1.4;
            this.scannerArea.scale.set(1.0 + Math.cos(time*5)*0.03, 1.0 + Math.cos(time*5)*0.03, 1.0);
        }

        let progress = labState.connected ? labState.progress : ((time % 15.0) / 15.0);
        
        if(this.baseLEDs.length === 8) {
            const filledMask = Math.floor(progress * 8); 
            for(let i=0; i<8; i++) {
                this.baseLEDs[i].material.color.setHex(i <= filledMask ? 0x00ffaa : 0x002211);
                const ledIndex = Math.floor(time * 6) % 8;
                const revIndex = (8 - ledIndex) % 8;
                const highlightT = (i === revIndex) || (i === (revIndex + 1) % 8);
                this.capLEDs[i].material.color.setHex(highlightT ? 0xff3366 : 0x330011);
            }
        }

        this.fluidDrops.forEach(d => {
            d.t += 0.015;
            if(d.t > 1.0) d.t = 0.0;
            d.mesh.position.copy(d.curve.getPoint(d.t));
            d.mesh.material.opacity = (d.t > 0.9) ? (1.0 - d.t) * 10 : (d.t < 0.1) ? d.t * 10 : 1.0;
        });

        this.extDrops.forEach(d => {
            d.t -= 0.015;
            if(d.t < 0.0) d.t = 1.0;
            d.mesh.position.copy(d.curve.getPoint(d.t));
            d.mesh.material.opacity = (d.t < 0.1) ? d.t * 10 : (d.t > 0.9) ? (1.0 - d.t) * 10 : 1.0;
        });

        this.robotArms.forEach(arm => {
            if (progress < 0.9) {
                const t = time * 2.0 + arm.offset;
                arm.shoulder.rotation.y = Math.sin(t * 1.5) * 1.0; 
                arm.shoulder.rotation.z = Math.abs(Math.sin(t * 0.8)) * 1.2; 
                arm.jointsToAnimate.forEach((j, i) => {
                    j.rotation.z = Math.cos(t * 1.2 + i) * 1.5;
                    if (Math.sin(t*10) > 0.9) {
                        j.rotation.z += (Math.random() - 0.5) * 0.1;
                        arm.shoulder.rotation.z += (Math.random() - 0.5) * 0.1;
                    }
                });
            } else {
                arm.shoulder.rotation.y *= 0.9; 
                arm.shoulder.rotation.z *= 0.9; 
                arm.jointsToAnimate.forEach(j => j.rotation.z *= 0.9);
            }
        });
    }
}
