const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2}); }

let PRODUCTS_CACHE = [];

async function fetchProducts(token, q=''){
  // ajuste o endpoint conforme o seu back (listagem de produtos)
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  const r = await fetch(`${API}/products?${qs.toString()}`, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar produtos');
  return data.items || data; // array: { id:number, name:string, unitOfMeasure?:string, lastCost?:number }
}

function ingRowTemplate(){
  const row = document.createElement('div');
  row.className = 'ing-row';
  row.innerHTML = `
    <select class="type">
      <option value="INGREDIENT">Ingrediente</option>
      <option value="COMPLEMENT">Complemento</option>
      <option value="SEASONING">Tempero</option>
    </select>
    <div class="prod-cell">
      <input class="product" type="text" placeholder="Pesquisar produto ou digitar nome livre"/>
      <div class="hints" style="display:none;"></div>
    </div>
    <input class="unitOfMeasure" type="text" placeholder="Unidade (ex.: kg, g, un)"/>
    <input class="quantity" type="number" min="0.0001" step="0.0001" placeholder="Qtde"/>
    <input class="wastageFactor" type="number" min="0" step="0.0001" placeholder="Perda (ex.: 0.05)"/>
    <input class="unitCost" type="number" min="0" step="0.0001" placeholder="Custo unit. (opcional)"/>
    <button class="remove" type="button">✕</button>
  `;
  return row;
}

function addIngRow(){
  const container = document.getElementById('ingredients');
  const row = ingRowTemplate();
  container.appendChild(row);

  const input = row.querySelector('.product');
  const unitEl = row.querySelector('.unitOfMeasure');
  const hints = row.querySelector('.hints');

  input.addEventListener('input', ()=>{
    const term = input.value.trim().toLowerCase();
    hints.innerHTML = '';
    if (!term) { hints.style.display='none'; input.dataset.productId=''; return; }
    const list = PRODUCTS_CACHE.filter(p => p.name.toLowerCase().includes(term)).slice(0,10);
    if (!list.length) { hints.style.display='none'; return; }
    list.forEach(p=>{
      const opt = document.createElement('div');
      opt.textContent = `${p.name} (${p.unitOfMeasure || 'un'})`;
      opt.addEventListener('click', ()=>{
        input.value = p.name;
        input.dataset.productId = String(p.id);
        unitEl.value = p.unitOfMeasure || unitEl.value || 'un';
        hints.style.display='none';
        hints.innerHTML = '';
        recalcTotals();
      });
      hints.appendChild(opt);
    });
    hints.style.display='block';
  });

  input.addEventListener('blur', ()=> setTimeout(()=> { hints.style.display='none'; hints.innerHTML=''; }, 200));
  row.querySelector('.remove').addEventListener('click', ()=> { row.remove(); recalcTotals(); });

  // recalc quando valores mudam
  ['unitOfMeasure','quantity','wastageFactor','unitCost'].forEach(cls=>{
    row.querySelector('.'+cls).addEventListener('input', recalcTotals);
  });
}

function collectForm(){
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value.trim() || undefined;
  const description = document.getElementById('description').value.trim() || undefined;
  const tags = (document.getElementById('tags').value || '').split(',').map(s=>s.trim()).filter(Boolean);
  const yieldQuantity = document.getElementById('yieldQuantity').value ? Number(document.getElementById('yieldQuantity').value) : undefined;
  const yieldUnit = document.getElementById('yieldUnit').value.trim() || undefined;
  const preparationTimeMinutes = document.getElementById('preparationTimeMinutes').value ? Number(document.getElementById('preparationTimeMinutes').value) : undefined;
  const servingSize = document.getElementById('servingSize').value.trim() || undefined;
  const instructions = document.getElementById('instructions').value.trim() || undefined;

  const ingredients = Array.from(document.querySelectorAll('#ingredients .ing-row')).map(row=>{
    const productInput = row.querySelector('.product');
    const productId = productInput.dataset.productId ? Number(productInput.dataset.productId) : undefined;
    const nameFree = !productId ? (productInput.value.trim() || undefined) : undefined;
    return {
      type: row.querySelector('.type').value,
      productId,
      name: nameFree,
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

function recalcTotals(){
  const form = collectForm();
  let total = 0;
  for (const i of form.ingredients){
    const unitCost = typeof i.unitCost === 'number' ? i.unitCost : 0; // se não informado, no back buscaremos do produto
    const qtyWithLoss = (i.quantity || 0) * (1 + (i.wastageFactor || 0));
    total += unitCost * qtyWithLoss;
  }
  document.getElementById('costTotal').textContent = fmtMoney(total);
  const per = form.yieldQuantity ? total / form.yieldQuantity : null;
  document.getElementById('costPerPortion').textContent = per != null ? fmtMoney(per) : '—';
}

async function createRecipe(payload, token){
  const r = await fetch(`${API}/recipes`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao criar receita');
  return data;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  // Carregar cache de produtos para autocomplete
  try{
    PRODUCTS_CACHE = await fetchProducts(auth.token);
  }catch(e){ console.warn('Falha ao carregar produtos', e); }

  document.getElementById('btnAddIngredient').addEventListener('click', ()=> { addIngRow(); });
  // começa com uma linha
  addIngRow();

document.getElementById('formRecipe').addEventListener('input', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  if (target.closest('.ing-row')) {
    recalcTotals();
  }

  if (target.id === 'yieldQuantity') {
    recalcTotals();
  }
});

  document.getElementById('formRecipe').addEventListener('submit', async (e)=>{
    e.preventDefault();
    try{
      const payload = collectForm();

      // validações mínimas
      if(!payload.name) throw new Error('Informe o nome da receita');
      if(!payload.ingredients?.length) throw new Error('Inclua ao menos um ingrediente');
      for (const ing of payload.ingredients){
        if (!ing.productId && !ing.name) throw new Error('Ingrediente sem produto deve informar um nome');
        if (!ing.unitOfMeasure) throw new Error('Informe a unidade do ingrediente');
        if (!ing.quantity || ing.quantity <= 0) throw new Error('Quantidade do ingrediente deve ser > 0');
      }

      const created = await createRecipe(payload, auth.token);
      await Swal.fire({ icon:'success', title:'Receita criada', timer:1600, showConfirmButton:false });
      location.href = `../detail/index.html?id=${created.id}`;
    }catch(err){
      await Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao salvar', confirmButtonText:'Ok' });
    }
  });
});