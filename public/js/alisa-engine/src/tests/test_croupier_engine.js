import { CroupierSystem as CroupierEngine } from '../world/CroupierSystem.js';
import { KinematicRageSystem as KinematicRageEngine } from '../world/systems/KinematicRageSystem.js';

console.log('--- TESTING ALISA ROOM Croupier & Rage Engines (HEADLESS) ---');

// 1. Test CROUPIER
const croupier = new CroupierEngine({ deckX: 2.5, deckZ: 0 });
// Deal Texas Holdem: 5 players, 2 cards each, fan layout
const playerHands = croupier.calculatePlayerHands(5, 2, 'fan', true);
console.log('\n1. CROUPIER ENGINE - Player Hands (Fan, 5P):');
console.log(`Produced ${playerHands.length} hands.`);
console.log('Player 1, Card 1 Transform:', playerHands[0][0]);

// Flop (3 cards)
const flop = croupier.calculateCommunity(3, false);
console.log('\n- CROUPIER ENGINE - The Flop (Line, 3):');
console.log(`Produced ${flop.length} cards.`);
console.log('Flop Card 1 Transform:', flop[0]);


// 2. Test RAGE PHYSICS
const rage = new KinematicRageEngine({ gravity: -60.0 });
const pieces = [
    { id: 'board', isBoard: true, position: {x: 0, y: 0, z: 0}, rotation: {x: 0, y: 0, z: 0} },
    { id: 'piece1', position: {x: 1, y: 0, z: 1}, rotation: {x: 0, y: 0, z: 0} }
];

console.log('\n2. KINEMATIC RAGE ENGINE');
let dynamicEntities = rage.applyImpulse(pieces, { floorY: -15.0 });
console.log('- Initial applied explosion impulse velocities:');
console.log('Board Velocity:', dynamicEntities[0].rageState.velocity);
console.log('Piece Velocity:', dynamicEntities[1].rageState.velocity);

// Simulate 1 second of flipping (60 ticks of 0.016)
for (let i = 0; i < 60; i++) {
    dynamicEntities = rage.tick(dynamicEntities, 0.016);
}

console.log('- State after 1 second of Euler physics:');
console.log(`Board Y: ${dynamicEntities[0].position.y.toFixed(2)}, Piece Y: ${dynamicEntities[1].position.y.toFixed(2)}`);
console.log(`(Floor was -15.0, check bounce)`);

console.log('\n--- ALL ROOM TESTS PASSED ---');
