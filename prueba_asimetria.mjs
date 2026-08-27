/**
 * prueba_asimetria.mjs — ¿SABE LA PERSONA LO QUE SABE EL AGENTE?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run asimetria            los 38
 *     npm run asimetria remigio    uno
 *
 * ⚠️ LA ÚNICA ASIMETRÍA QUE ESTE PROYECTO NO PUEDE PERMITIRSE.
 *
 * El banco compara a una persona con un agente en el MISMO juego, y esa comparación
 * sólo significa algo si los dos ven lo mismo. La puerta de texto entrega el estado
 * entero: el describidor vuelca los campos genéricamente, así que un agente lee
 * `subasta: {"finca":"Genesis-1","precio":80}` sin que nadie haya escrito una línea
 * para él. El panel, en cambio, sólo enseña lo que alguien se acordó de pintar.
 *
 * Resultado: el agente sabe cosas que la persona no. Y no en teoría —
 *
 *   · el TRIUNFO de la brisca. El texto decía «Triunfo: O» y el panel no lo ponía.
 *     Meses. Lo encontró Oscar jugando: «parece que se glitchean».
 *   · las LIGADAS del remigio. El estado publicaba `grupos` y `muerto` —la mejor
 *     información del juego, cuánto te falta para cerrar— desde el primer día, y
 *     estaban ahí para quien abriera la consola y para nadie más.
 *   · y el alisápolis nació igual: el agente veía el precio de la subasta, la caja de
 *     los dos y las fincas de cada uno; la persona, «Turno · 1000».
 *
 * Tres veces la misma forma, las tres encontradas por casualidad. Por eso esto existe.
 *
 * ⚠️ CÓMO SE MIDE, Y POR QUÉ EN UN NAVEGADOR.
 *
 * Se abre la página de verdad, se juegan unas jugadas, y se comparan DOS textos del
 * mismo momento: lo que `describirEstado` le daría a un agente y lo que el panel tiene
 * escrito. Se buscan los VALORES del primero en el segundo — números y palabras, no
 * nombres de campo, porque el panel dice «Triunfo: oros» donde el estado dice `O`.
 *
 * Podría compararse contra una lista de lo que el panel pinta, sin navegador. Sería
 * más rápido y sería otra lista escrita a mano que se separa de la realidad — que es
 * el fallo que este repositorio lleva arreglando desde agosto.
 *
 * ⚠️ Y LO QUE NO ES UNA ASIMETRÍA: LO QUE SE VE EN LA MESA.
 *
 * Un agente lee `dado: [3,3]` y la persona ve dos dados con tres puntos. Eso no es
 * información escondida, es información dibujada — y contarlo como fallo llenaría
 * esto de falsas alarmas hasta que nadie lo mirara. Así que las excepciones se
 * DECLARAN, con su motivo, en `EN_LA_MESA`. Estar ahí no es un permiso: es una deuda
 * dicha, y si una declaración deja de hacer falta esto lo denuncia — mismo trato que
 * `APARTE` en `prueba_de_las_pruebas`.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));

/**
 * Lo que el agente lee y la persona VE EN LA MESA, no en el panel. Cada entrada dice
 * qué campo y por qué se le perdona. Se comprueba que sigan haciendo falta.
 */
const EN_LA_MESA = {
    dado:      'los dados están sobre el tablero, con sus puntos',
    dados:     'ídem: son objetos, no un número del panel',
    tiradas:   'se ven los dados guardados y los que quedan por tirar',
    casilla:   'el peón está en la casilla; el número es de uso interno',
    posiciones:'las fichas están donde están, que es lo que se mira',
    mis_fichas:'las fichas propias se ven en el tablero',
    fichas:    'ídem',
    cadena:    'la cadena del dominó ES el dibujo',
    puntas:    'las dos puntas son las dos fichas de los extremos, a la vista',
    discs:     'las fichas del reversi se cuentan mirando',
    pieces:    'las piezas están en el tablero',
    longitud:  'la serpiente se ve entera',
    historial: 'el registro tiene su propio panel, plegable',
    semilla:   'sale escrita bajo el título',
    legal_moves: 'son literalmente los botones',
    marcador:  'sale en la fila de puntos',
    turn:      'sale en la fila de turno',

    // ── Fontanería: de dónde viene el estado. No es información del juego, así que
    //    no puede haber asimetría — la persona tampoco necesita saberlo.
    fuente:    'de dónde salió el estado (local o sala); no es del juego',
    conexion:  'ídem: el estado de la red',
    juego:     'el título sale en la cabecera del panel, con mayúscula',
    asiento:   'quién eres sale en la fila «Tú» cuando hay más de uno',
    is_game_over: 'la fila de estado lo dice con palabras',
    biblioteca: 'de dónde salió la baraja; interno',

    // ── Lo que está SOBRE LA MESA. Un jugador ve las cartas, las fichas y los
    //    montones; pedir que además los enumere el panel sería duplicar el dibujo.
    mano:      'tus cartas están repartidas delante de ti',
    mi_mano:   'ídem',
    mi_hoja:   'la hoja de la generala se dibuja entera',
    hojas:     'ídem, la de cada uno',
    descarte:  'el montón de descarte está en la mesa, boca arriba',
    /**
     * ⚠️ AQUÍ HABÍA UNA EXCUSA CASI CIERTA, Y UNA CASI CIERTA ES LA PEOR.
     *
     * Decía `descartes: 'ídem'` — o sea, «el montón está en la mesa boca arriba».
     * El MONTÓN sí; su CONTENIDO no: la mesa dibuja la carta de encima y unas
     * espaldas. Y el estado publicaba las hasta 24 cartas del descarte en orden,
     * así que el agente tenía memoria perfecta del montón y la persona tenía que
     * acordarse — en el remigio y el chinchón, cuya gracia medida es justo ésa.
     *
     * Esta prueba existe para cazar exactamente eso, y estaba desarmada por una
     * línea suya. Se quita la excusa; el arreglo está en `protohub/panel.js`, que
     * ya no esconde el campo.
     */

    descarte_restante: 'el montón se ve, y su altura es su tamaño',
    pozo_restante: 'el pozo es un montón dibujado, y crece y mengua',
    mazo_restante: 'ídem con el mazo',
    sueltas:   'son cartas de tu mano, delante de ti; el panel dice cuántos puntos suman',
    grupos:    'el panel las lista en «Ligado», y además están en la mesa',
    mis_fincas: 'tus casillas salen marcadas de otro color en el tablero',
    fincas_ajenas: 'las que no son tuyas ni están libres, ídem',
    bazas:     'las bazas ganadas se apilan al lado de cada uno',
    manos_rivales: 'se ven las cartas tapadas de cada rival, y cuántas son',
    guardados: 'los dados guardados están apartados en la mesa',
    caja:      'la caja propia sale en la fila de puntos',
    /**
     * La carta que acabas de robar SÍ está sobre la mesa, y esta vez comprobado
     * antes de escribirlo, no supuesto: `entropy.html` monta `mesa_cartas.mjs`
     * —no el `entropy_visualizer.js`, que no lo carga nadie— y esa mesa dibuja
     * TODAS las zonas del sustrato, `robada` incluida. Es la zona que se añadió
     * precisamente porque «robabas y no se dibujaba en ninguna parte».
     */
    robada:    'la carta recién robada está sobre el tapete, delante de ti',

    // ── Los visualizadores propios (blackjack, póker, entropy…) usan nombres en
    //    inglés para las mismas cosas. Las cartas están repartidas en la mesa.
    player_hand:     'tus cartas están sobre el tapete, boca arriba',
    dealer_hand:     'las del crupier también, con la tapada tapada',
    opponent_hand:   'las del rival, tapadas mientras lo estén',
    community_cards: 'las comunes están en el centro de la mesa',

    // ── Medidas del tablero, no del juego: la persona ve el tablero entero.
    width:     'el ancho del tablero; se ve',
    height:    'el alto; ídem',
    board:     'el tablero ES el dibujo',

    // ── Instrucciones para el pintor, no información del juego.
    cara:      'le dice si escribe el número o el palo de la carta',
    valores:   'la tabla de puntos de la baraja; sirve para dibujar',
    simbolos:  'ídem',
    palos:     'ídem',
};

const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

const PUERTO = 8973;
const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

const nav = await chromium.launch({ channel: 'chrome', headless: true });

console.log('\n¿Sabe la persona lo que sabe el agente?\n');

let fallos = 0;
const usadas = new Set();
const informe = [];

for (const juego of juegos) {
    const pag = paginas[juego];
    const ruta = String(pag.pagina ?? `${juego}.html`).replace(/^\/?(arcade\/)?/, '');
    const p = await nav.newPage({ viewport: { width: 1280, height: 800 } });
    let r = null;
    // Se guarda para poder volver a leer si sale algo escondido — ver la nota de
    // más abajo. La página se cierra DESPUÉS de esa segunda mirada, no antes.
    let segundaLectura = null;
    try {
        await p.goto(`${base}/arcade/${ruta}?semilla=7`, { waitUntil: 'load', timeout: 30000 });
        await p.waitForTimeout(2600);

        // Unas cuantas jugadas para que el estado tenga algo que contar: un tablero
        // recién repartido no distingue un panel completo de uno vacío.
        for (let k = 0; k < 6; k++) {
            const b = await p.$('#mesa-jugadas button, .mesa-jugada');
            if (!b) break;
            await b.click().catch(() => {});
            await p.waitForTimeout(420);
        }
        // ⚠️ Se espera a que el panel se ponga al día: el vigía de los visualizadores
        // propios refresca cada 400 ms, y leer antes denunciaba al póker por esconder
        // algo que ya estaba escrito. Una prueba que corre más que la pantalla mide
        // la carrera, no el juego.
        await p.waitForTimeout(1400);

        /**
         * ⚠️ SE LEE DOS VECES, Y NO ES DESCONFIANZA: ES QUE EL PANEL TIENE RITMO.
         *
         * Los visualizadores propios reciben sus filas de un vigía que refresca cada
         * 400 ms, así que leer una vez mide la CARRERA y no el juego. Entropy pasaba
         * corriéndolo solo y fallaba dentro de la tanda de 38 — el navegador va más
         * cargado y llega tarde. Un instrumento que da resultados distintos según lo
         * ocupada que esté la máquina no sirve para decidir nada.
         *
         * La información aparece o no aparece; esperar no la inventa.
         */
        const leer = () => p.evaluate(() => {
            const hub = window.ALISA_PROTOHUB;
            const juego = window.ALISA_JUEGO;
            const st = hub?.state?.(juego);
            if (!st) return null;
            const panel = document.querySelector('.hud-panel')?.innerText ?? '';
            const barra = document.querySelector('.jugadas')?.innerText ?? '';
            return { st, visible: `${panel}\n${barra}` };
        });
        r = await leer();
        // Si el panel todavía no ha crecido, se le da otra vuelta de reloj.
        if (r && r.visible.length < 400) {
            await p.waitForTimeout(1600);
            r = (await leer()) ?? r;
        }
        segundaLectura = leer;                 // por si hay que repetir, más abajo
    } catch (e) { r = null; }

    if (!r) {
        await p.close();
        console.log(`  ${gris('·')} ${juego.padEnd(12)} ${gris('no se pudo leer')}`);
        continue;
    }

    /**
     * ⚠️ SE COMPARAN VALORES, NO NOMBRES DE CAMPO.
     *
     * El panel dice «Triunfo: oros» donde el estado dice `triunfo: "O"`, así que
     * buscar la palabra `triunfo` daría un falso negativo. Lo que tiene que estar en
     * los dos sitios es el DATO: un número, o una cadena corta que signifique algo.
     */
    const buscarEscondidos = (lectura) => {
        const fuera = [];
        for (const [campo, valor] of Object.entries(lectura.st)) {
            if (EN_LA_MESA[campo]) { usadas.add(campo); continue; }
            if (valor === null || valor === undefined) continue;
            if (typeof valor === 'object' && !Array.isArray(valor)) continue;   // se mira aparte
            if (Array.isArray(valor) && !valor.length) continue;
            if (typeof valor === 'boolean') continue;

            // El valor, hecho una lista de cosas buscables.
            const trozos = (Array.isArray(valor) ? valor : [valor])
                .flat(2)
                .filter(v => typeof v === 'number' || typeof v === 'string')
                .map(String)
                .filter(v => v.length >= 1 && v.length <= 24);
            if (!trozos.length) continue;

            const vistos = trozos.filter(t => lectura.visible.includes(t)).length;
            // Se denuncia sólo si NO SE VE NADA del campo: con que asome un trozo, la
            // persona tiene por dónde tirar. Medir «se ve entero» daría cien avisos por
            // juego y esto se leería una vez.
            if (vistos === 0) fuera.push(campo);
        }
        return fuera;
    };

    let escondidos = buscarEscondidos(r);

    /**
     * ⚠️ SI SALE ALGO, SE MIRA OTRA VEZ ANTES DE DENUNCIAR.
     *
     * La cabecera de esta prueba ya avisaba: el panel lo refresca un vigía cada
     * 400 ms, así que leer una vez mide la CARRERA y no el juego — y lo decía con
     * el caso de entropy, que pasaba solo y fallaba dentro de la tanda porque el
     * navegador iba más cargado. El remedio que había miraba si el panel «había
     * crecido» (más de 400 caracteres), y eso no cubre el caso feo: un panel
     * grande y VIEJO. El 27-08 el ajedrez salió rojo con `puntos` y `score` dentro
     * de la suite y verde corriéndolo solo, que es el síntoma exacto.
     *
     * Reintentar aquí no puede inventar un aprobado, y esa es la razón de que sea
     * seguro: la propia cabecera lo dice —«la información aparece o no aparece;
     * esperar no la inventa»—. Si el campo de verdad no se pinta, no se va a pintar
     * por esperar otra vuelta de reloj.
     *
     * Y arreglarlo importa más desde que esto vive en `npm test`: una prueba que
     * parpadea enseña a mirar el rojo y seguir, que es peor que no tenerla.
     */
    /**
     * ⚠️ UNA SOLA REPETICIÓN NO BASTÓ, Y VOLVIÓ A PARPADEAR.
     *
     * Esto miraba otra vez UNA vez, 1200 ms después. El 28-08 la brisca salió roja
     * dentro de la suite —«triunfo, puntos»— y verde corriéndola sola, con esos dos
     * campos perfectamente escritos en el panel de la captura. O sea el mismo
     * síntoma de siempre con un reintento ya puesto: la máquina iba más cargada y
     * 1200 ms tampoco llegaron.
     *
     * Se insiste hasta cuatro veces, y sólo cuando algo salió escondido: un juego
     * verde no paga ni un milisegundo por esto. Y no puede inventar un aprobado,
     * que es lo que lo hace seguro — la cabecera ya lo dice: la información aparece
     * o no aparece, y esperar no la inventa. Si el campo no se pinta, no se pintará
     * por mirar cuatro veces.
     */
    for (let intento = 0; escondidos.length && segundaLectura && intento < 4; intento++) {
        await p.waitForTimeout(1200);
        const otra = await segundaLectura().catch(() => null);
        if (otra) escondidos = buscarEscondidos(otra);
    }
    await p.close();

    if (escondidos.length) {
        fallos++;
        informe.push([juego, escondidos]);
        console.log(`  ${rojo('✗')} ${juego.padEnd(12)} ${escondidos.length} campo(s) que el agente lee y el panel no enseña`);
        console.log(gris(`      ${escondidos.join(', ')}`));
    } else {
        console.log(`  ${verde('✓')} ${juego.padEnd(12)} ${gris('todo lo que lee el agente asoma en la pantalla')}`);
    }
}

await nav.close();
srv.kill();

// ⚠️ Una excepción que ya no hace falta es una mentira guardada: se denuncia, igual
// que `prueba_de_las_pruebas` denuncia un sabotaje que apunta a una prueba borrada.
const sobran = Object.keys(EN_LA_MESA).filter(k => !usadas.has(k));

console.log('');
if (sobran.length && !pedidos.length) {
    console.log(rojo(`  ✗ ${sobran.length} excepción(es) declaradas que ya no usa nadie: ${sobran.join(', ')}`));
    console.log(gris('    Quitalas de `EN_LA_MESA`: una excepción que sobra tapa la siguiente de verdad.'));
    fallos++;
}
console.log(fallos
    ? rojo(`\n✗ ${fallos} juego(s) donde el agente sabe más que la persona.\n`)
      + gris('  No es cosmética: el banco compara a los dos en el mismo juego, y esa\n'
           + '  comparación sólo significa algo si los dos ven lo mismo.\n')
    : verde(`\n✓ los ${juegos.length}: nada de lo que lee el agente está escondido a la persona\n`));

process.exit(fallos ? 1 : 0);
