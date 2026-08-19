# Clasificación

Generada por `tabla.mjs` el 2026-08-19.
60 semillas por juego, tope 400 decisiones.

**0,00** = tan bueno como elegir siempre la primera opción legal.
**1,00** = tan bueno como el rival de casa del juego.
Las dos referencias se miden en la misma tanda que los modelos.

Los modelos juegan 60 semillas por juego; las líneas base, 200.
Las base no cuestan tokens, así que el metro se mide con muchas más partidas
que lo que se mide con él. El ± es la incertidumbre real de cada fila.

El titular es la **mediana**: normalizar divide por el hueco entre suelo y techo,
así que un juego con hueco pequeño convierte una partida floja en un número enorme
y se lleva por delante el promedio. La media va al lado — cuando se separan mucho,
hay un juego mandando. Es por lo que los bancos de Atari publican mediana.

| participante | mediana | media | ± | forzadas | tokens | recibos verificados |
|---|---|---|---|---|---|---|
| primera (suelo) | **0.00** | 0.00 | ±0.05 | 0/0 | 0.0k | 5362/6200 |
| azar | **0.01** | -0.36 | ±0.10 | 0/0 | 0.0k | 5367/6200 |
| casa (techo blando) | **1.00** | 1.00 | ±0.04 | 0/0 | 0.0k | 5375/6200 |

Juegos que puntúan: ajedrez, go, reversi, damas, xiangqi, mancala, snake, fagocito, peaton, blackjack, poker, brisca, tute, hearts, spades, gofish, entropy, sokoban, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebano, pradera, nave, generala, canadiense, domino.

Fuera de la media, y por qué:

- **guerra** — la casa no supera al suelo: la escala se invertiría
- **unit** — el hueco (10.9) no supera al ruido de la medida (±19.9)
- **remigio** — el hueco (10.5) no supera al ruido de la medida (±16.6)
- **parchis** — el hueco (37.1) no supera al ruido de la medida (±47.0)
- **oca** — el hueco (44.1) no supera al ruido de la medida (±108.9)
- **chinchon** — el hueco (3.1) no supera al ruido de la medida (±15.9)


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
