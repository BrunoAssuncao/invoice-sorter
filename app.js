// DB helpers are now provided by db.js: openDB, dbAdd, dbGetAll, dbGet, dbPut, dbDelete

// UI elements
const tabAdd = document.getElementById('tab-add');
const tabList = document.getElementById('tab-list');
const viewAdd = document.getElementById('view-add');
const viewList = document.getElementById('view-list');
const viewDetail = document.getElementById('view-detail');

// Menu elements
const menuToggle = document.getElementById('menu-toggle');
const menuPanel = document.getElementById('menu-panel');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFileInput = document.getElementById('import-file');

// Add form elements
const addForm = document.getElementById('add-form');
const titleEl = document.getElementById('title');
const amountEl = document.getElementById('amount');
const dateEl = document.getElementById('date');
const employeeExpenseEl = document.getElementById('employeeExpense');
const settledEl = document.getElementById('settled');
const sentToAccountingEl = document.getElementById('sentToAccounting');
const photoEl = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');
const previewImg = document.getElementById('preview-img');
const clearPhotoBtn = document.getElementById('clear-photo');

// List elements
const listEmpty = document.getElementById('list-empty');
const listEl = document.getElementById('invoice-list');
const selectionSumEl = document.getElementById('selection-sum');
const btnSelectUnsent = document.getElementById('select-unsent');
const btnSelectUnsettled = document.getElementById('select-unsettled');
const btnClearSelection = document.getElementById('clear-selection');

// Selection state
const selectedIds = new Set();

function updateSelectionSumDisplay(total) {
  if (!selectionSumEl) return;
  if (selectedIds.size === 0) {
    selectionSumEl.textContent = '';
    return;
  }
  selectionSumEl.textContent = `${selectedIds.size} selected • €${total.toFixed(2)}`;
}

async function computeSelectedTotal() {
  if (selectedIds.size === 0) return 0;
  const all = await dbGetAll();
  let sum = 0;
  for (const inv of all) {
    if (selectedIds.has(inv.id)) {
      const amt = parseFloat(inv.amount);
      if (!isNaN(amt)) sum += amt;
    }
  }
  return sum;
}

async function refreshSelectionSum() {
  const total = await computeSelectedTotal();
  updateSelectionSumDisplay(total);
  updateBulkButtons();
}

function setSelected(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkButtons();
}

function updateBulkButtons() {
  const hasSel = selectedIds.size > 0;
  if (btnSelectUnsent) btnSelectUnsent.textContent = hasSel ? 'Mark as sent' : 'Select all unsent';
  if (btnSelectUnsettled) btnSelectUnsettled.textContent = hasSel ? 'Mark as settled' : 'Select all unsettled';
}

// Detail elements
const backBtn = document.getElementById('back-to-list');
const detailForm = document.getElementById('detail-form');
const detailId = document.getElementById('detail-id');
const detailTitle = document.getElementById('detail-title');
const detailAmount = document.getElementById('detail-amount');
const detailDate = document.getElementById('detail-date');
const detailEmp = document.getElementById('detail-employeeExpense');
const detailSettled = document.getElementById('detail-settled');
const detailSentAcc = document.getElementById('detail-sentToAccounting');
const detailPhoto = document.getElementById('detail-photo');
const detailPhotoEmpty = document.getElementById('detail-photo-empty');
const deleteBtn = document.getElementById('delete-invoice');

function switchTab(target) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  if (target === 'add') {
    tabAdd.classList.add('active');
    viewAdd.classList.add('active');
  } else if (target === 'list') {
    tabList.classList.add('active');
    viewList.classList.add('active');
    refreshList();
  } else if (target === 'detail') {
    viewDetail.classList.add('active');
  }
}

tabAdd.addEventListener('click', () => switchTab('add'));
tabList.addEventListener('click', () => switchTab('list'));

// Default date today
(function setDefaultDate(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  dateEl.value = `${yyyy}-${mm}-${dd}`;
})();

// Photo preview handling
photoEl.addEventListener('change', () => {
  const file = photoEl.files && photoEl.files[0];
  if (!file) { photoPreview.classList.add('hidden'); return; }
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  photoPreview.classList.remove('hidden');
});
clearPhotoBtn.addEventListener('click', () => {
  photoEl.value = '';
  previewImg.src = '';
  photoPreview.classList.add('hidden');
});

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

async function fileToBlob(input) {
  const file = input.files && input.files[0];
  if (!file) return null;
  return file.slice(0, file.size, file.type);
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = uuid();
  const title = titleEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const date = dateEl.value; // YYYY-MM-DD
  const employeeExpense = !!employeeExpenseEl.checked;
  const settled = !!(settledEl && settledEl.checked);
  const sentToAccounting = !!(sentToAccountingEl && sentToAccountingEl.checked);
  const photoBlob = await fileToBlob(photoEl);

  if (!title || isNaN(amount) || !date) return;

  const inv = { id, title, amount, date, employeeExpense, settled, sentToAccounting, photoType: photoBlob?.type || null };

  // Store record first
  await dbAdd(inv);

  // Store photo as separate blob in a secondary store alternative? We'll store inside the same record using put with blob
  if (photoBlob) {
    const full = { ...inv, photoBlob };
    await dbPut(full);
  }

  addForm.reset();
  photoPreview.classList.add('hidden');
  switchTab('list');
});

// Simple menu toggle
if (menuToggle && menuPanel) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuPanel.classList.contains('open');
    if (isOpen) {
      menuPanel.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    } else {
      menuPanel.classList.add('open');
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuPanel.classList.contains('open')) return;
    const target = e.target;
    if (menuPanel.contains(target) || menuToggle.contains(target)) return;
    menuPanel.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function serializeInvoicesForExport() {
  const all = await dbGetAll();
  const out = [];
  for (const inv of all) {
    const copy = { ...inv };
    if (copy.photoBlob instanceof Blob) {
      copy.photo = await blobToBase64(copy.photoBlob);
      copy.photoType = copy.photoBlob.type || copy.photoType || null;
      delete copy.photoBlob;
    }
    out.push(copy);
  }
  return { version: 1, exportedAt: new Date().toISOString(), items: out };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataUrl, type) {
  if (!dataUrl) return null;
  const parts = dataUrl.split(',');
  const meta = parts[0] || '';
  const b64 = parts[1] || '';
  const contentType = type || (meta.match(/data:(.*);base64/) || [])[1] || 'application/octet-stream';
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

async function handleExportClick() {
  const payload = await serializeInvoicesForExport();
  const json = JSON.stringify(payload, null, 2);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  downloadTextFile(`invoice-tracker-backup-${ts}.json`, json);
}

async function restoreFromJsonObject(obj) {
  if (!obj || !Array.isArray(obj.items)) {
    throw new Error('Invalid backup file: missing items');
  }
  const restored = [];
  for (const item of obj.items) {
    if (!item || !item.id) continue;
    const copy = { ...item };
    if (copy.photo && !copy.photoBlob) {
      const blob = base64ToBlob(copy.photo, copy.photoType);
      if (blob) copy.photoBlob = blob;
    }
    delete copy.photo;
    restored.push(copy);
  }
  await dbClearAll();
  await dbBulkPut(restored);
}

async function handleImportFile(file) {
  const text = await file.text();
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    alert('Invalid file: not valid JSON!');
    return;
  }
  const ok = confirm('Importing will replace all existing invoices with those from the file. Continue?');
  if (!ok) return;
  try {
    await restoreFromJsonObject(obj);
    await refreshList();
    await refreshSelectionSum();
    alert('Import completed.');
  } catch (e) {
    alert('Failed to import backup.');
  }
}

if (btnExport) {
  btnExport.addEventListener('click', async () => {
    try {
      await handleExportClick();
    } catch (e) {
      alert('Failed to export data.');
    }
    if (menuPanel) {
      menuPanel.classList.remove('open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

if (btnImport && importFileInput) {
  btnImport.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
    if (menuPanel) {
      menuPanel.classList.remove('open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files && importFileInput.files[0];
    if (!file) return;
    await handleImportFile(file);
  });
}

async function refreshList() {
  const all = await dbGetAll();
  // Sort by date desc, then by id desc as tiebreaker
  all.sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.id||'').localeCompare(a.id||''));

  listEl.innerHTML = '';
  if (!all.length) {
    listEmpty.style.display = 'block';
    return;
  }
  listEmpty.style.display = 'none';

  for (const inv of all) {
    const li = document.createElement('li');
    const left = document.createElement('div');
    const right = document.createElement('div');

    const sel = document.createElement('input');
    sel.type = 'checkbox';
    sel.className = 'select';
    sel.checked = selectedIds.has(inv.id);
    sel.addEventListener('click', async (e) => {
      e.stopPropagation();
      setSelected(inv.id, sel.checked);
      await refreshSelectionSum();
    });

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = inv.title;

    const meta = document.createElement('div');
    meta.className = 'meta';
    const amount = isFinite(inv.amount) ? inv.amount.toFixed(2) : inv.amount;
    let extras = '';
    if (inv.employeeExpense) extras += ' • Employee';
    if (inv.settled) extras += ' • Settled';
    if (inv.sentToAccounting) extras += ' • Sent';
    meta.textContent = `${inv.date || ''} • €${amount}${extras}`;

    const leftStack = document.createElement('div');
    leftStack.appendChild(title);
    leftStack.appendChild(meta);

    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10px';

    left.appendChild(sel);
    left.appendChild(leftStack);

    right.textContent = '›';
    right.className = 'meta';

    li.appendChild(left);
    li.appendChild(right);

    if (inv.sentToAccounting && (!inv.employeeExpense || inv.settled)) {
      li.classList.add('sent');
    }

    li.addEventListener('click', () => openDetail(inv.id));

    listEl.appendChild(li);
  }
  await refreshSelectionSum();
}

async function openDetail(id) {
  const inv = await dbGet(id);
  if (!inv) return;
  detailId.value = inv.id;
  detailTitle.value = inv.title || '';
  detailAmount.value = inv.amount != null ? inv.amount : '';
  detailDate.value = inv.date || '';
  detailEmp.checked = !!inv.employeeExpense;
  if (detailSettled) detailSettled.checked = !!inv.settled;
  if (detailSentAcc) detailSentAcc.checked = !!inv.sentToAccounting;

  // Show/hide settled field based on employee flag in detail
  const settledLabel = detailSettled && detailSettled.closest('label');
  if (settledLabel) {
    settledLabel.style.display = detailEmp.checked ? '' : 'none';
  }

  if (inv.photoBlob) {
    const url = URL.createObjectURL(inv.photoBlob);
    detailPhoto.src = url;
    detailPhoto.classList.remove('hidden');
    detailPhotoEmpty.style.display = 'none';
  } else {
    detailPhoto.src = '';
    detailPhoto.classList.add('hidden');
    detailPhotoEmpty.style.display = 'block';
  }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  viewDetail.classList.add('active');
}

backBtn.addEventListener('click', () => {
  switchTab('list');
});

// Toggle Settled visibility on detail when Employee changes
if (detailEmp) {
  detailEmp.addEventListener('change', () => {
    const settledLabel = detailSettled && detailSettled.closest('label');
    if (settledLabel) settledLabel.style.display = detailEmp.checked ? '' : 'none';
  });
}

// Bulk selection actions
if (btnSelectUnsent) {
  btnSelectUnsent.addEventListener('click', async () => {
    const all = await dbGetAll();
    if (selectedIds.size > 0) {
      for (const inv of all) {
        if (selectedIds.has(inv.id) && !inv.sentToAccounting) {
          inv.sentToAccounting = true;
          await dbPut(inv);
        }
      }
    } else {
      for (const inv of all) {
        if (!inv.sentToAccounting) selectedIds.add(inv.id);
      }
    }
    await refreshList();
    await refreshSelectionSum();
  });
}

if (btnSelectUnsettled) {
  btnSelectUnsettled.addEventListener('click', async () => {
    const all = await dbGetAll();
    if (selectedIds.size > 0) {
      for (const inv of all) {
        if (selectedIds.has(inv.id) && inv.employeeExpense && !inv.settled) {
          inv.settled = true;
          await dbPut(inv);
        }
      }
    } else {
      for (const inv of all) {
        if (inv.employeeExpense && !inv.settled) selectedIds.add(inv.id);
      }
    }
    await refreshList();
    await refreshSelectionSum();
  });
}

if (btnClearSelection) {
  btnClearSelection.addEventListener('click', async () => {
    selectedIds.clear();
    await refreshList();
    await refreshSelectionSum();
  });
}

detailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = detailId.value;
  const inv = await dbGet(id);
  if (!inv) return;
  inv.title = detailTitle.value.trim();
  inv.amount = parseFloat(detailAmount.value);
  inv.date = detailDate.value;
  inv.employeeExpense = !!detailEmp.checked;
  inv.settled = !!(detailSettled && detailSettled.checked);
  inv.sentToAccounting = !!(detailSentAcc && detailSentAcc.checked);
  // Do not change inv.photoBlob here
  await dbPut(inv);
  switchTab('list');
});

if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    const id = detailId.value;
    if (!id) return;
    const ok = confirm('Delete this invoice? This cannot be undone.');
    if (!ok) return;
    try {
      await dbDelete(id);
      selectedIds.delete(id);
      await refreshList();
      await refreshSelectionSum();
      switchTab('list');
    } catch (e) {
      alert('Failed to delete. Please try again.');
    }
  });
}

// Initial list
refreshList();
