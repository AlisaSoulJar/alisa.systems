import { ECSWorld } from '../OverworldECS.js';
import { EnergySystem, EnergyComponent } from './EnergySystem.js';
import { EcosystemSystem } from './EcosystemSystem.js';
import { FloorScanSystem } from './FloorScanSystem.js';
import { PheromoneGrid } from './PheromoneGrid.js';
import { SeededRNG } from '../core/SeededRNG.js';

export class ChopperAquariumEngine {
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CARTUCHO — Y ESTE ES EL QUE MEJOR EXPLICA PARA QUÉ SIRVE ESCRIBIRLO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Este motor tiene DOS juegos dentro y lo dice él mismo unas líneas más
     * abajo: un «¡Busca!» —rascacielos, plantas, escaneo, mapache escondido— y
     * un acuario con su cadena trófica. Pegados. Es la avería que se estaba
     * partiendo cuando se sacó `FloorScanSystem`.
     *
     * Puesto como tabla se ve de un vistazo lo que en 480 líneas no se veía: la
     * lista de piezas son las MISMAS que componen el dron de la torre y las
     * mismas que componen el submarino. O sea que no eran dos juegos raros: era
     * un cartucho de búsqueda y un cartucho de ecosistema en el mismo cartucho.
     *
     * ⚠️ NO SE PARTE HOY, Y NO ES PEREZA.
     *
     * Este motor no está sellado en `resultados/huellas.json` —no tiene notas
     * publicadas que proteger— pero tampoco tiene red: partirlo sin huella sería
     * refactorizar por fe. Se declara lo que hay, que ya es más de lo que había,
     * y la partición espera a tener con qué demostrarla.
     *
     * ⚠️ Y `plantas` NO SE ESCRIBE DOS VECES.
     *
     * El número de plantas está en `mundo` y el constructor se lo pasa a la
     * búsqueda desde ahí. Ponerlo también en los parámetros de `FloorScanSystem`
     * sería tener dos edificios: el día que uno subiera a 20 el escáner seguiría
     * buscando en 18 y el mapache podría estar donde nadie mira.
     */
    static ROM = {
        id: 'alisa/ChopperAquarium-v0',
        familia: 'tiempo_real',
        mundo: { plantas: 18, altoPlanta: 4.0, lado: 120, aire: 40 },
        vehiculo: { velMax: 25.0, salida: { x: 40.0, z: 40.0 }, empuje: { x: -10.0, y: 0.0, z: 10.0 } },
        sistemas: [
            ['FloorScanSystem', { cuestaFallar: 5, margen: 1 }],
            ['EnergySystem', { maxEnergy: 100, currentEnergy: 100, drainRate: 0, hasDevice: true, isOn: true }],
            ['EcosystemSystem', {}],
            ['PheromoneGrid', { celda: 8.0, evapora: 5.0 }],
        ],
    };

    /** Los números con los que este cartucho llama a una pieza. */
    static params(pieza) {
        return ChopperAquariumEngine.ROM.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor() {
        this.listeners = {};

        // Configuration
        const { mundo, vehiculo } = ChopperAquariumEngine.ROM;
        this.totalFloors = mundo.plantas;
        this.FL_H = mundo.altoPlanta;
        this.TANK_SIZE = mundo.lado;
        this.TANK_HEIGHT = this.totalFloors * this.FL_H + mundo.aire;
        
        // State
        this.gameState = { playing: false, ended: false, activeFloor: -1, isAI: true };
        
        // ECS integration
        this.ecs = new ECSWorld();
        this.energySys = new EnergySystem();
        this.ecs.addSystem(this.energySys.update.bind(this.energySys), ['EnergyComponent']);
        this.chopperEntity = this.ecs.createEntity();
        
        this.chopper = { x: vehiculo.salida.x, y: (this.totalFloors * this.FL_H)/2.0, z: vehiculo.salida.z, rotY: 0.0 };
        this.chopperVelocity = { ...vehiculo.empuje };
        this.chopperTracking = { tx: vehiculo.salida.x, ty: (this.totalFloors * this.FL_H)/2.0, tz: vehiculo.salida.z };
        this.maxSpeed = vehiculo.velMax;
        
        this.chopperState = { mode: 'ROAM', targetFloor: -1, stateTimer: 1.0, scannedFloors: new Set() };

        this.targetFloorInfo = { index: -1 };

        /**
         * ⚠️ LA MITAD «¡BUSCA!» DE ESTE MOTOR, YA COMPUESTA EN VEZ DE ESCRITA.
         *
         * Este fichero tiene DOS juegos dentro —37 referencias al edificio y 30
         * al ecosistema— y por eso un helicóptero-pez escaneando un rascacielos
         * dentro de una pecera chirría: no es mala ambientación, son dos juegos
         * pegados. La portada del propio juego lo delata: «scanning a procedural
         * skyscraper for a hidden raccoon», que es la definición de la OTRA saga.
         *
         * Se extrae la mitad de búsqueda a `FloorScanSystem` y aquí se
         * COMPONE. Primer paso de la partición, y a propósito el que no cambia
         * nada: mismo número de tiradas, mismo orden, mismo resultado —
         * comprobado con `prueba_huella`, que vigila justo eso.
         */
        this.busqueda = new FloorScanSystem({
            plantas: this.totalFloors,
            ...ChopperAquariumEngine.params('FloorScanSystem'),
        });
        
        this.time = 0.0;
        
        // Ecosystem Integration
        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ EL ECOSISTEMA JUGABA SIN SEMILLA, Y ESO HACÍA EL MUNDO IRREPETIBLE
         * ═══════════════════════════════════════════════════════════════════
         *
         * Se construía vacío —`new EcosystemSystem()`— mientras este motor tiene
         * su propio `SeededRNG` unas líneas más abajo. `EcosystemSystem` acepta
         * `config.rng` y su respaldo es `(() => Math.random())`, que es el patrón
         * correcto pero significa **azar de verdad si nadie le pasa nada**.
         *
         * Medido el 25-08, misma semilla y tres ejecuciones:
         *
         *     helicóptero  36.928141, 36.236886, 42.372989   ← idéntico
         *     pez 0        -20.7,25.7,-37.0 · -15.1,19.5,-38.8 · -22.4,24.8,-33.2
         *
         * O sea que la mitad del mundo era reproducible y la otra mitad no. Y
         * `prueba_semillas` pasaba, porque comprueba que un motor ACEPTE semilla
         * — y éste la acepta: lo que no hacía era pasarla hacia abajo.
         *
         * Un mundo que no se puede volver a jugar no se puede verificar, y sin
         * verificar no hay recibo ni nota comparable. Lo destapó la huella de
         * comportamiento: cambiaba entre dos ejecuciones idénticas.
         */
        this.ecosystem = new EcosystemSystem({ rng: () => this.rng.next() });
        this.pheromoneGrid = this._rejillaDeFeromonas();
        this.fishes = [];
        this.hunters = [];
        this.sharks = [];
        this.plankton = [];
        this.ecosystemCorals = [];
        this.ecosystemJellyfishes = [];
        
        this.rng = new SeededRNG(42);
    }

    /**
     * La rejilla de feromonas, con las medidas del cartucho. Estaba escrita
     * igual en el constructor y en `reset`, con los dos números a fuego en las
     * dos: dos sitios donde cambiar una cosa es un sitio donde olvidarla.
     */
    _rejillaDeFeromonas() {
        const f = ChopperAquariumEngine.params('PheromoneGrid');
        return new PheromoneGrid(this.TANK_SIZE, this.TANK_HEIGHT, this.TANK_SIZE, f.celda, f.evapora);
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    
    emit(event, ...args) {
        if (this.listeners[event]) {
            for (let cb of this.listeners[event]) cb(...args);
        }
    }

    reset(seed = 42) {
        this.gameState = { playing: true, ended: false, activeFloor: -1, isAI: true };
        this.ecs.addComponent(this.chopperEntity, 'EnergyComponent',
            EnergyComponent(ChopperAquariumEngine.params('EnergySystem')));

        const v = ChopperAquariumEngine.ROM.vehiculo;
        this.chopper = { x: v.salida.x, y: (this.totalFloors * this.FL_H)/2.0, z: v.salida.z, rotY: 0.0 };
        this.chopperVelocity = { ...v.empuje };
        this.chopperTracking = { tx: v.salida.x, ty: (this.totalFloors * this.FL_H)/2.0, tz: v.salida.z };
        this.chopperState = { mode: 'ROAM', targetFloor: -1, stateTimer: 1.0, scannedFloors: new Set() };
        this.time = 0.0;
        
        this.rng = new SeededRNG(seed);
        /**
         * Una sola tirada, la primera tras sembrar, exactamente como antes:
         * `Math.floor(rng() * (plantas - 2)) + 1`. La cuenta vive ahora en
         * `FloorScanSystem`, pero el número de tiradas y su sitio no se
         * mueven — si se movieran, cambiaría TODO el mundo de esta etapa con la
         * misma semilla, peces incluidos, y sus notas dejarían de valer.
         */
        this.targetFloorInfo.index = this.busqueda.reset(() => this.rng.next());
        // Las plantas ya escaneadas las lleva la búsqueda; esto es la MISMA
        // colección, no una copia, para que quien leía `scannedFloors` siga
        // leyendo la verdad y no un reflejo que se desincroniza.
        this.chopperState.scannedFloors = this.busqueda.escaneadas;

        // Reset Ecosystem
        this.pheromoneGrid = this._rejillaDeFeromonas();
        const S = this.TANK_SIZE;
        this.fishes = Array.from({ length: 25 }, (_, i) => ({
            id: `f_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 10+this.rng.next()*40, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 2, timer: 0, stamina: 100, alive: true, score: 0
        }));
        this.hunters = Array.from({ length: 4 }, (_, i) => ({
            id: `h_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 10+this.rng.next()*40, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 4, timer: 0, energy: 100, alive: true, score: 0
        }));
        this.sharks = Array.from({ length: 2 }, (_, i) => ({
            id: `s_${i}`, x: (this.rng.next()-0.5)*S*0.8, y: 5+this.rng.next()*20, z: (this.rng.next()-0.5)*S*0.8,
            tx: 0, ty: 0, tz: 0, vx: 0, vy: 0, vz: 0, speed: 3, timer: 0, alive: true, score: 0
        }));

        this.emit('reset_visuals');
    }

    // Math utilities to avoid THREE.js dependency
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — UN TANQUE ES UN MUNDO SIN CASILLAS
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Mismo contrato que publican los 24 juegos del arcade, para que un
     * dibujante pueda pintar esto sin saber a qué se juega.
     *
     * Sin `rejilla`: el acuario es un volumen continuo de 120×112×120. Las
     * «plantas» son alturas por las que se pasa, no casillas donde se está.
     * Publicar una rejilla que el juego no tiene sería peor que no publicar
     * ninguna — el dibujante pintaría una cuadrícula falsa y quien la viera
     * jugaría creyendo en ella.
     *
     * `y` del sustrato es la profundidad y `alto` la altura, igual que en
     * ¡Busca! y en Pedrisco: el sustrato es plano por contrato y `alto` es la
     * dimensión que un mundo añade.
     *
     * ⚠️ EL PLANCTON NO ENTRA. Son cientos de puntos que no cambian ninguna
     * partida; el sustrato describe el estado, no el decorado.
     */
    sustrato() {
        const piezas = [];
        const c = this.chopper;
        if (c) piezas.push({ x: c.x, y: c.z, alto: c.y, t: 'helicoptero', de: 0 });
        const meter = (lista, t, de) => {
            for (const b of (lista ?? [])) piezas.push({ x: b.x, y: b.z, alto: b.y, t, de });
        };
        meter(this.fishes, 'pez', 1);
        meter(this.hunters, 'cazador', 2);
        meter(this.sharks, 'tiburon', 3);

        return {
            piezas,
            zonas: [],
            limite: { forma: 'caja', ancho: this.TANK_SIZE, largo: this.TANK_SIZE,
                      alto: this.TANK_HEIGHT, plantas: this.totalFloors },
            leyenda: {
                helicoptero: 'tú', pez: 'un pez', cazador: 'un cazador', tiburon: 'un tiburón',
            },
            simbolos: { helicoptero: '@', pez: '.', cazador: 'c', tiburon: 'T' },
        };
    }

    vecLength(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
    vecNormalize(v) { 
        let l = this.vecLength(v); 
        if(l>0) { v.x/=l; v.y/=l; v.z/=l; }
        return v;
    }
    vecDot(v1, v2) { return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z; }

    /**
     * Mirar una planta. La REGLA la lleva `FloorScanSystem`; aquí se
     * queda lo que es de este juego: avisar a la vista y decidir que la partida
     * termina. Un sistema componible no debería saber que existe un `emit`.
     */
    checkFloor(floorIdx) {
        if (this.gameState.ended || floorIdx === -1) return;

        const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');
        const r = this.busqueda.escanear(floorIdx, energy);
        if (r.estado === 'repetida') return;

        this.gameState.activeFloor = floorIdx;

        if (r.estado === 'acierto') {
            this.emit('floor_checked', { floorIdx, success: true });
            this.winSequence();
        } else {
            this.emit('floor_checked', { floorIdx, success: false, fuel: energy ? energy.currentEnergy : 0 });
            if (r.sinRecurso) this.crashSequence();
        }
    }

    winSequence() {
        this.gameState.playing = false; 
        this.gameState.ended = true;
        this.emit('game_over', { success: true });
    }

    crashSequence() {
        this.gameState.playing = false; 
        this.gameState.ended = true;
        this.emit('game_over', { success: false });
    }

    stepSimulation(actionIdx, dt, isRLMode = true) {
        if(this.gameState.ended) {
            return { obs: this.getObservationVector(), reward: 0, done: true, info: { target: this.targetFloorInfo.index } };
        }

        let thrust = { x: 0, y: 0, z: 0 };
        let rlYawVelocity = 0.0;

        if (isRLMode) {
            if(actionIdx === 1) thrust.z = -1; if(actionIdx === 2) thrust.z = 1;
            if(actionIdx === 3) thrust.x = -1; if(actionIdx === 4) thrust.x = 1;
            if(actionIdx === 5) thrust.y = 1; if(actionIdx === 6) thrust.y = -1;
            
            if(actionIdx === 7) rlYawVelocity = 2.0; 
            else if(actionIdx === 8) rlYawVelocity = -2.0; 
        }

        this.vecNormalize(thrust);
        this.chopperVelocity.x += thrust.x * 40 * dt;
        this.chopperVelocity.y += thrust.y * 40 * dt;
        this.chopperVelocity.z += thrust.z * 40 * dt;

        this.tick(dt, isRLMode ? (actionIdx > 0 && actionIdx < 7) : false, rlYawVelocity);

        // Calculate a dummy RL reward (to be hooked manually if needed)
        let r = 0;
        return { obs: this.getObservationVector(), reward: r, done: this.gameState.ended, info: { target: this.targetFloorInfo.index } };
    }

    getObservationVector() {
        const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');
        const currentFuel = energy ? energy.currentEnergy : 0;
        
        const fCount = this.fishes ? this.fishes.filter(f => f.alive).length : 0;
        const hCount = this.hunters ? this.hunters.filter(h => h.alive).length : 0;
        const sCount = this.sharks ? this.sharks.filter(s => s.alive).length : 0;
        
        const obs = [
            currentFuel/100, 
            this.chopper.x/100, 
            (this.chopper.y - 2)/(this.totalFloors * this.FL_H), 
            this.chopper.z/100, 
            Math.sin(this.chopper.rotY), 
            this.gameState.activeFloor !== -1 ? this.gameState.activeFloor/this.totalFloors : 0, 
            this.gameState.activeFloor !== -1 ? 1 : 0,
            fCount / 25.0,
            hCount / 4.0,
            sCount / 2.0
        ];
        return { 
            obs: obs, 
            meta: { 
                fuel: currentFuel, 
                activeFloor: this.gameState.activeFloor, 
                targetFloor: this.targetFloorInfo.index, 
                buildingHeight: this.totalFloors * this.FL_H,
                ecosystem_fishes: fCount,
                ecosystem_hunters: hCount,
                ecosystem_sharks: sCount,
                pheromones: this.pheromoneGrid.getState()
            } 
        };
    }

    /**
     * `tick(dt)` — el verbo de la familia de TIEMPO REAL: el tanque se mueve
     * mientras piensas.
     *
     * ⚠️ SE LLAMABA `executeLogicTick`, Y `stepSimulation` NO ERA ESTO.
     *
     * Al poner contrato a los núcleos parecía que aquí el verbo de avanzar se
     * llamaba `stepSimulation`, y eso daba miedo tocarlo: `window.stepSimulation`
     * es la PUERTA DE LOS AGENTES —la enganchan `alisa_sim_sdk.js`, los dos
     * corredores del gimnasio, y hay un laboratorio que comprueba que exista—.
     * Consulté con Motoko antes de moverla.
     *
     * Al mirarlo de cerca no había nada que mover: `stepSimulation(accion, dt,
     * isRLMode)` DESCODIFICA una acción en empuje, llama a este método y
     * devuelve `{obs, reward, done, info}`. O sea que son dos CAPAS, no dos
     * nombres para lo mismo: la puerta aplica una acción y avanza; el verbo sólo
     * avanza. La puerta se queda exactamente como estaba.
     *
     * Los parámetros de más llevan valor por defecto, así que `tick(dt)` a secas
     * cumple el contrato y quien necesite el empuje manual lo sigue pasando.
     */
    tick(dt, manualThrust = false, rlYawVelocity = 0.0) {
        this.ecs.tick(dt);
        this.time += dt;

        if(this.gameState.playing) {
            // AUTONOMOUS AI
            if (!manualThrust && this.gameState.isAI) {
                let acc = { x: 0, y: 0, z: 0 };

                if(this.chopperState.mode === 'ROAM') {
                    this.chopperState.stateTimer -= dt;
                    if(this.chopperState.stateTimer <= 0) {
                        let availableFloors = [];
                        for(let i=0; i<this.totalFloors; i++) {
                            if(!this.chopperState.scannedFloors.has(i)) availableFloors.push(i);
                        }
                        if(availableFloors.length > 0) {
                            this.chopperState.targetFloor = availableFloors[Math.floor(this.rng.next() * availableFloors.length)];
                            this.chopperState.mode = 'APPROACH';
                        }
                    }
                }

                if(this.chopperState.mode === 'ROAM') {
                    const orbitRadius = 45; const orbitSpeed = 0.5; 
                    const yOffset = (this.totalFloors * this.FL_H / 2) + Math.sin(this.time * 0.4) * ((this.totalFloors * this.FL_H / 3));
                    const targetX = Math.cos(this.time * orbitSpeed) * orbitRadius; 
                    const targetZ = Math.sin(this.time * orbitSpeed) * orbitRadius;
                    
                    let dir = { x: targetX - this.chopper.x, y: yOffset - this.chopper.y, z: targetZ - this.chopper.z };
                    this.vecNormalize(dir);
                    acc.x += dir.x * 15; acc.y += dir.y * 15; acc.z += dir.z * 15;
                }
                else if(this.chopperState.mode === 'APPROACH') {
                    if(this.chopperState.targetFloor !== -1 && this.chopperState.scannedFloors.has(this.chopperState.targetFloor)) {
                        this.chopperState.mode = 'ROAM'; this.chopperState.stateTimer = 0.2;
                    } else {
                        let floorY = (this.chopperState.targetFloor * this.FL_H) + (this.FL_H/2);
                        let angle = Math.atan2(this.chopper.z, this.chopper.x);
                        let hoverDist = 28;
                        let targetX = Math.cos(angle) * hoverDist;
                        let targetZ = Math.sin(angle) * hoverDist;
                        let dir = { x: targetX - this.chopper.x, y: floorY - this.chopper.y, z: targetZ - this.chopper.z };
                        
                        if(this.vecLength(dir) < 5.0 && this.vecLength(this.chopperVelocity) < 12.0) {
                            this.chopperState.mode = 'INSPECTING';
                            this.chopperState.stateTimer = 1.5;
                            this.gameState.activeFloor = this.chopperState.targetFloor;
                            this.emit('start_inspecting', this.chopperState.targetFloor);
                        } else {
                            this.vecNormalize(dir);
                            acc.x += dir.x * 35; acc.y += dir.y * 35; acc.z += dir.z * 35;
                            this.chopperVelocity.x *= 0.92; this.chopperVelocity.y *= 0.92; this.chopperVelocity.z *= 0.92;
                        }
                    }
                }
                else if(this.chopperState.mode === 'INSPECTING') {
                    if(this.chopperState.targetFloor !== -1 && this.chopperState.scannedFloors.has(this.chopperState.targetFloor)) {
                        this.chopperState.mode = 'ROAM'; this.chopperState.stateTimer = 0.1;
                        this.gameState.activeFloor = -1;
                    } else {
                        this.chopperState.stateTimer -= dt;
                        let floorY = (this.chopperState.targetFloor * this.FL_H) + (this.FL_H/2);
                        let angle = Math.atan2(this.chopper.z, this.chopper.x);
                        let hoverDist = 40;
                        let targetX = Math.cos(angle) * hoverDist;
                        let targetZ = Math.sin(angle) * hoverDist;
                        
                        let dir = { x: targetX - this.chopper.x, y: floorY - this.chopper.y, z: targetZ - this.chopper.z };
                        this.vecNormalize(dir);
                        acc.x += dir.x * 15; acc.y += dir.y * 15; acc.z += dir.z * 15;
                        this.chopperVelocity.x *= 0.8; this.chopperVelocity.y *= 0.8; this.chopperVelocity.z *= 0.8;
                        
                        if(this.chopperState.stateTimer <= 0) {
                            this.checkFloor(this.chopperState.targetFloor);
                            if(!this.gameState.ended) {
                                this.chopperState.mode = 'ROAM';
                                this.chopperState.stateTimer = 1.0 + this.rng.next();
                                this.chopperState.targetFloor = -1;
                                this.gameState.activeFloor = -1;
                            }
                        }
                    }
                }

                // Avoid Center
                let distToCenter = Math.sqrt(this.chopper.x*this.chopper.x + this.chopper.z*this.chopper.z);
                if(distToCenter < 28) {
                    let push = { x: this.chopper.x, y: 0, z: this.chopper.z };
                    this.vecNormalize(push);
                    acc.x += push.x * 40; acc.z += push.z * 40;
                }

                // Avoid bounds
                let wallDist = 12;
                if(this.chopper.x < -this.TANK_SIZE/2 + wallDist) acc.x += 25;
                if(this.chopper.x > this.TANK_SIZE/2 - wallDist) acc.x -= 25;
                if(this.chopper.z < -this.TANK_SIZE/2 + wallDist) acc.z += 25;
                if(this.chopper.z > this.TANK_SIZE/2 - wallDist) acc.z -= 25;
                if(this.chopper.y < wallDist) acc.y += 25;
                if(this.chopper.y > this.TANK_HEIGHT - wallDist) acc.y -= 25;

                this.chopperVelocity.x += acc.x * dt;
                this.chopperVelocity.y += acc.y * dt;
                this.chopperVelocity.z += acc.z * dt;
            }

            // Damping
            this.chopperVelocity.x *= 0.95;
            this.chopperVelocity.y *= 0.95;
            this.chopperVelocity.z *= 0.95;

            // Speed clamp
            let speedSq = this.chopperVelocity.x*this.chopperVelocity.x + this.chopperVelocity.y*this.chopperVelocity.y + this.chopperVelocity.z*this.chopperVelocity.z;
            if(speedSq > this.maxSpeed*this.maxSpeed) {
                let f = this.maxSpeed / Math.sqrt(speedSq);
                this.chopperVelocity.x *= f; this.chopperVelocity.y *= f; this.chopperVelocity.z *= f;
            }

            // Target Pos tracker
            this.chopperTracking.tx += this.chopperVelocity.x * dt;
            this.chopperTracking.ty += this.chopperVelocity.y * dt;
            this.chopperTracking.tz += this.chopperVelocity.z * dt;

            let spd = 6.0;
            this.chopper.x += (this.chopperTracking.tx - this.chopper.x) * spd * dt;
            this.chopper.y += (this.chopperTracking.ty - this.chopper.y) * spd * dt;
            this.chopper.z += (this.chopperTracking.tz - this.chopper.z) * spd * dt;

            this.chopper.rotY += rlYawVelocity * dt;
        } else if (this.gameState.ended) {
            const energy = this.ecs.getComponent(this.chopperEntity, 'EnergyComponent');
            // Simple physics end sequence
            if (energy && energy.currentEnergy <= 0) {
                // crash
                this.chopper.y -= 20 * dt;
                if(this.chopper.y < 1.0) this.chopper.y = 1.0;
            } else {
                // win hover
                let landPos = { x: 0, y: (this.totalFloors * this.FL_H) + 1.2, z: 0 };
                this.chopper.x += (landPos.x - this.chopper.x) * 2.0 * dt;
                this.chopper.y += (landPos.y - this.chopper.y) * 2.0 * dt;
                this.chopper.z += (landPos.z - this.chopper.z) * 2.0 * dt;
            }
        }

        // Tick Ecosystem
        if (this.gameState.playing) {
            const TANK = { width: this.TANK_SIZE, depth: this.TANK_SIZE, waterLevel: this.TANK_HEIGHT, EAT_RADIUS: 2.0, maxPlankton: 50 };
            
            this.pheromoneGrid.tick(dt);

            // Note: Plankton visually handled by ParticleEmitter, but we could add mathematical plankton if needed for foraging logic.
            // For now, fish will just flock and evade predators.
            this.fishes = this.ecosystem.tickFishes(this.fishes, this.hunters, this.sharks, this.plankton, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
            this.hunters = this.ecosystem.tickHunters(this.hunters, this.fishes, this.sharks, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
            this.sharks = this.ecosystem.tickSharks(this.sharks, this.hunters, this.fishes, this.ecosystemJellyfishes, this.ecosystemCorals, dt, this.time, TANK, this.pheromoneGrid);
        }
    }
}
