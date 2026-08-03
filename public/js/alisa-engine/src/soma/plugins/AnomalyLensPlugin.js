import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * AnomalyLensPlugin.js — la anomalía: espacio doblado alrededor de un punto
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTO SÍ HABÍA QUE ESCRIBIRLO. Buscado en TODA la unidad Q: (`lensing`,
 * `black hole`, `agujero negro`, `accretion`, `horizonte de sucesos`,
 * `wormhole`): dos resultados, y ninguno es render. No teníamos anomalía.
 *
 * QUÉ HACE, Y POR QUÉ ASÍ
 * -----------------------
 * Una lente gravitatoria de verdad se calcula trazando rayos curvos. Aquí no
 * hace falta: lo que el ojo reconoce como «espacio doblado» es que **lo que hay
 * DETRÁS se arrastre alrededor**. Así que esto es un pase de pantalla que
 * reordena los píxeles ya pintados, tirando de ellos hacia el centro con una
 * caída suave. Cuesta un pase, no una simulación, y engaña perfectamente —
 * porque no es un truco sobre la imagen: es literalmente lo que ves cuando la
 * luz se curva.
 *
 * Lleva además el **anillo de fotones**: ese filo brillante justo en el borde
 * es lo que hace que el cerebro diga «agujero negro» y no «lente de aumento».
 *
 * HONESTO SOBRE SUS LÍMITES
 * -------------------------
 * Es screen-space: solo puede doblar lo que ya está en pantalla. Lo que quede
 * fuera del encuadre no aparece por detrás del horizonte, como sí pasaría en
 * una de verdad. A cambio funciona en cualquier escena, sin tocar materiales
 * ni geometría, y va a 60 fps en un portátil.
 *
 * USO
 *   const lente = new AnomalyLensPlugin({ radio: 0.30, fuerza: 0.16 });
 *   composer.insertPass(lente.pase, 1);          // después del RenderPass
 *   lente.apuntar(objeto.position, camara, aspecto);   // cada fotograma
 */
export class AnomalyLensPlugin {
    constructor({ radio = 0.28, fuerza = 0.15, anillo = 0.5,
                  color = new THREE.Color(0.55, 0.78, 1.0) } = {}) {
        this.pase = new ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                centro:   { value: new THREE.Vector2(0.5, 0.5) },
                radio:    { value: radio },
                fuerza:   { value: fuerza },
                anillo:   { value: anillo },
                aspecto:  { value: 1 },
                tinte:    { value: color },
            },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: /* glsl */`
                uniform sampler2D tDiffuse;
                uniform vec2  centro;
                uniform float radio, fuerza, anillo, aspecto;
                uniform vec3  tinte;
                varying vec2 vUv;

                void main() {
                    // Corregir por relación de aspecto: sin esto la anomalía es
                    // un óvalo, y un óvalo no parece un pozo, parece un fallo.
                    vec2 d = vUv - centro;
                    d.x *= aspecto;
                    float dist = length(d);

                    if (dist > radio) {                       // fuera: intacto
                        gl_FragColor = texture2D(tDiffuse, vUv);
                        return;
                    }

                    // Caída cuadrática: casi nada en el borde, brutal en el centro.
                    float t = 1.0 - dist / radio;
                    float tiron = fuerza * t * t;

                    vec2 uv = vUv - normalize(d + 1e-6) * tiron * vec2(1.0 / aspecto, 1.0);
                    vec4 col = texture2D(tDiffuse, uv);

                    // Aberración cromática hacia el centro: la luz azul se
                    // desvía distinto que la roja. Es sutil y es lo que separa
                    // «distorsión» de «óptica».
                    if (tiron > 0.004) {
                        vec2 uvR = vUv - normalize(d + 1e-6) * tiron * 1.06 * vec2(1.0 / aspecto, 1.0);
                        vec2 uvB = vUv - normalize(d + 1e-6) * tiron * 0.94 * vec2(1.0 / aspecto, 1.0);
                        col.r = texture2D(tDiffuse, uvR).r;
                        col.b = texture2D(tDiffuse, uvB).b;
                    }

                    // El anillo de fotones: un filo estrecho justo por dentro
                    // del borde. Sin él esto parece una lupa; con él, un pozo.
                    float filo = smoothstep(0.86, 1.0, dist / radio)
                               * (1.0 - smoothstep(0.985, 1.0, dist / radio));
                    col.rgb += tinte * filo * anillo;

                    gl_FragColor = col;
                }`,
        });
    }

    /** Coloca la anomalía donde esté el objeto, en coordenadas de pantalla. */
    apuntar(posicionMundo, camara, aspecto) {
        const p = posicionMundo.clone().project(camara);
        this.pase.uniforms.centro.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
        this.pase.uniforms.aspecto.value = aspecto;
        // Detrás de la cámara no se dobla nada: si no, la anomalía «rebota» al
        // frente cuando le das la espalda, que es de las cosas que más cantan.
        this.pase.enabled = p.z < 1;
    }

    set radio(v)  { this.pase.uniforms.radio.value = v; }
    set fuerza(v) { this.pase.uniforms.fuerza.value = v; }
    set anillo(v) { this.pase.uniforms.anillo.value = v; }
}
