from __future__ import annotations

import importlib.util
import json
import platform
import shutil
import struct
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
backend_dir = root / "backend"
hooks_dir = backend_dir / "hooks"
dist = root / "src-tauri" / "binaries"
dist.mkdir(parents=True, exist_ok=True)
hooks_dir.mkdir(parents=True, exist_ok=True)

# Vosk's Windows loader calls os.add_dll_directory() with the extracted
# package directory. A one-file PyInstaller build can omit that directory
# even when the DLL was collected, producing _MEI...\\vosk WinError 2.
(hooks_dir / "hook-vosk.py").write_text(
    "from PyInstaller.utils.hooks import collect_all, collect_dynamic_libs, collect_data_files\n"
    "datas, binaries, hiddenimports = collect_all('vosk')\n"
    "datas += collect_data_files('vosk', include_py_files=True)\n"
    "binaries += collect_dynamic_libs('vosk', destdir='vosk')\n",
    encoding="utf-8",
)

# sounddevice.py is a single module, not a package. collect_all('sounddevice')
# therefore skips its companion _sounddevice_data directory and can end up
# placing PortAudio as a plain data file. PortAudio must be collected as a
# binary so PyInstaller also resolves and bundles its native dependencies.
(hooks_dir / "hook-sounddevice.py").write_text(
    "from pathlib import Path\n"
    "from PyInstaller.utils.hooks import get_module_file_attribute, logger\n"
    "binaries = []\n"
    "datas = []\n"
    "hiddenimports = ['_sounddevice_data', '_cffi_backend']\n"
    "module_dir = Path(get_module_file_attribute('sounddevice')).resolve().parent\n"
    "data_dir = module_dir / '_sounddevice_data' / 'portaudio-binaries'\n"
    "dest_dir = str(Path('_sounddevice_data') / 'portaudio-binaries')\n"
    "if data_dir.is_dir():\n"
    "    for library in sorted(data_dir.glob('libportaudio*.*')):\n"
    "        binaries.append((str(library), dest_dir))\n"
    "    readme = data_dir / 'README.md'\n"
    "    if readme.is_file():\n"
    "        datas.append((str(readme), dest_dir))\n"
    "if not binaries:\n"
    "    logger.warning('PortAudio binaries were not found for sounddevice')\n",
    encoding="utf-8",
)

runtime_hook = hooks_dir / "pyi_rth_chibi_vosk.py"
runtime_hook.write_text(
    "from pathlib import Path\n"
    "import os, shutil, sys\n"
    "root = Path(getattr(sys, '_MEIPASS', Path(sys.executable).resolve().parent))\n"
    "vosk_dir = root / 'vosk'\n"
    "vosk_dir.mkdir(parents=True, exist_ok=True)\n"
    "for candidate in root.rglob('libvosk.dll'):\n"
    "    target = vosk_dir / 'libvosk.dll'\n"
    "    if candidate != target and not target.exists():\n"
    "        try: shutil.copy2(candidate, target)\n"
    "        except OSError: pass\n"
    "os.environ['PATH'] = str(vosk_dir) + os.pathsep + os.environ.get('PATH', '')\n",
    encoding="utf-8",
)

for package in ("vosk", "sounddevice", "_sounddevice_data", "cffi"):
    if importlib.util.find_spec(package) is None:
        raise RuntimeError(
            f"No se encontró el paquete Python {package!r}. "
            "Ejecuta scripts\\SETUP_WINDOWS.cmd para instalar las dependencias."
        )

vosk_spec = importlib.util.find_spec("vosk")
vosk_locations = list(vosk_spec.submodule_search_locations or []) if vosk_spec else []
if not vosk_locations:
    raise RuntimeError("No se pudo localizar la carpeta instalada de Vosk.")
vosk_dir = Path(vosk_locations[0])

sounddevice_data_spec = importlib.util.find_spec("_sounddevice_data")
sounddevice_locations = (
    list(sounddevice_data_spec.submodule_search_locations or [])
    if sounddevice_data_spec
    else []
)
if not sounddevice_locations:
    raise RuntimeError(
        "La instalación de sounddevice no contiene el paquete _sounddevice_data. "
        "Reinstala las dependencias con scripts\\SETUP_WINDOWS.cmd."
    )
portaudio_dir = Path(sounddevice_locations[0]) / "portaudio-binaries"
required_portaudio = portaudio_dir / (
    "libportaudio64bit.dll" if struct.calcsize("P") == 8 else "libportaudio32bit.dll"
)
if platform.system() == "Windows" and not required_portaudio.is_file():
    raise RuntimeError(
        f"No se encontró la DLL de PortAudio requerida: {required_portaudio}. "
        "Elimina .venv y vuelve a ejecutar scripts\\SETUP_WINDOWS.cmd."
    )

# A marker guarantees that _MEIPASS\\vosk exists before vosk.__init__ runs.
marker = hooks_dir / "vosk-package.marker"
marker.write_text("Chibi Notes Vosk package directory", encoding="utf-8")

command = [
    sys.executable,
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--log-level",
    "WARN",
    "--onefile",
    "--name",
    "chibi-notes-backend",
    "--additional-hooks-dir",
    str(hooks_dir),
    "--runtime-hook",
    str(runtime_hook),
    "--collect-all",
    "vosk",
    "--add-data",
    f"{marker}{';' if platform.system() == 'Windows' else ':'}vosk",
    "--hidden-import",
    "_sounddevice_data",
    "--hidden-import",
    "_cffi_backend",
    "--hidden-import",
    "cffi",
]

separator = ";" if platform.system() == "Windows" else ":"
for binary in sorted(vosk_dir.rglob("*.dll")):
    command.extend(["--add-binary", f"{binary}{separator}vosk"])
for binary in sorted(vosk_dir.rglob("*.pyd")):
    command.extend(["--add-binary", f"{binary}{separator}vosk"])

command.append(str(backend_dir / "main.py"))
subprocess.run(command, cwd=backend_dir, check=True, stderr=subprocess.STDOUT)

arch = {
    "AMD64": "x86_64",
    "x86_64": "x86_64",
    "ARM64": "aarch64",
}.get(platform.machine(), platform.machine().lower())
triple = (
    f"{arch}-pc-windows-msvc"
    if platform.system() == "Windows"
    else f"{arch}-unknown-linux-gnu"
)
src = backend_dir / "dist" / (
    "chibi-notes-backend.exe"
    if platform.system() == "Windows"
    else "chibi-notes-backend"
)
dst = dist / (
    f"chibi-notes-backend-{triple}.exe"
    if platform.system() == "Windows"
    else f"chibi-notes-backend-{triple}"
)
shutil.copy2(src, dst)

if platform.system() == "Windows":
    check_env = dict(__import__("os").environ)
    source_model = (
        root / "backend" / "models" / "vosk-model-small-es-0.42"
    ).resolve()
    check_env["CHIBI_NOTES_VOSK_MODEL"] = str(source_model)

    vosk_check = subprocess.run(
        [str(dst), "--vosk-self-test"],
        capture_output=True,
        text=True,
        timeout=90,
        env=check_env,
    )
    if vosk_check.returncode != 0:
        raise RuntimeError(
            "El sidecar no superó la prueba de carga de Vosk: "
            f"{vosk_check.stdout} {vosk_check.stderr}"
        )
    print(f"Prueba Vosk correcta: {vosk_check.stdout.strip()}")

    # Tauri/Windows can expose resource paths with the Win32 verbatim prefix
    # (\\?\C:\...). Kaldi/Vosk does not reliably accept that prefix, so
    # the packaged backend must normalize it before opening the model.
    verbatim_env = dict(check_env)
    source_text = str(source_model)
    if not source_text.startswith("\\\\?\\"):
        verbatim_env["CHIBI_NOTES_VOSK_MODEL"] = "\\\\?\\" + source_text
    verbatim_check = subprocess.run(
        [str(dst), "--vosk-self-test"],
        capture_output=True,
        text=True,
        timeout=90,
        env=verbatim_env,
    )
    if verbatim_check.returncode != 0:
        raise RuntimeError(
            "El sidecar no normalizó correctamente una ruta extendida de Windows para Vosk: "
            f"{verbatim_check.stdout} {verbatim_check.stderr}"
        )
    print(f"Prueba de ruta Vosk de Windows correcta: {verbatim_check.stdout.strip()}")

    audio_check = subprocess.run(
        [str(dst), "--sounddevice-self-test"],
        capture_output=True,
        text=True,
        timeout=45,
        env=check_env,
    )
    if audio_check.returncode != 0:
        detail = f"{audio_check.stdout} {audio_check.stderr}".strip()
        raise RuntimeError(
            "El sidecar no superó la prueba de PortAudio/sounddevice. "
            "La DLL debe incluirse como binario junto con sus dependencias nativas. "
            f"Detalle: {detail}"
        )
    try:
        audio_result = json.loads(audio_check.stdout.strip())
    except json.JSONDecodeError:
        audio_result = {"output": audio_check.stdout.strip()}
    print(f"Prueba PortAudio correcta: {json.dumps(audio_result, ensure_ascii=False)}")

print(f"Sidecar creado con Vosk y PortAudio verificados: {dst}")
