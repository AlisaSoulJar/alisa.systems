import * as THREE from 'three';
// Usaba `AssetManager` como global, de cuando el motor eran scripts sueltos.
import { AssetManager } from '../../soma/AssetManager.js';

/**
 * ═══════════════════════════════════════════════════════════════
 *  ALISA V4 — RoboticArmSystem
 *  Reusable Procedural Robotic Arm with Analytic 2-Bone IK
 * ═══════════════════════════════════════════════════════════════
 * 
 *  Creates high-fidelity industrial robot arms with:
 *    • Full Y-axis turret rotation (base)
 *    • Shoulder, Elbow, Wrist articulation in the sagittal plane
 *    • Pneumatic injector / end-effector with glow
 *    • Analytic IK solver that works in the arm's local frame
 *    • Smooth eased animation with configurable speed
 *    • Visual variants (pristine, rusted, military, medical)
 * 
 *  Joint Hierarchy:
 *    root (Group) — world positioned
 *      └─ base (Group) — Y rotation (turret)
 *           └─ shoulder (Group) — Z rotation (pitch up/down)
 *                └─ [upper arm geometry]
 *                └─ elbow (Group) at y=L1 — Z rotation
 *                     └─ [forearm geometry]
 *                     └─ wrist (Group) at y=L2 — Z rotation
 *                          └─ [end effector geometry]
 *                          └─ tip — the IK target point
 * 
 *  Usage:
 *    const factory = new RoboticArmFactory(THREE);
 *    const arm = factory.create({ 
 *        position: new THREE.Vector3(-5, 0, 0),
 *        variant: 'pristine',
 *        scale: 1.0
 *    });
 *    scene.add(arm.root);
 *    
 *    // Reach toward a target
 *    const solution = arm.solveIK(worldTarget);
 *    await arm.animateTo(solution, 25, 22);
 *    
 *    // Reset to idle pose
 *    arm.resetPose();
 */

// ─── Easing helper ───
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// S-Curve (Quintic) limits Jerk (derivative of acceleration) for fluid industrial motion
function easeSCurve(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// ─── Clamp helper ───
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// ─── Wait helper ───
function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════════
//  MATERIAL PALETTES
// ═══════════════════════════════════════════════════════════════

const PALETTES = {
    pristine: {
        darkMetal:  { color: 0x1a1a24, metalness: 0.9, roughness: 0.2 },
        steel:      { color: 0x667788, metalness: 0.9, roughness: 0.4 },
        hazard:     { color: 0xffaa00, metalness: 0.6, roughness: 0.5 },
        glow:       { color: 0x00ffff, emissive: 0x0088cc, emissiveIntensity: 2 },
        rod:        { color: 0xffffff, emissive: 0xffaaaa, emissiveIntensity: 4 },
        cable:      { color: 0x222233, roughness: 0.6 },
        piston:     { color: 0x99aabb, metalness: 0.95, roughness: 0.1 },
    },
    rusted: {
        darkMetal:  { color: 0x884422, metalness: 0.3, roughness: 0.9 },
        steel:      { color: 0x775544, metalness: 0.3, roughness: 0.8 },
        hazard:     { color: 0xcc8800, metalness: 0.4, roughness: 0.7 },
        glow:       { color: 0x00ffff, emissive: 0x006699, emissiveIntensity: 1.5 },
        rod:        { color: 0xeeeeee, emissive: 0xff8866, emissiveIntensity: 3 },
        cable:      { color: 0x332222, roughness: 0.7 },
        piston:     { color: 0x887766, metalness: 0.7, roughness: 0.3 },
    },
    military: {
        darkMetal:  { color: 0x2a2a20, metalness: 0.7, roughness: 0.5 },
        steel:      { color: 0x556644, metalness: 0.6, roughness: 0.5 },
        hazard:     { color: 0xff3300, metalness: 0.5, roughness: 0.4 },
        glow:       { color: 0xff0044, emissive: 0xcc0033, emissiveIntensity: 2 },
        rod:        { color: 0xffffff, emissive: 0xff4444, emissiveIntensity: 4 },
        cable:      { color: 0x222211, roughness: 0.6 },
        piston:     { color: 0x778877, metalness: 0.85, roughness: 0.15 },
    },
    medical: {
        darkMetal:  { color: 0xdddddd, metalness: 0.3, roughness: 0.2 },
        steel:      { color: 0xeeeeee, metalness: 0.4, roughness: 0.3 },
        hazard:     { color: 0x00cc66, metalness: 0.5, roughness: 0.4 },
        glow:       { color: 0x44ffaa, emissive: 0x22cc88, emissiveIntensity: 2 },
        rod:        { color: 0xffffff, emissive: 0x88ffbb, emissiveIntensity: 3 },
        cable:      { color: 0xbbbbcc, roughness: 0.4 },
        piston:     { color: 0xccccdd, metalness: 0.9, roughness: 0.1 },
    }
};

// ═══════════════════════════════════════════════════════════════
//  ROBOTIC ARM CLASS
// ═══════════════════════════════════════════════════════════════

export class RoboticArm {
    /**
     * @param {Object} config
     * @param {THREE.Vector3} config.position     — World position
     * @param {number}        config.facingAngle  — Initial Y rotation (radians), 0 = +Z
     * @param {string}        config.variant      — 'pristine'|'rusted'|'military'|'medical'
     * @param {number}        config.scale        — Uniform scale multiplier (default 1)
     * @param {number}        config.upperArmLen  — Upper arm length (default 3.5)  
     * @param {number}        config.forearmLen   — Forearm length (default 3.0)
     * @param {number}        config.baseHeight   — Height of shoulder pivot (default 1.4)
     * @param {number}        config.glowColor    — PointLight color for needle (default 0x00ffff)
     * @param {() => number}  [config.rng]        — Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to make the servo-whine pitch reproducible.
     */
    constructor(config = {}) {
        const {
            position = new THREE.Vector3(0, 0, 0),
            facingAngle = 0,
            variant = 'pristine',
            scale = 1.0,
            upperArmLen = 3.5,
            forearmLen = 3.0,
            baseHeight = 1.4,
            glowColor = 0x00ffff,
        } = config;

        // Semilla inyectable. Sólo se usa para el tono del zumbido del servo,
        // pero una sola llamada de azar sin sembrar ya basta para que este
        // sistema no cuente como sembrado. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || Math.random;

        this.L1 = upperArmLen;
        this.L2 = forearmLen;
        this.baseHeight = baseHeight;
        this.totalReach = this.L1 + this.L2;
        this.glowColor = glowColor;

        // Idle pose angles
        this.IDLE = {
            shoulderX: -Math.PI * 0.15,
            elbowX:    Math.PI * 0.6,
            wristX:   -Math.PI * 0.4,
            baseY:     0,
        };

        // Build geometry
        const palette = PALETTES[variant] || PALETTES.pristine;
        this._buildGeometry(palette);

        // Position and orient the whole arm in world space
        this.root.position.copy(position);
        this.root.rotation.y = facingAngle;
        this.root.scale.setScalar(scale);

        // Apply idle pose
        this.resetPose();
    }

    // ─── GEOMETRY BUILDER ───────────────────────────────────────
    _buildGeometry(p) {
        this.root = new THREE.Group();
        this.root.name = 'RoboticArm';

        const mat = (cfg) => new THREE.MeshStandardMaterial(cfg);
        const mDark   = mat(p.darkMetal);
        const mSteel  = mat(p.steel);
        const mHazard = mat(p.hazard);
        const mGlow   = mat(p.glow);
        const mRod    = mat(p.rod);
        const mCable  = mat(p.cable);
        const mPiston = mat(p.piston);

        // ── 1. Base Pedestal ──
        const pedestal = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, this.baseHeight, 1.8), mDark
        );
        pedestal.position.y = this.baseHeight / 2;
        pedestal.castShadow = true;
        this.root.add(pedestal);

        // Hazard ring on top of pedestal
        const baseRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.0, 0.08, 8, 24), mHazard
        );
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = this.baseHeight;
        this.root.add(baseRing);

        // Warning beacon light
        this.warningLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.1 })
        );
        this.warningLight.position.set(0.7, this.baseHeight + 0.2, 0.7);
        this.root.add(this.warningLight);

        // ── 2. Turret Base (Y-rotation) ──
        this.base = new THREE.Group();
        this.base.position.y = this.baseHeight;
        this.root.add(this.base);

        const turretCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.7, 0.9, 0.6, 16), mSteel
        );
        turretCyl.position.y = 0.3;
        turretCyl.castShadow = true;
        this.base.add(turretCyl);

        // ── 3. Shoulder (Z-rotation) ──
        this.shoulder = new THREE.Group();
        this.shoulder.position.y = 0.6;
        this.base.add(this.shoulder);

        // Shoulder pivot cylinder
        const shoulderPivot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.7, 0.7, 1.6, 16), mSteel
        );
        shoulderPivot.rotation.x = Math.PI / 2;
        this.shoulder.add(shoulderPivot);

        // Upper arm pillars (dual-rail design)
        for (const xOff of [-0.45, 0.45]) {
            const pillar = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, this.L1, 0.55), mHazard
            );
            pillar.position.set(xOff, this.L1 / 2, 0);
            pillar.castShadow = true;
            this.shoulder.add(pillar);
        }

        // Hydraulic piston (shoulder → elbow)
        const piston1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, this.L1 * 0.9, 8), mPiston
        );
        piston1.position.set(0, this.L1 * 0.45, 0.4);
        this.shoulder.add(piston1);

        const sleeve1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, this.L1 * 0.4, 8), mDark
        );
        sleeve1.position.set(0, this.L1 * 0.7, 0.4);
        this.shoulder.add(sleeve1);

        // Cable bundle
        const cable1 = new THREE.Mesh(new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.3, 0, 0),
                new THREE.Vector3(0.5, this.L1 * 0.4, 0.3),
                new THREE.Vector3(0.3, this.L1 * 0.85, 0.1)
            ]), 12, 0.04, 6, false
        ), mCable);
        this.shoulder.add(cable1);

        // ── 4. Elbow (Z-rotation) ──
        this.elbow = new THREE.Group();
        this.elbow.position.y = this.L1;
        this.shoulder.add(this.elbow);

        const elbowCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16), mDark
        );
        elbowCyl.rotation.x = Math.PI / 2;
        elbowCyl.castShadow = true;
        this.elbow.add(elbowCyl);

        // Elbow detail ring
        const elbowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.55, 0.05, 8, 20), mHazard
        );
        elbowRing.rotation.y = Math.PI / 2;
        this.elbow.add(elbowRing);

        // Forearm casing
        const forearmCasing = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, this.L2 * 0.85, 0.55), mDark
        );
        forearmCasing.position.y = this.L2 * 0.42;
        forearmCasing.castShadow = true;
        this.elbow.add(forearmCasing);

        // Hydraulic piston (elbow → wrist)
        const piston2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, this.L2 * 0.8, 8), mPiston
        );
        piston2.position.set(0, this.L2 * 0.4, -0.4);
        this.elbow.add(piston2);

        const sleeve2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, this.L2 * 0.35, 8), mDark
        );
        sleeve2.position.set(0, this.L2 * 0.65, -0.4);
        this.elbow.add(sleeve2);

        // Cable bundle 2
        const cable2 = new THREE.Mesh(new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.3, 0, 0),
                new THREE.Vector3(-0.4, this.L2 * 0.4, -0.2),
                new THREE.Vector3(-0.3, this.L2 * 0.85, 0)
            ]), 12, 0.035, 6, false
        ), mCable);
        this.elbow.add(cable2);

        // ── 5. Wrist (Z-rotation) ──
        this.wrist = new THREE.Group();
        this.wrist.position.y = this.L2;
        this.elbow.add(this.wrist);

        const wristCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.45, 0.9, 16), mSteel
        );
        wristCyl.rotation.x = Math.PI / 2;
        this.wrist.add(wristCyl);

        // Nozzle housing
        const nozzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.22, 1.2, 12), mDark
        );
        nozzle.position.y = 0.6;
        this.wrist.add(nozzle);

        // Nozzle glow ring
        const nozzleRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.22, 0.03, 8, 16), mGlow
        );
        nozzleRing.rotation.x = Math.PI / 2;
        nozzleRing.position.y = 1.2;
        this.wrist.add(nozzleRing);

        // ── 6. End Effector (Injector Rod) ──
        this.effectorGroup = new THREE.Group();
        this.effectorGroup.position.y = 1.2;
        this.wrist.add(this.effectorGroup);

        this.injectorRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), mRod
        );
        this.injectorRod.position.y = -0.5; // retracted
        this.injectorRod.castShadow = true;
        this.effectorGroup.add(this.injectorRod);

        // Needle glow light
        this.needleGlow = new THREE.PointLight(this.glowColor, 0, 10);
        this.needleGlow.position.set(0, 0, 0);
        this.effectorGroup.add(this.needleGlow);
    }

    // ═══════════════════════════════════════════════════════════
    //  IK SOLVER
    // ═══════════════════════════════════════════════════════════

    /**
     * Solve IK for the arm to reach a world-space target.
     * Returns an object with { shoulderZ, elbowZ, wristZ, baseY }.
     * 
     * @param {THREE.Vector3} worldTarget — The point to reach in world space
     * @param {number} extend — 0..1 how much to extend (1 = full reach, 0.9 = slight undershoot)
     * @returns {{ shoulderZ: number, elbowZ: number, wristZ: number, baseY: number }}
     */
    solveIK(worldTarget, extend = 1.0) {
        // 1. Transform target into the arm's root local space
        const invMatrix = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
        const localTarget = worldTarget.clone().applyMatrix4(invMatrix);

        // 2. Compute base Y rotation: turret aims its +Z axis at the target
        // For standard GLB models, the arm hinges swing around the local X axis (pitch),
        // meaning they swing in the Y-Z plane. So we align the target to the +Z axis.
        const baseY = Math.atan2(localTarget.x, localTarget.z);

        // 3. Project target into the arm's sagittal plane
        //    Shoulder pivot is at baseHeight + 0.6 (turret cylinder top)
        const shoulderPivotY = this.baseHeight + 0.6;
        const horizDist = Math.sqrt(localTarget.x * localTarget.x + localTarget.z * localTarget.z);
        const vertDist  = localTarget.y - shoulderPivotY;

        // 4. Two-bone IK in this plane
        //    The effective chain: L1 (upper arm) + L2 (forearm)
        //    The wrist+nozzle+effector adds ~1.2 units beyond the wrist joint,
        //    but we solve IK for the wrist position and let the wrist angle 
        //    point the effector toward the target.
        const L1 = this.L1;
        const L2 = this.L2;
        
        // Distance from shoulder pivot to target
        const rawD = Math.sqrt(horizDist * horizDist + vertDist * vertDist);
        // extend < 1.0 means "reach closer" (multiply to shrink effective distance)
        let D = rawD * extend;
        D = clamp(D, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);

        const cosElbow = (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2);
        
        const alpha = Math.atan2(vertDist, horizDist);
        const cosBeta = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
        const beta = Math.acos(clamp(cosBeta, -1, 1));

        // The geometry is built pointing UP (+Y axis) and hinges on the local X axis.
        // A positive rotation around X bends +Y towards +Z.
        // alpha=0 means target is horizontal (+Z axis).
        // To point at +Z, we need PI/2 rotation around X.
        
        // MANTIS MODE: Using (alpha - beta) forces the elbow to stay HIGH instead of dropping low.
        const shoulderAngle = Math.PI / 2 - (alpha - beta);

        // Sine the elbow is now "high", we need to bend the forearm downwards aggressively.
        // We negate the elbow angle so it bends "inwards" towards the body.
        const elbowAngle = - (Math.PI - Math.acos(clamp(cosElbow, -1, 1)));

        // Wrist compensates so the nozzle/effector points toward the target
        const totalDeflection = shoulderAngle + elbowAngle;
        const wristAngle = (Math.PI / 2 - alpha) - totalDeflection;

        return {
            shoulderX: shoulderAngle,
            elbowX:    elbowAngle,
            wristX:    clamp(wristAngle, -Math.PI * 0.8, Math.PI * 0.8),
            baseY:     baseY,
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  ANIMATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Smoothly animate from current pose to a target IK solution.
     * @param {{ shoulderZ, elbowZ, wristZ, baseY }} solution
     * @param {number} steps — frame count (default 25)
     * @param {number} stepMs — milliseconds per frame (default 22)
     */
    async movePTP(solution, steps = 25, stepMs = 22) {
        if (window.testRigMode !== undefined && window.testRigMode !== 'auto') return;

        const s0 = this.shoulder.rotation.x;
        const e0 = this.elbow.rotation.x;
        const w0 = this.wrist.rotation.x;
        const b0 = this.base.rotation.y;

        const baseYDiff = Math.atan2(Math.sin(solution.baseY - b0), Math.cos(solution.baseY - b0));

        // Play procedural servo whine
        const totalMovement = Math.abs(solution.shoulderX - s0) + Math.abs(solution.elbowX - e0) + Math.abs(baseYDiff);
        if (totalMovement > 0.05) this.playServoWhine((steps * stepMs) / 1000, totalMovement);

        for (let i = 0; i <= steps; i++) {
            if (window.testRigMode !== undefined && window.testRigMode !== 'auto') return;
            const t = easeSCurve(i / steps);
            this.shoulder.rotation.x = s0 + (solution.shoulderX - s0) * t;
            this.elbow.rotation.x    = e0 + (solution.elbowX - e0) * t;
            this.wrist.rotation.x    = w0 + (solution.wristX - w0) * t;
            this.base.rotation.y     = b0 + baseYDiff * t;
            await wait(stepMs);
        }
    }

    playServoWhine(durationSec, movementAmount) {
        if (!this.audioCtx) {
            const AContext = window.AudioContext || window.webkitAudioContext;
            if (AContext) this.audioCtx = new AContext();
            else return;
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        
        const baseFreq = 150 + this.rng() * 50;
        const peakFreq = baseFreq + (movementAmount * 200);
        
        osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(peakFreq, this.audioCtx.currentTime + durationSec * 0.5);
        osc.frequency.linearRampToValueAtTime(baseFreq, this.audioCtx.currentTime + durationSec);
        
        const volume = Math.min(0.08, movementAmount * 0.05);
        gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.audioCtx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + durationSec);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + durationSec);
    }

    /**
     * Animate to idle pose.
     * @param {number} steps
     * @param {number} stepMs
     */
    async animateToIdle(steps = 18, stepMs = 18) {
        await this.movePTP(this.IDLE, steps, stepMs);
    }

    async moveLIN(worldTarget, targetScale = 0.95, steps = 25, stepMs = 22) {
        if (window.testRigMode !== undefined && window.testRigMode !== 'auto') return;
        this.root.updateWorldMatrix(true, false);
        const startPos = this.getTipWorldPosition();
        let prevBaseY = this.base.rotation.y;

        const dist = startPos.distanceTo(worldTarget);
        if (dist > 0.5) this.playServoWhine((steps * stepMs) / 1000, dist * 0.1);

        for (let i = 0; i <= steps; i++) {
            if (window.testRigMode !== undefined && window.testRigMode !== 'auto') return;
            const t = easeSCurve(i / steps);
            const currentTarget = new THREE.Vector3().lerpVectors(startPos, worldTarget, t);
            const sol = this.solveIK(currentTarget, targetScale);
            if (sol) {
                // Velocity feedforward: detect singularity spikes and slow down
                const maxDelta = Math.max(
                    Math.abs(sol.shoulderX - this.shoulder.rotation.x),
                    Math.abs(sol.elbowX - this.elbow.rotation.x)
                );
                if (maxDelta > 0.3 && i > 0 && i < steps) {
                    await wait(stepMs * 1.5); // Extra dwell near singularities
                }

                this.shoulder.rotation.x = sol.shoulderX;
                this.elbow.rotation.x    = sol.elbowX;
                this.wrist.rotation.x    = sol.wristX;
                // Shortest-path base rotation
                const baseYDiff = Math.atan2(Math.sin(sol.baseY - prevBaseY), Math.cos(sol.baseY - prevBaseY));
                this.base.rotation.y = prevBaseY + baseYDiff;
                prevBaseY = this.base.rotation.y;
            }
            await wait(stepMs);
        }
        return this.solveIK(worldTarget, targetScale);
    }

    /**
     * Reach toward a world target and return when in position.
     * @param {THREE.Vector3} worldTarget
     * @param {number} extend — 0..1
     * @param {number} steps
     * @param {number} stepMs
     */
    async reachToward(worldTarget, extend = 0.95, steps = 25, stepMs = 22) {
        this.root.updateWorldMatrix(true, false);
        const solution = this.solveIK(worldTarget, extend);
        await this.movePTP(solution, steps, stepMs);
        return solution;
    }

    /**
     * Instantly snap to idle pose (no animation).
     */
    resetPose() {
        this.shoulder.rotation.x = this.IDLE.shoulderX;
        this.elbow.rotation.x    = this.IDLE.elbowX;
        this.wrist.rotation.x    = this.IDLE.wristX;
        this.base.rotation.y     = this.IDLE.baseY;
        if (this.injectorRod) this.injectorRod.position.y = -0.5;
        if (this.needleGlow) this.needleGlow.intensity = 0;
    }

    /**
     * Get the tip (end-effector) world position.
     * Useful for spawning particles or checking contact.
     * @returns {THREE.Vector3}
     */
    getTipWorldPosition() {
        this.effectorGroup.updateWorldMatrix(true, false);
        // Return the actual needle tip, not the effectorGroup origin.
        // The rod extends along the effectorGroup's local +Y by (rod.y + half rod height).
        const rodExtension = this.injectorRod ? this.injectorRod.position.y + 1.1 : 0;
        const tipLocal = new THREE.Vector3(0, rodExtension, 0);
        return this.effectorGroup.localToWorld(tipLocal);
    }

    /**
     * Apply subtle idle breathing animation (call in render loop when not busy).
     * @param {number} time — elapsed seconds from clock
     * @param {number} amplitude — sway amount (default 0.02)
     */
    breathe(time, amplitude = 0.02) {
        // Delta-based: adds breathing ON TOP of current pose instead of snapping to IDLE
        this.shoulder.rotation.x += Math.sin(time * 0.8) * amplitude * 0.1;
    }

    /**
     * Dispose all geometry and materials.
     */
    dispose() {
        this.root.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  FACTORY (convenience for creating multiple arms)
// ═══════════════════════════════════════════════════════════════

export class RoboticArmFactory {
    /**
     * Quickly create an arm and add it to a scene.
     * @param {THREE.Scene} scene
     * @param {Object} config — Same as RoboticArm constructor config
     * @returns {RoboticArm}
     */
    static create(scene, config = {}) {
        const arm = new RoboticArm(config);
        scene.add(arm.root);
        return arm;
    }

    static async createFromGLB(scene, url, config = {}) {
        // Load the GLTF
        const AssetManagerModule = await import('../../soma/AssetManager.js');
        const modelUrl = url.startsWith('http') || url.startsWith('.') || url.startsWith('/') ? url : '../props/fase1_measured/' + url;
        const gltf = await AssetManagerModule.AssetManager.loadModelAsync(modelUrl);
        
        // Setup similar to RoboticArm constructor
        const arm = new RoboticArm(config);
        
        // Remove the procedural root children
        while(arm.root.children.length > 0) {
            arm.root.remove(arm.root.children[0]);
        }
        
        // Attach GLTF to root
        arm.root.add(gltf);
        
        // Map natively forged nodes
        // Base
        const nodeBase = gltf.getObjectByName('base');
        if (nodeBase) {
            arm.base = new THREE.Group();
            nodeBase.parent.add(arm.base);
            arm.base.position.copy(nodeBase.position);
            arm.base.add(nodeBase);
            nodeBase.position.set(0,0,0);
        }

        const nodeShoulder = gltf.getObjectByName('shoulder');
        if (nodeShoulder) arm.shoulder = nodeShoulder;
        
        const nodeElbow = gltf.getObjectByName('elbow');
        if (nodeElbow) arm.elbow = nodeElbow;
        
        const nodeWrist = gltf.getObjectByName('wrist');
        if (nodeWrist) arm.wrist = nodeWrist;

        const nodeEffector = gltf.getObjectByName('effector');
        if (nodeEffector) {
            arm.effectorGroup = new THREE.Group();
            nodeEffector.parent.add(arm.effectorGroup);
            arm.effectorGroup.position.copy(nodeEffector.position);
            arm.effectorGroup.add(nodeEffector);
            nodeEffector.position.set(0,0,0);

            arm.injectorRod = nodeEffector;
            arm.needleGlow = new THREE.PointLight(config.glowColor || 0x00ffff, 0, 10);
            arm.effectorGroup.add(arm.needleGlow);
        }
        
        // Optional warning light
        arm.warningLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.1 })
        );
        arm.warningLight.position.set(0.7, arm.baseHeight + 0.2, 0.7);
        arm.root.add(arm.warningLight);

        // Apply idle pose
        arm.resetPose();
        scene.add(arm.root);
        return arm;
    }

    /**
     * Create a mirrored pair of arms (left and right of a belt/table).
     * @param {THREE.Scene} scene
     * @param {Object} config — Base config. Position and facingAngle will be overridden.
     * @param {number} spacing — Distance from center (default 5.5)
     * @returns {{ left: RoboticArm, right: RoboticArm }}
     */
    static createPair(scene, config = {}, spacing = 5.5) {
        const leftConfig = {
            ...config,
            position: new THREE.Vector3(-spacing, 0, config.zOffset || 0),
            facingAngle: Math.PI / 2,  // face right (+X)
            variant: config.leftVariant || config.variant || 'pristine',
        };
        const rightConfig = {
            ...config,
            position: new THREE.Vector3(spacing, 0, config.zOffset || 0),
            facingAngle: -Math.PI / 2, // face left (-X)
            variant: config.rightVariant || config.variant || 'rusted',
        };

        return {
            left:  this.create(scene, leftConfig),
            right: this.create(scene, rightConfig),
        };
    }
    
    static async createPairFromGLB(scene, url, config = {}, spacing = 5.5) {
        const leftConfig = {
            ...config,
            position: new THREE.Vector3(-spacing, 0, config.zOffset || 0),
            facingAngle: Math.PI / 2,  // face right (+X)
            variant: config.leftVariant || config.variant || 'pristine',
        };
        const rightConfig = {
            ...config,
            position: new THREE.Vector3(spacing, 0, config.zOffset || 0),
            facingAngle: -Math.PI / 2, // face left (-X)
            variant: config.rightVariant || config.variant || 'rusted',
        };

        const leftArm = await this.createFromGLB(scene, url, leftConfig);
        const rightArm = await this.createFromGLB(scene, url, rightConfig);
        return { left: leftArm, right: rightArm };
    }
}
