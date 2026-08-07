# Estado: qué falta

Consolidado el 2026-08-07. **Este documento manda sobre los otros siete** — los
demás cuentan el porqué de cada decisión; éste dice dónde estamos.

## Lo medido, hoy

### Juegos — 19

```
reglas · pagina · gym · marcador · casa · asientos   19/19   ✅
compartida                                           13/19   (6 dicen que no, con motivo escrito)
sala                                                 17/19   faltan Snake y Fagocito
tablero3d · raton                                     6/19
lab                                                   7/19
```

### Motor — 179 piezas

```
apagada         120    bibliotecas y plugins que necesitan anfitrión
escena           39    de las cuales: 16 construyen · 19 sin datos · 4 fallan
gym              17    14 entornos + 3 piezas de contrato
sin_exportar      3
```

### Escaparate público — 27 fichas

10 páginas declaradas con `<meta>` · 14 entornos de gym · 3 de contrato.

---

## Lo que falta, por orden de lo que desbloquea

### 1. Mirar 16 piezas · **necesita ojos, no se puede automatizar**
Sabemos cuáles construyen algo (`ChopperFlightFactory` 153 objetos,
`InteractionLabFactory` 58, `DojoEnvironmentFactory` 54, `Pygmalion` 45…). Lo que
ningún script puede decir es **si se entienden solas**. `katamari_swarm` funciona
perfectamente y sigue fuera porque son cucarachas flotando sin contexto.

Se abre cada una en `/labs/pieza.html?m=…`, se mira, y si convence se declara.

### 2. Dar datos a 19 piezas · trabajo de código, medido
Exponen `build`/`init` y no ponen nada porque **les faltan argumentos**. No están
rotas: `CarverEnvironmentFactory` es la prueba —construía una rejilla vacía y con
`demoGrid(24,24)` levanta 1.894 objetos, una calle entera—.

Cada una necesita que alguien lea qué pide y se lo dé. Sospecha razonable: varias
tienen su propio `demoGrid` equivalente esperando a que lo llamen.

### 3. Los 4 fallos concretos
`TerminalUIEngine` (pide `location.protocol`), `ArtDirectionPipeline` y
`AsteroidsEngine` (esperan una escena por otra vía), `AquariumEnvironmentFactory`
(pide un canvas 2D). ⚠️ Ojo: **pueden ser artefactos de mis globales de mentira,
no fallos reales.** Abrir antes de tocar — hoy ya rompí dos páginas sanas por
fiarme de un detector.

### 4. Los 12 `lab` y los 2 `sala`
Nueve de los doce son de cartas y caen casi solos con el croupier. Faltan Snake y
Fagocito en la Sala del Huevo.

### 5. El croupier de cartas
Estado→geometría con `CroupierSystem` y un `montarMesaCartas({juego})`, para que
los siete de bazas tengan mesa 3D sin escribir siete páginas.
Ver [`croupier_por_composicion.md`](croupier_por_composicion.md).

### 6. El grafo de piezas
Generado de los imports, navegable en los dos sentidos. Es lo que convierte una
colección en un motor a ojos de quien mira, y **ya está medido** — falta pintarlo.
Ver [`como_enseniar_el_motor.md`](como_enseniar_el_motor.md).

### 7. La matriz de géneros, con los huecos a la vista
Ahora que sabemos que hay motor para manipulación, cadena trófica, sigilo,
plataformas, escape y tráfico, la matriz saldrá casi llena.
Ver [`inventario_motor.md`](inventario_motor.md).

### 8. Enlazar el escaparate desde la portada
Hoy sólo existe en `/escaparate`. Nadie llega solo.

### 9. La traducción a inglés
Pasada mecánica con `desajustes.mjs` vigilando antes y después. Se puede tocar
todo, esquema del recibo incluido: el dataset actual es de ejemplo.

---

## Deudas apuntadas que no bloquean

- **Piezas que no se pueden parar.** Varias arrancan un `setInterval` en `init()`
  sin dejar cómo pararlo: en un navegador no se nota, pero impiden correr en lote.
  `clasificar_piezas.mjs` sale con `process.exit(0)` por eso.
- `reversi` y `checkers` sin minimapa (llevan contador de fichas — decisión previa).
- Póker con dos jugadores: pide tocar sus reglas, no la mesa.
- Parejas en tute y spades: hay asientos, no equipos.
- El encuadre de los tableros está medido a 1366×577; convendría comprobarlo a
  varios tamaños y automatizarlo.
- Cloudflare: la llave en uso es la Global API Key; debería ser un token acotado
  a Pages.

## ⚠️ La lección más cara del día, por si se repite

**Cinco detectores míos se equivocaron, y ningún código estaba mal.** Buscar en
el texto sin distinguir código de prosa; anclar un `^` al fichero en vez de a la
línea; asumir una sola convención de importmap habiendo dos. La peor vez actué
sobre el resultado y **rompí dos páginas sanas**.

Regla: **antes de arreglar lo que un script señala, abrir el fichero.** Un
detector equivocado es más peligroso que ninguno, porque invita a actuar.
