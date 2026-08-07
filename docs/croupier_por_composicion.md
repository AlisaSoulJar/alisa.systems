# La mesa de cartas 3D, por composición

**Estado: diseñado y NO construido.** Las piezas existen todas; falta el cable.

## La idea, en una frase

La mesa no juega: **lee el estado y pinta en consecuencia**. No sabe qué juego es,
ni cuántos jugadores hay, ni qué baraja se usa — lo pregunta.

Eso no es una preferencia estética. Es lo que hace que añadir el juego veinte no
le añada una línea a la mesa, y lo que ya se comprobó con `raton_tablero.js`:
mancala, cuyo vocabulario son índices de hoyo (`0`…`5`) y no coordenadas, entró
en el mismo módulo con `columnas: 6, filas: 1` y una función de tres palabras.
**Cuando el caso raro no necesita excepción, la abstracción estaba bien elegida.**

## Lo que ya existe (y no hay que escribir)

| pieza | dónde | qué hace |
|---|---|---|
| `SovereignCardEngine` | `arcade/js/` — 1.148 líneas | escena, bucle, y `onPointerDown/Move/Up`: arrastrar cartas con el ratón, con resplandor de selección |
| `CroupierSystem` | `alisa-engine/src/world/` — 115 líneas | `calculatePlayerHands(jugadores, cartas, layout, ocultas)` y `calculateCommunity(n, ocultas, desplazamiento)` |
| `ArcadeTableRoomFactory` | `alisa-engine/src/world/factories/` — 203 líneas | la sala con mesas, `sitAtTable()` / `standUp()` |
| `card_library.json` | `arcade/data/` | palos, rangos y `extends` — la baraja es DATO |
| `asientos.js` | `arcade/js/protohub/` | persona / `fsm:primera` / `fsm:azar` / `fsm:casa` / `llm` |
| las reglas | `arcade/js/protohub/rules/` | 10 juegos de cartas, con recibo verificable |

⚠️ **`CroupierSystem` no sabe de reglas, y eso es su virtud.** No reparte: dice
*dónde va cada carta*. La parte difícil —las disposiciones en abanico y arco, las
cartas tapadas, las comunitarias— ya está resuelta y es agnóstica al juego.

## ⚠️ CORRECCIÓN IMPORTANTE (2026-08-07): no está roto, está sin generalizar

Al abrirlo para cablearlo resultó que **`blackjack.html` ya funciona entero**:
mesa 3D, cartas con sus figuras de verdad, la del crupier boca arriba, HUD con el
marcador, cero errores en consola. Y `SovereignCardEngine` **ya tiene el backend
del ProtoHub** (paso 1 de abajo) desde antes.

O sea que el diagnóstico «el croupier está sin cablear» era demasiado pesimista.
Lo que pasa es otra cosa, y es más fácil: **la mesa 3D existe y sólo la usan cinco
páginas** —blackjack, poker, entropy, grimorio, usura— porque cada una está
escrita a mano. Los siete de bazas y deducción (brisca, tute, hearts, spades,
guerra, gofish, unit) no tienen página que la use.

El trabajo real es el mismo que se le hizo al motor de tablero el 2026-08-06:
generalizar lo que ya funciona para una y que sirva para las siete, con
`rules/index.js` mandando y `CroupierSystem` poniendo las cartas.

**Ya hecho de la lista de abajo:**
- ✅ el backend del ProtoHub (ya estaba)
- ✅ quitado el sondeo al hub de la colonia — arrastraba el defecto
  `127.0.0.1:8741` que ya se había corregido en el motor de tablero. Dos copias
  del mismo andamio y una se quedó atrás: la de siempre.

## Lo que falta: el cable

Es el mismo trabajo que se le hizo a `SovereignBoardEngine` el 2026-08-06, y en
el mismo orden:

1. **Backend del ProtoHub.** Hoy el motor de cartas no consulta `rules/index.js`.
   Copiar el patrón de `_iniciarBackend()`: reglas locales primero, hub sólo si
   `window.ALISA_HUB_URL` lo pide.

2. **Asientos.** Enchufar `protohub/asientos.js`. Con eso hereda de golpe
   personas + políticas + modelos, sin escribir nada nuevo, y `?asientos=`
   significa lo mismo que en los tableros y en `mesa.html`.

3. **Estado → geometría.** La traducción entera, que es corta:

   ```
   st.mano.length          →  calculatePlayerHands(...).propia
   st.manos_rivales        →  calculatePlayerHands(..., ocultas: true)
   st.baza / st.descarte   →  calculateCommunity(...)
   st.caja (entropy)       →  calculateCommunity(..., ocultas por carta)
   ```

   Los controles que la página ya tiene —jugadores, cartas, ocultas,
   comunitarias, layout— dejan de ser mandos manuales y **pasan a leerse del
   juego**. Siguen sirviendo para trastear, pero el defecto lo pone el estado.

4. **La baraja, por composición.** El juego declara su baraja en
   `card_library.json`; la mesa pide las texturas por `palo_rango` y no tiene
   ninguna lista de cartas escrita.

## Por qué esto vale la pena antes que otra cosa

Los siete juegos de cartas ya tienen reglas, entorno de gym, marcador, rival de
casa, asientos y recibo verificable. **Lo único que les falta es verse.** Y la
mesa funcional (`arcade/mesa.html`) seguirá siendo el respaldo accesible: la que
funciona sin WebGL y la que un lector de pantalla puede recorrer.

## Lo que NO hay que hacer

Escribir un visualizador por juego. Serían siete listas paralelas que se separan
en cuanto entre el octavo — exactamente lo que pasó con las seis páginas de
tablero, donde una copia (`checkers.html`) se quedó sin panel de agente y nadie
lo notó durante meses.
