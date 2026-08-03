# Publica el motor, los 19 juegos y el banco de pruebas verificable

Primera publicación del motor y del banco de pruebas. **Nada se despliega al
fusionar por sí solo**: ver la decisión pendiente al final.

## La tesis, en una frase

Una puntuación no se envía, **se recalcula**. El recibo de una partida
—`{juego, semilla, jugadas, puntos}`— se vuelve a jugar contra el mismo fichero
de reglas. No hay un modelo juzgando a otro modelo: hay una re-simulación que
cuadra o no cuadra.

## Qué entra

- **19 juegos** con reglas propias en JavaScript, sin backend y sin una sola
  llamada de red (comprobado espiando `fetch`, no fiándose).
- **25 entornos de gym** con tres puertas: numérica, de lenguaje y humana. Los 25
  hablan. `affordances()` **es** la lista de jugadas legales, así que un agente
  de lenguaje no puede alucinar una jugada ilegal: elige de la lista o no juega.
- **Verificación en tres runtimes** con la misma huella de reglas —navegador,
  Node y Function de Cloudflare—: 19/19 partidas legítimas aceptadas y **38/38
  trampas cazadas**.
- **Arnés de agentes LLM** y clasificación con las líneas base en las mismas
  filas que los modelos.

## Tres preguntas, tres comprobaciones

| | |
|---|---|
| `npm test` | ¿**funcionan** los juegos? |
| `npm run calibrar` | ¿**miden** algo? |
| `npm run tabla` | ¿quién juega mejor, y a qué coste? |

Que un entorno se ejecute y que un entorno mida son propiedades distintas y
necesitan pruebas distintas. Si una política tonta y una razonable sacan lo
mismo, eso no es una prueba: es un generador de números.

La **Guerra** está en la suite para eso: un juego sin una sola decisión donde
todos los agentes **deben** empatar. Si algún día separa, el que falla es el
banco de pruebas y no el agente.

## Lo que estas herramientas nos encontraron

Está publicado en [`docs/como-nos-equivocamos.md`](docs/como-nos-equivocamos.md),
con fichero y línea. Quince fallos que comparten forma: **el programa
funcionaba**. Ninguna excepción, ninguna prueba en rojo, un número perfectamente
plausible — que medía otra cosa.

- El **ajedrez no puntuaba**: valía 0 en toda partida, jugara quien jugara.
- El **go publicaba la puntuación del rival** (el normalizador preguntaba por
  `white` primero, y en go abren las negras). Reportaba 269,5 cuando el agente
  había hecho 69 y le habían comido 231 piedras.
- El **rival de casa de las damas era la política tonta con otro nombre**: en 600
  jugadas no discrepó ni una vez.
- La **métrica de UNIT premiaba perder**: la política que más ganaba era la que
  menos puntuaba.

## Honestidad sobre el alcance

- La clasificación es de **modelos locales pequeños**. Ambos salen
  indistinguibles de elegir siempre la primera opción legal (−0,08 y −0,09 sobre
  una escala donde 0 = no pensar y 1 = heurística de la casa). La tabla
  **demuestra el método, no el techo**.
- **Tres entornos no puntúan todavía** —unit, tute y hearts— porque su hueco
  entre suelo y techo no supera al ruido de la medida. Salen de la media **con el
  motivo escrito** en vez de colarse redondeados.
- El repositorio pesa **119 MB** (2.034 ficheros, el más grande 5 MB: no hace
  falta LFS). La mayor parte son modelos `.glb` de las demos.

## La portada anterior se conserva

Lo que alisa.systems servía hasta ahora está bajo la ruta `colonia`. Se recuperó
**del historial de git**, porque ya no existía en disco: una sesión anterior
había sustituido `index.html` sin que el fichero desplegado dejara rastro en el
árbol de trabajo. Ver [`colonia/LEEME.md`](colonia/LEEME.md), que incluye los dos
avisos honestos (carga `pixi.js` de un CDN y no está mantenida).

## ⚠️ Decisión pendiente antes de fusionar: cuál es la portada

Hay **tres** candidatas y no he elegido por mi cuenta:

| candidata | qué es |
|---|---|
| `index.html` (raíz, 8,5 KB) | Un cargador de overworld que importa `src/main.js`. Es lo que hay en el árbol de trabajo. |
| `dist_publico/index.html` (6,0 KB) | La que genera `python empaquetar.py` para el paquete. |
| `public/rooms/room_sala_del_huevo.html` (113 KB) | **La Sala del Huevo**, que es el escaparate real del proyecto. |

Fusionar esta rama no cambia por sí solo lo que se sirve —el despliegue va por
`wrangler` y por el paquete construido—, pero conviene decidirlo antes de
desplegar.

## Cómo comprobarlo sin fiarse

```bash
npm ci
npm test          # sin node_modules también pasa: la CI lo corre así
npm run calibrar
npm run tabla     # necesita Ollama local; sin él, sólo las líneas base
```
