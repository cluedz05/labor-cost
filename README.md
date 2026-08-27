# 王炸大魔王工序成本工具 - 部署指南

## 项目简介

服装加工成本管理系统，支持工序管理、成本核算、Excel导入导出、数据备份等功能。纯前端静态网站，无需后端服务器。

## 目录结构

```
├── index.html              # 主页面
├── assets/
│   ├── css/
│   │   ├── style.css       # 主样式
│   │   └── style-extra.css # 额外样式
│   └── js/
│       ├── app.js          # 应用逻辑
│       └── xlsx.full.min.js # Excel处理库
├── netlify.toml            # Netlify部署配置
├── vercel.json             # Vercel部署配置
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages自动部署
└── README.md               # 本文件
```

## 部署方式

### 方式一：Netlify（推荐，最简单）

1. 注册 [Netlify](https://app.netlify.com/) 账号
2. 将本项目推送到 GitHub 仓库
3. 在 Netlify 中点击 "Add new site" → "Import an existing project"
4. 选择你的 GitHub 仓库
5. 构建命令留空，发布目录填写 `./`
6. 点击 "Deploy site"，几秒后即可获得 `https://xxx.netlify.app` 的公开访问地址

或直接拖拽整个文件夹到 Netlify Drop 页面：https://app.netlify.com/drop

### 方式二：Vercel

1. 注册 [Vercel](https://vercel.com/) 账号
2. 将本项目推送到 GitHub 仓库
3. 在 Vercel 中点击 "Add New" → "Project"
4. 选择你的 GitHub 仓库，点击 "Import"
5. Framework Preset 选择 "Other"，构建命令留空
6. 点击 "Deploy"，完成后获得 `https://xxx.vercel.app` 地址

### 方式三：GitHub Pages

1. 在 GitHub 创建新仓库
2. 将本项目所有文件推送到仓库的 `main` 分支
3. 进入仓库 Settings → Pages
4. Source 选择 "Deploy from a branch"，Branch 选择 `main` / `(root)`
5. 保存后等待几分钟，访问 `https://你的用户名.github.io/仓库名/`

或使用项目自带的 GitHub Actions 自动部署（见 `.github/workflows/deploy.yml`）。

### 方式四：Cloudflare Pages

1. 注册 [Cloudflare](https://dash.cloudflare.com/) 账号
2. 进入 Workers & Pages → Create → Pages → Connect to Git
3. 选择 GitHub 仓库
4. 构建命令留空，输出目录填写 `./`
5. 点击 "Save and Deploy"

### 方式五：自有服务器/虚拟主机

将所有文件上传到网站根目录即可，无需任何后端环境。支持 Nginx、Apache、IIS 等任意 Web 服务器。

Nginx 示例配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/wangzha-tool;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

## 本地预览

直接双击 `index.html` 即可在浏览器中打开使用。

或使用本地服务器：
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```
然后访问 http://localhost:8080

## 注意事项

1. **数据存储**：本工具所有数据存储在浏览器 localStorage 中，清除浏览器数据会导致数据丢失，请定期使用"导出数据"功能备份。
2. **文件大小**：因内嵌大量工序库数据，index.html 约 60MB，首次加载可能需要几秒，请耐心等待。
3. **浏览器兼容**：支持 Chrome、Edge、Firefox、Safari 等现代浏览器，不支持 IE。
4. **离线使用**：所有资源均为本地文件，部署后可完全离线使用（首次加载后）。

## 功能模块

- 📐 新款开发：创建款式、选择工序、计算成本
- ⚙️ 工序管理：管理平车/扎车/坎车工序单价
- 📁 历史款式：查看和管理已保存的款式
- 🗑️ 回收站：恢复误删除的款式
- 📊 操作日志：查看所有操作记录
