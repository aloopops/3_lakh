document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages-container');
    const newChatBtn = document.getElementById('new-chat-btn');
    const modelSelect = document.getElementById('model-select');
    const currentModelLabel = document.getElementById('current-model-label');
    const historyList = document.getElementById('history-list');

    // State variables
    let chatHistory = [];
    let conversations = loadConversations();
    let currentConversationId = null;

    // Load available models
    loadModels();

    // Start a new conversation
    startNewConversation();

    // Event listeners
    chatForm.addEventListener('submit', handleChatSubmit);
    newChatBtn.addEventListener('click', startNewConversation);
    modelSelect.addEventListener('change', handleModelChange);
    messageInput.addEventListener('keydown', handleInputKeydown);

    // Auto-resize textarea as user types
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        // Cap the height
        if (parseInt(this.style.height) > 120) {
            this.style.height = '120px';
        }
    });

    // Load available models from the backend
    function loadModels() {
        fetch('/api/models')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    modelSelect.innerHTML = '';
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.name;
                        modelSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading models:', error);
            });
    }

    // Handle model change
    function handleModelChange() {
        const selectedModel = modelSelect.value;
        const selectedModelName = modelSelect.options[modelSelect.selectedIndex].text;
        currentModelLabel.textContent = selectedModelName;

        // Update current conversation model
        if (currentConversationId) {
            conversations[currentConversationId].model = selectedModel;
            saveConversations();
        }
    }

    // Handle chat submission
    function handleChatSubmit(e) {
        e.preventDefault();
        const message = messageInput.value.trim();

        if (!message) return;

        // Add user message to UI
        addMessageToUI('user', message);

        // Add to chat history
        chatHistory.push({
            role: 'user',
            content: message
        });

        // Update conversation title if it's the first message
        if (chatHistory.length === 1) {
            const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            conversations[currentConversationId].title = title;
            updateConversationsList();
        }

        // Save to local storage
        conversations[currentConversationId].messages = chatHistory;
        saveConversations();

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show typing indicator
        showTypingIndicator();

        // Send to backend
        const selectedModel = modelSelect.value;

        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatHistory,
                model: selectedModel
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            hideTypingIndicator();

            if (data.status === 'success') {
                // Add AI response to UI
                addMessageToUI('ai', data.message);

                // Add to chat history
                chatHistory.push({
                    role: 'assistant',
                    content: data.message
                });

                // Save to local storage
                conversations[currentConversationId].messages = chatHistory;
                saveConversations();

                // Scroll to bottom
                scrollToBottom();
            } else {
                // Show error
                addMessageToUI('system', `Error: ${data.message}`);
            }
        })
        .catch(error => {
            hideTypingIndicator();
            console.error('Error:', error);
            addMessageToUI('system', `Error: ${error.message || 'Failed to send message'}`);
        });

        // Scroll to bottom
        scrollToBottom();
    }

    // Handle input keydown (for Enter key submission with Shift+Enter for new line)
    function handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    }

    // Add message to UI
    function addMessageToUI(sender, content) {
        // Create a wrapper for each message group
        let messageWrapper;
        if (sender === 'system') {
            messageWrapper = document.createElement('div');
            messageWrapper.className = 'w-100 d-flex justify-content-center my-3';
            const messageDiv = document.createElement('div');
            messageDiv.className = 'system-message text-center';
            messageDiv.innerHTML = `<p>${content}</p>`;
            messageWrapper.appendChild(messageDiv);
        } else {
            messageWrapper = document.createElement('div');
            messageWrapper.className = 'w-100 d-flex ' + 
                (sender === 'user' ? 'justify-content-end' : 'justify-content-start');

            const messageDiv = renderMessage(content, sender === 'user');
            messageWrapper.appendChild(messageDiv);
        }

        messagesContainer.appendChild(messageWrapper);
        scrollToBottom();
    }

    // Show typing indicator
    function showTypingIndicator() {
        const typingWrapper = document.createElement('div');
        typingWrapper.className = 'w-100 d-flex justify-content-start';
        typingWrapper.id = 'typing-indicator-wrapper';

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator ai-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        typingWrapper.appendChild(typingDiv);
        messagesContainer.appendChild(typingWrapper);
        scrollToBottom();
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        const typingWrapper = document.getElementById('typing-indicator-wrapper');
        if (typingWrapper) {
            typingWrapper.remove();
        }
    }

    // Scroll to bottom of messages container
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Start a new conversation
    function startNewConversation() {
        // Clear chat history
        chatHistory = [];

        // Clear messages container
        messagesContainer.innerHTML = `
            <div class="system-message text-center my-5">
                <h3>Welcome to AI Chat</h3>
                <p class="text-muted">Ask me anything! I'm powered by g4f and ready to help.</p>
            </div>
        `;

        // Create a new conversation ID
        currentConversationId = Date.now().toString();

        // Add to conversations object
        conversations[currentConversationId] = {
            id: currentConversationId,
            title: 'New Conversation',
            model: modelSelect.value,
            messages: []
        };

        // Save to local storage
        saveConversations();

        // Update UI
        updateConversationsList();
    }

    // Load conversation by ID
    function loadConversation(id) {
        if (!conversations[id]) return;

        // Set current conversation ID
        currentConversationId = id;

        // Load chat history
        chatHistory = conversations[id].messages || [];

        // Set model
        if (conversations[id].model) {
            modelSelect.value = conversations[id].model;
            const selectedModelName = modelSelect.options[modelSelect.selectedIndex].text;
            currentModelLabel.textContent = selectedModelName;
        }

        // Clear messages container
        messagesContainer.innerHTML = '';

        // Add messages to UI
        if (chatHistory.length === 0) {
            messagesContainer.innerHTML = `
                <div class="system-message text-center my-5">
                    <h3>Welcome to AI Chat</h3>
                    <p class="text-muted">Ask me anything! I'm powered by g4f and ready to help.</p>
                </div>
            `;
        } else {
            chatHistory.forEach(msg => {
                if (msg.role === 'user') {
                    addMessageToUI('user', msg.content);
                } else if (msg.role === 'assistant') {
                    addMessageToUI('ai', msg.content);
                } else if (msg.role === 'system') {
                    addMessageToUI('system', msg.content);
                }
            });
        }

        // Update UI
        updateConversationsList();
    }

    // Update conversations list in sidebar
    function updateConversationsList() {
        historyList.innerHTML = '';

        // Sort conversations by ID (newest first)
        const sortedIds = Object.keys(conversations).sort((a, b) => b - a);

        sortedIds.forEach(id => {
            const conv = conversations[id];
            const item = document.createElement('li');
            item.className = `list-group-item history-item d-flex justify-content-between align-items-center ${id === currentConversationId ? 'active' : ''}`;

            const titleSpan = document.createElement('span');
            titleSpan.textContent = conv.title;
            titleSpan.style.cursor = 'pointer';
            titleSpan.addEventListener('click', () => {
                loadConversation(id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(id);
            });

            item.appendChild(titleSpan);
            item.appendChild(deleteBtn);
            item.dataset.id = id;

            historyList.appendChild(item);
        });
    }

    // Load conversations from local storage
    function loadConversations() {
        try {
            const saved = localStorage.getItem('g4f_conversations');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading conversations:', error);
            return {};
        }
    }

    // Save conversations to local storage
    function saveConversations() {
        try {
            localStorage.setItem('g4f_conversations', JSON.stringify(conversations));
        } catch (error) {
            console.error('Error saving conversations:', error);
        }
    }

    // Delete specific conversation
    function deleteConversation(id) {
        if (confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
            fetch(`/api/conversations/${id}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    delete conversations[id];

                    // If current conversation was deleted, start a new one
                    if (id === currentConversationId) {
                        startNewConversation();
                    }

                    saveConversations();
                    updateConversationsList();
                    addMessageToUI('system', 'Conversation deleted');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                addMessageToUI('system', 'Failed to delete conversation');
            });
        }
    }

    function renderMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

        if (!isUser) {
            const formattedContent = marked.parse(content);
            messageDiv.innerHTML = formattedContent;

            // Add copy buttons and language labels to code blocks
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
                const pre = block.parentElement;
                const language = block.className.split('-')[1] || 'plaintext';
                pre.setAttribute('data-language', language);

                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyBtn.onclick = async () => {
                    await navigator.clipboard.writeText(block.textContent);
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                };
                pre.appendChild(copyBtn);
            });
        } else {
            messageDiv.textContent = content;
        }

        return messageDiv;
    }
});