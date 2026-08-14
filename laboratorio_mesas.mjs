/**
 * laboratorio_mesas.mjs — abre los 31 juegos en un navegador de verdad y los mide
 * ═══════════════════════════════════════════════════════════════════════════════
 *     npm run laboratorio            los 31
 *     npm run laboratorio -- brisca  uno
 *
 * ⚠️ POR QUÉ EXISTE, CON LOS NÚMEROS DEL DÍA QUE LO PARIÓ
 *
 * El 11 de agosto de 2026 abrí por primera vez diez juegos que nadie había mirado.
 * Seis estaban rotos:
 *
 *     brisca      abría su mesa y repartía ENTROPY
 *     unit        pintaba sus cartas azules como bastos, la pinta española
 *     poker       turno tuyo, dos jugadas legales, cero botones en pantalla
 *     peatón      escribía en un HUD que no existía: se jugaba a ciegas
 *     ajedrez     tablero de 2,55 m con piezas de medio metro sobre la mesa
 *     las cartas  de número llevaban años con 1,8% de tinta — ilegibles
 *
 * Ninguno daba un error. Todos pasaban `npm test`. Los seis se encontraron
 * MIRÁNDOLOS, uno a uno, con medidas que me inventé sobre la marcha.
 *
 * Quedan dieciséis juegos que nadie ha abierto nunca. A ese ritmo hay varios rotos
 * ahora mismo. Y el problema de fondo no son esos dieciséis: es que el arreglo de
 * hoy no deja nada puesto, así que el juego 32 se romperá igual y en silencio.
 *
 * ⚠️ QUÉ SE MIDE, Y POR QUÉ ESTAS SEIS COSAS Y NO OTRAS
 *
 * Cada una nació de un fallo real de ese día, y todas valen para los 31 sin saberse
 * ninguno — ni listas de juegos, ni nombres de campos, ni casos especiales:
 *
 *   1 CONSOLA      cero excepciones. La más barata y la que menos caza, porque
 *                  aquí lo que rompe casi nunca lanza.
 *   2 IDENTIDAD    el juego que el motor cree estar dibujando es el de la página.
 *                  Un `?? 'entropy'` en el sitio donde se decide QUÉ se juega
 *                  convierte una dirección equivocada en otra partida, callando.
 *   3 SE VE ALGO   la pantalla no está vacía. Es la medida más tonta y la que más
 *                  habría cazado: la pantalla negra del aspecto NaN, la mesa sin
 *                  cartas, el go sin piedras durante meses. No mira el DOM ni la
 *                  escena: mira los PÍXELES, así que da igual cómo dibuje cada uno.
 *   4 JUGABLE      una jugada legal, hecha COMO LA HARÍA ALGUIEN —clic en la
 *                  interfaz, o teclas—, llega al hub y cambia el estado. Poker
 *                  tenía jugadas legales y ninguna forma de mandarlas; eso no se ve
 *                  preguntándole al juego, sólo intentándolo.
 *   5 SE MUEVE     y la pantalla cambia al jugar. Dos TWEEN cargados dejaron las
 *                  cartas clavadas donde nacen: el estado avanzaba y la imagen no.
 *                  Un render que no mira el estado es un espectador dormido.
 *   6 REPRODUCIBLE la misma `?semilla=` da el mismo reparto dos veces. Poker
 *                  prometía partida fija y repartía al azar: `semilla: 3426103106`
 *                  con `?semilla=7` en la barra.
 *
 * ⚠️ Y POR QUÉ EN UN NAVEGADOR DE VERDAD Y NO SIMULADO
 * Los seis fallos de arriba viven ENTRE las reglas y la pantalla. Las reglas
 * pasaban sus pruebas; el estado era correcto en todos los casos. Lo que fallaba
 * era el trecho que ninguna prueba de Node puede recorrer.
 *
 * Usa el Chrome que ya está instalado (`channel: 'chrome'`), así que no descarga
 * un navegador de 500 MB para esto.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const PUERTO = 8123;                      // suyo, para no pelearse con el de mano
const SEMILLA = 7;
const CAPTURAS = new URL('./capturas_laboratorio/', import.meta.url);

/**
 * ⚠️ ESTOS DOS SUELOS LOS PUSE A OJO Y SUSPENDIERON A JUEGOS SANOS.
 *
 * La primera pasada dio 19 rotos de 31, y casi todos eran culpa mía. Los números
 * que lo enseñaron, medidos:
 *
 *   · las mesas de TEXTO (`mesa.html`, once juegos) pintan 2,1–3,6% — son letras
 *     sobre fondo claro, no una escena. A 1,5% aprobaban de milagro y sokoban
 *     (1,8%) casi suspende estando perfecto. Una pantalla de verdad vacía da 0,0.
 *   · el GO mueve 0,1% al poner una piedra, porque es UNA piedra en un tablero de
 *     19×19. A 0,25% lo acusé de no repintar, y repinta bien.
 *
 * Así que los suelos separan «nada» de «algo», que es lo único que se puede
 * afirmar sin conocer cada juego. Lo demás lo dicen las capturas, que para eso se
 * guardan: un humano ve 31 imágenes en medio minuto y ninguna prueba compite con
 * eso para juzgar si algo se ve BIEN.
 */
const SUELO_PINTADO = 0.6;   // % de píxeles distintos del fondo — la negra da 0,0
const SUELO_CAMBIO = 0.03;   // % — el fallo de los dos TWEEN daba 0,00 exacto

/**
 * ⚠️ UN DECODIFICADOR DE PNG DE VEINTE LÍNEAS, Y NO UNA DEPENDENCIA.
 *
 * Sólo hace falta para contar colores, y `zlib` viene con Node. Meter una
 * biblioteca de imágenes para esto engordaría el paquete que la propia lista de
 * antes de publicar vigila. Chrome entrega PNG de 8 bits sin entrelazar, que es el
 * único caso que hay que cubrir — y si algún día no lo fuera, esto lanza en vez de
 * devolver números inventados.
 */
function leerPNG(buf) {
    let i = 8, ancho = 0, alto = 0, canales = 0, datos = [];
    while (i < buf.length) {
        const largo = buf.readUInt32BE(i);
        const tipo = buf.toString('ascii', i + 4, i + 8);
        const cuerpo = buf.subarray(i + 8, i + 8 + largo);
        if (tipo === 'IHDR') {
            ancho = cuerpo.readUInt32BE(0);
            alto = cuerpo.readUInt32BE(4);
            if (cuerpo[8] !== 8) throw new Error(`PNG de ${cuerpo[8]} bits, no lo sé leer`);
            if (cuerpo[12] !== 0) throw new Error('PNG entrelazado, no lo sé leer');
            canales = { 0: 1, 2: 3, 4: 2, 6: 4 }[cuerpo[9]];
            if (!canales) throw new Error(`PNG de tipo ${cuerpo[9]}, no lo sé leer`);
        } else if (tipo === 'IDAT') datos.push(cuerpo);
        else if (tipo === 'IEND') break;
        i += 12 + largo;
    }
    const crudo = inflateSync(Buffer.concat(datos));
    const px = Buffer.alloc(ancho * alto * canales);
    const bpp = canales;
    for (let y = 0; y < alto; y++) {
        const filtro = crudo[y * (ancho * bpp + 1)];
        const linea = crudo.subarray(y * (ancho * bpp + 1) + 1, (y + 1) * (ancho * bpp + 1));
        for (let x = 0; x < ancho * bpp; x++) {
            const a = x >= bpp ? px[y * ancho * bpp + x - bpp] : 0;
            const b = y > 0 ? px[(y - 1) * ancho * bpp + x] : 0;
            const c = (x >= bpp && y > 0) ? px[(y - 1) * ancho * bpp + x - bpp] : 0;
            let v = linea[x];
            if (filtro === 1) v += a;
            else if (filtro === 2) v += b;
            else if (filtro === 3) v += (a + b) >> 1;
            else if (filtro === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
            }
            px[y * ancho * bpp + x] = v & 0xff;
        }
    }
    return { ancho, alto, canales, px };
}

/**
 * Cuánto de la imagen NO es el fondo. El fondo se toma de las cuatro esquinas —no
 * de un color escrito aquí— porque cada juego tiene el suyo y una lista de fondos
 * sería otra lista que se separa.
 */
function pintado({ ancho, alto, canales, px }) {
    const en = (x, y) => { const o = (y * ancho + x) * canales; return [px[o], px[o + 1], px[o + 2]]; };
    const esquinas = [en(2, 2), en(ancho - 3, 2), en(2, alto - 3), en(ancho - 3, alto - 3)];
    const fondo = [0, 1, 2].map(k => Math.round(esquinas.reduce((s, e) => s + e[k], 0) / 4));
    let n = 0, total = 0;
    for (let y = 0; y < alto; y += 2) {
        for (let x = 0; x < ancho; x += 2) {
            const [r, g, b] = en(x, y);
            total++;
            if (Math.abs(r - fondo[0]) + Math.abs(g - fondo[1]) + Math.abs(b - fondo[2]) > 40) n++;
        }
    }
    return (100 * n) / total;
}

/** Cuánto cambia una imagen respecto de otra, en porcentaje de píxeles. */
function diferencia(a, b) {
    if (a.ancho !== b.ancho || a.alto !== b.alto) return 100;
    let n = 0, total = 0;
    for (let y = 0; y < a.alto; y += 2) {
        for (let x = 0; x < a.ancho; x += 2) {
            const o = (y * a.ancho + x) * a.canales;
            total++;
            if (Math.abs(a.px[o] - b.px[o])
              + Math.abs(a.px[o + 1] - b.px[o + 1])
              + Math.abs(a.px[o + 2] - b.px[o + 2]) > 40) n++;
        }
    }
    return (100 * n) / total;
}

/**
 * Lo que se mide DENTRO de la página. Va como una función que se serializa, así
 * que no puede cerrar sobre nada de aquí fuera.
 */
async function sondear(page, juego) {
    return page.evaluate(async ({ juego }) => {
        const dormir = (ms) => new Promise(r => setTimeout(r, ms));
        const hub = window.ALISA_PROTOHUB;
        if (!hub) return { error: 'la página no registró ALISA_PROTOHUB' };

        const registrados = [...(hub.reglas?.keys?.() ?? [])];
        const clave = window.ALISA_JUEGO ?? registrados[0] ?? juego;
        const st = await hub.state(clave);
        const legales = (st.legal_moves ?? st.legal_actions ?? [])
            .filter(m => m !== 'nueva' && m !== 'reset');

        return {
            registrados,
            semilla: st.semilla ?? null,
            legales: legales.length,
            lista: legales.slice(0, 40),
            estado: st,
            botones: [...document.querySelectorAll('.mesa-jugada')].length,
        };
    }, { juego });
}

/**
 * ⚠️ JUGAR COMO JUEGA ALGUIEN, NO LLAMANDO AL HUB.
 *
 * Preguntar `hub.move(...)` desde fuera comprueba las reglas, que ya las cubre
 * `npm test`. Lo que hay que comprobar aquí es que exista un CAMINO desde la
 * pantalla hasta esa llamada — poker tenía las reglas perfectas y ninguna forma de
 * usarlas. Así que se pincha `hub.move`, se intenta por los caminos que usa una
 * persona (botón, y si no hay, teclas) y se mira si llegó.
 */
async function jugarComoUnHumano(page, legales) {
    await page.evaluate(() => {
        const hub = window.ALISA_PROTOHUB;
        window.__llegó = false;
        const orig = hub.move.bind(hub);
        hub.move = (...a) => { window.__llegó = true; return orig(...a); };
    });

    const llegó = () => page.evaluate(() => window.__llegó);

    /**
     * ⚠️ TRES INTERFACES DISTINTAS, Y NINGUNA ES «LA RARA».
     *
     * Mi primera versión sólo buscaba botones `.mesa-jugada` y acusó a ONCE juegos
     * sanos de «no hay forma de mandar las jugadas». Falso las once veces:
     *
     *   · `mesa.html` (once juegos) pone sus botones en `#jugadas`, con otra clase
     *   · el ajedrez y sus primos se juegan ESCRIBIENDO la jugada y pulsando SEND
     *   · snake, fagocito y peatón, con las flechas
     *
     * Ninguna se puede adivinar mirando el DOM, y una lista de «qué juego usa qué»
     * sería la séptima lista escrita a mano de este proyecto. Así que se prueban
     * los caminos en cascada, como haría alguien que se sienta delante y no sabe:
     * pulsa lo que parece una jugada, si no escribe, si no toca las teclas. Lo que
     * se comprueba no es que exista un botón, es que la jugada LLEGUE.
     */

    // 1 · Un botón que diga una jugada legal. Cubre `mesa.html` y `mesa_cartas`
    //     sin saber la clase de ninguno de los dos.
    const botones = page.locator('button:visible, .mesa-jugada:visible');
    const n = Math.min(await botones.count(), 40);
    for (let i = 0; i < n && !(await llegó()); i++) {
        const b = botones.nth(i);
        const txt = ((await b.textContent().catch(() => '')) ?? '').trim();
        if (!txt) continue;
        // El botón puede enseñar la jugada entera (`descartar:H_Q`) o sólo su
        // parte útil (`H_Q`, porque el verbo lo dice el contexto).
        const encaja = legales.some(m => m === txt || m.endsWith(`:${txt}`) || txt.endsWith(m));
        if (encaja) await b.click({ timeout: 3000 }).catch(() => {});
    }

    /**
     * 1.bis · Un botón que NO dice la jugada, pero es un botón de jugar.
     *
     * Blackjack rotula `PEDIR` la jugada `hit` y `PLANTARSE` la `stand`: el texto
     * no encaja con nada y mi sonda lo acusaba de no tener forma de jugar teniendo
     * tres botones perfectos delante. Traducir de `hit` a `PEDIR` sería una lista
     * de a-qué-juego-corresponde-qué-rótulo, o sea la lista de siempre.
     *
     * Se prueban los demás botones, saltándose los que se sabe que ROMPEN la
     * partida en vez de jugarla. Y sí, eso es una lista escrita a mano — pero es de
     * VERBOS y no de juegos, y si algún día se queda corta el laboratorio pulsa un
     * «reiniciar» y sale un falso NEGATIVO ruidoso, no un verde callado.
     */
    if (!(await llegó())) {
        const ROMPEN = /reinici|restart|undo|deshacer|stop|parar|nueva|otra|verificar|aportar|salir|plegar|copiar/i;
        for (let i = 0; i < n && !(await llegó()); i++) {
            const b = botones.nth(i);
            const txt = ((await b.textContent().catch(() => '')) ?? '').trim();
            if (!txt || ROMPEN.test(txt)) continue;
            await b.click({ timeout: 3000 }).catch(() => {});
        }
    }

    // 2 · Escribir la jugada. El ajedrez, las damas, el go y el xiangqi.
    if (!(await llegó())) {
        const campo = page.locator('input[type=text]:visible, input:not([type]):visible').first();
        if (await campo.count()) {
            await campo.fill(legales[0] ?? '').catch(() => {});
            await campo.press('Enter').catch(() => {});
            if (!(await llegó())) {
                // Algunos no escuchan Enter: el botón de al lado.
                for (const nombre of ['SEND', 'send', 'Enviar', 'enviar', 'jugar', 'OK']) {
                    const bt = page.getByRole('button', { name: nombre, exact: false }).first();
                    if (await bt.count()) { await bt.click({ timeout: 3000 }).catch(() => {}); break; }
                }
            }
        }
    }

    // 3 · Las teclas.
    if (!(await llegó())) {
        await page.locator('body').click({ position: { x: 640, y: 400 } }).catch(() => {});
        for (const t of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'w', 'Enter', 'Space']) {
            await page.keyboard.press(t).catch(() => {});
            if (await llegó()) break;
        }
    }

    await page.waitForTimeout(1000);
    return llegó();
}

// ── El servidor ─────────────────────────────────────────────────────────────
const servidor = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/index.html`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

// ── Los juegos ──────────────────────────────────────────────────────────────
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);
await mkdir(CAPTURAS, { recursive: true });

/**
 * Lo que cada juego reparte con esta semilla, según sus PROPIAS reglas corriendo
 * en Node. Es la vara contra la que se mide lo que hace la página.
 */
const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');

/**
 * ⚠️ LA HUELLA BORRA CLAVES, NO RECORTA TEXTO — Y CUÁLES BORRA SE MIDIÓ.
 *
 * La primera versión tachaba campos con una expresión regular sobre el JSON, y
 * suspendió a los 31 con el mismo mensaje. Treinta y uno de treinta y uno con el
 * mismo fallo es un instrumento roto, no treinta y un juegos rotos.
 *
 * Se comparó campo a campo en vez de razonarlo, y la diferencia era ésta:
 *
 *     sólo en la página : fuente, conexion   ← objetos; la regex sólo pillaba
 *                                              cadenas y números, así que se
 *                                              quedaban y todo difería
 *     valor distinto    : biblioteca  node=false  página=true
 *
 * Y ese `biblioteca` no es un fallo: dice que el navegador lee el catálogo de
 * cartas de verdad y que Node cayó al respaldo porque `fetch` no sirve `file://`.
 * Es la distinción que `prueba_biblioteca.mjs` existe para vigilar — o sea que
 * comparar ese campo entre los dos mundos es comparar dos cosas que TIENEN que
 * ser distintas.
 *
 * Las otras que se ignoran son las del reloj: peatón, rebaño y pradera tienen un
 * mundo que avanza solo, y entre dos cargas pasan segundos reales. Lo que tiene
 * que coincidir es el REPARTO, no el cronómetro.
 */
/**
 * `objetivo` se añade también aquí, y la prueba tenía razón en quejarse.
 *
 * Lo pone el HUB —`ProtoHub.state` lo copia de `reglas.OBJETIVO`— y no el `estado()`
 * del juego, así que la página publica un campo que las reglas en Node no producen y
 * esta comprobación cantó «el estado que publica no es el de sus reglas» en los nueve
 * juegos que acababa de tocar. Nueve a la vez, y todos los que había tocado: el aviso
 * era exacto.
 *
 * Va aquí y no se quita del hub: el objetivo es constante y meterlo en el `estado()`
 * de cada juego obligaría a treinta y cinco a acordarse de copiarlo en cada vuelta.
 */
const FUERA = new Set(['fuente', 'conexion', 'biblioteca', 'objetivo',
                       't', 'tick', 'turnos', 'pasos', 'tiempo']);
const limpia = (st) => JSON.stringify(
    Object.fromEntries(Object.entries(st ?? {}).filter(([k]) => !FUERA.has(k))));

/**
 * ⚠️ Y LA IDENTIDAD SE MIDE POR EL VOCABULARIO, NO POR EL REPARTO.
 *
 * Comparar el estado entero contra un reparto recién hecho en Node suspendió al
 * go, al reversi y al peatón. Ninguno estaba roto: cuando el laboratorio mira,
 * esas páginas YA HAN JUGADO —el go y el reversi tienen turno de blancas, o sea
 * que las negras movieron— o su mundo avanza solo, como el peatón, que llevaba
 * dos ticks. Estaba comparando algo vivo contra una foto del segundo cero.
 *
 * Lo que NO cambia al avanzar una partida es de qué habla: la brisca dice
 * `triunfo`, `baza`, `bazas`; entropy dice `caja`, `descarte`,
 * `comodin_destapado`. Un juego que cargue las reglas de otro tiene el
 * vocabulario del otro desde el primer fotograma hasta el último — así que la
 * brisca que repartía entropy habría cantado igual, y un tablero que empieza
 * jugando no.
 */
const vocabulario = (st) => Object.keys(st ?? {})
    .filter(k => !FUERA.has(k)).sort().join(',');
const esperado = {};
for (const j of juegos) {
    try {
        const r = await cargarReglas(j, {});
        esperado[j] = vocabulario(r.estado(r.nuevaPartida({ semilla: SEMILLA, seed: SEMILLA })));
    } catch { /* si no cargan aquí, el navegador lo dirá a su manera */ }
}

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const filas = [];

console.log(`\n¿Se puede jugar a los ${juegos.length}? Chrome de verdad, ${base}\n`);

for (const juego of juegos) {
    const p = paginas[juego];
    const url = `${base}/arcade/${p.pagina}?semilla=${SEMILLA}`
              + (p.pagina === 'mesa.html' ? `&juego=${juego}` : '');
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(String(e).slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errores.push(m.text().slice(0, 120)); });

    const f = { juego, mal: [], nota: [] };
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 25000 });
        await page.waitForFunction(() => !!window.ALISA_PROTOHUB, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2600);          // que reparta y termine de animar

        const a = await sondear(page, juego);
        if (a.error) { f.mal.push(a.error); throw new Error(a.error); }

        /**
         * 2 · IDENTIDAD — CONTRA LO QUE REPARTEN LAS REGLAS EN NODE, Y NO CONTRA
         * UN NOMBRE.
         *
         * Mi primera versión comparaba `window.ALISA_JUEGO` con el nombre del
         * fichero y acusaba al ajedrez de «dibuja chess y la página es de ajedrez».
         * Falso: `chess` y `checkers` son alias declarados a propósito en el
         * `idJuego` de `montarMesa`. La segunda miraba `estado.juego`, y resulta
         * que los tableros no lo publican — sale `undefined` en los cuatro.
         *
         * Lo que de verdad importa no es cómo se llame: es que la página reparta LA
         * MISMA PARTIDA que las reglas con esa semilla. Se calcula en Node y se
         * compara. Una sola comprobación que dice a la vez que cargó las reglas
         * buenas, que la semilla llegó y que el reparto es reproducible — y con la
         * que la brisca que repartía entropy habría cantado a la primera.
         */
        if (esperado[juego] && vocabulario(a.estado) !== esperado[juego]) {
            f.mal.push('el estado que publica no es el de sus reglas — ¿cargó otro juego?');
        }
        if (a.semilla !== null && a.semilla !== SEMILLA) {
            f.mal.push(`?semilla=${SEMILLA} y reparte con ${a.semilla}`);
        }

        // 3 · SE VE ALGO
        const img1 = leerPNG(await page.screenshot({ type: 'png' }));
        await writeFile(new URL(`${juego}.png`, CAPTURAS), await page.screenshot({ type: 'png' }));
        f.pintado = +pintado(img1).toFixed(1);
        if (f.pintado < SUELO_PINTADO) f.mal.push(`pantalla casi vacía (${f.pintado}% pintado)`);

        // 4 · JUGABLE  y  5 · SE MUEVE
        f.legales = a.legales;
        if (!a.legales) {
            f.nota.push('sin jugadas legales al empezar');
        } else {
            f.llega = await jugarComoUnHumano(page, a.lista);
            if (!f.llega) f.mal.push(`${a.legales} jugadas legales y ninguna forma de mandarlas`);
            else {
                /**
                 * ⚠️ SE ESPERA A QUE LA PANTALLA PUEDA HABER CAMBIADO. AQUÍ ESTABA
                 * EL TEMBLOR DEL LABORATORIO.
                 *
                 * Esto tomaba la segunda foto INMEDIATAMENTE después de jugar. Pero
                 * lo que se ve no cambia al mandar la jugada: cambia cuando el
                 * sondeo trae el estado nuevo —cada segundo— y cuando la animación
                 * termina —medio segundo más—. Así que la foto salía a veces antes y
                 * a veces después, según cómo fuera de cargada la máquina.
                 *
                 * De ahí el sintoma: 34/35 con un juego DISTINTO cada tanda —
                 * parchís, tute, pradera— y 35/35 al repetir, siempre con el mismo
                 * porcentaje de cambio de siempre. Tres veces lo di por
                 * inestabilidad y seguí adelante; me apoyé en este verde unas quince
                 * veces en un día.
                 *
                 * Ahora se mira hasta que cambia o hasta que se acaba el plazo. Si
                 * cambia, el número es el de verdad y llega antes; si no cambia en
                 * cuatro segundos, es que no cambia — y eso ya es un hallazgo, no un
                 * accidente de reloj.
                 */
                const PLAZO = 4000, PASO = 400;
                let img2 = leerPNG(await page.screenshot({ type: 'png' }));
                f.cambio = +diferencia(img1, img2).toFixed(1);
                for (let t = 0; t < PLAZO && f.cambio < SUELO_CAMBIO; t += PASO) {
                    await page.waitForTimeout(PASO);
                    img2 = leerPNG(await page.screenshot({ type: 'png' }));
                    f.cambio = +diferencia(img1, img2).toFixed(1);
                }
                if (f.cambio < SUELO_CAMBIO) {
                    f.mal.push(`se juega y la imagen no cambia en ${PLAZO / 1000}s (${f.cambio}%)`);
                }
            }
        }

        // 6 · REPRODUCIBLE (misma semilla, mismo reparto)
        const page2 = await ctx.newPage();
        await page2.goto(url, { waitUntil: 'load', timeout: 25000 });
        await page2.waitForFunction(() => !!window.ALISA_PROTOHUB, { timeout: 15000 }).catch(() => {});
        await page2.waitForTimeout(2000);
        const b = await sondear(page2, juego);
        /**
         * ⚠️ SÓLO SE EXIGE REPRODUCIBILIDAD A LOS QUE ESTÁN QUIETOS, Y QUIÉN LO
         * ESTÁ SE COMPRUEBA, NO SE APUNTA EN UNA LISTA.
         *
         * El peatón suspendía por «la misma semilla reparte distinto», y es que su
         * mundo avanza solo: entre dos cargas pasan segundos reales y los coches se
         * han movido. Eso no es azar mal sembrado, es su género — y rebaño y
         * pradera igual.
         *
         * Se mira si el estado cambia SIN TOCAR NADA. Si cambia, el juego corre con
         * el reloj y su reparto no se puede comparar entre dos cargas distintas;
         * eso ya lo cubre `prueba_semillas.mjs`, que lo hace en Node con el tiempo
         * parado. Aquí se anota y se sigue.
         */
        const seMueveSolo = await page2.evaluate(async () => {
            const h = window.ALISA_PROTOHUB;
            const k = window.ALISA_JUEGO ?? [...(h.reglas?.keys?.() ?? [])][0];
            const antes = JSON.stringify(await h.state(k));
            await new Promise(r => setTimeout(r, 1200));
            return JSON.stringify(await h.state(k)) !== antes;
        }).catch(() => false);

        if (seMueveSolo) f.nota.push('su mundo avanza solo: reproducibilidad no comparable aquí');
        else if (limpia(b.estado) !== limpia(a.estado)) {
            f.mal.push('la misma semilla reparte distinto dos veces');
        }
        await page2.close();

        // 1 · CONSOLA
        if (errores.length) f.mal.push(`consola: ${errores[0]}`);
    } catch (e) {
        if (!f.mal.length) f.mal.push(String(e.message ?? e).slice(0, 100));
    }
    await ctx.close();

    filas.push(f);
    const marca = f.mal.length ? '✗' : '✓';
    console.log(`  ${marca} ${juego.padEnd(10)} `
        + `pintado ${String(f.pintado ?? '—').padStart(5)}%`
        + ` · jugadas ${String(f.legales ?? '—').padStart(3)}`
        + ` · llega ${f.llega === undefined ? '—' : (f.llega ? 'sí' : 'NO')}`
        + ` · cambia ${String(f.cambio ?? '—').padStart(5)}%`
        + (f.mal.length ? `\n      ↳ ${f.mal.join('\n      ↳ ')}` : '')
        + (f.nota.length ? `   (${f.nota.join('; ')})` : ''));
}

await navegador.close();
servidor.kill();

const rotos = filas.filter(f => f.mal.length);
console.log(`\n${rotos.length ? '✗' : '✓'} ${filas.length - rotos.length}/${filas.length} jugables`
    + (rotos.length ? ` · rotos: ${rotos.map(f => f.juego).join(', ')}` : ''));
console.log(`  capturas en capturas_laboratorio/ — 31 imágenes se miran en medio minuto\n`);
process.exit(rotos.length ? 1 : 0);
