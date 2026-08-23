/**
 * avisos.mjs — lo que han contado los betatesters, y si se puede repetir
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run avisos
 *
 * Cada aviso trae el RECIBO de la partida que lo provocó, así que esto no sólo
 * los lista: intenta VOLVER A JUGAR cada uno y dice si sale igual. Un aviso que
 * se puede repetir es un fallo que se puede arreglar; uno que no, es una
 * anécdota — y conviene saber cuál es cuál antes de ponerse.
 *
 * Y da el enlace que reproduce exactamente lo que esa persona tenía delante,
 * porque en este proyecto todo lo que se ha arreglado esta semana salió de MIRAR
 * una partida concreta, no de leer una descripción.
 */
const BUZON = 'https://alisa-mesas.prime-6d5.workers.dev/reportes';
const SITIO = 'https://alisa.systems';

const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
const { verificar } = await import('./public/arcade/js/protohub/Verificador.js');
const { veredicto } = await import('./veredicto.mjs');
const { execFileSync } = await import('node:child_process');
const gris = (s) => `\x1b[90m${s}\x1b[0m`;
const resumen = new Map();

/**
 * Cuántos commits han tocado el fichero de reglas de ese juego DESPUÉS del aviso.
 *
 * Es el dato más barato y más objetivo que hay: si nadie lo ha tocado, la queja
 * sigue viva pase lo que pase con las comprobaciones. Y si lo han tocado mucho,
 * merece una segunda mirada antes de ponerse.
 *
 * Devuelve `null` —y no cero— cuando no se puede saber: sin git, sin fecha o sin
 * juego. Cero significa «he mirado y no hay», que es una afirmación distinta.
 */
function cambiosDesde(juego, cuando) {
    if (!juego || !cuando) return null;
    const fecha = String(cuando).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    try {
        const salida = execFileSync('git', ['log', '--oneline', `--since=${fecha}`, '--',
            `public/arcade/js/protohub/rules/${juego}.js`], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
        return salida.split('\n').filter((l) => l.trim()).length;
    } catch { return null; }
}

const { enlaceRepetidor } = await import('./public/arcade/js/protohub/enlace_repetidor.js');

const r = await fetch(BUZON).catch(() => null);
if (!r?.ok) {
    console.log(`\n✗ el buzón no contesta (${r?.status ?? 'sin red'})\n`);
    process.exit(1);
}
const { avisos = [], cuantos = 0 } = await r.json();

console.log(`\n${cuantos} aviso(s) de betatesters\n`);
if (!avisos.length) {
    console.log('  Nadie ha escrito todavía. El botón está abajo a la derecha en las 35 mesas.\n');
    process.exit(0);
}

for (const a of avisos) {
    const cuando = String(a.cuando ?? '').replace('T', ' ').slice(0, 16);
    console.log(`  ── ${cuando} · ${a.juego ?? '?'} ${'─'.repeat(Math.max(0, 46 - (a.juego ?? '?').length))}`);
    console.log(`     «${a.comentario}»`);

    const p = a.pantalla ?? {};
    if (p.ancho) {
        // Los dos han mentido esta semana: una proporción rara descuadra el
        // encuadre, y con la ventana oculta no hay fotogramas y la página parece
        // viva sin dibujar. Por eso viajan con el aviso.
        console.log(`     dónde    ${p.aparato ?? '?'}`
            + (p.vertical ? ' en vertical' : '')
            + ` · ${p.ancho}x${p.alto}`
            + (p.dpr && p.dpr !== 1 ? ` @${p.dpr}x` : '')
            + (p.oculta ? '  ⚠ LA VENTANA ESTABA OCULTA: no había fotogramas' : ''));
    }
    if (a.estado) {
        console.log(`     estado   turno ${a.estado.turn ?? '—'}`
            + ` · fase ${a.estado.fase ?? '—'} · ${a.estado.legal_moves ?? '?'} jugadas legales`
            + (a.estado.is_game_over ? ' · terminada' : ''));
    }

    if (a.recibo?.juego && Array.isArray(a.recibo?.jugadas)) {
        try {
            const reglas = await cargarReglas(a.recibo.juego, {});
            const v = reglas ? verificar(reglas, a.recibo) : { valida: false, motivo: 'juego desconocido' };
            console.log(`     partida  semilla ${a.recibo.semilla} · ${a.recibo.jugadas.length} jugadas`
                + ` · ${v.valida ? 'SE PUEDE REPETIR' : 'no se repite — ' + v.motivo}`);
        } catch (e) {
            console.log(`     partida  no se pudo re-jugar: ${String(e.message).slice(0, 60)}`);
        }
        /**
         * ⚠️ EL ENLACE VUELVE A JUGAR SU PARTIDA. ANTES ERA LA PÁGINA EN BLANCO.
         *
         * Aquí ponía `${SITIO}${a.pagina}` — o sea, el juego recién repartido. Quien
         * se pusiera a mirar un aviso abría una partida NUEVA, con otra semilla y
         * otras cartas, y tenía que reconstruir a mano lo que esa persona tenía
         * delante. Justo debajo se imprimía «SE PUEDE REPETIR» y no había forma de
         * repetirla mirando.
         *
         * Con el repetidor el enlace es la partida del aviso, jugada otra vez. Y todo
         * lo que se ha arreglado esta semana salió de MIRAR una partida concreta, no
         * de leer una descripción: esto es esa herramienta, en una línea.
         */
        const enlace = enlaceRepetidor(a.recibo, { sitio: SITIO });
        if (enlace) {
            // Con jugadas, el enlace las vuelve a jugar; sin ellas, reparte lo mismo
            // que esa persona tenía delante — que es el caso de la mitad de los
            // avisos, los de quien escribe nada más abrir.
            console.log(`     míralo   ${enlace}`
                + (a.recibo.jugadas?.length ? '' : '   ← el mismo reparto, sin jugadas todavía'));
        } else {
            // Sin semilla no hay partida que repetir. Se dice —y se dice POR QUÉ—
            // en vez de dar un enlace que enseñaría otra cosa.
            console.log(`     míralo   ${SITIO}${a.pagina ?? ''}`
                      + `  (sin semilla: esta partida no se puede reproducir)`);
        }
    } else {
        console.log('     partida  (sin recibo: llegó antes de empezar, o el juego no lo publica)');
    }

    /**
     * ⚠️ Y EL VEREDICTO, QUE ES LO QUE FALTABA.
     *
     * «SE PUEDE REPETIR» sólo dice que las reglas no han cambiado bajo el recibo,
     * y eso engaña: entropy tenía SEIS avisos que repetían perfectamente y cuyas
     * dos quejas —robar del mazo, coger del descarte— funcionan hoy. Media hora
     * en confirmar que algo ya iba bien, mientras los de mancala y alisapolis, que
     * sí estaban vivos, se leían igual de urgentes.
     *
     * Ver `veredicto.mjs`: lo primero que hace es admitir qué NO puede juzgar.
     */
    let reglasDelJuego = null;
    try { reglasDelJuego = await cargarReglas(a.juego ?? a.recibo?.juego, {}); } catch { /* se dirá */ }
    const v = veredicto(a, { reglas: reglasDelJuego });
    resumen.set(v.estado, (resumen.get(v.estado) ?? 0) + 1);
    const SELLO = {
        vivo:       ['🔴', 'SIGUE VIVO'],
        pantalla:   ['🟡', 'ES DE LA PANTALLA'],
        mirar:      ['👁 ', 'HAY QUE MIRARLO'],
        'sin-datos':['··', 'SIN DATOS'],
    }[v.estado] ?? ['··', v.estado];
    console.log(`     veredicto ${SELLO[0]} ${SELLO[1]}`
        + (v.familia ? gris(`  [${v.familia}]`) : '') + `  ${v.porque}`);

    // Y un dato objetivo y barato: si nadie ha tocado ese juego desde el aviso,
    // la queja casi seguro sigue viva pase lo que pase con lo de arriba.
    const cambios = cambiosDesde(a.juego ?? a.recibo?.juego, a.cuando);
    if (cambios !== null) {
        console.log(`     desde     ${cambios === 0
            ? 'NADIE ha tocado ese juego desde el aviso'
            : `${cambios} commit(s) tocaron ese juego después`}`);
    }
    console.log('');
}

/**
 * Resumen, que con cuarenta avisos la lista sola no se lee. Ordena por lo que
 * hay que hacer, no por fecha.
 */
console.log('  ── qué hacer con todo esto ──────────────────────────────');
for (const [estado, texto] of [['vivo', '🔴 arreglar'], ['pantalla', '🟡 mirar la pantalla, no las reglas'],
                               ['mirar', '👁  necesita ojos'], ['sin-datos', '·· sin datos']]) {
    const n = resumen.get(estado) ?? 0;
    if (n) console.log(`     ${texto.padEnd(36)} ${n}`);
}
console.log('');
