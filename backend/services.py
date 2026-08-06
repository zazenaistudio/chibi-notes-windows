from __future__ import annotations
import base64, json, mimetypes, os, queue, shutil, sys, threading, time, uuid, wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from db import Database

def now(): return datetime.now(timezone.utc).isoformat()
def snake_to_note(r:dict[str,Any]):
 metadata=json.loads(r.get('metadata_json') or '{}')
 return {
  'id':r['id'],'title':r.get('title',''),'body':r.get('body',''),'kind':r.get('kind','text'),
  'pinned':bool(r.get('pinned')),'alwaysOnTop':bool(r.get('always_on_top')),
  'archived':bool(r.get('archived')),'assignedMascotId':r.get('assigned_mascot_id',''),
  'customization':json.loads(r.get('customization_json') or '{}'),
  'locked':bool(metadata.get('locked',False)),'protected':bool(metadata.get('protected',False)),'systemKey':metadata.get('systemKey'),'myDay':bool(metadata.get('myDay',False)),'category':metadata.get('category','General'),'tags':metadata.get('tags',[]),'reminderAt':metadata.get('reminderAt',''),'attachments':metadata.get('attachments',[]),'resources':metadata.get('resources',[]),'drawing':metadata.get('drawing',''),'icon':metadata.get('icon','📝'),'groupId':metadata.get('groupId',''),
  'createdAt':r.get('created_at',now()),'updatedAt':r.get('updated_at',now())
 }
def file_data_url(path:Path)->str:
 mime=mimetypes.guess_type(path.name)[0] or 'image/png'
 return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"

def windows_native_path(path:Path)->str:
 value=str(path)
 if os.name=='nt':
  unc_prefix='\\\\?\\UNC\\'
  device_prefix='\\\\?\\'
  if value.startswith(unc_prefix):return '\\\\'+value[len(unc_prefix):]
  if value.startswith(device_prefix):return value[len(device_prefix):]
 return value

def voice_error_message(error:Exception)->str:
 message=str(error); lowered=message.lower()
 if 'libportaudio' in lowered or 'portaudio' in lowered or '_sounddevice_data' in lowered:
  return 'No se pudo cargar el motor de audio PortAudio incluido con el reconocimiento de voz. Reconstruye el ejecutable con CREAR_EXE_WINDOWS.cmd usando la revisión FIX6 o posterior. Detalle: '+message
 if '_mei' in lowered and ('vosk' in lowered or 'winerror 2' in lowered):
  return 'El backend de voz no incluye correctamente las librerías nativas de Vosk. Reinstala Chibi Notes con el instalador FIX8 o posterior.'
 if 'failed to create a model' in lowered:
  return 'Vosk encontró los archivos del modelo, pero Windows no permitió abrirlos desde la ruta instalada. Reinstala Chibi Notes con el instalador FIX8 o posterior. Detalle: '+message
 if 'device' in lowered or 'microphone' in lowered or 'micrófono' in lowered:
  return 'No se pudo acceder al micrófono de Windows: '+message
 return message


class Services:
 def __init__(self,data_dir:Path):
  self.data_dir=data_dir; self.db=Database(data_dir/'chibi_notes.sqlite3'); (data_dir/'user_assets').mkdir(exist_ok=True)
  self._vosk_models_dir=data_dir/'models'; self._vosk_models_dir.mkdir(parents=True,exist_ok=True)
  self._voice_sessions:dict[str,dict[str,Any]]={}; self._voice_lock=threading.Lock(); self._vosk_models:dict[str,Any]={}; self._vosk_install_lock=threading.Lock()
 def dispatch(self,method:str,p:dict[str,Any]):
  fn=getattr(self,'m_'+method.replace('.','_'),None)
  if not fn: raise ValueError(f'Método desconocido: {method}')
  return fn(p)
 def m_ping(self,p): return {'ok':True,'version':'0.4.26','time':now()}
 def m_initialize(self,p): return {'notes':self.m_notes_list({'includeArchived':True}),'groups':self.m_groups_list({}),'themes':self.m_themes_list({}),'assets':self.m_assets_list({})}
 def m_notes_list(self,p):
  rows=self.db.query('SELECT * FROM notes ORDER BY pinned DESC,updated_at DESC') if p.get('includeArchived') else self.db.query('SELECT * FROM notes WHERE archived=? ORDER BY pinned DESC,updated_at DESC',(1 if p.get('archived') else 0,));out=[]
  for r in rows:
   n=snake_to_note(r)
   n['items']=[{'id':i['id'],'text':i['text'],'done':bool(i['done'])} for i in self.db.query('SELECT * FROM checklist_items WHERE note_id=? ORDER BY position',(r['id'],))]
   out.append(n)
  return out
 def m_notes_upsert(self,p):
  n=p['note']
  metadata={'locked':bool(n.get('locked',False)),'protected':bool(n.get('protected',False)),'systemKey':n.get('systemKey'),'myDay':bool(n.get('myDay',False)),'category':n.get('category','General'),'tags':n.get('tags',[]),'reminderAt':n.get('reminderAt',''),'attachments':n.get('attachments',[]),'resources':n.get('resources',[]),'drawing':n.get('drawing',''),'icon':n.get('icon','📝'),'groupId':n.get('groupId','')}
  self.db.execute('''INSERT INTO notes(id,title,body,kind,pinned,always_on_top,archived,assigned_mascot_id,customization_json,metadata_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,kind=excluded.kind,pinned=excluded.pinned,always_on_top=excluded.always_on_top,archived=excluded.archived,assigned_mascot_id=excluded.assigned_mascot_id,customization_json=excluded.customization_json,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at''',(n['id'],n.get('title',''),n.get('body',''),n.get('kind','text'),int(n.get('pinned',0)),int(n.get('alwaysOnTop',1)),int(n.get('archived',0)),n.get('assignedMascotId',''),json.dumps(n.get('customization',{}),ensure_ascii=False),json.dumps(metadata,ensure_ascii=False),n.get('createdAt',now()),n.get('updatedAt',now())))
  self.db.execute('DELETE FROM checklist_items WHERE note_id=?',(n['id'],))
  for i,item in enumerate(n.get('items',[])): self.db.execute('INSERT INTO checklist_items(id,note_id,text,done,position) VALUES(?,?,?,?,?)',(item['id'],n['id'],item.get('text',''),int(item.get('done',0)),i))
  return {'ok':True}
 def m_notes_delete(self,p): self.db.execute('DELETE FROM notes WHERE id=?',(p['id'],)); return {'ok':True}
 def m_notes_search(self,p):
  q=f"%{p.get('query','')}%";return self.db.query('SELECT id,title,body,updated_at FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC LIMIT 100',(q,q))

 def m_groups_list(self,p): return self.db.query('SELECT id,name,icon,color,created_at AS createdAt,updated_at AS updatedAt FROM note_groups ORDER BY created_at ASC')
 def m_groups_upsert(self,p):
  g=p['group'];gid=g.get('id') or str(uuid.uuid4());self.db.execute('INSERT INTO note_groups(id,name,icon,color,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon=excluded.icon,color=excluded.color,updated_at=excluded.updated_at',(gid,g.get('name','Nuevo grupo'),g.get('icon','📁'),g.get('color','#9fdfff'),g.get('createdAt',now()),g.get('updatedAt',now())));return {'id':gid}
 def m_groups_delete(self,p): self.db.execute('DELETE FROM note_groups WHERE id=?',(p['id'],));return {'ok':True}
 def m_assets_list(self,p):
  out=[]
  for r in self.db.query('SELECT * FROM assets WHERE hidden=0 ORDER BY created_at DESC'):
   path=Path(r['path'])
   if not path.exists(): continue
   out.append({'id':r['id'],'kind':r['kind'],'name':r['name'],'src':file_data_url(path),'builtin':False,'packId':r.get('pack_id') or 'custom','packName':r.get('pack_id') or 'Personalizados','category':r.get('category') or 'Personalizados'})
  return out
 def m_assets_upsert_data(self,p):
  a=p['asset'];src=a.get('src','');aid=a['id'];kind=a['kind']
  old=self.db.one('SELECT path FROM assets WHERE id=?',(aid,))
  path=Path(old['path']) if old else None
  if src.startswith('data:'):
   header,data=src.split(',',1);mime=header.split(';')[0].split(':',1)[1];ext=mimetypes.guess_extension(mime) or '.png';path=self.data_dir/'user_assets'/f'{aid}{ext}';path.write_bytes(base64.b64decode(data))
  elif not path:
   raise ValueError('El activo personalizado no contiene una imagen válida')
  self.db.execute('''INSERT INTO assets(id,kind,name,path,pack_id,category,builtin,created_at) VALUES(?,?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,path=excluded.path,pack_id=excluded.pack_id,category=excluded.category''',(aid,kind,a.get('name','Activo'),str(path),a.get('packId','custom'),a.get('category','Personalizados'),now()))
  return {'ok':True,'id':aid}
 def m_assets_import(self,p):
  src=Path(p['path']); kind=p['kind']; aid=p.get('id') or str(uuid.uuid4()); ext=src.suffix.lower() or '.png'; dest=self.data_dir/'user_assets'/f'{aid}{ext}';shutil.copy2(src,dest)
  self.db.execute('INSERT INTO assets(id,kind,name,path,pack_id,category,builtin,created_at) VALUES(?,?,?,?,?,?,0,?)',(aid,kind,p.get('name',src.stem),str(dest),p.get('packId','custom'),p.get('category','Personalizados'),now()));return {'id':aid,'path':str(dest)}
 def m_assets_update(self,p): self.db.execute('UPDATE assets SET name=?,pack_id=?,category=? WHERE id=?',(p.get('name',''),p.get('packId','custom'),p.get('category','Personalizados'),p['id']));return {'ok':True}
 def m_assets_delete(self,p):
  r=self.db.one('SELECT path FROM assets WHERE id=? AND builtin=0',(p['id'],))
  if r:
   try: Path(r['path']).unlink(missing_ok=True)
   except OSError: pass
   self.db.execute('DELETE FROM assets WHERE id=?',(p['id'],))
  return {'ok':True}
 def m_themes_list(self,p):
  out=[]
  for r in self.db.query('SELECT * FROM themes ORDER BY updated_at DESC'):
   out.append({'id':r['id'],'name':r['name'],'description':r['description'],'createdAt':r['created_at'],'builtin':False,'customization':json.loads(r['customization_json'])})
  return out
 def m_themes_upsert(self,p):
  t=p['theme'];tid=t.get('id') or str(uuid.uuid4()); self.db.execute('INSERT INTO themes(id,name,description,customization_json,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,customization_json=excluded.customization_json,updated_at=excluded.updated_at',(tid,t['name'],t.get('description',''),json.dumps(t['customization'],ensure_ascii=False),t.get('createdAt',now()),now()));return {'id':tid}
 def m_themes_delete(self,p):self.db.execute('DELETE FROM themes WHERE id=?',(p['id'],));return {'ok':True}
 def m_sync_snapshot(self,p):
  notes=p.get('notes',[]);groups=p.get('groups',[]);themes=p.get('themes',[]);assets=p.get('assets',[])
  note_ids={n['id'] for n in notes};group_ids={g['id'] for g in groups};theme_ids={t['id'] for t in themes};asset_ids={a['id'] for a in assets}
  for row in self.db.query('SELECT id FROM notes'):
   if row['id'] not in note_ids:self.m_notes_delete({'id':row['id']})
  for row in self.db.query('SELECT id FROM note_groups'):
   if row['id'] not in group_ids:self.m_groups_delete({'id':row['id']})
  for row in self.db.query('SELECT id FROM themes'):
   if row['id'] not in theme_ids:self.m_themes_delete({'id':row['id']})
  for row in self.db.query('SELECT id FROM assets WHERE builtin=0'):
   if row['id'] not in asset_ids:self.m_assets_delete({'id':row['id']})
  for n in notes:self.m_notes_upsert({'note':n})
  for g in groups:self.m_groups_upsert({'group':g})
  for t in themes:self.m_themes_upsert({'theme':t})
  for a in assets:self.m_assets_upsert_data({'asset':a})
  return {'ok':True,'counts':{'notes':len(notes),'groups':len(groups),'themes':len(themes),'assets':len(assets)}}
 def m_settings_get(self,p): return self.db.json_get(p['key'],p.get('default'))
 def m_settings_set(self,p): self.db.json_set(p['key'],p.get('value'));return {'ok':True}
 def _vosk_model_candidates(self,p):
  requested=p.get('modelPath') or os.getenv('CHIBI_NOTES_VOSK_MODEL','')
  language=str(p.get('language') or 'es-ES').lower()
  model_name='vosk-model-small-en-us-0.15' if language.startswith('en') else 'vosk-model-small-es-0.42'
  candidates=[]
  if requested:
   requested_path=Path(requested)
   candidates.append(requested_path if requested_path.name==model_name else requested_path.parent/model_name)
  executable_dir=Path(sys.executable).resolve().parent
  project_dir=Path(__file__).resolve().parent
  data_dir=Path(os.getenv('CHIBI_NOTES_DATA_DIR',project_dir))
  candidates.extend([
   data_dir/'models'/model_name,
   project_dir/'models'/model_name,
   project_dir.parent/'backend'/'models'/model_name,
   executable_dir/'models'/model_name,
   executable_dir/'resources'/'models'/model_name,
   executable_dir/'_up_'/'backend'/'models'/model_name,
   executable_dir.parent/'resources'/'models'/model_name,
   executable_dir.parent/'resources'/'backend'/'models'/model_name,
   executable_dir.parent/'resources'/'_up_'/'backend'/'models'/model_name
  ])
  expanded=[]
  for candidate in candidates:
   expanded.append(candidate)
   if candidate.exists() and candidate.is_dir():
    try:
     for model_file in candidate.rglob('final.mdl'):
      if model_file.parent.name=='am':expanded.append(model_file.parent.parent)
    except OSError:pass
  unique=[];seen=set()
  for candidate in expanded:
   key=self._vosk_path_key(candidate)
   if key not in seen:seen.add(key);unique.append(candidate)
  return model_name,unique
 def _vosk_path_key(self,path:Path):
  try:resolved=path.resolve()
  except OSError:resolved=path.absolute()
  return os.path.normcase(windows_native_path(resolved))
 def _is_valid_vosk_model(self,path:Path):
  return path.is_dir() and (path/'am'/'final.mdl').is_file() and (path/'conf'/'mfcc.conf').is_file() and ((path/'graph'/'HCLr.fst').is_file() or (path/'graph'/'HCLG.fst').is_file())
 def _copy_vosk_model_to_data(self,source:Path,model_name:str,force:bool=False):
  target=self._vosk_models_dir/model_name
  if self._vosk_path_key(source)==self._vosk_path_key(target):return target
  with self._vosk_install_lock:
   if self._is_valid_vosk_model(target) and not force:return target
   temporary=self._vosk_models_dir/f'.{model_name}-{uuid.uuid4().hex}.tmp'
   try:
    if temporary.exists():shutil.rmtree(temporary,ignore_errors=True)
    shutil.copytree(source,temporary)
    if not self._is_valid_vosk_model(temporary):raise ValueError('La copia local del modelo Vosk quedó incompleta.')
    if target.exists():shutil.rmtree(target,ignore_errors=True)
    shutil.move(str(temporary),str(target))
   finally:
    if temporary.exists():shutil.rmtree(temporary,ignore_errors=True)
  return target
 def _load_vosk_model_path(self,Model,path:Path):
  key=self._vosk_path_key(path)
  cached=self._vosk_models.get(key)
  if cached is not None:return cached
  model=Model(key)
  self._vosk_models[key]=model
  return model
 def _find_vosk_model(self,p):
  language=str(p.get('language') or 'es-ES').lower();language_name='inglés' if language.startswith('en') else 'español'
  _,candidates=self._vosk_model_candidates(p)
  valid=[candidate for candidate in candidates if self._is_valid_vosk_model(candidate)]
  if valid:return valid[0]
  existing=[windows_native_path(candidate) for candidate in candidates if candidate.exists()]
  detail=f' Se encontraron carpetas incompletas: {"; ".join(existing[:3])}.' if existing else ''
  raise ValueError(f'La instalación no contiene un modelo Vosk válido en {language_name}.{detail} Reinstala Chibi Notes con el instalador completo. Si estás desarrollando el proyecto, vuelve a ejecutar CREAR_EXE_WINDOWS.cmd.')
 def _vosk_model(self,p):
  from vosk import Model
  language=str(p.get('language') or 'es-ES').lower();language_name='inglés' if language.startswith('en') else 'español'
  model_name,candidates=self._vosk_model_candidates(p);failures=[];repair_attempted=False
  local_target=self._vosk_models_dir/model_name
  local_key=self._vosk_path_key(local_target)
  for candidate in candidates:
   if not self._is_valid_vosk_model(candidate):continue
   candidate_key=self._vosk_path_key(candidate)
   try:return self._load_vosk_model_path(Model,candidate)
   except Exception as error:
    failures.append(f'{windows_native_path(candidate)}: {error}')
    if candidate_key!=local_key and not repair_attempted:
     repair_attempted=True
     if self._is_valid_vosk_model(local_target):
      try:return self._load_vosk_model_path(Model,local_target)
      except Exception as local_error:failures.append(f'copia local existente {windows_native_path(local_target)}: {local_error}')
     try:
      local_model=self._copy_vosk_model_to_data(candidate,model_name,force=True)
      return self._load_vosk_model_path(Model,local_model)
     except Exception as repair_error:
      failures.append(f'copia local reparada {windows_native_path(local_target)}: {repair_error}')
  if failures:
   detail=' | '.join(failures[:4])
   raise ValueError(f'No se pudo cargar el modelo Vosk en {language_name}. Chibi Notes probó el modelo incluido y una copia local sin rutas especiales de Windows. Reinstala la aplicación con el instalador FIX8 o posterior. Detalle: {detail}')
  return self._load_vosk_model_path(Model,self._find_vosk_model(p))
 def m_voice_status(self,p):
  try:
   import sounddevice as sd
   model_path=self._find_vosk_model(p)
   self._vosk_model(p)
   device=p.get('device',None)
   info=sd.query_devices(device,'input')
   if int(info.get('max_input_channels') or 0)<1:raise ValueError('Windows no ha proporcionado un micrófono de entrada válido.')
   return {'available':True,'modelPath':windows_native_path(model_path),'deviceName':str(info.get('name') or 'Micrófono predeterminado'),'sampleRate':int(float(info.get('default_samplerate') or 16000))}
  except Exception as e:return {'available':False,'error':voice_error_message(e)}
 def m_voice_transcribe_wav(self,p):
  from vosk import KaldiRecognizer
  wf=wave.open(p['path'],'rb'); rec=KaldiRecognizer(self._vosk_model(p),wf.getframerate()); parts=[]
  while True:
   data=wf.readframes(4000)
   if not data:break
   if rec.AcceptWaveform(data):parts.append(json.loads(rec.Result()).get('text',''))
  parts.append(json.loads(rec.FinalResult()).get('text',''));return {'text':' '.join(x for x in parts if x).strip()}
 def _voice_worker(self,session_id:str,p:dict[str,Any]):
  try:
   import sounddevice as sd
   from vosk import KaldiRecognizer
   duration=max(10.0,min(float(p.get('duration',180)),600.0));audio:queue.Queue[bytes]=queue.Queue(maxsize=48)
   with self._voice_lock:session=self._voice_sessions.get(session_id)
   if not session:return
   stop_event=session['stop'];device=p.get('device',None);info=sd.query_devices(device,'input')
   if int(info.get('max_input_channels') or 0)<1:raise ValueError('El dispositivo seleccionado no admite entrada de audio.')
   rate=int(float(p.get('sampleRate') or info.get('default_samplerate') or 16000));rate=max(8000,min(rate,96000));blocksize=max(1024,int(rate*.20))
   rec=KaldiRecognizer(self._vosk_model(p),rate);started=time.time();end=started+duration
   def callback(indata,frames,time_info,status):
    if stop_event.is_set():return
    try:audio.put_nowait(bytes(indata))
    except queue.Full:
     try:audio.get_nowait();audio.put_nowait(bytes(indata))
     except (queue.Empty,queue.Full):pass
   with self._voice_lock:
    session['ready']=True;session['startedAt']=started;session['deviceName']=str(info.get('name') or 'Micrófono predeterminado');session['sampleRate']=rate
   with sd.RawInputStream(device=device,samplerate=rate,blocksize=blocksize,dtype='int16',channels=1,latency='low',callback=callback):
    while time.time()<end and not stop_event.is_set():
     try:data=audio.get(timeout=.25)
     except queue.Empty:continue
     if rec.AcceptWaveform(data):
      phrase=json.loads(rec.Result()).get('text','').strip()
      if phrase:
       with self._voice_lock:session['parts'].append(phrase);session['partial']=''
     else:
      partial=json.loads(rec.PartialResult()).get('partial','').strip()
      with self._voice_lock:session['partial']=partial
   final=json.loads(rec.FinalResult()).get('text','').strip()
   if final:
    with self._voice_lock:session['parts'].append(final)
  except Exception as e:
   message=voice_error_message(e)
   with self._voice_lock:
    session=self._voice_sessions.get(session_id)
    if session:session['error']=message
  finally:
   with self._voice_lock:
    session=self._voice_sessions.get(session_id)
    if session:
     session['active']=False;session['ready']=False;session['partial']='';session['endedAt']=time.time()

 def m_voice_start(self,p):
  session_id=str(p.get('sessionId') or uuid.uuid4())
  with self._voice_lock:
   current=self._voice_sessions.get(session_id)
   if current and current.get('active'):raise ValueError('Ya hay un dictado activo con este identificador.')
   self._voice_sessions[session_id]={'stop':threading.Event(),'parts':[],'partial':'','active':True,'ready':False,'error':'','startedAt':time.time(),'endedAt':0.0}
  thread=threading.Thread(target=self._voice_worker,args=(session_id,dict(p)),daemon=True,name=f'chibi-voice-{session_id[:8]}')
  thread.start()
  return {'ok':True,'sessionId':session_id}

 def m_voice_poll(self,p):
  session_id=str(p.get('sessionId') or '')
  with self._voice_lock:
   session=self._voice_sessions.get(session_id)
   if not session:return {'sessionId':session_id,'active':False,'ready':False,'text':'','partial':'','displayText':'','error':'Sesión de dictado no encontrada.'}
   text=' '.join(session.get('parts',[])).strip();partial=str(session.get('partial','')).strip();display=' '.join(part for part in (text,partial) if part).strip()
   return {'sessionId':session_id,'active':bool(session.get('active')),'ready':bool(session.get('ready')),'text':text,'partial':partial,'displayText':display,'error':str(session.get('error','')),'duration':round(max(0,time.time()-float(session.get('startedAt') or time.time())),2),'deviceName':str(session.get('deviceName','')),'sampleRate':session.get('sampleRate',0)}

 def m_voice_stop(self,p):
  session_id=str(p.get('sessionId') or '')
  stopped=False
  with self._voice_lock:
   if session_id:
    session=self._voice_sessions.get(session_id)
    if session and session.get('active'):
     session['stop'].set();stopped=True
   else:
    for session in self._voice_sessions.values():
     if session.get('active'):session['stop'].set();stopped=True
  return {'ok':True,'stopped':stopped,'sessionId':session_id}

 def m_voice_discard(self,p):
  session_id=str(p.get('sessionId') or '')
  with self._voice_lock:
   session=self._voice_sessions.pop(session_id,None)
   if session and session.get('active'):session['stop'].set()
  return {'ok':True,'sessionId':session_id}

 def m_voice_listen(self,p):
  session_id=str(p.get('sessionId') or uuid.uuid4());params=dict(p);params['sessionId']=session_id;self.m_voice_start(params)
  while True:
   status=self.m_voice_poll({'sessionId':session_id})
   if not status.get('active'):
    if status.get('error'):raise ValueError(status['error'])
    self.m_voice_discard({'sessionId':session_id})
    return {'text':status.get('text',''),'duration':status.get('duration',0),'stopped':True,'sessionId':session_id}
   time.sleep(.18)
