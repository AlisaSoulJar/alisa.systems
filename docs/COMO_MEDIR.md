# Cómo medir sin engañarse

*Cinco reglas sacadas de números falsos que llegaron a un informe. Ninguna es
teórica: cada una tiene detrás una vez que dije algo que no era verdad.*

> **Este documento se escribió tarde, y eso es la primera lección.** La memoria de
> agosto de 2026 resume tres de estas reglas y remite a `COMO_MEDIR.md`. Ese
> fichero no existía en ningún sitio. La lección se guardó como intención, y una
> intención no se ejecuta: el 21 de agosto volví a caer dos veces en la misma
> familia. Por eso ahora hay además un fichero que **corre** — `medir.mjs` — con
> las dos comprobaciones que más falta hacen.

---

## 1. Un resultado extremo es sospechoso antes que interesante

`0 de 35`, `cero píxeles`, `0 de 5 en los cinco juegos`. De nueve números falsos,
**cinco daban un extremo y en los cinco la sonda no estaba mirando nada**.

Un cero redondo casi nunca significa «no hay»; significa «no encuentro».

**Qué hacer:** enseñarle a la sonda algo que SÍ existe antes de dejarla contar. Si
no lo encuentra, el problema es la sonda.

## 2. Antes de contar cuántos, pregunta por cuántos SITIOS entran

Tres fallos fueron medir una vía y concluir sobre todas: el gym tiene dos
familias, el sustrato dos caminos, el objetivo no vive en el estado. De ahí salió
«la puerta de visión al 14 %» cuando era el 97 %.

**Qué hacer:** contar los caminos antes que las cosas. Si hay dos y sólo miras
uno, el denominador ya está mal.

## 3. Si no se sabe, `null`, nunca un valor por defecto

La ficha del ajedrez publicó «1 asiento» porque la sonda ponía 1 al no encontrar
el dato. Un hueco se ve y se rellena; un `1` se publica y se cree.

---

## 4. Una diferencia sin su error no es una diferencia

**21-08-2026.** Comparé dos configuraciones de shinigami por su hueco crudo —27,9
contra 19,5— y le anuncié a Oscar un conflicto entre «jugable para una persona» y
«útil como medida» que había que resolver eligiendo.

Dividido por su propio error: **7,3 veces contra 6,7**. Las dos separaban de
sobra, el umbral para distinguirse de cero es 2, y no había nada que elegir. **El
conflicto lo inventó la resta.**

Y hay una segunda mitad: el error tiene que ser **emparejado**. Las dos políticas
juegan las mismas semillas en las mismas sillas y se resta partida a partida. Sin
eso, la varianza de lo que no controlas —en shinigami, si te toca ser shinigami— entra
entera en el error y esconde el hueco. En remigio esa varianza era seis veces la
interna de la propia política.

**Qué hacer:** `huecoEmparejado(a, b)` de `medir.mjs`. Devuelve `señal`, y por
debajo de 2 no se cuenta como hallazgo.

## 5. Una sonda nueva no tiene derecho a un número nuevo hasta repetir uno viejo

**21-08-2026.** Medí que darle voz a la junta de nave bajaba el azar de 0,36 a
0,21 y se lo conté a Oscar como el resultado del día. La tabla oficial dijo
**0,41** — el mismo número que antes del cambio.

Mi sonda ponía la misma política en las **cuatro** sillas. El banco sienta al
agente en **una** y juega las demás con la casa. Medían cosas distintas.

Lo que lo habría cazado antes de abrir la boca no era mirar más: era pedirle a mi
sonda el número de un caso **ya conocido**. Si no reproduce el 0,41 de nave sin
tocar nada, no tiene ninguna autoridad para decirme el 0,21 de nave con debate.

**Qué hacer:** `reproduce(obtenido, conocido)` de `medir.mjs`, contra un caso que
el instrumento oficial ya haya publicado. Y si tu sonda no puede reproducirlo,
usa el instrumento oficial en vez de escribir otro.

---

## El orden que funciona

**Mirar encuentra · medir explica · el instrumento generaliza.**

Mirar una captura o una partida entera encuentra el problema —la junta de nave que
empataba, el agente asesinado la primera noche—. Medir dice por qué. Y sólo cuando
hay una comprobación que **suspende sola** deja de depender de que alguien se
acuerde.

Ver también `prueba_de_las_pruebas.mjs`: cada comprobación de la casa lleva
declarado el sabotaje que tiene que hacerla suspender. Una comprobación que no
puede fallar es decoración, y ya he escrito dos.
