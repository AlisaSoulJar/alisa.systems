import { DeterministicScope } from '../alisa-engine/src/world/core/DeterministicScope.js';
async function _episodio(iterations, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] CorporateSeekerSystem -> Running Headless Graph Traversal Simulation (${iterations} episodes)...`);
    const { CorporateSeekerSystem } = await import('../alisa-engine/src/world/systems/CorporateSeekerSystem.js');
    
    let totalTicks = 0;
    const totalFloors = 6;
    const t0 = performance.now();
    let wins = 0;

    for (let i = 0; i < iterations; i++) {
        const engine = new CorporateSeekerSystem();
        let floorDataMap = [];
        for (let f = 0; f <= totalFloors; f++) {
            floorDataMap.push({
                doorsCount: 2, spotsCount: 1,
                stairX: -5.0, elevDoorX: 0.0, switchX: -8.0,
                doors: [{x: 2}, {x: 6}],
                hidingSpots: [{x: -3}]
            });
        }

        const targetFloor = Math.floor(Math.random() * (totalFloors-1)) + 1;
        const targetDoor = Math.floor(Math.random() * 2);
        
        engine.reset(totalFloors + 1, floorDataMap);

        let state = {
            gameStatus: 'Hunting',
            gamePhase: 'seeking',
            autoPlaying: true,
            isLightsOut: false,
            floorLightTimers: Array(totalFloors+1).fill(9999),
            totalFloors: totalFloors,
            searches: 0,
            hudEnergy: 100.0,
            batteryPickups: [],
            seekerData: { x: 0, z: 0, floor: 1, inElevator: false, mode: 'walking' },
            elevatorData: { currentFloor: 1, moving: false },
            stateChecks: { doors: [], spotSearched: Array(totalFloors+1).fill([false]) }
        };

        let episodeTicks = 0;
        while(state.gameStatus !== 'FOUND!' && episodeTicks < 500) {
            episodeTicks++;
            engine.autoAgentStep(state, floorDataMap);
            
            // Process intents that were emitted without a moveTarget (like elevator interactions)
            const intents = engine.consumeIntents();
            for (const intentRaw of intents) {
                const intent = intentRaw.toLowerCase();
                if (intent === 'stairs_up') state.seekerData.floor++;
                else if (intent === 'stairs_down') state.seekerData.floor--;
                else if (intent === 'enter_elevator') state.seekerData.inElevator = true;
                else if (intent === 'exit_elevator') state.seekerData.inElevator = false;
                else if (intent.startsWith('goto_floor_')) {
                    state.elevatorData.currentFloor = parseInt(intent.split('_')[2]);
                    state.seekerData.floor = state.elevatorData.currentFloor;
                }
                else if (intent === 'call_elevator') {
                    state.elevatorData.currentFloor = state.seekerData.floor;
                }
            }

            if (engine.moveTarget) {
                const dist = Math.hypot(engine.moveTarget.x - state.seekerData.x, engine.moveTarget.z - state.seekerData.z);
                const tTicks = Math.ceil(dist / 1.5) + 1; 
                episodeTicks += tTicks; 
                
                state.seekerData.x = engine.moveTarget.x;
                state.seekerData.z = engine.moveTarget.z;
                
                if (engine.pendingAction) {
                    const intent = engine.pendingAction.toLowerCase();
                    if (intent === 'stairs_up') state.seekerData.floor++;
                    else if (intent === 'stairs_down') state.seekerData.floor--;
                    else if (intent === 'enter_elevator') state.seekerData.inElevator = true;
                    else if (intent === 'exit_elevator') state.seekerData.inElevator = false;
                    else if (intent.startsWith('goto_floor_')) {
                        state.elevatorData.currentFloor = parseInt(intent.split('_')[2]);
                        state.seekerData.floor = state.elevatorData.currentFloor;
                    }
                    else if (intent.startsWith('search_door')) {
                        const curDoor = engine.sweepIndex;
                        state.stateChecks.doors.push({floor: state.seekerData.floor+1, door: String.fromCharCode(65+curDoor)});
                        if (state.seekerData.floor === targetFloor && curDoor === targetDoor) {
                            state.gameStatus = 'FOUND!';
                        } else {
                            engine.updateBeliefs(state.seekerData.floor, 'COLD', totalFloors + 1);
                        }
                    }
                    else if (intent.startsWith('search_spot_')) {
                        const spotIdx = parseInt(intent.split('_')[2]);
                        let newArr = [...state.stateChecks.spotSearched[state.seekerData.floor]];
                        newArr[spotIdx] = true;
                        state.stateChecks.spotSearched[state.seekerData.floor] = newArr;
                    }
                }
                engine.moveTarget = null;
                engine.pendingAction = null;
            }
        }
        
        if (state.gameStatus === 'FOUND!') {
            wins++;
        }
        totalTicks += episodeTicks;
    }

    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] CorporateSeeker Traversal Convergence completado en ${Math.round(durationMs)}ms. Wins: ${wins}`);

    return {
        method: "Belief Mapping FSM (Headless Graph)",
        episodes: iterations,
        wins: wins,
        avg_ticks_per_episode: totalTicks / iterations,
        sim_time_ms: durationMs,
        success_rate: wins / iterations,
        extracted_weights: { signature: "CONVERGED_FSM_HEURISTICS" }
    };
}

/**
 * ⚠️ EL EPISODIO CORRE DENTRO DE UN AMBITO DETERMINISTA, Y ANTES NO.
 *
 * Medido el 29-08-2026: este arnes llamaba a `Math.random` sin sembrar, asi que
 * dos ejecuciones daban resultados distintos. Un arnes que no se repite no sirve
 * para comparar a nadie con nadie, que es lo unico que hace este banco.
 *
 * El motor ya tenia la herramienta —`DeterministicScope`, escrita justamente para
 * esto y usada por otros veintiseis ficheros— y los arneses eran los unicos que
 * no la usaban. Sustituye `Math.random` por mulberry32 durante el tramo y lo
 * devuelve a su sitio al salir: cero ediciones en los sistemas de debajo.
 *
 * Se envuelve en vez de tocar el cuerpo a proposito: asi el episodio de siempre
 * se queda como estaba y la unica diferencia es de donde sale el azar.
 */
const SEMILLA = 42;

export async function runGymEpisode(...args) {
    return DeterministicScope.runAsync(SEMILLA, () => _episodio(...args));
}
