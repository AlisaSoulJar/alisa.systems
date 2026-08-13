# Dónde nos quedamos — 12 de agosto de 2026

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

### 5. Pendientes menores, ya medidos

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

    npm test              las reglas, el sustrato, la puerta de lenguaje, el sellado
    npm run laboratorio   abre los 35 en un Chrome de verdad y los MIDE
    npm run avisos        lo que han contado los betatesters, y RE-JUEGA cada uno
    npm run cache         que un despliegue llegue entero al dominio

El laboratorio es el que caza lo que vive entre las reglas y la pantalla, que es
donde estaban casi todos los fallos de esta semana. Deja 31 capturas: mirarlas es
medio minuto y ninguna prueba lo sustituye.

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
