/* ============ СОСТОЯНИЕ ============ */
const STORAGE_KEY = 'anya-state';
const SESSION_KEY = 'anya-session';

const chatInner = document.getElementById('chatInner');
const chatEl = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const modePill = document.getElementById('modePill');
const themeBtn = document.getElementById('themeBtn');
const historyEl = document.getElementById('history');
const profileNameEl = document.getElementById('profileName');
const profileSelect = document.getElementById('profileSelect');
const newProfileBtn = document.getElementById('newProfileBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const appEl = document.getElementById('app');
const authScreen = document.getElementById('authScreen');
const profileAvatar = document.getElementById('profileAvatar');
const avatarInput = document.getElementById('avatarInput');

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
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  // Пустое состояние — никаких дефолтных профилей
  return { currentProfileId: null, profiles: [], started: false };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentProfile() {
  return state.profiles.find(p => p.id === state.currentProfileId);
}

function currentChat() {
  const p = currentProfile();
  if (!p) return null;
  return p.chats.find(c => c.id === p.currentChatId) || p.chats[0];
}

/* ============ АУТЕНТИФИКАЦИЯ ============ */
function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

function registerUser(name, password) {
  if (!name || !password) return { ok: false, error: 'Заполни имя и пароль' };
  if (state.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'Такое имя уже занято' };
  }
  const id = 'p' + Date.now();
  const cid = 'c' + Date.now();
  state.profiles.push({
    id,
    name,
    passwordHash: hashPassword(password),
    avatar: null,
    chats: [{ id: cid, title: 'Приветствие', pinned: false, messages: [
      { who: 'anya', text: MODE_GREETINGS.character }
    ]}],
    currentChatId: cid
  });
  state.currentProfileId = id;
  state.started = false;
  saveState();
  sessionStorage.setItem(SESSION_KEY, id);
  return { ok: true };
}

function loginUser(name, password) {
  const p = state.profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!p) return { ok: false, error: 'Профиль не найден' };
  if (p.passwordHash !== hashPassword(password)) {
    return { ok: false, error: 'Неверный пароль' };
  }
  state.currentProfileId = p.id;
  state.started = false;
  saveState();
  sessionStorage.setItem(SESSION_KEY, p.id);
  return { ok: true };
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  state.currentProfileId = null;
  state.started = false;
  saveState();
  showAuth();
}

/* ============ ЭКРАНЫ ============ */
function showAuth() {
  authScreen.style.display = 'flex';
  welcomeScreen.style.display = 'none';
  appEl.style.display = 'none';
}
function showWelcome() {
  authScreen.style.display = 'none';
  welcomeScreen.style.display = 'flex';
  appEl.style.display = 'none';
}
function hideAll() {
  authScreen.style.display = 'none';
  welcomeScreen.style.display = 'none';
  appEl.style.display = 'flex';
}

/* ============ ТЕМА ============ */
const savedTheme = localStorage.getItem('anya-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeBtn.onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('anya-theme', next);
  themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
};

/* ============ АВАТАР ============ */
function renderAvatar() {
  const p = currentProfile();
  if (!p) return;
  if (p.avatar) {
    profileAvatar.style.backgroundImage = `url(${p.avatar})`;
    profileAvatar.textContent = '';
  } else {
    profileAvatar.style.backgroundImage = 'none';
    profileAvatar.textContent = '👤';
  }
}

profileAvatar.onclick = () => avatarInput.click();

avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const p = currentProfile();
    if (!p) return;
    p.avatar = ev.target.result;
    saveState();
    renderAvatar();
  };
  reader.readAsDataURL(file);
};

/* ============ РЕНДЕР ============ */
function renderProfiles() {
  profileSelect.innerHTML = '';
  state.profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.currentProfileId) opt.selected = true;
    profileSelect.appendChild(opt);
  });
  profileNameEl.textContent = currentProfile()?.name || '';
}

function renderHistory() {
  historyEl.innerHTML = '';
  const p = currentProfile();
  if (!p) return;
  const sorted = [...p.chats].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  sorted.forEach(c => {
    const row = document.createElement('div');
    row.className = 'item';
    if (c.id === p.currentChatId) row.classList.add('active');

    const title = document.createElement('span');
    title.className = 'chat-title';
    title.textContent = (c.pinned ? '📌 ' : '') + (c.title || 'Без названия');
    title.ondblclick = (e) => { e.stopPropagation(); renameChat(c.id); };

    const actions = document.createElement('span');
    actions.className = 'chat-actions';

    const pinBtn = document.createElement('button');
    pinBtn.title = c.pinned ? 'Открепить' : 'Закрепить';
    pinBtn.textContent = c.pinned ? '📌' : '📍';
    pinBtn.onclick = (e) => { e.stopPropagation(); c.pinned = !c.pinned; saveState(); renderHistory(); };

    const renameBtn = document.createElement('button');
    renameBtn.title = 'Переименовать';
    renameBtn.textContent = '✏️';
    renameBtn.onclick = (e) => { e.stopPropagation(); renameChat(c.id); };

    const delBtn = document.createElement('button');
    delBtn.title = 'Удалить';
    delBtn.textContent = '🗑';
    delBtn.onclick = (e) => { e.stopPropagation(); deleteChat(c.id); };

    actions.append(pinBtn, renameBtn, delBtn);
    row.append(title, actions);
    row.onclick = () => {
      p.currentChatId = c.id;
      saveState();
      renderHistory();
      renderChat();
    };
    historyEl.appendChild(row);
  });
}

function renderChat() {
  chatInner.innerHTML = '';
  const c = currentChat();
  if (!c) return;
  c.messages.forEach(m => addMsgToDOM(m.text, m.who, false));
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderAll() {
  renderProfiles();
  renderHistory();
  renderChat();
  renderAvatar();
}

function addMsgToDOM(text, who, save = true) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = `<div class="avatar ${who}"></div><div class="bubble"></div>`;
  d.querySelector('.bubble').textContent = text;
  chatInner.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
  if (save) {
    const c = currentChat();
    if (!c) return;
    c.messages.push({ who, text });
    if (who === 'user' && (c.title === 'Приветствие' || c.title === 'Новый чат' || !c.title)) {
      c.title = makeTitle(text);
    }
    saveState();
    renderHistory();
  }
}

function makeTitle(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 30 ? clean.slice(0, 30) + '…' : clean;
}

/* ============ ДЕЙСТВИЯ С ЧАТАМИ ============ */
function renameChat(id) {
  const p = currentProfile();
  const c = p.chats.find(x => x.id === id);
  if (!c) return;
  const name = prompt('Новое название чата:', c.title || '');
  if (!name) return;
  c.title = name.trim() || c.title;
  saveState();
  renderHistory();
}

function deleteChat(id) {
  const p = currentProfile();
  if (p.chats.length === 1) {
    alert('Нельзя удалить последний чат. Создай новый.');
    return;
  }
  if (!confirm('Удалить этот чат?')) return;
  p.chats = p.chats.filter(c => c.id !== id);
  if (p.currentChatId === id) p.currentChatId = p.chats[0].id;
  saveState();
  renderHistory();
  renderChat();
}

/* ============ ПРОФИЛИ ============ */
profileSelect.onchange = () => {
  state.currentProfileId = profileSelect.value;
  saveState();
  renderAll();
};

newProfileBtn.onclick = () => {
  const name = prompt('Имя нового профиля:');
  if (!name) return;
  const pw = prompt('Пароль для профиля:');
  if (!pw) return;
  const res = registerUser(name, pw);
  if (!res.ok) { alert(res.error); return; }
  renderAll();
};

/* ============ НОВЫЙ ЧАТ ============ */
document.getElementById('newChat').onclick = () => {
  const p = currentProfile();
  const cid = 'c' + Date.now();
  p.chats.push({ id: cid, title: 'Новый чат', pinned: false, messages: [] });
  p.currentChatId = cid;
  saveState();
  renderHistory();
  renderChat();
};

/* ============ РЕЖИМЫ (с блокировкой) ============ */
document.querySelectorAll('.mode-select button').forEach(btn => {
  btn.onclick = () => {
    const chosen = btn.dataset.mode;
    if (chosen === 'human' || chosen === 'neural') {
      addMsgToDOM(
        'Этот режим пока в разработке. Anya учится говорить как персонаж — скоро и остальные подтянутся. А пока давай общаться в режиме «Персонаж»! 🎭',
        'anya'
      );
      return;
    }
    document.querySelectorAll('.mode-select button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = chosen;
    modePill.textContent = btn.textContent;
  };
});

/* ============ ОТПРАВКА ============ */
async function send() {
  const text = input.value.trim();
  if (!text) return;
  addMsgToDOM(text, 'user');
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, mode })
    });
    const data = await res.json();
    addMsgToDOM(data.reply, 'anya');
  } catch (e) {
    addMsgToDOM('Сервер не отвечает. Попробуй перезагрузить страницу и если такое повторится напиши сюда: klim.a.korykin@gmail.com', 'anya');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.onclick = send;
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

/* ============ ВЫХОД ============ */
document.getElementById('logoutBtn').onclick = () => {
  if (confirm('Выйти из профиля?')) logout();
};

/* ============ СТАРТОВЫЙ ЭКРАН ============ */
document.querySelectorAll('.welcome-card').forEach(card => {
  card.onclick = () => {
    const chosen = card.dataset.mode;
    if (chosen === 'human' || chosen === 'neural') {
      alert('Этот режим пока в разработке. Доступен только «Персонаж».');
      return;
    }
    startWithMode(chosen);
  };
});

function startWithMode(chosenMode) {
  mode = chosenMode;
  state.started = true;
  saveState();
  hideAll();
  document.querySelectorAll('.mode-select button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  modePill.textContent = MODE_LABELS[mode];
  const c = currentChat();
  if (c && c.messages.length === 0) addMsgToDOM(MODE_GREETINGS[mode], 'anya');
  renderAll();
}

/* ============ ФОРМЫ АУТЕНТИФИКАЦИИ ============ */
const authTabs = document.querySelectorAll('.auth-tab');
let authMode = 'login';
authTabs.forEach(t => {
  t.onclick = () => {
    authTabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    authMode = t.dataset.tab;
    document.getElementById('authSubmit').textContent = authMode === 'login' ? 'Войти' : 'Создать профиль';
    document.getElementById('authError').textContent = '';
  };
});

document.getElementById('authSubmit').onclick = () => {
  const name = document.getElementById('authName').value.trim();
  const pw = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  const res = authMode === 'login' ? loginUser(name, pw) : registerUser(name, pw);
  if (!res.ok) { errEl.textContent = res.error; return; }
  errEl.textContent = '';
  document.getElementById('authName').value = '';
  document.getElementById('authPassword').value = '';
  showWelcome();
};

document.getElementById('authPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('authSubmit').click();
});

/* ============ ПОКАЗ ПАРОЛЯ ============ */
document.getElementById('pwToggle').onclick = () => {
  const pw = document.getElementById('authPassword');
  const btn = document.getElementById('pwToggle');
  if (pw.type === 'password') {
    pw.type = 'text';
    btn.textContent = '🙈';
  } else {
    pw.type = 'password';
    btn.textContent = '👁';
  }
};

/* ============ СТАРТ ============ */
const sessionId = sessionStorage.getItem(SESSION_KEY);
if (sessionId && state.profiles.some(p => p.id === sessionId)) {
  state.currentProfileId = sessionId;
  state.started = false;
  saveState();
  showWelcome();
} else {
  showAuth();
}