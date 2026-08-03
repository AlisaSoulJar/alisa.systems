# Esto es la primera página de alisa.systems

No es una demo del motor ni un lab: es **lo que había en el dominio antes que
todo lo demás**. El repositorio entero eran dos ficheros, `CNAME` e
`index.html`, y su primer commit se llama literalmente
*«👑 First breath — alisa.systems goes live»*.

Cuando la sala pasó a ocupar la raíz, esta página no se borró. Se guardó aquí,
tal cual estaba publicada —el `dist` de vite, no el fuente— y se enlaza desde la
portada. Nos parece que la primera respiración de algo merece quedarse.

## Lo único que se ha tocado, y por qué

Se preserva el artefacto, no una infracción ni un enlace roto:

| cambio | motivo |
|---|---|
| base de vite `` `/` `` → `` `/manifiesto/` `` | vivía en la raíz; ahora cuelga de aquí, y si no sus trozos daban 404 |
| `croupier_frogger_m30` → `croupier_peaton_m30` | **Frogger es marca de Konami.** Nuestro nombre para esa mecánica es *Peatón* (ver `arcade/renombrar_marcas.py`). Además el fichero ya sólo existe con el nombre nuevo |
| `labs/croupier_math_orbital_shmup` | el enlace estaba muerto porque la página se había ido a `legacy/`. Ya está arreglada y de vuelta en `labs/`, así que el enlace original vuelve a ser el bueno |
| `rooms/room_empty_table_games_node` → `legacy/…` | igual |
| `three` desde CDN → `/vendor/` | como el resto del sitio: funciona sin conexión |

El resto está byte a byte como se publicó.
