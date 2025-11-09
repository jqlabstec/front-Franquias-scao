const API_BASE = 'http://localhost:3000/api/v1';

let selectedFile = null;

function getAuth(){
  try{
    return JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth'));
  }catch{ return null; }
}

// ✅ Pegar franchiseId do auth
function getFranchiseId() {
  const auth = getAuth();
  return auth?.user?.franchiseId || 1;
}

// Elementos
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

// Click para selecionar arquivo
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// Drag & Drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
});

// Seleção de arquivo
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

function handleFileSelect(file) {
  // Validar extensão
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') {
    Swal.fire('Erro', 'Apenas arquivos Excel (.xlsx ou .xls) são permitidos', 'error');
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileInfo.classList.add('show');
  uploadBtn.disabled = false;
}

// Upload
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const auth = getAuth();
  if (!auth || !auth.token) {
    Swal.fire('Erro', 'Você precisa estar logado para importar', 'error');
    return;
  }

  const franchiseId = getFranchiseId();

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('franchiseId', String(franchiseId)); // ✅ Converter para string

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Importando...';
  progressBar.classList.add('show');
  progressFill.style.width = '50%';

  try {
    console.log('📤 Enviando:', {
      franchiseId,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
    });

    const res = await fetch(`${API_BASE}/sales/import-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
      },
      body: formData,
    });

    progressFill.style.width = '80%';

    console.log('📥 Status:', res.status);

    if (!res.ok) {
      const error = await res.json();
      console.error('❌ Erro:', error);
      throw new Error(error.error || error.message || 'Erro ao importar');
    }

    const data = await res.json();
    console.log('✅ Sucesso:', data);

    progressFill.style.width = '100%';

    // Atualizar estatísticas
    document.getElementById('statMatched').textContent = data.data.salesMatched;
    document.getElementById('statNotFound').textContent = data.data.salesNotFound;
    document.getElementById('statPayments').textContent = data.data.paymentsCreated;

    Swal.fire({
      title: 'Sucesso!',
      html: `
        <strong>${data.data.salesMatched}</strong> vendas atualizadas<br/>
        <strong>${data.data.paymentsCreated}</strong> pagamentos criados
        ${data.data.salesNotFound > 0 ? `<br/>⚠️ <strong>${data.data.salesNotFound}</strong> não encontradas` : ''}
      `,
      icon: 'success',
    });

    // Reset
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.remove('show');
    uploadBtn.textContent = 'Importar Excel';
    progressBar.classList.remove('show');
    progressFill.style.width = '0%';

    // ✅ Recarregar vendas pendentes (se existir a função)
    if (typeof loadPendingSales === 'function') {
      loadPendingSales();
    }
  } catch (err) {
    console.error('❌ Erro no upload:', err);
    Swal.fire('Erro', err.message, 'error');
    uploadBtn.textContent = 'Importar Excel';
    progressBar.classList.remove('show');
    progressFill.style.width = '0%';
  } finally {
    uploadBtn.disabled = false;
  }
});