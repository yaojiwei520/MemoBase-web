<template>
    <div id="app">
      <h1>MemoChat 记忆聊天机器人</h1>
      <div class="chat-window">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <strong>{{ msg.role === 'user' ? '你' : 'AI' }}:</strong> {{ msg.content }}
        </div>
      </div>
      <form @submit.prevent="sendMessage" class="input-form">
        <input 
          v-model="inputMessage" 
          :disabled="isLoading"
          placeholder="输入消息..." 
        />
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '发送中...' : '发送' }}
        </button>
        <small>当前用户 ID: {{ userId }}</small>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import axios from 'axios'; // 确保安装了 axios: npm install axios
  
  const userId = ref('2fede80c-61dc-4ec6-8e10-eff4249ca05d'); // 使用你的预设 ID
  const messages = ref([]);
  const inputMessage = ref('');
  const isLoading = ref(false);
  
  // 模拟创建用户 ID 的逻辑，实际应用中应在后端处理
  onMounted(() => {
      messages.value.push({ role: 'assistant', content: '你好！我是有记忆的 AI 助手，请开始与我聊天吧。' });
      // TODO: 如果 userId 为空，可以在这里调用 API 创建用户
  });
  
  const sendMessage = async () => {
    if (!inputMessage.value.trim() || isLoading.value) return;
  
    const userMessage = inputMessage.value.trim();
    messages.value.push({ role: 'user', content: userMessage });
    inputMessage.value = '';
    isLoading.value = true;
  
    try {
      // 调用 Vercel Serverless Function
      const response = await axios.post('/api/chat', {
        userId: userId.value,
        message: userMessage,
      });
  
      const aiReply = response.data.reply;
      messages.value.push({ role: 'assistant', content: aiReply });
  
    } catch (error) {
      console.error("Chat API error:", error);
      messages.value.push({ 
          role: 'assistant', 
          content: '抱歉，连接服务器失败。请检查后端 API 或密钥。' 
      });
    } finally {
      isLoading.value = false;
    }
  };
  </script>
  
  <style>
  /* 简单样式，保持简洁 */
  #app { max-width: 600px; margin: 0 auto; padding: 20px; }
  .chat-window { height: 300px; border: 1px solid #ccc; overflow-y: auto; padding: 10px; margin-bottom: 10px; }
  .message { margin-bottom: 8px; }
  .message.user { text-align: right; color: #007bff; }
  .message.assistant { text-align: left; color: #28a745; }
  .input-form { display: flex; gap: 10px; }
  .input-form input { flex-grow: 1; padding: 8px; }
  </style>