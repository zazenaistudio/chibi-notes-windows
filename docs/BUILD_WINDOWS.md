# Compilar Chibi Notes en Windows

## Requisitos

- Windows 10 u 11 x64.
- Node.js LTS y npm.
- Rust estable con toolchain MSVC.
- Python 3.10 a 3.13.
- Microsoft C++ Build Tools y Windows SDK.
- Microsoft Edge WebView2 Runtime.

## Comprobación del entorno

```powershell
.\scripts\CHECK_REQUIREMENTS.cmd
```

## Preparación automática

```powershell
.\scripts\SETUP_WINDOWS.cmd
```

El script instala las dependencias, crea `.venv`, descarga y valida los modelos ligeros de Vosk y genera el sidecar de Python.

## Desarrollo

```powershell
npm run tauri:dev
```

Vista web sin funciones nativas:

```powershell
npm install
npm run dev
```

## Instalador NSIS

```powershell
.\CREAR_EXE_WINDOWS.cmd
```

El resultado se copia en:

```text
release\Chibi-Notes-v0.4.26-Setup-x64.exe
release\Chibi-Notes-v0.4.26-SHA256.txt
```

Los artefactos originales de Tauri también quedan en `src-tauri\target\release\bundle\nsis\`.

## GitHub Actions

El workflow `.github/workflows/build-windows-exe.yml` puede ejecutarse manualmente desde la pestaña **Actions** o al publicar una etiqueta con formato `v*`. El instalador se entrega como artefacto descargable del workflow.

## Problemas habituales

- Cierra Chibi Notes y `chibi-notes-backend.exe` antes de instalar una actualización. Puedes ejecutar `scripts\CLOSE_CHIBI_NOTES.cmd`.
- No subas `.venv`, `node_modules`, `src-tauri/target`, modelos Vosk descargados ni instaladores generados al repositorio.
- Los scripts CMD llaman a PowerShell con una excepción temporal para evitar bloqueos por políticas de ejecución.
