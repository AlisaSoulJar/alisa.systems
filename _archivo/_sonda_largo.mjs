/**
 * ¿CUÁNTO AGUANTA UNA MESA COMPARTIDA CUANDO LA PARTIDA SE ALARGA?
 *
 * Pregunta detrás de la de Oscar sobre los juegos indie/AAA: las salas funcionan
 * en los 28 juegos de turnos, pero un juego con más presencia —más acciones por
 * minuto— hace partidas MUCHO más largas. Y el árbitro no guarda el estado: guarda
 * la lista de jugadas y **la vuelve a jugar entera en cada petición** (`reconstruir`).
 * Eso es lo que hace que un recibo sea verificable por un tercero, y también lo que
 * hace que el coste crezca con la longitud.
 *
 * O sea que el límite no es «cuántos jugadores» —eso ya está resuelto— sino «cuántas
 * jugadas». Se mide en vez de estimarse: se juega una partida larga contra el worker
 * desplegado y se cronometra la misma petición al principio y al final.
 */
const MESAS = 'https://alisa-mesas.prime-6d5.workers.dev';
const JUEGO = process.argv[2] ?? 'go';
const TOPE = Number(process.argv[3]) || 300;

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const pedir = async (ruta, cuerpo) => {
    const t0 = performance.now();
    const r = await fetch(`${MESAS}${ruta}`, cuerpo
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : {});
    const datos = await r.json().catch(() => ({}));
    return { ms: performance.now() - t0, datos };
};

const sala = `largo-${JUEGO}-${Math.floor(Math.random() * 1e6)}`;
const { datos: s0 } = await pedir(`/mesa/${sala}/sentarse`, { quien: 'ana', juego: JUEGO, jugadores: 1 });
const secreto = s0.secret ?? s0.secreto;

console.log(`\n${JUEGO}  ${gris(sala)}\n`);
const marcas = [];
let est = s0, n = 0;
while (n < TOPE) {
    const legales = (est.legal_moves ?? []).filter((m) => m !== 'nueva');
    if (!legales.length || est.is_game_over) break;
    const { ms, datos } = await pedir(`/mesa/${sala}/jugar`,
        { quien: 'ana', secreto, jugada: legales[0] });
    if (datos.error) break;
    est = datos; n++;
    // Se guardan marcas repartidas para ver la FORMA de la curva, no dos puntos:
    // con sólo el primero y el último no se distingue una recta de una parábola.
    if (n % 25 === 0) marcas.push({ jugadas: Number(datos.moves) || n, ms });
}

console.log(gris('  jugadas en la mesa │ lo que tarda una jugada'));
for (const m of marcas) {
    const barra = '█'.repeat(Math.min(48, Math.round(m.ms / 12)));
    console.log(`  ${String(m.jugadas).padStart(6)}          │ ${String(Math.round(m.ms)).padStart(5)} ms ${gris(barra)}`);
}
if (marcas.length >= 2) {
    const a = marcas[0], z = marcas[marcas.length - 1];
    const factorJugadas = z.jugadas / a.jugadas;
    const factorTiempo = z.ms / a.ms;
    console.log(`\n  de ${a.jugadas} a ${z.jugadas} jugadas (×${factorJugadas.toFixed(1)}),`
              + ` el tiempo pasó de ${Math.round(a.ms)} a ${Math.round(z.ms)} ms (×${factorTiempo.toFixed(1)})`);
    console.log(gris('  Crecer con la longitud es lo esperado: el árbitro re-juega la partida entera'));
    console.log(gris('  en cada petición, que es lo que hace el recibo verificable por un tercero.'));
}
console.log(verde(`\n✓ ${n} jugadas seguidas sin que la mesa se rompiera\n`));
