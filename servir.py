"""Servidor de desarrollo para alisa-systems. Como `python -m http.server`,
pero sin caché.

⚠️ POR QUÉ EXISTE (1 de agosto de 2026)
`http.server` no manda cabeceras de caché. Sin ellas el navegador aplica su
caché heurística: se queda con la copia vieja de los .js y NO la revalida.
Cambiar la URL del HTML (`?v=21`) no sirve de nada, porque la URL del módulo
importado no cambia.

Perdí un buen rato depurando un fallo de rotación que YA estaba arreglado en
disco: el fichero servido era el nuevo, el módulo ejecutándose era el viejo, y
la página me daba una medida perfectamente coherente... de código muerto.

Una herramienta de desarrollo que te enseña una versión distinta de la que has
escrito no es un inconveniente: es un mentiroso. Y hay que arreglar al testigo,
no la prueba.

    python servir.py [puerto] [carpeta]
        python servir.py                        # 8000, sirve public/  (el taller)
        python servir.py 8010 dist_publico      # sirve EL PAQUETE

⚠️ Y sirve el paquete SIN CACHÉ por la misma razón. Verifiqué `dist_publico`
con un `python -m http.server` pelado y me dio una página que llamaba a Google
Fonts… usando un CSS viejo de la caché del navegador, mientras el servidor
mandaba el corregido. Otra vez el testigo mintiendo, y esta vez casi me lo creo.
"""
import functools
import http.server
import pathlib
import socketserver
import sys

BASE = pathlib.Path(__file__).parent


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # Todo lo nuestro está escrito en UTF-8, pero `SimpleHTTPRequestHandler`
    # manda `text/html` a secas. Sin charset —y sin un <meta> en la página— el
    # navegador cae en windows-1252 y el acento se convierte en "Ã©": lo vi en
    # el título de Corporate Building. Se dice una vez aquí y deja de pasar en
    # todos los ficheros, en vez de ir parcheando <meta> uno a uno.
    def guess_type(self, path):
        tipo = super().guess_type(path)
        if tipo.startswith(("text/", "application/javascript")) and "charset=" not in tipo:
            return tipo + "; charset=utf-8"
        return tipo

    # Sin esto, un `If-Modified-Since` del navegador aún podría llevarse un 304.
    # (`self.headers` es un email.message.Message: tiene __delitem__, no pop —
    # y borrar una clave ausente ahí no da error.)
    def send_head(self):
        del self.headers["If-Modified-Since"]
        del self.headers["If-None-Match"]
        return super().send_head()

    def log_message(self, formato, *args):
        # Solo lo que importa: los fallos. El ruido de 200s tapa los 404.
        #
        # ⚠️ Esto era `str(args[1])` a pelo, y `log_message` NO siempre recibe
        # dos argumentos: `log_error` la llama con uno solo. El IndexError
        # reventaba el manejador a media respuesta, así que el servidor cerraba
        # la conexión sin contestar: el navegador veía ERR_EMPTY_RESPONSE en vez
        # de un 404 honesto. Un servidor que se cae justo al informar de un
        # fallo esconde precisamente lo que hay que ver.
        codigo = str(args[1]) if len(args) > 1 else str(args[0]) if args else ""
        if not (codigo.startswith(("4", "5")) or "code" in formato):
            return
        # ⚠️ Y ESTO SÍ QUE MUERDE: arrancado con `pythonw.exe` no hay consola, y
        # `sys.stderr` es None. `log_message` escribe ahí, así que reventaba el
        # manejador ENTERO y el navegador recibía una respuesta vacía en vez de
        # un 404. Los 200 iban bien porque a esos no les escribimos nada: el
        # servidor solo se caía al informar de un fallo. Un registro que puede
        # tumbar la petición que está registrando no es un registro, es una mina.
        try:
            super().log_message(formato, *args)
        except Exception:
            pass


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    RAIZ = BASE / (sys.argv[2] if len(sys.argv) > 2 else "public")
    if not RAIZ.is_dir():
        sys.exit(f"  no existe {RAIZ}  (¿falta `python empaquetar.py`?)")
    manejador = functools.partial(SinCache, directory=str(RAIZ))
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", puerto), manejador) as s:
        print(f"  alisa-systems  ->  http://127.0.0.1:{puerto}/rooms/room_sala_del_huevo.html")
        print(f"  sirviendo {RAIZ}  (sin cache)")
        s.serve_forever()
