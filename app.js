const DATA_URL = 'web_data.json';
const STORAGE_PREFIX = 'novel-link-copied:v1:';

let allRecords = [];
let activeCategory = 'green';
let generatedAt = '-';
let toastTimer = null;

const tabs = [...document.querySelectorAll('.tab')];
const datePicker = document.getElementById('datePicker');
const buttonGrid = document.getElementById('buttonGrid');
const emptyState = document.getElementById('emptyState');
const countText = document.getElementById('countText');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const resetCopiedBtn = document.getElementById('resetCopiedBtn');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function storageKey(record) {
  const stableId = record.id || `${record.category}-${record.code}-${record.title}`;
  return `${STORAGE_PREFIX}${stableId}`;
}

function isCopied(record) {
  return localStorage.getItem(storageKey(record)) === '1';
}

function setCopied(record, value) {
  if (value) {
    localStorage.setItem(storageKey(record), '1');
  } else {
    localStorage.removeItem(storageKey(record));
  }
}

function getCategoryRecords(category = activeCategory) {
  return allRecords.filter(record => record.category === category);
}

function availableDates(category = activeCategory) {
  return [...new Set(
    getCategoryRecords(category)
      .map(record => record.date)
      .filter(Boolean)
  )].sort().reverse();
}

function ensureDateForCategory() {
  const dates = availableDates();
  if (!dates.length) {
    datePicker.value = '';
    return;
  }
  if (!datePicker.value || !dates.includes(datePicker.value)) {
    datePicker.value = dates[0];
  }
}

function numericCodeSort(a, b) {
  const na = Number.parseInt(a.code, 10);
  const nb = Number.parseInt(b.code, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a.code).localeCompare(String(b.code), 'th', { numeric: true });
}

function currentRecords() {
  const selectedDate = datePicker.value;
  return allRecords
    .filter(record => record.category === activeCategory && record.date === selectedDate)
    .sort(numericCodeSort);
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (_) {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function render() {
  const records = currentRecords();
  buttonGrid.innerHTML = '';

  for (const record of records) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-button';
    button.dataset.category = record.category || activeCategory;
    button.textContent = record.code;
    button.title = record.title || record.code;
    button.setAttribute('aria-label', `${record.code} ${record.title || ''}`.trim());

    if (isCopied(record)) button.classList.add('copied');

    button.addEventListener('click', async () => {
      const text = record.copy_text || [
        `[เสียงเก่า] ${record.title || ''}`,
        record.old_link || '',
        `[เสียงใหม่] ${record.title || ''}`,
        record.new_link || ''
      ].join('\n');

      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(record, true);
        button.classList.add('copied');
        showToast(`คัดลอกรหัส ${record.code} แล้ว`);
      } else {
        showToast('คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    });

    buttonGrid.appendChild(button);
  }

  countText.textContent = `${records.length.toLocaleString('th-TH')} รายการ`;
  emptyState.hidden = records.length !== 0;
  buttonGrid.hidden = records.length === 0;
  lastUpdated.textContent = `อัปเดตข้อมูล: ${generatedAt || '-'}`;
}

async function loadData({ quiet = false } = {}) {
  refreshBtn.disabled = true;
  if (!quiet) countText.textContent = 'กำลังโหลด...';

  try {
    const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allRecords = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
    generatedAt = Array.isArray(data) ? '-' : (data.generated_at || '-');
    ensureDateForCategory();
    render();
    if (!quiet) showToast('รีเฟรชข้อมูลแล้ว');
  } catch (error) {
    buttonGrid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.textContent = `โหลดข้อมูลไม่สำเร็จ: ${error.message}`;
    countText.textContent = 'โหลดไม่สำเร็จ';
  } finally {
    refreshBtn.disabled = false;
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeCategory = tab.dataset.category;
    tabs.forEach(item => item.classList.toggle('active', item === tab));
    ensureDateForCategory();
    render();
  });
});

datePicker.addEventListener('change', render);
refreshBtn.addEventListener('click', () => loadData());

resetCopiedBtn.addEventListener('click', () => {
  const records = currentRecords();
  for (const record of records) setCopied(record, false);
  render();
  showToast('ล้างสีปุ่มของวันนี้แล้ว');
});

loadData({ quiet: true });

// Register PWA service worker for Add to Home Screen / standalone app shell.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // ถ้าลงทะเบียนไม่ได้ เว็บยังใช้งานคัดลอกลิงก์ได้ตามปกติ
    });
  });
}
