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
    costType: qs('#costType').value || undefined,
    from: qs('#from').value ? `${qs('#from').value}T00:00:00.000Z` : undefined,
    to: qs('#to').value ? `${qs('#to').value}T23:59:59.999Z` : undefined,
  };
}

// ✅ MAPEAMENTO ATUALIZADO (compatível com seu CostType)
const COST_TYPE_LABELS = {
  // 💰 IMPOSTOS SOBRE VENDAS (NOVO)
  SIMPLES_NACIONAL: 'Simples Nacional',
  ICMS: 'ICMS',
  PIS: 'PIS',
  COFINS: 'COFINS',
  ISS: 'ISS',
  TAX_OTHER: 'Outros Impostos',
  
  // Ocupação
  RENT: 'Aluguel',
  CONDO_FEE: 'Condomínio',
  SHOPPING_PROMO_FUND: 'Fundo Shopping',
  PROPERTY_TAX: 'IPTU',
  WATER: 'Água',
  ELECTRICITY: 'Energia',
  AC_MAINTENANCE: 'Ar Condicionado',
  GAS: 'Gás',
  
  // Recursos Humanos
  SALARY: 'Salários',
  LABOR_CHARGES: 'Encargos',
  BENEFITS: 'Benefícios',
  TRAINING: 'Treinamentos',
  
  // Consumos e Utilidades
  INTERNET: 'Internet',
  CLEANING: 'Limpeza',
  MAINTENANCE: 'Manutenção',
  OFFICE_SUPPLIES: 'Material Escritório',
  EQUIPMENT_RENTAL: 'Aluguel Equipamentos',
  EQUIPMENT_UTENSILS: 'Equipamentos',
  PHONE: 'Telefone',
  
  // Administrativo
  IT_SOFTWARE: 'Software/TI',
  ACCOUNTING: 'Contador',
  INSURANCE: 'Seguros',
  PROFESSIONAL_SERVICE: 'Serv. Profissionais',
  BANK_FEE: 'Tarifas Bancárias',
  ADMINISTRATIVE: 'Administrativo',
  LEGAL: 'Advocacia',
  
  // Franquia
  ROYALTY: 'Royalties',
  MARKETING_FUND: 'Fundo Marketing',
  
  // Marketing
  MARKETING: 'Marketing',
  ADVERTISING: 'Publicidade',
  
  // Delivery e Marketplace
  DELIVERY_FEE: 'Taxas Delivery',
  ACQUIRER_FEE: 'Adquirência',
  TRANSACTION_FEE: 'Taxas Transação',
  
  // Outros
  TRANSFER_FEE: 'Taxa Transferência',
  PLR: 'PLR',
  OTHER: 'Outros',
  
  // Deprecados
  UTILITIES: 'Utilidades',
  DEPRECIATION: 'Depreciação',
  COMMISSION: 'Comissões',
  FREIGHT: 'Frete',
  SECURITY: 'Segurança',
  TAX: 'Impostos (Antigo)',
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
  if (p.costType) url.searchParams.set('costType', p.costType);
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
    tbody.innerHTML = `<tr><td colspan="8" class="muted">Sem resultados</td></tr>`;
    qs('#tfoot-total').textContent = '—';
    return;
  }
  
  let total = 0;
  tbody.innerHTML = items.map(c=>{
    const d = new Date(c.costDate);
    const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : Number(c.amount);
    total += amount;
    
    const typeLabel = COST_TYPE_LABELS[c.costType] || c.costType || '—';
    
    let descriptionHtml = c.description;
    if (c.baseValue && c.percentage) {
      const baseVal = typeof c.baseValue === 'string' ? parseFloat(c.baseValue) : Number(c.baseValue);
      const pct = typeof c.percentage === 'string' ? parseFloat(c.percentage) : Number(c.percentage);
      descriptionHtml += ` <span style="color:#6b7280;font-size:12px;">(${pct}% de ${formatMoney(baseVal)})</span>`;
    }
    
    return `
      <tr data-id="${c.id}">
        <td>${d.toLocaleDateString('pt-BR')}</td>
        <td>${descriptionHtml}</td>
        <td>${typeLabel}</td>
        <td>${c.category}</td>
        <td>${c.recognitionBasis}</td>
        <td>${c.isRecurring ? '<span class="pill ok">Sim</span>' : '<span class="pill no">Não</span>'}</td>
        <td class="num">${formatMoney(amount)}</td>
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

// ✅ FUNÇÃO PARA CALCULAR VALOR AUTOMATICAMENTE
function updateCalculatedValue() {
  const baseValueEl = qs('#f-baseValue');
  const percentageEl = qs('#f-percentage');
  const calculatedValueEl = qs('#calculatedValue');
  const amountEl = qs('#f-amount');
  
  if (!baseValueEl || !percentageEl || !calculatedValueEl || !amountEl) {
    console.error('Elementos de cálculo não encontrados!');
    return;
  }
  
  const baseValue = parseFloat(baseValueEl.value) || 0;
  const percentage = parseFloat(percentageEl.value) || 0;
  const calculatedAmount = baseValue * (percentage / 100);
  
  calculatedValueEl.textContent = formatMoney(calculatedAmount);
  amountEl.value = calculatedAmount.toFixed(2);
}

function openDialog(item){
  console.log('🔵 openDialog chamado com:', item);
  
  const dlg = qs('#costDialog');
  if (!dlg) {
    console.error('❌ Modal #costDialog não encontrado!');
    return;
  }
  
  console.log('✅ Modal encontrado:', dlg);
  
  // Preencher título
  const titleEl = qs('#dlgTitle');
  if (titleEl) titleEl.textContent = item ? 'Editar custo' : 'Novo custo';
  
  // Preencher campos
  const descEl = qs('#f-description');
  const typeEl = qs('#f-costType');
  const catEl = qs('#f-category');
  const basisEl = qs('#f-basis');
  const recEl = qs('#f-rec');
  const dateEl = qs('#f-date');
  const autoCalcEl = qs('#f-autoCalc');
  const autoCalcFieldsEl = qs('#autoCalcFields');
  const manualValueFieldEl = qs('#manualValueField');
  const baseValueEl = qs('#f-baseValue');
  const percentageEl = qs('#f-percentage');
  const amountEl = qs('#f-amount');
  
  if (descEl) descEl.value = item?.description || '';
  if (typeEl) typeEl.value = item?.costType || 'OTHER';
  if (catEl) catEl.value = item?.category || 'FIXED';
  if (basisEl) basisEl.value = item?.recognitionBasis || 'ACCRUAL';
  if (recEl) recEl.checked = !!item?.isRecurring;
  
  if (dateEl) {
    const dt = item?.costDate ? new Date(item.costDate) : new Date();
    dateEl.value = dt.toISOString().slice(0,10);
  }

  // Preencher campos de cálculo automático
  const hasAutoCalc = item?.baseValue && item?.percentage;
  if (autoCalcEl) autoCalcEl.checked = hasAutoCalc;
  
  if (hasAutoCalc) {
    if (autoCalcFieldsEl) autoCalcFieldsEl.style.display = 'grid';
    if (manualValueFieldEl) manualValueFieldEl.style.display = 'none';
    if (baseValueEl) baseValueEl.value = typeof item.baseValue === 'string' ? item.baseValue : String(item.baseValue);
    if (percentageEl) percentageEl.value = typeof item.percentage === 'string' ? item.percentage : String(item.percentage);
    updateCalculatedValue();
  } else {
    if (autoCalcFieldsEl) autoCalcFieldsEl.style.display = 'none';
    if (manualValueFieldEl) manualValueFieldEl.style.display = 'block';
    if (amountEl) {
      const amount = typeof item?.amount === 'string' ? parseFloat(item.amount) : Number(item?.amount || 0);
      amountEl.value = item ? amount : '';
    }
  }

  dlg.dataset.editingId = item?.id || '';
  
  // ✅ REGISTRAR EVENTOS (apenas uma vez)
  const cancelBtn = qs('#dlgCancel');
  const saveBtn = qs('#dlgSave');
  
  if (cancelBtn) {
    cancelBtn.onclick = ()=> {
      console.log('🔴 Cancelar clicado');
      dlg.close();
    };
  }
  
  if (autoCalcEl) {
    autoCalcEl.onchange = (e) => {
      if (e.target.checked) {
        if (autoCalcFieldsEl) autoCalcFieldsEl.style.display = 'grid';
        if (manualValueFieldEl) manualValueFieldEl.style.display = 'none';
        if (amountEl) amountEl.removeAttribute('required');
        if (baseValueEl) baseValueEl.setAttribute('required', 'required');
        if (percentageEl) percentageEl.setAttribute('required', 'required');
      } else {
        if (autoCalcFieldsEl) autoCalcFieldsEl.style.display = 'none';
        if (manualValueFieldEl) manualValueFieldEl.style.display = 'block';
        if (amountEl) amountEl.setAttribute('required', 'required');
        if (baseValueEl) baseValueEl.removeAttribute('required');
        if (percentageEl) percentageEl.removeAttribute('required');
      }
    };
  }
  
  if (baseValueEl) baseValueEl.oninput = updateCalculatedValue;
  if (percentageEl) percentageEl.oninput = updateCalculatedValue;
  
  if (saveBtn) {
    saveBtn.onclick = async (e)=>{
      e.preventDefault();
      console.log('🟢 Salvar clicado');
      
      const desc = descEl?.value.trim() || '';
      const isAutoCalc = autoCalcEl?.checked || false;
      
      if (!desc) {
        notifyError('Campo obrigatório', 'Informe a descrição do custo.');
        return;
      }
      
      let amount, baseValue = null, percentage = null, calculationNote = null;
      
      if (isAutoCalc) {
        baseValue = parseFloat(baseValueEl?.value || '0');
        percentage = parseFloat(percentageEl?.value || '0');
        
        if (!baseValue || baseValue <= 0) {
          notifyError('Valor base inválido', 'Informe um valor base maior que zero.');
          return;
        }
        if (!percentage || percentage <= 0) {
          notifyError('Percentual inválido', 'Informe um percentual maior que zero.');
          return;
        }
        
        amount = baseValue * (percentage / 100);
        calculationNote = `${percentage}% sobre ${formatMoney(baseValue)}`;
      } else {
        amount = parseFloat(amountEl?.value || '0');
        
        if (!amount || amount <= 0) {
          notifyError('Valor inválido', 'Informe um valor maior que zero.');
          return;
        }
      }
      
      const payload = {
        description: desc,
        amount: amount,
        costType: typeEl?.value || 'OTHER',
        category: catEl?.value || 'FIXED',
        costDate: new Date((dateEl?.value || '') + 'T12:00:00').toISOString(),
        recognitionBasis: basisEl?.value || 'ACCRUAL',
        isRecurring: recEl?.checked || false,
        baseValue: baseValue,
        percentage: percentage,
        calculationNote: calculationNote,
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
  
  // ✅ ABRIR O MODAL
  console.log('🟢 Abrindo modal...');
  dlg.showModal();
  console.log('✅ Modal aberto!');
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

// ✅ INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('🟢 DOM carregado!');
  
  const p = periodDefault();
  const fromEl = qs('#from');
  const toEl = qs('#to');
  
  if (fromEl) fromEl.value = p.from;
  if (toEl) toEl.value = p.to;

  const categorySelect = qs('#category');
  if (categorySelect) {
    categorySelect.setAttribute('style', 'padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:#fff; font-size:14px; cursor:pointer;');
  }
  
  const costTypeSelect = qs('#costType');
  if (costTypeSelect) {
    costTypeSelect.setAttribute('style', 'padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:#fff; font-size:14px; cursor:pointer;');
  }
  
  const applyBtn = qs('#applyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', (e)=>{ 
      e.preventDefault(); 
      console.log('🔵 Aplicar filtros');
      load(); 
    });
  }
  
  const newBtn = qs('#newBtn');
  if (newBtn) {
    console.log('✅ Botão "Novo custo" encontrado:', newBtn);
    newBtn.addEventListener('click', (e)=> {
      e.preventDefault();
      console.log('🟢 Botão "Novo custo" clicado!');
      openDialog(null);
    });
  } else {
    console.error('❌ Botão #newBtn não encontrado!');
  }
  
  load();
});