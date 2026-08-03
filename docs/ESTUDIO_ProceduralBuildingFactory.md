# 📐 ESTUDIO — `ProceduralBuildingFactory` (756 líneas)
*Aris, 2026-07-28. Encargo de Oscar: «tómate el tiempo que necesites para estudiarlo primero».*
*Escrito DESPUÉS de intentar integrarla a ciegas y fallar tres veces. Esta es la lección.*

---

## 0. Por qué este documento

Intenté usar esta fábrica sin leerla. Resultado: tres rondas de parcheo, un encuadre imposible
y una escena negra. **El fallo no fue técnico, fue de método**: asumí que su modelo de mundo
era como el mío (plantas de 3 m, 15 de ancho, luces del pipeline). No lo es.

---

## 1. EL MODELO DE MUNDO (lo que hay que respetar)

```
FL_H            = 5.0    altura de planta
CORRIDOR_W      = 28     ancho del edificio
CORRIDOR_DEPTH  = 5.0    profundidad del PASILLO (donde se camina)
BUILDING_DEPTH  = 30.0   profundidad TOTAL (el pasillo + las habitaciones detrás)
bCenterZ        = -12.5  centro de masa en Z  (= -BUILDING_DEPTH/2 + CORRIDOR_DEPTH/2)
buildingGroup.position.y = -totalH/2 + FL_H/2   → CENTRADO EN EL ORIGEN
```

**Consecuencia para la cámara:** el edificio es **28 ancho × (5·N) alto × 30 de fondo**,
centrado en (0,0,-12.5). Con 9 plantas: 45 de alto, de y=-22 a y=+22.
La acción está en el **pasillo, a z≈0**, y hay que mirarlo **de frente desde +Z**,
no en diagonal desde lejos. *(Mi error: cámara en (22,6,52) mirando a (0,10,0).)*

---

## 2. ⭐ EL PATRÓN "ACUARIO" — la idea buena del diseño

No es un edificio de cajas. Es un **pasillo con AGUJEROS en la pared del fondo**, y detrás
de cada agujero hay una habitación-caja renderizada con `side: THREE.BackSide` — se ve
*dentro*, como un diorama o un acuario. De ahí que el fondo sea 30 y el pasillo solo 5.

```js
holes.push({ x, w, type })        // se ordenan por X y se levanta la pared A TROZOS
   → muro antes del agujero  +  dintel encima  +  "acuario" detrás
```

**Tipos de agujero, cada uno con su geometría, color y luz:**

| type | habitación | color luz | dónde |
|---|---|---|---|
| `door` | 3.6 × 4.0 | `0xaaccff` frío | plantas habitables |
| `stairs` / `up` | estrecha, verde `0x224433` | — | todas |
| `boiler_hall` | se extiende hasta el borde | **`0xff4422` rojo** | Planta Baja |
| `machine_red` | 2.0 × 3.5, negra | **`0xff2211`** | Sótano |
| `machine_green` | ídem | **`0x11ffaa`** | Sótano |
| `machine_archive` | ídem | **`0xffcc77`** | Sótano |

Los portales abiertos (no puertas) reciben además una **rebanada volumétrica** con
`AdditiveBlending` y opacidad 0.1 → el haz de luz que sale del hueco.
Los cuartos oscuros marcan `wTop.userData.broomWall = true` para **transparencia dinámica**.

---

## 3. LA NOMENCLATURA DE PLANTAS

```
f = 0            → "S"   Sótano  (¡LABERINTO de 3 salas de máquinas!)
f = 1            → "PB"  Planta Baja (con boiler_hall)
f = 2..N-1       →  número
f = totalFloors  → "AZ"  Caseta de Azotea (con aire acondicionado y trastos)
```
Etiquetas en placa naranja sobre negro (`#ff9500` / `#111`), vía `ProceduralTextureFactory.labelPlate`.

**Ojo:** el bucle es `f <= totalFloors`, así que **pedir 8 plantas construye 9 grupos**
(la azotea es una más). Por eso `fab.floors.length === 9` cuando pasé `env.floors = 8`.

---

## 4. 🔴 EL BUG DE ILUMINACIÓN (la causa de la escena negra)

```js
const fLight = new THREE.PointLight(0xffddaa, 0.4, this.FL_H * 3.5);   // ← 0.4
const aqLight = new THREE.PointLight(lColor, isDoor ? 0.2 : 0.4, 2.0, 2.0);
```

Esas intensidades (**0.2 – 0.4**) están calibradas para el modelo de luz **ANTIGUO** de
Three.js (pre-r155, `renderer.useLegacyLights = true`). Desde r155 las luces son
**físicamente correctas**: una `PointLight` de intensidad 0.4 con alcance 17 m es
**prácticamente invisible**, y con `decay = 2.0` explícito, aún menos.

**No era mi cámara ni la niebla: era esto.** Dos arreglos posibles:
- **A)** escalar las intensidades de la fábrica (~×15-25 para point lights) — toca la fábrica
- **B)** que el lab suba `renderer.toneMappingExposure` y añada relleno — parche externo

→ **Recomiendo A**, con un parámetro `opts.lightScale = 1` para no romper a quien ya la use.
Es el mismo tipo de deuda que `numItems`/`elevator`: **código escrito para otro contexto**.

---

## 5. LO QUE DEVUELVE / EXPONE

```js
fab.floors[f] = { group, baseY, doors, hidingSpots,
                  stairX, elevX, elevDoorX, switchX, edoorL, edoorR, edoorW, indicator }
fab.floorLights[f]        // PointLight por planta
fab.floorLightTimers[f]   // isLightsOut ? 0 : 9999
fab.batteryPickups[]      // pilas (modo terror)
fab.elevator = { cabin, fridgeLight, y, currentFloor, doorTimer }   ← reparado hoy
fab.buildingGroup
```
`hidingSpots[]` y `doors[]` traen `{ x, label, mesh, isSearched, hasRaccoon, originalColor }`
— **el mismo contrato que `HidingSpotComponent`**. La integración con el ECS es directa.

---

## 6. REPARACIONES APLICADAS HOY

| Bug | Causa | Arreglo |
|---|---|---|
| `numItems is not defined` | asignada sin declarar | `let numItems = 0` |
| `elevator is not defined` (9 usos) | **global del monolito** huérfana | `this.elevator = {…}` |
| 7 globales más | `seekerModel`, `flashLight`, `volumetricBeam`, `flashDust`, `gamePhase`, `cinematicPhase`, `cinematicTimer` | locales con `opts` |
| bloque de personajes acoplado | acosador + linterna dentro del `build()` | `opts.buildCharacters = false` |

**Conclusión: esta fábrica nunca se había ejecutado desde su extracción del monolito.**

---

## 7. PLAN DE INTEGRACIÓN CORRECTO (para la próxima sesión)

1. **Escalar las luces** con `opts.lightScale` (defecto 1, el lab pide ~20).
2. **Cámara de fachada**: frente al pasillo, `(0, 0, 45)` → `target (0, 0, 0)`, FOV ~50.
   Nada de diagonales lejanas: el patrón acuario **se lee de frente**.
3. **`totalFloors = env.floors - 1`** para que salgan N grupos, no N+1.
4. **Mapear ECS ↔ fábrica** por `floors[f].doors` y `floors[f].hidingSpots` (contrato compatible).
5. **No añadir luces del pipeline**: la fábrica trae su propio esquema (práctica + acuarios
   + volumétricos). Solo tonemapping y bloom.
6. Verificar la **azotea** y el **sótano-laberinto**, que son lo más bonito y lo que menos se ve.

---
## 8. ⭐ HALLAZGO MAYOR — EL CONTRATO DECLARADO PERO NO ADOPTADO

*(Al estudiar las 26, no solo esta.)*

`BaseEnvironmentFactory` (177 líneas) define el contrato que deberían compartir todas:

```js
constructor(scene, engine)        // engine = AlisaRenderCore
createFloor(config)               // suelo paramétrico + grid
createDustField(config)           // polvo volumétrico (auto-registra VolumetricsPlugin)
applyLightingPreset(preset)       // ⭐ RIG DE LUZ DECLARATIVO (ambient/hemi/fog/fills/spots)
buildAll()                        // ← ABSTRACTO: "must be overridden by subclass"
update(dt)                        // tick del FlickerSystem
```

**Banco de pruebas (`labs/croupier_factory_smoketest.html`, ejecuta las 25 de golpe):**

> **14 factories extienden la clase base y NINGUNA implementa `buildAll()`.**
> Todas lanzan *"BaseEnvironmentFactory.buildAll() must be overridden by subclass"*.

En su lugar cada una expone métodos propios y distintos:
`AsteroidsFactory` → `loadAssets` + `buildArenaGrid` + `createShipVisual` + `syncGrid`…
`ProceduralBuildingFactory` → un `build(9 args)` que ni siquiera usa la clase base.

**Consecuencia directa para el plan de Oscar** («una vez lo conozca, los ports serán minutos»):
👉 **hoy NO pueden serlo**, porque cada port hay que descubrirlo leyendo la factory.
👉 **La palanca es implementar `buildAll()` en cada una**, delegando a sus métodos existentes
   (~5-10 líneas cada una, trabajo mecánico). Con eso:
   - un lab se escribe igual para cualquier entorno: `new X(scene, app).buildAll(); app.startLoop(dt => x.update(dt))`
   - el banco de pruebas pasa a verde y detecta regresiones
   - **ahí sí, los 8 ports son minutos**

**Segundo hallazgo:** `applyLightingPreset()` ya es un rig de luz **por datos**. Las factories
con luces en unidades legacy (10 de 25) son justamente las que **NO lo usan** y encienden luces
a mano. Migrarlas al preset arregla la iluminación y la uniformiza a la vez.

**Estado real de las 25 (no "rotas", sino sin punto de entrada uniforme):**
| | |
|---|---|
| ✅ construyen hoy | 1 (`KatamariFactory`) |
| ⚠️ sin `buildAll()` implementado | 14 |
| ⚠️ API propia sin `build*` reconocible | 8 |
| ❌ peta al instanciar | 1 (`ArcadeDojoFactory`: `null.spotLight`) |

---

## 9. LA LECCIÓN (para mí)

> Leí 3 fragmentos y asumí el resto. La fábrica tenía **otro modelo de mundo, otro patrón
> de render y otras unidades de luz**. Ninguna de las tres cosas se ve en un fragmento.
>
> **Antes de integrar código ajeno: leer su modelo de mundo entero.**
> Es la misma lección que la factory duplicada de esta mañana — *comprobar antes de asumir* —
> y me ha costado dos veces el mismo día.
