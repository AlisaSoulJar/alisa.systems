# El ancla — 2048 canónico (`marea`)

Medido el 2026-08-24. **Todas las partidas verificadas por recibo.**

`marea` es el único entorno de este banco cuyo número se entiende sin leer el
proyecto: es el 2048 de siempre —4×4, aparece un 2 el 90 % de las veces y un 4 el
10 %, cada ficha se funde una sola vez por movimiento, la puntuación es la suma de
lo que sale de cada fusión— y lleva años siendo entorno de referencia. Por eso
existe: para que las demás columnas tengan con qué compararse.

## Lo medido

| participante | puntuación | partidas | recibos |
|---|---|---|---|
| primera (suelo) | **814** | 40 | — |
| azar | **1 056** | 40 | — |
| gemma2:2b | **865** | 30 | 30/30 |
| qwen2.5:7b | **1 170** | 30 | 30/30 |
| llama3.2:3b | **1 758** | 30 | 30/30 |
| casa (techo blando) | **2 760** | 40 | — |

Fichas máximas de las referencias: el suelo se queda en 32–64, el azar llega a
128, la casa a 256.

## Qué se puede afirmar y qué no

La desviación **por partida** medida sobre 200 semillas es de **519** con la
política del azar y **1 702** con la de la casa. Con 30 partidas, eso deja el
error de la media entre **±95 y ±311** según lo bien que juegue el participante.
Con eso:

- **`llama3.2:3b` (1 758) está separado de verdad.** Muy por encima del azar y
  claramente por debajo de la casa. Es el único de los tres del que se puede
  decir algo con confianza.
- **`gemma2:2b` (865) es el suelo.** Está a 51 puntos de «pulsar siempre la
  primera tecla», o sea dentro del ruido. No juega: elige.
- **`qwen2.5:7b` (1 170) es el azar.** A 114 puntos, dentro o al borde del error.

> ⚠️ **Un modelo de 3B juega al 2048 mejor que uno de 7B**, y no por poco: 1 758
> contra 1 170. El tamaño no ordena esta tabla.

⚠️ **No se publica la varianza de los modelos porque no se ha medido**: sólo se
guardó la media de las 30 partidas. Los márgenes de arriba se estiman con la
desviación de las líneas base a un nivel de juego parecido, y eso es una
estimación, no una medida. Para afirmar el orden entre `gemma2:2b` y el suelo
haría falta guardar la serie por semilla.

## Por qué esto vale más que el resto de la tabla

Es la **única comprobación de este banco que no depende de nosotros**. La
literatura de 2048 da alrededor de 1 100 puntos y ficha 128 para una política
aleatoria; nuestro azar saca 1 056 y llega a 128. Que coincida es la prueba de
que el juego que decimos tener es el que tenemos.

## Y con tres semillas esto no vale nada

La primera medida se hizo con 3 semillas y dio **661 / 1 797 / 576**, mientras la
tanda grande daba ~817 / ~1 627 / ~1 588 para los mismos tres modelos. No era una
discrepancia: era ruido con cara de medida. Con tres partidas el error de la
media (±300 a ±983) es **más grande que la distancia entre el suelo y el azar**.

El bloque `ANCLA` de `tabla.mjs` publica siempre la cuenta de partidas y avisa
cuando son menos de veinte.
