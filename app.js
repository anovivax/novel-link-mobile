'use strict';
// Novel Link Mobile — All-list modern layout. Compatible with the original web_data.json.
(() => {
  const DATA_URL = 'web_data.json';
  // Retain EXACT key convention used by the previous version so old check marks remain.
  const STORAGE_PREFIX = 'novel-link-copied:v1:';
  const $ = id => document.getElementById(id);
  const list = $('buttonGrid');
  const state = { records: [], category: 'all', status: 'all', query: '', generatedAt: '-', toastTimer: null, loadError: false };
  const categoryNames = {green:'Darkness Novel',blue:'แปลนิยายตามใจฉัน',red:'Twilight Novel'};
  const escapeFallback = value => String(value ?? '').trim();
  const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
  const num = n => Number(n).toLocaleString('th-TH');

  function showToast(message, isError = false) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }
  function stableKey(record) {
    const id = record.id || `${record.category}-${record.code}-${record.title}`;
    return `${STORAGE_PREFIX}${id}`;
  }
  function isDone(record) {
    try { return localStorage.getItem(stableKey(record)) === '1'; }
    catch { return false; }
  }
  function setDone(record, done) {
    try {
      if (done) localStorage.setItem(stableKey(record), '1');
      else localStorage.removeItem(stableKey(record));
      return true;
    } catch {
      showToast('ไม่สามารถเก็บสถานะได้ ตรวจการอนุญาต Storage', true);
      return false;
    }
  }
  function formatCopyText(record) {
    if (typeof record.copy_text === 'string' && record.copy_text.trim()) return record.copy_text;
    return [
      `[เสียงเก่า] ${record.title || ''}`,
      record.old_link || '',
      `[เสียงใหม่] ${record.title || ''}`,
      record.new_link || ''
    ].join('\n');
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch {}
    }
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    Object.assign(box.style, {position:'fixed',top:'0',left:'0',width:'1px',height:'1px',opacity:'0'});
    document.body.appendChild(box);
    box.select(); box.setSelectionRange(0, box.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    box.remove();
    return ok;
  }
  function timestamp(record) {
    const value = String(record.created_at || record.date || '').trim();
    if (!value) return Number.NEGATIVE_INFINITY;
    const t = Date.parse(value.replace(' ', 'T'));
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  }
  function normalize(records) {
    return records.filter(r => r && typeof r === 'object').map((record, index) => ({...record,_originalIndex:index}))
      .sort((a,b) => (timestamp(b) - timestamp(a)) || (a._originalIndex - b._originalIndex));
  }
  function visibleRecords() {
    const q = state.query.trim().toLocaleLowerCase('th');
    return state.records.filter(record => {
      if (state.category !== 'all' && record.category !== state.category) return false;
      if (state.status === 'done' && !isDone(record)) return false;
      if (state.status === 'pending' && isDone(record)) return false;
      if (q && ![record.code, record.title, record.category_name || categoryNames[record.category] || '',record.date]
        .some(v => String(v || '').toLocaleLowerCase('th').includes(q))) return false;
      return true;
    });
  }
  function refreshStats() {
    const all = state.records;
    const done = all.reduce((sum,record) => sum + (isDone(record) ? 1 : 0),0);
    $('statTotal').textContent = num(all.length);
    $('statDone').textContent = num(done);
    $('statPending').textContent = num(all.length - done);
  }
  function decorateRow(row, record) {
    const done = isDone(record);
    const copyButton = row.querySelector('.record-copy');
    const doneButton = row.querySelector('.done-button');
    const desc = row.querySelector('.record-desc');
    copyButton.classList.toggle('is-done',done);
    doneButton.classList.toggle('is-done',done);
    doneButton.setAttribute('aria-pressed',String(done));
    doneButton.setAttribute('aria-label', `${done ? 'ยกเลิกทำแล้ว' : 'ทำเครื่องหมายว่าเสร็จแล้ว'} รหัส ${record.code}`);
    doneButton.querySelector('span').textContent = done ? 'ทำแล้ว' : 'ยังไม่ทำ';
    desc.textContent = done ? '✓ คัดลอกหรือทำเครื่องหมายแล้ว' : 'แตะเพื่อคัดลอกลิงก์';
  }
  function makeRow(record,index) {
    const row = document.createElement('article'); row.className = 'record-row';
    const number = document.createElement('span'); number.className = 'record-num'; number.textContent = num(index + 1).padStart(2,'0');
    const main = document.createElement('div'); main.className = 'record-content';
    const copy = document.createElement('button'); copy.type='button'; copy.className='record-copy';
    copy.title = `คัดลอกเสียงเก่า + เสียงใหม่ ของ ${record.title || record.code}`;
    copy.setAttribute('aria-label',`คัดลอกรหัส ${record.code} ${record.title || ''}`);
    const code = document.createElement('span'); code.className='code-pill'; code.textContent=escapeFallback(record.code);
    const small = document.createElement('small');small.textContent='รหัส';code.prepend(small);
    const texts = document.createElement('span'); texts.className='record-copy-text';
    const title = document.createElement('span'); title.className='record-name'; title.textContent=escapeFallback(record.title)||'(ไม่มีชื่อเรื่อง)';
    const category = document.createElement('span');category.className='record-category';category.dataset.category=record.category||'';
    category.textContent=escapeFallback(record.category_name || categoryNames[record.category] || record.category || 'ไม่ระบุหมวด');
    const desc = document.createElement('span');desc.className='record-desc';
    texts.append(title,category,desc);
    const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');arrow.classList.add('record-arrow');
    arrow.innerHTML='<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>';
    copy.append(code,texts,arrow);main.append(copy);
    const doneButton=document.createElement('button');doneButton.type='button';doneButton.className='done-button';
    const doneIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');doneIcon.setAttribute('viewBox','0 0 24 24');doneIcon.setAttribute('aria-hidden','true');doneIcon.innerHTML='<path d="m5 12 4 4L19 6"/>';
    doneButton.append(doneIcon,document.createElement('span'));
    row.append(number,main,doneButton);
    decorateRow(row,record);

    copy.addEventListener('click', async () => {
      const success = await copyText(formatCopyText(record));
      if (!success) { showToast('ไม่สามารถคัดลอกได้ กรุณาอนุญาตคลิปบอร์ด',true); return; }
      setDone(record,true);
      decorateRow(row,record); refreshStats();
      if (state.status !== 'all') render();
      showToast(`คัดลอกรหัส ${record.code} แล้ว`);
    });
    doneButton.addEventListener('click', () => {
      const next = !isDone(record);
      if (!setDone(record,next)) return;
      decorateRow(row,record); refreshStats();
      if (state.status !== 'all') render();
      showToast(next ? `✓ ทำเครื่องหมายรหัส ${record.code} แล้ว` : `ยกเลิกเครื่องหมายรหัส ${record.code} แล้ว`);
    });
    return row;
  }
  function render() {
    const records = visibleRecords();
    const fragment = document.createDocumentFragment();
    records.forEach((record,index) => fragment.append(makeRow(record,index)));
    list.replaceChildren(fragment);
    list.hidden = records.length === 0;
    $('emptyState').hidden = records.length !== 0;
    $('emptyState').textContent = state.loadError ? 'โหลดข้อมูลไม่สำเร็จ กรุณากดรีเฟรช' : 'ไม่พบรายการตามคำค้นหาหรือตัวกรองนี้';
    $('countText').textContent = `${num(records.length)} รายการ`;
    $('listSummary').textContent = `แสดง ${num(records.length)} จาก ${num(state.records.length)} รายการ`;
    $('lastUpdated').textContent = `อัปเดตข้อมูล: ${state.generatedAt}`;
    refreshStats();
  }
  async function loadData({quiet=false}={}) {
    const refresh = $('refreshBtn'); refresh.disabled=true;
    if(!quiet) $('countText').textContent='กำลังโหลด...';
    try {
      const resp = await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
      if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const input = Array.isArray(json) ? json : json.records;
      if(!Array.isArray(input)) throw new Error('ไม่พบ records ใน web_data.json');
      state.records=normalize(input);state.generatedAt=Array.isArray(json)?'-':(json.generated_at||'-');
      state.loadError=false;render();
      if(!quiet) showToast(`โหลดข้อมูลแล้ว ${num(state.records.length)} รายการ`);
    } catch(err) {
      state.loadError=true;render();showToast(`โหลดข้อมูลไม่ได้: ${err.message}`,true);
    } finally {refresh.disabled=false;}
  }
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    state.category=btn.dataset.category;
    document.querySelectorAll('.tab').forEach(b=>{const yes=b===btn;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
    render();
  }));
  document.querySelectorAll('.state-tab').forEach(btn=>btn.addEventListener('click',()=>{
    state.status=btn.dataset.state;
    document.querySelectorAll('.state-tab').forEach(b=>{const yes=b===btn;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
    render();
  }));
  let searchTimer;
  $('searchInput').addEventListener('input',(e)=>{
    state.query=e.target.value;
    clearTimeout(searchTimer);
    searchTimer=setTimeout(render,90);
  });
  $('refreshBtn').addEventListener('click',()=>loadData());
  window.addEventListener('storage',(e)=>{if(e.key?.startsWith(STORAGE_PREFIX)){render();}});
  loadData({quiet:true});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
