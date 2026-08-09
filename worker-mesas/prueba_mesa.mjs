/**
 * prueba_mesa.mjs — ¿pueden dos seres jugar la MISMA partida y que valga?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node worker-mesas/prueba_mesa.mjs [--juego brisca] [--mesas URL] [--sitio URL]
 *
 * Prueba contra el despliegue REAL, no contra un simulacro. Es la única forma
 * de comprobar lo que aquí importa: que la mesa compartida y el verificador
 * —dos servicios distintos, en dos sitios distintos— siguen jugando al mismo
 * juego. Un simulacro con las reglas importadas en el mismo proceso pasaría
 * siempre, incluso el día que el worker cargue otra baraja.
 *
 * Lo que se comprueba, en orden:
 *   1. dos seres se sientan a la misma mesa;
 *   2. el árbitro rechaza a quien no le toca;
 *   3. el árbitro rechaza una jugada que no existe;
 *   4. se juega la partida entera turnándose de verdad;
 *   5. y el recibo que sale se verifica en `/api/verificar` — con los MISMOS
 *      puntos que la mesa declaraba.
 *
 * El paso 5 es el que da sentido a los otros cuatro: una mesa compartida que
 * produjera recibos que no verifican no serviría para nada, porque el resultado
 * de jugar acompañado no podría aportarse al banco de datos.
 */
const arg = (n, d) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : d;
};
const MESAS = arg('mesas', 'https://alisa-mesas.prime-6d5.workers.dev').replace(/\/$/, '');
const SITIO = arg('sitio', 'https://alisa.systems').replace(/\/$/, '');
const JUEGO = arg('juego', 'brisca');
const SALA = arg('sala', `prueba-${Date.now().toString(36)}`);

let fallos = 0;
const bien = (m) => console.log(`  ✓ ${m}`);
const mal = (m) => { fallos++; console.log(`  ✗ ${m}`); };
/**
 * ⚠️ AL FALLAR, ENSEÑA LA RESPUESTA. Sin esto, un fallo se leía
 * «✗ se sienta ana — undefined, semilla undefined»: el mensaje se compone con
 * campos que precisamente no llegaron, así que dice lo mismo pase lo que pase y
 * el motivo real —que el servidor devolvió un 503 explicándolo— se pierde. Dos
 * vueltas costó, y las dos las resolvió un `curl` a mano que sobraba.
 */
const comprobar = (cond, m, cuerpo) => {
    if (cond) return bien(m);
    mal(m);
    if (cuerpo !== undefined) {
        console.log('     respuesta: ' + JSON.stringify(cuerpo).slice(0, 400));
    }
};

async function pedir(ruta, cuerpo) {
    const r = await fetch(MESAS + ruta, cuerpo ? {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
    } : undefined);
    const txt = await r.text();
    let json = null;
    try { json = JSON.parse(txt); } catch { /* lo dice el aviso de abajo */ }
    // Un cuerpo que no es JSON casi siempre es un error de la plataforma
    // (`error code: 1042` y familia). Si se dejara pasar como `null`, el fallo
    // aparecería veinte líneas después disfrazado de otra cosa.
    if (!json) throw new Error(`${ruta} → ${r.status}, y el cuerpo no es JSON: ${txt.slice(0, 120)}`);
    return { codigo: r.status, ...json, _json: json };
}

console.log(`\nMesa compartida · ${JUEGO} · sala '${SALA}'\n${MESAS}\n`);

/**
 * ⚠️ 0. ¿EL ÁRBITRO JUEGA CON LAS MISMAS REGLAS QUE ESTE REPOSITORIO?
 *
 * El worker se despliega APARTE del sitio. Así que un cambio de reglas llega a
 * la página de un jugador en cuanto se publica, y a las salas compartidas sólo
 * cuando alguien se acuerda de lanzar `npm run desplegar:mesas`. Entre una cosa
 * y otra, dos personas en la misma sala juegan a algo distinto de lo que la
 * página les cuenta — y nada falla: la partida avanza, los turnos se reparten y
 * el recibo verifica, porque el verificador es OTRO servicio que puede estar
 * igual de viejo.
 *
 * Pasó hoy: se cambió la baraja de entropy y se añadieron comodines, y la sala
 * siguió repartiendo la española durante horas. Se vio mirando los nombres de
 * las cartas a ojo, que no es forma.
 *
 * El reparto de una semilla fija ES la huella de las reglas: depende de la
 * baraja, de su orden y de cuántas cartas se reparten. Si el árbitro y este
 * repositorio dan el mismo reparto, están jugando al mismo juego.
 */
const SEMILLA_HUELLA = 4242;
{
  const salaH = `${SALA}-huella`;
  const r = await pedir(`/mesa/${salaH}/sentarse`,
      { quien: 'huella', tipo: 'agente', juego: JUEGO, semilla: SEMILLA_HUELLA });
  const { cargarReglas } = await import('../public/arcade/js/protohub/rules/index.js');
  const reglas = await cargarReglas(JUEGO, {});
  const local = reglas.estado(reglas.nuevaPartida({ semilla: SEMILLA_HUELLA, seed: SEMILLA_HUELLA }));

  // Se comparan los campos que delatan la baraja: lo repartido y lo que queda.
  const huella = (st) => JSON.stringify([
      st?.caja ?? st?.mano ?? st?.player_hand ?? null,
      st?.mazo_restante ?? null, st?.descarte ?? st?.cima ?? null,
  ]);
  const suya = huella(r.estado), mia = huella(local);
  comprobar(suya === mia,
      `el árbitro reparte lo mismo que este repositorio (semilla ${SEMILLA_HUELLA})`
      + (suya === mia ? '' : `\n     árbitro: ${suya}\n     aquí:    ${mia}`
                           + `\n     → el worker va con reglas viejas: \`npm run desplegar:mesas\``));
}

// ── 1. Dos seres se sientan ──────────────────────────────────────────────
const a = await pedir(`/mesa/${SALA}/sentarse`, { quien: 'ana', tipo: 'persona', juego: JUEGO, semilla: 7 });
comprobar(a.codigo === 200 && a.sentado === 'ana', `se sienta ana — ${a.titulo}, semilla ${a.semilla}`, a._json);
// Si la mesa ni siquiera abre, lo que sigue sólo produciría ruido encima.
if (a.codigo !== 200) { console.log(`\n✗ la mesa no abre; nada más que probar\n`); process.exit(1); }

/**
 * El segundo puede no caber, y eso puede ser lo CORRECTO.
 * Seis juegos no admiten compañía —el control del banco, los de un jugador, y
 * los que se juegan contra la casa—. La mesa lo dice con un 409 y un motivo, así
 * que la prueba no necesita llevar su propia lista: pregunta y comprueba que la
 * respuesta está razonada. Una lista aquí y otra allí se separan solas.
 */
const b = await pedir(`/mesa/${SALA}/sentarse`, { quien: 'bruno', tipo: 'agente' });

/**
 * ⚠️ EL SECRETO DE CADA SILLA, QUE ESTA PRUEBA NO GUARDABA.
 *
 * La mesa lo entrega al sentarse y lo exige para mover. Se blindó el árbitro y no
 * se tocó ni un cliente: esta prueba mandaba `/jugar` sin él y contestaba 403 con
 * el motivo escrito y la pista puesta.
 *
 * Y lo grave no es el 403, es lo que TAPÓ: siete comprobaciones de más abajo
 * —que los dos juegan, que cada uno tiene su asiento, que el verificador acepta
 * el recibo— fallaban todas por la misma causa y ninguna estaba midiendo ya lo
 * suyo. Una prueba en rojo por un motivo deja de vigilar los otros veinte.
 *
 * Se descubrió por ser la única prueba que NO corre `npm test` —toca la red— y
 * por tanto la única que puede estar rota una semana sin que nadie lo note.
 */
const SECRETOS = { ana: a.secreto ?? null, bruno: b.secreto ?? null };
const jugarComo = (quien, jugada) =>
    pedir(`/mesa/${SALA}/jugar`, { quien, jugada, secreto: SECRETOS[quien] });
const soloUno = b.codigo === 409 && b.solitario === true;
if (soloUno) {
    // Se exige que HAYA motivo, no que sea largo. La primera versión pedía más
    // de 20 caracteres y suspendía a «es de un jugador», que son 16 y lo dice
    // todo. Medir la calidad de una explicación por su longitud premia al que se
    // enrolla.
    comprobar(typeof b.motivo === 'string' && b.motivo.trim() !== '',
        `no admite un segundo, y lo explica: «${b.motivo}»`, b._json);
} else {
    comprobar(b.codigo === 200 && b.asientos?.length === 2,
        `se sienta bruno — asientos: ${b.asientos?.map(x => x.quien).join(', ')}`, b._json);
}
// Sólo los juegos de cartas publican esta marca; el ajedrez no tiene baraja y
// exigírsela era un fallo de la prueba, no del juego. Que cada juego de cartas
// la publique lo vigila `prueba_biblioteca.mjs`, así que aquí no se pierde nada.
if (b.biblioteca === undefined) {
    console.log('  · no usa baraja, así que no hay catálogo que comprobar');
} else {
    comprobar(b.biblioteca === true, `la baraja sale del catálogo (biblioteca: ${b.biblioteca})`, b._json);
}

// ── 2. El árbitro rechaza a quien no está en su sitio ────────────────────
// En una mesa de dos, a quien no le toca. En una de uno, a un desconocido — que
// es el mismo principio: nadie mueve por otro.
const toca = b.turno_de;
const fuera = await jugarComo('bruno', b.acciones[0]);
soloUno
    ? comprobar(fuera.codigo === 403 && /no estás sentado/.test(fuera.error ?? ''),
        `bruno, que no pudo sentarse, tampoco puede jugar → ${fuera.codigo} «${fuera.error}»`)
    : comprobar(fuera.codigo === 409 && /no es tu turno/.test(fuera.error ?? ''),
        `bruno intenta jugar fuera de turno → ${fuera.codigo} «${fuera.error}»`);

// ── 3. …y una jugada que no existe ───────────────────────────────────────
const inventada = await jugarComo(toca, 'jugar:CARTA_INVENTADA');
comprobar(inventada.codigo === 400 && /ilegal/.test(inventada.error ?? ''),
    `${toca} intenta una jugada inventada → ${inventada.codigo} «${inventada.error}»`);

// ── 4. La partida entera, turnándose ─────────────────────────────────────
const TOPE = Number(arg('tope', 400));
let st = await pedir(`/mesa/${SALA}`);
let vueltas = 0, deAna = 0, deBruno = 0;
while (!st.terminada && vueltas++ < TOPE) {
    const quien = st.turno_de;
    if (!quien) { mal('la mesa se quedó sin turno de nadie'); break; }
    // Cada uno elige distinto — no es cosmético: si los dos jugaran igual, la
    // partida no distinguiría un asiento del otro y el reparto no probaría nada.
    // ⚠️ Hay que pedir el estado DICIENDO QUIÉN ERES. Desde que el árbitro sólo
    // ofrece las jugadas legales a quien le toca —porque en un juego de cartas esa
    // lista ES su mano—, un `GET` anónimo devuelve `acciones: []`. No es un fallo:
    // es la fuga tapada.
    const mio = await pedir(`/mesa/${SALA}?quien=${encodeURIComponent(quien)}`);
    const acc = mio.acciones ?? [];
    if (!acc.length) { mal(`${quien} no recibe jugadas legales en su turno`); break; }
    const j = quien === 'ana' ? acc[0] : acc[acc.length - 1];
    quien === 'ana' ? deAna++ : deBruno++;
    st = await jugarComo(quien, j);
    if (st.codigo !== 200) { mal(`jugada rechazada: ${st.error}`); break; }
}
/**
 * Que la partida no quepa en el tope NO es un fallo de la mesa.
 * Con estas dos políticas de andar por casa, go y xiangqi pasan de 400 jugadas
 * sin terminar. La primera versión lo marcaba en rojo junto a los fallos de
 * verdad, y un rojo que no significa nada malo enseña a ignorar los rojos. Lo
 * que sí se comprueba es que la partida AVANZA y que el recibo a medias también
 * vale — que es justo lo que necesita quien se levanta de la mesa antes del
 * final.
 */
if (st.terminada) {
    bien(`partida terminada en ${st.jugadas} jugadas — ana ${deAna}, bruno ${deBruno}`);
} else {
    console.log(`  · sin terminar en el tope de ${TOPE} jugadas — ana ${deAna}, bruno ${deBruno}`
              + ` (normal en go y xiangqi; se comprueba el recibo a medias)`);
    comprobar(st.jugadas >= TOPE, `la partida avanzó de verdad: ${st.jugadas} jugadas`, st._json);
}
if (soloUno) {
    comprobar(deAna > 0 && deBruno === 0, `jugó ana sola, como corresponde — ${deAna} jugadas`);
} else {
    // ⚠️ La comprobación que casi no escribo, por obvia: la primera vez salió
    // «ana 10, bruno 0». La partida terminaba, el marcador cuadraba y el recibo
    // verificaba, pero el segundo jugador no había tocado una carta — la mesa
    // reconocía un solo asiento y la casa jugaba el resto. Todo lo demás verde.
    // Que dos se sienten no prueba que dos jueguen.
    comprobar(deAna > 0 && deBruno > 0,
        `jugaron los dos, no uno solo — ana ${deAna}, bruno ${deBruno}`);
    comprobar(st.asientos?.every(a => a.asiento),
        `cada quién tiene su asiento del juego — ${st.asientos?.map(a => `${a.quien}=${a.asiento}`).join(', ')}`
        + (st.los_juega_la_casa ? ` (+${st.los_juega_la_casa} de la casa)` : ''),
        st._json);
}

// ── 5. Y el recibo vale fuera de la mesa ─────────────────────────────────
const rec = st.recibo;
const v = await fetch(`${SITIO}/api/verificar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...rec, puntos: st.puntos }),
}).then(r => r.json());
comprobar(v.valida === true,
    `el verificador acepta el recibo — válida: ${v.valida}, puntos ${v.puntos} vs declarados ${v.declarados}`);
comprobar(v.puntos === st.puntos,
    `los puntos de la mesa (${st.puntos}) y los del verificador (${v.puntos}) coinciden`);

console.log(`\n${fallos === 0 ? '✓ todo en pie' : `✗ ${fallos} fallo(s)`}\n`);
process.exit(fallos === 0 ? 0 : 1);
