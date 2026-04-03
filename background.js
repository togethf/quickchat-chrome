// 背景脚本 - 处理 API 调用和侧边栏

// 初始化默认设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (items) => {
    if (!items.apiKey) {
      chrome.storage.sync.set({
        apiKey: "",
        apiEndpoint: "http://localhost:11434/v1",
        model: "llama3",
        systemPrompt: "你是一个有帮助的 AI 助手。请用简洁清晰的中文回答。"
      });
    }
  });
});

// 处理扩展图标点击 - 打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// 监听来自 content script 和 sidepanel 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[background] 收到消息:', message);

  // 处理打开侧边栏并传入文本的请求
  if (message.action === "openSidebar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        chrome.sidePanel.open({ windowId: tab.windowId }).then(() => {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              action: "openSidebar",
              text: message.text,
              mode: message.mode
            });
          }, 150);
        });
      }
    });
    return true;
  }

  if (message.action === "callAPI") {
    console.log('[background] 开始调用 LLM API:', message.data.endpoint, message.data.model);
    callLLMAPI(message.data)
      .then(response => {
        console.log('[background] API 调用成功');
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('[background] API 调用失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === "getConfig") {
    chrome.storage.sync.get(null, (items) => {
      sendResponse({ config: items });
    });
    return true;
  }
});

// 调用大模型 API (流式)
async function callLLMAPI({ messages, apiKey, endpoint, model }) {
  const apiEndpoint = endpoint.endsWith('/chat/completions')
    ? endpoint
    : endpoint.endsWith('/v1')
      ? endpoint + '/chat/completions'
      : endpoint + '/v1/chat/completions';

  console.log('[LLMAPI] 请求端点:', apiEndpoint);
  console.log('[LLMAPI] 模型:', model);

  const headers = {
    "Content-Type": "application/json"
  };

  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const requestBody = {
      model: model,
      messages: messages,
      stream: true
    };

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败：${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (let line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              accumulated += content;
              chrome.runtime.sendMessage({
                action: 'streamData',
                content: content,
                accumulated: accumulated
              });
            }
          } catch (e) {
            console.error('[LLMAPI] 解析流数据失败:', e, line);
          }
        }
      }
    }

    chrome.runtime.sendMessage({
      action: 'streamDone',
      content: accumulated
    });

    return accumulated;

  } catch (error) {
    console.error('[LLMAPI] 请求失败:', error);
    throw error;
  }
}
