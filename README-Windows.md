# Windows环境下部署集美发展集团停车场助理

## 🚀 快速开始（Windows用户）

### 1. 前置准备

#### 必需工具
在Windows下，您需要安装以下工具之一：

**选项A: Git for Windows（推荐）**
- 下载安装：https://git-scm.windows.com/
- 安装时选择"Git Bash"和"Git from the command line"
- 自动包含SSH、SCP、Rsync工具

**选项B: Windows Subsystem for Linux (WSL)**
- 运行：`wsl --install`
- 安装Ubuntu子系统
- 在WSL中使用Linux命令

**选项C: OpenSSH for Windows**
- Windows 10/11内置，或单独安装
- 可能需要额外安装rsync

### 2. 部署应用

#### 方法A: 使用PowerShell脚本（推荐）

```powershell
# 在PowerShell中运行
.\deploy.ps1 -ServerIP "你的服务器IP" -Username "ubuntu"

# 如果使用SSH密钥
.\deploy.ps1 -ServerIP "你的服务器IP" -Username "ubuntu" -SSHKeyPath "C:\path\to\your\key.pem"

# 查看帮助
.\deploy.ps1 -Help
```

#### 方法B: 使用Git Bash

```bash
# 在Git Bash中运行
./deploy.sh 你的服务器IP ubuntu

# 如果使用SSH密钥
./deploy.sh 你的服务器IP ubuntu /c/path/to/your/key.pem
```

### 3. 环境变量配置

部署后，请配置API密钥：

```powershell
# 连接到服务器编辑环境变量
ssh ubuntu@你的服务器IP
cd /home/ubuntu/jimei-parking-assistant
nano .env
```

在`.env`文件中设置：
```env
# 百度千帆API配置（替换为你的真实密钥）
QIANFAN_API_KEY=your_actual_api_key
QIANFAN_APP_ID=your_actual_app_id

# 服务器配置
PORT=3000
NODE_ENV=production
```

保存后重启应用：
```bash
sudo docker-compose restart
```

## 🔧 常用管理命令

### 基本操作
```powershell
# 查看应用状态
ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose ps"

# 查看日志
ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose logs -f app"

# 重启应用
ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose restart"

# 停止应用
ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose down"
```

### 更新应用
```powershell
# 上传新代码并重启（在项目目录下）
rsync -avz --exclude=node_modules --exclude=.git . ubuntu@你的服务器IP:/home/ubuntu/jimei-parking-assistant/
ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose up -d --build"
```

## 🐛 故障排除

### 常见问题

1. **SSH连接失败**
   ```powershell
   # 测试SSH连接
   ssh ubuntu@你的服务器IP "echo 'Connection OK'"
   
   # 如果使用密钥
   ssh -i "C:\path\to\key.pem" ubuntu@你的服务器IP "echo 'Connection OK'"
   ```

2. **工具未找到错误**
   ```
   'ssh' 不是内部或外部命令
   ```
   解决：安装Git for Windows或启用Windows OpenSSH功能

3. **文件传输失败**
   ```powershell
   # 手动测试文件传输
   scp package.json ubuntu@你的服务器IP:/home/ubuntu/test.json
   ```

4. **容器启动失败**
   ```powershell
   # 检查服务器日志
   ssh ubuntu@你的服务器IP "cd /home/ubuntu/jimei-parking-assistant && sudo docker-compose logs app"
   ```

### 防火墙配置

确保云服务器开放必要端口：
- **SSH**: 22端口
- **应用**: 3000端口
- **HTTP**: 80端口（如果使用Nginx）
- **HTTPS**: 443端口（如果使用SSL）

## 📱 访问应用

部署成功后，通过以下地址访问：
- **直接访问**: `http://你的服务器IP:3000`
- **健康检查**: `http://你的服务器IP:3000/api/health`

## 🛡️ 安全建议

### SSH安全
```powershell
# 生成SSH密钥对（推荐）
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 复制公钥到服务器
scp C:\Users\你的用户名\.ssh\id_rsa.pub ubuntu@你的服务器IP:~/.ssh/authorized_keys
```

### 定期备份
```powershell
# 备份配置文件到本地
scp ubuntu@你的服务器IP:/home/ubuntu/jimei-parking-assistant/.env ./backup/.env
scp ubuntu@你的服务器IP:/home/ubuntu/jimei-parking-assistant/docker-compose.yml ./backup/
```

## 📞 技术支持

如果遇到问题：

1. **检查部署文档**: 查看 `deploy-guide.md`
2. **查看应用日志**: 了解具体错误信息
3. **验证网络连接**: 确保能够SSH到服务器
4. **检查环境配置**: 确认API密钥正确设置

### 常用调试命令
```powershell
# 检查Docker状态
ssh ubuntu@你的服务器IP "sudo systemctl status docker"

# 检查防火墙状态
ssh ubuntu@你的服务器IP "sudo ufw status"

# 检查端口占用
ssh ubuntu@你的服务器IP "sudo netstat -tlnp | grep :3000"

# 手动测试API
ssh ubuntu@你的服务器IP "curl http://localhost:3000/api/health"
``` 