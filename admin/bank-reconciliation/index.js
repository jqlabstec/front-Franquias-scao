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
    
    // ✅ SweetAlert2 para erro
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Carregar',
      text: 'Não foi possível carregar os dados salvos',
      confirmButtonText: 'OK'
    });
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
  
  // ✅ SweetAlert2 para confirmação
  const result = await Swal.fire({
    icon: 'question',
    title: 'Reprocessar Conciliações?',
    text: 'Isso pode demorar alguns segundos.',
    showCancelButton: true,
    confirmButtonText: 'Sim, reprocessar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  // ✅ Loading
  Swal.fire({
    title: 'Reprocessando...',
    text: 'Aguarde enquanto as conciliações são reprocessadas',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const response = await fetch(`${API}/bank-reconciliation/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data?.message);

    // ✅ Sucesso
    await Swal.fire({
      icon: 'success',
      title: 'Reprocessamento Concluído!',
      text: `${data.updated} conciliações foram reprocessadas`,
      confirmButtonText: 'OK'
    });
    
    // Recarregar dados
    await loadReconciliations();

  } catch (error) {
    console.error('Erro ao reprocessar:', error);
    
    // ✅ Erro
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Reprocessar',
      text: error.message || 'Ocorreu um erro ao reprocessar as conciliações',
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

  const uploadForm = document.getElementById('uploadForm');
  const csvFile = document.getElementById('csvFile');
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
      // ✅ SweetAlert2 para validação
      Swal.fire({
        icon: 'warning',
        title: 'Arquivo Necessário',
        text: 'Selecione um arquivo CSV para continuar',
        confirmButtonText: 'OK'
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // ✅ Loading
    Swal.fire({
      title: 'Processando...',
      text: 'Importando e conciliando transações',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

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

      // ✅ Sucesso
      await Swal.fire({
        icon: 'success',
        title: 'Importação Concluída!',
        html: `
          <div style="text-align: left; margin-top: 16px;">
            <p><strong>${data.created}</strong> transações criadas</p>
            <p><strong>${data.updated}</strong> transações atualizadas</p>
            <p><strong>${data.summary?.matched || 0}</strong> conciliadas automaticamente</p>
          </div>
        `,
        confirmButtonText: 'OK'
      });

      // Recarregar dados
      await loadReconciliations();

      // Limpar input
      csvFile.value = '';

    } catch (error) {
      console.error('Erro na conciliação:', error);
      
      // ✅ Erro
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Processar',
        text: error.message || 'Erro ao processar arquivo',
        confirmButtonText: 'OK'
      });
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
  });
});