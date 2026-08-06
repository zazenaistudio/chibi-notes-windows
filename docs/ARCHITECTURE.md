# Arquitectura de Chibi Notes

```text
React + TypeScript + Framer Motion + Zustand
                    │
                Tauri 2 / Rust
       ┌────────────┼───────────────┐
       │            │               │
 Ventanas 9:16   Bandeja       Atajos y avisos
       │
  JSON-RPC local
       │
 Python sidecar
 ┌─────┴───────────────┐
 SQLite / WAL        Vosk + audio
```

## Frontend

- `ManagerApp`: dashboard, biblioteca, grupos y editor principal.
- `NoteWidget`: nota editable reutilizada por el dashboard.
- `WidgetApp` y `ShowcaseWidgetApp`: ventanas secundarias y notas visuales 9:16.
- `CustomizationPanel`: fondos, mascotas, colores, iconos, tipografías, marcos, sonidos y efectos.
- `useAppStore`: notas, grupos, etiquetas, recursos y preferencias generales.
- `useShowcaseStore`: configuraciones independientes de las ventanas visuales.
- `CrossWindowSyncRuntime`: sincronización reactiva entre ventanas Tauri.

## Capa nativa

Tauri gestiona las ventanas, la bandeja, los atajos, los recordatorios, la apertura de rutas y enlaces, los diálogos del sistema, el inicio automático y la ejecución del sidecar.

## Backend local

El sidecar Python recibe mensajes JSON y gestiona la persistencia SQLite, las operaciones de datos y el dictado. SQLite utiliza claves foráneas y modo WAL. Los modelos de voz se descargan durante la preparación y se cargan desde una ruta estable de recursos.

## Recursos

- 62 fondos temáticos del editor.
- 74 fondos verticales 9:16.
- 662 mascotas en 11 colecciones.
- 422 iconos kawaii en 22 temáticas.
- 20 ilustraciones funcionales y 23 sonidos.

Los activos importados por el usuario se guardan en el directorio de datos de la aplicación y sus metadatos se registran en SQLite.

## Texto, voz y exportación

El cuerpo de la nota se conserva como HTML local limitado a las operaciones del editor. El pegado se normaliza para evitar estructuras externas inesperadas. El texto a voz utiliza `SpeechSynthesis` de WebView2 y las voces instaladas en Windows. El dictado se realiza con Vosk en español o inglés.

Los exportadores generan TXT, Markdown, JSON y PDF sin depender de servicios web.

## Ventanas visuales

Cada instancia obtiene una etiqueta Tauri única y una configuración visual independiente. El dashboard aporta una instantánea de la nota y las ventanas secundarias conservan sus propios ajustes de fondo, mascota, posición, tamaño, vidrio, texto y bordes. La sincronización entre ventanas evita sobrescribir estados recientes.
