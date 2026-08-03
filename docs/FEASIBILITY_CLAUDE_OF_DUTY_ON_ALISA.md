# 🎯 ¿Podríamos hacer "Claude of Duty" sobre alisa-engine?
*Estudio de viabilidad — Aris, 2026-07-28. Encargo de Oscar: "no lo hagas, solo mira si sería posible; si no, qué nos falta".*
*Método: mapeo de sus 11 subsistemas contra NUESTRO código, verificado fichero a fichero (no de memoria).*

---

## VEREDICTO

**Sí, es viable. Y sí, serían ~40× menos líneas** — porque nosotros **componemos sistemas que ya existen**; ellos los **escribieron desde cero**.

| | Claude of Duty | Nosotros |
|---|---|---|
| Líneas | **~55.000** (motor + juego, todo junto) | motor **37.000 ya escritas** + **~1.200-1.500 de juego** |
| Naturaleza | un juego monolítico | un motor ECS reutilizable + una capa de juego |

**La diferencia no es que seamos más listos: es que ellos pagaron el coste del motor dentro del juego, y nosotros ya lo teníamos amortizado.**

---

## MAPEO DE LOS 11 SUBSISTEMAS

| # | Su subsistema | Qué tenemos (verificado) | Veredicto |
|---|---|---|---|
| 1 | **Render** — HDR, cascaded shadows, SSAO, TAA, motion blur, bloom, AgX | `AlisaRenderCore` + `AlisaBloomEngine` (EffectComposer+Bloom+Output) + hoy cableado Sky/SSAO/Bloom/**ACES**. `CSM.js`, `TAARenderPass`, `SMAAPass`, `SSAOPass` ya en el árbol | 🟢 **TENEMOS** (~50 líneas para añadir CSM+TAA) |
| 2 | **Materials** — texturas GPU, 19 superficies, parallax, triplanar | `ProceduralTextureFactory` (asphalt, grass, tiles industriales, atlas de fachadas, oilSpill, lightPool…) + `ProceduralTexture` | 🟡 **PARCIAL — el hueco real**: las nuestras son **canvas 2D**, las suyas **shaders GPU** con parallax/triplanar |
| 3 | **Sky** — dispersión atmosférica, hora del día, PMREM, niebla volumétrica | `Sky.js` (Rayleigh/Mie, cableado hoy) + `SkyRenderPlugin` (ciclo día/noche) + `VolumetricsPlugin` | 🟢 **TENEMOS** (falta PMREM: 3 líneas) |
| 4 | **World** — una calle de 120×120 m con interiores | `CarverSystem` (**generación de ciudad por zonas**: DOWNTOWN/INDUSTRIAL/NIGHTLIFE/SLUMS) + `CarverEnvironmentFactory` (1.268 líneas) + `ProceduralBuildingFactory` (756) + `BSPSystem` (interiores) + `AssetManager.spawnBuilding(distrito, semilla)` + `InstancedRenderPool` | 🟢🟢 **SOMOS MÁS FUERTES** — ellos hicieron *una calle*; nosotros generamos **distritos enteros con semilla** |
| 5 | **Physics** — BVH, cápsula barrida, CCD, tela | `AABBSystem`, `KinematicControllerSystem`, `ProceduralLocomotion`, plataformas+gravedad+salto (probado en el lab de locomoción), `ArachneSoftBodyPhysics` (soft-body) | 🟡 **PARCIAL** — colisión básica sí; BVH/cápsula barrida/CCD no |
| 6 | **Player** — máquina de estados de movimiento (deslizar, encaramarse, asomarse) | `FSMSystem` + `KinematicControllerSystem` + **cámara en primera persona ya existente** en `CabinetEscapeGame` (yaw/pitch por ratón, raycaster de interacción, linterna con haz volumétrico) | 🟡 **BASE SÍ** — los movimientos concretos, ~150 líneas |
| 7 | **Weapons** — armas procedurales, ADS, retroceso, balística | `TurretCombatSystem` (647), `BulletHeavenEngine` (602), `AsteroidsSystem` (balística) | 🟡 **PROYECTILES SÍ** — el "tacto" de arma en 1ª persona, ~200 líneas |
| 8 | **Effects** — partículas, calcas, trazadoras, fogonazos | `ParticleEmitter`, `SparkSystem`, `ArcadeFXPlugin`, `VoxelGlitchFactory`, `FlickerSystem` | 🟢 **CASI TODO** (faltan calcas/decals) |
| 9 | **AI** — NPCs con navmesh y lógica de cobertura | `NavMeshExtractionEngine` (**extrae navmesh de la geometría**) + `NavMeshAgentSystem` + `StealthSightSystem.canSeePoint2D()` (**línea de visión con oclusión por AABB**) + `PhantomFSMSystem` + `CorporateSeekerSystem` + `BoidsSystem` + `ProceduralRigging` (skinning) | 🟢🟢 **SOMOS MÁS FUERTES** — navmesh + visión + FSM + esqueletos procedurales, todo ya |
| 10 | **UI** — HUD en DOM, mira, minimapa, killfeed | `TerminalUIEngine` (664) + `EntityCardSystem` + **`CSS3DRenderer` integrado en el core** (DOM dentro del 3D) | 🟢🟢 **SOMOS MÁS FUERTES** — ellos tienen HUD plano; nosotros **pantallas DOM dentro del mundo** |
| 11 | **Audio** — síntesis Web Audio, HRTF, oclusión, reverb | `SpatialAudioPlugin` (THREE.PositionalAudio = paneo HRTF) + algo de síntesis (`_synthesizeTypingClack`) | 🟡 **PARCIAL** — espacial sí; síntesis completa, oclusión y reverb (convolver) no |

**Recuento:** 🟢 tenemos o superamos **6 de 11** · 🟡 parcial **5 de 11** · ❌ nada desde cero: **0 de 11**.

---

## LO QUE NOS FALTA DE VERDAD (por orden de coste)

1. **Materiales GPU** ⭐ *el hueco de verdad* — parallax occlusion + triplanar en shader. Lo nuestro son texturas canvas 2D: funcionan a media distancia, se rompen de cerca (justo la crítica que a ellos les dieron: *"materiales de ruido de cerca"*). **~300-400 líneas** de shaders.
2. **Física avanzada** — BVH para broadphase, cápsula barrida con CCD. Nuestro AABB vale para plataformas, no para disparos rápidos. **~300 líneas** (o `three-mesh-bvh`, que es librería estándar).
3. **Audio sintetizado** — osciladores + convolver (reverb) + oclusión. **~200 líneas**.
4. **Decals** — impactos de bala sobre superficies. **~100 líneas**.
5. **Cascaded shadow maps** — three ya trae `CSM.js` en el árbol. **~30 líneas**, es cablear.

**Nada de esto es investigación. Todo es trabajo conocido, y 3 de los 5 son librerías estándar.**

---

## LA CAPA DE JUEGO (estimación honesta)

| Pieza | Líneas |
|---|---|
| Controlador FPS (pointer-lock + FSM de movimiento) | ~200 |
| Armas: viewmodel, ADS, retroceso, balística | ~250 |
| IA de combate (componiendo NavMesh + Sight + FSM) | ~200 |
| HUD (mira, minimapa, killfeed) con CSS3D | ~150 |
| Montaje del nivel (`CarverSystem` distrito + `BSPSystem` interiores) | ~150 |
| Efectos y calcas | ~150 |
| Audio | ~150 |
| Cableado y post-proceso | ~100 |
| **TOTAL capa de juego** | **~1.350** |

**~1.350 líneas nuestras vs ~55.000 suyas.** Y encima quedaría **dentro del motor**: cada pieza nueva (decals, materiales GPU, BVH) **sube a `alisa-engine` y sirve para todo lo demás** — para la Aduana, para el confesionario, para ALISA Labs. Lo suyo muere con su juego.

---

## LA VENTAJA QUE ELLOS NO PUEDEN COMPRAR

Aunque igualásemos su fidelidad gráfica, seguiríamos teniendo algo que su arquitectura no contempla:

- **El mundo lee datos reales.** Sus enemigos son ficción; los nuestros salen de **pasaportes** con cuerpo, voz y cinemática declarados.
- **El clima ES telemetría** (`ColonialMetabolismSystem`: la tesorería marca la luz, gastar $NEURO enrojece la niebla).
- **Gym/RL ya expuesto** (`RLGymBridge` con la API estándar en `window`) — su juego se juega; **el nuestro se puede entrenar**.
- **CSS3D**: pantallas DOM vivas dentro del mundo 3D.

---

## RECOMENDACIÓN

**No hacer "Claude of Duty".** Sería demostrar algo que ya sabemos y que no nos sirve. **Sí robarles las cuatro piezas buenas** y subirlas al motor, donde valen para todo:

1. **Materiales GPU** (parallax/triplanar) → sube la calidad de **toda** escena, incluida la Aduana.
2. **CSM** → sombras buenas a distancia, 30 líneas.
3. **BVH** (`three-mesh-bvh`) → colisión y raycast rápidos, útil para el gym.
4. **Decals + síntesis de audio** → efectos de impacto y sonido sin assets.

*Con esas cuatro, nuestro motor iguala su fidelidad — y conserva el espinazo de datos que ellos no tienen.*

---
*Verificado contra: `soma/plugins/{AlisaBloomEngine,SpatialAudioPlugin,GLTFModelPool}.js`, `world/core/ProceduralTextureFactory.js`, `world/systems/{StealthSightSystem,NavMeshExtractionEngine,NavMeshAgentSystem,CarverSystem,TurretCombatSystem,BulletHeavenEngine}.js`, `world/gym_runners/CabinetEscapeGame.js`, `world/factories/{Carver,ProceduralBuilding}EnvironmentFactory.js`. Referencia externa: explainx.ai — "Claude of Duty: Opus 5 Procedural FPS" (julio 2026).*
