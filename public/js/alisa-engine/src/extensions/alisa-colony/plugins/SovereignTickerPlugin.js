import * as THREE from 'three';

export class SovereignTickerPlugin {
    constructor(app, config = {}) {
        this.name = 'SovereignTicker';
        this.app = app;
        
        const w = config.width || 24;
        const h = config.height || 1.5;
        const pos = config.position || new THREE.Vector3(0, 0, 0);
        const rot = config.rotation || new THREE.Euler(0, 0, 0);
        
        this.tickerCanvas = document.createElement('canvas');
        this.tickerCanvas.width = 4096;
        this.tickerCanvas.height = 128;
        this.tCtx = this.tickerCanvas.getContext('2d', { willReadFrequently: true });
        this.tickerTex = new THREE.CanvasTexture(this.tickerCanvas);
        this.tickerTex.minFilter = THREE.LinearFilter;
        this.tickerTex.magFilter = THREE.LinearFilter;
        
        // Colores configurables. Estaban clavados en ámbar sobre negro, que es
        // el panel de estación de toda la vida y está bien — pero una sala con
        // otra paleta no debería tener que reescribir el plugin para encajarlo.
        this.tinta  = config.tinta  || '#ffaa00';
        this.fondo  = config.fondo  || '#111111';
        this.fuente = config.fuente || '80px monospace';

        const matPantalla = new THREE.MeshStandardMaterial({
            map: this.tickerTex, emissiveMap: this.tickerTex,
            emissive: new THREE.Color(config.brillo ?? this.tinta),
            emissiveIntensity: config.intensidad ?? 1.5, roughness: 0.2
        });
        const matMarco = new THREE.MeshStandardMaterial({
            color: new THREE.Color(config.marco ?? this.fondo), roughness: 0.8, metalness: 0.5
        });

        this.tickerGroup = new THREE.Group();

        // ⚠️ UN SOLO LIENZO, N CARAS. El teletipo redibuja un canvas de 4096×128
        // cada fotograma; son ~2 MB de textura subidos a la GPU por vuelta. Con
        // cuatro instancias para rodear una sala serían ocho. Aquí las caras
        // COMPARTEN textura y material: se dibuja una vez y se ve desde todos
        // los lados. `caras: 4` + `radio` monta un panel cuadrado colgado.
        const caras = Math.max(1, config.caras || 1);
        const radio = config.radio ?? 0;
        for (let i = 0; i < caras; i++) {
            const a = (i / caras) * Math.PI * 2;
            const cara = new THREE.Group();
            const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matPantalla);
            const marco = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, h + 0.5, 0.2), matMarco);
            marco.position.z = -0.11;
            cara.add(pantalla, marco);
            cara.position.set(Math.sin(a) * radio, 0, Math.cos(a) * radio);
            cara.rotation.y = a;                      // mirando hacia afuera
            this.tickerGroup.add(cara);
        }

        this.tickerGroup.position.copy(pos);
        this.tickerGroup.rotation.copy(rot);
        this.app.scene.add(this.tickerGroup);
        
        this.tickerMessages = config.mensajes
            || ["*** ALISA COLONY: ONLINE ***", "WAITING FOR TRANSACTIONS..."];
        this.tickerOffset = this.tickerCanvas.width;
        this.logStream = null;
        // `null` = no intentar hablar con el hub. Antes la URL estaba clavada.
        this.streamUrl = config.stream === undefined
            ? 'http://127.0.0.1:8741/terminal/logs/stream'
            : config.stream;
        this.velocidad = config.velocidad ?? 150;
        this.filtro = config.filtro || null;   // (linea) => false | string | true
    }
    
    onInit() {
        this.connectHubStream();
    }

    /** Mensajes propios, sin hub. Lo último entra por la derecha. */
    anunciar(linea) {
        // `filtro` decide qué merece salir en el panel. Un teletipo enchufado
        // al log crudo de la colonia acaba enseñando un traceback a la primera
        // visita — cierto, vivo, y pésima carta de presentación. Quien monta el
        // panel decide qué se lee; el plugin no impone criterio.
        if (this.filtro) {
            const r = this.filtro(linea);
            if (r === false) return;
            if (typeof r === 'string') linea = r;
        }
        this.tickerMessages.push(linea);
        if (this.tickerMessages.length > 8) this.tickerMessages.shift();
    }

    /** Reemplaza la lista entera (para un estado, no un evento). */
    setMensajes(lineas) {
        this.tickerMessages = lineas.slice(-8);
    }

    connectHubStream(url = this.streamUrl) {
        // ⚠️ Conectarse a la colonia es una MEJORA, no un requisito. Antes esto
        // abría el EventSource a pelo: sin hub, el navegador reintenta en
        // bucle para siempre y llena la consola de errores de red en una página
        // que funciona perfectamente sin él. Ahora se rinde y se calla.
        if (!url) return;
        try {
            this.logStream = new EventSource(url);
        } catch (e) { return; }

        let fallos = 0;
        this.logStream.onerror = () => {
            if (++fallos >= 2) {
                this.logStream.close();
                this.logStream = null;
                this.anunciar('SIN HUB — LA SALA VA POR SU CUENTA');
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
        this.tCtx.fillStyle = this.fondo;
        this.tCtx.fillRect(0, 0, this.tickerCanvas.width, this.tickerCanvas.height);

        this.tCtx.fillStyle = this.tinta;
        this.tCtx.font = this.fuente;
        this.tCtx.textAlign = 'left';
        this.tCtx.textBaseline = 'middle';
        
        const padding = 100;
        let fullText = this.tickerMessages.join(`   ${String.fromCharCode(0x25A0)}   `);
        let textWidth = this.tCtx.measureText(fullText).width;
        
        this.tickerOffset -= this.velocidad * dt;
        if (this.tickerOffset < -textWidth) {
            this.tickerOffset = this.tickerCanvas.width;
        }
        
        this.tCtx.fillText(fullText, this.tickerOffset, this.tickerCanvas.height / 2 + 5);
        this.tickerTex.needsUpdate = true;
    }
}
