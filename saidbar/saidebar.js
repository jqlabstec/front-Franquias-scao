(function(){
  const scriptEl = document.currentScript;
  const BASE_DIR = new URL('./', scriptEl.src);
  const ROOT_DIR = new URL('../', BASE_DIR);
  const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api/v1';

  function getAuth(){
    try{
      return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
    }catch{ return null; }
  }

  function logout(){
    localStorage.removeItem('auth');
    sessionStorage.removeItem('auth');
    window.location.href = new URL('login/index.html', ROOT_DIR).href;
  }

  async function getRole(){
    const auth = getAuth();
    if(!auth?.token) return 'ANON';
    try{
      const r = await fetch(`${API_BASE}/auth/me`, { headers:{ Authorization:`Bearer ${auth.token}` } });
      if(!r.ok) throw new Error();
      const { user } = await r.json();
      window.CURRENT_USER = user;
      return user.role || 'ANON';
    }catch{ return 'ANON'; }
  }

  function linkMap(){
    return {
      'sales-import': new URL('admin/sales/import/index.html', ROOT_DIR).href,
      'sales-import-excel': new URL('admin/sales/import-excel/index.html', ROOT_DIR).href,
      'sales-index': new URL('admin/sales/index/index.html', ROOT_DIR).href,
      'welcome': new URL('welcome/bemVindo.html', ROOT_DIR).href,
      'user-create': new URL('admin/users/create/index.html', ROOT_DIR).href,
      'users-list': new URL('admin/users/index/index.html', ROOT_DIR).href,
      'franchise-create': new URL('admin/franchises/create/index.html', ROOT_DIR).href,
      'franchises-list': new URL('admin/franchises/index/index.html', ROOT_DIR).href,
      'finance-dashboard': new URL('admin/finance/index.html', ROOT_DIR).href,
      'bank-reconciliation': new URL('admin/bank-reconciliation/index.html', ROOT_DIR).href,
      'finance-opex': new URL('admin/finance/opex.html', ROOT_DIR).href,
      'finance-revenue': new URL('admin/finance/revenue.html', ROOT_DIR).href,
      'finance-cash-register': new URL('cash/index.html', ROOT_DIR).href,
      'finance-dre': new URL('admin/dre/index.html', ROOT_DIR).href,
      'products-create': new URL('admin/inventory/products/create/index.html', ROOT_DIR).href,
      'products-list': new URL('admin/inventory/index/index.html', ROOT_DIR).href,
      'products-discovered': new URL('admin/inventory/discovered/index.html', ROOT_DIR).href,
      'inventory-balances': new URL('admin/inventory/index/index.html', ROOT_DIR).href,
      'inventory-adjust': new URL('admin/inventory/adjust/index.html', ROOT_DIR).href,
      'purchases-create': new URL('admin/purchases/create/index.html', ROOT_DIR).href,
      'purchases-list': new URL('admin/purchases/index/index.html', ROOT_DIR).href,
      'purchase-suggestions': new URL('admin/purchase-suggestions/index.html', ROOT_DIR).href, // ✅ NOVO
      'recipes-list': new URL('recipes/index/index.html', ROOT_DIR).href,
      'recipes-create': new URL('recipes/create/index.html', ROOT_DIR).href,
      'product-mapping': new URL('admin/product-maping/product-mapping.html', ROOT_DIR).href,
    };
  }

  function detectActive(){
    const p = location.pathname;

    if (p.includes('/admin/sales/import')) return 'sales-import';
    if (p.includes('/admin/sales/import-excel')) return 'sales-import-ecxel';
    if (p.includes('/admin/sales/import-excel')) return 'sales-index';
    if (p.includes('/recipes/create')) return 'recipes-create';
    if (p.includes('/recipes/index')) return 'recipes-list';
    if (p.includes('/admin/inventory/products/create')) return 'products-create';
    if (p.includes('/admin/inventory/products/index')) return 'products-list';
    if (p.includes('/admin/inventory/discovered')) return 'products-discovered';
    if (p.includes('/admin/inventory/adjust')) return 'inventory-adjust';
    if (p.includes('/admin/inventory/index')) return 'inventory-balances';
    if (p.includes('/admin/purchases/create')) return 'purchases-create';
    if (p.includes('/admin/purchases/index')) return 'purchases-list';
    if (p.includes('/admin/purchase-suggestions')) return 'purchase-suggestions'; // ✅ NOVO
    if (p.includes('/admin/users/create')) return 'user-create';
    if (p.includes('/admin/users/index')) return 'users-list';
    if (p.includes('/admin/franchises/create')) return 'franchise-create';
    if (p.includes('/admin/franchises/index')) return 'franchises-list';
    if (p.includes('/admin/finance/index')) return 'finance-dashboard';
    if (p.includes('/admin/bank-reconciliation')) return 'bank-reconciliation';
    if (p.includes('/public/pages/dashboard')) return 'finance-dashboard';
    if (p.includes('/admin/finance/opex')) return 'finance-opex';
    if (p.includes('/admin/finance/revenue')) return 'finance-revenue';
    if (p.includes('/Cash')) return 'finance-cash-register';
    if (p.includes('/admin/dre/index')) return 'finance-dre';
    if (p.includes('/admin/product-maping/product-mapping.html')) return 'product-mapping';    

    return 'welcome';
  }

  function ensureLayout(){
    let root = document.getElementById('sidebar-root');
    if(root) return root;
    const layout = document.createElement('div'); layout.className='app-layout';
    const aside = document.createElement('aside'); aside.id='sidebar-root';
    const content = document.createElement('div'); content.className='app-content';
    while(document.body.firstChild){ content.appendChild(document.body.firstChild); }
    layout.appendChild(aside); layout.appendChild(content); document.body.appendChild(layout);
    document.body.classList.add('has-sidebar');
    return aside;
  }

  // ✅ NOVO: Carregar badge de sugestões
  async function loadPurchaseSuggestionBadge(){
    try{
      const auth = getAuth();
      if(!auth?.token) return;

      const response = await fetch(`${API_BASE}/purchase-suggestions/count`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      if(!response.ok) return;

      const data = await response.json();

      const badge = document.getElementById('purchase-suggestions-badge');
      if(badge && data.count > 0){
        badge.textContent = data.count;
        badge.style.display = 'inline-block';
      }
    }catch(error){
      console.error('Erro ao carregar badge de sugestões:', error);
    }
  }

  async function mount(){
    const active = window.SIDEBAR_ACTIVE || detectActive();
    const role = await getRole();
    const root = ensureLayout();

    let html;
    try{
      html = await (await fetch(new URL('saidebar.html', BASE_DIR).href)).text();
    }catch{
      html = `
      <nav class="sb">
        <div class="sb-head"><div class="sb-logo">VitaGestor</div></div>
        <div class="sb-section" data-roles="ADMIN,FRANCHISE_OWNER,EMPLOYEE">
          <div class="sb-title">Geral</div>
          <a class="sb-item" data-key="welcome">Bem‑vindo</a>
        </div>
        <div class="sb-bottom">
          <button id="sb-logout" class="sb-danger">Sair</button>
        </div>
      </nav>`;
    }
    root.innerHTML = html;

    const map = linkMap();
    root.querySelectorAll('.sb-item').forEach(a=>{
      const key = a.getAttribute('data-key');
      if(key && map[key]) a.setAttribute('href', map[key]);
      if(key === active) a.classList.add('active');
    });

    const roleUpper = String(role || 'ANON').toUpperCase();
    root.querySelectorAll('[data-roles]').forEach(el=>{
      const allowed = (el.getAttribute('data-roles')||'')
        .split(',')
        .map(s=>s.trim().toUpperCase())
        .filter(Boolean);
      if (!allowed.includes(roleUpper)) el.classList.add('sb-hidden');
    });

    root.querySelector('#sb-logout')?.addEventListener('click', (e)=>{ e.preventDefault(); logout(); });
    root.querySelector('#sb-health')?.addEventListener('click', async (e)=>{
      e.preventDefault();
      try{
        const r = await fetch(`${API_BASE}/health`);
        alert(`Healthcheck: ${r.ok ? 'OK' : 'ERRO'}`);
      }catch{ alert('Falha ao contatar API.'); }
    });

    // ✅ Carregar badge
    await loadPurchaseSuggestionBadge();

    // ✅ Atualizar badge a cada 5 minutos
    setInterval(loadPurchaseSuggestionBadge, 5 * 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', mount);
})();