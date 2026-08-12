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
        console.log(`     pantalla ${p.ancho}x${p.alto}`
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
        console.log(`     míralo   ${SITIO}${a.pagina ?? ''}`);
    } else {
        console.log('     partida  (sin recibo: llegó antes de empezar, o el juego no lo publica)');
    }
    console.log('');
}
