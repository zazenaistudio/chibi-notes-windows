from pathlib import Path

from PyInstaller.utils.hooks import get_module_file_attribute, logger

binaries = []
datas = []
hiddenimports = ["_sounddevice_data", "_cffi_backend"]

module_dir = Path(get_module_file_attribute("sounddevice")).resolve().parent
data_dir = module_dir / "_sounddevice_data" / "portaudio-binaries"
dest_dir = str(Path("_sounddevice_data") / "portaudio-binaries")

if data_dir.is_dir():
    for library in sorted(data_dir.glob("libportaudio*.*")):
        binaries.append((str(library), dest_dir))
    readme = data_dir / "README.md"
    if readme.is_file():
        datas.append((str(readme), dest_dir))

if not binaries:
    logger.warning("PortAudio binaries were not found for sounddevice")
