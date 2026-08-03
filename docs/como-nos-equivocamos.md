# Cómo nos equivocamos

Este documento existe porque un banco de pruebas que no publica sus propios
fallos está pidiendo que te fíes de él. Aquí están los nuestros, con nombre,
fichero y cómo se cazaron.

Casi todos comparten una forma: **el programa funcionaba**. No había excepciones,
ni pantallas en blanco, ni pruebas en rojo. Se ejecutaba entero y devolvía un
número. Sólo que el número medía otra cosa.

---

## 1. El ajedrez no puntuaba

`rules/ajedrez.js`, y lo mismo en `damas.js` y `xiangqi.js`.

Los tres juegos se jugaban, eran deterministas y sus partidas se verificaban —las
tres comprobaciones en verde—. Pero `estado()` no publicaba ningún marcador, así
que la puntuación era **0 en toda partida, jugara quien jugara**. El juego
insignia del catálogo era, como banco de pruebas, un termómetro sin mercurio.

**Cómo se cazó.** Ninguna de las pruebas que había podía verlo: todas preguntaban
«¿funciona?». Hizo falta escribir `calibrar.mjs`, que pregunta otra cosa —**¿cambia
el número según quién juegue?**— y saca `MÉTRICA CONSTANTE`.

**La lección.** Que un entorno se ejecute y que un entorno mida son dos
propiedades distintas y necesitan dos pruebas distintas. `npm test` comprueba la
primera; `npm run calibrar`, la segunda.

---

## 2. El go publicaba la puntuación del rival

`Verificador.js`, en la función que normaliza los puntos:

```js
// Tablero: el marcador del primer jugador.
return st.score.white ?? st.score.black ?? 0;
```

El comentario dice «el primer jugador» y el código pregunta por `white`. **En el
go y en el reversi abren las negras.** Durante todo un día, una partida de go
reportaba 269,5 cuando el agente había hecho 69 puntos y le habían comido 231
piedras: el número de la tabla era el de quien le estaba ganando.

Y no rompía nada visible. Verificaba —los dos lados calculaban igual de mal—, era
determinista y separaba políticas. **Un banco de pruebas puede estar sano en
todos los indicadores que te hayas molestado en mirar y estar midiendo al
contrario.**

**Cómo se cazó.** Con un control: el arnés de agentes tiene un participante,
`--modelo eco`, que elige siempre la primera opción. Su resultado **tiene que**
coincidir con la política tonta del calibrador, que es otro programa por otro
camino. En go dieron 271,5 y 63,5.

**La lección.** Ninguno de los dos caminos era «el bueno» por sí solo. Lo que
informaba era que no coincidieran. Dos implementaciones independientes de lo
mismo valen más que una implementación con muchas pruebas.

---

## 3. Adivinar el nombre del asiento

`turno.js`, primera versión.

Para saber si le tocaba al jugador medido, comparaba contra una lista de nombres:
`player`, `white`, `red`… La suite tiene dos convenciones heredadas —los tableros
hablan de blancas y negras, las cartas de `player` y `cpu1`— y el póker no
publica turno.

El calibrador preguntaba `turn === 'player'`, que en los nueve juegos de tablero
**nunca** es cierto: le daba las dos manos al rival de casa y declaraba «no
distingue» de medio catálogo. Una conclusión falsa y *pesimista*, que es la clase
que nadie va a revisar.

**La lección.** No hay que adivinar el nombre del asiento: el juego ya dice quién
abre, y preguntar es gratis. Cualquier lista de nombres se queda corta en cuanto
entra un juego con otra convención, y se queda corta en silencio.

---

## 4. El rival de las damas era la política tonta con otro nombre

`rules/damas.js`. La heurística contaba las capturas así:

```js
const comidas = pasos.length - 1;
```

Una captura simple (`c3e5`) y un avance cualquiera (`a3b4`) son los dos dos
casillas de texto. Con todas las jugadas empatadas a «una comida», decidía el
desempate y ganaba la primera de la lista. Medido: **en 600 jugadas no discrepó
ni una sola vez** de elegir la primera jugada legal.

Lo mejor es que ese error exacto **está documentado y corregido veinte líneas más
arriba**, en `captura_obligada`, con su comentario explicando que una captura se
reconoce porque SALTA. Se arregló en un sitio y no en el otro.

**La lección.** Cuando encuentres un error de interpretación, busca el mismo
malentendido en el resto del fichero. Rara vez está solo.

---

## 5. Un comentario que describía código que no existía

`rules/bazas.js`. El comentario del rival de casa decía: «juega la carta más
floja que le sirva, y si puede ganar la baza barata, la gana».

Lo que hacía era soltar siempre la más fuerte, sin mirar la baza ni una vez.

Es la clase de mentira que no rompe nada: el juego funciona, el rival mueve,
nadie se queja. Sólo que brisca, hearts y spades —los tres del mismo módulo—
salían «sin señal» en la calibración.

**La lección.** Un comentario que describe una intención no cumplida es peor que
no tener comentario, porque impide que alguien vaya a mirar.

---

## 6. Una métrica que premiaba perder

`rules/unit.js`. La puntuación era «valor de las manos rivales menos la mía»:
denso, y coincide con el marcador clásico del juego cuando ganas. Parecía
razonable. Medido sobre 300 semillas con tres políticas:

| política | gana | puntos |
|---|---|---|
| guarda comodines | **99/300** | 28,8 |
| primera legal | 92/300 | 34,7 |
| suelta comodines | 81/300 | **39,8** |

**La que más gana es la que menos puntúa, y al revés.** La métrica premiaba
deshacerse de comodines, que es justo lo que pierde partidas. Un agente que
optimizara ese número habría aprendido a jugar peor.

**La lección.** Una métrica hay que probarla con al menos dos políticas de
calidad distinta antes de creérsela. Si la mala gana, la métrica apunta al revés.

---

## 7. Un juego que se moría de pie

`rules/gofish.js`. Se llegaba a `manos [0,3,0] · mazo 1`: el único jugador con
cartas no tenía a quién pedir, y como quedaba una carta en el mazo la partida
tampoco estaba terminada. **Ni seguía ni acababa**, y el estado seguía diciendo
`is_game_over: false`.

Faltaba una jugada obvia: si no puedes pedirle a nadie, robas.

**Cómo se cazó.** La política tonta terminaba las 200 semillas sin rozar ese
estado. Sólo cayó el jugador bueno.

**La lección.** **La línea base floja no visita los rincones del espacio de
estados.** Un verde sacado sólo con ella no significa gran cosa. Desde entonces,
`prueba_reglas.mjs` juega cada juego dos veces: con la política floja y con la
buena.

---

## 8. Siete copias del azar

`mulberry32` —el generador del que cuelga **toda** la verificación— estaba
copiado en siete ficheros de reglas, y las copias ya se habían separado en dos
escrituras distintas.

Comprobado: eran equivalentes (7 semillas × 5000 tiradas, misma secuencia). No
había fallo. Pero siete copias del azar en un proyecto cuya tesis es «te
re-simulo la partida» es una escopeta cargada: el día que alguien mejore una,
los juegos de esa copia empiezan a rechazar partidas legítimas y nada avisa.

**Cómo se comprobó el arreglo.** Con las huellas de reglas, que existían para
detectar tramposos: si unificar el generador movía una sola partida, las 16
firmas cambiaban. No se movió ninguna.

---

## 9. Dos barajas del catálogo no eran cargables

`card_library.json` declara `extends` desde siempre: `spanish_48` hereda los
palos de `spanish_40`, `french_54` hereda todo y añade comodines. **Ningún
cargador lo implementaba.** Dos de las seis barajas no se podían cargar y nadie
se había enterado, porque los juegos que había usaban las dos que no heredan.

Peor: el respaldo hacía `{ ...RESPALDO[nombre] }`, y para una baraja sin respaldo
eso da `{}` — un objeto que **parece** una baraja, pasa por tres funciones y
revienta mucho después con un `Cannot read properties of undefined`.

**La lección.** El respaldo es el camino que menos se prueba. Si no sirve, tiene
que fallar alto y en el sitio, no bajo y tres funciones más allá.

---

## 10. Hacer lo correcto y perder

`rules/reversi.js`. El rival de casa hacía lo que dice el manual de Othello:
coger esquina, esquivar las casillas de al lado, y **minimizar volteos** —comer
poco pronto conserva movilidad, y es la trampa clásica del juego—.

Sacaba 17 puntos contra los 39 de elegir la primera casilla legal.

Minimizar volteos sin mirar una jugada por delante te deja a veces con dos fichas
en el tablero, y ahí no hay movilidad que valga: te barren en 27 jugadas. La
heurística era buena y el horizonte demasiado corto para sostenerla.

**La lección.** Una heurística correcta aplicada sin la profundidad que necesita
puede ser peor que ninguna.

---

## 11. El instrumento expulsó a un juego sano

`tabla.mjs` descartó al spades con el motivo «la casa no supera al suelo».
Comprobado aparte con 400 semillas: la casa saca 3,00 y el suelo 2,17. La casa
**sí** estaba arriba — el hueco es de 0,8 puntos y se estaba midiendo con **tres
partidas**.

**La lección.** Un guardia que descarta entornos sanos es peor que no tener
guardia, porque su veredicto suena a diagnóstico. Y lo que lo arreglaba era
gratis: el suelo y el techo son políticas de código, no cuestan ni un token.
Quien limita las semillas es el modelo, no la regla — así que ahora la regla se
mide con muchas más partidas que lo que se mide con ella.

---

## 12. La misma condición mal escrita dos veces el mismo día

En `calibrar.mjs` primero y en `tabla.mjs` después:

```js
significativo = Math.abs(d) > 2 * se && se > 0     // ← el guardia sobra
```

Los juegos de tablero salen de posición fija: todas las partidas son idénticas y
el error típico es exactamente 0. Con ese guardia, una diferencia limpísima se
declaraba «sin señal» — **cuando un ruido nulo es la señal más fuerte que
existe**, no la más floja.

Se corrigió en el primer fichero por la mañana y se volvió a escribir igual de
mal en el segundo por la tarde, de memoria.

**La lección.** Una condición sutil copiada de memoria se copia mal. Está anotado
en el código: si aparece una tercera vez, se va a un módulo común.

---

## 13. La CI habría fallado en el primer empujón

`check_gym_envs.mjs` importaba el índice del motor entero, que arrastra el
renderizador y con él `three`. En una máquina de desarrollo con `node_modules` no
se nota; en el runner de CI, donde no los hay, revienta.

**Cómo se cazó.** Apartando la carpeta `node_modules` y ejecutando la cadena
completa, que es la única forma de ver lo que verá el runner.

**De propina:** quedó demostrado que el contrato del gym no necesita
renderizador. Los entornos arrancan sin `three`.

---

## 14. Reimplementar lo que ya existía (tres veces en un día)

`puntuacionDe()` vive en `Verificador.js` y normaliza los puntos de cada juego.
Se reescribió por su cuenta:

- en `ProtoHubEnv`, donde `Number({black, white})` daba `NaN` → `0`, y tres
  juegos emitían recibos de «0 puntos» que **el servidor rechazaba como
  inválidos** — el peor fallo posible en un banco de pruebas que presume de
  verificar;
- en `prueba_reglas.mjs`, que leía `estado.puntos` a pelo y daba seis juegos
  «rotos» que estaban perfectos.

**La lección.** El fallo no es el `NaN`. El fallo es reimplementar algo que ya
existe, y ocurrió el mismo día en que se arreglaron seis listas escritas a mano
por exactamente la misma razón.

---

## 15. La lista escrita a mano dentro del fichero contra las listas escritas a mano

`rules/index.js` se creó para que la lista de juegos existiera **en un solo
sitio**, después de arreglar seis divergencias del mismo tipo en un día. Su
propio diccionario de títulos era una lista escrita a mano, y se quedó corta en
cuanto se añadieron tres juegos.

Ahora los títulos se derivan de las claves, con excepciones sólo para las tildes.

**La lección.** Una lista paralela no se arregla rellenándola. Se arregla
haciendo que no pueda existir.
