# 🗺️ ALISA ENGINE — ATLAS (estudio de Aris, 2026-07-27)

> Encargo de Oscar: *"tómate tu tiempo en estudiar TODO el motor."* Dos lentes: **(A)** separar render de lógica → migrar lo no-render a Python; **(B)** el motor como producto aparte tipo **llmgym**.
> Alcance del estudio: 167 archivos fuente / ~37.000 líneas (sin node_modules), 5 capas. Core leído a fondo; resto mapeado por API + firmas.

---

## 0. Qué ES (el titular honesto)

Un **motor de simulación+render ultraligero, data-native, en el navegador**. No compite en fidelidad gráfica con Unreal (no PBR/GI/PhysX); compite —y gana— en **relación capacidad/peso, contenido procedural y que el mundo es función de datos reales.**

| | Peso |
|---|---|
| Core (`AlisaRenderCore`) | 6 KB / 158 líneas |
| Motor completo (167 files, sin libs) | 1,7 MB / 37K líneas |
| + three.js runtime | 488 KB |
| **Stack render total** | **~2,2 MB** vs 30–50 GB de un AAA |

Corre en una pestaña, sin instalar, sin GPU dedicada. Contenido = función de una semilla (coste marginal ~0).

---

## 1. Arquitectura — 5 capas (mapean la Mesa Esmeralda)

| Capa | Rol Mesa Esmeralda | Files / líneas | Qué contiene |
|---|---|---|---|
| **`soma/`** | Soma / I/O · **RENDER** | 45 / 10.240 | `AlisaRenderCore`, `AssetManager`, 30 plugins, `morphology/` (rigging/anim/textura procedural), `PygmalionEngine`, utils (HubClient/MMOClient) |
| **`psyche/`** | Psyche / CPU · **UI+decisión** | 5 / 1.771 | `TerminalUIEngine`, `TerminalInteractionEngine`, `FSMSystem`, `SteeringSystem`, `EntityCardSystem` |
| **`world/`** | World / ROM · **SIMULACIÓN** | 94 / 21.210 | `ECSWorld`, ~60 `systems/`, 37 `factories/`, `core/` (RNG/particles/locomoción), `gym_runners/` |
| **`extensions/avatar-pipeline/`** | (Data→cuerpo) | 13 / 2.449 | Geppetto / Morpheus / Pygmalion / Arachne (rigging, coreografía, topología, soft-body) |
| **`index.js`** | API pública | — | exporta `AlisaRenderCore, AssetManager, ProceduralRigging, ArachneEngine, NavMesh*, BoidsSystem, AsteroidsEngine, ECSWorld` |

Patrón repetido: `BaseEnvironmentFactory` (monta escena/luz/niebla) + `BaseSimulationSystem` (lógica + `AnimationMixer`) + un `*Plugin` (se engancha al pipeline de `AlisaRenderCore`).

---

## 2. Capacidades (lo que la máquina YA sabe hacer)

### 2.1 Render core — `AlisaRenderCore` (soma)
scene + PerspectiveCamera + WebGLRenderer + **CSS3DRenderer** (interop DOM↔3D) + OrbitControls + sombras. Sistema de **plugins** (`onInit/onUpdate`) y `startLoop(dt)`. Auto-registra `ColonialPassportPlugin` (Hub).

### 2.2 Contenido procedural — `AssetManager` (soma)
La joya. No es un loader, es una **fábrica de contenido con ADN**:
- **1.009 modelos GLB** + loader GLTF con auto-inyección y caché (`GLTFPlugin`, `GLTFModelPool`).
- `spawn(blueprint, cat, seed)` → prop resuelto (variantes, rareza común/rara/épica, materiales, **wear/desgaste**, paletas por categoría slum/corp/military).
- `createRoom(type, cat, seed)` → sala auto-poblada de props.
- `spawnBuilding(district, seed)` → **edificio entero** (plantas→salas→props) de una semilla.
- **Texturas por IA** (`composePrompts`+`generateTextures`) contra un Stable Diffusion local.

### 2.3 Iluminación + CLIMA data-driven (soma/world) ⭐
- **`SkyRenderPlugin`** — ciclo día/noche (interp seno día↔noche sobre fondo+niebla+clearColor).
- **`ColonialMetabolismSystem`** — *el clima ES el metabolismo de la colonia*: sondea el Hub (`/tokenomics/portfolio/treasury`) → tesorería alta = luz brillante/cálida, baja = gris fría; gastar $NEURO dispara **"Entropy Pulse"** → niebla roja densa que decae. **Weather = telemetría, no atrezzo.**
- Estados de clima con transición (`AsteroidsSystem.WAVES`: CALM/DENSE/MONOLITH/SWARM/BREATHE).
- `AlisaBloomEngine`, `VolumetricsPlugin`, `SparkSystem`, `ParticleEmitter`, `FlickerSystem`, `CinematicCameraPlugin`, `SpatialAudioPlugin`.

### 2.4 Pipeline de avatares (extensions + soma/morphology) — la fábrica de ACTORES
- **Geppetto**: `GeppettoChoreographySystem` + `GeppettoBrain` + `GeppettoKinematics` → coreografía/gait procedural (verbo→movimiento, sin clips horneados).
- **Pygmalion**: `PygmalionTopologySystem` + `PygmalionBrain` → topología de malla.
- **Morpheus**: `MorpheusSimulationSystem` → construct/animación.
- **Arachne**: `ArachneIngestionSystem` + `ArachneSoftBodyPhysics` → soft-body.
- **morphology/**: `ProceduralRigging` (1.206 líneas), `ProceduralAnimator`, `ProceduralKinematics`, `ProportionalAtlas`, `SkeletalScanner`, `SemanticAnatomy` (`deduceSemanticArchetype(name)` = nombre→arquetipo de cuerpo, **= mi tabla de despacho de render**), `MotionBank`.
- `SovereignAvatarSystem` (645 líneas) — el sistema de avatar grande.

### 2.5 Simulación — ~60 `systems/` (world)
- **Vida emergente:** `EcosystemSystem`, `FoodChainSystem`, `EnergySystem`, `PheromoneGrid`, `HidingSpotSystem`, `BoidsSystem`.
- **Navegación/IA:** `NavMeshExtractionEngine`, `NavMeshAgentSystem`, `LinearNavAgentSystem`, `SteeringSystem`, `FSMSystem`, `PhantomFSMSystem`, `StealthSightSystem`, `CorporateSeekerSystem`.
- **Vehículos/tráfico:** `IDMSystem`, `TrafficSystem`, `TrafficSurvivalSystem`, `NeuralDrivingSystem`, `ml_dqn_idm` (DQN), `OrbitalKinematicsSystem`.
- **Arcade/combate:** `AsteroidsSystem/Engine`, `BulletHeavenEngine`, `MarabuntaSystem`, `TurretCombatSystem`, `SimonSaysSystem`, `RoboticArm`(IK).
- **Espacio/escala:** `KatamariScaleSystem` (ley base-3, ya portada a Python), `BSPSystem`, `CarverSystem` (gen ciudad), `AABBSystem` (colisión), `SeededRNG`.
- **Puentes colonia:** `ColonialMetabolismSystem`, `HubCartographerSystem`, `TelemetryBridge`, `ScummInteractionEngine`, `ScummOverworldEngine`.

### 2.6 Entornos — 37 `factories/`
Cada uno monta una escena temática completa (luz+props+atmósfera): Aquarium, Biolab, Cabinet, Carver(city), Chopper, Compiz, Marabunta, Dojo, Locomotion, Traffic, Treadmill, VoxelGlitch, Raccoon, ColonialControlRoom, **ProceduralBuilding**, ProceduralProps, Archetype, Katamari, Asteroids, ArcadeRoom/Table, NeonSign…

### 2.7 ECS — `OverworldECS`
ECS JIT clásico (entity→components, query con caché, systems tick). **Componentes estándar:** `TransformComponent` (x,y,z = lógica) vs **`RenderProxyComponent`** (object3d = render) — *el seam render/lógica ya está en el ADN de la entidad*. + `VelocityComponent`, `P2PAssetStreamingComponent` (streaming JIT).

---

## 3. LENTE A — Render vs Lógica (candidatos a Python)

**Hallazgo clave:** la separación **ya está medio hecha**.
1. `HeadlessGymWorker` corre `AsteroidsSystem` en un WebWorker **"sin dependencias de THREE.js, matemática pura"** → los `*System.js` deterministas ya son render-free.
2. El ECS separa `TransformComponent` (lógica) de `RenderProxyComponent` (render).

| Se queda en JS (RENDER) | Candidato a Python (LÓGICA) |
|---|---|
| `AlisaRenderCore`, 30 plugins | Sim deterministas: `Boids`, `PheromoneGrid`, `Ecosystem`, `FoodChain`, `Steering`, `FSM` |
| `morphology/` (rigging/anim/textura), `ParticleEmitter`, `InstancedRenderPool` | Navegación: `NavMesh*`, `LinearNavAgent`, `AABB` (colisión) |
| Factories de entorno (luz/props) | Vehículos: `IDM`, `Traffic`, `NeuralDriving`, `ml_dqn` |
| `AnimationMixer`/`BaseSimulationSystem` | Escala/gen: `KatamariScale` (ya en Python), `Carver`, `BSP`, `SeededRNG` |
| El `RenderProxyComponent` del ECS | El `TransformComponent`/`VelocityComponent` del ECS |

**Tensión a decidir (tu "en su momento"):** si la lógica se va a Python, el gym en navegador (`stepSimulation`) necesita la sim **o** en JS (rápido, co-ubicado) **o** que Python conduzca. El canon dual (Python=Ledger, JS=Render) empuja a Python; el gym-en-navegador empuja a JS. **Recomiendo: doble binding** — mantener la sim en JS para el gym-browser, y exponer la MISMA lógica como servicio Python para el motor-colonia, compartiendo el esquema de componentes. No migrar aún; primero fijar el contrato de componentes (Transform/Velocity/etc.) como frontera.

---

## 4. LENTE B — El motor como producto "llmgym"

**No es aspiracional: el espinazo ya existe.**
- **`RLGymBridge`** expone la **interfaz estándar tipo OpenAI Gym en `window`**: `setRLMode`, `getObservationVector()`, `resetEpisode(seed)`, `stepSimulation(action, dt) → {obs, reward, done, info}`. Comentario literal: *"Expose to Python/Playwright global scope."* → un agente Python conduce el motor por Playwright.
- **`HeadlessGymWorker`** — episodios headless, matemática pura, N ticks → score/telemetría.
- **`MMOClient.submitTelemetry`** — publica scores a un backend de benchmark (leaderboard).
- **6 `tests/run_*_headless.js`** — runners headless (boids, asteroids, chopper, idm, phantom, treadmill).
- **Entornos ya jugables como tareas RL/LLM:** Asteroids, Traffic/Driving, CabinetEscape, Chopper, Phantom(stealth), BulletHeaven, Marabunta, FoodChain, RoboticArm(IK), TurretCombat, SimonSays.
- **Capa SCUMM** (`ScummInteractionEngine`) = espacio de acción **en verbos/lenguaje** → ideal para **agentes LLM** (no solo RL numérico): el LLM razona en verbos-afordancia, no en vectores.

**Qué falta para producto (evaluación):**
1. **Desacoplar la colonia:** hoy el core auto-registra `ColonialPassportPlugin` y varios sistemas llaman al Hub (`HubClient`, tokenomics, JobBoard, telemetry). Para un tercero → un modo "vanilla" sin dependencias de la colonia (flag `hubUrl:null` que salte el passport plugin).
2. **Contrato Gym uniforme:** hoy cada engine implementa `getObservationVector/stepSimulation` a su manera. Estandarizar un `GymEnv` base (obs space, action space, reward) que todos hereden.
3. **Adaptador Python:** un paquete `pip` fino que lance Playwright, cargue un env y exponga `gym.make("alisa/Pedrisco-v0")` con `reset()/step()`. La mitad ya está (el bridge en `window`).
4. **Registro de envs + docs + leaderboard público.**

**Veredicto:** el motor es un **llmgym latente muy fuerte** — ligero, corre en navegador, multi-entorno, con interfaz gym ya expuesta y una capa de acción SCUMM perfecta para LLMs. El trabajo de producto es de **empaquetado y desacople**, no de construir el gym desde cero. Encaja con la lane de ingresos [[autofreelance-render-lane]] y ALISA Labs.

---

## 5. Qué significa para mi lane (render)
Mi replay de la Aduana (cilindros sobre grid) sube de nivel con lo que YA hay:
- Beings → GLB de la biblioteca (o `SemanticAnatomy.deduceSemanticArchetype` → arquetipo de cuerpo) en vez de cilindros.
- Conrad → avatar rigged con `GeppettoChoreographySystem` (camina/sella, verbo→gait, sin clips).
- Sala → `createRoom`/props reales; atmósfera → `SkyRenderPlugin` + niebla; cámara → `CinematicCameraPlugin`.
- El clima ligado al ledger (`ColonialMetabolismSystem`) — la Aduana "suda" cuando la colonia gasta.

**Siguiente paso propuesto (cuando Oscar dé luz verde):** un *vertical slice* de 1 naturalización a nivel videojuego usando estos módulos = prueba de fuego + patrón para `REPLAY_YESTERDAY_79`.

---
## 6. Registro de reparaciones (doctrina: si está rota, se repara)
- **2026-07-27 · `LocomotionEnvironmentFactory.js`** (lab `croupier_physics_locomotion`) — 2 bugs que impedían arrancar la escena, reparados por Aris:
  1. `buildDanceFloor()` hacía `this.floorTiles.push(t)` pero `floorTiles` no se inicializaba en `_legacyConstructor` → añadido `this.floorTiles = []`.
  2. `setupPlayer()` llamaba `GLTFModelPool.get(url).then(...)` (API vieja: estático + promesa). `GLTFModelPool` es instanciable: `new`, `await load(key,path,size)`, `get(key)`→clon síncrono. Reescrito al uso correcto (carga `Cockroach.glb` normalizada).
  - Resultado: lab arranca (cucaracha GLB + sombras + jumping puzzle + cristales), locomoción verificada conduciendo `applyAction(x,z)` por código (24,78 uds recorridas) — que es a su vez la interfaz de acción tipo-gym. Capturas `locomotion_fixed.png`, `locomotion_walked.png`.
  - **TODO pendiente:** revisar si otras factories/labs comparten el mismo patrón roto (`floorTiles` sin init, `GLTFModelPool.get` estático) — probablemente sí en labs migrados a la vez.
- **2026-07-27 · `GLTFModelPool.js` — FIX DE RAÍZ del pelotón.** El patrón `GLTFModelPool.get(path).then(gltf=>…)` estaba roto en KatamariFactory (l.26), InteractionLabFactory (l.159,245) y TrafficEnvironmentFactory (l.90,103,112): alguien refactorizó `GLTFModelPool` de clase-con-loader-estático → pool instanciable y **borró el `static get`** que todos esos consumidores usaban (esperan Promise→gltf crudo `{scene, animations}`, que ellos escalan/clonan). Fix: **restaurado un `static get(path)`** en `GLTFModelPool` (carga fresca por llamada con un `GLTFLoader` compartido; coexiste con el `get(key)` de instancia). **Un solo edit curó los 6 sitios.** Verificado: `croupier_katamari_swarm` renderiza el enjambre de cucarachas GLB (InstancedMesh); `croupier_interaction_lab` (food-chain arena) arranca; `croupier_frogger_m30` ya **no crashea** (0 errores de `GLTFModelPool`) — le queda una pega de arranque APARTE (monta `#modal`, no canvas tras ENGAGE; los 9 GLB de coches existen → es flujo de inicio, no assets, no mi fix). **Regla:** nunca llamar `GLTFModelPool.get` sobre una instancia esperando clon; el estático devuelve gltf crudo, la instancia `get(key)` devuelve clon cacheado.
- **2026-07-27 · `croupier_interaction_lab.html` l.133 — `basePath` muerto de la reorg.** Pasaba `new InteractionLabEngine(core, '/colony/overworld/')` → toda GLB de animal daba **404** (`/colony/overworld/props/models/{Mouse,beast_fox,Velociraptor}.glb`); la arena arrancaba sin actores. Ruta pre-reorg absoluta. Fix: `'../'` (relativo a `/labs/`; los 4 modelos existen en `public/props/models/`). **Verificado con la simulación corriendo:** cadena alimentaria completa en 58 s — ratones comen los 8 quesos, zorros cazan 5 de 6 ratones, **el raptor se come a los 3 zorros** (marcador `fox_0:3, raptor_0:3, fox_1:1, fox_2:1`), sobreviven 1 ratón + 1 raptor = **cascada trófica emergente sin guion**. Captura `foodchain_ALIVE.png`.
  - **LECCIÓN DE MÉTODO (importante):** este bug estuvo oculto porque yo clicaba con `element.click()` dentro de `page.evaluate` = **click sintético no confiable**, que muchos handlers ignoran. Con `browser_click` de Playwright (evento confiable) el arranque sí se dispara y afloran los errores reales. **Regla: para verificar labs interactivos, usar SIEMPRE clicks reales de Playwright, nunca `.click()` inyectado.** Antes culpé a la "UX de los start-screens"; era mi herramienta. Revisar con esta técnica los otros start-screens (Frogger `ENGAGE SIMULATION`, dojo de rigging) — probablemente escondan bugs de `basePath` similares.

### 6.1 BARRIDO SISTEMÁTICO (2026-07-27) — "mira todo el motor, todos los labs"
Método: (a) grep estático del patrón de la reorg (`/colony/...` absolutos), (b) verificador de enlaces rotos propio (`scratchpad/linkcheck.py`, 266 refs), (c) verificación en runtime con **clicks reales** de Playwright.

**⚠️ Ojo con el verificador — clase de FALSO POSITIVO:** los `.glb/.json/.png` referenciados desde JS del motor con `../props/...` resuelven contra **la PÁGINA** (`/labs/`), no contra el fichero JS → parecen rotos y NO lo están (verificado: todos los `props/**` existen). En cambio los **imports de módulos ES** (`import … from '../X.js'`) sí resuelven contra el FICHERO → esos sí son bugs reales. No confundir las dos clases.

**13 reparaciones aplicadas en esta pasada** (10 ficheros):
| # | Fichero | Bug |
|---|---|---|
| 1-2 | `LocomotionEnvironmentFactory.js` | `floorTiles` sin init · `GLTFModelPool.get` mal usado |
| 3 | `GLTFModelPool.js` | **fix de raíz**: restaurado `static get()` → curó 6 llamadas en 3 factories |
| 4 | `croupier_interaction_lab.html` | `basePath` `/colony/overworld/` |
| 5-6 | `ColonialPassportPlugin.js` | 2 rutas muertas → ahora `passportBase`/`assetBase` configurables |
| 7 | `croupier_chopper_aquarium.html` | `basePath` muerto |
| 8 | `croupier_table_games_arcade.html` | **importmap del motor** muerto |
| 9-10 | `InteractionLabEngine.js` · `KatamariFactory.js` | defaults `basePath` muertos (minas) |
| 11 | `ArcadeTableRoomFactory.js` | import TWEEN de ruta muerta → `three/addons/libs/tween.module.js` |
| 12 | `ArtDirectionPipeline.js` | **5 imports rotos** (`../X.js` → `../../soma/X.js`) — pipeline de dirección de arte inutilizable |
| 13 | `ml_dqn_idm.js` · `TrafficSurvivalSystem.js` | `IDMEngine`→`IDMSystem` (renombrado en la migración Engine→System) |

**Labs revividos y verificados corriendo:** `physics_locomotion` (cucaracha GLB + locomoción), `katamari_swarm` (enjambre InstancedMesh), `interaction_lab` (**cascada trófica emergente**, 58 s), `frogger_m30` (**35 vehículos IDM**, tras el fix 13).

**🟢 CAUSA RAÍZ Y RECUPERACIÓN (2026-07-27, tarde).** Oscar reveló el origen: **no fue la reorg, fue un `git clean`** ejecutado por Annie que barrió todos los ficheros NO RASTREADOS. Encaja al 100%: sobrevivió el código (rastreado), murieron los datos y assets (no rastreados). Git NO sirve para recuperar (nunca estuvieron en el índice). **Fuente de recuperación encontrada: `H:\ALISA_BACKUPS\alisa_project_snapshot_20260507_161157`** (snapshot del 7-may, robocopy). **~200 ficheros restaurados a `public/`:**
- `data/` — **8 JSON**: `kinematics.json` (21KB, 31 arquetipos), `skeletons.json` (42KB, 13 arquetipos), `lab_card_manifest.json` (170KB), `local_planet_manifest.json` (60KB), `ontology.json`, `observation_reward_*`.
- `data/beings_passports/` — **83 pasaportes** (incl. `alexa_passport.json`).
- `textures/` — **114 ficheros** (las 12 de ciudad que pedía Carver + muchas más).
- `arcade/` — **82 ficheros** (`arcade_mats.js`, `SovereignCardEngine.js`, `card_library.json`…).
- `soma/SemanticBoneMap.json`, `js/workers/tensors/` (3).
Verificado sirviendo 200 OK. *Nota: los recuperados son de abril — algo más viejos que los perdidos (13 vs 18 arquetipos de esqueleto).*

**⚠️ MATIZ IMPORTANTE — el pipeline de avatares NO estaba bloqueado.** Análisis de hueco sobre los 83 pasaportes: solo 3 de sus nombres de esqueleto casan con `skeletons.json` (bird/primate/arachnid); **43 piden `humanoid`**, que no existe ahí (allí se llama `bipedal`). Pero el motor tiene un **SEGUNDO sistema de esqueletos, en CÓDIGO y por tanto superviviente**: `soma/morphology/SemanticAnatomy.js` → `SEMANTIC_ANATOMY` con 6 arquetipos (**`humanoid`**, brute, quadruped_long, quadruped_tall, crawler, avian) definidos en **DSL relativo al bounding box** (`'0.5h'`, `'0.2w'` → se adapta a cualquier malla) + `deduceSemanticArchetype(name)` que mapea por palabras clave. **Usa el MISMO vocabulario que los pasaportes.** Conclusión: para rigging procedural, la vía viva es `SEMANTIC_ANATOMY` (código); `skeletons.json` es la vía de datos con coords absolutas y vocabulario biológico distinto. **Son dos sistemas, no uno roto.** Pendiente menor: los Beings no tienen GLB propio (`alexa.glb` 404) → usar la biblioteca genérica o avatar procedural.

**🔴 HALLAZGOS ABIERTOS (restantes):**
2. **Suite de tests muerta:** `tests/test_engines.js` (+4 runners) importa ~22 módulos con nombres viejos (`BSPEngine`, `BoidsEngine`, `FoodChainEngine`, `CarverEngine`…) que se renombraron a `*System.js`. Ningún test corre → arreglar antes de vender el motor como producto.
3. **Assets perdidos en la reorg:** `arcade/js/arcade_mats.js` + `arcade/js/SovereignCardEngine.js` (no existen en la colonia → `table_games_arcade` sigue incompleto); carpeta `textures/` entera (12 texturas de ciudad para `CarverEnvironmentFactory`).
4. **Pasaportes fuera del árbol servido:** viven en `Data/RecoveryCandidates/passports_preview/`; el Hub responde `/beings/search` (217 Beings ✓) pero no sirve los JSON. El plugin ya es configurable; falta decidir si se copian a `public/data/beings_passports/` o se añade ruta en el Hub.
5. **`dist/` tiene copias construidas con las rutas viejas** → hace falta `npm run build` para propagar estos fixes al bundle.

---
*Backups notables sin tocar: `ProceduralRigging_BACKUP_PERFECT_BACK.js` (980 l), `_pre_topo.js` (701 l) — versiones previas del rigging, no borrar sin preguntar. Estudio por Aris; core verificado arrancando (AlisaRenderCore + 3 labs), salud post-reorg OK salvo favicon 404.*
