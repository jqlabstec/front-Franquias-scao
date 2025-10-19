const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

const btnPrimaryStyle = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;';
const btnGhostStyle   = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';
const btnDangerStyle  = 'padding:10px 12px;border:1px solid #ef4444;border-radius:10px;background:#fff;color:#ef4444;font-weight:600;cursor:pointer;';

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
async function searchProducts(query, token){
  const r = await fetch(`${API}/products?query=${encodeURIComponent(query)}&pageSize=20`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao buscar produtos');
  
  // ✅ LOG para debug
  console.log('🔍 Busca de produtos:', { query, total: data.total, items: data.items?.length });
  
  return data.items || [];
}

async function patchPurchaseItemProduct(itemId, productId, token){
  const r = await fetch(`${API}/purchase-items/${itemId}/product`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ productId })
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao atualizar produto');
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
      <td>
        <button class="btn-ghost btn-sm" data-edit-item="${it.id}" title="Corrigir produto">
          ✏️
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
  document.getElementById('tfootTotal').textContent = fmtMoney(total);
  document.getElementById('subtotal').textContent = fmtMoney(total);
  document.getElementById('total').textContent = fmtMoney(state.purchase?.totalValue ?? total);

  // ✅ Adicionar evento de edição
  document.querySelectorAll('[data-edit-item]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemId = Number(e.target.closest('button').getAttribute('data-edit-item'));
      const item = items.find(it => it.id === itemId);
      if (item) await showEditProductModal(item);
    });
  });
}

// ✅ NOVO: Modal para corrigir produto
async function showEditProductModal(item) {
  const auth = getAuth();
  let selectedProductId = null;
  let searchTimeout = null;

  const { value: confirmed } = await Swal.fire({
    title: 'Corrigir mapeamento de produto',
    width: '600px',
    html: `
      <div style="text-align:left;padding:0 8px;">
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin-bottom:16px;">
          <div style="font-size:13px;color:#92400e;">
            <strong>⚠️ Atenção:</strong> Esta ação irá ajustar o estoque automaticamente.
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
            Produto atual:
          </label>
          <div style="background:#f3f4f6;border-radius:8px;padding:10px;font-size:14px;">
            <strong>${item.product?.name || '—'}</strong> (${item.product?.code || '—'})
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
            Buscar novo produto:
          </label>
          <input 
            id="product-search" 
            type="text" 
            placeholder="Digite o nome ou código do produto..."
            style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          <div id="search-results" style="margin-top:8px;max-height:300px;overflow-y:auto;"></div>
        </div>

        <div id="selected-product" style="display:none;background:#dcfce7;border:1px solid #22c55e;border-radius:8px;padding:12px;margin-top:12px;">
          <div style="font-size:13px;color:#166534;">
            <strong>✓ Produto selecionado:</strong>
            <div id="selected-product-info" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirmar correção',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel',
    },
    didRender: () => {
      const style = document.createElement('style');
      style.textContent = `
        .swal-btn-confirm {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(180deg, #22c55e, #16a34a);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
        }
        .swal-btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .swal-btn-cancel {
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .product-result-item {
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .product-result-item:hover {
          background: #f3f4f6;
          border-color: #22c55e;
        }
        .product-result-item.selected {
          background: #dcfce7;
          border-color: #22c55e;
        }
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }
      `;
      document.head.appendChild(style);

      const searchInput = document.getElementById('product-search');
      const resultsDiv = document.getElementById('search-results');
      const selectedDiv = document.getElementById('selected-product');
      const selectedInfo = document.getElementById('selected-product-info');
      const confirmBtn = Swal.getConfirmButton();
      
      confirmBtn.disabled = true;

      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          resultsDiv.innerHTML = '';
          return;
        }

        searchTimeout = setTimeout(async () => {
          try {
            resultsDiv.innerHTML = '<div style="padding:10px;color:#6b7280;">Buscando...</div>';
            const products = await searchProducts(query, auth.token);
            
            if (products.length === 0) {
              resultsDiv.innerHTML = '<div style="padding:10px;color:#6b7280;">Nenhum produto encontrado</div>';
              return;
            }

            resultsDiv.innerHTML = products.map(p => `
              <div class="product-result-item" data-product-id="${p.id}">
                <div style="font-weight:600;font-size:14px;">${p.name}</div>
                <div style="font-size:12px;color:#6b7280;">
                  Código: <strong>${p.code}</strong> | 
                  Unidade: <strong>${p.unitOfMeasure}</strong>
                  ${p.ncm ? ` | NCM: <strong>${p.ncm}</strong>` : ''}
                </div>
              </div>
            `).join('');

            // Adicionar evento de clique
            document.querySelectorAll('.product-result-item').forEach(el => {
              el.addEventListener('click', () => {
                document.querySelectorAll('.product-result-item').forEach(x => x.classList.remove('selected'));
                el.classList.add('selected');
                
                selectedProductId = Number(el.getAttribute('data-product-id'));
                const product = products.find(p => p.id === selectedProductId);
                
                selectedInfo.innerHTML = `<strong>${product.name}</strong> (${product.code})`;
                selectedDiv.style.display = 'block';
                confirmBtn.disabled = false;
              });
            });
          } catch (e) {
            resultsDiv.innerHTML = `<div style="padding:10px;color:#ef4444;">Erro: ${e.message}</div>`;
          }
        }, 300);
      });
    },
    preConfirm: () => {
      if (!selectedProductId) {
        Swal.showValidationMessage('Selecione um produto');
        return false;
      }
      return selectedProductId;
    }
  });

  if (confirmed) {
    try {
      await patchPurchaseItemProduct(item.id, confirmed, auth.token);
      toastSuccess('Produto corrigido com sucesso!');
      
      // Recarregar compra
      const id = new URLSearchParams(location.search).get('id');
      const purchase = await fetchPurchase(id, auth.token);
      state.purchase = purchase;
      renderItems(purchase);
    } catch (e) {
      toastError(e.message);
    }
  }
}

function bindActions(){
  const auth = getAuth(); if(!auth?.token) return;
  const id = new URLSearchParams(location.search).get('id');
  if(!id) return;

  document.getElementById('btnTogglePaid').addEventListener('click', async ()=>{
    try{
      const updated = await patchPurchasePaid(id, !state.purchase.isPaid, auth.token);
      state.purchase = updated;
      renderHeader(updated);
      toastSuccess('Status de pagamento atualizado');
    }catch(e){ toastError(e.message); }
  });

  document.getElementById('btnEditDue').addEventListener('click', async ()=>{
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
  });

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