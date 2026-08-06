from __future__ import annotations

import json
import os
import socketserver
import sys
from pathlib import Path

from services import Services, windows_native_path


def data_dir() -> Path:
    configured = os.getenv("CHIBI_NOTES_DATA_DIR")
    if configured:
        return Path(configured)
    base = Path(os.getenv("APPDATA") or Path.home() / ".local/share")
    return base / "ChibiNotes"


services = Services(data_dir())


if "--vosk-self-test" in sys.argv:
    try:
        import vosk

        model_path = services._find_vosk_model({"language": "es-ES"})
        services._vosk_model({"language": "es-ES"})
        print(
            json.dumps(
                {
                    "ok": True,
                    "vosk": str(Path(vosk.__file__).resolve()),
                    "model": windows_native_path(model_path),
                }
            ),
            flush=True,
        )
        raise SystemExit(0)
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}), flush=True)
        raise SystemExit(2)


if "--sounddevice-self-test" in sys.argv:
    try:
        import sounddevice as sd

        version_number, version_text = sd.get_portaudio_version()
        print(
            json.dumps(
                {
                    "ok": True,
                    "sounddevice": str(Path(sd.__file__).resolve()),
                    "portaudioVersion": int(version_number),
                    "portaudio": str(version_text),
                }
            ),
            flush=True,
        )
        raise SystemExit(0)
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}), flush=True)
        raise SystemExit(3)


class Handler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        for line in self.rfile:
            try:
                request = json.loads(line)
                result = services.dispatch(
                    request["method"], request.get("params", {})
                )
                response = {"id": request.get("id"), "result": result}
            except Exception as error:
                response = {
                    "id": request.get("id") if "request" in locals() else None,
                    "error": {
                        "message": str(error),
                        "type": type(error).__name__,
                    },
                }
            self.wfile.write(
                (json.dumps(response, ensure_ascii=False) + "\n").encode("utf-8")
            )
            self.wfile.flush()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    host = os.getenv("CHIBI_NOTES_BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("CHIBI_NOTES_BACKEND_PORT", "8765"))
    print(f"Chibi Notes backend on {host}:{port}", flush=True)
    with Server((host, port), Handler) as server:
        server.serve_forever()
