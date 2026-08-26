/**
 * CorpBuildingCore.js — ¡BUSCA! 3: UN EDIFICIO, PUERTA POR PUERTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un mapache se esconde detrás de una de las puertas de un edificio de N plantas.
 * Se busca abriendo puertas, y cada intento devuelve una pista de temperatura
 * —caliente, fresco, helado— según lo lejos que esté la planta. Lo que aprieta es
 * el PRESUPUESTO: catorce comprobaciones y se acabó.
 *
 * No mide reflejos: mide **deducción bajo incertidumbre con presupuesto
 * limitado**, que es el terreno donde un modelo de lenguaje puede ganar de
 * verdad. «Miré la 3ª y salió helado, así que no está entre la 1 y la 6…»
 *
 * ⚠️ POR QUÉ ESTE FICHERO EXISTE: EL JUEGO ESTABA ESCRITO TRES VECES.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Medido el 26-08-2026:
 *
 *     corp_building.html                1.983 líneas · no importa NADA
 *     croupier_corporate_building.html  2.464 líneas · importa 7 piezas
 *     CorpBuildingEnv.js                  315 líneas · su propio ECS y su estado
 *
 * Cuatro mil cuatrocientas líneas de página para un juego, y el estado modelado
 * en los tres sitios. Es la avería que este proyecto lleva semanas midiéndose —la
 * persona y el agente jugando a dos juegos con el mismo nombre— con una vuelta de
 * tuerca: aquí eran TRES.
 *
 * El estado y las reglas se mudan aquí. El entorno se queda de PUERTA
 * —observación, recompensa, texto, verbos, nota— y las páginas pasan a pintar
 * este sustrato en vez de llevar su propia copia del edificio.
 *
 * ⚠️ Y AL MUDARLO SALIÓ UNA AVERÍA DE LAS GORDAS, EN LA PUERTA DE TEXTO.
 *
 * `describe()` le decía al agente: «Cada comprobación te dice CALIENTE (misma
 * planta), TIBIO (a 1-2 plantas) o FRÍO (más lejos)». Pero las bandas de este
 * juego son **caliente · fresco · helado** desde que se pasó a la escala común
 * del banco — el comentario que lo explica está justo al lado, en el mismo
 * fichero.
 *
 * O sea que la puerta por la que juega un modelo sin ojos le enseñaba **un
 * vocabulario que el juego no usa**: esperaba «TIBIO» y recibía «fresco», y
 * «FRÍO» no aparecía nunca. Eso no es dificultad: es ruido que el banco le mete
 * encima al que lee. Aquí se dicen las palabras que de verdad devuelve.
 */
import { crearBandas } from '../core/Bandas.js';
import { ECSWorld, TransformComponent } from '../OverworldECS.js';
import { HidingSpotComponent } from './HidingSpotSystem.js';

export class CorpBuildingCore {
    /**
     * ⚠️ LA ROM: EL JUEGO, DECLARADO COMO DATOS.
     *
     * A diferencia de la torre y del satélite, este cartucho no compone piezas de
     * movimiento: es un juego de TURNOS, y lo que compone son el componente de
     * escondite del motor y la escala de bandas del banco. Los `cortes` son la
     * dificultad de la pista, y ahora se pueden cambiar sin abrir el código.
     */
    static ROM = {
        id: 'alisa/CorpBuilding-v0',
        familia: 'turnos',
        verbos: ['comprobar_puerta', 'comprobar_escondite', 'ir_a_planta'],

        mundo: { plantas: 8, puertasPorPlanta: 3, presupuesto: 14, probArmario: 0.5 },

        sistemas: [
            ['HidingSpotComponent', { puertasPorPlanta: 3, probArmario: 0.5 }],
            /**
             * Los cortes cuentan PLANTAS ENTERAS, no distancias normalizadas, y
             * son de este juego. Lo que se comparte con el resto del banco son
             * las PALABRAS: tres peldaños de la escala de cinco, porque este juego
             * da una pista más gruesa. Igualar los cortes sería inventarse una
             * calibración que nadie ha medido.
             */
            ['Bandas', { cortes: [[1, 'caliente'], [3, 'fresco'], [Infinity, 'helado']] }],
        ],

        voz: {
            jugador: 'tu_planta',
            volumen: 'edificio',
            texto: {
                Volumen: 'Edificio', plantas: 'plantas', planta: 'planta',
                objeto: 'mapache',
            },
        },

        hud: {
            titulo: '¡Busca!', subtitulo: '13 Corp Building', acento: '#ffcc33',
            mandos: 'Clic en una puerta: de otra planta te mueves, de la tuya la abres',
            filas: [
                { etiqueta: 'Planta', campo: 'planta', de: 'plantas' },
                { etiqueta: 'Comprobaciones', campo: 'comprobaciones', de: 'presupuesto' },
                { etiqueta: 'Última pista', campo: 'ultima' },
            ],
        },

        /** Las dos cartelas, dichas una sola vez. */
        cartel: {
            titulo: '¡Busca! 3 — 13 Corp Building',
            parrafos: [
                'Un mapache se esconde detrás de una de las puertas del edificio. Se busca '
                + 'abriendo puertas, y cada intento devuelve una pista de temperatura según '
                + 'lo lejos que esté la planta.',
                '<b>Clic en una puerta</b>: si es de otra planta, te mueves a ella; si es de la '
                + 'tuya, la abres. Tienes un presupuesto de comprobaciones — cuando se acaba, se acabó.',
            ],
            pie: 'Powered by ALISA <b>CorpBuildingCore</b> — el mismo núcleo que juega el banco, '
               + 'donde un agente bayesiano ya escrito hace de baseline.',
            ajustes: [
                { clave: 'seed', etiqueta: 'Semilla', valor: 0 },
                { clave: 'plantas', etiqueta: 'Plantas', valor: 8, min: 3, max: 20 },
            ],
            boton: '▶ ENTRAR AL EDIFICIO',
            final: {
                gana: '¡Encontrado!',
                pierde: 'Se acabaron los intentos',
                detalleGana: 'Estaba en la planta {solucion}. Te costó {comprobaciones} comprobaciones.',
                detallePierde: 'Estaba en la planta {solucion}. Gastaste las {comprobaciones}.',
            },
        },

        fases: ['intencion', 'reglas', 'sustrato'],
    };

    static params(pieza) {
        return this.ROM.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor(cfg = {}) {
        const ROM = CorpBuildingCore.ROM;
        this.plantas = cfg.floors ?? cfg.plantas ?? ROM.mundo.plantas;
        this.puertasPorPlanta = cfg.doorsPerFloor ?? ROM.mundo.puertasPorPlanta;
        this.presupuesto = cfg.budget ?? ROM.mundo.presupuesto;
        this.probArmario = cfg.probArmario ?? ROM.mundo.probArmario;
        this.banda = crearBandas(CorpBuildingCore.params('Bandas').cortes);
        this.ecs = null;
        this.reset(cfg.seed ?? 0);
    }

    /**
     * ⚠️ EL AZAR, EN EL MISMO ORDEN QUE TENÍA.
     *
     * Una tirada por planta para decidir si hay armario, y una al final para
     * esconder al mapache. Cambiar el número de tiradas o su sitio movería el
     * edificio entero con la misma semilla, y el sello lo diría.
     */
    reset(semilla = 0) {
        this.semilla = semilla;
        const rnd = CorpBuildingCore._azar(semilla);

        this.ecs = new ECSWorld();
        this.spots = [];
        for (let f = 0; f < this.plantas; f++) {
            for (let d = 0; d < this.puertasPorPlanta; d++) {
                const id = this.ecs.createEntity();
                this.ecs.addComponent(id, 'TransformComponent', TransformComponent(d * 4 - 4, f * 3, 0));
                this.ecs.addComponent(id, 'HidingSpotComponent', HidingSpotComponent({
                    label: `puerta ${String.fromCharCode(65 + d)} · planta ${f + 1}`,
                }));
                this.spots.push({ id, floor: f, index: d, kind: 'puerta' });
            }
            if (rnd() < this.probArmario) {
                const id = this.ecs.createEntity();
                this.ecs.addComponent(id, 'TransformComponent', TransformComponent(6, f * 3, 0));
                this.ecs.addComponent(id, 'HidingSpotComponent', HidingSpotComponent({
                    label: `armario · planta ${f + 1}`,
                }));
                this.spots.push({ id, floor: f, index: this.puertasPorPlanta, kind: 'escondite' });
            }
        }

        const elegido = this.spots[Math.floor(rnd() * this.spots.length)];
        this.ecs.getComponent(elegido.id, 'HidingSpotComponent').hasRaccoon = true;
        this.mapache = elegido;

        this.plantaActual = 0;
        this.registro = [];
        this.ultima = null;
        this.encontrado = false;
        this.acabado = false;
        this.agotado = false;
        return this.sustrato();
    }

    static _azar(semilla) {
        let a = semilla >>> 0;
        return () => {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /** Cómo de cerca está una planta del mapache, en la escala común del banco. */
    pista(planta) {
        return this.banda(Math.abs(planta - this.mapache.floor));
    }

    // ── el verbo de la familia de TURNOS ────────────────────────────────────

    irAPlanta(planta) {
        this.plantaActual = Math.max(0, Math.min(this.plantas - 1, planta));
        return this.plantaActual;
    }

    /**
     * Abrir una puerta o mirar un armario.
     * @returns {{estado: 'nada'|'repetido'|'encontrado'|'pista', resultado?: string}}
     */
    comprobar(tipo, indice) {
        if (this.acabado) return { estado: 'nada' };
        const sitio = this.spots.find(
            (s) => s.floor === this.plantaActual && s.index === indice && s.kind === tipo);
        if (!sitio) return { estado: 'nada' };

        const c = this.ecs.getComponent(sitio.id, 'HidingSpotComponent');
        if (c.isSearched) return { estado: 'repetido' };

        c.isSearched = true;
        const resultado = c.hasRaccoon ? '¡ENCONTRADO!' : this.pista(this.plantaActual);
        this.ultima = resultado;
        this.registro.push({ floor: this.plantaActual, index: indice, kind: tipo, result: resultado });

        if (c.hasRaccoon) {
            this.encontrado = true;
            this.acabado = true;
            return { estado: 'encontrado', resultado, comprobaciones: this.registro.length };
        }
        if (this.registro.length >= this.presupuesto) { this.acabado = true; this.agotado = true; }
        return { estado: 'pista', resultado, comprobaciones: this.registro.length };
    }

    terminado() { return this.acabado; }

    /** Los escondites que quedan por mirar en la planta donde estás. */
    libresAqui() {
        return this.spots.filter((s) => s.floor === this.plantaActual
            && !this.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched);
    }

    // ── el mundo, en el idioma común ────────────────────────────────────────

    /**
     * ⚠️ AQUÍ SÍ HAY REJILLA DE VERDAD: PLANTAS × ESCONDITES.
     *
     * Cada escondite tiene su planta y su índice, así que la cuadrícula no hay que
     * inventarla — ya está en los datos. Es lo contrario de la torre o del
     * satélite, que son volúmenes continuos y no publican ninguna.
     *
     * ⚠️ Y SÓLO SE DIBUJA LO QUE EL JUGADOR SABE. Un escondite sin registrar sale
     * como `sin_mirar`. Publicar dónde está el mapache pondría la solución en el
     * sustrato, y cualquiera que lo lea —un dibujante o un agente— la vería.
     */
    sustrato() {
        const porPlanta = new Map();
        for (const s of this.spots) {
            if (!porPlanta.has(s.floor)) porPlanta.set(s.floor, 0);
            porPlanta.set(s.floor, Math.max(porPlanta.get(s.floor), s.index + 1));
        }
        const ancho = Math.max(1, ...porPlanta.values());
        const alto = this.plantas;

        const celdas = new Array(ancho * alto).fill(0);
        const piezas = [];
        for (const s of this.spots) {
            const c = this.ecs.getComponent(s.id, 'HidingSpotComponent');
            const visto = !!c?.isSearched;
            const esElBueno = visto && this.mapache && s.id === this.mapache.id;
            celdas[s.floor * ancho + s.index] = 1;
            piezas.push({
                x: s.index, y: s.floor, de: 0,
                t: esElBueno ? 'mapache' : visto ? 'mirado' : 'sin_mirar',
                clase: s.kind,
            });
        }
        piezas.push({ x: 0, y: this.plantaActual, t: 'tu_planta', de: 1 });

        return {
            rejilla: { ancho, alto, celdas },
            piezas,
            zonas: [],
            leyenda: {
                sin_mirar: 'escondite sin registrar', mirado: 'ya registrado',
                mapache: '¡el mapache!', tu_planta: 'la planta donde estás',
            },
            simbolos: { sin_mirar: '?', mirado: '.', mapache: '*', tu_planta: '@' },
        };
    }

    info() {
        return {
            planta: this.plantaActual + 1,
            plantas: this.plantas,
            comprobaciones: this.registro.length,
            presupuesto: this.presupuesto,
            ultima: this.ultima ?? '—',
            terminado: this.acabado,
            ganado: this.encontrado,
            /**
             * La solución, y sólo cuando ya no es solución — misma regla que en
             * `SearchInVolumeCore`: mientras se juega es `null`, porque publicarla
             * la pondría en la puerta que lee el agente.
             */
            solucion: this.acabado ? this.mapache.floor + 1 : null,
        };
    }
}
