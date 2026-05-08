/* ============================================
   TTS Studio — Synthesis & Controls
   ============================================ */

function setupInput() {
  dom.textInput.addEventListener('input', () => {
    dom.charCount.textContent = `${dom.textInput.value.length} 字`;
  });
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

async function loadVoiceList() {
  const presets = ['mimo_default', 'Mia', 'Chloe', 'Milo', 'Dean'];
  let options = '<option value="">默认音色</option>';
  presets.forEach(v => { options += `<option value="${v}">${v} (预设)</option>`; });
  try {
    const res = await fetch('/api/voice/all');
    const data = await res.json();
    data.items.forEach(item => {
      const label = item.voice_name || item.voice_id || '';
      if (label) options += `<option value="${escapeHtml(item.voice_id || label)}">${escapeHtml(label)} (${item.source})</option>`;
    });
  } catch (e) { /* ignore */ }
  dom.voiceSelect.innerHTML = options;
}

// ---- Generate ----
function setupGenerate() {
  dom.generateBtn.addEventListener('click', generate);
}

async function generate() {
  const text = dom.textInput.value.trim();
  if (!text) { showToast('请输入文本', 'error'); return; }
  const voice = dom.voiceInput.value.trim();
  if (!voice) { showToast('请输入模型名称', 'error'); return; }
  if (state.generating) return;
  state.generating = true;

  dom.generateBtn.classList.add('generating');
  dom.generateBtn.innerHTML = `<span class="status-spinner"></span> 生成中...`;
  dom.statusBar.hidden = false;
  dom.statusText.textContent = '正在合成语音...';
  dom.statusSpinner.hidden = false;
  dom.playerCard.hidden = true;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, voice,
        voice_name: dom.voiceSelect.value,
        speed: parseFloat(dom.speedSlider.value),
        pitch: parseFloat(dom.pitchSlider.value),
      }),
    });
    if (!res.ok) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try { const err = await res.json(); msg = err.detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const src = `/api/tts/audio/${data.filename}`;
    dom.audioPlayer.src = src;
    dom.downloadLink.href = src;
    dom.downloadLink.download = data.filename;
    dom.playerCard.hidden = false;
    dom.statusText.textContent = '生成完成';
    setupVisualizer();
    dom.audioPlayer.play();
    showToast('语音合成完成', 'success');
  } catch (e) {
    showToast(e.message || '生成失败', 'error');
    dom.statusText.textContent = e.message || '生成失败';
  } finally {
    state.generating = false;
    dom.generateBtn.classList.remove('generating');
    dom.generateBtn.innerHTML = `<span class="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg></span> 生成语音`;
    dom.statusSpinner.hidden = true;
    setTimeout(() => {
      if (dom.statusText.textContent === '生成完成') dom.statusBar.hidden = true;
    }, 4000);
  }
}

// ---- Visualizer ----
let _visualizerSetup = false;

function setupVisualizer() {
  if (_visualizerSetup) return;
  _visualizerSetup = true;
  const audio = dom.audioPlayer;
  const bars = $$('span', dom.visualizer);
  audio.addEventListener('play', () => { dom.visualizer.classList.add('playing'); animateBars(bars); });
  audio.addEventListener('pause', () => dom.visualizer.classList.remove('playing'));
  audio.addEventListener('ended', () => dom.visualizer.classList.remove('playing'));
}

function animateBars(bars) {
  let frame;
  (function tick() {
    if (!dom.visualizer.classList.contains('playing')) { cancelAnimationFrame(frame); return; }
    bars.forEach(bar => { bar.style.height = (4 + Math.random() * 24) + 'px'; });
    frame = requestAnimationFrame(tick);
  })();
}
