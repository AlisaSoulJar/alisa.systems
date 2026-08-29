/**
 * 🔊 SFX.js — Procedural Sound Engine for ALISA Simulations
 * No .wav files needed — everything synthesized via Web Audio API.
 * 
 * Usage:
 *   <script src="js/sfx.js"></script>
 *   SFX.init();                    // Call once on first user interaction
 *   SFX.play('laser');             // Play a named sound
 *   SFX.radio.start('spacestation'); // Start online lofi/chill radio
 *   SFX.music.start('space');      // Start procedural ambient fallback
 */

const SFX = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let muted = false;
    let initialized = false;

    function init() {
        if (initialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.4;
            masterGain.connect(ctx.destination);

            musicGain = ctx.createGain();
            musicGain.gain.value = 0.15;
            musicGain.connect(ctx.destination);

            initialized = true;
            console.log('🔊 SFX Engine initialized');
        } catch(e) {
            console.warn('SFX: Web Audio not available', e);
        }
    }

    function ensureCtx() {
        if (!initialized) init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx && initialized;
    }

    // ── SYNTHESIS PRIMITIVES ──

    function osc(type, freq, dur, vol=0.3, detune=0) {
        if (!ensureCtx()) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = detune;
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(masterGain);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + dur);
    }

    function noise(dur, vol=0.2, filter='highpass', freq=1000) {
        if (!ensureCtx()) return;
        const bufferSize = ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const filt = ctx.createBiquadFilter();
        filt.type = filter;
        filt.frequency.value = freq;

        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

        src.connect(filt);
        filt.connect(g);
        g.connect(masterGain);
        src.start();
    }

    function sweep(startFreq, endFreq, dur, type='sine', vol=0.3) {
        if (!ensureCtx()) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(startFreq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(masterGain);
        o.start();
        o.stop(ctx.currentTime + dur);
    }

    // ── SOUND LIBRARY ──
    // Each sound is a function that creates the synthesis in real-time

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ AQUÍ HABÍA SESENTA Y TRES SONIDOS ESCRITOS A MANO. QUEDAN DIEZ.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Los otros 53 viven en `public/data/sonidos.json` como RECETAS —capas de
     * las tres primitivas de abajo— y se montan al vuelo en `montarRecetas`.
     * No es un ahorro de líneas: es que ahora **hay una sola definición**, y el
     * mundo 3D puede tocar exactamente el mismo sonido colocándolo en el
     * espacio (`SpatialAudioPlugin.registrarLexicoDeSonidos`).
     *
     * Mientras estuvieron aquí, había dos fuentes: un sonido nuevo escrito en
     * este fichero no llegaba nunca a la sala, y en silencio.
     *
     * ⚠️ ESTOS DIEZ SE QUEDAN, Y ESTÁ DECLARADO EN EL LÉXICO (`soloCodigo`).
     *
     * Usan Web Audio a pelo, arpegios y temporizadores. Inventarse un
     * vocabulario de secuencias y esperas para diez casos sería meter a
     * martillazos en el formato lo que no encaja. La ausencia es un dato.
     */
    const sounds = {

        boss_death() {
            // Chain explosions
            const t = ctx.currentTime;
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    noise(0.3, 0.3 - i * 0.03, 'lowpass', 400 + i * 100);
                    osc('sine', 50 + i * 10, 0.3, 0.25);
                }, i * 200);
            }
        },

        boss_enter() {
            // Dramatic low rumble + alarm
            osc('sine', 50, 1.5, 0.3);
            osc('sawtooth', 100, 1.0, 0.15);
            sweep(800, 200, 0.5, 'square', 0.1);
            // Warning beeps
            const t = ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'square';
                o.frequency.value = 880;
                g.gain.setValueAtTime(0.1, t + i * 0.3);
                g.gain.setValueAtTime(0, t + i * 0.3 + 0.1);
                o.connect(g); g.connect(masterGain);
                o.start(t + i * 0.3);
                o.stop(t + 1.5);
            }
        },

        dado() {
            // Tres golpes desiguales: un dado que rueda no hace un solo ruido.
            noise(0.03, 0.07, 'bandpass', 1800);
            setTimeout(() => noise(0.025, 0.05, 'bandpass', 2300), 70);
            setTimeout(() => noise(0.04, 0.06, 'bandpass', 1500), 150);
        },

        game_over() {
            // Descending sad tones
            const t = ctx.currentTime;
            [523, 494, 440, 392, 349].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0.15, t + i * 0.2);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.4);
                o.connect(g); g.connect(masterGain);
                o.start(t + i * 0.2); o.stop(t + i * 0.2 + 0.5);
            });
        },

        level_complete() {
            // Level done — full arpeggio
            const t = ctx.currentTime;
            [523, 659, 784, 1047, 1319].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0.12, t + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
                o.connect(g); g.connect(masterGain);
                o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.35);
            });
        },

        notification() {
            // System notification — two-tone
            osc('sine', 880, 0.1, 0.12);
            const t = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = 1100;
            g.gain.setValueAtTime(0.12, t + 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            o.connect(g); g.connect(masterGain);
            o.start(t + 0.12); o.stop(t + 0.3);
        },

        npc_talk() {
            // Undertale-style character blip
            osc('square', 300 + Math.random() * 200, 0.04, 0.08);
        },

        powerup() {
            // Classic ascending arpeggio
            const t = ctx.currentTime;
            [523, 659, 784, 1047].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.value = f;
                g.gain.setValueAtTime(0.15, t + i * 0.08);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
                o.connect(g); g.connect(masterGain);
                o.start(t + i * 0.08);
                o.stop(t + i * 0.08 + 0.2);
            });
        },

        safe_zone() {
            // Reached safe zone — victory chime
            osc('sine', 523, 0.1, 0.15);
            const t = ctx.currentTime;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = 784;
            g.gain.setValueAtTime(0.15, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.connect(g); g.connect(masterGain);
            o.start(t + 0.1); o.stop(t + 0.35);
        },

        victory() {
            // Triumphant fanfare
            const t = ctx.currentTime;
            [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                const dur = i < 4 ? 0.12 : 0.25;
                g.gain.setValueAtTime(0.15, t + i * 0.12);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + dur + 0.1);
                o.connect(g); g.connect(masterGain);
                o.start(t + i * 0.12); o.stop(t + i * 0.12 + dur + 0.15);
            });
        },
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL LÉXICO: LA ÚNICA DEFINICIÓN DE LOS OTROS 53
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Se pide al cargar el script, no en `init()`: así ha llegado mucho antes de
     * que nadie toque la página, que es cuando el navegador deja sonar.
     *
     * ⚠️ Y SI NO HA LLEGADO, SE AVISA. NO SE CALLA.
     *
     * El fallo original de este fichero era `if (sounds[name])` sin `else`: un
     * nombre que no estaba no sonaba y no se quejaba, y la única señal de que
     * faltaba un sonido es un silencio — que es exactamente lo que hace un
     * sonido flojo. El fallo y el acierto sonaban igual.
     */
    let lexico = null;
    const avisados = new Set();

    function montarRecetas(lex) {
        lexico = lex;
        for (const [nombre, receta] of Object.entries(lex.sonidos || {})) {
            if (sounds[nombre]) continue;          // los diez de código mandan
            sounds[nombre] = () => {
                for (const c of receta.capas) {
                    if (c.tipo === 'barrido') sweep(c.desde, c.hasta, c.dur, c.forma, c.vol);
                    else if (c.tipo === 'ruido') noise(c.dur, c.vol, c.filtro, c.hz);
                    else if (c.tipo === 'onda') osc(c.forma, c.hz, c.dur, c.vol, c.detune);
                }
            };
        }
    }

    const listo = fetch('/data/sonidos.json')
        .then((r) => { if (!r.ok) throw new Error(r.status + ' en /data/sonidos.json'); return r.json(); })
        .then((lex) => { montarRecetas(lex); return Object.keys(lex.sonidos || {}).length; })
        .catch((e) => {
            console.warn('[SFX] sin léxico de sonidos: ' + e.message
                + ' — sólo sonarán los diez que van en código.');
            return 0;
        });


    // ── PROCEDURAL AMBIENT FALLBACK ──
    const music = {
        _nodes: [],
        _playing: false,

        start(theme = 'space') {
            if (!ensureCtx() || this._playing) return;
            this._playing = true;
            // Stop internet radio if playing procedural
            radio.stop();

            if (theme === 'space') this._spaceTheme();
            else if (theme === 'water') this._waterTheme();
            else if (theme === 'retro') this._retroTheme();
            else if (theme === 'overworld') this._overworldTheme();
        },

        stop() {
            this._nodes.forEach(n => { try { n.stop(); } catch(e) {} });
            this._nodes = [];
            this._playing = false;
        },

        _spaceTheme() {
            // Deep space ambient: slow LFO pad + drone
            const pad = ctx.createOscillator();
            const padGain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            pad.type = 'sine';
            pad.frequency.value = 110;
            padGain.gain.value = 0.08;

            lfo.type = 'sine';
            lfo.frequency.value = 0.15;
            lfoGain.gain.value = 30;
            lfo.connect(lfoGain);
            lfoGain.connect(pad.frequency);

            pad.connect(padGain);
            padGain.connect(musicGain);
            pad.start(); lfo.start();
            this._nodes.push(pad, lfo);

            // Add high shimmer
            const shimmer = ctx.createOscillator();
            const shimGain = ctx.createGain();
            shimmer.type = 'triangle';
            shimmer.frequency.value = 880;
            shimGain.gain.value = 0.02;
            const shimLfo = ctx.createOscillator();
            const shimLfoG = ctx.createGain();
            shimLfo.type = 'sine'; shimLfo.frequency.value = 0.3;
            shimLfoG.gain.value = 0.015;
            shimLfo.connect(shimLfoG);
            shimLfoG.connect(shimGain.gain);
            shimmer.connect(shimGain);
            shimGain.connect(musicGain);
            shimmer.start(); shimLfo.start();
            this._nodes.push(shimmer, shimLfo);
        },

        _waterTheme() {
            // Underwater ambient: filtered noise + slow bubbles
            const bufSize = ctx.sampleRate * 4;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

            const src = ctx.createBufferSource();
            src.buffer = buf; src.loop = true;
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 300;
            const g = ctx.createGain(); g.gain.value = 0.06;

            // LFO on filter for wave effect
            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.type = 'sine'; lfo.frequency.value = 0.2;
            lfoG.gain.value = 150;
            lfo.connect(lfoG); lfoG.connect(filt.frequency);

            src.connect(filt); filt.connect(g); g.connect(musicGain);
            src.start(); lfo.start();
            this._nodes.push(src, lfo);

            // Drone
            const drone = ctx.createOscillator();
            const droneG = ctx.createGain();
            drone.type = 'sine'; drone.frequency.value = 65;
            droneG.gain.value = 0.04;
            drone.connect(droneG); droneG.connect(musicGain);
            drone.start();
            this._nodes.push(drone);
        },

        _retroTheme() {
            // Chiptune bass loop
            const bassOsc = ctx.createOscillator();
            const bassG = ctx.createGain();
            bassOsc.type = 'square';
            bassOsc.frequency.value = 110;
            bassG.gain.value = 0.04;

            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.type = 'square'; lfo.frequency.value = 2;
            lfoG.gain.value = 55;
            lfo.connect(lfoG); lfoG.connect(bassOsc.frequency);

            bassOsc.connect(bassG); bassG.connect(musicGain);
            bassOsc.start(); lfo.start();
            this._nodes.push(bassOsc, lfo);
        },

        _overworldTheme() {
            // Calm ambient: slow pad chords
            [220, 277, 330].forEach(freq => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = freq;
                g.gain.value = 0.03;
                o.connect(g); g.connect(musicGain);
                o.start();
                this._nodes.push(o);
            });
        }
    };

    // ── ONLINE LO-FI RADIO ──
    const radio = {
        _audio: null,
        _streams: {
            // SomaFM Direct MP3 Streams
            'groovesalad': 'https://ice4.somafm.com/groovesalad-128-mp3',      // Nice chill/downtempo
            'spacestation': 'https://ice4.somafm.com/spacestation-128-mp3',    // Space ambient
            'defcon': 'https://ice4.somafm.com/defcon-128-mp3',                // Cyber/Hacking
            'sf1033': 'https://ice4.somafm.com/sf1033-128-mp3',                // Ambient police radio
            'secretagent': 'https://ice4.somafm.com/secretagent-128-mp3'       // Spy/Surf
        },
        
        start(station = 'groovesalad') {
            if (!this._streams[station]) station = 'groovesalad';
            this.stop();
            music.stop(); // Stop procedural music
            
            this._audio = new Audio(this._streams[station]);
            this._audio.crossOrigin = "anonymous";
            this._audio.loop = true;
            this._audio.volume = musicGain ? musicGain.gain.value : 0.15;
            
            if (muted) this._audio.volume = 0;
            
            this._audio.play().catch(e => {
                console.warn("Radio autoplay blocked:", e);
            });
        },
        
        stop() {
            if (this._audio) {
                this._audio.pause();
                this._audio.src = '';
                this._audio = null;
            }
        },

        setVolume(v) {
            if (this._audio) this._audio.volume = Math.max(0, Math.min(1, v));
        }
    };

    // ── PUBLIC API ──
    return {
        init,
        /** La promesa del léxico, por si alguien quiere esperar a que esté. */
        listo,

        /**
         * La tabla compartida de VERBO DE JUGADA → sonido, tal cual viene del
         * léxico. La usa `sonido_mesa.js`, que es un script clásico y no puede
         * importar nada, y por eso pasa por aquí en vez de volver a pedir el JSON.
         *
         * ⚠️ Se expone el DATO, no una función que lo interprete. La regla de
         *    resolución —nombre exacto del juego, verbo del juego, tabla, genérico—
         *    vive en un solo sitio, y ese sitio es quien suena las mesas. Poner
         *    aquí una segunda copia de esa regla es exactamente la deuda que
         *    acabamos de pagar con los cincuenta y tres sonidos duplicados.
         */
        get jugadas() { return lexico?.jugadas ?? null; },

        play(name, vol) {
            if (!ensureCtx()) return;
            if (muted) return;
            if (!sounds[name] && !avisados.has(name)) {
                avisados.add(name);
                console.warn(`[SFX] «${name}» no existe`
                    + (lexico ? '' : ' y el léxico aún no ha llegado'));
            }
            if (sounds[name]) {
                try {
                    if (vol !== undefined) {
                        const prev = masterGain.gain.value;
                        masterGain.gain.value = vol;
                        sounds[name]();
                        masterGain.gain.value = prev;
                    } else {
                        sounds[name]();
                    }
                } catch(e) { /* graceful fail */ }
            }
        },
        music,
        radio,
        setVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); },
        setMusicVolume(v) { 
            if (musicGain) musicGain.gain.value = Math.max(0, Math.min(1, v));
            radio.setVolume(v);
        },
        mute() { muted = true; music.stop(); radio.setVolume(0); },
        unmute() { muted = false; if(musicGain) radio.setVolume(musicGain.gain.value); },
        toggle() { muted ? this.unmute() : this.mute(); return !muted; },
        get isMuted() { return muted; },
        get isInitialized() { return initialized; },
        list() { return Object.keys(sounds); },
        
        autoWireUI() {
            document.addEventListener('click', () => ensureCtx(), {once: true});
            document.querySelectorAll('button, .ship-btn, .scenario-card, .menu-item, select').forEach(el => {
                if(!el.dataset.sfxWired) {
                    el.addEventListener('mouseenter', () => this.play('hover'));
                    el.addEventListener('mousedown', () => this.play('menu_select'));
                    el.dataset.sfxWired = "1";
                }
            });
            document.querySelectorAll('input[type="range"]').forEach(el => {
                if(!el.dataset.sfxWired) {
                    el.addEventListener('change', () => this.play('hover')); 
                    el.dataset.sfxWired = "1";
                }
            });
        },

        countdown(callback) {
            this.init();
            let n = 3;
            const overlay = document.createElement('div');
            overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-weight:900;font-size:150px;color:#fff;text-shadow:0 0 20px #00ffff;z-index:99999;background:rgba(0,0,0,0.5);pointer-events:none;transition:transform 0.2s, opacity 0.2s;";
            document.body.appendChild(overlay);
            
            const tick = () => {
                if(n > 0) {
                    overlay.style.transform = 'scale(0.5)';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.textContent = n;
                        overlay.style.transform = 'scale(1)';
                        overlay.style.opacity = '1';
                        this.play('radar'); // sharp ping
                        n--;
                        setTimeout(tick, 900);
                    }, 100);
                } else {
                    overlay.style.transform = 'scale(0.5)';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.textContent = "GO!";
                        overlay.style.color = "#ff0055";
                        overlay.style.textShadow = "0 0 30px #ff0055";
                        overlay.style.transform = 'scale(1.5)';
                        overlay.style.opacity = '1';
                        this.play('boss_laser'); 
                        if(callback) callback();
                        setTimeout(() => {
                            overlay.style.opacity = '0';
                            setTimeout(() => overlay.remove(), 500);
                        }, 800);
                    }, 100);
                }
            };
            tick();
        },

        enableFPSCamera(scene, camera, controls) {
            const self = this; // capture SFX reference for event listeners
            console.log('🎯 SFX.enableFPSCamera activated', {scene: !!scene, camera: !!camera, controls: !!controls});
            window.fpsActive = false;
            window.fpsTarget = null;
            window.fpsPool = [];
            
            // Render hint
            const hint = document.createElement('div');
            hint.style.cssText = "position:fixed;bottom:20px;right:20px;color:#0ff;font-family:'Orbitron',sans-serif;font-size:12px;opacity:0.7;pointer-events:none;z-index:9000;";
            hint.innerHTML = "[C] Toggle Camera · [Click] Possess/Release";
            document.body.appendChild(hint);

            // ── [C] key: cycle through entities ──
            document.addEventListener('keydown', e => {
                if (e.key === 'c' || e.key === 'C') {
                    if (!window.fpsActive) {
                        window.fpsPool = [];
                        scene.traverse(obj => {
                            if ((obj.isMesh || obj.isGroup) && obj.parent === scene) {
                                if (obj.position.y <= 0 && obj.rotation.x !== 0) return;
                                if (obj.userData && obj.userData.static) return;
                                if (obj.geometry && obj.geometry.type.includes('Plane')) return;
                                window.fpsPool.push(obj);
                            }
                        });
                        if (window.fpsPool.length === 0) return;
                        window.fpsActive = true;
                        window.fpsIndex = Math.floor(Math.random() * window.fpsPool.length);
                        if(controls) controls.enabled = false;
                        self.play('radar');
                    } else {
                        window.fpsIndex++;
                        if (window.fpsIndex >= window.fpsPool.length) {
                            window.fpsActive = false;
                            window.fpsTarget = null;
                            if(controls) controls.enabled = true;
                            camera.position.y += 15;
                            camera.lookAt(0,0,0);
                            self.play('hover');
                            return;
                        }
                        self.play('menu_select');
                    }
                    window.fpsTarget = window.fpsPool[window.fpsIndex];
                }
            });

            // ── Hover logic ──
            window.hoveredEntity = null;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            const glowEntity = (entity, state) => {
                if (!entity) return;
                entity.traverse(c => {
                    if (c.isMesh && c.material) {
                        const mats = Array.isArray(c.material) ? c.material : [c.material];
                        mats.forEach(m => {
                            if (m.emissive) {
                                m.emissive.setHex(state ? 0x55ffaa : 0x000000);
                                if (state) m.emissiveIntensity = 1.0;
                            }
                        });
                    }
                });
                document.body.style.cursor = state ? 'pointer' : 'default';
            };

            let _diagLogged = false;
            const getInteractables = () => {
                let result = [];
                scene.traverse(obj => {
                    if (!obj.visible) return;
                    // Only agents are possessable — tag with userData.agent = true
                    if (obj.userData && obj.userData.agent) {
                        result.push(obj);
                    }
                });
                if (!_diagLogged && result.length > 0) {
                    console.log(`🎯 Found ${result.length} agent(s) in scene`);
                    _diagLogged = true;
                }
                return result;
            };

            // ── Pointermove: hover detection + mouse tracking ──
            window.addEventListener('pointermove', e => {
                const mx = (e.clientX / window.innerWidth) * 2 - 1;
                const my = -(e.clientY / window.innerHeight) * 2 + 1;

                // Always track mouse for FPS mouselook
                mouse.set(mx, my);

                if (window.fpsActive) {
                    window.fpsMouseX = mx;
                    window.fpsMouseY = my;
                    return;
                }

                // Raycast for hover
                raycaster.setFromCamera(mouse, camera);
                const candidates = getInteractables();
                const intersects = raycaster.intersectObjects(candidates, true);

                let hit = null;
                if (intersects.length > 0) {
                    let obj = intersects[0].object;
                    while (obj && !candidates.includes(obj) && obj.parent) {
                        obj = obj.parent;
                    }
                    if (candidates.includes(obj)) hit = obj;
                }

                if (hit !== window.hoveredEntity) {
                    glowEntity(window.hoveredEntity, false);
                    window.hoveredEntity = hit;
                    if (hit) glowEntity(hit, true);
                }
            });

            // ── Pointerdown: possess / release ──
            window.addEventListener('pointerdown', e => {
                // Exit FPS mode on any click while possessing
                if (window.fpsActive) {
                    window.fpsActive = false;
                    
                    // Restore solidity
                    if (window.fpsTarget) {
                        window.fpsTarget.traverse(c => {
                            if (c.isMesh && c.material) {
                                const mats = Array.isArray(c.material) ? c.material : [c.material];
                                mats.forEach(m => {
                                    m.transparent = false;
                                    m.opacity = 1.0;
                                    m.depthWrite = true;
                                });
                            }
                        });
                    }
                    
                    window.fpsTarget = null;
                    if(controls) controls.enabled = true;
                    camera.position.set(0, 8, 15);
                    camera.lookAt(0, 0, 0);
                    self.play('hover');
                    return;
                }

                // Enter FPS mode if hovering an entity
                if (window.hoveredEntity) {
                    window.fpsActive = true;
                    window.fpsTarget = window.hoveredEntity;
                    if(controls) controls.enabled = false;
                    glowEntity(window.hoveredEntity, false);

                    window.fpsMouseX = 0;
                    window.fpsMouseY = 0;
                    
                    // Ghost mode 20% opacity
                    window.fpsTarget.traverse(c => {
                        if (c.isMesh && c.material) {
                            const mats = Array.isArray(c.material) ? c.material : [c.material];
                            mats.forEach(m => { 
                                m.transparent = true;
                                m.opacity = 0.2;
                                m.depthWrite = false;
                            });
                        }
                    });
                    
                    // Compute real bounding box height for camera positioning
                    const box = new THREE.Box3().setFromObject(window.fpsTarget);
                    window.fpsHeight = box.max.y - box.min.y;
                    console.log(`📐 Possessed entity height: ${window.fpsHeight.toFixed(2)}`);
                    
                    window.hoveredEntity = null;
                    
                    // Flash
                    const flash = document.createElement('div');
                    flash.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:99999;pointer-events:none;opacity:0.8;transition:opacity 0.3s;";
                    document.body.appendChild(flash);
                    setTimeout(() => { flash.style.opacity = '0'; }, 30);
                    setTimeout(() => { flash.remove(); }, 200);

                    self.play('radar');
                }
            });
        },

        updateFPS(camera) {
            if (window.fpsActive && window.fpsTarget && camera) {
                const t = window.fpsTarget;
                const h = window.fpsHeight || 1.0;
                
                // Eye level = ~85% of entity height
                const eyeY = h * 0.85;
                // Forward offset = ~60% of entity height (snout/face area)
                const fwdOffset = h * 0.6;
                
                // Horizon-locked base direction using strictly Y rotation
                const baseDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, t.rotation.y, 0));
                const dirMult = (t.userData?.dir && t.userData.dir === -1) ? -1 : 1;
                baseDir.multiplyScalar(dirMult);
                
                // Position camera at eye level, slightly ahead
                camera.position.copy(t.position);
                camera.position.y += eyeY;
                camera.position.add(baseDir.clone().multiplyScalar(fwdOffset));

                // Mouselook with horizon lock
                const lookEuler = new THREE.Euler(0, t.rotation.y + (dirMult === -1 ? Math.PI : 0), 0, 'YXZ');
                const mx = window.fpsMouseX || 0;
                const my = window.fpsMouseY || 0;
                lookEuler.y -= mx * Math.PI * 0.75;
                lookEuler.x -= my * Math.PI * 0.35;
                
                const finalQuat = new THREE.Quaternion().setFromEuler(lookEuler);
                const finalDir = new THREE.Vector3(0, 0, 1).applyQuaternion(finalQuat);
                
                camera.lookAt(camera.position.clone().add(finalDir));
            }
        }
    };
})();
// const doesn't create window property — expose it explicitly for guarded calls
window.SFX = SFX;
