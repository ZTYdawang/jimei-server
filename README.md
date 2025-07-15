# 集美发展集团停车场助理 - 智能客服系统

基于百度千帆大模型API构建的停车场专业客服对话工具，为集美发展集团停车场提供智能化服务支持。

## ✨ 功能特点

- 🅿️ **停车场专业服务**：专注于停车场咨询、费用查询、业务办理等服务
- 🤖 **智能对话**：集成百度千帆大模型，提供专业的停车场客服能力
- 💬 **实时聊天**：流畅的对话界面，支持多轮对话和问题处理
- 🎤 **语音输入**：支持按住说话的语音录制功能
- 📱 **移动端适配**：完美适配手机端，符合微信使用习惯
- 🎨 **微信风格UI**：仿微信原生界面，用户体验熟悉友好
- 🐳 **Docker支持**：一键部署，支持容器化运行

## 🚀 快速开始

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd jimei_customer_service
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，填入你的百度千帆API密钥
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
   - 打开浏览器访问：http://localhost:3000

### Docker部署

1. **构建镜像**
```bash
npm run docker:build
```

2. **运行容器**
```bash
npm run docker:run
```

或者使用 Docker Compose：

```bash
# 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 启动服务
docker-compose up -d
```

## 📋 环境变量配置

创建 `.env` 文件并配置以下参数：

```env
# 百度千帆API配置（必需）
QIANFAN_API_KEY=your_qianfan_api_key
QIANFAN_APP_ID=your_app_id

# 服务器配置
PORT=3000
NODE_ENV=production
```

## 🛠️ 技术栈

- **后端**：Node.js + Express
- **前端**：原生HTML/CSS/JavaScript
- **AI接口**：百度千帆大模型API
- **部署**：Docker + Docker Compose
- **语音**：Web Audio API + MediaRecorder

## 📁 项目结构

```
jimei_customer_service/
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   └── script.js          # 前端逻辑
├── routes/                # 后端路由
│   └── chat.js           # 聊天API路由
├── server.js             # 服务器入口文件
├── package.json          # 项目配置
├── Dockerfile           # Docker构建文件
├── docker-compose.yml   # Docker Compose配置
└── README.md           # 项目文档
```

## 🔧 API文档

### 创建会话
```http
POST /api/conversation/create
```

### 发送消息
```http
POST /api/conversation/chat
Content-Type: application/json

{
  "conversation_id": "会话ID",
  "query": "用户消息"
}
```

### 健康检查
```http
GET /api/health
```

## 🎯 使用说明

1. **开始咨询**：进入页面后会看到集美发展集团停车场助理的欢迎消息
2. **停车咨询**：可以询问停车收费标准、月卡办理、车位预约等问题
3. **文字交流**：在输入框输入问题，点击发送或按回车键
4. **语音输入**：按住麦克风按钮说话，松开后自动识别（当前为演示模式）
5. **清空对话**：点击垃圾桶图标可以清空当前对话重新开始

## 📱 移动端支持

- 支持触摸屏操作
- 适配竖屏显示
- 优化移动端交互体验
- 防止iOS自动缩放

## 🔐 安全说明

- API密钥通过环境变量配置，不会暴露在前端代码中
- 支持HTTPS部署
- 包含基本的错误处理和输入验证

## 🚀 部署建议

### 生产环境部署

1. **使用HTTPS**：建议配置SSL证书
2. **环境变量**：妥善管理API密钥等敏感信息
3. **反向代理**：可配合Nginx使用
4. **监控日志**：关注应用运行状态

### 扩展功能

- [ ] 集成真实的语音识别API
- [ ] 添加用户认证系统
- [ ] 支持文件上传
- [ ] 添加对话历史记录
- [ ] 支持多语言
- [ ] 添加管理后台

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issues和Pull Requests来帮助改进项目。

## 📞 支持

如有问题，请提交Issue或联系开发团队。 