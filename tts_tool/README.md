# TTS Studio

基于 OpenAI 兼容接口的文本转语音工具，提供 Web UI 进行语音合成。支持长文本自动分段、语速/音调调节、多音色切换、文件上传和历史记录。

## 功能

- **多音色切换** — 从 API 动态拉取音色列表
- **语速调节** — 0.25x ~ 4.0x，实时滑块控制
- **音调调节** — -20 ~ +20，精细调整
- **长文本分段** — 按句号/换行自动拆分，逐段生成后合并
- **文件上传** — 支持 .txt / .md 文件直接导入文本
- **历史记录** — 保存元数据 + MP3 文件，支持回放和删除
- **分页浏览** — 历史记录分页展示

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python / FastAPI |
| 数据库 | SQLite |
| 前端 | HTML + CSS + Vanilla JS（Geist 字体，暗色主题） |
| 音频 | MP3 格式，本地文件存储 |

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. 打开浏览器

访问 http://127.0.0.1:8000

### 4. 配置 API

在页面左侧「API 设置」中填入：
- **API URL** — OpenAI 兼容的 TTS API 地址（如 `https://api.openai.com/v1`）
- **API Key** — 你的 API 密钥

点击保存后，音色列表自动刷新。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/config` | 获取当前配置（Key 脱敏） |
| `POST` | `/api/config` | 更新 API URL 和 Key |
| `GET` | `/api/voices` | 获取可用音色列表 |
| `POST` | `/api/tts` | 文本转语音 |
| `GET` | `/api/tts/audio/{filename}` | 下载音频文件 |
| `POST` | `/api/upload` | 上传文本文件（.txt/.md） |
| `GET` | `/api/history` | 历史记录列表（分页） |
| `DELETE` | `/api/history/{id}` | 删除历史记录 |

### POST /api/tts 请求体

```json
{
  "text": "你好世界",
  "voice": "alloy",
  "speed": 1.0,
  "pitch": 0
}
```

## 项目结构

```
├── main.py              # FastAPI 入口
├── config.py            # 配置读写
├── database.py          # SQLite 操作
├── tts_client.py        # TTS API 客户端（分段+合并）
├── routers/
│   ├── config.py        # /api/config
│   ├── tts.py           # /api/tts, /api/voices, /api/upload
│   └── history.py       # /api/history
├── static/
│   ├── index.html       # 前端页面
│   ├── css/style.css    # 样式
│   └── js/app.js        # 交互逻辑
├── requirements.txt     # Python 依赖
└── data/                # 运行时数据（不入库）
    ├── config.json      # API 配置
    ├── tts.db           # SQLite 数据库
    └── audio/           # 生成的 MP3
```

## License

MIT
