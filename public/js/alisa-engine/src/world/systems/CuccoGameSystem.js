import { BulletHeavenEngine } from './BulletHeavenEngine.js';

// === JANITOR WEAPONS (Cleaning Tools) ===
const WEAPONS_DB = [
  { id: 'broom',   name: '🧹 Broom',     dmg: 8,  cd: 0.8, range: 5,  speed: 14, aoe: 0 },
  { id: 'mop',     name: '🧽 Mop',       dmg: 6,  cd: 1.2, range: 4,  speed: 0,  aoe: 3.5 },
  { id: 'vacuum',  name: '🔌 Vacuum',    dmg: 12, cd: 1.8, range: 10, speed: 16, aoe: 0 },
  { id: 'binlid',  name: '🗑️ Bin Lid',   dmg: 5,  cd: 0.5, range: 3,  speed: 0,  aoe: 2.5 },
];

// Special attacks: sweep (hold), slam (shift), dash (space)
const SPECIAL_ATTACKS = {
  sweep:  { cd: 2.0, dmg: 15, aoe: 4.0, knockback: 6 },
  slam:   { cd: 3.5, dmg: 25, aoe: 5.5, knockback: 10 },
  dash:   { cd: 2.5, dmg: 10, dist: 8,  width: 2 },
};

const PASSIVES_DB = [
  { id: 'magnet',  name: '🧲 Crumb Magnet',   effect: 'pickup_range', value: 2.0 },
  { id: 'gloves',  name: '🧤 Rubber Gloves',  effect: 'damage_reduce', value: 0.2 },
  { id: 'slippers',name: '🥾 Speed Slippers', effect: 'speed_mult',   value: 1.3 },
  { id: 'coffee',  name: '☕ Coffee Break',    effect: 'hp_regen',     value: 0.5 },
  { id: 'keys',    name: '🔑 Lucky Keychain', effect: 'crit_chance',  value: 0.15 },
];

const WAVE_TABLE = [
  { wave: 1,  rate: 2,  types: ['roach'],                          boss: false },
  { wave: 2,  rate: 4,  types: ['roach'],                          boss: false },
  { wave: 3,  rate: 6,  types: ['roach', 'mouse'],                 boss: false },
  { wave: 4,  rate: 8,  types: ['roach', 'mouse'],                 boss: false },
  { wave: 5,  rate: 10, types: ['mouse', 'pigeon'],                boss: false },
  { wave: 6,  rate: 14, types: ['mouse', 'pigeon', 'swarm'],       boss: false },
  { wave: 7,  rate: 18, types: ['pigeon', 'rat', 'swarm'],         boss: false },
  { wave: 8,  rate: 22, types: ['rat', 'swarm'],                   boss: true  },
  { wave: 9,  rate: 28, types: ['rat', 'cucco'],                   boss: false },
  { wave: 10, rate: 35, types: ['rat', 'cucco', 'pigeon'],         boss: false },
  { wave: 11, rate: 45, types: ['cucco', 'swarm'],                 boss: false },
  { wave: 12, rate: 60, types: ['cucco'],                          boss: true  },
];

// Pests! They don't die — they get SCARED and run away 😱
const ENEMY_TYPES = {
  roach:  { hp: 5,   speed: 2.5, dmg: 2,   xp: 1,  size: 0.8, emoji: '🪳' },
  mouse:  { hp: 8,   speed: 5.0, dmg: 4,   xp: 2,  size: 1.0, emoji: '🐭' },
  pigeon: { hp: 15,  speed: 3.5, dmg: 8,   xp: 5,  size: 1.4, emoji: '🐦' },
  rat:    { hp: 35,  speed: 2.0, dmg: 12,  xp: 8,  size: 1.8, emoji: '🐀' },
  cucco:  { hp: 60,  speed: 4.5, dmg: 15,  xp: 15, size: 2.2, emoji: '🐔' },
  swarm:  { hp: 2,   speed: 4.0, dmg: 1,   xp: 1,  size: 0.5, emoji: '🐜' },
  boss:   { hp: 400, speed: 1.5, dmg: 25,  xp: 100, size: 3.5, emoji: '👑' },
};

const XP_PER_LEVEL = [0,10,25,50,80,120,170,230,300,400,520,660,820,1000];

export class CuccoGameSystem extends BulletHeavenEngine {

  constructor() {
    super({
      weapons: WEAPONS_DB,
      enemies: ENEMY_TYPES,
      waves: WAVE_TABLE,
      passives: PASSIVES_DB,
      xpPerLevel: XP_PER_LEVEL,
      arenaRadius: 40,
      maxEnemies: 200,
      maxProjectiles: 100,
      maxPickups: 80,
      waveDuration: 30,
      pickupRangeBase: 1.5
    });
  }
  
  getState() {
    const s = super.getState();
    s.puddles = (this.puddles || []).map(p => ({ id: p.id, x: p.x, z: p.z, r: p.r, life: p.life }));
    s.enemies.forEach(se => {
       const engE = (this.enemies || []).find(en => en.id === se.id);
       if (engE && engE.guard !== undefined) se.guard = engE.guard;
    });
    return s;
  }

  reset() {
    super.reset();
    this.obstacles = [];
    this.puddles = []; // Charcos de baba
    // 15 destructible crates for the player to build bunkers
    for(let i=0; i<15; i++) {
       const ang = Math.random() * Math.PI * 2;
       const rad = Math.random() * 25 + 5;
       this.obstacles.push({ 
         id: 'crate_' + i,
         x: Math.cos(ang) * rad, 
         z: Math.sin(ang) * rad, 
         r: 1.5,
         hp: 300,      // Zergs will take a bit to break this
         maxHp: 300
       });
    }
    return this.getState();
  }

  _updateShield(dt) {
    const p = this.player;
    if (!p.hasShield) return;
    p.shieldAngle += dt * 4;
    const sx = p.x + Math.cos(p.shieldAngle) * 2.5;
    const sz = p.z + Math.sin(p.shieldAngle) * 2.5;
    // Shield damages nearby enemies
    for (const e of this.enemies) {
      if (e.scared) continue;
      const dx = sx - e.x, dz = sz - e.z;
      if (dx * dx + dz * dz < 1.5) this._killEnemy(e);
    }
  }

  update(dt) {
    const res = super.update(dt);
    this._updatePuddles(dt);
    this._updateBossLogic(dt);
    return res;
  }

  _updateBossLogic(dt) {
    for (const e of this.enemies) {
      if (e.type !== 'boss' && e.type !== 'cucco') continue;
      
      // If shield is UP, move slowly
      if (e.guard) {
         e.speed = ENEMY_TYPES[e.type].speed * 0.4; // Very slow while guarded
      } else {
         // Shield is broken! Rage mode!
         e.speed = ENEMY_TYPES[e.type].speed * 1.5; // Fast!
         
         if (e.attackCd === undefined) e.attackCd = 2.0;
         e.attackCd -= dt;
         
         if (e.attackCd <= 0) {
            // Dash attack or Minion summon
            if (Math.random() > 0.5) {
                // Dash
                e.attackCd = 3.0; // Dash cooldown
                const targetAngle = Math.atan2(this.player.x - e.x, this.player.z - e.z);
                e.velocity.x += Math.sin(targetAngle) * 35; // Massive push
                e.velocity.z += Math.cos(targetAngle) * 35;
            } else {
                // Summon minions
                e.attackCd = 5.0; // Summon cooldown
                for (let i = 0; i < 4; i++) {
                   const offsetAngle = Math.random() * Math.PI * 2;
                   const dist = e.size + 1.0;
                   this.enemies.push({
                      id: 'spawn_' + Math.random().toString(36).substr(2, 9),
                      type: 'swarm',
                      hp: ENEMY_TYPES['swarm'].hp,
                      maxHp: ENEMY_TYPES['swarm'].hp,
                      x: e.x + Math.sin(offsetAngle) * dist,
                      z: e.z + Math.cos(offsetAngle) * dist,
                      size: ENEMY_TYPES['swarm'].size,
                      speed: ENEMY_TYPES['swarm'].speed,
                      velocity: {x: 0, z: 0}
                   });
                }
            }
         }
      }
    }
  }

  _updatePuddles(dt) {
    const p = this.player;
    let inPuddle = false;
    
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      pd.life -= dt;
      if (pd.life <= 0) {
        this.puddles.splice(i, 1);
        continue;
      }
      
      const dx = p.x - pd.x, dz = p.z - pd.z;
      if (dx*dx + dz*dz < pd.r * pd.r) {
        inPuddle = true;
      }
      
      // Enemies get stuck in their own slime too
      for(const e of this.enemies) {
        if (e.scared) continue;
        const edx = e.x - pd.x, edz = e.z - pd.z;
        if (edx*edx + edz*edz < pd.r * pd.r) {
           e.velocity.x *= 0.6;
           e.velocity.z *= 0.6;
        }
      }
    }
    
    if (inPuddle) {
       // Slow player down by 50%
       p.x -= this.inputDir.x * (p.speed * p.speedMult) * dt * 0.5;
       p.z -= this.inputDir.z * (p.speed * p.speedMult) * dt * 0.5;
    }
  }

  _killEnemy(e) {
    super._killEnemy(e);
    // 25% chance to drop a slime puddle on death
    if (Math.random() < 0.25) {
      this.puddles.push({
        id: 'puddle_' + Math.random().toString(36).substr(2, 9),
        x: e.x,
        z: e.z,
        r: e.size * 1.5,
        life: 12.0
      });
    }
  }

  _damageEnemy(e, dmg) {
    // Initialize guard for bosses if not present
    if (e.type === 'boss' || e.type === 'cucco') {
      if (e.guard === undefined) e.guard = true;
    }
    
    // If guard is up, damage is reduced to 1!
    if (e.guard) {
      super._damageEnemy(e, 1);
      return;
    }
    
    super._damageEnemy(e, dmg);
  }

  _fireWeapon(w) {
    super._fireWeapon(w);
    // Mop cleans the puddles in its AOE!
    if (w.id === 'mop') {
      const p = this.player;
      for (let i = this.puddles.length - 1; i >= 0; i--) {
        const pd = this.puddles[i];
        const dx = pd.x - p.x, dz = pd.z - p.z;
        if (dx*dx + dz*dz < w.aoe * w.aoe) {
          this.puddles.splice(i, 1);
        }
      }
    }
  }

  // Special attacks
  _updateSpecials(dt) {
    const p = this.player;
    p.sweepCd = Math.max(0, p.sweepCd - dt);
    p.slamCd = Math.max(0, p.slamCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);

    // Sweep (barrido 360°)
    if (this.specialInput.sweep && p.sweepCd <= 0) {
      p.sweepCd = SPECIAL_ATTACKS.sweep.cd;
      for (const e of this.enemies) {
        if (e.scared) continue;
        const dx = e.x - p.x, dz = e.z - p.z;
        if (dx*dx + dz*dz < SPECIAL_ATTACKS.sweep.aoe ** 2) {
          this._damageEnemy(e, SPECIAL_ATTACKS.sweep.dmg);
          this._knockback(e, SPECIAL_ATTACKS.sweep.knockback);
        }
      }
    }
    // Slam (golpe al suelo)
    if (this.specialInput.slam && p.slamCd <= 0) {
      p.slamCd = SPECIAL_ATTACKS.slam.cd;
    }
    
    // Deal damage when slam lands (0.4s later)
    if (p.slamCd > 0 && p.slamCd <= SPECIAL_ATTACKS.slam.cd - 0.4 && (p.slamCd + dt) > SPECIAL_ATTACKS.slam.cd - 0.4) {
      for (const e of this.enemies) {
        if (e.scared) continue;
        const dx = e.x - p.x, dz = e.z - p.z;
        if (dx*dx + dz*dz < SPECIAL_ATTACKS.slam.aoe ** 2) {
          if (e.guard) e.guard = false; // GUARD BROKEN!
          this._damageEnemy(e, SPECIAL_ATTACKS.slam.dmg);
          this._knockback(e, SPECIAL_ATTACKS.slam.knockback);
        }
      }
    }
    // Dash
    if (this.specialInput.dash && p.dashCd <= 0 && (this.inputDir.x || this.inputDir.z)) {
      p.dashCd = SPECIAL_ATTACKS.dash.cd;
      p.dashing = 0.25;
      p.dashDx = this.inputDir.x;
      p.dashDz = this.inputDir.z;
    }
    if (p.dashing > 0) {
      p.dashing -= dt;
      const dashSpd = SPECIAL_ATTACKS.dash.dist / 0.25;
      p.x += p.dashDx * dashSpd * dt;
      p.z += p.dashDz * dashSpd * dt;
      // Sweep enemies in dash path
      for (const e of this.enemies) {
        if (e.scared) continue;
        const dx = e.x - p.x, dz = e.z - p.z;
        if (dx*dx + dz*dz < SPECIAL_ATTACKS.dash.width ** 2) {
          this._damageEnemy(e, SPECIAL_ATTACKS.dash.dmg);
          this._knockback(e, 4);
        }
      }
    }
    this.specialInput = { sweep: false, slam: false, dash: false };
  }
}
