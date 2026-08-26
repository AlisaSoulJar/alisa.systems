import { GymEnv } from '../GymEnv.js';
import { CorpStealthCore, VERBS_STEALTH } from '../../world/systems/CorpStealthCore.js';

/**
 * CorpStealthEnv — LA PUERTA DEL BANCO PARA EL EDIFICIO A OSCURAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Nueve plantas apagadas, cincuenta y cuatro muebles, una linterna que gasta y
 * una pila suelta en alguna parte. El mapache está en uno de los muebles y sólo
 * puedes registrar lo que estés alumbrando.
 *
 * QUÉ MIDE QUE OTROS NO
 *
 * El banco ya tiene búsqueda con presupuesto —¡Busca! entero— y ya tiene
 * deducción con pistas —`CorpBuilding`—. Lo que no tenía es un recurso que
 * además te MATA al agotarse, con refugios repartidos por el mundo.
 *
 * Y eso cambia la pregunta. En ¡Busca! quedarte sin combustible es el final de
 * la partida y punto: la política sólo tiene que administrar. Aquí quedarte sin
 * pila abre una cuenta atrás de tres segundos que se para si llegas a una luz —
 * así que hay una decisión más, y es de las que se equivocan: seguir registrando
 * a oscuras un rato más, o soltarlo todo y correr al interruptor.
 *
 * Medido con tres pilotos y sesenta semillas: el que registra sin mirar la luz
 * muere en la oscuridad 52 veces de 60. El que la mira, ninguna. Esa diferencia
 * es todo lo que este entorno mide.
 *
 * TRES PUERTAS SOBRE EL MISMO NÚCLEO
 *   🤖 numérica  12 números, acción discreta 0..7
 *   🧠 lenguaje  `describe()` cuenta lo que se ve; `affordances()` sólo ofrece
 *                `buscar` cuando tienes un mueble sin registrar al alcance
 *   🕹️ humana    `games/corp_sigilo.html` — A/D andar, W/S plantas, F linterna,
 *                E interruptor, ESPACIO registrar
 *
 * ⚠️ Y LA PUERTA HUMANA ES ESTE MISMO NÚCLEO, NO UNA VERSIÓN PARECIDA.
 *
 * La página importa `CorpStealthCore` y le pasa teclas: mismas reglas, misma
 * pila, mismos minuteros, mismo final. Lo único suyo es el dibujo.
 *
 * Lo que NO es esta puerta: `games/croupier_corporate_building.html`. Aquella
 * juega a algo parecido con su propio edificio dentro de una factoría de THREE,
 * y hasta que se pueda demostrar que juegan a lo mismo, esta ficha no la
 * nombra. Un entorno que dice tener puerta humana en un sitio donde no la tiene
 * es cómo la persona y el agente acaban jugando dos juegos con el mismo nombre.
 */
export class CorpStealthEnv extends GymEnv {
    static id = 'alisa/CorpStealth-v0';
    static Core = CorpStealthCore;

    /** Los números los pone la ROM; aquí sólo se dice cuál. */
    static ajustes = CorpStealthCore.ROM.mundo;

    static observationSpace = {
        shape: [12],
        names: [
            'x', 'planta', 'mirando', 'pila', 'linterna_encendida', 'a_salvo',
            'oscuridad', 'tiempo_restante',
            'muebles_sin_ver', 'dist_mueble', 'dist_pila', 'dist_interruptor',
        ],
        low: -1, high: 1,
    };

    static actionSpace = {
        type: 'discrete',
        n: VERBS_STEALTH.length,
        names: VERBS_STEALTH,
        decodifica: '0 nada · 1/2 andar · 3/4 escalera o ascensor · 5 linterna · '
                  + '6 interruptor o llamar · 7 registrar el mueble de al lado',
    };

    static meta = {
        title: 'Corp Building — a oscuras',
        summary: 'Nueve plantas apagadas y un mapache en uno de los cincuenta y cuatro '
               + 'muebles. La linterna gasta pila, las bombillas de rellano dan trece '
               + 'segundos de luz y también te protegen, y sólo se registra lo que se '
               + 'alumbra. Sin pila y sin luz, algo te alcanza en tres segundos.',
        horizon: 18000,
        tags: ['busqueda', 'recurso', 'sigilo', 'refugios', 'continuo', 'ecs'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = { ...new.target.ajustes, ...opts };
        this.nucleo = new CorpStealthCore(this.opts);
        this.steps = 0;
        this.done = false;
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.nucleo = new CorpStealthCore({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        const r = this.nucleo.step(action, dt);
        this.steps++;
        this.done = r.done;
        return r;
    }

    getObservation() { return this.nucleo.observacion(); }

    /**
     * Lo que ve el piloto, en palabras. Se cuenta lo MISMO que lleva la
     * observación numérica: si una puerta supiera algo que la otra no, las notas
     * de las dos no se podrían poner en la misma tabla.
     */
    describe() {
        const n = this.nucleo;
        const i = n.info();
        const yo = n._donde();
        const sinVer = n.escondites
            .filter((e) => e.planta === n.jugador.planta)
            .filter((e) => !n.ecs.getComponent(e.id, 'HidingSpotComponent').isSearched);

        const partes = [
            `Planta ${i.planta} de ${i.plantas}, a ${n.jugador.x.toFixed(1)} del centro del pasillo.`,
            `Pila al ${Math.round(100 * i.pila / n.energia.maxEnergy)}% y la linterna ${i.linterna ? 'encendida' : 'apagada'}.`,
            `Quedan ${sinVer.length} muebles sin registrar en esta planta.`,
        ];

        const cerca = sinVer
            .map((e) => ({ e, d: Math.abs(e.x - n.jugador.x) }))
            .sort((a, b) => a.d - b.d)[0];
        if (cerca && cerca.d <= n.andar.alcanceBrazo) {
            const donde = { x: cerca.e.x, y: cerca.e.planta * n.altoPlanta, z: 0 };
            const visto = n.bombillas.alumbrado(donde)
                || n.linterna.alumbra(yo, { x: n.jugador.mirando, y: 0, z: 0 }, donde);
            partes.push(visto
                ? `Tienes el mueble ${cerca.e.i + 1} al alcance y lo estás alumbrando.`
                : `Tienes el mueble ${cerca.e.i + 1} al alcance pero a oscuras: así no se ve nada dentro.`);
        } else if (cerca) {
            partes.push(`El mueble más cercano sin registrar está a ${cerca.d.toFixed(1)}, hacia la ${cerca.e.x > n.jugador.x ? 'derecha' : 'izquierda'}.`);
        }

        if (i.aSalvo) partes.push('Estás bajo una luz: aquí no te alcanzan.');
        else if (i.oscuridad > 0) {
            partes.push(`Llevas ${i.oscuridad.toFixed(1)} segundos a oscuras de los ${n.aguantaOscuridad} que aguantas.`);
        }

        const pila = n.pilas.find((p) => !p.cogida && p.planta === n.jugador.planta);
        if (pila) partes.push(`Hay una pila suelta en esta planta, a ${Math.abs(pila.x - n.jugador.x).toFixed(1)}.`);

        const dInt = Math.abs(n.jugador.x - n.interruptorX);
        partes.push(dInt <= n.andar.alcanceBrazo
            ? 'Tienes el interruptor del rellano al lado.'
            : `El interruptor del rellano está a ${dInt.toFixed(1)}.`);

        if (i.terminado) partes.push(i.ganado ? '¡Ahí estaba el mapache!' : `Se acabó: ${i.motivo}.`);
        return partes.join(' ');
    }

    /**
     * ⚠️ SÓLO SE OFRECE LO QUE MERECE LA PENA, NO LO QUE ES LEGAL.
     *
     * `buscar` no aparece si no tienes un mueble SIN REGISTRAR al alcance, y
     * `pulsar` no aparece si no tienes interruptor ni ascensor a mano. Es la
     * lección que costó 2.923 pasos en ¡Busca!: un piloto que se fía de la lista
     * de verbos se pasa la partida escaneando al vacío si la lista miente.
     *
     * ⚠️ Y SE DEVUELVEN OBJETOS `{verb, label, action}`, NO CADENAS.
     *
     * La primera versión devolvía los verbos pelados y `prueba_puertas_busca`
     * lo cazó de una forma que merece contarse: dijo «ofrece 1 verbo que la
     * acción discreta no admite» y **no puso cuál**, porque el que sobraba era
     * `undefined` — la prueba lee `a.verb` de cada oferta y en una cadena eso no
     * existe. El mensaje vacío ERA el síntoma.
     */
    affordances() {
        const n = this.nucleo;
        const V = CorpStealthEnv.actionSpace.names;
        const of = (verb, label) => ({ verb, label, action: V.indexOf(verb) });
        /** `nada`, no `esperar`: las dos puertas tienen que decir el MISMO verbo. */
        if (n.terminado()) return [of('nada', 'Se acabó')];

        const puede = [
            of('izquierda', 'Andar hacia la izquierda del pasillo'),
            of('derecha', 'Andar hacia la derecha del pasillo'),
            of('linterna', n.linterna.encendida ? 'Apagar la linterna' : 'Encender la linterna'),
        ];

        const sinVer = n.escondites
            .filter((e) => e.planta === n.jugador.planta)
            .filter((e) => !n.ecs.getComponent(e.id, 'HidingSpotComponent').isSearched)
            .some((e) => Math.abs(e.x - n.jugador.x) <= n.andar.alcanceBrazo);
        if (sinVer) puede.push(of('buscar', 'Registrar el mueble que tienes al lado'));

        const dInt = Math.abs(n.jugador.x - n.interruptorX);
        const dAsc = Math.abs(n.jugador.x - n.ascensorX);
        if (dInt <= n.andar.alcanceBrazo) puede.push(of('pulsar', 'Dar al interruptor del rellano'));
        else if (dAsc <= n.andar.alcanceBrazo) puede.push(of('pulsar', 'Llamar al ascensor'));

        /** Sólo la escalera y el ascensor cambian de planta — el interruptor no. */
        const enPunto = Math.abs(n.jugador.x - n.escaleraX) <= n.andar.alcanceBrazo
            || (dAsc <= n.andar.alcanceBrazo && n.ascensor.currentFloor === n.jugador.planta);
        if (enPunto && n.jugador.planta < n.plantas - 1) puede.push(of('subir', 'Subir una planta'));
        if (enPunto && n.jugador.planta > 0) puede.push(of('bajar', 'Bajar una planta'));
        return puede;
    }

    /** La traducción de la puerta de lenguaje a la discreta, en un sitio. */
    actFromVerb(verb) {
        const i = CorpStealthEnv.actionSpace.names.indexOf(verb);
        return i < 0 ? 0 : i;
    }

    getScore() {
        const i = this.nucleo.info();
        return {
            score: i.ganado ? Math.max(0, 100 - i.registros * 2) : 0,
            metrics: {
                encontrado: i.ganado, registros: i.registros, motivo: i.motivo,
                pila: i.pila, segundos: i.t, pasos: this.steps,
            },
        };
    }
}

export default CorpStealthEnv;
