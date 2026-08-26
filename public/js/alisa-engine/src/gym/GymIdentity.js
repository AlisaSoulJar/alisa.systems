/**
 * GymIdentity — TU HASH, SIN CONTARLE NADA A NADIE
 * ═══════════════════════════════════════════════════════════════
 * Al instalar el motor generas un PAR DE CLAVES (ECDSA P-256, Web Crypto).
 *   · La pública ES tu hash → identidad, entrada al leaderboard, y más tarde
 *     tu registro en ALISA (donde se convierte en pasaporte).
 *   · La privada NUNCA sale de tu máquina → firma cada recibo.
 *
 * Por qué claves y no huella de hardware: la huella es rastreo (GPU, red, IDs),
 * es falsificable, y no arregla el determinismo. Una clave da identidad real,
 * recibos infalsificables y CERO datos personales.
 *
 * El `forge_tier` (capacidad de tu equipo) es OPCIONAL y guarda un NÚMERO,
 * nunca tus especificaciones: "3", no "RTX 4070".
 */
const KEY_STORE = 'alisa.gym.identity.v1';

export class GymIdentity {
    constructor() { this.publicKeyHash = null; this.keyPair = null; this.forgeTier = null; }

    /** Crea o recupera la identidad local. */
    async init() {
        const saved = localStorage.getItem(KEY_STORE);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                this.keyPair = {
                    publicKey:  await crypto.subtle.importKey('jwk', d.pub, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']),
                    privateKey: await crypto.subtle.importKey('jwk', d.priv, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']),
                };
                this.publicKeyHash = d.hash; this.forgeTier = d.forgeTier ?? null;
                return this;
            } catch (_) { /* corrupta → regenerar */ }
        }
        this.keyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const pub  = await crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
        const priv = await crypto.subtle.exportKey('jwk', this.keyPair.privateKey);
        this.publicKeyHash = await this._hash(JSON.stringify(pub));
        localStorage.setItem(KEY_STORE, JSON.stringify({ pub, priv, hash: this.publicKeyHash, forgeTier: null }));
        return this;
    }

    async _hash(text) {
        const buf = await crypto.subtle.resumir('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }

    /** Firma un objeto → hex. Sella el recibo contra manipulación. */
    async sign(payload) {
        const data = new TextEncoder().encode(JSON.stringify(payload));
        const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, this.keyPair.privateKey, data);
        return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /** Verifica una firma (lo que hará el validador en el servidor). */
    async verify(payload, hexSig, publicKey = this.keyPair.publicKey) {
        const data = new TextEncoder().encode(JSON.stringify(payload));
        const sig = new Uint8Array(hexSig.match(/../g).map(h => parseInt(h, 16)));
        return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, data);
    }

    /**
     * FORGE TIER — benchmark de CAPACIDAD, opcional y anónimo.
     * Mide qué puede tu máquina y guarda UN NÚMERO (1-5). Nunca las specs.
     * Sirve al motor (calidad automática) y, si te registras en ALISA,
     * marca el tamaño de colonia que puedes albergar.
     * @param {Function} [simTick] - un tick de simulación pura para medir CPU
     */
    async forge(simTick = null) {
        // 1) CPU: cuántos ticks de simulación pura entran en 200 ms
        let ticks = 0; const t0 = performance.now();
        while (performance.now() - t0 < 200) { if (simTick) simTick(1 / 60); else Math.sqrt(ticks); ticks++; }
        // 2) GPU: ¿qué renderer y qué límites reporta WebGL? (capacidad, no identidad)
        let gpuScore = 0.4;
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            if (gl) {
                const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                const maxVary = gl.getParameter(gl.MAX_VARYING_VECTORS) || 8;
                gpuScore = Math.min(1, (maxTex / 16384) * 0.7 + (maxVary / 32) * 0.3);
            }
        } catch (_) {}
        const cpuScore = Math.min(1, ticks / 40000);
        const score = +(cpuScore * 0.6 + gpuScore * 0.4).toFixed(3);
        const tier = score < 0.2 ? 1 : score < 0.4 ? 2 : score < 0.6 ? 3 : score < 0.8 ? 4 : 5;
        this.forgeTier = tier;
        const d = JSON.parse(localStorage.getItem(KEY_STORE) || '{}');
        d.forgeTier = tier; localStorage.setItem(KEY_STORE, JSON.stringify(d));
        // se guarda SOLO esto — ni GPU, ni CPU, ni red
        return { forge_tier: tier, score };
    }
}
