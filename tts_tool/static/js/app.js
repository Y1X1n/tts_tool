/* ============================================
   TTS Studio — Entry Point
   ============================================ */

// ---- State ----
const state = {
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

  settingsCard: $('#settingsCard'),
  settingsStatus: $('#settingsStatus'),
  apiUrl: $('#apiUrl'),
  apiKey: $('#apiKey'),
  togglePw: $('#togglePw'),
  saveConfig: $('#saveConfig'),
  configMsg: $('#configMsg'),

  textInput: $('#textInput'),
  charCount: $('#charCount'),
  fileUpload: $('#fileUpload'),

  voiceInput: $('#voiceInput'),
  voiceSelect: $('#voiceSelect'),
  speedSlider: $('#speedSlider'),
  speedVal: $('#speedVal'),
  pitchSlider: $('#pitchSlider'),
  pitchVal: $('#pitchVal'),

  generateBtn: $('#generateBtn'),
  statusBar: $('#statusBar'),
  statusText: $('#statusText'),
  statusSpinner: $('#statusSpinner'),

  playerCard: $('#playerCard'),
  audioPlayer: $('#audioPlayer'),
  visualizer: $('#visualizer'),
  downloadLink: $('#downloadLink'),

  historyList: $('#historyList'),
  historyEmpty: $('#historyEmpty'),
  pagination: $('#pagination'),

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
  clonePlayerCard: $('#clonePlayerCard'),
  cloneAudioPlayer: $('#cloneAudioPlayer'),
  cloneDownloadLink: $('#cloneDownloadLink'),
  cloneCharCount: $('#cloneCharCount'),
  cloneFilter: $('#cloneFilter'),
  cloneVoiceList: $('#cloneVoiceList'),
  clonePagination: $('#clonePagination'),
  cloneEmpty: $('#cloneEmpty'),

  designModel: $('#designModel'),
  designName: $('#designName'),
  designPrompt: $('#designPrompt'),
  designCharCount: $('#designCharCount'),
  designBtn: $('#designBtn'),
  designStatusBar: $('#designStatusBar'),
  designStatusText: $('#designStatusText'),
  designStatusSpinner: $('#designStatusSpinner'),
  designPlayerCard: $('#designPlayerCard'),
  designAudioPlayer: $('#designAudioPlayer'),
  designDownloadLink: $('#designDownloadLink'),
  designVoiceList: $('#designVoiceList'),
  designPagination: $('#designPagination'),
  designEmpty: $('#designEmpty'),

  voiceDatalist: $('#voiceDatalist'),
  toastContainer: $('#toastContainer'),
};

// ---- Tabs ----
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
