# TTS Studio

基于 Chat Completions 协议的 TTS 语音合成工具，对接兼容 OpenAI Chat API 的语音模型（如 mimo-v2.5-tts），提供 Web UI 进行文本转语音。

## 功能

- **自定义模型名** — 输入任意兼容 Chat API 的 TTS 模型名称
- **语速调节** — 0.25x ~ 4.0x，实时滑块控制
- **音调调节** — -20 ~ +20，精细调整
- **长文本分段** — 按句号/换行自动拆分，逐段生成后合并
- **文件上传** — 支持 .txt / .md 文件直接导入文本
- **历史记录** — 保存元数据 + WAV 文件，支持回放和删除
- **分页浏览** — 历史记录分页展示

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python / FastAPI |
| 数据库 | SQLite |
| 前端 | HTML + CSS + Vanilla JS（Geist 字体，暗色主题） |
| 音频 | WAV 格式，本地文件存储 |

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
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

点击「保存设置」。

### 5. 生成语音

- 在文本框输入要合成的文字
- 在音色栏输入模型名称（如 `mimo-v2.5-tts`）
- 调整语速/音调
- 点击「生成语音」

## API 协议

本项目通过 `/v1/chat/completions` 端点调用 TTS 模型，请求格式：

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "请将以下文字转为语音"},
    {"role": "assistant", "content": "你好世界"}
  ],
  "stream": false
}
```

音频通过 base64 WAV 编码在响应中返回：
```json
{
  "choices": [{
    "message": {
      "audio": {"data": "<base64-wav>"}
    }
  }]
}
```

> 模型朗读的是 assistant 的回复内容，因此目标文本放在 assistant message 中。

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/config` | 获取当前配置（Key 脱敏） |
| `POST` | `/api/config` | 更新 API URL 和 Key |
| `POST` | `/api/tts` | 文本转语音 |
| `GET` | `/api/tts/audio/{filename}` | 下载音频文件 |
| `POST` | `/api/upload` | 上传文本文件（.txt/.md） |
| `GET` | `/api/history` | 历史记录列表（分页） |
| `DELETE` | `/api/history/{id}` | 删除记录及音频文件 |

### POST /api/tts

```json
{
  "text": "你好世界",
  "voice": "mimo-v2.5-tts",
  "speed": 1.0,
  "pitch": 0
}
```

响应：
```json
{
  "id": 1,
  "filename": "abc123.wav",
  "text": "你好世界",
  "voice": "mimo-v2.5-tts",
  "speed": 1.0,
  "pitch": 0.0
}
```

## 项目结构

```
├── main.py              # FastAPI 入口
├── config.py            # API 配置读写
├── database.py          # SQLite 操作
├── tts_client.py        # Chat API 客户端（分段+合并+流式容错）
├── routers/
│   ├── config.py        # /api/config
│   ├── tts.py           # /api/tts, /api/upload
│   └── history.py       # /api/history
├── static/
│   ├── index.html       # 前端页面
│   ├── css/style.css    # 样式
│   └── js/app.js        # 交互逻辑
├── requirements.txt     # Python 依赖
└── data/                # 运行时数据
    ├── config.json      # API 配置
    ├── tts.db           # SQLite 数据库
    └── audio/           # 生成的 WAV 文件
```

## License

MIT
