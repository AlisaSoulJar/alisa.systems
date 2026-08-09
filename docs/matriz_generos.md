# Matriz de géneros

> Generado por `matriz_generos.mjs` **jugando** los 30 juegos.
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
| entropy | · | ● | ● | · | ● | · | · | ● | sí |
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

## Cobertura

- `espacial`: **20/30**
- `oculto`: **15/30**
- `rival`: **22/30**
- `autonomo`: **7/30**
- `irreversible`: **30/30**
- `simultaneo`: **2/30**
- `cooperativo`: **2/30**
- `comunicacion`: **2/30**

## Perfiles demostrados

- `oculto+rival+irreversible` — blackjack, poker, brisca, tute, hearts, spades, gofish, unit
- `espacial+rival+irreversible` — ajedrez, go, reversi, damas, xiangqi, mancala
- `espacial+autonomo+irreversible` — fagocito, peaton, rebano, pradera
- `espacial+irreversible` — snake, sokoban
- `oculto+irreversible` — guerra
- `oculto+rival+irreversible+comunicacion` — entropy
- `espacial+oculto+autonomo+irreversible` — cripta
- `espacial+oculto+rival+irreversible` — flota
- `espacial+rival+autonomo+irreversible` — defensa
- `espacial+oculto+rival+autonomo+irreversible` — sigilo
- `espacial+rival+irreversible+simultaneo` — frentes
- `espacial+oculto+rival+irreversible+cooperativo` — relevo
- `espacial+rival+irreversible+cooperativo+comunicacion` — cabina
- `espacial+oculto+rival+irreversible+simultaneo` — nave
