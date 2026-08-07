# Un lab público: enseñar el motor sin enseñar la casa

**Estado: diseñado, sin construir.** Decisión de Oscar el 2026-08-07.

## El problema, con números

`/lab` lista **116 cosas** porque las recoge del disco: todo lo que haya, sale.
Medido:

| categoría | nº |
|---|---|
| **colonia / interno** | **17** labs + **19** rooms |
| juegos / gym | 14 |
| física y vida artificial | 10 |
| motor y render | 10 |
| avatares y rigging | 9 |
| sin clasificar | 7 |

Más de un tercio no es escaparate: es el taller. `croupier_arista_self`,
`croupier_confessional`, `croupier_terminal`, `room_queen_office`,
`room_arachne_ingestion`… Eso no enseña de qué es capaz el motor; enseña cómo
vivimos.

## ⚠️ LA DECISIÓN QUE IMPORTA: SE DECLARA, NO SE FILTRA

La tentación es una lista de exclusiones. **Es la opción peligrosa**, y por una
razón que no es de gusto: con una lista negra, **cada página nueva es pública
hasta que alguien se acuerde de taparla**. El olvido publica.

Al revés, el olvido no hace nada. Cada página que quiera estar en el escaparate
lo dice en su propio HTML:

```html
<meta name="alisa-escaparate" content="motor/render">
<meta name="alisa-muestra"    content="Subdivisión procedural en tiempo real, sin un solo asset">
```

Y `gen_lab_index.py` construye el escaparate con lo que se declara. Por defecto,
privado.

Tres cosas se ganan a la vez:

1. **El defecto es seguro.** Un experimento interno nuevo no sale solo.
2. **No hay lista paralela.** La declaración vive en la página que describe. Es
   la misma ley que ha pagado todo el día: una cosa, un sitio. Una lista de
   exclusiones en otro fichero se separa del disco en cuanto alguien renombre
   algo — y se separa hacia el lado malo.
3. **`alisa-muestra` obliga a la pregunta correcta:** ¿qué capacidad demuestra
   esto? Si no se puede escribir esa frase, la página no pertenece al escaparate.
   El filtro de calidad sale gratis del propio formato.

## Cómo se organiza: por capacidad, no por carpeta

Al desconocido que llega no le dice nada «labs» ni «rooms». Le dice algo:

- **Juegos** — los 19, con su tabla de capacidades y las tres puertas
- **Gym y verificación** — la tesis: una partida se verifica volviéndola a jugar
- **Motor y render** — webgpu, LOD, procgen, voxel, cámara
- **Física y vida artificial** — boids, enjambres, katamari, depredador
- **Avatares y rigging** — esqueletos, caras, arquetipos
- **Factorías y plugins** — lo que se compone: `CroupierSystem`,
  `ArcadeTableRoomFactory`, `raton_tablero`, `asientos`

Las tres últimas categorías son justo lo que Oscar quería enseñar y hoy está
enterrado entre pruebas internas.

## Qué pasa con el `/lab` de ahora

Se queda como está, para nosotros. No se borra nada: se separa quién lo mira.

## ✅ CONSTRUIDO (2026-08-07): `gen_escaparate.py` → `/escaparate`

Funciona y está desplegado con **6 piezas**: `mesa`, `chess`, `go`, `reversi`,
`xiangqi`, `blackjack`. Sólo ésas porque son las que verifiqué jugando ese mismo
día — el resto se irá declarando conforme se compruebe. **Pocas y buenas.**

Se comprobó primero el fallo seguro: con nada declarado, el generador escribe un
escaparate VACÍO y lo dice. Ninguna página interna puede colarse por olvido,
porque el olvido aquí no publica nada.

Además del `<meta>`, el generador **excluye aunque se declare** cualquier página
con rastros de la casa: `127.0.0.1`, el puerto `8741`, `ALISA_HUB_URL`, rutas
`/colony/`, o menciones a `JobBoard`/`NEURO`/`KARMA`. Es una pregunta distinta de
la de `necesita_colonia()` en `gen_lab_index.py` —aquélla es «¿funciona sin la
colonia?», ésta es «¿es seguro publicarlo?»— y por eso vive aparte.

### Auditoría de las 67 tarjetas del lab (2026-08-07, en curso)

Triaje estático primero, para no abrir 67 a mano:

| | |
|---|---|
| con rastros de casa (excluidas aunque se declaren) | **10** — `terminal`, `vanilla_check`, `interaction_lab`, `avatar_integration_test`, `phantom_predator`, `digital_twin_test`, `scumm_overworld`, `verificacion_servidor`, `sin_hub`, `chopper_aquarium` |
| con recursos locales que no existen | **0** |
| que importan módulos del motor inexistentes | **0** |
| limpias y con cuerpo (≥6 KB) | **34** |

**Abiertas y vistas** hasta ahora:

- ✅ `math_boids_flock` — 400 boids en bandada, HUD propio. **Declarada.**
  (Nota: la cámara arranca algo metida en el suelo.)
- ⚠️ `katamari_swarm` — corre, pero para un desconocido es confuso: cucarachas
  flotando y «Chunks Consumed: 0», sin manera visible de mover la bola.
  **Funciona ≠ se entiende.** No entra sin contexto.
- ⚠️ `procgen_carver` — anuncia `CarverEnvironmentFactory` y la escena está
  VACÍA, sólo la rejilla. El módulo existe, así que es un esqueleto o le falta
  disparar algo.
- ✅ `chopper_aquarium` — pantalla de entrada con semilla, plantas y **modo
  «AI Agent»**. Prometedora, pero tiene rastros de casa: hay que limpiarla antes.

### ⚠️ EL HALLAZGO DE FONDO: DOS CONVENCIONES DE IMPORTMAP

Unas páginas mapean `@alisa-engine/` → `../js/alisa-engine/` y otras →
`../js/alisa-engine/src/`. Los dos funcionan; los imports de cada página encajan
con SU mapeo.

Es `board`/`tablero` otra vez, en otro sitio. Y esta vez hizo daño de verdad:
mi comprobador asumió un solo mapeo, marcó como rotas dos páginas sanas, **las
"arreglé" y las rompí** (`src/src/...`, 404 en cadena). Revertido y verificado.

Dos lecciones, y la segunda es la incómoda:
1. Dos formas de decir lo mismo acaban costando trabajo aunque las dos funcionen.
2. **Un detector equivocado es más peligroso que ningún detector**, porque
   invita a actuar. Antes de "arreglar" lo que un script señala, abrir la página.

## ¿Estamos cerca? Medido el 2026-08-07

**En herramientas, sí. En contenido, vamos por el 15 %.** Conviene no confundirlo.

```
declaradas en el escaparate ......  10
páginas de labs .................  69
páginas de arcade ...............  22
piezas del motor ................ 179   (40 se dibujan · 15 son gym)
```

O sea: **~90 páginas y ~55 piezas mostrables, y 10 declaradas.**

### Lo que YA está y no hay que volver a hacer

| pieza | qué resuelve |
|---|---|
| `gen_escaparate.py` | escaparate por declaración, con fallo seguro (vacío si nadie se declara) |
| `gen_motor_manifest.py` | la lista de 179 piezas, sacada del disco |
| `labs/catalogo.html` | importa las 179 y las clasifica preguntándoles |
| `labs/pieza.html?m=…` | arranca cualquier módulo por URL y **cuenta** qué encontró |
| ✅ `npm run empaquetar` | ahora regenera manifiesto y escaparate antes de empaquetar |

Ese último punto era el más peligroso de la lista: un generador que hay que
acordarse de lanzar acaba sin lanzarse, y el escaparate se queda viejo **sin un
solo error**.

### Lo que falta, y en qué orden

1. **Persistir la clasificación.** Hoy vive sólo en el navegador
   (`catalogo.html`), así que nada puede consumirla: ni el escaparate, ni una
   prueba, ni un diff entre semanas. Sin esto, el resto son pasos manuales.
2. **Declarar los 15 entornos de gym.** Son los más baratos: ya los cubren las
   pruebas, no hace falta abrirlos uno a uno para fiarse.
3. **Abrir las 40 que se dibujan.** Esto **no se puede automatizar**: que un
   módulo meta objetos en una escena no dice que se entienda al mirarlo — ver
   `katamari_swarm`, que funciona y no se entiende. Son 40 pestañas.
4. Matriz de géneros y grafo de piezas.
5. Enlazar el escaparate desde la portada.

### Lo que falta (lista original)

- ⬜ Que `npm run empaquetar` ejecute `gen_escaparate.py` (ahora hay que
  lanzarlo a mano, y un escaparate que no se regenera se queda viejo callando).
- ⬜ Declarar las categorías que están vacías: **motor/render**, **física**,
  **avatares**, **factorías**. Hay ~40 candidatas pero **cada una hay que
  abrirla y verla funcionar antes de declararla** — declarar sin comprobar es
  exactamente cómo el `/lab` acabó siendo un batiburrillo.
- ⬜ La prueba en `npm test`: ninguna pieza del escaparate puede necesitar la
  colonia. El detector ya está en el generador; falta que falle el build.
- ⬜ Enlazarlo desde la portada. Hoy sólo existe en `/escaparate`.

## Primer paso (original)

1. Añadir el `<meta>` a `gen_lab_index.py` y generar DOS páginas:
   `lab.html` (interna, como ahora) y `escaparate.html` (sólo lo declarado).
2. Declarar primero las que son obviamente escaparate y están terminadas.
   Empezar por pocas y buenas: un escaparate con seis cosas impecables vende más
   que uno con cuarenta a medias.
3. ⚠️ Y una prueba en `npm test`: que ninguna página del escaparate necesite la
   colonia. Ya existe el detector (`necesita_colonia()`); aquí pasa de ser
   informativo a ser un guardián.
