const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'labor-cost-data.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        styles: [],
        style_library: [],
        users: [],
        config: {},
        last_updated: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log('初始化数据文件');
}

// 读取数据
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        return { styles: [], style_library: [], users: [], config: {}, last_updated: new Date().toISOString() };
    }
}

// 写入数据
function writeData(data) {
    try {
        data.last_updated = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('写入数据失败:', error);
        return false;
    }
}

// API路由

// 获取所有数据
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json({
        success: true,
        data: data,
        last_updated: data.last_updated
    });
});

// 获取特定key的数据
app.get('/api/data/:key', (req, res) => {
    const key = req.params.key;
    const data = readData();
    
    if (data[key] !== undefined) {
        res.json({
            success: true,
            key: key,
            data: data[key],
            last_updated: data.last_updated
        });
    } else {
        res.status(404).json({
            success: false,
            message: `找不到key: ${key}`
        });
    }
});

// 更新所有数据
app.put('/api/data', (req, res) => {
    const newData = req.body;
    
    if (!newData || typeof newData !== 'object') {
        return res.status(400).json({
            success: false,
            message: '无效的数据格式'
        });
    }
    
    const success = writeData(newData);
    
    if (success) {
        res.json({
            success: true,
            message: '数据更新成功',
            last_updated: newData.last_updated
        });
    } else {
        res.status(500).json({
            success: false,
            message: '数据更新失败'
        });
    }
});

// 更新特定key的数据
app.put('/api/data/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body.value;
    
    if (value === undefined) {
        return res.status(400).json({
            success: false,
            message: '缺少value参数'
        });
    }
    
    const data = readData();
    data[key] = value;
    
    const success = writeData(data);
    
    if (success) {
        res.json({
            success: true,
            message: `key ${key} 更新成功`,
            last_updated: data.last_updated
        });
    } else {
        res.status(500).json({
            success: false,
            message: '数据更新失败'
        });
    }
});

// 批量更新数据
app.post('/api/batch', (req, res) => {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
            success: false,
            message: '无效的更新格式'
        });
    }
    
    const data = readData();
    
    for (const [key, value] of Object.entries(updates)) {
        data[key] = value;
    }
    
    const success = writeData(data);
    
    if (success) {
        res.json({
            success: true,
            message: '批量更新成功',
            updated_keys: Object.keys(updates),
            last_updated: data.last_updated
        });
    } else {
        res.status(500).json({
            success: false,
            message: '批量更新失败'
        });
    }
});

// 获取数据最后更新时间
app.get('/api/last-updated', (req, res) => {
    const data = readData();
    res.json({
        success: true,
        last_updated: data.last_updated
    });
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`多绮爱服饰在线后端服务已启动`);
    console.log(`服务器地址: http://localhost:${PORT}`);
    console.log(`API文档:`);
    console.log(`  GET  /api/data          - 获取所有数据`);
    console.log(`  GET  /api/data/:key     - 获取特定key的数据`);
    console.log(`  PUT  /api/data          - 更新所有数据`);
    console.log(`  PUT  /api/data/:key     - 更新特定key的数据`);
    console.log(`  POST /api/batch         - 批量更新数据`);
    console.log(`  GET  /api/last-updated  - 获取数据最后更新时间`);
    console.log(`  GET  /api/health        - 健康检查`);
});
