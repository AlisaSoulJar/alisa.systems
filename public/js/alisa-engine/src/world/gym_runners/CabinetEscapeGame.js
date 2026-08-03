import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CabinetBSPEngine } from '@alisa-engine/world/CabinetBSPEngine.js';
import { CabinetEnvironmentFactory } from '@alisa-engine/world/factories/CabinetEnvironmentFactory.js';
import { CabinetEscapeSystem } from '@alisa-engine/world/systems/CabinetEscapeSystem.js';
import { CabinetJumpscareSystem } from '@alisa-engine/world/systems/CabinetJumpscareSystem.js';
import { MMOClient } from '../../soma/utils/MMOClient.js';
// `AssetManager` se usaba como GLOBAL, de cuando era un script suelto en la
// página. Al pasar el motor a módulos ES dejó de existir en `window` y
// `preloadModels()` reventaba con «AssetManager is not defined» — es decir, el
// juego arrancaba y se quedaba sin mapache, sin serpiente y sin linterna.
import { AssetManager } from '../../soma/AssetManager.js';
// Y el generador se pedía como `this.bspEngine.mulberry32(...)`, un método que
// el motor BSP ya no tiene. El generador canónico —el que sostiene TODO el
// determinismo del benchmark— es este. Que haya uno solo es justamente el
// punto: dos mulberry32 distintos son dos benchmarks distintos.
import { mulberry32 } from '../core/DeterministicScope.js';

export class CabinetEscapeGame {
    constructor() {
        this.bspEngine = new CabinetBSPEngine();
        this.sys = new CabinetEscapeSystem({ bspEngine: this.bspEngine });
        this.jumpscare = new CabinetJumpscareSystem();
        
        this.currentStage = 1;
        this.isDarkMode = false;
        this.simulationRunning = false;
        
        this.rlMode = false;
        this.autoPlaying = false;
        this.autoTimer = null;
        this.agentSeed = 1;
        
        this.viewMode = 'freeroam';
        this.viewTransition = 1.0;
        this.introPhase = 'done';
        this.introTimer = 0;
        
        this.particles = [];
        this.shakeTimer = 0;
        
        this.dwellTargetIdx = -1;
        this.dwellProgress = 0.0;
        this.isMousePressed = false;
        this.screenMouseX = -100;
        this.screenMouseY = -100;
        this.gamePhase3D = 'playing';
        
        this.roomTimer = 3.0;
        this.ceilingDead = false;
        this.snakeLungeActive = false;
        this.snakeLungeTimer = 0;
        this.snakeLungeTargetIdx = -1;
        
        this.lastTime = performance.now();
        this.threeControls = null;
        this.camera = null;
        this.renderer = null;
        
        this.factory = null;
        this.floorItems = [];
        
        // Expose to window for UI
        window.getAgentChoice = () => this.getAgentChoice();
        window.setRLMode = (e) => { this.rlMode = e; };
        window.getObservationVector = () => this.sys.getObservationVector();
        window.resetEpisode = (seed) => { document.getElementById('inSeed').value = seed; this.newEpisode(); return this.sys.getObservationVector(); };
        window.stepSimulation = (a) => this.stepSimulation(a);
        window._runSim = () => this.newEpisode();
        window.ALISA_STREAM_SIM_NAME = 'cabinet_gym';
        window.enterCabinetMode = () => { this.viewMode = 'cabinet'; const b = document.getElementById('btnBackRoom'); if(b) b.style.display = 'block'; };
        window.exitCabinetMode = () => { this.viewMode = 'freeroam'; const b = document.getElementById('btnBackRoom'); if(b) b.style.display = 'none'; this.dwellProgress=0; this.dwellTargetIdx=-1; this.isMousePressed=false; };
    }
    
    init() {
        this.setupEventListeners();
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('observer') === 'true') {
            document.getElementById('scenarioModal').classList.add('hidden');
            document.getElementById('hud').style.display = 'block';
            this.rlMode = true; 
            
            this.init3D(); 
            
            // Endpoint de observación. Antes estaba incrustado el hub de la
            // colonia (`ws://127.0.0.1:8741`), lo que metía una dirección
            // privada dentro de un motor que se publica. Ahora lo pone quien
            // lo use: window.ALISA_SIM_STREAM_URL = 'ws://donde-sea/...'
            const streamUrl = window.ALISA_SIM_STREAM_URL;
            if (!streamUrl) {
                console.warn('[CabinetEscapeGame] modo observador pedido, pero no hay ' +
                             'window.ALISA_SIM_STREAM_URL. No se abre ningún socket.');
                return;
            }
            const ws = new WebSocket(streamUrl);
            ws.onmessage = (event) => {
                try {
                    const frame = JSON.parse(event.data);
                    if (frame.type === 'state') {
                        const obs = frame.data;
                        const meta = obs.meta || {};
                        const drawers = obs.drawers || [];
                        
                        document.getElementById('vDrawers').textContent = String(meta.num_drawers || 0);
                        document.getElementById('vAttempts').textContent = String(meta.attempts || 0);
                        document.getElementById('vOptimal').textContent = String(meta.optimal || 0);
                        if (meta.found) document.getElementById('vStars').textContent = '★★★';
                        
                        for (let i = 0; i < drawers.length; i++) {
                            const d = drawers[i];
                            let dMesh = null;
                            this.factory.scene.traverse(c => {
                                if (c.userData && c.userData.drawerIdx === i) {
                                    if (!c.userData.isHandle) dMesh = c;
                                }
                            });
                            
                            if (dMesh) {
                                dMesh.position.z = d.status === 1 ? 0.2 : 0; 
                                if (d.bsp_feedback >= 0) {
                                    let t = d.bsp_feedback; 
                                    let r = Math.min(255, t * 510);
                                    let b = Math.min(255, (1 - t) * 510);
                                    dMesh.material.color.setRGB(r/255, 0.4, b/255);
                                } else {
                                    dMesh.material.color.setHex(0x5a4a3a);
                                }
                            }
                        }
                    }
                } catch(e) {}
            };
            this.animate();
        } else if (window.RLMode || urlParams.get('autoplay') === 'true' || urlParams.get('agent') === 'true') {
            document.getElementById('scenarioModal').classList.add('hidden');
            this.init3D(); this.newEpisode(); this.animate();
            if (urlParams.get('autoplay') === 'true' || urlParams.get('agent') === 'true') {
                this.toggleAutoPlay();
            }
        }
    }

    getAgentChoice() {
        const agnt = document.getElementById('inAgent').value;
        if (agnt === 'areaGreedy') return this.bspEngine.selectAreaGreedy();
        
        if (agnt === 'qlearning') {
            if (!this.rlTensorData) {
                console.warn("[ALISA ML] Q-Table Tensor not loaded yet. Falling back to Random.");
                return this.bspEngine.selectRandom();
            }
            let maxQ = -Infinity;
            let bestIdx = -1;
            const n = this.sys.partition.leaves.length;
            for (let i = 0; i < n; i++) {
                if (!this.sys.tried[i] && !this.sys.montyRevealed.includes(i)) {
                    if (this.rlTensorData[i] > maxQ) {
                        maxQ = this.rlTensorData[i];
                        bestIdx = i;
                    }
                }
            }
            // Add a little bit of stochasticity if all Qs are identical or if bestIdx is not found
            if (bestIdx === -1) return this.bspEngine.selectRandom();
            return bestIdx;
        }

        if (agnt === 'bayesian') {
            this.bspEngine.syncState(this.sys.tried, this.sys.montyRevealed, this.sys.targetId, this.sys.snakeIds, this.sys.partition);
            const n = this.sys.partition.leaves.length;
            const areas = this.sys.partition.leaves.map(l => l.w * l.h);
            const ta = areas.reduce((s,a)=>s+a,0);
            const post = areas.map(a => a/ta);
            for (let i=0; i<n; i++) { if (this.sys.tried[i] || this.sys.montyRevealed.includes(i)) post[i] = 0; }
            const tp = post.reduce((s,p)=>s+p,0);
            if (tp <= 0) return -1;
            for (let i=0; i<n; i++) post[i] /= tp;
            let bi=-1, bp=-1;
            for (let i=0; i<n; i++) { if (post[i] > bp) { bp=post[i]; bi=i; } }
            return bi;
        }
        return this.bspEngine.selectRandom();
    }

    startSimulation() {
        const seed = parseInt(document.getElementById('mSeed').value) || 42;
        document.getElementById('inSeed').value = seed;
        document.getElementById('inCuts').value = document.getElementById('mCuts').value;
        document.getElementById('inSize').value = document.getElementById('mSize').value;

        if (this.currentStage === 1) {
            document.getElementById('inSignal').value = 'mastermind';
            document.getElementById('inSnake').value = 'off';
            document.getElementById('mSize').value = 'growing';
            document.getElementById('inSize').value = 'growing';
            this.isDarkMode = false;
        } else if (this.currentStage === 2) {
            document.getElementById('inSignal').value = 'minesweeper';
            document.getElementById('inSnake').value = 'on';
            this.isDarkMode = false;
        } else if (this.currentStage === 3) {
            document.getElementById('inSignal').value = 'blind';
            document.getElementById('inSnake').value = 'on';
            this.isDarkMode = true;
        }

        const mode = document.getElementById('mMode').value;
        this.currentMode = mode === 'human' ? 'play' : 'ai';

        document.getElementById('scenarioModal').classList.add('hidden');
        document.getElementById('hud').style.display = 'block';
        document.getElementById('minimap-wrap').style.display = 'block';
        document.getElementById('history').style.display = 'block';
        document.getElementById('mode-badges').style.display = 'flex';

        if (this.currentMode === 'ai') document.getElementById('controls').style.display = 'block';
        if (this.isDarkMode) document.getElementById('camcorder').style.display = 'flex';

        document.getElementById('vStage').textContent = this.currentStage;

        this.simulationRunning = true;
        this.introPhase = 'intro_raccoon_run';
        this.introTimer = 0;

        this.init3D();
        this.newEpisode();
        this.animate();
    }

    randomizeCabinetSize(seed) {
        const sizeMode = document.getElementById('inSize').value;
        const rng = mulberry32(seed + 99999);
        // El MISMO `NaN` que en `randomizeCuts`, y aquí se colaba en la
        // geometría: con `episodes` sin inicializar, `cabinetAspect` y
        // `cabinetScale` salían NaN y three escupía decenas de
        // «Computed radius is NaN» — el mueble se construía con medidas
        // imposibles. Un mismo descuido en dos métodos hermanos.
        let levelNumber = (this.sys.episodes ?? 0) + 1;
        if (sizeMode === 'random') { this.factory.cabinetAspect = 0.5 + rng() * 0.6; this.factory.cabinetScale = 0.6 + rng() * 0.5; }
        else if (sizeMode === 'growing') { this.factory.cabinetAspect = 0.5 + (levelNumber % 5) * 0.12; this.factory.cabinetScale = 0.7 + Math.min(levelNumber * 0.05, 0.4); }
        else { this.factory.cabinetAspect = 0.7; this.factory.cabinetScale = 1.0; }
    }

    randomizeCuts(baseCuts, seed) {
        const sizeMode = document.getElementById('inSize').value;
        if (sizeMode === 'fixed') return baseCuts;
        // ⚠️ Esto era `this.sys.episodes + 1` a secas. En la PRIMERA partida
        // `episodes` aún no existe, así que salía `NaN`, y ese NaN llegaba hasta
        // `fractalPartition` como profundidad. Como `depth >= NaN` es siempre
        // falso, la partición recursaba sin fondo y el juego moría al arrancar
        // con «Maximum call stack size exceeded» — un error que no menciona ni
        // los episodios ni los cortes.
        let levelNumber = (this.sys.episodes ?? 0) + 1;
        if (sizeMode === 'growing') {
            const growth = Math.floor((levelNumber - 1) / 2);
            return Math.max(2, Math.min(5, baseCuts + growth));
        }
        const rng = mulberry32(seed + 88888);
        const delta = Math.floor(rng() * 3) - 1;
        return Math.max(2, Math.min(6, baseCuts + delta));
    }

    newEpisode() {
        const seed = parseInt(document.getElementById('inSeed').value) || 42;
        const baseCuts = parseInt(document.getElementById('inCuts').value) || 3;
        const cuts = this.randomizeCuts(baseCuts, seed);
        
        if (!this.factory) return;
        this.randomizeCabinetSize(seed);
        
        const partition = this.bspEngine.fractalPartition(cuts, seed);
        const mode = document.getElementById('inSignal').value;
        const snakeMode = document.getElementById('inSnake').value;
        
        this.sys.initEpisode(partition, seed, this.currentStage, mode, snakeMode);
        this.sys.episodes++;

        // Load RL Tensor from Headquarters if Q-Learning Agent is active
        const agnt = document.getElementById('inAgent').value;
        if (agnt === 'qlearning') {
            fetch('../tensors/e028de382221a846.json')
                .then(r => r.json())
                .then(data => {
                    this.rlTensorData = data;
                    console.log("[ALISA ML] Q-Table Tensor Loaded successfully.", data);
                })
                .catch(e => console.error("[ALISA ML] Failed to load Tensor Q-Table", e));
        }
        
        this.viewMode = 'freeroam';
        this.viewTransition = 1.0;
        const btnBackRoom = document.getElementById('btnBackRoom');
        if(btnBackRoom) btnBackRoom.style.display = 'none';

        this.gamePhase3D = 'playing';
        this.roomTimer = 3.0;
        this.ceilingDead = false;
        
        if (this.factory.ceilingBulb) this.factory.ceilingBulb.intensity = Math.max(1.0, 3.0 - (this.isDarkMode?2:0));
        if (this.factory.seekerGroup) { 
            const flg = this.factory.seekerGroup.getObjectByName('flashLightGroup'); 
            if (flg) flg.visible = false; 
        }
        
        this.floorItems = this.factory.populateFloorItems(this.currentStage, partition.leaves.length, this.sys.padlockKeyLocId);
        
        this.jumpscare.resetState();
        if (document.getElementById('cam-flash')) document.getElementById('cam-flash').innerText = '🔦 ON (F)';
        if (document.getElementById('cam-batt')) { document.getElementById('cam-batt').innerText = '[■■■■]'; document.getElementById('cam-batt').classList.remove('low-batt'); }

        this.factory.build3DCabinet(partition, this.sys.lockedDrawers);
        this.factory.hide3DModels();

        if (document.getElementById('vStars')) document.getElementById('vStars').textContent = '';
        
        this.particles = [];
        this.shakeTimer = 0;
        
        this.updateHUD();
        this.updateHistoryPanel();
    }

    init3D() {
        if (this.factory) return;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(this.isDarkMode ? 0x050508 : 0x1a1a2e);
        scene.fog = new THREE.FogExp2(this.isDarkMode ? 0x050508 : 0x1a1a2e, this.isDarkMode ? 0.12 : 0.05);
        scene.add(new THREE.AmbientLight(0x444466, this.isDarkMode ? 0.05 : 0.4));
        if (!this.isDarkMode) { const dl = new THREE.DirectionalLight(0xffeedd, 0.6); dl.position.set(2,4,3); dl.castShadow=true; scene.add(dl); }

        this.factory = new CabinetEnvironmentFactory(scene);
        this.factory.buildRoom(this.isDarkMode);
        
        this.camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 100);
        this.camera.position.set(0, 2.4, 6.5);
        this.camera.lookAt(0, 1.0, -2);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(innerWidth, innerHeight);
        
        this.threeControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.threeControls.target.set(0, 1.0, -2);
        this.threeControls.maxDistance = 15;
        this.threeControls.minDistance = 0.5;
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.isDarkMode ? 0.6 : 1.0;
        
        document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';
        
        window.addEventListener('resize', () => { 
            this.camera.aspect = window.innerWidth/window.innerHeight; 
            this.camera.updateProjectionMatrix(); 
            this.renderer.setSize(window.innerWidth, window.innerHeight); 
        });

        this.preloadModels();
        if (this.isDarkMode) {
            const ls = this.factory.setupFlashlights();
            this.flashLight = ls.flashLight;
            this.volumetricBeam = ls.volumetricBeam;
            this.flashDust = ls.flashDust;
        }
    }

    preloadModels() {
        AssetManager.loadModelAsync('../props/models/Raccoon.glb').then(scene => { 
            this.factory.rabbitModel=scene.clone(); 
            this.factory.rabbitModel.scale.set(0.15,0.15,0.15); 
            this.factory.rabbitModel.visible=false; 
            this.factory.rabbitModel.traverse(c=>{if(c.isMesh)c.castShadow=true;}); 
            this.factory.scene.add(this.factory.rabbitModel); 
        });

        AssetManager.loadModelAsync('../props/models/Snake.glb').then(scene => { 
            this.factory.snakeModel=scene.clone(); 
            this.factory.snakeModel.scale.set(0.3,0.3,0.3); 
            this.factory.snakeModel.visible=false; 
            this.factory.scene.add(this.factory.snakeModel); 
        });

        AssetManager.loadModelAsync('../props/models/Generic Male.glb').then(scene => {
            this.factory.seekerModel=scene.clone(); 
            this.factory.seekerModel.scale.set(0.9,0.9,0.9); 
            this.factory.seekerModel.traverse(c=>{
                if(c.isMesh)c.castShadow=true; 
                if(c.name==='Hand.R'||c.name==='Hand_R')this.__rightHand=c;
            });
            
            const anims = scene.userData.animations || [];
            if (anims && anims.length) { 
                this.seekerMixer = new THREE.AnimationMixer(this.factory.seekerModel); 
                this.seekerAnimMap = this.mapAnimations(anims, this.seekerMixer); 
                this.seekerCurAnim = this.playCharAnim(this.seekerMixer, this.seekerAnimMap, '', 'idle'); 
            }
            
            this.factory.seekerGroup = new THREE.Group(); 
            this.factory.seekerGroup.add(this.factory.seekerModel); 
            this.factory.seekerModel.rotation.y = Math.PI; 
            this.factory.seekerGroup.position.set(0,0,2.5); 
            this.factory.scene.add(this.factory.seekerGroup);
            
            const flg = new THREE.Group(); flg.name = 'flashLightGroup';
            AssetManager.loadModelAsync('../props/models/Flashlight.glb').then(gFl => {
                const hl = gFl.clone(); 
                hl.scale.set(0.015, 0.015, 0.015); 
                hl.traverse(c => { if(c.isMesh) c.castShadow = true; });
                const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), new THREE.MeshBasicMaterial({color: 0xffffee})); 
                lens.position.z = -0.17; lens.name = 'flashlightLens'; hl.add(lens);
                this.factory.flashlightTemplate = hl.clone(); flg.add(hl);
            });
            
            if (this.flashLight) { flg.add(this.flashLight); flg.add(this.flashLight.target); this.flashLight.position.set(0,0,0); this.flashLight.target.position.set(0,0,-8); }
            if (this.volumetricBeam) { this.volumetricBeam.position.set(0,0,0); flg.add(this.volumetricBeam); }
            if (this.flashDust) { this.flashDust.position.set(0,0,0); flg.add(this.flashDust); }
            flg.position.set(0.3, 1.0, -0.3); this.factory.seekerGroup.add(flg);
        });
        
        AssetManager.loadModelAsync('../props/models/Ghost.glb').then(scene => {
            this.factory.ghostModel = scene.clone(); 
            this.factory.ghostModel.scale.set(0.7,0.7,0.7); 
            this.factory.ghostModel.traverse(c=>{if(c.isMesh)c.castShadow=true;});
            const anims = scene.userData.animations || [];
            if (anims && anims.length) { 
                this.phantomMixer=new THREE.AnimationMixer(this.factory.ghostModel); 
                this.phantomAnimMap=this.mapAnimations(anims, this.phantomMixer); 
            }
        });
    }

    mapAnimations(animations, mixer) {
        const m = {}; if (!animations || !animations.length) return m;
        animations.forEach((clip, idx) => { const n = clip.name.toLowerCase(); const a = mixer.clipAction(clip); if (n.includes('idle')||n.includes('stand')) m.idle=a; else if (n.includes('run')||n.includes('walk')) m.run=a; m['anim_'+idx]=a; });
        if (!m.idle) m.idle = m.anim_0 || m.run; if (!m.run) m.run = m.anim_0 || m.idle; return m;
    }

    playCharAnim(mixer, animMap, curRef, state) {
        if (!mixer || !animMap || curRef === state) return curRef;
        if (curRef && animMap[curRef]) animMap[curRef].fadeOut(0.3);
        if (animMap[state]) { animMap[state].reset().fadeIn(0.3).play(); return state; }
        return curRef;
    }

    setupEventListeners() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.threeDummyVec = new THREE.Vector3();

        document.addEventListener('pointermove', e => {
            if (!this.renderer) return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX-rect.left)/rect.width)*2-1;
            this.mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
            this.screenMouseX = e.clientX; this.screenMouseY = e.clientY;
        });

        document.addEventListener('pointerdown', e => {
            if (e.button !== 0 || this.rlMode || this.sys.done || this.autoPlaying || this.gamePhase3D !== 'playing' || !this.renderer) return;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.viewMode === 'freeroam') {
                const cabHits = this.raycaster.intersectObjects(this.factory.cabinetGroup ? this.factory.cabinetGroup.children : [], true);
                if (cabHits.length > 0) window.enterCabinetMode();
            }
            this.isMousePressed = true;
        });

        document.addEventListener('pointerup', e => {
            if (e.button === 0) {
                this.isMousePressed = false; this.dwellProgress = 0; this.dwellTargetIdx = -1;
                const scanUI = document.getElementById('scan-ui');
                if (scanUI) scanUI.style.display = 'none';
            }
        });

        document.addEventListener('keydown', e => { 
            if (e.key.toLowerCase() === 'f') this.toggleFlashlight(); 
            if (e.code === 'Space') this.dashEvade();
        });

        const c = document.getElementById('c');
        if (c) {
            c.addEventListener('mousemove', e => {
                if (!this.sys.partition) return;
                const CW = c.width, CH = c.height;
                const rW = CW*0.92, rH = CH*0.92;
                const ox = (CW-rW)/2, oy = (CH-rH)/2;
                const rect = c.getBoundingClientRect();
                const mx = (e.clientX - rect.left) * (CW / rect.width);
                const my = (e.clientY - rect.top) * (CH / rect.height);
                const nx = (mx-ox)/rW, ny = (my-oy)/rH;
                this.hoveredId = -1;
                for (let i = 0; i < this.sys.partition.leaves.length; i++) { 
                    const l = this.sys.partition.leaves[i]; 
                    if (nx >= l.x && nx <= l.x+l.w && ny >= l.y && ny <= l.y+l.h) { this.hoveredId = i; break; } 
                }
            });

            c.addEventListener('click', e => {
                if (this.rlMode || this.sys.done || this.autoPlaying) return;
                if (this.hoveredId >= 0 && !this.sys.tried[this.hoveredId] && !this.sys.montyRevealed.includes(this.hoveredId)) {
                    this.triggerDrawerSelection(this.hoveredId);
                }
            });
        }
    }

    dashEvade() {
        if (!this.snakeLungeActive) return;
        this.snakeLungeActive = false;
        this.show3DBanner('💨 EVADED!', 1500);
        window.exitCabinetMode();
    }

    toggleFlashlight() {
        if (this.sys.hudEnergy <= 0 && !this.sys.hasFlashlight) return;
        this.sys.hasFlashlight = !this.sys.hasFlashlight;
        document.getElementById('cam-flash').innerText = this.sys.hasFlashlight ? '🔦 ON (F)' : '🔦 OFF (F)';
    }

    show3DBanner(text, duration) {
        const el = document.getElementById('phase-banner');
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), duration || 2000);
    }

    spawnParticles(leaf, color) {
        const cx = leaf.x + leaf.w / 2, cy = leaf.y + leaf.h / 2;
        for (let i = 0; i < 12; i++) { 
            const angle = Math.random() * Math.PI * 2; const speed = 0.2 + Math.random() * 0.4; 
            this.particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color }); 
        }
    }

    triggerDrawerSelection(idx) {
        const res = this.sys.selectDrawer(idx);
        if (!res.valid) return;
        this.factory.openDrawer3D(idx);

        if (res.triggeredSnakeLunge) {
            this.snakeLungeActive = true;
            this.snakeLungeTimer = 0.5; 
            this.snakeLungeTargetIdx = idx;
            this.jumpscare.triggerJumpscare(null, null, null, null, null, null, null, () => {});
            this.show3DBanner('⚠️ SNAKE! DODGE (SPACE)!', 500);
            return;
        }

        if (res.foundRaccoon) {
            this.sys.score += res.reward;
            this.spawnParticles(this.sys.partition.leaves[idx], '#44ff88');
            const b = document.getElementById('banner'); b.textContent = '🦝 FOUND!'; b.style.color = '#44ff88'; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1500);
            this.factory.show3DModel('rabbit', this.sys.partition.leaves[idx], this.sys.done, this.sys.found);
            
            const optimal = this.sys.getOptimal();
            const diff = this.sys.attempts - optimal;
            let stars = { css: 'red', text: '☆☆☆' };
            if (diff <= 0) stars = { css: 'green', text: '★★★' };
            else if (diff === 1) stars = { css: 'yellow', text: '★★☆' };
            else if (diff === 2) stars = { css: 'yellow', text: '★☆☆' };
            document.getElementById('vStars').innerHTML = `<span class="hud-val ${stars.css}">${stars.text}</span>`;
            
            setTimeout(() => { this.sys.snakeIds.forEach(si => { this.factory.show3DModel('snake', this.sys.partition.leaves[si], this.sys.done, this.sys.found); this.sys.bspFeedback[si] = -2; }); }, 400);
        } else {
            this.sys.score += res.reward;
            if (res.foundBattery) {
                this.show3DBanner('+25% ENERGY 🔋', 1500);
                this.factory.showBattery3D(this.sys.partition.leaves[idx]);
                this.spawnParticles(this.sys.partition.leaves[idx], '#34c759');
            }
            if (idx === this.sys.padlockKeyLocId) {
                this.sys.hasPadlockKey = true;
                this.show3DBanner('🔑 PADLOCK KEY FOUND!', 2000);
            }
            
            this.shakeTimer = 0.3;
            const warmColor = res.bspDist <= 1 ? '#ffaa44' : res.bspDist <= 2 ? '#ff8844' : '#ff4444';
            this.spawnParticles(this.sys.partition.leaves[idx], warmColor);
            
            if (this.sys.done) {
                const b = document.getElementById('banner'); b.textContent = '❌ EXHAUSTED'; b.style.color = '#ff4444'; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1500);
                document.getElementById('vStars').innerHTML = '<span class="hud-val red">💀</span>';
            }
        }
        this.updateHUD(); this.updateHistoryPanel();
    }

    stepSimulation(actionIdx) {
        if (this.sys.done) return { obs: this.sys.getObservationVector(), reward: 0, done: true }; 
        if (this.sys.montyRevealed.includes(actionIdx)) return { obs: this.sys.getObservationVector(), reward: -0.1, done: false }; 
        
        let prevScore = this.sys.score;
        this.triggerDrawerSelection(actionIdx);
        let reward = this.sys.score - prevScore;
        
        let result = { obs: this.sys.getObservationVector(), reward: reward, done: this.sys.done }; 
        
        // Telemetría opcional. El destino lo fija la aplicación
        // (window.ALISA_TELEMETRY_URL); el motor no lleva ninguna dirección
        // incrustada — antes apuntaba al hub de la colonia.
        if (window.ALISA_STREAM_TELEMETRY && window.ALISA_TELEMETRY_URL) {
            let now = performance.now();
            if (!this._lastBcast || (now - this._lastBcast > 66)) {
                this._lastBcast = now;
                fetch(window.ALISA_TELEMETRY_URL + '/' + window.ALISA_STREAM_SIM_NAME, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(result.obs)
                }).catch(e => {});
            }
        }
        return result; 
    }

    pickUpFloorItem(meshNode, iType) {
        if (iType === 'box') {
            const fi = this.floorItems.find(i => i.mesh === meshNode);
            if (fi) {
                if (fi.contents === 'battery' || fi.contents === 'battery_from_box') {
                    this.show3DBanner('DROPPED: BATTERY!', 1500); 
                    iType = 'battery'; 
                } else if (fi.contents === 'key') {
                    this.sys.hasPadlockKey = true;
                    this.show3DBanner('🔑 PADLOCK KEY FOUND!', 2000);
                } else {
                    this.show3DBanner('EMPTY BOX', 800);
                }
            }
            if (this.factory.floorItemsGroup && meshNode) this.factory.floorItemsGroup.remove(meshNode);
            this.floorItems = this.floorItems.filter(i => i.mesh !== meshNode);
            if (iType !== 'battery') { this.updateHUD(); return; }
        }

        if (iType === 'flashlight') {
            if (!this.sys.hasFlashlight) {
                this.sys.hasFlashlight = true;
                if (this.factory.seekerGroup) { 
                    const flg = this.factory.seekerGroup.getObjectByName('flashLightGroup'); 
                    if (flg) flg.visible = true; 
                }
                this.show3DBanner('FLASHLIGHT ACQUIRED 🔦', 1500);
            }
        } else if (iType === 'battery' || iType === 'battery_from_box') {
            this.sys.pickUpBattery();
            this.show3DBanner('+25% ENERGY 🔋', 1500);
        }
        if (iType !== 'battery_from_box' && this.factory.floorItemsGroup && meshNode) this.factory.floorItemsGroup.remove(meshNode);
        this.floorItems = this.floorItems.filter(i => i.mesh !== meshNode);
        this.updateHUD();
    }

    submitTelemetry() {
        if (this._telemetrySubmitted) return;
        this._telemetrySubmitted = true;
        MMOClient.submitTelemetry(
            'cabinet_escape',
            this.sys.score,
            { attempts: this.sys.attempts, dead: this.sys.dead },
            this.sys.attemptHistory
        );
    }

    autoPlayTick() {
        if (!this.autoPlaying) return;
        if (this.sys.done) { this.agentSeed++; document.getElementById('inSeed').value = this.agentSeed; this.newEpisode(); return; }

        if (!this.sys.hasFlashlight && this.isDarkMode) {
            const fl = this.floorItems.find(i => i.type === 'flashlight');
            if (fl) { 
                if (this.viewMode !== 'freeroam') { window.exitCabinetMode(); return; }
                if (this.dwellTargetIdx !== fl.id) { this.dwellTargetIdx = fl.id; this.dwellProgress = 0; }
                return; 
            }
        }
        if (this.sys.hudEnergy < 50) {
            const bat = this.floorItems.find(i => i.type === 'battery');
            if (bat) { 
                if (this.viewMode !== 'freeroam') { window.exitCabinetMode(); return; }
                if (this.dwellTargetIdx !== bat.id) { this.dwellTargetIdx = bat.id; this.dwellProgress = 0; }
                return; 
            } else {
                const box = this.floorItems.find(i => i.type === 'box');
                if (box) {
                    if (this.viewMode !== 'freeroam') { window.exitCabinetMode(); return; }
                    if (this.dwellTargetIdx !== box.id) { this.dwellTargetIdx = box.id; this.dwellProgress = 0; }
                    return;
                }
            }
        }

        if (this.viewMode === 'freeroam') { window.enterCabinetMode(); return; }

        if (this.dwellTargetIdx === -1) {
            const choice = this.getAgentChoice();
            if (choice < 0) { this.agentSeed++; document.getElementById('inSeed').value = this.agentSeed; this.newEpisode(); return; }
            this.dwellTargetIdx = choice;
            this.dwellProgress = 0;
        }
    }

    toggleAutoPlay() {
        const btn = document.getElementById('btnStart');
        if (this.autoPlaying) { 
            this.autoPlaying = false; 
            clearInterval(this.autoTimer); 
            this.autoTimer = null; 
            btn.textContent = '▶ AUTO'; 
        } else { 
            this.autoPlaying = true; 
            this.agentSeed = parseInt(document.getElementById('inSeed').value) || 1; 
            btn.textContent = '⏹ STOP'; 
            btn.style.background = 'linear-gradient(135deg, #ff3b30, #ff6b6b)'; 
            this.startAutoTimer(); 
        }
    }

    startAutoTimer() { 
        clearInterval(this.autoTimer); 
        const speed = parseInt(document.getElementById('inSpeed').value) || 4; 
        this.autoTimer = setInterval(() => this.autoPlayTick(), Math.max(30, 600/speed)); 
    }

    updateHUD() {
        const n = this.sys.partition ? this.sys.partition.leaves.length : 0;
        const eD = document.getElementById('vDrawers'); if(eD) eD.textContent = n;
        const eA = document.getElementById('vAttempts'); if(eA) eA.textContent = `${this.sys.attempts}/${n}`;
        const eO = document.getElementById('vOptimal'); if(eO) eO.textContent = n > 0 ? this.sys.getOptimal() : 0;
        const eS = document.getElementById('vScore'); if(eS) eS.textContent = this.sys.score.toFixed(1);
        const eSn = document.getElementById('vSnakes'); if(eSn) eSn.textContent = this.sys.snakeIds.length;
        const eE = document.getElementById('vEpisodes'); if(eE) eE.textContent = this.sys.episodes;
        const eEn = document.getElementById('vEnergy'); if(eEn) eEn.textContent = Math.round(this.sys.hudEnergy) + '%';
        const eW = document.getElementById('vWinRate'); if(eW) eW.textContent = this.sys.episodes > 0 ? Math.round(this.sys.wins / this.sys.episodes * 100) + '%' : '—';
    }

    updateHistoryPanel() {
        const list = document.getElementById('histList');
        if (!list) return;
        const mode = this.sys.mode;
        if (mode === 'gradient' || mode === 'blind') { list.innerHTML = '<div style="color:#555;font-size:10px;">No feedback in this mode</div>'; return; }
        
        let html = '';
        for (const h of this.sys.attemptHistory) {
            if (h.snake) { html += `<div class="hist-row" style="color:#ff2222;">#${h.order}: Drawer ${h.idx} → 🐍 BITTEN!</div>`; }
            else if (h.dist === 0) { html += `<div class="hist-row hist-found">#${h.order}: Drawer ${h.idx} → 🦝 FOUND!</div>`; }
            else if (h.battery) { html += `<div class="hist-row" style="color:#34c759;font-weight:bold;">#${h.order}: Drawer ${h.idx} → 🔋 BATTERY!</div>`; }
            else if (mode === 'minesweeper') { 
                const mc = h.mineCount !== undefined ? h.mineCount : '?'; 
                const dangerColor = mc === 0 ? '#666' : mc === 1 ? '#4488ff' : '#ff4444'; 
                html += `<div class="hist-row" style="color:${dangerColor};">#${h.order}: Drawer ${h.idx} → 💣${mc}${h.nearRabbit?' 🦝!':''}</div>`; 
            }
            else { 
                const icon = h.dist <= 1 ? '🔥' : h.dist <= 2 ? '🌡️' : '❄️'; 
                const cls = h.dist <= 1 ? 'hist-hot' : h.dist <= 2 ? 'hist-warm' : 'hist-cold'; 
                html += `<div class="hist-row ${cls}">#${h.order}: Drawer ${h.idx} → dist ${h.dist} ${icon}</div>`; 
            }
        }
        list.innerHTML = html || '<div style="color:#555;font-size:10px;">Click a drawer</div>';
    }

    render2D(dt) {
        const c = document.getElementById('c');
        if (!c || !this.sys.partition) return;
        const ctx = c.getContext('2d');
        const CW = c.width, CH = c.height;
        ctx.clearRect(0, 0, CW, CH);
        const rW = CW * 0.92, rH = CH * 0.92;
        let sx = 0, sy = 0;
        if (this.shakeTimer > 0) { sx = (Math.random()-0.5)*8; sy = (Math.random()-0.5)*8; this.shakeTimer -= dt; }
        const ox = (CW - rW) / 2 + sx, oy = (CH - rH) / 2 + sy;
        const toX = n => ox + n * rW, toY = n => oy + n * rH, toW = n => n * rW, toH = n => n * rH;
        
        ctx.fillStyle = '#8B6540'; ctx.fillRect(ox, oy, rW, rH);
        
        const mode = this.sys.mode;
        this.sys.partition.leaves.forEach((l, i) => {
            const px = toX(l.x), py = toY(l.y), pw = toW(l.w), ph = toH(l.h);
            const isMonty = this.sys.montyRevealed.includes(i);
            const isSnakeRevealed = (this.sys.done && this.sys.snakeIds.includes(i));
            
            if (this.sys.dead && this.sys.snakeIds.includes(i) && this.sys.tried[i]) ctx.fillStyle = '#3a0a0a';
            else if (this.sys.found && i === this.sys.targetId) ctx.fillStyle = '#1a4020';
            else if (isSnakeRevealed && !this.sys.tried[i]) ctx.fillStyle = '#2a1515';
            else if (this.sys.tried[i]) ctx.fillStyle = '#2a1515';
            else if (isMonty) ctx.fillStyle = '#1a1a30';
            else ctx.fillStyle = '#2D1F10';
            
            ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
            const hx = px + pw / 2, hy = py + ph / 2;
            ctx.fillStyle = this.sys.tried[i] ? '#555' : (isMonty ? '#8888cc' : '#A08060');
            ctx.beginPath(); ctx.arc(hx, hy, Math.min(pw, ph) * 0.06, 0, Math.PI * 2); ctx.fill();
            
            if (i === this.hoveredId && !this.sys.tried[i] && !this.sys.done && !isMonty) { ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.strokeRect(px+1, py+1, pw-2, ph-2); }
            if (this.sys.tried[i] && i !== this.sys.targetId && !this.sys.snakeIds.includes(i) && mode !== 'minesweeper') { ctx.strokeStyle = '#ff444488'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px+8, py+8); ctx.lineTo(px+pw-8, py+ph-8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px+pw-8, py+8); ctx.lineTo(px+8, py+ph-8); ctx.stroke(); }
            
            if (mode === 'minesweeper' && (this.sys.tried[i] || isMonty) && this.sys.minesweeperCounts[i] >= 0 && i !== this.sys.targetId && !this.sys.snakeIds.includes(i)) {
                const mc = this.sys.minesweeperCounts[i];
                if (mc > 0) { 
                    const colors = ['#666','#4488ff','#44cc44','#ff4444'];
                    ctx.fillStyle = colors[Math.min(mc,3)]; 
                    ctx.font = `bold ${Math.min(pw,ph)*0.4}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(mc, hx, hy); 
                } else { ctx.fillStyle = '#333333'; ctx.fillRect(px+3,py+3,pw-6,ph-6); }
            }
            if ((mode === 'mastermind' || mode === 'montyHall') && this.sys.tried[i] && this.sys.bspFeedback[i] > 0) {
                const d = this.sys.bspFeedback[i]; ctx.fillStyle = d<=1 ? '#ff6644' : d<=2 ? '#ffcc44' : '#4488ff';
                ctx.font = `bold ${Math.min(pw,ph)*0.25}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(d, hx, hy - Math.min(pw,ph)*0.15);
            }
            if (this.sys.found && i === this.sys.targetId) { ctx.fillStyle = '#44ff88'; ctx.font = `${Math.min(pw,ph)*0.4}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🦝', hx, hy); }
            if (this.sys.snakeIds.includes(i) && (this.sys.tried[i] || this.sys.done)) { ctx.fillStyle = '#ff2222'; ctx.font = `${Math.min(pw,ph)*0.35}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🐍', hx, hy); }
            if (this.sys.batteryIds.includes(i) && this.sys.tried[i]) { ctx.fillStyle = '#34c759'; ctx.font = `${Math.min(pw,ph)*0.35}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🔋', hx, hy); }
            ctx.fillStyle = '#ffffff33'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(i, px+4, py+3);
        });

        ctx.fillStyle = '#A88060'; this.sys.partition.planks.forEach(p => { ctx.fillRect(toX(p.x), toY(p.y), toW(p.w), toH(p.h)); });
        ctx.strokeStyle = '#6B4520'; ctx.lineWidth = 3; ctx.strokeRect(ox, oy, rW, rH);
        
        for (let i = this.particles.length-1; i >= 0; i--) { 
            const p = this.particles[i]; 
            p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt*1.5; 
            if(p.life<=0){ this.particles.splice(i,1); continue; } 
            ctx.globalAlpha=p.life; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(toX(p.x),toY(p.y),3*p.life,0,Math.PI*2); ctx.fill(); 
        }
        ctx.globalAlpha = 1;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const now = performance.now(); const dt = Math.min((now - this.lastTime)/1000, 0.05); this.lastTime = now;
        
        this.render2D(dt);
        if (this.seekerMixer) this.seekerMixer.update(dt);
        if (this.phantomMixer) this.phantomMixer.update(dt);

        if (this.sys && this.sys.done) {
            this.submitTelemetry();
        }

        // Battery drain
        if (!this.sys.done && this.gamePhase3D === 'playing' && this.sys.hasFlashlight) {
            this.sys.hudEnergy -= dt * 1.5;
            if (this.sys.hudEnergy <= 0) { 
                this.sys.hudEnergy = 0; this.sys.hasFlashlight = false; 
                document.getElementById('cam-flash').innerText = '🔦 DEAD';
                this.gamePhase3D = 'jumpscare'; 
                
                this.jumpscare.triggerJumpscare(
                    this.factory.ghostGroup || (this.factory.ghostModel ? (() => { const g=new THREE.Group(); g.add(this.factory.ghostModel); this.factory.scene.add(g); this.factory.ghostGroup=g; return g;})() : null),
                    this.factory.seekerGroup,
                    this.flashLight,
                    this.volumetricBeam,
                    this.camera,
                    this.phantomMixer,
                    this.phantomAnimMap,
                    (msg) => { if (msg==='drag') this.show3DBanner('💀 DRAGGED TO THE VOID!', 2000); else if(msg==='gameover'){this.gamePhase3D='gameover';this.show3DBanner('💀 THE END',3000);if(!this.sys.done){this.sys.done=true;this.sys.dead=true;this.sys.deaths++;this.updateHUD();}}}
                );
            }
        }

        // Snake Lunge Update
        if (this.snakeLungeActive && !this.sys.done) {
            this.snakeLungeTimer -= dt;
            if (this.snakeLungeTimer <= 0) {
                this.snakeLungeActive = false;
                this.sys.dead = true; this.sys.done = true; this.sys.deaths++;
                const idx = this.snakeLungeTargetIdx;
                this.sys.bspFeedback[idx] = -2;
                this.sys.attemptHistory.push({ idx, dist: -2, order: this.sys.attempts, snake: true });
                this.spawnParticles(this.sys.partition.leaves[idx], '#ff0000'); 
                this.show3DBanner('🐍 BITTEN!', '#ff2222'); this.shakeTimer = 0.8;
                
                document.getElementById('vStars').innerHTML = `<span class="hud-val red">💀</span>`;
                this.factory.show3DModel('snake', this.sys.partition.leaves[idx], true, false);
                document.body.classList.add('danger-active');
                setTimeout(() => document.body.classList.remove('danger-active'), 1800);
                setTimeout(() => this.factory.show3DModel('rabbit', this.sys.partition.leaves[this.sys.targetId], true, false), 600);
                this.updateHUD(); this.updateHistoryPanel();
            }
        }

        if (this.isDarkMode) {
            let vi = this.sys.hasFlashlight ? 1.5 : 0; const low = this.sys.hudEnergy<20&&this.sys.hudEnergy>0;
            if (this.sys.hasFlashlight && low) { if(Math.random()<0.2)vi*=(Math.random()*0.5+0.2); document.getElementById('cam-batt').classList.add('low-batt'); }
            else document.getElementById('cam-batt').classList.remove('low-batt');
            if (this.flashLight && this.gamePhase3D!=='jumpscare') this.flashLight.intensity = vi;
            if (this.volumetricBeam && this.gamePhase3D!=='jumpscare') this.volumetricBeam.material.opacity = this.sys.hasFlashlight?0.7:0;
            let ch = Math.ceil(this.sys.hudEnergy/25); document.getElementById('cam-batt').innerText = '[' + '■'.repeat(ch) + '□'.repeat(4-ch) + ']';
            if (this.flashDust) this.flashDust.visible = this.sys.hasFlashlight;
            
            if (this.factory.seekerGroup) {
                const flg = this.factory.seekerGroup.getObjectByName('flashLightGroup');
                if (flg) {
                    if (!this.__flVec) this.__flVec = new THREE.Vector3();
                    if (this.__rightHand) {
                        this.__rightHand.getWorldPosition(this.__flVec);
                        this.factory.seekerGroup.worldToLocal(this.__flVec);
                        this.__flVec.x -= 0.05; this.__flVec.y -= 0.05; this.__flVec.z -= 0.2;
                        flg.position.copy(this.__flVec);
                    }
                    const lens = flg.getObjectByName('flashlightLens');
                    if (lens) lens.material.color.setHex((this.sys.hasFlashlight && this.flashLight.intensity > 0) ? 0xffffee : 0x222222);
                }
            }
        }

        this.factory.updateActiveModels(dt, now);

        if (this.introPhase === 'intro_raccoon_run') {
            this.introTimer += dt;
            if (this.factory.rabbitModel) {
                this.factory.rabbitModel.visible = true;
                this.factory.rabbitModel.position.set(0, 0, 5 - this.introTimer * 5);
                this.factory.rabbitModel.rotation.y = Math.PI; 
            }
            if (this.introTimer >= 1.4) {
                this.introPhase = 'intro_raccoon_hide'; this.introTimer = 0;
                if (this.factory.rabbitModel) this.factory.rabbitModel.visible = false;
                this.show3DBanner('The Raccoon is hiding...', 1500);
            }
        } else if (this.introPhase === 'intro_raccoon_hide') {
            this.introTimer += dt;
            if (this.introTimer >= 1.5) {
                this.introPhase = 'intro_seeker_run'; this.introTimer = 0;
                if (this.seekerMixer && this.seekerAnimMap) this.seekerCurAnim=this.playCharAnim(this.seekerMixer, this.seekerAnimMap, this.seekerCurAnim, 'run');
            }
        } else if (this.introPhase === 'intro_seeker_run') {
            this.introTimer += dt;
            if (this.factory.seekerGroup) {
                const zPos = 5 - this.introTimer * 1.5;
                this.factory.seekerGroup.position.set(0, 0, zPos);
                this.camera.position.z = zPos + 3.0;
                this.threeControls.target.set(0, 1.0, -2);
            }
            if (this.introTimer >= 1.6) {
                this.introPhase = 'intro_camera_zoom'; this.introTimer = 0;
                if (this.seekerMixer && this.seekerAnimMap) this.seekerCurAnim=this.playCharAnim(this.seekerMixer, this.seekerAnimMap, this.seekerCurAnim, 'idle');
            }
        } else if (this.introPhase === 'intro_camera_zoom') {
            this.introTimer += dt;
            const p = Math.min(this.introTimer / 1.5, 1.0);
            const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            const startZ = (this.factory.seekerGroup ? this.factory.seekerGroup.position.z : 2.6) + 3.0;
            const endZ = 5.0;
            this.camera.position.y = 2.4 - (2.4 - 1.8) * ease;
            this.camera.position.z = startZ - (startZ - endZ) * ease;
            
            if (p >= 1.0) {
                this.introPhase = 'done'; this.viewMode = 'freeroam'; this.viewTransition = 1.0;
                if (this.currentMode === 'ai' && !this.autoPlaying) this.toggleAutoPlay();
                if (this.threeControls) this.threeControls.enabled = false;
            }
        }

        if (this.introPhase === 'done') {
            const targetView = (this.viewMode === 'freeroam') ? 1.0 : 0.0;
            this.viewTransition += (targetView - this.viewTransition) * dt * 5.0;
            
            this.camera.position.y = 1.6 + this.viewTransition * 0.2;
            this.camera.position.z = 2.4 + this.viewTransition * 2.6;
            this.camera.position.x = 0;
            
            if (this.threeControls) this.threeControls.enabled = false;
            
            this.camera.rotation.order = 'YXZ';
            const targetYaw = -this.mouse.x * (1.5 * this.viewTransition + 0.2 * (1 - this.viewTransition));
            const targetPitch = this.mouse.y * (0.8 * this.viewTransition + 0.1 * (1 - this.viewTransition));
            
            this.camera.rotation.y += (targetYaw - this.camera.rotation.y) * dt * 8.0;
            this.camera.rotation.x += (targetPitch - this.camera.rotation.x) * dt * 8.0;
            this.camera.rotation.z = 0;
        }

        const scanUI = document.getElementById('scan-ui');
        const scanBar = document.getElementById('scan-bar');
        
        if (this.gamePhase3D === 'playing' && !this.sys.done && this.introPhase === 'done' && (this.isMousePressed || this.autoPlaying)) {
            const dwellRequired = this.currentStage === 1 ? 0.3 : (this.currentStage === 2 ? 0.8 : 1.5);
            let raycastHitId = -1;
            let sx = -100, sy = -100;
            
            if (this.autoPlaying && this.dwellTargetIdx !== -1) {
                raycastHitId = this.dwellTargetIdx;
                if (this.sys.partition && raycastHitId < this.sys.partition.leaves.length) {
                    const leaf = this.sys.partition.leaves[raycastHitId];
                    const W=3.0*this.factory.cabinetAspect*this.factory.cabinetScale, H=2.8*this.factory.cabinetScale;
                    this.threeDummyVec.set((leaf.x+leaf.w/2-0.5)*W, (1-leaf.y-leaf.h/2)*H, 0);
                    if (this.factory.cabinetGroup) this.threeDummyVec.add(this.factory.cabinetGroup.position);
                    this.threeDummyVec.project(this.camera);
                    sx = (this.threeDummyVec.x * .5 + .5) * window.innerWidth;
                    sy = (this.threeDummyVec.y * -.5 + .5) * window.innerHeight;
                } else {
                    const fi = this.floorItems.find(i => i.id === raycastHitId);
                    if (fi && fi.mesh) {
                        this.threeDummyVec.copy(fi.mesh.position);
                        this.threeDummyVec.y += 0.05;
                        if (this.viewMode === 'freeroam') {
                            const dummyCam = this.camera.clone();
                            dummyCam.lookAt(this.threeDummyVec);
                            this.camera.quaternion.slerp(dummyCam.quaternion, dt * 5.0);
                            this.camera.rotation.order = 'YXZ'; 
                        }
                        this.threeDummyVec.project(this.camera);
                        sx = (this.threeDummyVec.x * .5 + .5) * window.innerWidth;
                        sy = (this.threeDummyVec.y * -.5 + .5) * window.innerHeight;
                    }
                }
            } else if (this.isMousePressed) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersectables = [];
                if (this.factory.cabinetGroup) intersectables.push(...this.factory.cabinetGroup.children);
                if (this.factory.floorItemsGroup) intersectables.push(...this.factory.floorItemsGroup.children);
                const hits = this.raycaster.intersectObjects(intersectables, true);
                for (const hit of hits) {
                    let obj = hit.object;
                    while (obj && obj.userData.drawerIdx === undefined && obj !== this.factory.scene) obj = obj.parent;
                    if (obj && obj.userData.drawerIdx !== undefined) {
                        raycastHitId = obj.userData.drawerIdx;
                        sx = this.screenMouseX; sy = this.screenMouseY;
                        break;
                    }
                }
            }

            let isValidTarget = false;
            let isFloorItem = false;
            let localDwellReq = 0.5;
            
            if (raycastHitId !== -1) {
                if (this.sys.partition && raycastHitId < this.sys.partition.leaves.length) {
                    if (!this.sys.tried[raycastHitId] && !this.sys.montyRevealed.includes(raycastHitId)) {
                        if (this.sys.lockedDrawers[raycastHitId] === 'padlock' && !this.sys.hasPadlockKey) {
                            if (this.isMousePressed) { this.show3DBanner('🔒 LOCKED (NEED KEY)', 1000); this.isMousePressed = false; }
                            this.dwellProgress = 0; this.dwellTargetIdx = -1;
                        } else {
                            isValidTarget = true;
                            if (this.sys.lockedDrawers[raycastHitId] === 'plank') localDwellReq = 3.8; 
                            else if (this.sys.lockedDrawers[raycastHitId] === 'padlock') localDwellReq = 1.0; 
                            else localDwellReq = dwellRequired;
                        }
                    }
                } else {
                    const fi = this.floorItems.find(i => i.id === raycastHitId);
                    if (fi) { isValidTarget = true; isFloorItem = true; localDwellReq = (fi.type === 'box') ? 1.5 : 0.5; }
                }
            }

            if (isValidTarget) {
                if (!this.sys.hasFlashlight && this.isDarkMode && !isFloorItem) {
                    if (this.isMousePressed) { this.show3DBanner('YOU NEED A LIGHT SOURCE', 1500); this.isMousePressed = false; }
                    this.dwellProgress = 0; this.dwellTargetIdx = -1;
                } else {
                    if (this.dwellTargetIdx !== raycastHitId) { this.dwellTargetIdx = raycastHitId; this.dwellProgress = 0; }
                    this.dwellProgress += dt;
                    if (this.threeControls && this.isMousePressed) this.threeControls.enabled = false;
                    
                    if (scanUI && scanBar) {
                        scanUI.style.display = 'block'; scanUI.style.left = sx + 'px'; scanUI.style.top = sy + 'px';
                        scanBar.style.strokeDashoffset = 150.8 * (1 - Math.min(this.dwellProgress / localDwellReq, 1.0));
                    }
                    
                    if (this.dwellProgress >= localDwellReq) {
                        if (isFloorItem) {
                            const fi = this.floorItems.find(i => i.id === raycastHitId);
                            if (fi) this.pickUpFloorItem(fi.mesh, fi.type);
                        } else {
                            this.triggerDrawerSelection(raycastHitId);
                        }
                        this.dwellProgress = 0; this.dwellTargetIdx = -1;
                        if (scanUI) scanUI.style.display = 'none';
                        if (this.threeControls) this.threeControls.enabled = true;
                        this.isMousePressed = false;
                    }
                }
            } else {
                this.dwellProgress = 0; this.dwellTargetIdx = -1;
                if (scanUI) scanUI.style.display = 'none';
                if (this.threeControls) this.threeControls.enabled = true;
            }
        } else {
            if (scanUI) scanUI.style.display = 'none';
        }

        if (this.introPhase === 'done' && this.gamePhase3D === 'playing' && !this.ceilingDead) {
            if (this.roomTimer > 0) {
                this.roomTimer -= dt;
                if (this.roomTimer <= 0.5) this.factory.ceilingBulb.intensity = Math.random() > 0.5 ? 2.0 : 0.0;
                else this.factory.ceilingBulb.intensity = 2.0;

                if (this.roomTimer <= 0) {
                    this.factory.ceilingBulb.intensity = 0;
                    this.ceilingDead = true;
                    if (!this.sys.hasFlashlight) {
                        this.gamePhase3D = 'jumpscare';
                        this.jumpscare.triggerJumpscare(
                            this.factory.ghostGroup || (this.factory.ghostModel ? (() => { const g=new THREE.Group(); g.add(this.factory.ghostModel); this.factory.scene.add(g); this.factory.ghostGroup=g; return g;})() : null),
                            this.factory.seekerGroup,
                            this.flashLight,
                            this.volumetricBeam,
                            this.camera,
                            this.phantomMixer,
                            this.phantomAnimMap,
                            (msg) => { if (msg==='drag') this.show3DBanner('💀 DRAGGED TO THE VOID!', 2000); else if(msg==='gameover'){this.gamePhase3D='gameover';this.show3DBanner('💀 THE END',3000);if(!this.sys.done){this.sys.done=true;this.sys.dead=true;this.sys.deaths++;this.updateHUD();}}}
                        );
                    } else {
                        this.show3DBanner('🚨 LIGHTS OUT!', 2000);
                    }
                }
            }
        }

        if (this.gamePhase3D === 'jumpscare') {
            this.jumpscare.update(dt);
        }

        if (this.renderer) this.renderer.render(this.factory.scene, this.camera);
    }
}
