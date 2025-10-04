import { apiBaseUrl } from '../../vendor/helpers.js';

function token() {
  try {
    return (JSON.parse(localStorage.getItem('auth')) || JSON.parse(sessionStorage.getItem('auth')))?.token || '';
  } catch {
    return '';
  }
}

let selectedFiles = [];

// Elementos
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const importBtn = document.getElementById('importBtn');
const clearBtn = document.getElementById('clearBtn');
const resultSection = document.getElementById('resultSection');
const resultSummary = document.getElementById('resultSummary');
const resultTable = document.getElementById('resultTable');
const resultTableWrap = document.getElementById('resultTableWrap');

// Upload Area - Click
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// File Input - Change
fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// Drag & Drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

// Handle Files
function handleFiles(files) {
  const xmlFiles = Array.from(files).filter(f => f.name.endsWith('.xml'));
  
  if (xmlFiles.length === 0) {
    alert('Por favor, selecione apenas arquivos XML');
    return;
  }

  selectedFiles = [...selectedFiles, ...xmlFiles];
  renderFileList();
  updateButtons();
}

// Render File List
function renderFileList() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '';
    return;
  }

  fileList.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-item">
      <div class="file-info">
        <div class="file-icon">XML</div>
        <div class="file-details">
          <p class="file-name">${file.name}</p>
          <p class="file-size">${formatFileSize(file.size)}</p>
        </div>
      </div>
      <button class="file-remove" data-index="${index}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  // Remove file listeners
  document.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      selectedFiles.splice(index, 1);
      renderFileList();
      updateButtons();
    });
  });
}

// Update Buttons
function updateButtons() {
  const hasFiles = selectedFiles.length > 0;
  importBtn.disabled = !hasFiles;
  clearBtn.disabled = !hasFiles;
}

// Clear Files
clearBtn.addEventListener('click', () => {
  selectedFiles = [];
  fileInput.value = '';
  renderFileList();
  updateButtons();
  resultSection.style.display = 'none';
});

// Import Sales
importBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner"></span>Importando...';
  
  const results = [];

  for (const file of selectedFiles) {
    try {
      const xmlContent = await readFileAsText(file);
      const result = await importXML(xmlContent);
      results.push({ file: file.name, ...result });
    } catch (error) {
      results.push({
        file: file.name,
        success: false,
        salesImported: 0,
        itemsImported: 0,
        productsDiscovered: 0,
        errors: [error.message || 'Erro ao processar arquivo'],
      });
    }
  }

  displayResults(results);
  
  importBtn.disabled = false;
  importBtn.innerHTML = 'Importar Vendas';
});

// Read File as Text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

// Import XML via API
async function importXML(xmlContent) {
  const response = await fetch(`${apiBaseUrl}/sales/import-xml`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token()}`,
    },
    body: JSON.stringify({ xmlContent }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao importar venda');
  }

  return await response.json();
}

// Display Results
function displayResults(results) {
  const totalSuccess = results.filter(r => r.success).length;
  const totalErrors = results.filter(r => !r.success).length;
  const totalSales = results.reduce((sum, r) => sum + r.salesImported, 0);
  const totalItems = results.reduce((sum, r) => sum + r.itemsImported, 0);
  const totalDiscovered = results.reduce((sum, r) => sum + r.productsDiscovered, 0);

  // Summary
  resultSummary.innerHTML = `
    <div class="result-card success">
      <p class="result-label">Importados</p>
      <p class="result-value">${totalSuccess}</p>
    </div>
    <div class="result-card ${totalErrors > 0 ? 'error' : ''}">
      <p class="result-label">Erros</p>
      <p class="result-value">${totalErrors}</p>
    </div>
    <div class="result-card">
      <p class="result-label">Vendas</p>
      <p class="result-value">${totalSales}</p>
    </div>
    <div class="result-card">
      <p class="result-label">Itens</p>
      <p class="result-value">${totalItems}</p>
    </div>
    <div class="result-card warning">
      <p class="result-label">Produtos Descobertos</p>
      <p class="result-value">${totalDiscovered}</p>
    </div>
  `;

  // Table
  resultTable.innerHTML = results.map(r => `
    <tr>
      <td>${r.file}</td>
      <td>
        <span class="status-badge ${r.success ? 'success' : 'error'}">
          ${r.success ? 'Sucesso' : 'Erro'}
        </span>
      </td>
      <td class="num">${r.salesImported}</td>
      <td class="num">${r.itemsImported}</td>
      <td class="num">${r.productsDiscovered}</td>
      <td>${r.errors.length > 0 ? r.errors.join(', ') : '—'}</td>
    </tr>
  `).join('');

  resultTableWrap.style.display = 'block';
  resultSection.style.display = 'block';
}

// Format File Size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}