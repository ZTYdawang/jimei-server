# 集美发展集团停车场助理 - Windows PowerShell 部署脚本
# 使用方法: .\deploy.ps1 -ServerIP "192.168.1.100" -Username "ubuntu" [-SSHKeyPath "C:\path\to\key.pem"]

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$false)]
    [string]$SSHKeyPath = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

if ($Help) {
    Write-Host "🚀 集美发展集团停车场助理 - Windows部署脚本" -ForegroundColor Blue
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\deploy.ps1 -ServerIP `"192.168.1.100`" -Username `"ubuntu`""
    Write-Host "  .\deploy.ps1 -ServerIP `"192.168.1.100`" -Username `"ubuntu`" -SSHKeyPath `"C:\path\to\key.pem`""
    Write-Host ""
    Write-Host "参数说明:"
    Write-Host "  -ServerIP    : 云服务器IP地址"
    Write-Host "  -Username    : SSH用户名"
    Write-Host "  -SSHKeyPath  : SSH私钥文件路径（可选）"
    Write-Host "  -Help        : 显示帮助信息"
    exit 0
}

$ProjectName = "jimei-parking-assistant"
$RemoteDir = "/home/$Username/$ProjectName"

Write-Host "🚀 集美发展集团停车场助理 - 自动化部署" -ForegroundColor Blue
Write-Host "=============================================="
Write-Host ""
Write-Host "📡 服务器信息:" -ForegroundColor Yellow
Write-Host "   IP地址: $ServerIP"
Write-Host "   用户名: $Username"
Write-Host "   项目目录: $RemoteDir"
if ($SSHKeyPath) {
    Write-Host "   SSH密钥: $SSHKeyPath"
}
Write-Host ""

# 检查必需工具
function Test-RequiredTools {
    Write-Host "🔍 检查必需工具..." -ForegroundColor Yellow
    
    $tools = @("ssh", "scp", "rsync")
    $missing = @()
    
    foreach ($tool in $tools) {
        try {
            $null = Get-Command $tool -ErrorAction Stop
            Write-Host "✅ $tool 可用" -ForegroundColor Green
        } catch {
            $missing += $tool
            Write-Host "❌ $tool 不可用" -ForegroundColor Red
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "❌ 缺少必需工具，请安装:" -ForegroundColor Red
        Write-Host "   推荐安装 Git for Windows 或 Windows Subsystem for Linux (WSL)"
        Write-Host "   或者使用 OpenSSH for Windows"
        return $false
    }
    
    return $true
}

# 构建SSH命令
function Get-SSHCommand {
    if ($SSHKeyPath) {
        return "ssh -i `"$SSHKeyPath`" $Username@$ServerIP"
    } else {
        return "ssh $Username@$ServerIP"
    }
}

# 构建SCP命令
function Get-SCPCommand {
    if ($SSHKeyPath) {
        return "scp -i `"$SSHKeyPath`""
    } else {
        return "scp"
    }
}

# 构建Rsync命令
function Get-RsyncCommand {
    if ($SSHKeyPath) {
        return "rsync -avz -e `"ssh -i '$SSHKeyPath'`""
    } else {
        return "rsync -avz"
    }
}

# 检查服务器连接
function Test-ServerConnection {
    Write-Host "🔍 检查服务器连接..." -ForegroundColor Yellow
    
    $sshCmd = Get-SSHCommand
    try {
        $result = Invoke-Expression "$sshCmd `"echo '连接成功'`"" 2>$null
        if ($result -eq "连接成功") {
            Write-Host "✅ 服务器连接正常" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ 无法连接到服务器: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    return $false
}

# 上传项目文件
function Sync-ProjectFiles {
    Write-Host "📤 上传项目文件..." -ForegroundColor Yellow
    
    $sshCmd = Get-SSHCommand
    $rsyncCmd = Get-RsyncCommand
    
    # 创建远程目录
    Invoke-Expression "$sshCmd `"mkdir -p $RemoteDir`""
    
    # 排除不需要的文件并上传
    $excludes = @(
        "--exclude=node_modules",
        "--exclude=.git", 
        "--exclude=*.log",
        "--exclude=.env",
        "--exclude=backup-*",
        "--exclude=*.ps1"
    )
    
    $excludeStr = $excludes -join " "
    $command = "$rsyncCmd $excludeStr . $Username@${ServerIP}:$RemoteDir/"
    
    Write-Host "执行命令: $command" -ForegroundColor Gray
    Invoke-Expression $command
    
    Write-Host "✅ 文件上传完成" -ForegroundColor Green
}

# 配置环境变量
function Set-EnvironmentVariables {
    Write-Host "⚙️ 配置环境变量..." -ForegroundColor Yellow
    
    $sshCmd = Get-SSHCommand
    $scpCmd = Get-SCPCommand
    
    if (Test-Path ".env") {
        Write-Host "📋 发现本地.env文件，上传到服务器..." -ForegroundColor Cyan
        Invoke-Expression "$scpCmd .env $Username@${ServerIP}:$RemoteDir/"
    } else {
        Write-Host "⚠️ 未发现.env文件，创建模板文件..." -ForegroundColor Yellow
        Invoke-Expression "$sshCmd `"cd $RemoteDir && cp env.example .env`""
        Write-Host "❗ 请编辑服务器上的.env文件，填入正确的API密钥！" -ForegroundColor Red
        Write-Host "   命令: ssh $Username@$ServerIP 'nano $RemoteDir/.env'" -ForegroundColor Gray
    }
}

# 部署应用
function Deploy-Application {
    Write-Host "🚀 构建和启动应用..." -ForegroundColor Yellow
    
    $sshCmd = Get-SSHCommand
    
    $deployScript = @"
cd $RemoteDir

echo '🛑 停止现有容器（如果存在）...'
sudo docker-compose down 2>/dev/null || true

echo '🔨 构建并启动应用...'
sudo docker-compose up -d --build

echo '⏳ 等待应用启动...'
sleep 10

echo '📊 容器状态:'
sudo docker-compose ps

echo '🔍 检查应用健康状态:'
        if curl -f http://localhost:3001/api/health 2>/dev/null; then
    echo '✅ 应用健康检查通过'
else
    echo '⚠️ 应用健康检查失败，查看日志:'
    sudo docker-compose logs app | tail -20
fi
"@

    Invoke-Expression "$sshCmd `"$deployScript`""
}

# 配置防火墙
function Set-Firewall {
    Write-Host "🔥 配置防火墙..." -ForegroundColor Yellow
    
    $sshCmd = Get-SSHCommand
    
    $firewallScript = @"
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 3001/tcp
    sudo ufw --force enable
    echo '✅ UFW防火墙配置完成'
elif command -v firewall-cmd >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=3001/tcp
    sudo firewall-cmd --reload
    echo '✅ Firewalld防火墙配置完成'
else
    echo '⚠️ 未检测到防火墙管理工具，请手动开放3001端口'
fi
"@

    Invoke-Expression "$sshCmd `"$firewallScript`""
}

# 主执行流程
function Main {
    if (-not (Test-RequiredTools)) {
        exit 1
    }
    
    if (-not (Test-ServerConnection)) {
        Write-Host ""
        Write-Host "💡 故障排除建议:" -ForegroundColor Cyan
        Write-Host "   1. 检查服务器IP地址是否正确"
        Write-Host "   2. 检查用户名是否正确"
        Write-Host "   3. 检查SSH密钥路径（如果使用）"
        Write-Host "   4. 确认服务器SSH服务正在运行"
        Write-Host "   5. 检查防火墙是否阻止SSH连接"
        exit 1
    }
    
    try {
        Sync-ProjectFiles
        Set-EnvironmentVariables
        Deploy-Application
        Set-Firewall
        
        Write-Host ""
        Write-Host "🎉 部署完成！" -ForegroundColor Green
        Write-Host "=============================================="
        Write-Host "📊 部署信息:" -ForegroundColor Cyan
            Write-Host "   访问地址: http://$ServerIP:3001"
    Write-Host "   健康检查: http://$ServerIP:3001/api/health"
        Write-Host ""
        Write-Host "🔧 常用管理命令:" -ForegroundColor Cyan
        Write-Host "   查看日志: ssh $Username@$ServerIP 'cd $RemoteDir && sudo docker-compose logs -f app'"
        Write-Host "   重启应用: ssh $Username@$ServerIP 'cd $RemoteDir && sudo docker-compose restart app'"
        Write-Host "   停止应用: ssh $Username@$ServerIP 'cd $RemoteDir && sudo docker-compose down'"
        Write-Host ""
        Write-Host "⚠️ 如果使用了.env模板文件，请记得配置正确的API密钥！" -ForegroundColor Yellow
        
    } catch {
        Write-Host ""
        Write-Host "❌ 部署过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 执行主函数
Main 