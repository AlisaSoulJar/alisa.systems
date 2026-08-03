#!/usr/bin/env python3
"""
bench_suite.py — la línea base del benchmark de cartas
==============================================================================
Ejecuta agentes de referencia contra TODOS los juegos jugables y saca la tabla.

    python bench_suite.py [partidas]

QUÉ MIRAR EN LA TABLA
---------------------
· **La Guerra es el control**: no tiene ni una decisión, así que todos los
  agentes DEBEN empatar. Si el marcador los separa, el banco mide ruido.
· **El azar es el suelo**: un agente que no le gane no ha aprendido nada.
· Todos juegan contra el MISMO rival (azar). Sin rival fijo, un agente jugaría
  contra sí mismo y ganaría ~50% hiciera lo que hiciera.
==============================================================================
"""
import sys
import random
import statistics

sys.path.insert(0, ".")
from alisa_gym_cards import CartasEnv, JUGABLES          # noqa: E402
import sovereign_card_rules as R                          # noqa: E402

FUERZA_ESP = ["2", "4", "5", "6", "7", "S", "C", "R", "3", "1"]
PUNTOS_ESP = {"1": 11, "3": 10, "R": 4, "C": 3, "S": 2}


# ── agentes de referencia ────────────────────────────────────────

def agente_azar(obs, env):
    aff = env.affordances()
    return random.choice(aff)["accion"] if aff else None


def agente_primera(obs, env):
    aff = env.affordances()
    return aff[0]["accion"] if aff else None


def agente_codicioso(obs, env):
    """
    Heurística general para juegos de baza: si puedo llevarme una baza que vale
    la pena, me la llevo con lo más barato; si no, suelto la carta menos valiosa.
    Funciona con la baraja española y con la francesa.

    En Entropy (que no es de bazas) delega en el rival de casa del propio motor,
    que sí entiende la rejilla.
    """
    motor_juego = env.juego._rules_handler() if env.juego else None
    if motor_juego is not None and hasattr(motor_juego, "COLUMNAS"):
        a = motor_juego.sugerencia()
        return a if a else agente_primera(obs, env)

    aff = env.affordances()
    if not aff or aff[0]["verbo"] != "jugar":
        return agente_primera(obs, env)

    st = env.juego.state
    motor = env.juego._rules_handler()
    fuerza = getattr(motor, "FUERZA", FUERZA_ESP)
    menor_gana = getattr(motor, "MENOR_GANA", False)

    def datos(a):
        cid = a["args"]["carta"]
        palo, rango = cid.split("_", 1) if "_" in cid else ("", cid)
        pts = motor.puntos_carta(R.Card(suit=palo, rank=rango)) if motor else 0
        fza = fuerza.index(rango) if rango in fuerza else -1
        return palo, rango, pts, fza

    tablero = st.shared_zones.get("board")

    # En hearts ganar es MALO: siempre la carta más floja.
    if menor_gana:
        return min(aff, key=lambda a: (datos(a)[3], datos(a)[2]))["accion"]

    if tablero and tablero.cards:
        rival = tablero.cards[-1]
        valor = motor.puntos_carta(rival) if motor else 0
        triunfo = motor._triunfo() if hasattr(motor, "_triunfo") else None
        f_rival = fuerza.index(rival.rank) if rival.rank in fuerza else -1
        ganadoras = [a for a in aff
                     if (datos(a)[0] == triunfo and rival.suit != triunfo)
                     or (datos(a)[0] == rival.suit and datos(a)[3] > f_rival)]
        if ganadoras and valor >= 4:
            return min(ganadoras, key=lambda a: (datos(a)[2], datos(a)[3]))["accion"]

    return min(aff, key=lambda a: (datos(a)[2], datos(a)[3]))["accion"]


def agente_blackjack(obs, env):
    aff = env.affordances()
    if not aff:
        return None
    mano = env.juego.state.players[0].zones["hand"].cards
    quiero = "hit" if R.BlackjackRules.hand_value(mano) < 17 else "stand"
    return quiero if any(a["accion"] == quiero for a in aff) else aff[0]["accion"]


def agente_unit(obs, env):
    """Suelta antes las especiales; guarda los comodines para el final."""
    aff = env.affordances()
    if not aff:
        return None
    jugables = [a for a in aff if a["verbo"] == "jugar"]
    if not jugables:
        return aff[0]["accion"]
    def rango(a):
        cid = a["args"]["carta"]
        return cid.split("_", 1)[1] if "_" in cid else cid
    prioridad = {"D2": 0, "SKIP": 1, "REV": 2}
    return min(jugables, key=lambda a: (prioridad.get(rango(a), 3),
                                        4 if rango(a) in ("WILD", "WD4") else 0))["accion"]


AGENTES = {
    "azar":        agente_azar,
    "primera":     agente_primera,
    "codicioso":   agente_codicioso,
    "blackjack17":  agente_blackjack,
    "unit-tactico": agente_unit,
}

#: qué agentes tiene sentido probar en cada juego
CARTEL = {
    "brisca":    ["azar", "primera", "codicioso"],
    "tute":      ["azar", "primera", "codicioso"],
    "hearts":    ["azar", "primera", "codicioso"],
    "spades":    ["azar", "primera", "codicioso"],
    "blackjack": ["azar", "primera", "blackjack17"],
    "go_fish":   ["azar", "primera"],
    "unit":      ["azar", "primera", "unit-tactico"],
    "entropy":   ["azar", "primera", "codicioso"],
    "war":       ["azar", "primera"],
}


def evaluar(game_id, agente, n, oponente):
    puntos, victorias, pasos = [], 0.0, []
    for s in range(n):
        random.seed(s * 7919)
        env = CartasEnv(game_id)
        r = env.run_episode(agente, seed=s, oponente=oponente)
        puntos.append(r["puntos"])
        pasos.append(r["pasos"])
        # Cuota, no victoria entera: empatar a tres bandas vale 1/3. Si no, los
        # juegos con empates frecuentes (hearts) castigan a todo el mundo.
        victorias += r["metricas"].get("cuota_victoria", 1.0 if r["metricas"]["gana"] else 0.0)
    return (statistics.mean(puntos), 100.0 * victorias / n, statistics.mean(pasos))


def main(n=150):
    print("=" * 78)
    print("  BENCHMARK DE CARTAS ALISA — %d partidas por agente" % n)
    print("  Todos contra el mismo rival (azar). Semillas 0..%d." % (n - 1))
    print("=" * 78)

    for gid in JUGABLES:
        info = JUGABLES[gid]
        menor = "  (gana quien MENOS suma)" if gid == "hearts" else ""
        print("\n── %s · %d jugadores%s" % (info["titulo"], info["jugadores"], menor))
        print("   %-13s %10s %10s %8s" % ("agente", "puntos", "victorias", "pasos"))
        for nombre in CARTEL.get(gid, ["azar", "primera"]):
            pts, vic, pas = evaluar(gid, AGENTES[nombre], n, agente_azar)
            print("   %-13s %10.2f %9.1f%% %8.1f" % (nombre, pts, vic, pas))
        if gid == "war":
            print("   ^ control: estas filas DEBEN ser idénticas")

    print()
    print("=" * 78)
    print("  ¿Son todos reproducibles? (requisito para puntuar en el benchmark)")
    print("=" * 78)
    for gid in JUGABLES:
        t = CartasEnv.self_test(gid)
        print("   %-10s reproducible=%-5s sensible_a_semilla=%-5s"
              % (gid, t["reproducible"], t["sensible_a_semilla"]))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 150)
