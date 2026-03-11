const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
const PAGE_SIZE = 15;

// ✅ Mapa de cores por categoria
const CAT_COLORS = {
  'Hortifruti':             { bg: '#dcfce7', color: '#166534' },
  'Cozinha':                { bg: '#ffedd5', color: '#9a3412' },
  'Congelados e Atacado':   { bg: '#dbeafe', color: '#1e3a8a' },
  'Descartáveis e Bebidas': { bg: '#f3e8ff', color: '#581c87' },
};

function getAuth() {
  try { return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }
  catch { return null; }
}

function buildQuery(state) {
  const p = new URLSearchParams();
  p.set('page', state.page);
  p.set('pageSize', PAGE_SIZE);
  if (state.q)        p.set('q', state.q);
  if (state.category) p.set('category', state.category); // ✅
  return p.toString();
}

async function fetchItems(state, token) {
  const r = await fetch(`${API}/inventory/items?${buildQuery(state)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar estoque');
  return data;
}

function fmt(n, decimals = 2) {
  if (n == null) return '—';
  const x = Number(n);
  return Number.isNaN(x) ? '—' : x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

function fmtMoney(n) {
  return n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ✅ Badge colorido de categoria
function categoryBadge(cat) {
  if (!cat) return '—';
  const c = CAT_COLORS[cat] || { bg: '#f1f5f9', color: '#475569' };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${c.bg};color:${c.color};white-space:nowrap;">${cat}</span>`;
}

function renderRows(items) {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="muted">Sem resultados</td></tr>';
    return;
  }

  for (const it of items) {
    const tr = document.createElement('tr');
    const isBelowMin = it.minQty && it.currentQty != null && Number(it.currentQty) < Number(it.minQty);
    if (isBelowMin) tr.style.backgroundColor = '#fee2e2';

    tr.innerHTML = `
      <td class="text-left"><strong>${it.product?.name ?? `#${it.productId}`}</strong></td>
      <td>${categoryBadge(it.product?.category)}</td>
      <td>${it.product?.unitOfMeasure ?? '—'}</td>
      <td class="text-right${isBelowMin ? '" style="color:#dc2626;font-weight:700' : ''}">${fmt(it.currentQty)}</td>
      <td class="text-right">${it.minQty != null ? fmt(it.minQty) : '—'}</td>
      <td class="text-right">${fmt(it.purchaseIn)}</td>
      <td class="text-right">${fmt(it.salesOut)}</td>
      <td class="text-right">${fmt(it.adjustIn)}</td>
      <td class="text-right">${fmt(it.adjustOut)}</td>
      <td class="text-right">${fmtMoney(it.avgUnitCost)}</td>
      <td class="text-center">
        <button class="btn-edit" data-id="${it.productId}">✏️ Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
  });
}

async function openEditModal(productId) {
  const auth = getAuth();
  if (!auth?.token) return;

  try {
    Swal.fire({ title: 'Carregando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const response = await fetch(`${API}/products/${productId}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!response.ok) throw new Error('Erro ao carregar produto');
    const product = await response.json();

    Swal.close();

    document.getElementById('editProductId').value          = product.id;
    document.getElementById('editName').value               = product.name;
    document.getElementById('editCode').value               = product.code;
    document.getElementById('editCategory').value           = product.category || ''; // ✅
    document.getElementById('editUnitOfMeasure').value      = product.unitOfMeasure;
    document.getElementById('editCurrentCostPerUnit').value = product.currentCostPerUnit;
    document.getElementById('editNcm').value                = product.ncm || '';
    document.getElementById('editMinQty').value             = product.minQty || '';
    document.getElementById('editLeadTimeDays').value       = product.leadTimeDays || '';
    document.getElementById('editAvgDailyUse').value        = product.avgDailyUse || '';

    document.getElementById('editModal').classList.remove('hidden');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao Carregar', text: error.message });
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

async function saveProduct() {
  const auth = getAuth();
  if (!auth?.token) return;

  const productId          = document.getElementById('editProductId').value;
  const name               = document.getElementById('editName').value.trim();
  const code               = document.getElementById('editCode').value.trim();
  const unitOfMeasure      = document.getElementById('editUnitOfMeasure').value.trim();
  const currentCostPerUnit = parseFloat(document.getElementById('editCurrentCostPerUnit').value);

  if (!name || !code || !unitOfMeasure || isNaN(currentCostPerUnit)) {
    Swal.fire({ icon: 'warning', title: 'Campos Obrigatórios', text: 'Preencha Nome, Código, Unidade e Custo' });
    return;
  }

  const data = {
    name, code, unitOfMeasure, currentCostPerUnit,
    category:     document.getElementById('editCategory').value || null, // ✅
    ncm:          document.getElementById('editNcm').value || null,
    minQty:       parseFloat(document.getElementById('editMinQty').value) || null,
    leadTimeDays: parseInt(document.getElementById('editLeadTimeDays').value) || null,
    avgDailyUse:  parseFloat(document.getElementById('editAvgDailyUse').value) || null,
  };

  try {
    closeEditModal();
    Swal.fire({ title: 'Salvando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const response = await fetch(`${API}/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao salvar produto');
    }

    await Swal.fire({ icon: 'success', title: 'Produto Atualizado!', timer: 2000 });
    load(window.currentState || { q: '', category: '', page: 1 });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao Salvar', text: error.message });
  }
}

async function load(state) {
  const auth = getAuth();
  if (!auth?.token) return;

  window.currentState = state;

  const pageInfo = document.getElementById('pageInfo');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');

  document.getElementById('status').classList.add('hidden');

  try {
    const data = await fetchItems(state, auth.token);
    renderRows(data.items);
    const pi = data.pageInfo;
    pageInfo.textContent = `Página ${pi.page} de ${pi.totalPages} — ${pi.totalItems} itens`;
    prevBtn.disabled = !pi.hasPrev;
    nextBtn.disabled = !pi.hasNext;
  } catch (e) {
    document.getElementById('tbody').innerHTML = '<tr><td colspan="11" class="muted">Sem resultados</td></tr>';
    Swal.fire({ icon: 'error', title: 'Erro ao Carregar', text: e.message });
    pageInfo.textContent = '-';
    prevBtn.disabled = nextBtn.disabled = true;
  }
}

function downloadTemplate() {
  const XLSX = window.XLSX;
  // Colunas em português — exatamente o que o backend lê em postImportInventoryExcel
  // row['SKU'] | row['Produto'] | row['Unidade'] | row['Quantidade'] | row['Custo Unitário'] | row['Categoria'] | row['Observação']
  const data = [
    ['SKU', 'Produto', 'Unidade', 'Quantidade', 'Custo Unitário', 'Categoria', 'Observação'],
    ['HT-003', 'Abacaxi',         'kg',   12,  0.0143, 'Hortifruti',             'Estoque inicial'],
    ['CZ-001', 'Frango Desfiado', 'kg',    8,  0.0438, 'Cozinha',                'Estoque inicial'],
    ['CG-007', 'Açaí',            'kg',   30,  0.0122, 'Congelados e Atacado',   'Estoque inicial'],
    ['DB-014', 'Copo 500ml',      'UN',  200,  0.1500, 'Descartáveis e Bebidas', 'Estoque inicial'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch:12 }, { wch:30 }, { wch:10 }, { wch:14 }, { wch:17 }, { wch:26 }, { wch:32 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estoque Inicial');
  XLSX.writeFile(wb, 'modelo_estoque_inicial.xlsx');
}

async function importInventoryExcel(file) {
  const auth = getAuth();
  const formData = new FormData();
  formData.append('file', file);
  const r = await fetch(`${API}/inventory/import-excel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: formData,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Falha na importação');
  return data;
}

// ─── DOMContentLoaded ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) { location.href = '../../../login/index.html'; return; }

  const q              = document.getElementById('q');
  const categoryFilter = document.getElementById('categoryFilter'); // ✅
  const prevBtn        = document.getElementById('prevBtn');
  const nextBtn        = document.getElementById('nextBtn');
  const clearBtn       = document.getElementById('clearBtn');

  let state = { q: '', category: '', page: 1 };

  document.getElementById('filterForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    state = { q: q.value.trim(), category: categoryFilter.value, page: 1 };
    load(state);
  });

  // ✅ Categoria muda imediatamente sem precisar clicar em Buscar
  categoryFilter.addEventListener('change', () => {
    state = { q: q.value.trim(), category: categoryFilter.value, page: 1 };
    load(state);
  });

  clearBtn.addEventListener('click', () => {
    q.value = ''; categoryFilter.value = '';
    state = { q: '', category: '', page: 1 };
    load(state);
  });

  prevBtn.addEventListener('click', () => { if (state.page > 1) { state.page--; load(state); } });
  nextBtn.addEventListener('click', () => { state.page++; load(state); });

  // Modal
  document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') closeEditModal();
  });

  // Importação em massa
  document.getElementById('btnDownloadTemplate').addEventListener('click', downloadTemplate);
  document.getElementById('btnImportExcel').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const { isConfirmed } = await Swal.fire({
      title: 'Importar estoque inicial',
      html: `<p>Arquivo: <strong>${file.name}</strong></p><p style="color:#555;font-size:13px;">Cada linha gerará um lançamento de entrada no produto correspondente.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
    });

    if (!isConfirmed) return;

    Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const result = await importInventoryExcel(file);

      let html = `<p>✅ <strong>${result.imported}</strong> itens importados</p>`;
      if (result.skipped)        html += `<p>⏭️ <strong>${result.skipped}</strong> linhas ignoradas</p>`;
      if (result.errors?.length) {
        html += `<details style="margin-top:8px;text-align:left">
          <summary style="cursor:pointer;color:#b91c1c">Ver erros (${result.errors.length})</summary>
          <ul style="font-size:12px;margin-top:4px">${result.errors.map(err => `<li>${err}</li>`).join('')}</ul>
        </details>`;
      }

      await Swal.fire({ title: 'Importação concluída', html, icon: 'success', buttonsStyling: false });
      state = { q: '', category: '', page: 1 };
      load(state);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Erro', text: err.message, buttonsStyling: false });
    }
  });

  load(state);
});