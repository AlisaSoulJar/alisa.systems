# Cómo contribuir

Gracias por mirar. Esto es un motor 3D con un banco de pruebas encima, y tiene
unas cuantas costumbres raras. Están todas por un motivo, y el motivo está
escrito al lado del código.

## Arrancarlo

```bash
git clone https://github.com/AlisaSoulJar/alisa.systems
cd alisa.systems
python servir.py            # http://localhost:8000
```

No hace falta `npm install` para usarlo. **Sí hace falta usar `servir.py`** y no
`python -m http.server`: el segundo no manda cabeceras de caché, así que el
navegador se queda con los `.js` viejos y **no los revalida**. Te enseña una
versión distinta de la que tienes en disco. Se perdieron horas depurando un
fallo que ya estaba arreglado.

## Antes de mandar nada

```bash
npm test          # los 5 entornos nativos + la verificación + preflight
```

`preflight.py` no comprueba «que compile»: comprueba **el argumento del
proyecto**. Si una partida legítima deja de aceptarse, o una trampa deja de
cazarse, o el motor vuelve a acoplarse a la colonia, sale en rojo.

## Las cuatro costumbres

**1. Mira antes de construir.** Este repositorio tiene más cosas hechas de las
que parece, y varias veces hemos reimplementado algo que ya estaba dos carpetas
más allá. Hay herramientas para no repetirlo:

```bash
python censo.py              # qué hay y qué de eso es ALCANZABLE
python atlas.py mapa         # el árbol por estructura, sin buscar por palabra
python atlas.py buscar rueda # buscar por concepto en el índice
```

Y una regla que va con esto: **una búsqueda vacía no prueba que algo no exista.**
Prueba que no acertaste la palabra. Prueba el concepto en castellano y en inglés.

**2. Los recursos se declaran, no se construyen.**

```js
const ROCAS = ['../props/models/Rock_1.glb', /* … */];   // ✅
AssetManager.loadModelAsync(`../props/models/Rock_${i}.glb`);  // ⚠️
```

Una ruta armada en tiempo de ejecución es **invisible** para cualquier
herramienta que lea el código, incluido `empaquetar.py`. Nos costó un juego sin
piedras: el paquete dejó los siete modelos fuera y no hubo un solo error de red
que lo delatara. El empaquetador ya entiende plantillas, pero no dependas de eso.

**3. Nada se borra: se archiva.** Va a `_archivo/`, fuera de `public/`, con una
nota de qué es y por qué se apartó. Un `git clean` ya se llevó por delante
trabajo sin versionar una vez. Y los backups viejos no son basura: de uno
salieron 21 esqueletos anatómicos hechos a mano que llevaban meses ahí.

**4. Comenta el *porqué*, no el *qué*.** El código dice lo que hace. Los
comentarios de aquí cuentan qué se rompió, qué se midió y qué se descartó — que
es lo que no se puede deducir leyendo. Si arreglas algo sutil, deja escrito cómo
se manifestaba.

## Si tocas las reglas de un juego

Las reglas de `arcade/js/protohub/rules/` son **el mismo fichero** que usa el
verificador del servidor. Cambiar una cambia lo que se considera una partida
válida, así que:

- tienen que seguir siendo JavaScript puro (cero `document`, cero `window`, cero
  `THREE`) — es lo que permite que corran en el navegador, en Node y en un
  Worker;
- tienen que seguir siendo deterministas: misma semilla, mismo mundo;
- `npm test` comprueba las dos cosas, y `huella.js` avisa si los dos lados dejan
  de jugar al mismo juego.

## Estilo

Comentarios y nombres **en castellano** en el código nuevo; el código heredado
está en inglés y no se traduce por traducir. Sin dependencias en tiempo de
ejecución: si algo necesita una librería, probablemente se puede hacer sin ella.
