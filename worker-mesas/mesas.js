/**
 * worker-mesas — mesas compartidas: personas y agentes en la MISMA partida
 * ═══════════════════════════════════════════════════════════════════════════
 *     POST /mesa/{sala}/sentarse  { quien, tipo }        → te sientas
 *     POST /mesa/{sala}/jugar     { quien, jugada }      → mueves
 *     GET  /mesa/{sala}                                  → el estado de la mesa
 *
 * POR QUÉ UN DURABLE OBJECT Y NO LO DE SIEMPRE
 * Todo lo demás en este proyecto es sin estado y se re-simula: el gym, el
 * verificador, el dataset. Eso funciona porque cada jugador manda su partida
 * entera y nadie tiene que recordar nada.
 *
 * Una mesa COMPARTIDA no puede ser así. Si dos seres juegan la misma partida,
 * alguien tiene que decidir el orden de las jugadas — y ese alguien tiene que
 * ser uno solo, o los dos jugadores acaban en mundos distintos. Un Durable
 * Object es exactamente eso: una instancia única por sala, con su estado.
 *
 * ⚠️ POR TURNOS, ASÍ QUE SIN WEBSOCKETS
 * La tentación era montar WebSockets. Pero brisca, ajedrez o go son por turnos:
 * entre jugada y jugada pasan segundos, no milisegundos. Un sondeo cada segundo
 * da la misma sensación y no arrastra reconexiones, latidos ni estados a medias.
 * El día que haya algo en tiempo real, esto se amplía; hoy sería complejidad
 * comprada por adelantado.
 *
 * LAS REGLAS SON LAS MISMAS. LITERALMENTE.
 * Se importan de `public/arcade/js/protohub/`, los mismos ficheros que corren en
 * el navegador de una persona, en `/api/gym` y en el verificador. Si hubiera una
 * copia «de servidor», el día que se separaran dos jugadores de la misma mesa
 * estarían jugando a juegos distintos sin saberlo.
 *
 * Y EL ÁRBITRO NO SE FÍA DE NADIE
 * Cada jugada se comprueba contra las reglas antes de entrar, y sólo se acepta
 * de quien tiene el turno. La mesa guarda la lista de jugadas — que es, otra
 * vez, un recibo: al terminar se puede verificar y aportar como cualquier otra.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { JUEGOS, TITULOS, SILLAS, cargarReglas } from '../public/arcade/js/protohub/rules/index.js';
import { puntuacionDe } from '../public/arcade/js/protohub/Verificador.js';
import { describirEstado } from '../public/arcade/js/protohub/descripcion.js';

const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
};
const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo, null, 2), { status: codigo, headers: CABECERAS });

const limpio = (v, tope) =>
    String(v ?? '').replace(/[<>&"'\x00-\x1f\x7f]/g, '').trim().slice(0, tope);

/** De dónde se lee el catálogo de cartas. Se puede cambiar en `wrangler.toml`. */
const ORIGEN_POR_DEFECTO = 'https://alisa.systems';
const RUTA_BIBLIOTECA = '/arcade/data/card_library.json';

/**
 * ⚠️ ASIENTOS QUE NO SE SIENTAN, PORQUE NO SON DE NADIE.
 *
 * El crupier del blackjack no decide: su regla es fija —se planta en 17— y sobre
 * esa certeza descansa TODA la medida del juego. La mesa, que descubre los
 * asientos por el nombre del turno, le ofrecía ese sitio a quien llegara segundo:
 * en la prueba, bruno hizo 51 jugadas de crupier. La partida terminaba, el
 * marcador cuadraba y el recibo verificaba — pero lo medido ya no era blackjack.
 *
 * Un asiento que la casa debe jugar por reglamento no puede quedar libre sólo
 * porque tenga nombre propio.
 */
const ASIENTOS_DE_LA_CASA = {
    blackjack: ['dealer'],
};

/**
 * ⚠️ JUEGOS DONDE SENTARSE DOS NO SIGNIFICA NADA — Y SE DICE, NO SE APARENTA.
 *
 * Antes se admitía a cualquiera en cualquier mesa. En estos, el segundo se
 * sentaba, veía su nombre en la lista de asientos… y no le llegaba un solo turno
 * en toda la partida. No daba error: simplemente no pasaba nada, que es la peor
 * forma de decir que no.
 *
 * El motivo va escrito porque no son el mismo caso: uno es de diseño del banco
 * de pruebas, otro es una limitación de las reglas que algún día se levantará, y
 * los últimos sencillamente son de un jugador.
 */
export const SOLITARIOS = {
    guerra: 'es el control del banco de pruebas: se voltean cartas y no hay ni una decisión, '
          + 'así que el resultado no puede depender de quién juegue — ese es justo su oficio',
    // Ojo con el motivo: NO es que al póker le falte el turno. Lo publica como
    // `turno: 'jugador'|'rival'` dentro del estado, no como el `turn` que lee
    // esta mesa, y está escrito como un mano a mano contra la casa. Sentar a dos
    // pide tocar las reglas, no la mesa — así que aquí se dice lo que hay.
    poker: 'está escrito como un mano a mano contra la casa: nombra su turno por dentro '
         + '(`turno`, no `turn`) y el rival no es una silla. Sentar a dos pide cambiar sus '
         + 'reglas, no esta mesa',
    blackjack: 'se juega contra el crupier, y el crupier no es una silla: su jugada la manda '
             + 'el reglamento',
    snake: 'es de un jugador',
    fagocito: 'es de un jugador',
    peaton: 'es de un jugador',
};

/** Una mesa. Instancia única por nombre de sala: ese es todo el truco. */
export class MesaCompartida {
    constructor(estado, env) {
        this.estado = estado;
        this.env = env ?? {};
        this.reglas = null;
    }

    async cargar() {
        const m = await this.estado.storage.get('mesa');
        return m ?? null;
    }

    /**
     * ⚠️ LA BIBLIOTECA DE CARTAS SE PIDE POR URL ABSOLUTA, Y HAY MOTIVO.
     * Los juegos de cartas leen `card_library.json` con un `fetch` relativo a
     * `import.meta.url`. Dentro de un Worker eso apunta al PROPIO worker, así
     * que la petición se la hacía a sí mismo y Cloudflare la cortaba con un
     * `error code: 1042` — un cuerpo que ni siquiera es JSON, así que el cliente
     * recibía basura en vez de un error.
     *
     * Lo peor es que no fallaba siempre: la primera llamada colaba porque
     * `cargarBaraja` se traga el fallo y cae a su respaldo interno. O sea que la
     * mesa podía abrirse con OTRA baraja que la del catálogo y sin decirlo.
     *
     * `/api/gym` ya resolvía esto pasando la URL; aquí se hace igual. La
     * diferencia es que una Function vive en el propio sitio y podía resolverla
     * contra `request.url`; este worker vive en `workers.dev`, así que necesita
     * el origen entero.
     */
    async reglasDe(juego) {
        if (!this.reglas || this.reglas._juego !== juego) {
            const url = (this.env.ORIGEN || ORIGEN_POR_DEFECTO) + RUTA_BIBLIOTECA;
            const r = await cargarReglas(juego, { url });
            if (!r) return null;
            r._juego = juego;
            this.reglas = r;
        }
        return this.reglas;
    }

    /**
     * Reconstruye la partida re-simulando las jugadas guardadas.
     *
     * Se guarda la LISTA, no el objeto de partida: un objeto de reglas no es
     * serializable de forma fiable y, sobre todo, la lista es el recibo. Así el
     * estado de la mesa y lo que se verifica al final son la misma cosa.
     */
    async reconstruir(mesa) {
        const reglas = await this.reglasDe(mesa.juego);
        const p = reglas.nuevaPartida({ semilla: mesa.semilla, seed: mesa.semilla });
        for (const j of mesa.jugadas) reglas.mover(p, j);
        return { reglas, p };
    }

    /**
     * Apunta el nombre del asiento que acaba de tocar, si es nuevo.
     *
     * ⚠️ LOS ASIENTOS SE DESCUBREN JUGANDO, Y ANTES NO SE DESCUBRÍAN.
     * Cada juego nombra sus asientos a su manera: 'white'/'black' en ajedrez,
     * 'player'/'cpu1'/'cpu2'/'cpu3' en los de bazas. La versión anterior sacaba
     * la lista del PRIMER estado, así que sólo conocía un nombre — y como todos
     * los demás caían fuera de la lista, la mesa creía que sus asientos estaban
     * vacíos y los jugaba la casa.
     *
     * El síntoma era de los buenos: la partida terminaba, el marcador cuadraba y
     * el recibo verificaba. Todo bien salvo que el segundo jugador no había
     * tocado una carta. Lo cazó una comprobación de una línea —«¿jugaron los
     * dos?»— que casi no escribo por parecer obvia: ana 10 jugadas, bruno 0.
     *
     * El orden en que aparecen los nombres ES el orden de turno, así que el
     * asiento n-ésimo de la mesa le toca al n-ésimo que se sentó.
     */
    anotarAsiento(mesa, st) {
        if (!st.turn) return;
        if ((ASIENTOS_DE_LA_CASA[mesa.juego] ?? []).includes(st.turn)) return;
        if (!mesa.ordenAsientos.includes(st.turn)) mesa.ordenAsientos.push(st.turn);
    }

    /** El asiento que le toca ahora, traducido a quién se sentó ahí. */
    quienTiraAhora(mesa, st) {
        const asientos = mesa.asientos;
        if (!st.turn) return asientos[0]?.quien ?? null;
        const i = (mesa.ordenAsientos ?? []).indexOf(st.turn);
        return i >= 0 ? (asientos[i]?.quien ?? null) : null;
    }

    async fetch(request) {
        const url = new URL(request.url);
        const accion = url.pathname.split('/').filter(Boolean).pop();

        /**
         * ⚠️ EL BUZÓN. Ver la nota del enrutador: esta instancia no es una mesa.
         *
         * `POST /reporte`  guarda un aviso
         * `GET  /reportes` los devuelve, del más nuevo al más viejo
         *
         * Se guarda una LISTA acotada y no una clave por aviso: un buzón que crece
         * sin techo es un buzón que un día no se puede leer. Doscientos es más de
         * lo que una tanda de betatesters produce, y el que sobra se cae por abajo.
         */
        if (accion === 'reporte' || accion === 'reportes') {
            const TOPE = 200;
            if (request.method === 'GET') {
                const avisos = (await this.estado.storage.get('avisos')) ?? [];
                return responder(200, { avisos: avisos.slice().reverse(), cuantos: avisos.length });
            }
            if (request.method !== 'POST') return responder(405, { error: 'usa POST o GET' });
            let aviso;
            try { aviso = await request.json(); } catch { return responder(400, { error: 'JSON inválido' }); }
            const texto = String(aviso?.comentario ?? '').trim();
            if (!texto) return responder(400, { error: 'hace falta un comentario' });

            const avisos = (await this.estado.storage.get('avisos')) ?? [];
            avisos.push({
                comentario: texto.slice(0, 2000),
                juego: limpio(aviso?.juego, 24),
                pagina: String(aviso?.pagina ?? '').slice(0, 200),
                // El recibo entero: es lo único que permite VOLVER A JUGAR la
                // partida, que es todo el motivo de que esto exista.
                recibo: aviso?.recibo ?? null,
                estado: aviso?.estado ?? null,
                pantalla: aviso?.pantalla ?? null,
                agente: String(aviso?.agente ?? '').slice(0, 180),
                cuando: new Date().toISOString(),
            });
            await this.estado.storage.put('avisos', avisos.slice(-TOPE));
            return responder(200, { guardado: true, cuantos: Math.min(avisos.length, TOPE) });
        }

        if (request.method === 'GET') {
            const mesa = await this.cargar();
            if (!mesa) return responder(404, { error: 'mesa vacía', sentarse: 'POST …/sentarse' });
            const { reglas, p } = await this.reconstruir(mesa);
            const st = reglas.estado(p);
            // `?quien=` no es opcional por capricho: sin él no se sabe desde qué
            // silla enseñar la partida, y enseñar la del asiento 0 a todo el
            // mundo es exactamente la fuga que esto viene a tapar.
            return responder(200, this.retrato(mesa, st, reglas, p,
                limpio(url.searchParams.get('quien'), 24)));
        }

        let d;
        try { d = await request.json(); } catch { return responder(400, { error: 'JSON inválido' }); }
        const quien = limpio(d?.quien, 24);
        if (!quien) return responder(400, { error: 'falta `quien`' });

        if (accion === 'sentarse') return this.sentarse(d, quien);
        if (accion === 'jugar') return this.jugar(d, quien);
        return responder(404, { error: `no sé hacer '${accion}'` });
    }

    async sentarse(d, quien) {
        let mesa = await this.cargar();
        if (!mesa) {
            /**
             * ⚠️ EL ALIAS, OTRA VEZ. TERCERA APARICIÓN DEL MISMO FALLO.
             *
             * Esto comprobaba `JUEGOS.includes(d.juego)` y devolvía `null` si no
             * estaba. Pero `checkers.html` monta `{ juego: 'damas', idJuego:
             * 'checkers' }` y `chess.html` lo mismo con el ajedrez: la página abre
             * la sala con el nombre del VISUALIZADOR, que no está en esa lista.
             *
             * Consecuencia, medida con dos navegadores el 13-08-2026: el ajedrez y
             * las damas **no se podían jugar acompañado, en absoluto**. La mesa se
             * abría vacía —sin turno y sin jugadas legales— y las dos personas se
             * quedaban mirando un tablero que no era de nadie.
             *
             * Es exactamente el mismo fallo que apareció hoy en `cargarReglas` y en
             * `/api/verificar`: alguien comprueba la lista por su cuenta en vez de
             * pedírselo a quien conoce los alias. Van tres sitios. `cargarReglas`
             * los resuelve; lo único que hay que hacer es preguntarle a ella y
             * juzgar por lo que devuelve.
             */
            const pedido = String(d?.juego ?? '');
            const reglasPedidas = pedido ? await cargarReglas(pedido, {}).catch(() => null) : null;
            const juego = reglasPedidas ? pedido : null;
            if (!juego) return responder(400, { error: 'falta `juego` para abrir la mesa', juegos: JUEGOS });
            const semilla = Number.isFinite(Number(d?.semilla))
                ? Number(d.semilla) >>> 0 : Math.floor(Math.random() * 1e6);
            const reglas = await this.reglasDe(juego);
            const st = reglas.estado(reglas.nuevaPartida({ semilla, seed: semilla }));
            // ⚠️ CON BARAJA DE RESPALDO NO SE ABRE MESA, Y NO ES REMILGO.
            // Los juegos de cartas caen a un respaldo interno si no pueden leer
            // `card_library.json`, y lo avisan con `biblioteca: false`. En una
            // partida suelta eso es tolerable; aquí NO: el recibo de esta mesa
            // se verificará luego contra `/api/verificar`, que sí lee la
            // biblioteca. Dos barajas distintas = re-simulación distinta =
            // partida legítima rechazada por inválida, y sin pista de por qué.
            // Mejor no abrir que abrir una mesa cuyo resultado no vale.
            if (st.biblioteca === false) {
                return responder(503, {
                    error: `no se pudo leer el catálogo de cartas; '${juego}' abriría con una baraja que luego no verificaría`,
                    catalogo: (this.env.ORIGEN || ORIGEN_POR_DEFECTO) + RUTA_BIBLIOTECA,
                });
            }
            mesa = {
                juego, semilla, jugadas: [], asientos: [],
                // ⚠️ A CUÁNTOS SE ESPERA ANTES DE QUE JUEGUE LA CASA.
                //
                // Sin esto, el primero que se sienta arranca y la casa ocupa el
                // resto — cómodo para una persona sola, y demoledor en cuanto los
                // jugadores son agentes: en la primera prueba con dos procesos, el
                // segundo llegó tres segundos tarde y se encontró la partida
                // TERMINADA. Cuarenta jugadas en tres segundos, cero suyas.
                //
                // Con personas no se notaba porque una persona tarda en pulsar. Es
                // el tipo de suposición que sólo se cae cuando quien juega no tiene
                // pantalla — y aquí tienen que poder jugar políticas y modelos.
                esperaA: Math.max(1, Math.min(8, Number(d?.jugadores) || 1)),
                // El orden en que los juegos nombran sus asientos. Se descubre
                // del primer estado en vez de codificarlo: hay dos convenciones
                // en la casa —'player'/'cpu1' y 'white'/'black'— y adivinar cuál
                // toca ya nos costó una tarde.
                ordenAsientos: [st.turn ?? 'unico'],
                abierta: Date.now(),
            };
        }
        if (mesa.asientos.some(a => a.quien === quien)) {
            return responder(200, { already_seated: true, ...await this.retratoDe(mesa, quien) });
        }
        // Decir que no, con el motivo, en vez de admitir a alguien que nunca
        // llegaría a jugar. Un «no» explicado se arregla; un turno que no llega
        // se pasa media partida buscándolo.
        if (mesa.asientos.length >= 1 && SOLITARIOS[mesa.juego]) {
            return responder(409, {
                error: `en ${TITULOS[mesa.juego] ?? mesa.juego} sólo se sienta uno`,
                solitaire: true,
                reason: SOLITARIOS[mesa.juego],
                ...await this.retratoDe(mesa, quien),
            });
        }
        /**
         * ⚠️ NO CABE UN CUARTO EN UNA MESA DE DOS.
         *
         * Antes el número de asientos se averiguaba JUGANDO —se subía cada vez
         * que se veía cambiar el turno— y por eso en una mesa recién abierta
         * entraba todo el mundo. Pasó de verdad: cuatro sentados a un ajedrez,
         * los dos primeros con las piezas y la invitada de verdad mirando con la
         * lista de acciones vacía, sin que nada fallara ni avisara.
         *
         * Ahora el dato se declara en `rules/index.js` y aquí sólo se comprueba.
         * Un dato que se descubre por accidente no puede vigilarse; uno declarado,
         * sí — y `prueba_sillas.mjs` compara lo declarado contra lo que se ve
         * jugando, por si algún día dejan de coincidir.
         */
        const tope = SILLAS[mesa.juego] ?? Infinity;
        if (mesa.asientos.length >= tope) {
            return responder(409, {
                error: `la mesa está completa: ${TITULOS[mesa.juego] ?? mesa.juego} es de ${tope} `
                     + `${tope === 1 ? 'jugador' : 'jugadores'}`,
                sugerencia: 'abre otra sala con el nombre que quieras, o mira ésta sin sentarte',
                ...await this.retratoDe(mesa, quien),
            });
        }

        /**
         * ⚠️ UN SECRETO POR ASIENTO — SIN ESTO, EL NOMBRE NO ES UNA IDENTIDAD.
         *
         * Hasta aquí `quien` era sólo una etiqueta: cualquiera que supiera el
         * nombre de la sala podía mandar `{quien:'motoko', jugada:...}` y jugar
         * las piezas de otra. Entre nosotros da igual; con el enlace circulando
         * por internet es cuestión de horas que alguien lo pruebe, y no por
         * maldad — porque está ahí.
         *
         * Se entrega al sentarse y se exige al jugar. No es criptografía: es la
         * diferencia entre decir tu nombre y demostrar que eres tú, que es lo
         * mínimo para que una partida signifique algo.
         *
         * Mirar la mesa NO lo pide: la partida es pública, como debe ser en algo
         * que se comparte para que lo vean. Lo que se protege es MOVER.
         */
        const secreto = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
        mesa.asientos.push({
            quien, tipo: ['persona', 'agente', 'politica'].includes(d?.tipo) ? d.tipo : 'persona',
            desde: Date.now(), secreto,
        });
        await this.estado.storage.put('mesa', mesa);
        return responder(200, { seated: quien, secret: secreto, ...await this.retratoDe(mesa, quien) });
    }

    async jugar(d, quien) {
        const mesa = await this.cargar();
        if (!mesa) return responder(404, { error: 'mesa vacía' });
        const silla = mesa.asientos.find(a => a.quien === quien);
        if (!silla) return responder(403, { error: 'no estás sentado en esta mesa' });
        /**
         * ⚠️ HAY QUE DEMOSTRAR QUE ERES TÚ, NO SÓLO DECIRLO.
         *
         * Sin esto, `quien` era una etiqueta: cualquiera con el nombre de la sala
         * podía mandar `{quien:'motoko', jugada:…}` y mover sus piezas. El
         * secreto se entrega al sentarse y se exige aquí.
         *
         * Las mesas abiertas ANTES de este cambio no tienen secreto guardado, y
         * se las deja seguir: romper partidas en curso para cerrar una puerta es
         * pagar el arreglo con el trabajo de otro. Las nuevas lo llevan desde el
         * primer segundo.
         */
        if (silla.secreto && String(d?.secreto ?? '') !== silla.secreto) {
            return responder(403, {
                error: 'ese asiento no es tuyo: falta el `secreto` que te dio la mesa al sentarte',
                pista: 'lo devuelve `POST /mesa/{sala}/sentarse` en el campo `secreto`. Guárdalo.',
            });
        }
        const { reglas, p } = await this.reconstruir(mesa);
        let st = reglas.estado(p);
        if (st.is_game_over) return responder(409, { error: 'la partida ya terminó', ...this.retrato(mesa, st, reglas, p, quien) });

        // ── El árbitro ──────────────────────────────────────────────────
        // Dos comprobaciones, y las dos importan: que sea tu turno, y que la
        // jugada exista. Sin la primera, el más rápido juega por los dos.
        const aQuienToca = this.quienTiraAhora(mesa, st);
        if (aQuienToca && aQuienToca !== quien) {
            return responder(409, { error: `no es tu turno, es de ${aQuienToca}`, ...this.retrato(mesa, st, reglas, p, quien) });
        }
        const jugada = String(d?.jugada ?? '');
        if (!reglas.mover(p, jugada)) {
            return responder(400, {
                error: `jugada ilegal: '${jugada}'`,
                legales: (st.legal_moves ?? []).slice(0, 40),
            });
        }
        mesa.jugadas.push(jugada);

        // Si el asiento siguiente no lo ocupa nadie, juega la casa. Así una
        // persona sola puede sentarse y empezar sin esperar a que llegue otro.
        st = reglas.estado(p);
        this.anotarAsiento(mesa, st);
        // Mientras falte gente por sentarse, la casa NO rellena los huecos: la
        // mesa se queda esperando en vez de jugar la partida sin ellos.
        const completa = mesa.asientos.length >= (mesa.esperaA ?? 1);
        let vueltas = 0;
        while (completa && !st.is_game_over && reglas.sugerencia && vueltas++ < 64) {
            const toca = this.quienTiraAhora(mesa, st);
            if (toca) break;                       // hay alguien: le toca a él
            const j = reglas.sugerencia(p);
            if (!j || !reglas.mover(p, j)) break;
            mesa.jugadas.push(j);
            st = reglas.estado(p);
            this.anotarAsiento(mesa, st);
        }
        await this.estado.storage.put('mesa', mesa);
        return responder(200, this.retrato(mesa, st, reglas, p, quien));
    }

    async retratoDe(mesa, quien) {
        const { reglas, p } = await this.reconstruir(mesa);
        return this.retrato(mesa, reglas.estado(p), reglas, p, quien);
    }

    /**
     * @param {object} st     el estado CANÓNICO (silla 0). De aquí salen el
     *                        marcador y el turno, y es el que re-simula el
     *                        verificador — así la mesa y él puntúan igual.
     * @param {string} quien  desde qué silla se enseña la partida. Es lo único
     *                        que cambia entre un jugador y otro.
     */
    retrato(mesa, st, reglas, p, quien) {
        // Se anota aquí además de en el bucle de la casa porque TODOS los
        // caminos pasan por este punto —sentarse, mirar, jugar—, y así ninguno
        // puede olvidarse de aprender un asiento nuevo.
        this.anotarAsiento(mesa, st);
        // ⚠️ CADA UNO VE SU MANO, Y ESTO COSTÓ VERLO.
        // Las reglas de cartas publicaban siempre la perspectiva de la silla 0.
        // Con un humano contra la casa daba igual; en una mesa compartida, el
        // segundo abría su pestaña y leía la mano del primero, carta por carta.
        // Ninguna prueba lo cazó —la partida avanzaba, los turnos se repartían y
        // el recibo verificaba—: se vio abriendo dos pestañas y comparando.
        //
        // ⚠️ Y NO SE PREGUNTA SI LAS REGLAS ACEPTAN EL SEGUNDO PARÁMETRO.
        // El primer intento lo hacía con `reglas.estado.length > 1`, y esa
        // condición es SIEMPRE falsa: `Function.length` cuenta los parámetros
        // hasta el primero con valor por defecto, y la firma es
        // `estado(p, asiento = 0)` — o sea, 1. La vista por asiento quedó
        // desactivada entera y la fuga seguía ahí, con el arreglo ya escrito.
        // Un juego que no lo acepte se limita a ignorar el argumento de más.
        const i = mesa.asientos.findIndex(a => a.quien === quien);
        const mío = i > 0 ? reglas.estado(p, i) : st;
        return {
            game: mesa.juego, title: TITULOS[mesa.juego] ?? mesa.juego,
            seed: mesa.semilla,
            // Cada quién con el asiento que le toca en el juego, para que se vea
            // desde fuera quién es 'white' o quién es 'cpu1'.
            /**
             * ⚠️ EL SECRETO NO SALE DE AQUÍ. NI EL TUYO.
             *
             * Esto era `{...a}`, que copia el asiento entero — y al añadir el
             * secreto por asiento habría repartido el de todos a todo el mundo en
             * cada respuesta. El arreglo de seguridad abriendo, él solo, un
             * agujero mayor que el que venía a cerrar.
             *
             * Se enumeran los campos que se publican en vez de excluir los que
             * no. Excluir es una lista negra: el día que alguien añada un campo
             * sensible al asiento, se publicará solo. Enumerar se equivoca hacia
             * el silencio, que es el lado correcto.
             *
             * El secreto se entrega UNA vez, al sentarse, y nunca más.
             */
            seats: mesa.asientos.map((a, i) => ({
                who: a.quien, kind: a.tipo, since: a.desde,
                seat: mesa.ordenAsientos[i] ?? null,
            })),
            // Los asientos del juego que todavía no ocupa nadie: los juega la
            // casa. Un cuatro-jugadores con dos personas sentadas NO está
            // esperando a nadie, y quien mire la mesa tiene derecho a saberlo.
            played_by_house: Math.max(0, mesa.ordenAsientos.length - mesa.asientos.length),
            // Cuántos asientos ha llegado a tener este juego. Se descubre
            // jugando, así que al abrir vale 1 y va creciendo. Un juego que se
            // quede en 1 para siempre no admite compañía —`guerra` es así a
            // propósito: es el control, ahí nadie decide nada.
            seats_seen: mesa.ordenAsientos.length,
            /**
             * ⚠️ Y EL TOPE DECLARADO, QUE ES EL QUE DECIDE SI CABES.
             *
             * Este número ya estaba aquí —es el que devuelve el 409 de mesa
             * completa— pero no salía, así que los clientes decidían si sentarse
             * mirando `asientos_del_juego`, que se DESCUBRE jugando y vale 1 hasta
             * que el turno cambia de manos por primera vez.
             *
             * Se vio jugando: en una partida de entropy a dos, la segunda jugadora
             * abrió el enlace después del primer robo y antes del cambio de turno.
             * El árbitro decía todavía «una silla», así que entró como espectadora
             * — a una mesa con un asiento libre y declarado. Se quedó fuera de una
             * partida en la que cabía, y no había forma de saber por qué.
             *
             * Ésta es la misma lección de la vez anterior con otra ropa: un dato
             * que se descubre por accidente no sirve para decidir. El declarado sí.
             */
            max_seats: SILLAS[mesa.juego] ?? null,
            // Cuántos faltan por sentarse antes de que la mesa eche a andar. Un
            // cliente sin pantalla necesita saberlo para esperar en vez de creer
            // que la partida está atascada.
            waiting_for: Math.max(0, (mesa.esperaA ?? 1) - mesa.asientos.length),
            // Se publica ANTES de que nadie lo intente, para que un cliente sepa
            // si tiene sentido ofrecer «invitar a alguien» en esta mesa.
            ...(SOLITARIOS[mesa.juego]
                ? { solitaire: true, reason: SOLITARIOS[mesa.juego] } : {}),
            /**
             * ⚠️ LA SITUACIÓN, EN TEXTO — Y FALTABA.
             *
             * La mesa entregaba `acciones` y nada más, así que un agente sabía
             * qué podía hacer y no qué estaba pasando. Con eso sólo se puede
             * elegir al azar entre lo ofrecido, que es exactamente la línea base
             * contra la que queremos medirlo.
             *
             * Es la misma puerta de lenguaje que usa el arnés local —el mismo
             * `describir(p, asiento)` de las reglas— así que quien juegue por
             * HTTP recibe letra por letra lo que recibe quien juega en casa. Si
             * fueran textos distintos, las dos filas de la tabla no serían
             * comparables y no lo sabríamos.
             *
             * Y va POR ASIENTO: cada uno lee su situación, nunca la del vecino.
             */
            /**
             * ⚠️ Y SI EL JUEGO NO TIENE `describir` PROPIO, LO CUENTA EL
             * DESCRIPTOR COMPARTIDO. Sin este respaldo, los diecinueve clásicos
             * —ajedrez incluido— entregaban jugadas legales y ningún tablero: un
             * agente recibía «a2a3, a2a4, b2b3…» sin saber qué está pasando, que
             * es pedirle que juegue a ciegas.
             *
             * Lo destapé montando una partida de ajedrez para jugar de verdad, no
             * probando el código. Es el tipo de hueco que sólo aparece cuando
             * usas la cosa para lo que sirve.
             */
            text: (() => {
                try {
                    if (reglas.describir) return reglas.describir(p, Math.max(0, i));
                    return describirEstado(mesa.juego, mío);
                } catch { return null; }
            })(),
            turn: this.quienTiraAhora(mesa, st),
            moves: mesa.jugadas.length,
            is_game_over: !!st.is_game_over,
            // Se publica siempre que el juego lo diga: quien mire la mesa tiene
            // que poder saber con qué baraja se está jugando.
            ...(st.biblioteca === undefined ? {} : { library: st.biblioteca }),
            score: puntuacionDe(st),
            // ⚠️ LAS JUGADAS LEGALES SÓLO PARA QUIEN LE TOCA. ANTES IBAN A TODOS.
            //
            // `legal_moves` son las jugadas de quien mueve, y en un juego de
            // cartas **eso es literalmente su mano**. Se enviaban a cualquiera que
            // mirase la mesa, así que un jugador sondeando mientras el rival
            // pensaba veía las cartas que el rival podía jugar.
            //
            // Es la misma fuga que se tapó por la mañana con `estado(p, asiento)`
            // —cada uno ve su mano— sólo que colada por otra puerta: se arregló lo
            // que se enseña y se dejó abierto lo que se ofrece. Lo cazó
            // `prueba_lenguaje.mjs` comparando las cartas del texto contra las que
            // el juego declara públicas.
            legal_moves: this.quienTiraAhora(mesa, st) === quien
                ? (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset')
                : [],
            state: mío,
            // El recibo, en cualquier momento: la mesa no guarda nada que no
            // sea verificable por un tercero.
            receipt: { game: mesa.juego, seed: mesa.semilla, moves: mesa.jugadas },
        };
    }
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CABECERAS });
        const url = new URL(request.url);
        const partes = url.pathname.split('/').filter(Boolean);   // mesa / {sala} / {accion}

        /**
         * ⚠️ EL BUZÓN DE AVISOS. Lo que manda `arcade/js/protohub/reportar.js`.
         *
         * Un aviso trae el RECIBO de la partida —{juego, semilla, jugadas}—, así que
         * no es una queja: es algo que se puede volver a jugar exactamente igual. Por
         * eso vive aquí y no en un formulario cualquiera; aquí ya está el código que
         * sabe re-simular una partida.
         *
         * ⚠️ Y COMPARTE ALMACÉN CON LAS MESAS, QUE NO ES ELEGANTE Y SE DICE.
         * Un buzón no es una mesa. Tener su propia clase Durable Object obligaría a
         * una migración del worker, y eso es riesgo de despliegue para guardar una
         * lista. Va a una instancia con nombre fijo y su propia clave de almacén; el
         * día que haga falta algo más, ése es el momento de separarlo.
         */
        if (partes[0] === 'reporte' || partes[0] === 'reportes') {
            const id = env.MESAS.idFromName('__buzon');
            return env.MESAS.get(id).fetch(request);
        }

        if (partes[0] !== 'mesa' || !partes[1]) {
            return responder(200, {
                que_es: 'Mesas compartidas: personas y agentes en la misma partida.',
                // Qué código está contestando ahora mismo. `desplegar.mjs` espera
                // a ver el identificador nuevo antes de dejar probar nada.
                version: env.VERSION?.id ?? null,
                sentarse: 'POST /mesa/{sala}/sentarse { quien, tipo, juego, semilla? }',
                jugar: 'POST /mesa/{sala}/jugar { quien, jugada }',
                mirar: 'GET /mesa/{sala}',
                // Separados a propósito: «los juegos» a secas invitaría a
                // sentarse dos en cualquiera, y en seis de ellos no significa
                // nada. Cada uno con su motivo, para que no haya que probarlo.
                acompanados: JUEGOS.filter(j => !SOLITARIOS[j]),
                solitarios: SOLITARIOS,
            });
        }
        const sala = partes[1].slice(0, 40);
        const id = env.MESAS.idFromName(sala);
        return env.MESAS.get(id).fetch(request);
    },
};
