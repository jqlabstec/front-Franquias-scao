const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function fmtMoney(n) {
  return n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNumber(n, decimals = 2) {
  return n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function getUrgencyPill(urgency) {
  const map = {
    CRITICAL: '<span class="pill critical">Crítico</span>',
    HIGH: '<span class="pill high">Alto</span>',
    MEDIUM: '<span class="pill medium">Médio</span>',
    LOW: '<span class="pill low">Baixo</span>',
  };
  return map[urgency] || urgency;
}

function renderTable(suggestions) {
  const tbody = document.getElementById('tbody-suggestions');
  tbody.innerHTML = '';

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="10" class="muted">Nenhuma sugestão de compra no momento</td>';
    tbody.appendChild(tr);
    return;
  }

  for (const item of suggestions) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${getUrgencyPill(item.urgency)}</td>
      <td>${item.productCode}</td>
      <td><strong>${item.productName}</strong></td>
      <td class="text-right">${fmtNumber(item.currentQty, 2)}</td>
      <td class="text-right">${fmtNumber(item.minQty, 2)}</td>
      <td class="text-right"><strong>${fmtNumber(item.suggestedQty, 2)}</strong></td>
      <td>${item.unitOfMeasure}</td>
      <td class="text-center">${item.daysUntilStockout !== null ? item.daysUntilStockout + ' dias' : '—'}</td>
      <td class="text-right">${fmtMoney(item.lastPurchasePrice)}</td>
      <td class="text-right"><strong>${fmtMoney(item.estimatedCost)}</strong></td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadSuggestions(urgencyFilter = '') {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return;
  }

  try {
    const url = urgencyFilter 
      ? `${API}/purchase-suggestions?urgency=${urgencyFilter}`
      : `${API}/purchase-suggestions`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Erro ao carregar sugestões');
    }

    // Update stats
    document.getElementById('statCritical').textContent = data.summary?.critical || 0;
    document.getElementById('statHigh').textContent = data.summary?.high || 0;
    document.getElementById('statMedium').textContent = data.summary?.medium || 0;
    document.getElementById('statLow').textContent = data.summary?.low || 0;
    document.getElementById('statTotal').textContent = data.summary?.total || 0;
    document.getElementById('statCost').textContent = fmtMoney(data.summary?.estimatedTotalCost || 0);

    // Render table
    renderTable(data.suggestions || []);

  } catch (error) {
    console.error('Erro ao carregar sugestões:', error);
    alert(error.message || 'Erro ao carregar sugestões');
  }
}

async function exportCSV() {
  const auth = getAuth();
  if (!auth?.token) return;

  try {
    const response = await fetch(`${API}/purchase-suggestions/export`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!response.ok) {
      throw new Error('Erro ao exportar');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sugestao-compras-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao exportar:', error);
    alert('Erro ao exportar CSV');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return;
  }

  // Load initial data
  await loadSuggestions();

  // Filter
  document.getElementById('filterUrgency').addEventListener('change', (e) => {
    loadSuggestions(e.target.value);
  });

  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const filter = document.getElementById('filterUrgency').value;
    loadSuggestions(filter);
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
});