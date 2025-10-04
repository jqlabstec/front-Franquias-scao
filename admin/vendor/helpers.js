// admin/vendor/helpers.js

// Base dos endpoints da sua API
export const apiBaseUrl = (() => {
  if (window.API_BASE_URL) return window.API_BASE_URL;
  // Se estiver servindo pelo Live Server (porta 5500), aponte para a API
  if (location.port === '5500') return 'http://localhost:3000/api/v1';
  return `${location.origin}/api/v1`;
})();

// Token salvo no login (localStorage)
export function getToken() {
  return localStorage.getItem('token');
}

// Formatação de moeda BRL
export function formatMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Seletores rápidos
export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

// Garante que o usuário está autenticado e injeta a sidebar
export async function ensureAuthAndSidebar(containerSel, options = {}) {
  const token = getToken();
  if (!token) {
    location.href = '/login/index.html';
    return;
  }
  const container = qs(containerSel);
  if (container) {
    // Ajuste o caminho conforme onde seu sidebar está hospedado
    const resp = await fetch('/sidebar/index.html', { cache: 'no-store' });
    if (resp.ok) {
      container.innerHTML = await resp.text();
      // Marcar item ativo do menu, se informado
      if (options.active) {
        const el = container.querySelector(`[data-menu="${options.active}"]`);
        if (el) el.classList.add('active');
      }
    }
  }
}