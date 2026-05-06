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
      let msg = '生成失败';
      try { const e = await res.json(); msg = e.detail || msg; } catch (_) {}
      throw new Error(msg);
    }

    const data = await res.json();

    // Show player
    const audioSrc = `/api/tts/audio/${data.filename}`;
    dom.audioPlayer.src = audioSrc;
    dom.downloadLink.href = audioSrc;
    dom.downloadLink.download = data.filename;
    dom.playerCard.hidden = false;
    dom.statusText.textContent = '生成完成';

    // Start visualizer
    setupVisualizer();
    dom.audioPlayer.play();

    showToast('语音合成完成', 'success');
  } catch (e) {
    showToast(e.message || '生成失败', 'error');
    dom.statusText.textContent = '生成失败';
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
