/**
 * ¿SE VE LO MISMO EN UNA SALA QUE EN CASA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run prueba:dibujo
 *
 * Las salas ya reparten bien los turnos, las manos y las sillas. Lo que no se
 * había mirado es lo que se DIBUJA: en una mesa compartida el pintor no tiene
 * partida viva que preguntar, así que DERIVABA el sustrato de lo publicado
 * —`sustratoDe(juego, estado)`—. Y veintiún juegos escriben el suyo a mano, que
 * es justo lo que la derivación no puede reconstruir.
 *
 * ⚠️ Y LA LECCIÓN YA ESTABA ESCRITA EN LA CASA, APLICADA A LA MITAD.
 *
 * La cabecera de `ProtoHub.sustrato()` lo cuenta con estas palabras: «la sala
 * nueva usaba `sustratoDe(juego, estado)` para los treinta, que sólo DERIVA: los
 * once juegos con sustrato propio salían vacíos». Se arregló el camino local y el
 * de la sala se quedó como estaba.
 *
 * Lo vi abriendo un parchís en sala: un plano verde sin casillas ni fichas,
 * mientras el mismo parchís sin sala sale con sus casillas y sus fichas.
 *
 * ⚠️ SE MIDE CONTRA EL ÁRBITRO DESPLEGADO, Y NO ES POR GUSTO.
 *
 * Mi primera versión comparaba el sustrato propio contra el derivado, en local.
 * Eso mide la DERIVACIÓN —que no puede reconstruir un sustrato escrito a mano, y
 * eso ya se sabía— y no lo que le llega a un jugador. Al arreglarlo se me quedó
 * comparando el propio contra el propio: una comprobación que no puede suspender.
 *
 * Lo que importa es qué entrega la sala. Así que se sienta uno en una mesa de
 * verdad y se mira si el `substrate` viene y trae lo mismo que se ve en casa.
 *
 * ⚠️ SI SUSPENDE JUSTO DESPUÉS DE DESPLEGAR, REPÍTELA ANTES DE CREER NADA.
 *
 * Toca la red, así que hereda la trampa de siempre. Recién desplegado el árbitro
 * dio cinco rojos —sokoban, cripta, relevo, cabina, pradera—; preguntándole a
 * mano al mismo worker por relevo, entregaba sus 247 celdas perfectamente, y al
 * repetir la sonda salieron los veintiuno en verde. `desplegar.mjs` espera a que
 * conteste la versión nueva, pero cada mesa es un objeto durable con su propia
 * vida: uno que ya está en memoria puede seguir un rato con el código anterior.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, SILLAS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

const MESAS = 'https://alisa-mesas.prime-6d5.workers.dev';
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const pedir = async (ruta, cuerpo) => {
    const r = await fetch(`${MESAS}${ruta}`, cuerpo
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : {});
    return { codigo: r.status, datos: await r.json().catch(() => ({})) };
};

/** Lo que hace que un tablero se vea: piezas, celdas y zonas. */
const cuenta = (s) => ({
    piezas: (s?.piezas ?? []).length,
    celdas: (s?.rejilla?.celdas ?? []).length,
    zonas: (s?.zonas ?? []).length,
});

console.log('\n¿Se ve lo mismo en una sala que en casa?\n');
const rotos = [];
let mirados = 0;

// Se puede acotar a unos juegos para mirar uno de cerca sin esperar a los treinta.
const PEDIDOS = process.argv.slice(2);
for (const juego of JUEGOS) {
    if (PEDIDOS.length && !PEDIDOS.includes(juego)) continue;
    let R;
    try { R = await cargarReglas(juego, {}); } catch { continue; }
    // Los que derivan ya salían bien por el otro camino: no hay nada que comparar.
    if (typeof R.sustrato !== 'function') continue;
    mirados++;

    // La MISMA partida en los dos sitios: misma semilla y las mismas jugadas. Sin
    // eso se compararían dos tableros distintos y cualquier diferencia sería ruido.
    const sala = `dibujo-${juego}-${Math.floor(Math.random() * 1e6)}`;
    const { datos: s0 } = await pedir(`/mesa/${sala}/sentarse`,
        { quien: 'ana', juego, semilla: 7, jugadores: 1 });
    const secreto = s0.secret ?? s0.secreto;

    const p = R.nuevaPartida({ semilla: 7 });
    let ultima = s0;
    // Unas cuantas jugadas: un tablero recién repartido puede estar vacío en los dos
    // y parecer que coinciden. Se compara con la partida ya empezada.
    for (let i = 0; i < 5; i++) {
        const legales = (ultima.legal_moves ?? []).filter((m) => m !== 'nueva');
        if (!legales.length || ultima.is_game_over) break;
        const j = legales[0];
        if (!R.mover(p, j)) break;
        const { datos } = await pedir(`/mesa/${sala}/jugar`, { quien: 'ana', secreto, jugada: j });
        if (datos.error) break;
        ultima = datos;
    }

    const enCasa = cuenta(R.sustrato(p, 0));
    const enSala = cuenta(ultima.substrate);
    const falta = [];
    if (enCasa.piezas && !enSala.piezas) falta.push(`${enCasa.piezas} piezas`);
    if (enCasa.celdas && !enSala.celdas) falta.push(`${enCasa.celdas} celdas`);
    if (enCasa.zonas && !enSala.zonas) falta.push(`${enCasa.zonas} zonas`);

    const sillas = SILLAS[juego] ?? 1;
    if (falta.length) {
        rotos.push({ juego, sillas });
        console.log(`  ${rojo('✗')} ${juego.padEnd(11)} ${gris(`${sillas} silla(s) · en sala no llega: ${falta.join(', ')}`)}`);
        // Con qué respuesta se quedó: sin esto, un fallo del cliente de la sonda
        // —una jugada rechazada, una partida terminada— se lee como un fallo del
        // árbitro. Ya me pasó una vez hoy con `played_by_house`.
        console.log(gris(`      última respuesta: ${ultima.error ? `error «${ultima.error}»` : `${ultima.moves ?? '?'} jugadas, fin=${ultima.is_game_over}`}`
                       + ` · trae substrate: ${ultima.substrate ? 'sí' : 'no'}`));
    } else {
        console.log(`  ${verde('✓')} ${juego.padEnd(11)} ${gris(`${sillas} silla(s) · ${enSala.celdas} celdas · ${enSala.piezas} piezas · ${enSala.zonas} zonas`)}`);
    }
}

const acompanados = rotos.filter((r) => r.sillas > 1);
console.log(rotos.length
    ? rojo(`\n✗ ${rotos.length} de ${mirados} juegos con sustrato propio se ven distinto en sala`
         + ` (${acompanados.length} de ellos se juegan acompañados)\n`)
    : verde(`\n✓ los ${mirados} juegos con sustrato propio se ven igual en sala\n`));
process.exit(rotos.length ? 1 : 0);
