import { ECSWorld } from '../OverworldECS.js';
import { mulberry32 } from '../core/DeterministicScope.js';
import { DefiendeMapaFactory, CELDA } from '../factories/DefiendeMapaFactory.js';

/**
 * ¡DEFIENDE! — TOWER DEFENSE SOBRE MATRIZ PLANA, EN ECS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es el primer juego de la casa que NACE en ECS, y es a propósito: sirve de
 * piloto de la arquitectura antes de decidir si se migra el resto. Los cinco
 * motores completos que ya hay llevan su estado a mano; aquí el estado son
 * entidades y componentes, que es lo que defiende el proyecto:
 *
 *   **al modelo se le entrega el mundo YA en forma de matriz plana** — dónde
 *   está cada cosa y qué es — en vez de la vía de la industria, que es que un
 *   modelo de visión reconstruya la matriz a partir de una imagen. Traducir el
 *   mundo a matriz es trabajo del motor.
 *
 * ⚠️ Y NO ES UN MOTOR NUEVO: ES UN ENSAMBLAJE
 * Cada pieza ya existía suelta en el árbol, y ninguna tenía juego encima:
 *
 *   caminos sobre rejilla   `CarverEntitySystem`  — andar `grid[z][x]` por vecinos
 *   oleadas con tipos       `AsteroidsSystem`     — tabla declarativa de fases
 *   disparo e impactos      `TurretCombatSystem`  — torretas, balas, colisiones
 *   elegir mejora de tres   `BulletHeavenEngine`  — el patrón de la decisión cara
 *   presupuesto que se gasta `EnergySystem`       — lo único que ya era ECS
 *
 * `CarverEntitySystem` estaba clasificado como «ninguna decisión posible»: 2,8 KB
 * de ambientación autónoma, candidato a borrar. Resulta que era justo la capa de
 * caminos sobre matriz que pedía la tesis. El motor que parecía más muerto es el
 * que hace posible el juego más complejo.
 *
 * QUÉ MIDE QUE OTROS NO
 * ¡Busca! mide deducción con presupuesto de viaje. Marabunta, supervivencia y
 * construcción de build. Aquí se mide **colocación**: dónde gastas un presupuesto
 * limitado sobre una matriz, sabiendo por dónde va a venir el enemigo y que lo
 * que construyes se queda quieto. Es planificación espacial con información
 * completa — el eje que le falta al banco.
 */

/**
 * El alfabeto del mundo vive en la factoría, que es quien lo escribe. Se
 * re-exporta para que quien use el motor no tenga que saber de dónde sale — pero
 * hay UNA definición, no dos. Dos alfabetos que se creen el mismo es la forma
 * favorita que tiene este proyecto de separarse por la mitad sin dar un error.
 */
export { CELDA };

/**
 * Los tres tiers de torreta. La decisión de la partida es cuál pones y dónde,
 * y por eso los tres son buenos en cosas distintas y no uno mejor que otro:
 *
 *   guijarro  barata y corta — muchas, pegadas al camino
 *   pértiga   cara y larga   — pocas, cubren curvas enteras
 *   yunque    lenta y fuerte — mata lo gordo, deja pasar lo rápido
 */
export const TORRETAS = [
    { id: 'guijarro', nombre: '🪨 Guijarro', coste: 20, alcance: 2.5, dmg: 4,  cadencia: 0.6 },
    { id: 'pertiga',  nombre: '🎣 Pértiga',  coste: 45, alcance: 5.0, dmg: 5,  cadencia: 1.1 },
    { id: 'yunque',   nombre: '🔨 Yunque',   coste: 70, alcance: 2.0, dmg: 22, cadencia: 2.2 },
];

/**
 * Las oleadas, en tabla declarativa como las de `AsteroidsSystem`. Cada una dice
 * qué manda y cada cuánto; el motor no sabe nada más de ellas.
 *
 * `rapido` existe para que el yunque no sea la respuesta a todo: pega fuerte pero
 * dispara cada 2,2 s, así que un enjambre veloz se le cuela entre disparo y
 * disparo. Sin algo así, la elección de tier no sería una elección.
 */
/**
 * ⚠️ LOS PREMIOS SON BAJOS A PROPÓSITO, Y LOS BAJÉ MIDIENDO.
 *
 * Con los primeros (6/7/18) un jugador competente terminaba la partida con
 * **41 torretas** puestas: la economía daba para alfombrar el mapa, así que se
 * ganaba el 100% de las veces y la pregunta del juego pasaba de «¿dónde lo
 * pones?» a «¿tienes presupuesto?». Y abajo tampoco distinguía: una política
 * tonta y una al azar empataban (42% y 46%), que es la señal de que el entorno
 * no mide a nadie.
 *
 * Barrido de premios × presupuesto inicial, 24 semillas, tres políticas:
 *
 *     premio ×1,0 · 60   buena 100%  tonta 42%  azar 46%   41 torretas
 *     premio ×0,6 · 60   buena 100%  tonta 25%  azar  4%   26 torretas
 *     premio ×0,4 · 40   buena  75%  tonta 13%  azar  0%   17 torretas
 *     premio ×0,3 · 40   buena  71%  tonta  8%  azar  0%   13 torretas
 *
 * Con ×0,4 el presupuesto aprieta de verdad y las tres políticas se separan.
 */
export const TIPOS = {
    peon:   { hp: 18,  vel: 1.6, premio: 2, nombre: '🐜 Peón' },
    rapido: { hp: 10,  vel: 3.2, premio: 3, nombre: '🦗 Rápido' },
    gordo:  { hp: 70,  vel: 1.0, premio: 7, nombre: '🪲 Gordo' },
};

export const OLEADAS = [
    { n: 1, dura: 18, cada: 1.8, mezcla: { peon: 1.0 } },
    { n: 2, dura: 20, cada: 1.5, mezcla: { peon: 0.7, rapido: 0.3 } },
    { n: 3, dura: 22, cada: 1.3, mezcla: { peon: 0.5, rapido: 0.4, gordo: 0.1 } },
    { n: 4, dura: 24, cada: 1.0, mezcla: { peon: 0.4, rapido: 0.4, gordo: 0.2 } },
    { n: 5, dura: 26, cada: 0.8, mezcla: { peon: 0.3, rapido: 0.4, gordo: 0.3 } },
];

/**
 * ⚠️ EL ORDEN DE LOS SISTEMAS ES ESTADO, Y AQUÍ SE DECLARA.
 *
 * Es el riesgo propio de ECS y no lo tiene ningún motor de estado propio: allí
 * el orden está escrito dentro de un `step()` y se lee de un vistazo. Aquí lo
 * decide quien registra los sistemas, así que **cambiar el orden de registro
 * cambia la partida con la misma semilla** — y no daría ningún error.
 *
 * Ejemplo real de por qué importa: si `bajas` corriera antes que `balas`, un
 * atacante muerto este tick seguiría vivo para las balas de este tick y se
 * gastarían dos disparos en él. La partida seguiría "funcionando".
 *
 * Se declara aquí, en un sitio, y `prueba_defiende.mjs` comprueba que el mundo
 * los tiene registrados en este orden exacto.
 */
export const ORDEN_SISTEMAS = ['oleadas', 'ruta', 'torretas', 'balas', 'bajas'];

export class DefiendeSystem {
    constructor(opts = {}) {
        this.lado = opts.lado ?? 12;              // matriz lado × lado
        this.vidasIniciales = opts.vidas ?? 10;
        // 40 y no 60: poder comprar el yunque de entrada resulta ser una TRAMPA.
        // Medido, con premios x0,4: con 60 de salida se gana el 63% y con 40 el 75%.
        this.presupuestoInicial = opts.presupuesto ?? 40;
        this.tope = opts.tope ?? 7200;            // 120 s a 60 Hz

        /**
         * El terreno lo hace la factoría, no las reglas. Se puede cambiar por otra
         * —así será cada etapa de la saga: otro trazado, mismo juego— sin tocar
         * nada de esto.
         */
        this.fabrica = opts.fabrica ?? new DefiendeMapaFactory();

        /**
         * ⚠️ EL RESPALDO ES UNA LLAMADA, NO UNA REFERENCIA.
         * `config.rng || Math.random` captura la función global al construir, así
         * que un parche posterior no llega. Ese `||` ya cambió las notas
         * publicadas de Marabunta una vez; aquí se nace con la lección puesta.
         */
        this._semilla = (opts.seed ?? 42) >>> 0;
        this._rngPropio = mulberry32(this._semilla);
        this.rng = opts.rng ? (() => opts.rng()) : (() => this._rngPropio());

        this.reset(this._semilla);
    }

    reset(semilla = this._semilla) {
        this._semilla = semilla >>> 0;
        this._rngPropio = mulberry32(this._semilla);
        const rnd = this.rng;

        this.mundo = new ECSWorld();
        this.t = 0;
        this.terminada = false;
        this.ganada = false;
        this.vidas = this.vidasIniciales;
        this.presupuesto = this.presupuestoInicial;
        this.puntos = 0;
        this.bajas = 0;
        this.coladas = 0;
        this.oleada = 0;
        this.tOleada = 0;
        this.acumSpawn = 0;
        this.eventos = [];
        this._idBala = 0;

        const mapa = this.fabrica.trazar(this.lado, rnd);
        this.rejilla = mapa.rejilla;
        this.camino = mapa.camino;
        this.entrada = mapa.entrada;
        this.nucleo = mapa.nucleo;
        this._registrarSistemas();
        return this.observacion();
    }

    /**
     * EL CAMINO SE TRAZA SOBRE LA MATRIZ, POR TRAMOS EN L ENTRE PUNTOS DE PASO.
     *
     * Dos reglas que no son estéticas:
     *
     *   1. **siempre hay camino**. Cada tramo es monótono hacia su punto de paso,
     *      así que nunca se atasca. Un laberinto sembrado puede quedar cerrado, y
     *      un tower defense sin ruta no es difícil: es imposible, y la partida no
     *      lo diría — los atacantes simplemente no llegarían nunca.
     *   2. **el jugador ve el camino entero desde el principio**. Aquí no se mide
     *      adivinar por dónde vienen: se mide DÓNDE PONES lo que tienes. Esconder
     *      la ruta convertiría el juego en otra cosa.
     */
    // ─── LA JUGADA ────────────────────────────────────────────────────────

    /**
     * Construir es la única decisión del juego. Devuelve por qué NO se pudo, en
     * vez de fallar en silencio: un clic que no hace nada y no explica por qué es
     * la clase de silencio que en este proyecto siempre acaba siendo un fallo
     * que nadie ve.
     */
    construir(idTorreta, x, z) {
        const t = TORRETAS.find(t => t.id === idTorreta);
        if (!t) return { ok: false, motivo: `no existe la torreta "${idTorreta}"` };
        if (this.terminada) return { ok: false, motivo: 'la partida ha terminado' };
        if (x < 0 || x >= this.lado || z < 0 || z >= this.lado) {
            return { ok: false, motivo: 'esa celda está fuera de la matriz' };
        }
        const celda = this.rejilla[z][x];
        if (celda !== CELDA.LIBRE) {
            const nombre = { [CELDA.CAMINO]: 'el camino', [CELDA.NUCLEO]: 'el núcleo',
                             [CELDA.ENTRADA]: 'la entrada', [CELDA.TORRETA]: 'otra torreta' }[celda];
            return { ok: false, motivo: `ahí está ${nombre}` };
        }
        if (this.presupuesto < t.coste) {
            return { ok: false, motivo: `cuesta ${t.coste} y tienes ${Math.floor(this.presupuesto)}` };
        }

        this.presupuesto -= t.coste;
        this.rejilla[z][x] = CELDA.TORRETA;
        const e = this.mundo.createEntity();
        this.mundo.addComponent(e, 'Celda', { x, z });
        this.mundo.addComponent(e, 'Torreta', { ...t, timer: 0 });
        this.eventos.push({ tipo: 'CONSTRUIDA', torreta: t.id, x, z });
        return { ok: true, entidad: e };
    }

    /** Lo que se puede construir AHORA: cabe en el presupuesto y hay dónde. */
    construibles() {
        if (this.terminada) return [];
        return TORRETAS.filter(t => t.coste <= this.presupuesto).map(t => t.id);
    }

    /** Las celdas donde cabe una torreta. Es la matriz, filtrada. */
    celdasLibres() {
        const out = [];
        for (let z = 0; z < this.lado; z++) {
            for (let x = 0; x < this.lado; x++) {
                if (this.rejilla[z][x] === CELDA.LIBRE) out.push({ x, z });
            }
        }
        return out;
    }

    // ─── LOS SISTEMAS, EN EL ORDEN DECLARADO ──────────────────────────────

    _registrarSistemas() {
        this._sistemas = {
            oleadas:  (w, _, dt) => this._sisOleadas(w, dt),
            ruta:     (w, es, dt) => this._sisRuta(w, es, dt),
            torretas: (w, es, dt) => this._sisTorretas(w, es, dt),
            balas:    (w, es, dt) => this._sisBalas(w, es, dt),
            bajas:    (w, es, dt) => this._sisBajas(w, es, dt),
        };
        const consultas = {
            oleadas: [], ruta: ['Celda', 'Ruta', 'Atacante'],
            torretas: ['Celda', 'Torreta'], balas: ['Punto', 'Bala'],
            bajas: ['Atacante'],
        };
        for (const nombre of ORDEN_SISTEMAS) {
            this.mundo.addSystem(this._sistemas[nombre], consultas[nombre]);
        }
    }

    _sisOleadas(w, dt) {
        if (this.oleada >= OLEADAS.length) return;
        const ola = OLEADAS[this.oleada];
        this.tOleada += dt;
        this.acumSpawn += dt;
        while (this.acumSpawn >= ola.cada) {
            this.acumSpawn -= ola.cada;
            this._soltarAtacante(ola);
        }
        if (this.tOleada >= ola.dura) {
            this.oleada++;
            this.tOleada = 0;
            this.eventos.push({ tipo: 'OLEADA', n: this.oleada + 1 });
        }
    }

    _soltarAtacante(ola) {
        const r = this.rng();
        let acc = 0, tipo = 'peon';
        for (const [k, p] of Object.entries(ola.mezcla)) {
            acc += p;
            if (r <= acc) { tipo = k; break; }
        }
        const t = TIPOS[tipo];
        const e = this.mundo.createEntity();
        this.mundo.addComponent(e, 'Celda', { x: this.entrada.x, z: this.entrada.z });
        this.mundo.addComponent(e, 'Ruta', { paso: 0, avance: 0 });
        this.mundo.addComponent(e, 'Atacante', { tipo, hp: t.hp, hpMax: t.hp, vel: t.vel, premio: t.premio });
    }

    /** Andar la matriz: `avance` interpola entre celda y celda, como en Carver. */
    _sisRuta(w, entidades, dt) {
        for (const id of entidades) {
            const r = w.getComponent(id, 'Ruta');
            const a = w.getComponent(id, 'Atacante');
            const c = w.getComponent(id, 'Celda');
            r.avance += a.vel * dt;
            while (r.avance >= 1) {
                r.avance -= 1;
                r.paso++;
                if (r.paso >= this.camino.length) {
                    // Ha llegado al núcleo: cuesta una vida y desaparece.
                    this.vidas--;
                    this.coladas++;
                    this.eventos.push({ tipo: 'COLADA', tipoAtacante: a.tipo, vidas: this.vidas });
                    w.destroyEntity(id);
                    if (this.vidas <= 0) { this.terminada = true; }
                    break;
                }
                const p = this.camino[r.paso];
                c.x = p.x; c.z = p.z;
            }
        }
    }

    _sisTorretas(w, entidades, dt) {
        const atacantes = w.query(['Celda', 'Atacante']);
        for (const id of entidades) {
            const t = w.getComponent(id, 'Torreta');
            const c = w.getComponent(id, 'Celda');
            t.timer -= dt;
            if (t.timer > 0) continue;

            // El más adelantado dentro del alcance: dejar pasar al que va a
            // llegar es peor que rematar al que acaba de entrar.
            let objetivo = null, mejorPaso = -1;
            for (const a of atacantes) {
                const ca = w.getComponent(a, 'Celda');
                const d = Math.hypot(ca.x - c.x, ca.z - c.z);
                if (d > t.alcance) continue;
                const paso = w.getComponent(a, 'Ruta').paso;
                if (paso > mejorPaso) { mejorPaso = paso; objetivo = a; }
            }
            if (objetivo === null) continue;

            t.timer = t.cadencia;
            const b = w.createEntity();
            w.addComponent(b, 'Punto', { x: c.x, z: c.z });
            w.addComponent(b, 'Bala', { dmg: t.dmg, objetivo, vel: 12, vida: 2 });
            this.eventos.push({ tipo: 'DISPARO', x: c.x, z: c.z, torreta: t.id });
        }
    }

    _sisBalas(w, entidades, dt) {
        for (const id of entidades) {
            const b = w.getComponent(id, 'Bala');
            const p = w.getComponent(id, 'Punto');
            const co = w.getComponent(b.objetivo, 'Celda');
            b.vida -= dt;
            // Si el objetivo ya no está, la bala se pierde: no se reasigna sola.
            // Reasignar sería regalar puntería que la torreta no tiene.
            if (!co || b.vida <= 0) { w.destroyEntity(id); continue; }

            const dx = co.x - p.x, dz = co.z - p.z;
            const d = Math.hypot(dx, dz) || 1;
            const paso = b.vel * dt;
            if (paso >= d) {
                const a = w.getComponent(b.objetivo, 'Atacante');
                if (a) {
                    a.hp -= b.dmg;
                    this.eventos.push({ tipo: 'IMPACTO', objetivo: b.objetivo, dmg: b.dmg });
                }
                w.destroyEntity(id);
                continue;
            }
            p.x += (dx / d) * paso;
            p.z += (dz / d) * paso;
        }
    }

    _sisBajas(w, entidades) {
        for (const id of entidades) {
            const a = w.getComponent(id, 'Atacante');
            if (a.hp > 0) continue;
            this.presupuesto += a.premio;
            this.puntos += a.premio;
            this.bajas++;
            this.eventos.push({ tipo: 'BAJA', tipo_: a.tipo, premio: a.premio });
            w.destroyEntity(id);
        }
    }

    // ─── EL TICK ──────────────────────────────────────────────────────────

    step(dt = 1 / 60) {
        if (this.terminada) return { obs: this.observacion(), reward: 0, done: true, info: this.info() };
        this.eventos = [];
        const vidasAntes = this.vidas, puntosAntes = this.puntos;

        this.mundo.tick(dt);
        this.t += dt;

        // Se gana sobreviviendo a todas las oleadas y limpiando lo que quede.
        if (this.oleada >= OLEADAS.length && this.mundo.query(['Atacante']).length === 0) {
            this.terminada = true;
            this.ganada = true;
            this.puntos += this.vidas * 25;
        }
        if (this.t * 60 >= this.tope) this.terminada = true;

        const reward = (this.puntos - puntosAntes) + (this.vidas - vidasAntes) * 30
                     + (this.ganada ? 200 : 0);
        return { obs: this.observacion(), reward, done: this.terminada, info: this.info() };
    }

    terminado() { return this.terminada; }

    info() {
        return {
            t: this.t, vidas: this.vidas, presupuesto: Math.floor(this.presupuesto),
            oleada: Math.min(this.oleada + 1, OLEADAS.length), oleadas: OLEADAS.length,
            bajas: this.bajas, coladas: this.coladas, puntos: this.puntos,
            atacantes: this.mundo.query(['Atacante']).length,
            torretas: this.mundo.query(['Torreta']).length,
            ganada: this.ganada,
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LA OBSERVACIÓN ES LA MATRIZ. NO UNA DESCRIPCIÓN DE ELLA.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Aquí es donde ECS paga. En los motores de estado propio, cada entorno se
     * fabrica su vector a mano —24 números en ¡Busca!, 64 en Marabunta— y ahí es
     * justo donde hoy encontré que `escaner_listo` le mentía a la puerta numérica
     * mientras la de lenguaje decía la verdad. Un vector escrito a mano es un
     * sitio donde el estado y su copia pueden separarse.
     *
     * Esto no se escribe a mano: se RECORRE el mundo. `rejilla` es el terreno y
     * `entidades` es lo que se mueve encima, sacado de las mismas consultas que
     * usan los sistemas. Si mañana aparece un componente nuevo, sale aquí sin que
     * nadie se acuerde de añadirlo.
     */
    observacion() {
        const w = this.mundo;
        const entidades = [];
        for (const id of w.query(['Celda', 'Atacante'])) {
            const c = w.getComponent(id, 'Celda'), a = w.getComponent(id, 'Atacante');
            const r = w.getComponent(id, 'Ruta');
            entidades.push({ que: 'atacante', tipo: a.tipo, x: c.x, z: c.z,
                             hp: a.hp, hpMax: a.hpMax, paso: r.paso, pasos: this.camino.length });
        }
        for (const id of w.query(['Celda', 'Torreta'])) {
            const c = w.getComponent(id, 'Celda'), t = w.getComponent(id, 'Torreta');
            entidades.push({ que: 'torreta', tipo: t.id, x: c.x, z: c.z, alcance: t.alcance });
        }
        return {
            lado: this.lado,
            rejilla: this.rejilla.map(f => f.slice()),
            camino: this.camino,
            nucleo: this.nucleo,
            entidades,
            vidas: this.vidas,
            presupuesto: Math.floor(this.presupuesto),
            oleada: Math.min(this.oleada + 1, OLEADAS.length),
            oleadas: OLEADAS.length,
            construibles: this.construibles(),
        };
    }
}
