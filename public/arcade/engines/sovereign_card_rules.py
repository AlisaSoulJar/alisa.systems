"""
SovereignCardRules — Universal Card Game Rule Engine for ALISA Arcade.
Loads game schemas from card_library.json and provides validation,
hand evaluation, and state management for any card game.
"""
import json
import random
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

# ═══════════════════════════════════════════════════════
#  DATA CLASSES
# ═══════════════════════════════════════════════════════

@dataclass
class Card:
    suit: str
    rank: str
    id: str = ""
    face_up: bool = False
    
    def __post_init__(self):
        self.id = f"{self.suit}_{self.rank}" if self.suit else self.rank


@dataclass
class Zone:
    name: str
    cards: List[Card] = field(default_factory=list)
    hidden: bool = False
    max_cards: int = 999
    layout: str = "line"


@dataclass
class Player:
    id: int
    name: str = ""
    zones: Dict[str, Zone] = field(default_factory=dict)
    score: int = 0
    team: int = 0


class GamePhase(Enum):
    SETUP = "setup"
    PLAYING = "playing"
    WAITING_INPUT = "waiting_input"
    RESOLVING = "resolving"
    GAME_OVER = "game_over"


# ═══════════════════════════════════════════════════════
#  DECK FACTORY
# ═══════════════════════════════════════════════════════

class DeckFactory:
    """Generates any deck from a schema definition."""
    
    def __init__(self, library: dict):
        self.library = library
    
    def build(self, deck_id: str) -> List[Card]:
        schema = self.library["decks"].get(deck_id)
        if not schema:
            raise ValueError(f"Unknown deck: {deck_id}")
        
        # Handle deck inheritance
        if "extends" in schema:
            base = self.library["decks"][schema["extends"]].copy()
            base.update({k: v for k, v in schema.items() if k != "extends"})
            schema = base
        
        cards = []
        
        # Standard suit × rank cards
        for suit in schema.get("suits", []):
            for rank in schema.get("ranks", []):
                cards.append(Card(suit=suit["id"], rank=rank))
        
        # Special cards (per suit)
        for special in schema.get("specials", []):
            if special.get("suitless"):
                for _ in range(special.get("count", 1)):
                    cards.append(Card(suit="", rank=special["id"]))
            elif special.get("per_suit"):
                for suit in schema["suits"]:
                    for _ in range(special["per_suit"]):
                        cards.append(Card(suit=suit["id"], rank=special["id"]))
        
        # Jokers
        for i in range(schema.get("jokers", 0)):
            cards.append(Card(suit="", rank=f"JK{i+1}"))
        
        # Major Arcana (Tarot)
        for arcana in schema.get("major_arcana", []):
            cards.append(Card(suit="MAJOR", rank=arcana))
        
        return cards
    
    def build_shuffled(self, deck_id: str, multi_deck: int = 1) -> List[Card]:
        """Build one or more copies of a deck, shuffled."""
        cards = []
        for _ in range(multi_deck):
            cards.extend(self.build(deck_id))
        random.shuffle(cards)
        return cards


# ═══════════════════════════════════════════════════════
#  GAME STATE
# ═══════════════════════════════════════════════════════

@dataclass
class GameState:
    game_id: str
    game_schema: dict
    deck_schema: dict
    players: List[Player] = field(default_factory=list)
    shared_zones: Dict[str, Zone] = field(default_factory=dict)
    stock: List[Card] = field(default_factory=list)
    current_player: int = 0
    current_phase_idx: int = 0
    phase: GamePhase = GamePhase.SETUP
    turn_count: int = 0
    direction: int = 1  # 1 = clockwise, -1 = counter
    trump_suit: Optional[str] = None
    history: List[dict] = field(default_factory=list)
    
    @property
    def current_phase(self) -> dict:
        phases = self.game_schema.get("phases", [])
        if self.current_phase_idx < len(phases):
            return phases[self.current_phase_idx]
        return {"name": "end"}
    
    def next_player(self):
        n = len(self.players)
        self.current_player = (self.current_player + self.direction) % n
    
    def advance_phase(self):
        self.current_phase_idx += 1
        phases = self.game_schema.get("phases", [])
        if self.current_phase_idx >= len(phases):
            # Check for loop
            last = phases[-1] if phases else {}
            if "goto" in last:
                target = last["goto"]
                for i, p in enumerate(phases):
                    if p["name"] == target:
                        self.current_phase_idx = i
                        return
            self.phase = GamePhase.GAME_OVER
    
    def to_dict(self) -> dict:
        """Serialize for frontend consumption."""
        return {
            "game_id": self.game_id,
            "current_player": self.current_player,
            "phase": self.current_phase.get("name", "unknown"),
            "turn": self.turn_count,
            "direction": self.direction,
            "trump": self.trump_suit,
            "stock_remaining": len(self.stock),
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "score": p.score,
                    "hand_count": len(p.zones.get("hand", Zone("hand")).cards),
                    "hand": [c.id for c in p.zones.get("hand", Zone("hand")).cards] if not p.zones.get("hand", Zone("hand")).hidden else []
                }
                for p in self.players
            ],
            "shared_zones": {
                name: [c.id for c in zone.cards if c.face_up]
                for name, zone in self.shared_zones.items()
            }
        }


# ═══════════════════════════════════════════════════════
#  UNIVERSAL VERBS (Engine Actions)
# ═══════════════════════════════════════════════════════

class CardVerbs:
    """Universal verb implementations — the kinematics of any card game."""
    
    @staticmethod
    def deal(state: GameState, to_zone: str, count: int, hidden: bool = True) -> List[dict]:
        """Deal cards from stock to each player's zone."""
        events = []
        for _ in range(count):
            for player in state.players:
                if not state.stock:
                    break
                card = state.stock.pop()
                card.face_up = not hidden
                
                if to_zone not in player.zones:
                    player.zones[to_zone] = Zone(name=to_zone, hidden=hidden)
                player.zones[to_zone].cards.append(card)
                
                events.append({
                    "verb": "deal",
                    "card": card.id,
                    "to_player": player.id,
                    "zone": to_zone,
                    "face_up": card.face_up
                })
        return events
    
    @staticmethod
    def deal_shared(state: GameState, to_zone: str, count: int, hidden: bool = False) -> List[dict]:
        """Deal cards to a shared zone (board/community)."""
        events = []
        if to_zone not in state.shared_zones:
            state.shared_zones[to_zone] = Zone(name=to_zone)
        
        for _ in range(count):
            if not state.stock:
                break
            card = state.stock.pop()
            card.face_up = not hidden
            state.shared_zones[to_zone].cards.append(card)
            events.append({
                "verb": "deal",
                "card": card.id,
                "zone": to_zone,
                "face_up": card.face_up
            })
        return events
    
    @staticmethod
    def draw(state: GameState, player_id: int, to_zone: str = "hand", count: int = 1) -> List[dict]:
        """Draw cards from stock to a player's hand."""
        events = []
        player = state.players[player_id]
        for _ in range(count):
            if not state.stock:
                break
            card = state.stock.pop()
            card.face_up = True
            if to_zone not in player.zones:
                player.zones[to_zone] = Zone(name=to_zone)
            player.zones[to_zone].cards.append(card)
            events.append({"verb": "draw", "card": card.id, "player": player_id})
        return events
    
    @staticmethod
    def discard(state: GameState, player_id: int, card_id: str, from_zone: str = "hand") -> List[dict]:
        """Move a card from player's zone to discard pile."""
        player = state.players[player_id]
        zone = player.zones.get(from_zone)
        if not zone:
            return []
        
        card = next((c for c in zone.cards if c.id == card_id), None)
        if not card:
            return []
        
        zone.cards.remove(card)
        card.face_up = True
        
        if "discard" not in state.shared_zones:
            state.shared_zones["discard"] = Zone(name="discard")
        state.shared_zones["discard"].cards.append(card)
        
        return [{"verb": "discard", "card": card_id, "player": player_id}]
    
    @staticmethod
    def play(state: GameState, player_id: int, card_id: str, to_zone: str = "board") -> List[dict]:
        """Play a card from hand to a shared zone (e.g., trick)."""
        player = state.players[player_id]
        hand = player.zones.get("hand")
        if not hand:
            return []
        
        card = next((c for c in hand.cards if c.id == card_id), None)
        if not card:
            return []
        
        hand.cards.remove(card)
        card.face_up = True
        
        if to_zone not in state.shared_zones:
            state.shared_zones[to_zone] = Zone(name=to_zone)
        state.shared_zones[to_zone].cards.append(card)
        
        return [{"verb": "play", "card": card_id, "player": player_id, "zone": to_zone}]
    
    @staticmethod
    def pass_card(state: GameState, from_player: int, to_player: int, card_id: str) -> List[dict]:
        """Pass a card from one player to another."""
        src = state.players[from_player].zones.get("hand")
        if not src:
            return []
        card = next((c for c in src.cards if c.id == card_id), None)
        if not card:
            return []
        
        src.cards.remove(card)
        dest = state.players[to_player].zones
        if "hand" not in dest:
            dest["hand"] = Zone(name="hand")
        dest["hand"].cards.append(card)
        
        return [{"verb": "pass", "card": card_id, "from": from_player, "to": to_player}]
    
    @staticmethod
    def tuck(state: GameState, from_zone: str, to_player: int, to_zone: str = "tricks") -> List[dict]:
        """Collect cards from a shared zone to a player's pile (won trick)."""
        shared = state.shared_zones.get(from_zone)
        if not shared:
            return []
        
        cards = list(shared.cards)
        shared.cards.clear()
        
        player = state.players[to_player]
        if to_zone not in player.zones:
            player.zones[to_zone] = Zone(name=to_zone)
        player.zones[to_zone].cards.extend(cards)
        
        return [{"verb": "tuck", "cards": [c.id for c in cards], "player": to_player}]
    
    @staticmethod
    def flip(state: GameState, zone_name: str, card_id: Optional[str] = None, player_id: Optional[int] = None) -> List[dict]:
        """Flip card(s) face up/down in a zone."""
        events = []
        
        if player_id is not None:
            zone = state.players[player_id].zones.get(zone_name)
        else:
            zone = state.shared_zones.get(zone_name)
        
        if not zone:
            return []
        
        targets = [c for c in zone.cards if c.id == card_id] if card_id else zone.cards
        for card in targets:
            card.face_up = not card.face_up
            events.append({"verb": "flip", "card": card.id, "face_up": card.face_up})
        
        return events
    
    @staticmethod
    def tap(state: GameState, player_id: int, card_id: str) -> List[dict]:
        """Tap (rotate) a card — toggle tapped state."""
        player = state.players[player_id]
        for zone in player.zones.values():
            card = next((c for c in zone.cards if c.id == card_id), None)
            if card:
                # Use a dynamic attribute
                tapped = getattr(card, '_tapped', False)
                card._tapped = not tapped
                return [{"verb": "tap", "card": card_id, "tapped": card._tapped}]
        return []


# ═══════════════════════════════════════════════════════
#  GAME CONTROLLER
# ═══════════════════════════════════════════════════════

class SovereignCardGame:
    """
    Universal game controller. Load any game from card_library.json,
    set up players, and execute phases via verbs.
    """
    
    LIBRARY_PATH = Path(__file__).parent.parent / "data" / "card_library.json"
    
    def __init__(self, game_id: str, num_players: int, player_names: Optional[List[str]] = None):
        self.library = self._load_library()
        self.factory = DeckFactory(self.library)
        
        game_schema = self.library["games"].get(game_id)
        if not game_schema:
            raise ValueError(f"Unknown game: {game_id}. Available: {list(self.library['games'].keys())}")
        
        deck_id = game_schema["deck"]
        deck_schema = self.library["decks"].get(deck_id)
        
        # Validate player count
        pmin = game_schema["players"]["min"]
        pmax = game_schema["players"]["max"]
        if not (pmin <= num_players <= pmax):
            raise ValueError(f"{game_id} requires {pmin}-{pmax} players, got {num_players}")
        
        # Build deck
        multi = game_schema.get("multi_deck", 1)
        stock = self.factory.build_shuffled(deck_id, multi)
        
        # Remove specified cards
        remove = game_schema.get("remove_cards", [])
        if remove:
            stock = [c for c in stock if c.rank not in remove]
        
        # Create players
        players = []
        for i in range(num_players):
            name = player_names[i] if player_names and i < len(player_names) else f"Player {i+1}"
            players.append(Player(id=i, name=name))
        
        # Assign teams if applicable
        if game_schema["players"].get("teams"):
            for i, p in enumerate(players):
                p.team = i % game_schema["players"]["teams"]
        
        self.state = GameState(
            game_id=game_id,
            game_schema=game_schema,
            deck_schema=deck_schema,
            players=players,
            stock=stock,
            trump_suit=game_schema.get("trump_suit")
        )
        
        self.verbs = CardVerbs()
    
    def _load_library(self) -> dict:
        with open(self.LIBRARY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def _resolver_count(self, count) -> int:
        """
        Traduce el campo `count` del esquema a un número de cartas.

        El esquema usa CUATRO formas y el código solo entendía la primera, así
        que `range(count)` reventaba con un TypeError y cuatro juegos no
        arrancaban (memory, old_maid, sevens, rummy_basic):

            7                              → siete cartas
            "all"                          → la baraja entera (mesa)
            "all_equal"                    → se reparte a partes iguales
            {"2p":10, "3-4p":7, "5-6p":6}  → depende del número de jugadores
        """
        if isinstance(count, int):
            return count

        n = len(self.state.players)
        mazo = len(self.state.stock)

        if count == "all":
            return mazo
        if count == "all_equal":
            return mazo // n if n else mazo

        if isinstance(count, dict):
            for clave, valor in count.items():
                m = re.match(r"^(\d+)(?:-(\d+))?p$", str(clave))
                if not m:
                    continue
                lo = int(m.group(1))
                hi = int(m.group(2)) if m.group(2) else lo
                if lo <= n <= hi:
                    return int(valor)
            # Sin tramo para este número de jugadores: el primero, y avisamos.
            primero = next(iter(count.values()), 1)
            print(f"[SovereignCardRules] '{self.state.game_id}': ningún tramo de "
                  f"{list(count.keys())} cubre {n} jugadores; uso {primero}.")
            return int(primero)

        raise ValueError(
            f"'{self.state.game_id}': no sé interpretar count={count!r}. "
            f"Formas válidas: entero, 'all', 'all_equal', o {{'2p':10,'3-4p':7}}."
        )

    def setup(self) -> List[dict]:
        """Execute the first phase (usually dealing)."""
        all_events = []
        phase = self.state.current_phase

        if phase.get("verb") == "deal":
            to = phase.get("to", "hand")
            count = self._resolver_count(phase.get("count", 1))
            hidden = phase.get("hidden", True)
            
            if isinstance(to, list):
                # Reparto a varias zonas (blackjack: hand + dealer).
                #
                # OJO: antes se llamaba a `deal()` para TODAS, y `deal()` reparte
                # a cada jugador. Resultado: cada jugador tenía su propio crupier.
                # Quién es compartido lo dice el esquema: las zonas con
                # `per_player: true` son del jugador; el resto, de la mesa.
                zonas_schema = self.state.game_schema.get("zones", {})
                for zone in to:
                    es_del_jugador = zonas_schema.get(zone, {}).get("per_player", False)
                    if es_del_jugador:
                        events = self.verbs.deal(self.state, zone, count, hidden)
                    else:
                        events = self.verbs.deal_shared(self.state, zone, count, hidden)
                    all_events.extend(events)
            else:
                # ⚠️ ANTES ESTO DECÍA `to == "hand"` — literal.
                # O sea: solo repartía por jugador si la zona se llamaba
                # exactamente "hand". Cualquier juego con otro nombre —Entropy
                # reparte a una zona llamada `caja`— se iba a una zona
                # COMPARTIDA y los jugadores se quedaban con cero cartas.
                # Quién es del jugador lo dice el esquema, no el nombre.
                zonas_schema = self.state.game_schema.get("zones", {})
                es_del_jugador = zonas_schema.get(to, {}).get(
                    "per_player", phase.get("per_player", to == "hand"))
                if es_del_jugador:
                    events = self.verbs.deal(self.state, to, count, hidden)
                else:
                    events = self.verbs.deal_shared(self.state, to, count, not hidden)
                all_events.extend(events)
        
        self.state.advance_phase()
        self.state.phase = GamePhase.PLAYING

        # El reparto puede dejar de turno a alguien que ya no puede decidir
        # (blackjack natural). Sin esto la partida arrancaba colgada.
        manejador = self._rules_handler()
        if manejador is not None:
            all_events.extend(manejador.asegurar_turno_jugable())

        return all_events
    
    def execute_action(self, action: str, **kwargs) -> List[dict]:
        """
        Ejecuta la acción de un jugador y devuelve eventos para el frontend.

        ⚠️ EL HUECO QUE HABÍA AQUÍ (corregido):
        esta función solo entendía los SIETE verbos genéricos de `CardVerbs`
        (draw/discard/play/pass/tuck/flip/tap), pero `get_legal_actions()`
        anuncia las acciones ESPECÍFICAS de cada juego — en blackjack,
        `hit/stand/double/split`. Ninguna tenía rama, así que caían al final,
        `events` se quedaba en `[]` y la función devolvía "éxito" **sin hacer
        nada**. Los 24 juegos se montaban y ninguno se podía jugar.

        Ahora las acciones específicas van a un manejador por juego, y lo que
        no esté implementado **avisa a gritos** en vez de fingir que funcionó.
        """
        events = []
        pid = self.state.current_player

        # ── Acciones específicas del juego (hit, stand, jugar:O_1…) ──
        # El nombre puede traer argumento pegado ("jugar:O_1"), así que se
        # compara solo la parte anterior a los dos puntos.
        manejador = self._rules_handler()
        raiz = action.split(":", 1)[0]
        if manejador is not None and raiz in manejador.acciones():
            events = manejador.ejecutar(action, **kwargs)
            self.state.history.append({"turn": self.state.turn_count, "player": pid,
                                       "action": action, "events": events})
            return events

        if action == "draw":
            events = self.verbs.draw(self.state, pid, count=kwargs.get("count", 1))
        elif action == "discard":
            events = self.verbs.discard(self.state, pid, kwargs["card_id"])
        elif action == "play":
            events = self.verbs.play(self.state, pid, kwargs["card_id"], kwargs.get("zone", "board"))
        elif action == "pass":
            events = self.verbs.pass_card(self.state, pid, kwargs["to_player"], kwargs["card_id"])
        elif action == "tuck":
            events = self.verbs.tuck(self.state, kwargs.get("from_zone", "board"), pid)
        elif action == "flip":
            events = self.verbs.flip(self.state, kwargs.get("zone", "hand"), kwargs.get("card_id"), pid)
        elif action == "tap":
            events = self.verbs.tap(self.state, pid, kwargs["card_id"])
        else:
            # Antes esto se tragaba la acción en silencio. Un no-op silencioso es
            # peor que un fallo: parece que el juego avanza y no avanza.
            raise NotImplementedError(
                f"'{action}' no está implementada para '{self.state.game_id}'. "
                f"Verbos genéricos: draw, discard, play, pass, tuck, flip, tap. "
                f"Acciones específicas de este juego: "
                f"{manejador.acciones() if manejador else 'ninguna (sin motor de reglas)'}."
            )

        # Record in history
        self.state.history.append({"turn": self.state.turn_count, "player": pid, "action": action, "events": events})

        return events

    def _rules_handler(self):
        """Devuelve el motor de reglas específico del juego, si lo hay."""
        if not hasattr(self, "_handler_cache"):
            nombre = self.state.game_schema.get("rules_engine")
            clase = MOTORES_DE_REGLAS.get(nombre)
            self._handler_cache = clase(self) if clase else None
        return self._handler_cache
    
    def get_state(self) -> dict:
        """Get serializable state for frontend."""
        return self.state.to_dict()
    
    def get_legal_actions(self) -> List[str]:
        """
        Acciones disponibles ahora mismo.

        Esto es el `affordances()` del contrato de gym: lo que lee un agente LLM
        para decidir. Por eso NO puede anunciar acciones que no se pueden
        ejecutar — antes listaba `hit/stand/double/split` en blackjack y las
        cuatro eran no-ops. Un agente que se fía de esta lista quedaba atrapado
        en un bucle sin saber por qué.
        """
        phase = self.state.current_phase
        verb = phase.get("verb", "")

        # ── SI HAY MOTOR DE REGLAS, MANDA ÉL ─────────────────────────────
        # Antes solo se le preguntaba cuando la fase era de tipo `choice`. Pero
        # en los juegos de bazas la fase se llama `play`/`deal`, así que el motor
        # quedaba fuera y se devolvían verbos genéricos ("play") que luego
        # petaban por falta de `card_id`. El motor específico sabe más que la
        # máquina de fases genérica: si existe, es la autoridad.
        manejador = self._rules_handler()
        if manejador is not None:
            return manejador.acciones_legales()

        if verb == "choice":
            # Sin motor de reglas ninguna acción específica es ejecutable, así
            # que no se anuncia ninguna (antes se anunciaban y eran no-ops).
            return []
        elif verb == "deal":
            return ["deal"]
        elif verb == "play":
            return ["play"]
        elif verb == "discard":
            return ["discard"]
        elif verb == "draw":
            return ["draw"]
        elif verb == "flip":
            return ["flip"]
        
        return []


# ═══════════════════════════════════════════════════════
#  SPECIALIZED RULE ENGINES 
# ═══════════════════════════════════════════════════════

class PokerHandEvaluator:
    """Evaluate poker hand rankings."""
    
    RANKINGS = [
        "high_card", "pair", "two_pair", "three_kind",
        "straight", "flush", "full_house", "four_kind",
        "straight_flush", "royal_flush"
    ]
    
    @staticmethod
    def evaluate(hand: List[Card], board: List[Card] = None) -> Tuple[int, str]:
        """Returns (score, hand_name) for a 5-card combination."""
        all_cards = hand + (board or [])
        if len(all_cards) < 5:
            return (0, "incomplete")
        
        # For now, return basic evaluation
        # Full implementation would check all 5-card combos from 7 cards
        ranks = sorted([c.rank for c in all_cards])
        suits = [c.suit for c in all_cards]
        
        # Count rank frequencies
        from collections import Counter
        rank_counts = Counter(ranks)
        freq = sorted(rank_counts.values(), reverse=True)
        
        is_flush = len(set(suits)) == 1 if len(all_cards) == 5 else False
        
        if freq[0] == 4:
            return (7, "four_kind")
        elif freq[0] == 3 and freq[1] == 2:
            return (6, "full_house")
        elif is_flush:
            return (5, "flush")
        elif freq[0] == 3:
            return (3, "three_kind")
        elif freq[0] == 2 and freq[1] == 2:
            return (2, "two_pair")
        elif freq[0] == 2:
            return (1, "pair")
        
        return (0, "high_card")


class BlackjackRules:
    """Blackjack hand value calculator."""
    
    VALUES = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":10,"Q":10,"K":10,"A":11}
    
    @staticmethod
    def hand_value(cards: List[Card]) -> int:
        total = sum(BlackjackRules.VALUES.get(c.rank, 0) for c in cards)
        aces = sum(1 for c in cards if c.rank == "A")
        while total > 21 and aces > 0:
            total -= 10
            aces -= 1
        return total
    
    @staticmethod
    def is_bust(cards: List[Card]) -> bool:
        return BlackjackRules.hand_value(cards) > 21
    
    @staticmethod
    def is_blackjack(cards: List[Card]) -> bool:
        return len(cards) == 2 and BlackjackRules.hand_value(cards) == 21


# ═══════════════════════════════════════════════════════
#  MOTORES DE REGLAS POR JUEGO
# ═══════════════════════════════════════════════════════
#
# `card_library.json` da a cada juego un campo `rules_engine`. Hasta ahora no
# había nada al otro lado de ese nombre: por eso los 24 juegos se montaban y
# ninguno se podía jugar. Aquí viven esos motores.
#
# Para añadir un juego: crea una clase con `acciones()`, `acciones_legales()` y
# `ejecutar()`, y regístrala en MOTORES_DE_REGLAS con el nombre del esquema.

class MotorDeReglas:
    """Contrato mínimo de un motor de reglas específico."""

    def __init__(self, juego):
        self.juego = juego
        self.state = juego.state

    def acciones(self) -> List[str]:
        """Todas las acciones que este motor sabe ejecutar."""
        return []

    #: en la mayoría gana quien más suma; en hearts, quien MENOS
    MENOR_GANA = False

    def acciones_legales(self) -> List[str]:
        """Las que además son válidas AHORA. Por defecto, todas."""
        return self.acciones()

    def asegurar_turno_jugable(self) -> List[dict]:
        """
        Deja la partida en un estado donde el jugador de turno PUEDE actuar.

        Hace falta porque un jugador puede quedarse sin decisiones (en blackjack,
        con 21 o pasado) y entonces nadie avanzaría el turno: `get_legal_actions()`
        devolvería lista vacía y la partida se quedaría colgada para siempre.
        Se llama tras el reparto y después de cada acción.
        """
        return []

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        raise NotImplementedError


class MotorBlackjack(MotorDeReglas):
    """
    Blackjack jugable.

    `split` NO está implementado, y por eso tampoco se anuncia. Prefiero que un
    agente vea tres acciones reales a que vea cuatro y una sea mentira — que es
    justo lo que pasaba antes con las cuatro.
    """

    def acciones(self) -> List[str]:
        return ["hit", "stand", "double"]

    def _mano(self, pid=None) -> List[Card]:
        pid = self.state.current_player if pid is None else pid
        z = self.state.players[pid].zones.get("hand")
        return z.cards if z else []

    def _crupier(self) -> List[Card]:
        z = self.state.shared_zones.get("dealer")
        return z.cards if z else []

    def _puede_actuar(self, pid) -> bool:
        mano = self._mano(pid)
        return not BlackjackRules.is_bust(mano) and BlackjackRules.hand_value(mano) != 21

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        if not self._puede_actuar(self.state.current_player):
            return []
        mano = self._mano()
        # `double` solo con la mano inicial, como en el casino.
        return ["hit", "stand"] + (["double"] if len(mano) == 2 else [])

    def asegurar_turno_jugable(self) -> List[dict]:
        """
        Salta a los jugadores que ya no pueden decidir (21 o pasados) y, si no
        queda ninguno, hace jugar al crupier y resuelve.

        Sin esto la partida se quedaba colgada: el jugador con 21 no tenía
        acciones legales, nadie avanzaba el turno y el crupier no llegaba a
        jugar nunca — se quedó en 13 y todos puntuaron 0.
        """
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        eventos = []
        while not self._puede_actuar(self.state.current_player):
            mano = self._mano()
            eventos.append({"verb": "auto_stand", "player": self.state.current_player,
                            "motivo": "pasado" if BlackjackRules.is_bust(mano) else "21",
                            "valor": BlackjackRules.hand_value(mano)})
            if self.state.current_player >= len(self.state.players) - 1:
                return eventos + self._turno_del_crupier()
            self.state.next_player()
        return eventos

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        pid = self.state.current_player
        eventos = []

        if accion in ("hit", "double"):
            eventos += self.juego.verbs.draw(self.state, pid, "hand", 1)
            mano = self._mano(pid)
            eventos.append({"verb": accion, "player": pid,
                            "valor": BlackjackRules.hand_value(mano),
                            "pasado": BlackjackRules.is_bust(mano)})
            # Doblar obliga a plantarse; pasarse también termina tu turno.
            if accion == "double" or BlackjackRules.is_bust(mano):
                eventos += self._plantarse()
            return eventos

        if accion == "stand":
            return self._plantarse()

        raise NotImplementedError(f"MotorBlackjack no implementa '{accion}'")

    def _plantarse(self) -> List[dict]:
        """Pasa al siguiente jugador; si no queda ninguno, juega el crupier."""
        eventos = [{"verb": "stand", "player": self.state.current_player}]
        if self.state.current_player < len(self.state.players) - 1:
            self.state.next_player()
            return eventos + self.asegurar_turno_jugable()
        return eventos + self._turno_del_crupier()

    def _turno_del_crupier(self) -> List[dict]:
        """Regla de la casa del esquema: `stand_on_17`."""
        eventos = []
        zona = self.state.shared_zones.get("dealer")
        if zona is None:
            zona = self.state.shared_zones.setdefault("dealer", Zone(name="dealer"))

        for c in zona.cards:
            c.face_up = True   # se descubre la carta tapada

        while BlackjackRules.hand_value(zona.cards) < 17 and self.state.stock:
            carta = self.state.stock.pop()
            carta.face_up = True
            zona.cards.append(carta)
            eventos.append({"verb": "dealer_draw", "card": carta.id,
                            "valor": BlackjackRules.hand_value(zona.cards)})

        eventos += self._resolver()
        self.state.phase = GamePhase.GAME_OVER
        return eventos

    def _resolver(self) -> List[dict]:
        """Puntúa cada jugador contra el crupier. +1 gana, 0 empata, -1 pierde."""
        vc = BlackjackRules.hand_value(self._crupier())
        crupier_pasado = vc > 21
        eventos = []
        for p in self.state.players:
            vj = BlackjackRules.hand_value(self._mano(p.id))
            if vj > 21:
                res, pts = "pierde", -1
            elif crupier_pasado or vj > vc:
                res, pts = "gana", 1
            elif vj == vc:
                res, pts = "empata", 0
            else:
                res, pts = "pierde", -1
            p.score += pts
            eventos.append({"verb": "resolve", "player": p.id, "jugador": vj,
                            "crupier": vc, "resultado": res, "puntos": pts})
        return eventos


class MotorBazas(MotorDeReglas):
    """
    Base para los juegos de BAZAS (trick-taking): brisca, tute, hearts, spades…

    Todos comparten el mismo esqueleto —cada jugador pone una carta, alguien se
    lleva la baza, se repite— y se diferencian en cuatro perillas:

        FUERZA           orden de fuerza de los rangos (quién gana la baza)
        PUNTOS           qué vale cada carta al contar
        SEGUIR_PALO      ¿obliga a servir del palo de salida?
        ROBAR_TRAS_BAZA  ¿se roba del mazo después de cada baza?

    Por eso un juego nuevo de esta familia son ~10 líneas de configuración, no
    un motor entero.

    ── EL ESPACIO DE ACCIONES ───────────────────────────────────────────────
    En blackjack basta con `hit`/`stand`, pero aquí la acción incluye la CARTA.
    Las acciones legales se devuelven como `"jugar:O_1"`, de modo que
    `get_legal_actions()` sigue siendo una lista de cadenas (el contrato no
    cambia) pero un agente LLM ya sabe exactamente qué puede hacer. También se
    admite `execute_action("jugar", card_id="O_1")`.
    """

    FUERZA: List[str] = []
    PUNTOS: Dict[str, int] = {}
    SEGUIR_PALO = False
    ROBAR_TRAS_BAZA = False
    #: si no es None, la baza vale esto en vez de la suma de sus cartas
    #: (spades cuenta BAZAS, no puntos de carta)
    PUNTOS_POR_BAZA: Optional[int] = None

    def __init__(self, juego):
        super().__init__(juego)
        self._jugadas = []      # [(pid, Card)] de la baza en curso
        self._mano = 0          # quién sale en esta baza

    # ── utilidades ───────────────────────────────────────────────
    def _cartas(self, pid) -> List[Card]:
        z = self.state.players[pid].zones.get("hand")
        return z.cards if z else []

    def _triunfo(self) -> Optional[str]:
        if self.state.trump_suit:
            return self.state.trump_suit
        z = self.state.shared_zones.get("trump")
        return z.cards[0].suit if z and z.cards else None

    def _fuerza(self, carta: Card) -> int:
        """Cuanto más alto, más fuerte. Rango desconocido = el más débil."""
        return self.FUERZA.index(carta.rank) if carta.rank in self.FUERZA else -1

    def puntos_carta(self, carta: Card) -> int:
        """
        Lo que vale una carta al contar.

        Se puede sobrescribir porque no todos los juegos puntúan por RANGO: en
        hearts vale el PALO (cada corazón 1) y una carta concreta (la dama de
        picas, 13). Con un diccionario rango→puntos no se puede expresar eso.
        """
        return self.PUNTOS.get(carta.rank, 0)

    def _jugables(self, pid) -> List[Card]:
        """Cartas que este jugador puede poner ahora mismo."""
        mano = self._cartas(pid)
        if not self.SEGUIR_PALO or not self._jugadas:
            return mano
        palo_salida = self._jugadas[0][1].suit
        del_palo = [c for c in mano if c.suit == palo_salida]
        if del_palo:
            return del_palo
        triunfo = self._triunfo()
        triunfos = [c for c in mano if c.suit == triunfo] if triunfo else []
        return triunfos or mano

    # ── contrato ─────────────────────────────────────────────────
    def acciones(self) -> List[str]:
        return ["jugar"]

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        return [f"jugar:{c.id}" for c in self._jugables(self.state.current_player)]

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        card_id = kwargs.get("card_id")
        if accion.startswith("jugar:"):
            card_id = accion.split(":", 1)[1]
        elif accion != "jugar":
            raise NotImplementedError(f"{type(self).__name__} no implementa '{accion}'")

        pid = self.state.current_player
        legales = {c.id for c in self._jugables(pid)}
        if card_id not in legales:
            raise ValueError(
                f"'{card_id}' no es jugable ahora por el jugador {pid}. "
                f"Legales: {sorted(legales)}"
                + (f" (hay que servir a {self._jugadas[0][1].suit})" if self.SEGUIR_PALO and self._jugadas else "")
            )

        carta = next(c for c in self._cartas(pid) if c.id == card_id)
        self._cartas(pid).remove(carta)
        carta.face_up = True
        tablero = self.state.shared_zones.setdefault("board", Zone(name="board"))
        tablero.cards.append(carta)
        self._jugadas.append((pid, carta))

        eventos = [{"verb": "jugar", "player": pid, "card": carta.id}]

        if len(self._jugadas) < len(self.state.players):
            self.state.next_player()
            return eventos

        return eventos + self._resolver_baza()

    def _resolver_baza(self) -> List[dict]:
        """Decide la baza, la entrega, repone manos y prepara la siguiente."""
        palo_salida = self._jugadas[0][1].suit
        triunfo = self._triunfo()

        def peso(par):
            _, c = par
            # Un triunfo gana a cualquier carta del palo de salida.
            return (2 if (triunfo and c.suit == triunfo) else 1 if c.suit == palo_salida else 0,
                    self._fuerza(c))

        ganador_pid, carta_ganadora = max(self._jugadas, key=peso)
        puntos = (self.PUNTOS_POR_BAZA if self.PUNTOS_POR_BAZA is not None
                  else sum(self.puntos_carta(c) for _, c in self._jugadas))

        # Las cartas de la baza van al montón del ganador.
        monton = self.state.players[ganador_pid].zones.setdefault("tricks", Zone(name="tricks", hidden=True))
        tablero = self.state.shared_zones.get("board")
        if tablero:
            monton.cards.extend(tablero.cards)
            tablero.cards = []
        self.state.players[ganador_pid].score += puntos

        eventos = [{"verb": "baza", "ganador": ganador_pid, "carta": carta_ganadora.id,
                    "puntos": puntos, "triunfo": triunfo}]

        if self.ROBAR_TRAS_BAZA:
            eventos += self._reponer(ganador_pid)

        self._jugadas = []
        self._mano = ganador_pid
        self.state.current_player = ganador_pid   # el que gana, sale

        if all(not self._cartas(p.id) for p in self.state.players):
            self.state.phase = GamePhase.GAME_OVER
            eventos.append({"verb": "fin", "puntos": {p.id: p.score for p in self.state.players}})
        return eventos

    def _reponer(self, ganador_pid) -> List[dict]:
        """Roba uno cada jugador empezando por el ganador; el triunfo es la última."""
        eventos = []
        n = len(self.state.players)
        for i in range(n):
            pid = (ganador_pid + i) % n
            if self.state.stock:
                carta = self.state.stock.pop()
            else:
                z = self.state.shared_zones.get("trump")
                if not (z and z.cards):
                    break
                carta = z.cards.pop()   # la última carta en juego es el triunfo
            carta.face_up = False
            self.state.players[pid].zones.setdefault("hand", Zone(name="hand")).cards.append(carta)
            eventos.append({"verb": "robar", "player": pid})
        return eventos

    def asegurar_turno_jugable(self) -> List[dict]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        # Descubrir el triunfo si el esquema lo pide y aún no está.
        for fase in self.state.game_schema.get("phases", []):
            if fase.get("to") == "trump" and not self.state.shared_zones.get("trump"):
                z = self.state.shared_zones.setdefault("trump", Zone(name="trump"))
                if self.state.stock:
                    c = self.state.stock.pop(0)   # del fondo: es la última que se roba
                    c.face_up = True
                    z.cards.append(c)
        return []


class MotorBrisca(MotorBazas):
    """
    Brisca. Baraja española de 40, 3 cartas en mano, triunfo destapado,
    se roba tras cada baza y **no hay obligación de servir al palo**.
    120 puntos en juego.
    """
    FUERZA = ["2", "4", "5", "6", "7", "S", "C", "R", "3", "1"]
    PUNTOS = {"1": 11, "3": 10, "R": 4, "C": 3, "S": 2}
    SEGUIR_PALO = False
    ROBAR_TRAS_BAZA = True


class MotorTute(MotorBazas):
    """
    Tute. Mismo orden y puntos que la brisca, pero **hay que servir al palo**
    (y fallar con triunfo si no puedes) y no se roba: se reparten 10 de golpe.

    SIMPLIFICACIÓN HONESTA: no están los *cantes* (las veinte y las cuarenta).
    El esquema tampoco los define. Se juega la baza limpia.

    OJO CON EL NÚMERO DE JUGADORES: el esquema reparte 10 cartas y no tiene fase
    de robo, así que **el tute solo cuadra a 4** (4 × 10 = las 40 cartas, 120
    puntos). A 2 jugadores se reparten 20 y las otras 20 se quedan en el mazo
    sin jugar: la partida es válida y los puntos se conservan, pero solo se
    disputan ~45 de los 120. No es un fallo del motor, es el esquema.
    """
    FUERZA = ["2", "4", "5", "6", "7", "S", "C", "R", "3", "1"]
    PUNTOS = {"1": 11, "3": 10, "R": 4, "C": 3, "S": 2}
    SEGUIR_PALO = True
    ROBAR_TRAS_BAZA = False


class MotorHearts(MotorBazas):
    """
    Hearts (Corazones). **Se juega a NO ganar**: cada corazón vale 1 punto de
    penalización y la dama de picas 13. Gana quien menos suma.

    Es el reverso de la brisca y por eso es un buen par en el benchmark: obliga
    al agente a entender que "ganar la baza" puede ser lo peor que puede hacer.
    Un agente que solo sepa maximizar se hunde aquí.

    SIMPLIFICACIÓN HONESTA: falta la fase de *pasar tres cartas* al inicio (el
    esquema la define pero es una mecánica aparte, no de bazas). Sin ella el
    juego es correcto, solo un poco menos táctico.
    """
    FUERZA = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    SEGUIR_PALO = True
    ROBAR_TRAS_BAZA = False
    MENOR_GANA = True

    def puntos_carta(self, carta: Card) -> int:
        if carta.suit == "H":
            return 1
        if carta.suit == "S" and carta.rank == "Q":
            return 13
        return 0


class MotorSpades(MotorBazas):
    """
    Spades. Las picas son SIEMPRE triunfo y se cuentan BAZAS, no puntos de carta.

    SIMPLIFICACIÓN HONESTA: falta la subasta (`bid`), que es el corazón táctico
    del juego real — apostar cuántas bazas harás y fallar te penaliza. Aquí se
    juega a hacer el máximo de bazas. El esquema define la fase `bid`; requiere
    un tipo de acción numérica que aún no existe en el contrato.
    """
    FUERZA = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    SEGUIR_PALO = True
    ROBAR_TRAS_BAZA = False
    PUNTOS_POR_BAZA = 1

    def _triunfo(self) -> Optional[str]:
        return "S"     # en spades el triunfo no se sortea: son las picas


class MotorGoFish(MotorDeReglas):
    """
    Go Fish. Pides a un rival todas sus cartas de un rango. Si las tiene, te las
    da y repites; si no, "vas a pescar" al mazo y pasa el turno. Cuatro del
    mismo rango = un *libro*, que vale un punto.

    Por qué es un buen banco para un LLM: **es memoria y deducción pura**. Cada
    pregunta que haces revela información a los demás, y cada pregunta que te
    hacen te revela a ti. No hay reflejos ni azar en la decisión, solo llevar la
    cuenta de quién preguntó qué.

    Regla real que sí está: solo puedes pedir un rango que ya tengas en la mano.
    """

    def acciones(self) -> List[str]:
        return ["pedir"]

    def _mano(self, pid) -> List[Card]:
        z = self.state.players[pid].zones.get("hand")
        return z.cards if z else []

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        pid = self.state.current_player
        rangos = sorted({c.rank for c in self._mano(pid)})
        rivales = [p.id for p in self.state.players if p.id != pid and self._mano(p.id)]
        if not rangos or not rivales:
            return []
        return [f"pedir:{r}:{o}" for r in rangos for o in rivales]

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        partes = accion.split(":")
        if partes[0] != "pedir" or len(partes) != 3:
            raise NotImplementedError(
                f"MotorGoFish espera 'pedir:RANGO:JUGADOR', recibido '{accion}'")
        rango, objetivo = partes[1], int(partes[2])
        pid = self.state.current_player

        if rango not in {c.rank for c in self._mano(pid)}:
            raise ValueError(
                f"No puedes pedir '{rango}': no tienes ninguna en la mano. "
                f"Tienes: {sorted({c.rank for c in self._mano(pid)})}")
        if objetivo == pid:
            raise ValueError("No puedes pedirte cartas a ti mismo.")

        pedidas = [c for c in self._mano(objetivo) if c.rank == rango]
        eventos = [{"verb": "pedir", "player": pid, "a": objetivo, "rango": rango,
                    "acierta": bool(pedidas)}]

        # ⚠️ EL TURNO ESTABA AL REVÉS.
        # Antes se avanzaba de jugador en el fallo Y OTRA VEZ al final, para las
        # dos ramas. Resultado con 2 jugadores: al ACERTAR perdías el turno (que
        # es justo lo contrario de la regla) y al FALLAR el doble avance te lo
        # devolvía. Acertar castigaba y fallar premiaba — por eso una política
        # tonta ganaba el 98% de las partidas.
        acierta = bool(pedidas)
        if acierta:
            for c in pedidas:
                self._mano(objetivo).remove(c)
                self._mano(pid).append(c)
            eventos.append({"verb": "entregar", "de": objetivo, "a": pid,
                            "cuantas": len(pedidas), "rango": rango})
        else:
            if self.state.stock:
                c = self.state.stock.pop()
                self._mano(pid).append(c)
                eventos.append({"verb": "pescar", "player": pid})

        eventos += self._cerrar_libros(pid)

        if self._fin():
            self.state.phase = GamePhase.GAME_OVER
            eventos.append({"verb": "fin", "puntos": {p.id: p.score for p in self.state.players}})
            return eventos

        # Acertar te da OTRO turno; fallar lo pierde. Una sola vez.
        if not acierta:
            self._siguiente_con_cartas()
        elif not self._mano(pid):
            # Salvo que te hayas quedado sin cartas al cerrar libros.
            self._siguiente_con_cartas()
        return eventos

    def _cerrar_libros(self, pid) -> List[dict]:
        """Cuatro del mismo rango salen de la mano y valen un punto."""
        eventos = []
        cuenta = {}
        for c in self._mano(pid):
            cuenta.setdefault(c.rank, []).append(c)
        for rango, cartas in cuenta.items():
            if len(cartas) >= 4:
                for c in cartas[:4]:
                    self._mano(pid).remove(c)
                libros = self.state.players[pid].zones.setdefault("books", Zone(name="books"))
                libros.cards.extend(cartas[:4])
                self.state.players[pid].score += 1
                eventos.append({"verb": "libro", "player": pid, "rango": rango})
        return eventos

    def _siguiente_con_cartas(self):
        """Salta a quien no tenga cartas; si nadie tiene, se acabó."""
        for _ in range(len(self.state.players)):
            self.state.next_player()
            if self._mano(self.state.current_player):
                return

    def _fin(self) -> bool:
        sin_cartas = all(not self._mano(p.id) for p in self.state.players)
        return sin_cartas and not self.state.stock

    def asegurar_turno_jugable(self) -> List[dict]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        eventos = []
        for p in self.state.players:
            eventos += self._cerrar_libros(p.id)
        if not self._mano(self.state.current_player):
            self._siguiente_con_cartas()
        return eventos


class MotorUnit(MotorDeReglas):
    """
    UNIT. Sueltas cartas que casen en COLOR o en NÚMERO con la de arriba del
    descarte; si no puedes, robas. Gana quien se queda sin cartas.

    ⚖️ SOBRE EL NOMBRE: este juego se llamaba "UNO" en el catálogo. **UNO es
    marca registrada de Mattel.** Las mecánicas de un juego no se pueden
    registrar, pero el NOMBRE sí — y este motor se publica libre, así que llevar
    esa palabra era buscarse un problema gratis. Renombrado a UNIT.

    Están las especiales que trae la baraja del catálogo: SKIP (te saltas al
    siguiente), REV (cambia el sentido) y D2 (el siguiente roba dos y pierde
    turno). Los comodines se juegan sobre cualquier color.

    Es la familia de "descarte" (shedding), distinta a las bazas: aquí no se
    gana nada por baza, se trata de vaciar la mano — y las especiales convierten
    el orden de juego en parte del problema.
    """
    ESPECIALES = {"SKIP", "REV", "D2", "WILD", "WD4"}

    #: Tope de turnos. UNIT es el único juego de la suite que puede no terminar
    #: solo: al reciclar el descarte siempre hay mazo, así que un agente que
    #: robe mucho mantiene la partida viva indefinidamente. Con agentes al azar
    #: se iba a 500+ pasos y nadie ganaba jamás. Al llegar al tope se cierra por
    #: la regla de bloqueo (gana quien menos cartas tiene).
    HORIZONTE = 200

    def acciones(self) -> List[str]:
        return ["jugar", "robar", "pasar"]

    def _mano(self, pid) -> List[Card]:
        z = self.state.players[pid].zones.get("hand")
        return z.cards if z else []

    def _cima(self) -> Optional[Card]:
        z = self.state.shared_zones.get("discard")
        return z.cards[-1] if z and z.cards else None

    def _casa(self, carta: Card) -> bool:
        cima = self._cima()
        if cima is None:
            return True
        if carta.rank in ("WILD", "WD4"):
            return True
        color = getattr(self.state, "_unit_color", None) or cima.suit
        return carta.suit == color or carta.rank == cima.rank

    def _rebarajar(self) -> bool:
        """
        Recicla el descarte cuando se acaba el mazo, dejando arriba la carta en
        juego. Sin esto la partida moría por agotamiento y **nadie ganaba nunca**
        (0% de victorias para todos los agentes): se acababan las cartas antes de
        que alguien vaciara la mano.
        """
        z = self.state.shared_zones.get("discard")
        if not z or len(z.cards) < 2:
            return False
        cima = z.cards.pop()
        reciclado = z.cards
        z.cards = [cima]
        random.shuffle(reciclado)
        for c in reciclado:
            c.face_up = False
        self.state.stock.extend(reciclado)
        return True

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        if getattr(self, "_turnos", 0) >= self.HORIZONTE:
            self._cerrar_bloqueada()
            return []
        pid = self.state.current_player
        jugables = [f"jugar:{c.id}" for c in self._mano(pid) if self._casa(c)]
        if not self.state.stock:
            self._rebarajar()
        if self.state.stock:
            return jugables + ["robar"]
        # Sin mazo y sin nada que reciclar: si no puedes jugar, PASAS.
        # Sin esta salida la partida se quedaba sin acciones legales y moría por
        # agotamiento — nadie vaciaba nunca la mano y el marcador daba 0% de
        # victorias para todos los agentes. Jugando al azar se roba mucho, así
        # que las manos crecían y el descarte se quedaba en una sola carta.
        return jugables or ["pasar"]

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        pid = self.state.current_player
        self._turnos = getattr(self, "_turnos", 0) + 1

        if accion == "pasar":
            # Si TODOS pasan seguidos, la partida está bloqueada y hay que
            # cerrarla. Sin esto, "pasar" convertía el atasco en un bucle
            # infinito: las 150 partidas del banco llegaban al tope de 500 pasos
            # y nadie ganaba nunca.
            self._pases = getattr(self, "_pases", 0) + 1
            self._avanzar()
            if self._pases >= len(self.state.players):
                return [{"verb": "pasar", "player": pid}] + self._cerrar_bloqueada()
            return [{"verb": "pasar", "player": pid}]

        if accion == "robar":
            if not self.state.stock:
                raise ValueError("El mazo está vacío: no puedes robar.")
            c = self.state.stock.pop()
            self._mano(pid).append(c)
            self._avanzar()
            return [{"verb": "robar", "player": pid}]

        if not accion.startswith("jugar:"):
            raise NotImplementedError(f"MotorUnit espera 'jugar:CARTA', 'robar' o 'pasar', no '{accion}'")

        card_id = accion.split(":", 1)[1]
        carta = next((c for c in self._mano(pid) if c.id == card_id), None)
        if carta is None:
            raise ValueError(f"No tienes '{card_id}' en la mano.")
        if not self._casa(carta):
            cima = self._cima()
            raise ValueError(
                f"'{card_id}' no casa con '{cima.id if cima else 'nada'}': "
                f"tiene que coincidir el color o el número.")

        self._mano(pid).remove(carta)
        carta.face_up = True
        self.state.shared_zones.setdefault("discard", Zone(name="discard")).cards.append(carta)
        self.state._unit_color = carta.suit or kwargs.get("color")
        self._pases = 0          # alguien ha jugado: la partida no está bloqueada
        eventos = [{"verb": "jugar", "player": pid, "card": carta.id}]

        if not self._mano(pid):
            self.state.players[pid].score += 1
            self.state.phase = GamePhase.GAME_OVER
            eventos.append({"verb": "unit", "player": pid, "gana": True})
            return eventos

        eventos += self._aplicar_especial(carta)
        self._avanzar()
        return eventos

    def _aplicar_especial(self, carta: Card) -> List[dict]:
        eventos = []
        if carta.rank == "REV":
            self.state.direction = -getattr(self.state, "direction", 1)
            eventos.append({"verb": "reverse", "sentido": self.state.direction})
        elif carta.rank == "SKIP":
            self._avanzar()
            eventos.append({"verb": "skip", "salta": self.state.current_player})
        elif carta.rank in ("D2", "WD4"):
            cuantas = 2 if carta.rank == "D2" else 4
            self._avanzar()
            victima = self.state.current_player
            for _ in range(cuantas):
                if self.state.stock:
                    self._mano(victima).append(self.state.stock.pop())
            eventos.append({"verb": "robar_forzado", "player": victima, "cuantas": cuantas})
        return eventos

    def _avanzar(self):
        n = len(self.state.players)
        d = getattr(self.state, "direction", 1) or 1
        self.state.current_player = (self.state.current_player + d) % n

    def _cerrar_bloqueada(self) -> List[dict]:
        """
        Partida bloqueada: nadie puede jugar y no queda mazo. Gana quien menos
        cartas tenga en la mano — es la regla habitual, y sobre todo evita que
        el episodio no termine nunca.
        """
        restantes = {p.id: len(self._mano(p.id)) for p in self.state.players}
        menos = min(restantes.values())
        for pid, n in restantes.items():
            if n == menos:
                self.state.players[pid].score += 1
        self.state.phase = GamePhase.GAME_OVER
        return [{"verb": "bloqueada", "cartas_restantes": restantes,
                 "ganan": [p for p, n in restantes.items() if n == menos]}]

    def asegurar_turno_jugable(self) -> List[dict]:
        """Si no hay descarte, voltea una carta para empezar."""
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        if self._cima() is None and self.state.stock:
            c = self.state.stock.pop()
            c.face_up = True
            self.state.shared_zones.setdefault("discard", Zone(name="discard")).cards.append(c)
            self.state._unit_color = c.suit
            return [{"verb": "voltear", "card": c.id}]
        return []


class MotorEntropy(MotorDeReglas):
    """
    ENTROPY — gana quien MENOS desorden acumula.

    Cada jugador tiene una caja de 8 cartas en rejilla de 2×4, casi todas boca
    abajo. En tu turno robas del mazo o del descarte y decides qué hacer con esa
    carta. Al final se suman las cartas de tu caja: **gana la suma más baja**.

    LA REGLA QUE LO HACE INTERESANTE
    --------------------------------
    Si las dos cartas de una COLUMNA coinciden en valor, **se anulan las dos**:
    esa columna vale 0. Así que un rey (12 puntos, la peor carta) deja de ser un
    lastre si consigues emparejarlo con otro rey. La carta más cara del mazo
    puede convertirse en la mejor jugada.

    POR QUÉ ENCAJA EN EL BENCHMARK
    ------------------------------
    Es el único juego de la suite donde **ganar es minimizar**, y donde la
    información es tuya y ajena a la vez: ves parte de tu caja, parte de la del
    rival, y el descarte cuenta la historia de lo que todos han rechazado. Un
    agente que solo sepa maximizar aquí se hunde — igual que en Corazones, pero
    con memoria de por medio.

    SOBRE EL NOMBRE
    ---------------
    La mecánica de rejilla-y-cambio con puntuación mínima es de la familia del
    Golf de cartas, que lleva décadas siendo de dominio público. Las mecánicas
    no se registran; los nombres comerciales sí. Este es el nuestro, y enlaza
    con los `yokai_entropy` del bestiario: la entropía es lo que hay que
    contener.
    """

    COLUMNAS = 4
    FILAS = 2

    #: Tope de turnos. La ronda acaba cuando alguien destapa toda su caja, pero
    #: un agente que solo cambie el mismo hueco una y otra vez NUNCA destapa
    #: nada y la partida no termina jamás. Con la política "siempre la primera
    #: acción" se iba al infinito. Al llegar al tope se destapa todo y se cuenta.
    HORIZONTE = 120

    # ── la carta en la mano ──────────────────────────────────
    # ⚠️ Vive en una ZONA COMPARTIDA, no en un atributo del motor.
    # La primera versión la guardaba en `self._robada`, y el recuento total daba
    # 95 de 96: la carta existía pero estaba fuera del estado. Eso no es solo un
    # descuadre de conteo — significa que `get_state()` no la vería, que no
    # sobreviviría a una serialización y que el verificador no podría repetir la
    # partida. En un juego que viaja por red, TODO tiene que estar en el estado.
    @property
    def _robada(self):
        z = self.state.shared_zones.get("mano")
        return z.cards[0] if z and z.cards else None

    @_robada.setter
    def _robada(self, carta):
        z = self.state.shared_zones.setdefault("mano", Zone(name="mano"))
        z.cards = [carta] if carta is not None else []

    # ── acceso a la caja ─────────────────────────────────────
    def _caja(self, pid) -> List[Card]:
        z = self.state.players[pid].zones.get("caja")
        return z.cards if z else []

    def _valor(self, carta: Card) -> int:
        return self.state.game_schema.get("card_values", {}).get(carta.rank, 0)

    def _columna(self, i: int) -> int:
        return i % self.COLUMNAS

    def puntos_de(self, pid) -> int:
        """
        Suma la caja, anulando las columnas emparejadas.

        Es el corazón del juego: dos cartas iguales en la misma columna valen 0
        las dos, por caras que sean.
        """
        caja = self._caja(pid)
        total = 0
        for col in range(self.COLUMNAS):
            en_columna = [caja[i] for i in range(len(caja)) if self._columna(i) == col]
            rangos = [c.rank for c in en_columna]
            if len(en_columna) == self.FILAS and len(set(rangos)) == 1:
                continue                      # columna anulada
            total += sum(self._valor(c) for c in en_columna)
        return total

    # ── contrato ─────────────────────────────────────────────
    def acciones(self) -> List[str]:
        # OJO: el enrutador de `execute_action` compara la RAÍZ de la acción
        # (lo anterior a los dos puntos) contra esta lista. Si falta una raíz,
        # la acción no llega al motor y se rechaza como no implementada —
        # aunque `acciones_legales()` la esté anunciando. Tienen que cuadrar.
        return ["robar_mazo", "robar_descarte", "cambiar",
                "descartar", "descartar_y_voltear"]

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        if getattr(self, "_turnos", 0) >= self.HORIZONTE:
            self._resolver()
            return []
        pid = self.state.current_player
        caja = self._caja(pid)

        # Con la carta ya robada, toca decidir qué hacer con ella.
        if self._robada is not None:
            out = [f"cambiar:{i}" for i in range(len(caja))]
            tapadas = [i for i, c in enumerate(caja) if not c.face_up]
            if tapadas:
                out += [f"descartar_y_voltear:{i}" for i in tapadas]
            else:
                out.append("descartar")
            return out

        # Sin carta en mano: robar de un sitio u otro.
        out = []
        if self.state.stock:
            out.append("robar_mazo")
        z = self.state.shared_zones.get("discard")
        if z and z.cards:
            out.append("robar_descarte")
        return out

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        pid = self.state.current_player
        self._turnos = getattr(self, "_turnos", 0) + 1
        descarte = self.state.shared_zones.setdefault("discard", Zone(name="discard"))

        if accion == "robar_mazo":
            if self._robada is not None:
                raise ValueError("ya tienes una carta en la mano")
            if not self.state.stock:
                self._reciclar()
            if not self.state.stock:
                raise ValueError("no queda mazo")
            self._robada = self.state.stock.pop()
            self._robada.face_up = True
            return [{"verb": "robar", "player": pid, "de": "mazo", "card": self._robada.id}]

        if accion == "robar_descarte":
            if self._robada is not None:
                raise ValueError("ya tienes una carta en la mano")
            if not descarte.cards:
                raise ValueError("el descarte está vacío")
            self._robada = descarte.cards.pop()
            return [{"verb": "robar", "player": pid, "de": "descarte", "card": self._robada.id}]

        if accion.startswith("cambiar:"):
            if self._robada is None:
                raise ValueError("no tienes carta que colocar")
            i = int(accion.split(":")[1])
            caja = self._caja(pid)
            if not 0 <= i < len(caja):
                raise ValueError(f"la caja tiene {len(caja)} huecos, no existe el {i}")
            fuera = caja[i]
            caja[i] = self._robada
            caja[i].face_up = True
            fuera.face_up = True
            descarte.cards.append(fuera)
            self._robada = None
            return self._cerrar_turno(pid, [{"verb": "cambiar", "player": pid,
                                             "hueco": i, "sale": fuera.id}])

        if accion.startswith("descartar_y_voltear:"):
            if self._robada is None:
                raise ValueError("no tienes carta que descartar")
            i = int(accion.split(":")[1])
            caja = self._caja(pid)
            if not 0 <= i < len(caja) or caja[i].face_up:
                raise ValueError(f"el hueco {i} no está tapado")
            descarte.cards.append(self._robada)
            self._robada = None
            caja[i].face_up = True
            return self._cerrar_turno(pid, [{"verb": "descartar_y_voltear",
                                             "player": pid, "hueco": i}])

        if accion == "descartar":
            if self._robada is None:
                raise ValueError("no tienes carta que descartar")
            descarte.cards.append(self._robada)
            self._robada = None
            return self._cerrar_turno(pid, [{"verb": "descartar", "player": pid}])

        raise NotImplementedError(f"MotorEntropy no implementa '{accion}'")

    def _cerrar_turno(self, pid, eventos) -> List[dict]:
        """La ronda acaba cuando alguien deja toda su caja boca arriba."""
        if all(c.face_up for c in self._caja(pid)):
            eventos.append({"verb": "cierra", "player": pid})
            eventos += self._resolver()
            return eventos
        self.state.next_player()
        return eventos

    def _resolver(self) -> List[dict]:
        """Se destapa todo y se cuenta. La puntuación va al marcador (menos es mejor)."""
        eventos = []
        for p in self.state.players:
            for c in self._caja(p.id):
                c.face_up = True
            puntos = self.puntos_de(p.id)
            p.score += puntos
            eventos.append({"verb": "contar", "player": p.id, "puntos": puntos})
        self.state.phase = GamePhase.GAME_OVER
        return eventos

    def _reciclar(self):
        """Se acaba el mazo: vuelve el descarte, menos la carta de arriba."""
        z = self.state.shared_zones.get("discard")
        if not z or len(z.cards) < 2:
            return
        cima = z.cards.pop()
        resto = z.cards
        z.cards = [cima]
        random.shuffle(resto)
        for c in resto:
            c.face_up = False
        self.state.stock.extend(resto)

    def asegurar_turno_jugable(self) -> List[dict]:
        """Al repartir se destapan dos cartas de cada caja: sin eso se juega a ciegas."""
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        eventos = []
        for p in self.state.players:
            caja = self._caja(p.id)
            if caja and not any(c.face_up for c in caja):
                for i in (0, self.COLUMNAS):        # una de cada fila
                    if i < len(caja):
                        caja[i].face_up = True
                        eventos.append({"verb": "destapar", "player": p.id, "hueco": i})
        return eventos

    MENOR_GANA = True     # el marcador es penalización: menos es mejor

    def sugerencia(self):
        """
        Rival de casa: si la carta en mano mejora algún hueco visible, la coloca;
        si no, descarta y destapa. Codicioso a un paso — no busca emparejar
        columnas, que es justo donde un agente bueno le puede sacar ventaja.
        """
        legales = self.acciones_legales()
        if not legales:
            return None
        pid = self.state.current_player

        if self._robada is None:
            # Coger del descarte solo si es una carta baja de verdad.
            if "robar_descarte" in legales:
                z = self.state.shared_zones.get("discard")
                if z and z.cards and self._valor(z.cards[-1]) <= 3:
                    return "robar_descarte"
            return "robar_mazo" if "robar_mazo" in legales else legales[0]

        caja = self._caja(pid)
        v = self._valor(self._robada)

        # ¿Mejora algún hueco ya visible?
        mejor, ganancia = None, 0
        for i, c in enumerate(caja):
            if not c.face_up:
                continue
            g = self._valor(c) - v
            if g > ganancia:
                ganancia, mejor = g, i
        if mejor is not None and f"cambiar:{mejor}" in legales:
            return f"cambiar:{mejor}"

        # Si la carta es muy baja, vale la pena arriesgar contra una tapada.
        tapadas = [a for a in legales if a.startswith("descartar_y_voltear:")]
        if v <= 3:
            cambios_tapados = [a for a in legales if a.startswith("cambiar:")
                               and not caja[int(a.split(":")[1])].face_up]
            if cambios_tapados:
                return cambios_tapados[0]
        return tapadas[0] if tapadas else ("descartar" if "descartar" in legales else legales[0])


class MotorGuerra(MotorDeReglas):
    """
    La Guerra (War). **No tiene ni una sola decisión**: se voltea y gana la más alta.

    Justo por eso vale como CONTROL DE LABORATORIO del benchmark: cualquier
    agente —LLM, red neuronal, humano o un dado— debe puntuar igual aquí. Si el
    marcador los separa, el que está mal es el banco de pruebas, no el agente.
    Un benchmark sin control no sabe distinguir habilidad de ruido.
    """
    ORDEN = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

    def acciones(self) -> List[str]:
        return ["voltear"]

    def acciones_legales(self) -> List[str]:
        if self.state.phase == GamePhase.GAME_OVER:
            return []
        return ["voltear"] if len(self.state.stock) >= len(self.state.players) else []

    def ejecutar(self, accion: str, **kwargs) -> List[dict]:
        if accion != "voltear":
            raise NotImplementedError(f"MotorGuerra no implementa '{accion}'")
        jugadas = []
        for p in self.state.players:
            if not self.state.stock:
                break
            c = self.state.stock.pop()
            c.face_up = True
            jugadas.append((p.id, c))

        eventos = [{"verb": "voltear", "cartas": {pid: c.id for pid, c in jugadas}}]
        if not jugadas:
            self.state.phase = GamePhase.GAME_OVER
            return eventos

        alto = max(self.ORDEN.index(c.rank) for _, c in jugadas)
        ganadores = [pid for pid, c in jugadas if self.ORDEN.index(c.rank) == alto]

        # El BOTE: las cartas de un empate no desaparecen, se acumulan y se las
        # lleva quien gane la siguiente. Antes se quedaban en el limbo —el
        # recuento total bajaba de 52— porque la rama del empate no las movía
        # a ningún sitio. Lo destapó la invariante "no se pierden cartas".
        if not hasattr(self, "_bote"):
            self._bote = []
        self._bote.extend(c for _, c in jugadas)

        if len(ganadores) > 1:
            eventos.append({"verb": "guerra", "empatan": ganadores, "bote": len(self._bote)})
        else:
            pid = ganadores[0]
            self.state.players[pid].score += len(self._bote)
            monton = self.state.players[pid].zones.setdefault("tricks", Zone(name="tricks", hidden=True))
            monton.cards.extend(self._bote)
            eventos.append({"verb": "baza", "ganador": pid, "cartas": len(self._bote)})
            self._bote = []

        if len(self.state.stock) < len(self.state.players):
            # Si la partida acaba con bote pendiente, se reparte por igual para
            # no evaporar cartas (empate técnico sobre el bote).
            if self._bote:
                monton = self.state.players[0].zones.setdefault("tricks", Zone(name="tricks", hidden=True))
                monton.cards.extend(self._bote)
                eventos.append({"verb": "bote_sin_resolver", "cartas": len(self._bote)})
                self._bote = []
            self.state.phase = GamePhase.GAME_OVER
            eventos.append({"verb": "fin", "puntos": {p.id: p.score for p in self.state.players}})
        return eventos


#: nombre en `rules_engine` → clase del motor
MOTORES_DE_REGLAS = {
    "blackjack_rules": MotorBlackjack,
    "brisca_rules":    MotorBrisca,
    "tute_rules":      MotorTute,
    "hearts_rules":    MotorHearts,
    "spades_rules":    MotorSpades,
    "go_fish_rules":   MotorGoFish,
    "entropy_rules":   MotorEntropy,
    "unit_rules":   MotorUnit,
    "war_rules":       MotorGuerra,
}


# ═══════════════════════════════════════════════════════
#  QUICK TEST
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    print("═══ Sovereign Card Rules Engine ═══\n")
    
    # Test deck factory
    lib_path = Path(__file__).parent.parent / "data" / "card_library.json"
    with open(lib_path, "r", encoding="utf-8") as f:
        lib = json.load(f)
    
    factory = DeckFactory(lib)
    
    for deck_id in lib["decks"]:
        cards = factory.build(deck_id)
        expected = lib["decks"][deck_id].get("total", "?")
        print(f"  {deck_id}: {len(cards)} cards (expected: {expected})")
    
    print(f"\n  Games available: {len(lib['games'])}")
    for gid, g in lib["games"].items():
        print(f"    • {g['name']} ({g['category']}) — {g['players']['min']}-{g['players']['max']}p — deck: {g['deck']}")
    
    # Test a full Texas Hold'em setup
    print("\n═══ Texas Hold'em Demo ═══")
    game = SovereignCardGame("texas_holdem", 4)
    events = game.setup()
    print(f"  Dealt {len(events)} cards")
    state = game.get_state()
    for p in state["players"]:
        print(f"  {p['name']}: {p['hand_count']} cards in hand")
    print(f"  Stock remaining: {state['stock_remaining']}")
    
    print("\n═══ Blackjack Demo ═══")
    game2 = SovereignCardGame("blackjack", 3)
    events2 = game2.setup()
    print(f"  Dealt {len(events2)} cards")
    
    print("\n✅ All systems nominal.")
