# 多绮爱服饰工序成本工具 - 在线多人共享后端

这是一个简单的Node.js Express后端服务，用于实现多绮爱服饰工序成本工具的在线多人共享功能。

## 功能特点

- 简单易用：基于Express框架，数据存储在JSON文件中
- 多人共享：所有用户共享同一份数据
- 实时同步：前端可以定期轮询获取最新数据
- REST API：提供完整的REST API供前端调用

## 部署方法

### 方法1：部署到Render（推荐，免费）

1. 注册Render账号：https://render.com
2. 点击"New" -> "Web Service"
3. 连接你的GitHub仓库
4. 配置：
   - Build Command: `npm install`
   - Start Command: `npm start`
5. 点击"Create Web Service"
6. 等待部署完成，获取你的API地址

### 方法2：部署到Vercel

1. 注册Vercel账号：https://vercel.com
2. 安装Vercel CLI：`npm install -g vercel`
3. 在项目目录运行：`vercel`
4. 按照提示完成部署

### 方法3：本地运行

1. 安装依赖：`npm install`
2. 启动服务器：`npm start`
3. 访问：http://localhost:3000

## API文档

### 获取所有数据
```
GET /api/data
```

### 获取特定key的数据
```
GET /api/data/:key
```

### 更新所有数据
```
PUT /api/data
Content-Type: application/json

{
  "styles": [...],
  "style_library": [...],
  ...
}
```

### 更新特定key的数据
```
PUT /api/data/:key
Content-Type: application/json

{
  "value": ...
}
```

### 批量更新数据
```
POST /api/batch
Content-Type: application/json

{
  "styles": [...],
  "style_library": [...]
}
```

### 获取数据最后更新时间
```
GET /api/last-updated
```

### 健康检查
```
GET /api/health
```

## 前端集成

在前端代码中，设置API地址：
```javascript
const API_BASE_URL = 'https://your-render-app.onrender.com/api';
```

然后使用fetch调用API：
```javascript
// 获取数据
const response = await fetch(`${API_BASE_URL}/data`);
const data = await response.json();

// 更新数据
await fetch(`${API_BASE_URL}/data`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newData)
});
```

## 注意事项

1. 数据存储在JSON文件中，适合小型应用
2. 如果数据量很大，建议使用数据库（如MongoDB、PostgreSQL）
3. 建议添加身份验证，防止未授权访问
4. 建议添加数据备份功能
