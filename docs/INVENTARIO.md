# Qué tenemos ya — y cómo mirarlo antes de construir

## 0. ANTES DE NADA: `CUADERNO_ESTUDIO_MOTOR.md`
85 KB, en ESTA misma carpeta. Es el estudio del motor hecho el 31/07/2026 y ya
contiene, entre otras, estas secciones:

- `1.ter` — **entornos de gym que ya existen (sin saberlo)**
- `4.bis` — las 25 factories clasificadas
- `4.septies` — **el arcade de cartas y tablero: no se perdió NADA** (inventario
  completo de `sovereign_card_rules.py` y `card_library.json`)
- `4.octies` — el ProtoHub
- `5` — lecciones de método, cuya nº 1 es *«comprobar antes de asumir: escribí
  una factory que ya existía, 144 líneas duplicando 869»*

El 1 de agosto volví a escribir a mano reglas de cartas que ese cuaderno ya
inventariaba. **Leer el cuaderno es el paso 0 de cualquier tanda**; ninguna
herramienta de las de abajo sustituye a las notas propias.

## 0.bis La frontera, medida (1 ago 2026)
De todo `Q:\alisa_project\alisa` (182.208 ficheros de código, 4,6 GB) había
barrido **1.566 ficheros / 7,6 MB: el 0,9 % de los ficheros y el 0,2 % de los
bytes**, todo dentro de `alisa-systems/public/`. Decir «ya lo he visto todo»
después de mirar el 0,9 % es el error que hay que evitar.

Fuera de esa carpeta y en el carril de render/juegos hay **106 ficheros** con
señales de three.js/canvas/gym sin abrir, entre ellos:
`alisa/World/ML/` (`universal_env.py` con frogger/arena/aquarium,
`cabinet_env.py`, `train_cabinet.py`), `alisa/Data/RecoveryCandidates/` (21
ficheros: copias de los juegos), `alisa/World/Web/` y la copia congelada del
motor en `alisa_project/alisa-engine` (verificado: **no tiene nada que el vivo
no tenga**, solo artefactos de compilación).


> Oscar, 1 ago 2026: *«por no mirar lo que ya tenemos te buscas mas trabajo del necesario»*.
> Tenía razón dos veces el mismo día. Esto es el remedio, en comandos.

## Las tres herramientas

| comando | responde a |
|---|---|
| `python que_tenemos.py "<concepto>"` | *¿existe algo sobre X?* — busca por CONTENIDO en JS/Python/HTML/JSON, ordena por densidad y enseña las clases y funciones de cada fichero |
| `python mapa_del_sitio.py` | *¿qué carpetas hay y cuáles no he abierto nunca?* |
| `python mapa_del_sitio.py --sueltos` | *¿qué pesa más de 6 KB y no lo nombra NADIE?* → **69 ficheros** |
| `python inventario_piezas.py` | módulos del motor y cuántos los importan → **66 huérfanos, 3,4 MB** |

⚠️ `inventario_piezas.py` solo mira `js/alisa-engine/src/`. Ese punto ciego es
justo el que me hizo escribir reglas de cartas a mano teniendo
`arcade/engines/` al lado. **Un inventario con un punto ciego da la falsa
sensación de haber mirado**; por eso existe `mapa_del_sitio.py`.

## Hallazgos del primer barrido (1 ago 2026)

### `arcade/engines/` — la carpeta que nunca había abierto
- `sovereign_card_rules.py` (77 KB) — `SovereignCardGame`, controlador
  universal que lee `card_library.json`; `DeckFactory`, `CardVerbs`,
  `PokerHandEvaluator` y motores de 10 juegos.
- `alisa_gym_cards.py` — `CartasEnv`, el gym de cartas.
- `bench_suite.py` — banco con agentes de referencia y **la Guerra como
  control** (sin decisiones ⇒ todos deben empatar). 9 juegos, todos
  reproducibles y sensibles a la semilla.
- `data/card_library.json` — 6 barajas, **25 juegos declarados**.

### `js/sfx.js` — 36 KB, 66 efectos, CERO usuarios
Motor de sonido procedural entero (Web Audio, sin un solo `.wav`): `jump`,
`land`, `splash`, `predator_alert`, `door_open`, `level_complete`,
`autoWireUI`, más `music.start()` y radio. Y `games/` **no tenía ni una línea
de audio**: los 24 juegos, mudos.
Enchufado ya en `games/raccoon_floor_search.html` (verificado contando
osciladores creados y arrancados en el WebAudio del navegador: 0 antes de
jugar, 4 después). **Los demás juegos siguen mudos.**

### `js/alisa-engine/src/tests/test_engines.js` — 51 KB muertos desde la mudanza
Banco de pruebas de 22 motores que no arrancaba: importaba nombres planos
anteriores a la reorganización (`../BoidsEngine.js`). Reescritos los 22 imports
y renombrados 20 símbolos (`BSPEngine`→`BSPSystem`…). **Ahora corre**: Boids,
BSP e IDM (con sus tres sub-suites) pasan; en Katamari choca con otra deriva de
API (`processCollisions` ya no existe).

⚠️ **Falso amigo detectado**: `FSMEngine` → `FSMSystem` NO es el mismo motor
renombrado. El viejo era una FSM de depredador; el nuevo es una máquina de
estados genérica con blackboard. Esa prueba se salta con nota, no se «arregla».
El renombrado mecánico acierta casi siempre y por eso hay que revisarlo.

## Sin abrir todavía
`js/gym_runners/` (22 ficheros), `generators/`, `data/lab_card_manifest.json`
(174 KB), `soma/ProceduralRigging.js` (70 KB, extractor de topología + IK),
`js/legacy_hex/renderer_hex_legacy.js` (102 KB, isométrico SCUMM 2.5D).
