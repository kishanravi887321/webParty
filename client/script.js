// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const selectRoomBtn = document.getElementById('selectRoomBtn');
const authModal = document.getElementById('authModal');
const roomModal = document.getElementById('roomModal');
const closeButtons = document.querySelectorAll('.close-btn');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const roomOptions = document.querySelectorAll('.room-option');
const localVideo = document.getElementById("localVideo");
const chatInput = document.querySelector('.chat-input input');
const sendButton = document.querySelector('.chat-input .control-btn');
const chatMessages = document.querySelector('.chat-messages');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const participantsContainer = document.querySelector('.participants');

// WebRTC Setup
let localStream;
let username = "You";
let token = null;
let currentRoomId = null;
const peerConnections = new Map(); // Map peerId -> RTCPeerConnection
const API_BASE_URL = "http://127.0.0.1:5000/api/users";

// WebSocket Connection
let socket;
function connectWebSocket() {
    socket = new WebSocket("ws://127.0.0.1:5000");

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
    };

    socket.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected! Reconnecting in 3s...");
        setTimeout(connectWebSocket, 3000);
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", data);

        if (data.type === "offer") {
            await handleOffer(data);
        } else if (data.type === "answer") {
            await handleAnswer(data);
        } else if (data.type === "candidate") {
            await handleCandidate(data);
        } else if (data.type === "chat") {
            displayMessage(data.username, data.message, false);
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// Get User Media
async function initializeMedia() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        }
    } catch (error) {
        console.error("❌ Error Getting Media:", error);
        alert("Failed to access camera/microphone. Please grant permissions.");
    }
}

// Create Peer Connection
function createPeerConnection(peerId) {
    if (peerConnections.has(peerId)) return peerConnections.get(peerId);

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "candidate",
                candidate: event.candidate,
                peerId,
                roomId: currentRoomId
            }));
        }
    };

    pc.ontrack = (event) => {
        const existingParticipant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
        if (!existingParticipant) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.srcObject = event.streams[0];
            const participant = document.createElement('div');
            participant.classList.add('participant');
            participant.dataset.peerId = peerId;
            participant.draggable = true;
            participant.appendChild(video);
            const controls = document.createElement('div');
            controls.classList.add('controls');
            controls.innerHTML = `
                <button class="control-btn" data-peer-id="${peerId}" data-type="mic"><span class="material-icons">mic</span></button>
                <button class="control-btn" data-peer-id="${peerId}" data-type="videocam"><span class="material-icons">videocam</span></button>
            `;
            participant.appendChild(controls);
            participantsContainer.appendChild(participant);
            addDragListeners(participant);
            addControlListeners(peerId);
        }
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log(`Peer ${peerId} disconnected`);
            removeParticipant(peerId);
            peerConnections.delete(peerId);
        }
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    peerConnections.set(peerId, pc);
    return pc;
}

// Handle WebRTC Signaling
async function handleOffer(data) {
    const peerId = data.peerId || `peer-${Date.now()}`;
    const pc = createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.send(JSON.stringify({
        type: "answer",
        answer,
        peerId,
        roomId: currentRoomId
    }));
}

async function handleAnswer(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc && !pc.remoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
}

async function handleCandidate(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}

// Start Call for Room
async function startCallForRoom() {
    const peerId = `peer-${Date.now()}`; // Unique ID for this client
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({
        type: "offer",
        offer,
        peerId,
        roomId: currentRoomId
    }));
}

// Control Button Functionality
function addControlListeners(peerId) {
    const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);
    controls.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            if (type === 'mic') {
                const isMicMuted = !localStream.getAudioTracks()[0].enabled;
                localStream.getAudioTracks()[0].enabled = isMicMuted;
                button.style.opacity = isMicMuted ? '1' : '0.5';
            } else if (type === 'videocam') {
                const isCameraOff = !localStream.getVideoTracks()[0].enabled;
                localStream.getVideoTracks()[0].enabled = isCameraOff;
                button.style.opacity = isCameraOff ? '1' : '0.5';
            }
        });
    });
}

// Remove Participant
function removeParticipant(peerId) {
    const participant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
    if (participant) {
        participant.remove();
    }
}

// Chat Functionality
function sendMessage() {
    const message = chatInput.value.trim();
    if (message && socket.readyState === WebSocket.OPEN) {
        const chatData = { type: "chat", username, message, roomId: currentRoomId };
        socket.send(JSON.stringify(chatData));
        displayMessage(username, message, true);
        chatInput.value = "";
    }
}

function displayMessage(user, message, isLocal) {
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

// Chat Event Listeners
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Auth API Calls (unchanged for brevity)
async function registerUser(event) { /* ... */ }
async function loginUser(event) { /* ... */ }
async function updatePassword(event) { /* ... */ }
async function forgotPassword() { /* ... */ }

// Auth tabs
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetForm = tab.dataset.tab;
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        authForms.forEach(form => {
            form.classList.remove('active');
            if (form.id === `${targetForm}Form`) form.classList.add('active');
        });
    });
});

// Modal controls
loginBtn.addEventListener('click', () => authModal.classList.add('active'));
selectRoomBtn.addEventListener('click', () => roomModal.classList.add('active'));
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        authModal.classList.remove('active');
        roomModal.classList.remove('active');
    });
});

// Room selection
roomOptions.forEach(option => {
    option.addEventListener('click', () => {
        roomOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    });
});

// Draggable participants
function addDragListeners(participant) {
    let isDragging = false;
    let currentX = 0, currentY = 0;
    let initialX = 0, initialY = 0;
    let xOffset = 0, yOffset = 0;

    participant.addEventListener('pointerdown', dragStart);
    document.addEventListener('pointermove', drag);
    document.addEventListener('pointerup', dragEnd);

    function dragStart(e) {
        e.preventDefault();
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        participant.style.zIndex = "1000";
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        participant.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }

    function dragEnd() {
        isDragging = false;
        participant.style.zIndex = "1";
    }
}

// Room ID Generation
function generateRoomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 5; i++) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomId;
}

// Create/Join Room
createRoomBtn.addEventListener('click', async () => {
    const selectedRoom = document.querySelector('.room-option.selected');
    if (selectedRoom) {
        const roomType = selectedRoom.dataset.type;
        currentRoomId = generateRoomId();
        document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
        document.getElementById('generatedRoomId').textContent = currentRoomId;
        roomModal.classList.remove('active');
        await initializeMedia();
        if (localStream) {
            socket.send(JSON.stringify({ type: "join", roomId: currentRoomId }));
            await startCallForRoom();
        } else {
            alert("Cannot join room without media access.");
        }
    } else {
        alert('Please select a room type');
    }
});

joinRoomBtn.addEventListener('click', async () => {
    const selectedRoom = document.querySelector('.room-option.selected');
    if (selectedRoom) {
        const roomType = selectedRoom.dataset.type;
        currentRoomId = prompt('Enter room ID:');
        if (currentRoomId) {
            document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
            document.getElementById('generatedRoomId').textContent = currentRoomId;
            roomModal.classList.remove('active');
            await initializeMedia();
            if (localStream) {
                socket.send(JSON.stringify({ type: "join", roomId: currentRoomId }));
                await startCallForRoom();
            } else {
                alert("Cannot join room without media access.");
            }
        }
    } else {
        alert('Please select a room type');
    }
});

// Initialize WebRTC and Chat
connectWebSocket();