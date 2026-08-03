import { ChopperAquariumEngine } from './ChopperAquariumEngine.js';
import { BulletHeavenEngine } from './BulletHeavenEngine.js';
import { InteractionLabEngine } from './InteractionLabEngine.js';
import { KatamariEngine } from './KatamariEngine.js';
import { ScummInteractionEngine } from './ScummInteractionEngine.js';

const engines = [
    { name: 'ChopperAquarium', class: ChopperAquariumEngine },
    { name: 'BulletHeaven', class: BulletHeavenEngine },
    { name: 'InteractionLab', class: InteractionLabEngine },
    { name: 'Katamari', class: KatamariEngine },
    { name: 'ScummInteraction', class: ScummInteractionEngine }
];

console.log('--- ALISA GYM WORKER TEST SUITE ---');
let allPass = true;

for (let e of engines) {
    try {
        const instance = new e.class();
        if (instance.reset) instance.reset();
        
        // Simulate one frame
        if (instance.stepSimulation) {
            instance.stepSimulation(0, 0.1, false);
        } else if (instance.update) {
            instance.update(0.1);
        } else if (instance.tick) {
            instance.tick(0.1);
        }
        
        console.log(`[PASS] ${e.name} initialized and ticked successfully.`);
    } catch (err) {
        console.error(`[FAIL] ${e.name} crashed:`, err.message);
        allPass = false;
    }
}

if (allPass) {
    console.log('--- ALL AGENTS HEALTHY ---');
} else {
    console.log('--- WARNING: SOME AGENTS FAILED ---');
}
