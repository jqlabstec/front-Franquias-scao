const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch {
    return null;
  }
}

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

let PRODUCTS_CACHE = [];

async function fetchProducts(token, q = '') {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('pageSize', '1000');
  
  const r = await fetch(`${API}/products?${qs.toString()}`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data.items || data;
}

function ingRowTemplate() {
  const row = document.createElement('div');
  row.className = 'ing-row';
  row.innerHTML = `
    <select class="type">
      <option value="INGREDIENT">Ingrediente</option>
      <option value="COMPLEMENT">Complemento</option>
      <option value="SEASONING">Tempero</option>
    </select>
    <div class="prod-cell">
      <input class="product" type="text" placeholder="Pesquisar produto (obrigatório)" required/>
      <div class="hints" style="display:none;"></div>
      <small class="error-msg" style="color:red; display:none;">⚠️ Selecione um produto da lista</small>
    </div>
    <input class="unitOfMeasure" type="text" placeholder="Unidade" readonly/>
    <input class="quantity" type="number" min="0.0001" step="0.0001" placeholder="Qtde" required/>
    <input class="wastageFactor" type="number" min="0" step="0.0001" placeholder="Perda (ex.: 0.05)" value="0"/>
    <input class="unitCost" type="number" min="0" step="0.0001" placeholder="Custo unit. (auto)" readonly/>
    <button class="remove" type="button">✕</button>
  `;
  return row;
}

function addIngRow() {
  const container = document.getElementById('ingredients');
  const row = ingRowTemplate();
  container.appendChild(row);

  const input = row.querySelector('.product');
  const unitEl = row.querySelector('.unitOfMeasure');
  const costEl = row.querySelector('.unitCost');
  const hints = row.querySelector('.hints');
  const errorMsg = row.querySelector('.error-msg');

  // ✅ Função para selecionar produto
  function selectProduct(p) {
    input.value = p.name;
    input.dataset.productId = String(p.id);
    unitEl.value = p.unitOfMeasure || 'un';
    costEl.value = p.currentCostPerUnit || 0;
    
    input.style.borderColor = 'green';
    errorMsg.style.display = 'none';
    
    hints.style.display = 'none';
    hints.innerHTML = '';
    
    recalcTotals();
  }

  // ✅ Autocomplete ao digitar
  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    
    // Limpar dados anteriores
    input.dataset.productId = '';
    unitEl.value = '';
    costEl.value = '';
    errorMsg.style.display = 'none';
    input.style.borderColor = '';
    
    hints.innerHTML = '';
    
    if (!term) {
      hints.style.display = 'none';
      return;
    }

    // Buscar produtos que correspondem
    const list = PRODUCTS_CACHE.filter(p => 
      p.name.toLowerCase().includes(term)
    ).slice(0, 10);

    if (!list.length) {
      hints.style.display = 'none';
      errorMsg.textContent = '⚠️ Nenhum produto encontrado. Cadastre o produto primeiro.';
      errorMsg.style.display = 'block';
      input.style.borderColor = 'red';
      return;
    }

    // Mostrar sugestões
    list.forEach(p => {
      const opt = document.createElement('div');
      opt.textContent = `${p.name} (${p.unitOfMeasure || 'un'}) - Custo: R$ ${fmtMoney(p.currentCostPerUnit || 0)}`;
      opt.style.cursor = 'pointer';
      opt.style.padding = '8px';
      opt.style.borderBottom = '1px solid #eee';
      
      opt.addEventListener('mouseenter', () => {
        opt.style.backgroundColor = '#f0f0f0';
      });
      
      opt.addEventListener('mouseleave', () => {
        opt.style.backgroundColor = 'white';
      });
      
      // ✅ CORREÇÃO: usar mousedown ao invés de click
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Previne o blur do input
        selectProduct(p);
      });
      
      hints.appendChild(opt);
    });
    
    hints.style.display = 'block';
  });

  // ✅ Validar ao sair do campo (com delay maior)
  input.addEventListener('blur', () => {
    setTimeout(() => {
      hints.style.display = 'none';
      
      // Se não selecionou nenhum produto
      if (!input.dataset.productId && input.value.trim()) {
        errorMsg.textContent = '⚠️ Selecione um produto da lista';
        errorMsg.style.display = 'block';
        input.style.borderColor = 'red';
      }
    }, 300); // ✅ Aumentado de 200 para 300ms
  });

  // ✅ Ao focar novamente, mostrar sugestões se houver texto
  input.addEventListener('focus', () => {
    if (input.value.trim() && !input.dataset.productId) {
      input.dispatchEvent(new Event('input'));
    }
  });

  // ✅ Remover ingrediente com confirmação
  row.querySelector('.remove').addEventListener('click', async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Remover Ingrediente?',
      text: 'Esta ação não pode ser desfeita',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      row.remove();
      recalcTotals();
    }
  });

  ['quantity', 'wastageFactor'].forEach(cls => {
    row.querySelector('.' + cls).addEventListener('input', recalcTotals);
  });
}

function collectForm() {
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value.trim() || undefined;
  const description = document.getElementById('description').value.trim() || undefined;
  const tags = (document.getElementById('tags').value || '').split(',').map(s => s.trim()).filter(Boolean);
  const yieldQuantity = document.getElementById('yieldQuantity').value ? Number(document.getElementById('yieldQuantity').value) : undefined;
  const yieldUnit = document.getElementById('yieldUnit').value.trim() || undefined;
  const preparationTimeMinutes = document.getElementById('preparationTimeMinutes').value ? Number(document.getElementById('preparationTimeMinutes').value) : undefined;
  const servingSize = document.getElementById('servingSize').value.trim() || undefined;
  const instructions = document.getElementById('instructions').value.trim() || undefined;

  const ingredients = Array.from(document.querySelectorAll('#ingredients .ing-row')).map(row => {
    const productInput = row.querySelector('.product');
    const productId = productInput.dataset.productId ? Number(productInput.dataset.productId) : undefined;
    
    return {
      type: row.querySelector('.type').value,
      productId,
      unitOfMeasure: row.querySelector('.unitOfMeasure').value.trim(),
      quantity: Number(row.querySelector('.quantity').value || 0),
      wastageFactor: row.querySelector('.wastageFactor').value ? Number(row.querySelector('.wastageFactor').value) : 0,
      unitCost: row.querySelector('.unitCost').value ? Number(row.querySelector('.unitCost').value) : undefined,
    };
  });

  return {
    name, description, category, tags,
    yieldQuantity, yieldUnit,
    preparationTimeMinutes, servingSize, instructions,
    ingredients,
  };
}

function recalcTotals() {
  const form = collectForm();
  let total = 0;
  
  for (const i of form.ingredients) {
    const unitCost = typeof i.unitCost === 'number' ? i.unitCost : 0;
    const qtyWithLoss = (i.quantity || 0) * (1 + (i.wastageFactor || 0));
    total += unitCost * qtyWithLoss;
  }
  
  document.getElementById('costTotal').textContent = fmtMoney(total);
  const per = form.yieldQuantity ? total / form.yieldQuantity : null;
  document.getElementById('costPerPortion').textContent = per != null ? fmtMoney(per) : '—';
}

async function createRecipe(payload, token) {
  const r = await fetch(`${API}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao criar receita');
  return data;
}

async function uploadRecipeImage(recipeId, imageFile, token) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const r = await fetch(`${API}/recipes/${recipeId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao enviar imagem');
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../../login/index.html';
    return;
  }

  // ✅ Loading inicial
  Swal.fire({
    title: 'Carregando...',
    html: 'Buscando produtos disponíveis',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    PRODUCTS_CACHE = await fetchProducts(auth.token);
    console.log(`✅ ${PRODUCTS_CACHE.length} produtos carregados`);
    
    // ✅ Fechar loading
    Swal.close();
  } catch (e) {
    console.warn('Falha ao carregar produtos', e);
    await Swal.fire({ 
      icon: 'warning', 
      title: 'Aviso', 
      text: 'Não foi possível carregar os produtos. Cadastre produtos antes de criar receitas.',
      confirmButtonText: 'Ok' 
    });
  }

  document.getElementById('btnAddIngredient').addEventListener('click', () => { addIngRow(); });
  addIngRow();

  document.getElementById('formRecipe').addEventListener('input', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.ing-row') || target.id === 'yieldQuantity') {
      recalcTotals();
    }
  });

  document.getElementById('formRecipe').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const payload = collectForm();

      // ✅ Validações
      if (!payload.name) {
        await Swal.fire({ 
          icon: 'warning', 
          title: 'Nome Obrigatório', 
          text: 'Informe o nome da receita' 
        });
        return;
      }

      if (!payload.ingredients?.length) {
        await Swal.fire({ 
          icon: 'warning', 
          title: 'Ingredientes Obrigatórios', 
          text: 'Inclua ao menos um ingrediente' 
        });
        return;
      }
      
      // ✅ Validar se todos os ingredientes têm productId
      for (let i = 0; i < payload.ingredients.length; i++) {
        const ing = payload.ingredients[i];
        
        if (!ing.productId) {
          await Swal.fire({ 
            icon: 'error', 
            title: 'Produto Não Selecionado', 
            text: `Ingrediente ${i + 1}: Selecione um produto da lista` 
          });
          return;
        }
        
        if (!ing.unitOfMeasure) {
          await Swal.fire({ 
            icon: 'error', 
            title: 'Unidade Não Encontrada', 
            text: `Ingrediente ${i + 1}: Unidade de medida não encontrada` 
          });
          return;
        }
        
        if (!ing.quantity || ing.quantity <= 0) {
          await Swal.fire({ 
            icon: 'error', 
            title: 'Quantidade Inválida', 
            text: `Ingrediente ${i + 1}: Quantidade deve ser maior que zero` 
          });
          return;
        }
      }

      // ✅ Loading ao salvar
      Swal.fire({
        title: 'Salvando...',
        html: 'Criando receita',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // Cria receita
      const created = await createRecipe(payload, auth.token);

      // Upload de imagem (se houver)
      const imageInput = document.getElementById('imageUrl');
      const imageFile = imageInput?.files?.[0] || null;
      
      if (imageFile) {
        Swal.update({
          html: 'Enviando imagem...'
        });
        
        await uploadRecipeImage(created.id, imageFile, auth.token);
      }

      // ✅ Sucesso
      await Swal.fire({ 
        icon: 'success', 
        title: 'Receita Criada!', 
        text: 'A receita foi criada com sucesso',
        confirmButtonText: 'Ver Receita'
      });
      
      location.href = `../detail/index.html?id=${created.id}`;
    } catch (err) {
      await Swal.fire({ 
        icon: 'error', 
        title: 'Erro ao Salvar', 
        text: err.message || 'Não foi possível salvar a receita', 
        confirmButtonText: 'Ok' 
      });
    }
  });
});