import { apiBaseUrl, qs } from '../vendor/helpers.js';

const CHANNELS = ['COUNTER','DELIVERY_APP','OWN_APP','WHOLESALE','OTHER'];

function token() {
  try { return (JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')))?.token || ''; }
  catch { return ''; }
}

function formatMoneyFromReais(value) {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function parseMoneyInput(str) {
  if (!str) return 0;
  // Remove tudo exceto dígitos e vírgula/ponto
  let cleaned = String(str).replace(/[^\d,.]/g, '');
  
  // Se tem vírgula, assume formato brasileiro (1.234,56 ou 80.000,00)
  if (cleaned.includes(',')) {
    // Remove pontos (separadores de milhar) e troca vírgula por ponto decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Se tem apenas ponto e mais de um, remove os separadores de milhar
  else if ((cleaned.match(/\./g) || []).length > 1) {
    cleaned = cleaned.replace(/\./g, '');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function notifySuccess(title, text = '') {
  const btnPrimaryGreen = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(22,163,74,.20);';
  
  return Swal.fire({
    customClass: {
      popup: 'vita',
      confirmButton: '',
    },
    icon: 'success',
    title,
    html: text ? `<div style="color:var(--muted)">${String(text).replace(/\n/g,'<br>')}</div>` : '',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      if (confirmEl) confirmEl.setAttribute('style', btnPrimaryGreen);
    },
  });
}

function notifyError(title, text = '') {
  const btnPrimaryRed = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#ef4444,#dc2626);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 8px 16px rgba(239,68,68,.20);';
  
  return Swal.fire({
    customClass: {
      popup: 'vita',
      confirmButton: '',
    },
    icon: 'error',
    title,
    html: text ? `<div style="color:var(--muted)">${String(text).replace(/\n/g,'<br>')}</div>` : '',
    confirmButtonText: 'OK',
    buttonsStyling: false,
    didRender: () => {
      const confirmEl = Swal.getConfirmButton();
      if (confirmEl) confirmEl.setAttribute('style', btnPrimaryRed);
    },
  });
}

function fillMonthYear(){
  const msel = qs('#month'), ysel = qs('#year');
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth()+1;
  
  const selectStyle = 'padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:#fff; font-size:14px; cursor:pointer;';
  
  msel.innerHTML = Array.from({length:12}, (_,i)=>`<option value="${i+1}" ${i+1===curM?'selected':''}>${String(i+1).padStart(2,'0')}</option>`).join('');
  msel.setAttribute('style', selectStyle);
  
  const years = Array.from({length:5}, (_,k)=>curY-2+k);
  ysel.innerHTML = years.map(y=>`<option value="${y}" ${y===curY?'selected':''}>${y}</option>`).join('');
  ysel.setAttribute('style', selectStyle);
}

function renderRows(data){
  const map = new Map((data||[]).map(x=>[x.channel, Number(x.amount)]));
  qs('#tbody').innerHTML = CHANNELS.map(ch=>`
    <tr>
      <td>${ch}</td>
      <td class="num">
        <input 
          class="amount" 
          data-channel="${ch}" 
          type="text" 
          value="${map.get(ch) ? formatMoneyFromReais(map.get(ch)) : ''}" 
          placeholder="R$ 0,00"
          style="width:160px; text-align:right; padding:8px; border:1px solid var(--border); border-radius:8px;" 
        />
      </td>
    </tr>
  `).join('');
  
  document.querySelectorAll('.amount').forEach(input => {
    input.addEventListener('blur', (e) => {
      const val = parseMoneyInput(e.target.value);
      e.target.value = val ? formatMoneyFromReais(val) : '';
    });

    input.addEventListener('focus', (e) => {
      const val = parseMoneyInput(e.target.value);
      e.target.value = val || '';
    });
  });
}

async function load(){
  const y = Number(qs('#year').value);
  const m = Number(qs('#month').value);
  const url = new URL(`${apiBaseUrl}/finance/revenue-targets`);
  url.searchParams.set('year', String(y));
  url.searchParams.set('month', String(m));
  
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) { 
      renderRows([]); 
      return; 
    }
    const data = await r.json();
    renderRows(data);
  } catch (e) {
    console.error(e);
    notifyError('Erro ao carregar', 'Não foi possível carregar as metas de receita.');
    renderRows([]);
  }
}

async function save(){
  const y = Number(qs('#year').value);
  const m = Number(qs('#month').value);
  const rows = [...document.querySelectorAll('input.amount')].map(inp=>({
    channel: inp.dataset.channel,
    amount: parseMoneyInput(inp.value),
  }));
  
  try {
    const r = await fetch(`${apiBaseUrl}/finance/revenue-targets/upsert`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` },
      body: JSON.stringify({ year: y, month: m, items: rows }),
    });
    
    if (!r.ok) {
      const errData = await r.json();
      console.error('Erro do backend:', errData);
      notifyError('Falha ao salvar', 'Não foi possível salvar as metas. Verifique os dados e tente novamente.');
      return;
    }
    
    await notifySuccess('Metas salvas!', 'As metas de receita foram atualizadas com sucesso.');
  } catch (e) {
    console.error(e);
    notifyError('Erro ao salvar', 'Não foi possível salvar as metas. Tente novamente.');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  fillMonthYear();
  qs('#applyBtn').addEventListener('click', (e)=>{ e.preventDefault(); load(); });
  qs('#saveBtn').addEventListener('click', (e)=>{ e.preventDefault(); save(); });
  load();
});