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
