/**
 * prueba_de_las_pruebas.mjs — ¿saben fallar nuestras comprobaciones?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_de_las_pruebas.mjs            todas
 *     node prueba_de_las_pruebas.mjs repetidor  una
 *
 * ⚠️ POR QUÉ EXISTE: EN UN SOLO DÍA, CINCO INSTRUMENTOS MINTIERON.
 *
 * No uno. Cinco, el 15-08-2026, y ninguno daba error — todos salían en verde:
 *
 *   · `prueba_repetidor` aprobaba `crearRepetidorZZZ` porque buscaba
 *     `crearRepetidor` y una cadena contiene a la otra;
 *   · `prueba_teclado` aprobó DOS veces seguidas con el cable cortado: primero
 *     porque el nombre saboteado seguía apareciendo en el fichero, y luego porque
 *     la DEFINICIÓN de la función se hacía pasar por una llamada;
 *   · la comprobación de valor de `legibilidad` no saltaba ni con el umbral a 200,
 *     porque estaba dentro de un bucle que descartaba antes casi todos los pares;
 *   · `tacto` medía si el estado cambiaba al pulsar, y en los juegos con reloj
 *     propio el estado lo cambia el reloj: sus 5/5 eran tan casuales como sus 3/5;
 *   · y una medida mía del «tablero tapado» daba 20 % antes del arreglo y 31 %
 *     después, con la imagen claramente mejor, porque metía las LUCES en la caja.
 *
 * Cinco en un día es un patrón, no mala suerte. Y todos comparten forma: **nadie
 * había comprobado nunca que pudieran suspender**. Una comprobación que no puede
 * fallar no es una comprobación: es una frase que sale en verde.
 *
 * ⚠️ QUÉ HACE ESTO, Y POR QUÉ NO ES «PROBAR LAS PRUEBAS» POR DEPORTE.
 *
 * Para cada comprobación de `npm test` hay un SABOTAJE declarado: un cambio
 * concreto que rompe justo lo que esa prueba dice vigilar. Se aplica, se corre la
 * prueba, y **tiene que suspender**. Si sale verde con el cable cortado, la prueba
 * está muerta y este fichero lo dice.
 *
 * Es la disciplina que hoy he aplicado a mano cinco veces, automatizada — porque
 * hacerlo a mano depende de que me acuerde, y hoy se me olvidó dos veces seguidas
 * en el mismo fichero.
 *
 * ⚠️ CÓMO SE PROTEGEN LOS FICHEROS DE VERDAD.
 *
 * El sabotaje toca ficheros del proyecto. Antes se guarda el contenido, se
 * restaura SIEMPRE —pase lo que pase— y al final se verifica que todo quedó como
 * estaba comparando el texto. Si algo no se pudo restaurar, se dice a gritos y se
 * sale con error: es preferible un susto a dejar un sabotaje puesto.
 *
 * Y todo esto es recuperable con git, que es la red de debajo.
 *
 * ⚠️ NO LA MATES A MEDIAS. Y ESTO IMPORTA MÁS DESDE QUE ESTÁ EN `npm test`.
 *
 * El `finally` que restaura no corre si al proceso lo matan: un Ctrl-C, un tope de
 * tiempo del arnés que lo llame, una terminal que se cierra. Entonces el sabotaje
 * se queda PUESTO en el árbol de trabajo, y lo peor es lo que viene después — la
 * siguiente pasada dirá «el sabotaje ya no encaja» para ese cable, porque el texto
 * que busca ya no está: lo cambió ella misma. Se lee como un sabotaje caducado y no
 * lo es.
 *
 * Pasó el 27-08, y lo hice yo: maté un `npm test` a los diez minutos mientras esto
 * corría, y `visualizadores.js` se quedó sin su alias `ajedrez: 'chess'`. La pista
 * es que `git status` enseña un fichero del proyecto tocado que tú no tocaste.
 *
 *     git status                 ¿hay algo modificado que no sea tuyo?
 *     git checkout -- <fichero>  devuélvelo antes de creerte ningún resultado
 *
 * Desde que vive dentro de `npm test` va la última de la lista, así que interrumpir
 * la suite por impaciencia cae justo aquí.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * Cada entrada dice: qué prueba, qué fichero romper, y con qué cambio.
 *
 * ⚠️ EL SABOTAJE TIENE QUE ROMPER LO QUE ESA PRUEBA VIGILA, NO CUALQUIER COSA.
 *
 * Meter un error de sintaxis haría suspender a cualquiera y no demostraría nada:
 * probaría que node sabe leer. Cada sabotaje de aquí es el fallo REAL contra el que
 * se escribió la prueba — quitarle las normas al enlace, dejar que las teclas jueguen
 * mientras escribes, cambiar el sello de versión.
 */
const SABOTAJES = [
    {
        nombre: 'sistemas',
        corre: 'node sistemas.mjs',
        /**
         * ⚠️ ESTE SABOTAJE ESTABA CADUCADO, Y ES EL PEOR SITIO PARA QUE PASE.
         *
         * Cortaba el `import { VolumeVehicleSystem }` de `SubmarineCore` esperando
         * que el suelo de composición bajase. Y `sistemas.mjs` ya no mide los
         * imports: desde que los núcleos declaran `static ROM`, lee la DECLARACIÓN
         * — lo dice su propio comentario, «medir por los import es medir la
         * sombra». O sea que el sabotaje cortaba un cable que ya no daba luz, y la
         * vara aprobaba tan tranquila.
         *
         * Es exactamente lo que este fichero existe para cazar, cometido dentro de
         * este fichero. Y también la tercera nota correcta que caduca en silencio
         * esta semana: ninguna de las tres avisó al quedarse vieja.
         *
         * Se sabotea el SUELO y no el TECHO a propósito: para subir el techo habría
         * que escribir un integrador entero, y un sabotaje que añade cuarenta líneas
         * prueba menos que uno que quita una.
         *
         * Y el objetivo cambia a `CorpBuildingCore` por aritmética: la vara cuenta
         * núcleos con DOS O MÁS piezas, y el submarino tiene tres — quitarle una lo
         * deja en dos y sigue contando. El edificio tiene exactamente dos, así que
         * quitarle una lo baja de la raya y el suelo cae de 11 a 10.
         */
        fichero: 'public/js/alisa-engine/src/world/systems/CorpBuildingCore.js',
        de: "['Bandas', { cortes: [[1, 'caliente'], [3, 'fresco'], [Infinity, 'helado']] }],",
        a: "// el núcleo se escribe las bandas dentro",
        vigila: 'que un núcleo componga piezas del motor en vez de reimplementarlas',
    },
    {
        nombre: 'recibos',
        corre: 'node prueba_recibos.mjs',
        fichero: 'public/arcade/js/protohub/Verificador.js',
        // El fallo REAL, tal cual estaba escrito hasta el 20-08-2026: leer la
        // puntuación final desde la silla 0 pasara lo que pasara. Con eso, toda
        // partida jugada fuera de esa silla se rechazaba por «la puntuación no
        // cuadra» — brisca daba 12/12, 1/12, 0/12, 0/12— y el contador de la
        // clasificación lo enseñaba como un `100/200` que nadie leyó como un fallo.
        de: 'reglas.estado(p, Number(partida.asiento) || 0)',
        a: 'reglas.estado(p)',
        vigila: 'que el recibo se verifique desde la silla que jugó, y no desde la 0',
    },
    {
        nombre: 'habla',
        corre: 'node prueba_habla.mjs',
        fichero: 'public/arcade/js/protohub/rules/nave.js',
        // El fallo que puede tener esto: ampliar un patrón «para que quepa todo».
        // Con `.*`, el verificador aceptaría cualquier cosa mientras sigue diciendo
        // «válida» — y no sólo en nave: quien lea un recibo no tiene forma de saber
        // que dejó de auditarse. Por eso la comprobación cuela una jugada inventada
        // que no empieza por `decir:`: ningún patrón honrado la acepta.
        de: '`^decir:.{1,${LARGO_FRASE}}$`',
        a: '`.*`',
        vigila: 'que declarar una forma no abra la puerta a cualquier jugada',
    },
    {
        nombre: 'sonido',
        corre: 'node prueba_sonido.mjs',
        fichero: 'public/data/sonidos.json',
        // El fallo REAL, y estaba puesto: `autoWireUI` pedía `menu_select` en cada
        // mousedown y ese sonido no existía. `play` empieza por `if (sounds[name])`,
        // así que se iba callando — sin error, sin aviso, sin nada. Un sonido que
        // falta suena igual que un sonido flojo, y eso lo hace invisible para
        // siempre. Con la comprobación puesta salieron tres más a la primera:
        // `radar` y `boss_laser` dejaban MUDA la cuenta atrás entera, y `toggle`
        // era la linterna de la búsqueda por la planta.
        //
        // El sabotaje quita el sonido, no la llamada: es la dirección en que pasa
        // de verdad —se renombra o se borra una entrada del catálogo y las páginas
        // que la pedían enmudecen— y es la que ningún error de consola delata.
        /**
         * ⚠️ ESTE SABOTAJE SE MUDÓ DE FICHERO EL 29-08-2026, Y ES LA TERCERA VEZ
         *    EN DOS DÍAS QUE UNO CADUCA PORQUE EL MUNDO MEJORA.
         *
         * Rompía `menu_select` dentro de `sfx.js`, que es donde vivía. Al pasar los
         * 53 sonidos de receta al léxico, `menu_select` dejó de estar ahí y el
         * sabotaje ya no encajaba: la meta-prueba lo cantó con «el sabotaje ya no
         * encaja: falta …», que es exactamente para lo que está.
         *
         * La avería que reproduce es la MISMA —renombrar una entrada del catálogo
         * y dejar mudas a las páginas que la pedían— y sigue sin delatarla ningún
         * error de consola. Lo único que cambió es dónde vive el catálogo.
         *
         * La regla que se lleva: **cuando algo se muda, sus vigilantes se mudan
         * con él.** Y el que avisa de que no lo hiciste es este fichero.
         */
        de: '    "menu_select": {',
        a: '    "menu_select_renombrado": {',
        vigila: 'que ningún play() apunte a un sonido que no existe',
    },
    {
        /**
         * El fallo real de la segunda mitad: `movioLaPantalla` elegía la PRIMERA
         * jugada legal y con eso acusó a seis juegos sanos, porque la primera de
         * `defensa` es `pasar` y la de `relevo` es `esperar`. Dejarla en una sola
         * candidata reproduce exactamente ese error, y la prueba tiene que verlo.
         */
        nombre: 'veredicto:jugada',
        corre: 'node prueba_veredicto.mjs',
        fichero: 'veredicto.mjs',
        de: 'legales.slice(0, jugadas > 0 ? 24 : 0)',
        a: 'legales.slice(0, jugadas > 0 ? 1 : 0)',
        vigila: 'que se prueben todas las jugadas y no sólo la primera, que suele ser «pasar»',
    },
    {
        nombre: 'veredicto',
        corre: 'node prueba_veredicto.mjs',
        fichero: 'veredicto.mjs',
        // El fallo que puede tener esto: pasarse de listo. El día que «gráficamente
        // muy pobre» reciba un veredicto automático, el buzón empezará a dar por
        // resuelto lo que nadie ha mirado — y eso no da error: da una lista más
        // corta, que parece progreso.
        //
        // El sabotaje quita `aspecto` de las familias que necesitan ojos. La
        // primera versión de la comprobación NO suspendía con esto, porque había
        // un camino por defecto que devolvía «mirar» igualmente: pasaba por el
        // motivo equivocado. Lo dijo este arnés, y por eso ahora se vigila la
        // DECLARACIÓN y no sólo el resultado.
        de: "export const NECESITAN_OJOS = new Set(['movimiento', 'aspecto', 'reglas']);",
        a: "export const NECESITAN_OJOS = new Set(['movimiento', 'reglas']);",
        vigila: 'que el buzón no dé por juzgado lo que nadie ha mirado',
    },
    {
        nombre: 'acercar',
        corre: 'node prueba_acercar.mjs',
        fichero: 'public/arcade/js/protohub/render/acercar.js',
        // El fallo REAL: que se deje de emparejar. Y es el peor de todos porque
        // NO PARECE UN FALLO — todo vuelve a teletransportarse, que es
        // exactamente el aspecto que tenían las mesas de tablero hasta hoy. El
        // que lo vea pensará «esto todavía no está hecho», no «esto se rompió».
        //
        // Se sabotea la condición y no la fórmula: perder el emparejamiento en un
        // refactor es mucho más probable que equivocarse en una interpolación.
        de: 'if (mejor >= 0 && dist <= salto * salto) venia = libres.splice(mejor, 1)[0];',
        a: 'if (false) venia = libres.splice(mejor, 1)[0];',
        vigila: 'que una ficha que se mueve VIAJE y no aparezca',
    },
    {
        nombre: 'asientos',
        corre: 'node prueba_asientos.mjs',
        fichero: 'public/arcade/js/protohub/rules/mancala.js',
        // El fallo que puede tener un asiento: decir que contiene lo que no
        // contiene. La pantalla enseña un número y el árbitro juega con otro, y
        // gana el árbitro sin que nadie se entere.
        //
        // El sabotaje deja el granero a cero. No rompe el juego —la partida se
        // juega igual de bien— y sólo miente la vista, que es exactamente el modo
        // de fallo del que va esta comprobación. Lo caza la ley de las 48
        // semillas, que es del JUEGO y no de la estructura de datos: una
        // implementación rota no puede cumplirla por casualidad.
        de: "cuantas: b[GRANERO[0]], nombre: 'granero'",
        a: "cuantas: 0, nombre: 'granero'",
        vigila: 'que un asiento no mienta sobre lo que contiene',
    },
    {
        nombre: 'identidad',
        corre: 'node prueba_identidad.mjs',
        fichero: 'public/arcade/js/protohub/rules/alisapolis.js',
        // El fallo REAL, y estaba puesto hasta hoy: alisapolis publicaba sus
        // peones como `{id, x, y, dueno, tipo}` cuando el contrato dice `de` y
        // `t`. El pintor leía `undefined` en los dos, así que los cuatro peones
        // salían como discos grises idénticos — y el betatester escribió «parece
        // que juego yo solo», que yo clasifiqué como problema de turnos.
        //
        // Un campo mal llamado no da error: dibuja otra cosa. Por eso el sabotaje
        // devuelve el dialecto en vez de romper la sintaxis.
        de: "t: 'peon', de: i });",
        a: "tipo: 'peon', dueno: i });",
        vigila: 'que ninguna pieza hable un dialecto en vez del contrato',
    },
    {
        nombre: 'vida',
        corre: 'node prueba_vida.mjs',
        fichero: 'public/arcade/js/protohub/render/pintar3d.js',
        // El fallo REAL que esto vigila: que el bucle de instancias deje de mirar
        // la vida. No rompe nada — las piezas salen todas del mismo tamaño, que
        // es como se veían hasta hoy— y el estado sigue perfecto, así que ninguna
        // otra comprobación lo nota. Sólo desaparece la información: en `defensa`
        // se vuelve a jugar a ciegas si el bicho que viene está a punto de caer.
        //
        // Se sabotea la LLAMADA y no la función, porque perder la llamada en un
        // refactor del bucle es mucho más probable que borrar la función entera.
        // La línea se movió al sacar el bucle a `volcarPiezas` para poder animar
        // las piezas, y el sabotaje se quedó apuntando a la vieja: el arnés lo
        // dijo con «1 no saben fallar», que es exactamente para lo que existe.
        de: 'const f = escalaPorVida(o.p);',
        a: 'const f = 1;',
        vigila: 'que una pieza tocada se siga viendo más pequeña',
    },
    {
        nombre: 'mundo',
        corre: 'node prueba_mundo.mjs',
        fichero: 'public/js/montarMundo.js',
        // El fallo REAL que `montarMundo` existe para impedir, medido antes de
        // escribirlo: de las seis etapas de la saga, el pipeline cinematográfico
        // —tono filmico, bloom, SSAO, cielo— lo importaban DOS. Nadie lo quitó:
        // nadie lo copió. Cuando el andamio se copia a mano, lo que no es
        // imprescindible se cae solo.
        //
        // El sabotaje lo devuelve a opcional. Es la dirección en que pasa de
        // verdad —alguien lo hace opcional «para que no moleste al depurar»— y no
        // rompe nada: las páginas siguen funcionando, sólo que feas. Y la fealdad
        // no la mira ninguna batería.
        de: 'if (cfg.cine !== false) {',
        a: 'if (cfg.cine === true) {',
        vigila: 'que el pipeline venga puesto de serie y no haya que acordarse',
    },
    {
        nombre: 'enfrentamiento',
        corre: 'node prueba_enfrentamiento.mjs',
        fichero: 'enfrentar.mjs',
        // El fallo REAL, y estaba puesto: `contarSillas` no leía `vivos`, que es
        // lo ÚNICO que publican los de deducción social —ni `marcador` ni nada
        // más, ni siquiera al acabar—. Con eso shinigami salía de la segunda tabla
        // clasificado como «juego de un jugador», teniendo ocho sillas con
        // puntuación y roles propios. No daba error: daba un veredicto.
        //
        // El sabotaje quita ese candidato, que es un fallo por OMISIÓN — la
        // familia entera desaparece de la tabla y las otras tres siguen bien, así
        // que ninguna otra fila lo delata.
        de: 'Number.isInteger(e?.vivos) ? e.vivos : 0);',
        a: '0);',
        vigila: 'que las sillas se cuenten también donde sólo se publica `vivos`',
    },
    {
        nombre: 'turno',
        corre: 'node prueba_turno.mjs',
        fichero: 'public/arcade/js/protohub/rules/entropy.js',
        // El fallo REAL, en trece juegos hasta el 20-08-2026: `player` significa
        // «tú», y comparar contra 0 sólo acierta para la silla 0. El segundo
        // jugador leía «te toca» justo cuando NO le tocaba, y al revés. El árbitro
        // repartía los turnos bien —decide con la silla 0 y `ordenAsientos`—, así
        // que la mesa iba perfecta y lo único roto era la pantalla: nada fallaba,
        // nadie daba error, y dos betatesters se miraban esperando al otro.
        de: "turn: pid === yo ? 'player'",
        a: "turn: pid === 0 ? 'player'",
        vigila: 'que exactamente una silla vea «player», que es un pronombre',
    },
    {
        nombre: 'repetidor',
        corre: 'node prueba_repetidor.mjs',
        fichero: 'public/arcade/js/protohub/enlace_repetidor.js',
        de: '.filter(([, v]) => v === true)',
        a: '.filter(() => false)',
        vigila: 'que el enlace lleve las normas variables (damas se repetía con otras reglas)',
    },
    {
        nombre: 'teclado',
        corre: 'node prueba_teclado.mjs',
        fichero: 'public/arcade/js/Entrada.js',
        de: 'if (estaEscribiendo()) return;',
        a: '',
        vigila: 'que escribir una frase no juegue la partida',
    },
    {
        nombre: 'final',
        corre: 'node prueba_final.mjs',
        fichero: 'public/arcade/js/protohub/ProtoHub.js',
        de: "if (jugada === 'nueva' || jugada === 'reset') {",
        a: "if (jugada === '@nunca@') {",
        vigila: 'que al terminar una partida se pueda empezar otra',
    },
    {
        nombre: 'css',
        corre: 'node prueba_css.mjs',
        fichero: 'public/arcade/css/jugables.css',
        de: '.repetir-mandos {',
        a: '/* .repetir-mandos {',
        vigila: 'que un comentario sin cerrar no se coma las reglas de debajo',
    },
    {
        nombre: 'version',
        corre: 'node prueba_version.mjs',
        fichero: 'public/arcade/js/montarMesa.js',
        de: 'const VERSION',
        a: 'const VERSION_X',
        vigila: 'que el sello del `?v=` corresponda al código que hay en disco',
    },
    {
        nombre: 'censo',
        corre: 'node prueba_censo.mjs',
        fichero: 'public/js/alisa-engine/src/gym/registry.js',
        /**
         * ⚠️ ÉSTE ES EL PRIMER SABOTAJE DE ENUMERACIÓN, Y ES OTRA COSA QUE LOS DEMÁS.
         *
         * Los quince de arriba rompen una CONDICIÓN y esperan que la comprobación la
         * eche de menos. Éste rompe el UNIVERSO: le cambia el nombre a un juego del
         * catálogo, de modo que el conjunto medido sigue teniendo treinta y cinco
         * elementos pero ya no es el mismo conjunto.
         *
         * Se hace así a propósito, y es la parte que enseña algo: si `prueba_censo`
         * comparara sólo el TOTAL, este sabotaje pasaría —35 y 35— y la comprobación
         * parecería sana. Compara la lista, así que dice «existen y no se miden: oca»
         * y «se miden y no existen: oca_FUERA».
         */
        de: "'oca'",
        a: "'oca_FUERA'",
        vigila: 'que los medidores midan sobre todos los juegos que hay',
    },
    {
        nombre: 'fichas',
        corre: 'node --import ./resolver_three.mjs prueba_fichas.mjs',
        fichero: 'public/arcade/js/protohub/rules/bazas.js',
        /**
         * El fallo real: que la ficha PROMETA algo que el juego no cumple. Se le
         * cambia el número de sillas a la familia de bazas —que reparte a cuatro— y
         * tiene que saltar con nombre y cifra, no con un «algo no cuadra».
         *
         * Se sabotea aquí y no en un juego suelto porque esta fábrica sirve a cuatro
         * a la vez: si la comprobación sólo mirara uno, el sabotaje se notaría igual
         * y no se vería que cubre a los cuatro.
         */
        de: 'ASIENTOS: jugadores,',
        a: 'ASIENTOS: 3,',
        vigila: 'que la ficha de cada juego no prometa lo que el juego no cumple',
    },
    {
        nombre: 'fichas·rutas',
        corre: 'node --import ./resolver_three.mjs prueba_fichas.mjs',
        fichero: 'public/data/fichas.json',
        /**
         * ⚠️ DOS SABOTAJES PARA EL MISMO FICHERO, Y HACE FALTA.
         *
         * `prueba_fichas` vigila ahora dos cosas distintas: que lo declarado coincida
         * con lo que hace el juego, y que las rutas que promete la ficha SE PUEDAN
         * PEDIR. Con un solo sabotaje, la segunda estaría sin cubrir — y es justo la
         * que acaba de fallar en los 35 sin que nadie lo notara: la ficha apuntaba a
         * `capturas_laboratorio/`, que está en `.gitignore`, así que prometía treinta y
         * cinco imágenes que desde el sitio dan 404. Un sabotaje que no se nota es un
         * hueco de cobertura, no mala puntería.
         *
         * Se rompe la ruta en el JSON PUBLICADO, que es exactamente la forma del fallo:
         * el fichero está en mi disco y no en lo que se sirve.
         */
        de: '"/capturas/snake.png"',
        a: '"/capturas/snake_FUERA.png"',
        vigila: 'que lo que la ficha promete se pueda pedir, y no sólo exista en mi disco',
    },
    {
        nombre: 'clasificacion',
        corre: 'node prueba_clasificacion.mjs',
        fichero: 'public/clasificacion.html',
        /**
         * El fallo REAL contra el que se escribió: que alguien corra `tabla.mjs` sin
         * `--html` y la página se quede con los números de una medida anterior. Así
         * que el sabotaje es exactamente eso —cambiar un número publicado— y no un
         * destrozo del HTML, que haría suspender a cualquier comprobación.
         *
         * `0.00` es la mediana del suelo, que vale eso por definición: es el número
         * más estable de la tabla y no depende de qué salga en la medición del día.
         */
        de: '<td class="n"><b>0.00</b>',
        a: '<td class="n"><b>0.42</b>',
        vigila: 'que la clasificación publicada sea la que se midió',
    },
    {
        nombre: 'objetivo',
        corre: 'node prueba_objetivo.mjs',
        fichero: 'public/arcade/js/protohub/rules/damas.js',
        // Va dentro del objeto de reglas, no como `export const`: lo comprobé
        // mirándolo, que es la única forma de que un sabotaje encaje de verdad.
        de: '    OBJETIVO:',
        a: '    OBJETIVO_QUITADO:',
        vigila: 'que cada juego diga a qué se juega',
    },
    {
        nombre: 'biblioteca',
        corre: 'node prueba_biblioteca.mjs',
        fichero: 'public/arcade/data/card_library.json',
        de: '"spanish_40"',
        a: '"spanish_40_ROTA"',
        vigila: 'que los juegos de cartas lean el catálogo que se les indica',
    },
    {
        nombre: 'visualizadores',
        corre: 'node prueba_visualizadores.mjs',
        fichero: 'public/arcade/chess.html',
        // La novena lista paralela de este proyecto: el mapa y la página diciendo
        // cosas distintas sobre con qué se dibuja el ajedrez. Se separa a mano una y
        // tiene que saltar.
        de: "visualizador: 'chess_visualizer.js'",
        a: "visualizador: 'mancala_visualizer.js'",
        vigila: 'que el mapa de visualizadores y las páginas no se separen',
    },
    {
        nombre: 'invitados',
        corre: 'node prueba_invitados.mjs',
        fichero: 'public/arcade/js/visualizadores.js',
        /**
         * Se le quita el alias con el que `chess_visualizer.js` le pregunta al hub.
         * Es el fallo que tuvo de verdad: dibujaba su tablero perfecto y se quedaba
         * «SIN CONEXIÓN» y sin piezas, porque preguntaba por `chess` y la sala tenía
         * registrado `ajedrez`.
         *
         * Tenía que ser ÉSTE y no «que no cargue el fichero»: si el visualizador no
         * carga, la sala cae a la mesa genérica y se ve una partida perfectamente
         * jugable — la prueba pasaría. Lo que hay que cazar es el decorado: cuando
         * está todo dibujado y no hay partida detrás.
         */
        de: "    ajedrez: 'chess',",
        a: "",
        vigila: 'que un visualizador invitado tenga partida y no sólo decorado',
    },
    {
        nombre: 'figuras',
        corre: 'node prueba_figuras.mjs',
        fichero: 'public/arcade/js/SovereignCardEngine.js',
        /**
         * Se vuelve a poner el fallo original: borrar del caché en vez de repintar el
         * material que la malla ya tiene. Eso deja las cartas de la mesa con su letra
         * y sin dibujo, y es exactamente lo que estuvo pasando con las doce figuras
         * francesas sin que nadie lo notara.
         *
         * Tenía que ser ESTE sabotaje y no «que no carguen las imágenes»: si las
         * imágenes no cargan, la carta cae al dibujo de respaldo y la prueba lo caza
         * por otro camino. Lo que hay que comprobar es que caza el caso en que la
         * imagen SÍ está y aun así no llega a la mesa, que es el que engaña.
         */
        de: '            this._repintarFigura(key);',
        a: '            delete this.cachedMaterials[key];',
        vigila: 'que la figura llegue a la carta que ya está repartida',
    },
    {
        nombre: 'barajas',
        corre: 'node prueba_barajas.mjs',
        fichero: 'public/arcade/js/protohub/rules/gofish.js',
        /**
         * ⚠️ ES OTRA PREGUNTA QUE LA DE `biblioteca`, Y POR ESO OTRO SABOTAJE.
         *
         * Aquélla comprueba que los juegos LEEN el catálogo que se les pasa. Ésta,
         * que cogen de él LA BARAJA QUE LES TOCA. Un juego francés que pidiera la
         * española leería el catálogo impecablemente y repartiría oros en una mesa de
         * póker, y `biblioteca` lo saludaría en verde: verifica su condición, y su
         * condición no es la que importa.
         *
         * El sabotaje es literalmente ese fallo — al gofish se le da la española — y
         * tiene que salir «declara french_52 y reparte spanish_40».
         */
        de: "cargarBaraja('french_52', url)",
        a: "cargarBaraja('spanish_40', url)",
        vigila: 'que cada juego reparta la baraja que la biblioteca le asigna',
    },
    {
        nombre: 'reglas',
        corre: 'node prueba_reglas.mjs',
        fichero: 'public/arcade/js/protohub/rules/azar.js',
        /**
         * El generador sembrado, convertido en azar de verdad. Es EL fallo contra el
         * que existe media suite: sin determinismo, `{juego, semilla, jugadas}` deja
         * de reproducir la partida y con eso se cae el producto entero. Y el propio
         * fichero avisa de que siete copias de esto eran «una escopeta cargada
         * apuntando al producto» — esto comprueba que el gatillo se oye.
         */
        de: 'let a = semilla >>> 0;',
        a: 'let a = semilla >>> 0; return Math.random;',
        vigila: 'que la misma semilla dé siempre la misma partida',
    },
    {
        nombre: 'lenguaje',
        corre: 'node prueba_lenguaje.mjs',
        fichero: 'public/arcade/js/protohub/descripcion.js',
        // Se deja mudo al narrador: es exactamente el fallo contra el que nació esa
        // prueba —«los 19 juegos jugaban a ciegas»—.
        de: 'export function describirEstado',
        a: 'export function describirEstado(...__a) { return ""; }\nfunction __viejo',
        vigila: 'que cada juego sepa contar su estado a un agente sin vista',
    },
    {
        nombre: 'sustrato',
        corre: 'node prueba_sustrato.mjs',
        fichero: 'public/arcade/js/protohub/rules/damas.js',
        de: '    sustrato',
        a: '    sustrato_QUITADO',
        vigila: 'que el estado sea una matriz plana y no lo pierda ningún juego',
    },
    {
        /**
         * El fallo real: al escribirle el sustrato a `guerra` salieron 54 cartas de
         * 52. Las dos de más eran las del choque, que la mesa enseña boca arriba
         * pero que YA se han movido a `ganadas` en el mismo `mover()`. Se marcaron
         * con `reflejo: true`; quitárselo devuelve el error exacto.
         */
        /**
         * El fallo real: enseñarle a todo el mundo la elección nocturna del
         * primero. En shinigami eso no es un dibujo raro, es el final del juego —
         * quien lo viera sabría quiénes son los shinigami en la primera noche.
         *
         * ⚠️ Y este sabotaje ya sirvió de algo antes de entrar aquí: con él puesto,
         * la primera versión de la comprobación APROBÓ. Miraba el `de` del dicho, y
         * el dicho filtrado sigue diciendo ser tuyo. Hubo que cambiarla por la
         * pregunta buena —¿cambia lo que yo veo cuando otro elige distinto?— y eso
         * salió de aplicar el sabotaje, no de pensar más.
         */
        /**
         * El fallo que esta prueba existe para impedir: que la nota deje de
         * depender de lo que haces. Congelar la recompensa de `ProtoHubEnv` deja
         * planos de golpe a los treinta y cinco entornos que pasan por ahí, y todas
         * las demás comprobaciones del banco siguen en verde — se importan, aceptan
         * sus verbos y son repetibles. Repetiblemente inútiles.
         */
        /**
         * El fallo que esto impide: que una etapa de saga acabe con un motor para
         * la persona y otro para el banco, y que las notas de las dos puertas dejen
         * de medir la misma partida sin que nadie se entere. Ya pasó dos veces
         * —Cabinet y Espacio—, y las dos se descubrieron mirando a mano.
         *
         * Se le cambia el nombre al motor que Corp Building comparte hoy: la etapa
         * pasa a tener dos motores sin estar declarada, y tiene que saltar.
         */
        nombre: 'sagas',
        corre: 'node prueba_sagas.mjs',
        fichero: 'public/js/alisa-engine/src/gym/envs/CorpBuildingEnv.js',
        de: 'import { CorporateSeekerSystem }',
        a: 'import { OtroSeekerSystem }',
        vigila: 'que la persona y el agente corran el mismo motor en cada etapa de saga',
    },
    {
        /**
         * El mismo motor con otros números sigue siendo otro juego, y `sagas` no
         * lo ve: ella comprueba QUÉ se importa, no CÓMO se configura. El sabotaje
         * deja el motor en su sitio y sólo cambia el depósito del banco.
         */
        nombre: 'puertas-busca',
        corre: 'node prueba_puertas_busca.mjs',
        /**
         * ⚠️ TAMBIÉN CADUCADO, Y POR EL MISMO MOTIVO QUE EL DE `sistemas`.
         *
         * Apuntaba a `RaccoonSpaceEnv.js`, donde los ajustes estaban escritos a
         * mano. Al convertir ¡Busca! en ROMs, los números se mudaron a las tablas
         * de `RaccoonSpaceCore` y el entorno pasó a leerlos con `this.rom`. El
         * sabotaje se quedó buscando un texto que ya no existe en ese fichero:
         * ni siquiera fallaba, decía «el sabotaje ya no encaja».
         *
         * Ésa es la señal buena — esta prueba distingue «no encaja» de «aprueba
         * con el cable cortado», y sin esa distinción los dos casos se leerían como
         * un verde.
         */
        fichero: 'public/js/alisa-engine/src/world/systems/RaccoonSpaceCore.js',
        de: 'tankSize: 260, planets: 8, asteroids: 0, fuel: 11, tope: 3600,',
        a: 'tankSize: 260, planets: 8, asteroids: 0, fuel: 99, tope: 3600,',
        vigila: 'que la página y el banco monten el núcleo de ¡Busca! con los mismos ajustes',
    },
    {
        /**
         * La otra mitad de esa prueba: que el menú de la puerta de lenguaje no
         * ofrezca jugadas que la acción no admite. El sabotaje devuelve el menú a
         * la lista fija de verbos de NAVE que tenía hasta el 24-08 — con eso, las
         * etapas de dron y satélite volvían a ofrecer los mandos de una nave.
         */
        nombre: 'puertas-menu',
        corre: 'node prueba_puertas_busca.mjs',
        fichero: 'public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js',
        de: "const lista = this.constructor.actionSpace.names",
        a: "const lista = VERBS_SPACE",
        vigila: 'que el menú de lenguaje sólo ofrezca verbos que la acción admite',
    },
    {
        /**
         * El fallo que vigila es el que había hasta el 24-08: dos generadores
         * sembrados, y «semilla 42» significando dos mundos distintos sin que
         * nada diera error. El sabotaje devuelve a `SeededRNG` su viejo LCG.
         */
        nombre: 'azar',
        corre: 'node prueba_azar.mjs',
        fichero: 'public/js/alisa-engine/src/world/core/SeededRNG.js',
        de: '        return this._siguiente();',
        a: '        this._seed = (this._seed * 9301 + 49297) % 233280;\n        return this._seed / 233280;',
        vigila: 'que haya un solo generador: una semilla, un mundo',
    },
    {
        /**
         * El fallo que vigila: un `import` que apunta a un fichero que no está.
         * En Windows y macOS puede colar por mayúsculas; en Linux —que es donde
         * corre CI y desde donde se publica— revienta. El sabotaje rompe la ruta
         * de un fichero que SÍ viaja al paquete.
         */
        nombre: 'mayusculas',
        corre: 'node prueba_mayusculas.mjs',
        fichero: 'public/js/alisa-engine/src/gym/envs/DefiendeEnv.js',
        de: "from '../../world/systems/DefiendeSystem.js';",
        a: "from '../../world/systems/defiendesystem.js';",
        vigila: 'que ningún import publicado apunte a un fichero que no existe',
    },
    {
        /**
         * El fallo REAL, y estaba puesto hasta el 25-08: `describe()` decía por
         * dónde ENTRA el camino y cuántas celdas tiene, pero no CUÁLES. La puerta
         * numérica mandaba las 144 casillas del terreno y la humana lo pintaba;
         * la de lenguaje daba los extremos y a callar.
         *
         * Con eso un modelo no podía colocar bien ni queriendo, y su mala nota
         * habría hablado de la puerta y no de él — la peor forma de mentir que
         * tiene un banco. Medido: 55 puntos antes, 525 después.
         *
         * El sabotaje le quita la ruta a la descripción y deja el resto igual.
         */
        nombre: 'puente',
        corre: 'node --import ./resolver_three.mjs prueba_puente.mjs',
        fichero: 'public/js/alisa-engine/src/gym/envs/DefiendeEnv.js',
        de: '`pasando por ${o.camino.length} celdas, en este orden: ${ruta}.`,',
        a: '`pasando por ${o.camino.length} celdas.`,',
        vigila: 'que la puerta de lenguaje lleve el problema entero, no la mitad',
    },
    {
        /**
         * El fallo REAL que tuvo esto en su primera versión: los tipos de pieza
         * salían de las piezas PRESENTES al empezar, así que un tipo que aparece
         * después —un cajón que se abre y resulta ser el mapache— caía a cero, el
         * mismo número que «cerrado». En Cabinet eso borra el juego entero y el
         * vector no cambiaba nunca.
         *
         * El sabotaje devuelve esa derivación.
         */
        nombre: 'observacion',
        corre: 'node --import ./resolver_three.mjs prueba_observacion.mjs',
        fichero: 'public/js/alisa-engine/src/gym/SubstrateObservation.js',
        de: '?? (sus.leyenda ? Object.keys(sus.leyenda).sort()',
        a: '?? (false ? Object.keys(sus.leyenda).sort()',
        vigila: 'que del sustrato salga un vector que de verdad lleve el juego dentro',
    },
    {
        /**
         * El fallo clásico de un dibujante que reusa mallas: dejar de pintar una
         * pieza que ha desaparecido y que la malla se quede donde estaba. En
         * pantalla se ve un bicho muerto que sigue ahí, y quien juega decide
         * contra un fantasma. No da ningún error.
         */
        nombre: 'pintor-mundo',
        corre: 'node --import ./resolver_three.mjs prueba_pintor_mundo.mjs',
        fichero: 'public/js/pintor_mundo.mjs',
        de: 'for (const [clave, m] of this._piezas) if (!vivas.has(clave)) m.visible = false;',
        a: 'for (const [clave, m] of this._piezas) if (!vivas.has(clave)) { /* fantasma */ }',
        vigila: 'que una pieza que desaparece del estado deje de verse en pantalla',
    },
    {
        /**
         * El fallo que tenía la mesa hasta hoy, y que sólo salía en los juegos
         * donde una pieza CAMBIA DE TIPO: la clave llevaba el tipo dentro, así que
         * un planeta escaneado pasaba por pieza nueva. La mesa fabricaba otra
         * figura y escondía la que la página llevaba puesta — el planeta
         * desaparecía justo al escanearlo, que es lo contrario de lo que hace el
         * juego.
         *
         * No lo veía nadie porque la mesa tenía nueve mundos en las pruebas y cero
         * páginas en pantalla. Salió al enchufar la primera.
         */
        nombre: 'pintor-mundo-identidad',
        corre: 'node --import ./resolver_three.mjs prueba_pintor_mundo.mjs',
        fichero: 'public/js/pintor_mundo.mjs',
        de: "const clave = p.cajon !== undefined ? `#${p.cajon}` : `${p.t}#${i}`;",
        a: 'const clave = `${p.t}#${p.cajon ?? i}`;',
        vigila: 'que una pieza que cambia de tipo siga siendo la misma pieza',
    },
    {
        /**
         * El fallo REAL que había hasta el 25-08: el vocabulario del terreno
         * estaba escrito a fuego —0 vacío, 1 muro, 2 destino— porque sólo lo
         * usaban juegos de tablero. ¡Defiende! usa 1=sendero y 2=núcleo, así que
         * su mapa de texto decía que había MUROS por donde vienen los bichos.
         *
         * Un mapa que miente es peor que ninguno: el modelo decide contra un
         * terreno que no existe y su mala nota habla de la puerta, no de él.
         */
        nombre: 'texto',
        corre: 'node --import ./resolver_three.mjs prueba_texto.mjs',
        fichero: 'public/arcade/js/protohub/descripcion.js',
        de: "const SUELO = sus.terreno ?? { 0: '.', 1: '#', 2: 'o' };",
        a: "const SUELO = { 0: '.', 1: '#', 2: 'o' };",
        vigila: 'que el mapa de texto use el vocabulario que el mundo declara, no otro',
    },
    {
        /**
         * El fallo que ya pasó una vez y no dio ningún error: una página que se
         * dibuja leyendo el motor por dentro en vez del sustrato. Se ve
         * perfectamente —acierta el día que se escribe— y se separa sola después.
         * Es literalmente lo que pasó con ¡Busca!, donde la persona y el banco
         * jugaron a dos juegos con el mismo nombre durante semanas.
         *
         * El sabotaje le quita a ¡Defiende! la única llamada al sustrato que hay
         * en toda la página. Sigue dibujando igual de bien: por eso hace falta un
         * suelo que lo cuente, y no un ojo que lo mire.
         */
        /**
         * El fallo REAL, y estuvo puesto hasta el 25-08: dos pintores de la misma
         * familia pidiendo cosas distintas. `PintorMatriz#pintar` llevaba los
         * colores del terreno en un segundo parámetro y `PintorMundo#pintar` no.
         *
         * No daba ningún error —un parámetro de más se ignora en silencio— y es
         * justo por eso que hace falta una comprobación: quien aprendiera una de
         * las dos llamadas se equivocaría con la otra sin que nada se lo dijera.
         *
         * La tripleta es la misma con la que hablan los Seres del proyecto:
         * `@Objeto #metodo |parametro`. Aquí, `#pintar |sustrato` y nada más.
         */
        /**
         * El fallo REAL, y estaba puesto hasta el 25-08: `defensa-protohub`
         * ofrecía 68 acciones con el verbo `enviar a`, `enviar b`… y `args: {}`.
         * Un método y 68 objetivos, con el parámetro metido dentro de la cadena
         * donde nadie podía leerlo, y los `args` mintiendo.
         *
         * El sabotaje devuelve el método sin partir: vuelve a haber parámetros
         * escondidos, que es la avería que la ley AIO-I evita teniendo las tres
         * partes separadas.
         */
        /**
         * El fallo que sale EN VERDE, que son los peores: ejecutar un átomo sin
         * comprobar a qué mundo va dirigido. `@Chess #jugar |a2a3` movería una
         * torreta en ¡Defiende! porque el método casa, y el resultado sería una
         * jugada perfectamente legal — sólo que no la que se pidió.
         *
         * Es la parte de identidad de AIO: allí un decreto se ejecuta «bajo la
         * identidad real del emisor», y aquí una intención sólo vale en el mundo
         * al que va dirigida.
         */
        nombre: 'atomo-identidad',
        corre: 'node --import ./resolver_three.mjs prueba_gramatica.mjs',
        fichero: 'public/js/alisa-engine/src/gym/GymEnv.js',
        de: 'if (at.objeto.toLowerCase() !== mio.toLowerCase()) {',
        a: 'if (false) {',
        vigila: 'que una intención sólo se ejecute en el mundo al que va dirigida',
    },
    {
        /**
         * El fallo REAL, y lo encontró una beta tester el 25-08 jugando: la
         * puerta HTTP devolvía el estado numérico de las reglas y NINGÚN mapa,
         * teniendo el dibujante a una llamada. 19 de los 40 juegos publican
         * rejilla, así que había diecinueve entornos donde un modelo de lenguaje
         * jugaba a ciegas — y su nota medía la puerta, no al agente.
         *
         * El sabotaje quita el mapa de la respuesta. Nada da error: la puerta
         * sigue contestando 200 con su estado y sus acciones legales, igual que
         * llevaba semanas haciendo. Por eso hace falta comprobarlo.
         */
        /**
         * El fallo REAL, y le costó ocho días a este proyecto: una tabla
         * publicada con los números incrustados, que se separó de la medición sin
         * que nada avisara. La página decía `azar 0.14` y el JSON `0.686`.
         *
         * `suelo.html` nació sin copia —pide el fichero— así que no puede
         * separarse. El sabotaje le pega una nota a mano, que es exactamente
         * cómo volvería a pasar: alguien «arregla» la página incrustando la tabla
         * para que cargue antes.
         */
        /**
         * El fallo REAL, y era el estado del proyecto hasta el 25-08: NINGUNA
         * página de saga tenía botón de aviso. Se podía jugar y no se podía
         * contar nada — un beta test es mirar a la gente jugar por un cristal si
         * no hay canal de vuelta.
         *
         * El sabotaje le quita el botón a una etapa. Nada da error: la página
         * carga igual, se juega igual, y quien vea algo raro no tendrá dónde
         * decirlo. Por eso hace falta contarlo.
         */
        nombre: 'sagas-puerta',
        corre: 'node prueba_sagas_puerta.mjs',
        fichero: 'public/games/defiende_sendero.html',
        de: '<script type="module" src="/arcade/js/protohub/reportar.js"></script>',
        a: '',
        vigila: 'que se pueda entrar a todas las sagas y avisar desde dentro',
    },
    {
        nombre: 'suelo-publicado',
        corre: 'node prueba_clasificacion.mjs',
        fichero: 'public/suelo.html',
        de: '<h1>El suelo ciego</h1>',
        a: '<h1>El suelo ciego</h1>\n<p>Defiende: -300,00</p>',
        vigila: 'que la tabla publicada no guarde copia de la medición',
    },
    {
        nombre: 'mapa',
        corre: 'node prueba_mapa.mjs',
        fichero: 'functions/api/gym.js',
        de: '        if (sus?.rejilla) mapa = describirSustrato(sus);',
        a: '        if (false) mapa = describirSustrato(sus);',
        vigila: 'que el agente reciba el mismo tablero que ve la persona',
    },
    {
        /**
         * El fallo REAL, medido antes de arreglarlo: `derecha` era un método en
         * 13 mundos, `izquierda` en 11, `abajo` en 10, `arriba` en 8. Doce
         * métodos distintos para UNA acción con doce destinos.
         *
         * No es cosmética: quien aprende `#mover` lo aplica en trece mundos, y
         * quien aprende `#derecha` no ha aprendido nada que le sirva en el
         * siguiente. Un banco que dice medir transferencia no puede partir la
         * misma acción en doce fichas sueltas.
         *
         * El sabotaje vacía la lista de direcciones. Nada da error: los verbos
         * siguen siendo legales y las partidas se juegan igual — sólo vuelven a
         * ser doce métodos donde había uno.
         */
        nombre: 'direcciones',
        corre: 'node --import ./resolver_three.mjs prueba_gramatica.mjs',
        fichero: 'public/js/alisa-engine/src/gym/Grammar.js',
        de: "    'arriba', 'abajo', 'izquierda', 'derecha',",
        a: '',
        vigila: 'que una dirección no se haga pasar por método',
    },
    {
        nombre: 'gramatica',
        corre: 'node --import ./resolver_three.mjs prueba_gramatica.mjs',
        fichero: 'public/js/alisa-engine/src/gym/Grammar.js',
        de: '    const espacio = v.search(/\\s/);',
        a: '    const espacio = -1;',
        vigila: 'que ningún método esconda un parámetro dentro',
    },
    {
        nombre: 'pintores-hablan-igual',
        corre: 'node --import ./resolver_three.mjs prueba_pintor_matriz.mjs',
        fichero: 'public/js/pintor_matriz.mjs',
        de: '    pintar(sus) {',
        a: '    pintar(sus, opciones = {}) {',
        vigila: 'que todos los pintores pidan lo mismo: el sustrato y nada más',
    },
    {
        nombre: 'paginas',
        corre: 'node paginas.mjs',
        fichero: 'public/games/defiende_sendero.html',
        de: 'celda = pintor.pintar(nucleo.sustrato());',
        a: 'celda = pintor.pintar(nucleo.observacion());',
        vigila: 'que lo que ve la persona salga del mismo sitio que lee el banco',
    },
    {
        /**
         * El fallo REAL, y estaba puesto: cambiar la calibración de un juego sin
         * subirle la versión. Esta semana pasó tres veces —¡Busca! 4, ¡Busca! 5 y
         * Cabinet— y las tres siguen llamándose `-v0`, así que cualquier nota
         * publicada antes es hoy incomparable con una de después.
         *
         * El sabotaje cambia el combustible de ¡Busca! 4 en una unidad: suficiente
         * para que el juego se comporte distinto, poco para que se note a ojo.
         */
        /**
         * ⚠️ Y EL TERCERO CADUCADO POR LA MISMA MUDANZA. Como el de `puertas-busca`
         * y el de `sistemas`: los ajustes de ¡Busca! se fueron del entorno a las
         * tablas ROM de `RaccoonSpaceCore` y los sabotajes se quedaron apuntando al
         * sitio viejo. Tres de sesenta, todos por el mismo cambio, y ninguno avisó.
         *
         * Es el argumento más fuerte que hay para meter esta prueba en `npm test`:
         * refactorizar mueve texto, y un sabotaje es texto que tiene que seguir
         * encajando. Sin correrla, la red se deshilacha por donde se trabaja.
         */
        nombre: 'huella',
        corre: 'node --import ./resolver_three.mjs prueba_huella.mjs',
        fichero: 'public/js/alisa-engine/src/world/systems/RaccoonSpaceCore.js',
        de: 'tankSize: 180, planets: 10, asteroids: 0, fuel: 30, tope: 3000,',
        a: 'tankSize: 180, planets: 10, asteroids: 0, fuel: 31, tope: 3000,',
        vigila: 'que un juego no cambie de comportamiento conservando su nombre',
    },
    {
        nombre: 'senal',
        corre: 'node prueba_senal.mjs',
        fichero: 'public/js/alisa-engine/src/gym/ProtoHubEnv.js',
        de: 'reward: ahora - antes,',
        a: 'reward: 1,',
        vigila: 'que la nota de un entorno dependa de lo que hace el jugador',
    },
    {
        nombre: 'sustrato:secreto',
        corre: 'node prueba_sustrato.mjs',
        fichero: 'public/arcade/js/protohub/rules/shinigami.js',
        de: 'const mio = p.oculta?.[yo.silla];',
        a: 'const mio = Object.values(p.oculta ?? {})[0];',
        vigila: 'que la elección a solas de una silla no se vea desde otra',
    },
    {
        nombre: 'sustrato:cuenta',
        corre: 'node prueba_sustrato.mjs',
        fichero: 'public/arcade/js/protohub/rules/guerra.js',
        de: ', reflejo: true },',
        a: ' },',
        vigila: 'que los montones dibujados sumen las cartas que el juego dice que hay',
    },
    {
        /**
         * La mitad nueva de esa prueba: los MUNDOS. Hasta el 24-08 publicaban
         * sustrato 24 juegos del arcade y CERO mundos, y por eso el arcade tiene
         * mesa compartida y cada página de mundo se escribe su propio pintado.
         * El sabotaje descuadra la rejilla de ¡Defiende! con su número de celdas.
         */
        nombre: 'sustrato:mundos',
        corre: 'node prueba_sustrato.mjs',
        fichero: 'public/js/alisa-engine/src/world/systems/DefiendeSystem.js',
        de: 'rejilla: { ancho: L, alto: L, celdas },',
        a: 'rejilla: { ancho: L, alto: L + 1, celdas },',
        vigila: 'que el sustrato de un mundo describa de verdad lo que el juego tiene',
    },
    {
        nombre: 'openapi',
        corre: 'node prueba_openapi.mjs',
        fichero: 'public/openapi.json',
        de: '"/api/verificar"',
        a: '"/api/verificar_QUITADA"',
        vigila: 'que las puertas declaradas y las que existen sean las mismas',
    },
    {
        nombre: 'funcion',
        corre: 'node prueba_funcion.mjs',
        fichero: 'functions/api/verificar.js',
        /**
         * El verificador de servidor, dando por buena cualquier partida. Es la
         * trampa que sostiene el corpus: si esto se cae, entra basura y nadie se
         * entera — que es literalmente lo que ese fichero dice impedir.
         */
        de: "import { verificar, puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';",
        a: "import { verificar as __v, puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';\n"
         + "const verificar = () => ({ valida: true, puntos: 999999, terminada: true });",
        vigila: 'que el verificador de servidor cace las partidas infladas',
    },
    {
        nombre: 'gym_envs',
        corre: 'node check_gym_envs.mjs',
        fichero: 'public/js/alisa-engine/src/gym/ProtoHubEnv.js',
        /**
         * ⚠️ AQUÍ FALLÉ LA PUNTERÍA DOS VECES, Y ES EL ERROR TÍPICO DE ESTE FICHERO.
         *
         * Primero cambié `juego: 'ajedrez'` en el catálogo: la prueba aprobó, porque
         * enumera el catálogo y construye cada entorno — un nombre distinto se
         * construye igual. Luego puse `reset(` a secas, que aparece también en un
         * COMENTARIO del fichero, así que el reemplazo cayó donde no debía.
         *
         * El sabotaje tiene que romper lo que la prueba MIRA. Aquí es el contrato que
         * sí comprueba: `reset(seed)` devolviendo una observación vacía.
         */
        de: 'reset(seed = 0) {',
        a: 'reset(seed = 0) { return []; }\n    __resetViejo(seed = 0) {',
        vigila: 'que los entornos del banco se puedan enumerar, cargar y jugar',
    },
    {
        nombre: 'semillas',
        corre: 'node --import ./resolver_three.mjs prueba_semillas.mjs',
        fichero: 'public/js/alisa-engine/src/world/systems/BoidsSystem.js',
        /**
         * Un `Math.random(` dentro de un fichero `*System.js` del motor — que es
         * literalmente lo que esa prueba busca recorriendo el árbol, y BoidsSystem
         * es uno de los que hoy da por SEMBRADOS, así que ensuciarlo sube la deuda.
         *
         * Dos intentos fallidos antes: `rules/azar.js` (es el generador de las
         * REGLAS, no un sistema del motor) y `ProceduralKinematics.js` (no acaba en
         * `System.js`, así que el recorrido ni lo abre). Las dos veces la prueba
         * aprobó con razón y yo estuve a punto de acusarla.
         */
        de: 'export',
        a: 'const __ruido = () => Math.random();\nexport',
        vigila: 'que los sistemas del motor usen su semilla y no `Math.random`',
    },
    {
        nombre: 'fin',
        corre: 'node prueba_fin.mjs',
        fichero: 'public/js/alisa-engine/src/gym/GymEnv.js',
        /**
         * El fallo REAL, tal cual estaba hasta el 28-08-2026: el episodio salía
         * diciendo sólo `done`, y quien truncaba —este mismo bucle, con su
         * `maxSteps`— no lo confesaba. Volver a quitar las dos líneas deja el
         * banco exactamente como estaba: cincuenta y tres entornos donde un
         * jaque mate y un corte por tope son indistinguibles desde fuera.
         *
         * Se sabotea el RUNNER y no un entorno a propósito: si se rompiera
         * `AsteroidsEnv.razonDelFin`, sólo caería uno de los cincuenta y tres y
         * la prueba podría aprobar por mayoría. Aquí caen los cincuenta y tres.
         */
        /**
         * ⚠️ DE UNA SOLA LÍNEA, Y NO POR GUSTO.
         *
         * Mi primera versión buscaba las DOS líneas juntas, unidas por `\n`. No
         * encajó nunca: estos ficheros están en disco con finales `\r\n` —git lo
         * avisa al añadirlos— así que un `\n` a pelo no casa con nada. La prueba
         * dijo «el sabotaje ya no encaja» y tenía toda la razón.
         */
        de: 'terminated: this.terminated,',
        a: '',
        vigila: 'que un episodio diga POR QUÉ se acabó, y no sólo que se acabó',
    },
    {
        nombre: 'tras-el-final',
        corre: 'node prueba_tras_el_final.mjs',
        fichero: 'public/arcade/js/protohub/rules/go.js',
        /**
         * El fallo REAL, tal cual estuvo hasta el 28-08-2026: `mover` no miraba los
         * dos pases, así que una piedra puesta después del final colaba Y ponía
         * `pasesSeguidos = 0` — la partida terminada volvía a estar viva.
         *
         * Se elige el go y no el dominó porque es el caso grave: el dominó acepta
         * un `pasar` que no cambia nada, y el go deja continuar la partida.
         */
        de: 'if (p.pasesSeguidos >= 2) return false;',
        a: '',
        vigila: 'que un juego terminado no se pueda seguir jugando',
    },
    {
        nombre: 'aspecto',
        corre: 'node prueba_aspecto.mjs',
        fichero: 'public/arcade/js/protohub/render/aspecto.js',
        /**
         * LA LEY, cortada. `sinLuz` se decide DESPUÉS de aplicar la piel, y ése
         * orden es lo único que impide que una piel apague la cara de una carta.
         * Dejando que la piel mande, «configúralo todo» pasa a incluir «déjalo
         * ilegible» — y sería un permiso concedido sin que nadie lo escribiera.
         *
         * Comprobado a mano antes de declararlo: con el cable cortado,
         * `prueba_aspecto` sale 1 y nombra las dos lecturas que se apagaron.
         */
        de: 'sinLuz: clase === LECTURA',
        a: 'sinLuz: encima.sinLuz ?? (clase === LECTURA)',
        vigila: 'que una piel pueda pintar una carta pero no apagarla',
    },
    {
        nombre: 'patron-sala',
        corre: 'node --import ./resolver_three.mjs prueba_patron_sala.mjs',
        fichero: 'public/arcade/js/protohub/habitacion.js',
        /**
         * La baldosa, movida. Es el número que ya mintió una vez —1,60 m donde las
         * otras dos salas tienen 2,00— y el que esta comprobación existe para
         * congelar.
         *
         * ⚠️ Y ES EL SABOTAJE QUE LA PRUEBA NO SABÍA VER HASTA HOY. `GridHelper`
         * construye su geometría sin `parameters`, así que el patrón guardaba su
         * color y su altura y NO su tamaño: cambiar las divisiones pasaba en verde.
         * Se arregló midiendo la caja envolvente y los vértices, que los tiene
         * cualquier malla. Si algún día vuelve a aprobar con esto puesto, es que
         * alguien le volvió a recortar el universo.
         */
        de: "casilla: 20,                    // 2 m",
        a: "casilla: 16,                    // 2 m",
        vigila: 'que la sala no cambie de tamaño sin que nadie lo diga',
    },
    {
        nombre: 'bandos',
        corre: 'node prueba_bandos.mjs',
        fichero: 'public/arcade/js/protohub/descripcion.js',
        /**
         * El fallo REAL, tal cual estuvo hasta el 28-08-2026: el glifo del mapa
         * salía del TIPO de pieza y el dueño no se miraba, así que el ajedrez
         * enseñaba las dos bandas en mayúsculas idénticas y el reversi un tablero
         * de círculos iguales. Un agente de lenguaje no podía saber cuáles eran
         * suyas.
         *
         * Lo encontró un cliente de Python escrito desde fuera — lo primero que
         * hace alguien que llega es leer lo que le mandas.
         */
        de: 'if (!ambiguo(t) || de === null || de === undefined) return base;',
        a: 'return base;',
        vigila: 'que el mapa de texto diga de quién es cada pieza',
    },
    {
        nombre: 'props',
        corre: 'node --import ./resolver_three.mjs prueba_props.mjs',
        fichero: 'public/arcade/js/protohub/render/sitio.js',
        /**
         * ⚠️ ESTE SABOTAJE NO ES INVENTADO: ES EL FALLO QUE HABÍA.
         *
         * `generators/gen_semantic_props.html` —el único que leía el catálogo—
         * tiene una cadena de `if` con `box`, `cylinder` y `sphere` y SIN `wedge`.
         * La geometría se quedaba en `undefined` y la pieza desaparecía: sin
         * error, sin aviso, sin hueco visible.
         *
         * Medido: 63 cuñas repartidas en 50 de los 234 props, uno de cada cinco.
         * Quitar aquí ese mismo caso reproduce el estado del que venimos, y la
         * prueba tiene que verlo.
         */
        de: "case 'wedge':    return cuña(THREE, s[0] ?? 1, s[1] ?? 1, s[2] ?? 1);",
        a: '',
        vigila: 'que las cuatro formas del catálogo se dibujen, y no tres',
    },
    {
        nombre: 'sonidos',
        corre: 'node prueba_sonidos.mjs',
        fichero: 'public/js/alisa-engine/src/soma/audio/sonido.js',
        /**
         * ⚠️ UN SONIDO QUE NO SUENA NO SE QUEJA — Y ES LA MITAD DE ESTE PROYECTO.
         *
         * `prueba_sonido.mjs` (la vieja) compara listas de NOMBRES, y ella misma
         * declara su límite: «`sfx.js` no es un módulo, así que esto lo lee, no lo
         * ejecuta». Un sonido podía estar declarado, con el nombre correcto, y ser
         * silencio. El fallo y el funcionamiento correcto suenan igual.
         *
         * Ahora 53 de los 63 son recetas en datos y la síntesis es matemática pura,
         * así que se pueden RENDERIZAR en Node y medirles la energía. Callar la
         * síntesis de las ondas deja mudos a casi todos, y eso ahora se ve.
         *
         * Ataca al mundo y no al instrumento, que es la lección que me costó dos
         * sabotajes caducados esta misma noche.
         */
        de: '            salida[i] += onda(fase) * vol * Math.exp(-3 * avance);',
        a: '            salida[i] += 0;',
        vigila: 'que un sonido declarado suene de verdad y no sea silencio',
    },
    {
        nombre: 'mapa_de_sonido',
        corre: 'node prueba_sonidos.mjs',
        fichero: 'public/arcade/js/protohub/rules/mecha.js',
        /**
         * ⚠️ LA MISMA ENFERMEDAD, UN PISO MÁS ARRIBA: EL NOMBRE MAL ESCRITO.
         *
         * Desde hoy un juego puede declarar en su sustrato qué suena en cada
         * jugada. El catálogo está bien, la síntesis está bien, `SFX.play` está
         * bien — y si el juego escribe `tic` donde el sonido se llama `tick`, esa
         * jugada enmudece. Sin error y sin aviso, porque el resto del juego sigue
         * sonando: no es un silencio, es UN hueco, que se nota todavía menos.
         *
         * Ataca al mundo —a lo que el juego declara— y no al instrumento. Ése es
         * el sabotaje que no caduca cuando el catálogo se muda de sitio, que es lo
         * que ya me pasó tres veces con `sfx.js`.
         */
        de: "                    bomba: 'tick',",
        a: "                    bomba: 'tic',",
        vigila: 'que un juego no pueda pedir un sonido que no existe',
    },
    {
        nombre: 'verbos_de_jugada',
        corre: 'node prueba_sonidos.mjs',
        fichero: 'public/data/sonidos.json',
        /**
         * ⚠️ EL MISMO ERROR DE DEDO, PERO EN LA TABLA QUE COMPARTEN TREINTA JUEGOS.
         *
         * El mapa de `mecha` sólo puede enmudecer a `mecha`. Esta tabla la usan
         * treinta: un `footsteps` por `footstep` deja sin sonido de paso a los
         * trece juegos que se mueven, todos a la vez, y ninguno da error — cada
         * uno cae al genérico y sigue sonando, sólo que a otra cosa.
         *
         * Va en los datos y no en el código a propósito: es donde de verdad se
         * escribe mal un nombre.
         */
        de: '"arriba": "footstep",',
        a: '"arriba": "footsteps",',
        vigila: 'que la tabla compartida de verbos no mande a un sonido inexistente',
    },
    {
        nombre: 'vista_generica_muda',
        corre: 'node prueba_sonidos.mjs',
        fichero: 'public/arcade/js/mesa_tablero.mjs',
        /**
         * ⚠️ ESTO NO ES UNA AVERÍA INVENTADA: ES EL ESTADO EN EL QUE ESTUVO EL
         *    ARCADE HASTA EL 29-08-2026, Y NADIE LO VIO.
         *
         * `sonido_mesa.js` enchufa el sonido envolviendo el `backend` de los dos
         * motores clásicos, y su cabecera decía que por ahí «pasa TODA jugada de
         * los cuarenta juegos». Falso: sólo pasan los 20 que tienen visualizador
         * propio. Los otros 21 —mecha, sokoban, go, reversi, xiangqi, damas y
         * quince más— salen con la vista genérica, que llama a `hub.move` sin
         * backend ninguno. No sonaban al jugar. Nunca.
         *
         * Se destapó midiendo en Chrome, no leyendo. Quitar aquí esa línea
         * devuelve el arcade a ese estado, y la prueba tiene que verlo.
         */
        de: "            window.sonarJugada?.(m, 'ficha');",
        a: '',
        vigila: 'que los 21 juegos de la vista genérica no se queden mudos otra vez',
    },
    {
        nombre: 'arneses',
        corre: 'node --import ./resolver_three.mjs prueba_arneses.mjs',
        fichero: 'public/js/gym_runners/boids_gym.js',
        /**
         * ⚠️ ESTE SABOTAJE HUBO QUE CAMBIARLO DOS VECES EN LA MISMA NOCHE, Y EL
         *    MOTIVO ES UNA LECCIÓN SOBRE LOS SABOTAJES EN GENERAL.
         *
         * El primero quitaba `llamadas++` de la sonda, para que dejara de contar
         * quién llama a `Math.random`. Mordía perfectamente… mientras doce arneses
         * lo llamaban. Al sembrarlos, el contador pasó a valer cero de todas formas
         * y el sabotaje dejó de cambiar nada.
         *
         * El segundo silenciaba a `mal()`, el que anota los fallos. También mordía…
         * mientras quedara algún fallo que anotar. Al arreglar el último arnés y
         * bajar el techo a CERO, silenciar al delator dejó de cambiar nada otra vez:
         * no hay nada que callar.
         *
         * Las dos veces la meta-prueba lo cazó con «APRUEBA CON EL CABLE CORTADO»,
         * que es exactamente para lo que está. Pero la lección es general: **un
         * sabotaje que ataca al INSTRUMENTO caduca cuando el mundo mejora.** Sigue
         * en el fichero, sigue pareciendo que vigila, y ya no vigila nada.
         *
         * El bueno ataca al MUNDO: se le quita el ámbito determinista a un arnés,
         * que es literalmente la avería que tenían doce de los veintidós. Ése no
         * puede caducar mientras la prueba tenga sentido, porque reproduce el fallo
         * que la prueba existe para encontrar.
         */
        de: '    return DeterministicScope.runAsync(SEMILLA, () => _episodio(...args));',
        a: '    return _episodio(...args);',
        vigila: 'que un arnés sin sembrar no pase por bueno',
    },
    {
        nombre: 'mecha',
        corre: 'node prueba_mecha.mjs',
        fichero: 'public/arcade/js/protohub/rules/mecha.js',
        /**
         * ⚠️ ES LA AVERÍA QUE TUVO, NO UNA INVENTADA — Y ES DE LAS QUE NO DAN ERROR.
         *
         * El rival de casa recorría las direcciones en orden absoluto: arriba,
         * abajo, izquierda, derecha. En una arena simétrica girada 180°, el
         * «arriba» de un jugador es el «abajo» del otro, así que al empatar dos
         * opciones los dos preferían la misma dirección DEL MUNDO — que para uno
         * apunta hacia su rival y para el otro hacia su pared.
         *
         * Resultado medido: el asiento 0 ganaba el 61 % sobre un mapa
         * demostrablemente simétrico. Ninguna partida fallaba, ninguna consola
         * decía nada, y el juego era injusto. En un banco donde se comparan
         * personas contra agentes, un asiento que gana solo invalida la medida
         * entera sin que nadie se entere.
         *
         * ⚠️ Y OJO CON LA MÉTRICA, QUE AQUÍ ESTÁ LA TRAMPA.
         *
         * La primera versión de la prueba contaba «gana quien empieza» y APROBABA
         * con este sabotaje puesto: como cada semilla se juega con los dos órdenes
         * de salida, el sesgo de asiento se reparte entre las dos mitades y se
         * promedia hasta desaparecer. Hace falta contar TAMBIÉN por asiento.
         */
        de: 'const dirsDe = (asiento) => ORDEN[asiento % 2].map((m) => [m, DIRS[m]]);',
        a: 'const dirsDe = (asiento) => ORDEN[0].map((m) => [m, DIRS[m]]);',
        vigila: 'que los dos asientos de la arena sean el mismo asiento',
    },
    {
        nombre: 'cara',
        corre: 'node prueba_cara.mjs',
        fichero: 'public/js/tools/AvatarCalibrationTool.js',
        /**
         * ⚠️ ESTO NO ES UNA AVERÍA IMAGINADA: ES EL ESTADO DEL QUE VENIMOS.
         *
         * Hasta el 28-08-2026, `setExpression` NO EXISTÍA. Dos páginas lo
         * llamaban —`labs/croupier_avatar_face_lab.html` y
         * `labs/croupier_confessional.html`— y estaban rotas por eso: la primera
         * reventaba dentro del callback del cargador de GLB y se quedaba en
         * «booting…» para siempre; la segunda lo envolvía en un `try/catch` y
         * escribía «face init failed» en la consola, o sea que fallaba en
         * silencio, que es peor.
         *
         * Lo que había pintaba dos rectángulos cian: ojos abiertos y ojos
         * cerrados. Parpadeaba, y nada más.
         *
         * Se buscó el código perdido en tres unidades de disco, 36 GB de copias de
         * seguridad y siete versiones antiguas de este mismo fichero. En ninguna
         * estaba. Se reescribió desde lo que sí sobrevivió: `face_anchors.json` y
         * las ocho expresiones del léxico con su símbolo de anime.
         *
         * Ignorar la expresión elegida devuelve el fichero a aquel estado: la cara
         * sigue ahí, sigue parpadeando, y ya no dice nada. La prueba lo ve porque
         * compara PÍXELES entre las 28 parejas, no nombres.
         */
        de: '        this.currentExpression = elegido;',
        a: "        this.currentExpression = 'neutral';",
        vigila: 'que las ocho expresiones se distingan en la cara y no sólo en el léxico',
    },
    {
        nombre: 'esqueletos',
        corre: 'node --import ./resolver_three.mjs prueba_esqueletos.mjs',
        fichero: 'public/js/alisa-engine/src/soma/ProceduralRigging.js',
        /**
         * ⚠️ ESTE SABOTAJE REPRODUCE UN HUECO QUE ESTUVO ABIERTO DE VERDAD.
         *
         * Tres ficheros de datos vivos —`ontology.json`, `skeletons.json` y
         * `kinematics.json`— declaraban los arquetipos `equine` y `theropod`, y la
         * cadena de `else if` que construye esqueletos no los mencionaba ni una
         * vez. El clasificador sabía etiquetar caballos y dinosaurios, y el rigger
         * no sabía montarlos: se caía por el final de la cadena sin rama y sin
         * error.
         *
         * El código estaba en `_archivo/proceduralrigging/ProceduralRigging_pre_topo.js`
         * —33 huesos para el caballo, 15 para el dinosaurio— y se injertó, que no
         * es lo mismo que copiar el fichero: el apartado es una versión ANTERIOR y
         * le falta `bindSkin`. Su nombre vecino, `_BACKUP_PERFECT_BACK`, promete
         * ser el bueno y es peor que el vivo.
         *
         * La prueba recorre TODOS los arquetipos de la ontología, no sólo estos
         * dos, para que el hueco no pueda reabrirse con el siguiente que se añada.
         */
        de: "            } else if (type === 'equine') {",
        a: "            } else if (type === '__sabotaje_equine__') {",
        vigila: 'que todo arquetipo que la ontología declara tenga quien le monte el esqueleto',
    },
    {
        nombre: 'montaje',
        corre: 'node prueba_montaje.mjs',
        fichero: 'public/arcade/js/protohub/render/montaje.js',
        /**
         * ⚠️ EL FALLO QUE NINGUNA REJILLA PUEDE VER.
         *
         * El léxico cuenta las celdas desde ARRIBA, como la pantalla; `setViewport`
         * cuenta desde ABAJO, como OpenGL. Sin voltear, `split_2h` sale del revés
         * y la ventanita del `pip` se va a la esquina contraria.
         *
         * Y lo bonito —o lo peligroso— es que `grid_4` y `cctv_2x2` son SIMÉTRICOS
         * arriba-abajo: volteados dan exactamente el mismo conjunto de celdas. Una
         * prueba escrita sobre la rejilla, que es la disposición más vistosa y la
         * que uno elige sin pensar, aprobaría con el eje invertido.
         *
         * Por eso la prueba se apoya en `split_2h` y `pip`, y lleva un control
         * positivo que comprueba que la rejilla efectivamente NO sirve para esto.
         */
        de: 'return { x: izq, y: alto - abajo, w: der - izq, h: abajo - arriba };',
        a: 'return { x: izq, y: arriba, w: der - izq, h: abajo - arriba };',
        vigila: 'que el eje del léxico y el del renderizador no se den la vuelta en silencio',
    },
    {
        nombre: 'realizacion',
        corre: 'node --import ./resolver_three.mjs prueba_realizacion.mjs',
        fichero: 'public/arcade/js/protohub/render/realizacion.js',
        /**
         * ⚠️ EL PECADO DE LA SEMANA, EN UNA LÍNEA.
         *
         * Vaciar `huecos` deja al director mudo: sigue repartiendo trabajo a los
         * cinco departamentos y ya no dice cuándo no ha sabido. Es exactamente la
         * avería que llevo días persiguiendo en otras formas —`options` que
         * llegaban y no se guardaban, cuñas que no se dibujaban y desaparecían sin
         * error— y aquí duele más, porque OCHO de los once momentos no tienen
         * ambiente de luz asignado todavía. Callarlo significa que ocho planos
         * saldrían con la luz de otro y nadie se enteraría.
         *
         * Esos ocho no son un fallo del código: son ocho decisiones de dirección
         * que le tocan a Oscar. Lo que este sabotaje protege es que sigan
         * VISIBLES hasta que las tome.
         */
        de: '        huecos,',
        a: '        huecos: [],',
        vigila: 'que los huecos del vocabulario se digan en voz alta y no se rellenen en silencio',
    },
    {
        nombre: 'camara',
        corre: 'node --import ./resolver_three.mjs prueba_camara.mjs',
        fichero: 'public/arcade/js/protohub/render/camara.js',
        /**
         * ⚠️ ESTE SABOTAJE ES UN AGUJERO QUE LA PRUEBA TUVO DE VERDAD, NO UNA
         *    AVERÍA IMAGINADA.
         *
         * `prueba_camara.mjs` dio verde a la primera. Antes de fiarme rompí el
         * módulo de cinco maneras a propósito, y DOS aprobaron igual: ignorar el
         * `fov_bias` del ángulo, y mirar al centro del sujeto en vez de a su
         * `y_target`.
         *
         * Las dos son gordas. Sin `fov_bias`, un ojo de pez deja de deformar y se
         * queda en un primer plano cualquiera: el léxico le da +42° y sin ellos es
         * otro plano. Y pasaba porque la prueba medía el cuadro RELATIVO al `fov`
         * que devolvía el propio módulo: si el `fov` baja, la distancia baja con
         * él y el cuadro vuelve a cuadrar. Comprobaba coherencia consigo mismo, no
         * fidelidad al léxico.
         *
         * Se tapó midiendo la CONSECUENCIA en vez de repetir la suma: un objetivo
         * más abierto para el mismo encuadre obliga a acercarse. Quitar el sesgo
         * rompe ese orden y ahora se ve.
         */
        de: 'const fov = enc.fov + (ang.fov_bias ?? 0);',
        a: 'const fov = enc.fov;',
        vigila: 'que el ángulo cambie el objetivo y no sólo el sitio de la cámara',
    },
    {
        nombre: 'plano',
        corre: 'node --import ./resolver_three.mjs prueba_plano.mjs',
        fichero: 'public/js/alisa-engine/src/world/factories/ArcadeTableRoomFactory.js',
        /**
         * El fallo REAL, tal cual estuvo hasta el 28-08-2026: el manejador del
         * clic llevaba las coordenadas escritas otra vez —cuatro `if` con ±2,5—
         * mientras el constructor las escribía por su cuenta. Dos listas del mismo
         * plano que no se hablaban.
         *
         * Y el síntoma no es una excepción: es que mueves una mesa, te olvidas de
         * este bloque, y **el clic te sienta donde ya no hay mesa**. En silencio.
         *
         * Devolver aquí una coordenada literal reproduce esa duplicación, y la
         * prueba la caza leyendo la propia función — que es donde se ve.
         */
        de: 'if (suyos.some(o => this.raycaster.intersectObject(o, true).length > 0)) targetX = sitio.x;',
        a: 'if (suyos.some(o => this.raycaster.intersectObject(o, true).length > 0)) targetX = -2.5;',
        vigila: 'que el plano de la sala esté en un solo sitio y el clic le pregunte',
    },
    {
        nombre: 'preflight',
        corre: 'python preflight.py',
        /**
         * ⚠️ SE SABOTEA EL PAQUETE, NO `public/`. LO DICE SU PROPIO CÓDIGO:
         *
         *     medido = PAQUETE if hay_paquete else PUBLIC
         *
         * O sea que en cuanto existe `dist_publico` —y existe en cuanto alguien
         * empaqueta— `preflight` mide ESO y no las fuentes. Metí el CDN en
         * `public/arcade/index.html` y la prueba aprobó tan tranquila: no estaba
         * muerta, es que yo le estaba rompiendo un fichero que no mira.
         *
         * Es el mismo error que cometí con el gym, y explica por qué este fichero
         * distingue «no sabe fallar» de «el sabotaje no encaja»: hace falta una
         * tercera categoría, «el sabotaje no apunta donde mira la prueba», y la
         * única forma de detectarla es entender qué mide cada una antes de
         * declararle un sabotaje.
         */
        corre_solo_si: 'dist_publico',
        fichero: 'dist_publico/arcade/index.html',
        de: '<link rel="stylesheet" href="css/arcade.css">',
        a: '<link rel="stylesheet" href="css/arcade.css">\n'
         + '<script src="https://cdn.jsdelivr.net/npm/roto@1"></script>',
        vigila: 'que ninguna página del PAQUETE cargue código desde un CDN',
    },
    {
        /**
         * ⚠️ LA OTRA MITAD DE `preflight`: LAS LICENCIAS DE LO QUE VIENE DE FUERA.
         *
         * `traer_modelos.mjs` baja modelos de poly.pizza. Los CC0 no piden nada; los
         * CC-BY piden ATRIBUCIÓN, y publicar uno sin ella incumple la licencia — la
         * misma clase de cosa por la que los recursos de Seaeees se quedan fuera del
         * paquete.
         *
         * El sabotaje cambia la licencia de un modelo a CC-BY sin que exista página
         * de créditos, que es exactamente el caso que no puede colarse. Va sobre el
         * PAQUETE por el mismo motivo que el de arriba: `preflight` mide
         * `dist_publico` en cuanto existe.
         */
        nombre: 'preflight-licencias',
        corre: 'python preflight.py',
        corre_solo_si: 'dist_publico',
        fichero: 'dist_publico/data/creditos_modelos.json',
        de: '"licencia": "CC0 1.0"',
        a: '"licencia": "CC-BY 4.0"',
        vigila: 'que un modelo de fuera no se publique sin cumplir su licencia',
    },
    {
        nombre: 'contrato',
        corre: 'node prueba_contrato.mjs',
        fichero: 'public/js/alisa-engine/src/world/systems/AsteroidsSystem.js',
        /**
         * El fallo REAL contra el que existe `prueba_contrato`, y es de los que
         * NO dan error: si un núcleo deja de publicar `sustrato()`, el juego
         * sigue jugándose igual de bien. Lo único que pasa es que el aviso de un
         * beta deja de traer la partida dentro y la nota deja de poder
         * repetirse. Nadie mira eso jugando, y ninguna otra prueba lo nota.
         *
         * Se sabotea RENOMBRANDO, no borrando, porque así es como pasa de
         * verdad: alguien renombra el método al refactorizar y la página que lo
         * llamaba se queda con un `?.` que devuelve `undefined` sin quejarse.
         * Es exactamente lo que le pasó a esta casa con `getSustrato`: seis
         * etapas con el botón de avisar puesto y sin mundo que adjuntar.
         */
        de: '    sustrato() {',
        a: '    sustratoViejo() {',
        vigila: 'que todo núcleo declarado siga publicando el mundo de su etapa',
    },
];

/**
 * Corre un comando y devuelve si SUSPENDIÓ. No se mira la salida: se mira el código
 * de salida, que es el contrato de `npm test` — si una prueba no sale con error, la
 * cadena entera sigue y el fallo pasa.
 */
function suspende(cmd) {
    return new Promise((res) => {
        const [bin, ...args] = cmd.split(' ');
        const p = spawn(bin, args, { shell: true, stdio: 'ignore' });
        p.on('close', (code) => res(code !== 0));
        p.on('error', () => res(true));
    });
}

const pedidos = process.argv.slice(2);
const lista = pedidos.length
    ? SABOTAJES.filter(s => pedidos.includes(s.nombre))
    : SABOTAJES;

console.log('\n¿SABEN FALLAR NUESTRAS COMPROBACIONES?');
console.log(gris('  se rompe a propósito lo que cada una vigila, y tiene que suspender\n'));

let malas = 0, sinRestaurar = [];

/**
 * ⚠️ EL DAÑO COLATERAL QUE ESTE FICHERO NO SE MIRABA: LO QUE ESCRIBEN LAS PRUEBAS.
 *
 * Se protege el fichero saboteado con mucho cuidado —se guarda, se restaura pase
 * lo que pase y se verifica—, y no se miraba lo OTRO: varias comprobaciones
 * PUBLICAN datos al correr. `prueba_senal.mjs` reescribe
 * `public/data/suelo_por_entorno.json` cada vez, y aquí se la hace correr con un
 * sabotaje puesto.
 *
 * O sea que esta prueba dejaba en el repositorio un fichero de datos generado con
 * el motor averiado, y el sabotaje —que sí se restauraba— se llevaba toda la
 * atención. Medido: 732 líneas cambiadas después de una pasada limpia.
 *
 * No da error, y el fichero sirve una página. Es la forma de siempre: el estropicio
 * no está donde miras.
 *
 * Se fotografía `public/data/` entero antes de empezar y se devuelve al final.
 */
const CARPETA_DATOS = new URL('./public/data/', import.meta.url);
const { readdir: leerCarpeta } = await import('node:fs/promises');
const foto = new Map();
for (const f of await leerCarpeta(CARPETA_DATOS).catch(() => [])) {
    if (!f.endsWith('.json')) continue;
    const u = new URL(f, CARPETA_DATOS);
    foto.set(f, await readFile(u, 'utf8').catch(() => null));
}

for (const s of lista) {
    const original = await readFile(s.fichero, 'utf8').catch(() => null);
    if (original === null) {
        console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} no existe ${s.fichero}`);
        malas++;
        continue;
    }
    if (!original.includes(s.de)) {
        /**
         * Que el sabotaje ya no encaje NO es un detalle: significa que el código
         * cambió y este fichero se quedó atrás. Un sabotaje que no se aplica haría
         * pasar la prueba por buena sin haberla probado, que es exactamente el fallo
         * que este instrumento existe para cazar — cometido aquí dentro.
         */
        console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} el sabotaje ya no encaja: falta «${s.de.slice(0, 40)}»`);
        console.log(gris(`      el código cambió y este fichero no. Hay que actualizar el sabotaje.`));
        malas++;
        continue;
    }

    let restaurado = false;
    try {
        await writeFile(s.fichero, original.split(s.de).join(s.a));
        const suspendio = await suspende(s.corre);
        await writeFile(s.fichero, original);
        restaurado = true;

        if (suspendio) {
            console.log(`  ${verde('✓')} ${s.nombre.padEnd(12)} suspende ${gris('— ' + s.vigila)}`);
        } else {
            console.log(`  ${rojo('✗')} ${s.nombre.padEnd(12)} ${rojo('APRUEBA CON EL CABLE CORTADO')}`);
            console.log(gris(`      dice vigilar: ${s.vigila}`));
            console.log(gris(`      se rompió: ${s.fichero} · «${s.de.slice(0, 50)}»`));
            malas++;
        }
    } finally {
        if (!restaurado) {
            // Segundo intento pase lo que pase: dejar un sabotaje puesto sería
            // muchísimo peor que cualquier fallo que esto pueda encontrar.
            await writeFile(s.fichero, original).catch(() => sinRestaurar.push(s.fichero));
        }
        const ahora = await readFile(s.fichero, 'utf8').catch(() => null);
        if (ahora !== original) sinRestaurar.push(s.fichero);
    }
}

// Y los datos que alguna comprobación haya publicado mientras estaba averiada.
const rehechos = [];
for (const [f, antes] of foto) {
    if (antes === null) continue;
    const u = new URL(f, CARPETA_DATOS);
    const ahora = await readFile(u, 'utf8').catch(() => null);
    if (ahora === null || ahora === antes) continue;
    await writeFile(u, antes).catch(() => sinRestaurar.push(`public/data/${f}`));
    rehechos.push(f);
}
if (rehechos.length) {
    console.log(gris(`\n  ↩ datos devueltos a su sitio: ${rehechos.join(', ')}`));
    console.log(gris('    los publicó una prueba mientras corría con el cable cortado.'));
}

if (sinRestaurar.length) {
    console.log(`\n${rojo('⚠️  NO SE PUDO DEVOLVER A SU SITIO:')}`);
    for (const f of sinRestaurar) console.log(rojo(`      ${f}`));
    console.log(rojo('   RECUPÉRALOS CON `git checkout -- <fichero>` ANTES DE SEGUIR.'));
    process.exit(2);
}

/**
 * Las que todavía no tienen sabotaje se dicen, no se callan. Un «8 de 8 saben
 * fallar» que esconde que hay siete sin mirar es la misma clase de media verdad que
 * este fichero persigue.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL CENSO SE DERIVA. ANTES ERA UNA LISTA A MANO, Y SE QUEDÓ VIEJA.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Aquí había un array `TODAS` con los nombres escritos a mano. Es la enésima lista
 * de este proyecto que se separa de la realidad en silencio — y ésta era la peor,
 * porque es la lista de la red de seguridad.
 *
 * Lo destapó una auditoría externa (Fable, 16-08) con un diagnóstico que no habíamos
 * visto: **todos nuestros errores son de DENOMINADOR, no de predicado.** Toda esta
 * maquinaria vigila si una condición detecta su fallo; ninguna pieza vigilaba si el
 * conjunto sobre el que se mide es el conjunto que existe. Y el sabotaje es
 * estructuralmente ciego a esa clase: una prueba con el universo recortado **sigue
 * sabiendo suspender perfectamente dentro de su universo recortado**. Que este mismo
 * fichero cazara el «6 de 41» de `check_gym_envs` fue un accidente afortunado —el
 * sabotaje cayó justo en la zona no mirada— y nunca se convirtió en mecanismo.
 *
 * Al derivar el censo salieron a la primera DOS guardianes huérfanos: `prueba_fichas`
 * —escrita esa misma mañana, la que vigila que la ficha no mienta— y
 * `prueba_variantes`, que impide que el verificador acepte una partida jugada con
 * otras normas. Existían, pasaban, y no las corría nadie. La duplicación que el
 * proyecto daba por «vigilada» estaba vigilada por un guardia al que nadie pasaba
 * lista.
 *
 * Tres alarmas, y las tres salen de comparar tres conjuntos que deberían coincidir:
 * los ficheros que hay, los que corre `npm test`, y los que tienen sabotaje.
 */
const { readdir } = await import('node:fs/promises');

/**
 * Las que NO van en `npm test`, con su motivo. La lista es corta a propósito: cada
 * entrada aquí es una comprobación que nadie corre por defecto, o sea una que se
 * puede pudrir sin que salte. Sólo entran las que abren navegadores para los 35
 * juegos —minutos por pasada— y por eso tienen su propio `npm run`.
 *
 * Estar aquí NO es un permiso para olvidarlas: es una deuda declarada. Si alguna
 * deja de correrse nunca, mejor traerla a `npm test` aunque tarde.
 */
const APARTE = new Set([
    'prueba_de_las_pruebas.mjs',   // es esto mismo: se corre con `npm run pruebas`
    /**
     * ⚠️ `prueba_vistas` Y `prueba_asimetria` YA SÍ ESTÁN EN `npm test` (27-08), Y
     * SIGUEN AQUÍ SÓLO POR EL PRECIO.
     *
     * Entraron a la suite porque son las DOS únicas que miran si la persona y el
     * agente juegan al mismo juego, y estaban fuera. Sabotearlas además costaría
     * otros ocho minutos de navegador por pasada, así que se quedan exentas — pero
     * la exención cambia de motivo y conviene decirlo: antes era «no las corre
     * nadie por defecto»; ahora es «cuestan demasiado para sabotearlas encima».
     *
     * Y de la duda que deja —¿saben fallar?— hay evidencia del mismo día, que es
     * mejor que un sabotaje simulado porque fue real:
     *
     *   · `prueba_vistas` suspendió con «blackjack: sustrato 3 · dibujadas 2» en
     *     cuanto la mano del crupier entró en la matriz y el visualizador no la
     *     nombraba;
     *   · `prueba_asimetria` suspendió con «remigio, chinchón: descartes» y luego
     *     con «entropy: robada», las tres asimetrías de verdad.
     *
     * Las dos suspendieron solas, sin que nadie les cortara un cable.
     */
    'prueba_vistas.mjs',           // en npm test desde el 27-08; exenta por coste
    'prueba_verbos.mjs',           // abre los 35 en un navegador: `npm run verbos`
    'prueba_portal.mjs',           // abre las 35 fichas en un navegador: `npm run portal`
    // ⚠️ 20-08: estas dos salían denunciadas como «no las corre nadie» y era FALSO —
    // tienen su propio mando desde el día que se escribieron. El aviso miraba sólo
    // `scripts.test` y llamaba huérfana a cualquiera que viviera en otro guion. Se
    // arregla abajo mirando TODOS los guiones, y éstas se quedan aquí porque abren
    // navegador y ése es el motivo real de no estar en `npm test`.
    'prueba_figuras.mjs',          // abre mesas de cartas: `npm run figuras`
    'prueba_invitados.mjs',        // monta juegos dentro de otra escena: `npm run invitados`
    'prueba_asimetria.mjs',        // en npm test desde el 27-08; exenta por coste — ver la nota de arriba
    // Mide, no comprueba: juega cada juego con topes crecientes para averiguar cuántas
    // decisiones necesita y lo escribe en `topes.json`. No tiene veredicto que sabotear
    // —su salida es un número—, y tarda lo que tarda jugar 480 partidas: `npm run topes`.
    'prueba_topes.mjs',
    /**
     * Lleva su sabotaje DENTRO: `npm run guardia -- --autoprueba` avería cuatro juegos en
     * memoria y exige que los cuatro detectores los denuncien. Se queda aparte de `npm
     * test` porque juega setenta mil jugadas y tarda: `npm run guardia`.
     */
    'prueba_guardia.mjs',
    /**
     * Mide, no comprueba una condición: abre los 35 en CUATRO pantallas y cuenta qué se
     * sale de cuadro y qué cae bajo el panel. Necesita navegador y tarda 140 cargas de
     * página: `npm run pantallas`.
     */
    'prueba_pantallas.mjs',
]);

/**
 * ⚠️ DOS LISTAS Y NO UNA, PORQUE SE PREGUNTAN DOS COSAS DISTINTAS.
 *
 * `todasEnDisco` es lo que HAY. `enDisco` es lo que se vigila por huérfano, que
 * excluye a las de `APARTE` porque de ésas ya se sabe por qué no van en `npm test`.
 *
 * Mezclarlas dio un falso al minuto de tocar `APARTE`: la comprobación de «sabotaje
 * que apunta a una prueba que ya no existe» miraba la lista recortada y denunció a
 * `prueba_figuras` y `prueba_invitados`, que estaban ahí mismo. Un fichero existe o
 * no existe; eso no puede depender de si además lo vigilamos.
 */
const todasEnDisco = (await readdir(new URL('.', import.meta.url)))
    .filter(f => /^(prueba_|check_).*\.mjs$/.test(f));
const enDisco = todasEnDisco.filter(f => !APARTE.has(f));
/**
 * ⚠️ SE MIRAN TODOS LOS GUIONES, NO SÓLO `test`.
 *
 * Esto leía `scripts.test` y punto, así que denunciaba como huérfana a cualquier
 * comprobación que viviera en otro mando —`npm run figuras`, `npm run invitados`—
 * aunque se corriera a diario. Una acusación falsa dentro del instrumento que existe
 * para detectar acusaciones falsas se lee mal, y a la tercera se ignora entera.
 *
 * Ahora huérfana significa lo que dice: que no la llama NINGÚN guion.
 */
const guiones = JSON.parse(
    await readFile(new URL('./package.json', import.meta.url), 'utf-8')).scripts ?? {};
const todosLosGuiones = Object.values(guiones).join(' \n ');
const corridas = new Set(enDisco.filter(f => todosLosGuiones.includes(f)));
/**
 * Del comando se saca el fichero de la PRUEBA, no el primer `.mjs` que aparezca:
 * varias se lanzan con `node --import ./resolver_three.mjs prueba_x.mjs`, y quedarse
 * con el primero daba «sabotaje que apunta a una prueba que ya no existe:
 * ./resolver_three.mjs» y tres falsos «sin sabotaje». Un cargador no es una prueba.
 */
const ficheroDe = (cmd) =>
    (cmd.match(/(?:^|[\s/\\])((?:prueba_|check_)[\w.]+\.mjs)/) ?? [])[1];
const conSabotaje = new Set(SABOTAJES.map(s => ficheroDe(s.corre)).filter(Boolean));

const huerfanas = enDisco.filter(f => !corridas.has(f));
const sinSabotaje = [...corridas].filter(f => !conSabotaje.has(f));
const sabotajeMuerto = [...conSabotaje].filter(f => f && !todasEnDisco.includes(f));

console.log(`\n  ${lista.length} comprobaciones puestas a prueba`
    + (malas ? rojo(` · ${malas} no saben fallar`) : verde(' · todas suspenden cuando deben')));

if (!pedidos.length) {
    if (huerfanas.length) {
        console.log(rojo(`\n  ✗ ${huerfanas.length} comprobación(es) que NO CORRE NADIE:`));
        for (const f of huerfanas) console.log(rojo(`      ${f}`));
        console.log('    Existen, pasan, y `npm test` no las llama. Una prueba que');
        console.log('    nadie ejecuta no vigila nada — es un guardia sin turno.');
    }
    if (sinSabotaje.length) {
        console.log(gris(`\n  todavía sin sabotaje declarado (${sinSabotaje.length}): `
                       + sinSabotaje.join(', ')));
    }
    if (sabotajeMuerto.length) {
        console.log(rojo(`\n  ✗ sabotaje que apunta a una prueba que ya no existe: `
                       + sabotajeMuerto.join(', ')));
    }
}
console.log('');
/**
 * Las alarmas del censo sólo cuentan en la pasada COMPLETA. Pedir un sabotaje suelto
 * —`node prueba_de_las_pruebas.mjs clasificacion`— es depurar uno concreto, y hacer
 * que eso falle por una huérfana que no se ha llegado a listar da un rojo mudo: salía
 * `exit 1` debajo de un «todas suspenden cuando deben».
 */
const censoMal = pedidos.length ? 0 : huerfanas.length + sabotajeMuerto.length;
process.exit(malas || censoMal ? 1 : 0);
