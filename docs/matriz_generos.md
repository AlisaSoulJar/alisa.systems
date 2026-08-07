# Matriz de géneros

> Generado por `matriz_generos.mjs` **jugando** los 26 juegos.
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

| juego | espacial | oculto | rival | autonomo | irreversible | simultaneo | cooperativo | el resultado depende de quién juega |
|---|---|---|---|---|---|---|---|---|
| ajedrez | ● | · | ● | · | ● | · | ? | no |
| go | ● | · | ● | · | ● | · | ? | no |
| reversi | ● | · | ● | · | ● | · | ? | no |
| damas | ● | · | ● | · | ● | · | ? | no |
| xiangqi | ● | · | ● | · | ● | · | ? | no |
| mancala | ● | · | ● | · | ● | · | ? | no |
| snake | ● | · | · | · | ● | · | · | no |
| fagocito | ● | · | · | ● | ● | · | · | no |
| peaton | ● | · | · | ● | ● | · | · | no |
| blackjack | · | ● | ● | · | ● | · | ? | sí |
| poker | · | ● | ● | · | ● | · | ? | sí |
| brisca | · | ● | ● | · | ● | · | · | sí |
| tute | · | ● | ● | · | ● | · | · | sí |
| hearts | · | ● | ● | · | ● | · | ? | sí |
| spades | · | ● | ● | · | ● | · | · | sí |
| guerra | · | ● | · | · | ● | · | · | sí |
| gofish | · | ● | ● | · | ● | · | ? | sí |
| unit | · | ● | ● | · | ● | · | · | sí |
| entropy | · | ● | ● | · | ● | · | · | sí |
| sokoban | ● | · | · | · | ● | · | · | sí |
| cripta | ● | ● | · | ● | ● | · | · | sí |
| flota | ● | ● | ● | · | ● | · | · | sí |
| defensa | ● | · | ● | ● | ● | · | · | sí |
| sigilo | ● | ● | ● | ● | ● | · | · | sí |
| frentes | ● | · | ● | · | ● | ● | ? | no |
| relevo | ● | ● | ● | · | ● | · | ● | sí |

## Cobertura

- `espacial`: **16/26**
- `oculto`: **14/26**
- `rival`: **20/26**
- `autonomo`: **5/26**
- `irreversible`: **26/26**
- `simultaneo`: **1/26**
- `cooperativo`: **1/26**

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
