<div align="center">
  <img src="docs/assets/branding/chibi-notes-icon.png" alt="Icono de Chibi Notes" width="180">

# Chibi Notes

### Tu gestor de notas kawaii para Windows

Organiza ideas, crea widgets visuales, programa recordatorios y personaliza cada nota con fondos, mascotas, marcos, iconos y colores.

[![Version](https://img.shields.io/badge/version-0.4.26-ff7f9f?style=for-the-badge)](../../releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-66c7f2?style=for-the-badge&logo=windows11&logoColor=white)](#requisitos)
[![Tauri](https://img.shields.io/badge/Tauri-2-f5c451?style=for-the-badge&logo=tauri&logoColor=2f2f2f)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-8bdcf5?style=for-the-badge&logo=react&logoColor=24303a)](https://react.dev/)
[![License](https://img.shields.io/badge/licencia-Zazen%20AI%20Studio-c8a4ff?style=for-the-badge)](LICENSE)

[Descargar la última versión](../../releases/latest) · [Ver características](#características-principales) · [Compilar en Windows](#desarrollo-y-compilación)
</div>

![Presentación general de Chibi Notes](docs/assets/promo/promo-01-overview.png)

## ¿Qué es Chibi Notes?

**Chibi Notes** es una aplicación de escritorio para Windows que combina un gestor de notas completo con una experiencia visual kawaii. Permite trabajar desde un dashboard central, abrir notas como ventanas independientes en formato 9:16, organizar proyectos en grupos y adaptar cada espacio con una gran biblioteca de recursos visuales.

El proyecto está desarrollado por **Zazen AI Studio** con Tauri 2, React, TypeScript, Rust, Python, SQLite y Vosk.

## Características principales

| | Función | Descripción |
|---|---|---|
| 🗂️ | **Notas y grupos** | Crea, edita, fija, archiva, mueve y organiza notas mediante grupos, categorías, etiquetas e iconos. |
| 🪟 | **Ventanas visuales 9:16** | Abre notas como widgets independientes para el escritorio, con configuraciones visuales propias. |
| 🎨 | **Personalización avanzada** | Cambia fondos, mascotas, marcos, bordes, tipografías, colores, efectos, sonidos y dimensiones. |
| 🎙️ | **Dictado local** | Convierte voz en texto en español o inglés mediante Vosk, sin enviar el audio a servicios externos. |
| 🔔 | **Recordatorios** | Programa avisos nativos de Windows y conserva el control desde la propia nota. |
| 📎 | **Archivos y webs** | Vincula rutas locales y páginas web a cada nota, con apertura, edición, copia y eliminación. |
| ✏️ | **Herramientas creativas** | Escribe texto enriquecido, crea checklists, dibuja bocetos y adjunta imágenes. |
| 🔍 | **Búsqueda rápida** | Localiza notas por título y encuentra coincidencias dentro del contenido actual. |
| 🔒 | **Privacidad y bloqueo** | Mantén los datos en local, bloquea notas y usa funciones de voz sin depender de la nube. |
| 📤 | **Exportación** | Exporta notas en TXT, PDF, Markdown y JSON. |

## Ventanas visuales y personalización

![Ventanas visuales y personalización](docs/assets/promo/promo-02-widgets-personalization.png)

Cada ventana visual mantiene su propio fondo, mascota, escala, posición, transparencia, vidrio, bordes y estilo. Los fondos personalizados se recortan y optimizan automáticamente en relación 9:16, y la interfaz calcula una paleta compatible con la imagen seleccionada.

## Herramientas para crear más

![Herramientas creativas](docs/assets/promo/promo-03-creative-tools.png)

El centro de herramientas reúne escritura, checklist, dibujo, dictado local, recordatorios, adjuntos, enlaces, búsqueda, modo estudio, exportación y opciones de protección en una interfaz guiada.

## Organiza, comparte y protege

![Organización, exportación y protección](docs/assets/promo/promo-04-organize-share-protect.png)

El dashboard muestra métricas por grupo, notas fijadas, tareas pendientes y accesos rápidos. Las notas pueden conectarse con archivos y páginas web, exportarse a formatos comunes y mantenerse protegidas dentro de la aplicación.

## Biblioteca visual incluida

- **62 fondos temáticos** para el editor principal.
- **74 fondos verticales 9:16** distribuidos en 11 estilos visuales.
- **662 mascotas** organizadas en 11 colecciones.
- **422 iconos kawaii** distribuidos en 22 temáticas.
- **20 ilustraciones funcionales** para el centro de herramientas.
- **12 marcos y bordes**, incluidos estilos animados.
- **23 efectos de sonido** configurables.
- **49 opciones tipográficas** y 8 paletas globales de interfaz.

## Privacidad y funcionamiento local

Chibi Notes guarda las notas y preferencias mediante SQLite en el equipo del usuario. El dictado utiliza modelos locales de Vosk y el texto a voz emplea las voces instaladas en Windows. La aplicación no necesita una cuenta para crear y organizar notas.

## Instalación para usuarios

1. Abre la sección [Releases](../../releases/latest).
2. Descarga `Chibi-Notes-v0.4.26-Setup-x64.exe`.
3. Comprueba opcionalmente el archivo SHA-256 incluido en la misma versión.
4. Cierra una instalación anterior de Chibi Notes antes de actualizar.
5. Ejecuta el instalador y sigue el asistente.

> Windows SmartScreen puede mostrar una advertencia mientras el ejecutable no disponga de un certificado comercial de firma de código. Descarga siempre el instalador desde el repositorio oficial de Zazen AI Studio.

## Requisitos

### Para usar la aplicación

- Windows 10 u 11 de 64 bits.
- Microsoft Edge WebView2 Runtime.
- Micrófono, únicamente para utilizar el dictado.

### Para desarrollar o compilar

- Node.js LTS y npm.
- Rust estable con toolchain MSVC.
- Python 3.10, 3.11, 3.12 o 3.13.
- Microsoft C++ Build Tools y Windows SDK.
- Microsoft Edge WebView2 Runtime.

## Desarrollo y compilación

### Preparación automática

Desde PowerShell, en la raíz del proyecto:

```powershell
.\scripts\SETUP_WINDOWS.cmd
```

El script instala las dependencias del proyecto, crea el entorno virtual de Python, descarga los modelos ligeros de Vosk, genera el sidecar y prepara Tauri.

### Ejecutar en desarrollo

```powershell
npm run tauri:dev
```

También puedes abrir la versión web para revisar únicamente la interfaz:

```powershell
npm install
npm run dev
```

### Crear el instalador `.exe`

```powershell
.\CREAR_EXE_WINDOWS.cmd
```

El instalador y su suma SHA-256 se copiarán en la carpeta `release/`.

Consulta [docs/BUILD_WINDOWS.md](docs/BUILD_WINDOWS.md) para la guía completa.

## Estructura del proyecto

```text
Chibi-Notes/
├── .github/                 # Workflow e incidencias de GitHub
├── backend/                 # Sidecar Python, SQLite, Vosk y PyInstaller
├── docs/                    # Arquitectura, compilación y recursos visuales
├── public/assets/           # Fondos, mascotas, iconos, sonidos y branding
├── scripts/                 # Preparación, ejecución y compilación para Windows
├── src/                     # Aplicación React + TypeScript
├── src-tauri/               # Aplicación nativa Tauri + Rust
├── LICENSE
├── README.md
└── package.json
```

## Tecnologías

- **Interfaz:** React 19, TypeScript, Vite, Framer Motion y Zustand.
- **Escritorio:** Tauri 2 y Rust.
- **Persistencia:** SQLite con WAL.
- **Voz:** Vosk y PortAudio mediante un sidecar de Python.
- **Distribución:** instalador NSIS para Windows x64.

La arquitectura ampliada está documentada en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estado del proyecto

La versión pública actual es **0.4.26**. Los cambios relevantes se resumen en [CHANGELOG.md](CHANGELOG.md).

Los errores y sugerencias pueden comunicarse mediante [GitHub Issues](../../issues). Las contribuciones de código, traducciones, redistribuciones y versiones derivadas requieren autorización previa de Zazen AI Studio; consulta [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia y propiedad intelectual

Chibi Notes es software de código visible distribuido bajo la **Zazen AI Studio Personal Use License 1.0**. No es una licencia de código abierto.

Se permite descargar, instalar y utilizar la aplicación para uso personal, educativo o flujos profesionales internos. No se permite vender, redistribuir, republicar, crear versiones derivadas ni reutilizar sus mascotas, ilustraciones, iconos, fondos, sonidos o identidad visual sin autorización escrita.

Consulta el texto completo en [LICENSE](LICENSE).

<div align="center">
  <img src="docs/assets/branding/chibi-notes-icon.png" alt="Chibi" width="90">

  **Copyright © 2026 Samuel Acosta Fernández — Zazen AI Studio**  
  Todos los derechos reservados.
</div>
