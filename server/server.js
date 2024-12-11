const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const app = express();

// API密钥配置
const GROK_API_KEY = 'xai-DOURBpMFJ4BVesoRSnQUGstHLZ7M2jSAVt5DZSot0bAbPh2P6M0q5LjfwGcUY4WAcnKvks8vDHYQ6eQk';

// 配置文件上传
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    }
});

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));
app.use('/uploads', express.static('uploads'));

// 聊天接口
app.post('/api/chat', async (req, res) => {
    try {
        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
            messages: [
                {
                    role: "system",
                    content: "You are Grok, a chatbot inspired by the Hitchhikers Guide to the Galaxy."
                },
                ...req.body.messages
            ],
            model: "grok-beta",
            stream: false,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('API调用错误:', error.response?.data || error.message);
        res.status(500).json({
            error: '服务器错误',
            details: error.response?.data || error.message
        });
    }
});

// 图片上传接口
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        // 读取图片文件并转换为base64
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');

        // 构建请求数据
        const requestData = {
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${req.file.mimetype};base64,${base64Image}`,
                                detail: "high"
                            }
                        },
                        {
                            type: "text",
                            text: "请分析这张图片的内容，用中文详细描述。"
                        }
                    ]
                }
            ],
            model: "grok-vision-beta",
            temperature: 0.01,
            max_tokens: 2000
        };

        // 打印请求数据（不包含图片内容）
        console.log('发送请求数据:', {
            ...requestData,
            messages: requestData.messages.map(msg => ({
                ...msg,
                content: msg.content.map(c => 
                    c.type === 'image_url' 
                        ? { ...c, image_url: { ...c.image_url, url: '(base64 image data)' } }
                        : c
                )
            }))
        });

        // 调用图像分析API
        const response = await axios.post('https://api.x.ai/v1/chat/completions', requestData, {
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('API响应:', response.data);

        // 删除临时文件
        fs.unlinkSync(req.file.path);

        res.json(response.data);
    } catch (error) {
        console.error('图片分析错误:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
        });

        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('删除临时文件失败:', e);
            }
        }

        res.status(500).json({
            error: '图片分析失败',
            details: error.response?.data || error.message
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});