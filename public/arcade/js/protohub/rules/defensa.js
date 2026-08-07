/**
 * defensa.js — el cuarto género con sustrato propio: ECONOMÍA Y RELOJ
 * ═══════════════════════════════════════════════════════════════════════════
 * Dos carriles. En el tuyo pones torres; al del rival le mandas bichos. El oro
 * cae solo, y cada moneda gastada en atacar es una moneda que no defiende.
 *
 * ⚠️ LO ELIGIÓ LA MATRIZ, OTRA VEZ, Y POR DOS HUECOS A LA VEZ.
 *
 * `matriz_generos.mjs` decía que `autonomo` lo sostenían **3 de 22** y que
 * ninguno juntaba mundo vivo con adversario. Y decía algo peor por omisión:
 * ninguno de los veintidós tiene ECONOMÍA — un recurso que se acumula, se gasta
 * y obliga a elegir entre ahora y luego. Eso no es un juego que falte, es una
 * familia entera: la que va de la defensa de torres a la estrategia en tiempo
 * real.
 *
 * ⚠️ POR QUÉ ESA FAMILIA NO SE PARECE A NADA DE LO QUE HABÍA
 * En los veintidós anteriores, una jugada mala se paga en esa jugada. Aquí se
 * paga tres turnos después, cuando el oro que no ahorraste hace falta y no
 * está. Es la primera vez que el motor pide **planificar contra un reloj que
 * corre sin ti** — porque existe `pasar`, y a veces pasar es lo correcto.
 *
 * Un banco de pruebas sin esta estructura no sabe distinguir a quien piensa a
 * un turno vista de quien piensa a cinco. Todos los demás juegos premian
 * igual las dos cosas.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

const ANCHO = 7, ALTO = 10;
const BANDOS = ['azul', 'rojo'];
/**
 * ⚠️ ESTOS NÚMEROS LOS FIJÓ UNA MEDIDA, Y LA PRIMERA TANDA ERA UN JUEGO ROTO.
 *
 * Con la primera —torre 10, bicho 8, alcance 2, vida 3 y entrada fija— las tres
 * semillas daban **exactamente el mismo resultado**: tablas a 9, cuarenta bichos
 * muertos, un punto de daño en ciento veinte rondas. La defensa no ganaba por
 * poco: es que atacar era estrictamente un error, y un juego donde una de las
 * dos opciones nunca conviene no tiene dos opciones.
 *
 * La causa no era el precio sino la GEOMETRÍA: todos los bichos entraban por la
 * misma columna, así que una sola torre tapaba el carril entero para siempre. Se
 * arregla dejando elegir la entrada (`enviar c`) y bajando el alcance a uno: hoy
 * hacen falta varias torres para cubrir siete columnas, y el atacante busca el
 * hueco. El bicho aguanta cinco para que pasar por delante de una torre cueste
 * pero no mate.
 */
const ORO_INICIAL = 15, RENTA = 3;
const COSTE_TORRE = 12, COSTE_BICHO = 6;
/**
 * ⚠️ CUATRO, Y EL NÚMERO SALE DE UNA CUENTA QUE HAY QUE HACER.
 * Una torre alcanza a un bicho que pasa por su columna exactamente tres rondas
 * —alcance uno, tres filas—. Con cinco de vida sobrevivía siempre y las torres
 * eran adorno: medido, **tres torres por bando y cero bajas**. Con tres moría
 * con una sola torre y volvía a ganar la defensa. Con cuatro, una torre lo deja
 * a punto y hacen falta DOS solapadas para sellar una columna — así cubrir
 * siete columnas no cabe en el presupuesto y el atacante tiene dónde buscar.
 */
const VIDA_BASE = 10, VIDA_BICHO = 4;
const ALCANCE = 1, TOPE = 80;

const letras = 'abcdefg';
const celdaNombre = (x, y) => `${letras[x]}${y + 1}`;
const desdeNombre = (s) => {
    const m = /^([a-g])(10|[1-9])$/.exec(String(s).toLowerCase().trim());
    return m ? { x: letras.indexOf(m[1]), y: Number(m[2]) - 1 } : null;
};
const otro = (b) => BANDOS[1 - BANDOS.indexOf(b)];

export const defensa = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);
        const lados = {};
        for (const b of BANDOS) {
            lados[b] = {
                vida: VIDA_BASE, torres: [], bichos: [],
                /**
                 * ⚠️ ORO DE SALIDA DESIGUAL, Y ES LO ÚNICO QUE SORTEA LA SEMILLA.
                 *
                 * Antes sorteaba la columna de entrada; al dejar que el atacante
                 * la elija, eso dejó de existir y las tres semillas daban partidas
                 * IDÉNTICAS — el entorno no medía nada que dependiera del reparto.
                 * Un banco de pruebas con una sola partida disfrazada de ciento
                 * veinte no ordena a nadie.
                 *
                 * Ahora varían los dos o tres de oro iniciales. Es poco a
                 * propósito: suficiente para que la primera decisión no sea
                 * siempre la misma, insuficiente para decidir la partida. Lo que
                 * se mide sigue siendo cómo juegas, no qué te tocó.
                 */
                oro: ORO_INICIAL + Math.floor(azar() * 4),
                matados: 0,
            };
        }
        /**
         * ⚠️ Y DOS TORRES YA PUESTAS, DISTINTAS EN CADA SEMILLA.
         *
         * El calibrador dijo `±0.0` sobre **120 semillas**: separaba a las
         * políticas, sí, pero jugando ciento veinte veces la misma partida. Al
         * dejar que el atacante eligiera columna, a la semilla no le quedó nada
         * que sortear — y un entorno con una sola posición mide una posición, no
         * un juego. Es el mismo defecto que tenía sokoban con un nivel fijo, y
         * ahí se resolvió repartiendo ocho niveles.
         *
         * Lo que define una posición aquí es POR DÓNDE SE PUEDE PASAR. Dos torres
         * de salida en sitios distintos cambian el hueco que hay que encontrar y
         * el que hay que tapar, que es la partida entera. Se colocan en la mitad
         * de arriba para que quede sitio donde reaccionar, y en columnas
         * distintas para no regalar una columna sellada de inicio.
         */
        for (const b of BANDOS) {
            const usadas = new Set();
            while (usadas.size < 2) {
                const x = Math.floor(azar() * ANCHO);
                if (usadas.has(x)) continue;
                usadas.add(x);
                lados[b].torres.push({ x, y: 1 + Math.floor(azar() * (ALTO / 2)) });
            }
        }
        return { semilla, turno: BANDOS[0], lados, rondas: 0, tope: TOPE };
    },

    /**
     * ⚠️ DOS CARRILES, COMO EN LA FLOTA — Y AQUÍ SIN NIEBLA, A PROPÓSITO.
     *
     * Se ve todo: tus torres, sus torres, los bichos de los dos lados. No es
     * pereza, es la estructura que se quiere aislar. La flota ya mide deducir
     * bajo incertidumbre; si aquí también hubiera niebla, un mal resultado no
     * diría si el agente falló al planificar o al adivinar, y un eje que se
     * mezcla con otro deja de medir.
     *
     * La fila de abajo va marcada como destino (`2`): es la base a la que van
     * los bichos. El vocabulario del terreno ya sabía decirlo.
     */
    sustrato(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0], el = otro(yo);
        const ancho = ANCHO * 2 + 1;
        const celdas = new Array(ancho * ALTO).fill(0);
        const piezas = [];

        for (let y = 0; y < ALTO; y++) celdas[y * ancho + ANCHO] = 1;      // el muro
        for (let x = 0; x < ANCHO; x++) {
            celdas[(ALTO - 1) * ancho + x] = 2;                            // su base
            celdas[(ALTO - 1) * ancho + ANCHO + 1 + x] = 2;                // la tuya
        }

        // Izquierda: el carril del rival (donde tú atacas). Derecha: el tuyo.
        const volcar = (lado, dx, mio) => {
            for (const t of lado.torres) piezas.push({ x: t.x + dx, y: t.y, t: 'torre', de: mio ? 0 : 1 });
            // Los bichos son de NADIE: los paga un jugador pero luego andan
            // solos. Marcarlos como suyos diría que alguien los está moviendo, y
            // no es cierto — es justo la diferencia que mide el eje `autonomo`.
            for (const b of lado.bichos) piezas.push({ x: b.x + dx, y: b.y, t: 'bicho', de: 2 });
        };
        volcar(p.lados[el], 0, false);
        volcar(p.lados[yo], ANCHO + 1, true);

        return {
            rejilla: { ancho, alto: ALTO, celdas },
            piezas, zonas: [],
            leyenda: { torre: 'torre', bicho: 'bicho en marcha' },
            simbolos: { torre: 'T', bicho: 'b' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const puedes = st.legal_moves.filter(m => m !== 'nueva');
        return `Defensa. Juegas ${st.bando}. `
             + `Tu base ${st.vida}, la suya ${st.vida_rival}. Oro ${st.oro}.\n`
             + `Izquierda: el carril del rival (le mandas bichos). Derecha: el tuyo `
             + `(pones torres). Los bichos bajan una fila por ronda y llegan a la base (o).\n`
             + `Torre ${COSTE_TORRE} de oro, bicho ${COSTE_BICHO}, la renta son ${RENTA} por ronda.\n`
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === st.bando ? 'sí' : 'no'}. Puedes: `
                   + puedes.slice(0, 10).join(', ') + (puedes.length > 10 ? `… (${puedes.length})` : ''));
    },

    estado(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0], el = otro(yo);
        const mio = p.lados[yo], suyo = p.lados[el];
        const terminada = mio.vida <= 0 || suyo.vida <= 0 || p.rondas >= p.tope;
        const gane = suyo.vida <= 0 && mio.vida > 0;

        // Las jugadas son de QUIEN MUEVE, no de quien mira: la lección que dejó
        // el verificador en la flota, y que aquí se aplica desde el primer día.
        const mueve = p.lados[p.turno];
        const legales = terminada ? ['nueva'] : accionesDe(p, p.turno, mueve);

        return {
            juego: 'defensa',
            bando: yo, turn: p.turno,
            oro: mio.oro, vida: mio.vida, vida_rival: suyo.vida,
            torres: mio.torres.length, bichos_en_camino: suyo.bichos.length,
            bichos_encima: mio.bichos.length,
            matados: mio.matados, rondas: p.rondas,
            /**
             * Con pendiente desde la primera moneda: cada punto de base que le
             * quitas puntúa, cada uno que encajas resta, y matar bichos suma poco
             * pero suma — así una defensa que aguanta sin llegar a ganar puntúa
             * por encima de una que se desmorona. Sin ese término intermedio, las
             * partidas que no acaban valdrían todas igual, que es como sokoban se
             * quedó sin medir en su primer día.
             */
            puntos: (VIDA_BASE - suyo.vida) * 25 - (VIDA_BASE - mio.vida) * 25
                    + mio.matados * 3 + (gane ? 150 : 0),
            gane,
            desenlace: !terminada ? null
                : gane ? 'Has derribado su base'
                : mio.vida <= 0 ? 'Te han derribado la base' : 'Tablas por tiempo',
            semilla: p.semilla,
            legal_moves: legales, legal_actions: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        if (this.estado(p).is_game_over) return false;
        const quien = p.turno, mio = p.lados[quien], suyo = p.lados[otro(quien)];
        const orden = String(jugada).toLowerCase().trim();
        if (!accionesDe(p, quien, mio).includes(orden)) return false;

        if (orden.startsWith('enviar')) {
            mio.oro -= COSTE_BICHO;
            // Entra por la columna elegida, arriba del carril del rival, y baja.
            const col = letras.indexOf(orden.split(/\s+/)[1] ?? letras[0]);
            suyo.bichos.push({ x: col < 0 ? 0 : col, y: 0, vida: VIDA_BICHO });
        } else if (orden !== 'pasar') {
            const c = desdeNombre(orden.replace(/^torre\s*/, ''));
            mio.oro -= COSTE_TORRE;
            mio.torres.push({ x: c.x, y: c.y });
        }

        p.turno = otro(quien);
        // ⚠️ EL MUNDO CORRE UNA VEZ POR RONDA, NO UNA POR JUGADA. Si avanzara
        // tras cada acción, quien mueve primero vería el tablero cambiar dos
        // veces por vuelta y el segundo jugaría otro juego. Una ventaja de salida
        // invisible convierte la tabla en un ranking de quién empieza.
        if (p.turno === BANDOS[0]) correrRonda(p);
        return true;
    },

    /**
     * El rival de la casa: defender lo urgente, y si no hay urgencia, atacar.
     *
     * Lee su sustrato, como los otros dos géneros nuevos — podría mirar el oro
     * del contrario y no lo hace. La regla: si hay bichos bajando por tu carril
     * y llega el oro, se pone torre donde más los cubra; si no hay peligro y
     * sobra oro, se manda un bicho; si no llega para nada, se pasa y se ahorra.
     *
     * No es un solucionador —no calcula si conviene cambiar daño por daño, que
     * es la decisión de verdad de este juego— así que sigue siendo un techo
     * blando. Pero es un techo que ahorra cuando toca, y ahorrar cuando toca ya
     * distingue a quien mira más allá del turno siguiente.
     */
    sugerencia(p) {
        const asiento = BANDOS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p, asiento);

        const míos = sus.piezas.filter(z => z.x > ANCHO);          // mi mitad
        const amenazas = míos.filter(z => z.t === 'bicho');
        const casillas = legales.filter(m => m.startsWith('torre'));

        if (amenazas.length && casillas.length) {
            // La casilla que cubre más bichos, contando lo que les queda de
            // camino: una torre arriba dispara más veces que una junto a la base.
            let mejor = null, mejorValor = -1;
            for (const m of casillas) {
                const c = desdeNombre(m.replace(/^torre\s*/, ''));
                const valor = amenazas.reduce((s, b) => {
                    const bx = b.x - (ANCHO + 1);
                    return s + (Math.max(Math.abs(bx - c.x), Math.abs(b.y - c.y)) <= ALCANCE
                        ? ALTO - b.y : 0);
                }, 0);
                if (valor > mejorValor) { mejorValor = valor; mejor = m; }
            }
            if (mejorValor > 0) return mejor;
        }
        /**
         * ⚠️ SI TE ESTÁN ATACANDO Y NO TE LLEGA, AHORRA — NO CONTRAATAQUES.
         *
         * Sin esta línea el rival de la casa no llegaba nunca a los doce de oro:
         * iba gastando de seis en seis en bichos y las torres eran adorno.
         * Medido, y la mecánica era graciosa de ver: las dos políticas repartían
         * tres torres para cubrir el máximo de columnas, quedaba una descubierta,
         * y las dos mandaban TODO por ese hueco. **Cero bajas en toda la partida**
         * con seis torres en el tablero.
         *
         * Aquí está la decisión que el género aporta y que ningún otro de los
         * veintidós plantea: el oro es uno y sirve para dos cosas opuestas. Quien
         * no sabe dejar de atacar para taparse, pierde por no haber elegido.
         */
        if (amenazas.length && !casillas.length && legales.includes('pasar')) return 'pasar';
        /**
         * ⚠️ AHORRAR, QUE ES LA JUGADA QUE ESTE GÉNERO AÑADE.
         *
         * La primera versión decía en su comentario que ahorraba y no ahorraba:
         * sólo levantaba torre si tenía los doce de oro justo en el instante del
         * peligro, y como se gastaba de seis en seis en bichos, nunca llegaba.
         * Medido: **cero torres, partida en veinticuatro rondas, gana siempre
         * quien empieza**. Un juego decidido por el orden de salida no mide nada,
         * y el rival de la casa era el que lo estaba decidiendo.
         *
         * Con tres torres de fondo antes de atacar, `pasar` deja de ser
         * resignación y pasa a ser inversión — que es exactamente la decisión que
         * ninguno de los veintidós anteriores sabía plantear.
         */
        if (st.torres < 3) {
            if (casillas.length) {
                // Se tapa la columna propia peor cubierta, a media altura: una
                // torre arriba dispara más veces a lo que baja.
                const mías = míos.filter(z => z.t === 'torre').map(z => z.x - (ANCHO + 1));
                let dónde = null, peor = Infinity;
                for (let x = 0; x < ANCHO; x++) {
                    const cubren = mías.filter(t => Math.abs(t - x) <= ALCANCE).length;
                    const m = `torre ${celdaNombre(x, 4)}`;
                    if (cubren < peor && casillas.includes(m)) { peor = cubren; dónde = m; }
                }
                return dónde ?? casillas[0];
            }
            if (legales.includes('pasar')) return 'pasar';
        }

        // Atacar por donde menos torres cubren. Mandar bichos por delante de una
        // torre es pagar seis de oro por nada, y el hueco está a la vista: el
        // carril del rival se ve entero, igual que él ve el tuyo.
        const envios = legales.filter(m => m.startsWith('enviar'));
        if (envios.length) {
            const suyas = sus.piezas.filter(z => z.t === 'torre' && z.x < ANCHO);
            let mejor = envios[0], menos = Infinity;
            for (const m of envios) {
                const col = letras.indexOf(m.split(/\s+/)[1]);
                const cubren = suyas.filter(t => Math.abs(t.x - col) <= ALCANCE).length;
                if (cubren < menos) { menos = cubren; mejor = m; }
            }
            return mejor;
        }
        if (casillas.length && !amenazas.length && st.oro >= COSTE_TORRE + COSTE_BICHO) return casillas[0];
        return legales.includes('pasar') ? 'pasar' : legales[0];
    },

    deshacer() { return false; },
};

/** Qué puede hacer un bando con el oro que tiene. `pasar` siempre está. */
function accionesDe(p, bando, lado) {
    const acciones = ['pasar'];
    // ⚠️ El atacante ELIGE la columna. Con una entrada fija, defender era
    // resolver el juego una vez y no volver a pensar; ahora el hueco se busca y
    // se tapa, que es la conversación que hace interesante al género.
    if (lado.oro >= COSTE_BICHO) {
        for (let x = 0; x < ANCHO; x++) acciones.push(`enviar ${letras[x]}`);
    }
    if (lado.oro >= COSTE_TORRE) {
        const ocupadas = new Set(lado.torres.map(t => `${t.x},${t.y}`));
        for (let y = 0; y < ALTO - 1; y++) {          // la fila de la base, no
            for (let x = 0; x < ANCHO; x++) {
                if (!ocupadas.has(`${x},${y}`)) acciones.push(`torre ${celdaNombre(x, y)}`);
            }
        }
    }
    return acciones;
}

/**
 * Una ronda del mundo: renta, torres que disparan, bichos que bajan.
 *
 * Sin una gota de azar. La mazmorra de cripta y los mares de la flota se
 * sortean con la semilla y después la partida es una función de las jugadas;
 * esto igual. Es lo que permite comprobar un recibo volviéndolo a jugar en vez
 * de creerse a quien lo firma.
 */
function correrRonda(p) {
    p.rondas++;
    for (const bando of BANDOS) {
        const lado = p.lados[bando];
        lado.oro += RENTA;

        // Las torres disparan al bicho más adelantado que tengan a tiro.
        for (const t of lado.torres) {
            const aTiro = lado.bichos
                .filter(b => Math.max(Math.abs(b.x - t.x), Math.abs(b.y - t.y)) <= ALCANCE)
                .sort((a, b) => b.y - a.y)[0];
            if (aTiro) aTiro.vida--;
        }
        lado.matados += lado.bichos.filter(b => b.vida <= 0).length;
        lado.bichos = lado.bichos.filter(b => b.vida > 0);

        // Y los que sobreviven, un paso más cerca de la base.
        for (const b of lado.bichos) b.y++;
        const llegan = lado.bichos.filter(b => b.y >= ALTO - 1).length;
        if (llegan) {
            lado.vida -= llegan;
            lado.bichos = lado.bichos.filter(b => b.y < ALTO - 1);
        }
    }
}
