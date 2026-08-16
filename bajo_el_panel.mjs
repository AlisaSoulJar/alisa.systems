/**
 * bajo_el_panel.mjs — ¿qué piezas del juego caen debajo del panel del HUD?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run bajo_el_panel            los 35
 *     node bajo_el_panel.mjs snake     uno
 *
 * ⚠️ POR QUÉ EXISTE — DOS CASOS YA MEDIDOS, NO HIPOTÉTICOS
 *
 * En SNAKE la comida se pinta perfectamente y cae en pantalla en (269, 180).
 * El panel ocupa de (20,20) a (340,330). En un juego que va de comer, no se ve
 * qué comer. Y plegar el panel no basta: plegado llega hasta y≈205, x≈340 — la
 * comida sigue en la sombra.
 *
 * En ENTROPY y REMIGIO el montón de descarte cae debajo del panel (x=275 y
 * x=159, con el panel llegando a x=340). En entropy de ahí se ROBA: es la
 * jugada, no un adorno.
 *
 * Los dos se encontraron por casualidad, mirando otra cosa. Nadie le había
 * hecho la pregunta a los 35 juegos, y ésa es la tarea de este instrumento.
 * No arregla nada: sólo contesta, juego por juego, qué cae tapado.
 *
 * ⚠️ EL PROBLEMA GORDO: NO TODOS LOS JUEGOS EXPONEN SU ESCENA POR IGUAL
 *
 * `mesa_tablero.mjs` (los tableros sin visualizador propio: go, reversi,
 * damas, xiangqi, fagocito, sokoban, cripta, flota, defensa, sigilo, frentes,
 * relevo, cabina, rebaño, pradera, nave, parchís, oca, canadiense, generala)
 * publica `window.ALISA_PINTOR` + `window.ALISA_CAMARA`.
 *
 * `SovereignCardEngine`/`SovereignBoardEngine` —las clases detrás de
 * `mesa_cartas.mjs` y de los visualizadores propios de ajedrez, snake,
 * mancala, blackjack y póker— publican `window.ALISA_MOTOR` con `.scene` y
 * `.camera`. Pero PEATÓN no pasa por ninguna de las dos clases: su
 * `peaton_visualizer.js` tiene su propia `scene`/`camera` en variables locales
 * de módulo, sin publicar nada. Adivinar cuál de estos globales mirar juego
 * por juego sería la enésima lista escrita a mano de este proyecto — y se
 * separaría sola el día que llegue el juego 36.
 *
 * ⚠️ LA VÍA QUE CUBRE A LOS 35 SIN SABER NINGUNO: EL PROPIO `render()`
 *
 * Los 35 dibujan con `THREE.WebGLRenderer`, y los 35 llaman a
 * `renderer.render(escena, camara)` en su bucle de animación — es la única
 * forma que tiene THREE de sacar algo a pantalla. Así que en vez de preguntar
 * a cada motor QUÉ publica, se parchea `THREE.WebGLRenderer.prototype.render`
 * ANTES de que cargue el juego (con `page.addInitScript`, que Playwright
 * ejecuta en cada documento nuevo antes que cualquier script de la página) y
 * se graba qué escena y qué cámara le pasaron la primera vez que se llamó.
 * Eso funciona lo mismo si la escena vive en `ALISA_PINTOR`, en
 * `ALISA_MOTOR.scene` o en una variable que nadie exporta — que es
 * exactamente el caso de peatón.
 *
 * Y es la comprobación que MÁS ha costado hoy no hacer al revés: si esto
 * diera cero piezas tapadas en TODOS los juegos, lo más probable no es que
 * estén todos bien — es que el parche no se enganchó a tiempo. Por eso el
 * control de snake, más abajo, es obligatorio y se imprime siempre.
 *
 * ⚠️ QUÉ ES «UNA PIEZA» Y QUÉ ES «EL TABLERO»
 *
 * `escena.traverse()` visita literalmente todo: el suelo, la niebla, las
 * luces, el tablero de 10 unidades de lado. Preguntar si ESO cae bajo el
 * panel es una trivialidad que sale que sí en los 35 —claro que la esquina
 * del tablero está bajo el panel, el tablero ocupa toda la pantalla— y no dice
 * nada útil. Lo que importa es la ficha, la comida, el montón: objetos
 * PEQUEÑOS frente al tablero que los contiene.
 *
 * Se separan por tamaño: el radio de la esfera que envuelve la geometría (en
 * unidades de mundo, con la escala aplicada). Por encima de `UMBRAL_RADIO` es
 * estructura —suelo, tablero, paredes de fondo— y se cuenta aparte sin entrar
 * en la lista. Por debajo es pieza: una ficha, una carta, una casilla de un
 * montón `InstancedMesh` (muros, monedas...), la comida de snake (radio 0,4).
 * El umbral se puso mirando ESE número: la comida mide 0,4 y el suelo de
 * snake mide 20×20 (radio ≈14) — hay hueco de sobra entre los dos para no
 * discutírselo a ningún juego.
 *
 * ⚠️ LAS MANOS RIVALES QUE SE SALEN DE LA PANTALLA A PROPÓSITO
 *
 * `mesa_cartas.mjs` coloca las manos de los rivales fuera del lienzo a
 * propósito —está explicado dos veces en ese fichero—, y eso no es un fallo
 * que este instrumento tenga que señalar. Se resuelve solo: si la proyección
 * de una pieza cae fuera del viewport entero (no sólo fuera del panel), se
 * descarta ANTES de mirar si está bajo el panel. Una pieza fuera de pantalla
 * no puede estar "tapada" por nada — está en otro sitio, a propósito.
 *
 * ⚠️ LO QUE DIO LA PRIMERA PASADA (16-08), Y CÓMO SE LEE — 14 DE 35 NO SON 14 FALLOS
 *
 * Este instrumento cuenta PIEZAS TAPADAS, no gravedad. Distinguir «se ve» de
 * «importa» no lo puede hacer una medida, así que queda aquí escrito lo que dio
 * y lo que resultó ser cada cosa al comprobarla una por una:
 *
 *   GRAVES — algo que hace falta para jugar y no se ve:
 *     snake      la COMIDA (esfera roja de radio 0,4) en (269,180)
 *     entropy    el montón de DESCARTE, que es de donde se roba
 *     remigio    el montón de DESCARTE
 *
 *   POR DISEÑO — tute 5, hearts 7, spades 7, gofish 2, unit 2, todas `mano`:
 *     son SIEMPRE del rival 2, el de la izquierda. Medido aparte, zona por zona:
 *     la mano PROPIA (`mano_0_*`) sale 0/10, 0/13, 0/13, 0/7 y 0/7 — no se tapa
 *     ni una carta de las que hay que leer. Las del rival van boca abajo y de
 *     ellas sólo hace falta contar, y esa cuenta la publica el panel en texto.
 *     Si algún día sale `mano_0_` en esta lista, ESO sí es grave.
 *
 *   DECORADO — flota 16 `niebla`, defensa 5 `sueloA`/`sueloB`, y cabina, rebaño,
 *     pradera y nave con 1-2 `muro` de entre decenas. Ninguno cambia lo que
 *     puedes hacer. No se filtran del informe a propósito: filtrar por nombre
 *     sería la lista escrita a mano que este instrumento existe para no tener,
 *     y el día que un `muro` tapado importe, más vale que salga.
 *
 * ⚠️ Y LO QUE AÑADIÓ LA SEGUNDA MEDIDA (16-08, más tarde) — GRAVES QUE LA
 * PRIMERA PANTALLA NO PODÍA VER:
 *
 *   generala   1 `z0:v0` (el primer dado) en cuanto tiras — el caso que abrió esto,
 *              y sale IGUAL en cada pasada: es el control positivo, más abajo
 *   entropy    vuelve a tapar 1 `descarte_mesa` tras unas jugadas — otra vez de
 *              donde se roba, la cámara sólo lo despejaba al abrir
 *   brisca     2 `baza_mesa` en cuanto cae la primera carta — no salía porque al
 *              abrir la mesa está vacía; tute gana lo mismo (`baza_mesa×1`) además
 *              de su mano rival de siempre
 *
 * Y varios DECORADO de arriba crecen al jugar sin cambiar de categoría: defensa
 * 5→7, cabina 2→4, rebaño 1→3, pradera 1→4, nave 1→3 — más `muro`/`sueloB` a la
 * vista según se mueve la cámara o se reparte más mesa, ninguno cambia lo que se
 * puede hacer.
 *
 * ⚠️ Y ESTOS NÚMEROS DE «TRAS JUGAR» PUEDEN TEMBLAR UNA FICHA DE UNA PASADA A
 * OTRA, Y ESO NO ES EL INSTRUMENTO ROTO.
 *
 * A diferencia de «al abrir» —una foto fija de la misma partida con la misma
 * semilla—, «tras jugar» depende de qué haya hecho el rival (con su propio
 * temporizador, no atado a `SEMILLA`) en el rato que tarda el clic en llegar.
 * Medido dos veces: gofish dio 5 `mano` una vez y 4 la siguiente; remigio dio 1
 * `mano` una vez y 0 la siguiente. Generala y entropy, en cambio, salieron
 * idénticos las dos veces — su hueco no depende de qué responda nadie, sólo de
 * que exista un `tirar` o una carta que jugar. Un número que tiembla de 4 a 5 no
 * es una alarma; que un juego DESAPAREZCA de la lista de golpe sin razón sí lo
 * sería, y para eso está el control positivo.
 *
 * Los números completos, con el momento de cada uno, están en la salida de la
 * pasada; esto es sólo el resumen de qué categoría le tocó a cada uno.
 *
 * ⚠️ HUECO CERRADO (16-08, más tarde): SE MEDÍA SÓLO LA PRIMERA PANTALLA, Y EL
 * PANEL CRECE AL JUGAR
 *
 * El panel es alto o bajo según cuántas jugadas legales haya, y eso cambia con la
 * partida. La GENERALA lo enseña perfectamente: abre con UN botón (`tirar`) y en
 * cuanto tiras tiene quince —anotar:1..6, escalera, full, póker, generala, doble,
 * guardar…—, así que crece y **tapa el primer dado**. Se ve en la captura del
 * 16-08, y la pasada de aquel día decía «generala 0 piezas tapadas», que era
 * verdad al abrir y mentira al segundo turno.
 *
 * Ahora se mide DOS VECES por juego: al abrir (como siempre) y tras jugar unas
 * pocas jugadas pulsando `.mesa-jugada` —el mismo botón que usa `tacto.mjs`, así
 * que es un tacto real, no un truco de este fichero— y se publica la PEOR de las
 * dos, con el momento en que se dio.
 *
 * ⚠️ Y NO BASTA CON MEDIR UNA VEZ AL FINAL DE LA RACHA DE CLICS.
 *
 * El primer intento jugaba N jugadas seguidas y medía sólo al final. En generala
 * eso daba TAMBIÉN cero: un turno entero es `tirar, tirar, tirar, anotar:x`, y
 * `anotar` CIERRA el turno — el panel vuelve a un único botón `tirar` para el
 * siguiente, la misma foto pequeña de siempre. La foto grande vive a MITAD del
 * turno, no al final de él. Así que se mide tras CADA clic —no sólo al final— y
 * se guarda la peor de todas: la propia partida, jugada hasta el final de un
 * turno, borraba el rastro del hueco que se estaba buscando.
 *
 * Un juego sin `.mesa-jugada` que pulsar (avanza solo, o ya terminó) o que tras
 * jugar se queda sin estado medible se queda con la medida de abrir, y eso se
 * DICE — no se cuenta como si la segunda medida hubiera dado cero piezas.
 *
 * ⚠️ EL PANEL SE FUERZA DESPLEGADO: ES EL PEOR CASO, Y EL PRIMERO QUE VE ALGUIEN
 *
 * `document.querySelector('.hud-panel').classList.remove('collapsed')` antes
 * de medir. Con el panel pequeño casi nada quedaría tapado y el instrumento
 * mentiría por omisión; desplegado es como llega la página a quien la abre
 * por primera vez, que es a quien más le importa este informe.
 *
 * ⚠️ REGLA DE LA CASA: MEDIR, NO MIRAR CAPTURAS
 *
 * Esto proyecta con matemática de verdad (`Vector3.project(camara)` + el
 * rectángulo real del `<canvas>`), no adivina por captura de pantalla. Y si
 * un juego no se puede medir —el parche nunca se disparó, no hay `.hud-panel`
 * en la página— se DICE, no se cuenta como cero piezas tapadas: cero tapadas
 * y "no medible" son verdades distintas y confundirlas sería mentir por
 * omisión otra vez.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8956;   // suyo: no pelearse con tacto.mjs (8137) ni laboratorio_mesas.mjs (8123)
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SEMILLA = 7;

const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

const navegador = await chromium.launch({ channel: 'chrome', headless: true });

/**
 * ⚠️ EL PARCHE VA EN `addInitScript`, NO EN UN `page.evaluate` DESPUÉS DE CARGAR.
 *
 * `addInitScript` se reinyecta en CADA documento nuevo de este contexto, antes
 * de que se ejecute un solo script de la página — incluido `three.min.js`, que
 * `montarMesa.js` inserta como `<script>` clásico. Si se parcheara después de
 * `goto()`, el render ya habría corrido varias veces sin testigo. Como `THREE`
 * tarda un par de cargas de script en existir, se sondea con un intervalo
 * corto en vez de asumir que ya está.
 *
 * ⚠️ Y NO SE PARCHEA `WebGLRenderer.prototype.render` — ESO DABA SIEMPRE CERO.
 *
 * El primer intento parcheaba el prototipo, tal como se haría con una clase
 * normal. Medido en snake —el control positivo, más abajo— el parche SÍ se
 * enganchaba (`__alisaParcheado: true`) y aun así `window.__CAPTURA` seguía a
 * `null` después de 4,5 s con `requestAnimationFrame` corriendo a 30 fps sin
 * problema. La causa, mirando `three.min.js` (r128): `WebGLRenderer` NO pone
 * `render` en el prototipo — su constructor hace `this.render = function
 * (escena, camara) {...}` como propiedad PROPIA de cada instancia, un patrón
 * habitual en esa versión de three.js. Una propiedad propia tapa a la del
 * prototipo siempre, así que el parche nunca se llegaba a ejecutar — y el cero
 * en todos los juegos habría sido justo la mentira silenciosa contra la que
 * avisa la regla de la casa.
 *
 * El parche de verdad envuelve el CONSTRUCTOR: se sustituye
 * `THREE.WebGLRenderer` por una función que construye el original y, sobre la
 * INSTANCIA ya creada —donde de verdad vive `render`—, envuelve ese método
 * propio antes de devolverla. Verificado con el mismo control: `rafCount: 30`
 * y ahora `tieneCaptura: true`.
 */
async function conParche(contexto) {
    await contexto.addInitScript(() => {
        window.__CAPTURA = null;
        const engancha = () => {
            if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
            const Original = THREE.WebGLRenderer;
            function Parcheado(...args) {
                const instancia = new Original(...args);
                const renderOriginal = instancia.render.bind(instancia);
                instancia.render = function (escena, camara) {
                    window.__CAPTURA = { escena, camara, renderer: instancia };
                    return renderOriginal(escena, camara);
                };
                return instancia;
            }
            Parcheado.prototype = Original.prototype;
            THREE.WebGLRenderer = Parcheado;
            window.__parcheado = true;
            return true;
        };
        if (!engancha()) {
            const reloj = setInterval(() => { if (engancha()) clearInterval(reloj); }, 20);
            setTimeout(() => clearInterval(reloj), 20000);
        }
    });
    return contexto;
}

/**
 * Lo que se mide DENTRO de la página, una vez cargada y con el panel forzado.
 * Va serializada porque `page.evaluate` no puede cerrar sobre nada de fuera.
 */
async function medir(page) {
    const panelRect = await page.evaluate(() => {
        const panel = document.querySelector('.hud-panel');
        if (!panel) return null;
        panel.classList.remove('collapsed');
        const r = panel.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    if (!panelRect) return { medible: false, motivo: 'la página no tiene `.hud-panel`' };

    // Un respiro tras desplegar: el CSS anima `max-height` 0,35s.
    await page.waitForTimeout(400);

    let datos = await page.evaluate(evaluarEscena, panelRect);
    // Un segundo intento si el parche aún no se disparó — el go (19×19) y
    // juegos con montón grande tardan más en montar su primer fotograma.
    if (!datos.medible) {
        await page.waitForTimeout(2000);
        datos = await page.evaluate(evaluarEscena, panelRect);
    }
    return datos;
}

/**
 * ⚠️ JUEGA UNAS POCAS JUGADAS Y MIDE TRAS CADA UNA — NO SÓLO AL FINAL.
 *
 * Pulsa el primer `.mesa-jugada` que encuentre, hasta `intentos` veces: es el
 * mismo botón y el mismo criterio que usa `tacto.mjs` para su muestra, y no hace
 * falta elegir con más criterio — cualquier jugada legal sirve para que la
 * partida avance y el panel reaccione.
 *
 * Por qué se mide DENTRO del bucle y no una vez al salir: en generala un turno
 * entero es `tirar, tirar, tirar, anotar:x`, y `anotar` CIERRA el turno — el
 * panel vuelve a un único botón para el siguiente. Medir sólo al final de la
 * racha habría vuelto a dar cero, exactamente el mismo hueco que esto viene a
 * cerrar. Midiendo tras cada clic y quedándose con la peor, la foto de en medio
 * del turno —donde están los quince botones— no se pierde aunque la racha
 * termine cerrando uno.
 *
 * Devuelve `{ peor, jugadas }`: `peor` es la medida (medible) con más piezas
 * tapadas de todas las que se tomaron tras jugar, o `null` si no se pudo jugar
 * ninguna o ninguna salió medible. `jugadas` es cuántos clics se llegaron a dar,
 * para poder decir «tras cuántas jugadas» en el informe.
 */
async function jugarYMedirPeor(page, intentos = 4) {
    let peor = null, jugadas = 0;
    for (let i = 0; i < intentos; i++) {
        const botones = page.locator('.mesa-jugada');
        const cuantos = await botones.count().catch(() => 0);
        if (!cuantos) break;   // nada que pulsar: el juego avanza solo, o ya terminó sin botón de «nueva»
        try {
            await botones.first().click({ timeout: 3000 });
        } catch {
            break;   // el botón desapareció entre contarlo y pulsarlo — no insistir a ciegas
        }
        jugadas++;
        await page.waitForTimeout(600);   // que el hub conteste y el panel se repinte
        const datos = await medir(page);
        if (datos.medible && (!peor || datos.tapadas > peor.tapadas)) peor = datos;
    }
    return { peor, jugadas };
}

/** Se serializa dentro de `page.evaluate`: no puede usar nada de fuera del navegador. */
function evaluarEscena(panelRect) {
    const cap = window.__CAPTURA;
    if (!cap?.escena || !cap?.camara) {
        return { medible: false, motivo: 'no se interceptó ningún `render()` — el juego no llegó a pintar un fotograma, o no usa THREE' };
    }
    const { escena, camara, renderer } = cap;
    const canvas = renderer?.domElement;
    const rectLienzo = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };

    escena.updateMatrixWorld(true);
    camara.updateMatrixWorld(true);

    const UMBRAL_RADIO = 2.5;   // por encima: tablero/suelo. La comida de snake mide 0.4; su suelo, ~14.
    const V = new THREE.Vector3();
    const M = new THREE.Matrix4();
    const posAux = new THREE.Vector3(), rotAux = new THREE.Quaternion(), escAux = new THREE.Vector3();

    function proyectar(mundo) {
        const p = mundo.clone().project(camara);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1) return null;
        const x = rectLienzo.left + (p.x * 0.5 + 0.5) * rectLienzo.width;
        const y = rectLienzo.top + (1 - (p.y * 0.5 + 0.5)) * rectLienzo.height;
        // Fuera del VIEWPORT entero: las manos rivales se sacan de la pantalla a
        // propósito (mesa_cartas.mjs) y no cuentan como "tapadas por el panel" —
        // están en otro sitio, no debajo de nada.
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
        return { x, y };
    }

    function nombreDe(obj) {
        // El zona la pone SovereignCardEngine en cada carta (userData.zona,
        // p.ej. "caja_0_0" o "mazo_mesa_1"); se recorta el índice para agrupar
        // por montón y no por carta suelta.
        const zona = obj.userData?.zona;
        if (zona) return String(zona).replace(/_[0-9]+(_[0-9]+)*$/, '');
        if (obj.name) return obj.name;
        const color = obj.material?.color?.getHexString?.();
        return `${obj.geometry?.type ?? 'malla'}${color ? ' #' + color : ''}`;
    }

    let vistas = 0, estructuras = 0;
    const piezas = [];

    escena.traverse((obj) => {
        if (!obj.visible) return;
        if (obj.isInstancedMesh) {
            if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
            const radio = obj.geometry.boundingSphere?.radius ?? 0;
            if (radio > UMBRAL_RADIO) { estructuras++; return; }
            for (let i = 0; i < obj.count; i++) {
                obj.getMatrixAt(i, M);
                V.setFromMatrixPosition(M).applyMatrix4(obj.matrixWorld);
                vistas++;
                const p = proyectar(V);
                if (p) piezas.push({ nombre: nombreDe(obj), x: p.x, y: p.y });
            }
        } else if (obj.isMesh) {
            if (obj.geometry && !obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere?.();
            obj.matrixWorld.decompose(posAux, rotAux, escAux);
            const escalaProm = (escAux.x + escAux.y + escAux.z) / 3;
            const radio = (obj.geometry?.boundingSphere?.radius ?? 0) * escalaProm;
            if (radio > UMBRAL_RADIO) { estructuras++; return; }
            vistas++;
            V.setFromMatrixPosition(obj.matrixWorld);
            const p = proyectar(V);
            if (p) piezas.push({ nombre: nombreDe(obj), x: p.x, y: p.y });
        }
    });

    const dentro = piezas.filter(pz =>
        pz.x >= panelRect.left && pz.x <= panelRect.right &&
        pz.y >= panelRect.top && pz.y <= panelRect.bottom);

    const porNombre = {};
    for (const pz of dentro) porNombre[pz.nombre] = (porNombre[pz.nombre] ?? 0) + 1;

    return {
        medible: true,
        vistas, estructuras,
        totalPiezas: piezas.length,
        tapadas: dentro.length,
        porNombre,
    };
}

console.log(`\n¿Qué piezas caen debajo del panel del HUD, en los ${juegos.length} juegos? ${base}\n`);
const filas = [];

for (const juego of juegos) {
    const p = paginas[juego];
    const url = `${base}/arcade/${p.pagina}?semilla=${SEMILLA}`
              + (p.pagina === 'mesa.html' ? `&juego=${juego}` : '');
    const ctx = await conParche(await navegador.newContext({ viewport: { width: 1280, height: 720 } }));
    const page = await ctx.newPage();
    let fila = { juego };
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 25000 });
        await page.waitForTimeout(4500);   // que reparta y termine de montar la escena
        const alAbrir = await medir(page);

        // ⚠️ LA SEGUNDA MEDIDA — TRAS JUGAR — Y QUEDARSE CON LA PEOR.
        //
        // Sólo tiene sentido intentarlo si la primera se pudo medir: sin
        // `.hud-panel` o sin `render()` interceptado no hay nada que comparar,
        // y jugar a ciegas sobre una página que ya se sabe no medible sólo
        // gastaría tiempo de los 35.
        let peor = null, jugadas = 0, sinSegunda = null;
        if (alAbrir.medible) {
            ({ peor, jugadas } = await jugarYMedirPeor(page));
            if (!peor) {
                sinSegunda = jugadas === 0
                    ? 'sin `.mesa-jugada` que pulsar — el juego avanza solo o no ofreció botón'
                    : 'tras jugar no quedó ningún estado medible';
            }
        }

        const usarPeor = peor && peor.tapadas > alAbrir.tapadas;
        const datos = usarPeor ? peor : alAbrir;
        fila = {
            juego, ...datos,
            momento: usarPeor ? 'tras jugar' : 'al abrir',
            jugadasProbadas: jugadas,
            tapadasAlAbrir: alAbrir.medible ? alAbrir.tapadas : null,
            tapadasTrasJugar: peor ? peor.tapadas : null,
            ...(sinSegunda ? { sinSegundaMedida: sinSegunda } : {}),
        };
    } catch (e) {
        fila = { juego, medible: false, motivo: String(e.message ?? e).split('\n')[0].slice(0, 90) };
    }
    await ctx.close();
    filas.push(fila);

    // ⚠️ SI LA SEGUNDA MEDIDA NO SALIÓ, SE DICE — NO SE CALLA COMO UN "AL ABRIR" MÁS.
    // Un juego que nunca llegó a tener un estado medible tras jugar no es lo mismo
    // que uno que se midió tras jugar y salió mejor: el primero es una medida que
    // falta, el segundo es una medida que se tomó y no empeoró nada.
    const notaSinSegunda = fila.sinSegundaMedida ? `  (${fila.sinSegundaMedida})` : '';

    if (!fila.medible) {
        console.log(`  ?  ${juego.padEnd(11)} no medible — ${fila.motivo}`);
    } else if (fila.tapadas === 0) {
        console.log(`  ✓  ${juego.padEnd(11)} 0 piezas tapadas`
            + `  (${fila.totalPiezas} piezas vistas, ${fila.estructuras} estructuras excluidas`
            + `, ${fila.jugadasProbadas} jugada(s) probada(s))${notaSinSegunda}`);
    } else {
        const detalle = Object.entries(fila.porNombre)
            .map(([n, c]) => `${n}×${c}`).join(', ');
        const cuando = fila.momento === 'tras jugar'
            ? ` tras jugar (${fila.jugadasProbadas} jugada(s))` : ' al abrir';
        console.log(`  ✗  ${juego.padEnd(11)} ${fila.tapadas} pieza(s) tapada(s)${cuando}: ${detalle}${notaSinSegunda}`);
    }
}

await navegador.close();
servidor.kill();

// ── El resumen ────────────────────────────────────────────────────────────
const medidos = filas.filter(f => f.medible);
const noMedidos = filas.filter(f => !f.medible);
const conTapadas = medidos.filter(f => f.tapadas > 0);

console.log(`\n  ${medidos.length}/${filas.length} juegos medidos`
    + (noMedidos.length ? ` · ${noMedidos.length} sin medir: ${noMedidos.map(f => f.juego).join(', ')}` : ''));

if (conTapadas.length) {
    console.log(`\n  ${conTapadas.length} juego(s) con piezas bajo el panel:`);
    for (const f of conTapadas) {
        const detalle = Object.entries(f.porNombre).map(([n, c]) => `${n}×${c}`).join(', ');
        console.log(`    - ${f.juego}: ${f.tapadas} → ${detalle}`);
    }
} else {
    console.log(`\n  Ningún juego medido tiene piezas bajo el panel.`);
}

/**
 * ⚠️ EL CONTROL POSITIVO. SIN ESTO, UN CERO EN TODOS NO SIGNIFICA NADA.
 *
 * ⚠️ 16-08: EL CONTROL ERA SNAKE, Y CADUCÓ — ESO ES CORRECTO, NO UNA ROTURA.
 *
 * Snake TENÍA la comida tapada — es el caso que abrió esta tarea. `encuadre.js`
 * aprendió a ALEJAR la cámara cuando el hueco a la derecha del panel es cero
 * (el tablero de snake llena la pantalla entera, así que apartar la vista no
 * tenía dónde correrse) y desde entonces snake mide 0 piezas tapadas de verdad
 * — comprobado con captura, se ve la comida y el tablero entero. Un control
 * positivo que deja de fallar cuando se arregla el caso que lo sostenía está
 * haciendo su trabajo, no rompiéndose: seguir usando snake aquí habría hecho
 * que este instrumento gritara «FALLIDO» contra su propio arreglo para siempre.
 *
 * El relevo fue ENTROPY: su montón de descarte seguía cayendo bajo el panel
 * (medido entonces: `descarte_mesa×1` + la mesa verde bajo la esquina), y en
 * ese juego SÍ importaba — es de donde se roba.
 *
 * ⚠️ 16-08 (más tarde, el mismo día): ENTROPY TAMBIÉN CADUCÓ — Y CON ÉL SE
 * FUE EL RELEVO QUE IBA A SER SU SIGUIENTE.
 *
 * `apartarDescarteDelPanel()`, en `public/arcade/js/mesa_cartas.mjs`, aleja y
 * panea la cámara de la mesa de cartas cuando el descarte cae bajo el panel —
 * comprobado con captura en los dos: se ve el descarte entero, la mano propia
 * se lee carta por carta, nada se sale de ningún borde—. El relevo natural
 * IBA A SER remigio (el otro juego con el mismo problema real), pero el mismo
 * arreglo lo despejó también. Entre las mesas de cartas no quedó ninguna con un
 * descarte tapado de verdad para relevar a entropy — sólo la mano del rival, que
 * es a propósito (se explica arriba y en `mesa_cartas.mjs`) y no sirve de
 * control: gritaría «FALLIDO» contra algo que nunca se va a tocar.
 *
 * ⚠️ EL RELEVO QUE SÍ LLEGÓ: GENERALA, TRAS TIRAR — Y ES DE REGALO.
 *
 * La medida en dos momentos que cierra el hueco de este mismo fichero (ver
 * cabecera) tenía, sin buscarlo, el control que le faltaba a este bloque: la
 * GENERALA es un fallo real y sin arreglar —el primer dado queda bajo el panel
 * en cuanto tiras—, y ADEMÁS es un fallo que la medida VIEJA (una sola pantalla)
 * no podía ver: al abrir sólo hay un botón (`tirar`), así que «generala 0
 * piezas tapadas» era la respuesta de siempre y parecía limpio. Sólo tras jugar
 * se destapa. O sea que demuestra la mejora de esta tarea Y hace de control a
 * la vez — el mismo caso sirviendo para las dos cosas, sin montar nada aparte.
 *
 * Por eso el control positivo de aquí en adelante es generala, y es OBLIGATORIO:
 * si algún día mide 0 piezas tapadas en los dos momentos, lo más probable no es
 * que el juego se haya arreglado —nadie ha tocado su cámara ni su panel— es que
 * el instrumento se ha roto. En ese caso no te creas ningún otro cero de la
 * misma pasada sin revisar primero el parche.
 */
const controlGenerala = filas.find(f => f.juego === 'generala');
console.log('');
if (!controlGenerala) {
    console.log('  ⚠ CONTROL POSITIVO no evaluado — "generala" no estaba en la lista pedida.');
} else if (!controlGenerala.medible) {
    console.log(`  ✗ CONTROL — generala no se pudo medir (${controlGenerala.motivo}). El instrumento está roto, no generala.`);
} else if (controlGenerala.tapadas > 0) {
    const detalle = Object.entries(controlGenerala.porNombre).map(([n, c]) => `${n}×${c}`).join(', ');
    const cuando = controlGenerala.momento === 'tras jugar'
        ? `tras jugar (${controlGenerala.jugadasProbadas} jugada(s))` : 'al abrir';
    console.log(`  ✓ CONTROL POSITIVO — generala da ${controlGenerala.tapadas} pieza(s) tapada(s) ${cuando}`
        + ` (${detalle}), como se esperaba.`);
} else {
    console.log('  ✗ CONTROL POSITIVO FALLIDO — generala midió 0 piezas tapadas al abrir Y tras jugar.'
        + ' Es un fallo real y sin arreglar (el primer dado queda bajo el panel en cuanto tiras): un cero'
        + ' aquí no es buena noticia, es señal de que el instrumento se ha roto. No te creas ningún otro'
        + ' cero de esta pasada sin revisar primero el parche.');
}

process.exit(noMedidos.length ? 1 : 0);
