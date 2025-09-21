(function(){
  const scriptEl = document.currentScript;
  const BASE_DIR = new URL('./', scriptEl.src);      // .../sidebar/
  const ROOT_DIR = new URL('../', BASE_DIR);         // raiz do projeto
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
      window.CURRENT_USER = user; // opcional
      return user.role || 'ANON';
    }catch{ return 'ANON'; }
  }
function linkMap(){
  return {
    'welcome': new URL('welcome/bemVindo.html', ROOT_DIR).href,

    // Pessoas / Franquias
    'user-create': new URL('admin/users/create/index.html', ROOT_DIR).href,
    'users-list': new URL('admin/users/index/index.html', ROOT_DIR).href,
    'franchise-create': new URL('admin/franchises/create/index.html', ROOT_DIR).href,
    'franchises-list': new URL('admin/franchises/index/index.html', ROOT_DIR).href,

    // Produtos
    'products-create': new URL('admin/inventory/products/create/index.html', ROOT_DIR).href,
    'products-list':   new URL('admin/inventory/products/index/index.html', ROOT_DIR).href,

    // Estoque
    'inventory-balances': new URL('admin/inventory/index/index.html', ROOT_DIR).href,
    'inventory-adjust':   new URL('admin/inventory/adjust/index.html', ROOT_DIR).href,

    // Compras
    'purchases-create': new URL('admin/purchases/create/index.html', ROOT_DIR).href,
    'purchases-list':   new URL('admin/purchases/index/index.html', ROOT_DIR).href,
  };
}

function detectActive(){
  const p = location.pathname;

  // Produtos
  if (p.includes('/admin/inventory/products/create')) return 'products-create';
  if (p.includes('/admin/inventory/products/index'))  return 'products-list';

  // Estoque
  if (p.includes('/admin/inventory/adjust')) return 'inventory-adjust';
  if (p.includes('/admin/inventory/index'))  return 'inventory-balances';

  // Compras
  if (p.includes('/admin/purchases/create')) return 'purchases-create';
  if (p.includes('/admin/purchases/index'))  return 'purchases-list';

  // Usuários / Franquias
  if (p.includes('/admin/users/create'))      return 'user-create';
  if (p.includes('/admin/users/index'))       return 'users-list';
  if (p.includes('/admin/franchises/create')) return 'franchise-create';
  if (p.includes('/admin/franchises/index'))  return 'franchises-list';

  return 'welcome';
}
  function ensureLayout(){
    // Se a página não criou o grid com #sidebar-root, criamos automaticamente
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

async function mount(){
  const active = window.SIDEBAR_ACTIVE || detectActive();
  const role = await getRole();
  const root = ensureLayout();

  // Carrega o HTML da sidebar (fallback para template embutido)
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
      <div class="sb-section" data-roles="ADMIN,FRANCHISE_OWNER">
        <div class="sb-title">Admin</div>
        <a class="sb-item" data-key="franchise-create">Criar Franquia</a>
        <a class="sb-item" data-key="franchises-list">Franquias</a>
        <a class="sb-item" data-key="user-create">Criar Usuário</a>
        <a class="sb-item" data-key="users-list">Usuários</a>
      </div>
      <div class="sb-bottom">
        <button id="sb-logout" class="sb-danger">Sair</button>
      </div>
    </nav>`;
  }
  root.innerHTML = html;

  // Aplica hrefs e ativo
  const map = linkMap();
  root.querySelectorAll('.sb-item').forEach(a=>{
    const key = a.getAttribute('data-key');
    if(key && map[key]) a.setAttribute('href', map[key]);
    if(key === active) a.classList.add('active');
  });

  // Controle por papel (case-insensitive) — SUBSTITUIR este bloco
const roleUpper = String(role || 'ANON').toUpperCase();
root.querySelectorAll('[data-roles]').forEach(el=>{
  const allowed = (el.getAttribute('data-roles')||'')
    .split(',')
    .map(s=>s.trim().toUpperCase())
    .filter(Boolean);
  if (!allowed.includes(roleUpper)) el.classList.add('sb-hidden');
});

  // Ações
  root.querySelector('#sb-logout')?.addEventListener('click', (e)=>{ e.preventDefault(); logout(); });
  root.querySelector('#sb-health')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    try{
      const r = await fetch(`${API_BASE}/health`);
      alert(`Healthcheck: ${r.ok ? 'OK' : 'ERRO'}`);
    }catch{ alert('Falha ao contatar API.'); }
  });
}
  document.addEventListener('DOMContentLoaded', mount);
})();
