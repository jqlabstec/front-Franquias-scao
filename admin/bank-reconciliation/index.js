const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function fmtMoney(n) {
  return n == null ? '—' : Number(n).toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
}

function fmtDate(d) {
  const dt = new Date(d);
  return isNaN(+dt) ? '—' : dt.toLocaleDateString('pt-BR');
}

function renderTable(tbodyId, items, columns) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  
  if (!Array.isArray(items) || items.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length;
    td.className = 'muted';
    td.textContent = 'Nenhum registro';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const item of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = columns.map(col => `<td>${col(item)}</td>`).join('');
    tbody.appendChild(tr);
  }
}

// ✅ Carregar dados salvos com pageSize maior
async function loadReconciliations() {
  const auth = getAuth();
  const uploadStatus = document.getElementById('uploadStatus');
  
  try {
    // ✅ Adicionar pageSize=1000 na query
    const response = await fetch(`${API}/bank-reconciliation?pageSize=1000`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data?.message);

    updateUI(data);
  } catch (error) {
    console.error('Erro ao carregar conciliações:', error);
    uploadStatus.textContent = 'Erro ao carregar dados salvos';
    uploadStatus.classList.remove('hidden');
    uploadStatus.classList.add('warn');
  }
}

// ✅ Atualizar interface
function updateUI(data) {
  // Update stats
  document.getElementById('statMatched').textContent = data.summary?.matched || 0;
  document.getElementById('statNotFound').textContent = data.summary?.notFound || 0;
  document.getElementById('statMismatch').textContent = data.summary?.mismatch || 0;
  document.getElementById('statTotal').textContent = data.summary?.total || 0;

  // Filtrar items por status
  const items = data.items || [];
  
  const matched = items.filter(i => i.reconciliationStatus === 'MATCHED');
  const notFound = items.filter(i => i.reconciliationStatus === 'NOT_FOUND');
  const mismatch = items.filter(i => i.reconciliationStatus === 'MISMATCH');

  // Render tables
  renderTable('tbody-matched', matched, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.sale ? fmtMoney(item.sale.totalAmount) : '—',
    () => '<span class="pill ok">Conciliada</span>'
  ]);

  renderTable('tbody-notFound', notFound, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.clientName || '—',
    item => item.buyerEmail || '—'
  ]);

  renderTable('tbody-mismatch', mismatch, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.sale ? fmtMoney(item.sale.totalAmount) : '—',
    item => `<span class="pill danger">${fmtMoney(item.reconciliationDiff)}</span>`
  ]);

  document.getElementById('resultsCard').style.display = 'block';
}

// ✅ Reprocessar conciliações
async function reprocessAll() {
  const auth = getAuth();
  const uploadStatus = document.getElementById('uploadStatus');
  
  if (!confirm('Reprocessar todas as conciliações? Isso pode demorar alguns segundos.')) return;

  uploadStatus.textContent = 'Reprocessando...';
  uploadStatus.classList.remove('hidden', 'warn');

  try {
    const response = await fetch(`${API}/bank-reconciliation/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data?.message);

    uploadStatus.textContent = `✅ ${data.updated} conciliações reprocessadas!`;
    uploadStatus.classList.remove('warn');
    
    // Recarregar dados
    await loadReconciliations();

  } catch (error) {
    console.error('Erro ao reprocessar:', error);
    uploadStatus.textContent = error.message;
    uploadStatus.classList.add('warn');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return;
  }

  const uploadForm = document.getElementById('uploadForm');
  const csvFile = document.getElementById('csvFile');
  const uploadStatus = document.getElementById('uploadStatus');
  const resultsCard = document.getElementById('resultsCard');
  const clearResults = document.getElementById('clearResults');
  const reprocessBtn = document.getElementById('reprocessBtn');

  // ✅ Carregar dados ao iniciar
  await loadReconciliations();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });

  // ✅ Upload form (importar e conciliar)
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = csvFile.files[0];
    if (!file) {
      uploadStatus.textContent = 'Selecione um arquivo CSV';
      uploadStatus.classList.remove('hidden');
      uploadStatus.classList.add('warn');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadStatus.textContent = 'Processando...';
    uploadStatus.classList.remove('hidden', 'warn');

    try {
      const response = await fetch(`${API}/bank-reconciliation/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao processar conciliação');
      }

      uploadStatus.textContent = `✅ Importação concluída! ${data.created} criadas, ${data.updated} atualizadas. ${data.summary?.matched || 0} conciliadas.`;
      uploadStatus.classList.remove('warn');

      // Recarregar dados
      await loadReconciliations();

      // Limpar input
      csvFile.value = '';

    } catch (error) {
      console.error('Erro na conciliação:', error);
      uploadStatus.textContent = error.message || 'Erro ao processar arquivo';
      uploadStatus.classList.add('warn');
    }
  });

  // ✅ Reprocessar
  if (reprocessBtn) {
    reprocessBtn.addEventListener('click', reprocessAll);
  }

  // Clear results
  clearResults.addEventListener('click', () => {
    resultsCard.style.display = 'none';
    csvFile.value = '';
    uploadStatus.classList.add('hidden');
  });
});