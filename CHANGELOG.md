# Historial de cambios

Todos los cambios importantes de Chibi Notes se documentarán en este archivo.

## [0.4.26] — 2026-08-05

### Añadido

- Instalador NSIS para Windows x64 con icono oficial de Chibi Notes.
- Dictado local en español e inglés mediante Vosk.
- Ventanas visuales 9:16 independientes con fondos, mascotas y ajustes persistentes.
- Importación de fondos y mascotas personalizadas desde el propio widget.
- Gestores de archivos locales y páginas web vinculados a cada nota.
- Recordatorios nativos, bloqueo, exportación TXT/PDF/Markdown/JSON y texto a voz.
- Biblioteca de 662 mascotas, 422 iconos kawaii, 62 fondos del editor y 74 fondos verticales.
- Sincronización de configuración entre dashboard y ventanas secundarias.
- Workflow de GitHub Actions para construir el instalador de Windows.

### Corregido

- Persistencia del aspecto y de los fondos personalizados de los widgets.
- Actualización inmediata de los contadores de archivos y webs.
- Carga de PortAudio dentro del sidecar creado con PyInstaller.
- Carga de modelos Vosk desde rutas de recursos estables en Windows.
- Cierre del backend antes de actualizar o desinstalar la aplicación.
- Compatibilidad de los scripts con Windows PowerShell 5.1 y rutas Unicode.
- Errores de tipado que impedían la compilación del frontend.

### Seguridad y privacidad

- El reconocimiento de voz se procesa localmente.
- Los datos de notas y preferencias se almacenan en SQLite en el equipo del usuario.
