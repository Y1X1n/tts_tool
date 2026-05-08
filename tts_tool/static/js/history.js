/* ============================================
   TTS Studio — History
   ============================================ */

function setupHistory() {
  // loaded on tab switch
}

async function fetchHistory(page = 1) {
  state.historyPage = page;
  try {
    const res = await fetch(`/api/history?page=${page}&size=20`);
    const data = await res.json();
    if (data.items.length === 0) {
      dom.historyList.innerHTML = '';
      dom.historyEmpty.hidden = false;
      dom.pagination.hidden = true;
      return;
    }
    dom.historyEmpty.hidden = true;
    state.historyTotal = data.total;

    dom.historyList.innerHTML = data.items.map((item, i) => `
      <div class="history-item">
        <span class="hi-index">#${(page - 1) * 20 + i + 1}</span>
        <span class="hi-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text.slice(0, 60))}</span>
        <span class="hi-voice">${escapeHtml(item.voice)}</span>
        <span class="hi-time">${formatTime(item.created_at)}</span>
        <div class="hi-actions">
          <button class="btn btn-ghost btn-sm play-btn" data-filename="${escapeHtml(item.filename)}" title="播放">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="btn btn-danger delete-btn" data-id="${item.id}" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    $$('.play-btn', dom.historyList).forEach(btn => {
      btn.addEventListener('click', () => playHistoryItem(btn.dataset.filename));
    });
    $$('.delete-btn', dom.historyList).forEach(btn => {
      btn.addEventListener('click', () => deleteHistoryItem(btn.dataset.id));
    });
    renderPagination(data);
  } catch (e) {
    dom.historyEmpty.hidden = false;
    dom.historyEmpty.querySelector('p').textContent = '加载失败';
  }
}

function playHistoryItem(filename) {
  dom.audioPlayer.src = `/api/tts/audio/${filename}`;
  dom.playerCard.hidden = false;
  dom.audioPlayer.play();
  dom.tabs[0].click();
}

async function deleteHistoryItem(id) {
  try {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('已删除', 'success');
      fetchHistory(state.historyPage);
    } else {
      showToast('删除失败', 'error');
    }
  } catch (e) {
    showToast('删除失败', 'error');
  }
}

function renderPagination(data) {
  const totalPages = Math.ceil(data.total / data.size);
  if (totalPages <= 1) { dom.pagination.hidden = true; return; }
  dom.pagination.hidden = false;

  let html = `<button class="btn btn-ghost btn-sm" ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}">上一页</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === data.page) html += `<button class="btn btn-sm active">${p}</button>`;
    else if (Math.abs(p - data.page) <= 2 || p === 1 || p === totalPages) html += `<button class="btn btn-ghost btn-sm" data-page="${p}">${p}</button>`;
    else if (p === data.page + 3 || p === data.page - 3) html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
  }
  html += `<button class="btn btn-ghost btn-sm" ${data.page >= totalPages ? 'disabled' : ''} data-page="${data.page + 1}">下一页</button>`;
  dom.pagination.innerHTML = html;
  $$('.btn[data-page]', dom.pagination).forEach(btn => {
    btn.addEventListener('click', () => fetchHistory(parseInt(btn.dataset.page)));
  });
}
