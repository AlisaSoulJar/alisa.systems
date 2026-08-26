/**
 * SearchInVolumeCore.js — EL MUEBLE: BUSCAR ALGO EN UN VOLUMEN, PLANTA A PLANTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     export class MiJuego extends SearchInVolumeCore {
 *         static ROM = { ... };      // y ya está: eso es el juego entero
 *     }
 *
 * Esto NO es un juego: es la máquina que juega un tipo de cartucho. Un vehículo
 * con inercia da vueltas a un volumen dividido en plantas, mira una planta a la
 * vez, y lo que aprieta es un recurso que baja solo y se recupera en puntos
 * repartidos por el mundo.
 *
 * Un dron alrededor de una torre buscando a alguien es eso. Un satélite barriendo
 * una estación a la deriva buscando una baliza es eso MISMO con otros números y
 * otros nombres. Y el día que alguien quiera un submarinista rodeando un pecio
 * por cubiertas, también.
 *
 * ⚠️ QUÉ ES CADA PALABRA, PORQUE AQUÍ SE DECIDIÓ.
 *
 *   SYSTEM    la pieza. `FloorScanSystem` no sabe si por fuera es un rascacielos
 *             o una estación. Es un átomo, y se parametriza.
 *   CORE      el mueble. Esta clase. Sabe cómo se componen esas piezas para que
 *             salga un juego de este género, y no sabe de qué va el juego.
 *   ROM       el cartucho: qué piezas, con qué números y con qué nombres. Es lo
 *             único que escribe quien hace un juego nuevo.
 *   CHECKSUM  la huella sellada en `resultados/huellas.json`. Dos ROMs distintas
 *             dan huellas distintas; la misma ROM con otro nombre da la misma.
 *
 * ⚠️ Y LA PRUEBA DE QUE ESTO NO ES UN ADORNO ESTÁ MEDIDA.
 *
 * `DroneTowerCore` era 438 líneas escritas a mano. Al pasarlo a `static ROM` +
 * esta clase, su huella siguió siendo **95f6631a**. Bit a bit el mismo juego. Si
 * el mueble hubiera cambiado una milésima del comportamiento, `prueba_huella.mjs`
 * lo habría dicho con nombre y apellido.
 *
 * ⚠️ LO QUE ESTE MUEBLE NO HACE, DICHO PARA QUE NADIE SE LO SUPONGA.
 *
 * El orden del tick sigue escrito a mano aquí abajo. Flecs y Unity DOTS declaran
 * FASES y deja que un planificador las ordene; nosotros no. La ROM ya declara sus
 * `fases`, pero todavía no mandan. Es la deuda que se ve al comparar con lo de
 * fuera, y está escrita en la ROM para que no se olvide.
 */
import { ECSWorld } from '../OverworldECS.js';
import { EnergySystem, EnergyComponent } from './EnergySystem.js';
import { FloorScanSystem } from './FloorScanSystem.js';
import { VolumeVehicleSystem } from './VolumeVehicleSystem.js';
import { RechargeSystem } from './RechargeSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';

export class SearchInVolumeCore {
    /** Los parámetros de una pieza de la ROM de ESTE cartucho, por nombre. */
    static params(pieza) {
        return this.ROM.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor(cfg = {}) {
        const Cartucho = this.constructor;
        const ROM = Cartucho.ROM;
        const vehiculoP = Cartucho.params('VolumeVehicleSystem');
        const escaneoP = Cartucho.params('FloorScanSystem');
        const energiaP = Cartucho.params('EnergySystem');
        const puntoP = Cartucho.params('RechargeSystem');

        this.rom = ROM;
        this.voz = ROM.voz;

        this.plantas = cfg.plantas ?? ROM.mundo.plantas;
        this.altoPlanta = cfg.altoPlanta ?? ROM.mundo.altoPlanta;
        this.radioTorre = cfg.radioTorre ?? ROM.mundo.radioTorre;
        this.ancho = cfg.ancho ?? ROM.mundo.ancho;
        this.largo = cfg.largo ?? ROM.mundo.largo;
        this.alto = this.plantas * this.altoPlanta + ROM.mundo.margenAlto;

        this.bateriaInicial = cfg.bateria ?? energiaP.bateria;
        this.gastoPorSegundo = cfg.gasto ?? energiaP.gasto;
        this.cuestaFallar = cfg.cuestaFallar ?? escaneoP.cuestaFallar;

        this.ecs = new ECSWorld();
        this.energiaSys = new EnergySystem();
        this.ecs.addSystem(this.energiaSys.update.bind(this.energiaSys), ['EnergyComponent']);
        this.dron = this.ecs.createEntity();

        this.vehiculo = new VolumeVehicleSystem({
            ancho: this.ancho, alto: this.alto, largo: this.largo,
            velMax: cfg.velMax ?? vehiculoP.velMax,
        });
        this.busqueda = new FloorScanSystem({
            plantas: this.plantas, cuestaFallar: this.cuestaFallar, margen: escaneoP.margen,
        });
        this.recargas = new RechargeSystem({
            piel: puntoP.piel,
            da: cfg.pilaDa ?? puntoP.da,
            alcance: cfg.pilaAlcance ?? puntoP.alcance,
        });
        this.pilas = cfg.pilas ?? puntoP.cuantas;

        this.estado = { jugando: false, terminado: false, ganado: false, plantaActiva: -1 };
        this.piloto = { modo: 'ROAM', destino: -1, reloj: 1.0 };
        this.t = 0;
        this.reset(cfg.seed ?? 42);
    }

    // ── contrato ────────────────────────────────────────────────────────────

    reset(semilla = 42) {
        this.semilla = semilla >>> 0;
        this.rng = mulberry32(this.semilla);
        this.t = 0;

        this.busqueda.reset(() => this.rng());

        this.vehiculo.reset(
            { x: this.radioTorre + 12, y: (this.plantas * this.altoPlanta) / 2, z: 0 },
            { x: 0, y: 0, z: 8 });

        /**
         * ⚠️ LOS PUNTOS DE RECARGA VAN EN EL ANILLO POR DONDE SE VUELA.
         *
         * La primera versión los repartía por el volumen entero, así que algunos
         * caían DENTRO de la torre — y ahí no se puede entrar, porque
         * `lejosDelCentro` empuja fuera. Medido: con semillas 7 y 42 el piloto
         * perdía habiendo cogido CERO pilas aunque las buscaba.
         *
         * Es la clase de fallo que no da error y no se ve mirando: el objeto
         * existe, se dibuja, está en el sustrato, y es inalcanzable.
         */
        const dentro = this.radioTorre + 6;
        const fuera = this.ancho / 2 - 15;
        this.recargas.sembrar(Array.from({ length: this.pilas }, () => {
            const ang = this.rng() * Math.PI * 2;
            const r = dentro + this.rng() * (fuera - dentro);
            return {
                x: Math.cos(ang) * r,
                y: this.altoPlanta + this.rng() * (this.plantas - 2) * this.altoPlanta,
                z: Math.sin(ang) * r,
            };
        }));

        this.ecs.addComponent(this.dron, 'EnergyComponent', EnergyComponent({
            maxEnergy: this.bateriaInicial, currentEnergy: this.bateriaInicial,
            drainRate: this.gastoPorSegundo, hasDevice: true, isOn: true,
        }));

        this.estado = { jugando: true, terminado: false, ganado: false, plantaActiva: -1 };
        this.piloto = { modo: 'ROAM', destino: -1, reloj: 1.0 };
        return this.sustrato();
    }

    get bateria() {
        return this.ecs.getComponent(this.dron, 'EnergyComponent')?.currentEnergy ?? 0;
    }

    /** Familia de TIEMPO REAL: el volumen no espera. */
    tick(dt = 1 / 60, mando = null) {
        if (this.estado.terminado) return this.info();
        this.ecs.tick(dt);
        this.t += dt;

        const energia = this.ecs.getComponent(this.dron, 'EnergyComponent');

        if (mando) this._pilotarAMano(mando, dt);
        else this._pilotarSolo(dt);

        this.vehiculo.acelerar(this.vehiculo.bordes(12, 25), dt);
        this.vehiculo.acelerar(this.vehiculo.lejosDelCentro(this.radioTorre, 40), dt);
        this.vehiculo.avanzar(dt);

        if (this.recargas.tick(this.vehiculo.pos, energia, dt)) {
            this.estado.recargado = this.t;
        }
        if (energia && energia.currentEnergy <= 0) this._acabar(false);
        return this.info();
    }

    /**
     * Mirar la planta que se tenga al lado. Es la única acción con consecuencia:
     * acertar termina la partida y fallar cuesta recurso.
     */
    escanear(planta = this.plantaCercana()) {
        if (this.estado.terminado) return { estado: 'repetida' };
        const energia = this.ecs.getComponent(this.dron, 'EnergyComponent');
        const r = this.busqueda.escanear(planta, energia);
        if (r.estado === 'acierto') this._acabar(true);
        else if (r.sinRecurso) this._acabar(false);
        if (r.estado !== 'repetida') this.estado.plantaActiva = planta;
        return r;
    }

    /** A qué altura se está, en número de planta. */
    plantaCercana() {
        const i = Math.floor(this.vehiculo.pos.y / this.altoPlanta);
        return Math.max(0, Math.min(this.plantas - 1, i));
    }

    terminado() { return this.estado.terminado; }

    // ── el mundo, en el idioma común ────────────────────────────────────────

    sustrato() {
        const v = this.voz;
        const piezas = [
            // Con `altoPlanta` las plantas salen además a su altura, así que un
            // pintor 3D dibuja una torre y no una fila de losas en el suelo.
            ...this.busqueda.piezas({ de: 0, altoPlanta: this.altoPlanta }),
            ...this.recargas.piezas({ de: 9 }),
            this.vehiculo.pieza({ t: v.jugador, de: 1, cajon: v.jugador }),
            /**
             * ⚠️ EL VOLUMEN ES UNA PIEZA, NO DECORADO DE LA PÁGINA.
             *
             * El edificio existía sólo en la cabeza del núcleo: `radioTorre` era
             * un campo privado. Consecuencia medida: la página no podía dibujarlo
             * —no sabía de qué tamaño era— y pintaba dieciocho losas flotando.
             *
             * Y no es sólo cosmética: el agente TAMPOCO lo sabía. Su observación
             * decía dónde está cada planta pero no que hay un volumen macizo en
             * medio, contra el que se choca. Eso es información de juego.
             *
             * Va en `piezas` y no en `zonas` por una razón que costó un test rojo:
             * en el contrato `zonas` son zonas de CARTAS —llevan `items` y
             * `ocultas`, y `descripcion.js` las lee así—. Una zona espacial ahí
             * dentro no es una extensión: es pisarle el nombre a otra cosa.
             */
            {
                t: v.volumen, x: 0, y: 0, alto: 0, de: null, cajon: v.volumen,
                alcance: this.radioTorre,
                plantas: this.plantas,
                altoPlanta: this.altoPlanta,
            },
        ];
        const vozBusqueda = this.busqueda.vocabulario();
        const vozPilas = this.recargas.vocabulario();
        return {
            piezas,
            zonas: [],
            limite: { forma: 'caja', ancho: this.ancho, alto: this.alto, largo: this.largo },
            leyenda: {
                ...vozBusqueda.leyenda, ...vozPilas.leyenda,
                [v.jugador]: 'tú',
                [v.volumen]: v.leyendaVolumen,
            },
            simbolos: {
                ...vozBusqueda.simbolos, ...vozPilas.simbolos,
                [v.jugador]: '@',
                [v.volumen]: '#',
            },
        };
    }

    info() {
        return {
            t: Math.round(this.t * 10) / 10,
            bateria: Math.round(this.bateria * 10) / 10,
            planta: this.plantaCercana(),
            escaneadas: this.busqueda.escaneadas.size,
            quedan: this.busqueda.quedan(),
            /**
             * ⚠️ CUÁNTOS PUNTOS DE RECARGA QUEDAN, Y ESTO LO DESTAPÓ EL HUD.
             *
             * Al declarar el panel en la ROM, la fila de las pilas se cayó: salía
             * de `nucleo.recargas.disponibles().length`, o sea de meterle la mano
             * al núcleo desde la página. `info()` no lo publicaba.
             *
             * Y no es un dato de adorno: es la diferencia entre «me queda poco y
             * hay dónde recargar» y «me queda poco y no hay nada». La persona lo
             * veía porque su página hurgaba; el agente NO lo tenía en su `info`.
             * Un HUD declarativo no puede leer lo que el núcleo no dice, y por eso
             * obligó a decirlo — que es exactamente para lo que sirve.
             */
            recargas: this.recargas.disponibles().length,
            terminado: this.estado.terminado,
            ganado: this.estado.ganado,
            plantas: this.plantas,
            /**
             * ⚠️ LA SOLUCIÓN, Y SÓLO CUANDO YA NO ES SOLUCIÓN.
             *
             * Dónde estaba lo escondido es la respuesta del juego: publicarlo
             * mientras se juega lo pondría en la puerta que lee el agente y en el
             * HUD que ve la persona. Al terminar deja de ser secreto y pasa a ser
             * lo único que hace falta para escribir la cartela final — que es lo
             * que permite DECLARARLA en vez de que cada página la escriba.
             *
             * `null` mientras se juega, no ausente: un campo que aparece y
             * desaparece obliga a quien lo lea a distinguir «no sé» de «no hay».
             */
            solucion: this.estado.terminado ? this.busqueda.objetivo : null,
        };
    }

    // ── por dentro ──────────────────────────────────────────────────────────

    _acabar(ganado) {
        this.estado.jugando = false;
        this.estado.terminado = true;
        this.estado.ganado = ganado;
    }

    _pilotarAMano(mando, dt) {
        const a = { x: 0, y: 0, z: 0 };
        if (mando.subir) a.y += 30;
        if (mando.bajar) a.y -= 30;
        // Girar es moverse en círculo alrededor del volumen, no rotar en el
        // sitio: lo que se busca está repartido en altura, no en ángulo.
        const ang = Math.atan2(this.vehiculo.pos.z, this.vehiculo.pos.x);
        const giro = (mando.izquierda ? 1 : 0) - (mando.derecha ? 1 : 0);
        if (giro) { a.x += -Math.sin(ang) * 30 * giro; a.z += Math.cos(ang) * 30 * giro; }
        this.vehiculo.acelerar(a, dt);
    }

    /**
     * El piloto automático: dar vueltas, acercarse a una planta sin mirar,
     * pararse encima y escanear. Es la misma máquina de tres estados que traía
     * `ChopperAquariumEngine`, y es lo que hace jugable la etapa sin manos.
     */
    _pilotarSolo(dt) {
        const p = this.piloto;
        const alturaDe = (i) => i * this.altoPlanta + this.altoPlanta / 2;

        /**
         * ⚠️ IR A POR UN PUNTO DE RECARGA CUANDO QUEDA POCO. MEDIDO.
         *
         * La primera versión del piloto no los miraba, y la partida con semilla
         * 42 acababa SIEMPRE igual: 53,3 s, cuatro plantas escaneadas y recurso a
         * cero. La cuenta es exacta —1,5/s durante 53 s más cuatro fallos a 5— así
         * que la etapa era imposible de ganar.
         *
         * Y lo peor no era perder: era que la mecánica de recarga que acababa de
         * añadirse no la usaba nadie. Una pieza que nadie toca es una pieza
         * muerta, aunque esté probada.
         */
        const energia = this.ecs.getComponent(this.dron, 'EnergyComponent');
        const bajo = energia && energia.currentEnergy < this.bateriaInicial * 0.35;
        const hayPilas = this.recargas.disponibles();
        if (bajo && hayPilas.length) {
            const cerca = hayPilas.reduce((mejor, q) => {
                const d = (q.x - this.vehiculo.pos.x) ** 2
                        + (q.y - this.vehiculo.pos.y) ** 2
                        + (q.z - this.vehiculo.pos.z) ** 2;
                return (!mejor || d < mejor.d) ? { q, d } : mejor;
            }, null).q;
            const dir = {
                x: cerca.x - this.vehiculo.pos.x,
                y: cerca.y - this.vehiculo.pos.y,
                z: cerca.z - this.vehiculo.pos.z,
            };
            VolumeVehicleSystem.normalizar(dir);
            this.vehiculo.acelerar({ x: dir.x * 40, y: dir.y * 40, z: dir.z * 40 }, dt);
            p.modo = 'RECARGA';
            return;
        }
        if (p.modo === 'RECARGA') { p.modo = 'ROAM'; p.reloj = 0.2; }

        if (p.modo === 'ROAM') {
            p.reloj -= dt;
            if (p.reloj <= 0) {
                const libres = [];
                for (let i = 0; i < this.plantas; i++) {
                    if (!this.busqueda.escaneadas.has(i)) libres.push(i);
                }
                if (libres.length) {
                    p.destino = libres[Math.floor(this.rng() * libres.length)];
                    p.modo = 'APPROACH';
                }
            }
            const r = this.radioTorre + 17;
            const objetivo = {
                x: Math.cos(this.t * 0.5) * r - this.vehiculo.pos.x,
                y: (this.plantas * this.altoPlanta / 2) - this.vehiculo.pos.y,
                z: Math.sin(this.t * 0.5) * r - this.vehiculo.pos.z,
            };
            VolumeVehicleSystem.normalizar(objetivo);
            this.vehiculo.acelerar({ x: objetivo.x * 15, y: objetivo.y * 15, z: objetivo.z * 15 }, dt);
            return;
        }

        const ang = Math.atan2(this.vehiculo.pos.z, this.vehiculo.pos.x);
        const dist = p.modo === 'APPROACH' ? this.radioTorre : this.radioTorre + 12;
        const dir = {
            x: Math.cos(ang) * dist - this.vehiculo.pos.x,
            y: alturaDe(p.destino) - this.vehiculo.pos.y,
            z: Math.sin(ang) * dist - this.vehiculo.pos.z,
        };

        if (p.modo === 'APPROACH') {
            if (VolumeVehicleSystem.largoDe(dir) < 5
             && VolumeVehicleSystem.largoDe(this.vehiculo.vel) < 12) {
                p.modo = 'INSPECTING';
                p.reloj = 1.5;
                this.estado.plantaActiva = p.destino;
            } else {
                VolumeVehicleSystem.normalizar(dir);
                this.vehiculo.acelerar({ x: dir.x * 35, y: dir.y * 35, z: dir.z * 35 }, dt);
                this.vehiculo.frenar(0.92);
            }
            return;
        }

        // INSPECTING
        p.reloj -= dt;
        VolumeVehicleSystem.normalizar(dir);
        this.vehiculo.acelerar({ x: dir.x * 15, y: dir.y * 15, z: dir.z * 15 }, dt);
        this.vehiculo.frenar(0.8);
        if (p.reloj <= 0) {
            this.escanear(p.destino);
            if (!this.estado.terminado) {
                p.modo = 'ROAM';
                p.reloj = 1.0 + this.rng();
                p.destino = -1;
                this.estado.plantaActiva = -1;
            }
        }
    }
}
