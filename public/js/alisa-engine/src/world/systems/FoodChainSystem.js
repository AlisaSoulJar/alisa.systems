/**
 * FOOD CHAIN ENGINE — Multi-Tier Predator-Prey FSM
 * ─────────────────────────────────────────────────────
 * Pure ES6 Headless Mathematical Engine.
 * Encodes the full Interaction Lab food chain:
 *   Apex Predator (Raptor) → Mid Predator (Fox) → Prey (Mouse) → Resource (Cheese)
 *
 * Agent States:
 *   PREY:     wander | forage | flee | hide
 *   PREDATOR: idle | hunt_sight | hunt_smell | flee | boo_attack | jump
 *
 * Mechanics:
 *   - Stamina system with exhaustion and recovery
 *   - Dual sensing: SIGHT (range-limited, visible only) + SMELL (infinite, all)
 *   - Crate hiding: prey can hide in crates (timed, with cooldown)
 *   - Brave hunting: mid-predators risk hunting near apex if prey is close
 *   - Boo attack: fox bites raptor's tail when approaching from behind
 *   - Teamwork kiting: foxes taunt raptor to save allies
 *   - Crate jumping: predators vault over obstacles
 *   - Wall-aware flee: agents deflect toward center near boundaries
 *   - Desperation: predators hunt harder as resources deplete
 *   - Kill boost: stamina refill on successful kill
 *   - Cheese boost: prey gets stamina + speed surge from cheese
 *
 * No THREE.js or DOM dependencies. Returns pure state mutations.
 */

export class FoodChainSystem {
    constructor(config = {}) {
        this.arenaSize = config.arenaSize || 18;

        // Prey defaults
        this.preyBaseSpeed = config.preyBaseSpeed || 1.5;
        this.preyFleeSpeed = config.preyFleeSpeed || 7.0;
        this.preyForageSpeed = config.preyForageSpeed || 2.5;
        this.preyFleeRange = config.preyFleeRange || 7.0;
        this.preyCheeseSenseRange = config.preyCheeseSenseRange || Infinity;
        this.preyCheeseCatchRadius = config.preyCheeseCatchRadius || 0.6;
        this.preyHideMaxTime = config.preyHideMaxTime || 2.0;
        this.preyHideCooldown = config.preyHideCooldown || 4.0;
        this.preyCrateRadius = config.preyCrateRadius || 0.9;
        this.preyStaminaDrain = config.preyStaminaDrain || 14;
        this.preyStaminaRecovery = config.preyStaminaRecovery || 15;
        this.preyStaminaExhaustedRecovery = config.preyStaminaExhaustedRecovery || 25;
        this.preyExhaustedMultiplier = config.preyExhaustedMultiplier || 0.65;
        this.preyCheeseStaminaBoost = config.preyCheeseStaminaBoost || 35;
        this.preyCheeseSpeedBurst = config.preyCheeseSpeedBurst || 3.5;

        // Predator defaults
        this.predKillRadius = config.predKillRadius || 1.2;
        this.predKillStaminaBoost = config.predKillStaminaBoost || 40;
        this.predStaminaDrain = config.predStaminaDrain || 25;
        this.predStaminaRecovery = config.predStaminaRecovery || 12;
        this.predIdleRecovery = config.predIdleRecovery || 8;
        this.predCommitTime = config.predCommitTime || 0.5;
        this.predBraveRange = config.predBraveRange || 4.0;
        this.predBraveApexMinDist = config.predBraveApexMinDist || 5.0;
        this.predBooMaxDist = config.predBooMaxDist || 3.5;
        this.predBooDotThreshold = config.predBooDotThreshold || -0.4;
        this.predBooStaminaDrain = config.predBooStaminaDrain || 25;
        this.predBooScore = config.predBooScore || 5;
        this.predTeamTauntMinApexDist = config.predTeamTauntMinApexDist || 4.5;
        this.predTeamTauntMinStamina = config.predTeamTauntMinStamina || 40;
        this.predCrateKiteMinStamina = config.predCrateKiteMinStamina || 20;
        this.predJumpDuration = config.predJumpDuration || 0.6;
        this.predJumpHeight = config.predJumpHeight || 1.8;
        this.predJumpTriggerDist = config.predJumpTriggerDist || 2.5;
        this.predJumpDotThreshold = config.predJumpDotThreshold || 0.8;
        this.predWallSenseRange = config.predWallSenseRange || 3.0;
    }

    // ──────────────────────────────────────────────────
    //  STATE FACTORIES
    // ──────────────────────────────────────────────────

    /**
     * Create a prey (mouse) state.
     * @param {string} id - Unique agent ID
     * @param {Object} pos - {x, z} initial position
     * @returns {Object} Prey state
     */
    createPreyState(id, pos = { x: 0, z: 0 }) {
        return {
            id,
            role: 'prey',
            alive: true,
            position: { x: pos.x, z: pos.z },
            rotation: 0,
            phase: 'wander',      // 'wander' | 'forage' | 'flee' | 'hide'
            target: { x: 0, z: 0 },
            timer: 0,
            speed: this.preyBaseSpeed,
            hopPhase: 0,
            hopAmp: 0.02,
            hopFreq: 15,
            stamina: 100,
            maxStamina: 100,
            exhausted: false,
            isHidden: false,
            hideTimer: 0,
            hideCooldown: 0,
            events: []           // per-tick: 'cheese_eaten', 'fled', 'hid', 'caught'
        };
    }

    /**
     * Create a predator (fox/raptor) state.
     * @param {string} id
     * @param {string} tier - 'mid' (fox) or 'apex' (raptor)
     * @param {Object} pos - {x, z}
     * @param {Object} overrides - Override default stat values
     * @returns {Object} Predator state
     */
    createPredatorState(id, tier = 'mid', pos = { x: 0, z: 0 }, overrides = {}) {
        const isMid = tier === 'mid';
        return {
            id,
            role: 'predator',
            tier,
            alive: true,
            position: { x: pos.x, z: pos.z },
            rotation: 0,
            phase: 'idle',         // 'idle' | 'hunt_sight' | 'hunt_smell' | 'flee' | 'boo_attack' | 'jump'
            target: { x: 0, z: 0 },
            speed: 0,
            score: 0,
            stamina: 100,
            maxStamina: 100,
            exhausted: false,

            // Sense parameters
            sightRange: overrides.sightRange || (isMid ? 10.0 : 5.0),
            sprintSpeed: overrides.sprintSpeed || (isMid ? 5.2 : 3.5),
            smellSpeed: overrides.smellSpeed || (isMid ? 2.2 : 1.4),
            sniffSpeed: overrides.sniffSpeed || (isMid ? 4.0 : 2.5),
            fleeSpeed: overrides.fleeSpeed || (isMid ? 5.5 : 3.0),
            fleeRange: overrides.fleeRange || 7.0,

            // Commit system (anti-jitter)
            commitTargetId: null,
            commitTimer: 0,

            // Jump
            isJumping: false,
            jumpTimer: 0,
            jumpY: 0,

            // Boo
            _booTarget: null,

            // Desperation (fraction 0..1)
            desperation: 0,

            events: []   // 'kill', 'flee_start', 'boo_hit', 'jumped', 'exhausted', 'resumed'
        };
    }

    // ──────────────────────────────────────────────────
    //  PREY TICK
    // ──────────────────────────────────────────────────

    /**
     * Advance a prey agent by dt seconds.
     * @param {Object} prey - Prey state (mutated in-place)
     * @param {Object} env - { predators: [{id, position, alive}], cheese: [{id, position}], crates: [{id, position}] }
     * @param {number} dt
     * @returns {Object} Updated prey state
     */
    tickPrey(prey, env, dt) {
        prey.events = [];
        if (!prey.alive) return prey;

        const predators = env.predators || [];
        const cheese = env.cheese || [];
        const crates = env.crates || [];

        // ── Hide Logic ──
        if (prey.hideCooldown > 0) {
            prey.hideCooldown -= dt;
            prey.hideTimer = 0;
            prey.isHidden = false;
        } else {
            let nearCrate = false;
            for (const crate of crates) {
                if (this._dist(prey.position, crate.position) < this.preyCrateRadius) {
                    nearCrate = true;
                    break;
                }
            }
            if (nearCrate) {
                prey.isHidden = true;
                prey.hideTimer += dt;
                if (prey.hideTimer > this.preyHideMaxTime) {
                    prey.hideCooldown = this.preyHideCooldown;
                    prey.isHidden = false;
                }
            } else {
                prey.isHidden = false;
                prey.hideTimer = Math.max(0, prey.hideTimer - dt);
            }
        }

        // ── Find nearest predator ──
        let nearestPred = null;
        let predDist = Infinity;
        for (const pred of predators) {
            if (!pred.alive) continue;
            const d = prey.isHidden ? Infinity : this._dist(prey.position, pred.position);
            if (d < predDist) { predDist = d; nearestPred = pred; }
        }

        // ── Cheese seek ──
        let closestCheese = null;
        let cheeseDist = Infinity;
        if (!prey.isHidden) {
            for (const ch of cheese) {
                const d = this._dist(prey.position, ch.position);
                if (d < cheeseDist) { cheeseDist = d; closestCheese = ch; }
            }
            if (closestCheese && cheeseDist < this.preyCheeseCatchRadius) {
                prey.stamina = Math.min(prey.maxStamina, prey.stamina + this.preyCheeseStaminaBoost);
                prey.exhausted = false;
                prey.speed = Math.max(prey.speed, this.preyCheeseSpeedBurst);
                prey.events.push('cheese_eaten');
                prey.events.push(`cheese_id:${closestCheese.id}`);
                closestCheese = null;
            }
        }

        // ── State Machine ──
        let isFleeing = false;
        prey.timer -= dt;

        if (predDist < this.preyFleeRange) {
            // FLEE
            isFleeing = true;
            prey.phase = 'flee';
            prey.events.push('fled');

            // Can we dash to a crate?
            let safeCrate = null;
            let safeDist = Infinity;
            if (prey.hideCooldown <= 0) {
                for (const c of crates) {
                    const d = this._dist(prey.position, c.position);
                    if (d < safeDist && d < 6.0) { safeDist = d; safeCrate = c; }
                }
            }

            if (safeCrate) {
                prey.target.x = safeCrate.position.x;
                prey.target.z = safeCrate.position.z;
            } else {
                // Flee away from predator with zigzag
                const dx = prey.position.x - nearestPred.position.x;
                const dz = prey.position.z - nearestPred.position.z;
                const mag = Math.sqrt(dx * dx + dz * dz) || 1;
                // Add time-based wobble for zigzag
                const t = (prey._fleePhase || 0) + dt * 5;
                prey._fleePhase = t;
                prey.target.x = prey.position.x + (dx / mag + Math.sin(t) * 1.2) * 5;
                prey.target.z = prey.position.z + (dz / mag + Math.cos(t * 0.8) * 1.2) * 5;

                // Wall awareness
                this._wallDeflect(prey.target, 2.5);
            }
            this._clamp(prey.target);
            prey.timer = 0.5;
            prey.speed = this.preyFleeSpeed;
            prey.hopAmp = 0.15;
            prey.hopFreq = 40;

        } else if (prey.isHidden) {
            // HIDE — stay still
            prey.phase = 'hide';
            prey.target.x = prey.position.x;
            prey.target.z = prey.position.z;
            prey.speed = 0;
            prey.hopAmp = 0.05;
            prey.hopFreq = 8;
            if (!prey.events.includes('hid')) prey.events.push('hid');

        } else if (closestCheese) {
            // FORAGE
            if (prey.timer <= 0) {
                prey.phase = 'forage';
                prey.target.x = closestCheese.position.x + (Math.random() - 0.5) * 0.8;
                prey.target.z = closestCheese.position.z + (Math.random() - 0.5) * 0.8;
                prey.timer = 0.5 + Math.random() * 0.5;
                prey.speed = this.preyForageSpeed + Math.random() * 2.0;
                prey.hopAmp = 0.05;
                prey.hopFreq = 22;
            }

        } else if (prey.timer <= 0) {
            // WANDER
            prey.phase = 'wander';
            prey.target.x = (Math.random() - 0.5) * 20;
            prey.target.z = (Math.random() - 0.5) * 20;
            prey.speed = 1.0 + Math.random() * 2.0;
            prey.timer = 1 + Math.random() * 3;
            prey.hopAmp = 0.02 + Math.random() * 0.05;
            prey.hopFreq = 15 + Math.random() * 10;
        }

        // ── Stamina ──
        if (isFleeing) {
            prey.stamina -= dt * this.preyStaminaDrain;
            if (prey.stamina <= 0) {
                prey.stamina = 0;
                prey.exhausted = true;
                prey.events.push('exhausted');
            }
        } else {
            const rate = prey.exhausted ? this.preyStaminaExhaustedRecovery : this.preyStaminaRecovery;
            prey.stamina += dt * rate;
            if (prey.stamina >= prey.maxStamina) {
                prey.stamina = prey.maxStamina;
                if (prey.exhausted) prey.events.push('resumed');
                prey.exhausted = false;
            }
        }
        if (prey.exhausted) prey.speed *= this.preyExhaustedMultiplier;

        // ── Movement ──
        this._moveAgent(prey, dt);

        return prey;
    }

    // ──────────────────────────────────────────────────
    //  PREDATOR TICK
    // ──────────────────────────────────────────────────

    /**
     * Advance a predator agent by dt seconds.
     * @param {Object} pred - Predator state (mutated in-place)
     * @param {Object} env - {
     *     prey: [{id, position, alive, isHidden}],
     *     apex: [{id, position, alive, rotation}] or null,
     *     crates: [{id, position}],
     *     allies: [{id, position, alive}],  // same-tier allies for teamwork
     *     resourceDepletion: number (0..1),  // how depleted are resources
     * }
     * @param {number} dt
     * @returns {Object} Updated predator state
     */
    tickPredator(pred, env, dt) {
        pred.events = [];
        if (!pred.alive) return pred;

        const preyList = (env.prey || []).filter(p => p.alive);
        const apexList = (env.apex || []).filter(a => a.alive);
        const crates = env.crates || [];
        const allies = env.allies || [];

        pred.desperation = env.resourceDepletion || 0;

        // ── Handle active jump ──
        if (pred.isJumping) {
            return this._tickJump(pred, dt);
        }

        // ── Find my predator (apex hunting me) ──
        let myApex = null;
        let apexDist = Infinity;
        for (const a of apexList) {
            const d = this._dist(pred.position, a.position);
            if (d < apexDist) { apexDist = d; myApex = a; }
        }

        // ── Find closest prey (SMELL = all, SIGHT = visible only) ──
        let closestPrey = null, minDist = Infinity;
        let closestVisible = null, minVisibleDist = Infinity;
        for (const p of preyList) {
            const d = this._dist(pred.position, p.position);
            if (d < minDist) { minDist = d; closestPrey = p; }
            if (!p.isHidden && d < minVisibleDist) {
                minVisibleDist = d; closestVisible = p;
            }
        }

        // ── Commit system (anti-jitter) ──
        if (!pred.commitTargetId || !preyList.find(p => p.id === pred.commitTargetId) || pred.commitTimer <= 0) {
            const best = closestVisible || closestPrey;
            pred.commitTargetId = best ? best.id : null;
            pred.commitTimer = this.predCommitTime + Math.random() * 0.5;
        }
        // Switch to MUCH closer visible prey
        const commitTarget = preyList.find(p => p.id === pred.commitTargetId);
        const commitDist = commitTarget ? this._dist(pred.position, commitTarget.position) : Infinity;
        if (closestVisible && minVisibleDist < commitDist * 0.6) {
            pred.commitTargetId = closestVisible.id;
        }
        pred.commitTimer -= dt;

        const huntTarget = preyList.find(p => p.id === pred.commitTargetId) || closestVisible || closestPrey;
        const huntDist = huntTarget ? this._dist(pred.position, huntTarget.position) : Infinity;
        const targetVisible = huntTarget ? !huntTarget.isHidden : false;

        // ── Flee decision ──
        let fleeing = myApex && apexDist < (pred.fleeRange || 7.0);

        // ── Brave hunting: prey close + apex far → go for it ──
        if (fleeing && closestVisible && minVisibleDist < this.predBraveRange && apexDist > this.predBraveApexMinDist) {
            fleeing = false;
        }

        // ── Boo attack: behind apex? bite! ──
        let booAttacking = false;
        if (pred.tier === 'mid' && myApex && !pred.exhausted && apexDist < this.predBooMaxDist) {
            // Check if we're behind apex
            const apexFwd = this._forward(myApex.rotation);
            const dx = pred.position.x - myApex.position.x;
            const dz = pred.position.z - myApex.position.z;
            const mag = Math.sqrt(dx * dx + dz * dz) || 1;
            const dot = apexFwd.x * (dx / mag) + apexFwd.z * (dz / mag);
            if (dot < this.predBooDotThreshold) {
                booAttacking = true;
                fleeing = false;
            }
        }

        // ── Process phases ──
        if (booAttacking) {
            pred.phase = 'boo_attack';
            pred._booTarget = myApex;

            const dx = myApex.position.x - pred.position.x;
            const dz = myApex.position.z - pred.position.z;
            const mag = Math.sqrt(dx * dx + dz * dz) || 1;

            // Face apex
            pred.rotation = this._turnToward(pred.rotation, dx, dz, 6, dt);

            if (apexDist > 1.2) {
                // Sprint toward tail
                pred.position.x += (dx / mag) * 6.5 * dt;
                pred.position.z += (dz / mag) * 6.5 * dt;
                pred.stamina -= dt * this.predBooStaminaDrain;
            } else {
                // WHACK!
                pred.events.push('boo_hit');
                pred.events.push(`boo_target:${myApex.id}`);
                pred.score += this.predBooScore;

                // Push back
                pred.position.x -= (dx / mag) * 2.0;
                pred.position.z -= (dz / mag) * 2.0;
            }
            this._clamp(pred.position);

        } else if (fleeing) {
            pred.phase = 'flee';
            if (!pred._wasFleeing) pred.events.push('flee_start');
            pred._wasFleeing = true;

            const dx = pred.position.x - myApex.position.x;
            const dz = pred.position.z - myApex.position.z;
            const mag = Math.sqrt(dx * dx + dz * dz) || 1;

            // Base flee direction + zigzag
            const t = (pred._fleePhase || 0) + dt * 6;
            pred._fleePhase = t;
            let fleeX = dx / mag + Math.sin(t) * 0.3;
            let fleeZ = dz / mag + Math.cos(t * 0.7) * 0.3;

            let fleeSpeed = pred.exhausted ? 2.5 : pred.fleeSpeed;

            // ── Teamwork kiting (foxes only) ──
            if (pred.tier === 'mid' && !pred.exhausted && crates.length > 0) {
                let friendInDanger = false;
                for (const ally of allies) {
                    if (ally.id !== pred.id && ally.alive && myApex) {
                        if (this._dist(ally.position, myApex.position) < apexDist - 0.5) {
                            friendInDanger = true;
                            break;
                        }
                    }
                }

                if (friendInDanger && apexDist > this.predTeamTauntMinApexDist && pred.stamina > this.predTeamTauntMinStamina) {
                    // Strafe perpendicular to draw aggro
                    const temp = fleeX;
                    fleeX = -fleeZ;
                    fleeZ = temp;
                    fleeSpeed = 2.0; // slow taunt
                    pred.events.push('taunting');
                } else if (pred.stamina > this.predCrateKiteMinStamina) {
                    // Crate kiting: find forward crate
                    const bestCrate = this._findBestForwardCrate(pred.position, { x: fleeX, z: fleeZ }, crates);
                    if (bestCrate) {
                        const cdx = bestCrate.position.x - pred.position.x;
                        const cdz = bestCrate.position.z - pred.position.z;
                        const cmag = Math.sqrt(cdx * cdx + cdz * cdz) || 1;
                        fleeX = cdx / cmag;
                        fleeZ = cdz / cmag;
                    }
                }
            }

            // Wall awareness
            const futX = pred.position.x + fleeX * 2;
            const futZ = pred.position.z + fleeZ * 2;
            const limit = this.arenaSize - 0.5;
            const ws = this.predWallSenseRange;
            if (futX > limit - ws) fleeX -= 1.5;
            if (futX < -limit + ws) fleeX += 1.5;
            if (futZ > limit - ws) fleeZ -= 1.5;
            if (futZ < -limit + ws) fleeZ += 1.5;
            const fmag = Math.sqrt(fleeX * fleeX + fleeZ * fleeZ) || 1;
            fleeX /= fmag;
            fleeZ /= fmag;

            pred.position.x += fleeX * fleeSpeed * dt;
            pred.position.z += fleeZ * fleeSpeed * dt;
            this._clamp(pred.position);

            pred.rotation = this._turnToward(pred.rotation, fleeX, fleeZ, 8, dt);

            pred.stamina -= dt * 20;
            if (pred.stamina <= 0) {
                pred.stamina = 0;
                pred.exhausted = true;
                pred.events.push('exhausted');
            }

        } else if (huntTarget && huntDist > this.predKillRadius) {
            // ── HUNTING ──
            pred._wasFleeing = false;
            const canSee = targetVisible && huntDist < pred.sightRange;
            pred.phase = canSee ? 'hunt_sight' : 'hunt_smell';

            const dx = huntTarget.position.x - pred.position.x;
            const dz = huntTarget.position.z - pred.position.z;
            const mag = Math.sqrt(dx * dx + dz * dz) || 1;

            pred.rotation = this._turnToward(pred.rotation, dx, dz, 6, dt);

            let speed;
            if (!pred.exhausted) {
                speed = canSee ? pred.sprintSpeed : pred.sniffSpeed;
                // Drain stamina (desperation slows drain)
                const drainRate = this.predStaminaDrain - (pred.desperation * 15);
                pred.stamina -= dt * drainRate;
                if (pred.stamina <= 0) {
                    pred.stamina = 0;
                    pred.exhausted = true;
                    pred.events.push('exhausted');
                }
            } else {
                speed = 0.5;
                // Recovery (desperation speeds recovery)
                const recoverRate = this.predStaminaRecovery + (pred.desperation * 10);
                const recoverTarget = 100 - (pred.desperation * 50);
                pred.stamina += dt * recoverRate;
                if (pred.stamina >= recoverTarget) {
                    pred.exhausted = false;
                    pred.events.push('resumed');
                }
            }

            pred.position.x += (dx / mag) * speed * dt;
            pred.position.z += (dz / mag) * speed * dt;

            // ── Crate Jump check ──
            if (pred.tier === 'mid' && !pred.exhausted) {
                this._checkJumpStart(pred, crates);
            }

        } else if (huntTarget && huntDist <= this.predKillRadius && targetVisible) {
            // ── KILL ──
            pred._wasFleeing = false;
            pred.phase = 'idle';
            pred.events.push('kill');
            pred.events.push(`kill_target:${huntTarget.id}`);
            pred.score++;
            pred.stamina = Math.min(pred.maxStamina, pred.stamina + this.predKillStaminaBoost);
            pred.exhausted = false;
            pred.commitTargetId = null;

        } else {
            // ── IDLE ──
            pred._wasFleeing = false;
            pred.phase = 'idle';
            pred.stamina += dt * this.predIdleRecovery;
            if (pred.stamina >= pred.maxStamina) {
                pred.stamina = pred.maxStamina;
                if (pred.exhausted) pred.events.push('resumed');
                pred.exhausted = false;
            }
        }

        this._clamp(pred.position);
        return pred;
    }

    // ──────────────────────────────────────────────────
    //  RL INTERFACE
    // ──────────────────────────────────────────────────

    getPreyObservation(prey, env) {
        const preds = (env.predators || []).filter(p => p.alive);
        let nearestPredDist = Infinity;
        for (const p of preds) {
            nearestPredDist = Math.min(nearestPredDist, this._dist(prey.position, p.position));
        }
        return {
            phase: prey.phase,
            x: prey.position.x,
            z: prey.position.z,
            stamina: prey.stamina,
            exhausted: prey.exhausted,
            isHidden: prey.isHidden,
            nearestPredDist: nearestPredDist === Infinity ? -1 : nearestPredDist,
            cheeseRemaining: (env.cheese || []).length
        };
    }

    getPredatorObservation(pred, env) {
        const prey = (env.prey || []).filter(p => p.alive && !p.isHidden);
        let nearestPreyDist = Infinity;
        for (const p of prey) {
            nearestPreyDist = Math.min(nearestPreyDist, this._dist(pred.position, p.position));
        }
        return {
            phase: pred.phase,
            tier: pred.tier,
            x: pred.position.x,
            z: pred.position.z,
            stamina: pred.stamina,
            exhausted: pred.exhausted,
            score: pred.score,
            desperation: pred.desperation,
            nearestPreyDist: nearestPreyDist === Infinity ? -1 : nearestPreyDist,
            isJumping: pred.isJumping
        };
    }

    // ──────────────────────────────────────────────────
    //  HELPERS (PRIVATE)
    // ──────────────────────────────────────────────────

    _dist(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    _clamp(pos) {
        const limit = this.arenaSize - 0.5;
        pos.x = Math.max(-limit, Math.min(limit, pos.x));
        pos.z = Math.max(-limit, Math.min(limit, pos.z));
    }

    _wallDeflect(target, sense) {
        const limit = this.arenaSize - 0.5;
        if (target.x > limit - sense) target.x -= 4;
        if (target.x < -limit + sense) target.x += 4;
        if (target.z > limit - sense) target.z -= 4;
        if (target.z < -limit + sense) target.z += 4;
    }

    _forward(rotation) {
        return { x: Math.sin(rotation), z: Math.cos(rotation) };
    }

    _turnToward(currentRot, dx, dz, turnSpeed, dt) {
        const aim = Math.atan2(dx, dz);
        let diff = aim - currentRot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return currentRot + diff * turnSpeed * dt;
    }

    _moveAgent(agent, dt) {
        const dx = agent.target.x - agent.position.x;
        const dz = agent.target.z - agent.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.1) {
            const nx = dx / dist;
            const nz = dz / dist;
            agent.rotation = this._turnToward(agent.rotation, nx, nz, 18, dt);
            agent.position.x += nx * agent.speed * dt;
            agent.position.z += nz * agent.speed * dt;
            this._clamp(agent.position);
            agent.hopPhase += dt * agent.hopFreq;
        }
    }

    _tickJump(pred, dt) {
        pred.jumpTimer += dt;
        if (pred.jumpTimer >= this.predJumpDuration) {
            pred.isJumping = false;
            pred.jumpY = 0;
        } else {
            const t = pred.jumpTimer / this.predJumpDuration;
            pred.jumpY = 4 * this.predJumpHeight * t * (1 - t);
            pred.events.push('jumping');
        }
        return pred;
    }

    _checkJumpStart(pred, crates) {
        const fwd = this._forward(pred.rotation);
        for (const c of crates) {
            const dist = this._dist(pred.position, c.position);
            if (dist < this.predJumpTriggerDist) {
                const dx = c.position.x - pred.position.x;
                const dz = c.position.z - pred.position.z;
                const mag = Math.sqrt(dx * dx + dz * dz) || 1;
                const dot = fwd.x * (dx / mag) + fwd.z * (dz / mag);
                if (dot > this.predJumpDotThreshold) {
                    pred.isJumping = true;
                    pred.jumpTimer = 0;
                    pred.events.push('jumped');
                    break;
                }
            }
        }
    }

    _findBestForwardCrate(pos, dir, crates) {
        let best = null;
        let bestScore = -Infinity;
        const dmag = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1;
        const dnx = dir.x / dmag;
        const dnz = dir.z / dmag;

        for (const c of crates) {
            const dx = c.position.x - pos.x;
            const dz = c.position.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 10.0 && dist > 1.5) {
                const dot = (dx / dist) * dnx + (dz / dist) * dnz;
                if (dot > 0) {
                    const score = dot * 10 - dist;
                    if (score > bestScore) { bestScore = score; best = c; }
                }
            }
        }
        return best;
    }
}
