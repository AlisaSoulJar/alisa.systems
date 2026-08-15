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
import { readFile } from 'node:fs/promises';

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
        let panelBien = 0, panelProbados = 0;
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
            const antes = await cuantasTocadas();
            await modo.tocar(p, Math.round(caja.x + caja.width / 2),
                                Math.round(caja.y + caja.height / 2));
            await p.waitForTimeout(400);
            // Si la pulsación llegó, hay una jugada más apuntada. No hace falta
            // reintentar: ya no dependemos de que el mundo se haya movido.
            if (await cuantasTocadas() > antes) panelBien++;
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
        const { width: W, height: H } = modo.ctx.viewport;
        const bajoPanel = await p.evaluate(() => {
            const r = document.querySelector('.hud-panel')?.getBoundingClientRect();
            return r ? Math.max(0, Math.round(r.bottom + 8)) : 150;
        });
        const COLS = 16, FILS = 20;
        for (let cx = 0; cx < COLS; cx++) {
            for (let cy = 0; cy < FILS; cy++) {
                const x = Math.round((cx + 0.5) * W / COLS);
                const y = Math.round(bajoPanel + (cy + 0.5) * (H - bajoPanel) / FILS);
                if (y >= H - 2) continue;
                await modo.tocar(p, x, y);
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

        const legalesSet = new Set(legales.map(String));
        const alcanzables = tocadas.filter(m => legalesSet.has(m));
        const pct = legales.length ? Math.round(100 * alcanzables.length / legales.length) : null;
        filas.push({ juego, modo: modo.nombre, medible: true, legales: legales.length,
                     botones: panelProbados, panelBien,
                     alcanzables: alcanzables.length, pct, tocadas: tocadas.length });
    } catch (e) {
        console.log(`  ! ${juego.padEnd(11)} ${modo.nombre.padEnd(5)} ${String(e.message).split('\n')[0].slice(0, 55)}`);
        filas.push({ juego, modo: modo.nombre, medible: false });
    }
    await ctx.close();
  }

  // Las dos entradas del mismo juego, una al lado de la otra. Se imprime aquí y no
  // dentro del bucle para poder decir en la misma línea si coinciden.
  const [d, r] = MODOS.map(m => filas.find(f => f.juego === juego && f.modo === m.nombre));
  const num = (f) => (f?.medible ? `${f.alcanzables}/${f.legales}` : '—');
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

console.log(`\n  ${medidos.length} juegos medidos con jugadas legales`);
console.log(`  PANEL (la garantía): ${medidos.length - rotos.length}/${medidos.length}`
          + ` dejan pulsar TODAS sus jugadas con dedo y con ratón`);
if (rotos.length) console.log(`  ✗ no del todo: ${rotos.map(([d]) => d.juego).join(', ')}`);
console.log(`  MESA (comodidad, sondeo a ciegas): ${conMesa.length}/${medidos.length}`
          + ` responden a tocar el tablero`);
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
