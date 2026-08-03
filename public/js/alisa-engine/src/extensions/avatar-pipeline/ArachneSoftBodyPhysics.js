import * as THREE from 'three';

export class ArachneSoftBodyPhysics {
    constructor(scene, webRadius = 22, webRadials = 32, webRings = 18, springK = 12.0, springDamp = 0.92) {
        this.scene = scene;
        this.webRadius = webRadius;
        this.webRadials = webRadials;
        this.webRings = webRings;
        this.springK = springK;
        this.springDamp = springDamp;

        this.webNodes = [];
        this.webEdges = [];
        this.webGeometry = null;
        this.webMesh = null;

        this.buildOrbWeb();
        this.addDewDrops();
    }

    buildOrbWeb() {
        const nps = this.webRings + 1;
        this.webNodes.push({ pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), rest: new THREE.Vector3(0, 0, 0), pinned: true });

        for (let r = 0; r < this.webRadials; r++) {
            const angle = (r / this.webRadials) * Math.PI * 2;
            for (let ring = 1; ring <= nps; ring++) {
                const a = angle + (ring / nps) * 0.15;
                const dist = (ring / nps) * this.webRadius;
                const noise = 1 + Math.sin(r * 7.3 + ring * 3.1) * 0.06;
                const x = Math.cos(a) * dist * noise;
                const z = Math.sin(a) * dist * noise;
                const y = -Math.sin((ring / nps) * Math.PI) * 0.3;
                const pos = new THREE.Vector3(x, y, z);
                this.webNodes.push({ pos: pos.clone(), vel: new THREE.Vector3(), rest: pos.clone(), pinned: ring === nps });
            }
        }

        for (let r = 0; r < this.webRadials; r++) {
            const ss = 1 + r * nps;
            this.addEdge(0, ss);
            for (let ring = 0; ring < nps - 1; ring++) this.addEdge(ss + ring, ss + ring + 1);
        }
        for (let ring = 2; ring < nps; ring++) {
            for (let r = 0; r < this.webRadials; r++) {
                this.addEdge(1 + r * nps + (ring - 1), 1 + ((r + 1) % this.webRadials) * nps + (ring - 1));
            }
        }

        const positions = new Float32Array(this.webEdges.length * 6);
        this.webGeometry = new THREE.BufferGeometry();
        this.webGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.webMesh = new THREE.LineSegments(this.webGeometry, new THREE.LineBasicMaterial({
            color: 0x9955dd, transparent: true, opacity: 0.55
        }));
        this.scene.add(this.webMesh);

        this.scene.add(new THREE.Mesh(
            new THREE.CircleGeometry(this.webRadius, 64),
            new THREE.MeshBasicMaterial({ color: 0x3300aa, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
        ).translateY(-0.5).rotateX(-Math.PI / 2));

        this.updateWebGeometry();
    }

    addEdge(a, b) { 
        this.webEdges.push([a, b, this.webNodes[a].pos.distanceTo(this.webNodes[b].pos)]); 
    }

    updateWebGeometry() {
        const p = this.webGeometry.attributes.position.array;
        for (let i = 0; i < this.webEdges.length; i++) {
            const [a, b] = this.webEdges[i];
            const pA = this.webNodes[a].pos, pB = this.webNodes[b].pos;
            const o = i * 6;
            p[o] = pA.x; p[o + 1] = pA.y; p[o + 2] = pA.z; p[o + 3] = pB.x; p[o + 4] = pB.y; p[o + 5] = pB.z;
        }
        this.webGeometry.attributes.position.needsUpdate = true;
    }

    onUpdate(dt) {
        const cdt = Math.min(dt, 0.033);
        for (const [a, b, rl] of this.webEdges) {
            const nA = this.webNodes[a], nB = this.webNodes[b];
            const d = new THREE.Vector3().subVectors(nB.pos, nA.pos);
            const dist = d.length();
            if (dist < 0.001) continue;
            const f = d.normalize().multiplyScalar((dist - rl) * this.springK * cdt);
            if (!nA.pinned) nA.vel.add(f);
            if (!nB.pinned) nB.vel.sub(f);
        }
        for (const n of this.webNodes) {
            if (n.pinned) continue;
            n.vel.add(new THREE.Vector3().subVectors(n.rest, n.pos).multiplyScalar(2.0 * cdt));
            n.pos.add(n.vel.clone().multiplyScalar(cdt));
            n.vel.multiplyScalar(this.springDamp);
        }
        this.updateWebGeometry();
    }

    impulse(worldPos, strength) {
        const ir = this.webRadius * 0.6;
        for (const n of this.webNodes) {
            if (n.pinned) continue;
            const d = n.pos.distanceTo(worldPos);
            if (d < ir) {
                const f = 1 - d / ir;
                n.vel.y -= strength * f * f;
                n.vel.add(new THREE.Vector3().subVectors(n.pos, worldPos).normalize().multiplyScalar(strength * f * 0.3));
            }
        }
    }

    addDewDrops() {
        const g = new THREE.SphereGeometry(0.06, 6, 6);
        const m = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.5 });
        for (let i = 0; i < 60; i++) {
            const drop = new THREE.Mesh(g, m);
            drop.position.copy(this.webNodes[Math.floor(Math.random() * this.webNodes.length)].pos);
            this.scene.add(drop);
        }
    }
}
