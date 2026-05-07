# TTS Studio

基于 Chat Completions 协议的语音工具，提供 **语音合成**、**音色克隆**、**音色设计** 三大功能，共用同一套 API URL 和 Key。Web UI 采用暗色主题。

## 功能

| 板块 | 说明 |
|------|------|
| **语音合成** | 文本转语音，支持语速/音调调节、长文本自动分段、文件上传 |
| **音色克隆** | 上传参考音频 → 获取 voice_id，支持收藏和历史管理 |
| **音色设计** | 输入提示词描述音色特征 → 生成 voice_id |
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

### 语音合成

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

音频通过 base64 WAV 编码返回：`choices[0].message.audio.data`

### 音色克隆

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "请克隆以下音色"},
    {"role": "assistant", "content": "你好世界"}
  ],
  "audio": {"data": "<base64>"},
  "stream": false
}
```

返回的 `choices[0].message.audio.id` 即为 voice_id，可在合成页通过 `voice` 参数复用。

### 音色设计

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "请根据以下描述生成一个音色"},
    {"role": "assistant", "content": "温柔的女声，音调偏高，语速适中"}
  ],
  "stream": false
}
```

返回的 `choices[0].message.audio.id` 即为 voice_id，可在合成页通过 `voice` 参数复用。

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/config` | 获取配置（Key 脱敏） |
| `POST` | `/api/config` | 更新 API URL 和 Key |
| `POST` | `/api/tts` | 文本转语音 |
| `GET` | `/api/tts/audio/{filename}` | 下载音频文件 |
| `POST` | `/api/upload` | 上传文本文件（.txt/.md） |
| `GET` | `/api/history` | TTS 合成历史（分页） |
| `GET` | `/api/history/{id}` | 单条历史详情 |
| `DELETE` | `/api/history/{id}` | 删除记录及音频 |
| `POST` | `/api/voice/clone` | 上传音频克隆音色 |
| `POST` | `/api/voice/design` | 提示词生成音色 |
| `GET` | `/api/voice/clone-list` | 克隆音色列表（分页，支持收藏筛选） |
| `GET` | `/api/voice/design-list` | 设计音色列表（分页） |
| `GET` | `/api/voice/all` | 所有已保存音色（供合成页下拉） |
| `PATCH` | `/api/voice/clone/{id}/favorite` | 切换收藏状态 |
| `DELETE` | `/api/voice/clone/{id}` | 删除克隆记录 |
| `DELETE` | `/api/voice/design/{id}` | 删除设计记录 |

### POST /api/tts

```json
{
  "text": "你好世界",
  "voice": "mimo-v2.5-tts",
  "speed": 1.0,
  "pitch": 0
}
```

### POST /api/voice/clone

FormData：`audio`（文件）、`model`、`voice_name`（可选）、`ref_text`（可选）

### POST /api/voice/design

```json
{
  "model": "voice-design-v1",
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
    ├── tts_client.py        # TTS Chat API 客户端
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
