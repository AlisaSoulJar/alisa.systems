# Clasificación

Generada por `tabla.mjs` el 2026-08-17.
15 semillas por juego, tope 400 decisiones.

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
| primera (suelo) | **0.00** | 0.00 | ±0.04 | 0/0 | 0.0k | 2807/3240 |
| azar | **0.03** | -0.65 | ±0.13 | 0/0 | 0.0k | 2800/3240 |
| casa (techo blando) | **1.00** | 1.00 | ±0.05 | 0/0 | 0.0k | 2816/3240 |

Juegos que puntúan: ajedrez, reversi, damas, xiangqi, mancala, peaton, blackjack, poker, brisca, tute, hearts, spades, gofish, entropy, sokoban, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebano, pradera, nave, generala, canadiense.

Fuera de la media, y por qué:

- **go** — el tope de 400 decisiones corta la partida
- **snake** — el tope de 400 decisiones corta la partida
- **fagocito** — el tope de 400 decisiones corta la partida
- **guerra** — la casa no supera al suelo: la escala se invertiría
- **unit** — el hueco (19.3) no supera al ruido de la medida (±26.3)
- **remigio** — el hueco (10.4) no supera al ruido de la medida (±21.3)
- **parchis** — el hueco (59.0) no supera al ruido de la medida (±60.7)
- **oca** — el hueco (78.9) no supera al ruido de la medida (±140.4)


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
