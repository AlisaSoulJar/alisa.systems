import * as THREE from 'three';
import { FSMSystem } from '../../psyche/FSMSystem.js';

/**
 * TrafficSystem.js — Urban Grid Traffic and Pedestrian Simulation
 * ===============================================================
 * Replaces inline SimEntity from CarverEnvironmentFactory.
 * Uses FSMSystem to allow complex urban behaviors (yield, park, etc.)
 */

export class TrafficSystem {
    /**
     * @param {THREE.Scene} scene 
     * @param {Array<Array<number>>} navGrid - 2D array (0=road, 1=building, 2=sidewalk)
     * @param {Array<Array<number>>} elevationGrid - 2D array of heights
     * @param {Object} options - Visual and scaling options
     */
    constructor(scene, navGrid, elevationGrid, options = {}) {
        this.scene = scene;
        this.navGrid = navGrid;
        this.elevationGrid = elevationGrid;
        
        this.tileSize = options.tileSize || 4;
        this.stepHeight = options.stepHeight || 4;
        
        this.gridW = navGrid[0].length;
        this.gridH = navGrid.length;
        
        this.agents = [];
        this.matBase = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 });
        this.lineMatYellow = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 });
        this.lineMatCyan = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
    }

    spawnAgent(x, y, isDrone = false) {
        const agent = new TrafficAgent(x, y, this, isDrone);
        this.agents.push(agent);
        this.scene.add(agent.mesh);
        return agent;
    }

    update(dt) {
        for (const agent of this.agents) {
            agent.update(dt);
        }
    }
}

class TrafficAgent {
    constructor(startX, startY, system, isDrone) {
        this.system = system;
        
        // Blackboard data
        this.bb = {
            cx: startX, cy: startY,
            tx: startX, ty: startY,
            lastX: startX, lastY: startY,
            progress: 0,
            speed: 0.5 + Math.random() * 1.5,
            navGrid: system.navGrid,
            elevationGrid: system.elevationGrid,
            gridW: system.gridW,
            gridH: system.gridH,
            tileSize: system.tileSize,
            stepHeight: system.stepHeight,
            mesh: null
        };
        
        // Build Mesh
        const geo = isDrone ? new THREE.SphereGeometry(0.3, 4, 4) : new THREE.CylinderGeometry(0.2, 0.2, 1.2, 4);
        this.bb.mesh = new THREE.Mesh(geo, system.matBase);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), isDrone ? system.lineMatYellow : system.lineMatCyan);
        this.bb.mesh.add(wire);
        this._updateWorldPosition(this.bb.cx, this.bb.cy, this.bb.cx, this.bb.cy, 0);

        // FSM Setup
        this.fsm = new FSMSystem(['idle', 'drive', 'decide'], 'decide');
        this.fsm.blackboard = this.bb;

        // State: Decide (Pick next target tile)
        this.fsm.addState('decide', (bb) => {
            const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
            const options = [];
            
            for(let d of dirs) {
                let nx = bb.cx + d.dx;
                let ny = bb.cy + d.dy;
                if (nx >= 0 && nx < bb.gridW && ny >= 0 && ny < bb.gridH) {
                    if (bb.navGrid[ny][nx] === 0 || bb.navGrid[ny][nx] === 2) {
                        let weight = (nx === bb.lastX && ny === bb.lastY) ? 1 : 10;
                        for(let i=0; i<weight; i++) options.push({x:nx, y:ny});
                    }
                }
            }
            if(options.length > 0) {
                let choice = options[Math.floor(Math.random() * options.length)];
                bb.lastX = bb.cx; bb.lastY = bb.cy;
                bb.tx = choice.x; bb.ty = choice.y;
                bb.progress = 0;
            }
        });

        // State: Drive (Move linearly to target tile)
        this.fsm.addState('drive', (bb, dt) => {
            bb.progress += bb.speed * dt;
            if (bb.progress > 1.0) bb.progress = 1.0;
            this._updateWorldPosition(bb.cx, bb.cy, bb.tx, bb.ty, bb.progress);
        });

        // Transitions
        this.fsm.addTransition('decide', 'drive', (bb) => bb.tx !== bb.cx || bb.ty !== bb.cy);
        this.fsm.addTransition('drive', 'decide', (bb) => {
            if (bb.progress >= 1.0) {
                bb.cx = bb.tx; bb.cy = bb.ty;
                return true;
            }
            return false;
        });
    }

    _updateWorldPosition(cx, cy, tx, ty, t) {
        const px1 = cx * this.bb.tileSize;
        const pz1 = cy * this.bb.tileSize;
        const py1 = this.bb.elevationGrid[cy][cx] * this.bb.stepHeight;
        
        const px2 = tx * this.bb.tileSize;
        const pz2 = ty * this.bb.tileSize;
        const py2 = this.bb.elevationGrid[ty][tx] * this.bb.stepHeight;
        
        const lx = px1 + (px2 - px1) * t;
        const ly = py1 + (py2 - py1) * t;
        const lz = pz1 + (pz2 - pz1) * t;
        
        const bobY = Math.sin(t * Math.PI) * 0.5; 
        this.bb.mesh.position.set(lx, ly + 1.0 + bobY, lz);
    }

    get mesh() {
        return this.bb.mesh;
    }

    update(dt) {
        this.fsm.tick(dt);
    }
}
