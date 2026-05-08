# TTS Studio

基于 Chat Completions 协议的语音工具，提供语音合成、音色克隆、音色设计三大功能。

## 使用方式

**下载 exe（推荐）**：从 [Releases](https://github.com/Y1X1n/tts_tool/releases) 下载 `tts-studio.exe`，双击启动，浏览器自动打开。

**源码运行**：
```bash
pip install -r tts_tool/requirements.txt
cd tts_tool
py -m uvicorn main:app --host 127.0.0.1 --port 8000
# 浏览器打开 http://127.0.0.1:8000
```

## 配置

展开页面顶部「API 设置」，填入 API URL 和 Key，三个功能共用。

## 功能

| 板块 | 说明 |
|------|------|
| 合成 | 文本转语音，模型/音色分离，支持预设音色和克隆/设计音色 |
| 音色克隆 | 上传参考音频直接生成语音，支持收藏和历史 |
| 音色设计 | 提示词描述音色特征，直接生成语音 |
| 历史 | 合成历史回放、下载、删除 |

## API

所有功能通过 `{api_url}/chat/completions` 通信。

| 模型 | 用途 |
|------|------|
| `mimo-v2.5-tts` | 语音合成，支持 `audio.voice` 预设音色 |
| `mimo-v2.5-tts-voiceclone` | 音色克隆，`audio.voice` 传参考音频 DataURL |
| `mimo-v2.5-tts-voicedesign` | 音色设计，`messages[0].content` 传提示词 |

音频通过 `choices[0].message.audio.data` (base64 WAV) 返回。

## 打包

```bash
cd tts_tool
py build_exe.py
# 输出: dist/tts-studio.exe
```

## 技术栈

Python / FastAPI / SQLite / HTML + CSS + Vanilla JS (暗色主题)
