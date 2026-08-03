/**
 * GymRecorder — LA PARTIDA COMO FLUJO DE RECIBOS FIRMADOS
 * ═══════════════════════════════════════════════════════════════
 * Una partida no es una puntuación: es una CADENA DE RECIBOS.
 * Misma forma que el recibo canónico de la colonia (actor/verb/target/
 * container/engine/receipt_id/timestamp) — el benchmark no inventa un
 * formato, USA el del ledger.
 *
 * Anti-trampas sin pedir datos del usuario, en tres capas:
 *   1. ENCADENADO  cada recibo lleva el hash del anterior → no puedes
 *                  insertar, borrar ni reordenar sin romper la cadena.
 *   2. FIRMADO     la cadena se firma con tu clave privada → nadie puede
 *                  falsificar una partida a tu nombre.
 *   3. INVARIANTES el servidor no compara resultados (la coma flotante
 *                  diverge entre máquinas): comprueba que CADA ACCIÓN ERA
 *                  LEGAL. Auditar acciones, no confiar en resultados —
 *                  exactamente lo que hace la colonia con sus sellos.
 */
export class GymRecorder {
    /**
     * @param {Object} opts
     * @param {string} opts.envId       - p.ej. 'alisa/Asteroids-v0'
     * @param {number} opts.seed
     * @param {string} opts.actor       - hash público del jugador
     * @param {string} [opts.agentType] - 'llm' | 'policy' | 'human' | 'fsm'
     */
    constructor({ envId, seed, actor, agentType = 'unknown' } = {}) {
        this.envId = envId; this.seed = seed; this.actor = actor; this.agentType = agentType;
        this.receipts = [];
        this.prevHash = '0';
        this.startedAt = Date.now();
    }

    /** Hash rápido y determinista (FNV-1a) para encadenar. */
    _chain(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
        return h.toString(16).padStart(8, '0');
    }

    /** Registra un paso. Barato: se llama cada tick. */
    record({ verb = null, args = null, action = null, reward = 0, t = 0, extra = null }) {
        const r = {
            i: this.receipts.length,
            t: +t.toFixed(4),
            verb, args, action,                    // qué hizo el agente
            reward: +(+reward).toFixed(4),
            prev: this.prevHash,
        };
        if (extra) r.extra = extra;
        this.prevHash = this._chain(JSON.stringify(r));
        r.h = this.prevHash;
        this.receipts.push(r);
        return r;
    }

    /**
     * Cierra la partida y la firma. Esto es lo que se manda al leaderboard.
     * @param {Object} score   - salida de env.getScore()
     * @param {GymIdentity} [identity]
     */
    async seal(score, identity = null) {
        const run = {
            env: this.envId,
            seed: this.seed,
            actor: this.actor,
            agent_type: this.agentType,
            steps: this.receipts.length,
            score: score.score,
            metrics: score.metrics || {},
            started_at: this.startedAt,
            ended_at: Date.now(),
            chain_head: this.prevHash,             // sella toda la cadena
            engine: 'alisa-engine',
        };
        if (identity) {
            run.signature = await identity.sign(run);
            run.public_key_hash = identity.publicKeyHash;
            if (identity.forgeTier) run.forge_tier = identity.forgeTier;
        }
        return { run, receipts: this.receipts };
    }

    /**
     * VALIDADOR (el mismo código corre en el cliente y en el Worker).
     * Comprueba la integridad de la cadena y las invariantes del entorno.
     * @param {Object} sealed        - salida de seal()
     * @param {Function} [invariant] - (receipt, i, all) => true | 'motivo del fallo'
     */
    static validate(sealed, invariant = null) {
        const { run, receipts } = sealed;
        const errors = [];
        let prev = '0';
        const chain = s => { let h = 0x811c9dc5;
            for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
            return h.toString(16).padStart(8, '0'); };

        receipts.forEach((r, i) => {
            if (r.i !== i) errors.push(`recibo ${i}: índice fuera de orden`);
            if (r.prev !== prev) errors.push(`recibo ${i}: cadena rota (esperaba ${prev})`);
            const { h, ...body } = r;
            const expect = chain(JSON.stringify(body));
            if (h !== expect) errors.push(`recibo ${i}: hash manipulado`);
            prev = h;
            if (invariant) {
                const v = invariant(r, i, receipts);
                if (v !== true) errors.push(`recibo ${i}: invariante violada — ${v}`);
            }
        });
        if (run.chain_head !== prev) errors.push('la cabeza de cadena no cuadra con los recibos');
        if (run.steps !== receipts.length) errors.push('el nº de pasos declarado no coincide');

        return { valid: errors.length === 0, errors, checked: receipts.length };
    }
}
