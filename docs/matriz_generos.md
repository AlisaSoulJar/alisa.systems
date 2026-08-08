# Matriz de géneros

> Generado por `matriz_generos.mjs` **jugando** los 27 juegos.
> No hay ninguna etiqueta escrita a mano: `●` medido presente, `·` medido ausente,
> `?` no observable. Se clasifica por estructura de decisión y no por género de
> tienda, porque «puzle» o «cartas» no dicen qué hay que saber hacer para jugar bien.

- **espacial** — hay una rejilla: el problema tiene geometría
- **oculto** — hay estado que el jugador NO ve
- **rival** — decide alguien más (a favor o en contra: ver cooperativo)
- **autonomo** — hay agentes que se mueven decidas lo que decidas
- **irreversible** — hay jugadas que no se pueden deshacer
- **simultaneo** — se decide a la vez: el segundo no ve lo que eligió el primero
- **cooperativo** — los dos asientos ganan o pierden juntos
- **comunicacion** — hay jugadas que sólo cambian lo que sabe el otro

| juego | espacial | oculto | rival | autonomo | irreversible | simultaneo | cooperativo | comunicacion | el resultado depende de quién juega |
|---|---|---|---|---|---|---|---|---|---|
| ajedrez | ● | · | ● | · | ● | · | ? | · | no |
| go | ● | · | ● | · | ● | · | ? | · | no |
| reversi | ● | · | ● | · | ● | · | ? | · | no |
| damas | ● | · | ● | · | ● | · | ? | · | no |
| xiangqi | ● | · | ● | · | ● | · | ? | · | no |
| mancala | ● | · | ● | · | ● | · | ? | · | no |
| snake | ● | · | · | · | ● | · | · | · | no |
| fagocito | ● | · | · | ● | ● | · | · | · | no |
| peaton | ● | · | · | ● | ● | · | · | · | no |
| blackjack | · | ● | ● | · | ● | · | ? | · | sí |
| poker | · | ● | ● | · | ● | · | ? | · | sí |
| brisca | · | ● | ● | · | ● | · | · | · | sí |
| tute | · | ● | ● | · | ● | · | · | · | sí |
| hearts | · | ● | ● | · | ● | · | ? | · | sí |
| spades | · | ● | ● | · | ● | · | · | · | sí |
| guerra | · | ● | · | · | ● | · | · | · | sí |
| gofish | · | ● | ● | · | ● | · | ? | · | sí |
| unit | · | ● | ● | · | ● | · | · | · | sí |
| entropy | · | ● | ● | · | ● | · | · | · | sí |
| sokoban | ● | · | · | · | ● | · | · | · | sí |
| cripta | ● | ● | · | ● | ● | · | · | · | sí |
| flota | ● | ● | ● | · | ● | · | · | · | sí |
| defensa | ● | · | ● | ● | ● | · | · | · | sí |
| sigilo | ● | ● | ● | ● | ● | · | · | · | sí |
| frentes | ● | · | ● | · | ● | ● | ? | · | no |
| relevo | ● | ● | ● | · | ● | · | ● | · | sí |
| cabina | ● | · | ● | · | ● | · | ● | ● | sí |

## Cobertura

- `espacial`: **17/27**
- `oculto`: **14/27**
- `rival`: **21/27**
- `autonomo`: **5/27**
- `irreversible`: **27/27**
- `simultaneo`: **1/27**
- `cooperativo`: **2/27**
- `comunicacion`: **1/27**

## Perfiles demostrados

- `oculto+rival+irreversible` — blackjack, poker, brisca, tute, hearts, spades, gofish, unit, entropy
- `espacial+rival+irreversible` — ajedrez, go, reversi, damas, xiangqi, mancala
- `espacial+irreversible` — snake, sokoban
- `espacial+autonomo+irreversible` — fagocito, peaton
- `oculto+irreversible` — guerra
- `espacial+oculto+autonomo+irreversible` — cripta
- `espacial+oculto+rival+irreversible` — flota
- `espacial+rival+autonomo+irreversible` — defensa
- `espacial+oculto+rival+autonomo+irreversible` — sigilo
- `espacial+rival+irreversible+simultaneo` — frentes
- `espacial+oculto+rival+irreversible+cooperativo` — relevo
- `espacial+rival+irreversible+cooperativo+comunicacion` — cabina
