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
      throw new Error(`Produtos não mapeados: ${data.missing.map(m=>m.code).join(', ')}`);
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
    // p.purchaseDate pode vir ISO string; manter formato datetime-local (YYYY-MM-DDTHH:mm)
    if (p.purchaseDate) {
      const d = new Date(p.purchaseDate);
      const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); // normaliza para local
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
/* ====== FIM PRÉ-PARSE ====== */

document.addEventListener('DOMContentLoaded', ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  const invoiceNumber = document.getElementById('invoiceNumber');
  const purchaseDate = document.getElementById('purchaseDate');
  const supplierName = document.getElementById('supplierName');
  const paymentDueDate = document.getElementById('paymentDueDate');
  const isPaid = document.getElementById('isPaid');

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

  // Salvar compra
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
      items: state.items.map(it => ({
        code: it.code,
        name: it.name,
        quantity: it.quantity,
        unitCostAtPurchase: it.unitCostAtPurchase
      })),
      xmlContent: state.xmlContent || undefined, // se veio do parse
    };

    try{
      await postPurchase(body, auth.token);
      toastSuccess('Compra registrada!');
      // reset
      invoiceNumber.value=''; purchaseDate.value=''; supplierName.value=''; paymentDueDate.value=''; isPaid.value='false';
      state.items=[]; state.xmlContent = undefined; renderItems();
    }catch(e){
      Swal.fire({
        icon:'error', title:'Falha ao salvar', html:`<div style="color:var(--muted)">${e.message}</div>`,
        buttonsStyling:false, didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style',btnGhostStyle); }
      });
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
      // Agora você pode ajustar vencimento e se está pago antes de salvar.
    }catch(e){
      Swal.fire({
        icon:'error',
        title:'Falha ao processar XML',
        html:`<div style="color:var(--muted)">${e.message || 'Erro'}</div>`,
        buttonsStyling:false,
        didRender:()=>{ Swal.getConfirmButton()?.setAttribute('style',btnGhostStyle); }
      });
    } finally {
      xmlInput.value = ''; // limpa seleção
    }
  });

  renderItems();
});