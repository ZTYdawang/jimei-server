// 全局变量
let currentConversationId = null;
let isWaitingForResponse = false; // 是否正在等待AI回复
let immediateReplyTimer = null; // 立即回复定时器
let delayedReplyTimer = null; // 延迟回复定时器

// 自动回复配置
const AUTO_REPLIES = {
  IMMEDIATE_REPLIES: [
    "小集已收到，正在帮你解决",
    "小集已收到您的问题，正在为您查询",
    "小集收到了，正在努力为您解答",
    "小集已接收到您的问题，正在处理中",
    "小集已收到，马上为您解决",
    "小集收到您的问题了，正在分析中",
    "小集已收到消息，正在为您处理",
    "小集已接收，正在努力解决您的问题"
  ],
  DELAYED_REPLIES: [
    "请耐心等待一下，小集正在加急处理您的问题",
    "请稍等片刻，小集正在努力为您查找答案",
    "小集正在仔细分析您的问题，请稍候",
    "请您稍等，小集正在全力解决您的问题",
    "抱歉让您久等了，小集正在紧急处理中",
    "请耐心等候，小集正在为您寻找最佳解决方案",
    "小集正在认真处理您的问题，请稍等片刻",
    "请稍作等待，小集正在加快处理速度",
    "小集正在仔细核查信息，请您稍等",
    "请您耐心等待，小集正在尽快为您解答",
    "小集正在努力获取准确信息，请稍候"
  ],
  getRandomImmediateReply() {
    return this.IMMEDIATE_REPLIES[Math.floor(Math.random() * this.IMMEDIATE_REPLIES.length)];
  },
  getRandomDelayedReply() {
    return this.DELAYED_REPLIES[Math.floor(Math.random() * this.DELAYED_REPLIES.length)];
  }
};

// DOM元素
const elements = {
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    clearBtn: document.getElementById('clear-chat'),
    loading: document.getElementById('loading'),
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),
    statusText: document.getElementById('status-text')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    bindEvents();
});

// 初始化应用
async function initializeApp() {
    console.log('🚀 应用初始化中...');
    
    try {
        // 设置欢迎消息的真实时间戳
        const welcomeTimeElement = document.getElementById('welcome-time');
        if (welcomeTimeElement) {
            welcomeTimeElement.textContent = formatTime(new Date());
        }
        
        // 创建新会话
        await createConversation();
        
        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showError('智能客服助理初始化失败，请刷新页面重试');
    }
}

// 绑定事件
function bindEvents() {
    // 发送按钮点击
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // 输入框回车发送
    elements.messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 输入框输入监听
    elements.messageInput.addEventListener('input', function() {
        const hasText = this.value.trim().length > 0;
        elements.sendBtn.disabled = !hasText || isWaitingForResponse;
    });
    
    // 清空对话
    elements.clearBtn.addEventListener('click', clearChat);
}

// 创建新会话
async function createConversation() {
    try {
        const response = await fetch('/api/conversation/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentConversationId = data.conversation_id;
            console.log('✅ 会话创建成功:', currentConversationId);
        } else {
            throw new Error(data.message || '创建会话失败');
        }
    } catch (error) {
        console.error('❌ 创建会话失败:', error);
        throw error;
    }
}

// 发送消息
async function sendMessage() {
    const text = elements.messageInput.value.trim();
    
    if (!text || !currentConversationId || isWaitingForResponse) {
        return;
    }
    
    // 设置等待状态，防止重复发送
    isWaitingForResponse = true;
    
    // 添加用户消息到界面
    addMessage('user', text);
    
    // 清空输入框并禁用
    elements.messageInput.value = '';
    elements.messageInput.disabled = true;
    elements.sendBtn.disabled = true;
    
    // 立即发送自动回复
    const immediateReply = AUTO_REPLIES.getRandomImmediateReply();
    immediateReplyTimer = setTimeout(() => {
        addMessage('assistant', immediateReply);
        console.log('🤖 立即自动回复:', immediateReply);
        
        // 15秒后发送第二条回复（如果AI还没返回）
        delayedReplyTimer = setTimeout(() => {
            if (isWaitingForResponse) {
                const delayedReply = AUTO_REPLIES.getRandomDelayedReply();
                addMessage('assistant', delayedReply);
                console.log('🤖 延迟自动回复:', delayedReply);
            }
        }, 15000);
    }, 200); // 稍微延迟一点，让用户消息先显示
    
    try {
        const response = await fetch('/api/conversation/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversation_id: currentConversationId,
                query: text
            })
        });
        
        const data = await response.json();
        
        // 调试：打印完整的API返回数据
        console.log('🔍 前端收到的完整数据:', data);
        
        if (data.success) {
            // 检查result是否存在且不为空
            if (data.result && data.result.trim()) {
                // 添加AI回复到界面
                addMessage('assistant', data.result);
                console.log('✅ 消息发送成功，AI回复:', data.result);
            } else {
                console.warn('⚠️ AI回复为空或undefined:', data.result);
                addMessage('assistant', '抱歉，我暂时无法为您处理这个问题，请您稍后再试或联系人工客服。感谢您的理解！');
            }
        } else {
            throw new Error(data.message || '发送消息失败');
        }
    } catch (error) {
        console.error('❌ 发送消息失败:', error);
        showError('消息发送失败，请检查网络后重试');
        // 可以考虑重试机制
    } finally {
        // 清理定时器
        clearAutoReplyTimers();
        
        // 恢复等待状态
        isWaitingForResponse = false;
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
    }
}

// 清理自动回复定时器
function clearAutoReplyTimers() {
    if (immediateReplyTimer) {
        clearTimeout(immediateReplyTimer);
        immediateReplyTimer = null;
    }
    if (delayedReplyTimer) {
        clearTimeout(delayedReplyTimer);
        delayedReplyTimer = null;
    }
}

// 添加消息到界面
function addMessage(type, content, timestamp = new Date()) {
    console.log(`📝 添加消息到界面 - 类型: ${type}, 内容: "${content}"`);
    
    // 验证参数
    if (!content || typeof content !== 'string') {
        console.error('❌ 消息内容无效:', content);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timeStr = formatTime(timestamp);
    const escapedContent = escapeHtml(content);
    
    console.log(`🔍 转义后的内容: "${escapedContent}"`);
    
    // 只为助手消息显示头像
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${escapedContent}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    } else {
        const avatarContent = '<img src="icon.png" alt="集发智能客服小集">';
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatarContent}</div>
            <div class="message-content">
                <div class="message-text">${escapedContent}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    }
    
    elements.messages.appendChild(messageDiv);
    console.log('✅ 消息已添加到DOM');
    
    // 滚动到底部
    setTimeout(() => {
        elements.messages.scrollTop = elements.messages.scrollHeight;
        console.log('📜 页面已滚动到底部');
    }, 100);
}


// 清空对话
async function clearChat() {
    if (!confirm('确定要清空当前对话吗？')) {
        return;
    }
    
    // 清理定时器和重置状态
    clearAutoReplyTimers();
    isWaitingForResponse = false;
    elements.messageInput.disabled = false;
    elements.sendBtn.disabled = true;
    
    // 清空消息列表
    elements.messages.innerHTML = `
        <div class="message assistant">
            <div class="message-avatar">
                <img src="icon.png" alt="集发智能客服小集">
            </div>
            <div class="message-content">
                <div class="message-text">
                    您好！我是集发智能客服小集，能帮助您解决各种疑问和问题。如果您有咨询、查询、业务办理等需求，请随时告诉我，我会竭诚为您服务！
                </div>
                <div class="message-time" id="initial-welcome-time"></div>
            </div>
        </div>
    `;
    
    // 设置欢迎消息的真实时间戳
    const initialWelcomeTimeElement = document.getElementById('initial-welcome-time');
    if (initialWelcomeTimeElement) {
        initialWelcomeTimeElement.textContent = formatTime(new Date());
    }
    
    // 创建新会话
    try {
        await createConversation();
        console.log('✅ 对话已清空');
    } catch (error) {
        showError('清空对话失败，请刷新页面');
    }
}

// 显示/隐藏加载状态（已废弃，保留空函数避免错误）
function showLoading(show) {
    // 不再显示"对方正在输入"状态，改为自动回复机制
}

// 显示错误提示
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');
    
    // 3秒后自动隐藏
    setTimeout(hideError, 3000);
}

// 隐藏错误提示
function hideError() {
    elements.errorToast.classList.add('hidden');
}

// 更新在线状态 (此功能已移除，保留函数为空)
function updateStatus(text, isOnline) {
    // const dot = elements.statusText.previousElementSibling;
    // elements.statusText.textContent = text;
    // if (isOnline) {
    //     dot.classList.add('online');
    //     dot.classList.remove('offline');
    // } else {
    //     dot.classList.add('offline');
    //     dot.classList.remove('online');
    // }
}

// 工具函数：格式化时间
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 小于1分钟
        return '刚刚';
    } else if (diff < 3600000) { // 小于1小时
        return `${Math.floor(diff / 60000)}分钟前`;
    } else if (date.toDateString() === now.toDateString()) { // 今天
        return date.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else {
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 工具函数：HTML转义 (安全加固)
function escapeHtml(text) {
    if (typeof text !== 'string') {
        console.warn('⚠️ escapeHtml收到了非字符串值:', text);
        return '';
    }
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 定期检查连接状态 (此功能已移除)
// setInterval(checkConnection, 30000); 

// function checkConnection() {
//     fetch('/api/health')
//         .then(response => {
//             if (response.ok) {
//                 updateStatus('在线', true);
//             } else {
//                 updateStatus('连接异常', false);
//             }
//         })
//         .catch(() => {
//             updateStatus('连接断开', false);
//         });
// }

// 页面可见性变化时检查连接
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // checkConnection(); // 已移除
    }
});

// 错误处理
window.addEventListener('error', function(e) {
    console.error('⚠️ 页面错误:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('⚠️ 未处理的Promise错误:', e.reason);
});

// 导出全局函数供HTML使用
window.hideError = hideError; 