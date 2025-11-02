const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
const PAGE_SIZE = 15;

/* ===== SweetAlert helpers (cores do tema) ===== */
function showSuccess(title = 'Sucesso', text = '') {
  return Swal.fire({
    customClass: { popup: 'vita', confirmButton: 'vita-ok' },
    icon: 'success',
    title, text,
    confirmButtonText: 'OK',
    buttonsStyling: false,
  });
}

function showWarn(title = 'Atenção', text = '') {
  return Swal.fire({
    customClass: { popup: 'vita', confirmButton: 'vita-warn' },
    icon: 'warning',
    title, text,
    confirmButtonText: 'OK',
    buttonsStyling: false,
  });
}

function showError(title = 'Erro', text = '') {
  return Swal.fire({
    customClass: { popup: 'vita', confirmButton: 'vita-danger' },
    icon: 'error',
    title, text,
    confirmButtonText: 'OK',
    buttonsStyling: false,
  });
}

function toastSuccess(title = 'Salvo com sucesso') {
  return Swal.fire({
    customClass: { popup: 'vita' },
    toast: true, position: 'top-end', icon: 'success',
    title, showConfirmButton: false, timer: 1800, timerProgressBar: true,
  });
}
function toastError(title = 'Falha na operação') {
  return Swal.fire({
    customClass: { popup: 'vita' },
    toast: true, position: 'top-end', icon: 'error',
    title, showConfirmButton: false, timer: 2200, timerProgressBar: true,
  });
}

function confirmAdjust(title = 'Confirmar ajuste?', text = 'Deseja continuar?', danger = false) {
  const btnPrimaryGreen = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(22,163,74,.20);';
  const btnPrimaryRed   = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#ef4444,#dc2626);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(239,68,68,.20);';
  const btnGhost        = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';

  return Swal.fire({
    customClass: {
      popup: 'vita',
      confirmButton: '',
      cancelButton: '',
    },
    icon: danger ? 'warning' : 'question',
    title,
    html: `<div style="color:var(--muted)">${String(text).replace(/\n/g,'<br>')}</div>`,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    reverseButtons: true,
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      const cancelEl  = Swal.getCancelButton();
      if (confirmEl) confirmEl.setAttribute('style', danger ? btnPrimaryRed : btnPrimaryGreen);
      if (cancelEl)  cancelEl.setAttribute('style', btnGhost);
      const actions = Swal.getActions();
      if (actions) actions.style.gap = '8px';
    },
  });
}

/* ===== Utils ===== */
function getAuth(){
  try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }
  catch{ return null; }
}
function fmtDate(d){ const dt = new Date(d); return isNaN(+dt) ? '—' : dt.toLocaleString(); }
function fmt(n, decimals=3){ if (n == null) return '—'; const x = Number(n); return Number.isNaN(x) ? '—' : x.toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:decimals }); }

/* ===== API calls ===== */
async function postAdjust(body, token){
  const r = await fetch(`${API}/inventory/adjust`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao registrar movimentação');
  return data;
}

async function fetchTxns(q, token){
  const p = new URLSearchParams({ 
    page: String(q.page || 1), 
    pageSize: String(PAGE_SIZE) 
  });
  if (q.productId) p.set('productId', String(q.productId));
  if (q.type) p.set('type', q.type);
  if (q.query) p.set('query', q.query);

  console.log('📤 Enviando para API:', p.toString());
  console.log('📤 Estado txState:', q);
  const r = await fetch(`${API}/inventory/txns?${p.toString()}`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar transações');
  return data;
}

async function fetchProducts(term, token){
  const p = new URLSearchParams({ 
    query: term, 
    page: '1', 
    pageSize: '50'
  });
  const url = `${API}/products?${p.toString()}`;
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao buscar produtos');
  return Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
}

async function fetchStock(productId, token){
  const r = await fetch(`${API}/inventory/stock/${productId}`, { headers:{ Authorization:`Bearer ${token}` } });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) return null;
  return data;
}

/* ===== Render ===== */
function renderTxns(items){
  const tb = document.getElementById('txBody');
  tb.innerHTML = '';
  let list = Array.isArray(items) ? items : [];
  
  if(list.length===0){
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 8; td.className='muted'; td.textContent='Sem resultados';
    tr.appendChild(td); tb.appendChild(tr); return;
  }
  for(const it of list){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(it.createdAt)}</td>
      <td>${it.product?.name ?? `#${it.productId}`}</td>
      <td>${it.type}</td>
      <td>${fmt(it.qty, 3)}</td>
      <td>${it.unitCost != null ? Number(it.unitCost).toFixed(6) : '—'}</td>
      <td>${it.source ?? '—'}</td>
      <td>${it.notes ?? '—'}</td>
      <td><button class="btn-link" data-action="adjust" data-product-id="${it.productId}">Ajustar</button></td>
    `;
    tb.appendChild(tr);
  }
}

/* ===== Page logic ===== */
document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  const form = document.getElementById('form');
  const productId = document.getElementById('productId');
  const productSearch = document.getElementById('productSearch');
  const productList = document.getElementById('productList');
  const productHint = document.getElementById('productHint');
  const stockHint = document.getElementById('stockHint');
  const costHint = document.getElementById('costHint');
  const type = document.getElementById('type');
  const qty = document.getElementById('qty');
  const unitCost = document.getElementById('unitCost');
  const notes = document.getElementById('notes');
  const btnClear = document.getElementById('btnClear');

  // ✅ Elementos de paginação
  const txPrevBtn = document.getElementById('txPrevBtn');
  const txNextBtn = document.getElementById('txNextBtn');
  const txPageInfo = document.getElementById('txPageInfo');
  const txClear = document.getElementById('txClear');

  let lastProducts = [];
  let txState = { page: 1, query: '', type: '' }; // ✅ Estado da paginação

  async function loadTxns(){
    try{
      const data = await fetchTxns(txState, auth.token);
      renderTxns(data.items);
      
      // ✅ Atualizar paginação
      const pi = data.pageInfo || {};
      txPageInfo.textContent = `Página ${pi.page || 1} de ${pi.totalPages || 1} — ${pi.totalItems || 0} transações`;
      txPrevBtn.disabled = !pi.hasPrev;
      txNextBtn.disabled = !pi.hasNext;
    }catch(e){
      renderTxns([]);
      txPageInfo.textContent = '-';
      txPrevBtn.disabled = txNextBtn.disabled = true;
    }
  }

  // Autocomplete do produto
  let searchTimer = null;
  productSearch.addEventListener('input', ()=>{
    clearTimeout(searchTimer);
    productId.value = '';
    productHint.textContent = 'Selecione um produto na lista.';
    productList.style.display = 'none';
    stockHint.textContent = ''; costHint.textContent = '';
    const term = productSearch.value.trim();
    if (term.length < 2) return;
    searchTimer = setTimeout(async ()=>{
      try{
        lastProducts = await fetchProducts(term, auth.token);
        productList.innerHTML = '';
        if (!lastProducts.length) { 
          productList.innerHTML = '<div class="autocomplete-item" style="color:#999;cursor:default;">Nenhum produto encontrado</div>';
          productList.style.display='block';
          return;
        }
        for(const p of lastProducts){
          const el = document.createElement('div');
          el.className = 'autocomplete-item';
          el.textContent = `${p.name} ${p.code ? `· ${p.code}` : ''}`;
          el.dataset.id = p.id;
          productList.appendChild(el);
        }
        productList.style.display = 'block';
      }catch(e){ 
        productList.innerHTML = '<div class="autocomplete-item" style="color:#dc2626;cursor:default;">Erro ao buscar produtos</div>';
        productList.style.display='block';
      }
    }, 180);
  });

  productList.addEventListener('click', async (e)=>{
    const item = e.target.closest('.autocomplete-item'); 
    if(!item || !item.dataset.id) return;
    const id = Number(item.dataset.id);
    const p = lastProducts.find(x => x.id === id);
    if (!p) return;
    productId.value = String(p.id);
    productSearch.value = p.name;
    productList.style.display = 'none';
    productHint.textContent = `Selecionado: #${p.id} · ${p.name}`;
    const stock = await fetchStock(p.id, auth.token).catch(()=>null);
    if (stock && stock.currentQty != null) {
      stockHint.textContent = `Saldo atual: ${fmt(stock.currentQty, 3)}`;
    } else {
      stockHint.textContent = `Sem saldo registrado ainda.`;
    }
    if (stock && stock.avgUnitCost != null) {
      costHint.textContent = `Custo médio atual: ${Number(stock.avgUnitCost).toFixed(6)}`;
    } else {
      costHint.textContent = '';
    }
    qty.focus();
  });

  document.addEventListener('click', (e)=>{
    if (!productList.contains(e.target) && e.target !== productSearch) {
      productList.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    if (!productId.value) {
      await showWarn('Selecione um produto', 'Busque e escolha na lista.');
      productSearch.focus();
      return;
    }

    const body = {
      productId: Number(productId.value),
      type: type.value,
      qty: Number(qty.value),
      notes: notes.value || undefined,
    };
    const needsCost = ['PURCHASE','RETURN','PRODUCTION_YIELD','ADJUST_IN'].includes(type.value);
    if (needsCost && unitCost.value) body.unitCost = Number(unitCost.value);

    const isOutbound = ['ADJUST_OUT','SALE','PRODUCTION_CONSUME'].includes(type.value);
    if (isOutbound) {
      const prodLabel = productSearch.value || `#${productId.value}`;
      const res = await confirmAdjust('Confirmar baixa de estoque?', `Produto: ${prodLabel}\nQuantidade: ${fmt(body.qty, 3)}`, true);
      if (!res.isConfirmed) return;
    }

    try{
      await postAdjust(body, auth.token);
      qty.value=''; unitCost.value=''; notes.value='';
      txState.page = 1; // ✅ Voltar para página 1 após novo ajuste
      await loadTxns();
      toastSuccess('Movimentação registrada!');
      const stock = await fetchStock(Number(productId.value), auth.token).catch(()=>null);
      if (stock && stock.currentQty != null) stockHint.textContent = `Saldo atual: ${fmt(stock.currentQty, 3)}`;
      if (stock && stock.avgUnitCost != null) costHint.textContent = `Custo médio atual: ${Number(stock.avgUnitCost).toFixed(6)}`;
    }catch(e){
      toastError(e.message || 'Erro ao registrar');
      await showError('Erro ao registrar', e.message || 'Tente novamente.');
    }
  });

  btnClear.addEventListener('click', ()=>{
    productId.value=''; productSearch.value=''; productHint.textContent='Selecione um produto na lista.';
    qty.value=''; unitCost.value=''; notes.value='';
    stockHint.textContent=''; costHint.textContent='';
  });

  // ✅ Ações na tabela: Ajustar
  document.getElementById('txBody').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action="adjust"]');
    if (!btn) return;
    const id = Number(btn.dataset.productId);
    productId.value = String(id);
    productSearch.value = `#${id}`;
    productHint.textContent = `Selecionado: #${id}`;
    if (!type.value) type.value = 'ADJUST_OUT';
    const stock = await fetchStock(id, auth.token).catch(()=>null);
    stockHint.textContent = stock && stock.currentQty != null ? `Saldo atual: ${fmt(stock.currentQty, 3)}` : '';
    costHint.textContent = stock && stock.avgUnitCost != null ? `Custo médio atual: ${Number(stock.avgUnitCost).toFixed(6)}` : '';
    qty.focus();
    toastSuccess('Formulário preenchido. Ajuste e confirme.');
  });

  // ✅ Busca transações
  document.getElementById('txSearch').addEventListener('click', async ()=>{
    txState.query = document.getElementById('txQuery').value.trim();
    txState.type = document.getElementById('txType').value;
    txState.page = 1;
    await loadTxns();
  });

  // ✅ Limpar filtros
  txClear.addEventListener('click', async ()=>{
    document.getElementById('txQuery').value = '';
    document.getElementById('txType').value = '';
    txState = { page: 1, query: '', type: '' };
    await loadTxns();
  });

  // ✅ Paginação
  txPrevBtn.addEventListener('click', async ()=>{
    if (txState.page > 1) {
      txState.page--;
      await loadTxns();
    }
  });

  txNextBtn.addEventListener('click', async ()=>{
    txState.page++;
    await loadTxns();
  });

  await loadTxns();
});