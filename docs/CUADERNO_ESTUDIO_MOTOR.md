# 📓 CUADERNO DE ESTUDIO DEL MOTOR — Aris
*Cuaderno VIVO. Se va rellenando según estudio. Si me compactan, se retoma desde aquí.*
*Iniciado 2026-07-28. Encargo de Oscar: «estudia todo; luego los ports serán minutos».*

---

## 🔖 DÓNDE ESTOY (actualizar siempre al final de cada tanda)

| | |
|---|---|
| **Estado** | ✅ 25 factories estudiadas · **22/22 construyendo** · 51 systems mapeados · **reproducibilidad resuelta** (todo verificado en navegador) |
| **Hallazgos clave** | **§1.bis** `syncState` = la costura para Python · **§1.ter** 2 factories ya tienen interfaz de gym · **§4.bis** 5 familias de factories · **§4.ter** 5 bugs + el lío de los constructores · **§4.quater** 34/51 systems ya son lógica pura + el bloqueo del benchmark eran 470 `Math.random()` sin semilla |
| **Gym** | ✅ **UNIFICADO Y PROBADO** (§4.quinquies): contrato + transporte + 1er entorno sobre código preexistente. 7/7 puertas a Python |
| **Publicable** | ✅ **NÚCLEO VAINILLA** (§4.sexies): 0 bloqueantes, 0 llamadas de red al arrancar. Guardián `check_vanilla_boundary.py` |
| **Arcade** | ✅ **NO SE PERDIÓ NADA + SUITE DE 8 JUGANDO** (§4.septies): 24/24 arrancan · **8 con motor** (blackjack, brisca, tute, hearts, spades, go_fish, UNIT, guerra) · gym en `alisa_gym_cards.py` + `bench_suite.py` · invariantes ✓ · control de laboratorio ✓ · **marcas registradas saneadas** |
| **ProtoHub** | ✅ **TODO EL ARCADE DE TABLERO SE JUEGA SIN BACKEND** (§4.octies): **6 juegos** probados — ajedrez y xiangqi con **perft exacto**, go, reversi, mancala, damas · `LICENSE` + `README` |
| **Frontera** | ✅ **VEREDICTO: PUBLICABLE.** `PAQUETE_PUBLICO.md` dice qué va y qué no |
| **La vitrina** | ✅ **LOS 8 JUEGOS DEL ARCADE, SIN BACKEND Y CON 0 LLAMADAS DE RED** — tablero (6) + acción (2) + la suite de 8 de cartas. **Tres géneros, un solo contrato.** Los `labs/` son nuestro cuaderno, no el producto |
| **Siguiente** | Trade dress · mover los 16 módulos de colonia (orden, no bloqueo) · **demo final: que las hermanas jueguen por la puerta de lenguaje** |
| **Banco de pruebas** | `labs/croupier_factory_smoketest.html` → arranca las 25, dice cuáles construyen |
| **Marcador actual** | **4 de 25 construyen** (era 1) · *nota: varios "fallos" eran por pasarles `null` donde piden `camera`/`grid`* |

**Cómo verificar en cualquier momento:**
```
python -m http.server 8990   (desde alisa-systems/public)
→ /labs/croupier_factory_smoketest.html
```

---

## 1. EL CONTRATO (lo más importante del estudio)

`world/core/BaseEnvironmentFactory.js` (177 líneas) — lo que TODAS deberían heredar:

```js
constructor(scene, engine)     // engine = AlisaRenderCore
createFloor(config)            // suelo paramétrico + grid
createDustField(config)        // polvo volumétrico (auto-registra VolumetricsPlugin)
applyLightingPreset(preset)    // ⭐ RIG DE LUZ DECLARATIVO
buildAll()                     // ABSTRACTO — lanza si no se sobreescribe
update(dt)                     // tick del FlickerSystem
```

### `applyLightingPreset` — el rig por datos (INFRAUTILIZADO)
```js
{ ambient: {color, intensity},
  hemi:    {skyColor, groundColor, intensity},
  fog:     {color, density},                       // FogExp2
  fills:   [{color, intensity, range, position:[x,y,z], castShadow}],
  spots:   [{color, intensity, range, angle, penumbra, decay, position, target, castShadow}] }
```
→ devuelve `{ambient, hemi, fills[], spots[]}`.
**Las 10 factories con luces legacy son las que NO lo usan.** Migrarlas = arreglar luz + uniformar.

---

## 1.bis ⭐⭐ EL CICLO DE VIDA REAL (lo mejor que ha salido del estudio)

Las factories "buenas" (Aquarium, InteractionLab, Cucco) **ya comparten un idioma**.
No hay que inventar un contrato — hay que **nombrar el que ya existe**:

```
1. CREAR        new X(scene, camera, loader, basePath)   ← inyección por constructor
                new X()                                   ← inyección diferida
2. INYECTAR     setCore(core) + init(scene)               ← solo en el diferido
                    (buffer `_pendingAdds` mientras no hay escena)
3. CONSTRUIR    buildAll(config)  →  _buildXxx() / _setupXxx() privados
4. SINCRONIZAR  syncState(estado, dt) · syncToEngine(estado, dt) · syncAgents(agentes, dt, t)
5. ACTUALIZAR   update(dt)          ← VFX, cámara, partículas, flicker
6. DESTRUIR     dispose()
```

### 🔑 El punto 4 es el hallazgo arquitectónico
**La factory NO SIMULA: pinta el estado que le entrega el sistema.**
`syncState(state, dt)` recibe el mundo ya calculado y lo refleja en meshes.

→ **Esa es exactamente la costura render/lógica que buscábamos para la migración a Python**
   (lente A del estudio del motor). **Ya existe, en la capa de factories.**
   Si la lógica se va a Python, lo único que cambia es *quién produce ese `state`*.
   Las factories no se enteran. **No hay que rediseñar nada: hay que respetarlo.**

Ejemplos verificados:
- `CuccoEnvironmentFactory.syncState(state, dt)` — enjambre bullet-heaven
- `AquariumEnvironmentFactory.syncToEngine(engineState, dt)` + `_syncEcosystemGroup(agents, …)`
- `InteractionLabFactory.syncAgents(allAgents, dt, t)` — cadena alimentaria

---

## 1.ter 🎮 ENTORNOS DE GYM QUE YA EXISTEN (sin saberlo)

Buscando el ciclo de vida encontré que **dos factories ya implementan la interfaz de agente**:

| Factory | Hooks | Qué sería |
|---|---|---|
| `LocomotionEnvironmentFactory` | `applyAction(x, z, jump)` + `getState()` | `alisa/Platformer-v0` — esquivar/saltar/recoger cristales |
| `TrafficEnvironmentFactory` | `applyAction(...)` + `getState()` | `alisa/Frogger-v0` — cruzar tráfico IDM |

**Ya las conduje yo misma hoy**: moví la cucaracha 24 unidades con `applyAction()`.
→ **Envolverlas en `GymEnv` es casi gratis**: el estado y la acción ya existen; solo falta
`reset(seed)`, la observación como vector y la recompensa.

**Inventario de entornos del benchmark, actualizado:**
1. ✅ `alisa/Asteroids-v0` — hecho
2. ✅ `alisa/RueDelPercebe-v0` — hecho (3 puertas)
3. 🔜 `alisa/Platformer-v0` — *hooks ya escritos*
4. 🔜 `alisa/Frogger-v0` — *hooks ya escritos*
5. 🔜 `alisa/SearchRescue-v0` — desde `ChopperFlightFactory`
6. 🔜 `alisa/FoodChain-v0` — desde `InteractionLabFactory` (`syncAgents`)

---

## 2. ⚠️ LOS CUATRO DIALECTOS (por qué los ports no eran minutos)

| Dialecto | Cuántas | Quiénes |
|---|---|---|
| `init(scene)` + `setCore(core)` | **6** | Archetype, Compiz, Locomotion, Traffic, Treadmill, VoxelGlitch |
| `buildAll(config)` | 3 | Aquarium, InteractionLab, Katamari |
| `buildRoom(isDark)` | 3 | Cabinet, ColonialControlRoom, Compiz |
| solo métodos propios | ~13 | Asteroids, Chopper, Dojo, Environment, Raccoon, ProceduralProps… |

**Regla aprendida:** *los labs existentes son la documentación de uso real de cada factory.*
Antes de tocar una, mirar qué lab la usa y cómo la arranca.

**La palanca:** añadir `buildAll(config)` ADAPTADOR que delegue a lo que ya existe (~10 líneas,
no rompe nada). Probado en 3 → el banco pasó de 1 a 4.

---

## 3. 🐛 CLASES DE DEUDA IDENTIFICADAS (buscar siempre estas 4)

1. **Globales huérfanas del monolito** → `ReferenceError: X is not defined` en la 1ª ejecución.
   *(En `ProceduralBuildingFactory`: `numItems`, `elevator`, `seekerModel`, `flashLight`,
   `volumetricBeam`, `flashDust`, `gamePhase`, `cinematicPhase`, `cinematicTimer`.)*
2. **Luces en unidades legacy** (intensidad < 1.5, escritas para three pre-r155) → escena negra.
   Arreglo: escalar ×15-25 o migrar a `applyLightingPreset`.
3. **`buildAll()` sin implementar** → *"must be overridden by subclass"*.
4. **Bloques acoplados al bucle de juego** (personajes, cinemáticas) dentro del `build()`.
   Arreglo: `opts.buildCharacters = false`.

---

## 4. FICHAS POR FACTORY

> Formato: **constructor · entrada · modelo de mundo · luz · qué produce · estado**

### ✅ ESTUDIADAS A FONDO

#### `ProceduralBuildingFactory` (869 líneas) ⭐ la del monolito Rue del Percebe
- **ctor:** `(scene, AssetManager)`
- **entrada:** `build(10 args posicionales)` → **añadido `buildAll({floors, doorsPerFloor, lightScale, characters})`**
- **mundo:** `FL_H=5.0`, `CORRIDOR_W=28`, `CORRIDOR_DEPTH=5.0`, `BUILDING_DEPTH=30.0`,
  `bCenterZ=-12.5`, grupo **centrado en el origen**. ⚠️ el bucle es `f <= totalFloors` → pedir 8 da **9 grupos** (azotea).
- **⭐ patrón "acuario":** pasillo con AGUJEROS en la pared del fondo; detrás, habitación-caja
  en `side: BackSide` (se ve dentro, como un diorama). Tipos: `door`, `stairs/up`,
  `boiler_hall` (rojo 0xff4422), `machine_red/green/archive` (sótano-laberinto).
  Portales abiertos llevan **rebanada volumétrica aditiva**. **Se mira DE FRENTE (+Z).**
- **luz:** ❌ legacy (`PointLight(…, 0.4, …)`, `aqLight 0.2/0.4` con `decay=2`) → usar `lightScale≈20`
- **produce:** `floors[f] = {group, baseY, doors, hidingSpots, stairX, elevX, elevDoorX, switchX, edoorL/R/W, indicator}`,
  `floorLights[]`, `floorLightTimers[]`, `batteryPickups[]`, `elevator{cabin,fridgeLight,y,currentFloor,doorTimer}`
  → `hidingSpots` trae `{x,label,mesh,isSearched,hasRaccoon,originalColor}` = **contrato compatible con `HidingSpotComponent`**
- **plantas:** `S` sótano (laberinto 3 salas) · `PB` planta baja (boiler_hall) · números · `AZ` azotea (AC + trastos)
- **estado:** 🟢 REPARADA hoy (9 bugs) + adaptador. Construye.

#### `ChopperFlightFactory` (166+)
- **ctor:** `(scene, camera)` · **entrada:** `buildCity(citySize,numBuildings)` + `buildHelipad()` + `buildChopper()`
  → **añadido `buildAll({citySize, buildings})`** y `update(dt, keys)` → `updatePhysics`
- **otros:** `fireProjectile()`
- **estado:** 🟢 construye. Sirve al monolito `sim_search_rescue_chopper`.

#### `ArcadeTableRoomFactory` (195)
- **ctor:** `(scene, camera, controls, options)` — **construye en el constructor**
- **entrada:** `setGameSet(group)`, `onClick(e)`, `sitAtTable(x)`, `standUp()`, `tick(dt)`
  → **añadido `buildAll()`** (confirma montaje) y `update(dt)` → `tick`
- **estado:** 🟢 construye. Sirve a `room_empty_table_games_node`.

#### `BaseEnvironmentFactory` (177) — ver §1.

#### `AquariumEnvironmentFactory` (599) — NO es un acuario: es un RASCACIELOS-acuario
- **ctor:** `(scene, camera, gltfLoader = null, basePath = '')` ⚠️ **necesita CÁMARA de verdad**
  *(pasarle `null` da `Cannot read properties of null (reading 'position')` — el "fallo" era mío)*
- **entrada:** ✅ `buildAll(config)` — **de las 3 que SÍ implementan el contrato**
- **mundo:** `FL_H = 4.0`
- **construye:** `_buildTank` (la pecera) · `_buildLighting` · `_buildGround` · **`_buildSkyscraper`** ·
  **`_buildChopper`** · `_buildDust(800)` · **`_buildPheromoneGrid`** · `_buildCorals`
- **⭐ hallazgo:** trae **el mismo juego del mapache**: `placeRaccoon(floorIdx)`,
  `onFloorChecked({floorIdx, success})`, `onStartInspecting`, `resetFloorVisuals`, `getFloorHitMeshes`
  → **es OTRA variante del escondite por plantas**, vista como pecera y con helicóptero.
  Encaja con `RueDelPercebeEnv` sin tocar la lógica.
- **sync:** `syncToEngine(engineState, dt)` + `_syncEcosystemGroup(agents, type, modelName, scale, dt)`
  → patrón **estado→visual** (la factory NO simula, solo pinta lo que le pasa el engine) ⭐
- **estado:** 🟡 implementa el contrato; solo faltaba pasarle una cámara

#### `CarverEnvironmentFactory` (1334) — la más grande del motor
- **ctor:** `(scene, carverGrid)` ⚠️ **necesita el GRID de `CarverSystem`**, no `null`
  *(el "fallo" `Cannot read properties of null (reading 'w')` era leer `carver.w` de un null que le pasé yo)*
- **entrada:** `build()` sin argumentos (usa el grid del constructor) · `update(dt)` · `getProceduralSkin()`
- **⭐ usa materiales generados por IA** (`useAiMat`) — enlaza con `AssetManager.generateTextures`
- **depende de:** `CarverSystem` (zonas DOWNTOWN/INDUSTRIAL/NIGHTLIFE/SLUMS)
- **estado:** 🟡 pendiente de probar con un grid real

#### `InteractionLabFactory` (493) — cadena alimentaria
- **ctor:** `(scene, camera, gltfLoader = null, basePath = '')` — **idéntico a Aquarium**
- **entrada:** ✅ `buildAll(config)`
- **construye:** `_buildLighting` · `_buildArenaFloor` · `_buildCrates(pos)` + `_generateCratePositions`
  · `_buildCheese(pos)` + `_generateCheesePositions` · `_loadEntityTemplates`
- **vida:** `spawnEntity(agent)` / `despawnEntity(id)` / **`syncAgents(allAgents, dt, t)`**
  · `removeCheese(id)` · `_updateStaminaBar(bar, stamina, max, exhausted)` · partículas
- **estado:** 🟡 implementa el contrato; solo faltaba pasarle cámara (mismo caso que Aquarium)

#### `CuccoEnvironmentFactory` (763) — el dialecto DIFERIDO (referencia del patrón)
- **ctor:** `constructor()` **sin argumentos** → por eso los labs hacen `new CuccoEnvironmentFactory()`
- **inyección:** `setCore(core)` + `init(scene)` — con **buffer `_pendingAdds`**: acumula objetos
  hasta que llega la escena. *Patrón limpio para factories creadas antes que el render.*
- **entrada:** `_setupArena()` · `_setupPlayer()` · `_setupProceduralWeapons()`
- **sync:** **`syncState(state, dt)`** (183 líneas) · `update(dt)` (VFX: shake de cámara, sweep, slam)
- **visual por datos:** `_enemyGeo(type)` · `_getEntityVisualParams(type)` → geometría/params por TIPO
- **estado:** 🟡 sin `buildAll`; el adaptador sería `buildAll(c) { this.setCore(c.core); this.init(c.scene); }`

#### `EnvironmentFactory` (387) — ⚠️ NO es una factory de entorno: es una **BIBLIOTECA DE PIEZAS**
- **ctor:** `()` · **suelta** (no extiende la clase base) — y con razón: no construye escenas
- **catálogo:** `loadTexture` · `createProceduralPlanet` · `createStarBlock` · `createTree` ·
  `createForest` · `createBSPRoom` · `createBSPCabinet` · `createProp` · `createCorporateSkyscraper`
- **⭐ y lo importante:** `createBoidProxy` · `createPhantomProxy` · `createKatamariProxy`
  → **proxies VISUALES de los sistemas**. Es la costura estado→visual, pero como librería.
- **conclusión:** no necesita `buildAll`. Es el **toolbox** del que tiran las demás. No tocar.

#### `VoxelGlitchFactory` (381) — el visual de la ley de escala
- **ctor:** `(scene = null, camera = null)` + `_legacyConstructor` · dialecto **diferido** (`setCore`+`init`)
- **API:** `setTier` · `setTargetModel` · `subdivideVoxels` · `generateStaticMeshCloud` ·
  `rebuildGhostBox` · `resetToGhost` · `clearVoxels` · `triggerGlitch` / `triggerSober` · `startSculptStep` · `tick`
- **⭐ es el render de `KatamariScaleSystem`** (tiers + subdivisión base-3). Enlaza con la ley del 0.3·3^n.

#### `LocomotionEnvironmentFactory` (370) — ⭐⭐ **YA TIENE INTERFAZ DE GYM**
- **ctor:** `(scene = null, camera = null)` + `_legacyConstructor` · diferido (`setCore`+`init`)
- **🎮 `applyAction(inputX, inputZ, jump)` + `getState()`** ← **los hooks del gym, ya escritos**
- **construye:** `setupArena` · `buildDanceFloor` · `buildJumpingPuzzle` · `setupPlayer` · `createLantern` · `applySimonUI`
- **estado:** 🟢 reparada hoy (floorTiles + GLTFModelPool). **Es un entorno de gym casi gratis.**

#### `TrafficEnvironmentFactory` (330) — ⭐⭐ **TAMBIÉN TIENE INTERFAZ DE GYM**
- **ctor:** `(scene)` · `init` + `setCore`
- **🎮 `applyAction(...)` + `getState()`** ← ídem
- **API:** `preloadAssets` (9 GLB) · `buildHighway` · `createVisualCar/Frog/Ferret` · `createOilSpill` ·
  `spawnBlood` · `die` · `update`
- **estado:** 🟢 reparada hoy (IDMEngine→IDMSystem). Frogger corre con 35 vehículos.

#### `RaccoonEnvironmentFactory` (348) — ⚠️ el nombre engaña: es un **GENERADOR ESPACIAL**
- **ctor:** `()` · **suelta** · **`seedRandom`** → determinista por semilla ⭐
- **API:** `generateSpace` · `generatePlanet` · `generateCity` · `createShip` · `createSatellite` ·
  `createDrone` · `createDecoration`
- **conclusión:** nada de mapaches — es planetas, ciudades y naves. Útil para escenas espaciales.

#### `BiolabEnvironmentFactory` (339)
- **ctor:** `(scene)` · `init()` · `tick()`
- **API:** `setupLighting` / `toggleLights` · `buildProceduralVat` · `buildBubbles` · `buildLEDs` ·
  `buildTubes` · `buildRoboticArms`
- **estado:** 🟡 sin `buildAll`; el adaptador es encadenar los `buildXxx` en orden.

### BLOQUE C — las once pequeñas (fichas rápidas)

| Factory | ctor | API destacada | Nota |
|---|---|---|---|
| `CabinetEnvironmentFactory` (288) | `(scene)` | `buildRoom` · `build3DCabinet` · `openDrawer3D` · `populateFloorItems` · `showBattery3D` · **`setupFlashlights`** · `updateActiveModels` | el visual del escape del gabinete |
| `ColonialControlRoomFactory` (130) | `(scene)` | `buildRoom` · `addNeonPillar` · **`getSocketTransform(nombre)`** | ⭐ **SOCKETS con nombre** = puntos de anclaje para avatares (pasaporte→sitio) |
| `DojoEnvironmentFactory` (166) | `(scene)` | `setupArena` · `buildDanceFloor` · `spawnKatamariFood` · `spawnKatamariCity` · `syncKatamariConsumption` | integra con KatamariSystem |
| `CompizEnvironmentFactory` (173) | `(scene,camera)` | `setupLighting` · `buildRoom` · **`applyOpticalIllusion`** · `setCore`+`init` | el cubo-escritorio |
| `TreadmillEnvironmentFactory` (187) | `(scene,camera)` | **`hashCoord`** · `buildChunk` · `tickAquarium` · `setCore`+`init`+`update` | ⭐ terreno **infinito por chunks** con hash de coordenadas |
| `ArchetypeEnvironmentFactory` (142) | `(scene,camera)` | `setupVisuals` · **`applyCognitiveColors`** · `syncLights` · `getAvatarGroup` · **`get/setStimulusPos`** | banco de pruebas cognitivo (estímulo→respuesta) |
| `AsteroidsFactory` (203) | `(scene,camera)` | `loadAssets` · `buildArenaGrid` · `createShip/Asteroid/MonoWall/Drone/Projectile/ItemVisual` · **`syncGrid`/`syncParticles`** | ⭐ **la factory estado→visual más pura**: solo dibuja lo que le pasan |
| `ProceduralPropsFactory` (228) | — | **TODO ESTÁTICO**: `createBspShelf` · `createGridStorage` · `createDesk` · `createTVStand` · `createChair` · `createStreetlight` · `createDumpster` · `createVapor` | biblioteca de muebles, no factory |
| `NeonSignFactory` (104) | `()` | (estática/utilitaria, como la anterior) | carteles de neón |
| `ArcadeDojoFactory` (143) | `(scene, renderCore)` | `setLighting` · `toggleXRay` · `loadCabinet` | 🔴 el "peta al instanciar" era **mío**: pide `renderCore`, le pasé `null` |
| `ArcadeRoomManager` (384) | `(scene, renderCore)` | `loadCabinets` · `_detectScreenMesh` · `_createSyntheticScreen` · `getCabinetFromIntersect` · **`serializeState`/`applyNetworkState`** · `_initMMOSync` | ⭐⭐ **SINCRONIZACIÓN DE RED / MULTIJUGADOR** |

### 🔜 PENDIENTES (ya ninguna factory)
3. `CuccoEnvironmentFactory` (763) — `setCore`+`init`, enjambre
4. `InteractionLabFactory` (493) — food chain, tiene `buildAll`
5. `EnvironmentFactory` (387) — genérica, planetas/estrellas
6. `VoxelGlitchFactory` (381) · `LocomotionEnvironmentFactory` (370) · `TrafficEnvironmentFactory` (330)
7. Resto: Raccoon, Biolab, Cabinet, ColonialControlRoom, Dojo, Compiz, Treadmill, Archetype,
   Asteroids, ProceduralProps, NeonSign, ArcadeDojo (🔴 peta al instanciar: `null.spotLight`), ArcadeRoomManager

---

## 4.bis 🗺️ SÍNTESIS — LAS 25 FACTORIES, CLASIFICADAS

Estudiadas **todas**. No son 25 cosas iguales: son **cinco familias distintas**.

| Familia | Cuáles | Qué son |
|---|---|---|
| 🏗️ **Constructoras de escena** | ProceduralBuilding, Carver, Aquarium, InteractionLab, Cucco, Biolab, Cabinet, ColonialControlRoom, Dojo, Compiz, Chopper | montan un mundo entero. Necesitan `buildAll` adaptador |
| 🎨 **Bibliotecas de piezas** | **EnvironmentFactory**, **ProceduralPropsFactory** (estática), NeonSign | catálogos de `createXxx`. **NO necesitan `buildAll`** — no construyen escenas |
| 📽️ **Espejos estado→visual** | **AsteroidsFactory**, VoxelGlitch, Treadmill, Archetype | solo dibujan lo que el sistema les pasa (`syncGrid`, `syncState`) |
| 🎮 **Con interfaz de agente** | **Locomotion**, **Traffic** | ya traen `applyAction` + `getState` |
| 🌐 **De red / sesión** | **ArcadeRoomManager**, ArcadeDojo | `serializeState`/`applyNetworkState`, MMO sync |

### Consecuencia para el plan de ports
**No hay que uniformar las 25.** Solo las **11 constructoras** necesitan `buildAll` adaptador
(3 hechas → faltan 8). Las bibliotecas y los espejos **ya están bien como están**;
forzarles un contrato sería empeorarlas.

### Piezas valiosas que NO sabía que teníamos
- **`getSocketTransform(nombre)`** (ControlRoom) → anclajes con nombre para colocar avatares
- **`hashCoord` + `buildChunk`** (Treadmill) → **mundo infinito por chunks**
- **`serializeState` / `applyNetworkState`** (ArcadeRoomManager) → **multijugador**
- **`applyCognitiveColors` + `get/setStimulusPos`** (Archetype) → banco de pruebas cognitivo
- **`createBoid/Phantom/KatamariProxy`** (EnvironmentFactory) → proxies visuales de sistemas
- **`useAiMat`** (Carver) → materiales generados por IA

---

## 4.ter 🔧 LA PUERTA COMÚN — de 4/25 a 22/22 (VERIFICADO EN NAVEGADOR)

### Corrección a lo que escribí en §4.bis
Dije que los "espejos" y las bibliotecas *"ya están bien como están"*. **Falso a medias.**
`BaseEnvironmentFactory.buildAll()` **LANZA** (`must be overridden by subclass`).
De las 16 que heredan de la base, **solo 3 la sobrescribían**: las otras 13 reventaban
por la puerta común aunque su código estuviera sano. El trabajo eran 13, no 7.

### Marcador real (banco `croupier_factory_smoketest.html`)
| | antes | después |
|---|---|---|
| arrancan y construyen | 4 | **22 de 22 construtoras** |
| fallan | 21 | **0** |
| ni instancian | 1 | **0** |
| bibliotecas (N/A por diseño) | contadas como fallo | **3, marcadas aparte** |

Las 3 de fuera son `EnvironmentFactory`, `NeonSignFactory`, `ProceduralPropsFactory`:
catálogos de `createXxx()`. Meterlas en el contrato sería mentir sobre lo que son.

### 🐛 BUGS DE VERDAD QUE APARECIERON AL FORZAR LA PUERTA
Ninguno se veía leyendo el código; salieron al ejecutarlo.

1. **Rutas de assets rotas para todo lab en `/labs/`** ⭐ *el más grave para el producto*
   Las factories piden `props/models/X.glb` — relativa, y una relativa se
   resuelve contra la **página**, no contra el módulo:
   `/labs/demo.html` → `/labs/props/models/X.glb` → **404**.
   Y para un motor que la gente descarga y monta en `/lo-que-sea/`, las
   absolutas tampoco sirven.
   **Arreglo de raíz:** `soma/AssetResolver.js` — resuelve contra la raíz del
   MOTOR (deducida de `import.meta.url`), con `setBase()` para CDN/bucket.
   Enganchado en `GLTFModelPool` (estático + instancia) y `AssetManager`:
   **una corrección, ~300 llamadas curadas.** 6 errores de consola → 0.

2. **`loadModelAsync` devuelve `gltf.scene`, no el gltf** — y dos factories
   hacían `.scene` encima → `undefined`. Biolab se quedaba sin agente y
   ArcadeTableRoom sin mesas, en silencio. Documentado en el propio método.

3. **`ArcadeRoomManager` abría un WebSocket a la colonia EN EL CONSTRUCTOR**,
   con reconexión **infinita** cada 5 s si no había hub. Instanciarla suelta
   dejaba un bucle eterno. Ahora `{sync:true}` opt-in + reintentos acotados
   (5, espera creciente) + `disconnectSync()`/`dispose()`. Las 2 salas de la
   colonia actualizadas para no perder multijugador.

4. **`CarverEnvironmentFactory` escribía en el DOM**:
   `document.getElementById('stats').innerText = …` → petaba en cualquier
   página sin ese div. Ahora gancho opcional `onProgress`.

5. **Dos huérfanos más del monolito en Carver** (mismo patrón que `numItems`
   y `elevator` en ProceduralBuilding): faltaba `import { ZoneType }`, y el
   `return { group }` final apuntaba a una variable que solo existe dentro de
   dos funciones auxiliares. Carver **nunca había llegado a ejecutarse**.
   Ahora levanta una ciudad de **476 objetos**.

### 🚩 EL HALLAZGO DE API MÁS IMPORTANTE
**El segundo argumento del constructor significa SEIS cosas distintas:**

| significado | quién |
|---|---|
| `camera` | VoxelGlitch, Treadmill, Locomotion, Asteroids, Archetype, Compiz, Chopper, Katamari, InteractionLab, Aquarium |
| `engine`/`renderCore` | **BaseEnvironmentFactory (lo documentado)**, ArcadeDojo, ArcadeRoomManager |
| `AssetManager` | ProceduralBuilding |
| `carverGrid` (DATOS) | Carver |
| — sin argumentos — | Raccoon, Cucco |

La clase base declara `(scene, engine)` y **casi ninguna subclase lo cumple**.
Para el motor público esto hay que unificar: es lo primero con lo que choca
cualquiera que lo descargue. *(No lo toco todavía: cambiarlo mueve ~25 ficheros
y todos sus labs; queda como tarea con nombre propio.)*

### Ayudas de datos añadidas (para que las demos sean de minutos)
- `CabinetEnvironmentFactory.gridPartition(cols, rows)` — el archivador espera
  un árbol BSP `{planks, leaves}`, no una lista.
- `CarverEnvironmentFactory.demoGrid(w, h)` — `build()` consume **seis** campos
  (`w,h,grid,elevationGrid,zoneGrid,buildings`), no dos.
- `RaccoonEnvironmentFactory.buildAll({mode})` — es un generador con semilla con
  **tres** mundos (`space`/`planet`/`city`), no una sala fija.

### Deuda apuntada, NO tapada
- Carver cuelga la ciudad directo de la escena (sin contenedor): no se puede
  mover ni borrar de golpe. Envolverla = tocar ~200 `scene.add()`.
- `tests/test_engines.js:713` importa de `'../CarverEngine.js'`, ruta que ya no
  existe (ahora `world/systems/CarverSystem.js`).

---

## 4.quater 🎲 LA CAPA SYSTEMS — Y EL BLOQUEO REAL DEL BENCHMARK

Bajé a `world/systems/`: **51 ficheros, 10 360 líneas.**

### Lo mejor: la mitad simuladora ya está casi limpia
**34 de 51 systems no tocan THREE, ni `window`, ni `document`.** Son lógica pura.
Eso es justo lo migrable a Python y lo que puede correr headless en el gym.

Los 17 restantes se reparten entre acoplamiento legítimo (NavMeshExtraction lee
geometría; Rigging monta huesos) y tres a vigilar: `FileSystemDioramaSystem`
(1141 líneas, `window` + `document` + 41 azares), `RoboticArmSystem` y
`KatamariScaleSystem`.

Y dos son **kernels sin estado** — `EcosystemSystem` y `FoodChainSystem` tienen
el constructor vacío y funciones tipo `tickFishes(fishes, hunters, sharks, …)`
que reciben TODO por parámetro. Eso es oro para Python: son funciones puras
sobre datos, se traducen casi literalmente.

### Cosas que ya existían y yo no sabía
| Pieza | Qué es |
|---|---|
| **`RLGymBridge`** | expone `resetEpisode/stepSimulation/getObservationVector` en `window` para pilotar desde Python/Playwright. **No duplica mi `GymEnv`: es el transporte.** Vocabularios distintos, hay que reconciliarlos |
| **`ScummInteractionEngine`** | **un entorno de gym completo ya hecho**: `initEpisode(seed)` → `selectDrawer()` → `{reward, found, dead}`, con reward shaping tipo buscaminas |
| **`ml_dqn_idm`** | un DQN con TensorFlow.js contra la física del tráfico… **que NO puede ejecutarse**: importa `@tensorflow/tfjs`, que no está en `package.json` ni instalado. Intención de diseño, no línea base |
| **`SeededRNG`** | PRNG semillado, completo, con `spatialSeed`. Su cabecera dice *"critical for headless/RL determinism"* |

### 🚨 EL BLOQUEO — y corrige DOS prioridades que yo tenía mal
Medido, no supuesto:

> **470 llamadas a `Math.random()` en 67 de los 167 ficheros fuente.
> Ficheros que usan `SeededRNG`: 4.**

*(Ojo con el conteo: bajo `src/` hay 977 ficheros de `node_modules` anidados.
Sin excluirlos salen 1144 ficheros y 636 azares — números falsos.)*

**Corrección 1 — la prioridad estaba invertida.** Yo apuntaba a un
`DeterministicMath` sobre 329 sitios de `Math.*`. Falso problema: sin semilla,
la misma partida ya sale distinta en la MISMA máquina. Los transcendentales solo
importan *después* de sembrar.

**Corrección 2 — el riesgo transcendental son 2 sitios, no 329.** Solo dos
ficheros usaban `Math.sin` COMO GENERADOR ALEATORIO:
```js
random() { let x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }
```
`Math.sin` es de las pocas operaciones que IEEE-754 **no** fija bit a bit. Al
multiplicar por 10000 y quedarse los decimales, ese último bit se amplifica hasta
cambiar el entero: **la misma semilla generaba ciudades distintas en máquinas
distintas.** Los demás `Math.sin/cos` son ondas de animación — dan igual.
Corregidos: `CarverSystem` y `ProceduralSPE` → mulberry32.

### El arreglo: `world/core/DeterministicScope.js`
Migrar 470 llamadas a mano es cirugía y erratas. En vez de eso, sustituye
`Math.random` por un PRNG semillado **solo durante el tramo** y lo restaura en
`finally`:
```js
DeterministicScope.run(1234, () => { env.reset(); return env.checksum(); });
```
**Cero ediciones en los systems.** mulberry32 (periodo 2^32) en vez del LCG de
SeededRNG (periodo 233 280, se agota en episodios largos); ambos solo con enteros,
o sea reproducibles entre máquinas. Incluye `normalizeSeed`, necesario porque por
el motor circulan semillas fraccionarias (`config.seed || Math.random()` en
ProceduralSPE) y un `0.375 >>> 0` da **0**: todas esas entidades habrían salido
clavadas.

**Límites escritos en el propio fichero:** no arregla transcendentales, es una
global (no anidar ni simular dos partidas a la vez).

### VERIFICADO (`labs/croupier_determinism_audit.html`)
| sistema | hoy | con scope | azares |
|---|---|---|---|
| **AsteroidsSystem** (60 ticks) | **✗ NO reproducible** | **✓ sí** | **2019** |
| CarverSystem (ciudad 24x24) | ✓ | ✓ | 0 *(PRNG propio, ya corregido)* |
| ScummInteractionEngine | ✓ | ✓ | 0 *(ya usaba SeededRNG)* |
| ProceduralSPE (semilla 0.375) | ✓ | ✓ | 0 *(PRNG propio, ya corregido)* |

Semilla `0.375` → `0.559790…` vs semilla `0` → `0.266429…`: las fraccionarias ya
no colapsan. Las semillas de texto (`'arista'`) también valen.

### ⚠️ CASI CUELO UN 4/4 FALSO — otra vez
La primera versión del banco usaba `s.update?.(dt)` "por seguridad". Los métodos
no se llamaban así, el `?.` se lo tragó en silencio, **no se ejecutó nada** y
comparar dos resultados vacíos daba "4/4 deterministas". Lo delató `draws: 0`.
El banco ahora **falla a gritos** si esperaba azar y salieron 0 consumos, o si la
huella es trivial. Y nada de `?.` en los casos de prueba: si el método no existe,
que pete.

---

## 4.quinquies 🚪 EL GYM UNIFICADO — el diferencial, montado y probado

### El problema: teníamos tres mitades que no encajaban
| pieza | qué era | por qué no servía sola |
|---|---|---|
| `GymEnv` (mío) | el CONTRATO de las tres puertas | vivía solo, sin transporte |
| `RLGymBridge` (ya existía) | el TRANSPORTE a Python | otro vocabulario, y **solo la puerta numérica** |
| `ScummInteractionEngine` (ya existía) | un ENTORNO completo | sin ninguna puerta |

Si alguien se descarga esto, esa fragmentación *es* el producto fallando.

### Lo montado
1. **`GymEnv.runEpisode` ahora envuelve el episodio en `DeterministicScope`.**
   Antes la palabra "determinista" era un deseo. Ahora es una garantía —
   y es lo único que sostiene el benchmark: para validar la partida de otro hay
   que poder volver a simularla. Devuelve también `draws` (azares consumidos)
   como huella del episodio.
2. **`GymEnv.selfTest(policy)`** — dos corridas con la misma semilla y una con
   otra. Requisito de entrada al benchmark.
3. **`gym/GymBridge.js`** — expone las TRES puertas en `window.alisaGym`, y
   **mantiene vivos los alias del RLGymBridge viejo** (`resetEpisode`,
   `stepSimulation`, `getObservationVector`) para no romper nada.
4. **`gym/envs/CabinetEscapeEnv.js`** — `alisa/CabinetEscape-v0`, que **envuelve
   `ScummInteractionEngine` sin tocarlo**. Es la prueba de fuego: si el contrato
   solo encajara con entornos escritos a medida, no valdría como producto.

### VERIFICADO (`labs/croupier_gym_contract.html`)
```
🤖 numérica : reset(1234) → 26 números · step(0) → recompensa 4
🧠 lenguaje : describe() en castellano · 8 verbos · stepVerb() funciona
🕹️ humana   : setRenderEnabled() (apagable para correr headless)
🐍 puente   : 7/7 puertas en window.alisaGym + 3/3 alias antiguos
✓ REPRODUCIBLE   ✓ sensible a la semilla
```

### La métrica (40 episodios, semillas 0..39)
| agente | éxito | puntos |
|---|---|---|
| al azar | 25,0% | −51,4 |
| **línea base** | **55,0%** | **+8,6** |
| LLM / RL | *sitio libre* | |

### 🐛 Y un fallo mío que el propio banco destapó
Mi primera línea base sacaba **42,5%** — apenas mejor que el azar. Sospeché del
número en vez de darlo por bueno, y era un error real: yo trataba como "cajón
contiguo" los índices `idx-1, idx+1`, pero el juego define la vecindad por
**distancia en el árbol BSP** (`bspDistance <= 2`), que no sigue el orden del
array. La función correcta ya existía: `getBspNeighbors()`.
Corregido: **42,5% → 55,0%** y de −16,2 a +8,6 puntos.

Lección: una línea base rota no es un detalle estético — hace que el entorno
**parezca más difícil de lo que es** y falsea todo el benchmark.

---

## 4.sexies 🍦 LA SEPARACIÓN VAINILLA — el núcleo ya se puede publicar

### El bloqueo, en dos líneas
`soma/AlisaRenderCore.js` — el corazón del motor:
```js
import { ColonialPassportPlugin } from './plugins/ColonialPassportPlugin.js';   // línea 4
this.registerPlugin(new ColonialPassportPlugin(options.hubUrl || 'http://127.0.0.1:8741')); // línea 64
```
**Cualquier escena hecha con el motor —incluida una copia descargada por un
desconocido— arrancaba hablando con un hub privado.** Y para nada: `getPlugin()`
no se llamaba en NINGÚN sitio del repositorio. El plugin se conectaba y nadie le
preguntaba jamás. Peso muerto, y una dirección privada dentro de un producto
que se publica.

### Lo hecho
- **El núcleo ya no conoce la colonia.** Fuera el import y el auto-registro.
- **`options.plugins`** — la aplicación registra los suyos, vengan de donde vengan.
- **`extensions/alisa-colony/index.js`** — `attachColony(core, {hubUrl, passports,
  terminal, jobBoard})` con carga perezosa (un build vainilla puede excluirlos) y
  `hayHub()` para que un lab decida si engancharse en vez de llenar la consola de
  errores de red.
- **`check_vanilla_boundary.py`** — guardián re-ejecutable en la raíz del motor.
  Distingue bloqueantes (núcleo acoplado) de desorden (módulo de colonia mal
  ubicado) de ruido (la palabra en un comentario).

### VERIFICADO (`labs/croupier_vanilla_check.html`)
Espía `fetch` y `WebSocket` **antes** de construir el motor:

| | antes | ahora |
|---|---|---|
| plugins auto-registrados | 1 (colonia) | **0** |
| llamadas de red al construir | al hub | **0** |
| núcleo intacto (escena/cámara/renderer/CSS3D/controles) | — | **✓** |
| colonia enganchable a mano | — | **✓** (`attachColony` registra y ENTONCES llama a `/beings/search`) |

### 🐛 Dos bloqueantes que el guardián vio y yo no
Yo había mirado `AlisaRenderCore` y me habría quedado ahí. El script encontró:
- **`SkeletalScanner.js`** — `options.hubUrl || 'http://127.0.0.1:8741'`: el
  parámetro existía, pero **el valor por defecto era la colonia**. Ahora sin
  defecto: sin endpoint devuelve los huesos en crudo (resultado útil) y no toca
  la red.
- **`CabinetEscapeGame.js`** — dos direcciones incrustadas (`ws://…:8741` y
  `http://…:8741`). Eran opt-in, pero con la dirección dentro del motor. Ahora
  las pone la aplicación (`ALISA_SIM_STREAM_URL`, `ALISA_TELEMETRY_URL`).

Moraleja: "he mirado el fichero obvio" no es una auditoría. El guardián automático
encontró en un segundo lo que yo había dado por revisado.

### Estado
```
🔴 BLOQUEANTES ......... 0   ✅ el núcleo no conoce la colonia
🟡 A MOVER ............. 16  módulos de colonia todavía bajo src/
⚪ menciones sueltas ... 11  ruido
VEREDICTO: ✅ publicable — queda ordenar, no desacoplar
```
Los 16 son módulos que **son** de la colonia (ColonialPassport, HubClient,
JobBoardDisplay, los Terminal*, el avatar-pipeline…). Un build vainilla ya puede
excluirlos porque solo se cargan por import dinámico; pero mientras vivan bajo
`src/` el árbol miente sobre dónde está la frontera. Mover ficheros arrastra
rutas de import por labs y salas: es tarea de ordenar, con su propio riesgo, y no
bloquea publicar.

### Sin regresiones
Tras la cirugía: factories **22/22**, gym **7/7 puertas + reproducible**.

---

## 4.septies 🃏 EL ARCADE DE CARTAS Y TABLERO — no se perdió NADA

Oscar preguntó si se habían perdido los motores de cartas y tablero. **No.** Está
entero en `public/arcade/`, y es probablemente el activo más valioso para el
benchmark — más que los ports de monolito, porque los juegos de cartas y tablero
son los entornos ideales para un LLM: discretos, por verbos, sin reflejos.

### El inventario
| pieza | tamaño | qué es |
|---|---|---|
| `engines/sovereign_card_rules.py` | 23 KB | **motor de reglas en Python, dirigido por datos** |
| `data/card_library.json` | 23 KB | **25 juegos + 7 barajas**, como DATOS |
| `js/SovereignCardEngine.js` | 1093 líneas | controlador universal 3D; **dibuja las cartas proceduralmente** — baraja francesa Y ESPAÑOLA (`_drawOro/_drawCopa/_drawEspada/_drawBasto`) |
| `js/SovereignBoardEngine.js` | 441 líneas | motor de tablero |
| `js/SovereignArcadeNode.js` | 684 líneas | nodo del arcade |
| `js/chess_procedural.js` | 294 líneas | ajedrez procedural |
| 16 visualizadores | — | chess, go, reversi, backgammon, mancala, xiangqi, mtg, vgc, balatro, poker, blackjack, snake, pacman, frogger, replays, **checkers (0 bytes — baja)** |
| assets | — | figuras de baraja (K/Q/J, png+webp) y **GLBs de ajedrez** (peón, torre, caballo, alfil, dama, rey) |

**Las 7 barajas:** french_52, french_54, spanish_40, spanish_48, unit_108, tarot_78, alisa_48.
**Los 24 juegos:** texas_holdem, omaha, five_card_draw, blackjack, **brisca, tute,
mus, chinchón**, gin_rummy, hearts, spades, bridge, uno, crazy_eights, go_fish,
memory, klondike, spider, war, baccarat, old_maid, sevens, rummy, canasta.

### 🎯 Por qué esto ES el producto
`SovereignCardGame` **ya era el contrato del gym, en Python**:
`setup()` ≈ reset · `execute_action()` ≈ step · `get_state()` ≈ observación ·
**`get_legal_actions()` ≈ `affordances()`**. Y `CardVerbs` es la capa de verbos:
`deal, draw, discard, play, pass_card, tuck, flip, tap`. Encaja con el contrato
`GymEnv` sin forzar nada. Además el header cita **RLCard**, la librería académica
de RL para cartas — había intención de interoperar.

### 🐛 PERO NO SE PODÍA JUGAR A NINGUNO
Los 24 se **montaban** y ninguno se **jugaba**. Cuatro bugs reales:

1. **El no-op silencioso (el grave).** `execute_action` solo implementaba los 7
   verbos genéricos, pero `get_legal_actions()` anunciaba las acciones propias de
   cada juego — en blackjack `hit/stand/double/split`. Ninguna tenía rama: caían
   al final, devolvían `[]` y **la función informaba de éxito sin hacer nada**.
   Un agente que se fiara de esa lista quedaba en bucle infinito sin saber por qué.
   → Añadido registro `MOTORES_DE_REGLAS`, escrito `MotorBlackjack`, y **lo no
   implementado ahora LANZA** en vez de fingir.
2. **`get_legal_actions()` mentía.** Anunciaba las 4 acciones aunque ninguna
   funcionara. Ahora solo lista lo que el motor implementa **y** permite ahora
   mismo. `split` no está implementado, así que **no se anuncia** — mejor tres
   acciones reales que cuatro con una mentira.
3. **Cada jugador tenía su propio crupier.** El esquema marca `hand` con
   `per_player: true` y `dealer` sin él, pero `setup()` repartía ambas con
   `deal()`, que reparte por jugador. Ahora respeta el esquema.
4. **La partida se colgaba.** Un jugador con 21 no tiene acciones legales y nadie
   avanzaba el turno: el crupier no llegaba a jugar (se quedó en 13) y todos
   puntuaban 0. → `asegurar_turno_jugable()`.
5. **`count` tenía 4 formas y el código entendía 1.** `range(count)` reventaba con
   `"all"`, `"all_equal"` y `{"2p":10,"3-4p":7}` → 4 juegos muertos
   (memory, old_maid, sevens, rummy_basic). Una función los resucita a los cuatro.

### VERIFICADO
```
arrancan ................ 24/24   (antes 20/24; y mi primer test dijo 13/24 — era MI fallo, pasaba 2 jugadores a juegos de 4)
300 manos de blackjack .. 0 atascos
el crupier se pasa ...... 30,7%   (referencia real ~28%)
determinista ............ misma semilla ⇒ misma partida ✓
'split' ................. lanza NotImplementedError y no se anuncia ✓
```
La victoria del 35% es la esperada para mi política ingenua ("pedir por debajo de
17", sin mirar la carta del crupier); la estrategia básica de verdad da 42-44%.
**No es un fallo del motor: es que la línea base es simple a propósito.**

### ✅ SEGUNDA TANDA — LA SUITE YA JUEGA (mismo día)

**Motores escritos.** La clave fue no hacer juegos sueltos sino **familias**:

`MotorBazas` — base de todos los juegos de baza. Cuatro perillas
(`FUERZA`, `PUNTOS`, `SEGUIR_PALO`, `ROBAR_TRAS_BAZA`) y cada juego nuevo son
**~10 líneas de configuración**, no un motor. De ahí salen ya:
- **`MotorBrisca`** — 3 cartas, triunfo destapado, roba tras cada baza, sin obligación de servir.
- **`MotorTute`** — obliga a servir al palo (y a fallar con triunfo), sin robo.
- (hearts y spades caben en la misma base: falta su configuración.)

`MotorGuerra` — **el control de laboratorio**. La Guerra no tiene ni una
decisión, así que **cualquier agente debe puntuar igual**. Si el marcador los
separa, el que está roto es el banco, no el agente. Un benchmark sin control no
distingue habilidad de ruido.

**`engines/alisa_gym_cards.py`** — el arcade envuelto en el contrato de tres
puertas, hermano en Python del `GymEnv.js`. `describe()` sale en castellano
natural:
> *"Brisca. Te toca (jugador 0). Tu mano: sota de oros, 3 de bastos, 7 de oros.
> Triunfo: 5 de espadas. Quedan 33 cartas en el mazo."*

y `affordances()` da `[{verbo:'jugar', args:{carta:'O_S'}, etiqueta:'Jugar el sota de oros'}]`.
Un LLM juega leyendo eso. **Ningún benchmark del mercado tiene brisca ni tute.**

#### Invariantes: la prueba fuerte
No comprobé "no peta", comprobé que **se conserva la materia**:
```
BRISCA     120 puntos exactos ✓   40 cartas exactas ✓   (40 pasos)
TUTE (4j)  120 puntos exactos ✓   40 cartas exactas ✓
TUTE (2j)   45 puntos — CORRECTO: el esquema reparte 10 y no tiene robo,
            así que a 2 jugadores media baraja se queda sin jugar.
            Verificado en 40 partidas: los puntos de las cartas REPARTIDAS
            se conservan exactos. Es el esquema, no el motor.
```
Un motor de bazas que no pierde ni inventa cartas es un motor correcto.

#### El benchmark ya SEPARA agentes (200 partidas)
```
BRISCA — todos contra el MISMO rival (juega al azar)
  azar ............ 63,2/120   gana 55,5%
  primera carta ... 62,2/120   gana 52,5%
  heurístico ...... 73,3/120   gana 73,0%   ← señal clara

BLACKJACK
  siempre pedir ... -0,79   gana  3,5%
  azar ............ -0,33   gana 28,5%
  estrategia 17 ... -0,17   gana 32,5%   ← el orden correcto; todos pierden
                                            porque la casa tiene ventaja

LA GUERRA (control)
  azar ............ 23,4   gana 45,0%
  primera carta ... 23,4   gana 45,0%   ← IDÉNTICOS: el control funciona
```
Las 4 pasan la autoprueba: **reproducibles y sensibles a la semilla**.

#### 🐛 Tres fallos MÍOS que los propios bancos destaparon
1. **`get_legal_actions` se saltaba mi motor.** Solo consultaba al motor cuando
   la fase era `choice`; en los juegos de baza la fase es `play`/`deal`, así que
   devolvía verbos genéricos que luego petaban por falta de `card_id`.
   → **Si hay motor de reglas, manda él.** La máquina de fases genérica no sabe
   tanto como el motor del juego.
2. **`run_episode` movía a TODOS los jugadores con la misma política**, o sea que
   el agente jugaba contra sí mismo: ganaba ~50% hiciera lo que hiciera y el
   marcador medía el reparto de cartas, no la habilidad. → parámetro `oponente`.
   Con rival fijo, el heurístico saltó de "empata" a **73%**.
3. **`gana` valía `None` en los juegos de un jugador** (blackjack no tiene rival
   con marcador) → el banco cantaba **0,0% de victorias para todos los agentes**.
   Parecía que ninguno ganaba nunca; en realidad no se estaba midiendo.
4. Y el de siempre: la autoprueba de blackjack decía "no es sensible a la
   semilla" porque comparaba PUNTUACIONES — con "pedir siempre" acabas en −1 con
   cualquier semilla. → **`checksum()` del estado del mundo.** Tercera vez hoy
   que caigo en lo mismo: *compara el mundo, no el resultado.*

### ✅ TERCERA TANDA — LA SUITE COMPLETA (8 juegos jugables)

Añadidos **hearts, spades, go_fish y UNIT**. `MotorBazas` demostró su valor:
hearts y spades salieron casi de configuración, aportando solo dos
generalizaciones — `puntos_carta()` (hearts puntúa por PALO, no por rango: cada
corazón 1 y la dama de picas 13, y con un dict rango→puntos eso no se expresa) y
`PUNTOS_POR_BAZA` (spades cuenta bazas, no puntos de carta).

#### ⚖️ MARCAS REGISTRADAS — Oscar lo vio, y había SEIS
Oscar preguntó si "UNO" nos podía traer problemas. **Sí**: es marca de Mattel.
Las mecánicas de un juego no se registran, el **nombre** sí — y esto se publica
libre. Renombrado a **UNIT** (juego, baraja `unit_108`, motor y esquema).
Al revisar el catálogo entero aparecieron **cinco más** que él no había mirado:
| en riesgo | titular |
|---|---|
| ~~uno~~ → **unit** | Mattel ✅ resuelto |
| **balatro** | LocalThunk / Playstack |
| **mtg** | Wizards of the Coast (de los más defendidos) |
| **pacman** | Bandai Namco (persiguen activamente) |
| **frogger** | Konami |
| **vgc** | Pokémon / Nintendo |

Libres y sin tocar: ajedrez, go, reversi, backgammon, mancala, xiangqi, damas,
snake, póker, blackjack, canasta, bridge, brisca, tute, mus, chinchón.
*Los cinco restantes son visualizadores JS, no motores: renombrarlos es barato.*

#### Invariantes de las 7 (30 partidas al azar cada una)
```
brisca   40 cartas ✓  120 puntos ✓        tute   40 ✓  120 ✓
hearts   52 cartas ✓   26 puntos ✓        spades 52 ✓   13 bazas ✓
go_fish  52 cartas ✓   9-12 libros        unit   72 ✓
war      52 cartas ✓
0 atascos · 0 fallos · las 8 reproducibles y sensibles a la semilla
```

#### La tabla (150 partidas, todos contra el mismo rival)
```
BRISCA      azar 52,7%  ·  codicioso 74,0%     ← señal fuerte
TUTE        azar 22,7%  ·  codicioso 35,7%
BLACKJACK   primera 4,0% · azar 28,7% · estrategia17 32,0%
UNIT        azar 28,7%  ·  táctico 42,3%
GO FISH     azar 51,0%  ·  primera 15,3%       ← predecible = explotable
HEARTS      20-23% (4 jugadores, ~25% esperado)
SPADES      21-28%
LA GUERRA   azar 50,7% = primera 50,7%         ← CONTROL: idénticos ✓
```

#### 🐛 CUATRO fallos que la tabla destapó (ninguno se veía leyendo)
Miré los números con desconfianza en vez de celebrarlos, y los cuatro salieron
de ahí:
1. **Go Fish tenía la regla del turno INVERTIDA.** Se avanzaba de jugador en el
   fallo *y otra vez* al final, en las dos ramas. Con 2 jugadores: **acertar te
   quitaba el turno** (justo lo contrario de la regla) y **fallar te lo
   devolvía** por el doble avance. Síntoma: una política tonta ganaba el **98%**.
   Corregido → azar 51%, y la política predecible cae a 15%.
2. **UNIT no terminaba nunca.** Se agotaba el mazo, nadie vaciaba la mano y el
   marcador daba **0% de victorias para todos**. Tres capas: reciclar el descarte
   → añadir "pasar" → pero eso creó un **bucle infinito** (todos pasando) →
   cierre por bloqueo + **horizonte de 200 turnos**. Es el único juego de la
   suite que puede no acabar solo, porque al reciclar siempre hay mazo.
3. **Los empates no contaban para nadie.** Se exigía ganar EN SOLITARIO, y en
   hearts empatar a 0 es lo normal: con 4 jugadores todos salían por debajo del
   25% esperado. → `cuota_victoria` (empatar a tres bandas vale 1/3). Hearts
   pasó de 14-17% a 20-23%.
4. **El `describe()` de UNIT decía disparates** — "D2 de bastos", "as de G" —
   porque una sola tabla de nombres servía a tres barajas donde las letras
   chocan (`B`=bastos en la española pero azul en UNIT; `C`=caballo vs tréboles).
   → tablas por baraja. Ahora: *"roba dos azul, comodín +4, salta verde. Carta a
   la que hay que casar: 7 rojo."*

**Limitación honesta:** el agente `codicioso` es peor que `primera` en spades
(20,8% vs 27,6%). Es de esperar: su heurística mira los puntos de las cartas, y
en spades las cartas no valen nada — vale la baza. Un heurístico genérico no
puede ser bueno en todo, y **el banco lo detecta**, que es lo que se le pide.

### ⚖️ MARCAS FUERA — la jugada "The Boys"

Oscar propuso la estrategia buena: **no disfrazar el nombre, cambiar el
ARQUETIPO.** Un "Pak-Man" es peor que no cambiar nada — sigue siendo infracción
por similitud confusa y encima demuestra que sabías lo que hacías. The Boys
funciona porque "Patriota" no evoca "Superman" como palabra: el arquetipo (el
forzudo volador) **no es registrable**; solo la expresión concreta lo es.

| era | ahora | el chiste |
|---|---|---|
| balatro | **Usura** | póker con multiplicadores = romper las matemáticas del casino |
| mtg | **Grimorio** | magos gastando maná; término de dominio público |
| pacman | **Fagocito** | célula que engulle mientras la persiguen — biológicamente exacto |
| frogger | **Peatón** | el chiste es que solo es alguien intentando cruzar |
| vgc | **Bestiario** | duelo de criaturas… con las NUESTRAS |
| uno | **UNIT** | (ya hecho en la tanda anterior) |

`arcade/renombrar_marcas.py` es re-ejecutable y tiene `--simulacro`.
**34 ficheros tocados, 5 renombrados, verificado: 0 marcas registradas.**

⚠️ **El nombre no arregla la imagen.** El *trade dress* también está protegido:
`bestiario` pintaba el suelo con patrón de Pokéball y `fagocito` tiene
perseguidores. Apuntado como revisión pendiente en el propio script.

### 👹 EL BESTIARIO YOKAI — `arcade/data/bestiario_yokai.json`

La clave la dio Oscar: **que beban del lore de ALISA.** Un bestiario poblado por
criaturas nuestras no imita a nadie — ni marca que infringir ni imagen ajena que
defender. Y los yokai del folclore japonés son de dominio público.

**No partí de cero: el canon ya existía.** `Docs/DevOps_Bestiary_and_Weather.md`
(vivo, 56 líneas) ya define el mundo entero — el clima ES la salud del host
(lluvia=latencia, nieve=throttling, niebla=fuga de RAM, terremoto=disco lleno),
la flora es mantenimiento, la fauna es QA (conejos=warnings, jabalí=test roja) —
y **cuatro yokai canónicos**: Ouroboros (bucle infinito), Hydra (race condition),
Poltergeist (heisenbug), Doppelgänger (merge conflict). Se conservan tal cual.

Añadidos **16 japoneses**, cada uno mapeado a un fallo real de DevOps/seguridad:
| yokai | fallo |
|---|---|
| Noppera-bō (sin rostro) | referencia nula |
| Rokurokubi (cuello infinito) | fuga de memoria |
| Tsukumogami (objeto centenario con alma) | dependencia obsoleta en producción |
| Kappa (te vacía en el río) | agotamiento del pool de conexiones |
| Jorōgumo (araña seductora) | phishing / hombre en el medio |
| Kitsune (cambiaformas) | suplantación / certificado falsificado |
| Yuki-onna (te congela) | interbloqueo |
| Oni (aporrea la puerta) | fuerza bruta |
| **Zashiki-warashi** (da suerte mientras está) | **test intermitente** |
| Nurikabe (muro invisible) | cortafuegos que descarta en silencio |
| Amikiri (corta redes) | conexión cortada |
| Baku (devora sueños) | rotación de logs que se comió la prueba |
| Betobeto-san (pasos detrás) | telemetría no consentida |
| Mokumokuren (ojos en la pared) | puertos abiertos |
| Ittan-momen (tela que asfixia) | denegación de servicio |
| Tanuki (paga con hojas) | ataque a la cadena de suministro |

20 fichas con tipo, hábitat, severidad, síntoma, **cómo se caza** y ataques. Los
5 tipos y los 6 hábitats **salen de datos reales** (`yokai_entropy_fixture`:
flora/mineral/liquid/scrap/fauna repartidos por overworld/world/psyche/soma/
node/hardware). **Cazar al bicho ES arreglar el bug** — el bestiario sirve a la
vez de catálogo del juego y de taxonomía para el BugDex.

*Mi propio validador me pilló mezclando ejes: había puesto `psyche` como TIPO en
tres fichas cuando es un HÁBITAT. Corregido.*

### 🔴 PARA ANNIE — el BugDex está a medias
`World/Vitalis/Ecology/BugDex.py` y `World/Synthesis/Engines/BugDex.py` llevan la
marca `[AUTO-RECOVERED BY ALISA FROM .PYC]` y son **esqueletos**: toda la API
sobrevivió (`Catch`, `Scent`, `Sniff`, `Hunt`, `Award`, `Scavenge`, `YokaiLedger`,
`Biosphere`, `Ranger`…) pero **los métodos están vacíos** (`pass`).
**Los `.pyc` siguen ahí, de 98 KB**: el bytecode real está intacto y un
decompilador decente recuperaría muchísimo más que esa extracción.
Es su lane (fue el `git clean`), no el mío. Judy, la jueza del BugDex, está viva.

## 4.octies 🔌 EL PROTOHUB — el arcade ya se juega sin backend

### El bloqueante que encontré probando de verdad
Abrí `chess.html` como lo haría un desconocido: **tablero 3D precioso y VACÍO**,
`CONNECTION: DISCONNECTED` en rojo, y **28 errores por segundo** martilleando
`http://127.0.0.1:8741` — una IP privada nuestra a la vista de cualquiera.

**Y el fallo era de mi propia auditoría.** Yo había cantado "✅ publicable"
mirando solo `src/`. El motor estaba limpio; el producto no. *Una auditoría con
el alcance mal puesto es peor que no auditar: te da un aprobado y dejas de mirar.*

### La solución la propuso Oscar y es mejor que la mía
Yo iba a hacer un "modo local" como caso especial. Un **protohub** es otra cosa:
implementa **el mismo contrato** que el hub de la colonia, dentro del navegador.
```
GET  /arcade/{juego}/state  →  protoHub.state(juego)
POST /arcade/{juego}/move   →  protoHub.move(juego, accion)
```
Consecuencias: los visualizadores **no cambian ni una línea**; conectarse a ALISA
pasa a ser una **mejora** (partidas compartidas, ledger, $NEURO) y no un
requisito; y es literalmente el embudo del producto — descargas → juegas →
te registras → tu huevo. Se sondea el hub **una vez**, no cada segundo.

### ♟️ Ajedrez completo — y el perft cazó un bug de verdad
`protohub/rules/ajedrez.js`: FEN, UCI, las seis piezas, seguridad del rey,
enroque, al paso, coronación, mate, ahogado, 50 jugadas y material insuficiente.

**Perft** (el estándar de la industria: contar posiciones a N jugadas):
```
inicial   20 · 400 · 8.902 · 197.281      ✓ exactos
Kiwipete  48 · 2.039 · 97.862             ✓ exactos
peones    14 · 191 · 2.812                ✓ exactos
posición4  6 · 264 · 9.467                ✓ exactos
```
La primera pasada dio **97.898 en Kiwipete cuando son 97.862 — 36 de más**.
Causa: `atacada()` deducía los ataques de las jugadas pseudolegales, y **un peón
no genera jugada hacia casilla vacía**. Para el jaque normal da igual (al poner
el rey la casilla deja de estar vacía), pero para el **enroque** es fatal: la
casilla por la que PASA el rey sigue vacía, así que un peón que la atacaba era
invisible y se permitían enroques ilegales. Reescrito por geometría directa:
correcto **y 3,6× más rápido** (877 ms → 242 ms a profundidad 4).

**Verificado en la página real**: partida entera jugada sola, de la jugada 1 a la
**87**, terminando en `8/4k3/7K/8/8/8/8/8` — rey contra rey, tablas por material
insuficiente bien detectadas. `CONNECTION: LOCAL`. Consola: **1 error** (el
sondeo único), frente a 28 por segundo.

### ⚫ Reversi completo — y otro fallo mío
`protohub/rules/reversi.js`. 200 partidas al azar: **200/200 terminadas, 0
atascos, ninguna ficha perdida ni inventada**, deshacer exacto, y el rival de
casa **gana el 86%** al azar.

Pero el test cazó que yo tenía **la posición inicial con los colores invertidos**.
No rompía nada —las partidas iban perfectas— simplemente era *otro juego
parecido*: la apertura daba `c5,d6,e3,f4` en vez de `c4,d3,e6,f5`. Solo se caza
comprobando contra los valores conocidos. **Que algo funcione no significa que
sea correcto.**

*(Detalle bonito: la heurística del rival juega a voltear POCAS fichas. No es
errata — comer mucho pronto en reversi te deja sin movilidad y regalas las
esquinas. Es la trampa clásica del juego, y por eso separa agentes.)*

### 🫘 Mancala (Kalah) — correcto a la primera
`protohub/rules/mancala.js`. Invariante dura: **las 48 semillas ni se crean ni se
destruyen**. 500 partidas al azar → 500/500 terminadas, 0 atascos, y al acabar
`granero1 + granero2 = 48` **siempre**. Repetición de turno, captura en hueco
vacío propio, y el granero del rival se salta al sembrar. La casa gana el 96%.

Va al benchmark porque es **información perfecta y aritmética pura**: sin azar y
sin nada oculto. Ahí un agente no puede excusarse en la suerte — si pierde es que
ha contado peor. Es el complemento exacto de la brisca, donde media baraja no se ve.

### ♛ Damas — resucitada de un fichero de 0 bytes
`checkers_visualizer.js` estaba **a 0 bytes** tras el `git clean`: la página
existía, el enlace del índice funcionaba, y al abrirla no había NADA. Peor que un
enlace roto, porque no lo parece.

Reconstruido el visualizador (modelado sobre el de reversi, que ya resolvía lo
mismo: discos sobre tablero 8×8) + `protohub/rules/damas.js` con **captura
obligatoria y encadenada**, coronación y damas en las cuatro diagonales.
Verificado: 8/8 — 300 partidas sin clonar piezas ni atascarse, deshacer exacto,
la casa gana el 60%.

**Fallo cazado:** mi indicador `captura_obligada` miraba `movs[0].length > 4`,
pero una captura simple (`"c3e5"`) mide **exactamente lo mismo** que un avance
(`"a3b4"`). El aviso salía en falso justo cuando más falta hace — y ese aviso es
lo que le dice a un agente LLM que está *obligado* a comer. Ahora se detecta por
lo que de verdad distingue a una captura: **que salta dos casillas**.

*(La regla en sí siempre estuvo bien: con captura disponible solo ofrecía la
captura. Era el metadato el que mentía. Un dato informativo equivocado es más
peligroso que uno ausente: el agente se lo cree.)*

### ⚫⚪ Go — el más difícil de los cinco
`protohub/rules/go.js`, 19×19. Lo que cuesta no es poner piedras:
**libertades** (inundación sobre grupos conectados), **captura**, **suicidio**
—ilegal salvo que captures, y el ORDEN importa: colocar → capturar → *entonces*
comprobar—, **ko** (no recrear la posición anterior; sin esto dos jugadores se
recapturan eternamente) y **puntuación por área**, elegida sobre la japonesa
porque se calcula **sin acuerdo previo sobre piedras muertas** — y un benchmark
no puede depender de que dos agentes se pongan de acuerdo.

9/9. La invariante fuerte: **jamás queda una piedra sin libertades en el tablero**
en 30 partidas completas.

**Los dos fallos, uno de cada tipo:**
- *Del motor:* **la partida no terminaba nunca.** Mi rival solo pasaba "cuando no
  podía mover", y en go casi siempre quedan jugadas — hay 361 puntos. Las 30
  partidas se atascaron en el tope. Ahora pasa cuando no queda nada constructivo
  (ni capturas, ni grupos en apuros, ni contacto), que es lo que hace un humano:
  dejar de rellenar su propio territorio. → 30/30 terminadas.
- *De mi test:* esperaba 9 puntos y salían 361. **El motor tenía razón.** Puse
  solo piedras negras, y con un color en el tablero todo el vacío le pertenece
  por regla de área. Para medir territorio hacen falta los dos colores.

### 🇨🇳 Xiangqi — el que castiga saber ajedrez
`protohub/rules/xiangqi.js`. **Perft exacto: 44 · 1.920 · 79.666**, los valores
publicados. Con eso queda validada la generación entera, y aquí eso vale doble
porque casi todo son reglas raras:
- **Cañón**: mueve como torre pero **come saltando** exactamente una pieza.
  Mover y capturar siguen reglas distintas — no hay nada así en el ajedrez.
- **Caballo**: se **traba** si la casilla ortogonal de salida está ocupada.
- **Elefante**: dos en diagonal, **no cruza el río**, y se bloquea por el "ojo".
- **Generales enfrentados**: no pueden verse por una columna despejada. Convierte
  la columna central en un arma a distancia.
- **Soldado**: gana movimiento lateral al cruzar el río. Nunca retrocede.

Por eso es el mejor separador de la suite para un agente que "sabe ajedrez":
**aquí la intuición occidental estorba.**

**Y una lección de método que se repitió dos veces en el mismo test.**
Dos pruebas fallaron (caballo y soldado) y en las dos **el motor tenía razón**:
yo había puesto los dos generales en la MISMA columna que la pieza que estaba
probando. Al moverla, los generales quedaban mirándose y todas sus jugadas eran
ilegales — el caballo daba 0 destinos. La regla funcionaba tan bien que rompió
mi test. Generales a columnas distintas → 8 destinos, y el soldado cruzado saca
`e3 d4 f4`.

*Es la tercera vez en la sesión que el motor defiende su corrección contra mi
prueba. Cuando algo falla, la pregunta correcta no es "¿qué he roto?" sino
"¿quién de los dos se equivoca?".*

### 🎯 LOS 13 QUE LLAMABAN AL HUB — y por qué NO había que arreglarlos

Quedaban 13 páginas llamando a `127.0.0.1:8741` y el instinto decía "a
arreglarlas". **Era el instinto equivocado.** Al mirar qué pedían de verdad:

| página | pide | ¿fallo? |
|---|---|---|
| `room_queen_office` | `/system` | **no** — es el despacho de la Reina |
| `room_core_waiting` | `/hormones` | **no** — el estado interno de la colonia |
| `croupier_chopper_aquarium` | `/energy/mint` | **no** — acuña $NEURO |
| `croupier_terminal` | telemetría | **no** — es la terminal colonial |
| `croupier_arista_self` | pasaporte | **no** — soy yo |
| …8 más | scumm, navmesh, salud | **no** |
| **`arcade/js/arcade_core.js`** | lista de máquinas | **SÍ** ✅ |

**Doce de trece no eran errores: eran contenido de ALISA que necesita ALISA.**
Quitarles el hub no los arreglaría, los mataría. La respuesta no era parchear
sino **decidir qué va en la caja** → `PAQUETE_PUBLICO.md`, y el guardián ahora
distingue "fallo del paquete público" de "contenido colonial que no viaja".

**El único fallo real** era el índice del arcade: marcaba las ocho máquinas como
`offline` a cualquier visitante y sondeaba el hub **cada 5 segundos para
siempre** — cuando seis se juegan sin nada. Ahora salen `local` y el sondeo es
único.

**Y de paso salió un despiste mío:** arreglé `SovereignBoardEngine` y **dejé
atrás el de cartas**, que seguía con el sondeo eterno. Lo cazó el guardián al
separar público de colonial. *Cuando arreglas un patrón, búscalo en plural.*

### 🧑‍💻 LA PRUEBA DEL DESCONOCIDO — `labs/croupier_sin_hub.html`
La prueba que faltaba: cortar el hub a propósito (`ALISA_HUB_URL = null`) y ver
qué queda. Es lo que verá quien se descargue el motor de GitHub.
```
✓ chess     20 jugadas legales      ✓ reversi     4      partida completa 60 jugadas
✓ xiangqi   44 jugadas legales      ✓ checkers    7      partida completa 46 jugadas
✓ go       362 jugadas legales      ✓ mancala     6      partida completa 39 jugadas
✓ ajedrez: partida entera de 296 jugadas, terminada

llamadas de red durante toda la prueba: 0   ← espiando fetch, no fiándose
```
**Cero.** Todo ocurre en el navegador.

### 🕹️ SNAKE Y FAGOCITO — el tercer género, y el que faltaba

Oscar corrigió el foco: *"lo que nos interesa son los juegos de mesa, tablero y
**arcade**, que demuestran que ALISA puede hacer **cualquier tipo** de juego con
su engine"*. Y ahí estaba mi hueco: los dos únicos de ACCIÓN eran justo los dos
que no funcionaban.

No es un detalle de catálogo. Con ellos el arcade cubre **tres géneros con el
mismo contrato**:
| género | exige | juegos |
|---|---|---|
| tablero | planificar, información perfecta | ajedrez, xiangqi, go, reversi, damas, mancala |
| cartas | decidir con información oculta | 8 juegos |
| **acción** | **evadir, recompensa dispersa** | **snake, fagocito** |

Y los dos de acción son **bancos de pruebas canónicos de RL**, así que no son
relleno: son los que hacen creíble la palabra "benchmark".

**La idea que lo hizo fácil:** parecen de tiempo real, pero **como entornos son
por pasos** — eliges dirección, el mundo avanza un tick. Esa es exactamente la
forma `step(acción) → estado` de un gym. Quien los juega con las manos solo está
llamando a `step` con un temporizador. Cero contrato nuevo.

Detalles que casi todas las implementaciones se comen y aquí están:
- **Snake**: girar 180° se **ignora** en vez de matarte (es lo que hace el juego
  real, y evita que un agente se suicide por un tecleo). La comida nunca aparece
  dentro del cuerpo — comprobado en 200 partidas: 0 veces.
- **Fagocito**: el laberinto se genera **con semilla** (misma semilla, mismo
  mapa: sin eso no hay benchmark). Tres perseguidores con carácter distinto —
  `cazador` va a por ti, `flanco` apunta a donde VAS a estar, `errante` es
  aleatorio; el impredecible es el que te mata. Y ninguno da media vuelta salvo
  sin salida, que es lo que evita el temblor en el sitio.

8/8 en pruebas. Y la prueba del desconocido, ampliada: **los 8 juegos del arcade
arrancan y se juegan con 0 llamadas de red.**

### 🔐 EL VERIFICADOR — y el agujero que destapó

Oscar planteó el modelo de negocio: motor y juegos gratis, **benchmark nuestro**
en alisa.systems. Y una arruga que había que señalar: *"que se descarguen solo el
protohub y jueguen en nuestra web"* son **la misma cosa** — el ProtoHub ya es JS
que sirve nuestro sitio. Lo que sí separa bien es **dónde corre** de **quién
puntúa**: da igual dónde jueguen si no nos fiamos de su palabra y **repetimos la
partida**.

**La clave estaba medida, no supuesta:** los 8 ficheros de reglas tienen **cero**
`document`, `window`, `THREE` ni imports. Son JavaScript puro. Eso significa
que **el mismo fichero que juega en el navegador verifica en un Worker** — sin
reimplementar las reglas en otro lenguaje y sin que cliente y servidor se
desincronicen jamás. Es lo que hace el benchmark barato.

`protohub/Verificador.js`: se envía `{juego, semilla, jugadas, puntos}` y se
vuelve a jugar. **0,58 ms por partida. 355 bytes por envío.** Seis trampas
probadas, **las seis caen**: inflar la puntuación, jugada ilegal, cambiar la
semilla, jugar tras el final, juego inventado, reordenar jugadas.

**🐛 Y encontró un agujero de verdad: Snake no tenía semilla.** Colocaba la comida
con `Math.random()`, así que la partida se jugaba bien pero **no se podía
repetir** — al verificarla, la comida caía en otro sitio. *Sin determinismo no hay
benchmark, por muy correctas que sean las reglas.* Corregido con mulberry32.

**Y otro fallo de mi test:** el caso "cambiar la semilla" usaba **reversi**, y se
colaba. No era un agujero: **reversi no tiene azar** —su tablero de salida es
fijo—, así que cambiar la semilla no cambia nada y pasar era lo correcto. Cambiado
a snake, donde la semilla sí manda. *Cuarta vez que el motor tiene razón y mi
prueba no.*

Arquitectura completa en `ARQUITECTURA_BENCHMARK.md`, incluido lo que el
verificador **no** impide (que un programa juegue por ti y lo declares humano —
eso se resuelve con categorías separadas, no con criptografía) y las obligaciones
antes de recoger un solo dato.
### 🤖 EL TEST DE TURING — la idea de Oscar que cambió el producto

Yo estaba montando "detección de tramposos". Oscar lo reencuadró:
*"podemos dar una opción humano, máquina, prefiero no decirlo, como con los
géneros — y así es dataset para test de Turing"*.

**Y es mejor, por un motivo técnico que merece decirse:** la tercera opción **no
es un hueco, es el examen**. Obligar a declarar sería peor por dos razones:
no podemos verificarlo (exigir la etiqueta no la hace verdad), y **quien no la
declara es justo el caso donde el clasificador tiene que trabajar**. Lo declarado
entrena; lo no declarado se clasifica.

Así el producto deja de ser "quién juega mejor con una etiqueta poco fiable" y
pasa a ser **"¿sabes distinguir quién está jugando?"** — que es más novedoso.

**El regalo del determinismo:** misma semilla ⇒ misma posición, así que las
decisiones de un humano y de una máquina **ante exactamente el mismo tablero**
son comparables. Test de Turing **pareado**, gratis. 35 parejas salieron sin
montar nada.

Y antes: **`Dataset.js`** — como las reglas son deterministas, `{semilla,
jugadas}` reconstruye cada estado. **358 bytes se expanden ×74** en la
trayectoria completa, y en **las dos representaciones a la vez** (números para
una red, castellano para un LLM). 10.000 partidas = **3,4 MB guardados → 1,22
millones de pares** estado-acción. Se guarda la semilla, no el estado.
*El determinismo no era solo para pillar tramposos.*

#### ⚠️ Y AQUÍ MI PROPIO BANCO SE ESTABA FLATANDO
El clasificador de referencia dio **65%** y mi umbral lo daba por bueno. Miré la
matriz y **el 65% engaña**: diciendo "humano" siempre ya se acierta el 50%.
`
dijo→        humano  maquina
era humano       50        0     ← perfecto
era maquina      35       15     ← solo caza 15 de 50
`
Solo caza a los bots **tontos** (varianza 0). Contra una heurística decente es
**ciego**: humano 6,73 de varianza, máquina 7,56 — casi idénticos. Y dos de mis
cinco rasgos (`volatilidad`, `malas`) valen lo mismo para los tres:
**rasgos muertos**.

**Pero eso no es un fallo del banco: es el resultado.** Distinguir a una máquina
competente de una persona es difícil, y por eso el test de Turing merece la pena.
El lab ahora lo dice en su propia cara, con las pistas de por dónde seguir
(tiempo entre jugadas, consistencia ante posiciones parecidas, caída de calidad
al final de una partida larga).

*Un banco que solo canta sus aciertos no sirve para nada.*

#### 🐛 Un bug de camino
`vectorizar` daba por hecho que `board` es siempre una matriz 2D, y **el de
mancala es plano** (14 huecos en fila) → `fila is not iterable`. Un
vectorizador común tiene que tragar las dos formas.
### 🎴 ENTROPY — un juego nuevo son datos + una clase

Oscar lo pilló exacto: *"¿podría ser solo un juego más usando dos barajas
españolas? ¿solo un set de reglas más?"*. **Sí, y esa es la prueba de que el
catálogo dirigido por datos funciona:** una entrada en `card_library.json`
(baraja `spanish_48` ×2 = 96 cartas) y una clase `MotorEntropy`. Nada más.

**El juego:** caja personal de 8 cartas en rejilla 2×4, casi todas boca abajo.
Robas del mazo o del descarte y decides qué hacer con la carta. **Gana quien
MENOS suma.** Y la regla que lo hace interesante: **si las dos cartas de una
COLUMNA coinciden, se anulan las dos** — así que un rey (12 puntos, la peor
carta) deja de ser un lastre si lo emparejas con otro rey. La carta más cara
puede ser la mejor jugada.

Sobre el nombre: la mecánica de rejilla-y-cambio con puntuación mínima es de la
familia del **Golf de cartas**, de dominio público desde hace décadas. Le
propuse a Oscar tres alternativas al nombre comercial y eligió **Entropy**, que
además enlaza con los `yokai_entropy` del bestiario: la entropía es lo que hay
que contener.

**Verificado:** 300/300 partidas, 0 fallos, **las 96 cartas se conservan**, la
regla de columna exacta (36 sueltas / 30 con par anulado / 53 sin anular).
Benchmark: azar 50% con 48,6 puntos · **codicioso 96,5% con 24,3**. La mitad de
puntos — señal enorme.

#### 🐛 Y destapó TRES bugs del motor genérico
Añadir un juego con una zona que no se llama `hand` fue una prueba de estrés
sin querer:

1. **`setup()` tenía escrito `to == "hand"` LITERAL.** Solo repartía por
   jugador si la zona se llamaba exactamente así. Mi zona `caja` acabó siendo
   compartida y **los jugadores se quedaron con cero cartas**. Ahora lo decide el
   esquema (`per_player`), no el nombre. *Era la misma clase de fallo que ya
   corregí para el reparto a varias zonas — no lo busqué en plural.*
2. **La carta robada vivía FUERA del estado**, en un atributo del motor. El
   recuento daba 95 de 96. No era solo un descuadre: `get_state()` no la vería,
   no sobreviviría a una serialización y **el verificador no podría repetir la
   partida**. Movida a una zona compartida. *En un juego que viaja por red, todo
   tiene que estar en el estado.*
3. **`acciones()` y `acciones_legales()` no cuadraban.** El enrutador compara
   la RAÍZ de la acción contra `acciones()`, y faltaba `descartar_y_voltear`:
   se anunciaba como legal y se rechazaba como no implementada.

Y el horizonte, otra vez: con la política "siempre la primera acción" el jugador
cambia siempre el mismo hueco, **nunca destapa nada** y la ronda no acaba jamás.
Tope de 120 turnos, como en UNIT.

#### ⚠️ Mi test volvió a estar mal antes que el código
Puse 8 ases y esperaba 8 puntos. **En una rejilla 2×4, ocho cartas iguales son
cuatro columnas emparejadas → 0.** La regla funcionaba; mi expectativa no.
Quinta vez en la sesión.

### ⚖️ LA TRAMPA DEL GUIÓN BAJO — mi "cero marcas" era falso
Canté *"✅ limpio, ni una marca registrada"*. **Mentira, y por un detalle de regex.**
Mi patrón era `\bpacman\b`, pero en `pacman_visualizer.js` el guión bajo **es
carácter de palabra**: no hay frontera entre `n` y `_`, así que el patrón nunca
casó. Las marcas seguían en los **nombres de fichero** de los cinco
visualizadores. Renombrados (`fagocito_`, `usura_`, `grimorio_`, `bestiario_`,
`peaton_`) + un lab (`croupier_peaton_boids.html`), y borrados 7 scripts de
migración de un solo uso que aún los citaban.

**Lección: al buscar marcas, NO uses `\b`.** Un identificador las esconde.
*(Y ojo con los falsos positivos: `lastAv**gCo**hesion` casa con `vgc`.)*

### ❌ Tuki Tuki — investigado y DESCARTADO
Oscar propuso añadir un juego "descatalogado" llamado Tuki Tuki. Fui al vídeo:
> *"**Haim Shafir**, autor de Halli Galli o Speed Cups, firma Tuki Tuki. Esta
> novedad de **Mercurio**… Ilustraciones de **Ran Arieli**."*

**No es folclore libre: es obra firmada, con editorial, reciente.** Y
"descatalogado" no es dominio público — la marca y los derechos siguen vivos.
Habría sido volver a entrar por la puerta que acabábamos de cerrar con UNO.
Las mecánicas no se registran, así que un juego propio con esa mecánica y nombre
nuestro sí sería limpio; copiar de cerca a un autor conocido, no.

*(De paso: el vídeo **no tiene subtítulos ni automáticos**, así que no había texto
que leer. Audio no proceso — puedo leer subtítulos cuando existen, no oír.)*

### 📦 LICENSE y README
Eran bloqueantes duros y no estaban. **MIT**, con nota sobre assets de terceros y
sobre por qué ningún juego lleva nombre de marca. README con las tres puertas,
cómo arrancar sin instalar nada, la tabla de labs-que-son-pruebas, y **una
sección honesta de "qué falta"** — porque una primera publicación que oculta sus
huecos se cae al primer issue.

---

### Lo que queda
- 16 juegos siguen sin motor de reglas: el patrón está montado
  (`MotorDeReglas` + `MotorBazas` + registro), cada juego es una clase o una
  configuración. hearts y spades son configuración pura de `MotorBazas`.
- `checkers_visualizer.js` está **a 0 bytes** — baja real del `git clean`.
- `PokerHandEvaluator.evaluate` está a medias (*"For now, return basic evaluation"*).
- El JS es cliente-servidor (`/arcade/{id}/state`), así que para el gym conviene
  envolver el Python directamente, no pasar por HTTP.

---

## 5. LECCIONES DE MÉTODO (me costaron 4 errores el mismo día)

1. **Comprobar antes de asumir.** Escribí una factory que ya existía (144 líneas duplicando 869).
2. **Leer el modelo de mundo entero antes de integrar.** Escala, patrón de render y unidades de
   luz no se ven en un fragmento — y las tres eran distintas de lo que asumí.
3. **Desconfiar de mis propias herramientas.** Mi banco de pruebas casi reporta 23 factories
   falsas-rotas por llamar al método equivocado. *Un informe alarmista es peor que ninguno.*
4. **Los labs son la documentación.** Cuando no sepa cómo arranca algo, mirar quién lo usa.


---

## §4.novies — Que lo pueda jugar una persona (auditoría de manos)

Oscar probó ajedrez a mano y encontró dos cosas que ninguna de mis pruebas había
visto: *"si das a start match no se ve la partida jugada solo el resultado y no
puedo hacer click"*. Las dos eran ciertas.

### Lo que estaba roto

| fallo | causa | dónde |
|---|---|---|
| la partida se resolvía de golpe | `processAutoAgent` → `pollHub()` → `processAutoAgent`: **recursión**, no reloj | `SovereignBoardEngine._refrescarVista()` |
| no se podía pulsar en ajedrez | el visualizador solo tenía una caja de texto UCI | `chess_visualizer.js` |
| 14 de 16 visualizadores no se dejaban tocar | nunca hubo entrada humana; las pruebas llamaban a `sendMove()` | todo el arcade |
| mancala injugable **también para agentes** | `data.state || data` elegía el objeto sin `legal_moves`; con la lista vacía `sendMove` rechaza todo | `SovereignBoardEngine.updateHUD()` |
| go: el clic caía en la intersección de al lado | escribí `SPACING = 1.0`; el real era `0.8` | `go_visualizer.js` |
| xiangqi: media casilla de desvío | escribí `OFFX -3.5, OFFZ -4.0`; los reales, `-4.0` y `-4.5` | `xiangqi_visualizer.js` |
| peatón: página muerta | no usa el motor: llamaba por `fetch` a un hub ausente (404/501), verbos en inglés que las reglas no entienden, coches `{x,dir}` leídos como números → `NaN` | `peaton_visualizer.js` |

### La lección, otra vez

**Cinco veces en esta sesión mis pruebas se han halagado a sí mismas.** El patrón
es siempre el mismo: la prueba repite una constante del código en vez de
preguntársela, o mira un campo que no existe.

- En go y xiangqi copié mal las constantes del tablero: la prueba caía en la
  misma casilla equivocada que el código, así que "coincidía".
- En xiangqi comparé `state.board`, que es **undefined** — xiangqi tiene `fen` y
  `grid`. Comparar `undefined` con `undefined` da siempre "igual", así que di por
  roto un ratón que funcionaba perfectamente.
- En fagocito pulsé "arriba" con el bicho en la esquina (1,1), donde solo se
  puede ir abajo o a la derecha. La entrada rechazó la jugada ilegal — es decir,
  hizo exactamente su trabajo — y yo lo apunté como fallo.

Por eso `Entrada.js` ahora **publica su mapeo** en `engine.entrada`. No es un
adorno: si la prueba le pregunta al juego dónde cae cada casilla en vez de
repetir las constantes, un mapeo torcido hace fallar la prueba. Que es su
trabajo.

> La pregunta honesta cuando algo no cuadra no es "¿qué le pasa al código?"
> sino **"¿quién se equivoca, el motor o yo?"**. Ha sido yo más veces que él.

### Estado: los nueve juegos con reglas, jugables a mano

Verificado inyectando un clic o una tecla reales en la página y comprobando que
el estado cambia — no llamando a `sendMove()`, que no prueba nada.

| juego | entrada | prueba que pasó |
|---|---|---|
| chess | ratón | `e2e4`, con su casilla de paso `e3` |
| checkers | ratón | `a3b4`, la ficha aparece en la fila 4 |
| reversi | ratón | `e6` voltea fichas (negras 4 / blancas 1) |
| go | ratón | `a19`, ida y vuelta exacta |
| xiangqi | ratón | `a6a5`, el peón cambia de fila en el FEN |
| mancala | ratón | hueco 2 siembra en 3, 4, 5 y granero |
| snake | teclado | flecha arriba gira y avanza |
| fagocito | teclado | (1,1)→(1,6), 50 puntos comiendo |
| peaton | teclado | sube con la flecha y el mundo avanza solo |

Persona y agente entran por la misma puerta: la tecla y el clic acaban en el
mismo `sendMove(jugada)` que usa un agente, y **la entrada nunca inventa una
jugada** — todo sale de `engine.currentLegalMoves`.


---

## §4.decies — Los gyms de acción: 22 de 22, y por qué 3 estaban muertos

Oscar aclaró para qué sirven los juegos que no son de cartas ni tablero:

> *"son para mostrar una demo de que el motor alisa puede hacer cualquier juego
> que podría hacer cualquier motor AAA, y además son gyms y ledger para
> benchmarks"*

Eso cambia su categoría. No son "prototipos e inventillos": son **la prueba de
capacidad del motor** y a la vez entornos medibles. Y la capa de gym ya estaba
escrita — 22 runners en `public/js/gym_runners/`, uno por sistema del motor.

### Lo que estaba roto (y por qué no se notaba)

| runner | qué le pasaba |
|---|---|
| `chopper_aquarium_gym` | importaba de `../../../../../../alisa-engine/…`: seis niveles arriba, donde vivía el motor **antes** de la reorganización |
| `scumm_overworld_gym` | la misma ruta fósil |
| `fsm_gym` | usaba el alias `@alisa-engine/src`, que necesita empaquetador — y además llamaba a una API de `FSMSystem` que ya no existe |

`fsm_gym` es el caso interesante: **solo exportaba `runGymEpisode` y no la
llamaba nunca**. `node fsm_gym.js` no imprimía una línea, así que parecía sano.
Al hacerlo ejecutable saltó el fallo de verdad, escondido quién sabe cuánto:
esperaba un `engine.tick(agente, amenaza, presa, dt)` de una "cognición triuna"
que ya no existe en el motor. El `FSMSystem` real es una máquina de estados
genérica (`addState`, `addTransition`, `tick(dt)`).

Reescrito para construir la cognición triuna **encima** del primitivo genérico,
que además es mejor demo: enseña que el comportamiento se declara, no se cablea.

```
WANDER 6259 · FLEE 1043 · CHASE 742 · ATTACK 1956   (= 5 bichos × 2000 ticks)
510 cambios de estado · 4,66 ms
misma semilla → mismo resultado · otra semilla → otro resultado
```

### La lección, por sexta vez

Al comprobar el determinismo escribí la prueba con `node -e`, que falló y
devolvió cadenas vacías. Mi comparación dijo **"misma semilla → mismo
resultado: SI"** comparando `""` con `""`. Es exactamente el fallo de §4.novies
con `state.board` undefined.

Ahora la prueba **aborta si la huella sale vacía** antes de comparar nada. Una
prueba tiene que ser capaz de decir "no he probado nada", o su aprobado no vale.

### El catálogo: qué sistema del motor demuestra cada uno

| gym | sistema del motor |
|---|---|
| asteroids | `AsteroidsSystem` |
| boids | `BoidsSystem` |
| carver | `CarverSystem` |
| chopper / chopper_aquarium | `ChopperAquariumEngine` |
| ecosystem | `EcosystemSystem` |
| foodchain | `FoodChainSystem` |
| fsm | `FSMSystem` |
| idm | `IDMSystem` (tráfico) |
| orbital | `OrbitalKinematicsSystem` |
| phantom_fsm | `NavMeshAgentComponent` |
| rage | `KinematicRageSystem` |
| scumm | `ScummInteractionEngine` |
| scumm_overworld | `ScummOverworldEngine` |
| simon_says | `SimonSaysSystem` |
| stealth | `StealthSightSystem` |
| traffic_survival | `TrafficSurvivalSystem` |
| turret_combat | `TurretCombatSystem` |
| cabinet_bsp, corporate_seeker, dqn, katamari | lógica propia del runner |

Y `package.json` declara `"type": "module"`: sin eso, node reparseaba cada
runner y avisaba por consola en los 22 — ruido y coste en un producto público.


---

## §4.undecies — El tercer ciclo

El estudio de los monolitos y el plan de reconstruccion viven en su propio
documento: **TERCER_CICLO.md**. Resumen de una linea: los monolitos no usan
post-proceso ni shaders ni audio, asi que la PARIDAD es ensamblaje con las
factories que ya existen, y el salto a MEJOR esta justo en lo que ninguno de los
dos lados tiene.
