import * as THREE from 'three';

/**
 * VOLUMETRICS ENGINE
 * ----------------------------------------------------
 * High-performance visual engine for procedural volume beams,
 * flashlights, and atmospheric dust.
 */
export class VolumetricsPlugin {
    constructor() {
        this.dustInstances = [];
    }

    /**
     * Registers a dust instance for automated physics updates.
     */
    registerDust(dustMesh) {
        this.dustInstances.push(dustMesh);
    }

    /**
     * Engine loop hook for animating volumetrics.
     */
    onUpdate(dt) {
        this.dustInstances.forEach(dust => {
            if (!dust.visible) return;
            const positions = dust.geometry.attributes.position.array;
            const vels = dust.userData.velocities;
            if (!vels) return;
            
            for(let i=0; i<dust.geometry.attributes.position.count; i++) {
                positions[i*3] += vels[i*3]*dt;
                positions[i*3+1] += vels[i*3+1]*dt;
                positions[i*3+2] += vels[i*3+2]*dt;
                
                if(positions[i*3+1] > 2) {
                    positions[i*3] = (Math.random()-0.5)*2;
                    positions[i*3+1] = -1.5;
                    positions[i*3+2] = -Math.random()*8-1;
                }
            }
            dust.geometry.attributes.position.needsUpdate = true;
        });
    }

    /**
     * Centralized 1D gradient texture for procedural beams.
     * @returns {THREE.CanvasTexture}
     */
    static createBaseTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        
        // Gradient from semi-transparent hot center to invisible edges
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)'); 
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 16, 256);
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Creates a pseudo-volumetric cone mesh for a flashlight.
     * @returns {THREE.Mesh}
     */
    static createFlashlightBeam() {
        const volGeo = new THREE.ConeGeometry(1.0, 1.0, 32, 1, true);
        volGeo.translate(0, -0.5, 0); // Put tip at origin
        volGeo.rotateX(-Math.PI / 2); // Point along +Z instead of -Z
        
        const volMat = new THREE.MeshBasicMaterial({
            map: VolumetricsPlugin.createBaseTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const beam = new THREE.Mesh(volGeo, volMat);
        beam.position.set(0, 1.5, 0);
        return beam;
    }

    /**
     * Creates the atmospheric instanced dust mesh for flashlight collisions.
     * @param {number} count Number of particles (defaults to 80)
     * @returns {THREE.Points}
     */
    static createFlashlightDust(count = 80) {
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        for(let i=0; i<count; i++) {
            dustPos[i*3] = (Math.random() - 0.5) * 1.5;
            dustPos[i*3+1] = (Math.random() - 0.5) * 1.5;
            dustPos[i*3+2] = Math.random() * 8 + 1.0; 
            
            velocities[i*3] = (Math.random() - 0.5) * 0.2;
            velocities[i*3+1] = Math.random() * 0.2 + 0.1;
            velocities[i*3+2] = Math.random() * 0.5 + 0.2; 
        }
        
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        
        const dustMat = new THREE.PointsMaterial({
            color: 0xffffee,
            size: 0.04,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const dust = new THREE.Points(dustGeo, dustMat);
        dust.userData.velocities = velocities;
        dust.position.set(0, 1.5, 0);
        return dust;
    }

    /**
     * Creates an appliance-specific geometry beam (TVs, bulbs, fridges).
     * @param {string} type 'bulb' | 'tv' | 'fridge' | 'window'
     * @returns {THREE.Mesh}
     */
    static createApplianceBeam(type) {
        const configs = {
            'bulb': { shape: 'cone', color: [1.0, 0.85, 0.3], r: 2.2, h: 2.9, opacity: 0.50 },
            'tv':   { shape: 'box', color: [0.3, 0.5, 1.0], w: 0.8, h: 0.55, d: 3.5, opacity: 0.55 },
            'fridge': { shape: 'box', color: [0.7, 0.9, 1.0], w: 1.0, h: 2.1, d: 2.0, opacity: 0.45 },
            'window': { shape: 'box', color: [0.6, 0.75, 1.0], w: 1.8, h: 2.0, d: 3.5, opacity: 0.45 }
        };
        const cfg = configs[type] || configs['bulb'];
        
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        const [r, g, b] = cfg.color;
        
        const coreIntensity = cfg.shape === 'cone' ? 0.45 : 0.95;
        grad.addColorStop(0, `rgba(${r*255|0}, ${g*255|0}, ${b*255|0}, ${coreIntensity})`); 
        grad.addColorStop(0.5, `rgba(${r*255|0}, ${g*255|0}, ${b*255|0}, ${coreIntensity * 0.35})`);
        grad.addColorStop(1, `rgba(${r*255|0}, ${g*255|0}, ${b*255|0}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 256);
        
        let geo;
        if (cfg.shape === 'cone') {
            geo = new THREE.ConeGeometry(cfg.r, cfg.h, 32, 1, true);
            geo.translate(0, -cfg.h/2, 0); 
            const uvs = geo.attributes.uv.array;
            const pos = geo.attributes.position.array;
            for (let i = 0; i < uvs.length; i += 2) {
                const y = pos[(i / 2) * 3 + 1];
                uvs[i + 1] = 1.0 - (y / -cfg.h);
            }
        } else {
            geo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
            geo.translate(0, 0, cfg.d/2);
            const uvs = geo.attributes.uv.array;
            const pos = geo.attributes.position.array;
            for (let i = 0; i < uvs.length; i += 2) {
                const z = pos[(i / 2) * 3 + 2];
                uvs[i + 1] = 1.0 - (z / cfg.d);
            }
        }
        
        const mat = new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(canvas),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: cfg.opacity,
            side: THREE.BackSide 
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;   
        mesh.userData.isBeam = true;
        mesh.userData.beamType = type;
        mesh.userData.maxOpacity = cfg.opacity;
        return mesh;
    }

    /**
     * Create massive scattered dust around the whole environment.
     * @param {number} count Particle count
     * @param {number} roomW Room width
     * @param {number} roomD Room depth
     * @param {number} wallH Wall height
     * @param {Function} rng Custom deterministic pseudo-random generator
     * @returns {THREE.InstancedMesh}
     */
    static generateAmbientDustParticles(count, roomW, roomD, wallH, rng = Math.random) {
        const geo = new THREE.TetrahedronGeometry(0.012, 0);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0xeeeeee, 
            roughness: 0.9, 
            metalness: 0.1,
            emissive: 0x111111 
        });
        
        const dustMesh = new THREE.InstancedMesh(geo, mat, count);
        dustMesh.castShadow = false;
        dustMesh.receiveShadow = false; 

        const dummy = new THREE.Object3D();
        dustMesh.userData.speeds = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const x = (rng() - 0.5) * roomW;
            const y = 0.2 + rng() * (wallH - 0.4);
            const z = (rng() - 0.5) * roomD;
            
            dummy.position.set(x, y, z);
            dummy.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
            dummy.updateMatrix();
            dustMesh.setMatrixAt(i, dummy.matrix);
            
            dustMesh.userData.speeds[i*3 + 0] = (rng() - 0.5) * 0.1;
            dustMesh.userData.speeds[i*3 + 1] = (rng() - 0.2) * 0.15; 
            dustMesh.userData.speeds[i*3 + 2] = (rng() - 0.5) * 0.1;
        }
        
        dustMesh.instanceMatrix.needsUpdate = true;
        return dustMesh;
    }
}
