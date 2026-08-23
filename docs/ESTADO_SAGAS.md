# ¡Busca! y ¡Sobrevive! — estado de las dos sagas

Hasta el 2026-08-23 esto era **una** saga de ocho etapas en fila, «Raccoon
Scape». Esa fila mezclaba dos verbos que no se parecen: en unas etapas **buscas**
algo que se esconde, y en las de cadena trófica lo que haces es **no ser lo que
se comen**. Son dos habilidades, se miden distinto, y ahora son dos sagas.

> Objetivo declarado: que cada matrioska acabe siendo **un juego de plataformas**.
> Paso previo: que las etapas funcionen.

⚠️ **HAY DOS SALAS DEL HUEVO, Y LA QUE SE VE NO ES LA BONITA.**

```
room_sala_del_huevo.html      la enlazan 15 ficheros  ← portada, 404, comprobador
room_tenshi_no_tamago.html    la enlazan 4            ← sólo catálogos
```

Las sagas se montaron primero en `room_tenshi_no_tamago.html`, que las pinta en
**dos arcos** —¡Busca! delante, ¡Sobrevive! detrás— y a la que **no llega nadie**:
la portada, la página de error y el verificador de despliegue apuntan todos a la
otra. Reestructurar la sala equivocada costó una mañana.

`room_sala_del_huevo.html` es la que ve la gente: dieciséis experiencias en una
lista plana, con las etapas de las dos sagas mezcladas entre Marabunta, Katamari y
los Boids. Ahora al menos llevan su saga y su número en el rótulo, y la etapa 1 de
¡Sobrevive! —el Interaction Lab— que no estaba, ya está.

Los dos arcos siguen en la otra sala. Unificarlas es trabajo pendiente, y hasta que
se haga **el rótulo es lo que hay**.

## ¡Busca! — encontrar algo que se esconde

| # | etapa | fichero | estado |
|---|---|---|---|
| 1 | Cabinet Escape | `games/croupier_cabinet_escape.html` | ✅ **reparado 2026-08-01** |
| 2 | Registro de Planta | `games/raccoon_floor_search.html` | ✅ **reconstruida**, tres niveles (con luz · sin luz · sin luz y con predador) |
| 3 | Corp Building | `games/croupier_corporate_building.html` | ✅ **reparado 2026-08-01** |
| 4 | City Sector | `games/raccoon_city_sector.html` | ✅ verificado |
| 5 | Planet | `games/raccoon_planet.html` | ✅ verificado 2026-08-01 |
| 6 | Space | `games/raccoon_space.html` | ✅ verificado |

## ¡Sobrevive! — no ser lo que se comen

| # | etapa | fichero | motor |
|---|---|---|---|
| 1 | Interaction Lab | `labs/croupier_interaction_lab.html` | `FoodChainSystem` — ratones, queso, zorros, raptores |
| 2 | Chopper Aquarium | `labs/croupier_chopper_aquarium.html` | `EcosystemSystem` — plancton, peces, tiburones |

Las dos estaban de etapas 2 y 3 de la saga de buscar, y **en ninguna se busca
nada**. Eran las que Oscar señalaba como laboratorios: el sitio donde se
prototipa comer y ser comido. Eso no es un desvío dentro de otra saga — es la
saga entera de ¡Sobrevive!, y le faltan etapas por delante y por detrás.

⚠️ `EcosystemSystem` usa `Math.random()` sin semilla, así que **hoy no puede
entrar en el banco**: sin semilla no hay recibo, y lo que no verifica no puntúa.
Es el primer arreglo pendiente de esta saga.

**Criterio de "funciona"**: carga sin errores, arranca al pulsar su botón, y
produce estado observable (marcador, posición, oleada…).

---

## Las tres etapas que ¡Busca! aún no tiene

El orden que las ordena de menor a mayor —cada una más difícil que la anterior—
pide nueve, y hay seis. Faltan, en su sitio:

| iría en | etapa | qué añadiría sobre la anterior |
|---|---|---|
| entre 1 y 2 | **habitación** | un solo cuarto: escondites sin navegación |
| entre 3 y 4 | **edificio (chopper)** | 18 plantas frente a las 6 del Corp Building |
| entre 3 y 4 | **distrito** | varios edificios: elegir a cuál entrar |

⚠️ Y la dificultad medida **no sube de forma monótona** con el orden actual: el
edificio es el más duro (24 sitios / 14 registros = **1,71** sitios por registro)
mientras el distrito da **0,60** y el planeta **0,64**, o sea presupuesto de
sobra. Antes de añadir etapas hay que recalibrar esos dos presupuestos, o la
saga tiene su pico en el medio.

---

## ✅ La etapa que se dio por perdida — y ya está en su sitio

> Este apartado decía **«la etapa que FALTA»** hasta el 2026-08-23, y para
> entonces llevaba tiempo hecha: es la etapa 2 de ¡Busca!,
> `games/raccoon_floor_search.html`, con los tres niveles del original. Un doc
> que dice «falta» cuando ya no falta hace buscar dos veces lo mismo. Se queda
> lo que pasó —abajo— porque explica **cómo** se perdió, que sigue valiendo.

Existió y se jugó. Está registrada en `lab_heritage.html`:

> **Chopper Search (Building Floors)** → `labs/croupier_scanner_lab.html`

Tenía **varios niveles**: uno con luz, otro sin luz, y otro sin luz **con un
predador**. Habitaciones con tele, neveras y ventanas.

**No se borró: se sobrescribió.** El fichero existe, pesa 1.946 bytes y su título
es `ALISA LAB — CabinetBSPPlugin` — alguien reutilizó el nombre para una prueba
del plugin BSP. En el backup del 3 de mayo **ya estaba así**, con el mismo tamaño
en las tres copias, así que se perdió antes y H: no lo alcanzó.

Por eso no salía en ninguna búsqueda de "falta un fichero": el fichero está, con
otro contenido dentro.

### Se rehízo sin programar casi nada

Todas las piezas sobrevivían, y la fábrica estaba **exactamente** con la forma
que hacía falta. Estado a 2026-08-23, ya con la etapa montada:

| lo que necesita | lo que ya existe | estado |
|---|---|---|
| planta con habitaciones | `ProceduralBuildingFactory` — construye "Room behind the hole" por puerta | ✅ |
| escondites buscables | expone `hidingSpots[]` por planta con `hasRaccoon` e `isSearched` | ✅ |
| tele, ventana, bombilla | `VolumetricsPlugin.createApplianceBeam('tv'\|'window'\|'bulb')` | ✅ **enchufadas** — la etapa las llama, y tres salas la bombilla |
| nevera | `createApplianceBeam('fridge')` | ✅ etapa + ascensor |
| el predador | `PhantomFSMSystem` — FSM de emboscada ligada a la luz | ✅ tiene su lab y su entorno de gym |
| niveles con/sin luz | `isLightsOut` + `currentStage` | ✅ |
| el sonido del interruptor | `SFX.play('toggle')` | ✅ **escrito 2026-08-23** — se pedía y el sonido no existía, así que la linterna era muda |
| mobiliario por habitación | `room_types.json` (9 tipos) + `blueprints.json` + semilla | ⚠️ sin usar |
| montarlo desde datos | `WorldBuilderSystem` entiende `appliance_beam` en manifiestos JSON | ⚠️ **ningún manifiesto lo declara** |

> *"Blueprints = Genotype. Room + seed = Phenotype."* — comentario en
> `AssetManager`. Una habitación es **un tipo más una semilla**: el mobiliario se
> genera, no se coloca.

**El juego entero podría ser un manifiesto JSON.** Sería, además, la mejor demo
posible del motor: un nivel completo sin una línea de código.

⚠️ Antes de montarlo: `AssetManager.loadRoomTypes()` y `loadBlueprints()` hacen
`fetch(basePath + …)` con `basePath = 'props/'` **relativo a la página**. Desde
`/games/` buscaría en `/games/props/`. Hay que pasarlos por `AssetResolver` o las
habitaciones saldrán vacías sin un solo error — la misma enfermedad que costó dos
horas en el edificio corporativo.

---

## ¡Busca! 3 — Corp Building: cinco fallos apilados

Estaba muerta. No uno: **cinco**, y ninguno daba un error que señalara la causa.

| fallo | efecto |
|---|---|
| import map `./js/alisa-engine/` | desde `/games/` resolvía a `/games/js/…` → 404 en **todos** los imports |
| `RLGymBridge` con 4 `.bind()` | métodos inexistentes; la excepción mataba el script entero |
| rutas de modelos relativas | sin mapache, sin fantasma, sin buscador |
| `AssetManager` como global | resto de cuando el motor eran scripts sueltos |
| **la fábrica devolvía el edificio huérfano** | 185 mallas construidas y **sin colgar de la escena** |

### El grande: `scene.add` saltado por una salida temprana

`ProceduralBuildingFactory.build()` tiene un `if (opts.buildCharacters === false)
return {...}` que devolvía el grupo **antes** del `this.scene.add()` del final.

Y `buildAll()` pasa `buildCharacters: c.characters ?? false`, así que **el camino
por defecto era ese**: quien llamara a la fábrica de la forma recomendada
construía el edificio entero y no veía nada, sin un solo error.

> Una función que construye algo y lo devuelve sin colgarlo es una trampa para
> todo el que la use. **Colgar es parte de construir.**

### Y uno de luz que ya estaba documentado

Las intensidades de esa fábrica (0.2–0.4) se calibraron para el modelo de luz de
three **anterior a r155**. Desde r155 son físicamente correctas y esos valores
son invisibles. Está en `ESTUDIO_ProceduralBuildingFactory.md §4`, con el arreglo
recomendado: un `lightScale`.

Estaba implementado **en `buildAll()`**… y la página llamaba a `build()` directo,
saltándoselo. Ahora pasa `lightScale: 20`.

### `flashDust`: dos variables con el mismo nombre

```js
let flashDust = this.flashDust;          // l.73  → local, null
window.flashDust = new THREE.Points();   // l.805 → OTRA variable
flashDust.position.set(...)              // l.806 → revienta
```

Al reventar se llevaba el resto de `build()`, incluido el `scene.add`.

---

## ¡Busca! 1 — Cabinet Escape: el `NaN` que no para

`randomizeCuts()` calculaba `this.sys.episodes + 1` con `episodes` sin
inicializar → `NaN`. Ese `NaN` llegaba a `fractalPartition` como profundidad, y
como **`depth >= NaN` es siempre falso**, la recursión no paraba nunca:
«Maximum call stack size exceeded», un error que no menciona ni episodios ni
cortes.

El mismo descuido estaba en `randomizeCabinetSize()`, y ahí el `NaN` se colaba en
la geometría: decenas de «Computed radius is NaN».

**Arreglado en las dos puntas**: el motor BSP ahora **valida** su parámetro y
lanza un error legible, y los dos métodos usan `(this.sys.episodes ?? 0) + 1`.

> `NaN` no es un número pequeño: es un número que **nunca cumple ninguna
> comparación**. Una recursión cuyo fondo depende de un parámetro tiene que
> comprobar ese parámetro.

---

## El patrón que se repite en todas las etapas

Tres veces en dos días, el mismo error de forma distinta:

| dónde | qué |
|---|---|
| Corporate Building | la página re-envolvía `RLGymBridge`, que ya se instala solo |
| Cabinet Escape | la página re-envolvía `enterCabinetMode`, que ya se instala solo |
| Asteroids | el HUD leía `engine.ship.userData`, que no existe |

**Cuando el motor ya publica algo en `window`, envolverlo es romperlo.** Son
restos de cuando cada juego era un monolito con variables de página.

Y todos comparten la misma trampa de diagnóstico: **una excepción temprana se
come el resto de la función, y el síntoma aparece lejos de la causa.** Por eso
"0 errores en consola" no basta — hay que comprobar también que el resultado
esté donde debe (¿tiene padre el grupo? ¿hay mallas en la escena?).
