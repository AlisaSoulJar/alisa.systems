// ============================================================================
// TurretCombatEngine.js
// Headless deterministic physics and state engine for Search & Rescue combat
// Maps 3D vector arithmetic locally without requiring Three.js dependencies.
// ============================================================================

export class TurretCombatSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible firing pattern.
     */
    constructor(config = {}) {
        this.turrets = [];
        this.turretBullets = [];
        this.chopperBullets = [];

        this.fireInterval = config.fireInterval || 2.5;
        this.stunDuration = config.stunDuration || 8.0;
        this.chopperCooldown = config.chopperCooldown || 0.5;
        this.bulletSpeed = config.bulletSpeed || 25.0;

        this.chopperFireTimer = 0;

        // Counter for deterministic assignment of unique IDs
        this._bulletCounter = 0;

        // Semilla inyectable. Sin ella el desfase inicial y la cadencia de las
        // torretas cambian en cada partida y un combate no se puede volver a
        // jugar igual. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
    }

    addTurret(id, x, y, z) {
        this.turrets.push({
            id: id,
            pos: { x, y, z },
            fireTimer: this.fireInterval * this.rng(), // initial stagger
            stunTimer: 0,
            hp: 3
        });
    }

    reset() {
        this.turrets.forEach(t => {
            t.stunTimer = 0;
            t.hp = 3;
            t.fireTimer = this.fireInterval * this.rng();
        });
        this.turretBullets = [];
        this.chopperBullets = [];
        this.chopperFireTimer = 0;
    }

    // Helper: standard 3D distance squared
    distSq(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return dx*dx + dy*dy + dz*dz;
    }

    // Helper: generate purely normalized directional vector
    dir(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (mag === 0) return {x:0, y:0, z:1};
        return { x: dx/mag, y: dy/mag, z: dz/mag };
    }

    tick(dt, chopperPos, chopperForward, wantFire) {
        const events = [];

        // 1. TURRET AI 
        this.turrets.forEach(t => {
            if (t.stunTimer > 0) {
                t.stunTimer -= dt;
                return;
            }

            t.fireTimer -= dt;
            if (t.fireTimer <= 0) {
                t.fireTimer = this.fireInterval + this.rng() * 0.5;
                const d = this.dir(t.pos, chopperPos);
                
                const bId = `tb_${this._bulletCounter++}`;
                this.turretBullets.push({
                    id: bId,
                    pos: { x: t.pos.x, y: t.pos.y, z: t.pos.z },
                    vel: { x: d.x * this.bulletSpeed, y: d.y * this.bulletSpeed, z: d.z * this.bulletSpeed },
                    life: 5.0
                });
                
                events.push({ type: 'TURRET_FIRE', turretId: t.id, bulletId: bId, pos: t.pos, dir: d });
            }
        });

        // 2. CHOPPER WEAPONS
        this.chopperFireTimer -= dt;
        if (wantFire && this.chopperFireTimer <= 0) {
            this.chopperFireTimer = this.chopperCooldown;
            const bId = `cb_${this._bulletCounter++}`;
            this.chopperBullets.push({
                id: bId,
                pos: { x: chopperPos.x, y: chopperPos.y, z: chopperPos.z },
                vel: { 
                    x: chopperForward.x * this.bulletSpeed * 2, 
                    y: chopperForward.y * this.bulletSpeed * 2, 
                    z: chopperForward.z * this.bulletSpeed * 2 
                },
                life: 3.0
            });
            events.push({ type: 'CHOPPER_FIRE', bulletId: bId, pos: chopperPos, dir: chopperForward });
        }

        // 3. PROJECTILE KINEMATICS & COLLISION
        
        // Turret Bullets -> Hit Chopper?
        for (let i = this.turretBullets.length - 1; i >= 0; i--) {
            const b = this.turretBullets[i];
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;
            b.pos.z += b.vel.z * dt;
            b.life -= dt;
            
            if (b.life <= 0) {
                events.push({ type: 'BULLET_EXPIRE', bulletType: 'turret', bulletId: b.id });
                this.turretBullets.splice(i, 1);
                continue;
            }

            if (this.distSq(b.pos, chopperPos) < 16.0) { // < 4.0
                events.push({ type: 'HIT_CHOPPER', bulletId: b.id, damage: 15, rlReward: -2.0 });
                this.turretBullets.splice(i, 1);
            }
        }

        // Chopper Bullets -> Hit Turret? Or Turret Bullet?
        for (let i = this.chopperBullets.length - 1; i >= 0; i--) {
            const b = this.chopperBullets[i];
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;
            b.pos.z += b.vel.z * dt;
            b.life -= dt;

            if (b.life <= 0) {
                events.push({ type: 'BULLET_EXPIRE', bulletType: 'chopper', bulletId: b.id });
                this.chopperBullets.splice(i, 1);
                continue;
            }

            let collision = false;

            // Hit Turret?
            for (let t of this.turrets) {
                if (t.stunTimer <= 0 && this.distSq(b.pos, t.pos) < 16.0) {
                    t.stunTimer = this.stunDuration;
                    events.push({ type: 'HIT_TURRET', bulletId: b.id, turretId: t.id, rlReward: 2.0 });
                    this.chopperBullets.splice(i, 1);
                    collision = true;
                    break;
                }
            }
            if (collision) continue;

            // Hit Turret Bullet? (Defensive shot)
            for (let j = this.turretBullets.length - 1; j >= 0; j--) {
                const tb = this.turretBullets[j];
                if (this.distSq(b.pos, tb.pos) < 4.0) { // < 2.0
                    events.push({ type: 'BULLET_CLASH', cBulletId: b.id, tBulletId: tb.id, rlReward: 0.5 });
                    this.turretBullets.splice(j, 1);
                    this.chopperBullets.splice(i, 1);
                    collision = true;
                    break;
                }
            }
        }

        return events;
    }
}
