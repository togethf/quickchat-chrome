// 侧边栏逻辑
(function() {
  // DOM 元素
  const chatContainer = document.getElementById('chatContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const stopBtn = document.getElementById('stopBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const saveSettings = document.getElementById('saveSettings');
  const quickActions = document.getElementById('quickActions');

  // 设置表单（稍后在 populateSettings 中获取）
  let apiEndpointInput, apiKeyInput, modelInput, systemPromptInput, themeButtons;
  let currentPreset = 'ollama'; // 默认预设

  // 流式请求控制
  let abortController = null;
  let isGenerating = false;

  // 配置
  let config = {};
  let messages = [];
  let pendingText = "";
  let pendingMode = "chat";
  let currentTheme = "light";
  let streamMessageId = null; // 当前流式消息 ID

  // 应用主题
  function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    // 同时更新 chrome.storage 中的配置
    chrome.storage.sync.set({ theme: theme });
  }

  // 加载配置
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (items) => {
        config = {
          apiKey: items.apiKey || "",
          apiEndpoint: items.apiEndpoint || modelPresets.ollama.endpoint,
          model: items.model || modelPresets.ollama.model,
          systemPrompt: items.systemPrompt || modelPresets.ollama.systemPrompt,
          theme: items.theme || "light",  // 默认浅色主题
          preset: items.preset || "ollama"  // 默认 Ollama
        };

        // 应用主题
        applyTheme(config.theme);
        currentPreset = config.preset;

        resolve(config);
      });
    });
  }

  // 保存配置
  function saveConfig() {
    config = {
      apiKey: apiKeyInput.value,
      apiEndpoint: apiEndpointInput.value,
      model: modelInput.value,
      systemPrompt: systemPromptInput.value,
      theme: currentTheme,
      preset: currentPreset
    };

    chrome.storage.sync.set({
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint,
      model: config.model,
      systemPrompt: config.systemPrompt,
      theme: config.theme,
      preset: config.preset
    }, () => {
      addMessage('system', '设置已保存！');
      settingsPanel.classList.remove('active');
    });
  }

  // 模型预设配置
  const modelPresets = {
    ollama: {
      name: 'Ollama (Local)',
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3',
      systemPrompt: '你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。'
    },
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      systemPrompt: '你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。'
    },
    glm: {
      name: 'GLM (Zhipu AI)',
      endpoint: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      model: 'glm-4',
      systemPrompt: '你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。'
    },
    qwen: {
      name: 'Qwen (Alibaba)',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1',
      apiKey: '',
      model: 'qwen-max',
      systemPrompt: '你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。'
    },
    qwenCode: {
      name: 'Qwen Code (通义千问)',
      endpoint: 'https://coding.dashscope.aliyuncs.com/v1',
      apiKey: '',
      model: 'qwen-coder-plus',
      systemPrompt: '你是一个有帮助的编程助手。请用简洁清晰的中文回答，代码示例请用 Markdown 格式。'
    },
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant.'
    },
    custom: {
      name: 'Custom',
      endpoint: '',
      apiKey: '',
      model: '',
      systemPrompt: ''
    }
  };

  // 应用模型预设
  function applyPreset(presetName) {
    currentPreset = presetName;
    const preset = modelPresets[presetName] || modelPresets.ollama;

    // 更新表单
    apiEndpointInput.value = preset.endpoint;
    apiKeyInput.value = preset.apiKey;
    modelInput.value = preset.model;
    systemPromptInput.value = preset.systemPrompt;

    // 更新按钮高亮
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.preset === presetName) {
        btn.classList.add('active');
      }
    });
  }

  // 填充设置表单
  function populateSettings() {
    // 延迟获取元素，确保设置面板已打开
    apiEndpointInput = document.getElementById('apiEndpoint');
    apiKeyInput = document.getElementById('apiKey');
    modelInput = document.getElementById('model');
    systemPromptInput = document.getElementById('systemPrompt');
    themeButtons = document.querySelectorAll('.btn-secondary[data-theme]');

    apiEndpointInput.value = config.apiEndpoint;
    apiKeyInput.value = config.apiKey;
    modelInput.value = config.model;
    systemPromptInput.value = config.systemPrompt;

    // 高亮当前主题
    if (themeButtons) {
      themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === currentTheme) {
          btn.classList.add('active');
        }
      });
    }

    // 高亮模型预设
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      if (btn.dataset.preset === currentPreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 主题切换 - 使用事件委托
  settingsPanel.addEventListener('click', (e) => {
    // 处理主题切换
    if (e.target.classList.contains('btn-secondary') && e.target.dataset.theme) {
      const theme = e.target.dataset.theme;
      applyTheme(theme);
      // 高亮选中的按钮
      if (themeButtons) {
        themeButtons.forEach(b => b.classList.remove('active'));
      }
      e.target.classList.add('active');
    }

    // 处理模型预设切换
    if (e.target.classList.contains('preset-btn') && e.target.dataset.preset) {
      applyPreset(e.target.dataset.preset);
    }
  });

  // 简单的 Markdown 解析函数
  function parseMarkdown(text) {
    if (!text) return '';

    let html = text
      // 转义 HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // 代码块 (```code```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

      // 行内代码 (`code`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')

      // 粗体 (**text** 或 __text__)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')

      // 斜体 (*text* 或 _text_)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')

      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')

      // 无序列表
      .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')

      // 有序列表
      .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')

      // 换行
      .replace(/\n/g, '<br>');

    // 包裹列表项
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    return html;
  }

  // 添加消息到聊天 (支持流式更新)
  function addMessage(role, content, messageId = null) {
    if (messageId) {
      // 更新现有消息
      const msg = document.getElementById(messageId);
      if (msg) {
        msg.innerHTML = role === 'assistant' ? parseMarkdown(content) : content;
        return msg;
      }
    }

    const msgDiv = document.createElement('div');
    if (messageId) {
      msgDiv.id = messageId;
    }
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = role === 'assistant' ? parseMarkdown(content) : content;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgDiv;
  }

  // 显示加载动画
  function showLoading() {
    const loading = document.createElement('div');
    loading.className = 'message assistant typing-indicator';
    loading.id = 'loadingIndicator';
    loading.innerHTML = '<span></span><span></span><span></span>';
    chatContainer.appendChild(loading);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // 移除加载动画
  function hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.remove();
  }

  // 发送消息
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !pendingText) return;

    // 使用待处理的文本或输入框内容
    const messageText = pendingText || text;
    const mode = pendingMode;

    // 构建提示词
    let promptText = messageText;
    if (mode === 'translate') {
      promptText = `请将以下内容翻译成中文：\n\n${messageText}`;
    } else if (mode === 'explain') {
      promptText = `请解释以下内容：\n\n${messageText}`;
    } else if (mode === 'summarize') {
      promptText = `请总结以下内容的要点：\n\n${messageText}`;
    } else if (mode === 'rewrite') {
      promptText = `请润色/改写以下内容，使其更清晰流畅：\n\n${messageText}`;
    }

    // 清空待处理状态
    pendingText = "";
    pendingMode = "chat";

    // ✅ 重置快捷按钮高亮
    resetQuickActions();

    // 清空输入框
    messageInput.value = '';
    autoResizeTextarea();

    // 添加用户消息
    addMessage('user', messageText);

    // 构建消息历史
    const apiMessages = [
      { role: 'system', content: config.systemPrompt },
      ...messages,
      { role: 'user', content: promptText }
    ];

    console.log('[sidepanel] 开始发送消息:', messageText);
    console.log('[sidepanel] 配置:', config.apiEndpoint, config.model);
    console.log('[sidepanel] apiMessages:', apiMessages);

    // ✅ 创建流式消息容器
    streamMessageId = 'stream-msg-' + Date.now();
    addMessage('assistant', '（正在思考...）', streamMessageId);

    // ✅ 禁用输入，防止并发请求
    setInputEnabled(false);
    setGenerating(true);

    try {
      // 通过 background.js 调用 API (绕过 CSP 限制)
      console.log('[sidepanel] 发送 callAPI 请求到 background');
      const response = await chrome.runtime.sendMessage({
        action: 'callAPI',
        data: {
          messages: apiMessages,
          apiKey: config.apiKey,
          endpoint: config.apiEndpoint,
          model: config.model
        }
      });
      console.log('[sidepanel] 收到 background 响应:', response);

      // 处理响应
      if (response && response.success) {
        // 更新消息历史
        messages.push({ role: 'user', content: promptText });
        messages.push({ role: 'assistant', content: response.data });
        if (messages.length > 20) messages = messages.slice(-20);
      }
    } catch (error) {
      console.error('[sidepanel] 错误:', error);
      addMessage('error', '请求失败：' + (error.message || error));
      setInputEnabled(true);
      setGenerating(false);
      messageInput.focus();
    }
  }

  // ✅ 启用/禁用输入
  function setInputEnabled(enabled) {
    sendBtn.disabled = !enabled;
    messageInput.disabled = !enabled;
    messageInput.placeholder = enabled
      ? '输入消息... (Shift+Enter 换行)'
      : '正在等待回复...';
  }

  // ✅ 设置生成状态
  function setGenerating(generating) {
    isGenerating = generating;
    if (generating) {
      sendBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
    } else {
      sendBtn.style.display = 'flex';
      stopBtn.style.display = 'none';
    }
  }

  // ✅ 停止生成
  function stopGeneration() {
    if (abortController) {
      abortController.abort();
    }
  }

  // 自动调整输入框高度
  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  }

  // 事件监听
  sendBtn.addEventListener('click', sendMessage);

  stopBtn.addEventListener('click', stopGeneration);

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', autoResizeTextarea);

  // 设置面板
  settingsBtn.addEventListener('click', () => {
    populateSettings();
    settingsPanel.classList.add('active');
  });

  closeSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
  });

  saveSettings.addEventListener('click', saveConfig);

  // 快捷操作
  quickActions.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-btn')) {
      const action = e.target.dataset.action;
      pendingMode = action;

      // ✅ 高亮当前选中的按钮
      quickActions.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');

      messageInput.focus();
      messageInput.placeholder = `当前模式：${getActionName(action)}，输入内容后按 Enter 发送`;
    }
  });

  // ✅ 获取操作名称
  function getActionName(action) {
    const names = {
      translate: '翻译',
      explain: '解释',
      summarize: '总结',
      rewrite: '润色',
      chat: '对话'
    };
    return names[action] || '对话';
  }

  // ✅ 重置快捷按钮高亮
  function resetQuickActions() {
    quickActions.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    messageInput.placeholder = '输入消息... (Shift+Enter 换行)';
  }

  // 初始化
  loadConfig().then(() => {
    // 检查是否有 API key
    if (!config.apiKey) {
      setTimeout(() => {
        addMessage('system', '请先在设置中配置 API Key 和 Endpoint');
        settingsPanel.classList.add('active');
        // 初始化主题按钮监听
        populateSettings();
      }, 500);
    } else {
      // 初始化表单
      setTimeout(populateSettings, 0);
    }
  });

  // ✅ 统一消息监听
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[sidepanel] 收到消息:', message);

    // 监听打开侧边栏的消息
    if (message.action === 'openSidebar') {
      if (message.text) {
        pendingText = message.text;
        pendingMode = message.mode || 'chat';

        // 高亮对应的快捷按钮
        quickActions.querySelectorAll('.quick-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        if (message.mode && message.mode !== 'chat') {
          const activeBtn = quickActions.querySelector(`.quick-btn[data-action="${message.mode}"]`);
          if (activeBtn) activeBtn.classList.add('active');
        }

        // 自动发送
        setTimeout(sendMessage, 300);
      }
    }

    // 监听流式数据
    if (message.action === 'streamData') {
      const msg = document.getElementById(streamMessageId);
      if (msg) {
        msg.innerHTML = parseMarkdown(message.accumulated);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }

    // 监听流式完成
    if (message.action === 'streamDone') {
      console.log('[sidepanel] 流式完成:', message.content);
      setGenerating(false);
      setInputEnabled(true);
      messageInput.focus();
    }

    return true;
  });
})();
