const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth(){ 
  try{ 
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); 
  } catch { 
    return null; 
  } 
}

function fmtMoney(n){ 
  const x = Number(n||0); 
  return x.toLocaleString('pt-BR',{minimumFractionDigits:2}); 
}

function fmtDateOnlyUTC(d){
  if (!d) return '—';
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

// ✅ NOVO: Traduzir método de pagamento
function translatePaymentMethod(method) {
  const translations = {
    'BILLED': 'Faturado',
    'PIX': 'PIX',
    'DEBIT': 'Débito',
    'CREDIT': 'Crédito',
    'CASH': 'Dinheiro',
    'TRANSFER': 'Transferência',
    'OTHER': 'Outro'
  };
  return translations[method] || method;
}

// ✅ ATUALIZADO: Incluir page e pageSize
async function listPurchases(params, token){
  const p = new URLSearchParams({ 
    page: params?.page || '1', 
    pageSize: params?.pageSize || '10' 
  });
  if (params?.query) p.set('query', params.query);
  if (params?.dateFrom) p.set('dateFrom', params.dateFrom);
  if (params?.dateTo) p.set('dateTo', params.dateTo);
  if (params?.isPaid !== '') p.set('isPaid', params.isPaid);
  
  const r = await fetch(`${API}/purchases?${p.toString()}`, { 
    headers: { Authorization:`Bearer ${token}` } 
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar');
  return data;
}

function renderList(items){
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  if (!items?.length){
    const tr = document.createElement('tr'); 
    const td = document.createElement('td');
    td.colSpan = 8; // ✅ Ajustado para 8 colunas
    td.className = 'muted'; 
    td.textContent = 'Sem resultados';
    tr.appendChild(td); 
    tb.appendChild(tr); 
    return;
  }
  for(const it of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDateOnlyUTC(it.purchaseDate)}</td>
      <td>${it.invoiceNumber || '—'}</td>
      <td>${it.supplierName}</td>
      <td>${fmtMoney(it.totalAmount)}</td>
      <td>${it.isPaid ? '<span class="pill ok">Sim</span>' : '<span class="pill no">Não</span>'}</td>
      <td>${fmtDateOnlyUTC(it.paymentDueDate)}</td>
      <td><span class="pill">${translatePaymentMethod(it.paymentMethod)}</span></td>
      <td><a class="link" href="../details/index.html?id=${it.id}">Detalhes</a></td>
    `;
    tb.appendChild(tr);
  }
}

// ✅ NOVO: Renderizar paginação
function renderPagination(page, pageCount, total) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';

  if (pageCount <= 1) return; // Não mostrar paginação se houver apenas 1 página

  const info = document.createElement('span');
  info.className = 'pagination-info';
  info.textContent = `Página ${page} de ${pageCount} (${total} registros)`;
  container.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'pagination-controls';

  // Botão "Primeira"
  const btnFirst = document.createElement('button');
  btnFirst.textContent = '«';
  btnFirst.className = 'btn-ghost';
  btnFirst.disabled = page === 1;
  btnFirst.onclick = () => goToPage(1);
  controls.appendChild(btnFirst);

  // Botão "Anterior"
  const btnPrev = document.createElement('button');
  btnPrev.textContent = '‹';
  btnPrev.className = 'btn-ghost';
  btnPrev.disabled = page === 1;
  btnPrev.onclick = () => goToPage(page - 1);
  controls.appendChild(btnPrev);

  // Números de página
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(pageCount, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    const btnPage = document.createElement('button');
    btnPage.textContent = i;
    btnPage.className = i === page ? 'btn-primary' : 'btn-ghost';
    btnPage.onclick = () => goToPage(i);
    controls.appendChild(btnPage);
  }

  // Botão "Próxima"
  const btnNext = document.createElement('button');
  btnNext.textContent = '›';
  btnNext.className = 'btn-ghost';
  btnNext.disabled = page === pageCount;
  btnNext.onclick = () => goToPage(page + 1);
  controls.appendChild(btnNext);

  // Botão "Última"
  const btnLast = document.createElement('button');
  btnLast.textContent = '»';
  btnLast.className = 'btn-ghost';
  btnLast.disabled = page === pageCount;
  btnLast.onclick = () => goToPage(pageCount);
  controls.appendChild(btnLast);

  container.appendChild(controls);
}

// ✅ NOVO: Estado global para paginação
let currentPage = 1;
const pageSize = 10;

function goToPage(page) {
  currentPage = page;
  reload();
}

async function reload(){
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../../login/index.html';
    return;
  }

  const params = {
    query: document.getElementById('q').value || '',
    dateFrom: document.getElementById('dateFrom').value || '',
    dateTo: document.getElementById('dateTo').value || '',
    isPaid: document.getElementById('paid').value,
    page: currentPage,
    pageSize: pageSize
  };

  try {
    const data = await listPurchases(params, auth.token);
    renderList(data.items);
    renderPagination(data.page, data.pageCount, data.total);
  } catch(e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: e.message || 'Falha ao listar',
      buttonsStyling: false
    });
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); 
  if(!auth?.token){ 
    location.href='../../../login/index.html'; 
    return; 
  }

  document.getElementById('btnSearch').addEventListener('click', () => {
    currentPage = 1; // ✅ Resetar para página 1 ao buscar
    reload();
  });

  await reload();
});