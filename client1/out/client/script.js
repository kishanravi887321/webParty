// script.js
import { setupDOM } from './modules/dom.js';
import { connectWebSocket } from './modules/websocket.js';
import { initializeMedia, createPeerConnection, handleOffer, handleAnswer, handleCandidate, startCallForRoom } from './modules/webrtc.js';
import { sendMessage, displayMessage, enableChat, disableChat } from './modules/chat.js';
import { setupUI } from './modules/ui.js';
import { generateRoomId } from './modules/utils.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {


    
    // Global variables
    let localStream;
    let username = "You";
    let token = null;
    let currentRoomId = null;
    const peerConnections = new Map();
    let peerList = new Set();
    let myPeerId = null;
    let socket = null;
// Add toggle button for sidebar on mobile
// Add toggle button for sidebar on mobile
// Add toggle button for sidebar on mobile
const sidebar = document.querySelector(".sidebar");
const toggleBtn = document.createElement("button");
toggleBtn.className = "btn sidebar-toggle";
toggleBtn.innerHTML = '<span class="material-icons">chat</span> Chat';
toggleBtn.style.display = "none"; // Hidden by default on desktop

// Add toggle button to the nav
document.querySelector(".nav").appendChild(toggleBtn);

// Show toggle button on mobile
const checkMobile = () => {
    if (window.innerWidth <= 768) {
        toggleBtn.style.display = "block";
        sidebar.classList.remove("active"); // Hide sidebar by default on mobile
    } else {
        toggleBtn.style.display = "none";
        sidebar.classList.add("active"); // Show sidebar on desktop
    }
};

// Initial check
checkMobile();

// Update on window resize
window.addEventListener("resize", checkMobile);

// Toggle sidebar on button click
toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});
    // Initialize DOM and UI
    const domElements = setupDOM();
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
        socket
    });

    // Initial setup
    myPeerId = domElements.getMyPeerId();
    domElements.initializeVideoCircles();
});