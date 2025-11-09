const API_BASE = 'http://localhost:3000/api/v1';

let currentPage = 1;
const pageSize = 20;
let filters = {};

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function getFranchiseId() {
  const auth = getAuth();
  return auth?.user?.franchiseId || 1;
}

function getHeaders() {
  const auth = getAuth();
  return {
    'Authorization': `Bearer ${auth.token}`,
    'Content-Type': 'application/json',
  };
}

// ✅ Elementos
const salesBody = document.getElementById('salesBody');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const statTotal = document.getElementById('statTotal');
const statCount = document.getElementById('statCount');
const statAverage = document.getElementById('statAverage');
const statWithExcel = document.getElementById('statWithExcel');

const filterStartDate = document.getElementById('filterStartDate');
const filterEndDate = document.getElementById('filterEndDate');
const filterFiscalNumber = document.getElementById('filterFiscalNumber');
const filterStatus = document.getElementById('filterStatus');
const btnFilter = document.getElementById('btnFilter');
const btnClearFilters = document.getElementById('btnClearFilters');

const detailsModal = document.getElementById('detailsModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const modalBody = document.getElementById('modalBody');

// ✅ Inicializar
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  loadSales();
});

// ✅ Definir datas padrão (último mês)
function setDefaultDates() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  filterStartDate.value = lastMonth.toISOString().split('T')[0];
  filterEndDate.value = today.toISOString().split('T')[0];
}

// ✅ Filtros
btnFilter.addEventListener('click', () => {
  currentPage = 1;
  filters = {
    startDate: filterStartDate.value,
    endDate: filterEndDate.value,
    fiscalNumber: filterFiscalNumber.value,
    status: filterStatus.value,
  };
  loadSales();
});

btnClearFilters.addEventListener('click', () => {
  filterStartDate.value = '';
  filterEndDate.value = '';
  filterFiscalNumber.value = '';
  filterStatus.value = '';
  filters = {};
  currentPage = 1;
  setDefaultDates();
  loadSales();
});

// ✅ Paginação
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadSales();
  }
});

nextBtn.addEventListener('click', () => {
  currentPage++;
  loadSales();
});

// ✅ Modal
btnCloseModal.addEventListener('click', () => {
  detailsModal.classList.remove('show');
});

detailsModal.addEventListener('click', (e) => {
  if (e.target === detailsModal) {
    detailsModal.classList.remove('show');
  }
});

// ✅ Carregar vendas
async function loadSales() {
  try {
    const franchiseId = getFranchiseId();
    const params = new URLSearchParams({
      franchiseId,
      page: currentPage,
      pageSize,
      ...filters,
    });

    const res = await fetch(`${API_BASE}/sales?${params}`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error('Erro ao carregar vendas');

    const data = await res.json();
    const sales = data.data || [];
    const total = data.total || 0;

    // ✅ Atualizar estatísticas
    updateStats(sales);

    // ✅ Renderizar tabela
    if (sales.length === 0) {
      salesBody.innerHTML = `
        <tr>
          <td colspan="10" class="muted">Nenhuma venda encontrada</td>
        </tr>
      `;
    } else {
      salesBody.innerHTML = sales.map(sale => `
        <tr>
          <td>${sale.fiscalNumber || '-'}</td>
          <td>${formatDate(sale.saleDate)}</td>
          <td>${formatCurrency(sale.totalAmount)}</td>
          <td>${formatCurrency(sale.discount || 0)}</td>
          <td>${formatCurrency(sale.tip || 0)}</td>
          <td>${sale.operator || '-'}</td>
          <td>${sale.platform || '-'}</td>
          <td>${sale.tableNumber || '-'}</td>
          <td>${renderStatus(sale.importStatus)}</td>
          <td>
            <button class="btn-ghost btn-sm" onclick="viewDetails(${sale.id})"> Detalhes</button>
          </td>
        </tr>
      `).join('');
    }

    // ✅ Atualizar paginação
    const totalPages = Math.ceil(total / pageSize);
    pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1} (${total} vendas)`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages || total === 0;
  } catch (err) {
    console.error('Erro ao carregar vendas:', err);
    salesBody.innerHTML = `
      <tr>
        <td colspan="10" class="muted">❌ Erro ao carregar vendas</td>
      </tr>
    `;
  }
}

// ✅ Atualizar estatísticas
function updateStats(sales) {
  const total = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const count = sales.length;
  const average = count > 0 ? total / count : 0;
  const withExcel = sales.filter(s => s.importStatus !== 'XML_ONLY').length;

  statTotal.textContent = formatCurrency(total);
  statCount.textContent = count;
  statAverage.textContent = formatCurrency(average);
  statWithExcel.textContent = withExcel;
}

// ✅ Ver detalhes
async function viewDetails(saleId) {
  try {
    const franchiseId = getFranchiseId(); // ✅ ADICIONAR
    
    const res = await fetch(`${API_BASE}/sales/${saleId}?franchiseId=${franchiseId}`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error('Erro ao carregar detalhes');

    const data = await res.json();
    const sale = data.data;

    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Cupom Fiscal</div>
          <div class="detail-value">${sale.fiscalNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Data</div>
          <div class="detail-value">${formatDateTime(sale.saleDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Valor Total</div>
          <div class="detail-value">${formatCurrency(sale.totalAmount)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Desconto</div>
          <div class="detail-value">${formatCurrency(sale.discount || 0)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Gorjeta</div>
          <div class="detail-value">${formatCurrency(sale.tip || 0)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Operador</div>
          <div class="detail-value">${sale.operator || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Plataforma</div>
          <div class="detail-value">${sale.platform || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Mesa</div>
          <div class="detail-value">${sale.tableNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Assentos</div>
          <div class="detail-value">${sale.seats || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">${renderStatus(sale.importStatus)}</div>
        </div>
      </div>

      ${sale.payments && sale.payments.length > 0 ? `
        <div class="detail-section">
          <h3>💳 Pagamentos</h3>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Bandeira</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${sale.payments.map(p => `
                  <tr>
                    <td>${p.paymentMethod}</td>
                    <td>${p.cardBrand || '-'}</td>
                    <td>${formatCurrency(p.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${sale.saleItems && sale.saleItems.length > 0 ? `
        <div class="detail-section">
          <h3>🛒 Itens da Venda</h3>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código XML</th>
                  <th>Quantidade</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${sale.saleItems.map(item => `
                  <tr>
                    <td>${item.recipe ? item.recipe.name : item.xmlProductName}</td>
                    <td>${item.xmlProductCode}</td>
                    <td>${Number(item.quantity).toFixed(2)}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    detailsModal.classList.add('show');
  } catch (err) {
    console.error('Erro ao carregar detalhes:', err);
    Swal.fire('Erro', err.message, 'error');
  }
}

// ✅ Funções auxiliares
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function renderStatus(status) {
  const statusMap = {
    'XML_ONLY': '<span class="pill warn">Apenas XML</span>',
    'EXCEL_MATCHED': '<span class="pill ok">Com Excel</span>',
    'COMPLETED': '<span class="pill info">Completo</span>',
  };
  return statusMap[status] || '<span class="pill">-</span>';
}

// ✅ Expor função global
window.viewDetails = viewDetails;