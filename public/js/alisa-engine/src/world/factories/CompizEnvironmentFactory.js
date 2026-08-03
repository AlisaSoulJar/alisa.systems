import * as THREE from 'three';
import { AssetManager } from '../../soma/AssetManager.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class CompizEnvironmentFactory extends BaseEnvironmentFactory {
    
    constructor(scene = null, camera = null) {
        super(scene, null);
        this.camera = camera;

        this.entities = [];
        this._pendingAdds = [];
        
        // Proxy for legacy constructors trying to do this.scene.add() before init
        if (!scene) {
            this.scene = { 
                add: (obj) => { this._pendingAdds.push(obj); },
                remove: (obj) => { }
            };
        }
        
        this._legacyConstructor();
    }

    _legacyConstructor() {


        this.roomGroup = new THREE.Group();
        this.scene.add(this.roomGroup);
        this.entities = [];
        
        this.baseCamZ = 0;
        this.dirLight = null;
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * La sala Compiz depende del tamaño de ventana y del FOV porque la
     * ilusión óptica se calibra contra ellos. Por defecto, 1280x720 y 50°.
     */
    buildAll(c = {}) {
        this.setupLighting();
        this.buildRoom(c.windowWidth ?? 1280, c.windowHeight ?? 720, c.fovDegrees ?? 50);
        return { room: this.roomGroup ?? this.group ?? null };
    }

    setupLighting() {
        this.applyLightingPreset({
            hemi: { skyColor: 0xffffff, groundColor: 0xcadcfa, intensity: 0.8 }
        });
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        this.dirLight.position.set(0, 1000, 1000);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);
    }

    buildRoom(windowWidth, windowHeight, fovDegrees) {
        while(this.roomGroup.children.length > 0) this.roomGroup.remove(this.roomGroup.children[0]);
        this.entities.forEach(e => this.scene.remove(e));
        this.entities.length = 0;

        const W = windowWidth;
        const H = windowHeight;
        this.baseCamZ = (H / 2) / Math.tan(THREE.MathUtils.degToRad(fovDegrees / 2));

        // Shell
        const outerGeo = new THREE.BoxGeometry(W * 3, H * 3, W * 3);
        const outerMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, side: THREE.BackSide });
        const outerBox = new THREE.Mesh(outerGeo, outerMat);
        outerBox.position.set(0, 0, -W/2);
        this.roomGroup.add(outerBox);

        // Stage
        const cubeGroup = new THREE.Group();
        cubeGroup.position.set(0, 0, -W/2);
        this.roomGroup.add(cubeGroup);
        this.roomGroup.userData.cube = cubeGroup;

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.1 });

        const addDoorWall = (x, z, rotY, colorStr) => {
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
            plane.position.set(x, 0, z); plane.rotation.y = rotY; plane.receiveShadow = true;
            cubeGroup.add(plane);

            const doorW = W * 0.15; const doorH = H * 0.6;
            const doorGeo = new THREE.PlaneGeometry(doorW, doorH);
            const doorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorStr), roughness: 0.2 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(x * 0.98, -H/2 + doorH/2, z * 0.98);
            door.rotation.y = rotY; door.receiveShadow = true; door.castShadow = true;
            cubeGroup.add(door);
        };

        const halfW = W / 2;
        addDoorWall(0, -halfW, 0, '#26c6da'); // World
        addDoorWall(-halfW, 0, Math.PI/2, '#66bb6a'); // Soma
        addDoorWall(halfW, 0, -Math.PI/2, '#ffa726'); // Alisa
        addDoorWall(0, halfW, Math.PI, '#ab47bc'); // Psyche

        const floorGrid = new THREE.GridHelper(W, 40, 0x000000, 0x000000);
        floorGrid.position.set(0, -H/2 + 2, 0); floorGrid.material.opacity = 0.08; floorGrid.material.transparent = true;
        cubeGroup.add(floorGrid);

        if (this.dirLight) {
            this.dirLight.shadow.camera.left = -W; this.dirLight.shadow.camera.right = W;
            this.dirLight.shadow.camera.top = H; this.dirLight.shadow.camera.bottom = -H;
            this.dirLight.shadow.camera.far = this.baseCamZ + W * 2;
            this.dirLight.shadow.camera.updateProjectionMatrix();
        }

        const scaleMult = W * 0.05; 

        const loadProp = (path, lx, lz, s, ry) => {
            AssetManager.loadModelAsync(path).then((scene) => {
                const model = scene.clone();
                model.scale.setScalar(s); model.position.set(lx, -H/2, lz); model.rotation.y = ry;
                model.userData = { baseX: lx, baseY: -H/2, baseZ: lz, baseRotY: ry, baseScale: s };
                model.traverse(c => { if(c.isMesh){ c.castShadow = true; c.receiveShadow = true; } });
                cubeGroup.add(model); this.entities.push(model); 
            }).catch(e => console.error("Could not load prop " + path, e));
        };

        const pOff = halfW * 0.7;
        loadProp('../props/models/Cardboard Boxes.glb', 0, -pOff, scaleMult * 2.5, 0);
        loadProp('../props/models/Vending Machine.glb', -pOff, 0, scaleMult * 1.5, Math.PI/2);
        loadProp('../props/models/Gaming Computer.glb', pOff, 0, scaleMult * 3.0, -Math.PI/2);
        loadProp('../props/models/Couch Small.glb', 0, pOff, scaleMult * 2.5, Math.PI);
    }

    /**
     * Applies the inverse perspective projection magic.
     * @param {number} smoothHeadX Smooth calculated head position X
     * @param {number} smoothHeadY Smooth calculated head position Y
     * @param {number} currentRotX Smooth target room rotation X
     * @param {number} currentRotY Smooth target room rotation Y
     * @param {number} W Window Inner Width
     * @param {number} H Window Inner Height
     */
    applyOpticalIllusion(smoothHeadX, smoothHeadY, currentRotX, currentRotY, W, H) {
        this.camera.position.set(smoothHeadX, smoothHeadY, this.baseCamZ);
        this.camera.rotation.set(0, 0, 0);

        const ratio = 1.0 / this.baseCamZ;
        const nL = (-W/2 - smoothHeadX) * ratio; const nR = (W/2 - smoothHeadX) * ratio;
        const nT = (H/2 - smoothHeadY) * ratio; const nB = (-H/2 - smoothHeadY) * ratio;

        this.camera.projectionMatrix.makePerspective(nL, nR, nT, nB, 1.0, this.baseCamZ + W * 3);
        this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();

        if (this.roomGroup.userData.cube) {
            // Use 'YXZ' rotation order so pitch behaves correctly regardless of yaw
            this.roomGroup.userData.cube.rotation.set(currentRotX, currentRotY, 0, 'YXZ');
        }

        const tmp = new THREE.Vector3();
        this.entities.forEach((m) => {
            m.getWorldPosition(tmp);
            const dy = Math.abs(smoothHeadY - tmp.y);
            const dz = Math.abs(this.baseCamZ - tmp.z);
            const pitch = Math.atan(dy / dz);
            m.scale.setScalar(m.userData.baseScale * Math.cos(pitch));
        });
    }

    setCore(core) {
        this.core = core;
        if (!this.camera && core.camera) this.camera = core.camera;
    }

    init(scene) {

        // Apply any groups added during the proxy constructor phase
        if (this._pendingAdds) {
            this._pendingAdds.forEach(obj => this.scene.add(obj));
            this._pendingAdds = [];
        }
        if (this.setupLighting) this.setupLighting();
        if (this.buildRoom) this.buildRoom(window.innerWidth || 1024, window.innerHeight || 768, 45);

    }

}
