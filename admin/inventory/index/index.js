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
  if (state.q) p.set('query', state.q);
  return p.toString();
}

async function fetchItems(state, token){
  const r = await fetch(`${API}/products?${buildQuery(state)}`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data;
}

function fmt(n, decimals=2){
  if (n == null) return '—';
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

function fmtMoney(n){ 
  return n==null ? '—' : Number(n).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); 
}

function fmtDate(d){ 
  const dt = new Date(d); 
  return isNaN(+dt) ? '—' : dt.toLocaleDateString('pt-BR'); 
}

function renderRows(items){
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  
  if(!Array.isArray(items) || items.length===0){
    const tr = document.createElement('tr'); 
    const td = document.createElement('td');
    td.colSpan = 9;
    td.className = 'muted'; 
    td.textContent = 'Sem resultados';
    tr.appendChild(td); 
    tbody.appendChild(tr); 
    return;
  }
  
  for (const it of items){
    const tr = document.createElement('tr');
    
    // ✅ Verificar se está abaixo do mínimo
    const isBelowMin = it.minQty && it.currentQty != null && Number(it.currentQty) < Number(it.minQty);
    if (isBelowMin) {
      tr.style.backgroundColor = '#fee2e2';
    }
    
    tr.innerHTML = `
      <td class="text-left"><strong>${it.name ?? `#${it.id}`}</strong></td>
      <td>${it.code ?? '—'}</td>
      <td>${it.unitOfMeasure ?? '—'}</td>
      <td class="text-right">${fmt(it.currentQty, 2)}</td>
      <td class="text-right">${fmt(it.minQty, 2)}</td>
      <td class="text-right">${fmtMoney(it.currentCostPerUnit)}</td>
      <td>${it.ncm ?? '—'}</td>
      <td class="text-center">${fmtDate(it.updatedAt)}</td>
      <td class="text-center">
        <button class="btn-edit" data-id="${it.id}">✏️ Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // ✅ Adicionar event listeners aos botões de editar
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditModal(id);
    });
  });
}

async function openEditModal(productId) {
  const auth = getAuth();
  if (!auth?.token) return;

  try {
    // ✅ Loading
    Swal.fire({
      title: 'Carregando...',
      html: 'Buscando dados do produto',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Buscar dados do produto
    const response = await fetch(`${API}/products/${productId}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar produto');

    const product = await response.json();

    // Fechar loading
    Swal.close();

    // Preencher modal
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editName').value = product.name;
    document.getElementById('editCode').value = product.code;
    document.getElementById('editUnitOfMeasure').value = product.unitOfMeasure;
    document.getElementById('editCurrentCostPerUnit').value = product.currentCostPerUnit;
    document.getElementById('editNcm').value = product.ncm || '';
    document.getElementById('editMinQty').value = product.minQty || '';
    document.getElementById('editLeadTimeDays').value = product.leadTimeDays || '';
    document.getElementById('editAvgDailyUse').value = product.avgDailyUse || '';

    // Mostrar modal
    document.getElementById('editModal').classList.remove('hidden');
  } catch (error) {
    // ✅ SweetAlert2 para erro
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Carregar',
      text: error.message || 'Não foi possível carregar o produto',
      confirmButtonText: 'OK'
    });
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

async function saveProduct() {
  const auth = getAuth();
  if (!auth?.token) return;

  const productId = document.getElementById('editProductId').value;
  
  // ✅ Validação básica
  const name = document.getElementById('editName').value.trim();
  const code = document.getElementById('editCode').value.trim();
  const unitOfMeasure = document.getElementById('editUnitOfMeasure').value.trim();
  const currentCostPerUnit = parseFloat(document.getElementById('editCurrentCostPerUnit').value);

  if (!name || !code || !unitOfMeasure || isNaN(currentCostPerUnit)) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos Obrigatórios',
      text: 'Preencha todos os campos obrigatórios (Nome, Código, Unidade e Custo)',
      confirmButtonText: 'OK'
    });
    return;
  }

  const data = {
    name,
    code,
    unitOfMeasure,
    currentCostPerUnit,
    ncm: document.getElementById('editNcm').value || null,
    minQty: parseFloat(document.getElementById('editMinQty').value) || null,
    leadTimeDays: parseInt(document.getElementById('editLeadTimeDays').value) || null,
    avgDailyUse: parseFloat(document.getElementById('editAvgDailyUse').value) || null,
  };

  try {
    // ✅ Fechar modal ANTES do loading
    closeEditModal();

    // ✅ Loading
    Swal.fire({
      title: 'Salvando...',
      html: 'Atualizando produto',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await fetch(`${API}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao salvar produto');
    }

    // ✅ Sucesso
    await Swal.fire({
      icon: 'success',
      title: 'Produto Atualizado!',
      text: 'As alterações foram salvas com sucesso',
      confirmButtonText: 'OK',
      timer: 2000
    });
    
    // Recarregar lista
    const state = window.currentState || { q: '', page: 1 };
    load(state);
  } catch (error) {
    // ✅ SweetAlert2 para erro
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Salvar',
      text: error.message || 'Não foi possível salvar o produto',
      confirmButtonText: 'OK'
    });
  }
}

async function load(state){
  const auth = getAuth();
  if (!auth?.token) return;

  window.currentState = state; // Salvar estado atual

  const status = document.getElementById('status');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  status.classList.add('hidden'); 
  status.classList.remove('warn');
  
  try{
    const data = await fetchItems(state, auth.token);
    renderRows(data.items);
    
    const pagination = data.pagination;
    pageInfo.textContent = `Página ${pagination.page} de ${pagination.pageCount} — ${pagination.total} produtos`;
    prevBtn.disabled = !pagination.hasPreviousPage;
    nextBtn.disabled = !pagination.hasNextPage;
  }catch(e){
    document.getElementById('tbody').innerHTML = '<tr><td colspan="9" class="muted">Sem resultados</td></tr>';
    
    // ✅ SweetAlert2 para erro de carregamento
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Carregar',
      text: e.message || 'Não foi possível carregar os produtos',
      confirmButtonText: 'OK'
    });
    
    pageInfo.textContent = '-'; 
    prevBtn.disabled = nextBtn.disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); 
  if(!auth?.token){ 
    location.href='../../../login/index.html'; 
    return; 
  }

  const q = document.getElementById('q');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const clearBtn = document.getElementById('clearBtn');

  let state = { q:'', page:1 };

  document.getElementById('filterForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    state.q = q.value.trim();
    state.page = 1;
    load(state);
  });
  
  clearBtn.addEventListener('click', ()=>{ 
    q.value=''; 
    state={ q:'', page:1 }; 
    load(state); 
  });
  
  prevBtn.addEventListener('click', ()=>{ 
    if(state.page>1){ 
      state.page--; 
      load(state); 
    }
  });
  
  nextBtn.addEventListener('click', ()=>{ 
    state.page++; 
    load(state); 
  });

  // ✅ Event listeners do modal
  document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

  // Fechar modal ao clicar fora
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
      closeEditModal();
    }
  });

  load(state);
});