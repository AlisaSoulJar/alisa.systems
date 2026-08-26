// ⚠️ Aquí había `import * as THREE from 'three'` y `THREE` no aparecía NI UNA
// VEZ en el código. Un import muerto no es sólo ruido: ata el fichero al
// navegador, y un fichero atado al navegador no lo puede cargar el banco. Es la
// misma línea que tenía a ¡Sobrevive! 1 fuera del gimnasio hasta hoy.

/**
 * RaccoonPlanetSystem — EL DIBUJANTE DEL SATÉLITE, YA NO SU FÍSICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Misma historia que `RaccoonCitySystem`: hasta el 24-08 esta clase movía el
 * satélite y gastaba su batería mientras el banco medía `RaccoonSpaceCore`. Dos
 * juegos con el mismo nombre, y encima con una diferencia que se lo comía todo:
 * aquí se escaneaba una ciudad desde cualquier sitio, así que la órbita era
 * decorativa — se podía ganar sin mover el satélite.
 *
 * Ahora el estado lo lleva el núcleo con el mando `orbita` (latitud, longitud y
 * altura, que es como se mueve algo sobre una esfera) y aquí sólo queda el
 * dibujo: dónde va el satélite, hacia dónde mira y cómo gira el planeta.
 */
export class RaccoonPlanetSystem {
    constructor(params = {}) {
        /** Radio con el que se DIBUJA el planeta. El del juego lo pone el núcleo. */
        this.radius = params.radius ?? 15;
        this.satellite = null;
        this.planetGroup = null;
    }

    init(satellite, planetGroup) {
        this.satellite = satellite;
        this.planetGroup = planetGroup;
    }

    /**
     * Copia el estado del núcleo al 3D. `nave` es `nucleo.nave` tal cual.
     *
     * ⚠️ LA POSICIÓN SE REESCALA, Y SI NO SE HACE EL SATÉLITE APARECE DENTRO DEL
     * PLANETA. El núcleo trabaja a la escala de su tanque —las ciudades a 130 del
     * centro— y aquí el planeta se dibuja con radio 15. Se conserva la DIRECCIÓN,
     * que es lo que el juego decide, y se lleva la distancia a la escala del
     * dibujo: la altura de órbita relativa se mantiene, que es lo que la persona
     * necesita ver para saber si ya está lo bastante bajo.
     */
    pintar(dt, nave, nucleo) {
        if (!this.satellite || !nave) return;

        const d = Math.hypot(nave.x, nave.y, nave.z) || 1;
        const superficie = nucleo ? nucleo.tanque / 2 : d;
        const escala = this.radius / superficie;
        this.satellite.position.set(nave.x * escala, nave.y * escala, nave.z * escala);
        this.satellite.lookAt(0, 0, 0);

        if (this.planetGroup) this.planetGroup.rotation.y += dt * 0.02;
    }
}
