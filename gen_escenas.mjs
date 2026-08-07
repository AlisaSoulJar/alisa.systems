/**
 * gen_escenas.mjs — una página de escaparate por cada pieza que construye algo
 * ═══════════════════════════════════════════════════════════════════════════
 *     node gen_escenas.mjs        →  public/labs/escena_*.html
 *
 * POR QUÉ
 * Medido: 16 piezas del motor construyen geometría de verdad y **no tienen
 * página propia**. Ése era su único problema — en el lanzador genérico
 * (`pieza.html?m=…`) se leían como manchas oscuras porque están hechas contando
 * con la iluminación y el post-proceso de una página que nunca tuvieron.
 *
 * ⚠️ SE GENERAN UNA VEZ Y LUEGO SE TOCAN A MANO. Y está bien que sea así.
 * El andamio es idéntico para las dieciséis, así que lo pone el generador. Pero
 * la luz, el encuadre y el bloom de cada pieza son decisiones que hay que ver
 * para acertar — el generador pone un defecto razonable y deja el fichero
 * editable. Por eso NO se regenera en `npm run empaquetar`: machacaría los
 * ajustes hechos con los ojos.
 *
 * ⚠️ Y CADA PÁGINA SE DECLARA PARA EL ESCAPARATE.
 * Lleva su `<meta name="alisa-escaparate">`, así que entra en `/escaparate` por
 * el mismo camino que todo lo demás: declarándose. Nada aparece por olvido.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const LABS = path.join(AQUI, 'public', 'labs');

/**
 * La ficha de cada pieza. Lo único escrito a mano de todo esto, y a propósito:
 * `muestra` es la frase que obliga a preguntarse «¿qué capacidad demuestra
 * esto?». Si no se sabe escribir, la pieza no pertenece al escaparate.
 */
const FICHAS = [
    ['ChopperFlightFactory', 'world/factories/ChopperFlightFactory.js',
     'fisica', 'Vuelo sobre terreno generado: 155 mallas sin un solo asset', 'dia', false, 1],
    ['DojoEnvironmentFactory', 'world/factories/DojoEnvironmentFactory.js',
     'motor/render', 'Un dojo entero de 369×327 construido por código', 'neon', true, 0.8],
    ['BiolabEnvironmentFactory', 'world/factories/BiolabEnvironmentFactory.js',
     'motor/render', 'Laboratorio de neón: cubas, burbujas, LEDs y brazos robóticos procedurales', 'neon', true, 0.7],
    ['LocomotionEnvironmentFactory', 'world/factories/LocomotionEnvironmentFactory.js',
     'fisica', 'Escenario de locomoción con 20 luces para probar caminar', 'estudio', false, 1],
    ['PygmalionEnvironmentFactory', 'extensions/avatar-pipeline/PygmalionEnvironmentFactory.js',
     'avatares', 'El taller donde se generan avatares: 82 mallas y 19 luces', 'estudio', true, 1],
    ['InteractionLabFactory', 'world/factories/InteractionLabFactory.js',
     'motor/render', 'Sala de interacción: objetos con los que un agente puede trastear', 'estudio', false, 1],
    ['CabinetEnvironmentFactory', 'world/factories/CabinetEnvironmentFactory.js',
     'motor/render', 'La cabina del escape room, generada por código', 'neon', true, 1],
    ['ArchetypeEnvironmentFactory', 'world/factories/ArchetypeEnvironmentFactory.js',
     'avatares', 'Arquetipos de cuerpo, uno al lado del otro', 'estudio', false, 1],
    ['MorpheusEnvironmentFactory', 'extensions/avatar-pipeline/MorpheusEnvironmentFactory.js',
     'avatares', 'El banco de pruebas de morfología', 'estudio', false, 1],
    ['ColonialControlRoomFactory', 'world/factories/ColonialControlRoomFactory.js',
     'motor/render', 'Sala de control con pantallas y luces de aviso', 'neon', true, 1],
];

const plantilla = ({ nombre, ruta, categoria, muestra, luz, bloom, distancia }) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALISA — ${nombre}</title>
<meta name="alisa-escaparate" content="${categoria}">
<meta name="alisa-muestra" content="${muestra}">
<script type="importmap">
{ "imports": {
    "three": "/vendor/three-0.160.0/build/three.module.js",
    "three/addons/": "/vendor/three-0.160.0/examples/jsm/",
    "@alisa-engine/": "/js/alisa-engine/"
} }
<\/script>
<style>
  body { margin:0; overflow:hidden; background:#05050a; color:#e2e2f0;
         font:12px/1.7 'JetBrains Mono', ui-monospace, monospace; }
  #ficha { position:absolute; top:0; left:0; z-index:10; padding:16px 18px; max-width:380px;
           background:rgba(8,8,16,.82); backdrop-filter:blur(10px);
           border-right:1px solid rgba(138,43,226,.22); }
  h1 { font-size:12px; letter-spacing:.2em; text-transform:uppercase; margin:0 0 4px; color:#c8b8ff; }
  p { margin:0 0 10px; color:#8a8a9e; font-size:11.5px; }
  code { color:#a180ff; font-size:10.5px; }
  a { color:#a180ff; }
</style>
</head>
<body>
<div id="ficha">
  <h1>${nombre}</h1>
  <p>${muestra}</p>
  <p><code>@alisa-engine/src/${ruta}</code></p>
  <p id="dato"></p>
  <p><a href="/escaparate">← escaparate</a> · <a href="/labs/pieza.html?m=${ruta}">inspeccionar</a></p>
</div>

<!--
  ⚠️ ESTA PÁGINA ES SÓLO SU FICHA, Y ESO ES LO QUE DEMUESTRA.
  Una pieza del motor, una luz, un poco de post-proceso. El andamio entero vive
  en \`labs/js/montarEscena.js\`, igual que las páginas de tablero viven en
  \`arcade/js/montarMesa.js\`. Quien lea esto ve que el motor SE COMPONE — que es
  justo lo que hay que enseñar: con las mismas piezas se arma un juego, un
  gimnasio headless o un banco de pruebas.
-->
<script type="module">
import { montarEscena } from './js/montarEscena.js';
const { mallas } = await montarEscena({
  pieza: '${ruta}',
  luz: '${luz}',
  bloom: ${bloom},
  distancia: ${distancia},
});
document.getElementById('dato').textContent = mallas + ' mallas construidas por código';
<\/script>
</body>
</html>
`;

const yaHay = new Set(await readdir(LABS));
let nuevas = 0, respetadas = 0;
for (const [nombre, ruta, categoria, muestra, luz, bloom, distancia] of FICHAS) {
    const fichero = `escena_${nombre.replace(/Factory$/, '').toLowerCase()}.html`;
    // ⚠️ NO se sobrescribe lo que ya existe: los ajustes de luz y encuadre se
    // hacen mirando, y un generador que los machaca en cada ejecución borra
    // trabajo que no puede rehacer.
    if (yaHay.has(fichero)) { respetadas++; continue; }
    await writeFile(path.join(LABS, fichero),
        plantilla({ nombre, ruta, categoria, muestra, luz, bloom, distancia }), 'utf8');
    console.log(`  nueva  labs/${fichero}`);
    nuevas++;
}
console.log(`\n${nuevas} páginas nuevas · ${respetadas} ya existían y no se tocan\n`);
