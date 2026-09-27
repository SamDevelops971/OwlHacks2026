// ---------- Small fetch helpers shared across pages ----------

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

async function getSession() {
  const data = await apiGet('/api/session');
  return data.user; // null if not logged in
}

async function apiLogin(email, password) {
  return apiPost('/api/login', { email, password });
}

async function apiSignup(username, email, password) {
  return apiPost('/api/signup', { username, email, password });
}

async function apiLogout() {
  await apiPost('/api/logout');
  window.location.href = '/';
}

async function renderComposeBox(user) {
  const posting = document.getElementById("compose-box");
  const loginPrompt = document.getElementById("compose-login-prompt");

  if (!posting || !loginPrompt) {
    return;
  }
  
  posting.style.display = user ? 'block' : 'none'; //Shows different post block depending on login status
  loginPrompt.style.display = user ? "none" : "block";
}

async function composeHelper() {
  const user = await getSession();
  renderComposeBox(user);
}


// Renders the login/username area in the top bar. Every page includes this.
async function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (!el) return null;
  const user = await getSession();
  if (user) {
    el.innerHTML = `
      <span class="username-tag">u/${user.username}</span>
      <button class="btn-secondary" id="logoutBtn">Log Out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', apiLogout);
  } else {
    el.innerHTML = `<a href="/login.html" class="btn-primary">Log In</a>`;
  }
  return user;
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const units = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

async function Authenticator() {
  const user = await getSession();
  renderAuthArea(user);
  renderComposeBox(user);
}

Authenticator();

