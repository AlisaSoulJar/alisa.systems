import * as THREE from 'three';

/**
 * RaccoonCitySystem — EL DIBUJANTE DEL DRON, YA NO SU FÍSICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 24-08 esta clase movía el dron: leía teclas, integraba velocidad,
 * gastaba batería y avisaba cuando se acababa. O sea que la persona jugaba a
 * ESTO y el banco medía `RaccoonSpaceCore`, con otra batería, otro alcance de
 * escáner y otro coste por escaneo fallido. Mismo nombre de etapa, dos juegos —
 * y comparar sus notas no significaba nada, que es justo lo que este banco
 * existe para no hacer.
 *
 * Ahora manda el núcleo y aquí sólo queda lo que el núcleo no sabe ni tiene por
 * qué saber: cómo se INCLINA un dron al acelerar, a qué velocidad giran sus
 * hélices y cuánto se abre su haz de luz según lo alto que vuele. Nada de eso
 * cambia el resultado de una partida, y por eso puede vivir del lado del dibujo.
 *
 * Es la regla del patrón dorado: *«el estado manda, el 3D lo pinta»*.
 */
export class RaccoonCitySystem {
    constructor(params = {}) {
        this.droneRoot = null;
        this.droneInner = null;
        this.propellers = [];
        this.volBeam = null;
    }

    init(droneRoot, droneInner, propellers, volBeam) {
        this.droneRoot = droneRoot;
        this.droneInner = droneInner;
        this.propellers = propellers;
        this.volBeam = volBeam;
    }

    /**
     * Copia el estado del núcleo al 3D. `nave` es `nucleo.nave` tal cual.
     *
     * ⚠️ La inclinación se saca de la VELOCIDAD del núcleo, no de las teclas.
     * Si la leyera de las teclas, el dron se inclinaría aunque el núcleo hubiera
     * ignorado la orden —por ejemplo con la partida terminada— y la pantalla
     * estaría contando algo que no ha pasado.
     */
    pintar(dt, nave) {
        if (!this.droneRoot || !nave) return;

        this.droneRoot.position.set(nave.x, nave.y, nave.z);

        if (this.droneInner) {
            this.droneInner.rotation.z = THREE.MathUtils.lerp(this.droneInner.rotation.z, -nave.vx * 0.04, 5 * dt);
            this.droneInner.rotation.x = THREE.MathUtils.lerp(this.droneInner.rotation.x,  nave.vz * 0.04, 5 * dt);
        }

        if (this.volBeam) {
            const beamDist = Math.max(1, nave.y);
            const beamRadius = beamDist * Math.tan(Math.PI / 8);
            this.volBeam.scale.set(beamRadius, beamDist, beamRadius);
        }

        this.propellers.forEach(p => { p.rotation.y += 20 * dt; });
    }
}
