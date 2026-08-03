# Clasificación

Generada por `tabla.mjs` el 2026-08-03.
15 semillas por juego, tope 200 decisiones.

**0,00** = tan bueno como elegir siempre la primera opción legal.
**1,00** = tan bueno como el rival de casa del juego.
Las dos referencias se miden en la misma tanda que los modelos.

Los modelos juegan 15 semillas por juego; las líneas base, 120.
Las base no cuestan tokens, así que el metro se mide con muchas más partidas
que lo que se mide con él. El ± es la incertidumbre real de cada fila.

| participante | media | ± | forzadas | tokens | recibos verificados |
|---|---|---|---|---|---|
| primera (suelo) | 0.00 | ±0.22 | 0/0 | 0.0k | 720/720 |
| azar | 0.19 | ±0.24 | 0/0 | 0.0k | 720/720 |
| casa (techo blando) | 1.00 | ±0.20 | 0/0 | 0.0k | 720/720 |
| llama3.2:3b | -0.08 | ±0.23 | 0/2536 | 349.5k | 90/90 |
| gemma2:2b | -0.09 | ±0.24 | 0/2107 | 280.6k | 90/90 |

Juegos que puntúan: reversi, blackjack, brisca, spades, gofish, entropy.


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
