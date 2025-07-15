#!/bin/bash

echo "🚀 集美发展集团停车场助理 - 服务系统启动脚本"
echo "============================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js (版本 >= 16)"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 检查是否存在package.json
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到package.json文件"
    exit 1
fi

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件，使用默认配置"
    echo "💡 提示: 复制 env.example 为 .env 并填入你的API密钥以获得最佳体验"
    echo ""
fi

# 启动应用
echo "🎉 启动集美发展集团停车场助理 - 服务系统..."
echo "🅿️ 停车场助手将在 http://localhost:3000 运行"
echo "⏹️  按 Ctrl+C 停止服务"
echo ""

npm start 