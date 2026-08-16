# Cómo medir aquí sin engañarse

Este proyecto tiene una regla escrita para las pruebas —*una comprobación no vale
hasta verla suspender con el cable cortado*— y quince comprobaciones que la cumplen
(`npm run pruebas`). Pero la mayoría de las mediciones **no son pruebas**: son sondas
de usar y tirar que se escriben en cinco minutos para contestar una pregunta, y de
ésas nadie desconfía.

De las nueve veces que un número falso llegó a un informe en agosto de 2026, **siete
venían de una sonda improvisada**, no de una comprobación del repositorio. Este
documento es lo que se saca de ponerlas en fila.

---

## Las nueve, en una tabla

| lo que dijo | lo que era | qué falló |
|---|---|---|
| `tacto`: peatón 5/5 | latidos del reloj del juego | medía otra cosa |
| `check_gym_envs`: 41/41 | miraba 6 de 41 | parte → todo |
| `prueba_semillas`: verde | absolvía a los mixtos | condición que deja pasar |
| «0 píxeles rojos» | el bucle no iteró nunca | clave mal: `width` frente a `ancho` |
| «1876 partidas» | son 3 | partir por líneas lo que no son líneas |
| «0 de 35 declaran objetivo» | 35 de 35 | mirar el sitio equivocado |
| «5 de 35 tienen leyenda» | 34 de 35 | mirar **un camino de dos** |
| «ajedrez: 1 asiento» | son 2 | valor por defecto disfrazado de dato |
| «0 piezas tapadas» | 0 **al abrir** | medir un instante, concluir sobre siempre |

---

## 1. Un resultado extremo es sospechoso ANTES que interesante

`0 de 35`, `35 de 35`, `cero píxeles`, `0 de 5 en los cinco juegos`. Cinco de los
nueve dieron un extremo, y en los cinco el extremo era el síntoma de que la sonda no
estaba mirando nada.

Un cero redondo casi nunca significa «no hay»: significa **«no encuentro»**. Y son
cosas distintas: la primera es un hallazgo, la segunda es un bug tuyo.

> **Antes de contar un extremo, enseña que la sonda encuentra algo que sabes que
> está.** Un contador que sólo sabe decir cero no ha demostrado nada.

Por eso `bajo_el_panel.mjs` imprime SIEMPRE su control positivo, aunque salga verde,
y por eso `contactos.mjs` pregunta `naturalWidth` en vez de fiarse de que el fichero
exista: anunció «35 de 35 juegos con captura» con las treinta y cinco miniaturas en
negro.

## 2. Antes de contar cuántos, pregunta por cuántos SITIOS entran

Tres de los nueve fueron lo mismo: medir una vía y concluir sobre todas.

- El gym tiene **dos familias** —`propio` y `protohub`—; el `filter` miraba una.
- El sustrato tiene **dos caminos** —el adaptador y el que publica cada juego—; la
  sonda preguntaba por el adaptador. De ahí salió «la puerta de visión al 14 %», que
  en realidad era el 97 %.
- El objetivo vive en `reglas.OBJETIVO`, no en el estado; preguntar al estado daba
  cero.

> **Localiza la fuente antes de contarla.** `Select-String` sobre las firmas cuesta
> un minuto; concluir sobre la mitad del sistema cuesta una mañana y un mensaje de
> voz que hay que rectificar.

## 3. Si no se sabe, se dice `null`. Nunca un valor por defecto

La ficha del ajedrez —juego de dos— llegó a publicar **un asiento**, porque cuando la
sonda no encontraba el dato ponía 1. Un valor por defecto es indistinguible de una
medida, y por eso es peor que un hueco: **el hueco se ve y se rellena; el 1 se
publica.**

Lo mismo con «cero tapadas» cuando en realidad era «cero al abrir». Si la medida sólo
cubre un caso, el resultado tiene que decir cuál.

---

## Y la parte que no es una regla

Nada de esto sustituye a **mirar**. Los dos fallos más gordos de esa semana —la
comida de snake y el descarte de entropy, los dos tapados por el panel— aparecieron
mirando una captura, no midiendo; los instrumentos vinieron después, a preguntarle lo
mismo a los 35.

El orden que ha funcionado es:

> **mirar encuentra · medir explica · el instrumento generaliza**

Saltarse el primer paso deja una lista visual que no baja en tres semanas. Saltarse
el tercero deja un arreglo que sólo vale para el juego que mirabas.
