# La segunda tabla — unos contra otros

> Generada por `node enfrentamiento.mjs --semillas 40`.
> Puntuación relativa por **Bradley–Terry**, anclada en `primera` = 1000.
> `∞?` = no perdió ninguna: la puntuación está regularizada, no medida.

La primera tabla (`tabla.mjs`) mide contra la casa con una silla ocupada.
Ésta ocupa **todas** las sillas con participantes y mide quién gana a quién.
Cada participante se sienta en cada silla el mismo número de veces, y toda
partida se re-simula antes de contarse.

| juego | sillas | partidas | tablas | primera | azar | casa | separa |
|---|---:|---:|---:|---:|---:|---:|---|
| defensa | 2 | 120 | 0% | 1000 | 1589 | 1937 | ✅ |
| generala | 2 | 120 | 0% | 1000 | 918 | 1846 ∞? | ✅ |
| remigio | 2 | 120 | 0% | 1000 | 940 | 1855 ∞? | ✅ |
| entropy | 2 | 120 | 1% | 1000 | 970 | 1868 ∞? | ✅ |
| flota | 2 | 120 | 0% | 1000 | 841 | 1627 | ✅ |
| chinchon | 2 | 120 | 2% | 1000 | 903 | 1597 | ✅ |
| damas | 2 | 120 | 1% | 1000 | 1031 | 1679 | ✅ |
| xiangqi | 2 | 120 | 0% | 1000 | 1012 | 1645 | ✅ |
| go | 2 | 120 | 0% | 1000 | 1246 | 1554 | ✅ |
| sigilo | 2 | 120 | 6% | 1000 | 970 | 1511 | ✅ |
| gofish | 3 | 120 | 8% | 1000 | 1228 | 1535 | ✅ |
| mancala | 2 | 120 | 1% | 1000 | 1041 | 1524 | ✅ |
| frentes | 2 | 120 | 6% | 1000 | 1356 | 1503 | ✅ |
| ajedrez | 2 | 120 | 1% | 1000 | 1133 | 1480 | ✅ |
| spades | 4 | 120 | 1% | 1000 | 1039 | 1436 | ✅ |
| canadiense | 4 | 120 | 3% | 1000 | 953 | 1332 | ✅ |
| reversi | 2 | 120 | 1% | 1000 | 1020 | 1377 | ✅ |
| oca | 2 | 120 | 2% | 1000 | 955 | 1196 | ✅ |
| parchis | 4 | 120 | 1% | 1000 | 851 | 1066 | ✅ |
| hearts | 4 | 120 | 18% | 1000 | 1037 | 1204 | ✅ |
| brisca | 4 | 120 | 3% | 1000 | 953 | 1150 | ✅ |
| alisapolis | 2 | 120 | 0% | 1000 | 906 | 1085 | ✅ |
| tute | 4 | 120 | 5% | 1000 | 971 | 1142 | ✅ |
| nave | 4 | 120 | 8% | 1000 | 1085 | 1160 | ✅ |
| unit | 4 | 120 | 1% | 1000 | 990 | 1088 | ✅ |
| domino | 2 | 120 | 27% | 1000 | 1035 | 1092 | ✅ |
| shinigami | 8 | 120 | 5% | 1000 | 1004 | 1077 | ✅ |

**27 de 27** separan de verdad (rango ≥ 30 puntos).

## Los que no entran, y por qué

| juego | motivo |
|---|---|
| snake | 1 silla — es de un jugador |
| fagocito | 1 silla — es de un jugador |
| peaton | 1 silla — es de un jugador |
| blackjack | la silla 1 no decide nunca —siempre una sola jugada—: es un jugador contra una casa fija, no un enfrentamiento |
| poker | la silla 1 no decide nunca —siempre una sola jugada—: es un jugador contra una casa fija, no un enfrentamiento |
| guerra | 1 silla — es de un jugador |
| sokoban | 1 silla — es de un jugador |
| marea | 1 silla — es de un jugador |
| cripta | 1 silla — es de un jugador |
| relevo | cooperativo: las 2 sillas deciden y comparten marcador a propósito — se gana o se pierde junto, así que no hay a quién ganar |
| cabina | cooperativo: las 2 sillas deciden y comparten marcador a propósito — se gana o se pierde junto, así que no hay a quién ganar |
| rebano | 1 silla — es de un jugador |
| pradera | 1 silla — es de un jugador |

Los que dicen «le falta publicar la puntuación por silla» **son juegos de dos
o más**: su `estado(p, asiento)` ignora el asiento y devuelve un único punto
de vista, así que no hay nada que comparar entre sillas. Es un arreglo de una
línea por juego, y son los que faltan para completar esta tabla.
