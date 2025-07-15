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
    elements.voiceBtn.addEventListener('mousedown', startVoiceRecording);
    elements.voiceBtn.addEventListener('mouseup', stopVoiceRecording);
    elements.voiceBtn.addEventListener('mouseleave', stopVoiceRecording);
    
    // 移动端触摸事件
    elements.voiceBtn.addEventListener('touchstart', startVoiceRecording);
    elements.voiceBtn.addEventListener('touchend', stopVoiceRecording);
    
    // 清空对话
    elements.clearBtn.addEventListener('click', clearChat);
    
    // 阻止语音按钮的默认行为
    elements.voiceBtn.addEventListener('contextmenu', e => e.preventDefault());
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
            updateStatus('在线', true);
        } else {
            throw new Error(data.message || '创建会话失败');
        }
    } catch (error) {
        console.error('❌ 创建会话失败:', error);
        updateStatus('离线', false);
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
    
    // 优先使用语音识别API
    if (isUsingSpeechAPI && speechRecognition) {
        try {
            isRecording = true;
            
            // 更新UI状态
            elements.voiceBtn.classList.add('recording');
            elements.voiceModal.classList.remove('hidden');
            elements.voiceText.textContent = '正在识别语音...';
            elements.voiceTips.textContent = '请说话，松开按钮结束';
            
            // 开始语音识别
            speechRecognition.start();
            console.log('🎤 开始语音识别');
            
        } catch (error) {
            console.error('❌ 语音识别启动失败:', error);
            showError('语音识别启动失败，请重试');
            isRecording = false;
            elements.voiceBtn.classList.remove('recording');
            elements.voiceModal.classList.add('hidden');
        }
        return;
    }
    
    // 回退到录音模式
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
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
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
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
    
    // 如果使用语音识别API
    if (isUsingSpeechAPI && speechRecognition) {
        try {
            speechRecognition.stop();
            console.log('🎤 停止语音识别');
        } catch (error) {
            console.error('❌ 停止语音识别失败:', error);
        }
        isRecording = false;
        elements.voiceBtn.classList.remove('recording');
        return;
    }
    
    // 录音模式
    if (mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
        
        // 更新UI状态
        elements.voiceBtn.classList.remove('recording');
        elements.voiceModal.classList.add('hidden');
        
        console.log('🎤 录音结束');
    }
}

// 语音识别相关变量
let speechRecognition = null;
let isUsingSpeechAPI = false;

// 初始化语音识别
function initSpeechRecognition() {
    // 检查浏览器是否支持语音识别
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        
        // 配置语音识别
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = 'zh-CN'; // 设置为中文
        speechRecognition.maxAlternatives = 1;
        
        // 识别结果处理
        speechRecognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            console.log('🎤 语音识别结果:', transcript);
            
            // 将识别结果填入输入框
            elements.messageInput.value = transcript;
            elements.sendBtn.disabled = false;
            
            // 自动聚焦到输入框
            elements.messageInput.focus();
            
            showLoading(false);
            elements.voiceModal.classList.add('hidden');
        };
        
        // 错误处理
        speechRecognition.onerror = function(event) {
            console.error('❌ 语音识别错误:', event.error);
            showLoading(false);
            elements.voiceModal.classList.add('hidden');
            
            let errorMessage = '语音识别失败，请重试';
            switch(event.error) {
                case 'no-speech':
                    errorMessage = '未检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMessage = '无法访问麦克风，请检查权限';
                    break;
                case 'not-allowed':
                    errorMessage = '麦克风权限被拒绝，请允许访问';
                    break;
                case 'network':
                    errorMessage = '网络错误，请检查网络连接';
                    break;
            }
            showError(errorMessage);
        };
        
        // 识别开始
        speechRecognition.onstart = function() {
            console.log('🎤 语音识别已开始');
            elements.voiceText.textContent = '正在听取您的语音...';
        };
        
        // 识别结束
        speechRecognition.onend = function() {
            console.log('🎤 语音识别结束');
            isRecording = false;
            elements.voiceBtn.classList.remove('recording');
            showLoading(false);
            elements.voiceModal.classList.add('hidden');
        };
        
        isUsingSpeechAPI = true;
        console.log('✅ 语音识别初始化成功');
    } else {
        console.log('⚠️ 浏览器不支持语音识别，使用录音模式');
        isUsingSpeechAPI = false;
    }
}

// 处理语音输入
async function handleVoiceInput(audioBlob) {
    // 如果使用的是语音识别API，这个函数不会被调用
    // 这里保留录音模式的处理逻辑
    
    showLoading(true);
    
    try {
        // 这里可以集成其他语音转文字服务
        // 比如百度语音识别API、阿里云、腾讯云等
        
        // 暂时提示用户手动输入
        showError('当前浏览器不支持语音识别，请手动输入或尝试其他浏览器');
        
    } catch (error) {
        console.error('❌ 语音转文字失败:', error);
        showError('语音识别失败，请重试');
    } finally {
        showLoading(false);
    }
}

// 检查语音权限
function checkVoicePermission() {
    // 检查是否支持语音识别或录音
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    
    if (!hasSpeechRecognition && !hasMediaDevices) {
        elements.voiceBtn.style.display = 'none';
        console.warn('⚠️ 当前浏览器不支持语音功能');
        return;
    }
    
    if (hasSpeechRecognition) {
        console.log('✅ 支持语音识别API');
    } else if (hasMediaDevices) {
        console.log('✅ 支持录音功能（需要外部语音识别服务）');
    }
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

// 更新状态
function updateStatus(text, isOnline) {
    elements.statusText.textContent = text;
    const statusDot = document.querySelector('.status-dot');
    
    if (isOnline) {
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
    } else {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
    }
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

// 工具函数：HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 连接状态检查
function checkConnection() {
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateStatus('在线', true);
            } else {
                updateStatus('连接异常', false);
            }
        })
        .catch(() => {
            updateStatus('离线', false);
        });
}

// 每30秒检查一次连接状态
setInterval(checkConnection, 30000);

// 页面可见性变化时检查连接
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkConnection();
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