/**
 * resolver_three.mjs — que Node entienda `import ... from 'three'`
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs cualquier_cosa.mjs
 *
 * POR QUÉ
 * Las piezas del motor importan `'three'` y `'three/addons/…'` — especificadores
 * desnudos que el navegador resuelve con un `<script type="importmap">`. Node no
 * lee importmaps, así que hasta ahora la única forma de EJECUTARLAS era abrir una
 * pestaña.
 *
 * Eso hacía que la comprobación más valiosa —¿esta pieza construye algo de
 * verdad?— dependiera de un navegador y de alguien mirando. Con esto se puede
 * hacer en `npm test`.
 *
 * ⚠️ NO SE COPIA `three`: SE APUNTA AL QUE YA ESTÁ EN `public/vendor/`.
 * Es el MISMO fichero que carga el navegador. Si se instalara `three` de npm
 * para esto, Node y el navegador podrían estar ejecutando versiones distintas y
 * la prueba dejaría de decir nada sobre lo que ve un usuario.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(AQUI, 'public', 'vendor', 'three-0.160.0');

register('./resolver_three_hook.mjs', pathToFileURL(path.join(AQUI, '/')), {
    data: {
        three: pathToFileURL(path.join(VENDOR, 'build', 'three.module.js')).href,
        addons: pathToFileURL(path.join(VENDOR, 'examples', 'jsm', '/')).href,
    },
});
