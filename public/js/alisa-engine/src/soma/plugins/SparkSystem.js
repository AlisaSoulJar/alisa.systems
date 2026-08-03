import * as THREE from 'three';

export class SparkSystem {
    constructor(scene) {
        this.count = 400;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.colors = new Float32Array(this.count * 3);
        this.velocities = [];
        this.lifespans = new Float32Array(this.count);
        this.active = false;
        this.origin = new THREE.Vector3();

        for (let i = 0; i < this.count; i++) {
            this.positions[i*3] = 0;
            this.positions[i*3+1] = -999; 
            this.positions[i*3+2] = 0;
            this.colors[i*3] = 0; this.colors[i*3+1] = 1; this.colors[i*3+2] = 1;
            this.velocities.push(new THREE.Vector3());
            this.lifespans[i] = 0;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.12,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.points = new THREE.Points(this.geometry, material);
        scene.add(this.points);
    }

    emit(origin, count = 30) {
        this.active = true;
        this.origin.copy(origin);
        let emitted = 0;
        const col = this.geometry.attributes.color.array;
        for (let i = 0; i < this.count; i++) {
            if (this.lifespans[i] <= 0) {
                this.positions[i*3] = origin.x + (Math.random()-0.5)*0.2;
                this.positions[i*3+1] = origin.y + (Math.random()-0.5)*0.2;
                this.positions[i*3+2] = origin.z + (Math.random()-0.5)*0.2;
                
                const speed = 4 + Math.random() * 6;
                this.velocities[i].set(
                    (Math.random() - 0.5) * speed,
                    (Math.random() * 10) + 3,
                    (Math.random() - 0.5) * speed
                );
                this.lifespans[i] = Math.random() * 0.6 + 0.3;
                
                const r = Math.random();
                if (r < 0.4) { col[i*3]=0; col[i*3+1]=1; col[i*3+2]=1; } // cyan
                else if (r < 0.7) { col[i*3]=1; col[i*3+1]=0.7; col[i*3+2]=0.2; } // orange
                else { col[i*3]=1; col[i*3+1]=1; col[i*3+2]=1; } // white-hot
                emitted++;
                if (emitted >= count) break;
            }
        }
        this.geometry.attributes.color.needsUpdate = true;
        this.playWeldSound();
    }

    playWeldSound() {
        if (!this.audioCtx) {
            const AContext = window.AudioContext || window.webkitAudioContext;
            if (AContext) this.audioCtx = new AContext();
            else return;
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const duration = 0.15 + Math.random() * 0.1;
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 1000;
        filter.Q.value = 1.0;
        
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);
        noise.start();
    }

    update(dt) {
        if (!this.active) return;
        let alive = false;
        const pos = this.geometry.attributes.position.array;
        
        for (let i = 0; i < this.count; i++) {
            if (this.lifespans[i] > 0) {
                alive = true;
                this.lifespans[i] -= dt;
                
                this.velocities[i].y -= 15 * dt;
                
                pos[i*3] += this.velocities[i].x * dt;
                pos[i*3+1] += this.velocities[i].y * dt;
                pos[i*3+2] += this.velocities[i].z * dt;
                
                if (pos[i*3+1] < 0.1) {
                    pos[i*3+1] = 0.1;
                    this.velocities[i].x *= 0.5;
                    this.velocities[i].z *= 0.5;
                    this.velocities[i].y *= -0.3; 
                }
            } else {
                pos[i*3+1] = -999; 
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        if (!alive) this.active = false;
    }
}
