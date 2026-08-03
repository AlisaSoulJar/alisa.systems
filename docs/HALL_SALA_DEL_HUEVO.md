# La Sala del Huevo — el hall de alisa.systems

## ESTADO (1 ago 2026, final de la tanda)

**`public/rooms/room_sala_del_huevo.html`** · arranca con `JUGAR.bat` o
`python servir.py`. Nombre decidido por Oscar: ni *El Andén* (mío) ni
*La Catedral* (el canon del paper fundacional).

| lo que hace | de dónde salió |
|---|---|
| se juega DENTRO: un cartucho que va de máquina en máquina | `room_arcade_hall.html` + `CSS3DHologramPlugin` (5 fallos suyos arreglados) |
| **los puntos salen de PARTIDAS VERIFICADAS**, no de pasear | `ProtoHub` (grabación nueva) + `Verificador.js` (ya existía) |
| máquinas y mesas de verdad | `Arcade Machine.glb`, `Table.glb`, `CRT Monitor.glb` de `props/` |
| tableros con sus piezas | `js/arcade_boards.js` — 6 tableros que llevaban meses sin usarse |
| baraja física de 52 cartas | `ArcadeTableRoomFactory` (extraída a estática) |
| radar que gira contigo | `RadarPlugin`, sacado de `games/raccoon_space.html` |
| cada máquina zumba al acercarte | `SpatialAudioPlugin` (su `loop` no funcionaba) |
| panel de destinos que canta lo que pasa | `SovereignTickerPlugin`, 0 importadores |
| las almas orbitando el huevo | `BoidsSystem` (su caja no encerraba en Y) |
| **la anomalía**: el espacio se dobla, y más cuanto más aportas | `AnomalyLensPlugin` — esto SÍ hubo que escribirlo |

**Lo que cuenta y lo que no:** la *aportación* mide cuánta sala has vuelto real
(explorar) y alimenta al huevo. Los *puntos* solo salen de partidas que se
pueden volver a jugar y dan lo mismo. Medido: pasear por 8 estaciones = **0
puntos**; 14 jugadas de blackjack = **+22, partida verificada**.

**Verificar en la máquina del jugador no demuestra honradez** —él manda en su
navegador—, demuestra que la traza es coherente y reproducible. La verificación
que da confianza es la del servidor, con el mismo fichero de reglas. Esto es el
ensayo; aquello será el estreno.

### La ficha de partida — la idea difícil, hecha visible
Al levantarte aparece abajo a la izquierda: **juego · semilla · jugadas · bytes**
y el sello VERIFICADA. Con dos botones: **copiar la partida** (son ~250 B de
JSON que se pueden volver a jugar) e **INTENTA FALSEARLA**, que prueba las
cuatro trampas delante del visitante y enseña el motivo de cada rechazo.

*Decir «esto no se puede falsear» es marketing; dejar que lo intente en un clic
y ver al verificador cazarlo es una prueba.* Y es honesto en las dos
direcciones: si algún día una trampa colara, ese botón lo enseñaría.

⚠️ Las trampas se prueban **al cobrar**, no al pulsar el botón: cuando te
levantas, el cartucho se desconecta y el iframe vuelve a `about:blank`, así que
el módulo de reglas —que vive en el contexto de ESE iframe— desaparece con él.
Guardarse una referencia sería guardar el fantasma de un contexto destruido.

### Qué se mide (1 ago 2026)
60 fps estables en los tres estados (llegada, anillo, 24 materializadas), peor
fotograma 18,8 ms. Cero errores de JS en el recorrido completo.

### Lo que hacen ahí fuera, y qué nos dice
Los sitios que ganan premios en 2026 van de **WebGPU + TSL** con repliegue a
WebGL, y sobre todo: *«eligen UNA idea difícil y la ejecutan limpia, en vez de
apilar efectos»*. Eso es una crítica directa a esta sala, que apila radar,
almas, teletipo, lente, vóxeles y audio. **Nuestra idea difícil es que los
juegos son de verdad y cada partida se puede volver a jugar** — nadie ahí fuera
tiene eso. Todo lo demás debe servir a eso o sobra.
### WebGPU y TSL: añadidos como POSIBILIDAD (no migración)
El motor sigue en WebGL. Lo que hay ahora es la puerta abierta y dos demos:

| pieza | qué es |
|---|---|
| `soma/RenderBackend.js` | `crearRenderer(THREE, {preferir})` — devuelve el renderer y **qué backend acabó usando**. `WebGPURenderer` se repliega solo a WebGL, así que pedirlo nunca deja a nadie fuera |
| `AlisaRenderCore` | acepta `{ renderer }` o `{ crearRenderer }`. Antes estaba clavado |
| `labs/croupier_webgpu_sonda.html` | la sonda mínima: ¿hay WebGPU? ¿compila TSL? |
| `labs/croupier_webgpu_anomalia.html` | **la demo de verdad**: nuestra lente de la anomalía portada a TSL, con post-proceso por nodos. WebGPU, ~55 fps, 0 errores |

Con eso, lo único que nos ataba a GLSL ya está portado y probado: **el camino
está abierto y medido, y no hemos tocado nada de lo que funciona.**

Dos APIs que costaron (preguntadas al objeto, no supuestas):
`pass(escena, cámara).getTextureNode()` y muestrear con **`.uv(coord)`** —
`.sample(...)` no existe y da 190 errores por fotograma. Y en r170 `three/tsl`
apunta al mismo fichero que `three/webgpu`.

| pieza | ¿enchufable? |
|---|---|
| el **backend** | ✅ Sí. `AlisaRenderCore` acepta ahora `{ renderer }` o `{ crearRenderer }`. Estaba clavado en `new THREE.WebGLRenderer(...)` — en el núcleo y en 5 sitios más, seis en total |
| el **post-proceso** | ❌ No. `EffectComposer` y `UnrealBloomPass` son de WebGL; en WebGPU la tubería es por nodos. Es otra tubería, no un parche |
| los **shaders GLSL** | ❌ No, hay que portarlos a TSL. De los nuestros solo hay **uno**: `AnomalyLensPlugin` |
| el **importmap** | ⚠️ `three` y `three/webgpu` son **builds distintos** y no se mezclan en la misma página: el salto se hace página a página |

Dato que costó encontrar: en r170 **`three/tsl` apunta al mismo fichero que
`three/webgpu`** (`build/three.webgpu.js`). El `three.tsl.js` suelto es posterior.

Ya tenemos three **0.170** instalado en `node_modules` (con `three.webgpu.js` y
`src/nodes/TSL.js`), aunque 142 páginas siguen pidiendo **0.160** por CDN y solo
2 van por 0.170.

### Las tres herramientas de recon (léelas antes de construir nada)
`atlas.py` (qué ES cada uno de los 9.003 ficheros) · `que_tenemos.py` (busca por
contenido en toda la unidad Q:) · `mapa_del_sitio.py` (carpetas y huérfanos).
Y el paso 0 sigue siendo `CUADERNO_ESTUDIO_MOTOR.md`.


> **No es una etapa del Raccoon Scape.** Es la **portada entera** de la web.
> Lo que hay construido hoy es el andamio, no el hall.

Fuentes (apuntes que ya existían, encontrados 2026-08-01):
- `Data/Memory/sovereign_conversations/7d316184-…/alisa_systems_v4_lobby_vision.md`
  — *"ALISA.SYSTEMS v4.0: The E3 Interactive Construct"*
- `Data/Lecciones/2026-04-14_crystal_tenshi_no_tamago_vision.md`
  — la Sala Blanca como *"Kickstarter Cuántico"*

---

## 1. El concepto: el lobby diegético

> *"Convertir la sala Tenshi no Tamago en la ÚNICA carta de presentación de
> alisa.systems. En lugar de navegar por menús HTML tradicionales, el usuario
> **cae** en un espacio monumental tridimensional (como en una demo del E3).*
> ***No hay links. No hay páginas 'Acerca de'. Todo es interactivo.***
> *Para interactuar con la IA, ver la economía o jugar, el usuario debe caminar
> hacia una estación y usarla."*

- **Huevo Monumental** en el centro, con su barra de incubación.
- **24 estaciones** en anillo piramidal de **70 m de radio**: arcades y mesas de
  casino.
- Cursor tipo mirilla (`ScummInteractionEngine`): al mirar al huevo sale
  *"EXAMINAR: Construcción Masiva de Datos. 12,5% Incubado"*; al mirar un arcade,
  *"USAR: Terminal Neurológica E3"*.

## 2. La web, dentro del mundo

El concepto maestro: **`CSS3DRenderer` en las pantallas de los arcades**. No son
decorativas — muestran la web de verdad, y al acercarte la cámara hace zoom y la
usas *dentro del 3D*:

| estación | qué muestra |
|---|---|
| Arcade 1 | `lab.html` (el dashboard) |
| Arcade 2 | terminal en vivo del JobBoard |
| Mesa de casino 1 | visor 2D de Akasha (la memoria) |
| Mesas | los juegos de tablero y cartas del arcade |

Así conviven las dos cosas que quiere Oscar: el hall 3D **y** la web en formato
tradicional, sin que una excluya a la otra.

## 2.bis 🎯 EL HALL YA ESTÁ CONSTRUIDO — bajo otro nombre

**`public/labs/croupier_phantom_predator.html`** (34 KB) **NO contiene el
predador.** Contiene la Sala del Huevo en versión FPS, y es el hall de estos
apuntes, hecho y funcionando:

| lo que pedían los apuntes | en ese fichero |
|---|---|
| Sala **Blanca** minimalista | ✅ |
| Huevo monumental + incubación | ✅ `INCUBATION: 12.5%` |
| 24 estaciones interactivas | ✅ **24 iframes vivos** |
| `CSS3DRenderer` sobre WebGL | ✅ con fondo transparente para ver la capa de debajo |
| Cursor FPS | ✅ WASD + ratón, *"click to enter the matrix"* |
| Economía diegética | ✅ `DUST MINED`, `WORLD JIT` |

Y el catálogo va separado tal como decían: **12 arcades** (juegos con motores
modulares) y **10+ mesas** (visualizaciones y labs). Verificado 2026-08-01: carga
con **cero errores**.

> ⚠️ **Aquí los ficheros mienten sobre lo que contienen.** Van tres:
> - `croupier_scanner_lab.html` decía ser un juego → era una prueba del plugin BSP
> - `RaccoonSpaceSystem.js` se declara *"Headless ECS engine"* → recibe objetos THREE
> - `croupier_phantom_predator.html` dice ser el predador → **es el hall**
>
> **Buscar SIEMPRE por contenido, nunca por nombre de fichero.** Dos días
> buscando este hall, y lo tuve abierto el primer día: lo descarté por su nombre.

### Consecuencia: hay TRES salas, y ya hay una canónica
| fichero | qué es |
|---|---|
| **`rooms/room_el_anden.html`** | ⭐ **LA CANÓNICA** (1 ago 2026): blanca, 24 estaciones, llegada por vóxeles, huevo con incubación, se juega dentro |
| `labs/croupier_phantom_predator.html` | el prior art del que sale: blanca, 24 iframes vivos |
| `rooms/room_tenshi_no_tamago.html` | la menor: negra, 8 cabinas que solo enlazan |

Las otras dos se quedan como referencia; **no renombrarlas**, que hay enlaces
del catálogo apuntando ahí.

### Cómo se juega (el patrón del cartucho)
De `room_arcade_hall.html`: **un solo `<iframe id="romCartridge">`** para toda
la sala, que se monta en la máquina donde te sientas y se desmonta al
levantarte. No 24 iframes vivos. Lo mueve `CSS3DHologramPlugin`, con tres
modos: en la máquina → proyectada hacia ti (clic) → pantalla completa (Enter);
ESC retrocede un escalón cada vez y el último te levanta.

⚠️ Cuatro fallos del plugin, arreglados el 1 de agosto de 2026 (estaban ahí
desde siempre porque **nadie lo había importado nunca**):
1. `cssObject.rotation.x = -0.15` giraba sobre el eje X del MUNDO → en máquinas
   giradas la pantalla salía **ladeada en diagonal**. Ahora `rotateX()`, local.
2. `CSS3DObject` se apropia del `<iframe>` y al sacarlo de la escena three lo
   **borra del DOM** → la segunda máquina no encendía nunca, en silencio.
   Ahora vuelve a su cajón.
3. `iframe.onload` se dispara más de una vez → montaba un `CSS3DObject` por
   disparo y solo soltaba el último; el huérfano dejaba la pantalla **flotando
   en la sala** al levantarte.
4. El cajón del cartucho era `display:none` → los juegos WebGL arrancaban con
   un lienzo de **0×0** y escupían cientos de `Framebuffer is incomplete`.
   Ahora está fuera de pantalla pero con su tamaño real.

### Dos cosas que en una sala BLANCA no son opinables
- **El bloom es condimento, no salsa.** Con fuerza 0.62 / radio 0.7, el halo del
  huevo lavaba el cuadro entero: la pantalla negra de un arcade se veía gris
  claro y un rojo puro salía rosa pálido. A **0.11 / 0.28 / umbral 1.12** la
  sala recupera sus negros. Se comprueba apagando el pase y comparando.
- **La mirilla y los rótulos necesitan halo blanco.** Son oscuros porque el
  fondo es blanco, pero al apuntar caen sobre la pantalla negra de la máquina
  y desaparecen justo cuando hacen falta.

### Piezas del motor enchufadas en El Andén (1 ago 2026)
Inventario medido, no recordado: **66 módulos sin un solo importador** (3,4 MB),
descontando `node_modules`. Enchufadas hasta ahora:

| pieza | qué hace en la sala | qué le faltaba |
|---|---|---|
| `CSS3DHologramPlugin` | el cartucho: jugar dentro | 5 fallos (arriba + el testigo de montaje) |
| `EntityCardSystem` | la ficha de inspección | traía DOM sin su CSS |
| `SovereignTickerPlugin` | el **panel de destinos** colgado | colores clavados, un lienzo por cara, `EventSource` sin red |
| `BoidsSystem` | las **almas** orbitando el huevo | la caja no encerraba en Y |
| `VolumetricsPlugin` | el haz cenital de King's Cross | — |

**El panel habla de verdad.** Si el hub de la colonia está levantado
(`:8741/terminal/logs/stream`), el teletipo muestra lo que pasa AHÍ FUERA;
si no, lo que pasa aquí dentro (estaciones resueltas, puntos). Conectarse es
una mejora, no un requisito — el mismo principio que el ProtoHub.
Lleva `filtro` porque el log crudo saca tracebacks, y lo primero que leía un
visitante era un `ERROR Exception`.

⚠️ **Los boids con `seek` a un punto fijo COLAPSAN** encima de él: medido,
radio medio 1,6 m con 90 almas clavadas en el eje. Y con el `maxForce` de
fábrica (0.09) se quedan a 0,1 m/s, porque cohesión y seek se anulan. La órbita
sale de perseguir un punto que gira — la persecución *es* la órbita.

### ⚠️ LO DE CARTAS YA ESTABA HECHO — mirar antes de construir
Oscar, 1 ago 2026: *«por no mirar lo que ya tenemos te buscas mas trabajo del
necesario»*. Existía, y es mucho más de lo que yo daba por hecho:

| pieza | qué es |
|---|---|
| `arcade/data/card_library.json` | **6 barajas y 25 juegos DECLARADOS**: zonas, fases, verbos, valores, `multi_deck`, `stand_on_17` |
| `arcade/engines/sovereign_card_rules.py` | 77 KB — `SovereignCardGame` (controlador universal que lee la biblioteca), `DeckFactory`, `CardVerbs`, `PokerHandEvaluator`, y motores de Blackjack, Brisca, Tute, Hearts, Spades, GoFish, Unit, Entropy, Guerra |
| `arcade/engines/alisa_gym_cards.py` | `CartasEnv` — el gym de cartas (`reset`/`step`/`affordances`) |
| `arcade/engines/bench_suite.py` | el banco con agentes de referencia y **la Guerra como control** (sin decisiones ⇒ todos DEBEN empatar) |

**9 juegos de cartas jugables en Python**, todos `reproducible=True` y
`sensible_a_semilla=True`. Lo que faltaba era solo el lado JS (navegador).

Herramienta para que no vuelva a pasar: **`python que_tenemos.py "<concepto>"`**
busca por contenido en JS/Python/HTML/JSON y lista las piezas por densidad.

### Blackjack: el primer juego de CARTAS jugable sin hub
Los de tablero ya se jugaban en local (ajedrez, go, damas, reversi, xiangqi,
mancala…); los de cartas enseñaban un tapete precioso y un `DISCONNECTED` rojo.
Ahora `arcade/js/protohub/rules/blackjack.js` + registro en `blackjack.html`,
mismo contrato que el resto.

Tres cosas que hacían falta y no eran obvias:
1. **Hueco del contrato**: `SovereignCardEngine.sendMove()` manda la jugada en
   `params.action`, y el ProtoHub solo leía `params.uci`. Contestaba "falta la
   jugada" aun teniendo las reglas delante. Los de cartas no podían jugar en
   local ni queriendo.
2. **No había botones.** Un humano no tenía forma de pedir carta ni plantarse:
   la partida solo podía moverla un agente por el endpoint. Ahora el HUD los
   genera desde `legal_moves`, así que nunca ofrece algo que las reglas
   rechacen.
3. **Las figuras J/Q/K estaban en disco** y se pedían en `/colony/arcade/…`,
   ruta anterior a la mudanza: 12 errores de red por partida y figuras
   dibujadas con el apaño procedural. Arregladas en 6 ficheros (póker,
   blackjack, grimorio, usura y dos más).

**Calibrado** (2.000 manos por política, mismas semillas):

| política | gana | pierde | empata |
|---|---|---|---|
| pedir siempre (tonta) | 15,4% | 83,3% | 1,3% |
| plantarse siempre | 38,3% | 56,0% | 5,8% |
| pedir con < 17 (razonable) | 38,6% | 50,6% | 10,8% |
| mirando la carta de la casa | **40,5%** | 49,8% | 9,8% |

Cumple la ley: la tonta pierde de calle, la razonable gana a veces, y **queda
techo** — mirar la carta descubierta de la casa ya saca 2 puntos. Determinista
por semilla (mulberry32) y la semilla va DENTRO del estado, así que cualquier
partida es reproducible después de jugarla.

### Otro rastro de la recuperación del backup: texto codificado dos veces
`ALISA â€” Corporate Building`. UTF-8 válido, `<meta charset>` correcto, ningún
error: solo texto roto, en el título de un juego, durante meses. Reparados 4
ficheros / 465 tramos (`scratchpad/reparar_mojibake.py`, con control positivo).
Los ficheros son una MEZCLA de texto sano y roto, así que hay que reparar tramo
a tramo: la vuelta con el fichero entero falla y te dice "0 encontrados".

### Las máquinas miran hacia AFUERA
Contra lo que decía el comentario original (`lookAt` al huevo, que además
solo acertaba en una de las 24). Apareces fuera del anillo: si miran al huevo,
lo primero que ve un visitante son traseros. Mirando afuera ve pantallas — y al
sentarse le queda **el huevo encendido justo detrás de su partida**.

## 3. ⚠️ La discrepancia: debe ser BLANCA

Los apuntes dicen:

> *"Entorno **blanco minimalista** (`ambient light` intenso), un .GLB de un huevo
> gigante, unas máquinas arcade funcionales y mesas de cartas, todo sirviendo
> como Lobby cognitivo y minero de Dust."*

**Lo construido hoy es negro**: fondo oscuro, huevo apagado, 8 cabinas. No es un
fallo, es una versión mínima que se quedó a medias mientras la visión seguía en
el documento. Al retomarlo: **la Sala Blanca es lo canónico.**

## 4. Las piezas ya están escritas (y sin enchufar)

El patrón de siempre. Del catálogo del motor:

| pieza | tamaño | importadores |
|---|---|---|
| `CSS3DHologramPlugin` | 17.013 b | **0** |
| `ArcadeRoomManager` — multi-cabina "MMO-ready" | 19.282 b | 0 (sí desde HTML) |
| `ArcadeTableRoomFactory` — mesa de cartas con zoom al sentarse | 8.106 b | 0 |
| `ArcadeDojoFactory` — sala de cabina con luz día/noche/neón | 6.373 b | 0 |
| `SovereignTickerPlugin` — ticker 3D tipo bolsa | 3.274 b | **0** |
| `ScummInteractionEngine` — el cursor de verbos | 3.382 b | 1 |
| `BoidsSystem` — las almas / mente enjambre | 6.485 b | 1 |
| `CinematicPipelinePlugin` | 8.092 b | solo el barril |

**No hay que construir el hall: hay que ensamblarlo.**

## 5. Otros conceptos de los apuntes, para no perderlos

- **Patrón Atribucionismo CSS3D** — al interactuar con un asset externo
  (Poly Pizza, CC-BY), el FSM invoca un panel flotante dando crédito al autor.
  *Responsabilidad y homenaje automático.*
- **Renderizado JIT Cuántico** — los entornos existen solo como parámetros JSON
  ligeros; cuando la cámara los mira, se generan bajo demanda. Encaja con el
  paradigma substrato/render que ya tenemos.
- **Termodinámica gamificada (VRAM budget)** — si el usuario sobrecarga su
  entorno, el motor no revienta: degrada el LOD a vóxeles e invoca yokais de
  latencia. *Su VRAM, su problema.*
- **La anomalía** — buscada con `anomal|agujero negro|black.?hole|singularidad|
  lensing|accretion|vortex|wormhole|rift`. **No hay implementación de render**;
  lo que sale son usos de seguridad (detección de anomalías por Motoko) y textos
  doctrinales. Pero apareció el concepto, y es mejor que un shader:

  > *"El usuario no es el 'padre que da órdenes', es la **anomalía
  > termodinámica** que inyecta CAOS, intención y propósito."*
  > — `Raw_Lore_Harvest.md`

  **La anomalía es el usuario al entrar.** Encaja con el lobby diegético: "caer"
  en la Sala Blanca *es* el evento. Si algún día se hace el efecto visual, que
  sea eso — la llegada del visitante distorsionando el espacio— y no un agujero
  negro decorativo.

## 6. Por dónde empezar cuando se retome

1. **`ArcadeRoomManager` + `CSS3DRenderer`** — es lo que convierte 8 cabinas
   decorativas en 24 estaciones donde de verdad se juega y se lee la web.
2. Pasar la sala a **blanca** con `ambient light` intenso, según los apuntes.
3. `ScummInteractionEngine` para el cursor de verbos.
4. Las mesas de cartas y tablero con `ArcadeTableRoomFactory`.

⚠️ Recordar la trampa de siempre: comprobar que lo que devuelven las factories
**acaba colgado de la escena**. Ver `ESTADO_STAGES_RACCOON.md`.
