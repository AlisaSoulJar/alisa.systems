# Cómo enseñar el motor sin que parezca una carpeta de demos

Pregunta de Oscar, 2026-08-07: *«tenemos asteroids, bullet heaven, tableros,
cartas… la idea es enseñar que se pueden hacer todos los géneros con el motor, y
por otro lado lo que se puede hacer con los plugins, las factorías, los engines.
¿Cómo lo harías tú?»*

## ⚠️ EL ERROR QUE HAY QUE EVITAR: LA REJILLA DE DEMOS

Cuarenta capturas en una rejilla **no demuestran que haya un motor**. Demuestran
que hay cuarenta cosas. Y quien llega no puede distinguir *un motor* de
*cuarenta apaños*, que es justo la duda que hay que despejar.

Es el mismo error que enseñar diecinueve juegos sin decir que comparten
`rules/index.js`: la cantidad impresiona un segundo y no convence ninguno.

## LO QUE SÍ SE DEMUESTRA: LA COMPOSICIÓN

Y aquí hay un dato, no una intención. Contadas las importaciones de las 88
páginas:

| pieza | páginas | en qué géneros |
|---|---|---|
| `AlisaRenderCore` | **38** | todos |
| `AssetManager` | 5 | shmup · depredador · isométrico · arcade de cartas · voxel |
| `AlisaBloomEngine` | 4 | katamari · bandada · shmup · tráfico |
| `ScummInteractionPlugin` | 3 | aventura · gemelo digital · rosetta |
| `GymRecorder` | 3 | banco de pruebas · dos versiones de Corp Building |
| `GLTFModelPool` | 3 | avatar · cine · reparto |

**La misma pieza en géneros distintos.** Eso no se puede fingir con capturas, y
es exactamente la afirmación que un motor tiene que sostener.

## Tres pisos, en este orden

### 1. El gancho — cinco segundos, sin leer nada

Una sola cosa, jugable al instante. `marabunta` (bullet-heaven con oleadas: se
entiende sin instrucciones) o la `webgpu_anomalia` (WebGPU + TSL a ~52 fps, y se
explica sola en pantalla).

Una, no seis. Quien llega decide en cinco segundos si sigue.

### 2. La prueba que no tiene nadie más — un minuto

**Las tres puertas.** El mismo juego, jugado por ti, por una política y por un
modelo; y el recibo se vuelve a verificar delante de tus ojos.

⚠️ **Esto va ANTES que lo bonito, aunque apetezca al revés.** Demos preciosos en
three.js hay a miles y no distinguen a nadie. Lo que no tiene nadie es que una
persona, una FSM y un LLM jueguen la misma partida por la misma puerta y salga un
recibo que un desconocido puede re-simular. Ese es el argumento; el render es el
envoltorio.

### 3. La máquina, no la lista

El catálogo de piezas, navegable **en los dos sentidos**:

- desde una demo → «esto está hecho de `AlisaRenderCore` + `BoidsSystem` +
  `AlisaBloomEngine`», y cada nombre se pulsa;
- desde una pieza → «esto mueve estas cinco demos, en cuatro géneros», y cada
  demo se pulsa.

Eso convierte cuarenta páginas sueltas en **una máquina que se ve**. Y no se
escribe a mano: **se genera de los imports**, como la tabla de arriba. Una lista
de piezas escrita a mano se separaría del código en dos semanas.

## La matriz de géneros, con los huecos a la vista

| género | estado |
|---|---|
| tablero | 6 juegos 3D + reglas verificables |
| cartas | 10 juegos, 5 mesas 3D |
| bullet-heaven | `marabunta` — jugable |
| shmup | `math_orbital_shmup` — jugable |
| supervivencia | `asteroids_survival` |
| simulación de tráfico | `peaton_m30`, `IDMSystem` |
| ecosistema | `EcosystemSystem` — **sin demo que lo enseñe** |
| aventura / SCUMM | `ScummInteractionPlugin` — 3 páginas |
| construcción de mundos | `WorldBuilderSystem` — **sin demo** |

⚠️ **Los huecos se enseñan.** Una matriz honesta con casillas vacías convence más
que un muro de capturas, porque demuestra que sabemos dónde estamos. Y de paso es
el backlog: no hay que mantener dos documentos.

## La afirmación de «supremacía», en una frase comprobable

Nada de adjetivos. Algo así:

> 19 juegos · 3 puertas cada uno · cada partida re-verificable desde
> `{juego, semilla, jugadas}` · sin instalar nada, sin servidor propio, sin CDN.

Cada cláusula se puede comprobar en treinta segundos. Un adjetivo no.

## Lo que esto cambia sobre las 15 piezas huérfanas

En [`recuento_lab.md`](recuento_lab.md) salieron **15 módulos escritos y sin demo
que los enseñe**. Con este planteamiento dejan de ser «demos que faltan» y pasan
a ser **piezas sin ficha en el catálogo** — que es un problema más pequeño y
mejor definido.

El lanzador declarativo (que el módulo diga cómo se arranca, en vez de que la
página lo adivine) le da ficha a cada una **automáticamente**. Quince de golpe, y
sin quince lanzadores distintos.

## Por dónde empezaría yo

1. El **grafo de piezas** generado de los imports — es lo que convierte la
   colección en motor, y ya está medido.
2. El **lanzador declarativo**, que desbloquea las quince.
3. El **recorrido de las tres puertas** como pieza central del escaparate.
4. Y sólo entonces, llenar la matriz de géneros.

En ese orden porque cada paso hace más fácil el siguiente, y porque el primero
—el grafo— es el único que convierte lo que YA tenemos en un argumento.
