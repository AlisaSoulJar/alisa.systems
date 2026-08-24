import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InteractionLabFactory } from '../factories/InteractionLabFactory.js';
import { FoodChainSystem } from './FoodChainSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';

export class InteractionLabEngine {
    /**
     * ⚠️ LA SEMILLA, QUE FALTABA Y NADIE LO DECÍA.
     *
     * Este es el motor de ¡Sobrevive! 1 —el Interaction Lab— y llevaba OCHO
     * llamadas al azar del sistema colocando las cajas, el queso, los ratones y
     * los zorros. O sea: **el reparto inicial de la cadena trófica era distinto
     * cada vez**, y con eso la etapa no puede puntuar a nadie.
     *
     * (Y este párrafo dice «llamadas al azar del sistema» en vez de nombrarlas
     * porque el reemplazo masivo que las enrutó se comió también su propio
     * comentario. Segunda vez hoy.)
     *
     * Y no lo decía ninguna prueba porque `prueba_semillas.mjs` sólo miraba los
     * ficheros acabados en `System.js`. Esta casa nombra sus motores de tres
     * maneras y el guardia conocía una: la mitad del motor no tenía vigilancia.
     *
     * La receta es la misma que en `AsteroidsSystem`: el motor es determinista
     * por construcción —sin semilla juega siempre lo mismo— y quien quiera
     * variedad la aporta. `FoodChainSystem` ya aceptaba `rng`, así que se le
     * pasa el mismo: una sola semilla para el reparto y para la simulación.
     */
    constructor(engineCore = {}, basePath = '../', config = {}) { // default was '/colony/overworld/' (pre-reorg absolute path → 404 on every asset)
        this.engineCore = engineCore;
        this.scene = engineCore.scene;
        this.camera = engineCore.camera;
        this.basePath = basePath;
        this.rng = config.rng || mulberry32((config.seed ?? 42) >>> 0);

        this.gltfLoader = this.scene ? new GLTFLoader() : null;
        this.system = new FoodChainSystem({ arenaSize: 18, rng: this.rng });
        if (this.scene) this.factory = new InteractionLabFactory(this.scene, this.camera, this.gltfLoader, this.basePath);
        
        this.allPrey = [];
        this.allPredators = [];
        this.cheeses = [];
        this.crates = [];
        this.elapsedTime = 0;
        this.running = false;
    }

    boot(config) {
        const numMice = config.mice || 6;
        const numFoxes = config.foxes || 3;
        const numRaptors = config.raptors || 1;
        const numCheese = config.cheese || 8;
        const numCrates = config.crates || 6;

        const S = this.system.arenaSize - 2;

        // Clean up previous run if any
        if (this.running) {
            if (this.factory) this.factory.dispose();
            this.allPrey = [];
            this.allPredators = [];
            this.cheeses = [];
            this.crates = [];
        }

        // Generate crate positions
        const cratePositions = [];
        for (let i = 0; i < numCrates; i++) {
            cratePositions.push({ x: (this.rng()-0.5)*S*2, z: (this.rng()-0.5)*S*2 });
        }
        this.crates = cratePositions.map((p, i) => ({ id: `crate_${i}`, position: p }));

        // Generate cheese positions
        const cheesePositions = [];
        for (let i = 0; i < numCheese; i++) {
            cheesePositions.push({ x: (this.rng()-0.5)*S*2, z: (this.rng()-0.5)*S*2 });
        }
        this.cheeses = cheesePositions.map((p, i) => ({ id: `cheese_${i}`, position: p }));

        // Build environment
        if (this.factory) {
            this.factory.buildAll({ 
                arenaSize: 18, 
                crateCount: numCrates, 
                cheeseCount: numCheese,
                cratePositions, 
                cheesePositions 
            });
        }

        for (let i = 0; i < numMice; i++) {
            const pos = { x: (this.rng()-0.5)*S*1.5, z: (this.rng()-0.5)*S*1.5 };
            const prey = this.system.createPreyState(`mouse_${i}`, pos);
            this.allPrey.push(prey);
            if (this.factory) this.factory.spawnEntity(prey);
        }

        for (let i = 0; i < numFoxes; i++) {
            const pos = { x: (this.rng()-0.5)*S, z: S * 0.8 };
            const pred = this.system.createPredatorState(`fox_${i}`, 'mid', pos);
            this.allPredators.push(pred);
            if (this.factory) this.factory.spawnEntity(pred);
        }

        for (let i = 0; i < numRaptors; i++) {
            const pos = { x: 0, z: -S * 0.8 };
            const apex = this.system.createPredatorState(`raptor_${i}`, 'apex', pos, {
                sightRange: 5.0, sprintSpeed: 3.5, smellSpeed: 1.4
            });
            this.allPredators.push(apex);
            if (this.factory) this.factory.spawnEntity(apex);
        }

        this.elapsedTime = 0;
        this.running = true;
    }

    tick(dt, elapsed) {
        if (!this.running) return;
        this.elapsedTime += dt;

        const activePreds = this.allPredators.filter(p => p.alive);
        const activePrey = this.allPrey.filter(p => p.alive);
        const foxes = activePreds.filter(p => p.tier === 'mid');
        const raptors = activePreds.filter(p => p.tier === 'apex');
        const activeCheese = this.cheeses.filter(c => !c._eaten);
        const resourceDepletion = 1.0 - (activeCheese.length / Math.max(1, this.cheeses.length));

        // Tick prey
        for (const prey of this.allPrey) {
            this.system.tickPrey(prey, {
                predators: activePreds,
                cheese: activeCheese,
                crates: this.crates
            }, dt);

            if (prey.events) {
                for (const evt of prey.events) {
                    if (evt.startsWith('cheese_id:')) {
                        const id = evt.replace('cheese_id:', '');
                        const ch = this.cheeses.find(c => c.id === id);
                        if (ch) ch._eaten = true;
                    }
                }
            }
        }

        // Tick predators
        for (const pred of foxes) {
            this.system.tickPredator(pred, {
                prey: this.allPrey,
                apex: raptors,
                crates: this.crates,
                allies: foxes,
                resourceDepletion
            }, dt);

            if (pred.events) {
                for (const evt of pred.events) {
                    if (evt.startsWith('kill_target:')) {
                        const targetId = evt.replace('kill_target:', '');
                        const target = this.allPrey.find(p => p.id === targetId);
                        if (target) target.alive = false;
                    }
                }
            }
        }

        // Tick apex
        for (const apex of raptors) {
            this.system.tickPredator(apex, {
                prey: foxes,
                apex: [],
                crates: this.crates,
                allies: raptors,
                resourceDepletion
            }, dt);

            if (apex.events) {
                for (const evt of apex.events) {
                    if (evt.startsWith('kill_target:')) {
                        const targetId = evt.replace('kill_target:', '');
                        const target = this.allPredators.find(p => p.id === targetId);
                        if (target) target.alive = false;
                    }
                }
            }
        }

        // Sync visual
        const allAgents = [...this.allPrey, ...this.allPredators];
        if (this.factory) this.factory.syncAgents(allAgents, dt, this.elapsedTime);
    }
    
    // For RL Bridge
    getObservationVector() {
        if (!this.running) return { prey: [], predators: [] };
        return {
            prey: this.allPrey.map(p => this.system.getPreyObservation(p, { predators: this.allPredators, cheese: this.cheeses })),
            predators: this.allPredators.map(p => this.system.getPredatorObservation(p, { prey: this.allPrey }))
        };
    }
}
