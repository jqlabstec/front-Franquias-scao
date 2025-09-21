const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{ return null; } }

function extractErrorMessage(data){
  const fe = data?.errors?.fieldErrors; const formErrors = data?.errors?.formErrors;
  const msgs = [];
  if (fe && typeof fe === 'object') for (const k in fe){ const arr = fe[k]; if (Array.isArray(arr) && arr.length) msgs.push(`${k}: ${arr[0]}`); }
  if (Array.isArray(formErrors) && formErrors.length) msgs.push(...formErrors);
  return msgs.length ? msgs.join(' | ') : (data?.message || 'Erro');
}

async function loadFranchises(token){
  const r = await fetch(`${API_BASE_URL}/franchises/select`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar franquias');
  return data.items || [];
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth();
  if(!auth?.token){ location.href = new URL('../../../login/index.html', location.href).href; return; }

  const form = document.getElementById('userForm');
  const status = document.getElementById('status');
  const name = document.getElementById('name');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const role = document.getElementById('role');
  const isActive = document.getElementById('isActive');
  const franchiseField = document.getElementById('franchiseField');
  const franchiseId = document.getElementById('franchiseId');
  const btn = document.getElementById('submitBtn');

  // me
  let me;
  try{
    const r = await fetch(`${API_BASE_URL}/auth/me`, { headers:{ Authorization:`Bearer ${auth.token}` }});
    if(r.ok){ me = (await r.json()).user; } else { throw new Error(); }
  }catch{ location.href = new URL('../../../login/index.html', location.href).href; return; }

  // Permissões visuais
  if (me.role !== 'ADMIN') {
    // FO/EMPLOYEE não escolhem ADMIN
    const adminOpt = role.querySelector('option[value="ADMIN"]');
    if (adminOpt) adminOpt.disabled = true;
  }

  // Carregar franquias conforme escopo e exibir seletor apenas para ADMIN
  if (me.role === 'ADMIN') {
    franchiseField.style.display = 'block';
    franchiseId.innerHTML = '';
    try{
      const items = await loadFranchises(auth.token);
      if (items.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhuma franquia disponível';
        franchiseId.appendChild(opt);
      } else {
        items.forEach(f=>{
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = `${f.name} (#${f.id})`;
          franchiseId.appendChild(opt);
        });
      }
    }catch(e){
      console.warn(e);
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Erro ao carregar franquias';
      franchiseId.appendChild(opt);
    }
  } else {
    // FO/EMPLOYEE: não escolhe franquia; backend força a própria
    franchiseField.style.display = 'none';
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.classList.add('hidden'); status.classList.remove('warn');
    btn.disabled = true;

    const body = {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
      isActive: !!isActive.checked,
    };

    // ADMIN envia franchiseId; demais não enviam (backend usa a franquia do usuário autenticado)
    if (me.role === 'ADMIN') {
      body.franchiseId = Number(franchiseId.value || 0);
    }

    try{
      const r = await fetch(`${API_BASE_URL}/users`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${auth.token}` },
        body: JSON.stringify(body)
      });
      const data = await r.json().catch(()=> ({}));
      if(!r.ok){
        status.textContent = extractErrorMessage(data);
        status.classList.remove('hidden'); status.classList.add('warn');
        return;
      }
      status.textContent = `Usuário criado: ${data.user?.name} (${data.user?.email})`;
      status.classList.remove('hidden');
      form.reset();
      // valores padrão
      isActive.checked = true;
      role.value = 'EMPLOYEE';
      if (me.role === 'ADMIN' && franchiseId.options.length > 0) franchiseId.selectedIndex = 0;
    }catch{
      status.textContent = 'Falha de conexão'; status.classList.remove('hidden'); status.classList.add('warn');
    }finally{
      btn.disabled = false;
    }
  });
});