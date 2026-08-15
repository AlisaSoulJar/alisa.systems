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
import { leerPNG, colorEn, distanciaColor, distanciaSinTono } from './png.mjs';

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
        const posiciones = await p.evaluate(({ W, H, MINIMO_CONTRASTE }) => {
            const cam = window.ALISA_CAMARA, raiz = window.ALISA_PINTOR?.raiz;

            /**
             * ═══════════════════════════════════════════════════════════════
             *  LOS VISUALIZADORES PROPIOS: SIN SUSTRATO, PERO NO SIN MEDIDA
             * ═══════════════════════════════════════════════════════════════
             *
             * Quince juegos dibujan su escena a mano —snake, ajedrez, mancala, el
             * go…— y ahí no hay `ALISA_PINTOR`: nadie sabe qué malla es «el jugador».
             * Eran cuarenta de las setenta medidas, o sea media arcade sin red.
             *
             * No hace falta saber QUIÉN es cada malla para contestar la pregunta que
             * importa: **¿hay algo pegado a otra cosa de su mismo color?** Eso es el
             * camuflaje, sin necesidad de nombres.
             *
             * ⚠️ Y SÓLO ENTRE VECINAS EN PANTALLA, QUE ES LA DIFERENCIA.
             *
             * Comparar todos los materiales contra todos daría una lista enorme de
             * parejas que nunca se tocan — ruido, y una comprobación que chilla
             * siempre se acaba ignorando. Dos cosas del mismo color a media pantalla
             * de distancia no se confunden; pegadas, sí.
             */
            /**
             * ═══════════════════════════════════════════════════════════════
             *  LAS MESAS DE CARTAS: TU MANO TIENE QUE PODER LEERSE
             * ═══════════════════════════════════════════════════════════════
             *
             * Aquí no hay piezas en una rejilla: hay CARTAS en zonas. Y la pregunta
             * cambia de forma pero no de fondo — de una carta hay que leer el rango
             * Y EL PALO, que en el tute decide si puedes tirarla.
             *
             * Esto existe porque ese fallo ya pasó: las cartas de tu mano medían 46
             * px de ancho y el palo, que va en una esquina, no se distinguía. Lo
             * encontré porque un betatester preguntó si teníamos baraja española.
             * Sin esta medida, el día que alguien toque la cámara vuelve a pasar y
             * nadie se entera hasta el siguiente aviso.
             *
             * ⚠️ SÓLO SE MIDE `mano_0_`, QUE ES LA TUYA.
             *
             * Las de los rivales están boca abajo: de ellas sólo hace falta saber
             * cuántas hay, y eso se cuenta igual con el borde cortado. Exigirles el
             * mismo tamaño obligaría a alejar la cámara y dejaría la tuya pequeña,
             * que es exactamente el fallo que se vino a arreglar.
             */
            const mesaCartas = window.ALISA_MESA;
            if (!cam && mesaCartas?.scene && mesaCartas?.camera) {
                mesaCartas.scene.updateMatrixWorld(true);
                const panelC = document.querySelector('.hud-panel')?.getBoundingClientRect();
                const v2 = new THREE.Vector3();
                const mias = [];
                mesaCartas.scene.traverse((o) => {
                    if (!o.isMesh || !o.visible) return;
                    if (!String(o.userData?.zona ?? '').startsWith('mano_0_')) return;
                    v2.setFromMatrixPosition(o.matrixWorld).project(mesaCartas.camera);
                    mias.push({ x: (v2.x + 1) / 2 * W, y: (1 - v2.y) / 2 * H });
                });
                /**
                 * ⚠️ SIN MANO NO SE ABANDONA: SE SIGUE POR EL OTRO CAMINO.
                 *
                 * Entropy reparte en CAJA, no en mano, y hay juegos de cartas sin
                 * mano ninguna. La primera versión devolvía «sin cartas en mano» y
                 * ahí se acababa la medida — la cobertura BAJÓ de 54 a 50 al añadir
                 * esta rama, o sea que una mejora quitó red en vez de ponerla.
                 *
                 * Se sale del `if` y cae en la comprobación de escena, que sí sabe
                 * mirar cualquier montón de mallas. Menos preciso, pero mide.
                 */
                if (mias.length >= 1) {

                let fueraC = 0, tapadasC = 0;
                for (const c of mias) {
                    if (c.x < 0 || c.y < 0 || c.x > W || c.y > H) { fueraC++; continue; }
                    if (panelC && c.x >= panelC.left && c.x <= panelC.right
                               && c.y >= panelC.top && c.y <= panelC.bottom) tapadasC++;
                }
                // El ancho de una carta en pantalla: la separación entre vecinas del
                // abanico. Con una sola carta no hay separación que medir y se dice.
                let ancho = null;
                if (mias.length > 1) {
                    const xs = mias.map(c => c.x).sort((a, b2) => a - b2);
                    const huecos = [];
                    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 0.5) huecos.push(xs[i] - xs[i - 1]);
                    if (huecos.length) huecos.sort((a, b2) => a - b2), ancho = huecos[Math.floor(huecos.length / 2)];
                }
                return { medible: true, cartas: true, mano: mias.length,
                         fuera: fueraC, tapadas: tapadasC, anchoCarta: ancho };
                }
            }

            if (!cam || !raiz) {
                const motor = window.ALISA_MOTOR;
                if (!motor?.scene || !motor?.camera) return { medible: false, razon: 'sin motor' };
                motor.scene.updateMatrixWorld(true);

                const v = new THREE.Vector3();
                const cosas = [];
                motor.scene.traverse((o) => {
                    if (!o.isMesh || !o.visible || !o.material?.color) return;
                    if (cosas.length > 400) return;                 // tope de cortesía
                    v.setFromMatrixPosition(o.matrixWorld).project(motor.camera);
                    const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
                    if (x < -50 || y < -50 || x > W + 50 || y > H + 50) return;
                    const c = o.material.color;
                    cosas.push({
                        x, y, col: [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)],
                        geo: o.geometry?.type ?? '?',
                        nombre: o.name || o.geometry?.type || 'malla',
                    });
                });
                if (cosas.length < 2) return { medible: false, razon: 'escena sin mallas' };

                // «Pegadas» es relativo al tamaño de las cosas: se toma la distancia
                // típica entre vecinas y se comparan las que estén por debajo.
                const cerca = Math.max(30, Math.min(W, H) / 12);
                const parejas = new Map();
                for (let i = 0; i < cosas.length; i++) {
                    for (let j = i + 1; j < cosas.length; j++) {
                        const a = cosas[i], b2 = cosas[j];
                        if (Math.hypot(a.x - b2.x, a.y - b2.y) > cerca) continue;
                        /**
                         * ⚠️ SÓLO ENTRE COSAS DE DISTINTA CLASE.
                         *
                         * Mancala salía marcado por `SphereGeometry ~ SphereGeometry`
                         * a 11 de distancia: dos semillas de tono ligeramente
                         * distinto, una al lado de otra. Y eso es lo NORMAL — son
                         * todas semillas, y que se parezcan entre ellas no estorba a
                         * nadie. Lo que estorba es que una FICHA se parezca a la
                         * CASILLA, o una pieza al tablero.
                         *
                         * El tipo de geometría es un indicio barato de «clase de
                         * cosa»: un cilindro no es un cubo. No es perfecto, y por eso
                         * esto informa de parejas concretas en vez de dar una nota.
                         */
                        if (a.geo === b2.geo) continue;
                        const d = Math.max(Math.abs(a.col[0] - b2.col[0]),
                                           Math.abs(a.col[1] - b2.col[1]),
                                           Math.abs(a.col[2] - b2.col[2]));
                        if (d === 0) continue;      // el mismo material: no es choque
                        if (d >= MINIMO_CONTRASTE) continue;
                        /**
                         * ⚠️ CON LOS COLORES, QUE SI NO NO SE PUEDE ARREGLAR.
                         *
                         * La primera versión decía «BoxGeometry ~ LatheGeometry
                         * (16)». Con eso sé que hay un choque y no sé entre QUÉ: en
                         * el ajedrez hay tres materiales de caja —casilla clara,
                         * casilla oscura y borde— y tres de pieza. Un aviso que
                         * obliga a ir a buscar el par a mano es medio aviso.
                         */
                        const hex = (c) => '#' + c.map(n => n.toString(16).padStart(2, '0')).join('');
                        const clave = [`${a.nombre} ${hex(a.col)}`, `${b2.nombre} ${hex(b2.col)}`]
                            .sort().join(' ~ ');
                        if (!parejas.has(clave)) parejas.set(clave, d);
                    }
                }
                return {
                    medible: true, propio: true, mallas: cosas.length,
                    parejas: [...parejas.entries()].slice(0, 4).map(([k, d]) => `${k} (${d})`),
                };
            }

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
                else if (/^p:/.test(o.name || '') && o.count) {
                    montonesPieza.push({
                        nombre: o.name, col,
                        // La FORMA, para poder preguntar si dos bandos se distinguen
                        // sin depender del tono. El número de vértices basta: un
                        // hexágono y un círculo no coinciden ni por casualidad.
                        forma: o.geometry?.attributes?.position?.count ?? 0,
                        de: (o.name.split(':')[2] ?? '?'),
                    });
                }
            });

            const rejilla = window.ALISA_PROTOHUB?.sustrato(window.ALISA_JUEGO)?.rejilla;
            return { medible: true, piezas: piezas.length, paso, fuera, tapadas, visibles,
                     fondos, montonesPieza, cols: rejilla?.ancho ?? null };
        }, { W: forma.width, H: forma.height, MINIMO_CONTRASTE });

        if (!posiciones.medible) {
            r = posiciones;
        } else if (posiciones.cartas) {
            r = posiciones;
        } else if (posiciones.propio) {
            // Escena dibujada a mano: lo único que se puede afirmar es si hay cosas
            // pegadas del mismo color. Ni tamaño de casilla ni piezas fuera, porque
            // aquí no hay casillas ni sustrato que diga qué es pieza.
            r = { ...posiciones, camufladas: posiciones.parejas };
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
            /**
             * ⚠️ ¿SE DISTINGUEN LOS BANDOS SIN EL TONO?
             *
             * La guía de Board Game Arena lo pone como requisito de accesibilidad y
             * no como extra: color emparejado con forma, símbolo o textura. Una de
             * cada doce personas con cromosoma Y no separa el rojo del verde, y el
             * azul del dueño 0 contra el rojo del dueño 1 —a 150 puntos en RGB, o
             * sea separadísimos— se acercan mucho en esa vista.
             *
             * Así que medir en RGB y darlo por bueno es medir con la vista de quien
             * programa. Aquí se pregunta lo que importa: dos bandos tienen que
             * distinguirse por FORMA, o por un color que sobreviva al daltonismo.
             * Con una de las dos basta; con ninguna, hay alguien que no puede jugar.
             */
            const soloTono = [];
            const piezas = posiciones.montonesPieza ?? [];
            for (let i = 0; i < piezas.length; i++) {
                for (let j = i + 1; j < piezas.length; j++) {
                    const a = piezas[i], b2 = piezas[j];
                    if (a.de === b2.de) continue;              // el mismo bando
                    if (a.forma !== b2.forma) continue;        // la forma ya los separa
                    const d = distanciaSinTono(a.col, b2.col);
                    if (d !== null && d < MINIMO_CONTRASTE) {
                        soloTono.push(`${a.nombre} y ${b2.nombre}: misma forma y ${d} de distancia sin tono`);
                    }
                }
            }

            r = { ...posiciones, paso: Math.round(posiciones.paso),
                  pequenas: posiciones.paso < MINIMO_PX,
                  camufladas, soloTono };
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
    /**
     * ⚠️ DOS LISTAS: LO QUE HAY QUE ARREGLAR Y LO QUE HAY QUE SABER.
     *
     * Un tablero de 28 columnas en un móvil da casillas de 10 px, y una mano de
     * trece cartas no cabe legible en 390 px. Las dos cosas son verdad y ninguna
     * tiene arreglo moviendo la cámara: piden otra interfaz, que es otra tarea.
     *
     * Ponerlas en rojo con lo demás haría que la pasada saliera roja siempre, y una
     * comprobación que siempre está roja se lee igual que una que siempre está
     * verde: no se lee. Se separan y se dicen aparte.
     */
    const quejas = [], avisos = [];
    if (r.fuera) quejas.push(`${r.fuera} fuera de pantalla`);
    if (r.tapadas) quejas.push(`${r.tapadas} bajo el panel`);
    /**
     * ⚠️ UNA CARTA PIDE MÁS QUE UNA CASILLA, Y POR UNA RAZÓN CONCRETA.
     *
     * De una casilla basta ver que hay algo y de qué color. De una carta hay que
     * leer el RANGO y EL PALO, y el palo va en una esquina. Cuando las del tute
     * medían 46 px de ancho el rango se leía y el palo no — y en el tute servir al
     * palo es obligatorio, o sea que faltaba justo el dato que decide la jugada.
     *
     * 60 px es lo que había después de arreglarlo (quedaron en 78) menos un margen.
     */
    if (r.cartas && r.anchoCarta !== null && r.anchoCarta < 60) {
        /**
         * ⚠️ Y CUÁNDO NO CABE, SE DICE, COMO CON FAGOCITO.
         *
         * Trece cartas a 60 px son 780, y una pantalla de móvil tiene 390. No hay
         * cámara que arregle eso: en vertical una mano larga NO se puede leer carta
         * a carta, y la interfaz de verdad ahí son los botones del panel — que
         * `tacto.mjs` verifica que se pueden pulsar TODOS, con dedo y con ratón.
         *
         * Decirlo importa: sin esta frase, quien lo lea mañana se pondrá a mover la
         * cámara buscando un arreglo que no existe. Con ella sabe que lo que falta,
         * si acaso, es otra interfaz — no otro encuadre.
         */
        const inevitable = r.mano * 60 > forma.width * 0.9;
        if (inevitable) {
            // Informativo, no fallo: no hay nada que arreglar y un rojo permanente
            // se acaba ignorando, que es la lección de toda esta tanda.
            avisos.push(`carta de ${Math.round(r.anchoCarta)} px — ${r.mano} cartas no caben`
                + ` legibles en ${forma.width} px, aquí se juega por el panel`);
        } else {
            quejas.push(`carta de ${Math.round(r.anchoCarta)} px de ancho (mínimo 60: hay que leer el palo)`);
        }
    }
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
        const linea = `casilla de ${r.paso} px (mínimo ${MINIMO_PX})`
            + (r.cols ? ` — tablero de ${r.cols} columnas` : '');
        if (inevitable) avisos.push(`${linea}, no cabe más grande en esta pantalla`);
        else quejas.push(linea);
    }
    if (r.camufladas?.length) quejas.push(`camuflaje: ${r.camufladas.join(', ')}`);
    if (r.soloTono?.length) {
        quejas.push(`los bandos SÓLO se distinguen por el tono — ${r.soloTono.join('; ')}`);
    }
    const cuerpo = r.cartas
        ? `${String(r.mano).padStart(3)} en tu mano · carta ${String(r.anchoCarta === null ? '—' : Math.round(r.anchoCarta)).padStart(3)} px`
        : r.propio
        ? `${String(r.mallas).padStart(3)} mallas · escena propia`
        : `${String(r.piezas).padStart(3)} piezas · casilla ${String(r.paso).padStart(3)} px`;
    filas[filas.length - 1].quejas = quejas;
    console.log(`  ${quejas.length ? '✗' : avisos.length ? '·' : '✓'} ${juego.padEnd(11)} ${forma.nombre.padEnd(5)} ${cuerpo}`
        + (quejas.length ? `\n      ↳ ${quejas.join('\n      ↳ ')}` : '')
        + (avisos.length ? `\n      · ${avisos.join('\n      · ')}` : ''));
  }
}

const med = filas.filter(f => f.medible);
// Lo que cuenta como fallo es lo que se ANOTÓ como queja: ahí ya está resuelta la
// diferencia entre «hay que arreglarlo» y «hay que saberlo».
const malas = med.filter(f => f.quejas?.length);
console.log(`\n  ${med.length} medidas · ${filas.length - med.length} sin medir (visualizador propio o sin piezas)`);
console.log(`  ${med.length - malas.length}/${med.length} con todo visible y legible`);
if (malas.length) {
    console.log(`  ✗ ${[...new Set(malas.map(f => f.juego))].join(', ')}`);
}

await b.close();
s.kill();
process.exit(malas.length ? 1 : 0);
