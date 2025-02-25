// Modal functionality
const loginBtn = document.getElementById('loginBtn');
const selectRoomBtn = document.getElementById('selectRoomBtn');
const authModal = document.getElementById('authModal');
const roomModal = document.getElementById('roomModal');
const closeButtons = document.querySelectorAll('.close-btn');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const roomOptions = document.querySelectorAll('.room-option');
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// WebRTC Setup
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

let localStream;
let isMicMuted = false;
let isCameraOff = false;

// WebSocket Connection
let socket;
function connectWebSocket() {
    socket = new WebSocket("ws://127.0.0.1:5000"); // Replace with your actual local IP

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
        setTimeout(() => {
            if (!peerConnection.currentRemoteDescription) {
                console.log("📞 Sending Offer (Start Call)");
                startCall();
            } else {
                console.log("🚫 Skipping Offer, Remote Description Already Set");
            }
        }, 1000);
    };

    socket.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected! Reconnecting in 3s...");
        setTimeout(connectWebSocket, 3000);
    };

    socket.onmessage = async (event) => {
        let data = JSON.parse(event.data);
        console.log("📩 Received:", data);

        if (data.type === "offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log("✅ Offer Set");
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: "answer", answer }));
        } else if (data.type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log("✅ Answer Set");
        } else if (data.type === "candidate") {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("✅ ICE Candidate Added");
        }
    };
}

// Get User Media
async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (error) {
        console.error("❌ Error Getting Media:", error);
    }
}

// Start Call
async function startCall() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ type: "offer", offer }));
}

// Handle ICE Candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        console.log("📡 Sending ICE Candidate:", event.candidate);
        socket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
    } else {
        console.log("❄️ No more ICE candidates.");
    }
};

// Handle Remote Video
peerConnection.ontrack = (event) => {
    console.log("🎥 ontrack triggered");
    if (!remoteVideo.srcObject) {
        remoteVideo.srcObject = new MediaStream();
    }
    remoteVideo.srcObject.addTrack(event.track);
    console.log("✅ Remote Video Updated");
};

// ICE Connection State Change
peerConnection.oniceconnectionstatechange = () => {
    console.log("🔄 ICE State Changed:", peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === "failed" || 
        peerConnection.iceConnectionState === "disconnected") {
        console.warn("🚨 ICE Connection Failed! Restarting...");
        peerConnection.restartIce();
    }
};

// Control Button Functionality
const controlButtons = document.querySelectorAll('.control-btn');
controlButtons.forEach(button => {
    button.addEventListener('click', () => {
        const icon = button.querySelector('.material-icons').textContent;
        
        if (icon === 'mic') {
            isMicMuted = !isMicMuted;
            localStream.getAudioTracks()[0].enabled = !isMicMuted;
            button.style.opacity = isMicMuted ? '0.5' : '1';
        } else if (icon === 'videocam') {
            isCameraOff = !isCameraOff;
            localStream.getVideoTracks()[0].enabled = !isCameraOff;
            button.style.opacity = isCameraOff ? '0.5' : '1';
        }
    });
});

// Auth tabs
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetForm = tab.dataset.tab;
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        authForms.forEach(form => {
            form.classList.remove('active');
            if (form.id === `${targetForm}Form`) {
                form.classList.add('active');
            }
        });
    });
});

// Modal controls
loginBtn.addEventListener('click', () => {
    authModal.classList.add('active');
});

selectRoomBtn.addEventListener('click', () => {
    roomModal.classList.add('active');
});

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
const participants = document.querySelectorAll('.participant');
participants.forEach(participant => {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

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
        setTranslate(currentX, currentY, participant);
    }

    function dragEnd() {
        isDragging = false;
        participant.style.zIndex = "1";
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
});

// Form submissions
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authModal.classList.remove('active');
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authModal.classList.remove('active');
});

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
createRoomBtn.addEventListener('click', () => {
    const selectedRoom = document.querySelector('.room-option.selected');
    if (selectedRoom) {
        const roomType = selectedRoom.dataset.type;
        const roomId = generateRoomId();
        const roomTitle = document.getElementById('roomTitle');
        const generatedRoomId = document.getElementById('generatedRoomId');
        roomTitle.textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
        generatedRoomId.textContent = roomId;
        roomModal.classList.remove('active');
    } else {
        alert('Please select a room type');
    }
});

joinRoomBtn.addEventListener('click', () => {
    const selectedRoom = document.querySelector('.room-option.selected');
    if (selectedRoom) {
        const roomType = selectedRoom.dataset.type;
        const roomId = prompt('Enter room ID:');
        if (roomId) {
            const roomTitle = document.getElementById('roomTitle');
            const generatedRoomId = document.getElementById('generatedRoomId');
            roomTitle.textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
            generatedRoomId.textContent = roomId;
            roomModal.classList.remove('active');
        }
    } else {
        alert('Please select a room type');
    }
});

// Initialize WebRTC
connectWebSocket();
initializeMedia();