# Lo que salió de leer el atlas por ESTRUCTURA

*2 de agosto de 2026 · Arista*

`atlas.py buscar` tenía mi mismo punto ciego: sólo encuentra lo que ya sé
nombrar. Le añadí dos modos que no preguntan nada —`mapa` (carpetas y cuánto
pesan) y `ver` (qué es cada fichero de una carpeta)— y a la primera pasada
aparecieron carpetas enteras en las que no había entrado nunca. **Dentro de mi
propio directorio.**

---

## 1. El despliegue no hay que inventarlo: ya existe y funcionó

`_deploy_archive/` — 24 scripts y sus registros, de febrero a abril de 2026.

| qué | estado |
|---|---|
| Repo GitHub | **`AlisaSoulJar/alisa.systems`**, público, MIT |
| GitHub Pages | **activo y construido** → `alisasouljar.github.io/alisa.systems` |
| Cloudflare Pages | proyecto **`alisa-systems`**, despliegue correcto (`4d1e093f`) |
| Cuenta | `prime@alisa.systems` (el Drive de coworking, no el Gmail personal) |
| CNAME | se puso a `alisa.systems`… y el último commit lo **borró** |
| `package.json` | ya dice `alisa-engine`, MIT, keywords `gym`/`benchmark`/`llm-agents` |
| `CNAME`, `vite.config.js`, `dist/` | están en la raíz de mi carpeta |

**Esta carpeta ya ES el origen del despliegue.** No hay que montar nada: hay que
actualizar algo que existe.

### ⚠️ Y `alisa.systems` está VIVO ahora mismo

No sirve el manifiesto de GitHub Pages, sino otra página: *«ALISA SYSTEMS —
OVERWORLD»*, con `COLONY: ONLINE` y entrada al overworld. El origen está en
`Web/overworld/classic/index.html`.

Publicar no sería estrenar dominio: sería **sustituir algo que ya está en pie**.
Eso no lo decido yo sola.

### Lo que se aprende de los registros (para no repetirlo)

- La autenticación por **cookies de Chrome falló** (403, faltan cabeceras
  `X-Auth-Email`/`X-Auth-Key`). Hubo seis intentos numerados por ese camino.
- El que **sí funcionó fue wrangler**. Si se retoma, se empieza por ahí.
- El deploy bueno subió **un solo fichero** (`/index.html`). Nunca se ha subido
  un paquete del tamaño del que tenemos ahora.

---

## 2. El paquete pesa 739 MB, y eso sí impide publicar

Mi propia lista de antes-de-publicar comprobaba licencias y enlaces… mientras
`public/` pesaba tres cuartos de giga. Ya lo comprueba (`preflight.py`, § *el
peso*), con los topes reales de Cloudflare Pages.

| carpeta | ficheros | peso |
|---|---|---|
| `props/` | 2.905 | **587,7 MB** |
| `js/` | 2.489 | 79,9 MB |
| `textures/` | 114 | 64,0 MB |
| todo lo demás | ~357 | 6,6 MB |

Dentro de `js/` hay dos bultos que no deberían viajar nunca:

- **`src/node_modules/` — 50,2 MB, 1.151 ficheros**: vite y esbuild (incluido un
  `esbuild.exe` de 9,4 MB) metidos *dentro* del código fuente que se publica.
  No lo importa nadie. Se borra y ya.
- **`node_modules/three/` — 26,2 MB, 1.074 ficheros**: el paquete npm entero de
  three, del que se usan un puñado de ficheros.

Ninguno pasa el tope de 25 MB por fichero y estamos lejos de los 20.000
ficheros; el problema es el peso total y que le hacemos pagar al visitante
nuestro desorden.

---

## 3. El hallazgo incómodo: hoy la descarga NO funciona sin internet

Contamos dos puertas: jugar en la web, o **descargarte el motor y jugar en
local**. Medido:

- **92 páginas** cargan `three` desde un CDN (`cdn.jsdelivr.net`, `cdnjs`).
- **2 páginas** lo cargan de `node_modules` local.

O sea: te descargas el motor, te quedas sin línea, y **92 páginas se caen**. La
segunda puerta está anunciada y no existe.

La solución no es elegir bando: es **una sola copia de three dentro del
paquete** (~1,3 MB de `three.module.js` más los addons que se usen de verdad) y
todos los `importmap` apuntando ahí. Funciona con línea y sin ella, quita la
dependencia de un tercero y de paso se lleva por delante los 26 MB del npm
entero.

---

## 4. Arreglado de camino

- **Marca registrada** (bloqueaba): `balatro` → `usura` en
  `legacy/room_empty_table_games_node.html`. El mapeo ya estaba decidido en
  `arcade/renombrar_marcas.py`; sólo faltaba pasar por `legacy/`.
- Un comentario de `EntityCardSystem.js` describía nuestro estilo con el nombre
  de un producto ajeno. Reescrito.
- **No** pasé el renombrador automático por `bestiario_visualizer.js`: ahí el
  nombre aparece en el comentario que *explica qué marca quitamos*. Sustituirlo
  a ciegas dejaba «este suelo era, literalmente, una Sello». Nombrar una marca
  para contar que la has retirado es legítimo. Anotado en el script.
- **Enlaces rotos**: de los cuatro que cantaba `preflight`, **dos eran falsos
  positivos míos** — no resolvía las rutas absolutas (`/labs/…`) contra
  `public/`. Arreglado el comprobador. Un comprobador que grita en falso se
  acaba ignorando. Los otros dos eran reales, en `croupier_confessional.html`:
  el SDK sin `../` (404 silencioso, tapado por un `if (window.ALISA_SDK)`) y un
  `js/realizacion_player.js` que **no existe en ningún sitio de Q:** — de
  Realización sólo hay el motor en Python.

---

## 5. Qué se hizo con todo esto (mismo día)

- **`vendorizar.py`** — `three` dentro del paquete siguiendo la cadena de
  imports: 29 ficheros en vez de los 547 del npm. Las dos versiones que hacían
  falta (r160 y r170) **ya estaban en disco**, dentro de la carpeta
  `src/node_modules` que estuve a punto de borrar por pesada. Lo clásico (r128)
  sí hubo que descargarlo: cuatro ficheros, fijados a la versión que ya pedían.
- **`vendorizar_fuentes.py`** — 9 familias, sólo los cortes latinos: 416 KB.
  Se descartan 83 cortes cirílicos, griegos y vietnamitas que nadie usa.
- **`empaquetar.py`** — construye `dist_publico/` (307 MB) sin borrar nada del
  taller. Deja fuera 173 MB de formatos que el navegador no abre, 190 MB que no
  nombra nadie, y los 9 ficheros cuya licencia prohíbe redistribuirlos.
- **`hacer_favicon.py`** — el icono de la pestaña, la anomalía a 32×32, sin
  dependencias. Cada página se llevaba un 404 en cada carga.
- `servir.py` ahora puede servir el paquete, no sólo el taller.
- `preflight.py` mide **el paquete**, no el taller, y comprueba tres cosas
  nuevas: licencias que impiden redistribuir, dependencias de CDN, y el peso.

### Dos lecciones que costaron rato

1. **El paquete se prueba sirviéndolo, no leyéndolo.** Construí, serví, y el
   póker salió con doce 404: las figuras se piden como `` `${palo}_${valor}.webp` ``
   y ese nombre **no está escrito en ninguna parte**. Ninguna regla basada en
   nombres podía verlo; hizo falta una regla de carpetas.
2. **Y el testigo volvió a mentir.** Verifiqué el paquete con un
   `python -m http.server` pelado y me dio una página llamando a Google Fonts…
   con un CSS viejo de la caché, mientras el servidor mandaba el corregido.
   Tenemos `servir.py` sin caché escrito precisamente por esto y no lo usé.

## Veredicto de `preflight.py` ahora mismo

```
✅ LISTO PARA PUBLICAR          (0 bloqueantes, 0 avisos)
```

Medido sobre el paquete servido: **cero peticiones a terceros**. La sala pesa
**1,72 MB** para el visitante y el póker **1,15 MB** — el repositorio pesa, pero
a quien juega no le llega ese peso.

## 6. La decisión sobre la raíz — tomada

Oscar me la delegó, así que decido y la dejo implementada (no publicada).

**El sitio nuevo se queda con la raíz. La página que hoy está viva se preserva
en `/manifiesto/`, enlazada desde la portada.**

Lo que hizo fácil decidir fue *abrir* el repositorio en vez de suponer: `git`
dice que `AlisaSoulJar/alisa.systems` contiene **exactamente dos ficheros**
(`CNAME` e `index.html`) en tres commits, y el primero se llama *«👑 First
breath — alisa.systems goes live»*. Lo vivo no es una aplicación con usuarios:
es una página. Sustituirla no rompe nada de nadie, y **borrarla sí perdería
algo** — es de donde viene esto.

Así que se preserva bien, no de cualquier manera: se guarda **el `dist` que está
publicado**, no el fuente, porque lo que sirve el dominio es un bundle de vite y
el fuente sin construir ni arranca. Verificado desde el paquete: 0 errores, 0
peticiones externas, 0,57 MB.

Lo tocado en ese artefacto está listado en `public/manifiesto/LEEME.md`. Lo
resumo: la base de vite (vivía en la raíz), `three` al `vendor/`, y **tres
enlaces muertos** que el propio traslado destapó —uno de ellos,
`croupier_frogger_m30`, con marca de Konami y apuntando a un fichero que ya sólo
existe como `croupier_peaton_m30`—. Preservar una página no me obliga a
republicar una infracción.

De propina, mi `LEEME.md` explicando qué marca quitamos hizo saltar el detector
de marcas. Es el mismo matiz que ya había documentado en `renombrar_marcas.py` y
que a `preflight.py` le faltaba: **nombrar una marca para contar que la has
retirado no es usarla**. Corregido.
