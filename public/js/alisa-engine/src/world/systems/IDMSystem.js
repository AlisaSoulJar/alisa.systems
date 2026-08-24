import { SteeringSystem } from '../../psyche/SteeringSystem.js';

// IDMSystem.js - Intelligent Driver Model Physics
// Supports both single-lane circular (tick) and multi-lane (tickMultiLane) modes.

export class IDMSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {number} config.desiredSpeed (v0) - The speed the driver wants to maintain
     * @param {number} config.safeTimeHeadway (T) - Minimum possible time to the vehicle in front
     * @param {number} config.maxAcceleration (a) - Maximum acceleration
     * @param {number} config.comfortableDecel (b) - Comfortable deceleration
     * @param {number} config.minDistance (s0) - Minimum distance to the vehicle in front
     * @param {number} config.accelExponent (delta) - Usually 4
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible lane changes.
     */
    constructor(config = {}) {
        this.v0 = config.desiredSpeed || 15.0;
        this.T = config.safeTimeHeadway || 1.5;
        this.a = config.maxAcceleration || 1.0;
        this.b = config.comfortableDecel || 1.5;
        this.s0 = config.minDistance || 2.0;
        this.delta = config.accelExponent || 4;

        // Loop boundary
        this.laneLength = config.laneLength || 200.0;

        // Multi-lane config
        this.laneTolerance = config.laneTolerance || 2.5;   // Z-distance to consider "same lane"
        this.lookAhead     = config.lookAhead     || 20.0;   // Forward scan distance
        this.laneGapCheck  = config.laneGapCheck  || 10.0;   // Min gap for safe lane change

        this.rng = config.rng || (() => Math.random());
    }

    /**
     * Single-lane circular IDM (original API, backward-compatible).
     * @param {Array} vehicles Array of { id, position: float, velocity: float, length: float }
     * @param {number} dt Delta time
     * @returns {Array} Updated states
     */
    tick(vehicles, dt = 0.016) {
        const sorted = [...vehicles].sort((v1, v2) => v2.position - v1.position);
        const updates = [];
        
        const config = { v0: this.v0, T: this.T, a: this.a, b: this.b, s0: this.s0, delta: this.delta };

        for (let i = 0; i < sorted.length; i++) {
            const ego = sorted[i];
            let lead = null;
            let distanceToLead = Infinity;

            if (i > 0) {
                lead = sorted[i - 1];
                distanceToLead = lead.position - ego.position - lead.length;
            } else if (sorted.length > 1) {
                lead = sorted[sorted.length - 1];
                distanceToLead = (lead.position + this.laneLength) - ego.position - lead.length;
            }

            // Universal ECS Delegation
            let acceleration = SteeringSystem.calculateIDM(
                ego.velocity, 
                lead ? lead.velocity : 0, 
                distanceToLead, 
                config
            );

            let newV = Math.max(0, ego.velocity + (acceleration * dt));
            let newP = ego.position + (newV * dt);
            if (newP > this.laneLength) newP -= this.laneLength;

            updates.push({
                id: ego.id,
                position: newP,
                velocity: newV,
                acceleration: acceleration
            });
        }
        return updates;
    }

    // ─────────────────────────────────────────────────────────
    //  MULTI-LANE IDM-LITE  (for Peatón-style multi-lane sims)
    // ─────────────────────────────────────────────────────────

    /**
     * Multi-lane IDM-lite: per-vehicle following + MOBIL-lite lane change.
     *
     * @param {Array} vehicles  Array of {
     *   id, x, z, dir, speed, baseSpeed,
     *   followDist, brakeSensitivity,   // personality
     *   laneChangeChance,               // probability per frame
     *   laneZ,                          // current lane center Z
     *   sizeX, sizeZ,                   // bounding box
     *   brakeFactor,                    // current [0..1]
     *   braking                         // boolean
     * }
     * @param {Array}  lanes      Lane definitions [{ z, speed, dir }, ...]
     * @param {Array}  obstacles  Static obstacles [{ x, z }] (wrecks, etc.)
     * @param {number} dt         Delta time
     * @returns {Array} Per-vehicle updates: { id, brakeFactor, braking, laneChange: null | laneZ }
     */
    tickMultiLane(vehicles, lanes, obstacles = [], dt = 0.016) {
        const tol      = this.laneTolerance;
        const lookAhead = this.lookAhead;
        const gapCheck  = this.laneGapCheck;

        const updates = [];

        for (let i = 0; i < vehicles.length; i++) {
            const ego = vehicles[i];

            // ── Find nearest vehicle ahead in the same lane ──
            let nearestDist  = Infinity;
            let nearestSpeed = ego.speed;

            for (let j = 0; j < vehicles.length; j++) {
                if (j === i) continue;
                const other = vehicles[j];
                if (Math.abs(other.z - ego.z) > tol) continue;
                const dx = (other.x - ego.x) * ego.dir;
                if (dx > 0 && dx < lookAhead && dx < nearestDist) {
                    nearestDist  = dx;
                    nearestSpeed = other.speed * other.dir;
                }
            }

            // ── Also scan static obstacles (wrecks, breakdowns) ──
            for (let ob of obstacles) {
                const dx = (ob.x - ego.x) * ego.dir;
                const dz = Math.abs(ob.z - ego.z);
                if (dx > 0 && dx < lookAhead && dz < 3 && dx < nearestDist) {
                    nearestDist  = dx;
                    nearestSpeed = 0;
                }
            }

            // ── IDM-lite brake factor ──
            let brakeFactor = ego.brakeFactor;
            let braking     = ego.braking;

            const followThreshold = ego.followDist * 1.5;
            if (nearestDist < followThreshold) {
                const brakePower = Math.max(0.15, nearestDist / followThreshold);
                brakeFactor += (brakePower - brakeFactor) * ego.brakeSensitivity * dt;
                braking = true;
            } else {
                brakeFactor += (1.0 - brakeFactor) * 2 * dt;
                braking = false;
            }

            // ── MOBIL-lite lane change ──
            let laneChange = null;
            if (this.rng() < ego.laneChangeChance && nearestDist < ego.followDist * 2) {
                const currentLane = this._findLane(ego.z, lanes);
                const currentIdx  = lanes.indexOf(currentLane);
                const candidates  = [];
                if (currentIdx > 0)                  candidates.push(lanes[currentIdx - 1]);
                if (currentIdx < lanes.length - 1)   candidates.push(lanes[currentIdx + 1]);

                for (const target of candidates) {
                    let clear = true;
                    for (let j = 0; j < vehicles.length; j++) {
                        if (j === i) continue;
                        const other = vehicles[j];
                        if (other.wrecked) continue;
                        if (Math.abs(other.z - target.z) < tol) {
                            if (Math.abs(other.x - ego.x) < gapCheck) { clear = false; break; }
                        }
                    }
                    if (clear) {
                        laneChange = target.z;
                        break;
                    }
                }
            }

            updates.push({
                id:          ego.id,
                brakeFactor: brakeFactor,
                braking:     braking,
                laneChange:  laneChange
            });
        }
        return updates;
    }

    /** Nearest lane by Z. */
    _findLane(z, lanes) {
        let best = lanes[0], minD = Infinity;
        for (const l of lanes) {
            const d = Math.abs(l.z - z);
            if (d < minD) { minD = d; best = l; }
        }
        return best;
    }

    // ─────────────────────────────────────────────────────────
    //  RL OBSERVATION HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * Generate an RL-friendly observation vector for a single ego vehicle.
     * @param {Object} ego   { x, z, speed, dir }
     * @param {Array}  peers All other vehicles [{ x, z, speed, dir, sizeX, sizeZ }]
     * @param {number} k     Max peers to include (sorted by distance)
     * @returns {Object}     { ego: {x,z,v,dir}, peers: [{dx,dz,vx,vz}] }
     */
    getObservation(ego, peers, k = 8) {
        const scored = peers.map(p => ({
            dx: p.x - ego.x,
            dz: p.z - ego.z,
            vx: p.speed * p.dir,
            vz: 0,
            dist: Math.sqrt((p.x - ego.x) ** 2 + (p.z - ego.z) ** 2)
        })).sort((a, b) => a.dist - b.dist).slice(0, k);

        return {
            ego: { x: ego.x, z: ego.z, v: ego.speed, dir: ego.dir },
            peers: scored.map(({ dx, dz, vx, vz }) => ({ dx, dz, vx, vz }))
        };
    }
}
