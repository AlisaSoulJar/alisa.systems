import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';

export class TrafficEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene) {
        super(scene, null);
        this.loadedCarModels = [];
        this.modelFerret = null;
        this.modelFrog = null;

        this.texFactory = new ProceduralTextureFactory();

        // Peatón state
        this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
        this.agentInput = { x: 0, z: 0 }; // For headless/FSM control
        this._bindKeys();
        
        this.frog = null;
        this.isDead = false;
    }

    // API para Agentes y FSM (Llamable desde el exterior)
    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * ASÍNCRONA: precarga los GLBs (coches/rana/hurón) antes de tender la
     * carretera. Hay que esperarla:
     *     await fab.buildAll({ roadLength: 300, roadWidth: 20 });
     */
    async buildAll(c = {}) {
        await this.preloadAssets();
        this.buildHighway(c.roadLength ?? 300, c.roadWidth ?? 20);
        return { highway: this.highway ?? null };
    }

    applyAction(inputX, inputZ) {
        this.agentInput.x = inputX;
        this.agentInput.z = inputZ;
    }

    // Matriz matemática plana para Reinforcement Learning / FSM
    getState() {
        const vehicles = [];
        if (this.scene) {
            for (let i = 0; i < this.scene.children.length; i++) {
                const child = this.scene.children[i];
                if (child.userData && child.userData.sizeX) {
                    vehicles.push({
                        x: parseFloat(child.position.x.toFixed(2)),
                        z: parseFloat(child.position.z.toFixed(2)),
                        w: child.userData.sizeX,
                        h: child.userData.sizeZ
                    });
                }
            }
        }
        
        return {
            frog: {
                x: this.frog ? parseFloat(this.frog.position.x.toFixed(2)) : 0,
                z: this.frog ? parseFloat(this.frog.position.z.toFixed(2)) : 25,
                dead: this.isDead
            },
            vehicles: vehicles,
            bounds: { minX: -55, maxX: 55, minZ: -25, maxZ: 25 }
        };
    }

    _bindKeys() {
        document.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.code) && !this.isDead) this.keys[e.code] = true;
        });
        document.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
        });
    }

    init(scene) {
        if (scene) this.scene = scene;
        this.buildHighway(120, 40);
        
        // Spawn Frog
        this.frog = this.createVisualFrog();
        if (this.frog) {
            this.frog.position.set(0, 0, 25); // Start on sidewalk (z=25)
        }
    }

    setCore(core) {
        this.core = core;
    }

    async preloadAssets() {
        const CAR_PATHS = [
            '../props/models/NormalCar1.glb', '../props/models/NormalCar2.glb', '../props/models/SUV.glb',
            '../props/models/SportsCar.glb', '../props/models/SportsCar2.glb', '../props/models/Taxi.glb',
            '../props/models/Raptor Heavy Planetary Crawler.glb'
        ];
        const carPromises = CAR_PATHS.map(path => 
            GLTFModelPool.get(path).then(gltf => {
                const m = gltf.scene;
                const baseScale = path.includes('Raptor') ? 4.5 : 0.9;
                m.scale.set(baseScale, baseScale, baseScale);
                m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                const box = new THREE.Box3().setFromObject(m);
                const size = new THREE.Vector3(); box.getSize(size);
                m.userData.sizeX = size.x; m.userData.sizeZ = size.z;
                m.userData.yOffset = -box.min.y;
                return m;
            })
        );

        const frogPromise = GLTFModelPool.get('../props/models/Frog.glb').then(gltf => {
            this.modelFrog = gltf.scene;
            this.modelFrog.scale.set(0.169, 0.169, 0.169);
            const box = new THREE.Box3().setFromObject(this.modelFrog);
            this.modelFrog.userData.yOffset = -box.min.y + 0.2;
            this.modelFrog.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
            if (gltf.animations) this.modelFrog.userData.animations = gltf.animations;
        });

        const ferretPromise = GLTFModelPool.get('../props/models/Ferret.glb').then(gltf => {
            this.modelFerret = gltf.scene;
            this.modelFerret.scale.set(0.54, 0.54, 0.54);
            const box = new THREE.Box3().setFromObject(this.modelFerret);
            this.modelFerret.userData.yOffset = -box.min.y;
            this.modelFerret.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
        });

        const results = await Promise.all([frogPromise, ferretPromise, ...carPromises]);
        this.loadedCarModels = results.slice(2);
    }

    buildHighway(ROAD_LENGTH, ROAD_WIDTH) {
        const texAsphalt = this.texFactory.getOrCreate('traffic_asphalt', () => ProceduralTextureFactory.asphalt(), {
            magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter,
            wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
            repeat: [10, 8]
        });
        const matAsphalt = new THREE.MeshStandardMaterial({ map: texAsphalt, roughness: 0.9, metalness: 0.1 });

        const texGrass = this.texFactory.getOrCreate('traffic_grass', () => ProceduralTextureFactory.grass(), {
            magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter,
            wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
            repeat: [10, 10]
        });
        const matGrass = new THREE.MeshStandardMaterial({ map: texGrass, roughness: 1.0 });

        this.applyLightingPreset({
            ambient: { color: 0xddeeff, intensity: 0.6 }
        });
        const dirLight = new THREE.DirectionalLight(0xfff2e5, 1.5);
        dirLight.position.set(20, 30, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        const geoRoad = new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);
        geoRoad.rotateX(-Math.PI / 2);
        const road = new THREE.Mesh(geoRoad, matAsphalt);
        road.receiveShadow = true;
        this.scene.add(road);

        const geoGrass = new THREE.PlaneGeometry(ROAD_LENGTH, 15);
        geoGrass.rotateX(-Math.PI / 2);
        const lake = new THREE.Mesh(geoGrass, new THREE.MeshBasicMaterial({ color: 0x1155aa }));
        lake.position.z = -ROAD_WIDTH/2 - 7.5;
        this.scene.add(lake);

        const grassBot = new THREE.Mesh(geoGrass, matGrass);
        grassBot.position.z = ROAD_WIDTH/2 + 7.5;
        this.scene.add(grassBot);
        
        // Center lines etc...
        const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        for (let x = -ROAD_LENGTH/2; x < ROAD_LENGTH/2; x += 4) {
             const dash = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.02, 0.25), yellowMat);
             dash.position.set(x, 0.01, 0);
             this.scene.add(dash);
        }
    }

    createVisualCar(forceRaptor, pData, laneZ, actualDir, xPos = 0) {
        if (this.loadedCarModels.length === 0) return null;
        let modelIdx = forceRaptor ? this.loadedCarModels.length - 1 : Math.floor(Math.random() * (this.loadedCarModels.length - 1));
        let baseModel = this.loadedCarModels[modelIdx];
        let car = baseModel.clone();
        
        car.position.set(xPos, baseModel.userData.yOffset || 0, laneZ);
        car.rotation.y = actualDir === -1 ? -Math.PI / 2 : Math.PI / 2;

        if (pData.color) {
            car.traverse(m => {
                if (m.isMesh && m.material) {
                    m.material = m.material.clone();
                    m.material.emissive = new THREE.Color(pData.color);
                    m.material.emissiveIntensity = pData.name === 'ambulance' ? 0.5 : 0.3;
                }
            });
        }
        
        car.userData.sizeX = baseModel.userData.sizeX;
        car.userData.sizeZ = baseModel.userData.sizeZ;
        this.scene.add(car);
        return car;
    }

    createVisualFrog() {
        if (!this.modelFrog) return null;
        let f = SkeletonUtils.clone(this.modelFrog);
        if (this.modelFrog.userData.animations) {
            f.userData.mixer = new THREE.AnimationMixer(f);
            f.userData.action = f.userData.mixer.clipAction(this.modelFrog.userData.animations[0]);
            f.userData.action.play();
            f.userData.action.paused = true;
            f.userData.action.timeScale = 3.0;
        }
        f.userData.agent = true;
        this.scene.add(f);
        return f;
    }

    createVisualFerret() {
        if (!this.modelFerret) return null;
        let f = SkeletonUtils.clone(this.modelFerret);
        f.userData.agent = true;
        this.scene.add(f);
        return f;
    }

    createOilSpill(state) {
        const c = ProceduralTextureFactory.oilSpill();
        const tex = this.texFactory.getOrCreate('traffic_oil_spill', () => c);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(state.radius * 2, state.radius * 2), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(state.x, 0.03, state.z);
        this.scene.add(mesh);
        return mesh;
    }

    spawnBlood(pos) {
        const c = ProceduralTextureFactory.bloodSplatter();
        const tex = this.texFactory.getOrCreate('traffic_blood_splatter', () => c);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(pos); mesh.position.y = 0.05;
        this.scene.add(mesh);
        return mesh;
    }

    update(dt) {
        if (!this.frog || this.isDead) return;

        // Kinematic grid-based movement
        const speed = 15.0; // Units per second
        let inputX = this.agentInput.x;
        let inputZ = this.agentInput.z;
        
        // Sumamos teclado físico si lo hay
        if (this.keys.KeyW) inputZ -= 1;
        if (this.keys.KeyS) inputZ += 1;
        if (this.keys.KeyA) inputX -= 1;
        if (this.keys.KeyD) inputX += 1;

        // Limpiar el input del agente para que actúe como un trigger de 1 frame
        // (A menos que queramos mantenerlo sostenido, típicamente las FSM mandan impulsos)
        this.agentInput.x = 0;
        this.agentInput.z = 0;

        if (inputX !== 0 || inputZ !== 0) {
            const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
            inputX /= length;
            inputZ /= length;
            
            this.frog.rotation.y = Math.atan2(inputX, inputZ);
            
            // Advance animation if it's there
            if (this.frog.userData.mixer) {
                this.frog.userData.action.paused = false;
                this.frog.userData.mixer.update(dt);
            }
        } else {
            if (this.frog.userData.mixer) this.frog.userData.action.paused = true;
        }

        this.frog.position.x += inputX * speed * dt;
        this.frog.position.z += inputZ * speed * dt;

        // Clamp boundaries (Highway is length 120, width 40)
        if (this.frog.position.x < -55) this.frog.position.x = -55;
        if (this.frog.position.x > 55) this.frog.position.x = 55;
        if (this.frog.position.z > 25) this.frog.position.z = 25;

        // Win condition (reached top side)
        if (this.frog.position.z < -25) {
            this.frog.position.z = 25; // Reset
            if (window.onFrogCross) window.onFrogCross();
        }

        // Camera Follow
        if (this.core && this.core.camera && this.core.controls) {
            const offset = new THREE.Vector3(0, 15, 10);
            const targetCamPos = this.frog.position.clone().add(offset);
            this.core.camera.position.lerp(targetCamPos, 0.1);
            this.core.controls.target.lerp(this.frog.position, 0.2);
        }

        // Collision Check with Cars
        for (let i = 0; i < this.scene.children.length; i++) {
            const child = this.scene.children[i];
            // Check if child is a car (has sizeX/sizeZ properties assigned in createVisualCar)
            if (child.userData && child.userData.sizeX) {
                // Approximate AABB collision (radius 0.5 for frog vs bounding box of car)
                const dx = Math.abs(this.frog.position.x - child.position.x);
                const dz = Math.abs(this.frog.position.z - child.position.z);
                
                // Allow a tiny bit of leniency
                if (dx < (child.userData.sizeX / 2 + 0.3) && dz < (child.userData.sizeZ / 2 + 0.3)) {
                    this.die();
                    break;
                }
            }
        }
    }

    die() {
        this.isDead = true;
        this.spawnBlood(this.frog.position);
        this.frog.visible = false;
        
        if (window.onFrogDeath) window.onFrogDeath();
        
        setTimeout(() => {
            this.frog.position.set(0, 0, 25);
            this.frog.visible = true;
            this.isDead = false;
        }, 1500);
    }
}