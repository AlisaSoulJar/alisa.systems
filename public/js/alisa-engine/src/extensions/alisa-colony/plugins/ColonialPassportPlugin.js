import * as THREE from 'three';
import { AssetManager } from '../../../soma/AssetManager.js';
import { ProceduralRiggingEngine } from '../../../world/systems/ProceduralRiggingEngine.js';

/**
 * [ColonialPassportPlugin]
 * Hooks into the Hub's /beings/search to discover instantiated Beings,
 * fetches their official passport manifest from /beings_passports/,
 * and loads the corresponding rigged avatar into the scene.
 */
export class ColonialPassportPlugin {
    /**
     * @param {string} hubUrl
     * @param {Object} [opts]
     * @param {string} [opts.passportBase] - where passport JSONs are served from
     * @param {string} [opts.assetBase]    - where avatar GLBs are served from
     * Bases are configurable and default to paths relative to a page in /labs/ or /rooms/.
     * (Were hardcoded '/colony/overworld/...' — a pre-reorg absolute path that 404s everywhere.)
     */
    constructor(hubUrl = 'http://127.0.0.1:8741', opts = {}) {
        this.name = 'ColonialPassportPlugin';
        this.hubUrl = hubUrl;
        this.passportBase = opts.passportBase || '../data/beings_passports/';
        this.assetBase = opts.assetBase || '../props/ready/';
        this.activePassports = new Map();
        this.riggingEngine = new ProceduralRiggingEngine();
    }

    onInit(core) {
        this.core = core;
        console.log(`[ColonialPassportPlugin] 🛂 Initialized. Connecting to Registry at ${this.hubUrl}`);
        this.pollRegistry();
        // Poll every 10 seconds for new passports
        setInterval(() => this.pollRegistry(), 10000);
    }

    async pollRegistry() {
        try {
            const res = await fetch(`${this.hubUrl}/beings/search`);
            if (!res.ok) return;
            const data = await res.json();
            const aliveBeings = data.beings.filter(b => b.instantiated).map(b => b.name);

            for (const name of aliveBeings) {
                if (this.activePassports.has(name)) continue;
                this.activePassports.set(name, { loading: true });

                const passportUrl = `${this.passportBase}${name.toLowerCase()}_passport.json`;
                try {
                    const passRes = await fetch(passportUrl);
                    if (!passRes.ok) {
                        this.activePassports.delete(name); // Try again later
                        continue;
                    }
                    const passport = await passRes.json();
                    
                    if (passport.status === "APPROVED" || passport.status === "ACTIVE") {
                        await this.instantiatePassport(passport);
                    } else {
                        this.activePassports.delete(name);
                    }
                } catch (e) {
                    console.warn(`[ColonialPassportPlugin] Failed to read passport for ${name}:`, e);
                    this.activePassports.delete(name);
                }
            }
        } catch (e) {
            console.warn(`[ColonialPassportPlugin] Hub Registry unreachable:`, e);
        }
    }

    async instantiatePassport(passport) {
        console.log(`[ColonialPassportPlugin] 🛂 Instantiating avatar for ${passport.name}`);

        let model;
        try {
            const modelName = passport.model_path || `${passport.name.toLowerCase()}.glb`;
            const modelUrl = `${this.assetBase}${modelName}`;
            model = await AssetManager.loadModelAsync(modelUrl);
        } catch (e) {
            console.warn(`[ColonialPassportPlugin] GLB not found for ${passport.name}, using fallback Box.`);
            const geo = new THREE.BoxGeometry(1, 2, 1);
            const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            model = new THREE.Mesh(geo, mat);
            model.name = passport.name;
        }

        // Normalizar la altura base a 2 metros antes de aplicar la escala del pasaporte
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const normalizeScale = 2.0 / (size.y || 1);
        
        const finalScale = (passport.scale || 1.0) * normalizeScale;
        model.scale.set(finalScale, finalScale, finalScale);

        // Position them in a circle around origin
        const idx = this.activePassports.size;
        const angle = idx * (Math.PI * 2 / 5);
        
        // Ajustar Y para que los pies toquen el suelo exacto
        const adjBox = new THREE.Box3().setFromObject(model);
        model.position.set(Math.cos(angle) * 8, -adjBox.min.y, Math.sin(angle) * 8);

        let rigged = false;
        if (passport.kinematics && model.isGroup) {
            rigged = this.riggingEngine.extractAndMapSkeleton(model);
        }

        this.core.add(model);
        this.activePassports.set(passport.name, { model, rigged, passport });
        console.log(`[ColonialPassportPlugin] ✅ ${passport.name} instantiated. Rigged: ${rigged}`);
    }

    onUpdate(dt) {
        // Here we could update IK solving based on passport.kinematics if the riggingEngine supported it per-frame
    }
}
