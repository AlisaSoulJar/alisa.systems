import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * CinematicPipelinePlugin
 * ═══════════════════════════════════════════════════════════════
 * Un solo plugin que da a CUALQUIER escena el look de cine:
 *   cielo con dispersión atmosférica (Rayleigh/Mie)
 *   + sol direccional con sombras suaves
 *   + SSAO + Bloom + tonemapping filmico (ACES)
 *
 * Antes esto se cableaba a mano dentro de cada lab (mal: no reutilizable).
 * Ahora vive en el motor y se enciende con una línea.
 *
 * USO:
 *   const cine = new CinematicPipelinePlugin({ preset:'golden_hour' });
 *   app.registerPlugin(cine);                 // monta cielo, luces y composer
 *   app.startLoop(dt => {...}, cine.renderFn); // el composer pinta en vez del render normal
 *
 * PRESETS: 'golden_hour' | 'noon' | 'night' | 'interior'
 */

const PRESETS = {
    golden_hour: { elevation: 6,  azimuth: 168, exposure: 0.55, turbidity: 6,  rayleigh: 1.4,
                   keyColor: 0xfff0d8, keyIntensity: 5.0, hemi: 1.15, bloom: 0.42, fillIntensity: 1.5 },
    noon:        { elevation: 62, azimuth: 180, exposure: 0.42, turbidity: 3,  rayleigh: 0.9,
                   keyColor: 0xffffff, keyIntensity: 4.0, hemi: 1.0,  bloom: 0.22, fillIntensity: 0.6 },
    night:       { elevation: -4, azimuth: 200, exposure: 0.85, turbidity: 12, rayleigh: 0.35,
                   keyColor: 0x9fc4ff, keyIntensity: 0.9, hemi: 0.35, bloom: 0.75, fillIntensity: 0.3 },
    interior:    { elevation: 20, azimuth: 140, exposure: 0.70, turbidity: 8,  rayleigh: 0.6,
                   keyColor: 0xffe8c4, keyIntensity: 2.2, hemi: 0.8,  bloom: 0.35, fillIntensity: 1.0 },
};

export class CinematicPipelinePlugin {
    /**
     * @param {Object} [opts]
     * @param {string} [opts.preset='golden_hour']
     * @param {boolean} [opts.sky=true]      - cielo atmosférico
     * @param {boolean} [opts.ssao=true]     - oclusión ambiental en pantalla
     * @param {boolean} [opts.bloom=true]
     * @param {boolean} [opts.lights=true]   - key + hemi + fill (apagar si la escena trae las suyas)
     * @param {number}  [opts.shadowExtent=18] - semiancho del volumen de sombra
     */
    constructor(opts = {}) {
        this.name = 'CinematicPipelinePlugin';
        this.opts = opts;
        this.P = { ...PRESETS[opts.preset || 'golden_hour'], ...(opts.overrides || {}) };
        this.core = null; this.composer = null;
        this.sky = null; this.key = null; this.sunDir = new THREE.Vector3();
        // callback listo para pasar a startLoop(update, renderFn)
        this.renderFn = () => { if (this.composer) this.composer.render(); };
    }

    onInit(core) {
        this.core = core;
        const { scene, camera, renderer } = core;
        const P = this.P;

        // 1) look filmico
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = P.exposure;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 2) cielo (Rayleigh/Mie) + dirección del sol
        this.sunDir.setFromSphericalCoords(1,
            THREE.MathUtils.degToRad(90 - P.elevation), THREE.MathUtils.degToRad(P.azimuth));
        if (this.opts.sky !== false) {
            this.sky = new Sky(); this.sky.scale.setScalar(45000);
            const u = this.sky.material.uniforms;
            u.turbidity.value = P.turbidity; u.rayleigh.value = P.rayleigh;
            u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.86;
            u.sunPosition.value.copy(this.sunDir);
            scene.add(this.sky);
        }

        // 3) luces: key con sombra + hemisferio + relleno frontal
        //    ⚠ COMPATIBILIDAD CON CSM: el CascadedShadowPlugin crea UNA DirectionalLight
        //    por cascada y su shader indexa CSM_cascades[i] para CADA direccional de la
        //    escena. Si añadimos direccionales extra, el índice se sale del array y el
        //    fragment shader no compila. Por eso con `directionalLights:false` damos la
        //    misma iluminación con luces NO direccionales (hemisferio + puntual).
        if (this.opts.lights !== false && this.opts.directionalLights === false) {
            scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x2a2418, P.hemi * 1.4));
            const fillP = new THREE.PointLight(0xfff4e6, P.fillIntensity * 60, 120, 2);
            fillP.position.set(3, 9, 14); scene.add(fillP);
            this.fill = fillP;
            console.log('🎬 [CinematicPipelinePlugin] modo CSM-compatible: sin luces direccionales propias');
        } else if (this.opts.lights !== false) {
            this.key = new THREE.DirectionalLight(P.keyColor, P.keyIntensity);
            this.key.position.copy(this.sunDir).multiplyScalar(60);
            this.key.castShadow = true;
            this.key.shadow.mapSize.set(2048, 2048);
            const d = this.opts.shadowExtent ?? 18;
            Object.assign(this.key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 160 });
            this.key.shadow.bias = -0.0006; this.key.shadow.normalBias = 0.03;
            this.key.shadow.camera.updateProjectionMatrix();
            scene.add(this.key);
            scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x2a2418, P.hemi));
            const fill = new THREE.DirectionalLight(0xfff4e6, P.fillIntensity);
            fill.position.set(2, 7, 16); scene.add(fill);
            this.fill = fill;
        }

        // 4) composer: render -> SSAO -> bloom -> salida
        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));
        if (this.opts.ssao !== false) {
            this.ssao = new SSAOPass(scene, camera, innerWidth, innerHeight);
            this.ssao.kernelRadius = 0.35; this.ssao.minDistance = 0.0012; this.ssao.maxDistance = 0.09;
            this.composer.addPass(this.ssao);
        }
        if (this.opts.bloom !== false) {
            this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), P.bloom, 0.75, 0.85);
            this.composer.addPass(this.bloom);
        }
        this.composer.addPass(new OutputPass());

        this._onResize = () => this.composer.setSize(innerWidth, innerHeight);
        addEventListener('resize', this._onResize);

        console.log(`🎬 [CinematicPipelinePlugin] preset "${this.opts.preset || 'golden_hour'}" · ${this.composer.passes.length} passes`);
    }

    /** Cambia de preset en caliente (para un beat dirigido, un ciclo día/noche…) */
    setPreset(name) {
        const P = PRESETS[name]; if (!P || !this.core) return false;
        this.P = P;
        this.core.renderer.toneMappingExposure = P.exposure;
        this.sunDir.setFromSphericalCoords(1,
            THREE.MathUtils.degToRad(90 - P.elevation), THREE.MathUtils.degToRad(P.azimuth));
        if (this.sky) {
            const u = this.sky.material.uniforms;
            u.turbidity.value = P.turbidity; u.rayleigh.value = P.rayleigh;
            u.sunPosition.value.copy(this.sunDir);
        }
        if (this.key) {
            this.key.position.copy(this.sunDir).multiplyScalar(60);
            this.key.color.set(P.keyColor); this.key.intensity = P.keyIntensity;
        }
        if (this.fill) this.fill.intensity = P.fillIntensity;
        if (this.bloom) this.bloom.strength = P.bloom;
        return true;
    }

    onUpdate(_dt) { /* estático por ahora; setPreset() mueve el sol bajo demanda */ }

    dispose() {
        removeEventListener('resize', this._onResize);
        this.composer?.dispose?.();
    }
}
