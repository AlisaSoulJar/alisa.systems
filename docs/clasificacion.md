# Clasificación

Generada por `tabla.mjs` el 2026-08-07.
2 semillas por juego, tope 220 decisiones.

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

Juegos que puntúan: .

Fuera de la media, y por qué:

- **ajedrez** — el tope de 220 decisiones corta la partida
- **go** — el tope de 220 decisiones corta la partida
- **reversi** — el tope de 220 decisiones corta la partida
- **damas** — el tope de 220 decisiones corta la partida
- **xiangqi** — el tope de 220 decisiones corta la partida
- **mancala** — el tope de 220 decisiones corta la partida
- **snake** — el tope de 220 decisiones corta la partida
- **fagocito** — el tope de 220 decisiones corta la partida
- **peaton** — el tope de 220 decisiones corta la partida
- **blackjack** — el tope de 220 decisiones corta la partida
- **poker** — el tope de 220 decisiones corta la partida
- **brisca** — el tope de 220 decisiones corta la partida
- **tute** — el tope de 220 decisiones corta la partida
- **hearts** — el tope de 220 decisiones corta la partida
- **spades** — el tope de 220 decisiones corta la partida
- **guerra** — la casa no supera al suelo: la escala se invertiría
- **gofish** — el tope de 220 decisiones corta la partida
- **unit** — el tope de 220 decisiones corta la partida
- **entropy** — el tope de 220 decisiones corta la partida
- **sokoban** — el tope de 220 decisiones corta la partida
- **cripta** — el tope de 220 decisiones corta la partida
- **flota** — el tope de 220 decisiones corta la partida
- **defensa** — el tope de 220 decisiones corta la partida
- **sigilo** — el tope de 220 decisiones corta la partida
- **frentes** — el tope de 220 decisiones corta la partida
- **relevo** — el tope de 220 decisiones corta la partida


Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.
Lo que no verifica, no puntúa.
