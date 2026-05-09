# TTS Studio

基于 Chat Completions 协议的语音工具，提供语音合成、音色克隆、音色设计三大功能，统一历史管理。

模型预设以 Mimo TTS 为例（免费模型，注册地址：https://platform.xiaomimimo.com）。

---

## 使用方式

### 方式一：exe 启动（推荐，无需 Python 环境）

1. 从 [Releases](https://github.com/Y1X1n/tts_tool/releases) 下载 `tts-studio.exe`
2. 双击运行，浏览器自动打开 `http://127.0.0.1:8000`
3. 展开「API 设置」填入 API URL 和 Key，保存
4. 首次运行在 exe 同目录创建 `data/` 文件夹（配置、数据库、音频）

### 方式二：源码启动（需 Python 3.10+）

```bash
pip install -r tts_tool/requirements.txt
cd tts_tool
python main.py
```

浏览器打开 `http://127.0.0.1:8000`，开发模式下 uvicorn 开启热重载。

---

## 功能

| 板块 | 说明 |
|------|------|
| **合成** | 文本转语音。长文本自动分句、并行合成、合并输出。模型与音色分离，下拉框同步克隆/设计音色，支持语速、音调调节 |
| **音色克隆** | 上传参考音频（支持多文件），生成可复用的克隆音色。支持 wav / mp3 / m4a / ogg / flac，收藏和历史回放 |
| **音色设计** | 用提示词描述音色特征（如"温柔的女声，语速适中"），生成定制音色 |
| **历史** | 统一展示合成、克隆、设计三类记录，带类型标签，支持试听和删除 |

所有功能共用同一套 API 配置。

---

## API 协议

所有功能通过 `{api_url}/chat/completions` 通信，按模型 ID 区分能力：

| 模型 | 用途 | 关键参数 |
|------|------|----------|
| `mimo-v2.5-tts` | 语音合成 | `audio.voice` 传预设音色名或参考音频 DataURL |
| `mimo-v2.5-tts-voiceclone` | 音色克隆 | `audio.voice` 传参考音频 DataURL |
| `mimo-v2.5-tts-voicedesign` | 音色设计 | `messages[0].content` 传音色描述 |

音频返回格式：`choices[0].message.audio.data`（base64 WAV）。

---

## 后端接口

### 配置

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/config` | 读取 API 配置（Key 部分脱敏） |
| `POST` | `/api/config` | 保存 API 配置 |

### TTS 合成

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/tts` | 文本转语音。参数：`text`、`voice`（模型名）、`voice_name`（可选）、`speed`（0.25-4.0）、`pitch`（-20~20）。长文本自动分段并行合成并合并 WAV |
| `GET` | `/api/tts/audio/{filename}` | 下载合成音频 |
| `POST` | `/api/upload` | 上传 txt/md 文件，返回解码文本 |

### 音色

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/voice/clone` | 上传参考音频克隆音色。参数：`audio`（文件，<10MB）、`model`、`voice_name`（可选）、`ref_text`（可选） |
| `POST` | `/api/voice/design` | 提示词设计音色。参数：`prompt`（<2000字）、`model`、`voice_name`（可选） |
| `GET` | `/api/voice/audio/{filename}` | 下载克隆/设计音频 |
| `GET` | `/api/voice/clone-list` | 克隆记录分页列表，支持 `favorite` 筛选 |
| `GET` | `/api/voice/design-list` | 设计记录分页列表 |
| `GET` | `/api/voice/all` | 全部已保存音色（去重），供合成页下拉框使用 |
| `PATCH` | `/api/voice/clone/{id}/favorite` | 切换收藏状态 |
| `DELETE` | `/api/voice/clone/{id}` | 删除克隆记录及音频文件 |
| `DELETE` | `/api/voice/design/{id}` | 删除设计记录及音频文件 |

### 历史

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/history` | 统一历史列表（UNION 合成/克隆/设计三表），每条含 `type` 字段（`tts` / `clone` / `design`），ID 格式 `{type}_{id}` |
| `DELETE` | `/api/history/{id}` | 删除记录及音频。ID 为复合格式如 `clone_5`，自动路由到对应表 |

---

## 数据库

SQLite（WAL 模式），三张表：

| 表 | 主要字段 |
|---|---------|
| `history` | id, text, voice, speed, pitch, filename, created_at |
| `clone_voices` | id, voice_id, voice_name, model, ref_audio_path, ref_text, filename, favorited, created_at |
| `design_voices` | id, voice_id, voice_name, model, prompt, filename, created_at |

运行时生成在 `data/tts.db`，首次启动自动建表并兼容旧库迁移。

---

## 项目结构

```
├── README.md
└── tts_tool/
    ├── main.py              # FastAPI 入口，uvicorn 启动，自动打开浏览器
    ├── config.py            # API 配置持久化（data/config.json）
    ├── database.py          # SQLite 建表、迁移、连接管理
    ├── tts_client.py        # TTS 合成：长文本分段 → 并行请求 → WAV 合并
    ├── voice_client.py      # 音色克隆/设计：构建 DataURL 或 prompt 请求
    ├── paths.py             # 路径解析（源码 / PyInstaller 打包兼容）
    ├── build.spec           # PyInstaller 配置
    ├── build_exe.py         # 一键打包脚本
    ├── requirements.txt     # fastapi, uvicorn, aiohttp, python-multipart
    ├── routers/
    │   ├── config.py        # /api/config
    │   ├── tts.py           # /api/tts, /api/upload, /api/tts/audio/*
    │   ├── history.py       # /api/history（三表 UNION）
    │   └── voice.py         # /api/voice/*
    ├── static/
    │   ├── index.html       # 单页应用（合成 / 克隆 / 设计 / 历史 四 Tab）
    │   ├── css/style.css    # 暗色主题（CSS 变量，Geist 字体）
    │   └── js/
    │       ├── utils.js     # DOM 工具、XSS 转义、Toast 通知
    │       ├── settings.js  # API 配置管理
    │       ├── tts.js       # 合成页逻辑、音色下拉框
    │       ├── history.js   # 统一历史列表（分页、试听、删除）
    │       ├── clone.js     # 音色克隆（多文件上传、收藏）
    │       ├── design.js    # 音色设计
    │       └── app.js       # 入口：标签切换、全局状态、初始化
    ├── tests/
    │   └── test_api.py     # 冒烟测试（7 条）
    └── data/                # 运行时生成（不入库）
        ├── config.json
        ├── tts.db
        ├── audio/           # 生成的 WAV
        └── clone_audio/     # 参考音频
```

---

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| Web 框架 | FastAPI | 异步路由，Pydantic 校验，自动 OpenAPI |
| 服务器 | uvicorn | ASGI，开发模式热重载 |
| HTTP 客户端 | aiohttp | 异步调用 Chat Completions API |
| 数据库 | SQLite | WAL 模式，三表，自动迁移 |
| 前端 | Vanilla JS + CSS | 零框架，Geist 字体，暗色主题，模块化 JS |
| 打包 | PyInstaller | 单文件 exe，约 14MB |

---

## 打包

```bash
cd tts_tool
python build_exe.py
# 输出: dist/tts-studio.exe
```

`build.spec` 控制打包参数：入口 `main.py`，捆绑 `static/` 和 `routers/`，显式导入所有 uvicorn 子模块。
