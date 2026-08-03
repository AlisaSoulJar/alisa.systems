# El Patrón Dorado

> Coger lo mejor de cada cosa que ya tenemos y componer **una sola forma** de
> hacer un juego ALISA: ECS del motor + las tres puertas del gym.

No es un diseño nuevo. Es el destilado de lo que ya funciona, medido pieza a
pieza, con las piezas buenas nombradas y las que faltan señaladas.

---

## 1. El diagnóstico que lo ordena todo

Cuántos módulos del motor importan cada cimiento:

| pieza de `world/core` | importadores | |
|---|---:|---|
| `BaseEnvironmentFactory` | **20** | adoptada |
| `ProceduralTextureFactory` | 6 | a medias |
| `SeededRNG` | 4 | a medias |
| `DeterministicScope` | 3 | a medias |
| `ParticleEmitter` | 2 | casi nadie |
| `InstancedRenderPool` | **1** | **nadie** |
| `FlickerSystem` | **1** | **nadie** |

> ⚠️ **Corrección — `BaseSimulationSystem` NO es la base del System.**
> Yo la puse aquí como cimiento de la mitad de simular. Me equivoqué, y lo cazó
> el catálogo. Ese fichero **importa THREE, usa `AnimationMixer` y escribe en el
> DOM** (`document.createElement`, `logElement`): es un ayudante de animación de
> avatares, no una base headless. Solo la extienden dos ficheros del pipeline de
> avatares, y hace bien nadie más.
>
> Los systems headless de verdad — `RaccoonSpaceCore`, `FoodChainSystem`,
> `EcosystemSystem` — **no heredan de nada**. Y es lo correcto: un System no
> necesita una clase madre, necesita **no importar THREE**. Esa es toda la regla.
> Una base con DOM dentro habría contagiado la pantalla a la mitad limpia.

**La mitad de CONSTRUIR MUNDO está adoptada. La mitad de SIMULAR no.**

Cada juego monta su escenario con el motor y después se inventa sus reglas por
su cuenta, dentro del HTML. De ahí salen las dos cosas que llevamos viendo todo
el día:

- los monolitos **se ven bien** — porque las factories sí se usan;
- **ninguno es gym por defecto** — porque los systems no se usan.

El patrón dorado es cerrar esa segunda mitad.

---

## 2. La forma: cuatro piezas por juego

```
┌─ Factory ──────────┐   construye el mundo. Extiende BaseEnvironmentFactory.
│                    │   Solo geometría, materiales y luces. Sin reglas.
└────────┬───────────┘
         │
┌────────▼───────────┐   las reglas, SIN PANTALLA. Clase suelta, sin heredar.
│  System            │   `update(dt)` o `step(accion, dt)`. Nada de THREE aquí
└────────┬───────────┘   dentro. Corre en node, en un worker y en el navegador.
         │
┌────────▼───────────┐   las TRES PUERTAS. Extiende GymEnv.
│  Env               │   reset(seed) · step(accion) · getObservation()
│                    │   describe() · affordances() · stepVerb(verbo, args)
└────────┬───────────┘
         │
┌────────▼───────────┐   la puerta HUMANA. Visualizador + Entrada.js.
│  Visualizador      │   Traduce dedos a verbos. Nunca inventa una jugada:
└────────────────────┘   todo sale de las legales que da el Env.
```

**La regla que lo sostiene:** el System no sabe que existe una pantalla. Si para
saber qué pasa hay que renderizar, no es un benchmark — es una demo.

---

## 3. Lo mejor de cada cosa (y dónde está)

Destilado de los monolitos y del árbol del motor. Todo esto **ya existe**.

### Determinismo — el cimiento del benchmark
| | |
|---|---|
| `DeterministicScope.js` | sustituye `Math.random` solo dentro del tramo semillado |
| `mulberry32` | periodo 2³², solo enteros de 32 bits ⇒ idéntico entre máquinas |
| verificado | 4.000 comparaciones contra la copia de los plugins, **0 divergencias** |

⚠️ No arregla los transcendentales: `Math.sin/cos/pow` no están fijados bit a bit
por IEEE-754. Para validar partidas se auditan las **acciones**, no el estado
final exacto.

### Aspecto — las cuatro piezas construidas y sin usar
| pieza | qué da | adopción |
|---|---|---|
| `ProceduralTextureFactory` | texturas de canvas centralizadas | 6 |
| `ParticleEmitter` | sistema de partículas unificado | 2 |
| `InstancedRenderPool` | densidad de escena sin coste | **1** |
| `FlickerSystem` | animación de materiales (el parpadeo de la linterna) | **1** |

Los cuatro monolitos hacen esto **a mano y por separado**: 4 texturas de canvas
en Rue del Percebe, 8 en Corporate. Centralizarlo no es solo limpieza — es lo
que permite que un cambio de estilo se aplique a todos los juegos a la vez.

### Simulación — los motores headless que ya están escritos
| motor | qué es |
|---|---|
| `ChopperAquariumEngine` | ECS headless con energía, ecosistema, feromonas y RNG semillado |
| `BulletHeavenEngine` | oleadas, armas, enemigos — **y los jefes** |
| `AsteroidsSystem` | 5 oleadas con nombre, niebla por fase, rangos, power-ups |
| `FoodChainSystem` | cadena trófica con sigilo, olfato y resistencia |
| `EcosystemSystem` | biología headless con rejilla de feromonas O(1) |
| `TrafficSurvivalSystem` | supervivencia sobre motor IDM |
| `CorporateSeekerSystem` | el que te busca por el edificio |

### El puente dato → mundo
`ObservationRewardResolver.js` — clasifica un nodo y devuelve **arquetipo visual,
acciones y recompensas**, con `requiresConsent` por acción:

```js
{ roomArchetype: 'memory_archive',
  visualMotif:  'archive tower with crystal cabinets and search lamps',
  rewardIds:    ['memory_crystal', 'useful_tool'],
  actions:      [ makeAction('akasha.search_here', 'Search canon here',
                             'hub_route', false, '/do/akasha-search') ] }
```

Es **la misma forma que `affordances()`** del gym, resuelta desde los datos. El
puente que faltaba entre el ledger y las tres puertas.

⚠️ Vive solo en `Q:\alisa_project\alisa-engine` — un fork del motor parado el
4 de julio. Hay que traerlo al canónico (`public/js/alisa-engine`).

### Navegación — de los prototipos deprecados
`snes_navigator_v2.html` trae la paleta de los cuatro dominios ya resuelta:

| | |
|---|---|
| Genesis | `#ffd700` |
| Soma | `#ff6b6b` |
| Psyche | `#bf7fff` |
| World | `#3498db` |

No un color por dominio: un sistema completo (fondo en degradado, acento, nodo,
camino, resplandor, estrellas). Son los cuatro cuadrantes de la Tabla Esmeralda.

Lo deprecaron por *"HTML canvas performance < native Tkinter"*. **Ese motivo hoy
es falso**: no competimos contra Tkinter desde canvas 2D, vamos en WebGL con
motor propio. Se mató por un techo que ya no existe.

### Conexión — `ProtoHub`
Mismo contrato dentro del navegador (`/arcade/{juego}/state`, `/move`). El hub
de la colonia es una **mejora, no un requisito**. El `snes_navigator` ya lo hacía
sin nombre: pedía `/api/worlds` y, si no había, se generaba los dominios solo.

---

## 4. Dónde está cada juego respecto al patrón

| juego | Factory | System | Env (gym) | Humano |
|---|---|---|---|---|
| Chopper Aquarium | `AquariumEnvironmentFactory` | `ChopperAquariumEngine` | 2 runners | ✅ modo Human |
| Asteroids v3 | `AsteroidsFactory` | `AsteroidsSystem` | `AsteroidsEnv` | ❌ lo pilota `shipAI` |
| Cabinet Escape | `CabinetEnvironmentFactory` | `CabinetEscapeSystem` | `CabinetEscapeEnv` | ✅ |
| Rue del Percebe | `ProceduralBuildingFactory` | `CorporateSeekerSystem` | `RueDelPercebeEnv` | ✅ |
| Cucco Swarm | `CuccoEnvironmentFactory` | `CuccoGameSystem` | ✅ `CuccoSwarmEnv` | ✅ |
| Raccoon Space | `RaccoonEnvironmentFactory` | `RaccoonSpaceCore` | ✅ `RaccoonSpaceEnv` | ✅ |
| Raccoon city / planet | `RaccoonEnvironmentFactory` | ⚠️ no headless | ❌ | ✅ |

**Las cuatro columnas casi están.** Lo que falta son huecos concretos, no
arquitectura: dos Env por escribir y una entrada humana en el Asteroids.

---

## 5. El orden de trabajo

**Fase A — completar la forma** (no hay que inventar nada)
1. Traer `ObservationRewardResolver` del fork viejo al motor canónico.
2. Escribir los dos `Env` que faltan: Cucco Swarm y Raccoon.
3. Dar entrada humana al Asteroids — hoy solo lo juega su IA.
4. Encender las cuatro piezas de aspecto en los juegos que ya existen.

**Fase B — el salto** (lo que ni los monolitos tenían)
Bloom sobre los emisivos (16 en Rue, 24 en Corporate), instancing para densidad,
y audio, que se nota más ausente que el bloom. Graduable: si la máquina da, se
enciende.

> ⚠️ **Corrección — el bloom NO hay que escribirlo.** `soma/plugins/AlisaBloomEngine.js`
> existe y ya lo usan cinco labs (cucco, katamari, boids, peaton_m30, orbital_shmup).
> Lo que falta no es la pieza: es aplicarla a los juegos que aún no la encienden.
>
> Van tres veces que doy por ausente algo que estaba escrito — instancing,
> partículas y ahora el bloom. **El problema del motor no es que le falten
> piezas: es que no se sabe qué tiene.** Un catálogo de capacidades vale más
> que otra pieza nueva, y este documento es el principio de ese catálogo.

**El criterio de "listo"** no es que se parezca al monolito. Es que la partida se
pueda **volver a simular con la misma semilla y dé el mismo resultado**. Eso es
lo que la convierte en benchmark y no en demo.

---

## 4.bis — Determinista no basta: hay que CALIBRAR

`RaccoonSpaceEnv` pasó las tres puertas y el determinismo a la primera. Parecía
terminado. Entonces le puse dos pilotos:

| piloto | resultado |
|---|---|
| tonto (acelera y gira sin mirar) | pierde **8 de 8** |
| «voy al planeta sin escanear más cercano» | gana **8 de 8**, sobrándole combustible |

Un entorno que se resuelve con la primera idea que se te ocurre **no mide nada**:
no deja sitio por encima. Y no se ve en ninguna prueba de determinismo.

La calibración se hace midiendo, no a ojo. Barrido de 20 semillas contra el
piloto simple:

```
combustible   gana   planetas escaneados
       100    100%          3,5
        70     95%          3,5
        45     70%          3,0
     →  32     55%          2,5     zona útil
        26     45%          2,1
        20     35%          1,9
```

Con 32 solo alcanzas a escanear 2,5 de 6, así que **el orden en que los visitas
decide la partida** — el problema interesante — y el piloto simple gana solo la
mitad, así que hay margen para que uno mejor destaque.

> **La regla:** un entorno no está listo cuando es determinista. Está listo
> cuando una política tonta pierde, una razonable gana a veces, y queda techo.
> Hay que tener a mano las dos políticas para poder decirlo.

Esto vale para TODOS los entornos, y ninguno de los que ya existían está
calibrado. Es trabajo pendiente, y es lo que separa un benchmark de una demo
determinista.

---

## 6. Antes de tocar: cuál manda de cada familia

El barrido encontró duplicados por todas partes. Esto es lo canónico:

| familia | canónico | por qué |
|---|---|---|
| **el motor** | `public/js/alisa-engine/src` (183 js) | tiene `gym/` y `DeterministicScope`; el hermano `Q:\alisa_project\alisa-engine` (171 js) se paró el 4 de julio |
| Rue del Percebe | `legacy/corporate_building_legacy.html` (136 KB) | el mayor y el más completo |
| Chopper Aquarium | `legacy/aquarium_v3_legacy.html` (63 KB) | 5 copias idénticas repartidas; da igual cuál |
| Asteroids | `legacy/asteroids_v3_legacy.html` (42 KB) | 3 copias idénticas |
| Sala del Huevo | `rooms/room_tenshi_no_tamago.html` | las 7 cabinas ya apuntan a sitios reales |

Y hay carpetas `Recovered\Recovered\` dentro del proyecto vivo — copias de copias
de rescates que nadie consolidó. Es por lo que cada inventario daba una cifra
distinta.
