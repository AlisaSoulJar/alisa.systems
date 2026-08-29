/**
 * prueba_sonidos.mjs — los sonidos ya no se leen: se oyen
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_sonidos.mjs      → 0 bien · 1 mal · 2 la prueba no vale
 *
 * POR QUÉ EXISTE, ADEMÁS DE `prueba_sonido.mjs`
 *
 * Aquella compara dos listas de NOMBRES: los que el sitio pide contra los que
 * `sfx.js` declara. Y lo dice en su propia cabecera: «`sfx.js` no es un módulo
 * —es una IIFE que toca `document` y `AudioContext`— así que esto lo lee, no lo
 * ejecuta». Un sonido podía estar declarado, tener el nombre correcto y sonar a
 * silencio, y aquello aprobaba.
 *
 * Ahora 53 de los 63 sonidos son RECETAS en `public/data/sonidos.json`, y la
 * síntesis es matemática pura en `soma/audio/sonido.js`. Así que aquí se pueden
 * renderizar de verdad, en Node, sin navegador, y preguntarles lo que importa:
 * ¿suena? ¿satura? ¿dura lo que dice?
 *
 * Las dos pruebas se quedan: aquélla vigila que no falte ningún nombre que
 * alguien pida; ésta, que lo que hay dentro no sea silencio.
 */
import { readFile } from 'node:fs/promises';
import { capasDe, nombresDe, sintetizar, revisarLexico }
    from './public/js/alisa-engine/src/soma/audio/sonido.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const LEX = JSON.parse(await readFile('./public/data/sonidos.json', 'utf8'));

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const conReceta = Object.keys(LEX.sonidos ?? {});
const soloCodigo = LEX.soloCodigo ?? [];

// ── control positivo: sin sonidos, todo lo demás aprueba solo ───────────────
if (conReceta.length < 30) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${conReceta.length} recetas en el léxico. `
        + `Un recorrido casi vacío aprueba siempre.\n`));
    process.exit(2);
}

// ── 1. El léxico se sostiene ────────────────────────────────────────────────
comprobaciones++;
const quejas = revisarLexico(LEX);
if (quejas.length) mal(`el léxico no pasa su propia revisión: ${quejas.slice(0, 4).join('; ')}`);

// ⚠️ Y el revisor sabe decir que no: si aprobara cualquier cosa, lo de arriba
//    sería decorado.
{
    const roto = structuredClone(LEX);
    roto.sonidos[conReceta[0]].capas[0].tipo = 'un_tipo_que_no_existe';
    roto.sonidos[conReceta[0]].capas[0].vol = 9;
    comprobaciones++;
    if (revisarLexico(roto).length < 2) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: revisarLexico aprueba un léxico roto a propósito.\n'));
        process.exit(2);
    }
}

// ── 2. CADA SONIDO SUENA ────────────────────────────────────────────────────
/**
 * ⚠️ SE MIDE LA ENERGÍA, NO QUE EL ARRAY EXISTA.
 *
 * Un `Float32Array` lleno de ceros tiene la longitud correcta, se renderiza sin
 * error y es silencio. Ésa es exactamente la avería que ninguna prueba de nombres
 * puede ver, y por eso lo que se mira es la raíz cuadrática media.
 */
const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
let mudos = 0, saturados = 0;
for (const nombre of conReceta) {
    const capas = capasDe(nombre, LEX);
    comprobaciones++;
    if (!capas) { mal(`«${nombre}» tiene entrada pero no devuelve capas`); continue; }

    const muestras = sintetizar(capas, { muestreo: 22050, rnd });
    comprobaciones += 3;

    if (!muestras.length) { mal(`«${nombre}» renderiza cero muestras`); continue; }

    let suma = 0, pico = 0;
    for (const x of muestras) {
        if (!Number.isFinite(x)) { mal(`«${nombre}» produce muestras que no son números`); break; }
        suma += x * x;
        pico = Math.max(pico, Math.abs(x));
    }
    const rms = Math.sqrt(suma / muestras.length);

    if (rms < 0.005) { mudos++; mal(`«${nombre}» es prácticamente silencio (rms ${rms.toFixed(4)})`); }
    if (pico >= 0.999) saturados++;

    // La duración que dice la receta es la que sale.
    const dur = Math.max(...capas.map((c) => Number(c.dur) || 0));
    const durReal = muestras.length / 22050;
    if (Math.abs(durReal - dur) > 0.01) {
        mal(`«${nombre}» dice durar ${dur}s y dura ${durReal.toFixed(3)}s`);
    }
}

// ── 3. Sonidos distintos suenan distinto ────────────────────────────────────
/**
 * ⚠️ SI DOS RECETAS DAN LA MISMA ONDA, UNA DE LAS DOS SOBRA — o peor, alguien
 *    copió una entrada y cambió sólo el nombre. Es el mismo control que en las
 *    ocho caras del avatar: compararlas de verdad, no fiarse del nombre.
 */
{
    const huella = (n) => {
        const m = sintetizar(capasDe(n, LEX), { muestreo: 8000, rnd });
        let h = 0;
        for (let i = 0; i < m.length; i += 7) h = (h * 31 + Math.round(m[i] * 1000)) | 0;
        return `${m.length}:${h}`;
    };
    const vistos = new Map();
    for (const n of conReceta) {
        comprobaciones++;
        const h = huella(n);
        if (vistos.has(h)) mal(`«${n}» y «${vistos.get(h)}» suenan exactamente igual`);
        else vistos.set(h, n);
    }
}

// ── 4. UNA SOLA FUENTE: sfx.js declara los diez, y ni uno más ───────────────
/**
 * ⚠️ ESTA COMPROBACIÓN CAMBIÓ AL SALDAR LA DEUDA, Y AHORA ES MÁS FUERTE.
 *
 * Antes `sfx.js` tenía sus propias copias de los sesenta y tres, así que esto
 * sólo podía vigilar que las dos listas no se separaran: había dos fuentes y lo
 * único que cabía era que estuvieran de acuerdo.
 *
 * Ya no. `sfx.js` monta los 53 desde el léxico y se queda únicamente con los diez
 * que son código de verdad. Así que la invariante buena es exacta: **lo que
 * declara `sfx.js` tiene que ser EXACTAMENTE `soloCodigo`**.
 *
 * Y eso caza algo que la versión anterior no podía: alguien que escriba un sonido
 * nuevo a mano en `sfx.js` en vez de como receta. Sonaría plano en el arcade y el
 * mundo 3D se quedaría sin él, en silencio — que es la avería que había.
 */
{
    const sfx = await readFile('./public/js/sfx.js', 'utf8');
    const cuerpo = sfx.match(/const sounds = \{([\s\S]*?)\n {4}\};/)?.[1] ?? '';
    const declarados = new Set([...cuerpo.matchAll(/\n {8}(\w+)\(\)/g)].map((m) => m[1]));
    const codigo = new Set(soloCodigo);

    comprobaciones += 3;
    if (!declarados.size) mal('no encuentro ningún sonido en sfx.js: la lectura falla');
    const deMas = [...declarados].filter((n) => !codigo.has(n));
    const deMenos = [...codigo].filter((n) => !declarados.has(n));
    if (deMas.length) {
        mal(`escritos a mano en sfx.js y no declarados en soloCodigo: ${deMas.join(', ')} `
            + `— o son recetas, o hay que declararlos`);
    }
    if (deMenos.length) mal(`declarados en soloCodigo y ausentes de sfx.js: ${deMenos.join(', ')}`);

    // Y que el cargador siga ahí: sin él, los 53 no llegan y nadie se entera.
    comprobaciones++;
    if (!/fetch\(['"]\/data\/sonidos\.json['"]\)/.test(sfx)) {
        mal('sfx.js ya no pide el léxico: los 53 sonidos de receta no llegarían');
    }
}

// ── 5. LOS MAPAS DE SONIDO DE LOS JUEGOS NOMBRAN SONIDOS QUE EXISTEN ────────
/**
 * ⚠️ UN NOMBRE MAL ESCRITO EN UN MAPA ES SILENCIO, Y ES LA MISMA ENFERMEDAD.
 *
 * Un juego puede declarar `sonidos: { jugada: { bomba: 'tick' } }` en su
 * sustrato. Si escribe `'tik'`, `SFX.play` no lo encuentra y esa jugada enmudece
 * — sin error, igual que antes. La única defensa es la de siempre: comparar la
 * lista que los juegos PIDEN contra la que el catálogo TIENE.
 *
 * Y también se mira que la jugada exista: mapear un sonido a `sltar` cuando la
 * jugada se llama `saltar` deja el sonido genérico para siempre y nadie lo nota,
 * porque suena algo.
 */
{
    const { REGLAS, cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
    const catalogo = new Set(nombresDe(LEX));
    const comun = LEX.jugadas ?? null;
    let conMapa = 0, mapeadas = 0, conVoz = 0;
    const alGenerico = [];

    /**
     * ⚠️ LA TABLA COMPARTIDA DE VERBOS, QUE ES LO QUE LE DA VOZ A TREINTA JUEGOS.
     *
     * Un juego puede declarar su mapa, pero casi ninguno lo hace y casi ninguno
     * lo necesita: 36 de los 41 usan verbos —`nueva`, `tirar`, `descartar`,
     * `arriba`— y muchos los comparten. La tabla vive en `sonidos.json` y un
     * nombre mal escrito ahí enmudece esa clase de jugada en TODOS a la vez.
     */
    comprobaciones++;
    if (!comun) {
        mal('el léxico ya no trae la tabla `jugadas`: los juegos con verbo volverían al genérico');
    }
    for (const [verbo, sonido] of Object.entries(comun ?? {})) {
        comprobaciones++;
        if (sonido !== null && !catalogo.has(sonido)) {
            mal(`la tabla de jugadas manda «${verbo}» a «${sonido}», que no está en el catálogo`);
        }
    }

    /**
     * La misma regla que `public/arcade/js/sonido_mesa.js`, copiada a propósito:
     * aquél es un script clásico del arcade y no se puede importar desde Node.
     * Lo que sí se puede es medir la CONSECUENCIA —cuántos juegos acaban con voz
     * propia— y ponerle techo, que es lo que hace el apartado 6.
     */
    const verboDe = (n) => {
        const i = n.indexOf(':');
        if (i > 0) return n.slice(0, i);
        const j = n.indexOf(' ');
        return j > 0 ? n.slice(0, j) : n;
    };
    const resuelve = (tablas, n) => {
        for (const t of tablas) {
            if (!t) continue;
            if (Object.hasOwn(t, n)) return true;
            if (Object.hasOwn(t, verboDe(n))) return true;
        }
        return false;
    };

    for (const juego of Object.keys(REGLAS)) {
        let reglas;
        try { reglas = await cargarReglas(juego); } catch { continue; }
        if (typeof reglas?.sustrato !== 'function') continue;

        let sus;
        try { sus = reglas.sustrato(reglas.nuevaPartida({ seed: 1, semilla: 1 }), 0); } catch { continue; }
        const mapa = sus?.sonidos?.jugada;

        // ── 6. ¿ACABA ESTE JUEGO CON VOZ PROPIA, O CON EL GENÉRICO DE SIEMPRE? ──
        {
            const suyas = new Set();
            try {
                const p = reglas.nuevaPartida({ seed: 7, semilla: 7 });
                for (let i = 0; i < 40; i++) {
                    for (const m of reglas.estado(p).legal_moves ?? []) suyas.add(String(m));
                    const m = reglas.sugerencia?.(p);
                    if (!m || !reglas.mover(p, m)) break;
                }
            } catch { /* lo que se haya visto ya vale */ }
            comprobaciones++;
            if ([...suyas].some((m) => resuelve([mapa, comun], m))) conVoz++;
            else alGenerico.push(juego);
        }

        if (!mapa) continue;
        conMapa++;

        /**
         * ⚠️ LAS LEGALES DEL PRIMER TURNO NO SON LAS JUGADAS DEL JUEGO, Y ESTO
         *    ACUSÓ A `mecha` DE MAPEAR JUGADAS INVENTADAS.
         *
         * Comparé contra `legal_moves` de la posición inicial y saltaron `arriba` e
         * `izquierda`. Son jugadas suyas perfectamente: lo que pasa es que el
         * jugador empieza en una esquina y ahí las dos dan a la pared.
         *
         * Así que se juega un rato y se acumula todo lo que llega a ser legal. Es
         * una aproximación —una jugada rarísima puede no salir en sesenta— y por
         * eso el aviso dice «no la he visto», que es lo que de verdad sé, y no «no
         * existe», que es más de lo que puedo afirmar.
         */
        const legales = new Set();
        try {
            const p = reglas.nuevaPartida({ seed: 1, semilla: 1 });
            for (let i = 0; i < 60; i++) {
                for (const m of reglas.estado(p).legal_moves ?? []) legales.add(m);
                const m = reglas.sugerencia?.(p);
                if (!m || !reglas.mover(p, m)) break;
            }
        } catch { /* si no se puede jugar, no se comprueba: no es asunto de esto */ }
        for (const [jugada, sonido] of Object.entries(mapa)) {
            comprobaciones += 2;
            mapeadas++;
            if (sonido !== null && !catalogo.has(sonido)) {
                mal(`«${juego}» mapea la jugada «${jugada}» a «${sonido}», que no está en el catálogo`);
            }
            // Las jugadas legales cambian con la partida, así que sólo se avisa si
            // el nombre no se parece a ninguna de las de la posición inicial.
            if (legales.size && !legales.has(jugada) && !/^(esperar|pasar|rendirse)$/.test(jugada)) {
                mal(`«${juego}» mapea «${jugada}», y no la he visto legal en sesenta jugadas `
                    + `(legales al empezar: ${[...legales].slice(0, 6).join(', ')})`);
            }
        }
    }
    /**
     * ⚠️ TECHO QUE FALLA EN LAS DOS DIRECCIONES.
     *
     * Si alguien renombra `nueva` o `tirar` en un juego, o le quita una entrada a
     * la tabla, la cuenta baja y esto se pone rojo — que es la avería silenciosa
     * de siempre: nada falla, el juego suena, sólo suena a menos.
     *
     * Y si sube, también, para que el número se actualice a mano y no se quede
     * mintiendo hacia abajo. Los que caen al genérico son los de coordenadas
     * puras —ajedrez, damas, reversi, xiangqi, mancala— y ahí es lo correcto.
     */
    const SUELO = 30;
    comprobaciones++;
    if (conVoz < SUELO) {
        mal(`sólo ${conVoz} juegos tienen sonido propio de jugada, y había ${SUELO}. `
            + `Al genérico: ${alGenerico.join(', ')}`);
    } else if (conVoz > SUELO) {
        mal(`ahora son ${conVoz} juegos con sonido propio y aquí pone ${SUELO}. `
            + `Sube el número: un techo que no se actualiza deja de medir.`);
    }
    console.log(gris(`  ${conMapa} juego(s) declaran mapa propio · ${mapeadas} jugadas mapeadas · `
        + `${Object.keys(comun ?? {}).length} verbos compartidos`));
    console.log(gris(`  ${conVoz} juegos suenan por jugada · ${alGenerico.length} al genérico `
        + `(${alGenerico.join(', ')})`));
}

// ── 7. LAS DOS VISTAS DEL ARCADE SUENAN, NO SÓLO LA QUE TIENE `backend` ─────
/**
 * ⚠️ ESTA COMPROBACIÓN NACE DE UNA FRASE MÍA QUE ERA FALSA.
 *
 * La cabecera de `sonido_mesa.js` decía que envolviendo el `backend` de los dos
 * motores clásicos «pasa TODA jugada de los cuarenta juegos». Medido en Chrome
 * el 29-08-2026, con `mecha` delante: los 20 juegos CON visualizador propio
 * pasan por un backend; los otros 21 salen con la vista genérica —
 * `mesa_tablero.mjs`—, que llama a `hub.move` sin backend ninguno. Esos 21
 * —mecha, sokoban, go, reversi, xiangqi, damas y quince más— NUNCA sonaron al
 * jugar, y nadie lo notó porque un juego mudo se oye igual que uno con el
 * volumen bajo.
 *
 * La frase describía el DISEÑO y yo la leí como una MEDIDA. Es la avería de esta
 * casa: creerse el papel en vez de mirar el recibo.
 *
 * Se comprueba en el texto y no jugando porque estos dos ficheros son del
 * navegador —tocan `window`, `document` y `AudioContext`— y aquí no hay ninguno.
 * Lo que se puede exigir desde Node es que el cable siga puesto: cada sitio que
 * MANDA una jugada tiene que pedir el sonido.
 */
{
    const sonMesa = await readFile('./public/arcade/js/sonido_mesa.js', 'utf8');
    const vista = await readFile('./public/arcade/js/mesa_tablero.mjs', 'utf8');

    comprobaciones += 2;
    for (const n of ['sonarJugada', 'sonarFinDePartida']) {
        if (!new RegExp(`window\\.${n}\\s*=`).test(sonMesa)) {
            mal(`sonido_mesa.js ya no ofrece \`window.${n}\`: la vista genérica se queda muda`);
        }
    }

    // Una sola regla: `conSonidoDeMesa` tiene que USAR la que expone, no llevar
    // su propia copia. Dos copias de «qué sonido toca» es la deuda de siempre.
    comprobaciones++;
    if (!/window\.sonarJugada\(/.test(sonMesa)) {
        mal('conSonidoDeMesa ya no llama a `sonarJugada`: hay dos reglas donde había una');
    }

    // Y cada `enviar:` de la vista genérica —hay uno para la mesa local y otro
    // para la sala compartida— tiene que sonar. Se cuentan: si aparece un tercer
    // sitio que manda jugadas y se olvida del sonido, esto lo ve.
    /**
     * ⚠️ SÓLO LÍNEAS DE CÓDIGO. Al escribir la nota que explica este apartado
     *    puse «conté dos `enviar:` y hay tres» dentro de un comentario, y esta
     *    misma comprobación lo contó como un cuarto sitio y suspendió. Contar
     *    sobre el fichero entero es contar también lo que se dice DE él.
     */
    const codigo = vista.split('\n')
        .filter((l) => { const t = l.trim(); return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*'); })
        .join('\n');
    const envios = (codigo.match(/enviar:/g) ?? []).length;
    const suenan = (codigo.match(/sonarJugada\?\.\(/g) ?? []).length;
    comprobaciones += 2;
    if (!envios) mal('no encuentro ningún `enviar:` en mesa_tablero.mjs: la lectura falla');
    else if (suenan < envios) {
        mal(`mesa_tablero.mjs manda jugadas desde ${envios} sitios y sólo ${suenan} suenan: `
            + `los ${21} juegos de la vista genérica se quedarían mudos otra vez`);
    }
    comprobaciones++;
    if (!/sonarFinDePartida\?\.\(/.test(vista)) {
        mal('la vista genérica ya no toca la fanfarria del final');
    }

    /**
     * ⚠️ Y EL CUARTO CAMINO, QUE APARECIÓ DESPUÉS Y ERA UNO SOLO.
     *
     * Escribí «los 20 con backend y los 21 de la vista genérica» y me faltaba uno:
     * `peaton` tiene visualizador propio pero NO monta motor. Habla directamente
     * con el hub y se pinta él solo, así que no sonaba ni decía nada. Lo destapó
     * `prueba_asimetria` mirando los 41 a la vez — sola, esa página parece
     * perfecta.
     *
     * O sea que el reparto real es 19 + 21 + 1, y la lección es la de siempre:
     * una frase sobre el diseño no es una medida.
     */
    const peaton = await readFile('./public/arcade/js/peaton_visualizer.js', 'utf8');
    comprobaciones += 2;
    if (!/sonarJugada\?\.\(/.test(peaton)) mal('peaton_visualizer.js ya no suena al jugar');
    if (!/narrarMesa\?\.\(/.test(peaton)) mal('peaton_visualizer.js ya no cuenta lo que pasa');

    console.log(gris('  los tres caminos del arcade piden sonido: backend (19 juegos), '
        + 'vista genérica (21) y peaton (1)'));
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 150;
console.log(`\n¿Suenan los sonidos, o sólo están declarados?\n`);
console.log(gris(`  ${conReceta.length} recetas · ${soloCodigo.length} que se quedan como código · `
    + `${comprobaciones} comprobaciones`));
console.log(gris(`  renderizados en Node a 22 kHz · ${mudos} mudos · ${saturados} llegan al tope`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${comprobaciones} comprobaciones, mínimo ${MINIMO}.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 12)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 12) console.log(gris(`  … y ${fallos.length - 12} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos de sonido\n`));
    process.exit(1);
}
console.log(verde('✓ las 53 recetas suenan, duran lo que dicen, y ninguna suena como otra\n'));
