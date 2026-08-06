-- ═══════════════════════════════════════════════════════════════════════════
--  El dataset: partidas verificadas, y sólo verificadas
-- ═══════════════════════════════════════════════════════════════════════════
-- Una fila es una partida que alguien jugó y que ESTE servidor volvió a jugar
-- antes de guardarla. No hay ninguna otra forma de entrar aquí.
--
-- Por eso el dataset no se puede envenenar: no guardamos lo que nos cuentan,
-- guardamos lo que hemos recalculado. Quien mande una partida inflada, una
-- jugada ilegal o una semilla que no cuadra, no aparece en la tabla — y no hace
-- falta ni moderación, ni reputación, ni un modelo haciendo de juez.
--
-- `jugadas` va como texto JSON a propósito: con la semilla y las reglas basta
-- para reconstruir el estado completo en cualquier momento, así que guardar el
-- estado sería guardar algo que ya sabemos deducir. Una partida entera de
-- ajedrez son unos cientos de bytes.

CREATE TABLE IF NOT EXISTS partidas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  -- La huella de la partida: mismo juego, semilla y jugadas = misma fila.
  -- Sin esto, un agente que reintenta llenaría la tabla con copias.
  firma     TEXT    NOT NULL UNIQUE,
  juego     TEXT    NOT NULL,
  semilla   INTEGER NOT NULL,
  jugadas   TEXT    NOT NULL,          -- JSON: ["e2e4", …]
  n_jugadas INTEGER NOT NULL,
  -- Los puntos RECALCULADOS, nunca los declarados. Si algún día esta columna
  -- guardara lo que dijo el cliente, el dataset entero dejaría de valer.
  puntos    REAL    NOT NULL,
  -- La huella de las REGLAS con las que se verificó. Si mañana cambiamos una
  -- regla, las filas viejas siguen siendo ciertas — pero de otro juego, y
  -- conviene poder distinguirlas en vez de mezclarlas en la misma media.
  reglas    TEXT    NOT NULL,
  -- Quién jugó, si quiso decirlo. Nada de esto se comprueba y nada puntúa.
  tipo      TEXT    NOT NULL DEFAULT 'desconocido',   -- persona | agente | politica
  quien     TEXT,
  terminada INTEGER NOT NULL DEFAULT 0,
  fecha     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partidas_juego  ON partidas (juego);
CREATE INDEX IF NOT EXISTS idx_partidas_tipo   ON partidas (tipo);
CREATE INDEX IF NOT EXISTS idx_partidas_fecha  ON partidas (fecha);
