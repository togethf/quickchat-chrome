# AI Sidebar Chat - Chrome 插件

类似 OpenAI Atlas 的 Chrome 侧边栏 AI 对话插件，支持划词翻译和解释。

## 功能特点

- 🎯 **悬浮按钮** - 页面右下角悬浮按钮，一键打开侧边栏
- 📝 **划词对话** - 选中文字后右键菜单快速翻译或解释
- 💬 **侧边栏对话** - 类似 Atlas 的侧边栏 UI，不遮挡页面内容
- ⚙️ **多模型支持** - 支持配置任意 OpenAI 兼容 API

## 支持的模型

插件支持任何 OpenAI 兼容的 API，包括：

| 服务商 | API Endpoint | 模型示例 |
|--------|-------------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Claude (通过代理) | 你的代理地址 | `claude-sonnet-4-6` |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5:7b` |

## 安装步骤

### 1. 获取 API Key

选择一个服务商获取 API Key：
- [DeepSeek](https://platform.deepseek.com/) - 性价比高，中文能力强
- [阿里云百炼](https://bailian.console.aliyun.com/) - 通义千问系列
- [OpenAI](https://platform.openai.com/) - GPT 系列

### 2. 加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 打开右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目的文件夹
5. 插件图标将出现在浏览器工具栏

### 3. 配置插件

1. 点击扩展图标打开侧边栏
2. 点击右上角的设置按钮
3. 填写：
   - **API Endpoint**: API 地址
   - **API Key**: 你的密钥
   - **模型名称**: 如 `deepseek-chat`
4. 点击保存

## 使用方法

### 方法 1: 悬浮按钮
- 点击页面右下角的紫色悬浮按钮
- 如果有选中文本，会自动带入对话框

### 方法 2: 右键菜单
- 在页面上选中一段文字
- 右键点击，选择 **AI 解释选中内容** 或 **AI 翻译选中内容**
- 侧边栏自动打开并处理

### 方法 3: 扩展图标
- 点击浏览器工具栏中的扩展图标
- 打开侧边栏进行自由对话

## 快捷操作

在侧边栏中，你可以使用以下快捷操作处理选中的文字：
- **翻译** - 将选中内容翻译成中文
- **解释** - 解释选中内容的含义
- **总结** - 总结选中内容的要点
- **润色** - 润色/改写选中内容

## 项目结构

```
qwen-plugin/
├── manifest.json      # 扩展配置文件
├── background.js      # 后台脚本，处理 API 调用
├── content.js         # 内容脚本，处理页面交互
├── sidepanel.html     # 侧边栏界面
├── sidepanel.js       # 侧边栏逻辑
└── icons/             # 图标文件（需要自行添加）
```

## 图标

你需要准备以下图标文件（可使用任何 PNG 图片）：
- `icons/icon16.png` - 16x16 像素
- `icons/icon48.png` - 48x48 像素
- `icons/icon128.png` - 128x128 像素

## 开发

### 调试技巧

1. **查看后台日志**: `chrome://extensions/` → 点击"查看视图：Service Worker"
2. **查看页面日志**: F12 → Console（内容脚本的输出会显示在这里）
3. **查看侧边栏日志**: 右键侧边栏 → 检查

### 热重载

修改代码后，在 `chrome://extensions/` 页面点击刷新按钮即可重新加载

## 常见问题

### Q: API 请求失败？
A: 检查以下几点：
1. API Key 是否正确
2. API Endpoint 是否完整（包含 `/v1`）
3. 网络是否可达（某些 API 可能需要代理）
4. 账户余额是否充足

### Q: 侧边栏打不开？
A: 确保你的 Chrome 版本支持 Side Panel API（Chrome 114+）

### Q: 如何在本地使用 Ollama？
A:
1. 启动 Ollama: `ollama serve`
2. 设置 Endpoint 为：`http://localhost:11434/v1`
3. 模型名称填写 Ollama 中的模型名，如 `qwen2.5:7b`

## License

MIT
