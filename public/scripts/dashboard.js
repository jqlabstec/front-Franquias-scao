import { apiBaseUrl, qs } from '../../admin/vendor/helpers.js';

function token() {
  try {
    return (JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')))?.token || '';
  } catch {
    return '';
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatNumber(value, decimals = 2) {
  return value.toFixed(decimals);
}

function fillMonthYear() {
  const msel = qs('#month'), ysel = qs('#year');
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;

  msel.innerHTML = Array.from({ length: 12 }, (_, i) => 
    `<option value="${i + 1}" ${i + 1 === curM ? 'selected' : ''}>${String(i + 1).padStart(2, '0')}</option>`
  ).join('');

  const years = Array.from({ length: 5 }, (_, k) => curY - 2 + k);
  ysel.innerHTML = years.map(y => 
    `<option value="${y}" ${y === curY ? 'selected' : ''}>${y}</option>`
  ).join('');
}

function getChannelLabel(channel) {
  const labels = {
    COUNTER: 'Balcão',
    DELIVERY_APP: 'Delivery App',
    OWN_APP: 'App Próprio',
    WHOLESALE: 'Atacado',
    OTHER: 'Outros'
  };
  return labels[channel] || channel;
}

function renderMetrics(data) {
  const container = qs('#channelMetrics');
  
  const html = data.targets.map(t => {
    const statusClass = t.achievementPct >= 100 ? '' : t.achievementPct >= 80 ? 'warning' : 'danger';
    
    return `
      <div class="kpi ${statusClass}">
        <div class="kpi-title">${getChannelLabel(t.channel)}</div>
        <div class="kpi-value">${formatMoney(t.actual)}</div>
        <div class="kpi-subtitle">Meta: ${formatMoney(t.target)} (${formatPercent(t.achievementPct)})</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html || '<div class="muted">Nenhuma meta cadastrada</div>';
}

function renderResultsTable(data) {
  const tbody = qs('#resultsTable');
  
  const counter = data.channels.find(c => c.channel === 'COUNTER') || { revenue: 0, salesFees: 0, cogs: 0, grossMargin: 0, grossMarginPct: 0 };
  const delivery = data.channels.find(c => c.channel === 'DELIVERY_APP') || { revenue: 0, salesFees: 0, cogs: 0, grossMargin: 0, grossMarginPct: 0 };
  
  const total = data.totals;
  
  const rows = [
    { label: 'Totais de venda', counter: formatMoney(counter.revenue), delivery: formatMoney(delivery.revenue), total: formatMoney(total.revenue), pct: '100%' },
    { label: 'Faturamento bruto (=)', counter: formatMoney(counter.revenue), delivery: formatMoney(delivery.revenue), total: formatMoney(total.revenue), pct: formatPercent(100) },
    { label: 'Despesas com vendas (-)', counter: formatMoney(counter.salesFees), delivery: formatMoney(delivery.salesFees), total: formatMoney(total.salesFees), pct: formatPercent((total.salesFees / total.revenue) * 100 || 0) },
    { label: 'CMV (total) (-)', counter: formatMoney(counter.cogs), delivery: formatMoney(delivery.cogs), total: formatMoney(total.cogs), pct: formatPercent((total.cogs / total.revenue) * 100 || 0) },
    { label: 'Gastos por venda (=)', counter: formatMoney(counter.salesFees + counter.cogs), delivery: formatMoney(delivery.salesFees + delivery.cogs), total: formatMoney(total.salesFees + total.cogs), pct: formatPercent(((total.salesFees + total.cogs) / total.revenue) * 100 || 0) },
    { label: 'Margem bruta (=)', counter: formatMoney(counter.grossMargin), delivery: formatMoney(delivery.grossMargin), total: formatMoney(total.grossProfit), pct: formatPercent(total.grossMarginPct), bold: true, highlight: true },
    { label: 'Gastos operacionais (-)', counter: '—', delivery: '—', total: formatMoney(total.operationalCosts), pct: formatPercent((total.operationalCosts / total.revenue) * 100 || 0) },
    { label: 'Lucro operacional (=)', counter: '—', delivery: '—', total: formatMoney(total.operationalProfit), pct: formatPercent(total.operationalProfitPct), bold: true, highlight: true }
  ];

  tbody.innerHTML = rows.map(row => `
    <tr ${row.highlight ? 'class="highlight-row"' : ''}>
      <td ${row.bold ? 'class="text-bold"' : ''}>${row.label}</td>
      <td class="num ${row.bold ? 'text-bold' : ''}">${row.counter}</td>
      <td class="num ${row.bold ? 'text-bold' : ''}">${row.delivery}</td>
      <td class="num ${row.bold ? 'text-bold' : ''}">${row.total}</td>
      <td class="num ${row.bold ? 'text-bold' : ''}">${row.pct}</td>
    </tr>
  `).join('');
}

function renderChannelsTable(data) {
  const tbody = qs('#channelsTable');
  
  const counter = data.channels.find(c => c.channel === 'COUNTER') || { ticketAvg: 0, cogsPct: 0, markup: 0 };
  const delivery = data.channels.find(c => c.channel === 'DELIVERY_APP') || { ticketAvg: 0, cogsPct: 0, markup: 0 };
  
  const rows = [
    { label: 'Acompanhamento mensal (%)', counter: '—', delivery: '—' },
    { label: 'Ticket médio (=)', counter: formatMoney(counter.ticketAvg), delivery: formatMoney(delivery.ticketAvg) },
    { label: 'CMV (%)', counter: formatPercent(counter.cogsPct), delivery: formatPercent(delivery.cogsPct) },
    { label: 'Markup (multiplicador) (=)', counter: formatNumber(counter.markup, 2), delivery: formatNumber(delivery.markup, 2) }
  ];

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.label}</td>
      <td class="num">${row.counter}</td>
      <td class="num">${row.delivery}</td>
    </tr>
  `).join('');
}

function renderIndicators(data) {
  const tbody = qs('#indicatorsTable');
  
  const rows = [
    { label: 'Ponto de equilíbrio (=)', value: formatMoney(data.totals.breakEvenPoint) }
  ];

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.label}</td>
      <td class="num text-bold">${row.value}</td>
    </tr>
  `).join('');
}

async function loadDashboard() {
  const year = Number(qs('#year').value);
  const month = Number(qs('#month').value);
  
  try {
    const url = new URL(`${apiBaseUrl}/dashboard`);
    url.searchParams.set('year', String(year));
    url.searchParams.set('month', String(month));

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` }
    });

    if (!r.ok) {
      throw new Error('Erro ao carregar dashboard');
    }

    const data = await r.json();
    
    renderMetrics(data);
    renderResultsTable(data);
    renderChannelsTable(data);
    renderIndicators(data);
    
  } catch (error) {
    console.error(error);
    qs('#resultsTable').innerHTML = '<tr><td colspan="5" class="muted">Erro ao carregar dados</td></tr>';
    qs('#channelsTable').innerHTML = '<tr><td colspan="3" class="muted">Erro ao carregar dados</td></tr>';
    qs('#indicatorsTable').innerHTML = '<tr><td colspan="2" class="muted">Erro ao carregar dados</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fillMonthYear();
  
  qs('#applyBtn').addEventListener('click', (e) => {
    e.preventDefault();
    loadDashboard();
  });

  loadDashboard();
});