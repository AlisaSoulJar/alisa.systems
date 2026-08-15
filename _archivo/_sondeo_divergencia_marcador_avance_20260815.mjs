import { cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const fetchReal = globalThis.fetch;
globalThis.fetch = async (e, i) => {
    const u = e instanceof URL ? e : new URL(String(e));
    if (u.protocol !== 'file:') return fetchReal(e, i);
    return new Response(await readFile(fileURLToPath(u), 'utf-8'), { status: 200 });
};

for (const juego of ['parchis', 'canadiense', 'oca']) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla: 6, seed: 6 });
    let paso = 0, divergioEn = null;
    for (; paso < 700; paso++) {
        const st = reglas.estado(p);
        if (Array.isArray(st.marcador) && Array.isArray(st.avance)
            && JSON.stringify(st.marcador) !== JSON.stringify(st.avance)) {
            divergioEn = paso;
            break;
        }
        if (st.is_game_over) break;
        const m = reglas.sugerencia?.(p) ?? (st.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(p, m)) break;
    }
    console.log(`${juego}: diverge en paso ${divergioEn} (probados hasta ${paso})`);
}
