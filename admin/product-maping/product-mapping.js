const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

// ========== AUTH HELPERS ==========
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function requireAuth() {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login/index.html';
    return null;
  }
  return auth;
}

// ========== FORMAT HELPERS ==========
function fmtMoney(n) {
  return n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNumber(n, decimals = 0) {
  return n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ========== GLOBAL STATE ==========
let currentProducts = [];
let currentMappingProduct = null;
let selectedRecipe = null;

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 [DOMContentLoaded] Inicializando aplicação...');
  
  const auth = requireAuth();
  if (!auth) {
    console.log('❌ Usuário não autenticado, redirecionando...');
    return;
  }

  console.log('✅ Usuário autenticado:', { id: auth.userId, franchiseId: auth.franchiseId });

  loadUnmappedProducts();
  setupSearch();
  setupRecipeSearch();

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    console.log('🔄 Botão refresh clicado');
    loadUnmappedProducts();
  });
});

// ========== CARREGAR PRODUTOS NÃO MAPEADOS ==========
async function loadUnmappedProducts() {
  console.log('📋 [loadUnmappedProducts] Iniciando...');
  
  const auth = requireAuth();
  if (!auth) {
    console.log('❌ Auth não disponível');
    return;
  }

  try {
    showLoading('Carregando produtos...');

    console.log('📡 Fazendo requisição para:', `${API}/retroactive-cmv/unmapped`);
    console.log('🔑 Token:', auth.token ? 'Presente' : 'Ausente');

    // ⭐ REMOVIDO franchiseId da URL - o backend pega do user autenticado
    const response = await fetch(`${API}/retroactive-cmv/unmapped`, {
      headers: { 
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok?', response.ok);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro na resposta:', error);
      throw new Error(error?.error || error?.message || 'Erro ao carregar produtos');
    }

    const data = await response.json();
    console.log('✅ Dados recebidos:', data);
    
    currentProducts = data.data || [];
    console.log('📊 Total de produtos:', currentProducts.length);

    renderProducts(currentProducts);
    updateStats(currentProducts);

    hideLoading();
  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error);
    hideLoading();
    alert('Erro ao carregar produtos: ' + error.message);
  }
}

// ========== RENDERIZAR PRODUTOS ==========
function renderProducts(products) {
  console.log('🎨 [renderProducts] Renderizando', products.length, 'produtos');
  
  const tbody = document.getElementById('tbody-products');

  if (!Array.isArray(products) || products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 8px;">
            Todos os produtos estão mapeados!
          </div>
          <div style="font-size: 14px; color: var(--muted);">
            Não há produtos descobertos pendentes de mapeamento.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td class="text-left">
        <div style="font-weight: 600; margin-bottom: 4px;">${product.name || 'Sem nome'}</div>
        ${product.timesFound > 10 ? '<span class="badge badge-warning">Alto Volume</span>' : ''}
      </td>
      <td><code style="font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${product.externalCode}</code></td>
      <td class="text-right">${fmtNumber(product.unmappedItemsCount || 0)}</td>
      <td class="text-right"><strong>${fmtMoney(product.unmappedRevenue || 0)}</strong></td>
      <td class="text-right">${fmtMoney(product.avgPrice || 0)}</td>
      <td class="text-center">
        <button class="btn-primary btn-small" onclick="openMappingModal('${product.externalCode}')">
          🔗 Mapear
        </button>
      </td>
    </tr>
  `).join('');
}

// ========== ATUALIZAR ESTATÍSTICAS ==========
function updateStats(products) {
  console.log('📊 [updateStats] Atualizando estatísticas');
  
  const totalProducts = products.length;
  const totalRevenue = products.reduce((sum, p) => sum + (p.unmappedRevenue || 0), 0);
  const totalItems = products.reduce((sum, p) => sum + (p.unmappedItemsCount || 0), 0);

  console.log('📈 Stats:', { totalProducts, totalRevenue, totalItems });

  document.getElementById('statTotal').textContent = fmtNumber(totalProducts);
  document.getElementById('statRevenue').textContent = fmtMoney(totalRevenue);
  document.getElementById('statItems').textContent = fmtNumber(totalItems);

  // Mostrar alerta se houver impacto significativo
  const alert = document.getElementById('impactAlert');
  const message = document.getElementById('alertMessage');

  if (totalRevenue > 1000) {
    message.textContent = `${fmtMoney(totalRevenue)} em vendas podem ter CMV incorreto. Recomendamos mapear esses produtos.`;
    alert.style.display = 'block';
  } else {
    alert.style.display = 'none';
  }
}

// ========== BUSCAR PRODUTOS (LOCAL) ==========
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    console.log('🔍 Buscando:', query);

    if (!query) {
      renderProducts(currentProducts);
      return;
    }

    const filtered = currentProducts.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.externalCode || '').toLowerCase().includes(query)
    );

    console.log('📊 Produtos filtrados:', filtered.length);
    renderProducts(filtered);
  });
}

// ========== ABRIR MODAL DE MAPEAMENTO ==========
function openMappingModal(externalCode) {
  console.log('🔗 [openMappingModal] Abrindo modal para:', externalCode);
  
  const product = currentProducts.find(p => p.externalCode === externalCode);
  if (!product) {
    console.error('❌ Produto não encontrado:', externalCode);
    return;
  }

  console.log('✅ Produto encontrado:', product);
  currentMappingProduct = product;
  selectedRecipe = null;

  // Preencher informações do produto
  document.getElementById('modalProductName').textContent = product.name || 'Sem nome';
  document.getElementById('modalProductCode').textContent = product.externalCode;
  document.getElementById('modalSalesCount').textContent = fmtNumber(product.unmappedItemsCount || 0);
  document.getElementById('modalRevenue').textContent = fmtMoney(product.unmappedRevenue || 0);

  // Resetar busca de receita
  document.getElementById('recipeSearch').value = '';
  document.getElementById('recipesList').innerHTML = '<div class="text-center muted">Digite para buscar receitas...</div>';
  document.getElementById('selectedRecipeInfo').style.display = 'none';
  document.getElementById('confirmMappingBtn').disabled = true;

  // Mostrar modal
  document.getElementById('mappingModal').classList.add('active');
}

// ========== FECHAR MODAL ==========
function closeMappingModal() {
  console.log('❌ [closeMappingModal] Fechando modal');
  document.getElementById('mappingModal').classList.remove('active');
}

// ========== BUSCAR RECEITAS ==========
function setupRecipeSearch() {
  const searchInput = document.getElementById('recipeSearch');
  let timeout = null;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    const query = e.target.value.trim();

    if (!query || query.length < 2) {
      document.getElementById('recipesList').innerHTML = '<div class="text-center muted">Digite pelo menos 2 caracteres...</div>';
      return;
    }

    timeout = setTimeout(() => {
      console.log('🔍 Buscando receitas para:', query);
      searchRecipes(query);
    }, 300);
  });
}

async function searchRecipes(query) {
  const auth = requireAuth();
  if (!auth) return;

  try {
    console.log('📡 Buscando receitas:', query);
    
    const response = await fetch(`${API}/recipes?franchiseId=${auth.franchiseId}&name=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error('Erro ao buscar receitas');
    }

    const data = await response.json();
    const recipes = data.data || [];

    console.log('✅ Receitas encontradas:', recipes.length);

    if (recipes.length === 0) {
      document.getElementById('recipesList').innerHTML = '<div class="text-center muted">Nenhuma receita encontrada</div>';
      return;
    }

    // Calcular match score
    const recipesWithScore = recipes.map(recipe => ({
      ...recipe,
      matchScore: calculateMatchScore(currentMappingProduct.name || '', recipe.name)
    })).sort((a, b) => b.matchScore - a.matchScore);

    console.log('📊 Receitas com score:', recipesWithScore.map(r => ({ name: r.name, score: r.matchScore })));

    renderRecipes(recipesWithScore);
  } catch (error) {
    console.error('❌ Erro ao buscar receitas:', error);
    document.getElementById('recipesList').innerHTML = `<div class="text-center" style="color: var(--danger);">Erro: ${error.message}</div>`;
  }
}

// ========== CALCULAR MATCH SCORE ==========
function calculateMatchScore(productName, recipeName) {
  const product = (productName || '').toLowerCase();
  const recipe = (recipeName || '').toLowerCase();

  // Match exato = 100%
  if (product === recipe) return 100;

  // Contar palavras em comum
  const productWords = product.split(/\s+/).filter(w => w.length > 2);
  const recipeWords = recipe.split(/\s+/).filter(w => w.length > 2);

  if (productWords.length === 0) return 0;

  let matches = 0;
  for (const word of productWords) {
    if (recipeWords.some(rw => rw.includes(word) || word.includes(rw))) {
      matches++;
    }
  }

  return Math.round((matches / productWords.length) * 100);
}

// ========== RENDERIZAR RECEITAS ==========
function renderRecipes(recipes) {
  const container = document.getElementById('recipesList');

  container.innerHTML = recipes.map(recipe => `
    <div class="recipe-item" onclick="selectRecipe(${recipe.id})">
      <div class="recipe-item-header">
        <span class="recipe-item-name">${recipe.name}</span>
        ${recipe.matchScore >= 70 ? `<span class="recipe-match">🔥 ${recipe.matchScore}% Match</span>` : ''}
      </div>
      <div class="recipe-item-meta">
        <span>📁 ${recipe.category || 'Sem categoria'}</span>
        <span>💰 CMV: ${fmtMoney(recipe.costTotal || 0)}</span>
      </div>
    </div>
  `).join('');
}

// ========== SELECIONAR RECEITA ==========
async function selectRecipe(recipeId) {
  console.log('✅ [selectRecipe] Selecionando receita:', recipeId);
  
  const auth = requireAuth();
  if (!auth) return;

  try {
    const response = await fetch(`${API}/recipes/${recipeId}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error('Erro ao carregar receita');
    }

    const data = await response.json();
    selectedRecipe = data.data;

    console.log('✅ Receita carregada:', selectedRecipe);

    // Marcar como selecionada
    document.querySelectorAll('.recipe-item').forEach(item => {
      item.classList.remove('selected');
    });
    event.target.closest('.recipe-item').classList.add('selected');

    // Mostrar informações
    document.getElementById('selectedRecipeName').textContent = selectedRecipe.name;
    document.getElementById('selectedRecipeCategory').textContent = selectedRecipe.category || 'Sem categoria';
    document.getElementById('selectedRecipeCost').textContent = fmtMoney(selectedRecipe.costTotal || 0);

    const avgPrice = currentMappingProduct.avgPrice || 0;
    const cost = selectedRecipe.costTotal || 0;
    const margin = avgPrice > 0 ? ((avgPrice - cost) / avgPrice * 100) : 0;
    document.getElementById('selectedRecipeMargin').textContent = `${fmtNumber(margin, 1)}%`;

    document.getElementById('selectedRecipeInfo').style.display = 'block';
    document.getElementById('confirmMappingBtn').disabled = false;

  } catch (error) {
    console.error('❌ Erro ao carregar receita:', error);
    alert('Erro ao carregar receita: ' + error.message);
  }
}

// ========== CONFIRMAR MAPEAMENTO ==========
async function confirmMapping() {
  console.log('🔗 [confirmMapping] Iniciando mapeamento...');
  console.log('📋 Produto:', currentMappingProduct);
  console.log('📋 Receita:', selectedRecipe);
  
  if (!selectedRecipe || !currentMappingProduct) {
    console.error('❌ Dados incompletos');
    return;
  }

  const auth = requireAuth();
  if (!auth) return;

  if (!confirm(`Confirmar mapeamento de "${currentMappingProduct.name}" para "${selectedRecipe.name}"?\n\nIsso irá:\n- Vincular o produto à receita\n- Recalcular CMV de vendas passadas\n- Dar baixa retroativa no estoque`)) {
    console.log('⚠️ Mapeamento cancelado pelo usuário');
    return;
  }

  try {
    showLoading('Mapeando produto e recalculando CMV...');

    console.log('📡 Enviando requisição...');
    console.log('📋 Endpoint:', `${API}/retroactive-cmv/link`);
    console.log('📋 Body:', {
      externalCode: currentMappingProduct.externalCode,
      recipeId: selectedRecipe.id
    });

    // ⭐ ENDPOINT CORRETO: /retroactive-cmv/link
    // ⭐ REMOVIDO franchiseId do body - o backend pega do user autenticado
    const response = await fetch(`${API}/retroactive-cmv/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        externalCode: currentMappingProduct.externalCode,
        recipeId: selectedRecipe.id
      })
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro na resposta:', error);
      throw new Error(error?.error || error?.message || 'Erro ao mapear produto');
    }

    const result = await response.json();
    console.log('✅ Resultado:', result);

    hideLoading();
    closeMappingModal();
    showResultModal(result.result || result.data || result);

    // Recarregar lista após 2 segundos
    setTimeout(() => {
      console.log('🔄 Recarregando produtos...');
      loadUnmappedProducts();
    }, 2000);

  } catch (error) {
    console.error('❌ Erro ao mapear produto:', error);
    hideLoading();
    alert('Erro ao mapear produto: ' + error.message);
  }
}

// ========== MOSTRAR RESULTADO ==========
function showResultModal(data) {
  console.log('📊 [showResultModal] Mostrando resultado:', data);
  
  const statsHTML = `
    <div class="result-stat">
      <div class="result-stat-value">${fmtNumber(data.itemsUpdated || 0)}</div>
      <div class="result-stat-label">Itens Atualizados</div>
    </div>
    <div class="result-stat">
      <div class="result-stat-value">${fmtNumber(data.salesUpdated || 0)}</div>
      <div class="result-stat-label">Vendas Recalculadas</div>
    </div>
    <div class="result-stat">
      <div class="result-stat-value">${fmtNumber(data.inventoryMovements || 0)}</div>
      <div class="result-stat-label">Movimentações de Estoque</div>
    </div>
    <div class="result-stat">
      <div class="result-stat-value">${fmtMoney(data.totalCostRecalculated || 0)}</div>
      <div class="result-stat-label">CMV Recalculado</div>
    </div>
  `;

  // Mostrar erros se houver
  if (data.errors && data.errors.length > 0) {
    const errorsHTML = `
      <div style="margin-top: 20px; padding: 12px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 6px;">
        <strong style="color: #991b1b;">⚠️ Avisos:</strong>
        <ul style="margin: 8px 0 0 20px; color: #991b1b;">
          ${data.errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
      </div>
    `;
    document.getElementById('resultStats').innerHTML = statsHTML + errorsHTML;
  } else {
    document.getElementById('resultStats').innerHTML = statsHTML;
  }

  document.getElementById('resultModal').classList.add('active');
}

function closeResultModal() {
  console.log('❌ [closeResultModal] Fechando modal de resultado');
  document.getElementById('resultModal').classList.remove('active');
}

// ========== LOADING ==========
function showLoading(message = 'Processando...') {
  console.log('⏳ Mostrando loading:', message);
  document.getElementById('loadingMessage').textContent = message;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  console.log('✅ Escondendo loading');
  document.getElementById('loadingOverlay').style.display = 'none';
}