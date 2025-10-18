const API = 'http://localhost:3000/api/v1';

// --- Variáveis globais de estado ---
let currentPage = 1;
const pageSize = 5;
let currentFilters = {};
let currentCashRegister = null;

// --- Elementos do modal (serão inicializados no DOMContentLoaded) ---
let modalOverlay;
let modalCloseForm;
let modalCashRegisterId;

function getAuth() {
    try {
        return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
    } catch {
        return null;
    }
}

function fmtMoney(n) {
    const x = Number(n || 0);
    return x.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// --- API calls ---

async function fetchAPI(url, options = {}) {
    const auth = getAuth();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (auth?.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.error || data?.message || `Falha na requisição: ${response.statusText}`);
    }
    return data;
}

function createCashRegister(payload) {
    return fetchAPI(`${API}/cash-registers`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

function closeCashRegister(id, payload) {
    return fetchAPI(`${API}/cash-registers/${id}/close`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

function fetchCashRegisters(filters = {}) {
    const params = new URLSearchParams({
        page: currentPage,
        pageSize,
        ...filters,
    });
    return fetchAPI(`${API}/cash-registers?${params.toString()}`);
}

function fetchOpenCashRegister() {
    return fetchAPI(`${API}/cash-registers/open`);
}

// --- Funções do Modal (escopo global) ---

function showModal() {
    if (modalOverlay) {
        modalOverlay.classList.remove('hidden');
    }
}

function hideModal() {
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
    }
}

function openCloseModal(cashRegisterId) {
    if (modalCloseForm && modalCashRegisterId) {
        modalCloseForm.reset();
        modalCashRegisterId.value = cashRegisterId;
        showModal();
    }
}

// --- Renderização e controle da UI ---

function renderCashRegisters(data) {
    const tbody = document.getElementById('cashRegisterList');
    tbody.innerHTML = '';

    if (!data.items || !data.items.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    data.items.forEach(item => {
        const tr = document.createElement('tr');
        const openDate = new Date(item.openDate).toLocaleString('pt-BR');
        const closeDate = item.closeDate ? new Date(item.closeDate).toLocaleString('pt-BR') : '—';

        tr.innerHTML = `
            <td>${openDate}</td>
            <td>${closeDate}</td>
            <td>${item.openedBy?.name || '—'}</td>
            <td>${item.closedBy?.name || '—'}</td>
            <td>R$ ${fmtMoney(item.openingAmount)}</td>
            <td>${item.closingAmount !== null ? `R$ ${fmtMoney(item.closingAmount)}` : '—'}</td>
            <td>R$ ${fmtMoney(item.sangriaAmount)}</td>
            <td>${item.observation || ''}</td>
            <td>
                ${!item.closeDate ? `<button class="btn-ghost btn-close" data-id="${item.id}">Fechar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${Math.ceil(data.total / pageSize)}`;
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= Math.ceil(data.total / pageSize);

    // Adiciona listeners aos botões de fechar da lista
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', () => openCloseModal(btn.dataset.id));
    });
}

async function loadCashRegisters() {
    try {
        const data = await fetchCashRegisters(currentFilters);
        renderCashRegisters(data);
    } catch (err) {
        await Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
}

// --- Eventos e lógica da página ---
document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth();
    if (!auth?.token) {
        location.href = '../../../login/index.html';
        return;
    }

    // Inicializa elementos do modal
    modalOverlay = document.getElementById('closeRegisterModalOverlay');
    modalCloseForm = document.getElementById('modalCloseForm');
    modalCashRegisterId = document.getElementById('modalCashRegisterId');
    const modalCloseButton = document.getElementById('modalCloseButton');
    const modalCancelButton = document.getElementById('modalCancelButton');

    // Evento para o SUBMIT do formulário do modal
    modalCloseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cashRegisterId = modalCashRegisterId.value;
        const payload = {
            closingAmount: parseFloat(document.getElementById('modalClosingAmount').value),
            sangriaAmount: parseFloat(document.getElementById('modalSangriaAmount').value) || 0,
            observation: document.getElementById('modalObservation').value.trim(),
        };

        if (isNaN(payload.closingAmount) || payload.closingAmount < 0) {
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Informe um valor de fechamento válido.' });
            return;
        }

        try {
            await closeCashRegister(cashRegisterId, payload);
            hideModal();
            
            await Swal.fire({ icon: 'success', title: 'Caixa fechado com sucesso!', timer: 1500, showConfirmButton: false });

            if (currentCashRegister && currentCashRegister.id == cashRegisterId) {
                currentCashRegister = null;
                document.getElementById('cashRegisterForm').reset();
                document.getElementById('btnCloseCash').disabled = true;
            }
            loadCashRegisters();
        } catch (err) {
            await Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
        }
    });

    // Eventos para fechar o modal
    modalCloseButton.addEventListener('click', hideModal);
    modalCancelButton.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideModal();
        }
    });

    const form = document.getElementById('cashRegisterForm');
    const btnCloseCash = document.getElementById('btnCloseCash');

    // Formulário de ABERTURA de caixa
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const payload = {
                openingAmount: parseFloat(form.openingAmount.value) || 0,
                changeAmount: parseFloat(form.changeAmount.value) || 0,
                expenseAmount: parseFloat(form.expenseAmount.value) || 0,
                sangriaAmount: parseFloat(form.sangriaAmount.value) || 0,
                observation: form.observation.value.trim() || undefined,
            };
            if (isNaN(payload.openingAmount) || payload.openingAmount < 0) {
                throw new Error('Informe um valor de abertura válido.');
            }

            const newRegister = await createCashRegister(payload);
            currentCashRegister = newRegister;

            await Swal.fire({ icon: 'success', title: 'Caixa aberto com sucesso', timer: 1500, showConfirmButton: false });
            btnCloseCash.disabled = false;
            form.reset();
            loadCashRegisters();
        } catch (err) {
            await Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
        }
    });
    
    // Botão principal para FECHAR o caixa aberto na sessão
    btnCloseCash.addEventListener('click', () => {
        if (!currentCashRegister) {
            Swal.fire({ icon: 'warning', title: 'Aviso', text: 'Nenhum caixa aberto nesta sessão para fechar.' });
            return;
        }
        openCloseModal(currentCashRegister.id);
    });

    // Filtros
    document.getElementById('filterForm').addEventListener('submit', e => {
        e.preventDefault();
        currentPage = 1;
        currentFilters = {
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
            closedByName: document.getElementById('filterClosedBy').value.trim(),
        };
        loadCashRegisters();
    });
    
    // Paginação
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadCashRegisters();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        currentPage++;
        loadCashRegisters();
    });
    
    // Função de inicialização da página
    async function initializePage() {
        try {
            const openRegister = await fetchOpenCashRegister();
            currentCashRegister = openRegister;
            btnCloseCash.disabled = false;
        } catch (error) {
            currentCashRegister = null;
            btnCloseCash.disabled = true;
        }
        loadCashRegisters();
    }

    initializePage();
});