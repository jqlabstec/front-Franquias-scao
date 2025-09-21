const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api/v1';
const PAGE_SIZE = 10;

function getAuth(){
  try{
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  }catch{ return null; }
}
function fmtDate(d){
  const dt = new Date(d);
  return isNaN(+dt) ? '—' : dt.toLocaleString();
}

function buildQuery(state){
  const p = new URLSearchParams();
  p.set('page', state.page);
  p.set('pageSize', PAGE_SIZE);
  if (state.q) p.set('q', state.q);
  if (state.role) p.set('role', state.role);
  if (state.active !== '') p.set('isActive', state.active);
  return p.toString();
}

async function fetchUsers(state, token){
  const r = await fetch(`${API_BASE_URL}/users?${buildQuery(state)}`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar usuários');
  return data;
}

async function patchUser(id, body, token){
  const r = await fetch(`${API_BASE_URL}/users/${id}`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao atualizar usuário');
  return data;
}

function renderRows(items, me, token, reload){
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  if(!Array.isArray(items) || items.length===0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8; td.className = 'muted'; td.textContent = 'Sem resultados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  items.forEach(u=>{
    // Nome da franquia: tenta principal, senão primeira do pivot (se vier no payload)
    const franchiseName =
      (u.franchise?.name) ??
      (Array.isArray(u.userFranchises) && u.userFranchises[0]?.franchise?.name) ??
      u.franchiseId ?? '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${franchiseName}</td>
      <td>${u.isActive ? '<span class="pill ok">Ativo</span>' : '<span class="pill no">Inativo</span>'}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>
        <a class="link" href="../edit/index.html?id=${u.id}">Editar</a>
        ${me.id !== u.id ? ` | <span class="link switch" data-id="${u.id}" data-active="${u.isActive ? 1 : 0}">${u.isActive ? 'Desativar' : 'Reativar'}</span>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.switch').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = Number(el.getAttribute('data-id'));
      const isActive = el.getAttribute('data-active') === '1';
      try{
        await patchUser(id, { isActive: !isActive }, token);
        reload();
      }catch(e){ alert(e.message || 'Falha ao alternar ativo'); }
    });
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth();
  if(!auth?.token){
    location.href = new URL('../../../login/index.html', location.href).href;
    return;
  }

  // me
  let me = null;
  try{
    const r = await fetch(`${API_BASE_URL}/auth/me`, { headers:{ Authorization:`Bearer ${auth.token}` } });
    if(r.ok){
      me = (await r.json()).user;
    } else {
      throw new Error();
    }
    if(me.role === 'EMPLOYEE'){
      alert('Somente ADMIN/FRANCHISE_OWNER');
      location.href = new URL('../../../welcome/bemVindo.html', location.href).href;
      return;
    }
  }catch{
    location.href = new URL('../../../login/index.html', location.href).href;
    return;
  }

  const status = document.getElementById('status');
  const q = document.getElementById('q');
  const role = document.getElementById('role');
  const active = document.getElementById('active');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');
  const clearBtn = document.getElementById('clearBtn');

  let state = { q:'', role:'', active:'', page:1 };

  async function load(){
    status.classList.add('hidden'); status.classList.remove('warn');
    try{
      const data = await fetchUsers(state, auth.token);

      // Filtro visual extra para FRANCHISE_OWNER (fallback até o backend estar 100%):
      if (me.role === 'FRANCHISE_OWNER') {
        const fid = me.franchiseId;
        const filtered = Array.isArray(data.items) ? data.items.filter(u => {
          const principalOk = (u.franchiseId === fid) || (u.franchise?.id === fid);
          const pivotOk = Array.isArray(u.userFranchises)
            ? u.userFranchises.some(uf => (uf.franchiseId === fid) || (uf.franchise?.id === fid))
            : false;
          return principalOk || pivotOk;
        }) : [];

        data.items = filtered;
        // Congela paginação para evitar confusão (poderemos remover quando o backend estiver filtrando)
        data.pageInfo.totalItems = filtered.length;
        data.pageInfo.totalPages = 1;
        data.pageInfo.hasPrev = false;
        data.pageInfo.hasNext = false;
        data.pageInfo.page = 1;
      }

      renderRows(data.items, me, auth.token, load);
      const pi = data.pageInfo;
      pageInfo.textContent = `Página ${pi.page} de ${pi.totalPages} — ${pi.totalItems} itens`;
      prevBtn.disabled = !pi.hasPrev; nextBtn.disabled = !pi.hasNext;
    }catch(e){
      document.getElementById('tbody').innerHTML = '<tr><td colspan="8" class="muted">Sem resultados</td></tr>';
      status.textContent = e.message || 'Erro ao carregar';
      status.classList.remove('hidden'); status.classList.add('warn');
      pageInfo.textContent = '-'; prevBtn.disabled = nextBtn.disabled = true;
    }
  }

  document.getElementById('filterForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    state.q = q.value.trim();
    state.role = role.value;
    state.active = active.value;
    state.page = 1;
    load();
  });

  clearBtn.addEventListener('click', ()=>{
    q.value=''; role.value=''; active.value='';
    state = { q:'', role:'', active:'', page:1 };
    load();
  });

  prevBtn.addEventListener('click', ()=>{
    if(state.page>1){ state.page--; load(); }
  });
  nextBtn.addEventListener('click', ()=>{
    state.page++; load();
  });

  load();
});