# ¿Qué juegos caben en este motor?

Respuesta corta: **casi cualquier juego por turnos con acciones enumerables.**
Que es casi todo el tablero y casi toda la carta clásicos — pero no es «todo», y
saber dónde está el borde vale más que decir que no lo hay.

## La suposición que lo sostiene todo

**`legal_moves` tiene que ser una lista enumerable.**

Sobre eso descansa el proyecto entero, y conviene verlo junto:

- una persona no puede hacer una jugada ilegal, porque los botones SON la lista;
- un modelo tampoco, por la misma razón — no puede alucinar lo que no se le
  ofrece;
- el ratón no construye jugadas: propone un nombre y lo busca en la lista;
- el árbitro de la mesa compartida acepta o rechaza contra la lista;
- y el verificador re-simula la partida entera desde `{juego, semilla, jugadas}`.

Donde esa suposición aguanta, el juego entra sin tocar el motor. Donde se rompe,
se rompe todo a la vez, no un poco.

## Lo que entra hoy, sin tocar nada

Juego por turnos, discreto, con acciones enumerables y azar sembrado:

- **tablero de rejilla** — ajedrez, damas, go, reversi, xiangqi, mancala (los seis
  ya están). Y cualquier otro que sea rejilla: gomoku, otello, breakthrough,
  amazonas, tres en raya, dameo…
- **cartas** — bazas (brisca, tute, hearts, spades), descarte (unit), deducción
  (gofish), memoria (entropy), contra la casa (blackjack).
- **información oculta** — resuelto: `estado(p, asiento)` da la vista de cada
  silla. Cada jugador ve su mano y sólo el número de cartas de los demás.

## Lo que existe como DATO y no como código

`arcade/data/card_library.json` declara **25 juegos** (baraja, fases, reglas) y
**6 barajas** (`french_52`, `french_54`, `spanish_40`, `spanish_48`, `tarot_78`,
`unit_108`). Sólo 7 tienen módulo de reglas.

Sin módulo todavía, descontando los que ya existen con otro nombre (`go_fish`,
`war` y `texas_holdem` son nuestros `gofish`, `guerra` y `poker`):

```
mus · chinchón · gin_rummy · bridge_contract · crazy_eights · memory
klondike_solitaire · spider_solitaire · baccarat · old_maid · sevens
rummy_basic · canasta · omaha · five_card_draw
```

**La ficha ya está escrita.** Portar uno de estos no es diseñarlo: es leer lo que
la biblioteca ya dice y escribir el `mover`/`estado`.

## Dónde está el borde (y qué haría falta)

### 1. Jugadas simultáneas
El contrato tiene UN `st.turn`. Piedra-papel-tijera, el drafting de 7 Wonders,
las órdenes de Diplomacy — todos exigen que varios comprometan a la vez y se
revele después. **Falta:** una fase de compromiso/revelación en el árbitro. No es
imposible, pero cambia el contrato, no es configuración.

### 2. Acciones libres o combinatorias
Negociar, ofrecer un trueque cualquiera, pujar un número arbitrario. La lista de
legales o explota o no se puede enumerar. Un LLM lo haría de maravilla y es justo
donde el banco de pruebas dejaría de poder garantizar que no hizo trampas.
**Es el límite duro del diseño, no una tarea pendiente.**

### 3. Tableros que no son rejilla
Las REGLAS entran igual — al motor le da igual cómo se llame una casilla. Lo que
no entra es el ratón: `raton_tablero.js` es una rejilla. Hexágonos (Catan),
grafos (Ticket to Ride), los puntos y la barra del backgammon.
**Falta:** un hermano de `raton_tablero.js` para grafos. Es trabajo acotado, del
mismo tamaño que el que ya se hizo.

### 4. Tiempo real
`snake`, `fagocito` y `peaton` existen como entornos nativos, pero no son por
turnos y quedan fuera de la mesa compartida y del árbitro.

### 5. Parejas
Hay asientos, no equipos. Tute y spades se juegan por parejas en la vida real y
aquí el marcador es por silla. **Falta:** un concepto de bando en el marcador.

### 6. ⚠️ Dados y azar durante la partida
Entran, **pero con una regla que hay que escribir en piedra**: el azar tiene que
salir del generador sembrado, NUNCA de la jugada del jugador. Si una tirada entra
en el recibo como dato en vez de derivarse de la semilla, la partida deja de
re-simularse y el recibo no verifica. Backgammon es perfectamente portable con
esa disciplina, e imposible sin ella.

## En resumen

No es «cualquier juego». Es **cualquier juego por turnos cuyas jugadas se puedan
listar** — que resulta ser la inmensa mayoría de los clásicos, y exactamente la
familia donde un banco de pruebas puede garantizar que nadie hizo trampas.

Esa restricción no es una limitación que arrastramos: es la que hace que el
proyecto pueda prometer lo que promete.
