const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

// ========== CARREGAR DRE (MODO ÚNICO) ==========
async function loadDre() {
  const auth = getAuth();
  if (!auth?.token) {
    alert('Você precisa estar logado!');
    window.location.href = '/login/index.html';
    return;
  }

  const yearEl = document.getElementById('yearSelect');
  const monthEl = document.getElementById('monthSelect');

  if (!yearEl || !monthEl) {
    console.error('Elementos de filtro não encontrados!');
    return;
  }

  const year = yearEl.value;
  const month = monthEl.value;

  if (!year || !month) {
    alert('Selecione ano e mês!');
    return;
  }

  const container = document.getElementById('dreContent');
  container.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const response = await fetch(`${API_BASE}/dre?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (!response.ok) throw new Error('Erro ao carregar DRE');

    const data = await response.json();
    renderDre(data, month, year);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="error">❌ Erro ao carregar DRE. Verifique o console.</div>';
  }
}

// ========== CARREGAR DRE (MODO MoM) ==========
async function loadDreMoM() {
  const auth = getAuth();
  if (!auth?.token) {
    alert('Você precisa estar logado!');
    window.location.href = '/login/index.html';
    return;
  }

  const startYear = document.getElementById('startYearSelect').value;
  const startMonth = document.getElementById('startMonthSelect').value;
  const endYear = document.getElementById('endYearSelect').value;
  const endMonth = document.getElementById('endMonthSelect').value;

  if (!startYear || !startMonth || !endYear || !endMonth) {
    alert('Selecione o período completo!');
    return;
  }

  const container = document.getElementById('dreContent');
  container.innerHTML = '<div class="loading">Carregando comparação...</div>';

  try {
    const response = await fetch(
      `${API_BASE}/dre/mom?startYear=${startYear}&startMonth=${startMonth}&endYear=${endYear}&endMonth=${endMonth}`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    );

    if (!response.ok) throw new Error('Erro ao carregar DRE MoM');

    const data = await response.json();
    renderDreMoM(data);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="error">❌ Erro ao carregar comparação. Verifique o console.</div>';
  }
}

// ========== RENDERIZAR DRE (MODO ÚNICO) ==========
function renderDre(dre, month, year) {
  const monthNames = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ];
  const monthLabel = `${monthNames[month - 1]}/${year.toString().slice(2)}`;

  const container = document.getElementById('dreContent');
  if (!container) {
    console.error('Container dreContent não encontrado!');
    return;
  }

  container.innerHTML = `
    <div class="dre-table">
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Descrição</th>
            <th style="text-align: right;">${monthLabel}</th>
          </tr>
        </thead>
        <tbody>
          <!-- ========== RECEITAS ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>RECEITAS</strong></td>
          </tr>
          <tr>
            <td>Receita Bruta (+)</td>
            <td class="value">${formatCurrency(dre.grossRevenue)}</td>
          </tr>
          <tr>
            <td>Descontos</td>
            <td class="value">${formatCurrency(dre.discounts)}</td>
          </tr>
          <tr>
            <td>% Descontos</td>
            <td class="value">${formatPercent(dre.discountPct)}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Receita Bruta (+) s/Descontos</strong></td>
            <td class="value"><strong>${formatCurrency(dre.grossRevenueNoDiscount)}</strong></td>
          </tr>
          <tr>
            <td>% Impostos</td>
            <td class="value">${formatPercent(dre.taxPct)}</td>
          </tr>
          <tr>
            <td>Impostos (-)</td>
            <td class="value negative">${formatCurrency(-dre.taxes)}</td>
          </tr>
          <tr>
            <td>Taxas Transações</td>
            <td class="value negative">${formatCurrency(-dre.transactionFees)}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Receita Líquida (+)</strong></td>
            <td class="value"><strong>${formatCurrency(dre.netRevenue)}</strong></td>
          </tr>

          <!-- ========== GASTOS VARIÁVEIS ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>GASTOS VARIÁVEIS</strong></td>
          </tr>
          <tr>
            <td>Gastos Variáveis (-)</td>
            <td class="value negative">${formatCurrency(-dre.totalVariableCosts)}</td>
          </tr>
          <tr>
            <td>% Gastos Variáveis (-)/ROL</td>
            <td class="value">${formatPercent(dre.variableCostsPct)}</td>
          </tr>

          <!-- CMV -->
          <tr class="subsection">
            <td colspan="2"><strong>CMV</strong></td>
          </tr>
          <tr>
            <td>CMV (-)</td>
            <td class="value negative">${formatCurrency(-dre.cogs)}</td>
          </tr>
          <tr>
            <td>% CMV/ROB</td>
            <td class="value">${formatPercent(dre.cogsPctROB)}</td>
          </tr>
          <tr>
            <td>% CMV/ROB s/Descontos</td>
            <td class="value">${formatPercent(dre.cogsPctROBNoDiscount)}</td>
          </tr>
          <tr>
            <td>% CMV/ROL</td>
            <td class="value">${formatPercent(dre.cogsPctROL)}</td>
          </tr>

          <!-- Taxas Cartão e iFood -->
          <tr class="subsection">
            <td colspan="2"><strong>Taxas Cartão e Ifood</strong></td>
          </tr>
          <tr>
            <td>Ifood</td>
            <td class="value">${formatCurrency(dre.ifoodFees)}</td>
          </tr>
          <tr>
            <td>Adquirência</td>
            <td class="value">${formatCurrency(dre.acquirerFees)}</td>
          </tr>

          <!-- Despesas Franquia -->
          <tr class="subsection">
            <td colspan="2"><strong>Despesas Franquia</strong></td>
          </tr>
          <tr>
            <td>Despesas Franquia (-)</td>
            <td class="value negative">${formatCurrency(-dre.franchiseFees)}</td>
          </tr>
          <tr>
            <td>% Despesas Franquia (-)/ROL</td>
            <td class="value">${formatPercent(dre.franchiseFeesPct)}</td>
          </tr>
          <tr>
            <td>Royalties</td>
            <td class="value">${formatCurrency(dre.royalties)}</td>
          </tr>
          <tr>
            <td>% Royalties/ROB</td>
            <td class="value">${formatPercent(dre.royaltiesPctROB)}</td>
          </tr>
          <tr>
            <td>% Royalties/ROL</td>
            <td class="value">${formatPercent(dre.royaltiesPctROL)}</td>
          </tr>
          <tr>
            <td>Fundo de Propaganda</td>
            <td class="value negative">${formatCurrency(-dre.marketingFund)}</td>
          </tr>
          <tr>
            <td>% Fundo de Propaganda/ROB</td>
            <td class="value">${formatPercent(dre.marketingFundPctROB)}</td>
          </tr>
          <tr>
            <td>% Fundo de Propaganda/ROL</td>
            <td class="value">${formatPercent(dre.marketingFundPctROL)}</td>
          </tr>

          <!-- Margem de Contribuição -->
          <tr class="highlight">
            <td><strong>Margem de Contribuição</strong></td>
            <td class="value"><strong>${formatCurrency(dre.contributionMargin)}</strong></td>
          </tr>
          <tr>
            <td>% Margem de Contribuição</td>
            <td class="value">${formatPercent(dre.contributionMarginPct)}</td>
          </tr>

          <!-- ========== GASTOS FIXOS ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>GASTOS FIXOS</strong></td>
          </tr>
          <tr>
            <td>Gastos Fixos (-)</td>
            <td class="value negative">${formatCurrency(-dre.totalFixedCosts)}</td>
          </tr>
          <tr>
            <td>% Gastos Fixos (-)/ROL</td>
            <td class="value">${formatPercent(dre.fixedCostsPct)}</td>
          </tr>

          <!-- Ocupação -->
          <tr class="subsection">
            <td colspan="2"><strong>Ocupação</strong></td>
          </tr>
          <tr>
            <td>Ocupação (-)</td>
            <td class="value negative">${formatCurrency(-dre.occupationCosts)}</td>
          </tr>
          <tr>
            <td>% Ocupação (-)/ROL</td>
            <td class="value">${formatPercent(dre.occupationPct)}</td>
          </tr>
          <tr>
            <td class="indent">Aluguel</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.rent)}</td>
          </tr>
          <tr>
            <td class="indent">Condomínio</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.condo)}</td>
          </tr>
          <tr>
            <td class="indent">Fundo Promoção Shopping</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.shoppingPromo)}</td>
          </tr>
          <tr>
            <td class="indent">IPTU</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.propertyTax)}</td>
          </tr>
          <tr>
            <td class="indent">Água</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.water)}</td>
          </tr>
          <tr>
            <td class="indent">Energia</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.electricity)}</td>
          </tr>
          <tr>
            <td class="indent">Ar condicionado</td>
            <td class="value negative">${formatCurrency(-dre.occupationDetails.ac)}</td>
          </tr>

          <!-- Consumos e Utilidades -->
          <tr class="subsection">
            <td colspan="2"><strong>Consumos e Utilidades</strong></td>
          </tr>
          <tr>
            <td>Consumos e utilidades (-)</td>
            <td class="value negative">${formatCurrency(-dre.utilitiesCosts)}</td>
          </tr>
          <tr>
            <td>% Consumos e utilidades (-)/ROL</td>
            <td class="value">${formatPercent(dre.utilitiesPct)}</td>
          </tr>
          <tr>
            <td class="indent">Internet</td>
            <td class="value negative">${formatCurrency(-dre.utilitiesDetails.internet)}</td>
          </tr>
          <tr>
            <td class="indent">Limpeza e Conservação</td>
            <td class="value negative">${formatCurrency(-dre.utilitiesDetails.cleaning)}</td>
          </tr>
          <tr>
            <td class="indent">Manutenção</td>
            <td class="value negative">${formatCurrency(-dre.utilitiesDetails.maintenance)}</td>
          </tr>
          <tr>
            <td class="indent">Materiais de escritório</td>
            <td class="value negative">${formatCurrency(-dre.utilitiesDetails.officeSupplies)}</td>
          </tr>
          <tr>
            <td class="indent">Equipamentos e utensílios</td>
            <td class="value">${formatCurrency(dre.utilitiesDetails.equipmentUtensils)}</td>
          </tr>
          <tr>
            <td class="indent">Aluguel Equipamentos</td>
            <td class="value">${formatCurrency(dre.utilitiesDetails.equipmentRental)}</td>
          </tr>

          <!-- Gastos Administrativos -->
          <tr class="subsection">
            <td colspan="2"><strong>Gastos Administrativos</strong></td>
          </tr>
          <tr>
            <td>Gastos Administrativos (-)</td>
            <td class="value negative">${formatCurrency(-dre.adminCosts)}</td>
          </tr>
          <tr>
            <td>% Gastos Administrativos (-)/ROL</td>
            <td class="value">${formatPercent(dre.adminPct)}</td>
          </tr>
          <tr>
            <td class="indent">Software</td>
            <td class="value negative">${formatCurrency(-dre.adminDetails.software)}</td>
          </tr>
          <tr>
            <td class="indent">Contador</td>
            <td class="value negative">${formatCurrency(-dre.adminDetails.accounting)}</td>
          </tr>
          <tr>
            <td class="indent">Telefone / Internet</td>
            <td class="value">${formatCurrency(dre.adminDetails.phoneInternet)}</td>
          </tr>
          <tr>
            <td class="indent">Seguro do imóvel</td>
            <td class="value negative">${formatCurrency(-dre.adminDetails.insurance)}</td>
          </tr>
          <tr>
            <td class="indent">Gastos Adm. - Outros</td>
            <td class="value negative">${formatCurrency(-dre.adminDetails.other)}</td>
          </tr>

          <!-- Recursos Humanos -->
          <tr class="subsection">
            <td colspan="2"><strong>Recursos Humanos</strong></td>
          </tr>
          <tr>
            <td>Recursos Humanos (-)</td>
            <td class="value negative">${formatCurrency(-dre.hrCosts)}</td>
          </tr>
          <tr>
            <td>% Recursos Humanos (-)/ROL</td>
            <td class="value">${formatPercent(dre.hrPct)}</td>
          </tr>
          <tr>
            <td class="indent">Mão de Obra Total</td>
            <td class="value negative">${formatCurrency(-dre.hrDetails.totalLabor)}</td>
          </tr>
          <tr>
            <td class="indent">Qtde. Recursos</td>
            <td class="value">${dre.hrDetails.employeeCount}</td>
          </tr>
          <tr>
            <td class="indent">Custo Médio/Recurso</td>
            <td class="value negative">${formatCurrency(-dre.hrDetails.avgCostPerEmployee)}</td>
          </tr>

          <!-- Outros Gastos com Pessoal -->
          <tr class="subsection">
            <td colspan="2"><strong>Outros Gastos com Pessoal</strong></td>
          </tr>
          <tr>
            <td>Outros Gastos com Pessoal (-)</td>
            <td class="value negative">${formatCurrency(-dre.otherPersonnelCosts)}</td>
          </tr>
          <tr>
            <td>% Outros Gastos com Pessoal (-)/ROL</td>
            <td class="value">${formatPercent(dre.otherPersonnelPct)}</td>
          </tr>
          <tr>
            <td class="indent">Outros Gastos</td>
            <td class="value negative">${formatCurrency(-dre.otherPersonnelCosts)}</td>
          </tr>

          <!-- Marketing -->
          <tr class="subsection">
            <td colspan="2"><strong>Marketing</strong></td>
          </tr>
          <tr>
            <td>Marketing (-)</td>
            <td class="value">${formatCurrency(dre.marketingCosts)}</td>
          </tr>
          <tr>
            <td>% Marketing (-)/ROL</td>
            <td class="value">${formatPercent(dre.marketingPct)}</td>
          </tr>
          <tr>
            <td class="indent">Marketing</td>
            <td class="value">${formatCurrency(dre.marketingCosts)}</td>
          </tr>

          <!-- ========== RESULTADO ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>RESULTADO</strong></td>
          </tr>
          <tr class="highlight">
            <td><strong>Lucro Líquido</strong></td>
            <td class="value"><strong>${formatCurrency(dre.netProfit)}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Líquido</td>
            <td class="value">${formatPercent(dre.netProfitPct)}</td>
          </tr>
          <tr>
            <td>Taxa de Transferência (-)</td>
            <td class="value negative">${formatCurrency(dre.transferFee)}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Lucro Geral</strong></td>
            <td class="value"><strong>${formatCurrency(dre.profitAfterTransfer)}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Geral</td>
            <td class="value">${formatPercent(dre.profitAfterTransferPct)}</td>
          </tr>
          <tr>
            <td>PLR (-)</td>
            <td class="value negative">${formatCurrency(dre.plr)}</td>
          </tr>
          <tr class="highlight final">
            <td><strong>Lucro Final</strong></td>
            <td class="value"><strong>${formatCurrency(dre.finalProfit)}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Final</td>
            <td class="value">${formatPercent(dre.finalProfitPct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ========== RENDERIZAR DRE MoM (COMPARAÇÃO) ==========
// ========== RENDERIZAR DRE MoM (COMPARAÇÃO COMPLETA) ==========
function renderDreMoM(data) {
  const container = document.getElementById('dreContent');
  if (!container || !data || data.length === 0) {
    container.innerHTML = '<div class="error">Nenhum dado encontrado para o período selecionado.</div>';
    return;
  }

  // Criar cabeçalho com todos os meses
  const headers = data.map(item => {
    const [year, month] = item.month.split('-');
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
  });

  // Função auxiliar para criar linhas
  function createRow(label, key, options = {}) {
    const { 
      type = 'currency', 
      negative = false, 
      highlight = false, 
      final = false,
      section = false,
      subsection = false,
      indent = false
    } = options;

    let rowClass = '';
    if (section) rowClass = 'section-header';
    else if (subsection) rowClass = 'subsection';
    else if (highlight) rowClass = final ? 'highlight final' : 'highlight';

    let row = `<tr class="${rowClass}">`;
    
    if (section || subsection) {
      row += `<td colspan="${data.length + 1}"><strong>${label}</strong></td>`;
    } else {
      const tdClass = indent ? 'indent' : '';
      row += `<td class="${tdClass}">${label}</td>`;
      
      data.forEach(item => {
        let value = item.data;
        
        // Navegar por chaves aninhadas (ex: "occupationDetails.rent")
        const keys = key.split('.');
        for (const k of keys) {
          value = value?.[k];
        }
        
        if (value === undefined || value === null) value = 0;
        
        const formattedValue = type === 'currency' 
          ? formatCurrency(negative ? -value : value)
          : type === 'percent'
          ? formatPercent(value)
          : value;
        
        const cellClass = negative ? 'value negative' : 'value';
        row += `<td class="${cellClass}">${formattedValue}</td>`;
      });
    }
    
    row += '</tr>';
    return row;
  }

  // Construir todas as linhas do DRE
  let tableRows = '';

  // ========== RECEITAS ==========
  tableRows += createRow('RECEITAS', '', { section: true });
  tableRows += createRow('Receita Bruta (+)', 'grossRevenue');
  tableRows += createRow('Descontos', 'discounts');
  tableRows += createRow('% Descontos', 'discountPct', { type: 'percent' });
  tableRows += createRow('Receita Bruta (+) s/Descontos', 'grossRevenueNoDiscount', { highlight: true });
  tableRows += createRow('% Impostos', 'taxPct', { type: 'percent' });
  tableRows += createRow('Impostos (-)', 'taxes', { negative: true });
  tableRows += createRow('Taxas Transações', 'transactionFees', { negative: true });
  tableRows += createRow('Receita Líquida (+)', 'netRevenue', { highlight: true });

  // ========== GASTOS VARIÁVEIS ==========
  tableRows += createRow('GASTOS VARIÁVEIS', '', { section: true });
  tableRows += createRow('Gastos Variáveis (-)', 'totalVariableCosts', { negative: true });
  tableRows += createRow('% Gastos Variáveis (-)/ROL', 'variableCostsPct', { type: 'percent' });

  // CMV
  tableRows += createRow('CMV', '', { subsection: true });
  tableRows += createRow('CMV (-)', 'cogs', { negative: true });
  tableRows += createRow('% CMV/ROB', 'cogsPctROB', { type: 'percent' });
  tableRows += createRow('% CMV/ROB s/Descontos', 'cogsPctROBNoDiscount', { type: 'percent' });
  tableRows += createRow('% CMV/ROL', 'cogsPctROL', { type: 'percent' });

  // Taxas Cartão e iFood
  tableRows += createRow('Taxas Cartão e Ifood', '', { subsection: true });
  tableRows += createRow('Ifood', 'ifoodFees');
  tableRows += createRow('Adquirência', 'acquirerFees');

  // Despesas Franquia
  tableRows += createRow('Despesas Franquia', '', { subsection: true });
  tableRows += createRow('Despesas Franquia (-)', 'franchiseFees', { negative: true });
  tableRows += createRow('% Despesas Franquia (-)/ROL', 'franchiseFeesPct', { type: 'percent' });
  tableRows += createRow('Royalties', 'royalties');
  tableRows += createRow('% Royalties/ROB', 'royaltiesPctROB', { type: 'percent' });
  tableRows += createRow('% Royalties/ROL', 'royaltiesPctROL', { type: 'percent' });
  tableRows += createRow('Fundo de Propaganda', 'marketingFund', { negative: true });
  tableRows += createRow('% Fundo de Propaganda/ROB', 'marketingFundPctROB', { type: 'percent' });
  tableRows += createRow('% Fundo de Propaganda/ROL', 'marketingFundPctROL', { type: 'percent' });

  // Margem de Contribuição
  tableRows += createRow('Margem de Contribuição', 'contributionMargin', { highlight: true });
  tableRows += createRow('% Margem de Contribuição', 'contributionMarginPct', { type: 'percent' });

  // ========== GASTOS FIXOS ==========
  tableRows += createRow('GASTOS FIXOS', '', { section: true });
  tableRows += createRow('Gastos Fixos (-)', 'totalFixedCosts', { negative: true });
  tableRows += createRow('% Gastos Fixos (-)/ROL', 'fixedCostsPct', { type: 'percent' });

  // Ocupação
  tableRows += createRow('Ocupação', '', { subsection: true });
  tableRows += createRow('Ocupação (-)', 'occupationCosts', { negative: true });
  tableRows += createRow('% Ocupação (-)/ROL', 'occupationPct', { type: 'percent' });
  tableRows += createRow('Aluguel', 'occupationDetails.rent', { negative: true, indent: true });
  tableRows += createRow('Condomínio', 'occupationDetails.condo', { negative: true, indent: true });
  tableRows += createRow('Fundo Promoção Shopping', 'occupationDetails.shoppingPromo', { negative: true, indent: true });
  tableRows += createRow('IPTU', 'occupationDetails.propertyTax', { negative: true, indent: true });
  tableRows += createRow('Água', 'occupationDetails.water', { negative: true, indent: true });
  tableRows += createRow('Energia', 'occupationDetails.electricity', { negative: true, indent: true });
  tableRows += createRow('Ar condicionado', 'occupationDetails.ac', { negative: true, indent: true });

  // Consumos e Utilidades
  tableRows += createRow('Consumos e Utilidades', '', { subsection: true });
  tableRows += createRow('Consumos e utilidades (-)', 'utilitiesCosts', { negative: true });
  tableRows += createRow('% Consumos e utilidades (-)/ROL', 'utilitiesPct', { type: 'percent' });
  tableRows += createRow('Internet', 'utilitiesDetails.internet', { negative: true, indent: true });
  tableRows += createRow('Limpeza e Conservação', 'utilitiesDetails.cleaning', { negative: true, indent: true });
  tableRows += createRow('Manutenção', 'utilitiesDetails.maintenance', { negative: true, indent: true });
  tableRows += createRow('Materiais de escritório', 'utilitiesDetails.officeSupplies', { negative: true, indent: true });
  tableRows += createRow('Equipamentos e utensílios', 'utilitiesDetails.equipmentUtensils', { indent: true });
  tableRows += createRow('Aluguel Equipamentos', 'utilitiesDetails.equipmentRental', { indent: true });

  // Gastos Administrativos
  tableRows += createRow('Gastos Administrativos', '', { subsection: true });
  tableRows += createRow('Gastos Administrativos (-)', 'adminCosts', { negative: true });
  tableRows += createRow('% Gastos Administrativos (-)/ROL', 'adminPct', { type: 'percent' });
  tableRows += createRow('Software', 'adminDetails.software', { negative: true, indent: true });
  tableRows += createRow('Contador', 'adminDetails.accounting', { negative: true, indent: true });
  tableRows += createRow('Telefone / Internet', 'adminDetails.phoneInternet', { indent: true });
  tableRows += createRow('Seguro do imóvel', 'adminDetails.insurance', { negative: true, indent: true });
  tableRows += createRow('Gastos Adm. - Outros', 'adminDetails.other', { negative: true, indent: true });

  // Recursos Humanos
  tableRows += createRow('Recursos Humanos', '', { subsection: true });
  tableRows += createRow('Recursos Humanos (-)', 'hrCosts', { negative: true });
  tableRows += createRow('% Recursos Humanos (-)/ROL', 'hrPct', { type: 'percent' });
  tableRows += createRow('Mão de Obra Total', 'hrDetails.totalLabor', { negative: true, indent: true });
  tableRows += createRow('Qtde. Recursos', 'hrDetails.employeeCount', { type: 'number', indent: true });
  tableRows += createRow('Custo Médio/Recurso', 'hrDetails.avgCostPerEmployee', { negative: true, indent: true });

  // Outros Gastos com Pessoal
  tableRows += createRow('Outros Gastos com Pessoal', '', { subsection: true });
  tableRows += createRow('Outros Gastos com Pessoal (-)', 'otherPersonnelCosts', { negative: true });
  tableRows += createRow('% Outros Gastos com Pessoal (-)/ROL', 'otherPersonnelPct', { type: 'percent' });
  tableRows += createRow('Outros Gastos', 'otherPersonnelCosts', { negative: true, indent: true });

  // Marketing
  tableRows += createRow('Marketing', '', { subsection: true });
  tableRows += createRow('Marketing (-)', 'marketingCosts');
  tableRows += createRow('% Marketing (-)/ROL', 'marketingPct', { type: 'percent' });
  tableRows += createRow('Marketing', 'marketingCosts', { indent: true });

  // ========== RESULTADO ==========
  tableRows += createRow('RESULTADO', '', { section: true });
  tableRows += createRow('Lucro Líquido', 'netProfit', { highlight: true });
  tableRows += createRow('% Lucro Líquido', 'netProfitPct', { type: 'percent' });
  tableRows += createRow('Taxa de Transferência (-)', 'transferFee', { negative: true });
  tableRows += createRow('Lucro Geral', 'profitAfterTransfer', { highlight: true });
  tableRows += createRow('% Lucro Geral', 'profitAfterTransferPct', { type: 'percent' });
  tableRows += createRow('PLR (-)', 'plr', { negative: true });
  tableRows += createRow('Lucro Final', 'finalProfit', { highlight: true, final: true });
  tableRows += createRow('% Lucro Final', 'finalProfitPct', { type: 'percent' });

  // Renderizar tabela
  container.innerHTML = `
    <div class="dre-table mom-table">
      <table>
        <thead>
          <tr>
            <th style="text-align: left; min-width: 250px;">Descrição</th>
            ${headers.map(h => `<th style="text-align: right; min-width: 120px;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('yearSelect');
  const startYearSelect = document.getElementById('startYearSelect');
  const endYearSelect = document.getElementById('endYearSelect');
  const monthSelect = document.getElementById('monthSelect');
  const momMode = document.getElementById('momMode');
  const loadBtn = document.getElementById('loadBtn');
  const singleMonthFilters = document.getElementById('singleMonthFilters');
  const momFilters = document.getElementById('momFilters');

  if (!yearSelect || !loadBtn) {
    console.error('Elementos essenciais não encontrados no HTML!');
    return;
  }

  // Preencher anos (últimos 5 anos)
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    
    const option1 = document.createElement('option');
    option1.value = year;
    option1.textContent = year;
    yearSelect.appendChild(option1);
    
    if (startYearSelect) {
      const option2 = document.createElement('option');
      option2.value = year;
      option2.textContent = year;
      startYearSelect.appendChild(option2);
    }
    
    if (endYearSelect) {
      const option3 = document.createElement('option');
      option3.value = year;
      option3.textContent = year;
      endYearSelect.appendChild(option3);
    }
  }

  // Selecionar mês e ano atuais
  yearSelect.value = currentYear;
  if (startYearSelect) startYearSelect.value = currentYear;
  if (endYearSelect) endYearSelect.value = currentYear;
  
  const currentMonth = new Date().getMonth() + 1;
  if (monthSelect) monthSelect.value = currentMonth;

  // Toggle entre modo único e MoM
  if (momMode) {
    momMode.addEventListener('change', (e) => {
      if (e.target.checked) {
        singleMonthFilters.classList.add('hidden');
        momFilters.classList.remove('hidden');
      } else {
        singleMonthFilters.classList.remove('hidden');
        momFilters.classList.add('hidden');
      }
    });
  }

  // Botão carregar
  loadBtn.addEventListener('click', () => {
    if (momMode && momMode.checked) {
      loadDreMoM();
    } else {
      loadDre();
    }
  });
}); 