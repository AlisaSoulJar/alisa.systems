/**
 * encuadre.js — que el tablero QUEPA, se mire desde donde se mire.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTO YA ESTABA RESUELTO, PERO SÓLO PARA QUINCE JUEGOS.
 *
 * `mesa_tablero.mjs` aprendió a apartar la cámara hasta que el tablero cabe en
 * vez de ponerla a una distancia fija. Funcionó, y no lo tocaba nada más:
 * los visualizadores propios —fagocito, mancala, go, xiangqi y compañía— siguen
 * con su `camera.position.set(0, 20, 15)` escrito a mano un día concreto, en una
 * ventana concreta.
 *
 * Aviso de betatester, escritorio de 1366x633:
 *
 *     «no se ve el tablero completo en fagocito»
 *
 * Y es exacto. En 1280x720 el laberinto de 28x28 cabe entero; con 633 px de alto
 * no. La cámara no estaba mal calculada: es que no estaba calculada, y el número
 * escrito a mano acierta en la ventana en la que se escribió y en ninguna otra.
 *
 * Así que el encuadre se saca de la mesa genérica y se pone donde lo pueda usar
 * cualquiera. Script clásico y global, como `gestos.js`, porque quien más lo
 * necesita son los visualizadores, que son clásicos y no pueden importar.
 *
 * ⚠️ NO SE CALCULA LA DISTANCIA: SE COMPRUEBA.
 *
 * Una ventana apaisada y otra estrecha no admiten la misma, y un sokoban de 5x3
 * no encuadra como un go de 19x19 aunque los dos se normalicen. Se proyectan las
 * ocho esquinas de la caja a la pantalla y, si alguna se sale, se aparta la
 * cámara y se vuelve a mirar. Es mirar el resultado en vez de fiarse de la
 * cuenta, que es lo único que ha funcionado en este proyecto.
 */
(function () {
    'use strict';

    /**
     * ⚠️ Se mide con las matrices de instancia A MANO, porque `Box3.setFromObject`
     * NO las mira en el three que servimos: devuelve la caja de la geometría base.
     * Eso escaló un ajedrez ocho veces de más. Copiado tal cual de la mesa, que es
     * donde se aprendió.
     */
    function cajaReal(raiz, saltar = null) {
        const c = new THREE.Box3(), m = new THREE.Matrix4(), b = new THREE.Box3();
        raiz.updateMatrixWorld(true);
        raiz.traverse((o) => {
            if (!o.isMesh || !o.geometry) return;
            if (saltar && saltar.has(o.name)) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            if (o.isInstancedMesh && o.instanceMatrix) {
                for (let i = 0; i < o.count; i++) {
                    o.getMatrixAt(i, m);
                    m.premultiply(o.matrixWorld);
                    c.union(b.copy(o.geometry.boundingBox).applyMatrix4(m));
                }
            } else {
                c.union(b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
            }
        });
        return c;
    }

    /**
     * Aparta la cámara hasta que las ocho esquinas de `objeto` caben en pantalla.
     *
     *   camara       la cámara a mover
     *   objeto       lo que tiene que caber (un Group vale)
     *   controles    OrbitControls, opcional: se le pone el `target` y el tope
     *   inclinacion  radianes sobre el horizonte; por defecto una vista de mesa
     *   distancia    de dónde partir; si no, del tamaño de lo que hay que encajar
     *
     * Devuelve la distancia a la que se quedó, o `null` si no había nada que medir.
     *
     * ⚠️ `null` NO ES UN FALLO SILENCIOSO: un grupo sin tamaño no es pequeño, es
     * que todavía no está. Escalarlo daría una escala de 2550 y una mesa vacía con
     * las jugadas perfectamente listadas al lado — pasó con cripta, y no llamó la
     * atención porque una mesa vacía se ve igual que una mesa vacía.
     */
    function encajarCamara(cfg) {
        const {
            camara, objeto, controles = null,
            inclinacion = 0.95, margen = 0.92,
            intentos = 12, paso = 1.12, distancia = null,
            // Montones que no cuentan para encajar. Lo usa la niebla: en cripta,
            // apartarse hasta que quepa lo que NO sabes deja la partida en una
            // esquina de tres centímetros.
            saltar = null,
        } = cfg || {};
        if (!camara || !objeto) return null;

        const caja = cajaReal(objeto, saltar);
        const t = caja.getSize(new THREE.Vector3());
        const mayor = Math.max(t.x, t.y, t.z);
        if (!(mayor > 0.001)) return null;

        const c = caja.getCenter(new THREE.Vector3());
        if (controles) controles.target.copy(c);

        const esquinas = [];
        for (const x of [caja.min.x, caja.max.x])
            for (const y of [caja.min.y, caja.max.y])
                for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));

        const cabe = () => {
            camara.updateMatrixWorld();
            camara.updateProjectionMatrix();
            return esquinas.every((e) => {
                const v = e.clone().project(camara);
                return Math.abs(v.x) < margen && Math.abs(v.y) < margen;
            });
        };

        let d = distancia ?? (mayor * 1.15);
        for (let i = 0; i < intentos; i++) {
            camara.position.set(c.x,
                                c.y + d * Math.sin(inclinacion),
                                c.z + d * Math.cos(inclinacion));
            camara.lookAt(c);
            if (cabe()) break;
            d *= paso;
        }

        // El tope de alejarse sube con la distancia que ha hecho falta: si no, los
        // controles devolverían la cámara adentro en cuanto alguien la tocara.
        if (controles) {
            controles.maxDistance = Math.max(controles.maxDistance ?? 0, d * 1.6);
            controles.update();
        }
        return d;
    }

    /**
     * ⚠️ Y AL CAMBIAR DE TAMAÑO LA VENTANA, OTRA VEZ.
     *
     * El aviso vino de una ventana baja, pero girar un móvil hace lo mismo y es
     * más común. Quien encaja una vez al arrancar deja de caber en cuanto alguien
     * toca el borde — y eso no lo ve nadie probando en su propia pantalla.
     *
     * Se pone un cortafuegos de 150 ms porque redimensionar dispara el evento
     * decenas de veces y cada encuadre proyecta ocho esquinas doce veces.
     */
    function encajarSiempre(cfg) {
        let t = null;
        const hazlo = () => encajarCamara(cfg);
        hazlo();
        window.addEventListener('resize', () => {
            clearTimeout(t);
            t = setTimeout(hazlo, 150);
        });
        return hazlo;
    }

    window.ALISA_ENCUADRE = { cajaReal, encajarCamara, encajarSiempre };
})();
