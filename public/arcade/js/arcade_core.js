/**
 * arcade_core.js — el estado de las máquinas del arcade
 *
 * ANTES: sondeaba `http://127.0.0.1:8741/buildings/arcade/games` **cada 5
 * segundos para siempre** y, si no había hub, marcaba TODOS los juegos como
 * `offline`. Es decir: cualquiera que abriera el índice veía ocho máquinas
 * apagadas y una consola llena de errores contra una IP privada — cuando en
 * realidad seis de ellas se juegan perfectamente sin hub.
 *
 * AHORA: los juegos con reglas locales se marcan `local` (jugables). Se sondea
 * el hub UNA vez; si responde, se muestra el estado en vivo y se sigue
 * refrescando. Si no, se deja de molestar a la red.
 */

// Juegos que el ProtoHub sabe jugar en el navegador, sin backend.
// Si añades reglas nuevas en js/protohub/rules/, añádelo aquí.
const JUGABLES_EN_LOCAL = [
    // tablero
    'chess', 'xiangqi', 'go', 'reversi', 'checkers', 'mancala',
    // acción — el motor no solo hace tablero
    'snake', 'fagocito', 'peaton',
];

const HUB = (typeof window !== 'undefined' && window.ALISA_HUB_URL !== undefined)
    ? window.ALISA_HUB_URL
    : 'http://127.0.0.1:8741';

let refresco = null;

document.addEventListener("DOMContentLoaded", () => {
    marcarLocales();
    probarHub();
});

/** Deja claro de entrada qué se puede jugar ya mismo. */
function marcarLocales() {
    document.querySelectorAll('.arcade-card').forEach(card => {
        const id = card.getAttribute('data-game');
        const badge = card.querySelector('.status-badge');
        if (!badge) return;
        const local = JUGABLES_EN_LOCAL.includes(id);
        badge.setAttribute('data-state', local ? 'local' : 'offline');
        badge.innerHTML = `<div class="dot"></div> ${local ? 'local' : 'sin reglas'}`;
        const jugadores = card.querySelector('.players');
        if (jugadores) {
            jugadores.innerHTML = local
                ? 'Listo para jugar — sin servidor'
                : 'Visualizador sin reglas locales todavía';
        }
    });
}

/** Un solo sondeo. Si hay hub, pasamos a estado en vivo. */
async function probarHub() {
    if (!HUB) return;
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        const res = await fetch(`${HUB}/buildings/arcade/games`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(String(res.status));
        aplicar(await res.json());
        console.log('[Arcade] hub encontrado — estado en vivo activado.');
        refresco = setInterval(refrescar, 5000);
    } catch {
        console.log('[Arcade] sin hub — se juega en local. No se vuelve a sondear.');
    }
}

async function refrescar() {
    try {
        const res = await fetch(`${HUB}/buildings/arcade/games`);
        if (!res.ok) throw new Error(String(res.status));
        aplicar(await res.json());
    } catch {
        // Si el hub se cae a mitad, se vuelve a local en vez de acumular errores.
        clearInterval(refresco); refresco = null;
        marcarLocales();
        console.warn('[Arcade] el hub dejó de responder — de vuelta a local.');
    }
}

function aplicar(data) {
    const juegos = Array.isArray(data)
        ? Object.fromEntries(data.map(g => [g.game_id, { status: 'online', players: g.players || [] }]))
        : (data.games || {});
    updateCards(juegos);
}

function updateCards(games) {
    for (const [gameId, state] of Object.entries(games)) {
        const card = document.querySelector(`.arcade-card[data-game="${gameId}"]`);
        if (!card) continue;

        const badge = card.querySelector('.status-badge');
        if (badge && badge.getAttribute('data-state') !== state.status) {
            badge.setAttribute('data-state', state.status);
            badge.innerHTML = `<div class="dot"></div> ${state.status}`;
        }

        const playersDiv = card.querySelector('.players');
        if (!playersDiv) continue;
        playersDiv.innerHTML = (state.players && state.players.length)
            ? `VS: ${state.players.join(' & ')}`
            : 'Awaiting Contenders...';
    }
}
