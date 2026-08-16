/**
 * rebano.js — el primer juego que corre SOBRE UNA PIEZA DEL MOTOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Eres el perro. Hay doce ovejas y un redil. No puedes ordenarle nada a ninguna
 * oveja: sólo colocarte, y dejar que huyan de ti. Ganar es acorralarlas usando
 * el miedo como herramienta.
 *
 * ⚠️ ESTE JUEGO EXISTE PARA COMPROBAR UNA HIPÓTESIS, NO PARA AÑADIR UN GÉNERO.
 *
 * Medido: el motor tiene 179 piezas y **los 27 juegos usaban una**. La sospecha
 * era que no faltaba talento sino repetibilidad — que las piezas estaban escritas
 * para demos y por eso no servían para medir. Si eso es cierto, sembrar un
 * sistema debería bastar para que salga un entorno que puntúe.
 *
 * Esto es la prueba. Toda la física de aquí es `BoidsSystem`, tal cual estaba en
 * el motor, con dos arreglos de cuatro líneas: aceptar semilla y no importar el
 * renderizador. Las reglas del juego no simulan nada — colocan un perro y llaman
 * a `tick`.
 *
 * ⚠️ Y LA ESTRUCTURA DE DECISIÓN ES NUEVA DE VERDAD
 * En los veintisiete anteriores mueves lo que decides mover. Aquí **influyes en
 * un sistema emergente que no obedece**: acercarte demasiado dispersa el rebaño,
 * quedarte lejos no lo empuja, y la forma correcta de llevar doce ovejas a un
 * sitio es ponerte donde ellas quieran huir hacia allí. Es la primera vez que el
 * banco de pruebas puede preguntar «¿sabes conducir algo que no te obedece?».
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { BoidsSystem } from '../../../../js/alisa-engine/src/world/systems/BoidsSystem.js';
import { DIRS, suma } from '../rejilla.js';

const ANCHO = 19, ALTO = 13;
const OVEJAS = 12;
const REDIL = { x0: 14, y0: 8, x1: 17, y1: 11 };
const SUBPASOS = 6, DT = 0.055;
/**
 * ⚠️ ES UN RADIO, AUNQUE EL MOTOR LO LLAME `power`.
 *
 * `BoidsSystem` pasa `p.power` a `SteeringSystem.flee(agent, pos, fleeRadius…)`:
 * el tercer argumento es la distancia a la que se nota el susto, no su fuerza.
 * Le puse 2,4 creyendo que era potencia y coloqué al perro a 3 casillas del
 * rebaño — **fuera de su propio radio**. Resultado medido: 0 de 12 ovejas en las
 * tres semillas, con el perro paseando sin asustar a nadie.
 *
 * Un parámetro mal nombrado no da error: da un juego que no funciona y parece
 * mal diseñado. Es la misma familia que `turno` contra `turn` y que `board`
 * contra `tablero` — el motor decía la verdad, yo leí lo que quise entender.
 */
const RADIO_PERRO = 4.5;
const TOPE = 140;


const dentro = (x, y) => x >= 1 && y >= 1 && x < ANCHO - 1 && y < ALTO - 1;
const enRedil = (q) => q.x >= REDIL.x0 && q.x <= REDIL.x1 && q.y >= REDIL.y0 && q.y <= REDIL.y1;
const centroRedil = { x: (REDIL.x0 + REDIL.x1) / 2, y: (REDIL.y0 + REDIL.y1) / 2 };
const rejilla = (o) => ({ x: Math.round(o.position.x), y: Math.round(o.position.z) });

export const rebano = {
    OBJETIVO: 'Objetivo: meter las doce ovejas en el redil. No se les puede ordenar nada: sólo colocarte, porque huyen de ti. El miedo es la herramienta.',
    // CUÁNTAS SILLAS TIENE LA MESA: una. Las ovejas son el sistema que se
    // conduce, no un rival que decide.
    ASIENTOS: 1,
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        /**
         * ⚠️ EL MOTOR PONE LAS OVEJAS, Y SE LE PASA LA SEMILLA.
         * Antes de sembrarlo, esta línea daba un rebaño distinto en cada partida
         * con la misma semilla — y con eso el recibo no se puede verificar. El
         * arreglo del sistema es lo único que hace posible este fichero.
         */
        const bandada = new BoidsSystem({
            rng: azar,
            separationRadius: 1.3, alignmentRadius: 3.2, cohesionRadius: 3.6,
            maxSpeed: 2.1, maxForce: 0.12,
        });
        /**
         * ⚠️ EL `bounds` DE `initAgents` ES LA JAULA, NO SÓLO LA CUNA.
         *
         * El sistema guarda ese rectángulo y en cada `tick` recorta las
         * posiciones contra él. Yo le pasé la zona donde quería que NACIERAN —la
         * mitad izquierda— y con eso las ovejas quedaban encerradas en `x` entre
         * 2 y 9… con el redil en la 14. **El juego era imposible de ganar**, y no
         * lo parecía: el perro corría, el rebaño huía, y el marcador se quedaba
         * en cero para siempre.
         *
         * Segunda vez en el mismo fichero que leo un parámetro como quiero en vez
         * de como es —antes `power`, que era un radio—. La pieza decía la verdad
         * las dos veces. Por eso se pasa el tablero entero como límite y la cuna
         * se coloca aparte, a mano y con la misma semilla.
         */
        bandada.initAgents(OVEJAS, {
            minX: 1, maxX: ANCHO - 2, minY: 0, maxY: 0, minZ: 1, maxZ: ALTO - 2,
        });
        for (const o of bandada.flock) {
            o.position.x = 2 + azar() * 7;               // la mitad de la izquierda
            o.position.z = 2 + azar() * (ALTO - 5);
            o.position.y = 0;
        }

        return { semilla, bandada, ovejas: bandada.flock,
                 perro: { x: 3, y: 1 }, pasos: 0, tope: TOPE };
    },

    /**
     * El sustrato: el redil marcado como destino y cada oveja en su casilla.
     *
     * Las ovejas viven en coordenadas continuas y aquí se redondean a la
     * rejilla. No se pierde nada que importe: quien juega decide por casillas, y
     * la precisión de más sería información que no puede usar.
     */
    sustrato(p) {
        const celdas = new Array(ANCHO * ALTO).fill(0);
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x++) {
                if (x === 0 || y === 0 || x === ANCHO - 1 || y === ALTO - 1) celdas[y * ANCHO + x] = 1;
            }
        }
        for (let y = REDIL.y0; y <= REDIL.y1; y++) {
            for (let x = REDIL.x0; x <= REDIL.x1; x++) celdas[y * ANCHO + x] = 2;
        }
        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas },
            piezas: [
                ...p.ovejas.map(o => {
                    const q = rejilla(o);
                    return { x: Math.max(0, Math.min(ANCHO - 1, q.x)),
                             y: Math.max(0, Math.min(ALTO - 1, q.y)),
                             t: enRedil(q) ? 'oveja_ok' : 'oveja', de: 2 };
                }),
                { x: p.perro.x, y: p.perro.y, t: 'perro', de: 0 },
            ],
            zonas: [],
            leyenda: { oveja: 'oveja suelta', oveja_ok: 'oveja en el redil', perro: 'tú' },
            simbolos: { oveja: 'v', oveja_ok: 'V', perro: '@' },
        };
    },

    describir(p) {
        const st = this.estado(p);
        return `Rebaño. Eres el perro (@). Las ovejas (v) HUYEN de ti; no obedecen. `
             + `Llévalas al redil (o) colocándote al otro lado.\n`
             + `${st.en_redil}/${OVEJAS} dentro, ${st.pasos} pasos.\n`
             + describirSustrato(this.sustrato(p))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nPuedes: ${st.legal_moves.filter(m => m !== 'nueva').join(', ')}.`);
    },

    estado(p) {
        const dentroRedil = p.ovejas.filter(o => enRedil(rejilla(o))).length;
        const terminada = dentroRedil === OVEJAS || p.pasos >= p.tope;
        const legales = terminada ? ['nueva']
            : Object.keys(DIRS).filter(d => {
                const q = suma(p.perro, DIRS[d]);
                return dentro(q.x, q.y);
            });

        // Lo lejos que está el rebaño de estar recogido: da pendiente desde el
        // primer paso, así que arrimar ovejas puntúa aunque no entre ninguna.
        const lejania = p.ovejas.reduce((s, o) => {
            const q = rejilla(o);
            return s + (enRedil(q) ? 0 : Math.hypot(q.x - centroRedil.x, q.y - centroRedil.y));
        }, 0);

        return {
            juego: 'rebano',
            en_redil: dentroRedil, ovejas: OVEJAS,
            pasos: p.pasos,
            dispersion: Math.round(lejania),
            puntos: dentroRedil * 100 + (dentroRedil === OVEJAS ? 200 : 0)
                    - p.pasos - Math.round(lejania),
            turn: 'player',
            semilla: p.semilla,
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const dir = String(jugada);
        const st = this.estado(p);
        if (st.is_game_over || !DIRS[dir] || !st.legal_moves.includes(dir)) return false;

        p.perro = suma(p.perro, DIRS[dir]);
        p.pasos++;

        /**
         * ⚠️ EL MUNDO CORRE VARIOS SUBPASOS POR JUGADA, Y CON `dt` FIJO.
         *
         * Fijo porque un `dt` de reloj real haría la partida irrepetible —el
         * mismo recibo daría resultados distintos en una máquina lenta— y todo el
         * proyecto descansa en poder volver a jugarla. Varios porque con uno solo
         * el rebaño apenas reacciona entre turno y turno y el perro parecería no
         * tener efecto: la decisión hay que poder verla.
         */
        const perro = { position: { x: p.perro.x, y: 0, z: p.perro.y }, power: RADIO_PERRO };
        for (let i = 0; i < SUBPASOS; i++) {
            p.ovejas = p.bandada.tick(p.ovejas, perro, null, DT);
            for (const o of p.ovejas) {
                o.position.x = Math.max(1, Math.min(ANCHO - 2, o.position.x));
                o.position.z = Math.max(1, Math.min(ALTO - 2, o.position.z));
                o.position.y = 0;
            }
        }
        p.bandada.flock = p.ovejas;
        return true;
    },

    /**
     * El pastor de la casa: colocarse detrás del rebaño, en la línea que va al
     * redil — pero repartiendo rezagadas y respetando el radio de miedo, que es
     * justo lo que la primera versión no hacía.
     *
     * ⚠️ MEDIDO: EL AZAR GANABA AL TECHO. `tabla.mjs` (todo el catálogo, no sólo
     * este juego) sacaba `azar 1.66` sobre una escala donde `1,00` es la casa —
     * dar tumbos rendía más que la heurística. La pista estaba en el propio
     * fichero: el offset de la meta era `2.4`, que es el valor QUE TENÍA
     * `RADIO_PERRO` antes de arreglarlo (ver el comentario de arriba, «es un
     * radio aunque el motor lo llame power»). Se corrigió el radio a 4.5 pero no
     * el offset, así que la meta seguía pensada para un perro que asusta a 2,4 —
     * bastante MÁS DENTRO del radio real de 4,5. El perro llegaba pegado al
     * rebaño en vez de a su borde, y pegado es justo la distancia que dispersa:
     * el rebaño no huye en bloque hacia el redil, huye en todas direcciones
     * porque el miedo ya no tiene un lado claro de dónde venir.
     *
     * Segundo fallo, más fácil de ver jugando que leyendo: promediar TODAS las
     * sueltas esconde a la rezagada. Si once ovejas están juntas y una se quedó
     * atrás, el centro de masas apenas se mueve hacia la rezagada — se queda
     * cerca del grupo grande, y la rezagada no vuelve a sentir al perro cerca en
     * toda la partida. Once entran, una se queda fuera para siempre y el tope de
     * pasos llega antes de que alguien note el porqué.
     */
    sugerencia(p) {
        const st = this.estado(p);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p);

        const sueltas = sus.piezas.filter(z => z.t === 'oveja');
        if (!sueltas.length) return legales[0];
        const distRedil = (o) => Math.hypot(o.x - centroRedil.x, o.y - centroRedil.y);
        const centro = {
            x: sueltas.reduce((s, o) => s + o.x, 0) / sueltas.length,
            y: sueltas.reduce((s, o) => s + o.y, 0) / sueltas.length,
        };

        // La rezagada: la suelta más lejos del redil. Si está bastante más lejos
        // que la media del resto, se va a por ella sola en vez de al centro del
        // grupo — si no, un rebaño compacto con una descolgada nunca la recoge.
        let rezagada = sueltas[0], peorD = distRedil(sueltas[0]);
        for (const o of sueltas) {
            const d = distRedil(o);
            if (d > peorD) { peorD = d; rezagada = o; }
        }
        const mediaResto = sueltas.reduce((s, o) => s + distRedil(o), 0) / sueltas.length;
        const objetivo = (sueltas.length > 1 && peorD > mediaResto + 3) ? rezagada : centro;

        // El punto de empuje: detrás del objetivo visto desde el redil, a la
        // distancia a la que el miedo empuja sin dispersar — cerca del borde del
        // radio real, no de su mitad.
        const dx = objetivo.x - centroRedil.x, dy = objetivo.y - centroRedil.y;
        const n = Math.hypot(dx, dy) || 1;
        const distanciaIdeal = RADIO_PERRO * 0.82;
        const meta = { x: objetivo.x + (dx / n) * distanciaIdeal,
                        y: objetivo.y + (dy / n) * distanciaIdeal };

        let mejor = legales[0], mejorD = Infinity;
        for (const m of legales) {
            const q = suma(p.perro, DIRS[m]);
            const d = Math.hypot(q.x - meta.x, q.y - meta.y);
            if (d < mejorD) { mejorD = d; mejor = m; }
        }
        return mejor;
    },

    deshacer() { return false; },
};

