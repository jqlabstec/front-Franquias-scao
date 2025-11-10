// ========== CONFIGURAÇÃO BASE ==========
const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function getFranchiseId() {
  const auth = getAuth();
  // Ajuste aqui caso seu auth salve de outra forma:
  return auth?.franchiseId || auth?.selectedFranchiseId || null;
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

function formatPercent(value) {
  const num = Number(value) || 0;
  return `${num.toFixed(2)}%`;
}

function safeGet(obj, path, defaultValue = 0) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
}

// ========== RENDERIZAR ALERTAS ==========
function renderAlerts(alerts) {
  if (!alerts || alerts.length === 0) return '';

  const alertsHtml = alerts.map(alert => {
    let icon = '💡';
    let bgColor = '#e0f2fe';
    let borderColor = '#0ea5e9';
    let textColor = '#0c4a6e';

    if (alert.type === 'warning') {
      icon = '⚠️';
      bgColor = '#fef3c7';
      borderColor = '#f59e0b';
      textColor = '#78350f';
    } else if (alert.type === 'error') {
      icon = '❌';
      bgColor = '#fee2e2';
      borderColor = '#ef4444';
      textColor = '#991b1b';
    }

    return `
      <div class="alert alert-${alert.type}" style="
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: ${textColor};
        font-size: 14px;
        line-height: 1.6;
      ">
        <span style="font-size: 20px;">${icon}</span>
        <span>${alert.message}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="alerts-section" style="margin-bottom: 30px;">
      <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 700;">
        🔔 Alertas e Recomendações
      </h3>
      ${alertsHtml}
    </div>
  `;
}

// ========== RENDERIZAR VENDAS MAPEADAS ==========
function renderSalesMapping(sales) {
  if (!sales) return '';

  const mappedPct = safeGet(sales, 'mappedPct', 0);
  const unmappedPct = safeGet(sales, 'unmappedPct', 0);
  const mappedPctColor = mappedPct >= 80 ? '#22c55e' : mappedPct >= 50 ? '#f59e0b' : '#ef4444';
  const unmappedPctColor = unmappedPct <= 20 ? '#22c55e' : unmappedPct <= 50 ? '#f59e0b' : '#ef4444';

  return `
    <div class="sales-mapping-section" style="
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    ">
      <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #166534;">
        📊 Status de Mapeamento de Vendas
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <!-- Total -->
        <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Total de Vendas</div>
          <div style="font-size: 24px; font-weight: 700; color: #0f172a;">${formatCurrency(safeGet(sales, 'total'))}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${safeGet(sales, 'mappedCount', 0) + safeGet(sales, 'unmappedCount', 0)} vendas</div>
        </div>

        <!-- Mapeadas -->
        <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">✅ Vendas Mapeadas</div>
          <div style="font-size: 24px; font-weight: 700; color: ${mappedPctColor};">${formatCurrency(safeGet(sales, 'mapped'))}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${safeGet(sales, 'mappedCount', 0)} vendas (${formatPercent(mappedPct)})
          </div>
        </div>

        <!-- Não Mapeadas -->
        <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">⚠️ Vendas Não Mapeadas</div>
          <div style="font-size: 24px; font-weight: 700; color: ${unmappedPctColor};">${formatCurrency(safeGet(sales, 'unmapped'))}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${safeGet(sales, 'unmappedCount', 0)} vendas (${formatPercent(unmappedPct)})
          </div>
        </div>
      </div>

      <!-- Barra de Progresso -->
      <div style="margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #64748b;">
          <span>Progresso de Mapeamento</span>
          <span>${formatPercent(mappedPct)}</span>
        </div>
        <div style="background: #e5e7eb; border-radius: 10px; height: 12px; overflow: hidden;">
          <div style="
            background: linear-gradient(90deg, #22c55e, #16a34a);
            height: 100%;
            width: ${mappedPct}%;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    </div>
  `;
}

// ========== RENDERIZAR CMV DETALHADO ==========
function renderCogsDetails(cogs) {
  if (!cogs) return '';

  return `
    <tr class="subsection">
      <td colspan="2"><strong>📊 CMV Detalhado</strong></td>
    </tr>
    <tr>
      <td class="indent">CMV Mapeado</td>
      <td class="value negative">${formatCurrency(-safeGet(cogs, 'mapped'))}</td>
    </tr>
    <tr>
      <td class="indent">% CMV Mapeado</td>
      <td class="value">${formatPercent(safeGet(cogs, 'mappedPct'))}</td>
    </tr>
    <tr>
      <td class="indent">CMV Estimado (não mapeado)</td>
      <td class="value negative">${formatCurrency(-safeGet(cogs, 'unmapped'))}</td>
    </tr>
    <tr>
      <td class="indent">% CMV Estimado</td>
      <td class="value">${formatPercent(safeGet(cogs, 'unmappedPct'))}</td>
    </tr>
    <tr>
      <td><strong>CMV Total (-)</strong></td>
      <td class="value negative"><strong>${formatCurrency(-safeGet(cogs, 'total'))}</strong></td>
    </tr>
    <tr>
      <td>% CMV Total</td>
      <td class="value">${formatPercent(safeGet(cogs, 'totalPct'))}</td>
    </tr>
  `;
}

// ========== RENDERIZAR PRODUTOS NÃO MAPEADOS ==========
function renderUnmappedProducts(unmappedProducts) {
  if (!unmappedProducts || safeGet(unmappedProducts, 'count', 0) === 0) return '';

  const products = unmappedProducts.products || [];
  const productsHtml = products
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10)
    .map(product => `
      <tr>
        <td style="padding-left: 32px; font-size: 13px;">${product.name || 'N/A'}</td>
        <td class="value" style="font-size: 13px;">${(product.quantity || 0).toFixed(2)}</td>
        <td class="value" style="font-size: 13px;">${formatCurrency(product.revenue || 0)}</td>
      </tr>
    `).join('');

  return `
    <tr class="section-header">
      <td colspan="3">
        <strong>🔍 PRODUTOS NÃO MAPEADOS (${safeGet(unmappedProducts, 'count', 0)} produtos)</strong>
      </td>
    </tr>
    <tr>
      <td colspan="2">Receita de Produtos Não Mapeados</td>
      <td class="value">${formatCurrency(safeGet(unmappedProducts, 'totalRevenue'))}</td>
    </tr>
    <tr class="subsection">
      <td colspan="3"><strong>Top 10 Produtos Não Mapeados</strong></td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding-left: 32px; font-size: 12px; font-weight: 700;">Produto</td>
      <td class="value" style="font-size: 12px; font-weight: 700;">Qtd</td>
      <td class="value" style="font-size: 12px; font-weight: 700;">Receita</td>
    </tr>
    ${productsHtml}
    ${safeGet(unmappedProducts, 'count', 0) > 10 ? `
      <tr>
        <td colspan="3" style="padding-left: 32px; font-size: 12px; color: #64748b; font-style: italic;">
          ... e mais ${safeGet(unmappedProducts, 'count', 0) - 10} produtos
        </td>
      </tr>
    ` : ''}
  `;
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

  // Enviar franchiseId se necessário
  const franchiseId = getFranchiseId();
  const qsFranchise = franchiseId ? `&franchiseId=${franchiseId}` : '';

  try {
    const url = `${API_BASE}/dashboard?year=${year}&month=${month}${qsFranchise}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (!response.ok) throw new Error('Erro ao carregar DRE');

    const data = await response.json();
    console.log('📊 Dados recebidos da API:', { url, data });
    renderDre(data, month, year);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="error">❌ Erro ao carregar DRE. Verifique o console.</div>';
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

  const alertsHtml = renderAlerts(dre.alerts);
  const salesMappingHtml = renderSalesMapping(dre.sales);

  let taxBreakdownHtml = '';
  if (dre.taxBreakdown && dre.taxBreakdown.length > 0) {
    taxBreakdownHtml = `
      <tr class="tax-details">
        <td colspan="2" style="padding-left: 30px; font-size: 0.9em; color: #666;">
          <strong>Detalhamento de Impostos:</strong><br/>
          ${dre.taxBreakdown.map(tax => 
            `<span style="display: block; margin-left: 15px; line-height: 1.8;">
              ${tax.type}: ${formatCurrency(tax.amount || 0)} (${formatPercent(tax.percentage || 0)})
            </span>`
          ).join('')}
        </td>
      </tr>
    `;
  }

  const cogsDetailsHtml = renderCogsDetails(dre.cogs);
  const unmappedProductsHtml = renderUnmappedProducts(dre.unmappedProducts);

  container.innerHTML = `
    ${alertsHtml}
    ${salesMappingHtml}

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
            <td class="value">${formatCurrency(safeGet(dre, 'grossRevenue'))}</td>
          </tr>
          <tr>
            <td>Descontos</td>
            <td class="value">${formatCurrency(safeGet(dre, 'discounts'))}</td>
          </tr>
          <tr>
            <td>% Descontos</td>
            <td class="value">${formatPercent(safeGet(dre, 'discountPct'))}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Receita Bruta (+) s/Descontos</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'grossRevenueNoDiscount'))}</strong></td>
          </tr>
          <tr>
            <td>% Impostos</td>
            <td class="value">${formatPercent(safeGet(dre, 'taxPct'))}</td>
          </tr>
          ${taxBreakdownHtml}
          <tr>
            <td>Impostos (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'taxes'))}</td>
          </tr>
          <tr>
            <td>Taxas Transações</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'transactionFees'))}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Receita Líquida (+)</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'netRevenue'))}</strong></td>
          </tr>

          <!-- ========== GASTOS VARIÁVEIS ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>GASTOS VARIÁVEIS</strong></td>
          </tr>
          <tr>
            <td>Gastos Variáveis (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'variableCosts.total'))}</td>
          </tr>
          <tr>
            <td>% Gastos Variáveis (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'variableCosts.totalPct'))}</td>
          </tr>

          <!-- CMV DETALHADO -->
          <tr class="subsection">
            <td colspan="2"><strong>CMV</strong></td>
          </tr>
          ${cogsDetailsHtml}
          <tr>
            <td>% CMV/ROB</td>
            <td class="value">${formatPercent(safeGet(dre, 'cogs.cogsPctROB'))}</td>
          </tr>
          <tr>
            <td>% CMV/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'cogs.cogsPctROL'))}</td>
          </tr>

          <!-- Taxas Cartão e iFood -->
          <tr class="subsection">
            <td colspan="2"><strong>Taxas Cartão e Ifood</strong></td>
          </tr>
          <tr>
            <td>Ifood</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'variableCosts.deliveryFees'))}</td>
          </tr>
          <tr>
            <td>Adquirência</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'variableCosts.acquirerFees'))}</td>
          </tr>

          <!-- Despesas Franquia -->
          <tr class="subsection">
            <td colspan="2"><strong>Despesas Franquia</strong></td>
          </tr>
          <tr>
            <td>Royalties</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'variableCosts.royalties'))}</td>
          </tr>
          <tr>
            <td>Fundo de Propaganda</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'variableCosts.marketingFund'))}</td>
          </tr>

          <!-- Margem de Contribuição -->
          <tr class="highlight">
            <td><strong>Margem de Contribuição</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'contributionMargin'))}</strong></td>
          </tr>
          <tr>
            <td>% Margem de Contribuição</td>
            <td class="value">${formatPercent(safeGet(dre, 'contributionMarginPct'))}</td>
          </tr>

          <!-- ========== GASTOS FIXOS ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>GASTOS FIXOS</strong></td>
          </tr>
          <tr>
            <td>Gastos Fixos (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.total'))}</td>
          </tr>
          <tr>
            <td>% Gastos Fixos (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.totalPct'))}</td>
          </tr>

          <!-- Ocupação -->
          <tr class="subsection">
            <td colspan="2"><strong>Ocupação</strong></td>
          </tr>
          <tr>
            <td>Ocupação (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.total'))}</td>
          </tr>
          <tr>
            <td>% Ocupação (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.occupation.totalPct'))}</td>
          </tr>
          <tr>
            <td class="indent">Aluguel</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.rent'))}</td>
          </tr>
          <tr>
            <td class="indent">Condomínio</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.condo'))}</td>
          </tr>
          <tr>
            <td class="indent">Fundo Promoção Shopping</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.shoppingPromo'))}</td>
          </tr>
          <tr>
            <td class="indent">IPTU</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.propertyTax'))}</td>
          </tr>
          <tr>
            <td class="indent">Água</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.water'))}</td>
          </tr>
          <tr>
            <td class="indent">Energia</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.electricity'))}</td>
          </tr>
          <tr>
            <td class="indent">Ar condicionado</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.ac'))}</td>
          </tr>
          <tr>
            <td class="indent">Gás</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.occupation.details.gas'))}</td>
          </tr>

          <!-- Consumos e Utilidades -->
          <tr class="subsection">
            <td colspan="2"><strong>Consumos e Utilidades</strong></td>
          </tr>
          <tr>
            <td>Consumos e utilidades (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.total'))}</td>
          </tr>
          <tr>
            <td>% Consumos e utilidades (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.utilities.totalPct'))}</td>
          </tr>
          <tr>
            <td class="indent">Internet</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.internet'))}</td>
          </tr>
          <tr>
            <td class="indent">Limpeza e Conservação</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.cleaning'))}</td>
          </tr>
          <tr>
            <td class="indent">Manutenção</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.maintenance'))}</td>
          </tr>
          <tr>
            <td class="indent">Materiais de escritório</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.officeSupplies'))}</td>
          </tr>
          <tr>
            <td class="indent">Equipamentos e utensílios</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.equipmentUtensils'))}</td>
          </tr>
          <tr>
            <td class="indent">Aluguel Equipamentos</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.equipmentRental'))}</td>
          </tr>
          <tr>
            <td class="indent">Telefone</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.utilities.details.phone'))}</td>
          </tr>

          <!-- Gastos Administrativos -->
          <tr class="subsection">
            <td colspan="2"><strong>Gastos Administrativos</strong></td>
          </tr>
          <tr>
            <td>Gastos Administrativos (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.total'))}</td>
          </tr>
          <tr>
            <td>% Gastos Administrativos (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.admin.totalPct'))}</td>
          </tr>
          <tr>
            <td class="indent">Software</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.software'))}</td>
          </tr>
          <tr>
            <td class="indent">Contador</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.accounting'))}</td>
          </tr>
          <tr>
            <td class="indent">Seguro do imóvel</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.insurance'))}</td>
          </tr>
          <tr>
            <td class="indent">Assessoria Jurídica</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.legal'))}</td>
          </tr>
          <tr>
            <td class="indent">Tarifas Bancárias</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.bankFee'))}</td>
          </tr>
          <tr>
            <td class="indent">Gastos Adm. - Outros</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.admin.details.other'))}</td>
          </tr>

          <!-- Recursos Humanos -->
          <tr class="subsection">
            <td colspan="2"><strong>Recursos Humanos</strong></td>
          </tr>
          <tr>
            <td>Recursos Humanos (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.hr.total'))}</td>
          </tr>
          <tr>
            <td>% Recursos Humanos (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.hr.totalPct'))}</td>
          </tr>
          <tr>
            <td class="indent">Salários</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.hr.details.salary'))}</td>
          </tr>
          <tr>
            <td class="indent">Encargos Trabalhistas</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.hr.details.laborCharges'))}</td>
          </tr>
          <tr>
            <td class="indent">Benefícios</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.hr.details.benefits'))}</td>
          </tr>
          <tr>
            <td class="indent">Treinamento</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.hr.details.training'))}</td>
          </tr>

          <!-- Marketing -->
          <tr class="subsection">
            <td colspan="2"><strong>Marketing</strong></td>
          </tr>
          <tr>
            <td>Marketing (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.marketing.total'))}</td>
          </tr>
          <tr>
            <td>% Marketing (-)/ROL</td>
            <td class="value">${formatPercent(safeGet(dre, 'fixedCosts.marketing.totalPct'))}</td>
          </tr>
          <tr>
            <td class="indent">Marketing</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.marketing.details.marketing'))}</td>
          </tr>
          <tr>
            <td class="indent">Publicidade</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'fixedCosts.marketing.details.advertising'))}</td>
          </tr>

          <!-- ========== PRODUTOS NÃO MAPEADOS ========== -->
          ${unmappedProductsHtml}

          <!-- ========== RESULTADO ========== -->
          <tr class="section-header">
            <td colspan="2"><strong>RESULTADO</strong></td>
          </tr>
          <tr class="highlight">
            <td><strong>Lucro Líquido</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'netProfit'))}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Líquido</td>
            <td class="value">${formatPercent(safeGet(dre, 'netProfitPct'))}</td>
          </tr>
          <tr>
            <td>Taxa de Transferência (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'transferFee'))}</td>
          </tr>
          <tr class="highlight">
            <td><strong>Lucro Geral</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'profitAfterTransfer'))}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Geral</td>
            <td class="value">${formatPercent(safeGet(dre, 'profitAfterTransferPct'))}</td>
          </tr>
          <tr>
            <td>PLR (-)</td>
            <td class="value negative">${formatCurrency(-safeGet(dre, 'plr'))}</td>
          </tr>
          <tr class="highlight final">
            <td><strong>Lucro Final</strong></td>
            <td class="value"><strong>${formatCurrency(safeGet(dre, 'finalProfit'))}</strong></td>
          </tr>
          <tr>
            <td>% Lucro Final</td>
            <td class="value">${formatPercent(safeGet(dre, 'finalProfitPct'))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ========== NORMALIZAÇÃO MoM ==========
function parseYearMonthFields(item) {
  // Retorna { year, month } como números
  if (item.year && item.month) {
    return { year: Number(item.year), month: Number(item.month) };
  }
  if (typeof item.month === 'string') {
    // "YYYY-MM"
    const m = item.month.match(/^(\d{4})-(\d{2})/);
    if (m) return { year: Number(m[1]), month: Number(m[2]) };
  }
  // Tenta fallback com data completa
  if (item.month && !isNaN(Date.parse(item.month))) {
    const d = new Date(item.month);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: NaN, month: NaN };
}

function normalizeMoMPayload(payload) {
  // Aceita:
  // - [{ month: 'YYYY-MM', data: {...}}]
  // - [{ year: 2025, month: 9, ...campos }]
  // - { months: [ ... ] }
  const rawMonths = Array.isArray(payload) ? payload
                   : Array.isArray(payload?.months) ? payload.months
                   : [];

  const normalized = rawMonths.map((item) => {
    const { year, month } = parseYearMonthFields(item);
    const core = item.data && typeof item.data === 'object' ? item.data : item;
    // Remover chaves estruturais "month" e "data" para evitar colisão ao espalhar
    const { data, month: _m, ...rest } = item;
    // Campos do DRE devem ficar no topo do objeto do mês
    return {
      year,
      month,
      ...core,
      ...rest, // preserva outros metadados se existirem
    };
  });

  return { months: normalized };
}

// ========== CARREGAR DRE MoM ==========
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

  const franchiseId = getFranchiseId();
  const qsFranchise = franchiseId ? `&franchiseId=${franchiseId}` : '';

  try {
    const url = `${API_BASE}/dashboard/mom?startYear=${startYear}&startMonth=${startMonth}&endYear=${endYear}&endMonth=${endMonth}${qsFranchise}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });

    if (!response.ok) throw new Error('Erro ao carregar DRE MoM');

    const raw = await response.json();
    console.log('📊 Dados MoM recebidos da API (bruto):', { url, raw });

    const data = normalizeMoMPayload(raw);
    console.log('✅ Dados MoM normalizados:', data);

    if (!data || !Array.isArray(data.months)) {
      console.error('Resposta inesperada da API MoM (após normalização):', data);
      throw new Error('Formato de resposta inválido (esperado array ou { months: [...] })');
    }

    renderDreMoM(data);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="error">❌ Erro ao carregar comparação. Verifique o console.</div>';
  }
}

// ========== RENDERIZAR DRE MoM ==========
function renderDreMoM(data) {
  const container = document.getElementById('dreContent');
  if (!container) {
    console.error('Container dreContent não encontrado!');
    return;
  }

  if (!data.months || data.months.length === 0) {
    container.innerHTML = '<div class="error">❌ Nenhum dado disponível para o período selecionado.</div>';
    return;
  }

  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const columns = data.months.map(m => {
    const y = isNaN(m.year) ? '' : m.year.toString().slice(2);
    const label = (!isNaN(m.month) && m.month >= 1 && m.month <= 12) ? monthNames[m.month - 1] : (m.month ?? '?');
    return `${label}/${y}`;
  });

  const headerCols = columns.map(col => `<th style="text-align: right;">${col}</th>`).join('');

  function renderRow(label, values, isHighlight = false, isNegative = false, indent = false) {
    const className = isHighlight ? 'highlight' : '';
    const tdClass = indent ? 'indent' : '';
    const valueClass = isNegative ? 'value negative' : 'value';

    const valueCols = values.map(v =>
      `<td class="${valueClass}">${formatCurrency(isNegative ? -v : v)}</td>`
    ).join('');

    return `
      <tr class="${className}">
        <td class="${tdClass}">${label}</td>
        ${valueCols}
      </tr>
    `;
  }

  function renderPercentRow(label, values, indent = false) {
    const tdClass = indent ? 'indent' : '';
    const valueCols = values.map(v => `<td class="value">${formatPercent(v)}</td>`).join('');
    return `
      <tr>
        <td class="${tdClass}">${label}</td>
        ${valueCols}
      </tr>
    `;
  }

  function renderSectionHeader(title) {
    return `
      <tr class="section-header">
        <td colspan="${columns.length + 1}"><strong>${title}</strong></td>
      </tr>
    `;
  }

  function renderSubsection(title) {
    return `
      <tr class="subsection">
        <td colspan="${columns.length + 1}"><strong>${title}</strong></td>
      </tr>
    `;
  }

  // ✅ Coletar todos os tipos de impostos presentes
  const allTaxTypes = new Set();
  data.months.forEach(m => {
    if (m.taxBreakdown && Array.isArray(m.taxBreakdown)) {
      m.taxBreakdown.forEach(tax => {
        if (tax.type) allTaxTypes.add(tax.type);
      });
    }
  });

  // ✅ Detalhamento de impostos por mês (DENTRO DA TABELA)
  let taxBreakdownHtml = '';
  if (allTaxTypes.size > 0) {
    taxBreakdownHtml = `
      ${renderSubsection('📊 Detalhamento de Impostos')}
      ${Array.from(allTaxTypes).map(taxType => {
        const amounts = data.months.map(m => {
          const tax = (m.taxBreakdown || []).find(t => t.type === taxType);
          return tax ? (tax.amount || 0) : 0;
        });
        const percentages = data.months.map(m => {
          const tax = (m.taxBreakdown || []).find(t => t.type === taxType);
          return tax ? (tax.percentage || 0) : 0;
        });

        return `
          ${renderRow(taxType, amounts, false, true, true)}
          ${renderPercentRow(`% ${taxType}`, percentages, true)}
        `;
      }).join('')}
    `;
  }

  // CMV detalhado (MoM)
  const cogsDetailsHtml = `
    ${renderSubsection('📊 CMV Detalhado')}
    ${renderRow('CMV Mapeado', data.months.map(m => safeGet(m, 'cogs.mapped')), false, true, true)}
    ${renderPercentRow('% CMV Mapeado', data.months.map(m => safeGet(m, 'cogs.mappedPct')), true)}
    ${renderRow('CMV Estimado (não mapeado)', data.months.map(m => safeGet(m, 'cogs.unmapped')), false, true, true)}
    ${renderPercentRow('% CMV Estimado', data.months.map(m => safeGet(m, 'cogs.unmappedPct')), true)}
    ${renderRow('CMV Total (-)', data.months.map(m => safeGet(m, 'cogs.total')), true, true)}
    ${renderPercentRow('% CMV Total', data.months.map(m => safeGet(m, 'cogs.totalPct')))}
  `;

  // Verificar se há produtos não mapeados em algum mês
  const hasUnmappedProducts = data.months.some(m => safeGet(m, 'unmappedProducts.count', 0) > 0);

  let unmappedProductsHtml = '';
  if (hasUnmappedProducts) {
    unmappedProductsHtml = `
      ${renderSectionHeader('🔍 PRODUTOS NÃO MAPEADOS')}
      ${renderRow('Receita de Produtos Não Mapeados', data.months.map(m => safeGet(m, 'unmappedProducts.totalRevenue')))}
      ${renderRow('Quantidade de Produtos Não Mapeados', data.months.map(m => safeGet(m, 'unmappedProducts.count')))}
    `;
  }

  container.innerHTML = `
    <div class="dre-table">
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Descrição</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${renderSectionHeader('RECEITAS')}
          ${renderRow('Receita Bruta (+)', data.months.map(m => safeGet(m, 'grossRevenue')))}
          ${renderRow('Descontos', data.months.map(m => safeGet(m, 'discounts')))}
          ${renderPercentRow('% Descontos', data.months.map(m => safeGet(m, 'discountPct')))}
          ${renderRow('Receita Bruta (+) s/Descontos', data.months.map(m => safeGet(m, 'grossRevenueNoDiscount')), true)}
          ${renderPercentRow('% Impostos', data.months.map(m => safeGet(m, 'taxPct')))}
          ${taxBreakdownHtml}
          ${renderRow('Impostos (-)', data.months.map(m => safeGet(m, 'taxes')), false, true)}
          ${renderRow('Taxas Transações', data.months.map(m => safeGet(m, 'transactionFees')), false, true)}
          ${renderRow('Receita Líquida (+)', data.months.map(m => safeGet(m, 'netRevenue')), true)}

          ${renderSectionHeader('GASTOS VARIÁVEIS')}
          ${renderRow('Gastos Variáveis (-)', data.months.map(m => safeGet(m, 'variableCosts.total')), false, true)}
          ${renderPercentRow('% Gastos Variáveis (-)/ROL', data.months.map(m => safeGet(m, 'variableCosts.totalPct')))}

          ${renderSubsection('CMV')}
          ${cogsDetailsHtml}
          ${renderPercentRow('% CMV/ROB', data.months.map(m => safeGet(m, 'cogs.cogsPctROB')))}
          ${renderPercentRow('% CMV/ROL', data.months.map(m => safeGet(m, 'cogs.cogsPctROL')))}

          ${renderSubsection('Taxas Cartão e Ifood')}
          ${renderRow('Ifood', data.months.map(m => safeGet(m, 'variableCosts.deliveryFees')), false, true)}
          ${renderRow('Adquirência', data.months.map(m => safeGet(m, 'variableCosts.acquirerFees')), false, true)}

          ${renderSubsection('Despesas Franquia')}
          ${renderRow('Royalties', data.months.map(m => safeGet(m, 'variableCosts.royalties')), false, true)}
          ${renderRow('Fundo de Propaganda', data.months.map(m => safeGet(m, 'variableCosts.marketingFund')), false, true)}

          ${renderRow('Margem de Contribuição', data.months.map(m => safeGet(m, 'contributionMargin')), true)}
          ${renderPercentRow('% Margem de Contribuição', data.months.map(m => safeGet(m, 'contributionMarginPct')))}

          ${renderSectionHeader('GASTOS FIXOS')}
          ${renderRow('Gastos Fixos (-)', data.months.map(m => safeGet(m, 'fixedCosts.total')), false, true)}
          ${renderPercentRow('% Gastos Fixos (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.totalPct')))}

          ${renderSubsection('Ocupação')}
          ${renderRow('Ocupação (-)', data.months.map(m => safeGet(m, 'fixedCosts.occupation.total')), false, true)}
          ${renderPercentRow('% Ocupação (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.occupation.totalPct')))}
          ${renderRow('Aluguel', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.rent')), false, true, true)}
          ${renderRow('Condomínio', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.condo')), false, true, true)}
          ${renderRow('Fundo Promoção Shopping', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.shoppingPromo')), false, true, true)}
          ${renderRow('IPTU', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.propertyTax')), false, true, true)}
          ${renderRow('Água', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.water')), false, true, true)}
          ${renderRow('Energia', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.electricity')), false, true, true)}
          ${renderRow('Ar condicionado', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.ac')), false, true, true)}
          ${renderRow('Gás', data.months.map(m => safeGet(m, 'fixedCosts.occupation.details.gas')), false, true, true)}

          ${renderSubsection('Consumos e Utilidades')}
          ${renderRow('Consumos e utilidades (-)', data.months.map(m => safeGet(m, 'fixedCosts.utilities.total')), false, true)}
          ${renderPercentRow('% Consumos e utilidades (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.utilities.totalPct')))}
          ${renderRow('Internet', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.internet')), false, true, true)}
          ${renderRow('Limpeza e Conservação', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.cleaning')), false, true, true)}
          ${renderRow('Manutenção', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.maintenance')), false, true, true)}
          ${renderRow('Materiais de escritório', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.officeSupplies')), false, true, true)}
          ${renderRow('Equipamentos e utensílios', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.equipmentUtensils')), false, true, true)}
          ${renderRow('Aluguel Equipamentos', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.equipmentRental')), false, true, true)}
          ${renderRow('Telefone', data.months.map(m => safeGet(m, 'fixedCosts.utilities.details.phone')), false, true, true)}

          ${renderSubsection('Gastos Administrativos')}
          ${renderRow('Gastos Administrativos (-)', data.months.map(m => safeGet(m, 'fixedCosts.admin.total')), false, true)}
          ${renderPercentRow('% Gastos Administrativos (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.admin.totalPct')))}
          ${renderRow('Software', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.software')), false, true, true)}
          ${renderRow('Contador', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.accounting')), false, true, true)}
          ${renderRow('Seguro do imóvel', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.insurance')), false, true, true)}
          ${renderRow('Assessoria Jurídica', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.legal')), false, true, true)}
          ${renderRow('Tarifas Bancárias', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.bankFee')), false, true, true)}
          ${renderRow('Gastos Adm. - Outros', data.months.map(m => safeGet(m, 'fixedCosts.admin.details.other')), false, true, true)}

          ${renderSubsection('Recursos Humanos')}
          ${renderRow('Recursos Humanos (-)', data.months.map(m => safeGet(m, 'fixedCosts.hr.total')), false, true)}
          ${renderPercentRow('% Recursos Humanos (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.hr.totalPct')))}
          ${renderRow('Salários', data.months.map(m => safeGet(m, 'fixedCosts.hr.details.salary')), false, true, true)}
          ${renderRow('Encargos Trabalhistas', data.months.map(m => safeGet(m, 'fixedCosts.hr.details.laborCharges')), false, true, true)}
          ${renderRow('Benefícios', data.months.map(m => safeGet(m, 'fixedCosts.hr.details.benefits')), false, true, true)}
          ${renderRow('Treinamento', data.months.map(m => safeGet(m, 'fixedCosts.hr.details.training')), false, true, true)}

          ${renderSubsection('Marketing')}
          ${renderRow('Marketing (-)', data.months.map(m => safeGet(m, 'fixedCosts.marketing.total')), false, true)}
          ${renderPercentRow('% Marketing (-)/ROL', data.months.map(m => safeGet(m, 'fixedCosts.marketing.totalPct')))}
          ${renderRow('Marketing', data.months.map(m => safeGet(m, 'fixedCosts.marketing.details.marketing')), false, true, true)}
          ${renderRow('Publicidade', data.months.map(m => safeGet(m, 'fixedCosts.marketing.details.advertising')), false, true, true)}

          ${unmappedProductsHtml}

          ${renderSectionHeader('RESULTADO')}
          ${renderRow('Lucro Líquido', data.months.map(m => safeGet(m, 'netProfit')), true)}
          ${renderPercentRow('% Lucro Líquido', data.months.map(m => safeGet(m, 'netProfitPct')))}
          ${renderRow('Taxa de Transferência (-)', data.months.map(m => safeGet(m, 'transferFee')), false, true)}
          ${renderRow('Lucro Geral', data.months.map(m => safeGet(m, 'profitAfterTransfer')), true)}
          ${renderPercentRow('% Lucro Geral', data.months.map(m => safeGet(m, 'profitAfterTransferPct')))}
          ${renderRow('PLR (-)', data.months.map(m => safeGet(m, 'plr')), false, true)}
          ${renderRow('Lucro Final', data.months.map(m => safeGet(m, 'finalProfit')), true)}
          ${renderRow('% Lucro Final', data.months.map(m => safeGet(m, 'finalProfitPct')))}
        </tbody>
      </table>
    </div>
  `;
}
// ========== ALTERNAR MODO DE VISUALIZAÇÃO ==========
function toggleViewMode() {
  const momCheckbox = document.getElementById('momMode');
  const singleMonthFilters = document.getElementById('singleMonthFilters');
  const momFilters = document.getElementById('momFilters');

  if (!momCheckbox || !singleMonthFilters || !momFilters) {
    console.error('Elementos de controle não encontrados!');
    return;
  }

  if (momCheckbox.checked) {
    singleMonthFilters.classList.add('hidden');
    momFilters.classList.remove('hidden');
  } else {
    singleMonthFilters.classList.remove('hidden');
    momFilters.classList.add('hidden');
  }

  document.getElementById('dreContent').innerHTML = '<div class="loading">Selecione o período e clique em "Carregar"</div>';
}

// ========== CARREGAR DRE BASEADO NO MODO ==========
function loadDreBasedOnMode() {
  const momCheckbox = document.getElementById('momMode');

  if (!momCheckbox) {
    console.error('Checkbox momMode não encontrado!');
    return;
  }

  if (momCheckbox.checked) {
    loadDreMoM();
  } else {
    loadDre();
  }
}

// ========== POPULAR SELETORES DE ANO E MÊS ==========
function populateSelectors() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const yearSelects = ['yearSelect', 'startYearSelect', 'endYearSelect'];
  yearSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '';
      for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        select.appendChild(option);
      }
    }
  });

  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    monthSelect.value = currentMonth;
  }

  const startMonthSelect = document.getElementById('startMonthSelect');
  if (startMonthSelect) {
    startMonthSelect.value = currentMonth;
  }

  const endMonthSelect = document.getElementById('endMonthSelect');
  if (endMonthSelect) {
    endMonthSelect.value = currentMonth;
  }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  populateSelectors();
  
  const momCheckbox = document.getElementById('momMode');
  if (momCheckbox) {
    momCheckbox.addEventListener('change', toggleViewMode);
  }

  const loadButton = document.getElementById('loadBtn');
  if (loadButton) {
    loadButton.addEventListener('click', loadDreBasedOnMode);
  }

  const btnRecalculateCMV = document.getElementById('btnRecalculateCMV');
  if (btnRecalculateCMV) {
    btnRecalculateCMV.addEventListener('click', recalculateCMV);
  }

  toggleViewMode();
});

// ========== RECALCULAR CMV ==========
async function recalculateCMV() {
  const auth = getAuth();
  if (!auth?.token) {
    await Swal.fire({ 
      icon: 'error', 
      title: 'Erro', 
      text: 'Você precisa estar logado!' 
    });
    return;
  }

  const momCheckbox = document.getElementById('momMode');
  
  // Se estiver no modo MoM, não permitir
  if (momCheckbox && momCheckbox.checked) {
    await Swal.fire({ 
      icon: 'warning', 
      title: 'Modo Não Suportado', 
      text: 'O recálculo de CMV só está disponível no modo de mês único. Desative o modo comparativo.' 
    });
    return;
  }

  const yearEl = document.getElementById('yearSelect');
  const monthEl = document.getElementById('monthSelect');

  if (!yearEl || !monthEl) {
    await Swal.fire({ 
      icon: 'error', 
      title: 'Erro', 
      text: 'Elementos de filtro não encontrados!' 
    });
    return;
  }

  const year = yearEl.value;
  const month = monthEl.value;

  if (!year || !month) {
    await Swal.fire({ 
      icon: 'warning', 
      title: 'Atenção', 
      text: 'Selecione ano e mês!' 
    });
    return;
  }

  // Confirmação
  const result = await Swal.fire({
    icon: 'question',
    title: 'Recalcular CMV?',
    html: `
      <p>Isso vai recalcular o CMV de <strong>todas as vendas</strong> de <strong>${month}/${year}</strong>.</p>
      <p style="color: #f59e0b; margin-top: 12px;">
        ⚠️ Este processo pode demorar alguns minutos dependendo do volume de vendas.
      </p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Sim, recalcular',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16a34a',
  });

  if (!result.isConfirmed) return;

  const franchiseId = getFranchiseId();
  const qsFranchise = franchiseId ? `&franchiseId=${franchiseId}` : '';

  try {
    // Loading
    Swal.fire({
      title: 'Recalculando CMV...',
      html: 'Processando vendas do período',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const url = `${API_BASE}/dashboard/recalculate-cmv?year=${year}&month=${month}${qsFranchise}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Erro ao recalcular CMV');
    }

    console.log('✅ CMV recalculado:', data);

    // Sucesso
    await Swal.fire({
      icon: 'success',
      title: 'CMV Recalculado!',
      html: `
        <div style="text-align: left; margin-top: 16px;">
          <p><strong>📊 Resumo:</strong></p>
          <ul style="list-style: none; padding-left: 0;">
            <li>✅ ${data.data.salesUpdated} vendas atualizadas</li>
            <li>✅ ${data.data.itemsUpdated} itens recalculados</li>
            <li>💰 Custo total: R$ ${data.data.totalCostRecalculated.toFixed(2)}</li>
            ${data.data.errors.length > 0 ? `<li style="color: #f59e0b;">⚠️ ${data.data.errors.length} erros</li>` : ''}
          </ul>
        </div>
      `,
      confirmButtonText: 'Recarregar DRE'
    });

    // Recarregar DRE automaticamente
    loadDre();
  } catch (error) {
    console.error('❌ Erro ao recalcular CMV:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Erro ao Recalcular',
      text: error.message || 'Não foi possível recalcular o CMV',
    });
  }
}

