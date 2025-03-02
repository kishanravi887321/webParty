let socket = null;

export async function connectWebSocket({
    currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
    displayMessage, peerConnections, peerList, initializeVideoCircles, handlePeerList, handleNewPeer, removeParticipant, chatMessages, localStream, action = "join"
}) {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.warn("WebSocket already connected or connecting, skipping...");
        return socket;
    }
    const WEBSOCKET_URL = "ws://127.0.0.1:5000";  // No SSL for local testing

    return new Promise((resolve, reject) => {
        socket = new WebSocket(WEBSOCKET_URL);

        let connectTimeout;

        socket.onopen = () => {
            clearTimeout(connectTimeout);
            console.log("✅ WebSocket Connected to:", WEBSOCKET_URL);
            if (currentRoomId && myPeerId) {
                const messageType = action === "createRoom" ? "createRoom" : "join";
                const joinMessage = { type: messageType, roomId: currentRoomId, peerId: myPeerId, roomType: roomType || 'private' };
                console.log(`Sending ${messageType} with peerId: ${myPeerId}, roomId: ${currentRoomId}, roomType: ${roomType || 'private'}`, joinMessage);
                socket.send(JSON.stringify(joinMessage));
            }
            resolve(socket);
        };

        socket.onclose = () => {
            console.warn("⚠️ WebSocket Disconnected from:", WEBSOCKET_URL);
            socket = null;
            peerConnections.clear();
            peerList.clear();
            initializeVideoCircles();
            if (currentRoomId) {
                setTimeout(() => connectWebSocket({
                    currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                    displayMessage, peerConnections, peerList, initializeVideoCircles, handlePeerList, handleNewPeer, removeParticipant, chatMessages, localStream, action
                }), 15000);
            }
            reject(new Error("WebSocket closed unexpectedly"));
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId || "N/A", roomType: data.roomType || "N/A" });

            if (data.type === "offer") {
                await handleOffer(data, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList);
            } else if (data.type === "answer") {
                await handleAnswer(data, peerConnections);
            } else if (data.type === "candidate") {
                await handleCandidate(data, peerConnections);
            } else if (data.type === "chat" && currentRoomId === data.roomId) {
                displayMessage(data.username, data.message, false, chatMessages);
            } else if (data.type === "peerList" && typeof handlePeerList === 'function') {
                handlePeerList(data.peers);
                if (data.leaderPeerId) updateLeaderDisplay(data.leaderPeerId);
            } else if (data.type === "newPeer" && typeof handleNewPeer === 'function') {
                handleNewPeer(data.peerId);
            } else if (data.type === "peerLeft") {
                removeParticipant(data.peerId);
                peerList.delete(data.peerId);
            } else if (data.type === "sfuStream" && currentRoomId === data.roomId) {
                console.log(`Received SFU stream for peer ${data.peerId} in room ${data.roomId}`);
                handleNewPeer(data.peerId);
            } else if (data.type === "leaderUpdate") {
                updateLeaderDisplay(data.leaderPeerId);
            } else if (data.type === "roomClosed") {
                console.log(`Room ${data.roomId} closed: ${data.message}`);
                alert(`Room ${data.roomId} Closed`);
                window.location.reload(); // Simple reset, adjust as needed
            } else if (data.type === "error") {
                console.error("Server error:", data.message);
                alert(`Server error: ${data.message}. Please try again or contact support.`);
            } else if (data.type === "videoURL") {
                console.log(`Received video URL from ${data.peerId} for room ${data.roomId}`);
                socket.send(JSON.stringify({
                    type: "videoURL",
                    roomId: data.roomId,
                    peerId: data.peerId,
                    url: data.url
                }));
            } else if (data.type === "videoPlay" || data.type === "videoPause" || data.type === "videoSeek") {
                console.log(`Received ${data.type} from ${data.peerId} for room ${data.roomId} at time ${data.time}`);
                socket.send(JSON.stringify({
                    type: data.type,
                    roomId: data.roomId,
                    peerId: data.peerId,
                    time: data.time
                }));
            }
        };

        socket.onerror = (error) => {
            clearTimeout(connectTimeout);
            console.error("WebSocket Error:", error);
            alert(`WebSocket connection failed to ${WEBSOCKET_URL}. Please check your network or contact support if the issue persists.`);
            socket.close();
            socket = null;
            peerConnections.clear();
            peerList.clear();
            initializeVideoCircles();
            if (currentRoomId) {
                setTimeout(() => connectWebSocket({
                    currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                    displayMessage, peerConnections, peerList, initializeVideoCircles, handlePeerList, handleNewPeer, removeParticipant, chatMessages, localStream, action
                }), 10000);
            }
            reject(new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
        };

        connectTimeout = setTimeout(() => {
            if (socket.readyState === WebSocket.CONNECTING) {
                console.warn("WebSocket connection timed out, retrying...");
                socket.close();
                socket = null;
                reject(new Error("WebSocket connection timed out"));
            }
        }, 5000);
    });
}