# Dónde nos quedamos — 15 de agosto de 2026

Notas de traspaso. **No es una lista de tareas que haya que mantener al día**: es la
foto de un momento, con lo medido y lo que todavía no se sabe. Si algo de aquí ya no
es cierto, bórralo en vez de arreglarlo — este proyecto lleva media docena de fallos
causados por listas escritas a mano que se separaron de la realidad en silencio.

---

## Lo que hay que hacer, y por qué

### 1. El panel en móvil: reducirlo a un icono / panel lateral plegable

Lo pidió Oscar así: *«en móvil deberíamos poder usar lo táctil, tocar las cartas y no
el panel; el panel es para agentes»* y *«reducir el panel a un icono en el móvil,
poderlo plegar en un icono o panel lateral plegable»*.

**Tiene razón en el fondo, con un matiz que no hay que perder:** el panel NO es sólo
para agentes. Sus botones son literalmente `legal_moves`, la misma lista que recibe
un agente por la puerta de texto, y eso es lo que sostiene el argumento del banco de
pruebas: personas y máquinas juegan al mismo juego. Si el panel desaparece en móvil,
esa propiedad deja de ser comprobable ahí. Además hay jugadas que no son una carta:
`robar_mazo`, `pasar`, `tirar`.

Así que: **tocar las cartas como camino principal en móvil, y el panel detrás
reducido a un icono** — no quitarlo.

**YA MEDIDO — EL TÁCTIL SÍ LLEGA.** Con Playwright en `hasTouch: true` y
`touchscreen.tap()` (no `click()`, que sintetiza ratón y habría aprobado de mentira):
un toque de dedo sobre una carta dispara `cardInspect`. O sea que tocar la mesa
funciona y el panel es el segundo camino, no el único. Ése era el desconocido.

**HECHO el 13-08.** El panel plegado en móvil pasa de **374x221 (35% de la pantalla)
a 374x129 (16%)**: una píldora con el título —que sigue siendo el asa para
desplegarlo— y las jugadas sueltas, con la mesa entera a la vista.

Y la causa NO era CSS, que es lo que yo creía. Midiendo los hijos del panel uno a
uno salieron **CUATRO `div#mesa-jugadas`**, el mismo id repetido: uno con botones y
tres vacíos que sumaban exactamente los ~90 px que faltaban. Los creaba mi propio
arreglo del día anterior — metía la caja en el `innerHTML` y luego la MOVÍA fuera,
así que el `innerHTML` siguiente creaba otra y la anterior ya no se borraba. Crecía
sin parar, sin dar un error, y disfrazado de problema de maquetación. El CSS de
ayer estaba bien; lo que no dejaba verlo era el DOM de más.

Comprobado además que **no vuelve a crecer**: una caja al empezar y una seis
segundos después.

**Lo que sigue faltando aquí:** el toque cubre sólo parte de las jugadas. Hay que
comprobar cuáles de `legal_moves` se alcanzan tocando y cuáles no, juego por juego.
Las que no, tienen que seguir estando en alguna parte — que para eso se quedó el
panel.

### 2. El segundo aviso del betatester, sin resolver

> «La carta que robó si no la quiero no me deja descartarla»

Entropy, sala compartida, mismo móvil de 276 px. **Creo que no es un fallo sino
legibilidad**: tras robar, las jugadas legales son `cambiar:0..7` y
`descartar_y_voltear:1,2,3,5,6,7`. No hay un `descartar` a secas —esa regla existe
sólo si robaste del MAZO— y `descartar_y_voltear:1` no lo entiende nadie.

Dos caminos, y es decisión de producto:
- rotular los botones con lenguaje humano (pero entonces el botón y la jugada del
  agente dejan de ser la misma cadena, que es justo lo que los hace comparables), o
- explicar la fase en el HUD («robaste del descarte: tienes que colocarla»).

El segundo respeta la propiedad del banco. Yo iría por ahí.

### 3. La tabla tiene que ROTAR ASIENTOS

Medido por el agente que escribió el parchís canadiense, con las cuatro sillas
jugando IGUAL, 600 partidas:

    parchís (dado)      155 · 150 · 146 · 149    ~25% cada uno
    canadiense (cartas) 186 · 138 · 138 · 137    31% el primero

Seis puntos por sentarse en el asiento 0. No es un fallo de los juegos. Pero
`tabla.mjs` compara agentes sin rotar asientos, así que **estaría midiendo dónde se
sentaron** y saldría ordenada, creíble y falsa.

### 4. Los 23 sistemas del motor sin sembrar

`prueba_semillas.mjs` los cuenta y el techo sólo puede bajar. Rebaño salió de
`BoidsSystem`, pradera de `FoodChainSystem`, cripta de `BSPSystem`: el camino está
probado. Candidatos con nombre: `CroupierSystem`, `TurretCombatSystem`,
`RoboticArmSystem`, `KatamariSystem`, `TrafficSystem`, `OrbitalKinematicsSystem`,
`NeuralDrivingSystem`. Es el eje «arcades» que Oscar quiere después de los de mesa.

### 5. El corpus: ya recoge, y ahora hace falta que la gente juegue

Estaba en **dos partidas**, y no porque nadie jugara: **ninguna de las 35 mesas
ofrecía aportar** — sólo lo hacían `mesa.html` y `jugar.html`, dos páginas viejas.

Resuelto el 15-08, con dos decisiones de Oscar:

- **Aportar viene marcado**, con la casilla a la vista y una cuenta atrás de 4 s para
  desmarcarla («si no quieres, desmárcalo»). Marcado por defecto está bien; marcado y
  escondido, no — por eso la casilla sale ANTES del envío y `qué se manda` enseña el
  JSON literal, igual que el buzón de avisos.
- **La columna `normas`** existe (`ALTER TABLE partidas ADD COLUMN normas TEXT`,
  ejecutado en producción). Las dos filas anteriores quedaron en NULL, que es lo que
  eran. Con eso, damas —el único juego con normas variables— ya entra en el corpus.

Verificado de punta a punta contra el dominio: aportada una partida de damas con
`damaVuela` y `peonComeAtras`, guardada, listada en `/arcade/replays.html`, y su
enlace la vuelve a jugar **con esas normas** sin romperse en la jugada 9.

**Lo que falta ahora es sólo que se juegue.** Con tres filas no hay escaparate que
enseñar, y la página está lista para cuando lo haya. Dos cosas medidas que conviene
saber:

- El aporte sale **al terminar** una partida, y hay juegos donde terminar cuesta —
  las damas no acaban en 900 jugadas con la política tonta. Habría que medir cuántas
  partidas se terminan de verdad antes de decidir si hace falta otra puerta.
- La casilla es de 16 px por algo: una de 12 se falla con el dedo, y una casilla que
  se falla no es una elección.

### 6. Pendientes menores, ya medidos

- **La Sala del Huevo tiene 17 mesas y hay 18 juegos sin una** (snake, fagocito,
  peatón y los quince nuevos). Es una lista curada A PROPÓSITO —cuáles tienen mesa
  es decisión de sala, no un hecho derivable— así que no es un fallo. Decisión de
  Oscar si entran.
- **`/arcade/entrar` lleva a las páginas planas, no a la sala de bolsillo.** El mismo
  juego se ve de dos maneras según por dónde entres. Sin resolver a propósito.
- **El `?v=` de los scripts lo subo a mano** cuando toco un motor. `prueba_version.mjs`
  dice el número exacto, pero podría calcularlo el generador.
- **El buzón comparte almacén con las mesas** (`worker-mesas/mesas.js`, instancia
  `__buzon`). No es elegante y está dicho en el código: un buzón no es una mesa. El
  día que haga falta algo más, ése es el momento de darle su clase.
- **`GET /reportes` es público.** Sin enlazar desde ningún sitio, pero quien tenga la
  URL lo lee. Para betatesters pareció el equilibrio correcto; si no, cerrarlo.

---

## La pasada visual — 15-08-2026, abriendo las 41 capturas una por una

Oscar pidió ver que todo esté **gráficamente excelente** antes de publicitarlo. Es
una pregunta que los instrumentos NO contestan: `laboratorio`, `legibilidad` y
`mirar` dicen que no está **roto**, no que esté **bien**. Los dos fallos más gordos
de esta lista los aprobaban los tres.

**Arreglado y verificado:**

- **El parchís salía enterrado bajo 256 bloques** que no son del juego. El pintor
  tenía `if (v === 1) muros.push(...)` —una convención numérica fija— e ignoraba la
  `leyenda` que la rejilla publica. Tres juegos declaran que su 1 es «fuera»:
  parchís (256), canadiense (256), oca (18). Los otros doce con celdas de valor 1 no
  declaran leyenda y ahí sigue siendo muro.
- **La cámara miraba 3° por debajo de lo necesario.** Un muro de altura 1 tapa la
  celda de detrás salvo que se mire desde más de `atan(1/1) = 45°`, y la inclinación
  era 42. Afectaba a los DOCE juegos con muros. Ahora 55° cuando hay muros, 42
  cuando no, preguntándole al grupo si hay algo llamado `muro`.
- **El HUD en inglés** de los cuatro visualizadores propios que están en los 35
  (snake, fagocito, póker, blackjack). Quedan cuatro ficheros con inglés — usura,
  bestiario, grimorio, backgammon — que **no** son de los 35.
- **Aportar al corpus desde local** dejaba un `501` en consola (`servir.py` no acepta
  POST) y suspendía sokoban en el laboratorio. En local la casilla sale desmarcada y
  explicada: las partidas de un instrumento no deben entrar en el banco público.

**Visto y NO arreglado, por orden de lo que más se nota:**

1. **El ajedrez y el mancala cortados por el panel — A MEDIAS, y hay que saber por
   qué.** `encuadre.js` tiene ya `izquierdaLibre` y el motor lo aplica a sus cuatro
   juegos, pero **mide el panel UNA VEZ, al arrancar**. En local salió plegado y se
   vio perfecto; en producción el ajedrez arranca con el panel DESPLEGADO —sus
   selectores, el minimapa, los botones— y vuelve a comerse las columnas «a» y «b».
   Y si alguien pliega o despliega después, la cámara no se entera.

   Lo que falta son dos cosas, y ninguna es el desplazamiento en sí: **recolocar
   cuando el panel cambia de tamaño** (un `ResizeObserver` sobre `.hud-panel`) y
   calcular el desplazamiento por dónde cae el BORDE del tablero, no por una fracción
   del ancho de pantalla. Comprobarlo con el panel desplegado, que es como llega
   alguien nuevo.
2. ~~Las piezas del ajedrez~~ — **el diagnóstico era falso y el arreglo era otro.**
   Las 32 piezas siempre fueron Staunton torneadas y blancas; las volvía rosas un
   foco violeta a 2.5 contra un ambiente de 0.4. Era la LUZ. Arreglado, y medido en
   los diecisiete visualizadores: el ajedrez era el único así.
3. **El panel del go son 361 botones diminutos.** Feo, sí — pero *no lo toques sin
   leer esto*: es un mini-goban pulsable con la forma del tablero, y `tacto.mjs`
   garantiza que **los 35 juegos dejan pulsar TODAS sus jugadas con el dedo**. Poner
   un tope de 50, como hace el otro motor, rompería esa garantía justo en el juego
   con más jugadas. Si se cambia, tiene que ser por algo que las siga ofreciendo
   todas — no por recortarlas.
4. **El tapete del póker tiene un borde negro raro** arriba y las cartas flotan sin
   mesa clara. Ojo: **no es el fieltro ni sus sombras** —eso ya se arregló, y está
   contado en `SovereignCardEngine`—; es que la cámara está tan baja que se ve el
   canto de la mesa y el vacío negro de detrás. Se arregla subiendo la cámara del
   póker, no tocando el mueble.
5. **La cámara del go está tumbadísima**: el goban se pierde en el horizonte y las
   intersecciones de arriba quedan diminutas.
6. **Los cuatro caballos del ajedrez** son siluetas extruidas y desde la cámara por
   defecto se leen como una caja. Girarlos en vivo no cambió nada, así que hace falta
   mirar su geometría antes de tocar.
7. **El HUD del peatón** dice «ALIVE» y «SYNCED».
8. **La generala, antes de tirar, son cinco losas moradas vacías.** Se dibujan como
   cartas TAPADAS, y en un juego de dados eso no significa nada — un dado sin tirar
   no es un dado boca abajo. En cuanto se tira sale perfecto (comprobado: 1, 1, 4, 5,
   6 bien legibles en losas blancas), así que es sólo la primera pantalla. Que es,
   justamente, la que ve quien abre el juego.
9. **EL DESCARTE DEBAJO DEL PANEL: MEDIDO, ACOTADO, Y DOS INTENTOS FALLIDOS.**

   Proyectando cada pieza de la mesa a pantalla, con el panel desplegado a 1280x720:

       entropy   descarte en x=275, el panel llega a 340   → TAPADO
       remigio   descarte en x=159                          → TAPADO
       unit      descarte en x=357                          → a 16 px del borde
       brisca · tute · hearts · spades · gofish · guerra: sin descarte en mesa

   O sea **dos de once**, no «las mesas de cartas». En entropy importa de verdad —de
   ahí se roba, es la jugada— y encima es el juego del aviso del betatester.

   ⚠️ **«Las manos rivales salen desperdigadas» ERA FALSO.** No están desperdigadas:
   se salen de la pantalla (`mano_2_0` de x=−420 a 141, `mano_3_0` de 1137 a 1703) y
   eso es **deliberado y está explicado dos veces en `mesa_cartas.mjs`**: están boca
   abajo, de ellas sólo hace falta contar, y se sacrifican para que TU mano se lea
   (medido: el 72 % del semiancho). Otra lectura de captura que no sobrevivió a medir.

   ⚠️ **DOS INTENTOS DE APARTAR LA CÁMARA, LOS DOS PEOR. NO SE REPITAN A CIEGAS.**

   La idea era portar el `apartarDelPanel` del motor de tablero: correr cámara y
   objetivo juntos, mirando sólo mesa y mano propia —nunca las ajenas, que sacarían
   un desplazamiento de cientos de píxeles y desharían la decisión de arriba— y sin
   pasar del hueco libre por la derecha. La aritmética estaba bien (remigio pedía
   193 px y le sobraban 261). Lo que falla es otra cosa:

       signo −   entropy descarte −50 (fuera por la izquierda) · remigio mano a 1240
       signo +   entropy 344 (bien)                            · remigio descarte a 37

   El mismo signo mueve dos mesas en sentidos contrarios, así que no es un signo: es
   que `acercar()` arranca de `controls.target`, esto lo desplaza, y las dos cosas se
   pisan entre refrescos. Le puse un «deshacer el desplazamiento anterior» y siguió
   descuadrando, porque `acercar` ya había recolocado la cámara por su cuenta en
   medio.

   Se revirtió entero. **Quien lo retome que empiece por ahí**: hace falta que el
   apartado y `acercar()` no se pisen —un solo sitio que decida la posición final, o
   guardar la posición calibrada como hace `SovereignBoardEngine` con
   `_camaraOriginal`— antes de tocar un solo signo. Y que el dato importa poco: la
   cuenta de cartas de cada montón ya sale en el panel en texto.

10. ~~En las mesas de cartas, el panel tapa el descarte y las manos rivales salen
   desperdigadas.~~ (sustituido por el punto 9) Visto en unit: las cartas del rival caen por la mesa en ángulos
   sueltos —parecen tiradas, no una mano— y el montón de descarte queda medio debajo
   del panel. Lo del panel es el mismo problema que ya se arregló en el motor de
   tablero con `izquierdaLibre`: falta aplicarlo aquí, midiendo antes si su cámara lo
   admite, porque la composición de una mesa de cartas mira desde el jugador y no
   desde arriba.
10. ~~En cripta lo conocido queda descentrado~~ — **falso, medido**. El centro de lo
   sabido cae en (640, 360) de una pantalla de 1280×720: el centro exacto. Y tras 25
   jugadas explorando se mueve 32 px. El encuadre ya salta la niebla —`saltar:
   SIN_NIEBLA`— y centra bien. Lo que ocupa pantalla es la niebla **a propósito**:
   `mayor = max(sabido, todo/3)` limita el zoom para que una sola casilla conocida no
   llene la mesa. Si algún día molesta, es ese tercio lo que hay que discutir, no el
   centrado.

⚠️ **De los cinco puntos que escribí mirando las capturas, DOS eran diagnósticos
falsos** — «se salen de la pantalla» (estaban tapados) y «las piezas son cilindros»
(eran las luces). Mirar encuentra los problemas; sólo medir dice cuál es la causa. Y
un arreglo hecho sobre un diagnóstico de vista habría sido apartar la cámara y
modelar piezas nuevas: mucho trabajo, y ninguna de las dos cosas era el problema.

### ✅ PEATÓN: RESUELTO, Y NO ERA NADA DE LO QUE PONÍA AQUÍ

**Era un `z-index` que faltaba.** Los otros treinta y dos juegos cuelgan su panel de
`.overlay`, que lleva `z-index: 10` y gana al lienzo. Peatón lo cuelga de
`#hud-container`, que se quedaba en `auto`: el `#canvas-container` —`absolute`,
`z-index: 1`— le pasaba por delante y se comía los toques. Los botones se **veían**
perfectamente, en su sitio y con su rótulo, y no respondía ninguno.

Medido en móvil (390x844), que es donde mide `tacto` y donde yo no estaba mirando:
**0 de 5 sin tocar nada, 5 de 5 con la línea puesta**, con Playwright diciendo que
otro elemento intercepta. Y contados los 35 uno a uno: peatón era el único.

Una línea en `jugables.css`. Ahora peatón da **5/5 con dedo y 5/5 con ratón**, y
pradera, nave, damas y brisca siguen en pleno.

**Lo que costó llegar, que es la parte que vale:**

- En **escritorio las cinco llegaban siempre**. Toda la teoría anterior —el panel se
  reconstruye cada segundo, el dedo baja en un nodo y se suelta en otro— se midió en
  la pantalla equivocada. El repintado existe y es real: **también lo hace pradera,
  que iba bien.** O sea que nunca fue la causa.
- La firma para no repintar, que empeoraba pradera de 4/4 a 1/4, estaba arreglando
  algo que no estaba roto. Queda anotada en `jugadas.js` como lo que era.
- Y una vez más el orden que funciona: `elementsFromPoint` dio la pila entera bajo el
  dedo —`canvas < canvas-container < button`— y eso, que es un dato y no una teoría,
  se contestó probando tres CSS candidatos EN VIVO antes de escribir nada en disco.

### ⚠️ (histórico) PEATÓN: 2 DE 5 JUGADAS NO LLEGAN AL PULSARLAS

Antes bailaba (3/5, 5/5, 4/5) y no se sabía si era el juego o la vara. Arreglada la
vara —`tacto` ahora cuenta la jugada que LLEGA al hub, no si el estado cambió—, el
número es **2/5 estable en cinco pasadas**, mientras pradera, nave, damas y brisca
dan pleno igual de estable. O sea que es de peatón y hay que arreglarlo.

Lo medido hasta ahora:

- El panel de peatón **se reconstruye entero cada segundo** aunque las jugadas sean
  las mismas: comprobado que el botón tiene el mismo texto y es **otro nodo** un
  segundo después. Esa es la sospecha principal — el dedo baja sobre un nodo y lo
  suelta sobre otro.
- **Y no se arregla con una firma que evite repintar.** Lo probé: peatón se queda en
  2/5 y **pradera empeora de 4/4 a 1/4**. Está escrito en `jugadas.js`, con los
  números, para que el siguiente que tenga la idea sepa que ya se probó.
- Falta entender por qué la firma estropea pradera. La hipótesis es que los
  manejadores de los botones viejos quedan atados a una lista de jugadas que ya
  cambió, y en pradera cambia en cada latido.

### ⚠️ EL OTRO INTERMITENTE (blackjack en `mirar`), TODAVÍA SIN EXPLICAR

15-08, en pasadas completas y sin tocar nada en medio:

- `mirar` dio **34/35 señalando blackjack**, y la pasada siguiente 35/35.
- `tacto` dio **34/35 señalando peatón** — y peatón es LA GARANTÍA del proyecto, así
  que asusta. Probándolo solo, dos veces seguidas: **5/5 y 5/5**.

No se dan por arreglados: un intermitente es un fallo que todavía no sabes
reproducir, no un fallo que no existe.

**La hipótesis, y explica los dos: el juego se mueve mientras se le mide.** Peatón
avanza solo —medido: ~1 jugada por segundo, sin tocar nada— y blackjack termina en
pocas jugadas. Los dos instrumentos prueban botón por botón; si entre uno y otro el
mundo avanza, la lista de jugadas legales que tenían en la mano ya no es la que hay,
y la prueba pulsa algo que dejó de existir. En una pasada de 35 juegos el navegador
va más cargado y los huecos entre pulsaciones se alargan — por eso sale ahí y no al
probarlos sueltos.

Si se confirma, el arreglo no es del juego: es que los instrumentos marquen **qué
juegos avanzan solos** (el laboratorio ya sabe detectarlos: pregunta si el estado
cambia sin tocar nada) y midan esos con el reloj parado o con reintento.

## Cómo se comprueban las cosas aquí

### ⚠️ Cómo se despliega esto, que no estaba escrito en ningún sitio

**`git push` NO despliega.** Lo comprobé a la mala el 15-08: subí ocho commits, esperé
ocho minutos viendo cómo el dominio seguía sirviendo el sello anterior, y me puse a
sospechar de la caché de Cloudflare. No era la caché. Era que **el sitio no se publica
desde el repositorio**:

    wrangler.toml → pages_build_output_dir = "dist_publico"
    .gitignore    → dist_publico/          ← no está versionado

O sea que Pages publica una carpeta que el repositorio no contiene. Se genera y se
sube a mano:

    npm run empaquetar                       # regenera dist_publico (~2 min, 63 MB)
    npx wrangler pages deploy dist_publico --project-name=alisa-systems --branch=main
    node comprobar_desplegado.mjs https://alisa.systems

`wrangler` ya está autenticado en esta máquina, así que no hace falta ninguna clave.
Y el «Deployment complete!» **no significa que el dominio ya lo sirva**: hay que
esperar a ver el `VERSION` nuevo en `/arcade/js/montarMesa.js`, como avisa
`desplegar.mjs` para el worker de mesas.

    npm test              14 comprobaciones: reglas, sustrato, puerta de lenguaje,
                          objetivo, el repetidor, el final de partida, CSS, la API,
                          el sellado, los entornos del gym y el verificador
    npm run laboratorio   abre los 35 en un Chrome de verdad y los MIDE
    npm run legibilidad   lo que el sustrato dice que existe, ¿SE VE? (54 medidas)
    npm run mirar         la pasada de betatester en tres pantallas
    node tacto.mjs        que una jugada legal LLEGUE con el dedo y con el ratón
    npm run avisos        lo que han contado los betatesters, y RE-JUEGA cada uno
    npm run cache         que un despliegue llegue entero al dominio

El laboratorio es el que caza lo que vive entre las reglas y la pantalla, que es
donde estaban casi todos los fallos de esta semana. Deja 31 capturas: mirarlas es
medio minuto y ninguna prueba lo sustituye.

**Lo que NO cubre ningún instrumento:** que el repetidor funcione de verdad en el
navegador. `prueba_repetidor` comprueba que los cuatro caminos de panel tienen el
cable y que el enlace basta para re-simular, pero eso es estructura y aritmética. Que
la mesa repinte jugada a jugada se comprobó **a mano**, un juego por motor (ajedrez,
blackjack, guerra, damas, fagocito). Meterlo en el laboratorio significaría abrir los
35 dos veces y doblar sus diez minutos; no parece que compense hoy, pero conviene
saber que ese hueco existe.

**Y toda prueba nueva se rompe a propósito antes de creérsela, con el sabotaje
ESCRITO en su cabecera.** No es ceremonia: las tres comprobaciones nuevas del 15-08
se quedaron verdes con el cable cortado, y las tres por la misma razón —buscar un
nombre dentro de un fichero no dice nada sobre si se ejecuta—:

    includes('crearRepetidor')   aprobaba  crearRepetidorZZZ      (subcadena)
    includes('activeElement')    aprobaba  una función huérfana   (seguía escrito)
    includes('estaEscribiendo()') aprobaba  su propia definición  (`function …()`)

La regla que queda: **una comprobación por texto no vale hasta que la has visto
suspender con el cable cortado de verdad.** Y el corolario práctico: el sabotaje
concreto va escrito en el comentario de la prueba, para que el siguiente pueda
repetirlo en diez segundos en vez de fiarse de que alguien lo hizo una vez. No es ceremonia:
`prueba_repetidor` cazó que el enlace no llevaba las `normas` sólo porque la
saboteé para ver si sabía suspender, y su comprobación de cableado se quedó verde
con el cable cortado hasta que se afinó la marca. Una prueba que nunca ha fallado
no es una prueba: es una frase.

---

## La lección de la semana, en una frase

**Aquí los fallos no dan error: dan verde y mienten.** La brisca repartía entropy,
las cartas de número llevaban años con 1,8 % de tinta, el póker no tenía forma de
jugar, el ajedrez salía a escala ×8, las salas compartidas sólo funcionaban en los
juegos de cartas, y el panel plegado escondía los botones en todos los móviles.
Ninguno lanzó una excepción. Todos se encontraron MIRANDO o MIDIENDO.

Corolario que costó tres falsos positivos hoy: **cuando un instrumento nuevo suspende
a mucha gente, el sospechoso es el instrumento.** 19 de 31, luego 31 de 31, luego
tres — y las tres veces el que estaba mal era yo, no los juegos.

**15-08, la misma lección por otro lado: contar en vez de suponer.** Monté el
repetidor en «los dos motores» y di el trabajo por terminado. Había **tres** caminos
de panel, no dos, y cuatro juegos —el ajedrez entre ellos— generaban su enlace y
abrían una partida cualquiera. Lo destapó ir a mirar un aviso de fagocito dando por
hecho que usaba ese motor: la sospecha era **falsa** y aun así encontró el hueco,
porque obligó a contar. La conclusión no es «desconfía»: es que un número que no has
contado nunca no lo sabes, aunque hayas trabajado en él toda la tarde.

Y una tercera, del mismo día: **la pregunta «¿y ahora qué?» hay que hacérsela a cada
pantalla que se queda quieta.** Al terminar una partida no había salida en ninguna de
las 35 mesas —y 17 juegos ofrecían el botón, que el panel tiraba en su primera
línea—. Lo arreglé, y tres pantallas más allá cometí el mismo fallo otra vez: al
acabar de VER una repetición, la página se quedaba igual de muerta.
