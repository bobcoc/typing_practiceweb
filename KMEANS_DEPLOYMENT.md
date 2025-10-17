# K-Means 演示页面部署指南

## 已完成的工作

### 1. 创建的文件

- **src/components/KMeansDemo.tsx** - K-Means 算法演示组件
- **KMEANS_README.md** - 使用说明文档
- **KMEANS_DEPLOYMENT.md** - 本部署指南

### 2. 修改的文件

- **src/App.tsx** - 添加了 `/kmeans` 路由
- **src/components/Navbar.tsx** - 添加了导航菜单项

### 3. 功能特性

✅ 画布绘图功能（800x600）  
✅ 随机生成点（可控制数量）  
✅ 鼠标左键添加点/设置质心  
✅ 鼠标右键清空画布  
✅ K值可调节（1-10）  
✅ 坐标显示开关  
✅ 逐步演示 K-Means 算法  
✅ 距离可视化（线段 + 数值）  
✅ 导出到 Excel  
✅ 从 Excel 导入  
✅ 响应式布局  

## 本地开发环境

### 访问地址

- 开发服务器: http://localhost:3001/kmeans

### 启动命令

```bash
# 1. 安装依赖（首次或更新后）
npm install

# 2. 启动开发服务器
npm run start

# 或者只启动前端（K-Means 是纯前端功能）
npm run client
```

### 浏览器预览

启动成功后：
1. 打开浏览器访问 http://localhost:3001
2. 点击导航栏中的 "K-Means演示" 菜单项
3. 或直接访问 http://localhost:3001/kmeans

## 生产环境部署

### 方案一：使用现有服务器

如果您已经有一个运行中的服务器：

1. **构建生产版本**
   ```bash
   npm run build
   ```

2. **部署构建文件**
   - 构建后的文件在 `build/` 目录下
   - 将整个 `build/` 目录复制到服务器的静态文件目录
   - 确保服务器配置了 SPA 路由支持（所有路由都指向 index.html）

3. **Nginx 配置示例**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /path/to/build;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 静态资源缓存
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **访问地址**
   - https://your-domain.com/kmeans

### 方案二：静态托管服务

可以使用以下任一平台进行静态托管：

#### Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

#### Netlify 部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 构建并部署
npm run build
netlify deploy --prod --dir=build
```

#### GitHub Pages 部署

1. 修改 `package.json`，添加 homepage 字段：
   ```json
   {
     "homepage": "https://yourusername.github.io/typing_practiceweb"
   }
   ```

2. 安装 gh-pages：
   ```bash
   npm install --save-dev gh-pages
   ```

3. 添加部署脚本到 `package.json`：
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

4. 部署：
   ```bash
   npm run deploy
   ```

### 方案三：Docker 容器化部署

创建 `Dockerfile`:

```dockerfile
# 构建阶段
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}
```

构建和运行：

```bash
# 构建镜像
docker build -t typing-practice-web .

# 运行容器
docker run -d -p 80:80 typing-practice-web
```

## 环境要求

### 最低要求

- Node.js >= 16.x
- npm >= 7.x
- 现代浏览器（支持 ES2017+ 和 Canvas API）

### 推荐配置

- Node.js 18.x LTS
- npm 9.x
- Chrome/Firefox/Safari/Edge 最新版本

## 性能优化建议

### 1. 代码分割

当前 K-Means 组件已经是独立的，React Router 会自动进行代码分割。如需进一步优化，可以使用懒加载：

```typescript
// App.tsx
const KMeansDemo = lazy(() => import('./components/KMeansDemo'));

// 在路由中使用
<Route path="/kmeans" element={
  <Suspense fallback={<div>加载中...</div>}>
    <KMeansDemo />
  </Suspense>
} />
```

### 2. CDN 加速

如果使用自己的服务器，建议配置 CDN 加速静态资源：

- 将 build 目录下的静态文件上传到 CDN
- 修改构建配置指向 CDN 地址

### 3. 压缩优化

生产构建已经自动启用：
- JavaScript minification
- CSS minification
- Tree shaking
- Gzip 压缩（需服务器支持）

## 验证部署

### 检查清单

- [ ] 页面可以正常访问（/kmeans 路由）
- [ ] 导航菜单显示 "K-Means演示" 链接
- [ ] 画布可以正常显示（800x600）
- [ ] 可以生成随机点
- [ ] 可以手动添加点和质心
- [ ] "执行一步" 按钮功能正常
- [ ] 距离线和数值显示正确
- [ ] Excel 导入导出功能正常
- [ ] 右键菜单被禁用（用于清空画布）
- [ ] 响应式布局在不同设备上正常

### 测试步骤

1. 访问 /kmeans 页面
2. 设置 K=3
3. 点击"生成随机点"
4. 在画布上点击3次设置质心
5. 点击"执行一步"查看算法演示
6. 导出数据到 Excel
7. 清空画布后重新导入 Excel 数据

## 故障排查

### 问题1: 页面404

**原因**: SPA 路由未配置

**解决**: 
- 检查服务器配置是否支持 SPA 路由
- Nginx 需要配置 `try_files $uri $uri/ /index.html`
- Apache 需要配置 `.htaccess`

### 问题2: Excel 导入导出不工作

**原因**: xlsx 库未正确加载

**解决**:
```bash
npm install xlsx --save
npm rebuild
```

### 问题3: 画布不显示

**原因**: Canvas API 不支持或样式问题

**解决**:
- 检查浏览器是否支持 Canvas
- 检查是否有 CSS 样式冲突
- 打开浏览器开发者工具查看错误信息

### 问题4: TypeScript 编译错误

**原因**: 类型定义缺失

**解决**:
```bash
npm install --save-dev @types/react @types/react-dom
```

## 安全考虑

1. **CSP 策略**: 如果服务器配置了 Content Security Policy，确保允许：
   - Canvas 绘图
   - Blob URLs (用于 Excel 下载)

2. **CORS**: K-Means 是纯前端功能，不涉及跨域请求

3. **数据隐私**: 
   - 所有数据都在浏览器本地处理
   - Excel 导入导出不会上传到服务器
   - 不收集用户数据

## 维护和更新

### 更新依赖

```bash
# 检查过期的依赖
npm outdated

# 更新依赖
npm update

# 更新主要版本（谨慎）
npm install <package>@latest
```

### 监控和日志

生产环境建议添加：
- 错误监控（如 Sentry）
- 性能监控（如 Google Analytics）
- 用户行为分析

## 联系和支持

如遇到问题：
1. 查看浏览器控制台错误信息
2. 检查本文档的故障排查章节
3. 查看 KMEANS_README.md 了解功能说明

## 更新日志

### v1.0.0 (2025-10-17)
- ✨ 初始版本发布
- ✨ 完整的 K-Means 算法可视化
- ✨ Excel 导入导出功能
- ✨ 响应式设计
- ✨ 集成到主应用导航
