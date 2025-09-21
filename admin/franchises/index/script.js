const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api/v1';
const PAGE_SIZE = 10;

function getAuth(){
  try{
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  }catch{ return null; }
}
function formatCNPJ(s){
  const v = (s || '').replace(/\D/g, '').slice(0,14);
  return v.replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2');
}
function fmtDate(d){
  try{
    const dt = new Date(d);
    if (isNaN(+dt)) return '—';
    return dt.toLocaleString();
  }catch{ return '—'; }
}
function buildQuery({ q, from, to, page }){
  const params = new URLSearchParams();
  params.set('page', String(page || 1));
  params.set('pageSize', String(PAGE_SIZE));
  if (q && q.trim()) params.set('q', q.trim());
  if (from) params.set('createdFrom', new Date(`${from}T00:00:00`).toISOString());
  if (to) params.set('createdTo', new Date(`${to}T23:59:59.999`).toISOString());
  return params.toString();
}

async function fetchFranchises({ q, from, to, page }, token){
  const qs = buildQuery({ q, from, to, page });
  const r = await fetch(`${API_BASE_URL}/franchises?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) {
    const msg = data?.message || 'Falha ao carregar franquias.';
    throw new Error(msg);
  }
  return data;
}

function renderRows(list){
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7; td.className = 'muted'; td.textContent = 'Sem resultados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  list.forEach(f=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.name ?? '—'}</td>
      <td>${formatCNPJ(f.cnpj)}</td>
      <td>${f.code ?? '—'}</td>
      <td>${f.subdomain ?? '—'}</td>
      <td>${f.isActive ? '<span class="pill ok">Ativa</span>' : '<span class="pill no">Inativa</span>'}</td>
      <td>${fmtDate(f.createdAt)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setPager(info){
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (!info) {
    pageInfo.textContent = '-';
    prevBtn.disabled = nextBtn.disabled = true;
    return;
  }
  pageInfo.textContent = `Página ${info.page} de ${info.totalPages} — ${info.totalItems} itens`;
  prevBtn.disabled = !info.hasPrev;
  nextBtn.disabled = !info.hasNext;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth();
  if(!auth?.token){
    location.href = new URL('../../../login/index.html', location.href).href;
    return;
  }

  // Opcional: só ADMIN
  try{
    const me = await fetch(`${API_BASE_URL}/auth/me`, { headers:{ Authorization:`Bearer ${auth.token}` }});
    if(me.ok){
      const { user } = await me.json();
      if(user.role !== 'ADMIN'){
        alert('Apenas ADMIN pode acessar esta página.');
        location.href = new URL('../../../welcome/bemVindo.html', location.href).href;
        return;
      }
    }
  }catch{}

  const status = document.getElementById('status');
  const form = document.getElementById('filterForm');
  const qInput = document.getElementById('q');
  const fromInput = document.getElementById('from');
  const toInput = document.getElementById('to');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const clearBtn = document.getElementById('clearBtn');

  let state = { q: '', from: '', to: '', page: 1 };

  async function load(){
    status.classList.add('hidden'); status.classList.remove('warn');
    try{
      const data = await fetchFranchises(state, auth.token);
      renderRows(data.items);
      setPager(data.pageInfo);
    }catch(e){
      renderRows([]);
      status.textContent = e.message || 'Erro ao carregar franquias.';
      status.classList.remove('hidden'); status.classList.add('warn');
      setPager(null);
    }
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    state.q = qInput.value;
    state.from = fromInput.value;
    state.to = toInput.value;
    state.page = 1;
    load();
  });

  clearBtn.addEventListener('click', ()=>{
    qInput.value = '';
    fromInput.value = '';
    toInput.value = '';
    state = { q: '', from: '', to: '', page: 1 };
    load();
  });

  prevBtn.addEventListener('click', ()=>{
    if (state.page > 1) { state.page--; load(); }
  });
  nextBtn.addEventListener('click', ()=>{
    state.page++; load();
  });

  // Primeira carga
  load();
});