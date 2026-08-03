#!/usr/bin/env python3
"""
check_secretos.py — lo último que se ejecuta antes de publicar
==============================================================================
    python check_secretos.py            # revisa lo que git PUBLICARÍA
    python check_secretos.py --todo     # revisa el disco entero, ignorados incluidos

⚠️ POR QUÉ EXISTE, Y POR QUÉ ESTABA EN FALTA

`.gitignore` lleva escrito desde hace tiempo:

    «Comprobación: `python check_secretos.py` antes de cada subida.»

**Y el fichero no existía.** O sea que la única barrera contra publicar una
clave era un comentario que mandaba ejecutar algo inexistente. El mismo
`.gitignore` cuenta por qué importa: en `_deploy_archive/` hay nueve cadenas con
forma de clave de API y ocho tokens, y un `git add .` los habría subido a un
repositorio PÚBLICO.

Y publicar una credencial no tiene marcha atrás: aunque borres el commit, queda
en los clones, en las cachés y en los buscadores de secretos que rastrean GitHub
en cuestión de minutos. No es un error que se arregla — es uno que se rota.

QUÉ MIRA
--------
Lo que git subiría de verdad (`git ls-files` + lo que añadirías), no lo que hay
en disco. Un secreto dentro de algo ya ignorado no es un incidente; el mismo
secreto en un fichero que va a viajar, sí.

⚠️ NO GARANTIZA NADA. Un detector de patrones caza lo que sabe nombrar. Se usa
como último filtro, no como permiso para no mirar.
==============================================================================
"""
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
TODO = "--todo" in sys.argv

#: Los patrones son de FORMA, no de nombre: una clave no se anuncia.
PATRONES = [
    ("clave de OpenAI",        re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}")),
    ("clave de Anthropic",     re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}")),
    ("token de GitHub",        re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}")),
    ("token de Cloudflare",    re.compile(r"\b[A-Za-z0-9_\-]{40}\b(?=.{0,40}(?i:cloudflare|cf[_\-]?api))")),
    ("clave de Google",        re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}")),
    ("clave de AWS",           re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("token de Slack",         re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}")),
    ("clave privada",          re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY")),
    ("asignación sospechosa",  re.compile(
        r"(?i)\b(api[_\-]?key|secret|token|passwd|password|bearer)\b\s*[:=]\s*"
        r"['\"][A-Za-z0-9_\-\.]{16,}['\"]")),
]

#: Lo que se sabe que NO es un secreto aunque lo parezca.
INOCENTES = re.compile(
    r"(?i)(tu[_\-]?api[_\-]?key|your[_\-]?key|xxx+|<[^>]+>|ejemplo|example|"
    r"placeholder|\.\.\.|cambiame|REPLACE|INSERT_|token de|clave de)")

#: Binarios y generados: ni tienen secretos ni se leen bien.
SALTAR = {".glb", ".gltf", ".fbx", ".obj", ".png", ".jpg", ".jpeg", ".webp", ".gif",
          ".woff", ".woff2", ".ttf", ".ico", ".mp3", ".ogg", ".wav", ".bin", ".vrm",
          ".blend", ".exe", ".zip", ".wasm", ".pyc"}


def ficheros_de_git():
    """Lo que git ya sigue + lo que añadirías. Nada de lo ignorado."""
    def correr(*args):
        r = subprocess.run(["git", *args], cwd=RAIZ, capture_output=True,
                           text=True, encoding="utf-8", errors="replace")
        return [l for l in (r.stdout or "").splitlines() if l.strip()]
    seguidos = correr("ls-files")
    nuevos = correr("ls-files", "--others", "--exclude-standard")
    return sorted(set(seguidos) | set(nuevos))


def main():
    if TODO:
        rutas = [p.relative_to(RAIZ).as_posix() for p in RAIZ.rglob("*") if p.is_file()]
        print("  revisando EL DISCO ENTERO (ignorados incluidos)")
    else:
        rutas = ficheros_de_git()
        print("  revisando lo que git publicaría")

    revisados, hallazgos = 0, []
    for rel in rutas:
        f = RAIZ / rel
        if f.suffix.lower() in SALTAR or not f.is_file():
            continue
        try:
            if f.stat().st_size > 4_000_000:
                continue
            txt = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        revisados += 1
        for etiqueta, patron in PATRONES:
            for m in patron.finditer(txt):
                linea = txt.count("\n", 0, m.start()) + 1
                trozo = m.group(0)
                if INOCENTES.search(trozo):
                    continue
                # No se imprime el secreto: se dice dónde está. Un informe que
                # copia la clave la vuelve a filtrar, ahora en tu terminal.
                hallazgos.append((rel, linea, etiqueta, len(trozo)))

    print(f"  {revisados:,} ficheros de texto revisados\n")
    if not hallazgos:
        print("  ✅ nada con forma de credencial en lo que se publicaría.")
        print("     (Un detector caza lo que sabe nombrar: esto es el último")
        print("      filtro, no un permiso para no mirar.)")
        return 0

    print(f"  ❌ {len(hallazgos)} HALLAZGO(S) — NO SUBIR:\n")
    for rel, linea, etiqueta, n in hallazgos[:40]:
        print(f"     {rel}:{linea}  ← {etiqueta} ({n} caracteres)")
    print("\n  No se imprime el contenido a propósito. Míralo, y si es real:")
    print("     1. ROTA la credencial. Quitarla del fichero no la desactiva.")
    print("     2. Sácala del repositorio y añade el patrón a .gitignore.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
