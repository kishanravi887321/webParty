// script.js
import { setupUI } from './modules/ui.js';
import { connectWebSocket, handleOffer, handleAnswer, handleCandidate } from './modules/websocket.js';
import { initializeMedia, startCallForRoom } from './modules/media.js';
import { sendMessage, displayMessage, enableChat, disableChat } from './modules/chat.js';
import { generateRoomId } from './modules/utils.js';

// DOM elements
const domElements = {
    loginBtn: document.getElementById('loginBtn'),
    selectRoomBtn: document.getElementById('selectRoomBtn'),
    authModal: document.getElementById('authModal'),
    roomModal: document.getElementById('roomModal'),
    closeButtons: document.querySelectorAll('.close-btn'),
    authTabs: document.querySelectorAll('.auth-tab'),
    authForms: document.querySelectorAll('.auth-form'),
    roomOptions: document.querySelectorAll('.room-option'),
    localVideo: document.getElementById('localVideo'),
    chatInput: document.querySelector('.chat-input input'),
    sendButton: document.querySelector('.chat-input .control-btn'),
    chatMessages: document.querySelector('.chat-messages'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    participantsContainer: document.querySelector('.participants'),
    initializeVideoCircles: () => {}, // Placeholder or implement as needed
    getMyPeerId: () => myPeerId // Implement or pass as a function
};

// State
let localStream = null;
let username = null;
let token = null;
let currentRoomId = null;
let peerConnections = new Map();
let peerList = new Set();
let myPeerId = null;

// Setup UI with all necessary functions and state
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
    socket: null // Will be set by connectWebSocket
});