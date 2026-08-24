export class CorporateSeekerSystem {
    constructor(config = {}) {
        // Semilla inyectable: un perseguidor que elige planta al azar sin semilla
        // convierte cada partida en irrepetible, y con ella el recibo. Por
        // defecto se comporta igual que siempre. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
        this.phase = 'PICK_FLOOR';
        this.aiTargetFloor = -1;
        this.exploredFloors = new Set();
        this.beliefs = [];
        this.sweepIndex = 0;
        this.stuckTimer = 0;
        this.lastX = 0;
        this.lastFloor = 0;
        this.travelMode = 'elevator';
        this.baseSpeed = 12.0;
        this.moveTarget = null;
        this.pendingAction = null;
        this.arrivalRadius = 0.8;
        this.switchToggled = false;
        
        this.intents = [];
    }

    emit(intent) {
        this.intents.push(intent);
    }

    consumeIntents() {
        const consumed = [...this.intents];
        this.intents = [];
        return consumed;
    }

    reset(floorsCount, floorDataArray) {
        this.phase = 'PICK_FLOOR';
        this.aiTargetFloor = -1;
        this.exploredFloors.clear();
        this.sweepIndex = 0;
        this.stuckTimer = 0;
        this.moveTarget = null;
        this.pendingAction = null;
        
        this.beliefs = [];
        for (let i = 0; i < floorsCount; i++) {
            const hasSearchables = floorDataArray[i].doorsCount > 0 || floorDataArray[i].spotsCount > 0;
            this.beliefs.push(hasSearchables ? 1.0 : 0.0);
        }
        this.normalizeBeliefs();
    }

    normalizeBeliefs() {
        const sum = this.beliefs.reduce((a, b) => a + b, 0);
        if (sum > 0) this.beliefs = this.beliefs.map(b => b / sum);
    }

    updateBeliefs(checkedFloor, result, floorsCount) {
        for (let i = 0; i < floorsCount; i++) {
            if (result === 'FOUND!') {
                this.beliefs[i] = (i === checkedFloor) ? 1.0 : 0.0;
                return;
            }
            const dist = Math.abs(i - checkedFloor);
            let likelihood = 1.0;
            if (result === 'COLD') {
                if (dist <= 1) likelihood = 0.0;
                else if (dist <= 2) likelihood = 0.15;
                else likelihood = 1.2;
            } else if (result === 'HOT') {
                if (dist === 0) likelihood = 5.0;
                else if (dist <= 1) likelihood = 1.5;
                else likelihood = 0.3;
            } else if (result === 'WARM') {
                if (dist === 0) likelihood = 3.0;
                else if (dist <= 2) likelihood = 1.2;
                else likelihood = 0.5;
            }
            this.beliefs[i] *= likelihood;
        }
        this.exploredFloors.forEach(ef => { this.beliefs[ef] = 0; });
        this.normalizeBeliefs();
    }

    pickBestFloor(floorsCount, floorDataArray) {
        let bestFloor = -1, bestP = -1;
        for (let i = 0; i < floorsCount; i++) {
            if (this.exploredFloors.has(i)) continue;
            const hasSearchables = floorDataArray[i] && (floorDataArray[i].doorsCount > 0 || floorDataArray[i].spotsCount > 0);
            if (!hasSearchables) continue;
            if (this.beliefs[i] > bestP) {
                bestP = this.beliefs[i];
                bestFloor = i;
            }
        }
        return bestFloor;
    }

    isFloorFullyChecked(floorIdx, floorDataArray, stateChecks) {
        const fd = floorDataArray[floorIdx];
        if (!fd) return true;

        if (fd.doorsCount > 0) {
            for (let i = 0; i < fd.doorsCount; i++) {
                const checked = stateChecks.doors.some(c => c.floor === floorIdx + 1 && c.door === String.fromCharCode(65 + i));
                if (!checked) return false;
            }
        }
        
        if (fd.spotsCount > 0) {
            for (let i = 0; i < fd.spotsCount; i++) {
                if (!stateChecks.spotSearched[floorIdx] || !stateChecks.spotSearched[floorIdx][i]) return false;
            }
        }

        if (fd.doorsCount === 0 && fd.spotsCount === 0) return true;
        
        return true;
    }

    walkTo(tx, tz, action, seekerState, fd) {
        let finalTx = tx;
        let finalTz = tz;
        
        // Broom Closet Pathfinding (Floor 1)
        if (seekerState.floor === 1) {
            const boilerDoorX = (fd.stairX || 0) + 1.6*1.5 + 0.4;
            const doorSpotX = boilerDoorX + 0.2; 
            const doorSpotZ = -1.3; 
            
            const targetInBoiler = (tx >= boilerDoorX - 0.5 && tz < -1.5);
            const seekerInBoiler = (seekerState.x >= boilerDoorX - 0.5 && seekerState.z < -1.4);
            
            if (seekerInBoiler && !targetInBoiler) {
                if (seekerState.z < -1.5 && seekerState.x > doorSpotX + 0.5) {
                    finalTx = doorSpotX;
                    finalTz = -1.6;
                }
            } else if (!seekerInBoiler && targetInBoiler) {
                if (seekerState.x < doorSpotX - 0.5) {
                    finalTx = doorSpotX;
                    finalTz = doorSpotZ;
                }
            }
        }
        
        this.moveTarget = { x: finalTx, z: finalTz };
        this.pendingAction = action || null;
    }

    autoAgentStep(state, floorDataMap) {
        if (!state.autoPlaying || state.gameStatus === 'FOUND!') return;
        if (state.gamePhase !== 'seeking') return;
        if (state.seekerData.mode !== 'walking' && state.seekerData.mode !== 'elevator') return;

        const fd = floorDataMap[state.seekerData.floor];
        if (!fd) return;

        const targetZ = -2.5 + 0.2; // -CORRIDOR_DEPTH / 2 + 0.2

        if (state.isLightsOut && state.floorLightTimers[state.seekerData.floor] <= 0 && state.seekerData.mode === 'walking') {
            this.emit('toggle_minutero');
            return;
        }

        const urgency = Math.min(2.0, 1.0 + state.searches * 0.08);
        const currentSpeed = this.baseSpeed * urgency;

        if (Math.abs(state.seekerData.x - this.lastX) < 0.1 && state.seekerData.floor === this.lastFloor) {
            this.stuckTimer += 0.3;
        } else {
            this.stuckTimer = 0;
        }
        this.lastX = state.seekerData.x;
        this.lastFloor = state.seekerData.floor;

        if (this.stuckTimer > 3.0) {
            this.phase = 'PICK_FLOOR';
            this.stuckTimer = 0;
            this.moveTarget = null;
            if (state.seekerData.inElevator) this.emit('exit_elevator');
        }

        if (this.moveTarget) return;

        // Battery Logic
        if (state.hudEnergy < 50 && state.batteryPickups && state.batteryPickups.length > 0) {
            let bestBat = null;
            let minBatCost = 9999;
            for (let b of state.batteryPickups) {
                let cost = Math.abs(b.floor - state.seekerData.floor) * 20.0 + Math.abs(b.x - state.seekerData.x);
                if (cost < minBatCost) { minBatCost = cost; bestBat = b; }
            }
            if (bestBat) {
                if (bestBat.floor === state.seekerData.floor) {
                    this.phase = 'BATTERY_HUNT';
                    this.walkTo(bestBat.x, bestBat.z, null, state.seekerData, fd);
                    return;
                } else if (state.hudEnergy < 30 && this.phase !== 'TRAVEL') {
                    this.aiTargetFloor = bestBat.floor;
                    this.phase = 'PICK_FLOOR';
                    return;
                }
            }
        }
        if (this.phase === 'BATTERY_HUNT') this.phase = 'EXPLORE';

        if (this.phase === 'PICK_FLOOR') {
            if (this.isFloorFullyChecked(state.seekerData.floor, floorDataMap, state.stateChecks)) {
                this.exploredFloors.add(state.seekerData.floor);
                this.beliefs[state.seekerData.floor] = 0;
                this.normalizeBeliefs();
            }

            const best = this.pickBestFloor(state.totalFloors, floorDataMap);
            if (best === -1) return;

            this.aiTargetFloor = best;
            this.sweepIndex = 0;

            const dist = Math.abs(state.seekerData.floor - best);
            const targetIsEdge = (best === 0 || best === state.totalFloors);
            const currentHasElev = (state.seekerData.floor > 0 && state.seekerData.floor < state.totalFloors);
            
            if (dist === 1) {
                let useElevator = (state.elevatorData.currentFloor === state.seekerData.floor) || (this.rng() < 0.6);
                if (fd.stairX === null || fd.stairX === undefined) useElevator = true;
                if (!currentHasElev) useElevator = false;
                this.travelMode = useElevator ? 'elevator' : 'stairs';
            } else if (targetIsEdge && currentHasElev && dist > 1) {
                this.travelMode = 'elevator';
            } else if (dist >= 2 && currentHasElev) {
                this.travelMode = 'elevator';
            } else {
                this.travelMode = 'stairs';
            }

            this.phase = (state.seekerData.floor === best) ? 'EXPLORE' : 'TRAVEL';
            this.switchToggled = (state.seekerData.floor === best); 
            return;
        }

        if (this.phase === 'TRAVEL') {
            if (state.seekerData.floor === this.aiTargetFloor) {
                if (!this.switchToggled) {
                    this.walkTo(fd.switchX, targetZ, 'toggle_minutero', state.seekerData, fd);
                    this.switchToggled = true;
                } else {
                    this.phase = 'EXPLORE';
                    this.sweepIndex = 0;
                }
                return;
            }
            this.switchToggled = false;

            if (state.seekerData.floor === 1 && this.aiTargetFloor === 0) this.travelMode = 'stairs';
            if (state.seekerData.floor === state.totalFloors - 1 && this.aiTargetFloor === state.totalFloors) this.travelMode = 'stairs';
            
            if (this.travelMode === 'stairs' && (state.seekerData.floor > 0 && Math.abs(state.seekerData.floor - this.aiTargetFloor) >= 2)) {
                if (fd.elevDoorX !== undefined) this.travelMode = 'elevator';
            }

            if (this.travelMode === 'stairs') {
                const goUp = this.aiTargetFloor > state.seekerData.floor;
                if (fd.stairX !== null && fd.stairX !== undefined) {
                    this.walkTo(fd.stairX, targetZ, goUp ? 'stairs_up' : 'stairs_down', state.seekerData, fd);
                } else {
                    this.travelMode = 'elevator';
                }
            } else {
                if (!state.seekerData.inElevator) {
                    if (fd.elevDoorX !== undefined) {
                        const distToElev = Math.hypot(state.seekerData.x - fd.elevDoorX, state.seekerData.z - 0);
                        if (distToElev > 1.2) {
                            this.walkTo(fd.elevDoorX, 0, null, state.seekerData, fd);
                        } else {
                            if (state.elevatorData.currentFloor !== state.seekerData.floor || state.elevatorData.moving) {
                                this.emit('call_elevator');
                            } else {
                                this.emit('enter_elevator');
                            }
                        }
                    } else {
                        this.travelMode = 'stairs';
                    }
                } else {
                    let elevTargetFloor = this.aiTargetFloor;
                    if (elevTargetFloor === 0) elevTargetFloor = 1;
                    if (elevTargetFloor === state.totalFloors) elevTargetFloor = state.totalFloors - 1;

                    if (state.elevatorData.currentFloor === elevTargetFloor) {
                        if (!state.elevatorData.moving) this.emit('exit_elevator');
                    } else if (!state.elevatorData.moving && state.elevatorData.currentFloor !== elevTargetFloor) {
                        this.emit('goto_floor_' + elevTargetFloor);
                    }
                }
            }
            return;
        }

        if (this.phase === 'EXPLORE') {
            if (state.seekerData.floor !== this.aiTargetFloor) {
                this.phase = 'PICK_FLOOR';
                return;
            }

            if (fd.doorsCount > 0) {
                let unsearchedDoor = -1;
                for (let i = this.sweepIndex; i < fd.doorsCount; i++) {
                    const checked = state.stateChecks.doors.some(c => c.floor === state.seekerData.floor + 1 && c.door === String.fromCharCode(65 + i));
                    if (!checked) { unsearchedDoor = i; break; }
                }

                if (unsearchedDoor !== -1) {
                    this.sweepIndex = unsearchedDoor;
                    this.walkTo(fd.doors[unsearchedDoor].x, targetZ, 'search_door', state.seekerData, fd);
                    return;
                }
            }

            if (fd.spotsCount > 0) {
                let unsearchedSpot = -1;
                for (let i = 0; i < fd.spotsCount; i++) {
                    if (!state.stateChecks.spotSearched[state.seekerData.floor] || !state.stateChecks.spotSearched[state.seekerData.floor][i]) { 
                        unsearchedSpot = i; break; 
                    }
                }

                if (unsearchedSpot !== -1) {
                    this.walkTo(fd.hidingSpots[unsearchedSpot].x, targetZ, 'search_spot_' + unsearchedSpot, state.seekerData, fd);
                    return;
                }
            }

            this.exploredFloors.add(state.seekerData.floor);
            this.beliefs[state.seekerData.floor] = 0;
            this.normalizeBeliefs();
            this.phase = 'PICK_FLOOR';
        }
    }
}
