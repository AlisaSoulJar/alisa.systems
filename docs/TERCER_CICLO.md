# Tercer ciclo — de los monolitos al motor

> Coger todo lo que tenemos, buscar lo mejor de cada cosa, y con eso sacar algo
> nuevo. Aquí: sacar la jugabilidad, el diseño, los visuales y los efectos de
> los monolitos, y conseguir lo mismo **o mejor** con las factories y systems de
> alisa-engine.

La tesis a demostrar: *el motor puede hacer juegos más que aceptables, con los
gráficos y las mecánicas que hacen los AAA.*

---

## 1. Qué son los monolitos y dónde estaban

Cuatro juegos terminados, con todo dentro de un solo HTML. No estaban en el
proyecto: sobrevivían en el backup, en `World\Web\Recovered\` y en `OldBackups\`.

| monolito | tamaño | versión que había viva | |
|---|---|---|---|
| `corp_building_legacy` | 88.698 b | 7.760 b | **×11,4** |
| `corporate_building_legacy` | 136.521 b | 104.796 b | ×1,3 |
| `aquarium_v3_legacy` | 63.264 b | 15.442 b | **×4,1** |
| `asteroids_v3_legacy` | 42.284 b | — | solo existe el monolito |

Copiados a `public/legacy/` para poder estudiarlos. **No son para publicar**:
son la referencia.

### El fallo que los tenía mudos

`corp_building` se quedaba en «LOADING…» para siempre con un
`Cannot access 'totalFloors' before initialization`. La causa no estaba en la
línea del error: pedía **three 0.160 con `examples/js/`**, y three borró esa
carpeta en r148 — solo queda `examples/jsm/`. Los dos `<script>` daban 404,
`THREE.OrbitControls` no existía, y la excepción en la línea 138 abortaba el
bloque entero, dejando el `let` de la línea 161 sin inicializar. Apuntando a
r128 (la que usa el resto del arcade) el juego arranca entero y sin errores.

Vale la pena recordarlo: **el síntoma estaba 200 líneas por debajo de la causa.**

---

## 2. El ADN: qué técnicas usan de verdad

Medido sobre el código, no de memoria.

| técnica | rue | corporate | aquarium | asteroids |
|---|---|---|---|---|
| luces dinámicas | 6 | 9 | 6 | 1 |
| sombras | 13 | 17 | 10 | 4 |
| materiales PBR | 17 | 25 | 7 | 4 |
| **emisivos / neón** | **16** | **24** | 4 | **12** |
| transparencia / vidrio | 9 | 18 | 10 | 9 |
| texturas procedurales (canvas) | 4 | 8 | 2 | — |
| niebla / atmósfera | — | — | 2 | 2 |
| animación / tween | 4 | 9 | 7 | 4 |
| físicas / raycast | — | — | 14 | — |
| IA / FSM | 5 | 7 | 1 | 1 |
| gym / semilla | — | 8 | 10 | — |
| modelos GLB | 5 | 9 | 5 | 5 |

### El hallazgo que cambia el plan

| | monolitos | motor |
|---|---|---|
| post-proceso / bloom | **0** | `EffectComposer` ×2, `UnrealBloom` 0 |
| shaders propios | **0** | 0 |
| audio | **0** | 0 |
| instancing | 1 (aquarium) | 4 |

Los monolitos **no usan post-proceso, ni shaders propios, ni audio**. Todo su
aspecto sale de luces + emisivos + sombras + PBR + texturas de canvas.

Eso parte el trabajo en dos mitades muy distintas:

1. **La paridad es montaje, no investigación.** Todas las técnicas que usan los
   monolitos ya están en el motor. Portar no requiere inventar nada.
2. **El salto a "o mejor" está justo en lo que ninguno de los dos tiene.** Y es
   barato: bloom sobre los emisivos —que son 16 y 24 usos en los dos juegos de
   edificio— cambia el aspecto entero sin tocar una sola mecánica.

Ese es el margen del tercer ciclo, y es medible.

---

## 3. El mapa: cada monolito contra lo que ya tenemos

El motor trae **25 factories y 51 systems**. Casi todo el mueble está puesto.

### 13, Corp Building / Corporate Building
Sección de un edificio, plantas de colores, puertas, ascensor con indicadores,
azotea, linterna, registrar puertas, IA que caza por pisos.

| pieza | ya existe |
|---|---|
| generar el edificio | `ProceduralBuildingFactory` |
| ascensor | `ElevatorSystem` |
| el que busca | `CorporateSeekerSystem` |
| esconderse | `HidingSpotSystem` |
| navegación del agente | `NavMeshAgentSystem`, `LinearNavAgentSystem` |
| rótulos de neón | `NeonSignFactory` |
| gym | `corporate_seeker_gym.js` |

**Falta**: nada estructural. Es ensamblaje.

### Chopper Aquarium
Pez-helicóptero en un tanque, rascacielos procedural, escaneo por plantas,
batería, radar.

| pieza | ya existe |
|---|---|
| el tanque | `AquariumEnvironmentFactory` |
| el vuelo | `ChopperFlightFactory` |
| el juego | `ChopperAquariumEngine` |
| gym | `chopper_aquarium_gym.js`, `chopper_gym.js` |

**Falta**: nada. Es el que más cerca está.

### Asteroids v3
Campo de asteroides, nave, neón sobre fondo negro.

| pieza | ya existe |
|---|---|
| el campo | `AsteroidsFactory` |
| el juego | `AsteroidsEngine`, `AsteroidsSystem` |
| gym | `asteroids_gym.js` |

**Falta**: nada.

---

## 4. Plan

### Fase A — paridad (sin inventar nada)
Reconstruir cada monolito llamando a su factory y sus systems, con la referencia
al lado. El criterio de "listo" no es «se parece»: es que **la partida se pueda
volver a simular con la misma semilla y dé el mismo resultado**, que es lo que
lo convierte en benchmark y no solo en demo.

Orden por cercanía: **Aquarium → Asteroids → Corp Building → Corporate**.

### Fase B — el salto (lo que ni los monolitos tenían)
1. **Bloom sobre los emisivos.** El mayor cambio de aspecto por el menor
   esfuerzo. El motor ya toca `EffectComposer`; falta `UnrealBloomPass`.
2. **Instancing.** Ahora mismo 4 usos en todo el motor. Es lo que permite
   multiplicar la densidad de escena sin coste — más ventanas, más asteroides,
   más peces.
3. **Audio.** Cero en ambos lados. Un juego sin sonido se nota más que un juego
   sin bloom.
4. **Shaders propios.** El último escalón, y el único que sí es investigación.

Todo esto **graduable**: si la máquina del usuario da, se enciende; si no, se
apaga. La limitación gráfica pasa a ser una decisión, no un techo.

---

## 5. Lo que se arregló para poder llegar hasta aquí

Daño de la reorganización, todo verificado:

- **3 gym runners** con rutas fósiles (`../../../../../../alisa-engine/`) →
  **los 22 corren**.
- **`fsm_gym`** solo exportaba su función y no la llamaba nunca: `node fsm_gym.js`
  no imprimía nada y parecía sano. Al hacerlo ejecutable saltó que estaba escrito
  contra una API de `FSMSystem` que ya no existe. Reescrito sobre el primitivo
  real y verificado determinista.
- **3 módulos** usaban `AssetManager` como global de cuando el motor eran scripts
  sueltos. No rompe al cargar: rompe al ejecutar la línea. Por eso el Cabinet
  Escape arrancaba, pintaba el mueble y se quedaba sin mapache, sin serpiente y
  sin linterna. Queda `check_globales_huerfanos.py` vigilando.
- **6 sitios** pedían `bspEngine.mulberry32(...)`, un método que ya no existe.
  Atados al generador canónico, tras verificar **bit a bit** (4.000
  comparaciones, 0 divergencias) que la copia de los plugins y el canónico dan la
  misma secuencia. Dos mulberry32 distintos serían dos benchmarks distintos.
- **`package.json`** declara `"type": "module"`: sin eso node reparseaba cada
  runner y avisaba por consola en los 22.

Y recuperados del backup, porque no estaban en el proyecto: `croupier_cabinet_escape`,
`raccoon_city_sector`, `raccoon_planet`, `raccoon_space`,
`croupier_corporate_building` y `alisa_sim_sdk.js`.

---

## 6. El hall

`rooms/room_tenshi_no_tamago.html` — «La Sala del Huevo», *the Nexus of the
¡Busca! Matrioshka*. Una sala con máquinas recreativas: eliges cabina y te
mete en una simulación. Las siete etapas son la matrioska entera —

```
cabina → sala → edificio → ciudad → planeta → interestelar
```

— cada nivel contiene al anterior. Cinco de las siete apuntaban a `public/games/`,
que no existía; ya están las siete apuntando a sitios reales.

Es la portada: en vez de una página normal, la sala. Y la página normal, si se
quiere, dentro de un terminal de la propia sala.
