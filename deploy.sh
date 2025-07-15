#!/bin/bash

# 集美发展集团停车场助理 - 自动化部署脚本
# 使用方法: ./deploy.sh [server-ip] [username]

set -e

echo "🚀 集美发展集团停车场助理 - 自动化部署脚本"
echo "=============================================="

# 检查参数
if [ $# -lt 2 ]; then
    echo "❌ 使用方法: $0 <server-ip> <username> [ssh-key-path]"
    echo "   示例: $0 192.168.1.100 ubuntu"
    echo "   示例: $0 192.168.1.100 ubuntu ~/.ssh/id_rsa"
    exit 1
fi

SERVER_IP=$1
USERNAME=$2
SSH_KEY=${3:-""}
PROJECT_NAME="jimei-parking-assistant"
REMOTE_DIR="/home/$USERNAME/$PROJECT_NAME"

# 构建SSH命令
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="ssh -i $SSH_KEY $USERNAME@$SERVER_IP"
    SCP_CMD="scp -i $SSH_KEY"
    RSYNC_CMD="rsync -avz -e 'ssh -i $SSH_KEY'"
else
    SSH_CMD="ssh $USERNAME@$SERVER_IP"
    SCP_CMD="scp"
    RSYNC_CMD="rsync -avz"
fi

echo "📡 服务器信息:"
echo "   IP地址: $SERVER_IP"
echo "   用户名: $USERNAME"
echo "   项目目录: $REMOTE_DIR"
echo ""

# 函数：检查服务器连接
check_connection() {
    echo "🔍 检查服务器连接..."
    if $SSH_CMD "echo '连接成功'" >/dev/null 2>&1; then
        echo "✅ 服务器连接正常"
    else
        echo "❌ 无法连接到服务器，请检查IP地址、用户名和SSH密钥"
        exit 1
    fi
}

# 函数：检查Docker是否安装
check_docker() {
    echo "🐳 检查Docker安装状态..."
    if $SSH_CMD "docker --version && docker-compose --version" >/dev/null 2>&1; then
        echo "✅ Docker已安装"
        return 0
    else
        echo "⚠️  Docker未安装，开始安装..."
        return 1
    fi
}

# 函数：安装Docker
install_docker() {
    echo "📦 安装Docker和Docker Compose..."
    $SSH_CMD << 'EOF'
# 更新系统包
sudo apt update

# 安装必要的依赖
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker的GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入docker组
sudo usermod -aG docker $USER

echo "✅ Docker安装完成"
EOF
}

# 函数：上传项目文件
upload_files() {
    echo "📤 上传项目文件..."
    
    # 创建远程目录
    $SSH_CMD "mkdir -p $REMOTE_DIR"
    
    # 排除不需要的文件
    $RSYNC_CMD \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude '.env' \
        . $USERNAME@$SERVER_IP:$REMOTE_DIR/
    
    echo "✅ 文件上传完成"
}

# 函数：配置环境变量
setup_env() {
    echo "⚙️  配置环境变量..."
    
    if [ -f ".env" ]; then
        echo "📋 发现本地.env文件，上传到服务器..."
        $SCP_CMD .env $USERNAME@$SERVER_IP:$REMOTE_DIR/
    else
        echo "⚠️  未发现.env文件，创建模板文件..."
        $SSH_CMD "cd $REMOTE_DIR && cp env.example .env"
        echo "❗ 请编辑服务器上的.env文件，填入正确的API密钥！"
        echo "   命令: ssh $USERNAME@$SERVER_IP 'nano $REMOTE_DIR/.env'"
    fi
}

# 函数：构建和启动应用
deploy_app() {
    echo "🚀 构建和启动应用..."
    
    $SSH_CMD << EOF
cd $REMOTE_DIR

# 停止现有容器（如果存在）
sudo docker-compose down 2>/dev/null || true

# 构建并启动应用
sudo docker-compose up -d --build

# 等待应用启动
echo "⏳ 等待应用启动..."
sleep 10

# 检查容器状态
echo "📊 容器状态:"
sudo docker-compose ps

# 检查应用健康状态
echo "🔍 检查应用健康状态:"
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo "✅ 应用健康检查通过"
else
    echo "⚠️  应用健康检查失败，查看日志:"
    sudo docker-compose logs app | tail -20
fi
EOF
}

# 函数：配置防火墙
setup_firewall() {
    echo "🔥 配置防火墙..."
    
    $SSH_CMD << 'EOF'
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 3000/tcp
    sudo ufw --force enable
    echo "✅ UFW防火墙配置完成"
elif command -v firewall-cmd >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "✅ Firewalld防火墙配置完成"
else
    echo "⚠️  未检测到防火墙管理工具，请手动开放3000端口"
fi
EOF
}

# 主执行流程
main() {
    check_connection
    
    if ! check_docker; then
        install_docker
        echo "⚠️  Docker安装完成，需要重新登录以应用用户组变更"
        echo "   请运行: ssh $USERNAME@$SERVER_IP 'newgrp docker'"
    fi
    
    upload_files
    setup_env
    deploy_app
    setup_firewall
    
    echo ""
    echo "🎉 部署完成！"
    echo "=============================================="
    echo "📊 部署信息:"
    echo "   访问地址: http://$SERVER_IP:3000"
    echo "   健康检查: http://$SERVER_IP:3000/api/health"
    echo ""
    echo "🔧 常用管理命令:"
    echo "   查看日志: ssh $USERNAME@$SERVER_IP 'cd $REMOTE_DIR && sudo docker-compose logs -f app'"
    echo "   重启应用: ssh $USERNAME@$SERVER_IP 'cd $REMOTE_DIR && sudo docker-compose restart app'"
    echo "   停止应用: ssh $USERNAME@$SERVER_IP 'cd $REMOTE_DIR && sudo docker-compose down'"
    echo ""
    echo "⚠️  如果使用了.env模板文件，请记得配置正确的API密钥！"
}

# 执行主函数
main 