# Matriz de géneros

> Generado por `matriz_generos.mjs` **jugando** los 36 juegos.
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
| spades | · | ● | ● | · | ● | · | ? | ● | no |
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
| rebano | ● | · | · | ● | ● | · | · | · | sí |
| pradera | ● | · | · | ● | ● | · | · | · | sí |
| nave | ● | ● | ● | · | ● | ● | ? | · | sí |
| remigio | · | ● | ● | · | ● | · | · | · | sí |
| parchis | ● | · | ● | · | ● | ? | ? | ? | sí |
| generala | · | · | ● | · | ● | · | · | · | sí |
| oca | ● | · | ● | · | ● | · | · | · | sí |
| canadiense | ● | ● | ● | ● | ● | · | · | · | sí |
| domino | · | ● | ● | · | ● | · | · | · | sí |

## Cobertura

- `espacial`: **23/36**
- `oculto`: **18/36**
- `rival`: **28/36**
- `autonomo`: **8/36**
- `irreversible`: **36/36**
- `simultaneo`: **2/36**
- `cooperativo`: **2/36**
- `comunicacion`: **2/36**

## Perfiles demostrados

- `oculto+rival+irreversible` — blackjack, poker, brisca, tute, hearts, gofish, unit, entropy, remigio, domino
- `espacial+rival+irreversible` — ajedrez, go, reversi, damas, xiangqi, mancala, parchis, oca
- `espacial+autonomo+irreversible` — fagocito, peaton, rebano, pradera
- `espacial+irreversible` — snake, sokoban
- `espacial+oculto+rival+autonomo+irreversible` — sigilo, canadiense
- `oculto+rival+irreversible+comunicacion` — spades
- `oculto+irreversible` — guerra
- `espacial+oculto+autonomo+irreversible` — cripta
- `espacial+oculto+rival+irreversible` — flota
- `espacial+rival+autonomo+irreversible` — defensa
- `espacial+rival+irreversible+simultaneo` — frentes
- `espacial+oculto+rival+irreversible+cooperativo` — relevo
- `espacial+rival+irreversible+cooperativo+comunicacion` — cabina
- `espacial+oculto+rival+irreversible+simultaneo` — nave
- `rival+irreversible` — generala
