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
