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

    const sounds = {

        // ═══ ASTEROIDS ═══

        laser() {
            // Classic pew-pew: high sine sweep down
            sweep(1200, 200, 0.08, 'square', 0.15);
        },

        laser_heavy() {
            // Power laser: deeper, longer
            sweep(800, 100, 0.15, 'sawtooth', 0.2);
            sweep(600, 80, 0.18, 'square', 0.1);
        },

        rocket() {
            // Whoosh + rumble
            sweep(300, 1500, 0.1, 'sawtooth', 0.15);
            noise(0.15, 0.1, 'bandpass', 800);
        },

        explosion() {
            // Big boom: noise burst + low freq shake
            noise(0.4, 0.35, 'lowpass', 600);
            osc('sine', 60, 0.3, 0.4);
            osc('sine', 40, 0.5, 0.2);
        },

        explosion_small() {
            // Asteroid break
            noise(0.2, 0.2, 'lowpass', 800);
            osc('sine', 80, 0.15, 0.2);
        },

        hit_armor() {
            // Metallic clang — deflect off boss armor
            osc('square', 800, 0.05, 0.15);
            osc('square', 1200, 0.03, 0.1);
            noise(0.05, 0.08, 'highpass', 4000);
        },

        hit_core() {
            // Critical hit — satisfying crunch
            osc('sawtooth', 400, 0.1, 0.25);
            osc('sine', 200, 0.15, 0.2);
            noise(0.1, 0.15, 'bandpass', 1000);
        },

        shield_hit() {
            // Shield absorb — buzzy deflect
            sweep(2000, 500, 0.12, 'sine', 0.15);
            osc('triangle', 300, 0.08, 0.1);
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

        capsule_collect() {
            // Quick pickup — bright blip
            sweep(600, 1400, 0.08, 'sine', 0.2);
            osc('sine', 1200, 0.06, 0.1);
        },

        orb_collect() {
            // Valuable catch — shimmering collect
            sweep(400, 2000, 0.15, 'sine', 0.25);
            sweep(500, 2500, 0.2, 'triangle', 0.15);
            osc('sine', 1800, 0.1, 0.1);
        },

        bell_cycle() {
            // Bell color change — quick ting
            osc('sine', 2000, 0.06, 0.1);
            osc('triangle', 3000, 0.04, 0.08);
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

        boss_phase() {
            // Phase transition — deep impact + alarm
            osc('sine', 40, 0.6, 0.4);
            noise(0.3, 0.25, 'lowpass', 300);
            sweep(1500, 200, 0.4, 'sawtooth', 0.2);
        },

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

        boss_charge() {
            // Charging up whoosh
            sweep(100, 800, 0.8, 'sawtooth', 0.15);
            noise(0.5, 0.1, 'bandpass', 500);
        },

        boss_sweep() {
            // Laser beam hum
            osc('sawtooth', 150, 0.3, 0.12);
            osc('square', 152, 0.3, 0.08); // Beat frequency for hum
        },

        armor_open() {
            // Mechanical panels opening — hydraulic hiss
            noise(0.3, 0.12, 'highpass', 3000);
            sweep(200, 400, 0.2, 'square', 0.08);
        },

        armor_close() {
            // Mechanical panels closing — clank
            sweep(400, 200, 0.15, 'square', 0.08);
            noise(0.1, 0.15, 'lowpass', 500);
            osc('square', 150, 0.05, 0.15);
        },

        ship_death() {
            // Player death — descending buzz + explosion
            sweep(1000, 50, 0.5, 'sawtooth', 0.3);
            noise(0.6, 0.3, 'lowpass', 500);
            osc('sine', 40, 0.8, 0.3);
        },

        turret_die() {
            // Sub-explosion + sparks
            noise(0.25, 0.25, 'bandpass', 1200);
            osc('sine', 70, 0.2, 0.2);
            sweep(3000, 800, 0.15, 'sine', 0.1);
        },

        energy_low() {
            // Warning beep — low energy
            osc('square', 440, 0.1, 0.1);
            osc('square', 440, 0.1, 0.08);
        },

        combo() {
            // Quick rising note for combo increment
            sweep(800, 1600, 0.06, 'sine', 0.12);
        },

        graze() {
            // High pitched quick whoosh for near miss
            sweep(300, 1500, 0.1, 'sine', 0.1);
            noise(0.1, 0.05, 'highpass', 2000);
        },

        car_pass() {
            // Doppler whoosh
            sweep(400, 100, 0.4, 'sine', 0.15);
            noise(0.4, 0.2, 'lowpass', 600);
        },

        frog_hop() {
            // Boing
            sweep(200, 500, 0.1, 'sine', 0.15);
        },

        squish() {
            // Splat
            noise(0.2, 0.3, 'lowpass', 800);
            sweep(200, 50, 0.2, 'sawtooth', 0.2);
        },

        crash() {
            // Metal crunch
            noise(0.3, 0.4, 'bandpass', 600);
            osc('sawtooth', 70, 0.4, 0.25);
        },

        bomb_use() {
            // Screen-clearing bomb — massive sweep + noise
            sweep(2000, 30, 0.8, 'sawtooth', 0.4);
            noise(0.6, 0.35, 'lowpass', 200);
            osc('sine', 30, 1.0, 0.3);
        },

        barrier_deploy() {
            // Force field activate — electric buzz
            osc('sawtooth', 200, 0.3, 0.15);
            osc('square', 205, 0.3, 0.1); // Beat frequency
            sweep(500, 2000, 0.2, 'sine', 0.1);
        },

        // ═══ AQUARIUM ═══

        splash() {
            // Water splash
            noise(0.3, 0.2, 'bandpass', 2000);
            sweep(400, 200, 0.15, 'sine', 0.1);
        },

        fish_eat() {
            // Quick chomp
            osc('sine', 300, 0.05, 0.2);
            osc('sine', 150, 0.08, 0.15);
            noise(0.03, 0.1, 'highpass', 3000);
        },

        fish_spawn() {
            // Bubble pop
            sweep(800, 1500, 0.06, 'sine', 0.12);
            osc('sine', 1200, 0.04, 0.08);
        },

        predator_alert() {
            // Danger proximity — low pulse
            osc('sine', 80, 0.2, 0.15);
            osc('sine', 120, 0.15, 0.1);
        },

        bubble() {
            // Rising bubble — quick sine blip
            sweep(600, 1800, 0.1, 'sine', 0.06);
        },

        school_form() {
            // Fish schooling — soft shimmer
            osc('triangle', 800, 0.2, 0.05);
            osc('triangle', 1200, 0.15, 0.04);
            osc('triangle', 600, 0.2, 0.03);
        },

        // ═══ PEATON ═══

        jump() {
            // Classic frog hop — rising blip
            sweep(200, 600, 0.08, 'square', 0.15);
        },

        land() {
            // Landing thud
            osc('sine', 100, 0.06, 0.15);
            noise(0.04, 0.08, 'lowpass', 400);
        },

        car_pass() {
            // Doppler-like car whoosh
            sweep(300, 150, 0.3, 'sawtooth', 0.06);
        },

        drown() {
            // Sinking — descending bubbles
            sweep(800, 200, 0.4, 'sine', 0.15);
            noise(0.3, 0.1, 'bandpass', 1500);
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

        ferret_catch() {
            // Predator catches prey — satisfying snap
            osc('square', 600, 0.05, 0.2);
            osc('sine', 400, 0.08, 0.15);
            sweep(1000, 2000, 0.06, 'sine', 0.1);
        },

        // ═══ INTERACTION / OVERWORLD ═══

        click() {
            osc('sine', 1000, 0.03, 0.1);
        },

        hover() {
            osc('sine', 1500, 0.02, 0.05);
        },

        menu_open() {
            sweep(400, 800, 0.1, 'sine', 0.1);
        },

        menu_close() {
            sweep(800, 400, 0.08, 'sine', 0.08);
        },

        footstep() {
            noise(0.04, 0.06, 'lowpass', 500);
            osc('sine', 80, 0.03, 0.05);
        },

        door_open() {
            sweep(200, 500, 0.2, 'triangle', 0.1);
            noise(0.15, 0.05, 'highpass', 2000);
        },

        npc_talk() {
            // Undertale-style character blip
            osc('square', 300 + Math.random() * 200, 0.04, 0.08);
        },

        item_pickup() {
            sweep(500, 1200, 0.1, 'sine', 0.15);
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

        error() {
            // Error buzz
            osc('square', 200, 0.15, 0.15);
            osc('square', 150, 0.2, 0.1);
        },

        // ═══ UNIVERSAL ═══

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

        tick() {
            // Timer/counter tick
            osc('sine', 1000, 0.02, 0.06);
        },

        score() {
            // Score increment
            sweep(800, 1200, 0.04, 'sine', 0.08);
        },
    };

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
        play(name, vol) {
            if (!ensureCtx()) return;
            if (muted) return;
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
