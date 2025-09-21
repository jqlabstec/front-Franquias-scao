const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{ return null; } }
function qs(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function extractErrorMessage(data){
  const fe = data?.errors?.fieldErrors; const formErrors = data?.errors?.formErrors; const msgs = [];
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
  const id = Number(qs('id'));
  if(!id){ alert('ID inválido'); location.href = '../index/index.html'; return; }

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
  const saveBtn = document.getElementById('saveBtn');

  // me
  let me;
  try{
    const r = await fetch(`${API_BASE_URL}/auth/me`, { headers:{ Authorization:`Bearer ${auth.token}` }});
    if(r.ok){ me = (await r.json()).user; } else { throw new Error(); }
  }catch{ location.href='../../../login/index.html'; return; }

  // Preparar UI de franquia
  let visibleFranchises = [];
  if (me.role === 'ADMIN') {
    franchiseField.style.display = 'block';
    franchiseId.innerHTML = '';
    try{
      visibleFranchises = await loadFranchises(auth.token);
      if (visibleFranchises.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhuma franquia disponível';
        franchiseId.appendChild(opt);
      } else {
        visibleFranchises.forEach(f=>{
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
    // FO/EMPLOYEE não escolhem franquia
    franchiseField.style.display = 'none';
  }

  // Carregar usuário
  try{
    const r = await fetch(`${API_BASE_URL}/users/${id}`, { headers:{ Authorization:`Bearer ${auth.token}` }});
    const data = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(data?.message || 'Falha ao carregar usuário');

    const u = data.user;
    name.value = u.name;
    email.value = u.email;
    role.value = u.role;
    isActive.checked = !!u.isActive;

    // ADMIN: selecionar a franquia do usuário se estiver na lista visível
    if (me.role === 'ADMIN' && u.franchiseId) {
      const hasOption = Array.from(franchiseId.options).some(o => Number(o.value) === Number(u.franchiseId));
      if (hasOption) franchiseId.value = String(u.franchiseId);
    }

    // Evitar auto-desativação visualmente
    if (me.id === u.id) {
      isActive.disabled = true;
    }

    // FO/EMPLOYEE não podem definir ADMIN
    if (me.role !== 'ADMIN') {
      const adminOpt = role.querySelector('option[value="ADMIN"]');
      if (adminOpt) adminOpt.disabled = true;
    }
  }catch(e){
    alert(e.message || 'Erro');
    location.href='../index/index.html';
    return;
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.classList.add('hidden'); status.classList.remove('warn');
    saveBtn.disabled = true;

    const body = {
      name: name.value.trim(),
      email: email.value.trim(),
      role: role.value,
      isActive: !!isActive.checked,
    };
    if (password.value.trim()) body.password = password.value.trim();
    if (me.role === 'ADMIN') body.franchiseId = Number(franchiseId.value || 0);

    try{
      const r = await fetch(`${API_BASE_URL}/users/${id}`, {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${auth.token}` },
        body: JSON.stringify(body)
      });
      const data = await r.json().catch(()=> ({}));
      if(!r.ok){
        status.textContent = extractErrorMessage(data);
        status.classList.remove('hidden'); status.classList.add('warn');
        return;
      }
      status.textContent = 'Usuário atualizado com sucesso';
      status.classList.remove('hidden');
      password.value = '';
    }catch{
      status.textContent = 'Falha de conexão';
      status.classList.remove('hidden'); status.classList.add('warn');
    }finally{
      saveBtn.disabled = false;
    }
  });
});