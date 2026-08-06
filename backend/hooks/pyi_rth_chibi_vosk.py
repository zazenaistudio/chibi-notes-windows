from pathlib import Path
import os, shutil, sys
root = Path(getattr(sys, '_MEIPASS', Path(sys.executable).resolve().parent))
vosk_dir = root / 'vosk'
vosk_dir.mkdir(parents=True, exist_ok=True)
for candidate in root.rglob('libvosk.dll'):
    target = vosk_dir / 'libvosk.dll'
    if candidate != target and not target.exists():
        try: shutil.copy2(candidate, target)
        except OSError: pass
os.environ['PATH'] = str(vosk_dir) + os.pathsep + os.environ.get('PATH', '')
