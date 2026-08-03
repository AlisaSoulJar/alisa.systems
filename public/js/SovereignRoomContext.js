// SovereignRoomContext.js
// ALISA Centralized WebGL Boilerplate for Matrix Rooms
// Automatically initializes window.scene, window.camera, window.renderer, etc.

class SovereignRoomContext {
    constructor(options = {}) {
        this.options = {
            fogDensity: 0.03,
            cameraPos: { x: 4, y: 3, z: 6 },
            css3d: false,
            dayNightToggle: true,
            gridColor: 0x000000,
            gridOpacity: 0.05,
            floorColor: 0xf0f2f5,
            bgColor: 0xf0f2f5,
            ...options
        };

        this.init();
    }

    init() {
        // SCENE
        window.scene = new THREE.Scene();
        window.scene.background = new THREE.Color(this.options.bgColor);
        window.scene.fog = new THREE.FogExp2(this.options.bgColor, this.options.fogDensity);

        // ... camera/renderer omitted for brevity but they are mostly unchanged ...
        // Wait! We shouldn't omit in replacement block!
        
        // CAMERA
        window.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
        window.camera.position.set(this.options.cameraPos.x, this.options.cameraPos.y, this.options.cameraPos.z);

        // RENDERER
        window.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2 });
        window.renderer.setSize(window.innerWidth, window.innerHeight);
        window.renderer.shadowMap.enabled = true;
        window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(window.renderer.domElement);

        // CSS3D RENDERER (Optional but used in Hubs/Sandbox)
        if (this.options.css3d && typeof THREE.CSS3DRenderer !== 'undefined') {
            window.cssScene = new THREE.Scene();
            window.cssRenderer = new THREE.CSS3DRenderer();
            window.cssRenderer.setSize(window.innerWidth, window.innerHeight);
            window.cssRenderer.domElement.style.position = 'absolute';
            window.cssRenderer.domElement.style.top = '0';
            window.cssRenderer.domElement.style.left = '0';
            window.cssRenderer.domElement.style.pointerEvents = 'none'; // let clicks pass to webgl
            document.getElementById('css-container')?.appendChild(window.cssRenderer.domElement);
        }

        // CONTROLS
        if (typeof THREE.OrbitControls !== 'undefined') {
            window.controls = new THREE.OrbitControls(window.camera, window.renderer.domElement);
            window.controls.enableDamping = true;
            window.controls.dampingFactor = 0.05;
            window.controls.target.set(0, 0, 0);
        }

        // GRID & FLOOR
        const gridHelper = new THREE.GridHelper(50, 50, this.options.gridColor, this.options.gridColor);
        gridHelper.material.opacity = this.options.gridOpacity;
        gridHelper.material.transparent = true;
        window.scene.add(gridHelper);

        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.MeshStandardMaterial({ color: this.options.floorColor, roughness: 0.9, metalness: 0.1 });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        window.scene.add(plane);

        // LIGHTS
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        window.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffeedd, 0.6);
        this.dirLight.position.set(5, 10, 3);
        this.dirLight.castShadow = true;

        // Improve shadow quality
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.0005;
        window.scene.add(this.dirLight);

        // DAY/NIGHT TOGGLE
        if (this.options.dayNightToggle) {
            this.lightsOn = true;
            window.toggleLights = () => {
                this.lightsOn = !this.lightsOn;
                this.ambientLight.intensity = this.lightsOn ? 0.65 : 0.05;
                this.dirLight.intensity = this.lightsOn ? 0.6 : 0.02;
                window.scene.background = new THREE.Color(this.lightsOn ? 0xf0f2f5 : 0x050508);
                window.scene.fog.color.setHex(this.lightsOn ? 0xf0f2f5 : 0x050508);
                
                // Dim HTML UI buttons if they exist
                const btnLights = document.querySelector('.toggle-btn');
                if (btnLights) btnLights.style.opacity = this.lightsOn ? '1.0' : '0.5';
            };
            
            window.addEventListener('keydown', (e) => {
                if(e.key.toLowerCase() === 'l' && document.activeElement.tagName !== 'INPUT') {
                    window.toggleLights();
                }
            });
        }

        // RESIZE HANDLER
        window.addEventListener("resize", () => {
            window.camera.aspect = window.innerWidth / window.innerHeight;
            window.camera.updateProjectionMatrix();
            window.renderer.setSize(window.innerWidth, window.innerHeight);
            if (window.cssRenderer) {
                window.cssRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        });

        // ANIMATION LOOP
        window.clock = new THREE.Clock();
        this.onTick = null; // User scripts can override this
        
        const animate = () => {
            requestAnimationFrame(animate);
            let dt = window.clock.getDelta();
            let time = window.clock.getElapsedTime();
            
            if (typeof window.TWEEN !== 'undefined') {
                window.TWEEN.update();
            }

            if (this.onTick) {
                this.onTick(dt, time);
            }

            if (window.controls) {
                window.controls.update();
            }

            window.renderer.render(window.scene, window.camera);
            if (window.cssRenderer && window.cssScene) {
                window.cssRenderer.render(window.cssScene, window.camera);
            }
        };
        animate();
    }
}

// Global scope initialization helper
window.SovereignRoomContext = SovereignRoomContext;
