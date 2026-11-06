/* ============ СОСТОЯНИЕ ============ */
const STORAGE_KEY = 'anya-state';
const SESSION_KEY = 'anya-session';

const chatInner = document.getElementById('chatInner');
const chatEl = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const historyEl = document.getElementById('history');
const profileNameEl = document.getElementById('profileName');
const welcomeScreen = document.getElementById('welcomeScreen');
const appEl = document.getElementById('app');
const authScreen = document.getElementById('authScreen');
const profileAvatar = document.getElementById('profileAvatar');
const avatarInput = document.getElementById('avatarInput');
const greetingScreen = document.getElementById('greetingScreen');

let state = loadState();
let mode = 'character';

const MODE_LABELS = { character: 'Персонаж', human: 'Человек', neural: 'Нейронка' };
const MODE_GREETINGS = {
  character: 'Привет. Я Anya в режиме персонажа. Выбери, кем мне быть, и напиши сообщение.',
  human: 'Привет. Я Anya в режиме человека. Давай поговорим как обычные люди.',
  neural: 'Привет. Я Anya в режиме нейронки. Спрашивай про технологии, код, ИИ.'
};

/* ============ ЗАГРУЗКА/СОХРАНЕНИЕ ============ */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  return { currentProfileId: null, profiles: [], started: false };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentProfile() { return state.profiles.find(p => p.id === state.currentProfileId); }
function currentChat() {
  const p = currentProfile();
  if (!p) return null;
  return p.chats.find(c => c.id === p.currentChatId) || p.chats[0];
}

/* ============ АУТЕНТИФИКАЦИЯ ============ */
function hashPassword(pw) {
  let h = 0; for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  return 'h' + Math.abs(h).toString(36);
}
function registerUser(name, password) {
  if (!name || !password) return { ok: false, error: 'Заполни имя и пароль' };
  if (state.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: 'Имя занято' };
  const id = 'p' + Date.now(); const cid = 'c' + Date.now();
  state.profiles.push({ id, name, passwordHash: hashPassword(password), avatar: null, chats: [{ id: cid, title: 'Приветствие', pinned: false, messages: [] }], currentChatId: cid });
  state.currentProfileId = id; state.started = false; saveState();
  sessionStorage.setItem(SESSION_KEY, id); return { ok: true };
}
function loginUser(name, password) {
  const p = state.profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!p) return { ok: false, error: 'Профиль не найден' };
  if (p.passwordHash !== hashPassword(password)) return { ok: false, error: 'Неверный пароль' };
  state.currentProfileId = p.id; state.started = false; saveState();
  sessionStorage.setItem(SESSION_KEY, p.id); return { ok: true };
}
function logout() {
  sessionStorage.removeItem(SESSION_KEY); state.currentProfileId = null; state.started = false; saveState(); showAuth();
}

/* ============ ЭКРАНЫ И ТЕМЫ ============ */
function showAuth() { authScreen.style.display = 'flex'; welcomeScreen.style.display = 'none'; appEl.style.display = 'none'; }
function showWelcome() { authScreen.style.display = 'none'; welcomeScreen.style.display = 'flex'; appEl.style.display = 'none'; }
function hideAll() { authScreen.style.display = 'none'; welcomeScreen.style.display = 'none'; appEl.style.display = 'flex'; }

// Темы
const savedTheme = localStorage.getItem('anya-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';

document.querySelectorAll('.theme-opt').forEach(btn => {
  if (btn.dataset.setTheme === savedTheme) btn.classList.add('active');
  btn.onclick = () => {
    const t = btn.dataset.setTheme;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('anya-theme', t);
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
});

/* ============ АВАТАР ============ */
function renderAvatar() {
  const p = currentProfile(); if (!p) return;
  if (p.avatar) { profileAvatar.style.backgroundImage = `url(${p.avatar})`; profileAvatar.textContent = ''; }
  else { profileAvatar.style.backgroundImage = 'none'; profileAvatar.textContent = '👤'; }
}
profileAvatar.onclick = () => avatarInput.click();
avatarInput.onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { const p = currentProfile(); if (!p) return; p.avatar = ev.target.result; saveState(); renderAvatar(); };
  reader.readAsDataURL(file);
};

/* ============ РЕНДЕР ============ */
function renderHistory() {
  historyEl.innerHTML = ''; const p = currentProfile(); if (!p) return;
  const sorted = [...p.chats].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  sorted.forEach(c => {
    const row = document.createElement('div'); row.className = 'item'; if (c.id === p.currentChatId) row.classList.add('active');
    const title = document.createElement('span'); title.className = 'chat-title'; title.textContent = (c.pinned ? '📌 ' : '') + (c.title || 'Без названия');
    title.ondblclick = (e) => { e.stopPropagation(); renameChat(c.id); };
    const actions = document.createElement('span'); actions.className = 'chat-actions';
    const pinBtn = document.createElement('button'); pinBtn.textContent = c.pinned ? '📌' : '📍'; pinBtn.onclick = (e) => { e.stopPropagation(); c.pinned = !c.pinned; saveState(); renderHistory(); };
    const delBtn = document.createElement('button'); delBtn.textContent = '🗑'; delBtn.onclick = (e) => { e.stopPropagation(); deleteChat(c.id); };
    actions.append(pinBtn, delBtn); row.append(title, actions);
    row.onclick = () => { p.currentChatId = c.id; saveState(); renderHistory(); renderChat(); };
    historyEl.appendChild(row);
  });
}

function renderChat() {
  const c = currentChat(); if (!c) return;
  chatInner.innerHTML = '';
  if (c.messages.length === 0) {
    chatInner.appendChild(greetingScreen);
    greetingScreen.style.display = 'block';
  } else {
    greetingScreen.style.display = 'none';
    c.messages.forEach(m => addMsgToDOM(m.text, m.who, false));
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderAll() {
  const p = currentProfile(); if (p) profileNameEl.textContent = p.name;
  renderHistory(); renderChat(); renderAvatar();
}

function addMsgToDOM(text, who, save = true) {
  greetingScreen.style.display = 'none';
  const d = document.createElement('div'); d.className = 'msg ' + who;
  d.innerHTML = `<div class="bubble"></div>`; d.querySelector('.bubble').textContent = text;
  chatInner.appendChild(d); chatEl.scrollTop = chatEl.scrollHeight;
  if (save) {
    const c = currentChat(); if (!c) return;
    c.messages.push({ who, text });
    if (who === 'user' && (c.title === 'Приветствие' || c.title === 'Новый чат' || !c.title)) {
      c.title = text.trim().slice(0, 30) + (text.length > 30 ? '…' : '');
    }
    saveState(); renderHistory();
  }
}

/* ============ ЧАТЫ ============ */
function renameChat(id) { const c = currentProfile().chats.find(x => x.id === id); const name = prompt('Название:', c.title); if (name) { c.title = name; saveState(); renderHistory(); } }
function deleteChat(id) { const p = currentProfile(); if (p.chats.length === 1) return alert('Нельзя удалить последний'); if (!confirm('Удалить?')) return; p.chats = p.chats.filter(c => c.id !== id); if (p.currentChatId === id) p.currentChatId = p.chats[0].id; saveState(); renderHistory(); renderChat(); }

document.getElementById('newChat').onclick = () => {
  const p = currentProfile(); const cid = 'c' + Date.now();
  p.chats.push({ id: cid, title: 'Новый чат', pinned: false, messages: [] });
  p.currentChatId = cid; saveState(); renderHistory(); renderChat();
};

document.getElementById('menuBtn').onclick = () => document.querySelector('.sidebar').classList.toggle('open');

/* ============ ОТПРАВКА ============ */
async function send() {
  const text = input.value.trim(); if (!text) return;
  addMsgToDOM(text, 'user'); input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;
  try {
    const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, mode }) });
    const data = await res.json();
    addMsgToDOM(data.reply, 'anya');
  } catch (e) {
    addMsgToDOM('Сервер не отвечает. Запусти python main.py', 'anya');
  } finally { sendBtn.disabled = false; }
}

sendBtn.onclick = send;
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; });

/* ============ СТАРТ ============ */
document.getElementById('logoutBtn').onclick = logout;
document.querySelectorAll('.welcome-card').forEach(card => {
  card.onclick = () => {
    if (card.dataset.mode !== 'character') return alert('В разработке. Доступен только «Персонаж».');
    state.started = true; saveState(); hideAll(); renderAll();
  };
});

const authTabs = document.querySelectorAll('.auth-tab'); let authMode = 'login';
authTabs.forEach(t => { t.onclick = () => { authTabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); authMode = t.dataset.tab; document.getElementById('authSubmit').textContent = authMode === 'login' ? 'Войти' : 'Создать'; }; });
document.getElementById('authSubmit').onclick = () => {
  const name = document.getElementById('authName').value.trim(); const pw = document.getElementById('authPassword').value;
  const res = authMode === 'login' ? loginUser(name, pw) : registerUser(name, pw);
  if (!res.ok) return document.getElementById('authError').textContent = res.error;
  document.getElementById('authError').textContent = ''; showWelcome();
};
document.getElementById('pwToggle').onclick = () => {
  const pw = document.getElementById('authPassword');
  pw.type = pw.type === 'password' ? 'text' : 'password';
};

const sessionId = sessionStorage.getItem(SESSION_KEY);
if (sessionId && state.profiles.some(p => p.id === sessionId)) { state.currentProfileId = sessionId; state.started = false; saveState(); showWelcome(); }
else { showAuth(); }
