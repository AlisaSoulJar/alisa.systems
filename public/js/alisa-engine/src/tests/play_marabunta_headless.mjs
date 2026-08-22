/**
 * Headless Marabunta player — runs 600 ticks (~20 seconds of game)
 * Demonstrates the gym API: reset → act → observe reward → repeat
 */
import { MarabuntaSystem } from '../world/systems/MarabuntaSystem.js';

const game = new MarabuntaSystem();
let state = game.reset();

// Simple "always flee from densest sector" strategy
function chooseAction(obs) {
  // obs[6..17] = sector densities (12 sectors)
  // Find the densest sector, move OPPOSITE
  let maxDens = -1, maxSector = 0;
  for (let s = 0; s < 12; s++) {
    if (obs[6 + s] > maxDens) { maxDens = obs[6 + s]; maxSector = s; }
  }
  // Opposite sector → action mapping (1-8 = N,NE,E,SE,S,SW,W,NW)
  const oppositeAction = ((maxSector + 6) % 12);
  // Map 12 sectors to 8 directions
  const sectorToAction = [1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8];
  return maxDens > 0 ? sectorToAction[oppositeAction] : 0;
}

let totalReward = 0;
let ticks = 0;
const maxTicks = 600; // ~20 seconds at 30fps

while (ticks < maxTicks) {
  const obs = game.getObservation();
  const action = chooseAction(obs);
  
  // Choose upgrade automatically if pending
  if (game.pendingUpgrade) {
    game.act(9); // always pick first option
  }
  
  const result = game.act(action);
  totalReward += result.reward;
  ticks++;
  
  if (result.done) break;
}

const final = game.getState();
console.log(JSON.stringify({
  ticks,
  survived_s: final.time.toFixed(1),
  kills: final.kills,
  score: final.score,
  wave: final.wave,
  level: final.player.level,
  hp: Math.ceil(final.player.hp),
  enemies_alive: final.enemyCount,
  total_reward: totalReward.toFixed(1),
  game_over: final.gameOver,
  victory: final.victory,
  weapons: final.player.weapons,
  observation_sample: Array.from(game.getObservation().slice(0, 6)).map(v => v.toFixed(3))
}, null, 2));
