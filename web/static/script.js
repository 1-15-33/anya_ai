const STORAGE_KEY = 'anya-v1-state';
const SESSION_KEY = 'anya-v1-session';

const el = {
    auth: document.getElementById('authScreen'),
    welcome: document.getElementById('welcomeScreen'),
    app: document.querySelector('.main-content'),
    sidebar: document.getElementById('sidebar'),
    chatList: document.getElementById('history'),
    chatInner: document.getElementById('chatInner'),
    greeting: document.getElementById('greetingScreen'),
    input: document.getElementById('input'),
    sendBtn: document.getElementById('sendBtn'),
    settingsModal: document.getElementById('settingsModal'),
    profileSelect: document.getElementById('profileSelect'),
    profileName: document.getElementById('profileName'),
    profileAvatar: document.getElementById('profileAvatar'),
    avatarInput: document.getElementById('avatarInput'),
    modePill: document.getElementById('modePill')
};

let state = loadState();
let mode = 'character';
const MODE_LABELS = { character: 'Персонаж', human: 'Человек', neural: 'Нейронка' };

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw); } catch(e){} }
    return { currentProfileId: null, profiles: [], started: false };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentProfile() { return state.profiles.find(p => p.id === state.currentProfileId); }
function currentChat() {
    const p = currentProfile();
    if (!p) return null;
    return p.chats.find(c => c.id === p.currentChatId) || p.chats[0];
}

// Авторизация
function hashPw(pw) { let h=0; for(let i=0;i<pw.length;i++) h=((h<<5)-h+pw.charCodeAt(i))|0; return 'h'+Math.abs(h).toString(36); }
function registerUser(name, pw) {
    if (!name || !pw) return { ok:false, error:'Заполни имя и пароль' };
    if (state.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) return { ok:false, error:'Имя занято' };
    const id = 'p'+Date.now(); const cid = 'c'+Date.now();
    state.profiles.push({ id, name, passwordHash: hashPw(pw), avatar: null, chats: [{ id: cid, title: 'Приветствие', pinned: false, messages: [] }], currentChatId: cid });
    state.currentProfileId = id; state.started = false; saveState(); sessionStorage.setItem(SESSION_KEY, id);
    return { ok:true };
}
function loginUser(name, pw) {
    const p = state.profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!p) return { ok:false, error:'Профиль не найден' };
    if (p.passwordHash !== hashPw(pw)) return { ok:false, error:'Неверный пароль' };
    state.currentProfileId = p.id; state.started = false; saveState(); sessionStorage.setItem(SESSION_KEY, p.id);
    return { ok:true };
}
function logout() { sessionStorage.removeItem(SESSION_KEY); state.currentProfileId = null; state.started = false; saveState(); showAuth(); }

// Экраны
function showAuth() { el.auth.style.display = 'flex'; el.welcome.style.display = 'none'; el.app.style.display = 'none'; document.getElementById('sidebar').style.display='none'; }
function showWelcome() { el.auth.style.display = 'none'; el.welcome.style.display = 'flex'; el.app.style.display = 'none'; document.getElementById('sidebar').style.display='none'; }
function hideAll() { el.auth.style.display = 'none'; el.welcome.style.display = 'none'; el.app.style.display = 'flex'; document.getElementById('sidebar').style.display='flex'; }

// Темы
const savedTheme = localStorage.getItem('anya-theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.themeVal === savedTheme) btn.classList.add('active');
    btn.onclick = () => {
        const t = btn.dataset.themeVal;
        if (t === 'light') document.body.removeAttribute('data-theme');
        else document.body.setAttribute('data-theme', t);
        localStorage.setItem('anya-theme', t);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setTimeout(() => el.settingsModal.classList.remove('active'), 200);
    };
});

// Рендер
function renderProfiles() {
    el.profileSelect.innerHTML = '';
    state.profiles.forEach(p => {
        const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name;
        if (p.id === state.currentProfileId) opt.selected = true;
        el.profileSelect.appendChild(opt);
    });
    el.profileName.textContent = currentProfile()?.name || 'Гость';
}

function renderAvatar() {
    const p = currentProfile(); if (!p) return;
    if (p.avatar) { el.profileAvatar.style.backgroundImage = `url(${p.avatar})`; el.profileAvatar.textContent = ''; }
    else { el.profileAvatar.style.backgroundImage = 'none'; el.profileAvatar.textContent = '👤'; }
}

function renderHistory() {
    el.chatList.innerHTML = ''; const p = currentProfile(); if (!p) return;
    const sorted = [...p.chats].sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    sorted.forEach(c => {
        const row = document.createElement('div'); row.className = 'chat-item'; if (c.id === p.currentChatId) row.classList.add('active'); if (c.pinned) row.classList.add('pinned');
        
        const title = document.createElement('span'); title.className = 'chat-title'; title.textContent = c.title || 'Без названия';
        title.ondblclick = (e) => { e.stopPropagation(); const name = prompt('Название:', c.title); if (name) { c.title = name; saveState(); renderHistory(); } };
        
        const actions = document.createElement('div'); actions.className = 'chat-actions';
        const pinBtn = document.createElement('button'); pinBtn.textContent = c.pinned ? '📌' : '📍'; pinBtn.onclick = (e) => { e.stopPropagation(); c.pinned = !c.pinned; saveState(); renderHistory(); };
        const delBtn = document.createElement('button'); delBtn.textContent = '🗑'; delBtn.onclick = (e) => { e.stopPropagation(); if(p.chats.length===1) return alert('Нельзя удалить последний'); p.chats = p.chats.filter(x => x.id !== c.id); if(p.currentChatId === c.id) p.currentChatId = p.chats[0].id; saveState(); renderHistory(); renderChat(); };
        
        actions.append(pinBtn, delBtn); row.append(title, actions);
        row.onclick = () => { p.currentChatId = c.id; saveState(); renderHistory(); renderChat(); if(window.innerWidth < 768) el.sidebar.classList.remove('open'); };
        el.chatList.appendChild(row);
    });
}

function renderChat() {
    const c = currentChat(); if (!c) return;
    el.chatInner.innerHTML = '';
    if (c.messages.length === 0) {
        el.greeting.style.display = 'flex';
        el.chatInner.style.opacity = '0';
    } else {
        el.greeting.style.display = 'none';
        el.chatInner.style.opacity = '1';
        c.messages.forEach(m => addMsgToDOM(m.text, m.who, false));
    }
}

function renderAll() { renderProfiles(); renderHistory(); renderChat(); renderAvatar(); }

function addMsgToDOM(text, who, save = true) {
    el.greeting.style.display = 'none';
    el.chatInner.style.opacity = '1';
    const d = document.createElement('div'); d.className = `message ${who}`;
    d.textContent = text;
    el.chatInner.appendChild(d); el.chatInner.scrollTop = el.chatInner.scrollHeight;
    if (save) {
        const c = currentChat(); if (!c) return;
        c.messages.push({ who, text });
        if (who === 'user' && (c.title === 'Приветствие' || !c.title)) c.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        saveState(); renderHistory();
    }
}

// UI события
document.getElementById('open-sidebar-btn').onclick = () => el.sidebar.classList.add('open');
document.getElementById('close-sidebar-btn').onclick = () => el.sidebar.classList.remove('open');
document.getElementById('settingsBtn').onclick = () => el.settingsModal.classList.add('active');
document.getElementById('closeSettingsBtn').onclick = () => el.settingsModal.classList.remove('active');
el.settingsModal.onclick = (e) => { if (e.target === el.settingsModal) el.settingsModal.classList.remove('active'); };
document.getElementById('newChatBtn').onclick = () => {
    const p = currentProfile(); const cid = 'c'+Date.now();
    p.chats.push({ id: cid, title: 'Новый чат', pinned: false, messages: [] });
    p.currentChatId = cid; saveState(); renderHistory(); renderChat(); el.sidebar.classList.remove('open');
};
document.getElementById('logoutBtn').onclick = logout;
el.profileSelect.onchange = () => { state.currentProfileId = el.profileSelect.value; saveState(); renderAll(); };
document.getElementById('newProfileBtn').onclick = () => {
    const name = prompt('Имя профиля:'); if (!name) return;
    const pw = prompt('Пароль:'); if (!pw) return;
    const res = registerUser(name, pw); if (res.ok) renderAll(); else alert(res.error);
};
el.profileAvatar.onclick = () => el.avatarInput.click();
el.avatarInput.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const p = currentProfile(); if (!p) return; p.avatar = ev.target.result; saveState(); renderAvatar(); };
    reader.readAsDataURL(file);
};

// Режимы
document.querySelectorAll('.mode-select button').forEach(btn => {
    btn.onclick = () => {
        const chosen = btn.dataset.mode;
        if (chosen !== 'character') return alert('В разработке. Доступен только «Персонаж».');
        document.querySelectorAll('.mode-select button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mode = chosen; el.modePill.textContent = MODE_LABELS[mode];
    };
});

// Отправка
async function send() {
    const text = el.input.value.trim(); if (!text) return;
    addMsgToDOM(text, 'user'); el.input.value = ''; el.input.style.height = '48px'; el.sendBtn.disabled = true;
    // Индикатор печати
    const typing = document.createElement('div'); typing.className = 'message ai typing'; typing.innerHTML = '<span></span><span></span><span></span>';
    el.chatInner.appendChild(typing); el.chatInner.scrollTop = el.chatInner.scrollHeight;
    
    try {
        const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, mode }) });
        const data = await res.json();
        typing.remove();
        addMsgToDOM(data.reply, 'ai');
    } catch(e) {
        typing.remove();
        addMsgToDOM('Сервер не отвечает. Запусти python main.py', 'ai');
    } finally { el.sendBtn.disabled = false; }
}

el.sendBtn.onclick = send;
el.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
el.input.addEventListener('input', () => { el.input.style.height = 'auto'; el.input.style.height = Math.min(el.input.scrollHeight, 150) + 'px'; });

// Авторизация Форма
const authTabs = document.querySelectorAll('.auth-tab'); let authMode = 'login';
authTabs.forEach(t => { t.onclick = () => { authTabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); authMode = t.dataset.tab; document.getElementById('authSubmit').textContent = authMode === 'login' ? 'Войти' : 'Создать'; }; });
document.getElementById('authSubmit').onclick = () => {
    const name = document.getElementById('authName').value.trim();
    const pw = document.getElementById('authPassword').value;
    const res = authMode === 'login' ? loginUser(name, pw) : registerUser(name, pw);
    if (!res.ok) return document.getElementById('authError').textContent = res.error;
    document.getElementById('authError').textContent = ''; showWelcome();
};
document.getElementById('pwToggle').onclick = () => {
    const pw = document.getElementById('authPassword');
    pw.type = pw.type === 'password' ? 'text' : 'password';
};

// Стартовый экран
document.querySelectorAll('.welcome-card').forEach(card => {
    card.onclick = () => {
        if (card.dataset.mode !== 'character') return alert('В разработке. Доступен только «Персонаж».');
        state.started = true; saveState(); hideAll(); renderAll();
    };
});
// ==========================================
// 6. СИСТЕМА ОБНОВЛЕНИЙ (VERSION CONTROL)
// ==========================================
const AppUpdate = {
    CURRENT_VERSION: '1.0.0', 
    TARGET_VERSION: '3.0.0',  

    check: () => {
        const savedVersion = localStorage.getItem('anya_version');
        
        // 1. Если юзер зашел ВПЕРВЫЕ (savedVersion === null) — просто сохраняем версию и НЕ показываем окно
        if (savedVersion === null) {
            localStorage.setItem('anya_version', AppUpdate.TARGET_VERSION);
            return;
        }
        
        // 2. Если юзер уже был тут, и вышла НОВАЯ версия — показываем окно
        if (AppUpdate.TARGET_VERSION > savedVersion) {
            document.getElementById('newVersion').textContent = 'V' + AppUpdate.TARGET_VERSION;
            
            const modal = document.getElementById('updateModal');
            modal.classList.add('active');

            // Кнопка "Обновить"
            document.getElementById('applyUpdateBtn').onclick = () => {
                localStorage.setItem('anya_version', AppUpdate.TARGET_VERSION);
                modal.classList.remove('active');
                window.location.reload(); 
            };

            // Кнопка "Напомнить позже"
            document.getElementById('skipUpdateBtn').onclick = () => {
                modal.classList.remove('active');
            };
        }
    }
};

// Вызываем проверку при запуске
setTimeout(AppUpdate.check, 1500); 
// Инициализация
const sessionId = sessionStorage.getItem(SESSION_KEY);
if (sessionId && state.profiles.some(p => p.id === sessionId)) { state.currentProfileId = sessionId; state.started = false; saveState(); showWelcome(); }
else { showAuth(); }