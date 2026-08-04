import * as THREE from 'three';

export class SovereignHaloPlugin {
    constructor(app, config = {}) {
        this.name = 'SovereignHalo';
        this.app = app;
        
        const h = config.height || 1.5;
        const pos = config.position || new THREE.Vector3(0, 0, 0);
        const rot = config.rotation || new THREE.Euler(0, 0, 0);
        const radio = config.radio || 8.5;
        
        this.tickerCanvas = document.createElement('canvas');
        this.tickerCanvas.width = 4096;
        this.tickerCanvas.height = 128;
        this.tCtx = this.tickerCanvas.getContext('2d', { willReadFrequently: true });
        this.tickerTex = new THREE.CanvasTexture(this.tickerCanvas);
        this.tickerTex.minFilter = THREE.LinearFilter;
        this.tickerTex.magFilter = THREE.LinearFilter;
        
        this.tinta  = config.tinta  || '#00ffff';
        this.fuente = config.fuente || '80px monospace';

        const matPantalla = new THREE.MeshBasicMaterial({
            map: this.tickerTex,
            color: new THREE.Color(config.brillo ?? this.tinta),
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.tickerGroup = new THREE.Group();

        // Anillo hologrfico (cilindro sin tapas)
        const anilloGeo = new THREE.CylinderGeometry(radio, radio, h, 64, 1, true);
        const pantalla = new THREE.Mesh(anilloGeo, matPantalla);
        
        this.tickerGroup.add(pantalla);
        this.tickerGroup.position.copy(pos);
        this.tickerGroup.rotation.copy(rot);
        this.app.scene.add(this.tickerGroup);
        
        this.tickerMessages = config.mensajes
            || ["*** ALISA COLONY: ONLINE ***", "WAITING FOR TRANSACTIONS..."];
        this.tickerOffset = this.tickerCanvas.width;
        this.logStream = null;
        this.streamUrl = config.stream === undefined
            ? 'http://127.0.0.1:8741/terminal/logs/stream'
            : config.stream;
        this.velocidad = config.velocidad ?? 150;
        this.filtro = config.filtro || null;
    }
    
    onInit() {
        this.connectHubStream();
    }

    anunciar(linea) {
        if (this.filtro) {
            const r = this.filtro(linea);
            if (r === false) return;
            if (typeof r === 'string') linea = r;
        }
        this.tickerMessages.push(linea);
        if (this.tickerMessages.length > 8) this.tickerMessages.shift();
    }

    setMensajes(lineas) {
        this.tickerMessages = lineas.slice(-8);
    }

    connectHubStream(url = this.streamUrl) {
        if (!url) return;
        try {
            this.logStream = new EventSource(url);
        } catch (e) { return; }

        let fallos = 0;
        this.logStream.onerror = () => {
            if (++fallos >= 2) {
                this.logStream.close();
                this.logStream = null;
                this.anunciar('SIN HUB - LA SALA VA POR SU CUENTA');
            }
        };
        this.logStream.onmessage = (event) => {
            fallos = 0;
            if (!event.data) return;
            try {
                const logData = JSON.parse(event.data);
                if (logData.line) this.anunciar(logData.line);
            } catch(e) {}
        };
    }
    
    onUpdate(dt) {
        // Fondo 100% transparente
        this.tCtx.clearRect(0, 0, this.tickerCanvas.width, this.tickerCanvas.height);

        this.tCtx.fillStyle = this.tinta;
        this.tCtx.font = this.fuente;
        this.tCtx.textAlign = 'left';
        this.tCtx.textBaseline = 'middle';
        
        const padding = 100;
        let fullText = this.tickerMessages.join(`   ${String.fromCharCode(0x25A0)}   `);
        let textWidth = this.tCtx.measureText(fullText).width;
        
        // Offset va hacia la izquierda
        this.tickerOffset -= this.velocidad * dt;
        if (this.tickerOffset < -textWidth) {
            this.tickerOffset = this.tickerCanvas.width;
        }
        
        // Pinta el texto dos veces para dar la vuelta al cilindro sin cortes bruscos
        this.tCtx.fillText(fullText, this.tickerOffset, this.tickerCanvas.height / 2 + 5);
        this.tCtx.fillText(fullText, this.tickerOffset + textWidth + padding, this.tickerCanvas.height / 2 + 5);
        this.tCtx.fillText(fullText, this.tickerOffset + (textWidth + padding)*2, this.tickerCanvas.height / 2 + 5);
        
        this.tickerTex.needsUpdate = true;
        
        // Rotacin sutil del propio holograma
        this.tickerGroup.rotation.y += dt * 0.1;
    }
}
