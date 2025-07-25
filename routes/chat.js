const express = require('express');
const axios = require('axios');
const router = express.Router();

// 百度千帆API配置
const QIANFAN_CONFIG = {
  API_KEY: process.env.QIANFAN_API_KEY || 'bce-v3/ALTAK-oUHqa8gmTF2G2Xk2jBSWX/d814d94989cd92e13b02568aa9ba1b219d606263',
  APP_ID: process.env.QIANFAN_APP_ID || 'b2329019-fc4f-4601-8630-d308f4aaaa0f',
  BASE_URL: 'https://qianfan.baidubce.com/v2/app'
};


// 会话ID存储（生产环境建议使用Redis或数据库）
const conversations = new Map();


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