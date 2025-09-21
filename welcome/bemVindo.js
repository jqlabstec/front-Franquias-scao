// Ajuste aqui para o endereço da sua API
const API_BASE_URL = 'http://localhost:3000/api/v1';

const nameEl = document.getElementById('userName');
const emailEl = document.getElementById('userEmail');
const roleEl = document.getElementById('userRole');
const fidEl = document.getElementById('franchiseId');
const fnameEl = document.getElementById('franchiseName');
const statusEl = document.getElementById('status');
const logoutBtn = document.getElementById('logout');
const checkDbBtn = document.getElementById('checkDb');

function getAuth() {
  try {
    return (
      JSON.parse(localStorage.getItem('auth')) ||
      JSON.parse(sessionStorage.getItem('auth'))
    );
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem('auth');
  sessionStorage.removeItem('auth');
  window.location.replace('../login/index.html');;
}

logoutBtn.addEventListener('click', logout);

async function requireSession() {
  const auth = getAuth();
  if (!auth?.token) {
    logout();
    return;
  }

  // Tenta validar no backend e preencher dados
  try {
    const r = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!r.ok) throw new Error('Sessão expirada');

    const me = await r.json(); // { user: { id, email, role, franchiseId } }

    // Preenche UI
    nameEl.textContent = auth?.user?.franchiseName ? `, ${auth.user.franchiseName}` : '';
    emailEl.textContent = me.user.email;
    roleEl.textContent = me.user.role;
    fidEl.textContent = me.user.franchiseId;
    fnameEl.textContent = auth?.user?.franchiseName || '—';

    statusEl.textContent = 'Sessão válida ✅';
    statusEl.classList.remove('hidden', 'warn');
  } catch (e) {
    statusEl.textContent = 'Sessão inválida ou expirada. Faça login novamente.';
    statusEl.classList.remove('hidden');
    statusEl.classList.add('warn');
    setTimeout(logout, 1500);
  }
}

checkDbBtn.addEventListener('click', async () => {
  try {
    const r = await fetch(`${API_BASE_URL}/health`);
    const ok = r.ok ? 'OK' : 'ERRO';
    statusEl.textContent = `Healthcheck: ${ok}`;
    statusEl.classList.remove('hidden');
  } catch {
    statusEl.textContent = 'Falha ao contatar API.';
    statusEl.classList.remove('hidden');
    statusEl.classList.add('warn');
  }
});

requireSession();