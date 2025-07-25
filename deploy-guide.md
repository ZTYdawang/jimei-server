# 集美发展集团停车场助理 - 云服务器Docker部署指南

## 📋 前置准备

### 1. 云服务器要求
- **系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **配置**: 最低 1核2GB，推荐 2核4GB
- **网络**: 开放 3000 端口（或自定义端口）
- **存储**: 至少 10GB 可用空间

### 2. 本地环境
- Git
- SSH客户端
- 应用代码（当前目录）

## 🚀 部署步骤

### 步骤1: 连接到云服务器

```bash
# 使用SSH连接到你的云服务器
ssh root@your-server-ip
# 或者使用密钥文件
ssh -i /path/to/your-key.pem user@your-server-ip
```

### 步骤2: 安装Docker和Docker Compose

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

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

# 将当前用户加入docker组（可选）
sudo usermod -aG docker $USER
```

### 步骤3: 上传应用代码

#### 方法A: 使用Git（推荐）
```bash
# 安装Git
sudo apt install -y git

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/your-username/jimei-parking-assistant.git
cd jimei-parking-assistant
```

#### 方法B: 使用SCP上传
```bash
# 在本地机器上执行（从项目根目录）
scp -r . user@your-server-ip:/home/user/jimei-parking-assistant
```

#### 方法C: 使用rsync（推荐）
```bash
# 在本地机器上执行
rsync -avz --exclude 'node_modules' --exclude '.git' . user@your-server-ip:/home/user/jimei-parking-assistant
```

### 步骤4: 配置环境变量

```bash
# 进入项目目录
cd /path/to/jimei-parking-assistant

# 复制环境变量模板
cp env.example .env

# 编辑环境变量
nano .env
```

编辑 `.env` 文件内容：
```env
# 百度千帆API配置（替换为你的真实API密钥）
QIANFAN_API_KEY=your_actual_api_key
QIANFAN_APP_ID=your_actual_app_id

# 服务器配置
PORT=3000
NODE_ENV=production

# 可选配置
# REDIS_URL=redis://localhost:6379
```

### 步骤5: 构建和运行应用

```bash
# 使用Docker Compose构建并启动应用
sudo docker-compose up -d --build

# 查看运行状态
sudo docker-compose ps

# 查看日志
sudo docker-compose logs -f app
```

### 步骤6: 配置防火墙

```bash
# Ubuntu/Debian 使用 ufw
sudo ufw allow 3000/tcp
sudo ufw enable

# CentOS 使用 firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 步骤7: 设置反向代理（可选）

如果需要使用域名和HTTPS，可以配置Nginx：

```bash
# 安装Nginx
sudo apt install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/jimei-parking-assistant
```

Nginx配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/jimei-parking-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 常用管理命令

### Docker管理
```bash
# 查看容器状态
sudo docker-compose ps

# 查看日志
sudo docker-compose logs -f app

# 重启应用
sudo docker-compose restart app

# 停止应用
sudo docker-compose down

# 重新构建并启动
sudo docker-compose up -d --build

# 查看容器资源使用
sudo docker stats
```

### 更新应用
```bash
# 停止应用
sudo docker-compose down

# 拉取最新代码
git pull origin main

# 重新构建并启动
sudo docker-compose up -d --build
```

### 备份和恢复
```bash
# 备份配置文件
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup

# 查看镜像
sudo docker images

# 导出镜像
sudo docker save -o jimei-parking-assistant.tar jimei-parking-assistant_app:latest
```

## 🐛 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查看端口使用情况
sudo netstat -tlnp | grep :3000
# 或者
sudo lsof -i :3000
```

2. **容器无法启动**
```bash
# 查看详细错误日志
sudo docker-compose logs app
```

3. **权限问题**
```bash
# 确保Docker权限正确
sudo chmod 666 /var/run/docker.sock
```

4. **API连接问题**
```bash
# 测试API连通性
curl -X POST http://localhost:3000/api/conversation/create
```

### 健康检查
```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查容器健康状态
sudo docker-compose ps
```

## 🔒 安全建议

1. **防火墙配置**：只开放必要端口
2. **定期更新**：保持系统和Docker最新版本
3. **备份策略**：定期备份配置和数据
4. **监控日志**：设置日志轮转和监控
5. **HTTPS配置**：生产环境使用SSL证书

## 📊 监控和日志

### 设置日志轮转
```bash
# 创建日志轮转配置
sudo nano /etc/logrotate.d/docker-compose

# 添加内容：
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

### 资源监控
```bash
# 安装htop
sudo apt install htop

# 查看系统资源
htop

# 查看Docker资源使用
sudo docker stats
```

## 🎯 访问应用

部署完成后，您可以通过以下地址访问应用：

- **直接访问**: `http://your-server-ip:3000`
- **域名访问**: `http://your-domain.com`（如果配置了Nginx）

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 服务器网络连接
2. Docker服务状态
3. 环境变量配置
4. 防火墙设置
5. 应用日志信息 