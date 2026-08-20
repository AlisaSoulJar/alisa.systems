/**
 * cine.js — EL MODO DELUXE: tono fílmico, oclusión y bloom sobre la misma escena
 * ═══════════════════════════════════════════════════════════════════════════
 *     const cine = await encenderCine({ escena, camara, render });
 *     if (cine) cine.pintar();   // en vez de render.render(escena, camara)
 *
 * ⚠️ DE DÓNDE SALE: «PODRÍAMOS ASPIRAR A UN LITTLE NIGHTMARES».
 *
 * Y la respuesta, mirada, fue que sí — porque ese juego no es polígonos, es LUZ. El
 * estudio de low poly de la casa lo dice con una frase: «geometría barata con
 * iluminación cara». Lo que separa unos gráficos de 1996 de un low poly actual
 * espectacular es la oclusión ambiental en el post-proceso, que le da a la escena el
 * aspecto de **diorama**, de juguete de plástico con peso físico.
 *
 * Y no había que escribirlo: `croupier_cinematic_room.html` lleva tiempo haciéndolo
 * con dos líneas de plugin. Lo único que lo separaba del arcade era que el arcade
 * corría en r128 — muro que se cayó hoy.
 *
 * ⚠️ QUÉ SE ENCIENDE Y QUÉ NO, Y POR QUÉ.
 *
 *   · SSAO, bloom y tono ACES  →  SÍ. Es la «iluminación cara» del estudio.
 *   · el cielo de Rayleigh     →  NO. `atmosfera.js` ya pone el suyo, y dos cielos
 *     superpuestos es el parpadeo de siempre.
 *   · las luces del plugin     →  NO. La mesa ya tiene las suyas con la temperatura
 *     del ambiente, que sale del contrato de luz de la casa. Dejar que el plugin
 *     añada las suyas sería mezclar dos direcciones de arte en la misma escena.
 *   · las sombras en cascada   →  todavía no. El propio plugin avisa de que el CSM
 *     crea una direccional POR CASCADA y su shader indexa cada direccional de la
 *     escena: con la nuestra puesta, el fragment shader no compila. Es una tarde
 *     entera de coreografía de luces y va aparte.
 *
 * ⚠️ Y ES UN INTERRUPTOR, NO OTRA COMPILACIÓN.
 *
 * Idea de Oscar: «como en los juegos, que puedes poner ultra o normal». Se hace así y
 * no con dos versiones del arcade porque dos renderizadores duplicarían los SEIS
 * instrumentos que miden una página pintada —laboratorio, pantallas, legibilidad,
 * tacto, contactos, asimetría—, y una mitad sin medir se pudre. Aquí es la MISMA
 * escena con cuatro pasadas más.
 *
 * ⚠️ Y SI FALLA, SE JUEGA IGUAL.
 *
 * El mapa de importación se inyecta desde JS, y eso pide un Chrome moderno (133+).
 * En uno viejo esto devuelve `null` y la mesa pinta como siempre. Un modo bonito que
 * puede dejar sin jugar a alguien no es un modo bonito: es una avería opcional.
 */

const MAPA = {
    imports: {
        three: '/vendor/three-0.170.0/build/three.module.js',
        'three/addons/': '/vendor/three-0.170.0/examples/jsm/',
    },
};

let mapaPuesto = false;

/** Una sola vez por página: dos mapas con las mismas claves no aportan nada. */
function ponerMapa() {
    if (mapaPuesto) return;
    const s = document.createElement('script');
    s.type = 'importmap';
    s.textContent = JSON.stringify(MAPA);
    document.head.appendChild(s);
    mapaPuesto = true;
}

/**
 * ⚠️ QUÉ CALIDAD SE PIDE, Y QUE SE RECUERDE.
 *
 * Por la dirección (`?calidad=ultra`) para poder enseñárselo a alguien con un enlace,
 * y guardado para que quien lo encienda no tenga que volver a hacerlo. La dirección
 * manda sobre lo guardado: un enlace tiene que enseñar lo que promete.
 */
export function calidadPedida() {
    const url = new URLSearchParams(location.search).get('calidad');
    if (url === 'ultra' || url === 'normal') {
        try { localStorage.setItem('alisa.calidad', url); } catch { /* sin permiso, da igual */ }
        return url;
    }
    try { return localStorage.getItem('alisa.calidad') === 'ultra' ? 'ultra' : 'normal'; }
    catch { return 'normal'; }
}

/**
 * @param {{escena:object, camara:object, render:object}} mesa
 * @returns {Promise<null|{pintar:Function, apagar:Function, pases:number}>}
 */
export async function encenderCine(mesa) {
    if (!mesa?.render || !mesa?.escena || !mesa?.camara) return null;
    try {
        ponerMapa();
        const { CinematicPipelinePlugin } = await import(
            '/js/alisa-engine/src/soma/plugins/CinematicPipelinePlugin.js');

        // El plugin sólo pide `{ scene, camera, renderer }`. Nuestra mesa lo es con
        // otros nombres, así que se le da un envoltorio en vez de renombrar la mesa.
        const core = { scene: mesa.escena, camera: mesa.camara, renderer: mesa.render };
        const cine = new CinematicPipelinePlugin({
            preset: mesa.preset ?? 'interior',
            sky: false,        // lo pone `atmosfera.js`
            lights: false,     // las pone la mesa, con la temperatura del ambiente
            ssao: true,
            bloom: true,
        });
        cine.onInit(core);
        if (!cine.composer) return null;

        /**
         * ⚠️ EL SSAO VIENE AFINADO PARA OTRA ESCALA, Y ASÍ NO SE VE.
         *
         * El plugin pone `kernelRadius = 0.35`, y está bien: nació en
         * `croupier_cinematic_room`, donde las columnas miden 5,5 unidades y el suelo
         * 70×220. Nuestro tablero mide 10 de lado con muros de 1 — a esa escala, un
         * radio de 0.35 busca oclusión en un pañuelo y devuelve casi nada.
         *
         * Se vio comparando las dos capturas: con las cuatro pasadas confirmadas en
         * consola, normal y ultra eran casi la misma imagen. La oclusión estaba
         * calculándose; no llegaba a ninguna esquina.
         *
         * Los números salen de la proporción: el radio se lleva a la escala del
         * tablero, no a la de una avenida.
         */
        if (cine.ssao) {
            cine.ssao.kernelRadius = mesa.radioSSAO ?? 1.6;
            cine.ssao.minDistance = 0.003;
            cine.ssao.maxDistance = 0.25;
        }

        return {
            pases: cine.composer.passes.length,
            pintar: () => cine.composer.render(),
            apagar: () => { try { cine.dispose?.(); } catch { /* ya está */ } },
        };
    } catch (e) {
        // Se dice y se sigue. Que el modo bonito no cargue no puede dejar a nadie sin
        // partida, y un fallo callado aquí sería justo el modo de fallo de la casa.
        console.warn('[cine] no se pudo encender el modo deluxe:', e?.message ?? e);
        return null;
    }
}
