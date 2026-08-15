/**
 * jugadores.mjs — ¿pueden jugar TODOS los tipos de jugador a TODOS los juegos?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node jugadores.mjs                   los cinco tipos × los 35 juegos
 *     node jugadores.mjs --juego damas     uno solo, con detalle
 *     node jugadores.mjs --aportar         y manda al corpus lo que salga
 *
 * ⚠️ LA PREGUNTA QUE CONTESTA, Y POR QUÉ NO LA CONTESTABA NADIE.
 *
 * Todo este proyecto se sostiene sobre una frase: **personas y máquinas juegan al
 * mismo juego**. De ahí sale que la clasificación compare algo, que el corpus valga
 * y que el banco de pruebas no sea un adorno.
 *
 * Y estaba comprobada a trozos. Cada instrumento miraba una esquina:
 *
 *     tacto.mjs        la PERSONA, con dedo y con ratón      (35/35, en navegador)
 *     calibrar.mjs     DOS políticas, para calibrar el techo (no las tres)
 *     tabla.mjs        las líneas base contra los modelos    (sólo los que puntúan)
 *     jugar_llm.mjs    UN modelo por la puerta de texto      (un juego cada vez)
 *
 * Ninguno preguntaba lo simple: **de los cinco tipos de jugador que el sistema
 * declara, ¿cuántos pueden sentarse hoy en cada uno de los treinta y cinco juegos y
 * terminar una partida que se pueda verificar?** Eso es esto, y la respuesta es una
 * tabla de cinco por treinta y cinco donde cada casilla se ha jugado de verdad.
 *
 * ⚠️ LOS TIPOS NO SE ESCRIBEN AQUÍ: SE LEEN DE `asientos.js`.
 *
 * `CONTROLADORES` es el contrato —sus claves viajan en `?asientos=`— así que esta
 * herramienta recorre lo que haya. El día que se añada un sexto tipo aparece solo, y
 * si nadie lo ha cableado, sale en rojo. Una lista escrita a mano aquí sería la
 * séptima de este proyecto que se separa de la realidad en silencio.
 *
 * ⚠️ Y LA PERSONA NO SE PUEDE SIMULAR, ASÍ QUE NO SE FINGE.
 *
 * Un asiento de persona devuelve `elegir() => null` a propósito: espera un dedo. Aquí
 * se dice eso mismo en vez de inventarse una persona de mentira — lo que sí está
 * medido es que sus botones llegan, y eso lo hace `tacto.mjs` en un navegador de
 * verdad. Fingir una persona en Node daría un verde que no significa nada.
 */
import { writeFile } from 'node:fs/promises';

const { JUEGOS, cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
const { CONTROLADORES, crearControlador, esPersona } =
    await import('./public/arcade/js/protohub/asientos.js');
const { ProtoHub } = await import('./public/arcade/js/protohub/ProtoHub.js');
const { verificar } = await import('./public/arcade/js/protohub/Verificador.js');

const args = process.argv.slice(2);
const valor = (n, pd) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : pd; };
const SOLO = valor('--juego', null);
const SEMILLA = Number(valor('--semilla', 5));
const TOPE = Number(valor('--tope', 1200));
const APORTAR = args.includes('--aportar');
const SITIO = valor('--sitio', 'https://alisa.systems');

/**
 * El asiento de modelo necesita con quién hablar.
 *
 *     node jugadores.mjs --llm-url http://127.0.0.1:8759/v1 --llm-modelo qwen2.5:7b
 *
 * ⚠️ Y SIN ESO NO SALE EN ROJO: SALE EN GRIS.
 *
 * «No puede jugar» y «no le he dado servidor» son cosas distintas, y pintarlas igual
 * es la forma más rápida de que un suspenso permanente enseñe a ignorar los
 * suspensos. Es la misma distinción que ya se aplica en `legibilidad` entre lo que
 * hay que arreglar y lo que hay que saber.
 */
const LLM = {
    url: valor('--llm-url', process.env.ALISA_LLM_URL ?? null),
    modelo: valor('--llm-modelo', process.env.ALISA_LLM_MODELO ?? null),
};

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * Una partida entera con un controlador en TODOS los asientos.
 *
 * Se juega por el ProtoHub —`reset` y `move`— y no llamando a las reglas a pelo, y
 * eso no es un detalle: es el mismo camino que usa la mesa, así que lo que sale es
 * un recibo de verdad, con su semilla y sus normas, que se puede verificar y aportar.
 * Una simulación que jugara por debajo mediría otra cosa.
 */
async function unaPartida(juego, spec) {
    const reglas = await cargarReglas(juego, {});
    if (!reglas) return { estado: 'sin reglas' };

    let mando;
    try { mando = crearControlador(spec, { juego, reglas, llm: LLM }); }
    catch (e) { return { estado: 'no se puede sentar', motivo: e.message }; }

    const hub = new ProtoHub().registrar(juego, reglas);
    hub.reset(juego, { semilla: SEMILLA });

    let n = 0, forzadas = 0;
    const t0 = Date.now();
    for (; n < TOPE; n++) {
        const st = hub.state(juego);
        if (st.is_game_over) break;
        const acciones = (st.legal_moves ?? st.legal_actions ?? [])
            .filter(m => m !== 'nueva' && m !== 'reset');
        if (!acciones.length) break;

        let jugada;
        try { jugada = await mando.elegir({ juego, st, acciones, p: hub.partidas.get(juego), reglas }); }
        catch (e) { return { estado: 'reventó al elegir', motivo: e.message, jugadas: n }; }

        /**
         * ⚠️ SI NO SUPO ELEGIR, SE CUENTA COMO FORZADA Y SE DICE.
         *
         * Es la misma regla que el banco: rellenar el hueco en silencio sería regalar
         * partidas a quien no supo jugarlas. Aquí se juega la primera legal para que
         * la partida siga —hace falta llegar al final para tener recibo— pero el
         * número de forzadas se publica, que es lo que lo hace honesto.
         */
        if (!jugada) { jugada = acciones[0]; forzadas++; }
        if (!hub.move(juego, { move: jugada }).ok) {
            return { estado: 'jugada rechazada', motivo: jugada, jugadas: n };
        }
    }

    const rec = hub.partida(juego);
    const st = hub.state(juego);
    const v = verificar(reglas, rec);
    return {
        estado: v.valida ? 'ok' : 'no verifica',
        motivo: v.motivo, jugadas: rec.jugadas.length, forzadas,
        terminada: !!st.is_game_over, puntos: v.puntos,
        ms: Date.now() - t0, recibo: rec, tipo: mando.tipo,
    };
}

// ── La tabla ────────────────────────────────────────────────────────────────
const juegos = SOLO ? [SOLO] : JUEGOS;
const tipos = Object.keys(CONTROLADORES);

console.log(`\nLOS TIPOS DE JUGADOR — ¿puede cada uno jugar a cada juego?`);
console.log(gris(`  ${tipos.length} tipos × ${juegos.length} juegos · semilla ${SEMILLA}\n`));

const resumen = new Map(tipos.map(t => [t, { ok: 0, mal: 0, forzadas: 0, jugadas: 0, fallos: [] }]));
const aportables = [];

for (const juego of juegos) {
    const celdas = [];
    for (const spec of tipos) {
        /**
         * La persona se salta, y se dice por qué. Su asiento devuelve `null` siempre
         * —espera un dedo— así que «jugar» aquí sería jugar por ella con la primera
         * legal y contarlo como si hubiera jugado. Eso es exactamente el verde que no
         * significa nada.
         */
        if (esPersona(spec)) { celdas.push(gris('persona: la mide tacto.mjs')); continue; }

        // Sin servidor no es que no pueda: es que no se le ha dado con quién hablar.
        if (spec.startsWith('llm') && !(LLM.url && LLM.modelo)) {
            celdas.push(gris(`${spec}: sin servidor (--llm-url / --llm-modelo)`));
            resumen.get(spec).sinCable = true;
            continue;
        }

        const r = await unaPartida(juego, spec);
        const s = resumen.get(spec);
        if (r.estado === 'ok') {
            s.ok++; s.jugadas += r.jugadas; s.forzadas += r.forzadas;
            celdas.push(verde(`${spec} ${r.jugadas}j`) + (r.forzadas ? rojo(`+${r.forzadas}f`) : ''));
            if (r.terminada && r.recibo?.jugadas?.length) {
                aportables.push({ ...r.recibo, tipo: r.tipo, quien: spec });
            }
        } else {
            s.mal++;
            s.fallos.push(`${juego}: ${r.estado}${r.motivo ? ` (${String(r.motivo).slice(0, 40)})` : ''}`);
            celdas.push(rojo(`${spec} ✗ ${r.estado}`));
        }
    }
    console.log(`  ${juego.padEnd(11)} ${celdas.join('  ')}`);
}

console.log('');
let fallos = 0;
for (const [spec, s] of resumen) {
    if (esPersona(spec)) {
        console.log(`  ${'persona'.padEnd(13)} ${gris('no se simula — sus botones los mide `node tacto.mjs` en un navegador')}`);
        continue;
    }
    if (s.sinCable) {
        console.log(`  ${spec.padEnd(13)} ${gris('sin servidor — pásale `--llm-url` y `--llm-modelo` para medirlo')}`);
        continue;
    }
    const total = s.ok + s.mal;
    const linea = `${s.ok}/${total} juegos · ${s.jugadas} jugadas`
        + (s.forzadas ? ` · ${s.forzadas} forzadas` : '');
    console.log(`  ${spec.padEnd(13)} ${s.mal ? rojo(linea) : verde(linea)}`);
    for (const f of s.fallos.slice(0, 6)) console.log(`      ${rojo('✗')} ${f}`);
    if (s.fallos.length > 6) console.log(gris(`      y ${s.fallos.length - 6} más`));
    fallos += s.mal;
}

/**
 * ⚠️ APORTAR VA DETRÁS DE UNA BANDERA, Y NO POR PRUDENCIA VACÍA.
 *
 * Estas partidas son legítimas —se juegan por el mismo hub y se verifican igual— y
 * llenarían el corpus en un minuto. Precisamente por eso no se mandan solas: un
 * corpus lleno de la política tonta jugando la primera legal dice muy poco, y
 * mezclarlas sin querer con las de personas emborronaría el único dato que hace
 * interesante al banco. Van marcadas con su `tipo` y su `quien`, para que quien lo
 * lea sepa qué está mirando.
 */
if (APORTAR && aportables.length) {
    console.log(`\n  aportando ${aportables.length} partida(s) a ${SITIO}/api/dataset …`);
    let guardadas = 0, rechazadas = [];
    for (const p of aportables) {
        try {
            const r = await fetch(`${SITIO}/api/dataset`, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify(p),
            }).then(x => x.json());
            if (r.guardada) guardadas++;
            else rechazadas.push(`${p.juego}/${p.quien}: ${r.motivo}`);
        } catch (e) { rechazadas.push(`${p.juego}: ${e.message}`); }
    }
    console.log(`  ${verde(`${guardadas} guardadas`)}` + (rechazadas.length ? ` · ${rechazadas.length} no` : ''));
    for (const r of rechazadas.slice(0, 8)) console.log(gris(`      · ${r}`));
} else if (aportables.length) {
    console.log(gris(`\n  ${aportables.length} partidas listas para aportar (--aportar para mandarlas)`));
}

console.log(fallos ? `\n${rojo(`✗ ${fallos} casilla(s) donde alguien no puede jugar`)}\n`
                   : `\n${verde('✓ todos los tipos que se pueden simular juegan a todos los juegos')}\n`);
process.exit(fallos ? 1 : 0);
