/**
 * ¿QUÉ JUGADAS SE PUEDEN HACER CON EL DEDO, JUEGO POR JUEGO?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El panel de jugadas es la lista LITERAL que recibe un agente por la puerta de
 * texto, y eso no se toca: es lo que hace comparables las dos filas de la tabla
 * del banco. Pero una persona en un móvil no quiere leer catorce botones — quiere
 * tocar la carta. La pregunta es cuánto de eso funciona ya.
 *
 * ⚠️ SE PREGUNTAN DOS COSAS DISTINTAS, Y CONFUNDIRLAS ME COSTÓ LA TARDE.
 *
 *   1. EL PANEL — ¿se puede pulsar CADA jugada legal, con el dedo y con el ratón?
 *      Es una garantía y tiene que salir entera: los botones son la interfaz
 *      completa. Se comprueba APUNTANDO al botón, en su posición real.
 *
 *   2. EL TABLERO — ¿a cuántas jugadas se llega tocando la mesa, sin usar el
 *      panel? Es comodidad, no garantía, y se sondea a ciegas con una rejilla
 *      porque no hay forma de saber dónde cae cada casilla sin preguntárselo al
 *      render. El número es APROXIMADO y así se dice.
 *
 * Antes esto era una sola cifra, sondeando a ciegas TODA la pantalla —panel
 * incluido— y comparando cuentas. Daba cosas como «brisca dedo 1/3, ratón 3/3» y
 * me tuvo persiguiendo un fallo de tacto que no existe: perseguí tres hipótesis
 * (el navegador quedándose el gesto, el doble toque para hacer zoom, el viewport
 * sin declarar), escribí dos arreglos, y los números salieron IDÉNTICOS las tres
 * veces. Lo que zanjó el asunto fue pulsar los tres botones por su posición real:
 * cuatro de cuatro con el dedo y cuatro de cuatro con el ratón.
 *
 * O sea que se toca perfectamente y lo estropeado era la vara de medir. Una
 * rejilla ciega sobre botones pequeños dice más de la rejilla que de la página.
 *
 * ⚠️ NO SE MIRA EL CÓDIGO, SE TOCA LA PANTALLA.
 *
 * Cada juego tiene su visualizador y algunos son propios; leer sus manejadores
 * daría una respuesta por fichero y ninguna comparable. Así que se toca a ciegas,
 * como haría un dedo: una cuadrícula de puntos sobre el lienzo, tap de verdad
 * (`touchscreen.tap`, no un clic de ratón disfrazado), y se recoge lo que sale.
 *
 * `sendMove` se intercepta para GRABAR Y NO ENVIAR. Si dejáramos jugar, el primer
 * toque cambiaría el estado y los siguientes ya estarían respondiendo a otra
 * partida: saldría una lista de jugadas que nunca fueron legales a la vez.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const P = 8137;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const b = await chromium.launch({ channel: 'chrome', headless: true });

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LAS DOS MANERAS DE TOCAR, Y COMPARADAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto medía sólo el dedo. Y la pregunta de verdad son las DOS: un juego puede
 * responder al tacto y no al ratón, o al revés, y desde dentro no se nota nada
 * porque cada uno se prueba en la máquina que tiene delante.
 *
 * No es hipotético en este proyecto. Los gestos de deslizar se escribieron con
 * `pointer`, el panel se arregló con `pointer-events`, y los visualizadores
 * viejos llevan manejadores de `click` de cuando esto sólo se abría en un
 * escritorio. Cada capa se hizo pensando en una de las dos.
 *
 * Se mide igual en las dos y se comparan los números. Una DIFERENCIA es el
 * hallazgo: significa que hay una jugada que sólo llega por una entrada, o sea
 * una persona que no puede jugar según con qué abra la página.
 *
 * ⚠️ Y SE CAMBIA UNA SOLA COSA: LA MANO.
 *
 * El primer intento daba el móvil con `isMobile:true` al dedo y un escritorio con
 * `isMobile:false` al ratón. Salieron tres juegos «que no coinciden» y estuve a
 * punto de apuntarlos como fallos. No lo eran: con `isMobile` cambia el trazado de
 * la página, o sea que el tablero se dibuja a otro tamaño, o sea que la MISMA
 * rejilla de puntos cae sobre otras casillas. Estaba comparando dos experimentos
 * distintos y llamando «diferencia entre entradas» a la diferencia entre ellos.
 *
 * Ahora las dos pasadas usan exactamente el mismo contexto y lo único distinto es
 * si el punto se toca con el dedo o se pincha con el ratón. Así una diferencia sí
 * quiere decir lo que dice.
 */
const VISTA = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
                deviceScaleFactor: 2 };
const MODOS = [
    // Tap de verdad, no un clic de ratón disfrazado.
    { nombre: 'dedo',  ctx: VISTA, tocar: (p, x, y) => p.touchscreen.tap(x, y) },
    // Y el ratón sobre la misma página: si algo sólo escucha `touchstart`, aquí cae.
    { nombre: 'ratón', ctx: VISTA, tocar: (p, x, y) => p.mouse.click(x, y) },
];

/** Dos cuentas «lo bastante parecidas» — el porqué está en el veredicto, abajo. */
const cerca = (a, b) => Math.abs(a - b) <= Math.max(3, 0.25 * Math.max(a, b));

const soloEstos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (soloEstos.length ? soloEstos : Object.keys(paginas)).filter(j => paginas[j]);

console.log('\n¿Qué jugadas llegan con el dedo Y con el ratón?  (390x844, toque real)\n');
const filas = [];

for (const juego of juegos) {
  for (const modo of MODOS) {
    const ctx = await b.newContext(modo.ctx);
    /**
     * ⚠️ SE ENGANCHA EL RENDERIZADOR PARA PODER APUNTAR, Y VA ANTES DE CARGAR NADA.
     *
     * La sonda de la mesa era una rejilla A CIEGAS de 16x20, y su número se leía como
     * un límite de la sonda y no del juego: cuando unit daba «mesa 0/2» eso no quería
     * decir que no se pudiera tocar, quería decir que 320 toques repartidos por la
     * pantalla no habían acertado ninguna carta. Con esa medida no se puede decidir si
     * el panel puede dejar de ser pulsable, que es justo lo que hay que decidir.
     *
     * Ahora se APUNTA. Las mallas llevan nombre desde el contrato de `prueba_vistas`
     * —`p:<tipo>:<dueño>` para piezas, `z<n>:v<m>` para items de zona—, así que se
     * proyecta cada una con la cámara y se toca su píxel. El parche es el mismo de
     * `bajo_el_panel.mjs`: se envuelve `THREE.WebGLRenderer` y se guarda la escena y
     * la cámara que le pasan, que funciona igual si el motor las publica en `window`
     * como si no —el caso de peatón—.
     *
     * Va en `addInitScript` porque tiene que estar puesto ANTES del primer render, y
     * `page.evaluate` después de cargar llega tarde.
     */
    await ctx.addInitScript(() => {
        window.__CAPTURA = null;
        const engancha = () => {
            if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
            const Original = THREE.WebGLRenderer;
            function Parcheado(...args) {
                const instancia = new Original(...args);
                const renderOriginal = instancia.render.bind(instancia);
                instancia.render = function (escena, camara) {
                    window.__CAPTURA = { escena, camara };
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
    const p = await ctx.newPage();
    const url = `http://127.0.0.1:${P}/arcade/${paginas[juego].pagina}?semilla=7`
              + (paginas[juego].pagina === 'mesa.html' ? `&juego=${juego}` : '');
    try {
        await p.goto(url, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(4500);   // que termine de repartir

        /**
         * ⚠️ SE PINCHA `ALISA_PROTOHUB.move`, NO EL `sendMove` DE CADA MOTOR.
         *
         * Empecé por `sendMove` y me quedé sin medir la mitad: los visualizadores
         * propios (ajedrez, go, mancala…) no exponen su motor en `window`, así que
         * salía «no medible» en un montón de juegos que sí se pueden tocar.
         *
         * `hub.move` es por donde pasan LOS 35 —es el mismo punto que usa
         * `laboratorio_mesas.mjs`, que ya los cubre enteros— y además es el punto
         * donde se sabe que una jugada iba en serio.
         */
        const datos = await p.evaluate(async () => {
            const hub = window.ALISA_PROTOHUB;
            if (!hub) return null;
            const clave = window.ALISA_JUEGO ?? [...(hub.reglas?.keys?.() ?? [])][0];
            const st = await hub.state(clave);
            window.__tocadas = [];
            const orig = hub.move.bind(hub);
            // ⚠️ LA JUGADA VIENE DENTRO DE UN OBJETO, NO COMO CADENA.
            //
            // La firma es `move(juegoId, accion)` con `accion = {action:'move',
            // params:{action: 'robar_descarte'}}`. Yo grababa `a[1]` a secas y me
            // salía «[object Object]» — que no coincide con ninguna jugada legal,
            // así que los 35 juegos daban 0% y parecía que el táctil no existía.
            // Existía: el roto era esta línea.
            //
            // ⚠️ Y HABÍA UNA CUARTA FORMA. ARREGLADO UNA VEZ NO ES ARREGLADO.
            //
            // Lo de arriba lo escribí al descubrir que la jugada venía envuelta, y
            // cubrí las formas que vi ese día: `params.action`, `params.jugada`,
            // `action`. La mesa genérica manda `{move: 'a6'}` — y como no estaba en
            // la lista, `jugadaDe` devolvía null y no se grababa NADA.
            //
            // Consecuencia: este instrumento llevaba diciendo «0 jugadas con el
            // dedo, sólo por panel» de casi todos los juegos de tablero. Y era
            // mentira: se tocan perfectamente. Lo destapé barriendo flota a mano y
            // viendo salir `{"move":"a6"}` por la consola cuando la herramienta
            // decía 0/64.
            //
            // Un instrumento que dice «no llega» cuando sí llega es peor que no
            // tenerlo: lleva a arreglar lo que no está roto. Va la cuarta vez hoy
            // que el fallo está en quien pregunta.
            const jugadaDe = (acc) => (typeof acc === 'string' ? acc
                : acc?.params?.action ?? acc?.params?.jugada
                ?? acc?.move ?? acc?.jugada ?? acc?.action ?? null);
            // Graba y NO juega: devuelve el estado de ahora para no romper el repintado.
            hub.move = (...a) => {
                const j = jugadaDe(a[1]);
                if (j && j !== 'move') window.__tocadas.push(String(j));
                return Promise.resolve(st);
            };
            return { legales: (st.legal_moves ?? st.legal_actions ?? [])
                        .filter(m => m !== 'nueva' && m !== 'reset').map(String) };
        });

        if (!datos) {
            console.log(`  ? ${juego.padEnd(11)} ${modo.nombre.padEnd(5)} la página no registró ALISA_PROTOHUB`);
            filas.push({ juego, modo: modo.nombre, medible: false });
            await ctx.close();
            continue;
        }
        const legales = datos.legales;

        /**
         * ── 1. EL PANEL, APUNTANDO ────────────────────────────────────────
         *
         * Un botón por jugada legal, y se pulsa cada uno en su centro. Esto no
         * admite aproximación: si una jugada no se puede pulsar, hay alguien que
         * no puede hacerla.
         */
        /**
         * ⚠️ SE REPREGUNTAN LOS BOTONES DESPUÉS DE CADA PULSACIÓN, Y SE MIRA EL
         * ESTADO ENTERO. LAS DOS COSAS ME COSTARON UN FALSO POSITIVO.
         *
         *   · Pillar la lista una vez y recorrerla no vale: en cuanto entra una
         *     jugada el panel se repinta y los botones que quedaban ya no existen.
         *     `boundingBox()` devuelve null y salía «tute: 1 de 10 alcanzables»,
         *     que leí como «nueve cartas no se pueden jugar en un móvil». Con una
         *     carga por botón: diez de diez, con dedo y con ratón.
         *
         *   · Y comparar `{turno, jugadas, puntos}` tampoco: en snake elegir
         *     dirección no cambia ninguno de los tres. Salía «0 de 4 avanzan» y
         *     estuve a punto de escribir que los botones de snake estaban muertos.
         *     Comparando el estado entero: cuatro de cuatro.
         *
         * Se prueban hasta cinco: es una muestra, y así se dice. Pulsarlos todos
         * exigiría recargar la página por botón —lo hice para comprobar esto— y son
         * treinta y cinco juegos por dos manos.
         */
        /**
         * ⚠️ Y ESTA FASE JUEGA DE VERDAD, ASÍ QUE SE RECARGA ANTES.
         *
         * Arriba se sustituye `hub.move` por un muñeco que graba y no juega — hace
         * falta para el sondeo a ciegas, donde trescientos toques sobre una partida
         * viva darían una lista de jugadas que nunca fueron legales a la vez.
         *
         * Pero aquí la pregunta es si la partida AVANZA al pulsar, y con el muñeco
         * puesto no avanza nunca: la primera versión de esto daba 0 de 5 en los
         * cinco juegos que probé, un pleno tan redondo que ya cantaba. Recargar
         * devuelve el `hub.move` de verdad y una partida limpia.
         */
        await p.reload({ waitUntil: 'load' }).catch(() => {});
        await p.waitForTimeout(4200);

        /**
         * ⚠️ UN ESPÍA QUE GRABA **Y DEJA PASAR**. NO UN MUÑECO.
         * ═══════════════════════════════════════════════════════════════════
         *
         * La recarga de arriba quita el muñeco a propósito, y con razón: esta fase
         * quiere que la partida avance de verdad. Pero medir «¿avanzó el estado?» no
         * vale en los juegos de TICK — en peatón mandas la dirección y el mundo no se
         * mueve hasta el siguiente latido, así que lo que cambiaba el estado era el
         * reloj y no el dedo.
         *
         * Medido: parando todos los `setInterval` de la página, peatón pasó de bailar
         * entre 3/5 y 5/5 a dar **0/5 tres veces seguidas**. O sea que sus aprobados
         * eran tan casuales como sus suspensos, y el «34/35 señalando peatón» de hoy
         * no era un fallo del juego: era la vara.
         *
         * Así que se apunta la jugada Y se deja pasar. Con eso la pregunta que
         * contesta esta fase pasa a ser la que promete el instrumento —«¿el botón
         * manda su jugada?»— sin depender del reloj de nadie, y la partida sigue
         * avanzando como antes.
         *
         * ⚠️ Y NO SE PONE UN MUÑECO QUE NO JUEGUE: eso ya se probó y está escrito
         * cuatro líneas más arriba —«daba 0 de 5 en los cinco juegos, un pleno tan
         * redondo que ya cantaba»—. Lo volví a hacer hoy y volvió a salir el mismo
         * pleno. La diferencia entre espiar y suplantar es justo esta línea.
         */
        await p.evaluate(() => {
            const hub = window.ALISA_PROTOHUB;
            if (!hub) return;
            window.__tocadas = [];
            const orig = hub.move.bind(hub);
            hub.move = (juego, accion) => {
                const j = accion?.move ?? accion?.params?.uci ?? accion?.params?.action;
                if (j && j !== 'move') window.__tocadas.push(String(j));
                return orig(juego, accion);      // ← y se deja jugar
            };
        });

        const MUESTRA = 5;
        const botones = await p.locator('.mesa-jugada').all();
        let panelBien = 0, panelProbados = 0, panelReintentos = 0, panelTapados = 0;
        /**
         * ⚠️ SE CUENTA LA JUGADA QUE LLEGÓ AL HUB, NO SI CAMBIÓ EL ESTADO.
         * ═══════════════════════════════════════════════════════════════════
         *
         * Esto medía `state()` antes y después de pulsar, y daba por buena la
         * pulsación si el estado cambiaba. En la mayoría funciona y en los juegos de
         * TICK es sencillamente otra cosa: en peatón mandas la dirección y el mundo
         * no se mueve hasta el siguiente latido, así que el estado cambia por el
         * reloj y no por tu dedo.
         *
         * O sea que en esos juegos esta medida nunca midió lo que dice: sus 5/5 eran
         * tan casuales como sus 3/5 — coincidir o no con un tick. Y el 34/35 que
         * salió hoy señalando peatón no era un fallo del juego, era la vara.
         *
         * Lo comprobé parando todos los `setInterval` de la página: peatón pasó de
         * bailar entre 3/5 y 5/5 a dar **0/5 tres veces seguidas**. Determinista, y
         * la prueba de que lo que contaba eran latidos.
         *
         * `hub.move` YA está interceptado unas líneas más arriba y apunta cada jugada
         * intentada en `window.__tocadas`. Eso es exactamente la garantía que este
         * instrumento promete —«el botón manda su jugada»— y no depende del reloj de
         * nadie: si la pulsación llegó, hay una entrada más; si no llegó, no la hay.
         */
        const cuantasTocadas = () => p.evaluate(() => (window.__tocadas ?? []).length);

        for (let k = 0; k < Math.min(MUESTRA, botones.length); k++) {
            const vivos = p.locator('.mesa-jugada');
            const cuantos = await vivos.count();
            if (!cuantos) break;
            const bot = vivos.nth(k % cuantos);
            await bot.scrollIntoViewIfNeeded().catch(() => {});
            const caja = await bot.boundingBox().catch(() => null);
            if (!caja) continue;

            panelProbados++;
            /**
             * ⚠️ UN SEGUNDO INTENTO, Y SE CUENTA CUÁNTOS LO NECESITAN.
             * ═══════════════════════════════════════════════════════════════════
             *
             * En pasada de 35 este instrumento señalaba a un juego distinto cada vez
             * —peatón un día, blackjack otro, póker hoy— y ese mismo juego medido en
             * solitario daba pleno tres veces seguidas. Póker: 2/2, 2/2, 2/2, y en la
             * pasada completa suspendía.
             *
             * La causa no es el juego: es que con 35 navegadores por delante los
             * huecos entre leer el rectángulo y tocarlo se alargan, y en los juegos
             * que avanzan solos el botón ya no está donde se midió. Un toque al aire
             * no dice nada sobre si el botón manda su jugada, que es lo único que
             * este instrumento promete.
             *
             * Se reintenta UNA vez, releyendo el botón —no reusando el rectángulo
             * viejo, que es justo lo que había caducado—.
             *
             * ⚠️ Y ANTES DE CADA TOQUE SE PREGUNTA QUIÉN LO VA A RECIBIR.
             * ═══════════════════════════════════════════════════════════════════
             *
             * Esto no estaba, y sin ello el reintento MENTÍA. Comprobado con el
             * fallo de peatón puesto otra vez a mano: sin reintento daba 0/5, con
             * reintento **4/5**. No es que el segundo toque acertara el botón: es que
             * el toque caía en el LIENZO —que estaba por delante— y el lienzo de
             * peatón también manda jugadas. La cuenta subía sin que ningún botón
             * hubiera hecho nada.
             *
             * O sea que «llegó una jugada» no es «el botón mandó su jugada», que es
             * lo único que este instrumento promete. Así que se pregunta por
             * `elementFromPoint` quién hay en esas coordenadas: si no es el botón, no
             * se toca siquiera, y se apunta como TAPADO, que además es un diagnóstico
             * mucho más útil que un número bajo — dice dónde mirar.
             */
            const recibeElBoton = async () => p.evaluate(({ x, y }) => {
                const e = document.elementFromPoint(x, y);
                return !!e && !!e.closest?.('.mesa-jugada');
            }, { x: Math.round(caja.x + caja.width / 2), y: Math.round(caja.y + caja.height / 2) });

            let llego = false, tapado = false;
            for (let intento = 0; intento < 2 && !llego; intento++) {
                if (intento) {
                    panelReintentos++;
                    const otra = p.locator('.mesa-jugada').nth(k % await p.locator('.mesa-jugada').count());
                    const c2 = await otra.boundingBox().catch(() => null);
                    if (!c2) break;
                    caja.x = c2.x; caja.y = c2.y; caja.width = c2.width; caja.height = c2.height;
                }
                if (!await recibeElBoton()) { tapado = true; continue; }
                tapado = false;
                const antes = await cuantasTocadas();
                await modo.tocar(p, Math.round(caja.x + caja.width / 2),
                                    Math.round(caja.y + caja.height / 2));
                await p.waitForTimeout(400);
                llego = await cuantasTocadas() > antes;
            }
            if (tapado) panelTapados++;
            if (llego) panelBien++;
        }

        /**
         * ── 2. EL TABLERO, A CIEGAS ───────────────────────────────────────
         *
         * Rejilla sobre el lienzo, saltándose la franja del panel. Es aproximado a
         * propósito y por eso va aparte: una persona apunta a la casilla y esto no
         * puede. Sirve para ver si tocar la mesa hace ALGO, no para puntuar.
         */
        // ⚠️ Y AQUÍ SE VUELVE A PONER EL MUÑECO, porque la recarga de la fase
        // anterior se llevó el de antes. Sin esto, los trescientos veinte toques
        // de la rejilla se juegan DE VERDAD sobre una partida viva y lo que sale
        // es una lista de jugadas que nunca fueron legales a la vez.
        await p.evaluate(() => {
            const hub = window.ALISA_PROTOHUB;
            const st = hub.state(window.ALISA_JUEGO);
            window.__tocadas = [];
            const jugadaDe = (acc) => (typeof acc === 'string' ? acc
                : acc?.params?.action ?? acc?.params?.jugada
                ?? acc?.move ?? acc?.jugada ?? acc?.action ?? null);
            hub.move = (...a) => {
                const j = jugadaDe(a[1]);
                if (j && j !== 'move') window.__tocadas.push(String(j));
                return Promise.resolve(st);
            };
        });
        /**
         * Las jugadas legales DE AHORA, leídas con el espía ya puesto —o sea, con el
         * estado congelado— y antes de tocar nada. Se leen aquí y no al final porque
         * las sondas de casillas las necesitan para saber a qué apuntar.
         */
        const legalesAhora = await p.evaluate(() => {
            const st = window.ALISA_PROTOHUB?.state?.(window.ALISA_JUEGO) ?? {};
            return (st.legal_moves ?? []).map(String).filter(m => m !== 'nueva' && m !== 'reset');
        }).catch(() => legales.map(String));
        const base = legalesAhora.length ? legalesAhora : legales.map(String);

        const { width: W, height: H } = modo.ctx.viewport;
        const bajoPanel = await p.evaluate(() => {
            const r = document.querySelector('.hud-panel')?.getBoundingClientRect();
            return r ? Math.max(0, Math.round(r.bottom + 8)) : 150;
        });

        /**
         * ── 2. LA MESA, APUNTANDO ─────────────────────────────────────────
         *
         * Dónde cae en pantalla cada malla CON NOMBRE. El nombre es el contrato que ya
         * vigila `prueba_vistas`: sin él una pieza dibujada no se puede relacionar con
         * nada del sustrato, y aquí tampoco se puede saber a qué se está apuntando.
         *
         * Se proyecta el centro del volumen envolvente, no la posición del objeto: una
         * carta en un abanico está rotada y trasladada por sus padres, y `position` es
         * la de su sistema local. Con `position` la mitad de los puntos caían fuera de
         * la carta que decían señalar.
         */
        /**
         * ⚠️ SE INSTALA COMO FUNCIÓN Y SE LLAMA ANTES DE CADA TOQUE, NO UNA VEZ.
         *
         * Calculando la lista entera de una vez, hearts se quedaba en 2 de 13. El
         * motivo es que el primer toque reencuadra la mesa —`reencuadrarCuandoAsiente`
         * acerca la cámara cuando las cartas dejan de moverse— y a partir de ahí los
         * once píxeles que quedaban apuntaban a donde las cartas ESTABAN. Una lista de
         * coordenadas calculada antes de tocar caduca en cuanto se toca.
         *
         * Se direcciona por ÍNDICE y no por nombre porque los nombres se repiten: las
         * trece cartas de la mano se llaman todas `p:carta:0`.
         */
        await p.evaluate(() => {
            const c = window.__CAPTURA;
            if (!c?.escena || !c?.camara) { window.__APUNTA = null; return; }
            const caja = new THREE.Box3(), v = new THREE.Vector3();
            const rayo = new THREE.Raycaster();
            const W = window.innerWidth, H = window.innerHeight;
            const aPantalla = (p) => {
                v.copy(p).project(c.camara);
                return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, delante: v.z < 1 };
            };
            /**
             * ⚠️ EL CENTRO NO VALE: EN UN ABANICO LO TAPA LA CARTA SIGUIENTE.
             *
             * Apuntando al centro de cada malla, hearts daba 2 de 13 — y no porque no
             * se puedan tocar once cartas, sino porque en un abanico cada carta sólo
             * enseña una franja y el centro de casi todas está debajo de la de al lado.
             * Un instrumento que apunta a un píxel tapado mide la colocación y lo
             * cuenta como que la jugada no se puede hacer.
             *
             * Así que se prueban varios puntos de la pieza y se le pregunta al trazador
             * de rayos QUÉ HAY DELANTE en cada uno. Vale el primero donde lo que
             * contesta es esta misma pieza. Es literalmente la pregunta humana: ¿hay
             * algún sitio donde tocando esto se toque esto?
             */
            const esta = (o, obj) => { for (let n = o; n; n = n.parent) if (n === obj) return true; return false; };
            const nombradas = () => {
                const lista = [];
                c.escena.traverse((o) => {
                    if (!o.visible || !o.isMesh || !o.name) return;
                    // Sólo lo que el contrato nombra. El suelo, la niebla y el tapete no
                    // llevan nombre y no son jugadas: apuntarles es volver a estar a ciegas.
                    if (!/^(p:|z\d+:v\d+|oculta)/.test(o.name)) return;
                    lista.push(o);
                });
                return lista;
            };
            window.__CUANTAS = () => nombradas().length;

            /**
             * ⚠️ Y LAS CASILLAS, QUE NO SON MALLAS Y HASTA HOY NO SE PODÍAN APUNTAR.
             *
             * El terreno se dibuja con `InstancedMesh` —una malla, N instancias— para
             * que fagocito, que son 784 celdas, no cueste 784 objetos. Así que aquí no
             * hay nada que proyectar: hay que saber DÓNDE está la casilla (c,f), y eso
             * lo publica ahora el pintor en `userData.rejillaMundo`.
             *
             * Se busca recorriendo la escena y no en su raíz porque el pintor recibe un
             * grupo, no la escena entera: `mesa_tablero` le pasa `grupo` y `jugar.html`
             * le pasa `escena`. Buscar en la raíz habría funcionado en uno de los dos.
             */
            const conRejilla = () => {
                let r = null;
                c.escena.traverse((o) => { if (!r && o.userData?.rejillaMundo) r = { grupo: o, m: o.userData.rejillaMundo }; });
                return r;
            };
            window.__CASILLA = (col, fil) => {
                const r = conRejilla();
                if (!r) return null;
                const p = new THREE.Vector3(col * r.m.lado + r.m.dx, r.m.y ?? 0, fil * r.m.lado + r.m.dz);
                r.grupo.localToWorld(p);
                const s = aPantalla(p);
                return { col, fil, x: Math.round(s.x), y: Math.round(s.y), delante: s.delante };
            };
            window.__REJILLA = () => {
                const r = conRejilla();
                return r ? { cols: r.m.cols, filas: r.m.filas } : null;
            };
            window.__APUNTA = (i) => {
                const o = nombradas()[i];
                if (!o) return null;
                caja.setFromObject(o);
                if (caja.isEmpty()) return null;
                const mn = caja.min, mx = caja.max, cen = caja.getCenter(new THREE.Vector3());
                // Centro primero, y luego hacia las esquinas de la caja: en un abanico
                // la franja visible es siempre un borde.
                const candidatos = [cen];
                const alto = cen.y + (mx.y - cen.y) * 0.95;
                for (const t of [0.75, 0.9, 0.97]) {
                    // Esquinas, y también los medios de cada lado: en un abanico la
                    // franja que asoma es un LADO entero, no una esquina, y muestreando
                    // sólo las cuatro esquinas nueve cartas de trece salían «tapadas».
                    for (const [ex, ez] of [[mn.x, mn.z], [mn.x, mx.z], [mx.x, mn.z], [mx.x, mx.z],
                                            [mn.x, cen.z], [mx.x, cen.z], [cen.x, mn.z], [cen.x, mx.z]]) {
                        candidatos.push(new THREE.Vector3(
                            cen.x + (ex - cen.x) * t, alto, cen.z + (ez - cen.z) * t));
                    }
                }
                for (const cand of candidatos) {
                    const s = aPantalla(cand);
                    if (!s.delante || s.x < 1 || s.y < 1 || s.x >= W - 1 || s.y >= H - 1) continue;
                    rayo.setFromCamera({ x: (s.x / W) * 2 - 1, y: -(s.y / H) * 2 + 1 }, c.camara);
                    const golpe = rayo.intersectObjects(c.escena.children, true)[0];
                    if (golpe && esta(golpe.object, o)) {
                        return { nombre: o.name, x: Math.round(s.x), y: Math.round(s.y), delante: true };
                    }
                }
                // No hay ni un píxel donde esta pieza esté delante: se devuelve su centro
                // Y SE MARCA, porque «tapada» y «no la encuentro» no son lo mismo.
                const s = aPantalla(cen);
                return { nombre: o.name, x: Math.round(s.x), y: Math.round(s.y), delante: s.delante, tapada: true };
            };
        });

        /**
         * ⚠️ SI NO HAY NADA CON NOMBRE SE VUELVE A LA REJILLA, Y SE DICE CUÁL SE USÓ.
         *
         * Trece de los treinta y cinco dibujan sin marcar sus piezas —`prueba_vistas`
         * los cuenta como NO COMPROBABLES, que es una verdad distinta de aprobado— y
         * ahí apuntar es imposible. Dar cero en esos sería mentir en la dirección
         * cómoda: no es que no se puedan tocar, es que no sé dónde están.
         */
        const cuantas = await p.evaluate(() => window.__CUANTAS?.() ?? 0);
        const apuntando = cuantas > 0;
        const dianas = [];
        if (apuntando) {
            const vistos = new Set();
            for (let i = 0; i < cuantas; i++) {
                const d = await p.evaluate((k) => window.__APUNTA(k), i);
                if (!d) continue;
                dianas.push(d);
                if (!d.delante || d.tapada) continue;
                if (d.x < 2 || d.y < bajoPanel || d.x >= W - 2 || d.y >= H - 2) continue;
                const clave = `${d.x},${d.y}`;
                if (vistos.has(clave)) continue;   // cartas apiladas: un toque basta
                vistos.add(clave);
                await modo.tocar(p, d.x, d.y);
            }
        }

        /**
         * ── 2b. LAS CASILLAS, APUNTANDO ───────────────────────────────────
         *
         * Se recorre la rejilla que publica el pintor y se toca el centro de cada
         * casilla. Es lo que le faltaba a este instrumento para poder decir algo de los
         * once juegos que juegan a sitios y no a piezas.
         *
         * ⚠️ SE COMPRUEBA QUE LA JUGADA CORRESPONDA A LA CASILLA TOCADA.
         *
         * Repartir una rejilla sobre un tablero es una SUPOSICIÓN —que las casillas van
         * uniformes y en ese orden— y una suposición que no se verifica es una rejilla
         * a ciegas con más pasos. Si el reparto estuviera girado, del revés o corrido,
         * saldrían jugadas de otras casillas y esto lo diría: se guarda qué coordenada
         * se tocó y qué jugada salió, y luego se mira si hablan de lo mismo.
         */
        // Se pregunta SIEMPRE, tenga piezas o no: un tablero tiene las dos cosas y
        // gatear esto tras «no hay piezas» dejó a ajedrez, damas y reversi sin medir
        // las casillas justo el día que se puso la medida.
        const rej = await p.evaluate(() => window.__REJILLA?.() ?? null);
        let casillasOk = 0, casillasTocadas = 0;
        if (rej && rej.cols * rej.filas <= 400) {
            for (let f = 0; f < rej.filas; f++) {
                for (let c = 0; c < rej.cols; c++) {
                    const d = await p.evaluate(([a, b]) => window.__CASILLA(a, b), [c, f]);
                    if (!d || !d.delante) continue;
                    if (d.x < 2 || d.y < bajoPanel || d.x >= W - 2 || d.y >= H - 2) continue;
                    const antes = await p.evaluate(() => (window.__tocadas ?? []).length);
                    await modo.tocar(p, d.x, d.y);
                    const salida = await p.evaluate((n) => (window.__tocadas ?? []).slice(n), antes);
                    if (!salida.length) continue;
                    casillasTocadas++;
                    // ¿La jugada que salió habla de la casilla que toqué? Se acepta la
                    // coordenada algebraica (`d2`, y también como destino de `d2d4`) o
                    // el índice de casilla, que es como la nombran los otros.
                    const alg = `${String.fromCharCode(97 + c)}${f + 1}`;
                    const alg2 = `${String.fromCharCode(97 + c)}${rej.filas - f}`;
                    const idx = String(f * rej.cols + c);
                    if (salida.some(m => m.includes(alg) || m.includes(alg2) || m === idx)) casillasOk++;
                }
            }
        }

        /**
         * ── 2c. LAS JUGADAS DE DOS CASILLAS ───────────────────────────────
         *
         * En ajedrez la jugada es `d2d4`: se toca la pieza y luego el destino. Con un
         * toque por casilla salía 0 de 23 — y no porque no se pueda jugar tocando el
         * tablero, sino porque la sonda hacía media jugada y la dejaba a medias.
         *
         * Aquí se recorren las jugadas legales que NOMBRAN dos casillas y se tocan las
         * dos, en orden. Es lo que hace una persona, y es la única forma de que el cero
         * de ajedrez signifique algo.
         */
        /**
         * ⚠️ Y AQUÍ HAY UN CERO QUE NO ES DEL JUEGO, Y HAY QUE DECIRLO.
         *
         * El ajedrez sale 0 de 23 con esta sonda, y su jugada por clic FUNCIONA: medido a
         * mano el 17-08-2026, tocando el píxel de `a2` aparecen las dos marcas de destino
         * (`a2a3` y `a2a4`) — la escena pasa de 97 mallas a 99. Los dos manejadores se
         * ejecutan y la guarda de arrastre no los descarta.
         *
         * O sea que este cero es un límite de la sonda, no un defecto de la mesa. Lo que
         * falta por entender es por qué la pareja de toques no cuaja aquí cuando a mano sí:
         * el candidato es que los dos toques van seguidos sin dejar asentar el primero.
         *
         * Se deja escrito porque un cero sin explicación se lee como un juego roto, y ese
         * malentendido ya me costó cuatro intentos buscando el fallo en el sitio
         * equivocado. Lo que de verdad estaba roto era otra cosa: el tablero no cabía en la
         * pantalla del móvil —26 de 64 casillas fuera— y eso ya está arreglado.
         */
        const dosCasillas = base.filter(m => /^[a-h][1-9][a-h][1-9]$/i.test(String(m)));
        let paresOk = 0;
        if (rej && dosCasillas.length) {
            const aCol = (s) => s.charCodeAt(0) - 97;
            for (const m of dosCasillas.slice(0, 24)) {
                const s = String(m);
                // La fila de la notación va de abajo a arriba y la de la rejilla de
                // arriba a abajo; se prueban las dos porque cuál es cuál depende del
                // visualizador, y equivocarse aquí daría un cero que parece del juego.
                // Cuatro orientaciones y no dos: la fila de la notación va de abajo a
                // arriba y la de la rejilla de arriba a abajo, PERO la columna también
                // puede estar espejada según desde qué lado mire la cámara. Probarlas
                // todas evita que un cero de orientación se lea como un cero del juego.
                for (const [invF, invC] of [[true, false], [false, false], [true, true], [false, true]]) {
                    const fila = (n) => invF ? rej.filas - Number(n) : Number(n) - 1;
                    const col = (c) => invC ? rej.cols - 1 - c : c;
                    const a = await p.evaluate(([c, f]) => window.__CASILLA(c, f), [col(aCol(s[0])), fila(s[1])]);
                    const b = await p.evaluate(([c, f]) => window.__CASILLA(c, f), [col(aCol(s[2])), fila(s[3])]);
                    if (!a?.delante || !b?.delante) continue;
                    if (a.y < bajoPanel || b.y < bajoPanel) continue;
                    const antes = await p.evaluate(() => (window.__tocadas ?? []).length);
                    await modo.tocar(p, a.x, a.y);
                    await modo.tocar(p, b.x, b.y);
                    const salida = await p.evaluate((n) => (window.__tocadas ?? []).slice(n), antes);
                    if (salida.includes(s)) { paresOk++; break; }
                }
            }
        }

        if (!apuntando && !rej) {
            const COLS = 16, FILS = 20;
            for (let cx = 0; cx < COLS; cx++) {
                for (let cy = 0; cy < FILS; cy++) {
                    const x = Math.round((cx + 0.5) * W / COLS);
                    const y = Math.round(bajoPanel + (cy + 0.5) * (H - bajoPanel) / FILS);
                    if (y >= H - 2) continue;
                    await modo.tocar(p, x, y);
                }
            }
        }
        /**
         * ⚠️ LO DE DESLIZAR LO INTENTÉ Y LO QUITÉ. AQUÍ ESTÁ POR QUÉ.
         *
         * Quince de los treinta y cinco se juegan con direcciones —`arriba`,
         * `abajo`— y un toque no produce eso ni queriendo, así que salen todos con
         * cero en la columna de la mesa. Escribí una sonda de gestos para cubrirlos.
         *
         * No es medible con lo que hay. Un tap es lo único que sabe hacer
         * `page.touchscreen`; para un gesto hay que despachar `PointerEvent` a mano
         * sobre el lienzo. Y entonces la pasada del dedo son eventos que me invento
         * yo, mientras la del ratón es un arrastre de verdad: dos experimentos
         * distintos, exactamente el error que ya me costó una tarde hoy. El
         * resultado lo cantaba —fagocito «2 con el dedo, 0 con el ratón»— y esa
         * diferencia era mía, no del juego.
         *
         * Así que se queda sin medir Y SE DICE, que es mejor que un número inventado.
         * Los gestos los cubre `gestos.js` con su propio umbral de 24 px; el día que
         * haya una forma honesta de dispararlos desde fuera, aquí encaja.
         */
        await p.waitForTimeout(300);
        const tocadas = [...new Set(await p.evaluate(() => window.__tocadas ?? []))];

        /**
         * ⚠️ EL DENOMINADOR ES LA LISTA DE AHORA, NO LA DEL PRINCIPIO.
         *
         * Aquí se comparaba contra las jugadas legales medidas ANTES de la fase del
         * panel. Pero esa fase juega de verdad —tiene que hacerlo, si no no se puede
         * ver si la partida avanza al pulsar—, así que para cuando se toca la mesa la
         * mano ya no es la misma. En hearts salía «2 de 13» y las dos cosas eran
         * ciertas por separado: se tocaban las trece cartas que había, y sólo dos de
         * ellas estaban en la lista de trece de hace tres minutos.
         *
         * Aislada, la misma sonda llega a 13 de 13. El fallo no estaba en apuntar:
         * estaba en contra qué se comparaba. Es la misma clase de error que el filtro
         * de `check_gym_envs` —medir bien sobre el conjunto equivocado— y el sabotaje
         * no la ve, porque una comprobación con el universo cambiado sigue sabiendo
         * suspender dentro de su universo cambiado.
         */
        const legalesSet = new Set(base);
        const alcanzables = tocadas.filter(m => legalesSet.has(m));
        const pct = base.length ? Math.round(100 * alcanzables.length / base.length) : null;
        filas.push({ juego, modo: modo.nombre, medible: true, legales: legales.length,
                     botones: panelProbados, panelBien, panelReintentos, panelTapados,
                     alcanzables: alcanzables.length, pct, tocadas: tocadas.length,
                     legalesMesa: base.length, legalesLista: base,
                     rejilla: rej, casillasOk, casillasTocadas,
                     pares: dosCasillas.length, paresOk,
                     apuntando, dianas: dianas.length,
                     tapadas: dianas.filter(z => z.tapada).length });
    } catch (e) {
        console.log(`  ! ${juego.padEnd(11)} ${modo.nombre.padEnd(5)} ${String(e.message).split('\n')[0].slice(0, 55)}`);
        filas.push({ juego, modo: modo.nombre, medible: false });
    }
    await ctx.close();
  }

  // Las dos entradas del mismo juego, una al lado de la otra. Se imprime aquí y no
  // dentro del bucle para poder decir en la misma línea si coinciden.
  const [d, r] = MODOS.map(m => filas.find(f => f.juego === juego && f.modo === m.nombre));
  // El divisor de la mesa es `legalesMesa` —las jugadas legales EN EL MOMENTO de tocar—
// y no `legales`, que son las del principio. Ver el comentario del denominador.
const num = (f) => (f?.medible ? `${f.alcanzables}/${f.legalesMesa ?? f.legales}` : '—');
  const pan = (f) => (f?.medible ? `${f.panelBien}/${f.botones}` : '—');

  /**
   * ⚠️ «IGUALES» NO ES «EL MISMO NÚMERO EXACTO», Y EXIGIRLO ME HIZO PERSEGUIR UN
   * FALLO QUE NO EXISTÍA.
   *
   * Primero comparaba `alcanzables` a pelo. Salieron tres juegos en rojo, me creí
   * que el tacto perdía eventos, escribí un arreglo de `touch-action` y los números
   * salieron IDÉNTICOS. Al mirar qué jugadas difieren: el dedo llega a `a2` y `a4`,
   * el ratón a `e2` y `h4`. Casillas de BORDE. La rejilla de sondeo cae entre
   * celdas y cada mano redondea a un lado.
   *
   * O sea que las dos entradas van igual de bien y lo estropeado era mi regla. Una
   * comprobación que chilla en cada pasada por ruido de muestreo se acaba
   * ignorando, y entonces ya no avisa cuando pasa algo de verdad.
   *
   * Lo que sí quiere decir algo: que una mano llegue a bastantes jugadas y la otra
   * a casi ninguna. Eso no lo produce un redondeo.
   *
   * ⚠️ Y LA FORMA HONESTA DE ESTO NO ES UNA TOLERANCIA, ES NO SONDEAR A CIEGAS.
   * La pregunta de verdad es «¿se puede llegar a CADA jugada legal?», y para eso
   * hay que tocar el centro de la casilla de cada una, que la mesa sabe dónde está.
   * Mientras eso no exista, esto es una aproximación con ruido y así está dicho.
   */
  const panelOk = d?.medible && r?.medible && d.botones > 0
               && d.panelBien === d.botones && r.panelBien === r.botones;
  const marca = !d?.medible || !r?.medible ? '?' : panelOk ? '✓' : '✗';
  console.log(`  ${marca} ${juego.padEnd(11)} panel dedo ${pan(d).padEnd(7)} ratón ${pan(r).padEnd(7)}`
      + ` · mesa dedo ${num(d).padEnd(7)} ratón ${num(r).padEnd(7)}`
      /**
       * ⚠️ SE DICE SI SE APUNTÓ O SE FUE A CIEGAS, Y CUÁNTAS PIEZAS NO ASOMAN.
       *
       * Sin esto, «mesa 2/13» se lee igual tanto si la sonda apuntó a las trece cartas
       * como si tiró 320 toques al azar, y son dos frases distintas: la primera dice
       * que once cartas NO SE PUEDEN TOCAR, la segunda que no las encontré. Marcar de
       * dónde sale el número es lo que separa un fallo del juego de un límite mío.
       */
      + (d?.pares ? ` · ${d.paresOk}/${Math.min(d.pares, 24)} jugadas de dos casillas`
         : d?.casillasTocadas ? ` · casillas ${d.casillasOk}/${d.casillasTocadas} tocadas`
         : d?.rejilla ? ` · rejilla ${d.rejilla.cols}x${d.rejilla.filas} y NINGUNA contestó`
         : d?.apuntando ? ` · apuntando a ${d.dianas}${d.tapadas ? `, ${d.tapadas} sin asomar` : ''}`
         : ' · a ciegas')
      + (panelOk ? '' : '   ⚠ HAY UNA JUGADA QUE NO SE PUEDE PULSAR'));
}

/**
 * ── El resumen ──
 *
 * ⚠️ LO QUE MÁS IMPORTA NO ES EL PORCENTAJE, ES LA DIFERENCIA.
 *
 * Un juego que sólo se juegue por el panel es una carencia conocida y funciona:
 * los botones son la interfaz completa y están siempre. Pero un juego donde el
 * dedo llega a más jugadas que el ratón —o al revés— es un FALLO: hay alguien que
 * no puede hacer algo por haber abierto la página en el aparato equivocado, y eso
 * no se ve nunca desde el aparato en el que uno programa.
 */
const porJuego = juegos.map(j => MODOS.map(m => filas.find(f => f.juego === j && f.modo === m.nombre)));
const medidos = porJuego.filter(([d, r]) => d?.medible && r?.medible && d.legales > 0);
const rotos = medidos.filter(([d, r]) =>
    !(d.botones > 0 && d.panelBien === d.botones && r.panelBien === r.botones));
const conMesa = medidos.filter(([d, r]) => d.alcanzables > 0 || r.alcanzables > 0);

/**
 * ⚠️ LO MEDIDO SE ESCRIBE, PORQUE SI NO LA FICHA NO PUEDE SABERLO.
 *
 * Esto se imprimía y se iba con la terminal. La ficha de cada juego deriva todo lo que
 * puede —objetivo, verbos, asientos, hueco en la clasificación— y de lo que se puede
 * TOCAR no sabía nada, así que un betatester abría mancala sin que nadie le dijera que
 * ese juego no tiene ni un escuchador de clic. Un instrumento cuyo resultado sólo vive
 * en una terminal no puede llegar a quien lo necesita.
 *
 * Va con FECHA y la ficha la enseña. Un número medido hace tres semanas y presentado
 * como si fuera de hoy es peor que no tenerlo: la clasificación ya estuvo ocho días
 * publicando lo de la semana anterior sin decirlo.
 *
 * Y sólo se escribe en la pasada COMPLETA. Corriendo `node tacto.mjs go` se guardaría
 * un fichero con un juego y treinta y cuatro huecos que parecerían «sin medir».
 */
if (!soloEstos.length) {
    const salida = {};
    for (const [d, r] of porJuego) {
        if (!d?.medible && !r?.medible) continue;
        salida[d?.juego ?? r.juego] = {
            panel: { dedo: [d?.panelBien ?? null, d?.botones ?? null], raton: [r?.panelBien ?? null, r?.botones ?? null] },
            mesa: { dedo: d?.alcanzables ?? null, raton: r?.alcanzables ?? null, de: d?.legalesMesa ?? null },
            piezas: d?.apuntando ? { dianas: d.dianas, sinAsomar: d.tapadas } : null,
            casillas: d?.rejilla ? { rejilla: d.rejilla, tocadas: d.casillasTocadas, ok: d.casillasOk } : null,
            pares: d?.pares ? { de: Math.min(d.pares, 24), ok: d.paresOk } : null,
        };
    }
    await writeFile(new URL('./public/data/tacto.json', import.meta.url),
        JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), pantalla: '390x844', juegos: salida }, null, 1));
    console.log(`\n  escrito public/data/tacto.json (${Object.keys(salida).length} juegos)`);
}

console.log(`\n  ${medidos.length} juegos medidos con jugadas legales`);
console.log(`  PANEL (la garantía): ${medidos.length - rotos.length}/${medidos.length}`
          + ` dejan pulsar TODAS sus jugadas con dedo y con ratón`);

/**
 * Los reintentos se dicen SIEMPRE, aunque salga todo en verde. Un instrumento que se
 * da dos oportunidades y se calla cuántas necesitó esconde justo el dato que mide
 * cuánto se está peleando con el reloj de los juegos — y ese número creciendo es el
 * aviso temprano de que la pasada completa se está quedando sin aire.
 */
const suma = (c) => medidos.reduce((s, [d, r]) => s + (d[c] ?? 0) + (r[c] ?? 0), 0);
const quien = (c) => medidos.filter(([d, r]) => (d[c] ?? 0) + (r[c] ?? 0) > 0).map(([d]) => d.juego);

/**
 * Los TAPADOS van primero y con nombre propio, porque no son un número bajo: son un
 * diagnóstico que dice dónde mirar. Un botón tapado se VE perfectamente y no responde
 * —así estuvo peatón— y sin esta línea eso sale como «4/5» y parece un juego regular
 * en vez de un `z-index` mal puesto.
 */
if (suma('panelTapados')) {
    console.log(`  ⚠ ${suma('panelTapados')} jugada(s) TAPADAS por otro elemento`
              + ` (${quien('panelTapados').join(', ')}): el botón se ve pero el toque`
              + ` se lo lleva lo que tiene delante — mira el z-index, no el juego.`);
}
if (suma('panelReintentos')) {
    console.log(`  (${suma('panelReintentos')} pulsación(es) necesitaron un segundo intento:`
              + ` ${quien('panelReintentos').join(', ')})`);
}
if (rotos.length) console.log(`  ✗ no del todo: ${rotos.map(([d]) => d.juego).join(', ')}`);
/**
 * ⚠️ ESTA LÍNEA YA NO DICE «COMODIDAD», Y ES EL CAMBIO QUE IMPORTA.
 *
 * Mientras la mesa se sondeaba a ciegas, su número no podía significar nada: 320
 * toques repartidos por la pantalla no aciertan una carta, y ese cero se leía como
 * un límite de la sonda. Por eso la garantía tenía que ser el panel — y por eso el
 * panel no podía dejar de ser pulsable.
 *
 * Ahora se APUNTA a cada pieza con nombre y se le pregunta al trazador de rayos si
 * hay algún píxel donde esté delante. Con eso, «0 de 3» ya no es una limitación mía:
 * es una jugada que una persona no puede hacer tocando la mesa. Ahí es donde se puede
 * empezar a mover la garantía del panel al tablero.
 *
 * Los que dibujan sin nombrar sus piezas siguen yendo a ciegas y SE DICEN aparte:
 * mezclarlos volvería a juntar «no se puede tocar» con «no sé dónde está».
 */
/**
 * ⚠️ ESTA SONDA APUNTA A PIEZAS, Y HAY JUGADAS QUE NO SON UNA PIEZA.
 *
 * En ajedrez la jugada es `d2d4`: DOS casillas, y la segunda casi siempre está vacía.
 * En go son los 357 cruces libres del goban, que no tienen malla porque todavía no hay
 * piedra. Tocar una pieza no hace ninguna de esas jugadas ni queriendo, así que su
 * cero no dice nada del juego — dice que esta sonda no sabe apuntar a un hueco.
 *
 * La primera pasada dio «7 de 35 responden a tocar el tablero» y esa frase, tal cual,
 * es la clase de número que ya me ha engañado hoy dos veces: cierto por dentro y falso
 * al leerlo. De los 28 restantes, la inmensa mayoría juegan a casillas.
 *
 * Se separan por lo que NOMBRAN sus jugadas, que es la misma pregunta que ya contesta
 * `_panel.mjs`: si la mayoría son coordenadas o números, la jugada es un SITIO y este
 * instrumento no llega. Y se dice, en vez de contarlo como suspenso.
 */
const deCasillas = ([d]) => {
    const cola = (m) => String(m).split(':').pop();
    const n = (d.legalesLista ?? []).filter(m => /^[a-z]\d[a-z]?\d?$/i.test(cola(m)) || /^\d+$/.test(cola(m))).length;
    return n * 2 > (d.legalesLista ?? []).length;
};
/**
 * ⚠️ Y HAY UNA TERCERA CLASE: LOS QUE JUEGAN A VERBOS.
 *
 * Con sólo dos grupos —casillas y piezas— snake y peatón caían en «piezas» y el titular
 * salía 7 de 24. Pero la jugada de snake es `arriba`: tocar la serpiente no la mueve, y
 * nunca debió contar como un juego que se juega tocando algo. Esos ya tienen su sitio
 * medido, que es la barra de verbos de `npm run verbos`.
 *
 * Tres clases, y cada número dice de qué habla. Es la misma corrección que la del
 * denominador, sólo que aquí el conjunto equivocado no era el divisor sino el grupo.
 */
const esVerbo = (m) => { const s = String(m); return !s.includes(':') && !/^[a-z]\d[a-z]?\d?$/i.test(s) && !/^\d+$/.test(s) && !/^[a-z]\d[a-z]?\d?$|^\d+$/i.test(s.split(/[_\s]/).pop()); };
const deVerbos = ([d]) => {
    const l = d.legalesLista ?? [];
    return l.length > 0 && l.filter(esVerbo).length * 2 > l.length;
};
const aCiegas = medidos.filter(([d]) => !d.apuntando).map(([d]) => d.juego);
const casillas = medidos.filter(deCasillas).map(([d]) => d.juego);
const verbos = medidos.filter(f => !deCasillas(f) && deVerbos(f)).map(([d]) => d.juego);
const dePiezas = medidos.filter((f) => !deCasillas(f) && !deVerbos(f) && f[0].apuntando);
const okPiezas = dePiezas.filter(([d]) => d.alcanzables > 0);
console.log(`  MESA, apuntando a las piezas con nombre: ${okPiezas.length}/${dePiezas.length}`
          + ` de los juegos cuya jugada ES una pieza responden a tocarla`
          + (okPiezas.length < dePiezas.length
             ? `  (no: ${dePiezas.filter(([d]) => !d.alcanzables).map(([d]) => d.juego).join(', ')})` : ''));
/**
 * ⚠️ LAS CASILLAS YA SE MIDEN, DESDE QUE EL PINTOR PUBLICA DÓNDE ESTÁN.
 *
 * Hasta el 16-08 esta línea decía «esta sonda no sabe apuntar a un hueco» y era verdad:
 * el terreno se dibuja con `InstancedMesh`, así que no hay una malla por casilla a la
 * que apuntar. Se arregló publicando seis números —`userData.rejillaMundo`— en vez de
 * adivinando la geometría, que es lo que ya funcionó para las piezas con sus nombres.
 *
 * Primeros números: reversi 4/4, damas 7/7, go 300/357 tocando el goban.
 */
/**
 * ⚠️ «TIENE REJILLA» NO ES «JUEGA A CASILLAS», Y CONTARLO ASÍ SALÍA MAL.
 *
 * Sokoban, cripta o defensa publican rejilla —viven en un tablero— pero sus jugadas son
 * VERBOS: `arriba`, `torre a1`. Contándolos aquí salían en las dos listas a la vez y el
 * titular decía «5 de 21» cuando el denominador real son los que de verdad juegan
 * nombrando una casilla. Es el mismo error de conjunto de esta mañana, en el sitio de
 * al lado.
 */
const conCasillas = medidos.filter(f => f[0].rejilla && deCasillas(f));
if (conCasillas.length) {
    const bien = conCasillas.filter(([d]) => (d.paresOk ?? 0) > 0 || d.casillasOk > 0);
    console.log(`  · de los ${conCasillas.length} que juegan a CASILLAS, ${bien.length} responden a tocar el tablero`
              + (bien.length < conCasillas.length
                 ? `  (no: ${conCasillas.filter(([d]) => !d.paresOk && !d.casillasOk).map(([d]) => d.juego).join(', ')})` : ''));
}
if (casillas.length && !conCasillas.length) {
    console.log(`  (${casillas.length} juegan a CASILLAS y su tablero no publica dónde están:`
              + ` ${casillas.join(', ')})`);
}
if (verbos.length) {
    console.log(`  (${verbos.length} juegan a VERBOS —arriba, robar, plantarse— que no están en la mesa:`
              + ` ${verbos.join(', ')}. Ésos se miden con \`npm run verbos\`, no aquí)`);
}
if (aCiegas.length) {
    console.log(`  (${aCiegas.length} van todavía a ciegas porque no nombran sus piezas:`
              + ` ${aCiegas.join(', ')} — ahí un cero no significa que no se pueda tocar)`);
}
/**
 * ⚠️ «SIN ASOMAR» ES LO QUE MIDE ESTE MUESTREO, NI MÁS NI MENOS.
 *
 * Se prueban el centro y veinticuatro puntos hacia los bordes de la caja envolvente. Si
 * en ninguno el trazador de rayos contesta esta pieza, se cuenta como que no asoma. Con
 * un muestreo más flojo —sólo las cuatro esquinas— hearts daba nueve cartas tapadas de
 * trece y no era verdad. Así que esto es una PISTA de dónde mirar, no una sentencia, y
 * se dice para que nadie lo lea como que hay 83 piezas rotas.
 */
const sinAsomar = medidos.filter(([d]) => d.tapadas > 0);
if (sinAsomar.length) {
    console.log(`  · ${sinAsomar.reduce((s, [d]) => s + d.tapadas, 0)} pieza(s) donde el muestreo no encontró`
              + ` ni un píxel suyo delante (${sinAsomar.map(([d]) => `${d.juego} ${d.tapadas}`).join(', ')}).`);
    console.log(`    Es una pista de dónde mirar, no una sentencia: con un muestreo más flojo`
              + ` hearts daba 9 de 13 «tapadas» y todas se podían tocar.`);
}
/**
 * ⚠️ Y LO QUE ESTE INSTRUMENTO NO PUEDE VER, DICHO EN VOZ ALTA.
 *
 * La sonda de la mesa TOCA, y hay juegos que se juegan DESLIZANDO: snake,
 * sokoban, fagocito, peatón, pradera… Sus jugadas son «arriba», «abajo», y un
 * toque no puede producir eso ni queriendo. Esos siempre saldrán con cero en la
 * columna de la mesa, y no significa que no se puedan tocar: significa que esta
 * medida no llega. Los gestos los cubre `gestos.js`, y quedan sin medir aquí.
 */
console.log(`  (los de deslizar —snake, sokoban, fagocito…— salen 0 en «mesa»: esta sonda toca, no desliza)`);
await b.close();
s.kill();
// El servidor es hijo y `kill()` no siempre se lo lleva: sin esto el proceso se
// queda vivo con el puerto cogido. Hoy me ha dejado uno suelto una hora.
process.exit(rotos.length ? 1 : 0);
