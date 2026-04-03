// 内容脚本 - 处理页面交互和悬浮工具栏
(function() {
  // 避免重复注入
  if (window.__aiSidebarInjected) return;
  window.__aiSidebarInjected = true;

  let selectedText = "";
  let floatToolbar = null;
  let resultCard = null;
  let hideTimeout = null;
  let config = null;

  // 加载配置
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (items) => {
        config = {
          apiKey: items.apiKey || "",
          apiEndpoint: items.apiEndpoint || "http://localhost:11434/v1",
          model: items.model || "llama3",
          systemPrompt: items.systemPrompt || "你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。"
        };
        resolve(config);
      });
    });
  }

  // 简单的 Markdown 解析
  function parseMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    return html;
  }

  // 创建悬浮工具栏
  function createFloatToolbar() {
    if (floatToolbar) return floatToolbar;

    const toolbar = document.createElement('div');
    toolbar.id = 'ai-float-toolbar';
    toolbar.innerHTML = `
      <button class="toolbar-btn" data-action="translate" title="翻译">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>
        </svg>
      </button>
      <button class="toolbar-btn" data-action="explain" title="解释">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
        </svg>
      </button>
      <button class="toolbar-btn" data-action="summarize" title="总结">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      </button>
      <button class="toolbar-btn" data-action="rewrite" title="润色">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" data-action="chat" title="侧边栏对话">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
    `;

    toolbar.style.cssText = `
      position: fixed;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
      z-index: 999999;
      opacity: 0;
      transform: translateY(8px) scale(0.96);
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    `;

    document.body.appendChild(toolbar);

    // 绑定按钮事件
    toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (selectedText) {
          if (action === 'chat' || action === 'explain') {
            // 打开侧边栏
            chrome.runtime.sendMessage({
              action: "openSidebar",
              text: selectedText,
              mode: action
            });
          } else {
            // 显示浮窗结果
            showResultCard(selectedText, action);
          }
          hideToolbar();
        }
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.08)';
        btn.style.background = 'rgba(99, 102, 241, 0.08)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.background = 'transparent';
      });
    });

    floatToolbar = toolbar;
    return toolbar;
  }

  // 创建结果卡片
  function createResultCard() {
    if (resultCard) return resultCard;

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">✨</span>
          <span class="card-action">AI 结果</span>
        </div>
        <div class="card-actions">
          <button class="card-btn" data-action="copy" title="复制">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
          </button>
          <button class="card-btn" data-action="close" title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-loading">
        <div class="loading-spinner"></div>
        <span>AI 正在思考...</span>
      </div>
      <div class="card-content"></div>
      <div class="card-footer">
        <button class="footer-btn" data-action="regenerate">🔄 重新生成</button>
        <button class="footer-btn" data-action="deep-chat">💬 深入对话</button>
      </div>
    `;

    card.style.cssText = `
      position: fixed;
      width: 420px;
      max-height: 500px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.7);
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
      z-index: 999998;
      opacity: 0;
      transform: translateY(12px) scale(0.97);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    document.body.appendChild(card);

    // 绑定事件
    card.querySelector('[data-action="close"]').addEventListener('click', hideResultCard);
    card.querySelector('[data-action="copy"]').addEventListener('click', copyResult);
    card.querySelector('[data-action="regenerate"]').addEventListener('click', regenerate);
    card.querySelector('[data-action="deep-chat"]').addEventListener('click', openDeepChat);

    resultCard = card;
    return card;
  }

  // 显示结果卡片
  function showResultCard(text, action) {
    if (!resultCard) createResultCard();

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 计算位置：选区下方
    let left = rect.left;
    let top = rect.bottom + 12;

    // 边界检查
    if (left + 420 > window.innerWidth - 20) {
      left = window.innerWidth - 440;
    }
    if (left < 20) left = 20;
    if (top + 500 > window.innerHeight - 20) {
      top = rect.top - 520;
    }
    if (top < 20) top = 20;

    resultCard.style.left = left + 'px';
    resultCard.style.top = top + 'px';
    resultCard.style.pointerEvents = 'auto';
    resultCard.style.opacity = '1';
    resultCard.style.transform = 'translateY(0) scale(1)';

    // 更新卡片状态
    const actionNames = { translate: '翻译', summarize: '总结', rewrite: '润色' };
    resultCard.querySelector('.card-action').textContent = `AI ${actionNames[action] || '处理'}`;
    resultCard.querySelector('.card-loading').style.display = 'flex';
    resultCard.querySelector('.card-content').innerHTML = '';
    resultCard.querySelector('.card-footer').style.display = 'none';

    // 调用 AI
    callAI(text, action);
  }

  // 隐藏结果卡片
  function hideResultCard() {
    if (!resultCard) return;
    resultCard.style.opacity = '0';
    resultCard.style.transform = 'translateY(12px) scale(0.97)';
    resultCard.style.pointerEvents = 'none';
  }

  // 复制结果
  function copyResult() {
    const content = resultCard.querySelector('.card-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
      const btn = resultCard.querySelector('[data-action="copy"]');
      btn.innerHTML = '✓';
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
          </svg>
        `;
      }, 1500);
    });
  }

  // 重新生成
  function regenerate() {
    const lastRequest = resultCard._lastRequest;
    if (lastRequest) {
      callAI(lastRequest.text, lastRequest.action);
    }
  }

  // 打开深度对话（侧边栏）
  function openDeepChat() {
    const content = resultCard.querySelector('.card-content').textContent;
    chrome.runtime.sendMessage({
      action: "openSidebar",
      text: "请继续解释：" + content,
      mode: "chat"
    });
  }

  // 调用 AI
  async function callAI(text, action) {
    if (!config) await loadConfig();

    // 构建提示词
    const prompts = {
      translate: `请将以下内容翻译成中文，保持原意但使表达更流畅：\n\n"${text}"`,
      summarize: `请用简洁的中文总结以下内容的核心要点（3-5 条）：\n\n"${text}"`,
      rewrite: `请润色/改写以下内容，使其更清晰、专业、流畅：\n\n"${text}"`
    };

    const messages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: prompts[action] || text }
    ];

    // 保存请求信息用于重新生成
    resultCard._lastRequest = { text, action };

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'callAPI',
        data: {
          messages,
          apiKey: config.apiKey,
          endpoint: config.apiEndpoint,
          model: config.model
        }
      });

      if (response && response.success) {
        // 渲染结果
        const content = resultCard.querySelector('.card-content');
        content.innerHTML = parseMarkdown(response.data);
        resultCard.querySelector('.card-loading').style.display = 'none';
        resultCard.querySelector('.card-footer').style.display = 'flex';
      } else {
        throw new Error(response?.error || 'AI 请求失败');
      }
    } catch (error) {
      resultCard.querySelector('.card-loading').style.display = 'none';
      resultCard.querySelector('.card-content').innerHTML = `<div style="color: #dc3545; padding: 16px;">❌ 请求失败：${error.message}</div>`;
      resultCard.querySelector('.card-footer').style.display = 'flex';
    }
  }

  // 显示工具栏
  function showToolbar() {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (!selectedText || selection.rangeCount === 0) {
      hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!floatToolbar) createFloatToolbar();

    const toolbarWidth = 260;
    const toolbarHeight = 48;
    let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    let top = rect.top - toolbarHeight - 10;

    if (left < 10) left = 10;
    if (left + toolbarWidth > window.innerWidth - 10) {
      left = window.innerWidth - toolbarWidth - 10;
    }
    if (top < 10) top = rect.bottom + 10;

    floatToolbar.style.left = left + 'px';
    floatToolbar.style.top = top + 'px';
    floatToolbar.style.pointerEvents = 'auto';
    floatToolbar.style.opacity = '1';
    floatToolbar.style.transform = 'translateY(0) scale(1)';
  }

  // 隐藏工具栏
  function hideToolbar() {
    if (!floatToolbar) return;
    floatToolbar.style.opacity = '0';
    floatToolbar.style.transform = 'translateY(8px) scale(0.96)';
    floatToolbar.style.pointerEvents = 'none';
  }

  // 事件监听
  document.addEventListener('mouseup', (e) => {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (floatToolbar && floatToolbar.contains(e.target)) return;
      if (resultCard && resultCard.contains(e.target)) return;

      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text) {
        showToolbar();
      } else {
        hideToolbar();
      }
    }, 50);
  });

  document.addEventListener('mousedown', (e) => {
    if (floatToolbar && !floatToolbar.contains(e.target) &&
        resultCard && !resultCard.contains(e.target)) {
      hideToolbar();
    }
  });

  document.addEventListener('scroll', () => {
    hideToolbar();
    hideResultCard();
  }, true);

  window.addEventListener('resize', () => {
    hideToolbar();
    hideResultCard();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideToolbar();
      hideResultCard();
    }
  });

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .toolbar-divider {
      width: 1px;
      height: 24px;
      background: rgba(0, 0, 0, 0.1);
      margin: 0 4px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 10px;
      cursor: pointer;
      color: #4b5563;
      transition: all 0.15s ease;
    }

    .toolbar-btn svg {
      transition: transform 0.15s ease;
    }

    .toolbar-btn:hover svg {
      transform: scale(1.1);
    }

    #ai-result-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    #ai-result-card .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #1f2937;
    }

    #ai-result-card .card-icon {
      font-size: 16px;
    }

    #ai-result-card .card-actions {
      display: flex;
      gap: 4px;
    }

    #ai-result-card .card-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    #ai-result-card .card-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #1f2937;
    }

    #ai-result-card .card-loading {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: #6b7280;
      font-size: 14px;
    }

    #ai-result-card .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    #ai-result-card .card-content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      font-size: 14px;
      line-height: 1.7;
      color: #1f2937;
      max-height: 320px;
    }

    #ai-result-card .card-content pre {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    #ai-result-card .card-content code {
      background: rgba(99, 102, 241, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.9em;
    }

    #ai-result-card .card-content pre code {
      background: transparent;
      padding: 0;
    }

    #ai-result-card .card-content strong {
      color: #6366f1;
      font-weight: 600;
    }

    #ai-result-card .card-content ul,
    #ai-result-card .card-content ol {
      padding-left: 20px;
      margin: 8px 0;
    }

    #ai-result-card .card-footer {
      display: none;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      background: rgba(0, 0, 0, 0.02);
    }

    #ai-result-card .footer-btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 8px;
      font-size: 13px;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    #ai-result-card .footer-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `;
  document.head.appendChild(style);
})();
