import { mulberry32 } from '../core/DeterministicScope.js';
import { ECSWorld } from '../OverworldECS.js';
import { EnergySystem, EnergyComponent } from './EnergySystem.js';
import { ElevatorSystem, ElevatorComponent } from './ElevatorSystem.js';
import { HidingSpotSystem, HidingSpotComponent } from './HidingSpotSystem.js';
import { LinearNavAgentSystem, LinearNavAgentComponent } from './LinearNavAgentSystem.js';
import { FlashlightSystem } from './FlashlightSystem.js';
import { LightFixtureSystem } from './LightFixtureSystem.js';

/**
 * CorpStealthCore — BUSCAR A OSCURAS, CON LA PILA CORRIENDO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Recorres los pasillos de un edificio apagado buscando al mapache. Llevas una
 * linterna que gasta pila, hay bombillas de rellano que dan trece segundos de
 * luz cuando les das al interruptor, y hay pilas sueltas por las plantas. Sólo
 * puedes registrar lo que estés alumbrando.
 *
 * Y si te quedas a oscuras, algo se te acerca.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ DE DÓNDE SALE, Y QUÉ **NO** ES — ESTO HAY QUE LEERLO ANTES DE USARLO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sale de `games/croupier_corporate_building.html`, 2.464 líneas donde este
 * juego estaba escrito entero dentro de la página: la pila, los minuteros, el
 * ascensor, los escondites y el fantasma, todo mezclado con las mallas.
 *
 * **Este núcleo no es esa página.** Aquella genera su edificio dentro de
 * `ProceduralBuildingFactory`, y allí las cuentas del plano —dónde cae cada
 * puerta, cada escondite, cada pila— están trenzadas con la construcción de las
 * mallas a lo largo de seiscientas líneas. Sacarlas de ahí sin una huella que
 * proteja la página sería refactorizar por fe, que es justo lo que este banco
 * existe para no hacer.
 *
 * Así que aquí hay un cartucho NUEVO, con su plano declarado y su propia huella,
 * y aquella página se queda como está hasta que se pueda demostrar que juegan a
 * lo mismo. Decir lo contrario sería repetir la avería de ¡Busca!: la persona y
 * el agente jugando dos juegos con el mismo nombre durante semanas.
 *
 * ⚠️ ESTE CARTUCHO SÍ TIENE SUS DOS PUERTAS, Y SON EL MISMO OBJETO.
 *
 * `games/corp_sigilo.html` importa esta clase —la misma que instancia
 * `CorpStealthEnv`— y le pasa teclas. No es una versión para personas: es la
 * partida que mide el banco, con un dibujo delante. Cincuenta y seis líneas
 * propias frente a las 2.464 de la otra, y no porque se haya recortado nada,
 * sino porque cuando las piezas existen no hace falta más.
 *
 * LO QUE SÍ COMPARTE, Y ES LO QUE IMPORTA
 *
 * Los números de la página —pila de 100, gasto 1,5/s, minutero de 13 s, pila
 * suelta que da 60, planta de 5 de alto, pasillo de 28, velocidad 12— y, sobre
 * todo, **las piezas**: linterna, bombillas, pila, ascensor y escondites son
 * cinco sistemas independientes que ya existían sueltos. Este fichero no
 * implementa ninguno: los compone y les pone números.
 *
 * Ésa es la tesis entera. Si hace falta escribir la física otra vez para hacer
 * un juego, las piezas no valían.
 *
 * ⚠️ Y LA OSCURIDAD NO MATA DE GOLPE, QUE ES UN CAMBIO DELIBERADO.
 *
 * En la página, pila a cero era susto y final: una partida se acababa sin que
 * pudieras hacer nada al respecto. Aquí la oscuridad llena un contador y las
 * bombillas de rellano lo vacían, porque `LightFixtureSystem` distingue
 * ALUMBRAR de PROTEGER —`seguro` es parámetro por bombilla— y sin algo que
 * proteja esa distinción no serviría para nada. Con contador, quedarte sin pila
 * es una carrera hasta el interruptor más cercano; sin él, era una pantalla
 * negra.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Los verbos, en el orden que espera `step(accion)`. */
export const VERBS_STEALTH = [
    'nada', 'izquierda', 'derecha',
    'subir', 'bajar',
    'linterna', 'pulsar', 'buscar',
];

export class CorpStealthCore {
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CARTUCHO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Cinco piezas y sus números. Ninguna se implementa aquí: `EnergySystem`,
     * `ElevatorSystem` y `HidingSpotSystem` son sistemas ECS que ya movían esta
     * misma página; `FlashlightSystem` y `LightFixtureSystem` se sacaron de ella
     * el 26-08 con sus pruebas propias.
     *
     * ⚠️ `TimedRelaySystem` NO ESTÁ, Y NO ES UN OLVIDO.
     *
     * Es la pieza con la que la página llevaba los minuteros de rellano: un
     * temporizador que se apaga y avisa. `LightFixtureSystem` hace eso Y ADEMÁS
     * sabe dónde está la bombilla, a dónde llega y si protege — que es lo que
     * este juego necesita para que apagarse signifique algo. Declarar las dos
     * sería tener dos relojes para la misma luz, y el martes uno se atrasa.
     * `TimedRelaySystem` sigue donde estaba para quien sólo necesite el reloj.
     */
    static ROM = {
        id: 'alisa/CorpStealth-v0',
        familia: 'tiempo_real',
        verbos: VERBS_STEALTH,
        /**
         * ═══════════════════════════════════════════════════════════════════
         *  EL PRESUPUESTO — MEDIDO, NO ELEGIDO
         * ═══════════════════════════════════════════════════════════════════
         *
         * Los números de la pila son los de la página y no se tocan: 100 de
         * carga, 1,5 por segundo, 60 por pila suelta. La palanca es el TAMAÑO
         * DEL EDIFICIO, que además es la que la propia página le ofrece a la
         * persona — su deslizador va de 3 a 12 plantas.
         *
         * Barrido, 40 semillas, tres pilotos (un piloto competente, uno que
         * registra sin mirar la luz, y uno al azar):
         *
         *     plantas × muebles   sueltas   bueno   tonto
         *            6 ×  4  = 24       3    100%     15%
         *            9 ×  4  = 36       3     98%     13%
         *            9 ×  6  = 54       3     95%     13%
         *         →  9 ×  6  = 54       1     68%     13%
         *           12 ×  6  = 72       3     70%     10%
         *           12 ×  6  = 72       1     38%     10%
         *
         * Se elige 9 × 6 con una pila suelta. Confirmado con 60 semillas:
         *
         *     bueno  45%  ·  18,7 registros  ·  pierde 33 veces por el reloj
         *     tonto   7%  ·   2,0 registros  ·  pierde 56 veces a oscuras
         *     azar   17%  ·   3,5 registros  ·  pierde 43 veces a oscuras
         *
         * ⚠️ ERA 68% Y BAJÓ A 45% AL SEMBRAR POR DÓNDE ENTRAS, Y NO ES QUE SE
         * DESCALIBRARA: ES QUE ANTES SE ESTABA MIDIENDO OTRO JUEGO.
         *
         * Con la entrada siempre en la escalera de la planta baja, «barrer desde
         * donde estoy» era una apertura que valía en todas las partidas. Con la
         * entrada sembrada hay que decidir hacia dónde tirar, y eso es
         * precisamente lo que el entorno quiere medir. Los números de arriba son
         * los de después; el barrido de la tabla es de antes y se deja porque
         * explica la FORMA —más edificio, menos victorias—, que sigue valiendo.
         *
         * Lo que hace que valga: el descuidado muere en la oscuridad casi
         * siempre y el cuidadoso NUNCA — o sea que la regla del fantasma no es
         * un adorno, distingue. Y el que juega bien pierde una de cada tres, así
         * que queda sitio por encima para uno mejor. Un entorno donde el piloto
         * decente gana el 100% no mide a nadie: es la lección que ¡Busca! 6
         * lleva escrita en su comentario del combustible.
         */
        mundo: {
            plantas: 9,
            largo: 28,          // el pasillo, de -14 a +14
            altoPlanta: 5.0,
            escondites: 6,      // por planta
            pilas: 1,           // sueltas por el edificio
            tope: 300,          // segundos de partida
            /**
             * Cuánta oscuridad aguantas seguida antes de que te alcancen. Tres
             * segundos es poco de leer y mucho de jugar: da para cruzar medio
             * pasillo hasta un interruptor, no para cruzar el edificio.
             */
            aguantaOscuridad: 3.0,
        },
        /**
         * ⚠️ `tiempoRegistro` NO ES AMBIENTACIÓN: ES LO QUE HACE QUE HAYA JUEGO.
         *
         * Sin él, abrir un mueble costaba un fotograma. Medido con un piloto
         * competente y sesenta semillas: **la partida entera duraba 7,6
         * segundos** —doce registros— con una pila de sesenta y seis segundos y
         * un tope de ciento ochenta. O sea que ni la pila ni el reloj ni las
         * bombillas decidían nada: sobraba de todo por un factor de diez, y el
         * piloto bueno ganaba el 100% de las veces.
         *
         * Un entorno que se resuelve antes de que empiece a apretar el
         * presupuesto no mide a nadie. Con dos segundos por mueble, registrar
         * los veinticuatro cuesta más luz de la que cabe en la pila, y entonces
         * las tres preguntas del juego —¿enciendo?, ¿voy a por la pila?, ¿me
         * conformo con lo que alumbra el rellano?— pasan a tener respuesta
         * distinta según la partida.
         *
         * Y encaja con lo que la página ya enseñaba: allí el mueble se sacude
         * durante un rato antes de decir si hay algo. El tiempo estaba dibujado
         * y no cobrado.
         */
        jugador: { velocidad: 12.0, alcanceBrazo: 2.0, tiempoRegistro: 2.0 },
        sistemas: [
            ['EnergySystem', { maxEnergy: 100, currentEnergy: 100, drainRate: 1.5, hasDevice: true, isOn: true }],
            ['FlashlightSystem', { alcance: 8, angulo: 0.6, piel: 'linterna' }],
            /**
             * `seguro: true` en las bombillas de rellano y en la del ascensor:
             * en este juego la luz no sólo deja ver, también aparta a lo que te
             * sigue. Es el parámetro por el que existe ese sistema.
             */
            ['LightFixtureSystem', { radio: 4.5, minutero: 13.0, seguro: true, piel: 'bombilla' }],
            ['ElevatorSystem', { speed: 12.0, floorHeight: 5.0, luz: 3.0 }],
            ['HidingSpotSystem', {}],
            /**
             * ⚠️ ANDAR TAMPOCO SE ESCRIBE AQUÍ, Y ESO COSTÓ UN TECHO ROTO.
             *
             * La primera versión de este núcleo llevaba su `x -= velocidad * dt`
             * dentro. `npm run sistemas` lo cazó al instante: el techo de
             * integradores subió de 22 a 23. Un juego nuevo que se escribe su
             * propio movimiento teniendo átomos al lado es exactamente lo que esa
             * vara existe para impedir, y subirla «porque el juego es nuevo» es
             * el atajo que la convierte en adorno.
             *
             * Y la pieza correcta no había que buscarla: **es la que la propia
             * página usa para su jugador**. `LinearNavAgentSystem` mueve un punto
             * hacia un objetivo a una velocidad y avisa al llegar; andar por un
             * pasillo es poner el objetivo en la punta hacia la que miras y
             * quitarlo al soltar la tecla.
             *
             * `KinematicControllerSystem` parecía el candidato —está declarado
             * como átomo de andar— pero pide una malla de THREE y ni siquiera
             * trae implementado su modo `FPS_WALK`. Un átomo que no se puede
             * llamar sin navegador no sirve para un núcleo sin pantalla.
             */
            ['LinearNavAgentSystem', { arrivalRadius: 0.05 }],
        ],
        /** Las pilas del suelo no son un sistema: son un objeto con dos números. */
        pilas: { da: 60, radio: 1.5 },
        voz: {
            jugador: 'tu',
            texto: {
                empieza: 'Nueve plantas a oscuras. El mapache está en un mueble.',
                pierde: 'Te alcanzaron en la oscuridad.',
                gana: '¡Ahí estaba!',
            },
        },
        /**
         * ⚠️ EL HUD Y LAS CARTELAS ENTRARON DESPUÉS, CUANDO HUBO QUIEN LOS LEYERA.
         *
         * Este cartucho nació sin ellos a propósito y con el motivo escrito:
         * declarar un HUD que ninguna página pinta es una tabla que no manda
         * sobre nada, y una tabla que no manda se desincroniza el martes. Ahora
         * `games/corp_sigilo.html` los lee, así que ya tienen dueño.
         */
        hud: {
            titulo: 'A oscuras', subtitulo: 'Corp Building', acento: '#ffd166',
            mandos: 'A/D: andar · W/S: subir y bajar (escalera o ascensor) · '
                  + 'F: linterna · E: interruptor · ESPACIO: registrar el mueble',
            filas: [
                { etiqueta: 'Planta', campo: 'planta', de: 'plantas' },
                { etiqueta: 'Pila', campo: 'pila', barra: true, de: 'pilaLlena' },
                { etiqueta: 'Muebles', campo: 'registros', de: 'muebles' },
                { etiqueta: 'A oscuras', campo: 'oscuridad', de: 'aguantaOscuridad' },
            ],
        },
        cartel: {
            titulo: 'A oscuras — Corp Building',
            parrafos: [
                'El mapache está escondido en uno de los muebles del edificio, y el '
                + 'edificio está apagado.',
                'Sólo se registra lo que estés alumbrando. La linterna gasta pila; las '
                + 'bombillas de rellano dan trece segundos y además te protegen.',
                'Si te quedas sin pila y sin luz, tienes tres segundos para llegar a un '
                + 'interruptor.',
            ],
            ajustes: [
                { clave: 'seed', etiqueta: 'Semilla', valor: 42 },
                { clave: 'plantas', etiqueta: 'Plantas', valor: 9, min: 3, max: 12 },
            ],
            boton: '▶ ENTRAR',
            final: {
                gana: '¡Ahí estaba!', pierde: 'Se acabó',
                detalleGana: 'Lo encontraste en la planta {planta}, al {registros}º mueble.',
                detallePierde: 'Registraste {registros} muebles. El mapache estaba en la planta {solucion}.',
            },
        },
    };

    /** Los números con los que este cartucho llama a una pieza. */
    static params(pieza) {
        return CorpStealthCore.ROM.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor(cfg = {}) {
        const R = CorpStealthCore.ROM;
        const m = { ...R.mundo, ...cfg };
        this.plantas = m.plantas;
        this.largo = m.largo;
        this.altoPlanta = m.altoPlanta;
        this.nEscondites = m.escondites;
        this.nPilas = m.pilas;
        this.tope = m.tope;
        this.aguantaOscuridad = m.aguantaOscuridad;
        this.andar = { ...R.jugador, ...cfg.jugador };
        this.pila = { ...R.pilas, ...cfg.pilas };

        /**
         * Las dos puntas del pasillo. La escalera a la izquierda y el ascensor a
         * la derecha, como en la página: son los dos únicos sitios por donde se
         * cambia de planta, y estar lejos de los dos es parte del problema.
         */
        this.escaleraX = -this.largo / 2 + 2;
        this.ascensorX = this.largo / 2 - 2;
        /** El interruptor del rellano, junto a la escalera. */
        this.interruptorX = this.escaleraX + 3;

        this.energiaSys = new EnergySystem();
        this.ascensorSys = new ElevatorSystem();
        this.esconditeSys = new HidingSpotSystem();
        this.andarSys = new LinearNavAgentSystem();
        this.linterna = new FlashlightSystem(CorpStealthCore.params('FlashlightSystem'));
        this.bombillas = new LightFixtureSystem(CorpStealthCore.params('LightFixtureSystem'));

        this.reset(cfg.seed ?? 42);
    }

    reset(semilla = 42) {
        const rnd = mulberry32(semilla >>> 0);
        this.semilla = semilla >>> 0;
        this.t = 0;
        this.registros = 0;
        this.oscuridad = 0;
        /** Segundos que te quedan con las manos dentro de un mueble. */
        this.bloqueo = 0;
        this.estado = { terminado: false, ganado: false, motivo: null };
        this.ultimo = null;

        /**
         * ⚠️ EL MUNDO SE VUELVE A CREAR ENTERO, NO SE LIMPIA.
         *
         * Con un solo `ECSWorld` de por vida, cada `reset` añadía otras
         * veinticinco entidades encima de las de la partida anterior: los
         * sistemas seguirían recorriendo muebles de un edificio que ya no
         * existe, y la partida número diez iría diez veces más lenta buscando
         * fantasmas. Es barato de crear y caro de olvidar.
         *
         * Y el ORDEN de registro es estado, como en ¡Defiende!: la pila se gasta
         * antes de que el ascensor se mueva, y quien lea el estado a media
         * partida ve siempre la misma foto.
         */
        this.ecs = new ECSWorld();
        this.ecs.addSystem(this.andarSys.update.bind(this.andarSys), ['LinearNavAgentComponent']);
        this.ecs.addSystem(this.energiaSys.update.bind(this.energiaSys), ['EnergyComponent']);
        this.ecs.addSystem(this.ascensorSys.update.bind(this.ascensorSys), ['ElevatorComponent']);
        this.ecs.addSystem(this.esconditeSys.update.bind(this.esconditeSys), ['HidingSpotComponent']);

        // ─── la pila y la linterna ───
        this.jugadorId = this.ecs.createEntity();
        this.ecs.addComponent(this.jugadorId, 'EnergyComponent',
            EnergyComponent(CorpStealthCore.params('EnergySystem')));
        this.energia = this.ecs.getComponent(this.jugadorId, 'EnergyComponent');
        this.linterna.reset();

        // ─── el ascensor ───
        const pa = CorpStealthCore.params('ElevatorSystem');
        this.ascensorId = this.ecs.createEntity();
        this.ecs.addComponent(this.ascensorId, 'ElevatorComponent', ElevatorComponent({
            currentFloor: 0, targetFloor: -1, y: 0, moving: false,
            speed: pa.speed, floorHeight: pa.floorHeight,
            onFloorReached: (_id, planta) => {
                if (this.jugador.enAscensor) {
                    this.jugador.planta = planta;
                    this.jugador.enAscensor = false;
                    this.ultimo = 'llegas';
                }
            },
        }));
        this.ascensor = this.ecs.getComponent(this.ascensorId, 'ElevatorComponent');

        // ─── el jugador ───
        /**
         * La `x` no es un campo de este objeto: es la del agente de navegación,
         * mirada por una ventana. Así no hay dos sitios donde esté escrito dónde
         * estás — que es cómo se acaba con el dibujo en un sitio y las reglas en
         * otro, contando cosas distintas.
         */
        this.jugadorNav = this.ecs.createEntity();
        this.ecs.addComponent(this.jugadorNav, 'LinearNavAgentComponent', LinearNavAgentComponent({
            ...CorpStealthCore.params('LinearNavAgentSystem'),
            speed: this.andar.velocidad, x: this.escaleraX, z: 0,
        }));
        const nav = this.ecs.getComponent(this.jugadorNav, 'LinearNavAgentComponent');
        this.nav = nav;
        this.jugador = {
            planta: 0, mirando: 1, enAscensor: false,
            get x() { return nav.x; },
            set x(v) { nav.x = v; nav.targetX = null; },
        };

        // ─── los escondites, repartidos por el pasillo ───
        const primero = -this.largo / 2 + 6;
        const ultimo = this.largo / 2 - 6;
        const paso = this.nEscondites > 1 ? (ultimo - primero) / (this.nEscondites - 1) : 0;
        this.escondites = [];
        for (let f = 0; f < this.plantas; f++) {
            for (let i = 0; i < this.nEscondites; i++) {
                const id = this.ecs.createEntity();
                this.ecs.addComponent(id, 'HidingSpotComponent', HidingSpotComponent({
                    label: `${f + 1}${String.fromCharCode(65 + i)}`,
                }));
                this.escondites.push({ id, planta: f, i, x: primero + paso * i });
            }
        }

        /**
         * ⚠️ EL MAPACHE SE SORTEA ANTES QUE LAS PILAS, Y EL ORDEN ES ESTADO.
         *
         * Dos tiradas para el escondite y dos por pila, siempre en este orden.
         * Cambiarlo mueve el mundo entero con la misma semilla y la huella lo
         * diría — que es exactamente para lo que está.
         */
        const plantaBuena = Math.floor(rnd() * this.plantas);
        const huecoBueno = Math.floor(rnd() * this.nEscondites);
        this.mapache = this.escondites.find((e) => e.planta === plantaBuena && e.i === huecoBueno);
        this.ecs.getComponent(this.mapache.id, 'HidingSpotComponent').hasRaccoon = true;

        // ─── las pilas sueltas ───
        this.pilas = [];
        for (let i = 0; i < this.nPilas; i++) {
            this.pilas.push({
                planta: Math.floor(rnd() * this.plantas),
                x: (rnd() - 0.5) * (this.largo - 8),
                cogida: false,
            });
        }

        /**
         * ⚠️ LAS BOMBILLAS: UNA POR RELLANO Y UNA QUE VIAJA.
         *
         * La del ascensor es la última de la lista y su `y` se mueve con la
         * cabina en cada `tick`. Es lo que la convierte en un refugio que se
         * desplaza en vez de un adorno: si la cabina está en tu planta, tienes
         * un sitio seguro aunque el rellano esté apagado.
         */
        const sitios = [];
        for (let f = 0; f < this.plantas; f++) {
            sitios.push({ x: this.interruptorX, y: f * this.altoPlanta, z: 0 });
        }
        sitios.push({
            x: this.ascensorX, y: 0, z: 0,
            radio: CorpStealthCore.params('ElevatorSystem').luz,
            encendida: true, minutero: 0,
        });
        this.bombillas.sembrar(sitios);
        this.iLuzAscensor = sitios.length - 1;

        /**
         * ⚠️ Y POR DÓNDE ENTRAS TAMBIÉN VA SEMBRADO, PORQUE SI NO LA SEMILLA NO
         *    SE NOTA. LO CAZÓ `prueba_semillas` Y TENÍA RAZÓN.
         *
         * Los muebles caen siempre en los mismos sitios y siempre arrancabas en
         * la escalera de la planta baja: lo único que cambiaba con la semilla era
         * dónde se escondía el mapache, y eso el agente NO LO VE. Desde fuera,
         * dos partidas distintas empezaban siendo idénticas — que es la misma
         * avería que tenía ¡Busca! 5 con su satélite, palabra por palabra.
         *
         * Entrar por una planta cualquiera es además mejor juego: no hay una
         * apertura mecánica que valga siempre, y la distancia hasta el
         * interruptor del rellano deja de ser la misma en todas las partidas.
         */
        this.jugador.planta = Math.floor(rnd() * this.plantas);
        this.jugador.x = (rnd() - 0.5) * (this.largo - 6);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  EL PASO
    // ═══════════════════════════════════════════════════════════════════════

    /** Dónde estás, en coordenadas del mundo. */
    _donde() {
        return {
            x: this.jugador.x,
            y: this.jugador.enAscensor ? this.ascensor.y : this.jugador.planta * this.altoPlanta,
            z: 0,
        };
    }

    /**
     * La puerta de la persona: teclas mantenidas. La del agente es `step`, y las
     * dos acaban aquí para que no puedan separarse.
     */
    tick(dt = 1 / 60, mando = null) {
        if (this.estado.terminado) return;
        this.t += dt;

        /**
         * Mientras registras no andas. El reloj, la pila y los minuteros sí
         * corren — que es exactamente lo que hace que registrar cueste.
         */
        if (this.bloqueo > 0) { this.bloqueo -= dt; mando = null; }

        /**
         * ─── andar ───
         *
         * Ni una cuenta: se le dice al agente de navegación HACIA DÓNDE, y él
         * sabe andar. Soltar la tecla es quitarle el objetivo.
         */
        const borde = this.largo / 2 - 0.5;
        if (mando && !this.jugador.enAscensor && (mando.izquierda || mando.derecha)) {
            this.jugador.mirando = mando.izquierda ? -1 : 1;
            this.nav.targetX = this.jugador.mirando < 0 ? -borde : borde;
        } else {
            this.nav.targetX = null;
        }

        // ─── las piezas ───
        this.ecs.tick(dt);                       // andar, pila y ascensor
        this.linterna.tick(dt, this.energia);    // se apaga sola al agotarse
        this.bombillas.tick(dt);                 // minuteros de rellano
        // La luz del ascensor viaja con la cabina.
        this.bombillas.luces[this.iLuzAscensor].y = this.ascensor.y;
        if (this.jugador.enAscensor) this.jugador.x = this.ascensorX;

        // ─── las pilas del suelo ───
        const yo = this._donde();
        for (const p of this.pilas) {
            if (p.cogida || p.planta !== this.jugador.planta) continue;
            if (Math.abs(p.x - this.jugador.x) > this.pila.radio) continue;
            p.cogida = true;
            this.energia.currentEnergy = Math.min(
                this.energia.maxEnergy, this.energia.currentEnergy + this.pila.da);
            this.ultimo = 'pila';
        }

        // ─── la oscuridad ───
        /**
         * A salvo es: bajo una bombilla que protege, o con la linterna dada.
         * La linterna alumbra pero NO protege del todo —protege mientras dure—,
         * y por eso aquí cuenta: lo que llena el contador es quedarse sin nada.
         */
        if (this.bombillas.zonaSegura(yo) || this.linterna.encendida) {
            this.oscuridad = Math.max(0, this.oscuridad - dt * 2);
        } else {
            this.oscuridad += dt;
            if (this.oscuridad >= this.aguantaOscuridad) return this._acabar(false, 'oscuridad');
        }

        if (this.t >= this.tope) this._acabar(false, 'tiempo');
    }

    /** La puerta del agente: un verbo por paso. */
    step(accion = 0, dt = 1 / 60) {
        const verbo = this.bloqueo > 0 ? 'nada' : (VERBS_STEALTH[accion] ?? 'nada');
        const antes = this.registros;

        if (verbo === 'linterna') this.linterna.alternar(this.energia);
        else if (verbo === 'pulsar') this.pulsar();
        else if (verbo === 'buscar') this.buscar();
        else if (verbo === 'subir') this.cambiarPlanta(+1);
        else if (verbo === 'bajar') this.cambiarPlanta(-1);

        this.tick(dt, {
            izquierda: verbo === 'izquierda',
            derecha: verbo === 'derecha',
        });

        /**
         * ⚠️ REGISTRAR SUMA, NO RESTA — Y LA PRIMERA VERSIÓN LO TENÍA DEL REVÉS.
         *
         * Ponía `-0,02` por mueble abierto, copiando el «cada intento cuesta» de
         * los juegos de deducción con presupuesto de intentos. Pero aquí el
         * presupuesto no son los intentos: es la PILA, y abrir un mueble ya la
         * gasta por su cuenta. Cobrarlo dos veces dejaba a la política que
         * progresa por debajo de la que no hace nada — o sea, una nota que premia
         * quedarse quieto.
         *
         * Descartar un mueble es progreso de verdad en un juego de búsqueda: sube
         * la probabilidad de todos los demás. Así que suma poco y encontrarlo
         * suma mucho, y que te alcancen en la oscuridad resta — que es lo único
         * que de verdad no quieres que pase.
         */
        return {
            obs: this.observacion(),
            reward: this.estado.ganado ? 1
                : this.estado.motivo === 'oscuridad' ? -0.5
                    : (this.registros > antes ? 0.02 : 0),
            done: this.estado.terminado,
            info: this.info(),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  LOS VERBOS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * El interruptor del rellano, o la llamada del ascensor: depende de a cuál
     * estés más cerca. Un solo verbo para los dos porque son el mismo gesto
     * —alargar la mano a la pared— y porque en un pasillo no hay duda de cuál
     * tienes al lado.
     */
    pulsar() {
        if (this.estado.terminado) return { estado: 'nada' };
        const dInt = Math.abs(this.jugador.x - this.interruptorX);
        const dAsc = Math.abs(this.jugador.x - this.ascensorX);

        if (dInt <= this.andar.alcanceBrazo && dInt <= dAsc) {
            const encendida = this.bombillas.pulsar(this.jugador.planta);
            this.ultimo = encendida ? 'luz' : 'apagas';
            return { estado: encendida ? 'luz' : 'apagas' };
        }
        if (dAsc <= this.andar.alcanceBrazo) {
            if (this.ascensor.currentFloor === this.jugador.planta && !this.ascensor.moving) {
                this.ultimo = 'ascensor_aqui';
                return { estado: 'ascensor_aqui' };
            }
            this.ascensor.targetFloor = this.jugador.planta;
            this.ascensor.moving = true;
            this.ultimo = 'llamas';
            return { estado: 'llamas' };
        }
        return { estado: 'nada' };
    }

    /**
     * Subir o bajar. Por la escalera es inmediato; por el ascensor te lleva la
     * cabina —y con ella su luz—, que es más lento pero se hace a salvo.
     */
    cambiarPlanta(paso) {
        if (this.estado.terminado || this.jugador.enAscensor) return { estado: 'nada' };
        const destino = this.jugador.planta + paso;
        if (destino < 0 || destino >= this.plantas) return { estado: 'tope' };

        if (Math.abs(this.jugador.x - this.escaleraX) <= this.andar.alcanceBrazo) {
            this.jugador.planta = destino;
            this.ultimo = 'escaleras';
            return { estado: 'escaleras' };
        }
        if (Math.abs(this.jugador.x - this.ascensorX) <= this.andar.alcanceBrazo
            && this.ascensor.currentFloor === this.jugador.planta && !this.ascensor.moving) {
            this.jugador.enAscensor = true;
            this.ascensor.targetFloor = destino;
            this.ascensor.moving = true;
            this.ultimo = 'subes';
            return { estado: 'ascensor' };
        }
        return { estado: 'nada' };
    }

    /**
     * Registrar el mueble que tengas al lado.
     *
     * ⚠️ Y SÓLO CUENTA LO QUE ESTÉS ALUMBRANDO. ÉSA ES LA REGLA DEL JUEGO.
     *
     * Sin esto, la linterna sería un adorno con contador: se podría cruzar el
     * edificio a oscuras abriendo muebles al tacto y la pila no decidiría nada.
     * Con esto, cada registro cuesta luz, y la luz cuesta pila o cuesta ir hasta
     * el interruptor. El juego entero está en esa cadena.
     */
    buscar() {
        if (this.estado.terminado) return { estado: 'nada' };

        /**
         * ⚠️ ENTRE DOS MUEBLES SE ABRE EL QUE FALTA, NO EL QUE PILLA MÁS CERCA.
         *
         * La primera versión cogía el más cercano a secas y luego lo rechazaba
         * si ya estaba registrado. Con los muebles a 3,2 de distancia y el brazo
         * a 2, hay sitios del pasillo desde donde tienes dos al alcance: el
         * juego insistía en volver a abrir el abierto y no te dejaba tocar el
         * otro. Medido: la partida se quedaba en UN registro y se iba al tope.
         *
         * No era el piloto —al tonto le pasaba igual—, era esta línea. Y no
         * saltó con cuatro muebles por planta porque a 5,3 de separación nunca
         * hay dos al alcance: el fallo estaba, pero el tablero lo tapaba.
         */
        const alAlcance = this.escondites
            .filter((e) => e.planta === this.jugador.planta)
            .map((e) => ({ e, d: Math.abs(e.x - this.jugador.x) }))
            .filter((o) => o.d <= this.andar.alcanceBrazo)
            .sort((a, b) => a.d - b.d);
        if (!alAlcance.length) return { estado: 'nada' };

        const cerca = alAlcance.find(
            (o) => !this.ecs.getComponent(o.e.id, 'HidingSpotComponent').isSearched);
        if (!cerca) { this.ultimo = 'repetido'; return { estado: 'repetido' }; }

        const c = this.ecs.getComponent(cerca.e.id, 'HidingSpotComponent');

        const donde = { x: cerca.e.x, y: cerca.e.planta * this.altoPlanta, z: 0 };
        const yo = this._donde();
        const alumbrado = this.bombillas.alumbrado(donde)
            || this.linterna.alumbra(yo, { x: this.jugador.mirando, y: 0, z: 0 }, donde);
        /**
         * ⚠️ PALPAR A OSCURAS TAMBIÉN CUESTA, Y ESO NO ES UN DETALLE.
         *
         * Mientras fallar valía cero, un piloto que apuntaba mal se quedaba
         * pidiendo `buscar` para siempre: sin coste no hay corrección, y la
         * partida se iba al tope sin que pasara nada. Medido con seis muebles
         * por planta: 1,1 registros de media en 285 segundos.
         *
         * Un cuarto del tiempo de un registro bueno. Suficiente para que
         * insistir a ciegas se note, poco para que un tanteo honesto arruine
         * la partida.
         */
        if (!alumbrado) {
            this.bloqueo = this.andar.tiempoRegistro / 4;
            this.ultimo = 'a_oscuras';
            return { estado: 'a_oscuras' };
        }

        c.isSearched = true;
        this.registros++;
        this.bloqueo = this.andar.tiempoRegistro;
        if (c.hasRaccoon) {
            this.ultimo = 'encontrado';
            this._acabar(true, 'encontrado');
            return { estado: 'encontrado', registros: this.registros };
        }
        this.ultimo = 'vacio';
        return { estado: 'vacio', registros: this.registros };
    }

    _acabar(ganado, motivo) {
        this.estado = { terminado: true, ganado, motivo };
    }

    terminado() { return this.estado.terminado; }

    // ═══════════════════════════════════════════════════════════════════════
    //  LAS DOS PUERTAS
    // ═══════════════════════════════════════════════════════════════════════

    observacion() {
        const yo = this._donde();
        const obs = [
            this.jugador.x / (this.largo / 2),
            this.jugador.planta / Math.max(1, this.plantas - 1),
            this.jugador.mirando,
            this.energia.currentEnergy / this.energia.maxEnergy,
            this.linterna.encendida ? 1 : 0,
            this.bombillas.zonaSegura(yo) ? 1 : 0,
            this.oscuridad / this.aguantaOscuridad,
            (this.tope - this.t) / this.tope,
        ];
        /** Cuántos muebles quedan sin registrar en tu planta, y a qué distancia. */
        const mios = this.escondites.filter((e) => e.planta === this.jugador.planta);
        const sinVer = mios.filter((e) => !this.ecs.getComponent(e.id, 'HidingSpotComponent').isSearched);
        obs.push(sinVer.length / Math.max(1, this.nEscondites));
        obs.push(sinVer.length
            ? Math.min(...sinVer.map((e) => Math.abs(e.x - this.jugador.x))) / this.largo
            : 1);
        /** La pila suelta más cercana de tu planta, si queda alguna. */
        const pilas = this.pilas.filter((p) => !p.cogida && p.planta === this.jugador.planta);
        obs.push(pilas.length
            ? Math.min(...pilas.map((p) => Math.abs(p.x - this.jugador.x))) / this.largo
            : 1);
        obs.push(Math.abs(this.jugador.x - this.interruptorX) / this.largo);
        return obs;
    }

    /**
     * ⚠️ AQUÍ `y` VALE CERO EN TODO, Y NO ES UN DESCUIDO: ES UN EDIFICIO DE PERFIL.
     *
     * En el contrato del sustrato `y` es el SEGUNDO EJE DEL SUELO y `alto` es la
     * altura, y el pintor de volumen coloca en `(x, alto, y)`. La primera versión
     * de esto ponía la planta en los dos: `y: planta` **y** `alto: planta *
     * altoPlanta`. O sea que cada planta se dibujaba además cinco unidades más
     * al fondo, y nueve plantas salían en diagonal en vez de apiladas.
     *
     * Este juego pasa entero en un plano —un pasillo y nueve pisos— así que el
     * segundo eje del suelo no existe: vale cero. La planta va en `alto`, que es
     * donde el contrato dice que va la altura, y además en un campo `planta`
     * para quien la quiera como número sin dividir.
     *
     * `CorpBuildingCore` hace lo contrario y también tiene razón: allí no se
     * anda, se elige, y su vista es un TABLERO de plantas × escondites. Mismo
     * contrato, dos lecturas, porque son dos juegos.
     */
    sustrato() {
        const piezas = [];
        const aAlto = (planta) => planta * this.altoPlanta;

        for (const e of this.escondites) {
            const c = this.ecs.getComponent(e.id, 'HidingSpotComponent');
            const visto = !!c.isSearched;
            piezas.push({
                t: visto && c.hasRaccoon ? 'mapache' : visto ? 'mirado' : 'mueble',
                x: e.x, y: 0, alto: aAlto(e.planta), de: 0,
                planta: e.planta,
                cajon: `mueble_${e.planta}_${e.i}`,
                etiqueta: c.label,
            });
        }

        for (const p of this.pilas) {
            if (p.cogida) continue;
            piezas.push({
                t: 'pila', x: p.x, y: 0, alto: aAlto(p.planta), de: 9,
                planta: p.planta,
                cajon: `pila_${p.planta}_${Math.round(p.x * 100)}`,
                alcance: this.pila.radio,
            });
        }

        /**
         * Las bombillas las lleva el sistema con la altura en `y`, porque para él
         * es una coordenada más. Aquí se traduce al contrato: la altura a `alto`
         * y el suelo a cero. Es la única conversión del fichero y va escrita para
         * que nadie la deduzca del revés.
         */
        for (const l of this.bombillas.piezas({ de: 2 })) {
            piezas.push({ ...l, y: 0, alto: l.y, planta: Math.round(l.y / this.altoPlanta) });
        }

        const yo = this._donde();
        piezas.push({
            t: 'escalera', x: this.escaleraX, y: 0, alto: 0, de: 0, cajon: 'escalera',
            plantas: this.plantas, altoPlanta: this.altoPlanta, largo: this.largo,
        });
        piezas.push({
            t: 'ascensor', x: this.ascensorX, y: 0, alto: this.ascensor.y, de: 0,
            cajon: 'ascensor', moviendo: this.ascensor.moving,
            planta: this.ascensor.currentFloor,
        });
        piezas.push(this.linterna.pieza({
            x: this.jugador.x, y: 0, alto: yo.y, de: 1, cajon: 'linterna',
        }));
        piezas.push({
            t: 'tu', x: this.jugador.x, y: 0, alto: yo.y, de: 1, cajon: 'tu',
            planta: this.jugador.planta, mirando: this.jugador.mirando,
        });

        const vozLinterna = this.linterna.vocabulario();
        const vozLuces = this.bombillas.vocabulario();
        return {
            piezas,
            zonas: [],
            limite: { forma: 'caja', ancho: this.largo, alto: this.plantas * this.altoPlanta, largo: 5 },
            leyenda: {
                ...vozLinterna.leyenda, ...vozLuces.leyenda,
                mueble: 'mueble sin registrar', mirado: 'ya registrado', mapache: '¡el mapache!',
                pila: 'pila suelta', escalera: 'escalera', ascensor: 'ascensor', tu: 'tú',
            },
            simbolos: {
                ...vozLinterna.simbolos, ...vozLuces.simbolos,
                mueble: '?', mirado: '.', mapache: '*',
                pila: '+', escalera: 'H', ascensor: 'I', tu: '@',
            },
        };
    }

    info() {
        return {
            planta: this.jugador.planta + 1,
            plantas: this.plantas,
            /** Los TOPES también salen, que si no el HUD tiene que saberlos él. */
            pilaLlena: this.energia.maxEnergy,
            muebles: this.escondites.length,
            aguantaOscuridad: this.aguantaOscuridad,
            pila: Math.round(this.energia.currentEnergy * 10) / 10,
            linterna: this.linterna.encendida,
            registros: this.registros,
            oscuridad: Math.round(this.oscuridad * 100) / 100,
            aSalvo: this.bombillas.zonaSegura(this._donde()),
            t: Math.round(this.t * 10) / 10,
            ultimo: this.ultimo ?? '—',
            terminado: this.estado.terminado,
            ganado: this.estado.ganado,
            motivo: this.estado.motivo,
            /** La solución sólo cuando ya no lo es — misma regla que en toda la casa. */
            solucion: this.estado.terminado ? this.mapache.planta + 1 : null,
        };
    }
}

export default CorpStealthCore;
