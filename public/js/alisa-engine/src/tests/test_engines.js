import { BoidsSystem } from '../world/systems/BoidsSystem.js';
import { BSPSystem } from '../world/BSPSystem.js';
import { FSMSystem } from '../psyche/FSMSystem.js';
import { IDMSystem } from '../world/systems/IDMSystem.js';
import { KatamariEngine } from '../world/systems/KatamariEngine.js';
import { BSPRenderPlugin } from '../soma/plugins/BSPRenderPlugin.js';
import { StealthSightSystem } from '../world/systems/StealthSightSystem.js';

console.log('--- TESTING ALISA ES6 MATHEMATICAL ENGINES (HEADLESS) ---');

// 1. Test BOIDS
console.log('\n1. BOIDS ENGINE');
const boids = new BoidsSystem({ maxSpeed: 2.0 });
const flock = [
    { id: 1, position: {x:0, y:0, z:0}, velocity: {x:1, y:0, z:0} },
    { id: 2, position: {x:1, y:0, z:1}, velocity: {x:0, y:0, z:1} }
];
const newFlock = boids.tick(flock, null, null, 0.1);
console.log('- Flock updated successfully. Bird 1 pos:', newFlock[0].position);

// 2. Test BSP
console.log('\n2. BSP ENGINE');
const bsp = new BSPSystem({ minLeafSize: 10, maxLeafSize: 20 });
const dungeon = bsp.generate(50, 50, 4);
console.log(`- Dungeon generated: ${dungeon.rooms.length} rooms, ${dungeon.halls.length} halls.`);

// 3. Test FSM — OBSOLETO, y conviene saber por qué
// ⚠️ FALSO AMIGO. Al revivir estas pruebas renombré `FSMEngine` -> `FSMSystem`
// por el patrón de la mudanza, pero NO es el mismo motor con otro nombre: el
// viejo era una FSM de depredador (`tick(agente, ?, presa, dt)` devolviendo
// `{nextState, actionVector}`) y `FSMSystem` es una máquina de estados genérica
// con blackboard y callbacks, cuyo `tick(dt)` no recibe agentes. La prueba no
// falla: prueba algo que ya no existe. Se salta a propósito, con nota, en vez
// de dejarla reventando y aparentando un fallo del motor actual.
console.log('\n3. FSM ENGINE  [saltada: probaba el FSMEngine de depredador, sustituido por FSMSystem]');

// 4. Test IDM
console.log('\n4. IDM ENGINE');
const idm = new IDMSystem({ laneLength: 100 });
const traffic = [
    { id: 'T2', position: 50, velocity: 10, length: 4 }, // Lead car
    { id: 'T1', position: 20, velocity: 20, length: 4 }  // Ego car catching up quickly
];
const updatedTraffic = idm.tick(traffic, 0.1);
// Sort back manually just to see which is T1
const t1_state = updatedTraffic.find(v => v.id === 'T1');
console.log(`- Ego Car (T1) new velocity after braking: ${t1_state.velocity.toFixed(2)} (was 20), Accel: ${t1_state.acceleration.toFixed(2)}`);

// 4b. Test IDM MULTI-LANE (Peatón adapter)
console.log('\n4b. IDM MULTI-LANE ENGINE');
const idmML = new IDMSystem({ laneTolerance: 2.5, lookAhead: 20, laneGapCheck: 10 });
const mlLanes = [
    { z: 14, speed: 8, dir: 1 },
    { z: 10, speed: 12, dir: 1 },
    { z: -10, speed: 10, dir: -1 }
];

// Scenario: car ahead is very close → should brake
const mlVehicles = [
    { id: 0, x: 10, z: 14, dir: 1, speed: 8, baseSpeed: 8, followDist: 8, brakeSensitivity: 4, laneChangeChance: 0, laneZ: 14, sizeX: 2, sizeZ: 4, brakeFactor: 1.0, braking: false, wrecked: false },
    { id: 1, x: 15, z: 14, dir: 1, speed: 5, baseSpeed: 8, followDist: 8, brakeSensitivity: 4, laneChangeChance: 0, laneZ: 14, sizeX: 2, sizeZ: 4, brakeFactor: 1.0, braking: false, wrecked: false }
];
const mlResult = idmML.tickMultiLane(mlVehicles, mlLanes, [], 0.016);
const car0 = mlResult.find(r => r.id === 0);
console.log(`- Close follow braking: brakeFactor=${car0.brakeFactor.toFixed(3)}, braking=${car0.braking} ${car0.braking ? '✅' : '❌'}`);

// Scenario: free road → should NOT brake
const mlFree = [
    { id: 0, x: 10, z: 14, dir: 1, speed: 8, baseSpeed: 8, followDist: 8, brakeSensitivity: 4, laneChangeChance: 0, laneZ: 14, sizeX: 2, sizeZ: 4, brakeFactor: 0.5, braking: true, wrecked: false }
];
const freeResult = idmML.tickMultiLane(mlFree, mlLanes, [], 0.1);
const freeCar = freeResult[0];
console.log(`- Free road recovery: brakeFactor=${freeCar.brakeFactor.toFixed(3)} (should increase from 0.5), braking=${freeCar.braking} ${!freeCar.braking ? '✅' : '❌'}`);

// Scenario: wreck ahead → should brake
const mlWreck = [
    { id: 0, x: 10, z: 14, dir: 1, speed: 8, baseSpeed: 8, followDist: 8, brakeSensitivity: 4, laneChangeChance: 0, laneZ: 14, sizeX: 2, sizeZ: 4, brakeFactor: 1.0, braking: false, wrecked: false }
];
const wreckObs = [{ x: 16, z: 14 }]; // wreck 6 units ahead
const wreckResult = idmML.tickMultiLane(mlWreck, mlLanes, wreckObs, 0.016);
console.log(`- Wreck obstacle braking: braking=${wreckResult[0].braking} ${wreckResult[0].braking ? '✅' : '❌'}`);

// 4c. Test IDM getObservation (RL helper)
console.log('\n4c. IDM RL OBSERVATION');
const egoObs = { x: 0, z: 0, speed: 10, dir: 1 };
const peersObs = [
    { x: 5, z: 0, speed: 8, dir: 1, sizeX: 2, sizeZ: 4 },
    { x: 20, z: 3, speed: 12, dir: -1, sizeX: 2, sizeZ: 4 },
    { x: -10, z: 0, speed: 6, dir: 1, sizeX: 2, sizeZ: 4 }
];
const idmObs = idmML.getObservation(egoObs, peersObs, 2);
console.log(`- Observation: ego=(${idmObs.ego.x},${idmObs.ego.z}), peers=${idmObs.peers.length} ${idmObs.peers.length === 2 ? '✅' : '❌'}`);
console.log(`- Nearest peer dx=${idmObs.peers[0].dx.toFixed(1)} (should be 5) ${Math.abs(idmObs.peers[0].dx - 5) < 0.1 ? '✅' : '❌'}`);

// 5. Test KATAMARI
console.log('\n5. KATAMARI ENGINE');
const katamari = new KatamariEngine({ minVolumeDiff: 1.1, absorptionFactor: 0.5 });
const predator = { id: 'King', position: {x:0,y:0,z:0}, volume: 100, radius: 2.87 }; // large
const preys = [
    { id: 'Ant', position: {x:1,y:0,z:0}, volume: 10, radius: 1.33 }, // inside blast radius
    { id: 'Cow', position: {x:50,y:0,z:0}, volume: 50, radius: 2.28 } // far away
];
const result = katamari.processCollisions(predator, preys);
console.log(`- Katamari collision: Absorbed [${result.absorbedIds.join(',')}], New Volume: ${result.newPredatorVolume}, Prey remaining: ${result.remainingPrey.length}`);

// 6. Test BSP RENDER ENGINE (Topology Only — No Three.js)
console.log('\n6. BSP RENDER ENGINE (Topology)');

// Deterministic PRNG for reproducible tests
function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const rng42 = mulberry32(42);
const topology = BSPRenderPlugin.generateBSPTopology(rng42, 16, 16, 2);
console.log(`- Topology generated: ${topology.rooms.length} rooms, ${topology.walls.length} walls`);

// Verify determinism: same seed → same output
const rng42b = mulberry32(42);
const topology2 = BSPRenderPlugin.generateBSPTopology(rng42b, 16, 16, 2);
const deterministic = topology.rooms.length === topology2.rooms.length &&
    topology.walls.length === topology2.walls.length &&
    topology.rooms[0].x === topology2.rooms[0].x;
console.log(`- Determinism check: ${deterministic ? 'PASSED ✅' : 'FAILED ❌'}`);

// Verify all rooms have positive dimensions
const validRooms = topology.rooms.every(r => r.w > 0 && r.d > 0);
console.log(`- Room validity (positive dims): ${validRooms ? 'PASSED ✅' : 'FAILED ❌'}`);

// Verify rooms have semantic types
const hasTypes = topology.rooms.every(r => r.type === 'room' || r.type === 'corridor');
console.log(`- Semantic typing: ${hasTypes ? 'PASSED ✅' : 'FAILED ❌'}`);


// 7. Test STEALTH SIGHT ENGINE (AABB + Raycasting)
console.log('\n7. STEALTH SIGHT ENGINE');
const stealth = new StealthSightSystem();

// 7a. Collision resolution
const walls = [
    { minX: 5, maxX: 6, minZ: -10, maxZ: 10, isDoor: false, isOpen: false },
    { minX: -6, maxX: -5, minZ: -10, maxZ: 10, isDoor: false, isOpen: false }
];
const resolved = stealth.resolveCollisions(5.3, 0, walls, 0.2);
console.log(`- Collision resolved: (5.3, 0) → (${resolved.x.toFixed(1)}, ${resolved.z.toFixed(1)})`);
const collisionOk = resolved.x <= 5.0 - 0.2; // Should be pushed to nearest face (left) minus margin
console.log(`- Collision push-out: ${collisionOk ? 'PASSED ✅' : 'FAILED ❌'}`);

// 7b. Open door should NOT block
const doorWalls = [
    { minX: 5, maxX: 6, minZ: -1, maxZ: 1, isDoor: true, isOpen: true }
];
const doorResolved = stealth.resolveCollisions(5.5, 0, doorWalls, 0.2);
const doorPassThrough = doorResolved.x === 5.5; // Should pass through open door
console.log(`- Open door pass-through: ${doorPassThrough ? 'PASSED ✅' : 'FAILED ❌'}`);

// 7c. Ray casting
const rayResult = stealth.castRay(0, 0, 0, 20, walls); // Cast ray along +Z
console.log(`- Ray cast: hit=${rayResult.hit}, dist=${rayResult.distance.toFixed(2)}`);

// 7d. Line of sight (blocked)
const canSeeBlocked = stealth.canSeePoint2D(0, 0, 8, 0, walls, 20);
console.log(`- LOS blocked by wall: ${!canSeeBlocked ? 'PASSED ✅' : 'FAILED ❌'}`);

// 7e. Line of sight (clear)
const canSeeClear = stealth.canSeePoint2D(0, 0, 0, 4, walls, 20);
console.log(`- LOS clear (parallel to wall): ${canSeeClear ? 'PASSED ✅' : 'FAILED ❌'}`);



// 8. Test ECOSYSTEM SIM ENGINE (Full Food Chain)
console.log('\n8. ECOSYSTEM SIM ENGINE');
import { EcosystemSystem } from '../world/systems/EcosystemSystem.js';
const eco = new EcosystemSystem();

const TANK = { width: 40, depth: 40, waterLevel: 12, maxPlankton: 50, EAT_RADIUS: 1.5 };

// 8a. Plankton drift
const planktonArr = [
    { id: 'p1', alive: true, x: 0, y: 5, z: 0, baseY: 5, ampY: 2, phase: 0, spawnTimer: 10 },
    { id: 'p2', alive: true, x: 3, y: 7, z: 2, baseY: 7, ampY: 1.5, phase: 1.0, spawnTimer: 8 }
];
const updatedPlankton = eco.tickPlankton(planktonArr, 0.5, TANK, 1.0);
console.log(`- Plankton ticked: ${updatedPlankton.length} alive, p1.y=${updatedPlankton[0].y.toFixed(2)}`);
const planktonMoved = updatedPlankton[0].phase !== 0;
console.log(`- Plankton phase advanced: ${planktonMoved ? 'PASSED ✅' : 'FAILED ❌'}`);

// 8b. Fish schooling + flee behavior
const makeFish = (id, x, y, z) => ({
    id, alive: true, isHidden: false, x, y, z, tx: x+2, ty: y, tz: z+2,
    vx: 1, vy: 0, vz: 0, speed: 3, timer: 1.0, state: 'wander',
    stamina: 80, maxStamina: 100, exhausted: false, score: 0,
    hideCooldown: 0, hideTimer: 0, currentHideSpot: null, eatTriggerId: null
});
const fishArr = [makeFish('f1', 0, 5, 0), makeFish('f2', 1, 5, 1), makeFish('f3', 2, 5, 0)];
const noHunters = [], noSharks = [], noJelly = [], noCorals = [];
const updatedFish = eco.tickFishes(fishArr, noHunters, noSharks, planktonArr, noJelly, noCorals, 0.1, 1.0, TANK);
console.log(`- Fish ticked: ${updatedFish.length} alive, f1 state=${updatedFish[0].state}`);
const fishMoved = updatedFish[0].x !== 0 || updatedFish[0].z !== 0;
console.log(`- Fish kinematics: ${fishMoved ? 'PASSED ✅' : 'FAILED ❌'}`);

// 8c. Fish flee from hunter
const hunterArr = [{
    id: 'h1', alive: true, x: 1, y: 5, z: 1, tx: 0, ty: 5, tz: 0,
    vx: 0, vy: 0, vz: -1, speed: 8, timer: 1.0, state: 'patrol',
    energy: 100, exhausted: false, score: 0, stamina: 100,
    commitTargetId: null, commitTimer: 0,
    eatTriggerId: null, bloodTrigger: null
}];
const fleeingFish = eco.tickFishes(
    [makeFish('ff1', 2, 5, 2)], hunterArr, noSharks, planktonArr, noJelly, noCorals, 0.1, 1.0, TANK
);
console.log(`- Fish near hunter state: ${fleeingFish[0].state}`);
const isFleeing = fleeingFish[0].state === 'flee';
console.log(`- Fish flee response: ${isFleeing ? 'PASSED ✅' : 'FAILED ❌'}`);

// 8d. Hunter hunts fish
const huntFish = [makeFish('prey1', 5, 5, 5)];
const updatedHunters = eco.tickHunters(hunterArr, huntFish, noSharks, noJelly, noCorals, 0.1, 1.0, TANK);
console.log(`- Hunter ticked: state=${updatedHunters[0].state}`);
const hunterHunts = updatedHunters[0].state === 'hunt' || updatedHunters[0].state === 'patrol';
console.log(`- Hunter AI active: ${hunterHunts ? 'PASSED ✅' : 'FAILED ❌'}`);

// 8e. Shark apex predation (kill on contact)
const sharkArr = [{
    id: 's1', alive: true, x: 1, y: 5, z: 1, tx: 10, ty: 5, tz: 10,
    vx: 1, vy: 0, vz: 0, speed: 10, timer: 1.0, state: 'patrol',
    score: 0, eatTriggerId: null, bloodTrigger: null
}];
const closeHunter = [{
    id: 'h_close', alive: true, x: 1.5, y: 5, z: 1, tx: 0, ty: 5, tz: 0,
    vx: 0, vy: 0, vz: -1, speed: 8, timer: 1.0, state: 'patrol',
    energy: 100, exhausted: false, score: 0, stamina: 100,
    commitTargetId: null, commitTimer: 0,
    eatTriggerId: null, bloodTrigger: null
}];
const updatedSharks = eco.tickSharks(sharkArr, closeHunter, noHunters, noJelly, noCorals, 0.1, 1.0, TANK);
const sharkKilled = !closeHunter[0].alive || updatedSharks[0].score > 0;
console.log(`- Shark apex kill: ${sharkKilled ? 'PASSED ✅' : 'FAILED ❌'}`);


// 9. Test ORBITAL KINEMATICS ENGINE (Shmup Physics)
console.log('\n9. ORBITAL KINEMATICS ENGINE');
import { OrbitalKinematicsSystem } from '../world/systems/OrbitalKinematicsSystem.js';
const orbital = new OrbitalKinematicsSystem({ arenaW: 120, arenaH: 60 });

// 9a. Asteroid Euler integration
const testAsteroids = [
    { id: 'a1', x: 0, y: 0, z: 100, vx: 10, vy: 5, vz: 20, rx: 0, ry: 0, rz: 0, rvx: 1, rvy: 0.5, rvz: 0.2 },
    { id: 'a2', x: 50, y: 20, z: 50, vx: -5, vy: 0, vz: 15, rx: 0, ry: 0, rz: 0, rvx: 0, rvy: 1, rvz: 0, isMono: true, pingPongMinX: 40, pingPongMaxX: 60 }
];
const tickedAsteroids = orbital.tickAsteroids(testAsteroids, 1.0, 0);
console.log(`- Asteroid a1: x=${tickedAsteroids[0].x.toFixed(1)}, z=${tickedAsteroids[0].z.toFixed(1)}`);
const a1Moved = tickedAsteroids[0].x === 10 && tickedAsteroids[0].z === 80;
console.log(`- Euler integration: ${a1Moved ? 'PASSED ✅' : 'FAILED ❌'}`);

// 9b. Monolith ping-pong bounds
const monoAsteroid = [{ id: 'mono', x: 58, y: 0, z: 100, vx: 10, vy: 0, vz: 0, rx:0, ry:0, rz:0, rvx:0, rvy:0, rvz:0, isMono: true, pingPongMinX: 40, pingPongMaxX: 60 }];
orbital.tickAsteroids(monoAsteroid, 1.0, 0); // x = 68, but clamped to 60, vx flipped
const monoBounced = monoAsteroid[0].vx < 0 && monoAsteroid[0].x === 60;
console.log(`- Monolith ping-pong bounce: ${monoBounced ? 'PASSED ✅' : 'FAILED ❌'}`);

// 9c. Asteroid GC (behind camera)
const farBehind = [{ id: 'gc1', x: 0, y: 0, z: -50, vx: 0, vy: 0, vz: 0, rx:0, ry:0, rz:0, rvx:0, rvy:0, rvz:0 }];
orbital.tickAsteroids(farBehind, 0.1, 0);
console.log(`- GC flagged for z=-50: ${farBehind[0].gc === true ? 'PASSED ✅' : 'FAILED ❌'}`);

// 9d. Enemy AI behaviors
const makeEnemy = (id, tp, extra = {}) => ({
    id, t: tp, x: 0, y: 0, z: 100, sp: 20, vx: 0, vy: 0,
    rx: 0, ry: 0, rz: 0, fireRate: 0, fireT: 0, sinePhase: 0, ...extra
});
const enemies = [
    makeEnemy('e1', 'LINER'),
    makeEnemy('e2', 'POPCORN', { sinePhase: 0.5 }),
    makeEnemy('e3', 'TRACKER', { sp: 15 })
];
const ship = { x: 10, y: 5, z: 50, rz: 0, rx: 0, dead: false, inNebula: false };
const tickedEnemies = orbital.tickEnemies(enemies, 1.0, 0, 1.0, ship, []);

const linerMoved = tickedEnemies[0].z < 100; // LINER moves forward
const trackerTracked = tickedEnemies[2].x > 0; // TRACKER pursues ship.x=10
console.log(`- LINER advance: ${linerMoved ? 'PASSED ✅' : 'FAILED ❌'}`);
console.log(`- TRACKER pursuit: ${trackerTracked ? 'PASSED ✅' : 'FAILED ❌'}`);

// 9e. Projectile lifecycle
const bullets = [
    { id: 'b1', x: 0, y: 0, z: 50, vx: 0, vy: 0, vz: 80, life: 2.0, isPlayer: true, wobble: 0.5, wobbleT: 0 },
    { id: 'b2', x: 0, y: 0, z: 50, vx: 5, vy: 0, vz: -30, life: 0.05 } // about to expire
];
const tickedBullets = orbital.tickProjectiles(bullets, 0.1, 0);
const b1Advanced = tickedBullets[0].z > 50;
const b2Expired = tickedBullets[1].gc === true || tickedBullets[1].life <= 0;
console.log(`- Bullet advance: ${b1Advanced ? 'PASSED ✅' : 'FAILED ❌'}`);
console.log(`- Bullet expiry: ${b2Expired ? 'PASSED ✅' : 'FAILED ❌'}`);


// 10. Test PHANTOM FSM ENGINE (Weeping Angel Predator)
console.log('\n10. PHANTOM FSM ENGINE');
import { PhantomFSMSystem } from '../world/systems/PhantomFSMSystem.js';
const phantom = new PhantomFSMSystem({ ambushKillThreshold: 3.0, pushbackSpeed: 4.0 });

const makeEnv = (seekerRoom, seekerX, seekerZ, isIlluminated = false) => ({
    seekerRoom,
    seekerPos: { x: seekerX, z: seekerZ },
    isIlluminated,
    rooms: [
        { id: 0, center: { x: 0, z: 0 } },
        { id: 1, center: { x: 10, z: 0 } },
        { id: 2, center: { x: -10, z: 0 } },
        { id: 3, center: { x: 0, z: 10 } }
    ],
    exploredRooms: new Set([0]),
    walls: [{ minX: -7.5, maxX: -7.0, minZ: -8, maxZ: 8 }], // wall on left
    arenaW: 16,
    arenaH: 16
});

// 10a. HUNTING state: ambush timer decays when seeker is NOT in room
let ps = phantom.createState(0);
ps.ambushTimer = 2.0;
ps.position = { x: 0, z: 0 };
let env10 = makeEnv(1, 5, 5); // seeker in room 1, phantom in room 0
phantom.tick(ps, env10, 1.0);
console.log(`- Hunting decay: timer ${ps.ambushTimer.toFixed(1)} (was 2.0)`);
const huntingDecayed = ps.ambushTimer < 2.0 && ps.phase === 'hunting';
console.log(`- Hunting state preserved: ${huntingDecayed ? 'PASSED ✅' : 'FAILED ❌'}`);

// 10b. AMBUSHING in darkness: timer increments toward kill
ps = phantom.createState(0);
ps.position = { x: 0, z: 0 };
env10 = makeEnv(0, 3, 3); // seeker IN phantom's room
for (let i = 0; i < 40; i++) phantom.tick(ps, env10, 0.1); // 4 seconds
const ambushKilled = ps.isDead && ps.events.includes('killed_prey');
console.log(`- Ambush kill after 4s darkness: ${ambushKilled ? 'PASSED ✅' : 'FAILED ❌'}`);

// 10c. AMBUSHING with illumination: pushback
ps = phantom.createState(0);
ps.position = { x: 0, z: 0 };
env10 = makeEnv(0, 5, 0, true); // seeker in room, light ON
phantom.tick(ps, env10, 1.0);
const pushedBack = ps.position.x < 0; // pushed away from seeker at x=5
console.log(`- Light pushback: phantom x=${ps.position.x.toFixed(2)} (pushed left)`);
console.log(`- Pushback direction: ${pushedBack ? 'PASSED ✅' : 'FAILED ❌'}`);

// 10d. Wall-hit despawn: push phantom against left wall
ps = phantom.createState(0);
ps.position = { x: -7.2, z: 0 }; // near left wall
env10 = makeEnv(0, 5, 0, true); // illuminated
phantom.tick(ps, env10, 1.0);
const wallDespawn = ps.phase === 'despawning' && ps.events.includes('vanished');
console.log(`- Wall-hit despawn: ${wallDespawn ? 'PASSED ✅' : 'FAILED ❌'}`);

// 10e. Despawn → relocation to furthest room
ps = phantom.createState(0);
ps.phase = 'despawning';
ps.ambushTimer = 0.1;
ps.position = { x: 0, z: 0 };
env10 = makeEnv(0, 0, 0);
phantom.tick(ps, env10, 0.2); // triggers relocation
const relocated = ps.phase === 'hunting' && ps.room !== 0 && ps.events.includes('relocated');
console.log(`- Relocation to room ${ps.room}: ${relocated ? 'PASSED ✅' : 'FAILED ❌'}`);

// 10f. Visibility: invisible during early ambush, materializes after threshold
ps = phantom.createState(0);
ps.position = { x: 0, z: 0 };
env10 = makeEnv(0, 5, 5);
phantom.tick(ps, env10, 1.0); // 1s into ambush
const invisibleEarly = ps.visibility === 0;
console.log(`- Invisible at 1s ambush: ${invisibleEarly ? 'PASSED ✅' : 'FAILED ❌'}`);


// 11. Test SIMON SAYS ENGINE (Reactive Pattern Matcher)
console.log('\n11. SIMON SAYS ENGINE');
import { SimonSaysSystem } from '../world/systems/SimonSaysSystem.js';

// Deterministic RNG for reproducible tests
function seededRng(seed) {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const simon = new SimonSaysSystem({
    actionTimeLimit: 2.0,
    tileTimeLimit: 3.0,
    tileChance: 0.5,
    cooldownAfterHit: 0.8,
    cooldownAfterMiss: 1.2
});

// 11a. Start game and get a target
let ss = simon.createState();
const rng11 = seededRng(42);
simon.start(ss, rng11);
const hasTarget = ss.active && ss.currentTarget !== null;
console.log(`- Game started, target: ${ss.currentTarget} (${ss.targetType})`);
console.log(`- Start state valid: ${hasTarget ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11b. Correct action → HIT
ss = simon.createState();
const rng11b = seededRng(99); // seed that gives action target
simon.start(ss, () => 0.9); // force action target (rng > tileChance=0.5)
const targetAction = ss.currentTarget;
const { matched } = simon.submitAction(ss, targetAction);
console.log(`- Correct action '${targetAction}': matched=${matched}`);
console.log(`- Hit registered: ${matched && ss.hits === 1 ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11c. Wrong action → MISS
ss = simon.createState();
simon.start(ss, () => 0.9); // action target
const wrongResult = simon.submitAction(ss, 'DEFINITELY_WRONG_ACTION');
console.log(`- Wrong action: misses=${ss.misses}`);
console.log(`- Miss registered: ${ss.misses === 1 ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11d. Tile target + tile arrival
ss = simon.createState();
simon.start(ss, () => 0.1); // force tile target (rng < tileChance=0.5)
const tileTarget = ss.currentTarget; // should be 'tile_X_Z'
const isTileTarget = tileTarget.startsWith('tile_');
console.log(`- Tile target: ${tileTarget}`);
console.log(`- Is tile type: ${isTileTarget && ss.targetType === 'tile' ? 'PASSED ✅' : 'FAILED ❌'}`);

// Extract coords and submit
if (isTileTarget) {
    const parts = tileTarget.split('_');
    const tx = parseInt(parts[1]), tz = parseInt(parts[2]);
    const tileResult = simon.submitTileArrival(ss, tx, tz);
    console.log(`- Tile arrival match: ${tileResult.matched ? 'PASSED ✅' : 'FAILED ❌'}`);
}

// 11e. Timeout → auto-miss
ss = simon.createState();
simon.start(ss, () => 0.9);
// Tick past the time limit (2.0s)
for (let i = 0; i < 25; i++) simon.tick(ss, 0.1);
const timedOut = ss.misses === 1 && ss.currentTarget === null;
console.log(`- Timeout after 2.5s: ${timedOut ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11f. Cooldown prevents immediate next target
ss = simon.createState();
simon.start(ss, () => 0.9);
simon.submitAction(ss, ss.currentTarget); // HIT
const inCooldown = ss.cooldown > 0 && ss.currentTarget === null;
console.log(`- Post-hit cooldown active: ${inCooldown ? 'PASSED ✅' : 'FAILED ❌'}`);

// Tick through cooldown
for (let i = 0; i < 10; i++) simon.tick(ss, 0.1, () => 0.9);
const afterCooldown = ss.currentTarget !== null;
console.log(`- New target after cooldown: ${afterCooldown ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11g. Score calculation
ss = simon.createState();
simon.start(ss, () => 0.9);
simon.submitAction(ss, ss.currentTarget); // +1 hit
for (let i = 0; i < 10; i++) simon.tick(ss, 0.1, () => 0.9); // cooldown
simon.submitAction(ss, 'WRONG'); // +1 miss
const obs = simon.getObservation(ss);
const expectedScore = 1 * 10 - 1 * 5; // 5
console.log(`- Score: ${obs.score} (expected ${expectedScore})`);
console.log(`- Score calculation: ${obs.score === expectedScore ? 'PASSED ✅' : 'FAILED ❌'}`);

// 11h. RL observation space
const obs2 = simon.getObservation(ss);
const hasFields = obs2.mode && obs2.target !== undefined && obs2.timerRatio !== undefined;
console.log(`- RL observation space: ${hasFields ? 'PASSED ✅' : 'FAILED ❌'}`);


// ============================================================================
// 12. KataSequenceSystem Test Suite
// ============================================================================
import { KataSequenceSystem } from '../world/systems/KataSequenceSystem.js';

function testKataSequenceEngine() {
    let passed = 0;
    const total = 4;
    console.log('\n--- Running KataSequenceSystem Tests ---');
    
    const engine = new KataSequenceSystem();
    
    // Test 1: Instantiation and Library Exists
    if (Object.keys(engine.library).length >= 3 && engine.isPlaying === false) {
        passed++;
    } else {
        console.error('FAILED: KataSequenceSystem initialization or missing library');
    }
    
    // Test 2: Starting a Sequence
    engine.play('ninja_1');
    if (engine.isPlaying && engine.sequence.length === 6 && engine.elapsedMs === 0) {
        passed++;
    } else {
        console.error('FAILED: KataSequenceSystem play() state setup');
    }
    
    // Test 3: Tick Mechanics and Frame Precision
    // ninja_1 sequence:
    // { delay: 0, action: 'acrobat' } at t=0
    // { delay: 1100, action: 'attack' } at t=1100
    
    // Tick 1: dt=0.5 -> elapsed=500ms
    let triggered1 = engine.tick(0.5); 
    // Should trigger the 0ms action!
    if (triggered1.length === 1 && triggered1[0].action === 'acrobat') {
        passed++;
    } else {
        console.error('FAILED: KataSequenceSystem tick timing logic (1st frame limit)');
    }
    
    // Tick 2: dt=0.7 -> elapsed=1200ms
    let  triggered2 = engine.tick(0.7);
    // Should trigger the 1100ms action!
    if (triggered2.length === 1 && triggered2[0].action === 'attack') {
        passed++;
    } else {
        console.error('FAILED: KataSequenceSystem tick timing logic (2nd frame crossing)');
    }
    
    console.log(`KataSequenceSystem: ${passed}/${total} sub-tests passed`);
}

testKataSequenceEngine();


// ============================================================================
// 13. FoodChainSystem Test Suite (Multi-Tier Predator-Prey FSM)
// ============================================================================
import { FoodChainSystem } from '../world/systems/FoodChainSystem.js';

function testFoodChainEngine() {
    let passed = 0;
    const total = 14;
    console.log('\n--- Running FoodChainSystem Tests ---');

    const fce = new FoodChainSystem({ arenaSize: 18 });

    // 13a. Prey creation
    const prey1 = fce.createPreyState('mouse_1', { x: 5, z: 5 });
    if (prey1.role === 'prey' && prey1.alive && prey1.phase === 'wander' && prey1.stamina === 100) {
        passed++;
        console.log('- 13a Prey creation: PASSED ✅');
    } else {
        console.error('FAILED: 13a Prey creation');
    }

    // 13b. Predator creation (mid-tier fox)
    const fox1 = fce.createPredatorState('fox_1', 'mid', { x: 0, z: 0 });
    if (fox1.role === 'predator' && fox1.tier === 'mid' && fox1.sightRange === 10.0 && fox1.sprintSpeed === 5.2) {
        passed++;
        console.log('- 13b Fox creation: PASSED ✅');
    } else {
        console.error('FAILED: 13b Fox creation');
    }

    // 13c. Predator creation (apex raptor)
    const raptor1 = fce.createPredatorState('raptor_1', 'apex', { x: -10, z: -10 });
    if (raptor1.tier === 'apex' && raptor1.sightRange === 5.0 && raptor1.sprintSpeed === 3.5) {
        passed++;
        console.log('- 13c Raptor creation: PASSED ✅');
    } else {
        console.error('FAILED: 13c Raptor creation');
    }

    // 13d. Prey flees from nearby predator
    const fleeingMouse = fce.createPreyState('flee_test', { x: 5, z: 5 });
    const nearbyPred = { id: 'fox_near', position: { x: 7, z: 5 }, alive: true };
    fce.tickPrey(fleeingMouse, { predators: [nearbyPred], cheese: [], crates: [] }, 0.5);
    const didFlee = fleeingMouse.phase === 'flee' && fleeingMouse.events.includes('fled');
    if (didFlee) {
        passed++;
        console.log('- 13d Prey flee: PASSED ✅');
    } else {
        console.error(`FAILED: 13d Prey flee (phase=${fleeingMouse.phase}, events=${fleeingMouse.events})`);
    }

    // 13e. Prey hides near crate
    const hidingMouse = fce.createPreyState('hide_test', { x: 3, z: 3 });
    const crate = { id: 'crate_1', position: { x: 3.2, z: 3 } };
    // Predator far away — mouse should not flee, should hide
    fce.tickPrey(hidingMouse, { predators: [], cheese: [], crates: [crate] }, 0.1);
    if (hidingMouse.isHidden) {
        passed++;
        console.log('- 13e Prey hide: PASSED ✅');
    } else {
        console.error('FAILED: 13e Prey hide');
    }

    // 13f. Prey eats cheese
    const hungryMouse = fce.createPreyState('hungry_test', { x: 0, z: 0 });
    hungryMouse.stamina = 50;
    const cheese1 = { id: 'cheese_1', position: { x: 0.3, z: 0 } };
    fce.tickPrey(hungryMouse, { predators: [], cheese: [cheese1], crates: [] }, 0.1);
    const ateCheese = hungryMouse.events.includes('cheese_eaten') && hungryMouse.stamina > 50;
    if (ateCheese) {
        passed++;
        console.log('- 13f Prey eats cheese: PASSED ✅');
    } else {
        console.error('FAILED: 13f Prey eats cheese');
    }

    // 13g. Prey stamina exhaustion
    const tiredMouse = fce.createPreyState('tired_test', { x: 5, z: 5 });
    tiredMouse.stamina = 1;
    const chaser = { id: 'fox_chase', position: { x: 7, z: 5 }, alive: true };
    fce.tickPrey(tiredMouse, { predators: [chaser], cheese: [], crates: [] }, 1.0);
    if (tiredMouse.exhausted && tiredMouse.stamina === 0) {
        passed++;
        console.log('- 13g Prey exhaustion: PASSED ✅');
    } else {
        console.error('FAILED: 13g Prey exhaustion');
    }

    // 13h. Predator hunts visible prey
    const hunterFox = fce.createPredatorState('hunter_fox', 'mid', { x: 0, z: 0 });
    const targetPrey = { id: 'mouse_target', position: { x: 5, z: 0 }, alive: true, isHidden: false };
    fce.tickPredator(hunterFox, { prey: [targetPrey], apex: [], crates: [], allies: [] }, 0.5);
    const isHunting = hunterFox.phase === 'hunt_sight' || hunterFox.phase === 'hunt_smell';
    const movedToward = hunterFox.position.x > 0; // Should move toward prey at x=5
    if (isHunting && movedToward) {
        passed++;
        console.log(`- 13h Predator hunt: PASSED ✅ (phase=${hunterFox.phase}, x=${hunterFox.position.x.toFixed(2)})`);
    } else {
        console.error(`FAILED: 13h Predator hunt (phase=${hunterFox.phase}, x=${hunterFox.position.x})`);
    }

    // 13i. Predator kills on contact
    const killerFox = fce.createPredatorState('killer_fox', 'mid', { x: 0, z: 0 });
    const closePrey = { id: 'doomed', position: { x: 0.5, z: 0 }, alive: true, isHidden: false };
    fce.tickPredator(killerFox, { prey: [closePrey], apex: [], crates: [], allies: [] }, 0.1);
    if (killerFox.events.includes('kill') && killerFox.score === 1) {
        passed++;
        console.log('- 13i Predator kill: PASSED ✅');
    } else {
        console.error(`FAILED: 13i Predator kill (events=${killerFox.events}, score=${killerFox.score})`);
    }

    // 13j. Predator cannot kill hidden prey
    const blindFox = fce.createPredatorState('blind_fox', 'mid', { x: 0, z: 0 });
    const hiddenPrey = { id: 'hidden_mouse', position: { x: 0.5, z: 0 }, alive: true, isHidden: true };
    fce.tickPredator(blindFox, { prey: [hiddenPrey], apex: [], crates: [], allies: [] }, 0.1);
    const didNotKill = blindFox.score === 0 && !blindFox.events.includes('kill');
    if (didNotKill) {
        passed++;
        console.log('- 13j Hidden prey survives: PASSED ✅');
    } else {
        console.error('FAILED: 13j Hidden prey survives');
    }

    // 13k. Mid-predator flees from apex
    const scaredFox = fce.createPredatorState('scared_fox', 'mid', { x: 5, z: 5 });
    const apex = { id: 'raptor_threat', position: { x: 7, z: 5 }, alive: true, rotation: 0 };
    // No prey nearby — should flee
    fce.tickPredator(scaredFox, { prey: [], apex: [apex], crates: [], allies: [] }, 0.5);
    if (scaredFox.phase === 'flee') {
        passed++;
        console.log('- 13k Predator flee from apex: PASSED ✅');
    } else {
        console.error(`FAILED: 13k Predator flee (phase=${scaredFox.phase})`);
    }

    // 13l. Predator stamina drain during hunt
    const tiredFox = fce.createPredatorState('tired_fox', 'mid', { x: 0, z: 0 });
    tiredFox.stamina = 10;
    const farPrey = { id: 'far_mouse', position: { x: 8, z: 0 }, alive: true, isHidden: false };
    for (let i = 0; i < 20; i++) fce.tickPredator(tiredFox, { prey: [farPrey], apex: [], crates: [], allies: [] }, 0.1);
    if (tiredFox.exhausted) {
        passed++;
        console.log('- 13l Predator stamina drain: PASSED ✅');
    } else {
        console.error('FAILED: 13l Predator stamina drain');
    }

    // 13m. RL Prey observation space
    const obsTestMouse = fce.createPreyState('obs_mouse', { x: 3, z: 4 });
    const obs13 = fce.getPreyObservation(obsTestMouse, { predators: [], cheese: [{ id: 'c1', position: { x: 0, z: 0 } }] });
    const hasPreyFields = obs13.phase && obs13.x === 3 && obs13.z === 4 && obs13.cheeseRemaining === 1;
    if (hasPreyFields) {
        passed++;
        console.log('- 13m Prey RL observation: PASSED ✅');
    } else {
        console.error('FAILED: 13m Prey RL observation');
    }

    // 13n. RL Predator observation space
    const obsTestFox = fce.createPredatorState('obs_fox', 'mid', { x: -2, z: 7 });
    obsTestFox.score = 3;
    const obs14 = fce.getPredatorObservation(obsTestFox, { prey: [] });
    const hasPredFields = obs14.tier === 'mid' && obs14.score === 3 && obs14.x === -2;
    if (hasPredFields) {
        passed++;
        console.log('- 13n Predator RL observation: PASSED ✅');
    } else {
        console.error('FAILED: 13n Predator RL observation');
    }

    console.log(`FoodChainSystem: ${passed}/${total} sub-tests passed`);
}

testFoodChainEngine();


// ============================================================================
// 14. KinematicRageSystem Test Suite (Table Flip Physics)
// ============================================================================
import { KinematicRageSystem } from '../world/systems/KinematicRageSystem.js';
import { CarverSystem, ZoneType } from '../world/systems/CarverSystem.js';
import { TurretCombatSystem } from '../world/systems/TurretCombatSystem.js';

function testKinematicRageEngine() {
    let passed = 0;
    const total = 5;
    console.log('\n--- Running KinematicRageSystem Tests ---');

    const rage = new KinematicRageSystem({ gravity: -60 });

    // 14a. Impulse injection
    const entities = [
        { id: 'piece1', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        { id: 'board', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, isBoard: true }
    ];
    const dynamic = rage.applyImpulse(entities, { horizontalForce: 15, verticalForce: 30, floorY: -5 });
    const hasRage = dynamic.every(e => e.rageState && e.rageState.velocity && e.rageState.rotVelocity);
    if (hasRage) {
        passed++;
        console.log('- 14a Impulse injection: PASSED ✅');
    } else {
        console.error('FAILED: 14a Impulse injection');
    }

    // 14b. Board gets smaller impulse than piece
    const boardV = dynamic.find(e => e.id === 'board').rageState.velocity.y;
    const pieceV = dynamic.find(e => e.id === 'piece1').rageState.velocity.y;
    if (boardV <= pieceV) {
        passed++;
        console.log(`- 14b Board smaller impulse: PASSED ✅ (board=${boardV.toFixed(1)}, piece=${pieceV.toFixed(1)})`);
    } else {
        console.error('FAILED: 14b Board smaller impulse');
    }

    // 14c. Gravity + Euler integration
    const testBody = [{
        id: 'falling', position: { x: 0, y: 10, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        rageState: { velocity: { x: 5, y: 0, z: 0 }, rotVelocity: { x: 0.1, y: 0, z: 0 }, bounce: 0.5, floorY: 0 }
    }];
    const after = rage.tick(testBody, 1.0);
    // After 1s: y should be negative (gravity pulled it down), x should be 5
    const gravityApplied = after[0].position.y < 10 && after[0].position.x === 5;
    if (gravityApplied) {
        passed++;
        console.log(`- 14c Gravity integration: PASSED ✅ (y=${after[0].position.y.toFixed(1)}, x=${after[0].position.x})`);
    } else {
        console.error('FAILED: 14c Gravity integration');
    }

    // 14d. Floor bounce
    const bouncyBody = [{
        id: 'bouncy', position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        rageState: { velocity: { x: 10, y: -20, z: 5 }, rotVelocity: { x: 1, y: 1, z: 1 }, bounce: 0.5, floorY: 0 }
    }];
    const bounced = rage.tick(bouncyBody, 0.5);
    // After tick: object should have been pushed below floor then bounced, vy flipped
    const didBounce = bounced[0].rageState.velocity.y >= 0 || bounced[0].position.y >= 0;
    if (didBounce) {
        passed++;
        console.log('- 14d Floor bounce: PASSED ✅');
    } else {
        console.error('FAILED: 14d Floor bounce');
    }

    // 14e. Non-rage entity passes through unchanged
    const staticBody = [{ id: 'static', position: { x: 5, y: 5, z: 5 }, rotation: { x: 0, y: 0, z: 0 } }];
    const unchanged = rage.tick(staticBody, 1.0);
    if (unchanged[0].position.x === 5 && unchanged[0].position.y === 5) {
        passed++;
        console.log('- 14e Static passthrough: PASSED ✅');
    } else {
        console.error('FAILED: 14e Static passthrough');
    }

    console.log(`KinematicRageSystem: ${passed}/${total} sub-tests passed`);
}

testKinematicRageEngine();

console.log('\n--- 15. CARVER ENGINE ---');
function testCarverEngine() {
    let passed = 0;
    const total = 4;
    
    const carver = new CarverSystem(20, 20); // Small 20x20 test engine
    carver.generate(12345); // Deterministic seed

    // 15a. Grid Dimensions
    if (carver.grid.length === 20 && carver.grid[0].length === 20) {
        passed++;
        console.log('- 15a Grid Instantiated: PASSED ✅');
    } else {
        console.error('FAILED: 15a Grid Instantiated');
    }

    // 15b. Topology pass generates stepped heights (0 to 3)
    let hasHigh = false;
    for(let y=0; y<20; y++) {
        for(let x=0; x<20; x++) {
            if (carver.elevationGrid[y][x] > 0) hasHigh = true;
        }
    }
    if (hasHigh) {
        passed++;
        console.log('- 15b Topography Generated: PASSED ✅');
    } else {
        console.error('FAILED: 15b Topography Generated (all flat)');
    }

    // 15c. Zoning generated valid ZoneTypes
    let validZones = true;
    for(let y=0; y<20; y++) {
        for(let x=0; x<20; x++) {
            const z = carver.zoneGrid[y][x];
            if (![ZoneType.DOWNTOWN, ZoneType.INDUSTRIAL, ZoneType.NIGHTLIFE, ZoneType.SLUMS].includes(z)) {
                validZones = false;
            }
        }
    }
    if (validZones) {
        passed++;
        console.log('- 15c Voronoi Zones Valid: PASSED ✅');
    } else {
        console.error('FAILED: 15c Voronoi Zones Valid');
    }

    // 15d. Buildings array populated
    if (carver.buildings.length > 0 && carver.buildings[0].type.name) {
        passed++;
        console.log(`- 15d Buildings Populated: PASSED ✅ (${carver.buildings.length} assigned)`);
    } else {
        console.error('FAILED: 15d Buildings Populated');
    }

    console.log(`CarverSystem: ${passed}/${total} sub-tests passed`);
}
testCarverEngine();

console.log('\n--- 16. TURRET COMBAT ENGINE ---');
function testTurretCombatEngine() {
    let passed = 0;
    const total = 4;

    const combat = new TurretCombatSystem({
        fireInterval: 1.0, stunDuration: 2.0, chopperCooldown: 0.5, bulletSpeed: 10.0
    });

    combat.addTurret('t1', 10, 0, 0);

    // 16a. Turret shoots bullet
    let t = combat.turrets[0];
    t.fireTimer = 0.1; 
    let events = combat.tick(0.2, {x:0, y:0, z:0}, {x:1,y:0,z:0}, false);
    if (events.find(e => e.type === 'TURRET_FIRE') && combat.turretBullets.length === 1) {
        passed++; console.log('- 16a Turret AI Shoots: PASSED ✅');
    } else {
        console.error('FAILED: 16a Turret AI Shoots');
    }

    // 16b. Turret bullet hits chopper
    combat.turretBullets[0].pos = {x: 2, y: 0, z: 0};
    combat.turretBullets[0].vel = {x: -10, y: 0, z: 0};
    events = combat.tick(0.5, {x:0, y:0, z:0}, {x:1,y:0,z:0}, false);
    if (events.find(e => e.type === 'HIT_CHOPPER')) {
        passed++; console.log('- 16b Bullet Hits Chopper: PASSED ✅');
    } else {
        console.error('FAILED: 16b Bullet Hits Chopper');
    }

    // 16c. Chopper shoots
    events = combat.tick(0.1, {x:0, y:0, z:0}, {x:1,y:0,z:0}, true);
    if (events.find(e => e.type === 'CHOPPER_FIRE') && combat.chopperBullets.length === 1) {
        passed++; console.log('- 16c Chopper Manual Fire: PASSED ✅');
    } else {
        console.error('FAILED: 16c Chopper Manual Fire');
    }

    // 16d. Chopper bullet stuns turret
    combat.chopperBullets[0].pos = {x: 9, y: 0, z: 0};
    events = combat.tick(0.05, {x:0, y:0, z:0}, {x:1,y:0,z:0}, false);
    if (events.find(e => e.type === 'HIT_TURRET') && combat.turrets[0].stunTimer > 0) {
        passed++; console.log('- 16d Chopper Stuns Turret: PASSED ✅');
    } else {
        console.error('FAILED: 16d Chopper Stuns Turret');
    }

    console.log(`TurretCombatSystem: ${passed}/${total} sub-tests passed`);
}
testTurretCombatEngine();

console.log('\n--- 17. INPUT CONTROLLER ENGINE ---');
import { InputControllerPlugin } from '../soma/plugins/InputControllerPlugin.js';

function testInputControllerEngine() {
    let passed = 0;
    const total = 5;

    const input = new InputControllerPlugin();
    input.bindKey('Space', 'jump');
    input.bindAxis('KeyA', 'KeyD', 'horizontal');

    // 17a. Default State
    input.tick();
    if (!input.isDown('jump') && input.getAxis('horizontal') === 0.0) {
        passed++; console.log('- 17a Default State Empty: PASSED ✅');
    } else {
        console.error('FAILED: 17a Default State Empty');
    }

    // 17b. Hardware Input Simulate
    input._hardwareKeys['Space'] = true;
    input._hardwareKeys['KeyD'] = true;
    input.tick();
    if (input.isDown('jump') && input.justPressed('jump') && input.getAxis('horizontal') === 1.0) {
        passed++; console.log('- 17b Hardware Input Processing: PASSED ✅');
    } else {
        console.error('FAILED: 17b Hardware Input Processing');
    }

    // 17c. JustPressed resets next frame
    input.tick();
    if (input.isDown('jump') && !input.justPressed('jump')) {
        passed++; console.log('- 17c justPressed one-frame limit: PASSED ✅');
    } else {
        console.error('FAILED: 17c justPressed one-frame limit');
    }

    // 17d. ML Override Injection
    input.tick({ actions: { jump: false }, axes: { horizontal: -0.5 } });
    if (!input.isDown('jump') && input.getAxis('horizontal') === -0.5) {
        passed++; console.log('- 17d ML Gym Override Injection: PASSED ✅');
    } else {
        console.error('FAILED: 17d ML Gym Override Injection');
    }

    // 17e. Hardware releases
    input._hardwareKeys['Space'] = false;
    input._hardwareKeys['KeyD'] = false;
    input.tick(); // No override
    if (!input.isDown('jump') && input.getAxis('horizontal') === 0.0) {
        passed++; console.log('- 17e Hardware Key Release: PASSED ✅');
    } else {
        console.error('FAILED: 17e Hardware Key Release');
    }

    console.log(`InputControllerPlugin: ${passed}/${total} sub-tests passed`);
}
testInputControllerEngine();

import { BulletHeavenEngine } from '../world/systems/BulletHeavenEngine.js';

function testShmupSurvivalEngine() {
    console.log('\n--- 18. BulletHeavenEngine ---');
    let passed = 0; let total = 4;
    
    // 18a. Initialization & Reset
    const engine = new BulletHeavenEngine();
    engine.reset();
    if (engine.stats.score === 0 && engine.director.state === 'BUILDUP') {
        passed++; console.log('- 18a Initialization & Reset: PASSED ✅');
    } else {
        console.error('FAILED: 18a Initialization & Reset');
    }
    
    // 18b. Score Hunger State Machine
    engine.stats.score += 500;
    engine.tick(0.1); 
    // Advance timers deeply to trigger starvation
    for(let i=0; i<300; i++) engine.tick(0.1);
    if (engine.scoreHunger.state === 'STARVING' || engine.scoreHunger.state === 'HUNGRY') {
        passed++; console.log(`- 18b Score Hunger Dynamics [${engine.scoreHunger.state}]: PASSED ✅`);
    } else {
        console.error(`FAILED: 18b Score Hunger Dynamics [${engine.scoreHunger.state}]`);
    }
    
    // 18c. Gym Step API and Collision
    const gz = engine.globalZ;
    engine.ship = { x: 0, y: 0, z: gz - 10, dead: false, invuln: 0 };
    engine.asteroids.push({ id: 'a1', x: 0, y: 0, z: gz, radius: 2.0, hp: 10, type: 'rock' });
    engine.projectiles.push({ id: 'p1', isPlayer: true, x: 0, y: 0, z: gz, radius: 1.0, type: 'rocket', hitSet: new Set() });
    
    // Engine processCollisions is called inside tick() inside step()
    let collectedEvents = [];
    engine.on('break_asteroid', (a) => collectedEvents.push(`break_${a.id}`));
    
    const obsObj = engine.step(8, 0.1); // wait
    
    if (collectedEvents.includes('break_a1')) {
        passed++; console.log('- 18c AABB Collisions vs Projectile: PASSED ✅');
    } else {
        console.error('FAILED: 18c AABB Collisions vs Projectile');
    }
    
    // 18d. ML Observation Dictionary
    if (obsObj.obs && obsObj.obs.meta.score >= 500) {
        passed++; console.log('- 18d Gym Observation Output: PASSED ✅');
    } else {
        console.error('FAILED: 18d Gym Observation Output');
    }

    console.log(`BulletHeavenEngine: ${passed}/${total} sub-tests passed`);
}
testShmupSurvivalEngine();

// ============================================================================
// 19. ScummInteractionEngine Test Suite
// ============================================================================
import { ScummInteractionEngine } from '../world/systems/ScummInteractionEngine.js';

function testScummInteractionEngine() {
    console.log('\n--- 19. ScummInteractionEngine ---');
    let passed = 0; let total = 2;
    const scumm = new ScummInteractionEngine();
    scumm.initEpisode(42, 3, 1, 0, 0, 'blind');
    
    // 19a. BSP Partition Generation
    if(scumm.state.partition && scumm.state.partition.leaves.length > 0) {
        passed++; console.log('- 19a BSP Partitioning Valid: PASSED ✅');
    } else {
        console.error('FAILED: 19a BSP Partitioning Valid');
    }
    
    // 19b. Select Drawer resolves interaction
    // Find an unlocked drawer
    let target = null;
    for(let id in scumm.state.lockedDrawers) {
        // Here id is a string index, lockedDrawers holds strings 'padlock' or 'plank'
        // Actually, we want an unlocked index.
    }
    // Just find any valid leaf ID that is not locked.
    for(let i=0; i<scumm.state.partition.leaves.length; i++) {
        if(!scumm.state.lockedDrawers[i]) { target = i; break; }
    }
    
    // If no drawer found, try unlocking
    if(target === null) target = 0;
    let reward = scumm.selectDrawer(target);
    if(reward !== undefined) {
        passed++; console.log(`- 19b selectDrawer returns reward (${reward}): PASSED ✅`);
    } else {
        console.error('FAILED: 19b selectDrawer resolution');
    }
    console.log(`ScummInteractionEngine: ${passed}/${total} sub-tests passed`);
}
testScummInteractionEngine();

// ============================================================================
// 20. BulletHeavenEngine Test Suite
// ============================================================================
// (el import vive arriba: los tres motores de shmup se unificaron en uno)

function testShmupDirectorEngine() {
    console.log('\n--- 20. BulletHeavenEngine ---');
    let passed = 0; let total = 2;
    const director = new BulletHeavenEngine();
    
    // 20a. Intensity builds up over time
    director.updateDirector(10.0, {x:0, y:0}); // Advance 10s
    if(director.director.intensity > 0) {
        passed++; console.log(`- 20a Intensity Buildup (${director.director.intensity.toFixed(2)}): PASSED ✅`);
    } else {
        console.error('FAILED: 20a Intensity Buildup');
    }
    
    // 20b. ScoreHunger Starvation mechanics
    director.stats.score = 500;
    director.updateHunger(1.0, 15.0); // logs score at t=15.0
    director.updateHunger(1.0, 35.0); // 20s later, score hasn't changed -> starvation
    if(director.scoreHunger.state === 'PECKISH' || director.scoreHunger.state === 'HUNGRY') {
        passed++; console.log(`- 20b Hunger Dynamics triggers starvation [${director.scoreHunger.state}]: PASSED ✅`);
    } else {
        console.error(`FAILED: 20b Hunger Dynamics triggers starvation [got ${director.scoreHunger.state}]`);
    }
    console.log(`BulletHeavenEngine: ${passed}/${total} sub-tests passed`);
}
testShmupDirectorEngine();

// ============================================================================
// 21. BulletHeavenEngine Test Suite
// ============================================================================
// (mismo módulo que arriba: Survival, Director y AI eran tres caras de uno)

function testShmupAI_Engine() {
    console.log('\n--- 21. BulletHeavenEngine ---');
    let passed = 0; let total = 2;
    const shmupAI = new BulletHeavenEngine();
    
    // Fake ship and director state
    const ship = { userData: { dead: false, manualControl: false, weaponMain: 'LASER' }, position: {x:0, y:0, z:0} };
    const directorState = {
        entities: {
            asteroids: [{ userData: { type: 'GOLD' }, position: {x: 0, y: 0, z: 20} }], // Gold prey dead ahead
            enemies: [], bosses: [], projectiles: [], items: []
        },
        scoreHunger: { desperation: 0.8 },
        state: { energy: 100 }
    };
    
    // 21a. Predator Sight (Hunt Gold Asteroid)
    const result = shmupAI.evaluateKinematics(ship, directorState, 0.1, 0);
    // Gold ast is at z=20, < 30 units, meaning Sight Phase triggers `wantFire` and `fz` advance
    if(result.wantFire && result.fz > 0) {
        passed++; console.log(`- 21a Predator Sight engages Gold Asteroid: PASSED ✅ (fz=${result.fz.toFixed(2)})`);
    } else {
         console.error(`FAILED: 21a Predator Sight engages Gold Asteroid (fz=${result.fz.toFixed(2)}, wantFire=${result.wantFire})`);
    }

    // 21b. Obstacle Evasion
    directorState.entities.asteroids = [{ userData: { type: 'ROCK' }, position: {x: 0, y: 0, z: 5} }];
    const result2 = shmupAI.evaluateKinematics(ship, directorState, 0.1, 0);
    if(result2.fz < 0) { // Should push backwards to avoid obstacle
        passed++; console.log(`- 21b Obstacle Evasion backwards impulse: PASSED ✅ (fz=${result2.fz.toFixed(2)})`);
    } else {
         console.error(`FAILED: 21b Obstacle Evasion (fz=${result2.fz.toFixed(2)})`);
    }

    console.log(`BulletHeavenEngine: ${passed}/${total} sub-tests passed`);
}
testShmupAI_Engine();

// ============================================================================
// 22. CarverEntitySystem Test Suite
// ============================================================================
import { CarverEntitySystem } from '../world/systems/CarverEntitySystem.js';

function testCarverEntityEngine() {
    console.log('\n--- 22. CarverEntitySystem ---');
    let passed = 0; let total = 2;
    const engine = new CarverEntitySystem({ w: 10, h: 10 });
    
    // Mock a grid with a single straight road
    // 1 = solid, 0 = road
    const grid = new Array(10).fill(0).map(() => new Array(10).fill(1));
    for (let x = 0; x < 10; x++) grid[5][x] = 0; // Road at row 5
    
    // 22a. Populate logic places entities correctly
    engine.populate(5, grid, 42);
    if(engine.entities.length === 5 && engine.entities[0].y === 5) {
        passed++; console.log(`- 22a Deterministic population constrains to valid paths: PASSED ✅`);
    } else {
         console.error(`FAILED: 22a Population routing constraint (len=${engine.entities.length})`);
    }

    // 22b. Tick movement calculation
    const e = engine.entities[0];
    const initialProgress = e.progress;
    engine.tick(grid, 0.1); // first tick picks the target
    engine.tick(grid, 0.1); // second tick accumulates progress towards target
    if(e.progress > initialProgress) {
        passed++; console.log(`- 22b Entity progress interpolation calculates dt: PASSED ✅ (prog=${e.progress.toFixed(3)})`);
    } else {
         console.error(`FAILED: 22b Entity progress routing (prog=${e.progress.toFixed(3)})`);
    }

    console.log(`CarverEntitySystem: ${passed}/${total} sub-tests passed`);
}
testCarverEntityEngine();

console.log('\n--- ALL ENGINE TESTS COMPLETED ---');
