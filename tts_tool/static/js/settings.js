/* ============================================
   TTS Studio — API Settings
   ============================================ */

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
  loadVoiceList();
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
