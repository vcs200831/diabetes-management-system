const API = "http://localhost:8000";
function qs(id){return document.getElementById(id);}
let token = localStorage.getItem("token") || null;
let username = localStorage.getItem("username") || null;

function setStatus(t){qs("status").innerText = t;}

async function register(){
  const u = qs("reg_username").value.trim();
  const p = qs("reg_password").value.trim();
  if(!u||!p){qs("reg_msg").innerText="Enter username and password";return;}
  const r = await fetch(API+"/register", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:u,password:p})});
  const data = await r.json();
  if(r.ok) qs("reg_msg").innerText = "Registered. Please login.";
  else qs("reg_msg").innerText = data.detail || JSON.stringify(data);
}

async function login(){
  const u = qs("login_username").value.trim();
  const p = qs("login_password").value.trim();
  if(!u||!p){qs("login_msg").innerText="Enter username and password";return;}
  const r = await fetch(API+"/login", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:u,password:p})});
  const data = await r.json();
  if(r.ok){ token = data.token; username = data.username; localStorage.setItem("token", token); localStorage.setItem("username", username); showApp(); loadDashboard(); }
  else qs("login_msg").innerText = data.detail || "Login failed";
}

function authHeaders(){ return {"Content-Type":"application/json", "X-Token": token}; }

async function loadDashboard(){
  setStatus("Loading...");
  const r = await fetch(API+"/dashboard", {headers: {"X-Token": token}});
  const d = await r.json();
  if(r.ok){ qs("dash").innerText = `Hello ${d.username}. Notes: ${d.notes_count}. 7-day avg glucose: ${d.avg_glucose_7d || "N/A"}`; }
  else setStatus("Failed to load dashboard");
  loadGlucose(); loadReminders();
}

async function saveGlucose(){
  const v = parseFloat(qs("gl_value").value);
  const note = qs("gl_note").value;
  if(!v){qs("gl_msg").innerText="Enter a number";return;}
  setStatus("Saving glucose...");
  const r = await fetch(API+"/glucose", {method:"POST", headers: authHeaders(), body: JSON.stringify({value:v,note:note})});
  const d = await r.json();
  if(r.ok){ qs("gl_msg").innerText="Saved."; qs("gl_value").value=""; qs("gl_note").value=""; loadGlucose(); }
  else qs("gl_msg").innerText = d.detail || "Error";
}

async function loadGlucose(){
  const r = await fetch(API+"/glucose", {headers: {"X-Token": token}});
  const d = await r.json();
  const el = qs("gl_list");
  el.innerHTML = "";
  if(r.ok){ d.glucose.forEach(g=>{ const p=document.createElement("div"); p.innerText = `${g.taken_at} — ${g.value} mg/dL — ${g.note || ""}`; el.appendChild(p); }); }
  else el.innerText = "Failed to load";
}

async function addReminder(){
  const title = qs("rem_title").value.trim();
  const time = qs("rem_time").value.trim();
  if(!title||!time) return;
  const r = await fetch(API+"/reminders", {method:"POST", headers: authHeaders(), body: JSON.stringify({title,remind_at: time})});
  const d = await r.json();
  if(r.ok){ qs("rem_title").value=""; qs("rem_time").value=""; loadReminders(); }
  else alert("Failed to add");
}

async function loadReminders(){
  const r = await fetch(API+"/reminders", {headers: {"X-Token": token}});
  const d = await r.json();
  const el = qs("rem_list");
  el.innerHTML = "";
  if(r.ok){ d.reminders.forEach(rm=>{ const p=document.createElement("div"); p.innerText = `${rm.remind_at} — ${rm.title}`; el.appendChild(p); }); }
}

async function sendChat(){
  const txt = qs("chat_input").value.trim();
  if(!txt) return;
  appendChat("You: "+txt);
  qs("chat_input").value="";
  const r = await fetch(API+"/chat", {method:"POST", headers: authHeaders(), body: JSON.stringify({message:txt})});
  const d = await r.json();
  if(r.ok) appendChat("Doctor: "+(d.reply||""));
}

function appendChat(t){ const box = qs("chat_box"); const p=document.createElement("div"); p.innerText = t; box.appendChild(p); box.scrollTop = box.scrollHeight; }

async function loadHistory(){
  const r = await fetch(API+"/chat/history", {headers: {"X-Token": token}});
  const d = await r.json();
  const box = qs("chat_box"); box.innerHTML="";
  if(r.ok){ d.history.reverse().forEach(h=> appendChat(`${h.role}: ${h.message}`)); }
}

function logout(){ localStorage.removeItem("token"); localStorage.removeItem("username"); location.reload(); }
function showApp(){ qs("auth").style.display="none"; qs("app_area").style.display="block"; }

document.getElementById("btn_register").addEventListener("click", register);
document.getElementById("btn_login").addEventListener("click", login);
document.getElementById("btn_save_gl").addEventListener("click", saveGlucose);
document.getElementById("btn_add_rem").addEventListener("click", addReminder);
document.getElementById("btn_send_chat").addEventListener("click", sendChat);
document.getElementById("btn_load_history").addEventListener("click", loadHistory);
document.getElementById("btn_kids").addEventListener("click", ()=> location.href="kids.html");
document.getElementById("btn_report").addEventListener("click", async ()=>{ const r = await fetch(API+"/report/weekly", {headers: {"X-Token": token}}); const d = await r.json(); if(r.ok) alert(`Last 7 days\nCount: ${d.count}\nAvg: ${d.avg}\nMin: ${d.min}\nMax: ${d.max}`); else alert("Report failed"); });
document.getElementById("btn_logout").addEventListener("click", logout);

if(token){ showApp(); loadDashboard(); }
