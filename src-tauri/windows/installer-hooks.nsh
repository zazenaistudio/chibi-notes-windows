; Chibi Notes — cierre seguro antes de actualizar o desinstalar.
; Windows no permite reemplazar un ejecutable mientras sigue en uso. La ventana
; principal se oculta en la bandeja y el backend de PyInstaller puede mantener
; un segundo proceso activo, así que cerramos explícitamente ambos árboles.

!macro CHIBI_NOTES_STOP_PROCESS IMAGE_NAME
  DetailPrint "Cerrando ${IMAGE_NAME}..."
  nsExec::ExecToLog 'taskkill.exe /F /T /IM "${IMAGE_NAME}"'
  Pop $0
!macroend

!macro CHIBI_NOTES_STOP_RUNNING_APP
  !insertmacro CHIBI_NOTES_STOP_PROCESS "chibi-notes.exe"
  !insertmacro CHIBI_NOTES_STOP_PROCESS "Chibi Notes.exe"
  !insertmacro CHIBI_NOTES_STOP_PROCESS "chibi-notes-backend.exe"
  !insertmacro CHIBI_NOTES_STOP_PROCESS "chibi-notes-backend-x86_64-pc-windows-msvc.exe"
  ; taskkill espera a que termine el árbol, pero damos tiempo a Windows Defender,
  ; al indexador y al cargador de PyInstaller para liberar los manejadores.
  Sleep 1500
!macroend

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Preparando la actualización de Chibi Notes..."
  !insertmacro CHIBI_NOTES_STOP_RUNNING_APP
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Cerrando Chibi Notes antes de desinstalar..."
  !insertmacro CHIBI_NOTES_STOP_RUNNING_APP
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; FIX8 moved bundled resources from _up_ to stable top-level folders.
  ; Remove files left by older installers so Vosk cannot select a stale model
  ; and the duplicated visual assets do not keep occupying disk space.
  DetailPrint "Limpiando recursos antiguos de Chibi Notes..."
  RMDir /r "$INSTDIR\_up_"
!macroend
