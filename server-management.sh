#!/bin/bash

# 集美发展集团停车场助理 - 服务器管理脚本
# 使用方法: ./server-management.sh [action] [server-ip] [username]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 集美发展集团停车场助理 - 服务器管理工具${NC}"
echo "=================================================="

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [action] [server-ip] [username] [ssh-key-path]"
    echo ""
    echo "可用操作 (action):"
    echo "  deploy     - 部署应用到服务器"
    echo "  update     - 更新应用"
    echo "  start      - 启动应用"
    echo "  stop       - 停止应用"
    echo "  restart    - 重启应用"
    echo "  logs       - 查看应用日志"
    echo "  status     - 查看应用状态"
    echo "  health     - 健康检查"
    echo "  backup     - 备份配置文件"
    echo "  monitor    - 监控资源使用"
    echo "  shell      - 连接到服务器"
    echo ""
    echo "示例:"
    echo "  $0 deploy 192.168.1.100 ubuntu"
    echo "  $0 logs 192.168.1.100 ubuntu ~/.ssh/id_rsa"
    echo "  $0 status 192.168.1.100 ubuntu"
}

# 检查参数
if [ $# -lt 1 ]; then
    show_help
    exit 1
fi

ACTION=$1

if [ "$ACTION" = "help" ] || [ "$ACTION" = "--help" ] || [ "$ACTION" = "-h" ]; then
    show_help
    exit 0
fi

if [ $# -lt 3 ]; then
    echo -e "${RED}❌ 参数不足${NC}"
    show_help
    exit 1
fi

SERVER_IP=$2
USERNAME=$3
SSH_KEY=${4:-""}
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

# 检查服务器连接
check_connection() {
    echo -e "${YELLOW}🔍 检查服务器连接...${NC}"
    if $SSH_CMD "echo '连接成功'" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 服务器连接正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 无法连接到服务器${NC}"
        return 1
    fi
}

# 部署应用
deploy_action() {
    echo -e "${BLUE}🚀 开始部署应用...${NC}"
    ./deploy.sh $SERVER_IP $USERNAME $SSH_KEY
}

# 更新应用
update_action() {
    echo -e "${BLUE}🔄 更新应用...${NC}"
    
    # 上传最新代码
    echo "📤 上传最新代码..."
    $RSYNC_CMD \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude '.env' \
        . $USERNAME@$SERVER_IP:$REMOTE_DIR/
    
    # 重新构建和启动
    $SSH_CMD << EOF
cd $REMOTE_DIR
echo "🛑 停止当前应用..."
sudo docker-compose down

echo "🔨 重新构建应用..."
sudo docker-compose up -d --build

echo "⏳ 等待应用启动..."
sleep 10

echo "📊 检查应用状态..."
sudo docker-compose ps
EOF
    
    echo -e "${GREEN}✅ 应用更新完成${NC}"
}

# 启动应用
start_action() {
    echo -e "${BLUE}▶️  启动应用...${NC}"
    $SSH_CMD "cd $REMOTE_DIR && sudo docker-compose up -d"
    echo -e "${GREEN}✅ 应用已启动${NC}"
}

# 停止应用
stop_action() {
    echo -e "${BLUE}⏹️  停止应用...${NC}"
    $SSH_CMD "cd $REMOTE_DIR && sudo docker-compose down"
    echo -e "${GREEN}✅ 应用已停止${NC}"
}

# 重启应用
restart_action() {
    echo -e "${BLUE}🔄 重启应用...${NC}"
    $SSH_CMD "cd $REMOTE_DIR && sudo docker-compose restart"
    echo -e "${GREEN}✅ 应用已重启${NC}"
}

# 查看日志
logs_action() {
    echo -e "${BLUE}📋 查看应用日志...${NC}"
    echo "按 Ctrl+C 退出日志查看"
    echo "------------------------------------"
    $SSH_CMD "cd $REMOTE_DIR && sudo docker-compose logs -f app"
}

# 查看状态
status_action() {
    echo -e "${BLUE}📊 查看应用状态...${NC}"
    $SSH_CMD << EOF
cd $REMOTE_DIR

echo "📦 容器状态:"
sudo docker-compose ps

echo ""
echo "💾 镜像信息:"
sudo docker images | grep -E "(jimei|parking)" || echo "未找到相关镜像"

echo ""
echo "🔍 应用进程:"
sudo docker-compose top 2>/dev/null || echo "容器未运行"

echo ""
echo "📈 资源使用:"
sudo docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null | head -2 || echo "无法获取资源信息"
EOF
}

# 健康检查
health_action() {
    echo -e "${BLUE}🔍 健康检查...${NC}"
    $SSH_CMD << EOF
cd $REMOTE_DIR

echo "🔗 网络连接测试:"
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo "✅ 应用健康检查通过"
else
    echo "❌ 应用健康检查失败"
fi

echo ""
echo "🐳 Docker服务状态:"
sudo systemctl is-active docker

echo ""
echo "🔥 防火墙状态:"
if command -v ufw >/dev/null 2>&1; then
    sudo ufw status | grep -E "(Status|3000)" || echo "防火墙未配置"
elif command -v firewall-cmd >/dev/null 2>&1; then
    sudo firewall-cmd --list-ports | grep 3000 || echo "3000端口未开放"
else
    echo "未检测到防火墙管理工具"
fi

echo ""
echo "💾 磁盘空间:"
df -h | grep -E "(Filesystem|/$|/home)"
EOF
}

# 备份配置
backup_action() {
    echo -e "${BLUE}💾 备份配置文件...${NC}"
    
    local backup_dir="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $backup_dir
    
    # 备份重要文件
    $SCP_CMD $USERNAME@$SERVER_IP:$REMOTE_DIR/.env $backup_dir/ 2>/dev/null || echo "⚠️  .env文件不存在"
    $SCP_CMD $USERNAME@$SERVER_IP:$REMOTE_DIR/docker-compose.yml $backup_dir/
    $SCP_CMD -r $USERNAME@$SERVER_IP:$REMOTE_DIR/public $backup_dir/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ 配置文件已备份到: $backup_dir${NC}"
}

# 监控资源
monitor_action() {
    echo -e "${BLUE}📈 监控资源使用...${NC}"
    echo "按 Ctrl+C 退出监控"
    echo "------------------------------------"
    $SSH_CMD << 'EOF'
while true; do
    clear
    echo "=== 系统资源监控 $(date) ==="
    echo ""
    
    echo "🖥️  CPU和内存使用:"
    top -bn1 | head -5
    
    echo ""
    echo "💾 磁盘使用:"
    df -h | grep -E "(Filesystem|/$|/home)"
    
    echo ""
    echo "🐳 Docker容器资源:"
    sudo docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "无容器运行"
    
    echo ""
    echo "🔗 网络连接:"
    if curl -s http://localhost:3000/api/health >/dev/null; then
        echo "✅ 应用正常响应"
    else
        echo "❌ 应用无响应"
    fi
    
    sleep 5
done
EOF
}

# 连接到服务器
shell_action() {
    echo -e "${BLUE}🖥️  连接到服务器...${NC}"
    echo "连接到: $USERNAME@$SERVER_IP"
    echo "项目目录: $REMOTE_DIR"
    echo "------------------------------------"
    $SSH_CMD
}

# 主执行函数
main() {
    if ! check_connection; then
        exit 1
    fi
    
    case $ACTION in
        deploy)
            deploy_action
            ;;
        update)
            update_action
            ;;
        start)
            start_action
            ;;
        stop)
            stop_action
            ;;
        restart)
            restart_action
            ;;
        logs)
            logs_action
            ;;
        status)
            status_action
            ;;
        health)
            health_action
            ;;
        backup)
            backup_action
            ;;
        monitor)
            monitor_action
            ;;
        shell)
            shell_action
            ;;
        *)
            echo -e "${RED}❌ 未知操作: $ACTION${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main 