// 全局变量
let currentConversationId = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// DOM元素
const elements = {
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    voiceBtn: document.getElementById('voice-btn'),
    clearBtn: document.getElementById('clear-chat'),
    loading: document.getElementById('loading'),
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),
    statusText: document.getElementById('status-text'),
    voiceModal: document.getElementById('voice-modal'),
    voiceText: document.getElementById('voice-text'),
    voiceTips: document.getElementById('voice-tips')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 确保语音按钮先显示
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        voiceBtn.style.display = 'flex';
        voiceBtn.style.visibility = 'visible';
        console.log('🔍 强制显示语音按钮');
    }
    
    initializeApp();
    bindEvents();
});

// 初始化应用
async function initializeApp() {
    console.log('🚀 应用初始化中...');
    
    try {
        // 创建新会话
        await createConversation();
        
        // 初始化语音识别
        initSpeechRecognition();
        
        // 检查语音权限
        checkVoicePermission();
        
        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showError('停车场助手初始化失败，请刷新页面重试');
    }
}

// 绑定事件
function bindEvents() {
    // 发送按钮点击
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // 输入框回车发送
    elements.messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 输入框输入监听
    elements.messageInput.addEventListener('input', function() {
        const hasText = this.value.trim().length > 0;
        elements.sendBtn.disabled = !hasText;
    });
    
    // 语音按钮事件
    if (elements.voiceBtn) {
        elements.voiceBtn.addEventListener('mousedown', startVoiceRecording);
        elements.voiceBtn.addEventListener('mouseup', stopVoiceRecording);
        elements.voiceBtn.addEventListener('mouseleave', stopVoiceRecording);
        
        // 移动端触摸事件
        elements.voiceBtn.addEventListener('touchstart', startVoiceRecording);
        elements.voiceBtn.addEventListener('touchend', stopVoiceRecording);
        
        // 阻止语音按钮的默认行为
        elements.voiceBtn.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    // 清空对话
    elements.clearBtn.addEventListener('click', clearChat);
}

// 创建新会话
async function createConversation() {
    showLoading(true);
    
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
            // updateStatus('在线', true); // 已移除
        } else {
            throw new Error(data.message || '创建会话失败');
        }
    } catch (error) {
        console.error('❌ 创建会话失败:', error);
        // updateStatus('离线', false); // 已移除
        throw error;
    } finally {
        showLoading(false);
    }
}

// 发送消息
async function sendMessage() {
    const text = elements.messageInput.value.trim();
    
    if (!text || !currentConversationId) {
        return;
    }
    
    // 添加用户消息到界面
    addMessage('user', text);
    
    // 清空输入框
    elements.messageInput.value = '';
    
    // 显示加载状态
    showLoading(true);
    
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
        showLoading(false);
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
        const avatarContent = '<img src="icon.png" alt="集美发展集团停车场助理">';
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

// 开始语音录制
async function startVoiceRecording(e) {
    e.preventDefault();
    
    if (isRecording) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        audioChunks = [];
        isRecording = true;
        
        // 更新UI状态
        elements.voiceBtn.classList.add('recording');
        elements.voiceModal.classList.remove('hidden');
        elements.voiceText.textContent = '正在录音中...';
        elements.voiceTips.textContent = '松开按钮结束录音';
        
        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            handleVoiceInput(audioBlob);
            
            // 停止所有音轨
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        console.log('🎤 开始录音');
        
    } catch (error) {
        console.error('❌ 录音失败:', error);
        showError('无法访问麦克风，请检查权限设置');
        isRecording = false;
    }
}

// 停止语音录制
function stopVoiceRecording(e) {
    e.preventDefault();
    
    if (!isRecording) return;
    
    // 录音模式
    if (mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
        
        // 更新UI状态
        elements.voiceBtn.classList.remove('recording');
        
        console.log('🎤 录音结束');
    }
}

// 初始化语音识别
function initSpeechRecognition() {
    // 检查浏览器是否支持录音
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('✅ 语音录音功能初始化成功');
        // 确保按钮可见
        if (elements.voiceBtn) {
            elements.voiceBtn.style.display = 'flex';
            elements.voiceBtn.style.visibility = 'visible';
        }
    } else {
        console.log('⚠️ 浏览器不支持录音功能');
        if (elements.voiceBtn) {
            elements.voiceBtn.style.display = 'none';
        }
    }
}

// 处理语音输入
async function handleVoiceInput(audioBlob) {
    showLoading(true);
    elements.voiceText.textContent = '正在识别语音...';
    
    try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        
        console.log('🎤 发送音频到后端进行识别，音频大小:', audioBlob.size);
        
        // 发送到后端API
        const response = await fetch('/api/speech/recognize', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 将识别结果填入输入框
            elements.messageInput.value = data.text;
            elements.sendBtn.disabled = false;
            
            // 自动聚焦到输入框
            elements.messageInput.focus();
            
            console.log('✅ 语音识别成功:', data.text);
            elements.voiceText.textContent = '识别完成';
            
        } else {
            throw new Error(data.message || '语音识别失败');
        }
        
    } catch (error) {
        console.error('❌ 语音识别失败:', error);
        showError('语音识别失败，请重试');
        elements.voiceText.textContent = '识别失败';
        
    } finally {
        showLoading(false);
        elements.voiceModal.classList.add('hidden');
    }
}

// 检查语音权限
function checkVoicePermission() {
    // 检查是否支持录音
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    
    if (!hasMediaDevices) {
        if (elements.voiceBtn) {
            elements.voiceBtn.style.display = 'none';
        }
        console.warn('⚠️ 当前浏览器不支持录音功能');
        return;
    }
    
    // 确保按钮可见
    if (elements.voiceBtn) {
        elements.voiceBtn.style.display = 'flex';
        elements.voiceBtn.style.visibility = 'visible';
    }
    console.log('✅ 支持录音功能（使用百度语音识别服务）');
}

// 清空对话
async function clearChat() {
    if (!confirm('确定要清空当前对话吗？')) {
        return;
    }
    
    // 清空消息列表
    elements.messages.innerHTML = `
        <div class="message assistant">
            <div class="message-avatar">
                <img src="icon.png" alt="集美发展集团停车场助理">
            </div>
            <div class="message-content">
                <div class="message-text">
                    您好！我是集美发展停车场助理小集，能帮助您解决停车场相关的各种疑问和问题。如果您有停车咨询、费用查询、业务办理等需求，请随时告诉我，我会竭诚为您服务！
                </div>
                <div class="message-time">刚刚</div>
            </div>
        </div>
    `;
    
    // 创建新会话
    try {
        await createConversation();
        console.log('✅ 对话已清空');
    } catch (error) {
        showError('清空对话失败，请刷新页面');
    }
}

// 显示/隐藏加载状态
function showLoading(show) {
    if (show) {
        elements.loading.classList.remove('hidden');
        // 禁用发送按钮和输入框
        elements.sendBtn.disabled = true;
        elements.messageInput.disabled = true;
        // 改变placeholder提示
        elements.messageInput.placeholder = '对方正在输入...';
    } else {
        elements.loading.classList.add('hidden');
        // 恢复发送按钮和输入框状态
        elements.messageInput.disabled = false;
        elements.messageInput.placeholder = '请输入您的问题...';
        // 根据输入框内容决定发送按钮状态
        const hasText = elements.messageInput.value.trim().length > 0;
        elements.sendBtn.disabled = !hasText;
    }
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