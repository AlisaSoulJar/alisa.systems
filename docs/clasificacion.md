# Clasificación

Generada por `tabla.mjs` el 2026-08-08.
2 semillas por juego, tope 300 decisiones.

**0,00** = tan bueno como elegir siempre la primera opción legal.
**1,00** = tan bueno como el rival de casa del juego.
Las dos referencias se miden en la misma tanda que los modelos.

Los modelos juegan 2 semillas por juego; las líneas base, 60.
Las base no cuestan tokens, así que el metro se mide con muchas más partidas
que lo que se mide con él. El ± es la incertidumbre real de cada fila.

El titular es la **mediana**: normalizar divide por el hueco entre suelo y techo,
así que un juego con hueco pequeño convierte una partida floja en un número enorme
y se lleva por delante el promedio. La media va al lado — cuando se separan mucho,
hay un juego mandando. Es por lo que los bancos de Atari publican mediana.

| participante | mediana | media | ± | forzadas | tokens | recibos verificados |
|---|---|---|---|---|---|---|
| primera (suelo) | **0.00** | 0.00 | ±0.06 | 0/0 | 0.0k | 1020/1020 |
| azar | **0.14** | 0.20 | ±0.25 | 0/0 | 0.0k | 1020/1020 |
| casa (techo blando) | **1.00** | 1.00 | ±0.11 | 0/0 | 0.0k | 1020/1020 |

Juegos que puntúan: ajedrez, reversi, mancala, peaton, blackjack, poker, hearts, gofish, entropy, sokoban, flota, defensa, frentes, relevo, cabina, rebano, pradera.

Fuera de la media, y por qué:

- **go** — el tope de 300 decisiones corta la partida
- **damas** — el tope de 300 decisiones corta la partida
- **xiangqi** — el tope de 300 decisiones corta la partida
- **snake** — el tope de 300 decisiones corta la partida
- **fagocito** — el tope de 300 decisiones corta la partida
- **tute** — el hueco (3.4) no supera al ruido de la medida (±6.3)
- **guerra** — la casa no supera al suelo: la escala se invertiría
- **unit** — el hueco (10.9) no supera al ruido de la medida (±37.2)
- **cripta** — el tope de 300 decisiones corta la partida


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
