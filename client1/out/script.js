// script.js
import { setupDOM } from "./modules/dom.js"
import { connectWebSocket } from "./modules/websocket.js"
import {
  initializeMedia,
  createPeerConnection,
  handleOffer,
  handleAnswer,
  handleCandidate,
  startCallForRoom,
} from "./modules/webrtc.js"
import { sendMessage, displayMessage, enableChat, disableChat } from "./modules/chat.js"
import { setupUI } from "./modules/ui.js"
import { generateRoomId } from "./modules/utils.js"
import { setupAuth } from "./modules/auth.js"

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded")

  // Add movie file upload handler
  const movieFileUpload = document.getElementById("movieFileUpload")
  if (movieFileUpload) {
    movieFileUpload.addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        const videoURL = URL.createObjectURL(file)
        const moviePreview = document.getElementById("moviePreview")
        if (moviePreview) {
          moviePreview.src = videoURL
          document.getElementById("moviePreviewContainer").style.display = "block"
        }
      }
    })
  }

  // Global variables
  let localStream
  let username = "Guest"
  let token = null
  let currentRoomId = null
  const peerConnections = new Map()
  const peerList = new Set()
  let myPeerId = null
  let socket = null
  let isRoomCreator = false
  let userAvatar = null
  let userFullName = null
  let userEmail = null
  const videoFile = null

  // Check if user is already logged in
  const storedToken = localStorage.getItem("token")
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null

  if (storedToken && storedUser) {
    console.log("User already logged in:", storedUser.username)
    token = storedToken
    username = storedUser.username || "User"
    userAvatar = storedUser.avatar
    userFullName = storedUser.fullName
    userEmail = storedUser.email

    // Update UI for logged in user
    document.getElementById("loginBtn").style.display = "none"
    document.getElementById("userProfile").style.display = "block"
    document.getElementById("userAvatar").src = userAvatar || "/placeholder.svg?height=40&width=40"
    document.getElementById("dropdownUserAvatar").src = userAvatar || "/placeholder.svg?height=60&width=60"
    document.getElementById("dropdownUsername").textContent = username
    document.getElementById("dropdownEmail").textContent = userEmail || "No email provided"
  }

  // Initialize DOM and UI
  const domElements = setupDOM()

  // Setup Authentication
  setupAuth({
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    authModal: document.getElementById("authModal"),
    userProfile: document.getElementById("userProfile"),
    userAvatar: document.getElementById("userAvatar"),
    dropdownUserAvatar: document.getElementById("dropdownUserAvatar"),
    dropdownUsername: document.getElementById("dropdownUsername"),
    dropdownEmail: document.getElementById("dropdownEmail"),
    avatarUpload: document.getElementById("avatarUpload"),
    avatarPreview: document.getElementById("avatarPreview"),
    coverImageUpload: document.getElementById("coverImageUpload"),
    coverPreview: document.getElementById("coverPreview"),
  })

  // Setup UI
  setupUI(domElements, {
    connectWebSocket,
    initializeMedia,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleCandidate,
    startCallForRoom,
    sendMessage,
    displayMessage,
    enableChat,
    disableChat,
    generateRoomId,
    localStream,
    username,
    token,
    currentRoomId,
    peerConnections,
    peerList,
    myPeerId,
    socket,
    isRoomCreator,
    userAvatar,
  })

  // Initial setup
  myPeerId = domElements.getMyPeerId()

  // Tab switching in auth modal
  const authTabs = document.querySelectorAll(".auth-tab")
  const authForms = document.querySelectorAll(".auth-form")
  const switchAuthLinks = document.querySelectorAll(".switch-auth")

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab
      console.log("Switching to tab:", tabName)
      authTabs.forEach((t) => t.classList.remove("active"))
      authForms.forEach((f) => f.classList.remove("active"))
      tab.classList.add("active")
      document.getElementById(`${tabName}Form`).classList.add("active")
    })
  })

  switchAuthLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const tabName = link.dataset.tab
      console.log("Switching to tab via link:", tabName)
      authTabs.forEach((t) => t.classList.remove("active"))
      authForms.forEach((f) => f.classList.remove("active"))
      document.querySelector(`.auth-tab[data-tab="${tabName}"]`).classList.add("active")
      document.getElementById(`${tabName}Form`).classList.add("active")
    })
  })

  // Room selection
  const roomOptions = document.querySelectorAll(".room-option")
  roomOptions.forEach((option) => {
    option.addEventListener("click", () => {
      roomOptions.forEach((opt) => opt.classList.remove("selected"))
      option.classList.add("selected")
      console.log("Selected room type:", option.dataset.type)
    })
  })

  // Get Started button
  const getStartedBtn = document.getElementById("getStartedBtn")
  getStartedBtn.addEventListener("click", () => {
    console.log("Get Started button clicked")
    if (token) {
      document.getElementById("roomModal").classList.add("active")
    } else {
      document.getElementById("authModal").classList.add("active")
    }
  })

  // Rooms link
  const roomsLink = document.querySelector(".rooms-link")
  roomsLink.addEventListener("click", (e) => {
    e.preventDefault()
    console.log("Rooms link clicked")
    if (token) {
      document.getElementById("roomModal").classList.add("active")
    } else {
      alert("Please login to access rooms")
      document.getElementById("authModal").classList.add("active")
    }
  })

  // Create Room button
  const createRoomBtn = document.getElementById("createRoomBtn")
  createRoomBtn.addEventListener("click", async () => {
    console.log("Create Room button clicked")
    if (!token) {
      alert("Please login to create a room")
      document.getElementById("roomModal").classList.remove("active")
      document.getElementById("authModal").classList.add("active")
      return
    }

    const selectedRoom = document.querySelector(".room-option.selected")
    if (!selectedRoom) {
      alert("Please select a room type")
      return
    }

    const roomType = selectedRoom.dataset.type
    currentRoomId = generateRoomId()
    isRoomCreator = true

    document.getElementById("roomTitle").textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`
    document.getElementById("generatedRoomId").textContent = currentRoomId
    document.getElementById("roomModal").classList.remove("active")
    document.getElementById("watchRoomContainer").style.display = "flex"
    document.getElementById("movieUploadSection").style.display = "block"

    try {
      // Initialize media
      const mediaStream = await initializeMedia()
      if (!mediaStream) {
        alert("Media access is required to create a room. Please grant camera/microphone permissions.")
        return
      }

      localStream = mediaStream
      myPeerId = domElements.getMyPeerId()
      const initializeVideoCircles = domElements.initializeVideoCircles
      const addControlListeners = domElements.addControlListeners

      initializeVideoCircles()
      const localParticipant = document.querySelector(".participant:nth-child(1)")
      if (localParticipant) {
        localParticipant.dataset.peerId = myPeerId
        const localControls = localParticipant.querySelectorAll(".control-btn")
        localControls.forEach((btn) => (btn.dataset.peerId = myPeerId))
        addControlListeners(myPeerId)
      }

      // Connect to WebSocket
      const handlePeerList = (peers) => {
        console.log(`Received peerList for room ${currentRoomId}:`, peers)
        peerList.clear()
        peerList.add(myPeerId)
        if (Array.isArray(peers)) {
          peers.forEach((peerId) => {
            if (peerId !== myPeerId) peerList.add(peerId)
          })
        }
        updateParticipantsList()
        startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant)
      }

      const handleNewPeer = (newPeerId) => {
        console.log(`New peer joined: ${newPeerId}`)
        if (!peerList.has(newPeerId)) {
          peerList.add(newPeerId)
          updateParticipantsList()
          setTimeout(() => {
            const pc = createPeerConnection(
              newPeerId,
              localStream,
              socket,
              currentRoomId,
              peerConnections,
              myPeerId,
              removeParticipant,
              peerList,
            )
            pc.createOffer().then((offer) => {
              pc.setLocalDescription(offer).then(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      type: "offer",
                      offer,
                      peerId: newPeerId,
                      roomId: currentRoomId,
                    }),
                  )
                }
              })
            })
          }, 2000)
        }
      }

      const removeParticipant = (peerId) => {
        console.log(`Removing participant with peerId: ${peerId}`)
        if (peerConnections.has(peerId)) {
          const pc = peerConnections.get(peerId)
          if (pc) pc.close()
          peerConnections.delete(peerId)
        }
        peerList.delete(peerId)
        updateParticipantsList()
      }

      socket = await connectWebSocket({
        currentRoomId,
        myPeerId,
        roomType,
        handleOffer,
        handleAnswer,
        handleCandidate,
        displayMessage,
        peerConnections,
        peerList,
        initializeVideoCircles: domElements.initializeVideoCircles,
        chatMessages: document.getElementById("chatMessages"),
        handlePeerList,
        handleNewPeer,
        removeParticipant,
        localStream,
        action: "create",
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("WebSocket connection delay completed, proceeding with room setup")
      await startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant)
      enableChat(
        document.getElementById("sendMessageBtn"),
        document.getElementById("chatInputField"),
        () =>
          sendMessage(
            document.getElementById("chatInputField"),
            socket,
            currentRoomId,
            username,
            displayMessage,
            document.getElementById("chatMessages"),
            myPeerId,
          ),
        document.getElementById("chatMessages"),
      )

      // Set up start streaming button
      document.getElementById("startStreamingBtn").addEventListener("click", () => {
        const movieFile = document.getElementById("movieFileUpload").files[0]
        if (!movieFile) {
          alert("Please upload a movie file first")
          return
        }

        const videoURL = URL.createObjectURL(movieFile)
        document.getElementById("mainVideo").src = videoURL

        // Play the video and broadcast to peers
        const mainVideo = document.getElementById("mainVideo")
        mainVideo.onloadedmetadata = () => {
          mainVideo
            .play()
            .then(() => {
              console.log("Video playback started")
              const playPauseBtn = document.getElementById("playPauseBtn")
              if (playPauseBtn) {
                playPauseBtn.innerHTML = '<span class="material-icons">pause</span>'
              }

              // Broadcast play event to all peers
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: "videoControl",
                    action: "play",
                    currentTime: mainVideo.currentTime,
                    roomId: currentRoomId,
                  }),
                )
              }
            })
            .catch((error) => {
              console.error("Error playing video:", error)
              alert("Could not play video. Please try again.")
            })
        }
      })

      console.log(`Room created successfully: ${currentRoomId}, Type: ${roomType}`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert(`Failed to create room: ${error.message || "Unknown error"}`)
    }
  })

  // Join Room button
  const joinRoomBtn = document.getElementById("joinRoomBtn")
  joinRoomBtn.addEventListener("click", () => {
    console.log("Join Room button clicked")
    if (!token) {
      alert("Please login to join a room")
      document.getElementById("roomModal").classList.remove("active")
      document.getElementById("authModal").classList.add("active")
      return
    }

    document.getElementById("roomModal").classList.remove("active")
    document.getElementById("joinRoomModal").classList.add("active")
  })

  // Movie file upload preview
  const movieFileUploadPreview = document.getElementById("movieFileUpload")
  const moviePreview = document.getElementById("moviePreview")
  const moviePreviewContainer = document.getElementById("moviePreviewContainer")

  // Create Room Form Submit
  const createRoomForm = document.getElementById("createRoomForm")
  if (createRoomForm) {
    createRoomForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Create Room form submitted")

      const roomName = document.getElementById("roomNameInput").value
      const roomDescription = document.getElementById("roomDescriptionInput").value
      const roomPassword = document.getElementById("createRoomPasswordInput").value
      const selectedRoom = document.querySelector(".room-option.selected")
      const roomType = selectedRoom ? selectedRoom.dataset.type : "public"

      if (!roomName) {
        alert("Please enter a room name")
        return
      }

      if (roomType === "private" && !roomPassword) {
        alert("Please enter a password for your private room")
        return
      }

      if (!videoFile) {
        alert("Please upload a movie file")
        return
      }

      // Generate room ID
      currentRoomId = generateRoomId()
      isRoomCreator = true

      // Function to remove a participant from the UI
      const removeParticipantUI = (peerId) => {
        console.log(`Removing participant with peerId: ${peerId}`)
        if (peerConnections.has(peerId)) {
          const pc = peerConnections.get(peerId)
          if (pc) pc.close()
          peerConnections.delete(peerId)
        }
        peerList.delete(peerId)
        updateParticipantsList()
      }

      try {
        // Show loading indicator
        const submitBtn = createRoomForm.querySelector('button[type="submit"]')
        const originalBtnText = submitBtn.innerHTML
        submitBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Creating Room...'
        submitBtn.disabled = true

        // Initialize media
        const mediaStream = await initializeMedia()
        if (!mediaStream) {
          alert("Media access is required to create a room. Please grant camera/microphone permissions.")
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false
          return
        }

        localStream = mediaStream
        myPeerId = domElements.getMyPeerId()
        const initializeVideoCircles = domElements.initializeVideoCircles
        const addControlListeners = domElements.addControlListeners

        // Connect to WebSocket
        const handlePeerList = (peers) => {
          console.log(`Received peerList for room ${currentRoomId}:`, peers)
          peerList.clear()
          peerList.add(myPeerId)
          if (Array.isArray(peers)) {
            peers.forEach((peerId) => {
              if (peerId !== myPeerId) peerList.add(peerId)
            })
          }
          updateParticipantsList()
          startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipantUI)
        }

        const handleNewPeer = (newPeerId) => {
          console.log(`New peer joined: ${newPeerId}`)
          if (!peerList.has(newPeerId)) {
            peerList.add(newPeerId)
            updateParticipantsList()
            setTimeout(() => {
              const pc = createPeerConnection(
                newPeerId,
                localStream,
                socket,
                currentRoomId,
                peerConnections,
                myPeerId,
                removeParticipantUI,
                peerList,
              )
              pc.createOffer().then((offer) => {
                pc.setLocalDescription(offer).then(() => {
                  if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(
                      JSON.stringify({
                        type: "offer",
                        offer,
                        peerId: newPeerId,
                        roomId: currentRoomId,
                      }),
                    )
                  }
                })
              })
            }, 2000)
          }
        }

        const removeParticipant = (peerId) => {
          console.log(`Removing participant with peerId: ${peerId}`)
          if (peerConnections.has(peerId)) {
            const pc = peerConnections.get(peerId)
            if (pc) pc.close()
            peerConnections.delete(peerId)
          }
          peerList.delete(peerId)
          updateParticipantsList()
        }

        socket = await connectWebSocket({
          currentRoomId,
          myPeerId,
          roomType,
          handleOffer,
          handleAnswer,
          handleCandidate,
          displayMessage,
          peerConnections,
          peerList,
          initializeVideoCircles: domElements.initializeVideoCircles,
          chatMessages: document.getElementById("chatMessages"),
          handlePeerList,
          handleNewPeer,
          removeParticipantUI,
          localStream,
          action: "create",
        })

        // Reset button
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false

        // Update UI
        document.getElementById("roomTitle").textContent = roomName
        document.getElementById("generatedRoomId").textContent = currentRoomId

        // Hide modals and show watch room
        document.getElementById("createRoomModal").classList.remove("active")
        document.getElementById("watchRoomContainer").style.display = "flex"

        // Setup video player
        const mainVideo = document.getElementById("mainVideo")
        mainVideo.src = URL.createObjectURL(videoFile)

        // Setup video controls for creator
        const creatorControls = document.getElementById("creatorControls")
        creatorControls.style.display = "flex"

        // Setup video control events
        setupVideoControls(mainVideo)

        // Enable chat
        enableChat(
          document.getElementById("sendMessageBtn"),
          document.getElementById("chatInputField"),
          () =>
            sendMessage(
              document.getElementById("chatInputField"),
              socket,
              currentRoomId,
              username,
              displayMessage,
              document.getElementById("chatMessages"),
              myPeerId,
            ),
          document.getElementById("chatMessages"),
        )

        // Add creator to participants list
        addParticipantToList(myPeerId, username, userAvatar)

        console.log(`Room created successfully: ${currentRoomId}, Type: ${roomType}`)
      } catch (error) {
        console.error("Error creating room:", error)
        alert(`Failed to create room: ${error.message || "Unknown error"}`)

        // Reset button if there was an error
        const submitBtn = createRoomForm.querySelector('button[type="submit"]')
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false
      }
    })
  }

  // Join Room Form Submit
  const joinRoomForm = document.getElementById("joinRoomForm")
  if (joinRoomForm) {
    joinRoomForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Join Room form submitted")

      const roomId = document.getElementById("roomIdInput").value
      const roomPassword = document.getElementById("roomPasswordInput").value

      if (!roomId) {
        alert("Please enter a room ID")
        return
      }

      try {
        // Show loading indicator
        const submitBtn = joinRoomForm.querySelector('button[type="submit"]')
        const originalBtnText = submitBtn.innerHTML
        submitBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Joining Room...'
        submitBtn.disabled = true

        // Check if room exists
        const roomExists = await checkRoomExists(roomId)
        if (!roomExists) {
          alert("Room does not exist or is invalid")
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false
          return
        }

        currentRoomId = roomId
        isRoomCreator = false

        // Function to remove a participant from the UI
        const removeParticipantUI = (peerId) => {
          console.log(`Removing participant with peerId: ${peerId}`)
          if (peerConnections.has(peerId)) {
            const pc = peerConnections.get(peerId)
            if (pc) pc.close()
            peerConnections.delete(peerId)
          }
          peerList.delete(peerId)
          updateParticipantsList()
        }

        // Initialize media
        const mediaStream = await initializeMedia()
        if (!mediaStream) {
          alert("Media access is required to join a room. Please grant camera/microphone permissions.")
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false
          return
        }

        localStream = mediaStream
        myPeerId = domElements.getMyPeerId()
        const initializeVideoCircles = domElements.initializeVideoCircles
        const addControlListeners = domElements.addControlListeners

        // Connect to WebSocket
        const handlePeerList = (peers) => {
          console.log(`Received peerList for room ${currentRoomId}:`, peers)
          peerList.clear()
          peerList.add(myPeerId)
          if (Array.isArray(peers)) {
            peers.forEach((peerId) => {
              if (peerId !== myPeerId) peerList.add(peerId)
            })
          }
          updateParticipantsList()
          startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipantUI)
        }

        const handleNewPeer = (newPeerId) => {
          console.log(`New peer joined: ${newPeerId}`)
          if (!peerList.has(newPeerId)) {
            peerList.add(newPeerId)
            updateParticipantsList()
          }
        }

        const removeParticipant = (peerId) => {
          console.log(`Removing participant with peerId: ${peerId}`)
          if (peerConnections.has(peerId)) {
            const pc = peerConnections.get(peerId)
            if (pc) pc.close()
            peerConnections.delete(peerId)
          }
          peerList.delete(peerId)
          updateParticipantsList()
        }

        socket = await connectWebSocket({
          currentRoomId,
          myPeerId,
          roomType: "join",
          handleOffer,
          handleAnswer,
          handleCandidate,
          displayMessage,
          peerConnections,
          peerList,
          initializeVideoCircles: domElements.initializeVideoCircles,
          chatMessages: document.getElementById("chatMessages"),
          handlePeerList,
          handleNewPeer,
          removeParticipantUI,
          localStream,
          action: "join",
        })

        // Reset button
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false

        // Update UI
        document.getElementById("generatedRoomId").textContent = currentRoomId

        // Hide modals and show watch room
        document.getElementById("joinRoomModal").classList.remove("active")
        document.getElementById("watchRoomContainer").style.display = "flex"

        // Setup video player for viewer
        const mainVideo = document.getElementById("mainVideo")

        // Hide creator controls for viewers
        const creatorControls = document.getElementById("creatorControls")
        creatorControls.style.display = "none"

        // Enable chat
        enableChat(
          document.getElementById("sendMessageBtn"),
          document.getElementById("chatInputField"),
          () =>
            sendMessage(
              document.getElementById("chatInputField"),
              socket,
              currentRoomId,
              username,
              displayMessage,
              document.getElementById("chatMessages"),
              myPeerId,
            ),
          document.getElementById("chatMessages"),
        )

        // Add self to participants list
        addParticipantToList(myPeerId, username, userAvatar)

        console.log(`Joined room successfully: ${currentRoomId}`)
      } catch (error) {
        console.error("Error joining room:", error)
        alert(`Failed to join room: ${error.message || "Unknown error"}`)

        // Reset button if there was an error
        const submitBtn = joinRoomForm.querySelector('button[type="submit"]')
        submitBtn.innerHTML = originalBtnText
        submitBtn.disabled = false
      }
    })
  }

  // Helper function to check if a room exists
  async function checkRoomExists(roomId) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(window.WEBSOCKET_URL)
      let timeoutId

      ws.onopen = () => {
        console.log("WebSocket opened to check room existence")
        ws.send(JSON.stringify({ type: "checkRoom", roomId }))

        // Set a timeout in case we don't get a response
        timeoutId = setTimeout(() => {
          console.warn("Room check timed out")
          resolve(false) // Assume room doesn't exist if we time out
          ws.close()
        }, 5000)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "roomStatus") {
            clearTimeout(timeoutId)
            console.log(`Room ${roomId} exists: ${data.exists}`)
            resolve(data.exists)
            ws.close()
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
          clearTimeout(timeoutId)
          resolve(false)
          ws.close()
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error when checking room:", error)
        clearTimeout(timeoutId)
        resolve(false) // Assume room doesn't exist if there's an error
        ws.close()
      }

      ws.onclose = () => {
        console.log("WebSocket closed after checking room")
        clearTimeout(timeoutId)
      }
    })
  }

  // Function to update participants list
  function updateParticipantsList() {
    const participantsList = document.getElementById("participantsList")
    if (!participantsList) {
      console.error("Participants list element not found")
      return
    }

    participantsList.innerHTML = ""

    peerList.forEach((peerId) => {
      // For demo purposes, we'll use the peerId to generate a username
      // In a real app, you'd get this from your user database
      const participantUsername = peerId === myPeerId ? username : `User-${peerId.substring(0, 5)}`
      const participantAvatar = peerId === myPeerId ? userAvatar : null

      addParticipantToList(peerId, participantUsername, participantAvatar)
    })
  }

  // Function to add a participant to the list
  function addParticipantToList(peerId, username, avatarUrl) {
    const participantsList = document.getElementById("participantsList")
    if (!participantsList) {
      console.error("Participants list element not found")
      return
    }

    const participantItem = document.createElement("div")
    participantItem.classList.add("participant-item")
    participantItem.dataset.peerId = peerId

    const participantAvatar = document.createElement("div")
    participantAvatar.classList.add("participant-avatar")

    if (avatarUrl) {
      const img = document.createElement("img")
      img.src = avatarUrl
      img.alt = username
      participantAvatar.appendChild(img)
    } else {
      participantAvatar.textContent = username.charAt(0).toUpperCase()
    }

    const participantName = document.createElement("div")
    participantName.classList.add("participant-name")
    participantName.textContent = username

    if (peerId === myPeerId) {
      participantName.textContent += " (You)"
    }

    participantItem.appendChild(participantAvatar)
    participantItem.appendChild(participantName)

    participantsList.appendChild(participantItem)
  }

  // Function to setup video controls
  function setupVideoControls(videoElement) {
    const playPauseBtn = document.getElementById("playPauseBtn")
    const fullscreenBtn = document.getElementById("fullscreenBtn")
    const progressFill = document.getElementById("videoProgressFill")
    const progressBar = document.getElementById("videoProgress")
    const currentTimeDisplay = document.getElementById("currentTime")
    const totalTimeDisplay = document.getElementById("totalTime")

    if (!playPauseBtn || !fullscreenBtn || !progressFill || !progressBar || !currentTimeDisplay || !totalTimeDisplay) {
      console.error("Video control elements not found")
      return
    }

    // Play/Pause
    playPauseBtn.addEventListener("click", () => {
      if (videoElement.paused) {
        videoElement
          .play()
          .then(() => {
            console.log("Video playback started")
            playPauseBtn.innerHTML = '<span class="material-icons">pause</span>'

            // Broadcast play event to all peers
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "videoControl",
                  action: "play",
                  currentTime: videoElement.currentTime,
                  roomId: currentRoomId,
                }),
              )
            }
          })
          .catch((error) => {
            console.error("Error playing video:", error)
            alert("Could not play video. Please try again.")
          })
      } else {
        videoElement.pause()
        playPauseBtn.innerHTML = '<span class="material-icons">play_arrow</span>'

        // Broadcast pause event to all peers
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "videoControl",
              action: "pause",
              currentTime: videoElement.currentTime,
              roomId: currentRoomId,
            }),
          )
        }
      }
    })

    // Fullscreen
    fullscreenBtn.addEventListener("click", () => {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen()
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen()
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen()
      }
    })

    // Update progress bar
    videoElement.addEventListener("timeupdate", () => {
      if (videoElement.duration) {
        const progress = (videoElement.currentTime / videoElement.duration) * 100
        progressFill.style.width = `${progress}%`

        // Update time display
        currentTimeDisplay.textContent = formatTime(videoElement.currentTime)

        // Broadcast time update every 5 seconds
        if (Math.floor(videoElement.currentTime) % 5 === 0 && Math.floor(videoElement.currentTime) > 0) {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "videoControl",
                action: "timeUpdate",
                currentTime: videoElement.currentTime,
                roomId: currentRoomId,
              }),
            )
          }
        }
      }
    })

    // Click on progress bar to seek
    progressBar.addEventListener("click", (e) => {
      const rect = progressBar.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / progressBar.offsetWidth
      videoElement.currentTime = pos * videoElement.duration

      // Broadcast seek event to all peers
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "videoControl",
            action: "seek",
            currentTime: videoElement.currentTime,
            roomId: currentRoomId,
          }),
        )
      }
    })

    // Video loaded metadata
    videoElement.addEventListener("loadedmetadata", () => {
      totalTimeDisplay.textContent = formatTime(videoElement.duration)
    })

    // Format time to MM:SS
    function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00"
      const minutes = Math.floor(seconds / 60)
      seconds = Math.floor(seconds % 60)
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  }

  // Function to handle video control messages from WebSocket
  function handleVideoControl(data) {
    const videoElement = document.getElementById("mainVideo")

    if (!videoElement) {
      console.error("Main video element not found")
      return
    }

    switch (data.action) {
      case "play":
        videoElement.currentTime = data.currentTime
        videoElement
          .play()
          .then(() => {
            console.log("Video playback started from remote control")
            const playPauseBtn = document.getElementById("playPauseBtn")
            if (playPauseBtn) {
              playPauseBtn.innerHTML = '<span class="material-icons">pause</span>'
            }
          })
          .catch((error) => {
            console.error("Error playing video from remote control:", error)
          })
        break

      case "pause":
        videoElement.pause()
        videoElement.currentTime = data.currentTime
        const playPauseBtn = document.getElementById("playPauseBtn")
        if (playPauseBtn) {
          playPauseBtn.innerHTML = '<span class="material-icons">play_arrow</span>'
        }
        break

      case "seek":
        videoElement.currentTime = data.currentTime
        break

      case "timeUpdate":
        // Only update if the difference is significant (more than 3 seconds)
        if (Math.abs(videoElement.currentTime - data.currentTime) > 3) {
          videoElement.currentTime = data.currentTime
        }
        break
    }
  }

  // Add event listener for WebSocket messages
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "videoControl") {
      handleVideoControl(event.data)
    }
  })

  // Close buttons for all modals
  const closeButtons = document.querySelectorAll(".close-btn")
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal")
      if (modal) {
        modal.classList.remove("active")
      }
    })
  })
})