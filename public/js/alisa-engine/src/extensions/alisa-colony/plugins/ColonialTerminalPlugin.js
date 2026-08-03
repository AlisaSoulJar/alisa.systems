import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ColonialTerminalPlugin {
    constructor(app, config = {}) {
        this.name = config.name || 'Terminal_Generic';
        this.app = app;
        
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.rotation = config.rotation || new THREE.Euler(0, 0, 0);
        this.channelId = config.channelId || 'SOMA';
        this.themeColor = config.themeColor || '#00ffcc';
        
        // GLTF Setup
        this.modelUrl = config.modelUrl || null; // e.g. 'props/models/Videogame.glb'
        this.modelScale = config.modelScale || new THREE.Vector3(1, 1, 1);
        this.modelOffset = config.modelOffset || new THREE.Vector3(0, 0, 0);
        this.modelRotation = config.modelRotation || new THREE.Euler(0, 0, 0);
        
        // CSS3D Setup
        this.screenDimensions = config.screenDimensions || { w: 2.6, h: 2.8, cssW: 260, cssH: 280 };
        this.screenOffset = config.screenOffset || new THREE.Vector3(0, 2.2, 0.515);
        this.screenRotation = config.screenRotation || new THREE.Euler(0, 0, 0);
        
        this.terminalGroup = new THREE.Group();
        this.htmlLogs = [];
        this.maxLogs = 15;
        
        this.hasProceduralDesk = config.hasProceduralDesk || false;
    }
    
    onInit() {
        if (this.hasProceduralDesk) {
            this._buildProceduralDesk();
        }
        
        if (this.modelUrl) {
            this._loadGLBNode();
        } else if (!this.hasProceduralDesk) {
            this._buildProceduralMonolith();
        }
        
        this._buildCSS3DScreen();
        
        this.terminalGroup.position.copy(this.position);
        this.terminalGroup.rotation.copy(this.rotation);
        this.app.scene.add(this.terminalGroup);
        
        this._connectStream();
    }
    
    _loadGLBNode() {
        const loader = new GLTFLoader();
        loader.load(this.modelUrl, (gltf) => {
            const model = gltf.scene;
            model.scale.copy(this.modelScale);
            
            // Fix materials to cast/receive shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            model.position.copy(this.modelOffset);
            model.rotation.copy(this.modelRotation);
            
            // We append the Model to the TerminalGroup
            this.terminalGroup.add(model);
        }, undefined, (error) => {
            console.error(`[ColonialTerminalPlugin] Error loading GLB: ${this.modelUrl}`, error);
            this._buildProceduralMonolith(); // Fallback
        });
    }

    _buildProceduralMonolith() {
        // Master Monolith Chassis
        const chassisGeo = new THREE.BoxGeometry(3, 4, 1);
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x111218, roughness: 0.3, metalness: 0.7
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 2; // Floor is at 0
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        this.terminalGroup.add(chassis);
    }
    
    _buildProceduralDesk() {
        const deskGroup = new THREE.Group();
        const deskGeo = new THREE.BoxGeometry(1.5, 0.06, 0.8);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50, roughness: 0.4, metalness: 0.3
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 0.79, 0);
        desk.castShadow = true;
        desk.receiveShadow = true;
        deskGroup.add(desk);

        const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.78);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1a252f, metalness: 0.6 });
        const offsets = [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]];
        offsets.forEach(([ox, oz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(ox, 0.39, oz);
            leg.castShadow = true;
            deskGroup.add(leg);
        });

        this.terminalGroup.add(deskGroup);
    }
    
    _buildCSS3DScreen() {
        const { w, h, cssW, cssH } = this.screenDimensions;
        
        // Depth-Mask: This invisible surface prevents avatars from occluding the CSS3D text when walking behind it
        const maskGeo = new THREE.PlaneGeometry(w, h);
        const maskMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            colorWrite: false, // Don't draw pixels, only write to depth buffer
            depthWrite: true
        });
        const maskMesh = new THREE.Mesh(maskGeo, maskMat);
        // Position mask exactly behind the CSS plane (-0.005 in local Z relative to screenOffset is best, or exactly at screen offset)
        maskMesh.position.copy(this.screenOffset);
        maskMesh.position.z -= 0.005;
        maskMesh.rotation.copy(this.screenRotation);
        this.terminalGroup.add(maskMesh);
        
        // Container
        const div = document.createElement('div');
        div.style.width = `${cssW}px`; 
        div.style.height = `${cssH}px`;
        div.style.backgroundColor = 'rgba(0, 10, 15, 0.85)';
        div.style.border = `2px solid ${this.themeColor}`;
        div.style.boxShadow = `0 0 15px ${this.themeColor}55`;
        div.style.borderTopWidth = '8px';
        div.style.padding = '10px';
        div.style.boxSizing = 'border-box';
        div.style.overflow = 'hidden';
        div.style.color = this.themeColor;
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.pointerEvents = 'auto'; // Will capture events if needed
        
        // Header
        const header = document.createElement('div');
        header.innerHTML = `<strong>CHANNEL: ${this.channelId}</strong><hr style="border-color:${this.themeColor}55">`;
        div.appendChild(header);
        
        // Log Container
        this.logContainer = document.createElement('div');
        this.logContainer.style.flex = '1';
        this.logContainer.style.overflow = 'hidden';
        this.logContainer.style.display = 'flex';
        this.logContainer.style.flexDirection = 'column-reverse'; // Native auto-scroll
        div.appendChild(this.logContainer);
        
        // Assemble CSS3DObject
        this.cssScreen = new CSS3DObject(div);
        this.cssScreen.position.copy(this.screenOffset);
        this.cssScreen.rotation.copy(this.screenRotation);
        
        // Base scale relation: 1 px = 0.01 units
        // So scale multiplier = model logical width / css width. Usually 0.01.
        const scaleMultiplier = w / cssW;
        this.cssScreen.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier); 
        
        this.terminalGroup.add(this.cssScreen);
    }
    
    _connectStream() {
        this.sse = new EventSource('http://127.0.0.1:8741/scumm/stream');
        this.sse.onmessage = (event) => {
            if (event.data.includes("heartbeat")) return;
            try {
                const doc = JSON.parse(event.data);
                if (doc.domain && doc.domain.toUpperCase() === this.channelId.toUpperCase() || this.channelId === 'GLOBAL') {
                    this._appendLog(`[${new Date().toLocaleTimeString()}] ${doc.event_type}<br><span style="color:#aaa">${doc.narrative}</span>`);
                }
            } catch(e) {}
        };
    }
    
    _appendLog(htmlString) {
        const item = document.createElement('div');
        item.style.marginBottom = '6px';
        item.style.borderLeft = `2px solid ${this.themeColor}`;
        item.style.paddingLeft = '5px';
        item.innerHTML = htmlString;
        
        this.logContainer.prepend(item);
        if (this.logContainer.children.length > this.maxLogs) {
            this.logContainer.removeChild(this.logContainer.lastChild);
        }
    }
    
    onUpdate(dt) {}
}
