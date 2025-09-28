const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

const btnPrimaryStyle = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;';
const btnGhostStyle   = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';

function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:6}); }
function fmtDateTime(d){ if(!d) return '—'; const dt = new Date(d); return dt.toLocaleString('pt-BR'); }
function fmtDateOnly(d){ if(!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('pt-BR'); }
function toastSuccess(title='Operação concluída'){ return Swal.fire({toast:true,position:'top-end',icon:'success',title,showConfirmButton:false,timer:1800,timerProgressBar:true}); }
function toastError(title='Falha na operação'){ return Swal.fire({toast:true,position:'top-end',icon:'error',title,showConfirmButton:false,timer:2200,timerProgressBar:true}); }

async function fetchPurchase(id, token){
  const r = await fetch(`${API}/purchases/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar compra');
  return data;
}

async function patchPurchase(id, payload, token){
  const r = await fetch(`${API}/purchases/${id}`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao atualizar compra');
  return data;
}

const state = { purchase: null };

function renderHeader(p){
  document.getElementById('hdrInvoice').textContent = p.invoiceNumber ? `#${p.invoiceNumber}` : '';
  document.getElementById('supplierName').textContent = p.supplierName || '—';
  document.getElementById('purchaseDate').textContent = fmtDateTime(p.purchaseDate);
  document.getElementById('paymentDueDate').textContent = fmtDateOnly(p.paymentDueDate);

  const status = document.getElementById('statusPaid'); status.innerHTML = '';
  const badge = document.createElement('span');
  badge.className = 'badge ' + (p.isPaid ? 'badge-green' : 'badge-amber');
  badge.textContent = p.isPaid ? 'PAGO' : 'EM ABERTO';
  status.appendChild(badge);
}

function renderItems(p){
  const tb = document.getElementById('tbodyItems'); tb.innerHTML = '';
  const items = p.purchaseItems || [];
  let total = 0;
  items.forEach((it, idx)=>{
    const code = it.product?.code || '—';
    const name = it.product?.name || '—';
    const qty = Number(it.quantity || 0);
    const unit = Number(it.unitCostAtPurchase || 0);
    const sub = qty * unit; total += sub;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td class="mono">${code}</td>
      <td>${name}</td>
      <td class="mono">${qty}</td>
      <td class="mono">${fmtMoney(unit)}</td>
      <td class="mono">${fmtMoney(sub)}</td>
    `;
    tb.appendChild(tr);
  });
  document.getElementById('tfootTotal').textContent = fmtMoney(total);
  document.getElementById('subtotal').textContent = fmtMoney(total);
  document.getElementById('total').textContent = fmtMoney(state.purchase?.totalValue ?? total);
}

function bindActions(){
  const auth = getAuth(); if(!auth?.token) return;
  const id = new URLSearchParams(location.search).get('id');
  if(!id) return;

document.getElementById('btnTogglePaid').addEventListener('click', async ()=>{
  const auth = getAuth(); const id = new URLSearchParams(location.search).get('id');
  try{
    const updated = await patchPurchasePaid(id, !state.purchase.isPaid, auth.token);
    state.purchase = updated;
    renderHeader(updated);
    toastSuccess('Status de pagamento atualizado');
  }catch(e){ toastError(e.message); }
});

document.getElementById('btnEditDue').addEventListener('click', async ()=>{
  const auth = getAuth(); const id = new URLSearchParams(location.search).get('id');
  const { value: dateStr } = await Swal.fire({
    title: 'Editar vencimento',
    html: `<input id="swalDue" type="date" class="swal2-input" style="width:auto" value="${ state.purchase.paymentDueDate ? new Date(state.purchase.paymentDueDate).toISOString().slice(0,10) : '' }">`,
    focusConfirm:false, showCancelButton:true,
    confirmButtonText:'Salvar', cancelButtonText:'Cancelar',
    buttonsStyling:false,
    didRender:()=>{ 
      Swal.getConfirmButton()?.setAttribute('style', btnPrimaryStyle);
      Swal.getCancelButton()?.setAttribute('style', btnGhostStyle);
      Swal.getActions().style.gap='8px';
    },
    preConfirm:()=> document.getElementById('swalDue')?.value || null
  });
  if (dateStr === undefined) return;

  try{
    const iso = dateStr ? new Date(dateStr).toISOString() : null;
    const updated = await patchPurchaseDueDate(id, iso, auth.token);
    state.purchase = updated;
    renderHeader(updated);
    toastSuccess('Vencimento atualizado');
  }catch(e){ toastError(e.message); }
})

  document.getElementById('btnViewXml').addEventListener('click', ()=>{
    const xml = state.purchase?.xmlContent;
    if (!xml) { toastError('XML não disponível'); return; }
    const pre = document.createElement('pre');
    pre.textContent = xml;
    pre.style.maxHeight = '50vh';
    pre.style.overflow = 'auto';
    pre.style.textAlign = 'left';
    Swal.fire({
      title: 'XML da Nota',
      html: pre,
      width: '70rem',
      confirmButtonText: 'Fechar',
      buttonsStyling:false,
      didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style', btnGhostStyle); }
    });
  });

  document.getElementById('btnDownloadXml').addEventListener('click', ()=>{
    const xml = state.purchase?.xmlContent;
    if (!xml) { toastError('XML não disponível'); return; }
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const inv = state.purchase?.invoiceNumber || 'nota';
    a.download = `nfe-${inv}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../login/index.html'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if(!id){
    await Swal.fire({ icon:'error', title:'ID ausente', text:'Compra não informada.', buttonsStyling:false, didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style', btnGhostStyle); }});
    location.href = '../index/index.html'; return;
  }

  try{
    const purchase = await fetchPurchase(id, auth.token);
    state.purchase = purchase;
    renderHeader(purchase);
    renderItems(purchase);
    bindActions();
  }catch(e){
    await Swal.fire({ icon:'error', title:'Falha ao carregar', text: e.message || 'Erro', buttonsStyling:false, didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style', btnGhostStyle); }});
    location.href = '../index/index.html';
  }
});


async function patchPurchasePaid(id, isPaid, token){
  const r = await fetch(`${API}/purchases/${id}/pay`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ isPaid })
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao atualizar pagamento');
  return data;
}

async function patchPurchaseDueDate(id, isoDateOrNull, token){
  const r = await fetch(`${API}/purchases/${id}/due-date`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ paymentDueDate: isoDateOrNull })
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao atualizar vencimento');
  return data;
}