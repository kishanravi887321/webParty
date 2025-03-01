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

    // Initialize DOM and UI
    const domElements = setupDOM();
    const { sendButton, chatInput } = domElements; // Extract sendButton and chatInput
    const sendMessageCallback = (chatInput) => sendMessage(chatInput, socket, currentRoomId, username, displayMessage, domElements.chatMessages, myPeerId);

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
    disableChat(sendButton, chatInput, sendMessageCallback); // Pass correct arguments
    domElements.initializeVideoCircles();
});