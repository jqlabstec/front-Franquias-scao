// index.js (corrigido e com carregamento de imagem robusto)
const API = window.API_BASE_URL || 'http://localhost:3000/api/v1';

const btnPrimaryStyle = 'padding:10px 12px;border:none;border-radius:10px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;font-weight:700;cursor:pointer;';
const btnGhostStyle   = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;';

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

function downloadRecipeTemplate() {
  const XLSX = window.XLSX;
  const data = [
    ['nome_receita*', 'categoria', 'nome_ingrediente*', 'quantidade*', 'unidade*', 'custo_unitario', 'sku_produto', 'observacao'],
    ['Abacate com leite', 'Vitaminas', 'abacate',  0.160, 'kg', 1.10, '', 'Importação inicial'],
    ['Abacate com leite', 'Vitaminas', 'leite',    0.350, 'L',  1.86, '', 'Importação inicial'],
    ['Açaí G',           'sobremesas', 'Açaí',    0.440, 'kg', 5.38, '', 'Importação inicial'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 22 }];

  // Formatar coluna quantidade (D) como número com 3 casas decimais
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let row = 1; row <= range.e.r; row++) {
    const cell = ws[XLSX.utils.encode_cell({ r: row, c: 3 })];
    if (cell && cell.t === 'n') cell.z = '0.000';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Importação');
  XLSX.writeFile(wb, 'modelo_receitas.xlsx');
}

async function importRecipesExcel(file) {
  const auth = getAuth();
  const formData = new FormData();
  formData.append('file', file);

  const r = await fetch(`${API}/recipes/import-excel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: formData,
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Falha na importação');
  return data;
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

  document.getElementById('btnDownloadTemplate').addEventListener('click', downloadRecipeTemplate);

document.getElementById('btnImportRecipes').addEventListener('click', () => {
  document.getElementById('fileInputRecipes').click();
});

document.getElementById('fileInputRecipes').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  const { isConfirmed } = await Swal.fire({
    title: 'Importar receitas',
    html: `<p>Arquivo: <strong>${file.name}</strong></p>
           <p style="color:#555;font-size:13px;">Receitas existentes terão seus ingredientes atualizados. Ingredientes não encontrados no estoque ficam como nome livre para mapeamento posterior.</p>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Importar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    didRender: () => {
      Swal.getConfirmButton()?.setAttribute('style', btnPrimaryStyle);
      Swal.getCancelButton()?.setAttribute('style', btnGhostStyle);
      Swal.getActions().style.gap = '8px';
    },
  });

  if (!isConfirmed) return;

  Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const result = await importRecipesExcel(file);

    let html = `
      <p>✅ <strong>${result.created}</strong> receitas criadas</p>
      <p>🔄 <strong>${result.updated}</strong> receitas atualizadas</p>
    `;
    if (result.skipped) html += `<p>⏭️ <strong>${result.skipped}</strong> com erro</p>`;
    if (result.errors?.length) {
      html += `<details style="margin-top:8px;text-align:left">
        <summary style="cursor:pointer;color:#b91c1c">Ver erros (${result.errors.length})</summary>
        <ul style="font-size:12px;margin-top:4px">${result.errors.map(e => `<li><strong>${e.recipe}</strong>: ${e.erro}</li>`).join('')}</ul>
      </details>`;
    }

    await Swal.fire({
      title: 'Importação concluída',
      html,
      icon: 'success',
      buttonsStyling: false,
      didRender: () => {
        Swal.getConfirmButton()?.setAttribute('style', btnPrimaryStyle);
        Swal.getActions().style.gap = '8px';
      },
    });

    load();
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: err.message,
      buttonsStyling: false,
      didRender: () => {
        Swal.getConfirmButton()?.setAttribute('style', btnPrimaryStyle);
        Swal.getActions().style.gap = '8px';
      },
    });
  }
});

  await load();
});