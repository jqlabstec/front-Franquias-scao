const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
const PAGE_SIZE = 15;

function getAuth(){
  try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }
  catch{ return null; }
}

function buildQuery(state){
  const p = new URLSearchParams();
  p.set('page', state.page);
  p.set('pageSize', PAGE_SIZE);
  if (state.q) p.set('query', state.q); // ✅ MUDOU: 'q' → 'query'
  // Removido 'onlyBelowMin' pois não existe no controller de produtos
  return p.toString();
}

async function fetchItems(state, token){
  const r = await fetch(`${API}/products?${buildQuery(state)}`, { // ✅ MUDOU: /inventory/items → /products
    headers:{ Authorization:`Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data;
}

function fmt(n, decimals=3){
  if (n == null) return '—';
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}
function fmtMoney(n){ return n==null ? '—' : Number(n).toLocaleString(undefined, { style:'currency', currency:'BRL' }); }
function fmtDate(d){ const dt = new Date(d); return isNaN(+dt) ? '—' : dt.toLocaleString(); }

function renderRows(items){
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  if(!Array.isArray(items) || items.length===0){
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'muted'; td.textContent = 'Sem resultados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  for (const it of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.name ?? `#${it.id}`}</td>
      <td>${it.code ?? '—'}</td>
      <td>${it.unitOfMeasure ?? '—'}</td>
      <td>${fmtMoney(it.currentCostPerUnit)}</td>
      <td>${it.ncm ?? '—'}</td>
      <td>${fmtDate(it.updatedAt)}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  const status = document.getElementById('status');
  const q = document.getElementById('q');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');
  const clearBtn = document.getElementById('clearBtn');

  let state = { q:'', page:1 };

  async function load(){
    status.classList.add('hidden'); status.classList.remove('warn');
    try{
      const data = await fetchItems(state, auth.token);
      renderRows(data.items);
      
      // ✅ MUDOU: Estrutura da paginação
      const pagination = data.pagination;
      pageInfo.textContent = `Página ${pagination.page} de ${pagination.pageCount} — ${pagination.total} produtos`;
      prevBtn.disabled = !pagination.hasPreviousPage;
      nextBtn.disabled = !pagination.hasNextPage;
    }catch(e){
      document.getElementById('tbody').innerHTML = '<tr><td colspan="6" class="muted">Sem resultados</td></tr>';
      status.textContent = e.message || 'Erro ao carregar';
      status.classList.remove('hidden'); status.classList.add('warn');
      pageInfo.textContent = '-'; prevBtn.disabled = nextBtn.disabled = true;
    }
  }

  document.getElementById('filterForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    state.q = q.value.trim();
    state.page = 1;
    load();
  });
  
  clearBtn.addEventListener('click', ()=>{ 
    q.value=''; 
    state={ q:'', page:1 }; 
    load(); 
  });
  
  prevBtn.addEventListener('click', ()=>{ 
    if(state.page>1){ 
      state.page--; 
      load(); 
    }
  });
  
  nextBtn.addEventListener('click', ()=>{ 
    state.page++; 
    load(); 
  });

  load();
});