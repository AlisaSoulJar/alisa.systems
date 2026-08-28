# alisa_gym — los 40 juegos de alisa.systems, con la API de Gymnasium

Una envoltura de Python sobre la puerta pública de alisa.systems. Te deja jugar
a los 40 entornos del banco **sin instalar nada de este proyecto**: sólo
`gymnasium` y la biblioteca estándar. Un fichero, sin dependencias raras, sin
`requests`.

La puerta no tiene estado. Le mandas la partida **entera** y el servidor la
re-simula desde la semilla. Eso es lo que hace que la puntuación no sea algo que
tú declaras, sino algo que cualquiera puede recalcular.

## Instalación

```bash
pip install gymnasium
```

Y ya. Copia `alisa_gym.py` donde te venga bien, o añade esta carpeta al
`PYTHONPATH`. Probado con **Python 3.12** y **gymnasium 1.2.3**.

## Jugar (diez líneas que funcionan de verdad)

```python
import random
from alisa_gym import AlisaEnv

env = AlisaEnv("brisca")
obs, info = env.reset(seed=7)
terminada = False
while not terminada:
    accion = random.choice(info["acciones"])          # las legales AHORA
    obs, recompensa, terminada, truncada, info = env.step(accion)
print(obs)                                            # la descripción final
print(env.verificar())                                # la puerta recalcula
```

Salida real de una ejecución, tal cual:

```
Brisca. Puntos: 48. Turno: cpu3. Triunfo: O. Rivales con 0 0 0 cartas.
Marcador: 48 30 18 24. Quedan 0 cartas en el mazo. bazas: [3,3,1,3].
La partida ha terminado.
{'valida': True, 'puntos': 48, 'motivo': None, 'jugadas': 40, 'declarados': 48, 'ms': 0}
```

⚠️ **Los números cambian en cada ejecución, y no es un fallo.** `seed=7` fija el
reparto de cartas, pero `random.choice` no está sembrado: la que va cambiando es
*tu política*, no la partida. Si quieres repetir una ejecución exacta, siembra
también tu generador (`rng = random.Random(1)`) o guarda `env.jugadas`. Lo que sí
es fijo con `seed=7` es la mano inicial: `O_2 B_4 P_2`, triunfo `O`.

### Ver qué hay

```python
import alisa_gym
cat = alisa_gym.catalogo()
for e in cat["entornos"][:3]:
    print(e["juego"], e["titulo"], e["huella"], e["acciones_al_empezar"])
# ajedrez Ajedrez a9550c46 20
# go      Go      4ccc0fc8 362
# reversi Reversi eeb09ff6 4
```

Los 40: `ajedrez, go, reversi, damas, xiangqi, mancala, snake, fagocito, peaton,
blackjack, poker, brisca, tute, hearts, spades, guerra, gofish, unit, entropy,
sokoban, marea, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebano,
pradera, nave, shinigami, remigio, chinchon, alisapolis, parchis, generala, oca,
canadiense, domino`.

### Poner un techo de pasos

`truncated` es siempre `False` aquí (ver limitaciones). Si quieres cortar por
número de jugadas, usa la pieza que Gymnasium ya trae:

```python
from gymnasium.wrappers import TimeLimit
env = TimeLimit(AlisaEnv("ajedrez"), max_episode_steps=100)
```

Comprobado con `max_episode_steps=3`: a los 3 pasos devuelve `terminated=False`,
`truncated=True`. Es decir, el truncado sale de donde tiene que salir.

### Comprobar la partida de otro

`verificar()` no necesita que la partida sea tuya. Con `{juego, semilla, jugadas,
puntos}` cualquiera re-simula y compara:

```python
env = AlisaEnv("brisca")
env.reset(seed=7)
env.jugadas = ["jugar:O_2", "jugar:E_7"]   # la partida de otro
print(env.verificar(puntos=0))
```

## Comprobar que funciona

```bash
python probar.py                # brisca (corta) + ajedrez (larga)
python probar.py go reversi     # los que quieras
```

Juega contra alisa.systems de verdad — no hay simulacro. Sale `0` si todo pasa y
`1` si algo falla. Comprueba que `reset` da acciones, que `step` avanza, que al
terminar `terminated` es `True`, que `sum(reward)` cuadra con los puntos finales,
y que `verificar()` acepta la partida.

## ⚠️ Trampas que cuestan una tarde

### El User-Agent de urllib está baneado

Un cliente Python ingenuo **falla el 100% de las veces, en la primera llamada**.
Cloudflare tiene vetada la firma `Python-urllib/3.12`. Medido:

| User-Agent | Respuesta |
|---|---|
| por defecto (`Python-urllib/3.12`) | `403` · `text/plain` · `error code: 1010` |
| `Mozilla/5.0` | `200` · `application/json` |
| `alisa-gym-python/1.0` | `200` · `application/json` |

`alisa_gym` manda un UA propio, así que a ti no te pasa. Pero si escribes tu
propio cliente en otro lenguaje, es lo primero que te va a morder. No hace falta
fingir ser un navegador: vale cualquier UA que no sea el de urllib.

### Cuando se cae, no contesta JSON

Si haces `json.loads` a pelo, una caída te da
`Expecting value: line 1 column 1 (char 0)`, que no dice nada de nada. La puerta
caída devuelve HTML de Cloudflare, o texto plano. `alisa_gym` lo detecta y
levanta `RespuestaNoJSON` con el código HTTP y el principio del cuerpo:

```
La puerta no devolvió JSON.
  url:            https://alisa.systems/api/gym
  HTTP:           502
  content-type:   text/html; charset=UTF-8
  cuerpo[:400]:   <!DOCTYPE html><html><head><title>alisa.systems | 502: Bad gateway...
```

Detalle útil: mandando `Accept: application/json` (lo que hace esta envoltura),
Cloudflare negocia el contenido y devuelve sus propios errores **como JSON**, con
`error_code` y `detail` dentro. Entonces sale un `ErrorDeLaPuerta`, que explica
todavía mejor lo que pasó.

### Una jugada rechazada llega con HTTP 200

La puerta **no usa un código de error** para una jugada ilegal. Devuelve `200`
con el campo `rechazada` relleno y el estado *anterior*. Un cliente que sólo mire
el código de estado seguiría jugando tan feliz sobre un estado que no avanzó
nunca. `alisa_gym` lo convierte en excepción:

```python
try:
    env.step("esto_no_es_una_jugada")
except alisa_gym.JugadaRechazada as e:
    print(e.motivo)            # 'jugada ilegal en ese momento'
    print(e.legales_entonces)  # ['a2a3', 'a2a4', ...]  (ojo: no siempre viene)
```

La jugada rechazada **no** se queda en `env.jugadas`, así que puedes reintentar
con otra sin arrastrar basura.

### El campo `jugadas` de la respuesta es un número

Lo que la puerta devuelve en `jugadas` es un **entero** (cuántas ha procesado),
no el array que le mandaste. Y cuenta también la rechazada. Para evitar el lío:

- `info["jugadas"]` → el **array** de la partida (lo que necesitas para
  reproducirla o verificarla).
- `info["jugadas_contadas"]` → el entero del servidor, por si lo quieres.

## LIMITACIONES

Honestamente, y por delante:

**No hay vector numérico de observación.** La puerta da texto: `descripcion` (una
frase con el estado) y a veces `mapa` (un dibujo ASCII). Esta envoltura **no se
inventa** un vector. El vector existe, pero vive en el JavaScript del motor y no
sale por la puerta pública. En la práctica: esto sirve a **agentes de lenguaje y
a políticas sobre texto**, no a RL numérico clásico. Si quieres meter aquí un
DQN, el codificador lo tienes que escribir tú — tienes materia prima en
`info["estado"]`, que sí llega como diccionario estructurado.

**El espacio de acciones es dinámico.** `action_space` es un `spaces.Text`, y las
jugadas legales de cada turno van en `info["acciones"]` — el mismo patrón que usa
PettingZoo con sus máscaras. **No** es un `Discrete(n)`, y no por pereza: el
índice 3 significa una jugada distinta en cada turno. Comprobado en brisca, tras
una sola jugada la mano pasa de `[O_2, B_4, P_2]` a `[E_7, B_5, B_2]`. Una
política que aprendiera «el 3 es bueno» estaría aprendiendo ruido. El índice no
nombra nada estable. Consecuencia: los algoritmos de RL de estantería (SB3 y
compañía) **no encajan aquí sin adaptarlos**.

**Cada jugada re-simula la partida entera.** La puerta no tiene estado: no guarda
tu partida. Cada `step()` manda el array completo de jugadas y el servidor la
re-juega desde la semilla. Es el precio de que la puntuación sea verificable por
un tercero. Medido hoy contra alisa.systems:

| Medida | Valor |
|---|---|
| Partida de brisca completa | 40 jugadas, 41 llamadas |
| Latencia por llamada | mín 63 ms · media 106 ms · máx 346 ms |
| Partida entera de punta a punta | ~4,2 s |

Es decir, el coste crece con el cuadrado de la longitud de la partida
(N llamadas, cada una re-simulando hasta N jugadas). Para partidas cortas da
igual; para entrenar a lo bruto, no es el sitio.

**`truncated` es siempre `False`, a propósito.** La puerta no trunca nunca: sus
partidas acaban por reglas del juego (`terminada`) o no acaban. Truncar por
número de pasos es cosa de quien usa el entorno, y para eso está
`gymnasium.wrappers.TimeLimit`. Poner ahí cualquier otra cosa sería inventarse un
dato que el servidor no da.

**`reward` es la diferencia de puntos, no los puntos.** La puerta devuelve el
marcador **acumulado**. Si se pasara tal cual, la suma de recompensas del episodio
sería la suma de todos los marcadores parciales. En la brisca medida, la serie de
`puntos` fue `[0, 0, 0, 0, 13, ..., 45, ..., 51, ..., 65]`: con la diferencia, las
recompensas suman exactamente el marcador final. `probar.py` lo comprueba en cada
partida.

**Nada se guarda.** No hay sesión, ni cuenta, ni historial. Si quieres reproducir
una partida, apunta `(juego, semilla, jugadas)`: con eso basta y sobra, que de eso
va todo esto.

## API

| | |
|---|---|
| `catalogo()` | `GET /api/gym` — los 40 entornos con su huella |
| `AlisaEnv(juego, base=..., render_mode=..., tiempo_max=...)` | el entorno |
| `.reset(seed=N, options={"juego": ...})` | `(obs, info)` — `seed` es la semilla del juego |
| `.step(accion)` | `(obs, reward, terminated, truncated, info)` |
| `.render()` | el `mapa` ASCII si lo hay, si no la descripción |
| `.verificar(puntos=None)` | `POST /api/verificar` — recalcula la partida |
| `.jugadas` | el array de la partida, para reproducirla |
| `.semilla` | la semilla en uso (útil si `reset()` la eligió al azar) |

**Errores:** `AlisaGymError` (raíz) · `RespuestaNoJSON` · `ErrorDeLaPuerta` ·
`JugadaRechazada`.

**`info` lleva siempre:** `acciones`, `huella`, `descripcion`, `jugadas`, y
además `jugadas_contadas`, `juego`, `titulo`, `semilla`, `puntos`, `mapa`,
`estado`, `ms`.
