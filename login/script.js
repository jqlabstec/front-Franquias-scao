// Ajuste aqui para o endereço da sua API
const API_BASE_URL = 'http://localhost:3000/api/v1';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const pwdInput = document.getElementById('password');
const emailErr = document.getElementById('emailError');
const pwdErr = document.getElementById('passwordError');
const formError = document.getElementById('formError');
const remember = document.getElementById('remember');
const submitBtn = document.getElementById('submitBtn');
const togglePwd = document.getElementById('togglePwd');

const iconEye = document.getElementById('icon-eye');
const iconEyeSlash = document.getElementById('icon-eye-slash');

togglePwd.addEventListener('click', () => {
  const isPwd = pwdInput.type === 'password';
  pwdInput.type = isPwd ? 'text' : 'password';

  // ✅ Alterna a visibilidade dos ícones
  if (isPwd) {
    // Se era senha e agora é texto, mostre o ícone "slash"
    iconEye.classList.add('hidden');
    iconEyeSlash.classList.remove('hidden');
  } else {
    // Se era texto e agora é senha, mostre o ícone de olho normal
    iconEye.classList.remove('hidden');
    iconEyeSlash.classList.add('hidden');
  }

  // ✅ PONTO CHAVE: Devolve o foco ao campo para manter o estilo
  pwdInput.focus();
});

// foco inicial
window.addEventListener('DOMContentLoaded', () => emailInput?.focus());

function storage() {
  return remember.checked ? localStorage : sessionStorage;
}
function setAuth(auth) {
  storage().setItem('auth', JSON.stringify(auth));
}
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

async function tryRedirectIfLogged() {
  const auth = getAuth();
  if (!auth?.token) return;
  try {
    const r = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (r.ok) window.location.replace('../welcome/bemVindo.html');
  } catch {}
}
tryRedirectIfLogged();

function validate() {
  let ok = true;
  emailErr.textContent = '';
  pwdErr.textContent = '';
  formError.classList.add('hidden');
  formError.textContent = '';

  const email = emailInput.value.trim();
  const pwd = pwdInput.value;

  if (!email) {
    emailErr.textContent = 'Informe seu e-mail.';
    ok = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    emailErr.textContent = 'E-mail inválido.';
    ok = false;
  }
  if (!pwd || pwd.length < 6) {
    pwdErr.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    ok = false;
  }
  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';

  try {
    const resp = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: pwdInput.value
      })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.message || 'Falha ao autenticar.');
    }

    const data = await resp.json(); // { token, user: { ... } }
    setAuth(data);
    window.location.replace('../welcome/bemVindo.html');
  } catch (err) {
    formError.textContent = err.message || 'Erro inesperado.';
    formError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});