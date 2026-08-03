# Qué se publica y qué no

El motor se publica libre; **ALISA es una aplicación que lo usa**. Este documento
dice dónde está esa frontera, y `check_vanilla_boundary.py` la comprueba.

## Por qué hace falta escribirlo

Al auditar el árbol aparecieron 13 páginas llamando a `http://127.0.0.1:8741`.
La reacción instintiva fue "hay que arreglarlas". **Era la reacción equivocada.**

Mirando qué pedían de verdad:

| página | pide | ¿es un fallo? |
|---|---|---|
| `rooms/room_queen_office` | `/system` | **no** — es el despacho de la Reina |
| `rooms/room_core_waiting` | `/hormones` | **no** — es el estado interno de la colonia |
| `rooms/room_tenshi_no_tamago` | `/health/ready` | **no** |
| `rooms/room_biolab_resurrection` | `sim/stream` | **no** |
| `rooms/room_css3d_monitor_hub` | el panel de la colonia | **no** |
| `labs/croupier_terminal` | telemetría | **no** — es la terminal colonial |
| `labs/croupier_chopper_aquarium` | `/energy/mint` | **no** — acuña $NEURO |
| `labs/croupier_phantom_predator` | `/overworld/navmesh/save` | **no** |
| `labs/croupier_avatar_integration_test` | `/scumm/stream` | **no** |
| `labs/croupier_digital_twin_test` | `/scumm/stream` | **no** |
| `labs/croupier_arista_self` | pasaporte | **no** — soy yo |
| `labs/croupier_el_reparto` | reparto de Beings | **no** |
| `arcade/js/arcade_core.js` | lista de máquinas | **SÍ ERA UN FALLO** ✅ corregido |

Doce de trece **no eran errores**: son contenido de ALISA que necesita ALISA.
Quitarles el hub no los arreglaría, los mataría.

**El único fallo real** estaba en el índice del arcade: marcaba las ocho máquinas
como `offline` a cualquier visitante y sondeaba el hub cada 5 segundos para
siempre — cuando seis de ellas se juegan perfectamente sin nada. Corregido: ahora
salen como `local`, y el hub se sondea una sola vez.

**La lección:** *no todo lo que habla con el hub está roto.* Algunas cosas
simplemente **no son del motor**, y la respuesta no es parchearlas sino no
meterlas en la caja.

---

## ⚠️ CORREGIDO (1 ago 2026): el manifiesto mentía sobre su propio producto

Este documento es del 30 de julio, y decía que **NO se publican `public/rooms/`
ni `lab.html`**. Para entonces era verdad. Hoy no:

- **La Sala del Huevo ES la portada del producto** y vive en `rooms/`.
- **`lab.html` es el índice** al que enlaza la portada y una terminal de la sala.
- Y una terminal apuntaba a `lab_heritage.html`, que sí está excluida: el día de
  publicar habría sido un **404 dentro del escaparate**.

Un manifiesto desactualizado es peor que ninguno: das por bueno el reparto y
publicas con agujeros. Lo que sigue es lo que hay HOY, comprobado estación por
estación (24 de 24 responden).

## Lo que SÍ va en el paquete público

```
public/
  index.html                LA PUERTA — dice en texto qué es esto, sin WebGL
  rooms/room_sala_del_huevo.html   ⭐ el producto: la sala por la que se anda
  motor.html                el motor explicado, dentro del propio sitio
  lab.html                  el índice de las 107 páginas
  research.html             los papers
  games/                    los juegos que se juegan a pantalla completa
  arcade/                   tablero y cartas
    js/protohub/            reglas locales · Verificador · Dataset · Turing
    engines/                el motor de cartas en Python + el banco de pruebas
  labs/                     los laboratorios que NO piden hub (incl. las sondas
                            de WebGPU/TSL, que son la prueba del camino abierto)
  js/alisa-engine/          el motor (menos extensions/alisa-colony/)
  props/  textures/  data/  los assets y los catálogos
LICENSE  README.md  package.json
servir.py                   el servidor sin caché (NO usar http.server)
JUGAR.bat                   arrancar de un clic
check_vanilla_boundary.py   el guardián de esta frontera
atlas.py  que_tenemos.py  mapa_del_sitio.py   las herramientas de recon
```

## Lo que NO va

```
public/rooms/*              TODAS LAS DEMÁS salas: son de la colonia
public/labs/croupier_arista_self.html
public/labs/croupier_terminal.html
public/labs/croupier_el_reparto.html
public/labs/croupier_chopper_aquarium.html
public/labs/croupier_phantom_predator.html
public/labs/croupier_avatar_integration_test.html
public/labs/croupier_digital_twin_test.html
public/lab_heritage.html             copia museo, apunta a cosas que murieron
js/alisa-engine/src/extensions/alisa-colony/
data/beings_passports/               identidades de la colonia
```

Nada de esto está *mal*: simplemente es de ALISA, no del motor.

**Regla que se deriva de esto:** la sala solo puede enlazar a lo que se publica.
Si una estación apunta a algo de la lista de abajo, el escaparate se rompe justo
el día del estreno. Se comprueba entrando y pidiendo las 24 URLs.

## Cómo se comprueba

```bash
python check_vanilla_boundary.py
```

Distingue tres cosas, y la diferencia importa:

- 🔴 **BLOQUEANTE** — el núcleo del motor acoplado. Impide publicar.
- 🟡 **A MOVER** — módulo de colonia fuera de su carpeta. Desorden, no bloqueo.
- ⚪ **MENCIÓN** — la palabra en un comentario. Ruido.

*Este script ya se equivocó una vez: miraba solo `src/` y cantó "publicable" con
el arcade entero llamando al hub. Una auditoría con el alcance mal puesto es peor
que no auditar — te da un aprobado y dejas de mirar.*
