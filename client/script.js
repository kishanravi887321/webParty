// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const selectRoomBtn = document.getElementById('selectRoomBtn');
const authModal = document.getElementById('authModal');
const roomModal = document.getElementById('roomModal');
const closeButtons = document.querySelectorAll('.close-btn');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const roomOptions = document.querySelectorAll('.room-option');
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
const peerConnections = new Map(); // Map peerId -> RTCPeerConnection for P2P
let peerList = new Set(); // Track all peers in the room
let myPeerId = null; // Store the user's persistent peerId
let socket = null; // Initialize socket as null, connect only on room action
let isPrivateRoom = false; // Flag to determine room type (private or normal)

const API_BASE_URL = "ws://127.0.0.1:5000"; // Update for production (e.g., wss://your-app.onrender.com)

// Enhanced ICE servers for better NAT traversal
const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
    // Optionally, add a TURN server for more reliable NAT traversal (e.g., coturn):
    // { urls: "turn:your-turn-server:3478", username: "username", credential: "password" }
];

// WebSocket Connection (Only on room creation/join)
function connectWebSocket() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.warn("WebSocket already connected or connecting, skipping...");
        return;
    }

    socket = new WebSocket(API_BASE_URL);

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
        if (currentRoomId && myPeerId) {
            console.log(`Sending join with peerId: ${myPeerId}, roomId: ${currentRoomId}, roomType: ${isPrivateRoom ? 'private' : 'normal'}`);
            socket.send(JSON.stringify({ 
                type: "join", 
                roomId: currentRoomId, 
                peerId: myPeerId,
                roomType: isPrivateRoom ? 'private' : 'normal' 
            }));
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
        console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId || "N/A", roomType: data.roomType || "N/A" });

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
        } else if (data.type === "error") {
            console.error("Server error:", data.message);
            if (data.message.includes("Duplicate peerId")) {
                console.warn("Attempting to regenerate peerId due to duplicate...");
                myPeerId = null; // Reset peerId to ensure a new one on reconnect
                connectWebSocket(); // Reconnect with a new peerId
            } else if (data.message.includes("Private room is full")) {
                alert("This private room is full (max 2 users). Please try another room.");
                currentRoomId = null; // Clear room to prevent further actions
                socket.close(); // Close the socket if room is full
            }
            alert(`Server error: ${data.message}. Please refresh and try again.`);
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// Get a unique, persistent peer ID for the current user
function getMyPeerId() {
    if (!myPeerId) {
        try {
            myPeerId = sessionStorage.getItem('peerId');
            if (!myPeerId) {
                myPeerId = localStorage.getItem('peerId');
                if (!myPeerId) {
                    myPeerId = `peer-${Date.now()}-${crypto.randomUUID().split('-')[0] || Math.random().toString(36).substr(2, 9)}`;
                    sessionStorage.setItem('peerId', myPeerId);
                    localStorage.setItem('peerId', myPeerId);
                } else {
                    sessionStorage.setItem('peerId', myPeerId);
                }
            }
        } catch (e) {
            console.warn("Storage access blocked, using fallback peerId");
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
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 }, // Explicit resolution for better compatibility
                audio: true 
            });
            console.log("✅ Camera and microphone access granted, tracks:", localStream.getTracks());
            updateLocalParticipant(); // Update local video in UI
        }
    } catch (error) {
        console.error("❌ Error Getting Media:", error);
        if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
            alert("Camera or microphone access denied or already in use. Please close other applications or grant permissions.");
        } else {
            alert("Failed to access camera/microphone. Please grant permissions or check your setup.");
        }
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); // Audio-only fallback
            console.warn("Falling back to audio-only due to camera access issues, tracks:", localStream.getTracks());
            updateLocalParticipant(); // Update UI even if video fails
        } catch (fallbackError) {
            console.error("❌ Fallback failed:", fallbackError);
        }
    }
}

// Update or create local participant in UI
function updateLocalParticipant() {
    let localParticipant = participantsContainer.querySelector(`[data-peer-id="${myPeerId || ''}"]`);
    if (!localParticipant && myPeerId) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true; // Mute local video to prevent echo
        video.srcObject = localStream || null;
        localParticipant = document.createElement('div');
        localParticipant.classList.add('participant');
        localParticipant.dataset.peerId = myPeerId;
        localParticipant.draggable = true;
        localParticipant.appendChild(video);
        const controls = document.createElement('div');
        controls.classList.add('controls');
        controls.innerHTML = `
            <button class="control-btn" data-peer-id="${myPeerId}" data-type="mic"><span class="material-icons">mic</span></button>
            <button class="control-btn" data-peer-id="${myPeerId}" data-type="videocam"><span class="material-icons">videocam</span></button>
        `;
        localParticipant.appendChild(controls);
        participantsContainer.appendChild(localParticipant);
        addDragListeners(localParticipant);
        addControlListeners(myPeerId);
        console.log(`Created local participant for peer ${myPeerId}, stream:`, localStream);
    } else if (localParticipant && localStream) {
        const video = localParticipant.querySelector('video');
        video.srcObject = null; // Clear old stream
        video.srcObject = localStream; // Attach new stream
        console.log("Updated local participant stream for peer ${myPeerId}");
    }
}

// Create Peer Connection for P2P (private rooms only)
function createPeerConnection(peerId) {
    if (peerConnections.has(peerId)) {
        console.log(`Peer connection for ${peerId} already exists, reusing it. Is local: ${peerId === myPeerId}`);
        return peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection({
        iceServers: iceServers, // Use enhanced ICE servers
        iceTransportPolicy: "all", // Ensure all ICE candidates are considered
        bundlePolicy: "max-bundle" // Optimize for bundle policy
    });

    pc.hasAddedParticipant = false; // Initialize flag on new connection

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`Sending ICE candidate for peer ${peerId} in room ${currentRoomId}, roomType: ${isPrivateRoom ? 'private' : 'normal'}, isLocal: ${peerId === myPeerId}`);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "candidate",
                    candidate: event.candidate,
                    peerId,
                    roomId: currentRoomId,
                    targetPeerId: peerId,
                    roomType: isPrivateRoom ? 'private' : 'normal' // Ensure roomType is included
                }));
            } else {
                console.warn("WebSocket not open, cannot send ICE candidate");
            }
        }
    };

    pc.ontrack = (event) => {
        console.log(`ontrack event for peer ${peerId} with stream:`, event.streams[0], event.streams[0].getVideoTracks(), `myPeerId: ${myPeerId}, isLocal: ${peerId === myPeerId}`);
        const existingParticipant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
        if (!existingParticipant || peerId !== myPeerId) { // Create or update for remote peers, or new participants
            const videoStream = event.streams[0];
            const videoTracks = videoStream.getVideoTracks();
            if (videoTracks.length > 0) { // Only create/update participant if there's a video track
                const video = document.createElement('video');
                video.autoplay = true;
                video.srcObject = videoStream;
                const participant = existingParticipant || document.createElement('div');
                if (!existingParticipant) {
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
                    console.log(`Created new participant for peer ${peerId}, isLocal: ${peerId === myPeerId}, stream:`, videoStream);
                } else {
                    participant.querySelector('video').srcObject = null; // Clear old stream
                    participant.querySelector('video').srcObject = videoStream; // Update with new stream
                    console.log(`Updated participant for peer ${peerId}, isLocal: ${peerId === myPeerId}, stream:`, videoStream);
                }
                pc.hasAddedParticipant = true; // Mark that we've added/updated this participant
            } else {
                console.warn(`No video track for peer ${peerId}, skipping participant creation/update, isLocal: ${peerId === myPeerId}`);
            }
        } else {
            console.warn(`Local participant for peer ${peerId} already exists and is local, skipping update, isLocal: ${peerId === myPeerId}`);
        }
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log(`Peer ${peerId} disconnected, state: ${pc.iceConnectionState}, isLocal: ${peerId === myPeerId}`);
            removeParticipant(peerId);
            peerConnections.delete(peerId);
            peerList.delete(peerId);
            // Attempt to reconnect immediately if disconnected
            if (currentRoomId && socket && socket.readyState === WebSocket.OPEN) {
                console.log("Attempting to reconnect peer connection immediately...");
                startCallForRoom();
            }
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            console.log(`Peer ${peerId} connection established, state: ${pc.iceConnectionState}, isLocal: ${peerId === myPeerId}`);
        } else {
            console.log(`Peer ${peerId} connection state changed to: ${pc.iceConnectionState}, isLocal: ${peerId === myPeerId}`);
        }
    };

    // Add tracks only if localStream exists, ensuring video is included
    if (localStream) {
        localStream.getTracks().forEach(track => {
            console.log(`Adding track to peer ${peerId}:`, track.kind, track.enabled, `isLocal: ${peerId === myPeerId}`);
            if (!pc.getSenders().some(sender => sender.track === track)) {
                pc.addTrack(track, localStream);
            }
        });
    } else {
        console.warn("Local stream not available, skipping track addition for peer ${peerId}, isLocal: ${peerId === myPeerId}");
    }

    peerConnections.set(peerId, pc);
    return pc;
}

// Handle WebRTC Signaling (P2P for private rooms)
async function handleOffer(data) {
    const peerId = data.peerId;
    const pc = peerConnections.get(peerId) || createPeerConnection(peerId);
    if (!pc.remoteDescription) {
        console.log(`Handling offer for peer ${peerId} in room ${currentRoomId}, roomType: ${data.roomType || 'unknown'}, isLocal: ${peerId === myPeerId}`);
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(answer);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "answer",
                    answer,
                    peerId,
                    roomId: currentRoomId,
                    targetPeerId: peerId,
                    roomType: isPrivateRoom ? 'private' : 'normal' // Ensure roomType is included
                }));
            } else {
                console.warn("WebSocket not open, cannot send answer, isLocal: ${peerId === myPeerId}");
            }
        } catch (e) {
            console.error(`Failed to handle offer for peer ${peerId}:`, e);
            // Attempt to recreate the peer connection if necessary
            if (currentRoomId && socket && socket.readyState === WebSocket.OPEN) {
                console.log("Recreating peer connection due to offer error...");
                createPeerConnection(peerId);
                startCallForRoom();
            }
        }
    } else {
        console.warn(`Skipping offer for ${peerId} - remoteDescription already set, isLocal: ${peerId === myPeerId}`);
    }
}

async function handleAnswer(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc && !pc.remoteDescription) {
        console.log(`Handling answer for peer ${data.peerId}, roomType: ${data.roomType || 'unknown'}, isLocal: ${data.peerId === myPeerId}`);
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
            console.error(`Failed to set remote description for peer ${data.peerId}:`, e);
            // Attempt to recreate the peer connection if necessary
            if (currentRoomId && socket && socket.readyState === WebSocket.OPEN) {
                console.log("Recreating peer connection due to answer error...");
                createPeerConnection(data.peerId);
                startCallForRoom();
            }
        }
    } else {
        console.warn(`Skipping answer for ${data.peerId} - remoteDescription already set or peer not found, isLocal: ${data.peerId === myPeerId}`);
    }
}

async function handleCandidate(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc) {
        try {
            console.log(`Adding ICE candidate for peer ${data.peerId}, roomType: ${data.roomType || 'unknown'}, isLocal: ${data.peerId === myPeerId}`);
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error(`Failed to add ICE candidate for peer ${data.peerId}:`, e);
        }
    } else {
        console.warn(`No peer connection found for ${data.peerId} to add ICE candidate, isLocal: ${data.peerId === myPeerId}`);
    }
}

// Start Call for Room (P2P for private rooms, limited to 2 users, no delay)
async function startCallForRoom() {
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(myPeerId)) {
        peerList.add(myPeerId); // Add self to peer list
    }

    console.log(`Starting call for room ${currentRoomId}, my peerId: ${myPeerId}, peerList:`, Array.from(peerList), `roomType: ${isPrivateRoom ? 'private' : 'normal'}`);
    if (isPrivateRoom) {
        if (peerList.size > 2) {
            console.warn("Private room exceeds 2 users, limiting to 2");
            peerList.clear();
            peerList.add(myPeerId);
            const otherPeer = Array.from(peerList)[0]; // Take the first other peer
            if (otherPeer && otherPeer !== myPeerId) {
                peerList.add(otherPeer);
                if (!peerConnections.has(otherPeer)) {
                    // Reset hasAddedParticipant for the new peer
                    const pc = createPeerConnection(otherPeer);
                    pc.hasAddedParticipant = false; // Ensure flag is reset for new peer connections
                    initiateCall(pc, otherPeer);
                }
            } else {
                console.warn("No other peer found for private room connection");
            }
        } else {
            for (const peerId of peerList) {
                if (peerId !== myPeerId && !peerConnections.has(peerId)) {
                    console.log(`Initiating P2P connection to peer ${peerId}, isLocal: ${peerId === myPeerId}`);
                    const pc = createPeerConnection(peerId);
                    pc.hasAddedParticipant = false; // Ensure flag is reset for new peer connections
                    initiateCall(pc, peerId);
                } else if (peerId === myPeerId) {
                    console.log(`Skipping self connection for ${myPeerId}`);
                } else {
                    console.log(`Skipping duplicate P2P connection for ${peerId} - already connected, isLocal: ${peerId === myPeerId}`);
                }
            }
        }
    } else {
        console.warn("SFU not implemented for normal rooms in this update; using placeholder");
        // Placeholder for SFU logic (not implemented here, as we’re focusing on private rooms)
    }
}

// Initiate call without delay
function initiateCall(pc, peerId) {
    (async () => {
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "offer",
                    offer,
                    peerId,
                    roomId: currentRoomId,
                    targetPeerId: peerId,
                    roomType: 'private'
                }));
            } else {
                console.warn("WebSocket not open, cannot send offer for P2P, isLocal: ${peerId === myPeerId}");
            }
        } catch (e) {
            console.error(`Failed to initiate call for peer ${peerId}:`, e);
            if (currentRoomId && socket && socket.readyState === WebSocket.OPEN) {
                console.log("Recreating peer connection due to call initiation error...");
                createPeerConnection(peerId);
                startCallForRoom();
            }
        }
    })();
}

// Handle Peer List from Server
function handlePeerList(peers) {
    console.log(`Received peerList for room ${currentRoomId}:`, peers, `roomType: ${isPrivateRoom ? 'private' : 'normal'}, myPeerId: ${myPeerId}`);
    if (!myPeerId) myPeerId = getMyPeerId();
    peerList.clear(); // Clear existing peer list to ensure no duplicates
    peerList.add(myPeerId); // Re-add self
    peers.forEach(peerId => {
        if (peerId !== myPeerId && !peerList.has(peerId)) {
            peerList.add(peerId);
        }
    });
    console.log(`Updated peerList:`, Array.from(peerList), `myPeerId: ${myPeerId}`);
    startCallForRoom(); // Initiate connections with all peers
}

// Handle New Peer Joining
async function handleNewPeer(newPeerId) {
    console.log(`New peer joined: ${newPeerId} in room ${currentRoomId}, roomType: ${isPrivateRoom ? 'private' : 'normal'}, myPeerId: ${myPeerId}`);
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(newPeerId)) {
        peerList.add(newPeerId);
        if (isPrivateRoom) {
            if (peerList.size > 2) {
                console.warn("Private room exceeds 2 users, rejecting new peer", newPeerId);
                peerList.delete(newPeerId); // Remove new peer if room is full
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "error",
                        peerId: newPeerId,
                        roomId: currentRoomId,
                        message: "Private room is full (max 2 users).",
                        roomType: 'private'
                    }));
                }
                return;
            }
            if (!peerConnections.has(newPeerId)) {
                console.log(`Initiating P2P connection to new peer ${newPeerId}, isLocal: ${newPeerId === myPeerId}`);
                // Reset hasAddedParticipant for the new peer
                const pc = createPeerConnection(newPeerId);
                pc.hasAddedParticipant = false; // Ensure flag is reset for new peer connections
                initiateCall(pc, newPeerId);
            }
        } else {
            console.warn("SFU not implemented for normal rooms in this update; new peer ignored");
            // Placeholder for SFU logic (not implemented here)
        }
    } else {
        console.warn(`Duplicate newPeer ${newPeerId} detected, ignoring, myPeerId: ${myPeerId}`);
    }
}

// Control Button Functionality
function addControlListeners(peerId) {
    const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);
    controls.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            if (peerId === myPeerId) {
                if (type === 'mic') {
                    const isMicMuted = !localStream.getAudioTracks()[0].enabled;
                    localStream.getAudioTracks()[0].enabled = !isMicMuted;
                    button.style.opacity = isMicMuted ? '1' : '0.5';
                    broadcastMuteState('audio', isMicMuted);
                } else if (type === 'videocam') {
                    const isCameraOff = !localStream.getVideoTracks()[0].enabled;
                    localStream.getVideoTracks()[0].enabled = !isCameraOff;
                    button.style.opacity = isCameraOff ? '1' : '0.5';
                    broadcastMuteState('video', isCameraOff);
                }
            } else {
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

// Broadcast Mute State to Peers (P2P for private rooms)
function broadcastMuteState(type, muted, targetPeerId = null) {
    if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
        const message = {
            type: type === 'audio' ? 'muteAudio' : 'muteVideo',
            roomId: currentRoomId,
            peerId: myPeerId,
            muted: muted,
            roomType: isPrivateRoom ? 'private' : 'normal'
        };
        if (isPrivateRoom && targetPeerId) {
            // P2P: Send to specific peer
            socket.send(JSON.stringify({ ...message, targetPeerId }));
        } else {
            // SFU or normal broadcast (placeholder, not used here for private rooms)
            socket.send(JSON.stringify(message));
        }
    }
}

// Handle Remote Mute Requests
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

// Remove Participant
function removeParticipant(peerId) {
    console.log(`Removing participant with peerId: ${peerId}, isLocal: ${peerId === myPeerId}`);
    const participant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
    if (participant) {
        participant.remove();
    }
    if (peerConnections.has(peerId)) {
        const pc = peerConnections.get(peerId);
        if (pc) {
            pc.close();
        }
        peerConnections.delete(peerId);
    }
    peerList.delete(peerId);
}

// Remove All Participants
function removeAllParticipants() {
    participantsContainer.innerHTML = '';
    peerConnections.clear();
    peerList.clear();
}

// Chat Functionality
function sendMessage() {
    if (!currentRoomId || !socket || socket.readyState !== WebSocket.OPEN) {
        alert("Please join or create a room and ensure WebSocket is connected before sending messages.");
        return;
    }
    const message = chatInput.value.trim();
    if (message) {
        const chatData = { type: "chat", username, message, roomId: currentRoomId, roomType: isPrivateRoom ? 'private' : 'normal' };
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
            e.preventDefault();
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

// Auth API Calls (Placeholders)
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

// Room selection and creation/join with P2P for private rooms
roomOptions.forEach(option => {
    option.addEventListener('click', () => {
        roomOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        console.log(`Selected room type: ${option.dataset.type}`);
    });
});

createRoomBtn.addEventListener('click', async () => {
    const selectedRoom = document.querySelector('.room-option.selected');
    if (selectedRoom) {
        const roomType = selectedRoom.dataset.type;
        isPrivateRoom = roomType === 'private'; // Set room type
        currentRoomId = generateRoomId();
        if (!currentRoomId) {
            console.error("Failed to generate room ID");
            alert('Failed to create room. Please try again.');
            return;
        }
        document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
        document.getElementById('generatedRoomId').textContent = currentRoomId;
        roomModal.classList.remove('active');
        await initializeMedia();
        if (localStream) {
            myPeerId = getMyPeerId();
            if (!myPeerId) {
                console.error("Failed to generate peer ID");
                alert('Failed to join room. Please refresh and try again.');
                return;
            }
            connectWebSocket(); // Connect WebSocket only when creating a room
            enableChat();
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
        isPrivateRoom = roomType === 'private'; // Set room type
        currentRoomId = prompt('Enter room ID:');
        if (!currentRoomId) {
            alert('Room ID is required');
            return;
        }
        document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
        document.getElementById('generatedRoomId').textContent = currentRoomId;
        roomModal.classList.remove('active');
        await initializeMedia();
        if (localStream) {
            myPeerId = getMyPeerId();
            if (!myPeerId) {
                console.error("Failed to generate peer ID");
                alert('Failed to join room. Please refresh and try again.');
                return;
            }
            connectWebSocket(); // Connect WebSocket only when joining a room
            enableChat();
        } else {
            alert("Cannot join room without media access.");
        }
    } else {
        alert('Please select a room type');
    }
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

// Color Picker
const colorPickerBtn = document.getElementById('colorPickerBtn');
const colorInput = document.createElement('input');
colorInput.type = 'color';
colorInput.style.display = 'none';
document.body.appendChild(colorInput);

colorPickerBtn.addEventListener('click', () => {
    colorInput.click();
});

colorInput.addEventListener('change', (e) => {
    const newColor = e.target.value;
    document.body.style.backgroundColor = newColor;
    document.querySelector('.nav').style.backgroundColor = `rgba(${hexToRgb(newColor).r}, ${hexToRgb(newColor).g}, ${hexToRgb(newColor).b}, 0.8)`;
    document.querySelector('.sidebar').style.backgroundColor = newColor;
    document.querySelector('.main-content').style.backgroundColor = newColor;
    document.querySelector('.video-container').style.backgroundColor = newColor;
    document.querySelector('.chat-input').style.backgroundColor = `rgba(255, 255, 255, 0.05)`;
    document.querySelector('.modal-content').style.backgroundColor = newColor;
});

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Initialize (No WebSocket on load)
document.addEventListener('DOMContentLoaded', () => {
    myPeerId = getMyPeerId(); // Initialize myPeerId on page load (but don’t connect socket yet)
    disableChat(); // Disable chat initially until a room is joined/created
    console.log("DOMContentLoaded, myPeerId:", myPeerId);
});