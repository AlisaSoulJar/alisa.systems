import * as THREE from 'three';
import { capasDe, sintetizar } from '../audio/sonido.js';

export class SpatialAudioPlugin {
    constructor(gfx) {
        this.gfx = gfx;
        this.listener = new THREE.AudioListener();
        this.gfx.camera.add(this.listener);
        
        this.audioLoader = new THREE.AudioLoader();
        this.sounds = new Map(); // name -> AudioBuffer
        this.activePool = [];    // array of active PositionalAudio sources
    }

    onInit(gfx) {
        console.log("[SpatialAudio] Listener attached to active Camera.");
    }

    onUpdate(dt) {
        // Positional audio naturally updates via matrix world transforms
    }

    /**
     * Registrar un sonido HECHO A MANO, sin fichero.
     *
     * El plugin sabía cargar .mp3 y sintetizar exactamente UN sonido (el clac
     * del teclado, metido a fuego). Cualquier sala que quisiera un zumbido
     * propio tenía que traer un fichero de audio — justo lo que el motor evita
     * en todo lo demás, donde todo es procedural. Con esto, quien monta la sala
     * fabrica su buffer y lo registra; el plugin se ocupa de la parte 3D, que
     * es lo suyo.
     *
     * @param {string} nombre
     * @param {(ctx: AudioContext) => AudioBuffer} fabricar
     */
    registrarSonido(nombre, fabricar) {
        if (this.sounds.has(nombre)) return this.sounds.get(nombre);
        const buffer = fabricar(this.listener.context);
        this.sounds.set(nombre, buffer);
        return buffer;
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CATÁLOGO DEL ARCADE, COLOCADO EN EL ESPACIO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Había dos sistemas de sonido y parecían duplicados. No lo eran: `sfx.js`
     * es el CATÁLOGO —sesenta y tres sonidos sintetizados— y esto es quien los
     * COLOCA. Faltaba la receta en medio, y resulta que ya existía disfrazada
     * de código: cada sonido son capas de tres primitivas.
     *
     * Ahora esas capas son datos (`public/data/sonidos.json`) y la síntesis es
     * matemática pura (`soma/audio/sonido.js`, sin `AudioContext`). Con eso,
     * **el mismo sonido definido una vez se puede oír plano en el arcade y
     * colocado en una sala 3D**, que es lo que significa que sean componibles.
     *
     *     const n = await plugin.cargarLexicoDeSonidos();
     *     plugin.playPositionalSound('explosion', laMalla);
     *
     * ⚠️ NO SUENA IDÉNTICO AL DE `sfx.js`, Y ESTÁ DICHO EN `sonido.js`: el
     *    filtro de aquí es de un polo y el del navegador de dos. Es el mismo
     *    sonido, no la misma onda. Para colocar algo en el espacio eso sobra;
     *    para comparar muestra a muestra, no valdría.
     */
    async cargarLexicoDeSonidos(url = '/data/sonidos.json') {
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`${r.status} en ${url}`);
            return this.registrarLexicoDeSonidos(await r.json());
        } catch (e) {
            // Sin léxico la escena sigue: los sonidos cargados por fichero y el
            // zumbido no dependen de él. Se avisa y no se rompe nada.
            console.warn('[SpatialAudio] sin léxico de sonidos:', e.message);
            return 0;
        }
    }

    /** Registra cada receta como un buffer. Devuelve cuántas entraron. */
    registrarLexicoDeSonidos(lexico) {
        let n = 0;
        for (const nombre of Object.keys(lexico?.sonidos ?? {})) {
            const capas = capasDe(nombre, lexico);
            if (!capas) continue;
            this.registrarSonido(nombre, (ctx) => {
                const m = sintetizar(capas, { muestreo: ctx.sampleRate });
                const buf = ctx.createBuffer(1, Math.max(1, m.length), ctx.sampleRate);
                buf.getChannelData(0).set(m);
                return buf;
            });
            n++;
        }
        console.log(`[SpatialAudio] ${n} sonidos del léxico, listos para colocar.`);
        return n;
    }

    /**
     * Un zumbido continuo con cuerpo, para que una máquina «suene» de cerca.
     * Dos senos casi afinados: el batido lento entre ellos es lo que hace que
     * un tono parezca un aparato encendido y no un pitido.
     */
    zumbido(nombre, { hz = 92, ancho = 0.35, dur = 2.4, volumen = 0.5 } = {}) {
        return this.registrarSonido(nombre, (ctx) => {
            const n = Math.floor(ctx.sampleRate * dur);
            const buf = ctx.createBuffer(1, n, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < n; i++) {
                const t = i / ctx.sampleRate;
                d[i] = (Math.sin(2*Math.PI*hz*t) + Math.sin(2*Math.PI*(hz+ancho)*t)) * 0.5 * volumen
                     + (Math.random()*2-1) * 0.012;          // un pelo de aire
            }
            // Rampa en los extremos: sin esto, el bucle chasca en cada vuelta.
            const r = Math.floor(ctx.sampleRate * 0.05);
            for (let i = 0; i < r; i++) { d[i] *= i/r; d[n-1-i] *= i/r; }
            return buf;
        });
    }

    // Preload an audio file so there is no delay
    loadSound(name, url) {
        this.audioLoader.load(url, (buffer) => {
            this.sounds.set(name, buffer);
            console.log(`[SpatialAudio] Loaded: ${name}`);
        }, undefined, (err) => {
            console.warn(`[SpatialAudio] Failed to load: ${name}`, err);
        });
    }

    // Play a 3D sound originating from a specific target Mesh/Object3D
    playPositionalSound(name, targetMesh, volume = 1.0, loop = false, refDistance = 2.0) {
        let buffer = this.sounds.get(name);
        
        // Procedural Synthesizer Fallback for keyboard typing
        if (!buffer && name === "typing") {
            buffer = this._synthesizeTypingClack();
            this.sounds.set("typing", buffer);
        }

        if (!buffer) {
            console.warn(`[SpatialAudio] Sound not loaded yet: ${name}`);
            return null;
        }

        // If the sound is already playing rapidly (like typing), we can reuse or create a fast clone
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(buffer);
        sound.setRefDistance(refDistance);
        // ⚠️ El parámetro `loop` existía y NO SE USABA: solo servía para decidir
        // si programar la limpieza. Pedir un sonido en bucle daba un sonido que
        // se oía una vez y moría en silencio, sin un error en consola. Medido en
        // la Sala del Huevo: once máquinas con voz, cero sonando.
        sound.setLoop(!!loop);
        sound.setVolume(volume + (Math.random() * 0.2 - 0.1)); // slight variance

        // Detune for mechanical key variance
        if (name === "typing") {
            // Detune slightly per keystroke for mechanical feel
            sound.detune = (Math.random() - 0.5) * 400; 
        }

        targetMesh.add(sound);
        sound.play();

        // Cleanup after play if not looping
        if (!loop) {
            setTimeout(() => {
                if (sound.isPlaying) sound.stop();
                targetMesh.remove(sound);
            }, (buffer.duration * 1000) + 100);
        }

        return sound;
    }

    // Procedurally generate a mechanical keyboard "clack"
    _synthesizeTypingClack() {
        const audioCtx = this.listener.context;
        const duration = 0.05; // 50ms quick clack
        const sampleRate = audioCtx.sampleRate;
        const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            // Short burst of white noise filtered by an exponential envelope
            const noise = (Math.random() * 2 - 1);
            const env = Math.exp(-t * 60); // Fast decay
            channelData[i] = noise * env * 0.15;
        }
        return buffer;
    }
}
