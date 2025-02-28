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

// WebRTC and WebSocket Setup
let localStream;
let username = "You"; // Default username, update this after login if needed
let token = null;
let currentRoomId = null;
const peerConnections = new Map(); // Map peerId -> RTCPeerConnection
let peerList = new Set(); // Track all peers in the room (including self)
let myPeerId = null; // Store the user's persistent peerId
let socket = null; // Initialize socket as null, connect only on room action

// Initialize two static video circles for local and remote users
function initializeVideoCircles() {
    // Clear existing participants
    participantsContainer.innerHTML = '';

    // Local video circle
    const localParticipant = document.createElement('div');
    localParticipant.classList.add('participant');
    localParticipant.dataset.peerId = ''; // Will be updated with myPeerId
    localParticipant.draggable = true;
    localParticipant.innerHTML = `
        <video id="localVideo" autoplay muted></video>
        <div class="controls">
            <button class="control-btn" data-peer-id="" data-type="mic"><span class="material-icons">mic</span></button>
            <button class="control-btn" data-peer-id="" data-type="videocam"><span class="material-icons">videocam</span></button>
        </div>
    `;
    participantsContainer.appendChild(localParticipant);
    addDragListeners(localParticipant);
    addControlListeners(''); // Initial local controls (updated later)

    // Remote video circle (for the other user)
    const remoteParticipant = document.createElement('div');
    remoteParticipant.classList.add('participant');
    remoteParticipant.dataset.peerId = ''; // Will be updated with remote peerId
    remoteParticipant.draggable = true;
    remoteParticipant.innerHTML = `
        <video id="remoteVideo" autoplay></video>
        <div class="controls">
            <button class="control-btn" data-peer-id="" data-type="mic"><span class="material-icons">mic</span></button>
            <button class="control-btn" data-peer-id="" data-type="videocam"><span class="material-icons">videocam</span></button>
        </div>
    `;
    participantsContainer.appendChild(remoteParticipant);
    addDragListeners(remoteParticipant);
    addControlListeners(''); // Initial remote controls (updated later)
}

// WebSocket Connection (Only on room creation/join)
function connectWebSocket() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.warn("WebSocket already connected or connecting, skipping...");
        return;
    }

    socket = new WebSocket("ws://127.0.0.1:5000");

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
        if (currentRoomId && myPeerId) {
            const selectedRoom = document.querySelector('.room-option.selected');
            const roomType = selectedRoom ? selectedRoom.dataset.type : 'private'; // Default to 'private' if no selection
            console.log(`Sending join with peerId: ${myPeerId}, roomId: ${currentRoomId}, roomType: ${roomType}`);
            socket.send(JSON.stringify({ type: "join", roomId: currentRoomId, peerId: myPeerId, roomType }));
        }
    };

    socket.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected!");
        socket = null; // Clear socket on close
        peerConnections.clear(); // Clear peer connections on disconnect
        peerList.clear(); // Clear peer list on disconnect
        removeAllParticipants(); // Remove all participants from UI
        if (currentRoomId) {
            setTimeout(() => {
                myPeerId = null; // Reset peerId to ensure a new one on reconnect
                connectWebSocket(); // Attempt to reconnect
            }, 3000);
        }
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId || "N/A", roomType: data.roomType });

        if (data.type === "offer") {
            await handleOffer(data);
        } else if (data.type === "answer") {
            await handleAnswer(data);
        } else if (data.type === "candidate") {
            await handleCandidate(data);
        } else if (data.type === "chat" && currentRoomId === data.roomId) {
            displayMessage(data.username, data.message, false);
        } else if (data.type === "peerList") {
            handlePeerList(data.peers);
        } else if (data.type === "newPeer") {
            handleNewPeer(data.peerId);
        } else if (data.type === "peerLeft") {
            removeParticipant(data.peerId);
            peerList.delete(data.peerId);
        } else if (data.type === "sfuStream" && currentRoomId === data.roomId) {
            console.log(`Received SFU stream for peer ${data.peerId} in room ${data.roomId}`);
            handleNewPeer(data.peerId); // Treat as a new peer for normal rooms
        } else if (data.type === "error") {
            console.error("Server error:", data.message);
            if (data.message.includes("Duplicate peerId")) {
                console.warn("Attempting to regenerate peerId due to duplicate...");
                myPeerId = null; // Reset peerId to generate a new one
                connectWebSocket(); // Reconnect with a new peerId
            } else if (data.message.includes("Private room is full")) {
                alert("This private room is full (max 2 users). Please try another room or create a new one.");
                roomModal.classList.add('active'); // Reopen room selection modal
            }
            alert(`Server error: ${data.message}. Please refresh and try again.`);
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// Get a unique, persistent peer ID for the current user (using sessionStorage with fallback, regenerate on duplicate)
function getMyPeerId() {
    if (!myPeerId) {
        try {
            // Try sessionStorage first
            myPeerId = sessionStorage.getItem('peerId');
            if (!myPeerId) {
                // Fallback to localStorage if sessionStorage is blocked
                myPeerId = localStorage.getItem('peerId');
                if (!myPeerId) {
                    myPeerId = `peer-${Date.now()}-${crypto.randomUUID().split('-')[0] || Math.random().toString(36).substr(2, 9)}`;
                    sessionStorage.setItem('peerId', myPeerId); // Prefer sessionStorage
                    localStorage.setItem('peerId', myPeerId); // Fallback to localStorage
                } else {
                    sessionStorage.setItem('peerId', myPeerId); // Sync to sessionStorage if possible
                }
            }
        } catch (e) {
            console.warn("Storage access blocked by tracking prevention, using fallback peerId");
            // Fallback if storage is blocked (e.g., tracking prevention)
            myPeerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        console.log(`Generated/Retrieved persistent peerId: ${myPeerId}`);
    }
    return myPeerId;
}

// Get User Media with Fallback for Camera Conflicts
async function initializeMedia() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("✅ Camera and microphone access granted");
            // Set local video stream to local circle
            const localVideoElement = document.getElementById('localVideo');
            if (localVideoElement) localVideoElement.srcObject = localStream;
        }
    } catch (error) {
        console.error("❌ Error Getting Media:", error);
        if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
            alert("Camera or microphone access denied or already in use. Please close other applications or grant permissions.");
        } else {
            alert("Failed to access camera/microphone. Please grant permissions or check your setup.");
        }
        // Optionally, try a fallback (e.g., retry or use a mock video)
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); // Audio-only fallback
            localVideo.srcObject = null; // No video if camera is blocked
            console.warn("Falling back to audio-only due to camera access issues");
        } catch (fallbackError) {
            console.error("❌ Fallback failed:", fallbackError);
        }
    }
}

// Create Peer Connection for Simple Broadcasting
function createPeerConnection(peerId) {
    if (peerConnections.has(peerId)) {
        console.log(`Peer connection for ${peerId} already exists, reusing it.`);
        return peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`Sending ICE candidate for peer ${peerId} in room ${currentRoomId}`);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "candidate",
                    candidate: event.candidate,
                    peerId,
                    roomId: currentRoomId
                }));
            } else {
                console.warn("WebSocket not open, cannot send ICE candidate");
            }
        }
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log(`Peer ${peerId} disconnected`);
            removeParticipant(peerId);
            peerConnections.delete(peerId);
            peerList.delete(peerId);
            // Reset remote video if disconnected
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) remoteVideo.srcObject = null;
        }
    };

    // Add tracks only if not already added and localStream exists
    if (localStream) {
        localStream.getTracks().forEach(track => {
            if (!pc.getSenders().some(sender => sender.track === track)) {
                pc.addTrack(track, localStream);
            }
        });
    } else {
        console.warn("Local stream not available, skipping track addition");
    }

    peerConnections.set(peerId, pc);
    return pc;
}

// Handle WebRTC Signaling for Simple Broadcasting
async function handleOffer(data) {
    const peerId = data.peerId;
    const pc = peerConnections.get(peerId) || createPeerConnection(peerId);
    if (!pc.remoteDescription) {
        console.log(`Handling offer for peer ${peerId} in room ${currentRoomId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "answer",
                answer,
                peerId,
                roomId: currentRoomId
            }));
        } else {
            console.warn("WebSocket not open, cannot send answer");
        }
        // Set remote video stream to remote circle only
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) remoteVideo.srcObject = pc.getRemoteStreams()[0] || null;
    } else {
        console.warn(`Skipping offer for ${peerId} - remoteDescription already set`);
    }
}

async function handleAnswer(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc && !pc.remoteDescription) {
        console.log(`Handling answer for peer ${data.peerId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        // Set remote video stream to remote circle only
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) remoteVideo.srcObject = pc.getRemoteStreams()[0] || null;
    } else {
        console.warn(`Skipping answer for ${data.peerId} - remoteDescription already set or peer not found`);
    }
}

async function handleCandidate(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc) {
        try {
            console.log(`Adding ICE candidate for peer ${data.peerId}`);
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error(`Failed to add ICE candidate for peer ${data.peerId}:`, e);
        }
    } else {
        console.warn(`No peer connection found for ${data.peerId} to add ICE candidate`);
    }
}

// Start Call for Room (Simple broadcast to remote circle)
async function startCallForRoom() {
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(myPeerId)) {
        peerList.add(myPeerId); // Add self to peer list only if not already present
    }

    console.log(`Starting call for room ${currentRoomId}, my peerId: ${myPeerId}, peerList:`, Array.from(peerList));
    if (peerList.size === 1) return; // No remote peer to connect to yet

    const remotePeerId = Array.from(peerList).find(peerId => peerId !== myPeerId);
    if (remotePeerId && !peerConnections.has(remotePeerId)) {
        console.log(`Initiating connection to remote peer ${remotePeerId} (delayed)`);
        setTimeout(async () => {
            const pc = createPeerConnection(remotePeerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "offer",
                    offer,
                    peerId: remotePeerId,
                    roomId: currentRoomId
                }));
            } else {
                console.warn("WebSocket not open, cannot send offer");
            }
        }, 2000); // Delay of 2000ms to avoid race conditions
    } else {
        console.log(`Skipping connection - no remote peer or already connected`);
    }
}

// Handle Peer List from Server (Update remote circle)
function handlePeerList(peers) {
    console.log(`Received peerList for room ${currentRoomId}:`, peers);
    if (!myPeerId) myPeerId = getMyPeerId();
    peerList.clear(); // Clear existing peer list to ensure no duplicates
    peerList.add(myPeerId); // Re-add self
    peers.forEach(peerId => {
        if (peerId !== myPeerId && !peerList.has(peerId)) {
            peerList.add(peerId);
        }
    });
    console.log(`Updated peerList:`, Array.from(peerList));
    
    // Update UI for remote peer
    if (peerList.size === 2) { // Only one remote peer for simplicity
        const remotePeerId = Array.from(peerList).find(peerId => peerId !== myPeerId);
        if (remotePeerId) {
            const localParticipant = document.querySelector('.participant:nth-child(1)');
            const remoteParticipant = document.querySelector('.participant:nth-child(2)');
            if (localParticipant) {
                localParticipant.dataset.peerId = myPeerId;
                const localControls = localParticipant.querySelectorAll('.control-btn');
                localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            }
            if (remoteParticipant) {
                remoteParticipant.dataset.peerId = remotePeerId;
                const remoteControls = remoteParticipant.querySelectorAll('.control-btn');
                remoteControls.forEach(btn => btn.dataset.peerId = remotePeerId);
            }
            startCallForRoom(); // Initiate connection with the remote peer
        }
    } else {
        console.warn("Unexpected number of peers, expected 2 for simple broadcast");
    }
}

// Handle New Peer Joining (Update remote circle)
async function handleNewPeer(newPeerId) {
    console.log(`New peer joined: ${newPeerId} in room ${currentRoomId}`);
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(newPeerId)) {
        peerList.add(newPeerId);
        if (peerList.size === 2) { // Only handle one remote peer for simplicity
            const localParticipant = document.querySelector('.participant:nth-child(1)');
            const remoteParticipant = document.querySelector('.participant:nth-child(2)');
            if (localParticipant) {
                localParticipant.dataset.peerId = myPeerId;
                const localControls = localParticipant.querySelectorAll('.control-btn');
                localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            }
            if (remoteParticipant) {
                remoteParticipant.dataset.peerId = newPeerId;
                const remoteControls = remoteParticipant.querySelectorAll('.control-btn');
                remoteControls.forEach(btn => btn.dataset.peerId = newPeerId);
            }
            console.log(`Initiating connection to new peer ${newPeerId} (delayed)`);
            setTimeout(async () => {
                const pc = createPeerConnection(newPeerId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "offer",
                        offer,
                        peerId: newPeerId,
                        roomId: currentRoomId
                    }));
                } else {
                    console.warn("WebSocket not open, cannot send offer");
                }
            }, 2000); // Delay of 2000ms to avoid race conditions
        } else {
            console.warn(`Duplicate or unexpected newPeer ${newPeerId} detected, ignoring`);
        }
    }
}

// Control Button Functionality
function addControlListeners(peerId) {
    const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);
    controls.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            if (peerId === myPeerId || peerId === '') {
                // Handle local user (real user) media
                if (type === 'mic') {
                    const isMicMuted = !localStream.getAudioTracks()[0].enabled;
                    localStream.getAudioTracks()[0].enabled = !isMicMuted; // Toggle mute
                    button.style.opacity = isMicMuted ? '1' : '0.5';
                    // Notify other peers about the mute state
                    broadcastMuteState('audio', isMicMuted);
                } else if (type === 'videocam') {
                    const isCameraOff = !localStream.getVideoTracks()[0].enabled;
                    localStream.getVideoTracks()[0].enabled = !isCameraOff; // Toggle video
                    button.style.opacity = isCameraOff ? '1' : '0.5';
                    // Notify other peers about the mute state
                    broadcastMuteState('video', isCameraOff);
                }
            } else {
                // Handle remote user (connected peer) - notify them to mute/unmute
                const isMuted = button.style.opacity === '0.5';
                if (type === 'mic') {
                    broadcastMuteState('audio', !isMuted, peerId);
                } else if (type === 'videocam') {
                    broadcastMuteState('video', !isMuted, peerId);
                }
            }
        });
    });
}

// Broadcast Mute State to Peers
function broadcastMuteState(type, muted, targetPeerId = null) {
    if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
        const message = {
            type: type === 'audio' ? 'muteAudio' : 'muteVideo',
            roomId: currentRoomId,
            peerId: myPeerId,
            muted: muted
        };
        if (targetPeerId) {
            // Send to a specific peer (P2P for private rooms)
            message.targetPeerId = targetPeerId;
            socket.send(JSON.stringify(message));
        } else {
            // Broadcast to all peers (SFU for normal rooms or P2P broadcast)
            socket.send(JSON.stringify(message));
        }
    }
}

// Handle Remote Mute Requests (for connected peers)
function handleRemoteMute(peerId, type, muted) {
    const participant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
    if (participant) {
        const video = participant.querySelector('video');
        const controlBtn = participant.querySelector(`.control-btn[data-type="${type}"]`);
        if (video && controlBtn) {
            if (type === 'video') {
                const videoTracks = video.srcObject?.getVideoTracks() || [];
                videoTracks.forEach(track => track.enabled = !muted);
            } else if (type === 'audio') {
                const audioTracks = video.srcObject?.getAudioTracks() || [];
                audioTracks.forEach(track => track.enabled = !muted);
            }
            controlBtn.style.opacity = muted ? '0.5' : '1';
        }
    }
}

// Remove Participant (Updated to clean up peer connections properly and log)
function removeParticipant(peerId) {
    console.log(`Removing participant with peerId: ${peerId}`);
    const participant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
    if (participant) {
        participant.remove();
    }
    if (peerConnections.has(peerId)) {
        const pc = peerConnections.get(peerId);
        if (pc) {
            pc.close(); // Close the peer connection
        }
        peerConnections.delete(peerId);
    }
    peerList.delete(peerId);
    // Reset remote video if this was the remote peer
    if (peerId !== myPeerId) {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) remoteVideo.srcObject = null;
    }
}

// Remove All Participants (for cleanup on disconnect)
function removeAllParticipants() {
    participantsContainer.innerHTML = ''; // Clear all participant elements
    peerConnections.clear(); // Clear all peer connections
    peerList.clear(); // Clear peer list
    initializeVideoCircles(); // Reinitialize static circles
}

// Chat Functionality (Enabled only after joining/creating a room)
function sendMessage() {
    if (!currentRoomId || !socket || socket.readyState !== WebSocket.OPEN) {
        alert("Please join or create a room and ensure WebSocket is connected before sending messages.");
        return;
    }
    const message = chatInput.value.trim();
    if (message) {
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
function enableChat() {
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Prevent default behavior (e.g., new line in input)
            sendMessage();
        }
    });
}

function disableChat() {
    sendButton.removeEventListener('click', sendMessage);
    chatInput.removeEventListener('keydown', (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

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
loginBtn.addEventListener('click', () => {
    if (authModal) {
        console.log("Login button clicked, showing authModal");
        authModal.classList.add('active');
    } else {
        console.error("authModal element not found in DOM");
    }
});

selectRoomBtn.addEventListener('click', () => {
    if (roomModal) {
        console.log("Select Room button clicked, showing roomModal");
        roomModal.classList.add('active');
    } else {
        console.error("roomModal element not found in DOM");
    }
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
        console.log(`Selected room type: ${option.dataset.type}`);
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

// Create/Join Room (Enable chat and handle peer connections, connect socket only here)
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
            myPeerId = getMyPeerId(); // Ensure myPeerId is set before connecting
            initializeVideoCircles(); // Initialize static video circles
            const localParticipant = document.querySelector('.participant:nth-child(1)');
            if (localParticipant) {
                localParticipant.dataset.peerId = myPeerId;
                const localControls = localParticipant.querySelectorAll('.control-btn');
                localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            }
            connectWebSocket(); // Connect WebSocket only when creating a room
            await startCallForRoom();
            enableChat(); // Enable chat functionality after joining/creating a room
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
                myPeerId = getMyPeerId(); // Ensure myPeerId is set before connecting
                initializeVideoCircles(); // Initialize static video circles
                const localParticipant = document.querySelector('.participant:nth-child(1)');
                if (localParticipant) {
                    localParticipant.dataset.peerId = myPeerId;
                    const localControls = localParticipant.querySelectorAll('.control-btn');
                    localControls.forEach(btn => btn.dataset.peerId = myPeerId);
                }
                connectWebSocket(); // Connect WebSocket only when joining a room
                await startCallForRoom();
                enableChat(); // Enable chat functionality after joining/creating a room
            } else {
                alert("Cannot join room without media access.");
            }
        }
    } else {
        alert('Please select a room type');
    }
});

// Initialize (No WebSocket connection on load, initialize static circles)
document.addEventListener('DOMContentLoaded', () => {
    myPeerId = getMyPeerId(); // Initialize myPeerId on page load (but don’t connect socket yet)
    disableChat(); // Disable chat initially until a room is joined/created
    initializeVideoCircles(); // Initialize static video circles on page load
    const colorPickerBtn = document.getElementById('colorPickerBtn');
    
    // Create a hidden color input dynamically
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.style.display = 'none';
    document.body.appendChild(colorInput);

    // Show color picker when button is clicked
    colorPickerBtn.addEventListener('click', () => {
        colorInput.click();
    });

    // Update room background color and related elements when a new color is selected
    colorInput.addEventListener('change', (e) => {
        const newColor = e.target.value;
        // Update the background colors for the entire screen
        document.body.style.backgroundColor = newColor;
        document.querySelector('.nav').style.backgroundColor = `rgba(${hexToRgb(newColor).r}, ${hexToRgb(newColor).g}, ${hexToRgb(newColor).b}, 0.8)`;
        document.querySelector('.sidebar').style.backgroundColor = newColor;
        document.querySelector('.main-content').style.backgroundColor = newColor;
        document.querySelector('.video-container').style.backgroundColor = newColor;
        document.querySelector('.chat-input').style.backgroundColor = `rgba(255, 255, 255, 0.05)`;
        document.querySelector('.modal-content').style.backgroundColor = newColor;
        
        // Keep icons and neon elements unaffected (you can adjust this as needed)
    });

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
});