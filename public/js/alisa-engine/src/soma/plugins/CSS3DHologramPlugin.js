import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/**
 * 🌟 CSS3D HOLOGRAM PLUGIN
 * --------------------------------------------------------------------------
 * Encapsulates the entire CSS3D Rendering pipeline, Raycasting State Machine, 
 * and kinematic Holographic projections for embedded DOM games.
 * Decouples the DOM interactions from the raw HTML files.
 */
export class CSS3DHologramPlugin {
    constructor(renderCore) {
        this.renderCore = renderCore;
        this.camera = renderCore.camera;
        this.scene = renderCore.scene;

        // Abstracted Hologram Machine
        this.cssScene = new THREE.Scene();
        this.css3dRenderer = new CSS3DRenderer();
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0px';
        this.css3dRenderer.domElement.style.pointerEvents = 'none'; // So WebGL traps mouse events initially
        
        // Append CSS3D Layer behind WebGL (if WebGL covers it with transparency)
        // Actually, CSS3D generally overlays, but we manage it dynamically
        const container = document.getElementById('render-container') || document.body;
        container.appendChild(this.css3dRenderer.domElement);

        this.currentCssObject = null;
        this.currentDebugScreen = null; // Used for raycasting clicks
        this.screenMesh = null;

        // ⚠️ El cajón del cartucho. `CSS3DObject` se APROPIA del <iframe>: lo
        // mete en el DOM del CSS3DRenderer, y al sacar el objeto de la escena
        // three dispara su evento 'removed', que BORRA el elemento del DOM.
        // Sin esto, levantarse de una máquina destruye el cartucho y sentarse
        // en la siguiente falla en silencio (`loadMachine` hace un `return` si
        // no encuentra el iframe). Guardamos de dónde salió para devolverlo.
        this.hogarDelCartucho = document.getElementById('romCartridge')?.parentElement || null;

        // Ver la nota del testigo en loadMachine(): invalida los montajes que
        // se quedaron en vuelo cuando ya te has levantado.
        this._selloMontaje = 0;
        this._temporizadorMontaje = null;
        
        // State Machine
        this.screenMode = 'MOUNTED'; // MOUNTED, PROJECTED, FULLSCREEN
        this.statusCallback = null; // Bindable UI log
        this.standUpCallback = null; // Called when Esc is pressed in MOUNTED
        this.isSeated = false;       // Interaction layer guard
        
        // Kinematics Bases
        this.initialCssPos = new THREE.Vector3();
        this.initialCssRot = new THREE.Euler();
        this.initialCssScale = new THREE.Vector3();

        this.targetCssPos = new THREE.Vector3();
        this.targetCssRot = new THREE.Euler();
        this.targetCssScale = new THREE.Vector3();

        // Screen Lighting specific tie (optional but cool)
        this.tiedLight = null;

        // Raycasting
        this.screenRaycaster = new THREE.Raycaster();
        this.mouseVector = new THREE.Vector2();

        this.bindEvents();
    }

    /**
     * Listen to global DOM resizing
     */
    onResize(width, height) {
        this.css3dRenderer.setSize(width, height);
    }

    /**
     * Map logging capability
     */
    setStatusCallback(cb) {
        this.statusCallback = cb;
    }

    /**
     * Set the hook for standing up the player
     */
    setStandUpCallback(cb) {
        this.standUpCallback = cb;
    }

    /**
     * Update the seated context state
     */
    setSeated(state) {
        this.isSeated = state;
    }

    /**
     * Let the plugin drive the screen light for cinematic bloom
     */
    setTiedLight(pointLight) {
        this.tiedLight = pointLight;
    }

    /**
     * Binds the DOM inputs to trigger state machine changes.
     */
    bindEvents() {
        window.addEventListener('pointerdown', (event) => {
            if (!this.isSeated || this.screenMode !== 'MOUNTED' || !this.currentDebugScreen) return;

            this.mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouseVector.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.screenRaycaster.setFromCamera(this.mouseVector, this.camera);
            const intersects = this.screenRaycaster.intersectObject(this.currentDebugScreen);
            
            if (intersects.length > 0) {
                this.setHologramMode('FULLSCREEN');
            }
        });

        window.addEventListener('keydown', (e) => {
            // We use global listeners for keyboard logic to intercept Esc bubbles
            if (e.key === 'Enter') {
                if (this.screenMode === 'PROJECTED') {
                    this.setHologramMode('FULLSCREEN');
                }
            }
            if (e.key === 'Escape') {
                if (this.screenMode === 'FULLSCREEN') {
                    this.setHologramMode('PROJECTED');
                } else if (this.screenMode === 'PROJECTED') {
                    this.setHologramMode('MOUNTED');
                } else if (this.screenMode === 'MOUNTED' && this.isSeated) {
                    if (this.standUpCallback) this.standUpCallback();
                }
            }
        });
    }

    /**
     * Main State Machine Controller 
     */
    setHologramMode(mode) {
        if (!this.currentCssObject) return;
        const iframe = document.getElementById('romCartridge');
        if (!iframe) return;

        // Ensure the fullscreen overlay container exists
        if (!this._fsOverlay) {
            this._fsOverlay = document.createElement('div');
            this._fsOverlay.id = 'hologram-fs-overlay';
            Object.assign(this._fsOverlay.style, {
                position: 'fixed', top: '0', left: '0',
                width: '100vw', height: '100vh',
                zIndex: '99999', display: 'none',
                background: '#000'
            });
            document.body.appendChild(this._fsOverlay);
        }

        if (mode === 'MOUNTED') {
            this.screenMode = mode;
            
            // Restore iframe back to CSS3D if it was fullscreened
            // El que viaja es el envoltorio, no el iframe: ver el bloque de
            // `loadMachine`. Mover un <iframe> lo recarga y reinicia la partida.
            if (this._envoltorio && this._envoltorio.parentElement === this._fsOverlay) {
                this._fsOverlay.style.display = 'none';
                this.currentCssObject.element = iframe;
                // Re-insert into CSS3D div wrapper
                if (this._css3dDivBackup) {
                    this._css3dDivBackup.appendChild(this._envoltorio ?? iframe);
                }
            }

            iframe.style.pointerEvents = 'none'; 
            iframe.style.boxShadow = 'none';
            iframe.style.border = 'none';
            iframe.style.width = '1024px';
            iframe.style.height = '768px';
            iframe.style.position = '';
            this.targetCssPos.copy(this.initialCssPos);
            this.targetCssRot.copy(this.initialCssRot);
            this.targetCssScale.copy(this.initialCssScale);
            try { iframe.contentWindow.document.body.style.cursor = 'default'; } catch(e){}
            
        } else if (mode === 'PROJECTED') {
            this.screenMode = mode;
            
            // Restore iframe back to CSS3D if it was fullscreened
            // El que viaja es el envoltorio, no el iframe: ver el bloque de
            // `loadMachine`. Mover un <iframe> lo recarga y reinicia la partida.
            if (this._envoltorio && this._envoltorio.parentElement === this._fsOverlay) {
                this._fsOverlay.style.display = 'none';
                this.currentCssObject.element = iframe;
                if (this._css3dDivBackup) {
                    this._css3dDivBackup.appendChild(this._envoltorio ?? iframe);
                }
            }

            iframe.style.pointerEvents = 'auto';
            iframe.style.width = '1024px';
            iframe.style.height = '768px';
            iframe.style.position = '';
            
            // Add native CSS Neon bloom for the Hologram.
            // El color es configurable (`plugin.acento = '#...'`): el magenta
            // nació para una sala oscura y en una sala blanca chilla. Por
            // defecto se queda como estaba, así que las salas viejas no cambian.
            const acento = this.acento || '#ff00ff';
            iframe.style.boxShadow = `0 0 40px ${acento}, 0 0 10px ${acento}`;
            iframe.style.border = `1px solid ${acento}`;
            
            // Project relative to INITIAL position (works for any cabinet orientation)
            // Pop out 1.5 units along the screen's facing direction (toward the player)
            const popDir = new THREE.Vector3(0, 0, 1.5);
            popDir.applyEuler(this.initialCssRot);
            
            this.targetCssPos.copy(this.initialCssPos).add(popDir);
            this.targetCssPos.y = Math.max(this.targetCssPos.y, 1.4);
            
            // Re-orient to face the player perfectly horizontally (remove pitch tilt when popped out)
            this.targetCssRot.copy(this.initialCssRot);
            this.targetCssRot.x = 0; 
            
            this.targetCssScale.copy(this.initialCssScale).multiplyScalar(1.5); 
            try { iframe.contentWindow.document.body.style.cursor = 'pointer'; } catch(e){}
            
        } else if (mode === 'FULLSCREEN') {
            this.screenMode = mode;
            
            // Remember the CSS3D wrapper div so we can restore later
            this._css3dDivBackup = iframe.parentElement;
            
            // Reparent iframe into the fixed overlay — this is a MOVE within the same
            // document so the iframe does NOT reload (spec: only cross-document moves reload)
            // Se muda el ENVOLTORIO, con el iframe dentro y quieto.
            this._fsOverlay.appendChild(this._envoltorio ?? iframe);
            if (this._envoltorio) Object.assign(this._envoltorio.style,
                { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' });
            this._fsOverlay.style.display = 'block';
            
            // Style iframe to fill the overlay completely
            Object.assign(iframe.style, {
                position: 'absolute', top: '0', left: '0',
                width: '100%', height: '100%',
                border: 'none', boxShadow: 'none',
                pointerEvents: 'auto',
                transform: 'none'
            });
            
            try { iframe.contentWindow.document.body.style.cursor = 'default'; } catch(e){}
        }
        
        if(this.statusCallback) {
            this.statusCallback(`Mode: <b>${mode}</b>`);
        }
    }

    /**
     * Takes an external iframe URL, mounts it inside the CSSScene natively based on the physical Screen Mesh.
     */
    loadMachine(gameUrl, rawScreenMesh, parentRotationY) {
        const iframe = document.getElementById('romCartridge');
        if (!iframe) return;

        this.disconnect();
        this.screenMesh = rawScreenMesh;

        if (!gameUrl || gameUrl === 'none') {
            iframe.src = 'about:blank';
            iframe.style.pointerEvents = 'none';
            if (this.statusCallback) this.statusCallback("Machine Unplugged.");
            return;
        }

        if (!this.screenMesh) {
            if (this.statusCallback) this.statusCallback("<span style='color:red'>ERROR: Target screen mesh not bound.</span>");
            return;
        }

        if (this.statusCallback) this.statusCallback(`[i] Loading ROM Cartridge...`);
        iframe.src = gameUrl;

        // ⚠️ TESTIGO DE MONTAJE. El montaje real ocurre 800 ms después del
        // `onload`, y en ese hueco te puede dar tiempo a levantarte: el
        // temporizador seguía en vuelo y montaba el cartucho DESPUÉS de haber
        // desconectado, dejando la pantalla flotando en la sala. Cada carga
        // sella un número; un montaje con número caducado se descarta solo.
        const sello = ++this._selloMontaje;

        // Abstracted wait for load
        iframe.onload = () => {
            if(iframe.src === 'about:blank') return;
            if (sello !== this._selloMontaje) return;
            if(this.statusCallback) this.statusCallback(`[i] ROM Mounted. Establishing CSS3D mapping...`);

            clearTimeout(this._temporizadorMontaje);
            this._temporizadorMontaje = setTimeout(() => {
                if (sello !== this._selloMontaje) return;   // ya no toca

                // ⚠️ MONTAR UNA SOLA VEZ POR CARTUCHO. Aquí estaba el bucle.
                //
                // Montar crea un `CSS3DObject` nuevo y lo mete en la escena, y
                // eso reubica su elemento en el DOM. Reubicar un <iframe> —o
                // CUALQUIER ancestro suyo— lo hace navegar otra vez desde cero,
                // que dispara `onload`, que vuelve a montar. Medido con la sala
                // quieta: **una recarga por segundo, para siempre**. El juego se
                // reiniciaba solo y era imposible avanzar en una partida.
                //
                // Envolver el iframe en un <div> no bastó —lo probé y seguían
                // las diez recargas en diez segundos—, porque mover el
                // envoltorio arrastra al iframe igual. Lo que rompe el ciclo no
                // es dónde vive el iframe: es no repetir el montaje.
                //
                // El primer `onload` tras fijar `src` es el bueno. Los
                // siguientes son consecuencia nuestra, y se ignoran.
                if (this._montadoPara === gameUrl && this.currentCssObject) return;
                this._montadoPara = gameUrl;
                iframe.style.pointerEvents = 'none';
                this.screenMode = 'MOUNTED';

                const screenBox = new THREE.Box3().setFromObject(this.screenMesh);
                const trueCenter = new THREE.Vector3();
                screenBox.getCenter(trueCenter);

                this.screenMesh.geometry.computeBoundingBox();
                const localSize = new THREE.Vector3();
                this.screenMesh.geometry.boundingBox.getSize(localSize);
                const worldScale = this.screenMesh.getWorldScale(new THREE.Vector3());

                // Derive true physical dimensions regardless of world rotation
                const physicalHeight = localSize.y * worldScale.y;
                const physicalWidth = Math.max(localSize.x * worldScale.x, localSize.z * worldScale.z);

                // Soltar cualquier montaje anterior antes de crear el nuevo.
                // `onload` se dispara más de una vez —basta que el juego navegue
                // dentro de su propio iframe— y sin esto cada disparo dejaba un
                // CSS3DObject de más: el nuevo le robaba el <iframe> al viejo y
                // el viejo se quedaba en la escena con su transformación puesta.
                [...this.cssScene.children].forEach(o => this.cssScene.remove(o));

                // ⚠️ AL CSS3DObject SE LE DA UN <div>, NUNCA EL <iframe>.
                // Aquí había `new CSS3DObject(iframe)` y montaba un bucle que se
                // alimentaba solo:
                //
                //   onload → montar → CSS3DObject se apropia del <iframe> y lo
                //   mete en el DOM del renderer → MOVER UN IFRAME LO RECARGA →
                //   onload → montar → …
                //
                // Medido en el navegador con la sala quieta: **6 recargas en 6
                // segundos**. El juego se reiniciaba una vez por segundo, así
                // que era imposible avanzar en una partida — y no había ningún
                // error, sólo un aviso («Cross-origin frame single-click
                // blocked») que en realidad decía otra cosa: el gancho de clic
                // se ataba a un documento que estaba a punto de desaparecer.
                //
                // Un <div> se puede mover por el DOM cuantas veces haga falta.
                // Un <iframe> no: cambiar de padre lo hace navegar otra vez
                // desde cero. Así que el que viaja es el envoltorio y el iframe
                // se queda quieto dentro.
                if (!this._envoltorio) {
                    this._envoltorio = document.createElement('div');
                    this._envoltorio.id = 'cartuchoEnvoltorio';
                    Object.assign(this._envoltorio.style, {
                        width: '1024px', height: '768px', overflow: 'hidden',
                    });
                }
                if (iframe.parentElement !== this._envoltorio) {
                    this._envoltorio.appendChild(iframe);   // una sola vez en su vida
                }

                // Create Native CSS3D Object
                const cssObject = new CSS3DObject(this._envoltorio);
                cssObject.position.copy(trueCenter);
                
                // Align rotation to parent arcade machine, plus subtle CRT pitch tilt backward
                cssObject.rotation.set(0, 0, 0);
                cssObject.rotation.y = parentRotationY; // Face exactly same way as the arcade machine
                // ⚠️ El pitch va sobre el eje X LOCAL, no el del mundo. Con
                // `rotation.x = -0.15` y el orden Euler por defecto, la
                // inclinación se aplica ANTES del giro: en una máquina girada
                // 90° deja de ser inclinación de CRT y se vuelve ALABEO — la
                // página sale ladeada en diagonal. No se veía en la sala
                // original porque allí todas las máquinas miraban de frente
                // (yaw 0), que es justo el caso en que ambas cosas coinciden.
                cssObject.rotateX(-0.15);               // Tilt top backward by ~8.5 degrees

                console.log('PHYSICAL WIDTH:', physicalWidth, 'HEIGHT:', physicalHeight); 
                const scaleFactor = physicalWidth / 1024;
                cssObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Push slightly forward along local Z to prevent Z-fighting with the curved screen glass
                cssObject.translateZ(0.04);
                
                this.cssScene.add(cssObject);
                this.currentCssObject = cssObject;

                // Cache Kinematics
                this.initialCssPos.copy(cssObject.position);
                this.initialCssRot.copy(cssObject.rotation);
                this.initialCssScale.copy(cssObject.scale);
                
                this.targetCssPos.copy(this.initialCssPos);
                this.targetCssRot.copy(this.initialCssRot);
                this.targetCssScale.copy(this.initialCssScale);

                // Invisible Raycast Proxy Mesh
                const debugGeo = new THREE.PlaneGeometry(physicalWidth, physicalHeight);
                const debugMat = new THREE.MeshBasicMaterial({ 
                    color: 0x000000, side: THREE.DoubleSide, blending: THREE.NoBlending,
                    opacity: 0, colorWrite: false 
                });

                this.currentDebugScreen = new THREE.Mesh(debugGeo, debugMat);
                this.currentDebugScreen.position.copy(trueCenter);
                this.currentDebugScreen.rotation.y = parentRotationY;
                this.currentDebugScreen.rotateX(-0.15);   // mismo motivo: eje LOCAL
                this.currentDebugScreen.translateZ(0.045);
                this.scene.add(this.currentDebugScreen);
                
                // Native DOM Hook for Single-Click Fullscreen
                // (Only works for same-origin local laboratory games, which is perfect)
                try {
                    // Set default cursor mode initially based on states
                    if(this.screenMode === 'PROJECTED') iframe.contentWindow.document.body.style.cursor = 'pointer';
                    
                    iframe.contentWindow.document.addEventListener('click', () => {
                        if (this.screenMode === 'PROJECTED' || this.screenMode === 'MOUNTED') {
                            this.setHologramMode('FULLSCREEN');
                        }
                    });

                    // Capture Esc key from inside the iframe to ensure we can exit FULLSCREEN
                    iframe.contentWindow.document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && this.screenMode === 'FULLSCREEN') {
                            this.setHologramMode('PROJECTED');
                        }
                    });
                } catch(e) { console.warn("Cross-origin frame single-click blocked."); }

                if (this.statusCallback) {
                    this.statusCallback(`<span style='color:#00FF00'>[✓] CSS3D Holographic Cartridge Active.</span><br>Click screen to 'Pop Out' (Enter: Fullscreen | Esc: Return)`);
                }
            }, 800);
        };
    }

    /**
     * Unmount the current iframe from CSS3D safely.
     */
    disconnect() {
        // Caduca cualquier montaje pendiente antes de nada (ver loadMachine).
        this._selloMontaje++;
        clearTimeout(this._temporizadorMontaje);

        // If in fullscreen, restore iframe first
        const iframe = document.getElementById('romCartridge');
        if (iframe && this._fsOverlay && iframe.parentElement === this._fsOverlay) {
            this._fsOverlay.style.display = 'none';
            if (this._css3dDivBackup) {
                this._css3dDivBackup.appendChild(this._envoltorio ?? iframe);
            }
            iframe.style.position = '';
            iframe.style.width = '1024px';
            iframe.style.height = '768px';
            iframe.style.transform = '';
        }
        
        if (this.currentDebugScreen) {
            this.scene.remove(this.currentDebugScreen);
            this.currentDebugScreen = null;
        }
        // ⚠️ Vaciar la escena ENTERA, no solo `currentCssObject`. `iframe.onload`
        // puede dispararse más de una vez (una recarga interna del juego basta),
        // y cada disparo montaba un CSS3DObject nuevo sin soltar el anterior. El
        // plugin solo recordaba el último, así que al levantarte quedaba un
        // huérfano en la escena sujetando el <iframe>: el renderer lo devolvía a
        // su capa en el siguiente fotograma y la pantalla se quedaba flotando en
        // la sala. Aquí no hay nada que preservar — soltarlos todos es lo justo.
        const montados = [...this.cssScene.children];
        if (montados.length) {
            montados.forEach(o => this.cssScene.remove(o));
            this.currentCssObject = null;

            // Devolver el cartucho a su cajón: three acaba de arrancarlo del DOM
            // (ver la nota del constructor). Si no lo recolocamos, la siguiente
            // máquina no encuentra el iframe y no enciende.
            // Comprobar `isConnected` no basta: según la versión de three, el
            // <iframe> puede QUEDARSE colgado en la capa CSS3D con su última
            // transformación puesta — o sea, la pantalla flotando en el aire
            // después de levantarte. La condición correcta es "no está en su
            // cajón", que cubre los dos casos.
            if (iframe && this.hogarDelCartucho && iframe.parentElement !== this.hogarDelCartucho) {
                iframe.onload = null;
                iframe.src = 'about:blank';
                iframe.style.transform = '';
                iframe.style.pointerEvents = 'none';
                // Vuelve el envoltorio a su cajón; el iframe no se mueve nunca.
                if (this._envoltorio) {
                    Object.assign(this._envoltorio.style,
                        { position: '', top: '', left: '', width: '1024px', height: '768px' });
                    this.hogarDelCartucho.appendChild(this._envoltorio);
                } else {
                    this.hogarDelCartucho.appendChild(iframe);
                }
            }
        }
        // Al soltar el cartucho se olvida qué había montado, para que el
        // siguiente juego sí pueda montarse.
        this._montadoPara = null;
        this.screenMode = 'MOUNTED';
    }

    /**
     * RenderCore Plugin Injection API
     * Solves kinematics dynamically each tick
     */
    onUpdate(dt) {
        if (this.currentCssObject && this.screenMode !== 'FULLSCREEN') {
            this.currentCssObject.position.lerp(this.targetCssPos, dt * 5.0);
            
            const currentQuat = new THREE.Quaternion().setFromEuler(this.currentCssObject.rotation);
            const targetQuat = new THREE.Quaternion().setFromEuler(this.targetCssRot);
            currentQuat.slerp(targetQuat, dt * 5.0);
            this.currentCssObject.setRotationFromQuaternion(currentQuat);

            this.currentCssObject.scale.lerp(this.targetCssScale, dt * 5.0);
            
            if (this.tiedLight) {
                this.tiedLight.position.copy(this.currentCssObject.position);
                this.tiedLight.position.z += 0.2;
                // Flicker
                if (this.tiedLight.intensity > 0) {
                    this.tiedLight.intensity += (Math.random() - 0.5) * 1.5;
                }
            }
        }

        // Output pass
        // MUST run before WebGL usually, but WebGL has to define the projection mapping
        this.css3dRenderer.render(this.cssScene, this.camera);
    }
}
