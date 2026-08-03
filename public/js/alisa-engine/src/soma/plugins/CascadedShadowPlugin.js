import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';

/**
 * CascadedShadowPlugin
 * ═══════════════════════════════════════════════════════════════
 * Sombras en CASCADA (CSM): divide el frustum en N cascadas y da a cada una
 * su propio shadow map. Resultado: sombras nítidas cerca Y a distancia, que es
 * justo lo que una sola DirectionalLight no puede hacer (o pixela cerca, o
 * pierde el fondo).
 *
 * Es la técnica que usan los motores AAA para exteriores grandes (calles,
 * distritos del CarverSystem, el overworld).
 *
 * USO:
 *   app.registerPlugin(new CascadedShadowPlugin({ cascades:4, maxFar:120 }));
 *   // el onUpdate del pipeline lo actualiza solo cada frame
 *
 * NOTA: CSM parchea los materiales que gestiona. Los materiales creados DESPUÉS
 * deben registrarse con plugin.setupMaterial(mat).
 */
export class CascadedShadowPlugin {
    /**
     * @param {Object} [opts]
     * @param {number} [opts.cascades=4]
     * @param {number} [opts.maxFar=120]      - distancia máxima con sombra
     * @param {number} [opts.shadowMapSize=2048]
     * @param {THREE.Vector3} [opts.lightDirection] - por defecto, sol de tarde
     * @param {number} [opts.lightIntensity=2.4]
     * @param {string} [opts.mode='practical'] - 'uniform' | 'logarithmic' | 'practical'
     */
    constructor(opts = {}) {
        this.name = 'CascadedShadowPlugin';
        this.opts = opts;
        this.csm = null;
        this._pending = [];   // materiales a registrar cuando exista el CSM
    }

    onInit(core) {
        this.core = core;
        const o = this.opts;
        core.renderer.shadowMap.enabled = true;
        core.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.csm = new CSM({
            maxFar: o.maxFar ?? 120,
            cascades: o.cascades ?? 4,
            mode: o.mode || 'practical',
            parent: core.scene,
            shadowMapSize: o.shadowMapSize ?? 2048,
            lightDirection: (o.lightDirection || new THREE.Vector3(-0.6, -1, -0.45)).normalize(),
            camera: core.camera,
            lightIntensity: o.lightIntensity ?? 2.4,
        });
        this.csm.fade = true;   // transición suave entre cascadas (sin costuras visibles)

        // ⚠ GUARDA DE INTEGRACIÓN: el shader del CSM indexa CSM_cascades[i] para CADA
        // DirectionalLight de la escena. Si hay direccionales que no son suyas, el índice
        // se sale del array y el fragment shader NO COMPILA (pantalla negra + spam WebGL).
        // Detectarlo aquí ahorra horas de depurar un error críptico de GLSL.
        const foreign = [];
        core.scene.traverse(n => {
            if (n.isDirectionalLight && !this.csm.lights.includes(n)) foreign.push(n.name || '(sin nombre)');
        });
        if (foreign.length) {
            console.error(`🌒 [CascadedShadowPlugin] ⚠ CONFLICTO: ${foreign.length} DirectionalLight(s) ajena(s) ` +
                `en la escena [${foreign.join(', ')}]. El CSM debe ser la ÚNICA fuente direccional o el shader ` +
                `fallará con "array index out of range". Usa luces puntuales/hemisféricas para el relleno, ` +
                `o CinematicPipelinePlugin({ directionalLights: false }).`);
        }

        // registrar todo lo que YA está en la escena
        core.scene.traverse(n => { if (n.isMesh && n.material) this.setupMaterial(n.material); });
        this._pending.forEach(m => this.csm.setupMaterial(m));
        this._pending.length = 0;

        console.log(`🌒 [CascadedShadowPlugin] ${this.csm.cascades} cascadas · maxFar ${this.csm.maxFar}`);
    }

    /** Registra un material (o array) para que reciba las sombras en cascada. */
    setupMaterial(mat) {
        const list = Array.isArray(mat) ? mat : [mat];
        for (const m of list) {
            if (!m || m.__csm) continue;
            if (this.csm) { this.csm.setupMaterial(m); m.__csm = true; }
            else this._pending.push(m);
        }
    }

    /** Conveniencia: registra todos los materiales de un objeto recién añadido. */
    register(object3d) {
        object3d.traverse(n => { if (n.isMesh && n.material) this.setupMaterial(n.material); });
    }

    /** Alinea el sol (p.ej. para seguir al CinematicPipelinePlugin). */
    setSunDirection(dir) {
        if (this.csm) this.csm.lightDirection.copy(dir).normalize();
    }

    onUpdate(_dt) {
        if (!this.csm) return;
        this.csm.update();          // recalcula las cascadas según la cámara
    }

    dispose() { this.csm?.dispose?.(); }
}
