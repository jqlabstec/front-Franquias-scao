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

async function loadSuggestions(urgencyFilter = '', showLoading = false) {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return;
  }

  try {
    // ✅ Mostrar loading se solicitado
    if (showLoading) {
      Swal.fire({
        title: 'Atualizando...',
        html: 'Carregando sugestões de compra',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

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

    // ✅ Fechar loading e mostrar sucesso se foi refresh manual
    if (showLoading) {
      Swal.close();
      
      // Toast de sucesso (opcional)
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      
      Toast.fire({
        icon: 'success',
        title: 'Atualizado com sucesso!'
      });
    }

  } catch (error) {
    console.error('Erro ao carregar sugestões:', error);
    
    // ✅ Fechar loading se estiver aberto
    if (showLoading) {
      Swal.close();
    }
    
    // ✅ Mostrar erro com SweetAlert2
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Carregar',
      text: error.message || 'Não foi possível carregar as sugestões',
      confirmButtonText: 'OK'
    });
  }
}

async function exportCSV() {
  const auth = getAuth();
  if (!auth?.token) return;

  try {
    // ✅ Loading durante export
    Swal.fire({
      title: 'Exportando...',
      html: 'Gerando arquivo CSV',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

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

    // ✅ Sucesso
    Swal.fire({
      icon: 'success',
      title: 'Exportado!',
      text: 'O arquivo CSV foi baixado com sucesso',
      confirmButtonText: 'OK',
      timer: 2000
    });

  } catch (error) {
    console.error('Erro ao exportar:', error);
    
    // ✅ Erro
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Exportar',
      text: error.message || 'Não foi possível exportar o CSV',
      confirmButtonText: 'OK'
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return;
  }

  // Load initial data (sem loading na primeira carga)
  await loadSuggestions();

  // Filter
  document.getElementById('filterUrgency').addEventListener('change', (e) => {
    loadSuggestions(e.target.value, false); // Sem loading no filtro
  });

  // ✅ Refresh com loading
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const filter = document.getElementById('filterUrgency').value;
    loadSuggestions(filter, true); // COM loading no refresh manual
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
});