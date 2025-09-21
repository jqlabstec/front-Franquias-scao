const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

/* ===== SweetAlert helpers ===== */
function toastSuccess(title = 'Operação concluída') {
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
function confirmCreate(title='Confirmar cadastro?', text='Deseja salvar este produto?') {
  const btnPrimaryStyle = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;';
  const btnGhostStyle   = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';

  return Swal.fire({
    icon: 'question',
    title,
    html: `<div style="color:var(--muted)">${text.replace(/\n/g,'<br>')}</div>`,
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    customClass: {
      popup: 'vita',
      confirmButton: '', // vamos aplicar inline via didRender
      cancelButton: '',
    },
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      const cancelEl  = Swal.getCancelButton();
      if (confirmEl) confirmEl.setAttribute('style', btnPrimaryStyle);
      if (cancelEl)  cancelEl.setAttribute('style', btnGhostStyle);
      // espaçamento entre botões
      const actions = Swal.getActions();
      if (actions) actions.style.gap = '8px';
    },
    reverseButtons: true,
  });
}

function showError(title='Erro', text='') {
  const btnGhostStyle = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';
  return Swal.fire({
    icon: 'error',
    title,
    html: `<div style="color:var(--muted)">${text}</div>`,
    confirmButtonText: 'OK',
    buttonsStyling: false,
    customClass: { popup: 'vita' },
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      if (confirmEl) confirmEl.setAttribute('style', btnGhostStyle);
    },
  });
}

/* ===== Utils ===== */
function getAuth(){
  try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }
  catch{ return null; }
}
function fmtMoney(n){ const x = Number(n); return Number.isNaN(x) ? '—' : x.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:6}); }
function fmtDate(d){ const dt = new Date(d); return isNaN(+dt) ? '—' : dt.toLocaleString(); }

/* ===== API ===== */
async function createProduct(body, token){
  const r = await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(data?.message || 'Não foi possível criar o produto');
  return data;
}
async function listProducts(params, token){
  const p = new URLSearchParams({ page:'1', pageSize:'10' });
  if (params?.query) p.set('query', params.query);
  const r = await fetch(`${API}/products?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data;
}

/* ===== Render ===== */
function renderList(items){
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 7; td.className = 'muted'; td.textContent = 'Sem resultados';
    tr.appendChild(td); tb.appendChild(tr); return;
  }
  for(const it of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${it.name}</td>
      <td>${it.code}</td>
      <td>${it.unitOfMeasure}</td>
      <td>${fmtMoney(it.currentCostPerUnit)}</td>
      <td>${it.ncm || '—'}</td>
      <td>${fmtDate(it.createdAt)}</td>
    `;
    tb.appendChild(tr);
  }
}

/* ===== Page logic ===== */
document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  const form = document.getElementById('form');
  const name = document.getElementById('name');
  const code = document.getElementById('code');
  const unit = document.getElementById('unit');
  const cost = document.getElementById('cost');
  const ncm = document.getElementById('ncm');
  const btnClear = document.getElementById('btnClear');

  async function reloadList(q=''){
    try{
      const data = await listProducts({ query: q }, auth.token);
      renderList(data.items);
    }catch(e){
      renderList([]);
      toastError(e.message || 'Erro ao listar produtos');
    }
  }

  // Salvar
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const body = {
      name: name.value.trim(),
      code: code.value.trim(),
      unitOfMeasure: unit.value.trim().toUpperCase(),
      currentCostPerUnit: Number(cost.value),
      ncm: ncm.value.trim() || undefined,
    };

    // Confirmar via SweetAlert
    const res = await confirmCreate('Confirmar cadastro?', `Produto: ${body.name}\nCódigo: ${body.code}`);
    if (!res.isConfirmed) return;

    try{
      await createProduct(body, auth.token);
      toastSuccess('Produto cadastrado!');
      form.reset();
      await reloadList('');
    }catch(e){
      await showError('Falha ao salvar', e.message || 'Verifique os dados informados.');
    }
  });

  btnClear.addEventListener('click', ()=>{
    form.reset();
  });

  // Busca/lista
  document.getElementById('btnSearch').addEventListener('click', async ()=>{
    const q = document.getElementById('q').value || '';
    await reloadList(q);
  });

  await reloadList('');
});