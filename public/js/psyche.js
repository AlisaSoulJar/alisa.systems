import { Psyches, buildPsycheIntent } from './Psyches.js';
import { AgentBridge } from './AlisaAgentBridge.js';

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
    constructor(config = {}) {
        this.psyche = config.psyche || Psyches.NEUTRAL;
        this.tier = config.tier !== undefined ? config.tier : CognitiveTiers.T0_INSTINCT;
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

        this.isThinking = true;

        try {
            // 1. Generate the Restricted Context Menu based on Biology
            const payload = AgentBridge.generateActionMenu(sovereignBeing, environment);
            
            // 2. Transmit via the required Socket / API based on Tier
            const decidedAction = await AgentBridge.dispatchToAgent(sovereignBeing, payload);
            
            return { action: decidedAction, intent: environment };
        } catch(e) {
            console.error("[Brain] Stroke during /think: ", e);
            return { action: "error" };
        } finally {
            this.isThinking = false;
        }
    }
}
