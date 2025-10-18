const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

/* SweetAlert helpers inline-styled (opção 1) */
const btnPrimaryStyle = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;';
const btnGhostStyle   = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';
function toastSuccess(title='Operação concluída'){ return Swal.fire({toast:true,position:'top-end',icon:'success',title,showConfirmButton:false,timer:1800,timerProgressBar:true}); }
function toastError(title='Falha na operação'){ return Swal.fire({toast:true,position:'top-end',icon:'error',title,showConfirmButton:false,timer:2200,timerProgressBar:true}); }
function confirmSwal(title, html, confirmText='Confirmar'){
  return Swal.fire({
    icon:'question', title, html, showCancelButton:true,
    confirmButtonText:confirmText, cancelButtonText:'Cancelar',
    buttonsStyling:false,
    didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style',btnPrimaryStyle); Swal.getCancelButton()?.setAttribute('style',btnGhostStyle); Swal.getActions().style.gap='8px'; }
  });
}

function getAuth(){
  try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;}
}
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:6}); }

const state = { items: [], xmlContent: undefined };

function renderItems(){
  const tb = document.getElementById('tbodyItems');
  tb.innerHTML = '';
  if (state.items.length === 0) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 7; td.className='muted'; td.textContent='Nenhum item';
    tr.appendChild(td); tb.appendChild(tr);
  } else {
    state.items.forEach((it, idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${it.code || '—'}</td>
        <td>${it.name || '—'}</td>
        <td>${it.quantity}</td>
        <td>${fmtMoney(it.unitCostAtPurchase)}</td>
        <td>${fmtMoney(it.quantity * it.unitCostAtPurchase)}</td>
        <td><button class="btn-ghost" data-del="${idx}">Remover</button></td>
      `;
      tb.appendChild(tr);
    });
  }
  const total = state.items.reduce((a,b)=> a + (b.quantity*b.unitCostAtPurchase), 0);
  document.getElementById('totalSpan').textContent = fmtMoney(total);
}

async function postPurchase(body, token){
  const r = await fetch(`${API}/purchases`, {
    method:'POST',
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) {
    if (r.status === 422 && data?.missing) {
      // ✅ Retornar dados para tratamento no front
      const err = new Error('Produtos não mapeados');
      err.status = 422;
      err.missing = data.missing;
      throw err;
    }
    throw new Error(data?.message || 'Erro ao salvar compra');
  }
  return data;
}

/* ====== Pré-parse do XML (NÃO cria compra) ====== */
async function parseXml(file, token){
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API}/purchases/parse-xml`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) {
    throw new Error(data?.message || 'Falha ao processar XML');
  }
  return data; // { invoiceNumber, supplierName, purchaseDate, items[], xmlContent }
}

function fillHeaderFromParsed(p){
  try{
    document.getElementById('invoiceNumber').value = p.invoiceNumber || '';
    document.getElementById('supplierName').value = p.supplierName || '';
    if (p.purchaseDate) {
      const d = new Date(p.purchaseDate);
      const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
      document.getElementById('purchaseDate').value = z.toISOString().slice(0,16);
    } else {
      document.getElementById('purchaseDate').value = '';
    }
  } catch {}
}

function loadItemsFromParsed(p){
  state.items = (p.items || []).map(it => ({
    code: it.code,
    name: it.name,
    quantity: Number(it.quantity),
    unitCostAtPurchase: Number(it.unitCostAtPurchase),
  }));
  state.xmlContent = p.xmlContent || undefined;
  renderItems();
}

// ✅ NOVO: Modal para resolver produtos não mapeados
async function showUnmappedProductsModal(missing, auth) {
  const htmlContent = `
    <div style="max-height:500px;overflow-y:auto;text-align:left;">
      <p style="color:var(--muted);margin-bottom:16px;">
        Os seguintes produtos não foram encontrados no sistema. Selecione um produto existente ou crie um novo:
      </p>
      ${missing.map((item, idx) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;background:#f9fafb;">
          <div style="font-weight:600;margin-bottom:8px;">
            ${item.name || item.code || 'Produto sem nome'}
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">
            Código: <b>${item.code || '—'}</b> | NCM: <b>${item.ncm || '—'}</b>
          </div>
          
          ${item.suggestions && item.suggestions.length > 0 ? `
            <div style="margin-bottom:8px;">
              <label style="font-size:13px;font-weight:600;">Sugestões:</label>
              <select id="suggestion-${idx}" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;">
                <option value="">-- Selecione um produto --</option>
                ${item.suggestions.map(s => `
                  <option value="${s.id}">
                    ${s.name} (${s.code}) - ${Math.round(s.similarity * 100)}% similar
                  </option>
                `).join('')}
              </select>
            </div>
          ` : `
            <div style="color:#f59e0b;font-size:13px;margin-bottom:8px;">
              ⚠️ Nenhuma sugestão encontrada
            </div>
          `}
          
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button 
              class="btn-create-product" 
              data-idx="${idx}"
              style="flex:1;padding:6px 12px;border:1px solid #22c55e;border-radius:6px;background:#fff;color:#22c55e;font-weight:600;cursor:pointer;">
              Criar novo produto
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const result = await Swal.fire({
    title: 'Produtos não mapeados',
    html: htmlContent,
    width: '700px',
    showCancelButton: true,
    confirmButtonText: 'Resolver e salvar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    didRender: () => {
      Swal.getConfirmButton()?.setAttribute('style', btnPrimaryStyle);
      Swal.getCancelButton()?.setAttribute('style', btnGhostStyle);
      Swal.getActions().style.gap = '8px';

      // ✅ Adicionar evento para criar produto
      document.querySelectorAll('.btn-create-product').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = Number(e.target.getAttribute('data-idx'));
          const item = missing[idx];
          await createProductModal(item, auth);
        });
      });
    },
    preConfirm: () => {
      const resolved = [];
      for (let i = 0; i < missing.length; i++) {
        const select = document.getElementById(`suggestion-${i}`);
        const productId = select?.value;
        if (!productId) {
          Swal.showValidationMessage(`Selecione um produto para "${missing[i].name || missing[i].code}"`);
          return false;
        }
        resolved.push({
          ...missing[i],
          productId: Number(productId),
        });
      }
      return resolved;
    }
  });

  return result;
}

// ✅ NOVO: Modal para criar produto
// ✅ NOVO: Modal para criar produto (layout melhorado)
async function createProductModal(item, auth) {
  const { value: formValues } = await Swal.fire({
    title: 'Criar novo produto',
    width: '550px',
    html: `
      <div style="text-align:left;padding:0 8px;">
        <div style="margin-bottom:16px;">
          <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
            Nome do produto <span style="color:#ef4444;">*</span>
          </label>
          <input 
            id="new-product-name" 
            type="text"
            value="${item.name || ''}" 
            placeholder="Ex.: Laranja Pera"
            style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
              Código (SKU) <span style="color:#ef4444;">*</span>
            </label>
            <input 
              id="new-product-code" 
              type="text"
              value="${item.code || ''}" 
              placeholder="Ex.: LAR-001"
              style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          
          <div>
            <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
              NCM
            </label>
            <input 
              id="new-product-ncm" 
              type="text"
              value="${item.ncm || ''}" 
              placeholder="Ex.: 08051000"
              maxlength="8"
              style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
              Unidade de medida <span style="color:#ef4444;">*</span>
            </label>
            <select 
              id="new-product-unit" 
              style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fff;">
              <option value="kg">kg (quilograma)</option>
              <option value="g">g (grama)</option>
              <option value="L">L (litro)</option>
              <option value="ml">ml (mililitro)</option>
              <option value="un">un (unidade)</option>
            </select>
          </div>
          
          <div>
            <label style="display:block;font-weight:600;font-size:14px;margin-bottom:6px;color:#374151;">
              Custo unitário <span style="color:#ef4444;">*</span>
            </label>
            <input 
              id="new-product-cost" 
              type="number" 
              step="0.01" 
              min="0"
              value="${item.unitCostAtPurchase || 0}" 
              placeholder="Ex.: 4.20"
              style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
        </div>
        
        <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-top:16px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">
            <strong>Dados da nota fiscal:</strong>
          </div>
          <div style="font-size:13px;color:#374151;">
            Quantidade: <strong>${item.quantity || 0}</strong> | 
            Valor unit.: <strong>R$ ${fmtMoney(item.unitCostAtPurchase || 0)}</strong>
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Criar produto',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    customClass: {
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel',
      actions: 'swal-actions'
    },
    didRender: () => {
      // Aplicar estilos aos botões
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
        .swal-actions {
          gap: 12px;
          margin-top: 20px;
        }
      `;
      document.head.appendChild(style);
    },
    preConfirm: () => {
      const name = document.getElementById('new-product-name').value.trim();
      const code = document.getElementById('new-product-code').value.trim();
      const ncm = document.getElementById('new-product-ncm').value.trim();
      const unit = document.getElementById('new-product-unit').value;
      const cost = document.getElementById('new-product-cost').value;

      if (!name) {
        Swal.showValidationMessage('Nome do produto é obrigatório');
        return false;
      }
      
      if (!code) {
        Swal.showValidationMessage('Código (SKU) é obrigatório');
        return false;
      }
      
      if (!cost || Number(cost) <= 0) {
        Swal.showValidationMessage('Custo unitário deve ser maior que zero');
        return false;
      }

      return { 
        name, 
        code, 
        ncm: ncm || null, 
        unitOfMeasure: unit, 
        currentCostPerUnit: Number(cost) 
      };
    }
  });

  if (formValues) {
    try {
      const r = await fetch(`${API}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(formValues)
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.message || 'Erro ao criar produto');
      }

      const newProduct = await r.json();
      toastSuccess('Produto criado com sucesso!');
      
      // ✅ Atualizar item com o novo productId
      item.productId = newProduct.id;
      
      return newProduct;
    } catch (e) {
      toastError(e.message);
      return null;
    }
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  const invoiceNumber = document.getElementById('invoiceNumber');
  const purchaseDate = document.getElementById('purchaseDate');
  const supplierName = document.getElementById('supplierName');
  const paymentDueDate = document.getElementById('paymentDueDate');
  const isPaid = document.getElementById('isPaid');
  const purchaseType = document.getElementById('purchaseType');
  const paymentMethod = document.getElementById('paymentMethod');

  const itCode = document.getElementById('itCode');
  const itName = document.getElementById('itName');
  const itQty = document.getElementById('itQty');
  const itUnitCost = document.getElementById('itUnitCost');

  // Adicionar item manual
  document.getElementById('btnAddItem').addEventListener('click', ()=>{
    const qty = Number(itQty.value);
    const unit = Number(itUnitCost.value);
    if (!qty || qty <= 0) { toastError('Informe quantidade'); return; }
    if (Number.isNaN(unit) || unit < 0) { toastError('Custo inválido'); return; }
    state.items.push({
      code: itCode.value.trim() || undefined,
      name: itName.value.trim() || undefined,
      quantity: qty,
      unitCostAtPurchase: unit,
    });
    itCode.value=''; itName.value=''; itQty.value=''; itUnitCost.value='';
    renderItems();
  });

  // Remover item
  document.getElementById('tbodyItems').addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button[data-del]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-del'));
    state.items.splice(idx,1);
    renderItems();
  });

  // Limpar itens
  document.getElementById('btnClearItems').addEventListener('click', ()=>{
    state.items = []; renderItems();
  });

  // ✅ ATUALIZADO: Salvar compra com tratamento de erro 422
  document.getElementById('btnSave').addEventListener('click', async ()=>{
    if (!supplierName.value.trim()) { toastError('Informe o fornecedor'); return; }
    if (state.items.length === 0) { toastError('Adicione ao menos um item'); return; }

    const html = `
      <div style="color:var(--muted)">
        Fornecedor: <b>${supplierName.value}</b><br>
        Itens: <b>${state.items.length}</b>
      </div>`;
    const c = await confirmSwal('Confirmar registro da compra?', html, 'Salvar compra');
    if (!c.isConfirmed) return;

    const body = {
      invoiceNumber: invoiceNumber.value.trim() || null,
      purchaseDate: purchaseDate.value ? new Date(purchaseDate.value).toISOString() : undefined,
      supplierName: supplierName.value.trim(),
      paymentDueDate: paymentDueDate.value ? new Date(paymentDueDate.value).toISOString() : null,
      isPaid: isPaid.value === 'true',
      purchaseType: purchaseType.value || 'INGREDIENT',
      paymentMethod: paymentMethod.value || 'BILLED',
      items: state.items.map(it => ({
        code: it.code,
        name: it.name,
        quantity: it.quantity,
        unitCostAtPurchase: it.unitCostAtPurchase,
        productId: it.productId, // ✅ Incluir productId se já resolvido
      })),
      xmlContent: state.xmlContent || undefined,
    };

    try{
      await postPurchase(body, auth.token);
      toastSuccess('Compra registrada!');
      // reset
      invoiceNumber.value=''; purchaseDate.value=''; supplierName.value=''; paymentDueDate.value=''; isPaid.value='false';
      purchaseType.value = 'INGREDIENT';
      paymentMethod.value = 'BILLED';
      state.items=[]; state.xmlContent = undefined; renderItems();
    }catch(e){
      // ✅ Tratar erro 422 (produtos não mapeados)
      if (e.status === 422 && e.missing) {
        const result = await showUnmappedProductsModal(e.missing, auth);
        
        if (result.isConfirmed && result.value) {
          // ✅ Atualizar items com productId resolvido
          result.value.forEach(resolved => {
            const item = state.items.find(it => it.code === resolved.code);
            if (item) {
              item.productId = resolved.productId;
            }
          });
          
          // ✅ Tentar salvar novamente
          document.getElementById('btnSave').click();
        }
      } else {
        Swal.fire({
          icon:'error', title:'Falha ao salvar', html:`<div style="color:var(--muted)">${e.message}</div>`,
          buttonsStyling:false, didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style',btnGhostStyle); }
        });
      }
    }
  });

  // ====== Importar XML (pré-parse) ======
  const btnImport = document.getElementById('btnImportXml');
  const xmlInput = document.getElementById('xmlFile');

  btnImport?.addEventListener('click', ()=> xmlInput?.click());

  xmlInput?.addEventListener('change', async ()=>{
    const file = xmlInput.files?.[0];
    if (!file) return;

    const c = await Swal.fire({
      icon:'question',
      title:'Importar XML?',
      text:`Arquivo: ${file.name}`,
      showCancelButton:true,
      confirmButtonText:'Processar',
      cancelButtonText:'Cancelar',
      buttonsStyling:false,
      didRender:()=>{ 
        Swal.getConfirmButton()?.setAttribute('style',btnPrimaryStyle); 
        Swal.getCancelButton()?.setAttribute('style',btnGhostStyle);
        Swal.getActions().style.gap='8px';
      }
    });
    if (!c.isConfirmed) { xmlInput.value=''; return; }

    try{
      const parsed = await parseXml(file, auth.token);
      toastSuccess('XML processado — revise e salve a compra.');
      fillHeaderFromParsed(parsed);
      loadItemsFromParsed(parsed);
    }catch(e){
      Swal.fire({
        icon:'error',
        title:'Falha ao processar XML',
        html:`<div style="color:var(--muted)">${e.message || 'Erro'}</div>`,
        buttonsStyling:false,
        didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style',btnGhostStyle); }
      });
    } finally {
      xmlInput.value = '';
    }
  });

  renderItems();
});