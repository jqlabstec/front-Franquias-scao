const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';
function getAuth(){ try{ return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')); }catch{return null;} }

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=> k==='class' ? n.className=v : n.setAttribute(k,v));
  (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=> n.appendChild(typeof c==='string'?document.createTextNode(c):c));
  return n;
}

async function fetchRecipes(params, token){
  const qs = new URLSearchParams();
  if(params?.q) qs.set('q', params.q);
  if(params?.category) qs.set('category', params.category);
  if(params?.tag) qs.set('tag', params.tag);
  const r = await fetch(`${API}/recipes?${qs.toString()}`, { headers:{ Authorization:`Bearer ${token}` }});
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(data?.message || 'Falha ao carregar receitas');
  return data; // sugestão: { items:[...], total:number, categories:[...], tags:[...] }
}

function mountCard(recipe){
  const img = el('div',{class:'img'}, el('img',{src: recipe.imageUrl || (recipe.id), alt: recipe.name}));
  const title = el('div',{class:'name'}, recipe.name);
  const metaLeft = el('span',{}, recipe.category || '—');
  const metaRight = el('span',{}, (recipe.yieldUnit ? `${recipe.yieldQuantity} ${recipe.yieldUnit}` : (recipe.yieldQuantity || '')));
  const meta = el('div',{class:'meta'}, [metaLeft, metaRight]);

  const body = el('div',{class:'body'}, [title, meta]);
  const card = el('div',{class:'card-recipe'});
  card.appendChild(img); card.appendChild(body);
  card.addEventListener('click', ()=> location.href = `../detail/index.html?id=${recipe.id}`);
  return card;
}

function renderFilters(data){
  const selCat = document.getElementById('category');
  const selTag = document.getElementById('tag');
  if (data.categories?.length){
    selCat.innerHTML = '<option value="">Categoria: Todas</option>' + data.categories.map(c=>`<option value="${c}">${c}</option>`).join('');
  }
  if (data.tags?.length){
    selTag.innerHTML = '<option value="">Tag: Todas</option>' + data.tags.map(t=>`<option value="${t}">${t}</option>`).join('');
  }
}

function renderGrid(items){
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  grid.innerHTML = ''; count.textContent = `${items?.length || 0} receitas encontradas`;
  if(!items?.length){
    grid.appendChild(el('div',{class:'empty'}, 'Sem resultados'));
    return;
  }
  items.forEach(r=> grid.appendChild(mountCard(r)));
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const auth = getAuth(); if(!auth?.token){ location.href='../../../login/index.html'; return; }

  async function load(){
    const params = {
      q: document.getElementById('q').value.trim(),
      category: document.getElementById('category').value,
      tag: document.getElementById('tag').value,
    };
    const data = await fetchRecipes(params, auth.token);
    renderFilters(data);
    renderGrid(data.items || data);
  }

  document.getElementById('btnSearch').addEventListener('click', load);
  document.getElementById('btnClear').addEventListener('click', ()=>{
    document.getElementById('q').value='';
    document.getElementById('category').value='';
    document.getElementById('tag').value='';
    load();
  });

  await load();
});