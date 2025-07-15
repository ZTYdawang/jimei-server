const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const qianfan = require('@baidu/qianfan');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer配置，用于处理文件上传（存储在内存中）
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// ---- 新增：百度语音识别接口 ----
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '没有上传音频文件' });
    }

    const audioBuffer = req.file.buffer;
    const audioBase64 = audioBuffer.toString('base64');
    const audioLength = audioBuffer.length;
    
    // 从环境变量中获取百度API的认证信息
    const baiduAuthToken = process.env.BAIDU_ASR_AUTHORIZATION;

    if (!baiduAuthToken) {
        console.error('错误：未在环境变量中设置 BAIDU_ASR_AUTHORIZATION');
        return res.status(500).json({ success: false, message: '服务器语音识别服务未配置' });
    }
    
    const options = {
        method: 'POST',
        url: 'https://vop.baidu.com/pro_api',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${baiduAuthToken}`
        },
        data: JSON.stringify({
            "format": "pcm",
            "rate": 16000,
            "channel": 1,
            "cuid": "jimei_parking_assistant_cuid", // 建议使用稳定、唯一的设备ID
            "token": process.env.BAIDU_ACCESS_TOKEN, // 这个token需要通过API Key和Secret Key获取，暂时留空
            "dev_pid": 80001,
            "speech": audioBase64,
            "len": audioLength
        })
    };

    try {
        const response = await axios(options);
        console.log('百度语音识别API响应:', response.data);

        if (response.data.err_no === 0 && response.data.result) {
            res.json({ success: true, text: response.data.result.join('') });
        } else {
            // 返回百度具体的错误信息，方便调试
            res.status(400).json({ success: false, message: `语音识别失败: ${response.data.err_msg}` });
        }
    } catch (error) {
        console.error('调用百度语音识别API时出错:', error);
        res.status(500).json({ success: false, message: '调用语音识别服务时出错' });
    }
});


// 创建新会话
app.post('/api/conversation/create', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// API路由
app.use('/api', require('./routes/chat'));

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API测试页面路由
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-api.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 集美发展集团停车场助理服务器运行在 http://localhost:${PORT}`);
  console.log(`🅿️ 停车场助手界面: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
}); 