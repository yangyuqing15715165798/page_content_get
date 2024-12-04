// 存储自定义选择器
let customSelectors = new Set();

// 添加自定义选择器
document.getElementById('addSelector').addEventListener('click', () => {
  const input = document.getElementById('customSelector');
  const selector = input.value.trim();
  
  if (!selector) {
    showStatus('请输入选择器', 'red');
    return;
  }

  try {
    // 测试选择器是否有效
    document.querySelector(selector);
    customSelectors.add(selector);
    input.value = '';
    updateCustomSelectorsList();
    showStatus('选择器添加成功', '#4CAF50');
  } catch (e) {
    showStatus('无效的选择器', 'red');
  }
});

// 更新自定义选择器列表
function updateCustomSelectorsList() {
  const list = document.getElementById('customSelectorsList');
  list.innerHTML = Array.from(customSelectors).map(selector => `
    <div style="display: flex; justify-content: space-between; align-items: center; 
                margin: 5px 0; padding: 5px; background: #fff; border-radius: 3px;">
      <span style="overflow: hidden; text-overflow: ellipsis;">${selector}</span>
      <button onclick="removeSelector('${selector}')" 
              style="padding: 2px 6px; background: #ff4444; color: white; 
                     border: none; border-radius: 3px; cursor: pointer;">
        删除
      </button>
    </div>
  `).join('');
}

// 删除自定义选择器
window.removeSelector = (selector) => {
  customSelectors.delete(selector);
  updateCustomSelectorsList();
};

document.getElementById('getContent').addEventListener('click', async () => {
  // 获取所有选项
  const options = {
    keyword: document.getElementById('filterKeyword').value,
    includeParagraphs: document.getElementById('filterParagraphs').checked,
    includeHeadings: document.getElementById('filterHeadings').checked,
    includeLinks: document.getElementById('filterLinks').checked,
    includeImages: document.getElementById('filterImages').checked,
    includeLists: document.getElementById('filterLists').checked,
    includeTables: document.getElementById('filterTables').checked,
    customSelectors: Array.from(customSelectors)
  };

  // 获取当前活动标签页
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 注入并执行内容脚本
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: (options) => {
      let content = [];

      function addContent(elements, prefix = '') {
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text) content.push(prefix + text);
        });
      }

      // 获取段落
      if (options.includeParagraphs) {
        addContent(document.querySelectorAll('p'));
      }

      // 获取标题
      if (options.includeHeadings) {
        addContent(document.querySelectorAll('h1, h2, h3, h4, h5, h6'), '标题: ');
      }

      // 获取链接
      if (options.includeLinks) {
        addContent(document.querySelectorAll('a'), '链接: ');
      }

      // 获取图片描述
      if (options.includeImages) {
        document.querySelectorAll('img').forEach(img => {
          if (img.alt) content.push(`图片: ${img.alt}`);
          if (img.title) content.push(`图片标题: ${img.title}`);
        });
      }

      // 获取列表
      if (options.includeLists) {
        document.querySelectorAll('ul, ol').forEach(list => {
          content.push('列表:');
          list.querySelectorAll('li').forEach(item => {
            const text = item.textContent.trim();
            if (text) content.push(`  • ${text}`);
          });
        });
      }

      // 获取表格
      if (options.includeTables) {
        document.querySelectorAll('table').forEach(table => {
          content.push('表格:');
          table.querySelectorAll('tr').forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'))
              .map(cell => cell.textContent.trim())
              .filter(text => text);
            if (cells.length) content.push(`  ${cells.join(' | ')}`);
          });
        });
      }

      // 处理自定义选择器
      options.customSelectors.forEach(selector => {
        try {
          addContent(document.querySelectorAll(selector), `自定义(${selector}): `);
        } catch (e) {
          content.push(`选择器错误(${selector}): ${e.message}`);
        }
      });

      // 关键词过滤
      if (options.keyword) {
        content = content.filter(text => 
          text.toLowerCase().includes(options.keyword.toLowerCase())
        );
      }

      return content.join('\n');
    },
    args: [options]
  });

  // 显示获取到的内容
  document.getElementById('content').textContent = result[0].result || '没有找到匹配的内容';
});

// 添加实时过滤功能
document.getElementById('filterKeyword').addEventListener('input', () => {
  const content = document.getElementById('content');
  if (content.textContent) {
    document.getElementById('getContent').click();
  }
});

// 添加复制功能
document.getElementById('copyContent').addEventListener('click', async () => {
  const content = document.getElementById('content').textContent;
  
  if (!content) {
    document.getElementById('copyStatus').textContent = '没有内容可复制！';
    showCopyStatus('red');
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    document.getElementById('copyStatus').textContent = '复制成功！';
    showCopyStatus('#4CAF50');
  } catch (err) {
    document.getElementById('copyStatus').textContent = '复制失败，请重试！';
    showCopyStatus('red');
  }
});

// 显示复制状态的辅助函数
function showCopyStatus(color) {
  const status = document.getElementById('copyStatus');
  status.style.color = color;
  status.classList.add('show');
  
  // 2秒后隐藏状态信息
  setTimeout(() => {
    status.classList.remove('show');
  }, 2000);
}

// 当内容为空时禁用复制按钮
const observer = new MutationObserver(() => {
  const content = document.getElementById('content');
  const copyButton = document.getElementById('copyContent');
  copyButton.disabled = !content.textContent;
});

observer.observe(document.getElementById('content'), {
  childList: true,
  characterData: true,
  subtree: true
});

// 添加预设选择器的处理
document.getElementById('presetSelector').addEventListener('change', (e) => {
  const selector = e.target.value;
  if (selector) {
    customSelectors.add(selector);
    updateCustomSelectorsList();
    // 重置选择框
    e.target.value = '';
  }
});

// 添加状态提示函数
function showStatus(message, color) {
  const status = document.getElementById('copyStatus');
  status.textContent = message;
  status.style.color = color;
  status.classList.add('show');
  
  setTimeout(() => {
    status.classList.remove('show');
  }, 2000);
} 