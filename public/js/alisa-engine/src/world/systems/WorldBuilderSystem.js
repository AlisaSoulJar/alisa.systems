// ATENCION: este import faltaba. El modulo usaba THREE. sin importarlo, o sea que
// dependia de que alguien hubiera dejado la global puesta con un <script> clasico:
// funcionaba EN SU PAGINA y en ninguna otra. Un modulo que solo funciona donde
// nacio no es un modulo. Lo destapo clasificar_piezas.mjs sobre las 179 piezas.
import * as THREE from 'three';

import { EnvironmentFactory } from '../factories/EnvironmentFactory.js';

/**
 * WorldBuilderEngine (The "Croupier")
 * Parses declarative JSON manifests and assembles fully operational
 * Three.js scenes and corresponding mathematical arrays for the logic engines.
 */
export class WorldBuilderSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        
        // Logical storage for physics/RL layers
        this.state = {
            buildings: [],
            props: [],
            foliage: [],
            agents: []
        };
        
        // Dictionary to lookup instantiated Three.js groups by ID
        this.registry = {};
    }

    /**
     * Build an entire world from a JSON manifest.
     * @param {Object} manifest { atmosphere, terrain, structures, props }
     */
    build(manifest) {
        if (manifest.atmosphere) this._buildAtmosphere(manifest.atmosphere);
        if (manifest.terrain) this._buildTerrain(manifest.terrain);
        if (manifest.structures) this._buildStructures(manifest.structures);
        if (manifest.props) this._buildProps(manifest.props);
        if (manifest.agents) this._buildAgents(manifest.agents);
        
        // TENSEGRITY ROUTING: Store logical config, but don't run math here
        if (manifest.camera) this.state.cameraCfg = manifest.camera;
        if (manifest.kinematics) this.state.kinematicCfg = manifest.kinematics;
        
        console.log(`[WorldBuilder] Manifest built.` +
                    `\nBuildings: ${this.state.buildings.length}` + 
                    `\nProps: ${this.state.props.length}` +
                    `\nAgents: ${this.state.agents.length}`);
        return this.state;
    }

    _buildAtmosphere(config) {
        if (config.type === 'DARK_ROOM') {
            this.scene.background = new THREE.Color(config.fogColor || 0x010101);
            this.scene.fog = new THREE.FogExp2(config.fogColor || 0x010101, config.fogDensity || 0.05);
            const ambient = new THREE.AmbientLight(config.ambientLight || 0x222233, 1.0);
            this.scene.add(ambient);
        } else if (config.type === 'CYBERSPACE') {
            this.scene.background = new THREE.Color(config.fogColor || 0x050a15);
            this.scene.fog = new THREE.FogExp2(config.fogColor || 0x050a15, config.fogDensity || 0.005);
            const ambient = new THREE.AmbientLight(config.ambientLight || 0x112233, 1.0);
            this.scene.add(ambient);
        }

        // TENSEGRITY: Invoke visual effects from Volumetrics Engine
        if (config.vfx && Array.isArray(config.vfx)) {
            if (typeof VolumetricsEngine !== 'undefined') {
                config.vfx.forEach(effect => {
                    let mesh;
                    if (effect.type === 'ambient_dust') {
                        mesh = VolumetricsEngine.generateAmbientDustParticles(
                            effect.count || 200, effect.roomW || 200, effect.roomD || 200, effect.wallH || 50
                        );
                    } else if (effect.type === 'appliance_beam') {
                        mesh = VolumetricsEngine.createApplianceBeam(effect.appliance || 'bulb');
                        if (effect.x !== undefined) mesh.position.set(effect.x, effect.y || 0, effect.z || 0);
                        if (effect.rotationX) mesh.rotation.x = effect.rotationX;
                    }
                    
                    if (mesh) {
                        this.scene.add(mesh);
                        // Save a reference if it needs animation (like dust drifting)
                        if (!this.state.vfx) this.state.vfx = [];
                        this.state.vfx.push({ type: effect.type, mesh });
                    }
                });
            } else {
                console.warn("[WorldBuilder] VFX requested but VolumetricsEngine is undefined.");
            }
        }
    }

    _buildTerrain(config) {
        if (config.type === 'CITY_GRID' || config.type === 'FLOOR') {
            const w = config.size[0] || 100;
            const d = config.size[1] || 100;
            const geo = new THREE.PlaneGeometry(w, d);
            const mat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 });
            const floor = new THREE.Mesh(geo, mat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.scene.add(floor);

            if (config.type === 'CITY_GRID') {
                const grid = new THREE.GridHelper(w, w/2, 0x000000, 0x444455);
                grid.position.y = 0.05;
                grid.material.opacity = 0.5;
                grid.material.transparent = true;
                this.scene.add(grid);
            }
        } else if (config.type === 'SPACE') {
            const stars = EnvironmentFactory.createStarBlock(config.starCount || 500, config.starRadius || 2000);
            this.scene.add(stars);
        } else if (config.type === 'BSP_ROOM') {
            // Needs BSPRenderEngine available to generate the layout
            if (typeof BSPRenderEngine !== 'undefined') {
                 const layout = BSPRenderEngine.generateBSPTopology(
                     mulberry32(config.seed || 1234), 
                     config.size[0], config.size[1], config.cuts || 4
                 );
                 const room = EnvironmentFactory.createBSPRoom(layout, config.size[0], config.size[1]);
                 this.scene.add(room);
            } else {
                 console.warn("WorldBuilderEngine: BSP_ROOM requested but BSPRenderEngine is undefined.");
            }
        }
    }

    _buildStructures(structures) {
        structures.forEach(struct => {
            if (struct.type === 'building') {
                let mesh;
                if (struct.style === 'corporate') {
                    // Extract Corporate Skyscraper using the local Factory
                    const bldgData = EnvironmentFactory.createCorporateSkyscraper(struct.floors || 18, struct.w || 100, struct.h || 12, struct.d || 100);
                    mesh = bldgData.mesh;
                    mesh.position.set(struct.x || 0, 0, struct.z || 0);
                    this.scene.add(mesh);
                    
                    if (struct.id) {
                         this.registry[struct.id] = mesh;
                    }
                    this.state.buildings.push({ id: struct.id, mesh, type: struct.style, floors: bldgData.floors });
                }
                else if (typeof BuildingFactory !== 'undefined') {
                     // Legacy templated building architecture (Residential, Shop, Skyscraper via legacy)
                     mesh = BuildingFactory.create(struct.style || 'skyscraper', 'sky', 0, {
                         x: struct.x || 0,
                         z: struct.z || 0,
                         scale: struct.scale || 1.0
                     });
                     
                     this.scene.add(mesh);
                     if (struct.id) {
                         this.registry[struct.id] = mesh;
                         const bbox = new THREE.Box3().setFromObject(mesh);
                         mesh.userData.roofY = bbox.max.y;
                     }
                     this.state.buildings.push({ id: struct.id, mesh, type: struct.style });
                }
            } else if (struct.type === 'forest') {
                const forest = EnvironmentFactory.createForest(struct.count || 50, struct.size[0], struct.size[1]);
                if (struct.x !== undefined) forest.position.x = struct.x;
                if (struct.z !== undefined) forest.position.z = struct.z;
                this.scene.add(forest);
                this.state.foliage.push({ id: struct.id, mesh: forest });
            } else if (struct.type === 'planet') {
                const planet = EnvironmentFactory.createProceduralPlanet(struct.radius || 150, struct.color || 0x88ccff);
                if (struct.x !== undefined) planet.position.x = struct.x;
                if (struct.y !== undefined) planet.position.y = struct.y;
                if (struct.z !== undefined) planet.position.z = struct.z;
                this.scene.add(planet);
            }
        });
    }

    _buildProps(props) {
        props.forEach(prop => {
            let mesh;
            
            // Temporary generic shapes if factory doesn't support it yet
            if (prop.type === 'chair') {
                mesh = EnvironmentFactory.createProp('chair', prop.scale || 1.0);
            } else if (prop.type === 'raccoon') {
                mesh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8),
                    new THREE.MeshStandardMaterial({color: 0x888888})
                );
                mesh.position.y = 0.75;
                mesh.castShadow = true;
            } else if (prop.type === 'bsp_cabinet') {
                // Initialize the logic engine
                if (typeof ScummInteractionEngine !== 'undefined') {
                    const engine = new ScummInteractionEngine();
                    engine.initEpisode(prop.seed || 42, prop.cuts || 3, prop.stage || 1, prop.snakes || 0, prop.batteries || 0, prop.mode || 'blind');
                    const bspState = engine.state;
                    mesh = EnvironmentFactory.createBSPCabinet(bspState.partition, bspState.lockedDrawers, prop.aspect || 0.7, prop.scale || 1.0);
                    mesh.userData.logicEngine = engine;
                } else {
                    console.warn("[WorldBuilder] bsp_cabinet requested but ScummInteractionEngine is undefined.");
                    mesh = new THREE.Group();
                }
            } else {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
            }

            // Resolve Relative Positioning
            let startY = 0;
            let startX = prop.x || 0;
            let startZ = prop.z || 0;

            if (prop.parentId && this.registry[prop.parentId]) {
                const parentMesh = this.registry[prop.parentId];
                startX += parentMesh.position.x;
                startZ += parentMesh.position.z;

                if (prop.parentFloor === 'roof') {
                    startY = parentMesh.userData.roofY || parentMesh.position.y;
                }
            }

            mesh.position.set(startX, startY, startZ);
            this.scene.add(mesh);
            this.state.props.push({ id: prop.id, type: prop.type, mesh });
        });
    }

    _buildAgents(agents) {
        agents.forEach(agent => {
            let config = { ...agent, meshes: [] };

            let startY = 0;
            let startX = agent.x || 0;
            let startZ = agent.z || 0;

            if (agent.parentId && this.registry[agent.parentId]) {
                const parentMesh = this.registry[agent.parentId];
                startX += parentMesh.position.x;
                startZ += parentMesh.position.z;
                if (agent.parentFloor === 'roof') {
                    startY = parentMesh.userData.roofY || parentMesh.position.y;
                }
            }

            if (agent.type === 'boid_swarm') {
                const count = agent.count || 20;
                for (let i = 0; i < count; i++) {
                    const mesh = EnvironmentFactory.createBoidProxy(agent.model || 'cucco');
                    // Scatter slightly around center point
                    mesh.position.set(
                        startX + (Math.random() - 0.5) * 10,
                        startY + (Math.random() * 2), // small lift
                        startZ + (Math.random() - 0.5) * 10
                    );
                    this.scene.add(mesh);
                    config.meshes.push(mesh);
                }
            } else if (agent.type === 'phantom') {
                const mesh = EnvironmentFactory.createPhantomProxy();
                mesh.position.set(startX, startY, startZ);
                this.scene.add(mesh);
                config.meshes.push(mesh);
            } else if (agent.type === 'katamari_ball') {
                const mesh = EnvironmentFactory.createKatamariProxy(agent.radius || 2.0);
                mesh.position.set(startX, startY + (agent.radius || 2.0), startZ);
                this.scene.add(mesh);
                config.meshes.push(mesh);
            }
            
            // Push definition and generated proxies to state for Bridge linking
            this.state.agents.push(config);
        });
    }
}
