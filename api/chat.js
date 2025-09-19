// api/chat.js
// 这是一个 Node.js Vercel Serverless Function

import { fetch } from 'undici'; // Vercel environment uses undici/fetch
// 确保你在 Vercel 的环境变量中设置了这些密钥！
const MEMOBASE_API_KEY = process.env.MEMOBASE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MEMOBASE_PROJECT_URL = process.env.MEMOBASE_PROJECT_URL || 'https://api.memobase.dev';
const OPENAI_MODEL = 'gpt-3.5-turbo';

// --- MemoBase 辅助函数 (替换 Python SDK 逻辑) ---

// 1. 获取用户 Context
async function getUserContext(userId) {
    const url = `${MEMOBASE_PROJECT_URL}/v1/user/${userId}/context`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${MEMOBASE_API_KEY}`,
            'Content-Type': 'application/json',
        }
    });
    const data = await response.json();
    return data.context || '';
}

// 2. 插入对话记录
async function insertChatBlob(userId, userMsg, assistantMsg) {
    const url = `${MEMOBASE_PROJECT_URL}/v1/user/${userId}/blob`;
    const blob = {
        messages: [
            {"role": "user", "content": userMsg},
            {"role": "assistant", "content": assistantMsg}
        ]
    };
    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MEMOBASE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(blob)
    });
}


export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: 'Missing userId or message' });
        }

        // 1. 获取 MemoBase Context
        const context = await getUserContext(userId);

        // 2. 构造 Prompt
        const fullSystemPrompt = `
            你是一个友好且记忆力超强的 AI 助手。你的回复必须利用提供的长期记忆信息，
            让对话感觉连贯和个性化。你的回复应专注于回答用户的问题。
            --- 用户长期记忆 (MemoBase Context) ---
            ${context}
            -----------------------------------------
        `;

        // 3. 调用 LLM API
        const llmResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {"role": "system", "content": fullSystemPrompt},
                    {"role": "user", "content": message}
                ],
                temperature: 0.7,
            })
        });

        const llmData = await llmResponse.json();
        const assistantMsg = llmData.choices?.[0]?.message?.content || "抱歉，LLM未能生成回复。";

        // 4. 插入对话记录到 MemoBase (异步处理)
        await insertChatBlob(userId, message, assistantMsg);
        
        // 5. 返回结果给前端
        res.status(200).json({ reply: assistantMsg });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};