// client/js/logic.js
import { localVideo, participantsContainer, chatInput, sendButton, chatMessages } from './ui.js';
import { connectWebSocket, socket, currentRoomId, myPeerId, peerList } from './websocket.js';

// WebRTC Setup
let localStream;
let peerConnections = new Map(); // Map peerId -> RTCPeerConnection

// Initialize Logic
export function initializeLogic() {
    myPeerId = getMyPeerId(); // Ensure myPeerId is set
    connectWebSocket(); // Start WebSocket connection
    disableChat(); // Disable chat initially
}

// Get User Media with Fallback for Camera Conflicts
async function initializeMedia() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            console.log("✅ Camera and microphone access granted");
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

// Create Peer Connection
function createPeerConnection(peerId) {
    if (peerConnections.has(peerId)) {
        console.log(`Peer connection for ${peerId} already exists, reusing it.`);
        return peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    let hasAddedParticipant = false; // Flag to prevent duplicate participant additions
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`Sending ICE candidate for peer ${peerId} in room ${currentRoomId}`);
            socket.send(JSON.stringify({
                type: "candidate",
                candidate: event.candidate,
                peerId,
                roomId: currentRoomId
            }));
        }
    };

    pc.ontrack = (event) => {
        console.log(`ontrack event for peer ${peerId} with stream:`, event.streams[0]);
        const existingParticipant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
        if (!existingParticipant && !hasAddedParticipant) {
            const videoStream = event.streams[0];
            const videoTracks = videoStream.getVideoTracks();
            if (videoTracks.length > 0) { // Only create participant if there's a video track
                const video = document.createElement('video');
                video.autoplay = true;
                video.srcObject = videoStream;
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
                hasAddedParticipant = true; // Mark that we've added this participant
            } else {
                console.warn(`No video track for peer ${peerId}, skipping participant creation`);
            }
        } else if (existingParticipant) {
            console.warn(`Participant for peer ${peerId} already exists, skipping duplicate`);
        } else {
            console.warn(`Participant already added for peer ${peerId}, skipping duplicate`);
        }
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log(`Peer ${peerId} disconnected`);
            removeParticipant(peerId);
            peerConnections.delete(peerId);
            peerList.delete(peerId);
        }
    };

    // Add tracks only if not already added
    if (localStream) {
        localStream.getTracks().forEach(track => {
            if (!pc.getSenders().some(sender => sender.track === track)) {
                pc.addTrack(track, localStream);
            }
        });
    }

    peerConnections.set(peerId, pc);
    return pc;
}

// Handle WebRTC Signaling
async function handleOffer(data) {
    const peerId = data.peerId;
    const pc = peerConnections.get(peerId) || createPeerConnection(peerId);
    if (!pc.remoteDescription) {
        console.log(`Handling offer for peer ${peerId} in room ${currentRoomId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({
            type: "answer",
            answer,
            peerId,
            roomId: currentRoomId
        }));
    } else {
        console.warn(`Skipping offer for ${peerId} - remoteDescription already set`);
    }
}

async function handleAnswer(data) {
    const pc = peerConnections.get(data.peerId);
    if (pc && !pc.remoteDescription) {
        console.log(`Handling answer for peer ${data.peerId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
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

// Start Call for Room (Connect to all peers, with delay to avoid race conditions)
async function startCallForRoom() {
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(myPeerId)) {
        peerList.add(myPeerId); // Add self to peer list only if not already present
    }

    console.log(`Starting call for room ${currentRoomId}, my peerId: ${myPeerId}, peerList:`, Array.from(peerList));
    for (const peerId of peerList) {
        if (peerId !== myPeerId && !peerConnections.has(peerId)) {
            console.log(`Initiating connection to peer ${peerId} (delayed)`);
            setTimeout(async () => {
                const pc = createPeerConnection(peerId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.send(JSON.stringify({
                    type: "offer",
                    offer,
                    peerId,
                    roomId: currentRoomId
                }));
            }, 500); // Delay of 500ms to avoid race conditions
        } else if (peerId === myPeerId) {
            console.log(`Skipping self connection for ${myPeerId}`);
        } else {
            console.log(`Skipping duplicate connection for ${peerId} - already connected`);
        }
    }
}

// Handle Peer List from Server
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
    startCallForRoom(); // Initiate connections with all peers
}

// Handle New Peer Joining (with delay to avoid race conditions)
async function handleNewPeer(newPeerId) {
    console.log(`New peer joined: ${newPeerId} in room ${currentRoomId}`);
    if (!myPeerId) myPeerId = getMyPeerId();
    if (!peerList.has(newPeerId)) {
        peerList.add(newPeerId);
        if (!peerConnections.has(newPeerId)) {
            console.log(`Initiating connection to new peer ${newPeerId} (delayed)`);
            setTimeout(async () => {
                const pc = createPeerConnection(newPeerId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.send(JSON.stringify({
                    type: "offer",
                    offer,
                    peerId: newPeerId,
                    roomId: currentRoomId
                }));
            }, 500); // Delay of 500ms to avoid race conditions
        } else {
            console.log(`Skipping connection to ${newPeerId} - already connected`);
        }
    } else {
        console.warn(`Duplicate newPeer ${newPeerId} detected, ignoring`);
    }
}

// Control Button Functionality
function addControlListeners(peerId) {
    const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);
    controls.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            if (peerId === myPeerId) {
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
            // Send to a specific peer
            wss.clients.forEach((client) => {
                if (client.peerId === targetPeerId && client.roomId === currentRoomId && client.readyState === client.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        } else {
            // Broadcast to all peers except sender
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
}

// Chat Functionality (Enabled only after joining/creating a room)
function sendMessage() {
    if (!currentRoomId) {
        alert("Please join or create a room before sending messages.");
        return;
    }
    const message = chatInput.value.trim();
    if (message && socket && socket.readyState === WebSocket.OPEN) {
        const chatData = { type: "chat", username, message, roomId: currentRoomId };
        socket.send(JSON.stringify(chatData));
        displayMessage(username, message, true);
        chatInput.value = "";
    } else if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not connected. Message not sent.");
        alert("WebSocket is not connected. Please try again.");
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

// Create/Join Room Logic
export async function createRoom(roomType) {
    currentRoomId = generateRoomId();
    document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
    document.getElementById('generatedRoomId').textContent = currentRoomId;
    roomModal.classList.remove('active');
    await initializeMedia();
    if (localStream) {
        socket.send(JSON.stringify({ type: "join", roomId: currentRoomId, peerId: myPeerId }));
        await startCallForRoom();
        enableChat();
    } else {
        alert("Cannot join room without media access.");
    }
}

export async function joinRoom(roomType, roomId) {
    currentRoomId = roomId;
    document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
    document.getElementById('generatedRoomId').textContent = currentRoomId;
    roomModal.classList.remove('active');
    await initializeMedia();
    if (localStream) {
        socket.send(JSON.stringify({ type: "join", roomId: currentRoomId, peerId: myPeerId }));
        await startCallForRoom();
        enableChat();
    } else {
        alert("Cannot join room without media access.");
    }
}