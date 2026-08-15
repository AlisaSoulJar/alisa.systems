# La noche del 14 al 15 de agosto

Notas de una tanda larga trabajando sola. Lo escribo aquí y no sólo en los commits
porque el patrón que sale es más útil que cualquiera de los arreglos.

## Lo que se arregló

| Qué | Cómo se encontró |
|---|---|
| En el ajedrez no se podía pulsar **ni una** jugada, y su tablero tampoco responde al tacto: en un móvil no se podía jugar | midiendo `elementsFromPoint` sobre los botones |
| El póker tenía **dos tiras de botones con el mismo `id`**, una muerta: te ignoraba la mitad de las veces | probando botón por botón, una carga de página por botón |
| Las cartas de tu mano medían **46 px** en un juego donde servir al palo es obligatorio | pregunta de un betatester sobre la baraja española |
| La **niebla era lo más brillante** de la pantalla: lo que no sabes gritaba y lo explorado quedaba de manchita | abriendo la captura de cripta |
| Los juegos con niebla encuadraban **todo lo desconocido**, dejando la partida en una esquina | la misma captura |
| El go y el reversi con piedras **negras y blancas**, el xiangqi rojo contra negro | el color es el nombre del bando, no adorno |
| Los 20 botones del ajedrez **se salían de la pantalla** y chocaban con los mandos | sólo se ve DESPUÉS de que los botones existan |

## El patrón: cuatro veces di por sabida una estructura

Las cuatro me costaron el mismo rato y las cuatro se resolvieron igual —
**preguntándole al navegador cómo se llaman las cosas** en vez de deducirlo del
código que las crea:

- `zona === 'mano_0'` cuando la zona se llama `mano_0_0`. Código muerto.
- `grupo.children.some(o => o.name === 'niebla')` cuando la niebla es **nieta**,
  porque el pintor cuelga su raíz dentro de `grupo`. Código muerto.
- El `#mesa-jugadas` del ajedrez, que la plantilla pone fuera del plegado y el
  navegador enseñaba dentro.
- `x.onclick` para saber si un botón tiene manejador, cuando usan
  `addEventListener` y ahí `onclick` es `false`.

En los cuatro casos el síntoma era idéntico: **el arreglo no cambia la medida**. Y
en los cuatro la conclusión fácil —«habrá que probar otra cosa»— era la equivocada.

## El peor de todos: un `*` seguido de `/` que borra CSS en silencio

Escribí **tres** reglas para que los botones del ajedrez cupieran y ninguna cambió
nada. Revisé cascada, especificidad, si el fichero se servía (lo pedí por HTTP: ahí
estaba), si el navegador cacheaba.

Era un cierre de comentario de más. Al editar un comentario largo dejé el cierre
antiguo en medio; veinte líneas de prosa quedaron fuera del comentario y el
analizador de CSS, al toparse con texto suelto, **se comió también la regla de
detrás**. Sin error, sin aviso.

Es el peor fallo posible aquí porque se parece exactamente a «mi arreglo no
funciona». Ya hay `prueba_css.mjs` en `npm test`: cuenta aperturas y cierres en las
seis hojas y **dice la línea** del sobrante.

Nuestras hojas son especialmente vulnerables porque llevan comentarios enormes a
propósito, con el porqué y la medida de cada regla. Es el precio de documentar en el
sitio, y se paga con una comprobación de milisegundos.

## Los instrumentos también mienten, y hubo que arreglarlos

`tacto.mjs` daba «brisca: 1 jugada con el dedo, 3 con el ratón» y me tuvo persiguiendo
un fallo de táctil que **no existe**. Perseguí tres hipótesis —el navegador quedándose
el gesto, el doble toque para hacer zoom, el viewport sin declarar—, escribí dos
arreglos, y los números salieron idénticos las tres veces.

Lo que zanjó el asunto fue pulsar los botones por su posición real: cuatro de cuatro
con el dedo y cuatro de cuatro con el ratón. Una rejilla ciega sobre botones pequeños
dice más de la rejilla que de la página.

Ahora separa la **garantía** (cada jugada legal se puede pulsar, apuntando) de la
**comodidad** (cuánto se llega tocando la mesa, sondeo a ciegas y dicho como tal). Y
dice en voz alta lo que **no** puede medir: los quince juegos que se juegan
deslizando. Escribí una sonda de gestos y la quité — `page.touchscreen` sólo sabe dar
toques, así que la pasada del dedo eran eventos inventados por mí contra un arrastre
de ratón real. Dos experimentos distintos otra vez.

El laboratorio y `tacto` reintentan una vez y **lo dicen**: hay juegos con reloj
propio —peatón, pradera, nave— donde la jugada puede dejar de ser legal entre que
lees el botón y lo pulsas. Un rojo aleatorio es peor que ninguno: enseña a ignorar la
prueba, y el día que sea real tampoco se mirará.

## Lo que queda dicho y no hecho

- **Remigio con baraja española y dos barajas.** La española ya existe como juego
  propio (`chinchon: spanish_48`). Dos barajas rompe la identidad de carta: habría
  dos `S_A`, `jugar:S_A` deja de señalar una carta y el verificador no puede
  re-simular el recibo. Media tarde con riesgo en cuatro sitios; está escrito en
  `remigio.js` para decidirlo con el número delante.
- **Parchís** dibuja 256 bloques de interior que no son parte del juego. Es
  cosmético, funciona, y tocar el pintor compartido por eso no compensa.
- **El corte de fagocito a 1366×633** que reportó un betatester **no lo reproduzco**.
  `mirar` mide ahora también en esa forma exacta y sale limpio. Sigue sin explicación.

- **En snake la comida puede quedar detrás del panel.** Medido con la semilla 7: la
  comida sale en la casilla (0,4), que proyectada cae en pantalla en (269, 180) —
  dentro del rectángulo del HUD, que va de (20,20) a (340,310). O sea que el objetivo
  del juego es invisible hasta que se mueva.

  No es exclusivo de snake: los tableros se centran en la pantalla entera y el panel
  se pone encima de la esquina superior izquierda. `mirar` ya vigila que el panel no
  tape más del 22% y los treinta y cinco pasan, pero «poco porcentaje» no impide que
  lo tapado sea justo lo único que importa.

  El arreglo de verdad es desplazar el objetivo de cámara para que la zona de juego
  no caiga bajo el panel. Toca el encuadre de quince mesas y snake ni siquiera pasa
  por ahí —tiene visualizador propio con la cámara escrita a mano—, así que no es un
  cambio de madrugada. Mientras tanto existe el botón de esconder el panel, que sirve
  exactamente para esto.
