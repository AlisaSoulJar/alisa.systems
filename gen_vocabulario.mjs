/**
 * gen_vocabulario.mjs — EL VOCABULARIO DE LA OBSERVACIÓN, MEDIDO JUGANDO
 * ═══════════════════════════════════════════════════════════════════════════
 *     node gen_vocabulario.mjs            los cuarenta
 *     node gen_vocabulario.mjs brisca     uno
 *
 * ⚠️ POR QUÉ ESTO EXISTE Y NO SE ADIVINA AL VUELO.
 *
 * `substrateObservation` convierte un sustrato en números, y para eso necesita
 * listas cerradas: qué montones existen, qué hechos, qué valores puede tomar un
 * triunfo, qué cartas tiene la baraja. Sacarlas de la partida que se está mirando
 * es el error que su propia cabecera cuenta con dos casos: en Cabinet todos los
 * cajones empiezan `cerrado`, así que el vocabulario era `['cerrado']` y al abrir
 * uno y salir `mapache` el tipo no estaba en la lista y caía a CERO — el mismo
 * número que `cerrado`. El juego entero es qué había dentro, y el vector decía
 * siempre lo mismo.
 *
 * En cartas es peor todavía: el montón de descarte no existe en el reparto y sale
 * a la tercera jugada; el triunfo puede ser cualquiera de cuatro palos y en una
 * partida sólo se ve uno.
 *
 * Así que se mide UNA VEZ, jugando de verdad muchas semillas, y se guarda en un
 * fichero que se puede abrir y leer. Un número medido y guardado, no elegido —
 * igual que `topes.json`.
 *
 * ⚠️ Y QUE ESTÉ COMPLETO NO SE SUPONE: LO COMPROBAMOS.
 *
 * `prueba_observacion.mjs` juega semillas que NO están aquí y exige que no
 * aparezca ni un identificador desconocido. Si aparece, este fichero se ha quedado
 * corto y hay que volver a generarlo — que es una avería con aviso, en vez de un
 * cero silencioso dentro de un vector.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, SILLAS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

/** Semillas de MEDIDA. Las de comprobación son otras, a propósito. */
const SEMILLAS = [1, 2, 3, 5, 8, 13, 21, 34];
const PASOS = 220;

const pedidos = process.argv.slice(2);
const lista = pedidos.length ? JUEGOS.filter(j => pedidos.includes(j)) : JUEGOS;

/**
 * Recorre una partida entera desde todas las sillas y apunta todo lo que ve.
 * Se juega con la sugerencia del propio juego cuando la hay: una política que
 * elige la primera legal se queda en una esquina del juego y no destapa nada.
 */
export function recogerDe(reglas, sillas, semillas = SEMILLAS, pasos = PASOS) {
    const zonas = new Set(), hechos = new Set(), cartas = new Set();
    const valores = {};                       // id de hecho → valores de texto vistos
    /**
     * Y la FORMA: cuánto mide la rejilla, cuántas piezas llega a haber y qué tipos
     * declara. Los tres deciden el largo del vector, así que se miden con las
     * mismas partidas en vez de suponerse — un tablero de go con 32 huecos para
     * piedras se queda sin once de cada doce.
     */
    let ancho = 0, alto = 0, maxPiezas = 0;
    const tipos = new Set();

    for (const s of semillas) {
        let p;
        try { p = reglas.nuevaPartida({ semilla: s, seed: s }); } catch { continue; }
        for (let k = 0; k < pasos; k++) {
            for (let a = 0; a < sillas; a++) {
                let sus;
                try { sus = reglas.sustrato(p, a); } catch { continue; }
                if (!sus) continue;
                if (sus.rejilla) {
                    ancho = Math.max(ancho, sus.rejilla.ancho | 0);
                    alto = Math.max(alto, sus.rejilla.alto | 0);
                }
                maxPiezas = Math.max(maxPiezas, (sus.piezas ?? []).length);
                for (const t of Object.keys(sus.leyenda ?? {})) tipos.add(t);
                for (const p of (sus.piezas ?? [])) tipos.add(String(p.t));
                for (const z of (sus.zonas ?? [])) {
                    zonas.add(String(z.id));
                    for (const c of (z.items ?? [])) if (typeof c === 'string') cartas.add(c);
                    for (const c of (z.casillas ?? [])) if (typeof c === 'string') cartas.add(c);
                }
                for (const h of (sus.hechos ?? [])) {
                    hechos.add(String(h.id));
                    if (typeof h.valor !== 'number') {
                        (valores[h.id] ??= new Set()).add(String(h.valor));
                    }
                }
            }
            let st;
            try { st = reglas.estado(p, 0); } catch { break; }
            const m = (st.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset');
            if (!m.length) break;
            let ok = false;
            try { ok = reglas.mover(p, reglas.sugerencia?.(p) ?? m[0]); } catch { break; }
            if (!ok) break;
        }
    }
    return {
        /**
         * ⚠️ CON EL TABLERO DENTRO, LAS PIEZAS SUELTAS SOBRAN — Y SE DICE POR QUÉ.
         *
         * Cuando hay rejilla, cada pieza ya sale en su casilla del plano «quién lo
         * ocupa», así que repetirlas en la lista de piezas serían 160 números
         * duplicados. Sin rejilla —los de cartas— no hay piezas que poner, y en
         * ambos casos el hueco se queda pequeño a propósito.
         */
        rejilla: ancho && alto ? { ancho, alto } : null,
        maxPiezas: ancho && alto ? 0 : Math.min(32, maxPiezas),
        tipos: [...tipos].sort(),
        zonas: [...zonas].sort(),
        hechos: [...hechos].sort(),
        valores: Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, [...v].sort()])),
        cartas: [...cartas].sort(),
    };
}

const salida = {};
for (const juego of lista) {
    let reglas;
    try { reglas = await cargarReglas(juego, {}); } catch { continue; }
    if (typeof reglas.sustrato !== 'function') continue;
    const sillas = Number(SILLAS?.[juego]) || Number(reglas.ASIENTOS) || 1;
    const v = recogerDe(reglas, sillas);
    salida[juego] = v;
    const rej = v.rejilla ? `${v.rejilla.ancho}x${v.rejilla.alto}`.padStart(7) : '      ·';
    console.log(`  ${juego.padEnd(12)} rejilla ${rej} · ${String(v.zonas.length).padStart(2)} montones · `
        + `${String(v.hechos.length).padStart(2)} hechos · ${String(v.cartas.length).padStart(3)} cartas · `
        + `${String(v.tipos.length).padStart(2)} tipos`);
}

if (pedidos.length) {
    console.log('\n  (una sola tirada: no se escribe el fichero)');
    process.exit(0);
}

const cuerpo = `/**
 * vocabulario_observacion.js — LO GENERA \`gen_vocabulario.mjs\`. NO SE EDITA A MANO.
 *
 * Las listas cerradas que \`substrateObservation\` necesita para convertir un
 * sustrato de cartas en números: qué montones existen en cada juego, qué hechos,
 * qué valores puede tomar cada hecho de texto y qué cartas tiene su baraja.
 *
 * Medido jugando ${SEMILLAS.length} semillas (${SEMILLAS.join(', ')}) hasta ${PASOS} jugadas,
 * desde TODAS las sillas. \`prueba_observacion.mjs\` comprueba con semillas
 * distintas que no falte nada.
 */
export const VOCABULARIO = ${JSON.stringify(salida, null, 4)};
`;

await writeFile(path.join(AQUI, 'public/data/vocabulario_observacion.js'), cuerpo);
console.log(`\n  ✎ escrito public/data/vocabulario_observacion.js (${Object.keys(salida).length} juegos)`);
