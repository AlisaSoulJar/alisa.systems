import { States, applyStateModifiers } from './States.js';
import { CognitiveTiers } from './psyche.js';

/**
 * ===============================================================
 * ALISA AGENT BRIDGE (The JRPG Constraint Matrix)
 * ===============================================================
 * Traduce el estado físico y biológico de ALISA en un menú
 * de opciones restrictivas que se envían a la Reina en Python.
 */
export class AlisaAgentBridge {
    constructor() {
        this.baseActions = [
            { id: "EXPLORE", desc: "Patrullar libremente el área.", risk: "LOW" },
            { id: "HIDE", desc: "Buscar cobertura bajo objetos o en rincones.", risk: "LOW" },
            { id: "FLEE", desc: "Huir frenéticamente en dirección opuesta a la amenaza.", risk: "HIGH" },
            { id: "INTERACT", desc: "Interactuar con el objeto frente a ti (Abrir cajón/Pulsar botón).", risk: "MEDIUM" },
            { id: "FREEZE", desc: "Quedarse quieto y hacerse el muerto.", risk: "EXTREME" },
            { id: "ATTACK", desc: "Cargar violentamente contra el objetivo.", risk: "EXTREME" }
        ];
    }

    generateActionMenu(sovereignBeing, environment = {}) {
        const stateMods = applyStateModifiers(sovereignBeing.limbic.estado, 1.0);
        let availableMoves = [];

        // Filtros Lógicos Biológicos
        if (stateMods.fearBias > 1.2) {
            availableMoves = this.baseActions.filter(a => ['FLEE', 'HIDE', 'FREEZE'].includes(a.id));
        } else if (stateMods.jitter > 0 && stateMods.speedMult > 1.2) {
            availableMoves = this.baseActions.filter(a => ['FLEE', 'ATTACK', 'EXPLORE'].includes(a.id));
        } else {
            availableMoves = this.baseActions.filter(a => ['EXPLORE', 'INTERACT', 'HIDE', 'ATTACK'].includes(a.id));
        }
        
        return {
            timestamp: Date.now(),
            hormonal_state: {
                mood: Object.keys(States).find(key => States[key] === sovereignBeing.limbic.estado),
                fear: stateMods.fearBias,
                cohesion: stateMods.cohesionBias
            },
            vision: environment.vision || [],
            available_moves: availableMoves
        };
    }

    async dispatchToAgent(sovereignBeing, contextPayload) {
        const tier = sovereignBeing.neocortex.tier;

        if (tier === CognitiveTiers.T1_EDGE_LOCAL || tier === CognitiveTiers.T2_CLOUD_FREE || tier >= CognitiveTiers.T3_EDGE_HEAVY) {
            console.log(`[Bridge T${tier}] Envío de Payload JRPG al Psyche Gateway de Alisa Hub...`);
            
            // Build the prompt for the python Sovereign Hub
            let allowedVerbs = contextPayload.available_moves.map(a => a.id).join(", ");
            let visionStr = JSON.stringify(contextPayload.vision);
            let stateStr = JSON.stringify(contextPayload.hormonal_state);
            
            let query = `Soy el Actor Simulado en el Lab de Físicas. Mi estado biológico y hormonal es: ${stateStr}.
Entorno que percibo: ${visionStr}.
Mis miedos y frenos biológicos solo me dejan hacer estas cosas ahora mismo: [${allowedVerbs}].
Como Reina Soberana, evalúa la situación y elige estrictamente UNA de las palabras del menú anterior (en MAYUSCULAS). No digas nada más, solo el VERBO.`;

            try {
                const res = await fetch('http://localhost:8741/beings/queen/think', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: query,
                        dialectic: false
                    })
                });
                
                if(!res.ok) throw new Error("HTTP Error " + res.status);
                
                let result = await res.json();
                
                // Usually Ollama responds with text in a 'response' or 'message' field depending on what Queen/Think returns. 
                // Let's fallback to MOCK if the answer doesn't contain a valid move. We'll extract matching uppercase verbs.
                let responseText = JSON.stringify(result).toUpperCase();
                
                for (let move of contextPayload.available_moves) {
                    if (responseText.includes(move.id)) {
                        console.log(`[Reina Python] Decidió: ${move.id}`);
                        return move.id;
                    }
                }
                console.log(`[Reina Python] Failed to decide specifically. Fallback to first. Raw text: ${responseText}`);
                return contextPayload.available_moves[0].id;

            } catch(e) {
                console.warn(`[Bridge] Hub no disponible o falló: ${e.message}. Fallback MOCK Local.`);
                await new Promise(resolve => setTimeout(resolve, 300));
                return contextPayload.available_moves[0].id;
            }
        }

        return "EXPLORE";
    }
}

export const AgentBridge = new AlisaAgentBridge();
