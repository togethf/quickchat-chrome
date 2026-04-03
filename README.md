# AI Sidebar Chat - Chrome 插件

类似 OpenAI Atlas 的 Chrome 侧边栏 AI 对话插件，支持划词翻译、解释、总结和润色。

## 功能特点

- 🎯 **悬浮工具栏** - 选中文字后自动显示，支持翻译/解释/总结/润色
- 💬 **侧边栏对话** - 类似 Atlas 的侧边栏 UI，不遮挡页面内容
- ⚡ **流式输出** - 实时显示 AI 回复，无需等待
- 🎨 **多主题** - 支持浅色/深色/渐变/极简四种主题
- ⚙️ **多模型支持** - 内置 Ollama/DeepSeek/GLM/Qwen/OpenAI 预设

## 支持的模型

插件支持任何 OpenAI 兼容的 API，内置以下预设：

| 预设 | API Endpoint | 默认模型 |
|------|-------------|----------|
| Ollama (本地) | `http://localhost:11434/v1` | `llama3` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| GLM (智谱) | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| Qwen (阿里) | `https://dashscope.aliyuncs.com/api/v1` | `qwen-max` |
| Qwen Code | `https://coding.dashscope.aliyuncs.com/v1` | `qwen-coder-plus` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| 自定义 | 手动配置 | - |

## 安装步骤

### 1. 获取 API Key

选择一个服务商获取 API Key：
- [DeepSeek](https://platform.deepseek.com/) - 性价比高，中文能力强
- [阿里云百炼](https://bailian.console.aliyun.com/) - 通义千问系列
- [智谱 AI](https://open.bigmodel.cn/) - GLM 系列
- [OpenAI](https://platform.openai.com/) - GPT 系列
- [Ollama](https://ollama.com/) - 本地部署

### 2. 加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 打开右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目的文件夹
5. 插件图标将出现在浏览器工具栏

### 3. 配置插件

1. 点击扩展图标打开侧边栏
2. 点击右上角的 ⚙️ 设置按钮
3. 选择一个模型预设（如 DeepSeek）
4. 填写 API Key
5. 点击保存

## 使用方法

### 方法 1: 悬浮工具栏
1. 在页面上选中一段文字
2. 文字上方会自动显示悬浮工具栏
3. 点击对应按钮：
   - **翻译** - 翻译成中文
   - **解释** - 解释含义
   - **总结** - 总结要点
   - **润色** - 改写优化
   - **侧边栏对话** - 打开侧边栏自由对话

### 方法 2: 侧边栏对话
- 点击浏览器工具栏中的扩展图标
- 打开侧边栏进行自由对话
- 可选快捷模式：翻译/解释/总结/润色

### 方法 3: 右键菜单
- 选中文字后，可通过侧边栏的快捷按钮快速处理

## 快捷操作

在侧边栏底部可选择快捷模式：
| 模式 | 说明 |
|------|------|
| 翻译 | 将输入内容翻译成中文 |
| 解释 | 解释输入内容的含义 |
| 总结 | 总结输入内容的要点 |
| 润色 | 润色/改写输入内容 |

## 主题

侧边栏设置支持四种主题切换：
- ☀️ **浅色** - 默认主题
- 🌙 **深色** - 暗色护眼
- 🎨 **渐变** - 粉色渐变
- ⚪ **极简** - 极简白色

## 项目结构

```
quickchat-chrome/
├── manifest.json      # Manifest V3 配置
├── background.js      # Service Worker，处理 API 调用
├── content.js         # 内容脚本，悬浮工具栏
├── sidepanel.html     # 侧边栏界面
├── sidepanel.js       # 侧边栏逻辑
├── icons/             # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 开发

### 调试技巧

1. **查看后台日志**: `chrome://extensions/` → 点击"查看视图：Service Worker"
2. **查看页面日志**: F12 → Console（内容脚本的输出）
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
4. API Key 可留空

## License

MIT
