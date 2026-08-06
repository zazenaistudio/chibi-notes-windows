use serde_json::Value;
use std::{
  collections::HashMap,
  io::{BufRead, BufReader, Write},
  net::TcpStream,
  path::PathBuf,
  sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}},
  thread,
  time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
  menu::{Menu, MenuItem},
  path::BaseDirectory,
  tray::TrayIconBuilder,
  AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_notification::NotificationExt;

enum BackendProcess {
  Sidecar(tauri_plugin_shell::process::CommandChild),
  Native(std::process::Child),
}

impl BackendProcess {
  fn pid(&self) -> u32 {
    match self {
      Self::Sidecar(child) => child.pid(),
      Self::Native(child) => child.id(),
    }
  }

  fn terminate(self) {
    // PyInstaller --onefile can create a parent process and a second extracted
    // process. Killing only CommandChild is not always enough on Windows, so
    // terminate the complete process tree first and keep the normal kill API as
    // a fallback for development and non-Windows platforms.
    #[cfg(target_os = "windows")]
    {
      let pid = self.pid().to_string();
      let killed_tree = std::process::Command::new("taskkill.exe")
        .arg("/PID")
        .arg(&pid)
        .arg("/T")
        .arg("/F")
        .status()
        .map(|status| status.success())
        .unwrap_or(false);
      if killed_tree {
        return;
      }
    }

    match self {
      Self::Sidecar(child) => {
        let _ = child.kill();
      }
      Self::Native(mut child) => {
        let _ = child.kill();
        let _ = child.wait();
      }
    }
  }
}

struct BackendChild(Mutex<Option<BackendProcess>>);
struct ShowcaseSnapshots(Mutex<HashMap<String, Value>>);
struct ReminderTasks(Mutex<HashMap<String, Arc<AtomicBool>>>);

fn native_filesystem_path(path: PathBuf) -> PathBuf {
  #[cfg(target_os = "windows")]
  {
    let value = path.to_string_lossy();
    if let Some(rest) = value.strip_prefix(r"\\?\UNC\") {
      return PathBuf::from(format!("\\\\{rest}"));
    }
    if let Some(rest) = value.strip_prefix(r"\\?\") {
      return PathBuf::from(rest);
    }
  }
  path
}

fn stop_backend(app: &AppHandle) {
  let process = app
    .state::<BackendChild>()
    .0
    .lock()
    .ok()
    .and_then(|mut backend| backend.take());

  if let Some(process) = process {
    process.terminate();
  }
}

#[tauri::command]
fn backend_request(payload: Value) -> Result<Value, String> {
  let mut stream = TcpStream::connect_timeout(
    &"127.0.0.1:8766".parse().unwrap(),
    Duration::from_secs(3),
  )
  .map_err(|e| format!("Backend no disponible: {e}"))?;
  stream.set_read_timeout(Some(Duration::from_secs(330))).ok();
  writeln!(stream, "{}", payload).map_err(|e| e.to_string())?;
  let mut line = String::new();
  BufReader::new(stream)
    .read_line(&mut line)
    .map_err(|e| e.to_string())?;
  let value: Value = serde_json::from_str(&line).map_err(|e| e.to_string())?;
  if let Some(error) = value.get("error") {
    return Err(
      error
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("Error del backend")
        .to_string(),
    );
  }
  Ok(value.get("result").cloned().unwrap_or(Value::Null))
}


#[tauri::command]
async fn window_action(window: WebviewWindow, action: String) -> Result<(), String> {
  match action.as_str() {
    "minimize" => window.minimize().map_err(|error| error.to_string()),
    "toggle-maximize" => {
      let maximized = window.is_maximized().map_err(|error| error.to_string())?;
      if maximized {
        window.unmaximize().map_err(|error| error.to_string())
      } else {
        window.maximize().map_err(|error| error.to_string())
      }
    }
    "close" => {
      if window.label() == "main" {
        window.hide().map_err(|error| error.to_string())
      } else {
        window.close().map_err(|error| error.to_string())
      }
    }
    "drag" => window.start_dragging().map_err(|error| error.to_string()),
    _ => Err(format!("Acción de ventana no reconocida: {action}")),
  }
}



#[tauri::command]
fn open_note_resource(kind: String, value: String) -> Result<(), String> {
  let target = value.trim();
  if target.is_empty() {
    return Err("El recurso no contiene una ubicación válida.".to_string());
  }
  if kind != "file" && kind != "web" {
    return Err("Tipo de recurso no reconocido.".to_string());
  }
  if kind == "web" && !(target.starts_with("https://") || target.starts_with("http://")) {
    return Err("El enlace debe comenzar por http:// o https://.".to_string());
  }
  if kind == "file" && !std::path::Path::new(target).exists() {
    return Err("El archivo indicado ya no existe o no está disponible.".to_string());
  }

  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("rundll32.exe")
      .arg("url.dll,FileProtocolHandler")
      .arg(target)
      .spawn()
      .map_err(|error| format!("No se pudo abrir el recurso: {error}"))?;
    Ok(())
  }

  #[cfg(not(target_os = "windows"))]
  {
    let _ = kind;
    Err("Esta acción está disponible en la versión de Windows.".to_string())
  }
}


#[tauri::command]
fn schedule_reminder(
  app: AppHandle,
  note_id: String,
  reminder_at: String,
  title: String,
  body: String,
  timestamp_ms: i64,
) -> Result<(), String> {
  let state = app.state::<ReminderTasks>();
  let token = Arc::new(AtomicBool::new(false));
  {
    let mut tasks = state.0.lock().map_err(|_| "No se pudo programar el recordatorio.".to_string())?;
    if let Some(previous) = tasks.insert(note_id.clone(), token.clone()) {
      previous.store(true, Ordering::SeqCst);
    }
  }
  let app_handle = app.clone();
  thread::spawn(move || {
    loop {
      if token.load(Ordering::SeqCst) { return; }
      let now_ms = SystemTime::now().duration_since(UNIX_EPOCH).map(|value| value.as_millis() as i64).unwrap_or(timestamp_ms);
      let remaining = timestamp_ms.saturating_sub(now_ms);
      if remaining <= 0 { break; }
      thread::sleep(Duration::from_millis(remaining.min(15_000) as u64));
    }
    if token.load(Ordering::SeqCst) { return; }
    let result = app_handle.notification().builder().title(&title).body(&body).show();
    let _ = app_handle.emit("native-reminder-fired", serde_json::json!({
      "noteId": note_id,
      "reminderAt": reminder_at,
      "title": title,
      "ok": result.is_ok(),
      "error": result.err().map(|error| error.to_string())
    }));
  });
  Ok(())
}

#[tauri::command]
fn cancel_reminder(app: AppHandle, note_id: String) -> Result<(), String> {
  if let Some(token) = app.state::<ReminderTasks>().0.lock().map_err(|_| "No se pudo cancelar el recordatorio.".to_string())?.remove(&note_id) {
    token.store(true, Ordering::SeqCst);
  }
  Ok(())
}

#[tauri::command]
async fn create_showcase_window(
  app: AppHandle,
  note_id: String,
  widget_id: String,
  note_snapshot: Value,
  widget_snapshot: Value,
  width: Option<f64>,
  height: Option<f64>,
) -> Result<(), String> {
  let snapshot = serde_json::json!({ "note": note_snapshot, "widget": widget_snapshot });
  let snapshot_json = serde_json::to_string(&snapshot).map_err(|error| error.to_string())?;
  let init_script = format!("window.__CHIBI_SHOWCASE_SNAPSHOT__ = {};", snapshot_json.replace("</", "<\\/"));
  app.state::<ShowcaseSnapshots>()
    .0
    .lock()
    .map_err(|_| "No se pudo preparar la nota visual.".to_string())?
    .insert(widget_id.clone(), snapshot);
  let safe_widget_id = widget_id.replace(|c: char| !c.is_ascii_alphanumeric(), "-");
  let label = format!("showcase-{safe_widget_id}");
  if let Some(window) = app.get_webview_window(&label) {
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    return Ok(());
  }
  let width = width.unwrap_or(432.0).clamp(324.0, 540.0);
  let _requested_height = height;
  let height = width * 16.0 / 9.0;
  let url = format!(
    "index.html?view=showcase&note_id={}&widget_id={}",
    urlencoding::encode(&note_id),
    urlencoding::encode(&widget_id)
  );
  let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
    .initialization_script(init_script)
    .title("Chibi Notes — Nota visual")
    .inner_size(width, height)
    .min_inner_size(324.0, 576.0)
    .max_inner_size(540.0, 960.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(false)
    .resizable(true)
    .skip_taskbar(false)
    .visible(true)
    .shadow(false)
    .build()
    .map_err(|error| error.to_string())?;
  window.show().map_err(|error| error.to_string())?;
  window.set_focus().map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
fn get_showcase_snapshot(app: AppHandle, widget_id: String) -> Result<Value, String> {
  app.state::<ShowcaseSnapshots>()
    .0
    .lock()
    .map_err(|_| "No se pudo leer la nota visual.".to_string())?
    .get(&widget_id)
    .cloned()
    .ok_or_else(|| "La información de esta nota visual ya no está disponible.".to_string())
}

#[tauri::command]
fn create_note_window(
  app: AppHandle,
  note_id: String,
  width: Option<f64>,
  height: Option<f64>,
  min_width: Option<f64>,
  min_height: Option<f64>,
) -> Result<(), String> {
  let label = format!(
    "note-{}",
    note_id.replace(|c: char| !c.is_ascii_alphanumeric(), "-")
  );
  if let Some(window) = app.get_webview_window(&label) {
    let width = width.unwrap_or(430.0).clamp(300.0, 1200.0);
    let height = height.unwrap_or(520.0).clamp(300.0, 1200.0);
    let min_width = min_width.unwrap_or(300.0).clamp(240.0, width);
    let min_height = min_height.unwrap_or(300.0).clamp(240.0, height);
    window
      .set_min_size(Some(tauri::LogicalSize::new(min_width, min_height)))
      .map_err(|e| e.to_string())?;
    window
      .set_size(tauri::LogicalSize::new(width, height))
      .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    return Ok(());
  }
  let url = format!(
    "index.html?view=widget&note_id={}",
    urlencoding::encode(&note_id)
  );
  let width = width.unwrap_or(430.0).clamp(300.0, 1200.0);
  let height = height.unwrap_or(520.0).clamp(300.0, 1200.0);
  let min_width = min_width.unwrap_or(300.0).clamp(240.0, width);
  let min_height = min_height.unwrap_or(300.0).clamp(240.0, height);
  let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
    .title("Chibi Note")
    .inner_size(width, height)
    .min_inner_size(min_width, min_height)
    .decorations(false)
    .transparent(false)
    .always_on_top(true)
    .resizable(true)
    .skip_taskbar(true)
    .visible(true)
    .shadow(true)
    .build()
    .map_err(|e| e.to_string())?;
  window.show().map_err(|e| e.to_string())?;
  window.set_focus().map_err(|e| e.to_string())?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(BackendChild(Mutex::new(None)))
    .manage(ShowcaseSnapshots(Mutex::new(HashMap::new())))
    .manage(ReminderTasks(Mutex::new(HashMap::new())))
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(|app| {
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None,
      ))?;
      let data = app.path().app_data_dir()?;
      std::fs::create_dir_all(&data)?;
      let resource_models = [
        "models/vosk-model-small-es-0.42",
        "../backend/models/vosk-model-small-es-0.42",
      ]
      .into_iter()
      .filter_map(|relative| app.path().resolve(relative, BaseDirectory::Resource).ok())
      .map(native_filesystem_path)
      .collect::<Vec<_>>();
      let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap_or(std::path::Path::new(".")).to_path_buf();
      let project_model = native_filesystem_path(
        project_root.join("backend").join("models").join("vosk-model-small-es-0.42")
      );
      let selected_model = resource_models.iter().find(|path| path.exists()).cloned()
        .or_else(|| project_model.exists().then(|| project_model.clone()));

      let mut backend_started = false;
      #[cfg(debug_assertions)]
      {
        let python = project_root.join(".venv").join("Scripts").join("python.exe");
        let backend_main = project_root.join("backend").join("main.py");
        if python.exists() && backend_main.exists() {
          let mut command = std::process::Command::new(&python);
          command.arg(&backend_main)
            .current_dir(&project_root)
            .env("CHIBI_NOTES_DATA_DIR", data.as_os_str())
            .env("CHIBI_NOTES_BACKEND_PORT", "8766");
          if let Some(model) = selected_model.as_ref() {
            command.env("CHIBI_NOTES_VOSK_MODEL", model.as_os_str());
          }
          match command.spawn() {
            Ok(child) => {
              *app.state::<BackendChild>().0.lock().unwrap() = Some(BackendProcess::Native(child));
              backend_started = true;
            }
            Err(error) => eprintln!("No se pudo iniciar el backend Python del entorno virtual: {error}"),
          }
        }
      }

      if !backend_started {
        match app.shell().sidecar("chibi-notes-backend") {
          Ok(command) => {
            let mut command = command.env("CHIBI_NOTES_DATA_DIR", data.as_os_str())
              .env("CHIBI_NOTES_BACKEND_PORT", "8766");
            if let Some(model) = selected_model.as_ref() {
              command = command.env("CHIBI_NOTES_VOSK_MODEL", model.as_os_str());
            }
            match command.spawn() {
              Ok((_receiver, child)) => {
                *app.state::<BackendChild>().0.lock().unwrap() = Some(BackendProcess::Sidecar(child));
              }
              Err(error) => eprintln!("No se pudo iniciar backend: {error}"),
            }
          },
          Err(error) => eprintln!("Sidecar no configurado: {error}"),
        }
      }

      let show = MenuItem::with_id(app, "show", "Mostrar Chibi Notes", true, None::<&str>)?;
      let new_note = MenuItem::with_id(app, "new", "Nueva nota", true, None::<&str>)?;
      let hide = MenuItem::with_id(app, "hide", "Ocultar panel", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &new_note, &hide, &quit])?;
      let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "new" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
            let _ = app.emit("create-note-requested", ());
          }
          "hide" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.hide();
            }
          }
          "quit" => {
            stop_backend(app);
            app.exit(0);
          }
          _ => {}
        });
      if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
      }
      tray.build(app)?;
      Ok(())
    })
    .on_window_event(|window, event| {
      if window.label() == "main" {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .invoke_handler(tauri::generate_handler![backend_request, open_note_resource, schedule_reminder, cancel_reminder, create_showcase_window, get_showcase_snapshot, create_note_window, window_action])
    .build(tauri::generate_context!())
    .expect("error al preparar Chibi Notes")
    .run(|app, event| {
      if matches!(
        event,
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
      ) {
        stop_backend(app);
      }
    });
}
