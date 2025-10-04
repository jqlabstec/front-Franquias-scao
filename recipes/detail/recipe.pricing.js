const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function qs(name){ const u=new URL(location.href); return u.searchParams.get(name); }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}); }
function pctTo0to1(v){ if(v===''||v==null||isNaN(v)) return null; return Number(v)/100; }
function asMoney(v){ if(v===''||v==null||isNaN(v)) return null; return Number(v); }

async function apiGet(url, token){
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha na requisição');
  return data;
}
async function apiPost(url, body, token){
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha na operação');
  return data;
}
async function apiDelete(url, token){
  const r = await fetch(url, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha na operação');
  return data;
}

const els = {
  btnBack: document.getElementById('btnBack'),

  sumRecipeId: document.getElementById('sumRecipeId'),
  sumCostPerPortion: document.getElementById('sumCostPerPortion'),
  sumSuggested: document.getElementById('sumSuggested'),

  mode: document.getElementById('mode'),
  targetMarginPct: document.getElementById('targetMarginPct'),
  targetMarkup: document.getElementById('targetMarkup'),
  paymentFeePct: document.getElementById('paymentFeePct'),
  channelFeePct: document.getElementById('channelFeePct'),
  packagingCost: document.getElementById('packagingCost'),
  fixedOverheadPerPortion: document.getElementById('fixedOverheadPerPortion'),

  fieldMargin: document.getElementById('field-margin'),
  fieldMarkup: document.getElementById('field-markup'),

  btnCalcDefault: document.getElementById('btnCalcDefault'),
  btnSaveDefault: document.getElementById('btnSaveDefault'),
  resDefault: document.getElementById('resDefault'),

  channel: document.getElementById('channel'),
  c_mode: document.getElementById('c_mode'),
  c_targetMarginPct: document.getElementById('c_targetMarginPct'),
  c_targetMarkup: document.getElementById('c_targetMarkup'),
  c_paymentFeePct: document.getElementById('c_paymentFeePct'),
  c_channelFeePct: document.getElementById('c_channelFeePct'),
  c_packagingCost: document.getElementById('c_packagingCost'),
  c_fixedOverheadPerPortion: document.getElementById('c_fixedOverheadPerPortion'),

  btnCalcChannel: document.getElementById('btnCalcChannel'),
  btnSaveChannel: document.getElementById('btnSaveChannel'),
  btnDeactivateChannel: document.getElementById('btnDeactivateChannel'),
  resChannel: document.getElementById('resChannel'),
  tbodyChannels: document.getElementById('tbodyChannels'),
};

function toggleModeFields(){
  const isMargin = els.mode.value === 'MARGIN';
  els.fieldMargin.style.display = isMargin ? '' : 'none';
  els.fieldMarkup.style.display = isMargin ? 'none' : '';
}
els.mode.addEventListener('change', toggleModeFields);

function readDefault(){
  return {
    mode: els.mode.value,
    targetMarginPct: pctTo0to1(els.targetMarginPct.value),
    targetMarkup: asMoney(els.targetMarkup.value),
    packagingCost: asMoney(els.packagingCost.value),
    paymentFeePct: pctTo0to1(els.paymentFeePct.value),
    channelFeePct: pctTo0to1(els.channelFeePct.value),
    fixedOverheadPerPortion: asMoney(els.fixedOverheadPerPortion.value),
  };
}
function readOverrides(){
  const modeVal = els.c_mode.value;
  return {
    mode: modeVal || null,
    targetMarginPct: pctTo0to1(els.c_targetMarginPct.value),
    targetMarkup: asMoney(els.c_targetMarkup.value),
    packagingCost: asMoney(els.c_packagingCost.value),
    paymentFeePct: pctTo0to1(els.c_paymentFeePct.value),
    channelFeePct: pctTo0to1(els.c_channelFeePct.value),
    fixedOverheadPerPortion: asMoney(els.c_fixedOverheadPerPortion.value),
  };
}
function showCalcResult(targetEl, calc){
  if(!calc || calc.price == null){
    targetEl.textContent = 'Sem cálculo';
    return;
  }
  const r = calc;
  targetEl.innerHTML = `
    <div><strong>Sugestão de preço:</strong> R$ ${fmtMoney(r.price)}</div>
    <div class="muted">
      CMV: R$ ${fmtMoney(r.breakdown.costPerPortion)} ·
      Emb+Fixos: R$ ${fmtMoney((r.breakdown.packagingCost||0)+(r.breakdown.fixedOverheadPerPortion||0))} ·
      Taxas: R$ ${fmtMoney(r.breakdown.channelFees)} (${r.breakdown.feePct}%) ·
      Lucro: R$ ${fmtMoney(r.breakdown.grossProfit)} (${r.breakdown.marginPct}%)
    </div>
  `;
}
function renderChannels(channels){
  els.tbodyChannels.innerHTML = '';
  if(!channels || !channels.length){
    els.tbodyChannels.innerHTML = `<tr><td colspan="6" class="muted">Nenhum canal ativo</td></tr>`;
    return;
  }
  for(const ch of channels){
    const feePct = ((Number(ch.paymentFeePct||0)+Number(ch.channelFeePct||0))*100).toFixed(2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ch.channel}</td>
      <td>${ch.mode || 'HERDAR'}</td>
      <td>${feePct}%</td>
      <td>R$ ${fmtMoney(ch.packagingCost||0)}</td>
      <td>R$ ${fmtMoney(ch.fixedOverheadPerPortion||0)}</td>
      <td>${ch.suggestedPrice != null ? 'R$ '+fmtMoney(ch.suggestedPrice) : '-'}</td>
    `;
    els.tbodyChannels.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }
  const id = qs('id'); if(!id){ location.href='../index/index.html'; return; }

  // Ajusta "Voltar" mantendo id
  if (els.btnBack) els.btnBack.href = `../detail/index.html?id=${encodeURIComponent(id)}`;

  try{
    const data = await apiGet(`${API}/recipes/${id}/pricing`, auth.token);

    els.sumRecipeId.textContent = data.recipeId;
    els.sumCostPerPortion.textContent = `R$ ${fmtMoney(data.costPerPortion||0)}`;
    els.sumSuggested.textContent = data?.default?.suggestedPrice != null ? `R$ ${fmtMoney(data.default.suggestedPrice)}` : '—';

    if (data.default){
      els.mode.value = data.default.mode || 'MARGIN';
      if (data.default.targetMarginPct != null) els.targetMarginPct.value = Number(data.default.targetMarginPct) * 100;
      if (data.default.targetMarkup != null) els.targetMarkup.value = Number(data.default.targetMarkup);
      if (data.default.paymentFeePct != null) els.paymentFeePct.value = Number(data.default.paymentFeePct) * 100;
      if (data.default.channelFeePct != null) els.channelFeePct.value = Number(data.default.channelFeePct) * 100;
      if (data.default.packagingCost != null) els.packagingCost.value = Number(data.default.packagingCost);
      if (data.default.fixedOverheadPerPortion != null) els.fixedOverheadPerPortion.value = Number(data.default.fixedOverheadPerPortion);
    }
    renderChannels(data.channels || []);
    toggleModeFields();
  }catch(err){
    await Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao carregar', confirmButtonText:'Ok' });
    location.href = '../index/index.html';
    return;
  }

  els.btnCalcDefault.addEventListener('click', async ()=>{
    const auth = getAuth(); if(!auth?.token) return;
    try{
      const body = { params: readDefault() };
      const calc = await apiPost(`${API}/recipes/${qs('id')}/pricing/calc`, body, auth.token);
      showCalcResult(els.resDefault, calc);
    }catch(err){
      Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao calcular' });
    }
  });

  els.btnSaveDefault.addEventListener('click', async ()=>{
    const ok = await Swal.fire({ icon:'question', title:'Salvar parâmetros padrão?', showCancelButton:true, confirmButtonText:'Salvar', cancelButtonText:'Cancelar' }).then(r=>r.isConfirmed);
    if(!ok) return;
    const auth = getAuth(); if(!auth?.token) return;

    try{
      const body = { params: readDefault() };
      const resp = await apiPost(`${API}/recipes/${qs('id')}/pricing`, body, auth.token);
      showCalcResult(els.resDefault, resp.calc);
      if(resp?.saved?.suggestedPrice != null){
        els.sumSuggested.textContent = `R$ ${fmtMoney(resp.saved.suggestedPrice)}`;
      }
      Swal.fire({ icon:'success', title:'Salvo', text:'Padrão atualizado com sucesso.' });
    }catch(err){
      Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao salvar' });
    }
  });

  els.btnCalcChannel.addEventListener('click', async ()=>{
    const auth = getAuth(); if(!auth?.token) return;
    // Combina defaults visíveis na tela com overrides para simular
    const base = readDefault();
    const ov = readOverrides();
    const merged = Object.assign({}, base, Object.fromEntries(Object.entries(ov).filter(([k,v]) => v!=='' && v!=null)));
    try{
      const calc = await apiPost(`${API}/recipes/${qs('id')}/pricing/calc`, { params: merged }, auth.token);
      showCalcResult(els.resChannel, calc);
    }catch(err){
      Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao calcular canal' });
    }
  });

  els.btnSaveChannel.addEventListener('click', async ()=>{
    const auth = getAuth(); if(!auth?.token) return;
    try{
      const body = {
        channel: els.channel.value,
        params: Object.fromEntries(Object.entries(readOverrides()).filter(([k,v]) => v!=='' && v!=null)),
      };
      const resp = await apiPost(`${API}/recipes/${qs('id')}/pricing/channels`, body, auth.token);
      showCalcResult(els.resChannel, resp.calc);

      const data = await apiGet(`${API}/recipes/${qs('id')}/pricing`, auth.token);
      renderChannels(data.channels || []);
      Swal.fire({ icon:'success', title:'Canal salvo', text:'Overrides atualizados.' });
    }catch(err){
      Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao salvar canal' });
    }
  });

  els.btnDeactivateChannel.addEventListener('click', async ()=>{
    const auth = getAuth(); if(!auth?.token) return;
    const channel = els.channel.value;
    const ok = await Swal.fire({ icon:'warning', title:'Desativar canal?', text:`Canal ${channel} ficará inativo.`, showCancelButton:true, confirmButtonText:'Desativar' }).then(r=>r.isConfirmed);
    if(!ok) return;

    try{
      await apiDelete(`${API}/recipes/${qs('id')}/pricing/channels/${encodeURIComponent(channel)}`, auth.token);
      const data = await apiGet(`${API}/recipes/${qs('id')}/pricing`, auth.token);
      renderChannels(data.channels || []);
      Swal.fire({ icon:'success', title:'Canal desativado' });
    }catch(err){
      Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao desativar' });
    }
  });
});