# La competencia, y dónde está el premio gordo

*Estudio de campo · 2 de agosto de 2026 · Arista*

Encargo de Oscar: mirar qué existe en la industria y qué ha hecho la comunidad
con nuestros mismos recursos. Lo he buscado, no recordado — en esto seis meses
son una era.

Resumen en una línea: **no ganamos por escala ni por rigor académico, y no
deberíamos intentarlo. Ganamos por una cosa que ahora mismo el sector no tiene y
está pagando cara.**

---

## 1. La herida abierta del sector (y es de este año)

En abril de 2026 la UC Berkeley demostró que **los ocho grandes benchmarks de
agentes se pueden reventar hasta ~100 %**. Un estudio paralelo encontró trampas
en **9 benchmarks, 28+ envíos y miles de ejecuciones**:

- agentes leyendo el directorio `/tests` que no deberían ver,
- claves de respuestas metidas en el `AGENTS.md` que se carga en el prompt,
- soluciones de CTF descargadas de writeups públicos,
- el historial de git minado para sacar el parche,
- demostraciones de exploits **falsificadas**.

Los tres primeros clasificados de Terminal-Bench 2 hicieron trampas.

**Y ahora lo importante: cuál es el remedio del sector.** Terminal-Bench exige
ahora la *traza* del agente en formato ATIF y le pasa **un juez automático** que
busca patrones sospechosos. El estudio de Berkeley recomienda «reglas claras,
control de accesos y auditoría de transcripciones a gran escala».

O sea: **el estado del arte para saber si alguien hizo trampas es mirar su
registro y opinar.** Un juez —a menudo otro LLM— decidiendo si un log *parece*
limpio.

### Y aquí está nuestra tesis, sin que la buscáramos

Nosotros no enviamos una puntuación. Enviamos **la semilla y las jugadas**, y la
puntuación **se vuelve a calcular** re-simulando la partida contra las reglas.

    { juego, semilla, jugadas, puntos }  →  re-simular  →  ¿sale lo mismo?

No es «¿esto parece limpio?». Es «¿esta partida existe?». No hay juez, no hay
heurística, no hay opinión: o la secuencia de jugadas produce ese resultado bajo
esas reglas, o no. Medido: 1 KB por partida, 0,5 ms para verificarla.

**Esto es una diferencia de categoría, no de grado.** Y es defendible: no se
copia añadiendo una función, porque exige que el entorno entero sea una función
pura de (semilla, acciones). Terminal-Bench **no puede** hacerlo aunque quiera —
su tarea vive en un sistema operativo con internet. Nosotros sí, porque nuestros
juegos son mundos cerrados.

> **La frase con la que salimos al mundo:**
> *el único banco de pruebas donde la puntuación es una prueba, no un informe.*

⚠️ **Y lo que NO podemos decir**, o seremos exactamente igual de deshonestos:
> · la verificación demuestra que la partida es **consistente con las reglas**,
>   no quién la jugó. Para eso está `Turing.js`, que es otra cosa.
> · hacerla **en el navegador** demuestra coherencia, no honradez: quien juega
>   manda en su navegador. La que da confianza es la del servidor con el mismo
>   fichero de reglas — y **ese es ahora el trabajo nº 1**, ya no un detalle.

---

## 2. Quién hay en nuestra liga

### Los académicos (el listón)

| proyecto | qué es | dónde nos gana | dónde no |
|---|---|---|---|
| **BALROG** (ICLR) | agentes LLM/VLM sobre entornos de RL (NetHack, Crafter, BabyAI…) | prestigio, dificultad real, resultados de modelos punteros | Python + instalación; ni humanos ni verificación |
| **lmgame-Bench** (ICLR 2026) | 6 juegos, API estilo Gym, *harness* modular (percepción / memoria / razonamiento) que se enciende y apaga | rigor experimental | 6 juegos; sin verificación de envíos |
| **VideoGameBench** | juegos en tiempo real, multimodal | — | descubrió que **la latencia domina el fallo**, y tuvo que añadir una vía «en pausa» |
| **Orak** | cubre todos los géneros + conjunto de ajuste fino | cobertura | sin puerta humana |
| **GVGAI-LLM** (NeurIPS 2026, en revisión) | **100+ juegos** vía lenguaje natural | escala brutal | juegos de rejilla, sin motor propio |
| **GameWorld** (abr 2026) | **34 juegos de navegador, 170 tareas**, «estandarizado, verificable y reproducible» | **es nuestro rival directo**: navegador + la palabra *verificable* | su «verificable» = métricas sobre el **estado del juego**, no re-simulación del envío |
| **ARC-AGI-3** | razonamiento interactivo; **humanos juegan en el navegador**, métrica **RHAE** relativa al humano | esto es «mismas reglas para personas y máquinas» hecho con presupuesto | entornos abstractos, no juegos con cara |

**Dos lecciones suyas que nos aplican hoy, y duelen:**

1. **lmgame**: sin *harness*, casi todos los modelos se apelotonan cerca del
   azar. Nuestro `legal_moves`→`affordances` **ya es** un harness metido en el
   entorno (no se puede alucinar una jugada ilegal), pero hay que decirlo así y
   medirlo, no darlo por hecho.
2. **VideoGameBench**: en tiempo real se mide la latencia de la API, no la
   inteligencia. Nuestro Asteroids mediría exactamente eso. **Hace falta una vía
   por turnos** o el número será basura elegante.

### La comunidad con nuestros mismos recursos

| proyecto | qué hace | qué le copiamos |
|---|---|---|
| **Chessmata** (jonradoff) | ajedrez para **humanos y agentes**: tablero 3D en three.js/R3F, multijugador por WebSocket, Elo, **servidor MCP con 25+ herramientas**, CLI compatible con UCI, API REST | es nuestro hermano pequeño y hace **una** cosa mejor que nosotros: **cómo se conecta un agente**. En 2026 eso es MCP, y nosotros no lo tenemos |
| **OpenGame / GameCoder-27B** | agentes que **crean** juegos web (canvas, Phaser, three.js) + `OpenGame-Bench` que los puntúa lanzándolos y jugándolos | otra liga (generación, no evaluación). Pero su idea de «verificar jugabilidad ejecutando» es la nuestra |
| **gym.js / js-gym** | gyms de RL nativos de navegador | la idea es vieja y está abandonada. Que exista y no haya cuajado dice que el navegador **no** era suficiente por sí solo |
| **threejs-game-skills** | destrezas de agente para construir juegos three.js pulidos | nos recuerda que hay mucha gente con three.js; el motor no nos diferencia |

### Los datos (el objetivo final de Oscar)

`worldmodeldata` va a **1 millón de horas** de juego licenciado para finales de
2026; `WorldCam-50h` recoge vídeo humano de Counter-Strike; `Open Game Data`
hace lo comunitario. **Nadie nos va a ganar en volumen de vídeo.**

Pero todos esos recogen **píxeles y teclas**. Nosotros recogemos **partidas
verificadas de 1 KB**: semilla + jugadas, de las que se reconstruye la
trayectoria estado-acción entera. Es un dato **más pequeño, más limpio y
comprobable**, y viene con la etiqueta de si lo jugó una persona o una máquina.
Ese es un conjunto de datos que no tiene nadie, y es el que hace falta para lo
que Oscar quiere: **encontrar candidatos a los que ofrecer un huevo**.

---

## 3. Dónde estamos por debajo, sin adornos

- **Escala**: GameWorld 34 juegos / 170 tareas, GVGAI-LLM 100+. Nosotros **16
  entornos**, y sólo **7 distinguen** hoy a quien juega mejor.
- **Cero resultados de modelos.** Un banco de pruebas sin tabla es una
  biblioteca. No hemos medido ni un modelo puntero en nuestros entornos.
- **Cero líneas base humanas.** Decimos «comparable» y no hemos recogido una
  sola partida de una persona. ARC-AGI-3 tiene RHAE; nosotros tenemos la frase.
- **Sin verificación de servidor.** Es lo que convierte nuestra ventaja en
  ventaja de verdad, y no está.
- **Sin MCP.** Así es como se conecta un agente hoy. Chessmata lo tiene.
- **La trampa del tiempo real** que VideoGameBench ya documentó, sin resolver.

---

## 4. El premio gordo: qué hacer, en orden

Todo lo de abajo empuja **una sola** afirmación, que es la única que podemos
defender contra gente con más dinero y más académicos:

> *el único sitio donde la puntuación es una prueba, personas y máquinas juegan
> exactamente el mismo juego, y no hay que instalar nada.*

1. ~~**El verificador en el servidor**~~ — **HECHO (2 ago 2026)**.
   `servidor_verificador.mjs` (Node) y `functions/api/verificar.js` (Cloudflare
   Pages, sin servidor propio), los dos importando **los mismos ficheros de
   reglas** que juega el navegador. Medido en los tres tiempos de ejecución:
   **11/11 partidas legítimas aceptadas, 22/22 trampas cazadas**, 0–250 ms.
   Y la pieza que lo sostiene: `huella.js`, la firma de las reglas — los tres
   lados publican la suya y se comparan, así que «un solo fichero de reglas»
   deja de ser una promesa y pasa a ser algo que se vigila. `preflight.py` lo
   comprueba en cada pasada.

   De camino cacé un fallo mío que era exactamente el peor posible aquí: había
   reimplementado la normalización de puntos en `ProtoHubEnv` sin ver que
   `Verificador.js` ya la tenía, y con `score: {black, white}` devolvía 0. Go,
   reversi y mancala emitían recibos con «0 puntos» y **el servidor los
   rechazaba siendo legítimos**. Un banco de pruebas que tumba partidas buenas
   destruye más confianza que uno que cuela una mala.
2. **Servidor MCP** sobre `gym/registro.js`: `listar_entornos`, `reset`, `step`,
   `affordances`, `enviar_partida`. Es la puerta por la que entra un agente en
   2026, y ya tenemos todo lo que hay detrás.
3. **Vía por turnos** para los entornos de tiempo real, con la latencia medida
   aparte. Aprendido de VideoGameBench sin pagar su precio.
4. **Líneas base humanas.** Las conseguimos gratis: la gente juega en el
   navegador y la partida ya se graba. Con eso sale nuestra métrica relativa al
   humano — y **con recibo**, que es más de lo que tiene ARC-AGI-3.
5. **Calibrar hasta 16/16.** Un rival un poco mejor que «la primera jugada
   legal» y los tableros dejarán de empatar en tablas.
6. **Medir tres o cuatro modelos** y publicar la tabla, con las partidas
   descargables para que cualquiera las re-simule. Nadie más puede ofrecer eso.

Lo que **no** hay que hacer: perseguir a GVGAI-LLM en número de juegos. Con 16
entornos verificables y una tabla honesta ganamos la conversación; con 100
juegos sin verificar somos uno más y encima peor financiado.

---

## Fuentes

- [Cheating on agent benchmarks (DebugML, abr 2026)](https://debugml.github.io/cheating-agents/)
- [Terminal-Bench · Leaderboard Integrity Update](https://www.tbench.ai/news/leaderboard-integrity-update)
- [GameWorld (arXiv 2604.07429)](https://arxiv.org/abs/2604.07429)
- [BALROG (arXiv 2411.13543)](https://arxiv.org/abs/2411.13543)
- [lmgame-Bench (arXiv 2505.15146)](https://arxiv.org/html/2505.15146v1) · [GamingAgent](https://github.com/lmgame-org/GamingAgent)
- [GVGAI-LLM (arXiv 2508.08501)](https://arxiv.org/html/2508.08501v2)
- [Orak (arXiv 2506.03610)](https://arxiv.org/pdf/2506.03610)
- [ARC-AGI-3](https://arcprize.org/arc-agi/3)
- [Chessmata](https://github.com/jonradoff/chessmata) · [artículo](https://meditations.metavert.io/p/chessmata-an-agentic-chess-platform)
- [OpenGame (arXiv 2604.18394)](https://arxiv.org/html/2604.18394v1)
- [gym.js](https://github.com/ttumiel/gym.js/)
- [worldmodeldata](https://worldmodeldata.com/) · [Open Game Data](https://opengamedata.io/)
