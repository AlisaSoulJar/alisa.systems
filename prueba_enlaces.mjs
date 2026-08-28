/**
 * prueba_enlaces.mjs — ¿lleva a algún sitio todo lo que el sitio enlaza?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_enlaces.mjs      → 0 bien · 1 hay rotos · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * El 28-08 saqué del paquete cuatro respaldos fechados —459 KB que nadie
 * enlazaba— y estuve a punto de sacar `legacy/` con ellos. No lo hice porque leí
 * a tiempo que ocho de esas diez SÍ están enlazadas desde `lab.html`.
 *
 * Si me hubiera equivocado, el sitio habría salido con ocho enlaces a páginas que
 * ya no viajan. Y ése es el fallo interesante: **no habría dado error en ningún
 * sitio.** El paquete se construye, `preflight` aprueba, el despliegue sube, y lo
 * roto sólo aparece cuando alguien pincha.
 *
 * Esta comprobación es la mitad que faltaba de la regla que nos pusimos:
 *
 *     si no se enlaza, no se publica   ← lo mira `empaquetar.py`
 *     si se enlaza, se publica         ← lo mira esto
 *
 * QUÉ MIDE
 *
 * Recorre el PAQUETE —no `public/`, que es el taller— y comprueba que cada enlace
 * interno de cada página apunte a un fichero que también viajó. Se mide sobre
 * `dist_publico` a propósito: es lo que ve un visitante, y la diferencia entre
 * los dos es exactamente donde vive este fallo.
 *
 * ⚠️ CONTROL POSITIVO. Un recorrido que no encuentra enlaces aprueba siempre. Se
 * exige un mínimo de páginas y de enlaces comprobados; por debajo, sale 2.
 *
 * ⚠️ Y NO SE COMPRUEBAN LOS ENLACES DE FUERA. Una URL a otro dominio puede caerse
 * mañana y eso no lo arregla una prueba: haría que la suite dependiera de la red
 * y fallara por motivos ajenos, que es como se aprende a ignorar el rojo.
 *
 * ⚠️ SIN SABOTAJE DECLARADO, Y CON MOTIVO — NO ES UN OLVIDO.
 *
 * Lo comprobé A MANO y funciona: devolver `legacy` a `FUERA_CARPETA` en
 * `empaquetar.py` sube los rotos de 14 a 20 y esto suspende. Ése es exactamente
 * el error que estuve a punto de cometer el 28-08.
 *
 * Pero no se puede declarar en `prueba_de_las_pruebas.mjs` tal como está hoy: el
 * sabotaje toca `empaquetar.py` y esta comprobación mide `dist_publico`, así que
 * haría falta RECONSTRUIR el paquete entre romper y medir, y volver a
 * reconstruirlo después. La meta-prueba sabe restaurar un fichero; no sabe
 * restaurar 72 MB de paquete.
 *
 * Estuve a punto de colar dos campos inventados —`antes` y `despues`— que esa
 * prueba no lee. Habrían sido decoración: dos opciones ignoradas en silencio,
 * que es el mismo pecado que arreglé esta misma tarde en `ArcadeTableRoomFactory`,
 * donde `options` llegaba y no se guardaba. Mejor un hueco dicho que un adorno.
 *
 * Se arregla el día que la meta-prueba sepa correr algo antes y después de medir.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.join(process.cwd(), 'dist_publico');
const MINIMO_PAGINAS = 100;
const MINIMO_ENLACES = 300;

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

async function todos(dir, base = dir, salida = []) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); }
    catch { return salida; }
    for (const e of entradas) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await todos(p, base, salida);
        else salida.push(path.relative(base, p).replace(/\\/g, '/'));
    }
    return salida;
}

const ficheros = await todos(RAIZ);
if (!ficheros.length) {
    console.log(rojo('\nCONTROL POSITIVO FALLIDO: no hay paquete. Corre `python empaquetar.py` antes.\n'));
    process.exit(2);
}
const hay = new Set(ficheros);
const paginas = ficheros.filter((f) => f.endsWith('.html'));

const rotos = [];
let comprobados = 0;

for (const pag of paginas) {
    const texto = await readFile(path.join(RAIZ, pag), 'utf8');
    const hrefs = [...texto.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);

    for (const bruto of hrefs) {
        const limpio = bruto.split('#')[0].split('?')[0].trim();
        if (!limpio) continue;
        // Fuera del sitio, o no es una ruta: no es asunto de esta prueba.
        if (/^(https?:|mailto:|javascript:|data:|blob:|tel:|about:|\/\/)/i.test(limpio)) continue;
        // La raíz es la portada, y `normalize('')` no lo sabe.
        if (limpio === '/' || limpio === '.' || limpio === './') continue;

        /**
         * ⚠️ TRES COSAS QUE PARECEN ENLACES ROTOS Y NO LO SON. LAS TRES ME
         *    ENGAÑARON EN LA PRIMERA VUELTA: 44 «rotos» y casi ninguno lo era.
         *
         * 1. `${...}` — una PLANTILLA dentro de un `<script>`. `href="${e.pagina}"`
         *    no es un enlace: es el código que fabricará uno. Buscar `href=` con
         *    una expresión regular no distingue el HTML del JavaScript que lo
         *    escribe, y ésa es la limitación de medir con texto.
         * 2. `/api/...` — una puerta de Cloudflare Functions. No existe como
         *    fichero y nunca existirá: la sirve `functions/api/*.js`. Pedirle que
         *    esté en el paquete es preguntar por lo que no es.
         * 3. `entrar`, `/escaparate` — rutas SIN extensión. Cloudflare Pages sirve
         *    `escaparate.html` cuando le piden `/escaparate`, así que el enlace
         *    está bien y quien estaba mal era yo, exigiendo el `.html`.
         *
         * Es la tercera vez esta noche que el instrumento acusa al mundo. Se
         * apunta aquí para que el siguiente no repita la vuelta.
         */
        if (limpio.includes('${') || limpio.includes('{{')) continue;
        if (/^\/?api\//.test(limpio)) continue;

        const destino = limpio.startsWith('/')
            ? limpio.slice(1)
            : path.posix.normalize(path.posix.join(path.posix.dirname(pag), limpio));
        if (destino.startsWith('..')) continue;   // sale del paquete: no es interno

        comprobados++;
        // Una ruta que acaba en barra es una carpeta: vale su índice. Y una sin
        // extensión vale su `.html`, que es lo que sirve Pages.
        const candidatos = destino.endsWith('/')
            ? [destino + 'index.html']
            : [destino, destino + '.html', destino + '/index.html'];
        if (!candidatos.some((c) => hay.has(c))) rotos.push({ pag, enlace: limpio, destino });
    }
}

console.log(`\n¿Lleva a algún sitio todo lo que el sitio enlaza?\n`);
console.log(`  ${paginas.length} páginas · ${ficheros.length} ficheros en el paquete · ${comprobados} enlaces internos`);

if (paginas.length < MINIMO_PAGINAS || comprobados < MINIMO_ENLACES) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${paginas.length} páginas y ${comprobados} enlaces, `
        + `por debajo del mínimo (${MINIMO_PAGINAS}/${MINIMO_ENLACES}). Un recorrido vacío aprueba solo.\n`));
    process.exit(2);
}

/**
 * ⚠️ UN TECHO, NO UN APROBADO. NACIÓ EN 14 Y EL MISMO DÍA BAJÓ A 5.
 *
 * Los catorce estaban vivos y comprobados en el dominio, no deducidos:
 * `/rooms/room_core_waiting.html`, `/papers/fractal-attention/` y `/css/style.css`
 * daban 404 en `alisa.systems`. Nueve los ofrecía `lab_heritage.html`, que se
 * alcanza desde la portada.
 *
 * Y al mirarlos uno a uno con `git log --diff-filter=D` resultaron ser tres cosas
 * distintas, que es por lo que valía la pena mirarlos:
 *
 *   · TRES eran RUTAS MAL ESCRITAS. `camera_cctv_split_vision.html` existe — en
 *     `legacy/`. Al enlace le faltaba la carpeta. Arregladas.
 *   · TRES se BORRARON A PROPÓSITO en `55a87cf`, «Separa la colonia del motor:
 *     son dos proyectos, no uno». No estaban perdidas: estaban en el otro
 *     proyecto, y la tarjeta prometía algo que decidimos no tener. Fuera.
 *   · DOS no existieron NUNCA, y una existe pero no arranca. Fuera.
 *
 * Quedan cinco: un `.css` que le falta a una página de `legacy` ya declarada
 * rota, un sprite que apunta fuera de `public/`, `/papers/fractal-attention/` que
 * el manifiesto anuncia y no existe, y una hoja de estilos ausente.
 *
 * ⚠️ Y EL TECHO BAJA EN LOS DOS SENTIDOS, QUE ES LO QUE LO HACE ÚTIL.
 *
 * Si arreglas enlaces y no lo bajas, esto SUSPENDE. Me pasó a mí hace un minuto:
 * arreglé nueve, quedaron cinco, y la prueba me obligó a venir aquí. Un límite
 * que se queda por encima de la realidad deja de vigilar sin que nadie se entere
 * — y ésa es la forma en que mueren los trinquetes.
 */
const TECHO = 5;

const porPagina = new Map();
for (const r of rotos) porPagina.set(r.pag, [...(porPagina.get(r.pag) ?? []), r]);
for (const [pag, lista] of porPagina) {
    console.log(`  ${rotos.length > TECHO ? rojo('✗') : gris('·')} ${pag}`);
    for (const r of lista.slice(0, 5)) console.log(gris(`       → ${r.enlace}`));
    if (lista.length > 5) console.log(gris(`       … y ${lista.length - 5} más`));
}

if (rotos.length > TECHO) {
    console.log(rojo(`\n✗ ${rotos.length} enlaces rotos, y el techo está en ${TECHO}. `
        + `Algo que se enlaza dejó de viajar en el paquete.\n`));
    process.exit(1);
}
if (rotos.length < TECHO) {
    console.log(verde(`\n✓ ${rotos.length} rotos, por debajo del techo de ${TECHO}.`));
    console.log(rojo(`  Baja el techo a ${rotos.length} en prueba_enlaces.mjs: un límite `
        + `que va por detrás de la realidad ya no vigila nada.\n`));
    process.exit(1);
}

console.log(gris(`\n  ${comprobados} enlaces internos · ${rotos.length} rotos, justo el techo`));
console.log(verde(`✓ nada de lo que se enlaza se ha caído del paquete\n`));
