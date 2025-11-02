const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth(){ 
  try{ 
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); 
  } catch { 
    return null; 
  } 
}

function qs(name){ 
  const u = new URL(location.href); 
  return u.searchParams.get(name); 
}

function fmtMoney(n){ 
  const x = Number(n || 0); 
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); 
}

let PRODUCTS_CACHE = [];

async function fetchProducts(token, q = '') {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('pageSize', '1000'); // ✅ Aumentar limite
  
  const r = await fetch(`${API}/products?${qs.toString()}`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data.items || data;
}

async function fetchRecipe(id, token){
  const r = await fetch(`${API}/recipes/${id}`, { 
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar receita');
  return data;
}

async function updateRecipe(id, body, token){
  const r = await fetch(`${API}/recipes/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao salvar');
  return data;
}

function ingRowTemplate(ing){
  const row = document.createElement('div');
  row.className = 'ing-row';

  row.innerHTML = `
    <div class="fld">
      <label>Tipo</label>
      <select data-field="type">
        <option value="INGREDIENT">Ingrediente</option>
        <option value="COMPLEMENT">Complemento</option>
        <option value="SEASONING">Tempero</option>
      </select>
    </div>
    <div class="fld prod-cell">
      <label>Produto</label>
      <input data-field="name" type="text" placeholder="Pesquisar produto (obrigatório)" required>
      <input data-field="productId" type="hidden"/>
      <div class="hints" style="display:none;"></div>
      <small class="error-msg" style="color:red; display:none;">⚠️ Selecione um produto da lista</small>
    </div>
    <div class="fld">
      <label>Unidade</label>
      <input data-field="unitOfMeasure" type="text" placeholder="Unidade" readonly>
    </div>
    <div class="fld">
      <label>Quantidade</label>
      <input data-field="quantity" type="number" min="0.0001" step="0.0001" required>
    </div>
    <div class="fld">
      <label>Perda (%)</label>
      <input data-field="wastagePercent" type="number" min="0" max="100" step="0.1" value="0">
    </div>
    <div class="fld">
      <label>Custo unit.</label>
      <input data-field="unitCost" type="number" min="0" step="0.0001" readonly>
    </div>
    <button class="remove" type="button" title="Remover">✕</button>
  `;

  // Preencher valores existentes
  row.querySelector('[data-field="type"]').value = ing?.type || 'INGREDIENT';
  
  const nameInput = row.querySelector('[data-field="name"]');
  const productIdInput = row.querySelector('[data-field="productId"]');
  const unitInput = row.querySelector('[data-field="unitOfMeasure"]');
  const costInput = row.querySelector('[data-field="unitCost"]');
  const hints = row.querySelector('.hints');
  const errorMsg = row.querySelector('.error-msg');

  // Se já tem produto vinculado
  if (ing?.productId) {
    nameInput.value = ing.product?.name || ing.name || '';
    productIdInput.value = ing.productId;
    unitInput.value = ing.unitOfMeasure || ing.product?.unitOfMeasure || '';
    costInput.value = ing.unitCost != null ? Number(ing.unitCost) : '';
    nameInput.style.borderColor = 'green';
  } else {
    nameInput.value = ing?.name || '';
  }

  row.querySelector('[data-field="quantity"]').value = ing?.quantity != null ? Number(ing.quantity) : '';
  row.querySelector('[data-field="wastagePercent"]').value = ing?.wastageFactor != null ? (Number(ing.wastageFactor) * 100) : 0;

  // ✅ Função para selecionar produto
  function selectProduct(p) {
    nameInput.value = p.name;
    productIdInput.value = String(p.id);
    unitInput.value = p.unitOfMeasure || 'un';
    costInput.value = p.currentCostPerUnit || 0;
    
    nameInput.style.borderColor = 'green';
    errorMsg.style.display = 'none';
    
    hints.style.display = 'none';
    hints.innerHTML = '';
    
    recalcTotals();
  }

  // ✅ Autocomplete de produtos
  nameInput.addEventListener('input', () => {
    const term = nameInput.value.trim().toLowerCase();
    
    // Limpar seleção anterior
    productIdInput.value = '';
    unitInput.value = '';
    costInput.value = '';
    errorMsg.style.display = 'none';
    nameInput.style.borderColor = '';
    
    hints.innerHTML = '';
    
    if (!term) {
      hints.style.display = 'none';
      return;
    }

    // Buscar produtos
    const list = PRODUCTS_CACHE.filter(p => 
      p.name.toLowerCase().includes(term)
    ).slice(0, 10);

    if (!list.length) {
      hints.style.display = 'none';
      errorMsg.textContent = '⚠️ Nenhum produto encontrado. Cadastre o produto primeiro.';
      errorMsg.style.display = 'block';
      nameInput.style.borderColor = 'red';
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
        e.preventDefault(); // Previne o blur
        selectProduct(p);
      });
      
      hints.appendChild(opt);
    });
    
    hints.style.display = 'block';
  });

  // ✅ Validar ao sair do campo (com delay maior)
  nameInput.addEventListener('blur', () => {
    setTimeout(() => {
      hints.style.display = 'none';
      
      if (!productIdInput.value && nameInput.value.trim()) {
        errorMsg.textContent = '⚠️ Selecione um produto da lista';
        errorMsg.style.display = 'block';
        nameInput.style.borderColor = 'red';
      }
    }, 300); // ✅ Aumentado de 200 para 300ms
  });

  // ✅ Ao focar novamente, mostrar sugestões se houver texto
  nameInput.addEventListener('focus', () => {
    if (nameInput.value.trim() && !productIdInput.value) {
      nameInput.dispatchEvent(new Event('input'));
    }
  });

  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    recalcTotals();
  });

  row.querySelectorAll('input, select').forEach(inp => {
    inp.addEventListener('input', recalcTotals);
  });

  return row;
}

function readIngredients(){
  const rows = Array.from(document.querySelectorAll('#ingList .ing-row'));
  return rows.map(r => {
    const type = r.querySelector('[data-field="type"]').value || 'INGREDIENT';
    const productIdRaw = r.querySelector('[data-field="productId"]').value.trim();
    const unitOfMeasure = r.querySelector('[data-field="unitOfMeasure"]').value.trim();
    const quantity = Number(r.querySelector('[data-field="quantity"]').value || 0);
    const wastagePercent = Number(r.querySelector('[data-field="wastagePercent"]').value || 0);
    const unitCostRaw = r.querySelector('[data-field="unitCost"]').value.trim();

    return {
      type,
      productId: productIdRaw ? Number(productIdRaw) : null,
      name: null, // ✅ Sempre null porque agora sempre tem productId
      unitOfMeasure,
      quantity,
      conversionFactor: null,
      wastageFactor: Math.max(0, Math.min(1, wastagePercent / 100)),
      unitCost: unitCostRaw ? Number(unitCostRaw) : null,
      notes: null,
    };
  });
}

function recalcTotals(){
  const ings = readIngredients();
  let total = 0;
  
  ings.forEach(i => {
    const unitCost = Number(i.unitCost || 0);
    total += unitCost * i.quantity * (1 + (i.wastageFactor || 0));
  });

  const yq = Number(document.getElementById('yieldQuantity').value || 0);
  document.getElementById('costTotal').textContent = total ? `R$ ${fmtMoney(total)}` : '—';
  document.getElementById('costPerPortion').textContent = (total && yq) ? `R$ ${fmtMoney(total / yq)}` : '—';
}

function renderImagePreview(imageUrl, recipeId, authToken) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  
  if (imageUrl) {
    preview.innerHTML = `
      <img src="${imageUrl}" alt="Preview" style="max-width: 300px; border-radius: 8px;">
      <button type="button" id="btnRemoveImage" class="btn-secondary" style="margin-top: 10px;">
        Remover Imagem
      </button>
    `;
    
    document.getElementById('btnRemoveImage')?.addEventListener('click', async () => {
      if (!confirm('Deseja remover a imagem?')) return;
      
      try {
        const r = await fetch(`${API}/recipes/${recipeId}/image`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.message || 'Erro ao remover imagem');
        }
        
        renderImagePreview(null, recipeId, authToken);
        await Swal.fire({ icon: 'success', title: 'Imagem removida!' });
      } catch (err) {
        await Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
      }
    });
  } else {
    preview.innerHTML = `
      <input type="file" id="imageInput" accept="image/*" style="display: none;">
      <button type="button" id="btnSelectImage" class="btn-secondary">
        Selecionar Imagem
      </button>
    `;
    
    document.getElementById('btnSelectImage')?.addEventListener('click', () => {
      document.getElementById('imageInput')?.click();
    });
    
    document.getElementById('imageInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        await Swal.fire({ icon: 'error', title: 'Erro', text: 'Imagem muito grande! Máximo 5MB.' });
        return;
      }
      
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const r = await fetch(`${API}/recipes/${recipeId}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        });
        
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Erro ao enviar imagem');
        
        renderImagePreview(data.imageUrl, recipeId, authToken);
        await Swal.fire({ icon: 'success', title: 'Imagem enviada!' });
      } catch (err) {
        await Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
      }
    });
  }
}

function fillForm(recipe, recipeId, authToken){
  document.getElementById('name').value = recipe.name || '';
  document.getElementById('category').value = recipe.category || '';
  document.getElementById('yieldQuantity').value = recipe.yieldQuantity != null ? Number(recipe.yieldQuantity) : '';
  document.getElementById('yieldUnit').value = recipe.yieldUnit || '';
  document.getElementById('preparationTimeMinutes').value = recipe.preparationTimeMinutes != null ? Number(recipe.preparationTimeMinutes) : '';
  document.getElementById('description').value = recipe.description || '';
  document.getElementById('instructions').value = recipe.instructions || '';

  const wrap = document.getElementById('ingList');
  wrap.innerHTML = '';
  (recipe.recipeIngredients || []).forEach(ing => {
    wrap.appendChild(ingRowTemplate(ing));
  });

  recalcTotals();
  renderImagePreview(recipe.imageUrl, recipeId, authToken);
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth(); 
  if (!auth?.token) { 
    location.href = '../../../login/index.html'; 
    return; 
  }

  console.log('👤 Usuário logado:', {
    userId: auth.user?.id,
    franchiseId: auth.user?.franchiseId,
    role: auth.user?.role,
  });
  
  const id = qs('id'); 
  if (!id) { 
    location.href = '../index/index.html'; 
    return; 
  }

  // ✅ Carregar produtos
  try {
    PRODUCTS_CACHE = await fetchProducts(auth.token);
    console.log(`✅ ${PRODUCTS_CACHE.length} produtos carregados`);
  } catch (e) {
    console.warn('Falha ao carregar produtos', e);
  }

  // Carregar receita
  try {
    const recipe = await fetchRecipe(id, auth.token);
    fillForm(recipe, id, auth.token);
  } catch (err) {
    await Swal.fire({ 
      icon: 'error', 
      title: 'Erro', 
      text: err.message || 'Falha ao carregar', 
      confirmButtonText: 'Ok' 
    });
    location.href = '../index/index.html';
    return;
  }

  // Adicionar ingrediente
  document.getElementById('btnAddIng').addEventListener('click', () => {
    document.getElementById('ingList').appendChild(ingRowTemplate({}));
    recalcTotals();
  });

  // Salvar
  document.getElementById('btnSave').addEventListener('click', async () => {
    const body = {
      name: document.getElementById('name').value.trim(),
      category: document.getElementById('category').value.trim() || null,
      yieldQuantity: document.getElementById('yieldQuantity').value ? Number(document.getElementById('yieldQuantity').value) : null,
      yieldUnit: document.getElementById('yieldUnit').value.trim() || null,
      preparationTimeMinutes: document.getElementById('preparationTimeMinutes').value ? Number(document.getElementById('preparationTimeMinutes').value) : null,
      description: document.getElementById('description').value.trim() || null,
      instructions: document.getElementById('instructions').value.trim() || null,
      ingredients: readIngredients(),
    };

    if (!body.name) {
      await Swal.fire({ 
        icon: 'warning', 
        title: 'Atenção', 
        text: 'Informe o nome da receita.' 
      });
      return;
    }

    // ✅ Validar ingredientes
    for (let i = 0; i < body.ingredients.length; i++) {
      const ing = body.ingredients[i];
      if (!ing.productId) {
        await Swal.fire({ 
          icon: 'error', 
          title: 'Erro', 
          text: `Ingrediente ${i + 1}: Selecione um produto da lista` 
        });
        return;
      }
      if (!ing.quantity || ing.quantity <= 0) {
        await Swal.fire({ 
          icon: 'error', 
          title: 'Erro', 
          text: `Ingrediente ${i + 1}: Quantidade deve ser maior que zero` 
        });
        return;
      }
    }

    try {
      await updateRecipe(id, body, auth.token);
      await Swal.fire({ 
        icon: 'success', 
        title: 'Salvo', 
        text: 'Receita atualizada com sucesso!' 
      });
      window.location.href = `../detail/index.html?id=${id}`;
    } catch (err) {
      await Swal.fire({ 
        icon: 'error', 
        title: 'Erro ao salvar', 
        text: err.message || 'Falha ao salvar' 
      });
    }
  });

  // Recalcular custos
  ['yieldQuantity'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) el.addEventListener('input', recalcTotals);
  });
});