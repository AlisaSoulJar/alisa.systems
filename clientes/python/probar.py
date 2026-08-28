"""
Juega partidas cortas contra la puerta REAL de alisa.systems y comprueba
que la envoltura cumple lo que promete.

    python clientes/python/probar.py                 # brisca + ajedrez
    python clientes/python/probar.py go reversi      # los que le digas

No hay simulacro ni servidor de mentira: si alisa.systems está caída, esto
falla, que es exactamente lo que tiene que hacer. Sale 0 si todo pasa, 1 si no.
"""

import random
import sys
import time

import alisa_gym
from alisa_gym import AlisaEnv, JugadaRechazada

# Tope de jugadas por partida. El ajedrez no termina en 40 movimientos al azar,
# así que a los juegos largos se les corta aquí y se comprueba lo que sí se
# puede comprobar: que avanzan y que la partida a medias también se verifica.
TOPE = 40

fallos = []


def comprobar(condicion, texto):
    marca = "OK  " if condicion else "FALLO"
    print("    [%s] %s" % (marca, texto))
    if not condicion:
        fallos.append(texto)
    return condicion


def jugar(juego, semilla=7, tope=TOPE):
    print("\n=== %s (semilla %s) ===" % (juego, semilla))
    env = AlisaEnv(juego)
    rng = random.Random(semilla)

    t0 = time.time()
    obs, info = env.reset(seed=semilla)

    print("    titulo:      %s" % info["titulo"])
    print("    huella:      %s" % info["huella"])
    print("    obs[:110]:   %s" % (obs[:110] + ("..." if len(obs) > 110 else "")))
    print("    acciones(%d): %s" % (len(info["acciones"]), ", ".join(info["acciones"][:8])
          + (" ..." if len(info["acciones"]) > 8 else "")))

    comprobar(len(info["acciones"]) > 0, "reset() da acciones legales")
    comprobar(isinstance(obs, str) and obs, "reset() da una observacion de texto")
    for clave in ("acciones", "huella", "descripcion", "jugadas"):
        comprobar(clave in info, "info trae '%s'" % clave)
    comprobar(info["jugadas"] == [], "info['jugadas'] empieza vacio (es el ARRAY)")

    # El espacio declarado tiene que aceptar las acciones que la puerta ofrece.
    # Si no, la envoltura estaria mintiendo sobre su propio action_space.
    todas_caben = all(env.action_space.contains(a) for a in info["acciones"])
    comprobar(todas_caben, "action_space (Text) acepta las acciones reales")

    recompensa_total = 0.0
    terminada = truncada = False
    pasos = 0
    acciones_previas = list(info["acciones"])

    while not terminada and pasos < tope:
        accion = rng.choice(info["acciones"])
        obs, recompensa, terminada, truncada, info = env.step(accion)
        recompensa_total += recompensa
        pasos += 1
        if pasos <= 3 or terminada:
            print("    paso %-3d %-14s recompensa %+6.1f  puntos %-5s terminada=%s"
                  % (pasos, accion, recompensa, info["puntos"], terminada))
        if pasos == 1:
            comprobar(info["jugadas"] == [accion], "step() avanza: la partida guarda la jugada")
            comprobar(truncada is False, "truncated es False (la puerta no trunca)")

    print("    ...")
    print("    pasos: %d | recompensa acumulada: %.1f | puntos de la puerta: %s"
          % (pasos, recompensa_total, info["puntos"]))

    comprobar(pasos > 0, "step() avanzo al menos una jugada")
    comprobar(len(info["jugadas"]) == pasos, "info['jugadas'] tiene %d jugadas" % pasos)
    # La recompensa es la diferencia de puntos, asi que la suma del episodio
    # tiene que dar el marcador final. Si diera otra cosa, la resta esta mal.
    comprobar(abs(recompensa_total - info["puntos"]) < 1e-9,
              "sum(reward) == puntos finales (%.1f == %s)" % (recompensa_total, info["puntos"]))

    if terminada:
        comprobar(terminada is True, "al acabar la partida, terminated es True")
        comprobar(info["acciones"] == [], "al acabar no quedan acciones legales")
        # Y jugar despues del final tiene que doler, no pasar desapercibido.
        try:
            env.step(acciones_previas[0])
            comprobar(False, "jugar tras el final levanta JugadaRechazada")
        except JugadaRechazada as e:
            comprobar(True, "jugar tras el final levanta JugadaRechazada (%s)" % e.motivo)
    else:
        print("    [nota] no termino en %d jugadas al azar; se verifica a medias" % tope)

    v = env.verificar()
    print("    verificar -> valida=%s puntos=%s jugadas=%s motivo=%s"
          % (v["valida"], v["puntos"], v["jugadas"], v["motivo"]))
    comprobar(v["valida"] is True, "verificar() acepta la partida jugada")
    comprobar(v["puntos"] == info["puntos"], "verificar() recalcula los mismos puntos")

    print("    tiempo total: %.1f s en %d llamadas" % (time.time() - t0, pasos + 2))
    return env


def probar_jugada_ilegal(env):
    """La puerta contesta 200 con `rechazada`; tiene que doler igual."""
    print("\n=== jugada ilegal (tiene que levantar excepcion) ===")
    env.reset(seed=7)
    try:
        env.step("esto_no_es_una_jugada")
        comprobar(False, "una jugada ilegal levanta JugadaRechazada")
    except JugadaRechazada as e:
        print("    motivo: %s" % e.motivo)
        print("    legales entonces: %s" % (e.legales_entonces or "(no las dice)"))
        comprobar(True, "una jugada ilegal levanta JugadaRechazada")
        comprobar(e.motivo is not None, "la excepcion trae el motivo")
        comprobar(env.jugadas == [], "la jugada rechazada NO se queda en la partida")


def probar_no_json():
    """
    El caso que mas cuesta diagnosticar: la puerta contesta algo que no es JSON.

    Se comprueba por dos lados, porque son dos cosas distintas:

      1. En vivo, contra una ruta mala: que el camino de red acaba en
         RespuestaNoJSON y no en un JSONDecodeError pelado. Aqui no se exige que
         el cuerpo traiga texto: la ruta mala contesta 405 con cuerpo VACIO, y
         un cuerpo vacio tambien es una respuesta legitima que hay que saber
         contar.
      2. En seco, con el HTML de Cloudflare de verdad: que el mensaje del error
         lleva el codigo HTTP y el principio del cuerpo, que es lo unico que
         permite diagnosticar la caida sin abrir Wireshark.
    """
    print("\n=== respuesta no-JSON (1/2: en vivo, ruta mala) ===")
    env = AlisaEnv("brisca", base="https://alisa.systems/no-existe-esta-ruta")
    try:
        env.reset(seed=1)
        comprobar(False, "una respuesta no-JSON levanta RespuestaNoJSON")
    except alisa_gym.RespuestaNoJSON as e:
        print("    HTTP %s | content-type %s | cuerpo[:80] %r"
              % (e.codigo, e.tipo_contenido, e.cuerpo[:80]))
        comprobar(True, "una respuesta no-JSON levanta RespuestaNoJSON")
        comprobar(e.codigo is not None, "el error dice el codigo HTTP")
    except alisa_gym.ErrorDeLaPuerta as e:
        print("    (la ruta mala devolvio JSON de error: %s)" % e)
        comprobar(True, "el cliente distingue error-con-JSON de no-JSON")

    print("\n=== respuesta no-JSON (2/2: HTML de Cloudflare) ===")
    html = ("<!DOCTYPE html><html><head><title>alisa.systems | 502: Bad gateway"
            "</title></head><body><h1>Error 502</h1></body></html>")
    try:
        alisa_gym._parsear(502, "text/html; charset=UTF-8", html,
                           "https://alisa.systems/api/gym")
        comprobar(False, "HTML de Cloudflare levanta RespuestaNoJSON")
    except alisa_gym.RespuestaNoJSON as e:
        texto = str(e)
        print("    " + texto.replace("\n", "\n    "))
        comprobar(True, "HTML de Cloudflare levanta RespuestaNoJSON")
        comprobar("502" in texto, "el mensaje dice el codigo HTTP")
        comprobar("Bad gateway" in texto, "el mensaje trae el principio del cuerpo")


def probar_user_agent_baneado():
    """
    ⚠️ LA TRAMPA QUE SE COME A TODO CLIENTE PYTHON INGENUO.

    Cloudflare tiene baneado el User-Agent por defecto de urllib. Se comprueba
    que, si se pisa el UA bueno por el malo, el error que sale explica que el
    problema es el navegador — y no un JSONDecodeError incomprensible.
    """
    print("\n=== User-Agent baneado (error 1010 de Cloudflare) ===")
    bueno = alisa_gym.AGENTE
    alisa_gym.AGENTE = "Python-urllib/3.12"
    try:
        AlisaEnv("brisca").reset(seed=1)
        comprobar(False, "el UA de urllib es rechazado por Cloudflare")
    except alisa_gym.ErrorDeLaPuerta as e:
        print("    HTTP %s | error_code %s | %s"
              % (e.codigo, e.datos.get("error_code"), e.datos.get("detail")))
        comprobar(e.codigo == 403, "el UA de urllib da HTTP 403")
        comprobar(e.datos.get("error_code") == 1010, "es el error 1010 de Cloudflare")
    except alisa_gym.RespuestaNoJSON as e:
        # Sin negociacion de contenido, Cloudflare contesta texto plano.
        print("    HTTP %s | cuerpo %r" % (e.codigo, e.cuerpo[:60]))
        comprobar(e.codigo == 403, "el UA de urllib da HTTP 403")
    finally:
        alisa_gym.AGENTE = bueno

    # Y con el UA bueno, la misma llamada pasa. Sin esto lo de arriba no prueba
    # que la culpa sea del User-Agent: podria ser que la puerta este caida.
    obs, info = AlisaEnv("brisca").reset(seed=1)
    comprobar(bool(info["acciones"]), "con el UA bueno la misma llamada pasa")


def probar_juego_desconocido():
    print("\n=== juego inexistente ===")
    env = AlisaEnv("no_existe_este_juego")
    try:
        env.reset(seed=1)
        comprobar(False, "un juego inexistente levanta ErrorDeLaPuerta")
    except alisa_gym.ErrorDeLaPuerta as e:
        print("    HTTP %s | %s" % (e.codigo, e.datos.get("error")))
        comprobar(e.codigo == 400, "un juego inexistente da HTTP 400")
        comprobar(bool(e.datos.get("juegos")), "el error lista los juegos validos")


def main():
    juegos = sys.argv[1:] or ["brisca", "ajedrez"]

    print("=== catalogo ===")
    cat = alisa_gym.catalogo()
    print("    entornos publicados: %d" % len(cat["entornos"]))
    comprobar(len(cat["entornos"]) > 0, "GET /api/gym lista entornos")
    conocidos = {e["juego"] for e in cat["entornos"]}
    for j in juegos:
        comprobar(j in conocidos, "'%s' esta en el catalogo" % j)

    ultimo = None
    for j in juegos:
        ultimo = jugar(j)

    if ultimo is not None:
        probar_jugada_ilegal(ultimo)
    probar_no_json()
    probar_user_agent_baneado()
    probar_juego_desconocido()

    print("\n" + "=" * 60)
    if fallos:
        print("FALLOS: %d" % len(fallos))
        for f in fallos:
            print("  - %s" % f)
        return 1
    print("TODO OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
