/**
 * acreditar.mjs — ¿ESTA PARTIDA DEMUESTRA ALGO, O PODRÍA HABERLA JUGADO EL AZAR?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node acreditar.mjs recibo.json
 *     node acreditar.mjs --juego sokoban --semilla 42 --jugadas arriba,derecha,...
 *
 * ⚠️ POR QUÉ EXISTE, Y ES LA PIEZA QUE FALTABA ENTRE JUGAR Y ACREDITAR.
 *
 * El 25-08 el banco abrió sus puertas a agentes de verdad. Motoko jugó, encontró
 * en su primera hora que 19 juegos no mandaban el mapa —y por tanto que un modelo
 * de lenguaje jugaba a ciegas— y dijo que volvería a intentarlo.
 *
 * Y ahí se ve el hueco: cuando vuelva y saque 400 puntos, ¿qué significa 400?
 * Sin nada contra qué compararlo, es un número. El banco sabía decir «este entorno
 * separa políticas distintas» (`prueba_senal.mjs`, 46 de 49) y no sabía decir
 * «esta PARTIDA está por encima de lo que consigue jugar sin mirar».
 *
 * Eso es justo lo que hace falta si esto va a acreditar a nadie. La ley de la
 * federación dice que la especialización sale de los recibos y no de las
 * declaraciones — pero un recibo que cualquiera puede sacar dando botones al azar
 * es una declaración con más pasos.
 *
 * ⚠️ SE COMPARA CONTRA EL MISMO SUELO QUE USA EL BANCO, Y CON EL MISMO HORIZONTE.
 *
 * Las siete políticas ciegas son las de `prueba_senal.mjs`: ciclo, primera,
 * última, tres de azar con semilla y un bandido que aprende del premio. No se
 * inventa un rival nuevo: si el suelo fuera otro, esta nota no se podría comparar
 * con las que ya están publicadas.
 *
 * Y juegan EL MISMO NÚMERO DE JUGADAS que trae el recibo. Es la trampa fácil de
 * esta medida: dejar que las ciegas corran 300 pasos contra los 40 de una persona
 * hace que ganen por cansancio y no por acierto — o al revés. Mismo mundo, misma
 * semilla, mismo horizonte, o no es una comparación.
 *
 * ⚠️ Y EL VEREDICTO ES CONSERVADOR A PROPÓSITO.
 *
 * Acredita sólo si supera a LA MEJOR de las siete, no a la media. Un título que
 * se saca empatando con el azar no vale nada, y el día que una nota abra una
 * puerta valiosa, alguien intentará sacarla barata. La defensa va antes del
 * incentivo.
 */
import { readFileSync } from 'node:fs';
import { cargarReglas, JUEGOS } from './public/arcade/js/protohub/rules/index.js';
import { puntuacionDe } from './public/arcade/js/protohub/Verificador.js';

/** Las MISMAS siete de `prueba_senal.mjs`. No se inventa un suelo nuevo. */
function politicasCiegas() {
    const lista = [
        { nombre: 'ciclo', elegir: (v, i) => v[i % v.length] },
        { nombre: 'primera', elegir: (v) => v[0] },
        { nombre: 'ultima', elegir: (v) => v[v.length - 1] },
    ];
    for (const s of [1, 7, 42]) {
        let x = s >>> 0;
        const r = () => {
            x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
            return x / 4294967296;
        };
        lista.push({ nombre: `azar${s}`, elegir: (v) => v[Math.floor(r() * v.length) % v.length] });
    }
    const memoria = new Map();
    lista.push({
        nombre: 'bandido',
        elegir: (v) => {
            let mejor = v[0], mejorNota = -Infinity;
            for (const o of v) {
                const m = memoria.get(o);
                const nota = m ? m.suma / m.n : 0.001;
                if (nota > mejorNota) { mejorNota = nota; mejor = o; }
            }
            return mejor;
        },
        aprender: (o, premio) => {
            const m = memoria.get(o) ?? { suma: 0, n: 0 };
            m.suma += premio; m.n++; memoria.set(o, m);
        },
    });
    return lista;
}

/**
 * Re-simula una partida enviada. Mismo mecanismo que `/api/gym`: sin estado, se
 * manda la partida entera y se recalcula desde la semilla. Por eso nadie puede
 * mentir sobre su nota: no se guarda, se vuelve a jugar.
 *
 * ⚠️ `mover` MUTA la partida y devuelve si la jugada era legal. No devuelve la
 * partida nueva — lo supuse y me costó dos intentos. La legalidad la juzga él, no
 * yo: duplicar esa comprobación aquí sería un segundo árbitro que algún día
 * discreparía del primero.
 */
function reproducir(reglas, semilla, jugadas) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    let rechazadas = 0;
    for (const j of jugadas) {
        if (reglas.estado(p).is_game_over) break;
        if (!reglas.mover(p, j)) rechazadas++;
    }
    return { p, rechazadas };
}

function correrCiega(reglas, semilla, pasos, pol) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    for (let i = 0; i < pasos; i++) {
        const st = reglas.estado(p);
        const v = (st.legal_moves ?? []).map(String);
        if (!v.length || st.is_game_over) break;
        const antes = puntuacionDe(st);
        const o = pol.elegir(v, i);
        try { if (!reglas.mover(p, o)) break; } catch { break; }
        pol.aprender?.(o, puntuacionDe(reglas.estado(p)) - antes);
    }
    return puntuacionDe(reglas.estado(p));
}

// ─── Entrada ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let recibo;
if (args[0] && !args[0].startsWith('--')) {
    recibo = JSON.parse(readFileSync(args[0], 'utf8'));
} else {
    const dame = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
    recibo = {
        juego: dame('juego'),
        semilla: Number(dame('semilla') ?? 42),
        jugadas: (dame('jugadas') ?? '').split(',').filter(Boolean),
        quien: dame('quien') ?? 'anónimo',
    };
}

if (!recibo?.juego || !JUEGOS.includes(recibo.juego)) {
    console.log(`\n  uso: node acreditar.mjs recibo.json`);
    console.log(`       node acreditar.mjs --juego sokoban --semilla 42 --jugadas arriba,derecha --quien Motoko`);
    console.log(`\n  juegos: ${JUEGOS.join(', ')}\n`);
    process.exit(2);
}

const reglas = await cargarReglas(recibo.juego, {});
const jugadas = (recibo.jugadas ?? []).map(String);
const { p, rechazadas } = reproducir(reglas, recibo.semilla, jugadas);
const suya = puntuacionDe(reglas.estado(p));

const ciegas = politicasCiegas().map(pol => ({
    nombre: pol.nombre,
    nota: correrCiega(reglas, recibo.semilla, jugadas.length, pol),
}));
const mejor = ciegas.reduce((a, b) => (b.nota > a.nota ? b : a));
const media = ciegas.reduce((s, c) => s + c.nota, 0) / ciegas.length;

console.log(`\n  ${recibo.juego} · semilla ${recibo.semilla} · ${jugadas.length} jugadas · ${recibo.quien ?? 'anónimo'}\n`);
console.log(`  quien juega              nota`);
console.log(`  ${String(recibo.quien ?? 'la partida').padEnd(22)} ${String(suya).padStart(7)}`);
for (const c of ciegas.sort((a, b) => b.nota - a.nota)) {
    console.log(`  ${('· ' + c.nombre).padEnd(22)} ${String(c.nota).padStart(7)}`);
}
console.log(`\n  mejor ciega: ${mejor.nombre} (${mejor.nota}) · media ciega: ${media.toFixed(1)}`);

if (rechazadas) console.log(`  ⚠️ ${rechazadas} jugada(s) ilegales, ignoradas — el recibo no cuadra con las reglas`);

/**
 * ⚠️ EL VEREDICTO. Tres estados y ninguno es «casi».
 *
 * Un entorno donde TODAS las ciegas empatan no puede acreditar a nadie, por muy
 * buena que sea la partida: si el suelo es plano, estar encima no dice nada. Eso
 * es un fallo del entorno, no de quien juega, y se dice así.
 */
const plano = ciegas.every(c => c.nota === ciegas[0].nota);
console.log('');
if (plano) {
    /**
     * ⚠️ «PLANO» NO ES LO MISMO QUE «EL ENTORNO ESTÁ ROTO», Y LA PRIMERA VERSIÓN
     * DE ESTA FRASE LO CONFUNDÍA.
     *
     * Con un recibo de 4 jugadas las siete ciegas empatan en cualquier juego —no
     * les da tiempo a separarse— y yo acusaba al entorno. Pero `prueba_senal.mjs`
     * demuestra que sokoban SÍ discrimina con horizonte largo: el suelo plano era
     * mío, por medir con un palmo de partida.
     *
     * Así que se dice lo que se sabe: plano CON ESTE HORIZONTE. Quién tiene la
     * culpa —el entorno o el recibo— lo dice el número de jugadas.
     */
    console.log(`  ⚠️ NO ACREDITA — con ${jugadas.length} jugadas, las siete políticas ciegas empatan.`);
    console.log(`     El suelo es plano a este horizonte, así que estar encima no demostraría nada.`);
    console.log(jugadas.length < 20
        ? `     Es un recibo corto: prueba con una partida más larga antes de culpar al juego.`
        : `     Con esta longitud ya debería separarse: mira el entorno con prueba_senal.mjs.`);
    process.exit(1);
}
if (suya > mejor.nota) {
    console.log(`  ✓ ACREDITA — supera a la mejor política ciega por ${(suya - mejor.nota).toFixed(1)}.`);
    console.log(`    Con el mismo mundo, la misma semilla y el mismo horizonte.`);
    process.exit(0);
}
console.log(`  ✗ NO ACREDITA — no supera a «${mejor.nombre}» (${mejor.nota}) jugando a ciegas.`);
console.log(`    No significa que jugara mal: significa que esta partida no demuestra que mirara.`);
process.exit(1);
