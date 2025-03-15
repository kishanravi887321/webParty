// modules/websocket.js
let socket = null

export async function connectWebSocket({
  currentRoomId,
  myPeerId,
  roomType,
  handleOffer,
  handleAnswer,
  handleCandidate,
  displayMessage,
  peerConnections,
  peerList,
  initializeVideoCircles,
  handlePeerList,
  handleNewPeer,
  removeParticipant,
  chatMessages,
  localStream,
  action = "join",
}) {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    console.warn("WebSocket already connected or connecting, skipping...")
    return socket
  }

  const WEBSOCKET_URL =  "wss://webparty-1.onrender.com"
  console.log("Connecting to WebSocket:", WEBSOCKET_URL)

  return new Promise((resolve, reject) => {
    try {
      socket = new WebSocket(WEBSOCKET_URL)
    } catch (error) {
      console.error("Error creating WebSocket:", error)
      reject(new Error(`Failed to create WebSocket: ${error.message}`))
      return
    }

    let connectTimeout

    socket.onopen = () => {
      clearTimeout(connectTimeout)
      console.log("✅ WebSocket Connected to:", WEBSOCKET_URL)
      if (currentRoomId && myPeerId) {
        const messageType = action === "create" ? "createRoom" : "join"
        const joinMessage = {
          type: messageType,
          roomId: currentRoomId,
          peerId: myPeerId,
          roomType: roomType || "private",
        }
        console.log(
          `Sending ${messageType} with peerId: ${myPeerId}, roomId: ${currentRoomId}, roomType: ${roomType || "private"}`,
          joinMessage,
        )
        socket.send(JSON.stringify(joinMessage))
      }
      resolve(socket)
    }

    socket.onclose = (event) => {
      console.warn(`⚠️ WebSocket Disconnected from: ${WEBSOCKET_URL}, code: ${event.code}, reason: ${event.reason}`)
      socket = null

      if (peerConnections) peerConnections.clear()
      if (peerList) peerList.clear()
      if (typeof initializeVideoCircles === "function") initializeVideoCircles()

      if (currentRoomId) {
        console.log("Attempting to reconnect in 15 seconds...")
        setTimeout(
          () =>
            connectWebSocket({
              currentRoomId,
              myPeerId,
              roomType,
              handleOffer,
              handleAnswer,
              handleCandidate,
              displayMessage,
              peerConnections,
              peerList,
              initializeVideoCircles,
              handlePeerList,
              handleNewPeer,
              removeParticipant,
              chatMessages,
              localStream,
              action,
            }),
          15000,
        )
      }

      if (event.wasClean) {
        console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`)
      } else {
        console.error("Connection died unexpectedly")
        reject(new Error("WebSocket connection died unexpectedly"))
      }
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("📩 Received:", {
          type: data.type,
          roomId: data.roomId,
          peerId: data.peerId || "N/A",
        })

        if (data.type === "offer") {
          if (typeof handleOffer === "function") {
            await handleOffer(data, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList)
          }
        } else if (data.type === "answer") {
          if (typeof handleAnswer === "function") {
            await handleAnswer(data, peerConnections)
          }
        } else if (data.type === "candidate") {
          if (typeof handleCandidate === "function") {
            await handleCandidate(data, peerConnections)
          }
        } else if (data.type === "chat" && currentRoomId === data.roomId) {
          if (typeof displayMessage === "function") {
            displayMessage(data.username, data.message, false, chatMessages, data.peerId)
          }
        } else if (data.type === "peerList" && typeof handlePeerList === "function") {
          handlePeerList(data.peers)
        } else if (data.type === "newPeer" && typeof handleNewPeer === "function") {
          handleNewPeer(data.peerId)
        } else if (data.type === "peerLeft" && typeof removeParticipant === "function") {
          removeParticipant(data.peerId)
          if (peerList) peerList.delete(data.peerId)
        } else if (data.type === "videoControl" && currentRoomId === data.roomId) {
          // Dispatch to window for handling in main script
          window.dispatchEvent(new MessageEvent("message", { data }))
        } else if (data.type === "error") {
          console.error("Server error:", data.message)
          if (data.message.includes("Duplicate peerId")) {
            console.warn("Regenerating peerId due to duplicate...")
            myPeerId = null
            connectWebSocket({
              currentRoomId,
              myPeerId,
              roomType,
              handleOffer,
              handleAnswer,
              handleCandidate,
              displayMessage,
              peerConnections,
              peerList,
              initializeVideoCircles,
              handlePeerList,
              handleNewPeer,
              removeParticipant,
              chatMessages,
              localStream,
              action,
            })
          } else if (data.message.includes("Private room is full")) {
            alert("This private room is full (max 2 users). Please try another room or create a new one.")
          } else {
            alert(`Server error: ${data.message}. Please try again or contact support.`)
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error, "Raw message:", event.data)
      }
    }

    socket.onerror = (error) => {
      clearTimeout(connectTimeout)
      console.error("WebSocket Error:", error)
      alert(`WebSocket connection failed. Please check your network or contact support if the issue persists.`)

      if (socket) {
        try {
          socket.close()
        } catch (closeError) {
          console.error("Error closing socket after error:", closeError)
        }
      }

      socket = null
      if (peerConnections) peerConnections.clear()
      if (peerList) peerList.clear()
      if (typeof initializeVideoCircles === "function") initializeVideoCircles()

      if (currentRoomId) {
        console.log("Attempting to reconnect in 10 seconds after error...")
        setTimeout(
          () =>
            connectWebSocket({
              currentRoomId,
              myPeerId,
              roomType,
              handleOffer,
              handleAnswer,
              handleCandidate,
              displayMessage,
              peerConnections,
              peerList,
              initializeVideoCircles,
              handlePeerList,
              handleNewPeer,
              removeParticipant,
              chatMessages,
              localStream,
              action,
            }),
          10000,
        )
      }

      reject(new Error(`WebSocket error: ${error.message || "Unknown error"}`))
    }

    connectTimeout = setTimeout(() => {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        console.warn("WebSocket connection timed out, retrying...")
        try {
          socket.close()
        } catch (error) {
          console.error("Error closing timed out socket:", error)
        }
        socket = null
        reject(new Error("WebSocket connection timed out"))
      }
    }, 10000)
  })
}

