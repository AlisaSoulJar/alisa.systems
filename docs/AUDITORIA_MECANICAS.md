# Auditoría de mecánicas: cómo entran y se mueven las tres audiencias

Comprobado el 6 de agosto de 2026 contra el despliegue, con navegador y con
lectura de código. Lo que aquí se afirma se ha medido; lo que no, se dice.

La promesa del sitio es «mismas reglas para personas y para máquinas». Esta
auditoría mira si eso se sostiene en las **mecánicas**, no en las reglas: cómo
se entra, cómo se mira, cómo se toca una máquina, y cómo se encuentran unos con
otros.

---

## 1. Las puertas — quién entra por dónde

| audiencia | puerta | estado |
|---|---|---|
| **Persona** | La Sala del Huevo, 3D, 27 estaciones | funciona |
| **Agente LLM** | `POST /api/gym` — 19 entornos | funciona |
| **Política / FSM** | la misma `/api/gym`, o el motor en local | funciona |
| **Unos con otros** | — | **no existe** |

Las dos primeras puertas están probadas de punta a punta. La tercera no está
empezada, y es la conclusión importante de este documento: **hay dos mundos
disjuntos**. Una persona en la sala no ve jamás a un agente; un agente no ve
jamás la sala. Juegan a los mismos juegos, con las mismas reglas y contra el
mismo verificador — pero nunca coinciden en el mismo sitio.

---

## 2. Movimiento (persona)

| mecánica | estado |
|---|---|
| andar y esquivar (WASD) | ✅ |
| mirar con bloqueo de puntero | ✅ cuando el navegador lo concede |
| mirar arrastrando | ✅ **el que salva la sala** |
| mirar en táctil (dos zonas) | ✅ |
| **colisión con los muebles** | ❌ **no hay** |
| **límites del mundo** | ❌ **no hay** |

El bloqueo de puntero **se niega** en los navegadores donde se ha probado
(`WrongDocumentError`), así que en la práctica el camino real de mirar es el de
arrastrar. Es el único motivo de que la sala sea jugable, y por eso conviene
tratarlo como el principal y no como respaldo.

Sin colisión ni límites se atraviesan las máquinas y se puede andar hacia fuera
indefinidamente. No rompe nada —no hay nada que romper ahí fuera— pero es lo
primero que prueba cualquiera que haya jugado a algo en primera persona.

---

## 3. Foco — no es un rayo, es un cono

Esto es una decisión de diseño que conviene conocer porque explica el
comportamiento raro:

```js
if (dist < 26) {
  const v = (posición de la estación − cámara).normalize();
  const alineado = v.dot(haciaDelante);
  if (alineado > mejorAng) mejor = e;      // gana la MÁS alineada
}
```

No hay `Raycaster`: se elige la estación **mejor alineada con la mirada dentro
de 26 metros**. Consecuencias:

- se engancha una máquina a quince metros, sin haber llegado a ella;
- no hace falta apuntar fino, lo que en táctil es una ventaja;
- pero **nada comprueba que la tengas delante de verdad**, y de ahí venía que
  «sentarse» te dejara mirando un sello a lo lejos hasta que la cámara aprendió
  a acercarse.

La materialización sí es por distancia real (entre 46 y 30 m).

---

## 4. Tocar una máquina o una mesa

El recorrido actual, verificado en el navegador:

```
apuntar (cono) → clic → la cámara entra interpolada a 2,6 m
             → el cartucho carga el juego en la pantalla del mueble
             → clic en la pantalla → PANTALLA COMPLETA
```

Verificado: un clic carga `ALISA Arcade — Reversi Arena`, 0 errores de consola.

**⚠️ Pero el último paso está roto.** El gancho que convierte el clic en
pantalla completa vive dentro del iframe y no llega a instalarse nunca:

```
Cross-origin frame single-click blocked.   ×97
  CSS3DHologramPlugin.js:388
```

Ese `catch` se traga el fallo con un aviso, así que el juego se ve, es clicable
—`pointerEvents: auto`— y **no entra en pantalla completa**, que es justo donde
se juega cómodo. Además se dispara casi cien veces, así que algo está montando
el cartucho una y otra vez.

Es el mismo patrón de siempre: **no hay ningún error, hay un aviso**, y el
resultado es una función que no existe sin que nada se rompa.

---

## 5. Qué puede tocar cada audiencia

De las **27 estaciones**, sólo **13 declaran un entorno de gym** — y las 13 son
reales, reconocidas por el registro. Las otras 14 son sólo para personas.

Al revés también cojea: el gym publica **19 juegos**, y ocho de ellos —brisca,
tute, hearts, spades, guerra, gofish, unit, entropy— **no tienen estación en la
sala**. Un agente puede jugarlos; una persona no.

```
        en la sala          en el gym
persona    27                   —
agente      —                  19
ambos      13
```

Ningún juego de cartas nuevo está en la sala, y catorce estaciones no se pueden
medir. La intersección es menos de la mitad por los dos lados.

---

## 6. Unos con otros: nada, y las piezas ya están

No hay sincronización, ni avatares de otros, ni asientos ocupados. La sala es
estrictamente de un ocupante.

Y sin embargo `ArcadeRoomManager` —que la sala no usa— se describe a sí mismo
como *MMO-ready*, lleva el estado de cada asiento serializable y tiene ganchos
de sincronización (`/overworld/sync`). `ArcadeTableRoomFactory` tiene
`onSit`/`onStand`. Están hechos y sin conectar, igual que [las mesas de
cartas](../docs/README.md).

Para que las tres audiencias **se encuentren** hacen falta dos cosas, y ninguna
es motor nuevo:

1. **Presencia**: que la sala publique quién está sentado dónde y lo lea de
   vuelta. El estado ya es serializable.
2. **Un cuerpo para el agente**: hoy un agente juega por `/api/gym` sin existir
   en el espacio. Bastaría con que ocupar un asiento fuera parte de la partida
   —el mismo recibo, más el asiento— para que una persona lo viera sentado
   enfrente.

---

## 7. Resumen de hallazgos

| # | hallazgo | gravedad |
|---|---|---|
| 1 | el clic a pantalla completa nunca se instala (97 avisos) | **alta** — rompe el paso final de jugar |
| 2 | algo re-monta el cartucho ~100 veces | media — fuga silenciosa |
| 3 | sin colisión ni límites de mundo | media — se atraviesan los muebles |
| 4 | 14 de 27 estaciones no son medibles | media — la mitad de la sala no puntúa |
| 5 | 8 juegos del gym no existen en la sala | media — asimetría al revés |
| 6 | el bloqueo de puntero se niega siempre | baja — el respaldo funciona, pero es el camino real |
| 7 | cero presencia entre audiencias | **alta como producto** — es la promesa que falta |
