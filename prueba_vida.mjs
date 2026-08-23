/**
 * SI UNA PIEZA ESTÁ TOCADA, TIENE QUE NOTARSE
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_vida.mjs
 *
 * En `defensa` un bicho aguanta cuatro golpes y una torre le quita uno por
 * ronda. «¿Le queda uno o le quedan cuatro?» decide si hace falta plantar otra
 * torre o si el que viene ya está muerto — y ese número vivía DENTRO de las
 * reglas, sin salir ni en `estado()` ni en el sustrato. Se jugaba a ciegas una
 * decisión central del género.
 *
 * Ahora el sustrato lo publica y `pintar3d.js` encoge la pieza en proporción.
 * Son dos mitades que se pierden por separado y en silencio:
 *
 *   · si las reglas dejan de publicar `vida`, el pintor no falla — dibuja todo
 *     del mismo tamaño, que es exactamente como se veía antes;
 *   · si el pintor deja de mirarla —un refactor del bucle de instancias—, las
 *     reglas siguen publicando un dato perfecto que ya no ve nadie.
 *
 * En los dos casos la pantalla queda correcta y la información desaparece. No
 * hay error que mirar: hay un juego que vuelve a jugarse a ciegas.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('\nSi una pieza está tocada, tiene que notarse\n');
const fallos = [];

// ── 1 — las reglas publican la vida, y VARÍA ──
// Que exista el campo no basta: si diera siempre el máximo, sería un adorno
// constante y no diría nada. Se juega hasta ver dos valores distintos.
{
    const R = await cargarReglas('defensa', {});
    const vistos = new Set();
    let conCampo = 0, sinCampo = 0;
    for (let s = 1; s <= 12 && vistos.size < 2; s++) {
        const p = R.nuevaPartida({ semilla: s });
        for (let i = 0; i < 200; i++) {
            const st = R.estado(p);
            if (st.is_game_over) break;
            const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
            if (!leg.length) break;
            for (const z of (R.sustrato(p, 0)?.piezas ?? [])) {
                if (z.t !== 'bicho') continue;
                if (Number.isFinite(z.vida) && Number.isFinite(z.vida_max)) {
                    conCampo++; vistos.add(`${z.vida}/${z.vida_max}`);
                } else sinCampo++;
            }
            if (!R.mover(p, R.sugerencia(p) ?? leg[0])) break;
        }
    }
    if (!conCampo) fallos.push('ningún bicho de defensa publica `vida`: el dato volvió a esconderse');
    else if (sinCampo) fallos.push(`${sinCampo} bichos sin \`vida\` y ${conCampo} con ella: se publica a medias`);
    else if (vistos.size < 2) fallos.push(`la vida no varía nunca (siempre ${[...vistos][0]}): es un adorno, no un dato`);
    else console.log(`  ${verde('✓')} defensa publica la vida de sus bichos y varía`
        + gris(` (${vistos.size} valores distintos en ${conCampo} lecturas)`));
}

/**
 * ── 2 — ⚠️ Y EL PINTOR LA MIRA ──
 *
 * Se comprueba la función pura, no el dibujo: `escalaPorVida` no se puede
 * importar —`pintar3d.js` necesita THREE y un lienzo— así que se lee su código y
 * se reproduce el contrato que declara. Es menos de lo que me gustaría y se dice:
 * esto caza que la función desaparezca o cambie de umbral, NO que el bucle de
 * instancias siga llamándola. Para eso está la tercera.
 */
const fuente = await readFile(path.join(AQUI, 'public/arcade/js/protohub/render/pintar3d.js'), 'utf-8');
{
    const m = fuente.match(/return 0\.45 \+ 0\.55 \* Math\.max\(0, Math\.min\(1, v \/ max\)\);/);
    if (!m) fallos.push('`escalaPorVida` ya no calcula lo que declara: o cambió el suelo de 0,45 o desapareció');
    else {
        // El suelo importa: una pieza a punto de morir tiene que seguir viéndose.
        const escala = (v, max) => 0.45 + 0.55 * Math.max(0, Math.min(1, v / max));
        const sana = escala(4, 4), tocada = escala(1, 4), muerta = escala(0, 4);
        if (!(sana === 1 && tocada < sana && muerta >= 0.45)) {
            fallos.push(`la escala no separa: sana ${sana}, tocada ${tocada}, muerta ${muerta}`);
        } else console.log(`  ${verde('✓')} una pieza tocada se encoge y una moribunda sigue viéndose`
            + gris(` (4/4 → ${sana} · 1/4 → ${tocada.toFixed(2)} · 0/4 → ${muerta})`));
    }
}

/**
 * ── 3 — ⚠️ LA QUE PROTEGE DE VERDAD: QUE EL BUCLE SIGA LLAMÁNDOLA ──
 *
 * Es la mitad que se pierde sin dejar rastro. Quitar la llamada de dentro del
 * bucle de instancias no rompe nada: las piezas se dibujan todas del mismo
 * tamaño, que es exactamente como se veían antes de hoy, y ninguna prueba de
 * estado lo nota porque el estado está perfecto. Sólo desaparece la información.
 */
/**
 * ⚠️ SE BUSCA POR LO QUE HACE, NO POR CÓMO ESTÁ ESCRITO. Y LA PRIMERA VERSIÓN NO.
 *
 * Buscaba literalmente `for (const p of g.items) {`, y el día que ese bucle se
 * sacó a `volcarPiezas` para poder animar las piezas, esta comprobación suspendió
 * con «no encuentro el bucle: la forma del pintor cambió». Hizo bien en saltar
 * —algo se movió— pero el mensaje acusaba al pintor de un problema que era del
 * patrón: `escalaPorVida` seguía llamándose perfectamente.
 *
 * Una comprobación atada a la forma exacta del código suspende en cada refactor
 * honrado, y una que suspende por nada acaba desactivada. Ahora se ancla en lo
 * único que no puede cambiar sin cambiar el comportamiento: la línea que escribe
 * la matriz de una instancia —`poner(m,`— y su vecindario.
 */
{
    const i = fuente.indexOf('poner(m,');
    const vecindario = i < 0 ? '' : fuente.slice(Math.max(0, i - 600), i + 300);
    if (i < 0) fallos.push('no hay ninguna llamada a `poner(m, …)`: el pintor ya no coloca instancias');
    else if (!vecindario.includes('escalaPorVida')) {
        fallos.push('donde se colocan las instancias ya no se llama a `escalaPorVida`: las piezas vuelven a salir todas iguales');
    } else console.log(`  ${verde('✓')} donde se colocan las instancias se sigue llamando a la escala`);
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ la vida se publica y se ve\n'));
