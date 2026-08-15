/**
 * legibilidad.mjs — LO QUE EL SUSTRATO DICE QUE EXISTE, ¿SE VE?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Todos los fallos de verdad del 14 y 15 de agosto tienen la MISMA forma, y ninguno
 * lo cazó ninguna prueba:
 *
 *   · el jugador de fagocito era un cubo azul entre muros azules — camuflado;
 *   · la comida de snake salía a veces debajo del panel;
 *   · once de treinta y dos piezas del xiangqi vivían bajo el HUD en vertical;
 *   · las cartas de tu mano en el tute medían 46 px, y hay que leer el palo.
 *
 * Los cuatro los encontré ABRIENDO LA IMAGEN, uno a uno. Eso es trabajo lineal: se
 * acaba cuando se acaban las horas, no cuando se acaban los juegos. Y a ojo se falla
 * — anoche leí «el tablero está debajo del panel» en una captura donde había once
 * piezas detrás, porque el panel es traslúcido.
 *
 * Esto pregunta lo mismo pero por pieza y con números. Tres cosas, y las tres salen
 * de un fallo real:
 *
 *   1. ¿ESTÁ EN PANTALLA?      — xiangqi en vertical
 *   2. ¿ES LO BASTANTE GRANDE? — las cartas de 46 px
 *   3. ¿SE DISTINGUE DEL FONDO? — el jugador de fagocito
 *
 * La tercera es la que ningún instrumento podía ver y la que más cuesta a ojo: se
 * lee el color del píxel donde cae la pieza y se compara con el de alrededor. Un
 * cubo azul sobre azul da una diferencia mínima aunque esté perfectamente dibujado,
 * con su geometría, su material y su sombra. «Está pintado» y «se ve» no son lo
 * mismo, y hasta hoy sólo se medía lo primero.
 *
 * ⚠️ SÓLO MIDE LAS MESAS GENÉRICAS, Y SE DICE.
 *
 * Hacen falta `ALISA_PINTOR` y `ALISA_CAMARA` para saber dónde cae cada pieza. Los
 * visualizadores propios no los exponen y quedan SIN MEDIR — contarlos como limpios
 * sería peor que no mirarlos, que es la lección de `tacto.mjs`.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { leerPNG, colorEn, distanciaColor } from './png.mjs';

const P = 8149;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

/**
 * Las tres formas de `mirar`. La vertical no es un extra: es donde salió el fallo
 * del xiangqi, y donde llegan los avisos de betatester.
 */
const FORMAS = [
    { nombre: 'ancho', width: 1280, height: 720 },
    { nombre: 'móvil', width: 390,  height: 844, movil: true },
];

/**
 * ⚠️ LOS NÚMEROS, Y DE DÓNDE SALE CADA UNO.
 *
 * No los invento: cada uno viene de un caso que ya pasó.
 *
 *   MINIMO_PX — 14 px de lado. Una casilla de flota en un móvil ronda los 20 y se
 *   juega; las cartas del tute medían 46 de ancho por carta y el palo, que ocupa una
 *   esquina, no se leía. 14 es el suelo por debajo del cual ya no hay forma.
 *
 *   MINIMO_CONTRASTE — 32 sobre 255, y sale de DOS casos medidos, uno malo y uno
 *   bueno:
 *
 *     · el jugador de fagocito, `0x2a3550` sobre muros `0x39485c` → 19. Invisible,
 *       lo comprobé abriendo la imagen y no estaba.
 *     · las fichas oscuras de las damas, `0x2a3550` sobre el suelo oscuro
 *       `0x4a5a70` → 37. Se ven perfectamente, también comprobado mirando.
 *
 *   Con 40 —que fue mi primer número, escrito a ojo— las damas salían en rojo. El
 *   umbral tiene que caer ENTRE los dos casos, no donde a uno le parezca.
 */
const MINIMO_PX = 14;
const MINIMO_CONTRASTE = 32;

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

const b = await chromium.launch({ channel: 'chrome', headless: true });
console.log(`\n¿Se ve lo que el sustrato dice que hay?  (${juegos.length} juegos x ${FORMAS.length} formas)\n`);

const filas = [];
for (const juego of juegos) {
  for (const forma of FORMAS) {
    const ctx = await b.newContext({
        viewport: { width: forma.width, height: forma.height },
        hasTouch: !!forma.movil, isMobile: !!forma.movil,
    });
    const p = await ctx.newPage();
    const info = paginas[juego];
    const url = `http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7`
              + (info.pagina === 'mesa.html' ? `&juego=${juego}` : '');
    let r = { medible: false };
    try {
        await p.goto(url, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(4200);
        /**
         * ⚠️ LA PÁGINA DICE DÓNDE ESTÁ CADA PIEZA; LOS COLORES SE LEEN FUERA.
         *
         * La primera versión leía los píxeles copiando el `<canvas>` a uno 2D dentro
         * de la página. Daba contraste CERO en todo, y no porque los juegos estén
         * mal: el renderizador se crea sin `preserveDrawingBuffer`, así que fuera del
         * fotograma el buffer está vacío y `drawImage` devuelve negro. Medido en las
         * damas: 0 píxeles vivos de 9502, brillo medio 0.
         *
         * Así que aquí sólo se calculan POSICIONES —que es lo que la página sabe— y
         * el color se mira en la captura, ya en Node. Y de paso queda dicho que
         * `mirar.mjs` tenía el mismo agujero.
         */
        const posiciones = await p.evaluate(({ W, H }) => {
            const cam = window.ALISA_CAMARA, raiz = window.ALISA_PINTOR?.raiz;
            if (!cam || !raiz) return { medible: false, razon: 'visualizador propio' };
            raiz.updateMatrixWorld(true);

            const panel = document.querySelector('.hud-panel')?.getBoundingClientRect();
            const m = new THREE.Matrix4(), v = new THREE.Vector3();
            const aPantalla = (mat) => {
                v.setFromMatrixPosition(mat).project(cam);
                return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
            };

            const piezas = [];
            raiz.traverse((o) => {
                if (!o.isInstancedMesh || !o.count || !/^p:/.test(o.name || '')) return;
                for (let i = 0; i < o.count; i++) {
                    o.getMatrixAt(i, m);
                    m.premultiply(o.matrixWorld);
                    const pos = new THREE.Matrix4().copy(m);
                    piezas.push({ nombre: o.name, mat: pos, pant: aPantalla(pos) });
                }
            });
            if (!piezas.length) return { medible: false, razon: 'sin piezas' };

            /**
             * ⚠️ EL TAMAÑO DE UNA CASILLA, EXACTO Y NO APROXIMADO.
             *
             * El pintor coloca UNA UNIDAD DE MUNDO POR CASILLA, y la escala del
             * grupo, la perspectiva y la distancia de cámara están todas dentro de
             * `raiz.matrixWorld`. Así que basta proyectar dos puntos separados por
             * una unidad y medir cuánto se separan en pantalla.
             *
             * Los dos intentos anteriores eran aproximaciones y las dos fallaron:
             *
             *   · distancia entre piezas VECINAS — dos piezas seguidas en la lista
             *     no tienen por qué estar en casillas contiguas;
             *   · ancho de la caja entre el número de columnas — la caja incluye la
             *     NIEBLA, que se extiende fuera de la pantalla, y proyectar esquinas
             *     que caen fuera del frustum da basura. En sigilo daba 2 px para un
             *     tablero de 21 columnas en 1280, que son 40 de verdad.
             *
             * Dos puntos y una resta. No hace falta más y no se puede equivocar.
             */
            const u0 = new THREE.Vector3(0, 0, 0).applyMatrix4(raiz.matrixWorld).project(cam);
            const u1 = new THREE.Vector3(1, 0, 0).applyMatrix4(raiz.matrixWorld).project(cam);
            const paso = Math.hypot((u1.x - u0.x) / 2 * W, (u1.y - u0.y) / 2 * H);

            let fuera = 0, tapadas = 0;
            const visibles = [];
            for (const z of piezas) {
                const { x, y } = z.pant;
                if (x < 0 || y < 0 || x > W || y > H) { fuera++; continue; }
                if (panel && x >= panel.left && x <= panel.right
                          && y >= panel.top && y <= panel.bottom) { tapadas++; continue; }
                visibles.push({ nombre: z.nombre, x, y });
            }
            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ EL CAMUFLAJE SE BUSCA EN LOS MATERIALES, NO EN LOS PÍXELES
             * ═══════════════════════════════════════════════════════════════
             *
             * El jugador de fagocito era un cubo `0x2a3550` entre muros `0x39485c`:
             * distancia 26. Perfectamente dibujado, con su geometría y su sombra, e
             * invisible. Ése es el fallo que esta prueba existe para cazar.
             *
             * Lo intenté leyendo píxeles y NO funcionó, dos veces:
             *
             *   · comparando con el vecino más distinto — en 3D siempre hay una cara
             *     iluminada que salva a cualquiera, así que no señalaba al jugador;
             *   · comparando con la mediana del anillo — pasó a señalar 154 bolitas
             *     que se ven perfectamente, porque una bolita de tres píxeles no
             *     tiene un píxel central fiable.
             *
             * El material sí es exacto: el color está declarado, no interpolado, y no
             * depende del suavizado ni de la iluminación. Se compara cada montón de
             * piezas con los del TERRENO —suelo, muro, niebla, madera— porque el
             * fondo contra el que hay que destacar es ése.
             *
             * Se compara por montón y no por pieza: todas las piezas de un montón
             * comparten material, así que son 3 comparaciones y no 561.
             */
            const leerColor = (o) => {
                const c = o?.material?.color;
                return c ? [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)] : null;
            };
            const TERRENO = ['sueloA', 'sueloB', 'muro', 'niebla', 'madera', 'destino'];
            const fondos = [];
            const montonesPieza = [];
            raiz.traverse((o) => {
                if (!o.isMesh || !o.visible) return;
                const col = leerColor(o);
                if (!col) return;
                if (TERRENO.includes(o.name)) fondos.push({ nombre: o.name, col });
                else if (/^p:/.test(o.name || '') && o.count) montonesPieza.push({ nombre: o.name, col });
            });

            const rejilla = window.ALISA_PROTOHUB?.sustrato(window.ALISA_JUEGO)?.rejilla;
            return { medible: true, piezas: piezas.length, paso, fuera, tapadas, visibles,
                     fondos, montonesPieza, cols: rejilla?.ancho ?? null };
        }, { W: forma.width, H: forma.height });

        if (!posiciones.medible) {
            r = posiciones;
        } else {
            // Cada montón de piezas contra cada terreno: si se parece a alguno, está
            // camuflado contra él y se dice contra CUÁL, que es lo que hace falta
            // para arreglarlo.
            const camufladas = [];
            for (const m of (posiciones.montonesPieza ?? [])) {
                for (const f of (posiciones.fondos ?? [])) {
                    const d = distanciaColor(m.col, f.col);
                    if (d !== null && d < MINIMO_CONTRASTE) {
                        camufladas.push(`${m.nombre} sobre ${f.nombre} (${d})`);
                        break;
                    }
                }
            }
            r = { ...posiciones, paso: Math.round(posiciones.paso),
                  pequenas: posiciones.paso < MINIMO_PX,
                  camufladas };
        }
    } catch (e) {
        r = { medible: false, razon: String(e.message).split('\n')[0].slice(0, 40) };
    }
    await ctx.close();

    filas.push({ juego, forma: forma.nombre, ...r });
    if (!r.medible) {
        console.log(`  · ${juego.padEnd(11)} ${forma.nombre.padEnd(5)} sin medir — ${r.razon}`);
        continue;
    }
    const quejas = [];
    if (r.fuera) quejas.push(`${r.fuera} fuera de pantalla`);
    if (r.tapadas) quejas.push(`${r.tapadas} bajo el panel`);
    /**
     * ⚠️ «PEQUEÑA» NO ES SIEMPRE LO MISMO, Y HAY QUE DECIR CUÁL.
     *
     * Fagocito da 9 px de casilla en vertical. No es un encuadre malo: es un
     * laberinto de 28x28 en una pantalla de 390, o sea unos 11 px por casilla haga
     * lo que haga la cámara. Eso no se arregla moviendo nada — se arregla con una
     * cámara que te siga en vez de enseñar el mapa entero, que es otra tarea.
     *
     * Sigilo daba 5 px y ESO sí era arreglable: era mi divisor.
     *
     * Decir sólo «casilla de 9 px» mezcla las dos, y quien lo lea mañana no sabrá si
     * hay algo que tocar. Se dice el ancho del tablero al lado: con eso se ve solo.
     */
    if (r.pequenas) {
        const inevitable = r.cols && (forma.width * 0.85) / r.cols < MINIMO_PX;
        quejas.push(`casilla de ${r.paso} px (mínimo ${MINIMO_PX})`
            + (r.cols ? ` — tablero de ${r.cols} columnas` : '')
            + (inevitable ? ', no cabe más grande en esta pantalla' : ''));
    }
    if (r.camufladas?.length) quejas.push(`camuflaje: ${r.camufladas.join(', ')}`);
    console.log(`  ${quejas.length ? '✗' : '✓'} ${juego.padEnd(11)} ${forma.nombre.padEnd(5)}`
        + ` ${String(r.piezas).padStart(3)} piezas · casilla ${String(r.paso).padStart(3)} px`
        + (quejas.length ? `\n      ↳ ${quejas.join('\n      ↳ ')}` : ''));
  }
}

const med = filas.filter(f => f.medible);
const malas = med.filter(f => f.fuera || f.tapadas || f.pequenas || f.camufladas?.length);
console.log(`\n  ${med.length} medidas · ${filas.length - med.length} sin medir (visualizador propio o sin piezas)`);
console.log(`  ${med.length - malas.length}/${med.length} con todo visible y legible`);
if (malas.length) {
    console.log(`  ✗ ${[...new Set(malas.map(f => f.juego))].join(', ')}`);
}

await b.close();
s.kill();
process.exit(malas.length ? 1 : 0);
