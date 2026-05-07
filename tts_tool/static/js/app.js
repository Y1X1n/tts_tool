/* ============================================
   TTS Studio — Application Logic
   ============================================ */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---- State ----
let state = {
  generating: false,
  historyPage: 1,
  historyTotal: 0,
  clonePage: 1,
  cloneTotal: 0,
  cloneFilter: 'all',
  designPage: 1,
  designTotal: 0,
};

// ---- DOM refs ----
const dom = {
  tabs: $$('.tab'),
  panels: $$('.panel'),

  // Settings
  settingsCard: $('#settingsCard'),
  settingsStatus: $('#settingsStatus'),
  apiUrl: $('#apiUrl'),
  apiKey: $('#apiKey'),
  togglePw: $('#togglePw'),
  saveConfig: $('#saveConfig'),
  configMsg: $('#configMsg'),

  // Input
  textInput: $('#textInput'),
  charCount: $('#charCount'),
  fileUpload: $('#fileUpload'),

  // Controls
  voiceInput: $('#voiceInput'),
  speedSlider: $('#speedSlider'),
  speedVal: $('#speedVal'),
  pitchSlider: $('#pitchSlider'),
  pitchVal: $('#pitchVal'),

  // Generate
  generateBtn: $('#generateBtn'),
  statusBar: $('#statusBar'),
  statusText: $('#statusText'),
  statusSpinner: $('#statusSpinner'),

  // Player
  playerCard: $('#playerCard'),
  audioPlayer: $('#audioPlayer'),
  visualizer: $('#visualizer'),
  downloadLink: $('#downloadLink'),

  // History
  historyList: $('#historyList'),
  historyEmpty: $('#historyEmpty'),
  pagination: $('#pagination'),

  // Clone
  cloneModel: $('#cloneModel'),
  cloneName: $('#cloneName'),
  cloneAudio: $('#cloneAudio'),
  cloneUploadZone: $('#cloneUploadZone'),
  cloneFileLabel: $('#cloneFileLabel'),
  cloneRefText: $('#cloneRefText'),
  cloneBtn: $('#cloneBtn'),
  cloneStatusBar: $('#cloneStatusBar'),
  cloneStatusText: $('#cloneStatusText'),
  cloneStatusSpinner: $('#cloneStatusSpinner'),
  cloneFilter: $('#cloneFilter'),
  cloneVoiceList: $('#cloneVoiceList'),
  clonePagination: $('#clonePagination'),
  cloneEmpty: $('#cloneEmpty'),

  // Design
  designModel: $('#designModel'),
  designName: $('#designName'),
  designPrompt: $('#designPrompt'),
  designCharCount: $('#designCharCount'),
  designBtn: $('#designBtn'),
  designStatusBar: $('#designStatusBar'),
  designStatusText: $('#designStatusText'),
  designStatusSpinner: $('#designStatusSpinner'),
  designVoiceList: $('#designVoiceList'),
  designPagination: $('#designPagination'),
  designEmpty: $('#designEmpty'),

  // Voice datalist
  voiceDatalist: $('#voiceDatalist'),

  // Toast
  toastContainer: $('#toastContainer'),
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setupTabs();
  setupSettings();
  setupInput();
  setupControls();
  setupGenerate();
  setupHistory();
  setupVoiceClone();
  setupVoiceDesign();
});

// ============ Tabs ============
function setupTabs() {
  dom.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      dom.panels.forEach(p => p.classList.remove('active'));
      const target = $(`#panel-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
      if (tab.dataset.tab === 'history') fetchHistory();
      if (tab.dataset.tab === 'clone') fetchCloneList();
      if (tab.dataset.tab === 'design') fetchDesignList();
    });
  });
}

// ============ Settings ============
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    if (cfg.api_url) dom.apiUrl.value = cfg.api_url;
    if (cfg.api_key && cfg.api_key.includes('****')) {
      dom.apiKey.placeholder = cfg.api_key;
    }
    updateSettingsStatus(!!cfg.api_url && !!cfg.api_key);
  } catch (e) { /* ignore */ }
  updateVoiceDatalist();
}

function updateSettingsStatus(configured) {
  dom.settingsStatus.textContent = configured ? '已配置' : '未配置';
  dom.settingsStatus.classList.toggle('configured', configured);
}

function setupSettings() {
  dom.saveConfig.addEventListener('click', async () => {
    const apiUrl = dom.apiUrl.value.trim();
    const apiKey = dom.apiKey.value.trim();

    if (!apiUrl || !apiKey) {
      showToast('请填写 API URL 和 Key', 'error');
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_url: apiUrl, api_key: apiKey }),
      });
      if (res.ok) {
        updateSettingsStatus(true);
        dom.configMsg.className = 'config-msg';
        dom.configMsg.textContent = '保存成功';
        dom.settingsCard.open = false;
        showToast('设置已保存', 'success');
      } else {
        const e = await res.json();
        dom.configMsg.className = 'config-msg error';
        dom.configMsg.textContent = e.detail || '保存失败';
      }
    } catch (e) {
      dom.configMsg.className = 'config-msg error';
      dom.configMsg.textContent = '网络错误';
    }
  });

  dom.togglePw.addEventListener('click', () => {
    const isPw = dom.apiKey.type === 'password';
    dom.apiKey.type = isPw ? 'text' : 'password';
    dom.togglePw.style.color = isPw ? 'var(--accent)' : 'var(--text-muted)';
  });
}

// ============ Input ============
function setupInput() {
  dom.textInput.addEventListener('input', () => {
    dom.charCount.textContent = `${dom.textInput.value.length} 字`;
  });

  // File upload
  dom.fileUpload.addEventListener('change', async () => {
    const file = dom.fileUpload.files[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        dom.textInput.value = data.text;
        dom.charCount.textContent = `${data.text.length} 字`;
        showToast(`已加载: ${data.filename}`, 'success');
      } else {
        const e = await res.json();
        showToast(e.detail || '上传失败', 'error');
      }
    } catch (e) {
      showToast('上传失败', 'error');
    }
  });
}

// ============ Controls ============
function setupControls() {
  dom.speedSlider.addEventListener('input', () => {
    dom.speedVal.textContent = parseFloat(dom.speedSlider.value).toFixed(2) + 'x';
  });

  dom.pitchSlider.addEventListener('input', () => {
    const v = parseInt(dom.pitchSlider.value);
    dom.pitchVal.textContent = (v > 0 ? '+' : '') + v;
    dom.pitchVal.style.color = v > 0 ? 'var(--accent)' : v < 0 ? '#60a5fa' : 'var(--accent)';
  });
}

// ============ Generate ============
function setupGenerate() {
  dom.generateBtn.addEventListener('click', generate);
}

async function generate() {
  const text = dom.textInput.value.trim();
  if (!text) {
    showToast('请输入文本', 'error');
    return;
  }

  const voice = dom.voiceInput.value.trim();
  if (!voice) {
    showToast('请输入模型/音色名称', 'error');
    return;
  }

  if (state.generating) return;
  state.generating = true;

  // UI: generating state
  dom.generateBtn.classList.add('generating');
  dom.generateBtn.innerHTML = `<span class="status-spinner"></span> 生成中...`;
  dom.statusBar.hidden = false;
  dom.statusText.textContent = '正在合成语音...';
  dom.statusSpinner.hidden = false;
  dom.playerCard.hidden = true;

  const speed = parseFloat(dom.speedSlider.value);
  const pitch = parseFloat(dom.pitchSlider.value);

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed, pitch }),
    });

    if (!res.ok) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {
        try { msg = await res.text(); } catch (__) {}
      }
      console.error('TTS API error:', msg);
      throw new Error(msg);
    }

    const data = await res.json();

    const audioSrc = `/api/tts/audio/${data.filename}`;
    dom.audioPlayer.src = audioSrc;
    dom.downloadLink.href = audioSrc;
    dom.downloadLink.download = data.filename;
    dom.playerCard.hidden = false;
    dom.statusText.textContent = '生成完成';

    setupVisualizer();
    dom.audioPlayer.play();

    showToast('语音合成完成', 'success');
  } catch (e) {
    console.error('Generate error:', e);
    showToast(e.message || '生成失败', 'error');
    dom.statusText.textContent = e.message || '生成失败';
  } finally {
    state.generating = false;
    dom.generateBtn.classList.remove('generating');
    dom.generateBtn.innerHTML = `<span class="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg></span> 生成语音`;
    dom.statusSpinner.hidden = true;

    setTimeout(() => {
      if (dom.statusText.textContent === '生成完成') {
        dom.statusBar.hidden = true;
      }
    }, 4000);
  }
}

// ============ Visualizer ============
let _visualizerSetup = false;

function setupVisualizer() {
  if (_visualizerSetup) return;
  _visualizerSetup = true;

  const audio = dom.audioPlayer;
  const viz = dom.visualizer;
  const bars = $$('span', viz);

  audio.addEventListener('play', () => {
    viz.classList.add('playing');
    animateBars(bars);
  });

  audio.addEventListener('pause', () => {
    viz.classList.remove('playing');
  });

  audio.addEventListener('ended', () => {
    viz.classList.remove('playing');
  });
}

function animateBars(bars) {
  let frame;

  function tick() {
    if (!dom.visualizer.classList.contains('playing')) {
      cancelAnimationFrame(frame);
      return;
    }
    bars.forEach(bar => {
      const h = 4 + Math.random() * 24;
      bar.style.height = h + 'px';
    });
    frame = requestAnimationFrame(tick);
  }

  tick();
}

// ============ History ============
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

    // Event bindings
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

function setupHistory() {
  // History is loaded on tab switch
}

function playHistoryItem(filename) {
  const src = `/api/tts/audio/${filename}`;
  dom.audioPlayer.src = src;
  dom.playerCard.hidden = false;
  dom.audioPlayer.play();
  // Switch to generate tab for playback
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
  if (totalPages <= 1) {
    dom.pagination.hidden = true;
    return;
  }
  dom.pagination.hidden = false;

  let html = '';
  html += `<button class="btn btn-ghost btn-sm" ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}">上一页</button>`;

  for (let p = 1; p <= totalPages; p++) {
    if (p === data.page) {
      html += `<button class="btn btn-sm active">${p}</button>`;
    } else if (Math.abs(p - data.page) <= 2 || p === 1 || p === totalPages) {
      html += `<button class="btn btn-ghost btn-sm" data-page="${p}">${p}</button>`;
    } else if (p === data.page + 3 || p === data.page - 3) {
      html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
    }
  }

  html += `<button class="btn btn-ghost btn-sm" ${data.page >= totalPages ? 'disabled' : ''} data-page="${data.page + 1}">下一页</button>`;

  dom.pagination.innerHTML = html;

  $$('.btn[data-page]', dom.pagination).forEach(btn => {
    btn.addEventListener('click', () => fetchHistory(parseInt(btn.dataset.page)));
  });
}

// ============ Voice Clone ============
function setupVoiceClone() {
  // Upload zone: click to select file
  dom.cloneUploadZone.addEventListener('click', () => dom.cloneAudio.click());

  // File selected
  dom.cloneAudio.addEventListener('change', () => {
    const file = dom.cloneAudio.files[0];
    if (file) {
      dom.cloneFileLabel.textContent = file.name;
      dom.cloneUploadZone.classList.add('has-file');
    }
  });

  // Drag and drop
  dom.cloneUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.cloneUploadZone.classList.add('dragover');
  });
  dom.cloneUploadZone.addEventListener('dragleave', () => {
    dom.cloneUploadZone.classList.remove('dragover');
  });
  dom.cloneUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.cloneUploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      dom.cloneAudio.files = e.dataTransfer.files;
      dom.cloneFileLabel.textContent = file.name;
      dom.cloneUploadZone.classList.add('has-file');
    }
  });

  // Clone button
  dom.cloneBtn.addEventListener('click', cloneVoice);

  // Filter buttons
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
  if (!model) {
    showToast('请输入模型名称', 'error');
    return;
  }

  const file = dom.cloneAudio.files[0];
  if (!file) {
    showToast('请上传参考音频', 'error');
    return;
  }

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
    showToast(`音色克隆完成: ${data.voice_id}`, 'success');
    fetchCloneList();
    updateVoiceDatalist();
    // Reset file input
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
    setTimeout(() => {
      if (dom.cloneStatusText.textContent === '克隆完成') {
        dom.cloneStatusBar.hidden = true;
      }
    }, 4000);
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
        <span class="vi-name" title="${escapeHtml(item.voice_name || item.voice_id)}">${escapeHtml(item.voice_name || item.voice_id)}</span>
        <span class="vi-id" title="${escapeHtml(item.voice_id)}">${escapeHtml(item.voice_id)}</span>
        <span class="vi-model">${escapeHtml(item.model || '')}</span>
        <span class="vi-time">${formatTime(item.created_at)}</span>
        <div class="vi-actions">
          <button class="favorite-btn ${item.favorited ? 'favorited' : ''}" data-id="${item.id}" data-fav="${item.favorited}" title="收藏">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${item.favorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm use-voice-btn" data-voice-id="${escapeHtml(item.voice_id)}" title="用于合成">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="btn btn-danger delete-voice-btn" data-id="${item.id}" data-type="clone" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Event bindings
    $$('.favorite-btn', dom.cloneVoiceList).forEach(btn => {
      btn.addEventListener('click', () => toggleFavorite(btn.dataset.id, btn.dataset.fav !== '1'));
    });
    $$('.use-voice-btn', dom.cloneVoiceList).forEach(btn => {
      btn.addEventListener('click', () => {
        dom.voiceInput.value = btn.dataset.voiceId;
        dom.tabs.forEach(t => t.classList.remove('active'));
        const genTab = document.querySelector('.tab[data-tab="generate"]');
        if (genTab) genTab.classList.add('active');
        dom.panels.forEach(p => p.classList.remove('active'));
        const genPanel = $('#panel-generate');
        if (genPanel) genPanel.classList.add('active');
        showToast('已填入音色: ' + btn.dataset.voiceId, 'success');
      });
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
    if (res.ok) {
      fetchCloneList(state.clonePage);
    } else {
      showToast('操作失败', 'error');
    }
  } catch (e) {
    showToast('操作失败', 'error');
  }
}

// ============ Voice Design ============
function setupVoiceDesign() {
  dom.designPrompt.addEventListener('input', () => {
    dom.designCharCount.textContent = `${dom.designPrompt.value.length} 字`;
  });

  dom.designBtn.addEventListener('click', designVoice);
}

async function designVoice() {
  const model = dom.designModel.value.trim();
  if (!model) {
    showToast('请输入模型名称', 'error');
    return;
  }

  const prompt = dom.designPrompt.value.trim();
  if (!prompt) {
    showToast('请输入提示词', 'error');
    return;
  }

  dom.designBtn.classList.add('generating');
  dom.designBtn.innerHTML = `<span class="status-spinner"></span> 生成中...`;
  dom.designStatusBar.hidden = false;
  dom.designStatusText.textContent = '正在生成音色...';
  dom.designStatusSpinner.hidden = false;

  try {
    const res = await fetch('/api/voice/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        voice_name: dom.designName.value.trim(),
      }),
    });

    if (!res.ok) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try { const err = await res.json(); msg = err.detail || msg; } catch (_) {}
      throw new Error(msg);
    }

    const data = await res.json();
    dom.designStatusText.textContent = '生成完成';
    showToast(`音色生成完成: ${data.voice_id}`, 'success');
    fetchDesignList();
    updateVoiceDatalist();
    dom.designPrompt.value = '';
    dom.designCharCount.textContent = '0 字';
  } catch (e) {
    showToast(e.message || '生成失败', 'error');
    dom.designStatusText.textContent = e.message || '生成失败';
  } finally {
    dom.designBtn.classList.remove('generating');
    dom.designBtn.innerHTML = `<span class="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span> 生成音色`;
    dom.designStatusSpinner.hidden = true;
    setTimeout(() => {
      if (dom.designStatusText.textContent === '生成完成') {
        dom.designStatusBar.hidden = true;
      }
    }, 4000);
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
        <span class="vi-name" title="${escapeHtml(item.voice_name || item.voice_id)}">${escapeHtml(item.voice_name || item.voice_id)}</span>
        <span class="vi-id" title="${escapeHtml(item.voice_id)}">${escapeHtml(item.voice_id)}</span>
        <span class="vi-model">${escapeHtml(item.model || '')}</span>
        <span class="vi-time">${formatTime(item.created_at)}</span>
        <div class="vi-actions">
          <button class="btn btn-ghost btn-sm use-voice-btn" data-voice-id="${escapeHtml(item.voice_id)}" title="用于合成">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="btn btn-danger delete-voice-btn" data-id="${item.id}" data-type="design" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Event bindings
    $$('.use-voice-btn', dom.designVoiceList).forEach(btn => {
      btn.addEventListener('click', () => {
        dom.voiceInput.value = btn.dataset.voiceId;
        dom.tabs.forEach(t => t.classList.remove('active'));
        const genTab = document.querySelector('.tab[data-tab="generate"]');
        if (genTab) genTab.classList.add('active');
        dom.panels.forEach(p => p.classList.remove('active'));
        const genPanel = $('#panel-generate');
        if (genPanel) genPanel.classList.add('active');
        showToast('已填入音色: ' + btn.dataset.voiceId, 'success');
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

// ============ Shared Voice Helpers ============
async function deleteVoiceItem(id, type) {
  const endpoint = type === 'clone' ? `/api/voice/clone/${id}` : `/api/voice/design/${id}`;
  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (res.ok) {
      showToast('已删除', 'success');
      if (type === 'clone') fetchCloneList(state.clonePage);
      else fetchDesignList(state.designPage);
      updateVoiceDatalist();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (e) {
    showToast('删除失败', 'error');
  }
}

function renderVoicePagination(data, type) {
  const prefix = type === 'clone' ? 'clone' : 'design';
  const pagEl = type === 'clone' ? dom.clonePagination : dom.designPagination;
  const fetchFn = type === 'clone' ? fetchCloneList : fetchDesignList;
  const totalPages = Math.ceil(data.total / data.size);

  if (totalPages <= 1) {
    pagEl.hidden = true;
    return;
  }
  pagEl.hidden = false;

  let html = '';
  html += `<button class="btn btn-ghost btn-sm" ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}">上一页</button>`;

  for (let p = 1; p <= totalPages; p++) {
    if (p === data.page) {
      html += `<button class="btn btn-sm active">${p}</button>`;
    } else if (Math.abs(p - data.page) <= 2 || p === 1 || p === totalPages) {
      html += `<button class="btn btn-ghost btn-sm" data-page="${p}">${p}</button>`;
    } else if (p === data.page + 3 || p === data.page - 3) {
      html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
    }
  }

  html += `<button class="btn btn-ghost btn-sm" ${data.page >= totalPages ? 'disabled' : ''} data-page="${data.page + 1}">下一页</button>`;

  pagEl.innerHTML = html;

  $$('.btn[data-page]', pagEl).forEach(btn => {
    btn.addEventListener('click', () => fetchFn(parseInt(btn.dataset.page)));
  });
}

async function updateVoiceDatalist() {
  try {
    const res = await fetch('/api/voice/all');
    const data = await res.json();
    dom.voiceDatalist.innerHTML = data.items.map(item =>
      `<option value="${escapeHtml(item.voice_id)}">${escapeHtml(item.voice_name || item.voice_id)}</option>`
    ).join('');
  } catch (e) { /* ignore */ }
}

// ============ Toast ============
function showToast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

// ============ Helpers ============
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
