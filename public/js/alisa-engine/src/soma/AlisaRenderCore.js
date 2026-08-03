import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
/**
 * ALISA RENDER CORE
 * ----------------------------------------------------
 * High-performance WebGL abstraction layer.
 * Eliminates Three.js boilerplate from simulation files,
 * standardizing the initialization, resizing, and main render loop.
 *
 * ── EL NÚCLEO ES VAINILLA ────────────────────────────────────────────────
 * Antes este fichero importaba `ColonialPassportPlugin` y lo auto-registraba
 * apuntando a `http://127.0.0.1:8741`. Es decir: CUALQUIER escena hecha con el
 * motor —incluida una copia descargada por un desconocido— arrancaba hablando
 * con un hub de la colonia. Y para nada: `getPlugin()` no se llamaba en ningún
 * sitio del repositorio, así que el plugin se conectaba y nadie le preguntaba.
 *
 * El núcleo ya no conoce la colonia. Para engancharla, es explícito:
 *
 *     import { attachColony } from '@alisa-engine/src/extensions/alisa-colony/index.js';
 *     const core = new AlisaRenderCore();
 *     attachColony(core, { hubUrl: 'http://127.0.0.1:8741' });
 *
 * O pasando plugins al construir, sea cual sea su origen:
 *
 *     new AlisaRenderCore({ plugins: [ new LoQueSea() ] });
 */
export class AlisaRenderCore {
    constructor(options = {}) {
        this.options = {
            clearColor: 0x0b0b14,
            fogColor: 0x0b0b14,
            fogDensity: 0.015,
            useShadows: true,
            cameraPosition: new THREE.Vector3(0, 25, 35),
            ...options
        };

        // Core Systems
        this.scene = new THREE.Scene();
        if (this.options.fogColor !== null) {
            this.scene.fog = new THREE.FogExp2(this.options.fogColor, this.options.fogDensity);
        }

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.copy(this.options.cameraPosition);

        // ── LA COSTURA DEL RENDERER ────────────────────────────────────────
        // Estaba clavado en `new THREE.WebGLRenderer(...)`, y por eso cambiar de
        // backend era editar el núcleo en vez de enchufar algo. Ahora se puede
        // inyectar uno hecho, o una función que lo fabrique:
        //
        //     new AlisaRenderCore({ crearRenderer: () => new WebGPURenderer({ antialias:true }) })
        //
        // Con eso, WebGPU deja de ser una migración del núcleo y pasa a ser una
        // decisión de quien monta la página. Lo que NO arregla esta línea, y
        // conviene saberlo antes de ilusionarse:
        //   1. `three` y `three/webgpu` son BUILDS DISTINTOS: no se mezclan en
        //      la misma página, así que el importmap cambia entero.
        //   2. `EffectComposer` + `UnrealBloomPass` son de WebGL; en WebGPU el
        //      post-proceso es por nodos (`PostProcessing`), otra tubería.
        //   3. Los shaders en GLSL crudo hay que reescribirlos en TSL. De los
        //      nuestros solo hay uno: `AnomalyLensPlugin`.
        // O sea: enchufable el backend, sustituible la tubería, y un shader que
        // portar. Ni una tarde ni una migración: una tarde por cada una de esas
        // tres cosas.
        this.renderer = this.options.renderer
            ?? (this.options.crearRenderer
                ? this.options.crearRenderer(THREE, this.options)
                : new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: this.options.alpha !== undefined ? this.options.alpha : false,
                    preserveDrawingBuffer: false
                  }));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(this.options.clearColor);
        this.renderer.shadowMap.enabled = this.options.useShadows;

        // Auto-inject into DOM
        document.body.appendChild(this.renderer.domElement);

        // Advanced CSS3D Interop Layer
        this.css3dRenderer = new CSS3DRenderer();
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0px';
        this.css3dRenderer.domElement.style.pointerEvents = 'none'; // Pass-through for WebGL
        document.body.appendChild(this.css3dRenderer.domElement);

        // Interaction
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        this.clock = new THREE.Clock();

        // Plugin System
        this.plugins = [];

        // Plugins que pase la aplicación. El núcleo no registra ninguno por su
        // cuenta: lo que se conecte a la red lo decide quien usa el motor.
        if (Array.isArray(this.options.plugins)) {
            this.options.plugins.forEach(p => this.registerPlugin(p));
        }

        // Bind Events
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Registers a modular plugin, injecting it into the render pipeline.
     */
    registerPlugin(plugin) {
        this.plugins.push(plugin);
        if (plugin.onInit) {
            plugin.onInit(this);
        }
    }

    /**
     * Retrieve a resolved plugin by name.
     */
    getPlugin(name) {
        return this.plugins.find(p => p.name === name);
    }

    /**
     * Reusable Helper to inject basic lighting and grid.
     */
    setupDefaultEnvironment() {
        // Lighting
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.4);
        this.scene.add(this.hemiLight);
        
        this.spotLight = new THREE.SpotLight(0x818cf8, 200, 100, Math.PI/6, 0.5, 1);
        this.spotLight.position.set(0, 40, 0);
        this.spotLight.castShadow = true;
        this.scene.add(this.spotLight);

        // Environment
        const grid = new THREE.GridHelper(100, 50, 0x333344, 0x111118);
        grid.position.y = 0.01;
        this.scene.add(grid);

        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x07070a, transparent: true, opacity: 0.9 });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
    }

    /**
     * Adds an object to the scene.
     */
    add(object3D) {
        this.scene.add(object3D);
    }

    /**
     * Starts the RequestAnimationFrame / WebGL loop.
     * @param {Function} updateCallback - Passes (dt) to the logical Gym ML hooks.
     * @param {Function} customRenderCallback - Optional override for post-processing engines (e.g. EffectComposer).
     */
    startLoop(updateCallback, customRenderCallback = null) {
        this.renderer.setAnimationLoop(() => {
            const dt = Math.min(this.clock.getDelta(), 0.1);
            
            // Logic Frame
            if (updateCallback) updateCallback(dt);
            
            // Plugins Update Pipeline
            for (let plugin of this.plugins) {
                if (plugin.onUpdate) plugin.onUpdate(dt);
            }
            
            // Interaction / Rendering Frame
            if (this.controls) this.controls.update();
            if (customRenderCallback) {
                customRenderCallback(dt);
            } else {
                this.renderer.render(this.scene, this.camera);
                this.css3dRenderer.render(this.scene, this.camera);
            }
        });
    }

    stopLoop() {
        this.renderer.setAnimationLoop(null);
    }
}
