import * as THREE from 'three';
import { SeededRNG } from '../core/SeededRNG.js';
import { ProceduralTextureFactory } from '../core/ProceduralTextureFactory.js';

/**
 * RaccoonEnvironmentFactory
 * Generates planets, asteroids, and space bounds for the ¡Busca! saga.
 */
export class RaccoonEnvironmentFactory {
    constructor() {
        this.cache = {};
        this.rng = new SeededRNG(42);
        this.texFactory = new ProceduralTextureFactory();
    }
    
    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Esta factory es un GENERADOR CON SEMILLA, no una sala fija: sabe montar
     * tres mundos distintos y recibe la escena por parámetro (no la guarda).
     * Por eso buildAll tiene que elegir uno.
     *
     * @param {Object}  c
     * @param {'space'|'planet'|'city'} [c.mode='space']
     * @param {THREE.Scene} [c.scene] escena destino (si no, this.scene)
     * @param {number}  [c.seed] semilla; misma semilla ⇒ mismo mundo
     */
    buildAll(c = {}) {
        const scene = c.scene ?? this.scene;
        if (!scene) throw new Error('RaccoonEnvironmentFactory.buildAll necesita una escena (c.scene)');
        if (c.seed !== undefined) this.seedRandom(c.seed);

        const mode = c.mode ?? 'space';
        switch (mode) {
            case 'planet': this.generatePlanet(scene, c.planetRadius ?? 15, c.count ?? 8); break;
            case 'city':   this.generateCity(scene, c.cityRadius ?? 80, c.count ?? 12); break;
            case 'space':  this.generateSpace(scene, c.pCount ?? 200, c.aCount ?? 40, c.tankSize ?? 100); break;
            default: throw new Error(`RaccoonEnvironmentFactory: modo desconocido "${mode}" (space|planet|city)`);
        }
        return { mode, scene };
    }

    seedRandom(s) {
        this.rng.reseed(s); 
    }

    generateSpace(scene, pCount, aCount, TANK_SIZE) {
        const planets = [];
        const asteroids = [];
        const targetPlanetIdx = Math.floor(this.rng.next() * pCount);
        
        // Planets
        for (let i = 0; i < pCount; i++) {
            const radius = 8 + this.rng.next() * 12;
            const geo = new THREE.SphereGeometry(radius, 32, 16);
            const col = new THREE.Color().setHSL(this.rng.next(), 0.6, 0.4);
            const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
            const mesh = new THREE.Mesh(geo, mat);
            
            let valid = false;
            let pPos = new THREE.Vector3();
            while(!valid) {
                pPos.set((this.rng.next()-0.5)*TANK_SIZE*0.8, (this.rng.next()-0.5)*TANK_SIZE*0.8, (this.rng.next()-0.5)*TANK_SIZE*0.8);
                if (pPos.length() > 50) valid = true; // Not too close to start
            }
            mesh.position.copy(pPos);
            
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(radius*1.2, radius*1.4, 32),
                new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
            );
            mesh.add(ring);
            
            mesh.userData = { isPlanet: true, index: i, scanned: false };
            scene.add(mesh);
            planets.push({ mesh, ring, pos: pPos, radius, index: i, scanned: false, color: col });
        }
        
        // Asteroids
        const astGeo = new THREE.DodecahedronGeometry(3, 1); 
        for(let i = 0; i < aCount; i++) {
            const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
            const mesh = new THREE.Mesh(astGeo, mat);
            mesh.scale.set(1+this.rng.next(), 1+this.rng.next(), 1+this.rng.next());
            mesh.position.set((this.rng.next()-0.5)*TANK_SIZE*0.9, (this.rng.next()-0.5)*TANK_SIZE*0.9, (this.rng.next()-0.5)*TANK_SIZE*0.9);
            mesh.rotation.set(this.rng.next()*Math.PI, this.rng.next()*Math.PI, this.rng.next()*Math.PI);
            const vel = new THREE.Vector3((this.rng.next()-0.5)*15, (this.rng.next()-0.5)*15, (this.rng.next()-0.5)*15);
            const rotVel = new THREE.Vector3((this.rng.next()-0.5)*2, (this.rng.next()-0.5)*2, (this.rng.next()-0.5)*2);
            scene.add(mesh);
            asteroids.push({ mesh, vel, rotVel });
        }
        
        return { planets, asteroids, targetPlanetIdx };
    }

    createShip() {
        const ship = new THREE.Group();
        const shipVisual = new THREE.Group();
        
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xaa33ff, metalness: 0.8, roughness: 0.2 });
        const hull = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 4), hullMat);
        hull.rotation.x = -Math.PI / 2; // Point cone down -Z
        shipVisual.add(hull);
        
        const engineGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 })
        );
        engineGlow.position.z = 3.5;
        shipVisual.add(engineGlow);
        
        ship.add(shipVisual);
        return { root: ship, glow: engineGlow };
    }

    createDecoration(scene, TANK_SIZE) {
        // Stars
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(5000 * 3);
        const sr = () => this.rng.next();
        for (let i = 0; i < 5000 * 3; i++) starPositions[i] = (sr() - 0.5) * 1000;
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false }));
        scene.add(stars);

        // Cosmic dust
        const dustGeo = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(1000 * 3);
        for (let i = 0; i < 1000 * 3; i++) dustPositions[i] = (sr() - 0.5) * TANK_SIZE;
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        const dustPoints = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x6688aa, size: 0.5, transparent: true, opacity: 0.5 }));
        scene.add(dustPoints);

        // Bounds
        const gridHelper = new THREE.GridHelper(TANK_SIZE, 20, 0x330055, 0x110022);
        gridHelper.position.y = -TANK_SIZE/2;
        scene.add(gridHelper);
        const gridHelperTop = new THREE.GridHelper(TANK_SIZE, 20, 0x330055, 0x110022);
        gridHelperTop.position.y = TANK_SIZE/2;
        scene.add(gridHelperTop);
        
        return dustPoints;
    }

    generatePlanet(scene, PLANET_RADIUS = 15, count = 8) {
        const planetGroup = new THREE.Group();
        scene.add(planetGroup);

        const planetGeo = new THREE.SphereGeometry(PLANET_RADIUS, 64, 48);
        const colors = new Float32Array(planetGeo.attributes.position.count * 3);
        const positions = planetGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i) / PLANET_RADIUS;
            let r, g, b;
            /**
             * ⚠️ COLORES SUBIDOS Y CONTINENTES DE DOS OCTAVAS. LOS DOS POR LO MISMO.
             * ═══════════════════════════════════════════════════════════════════
             *
             * Abierta la imagen, el planeta salía verde oscuro con las costas en
             * ESCALONES: un damero mal disimulado en vez de continentes. La causa
             * era `Math.sin(nx*2.3 + nz*1.7) > 0.3` — una sola onda, con su periodo
             * bien visible sobre una esfera de 64×48. Un patrón regular no parece
             * un patrón regular hasta que lo miras, y luego ya no se puede dejar
             * de ver.
             *
             * Se arregla sumando una segunda onda de otra frecuencia y desfase: no
             * es ruido de verdad, pero rompe la periodicidad y a esta escala basta.
             * Y se mete el eje Y en la cuenta, que antes no entraba y por eso las
             * costas salían idénticas en los dos hemisferios.
             *
             * Los colores suben a la mitad alta del rango por la misma razón que
             * los edificios de la ciudad: un planeta de consola es VIVO. Verde
             * oscuro sobre negro no se lee desde órbita, que es justo la distancia
             * a la que se juega esta etapa.
             */
            const nx = positions.getX(i) / PLANET_RADIUS;
            const nz = positions.getZ(i) / PLANET_RADIUS;
            const tierra = Math.sin(nx * 4.1 + nz * 2.9 + y * 1.7)
                         + 0.6 * Math.sin(nx * 9.3 - nz * 7.1 + 2.4);

            /**
             * ⚠️ EL ORDEN DE ESTAS CUATRO LÍNEAS ES EL DIBUJO.
             *
             * Con el umbral de océano en 0,35 y las bandas de latitud muy
             * separadas entre sí, el planeta salía a RAYAS: se veían los paralelos
             * y no se veía ni una costa. La latitud mandaba sobre el ruido.
             *
             * Ahora el mar decide primero y con umbral 0 —mitad y mitad, que es lo
             * que hace que haya continentes que reconocer— y las tres tierras se
             * acercan entre sí para que lean como UNA cosa con matices, no como
             * tres franjas. La latitud tiñe; el ruido dibuja.
             */
            if (Math.abs(y) > 0.86) { r = 0.92; g = 0.96; b = 1.0; }       // casquete
            else if (tierra > 0.0) { r = 0.10; g = 0.34; b = 0.62; }       // océano
            else if (Math.abs(y) > 0.62) { r = 0.42; g = 0.56; b = 0.34; } // tundra
            else if (Math.abs(y) < 0.18) { r = 0.32; g = 0.60; b = 0.28; } // selva
            else { r = 0.42; g = 0.60; b = 0.30; }                         // llanura
            colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
        }
        planetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const planetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
        planetGroup.add(new THREE.Mesh(planetGeo, planetMat));

        /**
         * La atmósfera existía y no se veía: `opacity: 0.08` sobre un fondo negro
         * es invisible. Es el halo que separa el planeta del espacio y le da el
         * borde — sin él, la esfera se recorta contra el vacío como una pegatina.
         * Sube a 0.22 y se le añade una segunda capa más ancha y más tenue, que es
         * como se hace un degradado de atmósfera sin escribir un shader.
         */
        const atmosMat = new THREE.MeshBasicMaterial({ color: 0x5599ff, transparent: true, opacity: 0.22, side: THREE.BackSide });
        planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.04, 32, 32), atmosMat));
        const haloMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.09, side: THREE.BackSide });
        planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.12, 32, 32), haloMat));

        // Settlements
        const settlements = [];
        const targetSettlementIdx = Math.floor(this.rng.next() * count);
        
        for (let i = 0; i < count; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / count);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const jPhi = phi + (this.rng.next() - 0.5) * 0.3;
            const jTheta = theta + (this.rng.next() - 0.5) * 0.3;
            
            const x = PLANET_RADIUS * Math.sin(jPhi) * Math.cos(jTheta);
            const y = PLANET_RADIUS * Math.cos(jPhi);
            const z = PLANET_RADIUS * Math.sin(jPhi) * Math.sin(jTheta);
            
            const cityGroup = new THREE.Group();
            cityGroup.position.set(x, y, z);
            cityGroup.lookAt(0, 0, 0);
            cityGroup.rotateX(Math.PI);
            
            const citySize = 0.4 + this.rng.next() * 0.4;
            for (let b = 0; b < 5 + Math.floor(this.rng.next() * 8); b++) {
                const bh = 0.1 + this.rng.next() * 0.3 * citySize;
                const bw = 0.05 + this.rng.next() * 0.1;
                const bMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.1 + this.rng.next() * 0.05, 0.5, 0.4 + this.rng.next() * 0.2),
                    emissive: new THREE.Color(0xffcc44),
                    emissiveIntensity: 0.1 + this.rng.next() * 0.3
                });
                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), bMat);
                bMesh.position.set((this.rng.next() - 0.5) * citySize, bh / 2, (this.rng.next() - 0.5) * citySize);
                cityGroup.add(bMesh);
            }
            
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
            const ring = new THREE.Mesh(new THREE.RingGeometry(citySize * 0.8, citySize * 1.1, 16), ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.01;
            cityGroup.add(ring);
            
            const labelMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7 });
            const label = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), labelMat);
            label.position.y = 0.8;
            cityGroup.add(label);
            
            const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(citySize * 1.5), new THREE.MeshBasicMaterial({ visible: false }));
            hitMesh.userData = { cityIndex: i };
            cityGroup.add(hitMesh);
            
            planetGroup.add(cityGroup);
            
            settlements.push({
                group: cityGroup, ring, label, hit: hitMesh,
                pos: new THREE.Vector3(x, y, z),
                index: i, scanned: false
            });
        }
        
        return { planetGroup, settlements, targetSettlementIdx };
    }

    createSatellite(scene, PLANET_RADIUS = 15) {
        const satellite = new THREE.Group();
        const satBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
        satellite.add(satBody);
        
        const panelGeo = new THREE.BoxGeometry(2.5, 0.02, 0.8);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a3355, metalness: 0.5 });
        satellite.add(new THREE.Mesh(panelGeo, panelMat));
        satellite.position.set(0, PLANET_RADIUS + 8, 0);
        scene.add(satellite);
        return satellite;
    }

    generateCity(scene, CITY_RADIUS = 80, count = 12) {
        const buildings = [];
        const targetBuildingIdx = Math.floor(this.rng.next() * count);
        let targetMarker = null;

        const cols = Math.ceil(Math.sqrt(count));
        const spacing = (CITY_RADIUS * 2) / (cols + 1);
        
        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = -CITY_RADIUS + spacing * (col + 1) + (this.rng.next() - 0.5) * spacing * 0.3;
            const z = -CITY_RADIUS + spacing * (row + 1) + (this.rng.next() - 0.5) * spacing * 0.3;
            const height = 8 + this.rng.next() * 30;
            const width = 5 + this.rng.next() * 6;
            const depth = 5 + this.rng.next() * 6;
            
            /**
             * ⚠️ LOS EDIFICIOS ERAN CASI NEGROS POR DISEÑO, NO POR FALTA DE LUZ.
             * ═══════════════════════════════════════════════════════════════════
             *
             * Aquí ponía `setHSL(hue, 0.3, 0.08 + rng * 0.05)`. Medido en la escena
             * viva: doce edificios con claridad HSL entre 0,083 y 0,125.
             *
             * ⚠️ Y ESE NÚMERO ES LINEAL, NO PERCEPTUAL. LO CONTÉ MAL UNA VEZ.
             *
             * Escribí «están al nueve por ciento de claridad» tratando la cifra
             * como si fuera brillo percibido, y no lo es: three trabaja en espacio
             * LINEAL, y `setHSL`/`getHSL` usan ese espacio salvo que se les pida
             * otro. Leído en los dos, el mismo material dice cosas distintas:
             *
             *     antes    lineal 0,08   ·  sRGB ~0,31
             *     ahora    lineal 0,229  ·  sRGB  0,50
             *
             * O sea que no era un 9% de brillo: era un gris medio-oscuro que, con
             * luz de noche y tono filmico encima, acaba leyéndose como negro. El
             * arreglo es el mismo y la mejora está medida —el porcentaje de píxeles
             * casi negros baja del 41% al 28%—, pero el motivo se cuenta bien.
             *
             * La cadena de medidas, sobre la luminancia media del fotograma:
             *
             *     cielo:false luces:false   media 0,0404 · casi negro 41%
             *     cielo:true  luces:false   media 0,1429 · casi negro 41%
             *     cielo:true  luces:true    media 0,1455 · casi negro 36%
             *
             * El cielo triplicó la media —iluminó el FONDO— y las luces del plugin
             * apenas movieron nada. Con los edificios al 9%, ninguna de las dos
             * cosas podía funcionar: no había nada que iluminar.
             *
             * Ahora 0,22–0,38 de claridad y más saturación. No es realismo: es la
             * decisión de estilo de un juego de consola, donde de noche se ve. Un
             * tono medio con color propio se lee de un vistazo; un gris al 9% con
             * una ventana encendida encima, no.
             */
            const hue = 0.55 + this.rng.next() * 0.15;
            const bColor = new THREE.Color().setHSL(hue, 0.45, 0.22 + this.rng.next() * 0.16);
            const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.7, metalness: 0.3, emissive: bColor, emissiveIntensity: 0.1 });
            const bMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
            bMesh.position.set(x, height / 2, z);
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            scene.add(bMesh);
            
            const windowRows = Math.floor(height / 3);
            const windowCols = Math.floor(width / 2.5);
            for (let wy = 0; wy < windowRows; wy++) {
                for (let wx = 0; wx < windowCols; wx++) {
                    if (this.rng.next() < 0.4) continue; 
                    const wLit = this.rng.next() > 0.3;
                    const wColor = wLit ? new THREE.Color().setHSL(0.12 + this.rng.next() * 0.05, 0.8, 0.7) : new THREE.Color(0x111122);
                    const wMat = new THREE.MeshBasicMaterial({ color: wColor, transparent: true, opacity: wLit ? 0.9 : 0.3 });
                    const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), wMat);
                    wMesh.position.set(-width/2 + 1.2 + wx * 2.5, -height/2 + 2 + wy * 3, depth/2 + 0.01);
                    bMesh.add(wMesh);
                    const wBack = wMesh.clone();
                    wBack.position.z = -depth/2 - 0.01;
                    wBack.rotation.y = Math.PI;
                    bMesh.add(wBack);
                }
            }
            
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
            const glowMesh = new THREE.Mesh(new THREE.RingGeometry(Math.max(width, depth) * 0.6, Math.max(width, depth) * 0.8, 32), glowMat);
            glowMesh.rotation.x = -Math.PI / 2;
            glowMesh.position.set(x, 0.5, z);
            scene.add(glowMesh);
            
            const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 2, height + 2, depth + 2), new THREE.MeshBasicMaterial({ visible: false }));
            hitMesh.position.copy(bMesh.position);
            hitMesh.userData = { buildingIndex: i };
            scene.add(hitMesh);
            
            if (i === targetBuildingIdx) {
                targetMarker = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.9 }));
                targetMarker.position.set(x, height + 3, z);
                targetMarker.visible = false;
                scene.add(targetMarker);
            }
            
            buildings.push({ mesh: bMesh, glow: glowMesh, hit: hitMesh, pos: new THREE.Vector3(x, height / 2, z), height, width, depth, index: i, scanned: false });
        }
        
        for (let i = 0; i < 20; i++) {
            const lx = (this.rng.next() - 0.5) * CITY_RADIUS * 1.8;
            const lz = (this.rng.next() - 0.5) * CITY_RADIUS * 1.8;
            const light = new THREE.PointLight(0xff8833, 2, 30, 2);
            light.position.set(lx, 6, lz);
            scene.add(light);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            post.position.set(lx, 3, lz);
            scene.add(post);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff8833 }));
            bulb.position.set(lx, 6.2, lz);
            scene.add(bulb);
        }

        return { buildings, targetBuildingIdx, targetMarker };
    }

    createDrone(scene) {
        const drone = new THREE.Group();
        const droneInner = new THREE.Group();
        
        droneInner.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.3, metalness: 0.6 })));
        
        const armMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const propMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3 });
        const propellers = [];
        [[-1.5, 0, -1.5], [1.5, 0, -1.5], [-1.5, 0, 1.5], [1.5, 0, 1.5]].forEach(([ax, ay, az]) => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), armMat);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = Math.atan2(az, ax);
            arm.position.set(ax * 0.5, 0.1, az * 0.5);
            droneInner.add(arm);
            
            const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16), propMat);
            prop.position.set(ax, 0.3, az);
            droneInner.add(prop);
            propellers.push(prop);
        });
        
        const spot = new THREE.SpotLight(0x00ffcc, 15.0, 200, Math.PI / 8, 0.5, 0.5);
        spot.position.set(0, -0.3, 0);
        spot.castShadow = true;
        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, -100, 0);
        droneInner.add(spotTarget);
        spot.target = spotTarget;
        droneInner.add(spot);
        
        const beamCanvas = ProceduralTextureFactory.gradientBeam([0, 255, 200], 0.4);
        const tex = this.texFactory.getOrCreate('volumetric_beam_cyan', () => beamCanvas);
        
        const volGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
        volGeo.translate(0, -0.5, 0);
        const volBeam = new THREE.Mesh(volGeo, new THREE.MeshBasicMaterial({
            map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide
        }));
        volBeam.position.set(0, -0.3, 0);
        droneInner.add(volBeam);
        
        drone.add(droneInner);
        scene.add(drone);
        
        return { root: drone, inner: droneInner, propellers, volBeam };
    }
}
