/**
 * LA ESCALERA DE ¡BUSCA!, MEDIDA EN VEZ DE AFIRMADA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node calibrar_busca.mjs            mide las escalas declaradas
 *     node calibrar_busca.mjs 60         con 60 semillas por escala
 *
 * `ESTADO_SAGAS.md` dice que la dificultad de ¡Busca! **no sube de forma
 * monótona** —edificio 1,71 · distrito 0,60 · planeta 0,64 sitios por registro—
 * o sea que la saga tiene su pico en el medio. Esos números salen de contar
 * escondites y presupuesto, que es una medida de la caja, no del juego.
 *
 * Aquí se mide lo que de verdad define una escalera: **cuántas veces gana un
 * jugador competente**. Si la etapa 5 se gana más que la 4, la etapa 5 es más
 * fácil, digan lo que digan los escondites.
 *
 * ⚠️ Y HACE FALTA UN JUGADOR COMPETENTE, NO UNO CUALQUIERA.
 *
 * Lección de esta misma semana, dos veces: tres políticas igual de malas empatan
 * en cualquier juego, y con eso se puede «demostrar» que un entorno no distingue
 * a nadie. Aquí el piloto apunta al objetivo más cercano sin escanear, empuja, y
 * escanea cuando lo tiene a tiro. No es óptimo —no planifica la ruta— pero juega.
 */
import { RaccoonSpaceCore } from './public/js/alisa-engine/src/world/systems/RaccoonSpaceCore.js';

const SEMILLAS = Number(process.argv[2]) || 40;

/**
 * Las tres escalas de la misma mecánica. Los tres marcadores de las páginas
 * tienen la misma forma —`fuel + (total - escaneados) × bonus`— y las tres
 * etapas son moverse, escanear y encontrar. Cambia el tamaño del sitio, cuántos
 * objetivos hay y cuánto combustible llevas.
 */
/**
 * ⚠️ ESTOS NÚMEROS SALEN DE UN BARRIDO, NO DE LA INTUICIÓN.
 *
 * Se midió tanque × combustible con el piloto de abajo. La relación es limpia:
 * más combustible = más fácil, y con pocos objetivos el tamaño del sitio manda.
 *
 *     ciudad   tanque 180 · 12 objetivos · combustible 30   →  ~91% de victorias
 *     planeta  tanque 320 ·  8 objetivos · combustible 22   →  ~70%
 *     espacio  tanque 400 ·  6 objetivos · combustible 24   →  ~52%
 *
 * ⚠️ Y LA CIUDAD SATURA: con doce objetivos gana el 91-95% haga lo que haga el
 * tanque. No es un fallo — es el escalón fácil, y para la etapa 4 está bien que
 * lo sea. Lo que no vale es fingir que se puede afinar.
 *
 * ⚠️ EL ESPACIO SÍ SE RETOCA, Y HAY QUE DECIR POR QUÉ. Su configuración estaba
 * en el banco con combustible 32, pero al meter la PISTA en el núcleo —que la
 * persona tenía y el agente no— la etapa pasó de ganarse el 43% a ganarse el
 * 71%. No es la misma dificultad con otro número: es que antes se medía otro
 * juego. Con 24 vuelve al 52%, que deja los tres escalones separados de verdad.
 *
 * Antes de esto, 70% y 67% se daban por dos escalones distintos y con 60
 * semillas eso está DENTRO DEL RUIDO: no eran dos, era uno contado dos veces.
 */
const ESCALAS = [
    ['¡Busca! 4 ciudad',  { tankSize: 180, planets: 12, asteroids: 8,  fuel: 30, tope: 3000 }],
    ['¡Busca! 5 planeta', { tankSize: 320, planets: 8,  asteroids: 14, fuel: 22, tope: 3600 }],
    ['¡Busca! 6 espacio', { tankSize: 400, planets: 6,  asteroids: 30, fuel: 24, tope: 5400 }],
];

/**
 * ⚠️ Y EL PILOTO USA LAS PISTAS, PORQUE SI NO CALIBRA OTRO JUEGO.
 *
 * Al escanear un objetivo equivocado, el escáner dice cómo de cerca estaba del
 * bueno —caliente, templado, fresco, frío, helado—. Eso no es adorno: es la
 * estrategia entera. Un piloto que va siempre al más cercano y no mira las
 * pistas está jugando a un recorrido a ciegas, y calibrar la escalera con él
 * daría los números de un juego que nadie juega.
 *
 * Este piloto puntúa cada objetivo sin escanear por lo bien que encaja con TODO
 * lo que ha dicho el escáner: si el 3 salió «caliente», los candidatos lejos del
 * 3 son malos. No es óptimo —no hace la intersección exacta de las bandas— pero
 * usa la información, que es lo que separa este juego del anterior.
 */
const CENTROS = { caliente: 0.30, templado: 0.50, fresco: 0.65, frío: 0.79, helado: 0.94 };

function candidatoMasCoherente(core, sinEscanear) {
    const pistas = core.pistas();
    if (!pistas.length) return null;
    let mejor = null, mejorError = Infinity;
    for (const c of sinEscanear) {
        let error = 0;
        for (const { i, banda } of pistas) {
            const p = core.planetas[i];
            const d = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) / core.tanque;
            error += Math.abs(d - (CENTROS[banda] ?? 0.7));
        }
        if (error < mejorError) { mejorError = error; mejor = c; }
    }
    return mejor;
}

/** El piloto: escanea lo que tiene a tiro y, si no, va al candidato más coherente. */
function pilotar(core) {
    let pasos = 0;
    for (let i = 0; i < core.tope; i++) {
        if (core.terminado()) break;
        const n = core.nave;
        const cerca = core.planetaCerca();
        let verbo;
        if (cerca && !cerca.escaneado) {
            verbo = 'escanear';
        } else {
            const sinEscanear = core.planetas.filter(p => !p.escaneado);
            const objetivo = candidatoMasCoherente(core, sinEscanear)
                ?? sinEscanear.sort((a, b) => Math.hypot(a.x - n.x, a.y - n.y, a.z - n.z)
                                            - Math.hypot(b.x - n.x, b.y - n.y, b.z - n.z))[0];
            if (!objetivo) break;
            const dx = objetivo.x - n.x, dy = objetivo.y - n.y, dz = objetivo.z - n.z;
            const rumbo = Math.atan2(-dx, -dz);
            const alto = Math.atan2(dy, Math.hypot(dx, dz));
            const dg = Math.atan2(Math.sin(rumbo - n.guinada), Math.cos(rumbo - n.guinada));
            const dc = alto - n.cabeceo;
            if (Math.abs(dg) > 0.05) verbo = dg > 0 ? 'girar_izq' : 'girar_der';
            else if (Math.abs(dc) > 0.05) verbo = dc > 0 ? 'morro_arriba' : 'morro_abajo';
            else verbo = 'empujar';
        }
        core.step(verbo);
        pasos++;
    }
    return { pasos, gana: core.encontrado, escaneados: core.planetas.filter(p => p.escaneado).length };
}

console.log(`\nLa escalera de ¡Busca!, con ${SEMILLAS} semillas por escala\n`);
console.log('  etapa                gana   escaneos  pasos   ya al alcance al empezar');

const filas = [];
for (const [nombre, opts] of ESCALAS) {
    let ganadas = 0, escaneos = 0, pasos = 0, regalados = 0;
    for (let s = 1; s <= SEMILLAS; s++) {
        const core = new RaccoonSpaceCore({ ...opts, seed: s });
        /**
         * ⚠️ ¿EMPIEZA LA PARTIDA CON UN OBJETIVO YA A TIRO?
         *
         * Es la trampa de sokoban con otra ropa: allí la semilla del banco caía
         * en el nivel tutorial de una jugada. Aquí, si el sitio es pequeño y el
         * escáner largo, el primer `escanear` sale gratis y la etapa se resuelve
         * sin moverse. Se cuenta y se dice.
         */
        if (core.planetaCerca()) regalados++;
        const r = pilotar(core);
        if (r.gana) ganadas++;
        escaneos += r.escaneados;
        pasos += r.pasos;
    }
    const pct = (100 * ganadas / SEMILLAS);
    filas.push({ nombre, pct, escaneos: escaneos / SEMILLAS, pasos: pasos / SEMILLAS, regalados });
    console.log(`  ${nombre.padEnd(20)} ${pct.toFixed(0).padStart(3)}%   `
              + `${(escaneos / SEMILLAS).toFixed(1).padStart(6)}  ${Math.round(pasos / SEMILLAS).toString().padStart(5)}   `
              + `${regalados}/${SEMILLAS}`);
}

/**
 * ⚠️ LO QUE HACE QUE ESTO SEA UNA ESCALERA Y NO TRES ESCALONES SUELTOS.
 * Cada etapa tiene que ganarse MENOS que la anterior. Si no, el orden es una
 * opinión: la saga dice «5 es más difícil que 4» y el jugador nota lo contrario.
 */
console.log('');
let monotona = true;
for (let i = 1; i < filas.length; i++) {
    if (filas[i].pct > filas[i - 1].pct) {
        monotona = false;
        console.log(`  ✗ ${filas[i].nombre} se gana MÁS (${filas[i].pct.toFixed(0)}%) que `
                  + `${filas[i - 1].nombre} (${filas[i - 1].pct.toFixed(0)}%): la escalera baja`);
    }
}
const conRegalo = filas.filter(f => f.regalados > 0);
for (const f of conRegalo) {
    console.log(`  ⚠️ ${f.nombre}: ${f.regalados}/${SEMILLAS} partidas empiezan con un objetivo `
              + 'ya al alcance del escáner — el primer escaneo sale gratis');
}
if (monotona && !conRegalo.length) console.log('  ✓ la escalera sube: cada etapa se gana menos que la anterior');
console.log('');
