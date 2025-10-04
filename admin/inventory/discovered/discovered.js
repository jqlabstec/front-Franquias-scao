const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function getHeaders() {
  const auth = getAuth();
  return {
    'Content-Type': 'application/json',
    ...(auth?.token && { Authorization: `Bearer ${auth.token}` }),
  };
}

let allProducts = [];
let filteredProducts = [];

// ========== LOAD DATA ==========
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/discovered-products`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error('Erro ao carregar produtos');

    allProducts = await res.json();
    filteredProducts = [...allProducts];
    renderTable();
    updateKPIs();
  } catch (err) {
    showBanner(err.message, 'warn');
  }
}

// ========== RENDER TABLE ==========
function renderTable() {
  const tbody = document.getElementById('tbody');

  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="muted">Nenhum produto encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = filteredProducts
    .map((p) => {
      const statusPill = p.isImported
        ? '<span class="pill ok">Importado</span>'
        : '<span class="pill warn">Pendente</span>';

      const actions = p.isImported
        ? `<button class="btn-sm btn-ghost" onclick="viewRecipe(${p.importedRecipeId})">Ver Receita</button>`
        : `<button class="btn-sm btn-primary" onclick="openImportDialog(${p.id})">Importar</button>
           <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>`;

      return `
        <tr>
          <td>${p.externalCode}</td>
          <td>${p.name}</td>
          <td>${p.category || '—'}</td>
          <td class="num">R$ ${Number(p.avgPrice).toFixed(2)}</td>
          <td class="num">${p.timesFound}x</td>
          <td>${new Date(p.firstSeenAt).toLocaleDateString('pt-BR')}</td>
          <td>${statusPill}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join('');
}

// ========== UPDATE KPIs ==========
function updateKPIs() {
  const total = allProducts.length;
  const pending = allProducts.filter((p) => !p.isImported).length;
  const imported = allProducts.filter((p) => p.isImported).length;
  const avgPrice =
    allProducts.length > 0
      ? allProducts.reduce((sum, p) => sum + Number(p.avgPrice), 0) / total
      : 0;

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-pending').textContent = pending;
  document.getElementById('kpi-imported').textContent = imported;
  document.getElementById('kpi-avg').textContent = `R$ ${avgPrice.toFixed(2)}`;
}

// ========== FILTERS ==========
function applyFilters() {
  const q = document.getElementById('q').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;

  filteredProducts = allProducts.filter((p) => {
    const matchQuery = p.name.toLowerCase().includes(q) || p.externalCode.includes(q);
    const matchStatus =
      !status ||
      (status === 'pending' && !p.isImported) ||
      (status === 'imported' && p.isImported);

    return matchQuery && matchStatus;
  });

  renderTable();
}

// ========== UPLOAD XML ==========
async function uploadXML() {
  const fileInput = document.getElementById('f-xml-file');
  const file = fileInput.files[0];

  if (!file) {
    Swal.fire('Erro', 'Selecione um arquivo XML', 'error');
    return;
  }

  const xmlContent = await file.text();

  try {
    const res = await fetch(`${API_BASE}/discovered-products/upload-xml`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ xmlContent }),
    });

    if (!res.ok) throw new Error('Erro ao processar XML');

    const data = await res.json();

    Swal.fire('Sucesso!', `${data.discoveredProducts.length} produtos descobertos`, 'success');
    document.getElementById('uploadDialog').close();
    loadProducts();
  } catch (err) {
    Swal.fire('Erro', err.message, 'error');
  }
}

// ========== IMPORT AS RECIPE ==========
function openImportDialog(id) {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  document.getElementById('import-id').value = id;
  document.getElementById('f-name').value = product.name;
  document.getElementById('f-category').value = product.category || '';
  document.getElementById('f-description').value = '';

  document.getElementById('importDialog').showModal();
}

async function importAsRecipe() {
  const id = document.getElementById('import-id').value;
  const name = document.getElementById('f-name').value;
  const category = document.getElementById('f-category').value;
  const description = document.getElementById('f-description').value;

  try {
    const res = await fetch(`${API_BASE}/discovered-products/${id}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, category, description }),
    });

    if (!res.ok) throw new Error('Erro ao importar produto');

    Swal.fire('Sucesso!', 'Produto importado como receita', 'success');
    document.getElementById('importDialog').close();
    loadProducts();
  } catch (err) {
    Swal.fire('Erro', err.message, 'error');
  }
}

// ========== DELETE PRODUCT ==========
async function deleteProduct(id) {
  const confirm = await Swal.fire({
    title: 'Tem certeza?',
    text: 'Esta ação não pode ser desfeita',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, deletar',
    cancelButtonText: 'Cancelar',
  });

  if (!confirm.isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE}/discovered-products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error('Erro ao deletar produto');

    Swal.fire('Deletado!', 'Produto removido', 'success');
    loadProducts();
  } catch (err) {
    Swal.fire('Erro', err.message, 'error');
  }
}

// ========== VIEW RECIPE ==========
function viewRecipe(recipeId) {
  window.location.href = `../../../recipes/detail/index.html?id=${recipeId}`;
}

// ========== BANNER ==========
function showBanner(msg, type = 'ok') {
  const banner = document.getElementById('status');
  banner.textContent = msg;
  banner.className = `banner ${type}`;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 5000);
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  document.getElementById('applyBtn').addEventListener('click', applyFilters);
  document.getElementById('uploadXmlBtn').addEventListener('click', () => {
    document.getElementById('uploadDialog').showModal();
  });

  document.getElementById('dlgCancelUpload').addEventListener('click', () => {
    document.getElementById('uploadDialog').close();
  });

  document.getElementById('dlgUpload').addEventListener('click', (e) => {
    e.preventDefault();
    uploadXML();
  });

  document.getElementById('dlgCancelImport').addEventListener('click', () => {
    document.getElementById('importDialog').close();
  });

  document.getElementById('dlgSaveImport').addEventListener('click', (e) => {
    e.preventDefault();
    importAsRecipe();
  });
});

// Expor funções globalmente
window.openImportDialog = openImportDialog;
window.deleteProduct = deleteProduct;
window.viewRecipe = viewRecipe;