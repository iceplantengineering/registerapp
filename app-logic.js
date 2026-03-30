// ─── STATE ───
let curCat = null, curNo = null, curCatId = null, curIdx = -1;

function totalItems() { return DB.reduce((a, c) => a + c.items.length, 0); }

// ─── HOME ───
function renderHome() {
    switchView('view-home'); setNavActive('nav-home');
    document.getElementById('head-title').textContent = 'レジ操作ガイド';
    hideSwipeHint();
    const total = totalItems();
    let html = `
    <div class="hero-banner">
      <div class="hero-title">レジ操作ガイド</div>
      <div class="hero-sub">スマートフォンでいつでも確認できるレジ操作マニュアル</div>
      <div class="hero-count">${DB.length} カテゴリ ・ ${total} 項目</div>
    </div>
    <div class="section-hd">カテゴリ</div>
    <div class="cat-grid">`;
    DB.forEach(cat => {
        html += `
      <div class="cat-card" style="--cat-color:${cat.color}" onclick="showList('${cat.id}')">
        <div class="cat-icon">${cat.icon}</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-sub">${cat.sub}</div>
        <div class="cat-count">${cat.items.length}項目</div>
      </div>`;
    });
    html += '</div>';
    document.getElementById('view-home').innerHTML = html;
}

// ─── LIST ───
function showList(catId) {
    curCat = DB.find(c => c.id === catId);
    curCatId = catId;
    document.getElementById('list-icon').textContent = curCat.icon;
    document.getElementById('list-title').textContent = curCat.name;
    document.getElementById('search-input').value = '';
    document.getElementById('head-title').textContent = curCat.name;
    renderListItems(curCat.items);
    switchView('view-list'); setNavActive(''); hideSwipeHint();
}
function renderListItems(items) {
    document.getElementById('list-count').textContent = `${items.length}項目`;
    document.getElementById('list-body').innerHTML = items.map(item => {
        const tags = [...new Set(item.ops)].map(o => `<div class="op-dot ${o}"></div>`).join('');
        return `
      <div class="item-card" onclick="showDetail('${curCat?.id || '__search'}',${JSON.stringify(item.no)})">
        <div class="item-no">No.${item.no}</div>
        <div class="item-text">${item.t}</div>
        <div class="op-tags">${tags}</div>
        <div class="item-arrow">▶</div>
      </div>`;
    }).join('') || '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">該当なし</div></div>';
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-input').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        if (!curCat) return;
        const filtered = curCat.items.filter(i =>
            i.t.toLowerCase().includes(q) || String(i.no).includes(q) || i.s.some(s => s.m.toLowerCase().includes(q))
        );
        renderListItems(filtered);
    });
});

// ─── GLOBAL SEARCH ───
function showGlobalSearch() {
    curCat = { id: '__search', name: '全体検索', items: DB.flatMap(c => c.items) };
    curCatId = '__search';
    document.getElementById('list-icon').textContent = '🔍';
    document.getElementById('list-title').textContent = '全項目検索';
    document.getElementById('search-input').value = '';
    document.getElementById('head-title').textContent = '全体検索';
    renderListItems(curCat.items);
    switchView('view-list'); setNavActive('nav-search');
    setTimeout(() => document.getElementById('search-input').focus(), 100);
    hideSwipeHint();
}

// ─── DETAIL ───
function showDetail(catId, no) {
    const cat = DB.find(c => c.id === catId);
    const srcCat = catId === '__search' ? { items: DB.flatMap(c => c.items) } : cat;
    const item = srcCat.items.find(i => i.no === no);
    if (!item) return;

    curCatId = catId; curNo = no;
    curIdx = srcCat.items.findIndex(i => i.no === no);

    const badgeLabel = { R: 'レジ操作', J: 'J-Mups端末', P: 'お客様/PayPay' };
    const steps = item.s.map((s, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <div class="badge b-${s.h}">${badgeLabel[s.h] || s.h}</div>
        <div class="step-text">${s.m}</div>
      </div>
      ${i < item.s.length - 1 ? '<div class="step-connector"></div>' : ''}
    </div>`).join('');

    const noteHtml = item.n ? `
    <div class="note-box">
      <div class="note-label">💡 備考・注意</div>
      <div class="note-text">${item.n}</div>
    </div>`: '';

    const prev = srcCat.items[curIdx - 1];
    const next = srcCat.items[curIdx + 1];

    document.getElementById('det-body').innerHTML = `
    <div class="det-header">
      <div class="det-no">No.${item.no}</div>
      <div class="det-title">${item.t}</div>
    </div>
    <div class="steps-container">${steps}</div>
    ${noteHtml}
    <div class="det-nav">
      ${prev ? `<button class="det-nav-btn" onclick="showDetail('${catId}',${JSON.stringify(prev.no)})">◀ No.${prev.no}</button>` : '<div></div>'}
      ${next ? `<button class="det-nav-btn" onclick="showDetail('${catId}',${JSON.stringify(next.no)})">No.${next.no} ▶</button>` : '<div></div>'}
    </div>`;
    document.getElementById('head-title').textContent = `No.${item.no} ${item.t}`;
    switchView('view-det'); setNavActive('');
    if (prev || next) showSwipeHint(); else hideSwipeHint();
    setupSwipeGestures();
}

// ─── SWIPE ───
let touchStartX = 0, touchEndX = 0;
function setupSwipeGestures() {
    const view = document.getElementById('view-det');
    view.removeEventListener('touchstart', handleTouchStart);
    view.removeEventListener('touchend', handleTouchEnd);
    view.addEventListener('touchstart', handleTouchStart, { passive: true });
    view.addEventListener('touchend', handleTouchEnd, { passive: true });
}
function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }
function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 80) return;
    const cat = curCatId === '__search' ? { items: DB.flatMap(c => c.items) } : DB.find(c => c.id === curCatId);
    if (!cat) return;
    if (diff > 0 && curIdx < cat.items.length - 1) { const next = cat.items[curIdx + 1]; if (next) showDetail(curCatId, next.no); }
    else if (diff < 0 && curIdx > 0) { const prev = cat.items[curIdx - 1]; if (prev) showDetail(curCatId, prev.no); }
}
function showSwipeHint() { const h = document.getElementById('swipe-hint'); if (h) h.classList.add('show'); setTimeout(hideSwipeHint, 3000); }
function hideSwipeHint() { const h = document.getElementById('swipe-hint'); if (h) h.classList.remove('show'); }

// ─── NAV ───
function switchView(id) {
    ['view-home', 'view-list', 'view-det'].forEach(v => document.getElementById(v).classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
}
function setNavActive(id) {
    ['nav-home', 'nav-search', 'nav-back'].forEach(n => document.getElementById(n).classList.toggle('active', n === id));
}
function goBack() {
    const activeId = document.querySelector('.view.active').id;
    if (activeId === 'view-det') { if (curCatId && curCatId !== '__search') showList(curCatId); else renderHome(); }
    else if (activeId === 'view-list') renderHome();
    else renderHome();
}

// ─── INIT ───
initTheme();
renderHome();
