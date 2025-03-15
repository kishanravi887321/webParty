document.addEventListener("DOMContentLoaded", () => {
  const sendMessageBtn = document.getElementById("send-message");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.getElementById("chat-messages");

  if (!sendMessageBtn || !messageInput || !chatMessages) {
    console.error("Chat elements not found in DOM!");
    return;
  }

  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  function sendMessage() {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      alert("Please login to send messages");
      return;
    }

    const messageText = messageInput.value.trim();
    if (!messageText) return;

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.userName) {
      console.error("User not found in localStorage!");
      return;
    }

    addMessage({
      id: Date.now().toString(),
      text: messageText,
      sender: user,
      timestamp: new Date().toISOString(),
      isSent: true,
    });

    messageInput.value = "";

    setTimeout(() => {
      simulateResponse(messageText);
    }, 1000);
  }

  function addMessage(message) {
    if (!chatMessages) {
      console.error("Chat container not found!");
      return;
    }

    const messageElement = document.createElement("div");
    messageElement.className = `message ${message.isSent ? "sent" : "received"}`;

    const formattedTime = formatTimestamp(message.timestamp);

    messageElement.innerHTML = `
      <div class="message-content">${message.text}</div>
      <div class="message-info">
          <span class="message-sender">${message.isSent ? "You" : message.sender.userName}</span>
          <span class="message-time">${formattedTime}</span>
      </div>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function simulateResponse(messageText) {
    let responseText;
    if (/hello|hi/i.test(messageText)) {
      responseText = "Hello there! How are you enjoying the WebParty?";
    } else if (/movie|video/i.test(messageText)) {
      responseText = "I love watching movies with friends! What are we watching today?";
    } else if (messageText.endsWith("?")) {
      responseText = "That's a good question! Let me think about it...";
    } else {
      responseText = "Thanks for your message! Enjoying the WebParty?";
    }

    addMessage({
      id: Date.now().toString(),
      text: responseText,
      sender: { id: "bot", userName: "ChatBot" },
      timestamp: new Date().toISOString(),
      isSent: false,
    });
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
});
