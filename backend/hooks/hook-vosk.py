from PyInstaller.utils.hooks import collect_all, collect_dynamic_libs, collect_data_files

datas, binaries, hiddenimports = collect_all('vosk')
datas += collect_data_files('vosk', include_py_files=True)
binaries += collect_dynamic_libs('vosk', destdir='vosk')
