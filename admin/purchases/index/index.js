const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2}); }
function fmtDate(d){ const dt = new Date(d); return isNaN(+dt)?'—':dt.toLocaleString('pt-BR'); }

async function listPurchases(params, token){
  const p = new URLSearchParams({ page:'1', pageSize:'10' });
  if (params?.query) p.set('query', params.query);
  if (params?.dateFrom) p.set('dateFrom', params.dateFrom);
  if (params?.dateTo) p.set('dateTo', params.dateTo);
  if (params?.isPaid !== '') p.set('isPaid', params.isPaid);
  const r = await fetch(`${API}/purchases?${p.toString()}`, { headers: { Authorization:`Bearer ${token}` } });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar');
  return data;
}

function renderList(items){
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  if (!items?.length){
    const tr = document.createElement('tr'); const td=document.createElement('td');
    td.colSpan=7; td.className='muted'; td.textContent='Sem resultados';
    tr.appendChild(td); tb.appendChild(tr); return;
  }
  for(const it of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(it.purchaseDate)}</td>
      <td>${it.invoiceNumber || '—'}</td>
      <td>${it.supplierName}</td>
      <td>${fmtMoney(it.totalAmount)}</td>
      <td>${it.isPaid ? '<span class="pill ok">Sim</span>' : '<span class="pill no">Não</span>'}</td>
      <td>${it.paymentDueDate ? new Date(it.paymentDueDate).toLocaleDateString('pt-BR') : '—'}</td>
      <td><a class="link" href="../details/index.html?id=${it.id}">Detalhes</a></td>
    `;
    tb.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  async function reload(){
    const params = {
      query: document.getElementById('q').value || '',
      dateFrom: document.getElementById('dateFrom').value || '',
      dateTo: document.getElementById('dateTo').value || '',
      isPaid: document.getElementById('paid').value,
    };
    try{
      const data = await listPurchases(params, auth.token);
      renderList(data.items);
    }catch(e){
      Swal.fire({icon:'error',title:'Erro', text: e.message || 'Falha ao listar', buttonsStyling:false});
    }
  }
  document.getElementById('btnSearch').addEventListener('click', reload);
  await reload();
});