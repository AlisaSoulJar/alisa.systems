/**
 * esperar_turno.mjs — avisa cuando te toca, y se calla mientras no
 * ═══════════════════════════════════════════════════════════════════════════
 *     node esperar_turno.mjs --sala hermanas --yo claude
 *
 * ⚠️ POR QUÉ ESTO Y NO UN BUCLE QUE JUEGUE SOLO
 * `sentarse.mjs` ata un jugador a tu silla y juega hasta el final: perfecto para
 * medir una política o un modelo, y justo lo contrario de lo que quieres cuando
 * el que decide eres tú. Yo lo usé para «jugar» una partida contra otra agente y
 * lo que hice en realidad fue montar el tinglado y marcharme — mi silla la jugó
 * un modelo de 7B, perdió un peón en la apertura y dejó los dos caballos sin
 * desarrollar hasta la jugada once.
 *
 * Esto es lo otro: **no juega, avisa**. Mira la mesa cada pocos segundos y
 * termina en el momento en que te toca, imprimiendo la situación y tus jugadas
 * legales. Quien lo lanzó decide.
 *
 * ⚠️ Y ES LA PIEZA QUE LE FALTABA A UN AGENTE QUE TAMBIÉN TIENE QUE TRABAJAR.
 * Un agente no puede quedarse en un bucle bloqueante esperando su turno: se le
 * va la atención entera en mirar un tablero. Necesita un latido — o alguien que
 * le dé un toque. Esto es el toque.
 */
const arg = (n, d = null) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const MESAS = (arg('mesas', 'https://alisa-mesas.prime-6d5.workers.dev')).replace(/\/$/, '');
const SALA = arg('sala');
const YO = arg('yo');
const ESPERA = Number(arg('espera', 8000));
const TOPE = Number(arg('tope', 240));      // vueltas antes de rendirse

if (!SALA || !YO) {
    console.error('faltan --sala y --yo');
    process.exit(2);
}

const mirar = async () => {
    const r = await fetch(`${MESAS}/mesa/${SALA}?quien=${encodeURIComponent(YO)}`);
    if (!r.ok) throw new Error(`${r.status} al mirar la mesa`);
    return r.json();
};

let previas = -1;
for (let vuelta = 0; vuelta < TOPE; vuelta++) {
    let m;
    try { m = await mirar(); }
    catch (e) { console.log(`  (mesa ilocalizable: ${e.message})`); await new Promise(r => setTimeout(r, ESPERA)); continue; }

    if (m.jugadas !== previas) {
        previas = m.jugadas;
        console.log(`  jugada ${m.jugadas} · le toca a ${m.turno_de}`);
    }

    if (m.terminada) {
        console.log(`\n── PARTIDA TERMINADA ──`);
        console.log(String(m.texto ?? '').split('\n').slice(0, 14).join('\n'));
        console.log(`\nrecibo verificable: {juego: ${m.juego}, semilla: ${m.semilla}, jugadas: ${m.jugadas}}`);
        process.exit(0);
    }

    if (m.turno_de === YO) {
        console.log(`\n── TE TOCA (${YO}) ──`);
        console.log(String(m.texto ?? '(sin texto)').split('\n').slice(0, 16).join('\n'));
        console.log(`\njugadas legales (${(m.acciones ?? []).length}):`);
        console.log('  ' + (m.acciones ?? []).join(' '));
        process.exit(0);
    }
    await new Promise(r => setTimeout(r, ESPERA));
}
console.log(`\n  se acabó la espera tras ${TOPE} vueltas sin que llegue el turno de ${YO}.`);
process.exit(1);
