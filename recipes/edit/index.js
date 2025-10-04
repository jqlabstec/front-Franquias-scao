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
  // ing pode ter productId ou nome livre
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

  // preencher valores
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

  // Recalcular quando mudar algo
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
      quantity, // já convertido: ex. 0.4 se quiser 400g quando produto é kg
      conversionFactor: null, // não vamos usar agora
      wastageFactor: Math.max(0, Math.min(1, wastagePercent/100)),
      unitCost: unitCostRaw ? Number(unitCostRaw) : null,
      notes: null,
    };
  });
}

function recalcTotals(){
  const ings = readIngredients();
  // Como não temos o custo do produto no front, só conseguimos estimar se unitCost foi preenchido.
  // Caso unitCost esteja vazio, subtotal estimado será 0 aqui — o back calculará corretamente.
  let total = 0;
  ings.forEach(i => {
    const unitCost = Number(i.unitCost || 0);
    total += unitCost * i.quantity * (1 + (i.wastageFactor || 0));
  });

  const yq = Number(document.getElementById('yieldQuantity').value || 0);
  document.getElementById('costTotal').textContent = total ? `R$ ${fmtMoney(total)}` : '—';
  document.getElementById('costPerPortion').textContent = (total && yq) ? `R$ ${fmtMoney(total / yq)}` : '—';
}

function fillForm(recipe){
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
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }
  const id = qs('id'); if(!id){ location.href='../index/index.html'; return; }

  // Carregar receita
  try{
    const recipe = await fetchRecipe(id, auth.token);
    fillForm(recipe);
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
  ['yieldQuantity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcTotals);
  });
});