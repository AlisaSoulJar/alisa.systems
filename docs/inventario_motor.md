# El almacén, no el escaparate: qué TENEMOS

Corrección de Oscar, 2026-08-07: *«no te fijes sólo en lo que usamos sino en lo
que tenemos; si nos faltan géneros los crearemos»*. Tenía razón — hasta aquí
estaba midiendo el consumo, no el inventario.

## El número

```
MOTOR (sin artefactos de build ni pruebas)   180 módulos · 1.740 KB
nunca enseñados por ninguna página            79 módulos ·   592 KB   → 44 %
```

**Cuarenta y cuatro por ciento del motor no lo ha visto nadie nunca.** Y no son
restos: son sistemas de 20-31 KB con nombre de género propio.

Reparto de lo no enseñado: `systems` 28 · `core` 9 · `factories` 8 · `plugins` 7
· `soma` 6 · `utils` 5 · `morphology` 4 · `envs` 3.

## Géneros que YA tienen motor y no tienen demo

| módulo | KB | qué género abre |
|---|---|---|
| `RoboticArmSystem` | 31 | manipulación / puzzle físico — cinemática inversa |
| `FoodChainSystem` | 30 | simulación de cadena trófica; con `EcosystemSystem` (23) es un god-game |
| `BulletHeavenEngine` | 21 | el motor genérico del género (cucco usa `CuccoGameSystem`, no éste) |
| `TrafficSurvivalSystem` | 20 | supervivencia en tráfico — junto a `IDMSystem` (9,6) |
| `InteractionLabFactory` | 20 | escenarios de interacción tipo aventura |
| `RaccoonEnvironmentFactory` | 18 | plataformas / exploración (+ `RaccoonSpaceCore` 12) |
| `KatamariScaleSystem` | 16 | acumulación por escala — la ley base-3 del proyecto |
| `CorporateSeekerSystem` | 13 | sigilo / persecución |
| `ProceduralTextureFactory` | 13 | texturas sin assets (+ `ProceduralTexture` 17) |
| `PygmalionEngine` | 13 | generación de avatares |
| `CabinetEscapeSystem` | 10 | escape room / puzzle |
| `AsteroidsFactory` | 9 | arcade clásico |
| `BSPSystem` | 8 | generación de mazmorras y edificios |

Y fuera de «género», dos piezas enormes que tampoco se enseñan:
`ProceduralKinematics` (37 KB) y `ProceduralRigging` (71 KB, sí usada pero en una
sola página) — o sea **animación procedural sin assets**, que es de las cosas más
difíciles de tener y de las que mejor se ven.

## ⚠️ La conclusión que cambia el plan

No hay que **crear** géneros para demostrar que el motor los cubre. Hay que
**destapar** los que ya están escritos. La proporción es abrumadora:

- 15 módulos con página que no los invoca bien (ver [`recuento_lab.md`](recuento_lab.md))
- 79 módulos sin página siquiera

Entre esos dos grupos está media biblioteca de géneros: manipulación, cadena
trófica, sigilo, plataformas, escape, tráfico, arcade, mazmorras, texturas
procedurales, animación procedural.

**Crear un género nuevo desde cero, teniendo esto sin abrir, sería empezar la
casa por el tejado.** Primero el lanzador declarativo; después se ve qué falta de
verdad, si es que falta algo.

## ✅ HECHO: el lanzador que no adivina (`/labs/pieza.html?m=…`)

Una página que arranca **cualquier** módulo del motor por URL. Las 79 sin página
ya tienen página.

⚠️ **No adivina mejor: CUENTA lo que encuentra.** Inspecciona lo que el módulo
exporta de verdad —constructor, aridad, métodos, estáticos— e informa en pantalla
de qué probó y qué pasó. Cuando acierta, se ve la pieza. Cuando no, sale un
diagnóstico en vez de una pantalla negra.

### El hallazgo que lo hizo funcionar

Primer intento con `CarverEnvironmentFactory` (59 KB, meses en blanco). El módulo
contestó con un error que era, en realidad, **documentación**:

> «falta `carverGrid { w, h, grid[y][x], elevationGrid[y][x] }` en el constructor.
> Usa `CarverEnvironmentFactory.demoGrid(w, h)` para una de prueba.»

**El módulo llevaba escrito cómo probarlo, con generador de datos de ejemplo
incluido.** Nadie lo leía porque el lanzador viejo se tragaba la excepción detrás
de un `if`. El módulo hablaba y el andamio no escuchaba.

Ahora el lanzador busca esos ayudantes por convención (`demo*`, `sample*`,
`create*`, `make*`) y los usa. Resultado con Carver: **1.894 objetos** — una
calle procedural entera, con farolas y sus charcos de luz, paso de cebra,
papeleras, alcantarillas y bolardos.

### Y el otro desenlace, igual de útil

`FoodChainSystem` (30 KB) no tiene `build` ni `update`. Expone `createPreyState`,
`tickPredator`, `getPreyObservation`… **No es algo que se dibuje: es un entorno
de gym multiagente headless**, presa contra depredador con observaciones.

El informe lo dice —«nadie ha dicho todavía cómo se enciende»— en vez de dejar
una rejilla vacía. Y de paso lo clasifica: esa pieza va al catálogo del gym, no
al escaparate visual.

**Los dos desenlaces son ganancia.** Uno destapa una ciudad; el otro dice qué es
la pieza y dónde va. Lo único que no valía era el silencio.

## El orden que propongo, corregido

1. **Lanzador declarativo** — cada módulo dice cómo se arranca. Desbloquea las 15
   con página rota **y** da camino a las 79 sin página.
2. **Grafo de piezas**, generado de los imports: convierte la colección en motor
   a ojos de quien mira.
3. **Matriz de géneros** con los huecos a la vista — que ahora sabemos que serán
   pocos.
4. **Y sólo entonces**, crear lo que falte de verdad y mejorar los juegos
   existentes con las piezas recién destapadas (los de tablero y cartas están
   bien; lo que les falta es *aprovechar* — texturas procedurales, rigging,
   audio espacial, radar, holograma CSS3D).
