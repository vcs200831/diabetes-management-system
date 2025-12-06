from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import sqlite3, hashlib, uuid, datetime
from typing import Optional

DB = "app_v2.db"

def get_db():
    conn = sqlite3.connect(DB, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        token TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        created_at TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS glucose (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        value REAL,
        note TEXT,
        taken_at TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        remind_at TEXT,
        created_at TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        role TEXT,
        message TEXT,
        created_at TEXT
    )
    """)
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_token() -> str:
    return uuid.uuid4().hex

app = FastAPI(title="Complete Project v2 - FastAPI Backend (Kids Zone)")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




init_db()

class RegisterIn(BaseModel):
    username: str
    password: str

class LoginIn(BaseModel):
    username: str
    password: str

class NoteIn(BaseModel):
    content: str

class ChatIn(BaseModel):
    message: str

class GlucoseIn(BaseModel):
    value: float
    note: Optional[str] = ""

class ReminderIn(BaseModel):
    title: str
    remind_at: str  # ISO datetime

def get_user_by_token(token: str):
    if not token:
        return None
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE token = ?", (token,))
    row = cur.fetchone()
    conn.close()
    return row

def require_user(x_token: Optional[str] = Header(None, convert_underscores=False)):
    user = get_user_by_token(x_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or missing token.")
    return user

@app.post("/register")
def register(data: RegisterIn):
    conn = get_db()
    cur = conn.cursor()
    pw_hash = hash_password(data.password)
    try:
        cur.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (data.username, pw_hash))
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists.")
    conn.close()
    return {"ok": True, "message": "User registered."}

@app.post("/login")
def login(data: LoginIn):
    conn = get_db()
    cur = conn.cursor()
    pw_hash = hash_password(data.password)
    cur.execute("SELECT * FROM users WHERE username = ? AND password_hash = ?", (data.username, pw_hash))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_token()
    cur.execute("UPDATE users SET token = ? WHERE id = ?", (token, row["id"]))
    conn.commit()
    conn.close()
    return {"ok": True, "token": token, "username": data.username}

@app.get("/dashboard")
def dashboard(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM notes WHERE user_id = ?", (user["id"],))
    cnt = cur.fetchone()["cnt"]
    week_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()
    cur.execute("SELECT AVG(value) as avg FROM glucose WHERE user_id = ? AND taken_at >= ?", (user["id"], week_ago))
    row = cur.fetchone()
    avg = row["avg"] if row and row["avg"] is not None else None
    conn.close()
    return {"ok": True, "username": user["username"], "notes_count": cnt, "avg_glucose_7d": avg}

@app.post("/notes")
def add_note(note: NoteIn, user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute("INSERT INTO notes (user_id, content, created_at) VALUES (?, ?, ?)", (user["id"], note.content, now))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/notes")
def list_notes(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, content, created_at FROM notes WHERE user_id = ? ORDER BY id DESC", (user["id"],))
    rows = cur.fetchall()
    conn.close()
    notes = [{"id": r["id"], "content": r["content"], "created_at": r["created_at"]} for r in rows]
    return {"ok": True, "notes": notes}

@app.post("/chat")
def chat(incoming: ChatIn, user = Depends(require_user)):
    text = incoming.message.strip().lower()
    conn = get_db()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute("INSERT INTO chat_history (user_id, role, message, created_at) VALUES (?, ?, ?, ?)", (user["id"], "user", incoming.message, now))
    if any(k in text for k in ["fever","temperature","hot"]):
        reply = "May be fever. If temp > 38°C (100.4°F) seek care. Stay hydrated."
    elif any(k in text for k in ["headache","migraine"]):
        reply = "Headache: try rest, hydration, and monitor. If severe, consult a doctor."
    elif any(k in text for k in ["insulin","dose","sugar"]):
        reply = "For insulin/dose questions, always follow your doctor's prescription. I can help log your sugar values."
    elif "hello" in text or "hi" in text:
        reply = f"Hello {user['username']}! I'm your assistant. Describe symptoms or ask about sugar logs."
    else:
        reply = "Thanks. Can you give duration and severity? This is a simulation and not medical advice."
    cur.execute("INSERT INTO chat_history (user_id, role, message, created_at) VALUES (?, ?, ?, ?)", (user["id"], "bot", reply, now))
    conn.commit()
    conn.close()
    return {"ok": True, "reply": reply}

@app.get("/chat/history")
def chat_history(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT role, message, created_at FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 50", (user["id"],))
    rows = cur.fetchall()
    conn.close()
    return {"ok": True, "history": [{"role":r["role"], "message":r["message"], "created_at":r["created_at"]} for r in rows]}

@app.post("/glucose")
def add_glucose(g: GlucoseIn, user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute("INSERT INTO glucose (user_id, value, note, taken_at) VALUES (?, ?, ?, ?)", (user["id"], g.value, g.note, now))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/glucose")
def get_glucose(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, value, note, taken_at FROM glucose WHERE user_id = ? ORDER BY id DESC", (user["id"],))
    rows = cur.fetchall()
    conn.close()
    return {"ok": True, "glucose": [{"id":r["id"], "value":r["value"], "note":r["note"], "taken_at":r["taken_at"]} for r in rows]}

@app.get("/report/weekly")
def weekly_report(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    since = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()
    cur.execute("SELECT COUNT(*) as cnt, AVG(value) as avg, MIN(value) as minv, MAX(value) as maxv FROM glucose WHERE user_id = ? AND taken_at >= ?", (user["id"], since))
    row = cur.fetchone()
    conn.close()
    return {"ok": True, "since": since, "count": row["cnt"], "avg": row["avg"], "min": row["minv"], "max": row["maxv"]}

@app.post("/reminders")
def create_reminder(r: ReminderIn, user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute("INSERT INTO reminders (user_id, title, remind_at, created_at) VALUES (?, ?, ?, ?)", (user["id"], r.title, r.remind_at, now))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/reminders")
def list_reminders(user = Depends(require_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, remind_at, created_at FROM reminders WHERE user_id = ? ORDER BY id DESC", (user["id"],))
    rows = cur.fetchall()
    conn.close()
    return {"ok": True, "reminders": [{"id":r["id"], "title":r["title"], "remind_at":r["remind_at"], "created_at":r["created_at"]} for r in rows]}
    

