import { mulberry32 } from '../core/DeterministicScope.js';
import { BallisticSystem } from './BallisticSystem.js';
import { ScrollTrackSystem } from './ScrollTrackSystem.js';
import { Hitbox } from './HitboxSystem.js';
import { SpawnWaveSystem } from './SpawnWaveSystem.js';

/**
 * FlappyCore — UN SOLO BOTÓN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Caes siempre. Al pulsar subes. Entre medias hay muros con un hueco, y el
 * hueco cambia de sitio. Pasar uno suma; tocar cualquier cosa acaba.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTE FICHERO NO TIENE FÍSICA. NI UNA CUENTA. Y ÉSA ES LA DEMOSTRACIÓN.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es la tesis de la consola puesta a prueba con un juego que todo el mundo sabe
 * de memoria: si «un juego es una lista de piezas y los números con los que se
 * las llama» es verdad, un flappy tiene que salir sin escribir motor.
 *
 *     caer y saltar        → `BallisticSystem`
 *     el mundo que avanza  → `ScrollTrackSystem`
 *     los muros que llegan → `SpawnWaveSystem`
 *     tocar y pasar        → `Hitbox`
 *
 * Lo único que hay aquí es el CARTUCHO —qué piezas, con qué números— y el
 * pegamento: en qué orden corren y qué significa que algo toque a algo.
 *
 * ⚠️ Y DOS DE ESAS CUATRO SALIERON DE PEDRISCO EL MISMO DÍA.
 *
 * `Hitbox` y `ScrollTrackSystem` estaban escritas dentro de ¡Esquiva! 1 y se
 * sacaron con su huella `fd061509` sin moverse un bit. O sea que este juego no
 * es primo del otro por parecido: **corre literalmente sus piezas**. Que dos
 * juegos tan distintos compartan la vía y los choques es lo que separa una
 * consola de una carpeta con juegos dentro.
 *
 * ⚠️ Y LO QUE MIDE, QUE ES POR LO QUE ENTRA EN EL BANCO.
 *
 * Los doce entornos de la casa miden búsqueda, deducción o administración de un
 * recurso. Ninguno mide TIEMPO DE REACCIÓN bajo un modelo físico. Éste no tiene
 * nada que deducir —se ve todo— y su espacio de acciones es el más pequeño que
 * existe: dos. Lo único difícil es cuándo.
 *
 * Aviso honesto que va también en su entorno: una política de lenguaje decidiendo
 * a 60 Hz no va a jugar a esto. Es un banco de reflejos, y eso es una propiedad,
 * no un defecto — el banco necesita al menos uno donde el reflejo mande.
 */

/** Los verbos. Dos. */
export const VERBS_FLAPPY = ['nada', 'aletear'];

export class FlappyCore {
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CARTUCHO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * ⚠️ LOS NÚMEROS ESTÁN CALIBRADOS, NO ELEGIDOS. Ver el comentario de
     * `mundo`, que cuenta el barrido.
     */
    static ROM = {
        id: 'alisa/Flappy-v0',
        familia: 'tiempo_real',
        verbos: VERBS_FLAPPY,

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  EL PRESUPUESTO — MEDIDO, Y CON UNA LECCIÓN DENTRO
         * ═══════════════════════════════════════════════════════════════════
         *
         * Barrido de hueco × separación, 40 semillas, tres pilotos. El de arriba
         * conoce su propia física; el del medio apunta al centro del hueco; el de
         * abajo se mantiene a media altura sin mirar nada:
         *
         *     hueco  cada   centrado  aguanta   apunta   vuela
         *         6  1,75      61,8      88%      47,1     0,6
         *      →  5  1,75      42,3      35%       0,9     0,4
         *         5  2,25      52,0     100%       1,1     0,4
         *         4  1,75       9,5       0%       0,4     0,2
         *
         * Se elige hueco 5. Con 6 el piloto competente aguanta la partida entera
         * el 88% de las veces y eso ya no deja sitio por encima; con 4 no aguanta
         * ninguna. Con 5 pasa 42 muros de los 68 que caben en el tope: hay
         * margen para uno mejor.
         *
         * ⚠️ Y LA PRIMERA VEZ QUE HICE ESTE BARRIDO ME SALIÓ UN PRECIPICIO QUE NO
         *    ERA DEL JUEGO: ERA DE MI PILOTO.
         *
         * De hueco 6 a hueco 5 la nota caía de 39,9 muros a 0,7, y eso no es una
         * curva de dificultad, es un muro. El motivo: **un aleteo sube siempre lo
         * mismo** —`impulso² / 2g` = 2,40— así que quien apunta al CENTRO del
         * hueco se sale por arriba justo esa cantidad. Con hueco 6 cabe por los
         * pelos; con 5 no cabe.
         *
         * O sea que hueco 5 no era imposible: exigía apuntar medio aleteo por
         * debajo. Calibrar contra el piloto malo habría dejado el juego en 6 —
         * fácil— para tapar que mi baseline no sabía volar. Es la misma trampa de
         * los detectores que acusan a código sano, sólo que del otro lado.
         *
         * ⚠️ Y LA GRAVEDAD VA AL REVÉS DE LO QUE PARECE. Con el mismo aleteo de
         * 2,40, más gravedad es MÁS FÁCIL (-50 → 61 muros, 88%) y menos gravedad
         * es más difícil (-24 → 18,5 muros, 3%): cuanto más rápido oscilas, más
         * veces corriges en el mismo trozo de pasillo. -38 deja el punto medio.
         */
        mundo: {
            alto: 24,          // del suelo al techo
            hueco: 5.0,        // lo que mide el paso de un muro
            tope: 120,         // segundos de partida — caben 68 muros
        },

        sistemas: [
            /**
             * La gravedad y el aleteo. `velMax` no es adorno: sin tope de caída,
             * a los tres segundos bajas tan rápido que ya no se puede corregir y
             * la partida se decide antes de que la persona vea qué pasó.
             */
            ['BallisticSystem', { gravedad: -38, velMax: 26, impulso: 13.5 }],
            /**
             * La vía. `visible` es dónde nace un muro —fuera de la pantalla, para
             * que nadie aparezca encima— y `cola` cuánto se conserva detrás.
             */
            ['ScrollTrackSystem', { velocidad: 14, visible: 34, cola: 8, eje: 'x' }],
            /**
             * Los muros, como una oleada infinita. Es la misma pieza que lleva el
             * calendario de ¡Defiende!, con una sola entrada que nunca acaba:
             * cada `cada` segundos, uno.
             */
            ['SpawnWaveSystem', { oleadas: [{ n: 1, dura: Infinity, cada: 1.75, mezcla: { muro: 1.0 } }] }],
            /**
             * Los choques. El pájaro es una esfera pequeña; los muros son cajas
             * infinitas hacia el fondo, que es lo que hace falta en un juego de
             * perfil. Y `roza` es lo que ya hacía Pedrisco con su graze: la banda
             * de fuera no mata, puntúa.
             */
            ['Hitbox', { radioPajaro: 0.6, anchoMuro: 2.2 }],
        ],

        voz: {
            jugador: 'pajaro',
            texto: {
                empieza: 'Un botón. Cae siempre.',
                pierde: 'Te lo comiste.',
            },
        },

        hud: {
            titulo: '¡Aletea!', subtitulo: 'Un botón', acento: '#ffd166',
            mandos: 'ESPACIO o clic: aletear · eso es todo',
            filas: [
                { etiqueta: 'Muros pasados', campo: 'pasados' },
                { etiqueta: 'Altura', campo: 'altura', de: 'alto' },
                { etiqueta: 'Aguantas', campo: 't', de: 'tope' },
            ],
        },

        cartel: {
            titulo: '¡Aletea! — un botón',
            parrafos: [
                'Caes siempre. Al pulsar, subes de golpe. No hay nada más.',
                'Aporrear no sirve: cada aleteo vale lo mismo y lo único que decide '
                + 'es cuándo.',
            ],
            ajustes: [
                { clave: 'seed', etiqueta: 'Semilla', valor: 42 },
                { clave: 'hueco', etiqueta: 'Hueco', valor: 5, min: 3, max: 12 },
            ],
            boton: '▶ VOLAR',
            final: {
                gana: 'Aguantaste', pierde: 'Te lo comiste',
                /** Sin «{n} muros» a secas: con uno decía «1 muros». */
                detalleGana: 'Muros pasados: {pasados}, en {t} segundos.',
                detallePierde: 'Muros pasados: {pasados}. Te fuiste {motivo}.',
            },
        },
    };

    /** Los números con los que este cartucho llama a una pieza. */
    static params(pieza) {
        return FlappyCore.ROM.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor(cfg = {}) {
        const R = FlappyCore.ROM;
        const m = { ...R.mundo, ...cfg };
        this.alto = m.alto;
        this.hueco = m.hueco;
        this.tope = m.tope;

        const pb = FlappyCore.params('BallisticSystem');
        this.caida = new BallisticSystem(pb);
        this.fuerzaAleteo = pb.impulso;

        this.via = new ScrollTrackSystem(FlappyCore.params('ScrollTrackSystem'));
        this.muros = new SpawnWaveSystem(FlappyCore.params('SpawnWaveSystem'));
        this.choque = FlappyCore.params('Hitbox');

        this.reset(cfg.seed ?? 42);
    }

    reset(semilla = 42) {
        this._rnd = mulberry32(semilla >>> 0);
        this.semilla = semilla >>> 0;
        this.t = 0;
        this.pasados = 0;
        this.estado = { terminado: false, ganado: false, motivo: null };

        this.via.reset(0);
        this.muros.reset?.();

        /**
         * El pájaro vuela siempre en el mismo sitio y lo que se mueve es el
         * mundo — que es como está hecho el original y como está hecho Pedrisco.
         * Su `x` es la de la vía; lo suyo es la altura.
         */
        /**
         * ⚠️ LA ALTURA DE ENTRADA VA SEMBRADA, Y SIN ESO LA SEMILLA NO SE NOTA.
         *
         * Empezando siempre a media altura, dos partidas con semillas distintas
         * eran IDÉNTICAS durante el primer segundo y tres cuartos —lo que tarda
         * en llegar el primer muro—, y lo único que cambiaba después era dónde
         * caía el hueco. `prueba_semillas` lo cazó con la misma frase con la que
         * cazó al satélite de ¡Busca! 5 y al edificio a oscuras: desde fuera, las
         * dos partidas empezaban siendo la misma.
         *
         * El margen de un cuarto por cada lado es para que ninguna semilla te
         * deje entrando pegado al suelo, que sería perder por el reparto y no
         * por jugar mal.
         */
        const margen = this.alto * 0.25;
        this.pajaro = {
            x: 0, y: margen + this._rnd() * (this.alto - margen * 2),
            vy: 0, radius: this.choque.radioPajaro,
        };
        this.paredes = [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  EL PASO
    // ═══════════════════════════════════════════════════════════════════════

    aletear() {
        if (this.estado.terminado) return false;
        this.caida.impulso(this.pajaro, this.fuerzaAleteo);
        return true;
    }

    tick(dt = 1 / 60, pulsa = false) {
        if (this.estado.terminado) return;
        if (pulsa) this.aletear();
        this.t += dt;

        this.caida.caer(this.pajaro, dt);
        this.via.avanzar(dt);
        /**
         * El pájaro va montado en la vía: su `x` ES el recorrido. Es lo mismo que
         * hace la nave de Pedrisco (`ship.z = globalZ`), y es lo que permite que
         * los muros tengan posición absoluta y `quedaAtras` funcione sin restas
         * por ninguna parte.
         *
         * En pantalla no se mueve —el sustrato lo publica relativo— que es como
         * se ve el original: parece que vuela y en realidad viene el mundo.
         */
        this.pajaro.x = this.via.recorrido;

        /**
         * ⚠️ EL RELOJ DE MUROS ES EL CALENDARIO DE ¡DEFIENDE!, SIN TOCARLO.
         *
         * `SpawnWaveSystem` reparte una tabla de oleadas por tiempo; aquí la
         * tabla tiene una entrada que no acaba nunca. Que la misma pieza sirva
         * para «cinco oleadas de bichos» y para «un muro cada segundo y tres
         * cuartos» es exactamente lo que se le pedía cuando se sacó.
         */
        this.muros.tick(dt, this._rnd, () => this._soltarMuro());

        for (const p of this.paredes) {
            if (p.pasado || p.x > this.pajaro.x) continue;
            p.pasado = true;
            this.pasados++;
        }
        this.paredes = this.paredes.filter((p) => !this.via.quedaAtras(p));

        this._mirarChoques();
        if (!this.estado.terminado && this.t >= this.tope) this._acabar(true, 'aguantaste');
    }

    step(accion = 0, dt = 1 / 60) {
        const antes = this.pasados;
        this.tick(dt, VERBS_FLAPPY[accion] === 'aletear');
        return {
            obs: this.observacion(),
            reward: this.pasados > antes ? 1 : (this.estado.terminado && !this.estado.ganado ? -1 : 0),
            done: this.estado.terminado,
            info: this.info(),
        };
    }

    /**
     * Un muro es DOS cajas con un hueco entre medias, y sale entero de una
     * tirada: dónde cae el centro del paso. El hueco no se pega ni al suelo ni
     * al techo —`margen`— porque un paso pegado a un borde no se puede cruzar
     * con esta gravedad, y una partida que se pierde por un reparto imposible no
     * mide a nadie: mide a la semilla.
     */
    _soltarMuro() {
        const margen = this.hueco * 0.75 + 1;
        const centro = margen + this._rnd() * (this.alto - margen * 2);
        this.paredes.push({
            x: this.via.frente(),
            centro,
            hueco: this.hueco,
            pasado: false,
        });
    }

    /**
     * ⚠️ EL SUELO Y EL TECHO SON PAREDES TAMBIÉN, Y NO SE TRATAN APARTE.
     *
     * La tentación era `if (y < 0 || y > alto) morir` en dos líneas. Pero
     * entonces el juego tendría dos maneras distintas de matarte y sólo una
     * pasaría por la pieza de choques — y el día que se afine el radio del
     * pájaro, una de las dos se quedaría atrás.
     */
    _mirarChoques() {
        const p = this.pajaro;
        if (p.y - p.radius <= 0) return this._acabar(false, 'al suelo');
        if (p.y + p.radius >= this.alto) return this._acabar(false, 'contra el techo');

        for (const m of this.paredes) {
            const caja = { x: m.x, ancho: this.choque.anchoMuro };
            if (!Hitbox.tocaCaja({ x: p.x, radius: p.radius }, caja)) continue;
            const dentroDelPaso = p.y - p.radius > m.centro - m.hueco / 2
                && p.y + p.radius < m.centro + m.hueco / 2;
            if (!dentroDelPaso) return this._acabar(false, 'contra un muro');
        }
    }

    _acabar(ganado, motivo) {
        this.estado = { terminado: true, ganado, motivo };
    }

    terminado() { return this.estado.terminado; }

    // ═══════════════════════════════════════════════════════════════════════
    //  LAS DOS PUERTAS
    // ═══════════════════════════════════════════════════════════════════════

    /** El muro que viene, que es lo único que hay que mirar. */
    _siguiente() {
        let mejor = null;
        for (const m of this.paredes) {
            if (m.x + this.choque.anchoMuro / 2 < this.pajaro.x) continue;
            if (!mejor || m.x < mejor.x) mejor = m;
        }
        return mejor;
    }

    observacion() {
        const m = this._siguiente();
        const p = this.pajaro;
        return [
            p.y / this.alto,
            p.vy / (this.caida.velMax || 1),
            m ? (m.x - p.x) / this.via.visible : 1,
            m ? (m.centro - p.y) / this.alto : 0,
            m ? m.hueco / this.alto : 1,
            (this.tope - this.t) / this.tope,
        ];
    }

    sustrato() {
        const piezas = [];
        for (const m of this.paredes) {
            /**
             * Cada muro son dos piezas —abajo y arriba— con su `alto` real, para
             * que quien dibuje no tenga que saber dónde está el hueco: le basta
             * con poner una caja donde se le dice y del tamaño que se le dice.
             */
            const bajo = m.centro - m.hueco / 2;
            const alto = this.alto - (m.centro + m.hueco / 2);
            piezas.push({
                t: m.pasado ? 'muro_pasado' : 'muro', x: m.x - this.via.recorrido, y: 0,
                alto: bajo / 2, de: 0, cajon: `muro_b_${Math.round(m.x * 100)}`,
                ancho: this.choque.anchoMuro, largo: bajo,
            });
            piezas.push({
                t: m.pasado ? 'muro_pasado' : 'muro', x: m.x - this.via.recorrido, y: 0,
                alto: this.alto - alto / 2, de: 0, cajon: `muro_a_${Math.round(m.x * 100)}`,
                ancho: this.choque.anchoMuro, largo: alto,
            });
        }
        /**
         * ⚠️ EL SUELO Y EL TECHO SON PIEZA, NO DECORADO — Y ESO SE APRENDIÓ CARO.
         *
         * Matan igual que un muro, y en la primera versión no salían por ninguna
         * parte: la pantalla enseñaba muros flotando en la nada y quien jugaba no
         * sabía dónde estaba el borde hasta que se lo comía. Es exactamente lo que
         * le pasaba a la torre de ¡Busca! 7 —«el agente tampoco sabía que hay un
         * volumen macizo en medio»— y la regla que salió de allí vale aquí:
         *
         *     si una regla mata, tiene que estar en el sustrato.
         */
        piezas.push({
            t: 'marco', x: 0, y: 0, alto: 0, de: 0, cajon: 'marco',
            ancho: this.via.visible, largo: this.alto,
        });
        piezas.push({
            t: 'pajaro', x: this.pajaro.x - this.via.recorrido, y: 0, alto: this.pajaro.y,
            de: 1, cajon: 'pajaro', alcance: this.pajaro.radius, vy: this.pajaro.vy,
        });
        return {
            piezas,
            zonas: [],
            limite: { forma: 'caja', ancho: this.via.visible, alto: this.alto, largo: 4 },
            leyenda: {
                muro: 'muro: por el hueco', muro_pasado: 'ya lo pasaste',
                pajaro: 'tú, cayendo', marco: 'el suelo y el techo: también matan',
            },
            simbolos: { muro: '#', muro_pasado: '.', pajaro: '@', marco: '=' },
        };
    }

    info() {
        const m = this._siguiente();
        return {
            pasados: this.pasados,
            altura: Math.round(this.pajaro.y * 10) / 10,
            alto: this.alto,
            subiendo: this.pajaro.vy > 0,
            hueco: m ? Math.round((m.centro - this.pajaro.y) * 10) / 10 : null,
            lejos: m ? Math.round((m.x - this.pajaro.x) * 10) / 10 : null,
            t: Math.round(this.t * 10) / 10,
            tope: this.tope,
            terminado: this.estado.terminado,
            ganado: this.estado.ganado,
            motivo: this.estado.motivo,
        };
    }
}

export default FlappyCore;
