from __future__ import annotations
import sqlite3, json
from pathlib import Path
from typing import Any
SCHEMA='''
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL DEFAULT 'text',pinned INTEGER NOT NULL DEFAULT 0,always_on_top INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0,assigned_mascot_id TEXT NOT NULL DEFAULT '',customization_json TEXT NOT NULL DEFAULT '{}',metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checklist_items(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,text TEXT NOT NULL,done INTEGER NOT NULL DEFAULT 0,position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,path TEXT NOT NULL,pack_id TEXT,category TEXT,builtin INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS themes(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',customization_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS note_groups(id TEXT PRIMARY KEY,name TEXT NOT NULL,icon TEXT NOT NULL DEFAULT '📁',color TEXT NOT NULL DEFAULT '#9fdfff',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reminders(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,due_at TEXT NOT NULL,repeat_rule TEXT,snoozed_until TEXT,completed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value_json TEXT NOT NULL);
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(note_id UNINDEXED,title,body,content='');
'''
class Database:
 def __init__(self,path:Path):
  path.parent.mkdir(parents=True,exist_ok=True); self.path=path; self.con=sqlite3.connect(path,check_same_thread=False); self.con.row_factory=sqlite3.Row; self.con.executescript(SCHEMA)
  columns={row['name'] for row in self.con.execute('PRAGMA table_info(notes)').fetchall()}
  if 'metadata_json' not in columns: self.con.execute("ALTER TABLE notes ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'")
 def query(self,sql:str,args=()): return [dict(r) for r in self.con.execute(sql,args).fetchall()]
 def one(self,sql:str,args=()):
  r=self.con.execute(sql,args).fetchone(); return dict(r) if r else None
 def execute(self,sql:str,args=()):
  with self.con: return self.con.execute(sql,args)
 def json_get(self,key:str,default:Any=None):
  r=self.one('SELECT value_json FROM settings WHERE key=?',(key,)); return json.loads(r['value_json']) if r else default
 def json_set(self,key:str,value:Any): self.execute('INSERT INTO settings(key,value_json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json',(key,json.dumps(value,ensure_ascii=False)))
