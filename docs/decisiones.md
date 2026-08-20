# Lo que ya decidimos

> Generado por `npm run decisiones` el 2026-08-20. **No se escribe a mano.**
> Recoge los bloques `⚠️` con título que hay repartidos por el código: cada uno
> es una decisión que alguien se paró a justificar donde vive.

## Para qué es esto

Antes de decidir algo, mira si ya está decidido. El 20-08-2026 perdimos media
tarde re-derivando una regla que estaba escrita en un comentario de `tabla.mjs`
—«el promedio largo sirve para decidir SI el juego puntúa; el corto, para el
cuánto»— mientras el código, ciento cincuenta líneas más abajo, hacía lo
contrario. El problema no era que no estuviera escrito: era que no había índice.

Volver a decidir sale barato en el momento y carísimo a la semana, porque la
segunda decisión casi nunca coincide con la primera y entonces hay dos verdades.

**1629 decisiones** en 277 ficheros.

## Índice

- [Herramientas de medida](#herramientas-de-medida) — 324
- [Reglas de los juegos](#reglas-de-los-juegos) — 304
- [Las mesas y los visualizadores](#las-mesas-y-los-visualizadores) — 286
- [El ProtoHub y el sustrato](#el-protohub-y-el-sustrato) — 165
- [Las comprobaciones](#las-comprobaciones) — 152
- [Otros](#otros) — 139
- [Las páginas de los juegos](#las-páginas-de-los-juegos) — 76
- [Cómo se dibuja (el pintor)](#cómo-se-dibuja-el-pintor-) — 49
- [El servidor y las salas](#el-servidor-y-las-salas) — 47
- [El motor](#el-motor) — 30
- [El gym y los entornos](#el-gym-y-los-entornos) — 26
- [Estilos](#estilos) — 19
- [Los agentes y las políticas](#los-agentes-y-las-políticas) — 12

## Herramientas de medida

### `_casillas.mjs`

- **LA IDEA, Y POR QUÉ SE COMPRUEBA A SÍ MISMA.** <sub>línea 13</sub>
  <br><sub>El sustrato dice cuántas casillas hay (`rejilla`). El tablero es una malla grande y plana. Repartir la rejilla sobre su caja envolvente da el centro de cada casilla —y es una SUPOSICIÓN: que las casillas están repartidas uniformemente sobre el tablero.</sub>
- **LA CONCLUSIÓN NO ES «HAY QUE ESCRIBIR CUATRO DETECTORES».** <sub>línea 40</sub>
  <br><sub>Es la misma que ya resolvió esto para las piezas: las mallas de las piezas se pueden apuntar porque LLEVAN NOMBRE —`p:<tipo>:<dueño>`—, no porque se dedujera su forma. La casilla necesita el mismo contrato y no lo tiene. Adivinar la geometría de cada</sub>
- **LA MALLA PLANA MÁS GRANDE ES EL SUELO DE LA HABITACIÓN, NO EL TABLERO.** <sub>línea 124</sub>
  <br><sub>Buscando por tamaño salían `sueloA` en reversi y en damas: el suelo de la sala, que es plano y enorme. Es la misma trampa que ya está apuntada en `bajo_el_panel` —la escena tiene suelo, niebla, luces y tapete— y caí</sub>
- **¿HAY QUE REPARTIR LA REJILLA, O LAS CASILLAS YA SON MALLAS?** <sub>línea 154</sub>
  <br><sub>Ajedrez tiene 65 planos: el suelo y las sesenta y cuatro casillas. Si las casillas ya existen como objetos, repartir una caja envolvente entre ocho es inventar una geometría que ya está puesta —y suponer que es uniforme—</sub>

### `_deploy_archive/_calendar_roadmap.py`

- **Form opened, no save button: {title_text}")** <sub>línea 94</sub>
  <br><sub>except Exception as e:</sub>

### `_deploy_archive/_cf_deploy_now.py`

- **Could not add domain: {result.get('errors', 'unknown')}")** <sub>línea 184</sub>
  <br><sub>return False return False</sub>

### `_deploy_archive/_cf_deploy_v2.py`

- **Check failed: {r.status_code} - {r.text[:200]}")** <sub>línea 109</sub>
  <br><sub>return None</sub>
- **Project already exists")** <sub>línea 142</sub>
  <br><sub>return check_project(token, log_fn) else: log_fn(f"❌ Create failed: {r.status_code}")</sub>
- **Domain already configured: {domain}")** <sub>línea 200</sub>
  <br><sub>return True else:</sub>
- **Domain setup: {r.status_code} - {r.text[:200]}")** <sub>línea 203</sub>
  <br><sub>return False</sub>

### `_deploy_archive/_cf_deploy_v5.py`

- **Status {r.status_code}: {r.text[:500]}")** <sub>línea 125</sub>
  <br><sub>except Exception as e: log(f"   Error testing: {e}")</sub>

### `_deploy_archive/_cloudflare_deploy.py`

- **Cookie auth returned {r.status_code}: {r.text[:200]}")** <sub>línea 41</sub>
  <br><sub>Try with cookies from Brave as fallback print("🍪 Trying Brave cookies...") session = cookies_to_request_session(browser="brave", domain_filter=".cloudflare.com")</sub>
- **Domain: {json.dumps(data, indent=2)}")** <sub>línea 150</sub>
  <br><sub>if __name__ == "__main__": print("=" * 60) print("👑 ALISA.SYSTEMS — CLOUDFLARE PAGES DEPLOYMENT")</sub>

### `_deploy_archive/_create_soulseal_repo.py`

- **Repo already exists, continuing...", f)** <sub>línea 40</sub>
  <br><sub>else: log(f"Response: {r.text[:300]}", f)</sub>

### `_deploy_archive/_deploy.py`

- **Repo may already exist: {data.get('message', '')}")** <sub>línea 32</sub>
  <br><sub>Get existing repo info r2 = requests.get( f"https://api.github.com/repos/{get_username()}/{REPO_NAME}",</sub>

### `aligerar_props.py`

- **NADA SE BORRA.** <sub>línea 19</sub>
  <br><sub>carpetas intacta. Volver a meter un modelo es moverlo de vuelta. Regla de la casa, y viene de un `git clean` que se llevó trabajo sin versionar.</sub>

### `atlas.py`

- **POR QUÉ EXISTE (1 de agosto de 2026, tras la tercera bronca de Oscar)** <sub>línea 6</sub>
  <br><sub>«no estas mirando muy profundo en tus busquedas cuando tengo que estar diciendote que ya existen las cosas y es entonces cuando las encuentras»</sub>

### `avisos.mjs`

- **EL ENLACE VUELVE A JUGAR SU PARTIDA.** <sub>línea 67</sub>
  <br><sub>Aquí ponía `${SITIO}${a.pagina}` — o sea, el juego recién repartido. Quien se pusiera a mirar un aviso abría una partida NUEVA, con otra semilla y otras cartas, y tenía que reconstruir a mano lo que esa persona tenía</sub>

### `bajo_el_panel.mjs`

- **POR QUÉ EXISTE — DOS CASOS YA MEDIDOS, NO HIPOTÉTICOS** <sub>línea 7</sub>
  <br><sub>En SNAKE la comida se pinta perfectamente y cae en pantalla en (269, 180). El panel ocupa de (20,20) a (340,330). En un juego que va de comer, no se ve qué comer. Y plegar el panel no basta: plegado llega hasta y≈205, x≈340 — la</sub>
- **EL PROBLEMA GORDO: NO TODOS LOS JUEGOS EXPONEN SU ESCENA POR IGUAL** <sub>línea 22</sub>
  <br><sub>`mesa_tablero.mjs` (los tableros sin visualizador propio: go, reversi, damas, xiangqi, fagocito, sokoban, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebaño, pradera, nave, parchís, oca, canadiense, generala)</sub>
- **LA VÍA QUE CUBRE A LOS 35 SIN SABER NINGUNO: EL PROPIO `render()`** <sub>línea 38</sub>
  <br><sub>Los 35 dibujan con `THREE.WebGLRenderer`, y los 35 llaman a `renderer.render(escena, camara)` en su bucle de animación — es la única forma que tiene THREE de sacar algo a pantalla. Así que en vez de preguntar</sub>
- **QUÉ ES «UNA PIEZA» Y QUÉ ES «EL TABLERO** <sub>línea 56</sub>
  <br><sub>`escena.traverse()` visita literalmente todo: el suelo, la niebla, las luces, el tablero de 10 unidades de lado. Preguntar si ESO cae bajo el panel es una trivialidad que sale que sí en los 35 —claro que la esquina</sub>
- **LAS MANOS RIVALES QUE SE SALEN DE LA PANTALLA A PROPÓSITO** <sub>línea 74</sub>
  <br><sub>`mesa_cartas.mjs` coloca las manos de los rivales fuera del lienzo a propósito —está explicado dos veces en ese fichero—, y eso no es un fallo que este instrumento tenga que señalar. Se resuelve solo: si la proyección</sub>
- **LO QUE DIO LA PRIMERA PASADA (16-08), Y CÓMO SE LEE — 14 DE 35 NO SON 14 FALLOS** <sub>línea 83</sub>
  <br><sub>Este instrumento cuenta PIEZAS TAPADAS, no gravedad. Distinguir «se ve» de «importa» no lo puede hacer una medida, así que queda aquí escrito lo que dio y lo que resultó ser cada cosa al comprobarla una por una:</sub>
- **Y LO QUE AÑADIÓ LA SEGUNDA MEDIDA (16-08, más tarde) — GRAVES QUE LA** <sub>línea 107</sub>
  <br><sub>PRIMERA PANTALLA NO PODÍA VER:</sub>
- **Y ESTOS NÚMEROS DE «TRAS JUGAR» PUEDEN TEMBLAR UNA FICHA DE UNA PASADA A** <sub>línea 123</sub>
  <br><sub>OTRA, Y ESO NO ES EL INSTRUMENTO ROTO.</sub>
- **HUECO CERRADO (16-08, más tarde): SE MEDÍA SÓLO LA PRIMERA PANTALLA, Y EL** <sub>línea 139</sub>
  <br><sub>PANEL CRECE AL JUGAR</sub>
- **Y NO BASTA CON MEDIR UNA VEZ AL FINAL DE LA RACHA DE CLICS.** <sub>línea 154</sub>
  <br><sub>El primer intento jugaba N jugadas seguidas y medía sólo al final. En generala eso daba TAMBIÉN cero: un turno entero es `tirar, tirar, tirar, anotar:x`, y `anotar` CIERRA el turno — el panel vuelve a un único botón `tirar` para el</sub>
- **EL PANEL SE FUERZA DESPLEGADO: ES EL PEOR CASO, Y EL PRIMERO QUE VE ALGUIEN** <sub>línea 168</sub>
  <br><sub>`document.querySelector('.hud-panel').classList.remove('collapsed')` antes de medir. Con el panel pequeño casi nada quedaría tapado y el instrumento mentiría por omisión; desplegado es como llega la página a quien la abre</sub>
- **REGLA DE LA CASA: MEDIR, NO MIRAR CAPTURAS** <sub>línea 175</sub>
  <br><sub>Esto proyecta con matemática de verdad (`Vector3.project(camara)` + el rectángulo real del `<canvas>`), no adivina por captura de pantalla. Y si un juego no se puede medir —el parche nunca se disparó, no hay `.hud-panel`</sub>
- **EL PARCHE VA EN `addInitScript`, NO EN UN `page.evaluate` DESPUÉS DE CARGAR.** <sub>línea 206</sub>
  <br><sub>`addInitScript` se reinyecta en CADA documento nuevo de este contexto, antes de que se ejecute un solo script de la página — incluido `three.min.js`, que `montarMesa.js` inserta como `<script>` clásico. Si se parcheara después de</sub>
- **Y NO SE PARCHEA `WebGLRenderer.prototype.render` — ESO DABA SIEMPRE CERO.** <sub>línea 215</sub>
  <br><sub>El primer intento parcheaba el prototipo, tal como se haría con una clase normal. Medido en snake —el control positivo, más abajo— el parche SÍ se enganchaba (`__alisaParcheado: true`) y aun así `window.__CAPTURA` seguía a</sub>
- **JUEGA UNAS POCAS JUGADAS Y MIDE TRAS CADA UNA — NO SÓLO AL FINAL.** <sub>línea 291</sub>
  <br><sub>Pulsa el primer `.mesa-jugada` que encuentre, hasta `intentos` veces: es el mismo botón y el mismo criterio que usa `tacto.mjs` para su muestra, y no hace falta elegir con más criterio — cualquier jugada legal sirve para que la</sub>
- **LA SEGUNDA MEDIDA — TRAS JUGAR — Y QUEDARSE CON LA PEOR.** <sub>línea 431</sub>
  <br><sub>Sólo tiene sentido intentarlo si la primera se pudo medir: sin `.hud-panel` o sin `render()` interceptado no hay nada que comparar, y jugar a ciegas sobre una página que ya se sabe no medible sólo</sub>
- **SI LA SEGUNDA MEDIDA NO SALIÓ, SE DICE — NO SE CALLA COMO UN "AL ABRIR" MÁS.** <sub>línea 463</sub>
  <br><sub>Un juego que nunca llegó a tener un estado medible tras jugar no es lo mismo que uno que se midió tras jugar y salió mejor: el primero es una medida que falta, el segundo es una medida que se tomó y no empeoró nada.</sub>
- **EL CONTROL POSITIVO.** <sub>línea 506</sub>
- **16-08: EL CONTROL ERA SNAKE, Y CADUCÓ — ESO ES CORRECTO, NO UNA ROTURA.** <sub>línea 508</sub>
  <br><sub>Snake TENÍA la comida tapada — es el caso que abrió esta tarea. `encuadre.js` aprendió a ALEJAR la cámara cuando el hueco a la derecha del panel es cero (el tablero de snake llena la pantalla entera, así que apartar la vista no</sub>
- **16-08 (más tarde, el mismo día): ENTROPY TAMBIÉN CADUCÓ — Y CON ÉL SE** <sub>línea 523</sub>
  <br><sub>FUE EL RELEVO QUE IBA A SER SU SIGUIENTE.</sub>
- **EL RELEVO QUE SÍ LLEGÓ: GENERALA, TRAS TIRAR — Y ES DE REGALO.** <sub>línea 536</sub>
  <br><sub>La medida en dos momentos que cierra el hueco de este mismo fichero (ver cabecera) tenía, sin buscarlo, el control que le faltaba a este bloque: la GENERALA es un fallo real y sin arreglar —el primer dado queda bajo el panel</sub>

### `cadena.mjs`

- **Esta columna decía «una prueba que comprueba SUS reglas» y era** <sub>línea 63</sub>
  <br><sub>engañosa: los 19 los cubre `prueba_reglas.mjs` en cada `npm test`. Lo que mide de verdad es si tiene un LABORATORIO propio en el navegador — un sitio donde un desconocido abra la página y vea el veredicto sin</sub>
- **EL METRO SE HABÍA QUEDADO CORTO, Y ESO ES PEOR QUE NO TENERLO.** <sub>línea 72</sub>
  <br><sub>En una sola jornada se construyeron mesas compartidas, asientos que admiten personas, políticas y modelos, y ratón en cuatro tableros que no se podían tocar. Ninguna de las siete columnas de arriba pregunta por nada de eso, así</sub>
- **LO QUE ESTA HERRAMIENTA NO PUEDE MEDIR, Y NO FINGE MEDIR.** <sub>línea 89</sub>
  <br><sub>Falta una columna «se ve»: que el 3D dibuje algo de verdad. Go la fallaría — juega, se clica, el minimapa lo refleja, y el tablero no aparece— y por eso haría falta.</sub>
- **Buscaba un fichero con el nombre del juego, y desde que existe** <sub>línea 150</sub>
  <br><sub>`mesa.html` —una mesa genérica dirigida por `rules/index.js`— los diecinueve se pueden jugar en el navegador aunque no tengan página propia. Seguir contando ficheros habría dado 12/19 con siete juegos</sub>
- **Esto buscaba `'${juego}-protohub` con la comilla pegada, y el** <sub>línea 164</sub>
  <br><sub>identificador real es `'alisa/brisca-protohub-v0'`: entre la comilla y el nombre va `alisa/`. Añadí ocho estaciones y el contador subió UNA — la única que acertaba lo hacía por su página propia, no por el</sub>
- **Se pregunta por el RATÓN SOBRE EL TABLERO, no por «se puede clicar».** <sub>línea 180</sub>
  <br><sub>Los botones de `mesa.html` también son clics, así que la pregunta laxa daría 19/19 y no diría nada. Lo que interesa es si el 3D se toca: hasta hoy, cuatro de los seis tableros se dibujaban y no se podían tocar.</sub>

### `calibrar.mjs`

- **LA GUERRA TIENE QUE SALIR PLANA** <sub>línea 29</sub>
  <br><sub>Es el control del laboratorio: un juego sin una sola decisión, donde todos los agentes DEBEN empatar. Si algún día separa, el que falla es el banco de pruebas, no el agente. Por eso aquí «plano» es su aprobado y cualquier otra</sub>
- **Esto era `st.turn === 'player'` escrito a mano aquí.** <sub>línea 53</sub>
  <br><sub>tablero el turno se llama 'white', así que la política tonta NO LLEGABA A JUGAR y la tabla declaraba «no distingue» de medio catálogo. Ver `turno.js`. const { crearJuezDeTurno } = await imp('turno.js');</sub>
- **Sin esto la tabla llamaba «AL REVÉS» a diferencias que eran ruido.** <sub>línea 88</sub>
  <br><sub>una sola partida ganada vale más de 1000 puntos, así que con 25 semillas dos victorias de suerte mueven la media 90 puntos y la conclusión entera. Emparejar por semilla quita casi todo el ruido del reparto; lo que queda, se mide.</sub>
- **Los seis juegos de tablero salen de una posición FIJA: la semilla no** <sub>línea 112</sub>
  <br><sub>los toca. Repetirlos 200 veces es jugar la misma partida 200 veces — y con el ply de seguridad de las damas eso son minutos de nada. Tres semillas idénticas bastan para saberlo; a partir de ahí, no hay más</sub>
- **Aquí había un `&& se > 0` que invertía el sentido justo donde más** <sub>línea 123</sub>
  <br><sub>importa. Los seis juegos de tablero salen de una posición FIJA: la semilla no cambia nada, las 60 partidas son la misma, y el error típico es exactamente 0. Con aquel guardia, Go marcaba +99,0 de diferencia con ±0,0</sub>
- **DOS COSAS DISTINTAS, Y ANTES SE CONTABAN IGUAL.** <sub>línea 135</sub>
  <br><sub>Un entorno cuya métrica es constante está ROTO: mide lo mismo juegue quien juegue, y eso no lo arregla ninguna cantidad de semillas. Un entorno sin señal a 120 semillas puede estar perfectamente bien y ser sólo ruidoso —en</sub>

### `censo.py`

- **POR QUÉ EXISTE (2 de agosto de 2026)** <sub>línea 7</sub>
  <br><sub>En una sola tarde aparecieron, en nuestra propia carpeta:</sub>
- **NO CUENTAN LAS FICHAS QUE VIVEN AL LADO DEL MODELO.** <sub>línea 125</sub>
  <br><sub>`props/` tiene mil `X.glb.katamari.json`, y cada uno nombra su propio `X.glb`. Contándolos, el 99 % de los modelos «se usan» — cada modelo avalándose a sí mismo. Es el mismo círculo que ya cacé al empaquetar</sub>

### `clasificar_piezas.mjs`

- **NO SUSTITUYE AL CATÁLOGO, LO COMPLEMENTA — Y HAY QUE SABER EN QUÉ FALLA.** <sub>línea 16</sub>
  <br><sub>Leer el código no ejecuta nada, así que esto NO sabe si una pieza pinta algo de verdad; sólo si expone por dónde encenderla. El catálogo sí lo sabe (mide cuántos objetos mete en la escena). Si algún día se contradicen, **manda el</sub>
- **Se miran LAS DOS FORMAS.** <sub>línea 40</sub>
  <br><sub>`export const X = { init(), update() }` — y `FileSystemDioramaSystem`, los 52 KB más grandes de todo, es de la segunda. La primera versión del catálogo sólo conocía clases y lo dio por «sin métodos» teniendo `init()`.</sub>
- **ESTO NO ES REFINAMIENTO: ES UN FALSO POSITIVO QUE YO MISMA CAUSÉ.** <sub>línea 65</sub>
  <br><sub>Al arreglar `FileSystemDioramaSystem` dejé escrito en un comentario, como documentación de cómo se usa:</sub>
- **Dos señales de «sólo funciona donde nació», que costaron caro:** <sub>línea 103</sub>
  <br><sub>`FileSystemDioramaSystem` usaba THREE sin importarlo (111 veces) y se auto-arrancaba al importarse con `Renderer.init()`. Un módulo así no se puede catalogar ni reutilizar, y no da error hasta que alguien lo</sub>
- **TAMBIÉN VALE RECIBIRLO POR PARÁMETRO, Y NO ES LO MISMO QUE OLVIDARLO.** <sub>línea 108</sub>
  <br><sub>`RenderBackend` hace `crearRenderer(THREE, opciones)` a propósito: `three` y `three/webgpu` son builds DISTINTOS y quien llama decide cuál. Marcarlo como «se le olvidó el import» habría llevado a</sub>
- **SE EJECUTA EN UNA ESCENA DE MENTIRA, SIN RENDERER NI BUCLE.** <sub>línea 135</sub>
  <br><sub>belleza, se busca un número: cuántos objetos mete. Cero con `build()` presente es la señal más útil de todas — quiere decir «le faltan datos», no «está rota».</sub>
- **CUATRO GLOBALES DE MENTIRA, Y NADA MÁS.** <sub>línea 141</sub>
  <br><sub>Muchas piezas tocan `localStorage`, `window` o `document` al arrancar. Sin ellos ni llegan a construir nada y saldrían como «vacías» por un motivo que no tiene que ver con lo que hacen.</sub>
- **EL `await` NO SOBRA.** <sub>línea 192</sub>
  <br><sub>no lanza: devuelve una promesa rechazada, el `catch` síncrono no la ve y Node tumba el proceso entero por rechazo no gestionado. Pasó con `GymIdentity.init()`, que</sub>
- **SE CUENTAN LAS MALLAS, NO LOS HIJOS DE LA ESCENA.** <sub>línea 200</sub>
  <br><sub>La primera versión hacía `escena.children.length` y daba números que engañaban: una factoría que mete TODO dentro de un `Group` salía con «1 objeto» igual que otra que no puso nada.</sub>
- **SALIDA EXPLÍCITA, Y NO ES UN ATAJO: ES UN HALLAZGO.** <sub>línea 274</sub>
  <br><sub>Al ejecutar las piezas, el proceso terminaba su trabajo —el JSON quedaba escrito— y **no salía nunca**. Node no puede salir mientras haya un temporizador pendiente, y varias piezas arrancan un `setInterval` en su `init()` sin</sub>

### `comprobar_cache.mjs`

- **QUÉ PROBLEMA VIGILA, QUE COSTÓ MEDIA TARDE ENTENDER** <sub>línea 6</sub>
  <br><sub>Cloudflare guarda en el navegador los `.js` durante CUATRO HORAS y los `.mjs`, `.html` y `.json` durante cero. Con esa mezcla, un despliegue no llega tarde: llega A MEDIAS. Quien ya hubiera entrado se lleva el HTML nuevo y los módulos</sub>
- **Y POR QUÉ NO SE ARREGLA DESDE EL REPOSITORIO** <sub>línea 19</sub>
  <br><sub>`public/_headers` pide `max-age=0` y Cloudflare Pages lo respeta: en la dirección del despliegue (`*.pages.dev`) las cabeceras salen bien, con su marca `X-Alisa-Cabeceras` incluida. En el dominio publicado se pierden las dos cosas.</sub>
- **Y LO QUE DE VERDAD DELATA EL PROBLEMA: que unos ficheros se guarden más que** <sub>línea 80</sub>
  <br><sub>otros. Una caché larga PAREJA sería lenta pero honesta — todo el mundo vería la misma versión, la de antes. Lo que rompe es la mezcla, porque produce una combinación de ficheros que nunca existió.</sub>

### `comprobar_desplegado.mjs`

- **NO LLEGO AL SITIO» Y «EL SITIO SIRVE ALGO MAL» NO SON LO MISMO.** <sub>línea 50</sub>
  <br><sub>El 16-08-2026 esto escupió una traza de `undici` de veinte líneas acabada en `UND_ERR_CONNECT_TIMEOUT` justo después de un despliegue, y me hizo dudar de un despliegue que estaba perfecto. La causa no era el sitio: el ISP de esta casa no</sub>
- **LAS ESTACIONES SE DESCUBREN, NO SE ESCRIBEN.** <sub>línea 92</sub>
  <br><sub>La primera versión miraba sólo la portada y la sala, y las dos salían perfectas mientras **no se podía jugar a nada**: los juegos entran en la sala dentro de un iframe, así que sus fallos ocurren un nivel más abajo y desde</sub>
- **`/cdn-cgi/` NO ES NUESTRO.** <sub>línea 131</sub>
  <br><sub>La zona tiene activada la ofuscación de correos: cuando encuentra una dirección en el HTML —`research.html` lleva una de contacto en el pie— la sustituye por un enlace a `/cdn-cgi/l/email-protection` y añade su propio</sub>

### `contactos.mjs`

- **POR QUÉ EXISTE: LAS CAPTURAS YA SE HACÍAN Y NO LAS MIRABA NADIE** <sub>línea 6</sub>
  <br><sub>`laboratorio_mesas.mjs` deja 41 capturas en `capturas_laboratorio/` en cada pasada. Están en `.gitignore`, pesan 5 MB, y el día que se escribió esto las últimas eran de la tarde anterior — o sea, de antes de una noche entera de</sub>
- **LO QUE ESTO **NO** ES** <sub>línea 24</sub>
  <br><sub>No es una comprobación y no sale en `npm test`: no puede fallar, porque no sabe qué es «estar bien». Una máquina no dice «esto está feo». Lo que sí puede decir una captura es qué CAMBIÓ respecto de la anterior, y eso va aparte.</sub>
- **QUE EL FICHERO EXISTA NO ES QUE LA IMAGEN SE VEA, Y LA PRIMERA VERSIÓN DE ESTO** <sub>línea 103</sub>
  <br><sub>CONFUNDÍA LAS DOS COSAS.</sub>

### `decisiones.mjs`

- **POR QUÉ EXISTE, Y LA FRASE QUE LO PROVOCÓ.** <sub>línea 6</sub>
  <br><sub>20-08-2026, después de un día largo: «buena parte de hoy no ha sido descubrir, ha sido leer lo que ya habíamos escrito». Y Oscar: «pues aprendamos de esto».</sub>
- **Y EL PROBLEMA NO ES QUE NO ESTÉ ESCRITO: ES QUE NO HAY ÍNDICE.** <sub>línea 20</sub>
  <br><sub>Medido antes de escribir esto: **879 bloques de decisión en 653 ficheros**. Eso es una biblioteca sin catálogo. La pregunta «¿qué decidimos ya sobre las sillas?» hoy se contesta con un `grep` afortunado o volviéndolo a decidir, y volver a decidirlo</sub>
- **SE REGENERA CON EL PAQUETE, COMO EL ESCAPARATE Y LA PUERTA HTTP.** <sub>línea 32</sub>
  <br><sub>Un índice que hay que acordarse de generar acaba sin generarse. Va en `empaquetar`, que es donde ya están los otros tres generadores por el mismo motivo.</sub>
- **QUÉ CUENTA COMO DECISIÓN Y QUÉ NO.** <sub>línea 80</sub>
- **` seguido de texto que empieza en mayúscula y tiene** <sub>línea 82</sub>
- **EL TÍTULO SE CORTA EN LA PRIMERA FRASE.** <sub>línea 103</sub>
  <br><sub>La primera versión se llevaba la línea entera, y cuando el título y el cuerpo comparten renglón salían entradas como «Y JUEGA LEYENDO EL SUSTRATO, NO EL ESTADO. Esa línea de más arriba» — mitad titular, mitad frase cortada. Un</sub>
- **` con título que hay repartidos por el código: cada uno');** <sub>línea 154</sub>
  <br><sub>lineas.push('> es una decisión que alguien se paró a justificar donde vive.'); lineas.push(''); lineas.push('## Para qué es esto');</sub>

### `desajustes.mjs`

- **No todo desajuste es un fallo.** <sub>línea 23</sub>
  <br><sub>saldrá como «leído por uno solo», y está bien. Esto señala dónde MIRAR, no dónde hay bug: la última palabra es de quien lea la lista.</sub>
- **ESTA LISTA ERA A MANO, Y ESO LE DABA FALSOS NEGATIVOS.** <sub>línea 69</sub>
  <br><sub>Eran seis ficheros escritos aquí más los `*_visualizer.js`. Faltaban, entre otros, `SovereignCardEngine.js` —el motor de TODAS las mesas de cartas— y `worker-mesas/mesas.js`, que es el árbitro por el que juegan los agentes.</sub>

### `empaquetar.py`

- **POR QUÉ NO BORRA NADA** <sub>línea 8</sub>
  <br><sub>`public/` es a la vez nuestro taller y el producto. Pesa 670 MB porque dentro hay una biblioteca de recursos entera: fuentes de Blender, mallas en FBX y OBJ, packs con sus vistas previas. Eso es *nuestro*, y se queda. Lo que no puede</sub>
- **LICENCIA: prohíben la redistribución.** <sub>línea 60</sub>
  <br><sub>FUERA_LICENCIA = { "Lowpoly Animals eng": "Seaeees — «resale, redistribution … are prohibited»", }</sub>
- **LAS FICHAS QUE VIVEN AL LADO DEL MODELO NO CUENTAN.** <sub>línea 95</sub>
  <br><sub>`props/` tiene mil `X.glb.katamari.json`, y cada uno nombra su propio `X.glb`. Con ellos dentro, «alguien lo nombra» era cierto para 966 modelos de 979: **cada modelo avalándose a sí mismo**, y el paquete</sub>
- **ESTO ME COSTÓ UN JUEGO SIN PIEDRAS.** <sub>línea 116</sub>
  <br><sub>como `` `../props/models/Rock_${i}.glb` ``, así que la cadena `Rock_3.glb` *no existe en ningún sitio del código**. El paquete las dejó fuera y el juego salió con los asteroides invisibles, sin un solo error de red que lo</sub>
- **UN PATRÓN SIN PARTE LITERAL NO ES UN PATRÓN.** <sub>línea 140</sub>
  <br><sub>`${passport.name.toLowerCase()}.glb` se convierte en «cualquier .glb» y se lleva los 979 modelos: el paquete pasó de 64 MB a 468. Hace falta un anclaje de verdad —`Rock_`— fuera de la extensión.</sub>
- **ESTO LO APRENDÍ ROMPIÉNDOLO.** <sub>línea 156</sub>
  <br><sub>fichero, construí el paquete, lo serví… y el póker salió con doce 404: las figuras se piden como `` `${palo}_${valor}.webp` ``, así que el nombre `S_J.webp` **no aparece en ningún sitio del código**. Ninguna regla basada</sub>
- **LA CONFIGURACIÓN DE CLOUDFLARE NO TIENE EXTENSIÓN, Y AQUÍ TODO SE** <sub>línea 243</sub>
  <br><sub>DECIDE POR EXTENSIÓN.</sub>

### `esperar_turno.mjs`

- **POR QUÉ ESTO Y NO UN BUCLE QUE JUEGUE SOLO** <sub>línea 6</sub>
  <br><sub>`sentarse.mjs` ata un jugador a tu silla y juega hasta el final: perfecto para medir una política o un modelo, y justo lo contrario de lo que quieres cuando el que decide eres tú. Yo lo usé para «jugar» una partida contra otra agente y</sub>
- **Y ES LA PIEZA QUE LE FALTABA A UN AGENTE QUE TAMBIÉN TIENE QUE TRABAJAR.** <sub>línea 18</sub>
  <br><sub>Un agente no puede quedarse en un bucle bloqueante esperando su turno: se le va la atención entera en mirar un tablero. Necesita un latido — o alguien que le dé un toque. Esto es el toque.</sub>

### `estado_salas.py`

- **POR QUÉ CAMBIÓ ESTO (2 de agosto de 2026)** <sub>línea 14</sub>
  <br><sub>Antes sólo había `ok` y `roto`, y `roto` se pintaba en el catálogo como un *FALLA** rojo. Resultado: ocho insignias rojas en la portada del proyecto… sobre páginas que no fallan.</sub>

### `fichas.mjs`

- **UNA SOLA FICHA PARA LAS CINCO PUERTAS, NO UNA POR AUDIENCIA** <sub>línea 6</sub>
  <br><sub>Este banco tiene cinco maneras de jugar —persona, FSM, LLM, visión y OpenAPI— y su tesis es que todas juegan al MISMO juego: el panel de jugadas es literalmente `legal_moves`, la misma lista que recibe un agente por la puerta de texto.</sub>
- **Y POR ESO LO DERIVABLE SE DERIVA.** <sub>línea 18</sub>
  <br><sub>Todo lo que la máquina ya sabe se saca de donde vive —las reglas, el estado, la clasificación medida, las capturas— y no se escribe aquí. A mano queda sólo lo que ninguna máquina puede contestar: las reglas en prosa y de dónde viene el</sub>
- **LA CONSECUENCIA QUE HACE QUE ESTO VALGA LA PENA: LA FICHA ES VERIFICABLE.** <sub>línea 25</sub>
  <br><sub>Si la ficha dice «verbos: arriba, abajo, izquierda, derecha, esperar», eso se puede comprobar contra `legal_moves`. Si dice «4 asientos», contra la longitud del marcador. El día que alguien cambie un juego sin tocar su ficha, salta —</sub>
- **`obtenerSustrato`, NO `sustratoDe` — Y ESA DIFERENCIA ME HIZO PUBLICAR UN** <sub>línea 54</sub>
  <br><sub>NÚMERO FALSO.</sub>
- **LA FICHA PROMETÍA UNA CAPTURA QUE NO SE PUBLICA. 35 DE 35.** <sub>línea 86</sub>
  <br><sub>Esto comprobaba que el fichero existiera en `capturas_laboratorio/` y daba «captura 35/35 derivado y listo». Pero esa carpeta está en `.gitignore` —y con razón: son ficheros de trabajo que el laboratorio rehace en cada pasada— así que no hay ni un</sub>
- **SI NO SE SABE, SE DICE `null`.** <sub>línea 166</sub>
  <br><sub>La primera versión ponía 1 cuando no encontraba marcador ni manos rivales, y la ficha del AJEDREZ salía anunciando «1 asiento». Un juego de dos. En una ficha que quiere ser la spec del banco, un valor por defecto que parece un</sub>
- **HAY DOS CLASES DE JUEGO Y CONFUNDIRLAS LLENABA LA FICHA DE BASURA.** <sub>línea 206</sub>
  <br><sub>Unos tienen VOCABULARIO cerrado —`arriba`, `abajo`, `robar_mazo`— y ahí la lista es la spec: eso es exactamente lo que acepta el juego, siempre. Otros GENERAN sus jugadas del tablero: el ajedrez salía con `a1a2`, `b1c3`</sub>
- **CÓMO SE JUEGA CON LA MANO, MEDIDO.** <sub>línea 234</sub>
  <br><sub>Hasta hoy la ficha decía qué necesita cada puerta pero no si una persona puede JUGAR: mancala llevaba quién sabe cuánto sin un solo escuchador de clic —sólo se puede jugar desde el panel— y ninguna ficha lo decía. Un</sub>
- **¿SE VE BIEN EN TODAS LAS PANTALLAS? — idea de Oscar, y hacía falta.** <sub>línea 278</sub>
  <br><sub>Hoy aparecieron DOS juegos impecables en escritorio y roluptos en el móvil: mancala con 4 de sus 6 hoyos fuera de cuadro y ajedrez con 26 de sus 64 casillas. Ninguno de mis instrumentos lo buscaba, y los dos se presentaron</sub>
- **ESTRUCTURADA, NO UN BLOQUE DE TEXTO — Y ESA ES LA DECISIÓN DEL DÍA.** <sub>línea 312</sub>
  <br><sub>Los dos mundos que documentan esto ya tienen esqueleto fijo: los manuales de cartas (jugadores · reparto · juego · puntuación) y las fichas de entornos de Gymnasium (Description · Action Space · Observation Space · Starting State ·</sub>
- **Y UNA COLUMNA POR PUERTA: LA FICHA COMO TABLERO DE ESTADO.** <sub>línea 339</sub>
  <br><sub>Idea de Oscar, y es la que le da a esto un segundo uso: si la ficha reúne lo que cada puerta necesita, entonces también dice **qué funciona y qué no**, juego por juego. No hace falta un panel aparte — sale de lo que ya se ha</sub>
- **Esto dice si la puerta está MONTADA, no si está BIEN.** <sub>línea 356</sub>
  <br><sub>estar escrito y ser malo, y una leyenda puede nombrar mal las casillas. Lo que se puede comprobar de verdad —que lo declarado coincida con lo que hace el juego— es trabajo de `prueba_fichas.mjs`, no de esta cuenta.</sub>

### `gen_escaparate.py`

- **SE DECLARA, NO SE FILTRA.** <sub>línea 12</sub>
  <br><sub>Lo natural sería una lista de exclusiones. Es la opción peligrosa, y no por gusto: con una lista negra **cada página nueva es pública hasta que alguien se acuerde de taparla**. El olvido publica. Al revés, el olvido no hace nada.</sub>
- **Y ADEMÁS SE COMPRUEBA, PORQUE DECLARARSE NO BASTA** <sub>línea 30</sub>
  <br><sub>Una página puede declararse y aun así llamar al hub de la colonia o enlazar sus salas. Aquí eso NO se avisa: se excluye y se dice por qué. Es una pregunta distinta de la que hace `necesita_colonia()` en `gen_lab_index.py` —aquélla es</sub>
- **SEGUNDA FUENTE: LAS PIEZAS SE DECLARAN CON SU CÓDIGO, NO CON UN `<meta>`.** <sub>línea 108</sub>
  <br><sub>Los entornos de gym no son páginas: son módulos del motor. No pueden llevar una etiqueta HTML. Pero se declaran igual, y mejor: **exponiendo `reset`, `step` y `getObservation`**. Eso es una declaración más fuerte que un `<meta>`, porque no</sub>
- **Y SE LES APLICA EL MISMO GUARDIÁN.** <sub>línea 117</sub>
  <br><sub>se revisa su código fuente en busca de rastros de casa igual que a las páginas. Sin esto, cualquier módulo nuevo del motor entraría solo en el escaparate — que es justo la propiedad que este diseño existe para impedir.</sub>
- **El total cuenta LAS DOS fuentes.** <sub>línea 179</sub>
  <br><sub>`len(dentro)` —sólo las páginas con `<meta>`— y decía «10 piezas» con 27 dentro. Un número mal en el propio escaparate es de lo peor que puede haber: es la primera cifra que alguien comprueba.</sub>

### `gen_escenas.mjs`

- **SE GENERAN UNA VEZ Y LUEGO SE TOCAN A MANO.** <sub>línea 12</sub>
  <br><sub>El andamio es idéntico para las dieciséis, así que lo pone el generador. Pero la luz, el encuadre y el bloom de cada pieza son decisiones que hay que ver para acertar — el generador pone un defecto razonable y deja el fichero</sub>
- **Y CADA PÁGINA SE DECLARA PARA EL ESCAPARATE.** <sub>línea 19</sub>
  <br><sub>Lleva su `<meta name="alisa-escaparate">`, así que entra en `/escaparate` por el mismo camino que todo lo demás: declarándose. Nada aparece por olvido.</sub>
- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 95</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en \`labs/js/montarEscena.js\`, igual que las páginas de tablero viven en \`arcade/js/montarMesa.js\`. Quien lea esto ve que el motor SE COMPONE — que es</sub>
- **NO se sobrescribe lo que ya existe: los ajustes de luz y encuadre se** <sub>línea 120</sub>
  <br><sub>hacen mirando, y un generador que los machaca en cada ejecución borra trabajo que no puede rehacer. if (yaHay.has(fichero)) { respetadas++; continue; }</sub>

### `gen_lab_index.py`

- **DOS CARPETAS ENTERAS QUE NO ENSENABAMOS.** <sub>línea 30</sub>
  <br><sub>Medido: de 153 paginas en `public/`, 34 no las enlazaba nadie. Entre ellas los siete generadores procedurales —todos arrancan y pintan— y diez paginas en `legacy/`, de las que seis funcionan, incluida `room_empty_table_games_node`:</sub>
- **Antes bastaba con nombrar el hub para llevarse el sello COLONIA, y eso** <sub>línea 83</sub>
  <br><sub>marcaba tambien la Sala del Huevo — que sin hub funciona entera y enseña «INCUBACION — SIN CONEXION». Una insignia que asusta sobre la pagina estrella no informa: espanta.</sub>
- **Y AUN ASI MIRABA DONDE NO ERA.** <sub>línea 92</sub>
  <br><sub>bastaba un `catch` en cualquier rincon —y hay `catch` en casi todas— para dar por protegida una llamada al hub que estaba mil lineas mas alla y a la intemperie. Resultado: de las diecisiete paginas que hablan con el hub solo</sub>
- **Y la primera version del vecindario se paso de estrecha: 400 caracteres** <sub>línea 103</sub>
  <br><sub>a cada lado. Marco `croupier_chopper_aquarium` como rota cuando tiene un `try {` DOCE LINEAS mas arriba — con sangrado de veinte espacios, doce lineas son mas de 400 caracteres. De mirar todo el fichero a mirar por una</sub>
- **Aqui se pintaba un FALLA rojo sobre ocho paginas que NO fallan: cinco** <sub>línea 133</sub>
  <br><sub>estaban en obras y tres ni siquiera son juegos —son portadas de categoria—. Quien llegaba al catalogo veia ocho alarmas rojas y se iba. Decir «en obras» de lo que esta en obras es honesto; decir «FALLA» de lo</sub>
- **Este bloque no estaba, y era el fallo mas caro del catalogo: las tres** <sub>línea 178</sub>
  <br><sub>paginas que SON el argumento del proyecto estaban mezcladas entre 67 tarjetas ordenadas por nombre, al mismo nivel que un experimento de camara de abril. Asi lo hace three.js con sus ejemplos: una galeria esta muy bien, pero alguien</sub>
- **El catálogo era una lista plana de 118 fichas y decía en una línea suelta** <sub>línea 203</sub>
  <br><sub>«el producto es la sala; lo demás es de dónde salió» — y a continuación lo mezclaba todo. El tercer clic de un visitante caía en un experimento de abril y se llevaba la idea de que esto es un montón de cosas a medias.</sub>
- **Un inventario no demuestra nada. `/lab` listaba 118 tarjetas y eso ensena** <sub>línea 214</sub>
  <br><sub>que TIENES cosas, no que el motor sepa hacerlas.</sub>
- **`> b` y no `b` a secas: la regla de bloque alcanzaba tambien a los** <sub>línea 355</sub>
  <br><sub><b> que van DENTRO del texto y partia la frase en tres lineas. */ .piso > b {{ display:block; font-family:'JetBrains Mono',monospace; font-size:15px; letter-spacing:3px; color:#fff; }}</sub>

### `gen_motor_manifest.py`

- **SE GENERA, NO SE ESCRIBE.** <sub>línea 8</sub>
  <br><sub>en la primera semana — y en este proyecto ya hemos pagado esa factura tres veces (`board`/`tablero`, la lista de juegos, las opciones de asiento). Aquí el disco manda.</sub>

### `gen_openapi.mjs`

- **SE GENERA, NO SE ESCRIBE.** <sub>línea 7</sub>
  <br><sub>La lista de juegos sale de `rules/index.js`, la misma que usan el navegador, el arnés, el verificador y el árbitro. Un contrato copiado a mano se separa del servidor en la primera semana y entonces miente con toda la autoridad de</sub>
- **Y `legal_moves` ES EL `enum` DEL PARÁMETRO.** <sub>línea 13</sub>
  <br><sub>No lo diseñamos para esto: sale de que las jugadas sean enumerables, que es la decisión que también impide que una persona pulse un botón inexistente y que un modelo alucine una jugada. Un agente no tiene que adivinar el formato —</sub>
- **LAS PUERTAS TAMBIÉN SE DERIVAN.** <sub>línea 27</sub>
  <br><sub>Arriba está escrito que un contrato copiado a mano se separa del servidor en la primera semana. Esa doctrina se aplicó a la LISTA DE JUEGOS —que sale de `rules/index.js`— y no a las RUTAS, que iban escritas aquí una a una.</sub>
- **ESTA PUERTA HABLA INGLÉS, Y CON LOS NOMBRES QUE EL ESTADO YA USA.** <sub>línea 117</sub>
  <br><sub>Publicaba `acciones`, `turno_de`, `terminada`, `puntos` — mientras el estado que hay detrás publica `legal_moves`, `turn`, `is_game_over`, `score`. Los mismos datos con dos vocabularios según por qué puerta entres, y un agente que</sub>
- **LAS RUTAS SE QUEDAN EN CASTELLANO, Y NO ES INCOHERENCIA.** <sub>línea 181</sub>
  <br><sub>Una ruta no es un nombre: es una dirección que ya circula. `/mesa/…` está en enlaces compartidos, en el worker desplegado y en las salas que hay abiertas ahora mismo. Cambiarla rompe partidas en curso a cambio de</sub>

### `gen_paginas.mjs`

- **POR QUÉ SE GENERA Y NO SE ESCRIBE** <sub>línea 6</sub>
  <br><sub>La antesala necesita saber a dónde mandar a cada uno: entropy tiene su mesa de casino, el ajedrez su tablero, y los dieciséis juegos nuevos no tienen página propia — se juegan en `mesa.html`, que sirve a los treinta.</sub>
- **Y LOS QUE NO TIENEN PÁGINA NO SE OMITEN: SE MANDAN A LA GENÉRICA.** <sub>línea 51</sub>
  <br><sub>Omitirlos dejaría a dieciséis juegos fuera de la antesala sin decir por qué — y no están rotos, se juegan perfectamente en `mesa.html`. Un catálogo que esconde la mitad de lo que hay es peor que uno que lo lista todo.</sub>

### `inventario_piezas.py`

- **Y ESTA HERRAMIENTA ME MINTIÓ (2 ago 2026)** <sub>línea 10</sub>
  <br><sub>Dijo «22 módulos sin ningún importador, 430 KB de motor sin enchufar» y me lo creí lo suficiente como para ir a contárselo a Oscar. Falso: cinco de ellos —`VoxelGlitchFactory`, `CompizEnvironmentFactory`, `TreadmillEnvironmentFactory`,</sub>

### `jugadores.mjs`

- **LA PREGUNTA QUE CONTESTA, Y POR QUÉ NO LA CONTESTABA NADIE.** <sub>línea 8</sub>
  <br><sub>Todo este proyecto se sostiene sobre una frase: **personas y máquinas juegan al mismo juego**. De ahí sale que la clasificación compare algo, que el corpus valga y que el banco de pruebas no sea un adorno.</sub>
- **LOS TIPOS NO SE ESCRIBEN AQUÍ: SE LEEN DE `asientos.js`.** <sub>línea 26</sub>
  <br><sub>`CONTROLADORES` es el contrato —sus claves viajan en `?asientos=`— así que esta herramienta recorre lo que haya. El día que se añada un sexto tipo aparece solo, y si nadie lo ha cableado, sale en rojo. Una lista escrita a mano aquí sería la</sub>
- **Y LA PERSONA NO SE PUEDE SIMULAR, ASÍ QUE NO SE FINGE.** <sub>línea 33</sub>
  <br><sub>Un asiento de persona devuelve `elegir() => null` a propósito: espera un dedo. Aquí se dice eso mismo en vez de inventarse una persona de mentira — lo que sí está medido es que sus botones llegan, y eso lo hace `tacto.mjs` en un navegador de</sub>
- **Y SIN ESO NO SALE EN ROJO: SALE EN GRIS.** <sub>línea 61</sub>
  <br><sub>«No puede jugar» y «no le he dado servidor» son cosas distintas, y pintarlas igual es la forma más rápida de que un suspenso permanente enseñe a ignorar los suspensos. Es la misma distinción que ya se aplica en `legibilidad` entre lo que</sub>
- **SI NO SUPO ELEGIR, SE CUENTA COMO FORZADA Y SE DICE.** <sub>línea 110</sub>
  <br><sub>Es la misma regla que el banco: rellenar el hueco en silencio sería regalar partidas a quien no supo jugarlas. Aquí se juega la primera legal para que la partida siga —hace falta llegar al final para tener recibo— pero el</sub>
- **APORTAR VA DETRÁS DE UNA BANDERA, Y NO POR PRUDENCIA VACÍA.** <sub>línea 200</sub>
  <br><sub>Estas partidas son legítimas —se juegan por el mismo hub y se verifican igual— y llenarían el corpus en un minuto. Precisamente por eso no se mandan solas: un corpus lleno de la política tonta jugando la primera legal dice muy poco, y</sub>

### `jugar_llm.mjs`

- **LA FILA SE VERIFICA ANTES DE EXISTIR.** <sub>línea 98</sub>
  <br><sub>if (r.recibo && reglas) { const v = verificar(reglas, r.recibo); if (v.valida) verificadas++;</sub>

### `laboratorio_mesas.mjs`

- **POR QUÉ EXISTE, CON LOS NÚMEROS DEL DÍA QUE LO PARIÓ** <sub>línea 7</sub>
  <br><sub>El 11 de agosto de 2026 abrí por primera vez diez juegos que nadie había mirado. Seis estaban rotos:</sub>
- **QUÉ SE MIDE, Y POR QUÉ ESTAS SEIS COSAS Y NO OTRAS** <sub>línea 26</sub>
  <br><sub>Cada una nació de un fallo real de ese día, y todas valen para los 31 sin saberse ninguno — ni listas de juegos, ni nombres de campos, ni casos especiales:</sub>
- **Y POR QUÉ EN UN NAVEGADOR DE VERDAD Y NO SIMULADO** <sub>línea 51</sub>
  <br><sub>Los seis fallos de arriba viven ENTRE las reglas y la pantalla. Las reglas pasaban sus pruebas; el estado era correcto en todos los casos. Lo que fallaba era el trecho que ninguna prueba de Node puede recorrer.</sub>
- **ESTOS DOS SUELOS LOS PUSE A OJO Y SUSPENDIERON A JUEGOS SANOS.** <sub>línea 69</sub>
  <br><sub>La primera pasada dio 19 rotos de 31, y casi todos eran culpa mía. Los números que lo enseñaron, medidos:</sub>
- **UN DECODIFICADOR DE PNG DE VEINTE LÍNEAS, Y NO UNA DEPENDENCIA.** <sub>línea 89</sub>
  <br><sub>Sólo hace falta para contar colores, y `zlib` viene con Node. Meter una biblioteca de imágenes para esto engordaría el paquete que la propia lista de antes de publicar vigila. Chrome entrega PNG de 8 bits sin entrelazar, que es el</sub>
- **JUGAR COMO JUEGA ALGUIEN, NO LLAMANDO AL HUB.** <sub>línea 202</sub>
  <br><sub>Preguntar `hub.move(...)` desde fuera comprueba las reglas, que ya las cubre `npm test`. Lo que hay que comprobar aquí es que exista un CAMINO desde la pantalla hasta esa llamada — poker tenía las reglas perfectas y ninguna forma de</sub>
- **TRES INTERFACES DISTINTAS, Y NINGUNA ES «LA RARA».** <sub>línea 221</sub>
  <br><sub>Mi primera versión sólo buscaba botones `.mesa-jugada` y acusó a ONCE juegos sanos de «no hay forma de mandar las jugadas». Falso las once veces:</sub>
- **LA HUELLA BORRA CLAVES, NO RECORTA TEXTO — Y CUÁLES BORRA SE MIDIÓ.** <sub>línea 326</sub>
  <br><sub>La primera versión tachaba campos con una expresión regular sobre el JSON, y suspendió a los 31 con el mismo mensaje. Treinta y uno de treinta y uno con el mismo fallo es un instrumento roto, no treinta y un juegos rotos.</sub>
- **Y LA IDENTIDAD SE MIDE POR EL VOCABULARIO, NO POR EL REPARTO.** <sub>línea 370</sub>
  <br><sub>Comparar el estado entero contra un reparto recién hecho en Node suspendió al go, al reversi y al peatón. Ninguno estaba roto: cuando el laboratorio mira, esas páginas YA HAN JUGADO —el go y el reversi tienen turno de blancas, o sea</sub>
- **UN SEGUNDO INTENTO, Y DICHO EN VOZ ALTA.** <sub>línea 401</sub>
  <br><sub>El 15-08-2026 la pasada entera dio `peaton` en rojo con todo a `—`, y sola pasó a la primera. O sea inestabilidad — pero «inestabilidad» es justo lo que me he dicho tres veces hoy antes de encontrar un fallo de verdad debajo.</sub>
- **SE ESPERA A QUE LA PANTALLA PUEDA HABER CAMBIADO.** <sub>línea 478</sub>
  <br><sub>EL TEMBLOR DEL LABORATORIO.</sub>
- **SÓLO SE EXIGE REPRODUCIBILIDAD A LOS QUE ESTÁN QUIETOS, Y QUIÉN LO** <sub>línea 519</sub>
  <br><sub>ESTÁ SE COMPRUEBA, NO SE APUNTA EN UNA LISTA.</sub>

### `legibilidad.mjs`

- **SÓLO MIDE LAS MESAS GENÉRICAS, Y SE DICE.** <sub>línea 31</sub>
  <br><sub>Hacen falta `ALISA_PINTOR` y `ALISA_CAMARA` para saber dónde cae cada pieza. Los visualizadores propios no los exponen y quedan SIN MEDIR — contarlos como limpios sería peor que no mirarlos, que es la lección de `tacto.mjs`.</sub>
- **LOS NÚMEROS, Y DE DÓNDE SALE CADA UNO.** <sub>línea 61</sub>
  <br><sub>No los invento: cada uno viene de un caso que ya pasó.</sub>
- **LA PÁGINA DICE DÓNDE ESTÁ CADA PIEZA; LOS COLORES SE LEEN FUERA.** <sub>línea 109</sub>
  <br><sub>La primera versión leía los píxeles copiando el `<canvas>` a uno 2D dentro de la página. Daba contraste CERO en todo, y no porque los juegos estén mal: el renderizador se crea sin `preserveDrawingBuffer`, así que fuera del</sub>
- **Y SÓLO ENTRE VECINAS EN PANTALLA, QUE ES LA DIFERENCIA.** <sub>línea 137</sub>
  <br><sub>Comparar todos los materiales contra todos daría una lista enorme de parejas que nunca se tocan — ruido, y una comprobación que chilla siempre se acaba ignorando. Dos cosas del mismo color a media pantalla</sub>
- **SÓLO SE MIDE `mano_0_`, QUE ES LA TUYA.** <sub>línea 159</sub>
  <br><sub>Las de los rivales están boca abajo: de ellas sólo hace falta saber cuántas hay, y eso se cuenta igual con el borde cortado. Exigirles el mismo tamaño obligaría a alejar la cámara y dejaría la tuya pequeña,</sub>
- **SIN MANO NO SE ABANDONA: SE SIGUE POR EL OTRO CAMINO.** <sub>línea 179</sub>
  <br><sub>Entropy reparte en CAJA, no en mano, y hay juegos de cartas sin mano ninguna. La primera versión devolvía «sin cartas en mano» y ahí se acababa la medida — la cobertura BAJÓ de 54 a 50 al añadir</sub>
- **SÓLO ENTRE COSAS DE DISTINTA CLASE.** <sub>línea 242</sub>
  <br><sub>Mancala salía marcado por `SphereGeometry ~ SphereGeometry` a 11 de distancia: dos semillas de tono ligeramente distinto, una al lado de otra. Y eso es lo NORMAL — son</sub>
- **CON LOS COLORES, QUE SI NO NO SE PUEDE ARREGLAR.** <sub>línea 262</sub>
  <br><sub>La primera versión decía «BoxGeometry ~ LatheGeometry (16)». Con eso sé que hay un choque y no sé entre QUÉ: en el ajedrez hay tres materiales de caja —casilla clara,</sub>
- **EL TAMAÑO DE UNA CASILLA, EXACTO Y NO APROXIMADO.** <sub>línea 304</sub>
  <br><sub>El pintor coloca UNA UNIDAD DE MUNDO POR CASILLA, y la escala del grupo, la perspectiva y la distancia de cámara están todas dentro de `raiz.matrixWorld`. Así que basta proyectar dos puntos separados por</sub>
- **EL CAMUFLAJE SE BUSCA EN LOS MATERIALES, NO EN LOS PÍXELES** <sub>línea 337</sub>
  <br><sub>El jugador de fagocito era un cubo `0x2a3550` entre muros `0x39485c`: distancia 26. Perfectamente dibujado, con su geometría y su sombra, e invisible. Ése es el fallo que esta prueba existe para cazar.</sub>
- **Y AQUÍ, NO ENTRE BANDOS, ES DONDE VA LA COMPROBACIÓN EN GRIS.** <sub>línea 404</sub>
  <br><sub>La escribí primero comparando bando contra bando, junto a la del daltonismo. Y al comprobar que podía fallar —subiendo su umbral a 200, que debería suspender a todo el mundo— **no saltó ni una vez**: aquel</sub>
- **¿SE DISTINGUEN LOS BANDOS SIN EL TONO?** <sub>línea 436</sub>
  <br><sub>La guía de Board Game Arena lo pone como requisito de accesibilidad y no como extra: color emparejado con forma, símbolo o textura. Una de cada doce personas con cromosoma Y no separa el rojo del verde, y el</sub>
- **DOS LISTAS: LO QUE HAY QUE ARREGLAR Y LO QUE HAY QUE SABER.** <sub>línea 478</sub>
  <br><sub>Un tablero de 28 columnas en un móvil da casillas de 10 px, y una mano de trece cartas no cabe legible en 390 px. Las dos cosas son verdad y ninguna tiene arreglo moviendo la cámara: piden otra interfaz, que es otra tarea.</sub>
- **UNA CARTA PIDE MÁS QUE UNA CASILLA, Y POR UNA RAZÓN CONCRETA.** <sub>línea 492</sub>
  <br><sub>De una casilla basta ver que hay algo y de qué color. De una carta hay que leer el RANGO y EL PALO, y el palo va en una esquina. Cuando las del tute medían 46 px de ancho el rango se leía y el palo no — y en el tute servir al</sub>
- **Y CUÁNDO NO CABE, SE DICE, COMO CON FAGOCITO.** <sub>línea 503</sub>
  <br><sub>Trece cartas a 60 px son 780, y una pantalla de móvil tiene 390. No hay cámara que arregle eso: en vertical una mano larga NO se puede leer carta a carta, y la interfaz de verdad ahí son los botones del panel — que</sub>
- **PEQUEÑA» NO ES SIEMPRE LO MISMO, Y HAY QUE DECIR CUÁL.** <sub>línea 525</sub>
  <br><sub>Fagocito da 9 px de casilla en vertical. No es un encuadre malo: es un laberinto de 28x28 en una pantalla de 390, o sea unos 11 px por casilla haga lo que haga la cámara. Eso no se arregla moviendo nada — se arregla con una</sub>
- **EN GRIS VA COMO AVISO Y NO COMO SUSPENSO, LA PRIMERA VEZ.** <sub>línea 549</sub>
  <br><sub>Es una comprobación NUEVA y más dura que las dos que ya había, y un umbral recién calibrado puede señalar cosas que se ven perfectamente. Encenderla en rojo el mismo día que se escribe es la receta para que la pasada salga roja,</sub>

### `mapa_del_sitio.py`

- **POR QUÉ EXISTE (1 de agosto de 2026)** <sub>línea 6</sub>
  <br><sub>`inventario_piezas.py` solo miraba `js/alisa-engine/src/`, o sea los módulos JS del motor. Por eso dio 66 huérfanos y me quedé tan tranquila… teniendo al lado `arcade/engines/` con 77 KB de reglas de cartas en Python, la biblioteca de 25</sub>

### `matriz_generos.mjs`

- **POR QUÉ NO CLASIFICAR POR GÉNERO** <sub>línea 9</sub>
  <br><sub>Porque «puzle», «rogue», «cartas» son etiquetas de tienda, no de ingeniería: no dicen nada sobre qué hay que saber hacer para jugar bien. Ajedrez y go se venden en estanterías distintas y plantean el mismo problema —información</sub>
- **Y POR QUÉ MEDIR EN LUGAR DE DECLARAR** <sub>línea 19</sub>
  <br><sub>Porque una etiqueta escrita a mano envejece en silencio: se cambia una regla y la tabla sigue diciendo lo de antes. En este proyecto eso ya ha pasado con cosas más graves —go publicando el tablero en `board` mientras la puerta de</sub>
- **Dice «decide alguien más», no «alguien en contra».** <sub>línea 54</sub>
  <br><sub>turno cambia de silla, y eso lo cumple igual un adversario que un compañero. Llamarlo rival daba por supuesto lo que aún no se ha mirado — de eso se ocupa `cooperativo`, y por eso son dos ejes y no uno.</sub>
- **SE REJUEGA EN VEZ DE CLONAR, Y NO ES UN CAPRICHO.** <sub>línea 76</sub>
  <br><sub>saber qué hay dentro —hay juegos que guardan barajas, mapas y conjuntos— y un clon incompleto daría medidas falsas sin avisar. Rejugar sólo exige lo que el motor ya promete: que la partida es una función de la semilla y las jugadas.</sub>
- **`completa` NO ES UN ADORNO: SIN ELLA TRES EJES MENTÍAN.** <sub>línea 88</sub>
  <br><sub>Si una jugada del prefijo no encaja, esto cortaba y devolvía el estado a medias sin decirlo. Y como las ramas se construyen añadiendo una jugada AL FINAL, un prefijo roto hace que **todas las ramas acaben en el mismo estado</sub>
- **Las jugadas que se guardan son las de la semilla que luego se** <sub>línea 139</sub>
  <br><sub>rejuega, y sólo ésas. Antes se guardaba la partida más larga de las tres y se rejugaba siempre con la primera: un camino de otra semilla no encaja, el rejugado se rompía y las sondas medían un estado a medias.</sub>
- **IRREVERSIBILIDAD, POR REJUGADO.** <sub>línea 149</sub>
  <br><sub>En un punto de la partida se pregunta: después de mover, ¿existe alguna jugada legal que devuelva el tablero exactamente a como estaba? Si no la hay, esa decisión era definitiva — y planificar antes de mover deja de ser</sub>
- **EL MUNDO AVANZA SOLO» — POR COMPARACIÓN DE RAMAS, Y LA PRIMERA VERSIÓN** <sub>línea 183</sub>
  <br><sub>ESTABA MAL.</sub>
- **Y HAY UNA SEGUNDA CONFUSIÓN, QUE CAZÓ **DAMAS**.** <sub>línea 198</sub>
  <br><sub>Salía marcado, y no tiene nada autónomo: es que el rival contesta DENTRO de tu jugada, así que sus fichas se mueven en las dos ramas. Eso no es el mundo corriendo, es un adversario decidiendo — el eje `rival`, disfrazado.</sub>
- **Y SE MIRA EN VARIOS INSTANTES, NO EN UNO — LO PIDIÓ **CRIPTA**.** <sub>línea 210</sub>
  <br><sub>Sondeando sólo la jugada 2 salía sin agentes autónomos teniendo bichos: a esa altura están dormidos, porque sólo persiguen de cerca. Un mundo que reacciona no lo hace desde el primer paso, así que preguntar una vez y al</sub>
- **SIMULTÁNEO — Y LA FIRMA ES EXACTA, NO UNA APROXIMACIÓN.** <sub>línea 236</sub>
  <br><sub>Decidir a la vez no se puede leer del código ni del reparto de turnos: un juego simultáneo implementado sobre turnos se parece a uno por turnos en todo… menos en una cosa, y esa cosa es LA definición. **Si el segundo en</sub>
- **SE COMPARA **TODO** LO QUE EL OTRO PUEDE VER, Y ANTES NO.** <sub>línea 264</sub>
  <br><sub>La primera versión miraba sólo el sustrato y las jugadas legales, y marcó **poker como simultáneo**: subir o pasar no cambia las cartas de la mesa, así que los dos cuadros salían</sub>
- **Y SE MIRAN LOS DOS ASIENTOS, NO EL ASIENTO 1.** <sub>línea 277</sub>
  <br><sub>La primera versión comparaba siempre la vista del asiento 1, y con eso **este propio banco declaró `frentes` no simultáneo** siendo el único que lo es. El motivo: en la</sub>
- **LAS DOS VISTAS, NO «ALGUNA» — Y LO PIDIÓ **SIGILO**.** <sub>línea 300</sub>
  <br><sub>Con «alguna» salía marcado, y no es simultáneo: cuando el ladrón se mueve sin que el guardia lo vea, la vista del guardia no cambia. Eso es movimiento OCULTO, que ya tiene su</sub>
- **BASTA CON QUE PASE UNA VEZ, Y NO ES RELAJAR EL LISTÓN.** <sub>línea 317</sub>
  <br><sub>Exigirlo en TODOS los instantes es imposible por construcción, y también lo aprendí suspendiendo a `frentes`: en las jugadas del segundo, su elección CIERRA la ronda, así que ahí cambian las dos</sub>
- **COOPERATIVO — SE MIRA SI LOS DOS MARCADORES SE MUEVEN JUNTOS.** <sub>línea 335</sub>
  <br><sub>No hace falta preguntarle al juego si es cooperativo: se juega y se mira a dónde va el marcador de cada asiento. Si suben y bajan a la vez, los dos reman en la misma dirección; si uno sube cuando el otro baja, están</sub>
- **¿HAY VISTA POR ASIENTO?» SE PREGUNTA AL ESTADO ENTERO, NO** <sub>línea 356</sub>
  <br><sub>AL MARCADOR — Y ANTES NO, LO QUE HACÍA IMPOSIBLE DETECTAR UN COOPERATIVO.</sub>
- **Y SI LOS DOS MARCADORES SON EL MISMO NÚMERO, NO SE SABE.** <sub>línea 380</sub>
  <br><sub>La primera versión marcó **el ajedrez como cooperativo**, y con go, reversi, xiangqi y mancala detrás. El motivo no era el juego: es que esos módulos ignoran el asiento en `estado`, así que devuelven el</sub>
- **COMUNICACIÓN — Y ES LA COMPLEMENTARIA EXACTA DE LA SIMULTANEIDAD.** <sub>línea 398</sub>
  <br><sub>Simultáneo: eliges y **no cambia nada en ninguna parte** hasta que el otro también elige. Comunicación: eliges, **el mundo sigue igual** —nadie se ha movido, no hay ficha nueva— **pero lo que sabe el otro ha cambiado**.</sub>
- **Se cuenta lo comprobado para poder decir «·» (medido y no hay) en** <sub>línea 415</sub>
  <br><sub>vez de «?» (no lo sé). La sonda sólo sabía afirmar, así que un juego sin canal salía como no observable — confundir ausencia con ignorancia es el error que esta tabla existe para no cometer.</sub>
- **EL MUNDO QUIETO SE COMPRUEBA DESDE LAS DOS SILLAS, Y ANTES** <sub>línea 426</sub>
  <br><sub>NO — POR ESO **SIGILO** SALÍA MARCADO SIN TENER CANAL.</sub>
- **Y se pide el sustrato POR SILLA. `obtenerSustrato` llama a** <sub>línea 439</sub>
  <br><sub>`reglas.sustrato(p)` sin asiento, así que devolvía el mismo cuadro dos veces y la comprobación de arriba no comprobaba nada: sigilo seguía saliendo marcado. Un adaptador que ignora</sub>
- **LOS PERFILES SON LO QUE DE VERDAD DICE SI FALTA ALGO.** <sub>línea 501</sub>
  <br><sub>Que cinco ejes salgan cubiertos no significa que estén cubiertas sus COMBINACIONES, y las combinaciones son las que duelen. Tener juegos con rival y juegos con información oculta no equivale a tener uno con las dos cosas a la</sub>
- **Y LA MISMA MEDIDA, EN UNA PÁGINA.** <sub>línea 521</sub>
  <br><sub>«Con este motor se puede hacer cualquier género» es la frase que sostiene el proyecto entero, y hasta ahora vivía en un documento que sólo lee quien ya nos cree. Aquí sale como tabla pública, con cada juego enlazado a su tablero: quien</sub>
- **JSON PORQUE ESTA TABLA HAY QUE CRUZARLA, NO SÓLO LEERLA.** <sub>línea 614</sub>
  <br><sub>Hasta ahora salía en markdown y en HTML: las dos para ojos humanos. Pero el perfil de un JUGADOR se calcula cruzando qué ejes ejercita cada juego con cómo le fue en cada juego, y para eso hace falta el dato, no su maquetación.</sub>

### `mirar.mjs`

- **POR QUÉ EXISTE, Y POR QUÉ NO ES EL LABORATORIO.** <sub>línea 7</sub>
  <br><sub>El laboratorio pregunta «¿se puede jugar?» y responde bien: pinta, llega una jugada, cambia la imagen. Con eso los 35 salen en verde. Y aun así, mirando las capturas una por una aparecieron cosas que ninguna de sus seis medidas ve:</sub>
- **DOS FORMAS DE VENTANA, Y LA SEGUNDA ES LA QUE ME PILLÓ.** <sub>línea 46</sub>
  <br><sub>Esto miraba a 1280x720 y sólo a 1280x720. El 13-08-2026 llegó un aviso:</sub>
- **Y LA TERCERA ES UN MÓVIL, PORQUE SIN ELLA LA COMPROBACIÓN NUEVA NO VE NADA.** <sub>línea 63</sub>
  <br><sub>Las dos de arriba son de escritorio, y ahí el panel es una columna lateral que deja libre el centro: `arribaLibre` vale 0 y no hay nada que esquivar. El fallo que destapó la comprobación de piezas escondidas —xiangqi con once de treinta y</sub>
- **Y CON SU PROPIO LISTÓN DE «CUÁNTO TAPA EL PANEL».** <sub>línea 79</sub>
  <br><sub>El 22% se calibró mirando escritorio, donde el panel es una columna estrecha a un lado. En vertical es una franja que ocupa el ancho entero: mide un 30% en xiangqi y un 24% en go, y eso NO es un fallo — es el diseño, y el tablero se</sub>
- **ESTO TARDA, Y HAY QUE PODER DISTINGUIR «LENTO» DE «COLGADO».** <sub>línea 100</sub>
  <br><sub>Son dos formas de ventana por juego, o sea setenta cargas de página con Chrome de verdad: entre diez y veinticinco minutos según lo que más esté corriendo a la vez. El 14-08-2026 lo di por colgado y lo maté cuando iba por la mitad — y luego</sub>
- **¿HAY PIEZAS DEBAJO DEL PANEL? NO ES LO MISMO QUE «CUÁNTO TAPA».** <sub>línea 168</sub>
  <br><sub>Justo aquí abajo se mide qué porcentaje de pantalla ocupa el panel, y los treinta y cinco pasaban el listón del 22%. Pero un porcentaje bajo no impide que lo tapado sea justo lo único que hay que ver: en snake la</sub>
- **SE PREGUNTA A LA MALLA, NO SE INTERPOLA SOBRE LA CAJA.** <sub>línea 183</sub>
  <br><sub>La primera versión sacaba la posición de cada pieza interpolando sobre el `Box3` de la raíz. Esa caja incluye el FARO, que va metro y medio por encima del tablero, así que proyectaba todas las piezas por los aires — o</sub>

### `perfil_jugador.mjs`

- **Y SIRVE PARA REFUTAR, QUE ES PARA LO QUE SE ESCRIBIÓ.** <sub>línea 15</sub>
  <br><sub>El reparto de huevos por castas —el mejor de cada casilla del mapa de perfiles, no los N primeros de una lista— **descansa en que los ocho ejes separen JUGADORES**. Sabemos que separan juegos; eso está medido. Que separen</sub>
- **EL «REPARTO» ES LA CIFRA QUE DECIDE SI HAY CASTAS.** <sub>línea 63</sub>
  <br><sub>Es cuánto se separan entre sí los ejes de un mismo jugador. Si es pequeño, ese jugador es igual de bueno en todo y su perfil no dice nada — no tiene casta, tiene nivel. Si es grande, tiene forma: es fuerte en unas cosas y</sub>
- **EL VEREDICTO NO LO DECIDE LA MEDIA, Y LA PRIMERA VERSIÓN SÍ.** <sub>línea 93</sub>
  <br><sub>Promediaba el reparto de todos los participantes y cantaba «hay forma» con 0,34. Debajo de ese número: `qwen2.5:7b`, el único jugador de verdad medido, tenía **0,15 — plano**; y el 0,86 de `azar` salía casi entero de un</sub>

### `png.mjs`

- **Y POR QUÉ SE LEE UNA CAPTURA Y NO EL LIENZO DE LA PÁGINA.** <sub>línea 10</sub>
  <br><sub>Lo natural sería copiar el `<canvas>` a uno 2D y leer de ahí, y es lo que hacía `mirar.mjs`. No funciona: el renderizador se crea sin `preserveDrawingBuffer`, así que fuera del fotograma el buffer está vacío y `drawImage` devuelve NEGRO.</sub>
- **COLORES DISTINTOS» NO ES LA PREGUNTA.** <sub>línea 96</sub>
  <br><sub>El azul del dueño 0 (`0x2a3550`) y el rojo del dueño 1 (`0xc0392b`) están a 150 puntos de distancia: separadísimos, y cualquier medida en RGB dice que van bien. Para un deuteranope —una de cada doce personas con cromosoma Y— los dos se</sub>

### `preflight.py`

- **Esto miraba si la palabra «publicable» aparecía en la salida.** <sub>línea 213</sub>
  <br><sub>que la frontera quedó ORDENADA, el guardián cambió su veredicto a «✅ frontera limpia y ordenada» —mejor resultado, sin esa palabra— y `preflight` empezó a fallar. Un comprobador que se rompe porque lo</sub>
- **Esto faltaba, y la primera versión medía la cosa equivocada: puse un** <sub>línea 232</sub>
  <br><sub>presupuesto de 150 MB sobre `public/` entero, como si al visitante le llegara el repositorio. No le llega. Medido en el navegador, **la sala pesa 1,72 MB** —de los cuales 1,24 MB son `three`— porque una página sólo carga lo suyo.</sub>
- **LICENCIA: un pack prohíbe la redistribución.** <sub>línea 268</sub>
  <br><sub>prohibidos = [p for p in ficheros if "Lowpoly Animals eng" in str(p)] comprobar("sin recursos que prohíban redistribuirse", not prohibidos, f"{len(prohibidos)} ficheros de Seaeees — su licencia no lo permite")</sub>

### `public/js/gym_runners/chopper_aquarium_gym.js`

- **POR QUÉ NO CONTABA COMO ARNÉS** <sub>línea 4</sub>
  <br><sub>Este fichero era un SCRIPT SUELTO: todo el cuerpo estaba al nivel del módulo, así que corría con sólo importarlo y no exportaba nada. Los otros 21 hermanos exportan `runGymEpisode(pasos, nombre)`; éste no, y por eso quedaba fuera de</sub>

### `public/js/gym_runners/fsm_gym.js`

- **POR QUÉ ESTABA ROTO** <sub>línea 15</sub>
  <br><sub>Este fichero llamaba a `new FSMSystem({fovAngle, fleeDistance, …})` y a `engine.tick(agente, amenaza, presa, dt)`, una API de una versión anterior que ya no existe. Nunca reventó porque el fichero solo EXPORTABA la función</sub>

### `public/js/GymAgent.js`

- **Error in polling loop: ${err.message}.** <sub>línea 33</sub>
  <br><sub>} await this.sleep(10000); // 10 seconds heartbeat }</sub>
- **Failed to claim job:`, claimData);** <sub>línea 59</sub>
  <br><sub>} } }</sub>
- **RPC Error:`, e.message);** <sub>línea 64</sub>
  <br><sub>}</sub>
- **Server rejected submission:`, data);** <sub>línea 146</sub>
  <br><sub>} } catch(e) {</sub>
- **Submit RPC Error:`, e.message);** <sub>línea 149</sub>
  <br><sub>} }</sub>

### `public/labs/js/montarEscena.js`

- **POR QUÉ NO BASTABA CON `pieza.html?m=…`** <sub>línea 12</sub>
  <br><sub>Aquel lanzador genérico responde muy bien a **«¿esta pieza construye algo?»** y fatal a **«¿qué aspecto tiene?»**. Medido: `DojoEnvironmentFactory` construye 135 mallas sobre 369×327 y en un `AlisaRenderCore` pelado se lee como una</sub>
- **Y LO QUE DEMUESTRA, QUE ES EL ASUNTO** <sub>línea 23</sub>
  <br><sub>Cada página queda en cinco líneas: una pieza del motor, una luz, un poco de post-proceso. Quien mire el fuente ve que **el motor se compone**, que es exactamente lo que hay que enseñar — se puede armar un juego, un gimnasio</sub>
- **La distancia es 0,45 de la diagonal, y ese número sale de MEDIR, no de** <sub>línea 63</sub>
  <br><sub>encajar la caja con trigonometría. La fórmula "correcta" ponía la cámara al doble y la escena se fundía con el fondo: estas escenas son grandes y dispersas, y a la distancia que las encaja enteras cada pieza ocupa menos de</sub>
- **SE PINTA DIRECTO Y LUEGO EL POST, EN ESE ORDEN.** <sub>línea 135</sub>
  <br><sub>El compositor puede acabar en negro para escenas que no esperaba; si fuera lo único, la página mentiría diciendo que no hay nada.</sub>

### `public/manifiesto/assets/AssetManager-BoZEx7Dx.js`

- **No GLTF Delegate found.** <sub>línea 2</sub>

### `que_tenemos.py`

- **POR QUÉ EXISTE (1 de agosto de 2026, dicho por Oscar)** <sub>línea 7</sub>
  <br><sub>«te das cuenta que todo el rato estas haciendo lo mismo? por no mirar lo que ya tenemos te buscas mas trabajo del necesario»</sub>
- **Esto empezó mirando solo cuatro carpetas, y volví a tropezar con lo mismo:** <sub>línea 37</sub>
  <br><sub>una herramienta con MI punto ciego no me salva de mi punto ciego. Medí la frontera y había barrido el 0,9% de los ficheros. Ahora pregunta al territorio, no al barrio: motores fuera del sitio web, el ML en Python, los</sub>

### `reparar_mojibake.py`

- **El primer intento hacía la vuelta con el FICHERO ENTERO y encontró cero** <sub>línea 9</sub>
  <br><sub>casos, incluido el que tenía delante. El motivo: los ficheros son una MEZCLA — parte sana con caracteres que no caben en cp1252 (emoji, ✅), parte rota. La vuelta entera reventaba y el fichero se descartaba en silencio. Hay que reparar</sub>

### `reparar_rutas_legacy.py`

- **LA LECCIÓN, QUE ES LA CARA** <sub>línea 23</sub>
  <br><sub>Un juego «obsoleto» y un juego con las rutas mal se ven exactamente igual desde fuera: una pantalla a medias. Sólo se distinguen abriéndolo. Llevábamos meses dando por perdido lo segundo creyendo que era lo primero.</sub>
- **Y las que se arman con plantilla: `` `props/models/Rock_${i}.glb` ``.** <sub>línea 45</sub>
  <br><sub>: La primera versión sólo miraba cadenas entrecomilladas y dejó las siete : rocas rotas — el mismo disfraz que ya me engañó en `empaquetar.py`. Una ruta : construida en ejecución es invisible para cualquier herramienta que lea el</sub>

### `rescatar_esqueletos.py`

- **No todos los huesos son literales: las extremidades espejadas se** <sub>línea 78</sub>
  <br><sub>escribieron dentro de `[1, -1].forEach(side => …)`, así que llevan expresiones como `side * 0.5`. La primera versión de esto reventó con `could not convert string to float: 'side*0.5'` — y menos mal, porque</sub>
- **`bipedal` en la base tiene {n} hueso(s) — es el muñón. ** <sub>línea 172</sub>
  <br><sub>f"`humanoid` entra con {len(dict(nuevos).get('humanoid', []))}.")</sub>
- **Y una salvedad que hay que decir: un pollo camina a dos patas y no** <sub>línea 204</sub>
  <br><sub>tiene hombros. Para eso están `bird` y `primate`; esto arregla el caso genérico, no todos. PRESTAMOS = {</sub>

### `resolver_three.mjs`

- **NO SE COPIA `three`: SE APUNTA AL QUE YA ESTÁ EN `public/vendor/`.** <sub>línea 16</sub>
  <br><sub>Es el MISMO fichero que carga el navegador. Si se instalara `three` de npm para esto, Node y el navegador podrían estar ejecutando versiones distintas y la prueba dejaría de decir nada sobre lo que ve un usuario.</sub>

### `salas.mjs`

- **QUÉ SILLAS TIENE CADA JUEGO YA NO SE ADIVINA** <sub>línea 16</sub>
  <br><sub>Sale de `ASIENTOS`, que los 35 declaran desde el 16-08 y que se cruza contra lo que reparte la partida y contra el mapa del árbitro. Antes había que suponerlo por el nombre, y suponerlo es como la ficha del ajedrez acabó anunciando un asiento.</sub>

### `sentarse.mjs`

- **AQUÍ `fsm:casa` SÍ FUNCIONA, Y EN EL NAVEGADOR NO** <sub>línea 20</sub>
  <br><sub>La política `casa` le pregunta al juego su sugerencia, y para eso hace falta la PARTIDA de verdad, no su estado publicado. En una pestaña dentro de una sala no la hay —vive en el árbitro— así que allí no se ofrece. Aquí sí: el recibo trae</sub>
- **Y NO SE JUEGA POR NADIE** <sub>línea 28</sub>
  <br><sub>Si el controlador no elige —un modelo que no acierta a dar una de las legales— se para y lo dice. En el banco de pruebas eso se cuenta como jugada «forzada» y se publica el porcentaje; rellenar el hueco en silencio sería regalarle</sub>
- **A cuántos espera la mesa antes de arrancar.** <sub>línea 82</sub>
  <br><sub>sola contra la casa, que es lo de siempre—, pero entre agentes hay que decirlo: en la primera prueba con dos procesos, el segundo llegó tres segundos tarde y se encontró la partida terminada, cuarenta jugadas, cero</sub>
- **EL SECRETO DEL ASIENTO.** <sub>línea 91</sub>
  <br><sub>La mesa lo entrega una sola vez, al sentarte, y lo exige en cada jugada. Antes bastaba con decir un nombre: cualquiera que supiera el de la sala podía mover las piezas de otro. Decir quién eres y demostrarlo son cosas distintas,</sub>

### `servidor_verificador.mjs`

- **EL PARCHE DE `fetch` NO ES UN ADORNO** <sub>línea 32</sub>
  <br><sub>Dos módulos (blackjack y póker) leen `card_library.json` con `fetch(new URL(..., import.meta.url))`. En el navegador eso es HTTP; en Node es `file://`, y el `fetch` de Node **no sirve ficheros locales**: lanza. Los</sub>
- **`puntos` es SIEMPRE el recalculado, nunca el que venía en el envío.** <sub>línea 177</sub>
  <br><sub>Devolver el del cliente aquí convertiría todo esto en un adorno caro. responder(res, 200, { valida: r.valida,</sub>

### `servir.py`

- **POR QUÉ EXISTE (1 de agosto de 2026)** <sub>línea 4</sub>
  <br><sub>`http.server` no manda cabeceras de caché. Sin ellas el navegador aplica su caché heurística: se queda con la copia vieja de los .js y NO la revalida. Cambiar la URL del HTML (`?v=21`) no sirve de nada, porque la URL del módulo</sub>
- **Y sirve el paquete SIN CACHÉ por la misma razón.** <sub>línea 22</sub>
  <br><sub>con un `python -m http.server` pelado y me dio una página que llamaba a Google Fonts… usando un CSS viejo de la caché del navegador, mientras el servidor mandaba el corregido. Otra vez el testigo mintiendo, y esta vez casi me lo creo.</sub>
- **`.mjs` ES JAVASCRIPT, Y AQUÍ SALÍA COMO `text/plain`.** <sub>línea 49</sub>
  <br><sub>Python no lo conoce, así que un módulo con esa extensión se servía como texto y el navegador se NEGABA a ejecutarlo — con el mensaje inútil «no se pudo cargar», que apunta al fichero y no al servidor. El fichero</sub>
- **Esto era `str(args[1])` a pelo, y `log_message` NO siempre recibe** <sub>línea 78</sub>
  <br><sub>dos argumentos: `log_error` la llama con uno solo. El IndexError reventaba el manejador a media respuesta, así que el servidor cerraba la conexión sin contestar: el navegador veía ERR_EMPTY_RESPONSE en vez</sub>
- **Y ESTO SÍ QUE MUERDE: arrancado con `pythonw.exe` no hay consola, y** <sub>línea 87</sub>
  <br><sub>`sys.stderr` es None. `log_message` escribe ahí, así que reventaba el manejador ENTERO y el navegador recibía una respuesta vacía en vez de un 404. Los 200 iban bien porque a esos no les escribimos nada: el</sub>

### `tabla.mjs`

- **SU LÍMITE, DICHO AQUÍ Y NO EN UNA NOTA AL PIE** <sub>línea 24</sub>
  <br><sub>Si `casa` y `primera` sacan casi lo mismo en un juego, el denominador es diminuto y el normalizado se dispara por ruido. Esos juegos se marcan y **no entran en la media**: son justo los que `calibrar.mjs` da como «sin señal».</sub>
- **LAS LÍNEAS BASE SE MIDEN CON MUCHAS MÁS SEMILLAS, Y ES LA CORRECCIÓN MÁS** <sub>línea 73</sub>
  <br><sub>ÚTIL DE TODA ESTA HERRAMIENTA.</sub>
- **UN TOPE POR JUEGO, MEDIDO, EN VEZ DE UN NÚMERO IGUAL PARA TODOS.** <sub>línea 91</sub>
  <br><sub>Un tope global tiene que servir a la vez a la generala —once casillas, se acaba en cincuenta jugadas— y al go, que con la política tonta llena el tablero y necesita mil ochocientas. Puesto bajo, corta las partidas largas y el juego cae de la tabla;</sub>
- **¿ESTAMOS MIDIENDO SOBRE TODOS LOS JUEGOS QUE HAY? EL CONTROL DEL DENOMINADOR** <sub>línea 120</sub>
  <br><sub>La línea de arriba es un `filter` por exclusión, y ese patrón exacto ya nos costó un fallo: `check_gym_envs` decía vigilar el banco entero y miraba **6 de 41** porque filtraba por una familia. Aquí es el complementario, y hoy da los 35</sub>
- **CADA PARTIDA SIEMBRA LA SUYA.** <sub>línea 201</sub>
  <br><sub>su estado de un juego al siguiente y el suelo de `cripta` depende de cuántas jugadas gastó `brisca` antes. Una línea base que cambia según con quién se mida no es una línea base.</sub>
- **LAS SILLAS PODRÍAN ROTAR, PERO NO ROTAN TODAVÍA.** <sub>línea 209</sub>
  <br><sub>El problema es real: todos se sientan SIEMPRE en el primer turno, y en canadiense esa silla gana el 31% contra el 25% limpio de parchís con los cuatro asientos jugando igual. Seis puntos que la clasificación se apunta</sub>
- **ASÍ QUE AHORA SE ROTA POR DEFECTO, Y `--sin-rotar` LO APAGA.** <sub>línea 259</sub>
  <br><sub>Rotar no quita el sesgo del juego —canadiense seguirá premiando a quien empieza— sino que lo reparte: todos los participantes pasan por todas las sillas, así que la ventaja deja de contarse como habilidad de uno.</sub>
- **Y LOS NÚMEROS DE LA TABLA CAMBIAN.** <sub>línea 265</sub>
  <br><sub>que una clasificación rotada NO es comparable con las de antes. La de `resultados/` es de cuando no se rotaba: al regenerarla, se regenera entera.</sub>
- **CADA SEMILLA SE JUEGA EN TODAS LAS SILLAS, NO EN UNA** <sub>línea 274</sub>
  <br><sub>Rotar la silla por semilla —lo de antes— reparte el sesgo pero NO lo quita de la medida: cada partida sigue cayendo entera en una silla u otra, así que la diferencia entre sillas se cuela como varianza de la muestra. Y en algunos</sub>
- **Y AHÍ ESTÁ LO QUE NO ESPERABA: el sesgo de silla NO es del juego, es de** <sub>línea 290</sub>
  <br><sub>QUIEN JUEGA MAL. La casa sale casi indiferente a la silla (31); la política tonta está a su merced (9069, seis veces su propia varianza interna). O sea que la silla no era una constante del entorno que se pudiera restar: es una</sub>
- **Terminar y verificar se cuentan por SEMILLA y a la baja: la semilla** <sub>línea 318</sub>
  <br><sub>cuenta como terminada sólo si terminaron TODAS sus sillas. Contar por silla cambiaría el denominador —`terminadas` se compara contra el número de semillas— y «termina el 94 %» pasaría a significar otra cosa sin que</sub>
- **Que el episodio TERMINE importa tanto como la puntuación.** <sub>línea 340</sub>
  <br><sub>tope corto, una brisca de 40 jugadas se corta a la mitad y el número que sale es el de media partida — comparable entre participantes, sí, pero no es «lo que saca en la brisca». Se cuenta y se avisa.</sub>
- **SEGUNDA VERSIÓN DEL GUARDIA, Y LA PRIMERA ERA DEMASIADO DURA.** <sub>línea 369</sub>
  <br><sub>Comparaba el hueco contra la desviación de UNA partida. Con eso, la brisca —hueco 7, desviación 17— quedaba fuera. Pero el hueco separa dos PROMEDIOS de 80 partidas, y un promedio de 80 se mueve nueve veces menos que una partida:</sub>
- **LAS DOS REFERENCIAS JUEGAN LAS MISMAS SEMILLAS.** <sub>línea 387</sub>
  <br><sub>Esto era `Math.hypot(errorTipico(suelo), errorTipico(techo))`, que es el error de la diferencia entre dos muestras SUELTAS. Y no lo son: `serie[i]` es la partida de la semilla `i` en las dos, o sea el MISMO reparto jugado dos veces con dos</sub>
- **Y MEDIDO, NO CAMBIA NADA.** <sub>línea 398</sub>
  <br><sub>Vine a esto convencido de que era el culpable de que remigio, chinchón y unit salieran «no supera al ruido». No lo es: remigio pasa de ±16,6 a ±16,7 y chinchón de ±15,9 a ±16,4. O sea que las dos series están prácticamente SIN</sub>
- **Y LO QUE DE VERDAD AHOGA A ESTOS TRES ESTÁ EN OTRO SITIO: el sesgo de silla.** <sub>línea 416</sub>
  <br><sub>La nota de `correr` lo tiene medido — en remigio, con la política tonta, la silla 0 saca −54,5 y la silla 1 saca +131,8. Como se ROTA por semilla, cada partida cae en uno de dos regímenes separados por casi doscientos puntos, y esa</sub>
- **SIN `&& se > 0`, Y ESTA ES LA SEGUNDA VEZ QUE LO ESCRIBO MAL.** <sub>línea 427</sub>
  <br><sub>Puse ese guardia esta misma mañana en `calibrar.mjs`, lo quité allí porque invertía el sentido, y lo volví a escribir aquí de memoria. Reversi sale de posición fija: las 80 partidas son idénticas, el error típico es 0 y el</sub>
- **SI UN JUEGO PUNTÚA O NO LO DECIDEN LAS REFERENCIAS, NO LOS CONCURSANTES.** <sub>línea 455</sub>
  <br><sub>Esto era `participantes.some(...)`, o sea: **si un solo participante no terminaba un juego, el juego se caía para todos**. Con un modelo apenas se notaba. Con tres, la tabla salió literalmente vacía — `0/26 juegos con</sub>
- **EXIGIR EL 100% BORRABA UN JUEGO POR DOS PARTIDAS DE DOSCIENTAS CUARENTA.** <sub>línea 475</sub>
  <br><sub>Esto pedía que TODAS las partidas de las dos referencias terminaran. Medido en fagocito con las 120 semillas que juega la tabla: 238 de 240 terminan, y las dos que no son de la política TONTA —«la primera jugada legal siempre»— que entra en</sub>
- **SÓLO ENTRAN LOS JUEGOS CON HUECO POSITIVO.** <sub>línea 527</sub>
  <br><sub>Si la casa saca MENOS que el suelo, el denominador es negativo y la escala se da la vuelta: un participante mediocre sale con 2,86 y uno bueno con −1. Le pasó a la brisca en la primera tanda. Un hueco negativo no es un juego difícil,</sub>
- **UN JUEGO NO PUEDE DESAPARECER DE LAS DOS LISTAS A LA VEZ.** <sub>línea 545</sub>
  <br><sub>Esto era un `continue` a secas: el juego no entraba en la clasificación Y tampoco en `descartados`, así que se evaporaba. Ni ranqueado ni descartado ni mencionado — la tabla decía «29 juegos» y el catálogo tenía 37, y los dos</sub>
- **Y ESTE MOTIVO NO ES EL MISMO QUE EL DE ARRIBA, AUNQUE SE PAREZCA.** <sub>línea 561</sub>
  <br><sub>El veredicto de SI un juego puntúa lo da `separaDeVerdad` con los promedios LARGOS —las `--semillas-base` que juegan las referencias— y ya está escrito arriba. Esto de aquí es otra cosa: el DENOMINADOR con el que se normaliza a los</sub>
- **Y LO QUE NO SE TERMINÓ NO SE PUNTÚA — PERO SÓLO A QUIEN NO LO** <sub>línea 597</sub>
  <br><sub>TERMINÓ.</sub>
- **LA INCERTIDUMBRE VIAJA CON EL NÚMERO.** <sub>línea 612</sub>
  <br><sub>Un modelo se mide con 3 partidas porque cuesta dinero, y 3 partidas de un juego de cartas dicen poco. Publicar «0,71» a secas es fingir una precisión que no se tiene. Se publica el ± y que cada cual juzgue.</sub>
- **Y NO SE RECORTA LA SERIE PARA CALCULARLA — ANTES SÍ, Y MENTÍA.** <sub>línea 617</sub>
  <br><sub>Estaba `.slice(0, SEMILLAS)`, que tiene sentido para la MEDIA (los modelos y las bases deben compararse sobre las mismas semillas) y ninguno para la dispersión: recortaba a una muestra las 80 partidas que</sub>
- **SI EL AZAR LE GANA A LA CASA, LA CASA NO ES UN TECHO.** <sub>línea 636</sub>
  <br><sub>Ya se descarta el juego cuyo techo no supera al suelo —la escala se invertiría—, pero faltaba el caso de en medio y apareció midiendo de verdad: en `rebaño` el azar sacó **2,39** y en `relevo` **1,80**, sobre una</sub>
- **EL TITULAR ES LA MEDIANA, Y NO ES UN TECNICISMO: LA MEDIA MENTÍA.** <sub>línea 670</sub>
  <br><sub>Medido en la primera tanda completa: `qwen2.5:7b` salía con media −1,02 y mediana −0,10; el azar, con media −0,19 y mediana +0,20. Dos historias distintas de los mismos quince juegos.</sub>
- **LA CLASIFICACIÓN, EN UNA PÁGINA — Y ES LO QUE NOS DIFERENCIA.** <sub>línea 746</sub>
  <br><sub>El argumento entero del proyecto es que una partida se comprueba VOLVIÉNDOLA A JUGAR, no pidiéndole a otro modelo que la puntúe. Eso sólo vale algo si la tabla resultante está donde cualquiera pueda mirarla y, sobre todo, discutirla:</sub>

### `tacto.mjs`

- **SE PREGUNTAN DOS COSAS DISTINTAS, Y CONFUNDIRLAS ME COSTÓ LA TARDE.** <sub>línea 10</sub>
  <br><sub>1. EL PANEL — ¿se puede pulsar CADA jugada legal, con el dedo y con el ratón? Es una garantía y tiene que salir entera: los botones son la interfaz completa. Se comprueba APUNTANDO al botón, en su posición real.</sub>
- **NO SE MIRA EL CÓDIGO, SE TOCA LA PANTALLA.** <sub>línea 32</sub>
  <br><sub>Cada juego tiene su visualizador y algunos son propios; leer sus manejadores daría una respuesta por fichero y ninguna comparable. Así que se toca a ciegas, como haría un dedo: una cuadrícula de puntos sobre el lienzo, tap de verdad</sub>
- **Y SE CAMBIA UNA SOLA COSA: LA MANO.** <sub>línea 75</sub>
  <br><sub>El primer intento daba el móvil con `isMobile:true` al dedo y un escritorio con `isMobile:false` al ratón. Salieron tres juegos «que no coinciden» y estuve a punto de apuntarlos como fallos. No lo eran: con `isMobile` cambia el trazado de</sub>
- **SE ENGANCHA EL RENDERIZADOR PARA PODER APUNTAR, Y VA ANTES DE CARGAR NADA.** <sub>línea 110</sub>
  <br><sub>La sonda de la mesa era una rejilla A CIEGAS de 16x20, y su número se leía como un límite de la sonda y no del juego: cuando unit daba «mesa 0/2» eso no quería decir que no se pudiera tocar, quería decir que 320 toques repartidos por la</sub>
- **SE PINCHA `ALISA_PROTOHUB.move`, NO EL `sendMove` DE CADA MOTOR.** <sub>línea 160</sub>
  <br><sub>Empecé por `sendMove` y me quedé sin medir la mitad: los visualizadores propios (ajedrez, go, mancala…) no exponen su motor en `window`, así que salía «no medible» en un montón de juegos que sí se pueden tocar.</sub>
- **LA JUGADA VIENE DENTRO DE UN OBJETO, NO COMO CADENA.** <sub>línea 177</sub>
  <br><sub>La firma es `move(juegoId, accion)` con `accion = {action:'move', params:{action: 'robar_descarte'}}`. Yo grababa `a[1]` a secas y me salía «[object Object]» — que no coincide con ninguna jugada legal,</sub>
- **Y HABÍA UNA CUARTA FORMA.** <sub>línea 185</sub>
  <br><sub>Lo de arriba lo escribí al descubrir que la jugada venía envuelta, y cubrí las formas que vi ese día: `params.action`, `params.jugada`, `action`. La mesa genérica manda `{move: 'a6'}` — y como no estaba en</sub>
- **SE REPREGUNTAN LOS BOTONES DESPUÉS DE CADA PULSACIÓN, Y SE MIRA EL** <sub>línea 230</sub>
  <br><sub>ESTADO ENTERO. LAS DOS COSAS ME COSTARON UN FALSO POSITIVO.</sub>
- **Y ESTA FASE JUEGA DE VERDAD, ASÍ QUE SE RECARGA ANTES.** <sub>línea 249</sub>
  <br><sub>Arriba se sustituye `hub.move` por un muñeco que graba y no juega — hace falta para el sondeo a ciegas, donde trescientos toques sobre una partida viva darían una lista de jugadas que nunca fueron legales a la vez.</sub>
- **UN ESPÍA QUE GRABA **Y DEJA PASAR**.** <sub>línea 264</sub>
  <br><sub>La recarga de arriba quita el muñeco a propósito, y con razón: esta fase quiere que la partida avance de verdad. Pero medir «¿avanzó el estado?» no vale en los juegos de TICK — en peatón mandas la dirección y el mundo no se</sub>
- **Y NO SE PONE UN MUÑECO QUE NO JUEGUE: eso ya se probó y está escrito** <sub>línea 283</sub>
  <br><sub>cuatro líneas más arriba —«daba 0 de 5 en los cinco juegos, un pleno tan redondo que ya cantaba»—. Lo volví a hacer hoy y volvió a salir el mismo pleno. La diferencia entre espiar y suplantar es justo esta línea.</sub>
- **Y TAMBIÉN EL MOTOR, PORQUE NO TODOS PASAN POR ESTA PUERTA.** <sub>línea 300</sub>
  <br><sub>Esto espiaba SÓLO `hub.move`. La mesa genérica llama ahí, así que damas, xiangqi y reversi se medían bien. Pero `SovereignBoardEngine.sendMove` manda por `this.backend.move(payload)` —un adaptador que se quedó con su</sub>
- **SE CUENTA LA JUGADA QUE LLEGÓ AL HUB, NO SI CAMBIÓ EL ESTADO.** <sub>línea 356</sub>
  <br><sub>Esto medía `state()` antes y después de pulsar, y daba por buena la pulsación si el estado cambiaba. En la mayoría funciona y en los juegos de TICK es sencillamente otra cosa: en peatón mandas la dirección y el mundo</sub>
- **UN SEGUNDO INTENTO, Y SE CUENTA CUÁNTOS LO NECESITAN.** <sub>línea 391</sub>
  <br><sub>En pasada de 35 este instrumento señalaba a un juego distinto cada vez —peatón un día, blackjack otro, póker hoy— y ese mismo juego medido en solitario daba pleno tres veces seguidas. Póker: 2/2, 2/2, 2/2, y en la</sub>
- **Y ANTES DE CADA TOQUE SE PREGUNTA QUIÉN LO VA A RECIBIR.** <sub>línea 408</sub>
  <br><sub>Esto no estaba, y sin ello el reintento MENTÍA. Comprobado con el fallo de peatón puesto otra vez a mano: sin reintento daba 0/5, con reintento **4/5**. No es que el segundo toque acertara el botón: es que</sub>
- **SE RECARGA OTRA VEZ, PORQUE SI NO SE MIDE CON EL TURNO EN OTRA SILLA.** <sub>línea 458</sub>
  <br><sub>La fase del panel juega DE VERDAD —tiene que hacerlo, si no no se puede ver si la partida avanza al pulsar—. Y en un juego de cuatro sillas eso deja el turno donde caiga. Tocar mis cartas cuando le toca a un rival no hace nada, con toda</sub>
- **Y AQUÍ SE VUELVE A PONER EL MUÑECO, porque la recarga se llevó el de antes.** <sub>línea 480</sub>
  <br><sub>Sin esto, los toques se juegan DE VERDAD sobre una partida viva y lo que sale es una lista de jugadas que nunca fueron legales a la vez. await p.evaluate(() => {</sub>
- **SE INSTALA COMO FUNCIÓN Y SE LLAMA ANTES DE CADA TOQUE, NO UNA VEZ.** <sub>línea 526</sub>
  <br><sub>Calculando la lista entera de una vez, hearts se quedaba en 2 de 13. El motivo es que el primer toque reencuadra la mesa —`reencuadrarCuandoAsiente` acerca la cámara cuando las cartas dejan de moverse— y a partir de ahí los</sub>
- **EL CENTRO NO VALE: EN UN ABANICO LO TAPA LA CARTA SIGUIENTE.** <sub>línea 548</sub>
  <br><sub>Apuntando al centro de cada malla, hearts daba 2 de 13 — y no porque no se puedan tocar once cartas, sino porque en un abanico cada carta sólo enseña una franja y el centro de casi todas está debajo de la de al lado.</sub>
- **Y LAS CASILLAS, QUE NO SON MALLAS Y HASTA HOY NO SE PODÍAN APUNTAR.** <sub>línea 576</sub>
  <br><sub>El terreno se dibuja con `InstancedMesh` —una malla, N instancias— para que fagocito, que son 784 celdas, no cueste 784 objetos. Así que aquí no hay nada que proyectar: hay que saber DÓNDE está la casilla (c,f), y eso</sub>
- **APUNTAR AL SUELO DE UNA CASILLA NO ES APUNTAR A LA CASILLA.** <sub>línea 593</sub>
  <br><sub>Esto devolvía el píxel del centro de la celda a la altura del tablero (`y = 0`). Parece lo correcto y falla en cuanto hay piezas de pie: el rayo hasta ese punto pasa rozando la fila de DELANTE, y si allí hay algo</sub>
- **Y NO SE PUEDE ARREGLAR SÓLO SUBIENDO LA ALTURA: apuntar alto en una** <sub>línea 613</sub>
  <br><sub>casilla VACÍA hace que el rayo atraviese ese punto y siga hasta la madera, que cae una casilla más allá. Las dos correcciones homogéneas fallan por motivos opuestos; hay que mirar si hay pieza.</sub>
- **SE RECORRE LA ESCENA, NO EL GRUPO DE LA REJILLA.** <sub>línea 628</sub>
  <br><sub>Mi primera versión recorría `r.grupo`, que es quien publica `rejillaMundo` — o sea el TABLERO. En el ajedrez las piezas cuelgan de `piecesGroup`, que es HERMANO del tablero y no hijo, así que no</sub>
- **Y DESPUÉS SE COMPRUEBA QUE SE ESTÁ APUNTANDO DONDE SE CREE.** <sub>línea 654</sub>
  <br><sub>Calcular el píxel de una casilla no es apuntar a esa casilla. El rayo desde la cámara hasta el suelo de la celda pasa por encima de las celdas que tiene DELANTE, y si en alguna hay algo de pie, choca con</sub>
- **SI NO HAY NADA CON NOMBRE SE VUELVE A LA REJILLA, Y SE DICE CUÁL SE USÓ.** <sub>línea 755</sub>
  <br><sub>Trece de los treinta y cinco dibujan sin marcar sus piezas —`prueba_vistas` los cuenta como NO COMPROBABLES, que es una verdad distinta de aprobado— y ahí apuntar es imposible. Dar cero en esos sería mentir en la dirección</sub>
- **SE COMPRUEBA QUE LA JUGADA CORRESPONDA A LA CASILLA TOCADA.** <sub>línea 787</sub>
  <br><sub>Repartir una rejilla sobre un tablero es una SUPOSICIÓN —que las casillas van uniformes y en ese orden— y una suposición que no se verifica es una rejilla a ciegas con más pasos. Si el reparto estuviera girado, del revés o corrido,</sub>
- **Y AQUÍ HAY UN CERO QUE NO ES DEL JUEGO, Y HAY QUE DECIRLO.** <sub>línea 834</sub>
  <br><sub>El ajedrez sale 0 de 23 con esta sonda, y su jugada por clic FUNCIONA: medido a mano el 17-08-2026, tocando el píxel de `a2` aparecen las dos marcas de destino (`a2a3` y `a2a4`) — la escena pasa de 97 mallas a 99. Los dos manejadores se</sub>
- **EL DESTINO SE CALCULA DESPUÉS DE COGER LA PIEZA, NO ANTES.** <sub>línea 872</sub>
  <br><sub>Este fichero ya aprendió esto con hearts —«una lista de coordenadas calculada antes de tocar caduca en cuanto se toca»— y aquí seguía calculando LAS DOS casillas antes del primer toque.</sub>
- **LO DE DESLIZAR LO INTENTÉ Y LO QUITÉ.** <sub>línea 911</sub>
  <br><sub>Quince de los treinta y cinco se juegan con direcciones —`arriba`, `abajo`— y un toque no produce eso ni queriendo, así que salen todos con cero en la columna de la mesa. Escribí una sonda de gestos para cubrirlos.</sub>
- **EL DENOMINADOR ES LA LISTA DE AHORA, NO LA DEL PRINCIPIO.** <sub>línea 933</sub>
  <br><sub>Aquí se comparaba contra las jugadas legales medidas ANTES de la fase del panel. Pero esa fase juega de verdad —tiene que hacerlo, si no no se puede ver si la partida avanza al pulsar—, así que para cuando se toca la mesa la</sub>
- **IGUALES» NO ES «EL MISMO NÚMERO EXACTO», Y EXIGIRLO ME HIZO PERSEGUIR UN** <sub>línea 975</sub>
  <br><sub>FALLO QUE NO EXISTÍA.</sub>
- **Y LA FORMA HONESTA DE ESTO NO ES UNA TOLERANCIA, ES NO SONDEAR A CIEGAS.** <sub>línea 991</sub>
  <br><sub>La pregunta de verdad es «¿se puede llegar a CADA jugada legal?», y para eso hay que tocar el centro de la casilla de cada una, que la mesa sabe dónde está. Mientras eso no exista, esto es una aproximación con ruido y así está dicho.</sub>
- **SE DICE SI SE APUNTÓ O SE FUE A CIEGAS, Y CUÁNTAS PIEZAS NO ASOMAN.** <sub>línea 1002</sub>
  <br><sub>Sin esto, «mesa 2/13» se lee igual tanto si la sonda apuntó a las trece cartas como si tiró 320 toques al azar, y son dos frases distintas: la primera dice que once cartas NO SE PUEDEN TOCAR, la segunda que no las encontré. Marcar de</sub>
- **LO QUE MÁS IMPORTA NO ES EL PORCENTAJE, ES LA DIFERENCIA.** <sub>línea 1020</sub>
  <br><sub>Un juego que sólo se juegue por el panel es una carencia conocida y funciona: los botones son la interfaz completa y están siempre. Pero un juego donde el dedo llega a más jugadas que el ratón —o al revés— es un FALLO: hay alguien que</sub>
- **LO MEDIDO SE ESCRIBE, PORQUE SI NO LA FICHA NO PUEDE SABERLO.** <sub>línea 1035</sub>
  <br><sub>Esto se imprimía y se iba con la terminal. La ficha de cada juego deriva todo lo que puede —objetivo, verbos, asientos, hueco en la clasificación— y de lo que se puede TOCAR no sabía nada, así que un betatester abría mancala sin que nadie le dijera que</sub>
- **ESTA LÍNEA YA NO DICE «COMODIDAD», Y ES EL CAMBIO QUE IMPORTA.** <sub>línea 1097</sub>
  <br><sub>Mientras la mesa se sondeaba a ciegas, su número no podía significar nada: 320 toques repartidos por la pantalla no aciertan una carta, y ese cero se leía como un límite de la sonda. Por eso la garantía tenía que ser el panel — y por eso el</sub>
- **ESTA SONDA APUNTA A PIEZAS, Y HAY JUGADAS QUE NO SON UNA PIEZA.** <sub>línea 1113</sub>
  <br><sub>En ajedrez la jugada es `d2d4`: DOS casillas, y la segunda casi siempre está vacía. En go son los 357 cruces libres del goban, que no tienen malla porque todavía no hay piedra. Tocar una pieza no hace ninguna de esas jugadas ni queriendo, así que su</sub>
- **Y HAY UNA TERCERA CLASE: LOS QUE JUEGAN A VERBOS.** <sub>línea 1134</sub>
  <br><sub>Con sólo dos grupos —casillas y piezas— snake y peatón caían en «piezas» y el titular salía 7 de 24. Pero la jugada de snake es `arriba`: tocar la serpiente no la mueve, y nunca debió contar como un juego que se juega tocando algo. Esos ya tienen su sitio</sub>
- **LAS CASILLAS YA SE MIDEN, DESDE QUE EL PINTOR PUBLICA DÓNDE ESTÁN.** <sub>línea 1159</sub>
  <br><sub>Hasta el 16-08 esta línea decía «esta sonda no sabe apuntar a un hueco» y era verdad: el terreno se dibuja con `InstancedMesh`, así que no hay una malla por casilla a la que apuntar. Se arregló publicando seis números —`userData.rejillaMundo`— en vez de</sub>
- **TIENE REJILLA» NO ES «JUEGA A CASILLAS», Y CONTARLO ASÍ SALÍA MAL.** <sub>línea 1169</sub>
  <br><sub>Sokoban, cripta o defensa publican rejilla —viven en un tablero— pero sus jugadas son VERBOS: `arriba`, `torre a1`. Contándolos aquí salían en las dos listas a la vez y el titular decía «5 de 21» cuando el denominador real son los que de verdad juegan</sub>
- **SIN ASOMAR» ES LO QUE MIDE ESTE MUESTREO, NI MÁS NI MENOS.** <sub>línea 1197</sub>
  <br><sub>Se prueban el centro y veinticuatro puntos hacia los bordes de la caja envolvente. Si en ninguno el trazador de rayos contesta esta pieza, se cuenta como que no asoma. Con un muestreo más flojo —sólo las cuatro esquinas— hearts daba nueve cartas tapadas de</sub>
- **Y LO QUE ESTE INSTRUMENTO NO PUEDE VER, DICHO EN VOZ ALTA.** <sub>línea 1213</sub>
  <br><sub>La sonda de la mesa TOCA, y hay juegos que se juegan DESLIZANDO: snake, sokoban, fagocito, peatón, pradera… Sus jugadas son «arriba», «abajo», y un toque no puede producir eso ni queriendo. Esos siempre saldrán con cero en la</sub>

### `temp_script.js`

- **ESTO ES PRIOR ART Y ES MEJOR QUE LO QUE YO HABÍA HECHO.** <sub>línea 13</sub>
  <br><sub>Yo creaba un iframe por cada estación a menos de 15 m — hasta media docena vivos a la vez, cada uno con un juego cargado. Funcionaba, pero es caro y es conceptualmente flojo: seis juegos corriendo para que mires uno.</sub>
- **Esto faltaba, y era el hueco entre lo que promete la portada —«mismas** <sub>línea 68</sub>
  <br><sub>reglas para personas y para máquinas»— y lo que había: existían 5 entornos y NINGUNA de las 24 estaciones declaraba el suyo. Se podía verificar la partida de otro, pero una máquina no podía jugar aquí.</sub>
- **ESTOS TRES ESTABAN EN `legacy/` Y NO LOS ENLAZABA NADIE.** <sub>línea 78</sub>
  <br><sub>Son los juegos más terminados que tenemos —87, 62 y 42 KB— y llevaban meses dados por obsoletos. No lo estaban: el traslado a `legacy/` les rompió las rutas y una pantalla rota se parece a una pantalla vieja.</sub>
- **Aquí se sumaban 55 puntos por MATERIALIZAR la estación, o sea por** <sub>línea 1216</sub>
  <br><sub>pasear cerca. Cualquiera salía con 500 puntos sin tocar un juego, y el pacto de la puerta —«todo lo de aquí puntúa: qué resuelves»— era una frase sobre nada. Explorar sigue contando, pero cuenta donde debe:</sub>
- **Aquí se escribía `anomalía: latente/presente/desplazándose`.** <sub>línea 1292</sub>
  <br><sub>HUD a propósito: era telemetría sobre TI que nadie había explicado, y el umbral ahora lo dice mejor en una frase («tú eres la anomalía»). Dejar el código escribiendo en un elemento borrado tiraba la sala entera en el primer</sub>
- **El objetivo GIRA, y ese es todo el truco.** <sub>línea 1316</sub>
  <br><sub>punto fijo se apelmaza encima de él: lo medí, radio medio 1,6 m — 90 almas clavadas en el eje del huevo. Persiguiendo un punto que orbita, la persecución ES la órbita. Sin tocar la física, que es del motor.</sub>
- **La anomalía se doblaba con la APORTACIÓN, o sea con lo que paseas.** <sub>línea 1330</sub>
  <br><sub>la misma mentira que tenía el HUD, escondida en la imagen: el efecto más vistoso de la sala premiaba andar. Ahora crece con lo que has DEMOSTRADO — partidas verificadas— y el paseo solo aporta un roce.</sub>

### `vision.mjs`

- **EL SEXTO TIPO DE JUGADOR, Y HASTA HOY NO EXISTÍA.** <sub>línea 6</sub>
  <br><sub>El sistema declara cinco asientos (`asientos.js`): persona, tres políticas y un modelo. Ese modelo juega **por la puerta de texto** — recibe el estado descrito y contesta un número. Lo pidió Oscar mirando el hueco: «y faltaría agentes con</sub>
- **CÓMO SE DIBUJA, SIN INVENTAR UN RENDER NUEVO.** <sub>línea 23</sub>
  <br><sub>`pintar2d.js` ya es una función PURA del sustrato: `(ctx, sustrato) → cuadro`, sin saber a qué se juega. Sirve para los 35 sin una línea por juego, que es la misma propiedad que hace que el repetidor funcione en todos. Se pinta en un Chrome</sub>
- **Y LO QUE VE ES LO QUE VE UNA PERSONA.** <sub>línea 30</sub>
  <br><sub>Se le manda la imagen y la lista de jugadas legales, porque eso es exactamente lo que tiene delante quien juega: el tablero y los botones del panel. No se le manda el estado en texto — eso sería el asiento de texto con una imagen de adorno, y</sub>
- **`--marcar`: LOS NÚMEROS DE LAS OPCIONES, PINTADOS SOBRE EL TABLERO.** <sub>línea 86</sub>
  <br><sub>La primera medida salió 4/4 «dentro de la lista» y no significaba nada: preguntando al modelo cosas de la imagen que yo ya sabía, contestó **9 fichas rojas donde hay 12**. O sea que percibe la estructura gruesa —acertó cuántas filas están vacías— y</sub>
- **SE MARCA EL DESTINO, QUE ES LO QUE IMPORTA PARA ELEGIR.** <sub>línea 187</sub>
  <br><sub>`celdasDeJugada` devuelve las casillas que toca una jugada — dos en las de origen→destino («a3b4»), una en las de un solo paso. Se pinta el número en la ÚLTIMA, que es a donde va la pieza: es la información que usa quien</sub>
- **VARIAS JUGADAS PUEDEN IR A LA MISMA CASILLA, Y SE PISABAN.** <sub>línea 199</sub>
  <br><sub>Medido en los 35 con la semilla 7: de 626 opciones, 559 tienen casilla y **24 comparten destino** — concentradas en los juegos donde dos piezas pueden ir al mismo sitio: xiangqi (17), ajedrez (4), damas (3). Pintando</sub>
- **EL PROMPT PIDE UN NÚMERO, NO UNA JUGADA.** <sub>línea 232</sub>
  <br><sub>Es la misma decisión que en el asiento de texto: pedir la jugada escrita obliga al modelo a acertar una notación además de acertar la jugada, y entonces se estaría midiendo su ortografía. Un índice se interpreta sin ambigüedad y no se puede</sub>

## Reglas de los juegos

### `public/arcade/js/protohub/rules/ajedrez.js`

- **ESTO ESTABA MAL Y LO CAZÓ EL PERFT.** <sub>línea 173</sub>
  <br><sub>La primera versión deducía los ataques recorriendo las jugadas pseudolegales. Parece razonable, pero tiene un agujero: **un peón no genera jugada hacia una casilla vacía** (solo captura si hay pieza enemiga o es al paso). Así que un</sub>
- **EL AJEDREZ NO PUNTUABA.** <sub>línea 358</sub>
  <br><sub>—las tres cosas verdes— pero `estado()` no publicaba ningún marcador, así que `puntuacionDe()` devolvía 0 **siempre**. En una partida, en mil, y jugara quien jugara. El juego insignia del catálogo era, como banco de pruebas, un</sub>
- **Aquí ponía `movs[(Math.random() * movs.length) | 0]`, y eso rompía lo** <sub>línea 451</sub>
  <br><sub>único que este proyecto promete: la misma semilla daba partidas distintas, así que dos ejecuciones de la misma política no eran comparables. El recibo seguía verificando —guarda también las jugadas de</sub>

### `public/arcade/js/protohub/rules/alisapolis.js`

- **NO SE COMPRA AL PRECIO DE LISTA, Y ES LA DECISIÓN DE DISEÑO MÁS IMPORTANTE.** <sub>línea 7</sub>
  <br><sub>En la mesa de verdad compras al precio de la caja y sólo hay subasta si renuncias. Lo escribí así y midiéndolo resultó que MATABA EL JUEGO: el patrimonio cuenta las fincas por su precio, así que comprar al precio de lista es neutro y encima renta —</sub>
- **POR QUÉ EXISTE, Y NO ES «PORQUE FALTABA EL MONOPOLY».** <sub>línea 20</sub>
  <br><sub>La matriz de géneros mide ocho ejes sobre los 37 juegos: espacial 23, oculto 19, rival 29, autónomo 8, simultáneo 2, cooperativo 2, comunicación 2. **Ninguna columna cubre lo que pide una subasta**: VALORAR BAJO COMPETENCIA — cuánto vale</sub>
- **Y SIN SUBASTA ESTO SERÍA UN SEGUNDO `guerra`.** <sub>línea 30</sub>
  <br><sub>Un monopoly donde caes y pagas el precio de la lista no tiene decisiones: tiras, caes, pagas. `guerra` ya ocupa ese sitio en el banco, y está ahí a propósito como CONTROL —lo que no separa a nadie—. Así que la subasta no es un adorno del diseño:</sub>
- **Y ESO SE MIDIÓ ANTES DE ESCRIBIR ESTE FICHERO.** <sub>línea 37</sub>
  <br><sub>`_archivo/_sonda_subasta_alisapoly_20260820.mjs` implementa la subasta sola —sin tablero, sin dados, sin cartas— y pregunta si separa. Sale hueco 606 ± 20, o sea señal/ruido 30: separa con holgura. Y de paso destapó un fallo de diseño que aquí</sub>
- **LOS CUATRO MATERIALES A LA VEZ, QUE ERA EL PUNTO DE OSCAR.** <sub>línea 48</sub>
  <br><sub>Es el único de la casa que usa los cuatro: TABLERO (el anillo, como parchís y oca), DADOS (los mismos objetos de la generala y el dominó), CARTAS (el mazo de decretos, boca abajo sobre el tablero) y FICHAS (los peones). No hay motor nuevo: el contrato</sub>
- **LO QUE NO ESTÁ, Y SE DICE.** <sub>línea 55</sub>
  <br><sub>· NEGOCIAR entre jugadores («te doy Soma y 200 por Psyche»). Es espacio de acciones abierto y pide un canal de conversación que este banco no tiene. Pujar sí cabe: es `pujar` o `pasar`, vocabulario cerrado, y lo juegan las cinco</sub>
- **LAS MAGNITUDES SON EL JUEGO, Y LAS PRIMERAS QUE PUSE NO LO ERAN.** <sub>línea 82</sub>
  <br><sub>Con caja 1500 y alquileres de precio/10 —de 6 a 24— no dolía nada: nadie quebraba en 300 partidas y el hueco entre la casa y la política tonta salía 3,1 ± 34,4, o sea ruido. Un juego donde las decisiones no cambian el resultado no mide a nadie,</sub>
- **EL TABLERO SE DECLARA, NO SE GENERA.** <sub>línea 108</sub>
  <br><sub>Veinte fincas —dos por distrito—, cuatro esquinas, cuatro de mazo, dos de impuesto y dos de servicio. Escrito a mano y no calculado a propósito: el orden de las casillas ES el juego —qué distritos caen juntos, dónde están las cartas— y una</sub>
- **EL ALQUILER ES DONDE EL DISTRITO COMPLETO SE PAGA, Y ES LO QUE HACE QUE LA** <sub>línea 212</sub>
  <br><sub>SUBASTA IMPORTE. Una finca suelta cobra su base; el distrito entero cobra el doble; y cada casa suma otra base. Sin esa escalera, comprar la segunda finca de un distrito valdría lo mismo que comprar cualquier otra y no habría nada</sub>
- **QUÉ VALE ESTA FINCA PARA ESTE JUGADOR.** <sub>línea 242</sub>
  <br><sub>bueno de uno correcto, y es literalmente lo que se midió en la sonda: la que completa un distrito vale el bono entero, la segunda vale la promesa, y una de un distrito que ya no puedes completar vale su precio y nada más.</sub>
- **EL SUELO DE LO QUE VALE UNA FINCA ES SU PRECIO, Y ESO CAMBIA TODO.** <sub>línea 251</sub>
  <br><sub>El patrimonio cuenta las fincas por su precio, así que comprar al precio de lista es NEUTRO: cambias caja por un activo que vale lo mismo. Y encima cobra alquiler. O sea que comprar es siempre bueno, y lo único que se</sub>
- **Con una sola ajena el distrito ya NO se puede completar —son dos fincas—** <sub>línea 278</sub>
  <br><sub>y esa finca vale su precio y su renta, ni un duro más. La condición de antes (`ajenas + mias + 1 > total`) daba 2 > 2, o sea falso, y seguía pagando la promesa de un distrito imposible.</sub>
- **EL RIVAL DE LA CASA.** <sub>línea 587</sub>
  <br><sub>una finca más de lo que esa finca le vale A ÉL, contando el distrito.</sub>
- **LA CASA NO CONSTRUYE, Y ESO ESTÁ MEDIDO, NO ELEGIDO.** <sub>línea 606</sub>
  <br><sub>Aislando las tres partes de esta heurística contra el mismo suelo y sobre las mismas semillas —200 × 2 sillas, 20 vueltas:</sub>
- **EL SUSTRATO: LOS CUATRO MATERIALES CON EL CONTRATO DE SIEMPRE.** <sub>línea 632</sub>
  <br><sub>rejilla  el anillo de 32 casillas sobre 9×9; dentro es muro piezas   un peón por jugador, en su casilla zonas    los dados, el mazo de decretos boca abajo, y las fincas de cada uno</sub>

### `public/arcade/js/protohub/rules/azar.js`

- **POR QUÉ EXISTE ESTE FICHERO** <sub>línea 9</sub>
  <br><sub>`mulberry32` estaba copiado **siete veces** —bazas, blackjack, poker, guerra, snake, peaton, fagocito— y las copias ya se habían separado en dos escrituras distintas:</sub>

### `public/arcade/js/protohub/rules/baraja.js`

- **POR QUÉ EXISTE** <sub>línea 9</sub>
  <br><sub>Mismo cuento que en [azar.js]: `cargarBaraja` y el respaldo de la baraja francesa estaban copiados en `bazas.js` y en `guerra.js`, con dos firmas distintas —una pedía el nombre de la baraja, la otra lo tenía dentro—. Nadie</sub>
- **EL SUFIJO DE COPIA: `S_A#2` ES EL SEGUNDO AS DE PICAS.** <sub>línea 29</sub>
  <br><sub>Todo este proyecto direcciona las cartas por su IDENTIDAD: `descartar:S_A` es una jugada legal, viaja al recibo y el verificador la vuelve a jugar. Con dos barajas hay dos ases de picas, y en ese momento «el as de picas» deja de señalar una carta:</sub>
- **ESTO FALTABA, Y NADIE LO SABÍA** <sub>línea 83</sub>
  <br><sub>La biblioteca lleva `extends` desde siempre: `spanish_48` hereda los palos de `spanish_40` y sólo redefine los rangos; `french_54` hereda las dos cosas y sólo añade comodines. Ningún cargador lo implementaba. Resultado: **dos de las</sub>
- **FALLAR ALTO, NO BAJO.** <sub>línea 120</sub>
  <br><sub>La versión anterior hacía `{ ...RESPALDO[nombre] }`, y para una baraja sin respaldo eso da `{}`: un objeto que PARECE una baraja, se pasa alegremente por tres funciones y revienta mucho después con un</sub>

### `public/arcade/js/protohub/rules/bazas.js`

- **HEARTS ES EL BUENO PARA EL BANCO DE PRUEBAS** <sub>línea 23</sub>
  <br><sub>Se juega a NO ganar: cada corazón penaliza 1 y la dama de picas 13. Un agente que sólo sepa maximizar se hunde. Como nuestra métrica es «más es mejor», su puntuación se devuelve **negada** — se dice aquí para que nadie piense que</sub>
- **Y hay un caso que se me escapó en la primera versión: cuando el** <sub>línea 127</sub>
  <br><sub>reparto agota la baraja —el tute son 4×10 de una española de 40— no queda ninguna carta que destapar y salía `triunfo: null`, dejando el juego sin palo de mando. Se toma entonces la ÚLTIMA</sub>
- **ESTO NACIÓ DE UNA FUGA, Y DE LAS FEAS.** <sub>línea 146</sub>
  <br><sub>Antes sólo existía la vista del asiento 0: `mano` eran siempre las cartas del primero. En una partida contra la casa daba igual, porque sólo había un humano mirando. En una MESA COMPARTIDA, el segundo</sub>
- **En hearts menos es mejor, y la métrica del banco es «más es** <sub>línea 169</sub>
  <br><sub>mejor». Se niega aquí, no en el entorno, para que el número que se verifica y el que se compara sean el mismo. const míos = p.puntos[yo];</sub>
- **EL COMENTARIO DE ARRIBA DESCRIBÍA UNA POLÍTICA QUE EL CÓDIGO NO HACÍA.** <sub>línea 233</sub>
  <br><sub>Decía «juega la carta más floja que le sirva, y si puede ganar la baza barata, la gana». Lo que hacía era soltar SIEMPRE la más fuerte (o la más floja en hearts), sin mirar la baza ni una sola vez. Es la clase de</sub>
- **LOS CUATRO RECIBEN `{ url }`, Y HUBO QUE ARREGLARLO.** <sub>línea 309</sub>
  <br><sub>Antes eran `() => crearBazas({…})._cargar()`: una flecha SIN parámetros. Como `index.js` los llama con `f(opts)`, JavaScript tiraba `opts` sin decir nada y `_cargar()` usaba siempre su ruta relativa. En el navegador funciona; en un</sub>
- **El único de los cuatro donde ganar bazas es MALO.** <sub>línea 342</sub>
  <br><sub>negación: el juego resta corazones, pero los `Puntos` que se ven ya vienen cambiados de signo para que el banco compare siempre «más es mejor». Sin decirlo, un agente que lea «Puntos: -13» no sabe si va ganando o perdiendo.</sub>

### `public/arcade/js/protohub/rules/blackjack.js`

- **LECCIÓN, ANOTADA DONDE DUELE (1 ago 2026)** <sub>línea 4</sub>
  <br><sub>La primera versión de este fichero se escribió a mano: valores de carta clavados, una sola baraja, la regla de la casa inventada. Y resulta que ya teníamos:</sub>
- **Aquí el objetivo NO es una frase fija, porque el número no lo pone** <sub>línea 129</sub>
  <br><sub>este fichero: sale de la ficha del catálogo (`F.objetivo`), y una variante que juegue a otro número dejaría la frase mintiendo. Es el mismo criterio que las normas de las damas — lo dice el dato.</sub>
- **MIS NORMAS ESTABAN EN EL CATÁLOGO», no «llegó algún JSON».** <sub>línea 140</sub>
  <br><sub>Antes era `!!lib`, y con un `{}` por respuesta decía `true` mientras jugaba enterito con el respaldo. Una marca que existe para avisar de que se está jugando con otra baraja no puede dar un falso tranquilo.</sub>
- **QUÉ ES UNA PARTIDA AQUÍ: **el zapato entero**, no una mano.** <sub>línea 175</sub>
  <br><sub>Decisión tomada tras verla fallar. Al grabar cinco manos seguidas, el verificador rechazaba la sexta jugada con «llega con la partida ya terminada» — y tenía razón: para él `is_game_over` significaba el</sub>
- **PUNTUACIÓN, y no es cosmética: es lo que hace verificable** <sub>línea 208</sub>
  <br><sub>la partida. Sin un número que comparar, el verificador no puede cazar a quien cambia la semilla —lo comprobé: la partida trucada salía «válida»— porque solo sabe contrastar</sub>
- **Aquí se rebarajaba a media sesión.** <sub>línea 233</sub>
  <br><sub>veneno para el benchmark: una partida sin final no se puede puntuar ni cerrar. Ahora el zapato se gasta y la sesión acaba — repartir sin cartas suficientes es ilegal, y punto.</sub>

### `public/arcade/js/protohub/rules/cabina.js`

- **POR QUÉ ESTE GÉNERO, Y POR QUÉ AHORA** <sub>línea 11</sub>
  <br><sub>El censo de géneros dejó cuatro huecos, y éste era el caro: en los veintiséis juegos anteriores **una silla sólo puede decirle algo a otra jugando**. No hay canal. Eso deja fuera la deducción social, la negociación y el cooperativo con</sub>
- **EL CANAL ES ESTRECHO A PROPÓSITO** <sub>línea 20</sub>
  <br><sub>Seis mensajes, no texto libre. No es por miedo a lo abierto: es que con texto libre no se sabría qué se está midiendo. Un modelo elocuente parecería mejor comunicador aunque dijera cosas falsas, y la puntuación mediría labia. Con seis</sub>
- **Y ES ASIMÉTRICO EN LO QUE MIDE, NO SÓLO EN LO QUE HACE** <sub>línea 28</sub>
  <br><sub>La guía se mide por lo que dice; el piloto, por si actúa sobre lo que le dicen. Un agente puede ser bueno en un papel y malo en el otro, y hasta hoy no teníamos dónde verlo — sigilo separa oficios, pero los dos consisten en andar.</sub>
- **OCHO, Y NO CATORCE — EL CANAL TIENE QUE PODER SERVIR DE ALGO.** <sub>línea 41</sub>
  <br><sub>Con catorce pozos en una rejilla de 15×11 casi nunca existe una ruta limpia, así que la guía no tenía más remedio que mandar al piloto por encima de uno. Medido: dos semillas de tres acababan con el piloto muerto en los pozos</sub>
- **SE COMPRUEBA QUE HAY CAMINO, Y SI NO LO HAY SE ABRE.** <sub>línea 90</sub>
  <br><sub>Un almacén sin ruta convierte una partida en una trampa y la medida en ruido: la guía diría la verdad y el piloto no llegaría igual. Es la lección de sokoban y de cripta, y aquí muerde más porque el fallo</sub>
- **DOS CUADROS QUE NO SE PARECEN EN NADA, Y ÉSE ES EL JUEGO.** <sub>línea 115</sub>
  <br><sub>La guía recibe el almacén completo: muros, pozos, salida y dónde está el piloto. El piloto recibe **casi nada** — sólo por dónde ha pasado y lo último que le han dicho. Ninguno de los dos puede jugar sin el otro, y no</sub>
- **EL MENSAJE LO VEN LOS DOS, Y TIENE QUE SER ASÍ.** <sub>línea 194</sub>
  <br><sub>Lo dicho es público: la guía sabe lo que ha dicho y el piloto lo oye. Lo que NO cruza es la vista — el piloto nunca recibe el mapa, por mucho que la guía lo tenga delante. El canal es el único puente,</sub>
- **HABLAR NO MUEVE NADA DEL MUNDO, Y ESO ES LA DEFINICIÓN DEL EJE.** <sub>línea 233</sub>
  <br><sub>Estas seis acciones no cambian el almacén, ni la posición, ni las vidas: sólo cambian lo que el OTRO sabe. Es exactamente lo que `matriz_generos` busca para marcar `comunicacion` — una acción cuyo</sub>
- **Y LOS DOS LEEN SU PROPIO SUSTRATO.** <sub>línea 268</sub>
  <br><sub>otro juego: si el piloto pudiera mirar el estado, no necesitaría que le hablaran y el canal —o sea, el género entero— dejaría de medirse. El techo de la casa tiene que sufrir la misma ceguera que un modelo.</sub>
- **AVISAR UNA VEZ, Y DESPUÉS MANDAR.** <sub>línea 295</sub>
  <br><sub>BUCLE.</sub>
- **La primera versión, ante un «peligro» o ante un rumbo que chocaba** <sub>línea 322</sub>
  <br><sub>con un muro ya conocido, cogía `legales[0]` — siempre el mismo. Medido: resolvía **una semilla de tres** y las otras dos agotaban el tope haciendo ping-pong entre dos casillas, con la guía repitiéndole el</sub>

### `public/arcade/js/protohub/rules/canadiense.js`

- **POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS** <sub>línea 8</sub>
  <br><sub>Hasta hoy las dos familias de motor iban por separado: los de TABLERO publican `rejilla` y `piezas` (parchís, sokoban, flota) y los de CARTAS publican `zonas` (remigio, brisca, unit). `montarMesa.js` incluso elige el motor y el</sub>
- **QUE EL REY TAMBIÉN SAQUE DE CASA NO ES ADORNO: LO PIDIÓ UNA MEDIDA.** <sub>línea 45</sub>
  <br><sub>La primera versión sólo dejaba salir con el as, y se midió lo que eso hace: con las cuatro fichas en casa —o sea el arranque de TODAS las partidas, y cada vez que te comen— el **89 % de los turnos no tenía ninguna jugada posible** y</sub>
- **POR QUÉ EL 4 RETROCEDE, QUE PARECE UN CASTIGO Y ES UN REGALO** <sub>línea 64</sub>
  <br><sub>Tu ficha recién sacada está en tu casilla de salida, o sea en el paso 0 de 75. Retroceder 4 desde ahí te deja en el paso 64: a cuatro casillas del pasillo. El contador y la geometría dicen lo mismo —`(pos - 4 + 68) % 68`— porque el</sub>
- **EL SIETE SE PARTE, Y ESO OBLIGA A MIRAR DOS FICHAS** <sub>línea 72</sub>
  <br><sub>`dividir:7♦:0:3:2` mueve 3 con la ficha 0 y 4 con la ficha 2. Es la única carta que puede meter una en meta Y comer con otra en el mismo turno, y la única que pide pensar en pareja. Las dos mitades se validan por separado contra el</sub>
- **SALIR PRIMERO VALE MÁS AQUÍ QUE EN EL PARCHÍS.** <sub>línea 79</sub>
  <br><sub>Con los cuatro asientos jugando la MISMA política de la casa, 600 partidas:</sub>
- **LOS VALORES SE DERIVAN DE LA BIBLIOTECA, NO SE ESCRIBEN A MANO** <sub>línea 92</sub>
  <br><sub>`valorDe` es `ranks.indexOf(rango) + 2`, que sobre el orden de la biblioteca francesa da 2→2 … K→13, A→14. Las tres reglas especiales se declaran por VALOR (4 retrocede, 7 se parte, 11 intercambia) y las dos cartas que abren casa son</sub>
- **TOPE DE TURNOS, DECLARADO Y NO ESCONDIDO.** <sub>línea 122</sub>
  <br><sub>Con el mazo rebarajándose una partida podría no acabar nunca: cuatro jugadores comiéndose entre ellos pueden quedarse dando vueltas. El parchís de dado no tiene este problema porque nadie guarda nada. Aquí se pone un techo y se dice</sub>
- **SE PASA. Aceptar** <sub>línea 145</sub>
  <br><sub>el parámetro y no usarlo ya costó un fallo mudo en esta casa: el servidor repartía con una baraja y el navegador con otra, y todo verde.</sub>
- **ELEGIDO MIDIENDO, no a ojo: con 4** <sub>línea 151</sub>
  <br><sub>la casa saca 400,5 contra 200,5 de la línea base tonta (×2,00) y con 5 saca 420,4 contra 169,4 (×2,48). Con 6 no mejora (×2,46) y sólo</sub>
- **EL TABLERO Y LAS FICHAS SON LOS MISMOS QUE LOS DE `parchis.js`, A PROPÓSITO.** <sub>línea 159</sub>
  <br><sub>68 casillas, pasillo de 7, cuatro colores, cuatro fichas, los mismos seguros. Así los dos juegos se diferencian en UNA sola cosa —el dado contra la mano— y comparar un agente en los dos mide justo eso y nada más. Cambiar además el</sub>
- **FALLAR ALTO, NO BAJO — la misma disciplina que `cargarBaraja`.** <sub>línea 170</sub>
  <br><sub>Con una baraja de menos de trece rangos los valores especiales (4, 7, 11) no existirían y el juego seguiría corriendo: sin retroceso, sin división y sin intercambio, o sea otro juego con el mismo nombre. Eso es exactamente</sub>
- **EL ORDEN DEL SIETE PARTIDO IMPORTA, Y POR ESO LA JUGADA LO DICE.** <sub>línea 308</sub>
  <br><sub>Se mueve primero `i` y después `k`, así que las dos mitades NO se comprueban igual: cuando aterriza `i`, la compañera sigue en su casilla y sí estorba (`excepto: -1`); cuando aterriza `k`, `i` ya se</sub>
- **De quien tiene el turno, no de quien mira.** <sub>línea 347</sub>
  <br><sub>`bazas.js` y repetida en `remigio.js`: `legal_moves` depende del TURNO y no del asiento, y la fuga se tapa en el árbitro, que es el único que sabe quién está sentado dónde. Inventar aquí una convención distinta —devolver lista</sub>
- **CONSUME AZAR, Y POR ESO SÓLO SE LLAMA DESDE EL CAMINO ACEPTADO DE** <sub>línea 384</sub>
  <br><sub>`mover()`. Ver la nota de la cabecera de `parchis.js`: si el azar se gastara en una jugada que luego se rechaza, la re-simulación del verificador iría desfasada y acabaría **rechazando partidas legítimas**.</sub>
- **UN SOLO HILO DE AZAR para el reparto y para las rebarajas.** <sub>línea 436</sub>
  <br><sub>generadores habría que sembrar los dos y acordarse de los dos; con uno, `{juego, semilla, jugadas}` reconstruye la partida entera. const _rnd = mulberry32(semilla);</sub>
- **`asiento` NO ES `turno`.** <sub>línea 463</sub>
  <br><sub>desde el 1 le enseña las cartas al rival, y eso ya se ha escapado dos veces en esta casa en silencio: la partida seguía, los turnos iban bien y el recibo verificaba. De los demás sólo sale CUÁNTAS cartas tienen.</sub>
- **EL MARCADOR PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si ganaste.** <sub>línea 472</sub>
  <br><sub>El aviso viene de `sokoban.js` y se repite en `parchis.js`: en una carrera de cuatro se pierde tres de cada cuatro veces, y si sólo contara ganar, tres agentes distintos empatarían a cero y la tabla no</sub>
- **MISMA FÓRMULA, UNA POR ASIENTO. `p.ganador` es un único color o** <sub>línea 482</sub>
  <br><sub>`null` (tope de turnos), así que como mucho un `c` cae en la rama de los 500; el resto en avance+metidas. Patrón de `bazas.js`. const marcador = Array.from({ length: jugadores }, (_, c) =></sub>
- **SE VALIDA TODO ANTES DE TOCAR NADA.** <sub>línea 524</sub>
  <br><sub>`legales()` sólo emite jugadas enteramente legales, así que comprobar contra la lista ES la validación completa — y ocurre antes de mover una ficha, antes de descartar y, sobre todo, antes de robar. Robar consume</sub>
- **Y DEJA TECHO A PROPÓSITO, que es lo que se le pide a un rival de banco** <sub>línea 599</sub>
  <br><sub>de pruebas. No guarda cartas para después —que es la decisión NUEVA que este juego trae y la que separa a un agente bueno de uno correcto—, no mira si deja una ficha a tiro y no cuenta las cartas que han salido.</sub>
- **NO CONSUME `p._rnd`.** <sub>línea 604</sub>
  <br><sub>si gastara azar, pedir consejo cambiaría la partida. Para desempatar usa un hash sin estado de la semilla y el número de jugadas, como `frentes.js`.</sub>
- **EL PUNTO DEL EXPERIMENTO: LAS TRES ESTRUCTURAS, Y LAS DOS FAMILIAS.** <sub>línea 651</sub>
  <br><sub>`rejilla` + `piezas` son el tablero, como en el parchís. `zonas` son la mano, las manos tapadas de los rivales, el mazo, el descarte y las fichas que esperan en casa — o sea todo lo que en los juegos de cartas ES el</sub>
- **EL RECORRIDO ES UN ANILLO, Y EL VOCABULARIO NO ME LO INVENTO YO:** <sub>línea 664</sub>
  <br><sub>0 vacío · 1 muro · 2 destino, que es lo que leen `pintar2d.js` y `pintar3d.js`. `parchis.js` lo aprendió por las malas —extendió las 68 casillas en fila y las marcó con `1`, y el tablero salió como un</sub>
- **Lo oculto se MARCA, no se omite: si la zona del rival no** <sub>línea 702</sub>
  <br><sub>existiera, el dibujo diría que no tiene cartas. Es la mentira que `sustrato.js` documenta haber cometido con el póker. ...p.manos</sub>

### `public/arcade/js/protohub/rules/cripta.js`

- **POR QUÉ ESTE GÉNERO, Y NO OTRO** <sub>línea 8</sub>
  <br><sub>Porque es la estructura de decisión que más falta hacía y la única que ninguno de los veintiuno anteriores tenía: **no ves el estado**. Ajedrez y go son información perfecta; brisca esconde cartas pero el tablero está a la</sub>
- **LA REGLA QUE GOBIERNA TODO EL FICHERO** <sub>línea 21</sub>
  <br><sub>El sustrato publica SÓLO lo que el jugador ha visto. Ni una casilla más. Es la misma disciplina que las cartas ocultas —que ya se fugaron dos veces en este proyecto— aplicada al espacio, y aquí es más fácil de romper porque el</sub>
- **CINCO Y NO TRES, Y EL NÚMERO LO ELIGIÓ UNA MEDIDA.** <sub>línea 40</sub>
  <br><sub>Con tres, la política de la casa moría en las tres primeras semillas. La cuenta explica por qué: un bicho aguanta dos golpes y pega uno por turno, así que cada pelea cuesta una vida — de tres. Con cuatro bichos por mazmorra,</sub>
- **LA MAZMORRA LA GENERA UNA PIEZA DEL MOTOR, NO ESTE FICHERO.** <sub>línea 67</sub>
  <br><sub>`BSPSystem` llevaba tiempo en `src/world/` particionando espacio y cavando pasillos, y no se usaba en ningún juego. No hacía falta escribir un generador: hacía falta poder SEMBRARLO. Llamaba a `Math.random()` en</sub>
- **TODO SE COLOCA SOBRE LO ALCANZABLE, Y ESO NO ES UN DETALLE.** <sub>línea 104</sub>
  <br><sub>Lo aprendí con sokoban: un nivel irresoluble arruina la medida sin avisar —el agente parece malo cuando el que falló fue el generador—. Un BSP conecta las salas hermanas, pero «casi siempre conectado» no</sub>
- **EL SUSTRATO, CENSURADO — Y LA CENSURA ES EL JUEGO.** <sub>línea 142</sub>
  <br><sub>`p` tiene el mapa entero. Lo que sale de aquí no. Se publica la memoria del jugador, no la verdad del mundo, y la diferencia entre las dos es exactamente lo que hay que ir a buscar caminando.</sub>
- **LA DECISIÓN MENOS OBVIA DEL FICHERO: `legal_moves` TAMBIÉN TIENE** <sub>línea 202</sub>
  <br><sub>NIEBLA.</sub>
- **CON PENDIENTE DESDE EL PRIMER PASO, QUE ES LA LECCIÓN DE SOKOBAN.** <sub>línea 239</sub>
  <br><sub>Allí la métrica era `cajas * 100 - pasos` y el calibrador la tumbó: **métrica constante**, todo el mundo el mismo suelo, porque el fracaso era el caso normal y todos los fracasos valían igual. Un</sub>
- **LA SALIDA NO EXIGE HABERLO COGIDO TODO, Y ES A PROPÓSITO.** <sub>línea 285</sub>
  <br><sub>Salir con dos tesoros vale 600; volver a por el tercero vale 150 más y arriesga los 300 de la salida. Eso convierte el final de la partida en una DECISIÓN en lugar de en un trámite, y las decisiones</sub>
- **Y JUEGA LEYENDO EL SUSTRATO, NO EL ESTADO.** <sub>línea 302</sub>
  <br><sub>—`const sus = this.sustrato(p)`— es media prueba de honradez del género. Podría mirar `p.muros` y salir en línea recta; es la política de la casa, nadie se lo impide. Si lo hiciera, el techo que marca sería el de un</sub>
- **La primera versión pegaba siempre, y **moría en las tres semillas** <sub>línea 329</sub>
  <br><sub>que probé**. Un techo que se suicida no es un techo: si el rival de la casa acaba siempre en el suelo, cualquier agente que se limite a no morir ya lo supera, y la tabla premia la cobardía en vez de la</sub>
- **CON LÍNEA DE VISIÓN, NO SÓLO RADIO.** <sub>línea 427</sub>
  <br><sub>la roca, y entonces las esquinas no esconden nada: la mazmorra se lee de un vistazo desde el centro de una sala y la exploración se acaba antes de empezar. Es el muro el que crea la decisión de asomarse.</sub>

### `public/arcade/js/protohub/rules/damas.js`

- **Y LA NORMA VIAJA EN EL RECIBO.** <sub>línea 73</sub>
  <br><sub>Aquí una partida se verifica volviéndola a jugar con `{juego, semilla, jugadas}`. En cuanto las reglas dependen de una variable, esos tres datos DEJAN DE BASTAR: la misma lista de jugadas es legal con una norma e ilegal con otra. Sin la norma</sub>
- **Hacía falta separarlo. `esCaptura` adivinaba mirando la distancia —un salto** <sub>línea 158</sub>
  <br><sub>mueve dos columnas—, y eso deja de valer en cuanto la dama vuela: ahí un simple avance puede recorrer cinco casillas. Adivinar la naturaleza de una jugada desde su nombre funcionaba por casualidad, y la casualidad se acaba al añadir una norma.</sub>
- **Mismo agujero que el ajedrez y el xiangqi: las damas se jugaban, eran** <sub>línea 223</sub>
  <br><sub>deterministas y se verificaban, pero `estado()` no publicaba marcador y `puntuacionDe()` devolvía 0 en toda partida, jugara quien jugara. Tres juegos de tablero con el mismo fallo, y ninguna de las pruebas que ya existían lo</sub>
- **LAS NORMAS SE GUARDAN EN LA PARTIDA, NO EN EL MÓDULO.** <sub>línea 246</sub>
  <br><sub>Podrían quedarse aquí, en el cierre de la fábrica, y sería más corto. Pero entonces la partida no sabría con qué normas nació, y el recibo tampoco: para volver a jugarla habría que acordarse por fuera de con qué se creó. Guardadas</sub>
- **SU PROPIO SUSTRATO, PORQUE EL DERIVADO NO PUEDE SABER DE QUIÉN ES CADA** <sub>línea 293</sub>
  <br><sub>FICHA.</sub>
- **AQUÍ LA CAPTURA DE LA DAMA VOLADORA NO COMÍA.** <sub>línea 395</sub>
  <br><sub>INTERNACIONAL ESTABAN ROTAS.</sub>
- **EL CONTADOR DE FALTA DE PROGRESO.** <sub>línea 433</sub>
  <br><sub>Medido con `_topes.mjs`: la política de la casa jugando contra sí misma NO TERMINA ni con un tope de cuatro mil decisiones, en ninguna semilla. Y no es que el tope sea corto: es que dos damas pueden pasearse por las diagonales</sub>
- **NO CONTABA LAS CAPTURAS.** <sub>línea 472</sub>
  <br><sub>1 tanto para una captura simple («c3e5») como para un avance cualquiera («a3b4»): las dos son dos casillas de texto. Con todas las jugadas empatadas a una comida, decidía el desempate de avance y el resultado era</sub>
- **UN PLY DE SEGURIDAD — y no es un adorno, era la diferencia** <sub>línea 496</sub>
  <br><sub>entre tener rival de casa y no tenerlo. Con sólo capturas y avance, todas las jugadas empataban muy a menudo, y como el desempate es `>` estricto se quedaba la primera</sub>

### `public/arcade/js/protohub/rules/defensa.js`

- **LO ELIGIÓ LA MATRIZ, OTRA VEZ, Y POR DOS HUECOS A LA VEZ.** <sub>línea 7</sub>
  <br><sub>`matriz_generos.mjs` decía que `autonomo` lo sostenían **3 de 22** y que ninguno juntaba mundo vivo con adversario. Y decía algo peor por omisión: ninguno de los veintidós tiene ECONOMÍA — un recurso que se acumula, se gasta</sub>
- **POR QUÉ ESA FAMILIA NO SE PARECE A NADA DE LO QUE HABÍA** <sub>línea 16</sub>
  <br><sub>En los veintidós anteriores, una jugada mala se paga en esa jugada. Aquí se paga tres turnos después, cuando el oro que no ahorraste hace falta y no está. Es la primera vez que el motor pide **planificar contra un reloj que</sub>
- **ESTOS NÚMEROS LOS FIJÓ UNA MEDIDA, Y LA PRIMERA TANDA ERA UN JUEGO ROTO.** <sub>línea 32</sub>
  <br><sub>Con la primera —torre 10, bicho 8, alcance 2, vida 3 y entrada fija— las tres semillas daban **exactamente el mismo resultado**: tablas a 9, cuarenta bichos muertos, un punto de daño en ciento veinte rondas. La defensa no ganaba por</sub>
- **CUATRO, Y EL NÚMERO SALE DE UNA CUENTA QUE HAY QUE HACER.** <sub>línea 50</sub>
  <br><sub>Una torre alcanza a un bicho que pasa por su columna exactamente tres rondas —alcance uno, tres filas—. Con cinco de vida sobrevivía siempre y las torres eran adorno: medido, **tres torres por bando y cero bajas**. Con tres moría</sub>
- **ORO DE SALIDA DESIGUAL, Y ES LO ÚNICO QUE SORTEA LA SEMILLA.** <sub>línea 81</sub>
  <br><sub>Antes sorteaba la columna de entrada; al dejar que el atacante la elija, eso dejó de existir y las tres semillas daban partidas IDÉNTICAS — el entorno no medía nada que dependiera del reparto.</sub>
- **Y DOS TORRES YA PUESTAS, DISTINTAS EN CADA SEMILLA.** <sub>línea 99</sub>
  <br><sub>El calibrador dijo `±0.0` sobre **120 semillas**: separaba a las políticas, sí, pero jugando ciento veinte veces la misma partida. Al dejar que el atacante eligiera columna, a la semilla no le quedó nada</sub>
- **DOS CARRILES, COMO EN LA FLOTA — Y AQUÍ SIN NIEBLA, A PROPÓSITO.** <sub>línea 127</sub>
  <br><sub>Se ve todo: tus torres, sus torres, los bichos de los dos lados. No es pereza, es la estructura que se quiere aislar. La flota ya mide deducir bajo incertidumbre; si aquí también hubiera niebla, un mal resultado no</sub>
- **EL MUNDO CORRE UNA VEZ POR RONDA, NO UNA POR JUGADA.** <sub>línea 239</sub>
  <br><sub>tras cada acción, quien mueve primero vería el tablero cambiar dos veces por vuelta y el segundo jugaría otro juego. Una ventaja de salida invisible convierte la tabla en un ranking de quién empieza.</sub>
- **SI TE ESTÁN ATACANDO Y NO TE LLEGA, AHORRA — NO CONTRAATAQUES.** <sub>línea 287</sub>
  <br><sub>Sin esta línea el rival de la casa no llegaba nunca a los doce de oro: iba gastando de seis en seis en bichos y las torres eran adorno. Medido, y la mecánica era graciosa de ver: las dos políticas repartían</sub>
- **AHORRAR, QUE ES LA JUGADA QUE ESTE GÉNERO AÑADE.** <sub>línea 302</sub>
  <br><sub>La primera versión decía en su comentario que ahorraba y no ahorraba: sólo levantaba torre si tenía los doce de oro justo en el instante del peligro, y como se gastaba de seis en seis en bichos, nunca llegaba.</sub>
- **El atacante ELIGE la columna.** <sub>línea 355</sub>
  <br><sub>resolver el juego una vez y no volver a pensar; ahora el hueco se busca y se tapa, que es la conversación que hace interesante al género. if (lado.oro >= COSTE_BICHO) {</sub>

### `public/arcade/js/protohub/rules/domino.js`

- **POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS** <sub>línea 9</sub>
  <br><sub>Los treinta y cinco anteriores colocan piezas en sitios LIBRES: una casilla vacía, un hueco de la caja de entropy, un asiento. La legalidad es «¿está ocupado?».</sub>
- **Y SIN EMBARGO EL ESPACIO DE ACCIONES ES DIMINUTO** <sub>línea 23</sub>
  <br><sub>Por muchas fichas que tengas, la cadena sólo tiene DOS puntas. Así que las jugadas legales son `jugar:6-3:izq`, `jugar:6-3:der`, `robar` y `pasar` — cabe en `legal_moves` sin retorcer nada y se le cuenta a un modelo en una frase. Es</sub>
- **LA ORIENTACIÓN NO ES UNA JUGADA, ES UNA CONSECUENCIA** <sub>línea 31</sub>
  <br><sub>Tentación: ofrecer `jugar:6-3:izq:volteada`. Sería mentir sobre el juego — puesta una ficha en una punta, el sentido en que casa está determinado— y además duplicaría las acciones sin añadir ni una decisión. Lo que SÍ se publica</sub>
- **ROBAR NO ES OPCIONAL, Y POR ESO NO SIEMPRE ES UNA JUGADA** <sub>línea 39</sub>
  <br><sub>En el dominó de pozo se roba OBLIGATORIAMENTE mientras no tengas nada que poner. Ofrecer `robar` cuando ya tienes una ficha jugable convertiría una obligación en una decisión, y entonces sería otro juego —uno donde puedes</sub>
- **EL FINAL TIENE DOS FORMAS, Y LAS DOS CUENTAN DISTINTO.** <sub>línea 134</sub>
  <br><sub>Se acaba porque alguien se queda sin fichas —«dominó»— o porque nadie puede poner y el pozo está vacío —«cerrado», o tranca—. En el primer caso gana el que cerró; en el segundo, el de menos puntos en la mano. Tratar los dos</sub>
- **`legal_moves` ES DE QUIEN MUEVE, MIRE QUIEN MIRE — Y EL RESPALDO TAMBIÉN.** <sub>línea 159</sub>
  <br><sub>Aquí había dos ramas, una para «me toca» y otra para «mira otro», y sólo la primera caía a `robar`/`pasar` cuando no había ficha jugable. La segunda devolvía la lista VACÍA, así que en cuanto el rival se quedaba</sub>
- **EL RIVAL DE LA CASA.** <sub>línea 245</sub>
  <br><sub>Sin esto la casa caía en `primera`: la primera jugada legal de la lista. Eso no es jugar mal al dominó, es no jugar al dominó — y como el banco compara a todo el mundo contra la casa, un rival así mide la suerte del reparto y nada</sub>
- **Y DEJA TECHO A PROPÓSITO: no cuenta lo que el rival NO tiene.** <sub>línea 263</sub>
  <br><sub>alguien pasa está diciendo en voz alta que no lleva ninguna de las dos puntas, y esa es la mitad buena del juego. No se usa. Un rival de casa que juega perfecto no separa a nadie, que es lo que ya dice `gofish.js`.</sub>
- **EL SUSTRATO: UNA ZONA POR MANO Y UNA POR LA CADENA.** <sub>línea 308</sub>
  <br><sub>La cadena NO es una rejilla y no se declara como tal: su forma sale de cómo se jugó, no de una matriz. Es una zona ORDENADA, y ese orden es el dato —la primera ficha es la punta izquierda y la última la derecha—.</sub>

### `public/arcade/js/protohub/rules/entropy.js`

- **LA CARTA EN LA MANO VA EN EL ESTADO — la lección más cara del original** <sub>línea 27</sub>
  <br><sub>La primera versión del Python la guardaba en `self._robada`, un atributo del motor, y el recuento total daba **95 de 96**. No era sólo un descuadre: esa carta no la veía `get_state()`, no sobrevivía a una serialización y **el</sub>
- **Y LO QUE NO SE PORTA: el recicle del Python usa `random.shuffle` sin** <sub>línea 35</sub>
  <br><sub>semilla. Aquí se deriva de `(semilla, nº de recicle)`, como en [unit.js].</sub>
- **LA CARTA ES SU NÚMERO.** <sub>línea 48</sub>
  <br><sub>Esto repartía con la española de 48 y **no miraba el palo ni una sola vez**: se suman valores y se anulan dos iguales en columna, nada más. O sea que se dibujaban oros y copas para decorar, la sota valía 10 y había que traducir «R»</sub>
- **LOS COMODINES SON DEL JUEGO, NO DE LA BARAJA ESPAÑOLA.** <sub>línea 75</sub>
  <br><sub>Se declaran en `games.entropy.specials` y no en `decks.spanish_48`, que es lo que parecía más ordenado y habría sido un desastre: esa baraja la reparten también la brisca y el tute, y se habrían encontrado dos comodines en la mesa</sub>
- **A QUÉ SE JUEGA, PARA QUIEN NO VE LA MESA.** <sub>línea 197</sub>
  <br><sub>Este juego es el que me lo enseñó. Jugué una mano leyendo sólo lo que recibe un agente y no había forma de saber si «Puntos: -11» era bueno o malo. Lo deduje viendo moverse el número después de una jugada que ya</sub>
- **DESTAPAR UN COMODÍN ABRE UNA DECISIÓN, Y VA EN DOS TIEMPOS.** <sub>línea 258</sub>
  <br><sub>El tuki también se mueve cuando lo DESTAPAS: acabas de descubrirlo en tu caja y puedes llevártelo a la columna que quieras. Pero eso no se puede ofrecer de una sola vez.</sub>
- **DESCARTAR SIN DESTAPAR: SÓLO DEL MAZO Y CON UNA TAPADA.** <sub>línea 297</sub>
  <br><sub>Antes esto era `: ['descartar']` cuando NO quedaban tapadas — y eso no pasa nunca, porque destapar la última cierra la ronda. Medido: se ofreció 0 veces en 744 turnos. Código</sub>
- **Y SÓLO SI LA ROBASTE DEL MAZO.** <sub>línea 309</sub>
  <br><sub>que acabas de coger del descarte deja la mesa exactamente como estaba: sería pasar turno gratis, y un juego donde se puede pasar gratis no se acaba nunca.</sub>
- **LO QUE SE VE ES LO QUE SE VE.** <sub>línea 322</sub>
  <br><sub>Las cartas tapadas salen como `null`, también las PROPIAS. Es todo el juego: si el estado las revelara, un agente de lenguaje leería su caja entera y el entorno dejaría de medir memoria para medir</sub>
- **AQUÍ EL PALO NO PINTA NADA, Y CONVIENE DECIRLO.** <sub>línea 347</sub>
  <br><sub>Se reparte con la española de 48 porque da 12 valores limpios, pero ninguna regla mira el palo: se suma el valor y se anulan dos iguales en la misma columna. El oro y la copa son</sub>
- **LO QUE ROBAS DEL MAZO ES TUYO Y DE NADIE MÁS.** <sub>línea 375</sub>
  <br><sub>Esto era `robada: p.robada` a secas, sin mirar quién pregunta: el rival veía la carta que acababas de robar del mazo antes de que decidieras qué hacer con ella. Del descarte da igual —esa la</sub>
- **UNA LÍNEA QUE DIGA QUÉ TOCA.** <sub>línea 398</sub>
  <br><sub>Escribió: «La carta que robó si no la quiero no me deja descartarla». Y tenía razón a medias — sí se puede tirar, pero DESTAPANDO una de las tuyas, que es el precio y es lo que hace</sub>
- **Y SE DERIVA DE `legales`, NO SE ESCRIBE APARTE.** <sub>línea 416</sub>
  <br><sub>ayuda que se redacta a mano es otra lista que se separa de la realidad en silencio — el día que cambie una regla, la pista seguiría contando la de antes. Así no puede: si la jugada no está</sub>
- **EL COMODÍN SE APARTA EN VEZ DE TIRARSE — Y TÚ ELIGES ADÓNDE.** <sub>línea 488</sub>
  <br><sub>`cambiar:N:mueve:M`. En el juego del que viene esto, el tuki es la ÚNICA carta que se mueve: cuando entra una del mismo valor que la otra de su columna, el comodín no se descarta, se corre a otro hueco</sub>
- **SÓLO SE OFRECE SI LA PAREJA SE VE.** <sub>línea 500</sub>
  <br><sub>Si la otra carta de la columna estuviera boca abajo, ofrecer esta jugada sería CONTAR SU VALOR: aparecería en la lista de legales justo cuando coincide, y con eso se deduce la carta tapada sin</sub>
- **EL SEGUNDO TIEMPO: adónde llevas el comodín que acabas de** <sub>línea 538</sub>
  <br><sub>destapar. Es un INTERCAMBIO, no un descarte — aquí no sale ninguna carta de la caja, sólo cambian de sitio. Y la que venía tapada sigue tapada: la has movido, no la has mirado.</sub>
- **EL RIVAL DE LA CASA TIENE QUE CONOCER LAS REGLAS NUEVAS.** <sub>línea 609</sub>
  <br><sub>Por dos motivos, y el segundo es el que importa. El primero: si devolviera una jugada que ya no es legal, `mover` diría que no, el arnés se quedaría sin jugada y la partida terminaría a medias — con</sub>
- **Y MOVER EL COMODÍN NO CAMBIA LA SUMA POR SÍ SOLO.** <sub>línea 622</sub>
  <br><sub>Vale 0 esté donde esté: lo único que puede mejorar es que la carta que ocupa su sitio ANULE esa columna. Por eso sólo se mueve cuando hay una coincidencia de rango a la vista, y si no, se queda — que es</sub>
- **APARTAR EL COMODÍN ES ESTRICTAMENTE MEJOR QUE TIRARLO.** <sub>línea 654</sub>
  <br><sub>Cuando cabe `cambiar:N:mueve:M`, la alternativa `cambiar:N` forma la misma pareja pero manda el comodín al descarte. Aquí se conserva y lo que se pierde es una carta TAPADA, que de media vale seis y pico.</sub>
- **CON UNA SOLA TAPADA, DESTAPARLA CIERRA LA RONDA.** <sub>línea 681</sub>
  <br><sub>no se hace por inercia.</sub>

### `public/arcade/js/protohub/rules/flota.js`

- **ESTE JUEGO LO ELIGIÓ `matriz_generos.mjs`, NO YO.** <sub>línea 7</sub>
  <br><sub>La matriz mide, jugando, qué estructuras de decisión cubre el motor. Con veintiún juegos decía dos cosas incómodas: que **catorce de los veintiuno ocupaban sólo dos perfiles** —seis de tablero abierto, ocho de cartas—, y que</sub>
- **Y ES EL PRIMERO CON SUSTRATO PROPIO **Y DOS ASIENTOS**.** <sub>línea 25</sub>
  <br><sub>Sokoban y cripta son solitarios: un solo punto de vista, ningún riesgo. Aquí `sustrato(p, asiento)` tiene que devolver dos cuadros distintos del mismo estado, y equivocarse significa enseñarle a uno la flota del otro. Ya pasó</sub>
- **EL SUSTRATO POR ASIENTO: DOS MARES, Y SÓLO UNO CON NIEBLA.** <sub>línea 65</sub>
  <br><sub>Se publica una rejilla de 17×8 — ocho columnas del mar enemigo, una de muro, ocho del propio— porque un tablero de la flota SON dos tableros y fingir que es uno obligaría a quien pinta a saber que la mitad izquierda</sub>
- **CADA CASILLA DICE CÓMO SE LLAMA.** <sub>línea 108</sub>
  <br><sub>Oscar, desde el buzón: «que el panel no tenga la misma forma que el tablero es un follón; deberíamos crear dos matrices que se correspondan». Tiene razón, y el arreglo no es dibujar letras: es que</sub>
- **LAS JUGADAS LEGALES SON LAS CASILLAS QUE NO HAS DISPARADO, Y AQUÍ** <sub>línea 168</sub>
  <br><sub>ESO NO FILTRA NADA — al revés que en cripta, donde la lista tuvo que llevar niebla porque decir «por aquí se puede pasar» era describir el mapa. Dónde has disparado tú es información TUYA: ya la tenías. La</sub>
- **Y SON LAS DE QUIEN MUEVE, NO LAS DE QUIEN MIRA.** <sub>línea 176</sub>
  <br><sub>verificador rechazando la segunda jugada de toda partida: `estado(p)` sin asiento devolvía siempre las casillas libres del asiento 0, así que en el turno del rojo la lista describía el mar equivocado y la</sub>
- **Y lee EL SUSTRATO DE SU ASIENTO, no el estado.** <sub>línea 244</sub>
  <br><sub>`p.flotas` y hundir la flota enemiga en doce disparos exactos; nadie se lo impide desde dentro. Un techo tramposo deja a todo agente honrado por debajo sin que la tabla explique por qué. Entrando por la misma puerta que</sub>

### `public/arcade/js/protohub/rules/frentes.js`

- **LO QUE ROMPE ESTE JUEGO, Y POR ESO EXISTE** <sub>línea 8</sub>
  <br><sub>Los veinticuatro anteriores comparten un supuesto tan de fondo que no se ve: **que cuando te toca, el pasado ya está decidido**. Miras el tablero, y lo que hay en él es un hecho. Aquí no: cuando eliges, la mitad de la ronda —lo que</sub>
- **Y ES MEDIBLE, QUE ES LO QUE LO HACE ÚTIL AQUÍ.** <sub>línea 19</sub>
  <br><sub>`matriz_generos.mjs` no pregunta si un juego «es simultáneo»: juega el mismo punto con dos jugadas distintas del primero y mira si el segundo nota algo. Si lo nota, no es simultáneo: es tener ventaja. Este fichero está escrito para</sub>
- **EL PASADO SÍ ES PÚBLICO, A PROPÓSITO.** <sub>línea 26</sub>
  <br><sub>a dónde lo saben los dos (`historial`). Sin eso el juego sería puro azar y mediría suerte; con eso, quien detecta un patrón lo explota. Ahí está la habilidad, y por eso el pasado se cuenta y el presente no.</sub>
- **TRES TROPAS DE SALIDA POR BANDO, REPARTIDAS POR LA SEMILLA.** <sub>línea 52</sub>
  <br><sub>Con una sola de ventaja el calibrador volvió a decir `±0.0` sobre **200 semillas**: separaba las políticas y jugaba doscientas veces la misma partida. El motivo es estructural y vale la pena nombrarlo: este</sub>
- **EL SUSTRATO NO SABE LO QUE ESTÁ ELEGIDO Y SIN RESOLVER.** <sub>línea 75</sub>
  <br><sub>Dos ejércitos frente a frente: los tuyos crecen hacia arriba desde abajo, los suyos hacia abajo desde arriba, y en medio la línea. Lo que hay en el cuadro son hechos consumados; la elección de esta ronda no está ahí, ni la</sub>
- **AQUÍ NO SALE `oculta`.** <sub>línea 142</sub>
  <br><sub>que dice la cabecera: el estado publica el pasado y el presente consumado, nunca la elección pendiente. Publicarla «sólo para el dueño» tampoco valdría — el arnés pide el estado por asiento y un</sub>
- **Y USA SÓLO `historial`, que es público.** <sub>línea 197</sub>
  <br><sub>lo que el otro acaba de elegir: sería un techo imbatible y absurdo, porque el juego consiste exactamente en no saber eso. Un rival de la casa que mira la carta tapada no marca un techo, rompe el experimento.</sub>
- **AQUÍ HAY QUE MEZCLAR, Y NO ES UN CAPRICHO: ES TEORÍA DE JUEGOS.** <sub>línea 222</sub>
  <br><sub>La primera versión cogía el mejor frente y ya. Contra una copia de sí misma eso es catastrófico y se midió: las dos políticas valoran igual, eligen igual, **chocan las ocho rondas de ocho** y la partida acaba 0-0</sub>

### `public/arcade/js/protohub/rules/generala.js`

- **POR QUÉ ESTE JUEGO, Y QUÉ VINO A PROBAR** <sub>línea 8</sub>
  <br><sub>`parchis.js` demostró que un dado cabe en el contrato usando las TRES estructuras a la vez: rejilla, piezas y zonas. La pregunta que dejaba abierta es la contraria — **¿aguanta el contrato un juego que no tenga tablero en absoluto?**</sub>
- **EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS** <sub>línea 25</sub>
  <br><sub>Una partida se verifica VOLVIÉNDOLA A JUGAR con `{juego, semilla, jugadas}`, y la re-simulación repite sólo las jugadas ACEPTADAS. Si `mover()` tirara los dados antes de rechazar una jugada ilegal, la partida viva habría consumido azar que la</sub>
- **UN DADO APARTADO SE QUEDA APARTADO.** <sub>línea 40</sub>
  <br><sub>En la generala de mesa puedes recoger un dado que ya habías apartado. Aquí no, y la razón es de terminación, no de pereza: con `guardar` y `soltar` el turno es un grafo CON CICLOS —guardar:3, soltar:3, guardar:3…— y una partida puede no acabar</sub>
- **SIMPLIFICACIONES, DECLARADAS** <sub>línea 53</sub>
  <br><sub>· La generala servida NO gana la partida en el acto (regla de casa habitual). Vale 55 y se sigue jugando. Con muerte súbita la mitad de las partidas acaban con nueve casillas vacías y el marcador deja de ordenar nada, que es justo lo</sub>
- **LA ESCALERA DEL RÍO DE LA PLATA TIENE UNA EXCEPCIÓN, Y NO SE ESCRIBE A MANO.** <sub>línea 80</sub>
  <br><sub>Son corridas de cinco caras distintas: 1-2-3-4-5 y 2-3-4-5-6. Y además 3-4-5-6-1, donde el 1 hace de 7 — es la única que da la vuelta, y aquí se calcula como «las DADOS-1 caras más altas, más el 1» en vez de teclearla. En un</sub>
- **EL ORDEN NO ES INDIFERENTE, Y NO ES ESTÉTICA.** <sub>línea 162</sub>
  <br><sub>`tirar` y `anotar` van ANTES que `guardar` a propósito. Una política ingenua —«la primera legal», que es el control con el que se calibra este entorno— se queda enganchada en lo primero que le ofrezcas: si `guardar` fuera lo primero,</sub>
- **EL MARCADOR PUNTÚA LO ANOTADO, NO SÓLO SI GANASTE.** <sub>línea 240</sub>
  <br><sub>Si sólo contara ganar, dos agentes flojos empatarían a cero y la tabla no ordenaría nada — el aviso está escrito en `sokoban.js` y en `parchis.js`, y aquí muerde el doble porque en la generala se pierde</sub>
- **Se comprueba contra la lista legal ANTES de tocar nada.** <sub>línea 286</sub>
  <br><sub>de la cabecera: gastar azar en una jugada que luego se rechaza desincroniza la re-simulación y convierte a un jugador honesto en un tramposo a ojos del verificador.</sub>
- **NO CONSUME `p._rnd`.** <sub>línea 333</sub>
  <br><sub>esto se llama fuera de la secuencia de jugadas. Para desempatar usa el hash sin estado de la semilla y el número de jugada, como `parchis.js`.</sub>
- **SUSTRATO NATIVO SIN REJILLA Y SIN PIEZAS.** <sub>línea 380</sub>
  <br><sub>demostrar: que el contrato aguanta también el extremo contrario al del parchís. Aquí no hay terreno ni nada que se mueva por él — todo el estado visible son montones sobre la mesa.</sub>
- **Y POR ESO ESTA PÁGINA DECLARA `visualizador: 'mesa_tablero.mjs'`.** <sub>línea 385</sub>
  <br><sub>`montarMesa` elige la mesa de casino para «zonas y ninguna rejilla», que es exactamente esta forma; pero `mesa_cartas.mjs` leía `sustratoDe(juego, estado)` —el adaptador—, que sólo conoce manos, mazos y descartes: con</sub>
- **ANTES DE LA PRIMERA TIRADA NO HAY NADA SOBRE LA MESA, Y ESO SE LEE** <sub>línea 400</sub>
  <br><sub>COMO UN FALLO.</sub>
- **Y `ocultas` NO ERA LA RESPUESTA, AUNQUE LO PARECIERA.** <sub>línea 409</sub>
  <br><sub>La primera versión ponía los cinco en `ocultas`, que es lo mismo que usan las cartas de un rival: EXISTE, pero no se sabe qué cara tiene. Medido en pantalla (capturas de antes/después de tirar): sale como</sub>

### `public/arcade/js/protohub/rules/go.js`

- **NO SE JUEGA EN LAS CASILLAS: SE JUEGA EN LOS CRUCES.** <sub>línea 170</sub>
  <br><sub>Esto lo tiene que DECIR el juego porque no se puede deducir. Un go y un reversi publican exactamente la misma matriz de números, y sin esta línea el pintor dibujaba el go como un damero de 19x19 — parecía un tablero de</sub>
- **AQUÍ EL COLOR NO ES ASPECTO: ES LA REGLA.** <sub>línea 180</sub>
  <br><sub>En casi todos los juegos de esta mesa da igual que un bando salga azul y el otro rojo — son «el de arriba» y «el de abajo». En el go no: «juegas negras» es cómo se nombra tu bando, el estado dice `black` y `white`, y las piedras</sub>
- **SIN ESTO LA PARTIDA NO TERMINA NUNCA.** <sub>línea 300</sub>
  <br><sub>En go casi siempre quedan jugadas legales —hay 361 puntos—, así que un rival que solo pasa "cuando no puede mover" no pasa jamás: las 30 partidas de prueba se atascaron todas en el tope de movimientos.</sub>

### `public/arcade/js/protohub/rules/gofish.js`

- **EL FALLO DEL TURNO, QUE VIENE DOCUMENTADO DEL ORIGINAL** <sub>línea 23</sub>
  <br><sub>El Python lo cuenta en su propio comentario y se porta ya arreglado: se avanzaba de jugador en el fallo Y otra vez al final, en las dos ramas. Con dos jugadores eso significaba que **acertar te quitaba el turno** —lo contrario de</sub>
- **TABLAS POR ATASCO — regla añadida aquí, no está en el original** <sub>línea 35</sub>
  <br><sub>Con el mazo agotado, un jugador que siempre pida el mismo rango fallido deja la partida girando para siempre: nadie roba, nadie entrega, el turno da vueltas. El Python sólo termina cuando no quedan cartas, así que se colgaba.</sub>
- **ESTA JUGADA LA DESTAPÓ UNA PARTIDA MUERTA, NO LA LECTURA DE LAS REGLAS** <sub>línea 177</sub>
  <br><sub>Se llegaba a `manos [0,3,0] · mazo 1`: el único jugador con cartas no tenía a quién pedir, y como quedaba una carta en el mazo la partida tampoco estaba terminada. Ni seguía ni acababa — se moría</sub>

### `public/arcade/js/protohub/rules/guerra.js`

- **EL BOTE, Y POR QUÉ SE MENCIONA** <sub>línea 18</sub>
  <br><sub>El Python arrastró un fallo aquí: en un empate las cartas «se quedaban en el limbo» y el recuento total bajaba de 52. Lo destapó una invariante —«no se pierden cartas»— no un jugador quejándose. Ese invariante se conserva en este</sub>

### `public/arcade/js/protohub/rules/index.js`

- **POR QUÉ EXISTE ESTE FICHERO (2 de agosto de 2026)** <sub>línea 6</sub>
  <br><sub>Hoy he arreglado seis veces el mismo fallo, siempre igual: una lista escrita a mano que se separa en silencio de la realidad.</sub>
- **Damas recibe OPCIONES: es el primer juego con normas variables** <sub>línea 36</sub>
  <br><sub>(`damaVuela`, `peonComeAtras`). Sin opciones da exactamente lo de siempre. damas:    (o) => import('./damas.js').then(m => m.crearDamas(o ?? {})), xiangqi:  () => import('./xiangqi.js').then(m => m.xiangqi),</sub>
- **EL PRIMERO QUE PUBLICA `sustrato(p)` NATIVO.** <sub>línea 66</sub>
  <br><sub>Los diecinueve de arriba dicen su estado en cinco codificaciones distintas y `sustrato.js` las traduce. Éste no necesita traducción, así que el 2D, el 3D y el texto salieron el mismo día que las reglas — sin escribir un</sub>
- **EL PRIMERO QUE CORRE SOBRE UNA PIEZA DEL MOTOR.** <sub>línea 109</sub>
  <br><sub>`BoidsSystem`, que llevaba ahí sin usar porque no se podía repetir. Con dos arreglos de cuatro líneas —semilla inyectable y no importar el renderizador— salió un juego con una estructura que no teníamos: influir en un sistema</sub>
- **UN MUNDO QUE SE PUEDE MATAR, y la estructura que ni el censo supo** <sub>línea 115</sub>
  <br><sub>nombrar: los veintinueve anteriores castigan en el acto, aquí el castigo llega cuarenta turnos después. La jugada que más puntúa ahora es la que te mata luego. Física de presas: `FoodChainSystem`, otra pieza del motor.</sub>
- **DEDUCCIÓN SOCIAL, y no inventa ni un mecanismo: junta el reloj propio de** <sub>línea 120</sub>
  <br><sub>pradera, el `esperar` de relevo, el compromiso simultáneo de frentes y la vista por asiento de flota. Es la primera vez que hay algo que MENTIR — un agente podía jugar mal, nunca engañar. Lo único que una FSM no puede</sub>
- **EL PRIMER JUEGO DE CARTAS QUE PUBLICA SUSTRATO NATIVO, y el que estrena** <sub>línea 126</sub>
  <br><sub>una forma de esconder información que no teníamos: los treinta anteriores revelan al ACTUAR —preguntar en el go fish, apostar en el póker— y aquí se revela al ELEGIR ENTRE DOS FUENTES. Robar del descarte te da la carta que</sub>
- **EL PRIMERO QUE USA LOS CUATRO MATERIALES A LA VEZ —tablero, dados, cartas y** <sub>línea 137</sub>
  <br><sub>fichas— y el primero que mide VALORAR BAJO COMPETENCIA: cuanto vale esto para mi sabiendo lo que vale para el otro. Ninguna de las ocho columnas de la matriz de generos cubria eso. Su subasta se midio SOLA antes de escribir el juego.</sub>
- **EL PRIMERO CON DADO, y el que vino a contestar una pregunta de** <sub>línea 142</sub>
  <br><sub>arquitectura: ¿hace falta un motor de dados como el de cartas y el de tableros? No. Un dado no es una cuarta estructura — la tirada RESTRINGE `legal_moves`, que el contrato ya expresa, y visualmente es un objeto con una</sub>
- **EL RINCÓN OPUESTO DEL PARCHÍS EN EL CONTRATO: cinco dados y NINGÚN** <sub>línea 149</sub>
  <br><sub>tablero, o sea sólo zonas. Si los dos extremos entran sin tocar nada, el contrato aguanta lo que hay en medio. Y es el primero cuya decisión no es dónde mover sino QUÉ APARTAR y CUÁNDO PARAR de tirar.</sub>
- **TABLERO **Y** BARAJA, que era la combinación que faltaba por probar.** <sub>línea 159</sub>
  <br><sub>tablero que el parchís a propósito: así los dos se diferencian en UNA sola cosa —dado contra mano de cartas— y comparar un agente en ambos mide justo eso. Con dado no eliges tu tirada; con cartas eliges cuál gastas y cuál</sub>
- **SE DERIVAN, NO SE ESCRIBEN.** <sub>línea 177</sub>
  <br><sub>tildes, mayúsculas raras, aclaraciones—. El resto se saca de la clave.</sub>
- **POR QUÉ EXISTE ESTE OBJETO, Y CUÁNTO COSTÓ NO TENERLO** <sub>línea 201</sub>
  <br><sub>El árbitro de las mesas compartidas averiguaba el número de asientos JUGANDO: empezaba suponiendo uno y lo subía cada vez que veía cambiar el turno. Es ingenioso y está roto en el único momento que importa — **antes de</sub>
- **DOS JUEGOS TIENEN DOS NOMBRES, Y ESO ROMPÍA LOS AVISOS.** <sub>línea 247</sub>
  <br><sub>`chess.html` monta `{ juego: 'ajedrez', idJuego: 'chess' }` y `checkers.html` `{ juego: 'damas', idJuego: 'checkers' }`: el visualizador busca la partida con el nombre inglés y las reglas viven con el español. Viene de antiguo y no se</sub>

### `public/arcade/js/protohub/rules/nave.js`

- **ESTE JUEGO NO INVENTA NINGÚN MECANISMO: JUNTA CUATRO QUE YA ESTABAN.** <sub>línea 8</sub>
  <br><sub>· de `pradera` y `rebano` — el mundo tiene reloj propio y avanza decidas lo que decidas, con `dt` fijo para que la partida se pueda volver a jugar; · de `relevo` — `esperar`, o sea poder dejar pasar el tiempo sin actuar,</sub>
- **Y ES LA PRIMERA VEZ QUE HAY ALGO QUE MENTIR.** <sub>línea 22</sub>
  <br><sub>En los veintinueve anteriores un agente podía jugar mal, nunca ENGAÑAR. El impostor tiene que producir un comportamiento que parezca otro comportamiento, y los tripulantes tienen que leer intenciones a partir de trayectorias</sub>
- **LA NAVE ES GRANDE Y TIENE MAMPARAS PORQUE EL GÉNERO NECESITA INTIMIDAD.** <sub>línea 35</sub>
  <br><sub>La primera versión era 15×11 con visión de radio 3 y sin línea de visión. Medido: el impostor **pudo matar 69 veces de 90 turnos y mató cero**, porque veía a dos o más tripulantes en 75 de esos 90. Con cuatro personas en un</sub>
- **LA NAVE LA REPARTE `BSPSystem`, NO UN APAÑO MÍO.** <sub>línea 71</sub>
  <br><sub>La primera versión echaba seis mamparas largas al azar con una puerta cada una. Funcionaba, y era exactamente el tipo de cosa que este proyecto lleva un día quitando: código propio haciendo peor lo que una</sub>
- **EL SUSTRATO NO DICE QUIÉN ES EL IMPOSTOR — NI SIQUIERA AL IMPOSTOR SE LO** <sub>línea 121</sub>
  <br><sub>DICE DE LOS DEMÁS.</sub>
- **`sinVista`, NO `niebla` — Y LA DIFERENCIA NO ES DE NOMBRE.** <sub>línea 134</sub>
  <br><sub>`niebla` significa «no sé qué hay aquí»: terreno incluido, como en cripta. Aquí el plano es público y lo que falta es **quién** anda por cada sala. Usé `niebla` por comodidad y la prueba me pilló al vuelo —</sub>
- **EL PLANO ES PÚBLICO; LA NIEBLA ES SOBRE LA GENTE.** <sub>línea 150</sub>
  <br><sub>`celdas` trae la nave entera —un tripulante conoce su propio barco— y `niebla` marca sólo dónde no alcanzas a ver AHORA, o sea de qué salas no puedes decir quién hay dentro.</sub>
- **LAS TAREAS SE VEN SIEMPRE, TAMBIÉN EN LA NIEBLA.** <sub>línea 173</sub>
  <br><sub>Un tripulante conoce su propia nave: sabe dónde está el reactor aunque no lo tenga delante. Escondérselo convertía el juego en una búsqueda a ciegas — medido, **1 tarea de 6 en noventa rondas** — y desviaba la</sub>
- **`sabotear` SE LE OFRECE A TODO EL MUNDO, Y NO ES UN DESCUIDO.** <sub>línea 251</sub>
  <br><sub>La primera versión sólo se lo ofrecía al impostor. Parecía lo correcto —cada uno ve sus jugadas— y lo tumbó el verificador: *«jugada 32 ilegal: sabotear»*. Al re-simular desde el asiento 0,</sub>
- **Se GUARDA, no se aplica: nadie ve lo que han elegido los demás hasta** <sub>línea 312</sub>
  <br><sub>que ya no se puede cambiar de idea. Es el mecanismo de `frentes`. p.oculta[p.turno] = orden;</sub>
- **El empate NO expulsa.** <sub>línea 363</sub>
  <br><sub>y el juego dejaría de medir deducción para medir suerte. if (ordenados.length && (ordenados.length === 1 || ordenados[0][1] > ordenados[1][1])) { const fuera = p.gente.find(g => g.silla === ordenados[0][0]);</sub>
- **Los dos leen su sustrato, no el estado.** <sub>línea 385</sub>
  <br><sub>que mirase `p.gente` sabría siempre si hay alguien mirando, y un tripulante que mirase `p.impostor` votaría perfecto. El techo tiene que ser ciego igual que el jugador, o no es un techo.</sub>
- **EL IMPOSTOR TIENE QUE CAZAR, Y LA PRIMERA VERSIÓN NO LO HACÍA.** <sub>línea 417</sub>
  <br><sub>Le di la misma conducta que a un tripulante —ir a las tareas— pensando que eso era su coartada. Medido: **cero muertes en tres semillas de cuatro**, partidas que se acababan por agotarse el turno de guardia. Un</sub>

### `public/arcade/js/protohub/rules/oca.js`

- **POR QUÉ ESTE JUEGO, Y CONTRA QUÉ VINO A PROBAR EL MOTOR** <sub>línea 11</sub>
  <br><sub>El parchís —el otro juego de dado— sólo distingue dos clases de casilla: normal y seguro. Su rejilla usa `0` y `2` y con eso lo dice todo. La oca es el primer juego que necesita que el TERRENO tenga vocabulario: ocho tipos de</sub>
- **Y NO ME LO INVENTO PORQUE INVENTÁRSELO YA COSTÓ UN TABLERO.** <sub>línea 24</sub>
  <br><sub>pasada el recorrido del parchís se marcó con `1` — «aquí se pisa»— y `1` es MURO: el tablero salió como un macizo de cubos oscuros. Los números decían 68 casillas y las 68 estaban; sólo lo vio una captura de pantalla. Aquí el</sub>
- **DOS FICHAS POR JUGADOR, Y NO ES UN ADORNO: ES LA ÚNICA DECISIÓN.** <sub>línea 33</sub>
  <br><sub>La oca clásica no tiene ni una decisión — tiras y obedeces— y un entorno donde el agente no decide nada NO MIDE NADA. En este catálogo ya hay un juego así, `guerra`, y está declarado CONTROL DE LABORATORIO precisamente por eso: allí</sub>
- **EL TOPE DE JUGADAS, Y POR QUÉ HACE FALTA UNO** <sub>línea 48</sub>
  <br><sub>Pozo y cárcel encierran fichas, y un juego que encierra puede quedarse parado para siempre sin dar un solo error — el modo de fallo de la casa: verde y mintiendo. Aquí no puede pasar, y se razona: en el pozo cabe UNA ficha (la</sub>
- **EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS (la lección de `parchis.js`)** <sub>línea 59</sub>
  <br><sub>Una partida se verifica volviéndola a jugar con `{juego, semilla, jugadas}`, y la re-simulación repite sólo las jugadas ACEPTADAS. Si `mover()` tirara el dado antes de rechazar algo ilegal, la partida viva consumiría un número que</sub>
- **SIMPLIFICACIONES, DECLARADAS** <sub>línea 75</sub>
  <br><sub>· No está la tirada de salida privilegiada (5+4 y 6+3 al pozo de dados). · Al repetir tirada se puede mover CUALQUIERA de tus fichas, no obligatoriamente la que provocó la repetición. Con una ficha por jugador</sub>
- **LA ÚNICA DECLARACIÓN DE LAS CASILLAS ESPECIALES.** <sub>línea 116</sub>
  <br><sub>Aquí sí es legítima una lista escrita a mano: las casillas de la oca SON el juego, no un dato derivable. Lo que no es legítimo es repetirla. De este objeto salen las cuatro cosas que hacen falta —qué tipo hay en cada casilla,</sub>
- **NO CONSUME AZAR, y eso es lo que hace que `sugerencia()` pueda mirar el** <sub>línea 240</sub>
  <br><sub>futuro llamando a esta misma función sobre una copia de la partida. La alternativa —un evaluador que reimplementa «dónde caería»— es una segunda copia de las reglas, y las copias de las reglas se separan: es el fallo</sub>
- **LA FICHA QUE ACABA DE CAER NO DESCUENTA HOY.** <sub>línea 262</sub>
  <br><sub>en la posada con `espera = 1` se descontaba en el mismo turno de la caída y la ficha salía libre a la siguiente: «pierdes un turno» que no hacía perder ninguno. Un castigo que existe en el estado y no en la partida.</sub>
- **CRÉDITO PARCIAL: SE PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si** <sub>línea 322</sub>
  <br><sub>ganaste. Si sólo contara ganar, dos agentes flojos empatarían a cero y la tabla no ordenaría nada — el aviso está escrito en `sokoban.js` y en `parchis.js`, y aquí muerde más todavía porque en</sub>
- **MISMA FÓRMULA, UNA POR ASIENTO.** <sub>línea 331</sub>
  <br><sub>ninguno, si se agota `tope_jugadas`—, así que como mucho un `c` cae en la rama de los 800. Patrón de `bazas.js`. const marcador = Array.from({ length: jugadores }, (_, c) =></sub>
- **Contra la lista legal ANTES de tocar nada.** <sub>línea 379</sub>
  <br><sub>gastar azar en una jugada que luego se rechaza desincroniza la re-simulación y convierte a un jugador honesto en tramposo a ojos del verificador.</sub>
- **NO CONSUME `p._rnd`: `aplicarTirada` no gasta azar y además corre** <sub>línea 417</sub>
  <br><sub>sobre `copiar(p)`. Para desempatar, un hash sin estado de la semilla y el número de jugada, como `frentes.js` y `parchis.js`.</sub>
- **SUSTRATO NATIVO, Y AQUÍ ESTÁ LO QUE ESTE JUEGO VINO A PROBAR: LA** <sub>línea 453</sub>
  <br><sub>REJILLA CON VOCABULARIO.</sub>
- **LAS FICHAS QUE AÚN NO HAN ENTRADO, QUE SI NO NO SE VEN.** <sub>línea 499</sub>
  <br><sub>Es la lección literal de `parchis.js`: al empezar están todas fuera, así que `piezas` salía VACÍO y el tablero arrancaba sin nada encima — la partida parecía no haber repartido. Una ficha en</sub>

### `public/arcade/js/protohub/rules/parchis.js`

- **POR QUÉ ESTE JUEGO, Y QUÉ VINO A PROBAR** <sub>línea 9</sub>
  <br><sub>La pregunta era de arquitectura, no de juegos: **¿el sistema admite un motor nuevo, o los dados caben en lo que hay?** Se consultó, se verificó leyendo, y la respuesta fue que caben — y este fichero es la prueba. No hay motor de dados. No</sub>
- **EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS.** <sub>línea 25</sub>
  <br><sub>Aquí una partida se verifica VOLVIÉNDOLA A JUGAR con `{juego, semilla, jugadas}`, y la re-simulación repite sólo las jugadas que se aceptaron. Si `mover()` tirara el dado antes de rechazar una jugada ilegal, la partida viva habría consumido</sub>
- **Y NI `estado()` NI `sugerencia()` PUEDEN TOCARLO.** <sub>línea 37</sub>
  <br><sub>`estado()` lo llama la mesa CADA SEGUNDO para repintar. Si consumiera azar, la partida cambiaría por mirarla, y dos personas mirando la misma mesa verían partidas distintas. `sugerencia()` mezcla con un hash sin estado a partir de la</sub>
- **SIMPLIFICACIONES, DECLARADAS** <sub>línea 44</sub>
  <br><sub>Recorrido de 68 casillas y pasillo de 7, como el de verdad. NO están las barreras de dos fichas ni el premio de 20 al comer ni el de 10 al meter: cada una multiplica las jugadas legales y lo que este juego viene a probar es el</sub>
- **EL MARCADOR PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si ganaste.** <sub>línea 163</sub>
  <br><sub>Si sólo contara ganar, dos agentes que pierden empatarían a cero y la tabla no ordenaría nada — el aviso está escrito en `sokoban.js` y vale igual aquí, porque en un parchís se pierde casi siempre.</sub>
- **MISMA FÓRMULA QUE `puntos`, UNA POR ASIENTO.** <sub>línea 171</sub>
  <br><sub>por partida —`mover()` para en cuanto alguien mete las cuatro— así que como mucho un `c` cae en la rama de los 500; el resto cae en la de avance+metidas aunque `p.fin` sea true. Es el patrón de</sub>
- **Se comprueba contra la lista legal ANTES de tocar nada.** <sub>línea 205</sub>
  <br><sub>nota de la cabecera: gastar azar en una jugada que luego se rechaza desincroniza la re-simulación y convierte a un jugador honesto en un tramposo a ojos del verificador.</sub>
- **NO CONSUME `p._rnd`.** <sub>línea 258</sub>
  <br><sub>y esto se llama fuera de la secuencia de jugadas. Para desempatar usa un hash sin estado de la semilla y el turno, como `frentes.js`.</sub>
- **SUSTRATO NATIVO CON LAS TRES ESTRUCTURAS.** <sub>línea 285</sub>
  <br><sub>a demostrar: que un dado cabe sin ampliar el contrato.</sub>
- **EL RECORRIDO ES UN ANILLO, Y EL VOCABULARIO DE LA REJILLA NO ME LO** <sub>línea 292</sub>
  <br><sub>INVENTO YO.</sub>
- **Y LAS FICHAS QUE ESPERAN EN CASA, QUE SI NO NO SE VEN.** <sub>línea 337</sub>
  <br><sub>Al empezar están las dieciséis en casa, así que `piezas` salía VACÍO y el tablero arrancaba sin nada encima: la partida parecía no haber repartido. Se vio en la prueba —«piezas 0»— y no mirando la pantalla,</sub>

### `public/arcade/js/protohub/rules/poker.js`

- **LA RUEDA: A-2-3-4-5 es escalera y el as vale UNO.** <sub>línea 102</sub>
  <br><sub>se olvida siempre, y el que hace perder un bote real. if (unicos.includes(14)) unicos.push(1); let seguidas = 1;</sub>
- **`turn` ADEMÁS DE `turno`, PORQUE POKER ERA EL ÚNICO QUE NO** <sub>línea 376</sub>
  <br><sub>LO DECÍA.</sub>

### `public/arcade/js/protohub/rules/pradera.js`

- **LA ESTRUCTURA QUE NI EL CENSO SUPO NOMBRAR** <sub>línea 8</sub>
  <br><sub>Los veintiocho juegos anteriores tienen consecuencias: pierdes la partida. Ninguno tiene **consecuencias sobre el mundo**. En sokoban una caja mal empujada bloquea el nivel, sí — pero el nivel vuelve entero en la siguiente</sub>
- **Y LOS RATONES LOS MUEVE EL MOTOR** <sub>línea 19</sub>
  <br><sub>Toda la conducta de las presas —merodear, buscar queso, huir, esconderse, cansarse— es `FoodChainSystem`, la pieza que ya estaba escrita. Segundo juego seguido que sale de sembrar un sistema en vez de programar un mundo.</sub>
- **HAY QUE REESCALAR AL SISTEMA, NO SÓLO SEMBRARLO.** <sub>línea 49</sub>
  <br><sub>Los valores por defecto de `FoodChainSystem` están pensados para un laboratorio 3D en tiempo real: el ratón huye a 7 unidades por segundo y se asusta desde 7 de distancia. Aquí un turno son 0,36 segundos y el</sub>
- **SE PUNTÚA SOBREVIVIR, NO CAZAR — Y AHÍ ESTÁ TODO EL JUEGO.** <sub>línea 133</sub>
  <br><sub>Si el marcador premiara las presas, la mejor política sería comerse la pradera entera y el juego mediría voracidad. Premiando los turnos vividos, cazar es un MEDIO: necesario, y ruinoso en exceso.</sub>
- **LA CRÍA NECESITA DOS, Y ESO ES LA TRAMPA ENTERA.** <sub>línea 198</sub>
  <br><sub>Con un solo ratón vivo no nace ninguno más: la población es un recurso que se puede gastar hasta un punto de no retorno, no un contador que sube solo. Quien se come el penúltimo ya ha perdido, aunque tarde</sub>

### `public/arcade/js/protohub/rules/rebano.js`

- **ESTE JUEGO EXISTE PARA COMPROBAR UNA HIPÓTESIS, NO PARA AÑADIR UN GÉNERO.** <sub>línea 8</sub>
  <br><sub>Medido: el motor tiene 179 piezas y **los 27 juegos usaban una**. La sospecha era que no faltaba talento sino repetibilidad — que las piezas estaban escritas para demos y por eso no servían para medir. Si eso es cierto, sembrar un</sub>
- **Y LA ESTRUCTURA DE DECISIÓN ES NUEVA DE VERDAD** <sub>línea 20</sub>
  <br><sub>En los veintisiete anteriores mueves lo que decides mover. Aquí **influyes en un sistema emergente que no obedece**: acercarte demasiado dispersa el rebaño, quedarte lejos no lo empuja, y la forma correcta de llevar doce ovejas a un</sub>
- **ES UN RADIO, AUNQUE EL MOTOR LO LLAME `power`.** <sub>línea 37</sub>
  <br><sub>`BoidsSystem` pasa `p.power` a `SteeringSystem.flee(agent, pos, fleeRadius…)`: el tercer argumento es la distancia a la que se nota el susto, no su fuerza. Le puse 2,4 creyendo que era potencia y coloqué al perro a 3 casillas del</sub>
- **EL MOTOR PONE LAS OVEJAS, Y SE LE PASA LA SEMILLA.** <sub>línea 68</sub>
  <br><sub>Antes de sembrarlo, esta línea daba un rebaño distinto en cada partida con la misma semilla — y con eso el recibo no se puede verificar. El arreglo del sistema es lo único que hace posible este fichero.</sub>
- **EL `bounds` DE `initAgents` ES LA JAULA, NO SÓLO LA CUNA.** <sub>línea 79</sub>
  <br><sub>El sistema guarda ese rectángulo y en cada `tick` recorta las posiciones contra él. Yo le pasé la zona donde quería que NACIERAN —la mitad izquierda— y con eso las ovejas quedaban encerradas en `x` entre</sub>
- **EL MUNDO CORRE VARIOS SUBPASOS POR JUGADA, Y CON `dt` FIJO.** <sub>línea 189</sub>
  <br><sub>Fijo porque un `dt` de reloj real haría la partida irrepetible —el mismo recibo daría resultados distintos en una máquina lenta— y todo el proyecto descansa en poder volver a jugarla. Varios porque con uno solo</sub>
- **MEDIDO: EL AZAR GANABA AL TECHO. `tabla.mjs` (todo el catálogo, no sólo** <sub>línea 215</sub>
  <br><sub>este juego) sacaba `azar 1.66` sobre una escala donde `1,00` es la casa — dar tumbos rendía más que la heurística. La pista estaba en el propio fichero: el offset de la meta era `2.4`, que es el valor QUE TENÍA</sub>

### `public/arcade/js/protohub/rules/relevo.js`

- **ES LA ÚLTIMA CASILLA VACÍA DE LA TABLA.** <sub>línea 10</sub>
  <br><sub>`matriz_generos.mjs` medía `cooperativo` en **0 de 25**. Y no por descuido: en los veinticinco anteriores, cuando decide alguien más, decide en tu contra. Toda la maquinaria del proyecto —el reparto de asientos, el arbitraje de la</sub>
- **Y ESE SUPUESTO ESTABA METIDO EN EL PROPIO INSTRUMENTO.** <sub>línea 17</sub>
  <br><sub>Para no confundir cooperación con «este juego ignora el asiento», la sonda descartaba los que dan el mismo marcador a los dos. En un cooperativo eso es lo NORMAL —se gana junto—, así que el primer cooperativo de verdad habría</sub>
- **QUÉ MIDE QUE NO MIDIERA NINGUNO** <sub>línea 26</sub>
  <br><sub>Coordinarse sin hablar. Cada autómata ve sólo su alrededor, así que ninguno sabe si el otro ya ha llegado a su placa; hay que deducirlo de lo único que se observa —que la puerta esté abierta— y actuar en consecuencia. Un agente que</sub>
- **LOS OBSTÁCULOS SE COMPRUEBAN, NO SE CONFÍAN.** <sub>línea 68</sub>
  <br><sub>Un tabique de más puede dejar una placa incomunicada, y entonces la partida es imposible sin que nadie lo diga: el agente parecería malo cuando el que falló fue el generador. Es la lección de sokoban y de</sub>
- **UNA PLACA OCUPADA AL EMPEZAR ESTÁ PISADA.** <sub>línea 103</sub>
  <br><sub>`pisadas[k]` sólo se marcaba dentro de `mover()`, al LLEGAR a la placa. Si el reparto inicial colocaba a un autómata justo encima de una, nunca hubo un movimiento que la registrara: el juego lo veía de pie sobre la</sub>
- **CADA UNO VE SU TROZO, Y ESO ES LA MITAD DEL PROBLEMA.** <sub>línea 132</sub>
  <br><sub>Si los dos vieran el almacén entero, coordinarse sería repartirse tareas y ya. Con niebla propia, ninguno sabe si el otro ha llegado a su placa: hay que INFERIRLO de que la puerta esté franqueable, que es la única señal que</sub>
- **`esperar` NO ES UNA COMODIDAD: SIN ELLA EL JUEGO ES IMPOSIBLE.** <sub>línea 194</sub>
  <br><sub>Lo descubrí midiendo, y el síntoma era mudo: la política de la casa acababa las tres semillas con una placa de dos y nadie fuera. No jugaba mal — es que no se podía ganar. Para salir hay que estar los dos a la</sub>
- **EL MISMO NÚMERO PARA LOS DOS, Y ES LA DEFINICIÓN, NO UN ATAJO.** <sub>línea 221</sub>
  <br><sub>En los veinticinco anteriores el marcador de una silla sube cuando el de la otra baja. Aquí sube y baja a la vez para las dos, y eso es exactamente lo que `matriz_generos` mide para decidir si un juego es</sub>
- **Lee su sustrato, así que ninguno de los dos sabe dónde está el otro** <sub>línea 296</sub>
  <br><sub>salvo cuando lo tiene delante. Si mirara el estado se coordinarían por telepatía y el techo mediría un equipo que no existe.</sub>
- **MEDIDO: ESTA POLÍTICA PERDÍA CONTRA EL AZAR. `tabla.mjs` (catálogo** <sub>línea 300</sub>
  <br><sub>completo) sacaba `azar 1.30` sobre una escala donde `1,00` es la propia casa — jugando contra sí misma, la casa se atascaba más de lo que fallaba una pareja al azar. Jugando casa-contra-casa semilla a semilla</sub>
- **Éste NO era un fallo de la política, era de las reglas, y aquí se** <sub>línea 325</sub>
  <br><sub>rodeó porque quien lo encontró tenía prohibido tocarlas. **El rodeo ya no está**: `nuevaPartida` marca las placas ocupadas al repartir, que es donde estaba el roto. Un parche en la política habría hecho que el</sub>
- **EL ORDEN DE ESTAS TRES REGLAS ES TODA LA COORDINACIÓN.** <sub>línea 355</sub>
  <br><sub>En la salida se espera —bajarse justo cuando llega el otro es exactamente el fallo que hacía el juego imposible—. Sobre una placa se espera mientras falte la otra, porque sostenerla es lo único que el</sub>
- **Y ESPERAR EN LA SALIDA **SÓLO CUANDO YA NO QUEDA TRABAJO**, o el** <sub>línea 365</sub>
  <br><sub>remedio se convierte en abrazo mortal.</sub>
- **PAPELES REPARTIDOS POR EL NÚMERO DE SILLA — Y NO ES TELEPATÍA.** <sub>línea 387</sub>
  <br><sub>Sin repartir, los dos autómatas iban a la MISMA placa —la que tenían más cerca, que era la misma para ambos porque salen juntos— y nadie cruzaba. Cada uno hacía lo razonable y el equipo no hacía nada.</sub>
- **IR A LA SALIDA SIN HABER PISADO LA PLACA PROPIA ES ABANDONAR EL** <sub>línea 404</sub>
  <br><sub>TRABAJO A MEDIAS — Y ADEMÁS SE QUEDABA DANDO VUELTAS ALLÍ.</sub>
- **EXPLORAR «LO MÁS CERCA» NO BASTA PARA ENCONTRAR LA PUERTA — PERO** <sub>línea 421</sub>
  <br><sub>SÓLO CUANDO LA PUERTA ES LO QUE TOCA BUSCAR.</sub>
- **EL PESTILLO NO ES UNA CONCESIÓN, ES LO QUE HACE JUGABLE EL RELEVO.** <sub>línea 473</sub>
  <br><sub>Sin él, sostener una placa había que hacerlo indefinidamente, y eso a ciegas es un equilibrio imposible: el que sostiene no puede saber cuándo soltar y el que cruza no puede saber si le van a soltar. Medido, se quedaban los dos</sub>

### `public/arcade/js/protohub/rules/remigio.js`

- **EL AS VA POR LOS DOS LADOS, Y ESO SE DECLARA** <sub>línea 28</sub>
  <br><sub>`A 2 3` y `Q K A` valen; `K A 2` no. La biblioteca ordena los rangos con el as al final, así que una escalera construida sobre ese orden a secas dejaría fuera el `A 2 3`, que en un rummy es de las más comunes. Se resuelve poniendo el as</sub>
- **SIN COMODINES, TAMBIÉN A PROPÓSITO** <sub>línea 36</sub>
  <br><sub>El remigio de mesa suele llevarlos. Aquí no, porque un comodín multiplica las particiones posibles de una mano y convierte «¿esto está cerrado?» en un problema bastante más caro — y esa pregunta se contesta en CADA jugada legal de</sub>
- **Las dos familias caben en la MISMA tabla porque sus rangos no se pisan: la** <sub>línea 54</sub>
  <br><sub>francesa usa `J Q K A` y la española `S C R` con el uno escrito `1`. Así que no hace falta preguntar qué baraja está en juego —esa pregunta sería otra cadena de datos que se rompe en silencio— y el chinchón sale sin tocar `valorDe`.</sub>
- **¿REMIGIO NO IRÍA CON LA BARAJA ESPAÑOLA Y DOS BARAJAS?** <sub>línea 73</sub>
  <br><sub>Aviso de betatester, 14-08-2026. Lo dejo contestado aquí, que es donde vive la decisión, en vez de en un hilo que se pierde.</sub>
- **LO DE LA BARAJA ESPAÑOLA YA ESTÁ RESUELTO, Y NO AQUÍ.** <sub>línea 79</sub>
  <br><sub>`card_library.json` distingue las dos familias por su nombre:</sub>
- **LO DE DOS BARAJAS SÍ ES UNA VARIANTE, Y CUESTA MÁS DE LO QUE PARECE.** <sub>línea 93</sub>
  <br><sub>No es duplicar la lista. Todo este proyecto direcciona las cartas por su identidad —`jugar:S_A` es una jugada legal y viaja al recibo—, y con dos barajas hay DOS `S_A`. En cuanto existen dos, «juega el as de picas» deja de señalar una</sub>
- **LA VARIANTE DE DOS BARAJAS.** <sub>línea 111</sub>
  <br><sub>Oscar la pidió («remigio debería ser con dos barajas») y arriba está escrito lo que costaba. Ya no cuesta: el sufijo de copia vive en `rules/baraja.js` y lo entienden el pintor, el descriptor de texto y este chequeo de tríos. Se declara como norma,</sub>
- **Lo que NO es esto: no es el remigio con baraja española.** <sub>línea 119</sub>
  <br><sub>propio —chinchón—, otras reglas y otra puntuación, y está anotado arriba.</sub>
- **Y LAS DOS QUE NO SON GRATIS SON LAS QUE HACEN QUE SEA OTRO JUEGO:** <sub>línea 140</sub>
  <br><sub>· CERRAR CON CINCO, no con cero. En el remigio o ligas las diez o no cierras. Aquí puedes cerrar cargando hasta cinco puntos, y eso cambia la pregunta de cada turno: deja de ser «¿ya estoy perfecto?» y pasa a ser «¿cierro con cuatro</sub>
- **Lo que NO se copia de la mesa de verdad: allí se juega una SERIE hasta que** <sub>línea 150</sub>
  <br><sub>alguien pasa de cien y se elimina. Aquí una partida es UNA mano, la misma decisión que en el dominó, porque el banco compara partidas y no veladas. Va dicho en la ficha, en `diferencias`.</sub>
- **LA BARAJA ES LO ÚNICO QUE SE PUEDE CAMBIAR, Y NO ES UN CAPRICHO.** <sub>línea 156</sub>
  <br><sub>En la mesa el chinchón se juega con las dos: la de 48 y la de 40 —sin ochos ni nueves—, según la casa. Va por delante de `...o` para que se pueda pedir la otra, y el resto va detrás para que NO se pueda: si alguien pudiera pasar `corte: 0` o</sub>
- **TODAS LAS COMBINACIONES POSIBLES DE UNA MANO, COMO MÁSCARAS DE BITS.** <sub>línea 199</sub>
  <br><sub>Un trío no es «tres cartas del mismo número»: es CUALQUIER subconjunto de tres o más del mismo número, y hay que generarlos todos porque cuál conviene depende de qué escaleras se formen con las que sobren. Con `7♠ 7♥</sub>
- **AQUÍ ES DONDE LAS DOS BARAJAS ROMPÍAN EL JUEGO, Y NO SE VEÍA.** <sub>línea 216</sub>
  <br><sub>Con UNA baraja el mismo rango ya implica palos distintos, así que este bucle no los comprobaba: le bastaba con juntar tres sietes. Con dos, `7♦ 7♦#2 7♣` son tres sietes y NO es un trío — es una pareja con una</sub>
- **LA MEJOR FORMA DE REPARTIR UNA MANO, Y POR QUÉ NO VALE LA AVARICIOSA.** <sub>línea 275</sub>
  <br><sub>Lo obvio es ir cogiendo la combinación más larga y seguir con lo que sobra. Está mal, y se ve con cinco cartas: `7♦ 8♦ 9♦` más `7♠ 7♥`. La avaricia coge la escalera —tres cartas— y deja dos sueltas; la buena es el</sub>
- **`corte` ES LA DIFERENCIA ENTRE EL REMIGIO Y EL CHINCHÓN, Y NO ES UN NÚMERO.** <sub>línea 347</sub>
  <br><sub>En el remigio cierras con CERO muerto: o ligas las diez o no cierras. En el chinchón puedes cerrar cargando hasta cinco puntos, y eso cambia la partida entera — deja de ser «espera a estar perfecto» y pasa a ser «¿cierro ya con</sub>
- **EL CHINCHÓN: LAS SIETE SEGUIDAS DEL MISMO PALO.** <sub>línea 366</sub>
  <br><sub>Le da nombre al juego y no es un grupo más: gana en el acto y con premio.</sub>
- **Y SE MIRA SOBRE LA MANO, NO SOBRE LA PARTICIÓN QUE ELIGIÓ `repartoDe`.** <sub>línea 370</sub>
  <br><sub>Lo escribí primero pidiendo «un solo grupo que se coma la mano entera», y no puede funcionar: `O_1..O_7` deja cero muerto TAMBIÉN partido en `1-2-3` más `4-5-6-7`, y con cero muerto en las dos el optimizador puede devolver</sub>
- **LAS NORMAS VIVEN EN LA PARTIDA, NO EN EL MÓDULO — como en `damas.js`.** <sub>línea 413</sub>
  <br><sub>Si vivieran en el módulo, una partida no sabría con qué normas nació y el recibo tampoco: el verificador la volvería a jugar con las de HOY y la llamaría tramposa. Es el mismo motivo por el que damas las guarda, y ya</sub>
- **`asiento` NO ES `turno`.** <sub>línea 442</sub>
  <br><sub>compartida, publicar la mano del asiento 0 le enseña las cartas al rival. Aquí además el descarte y de dónde robó cada uno son públicos, y eso sí lo ve todo el mundo — la diferencia entre lo uno y lo otro es</sub>
- **LAS JUGADAS SON LAS DE QUIEN MUEVE, NO LAS DE QUIEN MIRA.** <sub>línea 457</sub>
  <br><sub>Mi primera versión las devolvía vacías cuando no era tu turno, razonando que ofrecerlas filtra la mano del rival. El razonamiento no es tonto — pero la convención de la casa ya estaba decidida y</sub>
- **EL MARCADOR PUNTÚA LO CERCA QUE TE QUEDASTE, NO SÓLO SI GANASTE.** <sub>línea 485</sub>
  <br><sub>La primera versión daba 100 al que cierra y 0 al resto. El aviso ya está escrito en `sokoban.js` y vale igual aquí: si nadie cierra —que entre agentes flojos es el caso NORMAL, no la excepción—, todo</sub>
- **MISMA FÓRMULA, UNA POR ASIENTO. «rivales» es «lo muerto de los** <sub>línea 507</sub>
  <br><sub>DEMÁS visto desde `c`», así que no es `rivales` reutilizado —para cada `c` los demás son otro conjunto— sino la misma suma rehecha por cada silla. Como mucho un `c` cierra por partida, así que como</sub>
- **Se vuelve a comprobar aquí y no se confía en `legal_moves`.** <sub>línea 602</sub>
  <br><sub>Quien llama puede ser un agente por HTTP mandando lo que quiera, y una jugada ilegal aceptada no da error: da una partida ganada que luego no verifica.</sub>
- **Y EL UMBRAL TIENE QUE SER EL MISMO QUE EL DE `cierres`.** <sub>línea 608</sub>
  <br><sub>Aquí decía `!== 0` mientras `cierres` ya comparaba contra `corte`: dos comprobaciones del MISMO hecho con constantes distintas. En el remigio no se notaba, porque su corte es 0 y las dos coincidían por</sub>
- **Y DEJA TECHO A PROPÓSITO, que es lo que se le pide a un rival de** <sub>línea 644</sub>
  <br><sub>banco de pruebas. No mira `tomas` —o sea que no deduce lo que el otro junta— ni evita tirar cartas que al rival le vendrían bien. Las dos cosas son justo lo que separa a un agente bueno de uno correcto, así</sub>
- **SUSTRATO NATIVO, QUE ES LO QUE PIDE EL TECHO.** <sub>línea 685</sub>
  <br><sub>`prueba_sustrato.mjs` cuenta cuántos juegos siguen pasando por el adaptador y ese número sólo puede bajar. Un juego nuevo que lo usara lo subiría y la prueba fallaría — que es exactamente para lo que está.</sub>

### `public/arcade/js/protohub/rules/reversi.js`

- **AQUÍ EL COLOR TAMPOCO ES ADORNO.** <sub>línea 95</sub>
  <br><sub>Las fichas del reversi son negras por un lado y blancas por el otro, y VOLTEAR es la jugada entera: lo que hace una partida es cambiar de color las que encierras. Con azul y rojo genéricos se sigue jugando igual, pero se pierde lo</sub>
- **SU PROPIO SUSTRATO, POR LO MISMO QUE LAS DAMAS.** <sub>línea 112</sub>
  <br><sub>`sustratoDe` reconstruye el tablero desde el FEN y decide el dueño por MAYÚSCULAS —la convención del ajedrez—. El FEN del reversi es `3BW3/3WB3`: las dos letras van en mayúscula porque aquí la letra ES el color. Medido antes</sub>
- **ANTES ERA PEOR QUE JUGAR LA PRIMERA CASILLA LEGAL.** <sub>línea 220</sub>
  <br><sub>lo típico mal, sino por hacer lo CORRECTO a medias: cogía esquina, esquivaba las casillas de al lado y luego minimizaba volteos —que es la jugada de manual en Othello, comer poco pronto conserva movilidad—.</sub>

### `public/arcade/js/protohub/rules/sigilo.js`

- **POR QUÉ ESTE Y POR QUÉ AHORA** <sub>línea 8</sub>
  <br><sub>`matriz_generos.mjs` dejaba dos casillas vacías después de la defensa: `oculto + autonomo + rival`, y **ningún juego de los veintitrés juntaba los cinco ejes**. Éste hace las dos cosas de una vez, y no por acumular</sub>
- **Y ES EL PRIMERO CON NIEBLA POR LOS DOS LADOS.** <sub>línea 18</sub>
  <br><sub>En la flota cada uno esconde su flota, pero el tablero es fijo y está a la vista. En cripta hay niebla, pero sólo una persona mira. Aquí hay dos memorias distintas del mismo edificio, cada una incompleta a su manera, y ninguna puede</sub>
- **ASIMÉTRICO A PROPÓSITO.** <sub>línea 25</sub>
  <br><sub>guardia, tocándolo. No hacen la misma tarea ni puntúan igual, y eso obliga al banco de pruebas a medir DOS papeles con el mismo entorno. Un agente puede ser bueno huyendo y malo cazando: hasta hoy no teníamos dónde verlo.</sub>
- **CUATRO, Y LO PIDIÓ LA MATRIZ DE GÉNEROS.** <sub>línea 40</sub>
  <br><sub>Con dos drones en un edificio de 21×15, `matriz_generos` marcaba este juego **sin agentes autónomos** — y no porque no los hubiera, sino porque no se veían nunca. La sonda mira lo que el SUSTRATO enseña, o sea lo que el jugador</sub>
- **DOS MEMORIAS DEL MISMO EDIFICIO, Y NINGUNA PUEDE MIRAR A LA OTRA.** <sub>línea 113</sub>
  <br><sub>Se publica lo que ESE asiento ha visto: su terreno recordado, el botín que haya encontrado, y al otro sólo si ahora mismo lo tiene a la vista. La regla es la de cripta —el terreno se recuerda, lo que se mueve no— y aquí</sub>
- **NO SE SALE CON LAS MANOS VACÍAS.** <sub>línea 237</sub>
  <br><sub>para ganar, la jugada óptima del ladrón sería quedarse quieto en la casilla de salida desde el turno uno, y el juego entero dejaría de existir. Hay que llevarse algo.</sub>

### `public/arcade/js/protohub/rules/snake.js`

- **ESTO FALTABA Y LO CAZÓ EL VERIFICADOR.** <sub>línea 43</sub>
  <br><sub>La primera versión colocaba la comida con `Math.random()`. La partida se jugaba bien, pero **no se podía volver a jugar**: al re-simularla para verificarla, la comida caía en otro sitio y la puntuación no cuadraba. Sin</sub>

### `public/arcade/js/protohub/rules/sokoban.js`

- **POR QUÉ ESTE JUEGO Y NO OTRO MÁS VISTOSO** <sub>línea 7</sub>
  <br><sub>Porque demuestra una ESTRUCTURA DE DECISIÓN que no estaba cubierta — planificación espacial con estados irreversibles— y porque cuesta doscientas líneas y cero arte. Un género no se demuestra con gráficos: se demuestra con</sub>
- **Y ES EL PRIMERO QUE PUBLICA `sustrato(p)` SIN ADAPTADOR** <sub>línea 15</sub>
  <br><sub>Los diecinueve anteriores publican su estado en cinco codificaciones distintas —FEN, matriz, lista plana, listas de {x,y}, manos— y `sustrato.js` las traduce. Éste no necesita traducción: dice directamente `{rejilla, piezas, zonas}`.</sub>
- **NIVELES FIJOS Y NO PROCEDURALES, A PROPÓSITO** <sub>línea 24</sub>
  <br><sub>Generar sokobans resolubles al azar es un problema difícil de verdad, y un nivel irresoluble arruinaría la medida sin avisar: el agente parecería malo cuando el que falló fue el generador. Ocho niveles clásicos, y la semilla</sub>
- **El sustrato NATIVO.** <sub>línea 137</sub>
  <br><sub>sustrato(p) { const celdas = new Array(p.ancho * p.alto).fill(0); for (const i of p.muros) celdas[i] = 1;          // 1 = muro</sub>
- **La notación clásica del sokoban, la de toda la vida.** <sub>línea 154</sub>
  <br><sub>la ha visto mil veces; una inventada por nosotros, ninguna. Igual que el ajedrez se cuenta en FEN y el go en la rejilla del GTP. simbolos: { caja: '$', caja_ok: '*', jugador: '@' },</sub>
- **LA PUERTA DE LENGUAJE, GRATIS.** <sub>línea 162</sub>
  <br><sub>No se escribe una descripción a medida: se le da el sustrato al dibujante compartido. Los diecinueve juegos anteriores necesitaron un caso especial cada uno en `descripcion.js` porque cada uno publicaba su estado a su</sub>
- **CRÉDITO PARCIAL, Y LO APRENDÍ SUSPENDIENDO.** <sub>línea 190</sub>
  <br><sub>La primera métrica era `puestas * 100 - pasos`. El calibrador la tumbó en la primera pasada: **«MÉTRICA CONSTANTE — no puntúa»**, todas las políticas exactamente −300. El motivo: si nadie resuelve</sub>
- **LA PRIMERA VERSIÓN OSCILABA, Y LO CAZÓ EL CALIBRADOR.** <sub>línea 232</sub>
  <br><sub>Era avariciosa sin memoria: iba hacia la caja más cercana mirando sólo el paso siguiente. En una rejilla eso hace ping-pong — medido, **tres estados distintos en trescientos pasos**. Y como todas las políticas acababan en</sub>
- **`legal_moves` NO ofrece movimientos imposibles, y eso es la mitad del** <sub>línea 354</sub>
  <br><sub>proyecto: una persona no puede pulsar un botón que no está, y un modelo no puede alucinar una jugada que no se le ofrece. Empujar contra un muro o contra otra caja no es «un movimiento que falla»: es un movimiento que no existe.</sub>

### `public/arcade/js/protohub/rules/unit.js`

- **TRES ARREGLOS QUE VIENEN DEL PYTHON, DICHOS EN VOZ ALTA** <sub>línea 20</sub>
  <br><sub>Los tres nacieron del mismo síntoma —**0% de victorias para todos los agentes**— y cada uno se comió una parte del problema. Un banco de pruebas donde nadie gana nunca no es difícil: está roto, y lo parece poco.</sub>
- **Y UNO QUE NO SE PORTA: EL BARAJADO DEL RECICLE** <sub>línea 31</sub>
  <br><sub>El Python recicla con `random.shuffle`, sin semilla. Allí da igual; aquí rompería la tesis entera —dos re-simulaciones de la misma partida barajarían distinto y el verificador rechazaría partidas legítimas—. Cada recicle usa un</sub>
- **MÉTRICA DEL BANCO, NO REGLA DE UNIT — Y ESTUVO MAL.** <sub>línea 187</sub>
  <br><sub>La primera versión puntuaba (manos rivales − la mía): denso, y coincide con el marcador clásico cuando ganas, porque tu mano vale 0. Parecía razonable. Medido sobre 300 semillas con tres</sub>
- **CÓMO SE DIBUJA UNA CARTA DE UNIT, DICHO POR UNIT.** <sub>línea 244</sub>
  <br><sub>La mesa sabía leer dos barajas: la francesa (`SHDC`) y la española (`OEPB`). Las de aquí son `G_SKIP`, `R_6`, `Y_8`… y no encajaban en ninguna, así que salían como un textito centrado</sub>
- **Jugaba lo contrario —la carta más cara primero, que suena a** <sub>línea 354</sub>
  <br><sub>«quítate de encima los 50 puntos»— y las 300 semillas dijeron que era la peor de las tres opciones probadas: 81 victorias contra 99 de ésta y 92 de jugar la primera legal. Guardar el comodín es guardar la</sub>

### `public/arcade/js/protohub/rules/xiangqi.js`

- **TABLAS POR FALTA DE PROGRESO.** <sub>línea 256</sub>
  <br><sub>Medido con `_topes.mjs`: la política de la casa NO TERMINA ni con un tope de cuatro mil decisiones, en ninguna semilla. No es que el tope sea corto — es que nada en las reglas cortaba una partida sin avances. El ajedrez de esta</sub>
- **Y NO ES LO MISMO QUE EL JAQUE PERPETUO.** <sub>línea 267</sub>
  <br><sub>perseguir o dar jaque eternamente hace PERDER a quien insiste, no da tablas. Eso sigue sin estar y sigue declarado en la ficha: esto sólo garantiza que la partida termine, no reproduce el reglamento de torneo.</sub>
- **Mismo arreglo que en `ajedrez.js`: aquí había un `Math.random()`** <sub>línea 332</sub>
  <br><sub>que hacía al rival de casa impredecible. Misma semilla, partida distinta — y entonces dos ejecuciones de la misma política no se pueden comparar. La elección sale del número de jugada.</sub>

## Las mesas y los visualizadores

### `public/arcade/js/arcade_core.js`

- **DESDE ALISA.SYSTEMS NO SE LLAMA AL HUB DE NADIE.** <sub>línea 25</sub>
  <br><sub>Esto ponía `http://127.0.0.1:8741` por defecto SIEMPRE, así que cualquiera que abriera el índice desde el dominio hacía una petición a una IP privada de su propia máquina y se llevaba un error en consola. Medido el 13-08-2026 mirando la</sub>

### `public/arcade/js/bestiario_visualizer.js`

- **IMAGEN PROPIA — LEER ANTES DE TOCAR EL SUELO** <sub>línea 8</sub>
  <br><sub>Este suelo era, literalmente, una Pokéball: media circunferencia roja, media blanca, línea central y círculo con otro dentro. Eso es *trade dress* y está protegido aunque el juego se llame de otra forma —</sub>

### `public/arcade/js/blackjack_visualizer.js`

- **SÓLO SE NOMBRA LO QUE `sustrato.js` PUBLICA, Y HOY ES SÓLO `player_hand`.** <sub>línea 4</sub>
  <br><sub>`sustratoDe()` (en `protohub/sustrato.js`) mira `st.mano ?? st.player_hand` para la zona `mano`, y NO tiene ninguna rama para `dealer_hand` — se comprobó leyendo el fichero entero, no adivinando. Con la semilla 7 la</sub>
- **DE INVITADO NO SE TRAE MUEBLE NI LUZ.** <sub>línea 37</sub>
  <br><sub>Estas tres cosas —cámara, mesa y foco— son de cuando este juego era dueño de su página. Dentro de la sala de bolsillo cada una estorba de su manera: la cámara le desharía el encuadre a la sala; el foco iluminaría el muro y los</sub>
- **Sin estos botones el juego era INJUGABLE para una persona:** <sub>línea 125</sub>
  <br><sub>no había forma de pedir carta ni de plantarse. La partida solo podía moverla un agente por el endpoint. --> <div id="bj-botones" style="display:flex; gap:8px; margin-top:14px;"></div></sub>

### `public/arcade/js/checkers_visualizer.js`

- **ESTA PÁGINA NO MONTABA EL HUD, Y NADIE LO HABÍA NOTADO.** <sub>línea 227</sub>
  <br><sub>Las otras cinco páginas de tablero llaman a `mountAgentHUD` y ésta no. Sin él no había ni panel de asientos —o sea que no se podía poner una política ni un modelo a jugar— ni caja para escribir una jugada. Sólo el ratón.</sub>
- **EL MANEJADOR SE CUELGA AQUÍ, DESPUÉS DE `start()`, Y NO EN `onInit3D`.** <sub>línea 252</sub>
  <br><sub>Estaba dentro de `onInit3D`, colgado del `renderer.domElement` de ESE momento. Medido el 13-08-2026: tocando la casilla exacta —la misma cuenta con la que se construye el tablero, y a altura cero, que es donde el manejador corta el rayo—</sub>

### `public/arcade/js/chess_visualizer.js`

- **EL TABLERO NO CABÍA EN UN MÓVIL: 26 DE LAS 64 CASILLAS FUERA DE LA PANTALLA.** <sub>línea 22</sub>
  <br><sub>La cámara estaba clavada en `(0, 8, 10)`, y eso sirve con una ventana ancha y falla con una estrecha: en Three el campo de visión que se declara es el VERTICAL y el horizontal sale de multiplicarlo por el aspecto. Con 1280x800 (aspecto 1,6) sobra sitio; con</sub>
- **SE MIDE Y SE AJUSTA, NO SE CALCULA CON UN NÚMERO A OJO.** <sub>línea 56</sub>
  <br><sub>Mi primera versión resolvía la distancia con la fórmula del campo de visión y una constante de ancho. Y fallaba: con la constante en 9,2 quedaban cuatro casillas fuera, la subí a 11 y quedaron LAS MISMAS CUATRO. La cámara acababa en (0, 12.5, 15.6), que no</sub>
- **DE INVITADO NO SE TOCA LA CÁMARA NI SE MONTAN CONTROLES.** <sub>línea 102</sub>
  <br><sub>En la sala de bolsillo este visualizador dibuja DENTRO de la mesa de otro: la cámara es la suya, encuadrada sobre su mesa, y sus controles ya están escuchando la rueda. `encuadrar` la mandaría a doce metros de altura para</sub>
- **ESTE TOPE SE COMÍA EL ENCUADRE, Y ERA LA CAUSA DE LAS CUATRO CASILLAS.** <sub>línea 126</sub>
  <br><sub>Estaba clavado en 20. Y la distancia que necesita el encuadre en una pantalla de 390 px es exactamente `hypot(12.5, 15.6) = 20.0`: los controles traían la cámara de vuelta justo donde mi bucle la ponía, así que subir la constante de ancho de</sub>
- **AQUÍ LA LUZ PRINCIPAL ERA VIOLETA A 2.5, Y SE COMÍA EL JUEGO.** <sub>línea 144</sub>
  <br><sub>Mirando la captura dije «las piezas son cilindros y cajas genéricas». Era FALSO, y preguntándoselo al navegador salió lo contrario: las 32 piezas son Staunton de verdad —28 torneadas con `LatheGeometry` y 4 caballos</sub>
- **DE INVITADO NO SE ENCIENDE NADA.** <sub>línea 169</sub>
  <br><sub>Estas cuatro luces están pensadas para una escena vacía donde lo único que hay es un tablero. Dentro de la sala de bolsillo iluminan TODO —la mesa, el muro, el suelo, los taburetes— y además a una escala que no es la suya: el</sub>
- **LA CASILLA CLARA ERA CASI LA PIEZA BLANCA. `0xe8e5e0` CONTRA `0xf0f0f0`.** <sub>línea 245</sub>
  <br><sub>Dieciséis puntos sobre 255. Se ven porque las luces de esta escena son fuertes y las piezas llevan sombra propia, o sea que la SILUETA la está haciendo la iluminación y no el color. Eso funciona hasta que alguien toca una luz.</sub>
- **DÓNDE CAE CADA CASILLA, PUBLICADO — EL MISMO CONTRATO QUE `pintar3d`.** <sub>línea 275</sub>
  <br><sub>Una pieza se puede comprobar desde fuera porque su malla lleva nombre. Una casilla no tenía nada equivalente, y sin eso «¿se puede jugar tocando el tablero?» sólo se podía medir con una rejilla a ciegas, cuyo cero no distingue</sub>
- **EL NOMBRE ES EL MISMO CAMPO QUE YA LEE `deFen()` EN `sustrato.js`.** <sub>línea 715</sub>
  <br><sub>`t` es la letra del FEN en minúscula (`p r n b q k`) y `de` es 0/1 según mayúscula/minúscula — literalmente `ch.toLowerCase()` y `ch===ch.toUpperCase()?0:1`, la misma cuenta que hace `deFen`. No se</sub>
- **EL CABALLO NO ES UNA CAJA: ERA SU GIRO, NO SU MOLDE.** <sub>línea 740</sub>
  <br><sub>Medido con capturas (no supuesto): el caballo es un `ExtrudeGeometry` con el perfil del caballo en el plano XY y solo 0.24 de profundidad en Z. Ese perfil se lee perfecto — pero el código lo giraba 90° "para mirar al</sub>
- **AQUÍ HUBO DOS `console.log` DE DEPURACIÓN Y SIRVIERON PARA ALGO — Y SE QUITAN IGUAL.** <sub>línea 843</sub>
  <br><sub>Los puso Motoko para partir el problema en dos mitades, y con ellos se demostró que este manejador SÍ se ejecuta: `alPulsar` y `alSoltar` disparaban con las mismas coordenadas, o sea que el evento llegaba y la guarda de arrastre no lo descartaba. Eso</sub>
- **EL PUNTO DEL RAYO VIENE EN COORDENADAS DEL MUNDO, Y `casillaDesde3D`** <sub>línea 873</sub>
  <br><sub>CUENTA EN LAS DEL TABLERO.</sub>
- **EL ORDEN IMPORTA: `engine.renderer` NO EXISTE hasta que `start()` ejecuta** <sub>línea 920</sub>
  <br><sub>`init3D()`. Enganchar los escuchadores antes reventaba con "Cannot read properties of null (reading 'domElement')" — y como eso ocurría ANTES de `engine.start()`, el motor no llegaba a arrancar: la página se</sub>

### `public/arcade/js/encuadre.js`

- **ESTO YA ESTABA RESUELTO, PERO SÓLO PARA QUINCE JUEGOS.** <sub>línea 5</sub>
  <br><sub>`mesa_tablero.mjs` aprendió a apartar la cámara hasta que el tablero cabe en vez de ponerla a una distancia fija. Funcionó, y no lo tocaba nada más: los visualizadores propios —fagocito, mancala, go, xiangqi y compañía— siguen</sub>
- **NO SE CALCULA LA DISTANCIA: SE COMPRUEBA.** <sub>línea 25</sub>
  <br><sub>Una ventana apaisada y otra estrecha no admiten la misma, y un sokoban de 5x3 no encuadra como un go de 19x19 aunque los dos se normalicen. Se proyectan las ocho esquinas de la caja a la pantalla y, si alguna se sale, se aparta la</sub>
- **Se mide con las matrices de instancia A MANO, porque `Box3.setFromObject`** <sub>línea 37</sub>
  <br><sub>NO las mira en el three que servimos: devuelve la caja de la geometría base. Eso escaló un ajedrez ocho veces de más. Copiado tal cual de la mesa, que es donde se aprendió.</sub>
- **`null` NO ES UN FALLO SILENCIOSO: un grupo sin tamaño no es pequeño, es** <sub>línea 73</sub>
  <br><sub>que todavía no está. Escalarlo daría una escala de 2550 y una mesa vacía con las jugadas perfectamente listadas al lado — pasó con cripta, y no llamó la atención porque una mesa vacía se ve igual que una mesa vacía.</sub>
- **EL SITIO LIBRE NO ES TODA LA PANTALLA: EL PANEL OCUPA UN TROZO.** <sub>línea 112</sub>
  <br><sub>Medido el 15-08-2026 en los treinta y cinco, proyectando cada pieza y mirando si su punto cae dentro del rectángulo del HUD: de treinta medidas sólo UNA sale mal —xiangqi en móvil, once de treinta y dos piezas debajo</sub>
- **Y LO MISMO EN HORIZONTAL, QUE ES LO QUE LE FALTABA A ESTO PARA SNAKE.** <sub>línea 140</sub>
  <br><sub>`margenY` ya encoge el hueco vertical para que el bucle de abajo ALEJE la cámara cuando hace falta más aire arriba. `margenX` no existía: el eje x se comprobaba siempre contra `margen` a secas, así que el bucle</sub>
- **Y ADEMÁS SE BAJA, QUE SI NO SÓLO ENCOGE.** <sub>línea 184</sub>
  <br><sub>Exigir más aire arriba aparta la cámara hasta que el tablero cabe bajo el panel, pero el tablero sigue CENTRADO en la pantalla: queda pequeño y con un hueco muerto abajo. Encoger de más es pagar dos veces por el mismo</sub>
- **Y EL DESPLAZAMIENTO TIENE QUE IR TAMBIÉN AL `target` DE LOS CONTROLES.** <sub>línea 200</sub>
  <br><sub>La primera versión movía la cámara y su punto de mira, y no pasaba NADA: medido, la pieza más alta se quedaba en 333 px sin el arreglo y en 335 con él. Dos píxeles.</sub>
- **Y LO MISMO POR EL LADO, QUE EN ESCRITORIO ES DONDE ESTÁ EL PANEL.** <sub>línea 222</sub>
  <br><sub>`arribaLibre` nació de un caso de MÓVIL, donde el panel ocupa el ancho entero y tapa por arriba. En escritorio el panel es una columna a la izquierda, y ahí el que se come el tablero es el lado.</sub>
- **LA CÁMARA VA A LA IZQUIERDA PARA QUE LA IMAGEN SE VAYA A LA DERECHA.** <sub>línea 243</sub>
  <br><sub>El signo estaba al revés y el síntoma era peor que no hacer nada: pedía destapar 183 px y el tablero acababa con 426 tapados. Cuanto más «arreglaba», peor — que es la firma de un signo invertido.</sub>
- **Y AL CAMBIAR DE TAMAÑO LA VENTANA, OTRA VEZ.** <sub>línea 272</sub>
  <br><sub>El aviso vino de una ventana baja, pero girar un móvil hace lo mismo y es más común. Quien encaja una vez al arrancar deja de caber en cuanto alguien toca el borde — y eso no lo ve nadie probando en su propia pantalla.</sub>
- **Y CUANDO EL PANEL CAMBIA DE TAMAÑO, TAMBIÉN.** <sub>línea 293</sub>
  <br><sub>El panel no mide siempre lo mismo: se pliega con su `▾`, se esconde entero con el botón de los mandos, y arranca desplegado o plegado según el juego y el ancho de la pantalla. Encuadrar UNA VEZ al arrancar es medir una foto de un</sub>

### `public/arcade/js/Entrada.js`

- **CUÁNDO ENGANCHARLO** <sub>línea 23</sub>
  <br><sub>`engine.renderer` NO existe hasta que `start()` ejecuta `init3D()`. Estas funciones se llaman DESPUÉS de `engine.start()`, o dentro del gancho `onInit3D`. Enganchar antes revienta con «Cannot read properties of null» —</sub>
- **VIVE AQUÍ, SUELTA Y CON NOMBRE, PORQUE ESTABA EN DOS SITIOS Y FALTABA EN LOS DOS.** <sub>línea 157</sub>
  <br><sub>La primera versión de esta comprobación la escribí dentro de `teclasDireccion`, y `peaton_visualizer.js` —que tiene su propio manejador copiado— necesitaba otra igual. Dos copias de la misma regla es exactamente cómo el fallo llegó a estar en</sub>
- **SI ESTÁS ESCRIBIENDO, LAS TECLAS SON LETRAS Y NO JUGADAS.** <sub>línea 214</sub>
  <br><sub>Esto escuchaba en `window` sin mirar dónde estaba el foco, y el mapa incluye `w a s d`, sus mayúsculas y **el espacio**, con `preventDefault()`. Así que al escribir en cualquier campo de texto de la página pasaban las dos cosas a la</sub>
- **MEDIDO EN SNAKE, ESCRIBIENDO UNA FRASE DE VERDAD EN EL BUZÓN:** <sub>línea 225</sub>
  <br><sub>quería escribir  «las casas se ven raras y no se donde estoy» salió            «lcevenrrynoeoneetoy» letras perdidas  23</sub>
- **Y CÓMO SE ENCONTRÓ, QUE ES LO INTERESANTE: LA SOSPECHA ERA FALSA.** <sub>línea 236</sub>
  <br><sub>Salió de repetir el aviso de un betatester en FAGOCITO —«no se ve el tablero completo y parece que es difícil escribir los mensajes»— cuyo recibo son 25 pasos abajo seguidos y 7 a la derecha. Pensé: no estaba jugando, estaba</sub>

### `public/arcade/js/fagocito_visualizer.js`

- **IMAGEN PROPIA — LEER ANTES DE TOCAR LOS COLORES** <sub>línea 3</sub>
  <br><sub>Este visualizador heredaba la identidad visual de otro juego: el jugador era el círculo AMARILLO icónico (0xFFFF00), el laberinto AZUL (0x0000BB) y los perseguidores llevaban su paleta exacta, con los nombres de los personajes</sub>

### `public/arcade/js/go_visualizer.js`

- **EL RATÓN. Hasta hoy este tablero no se podía tocar: se dibujaba y** <sub>línea 22</sub>
  <br><sub>ya está. La única forma de jugar al go aquí era escribir `a19` en una caja de texto. El enganche vive en `raton_tablero.js` porque a reversi, mancala y xiangqi les faltaba EXACTAMENTE lo mismo, y cuatro</sub>
- **ESTA LÍNEA MOVÍA EL MUNDO.** <sub>línea 50</sub>
  <br><sub>Estaba escrita así, encadenada:</sub>
- **`MeshPhysicalMaterial`, NO `MeshStandardMaterial`.** <sub>línea 92</sub>
  <br><sub>`clearcoat` y `clearcoatRoughness` —el brillo de concha que promete el comentario original— **no existen en `MeshStandardMaterial`**. Three lo avisaba por consola dos veces por piedra (186 avisos en una partida de dos jugadas) y</sub>
- **GEOMETRÍA Y MATERIALES UNA VEZ, NO UNO POR PIEDRA.** <sub>línea 160</sub>
  <br><sub>`spawnStone` creaba una `SphereGeometry(0.38, 32, 16)` y un material NUEVOS en cada piedra — y `syncGoState` vacía y repuebla el tablero en cada refresco, o sea varias veces por segundo. En una partida avanzada eso son cientos de</sub>
- **ESTA FUNCIÓN LEÍA EL TABLERO DE DOS FORMAS DISTINTAS, Y SÓLO UNA IBA.** <sub>línea 222</sub>
  <br><sub>Arriba, para el minimapa, hace `const b = state.board`. Aquí abajo, para el 3D, preguntaba `Array.isArray(state)` — y `state` es `{ board: [...] }`, un envoltorio, no el array. O sea que la condición era SIEMPRE falsa y el</sub>
- **Aquí había `SZ = 1.0, OFFX = -8.5` — constantes INVENTADAS.** <sub>línea 285</sub>
  <br><sub>verdad son las que usa este mismo fichero para colocar las piedras (`x * SPACING - HALF_BOARD`, con SPACING 0.8). Con las inventadas cada clic caía en una intersección que no era, así que no coincidía con</sub>

### `public/arcade/js/mancala_visualizer.js`

- **EL TABLERO SE SALÍA DE LA PANTALLA EN UN MÓVIL, Y EN ESCRITORIO ESTABA PERFECTO.** <sub>línea 21</sub>
  <br><sub>La cámara estaba clavada en `(0, 8, 5)`, y eso funciona con una ventana ancha y falla con una estrecha. En Three el campo de visión que se declara es el VERTICAL; el horizontal sale de multiplicarlo por el aspecto. En escritorio (1280x800, aspecto</sub>
- **DE INVITADO LA CÁMARA Y LA LUZ SON DE LA SALA.** <sub>línea 66</sub>
  <br><sub>Es el mismo trato que ya tiene `chess_visualizer.js` y por el mismo motivo: dentro de la sala de bolsillo esto dibuja sobre la mesa de otro. `encuadrar` mandaría la cámara a la altura que hace falta para ver un tablero de dos</sub>
- **MANCALA ES EL RARO, Y POR ESO ENCAJA IGUAL.** <sub>línea 76</sub>
  <br><sub>Sus jugadas no son coordenadas sino el ÍNDICE del hoyo: `0`…`5`. Aun así entra en el mismo módulo — una rejilla de 6 por 1— sin más que decirle cómo se llama una casilla. Que el caso raro no necesite código</sub>
- **DÓNDE CAE CADA HOYO, PUBLICADO — EL MISMO CONTRATO QUE `pintar3d`.** <sub>línea 171</sub>
  <br><sub>Los hoyos de este tablero son AGUJEROS en una forma extruida, no mallas: no hay nada a lo que ponerle nombre ni nada que proyectar. Por eso mancala salía «a ciegas» en `tacto` —trescientos veinte toques repartidos por la pantalla— y su</sub>

### `public/arcade/js/mandos.js`

- **POR QUÉ NO VAN DENTRO DEL PANEL.** <sub>línea 10</sub>
  <br><sub>Porque uno de los dos sirve para HACER DESAPARECER el panel. Un botón que se esconde a sí mismo deja al jugador sin forma de volver, y en un móvil sin teclado eso es un callejón sin salida: recargar. Van fuera y se quedan, que es</sub>
- **Y POR QUÉ AQUÍ Y NO EN CADA MOTOR.** <sub>línea 17</sub>
  <br><sub>Hay dos motores —tableros y cartas— y treinta y cinco páginas. Escribirlo en los dos es tener dos copias que se separan, que es literalmente el fallo que este proyecto ha pagado seis veces. Es la misma decisión que con `gestos.js` y</sub>
- **EL PLEGADO QUE YA HABÍA NO SE TOCA.** <sub>línea 25</sub>
  <br><sub>El panel tiene su `▾` de siempre, que lo encoge dejando las jugadas a la vista —pensado para jugar con el panel pequeño—. Esto es otra cosa: quitarlo de en medio del todo para ver la mesa. Son dos necesidades distintas y las dos son</sub>
- **Se traga a propósito y se dice por consola: iOS en Safari no deja** <sub>línea 51</sub>
  <br><sub>pantalla completa en el documento, y ahí el navegador RECHAZA la promesa. Sin este catch, un error sin gestionar en cada toque. console.warn('[mandos] pantalla completa no disponible:', err?.message ?? err);</sub>
- **COMPARTIR LA PARTIDA — Y ESTE ES EL BOTÓN QUE LE DA SENTIDO AL RESTO.** <sub>línea 107</sub>
  <br><sub>La tesis del proyecto es que cualquiera puede verificar una partida volviéndola a jugar, y el repetidor ya lo hace en las treinta y cinco mesas. Pero un enlace que hay que FABRICAR A MANO no lo fabrica nadie:</sub>
- **NO ES PARANOIA: LOS DOS MOTORES MONTAN SU HUD EN MOMENTOS DISTINTOS.** <sub>línea 195</sub>
  <br><sub>Los visualizadores clásicos lo montan al cargarse; la mesa genérica es un módulo y lo construye después. Montar esto antes que el panel dejaría el botón de esconder buscando un elemento que todavía no está — y no fallaría,</sub>

### `public/arcade/js/mesa_cartas.mjs`

- **LEE EL SUSTRATO, NO LOS CAMPOS DEL JUEGO.** <sub>línea 9</sub>
  <br><sub>`poker_visualizer.js` hace esto:</sub>
- **Y LO OCULTO SE PINTA, QUE NO ES LO MISMO QUE OMITIRLO.** <sub>línea 32</sub>
  <br><sub>Si las cartas tapadas del rival no salieran, el cuadro diría que no tiene nada. Eso no es una omisión, es una mentira — y ya la cometimos una vez: el adaptador perdía la mano tapada del póker y el dibujo afirmaba que el</sub>
- **AGRUPAR LA MANO A MANO — Y POR QUÉ NO ES UNA JUGADA** <sub>línea 43</sub>
  <br><sub>Lo pidió Oscar: «deberías poder modificar cómo agrupas las cartas». El motor elige la partición ÓPTIMA de tu mano y ésa no siempre es la que dirías tú — con diez seguidas te las cuenta como 3+3+4 y no como una escalera de diez. Eso no cambia el</sub>
- **Y SE HACE COMO VISTA, NO COMO JUGADA.** <sub>línea 51</sub>
  <br><sub>Lo natural sería `agrupar:S_A:2` en `legal_moves`. Sería un error: son jugadas que NO cambian el estado, y este banco compara personas con agentes por el tamaño y la forma de esa lista. Meter movimientos decorativos multiplicaría el espacio de</sub>
- **EN UN TELÉFONO LA MESA ES ALTA Y ESTRECHA, Y EL REPARTO ANCHO NO CABE.** <sub>línea 129</sub>
  <br><sub>En horizontal el mazo y el descarte van a los lados (x ±6,5), que es donde sobra sitio y donde se ve de un vistazo que no son de nadie. En un móvil en vertical eso obliga a alejar la cámara hasta que las cartas son ilegibles: lo</sub>
- **Y DEPENDE DE SI HAY ALGUIEN SENTADO A LOS LADOS.** <sub>línea 141</sub>
  <br><sub>Las zonas de nadie —mazo, descarte, baza— se separaban 11 en horizontal, o sea a x ±5,5. Eso era libre en entropy, que se juega entre DOS: los lados estaban vacíos. La brisca se juega entre cuatro, y sus asientos laterales ocupan de 5,69</sub>
- **ESTABA ESCRITO A MANO COMO `'classic_red'` EN TRES SITIOS.** <sub>línea 159</sub>
  <br><sub>Y el sistema entero para hacerlo bien lleva meses puesto:</sub>
- **Y LA BARAJA SE DEDUCE DE LAS CARTAS, NO DE UNA TABLA DE NOMBRES.** <sub>línea 176</sub>
  <br><sub>El catálogo llama a los juegos por su nombre largo —`texas_holdem`, `war`, `go_fish`— y las páginas por el corto —`poker`, `guerra`, `gofish`—. Medido: coinciden SIETE de once. Escribir los cuatro alias que faltan sería la enésima</sub>
- **EL TIPO DE REVERSO VIAJA EN EL ID, Y ESO NO SE VE VENIENDO.** <sub>línea 226</sub>
  <br><sub>Averigüé la baraja, la guardé en `activeDeckBack`… y las cartas siguieron saliendo rojas. `SovereignCardEngine` no mira esa variable para el dorso: lee el propio id de la carta —`back_spanish_gold`— y con `'back'` a secas cae en el rojo por</sub>
- **Y EL ESTADO NO DECLARA LA BARAJA: `data.baraja` viene vacío en los cinco juegos** <sub>línea 256</sub>
  <br><sub>medidos. Así que hay que adivinarla, y ahí está el cuidado: las letras SÍ chocan. `C` es tréboles en la francesa, copas en el tarot y cian en la nuestra. Por eso el respaldo mira sólo las dos barajas de las que sale un triunfo en lo que tenemos</sub>
- **ÉSTE ES EL SITIO DONDE ESTA MESA EMPIEZA A DECIR LA VERDAD.** <sub>línea 287</sub>
  <br><sub>`drawZone()` (`SovereignCardEngine.js`) nunca pone `mesh.name` — sólo `userData.zona`, que un humano no lee y `prueba_vistas.mjs` no busca (busca el prefijo `p:` o `z<n>:v`, el mismo idioma que habla el pintor genérico).</sub>
- **Y SÓLO SE NOMBRA PIEZA LO QUE SE VE — LO TAPADO ES OTRA COSA, NO NADA.** <sub>línea 304</sub>
  <br><sub>Una carta boca abajo del rival es un objeto real —hay que dibujarla, o la mesa mentiría diciendo que no tiene nada (ver la cabecera del fichero)— pero no es información: nombrarla como pieza haría que el sustrato, que sólo</sub>
- **EL GROSOR ES EL DATO.** <sub>línea 327</sub>
- **Y EL GROSOR ES LA `depth`, NO LA `height`.** <sub>línea 329</sub>
  <br><sub>escalar el eje Y «porque la carta está tumbada», y salieron COLUMNAS ROJAS cruzando la pantalla entera: la carta es `BoxGeometry(1.2, 1.8, 0.05)`, así que su Y es el LARGO —1,8— y estirarlo por trece da una torre de veintitrés</sub>
- **AQUÍ SÓLO SE ENGORDA.** <sub>línea 349</sub>
  <br><sub>Esto además SUBÍA la carta —`position.y = __y0 + medio grosor por carta`— para que la pila no quedara medio hundida. Y el motor escribe esa misma coordenada con un tween, sesenta veces por segundo, llevándola a su sitio.</sub>
- **Y AQUÍ FALTABA EL `else`, QUE ES EL GLITCH QUE VIO OSCAR.** <sub>línea 369</sub>
  <br><sub>Las mallas se REUTILIZAN por `trackId`. Engordar una y no devolverla nunca a su tamaño deja el grosor puesto para siempre: cuando el mazo baja de dos cartas a una, o cuando esa misma malla se recicla para una carta destapada</sub>
- **Y LA BAZA EN CURSO, POR LO MISMO — MEDIDO CON `bajo_el_panel.mjs`.** <sub>línea 405</sub>
  <br><sub>`baza` tiene `de: null` (`sustrato.js`), así que sin esta entrada caía en el mismo cubo `'mesa'` que `mazo`: el reparto de `onStateSync` los separa a los lados del centro (uno a +2,5, el otro a -2,5 en mundo, con cuatro jugadores),</sub>
- **Y NO SE ARREGLA PANEANDO LA CÁMARA, QUE FUE EL PRIMER INTENTO.** <sub>línea 414</sub>
  <br><sub>`apartarDescarteDelPanel()` sabe alejar y panear para sacar el `mazo` o el `descarte` de debajo del panel, y parecía el sitio natural para sumar `baza` a la misma caja. Medido con captura y con `bajo_el_panel.mjs` repetido: el</sub>
- **CUÁNTAS CARTAS CABEN EN FILA.** <sub>línea 454</sub>
  <br><sub>El mazo de entropy tiene 79 cartas. En fila ocupaban 71 unidades sobre un fieltro de 20: cruzaban la mesa entera y se salían de la pantalla por los dos lados. No era un fallo del dato —el mazo tiene 79— sino de creer que toda zona</sub>
- **EN VERTICAL SE MIRA CASI DESDE ARRIBA, y no es un capricho de estilo.** <sub>línea 470</sub>
  <br><sub>La mesa mide unas 5 unidades de ancho por 11 de fondo. En una vista tumbada, la profundidad se aplasta por la perspectiva y las cartas del rival quedan diminutas mientras sobra pantalla a los lados. Mirando desde arriba, «fondo»</sub>
- **DE INVITADO NO SE TOCA LA CÁMARA NI SE AMUEBLA NADA.** <sub>línea 483</sub>
  <br><sub>Cuando esta mesa vive dentro de otra sala, la cámara es de la sala y el sitio ya existe. Mover su cámara sería arrancarle el punto de vista al anfitrión en mitad de su propia escena, y amueblar sería meter un segundo</sub>
- **Y SE GUARDA TAMBIÉN EL OBJETIVO Y EL EJE, NO SÓLO EL TECHO — VER** <sub>línea 525</sub>
  <br><sub>`apartarDescarteDelPanel` PARA EL PORQUÉ.</sub>
- **Y ACERCARSE HASTA QUE LO REPARTIDO LLENE LA PANTALLA.** <sub>línea 545</sub>
  <br><sub>Las posiciones de arriba se calibraron mirando ENTROPY, que extiende una rejilla de ocho por jugador. La brisca reparte tres cartas a cada uno: ocupa 16 unidades de ancho donde esa cámara encuadra 30, o sea que la mitad de la pantalla era</sub>
- **Y NO PUEDE SER UN TRINQUETE, QUE ES COMO LO ESCRIBÍ LA PRIMERA VEZ.** <sub>línea 563</sub>
  <br><sub>El tope era «nunca más lejos de donde estás», leyendo la distancia actual en cada pasada. Eso encoge y no vuelve: en cuanto se acercaba una vez, ese pasaba a ser el techo. Con un reparto que CRECE —el remigio roba y pasa de 10 cartas a</sub>
- **EL OBJETIVO Y EL EJE SALEN DE `encuadrar()`, NUNCA DE LA CÁMARA EN VIVO.** <sub>línea 586</sub>
  <br><sub>Antes se leían de `motor.controls.target` y `motor.camera.position` tal como estuvieran. Con `apartarDescarteDelPanel()` moviendo los dos al final de esta misma función, leerlos aquí habría vuelto a sumar el</sub>
- **Y TU MANO TIENE QUE PODER LEERSE.** <sub>línea 634</sub>
  <br><sub>Lo de arriba encuadra TODO: las cuatro manos, el mazo y el descarte. En un tute son cuarenta cartas, así que la caja es enorme, la cámara se va lejos y TU mano acaba midiendo cincuenta píxeles por carta. En un juego donde servir</sub>
- **NO TODAS LAS CARTAS VALEN IGUAL, Y ESO ES LO QUE ARREGLA ESTO.** <sub>línea 649</sub>
  <br><sub>Las manos de los rivales están BOCA ABAJO: de ellas sólo hace falta saber cuántas hay, y eso se lee igual con el borde cortado. La tuya hay que leerla carta por carta. Encuadrarlas con el mismo peso es tratar como igual</sub>
- **TU MANO TIENE QUE PODER LEERSE.** <sub>línea 661</sub>
  <br><sub>Lo de arriba encuadra TODO: las cuatro manos, el mazo y el descarte. En un tute son cuarenta cartas, así que la caja es enorme, la cámara se va lejos y cada carta TUYA acaba midiendo 46 px de ancho. En un juego donde servir al</sub>
- **Y NO ES EL ABANICO, QUE FUE MI SEGUNDA CORAZONADA.** <sub>línea 674</sub>
  <br><sub>Con `paso: 6` para diez cartas quedan 0,67 de separación y la carta mide 0,62: casi no se solapan. Estaba mirando una captura y viendo «solapadas» donde lo que había era «pequeñas». Se distingue midiendo, no mirando.</sub>
- **Y LA PRIMERA VEZ PUSE EL MÍNIMO EN 0,42 CUANDO YA ESTABA EN 0,41.** <sub>línea 680</sub>
  <br><sub>O sea que el bloque corregía un 2% y yo esperando ver algo. El número no salía de ninguna medida: lo escribí a ojo. 0,72 sí sale de una: para que una carta llegue a ~90 px con diez en la mano, la mano tiene que ocupar el 72%</sub>
- **EL OBJETIVO ES QUE CADA CARTA SE LEA, NO QUE LA MANO LLENE UN PORCENTAJE.** <sub>línea 716</sub>
  <br><sub>Aquí había un `MINIMO = 0.80` fijo: si tu mano ocupaba menos del 80% del semiancho, la cámara se acercaba hasta que lo ocupara. Con trece cartas está bien. Con TRES —que es la brisca— es absurdo: tres cartas llenando el 80% de la</sub>
- **Y NO ES EL CAMBIO DE ABANICOS A PILAS, QUE ERA LA SOSPECHA DE LOS DOS.** <sub>línea 734</sub>
  <br><sub>Antes de llegar aquí busqué el fallo en el grosor de las pilas y encontré un hueco real —una malla engordada no volvía nunca a su tamaño— pero el sabotaje demostró que ESE no era el que se veía. Dos fallos en la misma zona y sólo uno</sub>
- **Y UN MÁXIMO, QUE ES LO QUE ME FALTABA.** <sub>línea 752</sub>
  <br><sub>Esto sólo sabía ACERCARSE cuando la mano salía pequeña. Con trece cartas en un móvil pasa lo contrario: el abanico es más ancho que la pantalla y las de los extremos se salen. Medido con `legibilidad.mjs` en vertical —</sub>
- **El `target` se actualiza aquí y sólo aquí, con el valor final de** <sub>línea 779</sub>
  <br><sub>ESTA vuelta — nunca se lee de vuelta en la siguiente (ver el aviso de `encuadrar()`), así que no hay desplazamiento que se pueda acumular. if (motor.controls) motor.controls.target.copy(mira);</sub>
- **Y HAY QUE VOLVER A LLAMAR A `acercar()` CUANDO LA CARTA YA HA ATERRIZADO,** <sub>línea 792</sub>
  <br><sub>NO SÓLO CUANDO SE REPARTE — ESTO ES LO QUE VOLVÍA A TAPAR EL DESCARTE.</sub>
- **Y EL PLAZO NO SE ADIVINA A OJO, SE PREGUNTA.** <sub>línea 819</sub>
  <br><sub>Un `setTimeout` fijo sería otro número inventado como el `0,42` que ya costó una vez en `acercar()` — y si algún día un juego usara `sequenceDelay` para repartir en cascada, un plazo corto se quedaría corto. `TWEEN.getAll()` dice</sub>
- **EL DESCARTE NO PUEDE QUEDAR DEBAJO DEL PANEL.** <sub>línea 848</sub>
  <br><sub>Medido con `bajo_el_panel.mjs`: en escritorio el mazo y el descarte van a los lados (±5,5 en mundo, `sitios()` más arriba) y el panel es una columna a la izquierda. El que le toca estar a la izquierda —hoy, en entropy y en</sub>
- **DOS INTENTOS ANTERIORES SE REVIRTIERON POR ESTO, Y NO ERA UN SIGNO.** <sub>línea 856</sub>
  <br><sub>La idea de correr cámara y objetivo juntos era la buena — es lo que hace `encuadre.js` en el motor de tablero, y funciona ahí. Lo que rompía todo era DE DÓNDE leía `acercar()` su propio eje: de `motor.controls.target` y</sub>
- **Y EL PANEO SOLO NO BASTA: HAY QUE ALEJAR PRIMERO, COMO `margenX`.** <sub>línea 877</sub>
  <br><sub>Panear corre la imagen entera: el descarte se libra pero el mazo y tu mano —que en remigio ya llegan cerca del borde derecho, porque `acercar()` acerca la cámara hasta que tu mano ocupa el 72% de la pantalla— se corren</sub>
- **CONTRA EL PANEL, SIN DEDO DE MÁS — SÓLO EL MISMO SOLAPE QUE MIDE** <sub>línea 947</sub>
  <br><sub>`bajo_el_panel.mjs`.</sub>
- **Y EL ÁRBITRO DE VERDAD: CONTAR IGUAL QUE `bajo_el_panel.mjs`, NO CON** <sub>línea 962</sub>
  <br><sub>LAS CAJAS DE ARRIBA.</sub>
- **EL SUELO NO ES SIEMPRE CERO: SI YA INVADÍA EL BORDE ANTES DE TOCAR NADA,** <sub>línea 1006</sub>
  <br><sub>NO ES ESTA FUNCIÓN LA QUE LO CAUSÓ.</sub>
- **LÍMITE CONOCIDO DE ESTE VETO: CUENTA CUÁNTAS, NO CUÁLES.** <sub>línea 1017</sub>
  <br><sub>Compara TOTALES, así que da por bueno cualquier cambio que tape una pieza distinta mientras el número no suba. Y eso deja pasar el peor resultado posible: mover el problema de sitio y que parezca resuelto.</sub>
- **LA SUGERENCIA SÓLO MIRA LO QUE TÚ VES.** <sub>línea 1105</sub>
  <br><sub>Marca los huecos donde poner la carta robada anularía la columna. Se calcula con `casillas`, que trae `null` en lo tapado — así que es literalmente imposible que sugiera usando una carta que no has visto. Si mirara el estado</sub>
- **UNA MESA DONDE NO SE PUEDE JUGAR ES UN CUADRO.** <sub>línea 1182</sub>
  <br><sub>`SovereignCardEngine.updateHUD` sólo LISTA las jugadas legales como texto; los botones los ponía cada página por su cuenta. Así que una mesa nueva nacía preciosa y muda: se veía la partida avanzar y no había por dónde meter mano.</sub>
- **AQUÍ HABÍA UN `?? 'entropy'`, Y SE COMIÓ SIETE JUEGOS SIN DAR UN ERROR.** <sub>línea 1220</sub>
  <br><sub>Esta mesa se carga como `<script type="module">` que se monta solo, así que recibe el juego por `window.ALISA_JUEGO`. `entropy.html` lo ponía a mano y `montarMesa` no —de modo que la brisca, el tute y los otros cinco abrían la</sub>
- **SI ALGUIEN HA PUESTO UNA SALA, SE JUEGA DENTRO DE ELLA.** <sub>línea 1243</sub>
  <br><sub>`window.ALISA_ANFITRION = { grupo, escena, camara }` — lo pone la página que hospeda, antes de cargar este visualizador. Sin eso, esta mesa monta su propia escena como siempre y nadie nota la diferencia.</sub>
- **DE INVITADO NO SE CONSTRUYE EL MUEBLE.** <sub>línea 1257</sub>
  <br><sub>La primera versión lo creaba y lo ponía `visible = false`, que parece lo mismo y no lo es: `Box3.setFromObject` mide TAMBIÉN lo invisible. El anfitrión encoge el grupo hasta que quepa en su mesa, así que un</sub>
- **EL ÓVALO SE HACE ESCALANDO LA MESA, NO SU GEOMETRÍA.** <sub>línea 1279</sub>
  <br><sub>«TAPETE HACE COSAS RARAS».</sub>
- **LA MESA ES LA MISMA QUE LA DE LA SALA DEL HUEVO.** <sub>línea 1307</sub>
  <br><sub>Aquí había un canto de madera hecho con un torus, con el comentario «cuesta ocho líneas y se nota entero». Se notaba, sí: Oscar lo reportó dos veces —en brisca y en entropy— con las mismas palabras, «el tapete se ve</sub>
- **LA TAPA VA POR DEBAJO DEL FIELTRO, NO A SU ALTURA.** <sub>línea 1336</sub>
  <br><sub>La puse a -0,15 y el fieltro ocupa de -0,4 a 0: la tapa quedaba DENTRO, y las dos superficies se peleaban píxel a píxel. En la captura salían unas cuñas verdes radiando desde el centro, como un abanico roto.</sub>
- **Y EN UN MÓVIL, TAPIZ A PANTALLA COMPLETA: NADA DE MESA.** <sub>línea 1356</sub>
  <br><sub>Una mesa ovalada es bonita porque se ve entera, y verla entera en un teléfono significa alejar la cámara hasta que las cartas no se leen. El canto de madera y el óvalo son entonces lo peor de los dos mundos:</sub>
- **LA MESA, DENTRO DE UN SITIO.** <sub>línea 1385</sub>
  <br><sub>Hasta ahora flotaba en negro. Una habitación no es adorno: da escala —sin paredes no sabes si la mesa mide un metro o diez— y da sombra, que es lo que hace que las cartas parezcan estar APOYADAS y no pegadas.</sub>
- **SE DIBUJA LO QUE EL JUEGO PUBLICA.** <sub>línea 1435</sub>
  <br><sub>Esto tenía dos caminos —en una sala, el estado del árbitro; en local, `reglas.sustrato(partida)`— y el segundo era una trampa armada: `ProtoHub.partida()` no devuelve la partida viva, devuelve el RECIBO</sub>
- **De paso desaparece `?asiento=`, que esta página anunciaba y NUNCA** <sub>línea 1453</sub>
  <br><sub>hizo nada: pasaba por la rama nativa, que en cartas no existe. Quien quiera mirar desde otra silla tiene la mesa compartida con `?quien=`, donde el recorte lo hace el árbitro y no una opción de la pantalla.</sub>
- **Y AQUÍ SE IGNORABA EL SUSTRATO NATIVO, QUE LLEVABA UN DÍA MINTIENDO.** <sub>línea 1459</sub>
  <br><sub>El comentario de arriba se escribió cuando era cierto que «ninguno de los diez juegos de cartas publica sustrato nativo». El remigio lo publica desde el mismo día, así que la premisa caducó sin que nada avisara — y</sub>
- **`enSala` se calcula AQUÍ y no se toma prestado.** <sub>línea 1486</sub>
  <br><sub>usaba el de `pintarJugadas`, que vive en otra función: `ReferenceError`, muere el repintado entero y con él los botones. El laboratorio lo cazó en cuatro mesas de cinco — y lo cazó por los BOTONES, no por el dibujo,</sub>
- **LA CARA DE LA CARTA LA ELIGE EL JUEGO, NO LA MESA.** <sub>línea 1500</sub>
  <br><sub>Con `cara: 'valor'` se dibuja el número y no el palo. Entropy lo pide porque ninguna de sus reglas mira el palo —se suman valores y se anulan dos iguales en la misma columna—, así que oros y copas sólo obligaban a</sub>
- **LA ZONA SE DIBUJA DE UNA VEZ, VISTAS Y TAPADAS JUNTAS.** <sub>línea 1573</sub>
  <br><sub>Antes eran dos llamadas y cada una centraba su abanico como si fuera la mano entera: las dos mitades salían superpuestas. El reparto sólo cuadra si se calcula sobre el total, así que las</sub>
- **UNA ZONA CON CASILLAS SE DIBUJA EN SU SITIO, CASILLA A CASILLA.** <sub>línea 1586</sub>
  <br><sub>La caja de entropy son ocho huecos en dos filas de cuatro —así es el juego del que viene, donde a esa disposición la llaman «la caja»— y las casillas son parte de las reglas: `cambiar:5` nombra</sub>
- **LO TAPADO SE DIBUJA UNA VEZ, CON GROSOR.** <sub>línea 1617</sub>
  <br><sub>Aquí se creaba UNA CARTA POR CADA REVERSO: `Array.from({length: z.ocultas})`. Y medido el 16-08, eso era casi toda la mesa — proporción de mallas que no son información:</sub>
- **Y NO SE QUITA DEL TODO: sigue habiendo un objeto.** <sub>línea 1637</sub>
  <br><sub>no dibujara nada donde hay trece cartas mentiría diciendo que ese rival no tiene mano — el error contrario, y peor.</sub>
- **UNA MANO NO SE APILA AUNQUE NO QUEPA: SE APRIETA.** <sub>línea 1656</sub>
  <br><sub>Aquí ponía `cartas.length > CABEN ? 'pile' : layout` a secas, y el razonamiento de arriba —un mazo es un montón porque no cabe, no porque se llame mazo— sigue siendo bueno. Pero mezclaba dos</sub>
- **EL TRIUNFO. LA PUERTA DEL LLM LO DECÍA Y LA PERSONA NO PODÍA VERLO.** <sub>línea 1720</sub>
  <br><sub>En brisca el triunfo va destapado DEBAJO DEL MAZO, y el mazo cae fuera de cuadro: la cámara prioriza que tu mano se lea. Así que quien juega no tenía forma de saber a qué palo manda — en un juego donde eso lo decide todo.</sub>
- **LO QUE YA TIENES LIGADO.** <sub>línea 1742</sub>
  <br><sub>El remigio publica en cada turno `grupos` —la mejor forma de partir tu mano en tríos y escaleras—, `sueltas` y `muerto`, los puntos que te sobran. Es la información con la que se juega: cuánto te falta para cerrar y qué estás</sub>
- **Y LO QUE EL JUEGO PUBLICA Y SÓLO LEÍA EL AGENTE.** <sub>línea 1783</sub>
  <br><sub>Misma regla que la mesa de tablero y que el describidor: ver la nota de `protohub/panel.js` sobre por qué esto se arregla una vez y no veintiocho. Se le dicen los campos que ESTA mesa ya pinta aparte —las zonas, la mano,</sub>
- **PLEGAR EL PANEL NO PUEDE ESCONDER LA FORMA DE JUGAR.** <sub>línea 1824</sub>
  <br><sub>Lo encontró un betatester y lo dijo así: «no me deja coger la carta del descarte». Estaba en un móvil de 276 px — lo sabemos porque el aviso trae el tamaño de pantalla, y por eso lo trae.</sub>
- **Y SE CREA UNA VEZ, NO EN CADA REPINTADO.** <sub>línea 1840</sub>
  <br><sub>el `innerHTML` y luego la MOVÍA fuera. Como esto corre cada vez que llega un estado, el `innerHTML` siguiente creaba otra —la anterior ya no estaba dentro, así que no se borraba— y se iban acumulando: medido en un móvil,</sub>
- **LA PISTA VA FUERA DEL PLEGADO, JUNTO A LOS BOTONES.** <sub>línea 1858</sub>
  <br><sub>Si un juego publica `pista` —una línea que explica qué toca— se enseña. Nace de la queja de un betatester: los botones dicen la jugada exacta que manda un agente (`descartar_y_voltear:1`), y esa igualdad es la que hace</sub>
- **UN MÓDULO NO DEJA NADA EN `window`, Y AQUÍ ESO SE NOTA.** <sub>línea 1904</sub>
  <br><sub>Los visualizadores viejos son scripts clásicos: su `engine` quedaba global y tanto la consola como el resto del arcade lo encontraban. Éste es un módulo y su `engine` no sale de aquí — así que la mesa se volvía imposible de mirar</sub>
- **JUGAR UNA CARTA DE TU MANO CLICÁNDOLA.** <sub>línea 1944</sub>
  <br><sub>Todo lo que había debajo era el vocabulario de ENTROPY —mazo, descarte, caja, comodín— y no había ninguna rama para `mano_0_*`. O sea que en brisca, tute, hearts, spades, gofish, unit y remigio pulsar tu propia carta no hacía nada.</sub>
- **Y LA TRADUCCIÓN NO SE INVENTA: SE BUSCA EN `legal_moves`.** <sub>línea 1957</sub>
  <br><sub>Cada familia nombra su jugada a su manera —unit dice `R_6`, brisca dice `jugar:C_3`— y una tabla de prefijos por juego sería la enésima lista escrita a mano de este proyecto. Así que se coge el ID de la carta pulsada y se busca</sub>

### `public/arcade/js/mesa_tablero.mjs`

- **POR QUÉ EXISTE, QUE ES LA SÉPTIMA VEZ QUE PASA LO MISMO** <sub>línea 9</sub>
  <br><sub>`crearPintor3d` lleva meses sabiendo dibujar rejilla, piezas Y montones —los tres a la vez— sin saber a qué se juega. Y sólo lo usaba `sala.html`, que a su vez no estaba enlazada desde ninguna parte. Resultado medido: ONCE juegos</sub>
- **Y POR QUÉ ES UN MÓDULO Y NO UN TROZO MÁS DE `sala.html`** <sub>línea 21</sub>
  <br><sub>Estas treinta líneas vivían sueltas dentro de esa página. En cuanto una segunda mesa las necesitara habría dos copias de la misma regla de oro —«no se manda nada que no esté en `legal_moves`»— con la posibilidad de que una se la saltara.</sub>
- **INVITADA O DUEÑA, COMO LA MESA DE CARTAS** <sub>línea 28</sub>
  <br><sub>Si alguien puso `window.ALISA_ANFITRION = { grupo, escena, camara }` —lo hace `sala.html`, y a través de ella la Sala del Huevo— dibuja DENTRO de esa escena y no toca la cámara: las piezas pasan a ser objetos de la sala, con sus sombras.</sub>
- **CUÁNTO MIDE UN TABLERO SUELTO.** <sub>línea 54</sub>
  <br><sub>De invitada manda el anfitrión, que la pone a escala de persona sobre una mesa de verdad. De dueña no hay mesa ni metros: la referencia es la pantalla, así que el tablero se normaliza a un tamaño fijo y la cámara se coloca para encuadrarlo.</sub>
- **CON MUROS HAY QUE MIRAR DESDE MÁS ARRIBA, Y NO ES CUESTIÓN DE GUSTO.** <sub>línea 67</sub>
  <br><sub>Es geometría: un muro de altura `h` tapa la celda que tiene detrás —a una unidad— salvo que la cámara mire desde un ángulo mayor que `atan(h / 1)`. Los muros miden 1.0 (`ALTO.muro` en el pintor), así que el mínimo son **45°**… y la inclinación de</sub>
- **Y LA MISMA INCLINACIÓN SIRVE PARA UN SEGUNDO MOTIVO: EL ESCORZO.** <sub>línea 89</sub>
  <br><sub>En un tablero grande, mirar de lado comprime el fondo. Medido en el go (19×19) proyectando la primera y la última fila y comparando su alto en pantalla:</sub>
- **`innerWidth` puede ser 0 —pestaña de fondo, ventana minimizada— y una** <sub>línea 123</sub>
  <br><sub>proporción NaN da pantalla negra SIN un solo error. Ya pasó. (innerWidth > 0 && innerHeight > 0) ? innerWidth / innerHeight : 16 / 9, 0.1, 400,</sub>
- **La caja de jugadas va FUERA de `#hud-content`, hermana suya.** <sub>línea 174</sub>
  <br><sub>panel deja `#hud-content` con `max-height: 0` y `overflow: hidden`, y en pantalla estrecha el panel arranca plegado: con los botones dentro, la mesa se ve entera y no hay forma de jugar. Lo encontró un betatester en un móvil</sub>
- **LAS NORMAS VARIABLES, QUE ESTABAN ENCHUFADAS AL MOTOR QUE NO LAS TIENE.** <sub>línea 189</sub>
  <br><sub>Aviso de un betatester en damas: «¿la reina dama sólo mueve de uno en uno?». Sí, y a propósito: `damaVuela` viene apagada, que es la regla inglesa. Lo que no había era forma de SABERLO ni de cambiarlo, y ahí sí tenía razón.</sub>
- **SI NO HAY NADA QUE MEDIR, NO SE ESCALA.** <sub>línea 218</sub>
  <br><sub>`Math.max(x, z, 0.001)` evita dividir por cero y produce algo peor que un error: una escala de 2550. Pasó con cripta cuando su sustrato llegaba vacío —la mesa salía sin nada y con las jugadas perfectamente listadas al lado—, y ese</sub>
- **EN LOS JUEGOS CON NIEBLA SE ENCUADRA LO QUE SABES, NO EL TABLERO ENTERO.** <sub>línea 251</sub>
  <br><sub>En cripta lo sin explorar es casi todo, así que encajar el tablero completo deja la partida en una esquina de tres centímetros mientras el 90% de la pantalla es lo que NO has visto. Relevo y sigilo, igual. Es la misma queja que las cartas de</sub>
- **CON UN SUELO, PORQUE AL EMPEZAR SÓLO SE CONOCE UNA CASILLA.** <sub>línea 263</sub>
  <br><sub>Sin él, la primera partida se abriría con una casilla ocupando la pantalla. Se limita a que lo conocido no pueda salir más de tres veces más grande de lo que saldría el tablero completo.</sub>
- **Y SÓLO SE APLICA SI HAY NIEBLA.** <sub>línea 269</sub>
  <br><sub>la misma rama de siempre, con la misma medida de siempre. Un cambio en el encuadre puede romper quince mesas a la vez, así que no se toca a quien no lo pide.</sub>
- **SIN TABLERO NO HAY SUPERFICIE, Y LA MESA SE VE COMO UN AGUJERO NEGRO** <sub>línea 279</sub>
  <br><sub>Los quince juegos de esta mesa tienen rejilla, y la rejilla ES la superficie: se dibuja, tiene color y las piezas se apoyan encima. El dominó no tiene, así que sus fichas salían flotando sobre el fondo negro de la página. El laboratorio lo dijo con</sub>
- **EL AMBIENTE: CIELO, SUELO Y NIEBLA, SI EL JUEGO LO PIDE.** <sub>línea 298</sub>
  <br><sub>Diez de los juegos de esta mesa tienen la misma cara —damero azul, cubitos marrones— porque el pintor dibuja sin saber a qué se juega. Eso es la tesis y también su techo. `atmosfera.js` levanta el techo sin tocar la tesis: pone material y aire alrededor,</sub>
- **`traverse` y no `children`: el pintor cuelga su raíz DENTRO de `grupo`, así** <sub>línea 341</sub>
  <br><sub>que la niebla es nieta y no hija. Con `children.some(...)` la condición era falsa siempre y todo este bloque no hacía nada — la tercera vez esta noche que doy por sabida una estructura en vez de preguntarla.</sub>
- **HAY NIEBLA QUE ES TERRENO POR EXPLORAR Y NIEBLA QUE ES EL TABLERO ENEMIGO.** <sub>línea 355</sub>
  <br><sub>Saltarse la niebla al encuadrar nació de cripta y sigilo, donde lo desconocido es un mapa entero que aún no has pisado: apartar la cámara hasta que quepa deja tu personaje en una esquina de tres centímetros. Ahí está bien.</sub>
- **UN PUÑADO DE OBJETOS SUELTOS NO SE NORMALIZA COMO UN TABLERO.** <sub>línea 384</sub>
  <br><sub>`LADO / mayor` infla lo que haya hasta que ocupe diez unidades, y para un tablero es lo correcto: un go de 19×19 y un sokoban de 5×3 tienen que caber igual, así que se normalizan. Pero la generala no tiene rejilla — son cinco</sub>
- **LA CÁMARA SE APARTA HASTA QUE EL TABLERO CABE.** <sub>línea 406</sub>
  <br><sub>Esto era `d = LADO * 1.15` y ya está: un número que salió de mirar UN tablero en UNA ventana. El resultado, medido abriendo las capturas, es que el tablero se sale por abajo en fagocito, mancala, damas y reversi — cuatro juegos, y los</sub>
- **ESTO VIVÍA AQUÍ Y AHORA VIVE EN `js/encuadre.js`.** <sub>línea 424</sub>
  <br><sub>No es limpieza: es que un betatester avisó de que en fagocito «no se ve el tablero completo», y fagocito no pasa por esta mesa. Los visualizadores propios siguen con su `camera.position.set(0, 20, 15)` escrito a mano en una</sub>
- **CUÁNTO SE COME EL PANEL, PREGUNTADO Y NO SUPUESTO.** <sub>línea 451</sub>
  <br><sub>Se mide el rectángulo del panel de verdad, ahora, en esta pantalla. Un número escrito a mano —«en móvil quita 200 px»— se queda viejo el día que el panel cambie de contenido, y anoche cambió tres veces.</sub>
- **Y SI HAY `?sala=`, LA PARTIDA NO OCURRE AQUÍ: OCURRE EN EL ÁRBITRO.** <sub>línea 477</sub>
  <br><sub>Esta mesa hablaba SIEMPRE con el hub local, así que con un enlace compartido cada pestaña jugaba su propia partida tan contenta y sin un solo error. Es el mismo fallo que Oscar encontró en el ajedrez —abrió una sala en dos navegadores</sub>
- **Y LO PRIMERO FUE MIRAR QUÉ FORMA TIENEN SUS JUGADAS, PORQUE NO SON CASILLAS.** <sub>línea 523</sub>
  <br><sub>Iba a escribir un «toca la casilla y muevo ahí», y midiéndolo resultó que la mayoría de estos juegos no tiene jugadas espaciales:</sub>
- **NADA QUE NO ESTÉ EN `legal_moves` SALE DE AQUÍ.** <sub>línea 537</sub>
  <br><sub>Todo pasa por `enviarSiEsLegal`. Un atajo que pudiera mandar algo ilegal sería un atajo que se cree las reglas, y eso ya nos costó caro. El panel sigue estando y sigue siendo la lista literal que ve un agente: esto es un segundo camino a las</sub>
- **TOCAR UNA CASILLA: SÓLO SI LA CASILLA DICE CÓMO SE LLAMA.** <sub>línea 573</sub>
  <br><sub>La rejilla puede publicar `nombres`, un array paralelo a `celdas` con el nombre de la jugada de cada casilla (y `null` donde no se puede jugar). Flota es el primero que lo hace, y salió de un aviso de Oscar: «que el panel no tenga la</sub>
- **SE TOCA LA CASILLA, Y VALE PARA CUALQUIER JUEGO QUE PROYECTE SUS ACCIONES.** <sub>línea 604</sub>
  <br><sub>El sustrato dice ahora, por cada jugada legal, qué casillas toca:</sub>
- **LA JUGADA SE VE ANTES DE HACERLA.** <sub>línea 621</sub>
  <br><sub>`seleccion` se guardaba desde hace días y no se dibujaba NUNCA. O sea que en damas, reversi o el ajedrez de esta mesa tocabas una pieza y la pantalla no cambiaba: ni sabías que la habías cogido, ni a dónde podía ir. La jugada existía</sub>
- **Y EL DATO LLEVABA DOS DÍAS PUESTO.** <sub>línea 635</sub>
  <br><sub>`sus.acciones` dice, para cada jugada legal, qué casillas toca — se construyó para poder jugar tocando el tablero. Nadie lo usaba al revés. Esto no añade información nueva: enseña la que ya había.</sub>
- **AHÍ NO». LA MESA TIENE QUE CONTESTAR ALGO.** <sub>línea 686</sub>
  <br><sub>Hasta ahora, tocar una casilla a la que no se puede ir no hacía NADA: `enviarSiEsLegal` devolvía `false` en silencio y la pantalla se quedaba igual. Desde fuera eso no se distingue de que la mesa se haya colgado, y lo primero que</sub>
- **Y SÓLO CUANDO DE VERDAD HA SIDO UN INTENTO.** <sub>línea 697</sub>
  <br><sub>Tocar en vacío para soltar la pieza es legítimo y no merece un rojo. La diferencia está en si HABÍA algo cogido: con una pieza en la mano, tocar una casilla es intentar ir ahí. Sin ella, es mirar.</sub>
- **QUÉ ACABA DE PASAR.** <sub>línea 708</sub>
  <br><sub>Esta mesa no anima: repinta el sustrato entero en cada vuelta, así que cuando mueve la casa las fichas aparecen en su sitio nuevo de golpe. Si estabas mirando el panel —que es lo normal, ahí están las jugadas— el tablero cambia y no sabes</sub>
- **Y NO ES UNA ANIMACIÓN, ES UN SUBRAYADO.** <sub>línea 717</sub>
  <br><sub>Interpolar de verdad obligaría a que el pintor recordara de dónde venía cada pieza entre dos estados, y este pintor está hecho justo al revés: recibe una matriz plana y la dibuja sin memoria. Ésa es la tesis del motor y no se toca por</sub>
- **LAS CASILLAS SALEN DEL NOMBRE, NO DE `acciones`.** <sub>línea 741</sub>
  <br><sub>Lo escribí primero buscando la jugada en `sus.acciones`, y no puede funcionar: ese mapa son las jugadas LEGALES AHORA, y la que acaba de hacerse ya no lo es. Habría sido un subrayado que no aparece nunca — de los que se dan por</sub>
- **TOCAR LA PIEZA CUANDO NO HAY REJILLA** <sub>línea 781</sub>
  <br><sub>`alTocar` se rendía en la primera línea si el juego no publicaba rejilla, y eso dejaba fuera al dominó entero: `tacto` lo medía y decía «sólo respondía el panel». Una ficha de dominó se coge con la mano, no se nombra.</sub>
- **Y NO HACE FALTA QUE ESTA MESA SEPA JUGAR AL DOMINÓ.** <sub>línea 788</sub>
  <br><sub>La pieza ya lleva su identificador puesto en el nombre de la malla —`p:ficha:6-3`, igual que una carta lleva `S_A` y un dado `d6_5`— y las jugadas legales lo nombran dentro: `jugar:6-3:izq`. Así que basta buscar cuáles de las legales hablan de la</sub>
- **EL SEGUNDO TOQUE ES LA PUNTA, Y ESO ES EL JUEGO.** <sub>línea 796</sub>
  <br><sub>Cuando la ficha entra por los dos lados hay DOS jugadas y elegir por ti sería jugar por ti: en el dominó, por qué punta la metes es la decisión. Así que se coge la ficha y se toca el extremo de la cadena donde va — que es literalmente lo que</sub>
- **Y NO SE ADIVINA.** <sub>línea 940</sub>
  <br><sub>De estos quince juegos sólo `flota` tiene jugadas que son casillas (`a1`, `b1`). La idea era: tocas la casilla, se mira cómo se llamaría, y si ese nombre está en `legal_moves` se manda. Comprobar contra la lista parecía suficiente garantía.</sub>
- **Y DEBAJO, LO QUE EL JUEGO PUBLICA Y ANTES SÓLO LEÍA EL AGENTE.** <sub>línea 1038</sub>
  <br><sub>Esto era «Turno» y el marcador, y ya. Un agente de defensa leía `oro: 3. vida: 10. vida_rival: 10. bichos_en_camino: 2` porque el describidor vuelca el estado entero; la persona veía dos números. Medido en los 38 con</sub>
- **LAS FILAS VAN AL LADO DE `#estado-txt`, NO DENTRO.** <sub>línea 1054</sub>
  <br><sub>La primera versión las metía dentro, y `#estado-txt` YA es un `.status-row` —o sea una fila flex horizontal—, así que las once filas de defensa se apilaban de lado y salía «Turnoazul·0bandoazuloro15vida10vida10torre rival»</sub>
- **`yo` VA VACÍO EN LA MESA LOCAL, Y ES A PROPÓSITO.** <sub>línea 1105</sub>
  <br><sub>Lo puse primero como `st.turn` y quedaba bonito —las jugadas propias en verde— hasta que se mira lo que significa: `turn` es DE QUIÉN ES EL TURNO AHORA, no quién soy yo. Así que el color se daba la vuelta en cada jugada</sub>
- **EL REPETIDOR: LA TESIS DEL PROYECTO, PUESTA DONDE SE VE** <sub>línea 1126</sub>
  <br><sub>/arcade/checkers.html?semilla=7&repetir=a3b4,b6a5,b4c5</sub>
- **Y NO TOCA NI EL PINTOR NI LAS REGLAS.** <sub>línea 1135</sub>
  <br><sub>El repetidor sólo llama a `hub.reset` y `hub.move` — exactamente lo que hace jugar. La mesa repinta lo que el hub diga, como siempre, porque el render es un espectador y no un nervio. Consecuencia: sale gratis en los quince juegos de esta</sub>
- **Y POR ESO EL HISTORIAL Y EL SUBRAYADO FUNCIONAN SOLOS.** <sub>línea 1142</sub>
  <br><sub>Como las jugadas se aplican de verdad, el hub las graba, `hub.partida()` las devuelve, y el registro y el subrayado de la última jugada aparecen sin una línea más. No estaba planeado: es lo que pasa cuando repetir es jugar otra vez y no</sub>

### `public/arcade/js/montarMesa.js`

- **QUÉ HABÍA ANTES, QUE ES LO QUE JUSTIFICA ESTO** <sub>línea 11</sub>
  <br><sub>Cada página de tablero eran ~50 líneas de las que **5 eran el juego** y 35 un CSS idéntico copiado seis veces. Las seis repetían además, a mano y en orden, tres scripts de vendor + `Entrada.js` + `SovereignBoardEngine.js` + su</sub>
- **POR QUÉ INYECTA SCRIPTS CLÁSICOS EN VEZ DE IMPORTARLOS** <sub>línea 21</sub>
  <br><sub>`three.min.js`, `Entrada.js`, `SovereignBoardEngine.js` y los visualizadores NO son módulos: declaran globales y se leen entre ellos por `window`. Se cargan en el mismo orden de siempre, uno detrás de otro. Convertirlos a</sub>
- **Y POR QUÉ LAS REGLAS SE REGISTRAN ANTES QUE NADA** <sub>línea 28</sub>
  <br><sub>El visualizador espera encontrar `window.ALISA_PROTOHUB`. Si se cargara antes, vería un tablero vacío — que es exactamente el fallo que tuvo esta página cuando dependía del hub de la colonia para tener reglas.</sub>
- **LA VERSIÓN QUE VIAJA EN LA URL.** <sub>línea 38</sub>
  <br><sub>Un despliegue llegó a medias y costó una tarde: el navegador tenía el `mesa_cartas.mjs` nuevo y el `montarMesa.js` viejo, una combinación que NUNCA existió en el repositorio. Se arregló en el panel de Cloudflare, pero eso deja</sub>
- **SE EXPORTA PORQUE HABÍA UNA SEGUNDA LISTA, MÁS CORTA, Y NADIE LO SABÍA.** <sub>línea 59</sub>
  <br><sub>`sala.html` —la sala de bolsillo, a la que te lleva sentarte en una mesa de la Sala del Huevo— montaba `mesa_tablero.mjs` cargando sólo los tres de vendor. Le faltaban `gestos.js`, `objetivo_visible.js`, `encuadre.js` y `mandos.js`.</sub>
- **QUÉ MOTOR HACE FALTA LO DICE EL SUSTRATO, NO UNA LISTA.** <sub>línea 98</sub>
  <br><sub>Hay dos: `SovereignBoardEngine` para tableros y `SovereignCardEngine` para cartas. Se podría poner en la configuración de cada página —`motor:'cartas'`— y sería otra lista paralela que se separa el día que alguien añada un juego y</sub>
- **LO QUE YA ESTÁ EN LA PÁGINA NO SE VUELVE A CARGAR.** <sub>línea 115</sub>
  <br><sub>`entropy.html` conservaba los tres <script> de vendor del cascarón viejo y esto los cargaba otra vez. Con three sólo salía un aviso; con tween salió caro: dos objetos TWEEN distintos, uno recibiendo los movimientos de las</sub>
- **`.mjs` se carga como módulo.** <sub>línea 134</sub>
  <br><sub>clásicos que hablan por variables globales; los nuevos importan el sustrato, que es un módulo. Distinguirlos por la extensión evita tener que declarar en la configuración algo que el nombre del fichero ya dice.</sub>
- **LAS HOJAS DE ESTILO TAMBIÉN SE SELLAN.** <sub>línea 148</sub>
  <br><sub>Todo el sistema de `?v=` existe para que un navegador no empareje una copia guardada con código nuevo. Los `.js` iban sellados desde el principio y el CSS no, o sea que la mitad del cuadro podía llegar vieja.</sub>
- **SE NOMBRAN LAS NORMAS, NO LAS VARIANTES.** <sub>línea 219</sub>
  <br><sub>`?normas=española` sería más bonito de leer y sería otra lista paralela: el día que alguien añada una tercera norma habría que repasar los nombres de variante uno a uno, y el que se olvide se queda contando lo de antes. Las</sub>
- **Y SÓLO SE ACEPTAN LAS QUE EL JUEGO DECLARA.** <sub>línea 226</sub>
  <br><sub>Una norma inventada en la dirección se ignora y se avisa. Si se pasara tal cual, la partida se jugaría con las de siempre mientras el recibo diría otra cosa — y eso es exactamente la clase de mentira silenciosa que aquí sale</sub>
- **LAS NORMAS LAS DECLARAN LAS PROPIAS REGLAS, NO UNA RUTA ADIVINADA.** <sub>línea 237</sub>
  <br><sub>Primero lo escribí como `import('./protohub/rules/' + juego + '.js')` para leer su `NORMAS`. Parecía inofensivo porque el fallo estaba capturado — y rompió cuatro juegos de golpe: brisca, tute, hearts y spades no viven en esa</sub>
- **Y A QUÉ SE JUEGA.** <sub>línea 269</sub>
  <br><sub>Los visualizadores se cargan como `<script type="module">` que se montan solos: no hay a quién pasarle argumentos, así que leen `window.ALISA_JUEGO`. `entropy.html` lo ponía a mano de cuando era una página escrita entera, y al</sub>
- **Y A QUÉ SE JUEGA, PARA LA PERSONA.** <sub>línea 284</sub>
  <br><sub>(«ni idea tengo de cómo se juega») el mismo día que terminé de escribir los treinta y cinco objetivos: se lo estaba contando al agente y no a él.</sub>
- **`?semilla=` NO SE APLICABA, Y LAS PÁGINAS PROMETÍAN QUE SÍ.** <sub>línea 296</sub>
  <br><sub>Esto registraba las reglas y dejaba que la primera consulta creara la partida sola — y `nuevaPartida()` sin semilla usa `Date.now()`. O sea que abrir dos veces la misma dirección daba dos repartos distintos, mientras el</sub>
- **SIN VISUALIZADOR PROPIO NO SE QUEDA EN BLANCO: SALE LA VISTA GENÉRICA.** <sub>línea 327</sub>
  <br><sub>Antes, un juego sin `visualizador` cargaba el motor y nada más — o sea una página con HUD y un lienzo vacío. Por eso los once juegos nuevos vivían en `mesa.html`, que es de TEXTO: era eso o nada.</sub>
- **Y SI LA PÁGINA NO LO DICE, LO DICE EL JUEGO.** <sub>línea 343</sub>
  <br><sub>`VISUALIZADOR` es el mismo dato que estas páginas venían pasando a mano, pero puesto donde pertenece: en el juego, no en una de las páginas donde se le mira. Lo que declare la página sigue mandando —no se rompe ninguna— y quien no declare</sub>
- **LOS DE VISUALIZADOR PROPIO NO PUEDEN ENSEÑAR EL ESTADO POR SÍ SOLOS.** <sub>línea 357</sub>
  <br><sub>Las dos mesas genéricas ya pintan las filas del estado con `filasDeEstado`, así que veintiuno de los veintiocho juegos donde el agente sabía más que la persona quedaron arreglados solos. Los siete con visualizador propio no: son scripts</sub>
- **EL BOTÓN DE «ALGO VA RARO», EN LAS TREINTA Y CINCO DE UNA LÍNEA.** <sub>línea 380</sub>
  <br><sub>Va aquí y no en cada página por el mismo motivo que todo lo demás de este fichero: una cosa que hay que acordarse de poner en cada página acaba faltando en una, y será justo en la que falle algo.</sub>

### `public/arcade/js/objetivo_visible.js`

- **DE DÓNDE SALE ESTO: DE UN AVISO DE BETATESTER, Y ME PILLÓ EN LO MISMO.** <sub>línea 5</sub>
  <br><sub>El 13-08-2026 llegó esto desde mancala:</sub>
- **POR QUÉ VA FUERA DE `#hud-content`.** <sub>línea 25</sub>
  <br><sub>Es la misma razón por la que ya están fuera los botones de jugada y la pista: plegado, `#hud-content` queda con `max-height: 0`, y lo que esté dentro desaparece. Alguien que pliega el panel para ver la mesa es EXACTAMENTE quien</sub>

### `public/arcade/js/peaton_visualizer.js`

- **LUMINANCIA MEDIA 12,1 SOBRE 255 — Y AQUÍ SÍ ERA (TAMBIÉN) EL MODELO.** <sub>línea 26</sub>
  <br><sub>Mismo diagnóstico que en el ajedrez (chess_visualizer.js) y en snake: el ambiente a 0.5 es el mismo nivel que dejaba rosas las piezas allí. Pero además la carretera (`matRoad`, más abajo) es MeshStandardMaterial con base</sub>
- **SI ESTÁS ESCRIBIENDO, ESTO SON LETRAS Y NO JUGADAS.** <sub>línea 67</sub>
  <br><sub>El mapa de arriba incluye `w a s d` y el ESPACIO, con `preventDefault()`. Sin esta línea, escribir en cualquier campo de la página —el buzón de «algo va raro», sin ir más lejos— movía al peatón de verdad y se comía la letra.</sub>
- **ESTA PÁGINA ESCRIBÍA EN UN HUD QUE NO EXISTÍA, Y LLEVA ASÍ DESDE SIEMPRE.** <sub>línea 198</sub>
  <br><sub>`_hueco()` busca `ui-tick`, `ui-conn` y `ui-agent`… y ninguno estaba en el documento: la página traía un `<div id="hud-container">` VACÍO y nada lo llenaba —los otros visualizadores llaman a `mountAgentHUD`, y éste no, porque</sub>
- **EL HUD HABLABA EN INGLÉS: «ALIVE», «SYNCED», «ROADKILL».** <sub>línea 228</sub>
  <br><sub>Y son las tres únicas palabras que dicen qué te está pasando: si sigues vivo, si la partida está conectada y si te ha atropellado un coche. Lo demás del arcade está en español desde hace días — dejar en inglés justo lo que informa es lo peor</sub>

### `public/arcade/js/poker_visualizer.js`

- **MISMA RECETA QUE `blackjack_visualizer.js`, Y AQUÍ SÍ CUBRE LAS TRES ZONAS.** <sub>línea 4</sub>
  <br><sub>A diferencia de blackjack, `sustratoDe()` (en `protohub/sustrato.js`) SÍ publica las tres piezas de este juego: `player_hand` → zona `mano` (de:0), `community_cards` → zona `comunes` (de:null), y `opponent_hand` → zona</sub>
- **DE INVITADO, NADA DE ESTO.** <sub>línea 61</sub>
  <br><sub>Todo el párrafo de arriba razona sobre una mesa que flota en la niebla sin suelo ni sala alrededor. Dentro de la sala de bolsillo hay las dos cosas, así que el razonamiento no aplica: la cámara la pone la sala y encuadra su</sub>
- **LA TIRA DE JUGADAS VA FUERA DE `#hud-content`, Y ANTES ESTABA DENTRO.** <sub>línea 162</sub>
  <br><sub>Escrita en este HTML acababa donde acaba todo lo de aquí: dentro del bloque que se pliega. Y plegado —que en un móvil es como arranca— eso va a `max-height: 0; overflow: hidden`: los botones conservan su rectángulo,</sub>
- **ESTA MESA ENSEÑABA UNA PARTIDA QUE NO SE PODÍA JUGAR.** <sub>línea 193</sub>
  <br><sub>El HUD contaba el bote, las fichas y la fase, y ahí acababa. Con `legal_moves: ['check','raise']` y el turno tuyo, en pantalla no había ni un botón: una mesa preciosa, perfectamente dibujada, y sin forma de mover.</sub>

### `public/arcade/js/raton_tablero.js`

- **NO SON CUATRO PROBLEMAS.** <sub>línea 9</sub>
  <br><sub>Todos son rejillas. Lo único que cambia entre ellos es el tamaño, la separación entre casillas y cómo se llama una casilla en la jugada. Escribir cuatro raycasters a medida habría sido escribir cuatro veces el mismo error.</sub>
- **LA JUGADA SE COMPRUEBA CONTRA `currentLegalMoves`, SIEMPRE.** <sub>línea 18</sub>
  <br><sub>El ratón no construye jugadas: propone un nombre de casilla y busca si existe entre las legales. Eso hace imposible que un clic produzca algo ilegal —la misma garantía que tienen los botones de la mesa y que tiene un LLM— y además</sub>
- **`engine.lienzo` Y NO `engine.renderer.domElement`.** <sub>línea 49</sub>
  <br><sub>De invitado —dentro de la sala de bolsillo— el renderizador es de la sala, así que ese camino es `null` y esto moría con `Cannot read properties of null (reading 'domElement')`, llevándose por delante</sub>
- **EL TABLERO NO SIEMPRE ESTÁ EN `y = 0` NI A ESCALA 1.** <sub>línea 71</sub>
  <br><sub>Esta cuenta —«redondea `(x - origen.x) / paso`»— está escrita en las mismas unidades en que el visualizador construyó su tablero. Eso vale mientras el tablero cuelgue de la escena, que no tiene transformación.</sub>

### `public/arcade/js/snake_visualizer.js`

- **LUMINANCIA MEDIA 11,6 SOBRE 255 — CASI NEGRO, Y NO ERA EL MODELO.** <sub>línea 14</sub>
  <br><sub>Igual que en el ajedrez (ver chess_visualizer.js): el suelo `0x020802` es MeshBasicMaterial, así que NINGUNA luz lo toca —siempre sale exactamente ese color, casi negro— y el ambiente estaba a 0.4, calcado al que dejaba</sub>
- **NOMBRE = CONTRATO DE PIEZA. `sustrato.js` publica la comida como** <sub>línea 62</sub>
  <br><sub>`{t:'comida', de:null}` (ver `sustratoDe`, rama `st.maze || st.snake || st.frog`): el nombre calca esos dos campos tal cual, con el mismo prefijo `p:` que ya usa `pintar3d.js` para el resto del arcade. Sin</sub>

### `public/arcade/js/SovereignBoardEngine.js`

- **INVITADO EN VEZ DE DUEÑO: `config.anfitrion`.** <sub>línea 19</sub>
  <br><sub>Es exactamente el mismo cambio que ya tenía `SovereignCardEngine`, y por eso está escrito igual: allí lo llevó a que la Sala del Huevo pudiera enseñar una partida de cartas DENTRO de su propia mesa en vez de</sub>
- **SALVO LOS QUE MIRAN `renderer`.** <sub>línea 36</sub>
  <br><sub>`null`; el que lo use tiene que aguantarlo. Se comprueba con `npm run invitados`, que abre los diecisiete y mira si dibujan.</sub>
- **LOS ASIENTOS SE INICIALIZAN AQUÍ, NO EN EL HUD, Y HAY MOTIVO.** <sub>línea 46</sub>
  <br><sub>No todas las páginas montan el panel de agente: `checkers.html`, por ejemplo, no lo monta. Cuando los valores vivían en el desplegable, esas páginas se quedaban con el `'engine'` de fábrica —una palabra que ya no</sub>
- **EL MOTOR, ACCESIBLE.** <sub>línea 61</sub>
  <br><sub>La mesa de cartas publica `window.ALISA_MESA` y la de tableros `window.ALISA_PINTOR`. Los once juegos con visualizador propio no publicaban nada, y eso no es un detalle de comodidad: sin esto no hay</sub>
- **DESLIZAR PARA MOVERSE, PARA TODO EL QUE CUELGUE DE ESTE MOTOR.** <sub>línea 73</sub>
  <br><sub>Snake, fagocito y peatón se juegan con cuatro palabras —`arriba`, `abajo`, `izquierda`, `derecha`— y NO TENÍAN NINGÚN MANEJADOR DE ENTRADA: sólo el panel, también en escritorio. Sus visualizadores son tres ficheros</sub>
- **EL MOTOR, ALCANZABLE DESDE FUERA.** <sub>línea 238</sub>
  <br><sub>`legibilidad.mjs` pregunta si lo que el sustrato declara se VE: si cae en pantalla, si la casilla es lo bastante grande, si el material se distingue del terreno. Para eso le hace falta la cámara y la escena.</sub>
- **EL PANEL SE COMÍA UN QUINTO DEL TABLERO, Y NADIE LO MEDÍA.** <sub>línea 273</sub>
  <br><sub>Cada visualizador coloca su cámara en `onInit3D` y la centra en la pantalla entera. Pero en escritorio el HUD es una columna a la izquierda, así que el tablero queda centrado DEBAJO de ella. En las capturas del ajedrez faltaba la</sub>
- **Y AQUÍ NO HAY NÚMERO QUE VALGA, AUNQUE LO INTENTÉ DOS VECES.** <sub>línea 281</sub>
  <br><sub>Escribí una medida —proyectar la caja de la escena contra el rectángulo del panel— que dio «20 % tapado» antes del arreglo y **31 % después**, con la imagen claramente mejor. La medida estaba mal: `Box3.setFromObject(scene)`</sub>
- **SE PARTE SIEMPRE DE LA POSICIÓN ORIGINAL, O EL DESPLAZAMIENTO SE SUMA.** <sub>línea 308</sub>
  <br><sub>Esto se llama ahora cada vez que el panel cambia de tamaño. Sin guardar la cámara que puso el visualizador, cada llamada desplazaría desde donde quedó la anterior: plegar y desplegar tres veces mandaría la vista a tomar</sub>
- **Y SE RESTAURA TAMBIÉN LA ROTACIÓN, NO SÓLO LA POSICIÓN.** <sub>línea 316</sub>
  <br><sub>`encajarCamara` gira la cámara con `lookAt()` además de moverla —lo hace dentro de su propio bucle de alejar, y otra vez si aplica `izquierdaLibre`— así que la rotación que deja tras de sí es tan suya como la posición. Sólo</sub>
- **SE DESPLAZA LO QUE EL PANEL TAPA DE VERDAD, NO UNA FRACCIÓN DEL ANCHO.** <sub>línea 348</sub>
  <br><sub>La primera versión usaba `ancho del panel / ancho de pantalla / 2`. Un número plausible y que no resuelve nada: el ancho del panel no cambia al plegarlo, así que desplazaba lo mismo tapara lo que tapara — y con el panel</sub>
- **Y LA CAJA SE PIDE A `cajaReal`, NO A `Box3.setFromObject`.** <sub>línea 358</sub>
  <br><sub>Ésa es la diferencia que me dio una medida falsa esta tarde —«20 % tapado antes, 31 % después» con la imagen mejor—: `setFromObject` mete en la caja las LUCES y todo lo que tenga posición, así que mide algo que no es el</sub>
- **ACTUALIZAR LAS MATRICES ANTES DE PROYECTAR.** <sub>línea 371</sub>
  <br><sub>`Vector3.project(camara)` usa `matrixWorldInverse` y `projectionMatrix` tal como estén: no actualiza nada por su cuenta. Y esto corre justo después de `onInit3D()`, donde el visualizador acaba de MOVER la cámara —snake hace</sub>
- **YA NO SE TOPA AL HUECO: SE ALEJA LA CÁMARA, BUSCANDO CUÁNTO POR BISECCIÓN.** <sub>línea 416</sub>
  <br><sub>Aquí hubo un tope: `invade = Math.min(necesario, hueco)`. Al arreglar las matrices, snake pasó a pedir 382 px de desplazamiento —un número ya razonable— y con ellos la comida salía de debajo del panel… y el lado</sub>
- **SIN HUB SALVO QUE SE PIDA.** <sub>línea 523</sub>
  <br><sub>`127.0.0.1:8741` —el hub de la colonia, que es otro proyecto— y dejaba un 404 en la consola en cada carga, apuntando a una dirección privada nuestra. Desde https ese sondeo ni siquiera está permitido, así que en</sub>
- **CON `?sala=` LA PARTIDA OCURRE EN EL ÁRBITRO, Y AQUÍ NO ESTABA.** <sub>línea 553</sub>
  <br><sub>Esto faltaba, y la forma en que se descubrió merece quedar escrita: Oscar abrió un ajedrez con `?sala=` en dos navegadores y salieron DOS PARTIDAS DISTINTAS. Ningún error, ninguna pista — cada pestaña jugaba su propia</sub>
- **`params.action` PRIMERO. `sendMove` envuelve la jugada** <sub>línea 594</sub>
  <br><sub>en `{action:'move', params:{action:<jugada>}}`, así que leer `a.action` da la palabra «move» y el árbitro la rechazaría culpando al juego en vez de a este desempaque.</sub>
- **DOS CASILLAS, NO UNA: dirección Y modelo.** <sub>línea 771</sub>
  <br><sub>Antes sólo se pedía el nombre del modelo porque la jugada la pedía el HUB DE LA COLONIA, que sabía dónde vivía Ollama. En el sitio público no hay colonia, así</sub>
- **Y SE RECOLOCA A MANO, PORQUE LA PLANTILLA NO BASTA.** <sub>línea 813</sub>
  <br><sub>La tira de jugadas se escribe arriba como HERMANA de `#hud-content`, con su comentario y todo. Medido en el ajedrez el 14-08-2026, el navegador la enseñaba DENTRO — y plegado (que en móvil es como arranca) `#hud-content`</sub>
- **EN UN MÓVIL EMPIEZA PLEGADO, COMO EN LA MESA DE CARTAS.** <sub>línea 842</sub>
  <br><sub>Esto lo tenía sólo `SovereignCardEngine`, y el resultado medido el 13-08-2026 en una pantalla de 390x844, contando qué elemento hay bajo cada punto con `elementFromPoint`:</sub>
- **CERO NO ES ESTRECHO: ES «NO LO SÉ». `innerWidth` vale 0 en una pestaña** <sub>línea 891</sub>
  <br><sub>que aún no se ha compuesto, y cero es menor que 820, así que un monitor de 27 pulgadas se llevaría la vista de teléfono según cuándo mirases. Sin medida fiable se responde que no, que es lo que había antes.</sub>
- **SE CORTA A CINCUENTA, Y SE DICE CUÁNTAS FALTAN.** <sub>línea 917</sub>
  <br><sub>Go empieza con 361 jugadas legales. Trescientos sesenta y un botones no son una ayuda, son un muro — y ahí además no hacen falta: go se juega tocando la intersección. La caja de texto sigue para el resto, y ahora al menos se ve el</sub>
- **ESTE MOTOR SE ME QUEDÓ FUERA, Y CASI NO ME ENTERO.** <sub>línea 931</sub>
  <br><sub>Lo monté en la mesa genérica y en el motor de cartas y di el trabajo por terminado, sin haber contado nunca cuántos caminos había. Contándolos:</sub>
- **SI NO HAY DÓNDE PONERLAS, SE PONE EL SITIO.** <sub>línea 993</sub>
  <br><sub>Snake, fagocito y blackjack montan su propio panel —«Score», «Pellets Left»— y no pasan por `mountAgentHUD`, así que no tenían `#mesa-jugadas` y se quedaban con CERO jugadas pulsables. Medido en la pasada de los 35.</sub>
- **REPITIENDO GANA SOBRE EL FINAL, Y ESTE ORDEN ME COSTÓ VERLO.** <sub>línea 1013</sub>
  <br><sub>Lo tenía debajo, y repitiendo el aviso de fagocito hasta el final salió la pantalla de fin de partida entera: «jugar otra», «copiar el enlace», «aportar al corpus» — los tres muertos, porque `sendMove` rechaza jugar</sub>
- **AL TERMINAR, LA PANTALLA DE FIN.** <sub>línea 1036</sub>
  <br><sub>Antes aquí no quedaba nada al acabar la partida: ni resultado, ni forma de empezar otra sin recargar. Y es el momento exacto en que alguien decide si sigue jugando. Va en `protohub/final.js`, compartido con el motor de</sub>
- **LOS VERBOS TAMBIÉN SALEN ABAJO, Y ESTE ES EL TERCER CAMINO DE PANEL.** <sub>línea 1058</sub>
  <br><sub>La barra de verbos —lo único que una persona necesita PULSAR, porque el resto de jugadas son piezas que se tocan en la mesa— se monta en `jugadas.js`. Pero este motor NO pasa por ahí: pinta sus propios botones</sub>
- **AQUÍ HABÍA UN `data.state || data` — y elegía mal.** <sub>línea 1145</sub>
  <br><sub>Algunos juegos (mancala) traen un `state` anidado con lo que el visualizador necesita para pintar (`{board, turno}`) Y ADEMÁS los campos de partida arriba del todo. Al quedarse con el anidado, este</sub>
- **`is_game_over` SE VUELVE A PONER AQUÍ, Y NO SOBRA: hay juegos que lo** <sub>línea 1175</sub>
  <br><sub>publican dentro de `state` y otros al nivel de arriba —por eso existe `campo()` justo encima—, así que quien reciba esto no debería tener que saber cuál de las dos formas le tocó. Ese «que cada consumidor lo busque»</sub>
- **ESTO SE VE EN LOS CUATRO JUEGOS DEL MOTOR, Y ESTABA EN INGLÉS.** <sub>línea 1192</sub>
  <br><sub>«CHECK» es jaque y «CLEAR» es que no lo hay: las dos únicas palabras que avisan de que tu rey está en peligro. En un tablero donde todo lo demás está en español, dejar el aviso sin traducir es lo peor de las</sub>
- **EL BOTÓN DECÍA «PARAR» Y NADIE SABÍA PARAR QUÉ.** <sub>línea 1279</sub>
  <br><sub>Aviso de betatester desde mancala: «va solo no? o se juega asi? ni idea tengo de como se juega en realidad XD». Y sí va solo, y está bien que vaya: el asiento negro lo lleva un FSM, y sin reloj el FSM no mueve nunca. El</sub>
- **ANTES ESTO ERA UNA LISTA APARTE, Y MEDIO FALSA.** <sub>línea 1322</sub>
  <br><sub>El desplegable ofrecía `engine / human / alisa / queen / llm`. De esos, `alisa` y `queen` acababan los dos en el mismo `ai_move` —eran decoración— y `llm` mandaba `llm_move` AL HUB DE LA COLONIA. O sea que en el sitio</sub>
- **El nombre que publican las REGLAS, no el del registro.** <sub>línea 1384</sub>
  <br><sub>Dos páginas registran con otro nombre —`ajedrez` se registra como `chess`, `damas` como `checkers`— y ese nombre entra en el texto que lee un modelo. Si aquí dijera «Chess» y el banco de</sub>
- **SI NO ELIGE, SE PARA Y SE DICE.** <sub>línea 1395</sub>
  <br><sub>de pruebas eso se cuenta como jugada «forzada» y se publica el porcentaje. Una mesa que rellenara el hueco en silencio le estaría regalando partidas a un modelo que no supo jugarlas.</sub>

### `public/arcade/js/SovereignCardEngine.js`

- **INVITADO EN VEZ DE DUEÑO: `config.anfitrion`.** <sub>línea 19</sub>
  <br><sub>Este motor creaba SIEMPRE su propia escena, su cámara con `window.innerWidth`, su renderer dentro de `#canvas-container` y su propio bucle. Es dueño de la página, y por eso la Sala del Huevo sólo</sub>
- **Y SI NADIE LO PASA, SE MIRA EL `window`.** <sub>línea 42</sub>
  <br><sub>`mesa_cartas.mjs` se lo pasa a mano porque es un módulo que se monta solo. Los visualizadores propios —blackjack, póker— son scripts clásicos que construyen su motor con un literal escrito hace meses, así que nunca van a</sub>
- **TAMBIÉN DE INVITADO.** <sub>línea 169</sub>
  <br><sub>en el camino de dueño, así que de invitado no lo publicaba nadie: quien mirase `window.ALISA_MOTOR` en la sala de bolsillo encontraba el de la mesa genérica, o nada. `npm run invitados` lo dijo con «el motor no se</sub>
- **UN ASPECTO `NaN` DEJA LA PANTALLA EN NEGRO, SIN DECIR NADA.** <sub>línea 188</sub>
  <br><sub>Esto era `window.innerWidth / window.innerHeight` a pelo. Si la página se monta antes de que el navegador haya compuesto la ventana —pasa en una pestaña de fondo, y pasa en algunos móviles al restaurar—, las dos</sub>
- **AQUÍ ESTABA EL «EL TAPETE HACE COSAS RARAS», Y LO REPORTÓ DOS VECES.** <sub>línea 235</sub>
  <br><sub>`castShadow = true` y nada más. Una luz direccional en three trae por defecto una cámara de sombra de ±5 unidades y un mapa de 512 píxeles. El fieltro de esta mesa mide **20 de ancho**: se sale del encuadre por los</sub>
- **Y NO LO DETECTA NINGUNA MEDIDA.** <sub>línea 248</sub>
  <br><sub>tiene que ocupar y el laboratorio le da 92,9% de pintado. Sólo se ve MIRANDO la captura — que es exactamente para lo que se guardan.</sub>
- **QUÉ carta se ha clicado, no sólo qué CARA tiene.** <sub>línea 405</sub>
  <br><sub>Esto mandaba `cardId`, que es la cara —«un 12»— y con eso no se puede jugar: en la caja de entropy hay ocho huecos y dos pueden tener el mismo número. Sin saber CUÁL se ha tocado, un clic no</sub>
- **SIN HUB SALVO QUE SE PIDA.** <sub>línea 466</sub>
  <br><sub>`SovereignBoardEngine.js`: el defecto sondeaba `127.0.0.1:8741` —el hub de la colonia, que es otro proyecto— y dejaba un 404 en consola en cada carga, apuntando a una dirección privada nuestra. Desde una página</sub>
- **CON `?sala=` LA PARTIDA NO OCURRE AQUÍ: OCURRE EN EL ÁRBITRO.** <sub>línea 499</sub>
  <br><sub>Es lo que convierte esta mesa de casino en una mesa para VARIAS personas. Dos que abran la misma dirección —o una persona y el agente de otra— se sientan a la misma partida, con turnos de verdad y el mismo</sub>
- **`params.action` PRIMERO, y no es un detalle.** <sub>línea 541</sub>
  <br><sub>`sendMove` envuelve la jugada en `{ action:'move', params:{ action: <jugada> } }`, así que leer `a.action` da la palabra «move» — y el árbitro</sub>
- **EL REPETIDOR: VER UNA PARTIDA VOLVERSE A JUGAR** <sub>línea 604</sub>
  <br><sub>/arcade/brisca.html?semilla=7&repetir=jugar:O_1,jugar:C_3,…</sub>
- **VA EN EL MOTOR Y NO EN CADA MESA, Y ESO SON DIEZ JUEGOS DE UNA VEZ.** <sub>línea 615</sub>
  <br><sub>Este motor lo comparten todos los juegos de cartas, con visualizador propio o con la mesa genérica. Puesto aquí, ninguno de ellos escribe una línea. Es la misma decisión que en la mesa de tablero: el repetidor sólo habla con el hub</sub>
- **El sufijo de copia se quita ANTES de mirar nada.** <sub>línea 805</sub>
  <br><sub>barajas la segunda copia es `S_A#2`, y sin esto el rango salía `A#2`: no existe esa figura, así que la carta se pintaba en blanco. Las dos copias son la misma carta a los ojos: el `#2` sólo sirve para nombrarlas aparte</sub>
- **UNA FIGURA SIN LÁMINA TIENE QUE PODER LEERSE IGUAL.** <sub>línea 1005</sub>
  <br><sub>`_drawCourtCard` dibuja la silueta entera con `globalAlpha` entre 0,08 y 0,2: es un fantasma pensado para ir DEBAJO de una lámina, no para sustituirla. Y sólo hay láminas de la baraja inglesa (`H_J`, `S_Q`…), así que la sota, el</sub>
- **DOS COLORES EN UNA CARTA SERÍAN DOS COLORES QUE NO SIGNIFICAN LO** <sub>línea 1261</sub>
  <br><sub>MISMO, así que cada uno tiene su sitio y no se mezclan:</sub>
- **Y HAY JUEGOS DONDE EL COLOR NO ES UN TRAMO: ES LA CARTA.** <sub>línea 1282</sub>
  <br><sub>Todo lo de arriba vale para entropy, donde gana quien menos suma. En UNIT el color decide qué puedes jugar, así que teñir por tramos pintaría un dos rojo de verde y haría que dos cartas del mismo color se vieran distintas.</sub>
- **LO QUE NO ES UN NÚMERO VA SOBRE FONDO, Y NO POR ADORNO.** <sub>línea 1312</sub>
  <br><sub>Un emoji es multicolor y CLARO. Sobre blanco, y visto desde la cámara de la mesa, competía fatal con una cifra negra: la carta del comodín se leía como una carta en blanco aunque el lienzo estuviera perfecto. Es el</sub>
- **GEORGIA NO TIENE EMOJIS, Y UN COMODÍN SALÍA EN BLANCO.** <sub>línea 1331</sub>
  <br><sub>El canvas no avisa cuando le falta un glifo: dibuja nada y sigue. La carta se veía perfecta, blanca y vacía — que es lo mismo que le pasaba a la sota española por no tener lámina, sólo que por otra causa. Un tipo de</sub>
- **Y EL GLIFO NO PUEDE IR DEL MISMO COLOR QUE SU PROPIO FONDO.** <sub>línea 1346</sub>
  <br><sub>Esto pintaba el panel con `color` y encima el símbolo TAMBIÉN con `color`. Con el comodín 🃏 no se notó nunca porque un emoji es un mapa de bits multicolor e ignora el relleno — así que la trampa quedó armada y</sub>
- **Y MÁS GRANDE QUE UN NÚMERO, no igual: a la misma altura de fuente el** <sub>línea 1362</sub>
  <br><sub>glifo de un emoji ocupa la mitad que una cifra, así que a 120px la carta parecía vacía desde la cámara aunque el canvas estuviera bien. Se comprobó pintando el lienzo en pantalla, que es la única forma de</sub>
- **HAY JUEGOS DONDE EL PALO NO PINTA NADA, Y ENSEÑARLO ESTORBA.** <sub>línea 1406</sub>
  <br><sub>Entropy se reparte con la española de 48 porque da doce valores limpios, pero ninguna regla mira el palo: se suma el valor y se anulan dos iguales en la misma columna. Enseñar oros y copas obligaba a</sub>
- **ESTABAN CALIBRADOS PARA UNA CARTA QUE SE TIENE EN LA MANO, Y ÉSTAS** <sub>línea 1445</sub>
  <br><sub>ESTÁN SOBRE UNA MESA.</sub>
- **HAY IMÁGENES QUE SON LA CARTA ENTERA, NO EL RETRATO.** <sub>línea 1464</sub>
  <br><sub>Las figuras francesas que teníamos son sólo el dibujo, y por eso van encajadas en el hueco del centro. Las españolas que bajamos de Commons son CARTAS COMPLETAS —traen su marco y sus índices—, así que metidas en ese</sub>
- **AQUÍ HABÍA UNA REJILLA DE PINTAS, Y ES LA DE UNA CARTA QUE SE SOSTIENE** <sub>línea 1534</sub>
  <br><sub>EN LA MANO.</sub>
- **CUÁNTA TINTA LLEVA UNA CARA.** <sub>línea 1570</sub>
  <br><sub>Este proyecto lleva media docena de cartas invisibles: los comodines sin glifo, las figuras españolas sin lámina, y ahora todas las de número. Ninguna dio nunca un error, porque una textura en blanco es una textura válida — y</sub>
- **CADA FAMILIA TRAE SU EXTENSIÓN, Y SE DECLARA.** <sub>línea 1644</sub>
  <br><sub>Las francesas son `.webp` de 22 KB y las españolas `.png` de 50 KB, tal como vinieron de Commons. Convertirlas a un formato común obligaría a redistribuir una VERSIÓN NUESTRA de una obra CC BY-SA, y eso arrastra la licencia a un</sub>
- **BORRAR DEL CACHÉ NO REPINTA LA CARTA QUE YA ESTÁ EN LA MESA.** <sub>línea 1694</sub>
  <br><sub>Aquí había un `delete this.cachedMaterials[key]` con el comentario «invalidate cached material so it re-renders with image». Y no: el reparto ocurre antes de que carguen las imágenes, así que la carta se monta con el material de la figura</sub>
- **UNA CARTA PUEDE IR TAPADA POR SÍ MISMA, no sólo la zona entera.** <sub>línea 1793</sub>
  <br><sub>`faceDown` es de la llamada, así que una mano con dos cartas vistas y seis tapadas —lo normal en entropy, y en cualquier juego con robo— obligaba a DOS llamadas. Y dos llamadas es lo que rompía el dibujo:</sub>
- **EN UNA REJILLA, LA CARTA SE IDENTIFICA POR SU HUECO — NO POR SU CARA.** <sub>línea 1808</sub>
  <br><sub>Esto era siempre `${zona}_${cara}_${idx}`. En un abanico está bien: las cartas se mueven y conviene seguir a cada una. En una rejilla es al revés — el hueco 3 es el hueco 3 pase lo que pase, y lo que</sub>
- **De dónde salió esta carta, anotado AQUÍ, que es el único sitio** <sub>línea 1843</sub>
  <br><sub>donde se sabe. El identificador de pista (`zona_cara_idx`) no se puede volver a partir: la cara puede llevar guiones bajos dentro —`num_7|E6A817|◆`— y cualquier expresión regular se equivoca de</sub>
- **EL TEMBLOR SE SORTEA UNA VEZ POR CARTA, NO EN CADA DIBUJO.** <sub>línea 1852</sub>
  <br><sub>Los montones llevan un desvío mínimo al azar para que no parezcan apilados con escuadra. Estaba con `Math.random()` aquí dentro — y esto corre en CADA sondeo de estado, o sea una vez por segundo. Así que el</sub>
- **EL GROSOR DE UNA PILA SE SUMA AQUÍ, EN EL DESTINO.** <sub>línea 1881</sub>
  <br><sub>Una carta que representa un montón se engorda en su Z local —que tumbada apunta al cielo— y hay que subirla la mitad de lo que crece, o queda medio hundida en el fieltro. Esa subida se hacía FUERA, en</sub>
- **CON LA PESTAÑA OCULTA NO SE ANIMA: SE COLOCA Y YA.** <sub>línea 1991</sub>
  <br><sub>Chrome congela `requestAnimationFrame` en pestañas que no se ven, y el bucle de este motor es quien llama a `TWEEN.update`. O sea que mientras miras otra pestaña nadie avanza las animaciones — pero el</sub>
- **EN UNA REJILLA NO SE REPARTE DANDO TUMBOS.** <sub>línea 2015</sub>
  <br><sub>La carta nacía con una rotación aleatoria en los tres ejes y viajaba girando hasta su sitio. Repartiendo una mano de póker eso es precisamente la gracia; sobre una rejilla es</sub>
- **UNA CARTA QUE YA ESTÁ EN SU SITIO NO SE ANIMA HACIA SU SITIO.** <sub>línea 2062</sub>
  <br><sub>Esto creaba dos animaciones por carta en CADA sondeo de estado —una vez por segundo— aunque no se hubiera movido nada. Con el temblor ya estable (ver arriba), la inmensa mayoría de las</sub>
- **EL PANEL SE PLIEGA.** <sub>línea 2129</sub>
  <br><sub>`mesa3d.css` tiene desde siempre la regla `.collapsed #hud-content` con su transición, y esta cabecera ya llevaba `id="dockBtnToggle"` — un nombre que sólo tiene sentido si algo lo pulsa. No había botón ni había</sub>
- **CERO NO ES ESTRECHO: ES «NO LO SÉ».** <sub>línea 2170</sub>
  <br><sub>Esto era `innerWidth < 820` a secas, y `innerWidth` vale 0 en una pestaña que todavía no se ha compuesto. Cero es menor que 820, así que un monitor de 27 pulgadas se llevaba la vista de teléfono — la mesa sin</sub>
- **`legal_moves` PRIMERO.** <sub>línea 2191</sub>
  <br><sub>Los dos campos son el mismo dato con dos nombres —veintiún juegos publican ambos con idéntico valor— y el canónico es `legal_moves`: lo publican los treinta, y `legal_actions` sólo veintiuno.</sub>
- **BLACKJACK NO OFRECÍA NINGUNA.** <sub>línea 2221</sub>
  <br><sub>tres palabras, imposibles de deducir mirando— y su panel no las daba: había que escribirlas. Salió en la pasada de las 35, midiendo cuántos botones `.mesa-jugada` hay en cada juego. Blackjack: cero.</sub>
- **REPITIENDO VA PRIMERO: aquí no ha terminado TU partida, ha terminado la** <sub>línea 2241</sub>
  <br><sub>que estabas mirando, y la pantalla de fin ofrecería tres botones que `sendMove` rechaza. Lo que hace falta es la salida a jugarla tú.</sub>
- **AL TERMINAR, LA PANTALLA DE FIN — Y NO ES UN ADORNO.** <sub>línea 2257</sub>
  <br><sub>Aquí salía el botón «nueva» pelado, sin resultado, sin forma de compartir la partida ni de aportarla. Y es el momento en que alguien decide si juega otra o cierra la pestaña; en un blackjack, que es una mano detrás de otra,</sub>
- **LOS VERBOS SALEN ABAJO, Y ESTE ES EL SEGUNDO DE TRES CAMINOS DE PANEL.** <sub>línea 2277</sub>
  <br><sub>Una carta se juega tocándola en la mesa. Lo que NO está en la mesa —robar, plantarse, pasar— no se puede tocar en ninguna parte, y ésos son los únicos botones que una persona necesita pulsar de verdad.</sub>
- **AQUÍ HABÍA UN `flip(zona, indice)` VACÍO, Y CONTABA UNA HISTORIA.** <sub>línea 2318</sub>
  <br><sub>Su cuerpo entero eran tres comentarios y un `if` sin nada dentro. Empezaba así:</sub>

### `public/arcade/js/visualizadores.js`

- **POR QUÉ EXISTE ESTE FICHERO** <sub>línea 5</sub>
  <br><sub>El visualizador de cada juego se declaraba en SU PÁGINA:</sub>
- **AQUÍ SÓLO VAN LOS VISUALIZADORES A MEDIDA.** <sub>línea 22</sub>
  <br><sub>`mesa_cartas.mjs` y `mesa_tablero.mjs` no: ésos se eligen por lo que el juego PUBLICA —zonas y ninguna rejilla es de cartas—, que es un dato que ya existe y no hay que declarar. Ponerlos aquí sería declarar lo deducible, y ese es justo el</sub>
- **SABER SER INVITADO NO ES UN INTERRUPTOR: SE COMPRUEBA UNO A UNO.** <sub>línea 56</sub>
  <br><sub>Estos visualizadores se escribieron cuando cada juego tenía una página para él solo, y por eso cada uno es dueño de todo: pone su cámara, monta sus controles, añade sus luces a la escena, pinta su propio panel y pregunta al hub por SU</sub>

### `public/arcade/js/xiangqi_visualizer.js`

- **MÁS LEJOS QUE LOS DEMÁS, PORQUE ESTE TABLERO ES MÁS GRANDE.** <sub>línea 14</sub>
  <br><sub>Estaba en `(0, 10, 8)` — la misma cámara que reversi y damas, que son 8×8. El xiangqi es 9×10, así que se salía por abajo del encuadre: se veía bien pero incompleto, y con el ratón recién puesto eso molesta de</sub>
- **Aquí había `OFFX = -3.5, OFFZ = -4.0`, inventados.** <sub>línea 178</sub>
  <br><sub>dónde coloca este fichero las piezas: `position.set(c - 4, y, r - 4.5)`. Media casilla de error basta para que el clic caiga en la vecina y, al no coincidir con ninguna jugada legal, no ocurra nada.</sub>

## El ProtoHub y el sustrato

### `public/arcade/js/protohub/asientos.js`

- **LAS TRES PUERTAS SON LA MISMA MESA** <sub>línea 15</sub>
  <br><sub>Esto no es un modo «contra la IA» pegado al juego. Los tres controladores reciben LO MISMO —el estado y la lista de jugadas legales— y devuelven una de esas jugadas. Por eso una partida entre una persona y un modelo produce el</sub>
- **UNA POLÍTICA NO ES UN MODELO, Y AQUÍ SE NOTA** <sub>línea 23</sub>
  <br><sub>`casa` recibe la partida entera porque es código: le pregunta al juego su sugerencia. Un modelo sólo recibe texto y no puede tocar nada. Esa frontera está en `politicas.js` y aquí se respeta — un modelo no puede hacer lo que</sub>
- **SE PIDE LA DIRECCIÓN, NO SE ADIVINA. `proveedores.js` trae `ollama`** <sub>línea 59</sub>
  <br><sub>apuntando a `127.0.0.1:11434`, que va de maravilla con la página servida en local y NO puede funcionar desde `https://alisa.systems`: un navegador no deja que una página segura llame a `http://`. Fingir que sí y fallar en silencio</sub>
- **Cuando el modelo no acierta a elegir NO se juega por él en** <sub>línea 137</sub>
  <br><sub>silencio: se devuelve `null` y quien llama decide. En el banco eso se cuenta como «forzada» y se publica el porcentaje; una mesa que rellenara el hueco sin decirlo estaría regalando</sub>

### `public/arcade/js/protohub/atmosfera.js`

- **DE DÓNDE SALE ESTO: DE MIRAR LA HOJA DE CONTACTOS DE LOS 38.** <sub>línea 7</sub>
  <br><sub>Diez juegos —cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebaño, pradera y nave— tienen EXACTAMENTE la misma cara: damero azul y blanco, cubitos marrones alrededor, un cono amarillo por jugador. Pradera y rebaño son el mismo</sub>
- **Y EL LISTÓN LO PUSO OSCAR: «fíjate en el cucco swarm».** <sub>línea 19</sub>
  <br><sub>Se abrió y se miró. Lo que hace que ese prototipo se vea otra cosa NO es geometría —siguen siendo cubos, igual que aquí—. Es:</sub>
- **EL AMBIENTE LO DECLARA EL JUEGO, NO SE ADIVINA POR EL NOMBRE.** <sub>línea 34</sub>
  <br><sub>`sustrato().rejilla.ambiente = 'pradera'`. Adivinar por el id sería otra lista paralela, y este repositorio lleva ocho arregladas. Quien no declare nada se queda exactamente como está: ningún juego cambia sin pedirlo.</sub>
- **Y THREE SE PASA, NO SE IMPORTA.** <sub>línea 40</sub>
  <br><sub>páginas cargan tres versiones distintas de three (r128, r160, r170) y un import fijo las obligaría a todas a la misma. Ya nos costó caro una vez con TWEEN.</sub>
- **EL CIELO ES UNA ESFERA POR DENTRO, NO UN `background` DE COLOR.** <sub>línea 142</sub>
  <br><sub>Un `scene.background` plano no tiene degradado, y el degradado es justo lo que hace que el horizonte exista. Se pinta en un lienzo de 2×N —dos píxeles de ancho bastan, la textura se estira— y se mete en una esfera vista desde dentro.</sub>

### `public/arcade/js/protohub/dados.js`

- **POR QUÉ EXISTE** <sub>línea 8</sub>
  <br><sub>Los dados estaban en el SUSTRATO y no existían como OBJETO. Los tres juegos que los usan publican exactamente el mismo vocabulario —`d6_5` dentro de una zona— y ninguno de los dos pintores sabía qué hacer con él:</sub>
- **ES UN DADO, NO UNA IMAGEN DE UN DADO.** <sub>línea 24</sub>
  <br><sub>Las seis caras están donde deben: las opuestas suman siete (1-6, 2-5, 3-4). Eso no es pedantería de aficionado: si mirases el dado desde otro ángulo —y en una mesa 3D se puede orbitar— un dado con las caras mal puestas se nota, y un dado que se nota</sub>
- **Y THREE VA POR PARÁMETRO, como en `tapete.js` y `mueble.js`: esto lo cargan** <sub>línea 32</sub>
  <br><sub>páginas con tres versiones distintas del motor y una importación fija las obligaría a todas a la misma.</sub>
- **EL ORDEN DE LAS CARAS LO MANDA `BoxGeometry`, NO YO.** <sub>línea 78</sub>
  <br><sub>Sus materiales van [+X, −X, +Y, −Y, +Z, −Z]. Con el 1 arriba y el 2 al frente —que es como se fotografía un dado— las opuestas suman siete solas.</sub>

### `public/arcade/js/protohub/descripcion.js`

- **POR QUÉ SE SACA DE AHÍ** <sub>línea 7</sub>
  <br><sub>En cuanto un LLM pueda ocupar un asiento en una PÁGINA —jugando contra una persona, contra una política o contra otro modelo— tiene que leer exactamente el mismo texto que lee en el banco. Si la página se escribiera su propia</sub>
- **Y POR QUÉ EL TEXTO NO SE HA MEJORADO AL MOVERLO** <sub>línea 16</sub>
  <br><sub>Da la mano usar `TITULOS` —diría «Póker» y «Go Fish» en vez de «Poker» y «Gofish»—. No se toca: hay números publicados medidos con ESTE texto, y cambiar el prompt cambia lo que se mide. Se cambiará el día que se vuelva a</sub>
- **SI SE CORTA LA LISTA DE JUGADAS, SE DICE.** <sub>línea 39</sub>
  <br><sub>Esto era `.slice(0, 12)` a secas. Lo encontré JUGANDO por esta puerta, que es lo único que lo destapa: en una mano de entropy las reglas me ofrecían seis `descartar_y_voltear` y la descripción me enseñó cuatro. Dos jugadas legales que</sub>
- **EL OBJETIVO VA LO PRIMERO, ANTES QUE LOS PUNTOS.** <sub>línea 62</sub>
  <br><sub>Porque los puntos no significan nada sin él. «Puntos: -11» puede ser bueno o malo, y no había forma de saberlo: yo lo deduje jugando dos manos y mirando hacia dónde se movía el número.</sub>
- **CON QUÉ NORMAS SE JUEGA, DICHO EN VOZ ALTA.** <sub>línea 81</sub>
  <br><sub>Damas es el primer juego con normas variables: la dama puede volar o no, el peón puede comer hacia atrás o no. Una persona lo ve en el tablero a la primera jugada; un agente que juega por esta puerta NO VE NADA, y sin esta línea supondría las</sub>
- **LO QUE HAY SOBRE LA MESA, CONTADO CON PALABRAS.** <sub>línea 104</sub>
  <br><sub>Esto no existía, y era el agujero más grande del proyecto sin que se notara. La descripción decía nombre, puntos, turno y la lista de jugadas legales — y ya. Medido el 2026-08-06 sobre los diecinueve juegos: **ninguno** aportaba</sub>
- **NO SE INVENTA NADA.** <sub>línea 118</sub>
  <br><sub>exactamente los mismos campos que `mesa.html` dibuja en pantalla. Si un juego no publica su tablero, aquí no aparece — y eso es un hueco del juego, no de esta función, y así se ve.</sub>
- **ESTO CAMBIA EL PROMPT, O SEA QUE CAMBIA LO QUE SE MIDE.** <sub>línea 123</sub>
  <br><sub>Los números publicados hasta hoy se sacaron con la descripción pobre. No son comparables con los de después, y no se debe mezclarlos en una misma tabla: un modelo que suba no habrá mejorado, es que por fin ve la mesa. Al volver a</sub>
- **SE FILTRA POR LA FORMA DEL DATO, NO POR UNA LISTA DE NOMBRES.** <sub>línea 152</sub>
  <br><sub>Lo fácil sería `if (k === 'palos' || k === 'simbolos' || …)`. Y sería otra lista paralela: el día que un juego llame `pinturas` a lo mismo, vuelve a colarse, y el que la mantenga no se enterará. La configuración de dibujo se reconoce por cómo</sub>
- **LOS ESPACIALES, CONTADOS COMO SE CUENTAN ELLOS.** <sub>línea 202</sub>
  <br><sub>`mancala`, `snake`, `fagocito` y `peaton` publican listas de coordenadas. El barrido genérico las sacaba en JSON crudo —`[{"x":13,"y":13},…]`— y eso para un agente sin visión es tan opaco como no decir nada: tendría que reconstruir un</sub>
- **`board` Y `tablero`.** <sub>línea 288</sub>
  <br><sub>Go publica su rejilla desde siempre —en `board`, en inglés— y como aquí se buscaba `tablero`, la medición dijo que go «no publica su tablero» y casi le abro un hueco en el backlog. No le faltaba nada: le faltaba una</sub>
- **MATE, AHOGADO Y JAQUE: SE PUBLICABAN Y NO SE DECÍAN.** <sub>línea 314</sub>
  <br><sub>`is_checkmate` (ajedrez, xiangqi), `is_stalemate` (ajedrez) y `ahogado` (xiangqi) llevaban ahí desde siempre y ningún consumidor los nombraba. Un agente sin visión no se enteraba de que le habían dado mate: sólo veía que</sub>
- **SI LA MESA ENSEÑA UN 12, AQUÍ NO PUEDE PONER `B_R`.** <sub>línea 332</sub>
  <br><sub>Un juego puede declarar `cara: 'valor'`: que su palo no pinta nada y lo que identifica a la carta es su valor. Entropy lo hace —se suman valores y se anulan dos iguales en la misma columna— y la mesa de casino ya dibuja el</sub>
- **LAS CASILLAS VAN NUMERADAS, PORQUE LAS JUGADAS LO ESTÁN.** <sub>línea 356</sub>
  <br><sub>Decía `Tu caja: 9 ? ? ? 2 ? ? ?` y ofrecía `cambiar:0 … cambiar:7`. Para cambiar el 9 —que es la peor carta que tengo— hay que deducir que ocupa el hueco 0, contando de izquierda a derecha y suponiendo que se empieza en cero.</sub>
- **ESTE BARRIDO EXISTE POR UNA EQUIVOCACIÓN MÍA, Y ES LA MEJOR PARTE.** <sub>línea 411</sub>
  <br><sub>Al medir salió que cinco juegos «no publicaban nada que contar»: go, mancala, snake, fagocito y peaton. Era falso. Los cinco publicaban de todo —`board`, `snake`, `food`, `maze`, `ghosts`, `frog`, `hazards`— sólo</sub>
- **`objetivo` ya va de titular, LO PRIMERO de todo.** <sub>línea 434</sub>
  <br><sub>veces —una bien redactada y otra en crudo cuarenta palabras después— y en pradera o sigilo eso son sesenta palabras repetidas en el prompt de cada turno. Lo vi al leer la puerta de texto, no midiendo: las dos</sub>
- **ESTO ES LO QUE HACE QUE UN GÉNERO NUEVO NO CUESTE NADA.** <sub>línea 466</sub>
  <br><sub>Los diecinueve juegos anteriores necesitaron un caso especial cada uno en `contarLaMesa` —bazas, gofish, entropy, los espaciales— porque cada uno publicaba su estado de una forma. Un juego que publica `sustrato(p)` no</sub>
- **NO LO SÉ» NO ES LO MISMO QUE «ESTÁ VACÍO».** <sub>línea 486</sub>
  <br><sub>El contrato del terreno sabía decir vacío, muro, destino y cuenta — y nada más. Cuando llegó el primer género con observabilidad parcial, una casilla sin explorar no tenía cómo</sub>
- **`sinVista` es OTRA ignorancia, y se lee distinto.** <sub>línea 502</sub>
  <br><sub>`?` es «no sé qué hay aquí». La coma es «sé qué hay y no veo quién anda»: conoces el pasillo, no sabes si está vacío. Sin distinguirlas, un modelo leería como desconocido un sitio que</sub>
- **EL JUEGO PUEDE DECIR SUS SÍMBOLOS, Y CONVIENE QUE LO HAGA.** <sub>línea 513</sub>
  <br><sub>Por defecto se usa la inicial del tipo, y eso choca en cuanto hay dos que empiezan igual: en sokoban, `caja` y `caja_ok` salían las dos como `C` y el mapa era ilegible — para una persona y para un modelo.</sub>

### `public/arcade/js/protohub/enlace_repetidor.js`

- **EL NOMBRE DE LA PÁGINA NO ES EL DEL JUEGO, Y ESO MUERDE.** <sub>línea 12</sub>
  <br><sub>Las reglas se llaman `damas` y la página es `checkers.html`; el go, el ajedrez y el xiangqi vienen con la misma herencia. Un enlace construido con la clave de las reglas da un 404 elegante que parece que el repetidor no funciona.</sub>
- **LAS NORMAS VAN EN EL ENLACE.** <sub>línea 49</sub>
  <br><sub>Damas es el primero con normas variables (`damaVuela`, `peonComeAtras`), y en cuanto existe una variable, `{juego, semilla, jugadas}` deja de identificar una partida: la misma lista es legal con unas normas e ilegal con otras. El</sub>
- **CERO JUGADAS TAMBIÉN TIENE ENLACE, Y ES LA MITAD DE LOS AVISOS.** <sub>línea 71</sub>
  <br><sub>La primera versión devolvía `null` sin jugadas, y midiéndolo contra el buzón real resultó que la mayoría de los avisos son de gente que escribe NADA MÁS ABRIR: «ni idea tengo de cómo se juega», «esto no iría con dos barajas».</sub>

### `public/arcade/js/protohub/fichas.js`

- **POR QUÉ ESTO ES DISTINTO A `dados.js` Y A `tapete.js`** <sub>línea 8</sub>
  <br><sub>Un dado se dibuja donde le digas. Una carta también. Una ficha de dominó NO: su sitio depende de la que tiene al lado, y la forma de la cadena entera sale de cómo se jugó, no de una matriz declarada. Es la primera geometría de la casa que no se</sub>
- **LOS DOBLES SE CRUZAN, Y NO ES ADORNO.** <sub>línea 18</sub>
  <br><sub>En una mesa de verdad el doble se pone atravesado. Sirve para algo: marca a simple vista dónde está, y como ocupa la mitad de largo, la cadena cabe más. Aquí se hace igual porque además es lo que espera cualquiera que haya jugado — y una cadena donde</sub>
- **DÓNDE VA CADA FICHA DE LA CADENA.** <sub>línea 111</sub>
  <br><sub>La cadena se va colocando en línea y, cuando se pasa de largo, DOBLA. No es un adorno: sin doblar, una partida entera son veintiocho fichas en fila —más de veinte unidades— y no cabe en ninguna mesa ni en ninguna pantalla sin alejar la cámara</sub>
- **Y EL DOBLE OCUPA LA MITAD, porque va cruzado.** <sub>línea 123</sub>
  <br><sub>los demás quedaría un espacio muerto a cada lado y la cadena se leería rota.</sub>

### `public/arcade/js/protohub/final.js`

- **HASTA AHORA NO PASABA NADA.** <sub>línea 5</sub>
  <br><sub>El panel de jugadas empezaba así:</sub>
- **Y ES EL PEOR SITIO POSIBLE PARA UNA PANTALLA MUERTA.** <sub>línea 25</sub>
  <br><sub>El final de una partida es el momento exacto en que alguien decide si juega otra o cierra la pestaña. En un blackjack —que es una mano detrás de otra— quedarse sin salida al terminar la primera es perder al jugador en su primer minuto.</sub>
- **APORTAR LO DECIDE QUIEN JUEGA, SIEMPRE.** <sub>línea 40</sub>
  <br><sub>Es un botón y no algo automático. Aportar publica la partida en un corpus abierto que cualquiera se puede descargar, y eso no se hace por nadie sin preguntar por mucho que la partida sea de damas y no diga nada de quien la jugó.</sub>
- **EL RELOJ DEL APORTE SE CORTA ANTES DE REHACER LA CAJA.** <sub>línea 60</sub>
  <br><sub>`innerHTML = ''` borra los nodos y NO los temporizadores: un `setInterval` de un pintado anterior seguiría vivo, apuntando a una casilla que ya no está en la página, y llegaría a mandar la partida por su cuenta. La firma `@final` hace</sub>
- **JUGAR OTRA» VALE PARA LOS 35, LA OFREZCA EL JUEGO O NO.** <sub>línea 106</sub>
  <br><sub>Los diecisiete que publican `nueva` la mandan por ahí; en los otros dieciséis el ProtoHub la entiende igual —`move('nueva')` es un `reset`, y está escrito en su código con ese propósito—. Así que no hay dos caminos ni una lista de</sub>
- **Y POR ESO LA CASILLA TIENE QUE VERSE ANTES, NO DESPUÉS.** <sub>línea 151</sub>
  <br><sub>Marcado por defecto está bien; marcado y escondido, no. La diferencia entera entre las dos cosas es que se vea qué va a pasar y se pueda decir que no ANTES de que pase, sin buscarlo. Por eso hay una espera corta y visible: la casilla sale</sub>
- **QUÉ VIAJA, Y POR QUÉ SE PUEDE ENSEÑAR ENTERO.** <sub>línea 158</sub>
  <br><sub>`{juego, semilla, jugadas}` y nada más. No hay nombre, ni cuenta, ni de dónde vienes: una partida de damas no dice nada de quien la jugó. Y `qué se manda` lo enseña literal, igual que hace el buzón de avisos — nadie manda a ciegas algo que</sub>
- **Y EL CORPUS NO SE FÍA DE ESTO, QUE ES LO BUENO.** <sub>línea 165</sub>
  <br><sub>La puntuación no se manda para que la crean: el servidor vuelve a jugar la partida y RECALCULA. Una partida inflada, una jugada ilegal o una semilla que no cuadra se rechazan solas. Por eso esto puede estar abierto a cualquiera sin moderación, sin</sub>
- **EN LOCAL NO SE APORTA, Y NO ES SÓLO POR EL ERROR DE CONSOLA.** <sub>línea 175</sub>
  <br><sub>`/api/dataset` vive en el servidor: sirviendo el sitio con `servir.py` un POST contesta **501 Unsupported method**, y eso lo apunta el navegador aunque el fetch esté capturado. Lo suspendió el laboratorio en sokoban —que termina en una jugada,</sub>
- **HAY DOS CAMINOS DE PANEL, Y LO DESCUBRÍ CON EL FINAL YA ESCRITO.** <sub>línea 271</sub>
  <br><sub>Cablé la pantalla de fin en `jugadas.js`, abrí un blackjack, lo jugué hasta el final... y salió el «nueva» pelado de siempre. Blackjack no pasa por ahí: los visualizadores propios usan el `pintarJugadasPulsables` de su motor, que es otra</sub>

### `public/arcade/js/protohub/gestos.js`

- **ESTO VIVE APARTE PORQUE SI NO SE COPIA CUATRO VECES.** <sub>línea 10</sub>
  <br><sub>Lo escribí dentro de `mesa_tablero.mjs` para sus quince juegos, y a los dos días hacía falta igual en snake, fagocito y peatón, que tienen visualizador propio. Cuatro copias de la misma cuenta es como se consigue que tres se arreglen y una</sub>
- **Y NADA QUE NO ESTÉ EN `legal_moves` SALE DE AQUÍ.** <sub>línea 17</sub>
  <br><sub>El gesto no decide la jugada: propone una dirección y se manda sólo si está en la lista. Un atajo que pudiera mandar algo ilegal sería un atajo que se cree las reglas. El panel sigue estando y sigue siendo la lista literal que ve un agente:</sub>
- **SIN REDONDEAR A CASILLAS, y esto costó encontrarlo: sokoban tiene una** <sub>línea 52</sub>
  <br><sub>rejilla de 5x3 que la mesa escala para llenar la pantalla, así que una casilla mide media pantalla y un deslizamiento normal empieza y acaba DENTRO de la misma. Restando casillas salía cero y el gesto no hacía nada.</sub>
- **LA PANTALLA NO ESTÁ ALINEADA CON LA MESA: LA CÁMARA GIRA.** <sub>línea 91</sub>
  <br><sub>«Arriba» tiene que ser arriba EN LA MESA, no en el cristal. Si se tomara el gesto en píxeles, en cuanto alguien girase la vista un poco, deslizar hacia arriba movería en diagonal. Así que se convierten los dos extremos</sub>
- **SE PUBLICA EN `window` Y NO CON `export`, Y NO ES DEJADEZ.** <sub>línea 124</sub>
  <br><sub>Quien más lo necesita es `SovereignBoardEngine.js`, y los motores y los visualizadores viejos de esta casa NO son módulos: son scripts clásicos que se hablan por globales. Un `export` aquí los dejaría fuera, que son justo los ocho</sub>
- **CAMBIAR UNA NORMA RECARGA LA PÁGINA, Y ES LO CORRECTO.** <sub>línea 144</sub>
  <br><sub>Las reglas se construyen al montar la mesa, así que cambiarlas a media partida dejaría jugadas ya hechas bajo unas normas y las siguientes bajo otras: un recibo que no se puede volver a jugar de ninguna manera. Recargar empieza una partida</sub>

### `public/arcade/js/protohub/habitacion.js`

- **QUÉ RESUELVE, QUE NO ES DECORACIÓN.** <sub>línea 7</sub>
  <br><sub>Hoy hay dos cosas que no se tocan: salas 3D preciosas SIN juego dentro (`room_pocket_blanco`, `room_sovereign_casino`) y juegos que funcionan flotando en un vacío negro (`entropy.html`). El cruce —una mesa de verdad, en</sub>
- **Y POR QUÉ NO SE REUSA `ArcadeTableRoomFactory`.** <sub>línea 18</sub>
  <br><sub>Existe, y hace casi esto — pero carga `Table.glb` y pone DOS mesas fijas en x=±2.5, porque su trabajo es montar un salón de arcade entero. Aquí ya hay una mesa dibujada por el juego, en el sitio que el juego decide. Meter la factory</sub>
- **TODO ES GEOMETRÍA PROCEDURAL, CERO DESCARGAS.** <sub>línea 29</sub>
  <br><sub>Seis mallas y ninguna textura. Una sala que tarda en aparecer no es una sala: es un juego que empieza tarde, y esto se abre desde un enlace que alguien comparte por el móvil.</sub>
- **LA SALA TIENE QUE CONTENER A LA CÁMARA, Y ESO NO ES OBVIO.** <sub>línea 50</sub>
  <br><sub>La primera versión medía 15 de radio y 6,5 de alto — proporciones de una habitación de verdad. Pero la cámara de la mesa mira desde (0, 9,5, 12,5): a NUEVE de altura, o sea **por encima del techo**, y a 12,5 del centro con la</sub>
- **Y LA MESA VA DEBAJO DEL FIELTRO, NO EN VEZ DE.** <sub>línea 79</sub>
  <br><sub>Una mesa de casino es madera Y tapete: el verde es la superficie de juego y hace falta para que una carta blanca se lea. Así que el modelo se mete por debajo y el fieltro se queda donde está, que además es ovalado a propósito —una mesa redonda</sub>
- **SI EL MODELO NO LLEGA, NO PASA NADA.** <sub>línea 87</sub>
  <br><sub>Devuelve `null` y quien llama se queda con lo que tenía. Un fichero que no carga no puede dejar la mesa sin superficie: se juega con lo que hay, más feo.</sub>
- **SE CARGA CON EL `GLTFLoader` DE r128, NO CON EL `AssetManager` DEL MOTOR.** <sub>línea 100</sub>
  <br><sub>Lo intenté primero con `AssetManager.loadModelAsync`, que es lo que usan las salas, y falla siempre: ese gestor no sabe leer un `.glb` por su cuenta — espera que alguien le registre un cargador con `setGLTFDelegate`, y quien se</sub>
- **SE ESCALA CADA EJE POR SU LADO, Y SÍ, ESO DEFORMA LA MESA.** <sub>línea 156</sub>
  <br><sub>Primero lo hice uniforme por el lado que más creciera, que es lo correcto cuando quieres respetar la forma de un objeto. Medido: salía **33,8 de ancho para un fieltro de 20**. El modelo es proporcionalmente más estrecho de fondo</sub>
- **EL SUELO VA POR DEBAJO DE LA MESA.** <sub>línea 192</sub>
  <br><sub>RARAS», Y LLEVABA MESES.</sub>
- **Y LA NIEBLA SE PONE AQUÍ, PERO SE GUARDA LA DE ANTES.** <sub>línea 267</sub>
  <br><sub>El motor de cartas trae su propia niebla, calibrada para una mesa flotando en negro: con paredes a quince unidades se las come enteras y la sala vuelve a parecer el vacío del que veníamos.</sub>

### `public/arcade/js/protohub/historial.js`

- **POR QUÉ ESTO NO ES DECORACIÓN.** <sub>línea 7</sub>
  <br><sub>En los sitios de cartas más usados hay hilos enteros de gente convencida de que el reparto está amañado. No es paranoia sin causa: cuando una máquina reparte y pierdes tres veces seguidas, sin nada que mirar, la sospecha es la conclusión</sub>
- **LO ÚLTIMO ARRIBA.** <sub>línea 30</sub>
  <br><sub>Se lee para saber qué acaba de pasar, no para repasar la partida desde el principio. Ordenarlo como un diario obligaría a desplazarse hasta el final cada vez, y en un móvil eso es no leerlo.</sub>

### `public/arcade/js/protohub/huella.js`

- **POR QUÉ ESTO NO ES PARANOIA** <sub>línea 12</sub>
  <br><sub>`blackjack` y `poker` leen `card_library.json`, y si esa lectura falla tienen un respaldo interno con los mismos valores copiados a mano. Medido: hoy reparten idéntico, así que el fallo no se notaría. Pero el respaldo es una</sub>
- **ESTA LISTA SE QUEDÓ CORTA Y LA HUELLA MINTIÓ.** <sub>línea 54</sub>
  <br><sub>Al añadir los juegos de baza, **hearts y spades salieron con la MISMA huella**: son juegos distintos —uno sin triunfo y se juega a perder, el otro con picas de triunfo y contando bazas— pero comparten baraja,</sub>
- **Y EL SUSTRATO, PORQUE LA HUELLA SE QUEDÓ CIEGA POR SEGUNDA VEZ.** <sub>línea 74</sub>
  <br><sub>Pasó con hearts y spades —está contado arriba— y acaba de repetirse con **cripta y pradera**: dos juegos que no se parecen en nada abren con las mismas cuatro direcciones y `turn: 'player'`, y todo lo demás en nulo.</sub>

### `public/arcade/js/protohub/jugadas.js`

- **ESTOS BOTONES SON LA INTERFAZ COMPLETA, NO UN ATAJO.** <sub>línea 6</sub>
  <br><sub>Aquí está TODA jugada legal, con su nombre — la misma lista que recibe un agente por la puerta de texto. Los clics sobre las cartas o el tablero son un añadido encima para que un humano no tenga que traducir `cambiar:5` a un</sub>
- **Y POR QUÉ ESTÁ AQUÍ Y NO DENTRO DE LA MESA DE CARTAS.** <sub>línea 17</sub>
  <br><sub>Vivía en `mesa_cartas.mjs`. En cuanto `sala.html` pasó a servir también tableros hubo que elegir entre copiarlo o sacarlo, y copiar esto es copiar la regla de oro —«nada que no esté en `legal_moves`»— con la posibilidad de que</sub>
- **EL PANEL CON LA FORMA DEL TABLERO** <sub>línea 41</sub>
  <br><sub>Aviso de betatester, en flota:</sub>
- **Y LA FILA 1 ABAJO, COMO EN EL TABLERO.** <sub>línea 62</sub>
  <br><sub>`y = alto - N` es exactamente la cuenta que hace `accionesDe` en el sustrato. Si aquí pusiera la fila 1 arriba, el panel sería un espejo del tablero y estaría peor que ahora: un mapa al revés se lee con confianza y lleva al sitio contrario.</sub>
- **UNA JUGADA QUE NO ES CASILLA NO PUEDE TUMBAR EL MAPA ENTERO.** <sub>línea 79</sub>
  <br><sub>La primera versión devolvía `null` en cuanto encontraba algo que no fuera `letra+número`. Con el go eso significa que 361 casillas perdían su mapa por culpa de UNA jugada: `pasar`. Y pasar es una jugada legítima y frecuente —en</sub>
- **QUÉ CUENTA COMO VERBO, Y POR QUÉ SE DECIDE AQUÍ DENTRO.** <sub>línea 118</sub>
  <br><sub>Un verbo es una jugada sin `:`, que no es una coordenada (`d2d4`) ni un número (`12`). Cruzarlo contra las piezas del sustrato sería más exacto, pero obliga a traer el sustrato hasta aquí para decidir dónde va un botón — mucha máquina</sub>
- **Y TAMPOCO ES VERBO SI ACABA EN UN SITIO, AUNQUE LLEVE PALABRA DELANTE.** <sub>línea 130</sub>
  <br><sub>Con la regla a secas, defensa metía SESENTA Y NUEVE botones en la barra: `torre_a1`, `torre_b1`… las 63 casillas del tablero con la palabra «torre» delante. No son verbos, son la misma jugada apuntando a sitios distintos, y ésas</sub>
- **MIRAR GANA SOBRE TERMINAR, Y ESE ORDEN ES DELIBERADO.** <sub>línea 199</sub>
  <br><sub>Si la partida que estás VIENDO repetirse llega a su final, aquí no ha terminado la tuya: ha terminado la de otro. La pantalla de fin ofrecería «jugar otra» y «aportar al corpus», que están rechazados mientras se mira — tres botones</sub>
- **AQUÍ PONÍA `return aviso('partida terminada')` Y AHÍ SE ACABABA LA PÁGINA.** <sub>línea 228</sub>
  <br><sub>Sin botón para jugar otra, en las treinta y cinco mesas: había que recargar. Y lo peor es que DIECISIETE juegos ofrecen `nueva` entre sus jugadas legales justo al terminar —con un comentario en el ProtoHub diciendo que es «para que</sub>
- **NO SE REPINTA EN CADA SONDEO, Y ESO NO ES UNA OPTIMIZACIÓN.** <sub>línea 241</sub>
  <br><sub>El estado se consulta cada segundo. Sin esta marca, la pantalla de fin se reconstruiría entera una vez por segundo y un botón desaparecería debajo del dedo entre el `pointerdown` y el `pointerup` — el toque se pierde y</sub>
- **AQUÍ PUSE UNA FIRMA PARA NO REPINTAR, Y EMPEORÓ.** <sub>línea 272</sub>
  <br><sub>El razonamiento era bueno y está medido: el panel se reconstruye entero cada segundo aunque la lista sea idéntica —comprobado en peatón: mismo texto, **nodo distinto** un segundo después— y los dos motores llevan justamente esa</sub>
- **SE AÑADE, NO SE QUITA.** <sub>línea 316</sub>
  <br><sub>`tacto.mjs` garantiza que las 35 mesas dejan pulsar todas sus jugadas legales, y esa garantía mide el panel. Quitar botones aquí y reformular la garantía a la vez son dos cambios grandes a ciegas; primero existe el camino nuevo, se</sub>
- **EL CRITERIO VIVE DENTRO DE `barraDeVerbos`, Y SE LE PASA LA LISTA ENTERA.** <sub>línea 324</sub>
  <br><sub>Hay TRES sitios que pintan el panel —éste, `SovereignBoardEngine` y `SovereignCardEngine`— y los tres montan ahora la barra. Filtrar en cada uno son tres copias de la misma regla, que es como acaban divergiendo: el día que</sub>
- **CASILLA EN PÍXELES, NO EN `1fr`.** <sub>línea 339</sub>
  <br><sub>Con `1fr` el mapa salía correcto y aplastado: sesenta y cuatro casillas de catorce píxeles. La causa es que el panel se encoge a su contenido, así que un ancho del 100% del padre es el ancho del contenido — se pide a sí mismo</sub>
- **EL ANCHO TOTAL ES EL LÍMITE, NO EL DE LA CASILLA.** <sub>línea 352</sub>
  <br><sub>Con el tope por casilla, un go de 19 daba 19x15 más los huecos y se salía del panel: trescientas sesenta y una etiquetas amontonadas y desbordando por la derecha. El límite de verdad es lo que mide el panel, así que se reparte</sub>
- **LA TIRA ENSEÑA VARIEDAD, NO LAS OCHO PRIMERAS DE LA MISMA FAMILIA.** <sub>línea 379</sub>
  <br><sub>Aviso de un betatester en entropy: «la carta que robó, si no la quiero, no me deja descartarla». Y la pista de ese momento le decía exactamente lo que él quería —«cámbiala por una de tu caja, o tírala, pero destapando una de las</sub>
- **NO SE QUITA NI SE AGRUPA NINGUNA.** <sub>línea 398</sub>
  <br><sub>de estos botones: la persona ve la misma lista literal que recibe un agente. Lo único que cambia es en qué orden se enseñan, y el orden no es parte del juego.</sub>
- **SEÑALAR UN BOTÓN ENSEÑA DÓNDE CAE ESA JUGADA EN EL TABLERO.** <sub>línea 427</sub>
  <br><sub>El panel dice `c3d4` y hasta ahora había que saberse las coordenadas para situarlo. Es la norma primera de la guía de Board Game Arena —enseñar la consecuencia ANTES de comprometerse— y aquí sale gratis: `sus.acciones` ya</sub>

### `public/arcade/js/protohub/mando_repetir.js`

- **Y LO PRIMERO QUE DICE ES QUE ESTO NO ES UN VÍDEO.** <sub>línea 10</sub>
  <br><sub>«Se está volviendo a jugar desde la semilla» no es un adorno: es la diferencia entre enseñar una grabación —que se puede montar— y volver a ejecutar la partida con las mismas reglas, que es lo que aquí se puede comprobar. Quien mira tiene</sub>
- **EL DE REPRODUCIR LLEVA PALABRA, Y NO ES ADORNO.** <sub>línea 19</sub>
  <br><sub>La primera versión eran cinco iconos: `⏮ ◀ ▶ ▶| ⏭`. Mirando la captura, el cuarto y el quinto son casi el mismo dibujo a tamaño de botón — y el tercero y el cuarto, los dos un triángulo. Tres de los cinco pidiendo que adivines.</sub>
- **Y LLEVA LA SALIDA, QUE ES LO QUE FALTABA.** <sub>línea 35</sub>
  <br><sub>La primera versión decía «estás viendo una partida volver a jugarse» y ya. Está bien mientras la repetición avanza, y es un callejón sin salida en cuanto termina: acabas de ver una partida entera y lo único que puedes hacer es escribir la</sub>
- **SI UNA JUGADA NO ENTRA, SE DICE CUÁL Y SE PARA.** <sub>línea 98</sub>
  <br><sub>Aquí es donde esto deja de ser una animación y pasa a ser una prueba: un recibo que no se puede volver a jugar es un recibo falso, y eso hay que verlo, no esconderlo. Es el mismo criterio que el verificador, que</sub>

### `public/arcade/js/protohub/marcas.js`

- **POR QUÉ EXISTE: ESTABA ESCRITO CINCO VECES.** <sub>línea 8</sub>
  <br><sub>`checkers_visualizer.js`, `chess_visualizer.js`, `snake_visualizer.js`, `grimorio_visualizer.js` y la mesa de cartas tenían cada uno su `marcas = []`, su `borrarMarcas()` y su geometría a mano. Cinco copias de doce líneas que</sub>
- **LO QUE ESTO NO ES** <sub>línea 20</sub>
  <br><sub>No es «reusar el motor de tablero». Ese motor es una escena entera con su propio bucle, y una página no puede montar dos. Lo que se comparte es la pieza pequeña —dónde brilla el suelo— que sirve igual a un tablero de damas que a una</sub>

### `public/arcade/js/protohub/mueble.js`

- **POR QUÉ EXISTE** <sub>línea 8</sub>
  <br><sub>Esta mesa estaba escrita DOS VECES: en `rooms/room_sala_del_huevo.html`, donde te sientas, y en `arcade/sala.html`, la sala de bolsillo a la que te lleva sentarte. Las dos con los mismos números —tapa Ø3,0 × 0,11 a 0,92 de alto, pie Ø0,68 cónico,</sub>
- **LOS VALORES SON LOS DE LA SALA DEL HUEVO, y no por antigüedad: es la sala donde** <sub>línea 25</sub>
  <br><sub>estás DE PIE y donde la mesa se ve entera. La de bolsillo declara explícitamente estar copiada de allí, así que allí está el original.</sub>
- **LO QUE NO ENTRA AQUÍ: el tapete y la baraja física.** <sub>línea 29</sub>
  <br><sub>(`tapete.js`) y la baraja vive en `ArcadeTableRoomFactory`. Esto es sólo el mueble; lo que se pone encima lo decide cada sala, que es lo que las diferencia de verdad.</sub>
- **Y NO SE USA `ArcadeTableRoomFactory` PARA ESTO, aunque suene a que debería.** <sub>línea 33</sub>
  <br><sub>Esa fábrica monta DOS mesas rectangulares clavadas en x=±2,5, con sus luces, su click global y una cámara de órbita, a partir de un GLB. La Sala del Huevo ya lo estudió y lo dejó escrito: «de esta factory NO uso la sala, pero sí sus piezas».</sub>

### `public/arcade/js/protohub/panel.js`

- **POR QUÉ EXISTE: EN 28 DE 38 JUEGOS EL AGENTE SABÍA MÁS QUE LA PERSONA.** <sub>línea 7</sub>
  <br><sub>`descripcion.js` vuelca el estado genéricamente, así que un agente lee `oro: 3. vida: 10. vida_rival: 10. bichos_en_camino: 2` sin que nadie haya escrito una línea para él. El panel, en cambio, sólo enseñaba lo que alguien se acordó de</sub>
- **Y SE ARREGLA UNA VEZ, NO VEINTIOCHO.** <sub>línea 19</sub>
  <br><sub>Lo obvio era añadirle su fila a cada juego. Serían veintiocho parches, y el juego 39 nacería otra vez mudo — que es literalmente lo que pasó con el alisápolis el día que lo escribí. Así que se hace por la misma regla que usa el describidor:</sub>
- **LO QUE NO SE ENSEÑA, Y POR QUÉ CADA COSA.** <sub>línea 26</sub>
  <br><sub>· fontanería — de dónde vino el estado, la semilla, la conexión. No es del juego. · lo que YA tiene su fila — turno, marcador, pista, triunfo, ligadas. · los objetos y las listas largas — una mano de diez cartas es un dibujo, no un</sub>
- **Y ESTO NO PUEDE SER LA LISTA QUE USA `prueba_asimetria`.** <sub>línea 33</sub>
  <br><sub>Si la comprobación ignorase exactamente lo que este fichero oculta, no podría fallar nunca — sería su propio espejo. Así que la prueba mantiene SU lista, con sus motivos, y esta de aquí es otra. Que las dos digan cosas parecidas está bien; que</sub>
- **UNA LISTA DE LISTAS TAMBIÉN SE PUEDE DECIR, Y HACÍA FALTA.** <sub>línea 74</sub>
  <br><sub>`cajas_rivales` de entropy es una caja por rival, o sea un array de arrays, y la primera versión lo tiraba por «tiene objetos dentro». Resultado: en un juego de INFORMACIÓN OCULTA, el agente leía las cajas de los demás y la</sub>
- **Con tope, y se dice cuando se corta: un panel de cuarenta filas tapa la** <sub>línea 118</sub>
  <br><sub>mesa, y cortar en silencio sería la misma clase de mentira que un `top-N` sin avisar. Doce entran de sobra en el juego que más publica. if (out.length >= tope) {</sub>
- **Y LOS SIETE CON VISUALIZADOR PROPIO, QUE NO PUEDEN IMPORTAR ESTO** <sub>línea 131</sub>
  <br><sub>Las dos mesas genéricas llaman a `filasDeEstado` y con eso quedaron veintiuno de los veintiocho. Los siete que faltaban —ajedrez, mancala, snake, peatón, blackjack, póker y entropy— tienen visualizador propio, y ésos son scripts CLÁSICOS: declaran</sub>
- **SE HACE DESDE FUERA Y NO CON SIETE PARCHES.** <sub>línea 143</sub>
  <br><sub>Cada visualizador reescribe su HUD cuando le apetece, así que no vale con inyectar un bloque una vez: lo borraría en el siguiente repintado. Y siete parches serían siete sitios donde el juego 39 vuelve a nacer mudo — que es exactamente lo que pasó</sub>
- **Y lo que el CANADIENSE repetía: su panel salía con la mano, el descarte y** <sub>línea 165</sub>
  <br><sub>una matriz de -1 que es, literalmente, el tablero escrito en números. Lo vi abriendo la captura — quince filas de las que cinco eran el dibujo otra vez. 'posiciones', 'mis_fichas', 'fichas', 'manos_rivales', 'descarte', 'descartes',</sub>
- **CADA 400 ms Y NO CADA SEGUNDO, Y NO ES UN CAPRICHO.** <sub>línea 175</sub>
  <br><sub>Con un segundo, el panel iba por detrás de tu propia jugada: haces algo, la mesa cambia, y el marcador tarda en enterarse. Lo cazó `prueba_asimetria`, que leía el panel antes de que refrescara y denunciaba al póker por esconder `puntos` cuando</sub>
- **AQUÍ NO VALE LA LISTA DE «ESO YA ESTÁ», Y ME COSTÓ UNA PASADA VERLO.** <sub>línea 193</sub>
  <br><sub>`filasDeEstado` se salta `puntos`, `turno` y el marcador porque las dos mesas genéricas ya les dan su fila. Los visualizadores propios NO — y por eso, tras el primer arreglo, ajedrez, mancala, blackjack y póker seguían escondiendo el</sub>

### `public/arcade/js/protohub/ProtoHub.js`

- **Esta es la pieza que faltaba, y faltaba en el sitio menos obvio.** <sub>línea 50</sub>
  <br><sub>Ya teníamos `Verificador.js` (re-simula la partida de otro y caza seis trampas en 0,58 ms), `Dataset.js` (355 bytes se expanden en la trayectoria entera estado-acción) y `Turing.js` (humano / máquina /</sub>
- **LAS NORMAS, SI EL JUEGO TIENE NORMAS VARIABLES.** <sub>línea 93</sub>
  <br><sub>Damas es el primero: `damaVuela` y `peonComeAtras`. Con una variable de por medio, `{juego, semilla, jugadas}` deja de identificar una partida — la misma lista es legal con unas normas e ilegal con otras.</sub>
- **POR QUÉ ESTO VIVE AQUÍ Y NO EN CADA PÁGINA.** <sub>línea 126</sub>
  <br><sub>Elegir entre las dos vías parece trivial y ya se ha fallado dos veces en un mismo día:</sub>
- **AQUÍ SE LEE `reglas.estado()` EN CRUDO, NO `this.state()`.** <sub>línea 154</sub>
  <br><sub>Y por eso el `patron` que mezcla `state()` NO llegaba: porté el go, dejé la línea puesta, y el tablero seguía saliendo con damero. El dato estaba bien declarado en las reglas, bien copiado en `state()`, y este camino</sub>
- **Y LO DECLARADO SE AÑADE POR LOS DOS CAMINOS, NO SÓLO POR UNO.** <sub>línea 165</sub>
  <br><sub>Un juego con `sustrato()` propio se saltaba la inyección de abajo. Medido en reversi: declaró `COLORES: {0:'negro', 1:'blanco'}` y el sustrato salía con `colores: null` — el dato bien puesto en las reglas y sin llegar al</sub>
- **EL OBJETIVO DEL JUEGO VIAJA CON EL ESTADO, SI EL JUEGO LO DECLARA.** <sub>línea 210</sub>
  <br><sub>Lo encontré jugando yo misma por la puerta de texto: nada me decía si convenía puntuar alto o bajo. Lo DEDUJE viendo moverse el número después de una jugada que ya creía buena — pero un agente que juega una sola</sub>
- **Y LA FORMA DEL TABLERO, POR EL MISMO CAMINO Y POR LA MISMA RAZÓN.** <sub>línea 229</sub>
  <br><sub>`PATRON` dice si el juego se juega en las CASILLAS o en las INTERSECCIONES. Lo declara el juego una vez y viaja solo, igual que el objetivo: un dato constante que hay que acordarse de copiar en cada</sub>
- **`params.action` es el hueco por el que hablan los juegos de CARTAS:** <sub>línea 286</sub>
  <br><sub>`SovereignCardEngine.sendMove(m)` envía `{action:'move', params:{action:m}}`, mientras los de tablero mandan `params.uci`. Sin esta línea, el ProtoHub recibía la jugada y contestaba "falta la jugada" — el motor</sub>
- **QUIÉN HIZO CADA JUGADA.** <sub>línea 311</sub>
  <br><sub>El recibo `{juego, semilla, jugadas}` es la traza completa y sirve para re-simular, pero es MUDO: dice qué pasó y no quién lo hizo. Y eso importa por un motivo concreto y documentado — en los sitios de cartas más usados hay</sub>
- **SI NADIE TRAE SEMILLA, SE PONE UNA.** <sub>línea 339</sub>
  <br><sub>Antes se anotaba `null` y la partida quedaba marcada «no reproducible», con el razonamiento de que mentir envenenaría el banco de pruebas. El razonamiento es bueno y la conclusión estaba mal: no hay que elegir entre</sub>
- **EL HUB SE PIDE, NO SE SUPONE.** <sub>línea 395</sub>
  <br><sub>Antes, sin decir nada, esto sondeaba `http://127.0.0.1:8741` — el hub de la colonia, que es OTRO proyecto. Consecuencias para cualquiera que no fuéramos nosotros: un error 404 en la consola en cada carga de página, apuntando a</sub>

### `public/arcade/js/protohub/rejilla.js`

- **POR QUÉ EXISTE ESTE FICHERO** <sub>línea 7</sub>
  <br><sub>Escribí Bresenham tres veces —cripta, sigilo, nave— y la búsqueda de camino cinco. Cada copia funcionaba, y ése es justo el problema: **el día que una se arregle, las otras seguirán mal**. Ya pasó con la política oscilante de</sub>
- **Y SON PURAS DEL SUSTRATO, COMO LOS PINTORES** <sub>línea 18</sub>
  <br><sub>`primerPaso` no recibe el estado del juego sino el cuadro que ve un asiento. Eso no es elegancia: es lo que impide que una política de la casa haga trampa mirando lo que su personaje no puede saber. Un algoritmo compartido que</sub>
- **`cruzarNiebla` NO ES UN DETALLE DE RENDIMIENTO: CAMBIA EL JUEGO.** <sub>línea 63</sub>
  <br><sub>Por defecto se entra en la niebla y ahí se para, porque no se puede planificar a través de lo que no se sabe: una casilla sin explorar es destino válido y callejón para el algoritmo. Eso es literalmente la exploración por frontera de</sub>

### `public/arcade/js/protohub/repetidor.js`

- **ESTO ES LA TESIS DEL PROYECTO, PUESTA DONDE SE VE.** <sub>línea 7</sub>
  <br><sub>Todo esto se sostiene sobre una frase: «cualquiera puede verificar una partida volviéndola a jugar». Está en el README, en la especificación de la API y en el verificador, que la comprueba con aritmética y no con un modelo que opine.</sub>
- **Y NO TOCA EL RENDER.** <sub>línea 18</sub>
  <br><sub>El repetidor sólo habla con el hub: reinicia con la semilla y va aplicando las jugadas. La mesa —cualquiera de las dos, tablero o cartas— dibuja lo que el hub diga, como hace siempre, porque el render es un espectador y no un nervio.</sub>
- **NO SE «REPRODUCE UN VÍDEO»: SE VUELVE A JUGAR.** <sub>línea 28</sub>
  <br><sub>No hay estados guardados ni fotogramas. Cada paso llama a `mover()` con la misma jugada que se hizo, sobre una partida creada con la misma semilla. Si el recibo fuera falso, aquí se rompería — y por eso una jugada que el juego rechaza no se</sub>
- **UNA JUGADA QUE NO ENTRA SE DICE, NO SE SALTA.** <sub>línea 89</sub>
  <br><sub>Saltarla dejaría la partida avanzando sobre un tablero que ya no es el del recibo, y lo que se viera a partir de ahí sería una ficción con aspecto de prueba. Es exactamente lo contrario de</sub>

### `public/arcade/js/protohub/reportar.js`

- **POR QUÉ EL RECIBO Y NO SÓLO EL COMENTARIO.** <sub>línea 7</sub>
  <br><sub>«Las cartas se ven raras» no se puede arreglar. «Las cartas se ven raras» más la partida exacta sí: aquí una partida se VUELVE A JUGAR con esos tres datos —es lo que hace el verificador— así que un aviso deja de ser una anécdota y</sub>
- **Y LO QUE VE EL NAVEGADOR, QUE ES LA MITAD QUE FALTA.** <sub>línea 21</sub>
  <br><sub>Va también el tamaño de la ventana y si estaba oculta. Los dos han mentido hoy: una proporción de pantalla rara descuadraba el encuadre, y con la ventana minimizada no hay fotogramas —`document.hidden`— así que la página parece viva</sub>
- **NO SE MANDA NADA SIN QUE ALGUIEN LO PULSE.** <sub>línea 28</sub>
  <br><sub>automático y no se recoge nada al cargar la página. Se manda lo que se ve en el cuadro, cuando se le da a mandar, y se dice antes de mandarlo.</sub>
- **QUÉ APARATO, Y SE DEDUCE DE TRES COSAS, NO DE UNA.** <sub>línea 70</sub>
  <br><sub>La cadena del navegador miente por diseño —un iPad lleva años diciendo «Macintosh»— y sólo por el ancho tampoco vale: una ventana estrecha en un escritorio no es un móvil, y esa</sub>
- **Se enseña ANTES de mandarlo, y se actualiza mientras se escribe.** <sub>línea 151</sub>
  <br><sub>manda a ciegas algo que no puede ver: es su partida, no la nuestra. const refrescar = () => { json.textContent = JSON.stringify(recoger(txt.value), null, 1); }; refrescar();</sub>
- **SI EL BUZÓN NO CONTESTA, NO SE PIERDE EL AVISO.** <sub>línea 175</sub>
  <br><sub>Un botón que se traga lo que alguien se ha molestado en escribir es peor que no tenerlo. Se deja el texto a la vista y se ofrece copiarlo, que es lo único que se puede prometer sin red.</sub>

### `public/arcade/js/protohub/sala.js`

- **POR QUÉ ESTO ES UN MÓDULO Y NO SIGUE DENTRO DE `mesa.html`.** <sub>línea 9</sub>
  <br><sub>Vivía ahí dentro, y ahí funcionaba: una mesa de texto que sirve a los treinta juegos, con árbitro, asientos y recibo verificable. El problema es que la mesa de casino en 3D quería exactamente lo mismo, y lo único que tenía a mano era</sub>
- **QUIÉN ERES EN ESTA SALA, Y QUE SIGAS SIENDO EL MISMO AL RECARGAR.** <sub>línea 46</sub>
  <br><sub>Sin `?yo=` se inventaba un `invitado-xxxx` en cada carga. Eso es lo que permite repartir UN solo enlace —cada navegador coge un nombre distinto y por tanto una silla distinta— pero al recargar salía otro nombre: la mesa te veía como</sub>
- **EL SECRETO DE TU ASIENTO.** <sub>línea 77</sub>
  <br><sub>La mesa lo entrega UNA vez, al sentarte, y lo exige para mover: sin él `quien` era sólo una etiqueta y cualquiera que supiera el nombre de la sala podía mandar `{quien:'motoko', jugada:…}` y mover sus piezas.</sub>
- **Y SOBREVIVE A UNA RECARGA, PORQUE SI NO TE QUEDAS FUERA DE TU SILLA.** <sub>línea 95</sub>
  <br><sub>Vivía sólo en memoria. Al recargar la página, el nombre volvía en la URL pero el secreto no: la mesa contestaba «ya estás sentado» —sin devolverlo, y hace bien, dárselo a quien diga tu nombre sería regalar la identidad— y a</sub>
- **ABRIR EL ENLACE NO TE SIENTA SI LA MESA YA ESTÁ LLENA.** <sub>línea 129</sub>
  <br><sub>Antes esto sentaba a cualquiera que abriera la página. Pasó jugando: abrí una partida de ajedrez para otra agente, alguien entró a MIRAR desde el navegador y **se llevó las negras**; la invitada se quedó de pie con las</sub>
- **EL TOPE DECLARADO MANDA SOBRE EL DESCUBIERTO.** <sub>línea 145</sub>
  <br><sub>Esto miraba `asientos_del_juego`, que la mesa DESCUBRE jugando y que vale 1 hasta que el turno cambia de manos por primera vez. Resultado visto jugando: la segunda jugadora de un entropy abrió el enlace</sub>
- **EN UNA SALA SÓLO MANDAS SOBRE TU SILLA.** <sub>línea 193</sub>
  <br><sub>Las demás las lleva quien se haya sentado en ellas, en su propia pestaña.</sub>

### `public/arcade/js/protohub/sustrato.js`

- **ESO ERA LA ARQUITECTURA, NO LA IMPLEMENTACIÓN.** <sub>línea 9</sub>
  <br><sub>fen: string          ajedrez · reversi · damas · xiangqi board: matriz 19x19  go board: lista de 14   mancala</sub>
- **ESTE FICHERO ES UN ADAPTADOR, Y ES TEMPORAL A PROPÓSITO.** <sub>línea 34</sub>
  <br><sub>Deriva el sustrato de lo que cada juego YA publica, para tener renderizadores universales hoy sin reescribir diecinueve módulos de reglas. Lo bueno es que cada juego puede empezar a publicar su `sustrato()` nativo cuando quiera y</sub>
- **ÉSTE ERA EL AGUJERO DE RAÍZ, Y ME LO SEÑALÓ FABLE REVISANDO.** <sub>línea 62</sub>
  <br><sub>El sustrato normalizó el ESTADO —`rejilla`, `piezas`, `zonas`— y las ACCIONES se quedaron fuera: cada juego tiene su microgramática (`e2e4`, `a3b4`, `a1`, `e6`) y quien dibuja no puede saber a qué casilla apunta ninguna. De ahí salen tres cosas</sub>
- **Y AQUÍ SE PUEDE DERIVAR SIN ADIVINAR NADA, QUE ES LA GRACIA.** <sub>línea 75</sub>
  <br><sub>Esta mañana escribí esto mismo en la mesa —probando `a1` y `a8` a ver cuál era legal— y lo quité, porque en flota las dos numeraciones eran legales a la vez: tocar la esquina habría jugado una casilla que no era la señalada.</sub>
- **SE EXPORTA PORQUE HACE FALTA PARA JUGADAS QUE YA NO SON LEGALES.** <sub>línea 95</sub>
  <br><sub>`acciones` es un mapa de las legales AHORA, y sirve para ofrecerlas. Pero para subrayar en el tablero lo que ACABA DE PASAR hace falta lo mismo de una jugada que ya se hizo — y ésa, por definición, ya no está en la lista.</sub>
- **Mancala NO es una lista: son dos filas de seis hoyos más dos** <sub>línea 197</sub>
  <br><sub>graneros. Publicarlo plano obligaba a cada consumidor a saberse el reparto de memoria. Aquí se dice una vez y ya está. rejilla = { ancho: 7, alto: 2, celdas: [...matriz.slice(0, 7), ...matriz.slice(7, 14)] };</sub>
- **SI EL JUEGO DICE CÓMO ES SU TABLERO, LA REJILLA LO LLEVA.** <sub>línea 224</sub>
  <br><sub>Un go y un reversi publican exactamente la misma matriz de números, así que esto NO se puede derivar: hay que preguntarlo. El juego lo declara con `PATRON` y el hub lo mete en el estado, igual que el objetivo.</sub>
- **Lo oculto se marca, no se omite.** <sub>línea 237</sub>
  <br><sub>«tres cartas boca abajo» — si aquí desaparecieran, el render mentiría diciendo que el rival no tiene nada. const mano = lista(st.mano).length ? st.mano : lista(st.player_hand);</sub>
- **Y LA MANO DEL RIVAL TAMBIÉN VIENE **TAPADA EN LUGAR DE CONTADA**.** <sub>línea 245</sub>
  <br><sub>Aquí sólo se miraba `manos_rivales`, que es un número de cartas. Poker no publica un número: publica `opponent_hand: ['??','??']` — las cartas, con la cara hacia abajo. Enmascarar así está bien y no filtra nada; lo que</sub>
- **UNA CAJA TIENE CASILLAS, Y `filter(Boolean)` LAS BORRABA.** <sub>línea 272</sub>
  <br><sub>Esto publicaba sólo las cartas destapadas, así que ocho huecos con tres cartas vistas salían como «tres cartas y cinco tapadas» — un montón, sin decir cuál estaba dónde. Y en entropy las casillas SON el juego: `cambiar:5`</sub>
- **LA CARTA QUE TIENES EN LA MANO TAMBIÉN ES UNA ZONA.** <sub>línea 301</sub>
  <br><sub>No estaba, y era la que más falta hacía: robabas y **no se dibujaba en ninguna parte**. Sabías que tenías algo porque los botones cambiaban, pero no qué — que es justo lo único que decide la jugada siguiente. Se veía</sub>
- **SÓLO CABEN AQUÍ LOS JUEGOS QUE PASAN POR EL ADAPTADOR DE ARRIBA.** <sub>línea 337</sub>
  <br><sub>Bastantes de los que faltaban en el recuento de `fichas.mjs` NO están rotos: publican su PROPIO `sustrato(p)` con su PROPIA `leyenda` ya dentro —flota, sokoban, cripta, defensa, sigilo, frentes, relevo, cabina, nave, pradera,</sub>
- **MANCALA ERA EL ÚNICO DE LOS 35 SIN LEYENDA, Y ES EL QUE MÁS LA NECESITA.** <sub>línea 368</sub>
  <br><sub>Su tablero son catorce números seguidos y las jugadas son el ÍNDICE del hoyo: `0`…`5` para un lado y `7`…`12` para el otro. Sin decir qué es cada índice, un agente que mire la pantalla ve una fila de cuentas y no puede saber cuál es su</sub>

### `public/arcade/js/protohub/tapete.js`

- **POR QUÉ ESTO ES UN MÓDULO Y NO DOS TROZOS DE CÓDIGO PARECIDOS.** <sub>línea 6</sub>
  <br><sub>El tapete existía dos veces: uno en `sala.html` y otro en la Sala del Huevo, y ya se habían separado sin que nadie lo viera — 2,68 contra 1,34, el doble de ancho. Al sentarte cambiaba de tamaño debajo de las manos. Dos copias de una</sub>
- **Y POR QUÉ SE DIBUJA EN VEZ DE CARGAR UNA IMAGEN.** <sub>línea 14</sub>
  <br><sub>No hay ningún logo en fichero: la marca de este proyecto es tipográfica. Un PNG habría que crearlo, versionarlo, servirlo y acordarse de él. Un lienzo se calcula al arrancar, escala a cualquier tamaño sin pixelarse y no añade una</sub>

### `public/arcade/js/protohub/turno.js`

- **CÓMO APARECIÓ** <sub>línea 19</sub>
  <br><sub>El calibrador comprobaba `turn === 'player'` para saber si movía el agente. En los nueve juegos de tablero eso **nunca** es cierto, así que le daba las dos manos al rival de la casa: las dos políticas jugaban idéntico y la tabla decía</sub>
- **SEGUNDA VERSIÓN.** <sub>línea 38</sub>
  <br><sub>Empecé con una lista de asientos «míos» —`player`, `white`, `red`…— y comparar contra ella. Parecía suficiente hasta que el control del arnés de agentes (`--modelo eco`, que elige siempre la primera opción y por tanto DEBE sacar lo</sub>

### `public/arcade/js/protohub/Verificador.js`

- **SI LA PARTIDA DECLARA NORMAS, TIENEN QUE SER LAS DE ESTAS REGLAS.** <sub>línea 64</sub>
  <br><sub>Damas es el primer juego con normas variables (`damaVuela`, `peonComeAtras`), y en cuanto existe una variable el recibo `{juego, semilla, jugadas}` DEJA DE BASTAR: la misma lista de jugadas puede</sub>
- **La semilla se pasa con LOS DOS NOMBRES, y no es por gusto: en el** <sub>línea 96</sub>
  <br><sub>repositorio conviven las dos convenciones — `fagocito`, `peaton` y `snake` leen `opts.seed`; `blackjack` lee `opts.semilla`. Pasando solo `seed`, las reglas en castellano arrancaban con una semilla AL AZAR y</sub>
- **NO SE ESPARCE `partida.config`.** <sub>línea 108</sub>
  <br><sub>Esto hacía `...(partida.config ?? {})`: cualquier cosa que viniera en el recibo entraba tal cual en `nuevaPartida`. El ProtoHub no emite ese campo nunca, así que no rompía nada — pero este verificador lo honraba, y</sub>
- **LA PUNTUACIÓN SE LEE DESDE LA SILLA QUE JUGÓ, NO DESDE LA 0.** <sub>línea 150</sub>
  <br><sub>Esto era `reglas.estado(p)` a secas, y el segundo argumento por defecto es la silla 0. Así que una partida jugada desde cualquier otra silla se re-simulaba perfectamente —todas sus jugadas legales, el estado final idéntico— y se</sub>
- **SE EXPORTA, Y ESO IMPORTA. `ProtoHubEnv` reimplementó esta normalización** <sub>línea 189</sub>
  <br><sub>por su cuenta y le salió mal: con `score: {black, white}` hacía `Number(objeto) || 0` y devolvía **0**. Resultado: go, reversi y mancala generaban recibos que decían «0 puntos» mientras el servidor, al re-simular,</sub>
- **ESTE `puntos` SUBIÓ AQUÍ, Y ARREGLA EL PEOR FALLO DE LA TABLA.** <sub>línea 201</sub>
  <br><sub>El escalar manda sobre el objeto porque el objeto es ambiguo: hay que saber CUÁL de los dos marcadores es el nuestro, y aquí no se sabe. if (typeof st.puntos === 'number') return st.puntos;</sub>
- **CAMINO HEREDADO, Y ESTUVO MAL DURANTE TODO EL DÍA.** <sub>línea 206</sub>
  <br><sub>Decía «el marcador del primer jugador» y preguntaba por `white` primero. En el go y en el reversi **abren las negras**, así que para esos dos juegos devolvía el marcador DEL RIVAL. Una partida de go</sub>

## Las comprobaciones

### `check_globales_huerfanos.py`

- **Sobre los falsos positivos** <sub>línea 14</sub>
  <br><sub>La primera versión buscaba `Simbolo\\s*\\.` y cazaba el `.js` de las propias rutas de import: daba por rotos `ProceduralSPE.js` y `CarverSystem.js`, que estaban perfectos. Ahora se quitan las cadenas antes de mirar el código. Un</sub>

### `check_gym_envs.mjs`

- **CONTROL POSITIVO** <sub>línea 24</sub>
  <br><sub>Un catálogo vacío y un catálogo sano dan el mismo "sin fallos". Por eso, si hay menos de 2 entornos, esto NO dice OK: dice que la prueba no vale (2). Aprendido a base de dar por bueno un silencio que solo significaba que no</sub>
- **Antes se importaba desde `src/index.js`, que es el índice del motor ENTERO:** <sub>línea 31</sub>
  <br><sub>arrastra `AlisaRenderCore` y con él `three`. En una máquina con `node_modules` no se nota; en el runner de CI —donde no los hay— reventaba con `Cannot find package 'three'`. O sea: la CI habría fallado en el primer</sub>
- **ANTES AQUÍ PONÍA `.filter(e => e.familia === 'propio')`, Y ESO DEJABA FUERA** <sub>línea 42</sub>
  <br><sub>A 35 DE LOS 41 ENTORNOS DEL BANCO.</sub>

### `check_secretos.py`

- **POR QUÉ EXISTE, Y POR QUÉ ESTABA EN FALTA** <sub>línea 8</sub>
  <br><sub>`.gitignore` lleva escrito desde hace tiempo:</sub>
- **NO GARANTIZA NADA.** <sub>línea 30</sub>
  <br><sub>como último filtro, no como permiso para no mirar.</sub>

### `check_vanilla_boundary.py`

- **ALCANCE — corregido tras un fallo real.** <sub>línea 41</sub>
  <br><sub>Este script solo miraba `src/`, así que dio "publicable ✅" mientras el ARCADE entero seguía llamando a `http://127.0.0.1:8741` desde su propio código. Al abrir una partida de ajedrez en el navegador, la página martilleaba el hub de</sub>

### `prueba_asimetria.mjs`

- **LA ÚNICA ASIMETRÍA QUE ESTE PROYECTO NO PUEDE PERMITIRSE.** <sub>línea 7</sub>
  <br><sub>El banco compara a una persona con un agente en el MISMO juego, y esa comparación sólo significa algo si los dos ven lo mismo. La puerta de texto entrega el estado entero: el describidor vuelca los campos genéricamente, así que un agente lee</sub>
- **CÓMO SE MIDE, Y POR QUÉ EN UN NAVEGADOR.** <sub>línea 27</sub>
  <br><sub>Se abre la página de verdad, se juegan unas jugadas, y se comparan DOS textos del mismo momento: lo que `describirEstado` le daría a un agente y lo que el panel tiene escrito. Se buscan los VALORES del primero en el segundo — números y palabras, no</sub>
- **Y LO QUE NO ES UNA ASIMETRÍA: LO QUE SE VE EN LA MESA.** <sub>línea 38</sub>
  <br><sub>Un agente lee `dado: [3,3]` y la persona ve dos dados con tres puntos. Eso no es información escondida, es información dibujada — y contarlo como fallo llenaría esto de falsas alarmas hasta que nadie lo mirara. Así que las excepciones se</sub>
- **Se espera a que el panel se ponga al día: el vigía de los visualizadores** <sub>línea 166</sub>
  <br><sub>propios refresca cada 400 ms, y leer antes denunciaba al póker por esconder algo que ya estaba escrito. Una prueba que corre más que la pantalla mide la carrera, no el juego.</sub>
- **SE COMPARAN VALORES, NO NOMBRES DE CAMPO.** <sub>línea 187</sub>
  <br><sub>El panel dice «Triunfo: oros» donde el estado dice `triunfo: "O"`, así que buscar la palabra `triunfo` daría un falso negativo. Lo que tiene que estar en los dos sitios es el DATO: un número, o una cadena corta que signifique algo.</sub>
- **Una excepción que ya no hace falta es una mentira guardada: se denuncia, igual** <sub>línea 229</sub>
  <br><sub>que `prueba_de_las_pruebas` denuncia un sabotaje que apunta a una prueba borrada. const sobran = Object.keys(EN_LA_MESA).filter(k => !usadas.has(k));</sub>

### `prueba_barajas.mjs`

- **LAS BARAJAS SE CONTIENEN UNAS A OTRAS. `spanish_40 ⊂ spanish_48` y** <sub>línea 27</sub>
  <br><sub>`french_52 ⊂ french_54`. Así que «pertenecen a X» casi siempre da más de una respuesta, y la buena es LA MÁS PEQUEÑA que las contiene todas: si nunca sale un 8 ni un 9, la baraja es de 40, no de 48 con mala suerte. Con pocas cartas eso se</sub>
- **QUÉ FICHA DE `games` LE CORRESPONDE A CADA JUEGO NUESTRO.** <sub>línea 49</sub>
  <br><sub>Los nombres no coinciden y no hay forma de deducirlo: nuestro `poker` es el `texas_holdem` de la biblioteca, nuestro `remigio` es `rummy_basic` y no el `chinchon`, que es el rummy de baraja española. Normalizar cadenas acertaría en</sub>
- **CANADIENSE NO ES LA CANASTA, y eso lo dijo esta prueba.** <sub>línea 76</sub>
  <br><sub>a `canasta` por el nombre, y saltó el aviso de que declara `french_54` y reparte 52. La canasta lleva comodines; este juego es el Tock/Dog —el parchís con cartas— y son 52 sin comodines A PROPÓSITO, escrito en su cabecera. La</sub>
- **Y LAS ESPECIALES, QUE NO SON PALO POR RANGO.** <sub>línea 103</sub>
  <br><sub>La primera versión sólo cruzaba palos con rangos, así que el UNIT salió con «14 fuera del catálogo: W_WILD G_REV Y_D2 B_SKIP…» y yo estuve a punto de contarlo como hallazgo. No lo era: `decks.unit_108.specials` declara SKIP, REV, D2, WILD y WD4</sub>
- **Y LLEVAN O NO PALO SEGÚN LO QUE DIGAN, no según lo que yo supusiera.** <sub>línea 111</sub>
  <br><sub>Mi primera versión añadía las dos formas —`W_<id>` y `<palo>_<id>`— a todas. Eso metió `W_JK` en la baraja francesa de 54, y como el comodín de Entropy se llama igual, Entropy pasó a repartir «una carta francesa entre cuarenta y ocho nuestras»</sub>
- **DOS COSAS QUE ME COSTARON UN VERDE FALSO DE «0 JUEGOS MIRADOS».** <sub>línea 174</sub>
  <br><sub>La primera: `mover` no devuelve la partida nueva. La MUTA y devuelve un booleano — `true` si la jugada valía. Yo escribí `p = reglas.mover(p, …)` y a partir de ahí `p` valía `true`, así que el `estado` siguiente reventaba leyendo `p.manos[0]`. Parecía</sub>
- **Y SE APUNTAN LAS JUGADAS, porque `robar_mazo` tiene forma de carta.** <sub>línea 191</sub>
  <br><sub>El recolector busca cualquier cosa con pinta de `algo_algo`, y una jugada como `robar_mazo` la tiene. Salía en el informe como «1 fuera del catálogo» en remigio y entropy, o sea acusándolos de repartir una carta inventada.</sub>

### `prueba_biblioteca.mjs`

- **LA MARCA VIVE EN DOS SITIOS, Y HAY QUE MIRAR LOS DOS.** <sub>línea 36</sub>
  <br><sub>Los de bazas y los portados la ponen en el ESTADO; blackjack y póker, en el objeto de REGLAS. La primera versión de esta prueba sólo miraba el estado, así que saltó a esos dos en silencio y cantó «todos ✓» sin haberlos mirado —</sub>
- **AQUÍ HABÍA UN `ESPERADOS = 10` ESCRITO A MANO, con los diez nombres en un** <sub>línea 68</sub>
  <br><sub>comentario al lado. Cumplía su función y traía la de siempre: al añadir el remigio la prueba se puso roja diciendo «se esperaban 10 y se han mirado 11», o sea acusando al juego nuevo de un fallo que no existía. Una prueba que hay</sub>
- **ZONAS Y NINGUNA REJILLA» NO ES «ES DE CARTAS», Y AQUÍ SE VIO.** <sub>línea 82</sub>
  <br><sub>Ésa era la definición que usaba esto —la misma que usa `montarMesa` para elegir motor— y sirvió hasta que llegó la GENERALA: cinco dados, ningún tablero, o sea zonas sin rejilla. La prueba la acusó de no publicar `biblioteca` y de estar</sub>

### `prueba_censo.mjs`

- **ESTA COMPROBACIÓN VIGILA UNA CLASE QUE EL SABOTAJE NO PUEDE VER.** <sub>línea 5</sub>
  <br><sub>Todo lo demás en este repositorio comprueba PREDICADOS: «¿esta condición detecta este fallo?». Y para eso están los sabotajes de `npm run pruebas`, que rompen a propósito lo que cada comprobación vigila y exigen que suspenda.</sub>
- **POR QUÉ EMPIEZA POR `tabla.mjs` Y NO POR OTRO** <sub>línea 23</sub>
  <br><sub>Porque es el único medidor cuyo resultado sale al dominio. Un error de denominador en los demás muere en un informe interno que se rectifica con una nota; aquí saldría publicado como una comparación persona-contra-agente falsa, en un banco</sub>
- **CÓMO, SIN PAGAR UNA PASADA ENTERA** <sub>línea 30</sub>
  <br><sub>Medir de verdad tarda minutos. Así que el medidor declara su universo con `--censo` —una línea `universo=N` y la lista— y aquí se compara con el censo canónico. Preguntar tarda un segundo.</sub>

### `prueba_clasificacion.mjs`

- **NO COMPRUEBA QUE LOS NÚMEROS SEAN BUENOS, sino que sean LOS MISMOS.** <sub>línea 20</sub>
  <br><sub>Si la medición está mal, esto sale verde igual — para eso están el calibrador y las líneas base. Lo único que vigila es que lo publicado y lo medido no se separen.</sub>

### `prueba_css.mjs`

- **ESTO ME COSTÓ UNA HORA Y NO DA NI UN ERROR.** <sub>línea 5</sub>
  <br><sub>El 15-08-2026, arreglando que los botones del ajedrez se salieran de la pantalla, escribí tres reglas distintas y NINGUNA cambió la medida. Ni un píxel, las tres veces. Revisé la cascada, la especificidad, si el fichero se</sub>
- **Y ESTE PROYECTO ES ESPECIALMENTE VULNERABLE.** <sub>línea 26</sub>
  <br><sub>Las hojas llevan comentarios enormes a propósito —el porqué de cada regla, con la medida que la justifica—, así que se editan mucho y son largos. Cuantos más comentarios, más ocasiones de dejarse un cierre.</sub>
- **Y SE CUENTAN LAS LLAVES DE FUERA DE LOS COMENTARIOS.** <sub>línea 67</sub>
  <br><sub>Esta prueba sólo miraba el BALANCE de `/*` y `*` `/`, y con eso se le escapaba el caso peor: una apertura DE MÁS. Si alguien abre un comentario delante de una regla, se cierra solo con el siguiente cierre legítimo —el balance sigue</sub>
- **Y LO SEGUNDO: EL PANEL NO PUEDE TRAGARSE TOQUES QUE VAN A LA MESA.** <sub>línea 124</sub>
  <br><sub>`jugables.css` pone `.hud-panel { pointer-events: none }` y devuelve el clic sólo a lo que HACE algo — la regla está escrita ahí y explicada: el panel flota sobre el lienzo con fondo traslúcido, así que ves el tablero por debajo, pulsas donde lo ves</sub>
- **ESTA COMPROBACIÓN EMPEZÓ SIENDO LISTA Y GRITABA EN FALSO.** <sub>línea 144</sub>
  <br><sub>El primer intento exigía que todo lo que recuperase el toque «pareciera interactivo», con una expresión regular. Acusó a tres inocentes: un trozo de comentario que mi regex leyó como selector, el propio `.hud-panel`, y</sub>

### `prueba_de_las_pruebas.mjs`

- **POR QUÉ EXISTE: EN UN SOLO DÍA, CINCO INSTRUMENTOS MINTIERON.** <sub>línea 7</sub>
  <br><sub>No uno. Cinco, el 15-08-2026, y ninguno daba error — todos salían en verde:</sub>
- **QUÉ HACE ESTO, Y POR QUÉ NO ES «PROBAR LAS PRUEBAS» POR DEPORTE.** <sub>línea 27</sub>
  <br><sub>Para cada comprobación de `npm test` hay un SABOTAJE declarado: un cambio concreto que rompe justo lo que esa prueba dice vigilar. Se aplica, se corre la prueba, y **tiene que suspender**. Si sale verde con el cable cortado, la prueba</sub>
- **CÓMO SE PROTEGEN LOS FICHEROS DE VERDAD.** <sub>línea 38</sub>
  <br><sub>El sabotaje toca ficheros del proyecto. Antes se guarda el contenido, se restaura SIEMPRE —pase lo que pase— y al final se verifica que todo quedó como estaba comparando el texto. Si algo no se pudo restaurar, se dice a gritos y se</sub>
- **EL SABOTAJE TIENE QUE ROMPER LO QUE ESA PRUEBA VIGILA, NO CUALQUIER COSA.** <sub>línea 57</sub>
  <br><sub>Meter un error de sintaxis haría suspender a cualquiera y no demostraría nada: probaría que node sabe leer. Cada sabotaje de aquí es el fallo REAL contra el que se escribió la prueba — quitarle las normas al enlace, dejar que las teclas jueguen</sub>
- **ÉSTE ES EL PRIMER SABOTAJE DE ENUMERACIÓN, Y ES OTRA COSA QUE LOS DEMÁS.** <sub>línea 123</sub>
  <br><sub>Los quince de arriba rompen una CONDICIÓN y esperan que la comprobación la eche de menos. Éste rompe el UNIVERSO: le cambia el nombre a un juego del catálogo, de modo que el conjunto medido sigue teniendo treinta y cinco</sub>
- **DOS SABOTAJES PARA EL MISMO FICHERO, Y HACE FALTA.** <sub>línea 161</sub>
  <br><sub>`prueba_fichas` vigila ahora dos cosas distintas: que lo declarado coincida con lo que hace el juego, y que las rutas que promete la ficha SE PUEDAN PEDIR. Con un solo sabotaje, la segunda estaría sin cubrir — y es justo la</sub>
- **ES OTRA PREGUNTA QUE LA DE `biblioteca`, Y POR ESO OTRO SABOTAJE.** <sub>línea 267</sub>
  <br><sub>Aquélla comprueba que los juegos LEEN el catálogo que se les pasa. Ésta, que cogen de él LA BARAJA QUE LES TOCA. Un juego francés que pidiera la española leería el catálogo impecablemente y repartiría oros en una mesa de</sub>
- **AQUÍ FALLÉ LA PUNTERÍA DOS VECES, Y ES EL ERROR TÍPICO DE ESTE FICHERO.** <sub>línea 342</sub>
  <br><sub>Primero cambié `juego: 'ajedrez'` en el catálogo: la prueba aprobó, porque enumera el catálogo y construye cada entorno — un nombre distinto se construye igual. Luego puse `reset(` a secas, que aparece también en un</sub>
- **SE SABOTEA EL PAQUETE, NO `public/`.** <sub>línea 378</sub>
  <br><sub>medido = PAQUETE if hay_paquete else PUBLIC</sub>
- **NO SE PUDO DEVOLVER A SU SITIO:')}`);** <sub>línea 473</sub>
  <br><sub>for (const f of sinRestaurar) console.log(rojo(`      ${f}`)); console.log(rojo('   RECUPÉRALOS CON `git checkout -- <fichero>` ANTES DE SEGUIR.')); process.exit(2);</sub>
- **EL CENSO SE DERIVA.** <sub>línea 486</sub>
  <br><sub>Aquí había un array `TODAS` con los nombres escritos a mano. Es la enésima lista de este proyecto que se separa de la realidad en silencio — y ésta era la peor, porque es la lista de la red de seguridad.</sub>
- **20-08: estas dos salían denunciadas como «no las corre nadie» y era FALSO —** <sub>línea 528</sub>
  <br><sub>tienen su propio mando desde el día que se escribieron. El aviso miraba sólo `scripts.test` y llamaba huérfana a cualquiera que viviera en otro guion. Se arregla abajo mirando TODOS los guiones, y éstas se quedan aquí porque abren</sub>
- **DOS LISTAS Y NO UNA, PORQUE SE PREGUNTAN DOS COSAS DISTINTAS.** <sub>línea 555</sub>
  <br><sub>`todasEnDisco` es lo que HAY. `enDisco` es lo que se vigila por huérfano, que excluye a las de `APARTE` porque de ésas ya se sabe por qué no van en `npm test`.</sub>
- **SE MIRAN TODOS LOS GUIONES, NO SÓLO `test`.** <sub>línea 569</sub>
  <br><sub>Esto leía `scripts.test` y punto, así que denunciaba como huérfana a cualquier comprobación que viviera en otro mando —`npm run figuras`, `npm run invitados`— aunque se corriera a diario. Una acusación falsa dentro del instrumento que existe</sub>

### `prueba_fichas.mjs`

- **LO IMPORTANTE ES EL CRUCE, NO LA CUENTA.** <sub>línea 14</sub>
  <br><sub>Que 35 juegos declaren un número de asientos no vale nada si el número es inventado. Lo que ata la ficha a la realidad es que, en los juegos que ADEMÁS publican marcador —uno por silla—, las dos cosas coincidan. Ahí la ficha no puede mentir</sub>
- **HAY DOS SITIOS QUE DICEN CUÁNTAS SILLAS TIENE CADA JUEGO, Y ESO SE VIGILA.** <sub>línea 30</sub>
  <br><sub>`SILLAS` en `rules/index.js` es un mapa escrito a mano que usa el árbitro de las mesas compartidas; `ASIENTOS` lo declara cada juego en sus reglas. Son el mismo dato en dos sitios, que es exactamente la clase de copia que este proyecto lleva</sub>
- **TRINQUETE: cuántos juegos declaran sus asientos.** <sub>línea 50</sub>
  <br><sub>**sólo puede subir** (con juegos nuevos). Nació en 0: hasta el 16-08 no lo declaraba ninguno y la ficha lo deducía del marcador, que existía en diez juegos y en los otros veinticinco no — así que la ficha del ajedrez, juego</sub>
- **¿SE PUEDE PEDIR LO QUE LA FICHA PROMETE, O SÓLO EXISTE EN MI DISCO?** <sub>línea 135</sub>
  <br><sub>La ficha decía «captura 35/35, derivado y listo» y no había NI UNA publicada: apuntaba a `capturas_laboratorio/`, que está en `.gitignore` porque son ficheros de trabajo que el laboratorio rehace en cada pasada. Treinta y cinco rutas que desde el sitio dan 404</sub>

### `prueba_figuras.mjs`

- **Del MATERIAL QUE LA MALLA TIENE, no de uno recién hecho.** <sub>línea 74</sub>
  <br><sub>diferencia entre esta prueba y la que ya había. const tintaDeLaMesa = (id) => { const mats = e.cachedMaterials?.[id];</sub>

### `prueba_final.mjs`

- **DE DÓNDE SALE: DE QUE NO LA HABÍA.** <sub>línea 6</sub>
  <br><sub>El panel de jugadas empezaba con `if (terminada) return aviso('partida terminada')`. Ahí se acababa la página: sin botón para jugar otra, había que recargar. Y midiéndolo salió lo que lo hace peor — DIECISIETE juegos publican</sub>

### `prueba_guardia.mjs`

- **QUÉ PREGUNTA, Y POR QUÉ NO ES LO QUE YA PREGUNTA `calibrar`** <sub>línea 9</sub>
  <br><sub>`calibrar` y `tabla` preguntan si el juego ORDENA a quien lo juega, que es una propiedad estadística de muchas partidas. Esto pregunta si ALGO SE ROMPIÓ, que es una propiedad de cada partida. Son dos preguntas distintas y hasta hoy sólo se hacía la</sub>
- **EN VERDE NO DICE NADA.** <sub>línea 34</sub>
  <br><sub>cada vez se acaba mirando en diagonal. Éste calla y, cuando habla, da el juego, la semilla y la jugada exacta — lo que hace falta para repetirlo, no para admirarlo.</sub>
- **LA AUTOPRUEBA: UN GUARDIA QUE CALLA TIENE QUE DEMOSTRAR QUE SABE HABLAR.** <sub>línea 55</sub>
  <br><sub>Con `--autoprueba` se AVERÍAN cuatro juegos a propósito, uno por cada clase de anomalía, y el guardia tiene que denunciar los cuatro. Si algún día un cambio en los detectores los deja mudos, esto sale en rojo — y sin esto, «sin anomalías en 71.861</sub>
- **Y las averías son las de VERDAD, las que ya pasaron aquí: damas y xiangqi sin poder** <sub>línea 66</sub>
  <br><sub>acabar, el panel ofreciendo jugadas que el juego rechaza, y ajedrez valiendo 0 en toda partida jugara quien jugara.</sub>
- **EL MARCADOR NO SE MUEVE» ES UNA PREGUNTA SOBRE EL JUEGO, NO SOBRE UNA PARTIDA.** <sub>línea 94</sub>
  <br><sub>La primera versión lo preguntaba por partida y en los 35 juegos disparó 25 alarmas, en brisca y tute. Todas ciertas y todas irrelevantes: en un juego de bazas se puede acabar con cero puntos legítimamente si no te llevas nada que valga, y eso no es un fallo de</sub>
- **EL MARCADOR SE LLAMA DE TRES MANERAS, Y LEER MAL DA UN FALSO POSITIVO.** <sub>línea 130</sub>
  <br><sub>En su primera pasada esto acusó a snake de tener el marcador mudo en las cinco semillas. Era mentira: yo leía `puntos` y `score.white`, y snake publica `score` como un número suelto. O sea que el fallo estaba en mi</sub>
- **AQUÍ ESTÁ LA COMPROBACIÓN QUE FALTABA EN TODO EL PROYECTO.** <sub>línea 152</sub>
  <br><sub>Se coge una jugada de la lista y se exige que `mover()` la ACEPTE. Si la lista ofrece algo que el juego rechaza, la promesa que sostiene el banco —que el panel de una persona es la misma lista que recibe un agente— es</sub>
- **JUEGA EL RIVAL DE LA CASA, NO UN CONTADOR QUE ROTA.** <sub>línea 161</sub>
  <br><sub>La primera versión elegía `movs[i % movs.length]`, y con eso la serpiente de snake se retuerce en el sitio y muere en veintiuna jugadas SIN COMER NADA. El marcador salía 0 en todas las semillas y el guardia lo denunciaba</sub>
- **NO SE MUEVE» Y «NO LO ENCUENTRO» SON DOS ANOMALÍAS, NO UNA.** <sub>línea 190</sub>
  <br><sub>La primera versión las juntaba: con el marcador ilegible el conjunto quedaba vacío, `size <= 1` se cumplía, y salía «el marcador vale siempre undefined». Eso acusa al juego de un fallo que es del lector. Un instrumento que no</sub>

### `prueba_invitados.mjs`

- **EL TESTIGO IMPORTA.** <sub>línea 57</sub>
  <br><sub>publica, así que dio «no pasó nada» en los dos sitios y estuve a punto de contarlo como que el clic estaba roto. Se mira lo que el juego SÍ publica.</sub>
- **EL AJEDREZ NECESITA DOS CLICS Y MI PRIMERA VERSIÓN DABA UNO.** <sub>línea 65</sub>
  <br><sub>Se coge la pieza y se suelta en el destino. Con un solo clic el peón queda seleccionado, el FEN no cambia y la prueba cantó «es un decorado» sobre un ajedrez que se jugaba perfectamente. La prueba estaba jugando mal, no el juego.</sub>
- **CADA CLIC A SU ALTURA, Y NO ES CAPRICHO: SON DOS PROBLEMAS DISTINTOS.** <sub>línea 76</sub>
  <br><sub>COGER la pieza: hay que apuntar A LA PIEZA (`y = 0.6`). Si se apunta al suelo de su casilla, el rayo pasa rozando la fila de delante y choca con lo que haya de pie ahí — medido: apuntando al suelo de e2 el rayo choca con `p:k:0`, el REY de</sub>
- **Y ESTO ES LO QUE ME COSTÓ CARO: probé `0.6, 0.6` y `0.02, 0.02`, las dos** <sub>línea 89</sub>
  <br><sub>combinaciones homogéneas, y las dos fallan por motivos OPUESTOS. Nunca probé la mezcla, que es la buena. Con las dos en rojo di por hecho que el fallo era del juego y se lo conté así a Oscar y al mensaje del commit. No lo era: el ajedrez</sub>
- **CUÁNTAS MALLAS SON POCAS LO DICE EL SUSTRATO, NO UN NÚMERO MÍO.** <sub>línea 180</sub>
  <br><sub>Aquí había un `< 10` escrito a ojo, y era un número de TABLERO: el ajedrez dibuja noventa y siete. El blackjack reparte cuatro cartas y con eso está entero, así que la prueba lo puso en rojo por «sólo 4 mallas» sobre un</sub>
- **Y SI NO SE PUEDE JUGAR, HAY QUE SABER SI ES CULPA DE SER INVITADO.** <sub>línea 262</sub>
  <br><sub>Aquí me pilló el ajedrez. La prueba lo puso en rojo por «se pincha y no pasa nada», y la corrección natural era buscar qué le había hecho yo al meterlo en la sala. No le había hecho nada: el clic de dos pasos del ajedrez —coger la</sub>

### `prueba_lenguaje.mjs`

- **¿Se filtra algo que el jugador no deba ver?** <sub>línea 58</sub>
  <br><sub>Se recogen las cartas que el propio juego declara PÚBLICAS y se exige que el texto no nombre ninguna otra. Que el descriptor pueda ser generoso depende de que las reglas oculten bien: esto lo comprueba, no lo supone.</sub>
- **LA INVARIANTE QUE DE VERDAD IMPORTA:** <sub>línea 90</sub>
  <br><sub>`legal_moves` son las jugadas de QUIEN TIENE EL TURNO. Cuando ese es el asiento descrito, tienen que salir de SU mano. Si alguna vez saliera una carta ajena, sería que el juego está ofreciendo jugadas de otro — y esa</sub>
- **LO QUE SE ROBA A CIEGAS NO SE PUBLICA A LOS DEMÁS.** <sub>línea 110</sub>
  <br><sub>Y ESTA COMPROBACIÓN MIRA EL ESTADO, NO EL TEXTO — que es el hueco que tenía la de arriba. La 2 pregunta «¿dice el texto algo que el estado no declare público?», o sea que **usa el estado como definición de lo público**: una</sub>

### `prueba_objetivo.mjs`

- **POR QUÉ ESTO ES UNA PRUEBA Y NO UNA NOTA EN UN CUADERNO.** <sub>línea 8</sub>
  <br><sub>Lo encontré jugando yo misma una mano de entropy, leyendo sólo lo que recibe un agente sin ojos: nada decía si convenía puntuar alto o bajo. Lo DEDUJE viendo moverse el número después de una jugada que ya creía buena — pero un agente que</sub>
- **EL NÚMERO SÓLO PUEDE SUBIR.** <sub>línea 21</sub>
  <br><sub>Igual que `prueba_sustrato.mjs` cuenta los que dependen del adaptador y su techo sólo baja, aquí se cuenta cuántos lo declaran y el suelo sólo sube. Escribir treinta y cinco frases es trabajo de contenido y se hace poco a poco; lo que no</sub>
- **13-08-2026: LLEGÓ A 35 Y ESO LE CAMBIA EL SENTIDO.** <sub>línea 39</sub>
  <br><sub>Mientras iba por la mitad, esto era una cuenta atrás: «faltan tantos». Ahora que están todos ya no mide progreso, mide OTRA COSA — que un juego nuevo no pueda nacer mudo. El primero que se añada sin objetivo baja el número y esto</sub>
- **20-08-2026: EL SUELO SE HABÍA QUEDADO EN 35 CON 37 JUEGOS, Y ESO ES HOLGURA.** <sub>línea 46</sub>
  <br><sub>`npm run pruebas` lo cazó: con el sabotaje puesto —quitarle el objetivo a las damas— esta prueba APROBABA. Claro: bajaba de 37 a 36 y el suelo estaba en 35. Dos juegos de margen es exactamente lo que la nota de arriba dice que no puede</sub>

### `prueba_openapi.mjs`

- **POR QUÉ ESTO EXISTE.** <sub>línea 5</sub>
  <br><sub>`openapi.json` declaraba TRES rutas. El sitio sirve al menos OCHO: las cuatro `/api/*` del sitio principal —`gym`, `dataset`, `verificar`, `presencia`— y las cuatro del árbitro de mesas. O sea que la especificación describía una de las dos</sub>
- **Y SE COMPRUEBA EN LOS DOS SENTIDOS, QUE ES LO QUE SE OLVIDA.** <sub>línea 19</sub>
  <br><sub>· lo declarado EXISTE — una ruta en el papel que ya no responde; · lo que existe está DECLARADO — una puerta nueva que nadie apuntó.</sub>

### `prueba_pantallas.mjs`

- **UNA PANTALLA ESTRECHA NO ES UNA PEQUEÑA CON MENOS SITIO: ES OTRA FORMA.** <sub>línea 15</sub>
  <br><sub>En Three el campo de visión que se declara es el VERTICAL; el horizontal sale de multiplicarlo por el aspecto. Con 1280x800 (1,6) sobra ancho; con 390x844 (0,46) se ve menos de la mitad de ancho que de alto. Un tablero apaisado es exactamente la forma que</sub>
- **Y LO QUE NO SE CUENTA, QUE ES LA MITAD DEL TRABAJO** <sub>línea 22</sub>
  <br><sub>Las manos de los RIVALES se salen de cuadro A PROPÓSITO en las mesas de cartas: están boca abajo y de ellas sólo hace falta saber cuántas hay, así que el encuadre prioriza que la TUYA se lea. Está documentado como decisión en `mesa_cartas.mjs`.</sub>
- **EL PANEL ES UN RECTÁNGULO, NO UNA BANDA.** <sub>línea 105</sub>
  <br><sub>La primera versión preguntaba `y < panel.bottom`, o sea trataba el panel como una franja horizontal que ocupa todo el ancho. En un móvil lo es. En escritorio el panel es una COLUMNA a la izquierda, así que todo lo que</sub>
- **FUERA» Y «BAJO EL PANEL» SON DOS PROBLEMAS DISTINTOS, Y MEZCLARLOS ENGAÑA.** <sub>línea 158</sub>
  <br><sub>La primera versión imprimía «0 fuera» cuando lo que fallaba era que las piezas caían DEBAJO del panel del HUD. Un mensaje que dice cero de lo que enseña es peor que no decir nada, y además manda a arreglar lo que no toca: fuera de cuadro se</sub>
- **SÓLO SE ESCRIBE LA PASADA COMPLETA.** <sub>línea 179</sub>
  <br><sub>medidos como si estuvieran bien, que es la mentira más cómoda de todas.</sub>
- **EL VEREDICTO CUENTA LAS DOS COSAS, Y NO PRESUME DE LOS 35 SI MIDIÓ CINCO.** <sub>línea 193</sub>
  <br><sub>La primera versión sólo miraba `fuera`, así que decía «en las cuatro pantallas se alcanza todo» debajo de una tabla llena de problemas — el resumen contradiciendo al detalle en la misma pantalla. Y decía «en los 35» aunque se le hubieran pasado cinco</sub>

### `prueba_portal.mjs`

- **LO QUE SE BUSCA SON LAS MARCAS DE QUE JAVASCRIPT SE HA RENDIDO.** <sub>línea 13</sub>
  <br><sub>`[object Object]`, `undefined`, `null` y `NaN` sueltos en el texto son lo que deja una plantilla cuando el dato no tiene la forma que esperaba. Ninguna de las cuatro es una palabra que quepa en una ficha escrita en español, así que encontrarlas es</sub>
- **CUÁNTAS TARJETAS SE ESPERAN NO SE ESCRIBE A MANO.** <sub>línea 59</sub>
  <br><sub>Estaba clavado en 35 y el catálogo tenía 37, así que esta comprobación suspendía enseñando `37/35` — un rojo que significaba «hay DE MÁS», que no es un fallo del catálogo sino de esta línea. Y el modo de fallo peligroso es el contrario: si un</sub>

### `prueba_recibos.mjs`

- **Y LO QUE HACE QUE ESTO MEREZCA UN INSTRUMENTO NO ES EL FALLO, ES CÓMO SE VEÍA.** <sub>línea 17</sub>
  <br><sub>La clasificación rota la silla por semilla, así que su contador de recibos ponía `100/200`. Exactamente la mitad. Y un `100/200` se lee como un número normal, no como «la mitad de mis filas están apoyadas en nada». Estuvo así meses. Sólo saltó</sub>
- **Y COMPRUEBA LAS DOS DIRECCIONES, que es lo que separa esta prueba de una que** <sub>línea 28</sub>
  <br><sub>sólo dice que sí: una partida legítima desde cualquier silla tiene que ACEPTARSE, y una con los puntos inflados desde cualquier silla tiene que RECHAZARSE. Sin lo segundo, `verificar` podría devolver `true` a todo y esto seguiría en verde.</sub>

### `prueba_reglas.mjs`

- **`puntuacionDe` se IMPORTA, no se reescribe.** <sub>línea 48</sub>
  <br><sub>prueba leía `estado.puntos` a pelo y daba 0 en go, reversi, mancala, snake, fagocito y peatón — que publican `score`, a veces como objeto. Seis juegos «rotos» que estaban perfectos: el roto era el comprobador.</sub>
- **POR QUÉ HAY DOS POLÍTICAS Y NO UNA** <sub>línea 66</sub>
  <br><sub>Go Fish llegaba a `manos [0,3,0] · mazo 1`: el único con cartas no tenía a quién pedir y la partida no estaba terminada, así que **se moría de pie** —ni seguía ni acababa, y el estado seguía diciendo `is_game_over: false`—. La</sub>
- **NINGUNA CARTA DESAPARECE.** <sub>línea 168</sub>
  <br><sub>`cartas_intactas` la publican guerra, unit y entropy, y hasta aquí sólo se miraba la de guerra. La de entropy llevaba con un comentario encima diciendo que fue **la lección más cara del original** —el recuento daba 95 de 96 porque</sub>

### `prueba_repetidor.mjs`

- **LA TABLA SE MIDE CONTRA `data/paginas.json`, QUE SE GENERA.** <sub>línea 87</sub>
  <br><sub>`enlace_repetidor.js` lleva una tabla de dos alias (damas→checkers, ajedrez→chess) y eso es una lista escrita a mano — exactamente lo que `entrar.html` avisa que no se vuelva a hacer: «este proyecto ya ha tenido</sub>
- **Y LAS NORMAS SE CARGAN DESDE EL ENLACE, NO DESDE `c.opciones`.** <sub>línea 158</sub>
  <br><sub>Es la trampa entera de esta prueba: reutilizar las reglas de arriba la pondría verde aunque el enlace no llevara las normas, porque las tendría de todas formas. Se vuelven a cargar leyendo `?normas=`, igual que hace</sub>
- **ESTO EXISTE PORQUE ME DEJÉ CUATRO JUEGOS FUERA.** <sub>línea 227</sub>
  <br><sub>Monté el repetidor en la mesa genérica y en el motor de cartas y di el trabajo por terminado, sin haber contado nunca cuántos caminos había. Había tres:</sub>
- **LA MARCA ES `crearRepetidor({`, CON EL PARÉNTESIS, Y NO ES QUISQUILLOSO.** <sub>línea 246</sub>
  <br><sub>Estaba como `crearRepetidor` a secas. Al comprobar que esta prueba PUEDE fallar —renombrando la llamada a `crearRepetidorZZZ` en un motor— siguió en verde: el nombre saboteado CONTIENE el original, así que `includes` decía que sí.</sub>

### `prueba_semillas.mjs`

- **EL DEFECTO ES SIEMPRE EL MISMO, Y NO ES UN DEFECTO DE DISEÑO** <sub>línea 7</sub>
  <br><sub>Un sistema que llama a `Math.random()` funciona perfectamente en una demo — que es para lo que se escribió— y no sirve para nada que tenga que reproducirse: una tirada de banco de pruebas, un informe de fallo, el recibo</sub>
- **POR QUÉ ESTO ES UNA PRUEBA Y NO UNA LISTA DE TAREAS** <sub>línea 19</sub>
  <br><sub>Porque una lista de tareas envejece en silencio y un techo no. Este número **sólo puede bajar**. Si sube es que alguien añadió un sistema con azar incontrolado, y eso es justo lo que no queremos que pase callando — la misma</sub>
- **TECHO DE SISTEMAS SIN SEMBRAR.** <sub>línea 34</sub>
  <br><sub>Cada uno que acepte `rng` baja este número. **Nunca sube.**</sub>
- **QUEDAN 2 DENTRO DE ALCANCE PERO NO SEMBRADOS A PROPÓSITO:** <sub>línea 66</sub>
  <br><sub>AsteroidsSystem y CuccoGameSystem (con su base BulletHeavenEngine) NO aceptan `config.rng` cacheado en el constructor porque sus entornos del gym (`AsteroidsEnv._withSeed`, `CuccoSwarmEnv` + `DeterministicScope`)</sub>
- **Y CON ESO, ESTE TRINQUETE HA TOCADO SUELO: **2 NO ES DEUDA, ES EL FONDO.** <sub>línea 77</sub>
  <br><sub>Empezó en 28 y ha bajado hasta 2, pero esos dos últimos NO hay que sembrarlos —el bloque de arriba explica por qué—, así que la regla de siempre («este número sólo puede bajar») deja de valer aquí y se invierte:</sub>
- **LOS MIXTOS: ACEPTAN SEMILLA **Y ADEMÁS** LLAMAN A `Math.random(`.** <sub>línea 118</sub>
  <br><sub>La cuenta de arriba es `azar && !sembrado`, así que un sistema que reciba `rng` en algún sitio queda absuelto aunque tenga un `Math.random(` suelto en otro. Y ése es igual de irreproducible que uno sin sembrar — **peor**, porque parece</sub>
- **AVISO PARA QUIEN SIEMBRE SISTEMAS: ESTO LEE EL FICHERO ENTERO, COMENTARIOS** <sub>línea 133</sub>
  <br><sub>INCLUIDOS. Al sembrar `RoboticArmSystem` (15-08) el comentario explicaba el cambio citando la llamada literal entre comillas, y esta comprobación la contó como una llamada de verdad: sistema sembrado + azar suelto = mixto, y en rojo.</sub>
- **Y SE BARREN LAS ACCIONES, NO SE REPITE LA PRIMERA.** <sub>línea 185</sub>
  <br><sub>Costó tres intentos llegar aquí. Mirar sólo el estado inicial da un falso positivo en cuanto el entorno esconde algo —el mapache de Chopper se coloca con la semilla y precisamente NO se ve al empezar, que es el juego—. Y mirar</sub>
- **TECHO DE COPIAS DE «MARCAR DÓNDE PUEDES JUGAR», Y SÓLO PUEDE BAJAR.** <sub>línea 284</sub>
  <br><sub>Esto ya vive en dos sitios legítimos: `Entrada.js` lo hace para los tableros (y de paso resuelve el clic entero), y `protohub/marcas.js` para los visualizadores que son MÓDULOS, que no pueden llamar a un script clásico.</sub>

### `prueba_subasta.mjs`

- **POR QUÉ ESTA FUNCIÓN Y NO OTRA** <sub>línea 10</sub>
  <br><sub>Nuestro spades no tiene subasta: gana quien más bazas hace. Y en spades la subasta ES el juego — se puntúa por ACERTAR cuántas vas a hacer, no por hacer muchas. Sin ella, «predecirte a ti mismo» —que es la única capacidad que ningún otro de los 35</sub>
- **INDIVIDUAL, NO POR PAREJAS, Y ES UNA DECISIÓN** <sub>línea 18</sub>
  <br><sub>El spades de torneo es dos contra dos con las apuestas SUMADAS por equipo. Nuestro motor no tiene concepto de equipo —el marcador es por jugador— y meterlo tocaría el arbitraje de mesas, el reparto de asientos y la métrica. Así que se implementa la</sub>
- **LO QUE NO SE PUEDE ROMPER** <sub>línea 26</sub>
  <br><sub>Una partida se verifica volviéndola a jugar con `{juego, semilla, jugadas}`. Todo lo que decida el resultado tiene que vivir DENTRO del estado, no en una variable del módulo: si las apuestas se guardan fuera, la re-simulación no las tiene y el</sub>
- **LA CARTA TIENE QUE SER UNA DE VERDAD, O ESTE VERDE NO VALE NADA.** <sub>línea 74</sub>
  <br><sub>La primera versión probaba con `H_2` a secas y salía en verde HOY, sin subasta ninguna: el juego la rechazaba porque ese nombre no existe —sus jugadas se llaman `jugar:H_2`— no porque hubiera una fase de apuestas que respetar. Un verde que</sub>
- **ESTE VERDE SÓLO CUENTA SI LAS APUESTAS SE ACEPTARON.** <sub>línea 111</sub>
  <br><sub>Sin la comprobación de arriba, esto salía en verde HOY: como las cuatro apuestas se rechazaban, las jugadas seguían siendo cartas «después» de una fase que nunca ocurrió. Un verde que se cumple porque el paso anterior falló es peor que un rojo,</sub>
- **ESTO FALTABA EN MI SPEC, Y ES EL FALLO QUE SE COLÓ POR EL HUECO.** <sub>línea 131</sub>
  <br><sub>La primera versión de esta prueba pasó entera con una implementación que dejaba el juego MUERTO DE PIE: `prueba_reglas` lo cazó con «1 jugada · sin jugadas legales y sin terminar». La causa, medida:</sub>
- **Y AQUÍ TAMBIÉN: SÓLO CUENTA SI LA LISTA LLEVA APUESTAS DENTRO.** <sub>línea 224</sub>
  <br><sub>Hoy salía en verde con 52 jugadas y CERO apuestas — verificaba perfectamente una partida sin subasta. Lo que hay que demostrar no es que el verificador funcione: es que sigue funcionando CON la fase nueva dentro, que es donde se rompería si</sub>

### `prueba_sustrato.mjs`

- **TECHO DE DEUDA.** <sub>línea 36</sub>
  <br><sub>Cada juego que publique `sustrato(p)` nativo baja este número. **Nunca sube.** Si esta prueba falla porque el número creció, es que se añadió un juego sin sustrato propio — y eso es exactamente lo que no queremos que pase callando.</sub>
- **ESTABA EN 19 CON LA DEUDA YA EN 17, Y ESO ES UN TRINQUETE FLOJO.** <sub>línea 42</sub>
  <br><sub>Dos de holgura no parecen nada y son justo el hueco por el que se cuela lo que este número existe para impedir: `prueba_de_las_pruebas.mjs` le quitó el sustrato a las damas a propósito, la deuda subió a 18, y esta comprobación **aprobó**.</sub>
- **UNA ZONA CON CASILLAS NO PUEDE PERDER NINGUNA.** <sub>línea 88</sub>
  <br><sub>`items` sólo trae las cartas destapadas y `ocultas` es un número, así que juntos dicen CUÁNTAS hay y no DÓNDE. Para la caja de entropy eso no basta: `cambiar:5` nombra un hueco fijo y dos cartas iguales en la misma</sub>
- **Y SE COMPRUEBA CON UN JUGADOR QUE ANDA, NO CON EL PRIMER MOVIMIENTO** <sub>línea 146</sub>
  <br><sub>QUE PILLE.</sub>
- **2.bis — QUE EL README NO MIENTA SOBRE CUÁNTOS JUEGOS HAY.** <sub>línea 195</sub>
  <br><sub>Decía «19 juegos» con veintiséis en la lista, en dos sitios distintos, y es lo primero que lee quien llega al proyecto. No es un descuido aislado: es la cuarta vez que un número escrito a mano se separa de la realidad sin avisar</sub>
- **2.bis.bis — Y QUE LOS DOCUMENTOS NO MIENTAN SOBRE CUÁNTAS BARAJAS HAY.** <sub>línea 218</sub>
  <br><sub>Cinco sitios decían «6 barajas» el día que se añadió la séptima, y ninguno dio error: un número viejo nunca da error, sólo deja de ser cierto. Es la quinta vez que pasa esto mismo con otro número (los juegos del README, el escaparate,</sub>
- **2.ter — QUE `montarMesa` SIGA ELIGIENDO EL MOTOR DE CARTAS PARA LOS QUE** <sub>línea 241</sub>
  <br><sub>REPARTEN CARTAS.</sub>
- **ZONAS MÁS REJILLA NO ES UN FALLO: ES UN JUEGO CON TABLERO Y COSAS ENCIMA.** <sub>línea 271</sub>
  <br><sub>Esto marcaba en rojo a cualquiera que publicara las dos, con el argumento de que `montarMesa` le daría el motor de tablero y su mesa de casino saldría mal en silencio. El argumento sólo vale si el juego ES de cartas: para un parchís</sub>
- **Y NO SE SUSPENDE A NADIE POR SER HÍBRIDO.** <sub>línea 292</sub>
  <br><sub>Esto era un FALLO —«zonas y rejilla a la vez»— hasta que llegó el parchís, que tiene tablero, fichas y un dado sobre la mesa. Se afinó entonces a «items que son cartas de la biblioteca», y aguantó hasta el parchís canadiense, que reparte</sub>
- **2.ter — Y CUÁNTOS LA USAN DE VERDAD.** <sub>línea 322</sub>
  <br><sub>El número de arriba lleva meses diciendo diez y estaba en verde mientras OCHO de esos diez no tenían página: mide lo que el sustrato PERMITE, no lo que alguien puede abrir en el navegador. Un juego capaz de dibujarse en la mesa y</sub>
- **2.quater — DOS NOMBRES PARA EL MISMO DATO.** <sub>línea 359</sub>
  <br><sub>Un juego que publica `legal_moves` y `legal_actions` con el mismo valor no tiene dos campos: tiene uno y una trampa. El día que alguien quite el que sobra, quien leyera el otro se queda sin nada — y no dará error, porque</sub>
- **SE MIDE POR VALOR, NO POR UNA LISTA DE SOSPECHOSOS.** <sub>línea 367</sub>
  <br><sub>Una lista a mano es lo que ya falló seis veces en este proyecto — la última, dentro de `desajustes.mjs`, que juraba que `legal_actions` no lo leía nadie porque su lista de consumidores no incluía el motor de cartas.</sub>
- **COINCIDIR UNA VEZ NO ES SER EL MISMO DATO.** <sub>línea 398</sub>
  <br><sub>La primera versión contaba cualquier par que coincidiera en algún momento y daba SEIS, de los que la mitad eran ruido: `biblioteca` y `cartas_intactas` son dos booleanos que valen `true` los dos, y `explorado` y `puntos` cruzan el</sub>
- **Y SE LLEVA LA CUENTA POR JUEGO, NO EN GLOBAL.** <sub>línea 412</sub>
  <br><sub>Con una sola lista de «pares que han divergido», que `score` y `puntos` sean cosas distintas en go —allí `score` es `{black, white}` y `puntos` tu escalar— bastaría para absolver ese par en los OTROS seis juegos donde sí son el mismo</sub>
- **TRES JUEGOS NECESITAN MÁS DE 8 PASOS, Y ES POR LO QUE MIDEN.** <sub>línea 426</sub>
  <br><sub>`marcador` y `avance` son datos DISTINTOS en parchís, canadiense y oca —el primero suma un bono por fichas ya metidas, el segundo no— pero en los primeros turnos de una carrera nadie ha metido ninguna, así que los 8 pasos</sub>
- **COMPROBADO DESPUÉS CON OCHO SEMILLAS, PORQUE UNA NO ES UNA MEDIDA.** <sub>línea 442</sub>
  <br><sub>Un tope elegido sobre una sola partida es un fallo intermitente esperando otra semilla, y ésos son los peores. Con las semillas 1, 2, 3, 6, 7, 11, 23 y 42 el peor caso de cada uno es MUCHO más bajo de lo que salió al calibrar:</sub>
- **LO QUE EL `>= 2` DE ARRIBA NO PUEDE VER, Y POR QUÉ SE DICE IGUALMENTE.** <sub>línea 504</sub>
  <br><sub>Un par sólo cuenta si coincide en DOS juegos o más, y eso está bien: bajarlo a uno da diez pares de los que NUEVE son coincidencia —`height`/`width` en un tablero cuadrado, `vida`/`vida_rival` que empiezan iguales, `ganadas`/`perdidas` a cero,</sub>

### `prueba_teclado.mjs`

- **DE DÓNDE SALE, MEDIDO EN UN CHROME DE VERDAD:** <sub>línea 6</sub>
  <br><sub>quería escribir  «las casas se ven raras y no se donde estoy» salía            «lcevenrrynoeoneetoy» letras perdidas  23</sub>
- **ESTA PRUEBA ES DE TEXTO, NO DE NAVEGADOR, Y HAY QUE SABER QUÉ NO CUBRE.** <sub>línea 22</sub>
  <br><sub>Lo de arriba se midió abriendo snake y escribiendo tecla a tecla; eso no cabe en `npm test` sin arrastrar un Chrome. Lo que sí se puede comprobar sin navegador es que **ningún manejador de teclas del arcade se salte la comprobación del foco**, y</sub>
- **ESTO ERA `activeElement|isContentEditable` Y SE QUEDÓ VERDE CON EL CABLE CORTADO.** <sub>línea 41</sub>
  <br><sub>Al comprobar que esta prueba puede fallar —quitando la llamada y renombrando la función— siguió aprobando: los nombres seguían APARECIENDO en el fichero, dentro de una función que ya no llamaba nadie. Buscar una palabra en alguna parte de un</sub>
- **Y LA DEFINICIÓN NO CUENTA COMO LLAMADA.** <sub>línea 55</sub>
  <br><sub>`function estaEscribiendo()` contiene literalmente `estaEscribiendo()`, así que la marca de arriba aprobaba el fichero que DEFINE la función aunque nadie la llamara — y ese fichero es justo el que hay que vigilar.</sub>

### `prueba_topes.mjs`

- **Y LA LISTA NO SE ESCRIBE A MANO: SE MIDE.** <sub>línea 15</sub>
  <br><sub>Escribir «éstos cuatro son de supervivencia» sería la enésima lista paralela que se separa del código. Se juega cada juego con topes crecientes y se mira si la política de referencia llega a terminar alguna vez:</sub>
- **TRES SEMILLAS NO BASTAN, Y LO APRENDÍ PUBLICANDO.** <sub>línea 47</sub>
  <br><sub>Con 3 semillas snake y fagocito daban «terminan con tope 400», y la clasificación —que juega 120— los descartó igualmente por corte. No es que la sonda mintiera: es que el conjunto que miraba no contenía las semillas malas. Se pasa `--semillas` para</sub>
- **SE MIDEN LAS DOS REFERENCIAS, Y LA SEGUNDA ES LA QUE IMPORTA.** <sub>línea 60</sub>
  <br><sub>Empecé midiendo sólo la política tonta, pensando que si la tonta termina cualquiera termina. Es al revés, y snake lo cantó: la tonta se mata en veinte pasos y termina de sobra a las 120, mientras la de la casa —que juega bien— SOBREVIVE y se la come el</sub>
- **EL MISMO UMBRAL QUE `tabla.mjs`, Y TIENE QUE SER EL MISMO.** <sub>línea 111</sub>
  <br><sub>La tabla acepta un juego cuando termina el 95% de las partidas de referencia, porque exigir el 100% borraba fagocito por DOS partidas de doscientas cuarenta —dos bucles de la política tonta—. Si esta sonda exigiera el 100%, diría «no</sub>
- **SE ESCRIBE LO MEDIDO, O `tabla.mjs` NO PUEDE USARLO.** <sub>línea 138</sub>
  <br><sub>Este número es el que hace que un juego entre o no en la clasificación, así que dejarlo sólo en la terminal es lo mismo que no medirlo. Se guarda para que la tabla lo lea, y con MARGEN: el tope que se publica es el medido por dos.</sub>
- **Y SÓLO SE ESCRIBE SI SE MIDIERON TODOS LOS QUE HAY EN EL FICHERO.** <sub>línea 150</sub>
  <br><sub>pasada parcial borraría los topes de los que no se midieron esta vez, y la tabla los volvería a cortar sin que nadie tocara nada.</sub>

### `prueba_variantes.mjs`

- **Y COMER TIENE QUE QUITAR UNA FICHA.** <sub>línea 75</sub>
  <br><sub>Lo de arriba comprueba dos cosas ciertas —que cada variante juega distinto y que una partida se repite igual con sus normas— y las dos las cumplía un juego ROTO. Con `damaVuela`, la captura de la dama no retiraba a la víctima: `mover` sólo quitaba la</sub>
- **Y EL CASO CONCRETO, PUESTO A MANO.** <sub>línea 120</sub>
  <br><sub>Escribí la invariante de más arriba, volví a meter el fallo a propósito… y siguió en verde: `11/11 capturas comieron`. Y era verdad — en una partida desde la posición inicial, con un rival tonto y doscientas jugadas, TODAS las capturas que salen son</sub>

### `prueba_verbos.mjs`

- **POR QUÉ EL DENOMINADOR ES EL PANEL Y NO UNA LISTA DE JUEGOS CON VERBOS.** <sub>línea 14</sub>
  <br><sub>Escribir «estos doce tienen verbos» sería la enésima lista a mano, y de nueve números falsos de agosto siete fueron de denominador. Cada página dice cuántos verbos le tocan; si un juego no ofrece ninguno en ese instante, sale como NO COMPROBABLE, que</sub>
- **Y HAY TRES CAMINOS DE PANEL, NO DOS.** <sub>línea 21</sub>
  <br><sub>`jugadas.js`, `SovereignBoardEngine` y `SovereignCardEngine` pintan cada uno sus `.mesa-jugada`. El repetidor ya se montó una vez «en los dos motores» y cuatro juegos se quedaron fuera. Esta prueba es la que nota que falta el tercero.</sub>
- **SE LEE `title`, QUE ES LA JUGADA, NO LA ETIQUETA.** <sub>línea 70</sub>
  <br><sub>El panel muestra `H_Q` para la jugada `jugar:H_Q`, y la barra muestra «enviar a» para `enviar_a`. Comparando etiquetas salieron seis juegos en rojo —las trece cartas de la mano de hearts «faltando» en la barra—</sub>
- **Y LO QUE EL AGENTE RECIBE, PARA PODER COMPARARLO CON LO QUE SE VE.** <sub>línea 82</sub>
  <br><sub>«El panel de jugadas es literalmente `legal_moves`» está escrito en cinco comentarios de este proyecto y era la frase en la que se apoya el banco entero: si las puertas no ofrecen lo mismo, comparar a una persona con un</sub>
- **LA PUERTA HUMANA Y LA DEL AGENTE, ¿OFRECEN LO MISMO?** <sub>línea 97</sub>
  <br><sub>Se comparan las LISTAS y no los totales. Un panel al que le falte una jugada y le sobre otra tiene el mismo número de botones, y ése es exactamente el caso que importa: significa que una persona y un agente están jugando a cosas distintas</sub>
- **COMPROBADO CORTANDO EL CABLE: quitando una jugada del pintado de `jugadas.js`** <sub>línea 105</sub>
  <br><sub>(`legales.slice(1)`), parchís sale en rojo diciendo «no salen tirar». Y con el mismo sabotaje snake seguía en verde, que NO es un fallo de esta prueba sino el recordatorio de que hay TRES caminos de panel: cortar uno sólo prueba ése. Un</sub>
- **SE ESCRIBE LO MEDIDO, CON FECHA, Y SÓLO EN LA PASADA COMPLETA.** <sub>línea 156</sub>
  <br><sub>La ficha de cada juego deriva lo que puede y de la barra de verbos no sabía nada. Corriendo `node prueba_verbos.mjs snake` se guardaría un fichero con un juego y treinta y cuatro huecos, que en la ficha se leerían como «sin verbos» — y eso es</sub>
- **`null`, NO CERO, CUANDO NO SE PUDO COMPROBAR.** <sub>línea 167</sub>
  <br><sub>Escribir `verbos: 0` para un juego que en ese instante no ofrecía ninguno hace que la ficha publique «este juego no tiene verbos», que es una afirmación distinta y puede ser falsa: hearts no ofrece verbos al empezar la</sub>

### `prueba_version.mjs`

- **Y LO QUE FALTA AQUÍ NO ES UN AGUJERO.** <sub>línea 17</sub>
  <br><sub>El resumen no cubre `js/protohub/` —ni el pintor, ni el sustrato, ni las reglas—, y además esos ficheros se importan como módulos con rutas normales, así que ni siquiera podrían llevar `?v=`. Visto así parece el mismo fallo que</sub>
- **Ojo con lo que NO entra en el resumen: el vendor (va sellado en su ruta,** <sub>línea 35</sub>
  <br><sub>`three-r128`) y `montarMesa.js` mismo, que no puede contener su propio hash. `montarMesa.js` no lo necesita: lo carga la página con `import`, y las páginas se sirven siempre frescas.</sub>
- **Y LAS HOJAS DE ESTILO, QUE FALTABAN.** <sub>línea 59</sub>
  <br><sub>El resumen sólo miraba los `.js`, así que cambiar el CSS no subía la versión y el sello seguía siendo el mismo: los navegadores servían la hoja guardada. Salió el 13-08-2026, cuando el arreglo de que el panel dejara pasar los clics resultó vivir</sub>

### `prueba_vistas.mjs`

- **QUÉ SE PUEDE COMPROBAR Y QUÉ NO, QUE ES LA MITAD DEL VALOR** <sub>línea 18</sub>
  <br><sub>Los juegos que pasan por el pintor genérico NOMBRAN lo que dibujan: `muro`, `niebla`, `sueloA`, y las piezas con prefijo `p:` o `z<zona>:v<valor>`. En ésos la cuenta se puede cruzar contra el sustrato y cuadra.</sub>
- **TRINQUETE AL REVÉS: los NO comprobables sólo pueden bajar.** <sub>línea 46</sub>
  <br><sub>Hoy son los que tienen visualizador propio y dibujan sin nombrar. Si sube, es que alguien ha añadido un juego que pinta a su manera sin decir qué pinta.</sub>
- **NO HABLA EL IDIOMA» NO ES LO MISMO QUE «DICE OTRA COSA».** <sub>línea 135</sub>
  <br><sub>Primero puse «si tiene mallas con nombre, es comprobable», y las mesas de cartas salieron como fallo: nombran el MUEBLE —`Node`, del modelo 3D— pero sus cartas no llevan el prefijo de pieza, así que salía «el sustrato dice 8 y se</sub>

## Otros

### `public/games/asteroid_gauntlet.html`

- **Aquí ponía `mesh.children[0].material`, dando por hecho que el** <sub>línea 629</sub>
  <br><sub>primer hijo del modelo es la malla. En estos GLB no lo es —el nodo raíz cuelga de un grupo— así que `children[0].material` era `undefined` y reventaba EN CADA FOTOGRAMA: 196 errores y pantalla</sub>

### `public/games/croupier_cabinet_escape.html`

- **Aquí había dos envoltorios más:** <sub>línea 396</sub>
  <br><sub>window.enterCabinetMode = () => window.game.enterCabinetMode(); window.exitCabinetMode  = () => window.game.exitCabinetMode();</sub>

### `public/games/croupier_corporate_building.html`

- **`@alisa-engine/` apunta a `../js/…`, no a `./js/…`.** <sub>línea 94</sub>
  <br><sub>recuperó del backup, donde vivía un nivel más arriba; desde /games/ la ruta relativa resolvía a /games/js/… y daba 404 en TODOS los imports. El comentario va AQUÍ FUERA: un import map es JSON estricto, y meterlo</sub>
- **Antes: actory.build(...) directo.** <sub>línea 632</sub>
  <br><sub>quien aplica la corrección de luz — y sin ella la escena sale NEGRA.</sub>
- **Antes: actory.build(...) directo.** <sub>línea 787</sub>
  <br><sub>quien aplica la corrección de luz — y sin ella la escena sale NEGRA.</sub>
- **Antes: actory.build(...) directo.** <sub>línea 953</sub>
  <br><sub>quien aplica la corrección de luz — y sin ella la escena sale NEGRA.</sub>
- **El plugin NO tiene interruptor propio: su `renderFn` es simplemente** <sub>línea 2014</sub>
  <br><sub>`() => composer.render()`. Escribí un `cine.enabled` de mi cosecha antes de mirar, y no habría hecho nada. Se alterna eligiendo QUIÉN pinta. let cineEncendido = true;</sub>

### `public/games/raccoon_floor_search.html`

- **El juego estaba MUDO, y los 24 juegos de `games/` con él: ni una línea** <sub>línea 101</sub>
  <br><sub>de audio en toda la carpeta. Teníamos al lado `js/sfx.js` — 36 KB, 66 efectos sintetizados con Web Audio, sin un solo .wav — y CERO usuarios. No es un script de módulo: publica `window.SFX`, así que va aquí arriba y</sub>

### `public/games/rue_del_percebe.html`

- **Esto pedía three 0.160 con `examples/js/`, y three BORRÓ esa carpeta en** <sub>línea 111</sub>
  <br><sub>r148: solo queda `examples/jsm/` (módulos). Los dos scripts daban 404, así que `THREE.OrbitControls` no existía y la línea 138 abortaba el bloque entero — dejando `let totalFloors` (línea 161) sin inicializar para</sub>

### `public/index.html`

- **ESTE BLOQUE ES LA PUERTA, Y ANTES NO ESTABA.** <sub>línea 56</sub>
  <br><sub>La portada decía «se puede volver a jugar para comprobar que es verdad» y ahí se quedaba: no nombraba las trampas, ni la re-simulación, ni el servidor, ni a los agentes. O sea que el único argumento que nos separa</sub>
- **Las dos puertas que sostienen lo que promete esta página estaban sin** <sub>línea 79</sub>
  <br><sub>enlazar: la clasificación y la matriz de géneros vivían en URLs que sólo conocía quien las había hecho. Un banco de pruebas al que no se llega desde la portada no lo verifica nadie, por bien medido que esté. --></sub>
- **Y ésta es la tercera, por el mismo motivo.** <sub>línea 84</sub>
  <br><sub>partida de agente deja el mismo recibo que la tuya» — y hasta hoy no había forma de VER ni uno. El corpus estaba, la verificación estaba, y lo único que faltaba era la puerta. Cada fila abre la partida volviéndose a jugar. --></sub>

### `public/lab.html`

- **`> b` y no `b` a secas: la regla de bloque alcanzaba tambien a los** <sub>línea 20</sub>
  <br><sub><b> que van DENTRO del texto y partia la frase en tres lineas. */ .piso > b { display:block; font-family:'JetBrains Mono',monospace; font-size:15px; letter-spacing:3px; color:#fff; }</sub>

### `public/labs/catalogo.html`

- **CLASIFICA POR LO QUE LA PIEZA EXPONE, NO POR SU NOMBRE.** <sub>línea 61</sub>
  <br><sub>`FoodChainSystem` suena a simulación visual y en realidad expone `createPreyState`, `tickPredator`, `getPreyObservation`: es un entorno de gym multiagente, no algo que se dibuje. Adivinar por el nombre habría dado la</sub>
- **Y NO SE DIBUJA NADA AQUÍ, A PROPÓSITO.** <sub>línea 67</sub>
  <br><sub>Se construye la pieza y se mira qué mete en una escena de mentira, sin renderer ni bucle. Ciento ochenta piezas dibujando a la vez fundirían el navegador, y lo que se quiere saber es qué ES cada una — para verla está `pieza.html?m=…`.</sub>
- **NO TODO SE EXPORTA COMO CLASE, Y LA PRIMERA VERSIÓN SÓLO MIRABA ESO.** <sub>línea 98</sub>
  <br><sub>En este motor conviven dos formas: `export class X {}` y `export const X = { init(), update() }` — un objeto literal con sus métodos. `FileSystemDioramaSystem`, los 52 KB más grandes de todo,</sub>

### `public/labs/croupier_asteroids_survival.html`

- **Esto era `engine.ship.userData.shields` y reventaba CADA FOTOGRAMA con** <sub>línea 376</sub>
  <br><sub>«Cannot read properties of undefined (reading 'shields')»: `engine.ship` existe pero no es una malla de THREE, así que no tiene `userData`. Los escudos viven en el sistema, no en el objeto de render.</sub>

### `public/labs/croupier_banco_motores.html`

- **Y leyéndolos aprendí lo importante: **NO son entornos de gym**.** <sub>línea 15</sub>
  <br><sub>`reset(seed)` ni `step(acción)` ni política — corren una simulación fija y devuelven métricas. Llamarlos gym sería vender humo. Son otra cosa, y hacía más falta: **arneses headless de cada motor**, o sea el ejecutor de pruebas</sub>

### `public/labs/croupier_determinism_audit.html`

- **NADA de `metodo?.()` aquí.** <sub>línea 48</sub>
  <br><sub>encadenamiento opcional "por seguridad" y el resultado fue que NO SE EJECUTÓ NADA: comparaba dos resultados vacíos y cantaba 4/4 deterministas. El chivato fue `draws: 0`. Ahora las llamadas son directas — si el método no existe, que</sub>

### `public/labs/croupier_go_test.html`

- **Mi primer intento de esta prueba estaba MAL: puse solo piedras negras y** <sub>línea 180</sub>
  <br><sub>esperaba 9 puntos. Con un solo color en el tablero, TODO el vacío toca solo a negras, así que por regla de área le pertenece entero — 361 es la respuesta correcta. Para medir territorio de verdad hacen falta los dos colores.</sub>

### `public/labs/croupier_math_orbital_shmup.html`

- **`js/sfx.js` son 36 KB de motor de audio procedural —unos sesenta** <sub>línea 115</sub>
  <br><sub>sonidos sintetizados con Web Audio, sin un solo fichero .wav— más cuatro temas de música y una radio online gratuita (SomaFM). Lo cargaba UNA página de las 131.</sub>
- **Aquí ponía `engine.init(core.scene)`, `engine.setCore(core)` y** <sub>línea 195</sub>
  <br><sub>`engine.update(dt)`, los tres envueltos en un `if(engine.X)`. `OrbitalKinematicsSystem` no tiene ninguno de esos métodos, así que no fallaba nada: sencillamente NO PASABA NADA. La página</sub>
- **ESCRITOS UNO A UNO, Y NO ES POR GUSTO.** <sub>línea 248</sub>
  <br><sub>Estaban como `` `../props/models/Rock_${i}.glb` `` en un bucle, y así el nombre `Rock_3.glb` NO APARECE EN NINGUNA PARTE del código. `empaquetar.py` decide qué viaja leyendo lo que el código</sub>
- **El suelo avanza a 20 u/s, así que lo que se ve es** <sub>línea 298</sub>
  <br><sub>`vz − 20`. El arnés headless las lanzaba con `vz` de 10 a 25: la mitad SE ALEJABAN. Headless da igual —son números que se mueven— pero en pantalla es un juego donde no llega</sub>
- **La emisión estaba a 0,55 y con el bloom a 1,5 la escena** <sub>línea 333</sub>
  <br><sub>se lavaba entera: un borrón blanco y rosa donde no se distinguía una roca de una nave. El bloom es un adorno que se come el dibujo si todo brilla; brillan poco los cuerpos</sub>
- **Esto era `m.material.dispose()` y funcionó mientras** <sub>línea 352</sub>
  <br><sub>todo eran mallas. Al pasar a modelos GLB, cada cuerpo es un GRUPO: `grupo.material` no existe y reventaba en CADA fotograma. Se recorre, que sirve para los dos casos.</sub>

### `public/labs/croupier_sin_hub.html`

- **Cortamos el hub ANTES de cargar nada.** <sub>línea 26</sub>
  <br><sub>window.ALISA_HUB_URL = null;</sub>

### `public/labs/croupier_terminal.html`

- **Aquí se pedía `css/style.css`, que NO EXISTE desde hace tiempo.** <sub>línea 9</sub>
  <br><sub>producción el servidor contesta con la página de 404 —que es HTML— y el navegador la rechaza: «Refused to apply style… MIME type text/html». O sea, un error rojo en consola y la página sin estilar, y nadie lo vio</sub>

### `public/labs/croupier_turing_test.html`

- **OJO CON ESTE NÚMERO.** <sub>línea 95</sub>
  <br><sub>dijera "humano" siempre, ya acertaría el 50%. Lo que importa es la matriz. const cazadas = ev.matriz.maquina.maquina; const totalMaquinas = ev.matriz.maquina.humano + ev.matriz.maquina.maquina;</sub>
- **EL 65% ENGAÑA.** <sub>línea 107</sub>
  <br><sub>`  Solo caza ${cazadas} de ${totalMaquinas} máquinas (${(recall*100).toFixed(0)}%), y son justo\n` + `  las tontas — las de varianza 0. Contra una heurística decente es CIEGO.\n\n` + `  Y eso no es un fallo del banco: **es el resultado**. Distinguir a una\n` +</sub>

### `public/labs/croupier_verificador_test.html`

- **Mi primera versión usaba REVERSI aquí y el truco "se colaba".** <sub>línea 79</sub>
  <br><sub>agujero: reversi **no tiene azar** —su tablero de salida es fijo—, así que cambiar la semilla no cambia nada y pasar era lo correcto. Para probar esto hace falta un juego donde la semilla mande de verdad, como snake.</sub>

### `public/labs/croupier_webgpu_anomalia.html`

- **Importmap propio: aquí `three` ES el build de WebGPU, y `three/tsl`** <sub>línea 51</sub>
  <br><sub>apunta al MISMO fichero (en r170 no hay `three.tsl.js` suelto). --> <script type="importmap"> {</sub>
- **La API, preguntada al propio objeto en vez de supuesta: `pass()` da un** <sub>línea 128</sub>
  <br><sub>PassNode, y la imagen se coge con `.getTextureNode()`. Para muestrear en unas coordenadas cualesquiera se usa **`.uv(coordenada)`**, no `.sample(...)` — que fue mi primer intento y dio 190 errores por fotograma.</sub>

### `public/labs/croupier_webgpu_sonda.html`

- **Importmap DISTINTO al del resto del sitio: aquí `three` ES el build de** <sub>línea 40</sub>
  <br><sub>WebGPU. Mezclar los dos builds en una página duplica la librería y rompe `instanceof`; por eso el salto se hace página a página, no a medias. --> <script type="importmap"></sub>

### `public/labs/croupier_xiangqi_test.html`

- **Mi primera versión ponía los generales en e9 y e0 — la MISMA columna que** <sub>línea 64</sub>
  <br><sub>la pieza de prueba. Al mover el caballo, los generales quedaban mirándose y TODAS sus jugadas eran ilegales: salían 0 destinos. El motor tenía razón; la posición estaba mal montada. Los generales van a columnas distintas.</sub>

### `public/labs/escena_archetypeenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_biolabenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_cabinetenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_chopperflight.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_colonialcontrolroom.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_dojoenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_interactionlab.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_locomotionenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_morpheusenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/escena_pygmalionenvironment.html`

- **ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.** <sub>línea 38</sub>
  <br><sub>Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive en `labs/js/montarEscena.js`, igual que las páginas de tablero viven en `arcade/js/montarMesa.js`. Quien lea esto ve que el motor SE COMPONE — que es</sub>

### `public/labs/pieza.html`

- **ESTE LANZADOR TAMPOCO ADIVINA BIEN SIEMPRE.** <sub>línea 60</sub>
  <br><sub>Inspecciona lo que el módulo exporta de verdad —constructor, aridad, métodos— y escribe en pantalla qué encontró, qué probó y qué pasó. Cuando acierta, la pieza se ve. Cuando no, sale un informe que dice exactamente qué le falta en</sub>
- **SE BUSCAN AYUDANTES ESTÁTICOS, Y ESTO SALIÓ DE UN HALLAZGO.** <sub>línea 134</sub>
  <br><sub>La primera versión construía con `(scene, core)` y `CarverEnvironmentFactory` contestó con un error que era, en realidad, documentación:</sub>
- **ENCUADRAR LO QUE SE HAYA CONSTRUIDO, SEA DONDE SEA.** <sub>línea 189</sub>
  <br><sub>`BiolabEnvironmentFactory` construye 232 mallas y la página se veía NEGRA: la cámara por defecto miraba al origen y la pieza estaba en otro sitio, o a otra escala. Con 39 piezas por revisar, dejar la cámara fija habría hecho parecer</sub>
- **EL RADIO SALE DE LA DIAGONAL, NO DEL LADO MAYOR — Y SE ACERCA.** <sub>línea 213</sub>
  <br><sub>La primera versión usaba el lado mayor por 1.4 de aire. Con el biolab —100×4×100, o sea un suelo enorme con cosas bajitas encima— eso ponía la cámara a 190 unidades, y desde ahí la escena entera se confundía con el</sub>
- **LA DISTANCIA SALE DE MEDIR, NO DE LA TRIGONOMETRÍA.** <sub>línea 224</sub>
  <br><sub>La fórmula "correcta" —encajar la caja en el campo de visión— daba 407 unidades para el dojo, y ahí se pintaban CERO píxeles. A 203 se pintaban 4.469. La razón: estas escenas son enormes y dispersas, y a la distancia</sub>
- **LUZ PROPIA DEL LANZADOR, Y HAY QUE DECIR POR QUÉ.** <sub>línea 247</sub>
  <br><sub>Medido con `DojoEnvironmentFactory`: a 0,4 de su diagonal se pintaban 3.659 píxeles; a 0,8 y a 1,5, **cero**. Cuanto más lejos, menos — y eso no es cosa de la geometría, es que **la alumbran luces de alcance corto** puestas por su</sub>
- **Y NO ES NEUTRAL: esta luz CAMBIA cómo se ve la pieza respecto a su montaje** <sub>línea 257</sub>
  <br><sub>original. Aquí sirve para responder «¿hay algo?», no «¿qué aspecto tiene?». Para lo segundo hay que abrir su página, o dársela.</sub>
- **UN CUADRO A MANO, SIEMPRE.** <sub>línea 277</sub>
  <br><sub>`startLoop` va con `requestAnimationFrame`, y **el navegador no lo dispara si la pestaña no está visible**. Con la ventana detrás o minimizada, esta página se quedaba completamente negra: cero cuadros, cero llamadas, cero triángulos —</sub>
- **BLOOM, PORQUE MUCHAS PIEZAS ESTÁN HECHAS CONTANDO CON ÉL.** <sub>línea 293</sub>
  <br><sub>`BiolabEnvironmentFactory` construye 239 mallas con materiales de neón —cian `00ffaa`, LEDs, tubos— y en un `AlisaRenderCore` pelado se veía **casi negra**: geometría apenas insinuada sobre fondo oscuro. No estaba rota; le faltaba su</sub>
- **SE DIBUJA DIRECTO Y ADEMÁS CON BLOOM, EN ESE ORDEN.** <sub>línea 315</sub>
  <br><sub>El compositor del bloom puede acabar en negro para escenas que no esperaba, y entonces esta página mentiría: diría «no se ve nada» de una pieza que sí se dibuja. Se pinta primero el dibujado directo —que es la verdad— y después se</sub>
- **Se cuentan MALLAS, no hijos de la escena.** <sub>línea 343</sub>
  <br><sub>dentro de un `Group` marcaba «1 objeto» igual que una que no puso nada: con ese número mandé a mirar las piezas equivocadas. caja(`<div class="${mallas ? 'ok' : 'no'}">${mallas ? 'Arrancada.' : 'Arrancada, pero vacía.'}</div>`</sub>

### `public/manifiesto/terminal.html`

- **Install MetaMask or Coinbase Wallet';** <sub>línea 1028</sub>
  <br><sub>status.style.color = '#ff6b6b'; window.open('https://metamask.io/download/', '_blank'); return;</sub>

### `public/motor.html`

- **POR QUÉ EXISTE ESTA PÁGINA** <sub>línea 9</sub>
  <br><sub>Una terminal de la sala apuntaba a `lab_heritage.html`, que el manifiesto público EXCLUYE — o sea que el día de publicar habría llevado a un 404. Al auditar las 24 estaciones salió eso y el 404 de la portada.</sub>

### `public/rooms/room_arcade_hall.html`

- **`sync: true` a secas abre un WebSocket a `/overworld/sync`, que** <sub>línea 147</sub>
  <br><sub>sólo existe en el hub de la colonia. En producción eso deja un 404 de handshake en la consola de cualquiera que entre — dos veces, porque reintenta. La sala funciona igual sin él: el multijugador es una</sub>

### `public/rooms/room_art_direction_BACKUP_20260420_0057.html`

- **Hub save failed: ${e.message}`);** <sub>línea 1113</sub>
  <br><sub>}); }</sub>

### `public/rooms/room_art_direction_BACKUP_20260420_0110_16archetypes.html`

- **Hub save failed: ${e.message}`);** <sub>línea 1366</sub>
  <br><sub>}); }</sub>

### `public/rooms/room_art_direction_BACKUP_20260420_0117_19archetypes.html`

- **Hub save failed: ${e.message}`);** <sub>línea 1476</sub>
  <br><sub>}); }</sub>

### `public/rooms/room_art_direction_BACKUP_20260420_0121_21archetypes.html`

- **Hub save failed: ${e.message}`);** <sub>línea 1514</sub>
  <br><sub>}); }</sub>

### `public/rooms/room_pocket_blanco.html`

- **El halo blanco no es adorno: la mirilla y el rótulo son oscuros porque** <sub>línea 56</sub>
  <br><sub>la sala es blanca, pero al apuntar a una máquina caen sobre su PANTALLA, que es negra — y desaparecían justo en el momento en que hacen falta. Con el contorno claro se leen sobre los dos fondos. */</sub>
- **EL HUD DIJO UNA MENTIRA DURANTE TODO EL DESARROLLO.** <sub>línea 163</sub>
  <br><sub>La primera línea era «incubación 12.5%»: una constante clavada que jamás cambiaba. En un sitio cuya idea entera es «todo esto se puede comprobar», enseñar de primeras un número inventado no es un detalle de adorno: es la</sub>
- **El cajón NO puede ser `display:none`, aunque así estaba en la sala** <sub>línea 203</sub>
  <br><sub>original. El cartucho pasa aquí sus primeros instantes, mientras carga, y un iframe sin caja tiene un lienzo de 0×0: los juegos WebGL arrancaban ciegos y escupían cientos de "Framebuffer is incomplete: zero size" —</sub>
- **La primera versión de esta pantalla era solo poesía, y un recién llegado** <sub>línea 234</sub>
  <br><sub>no sabía si esto era un juego, una web o una obra. La frase bonita funciona mucho mejor DESPUÉS de saber dónde te has metido: primero qué es y cómo se anda, luego el misterio. --></sub>
- **ESTO ES PRIOR ART Y ES MEJOR QUE LO QUE YO HABÍA HECHO.** <sub>línea 282</sub>
  <br><sub>Yo creaba un iframe por cada estación a menos de 15 m — hasta media docena vivos a la vez, cada uno con un juego cargado. Funcionaba, pero es caro y es conceptualmente flojo: seis juegos corriendo para que mires uno.</sub>
- **Esto faltaba, y era el hueco entre lo que promete la portada —«mismas** <sub>línea 337</sub>
  <br><sub>reglas para personas y para máquinas»— y lo que había: existían 5 entornos y NINGUNA de las 24 estaciones declaraba el suyo. Se podía verificar la partida de otro, pero una máquina no podía jugar aquí.</sub>
- **ESTOS TRES ESTABAN EN `legacy/` Y NO LOS ENLAZABA NADIE.** <sub>línea 347</sub>
  <br><sub>Son los juegos más terminados que tenemos —87, 62 y 42 KB— y llevaban meses dados por obsoletos. No lo estaban: el traslado a `legacy/` les rompió las rutas y una pantalla rota se parece a una pantalla vieja.</sub>
- **Aquí se sumaban 55 puntos por MATERIALIZAR la estación, o sea por** <sub>línea 1501</sub>
  <br><sub>pasear cerca. Cualquiera salía con 500 puntos sin tocar un juego, y el pacto de la puerta —«todo lo de aquí puntúa: qué resuelves»— era una frase sobre nada. Explorar sigue contando, pero cuenta donde debe:</sub>
- **Aquí se escribía `anomalía: latente/presente/desplazándose`.** <sub>línea 1577</sub>
  <br><sub>HUD a propósito: era telemetría sobre TI que nadie había explicado, y el umbral ahora lo dice mejor en una frase («tú eres la anomalía»). Dejar el código escribiendo en un elemento borrado tiraba la sala entera en el primer</sub>
- **El objetivo GIRA, y ese es todo el truco.** <sub>línea 1601</sub>
  <br><sub>punto fijo se apelmaza encima de él: lo medí, radio medio 1,6 m — 90 almas clavadas en el eje del huevo. Persiguiendo un punto que orbita, la persecución ES la órbita. Sin tocar la física, que es del motor.</sub>
- **La anomalía se doblaba con la APORTACIÓN, o sea con lo que paseas.** <sub>línea 1615</sub>
  <br><sub>la misma mentira que tenía el HUD, escondida en la imagen: el efecto más vistoso de la sala premiaba andar. Ahora crece con lo que has DEMOSTRADO — partidas verificadas— y el paseo solo aporta un roce.</sub>

### `public/rooms/room_sala_del_huevo.html`

- **El halo blanco no es adorno: la mirilla y el rótulo son oscuros porque** <sub>línea 56</sub>
  <br><sub>la sala es blanca, pero al apuntar a una máquina caen sobre su PANTALLA, que es negra — y desaparecían justo en el momento en que hacen falta. Con el contorno claro se leen sobre los dos fondos. */</sub>
- **EL HUD DIJO UNA MENTIRA DURANTE TODO EL DESARROLLO.** <sub>línea 163</sub>
  <br><sub>La primera línea era «incubación 12.5%»: una constante clavada que jamás cambiaba. En un sitio cuya idea entera es «todo esto se puede comprobar», enseñar de primeras un número inventado no es un detalle de adorno: es la</sub>
- **El cajón NO puede ser `display:none`, aunque así estaba en la sala** <sub>línea 206</sub>
  <br><sub>original. El cartucho pasa aquí sus primeros instantes, mientras carga, y un iframe sin caja tiene un lienzo de 0×0: los juegos WebGL arrancaban ciegos y escupían cientos de "Framebuffer is incomplete: zero size" —</sub>
- **La primera versión de esta pantalla era solo poesía, y un recién llegado** <sub>línea 237</sub>
  <br><sub>no sabía si esto era un juego, una web o una obra. La frase bonita funciona mucho mejor DESPUÉS de saber dónde te has metido: primero qué es y cómo se anda, luego el misterio. --></sub>
- **ESTO ES PRIOR ART Y ES MEJOR QUE LO QUE YO HABÍA HECHO.** <sub>línea 285</sub>
  <br><sub>Yo creaba un iframe por cada estación a menos de 15 m — hasta media docena vivos a la vez, cada uno con un juego cargado. Funcionaba, pero es caro y es conceptualmente flojo: seis juegos corriendo para que mires uno.</sub>
- **Esto faltaba, y era el hueco entre lo que promete la portada —«mismas** <sub>línea 340</sub>
  <br><sub>reglas para personas y para máquinas»— y lo que había: existían 5 entornos y NINGUNA de las 24 estaciones declaraba el suyo. Se podía verificar la partida de otro, pero una máquina no podía jugar aquí.</sub>
- **ESTOS TRES ESTABAN EN `legacy/` Y NO LOS ENLAZABA NADIE.** <sub>línea 350</sub>
  <br><sub>Son los juegos más terminados que tenemos —87, 62 y 42 KB— y llevaban meses dados por obsoletos. No lo estaban: el traslado a `legacy/` les rompió las rutas y una pantalla rota se parece a una pantalla vieja.</sub>
- **AQUÍ HABÍA CATORCE DIRECCIONES ESCRITAS A MANO, Y YA SE HABÍAN SEPARADO.** <sub>línea 382</sub>
  <br><sub>Cada mesa traía su `u:'../arcade/mesa.html?juego=brisca'`. El día que brisca, tute, hearts, spades, gofish y unit estrenaron página propia, estas seis líneas quedaron señalando a la genérica — seguía funcionando, así que nadie lo notó.</sub>
- **Y VAN TODAS A LA SALA DE BOLSILLO, NO A LA PÁGINA PLANA.** <sub>línea 392</sub>
  <br><sub>`sala.html` dibuja el juego sobre una mesa igual que ésta, a escala de persona. Sentarse aquí y entrar por `/arcade/entrar` tienen que ser lo mismo, y hasta hoy no lo eran: aquí te cargaba la página plana en la pantallita de una máquina,</sub>
- **Y `cartas` TAMPOCO SE DECLARA: LO DICE EL JUEGO.** <sub>línea 428</sub>
  <br><sub>`cartas` cambia lo que hay ENCIMA de la mesa —tapete y baraja física en vez de tablero—, y estaba puesto a mano en nueve de las dieciséis. Es exactamente el dato que el sustrato ya publica: un juego con ZONAS y sin REJILLA es de cartas.</sub>
- **Esto era `catch { }` a secas, «para que nunca se ponga por delante de la** <sub>línea 689</sub>
  <br><sub>sala». Y me tapó mi propio fallo: los seres llegaban, el HUD los contaba bien, y no se pintaba ni uno — sin una sola pista de por qué. Pintar puede fallar sin llevarse la sala por delante, pero callarse el motivo no es</sub>
- **Una vez al entrar» decía el comentario, y NO se llamaba ni una vez: sólo** <sub>línea 697</sub>
  <br><sub>se programaba el intervalo. O sea que quien entraba veía «solo tú» durante veinte segundos aunque la sala estuviera llena — justo el momento en que uno mira si hay alguien. Un comentario que describe lo que el código no hace,</sub>
- **Y la primera llamada NO puede ir aquí: `motasDeSeres` se declara unas** <sub>línea 702</sub>
  <br><sub>líneas más abajo, así que pedir presencia antes reventaba con `Cannot access 'motasDeSeres' before initialization`. Va al final del bloque, cuando ya existe todo lo que necesita. El intervalo sí puede quedarse: para</sub>
- **Aquí ponía `reloj.getElapsedTime()`, y `reloj` se declara MUCHO más** <sub>línea 743</sub>
  <br><sub>abajo, en el bucle. Como esto se llama en cuanto contesta la presencia, saltaba `ReferenceError: reloj is not defined` — y con el `catch` vacío que tenía puesto, en silencio: los seres llegaban, el HUD los contaba, y no se</sub>
- **LA MESA SALE DE `protohub/mueble.js`, QUE ES DONDE VIVE AHORA.** <sub>línea 1084</sub>
  <br><sub>Estaba escrita aquí y otra vez en `arcade/sala.html` —la sala de bolsillo a la que lleva sentarse—, con los mismos números y distinto acabado: allí la tapa iba a `roughness .85` sin metal y aquí a `.55 / .06`. Se vio comparando las dos</sub>
- **2,10 Y NO 1,34, Y EL NÚMERO SALE DE MEDIR, NO DE ELEGIR.** <sub>línea 1098</sub>
  <br><sub>Este tapete medía 1,34 y el de `sala.html` 2,68 — el doble—, así que al sentarte cambiaba de tamaño debajo de las manos. Y ninguno de los dos estaba bien: la brisca reparte 1,47 de ancho y UNIT 1,79, o sea que se</sub>
- **AQUÍ FLOTABA UNA PANTALLA SOBRE CADA MESA, Y YA NO PINTA NADA.** <sub>línea 1138</sub>
  <br><sub>Un plano de 1,5 × 1,125 a 1,72 m de altura, en medio del aire encima del tapete. Existía porque las mesas se jugaban como los recreativos: el juego se proyectaba ahí con el holograma CSS3D. Desde que se sientan en la sala de</sub>
- **LA CONDICIÓN ERA «TIENE PANTALLA», Y ESO YA NO ES LO QUE HACE FALTA.** <sub>línea 1211</sub>
  <br><sub>Servía de dos cosas a la vez: comprobar que el mueble está construido —se materializa al acercarte— y que hay dónde proyectar. Al quitarles la pantalla a las mesas, esa línea las dejaba fuera: te acercabas, ponía</sub>
- **UNA MESA NO ES UN RECREATIVO, Y HASTA HOY SE TRATABAN IGUAL.** <sub>línea 1240</sub>
  <br><sub>Esto apagaba la dimensión de bolsillo a mano —`pd.style.display='none'`— y mandaba TODO al holograma CSS3D, o sea a la pantallita del mueble. Para un arcade está bien: un recreativo se juega mirando su pantalla, de pie.</sub>
- **Aquí se sumaban 55 puntos por MATERIALIZAR la estación, o sea por** <sub>línea 1798</sub>
  <br><sub>pasear cerca. Cualquiera salía con 500 puntos sin tocar un juego, y el pacto de la puerta —«todo lo de aquí puntúa: qué resuelves»— era una frase sobre nada. Explorar sigue contando, pero cuenta donde debe:</sub>
- **Aquí se escribía `anomalía: latente/presente/desplazándose`.** <sub>línea 1895</sub>
  <br><sub>HUD a propósito: era telemetría sobre TI que nadie había explicado, y el umbral ahora lo dice mejor en una frase («tú eres la anomalía»). Dejar el código escribiendo en un elemento borrado tiraba la sala entera en el primer</sub>
- **El objetivo GIRA, y ese es todo el truco.** <sub>línea 1919</sub>
  <br><sub>punto fijo se apelmaza encima de él: lo medí, radio medio 1,6 m — 90 almas clavadas en el eje del huevo. Persiguiendo un punto que orbita, la persecución ES la órbita. Sin tocar la física, que es del motor.</sub>
- **La anomalía se doblaba con la APORTACIÓN, o sea con lo que paseas.** <sub>línea 1933</sub>
  <br><sub>la misma mentira que tenía el HUD, escondida en la imagen: el efecto más vistoso de la sala premiaba andar. Ahora crece con lo que has DEMOSTRADO — partidas verificadas— y el paseo solo aporta un roce.</sub>

### `public/rooms/room_sovereign_casino.html`

- **El halo blanco no es adorno: la mirilla y el rótulo son oscuros porque** <sub>línea 56</sub>
  <br><sub>la sala es blanca, pero al apuntar a una máquina caen sobre su PANTALLA, que es negra — y desaparecían justo en el momento en que hacen falta. Con el contorno claro se leen sobre los dos fondos. */</sub>
- **EL HUD DIJO UNA MENTIRA DURANTE TODO EL DESARROLLO.** <sub>línea 163</sub>
  <br><sub>La primera línea era «incubación 12.5%»: una constante clavada que jamás cambiaba. En un sitio cuya idea entera es «todo esto se puede comprobar», enseñar de primeras un número inventado no es un detalle de adorno: es la</sub>
- **El cajón NO puede ser `display:none`, aunque así estaba en la sala** <sub>línea 203</sub>
  <br><sub>original. El cartucho pasa aquí sus primeros instantes, mientras carga, y un iframe sin caja tiene un lienzo de 0×0: los juegos WebGL arrancaban ciegos y escupían cientos de "Framebuffer is incomplete: zero size" —</sub>
- **La primera versión de esta pantalla era solo poesía, y un recién llegado** <sub>línea 219</sub>
  <br><sub>no sabía si esto era un juego, una web o una obra. La frase bonita funciona mucho mejor DESPUÉS de saber dónde te has metido: primero qué es y cómo se anda, luego el misterio. --></sub>
- **ESTO ES PRIOR ART Y ES MEJOR QUE LO QUE YO HABÍA HECHO.** <sub>línea 267</sub>
  <br><sub>Yo creaba un iframe por cada estación a menos de 15 m — hasta media docena vivos a la vez, cada uno con un juego cargado. Funcionaba, pero es caro y es conceptualmente flojo: seis juegos corriendo para que mires uno.</sub>
- **Esto faltaba, y era el hueco entre lo que promete la portada —«mismas** <sub>línea 326</sub>
  <br><sub>reglas para personas y para máquinas»— y lo que había: existían 5 entornos y NINGUNA de las 24 estaciones declaraba el suyo. Se podía verificar la partida de otro, pero una máquina no podía jugar aquí.</sub>
- **ESTOS TRES ESTABAN EN `legacy/` Y NO LOS ENLAZABA NADIE.** <sub>línea 338</sub>
  <br><sub>Son los juegos más terminados que tenemos —87, 62 y 42 KB— y llevaban meses dados por obsoletos. No lo estaban: el traslado a `legacy/` les rompió las rutas y una pantalla rota se parece a una pantalla vieja.</sub>
- **Apuntaba a `lab_heritage.html`, que el manifiesto público EXCLUYE: el día** <sub>línea 384</sub>
  <br><sub>de publicar habría sido un 404 dentro de la sala. Y si esto sale abierto, hace falta un sitio DENTRO del mundo donde el motor se explique. { n:'El Motor',       u:'../motor.html' },</sub>
- **Apuntaba a `../index.html`, que NO EXISTÍA: era la única de las 24** <sub>línea 390</sub>
  <br><sub>estaciones que daba 404, y encima la puerta del sitio entero. Ahora la portada existe y esta terminal lleva al catálogo, que es lo que un visitante quiere desde dentro: ver TODO lo que hay.</sub>
- **El umbral (tercer argumento) es LO IMPORTANTE en una escena blanca.** <sub>línea 439</sub>
  <br><sub>Con 0.92 el bloom mordía el blanco del fondo y lo desbordaba todo: la pantalla se volvía leche y los objetos perdían el borde. Subido a 1.05, solo desbordan las cosas que EMITEN —el núcleo del huevo, los vóxeles— que es</sub>
- **SEGUNDA CORRECCIÓN, y más grave que la del umbral: la FUERZA y el RADIO.** <sub>línea 444</sub>
  <br><sub>Con 0.62 y 0.7 el resplandor del huevo se derramaba por medio cuadro y lo lavaba TODO. Lo comprobé apagando el pase: con bloom, la pantalla de un arcade —negro #0d1218— se veía gris claro, y un rojo puro salía rosa pálido.</sub>
- **ERROR REAL, cazado en la revisión de arte: el huevo usa `transmission` y** <sub>línea 465</sub>
  <br><sub>`clearcoat: 1.0`, pero no había NI UN entorno que reflejar. Un clearcoat sin nada que espejar no se lee como cristal: se lee como plástico mate con un punto de brillo. Y es el objeto central de la sala.</sub>
- **PERO LA ECLOSIÓN NO ES ESE ARCO, Y NO DEBE SERLO.** <sub>línea 545</sub>
  <br><sub>El huevo eclosiona con **la Avenida de la Reina**: cuando haya cómputo en red suficiente para sostener el sistema y existan las divisas. Es EL acontecimiento del proyecto, y ocurre una sola vez, de verdad, para todo el</sub>
- **Aquí había `const INCUBACION_REAL = 0.125` y el HUD lo pintaba como si** <sub>línea 566</sub>
  <br><sub>fuera telemetría. No lo era: era un número escrito a mano que no cambiaba nunca. Ahora empieza en `null` —no lo sabemos— y solo se rellena si la colonia lo dice. Un sitio que presume de verificable no puede abrir con un</sub>
- **NI SIQUIERA SE INTENTA SI NO PUEDE HABER HUB.** <sub>línea 574</sub>
  <br><sub>El hub de la colonia vive en `http://127.0.0.1:8741`, y desde una página servida por HTTPS el navegador **bloquea** esa petición por contenido mixto. El `.catch()` de abajo lo aguantaba sin romper nada —conectarse es una mejora,</sub>
- **`radio` = anchura/2 exacta, o el cuadrado NO CIERRA: con radio 12,5 y** <sub>línea 709</sub>
  <br><sub>caras de 17 quedaban cuatro tablones sueltos que desde medio lado se veían de canto. Con 8,5 las esquinas se tocan y es un panel colgado de verdad. width: 17, height: 1.3, caras: 4, radio: 8.5,</sub>
- **Dos trampas, las dos medidas:** <sub>línea 749</sub>
  <br><sub>1. **three tiene SU PROPIO contexto de audio**, distinto del que abre la sala, y nace suspendido. Sin `resume()` tras un gesto del visitante, los sonidos se crean, dicen que existen… y no suenan. Cero errores en consola.</sub>
- **Nueve de las diecinueve mesas del arcade no tienen reglas locales: se** <sub>línea 817</sub>
  <br><sub>sientas y te reciben con un `DISCONNECTED` en rojo. En el índice ya salían marcadas, pero DENTRO de la sala no, y ahí es donde duele. Una máquina apagada es honesta; una encendida que no responde parece rota.</sub>
- **Y necesita `THREE` como GLOBAL.** <sub>línea 854</sub>
  <br><sub>los seis constructores petaban con `THREE is not defined` — 190 errores y la sala entera sin arrancar. El laboratorio no lo sufría porque allí three se carga a la vieja usanza. Este puente de una línea es el precio de reutilizar</sub>
- **Eran blancos, y en una sala blanca un cubo blanco es un cubo invisible.** <sub>línea 919</sub>
  <br><sub>Van en cian de dato — el color de "esto todavía no es materia, es información". Es la única licencia cromática de la sala, y por eso funciona: cuando ves azul, sabes que algo se está construyendo.</sub>
- **Aquí había un `g.lookAt(0, 1.4, 0)` con el comentario "todas miran al** <sub>línea 993</sub>
  <br><sub>huevo". No lo hacían: solo acertaba la primera. El giro salía con el signo del ángulo cambiado, así que cada estación se desviaba el doble de su posición en el anillo — y la de enfrente del huevo enseñaba la ESPALDA.</sub>
- **Aquí yo pintaba 64 losetas a mano. `js/arcade_boards.js` ya traía** <sub>línea 1041</sub>
  <br><sub>seis tableros de verdad —reversi, mancala, damas, go, xiangqi, backgammon— con sus piezas colocadas, y el laboratorio `croupier_table_games_arcade.html` enseñaba cómo se usan.</sub>
- **El tablero NO puede ser la pantalla, por tentador que sea.** <sub>línea 1070</sub>
  <br><sub>deduce el tamaño físico de la malla, y en un plano tumbado la altura local vale ~0: el cartucho saldría a escala absurda y la malla de raycast sería una línea sin grosor, imposible de clicar. Así que el</sub>
- **Tres intentos y dos equivocados, por adivinar en vez de leer:** <sub>línea 1084</sub>
  <br><sub>`Math.PI`      → la máquina de perfil `Math.PI / 2`  → tampoco; copié `cssRotationOffset` del ejemplo, y ese número NO es para el mueble: es para el CARTUCHO CSS3D.</sub>
- **Una malla puede tener un ARRAY de materiales (una carta tiene seis** <sub>línea 1114</sub>
  <br><sub>caras distintas: dorso, canto…), y un array no tiene `.clone()`. Sin este rodeo, poner una baraja encima de una mesa reventaba la materialización entera de la estación con un TypeError.</sub>
- **SENTARSE ES ACERCARSE, Y ESTO FALTABA.** <sub>línea 1161</sub>
  <br><sub>La mira engancha una máquina a quince metros, así que se podía «sentar» sin moverse: el cartucho se montaba de verdad —cargado, proyectado y clicable— pero seguía allí, en su mueble, del tamaño de un sello. Lo comprobé en el</sub>
- **AQUÍ ESTABA EL «NO SE PUEDE JUGAR A NADA».** <sub>línea 1184</sub>
  <br><sub>El cartucho nace MONTADO: pegado a la máquina y con `pointerEvents: none`, o sea mirándose pero sin recibir un clic. Para jugar había que clicar el cristal y que pasara a PROYECTADO. Un paso invisible — y en esta sala era el</sub>
- **Esto es lo que hace verdad el pacto de la puerta.** <sub>línea 1228</sub>
  <br><sub>puntos por MATERIALIZAR estaciones, o sea por pasear: cualquiera sacaba 500 puntos sin tocar un juego. «Todo lo de aquí puntúa» era una frase bonita sobre nada.</sub>
- **Esto se rendía EN SILENCIO con tres `return null` seguidos.** <sub>línea 1248</sub>
  <br><sub>mal, una persona pierde su partida y no se entera de nada — y quien depure esto mañana tampoco. Ahora cada renuncia dice por qué. Callarse un fallo no lo hace más pequeño, lo hace más caro.</sub>
- **Se ejecuta AL COBRAR, no al pulsar el botón, y por una razón de fondo: al** <sub>línea 1374</sub>
  <br><sub>levantarte el cartucho se desconecta y el iframe vuelve a `about:blank`, así que el módulo de reglas —que vive en el contexto de ESE iframe— desaparece con él. Guardarme una referencia sería guardar un fantasma de un contexto</sub>
- **Esto era `Math.PI` y hacía que llegaras DE ESPALDAS al huevo: con la cámara** <sub>línea 1603</sub>
  <br><sub>en z=+44, el frente (0,0,-1) girado 180° apunta a +z, o sea hacia fuera. Lo primero que ve un visitante era el vacío. A 0, el frente mira al origen. let giroH = 0, giroV = -0.04, dentro = false;</sub>
- **AQUÍ ESTABA `dentro = !!document.pointerLockElement`, y era un callejón sin** <sub>línea 1632</sub>
  <br><sub>salida. `dentro` gobierna todo, y ESC suelta el puntero en CUALQUIER navegador — o sea que el propio pie de página («esc para soltar») mandaba al visitante a un estado donde ya no podía mirar ni usar nada, sin ninguna forma de volver</sub>
- **ESTE ERA EL FALLO QUE DEJABA LA SALA INJUGABLE, Y SON DOS QUE SE SUMAN.** <sub>línea 1651</sub>
  <br><sub>1. Mirar dependía EN EXCLUSIVA del bloqueo de puntero: `if (!document.pointerLockElement) return;`. Sin bloqueo, la cámara se queda clavada mirando al mismo punto para siempre.</sub>
- **Y aquí la segunda mitad del fallo: si el navegador NUNCA concede el** <sub>línea 1799</sub>
  <br><sub>bloqueo, este `return` se comía todos los clics para siempre. Ahora sólo se gasta un clic en recuperar la cámara mientras la captura siga siendo posible; si no lo es, se usa directamente y se mira arrastrando.</sub>
- **El clic que cruza el umbral seguía viajando hasta aquí y abría la ficha** <sub>línea 1810</sub>
  <br><sub>de la primera máquina que pillara el rayo: entrabas y te recibía un panel encima de la cara, antes incluso de ver la sala. Durante la llegada no se usa nada — la llegada se mira.</sub>
- **Antes esto abría la página directamente en otra pestaña.** <sub>línea 1818</sub>
  <br><sub>sala: te sacaba del mundo de un salto, sin transición y sin contexto.</sub>
- **Aquí se sumaban 55 puntos por MATERIALIZAR la estación, o sea por** <sub>línea 2016</sub>
  <br><sub>pasear cerca. Cualquiera salía con 500 puntos sin tocar un juego, y el pacto de la puerta —«todo lo de aquí puntúa: qué resuelves»— era una frase sobre nada. Explorar sigue contando, pero cuenta donde debe:</sub>
- **Aquí se escribía `anomalía: latente/presente/desplazándose`.** <sub>línea 2092</sub>
  <br><sub>HUD a propósito: era telemetría sobre TI que nadie había explicado, y el umbral ahora lo dice mejor en una frase («tú eres la anomalía»). Dejar el código escribiendo en un elemento borrado tiraba la sala entera en el primer</sub>
- **El objetivo GIRA, y ese es todo el truco.** <sub>línea 2116</sub>
  <br><sub>punto fijo se apelmaza encima de él: lo medí, radio medio 1,6 m — 90 almas clavadas en el eje del huevo. Persiguiendo un punto que orbita, la persecución ES la órbita. Sin tocar la física, que es del motor.</sub>
- **La anomalía se doblaba con la APORTACIÓN, o sea con lo que paseas.** <sub>línea 2130</sub>
  <br><sub>la misma mentira que tenía el HUD, escondida en la imagen: el efecto más vistoso de la sala premiaba andar. Ahora crece con lo que has DEMOSTRADO — partidas verificadas— y el paseo solo aporta un roce.</sub>

### `public/terminal.html`

- **Install MetaMask or Coinbase Wallet';** <sub>línea 1028</sub>
  <br><sub>status.style.color = '#ff6b6b'; window.open('https://metamask.io/download/', '_blank'); return;</sub>

### `terminal.html`

- **Install MetaMask or Coinbase Wallet';** <sub>línea 1030</sub>
  <br><sub>status.style.color = '#ff6b6b'; window.open('https://metamask.io/download/', '_blank'); return;</sub>

## Las páginas de los juegos

### `public/arcade/alisapolis.html`

- **EL PRIMERO QUE USA LOS CUATRO MATERIALES A LA VEZ.** <sub>línea 10</sub>
  <br><sub>Tablero (el anillo, como parchís y oca), dados (los mismos objetos de la generala y el dominó), cartas (el mazo de decretos, boca abajo sobre el tablero) y fichas (los peones). Sin motor nuevo: el contrato de siempre —rejilla, piezas y zonas— ya lo</sub>
- **Y EL PRIMERO QUE MIDE VALORAR BAJO COMPETENCIA.** <sub>línea 17</sub>
  <br><sub>La matriz de géneros tiene ocho columnas y ninguna cubre la pregunta de una subasta: cuánto vale esto para mí sabiendo lo que vale para el otro. No es información oculta —aquí está todo a la vista—, ni comunicación, ni simultaneidad. El póker se acerca y</sub>
- **NO SE COMPRA AL PRECIO DE LISTA, Y ESO NO ES UN DESCUIDO.** <sub>línea 25</sub>
  <br><sub>Lo escribí primero como en la mesa —compras, y sólo hay subasta si renuncias— y midiéndolo resultó que mataba el juego: el patrimonio cuenta las fincas por su precio, así que comprar al precio de lista es neutro y encima renta. O sea que</sub>
- **LO QUE HACE QUE ESTE JUEGO ESTÉ EN EL BANCO Y NO SEA UN ADORNO.** <sub>línea 35</sub>
  <br><sub>Antes de escribir una línea del tablero se midió la subasta SOLA —cuarenta líneas, sin dados ni cartas— para saber si separaba a un jugador bueno de uno malo. Separaba con señal/ruido 30, y de paso destapó que a igualdad de valoración ganaba quien puja</sub>

### `public/arcade/brisca.html`

- **ESTA PÁGINA ES LA PRUEBA DE QUE LO DE ENTROPY ERA UNA LECCIÓN Y NO UNA** <sub>línea 6</sub>
  <br><sub>ANÉCDOTA.</sub>

### `public/arcade/canadiense.html`

- **ESTAS REGLAS SON LAS NUESTRAS, NO «LAS» REGLAS.** <sub>línea 12</sub>
  <br><sub>El juego existe con muchos nombres —Tock, Toc, Dog— y las variantes regionales no coinciden entre sí. La versión que se juega aquí está declarada entera en la cabecera de `js/protohub/rules/canadiense.js`, para que nadie compare un</sub>
- **Y ES EL PRIMER JUEGO QUE USA LAS DOS FAMILIAS DE MOTOR A LA VEZ.** <sub>línea 20</sub>
  <br><sub>Los de tablero publican `rejilla` y `piezas`; los de cartas publican `zonas`. `montarMesa.js` elige incluso el motor con esa frontera —«zonas y ninguna rejilla ⇒ es de cartas»—, y nadie había escrito hasta hoy un juego que</sub>

### `public/arcade/checkers.html`

- **SIN VISUALIZADOR PROPIO: ÉSTE ES EL PRIMERO QUE VUELVE A LA MESA GENÉRICA.** <sub>línea 33</sub>
  <br><sub>`checkers_visualizer.js` sigue en el repositorio pero ya no lo monta nadie. La mesa genérica dibuja las damas desde el sustrato y ofrece el clic origen-destino desde `acciones`, sin saber que existen las damas.</sub>

### `public/arcade/chinchon.html`

- **POR QUÉ ES UN JUEGO Y NO UNA CASILLA DE OPCIONES DEL REMIGIO.** <sub>línea 10</sub>
  <br><sub>Pregunta de Oscar: «el chinchón lo podemos hacer fácil, ¿sólo es una variación del remigio?». Casi. Tres de las diferencias salieron gratis —la baraja española ya cargaba, el reparto de siete ya era parámetro, y el uno sólo va bajo porque el</sub>
- **LO QUE NO ES COMO EN LA MESA DE VERDAD, y va dicho en la ficha.** <sub>línea 29</sub>
  <br><sub>Allí se juega una SERIE: se acumulan puntos mano a mano y quien pasa de cien se elimina. Aquí una partida es UNA mano — la misma decisión que en el dominó, y por el mismo motivo: el banco compara partidas, no veladas.</sub>

### `public/arcade/domino.html`

- **POR QUÉ ESTE ES DISTINTO A LOS TREINTA Y CINCO ANTERIORES.** <sub>línea 11</sub>
  <br><sub>Todos ellos colocan piezas en sitios LIBRES: una casilla vacía, un hueco de la caja de entropy, un asiento. La legalidad es «¿está ocupado?». Aquí la legalidad es un EMPAREJAMIENTO —el 6:3 sólo entra si en una punta hay un 6 o un 3— y el sitio donde</sub>
- **Y SIN EMBARGO EL ESPACIO DE ACCIONES ES DIMINUTO.** <sub>línea 21</sub>
  <br><sub>La cadena sólo tiene DOS puntas, tengas las fichas que tengas. Así que las jugadas legales son `jugar:6-3:izq`, `jugar:6-3:der`, `robar` y `pasar`. Es el contrario exacto del remigio, donde el estado es simple y las jugadas explotan.</sub>
- **POR QUÉ DECLARA VISUALIZADOR, COMO LA GENERALA Y POR EL MISMO MOTIVO.** <sub>línea 27</sub>
  <br><sub>Publica «zonas y ninguna rejilla», que es la firma de un juego de cartas, así que `montarMesa` le daría la mesa de casino. Y esa mesa no lee el sustrato NATIVO: lee `sustratoDe(juego, estado)`, un adaptador que sólo sabe de manos, mazos y descartes.</sub>

### `public/arcade/entrar.html`

- **POR QUÉ EXISTE, Y NO ES COMODIDAD.** <sub>línea 11</sub>
  <br><sub>Hasta hoy, invitar a alguien era fabricar una dirección a mano. En una sola tarde eso falló dos veces, las dos en silencio:</sub>
- **Y NO TRAE NINGUNA LISTA DE JUEGOS.** <sub>línea 27</sub>
  <br><sub>Los treinta salen de `rules/index.js`, y a qué página va cada uno de `data/paginas.json`, que se GENERA leyendo las propias páginas. Este proyecto ya ha tenido cinco listas escritas a mano separándose de la realidad sin avisar</sub>
- **UN NOMBRE DE SALA QUE SE PUEDA DICTAR POR TELÉFONO.** <sub>línea 137</sub>
  <br><sub>Sin `l`/`1`, `o`/`0` ni `i`: no es purismo, es que este nombre se copia, se pega y a veces se lee en voz alta. Un `1` que alguien teclea como `l` manda a dos personas a dos salas distintas, y las dos ven una mesa vacía preguntándose</sub>
- **UN SOLITARIO NO ADMITE COMPAÑÍA, Y SE DICE ANTES DE INTENTARLO.** <sub>línea 171</sub>
  <br><sub>El árbitro ya lo rechaza con su motivo, pero enterarte DESPUÉS de haber compartido un enlace es enterarte tarde: el otro ya ha abierto una mesa donde no cabe. Aquí el botón se apaga y se explica por qué.</sub>

### `public/arcade/entropy.html`

- **UNA PÁGINA DE JUEGO ES UNA LÍNEA DE CONFIGURACIÓN.** <sub>línea 6</sub>
  <br><sub>Y AQUÍ NO SE CARGA NINGÚN VENDOR. Esta página tenía los tres <script> de three/OrbitControls/tween heredados del cascarón viejo, y `montarMesa` los carga otra vez: dos copias de TWEEN, una recibiendo los movimientos y otra siendo la</sub>

### `public/arcade/ficha.html`

- **POR QUÉ ESTA PÁGINA EXISTE, Y POR QUÉ ES UNA SOLA PARA LAS CINCO PUERTAS** <sub>línea 65</sub>
  <br><sub>`fichas.json` reunía desde hacía días todo lo que se sabe de los 35 juegos —el objetivo, los verbos, los asientos, las puertas montadas, y desde hoy lo medido sobre si se puede jugar con la mano— y NO LO LEÍA NADIE. Cero páginas. Todo ese</sub>
- **Y LO QUE NO SE SABE SE DICE, EN GRIS Y CON SU PALABRA.** <sub>línea 77</sub>
  <br><sub>«sin medir» no es «no se puede», y «sin escribir» no es «no tiene reglas». Poner un valor por defecto en su lugar es lo que hizo que la ficha del ajedrez publicara que es un juego de una persona. Aquí un hueco se ve como hueco.</sub>
- **EN QUÉ PANTALLAS SE VE, Y NO ES UN ADORNO.** <sub>línea 143</sub>
  <br><sub>Dos juegos estaban impecables en escritorio y roluptos en el móvil —mancala con cuatro de seis hoyos fuera de cuadro, ajedrez con 26 de 64 casillas— y llevaban ahí quién sabe cuánto porque yo medía en pantalla ancha. Un</sub>
- **LA LEYENDA ES UN DICCIONARIO, NO UNA FRASE.** <sub>línea 172</sub>
- **Y OJO CON LOS ACENTOS GRAVES AQUÍ DENTRO: este comentario vive DENTRO** <sub>línea 174</sub>
  <br><sub>de una plantilla de texto, así que un acento grave la cierra y rompe el fichero entero. Pasó al escribir este mismo comentario.</sub>
- **LAS DIFERENCIAS, EN ROJO Y SIN PLEGAR.** <sub>línea 209</sub>
  <br><sub>Es el apartado que más importa de un banco de pruebas y el que más tentador sería esconder: en qué se aparta NUESTRA versión del juego de la calle. Quien compare a una persona con un agente tiene que saber a qué están jugando, y</sub>

### `public/arcade/generala.html`

- **ESTA PÁGINA ES EL EXTREMO CONTRARIO DE `parchis.html`.** <sub>línea 10</sub>
  <br><sub>El parchís demostró que un dado cabe en el contrato usando las TRES estructuras del sustrato a la vez: rejilla, piezas y zonas. La generala prueba lo otro — que también cabe un juego SIN NINGÚN TABLERO: `rejilla: null`, `piezas: []`, y todo el</sub>
- **POR QUÉ DECLARA VISUALIZADOR, SI NINGUNA OTRA PÁGINA NUEVA LO HACE.** <sub>línea 19</sub>
  <br><sub>`montarMesa` elige la mesa por lo que el juego PUBLICA: «zonas y ninguna rejilla» es de cartas. Y esta forma es exactamente ésa, así que le tocaría la mesa de casino. Pero `mesa_cartas.mjs` no mira el sustrato NATIVO: mira</sub>

### `public/arcade/index.html`

- **LAS FICHAS, ARRIBA Y NO EN UN PIE.** <sub>línea 29</sub>
  <br><sub>`fichas.json` reunía desde hace días todo lo que se sabe de los 35 —el objetivo, el vocabulario, las cinco puertas, y lo MEDIDO sobre si se puede jugar con la mano— y no lo leía ninguna página. Y `proyecciones.html`, que</sub>

### `public/arcade/jugar.html`

- **POR QUÉ ESTO ERA EL PASO MÁS BARATO QUE MÁS DESBLOQUEA.** <sub>línea 94</sub>
  <br><sub>Hasta hoy sólo seis juegos tenían tablero 3D, y cada uno con su visualizador a medida —catorce en total, cada uno con su bug—. Aquí no hay ninguno: hay un pintor que lee el sustrato. Así que los veinte tienen 3D, y el género número</sub>
- **Las tres proyecciones reciben LO MISMO.** <sub>línea 181</sub>
  <br><sub>pintar2d(ctx, sus, { ancho: c2d.width, alto: c2d.height }); $('texto').textContent = reglas.describir ? reglas.describir(p) : describirEstado(juego, st); if ($('ver3d').checked) {</sub>
- **Si no elige, se para y se dice.** <sub>línea 236</sub>
  <br><sub>banco eso se cuenta como jugada forzada y se publica el porcentaje. if (!jugada) { $('dato').textContent = `«${ctrl.etiqueta}» no eligió ninguna legal.`; break; } hub.move(juego, { move: jugada });</sub>

### `public/arcade/mesa.html`

- **Y LA DECISIÓN QUE MÁS ME GUSTA DE ESTA PÁGINA** <sub>línea 25</sub>
  <br><sub>Los botones de esta mesa son `legal_moves`: exactamente la misma lista que `/api/gym` le ofrece a un agente de lenguaje. No hay una interfaz para personas y otra para máquinas — **hay una puerta, dibujada**.</sub>
- **Lo que NO cambia entre los dos modos, que es lo que importa:** <sub>línea 124</sub>
  <br><sub>los botones siguen siendo `legal_moves`, y lo que sale al final sigue siendo el mismo recibo `{juego, semilla, jugadas}` que verifica `/api/verificar`. Jugar acompañado no produce una partida de otra clase.</sub>
- **ANTES ESTO ERA «TÚ CONTRA LA CASA», Y SE NOTABA EN EL CÓDIGO.** <sub>línea 177</sub>
  <br><sub>La versión anterior tenía un `esMio(st)` que decía «el asiento 0 eres tú» y un bucle que llamaba a `ai_move` para todos los demás. O sea que sólo existían dos papeles: el humano y la máquina. No había forma de poner un modelo de</sub>
- **`{ move: m }`, no `{ jugada: m }`.** <sub>línea 205</sub>
  <br><sub>vez de leer el contrato: `ProtoHub.move()` acepta `params.uci`, `params.action`, `uci` o `move`, y con cualquier otra cosa devuelve «falta la jugada» y NO SE QUEJA. Doscientos clics y cero jugadas</sub>
- **CON PAUSA, Y NO POR ESTÉTICA.** <sub>línea 305</sub>
  <br><sub>partida entera entre dos fotogramas y nadie ve nada: la pantalla salta del reparto al marcador final. Una mesa donde no se puede MIRAR jugar no sirve para entender por qué un agente pierde, que es medio propósito de esto.</sub>
- **Y SI EL CONTROLADOR NO SABE, SE PARA.** <sub>línea 310</sub>
  <br><sub>devuelve `null`; entonces la mesa se detiene y lo dice, en vez de jugar por él. Regalarle una jugada a un modelo que no supo darla convierte el banco de pruebas en un adorno.</sub>
- **SONDEO Y NO WEBSOCKETS, A PROPÓSITO.** <sub>línea 366</sub>
  <br><sub>jugada y jugada pasan segundos, no milisegundos. Un sondeo cada segundo y medio se siente igual y no arrastra reconexiones, latidos ni estados a medias. El día que haya algo en tiempo real esto se cambia; hoy sería complejidad</sub>

### `public/arcade/oca.html`

- **ESTA PÁGINA ENSEÑA LA REJILLA CON VOCABULARIO.** <sub>línea 12</sub>
  <br><sub>El parchís sólo tenía que distinguir pista de seguro y le bastó con el `0` y el `2` del contrato del terreno. La oca tiene ocho tipos de casilla y cada uno hace algo distinto, así que usa el tramo `>2` —«se dibuja como CUENTA»— y el</sub>

### `public/arcade/parchis.html`

- **ESTA PÁGINA ES LA RESPUESTA A UNA PREGUNTA DE ARQUITECTURA.** <sub>línea 9</sub>
  <br><sub>La pregunta era si el sistema admite motores nuevos —uno de dados, como el de cartas y el de tableros—. La respuesta es que no hacía falta: un dado no es una cuarta estructura. La tirada RESTRINGE las jugadas legales, que el contrato ya</sub>

### `public/arcade/poker.html`

- **ESTA PÁGINA ERA DEL FORMATO VIEJO, Y LE FALTABA TODO LO QUE SE ARREGLÓ FUERA.** <sub>línea 6</sub>
  <br><sub>Traía sus tres <script> de vendor a mano, su propio arranque y su lista de ficheros. Eso significa que se quedó fuera de tres arreglos que ya existían:</sub>

### `public/arcade/proyecciones.html`

- **POR QUÉ ESTA PÁGINA EXISTE** <sub>línea 66</sub>
  <br><sub>La tesis del motor —«el 3D es sólo un ledger visual: pintamos lo que en realidad es una matriz plana»— era hasta hoy una intención. Medido el 2026-08-07, había CINCO codificaciones distintas del mismo estado (FEN, matriz,</sub>
- **SE ACEPTA `?juego=`, PORQUE SI NO EL ENLACE DE LA FICHA MIENTE UN POCO.** <sub>línea 110</sub>
  <br><sub>La ficha de cada juego ofrece «verlo por las otras puertas» y traía aquí, donde siempre salía ajedrez: quien venía desde la ficha del go veía un tablero de ajedrez y tenía que buscarse su juego en el desplegable. El enlace prometía una cosa y</sub>
- **Las tres llamadas reciben LO MISMO y ninguna sabe a qué se juega.** <sub>línea 135</sub>
  <br><sub>pintar2d(ctx, sus, { ancho: c2d.width, alto: c2d.height }); pintor3d.pintar(sus); $('texto').textContent = describirEstado(juego, st);</sub>
- **Se enseña el número de LLAMADAS DE DIBUJO a propósito.** <sub>línea 146</sub>
  <br><sub>versión creaba una malla por celda y por pieza: fagocito son 28×28 celdas y 561 piezas, o sea 1.345 llamadas, y el navegador dejaba de poder ni capturar la pantalla. Con instanciado son menos de diez. Tenerlo a la</sub>

### `public/arcade/remigio.html`

- **Y ES LA PRUEBA DE QUE AÑADIR UN JUEGO CUESTA UN FICHERO.** <sub>línea 13</sub>
  <br><sub>Esta página no sabe a qué se juega. No dibuja nada, no declara motor, no enumera cartas: `mesa_cartas.mjs` lee el SUSTRATO —qué montones hay, qué se ve en cada uno y cuántas están tapadas— y lo pinta. El remigio se escribió como</sub>

### `public/arcade/replays.html`

- **QUÉ HABÍA AQUÍ ANTES, Y POR QUÉ NO SE CONSERVA.** <sub>línea 11</sub>
  <br><sub>Una pantalla llamada «Global Replay VMS» que pedía `/arcade/datasets` —un endpoint que devuelve 404— y reproducía FOTOGRAMAS de un log de entrenamiento dentro de un iframe, con un contador que ponía «FRAME». O sea: una página muerta</sub>
- **Y LA DIFERENCIA NO ES DE ESTILO: ES LA TESIS.** <sub>línea 20</sub>
  <br><sub>Un vídeo se puede montar. Aquí no hay fotogramas guardados: cada fila del corpus es `{juego, semilla, jugadas}` y abrirla VUELVE A JUGAR la partida con las mismas reglas que corren en la mesa. Si una fila fuera falsa, se rompería al mirarla — y</sub>
- **NO TRAE NINGUNA LISTA DE JUEGOS.** <sub>línea 30</sub>
  <br><sub>Los nombres salen de las propias filas y las páginas de `enlace_repetidor.js`, que `npm test` mide contra `data/paginas.json`. Este proyecto ya ha tenido cinco listas escritas a mano separándose de la realidad sin avisar.</sub>
- **SE LEE EL JSONL, NO EL RESUMEN.** <sub>línea 128</sub>
  <br><sub>`GET /api/dataset` a secas da los totales por juego, que es bonito y no sirve para esto: hacen falta las JUGADAS de cada partida para poder construir el enlace que la vuelve a jugar. El corpus entero se descarga sin paginar porque</sub>
- **LA FECHA VIENE EN MILISEGUNDOS, Y SE VEÍA ASÍ: `1786025260670`.** <sub>línea 174</sub>
  <br><sub>El corpus la guarda con `Date.now()`, o sea un número. Yo la trataba como texto ISO —`.replace('T',' ')`— y el reemplazo no hacía nada, así que la fila enseñaba el número tal cual. No rompía nada: sólo era ilegible, que es como se quedan las</sub>

### `public/arcade/sala.html`

- **QUÉ PRUEBA ESTO, QUE ES MÁS QUE UNA PÁGINA BONITA.** <sub>línea 12</sub>
  <br><sub>Sentarse a una mesa de la Sala del Huevo y entrar por `/arcade/entrar` tienen que ser LO MISMO. Hoy no lo son: la Sala del Huevo te «abduce» a un iframe a pantalla completa, porque el motor de cartas creaba siempre su propia escena,</sub>
- **Y RESUELVE LA OTRA MITAD: LA ESCALA.** <sub>línea 24</sub>
  <br><sub>Las cartas del arcade miden 1,2 × 1,8. Las de la Sala del Huevo, 0,088 × 0,123 — catorce veces menos, porque allí todo está en metros de verdad y la cámara mira desde 1,62, la altura de los ojos de alguien de pie.</sub>
- **AQUÍ HABÍA OTRO `: 'entropy'`, Y ES EL MISMO DE ESTA MAÑANA.** <sub>línea 54</sub>
  <br><sub>Un juego que no estuviera en la lista caía en entropy sin decir nada. Así que `?juego=chess` abría esta sala, la montaba entera y repartía ENTROPY — y no es un caso rebuscado: la clave del ajedrez es `ajedrez`, y `chess` es justo lo que</sub>
- **LOS MISMOS COLORES QUE LA SALA DEL HUEVO, MEDIDOS DE ELLA.** <sub>línea 116</sub>
  <br><sub>Esta mesa decía estar copiada de allí «mismos números a propósito», y los números lo estaban: Ø3,0 × 0,11 a 0,92 de alto, pie Ø0,68, tres taburetes Ø0,6. Todo cuadra. Lo que no se copió fueron los colores — tapa `#d8d4e0` contra</sub>
- **LA MESA YA NO SE COPIA: SE PIDE.** <sub>línea 147</sub>
  <br><sub>Aquí estaban la tapa, el pie y los tres taburetes escritos a mano, con el comentario «copiada de la Sala del Huevo, mismos números a propósito». Los números lo estaban. Lo demás no, y se midió recorriendo las DOS escenas en vivo y</sub>
- **NI 1,34 NI 2,68: LO QUE MIDE LO REPARTIDO.** <sub>línea 177</sub>
  <br><sub>La Sala del Huevo pone 1,34 y esta sala ponía 2,68 — el doble— así que al sentarte el tapete cambiaba de tamaño. Ninguno de los dos estaba bien: medido, la brisca reparte 1,47 de ancho y UNIT 1,79, o sea que se salían del pequeño y</sub>
- **0,98 Y NO 1,00, Y ESOS DOS CENTÍMETROS NO SON UNA DISCREPANCIA.** <sub>línea 192</sub>
  <br><sub>Al ver que la Sala del Huevo lo pone a 1,00 lo subí «para igualar», y la mesa salió vacía: las cartas se posan a 0,99 y el tapete, que tiene medio centímetro de grosor, pasó a taparlas. Cuarenta cartas puestas y medidas, debajo del</sub>
- **Y EL LIENZO, QUE FALTABA.** <sub>línea 225</sub>
  <br><sub>Un invitado que quiera escuchar gestos —deslizar para moverse, tocar una casilla— necesita el `<canvas>` sobre el que ocurren, y de invitado no tiene renderizador propio del que sacarlo: lo tiene la sala. `mesa_tablero.mjs` hacía</sub>
- **Y TAMBIÉN CON EL NOMBRE QUE USE SU VISUALIZADOR, SI ES OTRO.** <sub>línea 243</sub>
  <br><sub>`chess_visualizer.js` construye su motor con `gameId: 'chess'` y le pregunta al hub por ese nombre; las reglas se llaman `ajedrez`. En su página propia eso lo resuelve el parámetro `idJuego` de montarMesa, que registra las reglas bajo el id que el</sub>
- **Y AQUÍ NO SE ESCRIBE LA LLAMADA DE EJEMPLO ENTERA, aunque se leería mejor.** <sub>línea 252</sub>
  <br><sub>`gen_paginas.mjs` averigua en qué página se juega cada juego con una expresión regular sobre estos ficheros, y una llamada dentro de un comentario le parece exactamente igual que una de verdad: la primera versión de este párrafo la traía,</sub>
- **LA ESCALA LA MANDA LA CARTA, NO LA MESA.** <sub>línea 274</sub>
  <br><sub>El primer intento encogía el grupo hasta LLENAR la mesa, que es lo que la Sala del Huevo hace con los tableros — y ahí está bien, porque un tablero de ajedrez ocupa toda la mesa de verdad. Con cartas da un resultado absurdo:</sub>
- **Y EL TABLERO TAMBIÉN SE MIDE EN CENTÍMETROS, POR EL MISMO MOTIVO.** <sub>línea 312</sub>
  <br><sub>Debajo estaba escrito «un tablero llena la mesa» y se llenaba: medido, el ajedrez salía de 2,55 m con piezas de 48 cm, sobre una mesa de 1,5 de radio a la que estás SENTADO. No se ve un ajedrez: se ve el interior de un ajedrez.</sub>
- **Y AUN ASÍ SE QUEDÓ CORTO, PORQUE ESTA MESA NO ES UNA MESA DE VERDAD.** <sub>línea 328</sub>
  <br><sub>Mide tres metros. Viene de una sala donde es decoración, y ese motivo ya estaba escrito dos veces en este fichero sin que nadie sacara la consecuencia: sobre una tapa de tres metros, un tablero de torneo de 55 cm se ve como un juguete olvidado</sub>
- **`Box3.setFromObject` MIENTE CON LAS MALLAS INSTANCIADAS, Y AQUÍ TODAS LO SON.** <sub>línea 350</sub>
  <br><sub>`crearPintor3d` dibuja el tablero con cuatro `InstancedMesh` —una por tipo de pieza, con una matriz por casilla—, que es lo correcto: así un tablero de 19×19 cuesta cuatro objetos y no trescientos sesenta.</sub>
- **Y UNA VEZ SE SABE QUÉ HAY, HAY QUE PODER VERLO.** <sub>línea 393</sub>
  <br><sub>Con el tamaño arreglado, el ajedrez ocupaba el 12,6 % del ancho de la pantalla: medida correcta, partida injugable. Es lo que pasa al sentarse a una mesa de TRES METROS —copiada así a propósito de la Sala del Huevo— con un tablero de</sub>
- **UNA MESA SE MIRA DESDE LA MISMA DISTANCIA, JUEGUES A LO QUE JUEGUES.** <sub>línea 410</sub>
  <br><sub>Esto encuadraba el JUEGO al 55 % del ancho de pantalla, y como los juegos no miden lo mismo, cada uno acababa a una distancia distinta. Medido: la brisca reparte 1,30 m y deja la cámara a 1,99 de alto —ves tu mesa, los taburetes, la</sub>
- **AQUÍ PONÍA `Math.min(lejos, quiero)`, Y ESO SÓLO SABÍA ACERCARSE.** <sub>línea 452</sub>
  <br><sub>Lo copié del encuadre de `mesa_cartas`, donde tiene sentido: allí la cámara arranca lejos y sólo hay que avanzar. Aquí el encuadre se REHACE al cambiar la pantalla, y entonces la cámara ya está cerca — así que al girar el</sub>
- **Y DESDE ARRIBA, NO DESDE EL BORDE DE LA MESA.** <sub>línea 468</sub>
  <br><sub>La primera versión conservaba el eje original y sólo cambiaba la distancia. Con la brisca —que reparte 1,48 de ancho— eso dejaba la cámara a 1,51 m: a quince centímetros del tapete. Unas cartas planas vistas de canto no se ven,</sub>
- **CADA TIPO DE JUEGO SE ESCALA CON UN CRITERIO DISTINTO, Y NO ES CAPRICHO.** <sub>línea 496</sub>
  <br><sub>UN TABLERO MIDE LO QUE MIDE UN TABLERO — 55 cm, como uno de torneo. Antes llenaba la mesa, que es lo que hace la Sala del Huevo, y allí está bien porque allí la mesa se mira de pie y de lejos. Sentado a ella sale un</sub>
- **SI NO HAY NADA QUE MEDIR, NO SE ESCALA.** <sub>línea 517</sub>
  <br><sub>Un `Math.max(t.x, t.z, 0.001)` evita dividir por cero, pero produce algo peor que un error: escala 2550. Pasó con cripta cuando su sustrato llegaba vacío —la mesa salía sin nada encima y con las jugadas legales</sub>
- **QUÉ SE PINTA LO DICE EL SUSTRATO, IGUAL QUE EN `montarMesa`.** <sub>línea 549</sub>
  <br><sub>Un juego que publica ZONAS y ninguna REJILLA es de cartas y lo dibuja la mesa de casino. Todo lo demás —tableros, laberintos, flotas, rebaños— tiene rejilla y piezas, y lo dibuja `crearPintor3d`, que ya existía y ya recibía la escena</sub>
- **Y SI EL JUEGO TIENE VISUALIZADOR PROPIO, SE USA EL SUYO.** <sub>línea 560</sub>
  <br><sub>Aquí se montaba siempre la mesa genérica, así que el ajedrez de esta sala salía con discos y hexágonos mientras `chess_visualizer.js` estaba en la misma carpeta sin usar. La lista no se copia: es la de `visualizadores.js`, la misma que lee</sub>
- **EL PINTOR UNIVERSAL, Y LOS BOTONES QUE YA COMPARTE LA MESA DE CARTAS.** <sub>línea 600</sub>
  <br><sub>`crearPintor3d` dibuja la matriz y las piezas, pero no sabe nada de turnos ni de jugadas: eso lo pone `pintarJugadas`, el mismo módulo que usa la mesa de cartas. Copiar aquí esos botones habría sido copiar su regla de oro —«no</sub>
- **ESTO ERAN TREINTA LÍNEAS AQUÍ SUELTAS, Y AHORA SON UNA PIEZA.** <sub>línea 609</sub>
  <br><sub>Montaban el pintor universal, el HUD y los botones. Funcionaba — y era la única forma de ver en 3D once juegos, porque nada más usaba `crearPintor3d`. En cuanto `montarMesa` necesitó lo mismo para darles página propia, había que</sub>
- **Y ANTES, EL ANDAMIO.** <sub>línea 621</sub>
  <br><sub>`mesa_tablero.mjs` da por hecho que existen `window.ALISA_GESTOS`, `ALISA_ENCUADRE` y compañía, que son scripts clásicos y globales. Esta sala cargaba sólo los tres de vendor, así que ajedrez, go, reversi, damas, xiangqi</sub>
- **Y SE VUELVE A ENCUADRAR, QUE ES LA MITAD QUE FALTABA.** <sub>línea 655</sub>
  <br><sub>Esto sólo cambiaba la proporción de la cámara. El encuadre se había calculado UNA vez, al cargar, con la pantalla que hubiera entonces — así que en un móvil en vertical la partida se salía por los lados y nadie se</sub>

## Cómo se dibuja (el pintor)

### `public/arcade/js/protohub/render/paleta.js`

- **POR QUÉ NOMBRES Y NO HEXADECIMALES.** <sub>línea 11</sub>
  <br><sub>Salió del go: sus piedras salían azul y roja porque llevaban el color genérico de dueño. Consistente con las damas, pero en el go los colores SON el nombre de los bandos — «juega negras» no describe el aspecto, es la regla.</sub>
- **Y POR QUÉ ESTO ES UN FICHERO Y NO UNA CONSTANTE EN `pintar3d.js`.** <sub>línea 28</sub>
  <br><sub>Porque hay DOS pintores. `pintar2d.js` dibuja el minimapa que va dentro del panel, y tenía su propia tabla de colores por dueño: el go habría salido con piedras negras en la mesa y azules en el minimapa, a la vez y en la misma</sub>
- **EL BLANCO NO ES BLANCO Y EL NEGRO NO ES NEGRO.** <sub>línea 37</sub>
  <br><sub>`0xffffff` con la luz cenital de la mesa es una mancha sin forma: se pierde el borde de la ficha y se confunde con el suelo claro. Un hueso muy claro se LEE como blanco y conserva el relieve. Igual por abajo: el negro puro se traga las</sub>
- **UN NOMBRE QUE NO EXISTE SE DICE EN VOZ ALTA.** <sub>línea 59</sub>
  <br><sub>Caer al color genérico en silencio sería justo el tipo de fallo que más caro sale aquí: `COLORES: {0:'negor'}` dibujaría un go azul, todo verde, y sin nada que explicara por qué. Se avisa UNA vez por nombre — esto se llama en cada</sub>

### `public/arcade/js/protohub/render/pintar2d.js`

- **ES UNA FUNCIÓN PURA DEL SUSTRATO, Y ESO ES EL PUNTO ENTERO.** <sub>línea 6</sub>
  <br><sub>No sabe a qué se juega. No pregunta por el turno, ni por las reglas, ni por el marcador. Recibe `{ rejilla, piezas, zonas }` y dibuja. Mismo sustrato, mismo cuadro — siempre.</sub>
- **Y POR QUÉ 2D ANTES QUE 3D, TENIENDO 25 FACTORÍAS** <sub>línea 17</sub>
  <br><sub>Porque esto funciona sin WebGL, sin luces, sin assets y sin ajustar una cámara por pieza. Un género nuevo sale jugable el día que tiene reglas. El 3D es la misma matriz con altura —`pintar3d.js`— y llega después, no en vez de.</sub>
- **EL DISCO LLEVABA LA INICIAL EN INGLÉS, Y ESA ES UNA PUERTA DE MENOS.** <sub>línea 35</sub>
  <br><sub>Un peón salía con una `P` y una dama con una `Q`: las iniciales de `pawn` y `queen`. Para un agente de visión eso no es la pieza, es su nombre en un idioma — tiene que saber inglés y ajedrez para leer un tablero. El símbolo lo entiende cualquiera que</sub>
- **Y XIANGQI NO ES AJEDREZ CON OTRO NOMBRE.** <sub>línea 45</sub>
  <br><sub>Comparte `r n b k p` con el ajedrez —carro, caballo, elefante, general, soldado— y tiene dos que no existen allí: el consejero (`a`) y el cañón (`c`), que no tienen glifo de ajedrez. Mezclar `♜` con `砲` sería peor que las iniciales, así que el</sub>
- **EL CONTRATO DEL TERRENO: 0 vacío · 1 muro · 2 destino ·** <sub>línea 104</sub>
  <br><sub>más de 2, una CUENTA (las semillas de un hoyo de mancala).</sub>
- **`sinVista` NO ES NIEBLA: el terreno SE PINTA, y encima va un velo.** <sub>línea 135</sub>
  <br><sub>Son dos ignorancias distintas y por eso son dos campos. `niebla` es «no sé qué hay aquí» —se tapa entero—; `sinVista` es «conozco el sitio pero ahora mismo no lo veo», que es lo que pasa en la nave: sabes dónde está el</sub>
- **EL COLOR QUE DECLARA EL JUEGO MANDA TAMBIÉN AQUÍ.** <sub>línea 170</sub>
  <br><sub>Esto tenía su propia tabla por dueño y `pintar3d.js` la suya. En cuanto el go declaró `{0:'negro', 1:'blanco'}`, la mesa le hacía caso y este minimapa no: piedras negras en el tablero y azules en el panel, a la vez y en la misma</sub>
- **Lo oculto SE PINTA.** <sub>línea 243</sub>
  <br><sub>diría que el rival no tiene nada — y eso es una mentira, no una omisión. El sustrato las cuenta justo para poder dibujarlas. for (let k = 0; k < (z.ocultas ?? 0) && x < W - 40; k++) {</sub>

### `public/arcade/js/protohub/render/pintar3d.js`

- **ES LA HERMANA DE `pintar2d.js`, NO SU SUSTITUTA.** <sub>línea 7</sub>
  <br><sub>Las dos reciben `{ rejilla, piezas, zonas }` y no preguntan nada más. Ninguna sabe a qué se juega. Esa es la tesis del motor dicha en código: **el 3D es sólo un ledger visual; el estado de verdad es una matriz plana.**</sub>
- **SE DIBUJA INSTANCIADO, Y NO ES UNA OPTIMIZACIÓN PREMATURA.** <sub>línea 16</sub>
  <br><sub>La primera versión creaba una malla por celda y otra por pieza. Con ajedrez (64 + 32) iba de sobra; con **fagocito, que son 28×28 celdas y 561 piezas**, son 1.345 llamadas de dibujo y el compositor del navegador dejaba de responder</sub>
- **AQUÍ ES DONDE ENTRAN LAS FACTORÍAS Y LOS PLUGINS, Y NO ANTES.** <sub>línea 27</sub>
  <br><sub>`CroupierSystem` ya sabe **dónde va cada carta** en una mesa —en abanico, en arco, tapadas, comunitarias— y es agnóstico al juego. Se le pasa por `opciones` y coloca las zonas. No decide nada del juego: dice dónde poner las</sub>
- **CADA BANDO CON SU FORMA, NO SÓLO CON SU COLOR** <sub>línea 141</sub>
  <br><sub>Es requisito de accesibilidad en la guía de interfaz de Board Game Arena, no un extra: «empareja color con iconos, texturas o formas», y un símbolo o contorno único por cada color de peón. Con azul contra rojo, una de cada doce</sub>
- **SÓLO EN LOS DISCOS, Y A PROPÓSITO.** <sub>línea 157</sub>
  <br><sub>Los cubos son muros y las bolitas comida: terreno y cosas de nadie, que no tienen bando que distinguir. Darles forma por dueño sería contar algo que no existe.</sub>
- **EL DAMERO SE VE.** <sub>línea 179</sub>
  <br><sub>Este pintor lleva desde siempre alternando dos suelos —`(f + c) % 2`, más abajo— pero eran `0xf2f4f7` y `0xd8dfe6`: dos blancos separados por un 7% de luminosidad. Con la luz cenital de esta mesa el damero desaparecía y el</sub>
- **EL MURO ERA CASI EL MISMO AZUL QUE EL DUEÑO 0, Y ESE FUE EL FALLO.** <sub>línea 197</sub>
  <br><sub>`0x39485c` contra `0x2a3550` son 19 puntos de distancia sobre 255. Por eso el jugador de fagocito —un cubo del dueño 0 en un laberinto de muros— estaba perfectamente dibujado y no se veía. Le puse un faro encima, que</sub>
- **EL DESTINO ERA EXACTAMENTE EL MISMO ROJO QUE EL DUEÑO 1.** <sub>línea 214</sub>
  <br><sub>`0xc0392b` en los dos sitios. O sea que en sokoban una ficha del dueño 1 encima de su casilla objetivo desaparecía — justo en el momento en que más importa verla, que es cuando has resuelto ese hueco.</sub>
- **LA NIEBLA ERA LO MÁS BRILLANTE DE LA PANTALLA, Y ESO ESTÁ AL REVÉS.** <sub>línea 229</sub>
  <br><sub>En cripta lo sin explorar es casi todo el tablero, y con `0xaeb8c4` salía un campo blanco enorme que se comía la vista mientras lo YA EXPLORADO —que es lo único que has ganado jugando— quedaba de manchita en una</sub>
- **Y AL OSCURECERLA ANOCHE LA DEJÉ CHOCANDO CON EL DUEÑO 0.** <sub>línea 245</sub>
  <br><sub>`0x333c49` contra `0x2a3550` son NUEVE puntos. O sea que una pieza oscura sobre casilla con niebla —en cripta o en flota, que es media partida— quedaba invisible. Arreglé un problema de lectura y creé otro.</sub>
- **La madera es MÁS OSCURA de lo que parece que debería. `0xd8b273` es el** <sub>línea 266</sub>
  <br><sub>color de un goban en una foto, y aquí salía amarillo fosforito: esta mesa lleva luz cenital fuerte y un tono claro se va de rango. Es el mismo error que el damero de dos blancos —elegir el color mirando la muestra en vez</sub>
- **SE GUARDA POR TAMAÑO Y NO SE REHACE.** <sub>línea 351</sub>
  <br><sub>Un goban de 19x19 son treinta y ocho barras más la madera. Construirlo en cada repintado sería el mismo error que crear `InstancedMesh` a sesenta por segundo — el que ya está documentado dos veces en este fichero— sólo que</sub>
- **LOS HOSHI. NO SON ADORNO: SON CÓMO SE LEE UN GOBAN.** <sub>línea 390</sub>
  <br><sub>Un tablero de go de verdad lleva nueve puntos marcados —las «estrellas»— y no están por decoración: son el sistema de coordenadas con el que se habla del juego. «El 4-4 de arriba a la</sub>
- **EL TAMAÑO ESTÁ MEDIDO CONTRA EL TABLERO DE VERDAD, NO ELEGIDO.** <sub>línea 414</sub>
  <br><sub>Diámetro 0,15 sobre una casilla de 1 — el 15 %. En un goban real el punto son unos 4 mm sobre casillas de 22, o sea el 18 %. Y lo que decide si se lee es la comparación con la línea, no el número</sub>
- **LO QUE LE FALTA A ESTA MESA PARA ADMITIR EL GO Y EL XIANGQI.** <sub>línea 466</sub>
  <br><sub>El 13-08-2026 porté los dos aquí y los DEVOLVÍ al verlos. El go salió como un damero de 19×19 —parecía un tablero de damas gigante— y el xiangqi igual con menos escándalo. Los dos se juegan sobre LÍNEAS, con las piezas en las</sub>
- **DÓNDE CAE CADA CASILLA, PUBLICADO.** <sub>línea 501</sub>
  <br><sub>Las piezas se pueden comprobar desde fuera porque LLEVAN NOMBRE en la malla (`p:<tipo>:<dueño>`): un instrumento las proyecta y sabe a qué está apuntando. Las casillas no tenían nada equivalente, y sin eso la única</sub>
- **Y NO SE HACE CON UNA MALLA POR CASILLA, AUNQUE ASÍ LO HAGA EL AJEDREZ.** <sub>línea 516</sub>
  <br><sub>Aquí el terreno se dibuja con `InstancedMesh` justamente para que fagocito —28x28, 784 celdas— no cueste 784 objetos. Estandarizar «como el ajedrez» sería tirar esa optimización para poder medir, que es dejar que</sub>
- **Y LAS CASILLAS TAMBIÉN TOMAN EL AMBIENTE** <sub>línea 531</sub>
  <br><sub>`atmosfera.js` puso cielo, suelo y niebla alrededor, y al mirar las tres capturas del piloto la conclusión fue la misma en las tres: **el aire funciona y el tablero no**. La pradera salía con hierba de verdad y encima</sub>
- **EL NOMBRE DE LA CASILLA, ESCRITO EN LA CASILLA** <sub>línea 559</sub>
  <br><sub>`rejilla.nombres` lleva tiempo publicándose y no lo dibujaba nadie: sólo lo leía el respaldo del tacto. En un tablero de casillas ANÓNIMAS —el ajedrez, el go— no hace falta, pero en el alisápolis el nombre ES el</sub>
- **SE DIBUJA SÓLO SI LA REJILLA LO PIDE (`etiquetas: true`).** <sub>línea 567</sub>
  <br><sub>Flota también publica nombres —`a1`…`j10`— y ponerle cien etiquetas encima sería llenarle el tablero de ruido para arreglarle el problema a otro juego. Lo dice el sustrato, no adivina el pintor.</sub>
- **AQUÍ FALTABAN DOS FAMILIAS, Y UNA LLEVABA TIEMPO FALTANDO.** <sub>línea 600</sub>
  <br><sub>Esto agrupaba en tres montones: suelo claro, suelo oscuro y muro. Todo lo que no era muro caía en «suelo» — así que **los destinos de sokoban no se dibujaban en 3D**. El mismo estado contado por tres</sub>
- **HAY TABLEROS QUE NO SON CASILLAS, Y ESTA MESA NO LO SABÍA** <sub>línea 614</sub>
  <br><sub>El 13-08-2026 porté el go aquí y lo devolví al verlo: salió un damero de 19x19 y parecía un tablero de damas gigante. El xiangqi igual con menos escándalo. Los dos se juegan sobre LÍNEAS, con las</sub>
- **Y LAS PIEZAS NO SE MUEVEN NI UN MILÍMETRO.** <sub>línea 628</sub>
  <br><sub>Da un poco de vértigo, porque «va en la intersección» suena a que hay que desplazarlas media casilla. No: con casillas, la pieza va en el CENTRO de la celda (c, f); con intersecciones, va en el CRUCE</sub>
- **CON CRUCES SE QUITA EL DAMERO, NO EL TERRENO.** <sub>línea 642</sub>
  <br><sub>La primera versión se saltaba este bucle entero cuando el tablero era de intersecciones. Funciona —el go y el xiangqi no tienen muros ni niebla ni destinos— y es una mina puesta a mano: el primer juego de</sub>
- **EL 1 NO SIEMPRE ES UN MURO, Y LA LEYENDA LLEVABA DICIÉNDOLO DESDE** <sub>línea 654</sub>
  <br><sub>EL PRINCIPIO.</sub>
- **¿CUÁL SOY YO?** <sub>línea 744</sub>
  <br><sub>En fagocito no se veía al jugador. No «se veía mal»: se abría la partida y no estabas. Y no estaba oculto — estaba CAMUFLADO, que es peor porque no se nota que falta algo: `ALTO.jugador` es 0,8, o</sub>
- **LA REGLA SALE DEL DATO, NO DE UNA LISTA DE JUEGOS.** <sub>línea 761</sub>
  <br><sub>Poner «fagocito, snake, peaton, cripta, sigilo…» sería otra lista paralela que se separa el día que alguien añada un juego — el fallo que este proyecto lleva arreglado seis veces. Lo que hace</sub>
- **EL FARO SE MIDE EN PANTALLA, NO EN CASILLAS.** <sub>línea 778</sub>
  <br><sub>A tamaño fijo salía y se veía… en sokoban, que es 5x3. En el laberinto de 28x28 quedaba una mota amarilla de tres píxeles: técnicamente presente, prácticamente igual de invisible que</sub>
- **ESTO DIBUJABA «HAY ALGO», NO «QUÉ HAY».** <sub>línea 821</sub>
  <br><sub>El bucle de antes sólo usaba `z.items.length` y el índice: todas las vistas salían con el mismo material blanco. Nunca se leyó el CONTENIDO de `z.items`.</sub>
- **UN DADO SE DIBUJA COMO UN DADO, NO COMO UNA LÁMINA CON UN NÚMERO.** <sub>línea 843</sub>
  <br><sub>Aquí ya se arregló una vez lo importante —que un `d6_5` y un `d6_2` no salieran idénticos— pintando el valor sobre la carta plana. El DATO quedó bien y el objeto no: sobre una mesa, un dado tumbado del grosor de</sub>
- **LA CADENA DE DOMINÓ NO SE COLOCA COMO UNA MANO.** <sub>línea 861</sub>
  <br><sub>Todo lo demás que pasa por esta función se coloca en sitios que alguien decidió antes: una fila, un abanico, una rejilla. La cadena de dominó no tiene sitio previo — su forma sale de cómo se jugó, ficha a ficha, y hay</sub>
- **PERO CON LA FORMA DEL MATERIAL QUE SE ESTÁ JUGANDO.** <sub>línea 945</sub>
  <br><sub>ficha de dominó y una carta se distinguen igual: por su silueta. Dibujar la mano del rival y el pozo del dominó como naipes dejaba una mesa donde lo que se ve es de dominó y lo que se adivina es de cartas — y en un</sub>
- **UN POZO NO ES UNA FILA, ES UN MONTÓN.** <sub>línea 980</sub>
  <br><sub>Las catorce fichas del pozo del dominó salían tendidas en línea, ocupando más ancho que la cadena entera: la mesa decía «aquí hay catorce fichas expuestas» cuando lo que hay es un montón boca abajo. Y no es cosmético —</sub>
- **El paso lo manda quien llama, y no es un detalle: 0.7 es el ancho de una** <sub>línea 1006</sub>
  <br><sub>carta, y una ficha de dominó mide 0.86 de largo. Con el paso de carta las siete de tu mano se montaban unas sobre otras y se leían como UNA barra blanca — que es exactamente lo que se veía en la captura del 19-08.</sub>

### `public/arcade/js/protohub/render/volcar.js`

- **VOLCAR NO ES UNA JUGADA, Y ESA ES TODA LA GRACIA.** <sub>línea 7</sub>
  <br><sub>No entra en `legal_moves`, no se manda al hub, no viaja en el recibo y no cambia el estado ni un bit. Es la misma razón de siempre: los botones de jugar son la lista LITERAL que recibe un agente por la puerta de texto, y si una persona</sub>
- **MIENTRAS DURA, EL SONDEO NO PUEDE REPINTAR.** <sub>línea 21</sub>
  <br><sub>El estado se consulta cada segundo y repintar coloca cada pieza en su destino: a mitad del vuelo, la mesa se recompondría de golpe en el aire. Por eso `volcando()` es público y las mesas lo consultan antes de dibujar. La cuenta la lleva ESTE</sub>
- **SE GUARDA DÓNDE ESTABA CADA COSA ANTES DE TIRARLA.** <sub>línea 61</sub>
  <br><sub>El repintado devuelve a su sitio lo que el estado conoce —las cartas, las fichas— pero puede haber piezas de adorno que no salen de ningún estado y se quedarían tiradas por el suelo para siempre. Se restauran a mano al final.</sub>

## El servidor y las salas

### `functions/api/dataset.js`

- **MÁS `normas`, EN LOS JUEGOS QUE LAS TIENEN VARIABLES.** <sub>línea 30</sub>
  <br><sub>Damas es el primero (`damaVuela`, `peonComeAtras`) y rompe la frase de arriba: con una variable de por medio, `{juego, semilla, jugadas}` YA NO identifica una partida, porque la misma lista es legal con unas normas e ilegal con otras. Sin</sub>
- **SE GUARDA LA HUELLA DE LAS REGLAS.** <sub>línea 40</sub>
  <br><sub>filas viejas siguen siendo ciertas — pero de otro juego. Sin esa columna acabaríamos promediando dos juegos distintos creyendo que es uno.</sub>
- **POR QUÉ NO SE GUARDA LO QUE MANDE EL CLIENTE, TAL CUAL.** <sub>línea 66</sub>
  <br><sub>Es el mismo principio que con la puntuación: aquí no se cree nada de lo que llega. Si el cuerpo trae `normas: {loQueSea: true}`, eso no es una norma de damas y no puede acabar en la tabla — ni como dato ni influyendo en la verificación.</sub>
- **AQUÍ HABÍA DOS COMPROBACIONES QUE NO DECÍAN LO MISMO, Y GANABA LA MALA.** <sub>línea 92</sub>
  <br><sub>Estaba `if (!JUEGOS.includes(juego)) return null;` delante de `cargarReglas`. Parece una guarda inofensiva y dejaba fuera a los dos juegos con más betatesters:</sub>
- **LA CACHÉ VA POR JUEGO **Y NORMAS**, NO POR JUEGO.** <sub>línea 117</sub>
  <br><sub>Estaba indexada sólo por juego, y con la llegada de las normas variables eso pasa de inofensivo a veneno: la primera partida de damas que entrara dejaría sus reglas cacheadas, y la siguiente —jugada con `damaVuela`— se verificaría</sub>
- **Y LAS NORMAS, CUANDO LAS HAY: SON PARTIDAS DISTINTAS.** <sub>línea 145</sub>
  <br><sub>La firma es UNIQUE, o sea que decide qué cuenta como «esta partida ya estaba». Con normas variables, la misma lista de jugadas jugada con `damaVuela` y sin él son dos partidas diferentes —una puede ser legal y la otra no—, y sin esto la segunda en</sub>
- **Y SÓLO SE AÑADEN SI LAS HAY, PARA NO MOVER LAS FIRMAS QUE YA EXISTEN.** <sub>línea 153</sub>
  <br><sub>Las dos filas del corpus se firmaron con el formato viejo. Si esto cambiara el texto para todos, las mismas partidas volverían a entrar como nuevas y tendríamos duplicados que sólo se distinguen por cuándo se guardaron. Los 34 juegos sin normas</sub>
- **EL ORDEN IMPORTA: PRIMERO LAS NORMAS, LUEGO LAS REGLAS.** <sub>línea 200</sub>
  <br><sub>Hay que cargar las reglas CON las normas de esa partida, o se verificaría con otras. Por eso se piden dos veces: una para saber qué normas declara el juego —y poder sanear lo que llegó— y otra ya con ellas puestas. La segunda no cuesta</sub>
- **LAS NORMAS SALEN COMO OBJETO, Y SI FALTAN NO VA EL CAMPO.** <sub>línea 273</sub>
  <br><sub>Guardarlas y no devolverlas sería tenerlas para nada: quien se descargue el corpus tiene que poder re-simular cada fila, y sin las normas no puede — es el mismo agujero que tenía el enlace del repetidor esta mañana.</sub>

### `functions/api/gym.js`

- **SIN ESTADO, Y NO POR PEREZA** <sub>línea 19</sub>
  <br><sub>Un gym por HTTP pide a gritos sesiones: abres una, te dan un identificador, mandas acciones. Eso necesita almacenamiento, caduca, se puede perder a media partida y hay que limpiarlo.</sub>
- **UN AGENTE QUE JUEGA, EXISTE.** <sub>línea 178</sub>
  <br><sub>Hasta ahora un modelo podía jugar la misma partida que una persona y no estar en ninguna parte: la sala nunca supo de él. Si dice cómo se llama, ocupa sitio como cualquiera — y quien esté paseando por la sala lo verá</sub>
- **NO SE ESCRIBE EN CADA JUGADA, Y ESTO ERA UNA BOMBA.** <sub>línea 192</sub>
  <br><sub>El gym se llama una vez por movimiento: una partida de Go Fish son 73 llamadas. Escribiendo en todas, un solo agente se comía las 1.000 escrituras diarias del plan gratuito en</sub>

### `functions/api/presencia.js`

- **EL ÚNICO ESTADO COMPARTIDO DE TODO EL SITIO, Y DUELE** <sub>línea 16</sub>
  <br><sub>Lo demás no guarda nada: el gym re-simula, el verificador re-simula. Esa es la fuerza del proyecto — nada que corromper, nada que auditar, nada que puedas falsear diciéndome dónde ibas.</sub>
- **ESCRIBIR CUESTA; LEER, MUCHO MENOS.** <sub>línea 87</sub>
  <br><sub>El plan gratuito da 1.000 escrituras al día y 100.000 lecturas. Con un latido cada 20 s son 180 escrituras por hora y por visitante: tres personas un rato y la cuota se acaba — y cuando se acaba, la presencia</sub>

### `functions/api/verificar.js`

- **ESTADO: **el manejador está probado en Node** (`node prueba_funcion.mjs`,** <sub>línea 17</sub>
  <br><sub>con una `Request` sintética: sólo usa APIs web estándar). Lo que **no** está probado es el entorno de Cloudflare — en concreto que `fetch` de un activo del propio sitio traiga `card_library.json`. Si eso fallara, blackjack y</sub>
- **Aquí había ONCE `import` escritos a mano y un objeto `DIRECTOS`.** <sub>línea 34</sub>
  <br><sub>catálogo llegó a dieciséis juegos y esta lista se quedó en once: quien jugara una brisca y mandara su partida recibía «no sé jugar a brisca» — partida válida, registro equivocado. Ahora sale de la única lista que hay.</sub>
- **DOS FALLOS VIVOS AQUÍ, Y LOS DOS RECHAZABAN PARTIDAS LEGÍTIMAS.** <sub>línea 53</sub>
  <br><sub>Los encontró Fable revisando la arquitectura el 13-08-2026, y los dos son de la peor familia: el verificador diciendo «no» a alguien honrado.</sub>
- **`puntos` es SIEMPRE el recalculado, nunca el que venía en el envío.** <sub>línea 141</sub>
  <br><sub>Devolver aquí el del cliente convertiría todo esto en un adorno caro. return responder(200, { valida: r.valida,</sub>

### `worker-mesas/mesas.js`

- **POR TURNOS, ASÍ QUE SIN WEBSOCKETS** <sub>línea 18</sub>
  <br><sub>La tentación era montar WebSockets. Pero brisca, ajedrez o go son por turnos: entre jugada y jugada pasan segundos, no milisegundos. Un sondeo cada segundo da la misma sensación y no arrastra reconexiones, latidos ni estados a medias.</sub>
- **ASIENTOS QUE NO SE SIENTAN, PORQUE NO SON DE NADIE.** <sub>línea 58</sub>
  <br><sub>El crupier del blackjack no decide: su regla es fija —se planta en 17— y sobre esa certeza descansa TODA la medida del juego. La mesa, que descubre los asientos por el nombre del turno, le ofrecía ese sitio a quien llegara segundo:</sub>
- **JUEGOS DONDE SENTARSE DOS NO SIGNIFICA NADA — Y SE DICE, NO SE APARENTA.** <sub>línea 74</sub>
  <br><sub>Antes se admitía a cualquiera en cualquier mesa. En estos, el segundo se sentaba, veía su nombre en la lista de asientos… y no le llegaba un solo turno en toda la partida. No daba error: simplemente no pasaba nada, que es la peor</sub>
- **LA BIBLIOTECA DE CARTAS SE PIDE POR URL ABSOLUTA, Y HAY MOTIVO.** <sub>línea 116</sub>
  <br><sub>Los juegos de cartas leen `card_library.json` con un `fetch` relativo a `import.meta.url`. Dentro de un Worker eso apunta al PROPIO worker, así que la petición se la hacía a sí mismo y Cloudflare la cortaba con un</sub>
- **LOS ASIENTOS SE DESCUBREN JUGANDO, Y ANTES NO SE DESCUBRÍAN.** <sub>línea 160</sub>
  <br><sub>Cada juego nombra sus asientos a su manera: 'white'/'black' en ajedrez, 'player'/'cpu1'/'cpu2'/'cpu3' en los de bazas. La versión anterior sacaba la lista del PRIMER estado, así que sólo conocía un nombre — y como todos</sub>
- **EL BUZÓN. Ver la nota del enrutador: esta instancia no es una mesa.** <sub>línea 194</sub>
  <br><sub>`POST /reporte`  guarda un aviso `GET  /reportes` los devuelve, del más nuevo al más viejo</sub>
- **EL ALIAS, OTRA VEZ.** <sub>línea 258</sub>
  <br><sub>Esto comprobaba `JUEGOS.includes(d.juego)` y devolvía `null` si no estaba. Pero `checkers.html` monta `{ juego: 'damas', idJuego: 'checkers' }` y `chess.html` lo mismo con el ajedrez: la página abre</sub>
- **CON BARAJA DE RESPALDO NO SE ABRE MESA, Y NO ES REMILGO.** <sub>línea 284</sub>
  <br><sub>Los juegos de cartas caen a un respaldo interno si no pueden leer `card_library.json`, y lo avisan con `biblioteca: false`. En una partida suelta eso es tolerable; aquí NO: el recibo de esta mesa</sub>
- **A CUÁNTOS SE ESPERA ANTES DE QUE JUEGUE LA CASA.** <sub>línea 300</sub>
  <br><sub>Sin esto, el primero que se sienta arranca y la casa ocupa el resto — cómodo para una persona sola, y demoledor en cuanto los jugadores son agentes: en la primera prueba con dos procesos, el</sub>
- **NO CABE UN CUARTO EN UNA MESA DE DOS.** <sub>línea 335</sub>
  <br><sub>Antes el número de asientos se averiguaba JUGANDO —se subía cada vez que se veía cambiar el turno— y por eso en una mesa recién abierta entraba todo el mundo. Pasó de verdad: cuatro sentados a un ajedrez,</sub>
- **UN SECRETO POR ASIENTO — SIN ESTO, EL NOMBRE NO ES UNA IDENTIDAD.** <sub>línea 359</sub>
  <br><sub>Hasta aquí `quien` era sólo una etiqueta: cualquiera que supiera el nombre de la sala podía mandar `{quien:'motoko', jugada:...}` y jugar las piezas de otra. Entre nosotros da igual; con el enlace circulando</sub>
- **HAY QUE DEMOSTRAR QUE ERES TÚ, NO SÓLO DECIRLO.** <sub>línea 389</sub>
  <br><sub>Sin esto, `quien` era una etiqueta: cualquiera con el nombre de la sala podía mandar `{quien:'motoko', jugada:…}` y mover sus piezas. El secreto se entrega al sentarse y se exige aquí.</sub>
- **CADA UNO VE SU MANO, Y ESTO COSTÓ VERLO.** <sub>línea 464</sub>
  <br><sub>Las reglas de cartas publicaban siempre la perspectiva de la silla 0. Con un humano contra la casa daba igual; en una mesa compartida, el segundo abría su pestaña y leía la mano del primero, carta por carta.</sub>
- **Y NO SE PREGUNTA SI LAS REGLAS ACEPTAN EL SEGUNDO PARÁMETRO.** <sub>línea 471</sub>
  <br><sub>El primer intento lo hacía con `reglas.estado.length > 1`, y esa condición es SIEMPRE falsa: `Function.length` cuenta los parámetros hasta el primero con valor por defecto, y la firma es</sub>
- **EL OBJETIVO Y EL PATRÓN NO LLEGABAN A LAS SALAS.** <sub>línea 482</sub>
  <br><sub>Los dos los declara el juego una vez —`OBJETIVO`, `PATRON`— y los mete en el estado `ProtoHub.state()`. Este árbitro no pasa por ahí: llama a `reglas.estado(p)` directamente, así que aquí no aparecían.</sub>
- **EL SECRETO NO SALE DE AQUÍ.** <sub>línea 514</sub>
  <br><sub>Esto era `{...a}`, que copia el asiento entero — y al añadir el secreto por asiento habría repartido el de todos a todo el mundo en cada respuesta. El arreglo de seguridad abriendo, él solo, un</sub>
- **Y EL TOPE DECLARADO, QUE ES EL QUE DECIDE SI CABES.** <sub>línea 542</sub>
  <br><sub>Este número ya estaba aquí —es el que devuelve el 409 de mesa completa— pero no salía, así que los clientes decidían si sentarse mirando `asientos_del_juego`, que se DESCUBRE jugando y vale 1 hasta</sub>
- **LA SITUACIÓN, EN TEXTO — Y FALTABA.** <sub>línea 568</sub>
  <br><sub>La mesa entregaba `acciones` y nada más, así que un agente sabía qué podía hacer y no qué estaba pasando. Con eso sólo se puede elegir al azar entre lo ofrecido, que es exactamente la línea base</sub>
- **Y SI EL JUEGO NO TIENE `describir` PROPIO, LO CUENTA EL** <sub>línea 584</sub>
  <br><sub>DESCRIPTOR COMPARTIDO. Sin este respaldo, los diecinueve clásicos —ajedrez incluido— entregaban jugadas legales y ningún tablero: un agente recibía «a2a3, a2a4, b2b3…» sin saber qué está pasando, que</sub>
- **Y EL OBJETIVO SE ANTEPONE TAMBIÉN AQUÍ, PORQUE `describir` PROPIO** <sub>línea 595</sub>
  <br><sub>NO LO DICE.</sub>
- **LAS JUGADAS LEGALES SÓLO PARA QUIEN LE TOCA.** <sub>línea 623</sub>
  <br><sub>`legal_moves` son las jugadas de quien mueve, y en un juego de cartas **eso es literalmente su mano**. Se enviaban a cualquiera que mirase la mesa, así que un jugador sondeando mientras el rival</sub>
- **EL BUZÓN DE AVISOS.** <sub>línea 653</sub>
  <br><sub>Un aviso trae el RECIBO de la partida —{juego, semilla, jugadas}—, así que no es una queja: es algo que se puede volver a jugar exactamente igual. Por eso vive aquí y no en un formulario cualquiera; aquí ya está el código que</sub>
- **Y COMPARTE ALMACÉN CON LAS MESAS, QUE NO ES ELEGANTE Y SE DICE.** <sub>línea 660</sub>
  <br><sub>Un buzón no es una mesa. Tener su propia clase Durable Object obligaría a una migración del worker, y eso es riesgo de despliegue para guardar una lista. Va a una instancia con nombre fijo y su propia clave de almacén; el</sub>

### `worker-mesas/prueba_mesa.mjs`

- **AL FALLAR, ENSEÑA LA RESPUESTA.** <sub>línea 37</sub>
  <br><sub>«✗ se sienta ana — undefined, semilla undefined»: el mensaje se compone con campos que precisamente no llegaron, así que dice lo mismo pase lo que pase y el motivo real —que el servidor devolvió un 503 explicándolo— se pierde. Dos</sub>
- **0. ¿EL ÁRBITRO JUEGA CON LAS MISMAS REGLAS QUE ESTE REPOSITORIO?** <sub>línea 70</sub>
  <br><sub>El worker se despliega APARTE del sitio. Así que un cambio de reglas llega a la página de un jugador en cuanto se publica, y a las salas compartidas sólo cuando alguien se acuerda de lanzar `npm run desplegar:mesas`. Entre una cosa</sub>
- **EL SECRETO DE CADA SILLA, QUE ESTA PRUEBA NO GUARDABA.** <sub>línea 125</sub>
  <br><sub>La mesa lo entrega al sentarse y lo exige para mover. Se blindó el árbitro y no se tocó ni un cliente: esta prueba mandaba `/jugar` sin él y contestaba 403 con el motivo escrito y la pista puesta.</sub>
- **QUE LA SALA CUENTE LO MISMO QUE LA CASA.** <sub>línea 164</sub>
  <br><sub>El objetivo del juego lo declara `reglas.OBJETIVO` y lo mete en el estado `ProtoHub.state()`. El árbitro NO pasa por ahí —llama a `reglas.estado(p)` directamente— así que en una sala compartida la puerta de texto no decía a qué</sub>
- **Hay que pedir el estado DICIENDO QUIÉN ERES.** <sub>línea 213</sub>
  <br><sub>ofrece las jugadas legales a quien le toca —porque en un juego de cartas esa lista ES su mano—, un `GET` anónimo devuelve `acciones: []`. No es un fallo: es la fuga tapada.</sub>
- **La comprobación que casi no escribo, por obvia: la primera vez salió** <sub>línea 244</sub>
  <br><sub>«ana 10, bruno 0». La partida terminaba, el marcador cuadraba y el recibo verificaba, pero el segundo jugador no había tocado una carta — la mesa reconocía un solo asiento y la casa jugaba el resto. Todo lo demás verde.</sub>

## El motor

### `public/js/alisa-engine/src/extensions/alisa-colony/plugins/SovereignTickerPlugin.js`

- **UN SOLO LIENZO, N CARAS.** <sub>línea 39</sub>
  <br><sub>cada fotograma; son ~2 MB de textura subidos a la GPU por vuelta. Con cuatro instancias para rodear una sala serían ocho. Aquí las caras COMPARTEN textura y material: se dibuja una vez y se ve desde todos</sub>
- **Conectarse a la colonia es una MEJORA, no un requisito.** <sub>línea 99</sub>
  <br><sub>abría el EventSource a pelo: sin hub, el navegador reintenta en bucle para siempre y llena la consola de errores de red en una página que funciona perfectamente sin él. Ahora se rinde y se calla.</sub>

### `public/js/alisa-engine/src/extensions/alisa-colony/psyche/EntityCardSystem.js`

- **ESTA PIEZA TENÍA 0 IMPORTADORES, y por una razón concreta: creaba** <sub>línea 57</sub>
  <br><sub>su DOM pero NO llevaba sus estilos. El CSS vivía suelto en el `style.css` del overworld viejo, que ya no existe en el proyecto. Quien la importara veía... nada: elementos sin forma, invisibles.</sub>

### `public/js/alisa-engine/src/index.js`

- **ESTA LISTA SE ESCRIBÍA A MANO, Y POR ESO MENTÍA.** <sub>línea 40</sub>
  <br><sub>`check_gym_envs.mjs` la lee para comprobar los entornos nativos. Al añadir `ChopperAquariumEnv` seguía diciendo «5 entornos en el catálogo»: el comprobador estaba verificando una lista, no el catálogo.</sub>

### `public/js/alisa-engine/src/soma/AssetManager.js`

- **DEVUELVE `gltf.scene` (un THREE.Group), NO el gltf entero.** <sub>línea 51</sub>
  <br><sub>(GLTFPlugin.load) ya hace ese desempaquetado. Escribir `.then(gltf => gltf.scene)` da undefined — era el fallo de Biolab y de ArcadeTableRoom. Las animaciones quedan en `.userData.animations`.</sub>
- **No GLTF Delegate found.** <sub>línea 62</sub>
  <br><sub>try { const module = await import('./plugins/GLTFPlugin.js'); const tempPlugin = new module.GLTFPlugin();</sub>

### `public/js/alisa-engine/src/soma/plugins/CSS3DHologramPlugin.js`

- **El cajón del cartucho. `CSS3DObject` se APROPIA del <iframe>: lo** <sub>línea 34</sub>
  <br><sub>mete en el DOM del CSS3DRenderer, y al sacar el objeto de la escena three dispara su evento 'removed', que BORRA el elemento del DOM. Sin esto, levantarse de una máquina destruye el cartucho y sentarse</sub>
- **TESTIGO DE MONTAJE.** <sub>línea 289</sub>
  <br><sub>`onload`, y en ese hueco te puede dar tiempo a levantarte: el temporizador seguía en vuelo y montaba el cartucho DESPUÉS de haber desconectado, dejando la pantalla flotando en la sala. Cada carga</sub>
- **MONTAR UNA SOLA VEZ POR CARTUCHO.** <sub>línea 306</sub>
  <br><sub>Montar crea un `CSS3DObject` nuevo y lo mete en la escena, y eso reubica su elemento en el DOM. Reubicar un <iframe> —o CUALQUIER ancestro suyo— lo hace navegar otra vez desde cero,</sub>
- **AL CSS3DObject SE LE DA UN <div>, NUNCA EL <iframe>.** <sub>línea 347</sub>
  <br><sub>Aquí había `new CSS3DObject(iframe)` y montaba un bucle que se alimentaba solo:</sub>
- **El pitch va sobre el eje X LOCAL, no el del mundo.** <sub>línea 384</sub>
  <br><sub>`rotation.x = -0.15` y el orden Euler por defecto, la inclinación se aplica ANTES del giro: en una máquina girada 90° deja de ser inclinación de CRT y se vuelve ALABEO — la</sub>
- **Vaciar la escena ENTERA, no solo `currentCssObject`. `iframe.onload`** <sub>línea 478</sub>
  <br><sub>puede dispararse más de una vez (una recarga interna del juego basta), y cada disparo montaba un CSS3DObject nuevo sin soltar el anterior. El plugin solo recordaba el último, así que al levantarte quedaba un</sub>

### `public/js/alisa-engine/src/soma/plugins/SpatialAudioPlugin.js`

- **El parámetro `loop` existía y NO SE USABA: solo servía para decidir** <sub>línea 93</sub>
  <br><sub>si programar la limpieza. Pedir un sonido en bucle daba un sonido que se oía una vez y moría en silencio, sin un error en consola. Medido en la Sala del Huevo: once máquinas con voz, cero sonando.</sub>

### `public/js/alisa-engine/src/soma/tools/CrossSectionDrawTool.js`

- **Hub save failed: ${e.message}`);** <sub>línea 140</sub>
  <br><sub>}); }</sub>

### `public/js/alisa-engine/src/tests/test_engines.js`

- **FALSO AMIGO. Al revivir estas pruebas renombré `FSMEngine` -> `FSMSystem`** <sub>línea 28</sub>
  <br><sub>por el patrón de la mudanza, pero NO es el mismo motor con otro nombre: el viejo era una FSM de depredador (`tick(agente, ?, presa, dt)` devolviendo `{nextState, actionVector}`) y `FSMSystem` es una máquina de estados genérica</sub>

### `public/js/alisa-engine/src/world/BSPSystem.js`

- **WHY THIS PARAMETER EXISTS.** <sub>línea 28</sub>
  <br><sub>This generator called `this.rng()` in eleven places, which made it usable for a demo and unusable for anything that has to be REPLAYED: a benchmark run, a bug report, a match receipt. Same seed, different</sub>

### `public/js/alisa-engine/src/world/CabinetBSPEngine.js`

- **`cuts` SE VALIDA, y no es paranoia.** <sub>línea 8</sub>
  <br><sub>El corte de la recursión es `depth >= maxDepth`. Si `maxDepth` llega como `NaN` —cosa fácil: basta un `undefined + 1` en quien llama— esa comparación es SIEMPRE falsa y la función se llama a sí misma hasta reventar la pila.</sub>

### `public/js/alisa-engine/src/world/factories/ProceduralBuildingFactory.js`

- **Esta salida temprana devolvía el grupo SIN COLGARLO DE LA ESCENA.** <sub>línea 732</sub>
  <br><sub>`this.scene.add(this.buildingGroup)` está mucho más abajo, después de crear los personajes, así que por este camino nunca se ejecutaba: la fábrica construía el edificio entero — 183 mallas y 26 luces, todo</sub>
- **Aquí ponía `window.flashDust = new THREE.Points(...)`, pero arriba (l.73)** <sub>línea 805</sub>
  <br><sub>hay un `let flashDust` LOCAL. Son dos variables distintas: la global se rellenaba y la local seguía a null, así que la línea siguiente reventaba con «Cannot read properties of null (reading 'position')» — y con ella se</sub>

### `public/js/alisa-engine/src/world/gym_runners/CabinetEscapeGame.js`

- **Esto era `this.sys.episodes + 1` a secas.** <sub>línea 249</sub>
  <br><sub>`episodes` aún no existe, así que salía `NaN`, y ese NaN llegaba hasta `fractalPartition` como profundidad. Como `depth >= NaN` es siempre falso, la partición recursaba sin fondo y el juego moría al arrancar</sub>
- **SNAKE! DODGE (SPACE)!', 500);** <sub>línea 555</sub>
  <br><sub>return; }</sub>

### `public/js/alisa-engine/src/world/systems/BoidsSystem.js`

- **SIN `import * as THREE`, Y ESO ES LO QUE LO HACE UTILIZABLE.** <sub>línea 6</sub>
  <br><sub>El fichero se anunciaba como «pure headless» y arrastraba el motor de render en la primera línea. Con eso no se puede importar desde Node —ni desde una prueba, ni desde un banco de medidas— aunque el noventa por ciento del código</sub>
- **La caja NO encerraba en Y. `initAgents` usa minY/maxY para** <sub>línea 179</sub>
  <br><sub>repartir la bandada al nacer, y luego nadie los volvía a mirar: ni rebote ni recorte. En una escena abierta la bandada se escapa por arriba y por abajo y no vuelve — medido en El Andén, con las</sub>

### `public/js/alisa-engine/src/world/systems/CabinetEscapeSystem.js`

- **`episodes` NO se inicializaba aquí, y de ahí salía todo lo demás:** <sub>línea 24</sub>
  <br><sub>`randomizeCuts()` y `randomizeCabinetSize()` calculan `episodes + 1`, así que con `undefined`/`null` obtenían NaN. Ese NaN llegaba a la partición BSP como profundidad (y `depth >= NaN` es</sub>

### `public/js/alisa-engine/src/world/systems/EcosystemSystem.js`

- **POR QUÉ ESTE PARÁMETRO, Y POR QUÉ AHORA.** <sub>línea 16</sub>
  <br><sub>Este sistema llamaba a `this.rng()` en veintidós sitios. Para una demo de peces nadando eso está perfecto; para cualquier cosa que tenga que REPETIRSE —una tirada de banco de pruebas, un informe de fallo, el recibo</sub>

### `public/js/alisa-engine/src/world/systems/FileSystemDioramaSystem.js`

- **ESTE IMPORT FALTABA, Y ERA EL MÓDULO MÁS GRANDE DEL MOTOR.** <sub>línea 10</sub>
  <br><sub>52 KB y 111 usos de `THREE.` sin importarlo: dependía de que alguien hubiera dejado un `<script>` clásico con la global puesta. Cargado como módulo —que es como lo carga cualquier página moderna— reventaba con `THREE is not defined`.</sub>
- **POR QUÉ HAY UN `rng` EN UN OBJETO SINGLETON SIN CONSTRUCTOR.** <sub>línea 46</sub>
  <br><sub>Este módulo no es una clase, es un objeto único con `init()` haciendo de constructor — así que ahí es donde se cachea la fuente de azar, siguiendo el mismo patrón que `BSPSystem`/`WorldBuilderSystem` (config.rng cacheado</sub>
- **AQUÍ HABÍA `Renderer.init();` — UNA LÍNEA QUE ARRANCABA AL IMPORTAR.** <sub>línea 1205</sub>
  <br><sub>Dos cosas mal en cuatro palabras:</sub>

### `public/js/alisa-engine/src/world/systems/KinematicRageSystem.js`

- **PONÍA «DETERMINISTIC» EN LA PRIMERA LÍNEA Y NO LO ERA.** <sub>línea 4</sub>
  <br><sub>`applyImpulse` llamaba directamente a la función global de azar del motor de JS: dos volcados con los mismos datos daban dos estropicios distintos. Es justo la etiqueta-que-no-corresponde que nos mordió el 13-08-2026 con el temblor de las</sub>

### `public/js/alisa-engine/src/world/systems/RaccoonSpaceCore.js`

- **LÍMITE HONESTO: `Math.sin/cos` NO están fijados bit a bit por IEEE-754 y** <sub>línea 29</sub>
  <br><sub>pueden diferir en el último bit entre navegadores o CPUs. Para validar una partida ajena se auditan las ACCIONES (que son enteros) y se compara la puntuación con tolerancia, no el estado final exacto.</sub>

## El gym y los entornos

### `public/js/alisa-engine/src/gym/envs/AsteroidsEnv.js`

- **El tamaño se DEDUCE de los nombres.** <sub>línea 22</sub>
  <br><sub>Aquí ponía `shape: [14]` mientras `names` calculaba 16 (4 de la nave + 4 asteroides × 3). Un agente que se fiara del espacio declarado reservaría 14 huecos y recibiría 16 números: se los comería desplazados y "aprendería"</sub>

### `public/js/alisa-engine/src/gym/envs/CabinetEscapeEnv.js`

- **Aquí me equivoqué en la primera versión: usé `idx-1, idx+1`, o sea** <sub>línea 182</sub>
  <br><sub>índices contiguos. Pero el juego define "al lado" por distancia en el ÁRBOL BSP (`bspDistance(pA,pB) <= 2`), que no tiene por qué coincidir con el orden del array. Con vecinos equivocados la línea base apenas ganaba al</sub>

### `public/js/alisa-engine/src/gym/envs/ChopperAquariumEnv.js`

- **EL MOTOR NO PUNTÚA.** <sub>línea 30</sub>
  <br><sub>un comentario que dice «dummy RL reward, to be hooked manually». Así que la puntuación se define AQUÍ, y se define con el objetivo del propio juego — escanear plantas hasta dar con el mapache— no con un número inventado.</sub>
- **La recompensa la pone el entorno, no el motor: `stepSimulation`** <sub>línea 101</sub>
  <br><sub>devuelve 0 siempre. Se premia el PROGRESO de la misión —plantas nuevas— y se premia mucho encontrar al mapache. Sin esto el episodio no distingue a nadie: todo el mundo saca cero.</sub>

### `public/js/alisa-engine/src/gym/envs/CuccoSwarmEnv.js`

- **`BulletHeavenEngine` es la clase ABSTRACTA: su tabla de oleadas nace vacía** <sub>línea 2</sub>
  <br><sub>(`config.waves || []`), así que envolviéndola no aparece un solo enemigo — 400 ticks con la arena desierta y la falsa sensación de que el determinismo fallaba, cuando lo que pasaba es que no había nada que diferenciar.</sub>
- **DETERMINISMO — mírate esto antes de fiarte de una puntuación** <sub>línea 31</sub>
  <br><sub>El motor usa `Math.random()` por dentro (spawns, drops, la baraja de mejoras). Aquí NO se copia otro mulberry32: se usa `DeterministicScope`, que es el canónico. Ya hubo dos generadores conviviendo en el motor y, aunque</sub>
- **El método del motor es `update(dt)`, no `step(dt)`.** <sub>línea 108</sub>
  <br><sub>supuesto y reventó al primer tick. const resultado = DeterministicScope.run(this.seed + this.steps, () => { if (idx >= 0 && idx < VERBOS.length) this.sys.act(idx);</sub>

### `public/js/alisa-engine/src/gym/GymEnv.js`

- **EL EPISODIO ENTERO VA DENTRO DE UN DeterministicScope.** <sub>línea 82</sub>
  <br><sub>palabra "determinista" era un deseo, no una garantía: el motor tiene 470 llamadas a `Math.random()` sin semilla repartidas por 67 ficheros, así que la misma semilla daba mundos distintos en la misma máquina. Medido, y</sub>

### `public/js/alisa-engine/src/gym/ProtoHubEnv.js`

- **CUÁNTAS SILLAS TIENE ESTE JUEGO, PREGUNTÁNDOSELO AL ESTADO** <sub>línea 83</sub>
  <br><sub>Aquí ponía que ninguno de los 35 publica su lista de asientos, y era verdad hasta que los juegos empezaron a publicar `marcador`: un elemento por silla, o sea que su longitud las enumera. No hubo que inventar un campo — apareció</sub>
- **ENTROPY SE QUEDA EN UNA SILLA A PROPÓSITO, Y CONVIENE SABER POR QUÉ.** <sub>línea 103</sub>
  <br><sub>Publica `marcador: p.fin ? … : null`, o sea sólo al acabar, así que al empezar no hay nada que contar. Arreglarlo es de una línea en sus reglas —publicarlo siempre— pero ese campo entra en la HUELLA DE APERTURA</sub>
- **EN QUÉ SILLA SE SIENTA EL AGENTE.** <sub>línea 125</sub>
  <br><sub>No es un número de asiento porque NINGUNO de los 35 juegos publica su lista de asientos: `turn` es sólo un nombre suelto —`player`, `azul`, `ladron`, `guia`, `a`— y no hay forma uniforme de enumerarlos. Medido el</sub>
- **ACTUALIZACIÓN 16-08: YA HAY FORMA DE ENUMERAR LAS SILLAS, Y ARREGLA** <sub>línea 142</sub>
  <br><sub>EL PROBLEMA QUE DEJABA ESTO A MEDIAS.</sub>
- **Y estas jugadas entran en el recibo como cualquier otra, igual que** <sub>línea 197</sub>
  <br><sub>las de la casa en `step`. Si faltaran, al re-simular la partida saldría otro tablero y el verificador tumbaría a un jugador honrado —que es exactamente el fallo que ya nos costó una tarde con el `rnd`.</sub>
- **EL ASIENTO SE LE PASA A LAS REGLAS.** <sub>línea 220</sub>
  <br><sub>`this.asiento` movía al agente de silla para DECIDIR —la casa juega sus turnos antes, ahí arriba— pero esto llamaba a `reglas.estado(this.p)` a secas. O sea que el agente jugaba desde la silla 2 y se le devolvía la mano,</sub>
- **AQUÍ METÍ LA PATA Y CASI NO SE VE.** <sub>línea 266</sub>
  <br><sub>esto —`Number(e.puntos ?? e.score) || 0`— sin mirar que `Verificador.js` ya tenía `puntuacionDe()`. Con `score: {black, white}` mi versión hacía `Number(objeto)` → `NaN` → **0**, así que go, reversi</sub>
- **`res` TAMBIÉN CUENTA COMO GANADOR, Y ANTES NO.** <sub>línea 297</sub>
  <br><sub>Esta línea buscaba `winner` o `ganador`, y **ningún juego publica ninguno de los dos**: los diecinueve publican `result`. Como arriba sólo se compara con la notación de ajedrez (`1-0`, `0-1`, `1/2`) y</sub>
- **EL OBJETIVO NO LLEGABA AQUÍ.** <sub>línea 383</sub>
  <br><sub>A QUÉ.</sub>
- **Y ES EXACTAMENTE EL MISMO FALLO QUE EL ÁRBITRO DE SALAS YA ARREGLÓ.** <sub>línea 398</sub>
  <br><sub>`worker-mesas/mesas.js` lo cuenta en su propio comentario: «este árbitro no pasa por ahí, así que aquí no aparecían», y allí se corrigió. Aquí no, y nadie lo notó porque las dos puertas se probaban por separado. Lo destapó</sub>
- **MATIZ, porque «cazamos al que cambia la semilla» no es cierto en** <sub>línea 449</sub>
  <br><sub>todos: en **ajedrez y damas cambiar la semilla no invalida nada**, y está bien que así sea — son deterministas, la semilla no interviene en la partida. Ahí lo que autentica es la secuencia de jugadas, no la</sub>
- **Y DESDE QUÉ SILLA SE PUNTUÓ, QUE FALTABA Y COSTABA LA MITAD DE LOS RECIBOS.** <sub>línea 457</sub>
  <br><sub>`puntos` sale de `_estado()`, que mira desde TU silla. El verificador re-simulaba y leía la puntuación desde la silla 0 — porque no sabía que había otra—, así que toda partida jugada fuera de la 0 salía «la puntuación</sub>
- **Lo peor no es el fallo, es cómo se veía: con la silla rotando por semilla,** <sub>línea 467</sub>
  <br><sub>el contador de la tabla ponía `100/200` — exactamente la mitad— y eso se lee como un número normal, no como «la mitad de mis filas no verifican». En un banco cuya frase es «lo que no verifica, no puntúa», media tabla estaba</sub>
- **`asientoReal` y no `asiento`.** <sub>línea 483</sub>
  <br><sub>una pasada: `asiento` es lo que pide quien llama —«que la casa juegue n turnos antes de que me siente»— y `asientoReal` es la silla que resulta, envuelta sobre las que el juego tiene de verdad. `_estado()`</sub>

### `public/js/alisa-engine/src/gym/registro.js`

- **EL CONTROL DEL BANCO DE PRUEBAS.** <sub>línea 49</sub>
  <br><sub>agentes DEBEN empatar aquí. Si la tabla los separa, el que falla es el banco, no el agente. Ver la cabecera de `rules/guerra.js`. { juego: 'guerra', titulo: 'Guerra (control)', crear: 'crearGuerra' },</sub>
- **El primero SIN azar y sin rival: pura planificación en una rejilla, con** <sub>línea 66</sub>
  <br><sub>movimientos que no se pueden deshacer. Cubre una estructura de decisión que no tenía ninguno de los diecinueve anteriores.</sub>
- **Y es honesto sobre su alcance: es una FSM GENÉRICA.** <sub>línea 234</sub>
  <br><sub>alfil. Sirve para demostrar que la puerta funciona y para dar un suelo comparable; una FSM buena para un juego concreto se escribe con las reglas de ese juego delante.</sub>
- **La primera versión guardaba el contador del generador en un cierre, y con** <sub>línea 278</sub>
  <br><sub>eso `selfTest` decía «no reproducible» en 14 de 16 entornos. El fallo era mío: `selfTest` corre el mismo episodio dos veces con la MISMA política, así que la segunda arrancaba con el generador ya avanzado y salía otra partida.</sub>

## Estilos

### `public/arcade/css/jugables.css`

- **ESTO LO ENCONTRÓ UN BETATESTER, Y LO DIJO ASÍ: «no me deja coger la carta** <sub>línea 5</sub>
  <br><sub>del descarte».</sub>
- **ESTO ES LO QUE HACÍA QUE «LAS DAMAS NO SE PUEDAN JUGAR».** <sub>línea 35</sub>
  <br><sub>Estuve un buen rato convencida de que su manejador estaba roto. No lo estaba. Trazándolo por dentro salió que del par de clics necesarios para mover una pieza SOLO LLEGABA EL PRIMERO. Medido con `elementFromPoint` en una ventana de 900x800:</sub>
- **Y LA PISTA NO.** <sub>línea 70</sub>
  <br><sub>La regla de este bloque está escrita tres párrafos más arriba: recuperan el clic «sólo las cosas que hacen algo». `.mesa-pista` es una línea de TEXTO que explica la fase — no responde a nada — y estaba en la lista, probablemente por ir pegada a</sub>
- **LOS BOTONES DE ORDENAR LA MANO SÍ HACEN ALGO, ASÍ QUE RECUPERAN EL CLIC.** <sub>línea 91</sub>
  <br><sub>Cumplen la regla del bloque de arriba —«sólo las cosas que hacen algo»— aunque lo que hacen NO sea una jugada: reordenan tu mano para verla. Se distinguen a la vista de los botones de jugada a propósito: son más pequeños y apagados, porque pulsarlos</sub>
- **EL BOTÓN DE VOLCAR LA MESA NO SE PARECE A UNA JUGADA, Y ES A PROPÓSITO.** <sub>línea 114</sub>
  <br><sub>(╯°□°)╯︵ ┻━┻</sub>
- **PERO EL PANEL NO SE QUITA, Y ESTO IMPORTA MÁS DE LO QUE PARECE.** <sub>línea 213</sub>
  <br><sub>Sus botones son literalmente `legal_moves`: la MISMA lista que recibe un agente por la puerta de texto. Que persona y máquina jueguen con lo mismo es lo que hace comparables las dos filas de la tabla del banco de pruebas — si en móvil hubiera</sub>
- **LAS JUGADAS, EN UNA TIRA QUE SE DESLIZA.** <sub>línea 255</sub>
  <br><sub>En entropy, tras robar hay CATORCE jugadas legales, y en rejilla ocupaban el 68% de una pantalla de 467 px: tapaban la caja que hay que mirar para decidir. Absurdo — la decisión es «¿en qué hueco la meto?» y los huecos</sub>
- **Y ESTAS TRES REGLAS NO SON LO QUE LO ARREGLÓ.** <sub>línea 308</sub>
  <br><sub>Di por hecho que era un problema de apilado: el overlay lleva `z-index: 10` puesto a mano y SIN `position`, y un `z-index` sin posicionar no hace nada. Encaja con el síntoma, así que posicioné las capas. `elementFromPoint` siguió</sub>
- **EL ANCHO SE MIDE EN EL MÓVIL, NO EN EL ESCRITORIO.** <sub>línea 352</sub>
  <br><sub>Aquí ponía `calc(100vw - 220px)` para esquivar los botones de esquina. En una pantalla de 390 eso deja CIENTO SETENTA píxeles, y las cuatro flechas de snake salían escalonadas en cuatro filas: «arriba abajo», «izquierda», «derecha».</sub>
- **`#hud-container` VA AQUÍ PORQUE PEATÓN NO SE LLAMA `.overlay`, Y ESO LE COSTABA** <sub>línea 398</sub>
  <br><sub>LAS CINCO JUGADAS.</sub>
- **EL SCROLL VA EN LA TIRA, NO EN EL PANEL.** <sub>línea 429</sub>
  <br><sub>`.hud-panel` tiene `pointer-events: none` a propósito —para que los clics pasen al tablero— y un contenedor que no recibe puntero NO SE PUEDE DESPLAZAR. Ponerle `overflow-y: auto` daría una barra de scroll que no responde a nada, que es peor</sub>
- **DOS INTENTOS QUE NO VALIERON, Y POR QUÉ.** <sub>línea 436</sub>
  <br><sub>Primero `max-height` a secas en el panel: sin `overflow`, un tope recorta la CAJA y no lo que hay dentro — el panel acababa en 652 y diez botones seguían pintándose más allá de 720. Y ponerle `overflow: hidden` los dejaría otra vez</sub>
- **Y EL TERCER INTENTO —ANCLAR LA TIRA A LA PANTALLA— ARREGLÓ ESTO Y ROMPIÓ OTRA.** <sub>línea 447</sub>
  <br><sub>Con `position: fixed` los veinte botones caben, sí: medido, 10 fuera → 0. Pero la tira sale del flujo y se pinta ENCIMA de lo que haya debajo — o sea encima de los desplegables de asiento, la caja de texto y el botón de enviar del propio panel.</sub>
- **LO QUE SÍ VALE: QUE EL PANEL SE DESPLACE, Y SÓLO DONDE PUEDE.** <sub>línea 455</sub>
  <br><sub>El panel lleva `pointer-events: none` para que los clics pasen al tablero, y un contenedor sin puntero no se desplaza. Pero esa regla existe por el caso MÓVIL, donde el panel ocupa todo el ancho y se pone encima de la mesa. En escritorio es</sub>
- **EL ANCHO, PORQUE SIN ÉL EL PANEL SE ENCOGÍA HASTA LA PALABRA MÁS LARGA.** <sub>línea 478</sub>
  <br><sub>`.overlay` es `absolute` sin ancho, o sea que se ajusta a su contenido; y `.hud-panel` es un hijo flex en columna, o sea que se estira a su padre. Cada uno esperando al otro, el resultado es el MIN-CONTENT: el ancho de la</sub>
- **ESTO NO ARREGLÓ LO QUE YO CREÍA.** <sub>línea 511</sub>
  <br><sub>`tacto.mjs` daba que el ratón llegaba a más jugadas que el dedo (flota 31 contra 27, go 113 contra 82) y di por hecho que era el navegador quedándose el gesto: sin `touch-action`, un toque es candidato a desplazar, y para cuando el</sub>
- **El panel SÍ tiene que poder desplazarse: sesenta y cuatro botones en un móvil** <sub>línea 534</sub>
  <br><sub>no caben, y quitarle el gesto lo dejaría sin scroll. Por eso esto es sólo para el lienzo, y se dice `auto` en el panel para que ninguna regla de más lo pise. ═══════════════════════════════════════════════════════════════════════════ */</sub>
- **Y LOS BOTONES, `manipulation`: SIN DOBLE-TOQUE PARA HACER ZOOM.** <sub>línea 548</sub>
  <br><sub>Éste sí salió de una medida. `tacto.mjs`, mismos puntos y misma página, sólo cambiando la mano:</sub>
- **ABAJO A LA IZQUIERDA, Y NO ARRIBA A LA DERECHA COMO PENSÉ PRIMERO.** <sub>línea 581</sub>
  <br><sub>Arriba a la derecha parecía la esquina libre: el panel está arriba a la izquierda y «¿algo va raro?» abajo a la derecha. En escritorio es verdad. En móvil NO: ahí el panel ocupa todo el ancho, así que «arriba a la derecha» es</sub>

## Los agentes y las políticas

### `public/arcade/js/agentes/llm.js`

- **SOBRE LAS «FORZADAS»: podría no contarlas y dejar que el modelo pierda el** <sub>línea 27</sub>
  <br><sub>turno. No lo hago porque entonces un modelo que contesta mal se hunde por una razón que la puntuación no explica, y la tabla mentiría por omisión. Se le rescata, se anota, y se publica el número. Un modelo con 40% de forzadas no ha</sub>
- **El número se busca con `\b\d+\b` y NO con el primer dígito suelto: un** <sub>línea 59</sub>
  <br><sub>modelo que contesta «la 3» y otro que contesta «e2e4» no pueden acabar los dos en la opción 2 porque en «e2e4» hay un 2.  Por eso el verbo se comprueba ANTES que el número.</sub>
- **SE LEE LA CONCLUSIÓN, NO EL RAZONAMIENTO.** <sub>línea 69</sub>
  <br><sub>Un modelo que piensa en voz alta baraja media docena de opciones antes de decidirse —«podría jugar la 3… aunque la 5 protege mejor… voy con la 5»—. Buscar la primera coincidencia en todo el texto devuelve la 3: se le está</sub>
- **`truncadas` NACE SEPARADA DE `forzadas`, Y LA DISTINCIÓN IMPORTA.** <sub>línea 117</sub>
  <br><sub>`forzadas` responde a «¿supo elegir?». Quedarse sin presupuesto de tokens a mitad de pensar responde a otra cosa: «¿le dejamos terminar?». Hasta hoy las dos caían en el mismo contador, y con eso `qwen3:8b` y</sub>
- **EL TOPE CUENTA DECISIONES, NO LLAMADAS AL MODELO.** <sub>línea 133</sub>
  <br><sub>Era `while (llamadas < tope)`, y `llamadas` sólo sube cuando se pregunta a un modelo. Una política de código no pregunta a nadie, así que su contador se quedaba en cero y **el tope no limitaba nada**: el episodio sólo</sub>

### `public/arcade/js/agentes/politicas.js`

- **POR QUÉ `casa` ENTRA POR OTRA PUERTA** <sub>línea 19</sub>
  <br><sub>Una política de código ve el entorno; un proveedor de modelo sólo ve texto y no puede tocar nada. Esa frontera es una garantía del banco de pruebas, no una comodidad, así que `casa` no se disfraza de proveedor: se pasa como</sub>
- **RESEMBRAR ANTES DE CADA PARTIDA, Y ANTES NO SE HACÍA.** <sub>línea 45</sub>
  <br><sub>Esta política se creaba UNA vez y su estado interno viajaba de juego en juego y de semilla en semilla durante toda la tanda. Consecuencia: la partida aleatoria de `cripta` dependía de cuántas jugadas había gastado</sub>

### `public/arcade/js/agentes/proveedores.js`

- **EL PRESUPUESTO DE SALIDA ERA **24 TOKENS**, Y ESO EXPULSABA A LOS MODELOS** <sub>línea 31</sub>
  <br><sub>QUE RAZONAN.</sub>
- **HAY MODELOS QUE ESCRIBEN EN OTRO CAMPO, Y LOS DÁBAMOS POR MUDOS.** <sub>línea 70</sub>
  <br><sub>Ollama separa el razonamiento (`message.thinking`) de la respuesta (`message.content`) en los modelos que piensan. Medido con `qwen3:8b`: `content` venía **vacío** con 512 tokens gastados. Leíamos el campo</sub>
- **ESTE PROVEEDOR EXISTE PARA QUE NO SEAMOS LOS ÚNICOS JUGANDO.** <sub>línea 103</sub>
  <br><sub>Hasta ahora sólo se podía entrar por Ollama. Quien llegue con LM Studio, llama.cpp, vLLM, text-generation-webui, OpenRouter, Groq, Together o una API de pago se quedaba fuera — y un banco de pruebas al que sólo puede subir su</sub>
- **LA CLAVE SE LEE DEL ENTORNO Y NUNCA SE ESCRIBE EN NINGÚN SITIO.** <sub>línea 116</sub>
  <br><sub>Ni en el recibo, ni en la tabla, ni en el JSON de resultados. Lo que se publica de una tanda son jugadas y tokens; una credencial no es un resultado.</sub>
- **VIVE AQUÍ Y NO EN CADA HERRAMIENTA. `jugar_llm.mjs` y `tabla.mjs` tenían** <sub>línea 202</sub>
  <br><sub>cada uno su propia cadena de `if`, así que un proveedor nuevo había que darlo de alta dos veces — y el día que se olvidara una, la herramienta seguiría funcionando con un modelo distinto del pedido, sin avisar. Es el mismo fallo</sub>
