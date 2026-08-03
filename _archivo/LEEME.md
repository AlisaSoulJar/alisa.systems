# El archivo

Aquí no hay nada roto ni nada que sobre: hay cosas **fuera del camino**.

Regla de la casa, dicha por Oscar el 2 de agosto de 2026: *«no destruyas nada,
guárdalo en archive por ejemplo»*. Y tiene el motivo escrito en la piel — un
`git clean` se llevó por delante trabajo sin versionar y no hubo forma de
recuperarlo. Lo que no viaja en el paquete se aparta, no se borra.

Esta carpeta vive **fuera de `public/`**, así que `empaquetar.py` no la publica.
Sigue estando en el repositorio, sigue estando en disco, y no ensucia ninguna
medición.

## Qué hay

### `proceduralrigging/`
Dos versiones anteriores de `soma/ProceduralRigging.js`, 104 KB entre las dos:

- `ProceduralRigging_pre_topo.js` (45 KB) — antes del extractor de topología.
- `ProceduralRigging_BACKUP_PERFECT_BACK.js` (59 KB) — el nombre lo dice: alguien
  guardó aquí el día que la espalda quedó *bien*.

La versión viva es `soma/ProceduralRigging.js` (71 KB). Estas dos no las importa
nadie, pero salían en todos los inventarios como «motor sin enchufar» y en el
recuento de peso del paquete. Ese ruido es lo que hace que un inventario se
acabe ignorando.

**Si algún día el rigging se tuerce**, la comparación con estas dos es el
diagnóstico más rápido que hay: enseñan qué se cambió y en qué orden.
