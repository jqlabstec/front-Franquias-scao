const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString('pt-BR',{minimumFractionDigits:2}); }
function qs(name){ const u=new URL(location.href); return u.searchParams.get(name); }



async function fetchRecipe(id, token){
  const r = await fetch(`${API}/recipes/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar receita');
  return data;
}

function render(recipe){
  // Header
  document.getElementById('recipeName').textContent = recipe.name || 'Ficha técnica';
  document.getElementById('recipeCategory').textContent = recipe.category || '—';
  const y = (recipe.yieldQuantity && recipe.yieldUnit) ? `${recipe.yieldQuantity} ${recipe.yieldUnit}` : (recipe.yield || '—');
  document.getElementById('recipeYield').textContent = y;
  document.getElementById('recipePrepTime').textContent = recipe.preparationTimeMinutes != null ? `${recipe.preparationTimeMinutes} min` : '—';
  // shelf life não existe no modelo atual; se quiser podemos adicionar depois
  document.getElementById('recipeShelfLife').textContent = recipe.shelfLifeDays != null ? `${recipe.shelfLifeDays} d` : '—';

  // Custos
  document.getElementById('recipeCost').textContent = recipe.costTotal != null ? `R$ ${fmtMoney(recipe.costTotal)}` : '—';
  document.getElementById('recipeCostPerPortion').textContent = recipe.costPerPortion != null ? `R$ ${fmtMoney(recipe.costPerPortion)}` : '—';

  // Imagem
  const img = document.getElementById('recipeImg');
  if (img) {
    const fallback = ``;
    img.src = recipe.imageUrl || fallback;
    img.alt = recipe.name || 'Imagem da receita';
  }

  // Ingredientes
  const tb = document.getElementById('tbodyIngredients');
  tb.innerHTML = '';
  let total = 0;

  const items = recipe.recipeIngredients || [];
  if (!items.length) {
    tb.innerHTML = '<tr><td colspan="6" class="muted">Sem itens</td></tr>';
  } else {
    items.forEach(ing => {
      const name = ing.product?.name || ing.name || '—';
      const unit = ing.unitOfMeasure || ing.product?.unitOfMeasure || '—';
      const qty = Number(ing.quantity || 0);
      const unitCost = Number(ing.unitCost || 0);
      const subtotal = Number(ing.costSubtotal != null ? ing.costSubtotal : (unitCost * qty * (1 + Number(ing.wastageFactor || 0))));
      total += subtotal;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ing.type || 'INGREDIENT'}</td>
        <td>${name}</td>
        <td>${unit}</td>
        <td>${qty}</td>
        <td>R$ ${fmtMoney(unitCost)}</td>
        <td>R$ ${fmtMoney(subtotal)}</td>
      `;
      tb.appendChild(tr);
    });
  }
  document.getElementById('tfootTotal').textContent = fmtMoney(total);

  // Instruções
  document.getElementById('recipeInstructions').textContent = recipe.instructions || '—';
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }
  const id = qs('id'); if(!id) { location.href='../index/index.html'; return; }

  const btnEdit = document.getElementById('btnEdit');
  if (btnEdit) {
    btnEdit.href = `../edit/index.html?id=${encodeURIComponent(id)}`;
  }

  const btnPricing = document.getElementById('btn-pricing');
if (btnPricing) {
  btnPricing.href = `./pricing.html?id=${encodeURIComponent(id)}`;
}


  try{
    const recipe = await fetchRecipe(id, auth.token);
    render(recipe);
  }catch(err){
    await Swal.fire({ icon:'error', title:'Erro', text: err.message || 'Falha ao carregar', confirmButtonText:'Ok' });
    location.href = '../index/index.html';
  }
});