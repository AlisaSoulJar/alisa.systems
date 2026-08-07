# Adaptar lo que ya hay, antes de añadir nada

Decisión de Oscar, 2026-08-06: **primero terminar lo que tenemos.** Hay 19 juegos
con reglas, gym, marcador y rival de casa, y buena parte sin exponer del todo.
Añadir el juego veinte antes de eso sería ensanchar el hueco.

## Lo medido (`npm run censo` → `node cadena.mjs`)

```
reglas    19/19     pagina    19/19     gym       19/19
marcador  19/19     casa      19/19
sala      17/19     faltan: Snake, Fagocito
lab        7/19     faltan: Snake, Fagocito, Peatón, Blackjack, Brisca,
                            Tute, Hearts, Spades, Guerra, Go Fish, Unit, Entropy
```

## ✅ HECHO: el metro ya mide lo nuevo (2026-08-06)

Cuatro columnas añadidas a `cadena.mjs`. Resultado, medido:

```
tablero3d   6/19    tablero 3D propio, no sólo la mesa funcional
raton       6/19    se juega clicando el tablero (por la mañana eran 2)
asientos   19/19    cada silla admite persona, política o modelo
compartida 13/19    dos seres en la MISMA partida (6 dicen que no, con motivo)
```

**Y el total bajó: `cadena completa` pasó de 7/19 a 6/19.** El póker perdió su
sitio porque no tiene tablero 3D, ni ratón, ni admite compañía. No ha empeorado
nada — es que ahora se le pregunta. **Un metro honesto da números más bajos**, y
ese descenso es la señal de que la medida sirve.

Los detectores no llevan listas escritas a mano: la página de cada juego ya es
sólo configuración (`montarMesa({ juego, visualizador })`) así que se lee de
ella, y quién admite compañía se importa del propio árbitro (`SOLITARIOS` en
`worker-mesas/mesas.js`), para que si mañana el póker aprende a sentar a dos la
tabla se entere sola.

La página del lab recogió las columnas sin tocarla: `gen_lab_index.py` itera
sobre los eslabones en vez de llevar su propia lista.

### Lo que sigue sin poder medirse desde Node

Falta la columna «se ve»: que el 3D dibuje algo. **Go la fallaría.** No se ha
añadido porque hace falta un navegador que renderice y alguien que mire los
píxeles; poner una columna que en realidad detectara «tiene fichero visualizador»
sería el mismo error que estas cuatro vienen a corregir. Va aparte, como prueba
de navegador, y hasta entonces se comprueba a ojo.

## ✅ HECHO: jugar SIN NAVEGADOR (2026-08-06)

Requisito de Oscar: **todo esto tiene que correr headless**, porque una política
determinista no tiene pantalla y un agente de lenguaje sin visión tampoco. Si la
única forma de sentarse fuera abrir una pestaña con WebGL, el banco de pruebas
mediría quién tiene navegador, no quién juega mejor.

- `asientos.js` **ya era usable sin DOM** (sólo `pintarPanel` toca `document`).
  Comprobado desde Node: las tres políticas eligen jugada sin navegador.
- `sentarse.mjs` (nuevo, `npm run sentarse`) es la silla por HTTP: se sienta,
  sondea, y cuando le toca juega. Contra personas, políticas o modelos.

⚠️ **Aquí `fsm:casa` SÍ funciona, y en el navegador no.** Esa política le pregunta
al juego su sugerencia y necesita la partida de verdad, que en una sala vive en
el árbitro. El cliente headless la re-simula desde el recibo antes de cada
jugada — así que **el cliente sin pantalla acaba siendo más capaz que el que la
tiene**.

### El fallo que sólo se vio con agentes

Primera prueba con dos procesos: el segundo llegó **tres segundos tarde y se
encontró la partida terminada**. Cuarenta jugadas, cero suyas. El primero se
sentó, la casa ocupó los otros tres asientos y resolvió la partida entera.

Con personas nunca se habría notado, porque una persona tarda en pulsar. Es una
suposición que sólo se cae cuando quien juega no tiene pantalla.

**Arreglado:** quien abre la mesa declara `jugadores: N`; la casa no rellena
huecos hasta que se hayan sentado N, y el retrato publica `esperando_a` para que
un cliente sepa esperar en vez de creer que la mesa está atascada. Verificado:
dos agentes en procesos separados, 10 jugadas cada uno, los dos recibos válidos.

## ✅ HECHO: la puerta de lenguaje contaba una mesa vacía (2026-08-06)

Oscar lo dijo así: *«headless es una de las gracias del sistema, es como estamos
traduciendo el mundo físico a los LLMs sin visión»*. Al medirlo salió el agujero
más grande del proyecto, y llevaba ahí desde el principio.

**Medido: 0 de 19 juegos aportaban descripción propia.** Los diecinueve caían en
la plantilla genérica, que decía nombre, puntos, turno y las jugadas legales.

Para un agente sin visión eso es jugar al ajedrez leyendo

```
Ajedrez. Puntos: 0. Turno: white. Puedes: a2a3, a2a4, b2b3…
```

**sin ver el tablero jamás.** Una brisca sin saber el triunfo ni qué hay en la
baza. Bastaba para no hacer una jugada ilegal —eso lo garantiza `legal_moves`— y
no para jugar bien. Se estaba midiendo a los modelos a ciegas y llamándolo puerta
de lenguaje.

**Arreglado sin inventar nada:** `describirEstado` ahora pone en palabras los
campos que el juego YA publica — los mismos que `mesa.html` dibuja. Resultado:

```
Ajedrez.  Tablero (FEN): rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq…
Brisca.   Tu mano: O_2 B_4 P_2. Triunfo: O. Rivales con 3 3 3 cartas…
Entropy.  Tu caja: O_C ? ? ? B_4 ? ? ?. Descarte: O_2. Cajas rivales: O_4???B_2???
```

### Esto rompe la comparabilidad — y en este proyecto da igual

Cambiar la descripción cambia el prompt, o sea **cambia lo que se mide**. Los
números viejos de `docs/clasificacion.md` se sacaron con la descripción pobre y no
son comparables con los de después: un modelo que suba no habrá mejorado, es que
por fin ve la mesa.

⚠️ **Y no hay que conservarlos.** Preguntado a Oscar el 2026-08-07: esto sigue en
modo prototipo y el dataset actual es sólo un ejemplo. Así que la tabla se rehace
con `npm run tabla` y ya está — no hay que arrastrar compatibilidad con nada.

Por el mismo motivo, **los campos del recibo (`juego`, `semilla`, `jugadas`) SÍ
se pueden renombrar** en la traducción a inglés pendiente. Yo los había marcado
como intocables «porque hay filas guardadas»; no las hay que importen.

Anotado aparte porque el error es instructivo: **tratar como sagrado algo que
nadie ha declarado sagrado**. Un dataset de ejemplo no es una API pública, y la
diferencia sólo se sabe preguntando.

### Y los «cinco sin nada que contar» eran mentira: 19/19

Primera medición: go, mancala, snake, fagocito y peaton «no publicaban estado».
**Falso.** Los cinco publicaban de todo —`board`, `snake`, `food`, `maze`,
`ghosts`, `frog`, `hazards`— sólo que con nombres que el descriptor no conocía.
Go llevaba publicando su rejilla desde siempre, en `board`; aquí se buscaba
`tablero`. **El hueco estaba en quien preguntaba, no en quien respondía.** Una
casa con dos idiomas se paga así.

Arreglado de dos formas, y la segunda importa más:

1. `board` / `tablero` / `state.board` se dibujan como rejilla ASCII —`.` vacío,
   `X` negras, `O` blancas—, que es el `showboard` del **Go Text Protocol**, el
   formato que el mundo del go lleva décadas usando para clientes sin gráficos.
   *(Los planos de características de AlphaGo no sirven aquí: son comida para una
   red convolucional, o sea visión con otro nombre.)*

2. **Un barrido final cuenta TODO lo que el juego publique** y que no se haya
   nombrado antes, en crudo. Peor redactado, pero visible. Ir añadiendo nombres a
   mano habría durado hasta el juego siguiente; un dato mal escrito se mejora,
   uno que no llega no existe.

Resultado: **19/19 cuentan su estado.**

⚠️ **Y el barrido no filtra secretos**, comprobado juego a juego: ninguna carta
que el jugador no deba ver aparece en el texto. La razón es de diseño — el
descriptor puede ser generoso porque **son las reglas las que deciden qué se
oculta**: el póker publica `opponent_hand: ["??","??"]` y entropy manda `null` en
las tapadas. La puerta de lenguaje hereda el secreto en vez de reimplementarlo.

**Pendiente:** esa comprobación se hizo a mano. Debería ser una prueba
permanente en `npm test` — es exactamente el tipo de cosa que se rompe callando.

### (histórico) Los cinco que parecían sin nada que contar

`describirEstado` sólo puede contar lo que el juego publique. Estos no publican:

| juego | qué le falta publicar |
|---|---|
| **go** | el tablero. Un modelo juega con 362 legales y sin ver una piedra. **Es el peor caso** y hoy además no se ve en 3D |
| **mancala** | cuántas semillas hay en cada hoyo |
| snake, fagocito, peaton | son espaciales y en tiempo real; piden descripción propia |

Los cuatro de tablero que sí publican (`ajedrez`, `reversi`, `damas`, `xiangqi`)
lo hacen con FEN, que además es el formato que un modelo tiene más visto.

## El diagnóstico original: EL METRO SE HABÍA QUEDADO CORTO

La cadena tiene siete columnas y **ninguna mide lo que se construyó el
2026-08-06**. Por eso canta `19/19` en cinco columnas mientras go no se ve y
siete juegos de cartas no tienen mesa 3D.

Es el mismo fallo que ya se corrigió una vez: la columna se llamaba `prueba` y
medía otra cosa, así que se renombró a `lab`. **Una medida que dejó de medir lo
que importa sigue dando verde**, y eso es peor que no tenerla.

Columnas que faltan en `cadena.mjs`:

| columna | pregunta |
|---|---|
| `raton` | ¿se puede jugar clicando, o sólo escribiendo la jugada? |
| `asientos` | ¿admite persona / FSM / modelo en cada silla? |
| `compartida` | ¿se pueden sentar dos seres a la misma partida? |
| `se_ve` | ¿el 3D dibuja algo? (go pasaría todo lo demás y fallaría aquí) |

**Esto va primero.** Sin ello, el resto de esta lista es opinión.

## Después, por orden de lo que devuelve

### ✅ 1. Go ya se ve (2026-08-07) — eran CUATRO fallos, no uno

**`scene.add(...).position.set(8, 12, -8)`** — la línea estaba encadenada y
parecía colocar un foco. `Object3D.add()` devuelve **la escena**, así que movía el
MUNDO ENTERO y dejaba el foco en el origen. El tablero quedaba fuera de plano y la
página se veía negra. Sin error, sin aviso: el bucle corría, el lienzo era el
correcto, las luces estaban, la geometría estaba bien **en local**.

Se encontró comparando la posición LOCAL de una pieza `(0, -0.75, 0)` con la de
MUNDO `(8, 11.25, -8)`: un desplazamiento idéntico para todas, que no podía venir
del grupo —posición 0— ni de las piezas. Buscado en todo el árbol: **no hay más
sitios con ese patrón.**

**`syncGoState` leía el tablero de dos formas en la misma función.** Arriba
`state.board` para el minimapa (funcionaba, por eso el minimapa SÍ mostraba
piedras); abajo `Array.isArray(state)` para el 3D, y `state` es `{board:[...]}`.
Esa condición era siempre falsa: **el bucle que crea las piedras no se ejecutó
nunca.**

**`clearcoat` en `MeshStandardMaterial`.** No es propiedad de esa clase —es de
`MeshPhysicalMaterial`— así que el brillo de concha de las piedras nunca se
aplicó. Three lo avisaba **dos veces por piedra**: 186 avisos en una partida de
dos jugadas. Un aviso repetido cientos de veces se vuelve invisible.

**Una geometría y un material NUEVOS por piedra**, recreados en cada refresco
(varias veces por segundo). Ahora se crean una vez: 14 piedras → 2 materiales,
5 geometrías, 0 avisos.

Y el encuadre: la cámara estaba a la distancia de un tablero 8×8 siendo el goban
14,4 de lado. A `(0, 19, 16)` cabe entero.

### (histórico) 1. Go no se ve en 3D
Juega, se clica, el minimapa lo refleja — pero el tablero no aparece.
**No es una regresión**: comprobado montando la estructura antigua, sale igual.
Descartados cámara, luces, bucle de dibujo, lienzo, materiales y visibilidad.

La pista medida: el renderer dibuja **120 triángulos** cuando 48 mallas deberían
dar ~576 (o sea, el frustum descarta casi todo), y la caja envolvente del grupo
sale en `y ≈ 10,5…12` cuando sus hijos están en `y = −0,75` local y el grupo no
tiene ni posición ni rotación. Hay algo mal en las matrices del grafo de escena
de `go_visualizer.js`.

### 2. El croupier 3D de cartas
Siete juegos con reglas, recibo y asientos, y sin mesa que se vea.
Plan completo en [`croupier_por_composicion.md`](croupier_por_composicion.md).

### 3. Los 12 `lab` que faltan
Nueve son de cartas y se resolverían casi solos con el punto 2. Los tres de
arcade (Snake, Fagocito, Peatón) son otra cosa: no son por turnos.

### 4. Snake y Fagocito sin estación en la Sala
Los dos únicos huecos de `sala`.

### ✅ 5. Encuadre de los seis tableros — comprobado (2026-08-07)

Medido, no mirado: se proyectan las 8 esquinas de la caja envolvente del tablero
a coordenadas de pantalla y se cuenta cuántas caen dentro del lienzo.

| tablero | cabe | margen abajo (el que se perdía) |
|---|---|---|
| ajedrez | 8/8 | 61 px |
| reversi | 8/8 | 74 px |
| damas | 8/8 | 54 px |
| mancala | 8/8 | 188 px |
| go | 8/8 | corregido: cámara a `(0, 19, 16)` |
| xiangqi | 8/8 | corregido: cámara a `(0, 13, 11)` |

Los cuatro que quedaban por revisar estaban bien. Los dos que fallaban tenían el
mismo defecto: **la cámara de un tablero 8×8 en un tablero más grande** —el goban
mide 14,4 de lado y el xiangqi es 9×10—. Ninguno de los dos era un fallo de la
refactorización.

⚠️ Se mide con el lienzo de 1366×577 de la prueba. En una ventana más estrecha
podrían recortar: convendría que esta comprobación fuera automática y con varios
tamaños, en vez de una vez a mano.

### (histórico) 5. Encuadre de los tableros
`xiangqi` estaba recortado (arreglado: la cámara era la de un 8×8 siendo 9×10).
**Faltan por comprobar** chess, reversi, checkers y mancala — sólo se han visto
en pantallazo xiangqi y mancala.

### 6. Póker para dos
Hoy se rechaza el segundo jugador con motivo. No es la mesa: sus reglas nombran
el turno por dentro (`turno: 'jugador'|'rival'`, no `turn`) y están escritas como
un mano a mano contra la casa. Pide tocar `poker.js`.

### 7. Parejas
Tute y spades son juegos de parejas en la vida real; aquí el marcador es por
silla. Falta un concepto de bando.

## Deudas menores, ya conocidas

- `reversi` y `checkers` no tienen minimapa (llevan contador de fichas). Es una
  decisión previa, no un hueco — pero conviene decidirlo a propósito.
- `GLTFLoader is not defined` en `croupier_avatar_integration_test`.
- `THREE is not defined` en `FileSystemDioramaSystem.js`.
- Cloudflare «Email Obfuscation» provoca un 404 en `/cdn-cgi/l/email-protection`.
- La clave de Cloudflare en uso es la Global API Key; debería ser un token con
  permisos acotados a Pages.

## Lo que NO hay que hacer todavía

Portar juegos nuevos. Hay 15 fichas esperando en `card_library.json`
(ver [`que_juegos_caben.md`](que_juegos_caben.md)) y no se van a mover de ahí.
Cada juego que se añada antes de cerrar esta lista hereda todos sus huecos.
