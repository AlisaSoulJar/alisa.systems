#!/usr/bin/env python3
"""
hacer_favicon.py — el icono de la pestaña, dibujado a mano y sin dependencias
==============================================================================
    python hacer_favicon.py        →  public/favicon.ico

POR QUÉ ESTÁ AQUÍ Y NO ES UN PNG CUALQUIERA
Cada página pedía `/favicon.ico` y se llevaba un 404. Es el detalle más pequeño
del sitio y el primero que ve alguien: aparece en la pestaña antes de que cargue
nada. Un producto que se presenta al mundo no puede pedir un fichero que no
existe en cada carga.

QUÉ DIBUJA
La anomalía: un núcleo oscuro con un anillo de luz alrededor —el mismo gesto que
la lente de la sala, donde la luz se curva al pasar cerca del huevo— sobre el
azul de fondo del motor. A 32×32 no cabe más que una idea, así que se dibuja
LA idea.

Sin Pillow: el formato ICO es una cabecera y un mapa de bits, y `struct` basta.
Una dependencia nueva por un icono de 4 KB no sale a cuenta.
==============================================================================
"""
import math
import struct
from pathlib import Path

LADO = 32
SALIDA = Path(__file__).resolve().parent / "public" / "favicon.ico"

FONDO  = (0x0b, 0x0e, 0x14)      # el azul casi negro del motor
NUCLEO = (0x05, 0x07, 0x0c)      # el huevo: más oscuro que el fondo
ANILLO = (0x7f, 0xd0, 0xff)      # el cian de la interfaz
CALOR  = (0xf6, 0xb3, 0x5b)      # el ámbar de la luz cálida


def mezclar(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def pixel(x, y):
    """Color y opacidad de un píxel, en coordenadas centradas."""
    cx, cy = (LADO - 1) / 2, (LADO - 1) / 2
    dx, dy = x - cx, y - cy
    r = math.hypot(dx, dy) / (LADO / 2)          # 0 en el centro, 1 en el borde

    if r > 0.98:
        return (0, 0, 0), 0                       # fuera: transparente

    color = FONDO

    # el disco de acreción: un anillo de luz que se apaga hacia fuera
    anillo = math.exp(-((r - 0.62) ** 2) / 0.012)
    color = mezclar(color, ANILLO, anillo * 0.95)

    # un toque cálido abajo a la derecha, para que no sea plano
    calor = math.exp(-((r - 0.72) ** 2) / 0.02) * max(0.0, (dx + dy) / (LADO * 0.9))
    color = mezclar(color, CALOR, calor * 0.8)

    # el núcleo se traga la luz
    if r < 0.42:
        color = mezclar(NUCLEO, color, max(0.0, (r - 0.30) / 0.12))

    # el borde exterior se difumina en vez de cortarse
    alfa = 255 if r < 0.90 else round(255 * (0.98 - r) / 0.08)
    return color, max(0, min(255, alfa))


def main():
    # píxeles BGRA, de abajo arriba (así se guarda un BMP dentro de un ICO)
    cuerpo = bytearray()
    for y in range(LADO - 1, -1, -1):
        for x in range(LADO):
            (r, g, b), a = pixel(x, y)
            cuerpo += bytes((b, g, r, a))

    # máscara AND: no se usa con 32 bits, pero la cabecera la exige
    mascara = bytes((LADO // 8) * LADO)

    dib = struct.pack("<IiiHHIIiiII",
                      40, LADO, LADO * 2, 1, 32, 0, len(cuerpo), 0, 0, 0, 0)
    imagen = dib + bytes(cuerpo) + mascara

    ico = struct.pack("<HHH", 0, 1, 1)
    ico += struct.pack("<BBBBHHII", LADO, LADO, 0, 0, 1, 32, len(imagen), 22)
    ico += imagen

    SALIDA.write_bytes(ico)
    print(f"  {SALIDA.relative_to(SALIDA.parents[1])} · {len(ico):,} bytes · {LADO}×{LADO}")


if __name__ == "__main__":
    main()
