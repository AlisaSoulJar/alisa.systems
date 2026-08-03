#!/usr/bin/env python3
"""
alisa_gym_cards.py — el arcade de cartas, como entornos de gym
==============================================================================
Envuelve `SovereignCardGame` en el mismo contrato de tres puertas que usa el
motor en JavaScript (`gym/GymEnv.js`), para que un juego de cartas y una
simulación 3D se midan en el MISMO eje.

    🤖 NUMÉRICA   reset(seed) / step(accion) / observacion()
    🧠 LENGUAJE   describe() / affordances() — verbos, no vectores
    🕹️ HUMANA     el visualizador 3D del arcade lo pinta

POR QUÉ LAS CARTAS SON EL MEJOR BANCO PARA UN LLM
-------------------------------------------------
Un LLM no tiene reflejos y no debería necesitarlos para demostrar que razona.
Los juegos de cartas y tablero separan pensar de reaccionar: el espacio de
acciones es discreto, el estado se describe en una frase, y la habilidad se
mide en decisiones, no en milisegundos. Además la brisca, el tute o el mus **no
están en ningún benchmark del mercado**.

USO
---
    from alisa_gym_cards import CartasEnv

    env = CartasEnv("brisca", jugadores=2)
    obs = env.reset(1234)
    print(env.describe())            # estado en castellano
    print(env.affordances())         # qué puedo hacer AHORA
    r = env.step("jugar:O_1")        # o env.step(env.affordances()[0]["accion"])

    print(CartasEnv.self_test("brisca", 2))   # ¿es reproducible?
==============================================================================
"""
import random
from typing import List, Dict, Optional

import sovereign_card_rules as R


#: juegos con motor de reglas escrito, o sea JUGABLES de verdad.
#: El resto del catálogo (24 juegos) se monta pero aún no se juega.
JUGABLES = {
    "blackjack": {"jugadores": 1, "titulo": "Blackjack / 21",
                  "etiquetas": ["azar", "riesgo", "decision-simple"]},
    "brisca":    {"jugadores": 2, "titulo": "Brisca",
                  "etiquetas": ["bazas", "triunfo", "informacion-parcial", "memoria"]},
    "tute":      {"jugadores": 4, "titulo": "Tute",
                  "etiquetas": ["bazas", "servir-palo", "companero", "memoria"]},
    "hearts":    {"jugadores": 4, "titulo": "Corazones",
                  "etiquetas": ["bazas", "puntuacion-invertida", "evitar-ganar"]},
    "spades":    {"jugadores": 4, "titulo": "Spades",
                  "etiquetas": ["bazas", "triunfo-fijo", "contar-bazas"]},
    "go_fish":   {"jugadores": 2, "titulo": "Go Fish",
                  "etiquetas": ["deduccion", "memoria", "informacion-revelada"]},
    # "UNO" es marca registrada de Mattel. Las mecánicas no se registran, el
    # nombre sí — y esto se publica libre. Renombrado a UNIT.
    "unit":      {"jugadores": 4, "titulo": "UNIT",
                  "etiquetas": ["descarte", "especiales", "orden-de-turno"]},
    "entropy":   {"jugadores": 2, "titulo": "Entropy",
                  "etiquetas": ["descarte", "puntuacion-invertida", "memoria", "rejilla"]},
    "war":       {"jugadores": 2, "titulo": "La Guerra",
                  "etiquetas": ["control", "sin-decisiones"]},
}

# Nombres legibles, POR BARAJA.
#
# Hace falta separarlos porque las letras chocan entre barajas: en la española
# `B`=bastos y `C`=caballo, pero en UNO `B`=azul, y en la francesa `C`=tréboles.
# Con una sola tabla salían cosas como "D2 de bastos" o "as de G".
NOMBRES = {
    "espanola": {
        "palos": {"O": "oros", "P": "copas", "E": "espadas", "B": "bastos"},
        "rangos": {"1": "as", "S": "sota", "C": "caballo", "R": "rey"},
    },
    "francesa": {
        "palos": {"S": "picas", "H": "corazones", "D": "diamantes", "C": "tréboles"},
        "rangos": {"J": "jota", "Q": "dama", "K": "rey", "A": "as"},
    },
    "unit": {
        "palos": {"R": "rojo", "B": "azul", "G": "verde", "Y": "amarillo"},
        "rangos": {"SKIP": "salta", "REV": "cambio de sentido",
                   "D2": "roba dos", "WILD": "comodín", "WD4": "comodín +4"},
    },
}

#: qué tabla de nombres usa cada baraja del catálogo
BARAJA_DE = {
    "spanish_40": "espanola", "spanish_48": "espanola",
    "french_52": "francesa", "french_54": "francesa",
    "unit_108": "unit", "tarot_78": "francesa",
}


def nombre_carta(card_id: str, baraja: str = "francesa") -> str:
    """'O_1' → 'as de oros' · 'G_SKIP' → 'salta verde'."""
    tabla = NOMBRES.get(baraja, NOMBRES["francesa"])
    if "_" not in card_id:
        # Comodines: no tienen color hasta que se juegan.
        return tabla["rangos"].get(card_id, card_id)
    palo, rango = card_id.split("_", 1)
    nom_palo = tabla["palos"].get(palo, palo)
    nom_rango = tabla["rangos"].get(rango, rango)
    # En UNO el color va detrás y sin "de": "salta verde", "3 rojo".
    if baraja == "uno":
        return "%s %s" % (nom_rango, nom_palo)
    return "%s de %s" % (nom_rango, nom_palo)


class CartasEnv:
    """Un juego del arcade, con las tres puertas del contrato."""

    def __init__(self, game_id: str, jugadores: Optional[int] = None):
        if game_id not in JUGABLES:
            raise ValueError(
                "'%s' todavía no tiene motor de reglas. Jugables: %s. "
                "(El catálogo tiene 24 juegos, pero montarse ≠ jugarse.)"
                % (game_id, sorted(JUGABLES))
            )
        self.game_id = game_id
        self.jugadores = jugadores or JUGABLES[game_id]["jugadores"]
        self.juego = None
        self.pasos = 0
        self.seed = 0
        self.baraja = "francesa"    # se fija en reset(), leyendo el esquema

    # ── 🤖 PUERTA NUMÉRICA ───────────────────────────────────────

    def reset(self, seed: int = 0):
        """Reinicia con semilla. Determinista: misma semilla ⇒ misma partida."""
        self.seed = seed
        random.seed(seed)
        self.juego = R.SovereignCardGame(self.game_id, self.jugadores)
        self.juego.setup()
        self.pasos = 0
        deck_id = self.juego.state.game_schema.get("deck", "french_52")
        self.baraja = BARAJA_DE.get(deck_id, "francesa")
        return self.observacion()

    def step(self, accion: str, **kwargs) -> dict:
        """Ejecuta una acción. → {obs, recompensa, terminado, info}"""
        if self.juego is None:
            raise RuntimeError("Llama a reset(semilla) antes de step().")
        antes = self._puntos()
        try:
            eventos = self.juego.execute_action(accion, **kwargs)
            error = None
        except (ValueError, NotImplementedError) as e:
            # Una acción ilegal no revienta el episodio: se penaliza y se sigue.
            # Un agente LLM se equivoca, y el benchmark tiene que poder medirlo.
            eventos, error = [], str(e)
        self.pasos += 1
        recompensa = (self._puntos() - antes) - (1.0 if error else 0.0)
        return {
            "obs": self.observacion(),
            "recompensa": recompensa,
            "terminado": self.terminado(),
            "info": {"eventos": eventos, "error": error, "pasos": self.pasos},
        }

    def observacion(self) -> List[float]:
        """Vector plano, para políticas numéricas."""
        if self.juego is None:
            return []
        st = self.juego.state
        obs = [float(st.current_player), float(self.pasos), float(len(st.stock))]
        for p in st.players:
            mano = p.zones.get("hand")
            bazas = p.zones.get("tricks")
            obs += [float(len(mano.cards) if mano else 0),
                    float(len(bazas.cards) if bazas else 0),
                    float(p.score)]
        tablero = st.shared_zones.get("board")
        obs.append(float(len(tablero.cards) if tablero else 0))
        return obs

    def terminado(self) -> bool:
        return not self.juego.get_legal_actions() if self.juego else True

    def puntuacion(self) -> dict:
        if self.juego is None:
            return {"puntos": 0, "metricas": {}}
        jugadores = {p.id: p.score for p in self.juego.state.players}
        yo = jugadores.get(0, 0)
        rivales = [v for k, v in jugadores.items() if k != 0]
        # En los juegos de un solo jugador (blackjack contra la casa) no hay
        # rival con marcador. Antes `gana` valía None ahí, que es falso, y el
        # banco cantaba 0,0% de victorias para TODOS los agentes — parecía que
        # ninguno ganaba nunca cuando lo que pasaba es que no se medía.
        # En hearts se gana sumando MENOS. Si no se mira esto, el banco premia
        # justo al peor jugador — y encima parecería que el agente "aprende".
        menor_gana = getattr(self.juego._rules_handler(), "MENOR_GANA", False)
        if rivales:
            mejor = min(jugadores.values()) if menor_gana else max(jugadores.values())
            empatados = [k for k, v in jugadores.items() if v == mejor]
            # Los empates se reparten. Antes se exigía ganar EN SOLITARIO
            # (`yo < min(rivales)`), y en hearts empatar a 0 puntos es de lo más
            # normal: con 4 jugadores todos salían por debajo del 25% esperado
            # porque los empates no contaban para nadie.
            gana = 0 in empatados
            reparto = 1.0 / len(empatados) if gana else 0.0
        else:
            gana = (yo <= 0) if menor_gana else (yo > 0)
            empatados, reparto = ([0] if gana else []), (1.0 if gana else 0.0)
        return {
            "puntos": yo,
            "metricas": {
                "todos": jugadores,
                "gana": gana,
                "cuota_victoria": reparto,   # 1.0 en solitario, 0.5 si empatas con uno…
                "empatados": empatados,
                "menor_gana": menor_gana,
                "contra_rival": bool(rivales),
                "pasos": self.pasos,
            },
        }

    # ── 🧠 PUERTA DE LENGUAJE ────────────────────────────────────

    def describe(self) -> str:
        """El estado en castellano. Esto es lo que lee un agente LLM."""
        if self.juego is None:
            return "La partida no ha empezado. Llama a reset(semilla)."
        st = self.juego.state
        pid = st.current_player
        partes = ["%s. Te toca (jugador %d)." % (JUGABLES[self.game_id]["titulo"], pid)]

        mano = st.players[pid].zones.get("hand")
        if mano and mano.cards:
            partes.append("Tu mano: %s." % ", ".join(nombre_carta(c.id, self.baraja) for c in mano.cards))

        triunfo = st.shared_zones.get("trump")
        if triunfo and triunfo.cards:
            partes.append("Triunfo: %s." % nombre_carta(triunfo.cards[0].id, self.baraja))
        elif st.trump_suit:
            palos = NOMBRES[self.baraja]["palos"]
            partes.append("Triunfo: %s." % palos.get(st.trump_suit, st.trump_suit))

        descarte = st.shared_zones.get("discard")
        if descarte and descarte.cards:
            partes.append("Carta a la que hay que casar: %s." %
                          nombre_carta(descarte.cards[-1].id, self.baraja))

        tablero = st.shared_zones.get("board")
        if tablero and tablero.cards:
            partes.append("En la mesa: %s." % ", ".join(nombre_carta(c.id, self.baraja) for c in tablero.cards))

        crupier = st.shared_zones.get("dealer")
        if crupier and crupier.cards:
            vistas = [c for c in crupier.cards if c.face_up]
            partes.append("El crupier enseña: %s." %
                          (", ".join(nombre_carta(c.id, self.baraja) for c in vistas) if vistas else "nada"))

        partes.append("Quedan %d cartas en el mazo." % len(st.stock))
        partes.append("Puntos: %s." % ", ".join("jugador %d: %d" % (p.id, p.score) for p in st.players))

        if self.terminado():
            partes.append("La partida ha terminado.")
        return " ".join(partes)

    def affordances(self) -> List[dict]:
        """Los verbos disponibles AHORA, con etiqueta legible."""
        if self.juego is None:
            return []
        salida = []
        for a in self.juego.get_legal_actions():
            if a.startswith("jugar:"):
                cid = a.split(":", 1)[1]
                salida.append({"verbo": "jugar", "args": {"carta": cid},
                               "accion": a, "etiqueta": "Jugar %s" % nombre_carta(cid, self.baraja)})
            elif a.startswith("pedir:"):
                _, rango, quien = a.split(":")
                nom = NOMBRES[self.baraja]["rangos"].get(rango, rango)
                salida.append({"verbo": "pedir", "args": {"rango": rango, "a": int(quien)},
                               "accion": a,
                               "etiqueta": "Pedir los %s al jugador %s" % (nom, quien)})
            else:
                salida.append({"verbo": a, "args": {}, "accion": a,
                               "etiqueta": {"hit": "Pedir otra carta",
                                            "stand": "Plantarse",
                                            "double": "Doblar la apuesta",
                                            "robar": "Robar del mazo",
                                            "voltear": "Voltear la siguiente carta"}.get(a, a)})
        return salida

    # ── benchmark ────────────────────────────────────────────────

    @staticmethod
    def spec(game_id: str) -> dict:
        info = JUGABLES[game_id]
        return {"id": "alisa/%s-v0" % game_id,
                "titulo": info["titulo"],
                "jugadores": info["jugadores"],
                "etiquetas": info["etiquetas"],
                "espacio_acciones": "discreto-verbal"}

    def run_episode(self, politica, seed: int = 0, max_pasos: int = 500, oponente=None) -> dict:
        """
        Corre un episodio entero.

        @param politica  (obs, env) -> acción. Gobierna al JUGADOR 0.
        @param oponente  (obs, env) -> acción para los demás jugadores.
                         Si no se pasa, juegan con `politica` también.

        ⚠️ POR QUÉ EXISTE `oponente`: sin esto la misma política movía a TODOS
        los jugadores, o sea que el agente jugaba contra sí mismo y ganaba el
        ~50% pasara lo que pasara. El marcador no medía habilidad, medía el
        reparto de cartas. Para comparar agentes hace falta un rival fijo.
        """
        self.reset(seed)
        total = 0.0
        for _ in range(max_pasos):
            if self.terminado():
                break
            de_quien = self.juego.state.current_player
            actor = politica if (de_quien == 0 or oponente is None) else oponente
            accion = actor(self.observacion(), self)
            if accion is None:
                break
            if isinstance(accion, dict):          # por si devuelven la affordance entera
                accion = accion.get("accion")
            r = self.step(accion)
            if de_quien == 0:
                total += r["recompensa"]
        res = self.puntuacion()
        res.update({"semilla": seed, "pasos": self.pasos, "recompensa_total": total})
        return res

    def checksum(self) -> str:
        """
        Huella del ESTADO DEL MUNDO: qué cartas hay y dónde.

        Hace falta porque comparar puntuaciones no demuestra nada. Con la
        política "pedir siempre", el blackjack acaba en −1 con cualquier semilla
        aunque las cartas sean distintas — y el test cantaba "no es sensible a la
        semilla" cuando el entorno sí lo era. Es el mismo error que ya cometí
        comparando marcadores que valían 0: **compara el mundo, no el resultado.**
        """
        if self.juego is None:
            return "sin-partida"
        st = self.juego.state
        trozos = []
        for p in st.players:
            for zn in sorted(p.zones):
                trozos.append("p%d.%s=%s" % (p.id, zn, ",".join(c.id for c in p.zones[zn].cards)))
        for zn in sorted(st.shared_zones):
            trozos.append("%s=%s" % (zn, ",".join(c.id for c in st.shared_zones[zn].cards)))
        trozos.append("mazo=%d" % len(st.stock))
        return "|".join(trozos)

    @staticmethod
    def self_test(game_id: str, jugadores: Optional[int] = None, seed: int = 1234) -> dict:
        """
        ¿Es reproducible? Requisito para entrar en el benchmark:
        dos veces la misma semilla dan lo mismo, y otra semilla da otra cosa.

        Se compara el CHECKSUM DEL MUNDO, no la puntuación (ver `checksum`).
        """
        def primera(obs, env):
            aff = env.affordances()
            return aff[0]["accion"] if aff else None

        def correr(s):
            env = CartasEnv(game_id, jugadores)
            r = env.run_episode(primera, s)
            return "%s|%s|%s" % (r["pasos"], r["puntos"], env.checksum())

        a, b, c = correr(seed), correr(seed), correr(seed + 1)
        return {"juego": game_id,
                "reproducible": a == b,
                "sensible_a_semilla": a != c,
                "pasos": int(a.split("|")[0])}

    def _puntos(self) -> float:
        if self.juego is None:
            return 0.0
        return float(self.juego.state.players[0].score)


if __name__ == "__main__":
    print("=" * 70)
    print("  EL ARCADE DE CARTAS COMO GYM")
    print("=" * 70)
    for gid in JUGABLES:
        t = CartasEnv.self_test(gid)
        marca = "OK " if (t["reproducible"] and t["sensible_a_semilla"]) else "REVISAR"
        print("  %-10s %-8s reproducible=%-5s sensible=%-5s pasos=%d"
              % (gid, marca, t["reproducible"], t["sensible_a_semilla"], t["pasos"]))

    print()
    env = CartasEnv("brisca")
    env.reset(2026)
    print("  describe():", env.describe())
    print()
    for a in env.affordances():
        print("    -", a["etiqueta"], " ->", a["accion"])
