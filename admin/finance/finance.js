import { apiBaseUrl, formatMoney, qs } from '../vendor/helpers.js';

function defaultPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0,10),
    to: to.toISOString().slice(0,10),
  };
}

function readAuthToken() {
  try{
    const auth = JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
    return auth?.token || '';
  }catch{ return ''; }
}

async function fetchFeesByChannel(fromIso, toIso) {
  const url = new URL(`${apiBaseUrl}/analytics/fees-by-channel`);
  url.searchParams.set('from', `${fromIso}T00:00:00.000Z`);
  url.searchParams.set('to', `${toIso}T23:59:59.999Z`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${readAuthToken()}` }
  });
  if (!res.ok) throw new Error('Falha ao carregar fees-by-channel');
  return res.json();
}

function renderTable(rows){
  const tbody = qs('#tbl-channels tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Sem dados no período.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.channel}</td>
      <td class="num">${formatMoney(r.revenue)}</td>
      <td class="num">${r.count}</td>
      <td class="num">${formatMoney(r.avgTicket)}</td>
      <td class="num">${formatMoney(r.fees)}</td>
    </tr>
  `).join('');
}

function renderKpis(rows){
  const revenue = rows.reduce((s,r)=> s + (r.revenue||0), 0);
  const fees = rows.reduce((s,r)=> s + (r.fees||0), 0);
  qs('#kpi-revenue').textContent = formatMoney(revenue);
  qs('#kpi-fees').textContent = formatMoney(fees);
  qs('#kpi-cmv').textContent = '—';       // será preenchido quando ligarmos /summary
  qs('#kpi-op-profit').textContent = '—'; // idem
}

async function load(){
  const from = qs('#from').value;
  const to = qs('#to').value;
  const data = await fetchFeesByChannel(from, to);
  renderTable(data);
  renderKpis(data);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // inicializa período
  const p = defaultPeriod();
  qs('#from').value = p.from;
  qs('#to').value = p.to;

  qs('#applyBtn').addEventListener('click', (e)=>{ e.preventDefault(); load(); });

  // primeira carga
  load().catch(err=>{
    console.error(err);
    renderTable([]);
  });
});