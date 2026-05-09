/* ============================================
   TTS Studio — Voice Design
   ============================================ */

function setupVoiceDesign() {
  dom.designPrompt.addEventListener('input', () => {
    dom.designCharCount.textContent = `${dom.designPrompt.value.length} 字`;
  });
  dom.designBtn.addEventListener('click', designVoice);
}

async function designVoice() {
  const model = dom.designModel.value.trim();
  if (!model) { showToast('请输入模型名称', 'error'); return; }
  const prompt = dom.designPrompt.value.trim();
  if (!prompt) { showToast('请输入提示词', 'error'); return; }

  dom.designBtn.classList.add('generating');
  dom.designBtn.innerHTML = `<span class="status-spinner"></span> 生成中...`;
  dom.designStatusBar.hidden = false;
  dom.designStatusText.textContent = '正在生成音色...';
  dom.designStatusSpinner.hidden = false;

  try {
    const res = await fetch('/api/voice/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, voice_name: dom.designName.value.trim() }),
    });
    if (!res.ok) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try { const err = await res.json(); msg = err.detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    dom.designStatusText.textContent = '生成完成';
    const src = `/api/voice/audio/${data.filename}`;
    dom.designAudioPlayer.src = src;
    dom.designDownloadLink.href = src;
    dom.designDownloadLink.download = data.filename;
    dom.designPlayerCard.hidden = false;
    dom.designAudioPlayer.play();
    showToast('音色生成完成', 'success');
    fetchDesignList();
    loadVoiceList();
  } catch (e) {
    showToast(e.message || '生成失败', 'error');
    dom.designStatusText.textContent = e.message || '生成失败';
  } finally {
    dom.designBtn.classList.remove('generating');
    dom.designBtn.innerHTML = `<span class="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span> 生成音色`;
    dom.designStatusSpinner.hidden = true;
    setTimeout(() => { if (dom.designStatusText.textContent === '生成完成') dom.designStatusBar.hidden = true; }, 4000);
  }
}

async function fetchDesignList(page = 1) {
  state.designPage = page;
  try {
    const res = await fetch(`/api/voice/design-list?page=${page}&size=20`);
    const data = await res.json();
    if (data.items.length === 0) {
      dom.designVoiceList.innerHTML = '';
      dom.designEmpty.hidden = false;
      dom.designPagination.hidden = true;
      return;
    }
    dom.designEmpty.hidden = true;
    state.designTotal = data.total;

    dom.designVoiceList.innerHTML = data.items.map((item, i) => `
      <div class="voice-item">
        <span class="vi-index">#${(page - 1) * 20 + i + 1}</span>
        <span class="vi-name" title="${escapeHtml(item.voice_name || item.filename || '')}">${escapeHtml(item.voice_name || item.filename || '')}</span>
        <span class="vi-model">${escapeHtml(item.model || '')}</span>
        <span class="vi-time">${formatTime(item.created_at)}</span>
        <div class="vi-actions">
          ${item.filename ? `<button class="btn btn-ghost btn-sm play-history-btn" data-filename="${escapeHtml(item.filename)}" title="播放">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
          </button>` : ''}
          <button class="btn btn-danger delete-voice-btn" data-id="${item.id}" data-type="design" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    $$('.play-history-btn', dom.designVoiceList).forEach(btn => {
      btn.addEventListener('click', () => {
        dom.designAudioPlayer.src = `/api/voice/audio/${btn.dataset.filename}`;
        dom.designPlayerCard.hidden = false;
        dom.designAudioPlayer.play();
      });
    });
    $$('.delete-voice-btn', dom.designVoiceList).forEach(btn => {
      btn.addEventListener('click', () => deleteVoiceItem(btn.dataset.id, btn.dataset.type));
    });
    renderVoicePagination(data, 'design');
  } catch (e) {
    dom.designEmpty.hidden = false;
    dom.designEmpty.querySelector('p').textContent = '加载失败';
  }
}

// ---- Shared voice helpers ----
async function deleteVoiceItem(id, type) {
  const endpoint = type === 'clone' ? `/api/voice/clone/${id}` : `/api/voice/design/${id}`;
  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (res.ok) {
      showToast('已删除', 'success');
      if (type === 'clone') fetchCloneList(state.clonePage);
      else fetchDesignList(state.designPage);
      loadVoiceList();
    } else { showToast('删除失败', 'error'); }
  } catch (e) { showToast('删除失败', 'error'); }
}

function renderVoicePagination(data, type) {
  const pagEl = type === 'clone' ? dom.clonePagination : dom.designPagination;
  const fetchFn = type === 'clone' ? fetchCloneList : fetchDesignList;
  const totalPages = Math.ceil(data.total / data.size);
  if (totalPages <= 1) { pagEl.hidden = true; return; }
  pagEl.hidden = false;

  let html = `<button class="btn btn-ghost btn-sm" ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}">上一页</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === data.page) html += `<button class="btn btn-sm active">${p}</button>`;
    else if (Math.abs(p - data.page) <= 2 || p === 1 || p === totalPages) html += `<button class="btn btn-ghost btn-sm" data-page="${p}">${p}</button>`;
    else if (p === data.page + 3 || p === data.page - 3) html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
  }
  html += `<button class="btn btn-ghost btn-sm" ${data.page >= totalPages ? 'disabled' : ''} data-page="${data.page + 1}">下一页</button>`;
  pagEl.innerHTML = html;
  $$('.btn[data-page]', pagEl).forEach(btn => {
    btn.addEventListener('click', () => fetchFn(parseInt(btn.dataset.page)));
  });
}
