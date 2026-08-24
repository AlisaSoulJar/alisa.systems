# El sustrato: una matriz plana que se pinta, no un render que decide

Oscar, 2026-08-07: *«toda la idea de este motor es que el 3D es sólo un ledger
visual: sólo pintamos lo que en realidad es una matriz plana. Por eso pueden
jugar FSM, LLM y humanos o agentes con visión.»*

Eso es la arquitectura. **No es la implementación.** Medido hoy:

| codificación | juegos |
|---|---|
| `fen: string` | ajedrez · reversi · damas · xiangqi |
| `board`: matriz 19×19 | go |
| `board`: lista de 14 | mancala |
| listas de `{x,y}` | snake · fagocito · peaton |
| listas de cartas | los 10 de cartas |
| nada | guerra · entropy |

**Cinco codificaciones para la misma idea.**

## ⚠️ Y esto explica TODO lo que llevamos encontrado

Cada renderizador tuvo que inventarse cómo leer el estado. O sea que **cada
renderizador se convirtió en un nervio en vez de ser un espectador** — lo
contrario de la tesis. Consecuencias, todas medidas esta semana:

- `syncGoState` leía el tablero de **dos formas distintas en la misma función**:
  `state.board` para el minimapa (funcionaba) y `Array.isArray(state)` para el
  3D (nunca). Las piedras no se dibujaron durante meses.
- `board` contra `tablero` dejó a go **sin describir** para los LLM: 362 jugadas
  legales y ni una piedra en el texto.
- El descriptor necesita un caso especial por familia (bazas, gofish, entropy,
  espaciales…) en vez de uno solo.
- Diecinueve juegos y **catorce visualizadores a medida**, cada uno con su bug.
- El lanzador genérico tiene que ADIVINAR la API de cada pieza.

Ninguno de esos fallos es un descuido. Todos son el mismo fallo estructural: **no
hay un sustrato, hay diecinueve.**

## La corrección: un contrato, tres proyecciones

Un solo `sustrato(p)` que todo juego publica, y del que se derivan **todas** las
puertas:

```js
sustrato(p) → {
  rejilla: { ancho, alto, celdas },   // el terreno: lo que no se mueve
  piezas:  [{ x, y, t, de, oculta }], // lo que sí se mueve
  zonas:   [{ id, de, items, ocultas }], // manos, mazos, descartes
  leyenda: { t: 'nombre legible' },
}
```

Tres estructuras porque hay tres cosas y no más: **terreno, piezas y montones.**
Un juego de cartas es zonas sin rejilla. Go es rejilla sin zonas. Fagocito es
rejilla + piezas. Brisca es zonas + una pieza por carta en la baza.

Y entonces, escritos **una vez**:

| consumidor | qué hace con el sustrato |
|---|---|
| renderizador 2D | pinta rejilla y piezas en un canvas |
| renderizador 3D | lo mismo, con altura — *el ledger visual* |
| `describirEstado` | lo cuenta en palabras, sin casos especiales |
| observación del gym | lo aplana a números |
| verificador | ni lo mira: re-simula desde las jugadas |

**Añadir un género pasa a ser publicar un sustrato**, no escribir un visualizador.
Ahí es donde la afirmación «se pueden hacer todos los géneros» deja de depender
de cuánto arte tengamos.

## ⚠️ Cómo llegar sin reescribir los diecinueve el primer día

Un adaptador. `sustratoDe(juego, st)` que **derive** el sustrato de lo que cada
juego ya publica: FEN → rejilla; `board` matriz → rejilla; `board` de 14 → zonas;
listas `{x,y}` → piezas; manos → zonas.

Eso da los renderizadores universales **hoy**, sin tocar una regla. Y después,
cada juego que quiera puede publicar su `sustrato()` nativo y el adaptador deja
de aplicarse a él.

Es el mismo camino que ya funcionó dos veces esta semana: `montarMesa` y
`montarEscena` no reescribieron las páginas, las absorbieron.

⚠️ Con una disciplina, o volvemos al punto de partida: **el adaptador es
temporal y tiene que doler**. Una prueba que liste cuántos juegos siguen
dependiendo de él, y que ese número sólo pueda bajar. Si no, en seis meses hay
veinte juegos y el adaptador tendrá veinte casos especiales — que es exactamente
la situación de hoy con otro nombre.

## Lo que esto cambia del plan de géneros

En [`si_acabara_de_llegar.md`](si_acabara_de_llegar.md) proponía ocho géneros y un
renderizador 2D universal. Con el sustrato encima, el orden se aclara:

1. **El contrato `sustrato()`** y su adaptador. Es la pieza que multiplica.
2. **El renderizador 2D universal**, que lo lee. Una vez, para siempre.
3. **`describirEstado` derivado del sustrato**, y se acaban los casos especiales.
4. **Sokoban** como primer género nativo: nace publicando sustrato, sin adaptador.
   Prueba el camino entero en un día.
5. Los otros géneros, con la materia prima que ya existe (`TurretCombatSystem`,
   `CorporateSeekerSystem`, `BSPSystem`, `IDMSystem`, `FoodChainSystem`).
6. El 3D como una proyección más — **la última**, y opcional.

## La frase que resume el motor, ahora que se puede decir sin mentir

> El estado es una matriz plana. Todo lo demás —el 3D, el texto que lee un
> modelo, los números que lee una política, el recibo que verifica un
> desconocido— son proyecciones de esa matriz. Por eso los tres pueden jugar la
> misma partida, y por eso la partida se puede comprobar sin fiarse de nadie.

Hoy esa frase es una intención. Con el sustrato pasa a ser una descripción.


---

## 2026-08-23 — «Le doy a voltear y no pasa nada», y era verdad en la pantalla

`guerra` no tenía sustrato. Medido con la semilla del aviso, cada pulsación
mueve el estado entero:

```
mazo_restante   52 → 50 → 48 → 46
ultima_ronda    ["H_2","D_Q"] → ["C_A","D_2"] → ["H_K","C_8"]
ganadas         [0,2] → [2,2] → [4,2]
```

Y el sustrato salía `rejilla: null`, cero piezas, cero zonas. El árbitro
impecable, la pantalla sin nada que dibujar. Tercera vez en el mismo día con esa
forma, y segunda con esta causa exacta: `mancala` estaba igual por la mañana.

Ahora publica seis montones —`mazo`, `choque`×2, `bote`, `ganadas`×2— y la deuda
del adaptador baja de 16 a 15.

### La mesa es un reflejo, no un sitio

Al escribirlo salieron **54 cartas de 52**. Las dos de más eran las del choque:
`mover()` las manda a `bote` y de ahí a `ganadas` en el mismo movimiento, y
`ultima` sólo las recuerda para poder enseñarlas. Enseñarlas está bien; contarlas
otra vez, no. De ahí `reflejo: true`, y una comprobación nueva en
`prueba_sustrato.mjs`: **quien publique `cartas_en_juego` tiene que dibujar esas
cartas y no otras**. Dos de más en un montón boca abajo no las nota nadie a ojo.

### El buzón ahora juega la jugada antes de opinar

`veredicto.mjs` sólo sabía dos respuestas para «no pasa nada» —la jugada existía,
o la partida estaba atascada— y las dos hablan del árbitro. Falta la tercera, que
es la que más se repite: **la jugada existe, el árbitro mueve, y no se ve.**
`movioLaPantalla()` la contesta jugando de verdad y comparando el sustrato.

⚠️ Y su primera versión acusó a **seis juegos sanos**, porque probaba la PRIMERA
jugada legal: la de `defensa` es `pasar`, la de `relevo` es `esperar`, la de
`shinigami` es `senalar`. Jugadas que por definición no mueven el tablero. Ahora
prueba todas y pregunta lo que pregunta quien pulsa: *¿hay alguna jugada que se
vea?* Los dos casos están en `prueba_veredicto.mjs` — sin ellos la comprobación
aprobaba con el cable cortado, y lo dijo `prueba_de_las_pruebas.mjs`.

### Los cinco que siguen sin acusar recibo

Con el instrumento ya arreglado, quedan cinco juegos donde **ninguna** jugada de
apertura cambia el dibujo:

| juego | primeras legales | qué pasa |
|---|---|---|
| `spades` | `apostar:0…13` | se apuesta y la mesa no lo enseña |
| `shinigami` | `senalar:b…h` | se señala y no se marca lo señalado |
| `cabina` | `di:arriba…` | se dice una dirección y no se ve dicha |
| `frentes` | — | sin comprobar a mano |
| `nave` | — | sin comprobar a mano |

Los tres primeros comparten forma: **la jugada es una declaración, y el sustrato
no tiene sitio para declaraciones**. No es el fallo de `guerra` —ahí no había
nada— pero es el mismo síntoma para quien pulsa. Los dos últimos no se han
mirado, y se dice.


---

## 2026-08-23 (tarde) — La quinta estructura: `dichos`

Salió de medir, no de pensar. `veredicto.movioLaPantalla` buscó juegos donde
**ninguna** jugada de apertura cambia el dibujo, y quedaban cinco. Tres tenían la
misma forma:

| juego | jugadas de apertura | qué pasaba |
|---|---|---|
| `spades` | `apostar:0…13` (las 14) | se apuesta y la mesa no lo enseña |
| `shinigami` | `senalar:b…h` | señalas y **tu propia** pantalla no lo recuerda |
| `cabina` | `di:arriba…` | hablar es la ÚNICA jugada de la guía, y no se veía |

Y al mirarlos aparecieron los otros dos, que no eran otra cosa: `frentes` elige
un frente en secreto y `nave` es simultánea entera —`mover()` guarda en
`p.oculta` y no aplica nada hasta que eligen todos—. En los dos, pulsabas y la
pantalla se quedaba idéntica.

### El argumento, que es el mismo que el de `asientos`

No se admite por elegancia. **Cinco juegos la inventaron por separado**, cada uno
con su nombre, y ninguno podía decírselo al motor:

```
spades      p.apuestas[]            un número por asiento
gofish      p.preguntas[]           {de, a, rango, acierta}
cabina      p.mensaje + p.dichos    la última orden, y un contador
shinigami   p.dichos[] + p.oculta{} lo dicho en alto, y lo elegido a solas
nave        p.dichos[] + p.oculta{} igual, y ya lo llamaba «dichos»
```

Un `dicho` no es ninguna de las otras cuatro: no es terreno, no se mueve, no es
un montón que alguien tiene, y no es un sitio que contiene. **Las otras cuatro
contestan DÓNDE; ésta contesta QUIÉN DIJO QUÉ SOBRE QUIÉN.** Tiene origen y
destinatario y no tiene posición.

```
{ de, a, que, valor, texto, sobre, vigente }
```

### La niebla, que aquí no es un detalle

`p.oculta` de shinigami tiene la elección nocturna de los ocho. Publicarla sería
regalar la partida en la primera noche —y seguiría puntuando, y la tabla diría
que los aldeanos juegan buenísimo—. Se publica sólo la de quien mira.

⚠️ **Y la primera comprobación de eso aprobó con el cable cortado.** Miraba el
`de` del dicho, y un dicho filtrado sigue diciendo ser tuyo: lo que se escapa es
el CONTENIDO. La pregunta buena no es «¿de quién dice ser?» sino **«¿cambia lo
que yo veo cuando otro elige distinto?»**. Dos partidas con la misma semilla en
las que sólo cambia la primera elección, y se compara la vista de la segunda
silla. Eso salió de aplicar el sabotaje, no de pensar más.

### Cuatro caminos para el mismo dato, y el aviso ya estaba escrito

`dichos` hubo que engancharlo en **cuatro** sitios: `obtenerSustrato`,
`ProtoHub.sustrato`, el worker de salas y las dos mesas. Los cuatro tienen la
misma bifurcación —sustrato propio contra adaptador— copiada. El comentario del
worker lo decía de la vez anterior: *«aprendida, escrita, y aplicada a la
mitad»*. Mientras sean cuatro copias, cada dato nuevo hay que ponerlo cuatro
veces y alguien se olvidará.

### Dos agujeros que aparecieron de paso

- **El describidor no enseñaba `asientos`.** Mancala publica sus catorce hoyos
  ahí, y el mapa de texto salía `........` sin una sola semilla: **un modelo
  sentado en mancala no podía ver el tablero.** Sin error, claro — con un jugador
  que elige al azar y una tabla que dice que juega mal.
- **`pintar2d` no tenía color de texto secundario.** Usé el gris de los dorsos de
  carta y las líneas salían invisibles. Medido: da **1,63:1** sobre el fondo, y
  hasta `neutro` se queda en 3,21 — los dos por debajo del 4,5:1 que pide un
  texto. Un color pensado para un rectángulo relleno no sirve para letra pequeña.

### El resultado

**De 40 juegos, cero** en los que ninguna jugada de apertura cambie el dibujo.
Eran cinco esta mañana y seis contando `guerra`.


---

## 2026-08-23 (noche) — Lo que no distingue tampoco puntua

El banco comprobaba que sus entornos son **repetibles**: misma semilla, mismo
resultado. Esa es la mitad del contrato — *lo que no verifica, no puntua* — y la
otra mitad no la miraba nadie:

> **Un entorno que le da la misma nota a tres politicas distintas es
> perfectamente verificable y no sirve para comparar a nadie.**

Sale en verde en todas las comprobaciones que habia, publica su recibo, entra en
la tabla, y la tabla no significa nada porque la nota no depende de lo que
hiciste. Verde y sin significar nada, que es el modo de fallo de la casa.

Medido sobre los 46 del catalogo: **siete no separan**.

| entorno | notas | motivo |
|---|---|---|
| `RaccoonSpace` | 0, 0, 0 en 150 pasos | cero recompensa con 7 opciones por paso |
| `ChopperAquarium` | 0, 0, 0 en 150 pasos | cero recompensa con 9 opciones por paso |
| `snake` | 0, 0, 0 en 21 pasos | solo premia comer, y dando vueltas no se come |
| `relevo` | -156 las tres | la recompensa es un castigo por paso |
| `oca` | 250 las tres | los dados mandan, las jugadas son forzadas |
| `guerra` | 28 las tres | juego de CONTROL: no hay nada que decidir ✅ |
| `sokoban` | 100 en **un** paso | la semilla 1234 da un nivel trivial |

Los dos ultimos tienen defensa. `sokoban` no: medido sobre 200 semillas, **el
14% se resuelven de una sola jugada**, y la del banco es una de ellas.

### La prueba tenia trampa propia, y me comio cuatro intentos

«Las tres sacan lo mismo» solo significa algo si de verdad **jugaron distinto**.
Cuatro veces seguidas no lo hacian, por cuatro motivos, y las cuatro el resultado
parecia un hallazgo:

1. `ciclo`/`primera`/`ultima` son la misma politica si hay una sola opcion.
2. Mandar `opcion.verb` a secas junta los ocho cajones de CabinetEscape en uno:
   lo que los distingue vive en `args.cajon`. **`check_gym_envs.mjs` tiene
   este mismo fallo en su linea 77.**
3. ⚠️ Mandar la **opcion entera** es peor: no da error y **no hace nada**. Medido
   en oca — doce pasos, cero recompensa, el mismo `tirar` una y otra vez,
   mientras `action` da 220. **La llamada mas natural para quien lee
   `affordances()` es la que se ignora en silencio.**
4. Y mi traza guardaba `args`, vacio en muchos entornos: entonces todas las
   jugadas parecian la misma y salia «no hay eleccion que hacer» para entornos
   con siete opciones por paso.

Por eso `prueba_senal.mjs` publica cuantas trazas distintas hubo. Si son una,
el instrumento no puede opinar y lo dice, en vez de acusar.



---

## 2026-08-24 — Correccion: los siete entornos acusados estaban sanos

La seccion de arriba decia que siete entornos no podian puntuar a nadie. **Seis
de los siete si podian**, y el septimo -`guerra`- no separa porque no tiene nada
que decidir, que es su razon de ser.

Fuimos a arreglarlos y lo primero fue medir de que estaba hecha su recompensa.
Aparecio esto:

| entorno | mis tres sondas | con politica competente |
|---|---|---|
| `snake` | 0 | **100** |
| `relevo` | -156 | **287** |
| `oca` | 250 | **1520** |

Las tres sondas -recorrer en ciclo, siempre la primera, siempre la ultima- son
**tres formas de jugar igual de mal**. Que tres jugadores pesimos empaten no dice
nada del examen.

Y los otros tres cayeron por dos causas mas, cada una mia:

- **`ChopperAquarium`**: declara `horizon: 3000` y yo lo medi en 150 pasos. En
  el suyo separa (15 contra 40). El horizonte estaba escrito en `meta.horizon`
  por quien hizo el entorno, y la prueba lo ignoraba.
- **`RaccoonSpace`**: toda su recompensa esta detras de NAVEGAR hasta un planeta
  -`escanear` solo se ofrece con uno al alcance- y ninguna politica ciega llega.
  Un piloto que apunta saca **-40** contra los -100 de las ciegas. Problema
  dificil, no entorno roto, y la diferencia importa.
- **`sokoban`**: no hay generador que reparta basura. Hay **ocho niveles escritos
  a mano** y el primero es `#@$.#`, un tutorial de una jugada. La semilla 1234 cae
  en el. Uno de ocho es 12,5%; las 200 semillas que medi daban 14%. **Cuadraba, y
  lei el numero como un defecto en vez de como la lista de niveles funcionando.**

### Lo que quedo en su sitio

`prueba_senal.mjs` mide ahora con el **horizonte que declara cada entorno**, con
**siete politicas** -tres estructurales, tres de azar sembrado y un bandido que
aprende que verbo paga- y, si sale plano, **con cuatro semillas** en vez de una.

**45 de 46 separan.** La lista de excepciones tiene un solo nombre.

> Sexta y septima vez en dos dias que el instrumento era el sospechoso. La
> version anterior de esta prueba habria hecho que se "arreglaran" cinco
> entornos que funcionaban — y eso es peor que no tener prueba.

