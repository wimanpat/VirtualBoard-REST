const AUTH_API   = 'https://virtualboard-438y.onrender.com';   
const BOARDS_API = 'https://virtualboard-rest.onrender.com';

let token = null, currentUser = null, boardIds = [], currentBoardId = null;
const notes = new Map();
let pollTimer = null, lastSince = null;

const $ = (s) => document.querySelector(s);
const showToast = (t, ms = 1800) => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = t; 
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
};

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    }
  });
  const txt = await res.text();
  if (!res.ok) {
    let msg = txt;
    try { msg = JSON.parse(txt).error; } catch {}
    throw new Error(res.status + ' ' + msg);
  }
  try { return JSON.parse(txt); } catch { return txt; }
}

// UI-element
const loginCard = $('#loginCard'), appCard = $('#appCard');
const loginBtn = $('#loginBtn'), registerBtn = $('#registerBtn');
const userLbl = $('#userLbl'), logoutBtn = $('#logoutBtn');
const boardSelect = $('#boardSelect'), canvas = $('#canvas'), loginMsg = $('#loginMsg');

function showApp() {
  loginCard.hidden = true; 
  appCard.hidden = false; 
  logoutBtn.hidden = false;
  userLbl.textContent = (currentUser && currentUser.username) ? currentUser.username : '';
  const grid = document.querySelector('.grid');
  if (grid) grid.classList.add('app-only');
}
function showLogin(msg = '') {
  loginCard.hidden = false; 
  appCard.hidden = true; 
  logoutBtn.hidden = true;
  userLbl.textContent = '';
  const grid = document.querySelector('.grid');
  if (grid) grid.classList.remove('app-only');
  if (msg) loginMsg.textContent = msg;
}

// Auth
loginBtn.addEventListener('click', async () => {
  try {
    const body = { username: $('#username').value, password: $('#password').value };
    const data = await api(AUTH_API + '/login', { method: 'POST', body: JSON.stringify(body) });
    token = data.accessToken || data.token;
    currentUser = data.user; 
    boardIds = data.boardIds || [];
    await loadBoards(); 
    showApp(); 
    showToast('Inloggad');
  } catch (e) { 
    loginMsg.textContent = 'Fel: ' + e.message; 
  }
});

registerBtn.addEventListener('click', async () => {
  try {
    const body = { username: $('#username').value, password: $('#password').value };
    await api(AUTH_API + '/register', { method: 'POST', body: JSON.stringify(body) });
    loginMsg.textContent = 'Registrerad! Logga in nu.'; 
    showToast('Registrerad');
  } catch (e) { 
    loginMsg.textContent = 'Fel: ' + e.message; 
  }
});

logoutBtn.addEventListener('click', () => {
  token = null; currentUser = null; boardIds = []; currentBoardId = null;
  notes.clear(); 
  if (canvas) canvas.innerHTML = ''; 
  stopPolling(); 
  showLogin('Utloggad.');
});

// Boards
async function loadBoards() {
  const boards = await api(AUTH_API + '/boards');
  boardSelect.innerHTML = '';
  (boards.boards || []).forEach((b) => {
    if (boardIds.indexOf(b.id) === -1) return;
    const opt = document.createElement('option'); 
    opt.value = String(b.id); 
    opt.textContent = b.title || ('Board #' + b.id);
    boardSelect.appendChild(opt);
  });
  if (boardSelect.options.length) {
    currentBoardId = parseInt(boardSelect.value, 10);
    await loadNotes(); 
    startPolling();
  }
}

boardSelect.addEventListener('change', async (e) => {
  currentBoardId = parseInt(e.target.value, 10); 
  await loadNotes(); 
  restartPolling();
});

// Notes
function colorHex(c) {
  if (c === 'pink') return '#ffd1e8';
  if (c === 'blue') return '#cfe5ff';
  if (c === 'green') return '#d5ffd9';
  return '#fff6a9';
}

function renderNote(n) {
  const el = document.createElement('div'); 
  el.className = 'note'; 
  el.dataset.id = String(n.id);
  el.style.left = n.x + 'px'; 
  el.style.top = n.y + 'px'; 
  el.style.width = n.width + 'px'; 
  el.style.height = n.height + 'px'; 
  el.style.zIndex = String(n.zIndex || 1);
  el.style.background = colorHex(n.color);
  el.innerHTML =
    '<div class="head">' +
      '<span class="pill">#' + n.id + '</span>' +
      '<div class="colors">' +
        '<div class="dot" data-c="yellow" style="background:#fff6a9"></div>' +
        '<div class="dot" data-c="pink" style="background:#ffd1e8"></div>' +
        '<div class="dot" data-c="blue" style="background:#cfe5ff"></div>' +
        '<div class="dot" data-c="green" style="background:#d5ffd9"></div>' +
      '</div>' +
      '<button data-del class="btn" style="margin-left:8px;padding:2px 6px;">🗑</button>' +
    '</div>' +
    '<div class="body"><textarea>' + (n.content || '') + '</textarea></div>';

  // färg
  el.querySelectorAll('.dot').forEach((d) => {
    d.addEventListener('click', () => {
      const c = d.getAttribute('data-c');
      el.style.background = colorHex(c);
      saveNote(n.id, { color: c });
    });
  });

  // text
  el.querySelector('textarea').addEventListener('change', (ev) => {
    saveNote(n.id, { content: ev.target.value });
  });

  // delete
  el.querySelector('[data-del]').addEventListener('click', async () => {
    await api(BOARDS_API + '/api/notes/' + n.id, { method: 'DELETE' });
    el.remove(); 
    notes.delete(n.id); 
    showToast('Raderad');
  });

  // drag
  let sx, sy, sl, st;
  const onMove = (ev) => {
    el.style.left = (sl + (ev.clientX - sx)) + 'px';
    el.style.top  = (st + (ev.clientY - sy)) + 'px';
  };
  const onUp = () => {
    el.classList.remove('drag');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const all = document.querySelectorAll('.note');
    let maxZ = 1;
    all.forEach((nd) => { const z = parseInt(nd.style.zIndex || '1', 10); if (z > maxZ) maxZ = z; });
    const newZ = maxZ + 1;
    el.style.zIndex = String(newZ);
    saveNote(n.id, { x: Math.round(el.offsetLeft), y: Math.round(el.offsetTop), zIndex: newZ });
  };
  el.addEventListener('mousedown', (ev) => {
    if (ev.target && ev.target.tagName === 'TEXTAREA') return;
    el.classList.add('drag'); 
    sx = ev.clientX; sy = ev.clientY; 
    sl = el.offsetLeft; st = el.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  canvas.appendChild(el);
}

async function loadNotes() {
  const data = await api(BOARDS_API + '/api/notes?boardId=' + encodeURIComponent(currentBoardId));
  if (canvas) canvas.innerHTML = '';
  notes.clear();
  (data.notes || []).forEach((n) => { 
    notes.set(n.id, n); 
    renderNote(n); 
  });
  lastSince = new Date().toISOString();
}

async function saveNote(id, patch) {
  try {
    const data = await api(BOARDS_API + '/api/notes/' + id, { method: 'PATCH', body: JSON.stringify(patch) });
    notes.set(id, data.note);
  } catch (e) {
    console.error(e);
  }
}

$('#newNoteBtn').addEventListener('click', async () => {
  const body = { boardId: currentBoardId, content: 'Ny lapp', x: 100, y: 100 };
  const data = await api(BOARDS_API + '/api/notes', { method: 'POST', body: JSON.stringify(body) });
  notes.set(data.note.id, data.note); 
  renderNote(data.note);
});

// Polling
function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const url = BOARDS_API + '/api/notes/changes?boardId=' + encodeURIComponent(currentBoardId) + '&since=' + encodeURIComponent(lastSince || '');
      const data = await api(url);
      if (data.notes && data.notes.length) {
        for (const n of data.notes) {
          notes.set(n.id, n);
          const sel = ".note[data-id='" + n.id + "']";
          const existing = document.querySelector(sel);
          if (existing) existing.remove();
          renderNote(n);
        }
        lastSince = new Date().toISOString();
      }
    } catch (e) {
    }
  }, 2000);
}
function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
function restartPolling() { stopPolling(); startPolling(); }
