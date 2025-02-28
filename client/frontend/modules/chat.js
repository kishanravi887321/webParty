// modules/chat.js
export function sendMessage(chatInput, socket, currentRoomId, username, displayMessage) {
    if (!currentRoomId || !socket || socket.readyState !== WebSocket.OPEN) {
        alert("Please join or create a room and ensure WebSocket is connected before sending messages.");
        return;
    }
    const message = chatInput.value.trim();
    if (message) {
        const chatData = { type: "chat", username, message, roomId: currentRoomId };
        socket.send(JSON.stringify(chatData));
        displayMessage(username, message, true);
        chatInput.value = "";
    }
}

export function displayMessage(user, message, isLocal, chatMessages) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.textContent = user.charAt(0).toUpperCase();
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    const userDiv = document.createElement('div');
    userDiv.classList.add('user');
    userDiv.textContent = user;
    const textP = document.createElement('p');
    textP.textContent = message;
    const timeDiv = document.createElement('div');
    timeDiv.classList.add('time');
    const now = new Date();
    timeDiv.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    contentDiv.appendChild(userDiv);
    contentDiv.appendChild(textP);
    contentDiv.appendChild(timeDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function enableChat(sendButton, chatInput, sendMessage) {
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
}

export function disableChat(sendButton, chatInput, sendMessage) {
    sendButton.removeEventListener('click', sendMessage);
    chatInput.removeEventListener('keydown', (e) => {
        if (e.key === "Enter") sendMessage();
    });
}
