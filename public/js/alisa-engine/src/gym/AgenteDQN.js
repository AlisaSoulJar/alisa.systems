/**
 * AgenteDQN.js — la línea base que APRENDE, en un fichero y sin dependencias
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { AgenteDQN } from '@alisa-engine/src/gym/AgenteDQN.js';
 *     const agente = new AgenteDQN({ obs: 6, acciones: 2, semilla: 42 });
 *     const r = await agente.entrenar(EntornoClase, { episodios: 40 });
 *
 * POR QUÉ EXISTE, Y POR QUÉ ESTÁ ESCRITA A MANO
 *
 * El banco tiene políticas escritas a mano, una FSM y modelos de lenguaje. No
 * tiene **ningún agente entrenado**, y eso deja la clasificación sin su punto de
 * referencia más informativo: cuánto de lo que separa a un jugador de otro se
 * puede aprender de la propia partida.
 *
 * Había un intento —`world/systems/ml_dqn_idm.js` y `js/gym_runners/dqn_gym.js`—
 * y los dos importaban `@tensorflow/tfjs`. Medido: tfjs no está en las
 * dependencias del proyecto (son cuatro: playwright-core, three, vite, wrangler)
 * ni en `node_modules`, así que ninguno de los dos ha corrido nunca. Y el de
 * `gym_runners` ni siquiera aprendía de un entorno: ajustaba un perceptrón a 500
 * filas de datos inventados con `Math.random`, y se llamaba «Deep Q-Network» sin
 * tener entorno, ni acciones, ni recompensas, ni ecuación de Bellman.
 *
 * ⚠️ LO QUE SE HACE FUERA, QUE ES LO QUE DECIDIÓ ESTO.
 *
 * En Gymnasium, ALE, Procgen o MuJoCo el ENTORNO no depende de ningún marco de
 * aprendizaje —`gymnasium` depende sólo de numpy— y los aprendices van en
 * paquetes aparte. Esa separación es justo lo que permite enchufar cualquier
 * framework al mismo entorno, que es la promesa entera de un banco de pruebas.
 *
 * Y las líneas base de referencia —CleanRL es el ejemplo— se publican como **un
 * fichero por algoritmo, legible de arriba abajo, sin capas de abstracción**,
 * precisamente para que se puedan auditar.
 *
 * Aquí eso pesa doble: `preflight` prohíbe cargar código desde un CDN, así que
 * meter tfjs significaría meter megabytes de marco de aprendizaje en un sitio
 * estático para entrenar una red de tres capas. Una red densa con
 * retropropagación son ochenta líneas, y este proyecto ya escribe a mano sus
 * reglas, sus pintores y su generador de azar.
 *
 * ⚠️ QUÉ NO ES ESTO, Y CONVIENE LEERLO ANTES DE CITAR SUS NÚMEROS.
 *
 * No es una implementación competitiva ni pretende serlo: es un SUELO, y con el
 * presupuesto que cabe en una suite —unas decenas de miles de pasos— aprende en
 * unos entornos y en otros no. Medido contra el azar sobre las mismas semillas,
 * 40 episodios de evaluación tras 60 de entrenamiento:
 *
 *      RaccoonSpace   azar -24,90  ·  entrenado  0,00   → +24,90
 *      Submarine      azar   1,67  ·  entrenado  1,67   →   igual
 *      Impulso        azar  -1,00  ·  entrenado -1,00   →   igual
 *      DroneTower     azar   6,32  ·  entrenado  4,50   →  -1,82
 *
 * O sea: **todavía no gana en todos**, y por eso NO está enchufado a la
 * clasificación. Publicar «el DQN saca 4,50 en DroneTower» como propiedad del
 * entorno sería contar lo poco que lo hemos entrenado y llamarlo dificultad del
 * juego. Un DQN de referencia necesita del orden de 10^5–10^6 pasos; aquí caben
 * 10^4. Lo que sí vale desde ya es lo contrario: donde ESTO gana a un modelo de
 * lenguaje, el entorno no está midiendo lo que creemos que mide.
 */

/**
 * ⚠️ TODO SE SIEMBRA, INCLUIDA LA INICIALIZACIÓN DE LOS PESOS.
 *
 * Una red que arranca con pesos al azar del sistema da una curva distinta cada
 * vez, y entonces «el DQN sacó 340 puntos» no es un dato, es una anécdota. El
 * banco entero descansa en que `{juego, semilla, jugadas}` reproduce la partida.
 *
 * ⚠️ Y SE IMPORTA, NO SE COPIA. Escribí aquí mi propio `mulberry32` —son seis
 *    líneas, parecía inofensivo— y `prueba_azar.mjs` lo cazó al instante: lleva
 *    un techo de ficheros que copian la fórmula en vez de importarla, y subió de
 *    nueve a diez. Su mensaje era literal: «impórtalo de `DeterministicScope.js`,
 *    no subas el techo». Dos copias de un generador son dos secuencias distintas
 *    el día que alguien toque una, y entonces las semillas dejan de significar lo
 *    mismo en los dos sitios.
 */
import { mulberry32 } from '../world/core/DeterministicScope.js';

/**
 * Una capa densa. Pesos en un array plano por velocidad y por poder copiarla de
 * un tirón: la red objetivo se hace clonando números, no objetos.
 */
class Capa {
    constructor(entradas, salidas, rnd, relu = true) {
        this.entradas = entradas;
        this.salidas = salidas;
        this.relu = relu;
        this.w = new Float64Array(entradas * salidas);
        this.b = new Float64Array(salidas);
        // Inicialización de He: la varianza que no apaga ni satura una ReLU.
        const escala = Math.sqrt(2 / entradas);
        for (let i = 0; i < this.w.length; i++) {
            // Box-Muller a partir del generador sembrado.
            const u = Math.max(rnd(), 1e-12), v = rnd();
            this.w[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * escala;
        }
    }

    adelante(x) {
        const y = new Float64Array(this.salidas);
        for (let j = 0; j < this.salidas; j++) {
            let s = this.b[j];
            const fila = j * this.entradas;
            for (let i = 0; i < this.entradas; i++) s += this.w[fila + i] * x[i];
            y[j] = this.relu && s < 0 ? 0 : s;
        }
        this.ultimaEntrada = x;
        this.ultimaSalida = y;
        return y;
    }

    /** Retropropaga: aplica el gradiente y devuelve el de la capa anterior. */
    atras(dSalida, paso) {
        const dEntrada = new Float64Array(this.entradas);
        for (let j = 0; j < this.salidas; j++) {
            // La ReLU corta el gradiente donde no dejó pasar la señal.
            let d = dSalida[j];
            if (this.relu && this.ultimaSalida[j] === 0) d = 0;
            if (d === 0) continue;
            const fila = j * this.entradas;
            for (let i = 0; i < this.entradas; i++) {
                dEntrada[i] += this.w[fila + i] * d;
                this.w[fila + i] -= paso * d * this.ultimaEntrada[i];
            }
            this.b[j] -= paso * d;
        }
        return dEntrada;
    }

    copiarDe(otra) { this.w.set(otra.w); this.b.set(otra.b); }
}

/** Una red densa de tres capas: obs → oculta → oculta → un valor por acción. */
class Red {
    constructor(entradas, salidas, oculta, rnd) {
        this.capas = [
            new Capa(entradas, oculta, rnd, true),
            new Capa(oculta, oculta, rnd, true),
            new Capa(oculta, salidas, rnd, false),
        ];
    }
    adelante(x) { return this.capas.reduce((v, c) => c.adelante(v), x); }
    atras(d, paso) { for (let i = this.capas.length - 1; i >= 0; i--) d = this.capas[i].atras(d, paso); }
    copiarDe(otra) { this.capas.forEach((c, i) => c.copiarDe(otra.capas[i])); }
}

export class AgenteDQN {
    /**
     * @param obs        cuántos números trae la observación
     * @param acciones   cuántas acciones discretas hay
     * @param semilla    lo que hace repetible toda la corrida
     */
    /**
     * ⚠️ EL DESCENSO DE EPSILON ES LINEAL SOBRE EL TOTAL, Y LA PRIMERA VERSIÓN
     *    LO TENÍA MULTIPLICATIVO POR PASO. SE NOTÓ EN LA MEDIDA.
     *
     * Multiplicando por 0,995 en cada paso de APRENDIZAJE —que es cada paso del
     * entorno— epsilon llega al suelo en unos 600 pasos, o sea dentro de los tres
     * primeros episodios de una corrida de veinticuatro. El agente deja de
     * explorar casi antes de empezar y se queda con lo primero que creyó.
     *
     * Medido así en `DroneTower`: **11,64 los primeros episodios y −0,90 los
     * últimos**. No es que no aprendiera: es que aprendió algo peor que el azar y
     * luego se aferró a ello. Una línea base que empeora es peor que ninguna,
     * porque hace parecer difícil un entorno que no lo es.
     *
     * Lo que se hace fuera —CleanRL, y los DQN de referencia en general— es un
     * descenso LINEAL repartido sobre una fracción del entrenamiento total, no un
     * factor por paso. Así la exploración dura lo que tiene que durar
     * independientemente de cuántos pasos tenga el episodio.
     */
    constructor({ obs, acciones, semilla = 42, oculta = 32, paso = 0.002,
                  gamma = 0.97, memoria = 4000, lote = 32,
                  epsilon = 1.0, epsilonMin = 0.05, pasosExploracion = 2000,
                  cadaObjetivo = 200, recorte = 10 } = {}) {
        if (!(obs > 0) || !(acciones > 1)) {
            throw new Error(`[AgenteDQN] hacen falta obs>0 y acciones>1, y llegaron ${obs} y ${acciones}`);
        }
        this.rnd = mulberry32(semilla);
        this.obs = obs;
        this.acciones = acciones;
        this.q = new Red(obs, acciones, oculta, this.rnd);
        this.objetivo = new Red(obs, acciones, oculta, mulberry32(semilla));
        this.objetivo.copiarDe(this.q);
        Object.assign(this, { paso, gamma, memoria, lote, epsilonMin, pasosExploracion, cadaObjetivo, recorte });
        this.epsilonInicial = epsilon;
        this.epsilon = epsilon;
        this.vistos = 0;   // pasos de entorno, que es contra lo que baja epsilon
        this.recuerdos = [];
        this.pasos = 0;
    }

    /**
     * ⚠️ EPSILON-GREEDY, Y EL AZAR SALE DEL GENERADOR SEMBRADO.
     *
     * Explorar con `Math.random` haría irreproducible el entrenamiento entero,
     * que es el fallo que esta misma semana tenían doce de los veintidós arneses
     * del gimnasio.
     */
    elegir(observacion, explorar = true) {
        if (explorar && this.rnd() < this.epsilon) return Math.floor(this.rnd() * this.acciones);
        const q = this.q.adelante(observacion);
        let mejor = 0;
        for (let a = 1; a < this.acciones; a++) if (q[a] > q[mejor]) mejor = a;
        return mejor;
    }

    recordar(s, a, r, s2, fin) {
        this.vistos++;
        this.recuerdos.push({ s, a, r, s2, fin });
        if (this.recuerdos.length > this.memoria) this.recuerdos.shift();
    }

    /**
     * Un paso de aprendizaje sobre un lote del recuerdo.
     *
     * ⚠️ LA RED OBJETIVO NO ES UN ADORNO. Sin ella, el valor al que se apunta se
     *    mueve en cuanto se aprende, y la red persigue su propia sombra: los
     *    valores se disparan y no converge. Se copia cada `cadaObjetivo` pasos.
     */
    aprender() {
        if (this.recuerdos.length < this.lote) return null;
        let perdida = 0;
        for (let n = 0; n < this.lote; n++) {
            const m = this.recuerdos[Math.floor(this.rnd() * this.recuerdos.length)];
            const q = Array.from(this.q.adelante(m.s));
            let objetivo = m.r;
            if (!m.fin) {
                const q2 = this.objetivo.adelante(m.s2);
                let mejor = q2[0];
                for (let a = 1; a < this.acciones; a++) if (q2[a] > mejor) mejor = q2[a];
                objetivo += this.gamma * mejor;
            }
            const error = q[m.a] - objetivo;
            perdida += error * error;
            /**
             * ⚠️ EL RECORTE ERA 1 Y ESO BORRABA LOS PREMIOS GRANDES Y RAROS.
             *
             * Recortar el error del temporal-difference es lo estándar —es lo que
             * hace la pérdida de Huber— pero el valor del recorte tiene que estar
             * en la escala de las recompensas del entorno, y aquí las hay de
             * magnitud diez. Con el recorte en 1, un premio de +10 llega a la red
             * igual de fuerte que uno de +1, así que se pierde exactamente lo que
             * distingue una jugada buena de una normal.
             *
             * El agente aprendía entonces que «todo es levemente negativo» —el
             * coste por paso, que sí cabe en el recorte— y esquivaba lo único que
             * puntuaba. Medido en `DroneTower` con 60 episodios: −0,33 con recorte
             * 1 y **4,50 con recorte 10**, contra 6,32 del azar.
             *
             * No se quita el recorte: sin él, un premio aislado descuadra la red de
             * golpe. Se pone en la escala del juego.
             */
            const d = new Float64Array(this.acciones);
            d[m.a] = Math.max(-this.recorte, Math.min(this.recorte, error));
            this.q.adelante(m.s);
            this.q.atras(d, this.paso);
        }
        this.pasos++;
        if (this.pasos % this.cadaObjetivo === 0) this.objetivo.copiarDe(this.q);
        // Descenso lineal sobre los pasos de exploracion, no un factor por paso.
        const avance = Math.min(1, this.vistos / Math.max(1, this.pasosExploracion));
        this.epsilon = this.epsilonInicial + (this.epsilonMin - this.epsilonInicial) * avance;
        return perdida / this.lote;
    }
}

/**
 * Entrena contra cualquier entorno del gimnasio con acciones discretas — que son
 * 52 de los 54 del catálogo.
 *
 * ⚠️ DEVUELVE LA CURVA, NO SÓLO EL NÚMERO FINAL. Un único total no distingue
 *    «aprendió» de «tuvo suerte al final»: lo que dice si un entorno se puede
 *    aprender es que la recompensa de los últimos episodios supere a la de los
 *    primeros, y para verlo hace falta la serie.
 */
export async function entrenarEn(Entorno, {
    episodios = 30, pasosMax = 300, semilla = 42, dt = 1 / 60, agente = null,
} = {}) {
    const esp = Entorno.observationSpace ?? {};
    const acc = Entorno.actionSpace ?? {};
    const nObs = Array.isArray(esp.shape) ? esp.shape[0] : 0;
    const nAcc = acc.n ?? (Array.isArray(acc.shape) ? acc.shape[0] : 0);
    if (acc.type !== 'discrete') {
        throw new Error(`[AgenteDQN] ${Entorno.id} no tiene acciones discretas (${acc.type})`);
    }
    if (!(nObs > 0) || !(nAcc > 1)) {
        throw new Error(`[AgenteDQN] ${Entorno.id} declara obs=${nObs} y acciones=${nAcc}`);
    }

    /**
     * La exploración se reparte sobre la MITAD del entrenamiento. Así dura lo que
     * tiene que durar tanto si el episodio son diez pasos como si son mil, que es
     * lo que el factor por paso no sabía hacer.
     */
    const a = agente ?? new AgenteDQN({
        obs: nObs, acciones: nAcc, semilla,
        pasosExploracion: Math.max(200, Math.floor(episodios * pasosMax * 0.5)),
    });
    const env = new Entorno();
    const curva = [];

    for (let ep = 0; ep < episodios; ep++) {
        env.reset(semilla + ep);
        let s = Float64Array.from(env.getObservation());
        let total = 0;
        for (let t = 0; t < pasosMax; t++) {
            const accion = a.elegir(s, true);
            const paso = env.step(accion, dt);
            const r = Number(paso?.reward ?? paso?.recompensa ?? 0) || 0;
            const fin = !!(paso?.done ?? paso?.terminado ?? env.done);
            const s2 = Float64Array.from(env.getObservation());
            a.recordar(s, accion, r, s2, fin);
            a.aprender();
            total += r;
            s = s2;
            if (fin) break;
        }
        curva.push(total);
    }

    const media = (xs) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
    const tercio = Math.max(1, Math.floor(curva.length / 3));
    return {
        entorno: Entorno.id,
        episodios,
        curva,
        primeros: media(curva.slice(0, tercio)),
        ultimos: media(curva.slice(-tercio)),
        epsilon: a.epsilon,
        agente: a,
    };
}
