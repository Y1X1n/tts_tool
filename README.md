# TTS Studio

基于 Chat Completions 协议的语音工具，提供 **语音合成**、**音色克隆**、**音色设计** 三大功能，共用同一套 API URL 和 Key。Web UI 采用暗色主题。

## 功能

| 板块 | 说明 |
|------|------|
| **语音合成** | 文本转语音，模型/音色分离，支持预设音色和克隆/设计音色 |
| **音色克隆** | 上传参考音频 → 直接生成语音，支持收藏和历史回放 |
| **音色设计** | 输入提示词描述音色特征 → 直接生成语音 |
| **历史记录** | TTS 合成历史，支持回放、下载、删除，分页浏览 |

三个功能共享同一套 API 配置，均通过 Chat Completions 协议通信。

## 快速开始

### 1. 安装依赖

```bash
pip install -r tts_tool/requirements.txt
```

### 2. 启动服务

```bash
cd tts_tool
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. 打开浏览器

访问 http://127.0.0.1:8000

### 4. 配置 API

展开页面顶部「API 设置」，填入：
- **API URL** — 兼容 Chat Completions 的 API 地址（如 `https://your-api.com/v1`）
- **API Key** — 你的 API 密钥

点击「保存设置」，三个功能均可使用同一套配置。

## API 协议

所有功能通过 `{api_url}/chat/completions` 端点通信，遵循 Chat Completions 格式：

### 语音合成 (mimo-v2.5-tts)

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "请将以下文字转为语音"},
    {"role": "assistant", "content": "你好世界"}
  ],
  "stream": false,
  "speed": 1.0,
  "pitch": 0
}
```

使用预设音色时增加 `audio` 字段：
```json
{
  "model": "mimo-v2.5-tts",
  "audio": {"format": "wav", "voice": "Mia"}
}
```

### 音色克隆 (mimo-v2.5-tts-voiceclone)

一次调用即完成克隆+合成，assistant 为待合成文本，`audio.voice` 为参考音频 DataURL：

```json
{
  "model": "mimo-v2.5-tts-voiceclone",
  "messages": [
    {"role": "user", "content": ""},
    {"role": "assistant", "content": "Yes, I had a sandwich."}
  ],
  "audio": {
    "format": "wav",
    "voice": "data:audio/mpeg;base64,<base64>"
  },
  "stream": false
}
```

### 音色设计 (mimo-v2.5-tts-voicedesign)

user 为音色描述，assistant 为待合成文本：

```json
{
  "model": "mimo-v2.5-tts-voicedesign",
  "messages": [
    {"role": "user", "content": "Give me a young male tone."},
    {"role": "assistant", "content": "Yes, I had a sandwich."}
  ],
  "audio": {"format": "wav"},
  "stream": false
}
```

音频通过 base64 WAV 编码返回：`choices[0].message.audio.data`

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/config` | 获取配置（Key 脱敏） |
| `POST` | `/api/config` | 更新 API URL 和 Key |
| `POST` | `/api/tts` | 文本转语音，支持 `voice_name` 参数 |
| `GET` | `/api/tts/audio/{filename}` | 下载 TTS 音频文件 |
| `POST` | `/api/upload` | 上传文本文件（.txt/.md） |
| `GET` | `/api/history` | TTS 合成历史（分页） |
| `DELETE` | `/api/history/{id}` | 删除记录及音频 |
| `POST` | `/api/voice/clone` | 上传音频克隆音色（返回音频文件） |
| `POST` | `/api/voice/design` | 提示词生成音色（返回音频文件） |
| `GET` | `/api/voice/audio/{filename}` | 下载克隆/设计音频 |
| `GET` | `/api/voice/clone-list` | 克隆记录列表（分页，支持收藏筛选） |
| `GET` | `/api/voice/design-list` | 设计记录列表（分页） |
| `GET` | `/api/voice/all` | 所有已保存音色（供合成页下拉） |
| `PATCH` | `/api/voice/clone/{id}/favorite` | 切换收藏状态 |
| `DELETE` | `/api/voice/clone/{id}` | 删除克隆记录及音频 |
| `DELETE` | `/api/voice/design/{id}` | 删除设计记录及音频 |

### POST /api/tts

```json
{
  "text": "你好世界",
  "voice": "mimo-v2.5-tts",
  "voice_name": "Mia",
  "speed": 1.0,
  "pitch": 0
}
```

- `voice`: 模型名称
- `voice_name` (可选): 预设音色名（Mia/Chloe/Milo/Dean）或已保存的克隆/设计音色名。选择克隆音色时自动切换模型并使用参考音频。

### POST /api/voice/clone

FormData：`audio`（文件）、`model`、`voice_name`（可选）、`ref_text`（待合成文本）

### POST /api/voice/design

```json
{
  "model": "mimo-v2.5-tts-voicedesign",
  "prompt": "温柔的女声，音调偏高",
  "voice_name": "温柔女声"
}
```

## 项目结构

```
├── README.md
└── tts_tool/
    ├── main.py              # FastAPI 入口
    ├── config.py            # API 配置读写
    ├── database.py          # SQLite（history / clone_voices / design_voices）
    ├── tts_client.py        # TTS Chat API 客户端（含音色支持）
    ├── voice_client.py      # 音色克隆 & 设计 API 客户端
    ├── requirements.txt     # Python 依赖
    ├── routers/
    │   ├── config.py        # /api/config
    │   ├── tts.py           # /api/tts, /api/upload
    │   ├── history.py       # /api/history
    │   └── voice.py         # /api/voice/*
    ├── static/
    │   ├── index.html       # 前端页面（4 个 Tab）
    │   ├── css/style.css    # 暗色主题样式
    │   └── js/app.js        # 交互逻辑
    └── data/                # 运行时数据
        ├── config.json      # API 配置
        ├── tts.db           # SQLite 数据库
        ├── audio/           # 生成的 WAV 文件
        └── clone_audio/     # 克隆参考音频
```

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python / FastAPI / aiohttp |
| 数据库 | SQLite |
| 前端 | HTML + CSS + Vanilla JS（Geist 字体，暗色主题） |
| 音频 | WAV 格式，本地文件存储 |
