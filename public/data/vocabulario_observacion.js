/**
 * vocabulario_observacion.js — LO GENERA `gen_vocabulario.mjs`. NO SE EDITA A MANO.
 *
 * Las listas cerradas que `substrateObservation` necesita para convertir un
 * sustrato de cartas en números: qué montones existen en cada juego, qué hechos,
 * qué valores puede tomar cada hecho de texto y qué cartas tiene su baraja.
 *
 * Medido jugando 8 semillas (1, 2, 3, 5, 8, 13, 21, 34) hasta 220 jugadas,
 * desde TODAS las sillas. `prueba_observacion.mjs` comprueba con semillas
 * distintas que no falte nada.
 */
export const VOCABULARIO = {
    "ajedrez": {
        "rejilla": {
            "ancho": 8,
            "alto": 8
        },
        "maxPiezas": 0,
        "tipos": [
            "b",
            "k",
            "n",
            "p",
            "q",
            "r"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "go": {
        "rejilla": {
            "ancho": 19,
            "alto": 19
        },
        "maxPiezas": 0,
        "tipos": [
            "b",
            "n"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "reversi": {
        "rejilla": {
            "ancho": 8,
            "alto": 8
        },
        "maxPiezas": 0,
        "tipos": [
            "ficha"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "damas": {
        "rejilla": {
            "ancho": 8,
            "alto": 8
        },
        "maxPiezas": 0,
        "tipos": [
            "dama",
            "peon"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "xiangqi": {
        "rejilla": {
            "ancho": 9,
            "alto": 10
        },
        "maxPiezas": 0,
        "tipos": [
            "a",
            "b",
            "c",
            "k",
            "n",
            "p",
            "r"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "mancala": {
        "rejilla": {
            "ancho": 8,
            "alto": 3
        },
        "maxPiezas": 0,
        "tipos": [
            "asiento"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "snake": {
        "rejilla": {
            "ancho": 20,
            "alto": 20
        },
        "maxPiezas": 0,
        "tipos": [
            "cabeza",
            "comida",
            "cuerpo"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "fagocito": {
        "rejilla": {
            "ancho": 28,
            "alto": 28
        },
        "maxPiezas": 0,
        "tipos": [
            "bolita",
            "cazador",
            "errante",
            "flanco",
            "jugador"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "peaton": {
        "rejilla": {
            "ancho": 11,
            "alto": 11
        },
        "maxPiezas": 0,
        "tipos": [
            "coche_der",
            "coche_izq",
            "jugador"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "blackjack": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "mano",
            "mazo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "poker": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "comunes",
            "mano"
        ],
        "hechos": [
            "bote",
            "fichas"
        ],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "brisca": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "baza",
            "mano",
            "mazo"
        ],
        "hechos": [
            "triunfo"
        ],
        "valores": {
            "triunfo": [
                "E",
                "O",
                "P"
            ]
        },
        "cartas": [
            "B_1",
            "B_2",
            "B_3",
            "B_4",
            "B_5",
            "B_6",
            "B_7",
            "B_C",
            "B_R",
            "B_S",
            "E_1",
            "E_2",
            "E_3",
            "E_4",
            "E_5",
            "E_6",
            "E_7",
            "E_C",
            "E_R",
            "E_S",
            "O_1",
            "O_2",
            "O_3",
            "O_4",
            "O_5",
            "O_6",
            "O_7",
            "O_C",
            "O_R",
            "O_S",
            "P_1",
            "P_2",
            "P_3",
            "P_4",
            "P_5",
            "P_6",
            "P_7",
            "P_C",
            "P_R",
            "P_S"
        ]
    },
    "tute": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "baza",
            "mano"
        ],
        "hechos": [
            "triunfo"
        ],
        "valores": {
            "triunfo": [
                "E",
                "O",
                "P"
            ]
        },
        "cartas": [
            "B_1",
            "B_2",
            "B_3",
            "B_4",
            "B_5",
            "B_6",
            "B_7",
            "B_C",
            "B_R",
            "B_S",
            "E_1",
            "E_2",
            "E_3",
            "E_4",
            "E_5",
            "E_6",
            "E_7",
            "E_C",
            "E_R",
            "E_S",
            "O_1",
            "O_2",
            "O_3",
            "O_4",
            "O_5",
            "O_6",
            "O_7",
            "O_C",
            "O_R",
            "O_S",
            "P_1",
            "P_2",
            "P_3",
            "P_4",
            "P_5",
            "P_6",
            "P_7",
            "P_C",
            "P_R",
            "P_S"
        ]
    },
    "hearts": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "baza",
            "mano"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "spades": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "baza",
            "mano"
        ],
        "hechos": [
            "triunfo"
        ],
        "valores": {
            "triunfo": [
                "S"
            ]
        },
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "guerra": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [
            "bote",
            "choque",
            "ganadas",
            "mazo"
        ],
        "zonas": [
            "bote",
            "choque",
            "ganadas",
            "mazo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "gofish": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "mano",
            "mazo"
        ],
        "hechos": [
            "libro_10",
            "libro_2",
            "libro_3",
            "libro_4",
            "libro_5",
            "libro_6",
            "libro_7",
            "libro_8",
            "libro_9",
            "libro_A",
            "libro_J",
            "libro_K",
            "libro_Q"
        ],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "unit": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "descarte",
            "mano",
            "mazo"
        ],
        "hechos": [
            "color",
            "sentido"
        ],
        "valores": {
            "color": [
                "B",
                "G",
                "R",
                "Y"
            ],
            "sentido": [
                "antihorario",
                "horario"
            ]
        },
        "cartas": [
            "B_0",
            "B_1",
            "B_2",
            "B_3",
            "B_4",
            "B_5",
            "B_6",
            "B_7",
            "B_8",
            "B_9",
            "B_D2",
            "B_REV",
            "B_SKIP",
            "G_0",
            "G_1",
            "G_2",
            "G_3",
            "G_4",
            "G_5",
            "G_6",
            "G_7",
            "G_8",
            "G_9",
            "G_D2",
            "G_REV",
            "G_SKIP",
            "R_0",
            "R_1",
            "R_2",
            "R_3",
            "R_4",
            "R_5",
            "R_6",
            "R_7",
            "R_8",
            "R_9",
            "R_D2",
            "R_REV",
            "R_SKIP",
            "W_WD4",
            "W_WILD",
            "Y_0",
            "Y_1",
            "Y_2",
            "Y_3",
            "Y_4",
            "Y_5",
            "Y_6",
            "Y_7",
            "Y_8",
            "Y_9",
            "Y_D2",
            "Y_REV",
            "Y_SKIP"
        ]
    },
    "entropy": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "caja",
            "descarte",
            "mazo",
            "robada"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "A_1",
            "A_10",
            "A_11",
            "A_12",
            "A_2",
            "A_3",
            "A_4",
            "A_5",
            "A_6",
            "A_7",
            "A_8",
            "A_9",
            "C_1",
            "C_10",
            "C_11",
            "C_12",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "M_1",
            "M_10",
            "M_11",
            "M_12",
            "M_2",
            "M_3",
            "M_4",
            "M_5",
            "M_6",
            "M_7",
            "M_8",
            "M_9",
            "V_1",
            "V_10",
            "V_11",
            "V_12",
            "V_2",
            "V_3",
            "V_4",
            "V_5",
            "V_6",
            "V_7",
            "V_8",
            "V_9",
            "W_JK"
        ]
    },
    "sokoban": {
        "rejilla": {
            "ancho": 8,
            "alto": 6
        },
        "maxPiezas": 0,
        "tipos": [
            "caja",
            "caja_ok",
            "jugador"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "marea": {
        "rejilla": {
            "ancho": 4,
            "alto": 4
        },
        "maxPiezas": 0,
        "tipos": [
            "0",
            "1",
            "10",
            "11",
            "12",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "mecha": {
        "rejilla": {
            "ancho": 13,
            "alto": 11
        },
        "maxPiezas": 0,
        "tipos": [
            "bomba",
            "bomba_ya",
            "caja",
            "jugador",
            "llama",
            "mejora_alcance",
            "mejora_bomba"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "cripta": {
        "rejilla": {
            "ancho": 24,
            "alto": 18
        },
        "maxPiezas": 0,
        "tipos": [
            "bicho",
            "heroe",
            "tesoro"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "flota": {
        "rejilla": {
            "ancho": 17,
            "alto": 8
        },
        "maxPiezas": 0,
        "tipos": [
            "agua",
            "barco",
            "impacto",
            "tocado"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "defensa": {
        "rejilla": {
            "ancho": 15,
            "alto": 10
        },
        "maxPiezas": 0,
        "tipos": [
            "bicho",
            "torre"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "sigilo": {
        "rejilla": {
            "ancho": 21,
            "alto": 15
        },
        "maxPiezas": 0,
        "tipos": [
            "botin",
            "dron",
            "guardia",
            "ladron"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "frentes": {
        "rejilla": {
            "ancho": 5,
            "alto": 17
        },
        "maxPiezas": 0,
        "tipos": [
            "mia",
            "suya"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "relevo": {
        "rejilla": {
            "ancho": 19,
            "alto": 13
        },
        "maxPiezas": 0,
        "tipos": [
            "companero",
            "placa",
            "placa_ok",
            "puerta",
            "puerta_abierta",
            "yo"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "cabina": {
        "rejilla": {
            "ancho": 15,
            "alto": 11
        },
        "maxPiezas": 0,
        "tipos": [
            "piloto",
            "pozo"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "rebano": {
        "rejilla": {
            "ancho": 19,
            "alto": 13
        },
        "maxPiezas": 0,
        "tipos": [
            "oveja",
            "oveja_ok",
            "perro"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "pradera": {
        "rejilla": {
            "ancho": 20,
            "alto": 14
        },
        "maxPiezas": 0,
        "tipos": [
            "queso",
            "raton",
            "raton_huye",
            "zorro"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "nave": {
        "rejilla": {
            "ancho": 19,
            "alto": 13
        },
        "maxPiezas": 0,
        "tipos": [
            "cadaver",
            "tripulante_a",
            "tripulante_b",
            "tripulante_c",
            "tripulante_d",
            "yo"
        ],
        "zonas": [],
        "hechos": [],
        "valores": {},
        "cartas": []
    },
    "shinigami": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h"
        ],
        "zonas": [
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "acusado ×1",
            "acusado ×10",
            "acusado ×2",
            "acusado ×3",
            "acusado ×4",
            "acusado ×5",
            "acusado ×6",
            "acusado ×7",
            "acusado ×8",
            "avalado ×1",
            "avalado ×2",
            "fuera",
            "leído: humano",
            "leído: shinigami",
            "señalado shinigami ×1",
            "señalado shinigami ×2",
            "shinigami",
            "tú"
        ]
    },
    "remigio": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "descarte",
            "mano",
            "mazo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q"
        ]
    },
    "chinchon": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [],
        "zonas": [
            "descarte",
            "mano",
            "mazo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "B_1",
            "B_2",
            "B_3",
            "B_4",
            "B_5",
            "B_6",
            "B_7",
            "B_8",
            "B_9",
            "B_C",
            "B_R",
            "B_S",
            "E_1",
            "E_2",
            "E_3",
            "E_4",
            "E_5",
            "E_6",
            "E_7",
            "E_8",
            "E_9",
            "E_C",
            "E_R",
            "E_S",
            "O_1",
            "O_2",
            "O_3",
            "O_4",
            "O_5",
            "O_6",
            "O_7",
            "O_8",
            "O_9",
            "O_C",
            "O_R",
            "O_S",
            "P_1",
            "P_2",
            "P_3",
            "P_4",
            "P_5",
            "P_6",
            "P_7",
            "P_8",
            "P_9",
            "P_C",
            "P_R",
            "P_S"
        ]
    },
    "alisapolis": {
        "rejilla": {
            "ancho": 9,
            "alto": 9
        },
        "maxPiezas": 0,
        "tipos": [
            "0",
            "1",
            "2",
            "dados",
            "decretos",
            "fincas",
            "peon"
        ],
        "zonas": [
            "dados",
            "decretos",
            "fincas"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "Akasha",
            "Data-1",
            "Data-2",
            "Docs-1",
            "Docs-2",
            "El Hub",
            "Genesis-1",
            "Genesis-2",
            "IrealWorld-1",
            "IrealWorld-2",
            "Laboratory-2",
            "Psyche-1",
            "Psyche-2",
            "Scripts-1",
            "Scripts-2",
            "Soma-1",
            "Soma-2",
            "World-1",
            "World-2",
            "d6_1",
            "d6_2",
            "d6_3",
            "d6_4",
            "d6_5",
            "d6_6"
        ]
    },
    "parchis": {
        "rejilla": {
            "ancho": 18,
            "alto": 18
        },
        "maxPiezas": 0,
        "tipos": [
            "0",
            "1",
            "2",
            "ficha"
        ],
        "zonas": [
            "casa",
            "dado"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "d6_1",
            "d6_2",
            "d6_3",
            "d6_4",
            "d6_5",
            "d6_6",
            "ficha_1",
            "ficha_2",
            "ficha_3",
            "ficha_4"
        ]
    },
    "generala": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [
            "asiento",
            "dados",
            "guardados",
            "hoja"
        ],
        "zonas": [
            "dados",
            "guardados",
            "hoja"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "d6_1",
            "d6_2",
            "d6_3",
            "d6_4",
            "d6_5",
            "d6_6",
            "d6_?",
            "hoja_1",
            "hoja_2",
            "hoja_3",
            "hoja_4",
            "hoja_5",
            "hoja_6",
            "hoja_doble",
            "hoja_escalera",
            "hoja_full",
            "hoja_generala",
            "hoja_poker"
        ]
    },
    "oca": {
        "rejilla": {
            "ancho": 9,
            "alto": 9
        },
        "maxPiezas": 0,
        "tipos": [
            "0",
            "1",
            "10",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "f1",
            "f2"
        ],
        "zonas": [
            "dado",
            "salida"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "d6_1",
            "d6_2",
            "d6_3",
            "d6_4",
            "d6_5",
            "d6_6",
            "f1",
            "f2"
        ]
    },
    "canadiense": {
        "rejilla": {
            "ancho": 18,
            "alto": 18
        },
        "maxPiezas": 0,
        "tipos": [
            "0",
            "1",
            "2",
            "ficha"
        ],
        "zonas": [
            "casa",
            "descarte",
            "mano",
            "mazo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "C_10",
            "C_2",
            "C_3",
            "C_4",
            "C_5",
            "C_6",
            "C_7",
            "C_8",
            "C_9",
            "C_A",
            "C_J",
            "C_K",
            "C_Q",
            "D_10",
            "D_2",
            "D_3",
            "D_4",
            "D_5",
            "D_6",
            "D_7",
            "D_8",
            "D_9",
            "D_A",
            "D_J",
            "D_K",
            "D_Q",
            "H_10",
            "H_2",
            "H_3",
            "H_4",
            "H_5",
            "H_6",
            "H_7",
            "H_8",
            "H_9",
            "H_A",
            "H_J",
            "H_K",
            "H_Q",
            "S_10",
            "S_2",
            "S_3",
            "S_4",
            "S_5",
            "S_6",
            "S_7",
            "S_8",
            "S_9",
            "S_A",
            "S_J",
            "S_K",
            "S_Q",
            "ficha_1",
            "ficha_2",
            "ficha_3",
            "ficha_4"
        ]
    },
    "domino": {
        "rejilla": null,
        "maxPiezas": 0,
        "tipos": [
            "cadena",
            "mano",
            "pozo"
        ],
        "zonas": [
            "cadena",
            "mano",
            "pozo"
        ],
        "hechos": [],
        "valores": {},
        "cartas": [
            "f:0-0",
            "f:0-2",
            "f:0-3",
            "f:0-4",
            "f:0-5",
            "f:0-6",
            "f:1-0",
            "f:1-1",
            "f:1-2",
            "f:1-3",
            "f:1-4",
            "f:1-5",
            "f:2-0",
            "f:2-1",
            "f:2-2",
            "f:2-3",
            "f:2-4",
            "f:2-5",
            "f:2-6",
            "f:3-0",
            "f:3-1",
            "f:3-2",
            "f:3-3",
            "f:3-4",
            "f:3-5",
            "f:3-6",
            "f:4-0",
            "f:4-1",
            "f:4-2",
            "f:4-3",
            "f:4-4",
            "f:4-5",
            "f:4-6",
            "f:5-0",
            "f:5-1",
            "f:5-2",
            "f:5-3",
            "f:5-4",
            "f:5-5",
            "f:5-6",
            "f:6-0",
            "f:6-1",
            "f:6-2",
            "f:6-3",
            "f:6-4",
            "f:6-5",
            "f:6-6"
        ]
    }
};
