/**
 * pradera.js — un mundo que se puede matar
 * ═══════════════════════════════════════════════════════════════════════════
 * Eres el depredador. Los ratones comen queso y se reproducen; tú comes ratones
 * o te mueres de hambre. Cazar resuelve hoy y arruina el mes que viene: si te
 * comes el último ratón, no vuelve ninguno y te quedas solo en un prado vacío.
 *
 * ⚠️ LA ESTRUCTURA QUE NI EL CENSO SUPO NOMBRAR
 * Los veintiocho juegos anteriores tienen consecuencias: pierdes la partida.
 * Ninguno tiene **consecuencias sobre el mundo**. En sokoban una caja mal
 * empujada bloquea el nivel, sí — pero el nivel vuelve entero en la siguiente
 * partida y el error se paga en el acto. Aquí el castigo llega **cuarenta turnos
 * después**, cuando el ratón que te comiste era el que iba a criar.
 *
 * No es «horizonte largo» sin más: es que la jugada que más puntúa AHORA es la
 * que te mata LUEGO. La tabla puede preguntar por fin lo que ninguna de nuestras
 * pruebas preguntaba: **¿sabes no comerte lo que te conviene?**
 *
 * ⚠️ Y LOS RATONES LOS MUEVE EL MOTOR
 * Toda la conducta de las presas —merodear, buscar queso, huir, esconderse,
 * cansarse— es `FoodChainSystem`, la pieza que ya estaba escrita. Segundo juego
 * seguido que sale de sembrar un sistema en vez de programar un mundo.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { FoodChainSystem } from '../../../../js/alisa-engine/src/world/systems/FoodChainSystem.js';

const ANCHO = 20, ALTO = 14;
const RATONES = 6, TECHO_RATONES = 14;
const QUESOS = 8, TECHO_QUESO = 12;
const HAMBRE_MAX = 100, HAMBRE_POR_TURNO = 3, HAMBRE_POR_RATON = 42;
const RADIO_CAZA = 1.5;
const TOPE = 220;
const DT = 0.12, SUBPASOS = 3;

const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const dentro = (x, y) => x >= 1 && y >= 1 && x < ANCHO - 1 && y < ALTO - 1;
const rej = (o) => ({ x: Math.round(o.position.x), y: Math.round(o.position.z) });
const dist = (a, b) => Math.hypot(a.position.x - b.x, a.position.z - b.y);

export const pradera = {
    OBJETIVO: 'Objetivo: sobrevivir cazando ratones sin quedarte sin ellos. Se reproducen si los dejas criar, y comerte el último te deja solo en un prado vacío y muerto de hambre cuarenta turnos después.',
    // CUÁNTAS SILLAS TIENE LA MESA: una. Los ratones son el mundo, no un rival.
    ASIENTOS: 1,
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);
        /**
         * ⚠️ HAY QUE REESCALAR AL SISTEMA, NO SÓLO SEMBRARLO.
         *
         * Los valores por defecto de `FoodChainSystem` están pensados para un
         * laboratorio 3D en tiempo real: el ratón huye a 7 unidades por segundo y
         * se asusta desde 7 de distancia. Aquí un turno son 0,36 segundos y el
         * depredador anda una casilla, así que los ratones salían **dos veces y
         * media más rápidos que el jugador**. Medido: las tres políticas morían de
         * hambre en el turno 34 sin haber cazado ni una vez.
         *
         * No estaba roto el sistema: estaba afinado para otro reloj. Sembrar una
         * pieza la hace repetible; usarla bien exige además traducir sus unidades
         * — y eso no lo arregla ningún parámetro `rng`.
         */
        const cadena = new FoodChainSystem({
            rng: azar, arenaSize: Math.max(ANCHO, ALTO),
            preyBaseSpeed: 0.9, preyForageSpeed: 1.5, preyFleeSpeed: 2.2,
            preyFleeRange: 4.0, preyCheeseCatchRadius: 0.9,
        });

        const sitio = () => ({ x: 2 + azar() * (ANCHO - 5), z: 2 + azar() * (ALTO - 5) });
        const ratones = Array.from({ length: RATONES }, (_, i) => cadena.createPreyState(`r${i}`, sitio()));
        const quesos = Array.from({ length: QUESOS }, (_, i) => ({ id: `q${i}`, position: sitio() }));

        return {
            semilla, cadena, azar,
            ratones, quesos, cria: 0,
            zorro: { x: 3, y: 3 },
            hambre: HAMBRE_MAX, comidos: 0, turnos: 0, tope: TOPE,
            muerto: false, vacia: false,
        };
    },

    sustrato(p) {
        const celdas = new Array(ANCHO * ALTO).fill(0);
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x++) {
                if (x === 0 || y === 0 || x === ANCHO - 1 || y === ALTO - 1) celdas[y * ANCHO + x] = 1;
            }
        }
        const enRango = (q) => Math.max(0, Math.min(ANCHO - 1, q.x));
        const enAlto = (q) => Math.max(0, Math.min(ALTO - 1, q.y));
        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas },
            piezas: [
                ...p.quesos.map(q => { const c = rej(q); return { x: enRango(c), y: enAlto(c), t: 'queso', de: 2 }; }),
                ...p.ratones.filter(r => r.alive).map(r => {
                    const c = rej(r);
                    return { x: enRango(c), y: enAlto(c), t: r.phase === 'flee' ? 'raton_huye' : 'raton', de: 1 };
                }),
                { x: p.zorro.x, y: p.zorro.y, t: 'zorro', de: 0 },
            ],
            zonas: [],
            leyenda: { zorro: 'tú', raton: 'ratón', raton_huye: 'ratón huyendo', queso: 'queso' },
            simbolos: { zorro: '@', raton: 'r', raton_huye: 'R', queso: 'q' },
        };
    },

    describir(p) {
        const st = this.estado(p);
        return `Pradera. Eres el depredador (@). Comes ratones (r) o te mueres de hambre.\n`
             + `Los ratones comen queso (q) y CRÍAN. Si te los comes todos, no vuelve ninguno.\n`
             + `Hambre ${st.hambre}/${HAMBRE_MAX} · ${st.ratones} ratones · ${st.quesos} quesos `
             + `· turno ${st.turnos}/${TOPE} · has comido ${st.comidos}\n`
             + describirSustrato(this.sustrato(p))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nPuedes: ${st.legal_moves.filter(m => m !== 'nueva').join(', ')}.`);
    },

    estado(p) {
        const vivos = p.ratones.filter(r => r.alive).length;
        const terminada = p.muerto || p.turnos >= p.tope;
        const legales = terminada ? ['nueva']
            : Object.keys(DIRS).filter(d => {
                const q = { x: p.zorro.x + DIRS[d][0], y: p.zorro.y + DIRS[d][1] };
                return dentro(q.x, q.y);
            });

        return {
            juego: 'pradera',
            hambre: Math.max(0, Math.round(p.hambre)),
            ratones: vivos, quesos: p.quesos.length,
            comidos: p.comidos, turnos: p.turnos,
            pradera_vacia: p.vacia,
            /**
             * ⚠️ SE PUNTÚA SOBREVIVIR, NO CAZAR — Y AHÍ ESTÁ TODO EL JUEGO.
             *
             * Si el marcador premiara las presas, la mejor política sería comerse
             * la pradera entera y el juego mediría voracidad. Premiando los turnos
             * vividos, cazar es un MEDIO: necesario, y ruinoso en exceso.
             *
             * El pequeño premio por presa existe sólo para dar pendiente al
             * principio —sin él, morir en el turno 40 y en el 41 valdría casi lo
             * mismo— pero es diez veces menor que el turno, para que nunca
             * compense cambiar futuro por comida.
             */
            puntos: p.turnos * 3 + p.comidos * 3 - (p.muerto ? 120 : 0),
            desenlace: !terminada ? null
                : p.muerto ? (p.vacia ? 'Te comiste la pradera y moriste de hambre en ella'
                                      : 'Moriste de hambre')
                           : 'La pradera te sobrevivió, y tú a ella',
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

        p.zorro = { x: p.zorro.x + DIRS[dir][0], y: p.zorro.y + DIRS[dir][1] };
        p.turnos++;
        p.hambre -= HAMBRE_POR_TURNO;

        // Los ratones los mueve el motor: huyen de ti, buscan queso, se cansan.
        const entorno = {
            predators: [{ id: 'zorro', alive: true,
                          position: { x: p.zorro.x, z: p.zorro.y } }],
            cheese: p.quesos, crates: [],
            resourceDepletion: 1 - p.quesos.length / TECHO_QUESO,
        };
        for (let i = 0; i < SUBPASOS; i++) {
            for (const r of p.ratones) if (r.alive) p.cadena.tickPrey(r, entorno, DT);
        }
        // El queso que se comieron desaparece: el motor lo anuncia por eventos.
        for (const r of p.ratones) {
            if (r.events?.includes('cheese_eaten')) {
                let mejor = null, mejorD = Infinity;
                for (const q of p.quesos) {
                    const d = Math.hypot(q.position.x - r.position.x, q.position.z - r.position.z);
                    if (d < mejorD) { mejorD = d; mejor = q; }
                }
                if (mejor && mejorD < 1.2) { p.quesos = p.quesos.filter(q => q !== mejor); p.cria++; }
            }
        }

        // Cazar: si lo tienes al lado, cae.
        for (const r of p.ratones) {
            if (r.alive && dist(r, p.zorro) <= RADIO_CAZA) {
                r.alive = false;
                p.comidos++;
                p.hambre = Math.min(HAMBRE_MAX, p.hambre + HAMBRE_POR_RATON);
                break;                          // uno por turno: no hay matanzas
            }
        }

        /**
         * ⚠️ LA CRÍA NECESITA DOS, Y ESO ES LA TRAMPA ENTERA.
         *
         * Con un solo ratón vivo no nace ninguno más: la población es un recurso
         * que se puede gastar hasta un punto de no retorno, no un contador que
         * sube solo. Quien se come el penúltimo ya ha perdido, aunque tarde
         * cuarenta turnos en enterarse — y ese retraso entre el error y el
         * castigo es lo que este juego mide y ningún otro nuestro medía.
         */
        const vivos = p.ratones.filter(r => r.alive);
        if (vivos.length >= 2 && p.cria >= 3 && vivos.length < TECHO_RATONES) {
            p.cria -= 3;
            const madre = vivos[Math.floor(p.azar() * vivos.length)];
            p.ratones.push(p.cadena.createPreyState(`r${p.ratones.length}`, {
                x: madre.position.x + (p.azar() - 0.5), z: madre.position.z + (p.azar() - 0.5),
            }));
        }
        if (!vivos.length) p.vacia = true;

        // El queso vuelve a crecer, despacio y con tope. Es lo único gratis.
        if (p.turnos % 9 === 0 && p.quesos.length < TECHO_QUESO) {
            p.quesos.push({ id: `q${p.turnos}`,
                            position: { x: 2 + p.azar() * (ANCHO - 5), z: 2 + p.azar() * (ALTO - 5) } });
        }

        if (p.hambre <= 0) p.muerto = true;
        return true;
    },

    /**
     * El depredador de la casa: **caza sólo cuando tiene hambre de verdad, y
     * nunca por debajo de tres ratones**.
     *
     * Es una regla de una línea y ahí está toda la diferencia con la política
     * tonta, que come lo que pilla. No planifica ni cuenta crías: se abstiene. La
     * abstinencia es la habilidad que este entorno mide, y por eso el techo
     * blando es tan simple — si hiciera falta un solucionador para superar al
     * azar, el juego estaría midiendo otra cosa.
     */
    sugerencia(p) {
        const st = this.estado(p);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p);
        const ratones = sus.piezas.filter(z => z.t === 'raton' || z.t === 'raton_huye');
        const yo = p.zorro;

        const puedoCazar = st.hambre < 55 && ratones.length > 3;
        const objetivos = puedoCazar ? ratones
            // Sin hambre o con la pradera justa, se ronda el queso: es donde los
            // ratones acabarán yendo, así que esperar ahí no cuesta nada.
            : sus.piezas.filter(z => z.t === 'queso');
        if (!objetivos.length) return legales[0];

        let cerca = objetivos[0], mejorD = Infinity;
        for (const o of objetivos) {
            const d = Math.abs(o.x - yo.x) + Math.abs(o.y - yo.y);
            if (d < mejorD) { mejorD = d; cerca = o; }
        }
        // Sin hambre y ya encima del queso, no se persigue a nadie.
        if (!puedoCazar && mejorD <= 1) return legales[0];

        let mejor = legales[0], mejorDist = Infinity;
        for (const m of legales) {
            const q = { x: yo.x + DIRS[m][0], y: yo.y + DIRS[m][1] };
            const d = Math.abs(q.x - cerca.x) + Math.abs(q.y - cerca.y);
            if (d < mejorDist) { mejorDist = d; mejor = m; }
        }
        return mejor;
    },

    deshacer() { return false; },
};
