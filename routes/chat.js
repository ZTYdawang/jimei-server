const express = require('express');
const axios = require('axios');
const multer = require('multer');
const router = express.Router();

// 配置multer用于处理音频文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: (req, file, cb) => {
    // 允许的音频格式
    const allowedMimes = ['audio/wav', 'audio/pcm', 'audio/webm', 'audio/ogg', 'audio/mp4'];
    cb(null, allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/'));
  }
});

// 百度千帆API配置
const QIANFAN_CONFIG = {
  API_KEY: process.env.QIANFAN_API_KEY || 'bce-v3/ALTAK-oUHqa8gmTF2G2Xk2jBSWX/d814d94989cd92e13b02568aa9ba1b219d606263',
  APP_ID: process.env.QIANFAN_APP_ID || 'b2329019-fc4f-4601-8630-d308f4aaaa0f',
  BASE_URL: 'https://qianfan.baidubce.com/v2/app'
};

// 百度语音识别API配置
const BAIDU_SPEECH_CONFIG = {
  API_KEY: process.env.QIANFAN_API_KEY || 'bce-v3/ALTAK-oUHqa8gmTF2G2Xk2jBSWX/d814d94989cd92e13b02568aa9ba1b219d606263',
  BASE_URL: 'https://vop.baidu.com/pro_api',
  CUID: process.env.SPEECH_CUID || 'HUYrhzw2JBG55FpEpNERmE0laiz58jDk',
  DEV_PID: 80001 // 极速版普通话识别
};

// 会话ID存储（生产环境建议使用Redis或数据库）
const conversations = new Map();

/**
 * 调用百度语音识别API
 * @param {Buffer} audioBuffer - 音频文件的buffer
 * @param {string} format - 音频格式 (pcm, wav, etc.)
 * @returns {Promise<string>} 识别结果文本
 */
async function recognizeSpeech(audioBuffer, format = 'wav') {
  try {
    // 将音频buffer转换为base64
    const speechBase64 = audioBuffer.toString('base64');
    
    // 构造请求参数
    const requestData = {
      format: format,
      rate: 16000,
      channel: 1,
      cuid: BAIDU_SPEECH_CONFIG.CUID,
      token: "",
      dev_pid: BAIDU_SPEECH_CONFIG.DEV_PID,
      speech: speechBase64,
      len: audioBuffer.length
    };

    console.log('🎤 调用百度语音识别API，音频长度:', audioBuffer.length);

    const response = await axios({
      method: 'POST',
      url: BAIDU_SPEECH_CONFIG.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${BAIDU_SPEECH_CONFIG.API_KEY}`
      },
      data: JSON.stringify(requestData)
    });

    console.log('🔍 百度语音识别API返回:', response.data);

    // 处理返回结果
    if (response.data.err_no === 0 && response.data.result && response.data.result.length > 0) {
      const recognizedText = response.data.result[0];
      console.log('✅ 语音识别成功:', recognizedText);
      return recognizedText;
    } else {
      console.error('❌ 语音识别失败:', response.data.err_msg);
      throw new Error(response.data.err_msg || '语音识别失败');
    }

  } catch (error) {
    console.error('❌ 语音识别API调用失败:', error.message);
    throw error;
  }
}

/**
 * 创建新的对话会话
 */
router.post('/conversation/create', async (req, res) => {
  try {
    console.log('🔄 创建新会话...');
    
    const response = await axios({
      method: 'POST',
      url: `${QIANFAN_CONFIG.BASE_URL}/conversation`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QIANFAN_CONFIG.API_KEY}`
      },
      data: {
        app_id: QIANFAN_CONFIG.APP_ID
      }
    });

    const conversationId = response.data.conversation_id;
    
    // 存储会话信息
    conversations.set(conversationId, {
      id: conversationId,
      created_at: new Date(),
      messages: []
    });

    console.log('✅ 会话创建成功:', conversationId);
    
    res.json({
      success: true,
      conversation_id: conversationId,
      message: '会话创建成功'
    });

  } catch (error) {
    console.error('❌ 创建会话失败:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: '创建会话失败',
      error: error.response?.data || error.message
    });
  }
});

/**
 * 发送消息并获取回复
 */
router.post('/conversation/chat', async (req, res) => {
  try {
    const { conversation_id, query } = req.body;

    if (!conversation_id || !query) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: conversation_id 或 query'
      });
    }

    console.log(`💬 发送消息 [${conversation_id}]: ${query}`);

    const response = await axios({
      method: 'POST',
      url: `${QIANFAN_CONFIG.BASE_URL}/conversation/runs`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QIANFAN_CONFIG.API_KEY}`
      },
      data: {
        app_id: QIANFAN_CONFIG.APP_ID,
        query: query,
        conversation_id: conversation_id,
        stream: false
      }
    });

    // 先打印完整的API返回数据以便调试
    console.log('📦 百度千帆API完整返回数据:', JSON.stringify(response.data, null, 2));
    
    // 处理不同可能的返回格式
    let result = response.data.result || response.data.answer || response.data.reply || response.data.response;
    
    // 如果以上字段都没有，尝试从嵌套对象中获取
    if (!result && response.data.data) {
      result = response.data.data.result || response.data.data.answer || response.data.data.reply;
    }
    
    // 如果还是没有，使用整个data作为结果（调试用）
    if (!result) {
      console.warn('⚠️ 未找到预期的结果字段，使用完整响应');
      result = JSON.stringify(response.data, null, 2);
    }
    
    // 更新会话记录
    if (conversations.has(conversation_id)) {
      const conversation = conversations.get(conversation_id);
      conversation.messages.push({
        type: 'user',
        content: query,
        timestamp: new Date()
      });
      conversation.messages.push({
        type: 'assistant',
        content: result,
        timestamp: new Date()
      });
      conversations.set(conversation_id, conversation);
    }

    console.log(`🤖 AI回复 [${conversation_id}]: ${result}`);

    res.json({
      success: true,
      result: result,
      conversation_id: conversation_id,
      debug_data: response.data // 添加调试数据
    });

  } catch (error) {
    console.error('❌ 对话失败:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: '对话失败',
      error: error.response?.data || error.message
    });
  }
});

/**
 * 获取会话历史
 */
router.get('/conversation/:id/history', (req, res) => {
  const conversationId = req.params.id;
  
  if (conversations.has(conversationId)) {
    const conversation = conversations.get(conversationId);
    res.json({
      success: true,
      conversation: conversation
    });
  } else {
    res.status(404).json({
      success: false,
      message: '会话不存在'
    });
  }
});

/**
 * 语音识别接口
 */
router.post('/speech/recognize', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未接收到音频文件'
      });
    }

    console.log('🎤 收到语音识别请求，文件大小:', req.file.size, '字节');
    console.log('🎤 文件类型:', req.file.mimetype);

    // 确定音频格式
    let format = 'wav'; // 默认格式
    if (req.file.mimetype.includes('webm')) {
      format = 'webm';
    } else if (req.file.mimetype.includes('ogg')) {
      format = 'ogg';
    } else if (req.file.mimetype.includes('mp4')) {
      format = 'm4a';
    } else if (req.file.mimetype.includes('pcm')) {
      format = 'pcm';
    }

    // 调用百度语音识别API
    const recognizedText = await recognizeSpeech(req.file.buffer, format);

    res.json({
      success: true,
      text: recognizedText,
      message: '语音识别成功'
    });

  } catch (error) {
    console.error('❌ 语音识别失败:', error.message);
    res.status(500).json({
      success: false,
      message: '语音识别失败',
      error: error.message
    });
  }
});

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常',
    timestamp: new Date(),
    conversations_count: conversations.size
  });
});

/**
 * 健康检查接口
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: '集美发展集团停车场助理服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

module.exports = router; 