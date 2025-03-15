// Main JavaScript file
document.addEventListener("DOMContentLoaded", () => {
    // Check if it's the first visit
    if (!localStorage.getItem("termsAccepted")) {
      document.getElementById("terms-modal").classList.remove("hidden")
    }
  
    // Terms and Conditions Modal
    document.getElementById("agree-terms").addEventListener("click", () => {
      localStorage.setItem("termsAccepted", "true")
      document.getElementById("terms-modal").classList.add("hidden")
    })
  
    document.getElementById("decline-terms").addEventListener("click", () => {
      alert("You must accept the Terms and Conditions to use WebParty.")
    })
  
    // Get Started Button
    document.getElementById("get-started").addEventListener("click", () => {
      const accessToken = localStorage.getItem("accessToken")
      if (accessToken) {
        document.getElementById("welcome-section").classList.add("hidden")
        document.getElementById("room-selection").classList.remove("hidden")
      } else {
        document.getElementById("login-modal").classList.remove("hidden")
      }
    })
  
    // Close Modals
    document.querySelectorAll(".close-modal").forEach((closeBtn) => {
      closeBtn.addEventListener("click", function () {
        this.closest(".modal").classList.add("hidden")
      })
    })
  
    // Room Selection
    document.getElementById("rooms-link").addEventListener("click", (e) => {
      e.preventDefault()
      const accessToken = localStorage.getItem("accessToken")
      if (accessToken) {
        document.getElementById("welcome-section").classList.add("hidden")
        document.getElementById("room-selection").classList.remove("hidden")
      } else {
        alert("Please login to access rooms")
        document.getElementById("login-modal").classList.remove("hidden")
      }
    })
  
    // Room Cards
    document.getElementById("private-room").addEventListener("click", () => {
      openRoomModal("private")
    })
  
    document.getElementById("public-room").addEventListener("click", () => {
      openRoomModal("public")
    })
  
    // Toggle between Create and Join Room forms
    document.getElementById("toggle-join").addEventListener("click", () => {
      document.getElementById("create-room-form").classList.add("hidden")
      document.getElementById("join-room-form").classList.remove("hidden")
      document.getElementById("toggle-join").classList.add("hidden")
      document.getElementById("toggle-create").classList.remove("hidden")
      document.getElementById("room-modal-title").textContent = "Join a Room"
    })
  
    document.getElementById("toggle-create").addEventListener("click", () => {
      document.getElementById("join-room-form").classList.add("hidden")
      document.getElementById("create-room-form").classList.remove("hidden")
      document.getElementById("toggle-create").classList.add("hidden")
      document.getElementById("toggle-join").classList.remove("hidden")
      document.getElementById("room-modal-title").textContent = "Create a Room"
    })
  
    // Leave Room
    document.getElementById("leave-room").addEventListener("click", () => {
      window.leaveRoom()
    })
  
    // Toggle Camera and Mic
    document.getElementById("toggle-camera").addEventListener("click", function () {
      this.classList.toggle("off")
      const icon = this.querySelector("i")
      if (this.classList.contains("off")) {
        icon.classList.remove("fa-video")
        icon.classList.add("fa-video-slash")
      } else {
        icon.classList.remove("fa-video-slash")
        icon.classList.add("fa-video")
      }
    })
  
    document.getElementById("toggle-mic").addEventListener("click", function () {
      this.classList.toggle("off")
      const icon = this.querySelector("i")
      if (this.classList.contains("off")) {
        icon.classList.remove("fa-microphone")
        icon.classList.add("fa-microphone-slash")
      } else {
        icon.classList.remove("fa-microphone-slash")
        icon.classList.add("fa-microphone")
      }
    })
  
    // Helper Functions
    function openRoomModal(type) {
      const accessToken = localStorage.getItem("accessToken")
      if (!accessToken) {
        alert("Please login to access rooms")
        document.getElementById("login-modal").classList.remove("hidden")
        return
      }
  
      document.getElementById("room-modal").classList.remove("hidden")
  
      // Reset the modal to create room form
      document.getElementById("join-room-form").classList.add("hidden")
      document.getElementById("create-room-form").classList.remove("hidden")
      document.getElementById("toggle-create").classList.add("hidden")
      document.getElementById("toggle-join").classList.remove("hidden")
      document.getElementById("room-modal-title").textContent = "Create a Room"
  
      // Store the room type for later use
      localStorage.setItem("selectedRoomType", type)
    }
  
    function leaveRoom() {
      // Implementation for leaving a room would go here
      alert("Leaving room functionality not yet implemented.")
    }
  })
  
  