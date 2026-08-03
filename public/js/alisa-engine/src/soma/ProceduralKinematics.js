import * as THREE from 'three';
import { MotionBank } from './MotionBank.js';

export class ProceduralKinematics {
    static getGaitCurve(tNorm, phase, dutyCycle = 0.5) {
        const localT = (tNorm + phase) % 1.0;
        const normLocalT = localT < 0 ? localT + 1.0 : localT;
        if (normLocalT >= dutyCycle) {
            let swingT = (normLocalT - dutyCycle) / (1.0 - dutyCycle);
            return -Math.sin(swingT * Math.PI);
        } else {
            let stanceT = normLocalT / dutyCycle;
            return Math.sin(stanceT * Math.PI) * 0.3;
        }
    }

    /**
     * Ticks the kinematic animation loops for all active bones.
     */
    static tick(bones, t, mode, config = {}) {
            if (!bones || bones.length === 0) return;

            if (mode === 'none') {
                bones.forEach(b => {
                    b.scale.set(1,1,1);
                    b.rotation.set(0,0,0);
                    if (b.parent === null) b.position.copy(b.userData.worldPos);
                });
                return;
            }

            // === DATA-DRIVEN MOTION (MotionBank) ===
            if (mode.startsWith('bank:') && config.motionBankData && config.motionBankData[mode]) {
                MotionBank.sampleToBones(config.motionBankData[mode], t, bones);
                return; // Early exit, no procedural math needed!
            }
            
            // `t` is passed externally
            if (mode === 'idle') {
                bones.forEach(b => {
                    b.rotation.set(0,0,0); // reset walk
                    // Respira suavemente escalando el eje Y
                    if (b.parent === null || b.children.length > 2) {
                        b.scale.y = 1.0 + Math.sin(t * 2.0) * 0.05;
                    }
                    if (config.activeSkeletonType === 'bird' && b.parent && Math.abs(b.position.x) > 0.5) {
                        b.rotation.z = Math.sin(t * 2.0) * 0.05 * Math.sign(b.userData.worldPos.x);
                    }
                    if (config.activeSkeletonType === 'piscine' && b.userData.worldPos.z < 0) {
                        b.rotation.y = Math.sin(t * 1.5 - b.userData.worldPos.z) * 0.05;
                    }
                    // Equino/Canino idle
                    if (['equine', 'canine'].includes(config.activeSkeletonType) && b.parent) {
                        const wy = b.userData.worldPos.y;
                        const wz = b.userData.worldPos.z;
                        const wx = b.userData.worldPos.x;
                        if (wy > 4.7 && Math.abs(wx) > 0.01) {
                            b.rotation.z = Math.sin(t * 3.0 + wx * 10.0) * 0.2 * Math.sign(wx);
                            b.rotation.x = Math.sin(t * 1.8 + 1.0) * 0.15;
                        }
                        if (wz < -2.0 && Math.abs(wx) < 0.05) {
                            const tailDelay = Math.abs(wz + 2.0) * 1.2;
                            b.rotation.y = Math.sin(t * 1.0 - tailDelay) * 0.15;
                        }
                        if (wy < 4.2 && wz > 2.5) b.rotation.x = Math.sin(t * 2.5) * 0.04;
                        if (wy > 4.0 && wy < 4.6 && Math.abs(wx) < 0.05 && wz > 1.5) b.rotation.x = Math.sin(t * 1.5) * 0.03;
                    }
                    // Primate idle: rascarse, balanceo lateral, respiración pectoral
                    if (config.activeSkeletonType === 'primate' && b.parent) {
                        const wx = b.userData.worldPos.x;
                        if (Math.abs(wx) > 0.8) b.rotation.z = Math.sin(t * 1.2 + wx) * 0.06; // brazos oscilan
                        if (Math.abs(wx) < 0.1) b.rotation.x = Math.sin(t * 1.8) * 0.03; // espina respira
                    }
                    // Pachyderm idle: balanceo oreja, trompa sinusoidal
                    if (config.activeSkeletonType === 'pachyderm' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        const wx = b.userData.worldPos.x;
                        if (Math.abs(wx) > 1.0) b.rotation.z = Math.sin(t * 0.8) * 0.15 * Math.sign(wx); // orejas
                        if (wz > 2.8) b.rotation.x = Math.sin(t * 1.5 - wz * 0.5) * 0.08; // trompa ondula
                    }
                    // Mustelid idle: cabeza explorando, espina ondulante
                    if (config.activeSkeletonType === 'mustelid' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        if (Math.abs(b.position.x) < 0.1) b.rotation.x = Math.sin(t * 2.0 - wz * 0.3) * 0.04;
                        if (wz > 3.0) b.rotation.y = Math.sin(t * 2.5) * 0.1; // cabeza curiosa
                    }
                    // Crocodilian idle: emboscada, solo ojos y trompa
                    if (config.activeSkeletonType === 'crocodilian' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        if (wz > 3.0) b.rotation.x = Math.sin(t * 0.5) * 0.02; // micro-movimiento hocico
                    }
                    // Anuran idle: crouch respiratorio (infla garganta)
                    if (config.activeSkeletonType === 'anuran' && b.parent) {
                        if (b.children.length > 2) b.scale.y = 1.0 + Math.sin(t * 3.0) * 0.08; // garganta
                    }
                    // Chelonian idle: retracción/extensión del cuello
                    if (config.activeSkeletonType === 'chelonian' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        if (wz > 1.8) b.rotation.x = Math.sin(t * 0.6) * 0.1; // cuello oscilando
                    }
                    // Lacertilian idle: alertness, tongue flick (cabeza rápida)
                    if (config.activeSkeletonType === 'lacertilian' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        if (wz > 2.8) b.rotation.y = Math.sin(t * 4.0) * 0.06; // head scan
                    }
                    // Insecta idle: antena twitch / limpieza de patas
                    if (config.activeSkeletonType === 'insecta' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        if (wz > 2.0 && Math.abs(b.userData.worldPos.x) > 0.3) {
                            b.rotation.x = Math.sin(t * 5.0) * 0.1; // Patas delanteras se frotan
                        }
                    }
                    // Lagomorph idle: alerta con orejas, pequeña vibración nariz
                    if (config.activeSkeletonType === 'lagomorph' && b.parent) {
                        const wz = b.userData.worldPos.z;
                        const wy = b.userData.worldPos.y;
                        if (wy > 2.5 && wz < 2.2) b.rotation.z = Math.sin(t * 2.0) * 0.1; // Orejas
                        if (wz > 2.3) b.rotation.x = Math.sin(t * 8.0) * 0.02; // Nariz snuff
                    }
                    // Crustacean idle: pinzas amenazantes
                    if (config.activeSkeletonType === 'crustacean' && b.parent) {
                        if (Math.abs(b.userData.worldPos.x) > 0.8 && b.userData.worldPos.z > 1.5) {
                            b.rotation.y = Math.sin(t * 1.0) * 0.1 * Math.sign(b.userData.worldPos.x); // Abrir/cerrar pinzas
                        }
                    }
                    // Wheeled idle: Vibración del motor en ralentí
                    if (config.activeSkeletonType === 'wheeled' && b.parent === null) {
                        b.position.y = b.userData.worldPos.y + Math.sin(t * 30.0) * 0.005; // Alta frecuencia, baja amplitud
                    }
                    // Hovering idle: Sustentación (Sine wave de gran amplitud temporal)
                    if (config.activeSkeletonType === 'hovering' && b.parent === null) {
                        b.position.y = b.userData.worldPos.y + Math.sin(t * 1.5) * 0.2;
                        b.rotation.x = Math.sin(t * 1.0) * 0.05;
                        b.rotation.z = Math.cos(t * 0.8) * 0.05;
                    }
                });
            } else if (['walk', 'walk_real', 'trot', 'canter', 'gallop'].includes(mode)) {
                let speed = 5.0;
                if (mode === 'trot') speed = 8.0;
                if (mode === 'canter') speed = 10.0;
                if (mode === 'gallop') speed = 14.0;
                
                const tNorm = t * (speed / (Math.PI * 2)); // Ciclo base normalizado [0..1]

                bones.forEach((b, index) => {
                    b.scale.set(1,1,1); // reset idle
                    const isRoot = b.parent === null;
                    const wx = b.userData.worldPos.x;
                    const wz = b.userData.worldPos.z;
                    const rx = b.position.x; // relative to parent
                    const ry = b.position.y;

                    // == 1. LOCOMOCIÓN RAÍZ (ROOT BOUNCE) ==
                    if (isRoot) {
                        if (['canine', 'equine', 'feline', 'theropod', 'humanoid', 'arachnid', 'primate', 'pachyderm', 'mustelid', 'crocodilian', 'chelonian'].includes(config.activeSkeletonType)) {
                            let bounce = 0.02;
                            let yaw = 0.03;
                            if (mode === 'trot' || mode === 'walk') { bounce = 0.06; yaw = 0.04; }
                            if (mode === 'canter') { bounce = 0.08; yaw = 0.06; }
                            if (mode === 'gallop') { bounce = 0.12; yaw = 0.08; }
                            // Pachyderm: rebote mínimo (graviportal)
                            if (config.activeSkeletonType === 'pachyderm') { bounce *= 0.3; yaw *= 0.3; }
                            // Chelonian: rebote inexistente (caparazón rígido)
                            if (config.activeSkeletonType === 'chelonian') { bounce *= 0.1; yaw *= 0.1; speed *= 0.4; }
                            // Mustelid: rebote ondulante (galope bound)
                            if (config.activeSkeletonType === 'mustelid') { bounce *= 1.5; }
                            
                            // Theropod: counterbalance pasivo de la cola hipermasiva
                            if (config.activeSkeletonType === 'theropod') { 
                                bounce *= 0.5; // reducir rebote vertical, priorizar pitch
                                b.rotation.x = Math.sin(t * speed) * 0.1; // pelvic pitch
                            }
                            
                            b.position.y = b.userData.worldPos.y + Math.abs(Math.sin(t * speed)) * bounce;
                            b.rotation.y = Math.sin(t * speed * 0.5) * yaw;
                            if (mode === 'canter' || mode === 'gallop') {
                                b.rotation.z = Math.sin(t * speed * 0.5) * 0.04;
                            }
                        } else if (config.activeSkeletonType === 'bird') {
                            b.position.y = b.userData.worldPos.y + Math.sin(t * speed * 1.2) * 0.4;
                        } else if (['piscine', 'serpentine'].includes(config.activeSkeletonType)) {
                            b.position.x = b.userData.worldPos.x + Math.sin(t * speed) * 0.2;
                        } else if (config.activeSkeletonType === 'cetacean') {
                            b.position.y = b.userData.worldPos.y + Math.sin(t * speed) * 0.3;
                        } else if (config.activeSkeletonType === 'anuran') {
                            // Rana: salto balístico cíclico (Y parabólico)
                            const jumpCycle = (t * speed * 0.3) % 1.0;
                            const jumpH = jumpCycle < 0.3 ? Math.sin(jumpCycle / 0.3 * Math.PI) * 0.8 : 0;
                            b.position.y = b.userData.worldPos.y + jumpH;
                            // Forward impulse during jump
                            if (jumpCycle < 0.3) b.position.z = b.userData.worldPos.z + jumpCycle * 0.5;
                            else b.position.z = b.userData.worldPos.z;
                        } else if (config.activeSkeletonType === 'lacertilian') {
                            // Lagarto: undulación lateral del cuerpo + avance
                            b.position.x = b.userData.worldPos.x + Math.sin(t * speed) * 0.15;
                            b.rotation.y = Math.sin(t * speed * 0.5) * 0.06;
                        } else if (config.activeSkeletonType === 'lagomorph') {
                            // Conejo: Asymmetric bound (leve parabolic bounce)
                            const boundCycle = (t * speed * 0.4) % 1.0;
                            const jumpH = boundCycle < 0.4 ? Math.sin(boundCycle / 0.4 * Math.PI) * 0.4 : 0;
                            b.position.y = b.userData.worldPos.y + jumpH;
                            if (boundCycle < 0.4) b.position.z = b.userData.worldPos.z + boundCycle * 0.6;
                            else b.position.z = b.userData.worldPos.z;
                        } else if (config.activeSkeletonType === 'insecta') {
                            // Cero rebote root, la estabilidad la dan las 6 patas
                            b.position.y = b.userData.worldPos.y; 
                        } else if (config.activeSkeletonType === 'crustacean') {
                            // Caminata lateral muy leve (Crab shuffle)
                            b.position.x = b.userData.worldPos.x + Math.sin(t * speed * 0.5) * 0.1;
                        }
                    }

                    // == 2. KINEMATICA ORGÁNICA MATRICIAL ==
                    if (b.parent) {
                        
                        // Aves: Aleteo sincronizado
                        if (config.activeSkeletonType === 'bird') {
                            if (Math.abs(rx) > 0.2 && ry >= 0) { 
                                const flapPhase = (b.children.length === 0) ? -1.0 : 0.0;
                                b.rotation.z = Math.sin(t * speed * 1.2 + flapPhase) * 0.6 * -Math.sign(wx);
                            } else if (ry < 0 && Math.abs(wz) < 0.5) { 
                                b.rotation.x = -0.5; // Patas plegadas aerodinámicamente
                            }
                        }
                        
                        // Peces y Ciempiés: Ondulación espinal lateral (Traveling Wave)
                        else if (['piscine', 'serpentine'].includes(config.activeSkeletonType)) {
                            if (Math.abs(rx) < 0.2) { 
                                b.rotation.y = Math.sin(t * speed - wz * 1.5) * 0.3;
                            } else { 
                                b.rotation.z = Math.sin(t * speed) * 0.2 * Math.sign(wx);
                            }
                        }

                        // Cetáceos: Ondulación espinal vertical
                        else if (config.activeSkeletonType === 'cetacean') {
                            if (Math.abs(rx) < 0.2) { 
                                b.rotation.x = Math.sin(t * speed - wz * 1.2) * 0.3;
                            } else { 
                                b.rotation.x = Math.sin(t * speed) * 0.4;
                            }
                        }

                        // Arácnidos: Caminata Radial Escalonada (Matriz de Fase Fraccional)
                        else if (config.activeSkeletonType === 'arachnid') {
                            if (Math.abs(rx) > 0.1) {
                                // Ondas viajando de adelante hacia atrás con lados cruzados
                                const wavePhase = (wz * 0.15) + (wx > 0 ? 0 : 0.5); 
                                const gaitVal = ProceduralKinematics.getGaitCurve(tNorm, wavePhase, 0.7); // Arañas tienen 70% Duty Factor
                                
                                b.rotation.x = gaitVal * 0.4;
                                b.rotation.z = Math.cos(t * speed + wavePhase*Math.PI*2) * 0.2 * Math.sign(wx);
                                
                                // El fémur se encoge y eleva durante el paso
                                if (b.children.length > 0) {
                                    const localT = (tNorm + wavePhase) % 1.0;
                                    const normLocalT = localT < 0 ? localT + 1.0 : localT;
                                    if (normLocalT >= 0.7) {
                                        b.children[0].rotation.x = 0.5; // Doblar rodilla en vuelo
                                    } else {
                                        b.children[0].rotation.x = 0.1; // Fijar en suelo
                                    }
                                }
                            }
                        }

                        // Espina Torácica y Lumbar: Galope Rotatorio vs Transversal
                        else if (['canine', 'feline', 'equine'].includes(config.activeSkeletonType)) {
                            if (Math.abs(rx) < 0.1) {
                                if (config.activeSkeletonType === 'equine') {
                                    // Caballo: Espina rígida (galope transversal puro)
                                    b.rotation.x = Math.sin(t * speed) * 0.02; 
                                } else {
                                    // Perro/Gato: Alta flexibilidad espinal (galope rotatorio / bound)
                                    let flex = (config.activeSkeletonType === 'feline') ? 0.4 : 0.25;
                                    b.rotation.x = (mode === 'gallop' || mode === 'canter') ? Math.sin(t * speed - wz * 1.2) * flex : 0;
                                }
                            }
                        }

                        // Mustélido: Onda espinal dorso-ventral (Galope Bound)
                        else if (config.activeSkeletonType === 'mustelid') {
                            // Espina: ondulación vertical viajera (signature mustelid bound)
                            if (Math.abs(rx) < 0.1) {
                                b.rotation.x = Math.sin(t * speed - wz * 1.8) * 0.25;
                            }
                            // Patas: usan el handler genérico de cuadrúpedos (cae al else final)
                        }

                        // Lacertiliano: Sprawling + Undulación Lateral
                        else if (config.activeSkeletonType === 'lacertilian') {
                            // Espina: ondulación lateral (misma que serpentine pero menor)
                            if (Math.abs(rx) < 0.2 && Math.abs(b.position.x) < 0.2) {
                                b.rotation.y = Math.sin(t * speed - wz * 1.2) * 0.2;
                            }
                            // Patas sprawling: empujan lateralmente + flexionan
                            else if (Math.abs(rx) > 0.2) {
                                const wavePhase = (wz > 0.5 ? 0 : 0.5) + (wx > 0 ? 0 : 0.25);
                                b.rotation.x = Math.sin(t * speed + wavePhase * Math.PI * 2) * 0.4;
                                b.rotation.z = Math.cos(t * speed + wavePhase * Math.PI * 2) * 0.3 * Math.sign(wx);
                            }
                            // Cola: onda lateral viajera
                            else if (wz < -0.5) {
                                b.rotation.y = Math.sin(t * speed - wz * 2.0) * 0.3;
                            }
                        }

                        // Anuro: Extensión explosiva de patas traseras
                        else if (config.activeSkeletonType === 'anuran') {
                            const jumpCycle = (t * speed * 0.3) % 1.0;
                            const isJumping = jumpCycle < 0.3;
                            const jumpPhase = isJumping ? jumpCycle / 0.3 : 0;
                            
                            // Patas traseras: extensión explosiva durante salto
                            if (wz < 0.5 && Math.abs(rx) > 0.2) {
                                if (isJumping) {
                                    b.rotation.x = -jumpPhase * 1.2; // Extensión violenta
                                    if (b.children.length > 0) {
                                        b.children.forEach(c => {
                                            if (c.isBone) c.rotation.x = jumpPhase * 0.8;
                                        });
                                    }
                                } else {
                                    b.rotation.x = 0.6; // Crouch (plegadas)
                                    if (b.children.length > 0) {
                                        b.children.forEach(c => {
                                            if (c.isBone) c.rotation.x = -0.4;
                                        });
                                    }
                                }
                            }
                            // Patas delanteras: amortiguación en aterrizaje
                            else if (wz > 1.0 && Math.abs(rx) > 0.2) {
                                const landPhase = (jumpCycle > 0.3 && jumpCycle < 0.5) ? (jumpCycle - 0.3) / 0.2 : 0;
                                b.rotation.x = -landPhase * 0.4;
                            }
                        }

                        // Lagomorph: Half-Bound Kinematics
                        else if (config.activeSkeletonType === 'lagomorph') {
                            const boundCycle = (t * speed * 0.4) % 1.0;
                            const isJumping = boundCycle < 0.4;
                            const phase = isJumping ? boundCycle / 0.4 : 0;
                            
                            // Espina torácica se curva al recoger patas
                            if (Math.abs(rx) < 0.1 && wz > 0) {
                                b.rotation.x = isJumping ? -0.2 : Math.sin(boundCycle * Math.PI) * 0.3;
                            }
                            
                            // Patas Traseras (siempre pares)
                            if (wz < 0 && Math.abs(rx) > 0.2) {
                                if (isJumping) {
                                    b.rotation.x = phase * 0.8; // Empuje sincronizado
                                    if(b.children.length > 0) b.children[0].rotation.x = -phase * 0.5;
                                } else {
                                    b.rotation.x = -0.5; // Recogidas
                                    if(b.children.length > 0) b.children[0].rotation.x = 0.8;
                                }
                            }
                            // Patas Delanteras (alternas)
                            else if (wz > 0 && Math.abs(rx) > 0.2) {
                                const frontPhase = (tNorm + (wx > 0 ? 0 : 0.5)) % 1.0;
                                b.rotation.x = Math.sin(frontPhase * Math.PI * 2) * 0.4;
                            }
                        }

                        // Insecta: Tripod Gait & Metachronal Wave
                        else if (config.activeSkeletonType === 'insecta') {
                            // Abdomen respira/bombea levemente
                            if (Math.abs(rx) < 0.1 && wz < 1.0) {
                                b.rotation.x = Math.sin(t * 2.0) * 0.05;
                            }
                            // Patas (6 en total). Tripod gait = triangulos alternos
                            else if (Math.abs(rx) > 0.3) {
                                // Determinar número de pata (1=front, 2=mid, 3=back)
                                let pair = wz > 1.9 ? 1 : (wz > 1.1 ? 2 : 3);
                                
                                // Tripod Phase: Pata 1Izq + 2Der + 3Izq mueven juntas
                                let wavePhase = 0;
                                if (mode === 'walk') {
                                    // Tripod Gait (Rápido)
                                    const isLeft = wx < 0;
                                    wavePhase = (pair % 2 === (isLeft ? 0 : 1)) ? 0 : 0.5;
                                } else {
                                    // Metachronal Wave (Trot/Slow) -> Onda desde atrás hacia adelante
                                    wavePhase = (pair * 0.33) + (wx > 0 ? 0.5 : 0);
                                }
                                
                                const gaitVal = ProceduralKinematics.getGaitCurve(tNorm, wavePhase, 0.5); // Duty factor 0.5
                                b.rotation.x = gaitVal * 0.3; // Swing/Stance
                                b.rotation.z = Math.cos(t * speed + wavePhase * Math.PI * 2) * 0.2 * Math.sign(wx); // Elevación coxal
                                
                                // Tibia flex
                                if (b.children.length > 0) {
                                    const localT = (tNorm + wavePhase) % 1.0;
                                    b.children[0].rotation.x = (localT > 0.5) ? -0.4 : 0.1; // Dobla en swing
                                }
                            }
                        }

                        // Crustacean: Marcha Lateral Decápodo + Pinzas
                        else if (config.activeSkeletonType === 'crustacean') {
                            // Pinzas grandes arriba en guardia
                            if (b.userData.worldPos.z > 1.2 && Math.abs(rx) > 0.5) {
                                b.rotation.y = Math.sin(t * 1.5) * 0.1 * Math.sign(wx);
                                b.rotation.z = 0.5 * Math.sign(wx); // Mantener elevadas
                            }
                            // Walking legs (sprawling)
                            else if (Math.abs(rx) > 0.4 && b.userData.worldPos.z < 1.0) {
                                let pair = wz > 0 ? 1 : (wz > -0.6 ? 2 : 3);
                                let wavePhase = (pair * 0.33) + (wx > 0 ? 0.5 : 0);
                                const gaitVal = ProceduralKinematics.getGaitCurve(tNorm, wavePhase, 0.6);
                                b.rotation.x = gaitVal * 0.3; // Paso principal
                                b.rotation.z = Math.cos(t * speed + wavePhase * Math.PI * 2) * 0.15 * Math.sign(wx); // Levantar pata
                            }
                        }
                        // Vehículos Rodantes: Ruedas girando, chasis con suspensión
                        else if (config.activeSkeletonType === 'wheeled') {
                            // Si es el chasis principal (eje Y) se inclina en curvas y frena
                            if (Math.abs(rx) < 0.1) {
                                b.rotation.x = -Math.sin(tNorm * Math.PI * 2) * 0.02; // Cabeceo
                            }
                            // Si es una rueda (offset X > 0.5)
                            else if (Math.abs(rx) > 0.5) {
                                // Las ruedas giran continuamente en el eje X
                                b.rotation.x = -(t * speed * 4.0); 
                                // Ruedas delanteras giran levemente como si maniobraran
                                if (wz > 0.5) {
                                    b.rotation.y = Math.sin(t * speed * 0.2) * 0.15;
                                }
                            }
                        }

                        // Aeronaves Flotantes: Rotores girando rápido, alabeo de fuselaje
                        else if (config.activeSkeletonType === 'hovering') {
                            // Fuselaje: alabeo y cabeceo fluidos
                            if (Math.abs(rx) < 0.1 && wz < 0.5 && wz > -0.5) {
                                b.rotation.z = Math.sin(t * speed * 0.4) * 0.15; // Alabeo (Roll)
                                b.rotation.x = Math.sin(t * speed * 0.3) * 0.1; // Cabeceo (Pitch)
                            }
                            // Rotores / Helices (partes que apuntan hacia arriba Y o a los lados)
                            else if (ry > 0.5 || Math.abs(rx) > 1.0) {
                                // Girar rápidamente en el eje local correspondiente
                                if (ry > 0.8) {
                                    b.rotation.y = -(t * speed * 8.0); // Rotor superior (Helicóptero)
                                } else if (Math.abs(rx) > 1.0) {
                                    b.rotation.x = -(t * speed * 8.0); // Hélices de ala (Avión)
                                }
                            }
                        }

                        // Cuadrúpedos y Bípedos: Marcha Matricial con Pseudo-IK de 3 segmentos
                        else {
                            // Detectar si este hueso es una RAÍZ DE PATA (hip stub / shoulder stub)
                            const isLimbRoot = b.parent?.userData?.worldPos && 
                                Math.abs(wx - b.parent.userData.worldPos.x) > 0.05 && 
                                b.children.filter(c => c.isBone).length > 0;
                            
                            if (isLimbRoot) {
                                const isFront = wz > 0;
                                const isRight = wx > 0;
                                
                                let phase = 0.0;
                                let dutyCycle = 0.5;
                                
                                if (mode === 'walk_real') {
                                    dutyCycle = 0.65;
                                    if (!isFront && !isRight) phase = 0.0;
                                    else if (isFront && !isRight) phase = 0.25;
                                    else if (!isFront && isRight) phase = 0.5;
                                    else phase = 0.75;
                                } else if (mode === 'canter') {
                                    dutyCycle = 0.4;
                                    if (!isFront && !isRight) phase = 0.0;
                                    else if ((!isFront && isRight) || (isFront && !isRight)) phase = 0.3;
                                    else phase = 0.6;
                                } else if (mode === 'gallop') {
                                    dutyCycle = 0.3;
                                    if (!isFront && !isRight) phase = 0.0;
                                    else if (!isFront && isRight) phase = 0.15;
                                    else if (isFront && !isRight) phase = 0.5;
                                    else phase = 0.65;
                                } else {
                                    // Trot / walk genérico
                                    dutyCycle = 0.45;
                                    if ((isFront && !isRight) || (!isFront && isRight)) phase = 0.5;
                                }
                                
                                const gaitVal = ProceduralKinematics.getGaitCurve(tNorm, phase, dutyCycle);
                                const localT = (tNorm + phase) % 1.0;
                                const normLocalT = localT < 0 ? localT + 1.0 : localT;
                                const isSwing = normLocalT >= dutyCycle;
                                
                                // Las patas delanteras apuntan ABAJO-ATRÁS en el esqueleto,
                                // así que necesitan signo INVERTIDO para moverse hacia adelante.
                                const limbSign = isFront ? -1 : 1;
                                
                                // === TABLA ROM BIOMECÁNICA (radianes reales por marcha) ===
                                // Fuente: Equine Locomotion Studies (Clayton, 2004) - Now loaded via geppetto_kinematics.json
                                const r = config.geppettoData?.ROM?.[mode] || config.geppettoData?.ROM?.trot || { femur: 0.4, knee: 0.7, cannon: 0.4, hoof: -0.3, stanceHoof: 0.35 };
                                
                                // Delanteras levantan rodillas MÁS ALTO (alta escuela)
                                const frontKneeBoost = isFront ? 1.4 : 1.0;
                                
                                // === SEGMENTO 0: ESCÁPULA / PELVIS (el stub) ===
                                // Sutil deslizamiento adelante-atrás
                                let stubAmp = isFront ? 0.08 : 0.04;
                                if (config.activeSkeletonType === 'primate' && isFront) {
                                    stubAmp = 0.3; // exagerar balanceo de hombros arborícola
                                    b.rotation.z = Math.sin(t * speed * 0.5) * 0.2 * Math.sign(wx); // widen stance dynamic
                                }
                                b.rotation.x = gaitVal * stubAmp * limbSign;
                                
                                // === SEGMENTO 1: FÉMUR/HÚMERO ===
                                const femur = b.children.find(c => c.isBone);
                                if (femur) {
                                    femur.rotation.x = gaitVal * r.femur * limbSign;
                                    
                                    // === SEGMENTO 2: RODILLA/CARPO ===
                                    const knee = femur.children.find(c => c.isBone);
                                    if (knee) {
                                        if (isSwing) {
                                            let swingT = (normLocalT - dutyCycle) / (1.0 - dutyCycle);
                                            knee.rotation.x = Math.sin(swingT * Math.PI) * r.knee * frontKneeBoost;
                                            
                                            // === SEGMENTO 3: CANNON/CORVEJÓN ===
                                            const cannon = knee.children.find(c => c.isBone);
                                            if (cannon) {
                                                cannon.rotation.x = Math.sin(swingT * Math.PI) * r.cannon;
                                                
                                                // === SEGMENTO 4: ÚNGULA (Fetlock → Casco) ===
                                                const hoof = cannon.children.find(c => c.isBone);
                                                if (hoof) {
                                                    const hoofPhase = Math.max(0, swingT - 0.15);
                                                    hoof.rotation.x = Math.sin(hoofPhase * Math.PI) * r.hoof;
                                                }
                                            }
                                        } else {
                                            // STANCE: pierna recta soportando peso
                                            knee.rotation.x = 0.05;
                                            const cannon = knee.children.find(c => c.isBone);
                                            if (cannon) {
                                                cannon.rotation.x = 0;
                                                const hoof = cannon.children.find(c => c.isBone);
                                                if (hoof) {
                                                    const stanceT = normLocalT / dutyCycle;
                                                    hoof.rotation.x = Math.sin(stanceT * Math.PI) * r.stanceHoof;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Cola: onda viajera lateral (más intensa que un simple vaivén)
                            else if (Math.abs(wx) < 0.05 && wz < -2.0 && !isLimbRoot) {
                                // Cada segmento de cola recibe la onda con retardo según su Z
                                const tailDelay = Math.abs(wz + 2.0) * 0.8;
                                b.rotation.y = Math.sin(t * speed * 0.5 - tailDelay) * 0.25;
                                b.rotation.x = Math.sin(t * speed * 0.3 - tailDelay) * 0.1; // leve ondulación vertical
                            }
                            // Orejas: temblor rápido asimétrico durante la marcha
                            else if (b.userData.worldPos.y > 4.7 && Math.abs(wx) > 0.01) {
                                b.rotation.z = Math.sin(t * 12.0 + wx * 5.0) * 0.15 * Math.sign(wx);
                                b.rotation.x = Math.sin(t * 8.0) * 0.1;
                            }
                            // Mandíbula: micro-rebote sincronizado con el trote
                            else if (b.userData.worldPos.y < 4.2 && wz > 2.5) {
                                b.rotation.x = Math.abs(Math.sin(t * speed)) * 0.05;
                            }
                            // Esternón: balanceo lateral suave
                            else if (b.userData.worldPos.y < 3.0 && Math.abs(wz - 0.5) < 0.2) {
                                b.rotation.z = Math.sin(t * speed * 0.5) * 0.03;
                            }
                            // Cola suave en espina medial (la cola de la vieja lógica)
                            else if (Math.abs(wx) < 0.05 && wz < 0 && !isLimbRoot && b.userData.worldPos.y > 3.3) {
                                b.rotation.y = Math.sin(t * speed * 0.3 - wz) * 0.05;
                            }
                        }
                    }
                });
            }

    }
}
