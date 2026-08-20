/**
 * ¿PUEDEN DOS BETATESTERS JUGAR UNO CONTRA OTRO, DE VERDAD?
 *
 * Pregunta de Oscar sobre entropy. No se contesta leyendo el worker: se contesta
 * jugando una partida entera contra el worker DE PRODUCCIÓN, con dos secretos
 * distintos, y mirando cuatro cosas que se pueden falsear por separado:
 *
 *   1. que la mesa avance hasta el final,
 *   2. que jueguen LOS DOS (el fallo clásico: la casa juega por el segundo),
 *   3. que el que no tiene el turno reciba un 409 si lo intenta,
 *   4. que la PANTALLA de cada uno diga la verdad sobre de quién es el turno.
 *
 * ⚠️ LA CUARTA ES LA QUE NO MIRABA NADIE, Y ERA LA ROTA.
 *
 * El árbitro decide con el estado de la silla 0 y con `ordenAsientos`, así que
 * repartía los turnos bien. Pero cada jugador ve `estado(p, su_silla)`, y ahí
 * `turn` comparaba contra 0 en vez de contra su asiento: el segundo leía «player»
 * —que significa «tú»— justo cuando NO le tocaba. Mesa correcta, pantalla mintiendo.
 * Por eso se mira lo que ve cada uno, y no sólo lo que hace la mesa.
 *
 * ⚠️ NO TIENE SABOTAJE DECLARADO EN `npm run pruebas`, Y SE DICE POR QUÉ.
 *
 * Los sabotajes de la casa cambian un fichero del repositorio y vuelven a correr la
 * comprobación. Esto no mide el repositorio: mide el worker DESPLEGADO, así que un
 * sabotaje de verdad obligaría a desplegar código roto a producción y volver a
 * desplegarlo bien — con la ventana de por medio en la que las mesas de cualquiera
 * estarían servidas por esa versión.
 *
 * A cambio ya pasó por el único sabotaje que no se puede fingir: se escribió ANTES
 * del arreglo y salió en rojo con los tres juegos que se probaron —«bruno ve las
 * jugadas de ana: pedir:4:1, pedir:5:1»—, y en verde con el arreglo desplegado y
 * nada más cambiado. Eso es lo que un sabotaje intenta demostrar.
 */
const MESAS = 'https://alisa-mesas.prime-6d5.workers.dev';
const JUEGOS = process.argv.slice(2).length ? process.argv.slice(2) : ['entropy'];

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const pedir = async (ruta, cuerpo) => {
    const r = await fetch(`${MESAS}${ruta}`, cuerpo
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : {});
    return { codigo: r.status, datos: await r.json().catch(() => ({})) };
};

let fallos = 0;
for (const juego of JUEGOS) {
    // La sala lleva un número al azar porque una sala reutilizada trae la partida
    // de antes, y entonces esto mediría el historial de otro.
    const sala = `sonda-${juego}-${Math.floor(Math.random() * 1e6)}`;
    const quienes = ['ana', 'bruno'];
    const secretos = {};
    console.log(`\n${juego}  ${gris(sala)}`);

    let ok = true;
    for (const quien of quienes) {
        const { codigo, datos } = await pedir(`/mesa/${sala}/sentarse`,
            { quien, juego, jugadores: quienes.length });
        if (codigo !== 200) { console.log(`  ${rojo('✗')} ${quien} no se pudo sentar (${codigo}) ${datos.error ?? ''}`); ok = false; break; }
        secretos[quien] = datos.secret ?? datos.secreto;
    }
    if (!ok) { fallos++; continue; }

    const jugadas = { ana: 0, bruno: 0 };
    const pantallaMintio = [], filtraciones = [];
    let vueltas = 0, fin = false, atasco = null;

    while (vueltas++ < 200 && !fin) {
        /**
         * ⚠️ SE MIRA LA PANTALLA DE LOS DOS, NO LA DEL QUE JUEGA.
         *
         * `player` es un pronombre: significa «tú». Si los dos lo ven a la vez, uno
         * de los dos tiene delante una pantalla que le miente, aunque la mesa reparta
         * bien los turnos. Exactamente una silla puede verlo — y `?quien=` existe
         * justo para poder preguntar «¿qué ves TÚ?» sin sentarse en su sitio.
         */
        const vistas = {};
        for (const q of quienes) {
            const { datos } = await pedir(`/mesa/${sala}?quien=${q}`);
            vistas[q] = datos;
        }
        const mesa = vistas[quienes[0]];
        if (mesa.is_game_over) { fin = true; break; }

        /**
         * ⚠️ EN LA MISMA RESPUESTA VIENEN DOS `turn` CON VOCABULARIOS DISTINTOS.
         *
         * El de arriba es el NOMBRE de quien mueve —lo traduce el árbitro— y ése es
         * el bueno. Dentro de `state` viaja el del juego, que es un pronombre por
         * silla (`player`/`cpu1`). Se miran los dos porque un cliente puede leer
         * cualquiera de ellos, y hasta hoy el de dentro mentía al segundo jugador.
         */
        const jugador = mesa.turn;
        if (!jugador || !quienes.includes(jugador)) {
            atasco = `la mesa no dice a quién le toca (turn=${jugador})`; break;
        }

        const pronombres = quienes.filter(q => vistas[q].state?.turn === 'player');
        if (quienes.some(q => vistas[q].state?.turn === 'player') && pronombres.length !== 1) {
            pantallaMintio.push(`${quienes.map(q => `${q}:${vistas[q].state?.turn}`).join(' ')} (toca ${jugador})`);
        }

        /**
         * ⚠️ Y LA MISMA LISTA, POR LA OTRA PUERTA.
         *
         * `legal_moves` de arriba ya se entregaba sólo a quien mueve. Dentro de
         * `state` iba la misma lista para todo el mundo, y el motor de cartas pinta
         * los botones desde AHÍ. Se mira el estado crudo y no el campo de arriba,
         * porque el campo de arriba llevaba meses correcto mientras la fuga seguía.
         */
        const otroQueMira = quienes.find(q => q !== jugador);
        const fuga = vistas[otroQueMira]?.state?.legal_moves
                  ?? vistas[otroQueMira]?.state?.legal_actions;
        if (fuga?.length) {
            filtraciones.push(`${otroQueMira} ve las jugadas de ${jugador}: ${fuga.slice(0, 3).join(', ')}`);
        }

        // El que NO tiene el turno lo intenta: tiene que rebotar con 409.
        const otro = quienes.find(q => q !== jugador);
        const legalesOtro = (vistas[otro]?.legal_moves ?? []).filter(m => m !== 'nueva');
        if (otro && legalesOtro.length) {
            const { codigo } = await pedir(`/mesa/${sala}/jugar`,
                { quien: otro, secreto: secretos[otro], jugada: legalesOtro[0] });
            if (codigo === 200) { atasco = `${otro} movió sin tener el turno`; break; }
        }

        const legales = (vistas[jugador].legal_moves ?? []).filter(m => m !== 'nueva');
        if (!legales.length) { atasco = `${jugador} no tiene jugadas legales`; break; }

        const { codigo, datos: tras } = await pedir(`/mesa/${sala}/jugar`,
            { quien: jugador, secreto: secretos[jugador], jugada: legales[0] });
        if (codigo !== 200) { atasco = `${jugador} no pudo jugar '${legales[0]}': ${tras.error ?? codigo}`; break; }
        jugadas[jugador]++;
        if (tras.is_game_over) fin = true;
    }

    const jugaronLosDos = jugadas.ana > 0 && jugadas.bruno > 0;
    const problemas = [];
    if (atasco) problemas.push(atasco);
    if (!jugaronLosDos) problemas.push(`jugó sólo uno: ana ${jugadas.ana}, bruno ${jugadas.bruno}`);
    if (pantallaMintio.length) problemas.push(`la pantalla mintió en ${pantallaMintio.length} momentos, p.ej. ${pantallaMintio[0]}`);
    if (filtraciones.length) problemas.push(`fuga en ${filtraciones.length} momentos: ${filtraciones[0]}`);

    if (problemas.length) {
        fallos++;
        console.log(`  ${rojo('✗')} ${problemas.join('\n      ')}`);
    } else {
        console.log(`  ${verde('✓')} ${gris(`ana ${jugadas.ana} · bruno ${jugadas.bruno} jugadas${fin ? ', partida terminada' : ''}`)}`);
    }
}

console.log(fallos
    ? rojo(`\n✗ ${fallos} juegos donde dos personas no pueden jugar bien\n`)
    : verde(`\n✓ dos personas pueden jugar una contra otra\n`));
process.exit(fallos ? 1 : 0);
