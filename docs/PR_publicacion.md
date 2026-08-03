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

## ⚠️ Arregla un fallo de producción que no se veía desde fuera

Al ir a decidir cuál era la portada apareció algo peor: **el sitio en vivo servía
la raíz del repositorio en vez de `public/`**, y con eso todas las rutas caían en
el mismo fichero. Comprobado contra el dominio antes de tocar nada:

```
/                                 200   6.313 B
/rooms/room_sala_del_huevo.html   200   6.313 B   ← la misma página
/src/main.js                      200   6.313 B   ← HTML donde va un módulo JS
/colonia/                         200   6.313 B   ← una ruta que aún no existía
```

Una ruta inexistente contestando 200 fue la pista: **un sitio que dice que sí a
todo no está contestando**. Y como la portada desplegada importa `/src/main.js`,
el navegador recibía HTML donde esperaba JavaScript: la portada estaba rota en
producción, cargando lo justo para que no se notara.

En local nunca falló, porque `servir.py` sirve `public/` desde siempre. **Lo
desplegado y el árbol de trabajo llevaban meses siendo cosas distintas.**

El arreglo es `wrangler.toml` con `pages_build_output_dir = "public"`, para que
esa decisión viva en el repositorio y se revise en un PR en vez de en un panel
web que el código no puede contradecir.

Con la raíz correcta, comprobado sirviendo `public/`:

```
/                                   200    5.961 B  La Sala del Huevo (portada)
/rooms/room_sala_del_huevo.html     200  113.247 B  la Sala
/colonia/                           200   63.641 B  la portada anterior
/arcade/js/protohub/Verificador.js  200    9.436 B  las dependencias resuelven
/noexiste.html                      404              ya no hay catch-all
```

La portada, por tanto, **ya era la Sala del Huevo**: `public/index.html` lleva
meses escrito, con su texto para quien llega sin WebGL o con un lector de
pantalla. Lo que faltaba no era escribirla, era servirla.

## Cómo comprobarlo sin fiarse

```bash
npm ci
npm test          # sin node_modules también pasa: la CI lo corre así
npm run calibrar
npm run tabla     # necesita Ollama local; sin él, sólo las líneas base
```
