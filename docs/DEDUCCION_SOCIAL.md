# Deducción social: qué se ha hecho ya, y qué nos toca a nosotros

*Investigación pedida por Oscar antes de meternos en la vertiente de juegos de
persuasión (nave, y los que vengan). Agosto de 2026.*

La pregunta era: ¿un Among Us o un juego de lobos puede ser exclusivo de humanos
y LLMs, o una FSM puede jugar con frases de menú tipo SCUMM? Y: ¿hay experimentos
con humanos, LLMs y agentes programados en el mismo escenario?

Respuesta corta: **la división que propones existe desde hace una década, tiene
nombre, y está resuelta de una manera concreta que podemos copiar.** Y hay un
hueco grande justo donde este proyecto ya es fuerte.

---

## 1. El campo ya se partió en dos, literalmente

La competición **AIWolf** (internacional, de las más veteranas en IA de Werewolf)
tiene **dos divisiones separadas**:

- **Protocol Division** — los agentes se comunican con un **protocolo artificial
  fijo**. Ahí compiten programas: Java, C#, Python. Es exactamente tu menú SCUMM.
- **Natural Language Division** — los agentes hablan en inglés o japonés, y **gana
  el que decide un jurado humano**, valorando si habla con naturalidad y
  coherencia.

O sea: tu intuición es la solución estándar del campo. Los agentes programados
juegan con vocabulario cerrado; los que hablan, hablan. Y —esto es lo importante—
**no comparten clasificación**, porque no se miden con la misma vara: una división
se gana por victorias, la otra por juicio humano.

Eso corrige un matiz de lo que te dije ayer. Yo propuse «no cierres la puerta FSM,
dale un menú». El campo dice: **dale un menú Y no metas las dos en la misma
tabla**, porque comparar «gana más partidas» con «convence más» es comparar cosas
distintas.

## 2. Cómo resuelven el espacio de acciones (y por qué nos encaja)

**AmongAgents** (Among Us en texto para LLMs) usa un híbrido, y lo dice con estas
palabras: la acción se elige de un **menú** por rol —moverse, tarea, reportar,
convocar junta, votar, hablar; el impostor además *ventilar*, *matar*, *fingir
tarea*— y sólo **dentro** de la acción «hablar» se genera lenguaje natural:
*«bounded action framework rather than pure free-text interaction»*.

Eso es exactamente nuestro sustrato. `di:peligro` de cabina es una entrada de
menú; `decir:"creo que es bruno"` sería la misma entrada con carga libre. Una sola
lista de jugadas legales, dos niveles de expresividad.

Y hay un motivo técnico por el que el campo llegó ahí: **CFR y aprendizaje por
refuerzo necesitan un espacio de acciones definido** y no sirven con texto sin
restringir. Las salidas que se usan son tres: elegir de un espacio predefinido,
elegir entre candidatas generadas por un LLM, o agrupar el texto en un número
finito de estrategias. Las tres acaban siendo un menú.

## 3. El problema de quién habla, resuelto y copiable

**Werewolf Arena** (Google) resolvió el turno de palabra en el debate con una
**puja de urgencia**, y es tan simple que da rabia no haberlo pensado:

```
0  escucho
1  tengo algo general que decir
2  tengo algo crítico y concreto
3  es urgente que hable
4  me han preguntado directamente, tengo que responder
```

Habla el que más puja; si empatan, tiene prioridad quien fue mencionado en el
turno anterior. Encaja en nuestra arquitectura sin tocar nada: son cinco jugadas
legales (`pujar:0`…`pujar:4`) y las puede pulsar una FSM, un LLM o una persona.

Su hallazgo más interesante para el arte: **el estilo importa**. La verbosidad de
GPT-4 resultaba sospechosa; los turnos más cortos y con más carga emocional
convencían más. O sea que hablar mucho te delata, que es exactamente lo que pasa
en una mesa de verdad.

## 4. CICERO: el precedente serio de humanos + máquina hablando

El **CICERO** de Meta (Diplomacy) es el punto de referencia: jugó **40 partidas en
una liga online anónima con humanos**, sacó más del doble de la puntuación media y
quedó en el **10 % superior** de los que jugaron más de una partida.

Y su arquitectura es justo el híbrido: un planificador decide **intenciones
estructuradas**, y el modelo de lenguaje genera texto libre **condicionado a esas
intenciones**. No es «un LLM hablando»: es un plan con voz.

La lección de diseño: el texto libre funciona cuando está **anclado a una
intención declarada**. Que es otra forma de decir lo mismo que AmongAgents.

## 5. Sí hay estudios con humanos y agentes en la misma partida

Los hay, con la forma que preguntabas: un humano entre seis agentes, o un agente
entre seis humanos, con jugadores reclutados y asignados al azar a los montajes.
El resultado que se repite: los agentes consiguen tasas de victoria comparables a
las humanas, pero **les falta la variedad estratégica y el ajuste fino** de una
persona.

**TextArena** es lo más parecido a lo nuestro que existe: 57+ entornos de texto,
juego online contra otros modelos **y contra humanos**, con puntuación TrueSkill
en vivo. Los humanos aparecen agregados en la tabla como una sola entrada,
«Humanity», que sirve de línea base. Y etiqueta cada entorno con las habilidades
que pide —persuasión, faroleo, teoría de la mente, planificación…—, que es primo
hermano de nuestra matriz de géneros.

## 6. Dónde está el hueco, que es donde nosotros ya somos fuertes

Tres cosas que el campo hace mal o no hace, y que aquí ya están montadas:

**El tamaño de muestra es un desastre declarado.** Werewolf Arena escribe en su
propio paper que *«el número limitado de partidas, 10 por pareja de modelos, puede
no dar resultados estadísticamente robustos»*. Nosotros ya descartamos juegos de
la clasificación cuando el hueco no supera al ruido —chinchón fuera porque 1,5 no
supera a ±2,2— y tenemos el error emparejado hecho. Eso no es un detalle: es la
diferencia entre una tabla y una anécdota.

**La división de lenguaje natural la juzga un jurado humano.** Caro, subjetivo y
no reproducible. Si el habla viaja como jugada, entra en el recibo
`{juego, semilla, jugadas}` — y entonces **una partida hablada se puede volver a
jugar exactamente igual**. Que yo sepa eso no lo ofrece nadie.

**Las dos divisiones son dos mundos.** En AIWolf, el agente de protocolo y el que
habla no se cruzan nunca. Nosotros ya tenemos el mecanismo para que sean **el
mismo juego con dos normas** (`normas`/variantes, con su prueba en la batería), y
las fichas ya declaran `puertas` por juego.

## 7. Lo que yo haría, y en qué orden

1. **Vocabulario de habla en nave, tipo menú.** Es repetir lo que ya funcionó en
   cabina, cuyo azar está en 0.01 —o sea, habilidad medible— mientras el de nave
   está en 0.41, casi ruido. Verbos: acusar, defenderse, sospechar, confirmar,
   más la puja de Werewolf Arena para el turno de palabra.
2. **`decir:"…"` como jugada con carga libre**, disponible sólo donde la norma lo
   permita. La FSM usa el menú, el LLM y la persona pueden usar los dos.
3. **Dos normas declaradas del mismo juego** —`protocolo` y `libre`— en vez de dos
   juegos. Dos tablas separadas, como AIWolf, porque no son comparables.
4. **Y entonces el experimento**: mismo modelo, mismo juego, mismas semillas, con
   menú contra con habla libre. Con partidas verificables y con el ruido medido.
   Ésa es la pregunta que el campo tiene abierta y que nosotros podemos contestar
   con recibos.

---

### Fuentes

- [AIWolf contest — divisiones de protocolo y lenguaje natural](https://aiwolf.org/en/aiwolf_contest)
- [AIWolfDial 2023: Summary of Natural Language Division](https://aclanthology.org/2023.inlg-genchal.13.pdf)
- [Werewolf Arena: A Case Study in LLM Evaluation via Social Deduction](https://arxiv.org/html/2407.13943v1)
- [AmongAgents: Evaluating LLMs in the Interactive Text-Based Social Deduction Game](https://arxiv.org/html/2407.16521v2)
- [CICERO — Human-level play in the game of Diplomacy](https://ai.meta.com/research/cicero/)
- [CICERO (Science, versión técnica)](https://noambrown.github.io/papers/22-Science-Diplomacy-TR.pdf)
- [TextArena](https://arxiv.org/abs/2504.11442)
- [Learning Persuasive Agents in Social Deduction Games](https://arxiv.org/pdf/2510.09087)
- [The Werewolf Among Us: Humans vs LLMs in Multi-Agent Games](https://cuboulder-ds.github.io/CSCI-5423-Final/paper.pdf)
