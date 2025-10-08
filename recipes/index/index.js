// index.js (corrigido e com carregamento de imagem robusto)
const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  } catch (e) {
    return null;
  }
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => k === 'class' ? n.className = v : n.setAttribute(k, v));
  (Array.isArray(children) ? children : [children]).filter(Boolean)
    .forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}

function svgPlaceholder(text = 'Imagem', w = 300, h = 200, bg = '#f2f2f2', fg = '#666') {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='${bg}'/>
    <text x='50%' y='50%' fill='${fg}' font-family='Arial,Helvetica,sans-serif' font-size='16' dominant-baseline='middle' text-anchor='middle'>
      ${text}
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function fetchRecipes(params = {}, token) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.tag) qs.set('tag', params.tag);

  const r = await fetch(`${API}/recipes?${qs.toString()}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || 'Falha ao carregar receitas');
  return data;
}

// Re-substitua a função mountCard com esta versão:

function mountCard(recipe) {
    console.log('Imagem URL:', recipe.imageUrl);

    const imgEl = el('img', {
        alt: recipe.name || 'Receita',
        loading: 'lazy',
        width: 300,
        height: 200
    });

    const setPlaceholder = () => {
        imgEl.onerror = null;
        imgEl.src = svgPlaceholder(recipe.name || 'Imagem', 300, 200);
    };

    const loadImageAndAuth = async (initialUrl) => {
        let url = initialUrl;
        if (!url) return setPlaceholder();

        // Resolve URLs relativas
        if (url.startsWith('/')) {
            try {
                const apiOrigin = window.API_BASE_URL ? new URL(window.API_BASE_URL).origin : location.origin;
                url = apiOrigin + url;
            } catch (e) {
                console.error("Erro ao resolver URL relativa:", e);
            }
        }
        
        // **Tenta o fetch com token para lidar com autenticação**
        try {
            const auth = getAuth();
            const r = await fetch(url, {
                headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
            });
            if (!r.ok) throw new Error('Fetch da imagem falhou');
            
            const blob = await r.blob();
            const blobUrl = URL.createObjectURL(blob);
            imgEl.src = blobUrl;
            imgEl.onerror = setPlaceholder; // Placeholder se o blobUrl falhar por algum motivo
        } catch (err) {
            console.error('Fetch da imagem com token falhou:', err.message);
            setPlaceholder(); // Exibe o placeholder em caso de falha no fetch
        }
    };

    // Chamamos a função assíncrona logo após montar a estrutura do card.
    loadImageAndAuth(recipe.imageUrl);


    // 5. Monta e retorna o card (GARANTIDO)
    const imgWrap = el('div', { class: 'img' }, imgEl);
    // ... resto do card
    const title = el('div', { class: 'name' }, recipe.name || '—');
    const metaLeft = el('span', {}, recipe.category || '—');
    const yieldText = recipe.yieldUnit ? `${recipe.yieldQuantity || ''} ${recipe.yieldUnit}` : (recipe.yieldQuantity || '');
    const metaRight = el('span', {}, yieldText);
    const meta = el('div', { class: 'meta' }, [metaLeft, metaRight]);
    const body = el('div', { class: 'body' }, [title, meta]);

    const card = el('div', { class: 'card-recipe' });
    card.appendChild(imgWrap);
    card.appendChild(body);

    if (recipe.id) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            location.href = `../detail/index.html?id=${recipe.id}`;
        });
    }

    return card;
}

function renderFilters(data = {}) {
  const selCat = document.getElementById('category');
  const selTag = document.getElementById('tag');
  if (!selCat || !selTag) return;

  if (Array.isArray(data.categories) && data.categories.length) {
    selCat.innerHTML = '<option value="">Categoria: Todas</option>' +
      data.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  if (Array.isArray(data.tags) && data.tags.length) {
    selTag.innerHTML = '<option value="">Tag: Todas</option>' +
      data.tags.map(t => `<option value="${t}">${t}</option>`).join('');
  }
}

function renderGrid(items = []) {
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  if (!grid || !count) return;

  grid.innerHTML = '';
  count.textContent = `${items.length || 0} receitas encontradas`;
  if (!items.length) {
    grid.appendChild(el('div', { class: 'empty' }, 'Sem resultados'));
    return;
  }
  items.forEach(r => grid.appendChild(mountCard(r)));
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../../login/index.html';
    return;
  }

  async function load() {
    try {
      const params = {
        q: document.getElementById('q')?.value.trim() || '',
        category: document.getElementById('category')?.value || '',
        tag: document.getElementById('tag')?.value || ''
      };
      const data = await fetchRecipes(params, auth.token);
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : (data.items || []));
      renderFilters(data);
      renderGrid(items);
    } catch (err) {
      console.error('Erro ao carregar receitas:', err);
      renderGrid([]);
    }
  }

  document.getElementById('btnSearch')?.addEventListener('click', load);
  document.getElementById('btnClear')?.addEventListener('click', () => {
    if (document.getElementById('q')) document.getElementById('q').value = '';
    if (document.getElementById('category')) document.getElementById('category').value = '';
    if (document.getElementById('tag')) document.getElementById('tag').value = '';
    load();
  });

  await load();
});