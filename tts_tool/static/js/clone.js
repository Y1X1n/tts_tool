/* ============================================
   TTS Studio — Voice Clone
   ============================================ */

function setupVoiceClone() {
  dom.cloneRefText.addEventListener('input', () => {
    dom.cloneCharCount.textContent = `${dom.cloneRefText.value.length} 字`;
  });
  dom.cloneUploadZone.addEventListener('click', () => dom.cloneAudio.click());
  dom.cloneAudio.addEventListener('change', () => {
    const file = dom.cloneAudio.files[0];
    if (file) { dom.cloneFileLabel.textContent = file.name; dom.cloneUploadZone.classList.add('has-file'); }
  });
  dom.cloneUploadZone.addEventListener('dragover', e => { e.preventDefault(); dom.cloneUploadZone.classList.add('dragover'); });
  dom.cloneUploadZone.addEventListener('dragleave', () => dom.cloneUploadZone.classList.remove('dragover'));
  dom.cloneUploadZone.addEventListener('drop', e => {
    e.preventDefault();
    dom.cloneUploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      dom.cloneAudio.files = e.dataTransfer.files;
      dom.cloneFileLabel.textContent = file.name;
      dom.cloneUploadZone.classList.add('has-file');
    }
  });
  dom.cloneBtn.addEventListener('click', cloneVoice);
  $$('.filter-btn', dom.cloneFilter).forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn', dom.cloneFilter).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cloneFilter = btn.dataset.filter;
      state.clonePage = 1;
      fetchCloneList();
    });
  });
}

async function cloneVoice() {
  const model = dom.cloneModel.value.trim();
  if (!model) { showToast('请输入模型名称', 'error'); return; }
  const file = dom.cloneAudio.files[0];
  if (!file) { showToast('请上传参考音频', 'error'); return; }

  dom.cloneBtn.classList.add('generating');
  dom.cloneBtn.innerHTML = `<span class="status-spinner"></span> 克隆中...`;
  dom.cloneStatusBar.hidden = false;
  dom.cloneStatusText.textContent = '正在克隆音色...';
  dom.cloneStatusSpinner.hidden = false;

  const form = new FormData();
  form.append('audio', file);
  form.append('model', model);
  form.append('voice_name', dom.cloneName.value.trim());
  form.append('ref_text', dom.cloneRefText.value.trim());

  try {
    const res = await fetch('/api/voice/clone', { method: 'POST', body: form });
    if (!res.ok) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try { const err = await res.json(); msg = err.detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    dom.cloneStatusText.textContent = '克隆完成';
    const src = `/api/voice/audio/${data.filename}`;
    dom.cloneAudioPlayer.src = src;
    dom.cloneDownloadLink.href = src;
    dom.cloneDownloadLink.download = data.filename;
    dom.clonePlayerCard.hidden = false;
    dom.cloneAudioPlayer.play();
    showToast('音色克隆完成', 'success');
    fetchCloneList();
    loadVoiceList();
    dom.cloneAudio.value = '';
    dom.cloneFileLabel.textContent = '点击或拖拽上传参考音频';
    dom.cloneUploadZone.classList.remove('has-file');
  } catch (e) {
    showToast(e.message || '克隆失败', 'error');
    dom.cloneStatusText.textContent = e.message || '克隆失败';
  } finally {
    dom.cloneBtn.classList.remove('generating');
    dom.cloneBtn.innerHTML = `<span class="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></span> 开始克隆`;
    dom.cloneStatusSpinner.hidden = true;
    setTimeout(() => { if (dom.cloneStatusText.textContent === '克隆完成') dom.cloneStatusBar.hidden = true; }, 4000);
  }
}

async function fetchCloneList(page = 1) {
  state.clonePage = page;
  const fav = state.cloneFilter === 'fav' ? 1 : 0;
  try {
    const res = await fetch(`/api/voice/clone-list?page=${page}&size=20&favorite=${fav}`);
    const data = await res.json();
    dom.cloneFilter.hidden = fav === 0 && data.total === 0;
    if (data.items.length === 0) {
      dom.cloneVoiceList.innerHTML = '';
      dom.cloneEmpty.hidden = false;
      dom.cloneEmpty.querySelector('p').textContent = fav ? '暂无收藏音色' : '暂无克隆音色';
      dom.clonePagination.hidden = true;
      return;
    }
    dom.cloneEmpty.hidden = true;
    state.cloneTotal = data.total;

    dom.cloneVoiceList.innerHTML = data.items.map((item, i) => `
      <div class="voice-item">
        <span class="vi-index">#${(page - 1) * 20 + i + 1}</span>
        <span class="vi-name" title="${escapeHtml(item.voice_name || item.filename || '')}">${escapeHtml(item.voice_name || item.filename || '')}</span>
        <span class="vi-model">${escapeHtml(item.model || '')}</span>
        <span class="vi-time">${formatTime(item.created_at)}</span>
        <div class="vi-actions">
          ${item.filename ? `<button class="btn btn-ghost btn-sm play-history-btn" data-filename="${escapeHtml(item.filename)}" title="播放">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
          </button>` : ''}
          <button class="favorite-btn ${item.favorited ? 'favorited' : ''}" data-id="${item.id}" data-fav="${item.favorited}" title="收藏">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${item.favorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          </button>
          <button class="btn btn-danger delete-voice-btn" data-id="${item.id}" data-type="clone" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    $$('.play-history-btn', dom.cloneVoiceList).forEach(btn => {
      btn.addEventListener('click', () => {
        dom.cloneAudioPlayer.src = `/api/voice/audio/${btn.dataset.filename}`;
        dom.clonePlayerCard.hidden = false;
        dom.cloneAudioPlayer.play();
      });
    });
    $$('.favorite-btn', dom.cloneVoiceList).forEach(btn => {
      btn.addEventListener('click', () => toggleFavorite(btn.dataset.id, btn.dataset.fav !== '1'));
    });
    $$('.delete-voice-btn', dom.cloneVoiceList).forEach(btn => {
      btn.addEventListener('click', () => deleteVoiceItem(btn.dataset.id, btn.dataset.type));
    });
    renderVoicePagination(data, 'clone');
  } catch (e) {
    dom.cloneEmpty.hidden = false;
    dom.cloneEmpty.querySelector('p').textContent = '加载失败';
  }
}

async function toggleFavorite(id, fav) {
  try {
    const res = await fetch(`/api/voice/clone/${id}/favorite`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorited: fav }),
    });
    if (res.ok) { fetchCloneList(state.clonePage); }
    else { showToast('操作失败', 'error'); }
  } catch (e) { showToast('操作失败', 'error'); }
}
