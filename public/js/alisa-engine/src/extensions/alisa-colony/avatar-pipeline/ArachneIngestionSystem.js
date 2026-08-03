import * as THREE from 'three';
import { ModelUtils } from '../../../world/utils/ModelUtils.js';
import { AnimationUtils } from '../../../soma/utils/AnimationUtils.js';
import { BaseSimulationSystem } from '../../avatar-pipeline/BaseSimulationSystem.js';

export class ArachneIngestionSystem extends BaseSimulationSystem {
    constructor(engine, environment, physics, uiConfig) {
        super(engine, environment, uiConfig);
        this.physics = physics;
        
        this.ANIM = {
            IDLE: 'HumanArmature|Spider_Idle',
            WALK: 'HumanArmature|Spider_Walk',
            ATTACK: 'HumanArmature|Spider_Attack',
            JUMP: 'HumanArmature|Spider_Jump',
            DEATH: 'HumanArmature|Spider_Death'
        };

        this.spider = null;
        this.spiderHome = new THREE.Vector3(0, 0, -10);
        this.spiderTarget = this.spiderHome.clone();
        
        this.dropQueue = [];
        this.brain = new ArachneBrain(this);
    }

    async initialize() {
        const gltf = await ModelUtils.loadGLB('../props/models/Spider.glb');
        if (!gltf) { this.log("ERROR: Spider.glb missing!", true); return; }

        const spiderScene = gltf.scene;

        spiderScene.traverse(c => {
            if (c.isMesh) {
                c.material = new THREE.MeshStandardMaterial({
                    color: 0x2a0044, metalness: 0.4, roughness: 0.5,
                    emissive: 0x330055, emissiveIntensity: 0.5
                });
                c.castShadow = true;
            }
        });

        ModelUtils.fitToBox(spiderScene, 8);
        this.initMixer(spiderScene, gltf.animations);

        const wrapper = new THREE.Group();
        wrapper.add(spiderScene);
        wrapper.position.copy(this.spiderHome);
        wrapper.name = 'SpiderWrapper';
        this.engine.scene.add(wrapper);
        this.spider = wrapper;

        const sp = new THREE.SpotLight(0xeeddff, 300, 50, Math.PI / 4, 0.5, 1);
        sp.position.set(0, 25, -8);
        sp.target = this.spider;
        this.engine.scene.add(sp);
        this.engine.scene.add(sp.target);

        this.playAnim(this.ANIM.IDLE, true);
        this.log("Arachne awakens.", true);
        
        setTimeout(() => this.tubeLoop(), 3000);
    }

    tick(dt, elapsed) {
        super.tick(dt, elapsed);
        
        if (this.spider) {
            this.spider.position.lerp(this.spiderTarget, dt * 1.8);
            const dir = this.spiderTarget.clone().sub(this.spider.position);
            if (dir.lengthSq() > 0.01) {
                const a = Math.atan2(dir.x, dir.z);
                this.spider.rotation.y += (a - this.spider.rotation.y) * dt * 3;
            }
            this.env.spiderGlow.position.copy(this.spider.position);
            this.env.spiderGlow.position.y = 0.5;
        }

        this.brain.tick(dt, elapsed);
    }

    setTube(t, c = '#00ffcc') {
        if (this.ui.tubeElement) {
            this.ui.tubeElement.textContent = t;
            this.ui.tubeElement.style.color = c;
        }
    }

    async dispenseItem(filename) {
        this.setTube('DISPENSING', '#ff6600');
        this.env.tubeLight.intensity = 250;
        this.log(`Dispensing: ${filename}`);

        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * (this.physics.webRadius * 0.3);
        const lx = Math.cos(angle) * dist;
        const lz = Math.sin(angle) * dist;
        const landPos = new THREE.Vector3(lx, 0.5, lz);

        const propGltf = await ModelUtils.loadGLB(`../props/models/${filename}`);
        let prop = null;
        if (propGltf) {
            prop = propGltf.scene;
            ModelUtils.fitToBox(prop, 1.0); // PROP_SIZE = 1.0
            const pw = new THREE.Group();
            pw.add(prop);
            pw.position.set(lx, 35, lz);
            pw.name = 'Prop_' + filename;
            this.engine.scene.add(pw);
            prop = pw;
        } else { 
            this.setTube('STANDBY', '#00ffcc'); 
            return; 
        }

        await AnimationUtils.animateFall(prop, landPos, 1.8);
        this.env.tubeLight.intensity = 0;
        this.setTube('IMPACT', '#ffcc00');
        this.physics.impulse(landPos, 8.0);
        this.log("Impact — web vibrating.");

        this.brain.overrideHunt(prop, landPos, filename);
        setTimeout(() => this.setTube('STANDBY', '#00ffcc'), 2000);
    }

    async tubeLoop() {
        this.log("Environment logic initialized (Tube Loop Active).");
        const wait = ms => new Promise(r => setTimeout(r, ms));
        while (true) {
            if (this.dropQueue.length === 0) {
                try {
                    const res = await fetch("http://127.0.0.1:8741/arachne/queue?limit=5");
                    if (res.ok) {
                        const data = await res.json();
                        this.dropQueue = data.pending || [];
                    }
                } catch (e) { }
            }

            if (this.dropQueue.length > 0) {
                if (['IDLE', 'PATROL_MOVE', 'PATROL_INSPECT', 'RETREAT_MOVE'].includes(this.brain.state)) {
                    const filename = this.dropQueue.shift();
                    await this.dispenseItem(filename);
                }
            }

            await wait(4000 + Math.random() * 8000);
        }
    }
}

class ArachneBrain {
    constructor(system) {
        this.sys = system;
        this.state = 'IDLE';
        this.timer = 0;
        this.preyCache = null;
        this.logBrain('STATE: BOOTING', '#555555');
    }

    logBrain(msg, color = '#ffaa00') {
        if (this.sys.ui.brainElement && this.sys.ui.brainElement.textContent !== msg) {
            this.sys.ui.brainElement.textContent = msg;
            this.sys.ui.brainElement.style.color = color;
        }
    }

    overrideHunt(prop, pos, filename) {
        if (['WRAP', 'STORE'].includes(this.state)) return false;
        this.state = 'HUNT_MOVE';
        this.preyCache = { prop, pos, filename };
        this.sys.env.spiderGlow.intensity = 50;

        const offset = new THREE.Vector3(pos.x, 0, pos.z).normalize().multiplyScalar(2.5);
        this.sys.spiderTarget.set(pos.x - offset.x, 0, pos.z - offset.z);

        this.sys.playAnim(this.sys.ANIM.WALK, true, 2.0); 
        this.logBrain('OVERRIDE: INITIATING HUNT', '#ff3333');
        return true;
    }

    tick(dt, elapsed) {
        if (!this.sys.spider) return;
        switch (this.state) {
            case 'IDLE':
                this.logBrain('STATE: IDLE', '#ffaa00');
                if (this.timer < elapsed) {
                    if (Math.random() < 0.2) {
                        this.state = 'PATROL_MOVE';
                        const rR = Math.random() * (this.sys.physics.webRadius * 0.6);
                        const rA = Math.random() * Math.PI * 2;
                        this.sys.spiderTarget.set(Math.cos(rA) * rR, 0, Math.sin(rA) * rR);
                        this.sys.playAnim(this.sys.ANIM.WALK, true, 0.6);
                        this.logBrain('STATE: PATROL (Navigating)', '#00ffaa');
                    } else {
                        this.timer = elapsed + 2 + Math.random() * 4;
                    }
                }
                break;
            case 'PATROL_MOVE':
                this.logBrain('STATE: PATROL (Navigating)', '#00ffaa');
                if (this.sys.spider.position.distanceTo(this.sys.spiderTarget) < 1.0) {
                    this.state = 'PATROL_INSPECT';
                    this.timer = elapsed + 3;
                    this.sys.playAnim(this.sys.ANIM.ATTACK, false, 0.5); 
                    this.logBrain('STATE: PATROL (Inspecting Web)', '#00ccff');
                }
                break;
            case 'PATROL_INSPECT':
                if (elapsed > this.timer) {
                    this.state = 'RETREAT_MOVE';
                    this.sys.spiderTarget.copy(this.sys.spiderHome);
                    this.sys.playAnim(this.sys.ANIM.WALK, true, 0.6);
                }
                break;
            case 'RETREAT_MOVE':
                this.logBrain('STATE: RETREATING', '#aaaaff');
                if (this.sys.spider.position.distanceTo(this.sys.spiderTarget) < 1.0) {
                    this.state = 'IDLE';
                    this.sys.playAnim(this.sys.ANIM.IDLE, true);
                    this.timer = elapsed + 4;
                    this.sys.env.spiderGlow.intensity = 0;
                }
                break;
            case 'HUNT_MOVE':
                if (this.sys.spider.position.distanceTo(this.sys.spiderTarget) < 1.5) {
                    this.state = 'WRAP';
                    this.logBrain('STATE: WRAP_AND_SCAN', '#ffcc00');
                    this.doWrapAsync();
                }
                break;
        }
    }

    async doWrapAsync() {
        const { prop, pos, filename } = this.preyCache;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        
        this.sys.log("Arachne grabs the prey!");
        this.sys.playAnim(this.sys.ANIM.ATTACK, false, 1.0);
        await wait(750);

        const grabOffset = new THREE.Vector3(0, 2, 2);
        this.sys.engine.scene.remove(prop);
        this.sys.spider.add(prop);
        prop.position.copy(grabOffset);

        this.sys.playAnim(this.sys.ANIM.IDLE, true, 0.5);
        await AnimationUtils.animateSpin(prop, 2.5, 1.5);

        let tier = "Unknown", dims = "—";
        try {
            this.sys.log(`Ollama Neural Scan: ${filename}...`);
            this.logBrain('STATE: SEMANTIC_SCAN', '#00ffcc');
            const r = await fetch(`http://127.0.0.1:8741/arachne/process/${encodeURIComponent(filename)}`, { method: "POST" });
            if (r.ok) {
                const m = await r.json();
                if (m.target_tier) { tier = m.target_tier; dims = m.deduced_size_meters ? `~${m.deduced_size_meters}m` : "—"; }
            }
        } catch (e) { }
        this.sys.log(`Katamari: [${tier}]`, true);
        if (this.sys.ui.showTier) this.sys.ui.showTier(tier, dims);

        this.logBrain('STATE: COCOON_BUILD', '#ffaa00');
        const worldPos = new THREE.Vector3();
        prop.getWorldPosition(worldPos);
        this.sys.spider.remove(prop);
        this.sys.engine.scene.remove(prop);

        const cocoon = this.createCocoon(worldPos);
        this.sys.engine.scene.add(cocoon);
        await AnimationUtils.animateSpin(cocoon, 2.0, 2.0);

        this.state = 'STORE';
        this.logBrain('STATE: HAUL_AWAY', '#44aaff');
        const threadAnchor = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
        const thread = this.createSilkThread(threadAnchor, cocoon.position);
        const finalY = -8;

        await new Promise(res => {
            const t0 = Date.now();
            const dur = 3000;
            const startY = cocoon.position.y;
            const iv = setInterval(() => {
                const t = Math.min((Date.now() - t0) / dur, 1);
                const eased = 1 - Math.pow(1 - t, 2);
                cocoon.position.y = startY + (finalY - startY) * eased;
                cocoon.rotation.y += 0.02;
                cocoon.position.x = threadAnchor.x + Math.sin(t * 8) * 0.3 * (1 - t);
                thread.update(cocoon.position);
                if (t >= 1) { clearInterval(iv); res(); }
            }, 16);
        });

        this.sys.log(`[COCOON] ${filename} → Queue Processed`, true);
        await wait(1500);
        thread.remove();
        this.sys.engine.scene.remove(cocoon);

        this.state = 'RETREAT_MOVE';
        this.sys.spiderTarget.copy(this.sys.spiderHome);
        this.sys.playAnim(this.sys.ANIM.WALK, true, 0.8);
        this.sys.env.spiderGlow.intensity = 0;
    }

    createSilkThread(fromPos, toPos) {
        const mat = new THREE.LineBasicMaterial({ color: 0xddddff, transparent: true, opacity: 0.7 });
        const geo = new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
        const line = new THREE.Line(geo, mat);
        this.sys.engine.scene.add(line);
        return {
            line, geo, update: (newTo) => {
                const p = geo.attributes.position.array;
                p[3] = newTo.x; p[4] = newTo.y; p[5] = newTo.z;
                geo.attributes.position.needsUpdate = true;
            }, remove: () => { this.sys.engine.scene.remove(line); }
        };
    }

    createCocoon(pos) {
        const g = new THREE.Group();
        g.position.copy(pos);
        const bodyGeo = new THREE.SphereGeometry(0.4, 12, 12);
        bodyGeo.scale(1, 1.3, 1); 
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: 0xccccdd, metalness: 0, roughness: 0.9,
            transparent: true, opacity: 0.85
        }));
        g.add(body);
        const mat = new THREE.LineBasicMaterial({ color: 0xddddff, transparent: true, opacity: 0.5 });
        for (let i = 0; i < 10; i++) {
            const pts = [];
            for (let j = 0; j < 5; j++) pts.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.7
            ));
            g.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts, true).getPoints(16)), mat
            ));
        }
        g.add(new THREE.PointLight(0xaaaaff, 5, 3));
        return g;
    }
}
