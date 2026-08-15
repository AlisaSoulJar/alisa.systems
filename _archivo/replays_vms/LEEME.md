# `replays.html` — la versión «Global Replay VMS» (retirada el 2026-08-15)

Aquí está tal cual estaba, porque en este proyecto no se borra nada: se archiva.

## Qué era

Una pantalla que listaba ficheros de `/arcade/datasets`, los cargaba en un
`<iframe>` y los reproducía **fotograma a fotograma** con una barra de tiempo y un
contador que ponía `FRAME`.

## Por qué se retiró

Dos motivos, y el segundo es el que importa.

**1. Estaba muerta.** `/arcade/datasets` devuelve 404 — comprobado el 2026-08-15
contra el servidor local y contra el dominio. La página abría, decía «SELECT A
DATASET», y no había ninguno que seleccionar. Ni un error en consola que lo
delatara.

**2. Contaba la historia contraria.** Reproducir fotogramas guardados es enseñar
un vídeo, y un vídeo se puede montar. La tesis de este proyecto es la otra: una
partida se guarda como `{juego, semilla, jugadas}` y se comprueba **volviéndola a
jugar** con las mismas reglas. No hay estados guardados que enseñar porque no hace
falta guardarlos: se deducen.

La página que ocupa su sitio ahora lista el corpus real (`/api/dataset`) y cada
fila abre el repetidor, que vuelve a jugar esa partida de verdad.

## Si algún día hace falta

El visor de fotogramas seguiría teniendo sentido para logs de entrenamiento con
estados que NO se pueden deducir de una semilla y una lista de jugadas — por
ejemplo, algo con aleatoriedad no sembrada. Ese día, esto es el punto de partida y
haría falta escribir el endpoint que le da de comer.
