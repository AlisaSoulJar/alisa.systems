"""
Envoltura Gymnasium sobre la puerta pública de alisa.systems.

Permite jugar a los 40 juegos del banco desde Python sin instalar nada del
proyecto: sólo `gymnasium` y la stdlib. La puerta es HTTP y no tiene estado.

    import alisa_gym
    env = alisa_gym.AlisaEnv("brisca")
    obs, info = env.reset(seed=7)
    obs, recompensa, terminada, truncada, info = env.step(info["acciones"][0])

⚠️ ESTO NO ES RL NUMÉRICO CLÁSICO.
    La puerta devuelve TEXTO: `descripcion` (una frase con el estado) y a veces
    `mapa` (un dibujo ASCII). No devuelve un vector de observación, y esta
    envoltura NO se lo inventa. El vector existe, pero vive en el JavaScript del
    motor y no sale por la puerta pública.

    Consecuencia práctica: esto sirve a agentes de lenguaje y a políticas que
    operan sobre texto. Para meter aquí un DQN habría que fabricar antes tu
    propio codificador de `estado` (que sí viene, como dict, en `info["estado"]`).
    Simular un vector nosotros sería inventarnos un dato que el servidor no da.

Medido contra https://alisa.systems el 2026-08-28.
"""

from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.request

import gymnasium
from gymnasium import spaces

__all__ = [
    "AlisaEnv",
    "catalogo",
    "AlisaGymError",
    "RespuestaNoJSON",
    "JugadaRechazada",
    "ErrorDeLaPuerta",
]

BASE = "https://alisa.systems"

# ⚠️ EL USER-AGENT NO ES DECORACIÓN: SIN ÉL LA PUERTA DEVUELVE 403.
#
# Cloudflare tiene baneado el User-Agent que urllib manda por defecto
# ("Python-urllib/3.12"). Medido hoy, cuatro intentos sobre POST /api/gym:
#
#     por defecto (Python-urllib) -> 403 text/plain   'error code: 1010\n'
#     User-Agent: Mozilla/5.0     -> 200 application/json
#     User-Agent: alisa-gym-...   -> 200 application/json
#
# Es decir: un cliente Python ingenuo falla el 100% de las veces, en la primera
# llamada, y con un cuerpo de 17 bytes que no es JSON ni explica nada. Vale
# cualquier UA que no sea el de urllib; no hace falta fingir ser un navegador.
#
# El `Accept: application/json` de abajo no es cosmético tampoco: Cloudflare
# negocia el contenido. Con `Accept` puesto, el mismo 403 llega como JSON
# ({"error_code": 1010, "error_name": "browser_signature_banned", ...}) en vez
# de como texto plano, y así el cliente puede DECIR qué pasó en vez de sólo
# enseñar 17 bytes. Por eso se manda siempre, hasta en el GET del catálogo.
AGENTE = "alisa-gym-python/1.0 (+https://alisa.systems/api/gym)"

# La acción más larga vista en el catálogo mide 13 caracteres ("jugar:5-1:der").
# 64 deja margen de sobra sin que el espacio mienta sobre su tamaño.
LARGO_MAX_ACCION = 64

# Las acciones son minúsculas ASCII más ':', '_' y '-' ("jugar:H_K", "a2a4",
# "pedir:6:1", "sacar:H_K:0", "di:arriba"). El charset por omisión de Text sólo
# admite alfanuméricos, así que hay que declararlo o `Text` rechaza sus propias
# acciones legales.
ALFABETO_ACCION = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:_-"
)


# --------------------------------------------------------------------------
# Errores
# --------------------------------------------------------------------------

class AlisaGymError(Exception):
    """Raíz de todos los errores de esta envoltura."""


class RespuestaNoJSON(AlisaGymError):
    """
    La puerta contestó algo que no es JSON.

    ⚠️ ESTE ES EL FALLO QUE MÁS TIEMPO CUESTA DIAGNOSTICAR.
    Cuando alisa.systems se cae o Cloudflare corta la petición, lo que llega no
    es un JSON de error: es HTML de Cloudflare, o texto plano tipo
    'error code: 1010'. Un cliente que haga `json.loads` a pelo revienta con
    "Expecting value: line 1 column 1 (char 0)", que no dice absolutamente nada
    sobre lo que pasó.

    Por eso aquí se detecta y se levanta un error que SÍ dice el código HTTP y
    el principio del cuerpo, que es lo único que permite distinguir un 403 por
    User-Agent de un 502 por servidor caído.
    """

    def __init__(self, codigo, tipo_contenido, cuerpo, url):
        self.codigo = codigo
        self.tipo_contenido = tipo_contenido
        self.cuerpo = cuerpo
        self.url = url
        recorte = cuerpo[:400].replace("\n", " ").strip()
        super().__init__(
            "La puerta no devolvió JSON.\n"
            "  url:            %s\n"
            "  HTTP:           %s\n"
            "  content-type:   %s\n"
            "  cuerpo[:400]:   %s"
            % (url, codigo, tipo_contenido or "(sin cabecera)", recorte)
        )


class ErrorDeLaPuerta(AlisaGymError):
    """
    La puerta contestó JSON, pero con un error dentro (HTTP 4xx).

    Caso típico: un juego que no existe. Devuelve 400 con
    {"error": "no sé jugar a 'x'", "juegos": [...]}.
    """

    def __init__(self, codigo, datos):
        self.codigo = codigo
        self.datos = datos
        mensaje = datos.get("error", json.dumps(datos, ensure_ascii=False))
        juegos = datos.get("juegos")
        if juegos:
            mensaje += "\n  juegos válidos: " + ", ".join(juegos)
        super().__init__("HTTP %s — %s" % (codigo, mensaje))


class JugadaRechazada(AlisaGymError):
    """
    La puerta rechazó una jugada al re-simular la partida.

    ⚠️ LA PUERTA NO USA UN CÓDIGO HTTP PARA ESTO: devuelve 200 con el campo
    `rechazada` relleno y el estado ANTERIOR a la jugada mala. Un cliente que
    sólo mire el código de estado seguiría jugando tan tranquilo sobre un estado
    que no avanzó nunca. Por eso `step()` lo convierte en excepción.

    Dos motivos observados:
      {"indice": 0,  "jugada": "jugar:XXX_9", "motivo": "jugada ilegal en ese
       momento", "legales_entonces": ["jugar:O_2", ...]}
      {"indice": 40, "jugada": "jugar:O_2",   "motivo": "la partida ya había
       terminado"}

    Ojo: `legales_entonces` sólo viene en el primer caso. En el segundo la clave
    no existe, así que se lee siempre con .get().
    """

    def __init__(self, rechazada, juego, semilla):
        self.rechazada = rechazada
        self.juego = juego
        self.semilla = semilla
        self.indice = rechazada.get("indice")
        self.jugada = rechazada.get("jugada")
        self.motivo = rechazada.get("motivo")
        self.legales_entonces = rechazada.get("legales_entonces")
        detalle = (
            "Jugada rechazada en %s (semilla %s):\n"
            "  jugada nº %s: %r\n"
            "  motivo:      %s"
            % (juego, semilla, self.indice, self.jugada, self.motivo)
        )
        if self.legales_entonces:
            detalle += "\n  eran legales: " + ", ".join(self.legales_entonces)
        super().__init__(detalle)


# --------------------------------------------------------------------------
# Transporte
# --------------------------------------------------------------------------

def _pedir(ruta, cuerpo=None, base=BASE, tiempo_max=30.0, reintentos=2):
    """
    Una llamada HTTP a la puerta, devolviendo el JSON ya parseado.

    Reintenta sólo ante fallos transitorios (5xx y errores de red). Un 4xx es
    culpa nuestra: reintentarlo sólo tarda más en dar la misma respuesta.
    """
    url = base + ruta
    cabeceras = {"User-Agent": AGENTE, "Accept": "application/json"}
    datos = None
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode("utf-8")
        cabeceras["Content-Type"] = "application/json"

    ultimo = None
    for intento in range(reintentos + 1):
        peticion = urllib.request.Request(url, data=datos, headers=cabeceras,
                                          method="POST" if datos else "GET")
        try:
            with urllib.request.urlopen(peticion, timeout=tiempo_max) as r:
                return _parsear(r.status, r.headers.get("content-type"),
                                r.read().decode("utf-8", "replace"), url)
        except urllib.error.HTTPError as e:
            texto = e.read().decode("utf-8", "replace")
            tipo = e.headers.get("content-type") if e.headers else None
            if e.code >= 500 and intento < reintentos:
                ultimo = RespuestaNoJSON(e.code, tipo, texto, url)
                time.sleep(0.5 * (intento + 1))
                continue
            # Un 4xx con JSON dentro es un error explicado: lo contamos como tal.
            datos_error = _quizas_json(tipo, texto)
            if datos_error is not None:
                raise ErrorDeLaPuerta(e.code, datos_error) from None
            raise RespuestaNoJSON(e.code, tipo, texto, url) from None
        except urllib.error.URLError as e:
            if intento < reintentos:
                ultimo = AlisaGymError("Red: %s (%s)" % (e.reason, url))
                time.sleep(0.5 * (intento + 1))
                continue
            raise AlisaGymError("No se pudo llegar a %s: %s" % (url, e.reason)) from None
    raise ultimo


def _quizas_json(tipo_contenido, texto):
    """Devuelve el dict si el cuerpo es JSON, o None. Nunca lanza."""
    try:
        valor = json.loads(texto)
    except (ValueError, TypeError):
        return None
    return valor if isinstance(valor, dict) else None


def _parsear(codigo, tipo_contenido, texto, url):
    """
    Convierte el cuerpo en dict, o levanta RespuestaNoJSON con el diagnóstico.

    No basta con mirar el content-type: se intenta parsear de verdad, porque un
    proxy puede etiquetar como JSON algo que no lo es. Y al revés, si parsea
    bien nos da igual la etiqueta.
    """
    valor = _quizas_json(tipo_contenido, texto)
    if valor is None:
        raise RespuestaNoJSON(codigo, tipo_contenido, texto, url)
    return valor


def catalogo(base=BASE, tiempo_max=30.0):
    """
    GET /api/gym — los 40 entornos con su huella, más las instrucciones de uso.

    Devuelve el dict tal cual: {que_es, como_se_juega, reglas_del_juego_limpio,
    entornos: [{juego, titulo, huella, acciones_al_empezar, ejemplo_de_accion,
    describe}]}.
    """
    return _pedir("/api/gym", None, base=base, tiempo_max=tiempo_max)


# --------------------------------------------------------------------------
# El entorno
# --------------------------------------------------------------------------

class AlisaEnv(gymnasium.Env):
    """
    Un juego del banco de alisa.systems como entorno Gymnasium.

    La observación es TEXTO (el campo `descripcion`), no un vector. Ver la nota
    del módulo: aquí no hay vector numérico y no se finge que lo haya.

    ⚠️ EL ESPACIO DE ACCIONES ES DINÁMICO, Y NO SE PUEDE MENTIR SOBRE ESO.
    ---------------------------------------------------------------------
    Gymnasium quiere un `action_space` fijo, declarado una vez. Aquí las jugadas
    legales cambian en cada turno: en ajedrez son 20 al empezar y en go son 362,
    y sobre todo NO son las mismas de un turno al siguiente.

    Por eso `action_space` es un `spaces.Text`: una cadena. La lista de jugadas
    legales AHORA se publica en `info["acciones"]`, que es el mismo patrón que
    usa PettingZoo con sus máscaras de acción.

    Lo que NO se hace, y por qué: sería tentador declarar `Discrete(n)` e indexar
    la lista de acciones. Sería falso. El índice 3 significa "jugar:B_4" en un
    turno y "jugar:E_7" en el siguiente — comprobado: tras una jugada en brisca
    la mano pasa de [O_2, B_4, P_2] a [E_7, B_5, B_2]. Una política que
    aprendiese "el 3 es bueno" estaría aprendiendo ruido, porque el 3 no nombra
    nada estable. El índice no es una acción; es la posición en una lista que se
    baraja sola.

    Sobre `reward`
    --------------
    `reward` es la DIFERENCIA de `puntos` respecto a la llamada anterior, no
    `puntos` a secas. La puerta devuelve el marcador acumulado de la partida; si
    lo pasáramos tal cual, la suma de recompensas del episodio sería la suma de
    todos los marcadores parciales en vez del marcador final. Medido en una
    brisca real de 40 jugadas, la serie de `puntos` fue
    [0, 0, 0, 0, 13, ..., 45, ..., 51, ..., 65]: con la diferencia, las
    recompensas suman exactamente 65, que es lo que dice la puerta al terminar.

    Sobre `truncated`
    -----------------
    `truncated` es SIEMPRE False, a propósito. La puerta no trunca nunca: sus
    partidas acaban por reglas del juego (`terminada`) o no acaban. Truncar por
    número de pasos es competencia de quien use el entorno, y Gymnasium ya trae
    la pieza para eso: `gymnasium.wrappers.TimeLimit`. Poner aquí cualquier otra
    cosa sería inventarse un dato que el servidor no da.
    """

    metadata = {"render_modes": ["ansi", "human"], "render_fps": 1}

    def __init__(self, juego, base=BASE, render_mode=None, tiempo_max=30.0):
        self.juego = juego
        self.base = base
        self.render_mode = render_mode
        self.tiempo_max = tiempo_max

        self.action_space = spaces.Text(max_length=LARGO_MAX_ACCION,
                                        charset=ALFABETO_ACCION)
        # La observación es la frase `descripcion`. En ajedrez ronda los 300
        # caracteres; 8192 deja sitio a los juegos con mapa grande sin acotar de
        # forma que luego rechace una observación real.
        self.observation_space = spaces.Text(max_length=8192)

        self.semilla = None
        self.jugadas = []          # la partida ENTERA, que es lo que se manda
        self._ultimo = None        # última respuesta cruda de la puerta
        self._puntos_previos = 0

    # -- ciclo de vida -----------------------------------------------------

    def reset(self, *, seed=None, options=None):
        """
        Empieza una partida nueva.

        `seed` es la semilla del juego, no la de un generador local: la puerta
        re-simula desde ella, así que la misma semilla da siempre la misma
        partida. Si no se pasa, se elige una al azar (y queda en `env.semilla`,
        que hay que anotar si se quiere reproducir la partida después).

        `options` acepta {"juego": "ajedrez"} para cambiar de juego sin construir
        otro entorno.
        """
        super().reset(seed=seed)
        if options and "juego" in options:
            self.juego = options["juego"]
        self.semilla = seed if seed is not None else random.randrange(2 ** 31)
        self.jugadas = []
        self._puntos_previos = 0
        datos = self._llamar()
        return self._observacion(datos), self._info(datos)

    def step(self, action):
        """
        Añade una jugada a la partida y pide a la puerta que la re-simule entera.

        ⚠️ CADA `step` RE-SIMULA LA PARTIDA COMPLETA DESDE LA SEMILLA.
        La puerta no tiene estado: no guarda tu partida. Lo que se manda es
        siempre el array `jugadas` completo, y el servidor la re-juega desde
        cero. Es lo que hace que la puntuación sea verificable por un tercero,
        y también lo que hace que una partida de N jugadas cueste N llamadas
        (medido: 41 llamadas para una brisca, 106 ms de media, 346 ms la peor).

        Devuelve la quíntupla de Gymnasium:
            (obs, reward, terminated, truncated, info)
        """
        if not isinstance(action, str):
            raise TypeError(
                "La acción tiene que ser una cadena de las de info['acciones'], "
                "no %r. El espacio es Text, no Discrete — ver el docstring de "
                "la clase." % type(action).__name__
            )
        if self._ultimo is None:
            raise AlisaGymError("Hay que llamar a reset() antes de step().")

        self.jugadas.append(action)
        try:
            datos = self._llamar()
        except Exception:
            # Si la llamada falla, la jugada no llegó a aplicarse: se retira
            # para que el entorno no quede con una partida que el servidor
            # nunca aceptó.
            self.jugadas.pop()
            raise

        if datos.get("rechazada"):
            rechazada = datos["rechazada"]
            self.jugadas.pop()
            self._ultimo = datos
            raise JugadaRechazada(rechazada, self.juego, self.semilla)

        puntos = datos.get("puntos", 0)
        recompensa = float(puntos - self._puntos_previos)
        self._puntos_previos = puntos

        terminada = bool(datos.get("terminada"))
        truncada = False  # ver el docstring de la clase: la puerta no trunca.
        return self._observacion(datos), recompensa, terminada, truncada, self._info(datos)

    def render(self):
        """Devuelve el `mapa` ASCII si el juego lo trae, y si no la descripción."""
        if self._ultimo is None:
            return None
        texto = self._ultimo.get("mapa") or self._ultimo.get("descripcion") or ""
        if self.render_mode == "human":
            print(texto)
            return None
        return texto

    def close(self):
        """No hay nada que cerrar: cada llamada abre y cierra su conexión."""
        return None

    # -- verificación ------------------------------------------------------

    def verificar(self, puntos=None):
        """
        POST /api/verificar — que un tercero recalcule la partida.

        Éste es el argumento entero del proyecto: la puntuación no se envía, se
        recalcula. Se manda {juego, semilla, jugadas, puntos} y el servidor
        re-juega desde la semilla y compara con lo declarado.

        Devuelve {valida, puntos, motivo, jugadas, declarados, ms}. Comprobado
        que detecta la trampa: declarando 9999 sobre una partida de 0 puntos
        contesta valida=false, motivo="la puntuación no cuadra: dice 9999,
        sale 0" — y sigue siendo HTTP 200, así que hay que mirar el campo
        `valida`, no el código de estado.
        """
        if self._ultimo is None:
            raise AlisaGymError("No hay partida que verificar: falta reset().")
        declarados = self._puntos_previos if puntos is None else puntos
        return _pedir(
            "/api/verificar",
            {
                "juego": self.juego,
                "semilla": self.semilla,
                "jugadas": self.jugadas,
                "puntos": declarados,
            },
            base=self.base,
            tiempo_max=self.tiempo_max,
        )

    # -- interioridades ----------------------------------------------------

    def _llamar(self):
        datos = _pedir(
            "/api/gym",
            {"juego": self.juego, "semilla": self.semilla, "jugadas": self.jugadas},
            base=self.base,
            tiempo_max=self.tiempo_max,
        )
        self._ultimo = datos
        return datos

    def _observacion(self, datos):
        return datos.get("descripcion") or ""

    def _info(self, datos):
        """
        `info` lleva SIEMPRE acciones, huella, descripcion y jugadas.

        ⚠️ `jugadas` NO ES LO QUE PARECE EN LA RESPUESTA DE LA PUERTA.
        El campo `jugadas` que devuelve el servidor es un ENTERO (cuántas
        jugadas ha procesado), no el array que le mandaste. Y cuenta también la
        rechazada: al mandar una jugada ilegal como primera, contesta
        `"jugadas": 1` con `rechazada.indice = 0`.

        Aquí `info["jugadas"]` es el ARRAY de jugadas de la partida — que es lo
        que hace falta para reproducirla o verificarla. El entero del servidor se
        conserva aparte, en `info["jugadas_contadas"]`, para no perder el dato ni
        confundirlo con el otro.
        """
        return {
            "acciones": list(datos.get("acciones") or []),
            "huella": datos.get("huella"),
            "descripcion": datos.get("descripcion"),
            "jugadas": list(self.jugadas),
            "jugadas_contadas": datos.get("jugadas"),
            "juego": datos.get("juego"),
            "titulo": datos.get("titulo"),
            "semilla": datos.get("semilla"),
            "puntos": datos.get("puntos"),
            "mapa": datos.get("mapa"),
            "estado": datos.get("estado"),
            "ms": datos.get("ms"),
        }
