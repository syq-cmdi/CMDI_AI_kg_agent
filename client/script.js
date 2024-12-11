let messageHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const uploadButton = document.getElementById('upload-button');
    const imageUpload = document.getElementById('image-upload');

    // 处理图片上传
    uploadButton.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 显示上传的图片
        const reader = new FileReader();
        reader.onload = async (e) => {
            addMessageToChat('user', '', e.target.result);
            
            // 上传图片并获取分析结果
            const formData = new FormData();
            formData.append('image', file);

            try {
                const loadingDiv = addLoadingMessage();
                const response = await fetch('http://localhost:3000/api/upload', {
                    method: 'POST',
                    body: formData
                });

                loadingDiv.remove();

                if (!response.ok) {
                    throw new Error('上传失败');
                }

                const data = await response.json();
                const aiResponse = data.choices[0].message.content;
                addMessageToChat('ai', aiResponse);
                messageHistory.push({ role: 'assistant', content: aiResponse });

            } catch (error) {
                console.error('上传错误:', error);
                addMessageToChat('ai', '图片上传或分析失败，请重试。');
            }
        };
        reader.readAsDataURL(file);
    });

    // 处理发送消息
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        userInput.value = '';
        messageHistory.push({ role: 'user', content: message });

        try {
            const loadingDiv = addLoadingMessage();
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: messageHistory })
            });

            loadingDiv.remove();

            if (!response.ok) {
                throw new Error('网络响应不正常');
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            addMessageToChat('ai', aiResponse);
            messageHistory.push({ role: 'assistant', content: aiResponse });

        } catch (error) {
            console.error('错误:', error);
            addMessageToChat('ai', '抱歉，发生了错误，请稍后重试。');
        }
    }

    // 添加消息到聊天界面
    function addMessageToChat(role, content, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            messageDiv.appendChild(img);
        }
        
        if (content) {
            const textDiv = document.createElement('div');
            textDiv.textContent = content;
            messageDiv.appendChild(textDiv);
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 添加加载状态
    function addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message';
        loadingDiv.textContent = '正在思考...';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return loadingDiv;
    }

    // 事件监听器
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}); 