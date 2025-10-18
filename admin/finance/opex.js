import { apiBaseUrl, formatMoney, qs } from '../vendor/helpers.js';

function token() {
  try { return (JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')))?.token || ''; }
  catch { return ''; }
}

function periodDefault(){
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth()+1, 0);
  return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
}

function params(){
  return {
    q: qs('#q').value.trim(),
    category: qs('#category').value || undefined,
    costType: qs('#costType').value || undefined, // ✅ NOVO
    from: qs('#from').value ? `${qs('#from').value}T00:00:00.000Z` : undefined,
    to: qs('#to').value ? `${qs('#to').value}T23:59:59.999Z` : undefined,
  };
}

// ✅ NOVO: Mapeamento de labels para costType
const COST_TYPE_LABELS = {
  RENT: 'Aluguel',
  SALARY: 'Salários',
  UTILITIES: 'Água/Luz/Gás',
  INSURANCE: 'Seguros',
  DEPRECIATION: 'Depreciação',
  MAINTENANCE: 'Manutenção',
  CLEANING: 'Limpeza',
  SECURITY: 'Segurança',
  MARKETING: 'Marketing',
  COMMISSION: 'Comissões',
  FREIGHT: 'Frete',
  ADMINISTRATIVE: 'Administrativo',
  IT_SOFTWARE: 'Software/TI',
  PROFESSIONAL_SERVICE: 'Serv. Profissionais',
  BANK_FEE: 'Tarifas bancárias',
  TAX: 'Impostos',
  OTHER: 'Outros',
};

function confirmAction(title = 'Confirmar ação?', text = 'Deseja continuar?', danger = false) {
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

function notifySuccess(title, text = '') {
  const btnPrimaryGreen = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(22,163,74,.20);';
  
  return Swal.fire({
    customClass: {
      popup: 'vita',
      confirmButton: '',
    },
    icon: 'success',
    title,
    html: text ? `<div style="color:var(--muted)">${String(text).replace(/\n/g,'<br>')}</div>` : '',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      if (confirmEl) confirmEl.setAttribute('style', btnPrimaryGreen);
    },
  });
}

function notifyError(title, text = '') {
  const btnPrimaryRed = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#ef4444,#dc2626);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(239,68,68,.20);';
  
  return Swal.fire({
    customClass: {
      popup: 'vita',
      confirmButton: '',
    },
    icon: 'error',
    title,
    html: text ? `<div style="color:var(--muted)">${String(text).replace(/\n/g,'<br>')}</div>` : '',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      if (confirmEl) confirmEl.setAttribute('style', btnPrimaryRed);
    },
  });
}

async function listCosts() {
  const url = new URL(`${apiBaseUrl}/costs`);
  const p = params();
  if (p.q) url.searchParams.set('q', p.q);
  if (p.category) url.searchParams.set('category', p.category);
  if (p.costType) url.searchParams.set('costType', p.costType); // ✅ NOVO
  if (p.from) url.searchParams.set('from', p.from);
  if (p.to) url.searchParams.set('to', p.to);

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!r.ok) throw new Error('Falha ao listar custos');
  return r.json();
}

async function createOrUpdateCost(editingId, payload) {
  const opts = {
    method: editingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify(payload),
  };
  const url = editingId
    ? `${apiBaseUrl}/costs/${editingId}`
    : `${apiBaseUrl}/costs`;
  const r = await fetch(url, opts);
  if (!r.ok) {
    const errData = await r.json();
    console.error('Erro do backend:', errData);
    throw new Error('Falha ao salvar custo');
  }
  return r.json();
}

async function deleteCost(id) {
  const r = await fetch(`${apiBaseUrl}/costs/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!r.ok) throw new Error('Falha ao remover custo');
}

function renderRows(items){
  const tbody = qs('#tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">Sem resultados</td></tr>`; // ✅ colspan 8
    qs('#tfoot-total').textContent = '—';
    return;
  }
  let total = 0;
  tbody.innerHTML = items.map(c=>{
    const d = new Date(c.costDate);
    total += Number(c.amount || 0);
    const typeLabel = COST_TYPE_LABELS[c.costType] || c.costType || '—'; // ✅ NOVO
    return `
      <tr data-id="${c.id}">
        <td>${d.toLocaleDateString('pt-BR')}</td>
        <td>${c.description}</td>
        <td>${typeLabel}</td> <!-- ✅ NOVO: Mostrar tipo -->
        <td>${c.category}</td>
        <td>${c.recognitionBasis}</td>
        <td>${c.isRecurring ? '<span class="pill ok">Sim</span>' : '<span class="pill no">Não</span>'}</td>
        <td class="num">${formatMoney(c.amount)}</td>
        <td class="num">
          <button class="btn-ghost btn-edit">Editar</button>
          <button class="btn-ghost btn-del">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
  qs('#tfoot-total').textContent = formatMoney(total);

  tbody.querySelectorAll('.btn-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tr = btn.closest('tr');
      const id = Number(tr.dataset.id);
      const item = items.find(x=>x.id===id);
      openDialog(item);
    });
  });
  tbody.querySelectorAll('.btn-del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const tr = btn.closest('tr');
      const id = Number(tr.dataset.id);
      const item = items.find(x=>x.id===id);
      
      const result = await confirmAction(
        'Excluir custo?',
        `Tem certeza que deseja remover "${item.description}"?\nEsta ação não pode ser desfeita.`,
        true
      );
      
      if (result.isConfirmed) {
        try {
          await deleteCost(id);
          await notifySuccess('Custo excluído!', 'O custo foi removido com sucesso.');
          load();
        } catch (e) {
          console.error(e);
          notifyError('Erro ao excluir', 'Não foi possível remover o custo.');
        }
      }
    });
  });
}

function openDialog(item){
  const dlg = qs('#costDialog');
  qs('#dlgTitle').textContent = item ? 'Editar custo' : 'Novo custo';
  qs('#f-description').value = item?.description || '';
  qs('#f-amount').value = item ? Number(item.amount) : '';
  qs('#f-costType').value = item?.costType || 'OTHER'; // ✅ NOVO
  qs('#f-category').value = item?.category || 'FIXED';
  qs('#f-basis').value = item?.recognitionBasis || 'ACCRUAL';
  qs('#f-rec').checked = !!item?.isRecurring;
  const dt = item?.costDate ? new Date(item.costDate) : new Date();
  qs('#f-date').value = dt.toISOString().slice(0,10);

  dlg.dataset.editingId = item?.id || '';
  dlg.showModal();

  qs('#dlgCancel').onclick = ()=> dlg.close();
  qs('#dlgSave').onclick = async (e)=>{
    e.preventDefault();
    
    const desc = qs('#f-description').value.trim();
    const amt = Number(qs('#f-amount').value);
    
    if (!desc) {
      notifyError('Campo obrigatório', 'Informe a descrição do custo.');
      return;
    }
    if (!amt || amt <= 0) {
      notifyError('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    
    const payload = {
      description: desc,
      amount: amt,
      costType: qs('#f-costType').value, // ✅ NOVO
      category: qs('#f-category').value,
      costDate: new Date(qs('#f-date').value + 'T12:00:00').toISOString(),
      recognitionBasis: qs('#f-basis').value,
      isRecurring: qs('#f-rec').checked,
    };
    
    const editingId = dlg.dataset.editingId ? Number(dlg.dataset.editingId) : undefined;
    
    try {
      await createOrUpdateCost(editingId, payload);
      dlg.close();
      await notifySuccess(
        editingId ? 'Custo atualizado!' : 'Custo criado!',
        editingId ? 'As alterações foram salvas com sucesso.' : 'O custo foi registrado com sucesso.'
      );
      load();
    } catch (e) {
      console.error(e);
      notifyError('Erro ao salvar', 'Não foi possível salvar o custo. Verifique os dados e tente novamente.');
    }
  };
}

async function load(){
  const st = qs('#status');
  try{
    st.classList.add('hidden');
    const data = await listCosts();
    renderRows(data.items || data || []);
  }catch(e){
    console.error(e);
    st.textContent = 'Não foi possível carregar os custos.';
    st.classList.remove('hidden');
    renderRows([]);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const p = periodDefault();
  qs('#from').value = p.from;
  qs('#to').value = p.to;

  const categorySelect = qs('#category');
  if (categorySelect) {
    categorySelect.setAttribute('style', 'padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:#fff; font-size:14px; cursor:pointer;');
  }
  
  // ✅ NOVO: Aplicar estilo no costType também
  const costTypeSelect = qs('#costType');
  if (costTypeSelect) {
    costTypeSelect.setAttribute('style', 'padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:#fff; font-size:14px; cursor:pointer;');
  }
  
  qs('#applyBtn').addEventListener('click', (e)=>{ e.preventDefault(); load(); });
  qs('#newBtn').addEventListener('click', ()=> openDialog(null));
  load();
});