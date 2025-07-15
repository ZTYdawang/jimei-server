# 使用一个轻量级的 Node.js 镜像作为基础
FROM node:18-alpine

# 在容器中创建一个目录来存放应用代码
WORKDIR /app

# 复制 package.json 和 package-lock.json 到工作目录
COPY package*.json ./

# 安装生产环境依赖
RUN npm ci --only=production

# 复制所有剩余的应用代码
COPY . .

# 添加非 root 用户以增强安全性
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 将工作目录的所有权交给新用户
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露应用运行的端口
EXPOSE 3000

#
# ---- 关键修改：使用 node 直接进行健康检查 ----
#
# 这个命令会每隔30秒尝试连接容器内的3000端口。
# --interval=30s: 检查间隔
# --timeout=10s: 超时时间
# --start-period=40s: 启动宽限期
# --retries=3: 重试次数
# CMD [ "node", "-e", "require('http').request({host: 'localhost', port: 3000, path: '/api/health', method: 'GET'}, r => process.exit(r.statusCode === 200 ? 0 : 1)).end()" ]
# 上面的原生 Node.js 检查在某些 shell 环境下可能存在问题，我们使用一个更简单、更通用的 wget 命令。
# Alpine 默认包含 wget 的精简版。
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

# 定义容器启动时执行的命令
CMD [ "npm", "start" ]