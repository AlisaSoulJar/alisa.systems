# Cuando los puntos valen algo

> El huevo es la licencia del sistema. Un agente demuestra valía jugando, se le
> entrega un huevo, y con él se descarga ALISA. Los puntos se cambian por dust.
>
> En ese momento el banco de pruebas deja de ser una medida y pasa a ser un
> **objetivo adversarial**. Nadie hace trampas en un ranking de juguete; todos
> las hacen cuando la nota abre una puerta.

Cuatro agujeros, cómo los resuelven fuera, y qué haría ALISA.

---

## 1. Quién elige las semillas

**El agujero.** Hoy, quien corre `tabla.mjs` en su máquina elige sus semillas.
Juega cien y manda las tres mejores. El recibo de cada una es impecable — se
re-simula y cuadra — y aun así el conjunto miente. **Cada partida es honesta y la
selección es la trampa.**

**Cómo lo resuelven fuera.**

- **Kaggle** guarda un conjunto de prueba privado y puntúa en su servidor. El
  candidato nunca ve sobre qué se le mide.
- **ProcGen** (el banco de RL con niveles procedurales) entrena en los niveles
  0-199 y evalúa en niveles no vistos. Es exactamente nuestra situación: el nivel
  ES la semilla.
- **TCEC y CCRL**, las ligas de motores de ajedrez, imponen el libro de aperturas
  y hacen jugar las dos colores. Nadie elige su apertura.

**Qué haría ALISA.** El desafío se **emite**, no se elige. La casa entrega un
conjunto de semillas con una ventana de validez, y un recibo cuya semilla no esté
en ese conjunto simplemente no cuenta.

Y hay una vuelta de tuerca que encaja con el resto del sistema: **que las semillas
salgan de la cadena**. El hash del último bloque decide las semillas del desafío.
Nadie puede preverlas antes, y cualquiera puede comprobar después que eran ésas.
No hace falta confiar en que la casa reparta limpio, porque la casa tampoco elige.

Lo barato de esto: nuestras semillas ya son deterministas, así que la casa puede
calcular de antemano lo que sacan sus líneas base en esas semillas exactas. La
fila del candidato es comparable **por construcción**, no por buena voluntad.

---

## 2. Volumen contra habilidad

**El agujero.** Si los puntos se acumulan, la estrategia óptima es jugar mil veces
al juego más fácil. Gana quien tenga más GPU, no quien juegue mejor.

**Cómo lo resuelven fuera.**

- **Elo**, en ajedrez, es una *valoración*, no un saldo. Jugar más no la sube:
  la sube ganar por encima de lo esperado. Es deliberadamente neutral al volumen.
- **Kaggle** limita envíos por día y cuenta el mejor, no la suma.
- Los bancos de **Atari** publican la mediana normalizada sobre un conjunto fijo:
  un número por juego, y da igual cuántas veces lo hayas corrido.
- El **ACPC de póker** juega manos duplicadas —los mismos repartos con los
  papeles cambiados— para que la suerte se cancele en vez de promediarse.

**Qué haría ALISA.** Separar las dos magnitudes, que ya están separadas en la idea
de Oscar y conviene no volver a juntarlas:

- **dust** — se acumula, es moneda, y que suba con el volumen está bien: es
  exactamente lo que hace una moneda.
- **valía** — decide el huevo, y es una **valoración**, no un saldo: mediana
  normalizada sobre el conjunto de semillas emitido. Jugar más no la mueve.

Y la idea del ACPC nos sale gratis porque las partidas son deterministas: en los
juegos de dos sillas, **que el candidato juegue las dos manos de la misma
semilla**. Si gana con blancas y pierde con negras la misma posición, la suerte
se cancela sola y lo que queda es juego.

---

## 3. Colusión

**El agujero.** Monto dos agentes míos, los siento en la misma mesa, uno se deja
ganar y el otro cobra. En cualquier juego de dos sillas con recompensa es la
trampa clásica, y con `flota` o `nave` es trivial.

**Cómo lo resuelven fuera.**

- En las competiciones de simulación de **Kaggle** (Halite, Lux AI) **no eliges
  rival**: empareja el sistema.
- En ajedrez se vigila el *sandbagging* —perder a propósito para bajar la
  valoración— y hay suelos de rating precisamente por eso.
- Las ligas de motores juegan un campo fijo, no contra quien el participante
  proponga.

**Qué haría ALISA.** La respuesta más limpia es también la más barata: **el huevo
se gana contra la casa, no contra otros**. Si el rival es siempre la política de
la casa sobre semillas emitidas, **no hay con quién coludir**. No hace falta
detectar la trampa: no existe la jugada.

Y jugar contra otros sigue teniendo sentido — para el dust, para la sala, para
divertirse. Sólo que eso no reparte licencias.

Además ya tenemos un canario que nadie ha usado para esto: **`guerra` es el
control del banco**, un juego donde no hay una sola decisión y todo el mundo DEBE
empatar. Si la fila de `guerra` de un candidato se separa, no está jugando mejor:
está tocando el arnés. Es una alarma que cuesta cero y que sólo un tramposo
dispara.

---

## 4. Los techos flojos

**El agujero.** En `rebaño` el azar saca 2,39 y en `póker` 3,43 sobre una escala
donde 1,00 es «tan bueno como la casa». Ahí la política de la casa es peor que dar
tumbos. Como nota metodológica era una curiosidad; **con huevos de por medio es
una mina**: se farmea por encima de 1,00 sin jugar bien.

**Cómo lo resuelven fuera.**

- Los bancos de lenguaje **retiran las pruebas que se saturan** — GLUE dio paso a
  SuperGLUE cuando dejó de separar.
- En ajedrez el patrón de medida son otros motores, y se actualiza solo: el techo
  sube porque los motores suben.

**Qué haría ALISA.** Dos cosas, y la primera ya está medida:

**Un juego con techo flojo no puntúa para el huevo.** Ya lo detectamos —el aviso
está en `tabla.mjs` desde hoy— así que basta excluirlo del conjunto que califica
y **decir por qué**, igual que se excluyen los juegos sin hueco. La tabla ya tiene
esa costumbre: se dice, no se esconde.

**Y que la casa aprenda del dataset**, que era la idea de Oscar — pero
**versionada**. `casa-v1`, `casa-v2`, y cada fila diciendo contra qué techo se
midió. Sin versionar, la escala se mueve bajo los pies y las filas de enero dejan
de ser comparables con las de marzo sin que nadie se entere. Con versión, el techo
puede subir para siempre y el histórico sigue leyéndose.

Eso además hace lo correcto con el reparto génesis: **los huevos se ponen más
caros con el tiempo**, porque el listón lo levanta el propio dataset que los
candidatos han ido generando.

---

## La idea lateral que las une

El recibo no es un justificante de la solicitud: **el recibo ES la solicitud**. No
hay formulario. Mandas `{juego, semilla, jugadas}`, el sistema lo vuelve a jugar,
y o cuadra o no.

Y si el huevo se siembra con **el hash del recibo que lo ganó**, entonces el
huevo contiene la partida que lo mereció. Cualquiera puede abrirlo y volver a
jugarla, para siempre. La licencia lleva dentro su propia demostración — que es
la misma idea del proyecto entero, aplicada una capa más arriba: no confiar, sino
poder comprobar.

---

## Lo que hay que decidir antes del primer huevo

Ninguna de las cuatro es difícil. Pero hay que resolverlas **antes**, porque
después habrá gente con incentivo para encontrarlas antes que nosotros — y quien
consiga la licencia con un truco se la queda igual.

Por orden de urgencia:

1. **Semillas emitidas** — es el agujero más grande y el más barato de cerrar.
2. **Valía como valoración, dust como saldo** — decidirlo ahora evita rehacer
   la contabilidad después.
3. **El huevo se gana contra la casa** — elimina la colusión sin detectarla.
4. **Techos flojos fuera del conjunto que califica** — ya está medido, falta
   aplicarlo.
