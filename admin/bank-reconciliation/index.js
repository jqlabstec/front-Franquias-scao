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

function fmtDate(d) {
  const dt = new Date(d);
  return isNaN(+dt) ? '—' : dt.toLocaleDateString('pt-BR');
}

function statusLabel(status) {
  switch (status) {
    case 'MATCHED':   return '<span class="pill ok">Conciliada</span>';
    case 'MISMATCH':  return '<span class="pill warn">Divergência</span>';
    case 'NOT_FOUND': return '<span class="pill info">Venda Realizada</span>';
    default:          return '<span class="pill">—</span>';
  }
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

async function loadReconciliations() {
  const auth = getAuth();

  try {
    const response = await fetch(`${API}/bank-reconciliation?pageSize=1000`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message);

    updateUI(data);
  } catch (error) {
    console.error('Erro ao carregar conciliações:', error);
    Swal.fire({ icon: 'error', title: 'Erro ao Carregar', text: 'Não foi possível carregar os dados salvos' });
  }
}

function updateUI(data) {
  document.getElementById('statMatched').textContent  = data.summary?.matched  || 0;
  document.getElementById('statNotFound').textContent = data.summary?.notFound || 0;
  document.getElementById('statMismatch').textContent = data.summary?.mismatch || 0;
  document.getElementById('statTotal').textContent    = data.summary?.total    || 0;

  const items    = data.items || [];
  const matched  = items.filter(i => i.reconciliationStatus === 'MATCHED');
  const notFound = items.filter(i => i.reconciliationStatus === 'NOT_FOUND');
  const mismatch = items.filter(i => i.reconciliationStatus === 'MISMATCH');

  renderTable('tbody-matched', matched, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.sale ? fmtMoney(item.sale.totalAmount) : '—',
    ()   => '<span class="pill ok">Conciliada</span>',
  ]);

  renderTable('tbody-notFound', notFound, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.clientName || '—',
    item => item.paymentMethod || '—',
    ()   => '<span class="pill info">Venda Realizada</span>',
    item => `<button class="btn-sm btn-primary" onclick="openLinkModal(${item.id}, '${item.transactionDate}', ${Number(item.netAmount || item.amount)})">🔗 Vincular</button>`,
  ]);

  renderTable('tbody-mismatch', mismatch, [
    item => fmtDate(item.transactionDate),
    item => item.bankStatementId || '—',
    item => fmtMoney(item.netAmount || item.amount),
    item => item.sale ? fmtMoney(item.sale.totalAmount) : '—',
    item => `<span class="pill danger">${fmtMoney(item.reconciliationDiff)}</span>`,
  ]);

  document.getElementById('resultsCard').style.display = 'block';
}

// ========== MODAL DE VINCULAÇÃO ==========
let currentLinkTxnId = null;

function ensureModal() {
  if (document.getElementById('linkModal')) return;

  const modal = document.createElement('div');
  modal.id = 'linkModal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h3>Vincular Venda</h3>
        <button class="btn-ghost" id="closeLinkModal">✕</button>
      </div>
      <div class="modal-body">
        <p class="muted" id="linkModalInfo"></p>
        <div class="field" style="margin-top: 1rem;">
          <label>Buscar venda por número fiscal ou valor</label>
          <input type="text" id="linkSearchInput" placeholder="Ex: NF-001 ou 45.90" />
          <button class="btn-primary btn-sm" id="linkSearchBtn" style="margin-top: 0.5rem;">🔍 Buscar</button>
        </div>
        <div id="linkSearchResults" style="margin-top: 1rem;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.openLinkModal = function(txnId, txnDate, txnAmount) {
  ensureModal();
  currentLinkTxnId = txnId;

  document.getElementById('linkModal').classList.remove('hidden');
  document.getElementById('linkModalInfo').textContent = `Transação de ${fmtDate(txnDate)} — ${fmtMoney(txnAmount)}`;
  document.getElementById('linkSearchInput').value = '';
  document.getElementById('linkSearchResults').innerHTML = '';
};

async function searchSales() {
  const auth = getAuth();
  const q = document.getElementById('linkSearchInput').value.trim();
  if (!q) return;

  const resultsEl = document.getElementById('linkSearchResults');
  resultsEl.innerHTML = '<p class="muted">Buscando...</p>';

  try {
    const response = await fetch(`${API}/sales?q=${encodeURIComponent(q)}&pageSize=10`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    const data = await response.json();
    const sales = data.items || data || [];

    if (!sales.length) {
      resultsEl.innerHTML = '<p class="muted">Nenhuma venda encontrada</p>';
      return;
    }

    resultsEl.innerHTML = `
      <table class="tbl">
        <thead>
          <tr>
            <th>Data</th>
            <th>NF</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sales.map(s => `
            <tr>
              <td>${fmtDate(s.saleDate)}</td>
              <td>${s.fiscalNumber || s.orderNumber || '—'}</td>
              <td>${fmtMoney(s.totalAmount)}</td>
              <td><button class="btn-sm btn-primary" onclick="linkSale(${s.id})">Vincular</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    resultsEl.innerHTML = '<p class="muted">Erro ao buscar vendas</p>';
  }
}

window.linkSale = async function(saleId) {
  const auth = getAuth();
  if (!currentLinkTxnId) return;

  try {
    const response = await fetch(`${API}/bank-reconciliation/${currentLinkTxnId}/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ saleId }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message);

    document.getElementById('linkModal').classList.add('hidden');

    await Swal.fire({
      icon: 'success',
      title: 'Venda Vinculada!',
      text: 'A transação foi conciliada com sucesso',
      timer: 2000,
    });

    await loadReconciliations();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Erro ao vincular venda' });
  }
};

// ========== REPROCESSAR ==========
async function reprocessAll() {
  const auth = getAuth();

  const result = await Swal.fire({
    icon: 'question',
    title: 'Reprocessar Conciliações?',
    text: 'Isso pode demorar alguns segundos.',
    showCancelButton: true,
    confirmButtonText: 'Sim, reprocessar',
    cancelButtonText: 'Cancelar',
  });

  if (!result.isConfirmed) return;

  Swal.fire({ title: 'Reprocessando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const response = await fetch(`${API}/bank-reconciliation/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message);

    await Swal.fire({
      icon: 'success',
      title: 'Reprocessamento Concluído!',
      text: `${data.updated} conciliações foram reprocessadas`,
    });

    await loadReconciliations();
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao Reprocessar', text: error.message });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) { location.href = '../../login/index.html'; return; }

  // Garantir que modal existe e registrar listeners
  ensureModal();

  document.getElementById('closeLinkModal').addEventListener('click', () => {
    document.getElementById('linkModal').classList.add('hidden');
  });
  document.getElementById('linkSearchBtn').addEventListener('click', searchSales);
  document.getElementById('linkSearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchSales();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });

  // Upload
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('csvFile').files[0];
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'Arquivo Necessário', text: 'Selecione um arquivo CSV' });
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    Swal.fire({ title: 'Processando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const response = await fetch(`${API}/bank-reconciliation/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message);
      await Swal.fire({
        icon: 'success',
        title: 'Importação Concluída!',
        html: `
          <div style="text-align:left; margin-top:16px;">
            <p><strong>${data.created}</strong> transações criadas</p>
            <p><strong>${data.updated}</strong> transações atualizadas</p>
            <p><strong>${data.summary?.matched || 0}</strong> conciliadas automaticamente</p>
          </div>
        `,
      });
      await loadReconciliations();
      document.getElementById('csvFile').value = '';
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erro ao Processar', text: error.message });
    }
  });

  document.getElementById('reprocessBtn')?.addEventListener('click', reprocessAll);

  document.getElementById('clearResults').addEventListener('click', () => {
    document.getElementById('resultsCard').style.display = 'none';
    document.getElementById('csvFile').value = '';
  });

  // Carregar por último
  await loadReconciliations();
});