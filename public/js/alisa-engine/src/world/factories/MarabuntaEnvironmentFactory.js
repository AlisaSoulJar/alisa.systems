import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { ParticleEmitter } from '../core/ParticleEmitter.js';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';
import { GLTFModelPool } from '../../soma/plugins/GLTFModelPool.js';
import { InstancedRenderPool } from '../core/InstancedRenderPool.js';
import { GeometryBaker } from '../core/GeometryBaker.js';
import { ProceduralLocomotion } from '../core/ProceduralLocomotion.js';

/**
 * MarabuntaEnvironmentFactory — Visual layer for Marabunta
 * ======================================================
 * Powered by alisa-engine
 * 
 * Reads MarabuntaSystem.getState() and renders everything.
 * Pure visual — no game logic. The Factory pattern:
 *   init(scene)    → setup arena, player, pools
 *   update(dt)     → called by AlisaRenderCore each frame
 *   setCore(core)  → receive engine reference
 *   syncState(s)   → read game state, sync all visuals
 */
export class MarabuntaEnvironmentFactory extends BaseEnvironmentFactory {

  constructor() {
    super(null, null);
    this.camera = null;
    this.core = null;
    this._pendingAdds = [];

    // Visual pools
    this.enemyMeshes = new Map();
    this.crateMeshes = new Map();
    this.puddleMeshes = new Map();
    this.pickPool = [];
    this.projPool = [];
    this.playerGroup = null;
    this.aura = null;
    this.pLight = null;
    this.pMesh = null;
    this.shieldMesh = null;

    // Particle system (delegated to ParticleEmitter)
    this._emitter = new ParticleEmitter(600, { mode: 'burst' });

    // Shake
    this._shakeIntensity = 0;

    // Shockwave
    this._swActive = false;
    this._swScale = 0;

    // Tracking for diff detection
    this._prevKills = 0;
    this._prevHP = 100;
    this._prevLevel = 1;
    this._prevWave = 0;

    // GLTF Models
    this.modelPool = new GLTFModelPool();
    this._loadModels();
  }

  _loadModels() {
    const assets = [
      { key: 'marabunta', path: '../props/ready/Chicken.glb', size: 1.5 },
      { key: 'mouse', path: '../props/models/Mouse.glb', size: 1.5 },
      { key: 'roach', path: '../props/models/Cockroach.glb', size: 1.5 },
      { key: 'pigeon', path: '../props/models/bird.glb', size: 1.5 },
      { key: 'rat', path: '../props/models/Rat.glb', size: 1.5 },
      { key: 'swarm', path: '../props/models/Cockroach.glb', size: 1.5 },
      { key: 'janitor', path: '../props/models/Generic Male.glb', size: 1.5 }
    ];
    this.modelPool.preloadBatch(assets);
  }

  // ─── ENGINE CONTRACT ───

  /**
   * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ──────────────────────
   * OJO: esta factory es un ESPEJO PURO. No tiene métodos de construcción: todo
   * (cajas, charcos, enjambres, proyectiles, pickups) lo crea y lo destruye
   * syncState(state, dt) según lo que diga el simulador. Por eso buildAll() no
   * tiene nada que montar; existe solo para cumplir el contrato común.
   * Uso real: setCore(core) → init(scene) → syncState(state, dt) cada frame.
   */
  buildAll(_c = {}) {
    return { mirror: true, scene: this.scene ?? null };
  }

  setCore(core) {
    this.core = core;
    if (core.camera) this.camera = core.camera;
  }

  init(scene) {
    this.scene = scene;
    this.swarmPool = new InstancedRenderPool(scene);

    // Apply pending adds
    if (this._pendingAdds.length) {
      this._pendingAdds.forEach(o => scene.add(o));
      this._pendingAdds = [];
    }

    this._setupArena();
    this._setupPlayer();
    this._setupParticles();
    this._setupShockwave();
  }

  update(dt) {
    // Called by core each frame — particles and shake always update
    this._updateParticles(dt);
    if (this._swActive) this._updateShockwave(dt);
    if (this._shakeIntensity > 0.01 && this.camera) {
      this.camera.position.x += (Math.random() - .5) * this._shakeIntensity;
      this.camera.position.y += (Math.random() - .5) * this._shakeIntensity * .5;
      this._shakeIntensity *= 0.9;
    }
    if (this._pMixer) this._pMixer.update(dt);

    if (this.sweepVFX && this.sweepVFX.material.opacity > 0) {
      this.sweepVFX.scale.addScalar(dt * 15);
      this.sweepVFX.material.opacity -= dt * 4;
    }
    if (this.slamVFX && this.slamVFX.material.opacity > 0) {
      this.slamVFX.scale.addScalar(dt * 10);
      this.slamVFX.material.opacity -= dt * 3;
    }
  }

  // ─── MAIN SYNC (called from croupier) ───

  syncState(state, dt) {
    if (!this.scene || !state) return;
    const t = state.time;
    const p = state.player;
    
    // Hot-swap player mesh to Mech Janitor if loaded
    if (!this._playerMechApplied && this.modelPool.has('janitor')) {
      this.playerGroup.remove(this.pMesh);
      
      // Clone using SkeletonUtils to safely preserve SkinnedMesh hierarchy and root scale nodes
      const originalGroup = this.modelPool.getOriginal('janitor');
      this.pMesh = SkeletonUtils.clone(originalGroup);
      
      // Force an imposing visual scale for the hero so he stands out among the normalized swarms
      this.pMesh.scale.setScalar(2.5);
      this.pMesh.position.y = 0;
      this.playerGroup.add(this.pMesh);
      
      // Move weapons to the new mesh so they rotate with him
      if (this.weaponHolder) {
        this.playerGroup.remove(this.weaponHolder);
        this.pMesh.add(this.weaponHolder);
      }
      
      this._playerMechApplied = true;

      // Setup animations
      this._pMixer = new THREE.AnimationMixer(this.pMesh);
      this._pActions = {};
      
      this._animIdle = null;
      this._animWalk = null;
      this._animJump = null;

      if (originalGroup.animations) {
        originalGroup.animations.forEach(clip => {
          this._pActions[clip.name] = this._pMixer.clipAction(clip);
          const ln = clip.name.toLowerCase();
          if (ln.includes('idle')) this._animIdle = clip.name;
          else if (ln.includes('walk') || ln.includes('run')) this._animWalk = clip.name;
          else if (ln.includes('jump')) this._animJump = clip.name;
        });
        
        // Fallbacks
        const firstAnim = Object.keys(this._pActions)[0];
        if (!this._animIdle) this._animIdle = firstAnim;
        if (!this._animWalk) this._animWalk = this._animIdle;
        if (!this._animJump) this._animJump = this._animIdle;

        if (this._animIdle && this._pActions[this._animIdle]) {
          this._pActions[this._animIdle].play();
          this._curAnim = this._animIdle;
        }
      }
    }

    // Player
    this.playerGroup.position.set(p.x, 0, p.z);
    
    if (this._playerMechApplied) {
       // Animate movement and rotation
       const isMoving = p.dx !== 0 || p.dz !== 0;
       
       // Check special states
       const isSweeping = p.sweepCd > 1.7; // Sweep is 2.0 max, active for 0.3s
       const isSlamming = p.slamCd > 3.1;  // Slam is 3.5 max, active for 0.4s

       let targetAnim = this._animIdle;
       if (isSlamming) targetAnim = this._animJump;
       else if (isMoving) targetAnim = this._animWalk;
       
       if (this._curAnim !== targetAnim && targetAnim && this._pActions[targetAnim]) {
         if (this._curAnim && this._pActions[this._curAnim]) {
           this._pActions[this._curAnim].crossFadeTo(this._pActions[targetAnim], 0.1, true);
         }
         this._pActions[targetAnim].setEffectiveTimeScale(isSlamming ? 1.5 : 1.0);
         this._pActions[targetAnim].play();
         this._curAnim = targetAnim;
       }

       if (isSweeping) {
         // Whirlwind spin attack!
         this.pMesh.rotation.y += dt * 30;
         this.weaponHolder.rotation.x = 0; // reset
       } else if (isMoving && !isSlamming) {
         // Rotate to face movement direction (atan2(dx, dz))
         const targetAngle = Math.atan2(p.dx, p.dz);
         // Smooth rotation
         let diff = targetAngle - this.pMesh.rotation.y;
         while (diff < -Math.PI) diff += Math.PI * 2;
         while (diff > Math.PI) diff -= Math.PI * 2;
         this.pMesh.rotation.y += diff * dt * 12;
         this.weaponHolder.rotation.x = 0; // reset
       }

       if (isSlamming) {
         // Parabolic jump arc
         const tSlam = (3.5 - p.slamCd) / 0.4; // 0 to 1
         this.pMesh.position.y = Math.sin(tSlam * Math.PI) * 2.5; // Jump up 2.5 units
         // Broom swings down!
         this.weaponHolder.rotation.x = -Math.PI * 0.8 * (tSlam * tSlam); // Smashing motion
       } else {
         this.pMesh.position.y = 0;
         if (!isSweeping && !isMoving) this.weaponHolder.rotation.x = 0;
       }

    } else {
       this.pMesh.position.y = 1.0 + Math.sin(t * 3) * .1;
       this.pMesh.material.emissiveIntensity = 0.3 + Math.sin(t * 5) * .15 + p.level * .05;
    }
    this.pLight.intensity = 0.5 + p.level * 0.1;
    this.pLight.distance = 8 + p.level * 0.5;

    // Aura grows with level
    const aScale = 1 + p.level * 0.3;
    this.aura.scale.set(aScale, aScale, 1);
    this.aura.material.opacity = 0.1 + p.level * 0.02;
    this.aura.rotation.z += dt * 0.5;

    // Camera follow
    if (this.core && this.core.controls) {
      this.core.controls.target.lerp(new THREE.Vector3(p.x, 0, p.z), 0.06);
    }

    // Ring pulse
    if (this._ring) {
      this._ring.material.opacity = 0.2 + Math.sin(t * 2) * .1;
      this._ring.material.color.setHSL((t * .02) % 1, 0.6, 0.5);
    }

    // Detect events → FX
    this._detectKills(state, t);
    this._syncCrates(state);
    this._syncPuddles(state);
    this._detectDamage(state);
    this._detectLevelUp(state);
    this._detectWave(state);
    
    // Check for special attacks
    if (p.sweepCd > this._prevSweepCd) {
      this.sweepVFX.scale.set(0.5, 0.5, 1);
      this.sweepVFX.material.opacity = 0.8;
      this.sweepVFX.rotation.z = Math.atan2(p.dx, p.dz) + Math.PI/2;
    }
    this._prevSweepCd = p.sweepCd;

    if (this._prevSlamCd > 3.1 && p.slamCd <= 3.1) {
      this.slamVFX.scale.set(0.5, 0.5, 1);
      this.slamVFX.material.opacity = 0.8;
      this._shakeIntensity = 1.5; // Heavy screen shake on land
    }
    this._prevSlamCd = p.slamCd;

    // Detect firing events for weapon swing animation
    if (state.projectiles && state.projectiles.length > (this._prevProjCount || 0)) {
      this._broomSwingTime = 0.4; // 400ms so the human eye can appreciate the swing
    }
    this._prevProjCount = state.projectiles ? state.projectiles.length : 0;

    // Sync entities
    this._syncWeapons(state.player.weapons, t, dt);
    this._syncEnemies(state.enemies, t, dt);
    this._syncProjectiles(state.projectiles);
    this._syncPickups(state.pickups, state.player, t, dt);
    this._syncShield(state, t);
  }

  // ─── SETUP ───

  _setupProceduralWeapons() {
    this.weaponMeshes = {};
    this.weaponHolder = new THREE.Group();
    // Compensate for the Hero's 2.5x scale multiplier by lowering the holder to waist level (0.35 * 2.5 = 0.87m)
    // and dividing the scale so the procedural weapons don't turn into 4-meter massive halberds.
    this.weaponHolder.position.y = 0.45;
    this.weaponHolder.scale.setScalar(1 / 1.5); 
    
    // Broom (Escoba)
    const broom = new THREE.Group();
    const bHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5), new THREE.MeshStandardMaterial({color: 0x8d6e63}));
    const bHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.1), new THREE.MeshStandardMaterial({color: 0xd4e157}));
    bHead.position.y = 0.75;
    broom.add(bHandle, bHead);
    broom.position.set(0.40, 0, 0.10); // Tweaked inward to exactly cross the hand geometry
    broom.rotation.z = -Math.PI / 16;
    broom.rotation.x = Math.PI / 4; // Pointed more aggressively forward like a spear
    broom.visible = false;
    this.weaponMeshes['broom'] = broom;
    this.weaponHolder.add(broom);

    // Mop (Fregona)
    const mop = new THREE.Group();
    const mHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5), new THREE.MeshStandardMaterial({color: 0x90a4ae}));
    const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.3), new THREE.MeshStandardMaterial({color: 0xe0e0e0}));
    mHead.position.y = 0.75;
    mop.add(mHandle, mHead);
    mop.position.set(-0.40, 0, 0.10); // Left hand
    mop.rotation.z = Math.PI / 16;
    mop.rotation.x = Math.PI / 4;
    mop.visible = false;
    this.weaponMeshes['mop'] = mop;
    this.weaponHolder.add(mop);

    // Vacuum (Aspirador)
    const vacuum = new THREE.Group();
    const vBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.2), new THREE.MeshStandardMaterial({color: 0xe53935}));
    const vPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), new THREE.MeshStandardMaterial({color: 0x424242}));
    vPipe.position.set(0.2, -0.4, 0.2);
    vPipe.rotation.x = Math.PI / 4;
    vPipe.rotation.z = -Math.PI / 4;
    vacuum.add(vBody, vPipe);
    vacuum.position.set(0, 0, -0.3); // Backpack
    vacuum.visible = false;
    this.weaponMeshes['vacuum'] = vacuum;
    this.weaponHolder.add(vacuum);
  }

  _setupArena() {
    // Procedural Industrial Tiles (Light grey hospital/warehouse)
    const canvas = ProceduralTextureFactory.industrialTiles(512, '#c8cccf', 8);
    
    const tileTex = new THREE.CanvasTexture(canvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(8, 8); // Repeat across the 80x80 floor

    const arenaGeo = new THREE.PlaneGeometry(80, 80);
    const arenaMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 1.0, metalness: 0.0 });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.rotation.x = -Math.PI / 2; arena.receiveShadow = true;
    this.scene.add(arena);

    // Border ring (Keep as a holographic perimeter)
    const ringGeo = new THREE.RingGeometry(39.5, 40.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.4 }); // Warning perimeter
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.rotation.x = -Math.PI / 2; this._ring.position.y = 0.05;
    this.scene.add(this._ring);

    // Lights - Clean, flat, "13 Corp Building" comic style
    this.applyLightingPreset({
        hemi: { skyColor: 0x888888, groundColor: 0x222222, intensity: 0.6 }
    });
    
    // Single directional light for crisp, predictable shadows
    const dirLight = new THREE.DirectionalLight(0xfffaf0, 0.7); // Warm comic sunlight, reduced intensity
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    
    // Expand shadow camera to cover the whole 80x80 arena
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 45;
    dirLight.shadow.camera.bottom = -45;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
  }

  _setupPlayer() {
    this._setupProceduralWeapons();
    
    this.playerGroup = new THREE.Group();
    this.playerGroup.add(this.weaponHolder);

    const pGeo = new THREE.CapsuleGeometry(0.5, 1.0, 8, 16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x1a6ae0, emissiveIntensity: 0.5 });
    this.pMesh = new THREE.Mesh(pGeo, pMat);
    this.pMesh.position.y = 1.0; this.pMesh.castShadow = true;
    this.playerGroup.add(this.pMesh);

    // Swap capsule for Janitor Mech when loaded
    this._playerMechApplied = false;

    const auraGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    this.aura = new THREE.Mesh(auraGeo, auraMat);
    this.aura.rotation.x = -Math.PI / 2; this.aura.position.y = 0.1;
    this.playerGroup.add(this.aura);

    this.pLight = new THREE.PointLight(0x4fc3f7, 0.5, 8);
    this.pLight.position.y = 1.5;
    this.playerGroup.add(this.pLight);

    // Shield (hidden until unlocked)
    const shGeo = new THREE.CircleGeometry(0.6, 8);
    const shMat = new THREE.MeshBasicMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    this.shieldMesh = new THREE.Mesh(shGeo, shMat);
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);

    // VFX
    const sweepGeo = new THREE.RingGeometry(2, 4.0, 32, 1, 0, Math.PI);
    const sweepMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0, side: THREE.DoubleSide });
    this.sweepVFX = new THREE.Mesh(sweepGeo, sweepMat);
    this.sweepVFX.rotation.x = -Math.PI / 2;
    this.sweepVFX.position.y = 0.5;
    this.playerGroup.add(this.sweepVFX);

    const slamGeo = new THREE.RingGeometry(3, 5.5, 32);
    const slamMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0, side: THREE.DoubleSide });
    this.slamVFX = new THREE.Mesh(slamGeo, slamMat);
    this.slamVFX.rotation.x = -Math.PI / 2;
    this.slamVFX.position.y = 0.1;
    this.playerGroup.add(this.slamVFX);

    this._prevSweepCd = 0;
    this._prevSlamCd = 0;

    this.scene.add(this.playerGroup);
  }

  // ─── ENTITY SYNC ───

  _enemyGeo(type) {
    if (!this._eGeos) {
      this._eGeos = {
        marabunta: new THREE.BoxGeometry(.6, .6, .6),
        mouse: new THREE.ConeGeometry(.3, .6, 6),
        roach: new THREE.BoxGeometry(.7, .4, .9),
        pigeon: new THREE.OctahedronGeometry(.5),
        swarm: new THREE.SphereGeometry(.2, 6, 4),
        boss: new THREE.DodecahedronGeometry(1.5),
      };
    }
    return this._eGeos[type] || this._eGeos.marabunta;
  }

  _getEntityVisualParams(type) {
    if (type === 'roach') return { color: 0x8d6e63, scale: 1.0, anim: 'scurry' };
    if (type === 'mouse') return { color: 0x78909c, scale: 1.6, anim: 'hop' };
    if (type === 'pigeon') return { color: 0xb0bec5, scale: 2.2, anim: 'hop' };
    if (type === 'swarm') return { color: 0xe53935, scale: 0.6, anim: 'hover' };
    if (type === 'boss') return { color: 0xffb300, scale: 4.5, anim: 'slither' };
    return { color: 0xffffff, scale: 1.0, anim: 'hop' };
  }

  _syncCrates(state) {
    if (!state.obstacles) return;
    const activeIds = new Set();
    
    state.obstacles.forEach(ob => {
      activeIds.add(ob.id);
      let mesh = this.crateMeshes.get(ob.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(ob.r*1.5, ob.r*1.5, ob.r*1.5);
        // Randomize the box colors slightly to look like crates
        const c = new THREE.Color().setHSL(0.1 + Math.random()*0.05, 0.6, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 1.0, metalness: 0.0 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.y = ob.r * 0.75;
        this.crateMeshes.set(ob.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.x = ob.x;
      mesh.position.z = ob.z;
      
      // Damage indication (cracks could be a texture, but let's tint it darker)
      const mat = mesh.material;
      if (ob.hp < 1.0) {
        mat.color.setHSL(0.1, 0.6, 0.4 * ob.hp);
      }
    });

    for (const [id, mesh] of this.crateMeshes) {
      if (!activeIds.has(id)) {
        // Crate destroyed! Emit splinters
        this.emitParticles(mesh.position.x, mesh.position.y, mesh.position.z, 0x8d6e63, 30, 10);
        this.scene.remove(mesh);
        this.crateMeshes.delete(id);
      }
    }
  }

  _syncPuddles(state) {
    if (!state.puddles) return;
    const activeIds = new Set();
    state.puddles.forEach(p => {
      activeIds.add(p.id);
      let mesh = this.puddleMeshes.get(p.id);
      if (!mesh) {
        const geo = new THREE.CircleGeometry(p.r, 16);
        // Toxic green puddle
        // Dark slimy toxic puddle that doesn't emit light (prevents bloom blooming)
        const mat = new THREE.MeshStandardMaterial({ color: 0x336600, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.7, depthWrite: false });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.02 + Math.random() * 0.01; // Avoid Z-fighting if overlapping
        this.puddleMeshes.set(p.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.x = p.x;
      mesh.position.z = p.z;
      // Shrink linearly during the last 2 seconds of life
      mesh.scale.setScalar(Math.min(1.0, p.life / 2.0));
    });

    for (const [id, mesh] of this.puddleMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.puddleMeshes.delete(id);
      }
    }
  }

  _syncEnemies(enemies, t, dt) {
    if (!this.swarmPool) return;

    // 1. Group by type
    const byType = {};
    for (const e of enemies) {
      if (!byType[e.type]) byType[e.type] = [];
      byType[e.type].push(e);
    }

    // 2. Clear unused pools to 0
    for (const [type, iMesh] of this.swarmPool.pools) {
      iMesh.count = 0;
    }

    // 3. Map pure logical state to visual raw GPU data
    for (const type in byType) {
      const typeEnemies = byType[type];
      
      // Auto-register dynamically if type not seen
      if (!this.swarmPool.pools.has(type)) {
        let geo, mat;
        if (this.modelPool && this.modelPool.has(type)) {
          const original = this.modelPool.getOriginal(type);
          geo = GeometryBaker.extractBakedGeometry(original);
          mat = GeometryBaker.extractMaterial(original);
        }
        if (!geo) {
          // Fallbacks strictly normalized to height=1.0 so their center is exactly 0.5 (stops floating!)
          if (type === 'roach') geo = this._enemyGeo('roach');
          else if (type === 'mouse') geo = new THREE.BoxGeometry(0.8, 1.0, 1.4); // Long chonky mouse
          else if (type === 'pigeon') geo = new THREE.ConeGeometry(0.6, 1.0, 4); // Bird spike
          else if (type === 'boss') geo = new THREE.TorusGeometry(1, 0.5, 8, 12); // Giant donut crown
          else geo = new THREE.SphereGeometry(0.5, 8, 8); // Height = 1.0
          mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.1 });
        }
        this.swarmPool.registerType(type, geo, mat, 5000);
      }

      const rawData = typeEnemies.map(e => {
        const params = this._getEntityVisualParams(type);
        const scared = e.hp < 0.3;
        const wobble = scared ? 1 + Math.sin(t * 20) * 0.2 : 1;
        const finalScale = params.scale * wobble;
        const colorHex = e.guard ? 0x00aaff : (scared ? 0xffff00 : params.color);

        // FX: Shield break detection
        if (e.guard !== undefined) {
           let hadGuard = e._hadGuard || false;
           if (!e.guard && hadGuard) {
               this.emitParticles(e.x, e.size/2, e.z, 0x00aaff, 40, 15);
               e._hadGuard = false;
           } else if (e.guard && !hadGuard) {
               e._hadGuard = true;
           }
        }

        const speed = Math.sqrt((e.vx||0)*(e.vx||0) + (e.vz||0)*(e.vz||0));
        const anim = ProceduralLocomotion.apply(params.anim, e.id, t, e.size * finalScale, speed, e.x, e.z);

        return {
          id: e.id,
          x: e.x,
          y: (e.size * finalScale * 0.5) + anim.dy,
          z: e.z,
          scale: e.size * finalScale,
          rotX: anim.dRotX,
          rotZ: anim.dRotZ,
          rotY: this.swarmPool.computeSmoothHeading(e.id, e.vx, e.vz, dt, 10, scared ? 15 : 2),
          colorHex: colorHex
        };
      });

      this.swarmPool.syncType(type, rawData);
    }

    // 4. Purge memory occasionally
    if (this.tick && this.tick % 120 === 0) {
      this.swarmPool.purgeMemory(enemies.map(e => e.id));
    }
  }

  _syncProjectiles(projectiles) {
    // Air-slash / dust wave instead of magic sphere
    const projGeo = this._projGeo || (this._projGeo = new THREE.BoxGeometry(1.5, 0.1, 0.3));
    while (this.projPool.length > projectiles.length) { const m = this.projPool.pop(); this.scene.remove(m); }
    while (this.projPool.length < projectiles.length) {
      const m = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
      // Soft light trailing the slash
      m.add(new THREE.PointLight(0xffffff, 2, 4));
      this.scene.add(m); this.projPool.push(m);
    }
    projectiles.forEach((p, i) => { 
      const m = this.projPool[i];
      m.position.set(p.x, 0.5, p.z); 
      // Point the slash perpendicular to movement
      if (p.vx !== undefined && p.vz !== undefined) {
          m.rotation.y = Math.atan2(p.vx, p.vz);
      }
    });
  }

  _syncPickups(pickups, player, t, dt) {
    const pickGeo = this._pickGeo || (this._pickGeo = new THREE.OctahedronGeometry(.22));
    while (this.pickPool.length > pickups.length) { const m = this.pickPool.pop(); this.scene.remove(m); }
    while (this.pickPool.length < pickups.length) {
      const m = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ color: 0xa78bfa }));
      m.add(new THREE.PointLight(0xa78bfa, 3, 2));
      this.scene.add(m); this.pickPool.push(m);
    }
    pickups.forEach((pk, i) => {
      const mesh = this.pickPool[i];
      const dx = player.x - pk.x, dz = player.z - pk.z;
      if (dx * dx + dz * dz < 16) mesh.position.lerp(new THREE.Vector3(player.x, .5, player.z), dt * 3);
      else mesh.position.set(pk.x, .4 + Math.sin(t * 6 + i) * .2, pk.z);
      mesh.rotation.y += dt * 4;
      mesh.rotation.x += dt * 2;
    });
  }

  _syncWeapons(weapons, t, dt) {
    const broom = this.weaponMeshes['broom'];
    const mop = this.weaponMeshes['mop'];
    
    if (broom) broom.visible = weapons.includes('broom');
    if (mop) mop.visible = weapons.includes('mop');
    if (this.weaponMeshes['vacuum']) this.weaponMeshes['vacuum'].visible = weapons.includes('vacuum');

    // Swing animation when attacking
    if (this._broomSwingTime > 0) {
        this._broomSwingTime -= dt;
        const progress = Math.max(0, this._broomSwingTime / 0.4); // 1.0 to 0.0
        const swingAngle = Math.sin(progress * Math.PI) * Math.PI * 0.8; // Fast downward arc
        if (broom) broom.rotation.x = Math.PI / 4 - swingAngle;
        if (mop) mop.rotation.x = Math.PI / 4 - swingAngle;
    } else {
        // Idle bobbing
        if (broom) broom.rotation.x = Math.PI / 4 + Math.sin(t * 3) * 0.1;
        if (mop) mop.rotation.x = Math.PI / 4 + Math.cos(t * 3) * 0.1;
    }
  }

  _syncShield(state, t) {
    if (!state.player.weapons.includes('binlid')) {
      this.shieldMesh.visible = false;
      return;
    }
    this.shieldMesh.visible = true;
    this.shieldMesh.position.set(
      state.player.x + Math.cos(t * 4) * 2.5,
      0.5,
      state.player.z + Math.sin(t * 4) * 2.5
    );
    this.shieldMesh.rotation.x = -Math.PI / 2;
    this.shieldMesh.rotation.z += 0.1;
  }

  // ─── EVENT DETECTION → FX ───

  _detectKills(state, t) {
    if (state.kills > this._prevKills) {
      // Blood splatters optimally come from events emitted by the logic system.
      // Since we use pure InstancedMeshes now, we don't have zombie object wrappers.
      this._prevKills = state.kills;
    }
  }

  _detectDamage(state) {
    if (state.player.hp < this._prevHP) {
      this.triggerShake(0.4);
      this.emitParticles(state.player.x, 1, state.player.z, 0xff4444, 8, 3);
    }
    this._prevHP = state.player.hp;
  }

  _detectLevelUp(state) {
    if (state.player.level > this._prevLevel) {
      this._triggerShockwave(state.player.x, state.player.z);
      this.emitParticles(state.player.x, 1, state.player.z, 0xa78bfa, 30, 8);
      this.triggerShake(0.25);
      this._prevLevel = state.player.level;
    }
  }

  _detectWave(state) {
    if (state.wave !== this._prevWave) {
      this._prevWave = state.wave;
      this.triggerShake(0.15);
      // Wave announce handled by croupier HUD
    }
  }

  // ─── PARTICLE SYSTEM ───

  _setupParticles() {
    this.scene.add(this._emitter.mesh);
  }

  emitParticles(x, y, z, color, count = 12, force = 5) {
    this._emitter.emit(x, y, z, color, count, force);
  }

  _updateParticles(dt) {
    this._emitter.tick(dt);
  }

  // ─── SCREEN SHAKE ───

  triggerShake(intensity = 0.3) { this._shakeIntensity = Math.max(this._shakeIntensity, intensity); }

  // ─── SHOCKWAVE ───

  _setupShockwave() {
    const geo = new THREE.RingGeometry(0.5, 1.0, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0, side: THREE.DoubleSide });
    this._swMesh = new THREE.Mesh(geo, mat);
    this._swMesh.rotation.x = -Math.PI / 2; this._swMesh.position.y = 0.2;
    this.scene.add(this._swMesh);
  }

  _triggerShockwave(x, z) {
    this._swMesh.position.set(x, 0.2, z);
    this._swScale = 1; this._swActive = true; this._swMesh.material.opacity = 0.7;
  }

  _updateShockwave(dt) {
    this._swScale += dt * 30;
    this._swMesh.material.opacity -= dt * 1.5;
    this._swMesh.scale.set(this._swScale, this._swScale, 1);
    if (this._swMesh.material.opacity <= 0) { this._swActive = false; this._swMesh.material.opacity = 0; }
  }
}
