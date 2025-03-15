// Room related JavaScript
document.addEventListener("DOMContentLoaded", () => {
    // Create Room Button
    document.getElementById("create-room-btn").addEventListener("click", () => {
      const roomName = document.getElementById("room-name").value
      if (!roomName) {
        alert("Please enter a room name")
        return
      }
  
      createRoom(roomName)
    })
  
    // Join Room Button
    document.getElementById("join-room-btn").addEventListener("click", () => {
      const roomCode = document.getElementById("room-code").value
      if (!roomCode) {
        alert("Please enter a room code")
        return
      }
  
      joinRoom(roomCode)
    })
  
    // Load Video Button
    document.getElementById("load-video").addEventListener("click", () => {
      const videoUrl = document.getElementById("video-url").value
      if (!videoUrl) {
        alert("Please enter a video URL")
        return
      }
  
      loadVideo(videoUrl)
    })
  
    // Helper Functions
    function createRoom(roomName) {
      const accessToken = localStorage.getItem("accessToken")
      if (!accessToken) {
        alert("Please login to create a room")
        return
      }
  
      const roomType = localStorage.getItem("selectedRoomType") || "private"
      const roomCode = generateRoomCode()
  
      // In a real app, this would be an API call to create a room
      const room = {
        id: Date.now().toString(),
        name: roomName,
        type: roomType,
        code: roomCode,
        creatorId: JSON.parse(localStorage.getItem("user")).id,
      }
  
      // Store room info
      localStorage.setItem("currentRoom", JSON.stringify(room))
  
      // Close modal and open room interface
      document.getElementById("room-modal").classList.add("hidden")
      document.getElementById("room-selection").classList.add("hidden")
      openRoomInterface(room)
    }
  
    function joinRoom(roomCode) {
      const accessToken = localStorage.getItem("accessToken")
      if (!accessToken) {
        alert("Please login to join a room")
        return
      }
  
      // In a real app, this would be an API call to join a room
      // For demo purposes, we'll create a mock room
      const room = {
        id: Date.now().toString(),
        name: "Joined Room",
        type: "private",
        code: roomCode,
        creatorId: "other-user-id", // Not the current user
      }
  
      // Store room info
      localStorage.setItem("currentRoom", JSON.stringify(room))
  
      // Close modal and open room interface
      document.getElementById("room-modal").classList.add("hidden")
      document.getElementById("room-selection").classList.add("hidden")
      openRoomInterface(room)
    }
  
    function openRoomInterface(room) {
      // Hide other sections
      document.getElementById("welcome-section").classList.add("hidden")
      document.getElementById("room-selection").classList.add("hidden")
  
      // Show room interface
      document.getElementById("room-interface").classList.remove("hidden")
  
      // Set room name
      document.getElementById("current-room-name").textContent = room.name
  
      // Show video input if user is the creator
      const user = JSON.parse(localStorage.getItem("user"))
      if (user && user.id === room.creatorId) {
        document.getElementById("video-input-container").classList.remove("hidden")
      } else {
        document.getElementById("video-input-container").classList.add("hidden")
      }
  
      // Add current user to participants
      addParticipant(user)
  
      // Add some mock participants
      addMockParticipants()
  
      console.log("Room interface opened:", room)
    }
  
    function loadVideo(url) {
      // In a real app, this would handle embedding a video player
      document.getElementById("video-placeholder").innerHTML = `
              <div style="padding: 20px; text-align: center;">
                  <p>Video loaded from: ${url}</p>
                  <p>(Video player would be embedded here)</p>
              </div>
          `
    }
  
    function addParticipant(user) {
      if (!user) return
  
      const participantsList = document.getElementById("participants-list")
  
      // Check if participant already exists
      if (document.getElementById(`participant-${user.id}`)) {
        return
      }
  
      const participantElement = document.createElement("div")
      participantElement.className = "participant"
      participantElement.id = `participant-${user.id}`
      participantElement.innerHTML = `
              <img src="${user.avatar}" alt="${user.username}" class="participant-avatar">
              <div class="participant-name">${user.username}</div>
          `
  
      participantsList.appendChild(participantElement)
    }
  
    function addMockParticipants() {
      // Add some mock participants for demo purposes
      const mockParticipants = [
        { id: "mock1", username: "User1", avatar: "/placeholder.svg?height=50&width=50" },
        { id: "mock2", username: "User2", avatar: "/placeholder.svg?height=50&width=50" },
        { id: "mock3", username: "User3", avatar: "/placeholder.svg?height=50&width=50" },
      ]
  
      mockParticipants.forEach((participant) => {
        addParticipant(participant)
      })
    }
  
    function generateRoomCode() {
      // Generate a random 6-character room code
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let result = ""
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
      }
      return result
    }
  })
  
  // Make sure leaveRoom is globally accessible
  window.leaveRoom = () => {
    // Clear current room
    localStorage.removeItem("currentRoom")
  
    // Hide room interface
    document.getElementById("room-interface").classList.add("hidden")
  
    // Show room selection
    document.getElementById("room-selection").classList.remove("hidden")
  
    // Clear participants
    document.getElementById("participants-list").innerHTML = ""
  
    // Clear chat
    document.getElementById("chat-messages").innerHTML = ""
  }
  
  // Check if there's a current room on page load
  document.addEventListener("DOMContentLoaded", () => {
    const currentRoom = localStorage.getItem("currentRoom")
    if (currentRoom) {
      try {
        const room = JSON.parse(currentRoom)
        openRoomInterface(room)
      } catch (e) {
        console.error("Error parsing current room:", e)
        localStorage.removeItem("currentRoom")
      }
    }
  })
  
  