/**
 * ProtoHubEnv — las reglas del arcade, convertidas en entorno de gym
 * ═══════════════════════════════════════════════════════════════════════════
 * La portada del sitio promete «mismas reglas para personas y para máquinas».
 * Hasta hoy eso era verdad a medias: cualquiera podía **verificar** una partida
 * ajena, pero una máquina no podía **jugar** las máquinas de la sala. Existían
 * 5 entornos con las tres puertas y ninguna de las 24 estaciones declaraba el
 * suyo. Una frase en la portada firmando un cheque que el código no pagaba.
 *
 * Esto lo paga, y no escribiendo once entornos a mano. Los dos contratos que ya
 * teníamos encajan casi sin tocarlos:
 *
 *     ProtoHub (reglas)              GymEnv (tres puertas)
 *     ─────────────────────────      ──────────────────────────────
 *     nuevaPartida({semilla})   →    reset(seed)
 *     mover(p, jugada)          →    step(action)
 *     estado(p).legal_moves     →    affordances()      ← el regalo
 *     estado(p).puntos          →    reward / getScore()
 *     estado(p).is_game_over    →    done
 *     sugerencia(p)             →    el rival, para que sea de UN agente
 *
 * `legal_moves` **ya es** la lista de affordances: el juego publica en cada
 * momento lo que se puede hacer. La puerta de lenguaje —la que sirve a un
 * agente LLM— sale gratis, y además sale EXACTA: un agente no puede alucinar
 * una jugada ilegal porque solo se le ofrecen las legales.
 *
 * LO QUE ESTO ERA Y YA NO ES
 * --------------------------
 * ⚠️ Aquí ponía: «la observación numérica genérica es POBRE A PROPÓSITO: puntos,
 * número de jugadas legales, turno y fin. No sabe qué es un alfil. Prefiero
 * declarar la limitación a fingir que un vector de cuatro números enseña ajedrez».
 *
 * Era honesto y era cierto — durante meses. Caducó el 27-08, cuando el vector pasó
 * a salir del SUSTRATO: el tablero entero casilla a casilla, los montones, los
 * hechos de la mesa y las cartas que tienes en la mano. Sigue sin saber qué es un
 * alfil, y esa es justo la gracia: no hace falta: sabe qué hay en cada casilla y
 * el juego dice el resto.
 *
 * Se deja escrito lo que decía antes porque la frase era buena y la decisión de
 * declarar una limitación en vez de disimularla es la que hizo que se arreglara.
 * Ver la nota larga sobre `opcionesDe`, más abajo.
 *
 * Un módulo de reglas que quiera su propia puerta numérica sigue pudiendo
 * implementar `observacion(p) → number[]`, y este adaptador la usa antes que la
 * suya.
 *
 * LO QUE SÍ ES, Y ES LO IMPORTANTE
 * --------------------------------
 * El episodio de una máquina produce **el mismo recibo** que la partida de una
 * persona —`{juego, semilla, jugadas, puntos}`— así que lo verifica el mismo
 * `Verificador.js` y puntúa en la misma tabla. Ahí es donde la frase de la
 * portada deja de ser una frase.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { GymEnv } from './GymEnv.js';
import { partir } from './Grammar.js';
// La normalización de puntos vive donde vive la verificación. Si el entorno y
// el verificador contaran los puntos de forma distinta, el recibo de una
// partida legítima no cuadraría — y eso pasó de verdad, ver `_puntosDe`.
import { puntuacionDe } from '../../../../arcade/js/protohub/Verificador.js';
import { describirEstado } from '../../../../arcade/js/protohub/descripcion.js';
import { substrateObservation, observationLength } from './SubstrateObservation.js';
import { VOCABULARIO } from '../../../../data/vocabulario_observacion.js';

/** Un tope para que la casa no pueda encadenar turnos hasta colgar la pestaña. */
const MAX_TURNOS_CASA = 64;

/**
 * ⚠️ LA OBSERVACIÓN NUMÉRICA DE LOS CUARENTA ERAN CUATRO NÚMEROS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Puntos, cuántas jugadas legales hay, si es tu turno y si acabó. O sea: el
 * MARCADOR. Ni una casilla, ni una carta. Con eso un agente numérico no puede
 * jugar al ajedrez ni a la brisca — puede aprender a pulsar la primera opción y
 * poco más, y la nota que saque no mide el juego.
 *
 * Y la pieza para arreglarlo llevaba meses escrita: `SubstrateObservation`
 * convierte un sustrato en números, y su propia cabecera decía para qué existía
 * —«demostrar que el sustrato basta»— y que no reemplazaba a ninguna observación
 * publicada. Nadie la había enchufado a nada: la usaba UNA prueba y ningún
 * entorno. Es la misma avería de siempre en esta casa, la pieza canónica
 * enterrada donde no se puede llamar, y van cuatro esta semana.
 *
 * Aquí sí se enchufa, y aquí sí toca cambiar la forma: estos cuarenta NO tienen
 * huella sellada —las trece huellas son las de los mundos— así que no se retira
 * ninguna nota publicada al ampliarles el vector. Los trece que sí están sellados
 * no se tocan: las secciones nuevas son opcionales y sólo las pide este adaptador.
 *
 * El vector que sale ahora, por secciones:
 *
 *     4        el marcador de siempre, que no está en el sustrato
 *     164      el armazón de `substrateObservation` (tamaño y piezas sueltas)
 *     2·casillas  EL TABLERO ENTERO: un plano de suelo y otro de quién lo ocupa
 *     4·montón    manos, mazos y descartes: cuál, de quién, visto y tapado
 *     4·hecho     el triunfo, el bote, el color en juego
 *     1·carta     una casilla por carta de la baraja: las que tienes en la mano
 *
 * Las listas cerradas que eso necesita no se adivinan mirando la partida —el
 * descarte no existe al repartir y el triunfo puede ser cualquiera de cuatro—:
 * se miden jugando con `gen_vocabulario.mjs` y se guardan en un fichero que se
 * puede abrir y leer. Lo que no esté declarado sale como 0, que significa «no lo
 * tengo en el vocabulario» y no puede confundirse con otra cosa.
 */
function opcionesDe(juego) {
    const v = VOCABULARIO[juego] ?? {};
    return {
        maxPiezas: v.maxPiezas ?? 0,
        tipos: v.tipos ?? [],
        ...(v.rejilla ? { rejilla: v.rejilla } : {}),
        ...(v.zonas?.length
            ? { zonas: { ids: v.zonas, max: Math.max(4, v.zonas.length) } } : {}),
        ...(v.hechos?.length
            ? { hechos: { ids: v.hechos, valores: v.valores ?? {}, max: Math.max(4, v.hechos.length) } } : {}),
        ...(v.cartas?.length ? { mano: { cartas: v.cartas } } : {}),
    };
}

/**
 * Fabrica una clase de entorno a partir de un módulo de reglas del ProtoHub.
 *
 * @param {Object} cfg
 * @param {string} cfg.juego     identificador del juego ('poker', 'ajedrez'…)
 * @param {Object} cfg.reglas    módulo de reglas ya construido
 * @param {Object} [cfg.meta]    título, resumen, horizonte, etiquetas
 * @returns {typeof GymEnv}
 */
export function crearEnvDeProtoHub({ juego, reglas, meta = {} }) {
    const OPTS = opcionesDe(juego);
    const LARGO = 4 + observationLength(OPTS.maxPiezas, OPTS);

    return class extends GymEnv {
        static id = `alisa/${juego}-protohub-v0`;
        static observationSpace = {
            shape: [LARGO],
            // Los cuatro primeros tienen nombre; el resto son secciones enteras y
            // se describen por lo que son, no número a número — un tablero de
            // fagocito son 784 casillas y nombrarlas una a una no ayuda a nadie.
            names: ['puntos', 'jugadas_legales', 'turno_es_mio', 'terminada'],
            secciones: [
                { desde: 0, largo: 4, que: 'marcador' },
                { desde: 4, largo: observationLength(OPTS.maxPiezas, {}), que: 'tamaño y piezas sueltas' },
                ...(OPTS.rejilla ? [{ largo: OPTS.rejilla.ancho * OPTS.rejilla.alto * 2, que: 'tablero: suelo y ocupante' }] : []),
                ...(OPTS.zonas ? [{ largo: OPTS.zonas.max * 4, que: 'montones' }] : []),
                ...(OPTS.hechos ? [{ largo: OPTS.hechos.max * 4, que: 'hechos de la mesa' }] : []),
                ...(OPTS.mano ? [{ largo: OPTS.mano.cartas.length, que: 'tu mano, una casilla por carta' }] : []),
            ],
        };
        static actionSpace = { type: 'discrete', from: 'affordances()' };
        static meta = {
            title: meta.title ?? juego,
            summary: meta.summary ?? `Reglas locales de '${juego}' a través del ProtoHub.`,
            horizon: meta.horizon ?? 400,
            tags: ['protohub', 'verificable', ...(meta.tags ?? [])],
        };

        /**
         * ⚠️ LA FAMILIA, QUE AQUÍ ES LA MISMA PARA LOS TREINTA.
         *
         * Un mueble con treinta cartuchos y todos de turnos: se juega cuando te
         * toca y el reloj no corre solo. Los trece cartuchos de mundo la declaran
         * cada uno en su `static ROM`; aquí basta con decirlo una vez, porque el
         * adaptador ES lo que tienen en común.
         *
         * Y no es una etiqueta: decide con cuántos pasos se les mide. Un juego de
         * turnos se acaba en cuarenta y uno de tiempo real necesita siete mil, y
         * medirlos con el mismo número es preguntarle a un maratón cómo va a los
         * cien metros. Ver `prueba_senal.mjs`.
         */
        static familia = meta.familia ?? 'turnos';

        /** El juego, por si alguien quiere el recibo o las reglas crudas. */
        static juego = juego;
        static reglas = reglas;

        /**
         * ═══════════════════════════════════════════════════════════════════════
         *  ⚠️ CUÁNTAS SILLAS TIENE ESTE JUEGO, PREGUNTÁNDOSELO AL ESTADO
         * ═══════════════════════════════════════════════════════════════════════
         *
         * Aquí ponía que ninguno de los 35 publica su lista de asientos, y era verdad
         * hasta que los juegos empezaron a publicar `marcador`: un elemento por silla,
         * o sea que su longitud las enumera. No hubo que inventar un campo — apareció
         * solo al arreglar otra cosa.
         *
         * Se miran tres indicios en vez de uno porque `marcador` no siempre está desde
         * el principio. Medido en los diez juegos de más de una silla, en el estado
         * RECIÉN repartido:
         *
         *     brisca · tute · hearts · spades · gofish   marcador y manos_rivales+1
         *     parchís · oca                              marcador y avance
         *     canadiense                                 los tres
         *     remigio                                    marcador y manos_rivales+1
         *     entropy                                    NINGUNO
         *
         * `manos_rivales` son «los demás», por eso el +1.
         *
         * ⚠️ ENTROPY SE QUEDA EN UNA SILLA A PROPÓSITO, Y CONVIENE SABER POR QUÉ.
         *
         * Publica `marcador: p.fin ? … : null`, o sea sólo al acabar, así que al
         * empezar no hay nada que contar. Arreglarlo es de una línea en sus reglas
         * —publicarlo siempre— pero ese campo entra en la HUELLA DE APERTURA
         * (`huella.js`), y cambiar la huella de un juego es cambiar lo que identifica
         * sus partidas. No es una línea que se toque de pasada.
         *
         * Mientras tanto entropy cuenta una silla, o sea que se comporta exactamente
         * como hasta hoy: siempre la 0. No se gana nada, pero no se pierde nada, que
         * es lo que toca cuando la alternativa es tocar una huella a ciegas.
         */
        static contarSillas(e) {
            const candidatos = [
                Array.isArray(e?.marcador) ? e.marcador.length : 0,
                Array.isArray(e?.manos_rivales) ? e.manos_rivales.length + 1 : 0,
                Array.isArray(e?.avance) ? e.avance.length : 0,
            ];
            return Math.max(1, ...candidatos);
        }

        /**
         * ⚠️ EN QUÉ SILLA SE SIENTA EL AGENTE. CERO ES LA DE SIEMPRE.
         *
         * No es un número de asiento porque NINGUNO de los 35 juegos publica su
         * lista de asientos: `turn` es sólo un nombre suelto —`player`, `azul`,
         * `ladron`, `guia`, `a`— y no hay forma uniforme de enumerarlos. Medido el
         * 13-08-2026 preguntando a las 35 reglas.
         *
         * Así que se cuenta en TURNOS QUE JUEGA LA CASA ANTES DE QUE TE SIENTES,
         * que es lo mismo dicho de otra forma y funciona en todos sin que ninguno
         * tenga que cambiar: con 1, te sientas donde el segundo en jugar; con 3,
         * el cuarto. En un juego de un solo jugador no hay casa y no pasa nada.
         *
         * Por qué hace falta: la tabla sentaba SIEMPRE al participante en el primer
         * turno, y en canadiense esa silla gana el 31% frente al 25% limpio de
         * parchís, con los cuatro asientos jugando igual. Seis puntos de ventaja
         * que la clasificación se estaba apuntando como habilidad.
         *
         * ⚠️ ACTUALIZACIÓN 16-08: YA HAY FORMA DE ENUMERAR LAS SILLAS, Y ARREGLA
         *    EL PROBLEMA QUE DEJABA ESTO A MEDIAS.
         *
         * Lo de arriba —contar en turnos que juega la casa— tenía un agujero: en un
         * juego de DOS, pedir la silla 2 no te sienta en ninguna silla nueva, te hace
         * empezar dos turnos más tarde en la misma. Y entonces la medida del sesgo
         * mezcla «qué silla ocupo» con «cuándo entro», que son cosas distintas.
         *
         * Se veía en la medida (40 semillas, política tonta en las cuatro sillas):
         *
         *     entropy   -44.9  -14.9  -15.8  -16.2      ← ¡y sólo tiene dos jugadores!
         *
         * Lo que faltaba era saber cuántas sillas tiene cada juego, y ahora se sabe:
         * `marcador` es un elemento POR ASIENTO, así que su longitud las enumera. No
         * hizo falta inventar un campo: apareció al publicar los marcadores por silla.
         *
         * Así que la silla pedida se envuelve sobre las que hay de verdad. Pedir la 2
         * en un juego de dos es pedir la 0, y ahí no se deja pasar ningún turno.
         */
        asiento = 0;

        /** Las sillas que resultaron existir, y la que de verdad se ocupó. */
        asientos = 1;
        asientoReal = 0;

        reset(seed = 0) {
            // Las reglas no se ponen de acuerdo en cómo llamar a la semilla, así
            // que se mandan las dos formas. Es el mismo cuidado que hubo que
            // tener en el verificador, donde `seed` vs `semilla` daba un verde
            // falso: la partida trucada salía «válida».
            this.p = reglas.nuevaPartida({ seed, semilla: seed });
            this.seed = seed;
            this.steps = 0;
            this.done = false;
            this.jugadas = [];
            this.ilegales = 0;

            /**
             * Cuántas sillas hay, preguntándoselo a la partida recién repartida. Se
             * mira desde la 0 a propósito: es la única que existe seguro, y es la que
             * publica el `marcador` completo del que sale la cuenta.
             */
            this.asientoReal = 0;
            const inicial = this._estado();
            // `this.constructor`, no el nombre de la clase: ésta es anónima y extiende
            // `GymEnv`, así que nombrar a la base buscaría el estático donde no está.
            this.asientos = this.constructor.contarSillas(inicial);
            this.asientoReal = ((this.asiento % this.asientos) + this.asientos) % this.asientos;

            let e = this._estado();

            /**
             * La casa juega sus turnos ANTES de que el agente elija silla. Sin esto
             * el agente sería siempre el primero en mover.
             *
             * ⚠️ Y estas jugadas entran en el recibo como cualquier otra, igual que
             * las de la casa en `step`. Si faltaran, al re-simular la partida
             * saldría otro tablero y el verificador tumbaría a un jugador honrado
             * —que es exactamente el fallo que ya nos costó una tarde con el `rnd`.
             */
            let previos = 0;
            while (reglas.sugerencia && this.asientoReal > previos
                   && e.turn !== undefined && !e.is_game_over) {
                const j = reglas.sugerencia(this.p);
                if (!j || !reglas.mover(this.p, j)) break;
                this.jugadas.push(j);
                previos++;
                e = this._estado();
            }

            // De quién es el turno AHORA: eso es "yo". Lo demás es la casa.
            this.turnoAgente = e.turn ?? null;
            this.turnosPrevios = previos;
            this._puntos = this._puntosDe(e);
            return this.getObservation();
        }

        /**
         * ⚠️ EL ASIENTO SE LE PASA A LAS REGLAS. ANTES NO, Y ERA UN CABLE SUELTO.
         * ═══════════════════════════════════════════════════════════════════════
         *
         * `this.asiento` movía al agente de silla para DECIDIR —la casa juega sus
         * turnos antes, ahí arriba— pero esto llamaba a `reglas.estado(this.p)` a
         * secas. O sea que el agente jugaba desde la silla 2 y se le devolvía la mano,
         * el marcador y los puntos **de la silla 0**.
         *
         * Y el otro extremo del cable llevaba tiempo puesto: DIECISÉIS de los treinta
         * y cinco juegos ya declaran `estado(p, asiento = 0)` y lo usan bien. `bazas.js`
         * incluso resuelve el caso difícil —`puntos: MENOR_GANA ? -míos : míos`, con
         * `míos = p.puntos[yo]`—, que es el que impide leer `marcador[asiento]` a pelo:
         * en hearts menos es mejor, y el marcador crudo tiene el signo al revés.
         * (Medido: `puntuacionDe` daba −20 donde `marcador[0]` decía 20.)
         *
         * Por eso la rotación de sillas estaba apagada en `tabla.mjs`: rotar movía al
         * agente para decidir y le seguía puntuando la silla del primer turno, lo que
         * es peor que no rotar porque parece arreglado. No faltaba el mecanismo:
         * faltaba esta línea entre los dos.
         *
         * Con `asiento = 0` —lo de siempre, y lo que hay en todo el corpus ya guardado—
         * `estado(p, 0)` es idéntico a `estado(p)`, así que esto no cambia ni un número
         * publicado. Los diecinueve que declaran `estado(p)` ignoran el argumento de
         * más, que es lo que hace JavaScript con ellos.
         */
        _estado() { return reglas.estado(this.p, this.asientoReal) ?? {}; }

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ EL SUSTRATO ESTABA ESCRITO Y ESTE ADAPTADOR NO LO REENVIABA
         * ═══════════════════════════════════════════════════════════════════
         *
         * Dieciséis de los veintinueve juegos del ProtoHub publican `sustrato(p)`
         * en sus reglas —con rejilla, piezas, leyenda y símbolos completos— y el
         * banco los contaba como «sin sustrato», porque nadie preguntaba. El
         * censo daba **13 entornos de 53**; con esta línea pasan a 29.
         *
         * Es la avería de siempre —la pieza canónica existe y está enterrada
         * donde no se puede llamar— sólo que a escala de dieciséis juegos.
         *
         * ⚠️ Y POR QUÉ IMPORTA MÁS QUE UN NÚMERO EN UNA TABLA.
         *
         * El sustrato es el registro plano de lo que está pasando, y es el mismo
         * objeto que pinta el dibujante, que lee el agente, que describe el texto
         * y que **sella la huella**. Un juego sin sustrato no se puede pintar en
         * 3D, ni contar en palabras, ni verificar volviéndolo a jugar: es un
         * minijuego con reglas, no una etapa de un mundo.
         *
         * ⚠️ DEVUELVE `null` CUANDO NO LO HAY, Y ESO NO ES PEREZA.
         *
         * Los trece que no lo tienen —ajedrez, go, snake, las cartas…— siguen
         * devolviendo `null`, que es exactamente lo que devolvían antes. Así su
         * huella no se mueve por un cambio que no les afecta, y los que ganan
         * sustrato son sólo los que de verdad ganan algo.
         */
        sustrato() {
            if (typeof reglas.sustrato !== 'function') return null;
            try { return reglas.sustrato(this.p, this.asientoReal) ?? null; }
            catch { return null; }
        }

        /**
         * PARA MIRAR NO HACE FALTA HABER EMPEZADO.
         *
         * `describe()` y `affordances()` son las dos puertas por las que se ASOMA
         * quien acaba de descargarse el banco: «¿qué es esto y qué puedo hacer?».
         * Reventaban con un `Cannot read properties of undefined` si no habías
         * llamado antes a `reset()` — y llamar a `reset()` antes de saber qué es la
         * cosa es justo el orden que nadie sigue.
         *
         * Se siembra con 0, que es el valor por defecto del propio `reset`, así que
         * lo que se ve es la partida inicial de siempre. Quien luego siembre de
         * verdad, la pisa. `step()` NO lleva esto a propósito: jugar sin haber
         * empezado sí es un error de quien llama, y conviene que se note.
         */
        _asegurarPartida() { if (!this.p) this.reset(0); }

        /**
         * La puntuación. La normalización **la hace el verificador**, no yo.
         *
         * ⚠️ AQUÍ METÍ LA PATA Y CASI NO SE VE. Escribí mi propia versión de
         * esto —`Number(e.puntos ?? e.score) || 0`— sin mirar que
         * `Verificador.js` ya tenía `puntuacionDe()`. Con `score: {black, white}`
         * mi versión hacía `Number(objeto)` → `NaN` → **0**, así que go, reversi
         * y mancala emitían recibos que decían «0 puntos» mientras el servidor,
         * al re-simular la misma partida, sacaba 219,5. Tres partidas legítimas
         * **rechazadas por el verificador**, que es el peor fallo imaginable en
         * un banco de pruebas cuyo argumento entero es que verifica bien.
         *
         * Lo grave no es el `NaN`: es haber reimplementado algo que ya existía,
         * justo el día que escribo que la fuerza de esto es tener un solo
         * fichero de reglas.
         *
         * Lo que sí es mío: si el juego no lleva marcador —el ajedrez no— se usa
         * el RESULTADO (`1-0`, `0-1`, `1/2-1/2`) como puntuación, que además es
         * comparable entre juegos. El agente siempre mueve primero, así que
         * `1-0` es su victoria.
         */
        _puntosDe(e) {
            const directo = puntuacionDe(e);
            if (directo !== 0) return directo;
            // `puntuacionDe` devuelve 0 tanto para «empate» como para «este juego
            // no lleva marcador». Sólo en el segundo caso miramos el resultado.
            if (typeof e.score === 'number' || typeof e.puntos === 'number'
                || (e.score && typeof e.score === 'object')) return 0;

            const res = e.result ?? e.resultado ?? null;
            if (res === '1-0') return 1;
            if (res === '0-1') return -1;
            if (res && String(res).startsWith('1/2')) return 0;

            // ⚠️ `res` TAMBIÉN CUENTA COMO GANADOR, Y ANTES NO.
            // Esta línea buscaba `winner` o `ganador`, y **ningún juego publica
            // ninguno de los dos**: los diecinueve publican `result`. Como arriba
            // sólo se compara con la notación de ajedrez (`1-0`, `0-1`, `1/2`) y
            // ellos dicen `'black'`, `'white'` o `'draw'`, este bloque no llegaba
            // a ejecutarse jamás. Un `??` encadenado con dos nombres muertos no da
            // error: da `null`, y `null` se lee como «no hay ganador».
            // Lo destapó `desajustes.mjs`, buscando justo esto.
            const ganador = e.winner ?? e.ganador ?? res;
            if (ganador) {
                if (/draw|tabla|empate/i.test(String(ganador))) return 0;
                return String(ganador) === String(this.turnoAgente) ? 1 : -1;
            }
            return 0;
        }

        /** ¿Le toca a la casa? Solo tiene sentido si el juego declara turnos. */
        _tocaLaCasa(e) {
            return this.turnoAgente !== null && e.turn !== undefined
                && e.turn !== this.turnoAgente && !e.is_game_over;
        }

        step(action) {
            if (this.done) {
                return { obs: this.getObservation(), reward: 0, done: true,
                         info: { error: 'la partida ya terminó' } };
            }
            const antes = this._puntos;
            const jugada = (action && action.jugada !== undefined) ? action.jugada : action;

            if (!reglas.mover(this.p, jugada)) {
                // Una jugada ilegal CONSUME un paso y se cuenta. No se premia ni
                // se castiga: la política que dispara a ciegas se queda sin
                // horizonte, que ya es castigo suficiente y no inventa una escala
                // de penalizaciones que luego habría que justificar.
                this.steps++;
                this.ilegales++;
                return { obs: this.getObservation(), reward: 0, done: this.done,
                         info: { ilegal: String(jugada) } };
            }
            this.jugadas.push(jugada);
            this.steps++;

            // Que responda la casa, si el juego tiene turnos y trae rival. Sin
            // esto un agente jugaría al ajedrez contra sí mismo y la puntuación
            // no significaría nada.
            let turnosCasa = 0;
            let e = this._estado();
            while (reglas.sugerencia && this._tocaLaCasa(e) && turnosCasa < MAX_TURNOS_CASA) {
                const j = reglas.sugerencia(this.p);
                if (!j || !reglas.mover(this.p, j)) break;
                // La jugada de la casa TAMBIÉN entra en el recibo: si faltara, al
                // re-simular la partida saldría otro tablero.
                this.jugadas.push(j);
                turnosCasa++;
                e = this._estado();
            }

            const ahora = this._puntosDe(e);
            this._puntos = ahora;
            this.done = !!e.is_game_over;
            this._lastScore = ahora;
            return {
                obs: this.getObservation(),
                reward: ahora - antes,
                done: this.done,
                info: { turnosCasa, jugadas: this.jugadas.length },
            };
        }

        getObservation() {
            // Si las reglas saben describirse en números, mandan ellas.
            if (reglas.observacion) return reglas.observacion(this.p);
            const e = this._estado();
            const marcador = [
                this._puntosDe(e),
                (e.legal_moves ?? []).length,
                this.turnoAgente === null || e.turn === this.turnoAgente ? 1 : 0,
                e.is_game_over ? 1 : 0,
            ];

            /**
             * ⚠️ Y EL RESTO SALE DEL SUSTRATO, DESDE LA SILLA QUE MIRA.
             *
             * `mano.asiento` es lo que hace que este vector sea de QUIEN JUEGA y no
             * de la silla 0. Es el mismo cable que ya estaba suelto una vez en este
             * fichero —`estado(p)` sin asiento, y el agente de la silla 2 recibía la
             * mano de la 0— así que aquí se pasa explícito.
             *
             * Si el sustrato falla, se devuelve el marcador con ceros detrás: la
             * forma del vector no puede cambiar a mitad de una partida, y una
             * excepción aquí dejaría al arnés comparando vectores de dos largos.
             */
            const sus = this.sustrato();
            if (!sus) return marcador.concat(new Array(LARGO - 4).fill(0));
            const opts = OPTS.mano
                ? { ...OPTS, mano: { ...OPTS.mano, asiento: this.asiento ?? 0 } }
                : OPTS;
            let cuerpo;
            try { cuerpo = substrateObservation(sus, opts); }
            catch { cuerpo = new Array(LARGO - 4).fill(0); }
            return marcador.concat(cuerpo);
        }

        // El texto vive en `protohub/descripcion.js` y no aquí: un LLM sentado a
        // una mesa de una página tiene que leer LO MISMO que un LLM del banco de
        // pruebas, o los dos números dejan de ser comparables sin que se note.
        /**
         * ⚠️ EL OBJETIVO NO LLEGABA AQUÍ. LOS AGENTES DEL BANCO JUGABAN SIN SABER
         *    A QUÉ.
         * ═══════════════════════════════════════════════════════════════════════
         *
         * El objetivo lo declara el juego una vez en `reglas.OBJETIVO`, y quien lo
         * mete en el estado es `ProtoHub.state()`. Este entorno no pasa por ahí:
         * llama a `reglas.estado(p)` directamente, así que `st.objetivo` venía vacío
         * y `describirEstado()` se saltaba su primera línea —la que pone el objetivo
         * por delante de los puntos, porque «Puntos: -11» no significa nada sin él—.
         * Y los diecinueve juegos con `describir()` propio ni siquiera pasaban por
         * esa plantilla.
         *
         * Medido el 16-08: de nueve juegos mirados, **ninguno** decía a qué se juega
         * por esta puerta. Ni el ajedrez.
         *
         * ⚠️ Y ES EXACTAMENTE EL MISMO FALLO QUE EL ÁRBITRO DE SALAS YA ARREGLÓ.
         *
         * `worker-mesas/mesas.js` lo cuenta en su propio comentario: «este árbitro no
         * pasa por ahí, así que aquí no aparecían», y allí se corrigió. Aquí no, y
         * nadie lo notó porque las dos puertas se probaban por separado. Lo destapó
         * la comprobación de SALAS, que compara lo que dice la sala con lo que dice
         * la casa — y resultó que la casa era la que callaba.
         *
         * Es el tercer «arreglado en un extremo y no en el otro» de esta semana.
         * Cuando algo se arregla en un sitio, toca preguntar quién más hacía lo
         * mismo.
         */
        describe() {
            this._asegurarPartida();
            const meta = reglas.OBJETIVO ? `${reglas.OBJETIVO} ` : '';
            if (reglas.describir) return meta + reglas.describir(this.p);
            /**
             * ⚠️ EL SUSTRATO TAMBIÉN VA POR LA PUERTA DE TEXTO, Y NO IBA.
             *
             * Este entorno ya saca el vector NUMÉRICO del sustrato desde el
             * 27-08 —`substrateObservation(sus)`, veinte líneas más arriba— y su
             * propia cabecera cuenta que aquella pieza también llevaba meses
             * escrita sin usarse. La de texto se quedó sin enchufar.
             *
             * Consecuencia, medida el 29-08: en el MISMO entorno, un agente con
             * vector veía el tablero y uno de lenguaje no. Diecisiete de los
             * veintiséis juegos de rejilla le llegaban a un LLM como «t: 0.
             * rotasPorJugador: [0,0]». Motoko lo dijo jugando cuatro días antes:
             * «sin contexto espacial, un LLM jugará igual que una política al
             * azar» — y esa frase describe exactamente lo que medían sus notas.
             *
             * Es el cuarto «arreglado en un extremo y no en el otro» de la
             * semana, y va justo debajo de la nota que dice eso mismo.
             */
            return describirEstado(juego, { objetivo: reglas.OBJETIVO, ...this._estado() },
                                   this.sustrato());
        }

        /**
         * ⚠️ EL VERBO SE SIGUE ENTREGANDO CRUDO, Y LA TRIPLETA SE DECLARA APARTE.
         *
         * `verb` es la jugada tal como la declara el juego, y así tiene que
         * seguir: es lo que `actFromVerb` compara y lo que el verificador escribe
         * en el recibo. Tocarlo cambiaría el juego conservando el nombre.
         *
         * Lo que se añade es dónde acaba el método, que aquí SÍ se sabe:
         *
         *   `enviar a`  → #enviar |a     ← 68 de éstos en defensa, con `args:{}`
         *   `jugar:P_5` → #jugar  |P_5      mintiendo: el parámetro existía, sólo
         *   `pasar`     → #pasar            que estaba metido en la cadena
         *   `a2a3`      → #jugar  |a2a3  ← una jugada sin verbo ES jugar
         *
         * Ese último caso es el que unifica de verdad las seis gramáticas del
         * banco: `a2a3`, `D_7` y `0` no son métodos distintos, son el MISMO
         * método con parámetros distintos. Un modelo que aprende `#jugar` juega
         * al ajedrez, al go y a las cartas; uno que aprende `a2a3` aprende una
         * ficha suelta que no le sirve para nada más.
         */
        affordances() {
            this._asegurarPartida();
            const e = this._estado();
            // Aquí no hay traducción que hacer: lo que el juego declara legal es
            // exactamente lo que se puede pedir.
            return (e.legal_moves ?? []).map(j => {
                const crudo = String(j);
                const { metodo, params } = partir(crudo);
                /**
                 * Si lo que queda como «método» no es una palabra —`a2a3`, `D_7`,
                 * `0`—, entonces el juego no nombró ningún verbo: nombró una
                 * jugada. El método es `jugar` y eso es el parámetro.
                 */
                const esPalabra = /^[a-záéíóúñ][a-záéíóúñ_]*$/i.test(metodo);
                return {
                    verb: crudo,
                    args: {},
                    label: crudo,
                    action: j,
                    metodo: esPalabra ? metodo : 'jugar',
                    params: esPalabra ? params : [crudo],
                };
            });
        }

        getScore() {
            const e = this._estado();
            return {
                score: this._puntosDe(e),
                metrics: {
                    jugadas: this.jugadas.length,
                    ilegales: this.ilegales,
                    terminada: !!e.is_game_over,
                },
            };
        }

        /**
         * EL RECIBO. Misma forma que la partida de una persona, así que lo
         * verifica el mismo `Verificador.js` y puntúa en la misma tabla.
         *
         * Comprobado con partidas de máquina: blackjack, póker, ajedrez y damas
         * salen `valida: true`, y a las cuatro se les caza inflarse los puntos.
         *
         * ⚠️ MATIZ, porque «cazamos al que cambia la semilla» no es cierto en
         * todos: en **ajedrez y damas cambiar la semilla no invalida nada**, y
         * está bien que así sea — son deterministas, la semilla no interviene en
         * la partida. Ahí lo que autentica es la secuencia de jugadas, no la
         * semilla. En blackjack y póker sí, porque la semilla ES el mazo: con
         * otra, la décima jugada se vuelve ilegal y salta.
         */
        /**
         * ⚠️ Y DESDE QUÉ SILLA SE PUNTUÓ, QUE FALTABA Y COSTABA LA MITAD DE LOS RECIBOS.
         * ═══════════════════════════════════════════════════════════════════════
         *
         * `puntos` sale de `_estado()`, que mira desde TU silla. El verificador
         * re-simulaba y leía la puntuación desde la silla 0 — porque no sabía que
         * había otra—, así que toda partida jugada fuera de la 0 salía «la puntuación
         * no cuadra». Medido: remigio 12/12 en la silla 0 y 0/12 en la 1; brisca
         * 12/12, 1/12, 0/12, 0/12. Y los números que no cuadraban eran literalmente
         * los de las dos sillas: «dice −3, sale 103».
         *
         * ⚠️ Lo peor no es el fallo, es cómo se veía: con la silla rotando por semilla,
         * el contador de la tabla ponía `100/200` — exactamente la mitad— y eso se lee
         * como un número normal, no como «la mitad de mis filas no verifican». En un
         * banco cuya frase es «lo que no verifica, no puntúa», media tabla estaba
         * apoyada en nada. Salió al hacer que cada semilla se jugara en TODAS las
         * sillas: el contador se desplomó a `1/500` y ahí ya no se podía leer bien.
         *
         * Va en el recibo y no se deduce: quien verifica sólo tiene el recibo delante.
         */
        partida() {
            const e = this._estado();
            return {
                juego,
                semilla: this.seed,
                jugadas: [...this.jugadas],
                puntos: this._puntosDe(e),
                // ⚠️ `asientoReal` y no `asiento`. Son dos cosas distintas y me costó
                // una pasada: `asiento` es lo que pide quien llama —«que la casa juegue
                // n turnos antes de que me siente»— y `asientoReal` es la silla que
                // resulta, envuelta sobre las que el juego tiene de verdad. `_estado()`
                // mira desde `asientoReal`, así que es ésa la que hay que guardar.
                // Guardando la otra, siete juegos seguían sin verificar fuera de la 0.
                asiento: this.asientoReal ?? 0,
                terminada: !!e.is_game_over,
                reproducible: true,
            };
        }
    };
}

// `ProtoHubEnvMeta` vivía aquí y se ha ido con la descripción a
// `protohub/descripcion.js`, donde se llama `nombreLegible`. Se borra en vez de
// dejarla: una función muerta con nombre sensato es una invitación a que alguien
// la use y vuelva a haber dos verdades sobre el mismo texto.
