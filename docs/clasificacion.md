# Clasificación

Generada por `tabla.mjs` el 2026-08-21.
15 semillas por juego, tope 200 decisiones.

**0,00** = tan bueno como elegir siempre la primera opción legal.
**1,00** = tan bueno como el rival de casa del juego.
Las dos referencias se miden en la misma tanda que los modelos.

Los modelos juegan 15 semillas por juego; las líneas base, 120.
Las base no cuestan tokens, así que el metro se mide con muchas más partidas
que lo que se mide con él. El ± es la incertidumbre real de cada fila.

El titular es la **mediana**: normalizar divide por el hueco entre suelo y techo,
así que un juego con hueco pequeño convierte una partida floja en un número enorme
y se lleva por delante el promedio. La media va al lado — cuando se separan mucho,
hay un juego mandando. Es por lo que los bancos de Atari publican mediana.

| participante | mediana | media | ± | forzadas | tokens | recibos verificados |
|---|---|---|---|---|---|---|
| primera (suelo) | **0.00** | 0.00 | ±0.04 | 0/0 | 0.0k | 3960/3960 |
| azar | **0.03** | 0.27 | ±0.09 | 0/0 | 0.0k | 3960/3960 |
| casa (techo blando) | **1.00** | 1.00 | ±0.03 | 0/0 | 0.0k | 3960/3960 |

Juegos que puntúan: ajedrez, go, reversi, damas, xiangqi, mancala, snake, fagocito, peaton, blackjack, poker, brisca, tute, hearts, spades, gofish, unit, entropy, flota, defensa, sigilo, frentes, relevo, cabina, rebano, pradera, nave, remigio, generala, oca, canadiense, domino, alisapolis.

Fuera de la media, y por qué:

- **guerra** — la casa no supera al suelo: la escala se invertiría
- **sokoban** — el tope de 200 decisiones corta la partida (sólo termina el 13% de las de referencia)
- **cripta** — el tope de 200 decisiones corta la partida (sólo termina el 0% de las de referencia)
- **parchis** — la casa no supera al suelo: la escala se invertiría
- **chinchon** — el hueco (1.2) no supera al ruido de la medida (±1.9)


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
