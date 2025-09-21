const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api/v1';

/* Helpers */
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}
function onlyDigits(s) {
  return (s || '').replace(/\D/g, '');
}
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
}
function genCNPJ() {
  const rand = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10));
  const calc = (arr, weights) => {
    const sum = arr.reduce((a, d, i) => a + d * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const base = rand(8).concat([0, 0, 0, 1]); // 0001 = matriz
  const d1 = calc(base, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(base.concat([d1]), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return base.concat([d1, d2]).join('');
}

/* Erros amigáveis do backend (Zod/validação) */
const labelMap = {
  name: 'Nome',
  cnpj: 'CNPJ',
  code: 'Code',
  subdomain: 'Subdomínio',
  isActive: 'Ativa',
};
function extractErrorMessage(data) {
  if (!data || typeof data !== 'object') return 'Erro ao criar franquia.';
  // Tenta fieldErrors/formErrors do Zod
  const fe = data?.errors?.fieldErrors;
  const formErrors = data?.errors?.formErrors;

  const msgs = [];
  if (fe && typeof fe === 'object') {
    for (const key in fe) {
      const arr = fe[key];
      if (Array.isArray(arr) && arr.length) {
        const label = labelMap[key] ?? key;
        msgs.push(`${label}: ${arr[0]}`);
      }
    }
  }
  if (Array.isArray(formErrors) && formErrors.length) {
    msgs.push(...formErrors);
  }
  if (msgs.length) return msgs.join(' | ');

  // Fallback para message simples
  if (typeof data.message === 'string' && data.message.trim()) return data.message;

  return 'Erro ao criar franquia.';
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('franchiseForm');
  const status = document.getElementById('status');
  const btn = document.getElementById('submitBtn');
  const name = document.getElementById('name');
  const cnpj = document.getElementById('cnpj');
  const code = document.getElementById('code');
  const sub = document.getElementById('subdomain');
  const isActive = document.getElementById('isActive');

  const auth = getAuth();
  if (!auth?.token) {
    location.href = new URL('../../../login/index.html', location.href).href;
    return;
  }

  // Confirma se é ADMIN antes de permitir acesso
  try {
    const r = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (r.ok) {
      const { user } = await r.json();
      if (user.role !== 'ADMIN') {
        alert('Apenas ADMIN pode acessar esta página.');
        location.href = new URL('../../../welcome/bemVindo.html', location.href).href;
        return;
      }
    }
  } catch {
    // Se falhar, segue; o backend ainda vai barrar no POST
  }

  // Sugerir code/subdomain com base no nome (se vazios)
  name.addEventListener('blur', () => {
    if (!code.value.trim()) code.value = slugify(name.value);
    if (!sub.value.trim()) sub.value = slugify(name.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.classList.add('hidden');
    status.classList.remove('warn');
    btn.disabled = true;

    const body = {
      name: name.value.trim(),
      cnpj: String(onlyDigits(cnpj.value)),
      isActive: !!isActive.checked,
    };
    console.log('cnpj no payload:', body.cnpj, typeof body.cnpj);
    if (code.value.trim()) body.code = code.value.trim().toLowerCase();
    if (sub.value.trim()) body.subdomain = sub.value.trim().toLowerCase();

    try {
      const r = await fetch(`${API_BASE_URL}/franchises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const msg = extractErrorMessage(data);
        status.textContent = msg;
        status.classList.remove('hidden');
        status.classList.add('warn');
        return;
      }

      // Sucesso
      status.textContent = `Franquia criada: ${data.franchise?.name} (${data.franchise?.code || '-'})`;
      status.classList.remove('hidden');
      form.reset();
      isActive.checked = true;
    } catch {
      status.textContent = 'Falha de conexão.';
      status.classList.remove('hidden');
      status.classList.add('warn');
    } finally {
      btn.disabled = false;
    }
  });

  // Botão para gerar CNPJ válido (teste)
  document.getElementById('genCnpjBtn')?.addEventListener('click', () => {
    const el = document.getElementById('cnpj');
    if (!el) return;
    el.value = genCNPJ();
    el.focus();
  });
});