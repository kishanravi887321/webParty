// modules/webrtc.js
let localStream = null;

export async function initializeMedia() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("✅ Camera and microphone access granted");
            const localVideoElement = document.getElementById('localVideo');
            if (localVideoElement) localVideoElement.srcObject = localStream;
        }
    } catch (error) {
        console.error("❌ Error Getting Media:", error);
        if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
            alert("Camera or microphone access denied or already in use. Please close other applications or grant permissions.");
            return null;
        } else {
            alert("Failed to access camera/microphone. Please grant permissions or check your setup.");
            return null;
        }
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            const localVideoElement = document.getElementById('localVideo');
            if (localVideoElement) localVideoElement.srcObject = null;
            console.warn("Falling back to audio-only due to camera access issues");
            return localStream;
        } catch (fallbackError) {
            console.error("❌ Fallback failed:", fallbackError);
            return null;
        }
    }
    return localStream;
}

export function createPeerConnection(peerId, localStream, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList) {
    if (!peerConnections) {
        console.error("peerConnections is undefined in createPeerConnection");
        return null;
    }
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

    pc.ontrack = (event) => {
        console.log(`ontrack event for peer ${peerId} with stream:`, event.streams[0]);
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo && peerId !== myPeerId) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.log(`Peer ${peerId} disconnected`);
            if (removeParticipant) removeParticipant(peerId);
            if (peerConnections) peerConnections.delete(peerId);
            if (peerList) peerList.delete(peerId);
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) remoteVideo.srcObject = null;
        }
    };

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

export async function handleOffer(data, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList) {
    const peerId = data.peerId;
    const pc = peerConnections.get(peerId) || createPeerConnection(peerId, localStream, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList);
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
    } else {
        console.warn(`Skipping offer for ${peerId} - remoteDescription already set`);
    }
}

export async function handleAnswer(data, peerConnections) {
    const pc = peerConnections.get(data.peerId);
    if (pc && !pc.remoteDescription) {
        console.log(`Handling answer for peer ${data.peerId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else {
        console.warn(`Skipping answer for ${data.peerId} - remoteDescription already set or peer not found`);
    }
}

export async function handleCandidate(data, peerConnections) {
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

export async function startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant) {
    if (!myPeerId) return;
    if (!peerList.has(myPeerId)) peerList.add(myPeerId);

    console.log(`Starting call for room ${currentRoomId}, my peerId: ${myPeerId}, peerList:`, Array.from(peerList));
    if (peerList.size === 1) return;

    const remotePeerId = Array.from(peerList).find(peerId => peerId !== myPeerId);
    if (remotePeerId && !peerConnections.has(remotePeerId)) {
        console.log(`Initiating connection to remote peer ${remotePeerId} (delayed)`);
        setTimeout(async () => {
            const pc = createPeerConnection(remotePeerId, localStream, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList);
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
        }, 2000);
    } else {
        console.log(`Skipping connection - no remote peer or already connected`);
    }
}