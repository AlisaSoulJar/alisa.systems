import { Psyches, buildPsycheIntent } from './Psyches.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ AQUÍ ESTABA `import { AgentBridge } from './AlisaAgentBridge.js'`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ese fichero vive en `colonia_privada/` y NO viaja al paquete abierto: hace
 * `fetch('http://localhost:8741/beings/queen/think')`, o sea que habla con la
 * reina de una colonia que quien se descargue esto no tiene.
 *
 * Consecuencia, medida el 25-08: **la cadena entera del Ser no cargaba**.
 * `alisa.js` → `psyche.js` → un módulo que no está. `SovereignBeing` —el cerebro
 * triúnico, el espejo en JS del modelo de Ser— estaba publicado y roto, y no se
 * notaba porque ninguna página lo carga.
 *
 * Y era una línea de cincuenta y siete.
 *
 * ⚠️ NO SE COPIA EL PUENTE: SE INVIERTE LA DEPENDENCIA.
 *
 * Traer `AlisaAgentBridge` al paquete abierto publicaría la dirección de un
 * servicio privado y, peor, ataría el modelo de Ser a UNA forma concreta de
 * pensar. El Neocórtex no tiene por qué saber si detrás hay una reina en
 * `:8741`, un Ollama local o nada.
 *
 * Así que el puente se INYECTA, igual que `config.rng` o `opts.fabrica` en el
 * resto de la casa. La colonia privada le pasa el suyo y obtiene lo de siempre;
 * el paquete abierto funciona en T0 sin puente y puede enchufar el que quiera.
 *
 * Y aquí hay algo que merece decirse: **el paquete abierto ya tiene un puente
 * natural**. La puerta de lenguaje del gimnasio es literalmente esto —
 * `describe()` cuenta el estado, `affordances()` genera el menú de acciones
 * legales y `stepVerb()` despacha la elegida—. Un `PuenteDeGimnasio` sería
 * treinta líneas, y entonces un Ser podría pensar con cualquier agente que ya
 * sepa jugar en el banco.
 */
export { Psyches };

export const CognitiveTiers = {
    T0_INSTINCT: 0,       // Flora/Fauna. No API, Local Physics & Psyche Vectors only.
    T1_EDGE_LOCAL: 1,     // Local lightweight LLM (Ollama). Free, infinite calls.
    T2_CLOUD_FREE: 2,     // Fast Free Cloud (Groq, Gemini Flash). Requires internet, zero cost.
    T3_EDGE_HEAVY: 3,     // Heavy Local LLM (Command-R, Qwen). Slower, un-censored, private.
    T4_CLOUD_PAID: 4,     // Sovereign Paid (Claude/GPT4). Requires crypto/fiat budget.
    T5_QUEEN_HUB: 5       // Full ALISA. Ouroboros Loop, VectorDB (Akasha), unrestricted tools.
};

/**
 * ----------------------------------------------------
 * CAPA 3: NEOCORTEX (Alma ALISA / Arquetipos y Lógica Suprema)
 * ----------------------------------------------------
 * Es el que frena, analiza, y manda ejecutar tareas. 
 */
export class Neocortex {
    /**
     * @param {Object}  [config]
     * @param {Object}  [config.psyche] arquetipo de `Psyches`
     * @param {number}  [config.tier]   nivel cognitivo (`CognitiveTiers`)
     * @param {Object}  [config.puente] quien piensa por encima de T0. Tiene que
     *        saber `generateActionMenu(ser, entorno)` y
     *        `dispatchToAgent(ser, contexto)`. Sin él, este Ser vive en T0 — que
     *        es un Ser perfectamente válido: flora y fauna no llaman a nadie.
     */
    constructor(config = {}) {
        this.psyche = config.psyche || Psyches.NEUTRAL;
        this.tier = config.tier !== undefined ? config.tier : CognitiveTiers.T0_INSTINCT;
        this.puente = config.puente ?? null;
        this.executiveGoal = null;
        this.isThinking = false;
    }

    applyCognition(limbicUrge, currentPos, target) {
        if(this.psyche === Psyches.NEUTRAL || this.isThinking) return limbicUrge; 
        
        return buildPsycheIntent(this.psyche, currentPos, target, limbicUrge);
    }

    async think(sovereignBeing, environment) {
        if (this.tier === CognitiveTiers.T0_INSTINCT) {
            return { action: "continue" };
        }

        if (!this.puente) {
            return { action: 'sin_puente', motivo:
                `este Ser declara nivel ${this.tier} pero nadie le paso un puente. ` +
                'Pasale `puente` al Neocortex, o bajalo a T0_INSTINCT.' };
        }

        this.isThinking = true;

        try {
            // 1. El menu de acciones legales, restringido por su biologia
            const payload = this.puente.generateActionMenu(sovereignBeing, environment);

            // 2. Se despacha a quien piense, por donde sea que piense
            const decidedAction = await this.puente.dispatchToAgent(sovereignBeing, payload);
            
            return { action: decidedAction, intent: environment };
        } catch(e) {
            console.error("[Brain] Stroke during /think: ", e);
            return { action: "error" };
        } finally {
            this.isThinking = false;
        }
    }
}
