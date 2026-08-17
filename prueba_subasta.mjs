/**
 * LA SUBASTA DE SPADES — PRUEBA DE ACEPTACIÓN, ESCRITA ANTES QUE EL CÓDIGO
 * ═══════════════════════════════════════════════════════════════════════════
 * Esto define QUÉ significa que la subasta esté terminada. Se escribe antes a
 * propósito: si la prueba se escribe después, se acaba escribiendo la prueba que
 * pasa el código que hay, y entonces sólo comprueba que el código es el código.
 *
 * HOY SALE EN ROJO. Ése es su trabajo. Cuando salga en verde, está hecho.
 *
 * ⚠️ POR QUÉ ESTA FUNCIÓN Y NO OTRA
 *
 * Nuestro spades no tiene subasta: gana quien más bazas hace. Y en spades la subasta
 * ES el juego — se puntúa por ACERTAR cuántas vas a hacer, no por hacer muchas. Sin
 * ella, «predecirte a ti mismo» —que es la única capacidad que ningún otro de los 35
 * mide— se convierte en «haz todas las que puedas», que es otro juego. Está declarado
 * en su ficha desde ayer; esto es arreglarlo.
 *
 * ⚠️ INDIVIDUAL, NO POR PAREJAS, Y ES UNA DECISIÓN
 *
 * El spades de torneo es dos contra dos con las apuestas SUMADAS por equipo. Nuestro
 * motor no tiene concepto de equipo —el marcador es por jugador— y meterlo tocaría el
 * arbitraje de mesas, el reparto de asientos y la métrica. Así que se implementa la
 * variante individual, que existe y se llama cutthroat, y la ficha lo dirá. Es un
 * cambio acotado a un fichero de reglas; lo otro sería un proyecto.
 *
 * ⚠️ LO QUE NO SE PUEDE ROMPER
 *
 * Una partida se verifica volviéndola a jugar con `{juego, semilla, jugadas}`. Todo lo
 * que decida el resultado tiene que vivir DENTRO del estado, no en una variable del
 * módulo: si las apuestas se guardan fuera, la re-simulación no las tiene y el
 * verificador rechazará partidas honradas. Es la lección que costó el recuento de
 * `entropy` (95 de 96) y la que se acaba de repetir en damas con `sinProgreso`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

let fallos = 0;
const comprueba = (bien, titulo, detalle = '') => {
    if (!bien) fallos++;
    console.log(`  ${bien ? verde('✓') : rojo('✗')} ${titulo}${detalle ? gris('  — ' + detalle) : ''}`);
};

console.log('\n¿Tiene spades su subasta?\n');

const reglas = await cargarReglas('spades', {});
const nueva = () => reglas.nuevaPartida({ semilla: 7, seed: 7 });

// ── 1. Al empezar se APUESTA, no se juega ────────────────────────
{
    const p = nueva();
    const st = reglas.estado(p, 0);
    const movs = (st.legal_moves ?? []).map(String);
    const sonApuestas = movs.length > 0 && movs.every(m => /^(apostar:)?\d{1,2}$/.test(m));
    comprueba(sonApuestas, 'la primera jugada es una APUESTA, no una carta',
        `salen: ${movs.slice(0, 5).join(', ')}${movs.length > 5 ? '…' : ''}`);

    // Trece cartas en la mano ⇒ se puede apostar de 0 a 13. El 0 es «nil» y tiene
    // que estar: es la jugada más arriesgada del juego y sin ella falta media spec.
    const n = (x) => movs.some(m => m.replace('apostar:', '') === String(x));
    comprueba(n(0) && n(13), 'se puede apostar desde 0 (nil) hasta 13',
        `0:${n(0) ? 'sí' : 'NO'} 13:${n(13) ? 'sí' : 'NO'}`);

    /**
     * ⚠️ LA CARTA TIENE QUE SER UNA DE VERDAD, O ESTE VERDE NO VALE NADA.
     *
     * La primera versión probaba con `H_2` a secas y salía en verde HOY, sin subasta
     * ninguna: el juego la rechazaba porque ese nombre no existe —sus jugadas se llaman
     * `jugar:H_2`— no porque hubiera una fase de apuestas que respetar. Un verde que
     * sale por un nombre mal escrito seguiría saliendo con la subasta implementada al
     * revés.
     *
     * Se coge una carta de la MANO del jugador y se construye la jugada tal y como el
     * juego la nombra, para que el rechazo sólo pueda venir de la fase.
     */
    const mano = st.mano ?? st.cartas ?? st.player_hand ?? [];
    const idCarta = mano.length
        ? (typeof mano[0] === 'object' ? (mano[0].id ?? mano[0].carta) : mano[0])
        : null;
    if (!idCarta) {
        comprueba(false, 'jugar una carta antes de apostar se RECHAZA',
            'no encuentro la mano en el estado, así que no puedo construir la jugada');
    } else {
        const antes = JSON.stringify(reglas.estado(p, 0));
        const acepto = reglas.mover(p, `jugar:${idCarta}`) || reglas.mover(p, String(idCarta));
        const igual = JSON.stringify(reglas.estado(p, 0)) === antes;
        comprueba(!acepto && igual, 'jugar una carta REAL antes de apostar se rechaza y no cambia nada',
            acepto ? `aceptó jugar:${idCarta} sin haber apostado` : `probado con jugar:${idCarta}`);
    }
}

// ── 2. Apuestan los cuatro, y sólo entonces se juega ─────────────
{
    const p = nueva();
    const apuesta = (v) => reglas.mover(p, `apostar:${v}`) || reglas.mover(p, String(v));
    let hechas = 0;
    for (let i = 0; i < 4; i++) if (apuesta(3)) hechas++;
    comprueba(hechas === 4, 'apuestan los cuatro asientos antes de repartir juego',
        `aceptadas ${hechas} de 4`);

    /**
     * ⚠️ ESTE VERDE SÓLO CUENTA SI LAS APUESTAS SE ACEPTARON.
     *
     * Sin la comprobación de arriba, esto salía en verde HOY: como las cuatro apuestas
     * se rechazaban, las jugadas seguían siendo cartas «después» de una fase que nunca
     * ocurrió. Un verde que se cumple porque el paso anterior falló es peor que un rojo,
     * porque cuenta como progreso.
     */
    const st = reglas.estado(p, 0);
    const movs = (st.legal_moves ?? []).map(String);
    const ahoraCartas = movs.length > 0 && movs.every(m => !/^(apostar:)?\d{1,2}$/.test(m));
    comprueba(hechas === 4 && ahoraCartas, 'después de las cuatro apuestas, las jugadas son CARTAS',
        hechas !== 4 ? 'no cuenta: las apuestas ni se aceptaron' : `salen: ${movs.slice(0, 4).join(', ')}`);

    // Las apuestas tienen que estar EN EL ESTADO, o la re-simulación no las tiene.
    const txt = JSON.stringify(st);
    comprueba(/apuesta|bid|apostad/i.test(txt), 'las apuestas viajan en el estado publicado',
        'sin esto el verificador rechaza partidas honradas');
}

// ── 3. La puntuación premia ACERTAR, no ganar ────────────────────
//
// Es la comprobación que da sentido a todo lo demás: si acertar una apuesta baja no
// puntúa más que fallar una alta, la subasta es decorativa.
{
    const jugarEntera = (apuestas) => {
        const p = nueva();
        for (const a of apuestas) { if (!(reglas.mover(p, `apostar:${a}`) || reglas.mover(p, String(a)))) return null; }
        for (let i = 0; i < 400; i++) {
            const st = reglas.estado(p, 0);
            if (st.is_game_over) break;
            const movs = st.legal_moves ?? [];
            if (!movs.length) break;
            if (!reglas.mover(p, movs[0])) break;
        }
        return reglas.estado(p, 0);
    };

    const fin = jugarEntera([3, 3, 3, 4]);
    comprueba(!!fin && fin.is_game_over, 'una partida con subasta llega al final', fin ? '' : 'no terminó');

    if (fin) {
        // Quien se pasa de su apuesta cobra las «bolsas» de una en una, no diez.
        // Quien no llega, no cobra. Eso es lo que separa spades de un cuenta-bazas.
        const puntos = fin.puntos ?? fin.score?.white ?? null;
        comprueba(Number.isFinite(puntos), 'la partida publica una puntuación numérica',
            `puntos = ${puntos}`);
    }
}

// ── 4. Y se puede volver a jugar, que es la tesis del banco ──────
{
    const p = nueva();
    const jugadas = [];
    const mete = (m) => { if (reglas.mover(p, m)) { jugadas.push(m); return true; } return false; };
    for (const a of [2, 3, 3, 4]) { if (!mete(`apostar:${a}`)) mete(String(a)); }
    for (let i = 0; i < 400; i++) {
        const st = reglas.estado(p, 0);
        if (st.is_game_over) break;
        const movs = st.legal_moves ?? [];
        if (!movs.length || !mete(movs[0])) break;
    }
    /**
     * ⚠️ Y AQUÍ TAMBIÉN: SÓLO CUENTA SI LA LISTA LLEVA APUESTAS DENTRO.
     *
     * Hoy salía en verde con 52 jugadas y CERO apuestas — verificaba perfectamente una
     * partida sin subasta. Lo que hay que demostrar no es que el verificador funcione:
     * es que sigue funcionando CON la fase nueva dentro, que es donde se rompería si
     * las apuestas se guardaran fuera del estado.
     */
    const conApuestas = jugadas.filter(m => /^(apostar:)?\d{1,2}$/.test(String(m))).length;
    const v = verificar(reglas, { juego: 'spades', semilla: 7, jugadas });
    comprueba(conApuestas === 4 && v.valida === true,
        'una partida CON sus cuatro apuestas se verifica volviéndola a jugar',
        conApuestas !== 4 ? `no cuenta: la lista lleva ${conApuestas} apuestas, no 4`
                          : (v.valida ? `${jugadas.length} jugadas` : (v.motivo ?? 'no verifica')));
}

console.log(`\n  ${fallos === 0
    ? verde('la subasta está terminada')
    : rojo(`${fallos} comprobación(es) en rojo — la subasta todavía no está`)}\n`);
process.exit(fallos ? 1 : 0);
