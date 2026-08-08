/**
 * sentarse.mjs — SENTARSE A UNA MESA SIN NAVEGADOR
 * ═══════════════════════════════════════════════════════════════════════════
 *     node sentarse.mjs --sala cocina --yo bot1 --como fsm:casa --juego brisca
 *     node sentarse.mjs --sala cocina --yo pepe --como llm \
 *                       --llm-url http://127.0.0.1:11434/v1/chat/completions \
 *                       --llm-modelo llama3.2:3b
 *
 * POR QUÉ EXISTE
 * Todo lo que se construyó para las mesas compartidas se probó en un navegador,
 * y eso deja fuera a la mitad de quienes tienen que jugar aquí: una política
 * determinista no tiene pantalla, y un agente de lenguaje sin visión tampoco. Si
 * la única forma de sentarse fuera abrir una pestaña con WebGL, el banco de
 * pruebas mediría a quién tiene navegador, no a quién juega mejor.
 *
 * Esto es la misma silla, por HTTP. Se sienta, mira de vez en cuando, y cuando
 * le toca, juega. Contra personas, contra otras políticas o contra modelos — la
 * mesa no distingue, y ese es el asunto.
 *
 * ⚠️ AQUÍ `fsm:casa` SÍ FUNCIONA, Y EN EL NAVEGADOR NO
 * La política `casa` le pregunta al juego su sugerencia, y para eso hace falta la
 * PARTIDA de verdad, no su estado publicado. En una pestaña dentro de una sala no
 * la hay —vive en el árbitro— así que allí no se ofrece. Aquí sí: el recibo trae
 * `{juego, semilla, jugadas}` y con eso se re-simula la partida entera en local
 * antes de cada jugada. El cliente sin pantalla acaba siendo MÁS capaz que el
 * que tiene una.
 *
 * ⚠️ Y NO SE JUEGA POR NADIE
 * Si el controlador no elige —un modelo que no acierta a dar una de las legales—
 * se para y lo dice. En el banco de pruebas eso se cuenta como jugada «forzada» y
 * se publica el porcentaje; rellenar el hueco en silencio sería regalarle
 * partidas a quien no supo jugarlas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { crearControlador, esPersona } from './public/arcade/js/protohub/asientos.js';
import { cargarReglas, TITULOS } from './public/arcade/js/protohub/rules/index.js';

const arg = (n, d) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : d;
};

const MESAS = (arg('mesas', 'https://alisa-mesas.prime-6d5.workers.dev')).replace(/\/$/, '');
const SITIO = (arg('sitio', 'https://alisa.systems')).replace(/\/$/, '');
const SALA = arg('sala');
const YO = arg('yo', 'agente-' + Math.random().toString(36).slice(2, 6));
const COMO = arg('como', 'fsm:casa');
const JUEGO = arg('juego', 'brisca');
const SEMILLA = arg('semilla');
const ESPERA = Number(arg('espera', 1500));
const TOPE = Number(arg('tope', 500));
const llm = { url: arg('llm-url'), modelo: arg('llm-modelo') };

if (!SALA) {
    console.log('falta --sala. Ejemplo:\n' +
        '  node sentarse.mjs --sala cocina --yo bot1 --como fsm:casa --juego brisca\n' +
        '  controladores: fsm:primera · fsm:azar · fsm:casa · llm');
    process.exit(1);
}
if (esPersona(COMO)) {
    console.log('`--como persona` no tiene sentido sin pantalla: una persona necesita ver la mesa.\n' +
                'Abre /arcade/mesa?sala=' + SALA + '&yo=' + YO + ' en un navegador.');
    process.exit(1);
}

const pedir = async (ruta, cuerpo) => {
    const r = await fetch(MESAS + `/mesa/${SALA}` + ruta, cuerpo ? {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
    } : undefined);
    const txt = await r.text();
    try { return { codigo: r.status, ...JSON.parse(txt) }; }
    // Un cuerpo que no es JSON casi siempre es un error de la plataforma. Si se
    // dejara pasar como `null`, el fallo aparecería después disfrazado de otra cosa.
    catch { throw new Error(`${ruta} → ${r.status}: ${txt.slice(0, 120)}`); }
};

// ── Sentarse ─────────────────────────────────────────────────────────────
const entrada = await pedir('/sentarse', {
    quien: YO, tipo: 'agente', juego: JUEGO,
    // ⚠️ A cuántos espera la mesa antes de arrancar. Por defecto 1 —una persona
    // sola contra la casa, que es lo de siempre—, pero entre agentes hay que
    // decirlo: en la primera prueba con dos procesos, el segundo llegó tres
    // segundos tarde y se encontró la partida terminada, cuarenta jugadas, cero
    // suyas. Quien abre la mesa declara a cuántos espera.
    jugadores: Number(arg('jugadores', 1)),
    ...(SEMILLA !== undefined ? { semilla: Number(SEMILLA) } : {}),
});
/**
 * ⚠️ EL SECRETO DEL ASIENTO. Sin él, `jugar` responde 403.
 *
 * La mesa lo entrega una sola vez, al sentarte, y lo exige en cada jugada.
 * Antes bastaba con decir un nombre: cualquiera que supiera el de la sala podía
 * mover las piezas de otro. Decir quién eres y demostrarlo son cosas distintas,
 * y sólo la segunda sirve cuando el enlace circula por internet.
 */
const secreto = entrada?.secreto ?? null;
if (entrada.codigo !== 200) {
    console.log(`no se pudo sentar: ${entrada.error}`);
    if (entrada.motivo) console.log(`  motivo: ${entrada.motivo}`);
    process.exit(1);
}
const juego = entrada.juego;
console.log(`\n${YO} se sienta a ${TITULOS[juego] ?? juego} en '${SALA}' como ${COMO}`);
console.log(`  asientos: ${entrada.asientos.map(a => a.quien).join(', ')}`
          + (entrada.los_juega_la_casa ? ` (+${entrada.los_juega_la_casa} de la casa)` : ''));

// ── Las reglas, en local ─────────────────────────────────────────────────
// Se cargan del catálogo del sitio y no de disco: son las MISMAS que usa el
// árbitro, y pedirlas por la red garantiza que no se juegue con otra baraja que
// la que él re-simula.
const reglas = await cargarReglas(juego, { url: `${SITIO}/arcade/data/card_library.json` });
const ctrl = crearControlador(COMO, { juego, reglas, llm });

/** Re-simula la partida desde el recibo, para las políticas que miran dentro. */
const reconstruir = (recibo) => {
    const p = reglas.nuevaPartida({ semilla: recibo.semilla, seed: recibo.semilla });
    for (const j of recibo.jugadas) reglas.mover(p, j);
    return p;
};

// ── Jugar ────────────────────────────────────────────────────────────────
let mesa = entrada, mias = 0, esperas = 0, avisado = false;
for (let vuelta = 0; vuelta < TOPE; vuelta++) {
    if (mesa.terminada) break;

    // Esperar a que se llene la mesa NO es estar atascado, y conviene decirlo:
    // un proceso callado durante un minuto parece colgado.
    if (mesa.esperando_a > 0) {
        if (!avisado) { console.log(`  esperando a ${mesa.esperando_a} más…`); avisado = true; }
        await new Promise(r => setTimeout(r, ESPERA));
        mesa = await pedir(`?quien=${encodeURIComponent(YO)}`);
        continue;
    }

    if (mesa.turno_de !== YO) {
        esperas++;
        await new Promise(r => setTimeout(r, ESPERA));
        mesa = await pedir(`?quien=${encodeURIComponent(YO)}`);
        continue;
    }

    const acciones = mesa.acciones ?? [];
    if (!acciones.length) { console.log('  sin jugadas legales y la partida no ha terminado'); break; }

    const jugada = await ctrl.elegir({
        juego, st: mesa.estado, acciones, reglas, p: reconstruir(mesa.recibo),
    });
    if (!jugada) {
        console.log(`\n✗ «${ctrl.etiqueta}» no eligió ninguna de las ${acciones.length} legales.`);
        console.log('  La mesa se queda como está: no se juega por nadie.\n');
        process.exit(2);
    }

    const antes = mesa.jugadas;
    mesa = await pedir('/jugar', { quien: YO, jugada, secreto });
    if (mesa.codigo !== 200) { console.log(`  rechazada: ${mesa.error}`); break; }
    mias++;
    process.stdout.write(`  ${String(antes).padStart(3)} ${YO} → ${jugada}\n`);
}

// ── El recibo, que es lo que vale ────────────────────────────────────────
console.log(`\n${mesa.terminada ? 'partida terminada' : 'sin terminar'}`
          + ` · ${mesa.jugadas} jugadas (${mias} mías, ${esperas} esperas) · ${mesa.puntos} puntos`);

const v = await fetch(`${SITIO}/api/verificar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...mesa.recibo, puntos: mesa.puntos }),
}).then(r => r.json()).catch(e => ({ error: e.message }));
console.log(`verificador: ${JSON.stringify(v)}\n`);
process.exit(v.valida ? 0 : 1);
