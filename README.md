# TTS Studio

基于 Chat Completions 协议的语音工具，提供语音合成、音色克隆、音色设计三大功能。
(至于为什么模型预设是Mimo 因为Mimo的TTS模型免费 跳转链接:https://platform.xiaomimimo.com)

---

## 使用方式

### 方式一：exe 启动（推荐，无需 Python 环境）

1. 从 [Releases](https://github.com/Y1X1n/tts_tool/releases) 下载 `tts-studio.exe`
2. 双击运行，浏览器自动打开操作界面
3. 展开「API 设置」填入 API URL 和 Key，保存
4. 首次运行会在 exe 同目录创建 `data/` 文件夹

### 方式二：命令行启动（需 Python 3.10+）

```bash
pip install -r tts_tool/requirements.txt
cd tts_tool
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

浏览器打开 `http://127.0.0.1:8000`。

---

## 功能

| 板块 | 说明 |
|------|------|
| **合成** | 文本转语音，模型/音色分离，下拉选择预设音色（Mia / Chloe / Milo / Dean）或已保存的克隆/设计音色 |
| **音色克隆** | 上传参考音频 → 输入待合成文本 → 直接生成语音，支持收藏和历史回放 |
| **音色设计** | 输入提示词描述音色特征 → 输入待合成文本 → 生成语音 |
| **历史** | 合成历史分页浏览，支持回放、下载、删除 |

三个功能共用同一套 API 配置。

---

## API 协议

所有功能通过 `{api_url}/chat/completions` 端点通信，按模型 ID 区分功能。

| 模型 | 用途 | 关键参数 |
|------|------|----------|
| `mimo-v2.5-tts` | 语音合成 | `audio.voice` 可选预设音色名 |
| `mimo-v2.5-tts-voiceclone` | 音色克隆 | `audio.voice` 传参考音频 DataURL |
| `mimo-v2.5-tts-voicedesign` | 音色设计 | `messages[0].content` 传音色描述 |

音频返回格式：`choices[0].message.audio.data`（base64 WAV）。

---

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST` | `/api/config` | 读写 API 配置 |
| `POST` | `/api/tts` | 文本转语音 |
| `GET` | `/api/tts/audio/{file}` | 下载合成音频 |
| `POST` | `/api/upload` | 上传 txt/md 文件 |
| `GET/DELETE` | `/api/history` | 合成历史 |
| `POST` | `/api/voice/clone` | 上传音频克隆 |
| `POST` | `/api/voice/design` | 提示词设计音色 |
| `GET` | `/api/voice/audio/{file}` | 下载克隆/设计音频 |
| `GET` | `/api/voice/clone-list` | 克隆记录（分页，收藏筛选） |
| `GET` | `/api/voice/design-list` | 设计记录（分页） |
| `GET` | `/api/voice/all` | 全部已保存音色 |
| `PATCH` | `/api/voice/clone/{id}/favorite` | 切换收藏 |
| `DELETE` | `/api/voice/clone/{id}` | 删除克隆记录 |
| `DELETE` | `/api/voice/design/{id}` | 删除设计记录 |

---

## 项目结构

```
├── README.md
└── tts_tool/
    ├── main.py                 # FastAPI 入口，uvicorn 启动
    ├── config.py               # API URL / Key 持久化 (JSON)
    ├── database.py             # SQLite 初始化与连接
    ├── tts_client.py           # 语音合成 API 客户端（分段+合并）
    ├── voice_client.py         # 音色克隆 & 设计 API 客户端
    ├── paths.py                # 路径解析（源码/打包兼容）
    ├── build.spec              # PyInstaller 打包配置
    ├── build_exe.py            # 一键打包脚本
    ├── requirements.txt        # Python 依赖
    ├── routers/
    │   ├── config.py           # /api/config
    │   ├── tts.py              # /api/tts  /api/upload
    │   ├── history.py          # /api/history
    │   └── voice.py            # /api/voice/*
    ├── static/
    │   ├── index.html          # 单页前端 (4 Tab)
    │   ├── css/style.css       # 暗色主题
    │   └── js/app.js           # 交互逻辑 (Vanilla JS)
    └── data/                   # 运行时生成（不入库）
        ├── config.json         # API 配置
        ├── tts.db              # SQLite
        ├── audio/              # 生成的 WAV
        └── clone_audio/        # 参考音频
```

---

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| **Web 框架** | FastAPI | 异步 HTTP，自动 OpenAPI 文档 |
| **服务器** | uvicorn | ASGI，支持热重载（开发模式） |
| **HTTP 客户端** | aiohttp | 异步调用 Chat Completions API |
| **数据库** | SQLite | WAL 模式，三张表（history / clone_voices / design_voices） |
| **序列化** | Pydantic | 请求/响应模型校验 |
| **音频处理** | 标准库 (base64 / struct) | WAV 解码与合并 |
| **前端** | HTML + CSS + Vanilla JS | 无框架，Geist 字体，暗色主题 |
| **打包** | PyInstaller | 单文件 exe，14MB |

---

## 打包

```bash
cd tts_tool
py build_exe.py
# 输出: dist/tts-studio.exe
```
