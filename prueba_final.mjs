/**
 * prueba_final.mjs — que al terminar una partida haya salida
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_final.mjs        (entra en `npm test`)
 *
 * ⚠️ DE DÓNDE SALE: DE QUE NO LA HABÍA. EN LAS TREINTA Y CINCO.
 *
 * El panel de jugadas empezaba con `if (terminada) return aviso('partida
 * terminada')`. Ahí se acababa la página: sin botón para jugar otra, había que
 * recargar. Y midiéndolo salió lo que lo hace peor — DIECISIETE juegos publican
 * `nueva` entre sus jugadas legales justo al terminar, para eso exactamente, y el
 * panel la descartaba en su primera línea.
 *
 * Lo que esto vigila es la promesa del botón «jugar otra», que es genérico: se manda
 * `nueva` y el ProtoHub reinicia, lo publique el juego o no. Si un día esa promesa
 * dejara de cumplirse en un juego, el botón estaría ahí sin hacer nada — y un botón
 * que no responde se lee como una página rota.
 *
 * No comprueba cómo se ve la pantalla de fin: eso vive en el navegador y lo miran
 * `laboratorio` y las capturas. Comprueba lo único que puede fallar en silencio.
 */
const { JUEGOS, cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
const { ProtoHub } = await import('./public/arcade/js/protohub/ProtoHub.js');

const TOPE = 2500;
let fallos = 0, terminados = 0, sinTerminar = [];

console.log('\nEL FINAL DE LA PARTIDA — que siempre haya salida\n');

for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    if (!reglas) { console.log(`  ✗ ${juego}: sin reglas`); fallos++; continue; }

    const hub = new ProtoHub().registrar(juego, reglas);
    hub.reset(juego, { semilla: 3 });

    let st = hub.state(juego), n = 0;
    while (!st.is_game_over && n < TOPE) {
        const l = (st.legal_moves ?? st.legal_actions ?? [])
            .filter(m => m !== 'nueva' && m !== 'reset');
        if (!l.length) break;
        if (!hub.move(juego, { move: l[0] }).ok) break;
        st = hub.state(juego); n++;
    }

    /**
     * Los que no terminan en 2500 jugadas no se saltan ni se dan por buenos: se
     * prueba `nueva` igual. Lo que se comprueba es que la salida FUNCIONE, y eso no
     * depende de haber llegado al final — quien pulsa «jugar otra» a mitad de una
     * partida eterna necesita lo mismo.
     */
    if (!st.is_game_over) sinTerminar.push(juego); else terminados++;

    const antes = hub.partida(juego);
    const r = hub.move(juego, { move: 'nueva' });
    const luego = hub.partida(juego);
    const vivo = hub.state(juego);

    if (!r.ok) { console.log(`  ✗ ${juego}: 'nueva' no fue aceptada`); fallos++; }
    else if (luego.jugadas.length !== 0) {
        console.log(`  ✗ ${juego}: tras 'nueva' quedan ${luego.jugadas.length} jugadas grabadas`);
        fallos++;
    } else if (vivo.is_game_over) {
        console.log(`  ✗ ${juego}: tras 'nueva' la partida sigue terminada`);
        fallos++;
    } else if (luego.semilla === antes.semilla && antes.semilla !== null) {
        // No es fallo: hay juegos con la semilla dentro del estado. Se dice porque
        // «jugar otra» y que salga el mismo reparto es raro de ver y conviene saberlo.
        console.log(`  · ${juego}: 'nueva' repite la misma semilla (${luego.semilla})`);
    }
}

console.log(`\n  ${terminados}/${JUEGOS.length} llegan al final en ${TOPE} jugadas`
          + (sinTerminar.length ? ` · no terminan: ${sinTerminar.join(' ')}` : ''));
console.log(fallos ? `\n✗ ${fallos} juego(s) sin salida al terminar\n`
                   : `\n✓ los ${JUEGOS.length} tienen salida: 'nueva' empieza otra partida\n`);
process.exit(fallos ? 1 : 0);
