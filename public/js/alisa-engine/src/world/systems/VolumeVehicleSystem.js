/**
 * VolumeVehicleSystem.js — MOVERSE POR UN VOLUMEN CERRADO, CON INERCIA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const v = new VolumeVehicleSystem({ ancho: 120, alto: 112, largo: 120 });
 *     v.reset({ x: 40, y: 36, z: 40 }, { x: -10, y: 0, z: 10 });
 *     v.acelerar(v.bordes(12, 25), dt);   // no salirse
 *     v.acelerar(miEmpuje, dt);
 *     v.avanzar(dt);
 *
 * Una caja, una posición, una velocidad y un rozamiento. No sabe si es un
 * helicóptero, un submarino o un dron: eso lo pone quien lo use.
 *
 * ⚠️ POR QUÉ EXISTE: ES LO QUE COMPARTEN LAS DOS MITADES DE «CHOPPER AQUARIUM».
 *
 * Ese motor son dos juegos pegados —buscar en un edificio y sobrevivir en un
 * ecosistema— y al partirlos las dos mitades necesitan lo mismo: un bicho con
 * inercia dentro de una caja. Sin esta pieza habría que copiar treinta y cinco
 * líneas de física en los dos sitios, y una física copiada es una física que se
 * separa: el submarino frenaría distinto que el dron sin que nadie lo decidiera.
 *
 * ⚠️ Y LA CUENTA ES LA DEL MOTOR VIEJO, PASO POR PASO.
 *
 * El orden importa y no es el «natural»: primero se acumula aceleración, luego
 * se integra, DESPUÉS se aplica rozamiento, después se recorta la velocidad
 * máxima, y sólo entonces se mueve un punto de seguimiento al que la posición
 * persigue con suavizado. Ese último rodeo es lo que le da el balanceo — sin él
 * el bicho va clavado y parece otro juego.
 *
 * Cambiar cualquiera de esos pasos de sitio da otra trayectoria con la misma
 * semilla, y `ChopperAquarium` es una etapa que el banco mide. Se copia la
 * cuenta tal cual y se comprueba con `prueba_huella`.
 */

export class VolumeVehicleSystem {
    /**
     * @param {Object} [cfg]
     * @param {number} [cfg.ancho=120]      caja en X
     * @param {number} [cfg.alto=112]       caja en Y (desde 0 hacia arriba)
     * @param {number} [cfg.largo=120]      caja en Z
     * @param {number} [cfg.velMax=25]      recorte de velocidad
     * @param {number} [cfg.rozamiento=0.95] cuánto se conserva por tick
     * @param {number} [cfg.suavizado=6]    con qué ganas persigue la posición
     *                                      a su punto de seguimiento
     */
    constructor(cfg = {}) {
        this.ancho = cfg.ancho ?? 120;
        this.alto = cfg.alto ?? 112;
        this.largo = cfg.largo ?? 120;
        this.velMax = cfg.velMax ?? 25;
        this.rozamiento = cfg.rozamiento ?? 0.95;
        this.suavizado = cfg.suavizado ?? 6.0;

        this.pos = { x: 0, y: 0, z: 0, giro: 0 };
        this.vel = { x: 0, y: 0, z: 0 };
        this.seguimiento = { x: 0, y: 0, z: 0 };
    }

    reset(pos = { x: 0, y: 0, z: 0 }, vel = { x: 0, y: 0, z: 0 }) {
        this.pos = { x: pos.x, y: pos.y, z: pos.z, giro: pos.giro ?? 0 };
        this.vel = { x: vel.x, y: vel.y, z: vel.z };
        this.seguimiento = { x: pos.x, y: pos.y, z: pos.z };
    }

    /** Longitud de un vector. Sin THREE: esto tiene que correr en el banco. */
    static largoDe(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }

    /** Normaliza en el sitio y lo devuelve. Un vector nulo se queda nulo. */
    static normalizar(v) {
        const l = VolumeVehicleSystem.largoDe(v);
        if (l > 0) { v.x /= l; v.y /= l; v.z /= l; }
        return v;
    }

    /**
     * La aceleración que hace falta para no salirse de la caja.
     *
     * Se devuelve en vez de aplicarse para que quien la use pueda sumarla a lo
     * suyo y decidir el orden. Un sistema que empuja por su cuenta es un sistema
     * que pelea con el piloto.
     */
    bordes(margen = 12, fuerza = 25) {
        const a = { x: 0, y: 0, z: 0 };
        if (this.pos.x < -this.ancho / 2 + margen) a.x += fuerza;
        if (this.pos.x > this.ancho / 2 - margen) a.x -= fuerza;
        if (this.pos.z < -this.largo / 2 + margen) a.z += fuerza;
        if (this.pos.z > this.largo / 2 - margen) a.z -= fuerza;
        if (this.pos.y < margen) a.y += fuerza;
        if (this.pos.y > this.alto - margen) a.y -= fuerza;
        return a;
    }

    /** Aleja del centro: útil cuando en medio hay algo que no se atraviesa. */
    lejosDelCentro(radio, fuerza) {
        const d = Math.sqrt(this.pos.x * this.pos.x + this.pos.z * this.pos.z);
        if (d >= radio) return { x: 0, y: 0, z: 0 };
        const p = VolumeVehicleSystem.normalizar({ x: this.pos.x, y: 0, z: this.pos.z });
        return { x: p.x * fuerza, y: 0, z: p.z * fuerza };
    }

    /** Integra una aceleración. Varias llamadas se suman, como debe ser. */
    acelerar(acc, dt) {
        this.vel.x += (acc.x ?? 0) * dt;
        this.vel.y += (acc.y ?? 0) * dt;
        this.vel.z += (acc.z ?? 0) * dt;
    }

    /** Frena de golpe una fracción — para los momentos de «pararse a mirar». */
    frenar(factor) {
        this.vel.x *= factor; this.vel.y *= factor; this.vel.z *= factor;
    }

    /**
     * Rozamiento, recorte y movimiento. En ESTE orden: ver la nota de arriba.
     */
    avanzar(dt) {
        this.vel.x *= this.rozamiento;
        this.vel.y *= this.rozamiento;
        this.vel.z *= this.rozamiento;

        const v2 = this.vel.x * this.vel.x + this.vel.y * this.vel.y + this.vel.z * this.vel.z;
        if (v2 > this.velMax * this.velMax) {
            const f = this.velMax / Math.sqrt(v2);
            this.vel.x *= f; this.vel.y *= f; this.vel.z *= f;
        }

        this.seguimiento.x += this.vel.x * dt;
        this.seguimiento.y += this.vel.y * dt;
        this.seguimiento.z += this.vel.z * dt;

        this.pos.x += (this.seguimiento.x - this.pos.x) * this.suavizado * dt;
        this.pos.y += (this.seguimiento.y - this.pos.y) * this.suavizado * dt;
        this.pos.z += (this.seguimiento.z - this.pos.z) * this.suavizado * dt;
    }

    /** La pieza de sustrato del propio vehículo, con su velocidad dentro. */
    pieza({ t = 'vehiculo', de = 0, cajon = 'vehiculo' } = {}) {
        return {
            x: this.pos.x, y: this.pos.z, alto: this.pos.y, t, de, cajon,
            vel: { x: this.vel.x, y: this.vel.z, alto: this.vel.y },
        };
    }
}
