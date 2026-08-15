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
