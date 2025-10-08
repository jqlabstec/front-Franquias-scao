const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function qs(name){ const u=new URL(location.href); return u.searchParams.get(name); }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2}); }

async function fetchRecipe(id, token){
  const r = await fetch(`${API}/recipes/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar receita');
  return data;
}

async function updateRecipe(id, body, token){
  const r = await fetch(`${API}/recipes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao salvar');
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
    <div class="fld">
      <label>Produto / Nome livre</label>
      <input data-field="name" type="text" placeholder="Ex.: Morango congelado">
      <input data-field="productId" type="hidden" placeholder="ID do produto (opcional)"/>
    </div>
    <div class="fld">
      <label>Unidade</label>
      <input data-field="unitOfMeasure" type="text" placeholder="ex.: kg, g, L, ml">
    </div>
    <div class="fld">
      <label>Quantidade</label>
      <input data-field="quantity" type="number" min="0" step="0.0001">
    </div>
    <div class="fld">
      <label>Perda (%)</label>
      <input data-field="wastagePercent" type="number" min="0" max="100" step="0.1" value="0">
    </div>
    <div class="fld">
      <label>Custo unit. (opcional)</label>
      <input data-field="unitCost" type="number" min="0" step="0.0001">
    </div>
    <button class="remove" type="button" title="Remover">✕</button>
  `;

  row.querySelector('[data-field="type"]').value = ing?.type || 'INGREDIENT';
  row.querySelector('[data-field="name"]').value = ing?.product?.name || ing?.name || '';
  row.querySelector('[data-field="productId"]').value = ing?.productId || '';
  row.querySelector('[data-field="unitOfMeasure"]').value = ing?.unitOfMeasure || ing?.product?.unitOfMeasure || '';
  row.querySelector('[data-field="quantity"]').value = ing?.quantity != null ? Number(ing.quantity) : '';
  row.querySelector('[data-field="wastagePercent"]').value = ing?.wastageFactor != null ? (Number(ing.wastageFactor) * 100) : 0;
  row.querySelector('[data-field="unitCost"]').value = ing?.unitCost != null ? Number(ing.unitCost) : '';

  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    recalcTotals();
  });

  row.querySelectorAll('input,select').forEach(inp => {
    inp.addEventListener('input', recalcTotals);
  });

  return row;
}

function readIngredients(){
  const rows = Array.from(document.querySelectorAll('#ingList .ing-row'));
  return rows.map(r => {
    const type = r.querySelector('[data-field="type"]').value || 'INGREDIENT';
    const name = r.querySelector('[data-field="name"]').value.trim();
    const productIdRaw = r.querySelector('[data-field="productId"]').value.trim();
    const unitOfMeasure = r.querySelector('[data-field="unitOfMeasure"]').value.trim();
    const quantity = Number(r.querySelector('[data-field="quantity"]').value || 0);
    const wastagePercent = Number(r.querySelector('[data-field="wastagePercent"]').value || 0);
    const unitCostRaw = r.querySelector('[data-field="unitCost"]').value.trim();

    return {
      type,
      productId: productIdRaw ? Number(productIdRaw) : null,
      name: productIdRaw ? null : (name || null),
      unitOfMeasure,
      quantity,
      conversionFactor: null,
      wastageFactor: Math.max(0, Math.min(1, wastagePercent/100)),
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

// ✅ Corrigido: Recebe id e auth como parâmetros
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
      
      // Validar tamanho (5MB)
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

// ✅ Corrigido: Passa id e auth para renderImagePreview
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

  // ✅ Passa os parâmetros necessários
  renderImagePreview(recipe.imageUrl, recipeId, authToken);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); 
  if(!auth?.token){ 
    location.href='../../../login/index.html'; 
    return; 
  }
  
  const id = qs('id'); 
  if(!id){ 
    location.href='../index/index.html'; 
    return; 
  }

  // Carregar receita
  try{
    const recipe = await fetchRecipe(id, auth.token);
    fillForm(recipe, id, auth.token); // ✅ Passa id e token
  }catch(err){
    await Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao carregar', confirmButtonText:'Ok' });
    location.href = '../index/index.html';
    return;
  }

  // Adicionar ingrediente
  document.getElementById('btnAddIng').addEventListener('click', () => {
    document.getElementById('ingList').appendChild(ingRowTemplate({}));
    recalcTotals();
  });

  // Salvar
  document.getElementById('btnSave').addEventListener('click', async ()=>{
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
      await Swal.fire({ icon:'warning', title:'Atenção', text:'Informe o nome da receita.' });
      return;
    }

    try{
      await updateRecipe(id, body, auth.token);
      await Swal.fire({ icon:'success', title:'Salvo', text:'Receita atualizada com sucesso!' });
      window.location.href = `../detail/index.html?id=${id}`;
    }catch(err){
      await Swal.fire({ icon:'error', title:'Erro ao salvar', text: err.message || 'Falha ao salvar' });
    }
  });

  // Recalcular custos ao alterar campos que afetam custo por porção
  ['yieldQuantity'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) el.addEventListener('input', recalcTotals);
  });
});