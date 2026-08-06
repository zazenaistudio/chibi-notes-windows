CHIBI NOTES — MODELOS DE DICTADO VOSK

Los modelos no se incluyen en el ZIP para mantener un tamaño razonable.
Se descargan automáticamente durante scripts\SETUP_WINDOWS.cmd.

Modelos esperados:
- vosk-model-small-es-0.42
- vosk-model-small-en-us-0.15

Para reparar un modelo dañado o incompleto:
  scripts\DOWNLOAD_VOSK_MODEL.cmd -Language es -Force

La aplicación valida estos archivos antes de iniciar el dictado:
- am\final.mdl
- conf\mfcc.conf
- graph\HCLr.fst o graph\HCLG.fst
