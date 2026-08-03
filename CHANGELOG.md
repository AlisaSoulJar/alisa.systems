# Cambios

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versiones: [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

Primera versión pública. Lo de abajo es lo que cambió el 2 de agosto de 2026,
que fue casi todo.

### Añadido
- **Verificador de servidor**: `servidor_verificador.mjs` (Node) y
  `functions/api/verificar.js` (Cloudflare Pages). La puntuación no se envía: se
  recalcula re-simulando la partida con **el mismo fichero de reglas** que juega
  el navegador. 11/11 legítimas aceptadas, 25/25 trampas cazadas, 0–250 ms.
- **`huella.js`** — firma de las reglas. Navegador, Node y Worker publican la
  suya y se comparan: «un solo fichero de reglas» deja de ser una promesa y pasa
  a ser algo que se vigila.
- **Las estaciones declaran su entorno**: 13 de las 24 máquinas de la sala se
  pueden jugar por la puerta numérica (`window.__sala.entornos`), y una partida
  de agente deja el mismo recibo que una persona.
- **`gym/ProtoHubEnv.js`** — adapta las reglas del arcade al contrato de las
  tres puertas. Once juegos jugables por una máquina sin escribir once entornos.
- **`censo.py` → `/inventario.html`** — mide qué es *alcanzable*, no qué es
  bueno, y se publica con los huecos a la vista.
- **`check_secretos.py`** — el `.gitignore` lo daba por hecho desde hacía meses
  y no existía.
- **CI** (`.github/workflows/ci.yml`), `CONTRIBUTING.md`, `SECURITY.md`.
- Capturas en el `README.md`: antes no había **ninguna imagen** en todo el repo.
- 13 arquetipos de esqueleto rescatados de un backup de abril (`skeletons.json`
  pasa de 13 a 26, sin muñones). Entre ellos el `humanoid`, que llevaba meses
  en la lista de pendientes y llevaba meses hecho.

### Cambiado
- **Funciona sin conexión.** `three` (r128, r160, r170) y las nueve tipografías
  viven en `vendor/`. Antes: 92 páginas cargaban `three` de un CDN y 53 pedían
  las fuentes a Google — lo que además filtraba la IP de cada visitante.
- **El paquete pasa de 308 MB a 65 MB.** `empaquetar.py` contaba las fichas
  `*.katamari.json` que viven junto a cada modelo y lo nombran: cada modelo se
  avalaba a sí mismo.
- **Motor y colonia, separados**: 16 módulos que hablaban del hub vivían en
  `soma/`, `psyche/` y `world/`. Ahora están en `extensions/alisa-colony/`.
- Los 15 documentos de la raíz pasan a `docs/`.
- `package.json`: `main` apuntaba a un fichero que **no existía**.
- `npm test` decía «no test specified» en un proyecto cuya tesis es verificar.

### Arreglado
- **5 de los 22 arneses headless estaban rotos** y nadie lo sabía porque nadie
  los ejecutaba: dos con el nombre de clase anterior al renombrado
  `…Engine`→`…System`, dos con código de Node que impedía cargar el módulo en el
  navegador, y uno que no exportaba nada.
- `OrbitalKinematicsSystem` no se veía en ninguna página: su laboratorio llamaba
  a tres métodos que no existen, los tres envueltos en `if(...)`. No fallaba: no
  hacía nada.
- Go, reversi y mancala emitían recibos con «0 puntos» y **el verificador los
  rechazaba siendo legítimos**: `ProtoHubEnv` reimplementaba la normalización de
  puntos en vez de usar la que ya había.
- Marca registrada (`balatro`) en el contenido, y tres enlaces muertos dentro
  del bundle preservado del manifiesto.
- `Spaceship.glb` no existía: sólo las variantes numeradas de una descarga
  repetida.

### Seguridad
- `.gitignore` no ignoraba `node_modules` ni `dist/`: git veía 13.411 ficheros
  y 1,7 GB.
- Archivado `_build_for_cloudflare.ps1`, que borraba `public/` entera con rutas
  anteriores a la reorganización. Se habría publicado.
