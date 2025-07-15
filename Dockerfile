# 使用一个轻量级的 Node.js 镜像作为基础
FROM node:18-alpine

# 在容器中创建一个目录来存放应用代码
WORKDIR /app

# 复制 package.json 和 package-lock.json (可选，但良好实践)
COPY package*.json ./

# 复制完整的依赖文件夹
COPY node_modules ./

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
# ---- 暂时移除健康检查以进行诊断 ----
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD wget -q --spider http://localhost:3000/api/health || exit 1

# 定义容器启动时执行的命令
CMD [ "npm", "start" ]