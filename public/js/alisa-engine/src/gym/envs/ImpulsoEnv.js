import { GymEnv } from '../GymEnv.js';
import { ImpulsoCore, VERBS_IMPULSO } from '../../world/systems/ImpulsoCore.js';

/**
 * ImpulsoEnv — LA PUERTA DEL BANCO PARA EL JUEGO DE UN BOTÓN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Caes siempre, subes al pulsar, y hay muros con un hueco.
 *
 * QUÉ MIDE QUE OTROS NO
 *
 * Los doce entornos de la casa miden búsqueda, deducción o administración de un
 * recurso. Éste no mide ninguna: **se ve todo y no hay nada que deducir**. Lo
 * único difícil es CUÁNDO, y su espacio de acciones es el más pequeño que puede
 * tener un juego: dos.
 *
 * Y lo que separa a un piloto de otro está medido, y no es reflejo bruto: es
 * saberse la propia física. Un empujon sube siempre `impulso² / 2g` = 2,40, así
 * que quien apunta al centro del hueco se sale por arriba exactamente esa
 * cantidad. Con 40 semillas:
 *
 *     conoce su empujon y apunta medio por debajo   43,2 muros
 *     apunta al centro del hueco                    0,7 muros
 *     se mantiene a media altura                    0,3 muros
 *
 * Esa distancia —de 0,7 a 43— es todo lo que este entorno mide.
 *
 * ⚠️ AVISO HONESTO: UNA POLÍTICA DE LENGUAJE NO VA A JUGAR A ESTO.
 *
 * Decidir a 60 Hz no es lo suyo, y `affordances()` aquí siempre dice lo mismo
 * —«impulso» o «no»— porque el juego no tiene más. Es un banco de REFLEJOS, y
 * eso es una propiedad y no un defecto: la colección necesita al menos uno donde
 * el momento exacto mande, o el «banco» sólo mide una manera de pensar.
 *
 * TRES PUERTAS SOBRE EL MISMO NÚCLEO
 *   🤖 numérica  6 números, acción discreta 0..1
 *   🧠 lenguaje  `describe()` dice dónde está el hueco y a qué distancia
 *   🕹️ humana    `games/impulso.html` — ESPACIO o clic
 */
export class ImpulsoEnv extends GymEnv {
    static id = 'alisa/Impulso-v0';
    static Core = ImpulsoCore;

    /** Los números los pone la ROM; aquí sólo se dice cuál. */
    static ajustes = ImpulsoCore.ROM.mundo;

    static observationSpace = {
        shape: [6],
        names: ['altura', 'velocidad', 'muro_lejos', 'hueco_arriba', 'hueco_ancho', 'tiempo_restante'],
        low: -1, high: 1,
    };

    static actionSpace = {
        type: 'discrete',
        n: VERBS_IMPULSO.length,
        names: VERBS_IMPULSO,
        decodifica: '0 = dejarse caer · 1 = impulsar',
    };

    static meta = {
        title: '¡Impulso!',
        summary: 'Un botón. Caes siempre y subes al pulsar, y hay muros con un hueco que '
               + 'cambia de sitio. No hay nada que deducir: se ve todo. Lo único difícil '
               + 'es cuándo, y lo que separa a un piloto de otro es saberse su propio '
               + 'empujon — sube siempre lo mismo, así que apuntar al centro del hueco se '
               + 'sale por arriba justo esa cantidad.',
        horizon: 7200,
        tags: ['reflejos', 'fisica', 'un-boton', 'continuo', 'scroll'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = { ...new.target.ajustes, ...opts };
        this.nucleo = new ImpulsoCore(this.opts);
        this.steps = 0;
        this.done = false;
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.nucleo = new ImpulsoCore({ ...this.opts, seed: this.seed });
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
     * observación numérica — incluida la velocidad, que es la mitad del problema:
     * sin saber si subes o bajas, la altura sola no dice nada.
     */
    describe() {
        const n = this.nucleo;
        const i = n.info();
        const partes = [
            `Vas a ${i.altura} de altura en un pasillo de ${i.alto}, y ${i.subiendo ? 'subiendo' : 'cayendo'}.`,
        ];
        if (i.lejos === null) partes.push('No hay ningún muro a la vista todavía.');
        else {
            const donde = i.hueco > 0.3 ? `${i.hueco.toFixed(1)} por encima de ti`
                : i.hueco < -0.3 ? `${(-i.hueco).toFixed(1)} por debajo de ti`
                    : 'justo a tu altura';
            partes.push(`El siguiente muro está a ${i.lejos} y su hueco queda ${donde}.`);
        }
        partes.push(`Llevas ${i.pasados} muros pasados y ${i.t} segundos de los ${i.tope}.`);
        if (i.terminado) partes.push(i.ganado ? '¡Aguantaste!' : `Se acabó: te fuiste ${i.motivo}.`);
        return partes.join(' ');
    }

    /**
     * ⚠️ AQUÍ SIEMPRE SE PUEDEN LAS DOS, Y NO ES QUE ESTÉ SIN TERMINAR.
     *
     * En los otros entornos esta lista recorta —`buscar` no aparece si no tienes
     * nada al alcance— porque ofrecer lo que no sirve manda al piloto a gastar
     * pasos en el vacío. Aquí no hay nada que recortar: impulsar siempre es legal
     * y siempre hace lo mismo. Que la lista sea corta y constante ES el juego.
     */
    affordances() {
        const n = this.nucleo;
        if (n.terminado()) return [{ verb: 'nada', label: 'Se acabó', action: 0 }];
        return [
            { verb: 'nada', label: 'Dejarte caer', action: 0 },
            { verb: 'impulsar', label: 'Impulsar (subes de golpe)', action: 1 },
        ];
    }

    actFromVerb(verb) {
        const i = VERBS_IMPULSO.indexOf(verb);
        return i < 0 ? 0 : i;
    }

    getScore() {
        const i = this.nucleo.info();
        return {
            score: i.pasados,
            metrics: {
                muros: i.pasados, segundos: i.t, motivo: i.motivo,
                aguanto: i.ganado, pasos: this.steps,
            },
        };
    }
}

export default ImpulsoEnv;
