import { SteeringSystem } from '../../psyche/SteeringSystem.js';
import { FSMSystem } from '../../psyche/FSMSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';

/**
 * BulletHeavenEngine.js
 * =====================
 * Universal Bullet Heaven (Vampire Survivors-like) engine.
 * Pure math. No THREE.js. Headless-compatible.
 */
export class BulletHeavenEngine {
  /**
   * @param {Object} config
   * @param {Array} config.weapons
   * @param {Object} config.enemies
   * @param {Array} config.waves
   * @param {Array} config.passives
   * @param {Array} config.xpPerLevel
   * @param {number} config.arenaRadius
   */
  constructor(config = {}) {
    this.weaponsDB = config.weapons || [];
    this.enemiesDB = config.enemies || {};
    this.waveTable = config.waves || [];
    this.passivesDB = config.passives || [];
    this.xpPerLevel = config.xpPerLevel || [0,10,25,50,80,120,170,230,300,400,520,660,820,1000];
    this.arenaRadius = config.arenaRadius || 40;
    
    this.MAX_ENEMIES = config.maxEnemies || 200;
    this.MAX_PROJECTILES = config.maxProjectiles || 100;
    this.MAX_PICKUPS = config.maxPickups || 80;
    this.WAVE_DURATION = config.waveDuration || 30;
    this.PICKUP_RANGE_BASE = config.pickupRangeBase || 1.5;

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ LA SEMILLA. ERA LO ÚNICO QUE LE FALTABA A ESTE MOTOR PARA PUNTUAR.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Este motor es un juego entero y honrado: arena, oleadas, armas con
     * enfriamiento, XP, subidas de nivel, y fin por los dos lados —derrota con
     * `hp <= 0` y victoria a los 1200 s—. Corre sin THREE y sin DOM. Le faltaba
     * una sola cosa para entrar en el banco: que dos partidas con la misma
     * semilla fueran la misma partida.
     *
     * Tenía cinco `Math.random()` sueltos, y el que más duele es el de la baraja
     * de mejoras: **la decisión más cara de la partida —qué tres opciones te
     * ofrece al subir de nivel— era irreproducible**. Con eso, dos agentes con
     * la misma política sacan notas distintas y la comparación no significa nada.
     *
     * ⚠️ Y POR DEFECTO SIGUE SIENDO `Math.random`, A PROPÓSITO.
     *
     * `MarabuntaSystem` extiende esta clase y ya está en el banco; consigue su
     * determinismo con `DeterministicScope`, que parchea el `Math.random` GLOBAL.
     * Si aquí se pusiera un generador propio por defecto, Marabunta dejaría de
     * pasar por ese parche y **cambiarían sus puntuaciones publicadas** sin que
     * nadie lo hubiera pedido. Comprobado antes y después de este cambio: mismas
     * semillas, mismas notas (1234 → 3,0000 · 7 → 2,5000).
     *
     * Quien quiera reproducibilidad sin parchear el mundo entero pasa su `rng`, y
     * entonces puede correr dos episodios a la vez en el mismo hilo — que es
     * justo lo que el scope global prohíbe.
     *
     * ⚠️ Y EL RESPALDO ES UNA LLAMADA, NO UNA REFERENCIA. ESTO ROMPIÓ MARABUNTA.
     *
     * La primera versión decía `config.rng || Math.random`, que **captura la
     * función global en el momento de construir**. `DeterministicScope` parchea
     * `Math.random` DESPUÉS, al hacer `reset(semilla)`, así que el motor se
     * quedaba con la función de antes del parche y jugaba sin semilla.
     *
     * Medido: las notas de Marabunta pasaron de 3,0000 y 2,5000 a 6,0000 y
     * 5,0000 con las mismas semillas. Un entorno publicado, en el banco, con las
     * puntuaciones cambiadas por un `||` — y sin un solo error.
     *
     * Una llamada envuelta —`() => …`— lee el global EN CADA llamada, así que el
     * parche sí llega. Es la diferencia entre guardarse el teléfono de alguien y
     * llamar a información cada vez: sólo la segunda se entera de que se ha
     * mudado.
     *
     * ⚠️ Y AUN ASÍ, AQUÍ YA NO HAY RESPALDO AL AZAR DEL SISTEMA.
     *
     * La clase madre es PURA: sin semilla juega siempre la misma partida. Quien
     * dependa del parche global lo declara en su propio fichero — ver
     * `MarabuntaSystem`, que es quien lo necesita y quien lo dice.
     */
    this.rng = config.rng || mulberry32((config.seed ?? 42) >>> 0);

    this.reset();
  }

  reset() {
    this.tick = 0;
    this.time = 0;
    this.gameOver = false;
    this.victory = false;

    // Player base setup
    this.player = {
      x: 0, z: 0, hp: 100, maxHp: 100,
      xp: 0, level: 1, speed: 5.0,
      damageReduce: 0, pickupRange: this.PICKUP_RANGE_BASE,
      hpRegen: 0, critChance: 0, speedMult: 1.0,
      weapons: this.weaponsDB.length > 0 ? [{ ...this.weaponsDB[0], timer: 0 }] : [],
      passives: [],
      invuln: 0,
      dashing: 0, dashDx: 0, dashDz: 0,
      sweepCd: 0, slamCd: 0, dashCd: 0,
      shieldAngle: 0, hasShield: false,
    };

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];

    this.wave = 1;
    this.waveTimer = 0;
    this.spawnAccum = 0;
    this.score = 0;
    this.kills = 0;

    this.pendingUpgrade = null;

    this.inputDir = { x: 0, z: 0 };
    this.specialInput = { sweep: false, slam: false, dash: false };

    this._rewardAccum = 0;

    return this.getState();
  }

  // === INPUT ===
  setInput(dx, dz) {
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.01) { this.inputDir.x = dx / len; this.inputDir.z = dz / len; }
    else { this.inputDir.x = 0; this.inputDir.z = 0; }
  }

  setSpecial(sweep, slam, dash) {
    this.specialInput = { sweep, slam, dash };
  }

  act(actionId) {
    const dirs = [
      [0,0], [0,-1], [0.707,-0.707], [1,0], [0.707,0.707],
      [0,1], [-0.707,0.707], [-1,0], [-0.707,-0.707]
    ];
    if (actionId >= 0 && actionId <= 8) this.setInput(dirs[actionId][0], dirs[actionId][1]);
    if (actionId >= 9 && actionId <= 11 && this.pendingUpgrade) this._applyUpgrade(actionId - 9);
    if (actionId === 12) this.specialInput.sweep = true;
    if (actionId === 13) this.specialInput.slam = true;
    if (actionId === 14) this.specialInput.dash = true;
    return this.update(1 / 30);
  }

  // === MAIN LOOP ===
  update(dt) {
    if (this.gameOver || this.victory) return { state: this.getState(), reward: 0, done: true };
    if (this.pendingUpgrade) return { state: this.getState(), reward: 0, done: false };

    this._rewardAccum = 0;
    this.tick++;
    this.time += dt;

    this._updatePlayer(dt);
    this._updateSpecials(dt);
    this._updateEnemyAI(dt);
    this._updateFleeing(dt);
    this._updateShield(dt);
    this._updateWeapons(dt);
    this._updateProjectiles(dt);
    this._checkProjectileHits();
    this._resolveObstacleCollisions(dt);
    this._checkEnemyPlayerCollisions(dt);
    this._checkPickupCollisions();
    this._checkLevelUp();
    this._spawnWave(dt);
    this._regenHP(dt);

    if (this.time >= 1200) this.victory = true;

    const done = this.gameOver || this.victory;
    if (this.victory) this._rewardAccum += 200;

    return { state: this.getState(), reward: this._rewardAccum, done };
  }

  // === PLAYER ===
  _updatePlayer(dt) {
    const p = this.player;
    const spd = p.speed * p.speedMult;
    p.x += this.inputDir.x * spd * dt;
    p.z += this.inputDir.z * spd * dt;
    
    const dist = Math.sqrt(p.x * p.x + p.z * p.z);
    if (dist > this.arenaRadius) {
      p.x = (p.x / dist) * this.arenaRadius;
      p.z = (p.z / dist) * this.arenaRadius;
    }
    if (p.invuln > 0) p.invuln -= dt;
  }

  _regenHP(dt) {
    const p = this.player;
    if (p.hpRegen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * dt);
    }
  }

  // Hooks for subclasses
  _updateSpecials(dt) {}
  _updateShield(dt) {}
  _knockback(e, force) {
    const p = this.player;
    const dx = e.x - p.x, dz = e.z - p.z;
    const dist = Math.sqrt(dx*dx + dz*dz) || 1;
    e.x += (dx/dist) * force;
    e.z += (dz/dist) * force;
  }

  // === ENEMIES ===
  _spawnWave(dt) {
    this.waveTimer += dt;
    if (this.waveTimer >= this.WAVE_DURATION && this.wave < this.waveTable.length) {
      this.wave++;
      this.waveTimer = 0;
    }
    const waveData = this.waveTable[Math.min(this.wave, this.waveTable.length) - 1];
    if (!waveData) return;
    
    this.spawnAccum += waveData.rate * dt;

    while (this.spawnAccum >= 1 && this.enemies.length < this.MAX_ENEMIES) {
      this.spawnAccum -= 1;
      const typeKey = waveData.types[Math.floor(this.rng() * waveData.types.length)];
      this._spawnEnemy(typeKey);
    }

    if (waveData.boss && this.waveTimer < dt * 2) {
      this._spawnEnemy('boss');
    }
  }

  _spawnEnemy(typeKey) {
    const tmpl = this.enemiesDB[typeKey];
    if (!tmpl) return;
    const angle = this.rng() * Math.PI * 2;
    const spawnDist = this.arenaRadius + 5;
    
    const enemy = {
      id: 'e' + this.tick + '_' + this.enemies.length,
      x: Math.cos(angle) * spawnDist,
      z: Math.sin(angle) * spawnDist,
      vx: 0, vz: 0,
      hp: tmpl.hp, maxHp: tmpl.hp,
      speed: tmpl.speed * (0.9 + this.rng() * 0.2),
      dmg: tmpl.dmg, xp: tmpl.xp, size: tmpl.size,
      type: typeKey,
    };
    
    enemy.position = { x: enemy.x, y: 0, z: enemy.z };
    enemy.velocity = { x: 0, y: 0, z: 0 };
    
    enemy.fsm = new FSMSystem(['seek', 'flee'], 'seek');
    enemy.fsm.blackboard = { agent: enemy, game: this };
    
    enemy.fsm.addTransition('seek', 'flee', (bb) => bb.agent.scared);
    
    enemy.fsm.addState('seek', (bb, dt) => {
        const ag = bb.agent;
        const p = bb.game.player;
        const steer = SteeringSystem.seek(ag, {x: p.x, y:0, z: p.z}, 100, ag.speed, 0.1);
        const flock = SteeringSystem.calculateFlocking(ag, bb.game.enemies, {
            sepR: ag.size * 1.5,
            aliR: ag.size * 3.0,
            cohR: ag.size * 3.0,
            maxSpeed: ag.speed,
            maxForce: 0.05
        });

        ag.velocity.x += steer.x * 1.5 + flock.x * 1.0;
        ag.velocity.z += steer.z * 1.5 + flock.z * 1.0;
        
        const spdSq = ag.velocity.x**2 + ag.velocity.z**2;
        if (spdSq > ag.speed**2) {
            const spd = Math.sqrt(spdSq);
            ag.velocity.x = (ag.velocity.x / spd) * ag.speed;
            ag.velocity.z = (ag.velocity.z / spd) * ag.speed;
        }

        ag.position.x += ag.velocity.x * dt;
        ag.position.z += ag.velocity.z * dt;
    });

    enemy.fsm.addState('flee', (bb, dt) => {
        const ag = bb.agent;
        const p = bb.game.player;
        const maxSpd = ag.speed * 3;
        
        const flee = SteeringSystem.flee(ag, {x: p.x, y:0, z: p.z}, 100, maxSpd, 0.2);
        ag.velocity.x += flee.x;
        ag.velocity.z += flee.z;
        
        const spdSq = ag.velocity.x**2 + ag.velocity.z**2;
        if (spdSq > maxSpd**2) {
            const spd = Math.sqrt(spdSq);
            ag.velocity.x = (ag.velocity.x / spd) * maxSpd;
            ag.velocity.z = (ag.velocity.z / spd) * maxSpd;
        }

        ag.position.x += ag.velocity.x * dt;
        ag.position.z += ag.velocity.z * dt;
        
        ag.scaredTimer -= dt;
    });

    this.enemies.push(enemy);
  }

  _updateEnemyAI(dt) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      e.fsm.tick(dt);
      e.x = e.position.x;
      e.z = e.position.z;
      e.vx = e.velocity.x;
      e.vz = e.velocity.z;
    }
  }

  _updateFleeing(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.scared) continue;
      const eDist = Math.sqrt(e.x * e.x + e.z * e.z);
      if (eDist > this.arenaRadius + 10 || e.scaredTimer <= 0) {
        this.enemies.splice(i, 1);
      }
    }
  }

  // === WEAPONS ===
  _updateWeapons(dt) {
    for (const w of this.player.weapons) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = w.cd;
        this._fireWeapon(w);
      }
    }
  }

  _fireWeapon(w) {
    if (this.projectiles.length >= this.MAX_PROJECTILES) return;
    const p = this.player;

    if (w.aoe > 0 && w.speed === 0) {
      for (const e of this.enemies) {
        const dx = e.x - p.x, dz = e.z - p.z;
        if (dx * dx + dz * dz < w.aoe * w.aoe) {
          this._damageEnemy(e, w.dmg);
        }
      }
      return;
    }

    let nearest = null, nearDist = Infinity;
    for (const e of this.enemies) {
      const d = (e.x - p.x) ** 2 + (e.z - p.z) ** 2;
      if (d < nearDist && d < w.range * w.range) {
        nearDist = d; nearest = e;
      }
    }
    if (!nearest) return;

    const dx = nearest.x - p.x, dz = nearest.z - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    this.projectiles.push({
      x: p.x, z: p.z,
      vx: (dx / dist) * w.speed, vz: (dz / dist) * w.speed,
      dmg: w.dmg * (this.rng() < p.critChance ? 2 : 1),
      life: 2.0, aoe: w.aoe,
    });
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.z += proj.vz * dt;
      proj.life -= dt;
      if (proj.life <= 0) this.projectiles.splice(i, 1);
    }
  }

  // === COLLISIONS ===
  _checkProjectileHits() {
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        const dx = proj.x - e.x, dz = proj.z - e.z;
        const hitDist = e.size + 0.3;
        if (dx * dx + dz * dz < hitDist * hitDist) {
          this._damageEnemy(e, proj.dmg);
          this.projectiles.splice(pi, 1);
          break;
        }
      }
    }
    // Subclass hooks: _killEnemy usually called inside _damageEnemy if hp <= 0
  }

  _damageEnemy(e, dmg) {
    if (e.scared) return;
    const p = this.player;
    e.hp -= Math.max(1, dmg - p.damageReduce);
    if (e.hp <= 0.3 * e.maxHp) {
        this._killEnemy(e);
    }
  }

  // By default, BulletHeaven enemies die. Subclasses can override (e.g. scare).
  _killEnemy(e) {
    if (e.scared) return; // 'dead' marker
    e.scared = true; 
    e.scaredTimer = 2.0; 
    this._spawnPickup(e.x, e.z, 'xp', e.xp);
    this.kills++;
    this.score += e.xp * 10;
    this._rewardAccum += 1.0;
  }

  _checkEnemyPlayerCollisions(dt) {
    const p = this.player;
    if (p.invuln > 0) return;
    for (const e of this.enemies) {
      if (e.scared) continue;
      const dx = p.x - e.x, dz = p.z - e.z;
      const hitDist = e.size + 0.5;
      if (dx * dx + dz * dz < hitDist * hitDist) {
        const dmg = Math.max(1, e.dmg * (1 - p.damageReduce));
        p.hp -= dmg;
        p.invuln = 0.5;
        this._rewardAccum -= 2.0;
        if (p.hp <= 0) {
          p.hp = 0;
          this.gameOver = true;
          this._rewardAccum -= 100;
        }
        break;
      }
    }
  }

  _resolveObstacleCollisions(dt) {
    if (!this.obstacles) return;
    const p = this.player;
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      if (ob.hp <= 0) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Player pushing crate
      let dx = p.x - ob.x, dz = p.z - ob.z;
      let distSq = dx*dx + dz*dz;
      let minDist = 0.5 + ob.r;
      if (distSq < minDist*minDist && distSq > 0) {
        let dist = Math.sqrt(distSq);
        let push = minDist - dist;
        // Player pushes crate 60%, bounces back 40%
        ob.x -= (dx/dist) * push * 0.6;
        ob.z -= (dz/dist) * push * 0.6;
        p.x += (dx/dist) * push * 0.4;
        p.z += (dz/dist) * push * 0.4;
      }
      
      // Enemies colliding with crate
      for (const e of this.enemies) {
        dx = e.x - ob.x; dz = e.z - ob.z;
        distSq = dx*dx + dz*dz;
        minDist = e.size + ob.r;
        if (distSq < minDist*minDist && distSq > 0) {
          let dist = Math.sqrt(distSq);
          let push = minDist - dist;
          
          // Enemies push crate slightly, but mostly bounce
          ob.x -= (dx/dist) * push * 0.05;
          ob.z -= (dz/dist) * push * 0.05;
          e.x += (dx/dist) * push * 0.95;
          e.z += (dz/dist) * push * 0.95;
          
          // Enemies damage crate!
          if (!e.scared) {
            ob.hp -= e.dmg * dt * 2; // Deal damage over time
          }
        }
      }
      
      // Keep crate inside arena bounds
      const obDist = Math.sqrt(ob.x*ob.x + ob.z*ob.z);
      if (obDist > this.arenaRadius - ob.r) {
        ob.x = (ob.x / obDist) * (this.arenaRadius - ob.r);
        ob.z = (ob.z / obDist) * (this.arenaRadius - ob.r);
      }
      
      // Projectiles (optional: break on crate, but let's just let them pass for now or hit)
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const pj = this.projectiles[j];
        dx = pj.x - ob.x; dz = pj.z - ob.z;
        if (dx*dx + dz*dz < ob.r*ob.r) {
          this.projectiles.splice(j, 1);
        }
      }
    }
  }

  _checkPickupCollisions() {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      const dx = p.x - pk.x, dz = p.z - pk.z;
      if (dx * dx + dz * dz < p.pickupRange * p.pickupRange) {
        if (pk.type === 'xp') {
          p.xp += pk.value;
          this._rewardAccum += 0.5;
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  _spawnPickup(x, z, type, value) {
    if (this.pickups.length >= this.MAX_PICKUPS) return;
    this.pickups.push({ x, z, type, value });
  }

  // === LEVEL UP ===
  _checkLevelUp() {
    const p = this.player;
    const needed = this.xpPerLevel[Math.min(p.level, this.xpPerLevel.length - 1)];
    if (p.xp >= needed) {
      p.xp -= needed;
      p.level++;
      this._rewardAccum += 5.0;
      this._generateUpgradeOptions();
    }
  }

  _generateUpgradeOptions() {
    const options = [];
    const pool = [];

    for (const w of this.weaponsDB) {
      if (!this.player.weapons.find(pw => pw.id === w.id)) {
        pool.push({ type: 'weapon', data: w, label: `🔥 ${w.name} (DMG ${w.dmg})` });
      }
    }
    for (const ps of this.passivesDB) {
      if (!this.player.passives.find(pp => pp.id === ps.id)) {
        pool.push({ type: 'passive', data: ps, label: `💎 ${ps.name}` });
      }
    }
    
    pool.push({ type: 'stat', stat: 'maxHp', value: 20, label: '❤️ +20 Max HP' });
    pool.push({ type: 'stat', stat: 'speed', value: 0.5, label: '💨 +Speed' });

    for (const w of this.player.weapons) {
      pool.push({ type: 'weapon_upgrade', weaponId: w.id, label: `⬆️ ${w.name} +DMG` });
    }

    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(this.rng() * pool.length);   // la baraja de mejoras
      options.push(pool.splice(idx, 1)[0]);
    }

    this.pendingUpgrade = { options };
  }

  _applyUpgrade(choiceIdx) {
    if (!this.pendingUpgrade || choiceIdx >= this.pendingUpgrade.options.length) return;
    const choice = this.pendingUpgrade.options[choiceIdx];
    const p = this.player;

    switch (choice.type) {
      case 'weapon':
        p.weapons.push({ ...choice.data, timer: 0 });
        break;
      case 'passive':
        p.passives.push(choice.data);
        if (choice.data.effect === 'pickup_range') p.pickupRange += choice.data.value;
        if (choice.data.effect === 'damage_reduce') p.damageReduce += choice.data.value;
        if (choice.data.effect === 'speed_mult') p.speedMult *= choice.data.value;
        if (choice.data.effect === 'hp_regen') p.hpRegen += choice.data.value;
        if (choice.data.effect === 'crit_chance') p.critChance += choice.data.value;
        break;
      case 'stat':
        if (choice.stat === 'maxHp') { p.maxHp += choice.value; p.hp += choice.value; }
        if (choice.stat === 'speed') p.speed += choice.value;
        break;
      case 'weapon_upgrade':
        const w = p.weapons.find(w => w.id === choice.weaponId);
        if (w) { w.dmg = Math.ceil(w.dmg * 1.3); w.cd *= 0.9; }
        break;
    }
    this.pendingUpgrade = null;
  }

  // === STATE (API) ===
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   *  EL SUSTRATO — LO QUE HAY, EN EL IDIOMA COMÚN DE LOS DIBUJANTES
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Mismo contrato que publican los 24 juegos del arcade: `rejilla` (terreno),
   * `piezas` (lo que se mueve) y `zonas` (montones fuera del tablero). Con esto
   * un dibujante puede pintar este juego **sin saber a qué se juega**, que es lo
   * que permite que 24 juegos compartan una sola mesa.
   *
   * Va en la clase MADRE y no en `MarabuntaSystem` a propósito: Marabunta lo
   * hereda y cualquier bullet-heaven futuro nace con él. Es el mismo dividendo
   * que dio unificar ¡Busca! — un solo `sustrato()` en el núcleo cubrió sus tres
   * etapas.
   *
   * ⚠️ AQUÍ NO HAY `rejilla`, Y ESO ES UNA RESPUESTA, NO UN OLVIDO.
   *
   * La arena es un círculo continuo de radio `arenaRadius`: no hay casillas. El
   * contrato lo permite —quien lee mira `if (sus.rejilla)`— y publicar una
   * rejilla inventada sería peor que no publicar ninguna: el dibujante pintaría
   * una cuadrícula que el juego no tiene y la persona jugaría creyendo en ella.
   *
   * ⚠️ Y NO SE PUBLICAN LAS BALAS.
   *
   * `projectiles` llega a 100 y se renueva cada pocos ticks. El sustrato describe
   * el ESTADO del juego, no cada chispa: meter cien piezas efímeras haría el
   * sustrato ilegible por el sitio donde menos información hay. Las balas son
   * decoración de un disparo que ya está resuelto en las vidas del enemigo.
   */
  sustrato() {
    const piezas = [];
    const p = this.player;
    piezas.push({ x: p.x, y: p.z, t: 'jugador', de: 0, vida: p.hp / p.maxHp, nivel: p.level });
    for (const e of this.enemies) {
      piezas.push({ x: e.x, y: e.z, t: e.type ?? 'enemigo', de: 1,
                    vida: e.maxHp ? e.hp / e.maxHp : 1, r: e.size });
    }
    for (const o of (this.obstacles ?? [])) {
      piezas.push({ x: o.x, y: o.z, t: 'obstaculo', de: 2, r: o.r,
                    vida: o.maxHp ? o.hp / o.maxHp : 1 });
    }
    for (const k of this.pickups) {
      piezas.push({ x: k.x, y: k.z, t: k.type ?? 'suelo', de: 3 });
    }

    return {
      piezas,
      zonas: [],
      /**
       * El radio de la arena no es una pieza ni una casilla, pero sin él un
       * dibujante no sabe dónde acaba el mundo. Va aparte y con nombre.
       */
      limite: { forma: 'circulo', radio: this.arenaRadius },
      leyenda: { jugador: 'tú', obstaculo: 'algo en medio', suelo: 'algo que recoger' },
      simbolos: { jugador: '@', obstaculo: '#', suelo: '+' },
    };
  }

  getState() {
    return {
      tick: this.tick,
      time: Math.round(this.time * 10) / 10,
      wave: this.wave,
      gameOver: this.gameOver,
      victory: this.victory,
      pendingUpgrade: this.pendingUpgrade,
      score: this.score,
      kills: this.kills,
      player: {
        x: this.player.x, z: this.player.z,
        dx: this.inputDir.x, dz: this.inputDir.z,
        hp: this.player.hp, maxHp: this.player.maxHp,
        xp: this.player.xp,
        xpNeeded: this.xpPerLevel[Math.min(this.player.level, this.xpPerLevel.length - 1)],
        level: this.player.level,
        speed: this.player.speed * this.player.speedMult,
        weapons: this.player.weapons.map(w => w.id),
        passives: this.player.passives.map(p => p.id),
        dashing: this.player.dashing,
        sweepCd: this.player.sweepCd,
        slamCd: this.player.slamCd,
      },
      enemies: this.enemies.map(e => ({
        id: e.id, x: e.x, z: e.z, hp: e.hp / e.maxHp, type: e.type, size: e.size
      })),
      obstacles: (this.obstacles || []).map(o => ({
        id: o.id, x: o.x, z: o.z, r: o.r, hp: o.hp / o.maxHp
      })),
      pickups: this.pickups.map(p => ({ x: p.x, z: p.z, type: p.type, value: p.value })),
      projectiles: this.projectiles.map(p => ({ x: p.x, z: p.z, vx: p.vx, vz: p.vz })),
      enemyCount: this.enemies.length,
    };
  }

  /** Flat 64-float observation vector for RL agents */
  getObservation() {
    const p = this.player;
    const obs = new Float32Array(64);
    
    obs[0] = p.x / this.arenaRadius;
    obs[1] = p.z / this.arenaRadius;
    obs[2] = p.hp / p.maxHp;
    obs[3] = p.xp / (this.xpPerLevel[Math.min(p.level, this.xpPerLevel.length - 1)] || 1);
    obs[4] = p.level / 14;
    obs[5] = (p.speed * p.speedMult) / 10;

    const SECTORS = 12;
    const sectorSize = (Math.PI * 2) / SECTORS;
    const sectorDens = new Float32Array(SECTORS);
    const sectorDist = new Float32Array(SECTORS).fill(1.0);

    for (const e of this.enemies) {
      const dx = e.x - p.x, dz = e.z - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      let angle = Math.atan2(dz, dx); if (angle < 0) angle += Math.PI * 2;
      const sector = Math.floor(angle / sectorSize) % SECTORS;
      sectorDens[sector]++;
      const normDist = Math.min(dist / this.arenaRadius, 1.0);
      if (normDist < sectorDist[sector]) sectorDist[sector] = normDist;
    }
    for (let s = 0; s < SECTORS; s++) {
      obs[6 + s] = Math.min(sectorDens[s] / 10, 1.0);
      obs[18 + s] = sectorDist[s];
    }

    const sortedPickups = this.pickups.map(pk => {
      const dx = pk.x - p.x, dz = pk.z - p.z;
      return { dx: dx / this.arenaRadius, dz: dz / this.arenaRadius, d: dx*dx+dz*dz };
    }).sort((a,b) => a.d - b.d);
    for (let i = 0; i < 3; i++) {
      if (sortedPickups[i]) {
        obs[30 + i*2] = sortedPickups[i].dx;
        obs[31 + i*2] = sortedPickups[i].dz;
      }
    }

    const elites = this.enemies.filter(e => e.type === 'elite' || e.type === 'boss' || e.type === 'tank');
    const sortedElites = elites.map(e => {
      const dx = e.x - p.x, dz = e.z - p.z;
      return { dx: dx / this.arenaRadius, dz: dz / this.arenaRadius, d: dx*dx+dz*dz };
    }).sort((a,b) => a.d - b.d);
    for (let i = 0; i < 3; i++) {
      if (sortedElites[i]) {
        obs[36 + i*2] = sortedElites[i].dx;
        obs[37 + i*2] = sortedElites[i].dz;
      }
    }

    obs[42] = this.wave / 12;
    obs[43] = this.time / 1200;

    for (let i = 0; i < 4; i++) {
      obs[44 + i] = p.weapons[i] ? (this.weaponsDB.findIndex(w => w.id === p.weapons[i].id) + 1) / this.weaponsDB.length : 0;
      obs[48 + i] = p.passives[i] ? (this.passivesDB.findIndex(ps => ps.id === p.passives[i].id) + 1) / this.passivesDB.length : 0;
    }

    const projDens = new Float32Array(SECTORS);
    for (const pr of this.projectiles) {
      const dx = pr.x - p.x, dz = pr.z - p.z;
      let angle = Math.atan2(dz, dx); if (angle < 0) angle += Math.PI * 2;
      const sector = Math.floor(angle / sectorSize) % SECTORS;
      projDens[sector]++;
    }
    for (let s = 0; s < SECTORS; s++) obs[52 + s] = Math.min(projDens[s] / 5, 1.0);

    return obs;
  }
}
