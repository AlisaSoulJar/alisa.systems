/**
 * Sovereign Matrix Room API — v1.0
 * Replaces 150+ lines of duplicate Three.js boilerplate in ALISA Simulation Labs.
 * 
 * Usage:
 *   import { MatrixRoom } from './js/MatrixRoom.js';
 *   const room = new MatrixRoom('my-container-id', { autoGrid: true });
 *   room.loadGltf(hashUrl);
 */

export class MatrixRoom {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`[MatrixRoom] Container #${containerId} not found.`);

        this.options = Object.assign({
            background: 0xf0f2f5,
            fogDensity: 0.03,
            autoGrid: true,
            cameraZ: 4,
            cameraY: 1.5,
            orbitDamping: true
        }, options);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.background);
        this.scene.fog = new THREE.FogExp2(this.options.background, this.options.fogDensity);

        // Aspect matches the container, not necessarily the window
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(2, this.options.cameraY, this.options.cameraZ);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = this.options.orbitDamping;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0.8, 0);
        this.controls.maxPolarAngle = Math.PI / 2 + 0.1;

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcadcfa, 0.8);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.dirLight.position.set(5, 8, 5);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.0005;
        this.scene.add(this.dirLight);

        if (this.options.autoGrid) {
            this.grid = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
            this.grid.material.opacity = 0.08;
            this.grid.material.transparent = true;
            this.scene.add(this.grid);

            this.floor = new THREE.Mesh(
                new THREE.PlaneGeometry(50, 50),
                new THREE.ShadowMaterial({ opacity: 0.15 })
            );
            this.floor.rotation.x = -Math.PI / 2;
            this.floor.receiveShadow = true;
            this.scene.add(this.floor);
        }

        this.currentPreview = null;
        this.isNight = false;

        // Auto-Resize handler
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        // Start render loop
        this.animate = this.animate.bind(this);
        this.animate();
    }

    onResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update(); // only required if controls.enableDamping or controls.autoRotate are set
        
        // Auto-rotate the preview object slowly, like a showroom
        if (this.currentPreview && this.currentPreview.userData.autoRotate) {
             this.currentPreview.rotation.y += 0.005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    toggleNightMode() {
        this.isNight = !this.isNight;
        if(this.isNight) {
            this.hemiLight.intensity = 0.1;
            this.dirLight.intensity = 0.2;
            this.scene.fog.density = 0.05;
            this.scene.background.setHex(0x020205);
            this.scene.fog.color.setHex(0x020205);
        } else {
            this.hemiLight.intensity = 0.8;
            this.dirLight.intensity = 1.2;
            this.scene.fog.density = 0.03;
            this.scene.background.setHex(this.options.background);
            this.scene.fog.color.setHex(this.options.background);
        }
    }

    clearPreview() {
        if (this.currentPreview) {
            this.scene.remove(this.currentPreview);
            this.currentPreview = null;
        }
    }

    loadGltf(url) {
        this.clearPreview();
        const loader = new THREE.GLTFLoader();
        
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:monospace; color:white; background:black; padding:10px; border-radius:10px;";
        loadingIndicator.innerText = "LOADING GLB...";
        this.container.appendChild(loadingIndicator);

        loader.load(url, (gltf) => {
            const model = gltf.scene;
            
            // Auto scale to fit decently
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const max = Math.max(size.x, size.y, size.z);
            if (max > 0) {
                const scaleF = 2.0 / max; // Target height/width roughly 2m
                model.scale.set(scaleF, scaleF, scaleF);
            }

            // Center position
            const newBbox = new THREE.Box3().setFromObject(model);
            const center = newBbox.getCenter(new THREE.Vector3());
            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - newBbox.min.y); // Float above ground
            model.position.z += (model.position.z - center.z);
            
            model.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
            
            model.userData.autoRotate = true; // Flag for animation loop
            this.currentPreview = model;
            this.scene.add(this.currentPreview);

            loadingIndicator.remove();
        }, undefined, (e) => {
            loadingIndicator.innerText = "ERROR LOADING MODEL";
            console.error(e);
            setTimeout(()=>loadingIndicator.remove(), 2000);
        });
    }

    applyTextureToSphere(url, category) {
        this.clearPreview();

        let geometry;
        if (category === 'ui' || category === 'image') {
            geometry = new THREE.PlaneGeometry(2, 2);
        } else {
            geometry = new THREE.SphereGeometry(1, 64, 64);
        }

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            
            let material;
            if (category === 'ui' || category === 'image') {
               material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            } else {
               material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3, metalness: 0.0 });
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = 1.0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.autoRotate = true;
            
            this.currentPreview = mesh;
            this.scene.add(this.currentPreview);
        });
    }
}
