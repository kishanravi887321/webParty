// // modules/chat.js
// export function sendMessage(chatInput, socket, currentRoomId, username, displayMessage, chatMessages, myPeerId) {
//   if (!currentRoomId || !socket || socket.readyState !== WebSocket.OPEN) {
//     alert("Please join or create a room and ensure WebSocket is connected before sending messages.")
//     return
//   }

//   if (!chatInput) {
//     console.error("Chat input is undefined")
//     return
//   }

//   const message = chatInput.value.trim()
//   if (message) {
//     const chatData = {
//       type: "chat",
//       username,
//       message,
//       roomId: currentRoomId,
//       peerId: myPeerId,
//     }

//     try {
//       socket.send(JSON.stringify(chatData))
//       displayMessage(username, message, true, chatMessages, myPeerId)
//       chatInput.value = ""
//     } catch (error) {
//       console.error("Error sending message:", error)
//       alert("Failed to send message. Please try again.")
//     }
//   }
// }

// export function displayMessage(user, message, isLocal, chatMessages, peerId) {
//   if (!chatMessages) {
//     console.error("chatMessages is undefined in displayMessage")
//     return
//   }

//   // Get user data from localStorage
//   let userData = null
//   try {
//     userData = JSON.parse(localStorage.getItem("user")) || {}
//   } catch (error) {
//     console.error("Error parsing user data from localStorage:", error)
//     userData = {}
//   }

//   const messageDiv = document.createElement("div")
//   messageDiv.classList.add("message")

//   const avatarDiv = document.createElement("div")
//   avatarDiv.classList.add("avatar")

//   // Use avatar image if available, otherwise use first letter
//   if (isLocal && userData.avatar) {
//     const img = document.createElement("img")
//     img.src = userData.avatar
//     img.alt = user
//     avatarDiv.appendChild(img)
//   } else {
//     avatarDiv.textContent = user.charAt(0).toUpperCase()
//   }

//   const contentDiv = document.createElement("div")
//   contentDiv.classList.add("message-content")

//   const userDiv = document.createElement("div")
//   userDiv.classList.add("user")
//   userDiv.textContent = user

//   const textP = document.createElement("p")
//   textP.textContent = message

//   const timeDiv = document.createElement("div")
//   timeDiv.classList.add("time")
//   const now = new Date()
//   timeDiv.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

//   contentDiv.appendChild(userDiv)
//   contentDiv.appendChild(textP)
//   contentDiv.appendChild(timeDiv)
//   messageDiv.appendChild(avatarDiv)
//   messageDiv.appendChild(contentDiv)

//   chatMessages.appendChild(messageDiv)
//   chatMessages.scrollTop = chatMessages.scrollHeight
// }

// export function enableChat(sendButton, chatInput, sendMessageCallback, chatMessages) {
//   if (!sendButton || !chatInput) {
//     console.error("Send button or chat input is undefined")
//     return
//   }

//   const handleSend = () => sendMessageCallback(chatInput, chatMessages)

//   const handleKeydown = (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault()
//       sendMessageCallback(chatInput, chatMessages)
//     }
//   }

//   // Remove any existing event listeners first
//   sendButton.removeEventListener("click", sendButton._clickHandler)
//   chatInput.removeEventListener("keydown", chatInput._keydownHandler)

//   // Add new event listeners
//   sendButton.addEventListener("click", handleSend)
//   chatInput.addEventListener("keydown", handleKeydown)

//   // Store the event handlers for later removal
//   sendButton._clickHandler = handleSend
//   chatInput._keydownHandler = handleKeydown

//   console.log("Chat enabled")
// }

// export function disableChat(sendButton, chatInput) {
//   if (!sendButton || !chatInput) {
//     console.error("Send button or chat input is undefined")
//     return
//   }

//   if (sendButton._clickHandler) {
//     sendButton.removeEventListener("click", sendButton._clickHandler)
//   }

//   if (chatInput._keydownHandler) {
//     chatInput.removeEventListener("keydown", chatInput._keydownHandler)
//   }

//   console.log("Chat disabled")
// }

